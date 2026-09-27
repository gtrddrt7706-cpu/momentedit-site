// [REC_UPLOAD · VOICE_KIND 2026-09-27 코워크 «두 분 목소리 · 직접 녹음과 파일 올리기» · 사장님 «올리면 그 자리에서 자동 재생까지»]
//
//   node scripts/audit/rec-upload.mjs        # 360 · 1280
//
// 보는 것
//   ① 가짜 마이크(Chromium --use-fake-device-for-media-stream)로 [녹음] → 3 · 2 · 1 → 녹음 중(막대 · 시간) → [멈춤] → 들어 보기(WAV) → [이걸로 쓰기]
//   ② 그 자리(하객 맞이 1줄)가 두 분 소리로 바뀐다 — 4줄 중 1줄만 녹음 → 1줄은 두 분 목소리 · 3줄은 예시/나레이션 그대로
//   ③ 파일 올리기: 앞뒤 2초 무음 + 작은 소리(-30dB) 3초 wav → 앞뒤가 잘리고(약 3.3초) 소리 크기가 나레이션 쪽으로(ffmpeg loudnorm 으로 -22 ~ -12 LUFS · 봉우리 ≤ -1dB)
//   ④ 60초 넘는 파일은 올리지 않는다 · [지우기] 뒤 그 줄은 나레이션(예시)로
//   ⑤ 줄 머리 갈래 표 — 나레이션 · 두 분 목소리 · 미리 준비(✓ · 아직) · 당일 직접 / 고른 순서 쪽 «목소리 세 가지»
//   ⑥ pageerror 0 · 가로 넘침 0
// ★종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함(도구 없음)
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { execFileSync, spawnSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let ff = true; try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); } catch { ff = false; }
if (!ff) { console.log('못 쟀다 — ffmpeg 없음'); process.exit(2); }
const SHOT = process.env.SHOT || ''; const shot = async (pg, n) => { if (!SHOT) return; fs.mkdirSync(SHOT, { recursive: true }); const y = await pg.evaluate(() => { const e = document.querySelector('.mk-recp') || document.querySelector('.mk-voice'); return e ? e.getBoundingClientRect().top + scrollY - 160 : 0; }); await pg.evaluate((y) => scrollTo(0, y), y); await pg.waitForTimeout(200); await pg.screenshot({ path: path.join(SHOT, n + '.png') }); };   // SHOT=폴더 — 화면을 눈으로 보려고
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'recup-'));
const quiet = path.join(TMP, 'quiet.wav'), long = path.join(TMP, 'long.wav');
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', "aevalsrc='if(between(t,2,5),0.03*sin(2*PI*220*t),0)':s=44100:d=7", quiet]);   // ★concat 으로 만들면 무음이 된다(volumedetect -91dB 실측) — 식 하나로 만든다
execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'sine=f=300:r=16000:d=66,volume=0.3', long]);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch({ args: ['--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream', '--autoplay-policy=no-user-gesture-required'] });
const lufs = (b64) => { const f = path.join(TMP, 'o' + Math.random().toString(36).slice(2) + '.wav'); fs.writeFileSync(f, Buffer.from(b64, 'base64')); const o = spawnSync('ffmpeg', ['-hide_banner', '-nostats', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' }); return String(o.stderr || ''); };
const b64Of = (pg) => pg.evaluate(() => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(MK_REC.wav); }));
for (const w of [360, 1280]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, permissions: ['microphone'] }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400); await nx(); await pg.waitForTimeout(1200);
  const lg = await pg.evaluate(() => ({ t: (document.querySelector('.mk-legend') || {}).textContent || '' }));
  ok(`${w} 고른 순서 쪽 «목소리 세 가지» — 나레이션 · 두 분 목소리 · 미리 준비 · 당일 직접 [VOICE_KIND]`, /나레이션/.test(lg.t) && /두 분 목소리 · 미리 준비/.test(lg.t) && /당일 직접/.test(lg.t), lg.t);
  /* [CHIP_UNPICKED · MK_NO_HEADS] 안 고른 기본(나레이션)은 비어 보이고 · 누르면 소리가 나고 눌린 모양이 된다 · «고르기» · «흐름» 제목 없음 */
  const cu = await pg.evaluate(async () => { const z = (t) => new Promise((r) => setTimeout(r, t)); mkGo('guest'); render(); await z(300);
    const b0 = document.querySelector('[data-fk="lsc:guestVoice:nar"]'), before = b0.getAttribute('aria-checked'), tab = b0.tabIndex; b0.click(); await z(500);
    const after = document.querySelector('[data-fk="lsc:guestVoice:nar"]').getAttribute('aria-checked'), q = LP.q.length; try { lsStop(); } catch (e) {}
    const heads = [...document.querySelectorAll('.mk-pg h4')].map((e) => e.textContent).filter((t) => /^(고르기|흐름)$/.test(t)); return { before, tab, after, q, heads }; });
  ok(`${w} 안내 목소리 — 처음엔 안 눌린 모양 · 누르면 나레이션이 들리고 눌린 모양 · «고르기» · «흐름» 제목 없음 [CHIP_UNPICKED · MK_NO_HEADS]`, cu.before === 'false' && cu.tab === 0 && cu.after === 'true' && cu.q > 0 && !cu.heads.length, JSON.stringify(cu));
  await pg.evaluate(() => { S.guestVoice = 'couple'; S.up = {}; opSync(); mkGo('guest'); render(); }); await pg.waitForTimeout(500);
  const t0 = await pg.evaluate(() => ({ prep: document.querySelectorAll('.mk-flow .vk-prep').length, no: document.querySelectorAll('.mk-flow .vk-prep .vk-st.no').length, narr: document.querySelectorAll('.mk-flow .vk-narr').length, rec: document.querySelectorAll('[data-fk^="mkrec:"]').length, file: document.querySelectorAll('[data-fk^="mkup:"]').length }));
  ok(`${w} 하객 맞이 — 두 분 목소리 줄에 «두 분 목소리 · 미리 준비 · 아직» 표 · 줄마다 [녹음] · [파일] [VOICE_KIND · REC_UPLOAD]`, t0.prep >= 3 && t0.no === t0.prep && t0.rec === 4 && t0.file === 4, JSON.stringify(t0));
  await pg.click('[data-fk="mkrec:g0"]'); await pg.waitForTimeout(300);
  const c1 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, cd: (document.querySelector('.mk-reccd') || {}).textContent || '', txt: (document.querySelector('.mk-rect') || {}).textContent || '' }));
  ok(`${w} [녹음] → 3 · 2 · 1 · 그 줄 글이 큰 글씨로`, c1.ph === 'count' && /^[123]$/.test(c1.cd) && c1.txt.length > 20, JSON.stringify(c1));
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'rec', null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(2600);
  const c2 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, bar: !!document.getElementById('mkRecLvl'), t: (document.getElementById('mkRecT') || {}).textContent || '' }));
  await shot(pg, w + '-rec');
  ok(`${w} 녹음 중 — 소리 막대 · 지난 시간`, c2.ph === 'rec' && c2.bar && /녹음 중 · 0:0[1-9]/.test(c2.t), JSON.stringify(c2));
  await pg.click('[data-fk="mkrecstop"]'); await pg.waitForFunction(() => MK_REC && (MK_REC.ph === 'review' || MK_REC.ph === 'err'), null, { timeout: 15000 }).catch(() => {});
  const c3 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, msg: MK_REC && MK_REC.msg, type: MK_REC && MK_REC.wav && MK_REC.wav.type, dur: MK_REC && MK_REC.dur, audio: !!document.querySelector('.mk-recp audio'), use: !!document.querySelector('[data-fk="mkrecuse"]') }));
  await shot(pg, w + '-review');
  ok(`${w} [멈춤] → 다듬어 들어 보기(WAV) · [이걸로 쓰기] · [다시]`, c3.ph === 'review' && c3.type === 'audio/wav' && c3.dur > 0.5 && c3.audio && c3.use, JSON.stringify(c3));
  await pg.click('[data-fk="mkrecuse"]'); await pg.waitForTimeout(500);
  const c4 = await pg.evaluate(() => { const st = _lSteps(ENG, ['guest']).filter((x) => x.own); return { up: !!(S.up && S.up.g0), n: st.length, couple: st.filter((x) => x.couple).length, src0: String(st[0] && st[0].src || '').slice(0, 5), others: st.slice(1).every((x) => !x.couple), tagOk: !!document.querySelector('.mk-flow .vk-prep .vk-st:not(.no)'), del: !!document.querySelector('[data-fk="mkupdel:g0"]') }; });
  await pg.evaluate(() => scrollTo(0, 0)); await shot(pg, w + '-used');
  ok(`${w} [이걸로 쓰기] → 4줄 중 1줄만 두 분 소리(blob) · 나머지 셋은 그대로 · 표 ✓ · [들어 보기] [지우기] [REC_UPLOAD]`, c4.up && c4.couple === 1 && c4.src0 === 'blob:' && c4.others && c4.tagOk && c4.del, JSON.stringify(c4));
  /* ③ 파일 — 앞뒤 무음 · 작은 소리 */
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g1"]')]); await fc.setFiles(quiet);
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'review', null, { timeout: 15000 }).catch(() => {});
  const f1 = await pg.evaluate(() => ({ dur: MK_REC && MK_REC.dur, warn: MK_REC && MK_REC.warn }));
  const lo = lufs(await b64Of(pg)), I = +(lo.match(/"input_i"\s*:\s*"(-?[\d.]+)"/) || [])[1], TP = +(lo.match(/"input_tp"\s*:\s*"(-?[\d.]+)"/) || [])[1];
  ok(`${w} 파일 — 앞뒤 무음 잘림(7초 → 약 3.3초) · 소리 크기 나레이션 쪽(-22 ~ -12 LUFS) · 봉우리 ≤ -1dB`, f1.dur > 3 && f1.dur < 3.8 && I > -22 && I < -12 && TP <= -1, JSON.stringify({ f1, I, TP }));
  await pg.evaluate(() => mkRecCancel()); await pg.waitForTimeout(200);
  const [fc2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g2"]')]); await fc2.setFiles(long);
  await pg.waitForFunction(() => MK_REC && (MK_REC.ph === 'err' || MK_REC.ph === 'review'), null, { timeout: 20000 }).catch(() => {});
  const f2 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, msg: MK_REC && MK_REC.msg }));
  ok(`${w} 60초 넘는 파일 — 올리지 않고 한 줄로 알린다`, f2.ph === 'err' && /60초/.test(f2.msg || ''), JSON.stringify(f2));
  await pg.evaluate(() => mkRecCancel());
  pg.once('dialog', (d) => d.accept()); await pg.click('[data-fk="mkupdel:g0"]'); await pg.waitForTimeout(400);
  const d1 = await pg.evaluate(() => ({ up: S.up.g0, couple: _lSteps(ENG, ['guest']).filter((x) => x.couple).length, rec: !!document.querySelector('[data-fk="mkrec:g0"]') }));
  ok(`${w} [지우기] → 그 줄은 다시 예시 · 나레이션 · [녹음] 이 돌아온다`, !d1.up && d1.couple === 0 && d1.rec, JSON.stringify(d1));
  const tk = await pg.evaluate(() => { mkGo('vow'); render(); return { live: document.querySelectorAll('.mk-flow li.t .vk-live').length, narr: document.querySelectorAll('.mk-flow .vk-narr').length }; });
  ok(`${w} 서약 — 두 분 차례는 «당일 직접» · 여는 말 · 맺는 말은 «나레이션»`, tk.live === 2 && tk.narr >= 2, JSON.stringify(tk));
  /* [RESTART_KEEP_REC] 다시 만들기 — 고른 것은 비우고 올린 녹음은 남긴다 · 확인 창이 그렇게 말한다 */
  await pg.evaluate(() => { S.up = S.up || {}; S.up.g1 = { id: 'local:t1', n: 't.wav' }; opRestart(); }); await pg.waitForTimeout(200);
  const rs0 = await pg.evaluate(() => (document.querySelector('.ord-ask .oa-d') || {}).textContent || '');
  await pg.click('.ord-ask .oa-yes'); await pg.waitForTimeout(300);
  const rs = await pg.evaluate(() => ({ up: !!(S.up && S.up.g1), gv: S.guestVoice, k: STEPS[idx].k }));
  ok(`${w} [다시 만들기] → 고른 것은 비우고 녹음은 남긴다 · 확인 창이 그렇게 말한다 [RESTART_KEEP_REC]`, /녹음은 그대로 남겨 둬요/.test(rs0) && rs.up && rs.gv === 'nar' && rs.k === 'pick', JSON.stringify({ rs0, rs }));
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(`${w} pageerror 0 · 가로 넘침 0`, !errs.length && !ov, errs.join(' | '));
  await ctx.close();
}
/* ★[VOICE_CLONE] 3단계 — 스위치가 꺼져 있으면 아무것도 안 보인다 · 켜면(시험에서만) 동의 → 목소리 읽기 → 줄마다 AI → 쓰기 → ④ 알림 · 연습 읽기 */
{
  const mp3 = path.join(TMP, 'ai.mp3'); execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', "aevalsrc='0.2*sin(2*PI*330*t)':s=24000:d=2", mp3]); const MP3 = fs.readFileSync(mp3).toString('base64');
  const ctx = await br.newContext({ viewport: { width: 390, height: 900 }, permissions: ['microphone'] }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400); await nx(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => { S.guestVoice = 'couple'; S.up = {}; opSync(); mkGo('guest'); render(); }); await pg.waitForTimeout(400);
  const off = await pg.evaluate(() => ({ vc: !!document.querySelector('.mk-vc'), ai: document.querySelectorAll('[data-fk^="mkai:"]').length }));
  ok('3단계 스위치 꺼짐 — AI 칸 · [AI] 단추가 안 보인다 [VOICE_CLONE]', !off.vc && off.ai === 0, JSON.stringify(off));
  /* 켜기(시험에서만) + 가짜 마이페이지 · 서버 */
  await pg.evaluate((MP3) => { RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true; window.__vcCalls = [];
    const st = { groom: { consent: false, ready: false }, bride: { consent: false, ready: false } };
    window.addEventListener('message', (ev) => { const d = ev.data || {}; if (d.type === 'momentedit:voiceClone') { const q = d.data; window.__vcCalls.push(q.op + ':' + (q.who || q.key || ''));
        let r = { ok: true }; if (q.op === 'status') r = { ok: true, groom: st.groom, bride: st.bride }; if (q.op === 'consent') st[q.who].consent = true; if (q.op === 'enroll') { st[q.who].ready = true; r = { ok: true, tries: 1 }; }
        if (q.op === 'make') r = { ok: true, key: q.key, left: 4, parts: [{ who: 'groom', mime: 'audio/mpeg', data: MP3 }] }; if (q.op === 'practice') r = { ok: true, mime: 'audio/mpeg', data: MP3 };
        setTimeout(() => window.postMessage(Object.assign({ type: 'momentedit:voiceCloneDone', rid: q.rid }, r), location.origin), 50); }
      if (d.type === 'momentedit:ritualFile') setTimeout(() => window.postMessage({ type: 'momentedit:ritualFileDone', key: d.data.key, ok: true, name: d.data.name, id: 'AI1', at: 'x' }, location.origin), 50); });
    render(); }, MP3); await pg.waitForTimeout(600);
  await pg.click('[data-fk="mkvcok:groom"]'); await pg.waitForTimeout(200);
  const c1 = await pg.evaluate(() => ({ dis: document.getElementById('vcAgree').disabled, t: document.querySelector('.mk-vc').textContent }));
  await pg.check('#vcSelf'); await pg.click('#vcAgree'); await pg.waitForTimeout(500);
  const c2 = await pg.evaluate(() => ({ read: !!document.querySelector('[data-fk="mkvcread:groom"]'), file: !!document.querySelector('.mk-vc [data-fk^="mkup:"]') }));
  ok('동의 — 본인 확인 칸을 체크해야 [동의하기] · 문구(어디에 · 무엇을 · 언제 지우나 · 동의 안 해도 진행) · 뒤에 [목소리 읽기](파일 올리기 없음)', c1.dis && /음성 업체\(타입캐스트\)/.test(c1.t) && /예식 뒤 30일/.test(c1.t) && /동의하지 않아도/.test(c1.t) && c2.read && !c2.file, JSON.stringify({ c1: c1.dis, c2 }));
  await pg.click('[data-fk="mkvcread:groom"]'); await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'rec', null, { timeout: 8000 }).catch(() => {});
  const c3 = await pg.evaluate(() => /오늘은 \d+월 \d+일, /.test(document.querySelector('.mk-vc').textContent));
  await pg.waitForTimeout(1500); await pg.click('[data-fk="mkrecstop"]'); await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'review', null, { timeout: 15000 }).catch(() => {});
  const c4 = await pg.evaluate(() => (document.querySelector('[data-fk="mkrecuse"]') || {}).textContent || '');
  await pg.click('[data-fk="mkrecuse"]'); await pg.waitForTimeout(800);
  const c5 = await pg.evaluate(() => ({ ready: VC.st.groom.ready, ai: document.querySelectorAll('[data-fk^="mkai:"]').length }));
  ok('목소리 읽기 — 그날의 확인 문장 · [이걸로 목소리 만들기] → 준비됨 · 줄마다 [AI]', c3 && /이걸로 목소리 만들기/.test(c4) && c5.ready && c5.ai === 4, JSON.stringify({ c3, c4, c5 }));
  await pg.click('[data-fk="mkai:g0"]'); await pg.waitForTimeout(200); await pg.click('[data-fk="mkaigo"]');
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'review' && MK_REC.src === 'ai', null, { timeout: 15000 }).catch(() => {});
  await pg.click('[data-fk="mkrecuse"]'); await pg.waitForTimeout(800);
  const c6 = await pg.evaluate(() => ({ src: (S.up.g0 || {}).src, st: document.querySelector('.mk-vr').textContent, couple: _lSteps(ENG, ['guest']).filter((x) => x.couple).length }));
  ok('줄마다 [AI] → 만들기 → 들어 보기 → 이걸로 쓰기 → 그 줄이 AI 두 분 목소리(src ai · «AI로 만들었어요»)', c6.src === 'ai' && /AI로 만들었어요/.test(c6.st) && c6.couple === 1, JSON.stringify(c6));
  const c7 = await pg.evaluate(() => { opGoStep('done'); return new Promise((ok) => setTimeout(() => ok(!!document.querySelector('[data-fk="ainotice"]')), 800)); });
  ok('④ — AI로 만든 줄이 있으면 «일부 안내는 두 분 목소리로 만든 AI 음성이에요» [AI_NOTICE]', c7);
  await pg.evaluate(() => opGoStep('practice')); await pg.waitForTimeout(800);
  await pg.click('[data-fk="ptts"]'); await pg.waitForTimeout(200);
  const c8 = await pg.evaluate(() => /음성 업체\(타입캐스트\)로 보내져/.test(document.querySelector('.pr-voice').textContent));
  await pg.click('[data-fk="pttsyes"]'); await pg.waitForTimeout(200);
  const c9 = await pg.evaluate(() => new Promise((ok) => { const st = { who: '신랑', txt: '연습 글입니다', talk2: true }; _ptSrc(st); setTimeout(() => ok({ u: String(_ptSrc(st) || '').slice(0, 5), site: _ptSrc({ who: '신부', txt: '떠오르는 대로', site: true }) }), 600); }));
  ok('연습 읽기 — 처음 켤 때 알림 · [켜기] 뒤 두 분 차례 글을 AI 소리로(이 기기에 두고) · «현장에서» 자리는 안 읽는다 [VOICE_CLONE 4-2]', c8 && c9.u === 'blob:' && c9.site === null, JSON.stringify({ c8, c9 }));
  ok('3단계 pageerror 0', !errs.length, errs.join(' | '));
  await ctx.close();
}
/* ★[PRACTICE_VOICE] ③ 연습 — «내 차례를 녹음하며 연습» 켜면 두 분 차례마다 녹음 · 끝나고 줄마다 다시 듣기 · 서버로 아무것도 안 나감 */
{
  const ctx = await br.newContext({ viewport: { width: 390, height: 900 }, permissions: ['microphone'] }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  const out = [];
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); out.push(u); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  await pg.evaluate(() => opGoStep('practice')); await pg.waitForTimeout(1200);
  const p0 = await pg.evaluate(() => ({ sec: !!document.querySelector('.pr-voice'), note: /이 휴대폰에만 있어요/.test((document.querySelector('.pr-voice') || {}).textContent || '') }));
  await pg.click('[data-fk="prrec"]'); await pg.waitForTimeout(600);
  const n0 = out.length;
  await pg.evaluate(() => { lsPlayAll(); }); await pg.waitForTimeout(800);
  await pg.evaluate(() => { let g = 0; while (!(LP.q[LP.i] && LP.q[LP.i].talk2) && g++ < 80) LP.i++; _lShow(); }); await pg.waitForTimeout(1600);
  const p1 = await pg.evaluate(() => ({ rec: !!PR.cur, badge: !!document.querySelector('#lsFull .lf-rec') }));
  await pg.evaluate(() => { _lNext(); }); await pg.waitForTimeout(500); await pg.evaluate(() => { lsStop(); }); await pg.waitForTimeout(600);
  await pg.evaluate(() => render()); await pg.waitForTimeout(300);
  const p2 = await pg.evaluate(() => ({ n: PR.takes.length, url: String((PR.takes[0] || {}).url || '').slice(0, 5), rows: document.querySelectorAll('.pr-voice [data-fk^="prplay:"]').length }));
  const sent = out.slice(n0).filter((u) => !/fonts\.g/.test(u));
  ok('연습 — «내 차례를 녹음하며 연습» · 두 분 차례에 «녹음 중» · 끝나면 줄마다 다시 듣기 · 서버로 아무것도 안 나감 [PRACTICE_VOICE]', p0.sec && p0.note && p1.rec && p1.badge && p2.n >= 1 && p2.url === 'blob:' && p2.rows === p2.n && sent.length === 0, JSON.stringify({ p0, p1, p2, sent }));
  ok('연습 pageerror 0', !errs.length, errs.join(' | '));
  await ctx.close();
}
/* ★[REC_ADMIN] 당일 콘솔 — rf=코드 + 관리자 토큰이면 시작 전에 두 분 목소리를 받아 CLIPS 에 넣는다 · «소리 파일 확인» ✓ · 못 받은 줄은 나레이션 */
{
  const wav = fs.readFileSync(quiet).toString('base64');
  /* [PREVIEW_GUARD] 운영 주소가 아니면 콘솔도 GAS 를 부르지 못한다 — 표시 없이 열면 막히고(장치가 산다) · 점검 표시를 심으면 받는다 */
  {
    const c0 = await br.newContext({ viewport: { width: 1280, height: 900 } }); const p0 = await c0.newPage(); let hit = 0;
    await p0.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); if (/script\.google\.com/.test(u)) hit++; return rt.fulfill({ status: 200, body: '{}' }); });
    await p0.goto(`http://127.0.0.1:${port}/console.html`); await p0.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
    const q0 = Buffer.from(JSON.stringify({ course: 'family', guestVoice: 'couple', up: { g0: { id: 'F-g0' } } })).toString('base64');
    await p0.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(q0)}&rf=ME0001`); await p0.waitForTimeout(1200);
    const g0 = await p0.evaluate(() => ({ st: window.__rfState().st, blocked: (window.ME_PREVIEW_GUARD || {}).blocked || 0 }));
    ok('콘솔 — 운영 주소가 아니면 미리보기 안전장치가 GAS 호출을 막는다(받지 못함 · 나레이션으로) [PREVIEW_GUARD · REC_ADMIN]', hit === 0 && g0.blocked >= 1 && /"g0":"fail"/.test(g0.st), JSON.stringify({ hit, g0 }));
    await c0.close();
  }
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await ctx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  let calls = [];
  await pg.route('**/*', (rt) => { const u = rt.request().url();
    if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue();
    if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {} calls.push(b.fn + ':' + (b.args || []).join(','));
      const ok = b.fn === 'adminRitualFileGet' && b.args && b.args[1] === 'F-g0';
      return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(ok ? { ok: true, id: 'F-g0', mime: 'audio/wav', data: wav } : { ok: false, error: '없음' }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
  const S0 = { course: 'family', guestVoice: 'couple', entryVoice: 'nar', up: { g0: { id: 'F-g0', n: '녹음' }, g1: { id: 'F-g1', n: '녹음' } } };
  const q = Buffer.from(JSON.stringify(S0)).toString('base64');
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(q)}&rf=ME0001`); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => ({ st: window.__rfState().st, clip: window.__rfState().clip, sec: !document.getElementById('rfSec').hidden, t: document.getElementById('rfChk').textContent }));
  ok('콘솔 — rf=코드 + 관리자 토큰 → 시작 전에 받아 둠(g0 ✓) · 못 받은 줄(g1)은 «나레이션으로» · 파일 없는 줄(g2 · g3)도 «나레이션으로» [REC_ADMIN]', /"g0":"ok"/.test(r.st) && /"g1":"fail"/.test(r.st) && r.clip === 'blob:' && r.sec && /하객 입장 때✓ 두 분 목소리 · 받아 둠/.test(r.t) && /시작 10분 전받지 못함 · 나레이션으로 나가요/.test(r.t) && /시작 5분 전파일 없음/.test(r.t) && calls.every((c) => /^adminRitualFileGet:ME0001,F-g[01]$/.test(c)), JSON.stringify({ r, calls }));
  ok('콘솔 pageerror 0', !errs.length, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
