// [REC_UPLOAD · VOICE_KIND 2026-09-27 코워크 «두 분 목소리 · 직접 녹음과 파일 올리기» · 사장님 «올리면 그 자리에서 자동 재생까지»]
//
//   node scripts/audit/rec-upload.mjs        # 360 · 1280
//
// 보는 것
//   ① 가짜 마이크(Chromium --use-fake-device-for-media-stream)로 [녹음] → 3 · 2 · 1 → 녹음 중(막대 · 시간) → [멈춤] → 들어 보기(WAV) → [이걸로 쓰기]
//   ② 그 자리(하객 맞이 1줄)가 두 분 소리로 바뀐다 — 4줄 중 1줄만 녹음 → 1줄은 두 분 목소리 · 3줄은 예시/나레이션 그대로
//   ③ 파일 올리기: 앞뒤 2초 무음 + 작은 소리(-30dB) 3초 wav → 앞뒤가 잘리고(약 3.3초) 소리 크기가 나레이션 쪽으로(ffmpeg loudnorm 으로 -22 ~ -12 LUFS · 봉우리 ≤ -1dB)
//   ④ 60초 넘는 파일은 올리지 않는다 · [지우기] 뒤 그 줄은 나레이션(예시)로
//   ⑤ 줄 머리 갈래 표 — 나레이션 · 두 분 목소리 · 미리 준비(✓ · 아직) · 당일 직접 / 예식 흐름 쪽 줄마다 한 낱말 [COURSE_FLOW]
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
  /* ★[COURSE_FLOW 2026-10-03 사장님] 첫 쪽의 목소리 범례 접이는 걷었다 — 누가 말하는지는 줄마다 한 낱말. 종전 «범례가 있다» → «범례 없음 · 줄 낱말이 이 식순의 갈래만» */
  /* ★[FLOW_NO_VOICE 2026-10-03 사장님] 예식 흐름 줄의 목소리 낱말도 걷었다 — 종전 «줄마다 나레이션 · 당일 직접» → «범례도 줄 낱말도 없음»(누가 말하는지는 순간 쪽 머리 · 줄 카드가 말한다) */
  const lg = await pg.evaluate(() => ({ legend: !!document.querySelector('.mk-intro .mk-legend'), v: document.querySelectorAll('.mk-intro .cf-v').length, t: [...document.querySelectorAll('.mk-intro .cf-r')].map((x) => x.textContent).join(' ') }));
  ok(`${w} 예식 흐름 쪽 — 범례 접이 없음 · 줄에 목소리 낱말(나레이션 · 당일 직접 · 두 분 목소리) 없음 [VOICE_KIND · COURSE_FLOW · FLOW_NO_VOICE]`, !lg.legend && lg.v === 0 && !/나레이션|당일 직접|두 분 목소리/.test(lg.t), JSON.stringify(lg).slice(0, 200));
  /* [CHIP_UNPICKED · MK_NO_HEADS] 안 고른 기본(나레이션)은 비어 보이고 · 누르면 소리가 나고 눌린 모양이 된다 · «고르기» · «흐름» 제목 없음 */
  const cu = await pg.evaluate(async () => { const z = (t) => new Promise((r) => setTimeout(r, t)); S.vsAsked = 1; RitualOpen.FEATURE.voiceClone = true; mkGo('guest');   /* [R2-15] */  render(); await z(300);   /* ★[VP_NO_DIRECT] 고르는 칸은 AI 가 켜진 예식에만(AI · 나레이션) — 시험에서 잠깐 켠다 */
    const b0 = document.querySelector('[data-fk="lsc:guestVoice:nar"]'), before = b0.getAttribute('aria-checked'), tab = document.querySelector('[data-fk^="lsc:guestVoice:"]').tabIndex;   /* [VP_CHOICE] 0928 부터 첫 칩은 «직접 녹음하기» — 안 고른 묶음은 첫 칩이 Tab 자리 */ b0.click(); await z(500);
    const after = document.querySelector('[data-fk="lsc:guestVoice:nar"]').getAttribute('aria-checked'), q = LP.q.length; try { lsStop(); } catch (e) {}
    const heads = [...document.querySelectorAll('.mk-pg h4')].map((e) => e.textContent).filter((t) => /^(고르기|흐름)$/.test(t)); RitualOpen.FEATURE.voiceClone = false; render(); const off = !document.querySelector('[data-fk^="lsc:guestVoice:"]'); return { before, tab, after, q, heads, off }; });
  /* ★[VP_CHIP_SILENT 2026-10-03 사장님 «여기 눌렀을 때 음성이 재생되게 하지 말자»] 종전 «누르면 나레이션이 들린다(q > 0)» → «고르기만 · 소리 없음(q = 0)» */
  ok(`${w} 안내 목소리 — 처음엔 안 눌린 모양 · 누르면 눌린 모양만(소리 없음) · «고르기» · «흐름» 제목 없음 · AI 가 꺼지면 고를 것이 나레이션 하나라 칸이 없다 [CHIP_UNPICKED · MK_NO_HEADS · VP_NO_DIRECT · VP_CHIP_SILENT]`, cu.before === 'false' && cu.tab === 0 && cu.after === 'true' && cu.q === 0 && !cu.heads.length && cu.off, JSON.stringify(cu));
  await pg.evaluate(() => { S.guestVoice = 'couple'; S.up = {}; opSync(); mkGo('guest'); render(); }); await pg.waitForTimeout(500);
  const t0 = await pg.evaluate(() => ({ prep: document.querySelectorAll('.mk-flow .vk-prep').length, no: document.querySelectorAll('.mk-flow .vk-prep .vk-st.no').length, narr: document.querySelectorAll('.mk-flow .vk-narr').length, rec: document.querySelectorAll('[data-fk^="mkrec:"]').length, file: document.querySelectorAll('[data-fk^="mkup:"]').length, play: document.querySelectorAll('.mk-vcards [data-fk^="mkvpl:"]').length, flow: document.querySelectorAll('.mk-flow').length }));   /* ★[MK_FORM_ONE 2026-10-03] 흐름 칸은 «이 순간 들어 보기» 머리만 남는다 — 목록(.mk-flow)이 없는지로 본다 */   /* ★[VP_ONE_LIST] 흐름 목록은 줄 카드와 하나로 — 두 분 목소리 줄은 카드에만(▶ 는 카드 머리 · 식전 영상 쪽 4번 줄은 ▶ 없음) */
  ok(`${w} 하객 맞이 — 두 분 목소리 줄에 흐름 목록 없이 줄 카드 하나로(▶ · [녹음] · [파일]) [VP_ONE_LIST] [VOICE_KIND · REC_UPLOAD]`, t0.prep === 0 && t0.flow === 0 && t0.play === 4 /* [R8-09] 시작 1분 전 카드에도 ▶ */ && t0.rec === 4 && t0.file === 4, JSON.stringify(t0));
  /* ★[REC_DLG] [녹음] → 작은 창(읽을 글 · 누가 · 마이크 허용 안내 · [녹음 시작]) → [녹음 시작] 뒤에야 마이크 · 3 · 2 · 1 */
  await pg.click('[data-fk="mkrec:g0"]'); await pg.waitForTimeout(300);
  const c0 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { ph: MK_REC && MK_REC.ph, dlg: !!d, role: d && d.querySelector('[role=dialog][aria-modal=true]') ? 1 : 0, txt: d ? (d.querySelector('.mk-rect') || {}).textContent || '' : '', mic: d ? /«?허용»?을 눌러 주세요/.test(d.textContent) : false   /* [GUIL_OFF 2026-10-05] «» 는 글꼴로 바뀌어 화면 글자에서 빠진다 */, go: !!(d && d.querySelector('[data-fk="mkrecgo"]')), focus: document.activeElement && document.activeElement.getAttribute('data-fk'), inline: document.querySelectorAll('.mk-vcards .mk-recp').length, inert: !!document.querySelector('.wrap[inert]') }; });
  ok(`${w} [녹음] → 작은 창(읽을 글 · 마이크 허용 안내 · [녹음 시작] 포커스 · 뒤는 잠김) · 카드 아래로 펼치지 않는다 [REC_DLG]`, c0.ph === 'ready' && c0.dlg && c0.role && c0.txt.length > 20 && c0.mic && c0.go && c0.focus === 'mkrecgo' && !c0.inline && c0.inert, JSON.stringify(c0));
  await pg.click('[data-fk="mkrecgo"]'); await pg.waitForTimeout(250);
  const c1 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, cd: (document.querySelector('#mkRecDlg .mk-reccd') || {}).textContent || '', txt: (document.querySelector('#mkRecDlg .mk-rect') || {}).textContent || '' }));
  ok(`${w} [녹음 시작] → 3 · 2 · 1 · 그 줄 글이 창 안에 큰 글씨로`, c1.ph === 'count' && /^[123]$/.test(c1.cd) && c1.txt.length > 20, JSON.stringify(c1));
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'rec', null, { timeout: 8000 }).catch(() => {}); await pg.waitForTimeout(2600);
  const c2 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, bar: !!document.getElementById('mkRecLvl'), t: (document.getElementById('mkRecT') || {}).textContent || '' }));
  await shot(pg, w + '-rec');
  ok(`${w} 녹음 중 — 소리 막대 · 지난 시간`, c2.ph === 'rec' && c2.bar && /녹음 중 · 0:0[1-9]/.test(c2.t), JSON.stringify(c2));
  await pg.click('[data-fk="mkrecstop"]'); await pg.waitForFunction(() => MK_REC && (MK_REC.ph === 'review' || MK_REC.ph === 'err'), null, { timeout: 15000 }).catch(() => {});
  const c3 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, msg: MK_REC && MK_REC.msg, type: MK_REC && MK_REC.wav && MK_REC.wav.type, dur: MK_REC && MK_REC.dur, audio: !!document.querySelector('.mk-recp audio'), use: !!document.querySelector('[data-fk="mkrecuse"]') }));
  await shot(pg, w + '-review');
  ok(`${w} [멈춤] → 다듬어 들어 보기(WAV) · [이걸로 쓰기] · [다시]`, c3.ph === 'review' && c3.type === 'audio/wav' && c3.dur > 0.5 && c3.audio && c3.use, JSON.stringify(c3));
  /* [REC_DLG] 쓰지 않은 녹음이 있을 때 Esc → 우리 판으로 한 번 묻는다(돌아가기면 그대로) */
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(250);
  const ce = await pg.evaluate(() => (document.querySelector('.ord-ask') || {}).textContent || '');
  await pg.click('.ord-ask .oa-no'); await pg.waitForTimeout(300);
  const ce2 = await pg.evaluate(() => ({ dlg: !!document.getElementById('mkRecDlg'), ph: MK_REC && MK_REC.ph }));
  ok(`${w} 쓰지 않은 녹음에서 Esc → «이 녹음을 쓰지 않고 닫을까요?» · [돌아가기]면 창 그대로 [REC_DLG]`, /이 녹음을 쓰지 않고 닫을까요/.test(ce) && ce2.dlg && ce2.ph === 'review', JSON.stringify({ ce, ce2 }));
  await pg.click('[data-fk="mkrecuse"]'); await pg.waitForTimeout(500);
  const cz = await pg.evaluate(() => ({ dlg: !!document.getElementById('mkRecDlg'), inert: document.querySelectorAll('.wrap[inert]').length, focus: document.activeElement && document.activeElement.getAttribute('data-fk') }));
  ok(`${w} [이걸로 쓰기] → 창이 닫히고 뒤가 풀리고 포커스는 그 줄 [들어 보기]로 [REC_DLG]`, !cz.dlg && !cz.inert && cz.focus === 'mkupplay:g0', JSON.stringify(cz));
  const c4 = await pg.evaluate(() => { const st = _lSteps(ENG, ['guest']).filter((x) => x.own); return { up: !!(S.up && S.up.g0), n: st.length, couple: st.filter((x) => x.couple).length, src0: String(st[0] && st[0].src || '').slice(0, 5), others: st.slice(1).every((x) => !x.couple), tagOk: /녹음했어요/.test(((document.querySelector('[data-fk="mkupplay:g0"]') || {}).closest ? document.querySelector('[data-fk="mkupplay:g0"]').closest('li').textContent : '')),   /* [VP_ONE_LIST] 표 ✓ 는 줄 카드의 «녹음했어요» */ del: !!document.querySelector('[data-fk="mkupdel:g0"]') }; });
  await pg.evaluate(() => scrollTo(0, 0)); await shot(pg, w + '-used');
  ok(`${w} [이걸로 쓰기] → 4줄 중 1줄만 두 분 소리(blob) · 나머지 셋은 그대로 · 표 ✓ · [들어 보기] [지우기] [REC_UPLOAD]`, c4.up && c4.couple === 1 && c4.src0 === 'blob:' && c4.others && c4.tagOk && c4.del, JSON.stringify(c4));
  /* ③ 파일 — 앞뒤 무음 · 작은 소리 */
  const [fc] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g1"]')]); await fc.setFiles(quiet);
  await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'review', null, { timeout: 15000 }).catch(() => {});
  const f1 = await pg.evaluate(() => ({ dur: MK_REC && MK_REC.dur, warn: MK_REC && MK_REC.warn }));
  const lo = lufs(await b64Of(pg)), I = +(lo.match(/"input_i"\s*:\s*"(-?[\d.]+)"/) || [])[1], TP = +(lo.match(/"input_tp"\s*:\s*"(-?[\d.]+)"/) || [])[1];
  ok(`${w} 파일 — 앞뒤 무음 잘림(7초 → 약 3.3초) · 소리 크기 나레이션 쪽(-22 ~ -12 LUFS) · 봉우리 ≤ -1dB`, f1.dur > 3 && f1.dur < 3.8 && I > -22 && I < -12 && TP <= -1, JSON.stringify({ f1, I, TP }));
  /* ★[DLG_SCROLL_LOCK] 쓰지 않은 녹음에서 × → «그만두기» → 창이 닫힌 뒤 페이지가 다시 스크롤된다(확인 판이 0.2초 뒤 잠금을 되살리던 사고 · 사장님 실측 2026-09-28) */
  await pg.click('[data-fk="mkdlgx"]'); await pg.waitForTimeout(250); await pg.click('.ord-ask .oa-yes'); await pg.waitForTimeout(600);
  const sl = await pg.evaluate(() => { const y0 = scrollY; scrollBy(0, 300); const moved = scrollY !== y0; scrollTo(0, y0); return { dlg: !!document.getElementById('mkRecDlg'), bo: getComputedStyle(document.body).overflow, ho: getComputedStyle(document.documentElement).overflow, moved }; });
  ok(`${w} × → «그만두기»로 닫은 뒤 스크롤이 풀린다 [DLG_SCROLL_LOCK]`, !sl.dlg && sl.bo !== 'hidden' && sl.ho !== 'hidden' && sl.moved, JSON.stringify(sl));
  const [fc2] = await Promise.all([pg.waitForEvent('filechooser'), pg.click('[data-fk="mkup:g2"]')]); await fc2.setFiles(long);
  await pg.waitForFunction(() => MK_REC && (MK_REC.ph === 'err' || MK_REC.ph === 'review'), null, { timeout: 20000 }).catch(() => {});
  const f2 = await pg.evaluate(() => ({ ph: MK_REC && MK_REC.ph, msg: MK_REC && MK_REC.msg }));
  ok(`${w} 60초 넘는 파일 — 올리지 않고 한 줄로 알린다`, f2.ph === 'err' && /60초/.test(f2.msg || ''), JSON.stringify(f2));
  await pg.evaluate(() => mkRecCancel());
  await pg.click('[data-fk="mkupdel:g0"]'); await pg.waitForTimeout(250); await pg.click('.ord-ask .oa-yes'); await pg.waitForTimeout(400);   // [REC_DLG] 브라우저 confirm 대신 우리 판
  const d1 = await pg.evaluate(() => ({ up: S.up.g0, couple: _lSteps(ENG, ['guest']).filter((x) => x.couple).length, rec: !!document.querySelector('[data-fk="mkrec:g0"]') }));
  ok(`${w} [지우기] → 그 줄은 다시 예시 · 나레이션 · [녹음] 이 돌아온다`, !d1.up && d1.couple === 0 && d1.rec, JSON.stringify(d1));
  const tk = await pg.evaluate(() => { mkGo('vow'); render(); return { live: document.querySelectorAll('.mk-flow li.t .vk-live').length, narr: document.querySelectorAll('.mk-flow .vk-narr').length }; });
  ok(`${w} 서약 — 두 분 차례는 «당일 직접»(기본 번갈아 = 한 줄 [VOW_HOW]) · 여는 말 · 맺는 말은 «나레이션»`, tk.live === 1 && tk.narr >= 2, JSON.stringify(tk));
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
  const off = await pg.evaluate(() => ({ vc: !!document.querySelector('.mk-aisec'), ai: document.querySelectorAll('[data-fk^="mkai:"]').length, chip: !!document.querySelector('[data-fk="lsc:guestVoice:ai"]') }));
  ok('3단계 스위치 꺼짐 — AI 칸 · 고르는 칸의 AI · [AI로 만들기]가 안 보인다 [VOICE_CLONE]', !off.vc && off.ai === 0 && !off.chip, JSON.stringify(off));
  /* ★[VOICE_CLONE_0928] 켜기(시험에서만) + 가짜 마이페이지 · 서버 — 동의 → 1분 읽기(글 둘 · 서버 확인 문장) → 만들기 → 그 사람의 빈 줄만 AI */
  await pg.evaluate((MP3) => { RitualOpen.FEATURE.upLive = true; S.vsChip = 1; S.vsAsked = 1;   /* [VS_CHIP_ONCE] 칩 첫 창 · [R2-15] ② 첫 진입 창은 voice-setup 이 잰다 */  RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true; window.__vcCalls = [];   // [VOICE_UP_FROM] 날짜 문도 연 예식(시험)
    const st = { groom: { consent: false, ready: false, left: 3 }, bride: { consent: false, ready: false, left: 3 } };
    window.addEventListener('message', (ev) => { const d = ev.data || {}; if (d.type === 'momentedit:voiceClone') { const q = d.data; window.__vcCalls.push(q.op + ':' + (q.who || q.key || q.role || ''));
        let r = { ok: true }; if (q.op === 'status') r = { ok: true, groom: st.groom, bride: st.bride, per: {} }; if (q.op === 'consent') st[q.who].consent = true;
        if (q.op === 'phrase') r = { ok: true, phrase: '오늘은 구월 이십팔일, 파란 우산과 노란 연필.' };
        if (q.op === 'enroll') { st[q.who].ready = true; st[q.who].made = '2026-09-28 10:00'; r = { ok: true, tries: 1 }; }
        if (q.op === 'make') r = { ok: true, key: q.key, left: 4, parts: (q.lines || [[q.one || 'groom']]).map((l) => ({ who: l[0], mime: 'audio/mpeg', data: MP3 })) }; if (q.op === 'practice') r = { ok: true, mime: 'audio/mpeg', data: MP3 };
        setTimeout(() => window.postMessage(Object.assign({ type: 'momentedit:voiceCloneDone', rid: q.rid }, r), location.origin), 50); }
      if (d.type === 'momentedit:ritualFile') setTimeout(() => window.postMessage({ type: 'momentedit:ritualFileDone', key: d.data.key, ok: true, name: d.data.name, id: 'AI' + d.data.key, at: 'x' }, location.origin), 50); });
    render(); }, MP3); await pg.waitForTimeout(600);
  await pg.click('[data-fk="lsc:guestVoice:ai"]'); await pg.waitForTimeout(600);
  /* ★[VOICE_ONCE 2026-10-03 사장님] 사람 카드(목소리 만들기 시작)는 순간 쪽이 아니라 «두 분 목소리 만들기» 쪽에 — 그 쪽으로 가서 같은 동의 창을 연다 */
  ok('하객 맞이(AI · 목소리 없음) — 사람 카드 대신 한 줄 «두 분 목소리를 아직 만들지 않았어요 · 만들기» [VOICE_ONCE]', await pg.evaluate(() => !document.querySelector('[data-fk="mkvcok:groom"]') && !!document.querySelector('[data-fk="mkvnone"]')));
  await pg.click('[data-fk="mkvoicego"]'); await pg.waitForTimeout(500);
  await pg.click('[data-fk="mkvcok:groom"]'); await pg.waitForTimeout(200);
  const c1 = await pg.evaluate(() => ({ dis: document.getElementById('vcAgree').disabled, t: (document.getElementById('mkRecDlg') || {}).textContent || '', step: (document.querySelector('#mkRecDlg [aria-current=step]') || {}).textContent }));
  await pg.check('#vcSelf'); await pg.click('#vcAgree'); await pg.waitForTimeout(600);
  const c2 = await pg.evaluate(() => ({ t: (document.getElementById('mkRecDlg') || {}).textContent || '', step: (document.querySelector('#mkRecDlg [aria-current=step]') || {}).textContent, file: !!document.querySelector('#mkRecDlg [data-fk^="mkup"],#mkRecDlg [data-fk="mkrecfile"]') }));
  ok('동의 — 작은 창 «동의» 걸음 · 체크해야 [동의하고 읽으러 가기] · 문구(어디에 · 무엇을 · 언제 지우나요 · 안 해도 돼요) → «글 1» 걸음(한 번에 한 글 · 파일 올리기 없음) [REC_DLG]', c1.dis && c1.step === '동의' && /음성 업체\(타입캐스트\)/.test(c1.t) && /예식 다음 날/.test(c1.t) && /안 해도 돼요/.test(c1.t) && c2.step === '글 1' && /느린|선선합니다/.test(c2.t) && !/느티나무/.test(c2.t) && !/파일은 올릴 수 없어요/.test(c2.t) /* ★[READ_DLG_TIDY 2026-10-04] 종전 «있다» → 그 한 줄을 걷었다 */ && !c2.file, JSON.stringify({ c1: c1.t.slice(0, 80), c2: c2.t.slice(0, 80) }));
  /* 글 1 은 실제 마이크(가짜 장치)로 녹음 → [이걸로 쓰기]가 그 글 자리에 둔다 · 글 2 는 25초 소리를 넣어 둔다 */
  await pg.click('[data-fk="mkvcrec:1"]'); await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'rec', null, { timeout: 8000 }).catch(() => {});
  await pg.waitForTimeout(1500); await pg.click('[data-fk="mkrecstop"]'); await pg.waitForFunction(() => MK_REC && MK_REC.ph === 'review', null, { timeout: 15000 }).catch(() => {});
  await pg.click('[data-fk="mkrecuse"]'); await pg.waitForTimeout(400);
  const c3 = await pg.evaluate(() => !!(VC.read && VC.read.take[1]));
  const c3b = await pg.evaluate(() => ({ step: (document.querySelector('#mkRecDlg [aria-current=step]') || {}).textContent, t: (document.getElementById('mkRecDlg') || {}).textContent || '' }));
  ok('글 1 [이 녹음으로 다음 ›] → 저절로 «글 2» 걸음 · 둘째 글 끝에 서버 확인 문장 · 글 1 ✓ [REC_DLG]', c3 && c3b.step === '글 2' && /있으신가요\? 오늘은 구월 이십팔일/.test(c3b.t) && /글 1 다시 읽기/.test(c3b.t), JSON.stringify(c3b).slice(0, 300));
  await pg.evaluate(() => { const sr = 24000, n = sr * 25, x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.2 * Math.sin(2 * Math.PI * 190 * i / sr); VC.read.take[2] = { wav: _recWav(x, sr), dur: 25 }; render(); });
  await pg.click('[data-fk="mkvcmake"]'); await pg.waitForTimeout(3500);
  await pg.click('[data-fk="mkvcuse"]'); await pg.waitForTimeout(3500);   /* [VOICE_TUNE] 만든 직후 «이 목소리로 쓰기»(필수) 뒤에 줄을 채운다 */
  const c5 = await pg.evaluate(() => ({ ready: VC.st && VC.st.groom && VC.st.groom.ready, g0: (S.up.g0 || {}).src, g1: (S.up.g1 || {}).src, calls: __vcCalls.join(' '), done: (document.getElementById('mkRecDlg') || {}).textContent || '' }));
  ok('만들면 창이 «만들기» 걸음 · «목소리를 만들었어요» · 채운 줄 수를 말한다 [REC_DLG]', /목소리를 만들었어요/.test(c5.done) && /\d줄을 이 목소리로 채웠어요/.test(c5.done) && !/보냈어요/.test(c5.done), c5.done.slice(0, 200));
  await pg.click('[data-fk="mkvcdone"]'); await pg.waitForTimeout(300);
  ok('만든 뒤 «두 분 목소리 만들기» 쪽 진행 줄 없음 [VPROG_OFF 2026-10-04]', await pg.evaluate(() => !document.querySelector('[data-fk="mkvprog"]')));
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(500);
  ok('1분 읽기 — 글마다 [이걸로 쓰기] → [이 목소리로 만들기] → 준비됨 · 신랑이 읽는 빈 줄(1번)만 AI · 신부 줄(2번)은 비어 있음', c3 && c5.ready && c5.g0 === 'ai' && !c5.g1, JSON.stringify(c5));
  const c6 = await pg.evaluate(() => ({ src: (S.up.g0 || {}).src, st: document.querySelector('.mk-vcards .mk-vr').textContent, couple: _lSteps(ENG, ['guest']).filter((x) => x.couple).length }));
  /* ★[TEXT_PLAY_MAKE 2026-10-04] 종전 «· 다시 만들기» → «이 줄 다시 만들기»를 걷었다(▶ 가 고친 줄을 만든다) — 지우기가 남는다 */
  ok('그 줄이 AI 두 분 목소리(src ai · 상태 줄 · 지우기 · «이 줄 다시 만들기» 없음 [AI_DONE_QUIET])', c6.src === 'ai' && !/AI로 만들었어요/.test(c6.st) && !/지우기/.test(c6.st) && !/이 줄 다시 만들기/.test(c6.st) && c6.couple >= 1, JSON.stringify(c6));
  const c7 = await pg.evaluate(() => { opGoStep('done'); return new Promise((ok) => setTimeout(() => ok(!!document.querySelector('[data-fk="ainotice"]')), 800)); });
  ok('④ — 두 분 화면에는 «일부 안내는 … AI 음성이에요» 한 줄이 없다(하객 고지는 식순지 뒷면 한 줄 · [AI_NOTICE_0928 9-1])', !c7);
  await pg.evaluate(() => opGoStep('practice')); await pg.waitForTimeout(800);
  const c8 = await pg.evaluate(() => !document.querySelector('[data-fk="ptts"]') && !document.querySelector('.pr-voice') && !document.querySelector('[data-fk="prrec"]'));
  ok('③ 연습 — «내 목소리로 연습»(내 차례 녹음 · 두 분 차례 AI 읽기) 칸 없음 [PR_VOICE_OFF 2026-10-05 사용자 지시로 삭제]', c8);
  ok('3단계 pageerror 0', !errs.length, errs.join(' | '));
  await ctx.close();
}
/* ★[PRACTICE_VOICE] ③ 연습 «내 차례를 녹음하며 연습» 시험 금지 — 2026-10-05 사용자 지시로 칸 삭제 [PR_VOICE_OFF] · 칸이 없는 것은 위 c8 이 본다 */
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
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, files: [{ key: 'g2', id: 'F-st2' }, { key: 'g0', id: 'F-g0' }, { key: 'g1', id: 'F-g1' }] }) });   // [RF_STUDIO_UP] 스튜디오가 대신 올린 g2
      const ok = b.fn === 'adminRitualFileGet' && b.args && (b.args[1] === 'F-g0' || b.args[1] === 'F-st2');
      return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(ok ? { ok: true, id: b.args[1], mime: 'audio/wav', data: wav } : { ok: false, error: '없음' }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
  const S0 = { course: 'family', guestVoice: 'couple', entryVoice: 'nar', up: { g0: { id: 'F-g0', n: '녹음' }, g1: { id: 'F-g1', n: '녹음' } } };
  const q = Buffer.from(JSON.stringify(S0)).toString('base64');
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(q)}&rf=ME0001`); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => ({ st: window.__rfState().st, clip: window.__rfState().clip, sec: !document.getElementById('rfSec').hidden, t: document.getElementById('rfChk').textContent }));
  ok('콘솔 — rf=코드 + 관리자 토큰 → 시작 전에 받아 둠(g0 ✓) · 스튜디오가 대신 올린 줄(g2)도 받아 둠 · 못 받은 줄(g1) · 파일 없는 줄(g3)은 «나레이션으로» [REC_ADMIN · RF_STUDIO_UP]', /"g0":"ok"/.test(r.st) && /"g1":"fail"/.test(r.st) && r.clip === 'blob:' && r.sec && /하객 입장 때✓ 두 분 녹음 · 받아 둠/.test(r.t) && /시작 10분 전받지 못함 · 나레이션으로 나감/.test(r.t) && /시작 5분 전✓ 두 분 녹음 · 받아 둠/.test(r.t) && /시작 1분 전파일 없음/.test(r.t) && calls.filter((c) => !/^adminRitualFiles:/.test(c)).every((c) => /^adminRitualFileGet:ME0001,F-(g[01]|st2)$/.test(c)) && /"g2":"ok"/.test(r.st), JSON.stringify({ r, calls }));
  ok('콘솔 pageerror 0', !errs.length, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
