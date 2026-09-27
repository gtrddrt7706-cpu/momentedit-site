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
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(`${w} pageerror 0 · 가로 넘침 0`, !errs.length && !ov, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close(); fs.rmSync(TMP, { recursive: true, force: true });
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
