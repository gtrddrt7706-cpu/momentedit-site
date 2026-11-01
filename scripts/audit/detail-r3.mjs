#!/usr/bin/env node
/* ★★[DETAIL_R3_1101 · DETAIL_R4_1101 2026-11-01 BGM 섹션 «당일 사고 먼저»] 당일 콘솔 다섯
   R3 ① 현장 선곡(고른 곡 · 더한 곡 · 강조 위치)은 예식(고객 코드 rf)마다 — 앞 예식에서 바꾼 곡이 다음 예식(고객 B16)을 덮지 않는다 · «이 예식에서 바꾼 곡» 한 줄
   R3 ② 새 곡 파일이 안 열리면 앞 곡을 그대로 · 빨간 한 줄 «곡 파일을 열지 못했어요 · 앞 곡을 이어 틀어요» · 화면 «지금 곡»도 앞 곡
   R3 ③ 겹침 중에 GO 가 또 오면 들리는 재생기의 src 를 바꾸지 않는다(셋째 재생기)
   R3 ④ 입장 장면(ESD) 중 «전체 정지» · 뒤로 = 장면 곡 · 예약 멘트까지 멈춤(ESD.run 해제)
   R4 ③ Web Audio 대체 경로 — 덕킹 · «음악만 멈춤»이 재생기 둘 다에 걸린다
   BP_CON = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BP_CON || '';
const O = require(path.join(ROOT, 'assets/ritual-open.js')); require(path.join(ROOT, 'assets/ritual-data.js'));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
const SHORT = wav(0.6, 330);
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'r3-')); const fileOf = (n, sec, hz) => { const p = path.join(TMP, n); fs.writeFileSync(p, hz === 'bad' ? Buffer.from('this is not audio at all '.repeat(40)) : wav(sec, hz)); return p; };
const base = () => { const S0 = O.applyExample({ course: 'open' }, 'standard'); S0.course = 'open'; S0.on = Object.assign({}, S0.on, { tribute: 1, table: 1, toast: 1 }); return S0; };
const url = (S0, rf) => `http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}${rf ? '&rf=' + rf : ''}`;
async function page(ctx, S0, rf, init) { const errs = [], pg = await ctx.newPage(); pg.on('pageerror', (e) => errs.push(e.message));
  if (init) await pg.addInitScript(init); await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__bgmLog = []; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(url(S0, rf)); await pg.waitForTimeout(900); return { pg, errs }; }
const put = async (pg, seg, nth, p) => pg.setInputFiles(`.sg[data-seg="${seg}"] .sg-song:nth-of-type(${nth}) [data-seg-file]`, p, { timeout: 4000 });
const st = (pg) => pg.evaluate(() => window.__seg.st());
const cueIx = (pg, k) => pg.evaluate((k) => window.__bgmR().findIndex((c) => c.k === k), k);
try {
  /* R3 ① 예식마다 */
  { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
    const SA = base(), SB = base(); SB.bgm = { M5: { k: 'B16' } };
    const A = await page(ctx, SA, 'AAA01');
    const pick = await A.pg.evaluate(() => { const b = [...document.querySelectorAll('[data-seg-pick="M5"]')].find((x) => x.getAttribute('data-id') !== 'B16'); if (!b) return ''; b.click(); return b.getAttribute('data-id'); });
    await A.pg.waitForTimeout(300); const a = await A.pg.evaluate(() => ({ sel: window.__segSel('M5'), mine: window.__seg.st().mine, line: (document.getElementById('segMine') || {}).textContent || '' }));
    const B = await page(ctx, SB, 'BBB02'); const b = await B.pg.evaluate(() => ({ sel: window.__segSel('M5'), mine: window.__seg.st().mine, line: (document.getElementById('segMine') || {}).textContent || '' }));
    const A2 = await page(ctx, SA, 'AAA01'); const a2 = await A2.pg.evaluate(() => window.__segSel('M5'));
    ok('R3 ① 앞 예식(AAA01)에서 부모님께 인사 곡을 바꿔도 — 다음 예식(BBB02 · 고객 B16)은 고객 곡 B16 · 그 예식 줄 «바꾼 곡 없음» · AAA01 로 돌아가면 바꾼 곡 그대로',
      !!pick && a.sel === pick && /부모님께 인사/.test(a.line) && b.sel === 'B16' && /없음/.test(b.line) && a2 === pick, { pick, a, b, a2 });
    ok('R3 ① 쪽 오류 0', !A.errs.length && !B.errs.length, [A.errs, B.errs]); await ctx.close(); }
  /* R3 ② 새 곡 파일이 안 열리면 */
  { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const { pg, errs } = await page(ctx, base(), 'R3B');
    await put(pg, 'M1', 1, fileOf('m1.wav', 40, 300)); await put(pg, 'M2', 1, fileOf('bad.wav', 0, 'bad')); await put(pg, 'M2', 2, fileOf('bad2.wav', 0, 'bad')); await put(pg, 'M2', 3, fileOf('bad3.wav', 0, 'bad'));
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(3800); const s0 = await st(pg);
    const ci = await cueIx(pg, 'candle'); await pg.evaluate((i) => window.__bgmGo.fire(i), ci); await pg.waitForTimeout(5200); const s1 = await st(pg);
    const err = await pg.evaluate(() => { const e = document.getElementById('bedErr'); return e && !e.hidden ? e.textContent : ''; });
    ok('R3 ② 화촉 곡 파일이 안 열린다 — 하객 맞이 곡이 그대로 흐르고(지금 곡 · 재생기 그대로) · 빨간 한 줄', s0.id && s1.id === s0.id && s1.on === s0.on && !s1.paused[s1.on] && err === '곡 파일을 열지 못했어요 · 앞 곡을 이어 틀어요', { s0: [s0.seg, s0.id, s0.on], s1: [s1.seg, s1.id, s1.on, s1.paused], err });
    ok('R3 ② 쪽 오류 0', !errs.length, errs); await ctx.close(); }
  /* R3 ③ 겹침 중 GO */
  { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const { pg, errs } = await page(ctx, base(), 'R3C');
    await put(pg, 'M1', 1, fileOf('a1.wav', 60, 300)); await put(pg, 'M2', 1, fileOf('a2.wav', 60, 400)); await put(pg, 'M2', 2, fileOf('a2b.wav', 60, 400)); await put(pg, 'M2', 3, fileOf('a2c.wav', 60, 400)); await put(pg, 'M4', 1, fileOf('a4.wav', 60, 500));
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(3800); const s0 = await st(pg);
    const ci = await cueIx(pg, 'candle'), wi = await pg.evaluate(() => window.__bgmR().findIndex((c) => c.k === 'welcome' && !/^bridge-/.test(c.slug || '')));
    await pg.evaluate((i) => window.__bgmGo.fire(i), ci); await pg.waitForTimeout(1300); const s1 = await st(pg);
    await pg.evaluate((i) => window.__bgmGo.fire(i), wi); const s2 = await st(pg); await pg.waitForTimeout(500); const s3 = await st(pg);
    const fadingSrc1 = s1.src[s0.on], audible = s1.xg[s0.on] != null && s1.xg[s0.on] > 0.05;
    ok('R3 ③ 화촉으로 넘어가는 겹침(앞 곡이 아직 들림) 중에 감사 인사 GO — 들리던 재생기의 곡 주소가 그대로 · 새 곡은 다른 재생기', audible && s3.src[s0.on] === fadingSrc1 && s3.id !== s1.id && s3.on !== s0.on && s3.on !== s1.on, { s0: [s0.on, s0.id], s1: [s1.on, s1.id, s1.xg], s3: [s3.on, s3.id, s3.xg, s3.src.map((x) => x.slice(-6))], fadingSrc1: fadingSrc1.slice(-6) });
    ok('R3 ③ 쪽 오류 0', !errs.length, errs); await ctx.close(); }
  /* R3 ④ 입장 장면 중 전체 정지 · 뒤로 */
  for (const how of ['panic', 'back']) { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const { pg, errs } = await page(ctx, base(), 'R3D');
    await pg.click('#go'); await pg.waitForTimeout(900);
    const z = await pg.evaluate(async (how) => { const a = new (window.AudioContext || window.webkitAudioContext)(); await a.resume(); const mk = () => a.createGain(); const src = a.createOscillator(), dk = mk(), vg = mk(), eg = mk(), mg = mk(), lim = mk(), v = a.createOscillator();
      src.connect(dk); dk.connect(a.destination); v.connect(vg); vg.connect(a.destination); src.start(); v.start(a.currentTime + 2); let ended = false; src.onended = () => { ended = true; };
      const run = { i: 0, t0: a.currentTime, PL: {}, src, vs: [v], vgs: [], eg, dk, mg, lim, vg, a }; const E = window.__esdT; if (!E) return { hook: false }; E.set(run); let fired = false; E.later(() => { fired = true; }, 1500);
      if (how === 'panic') E.panic(); else document.getElementById('bBack').onclick();
      await new Promise((r) => setTimeout(r, 2200)); return { run: E.run(), fired, dk: Math.round(dk.gain.value * 1000) / 1000, vg: Math.round(vg.gain.value * 1000) / 1000 }; }, how);
    ok(`R3 ④ 입장 장면 중 ${how === 'panic' ? '«전체 정지»' : '«뒤로»'} — 장면 곡 · 예약 멘트까지 멈춘다(ESD.run 해제 · 곡 · 목소리 0 · 예약 0)`, !z.run && !z.fired && z.dk < 0.01 && z.vg < 0.01, z);
    ok(`R3 ④ ${how} 쪽 오류 0`, !errs.length, errs); await ctx.close(); }
  /* R4 ③ Web Audio 대체 경로 */
  { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const { pg, errs } = await page(ctx, base(), 'R4C', () => { try { delete window.AudioContext; delete window.webkitAudioContext; window.AudioContext = undefined; window.webkitAudioContext = undefined; } catch (e) {} });
    await put(pg, 'M1', 1, fileOf('f1.wav', 60, 300)); await put(pg, 'M2', 1, fileOf('f2.wav', 60, 400)); await put(pg, 'M2', 2, fileOf('f2b.wav', 60, 400)); await put(pg, 'M2', 3, fileOf('f2c.wav', 60, 400));
    await pg.waitForTimeout(1200); await pg.click('#go'); await pg.waitForTimeout(4500);   /* 시작 = 하객 맞이 곡이 둘째 재생기(aBgm2)에서 */
    const s0 = await st(pg); await pg.evaluate(() => window.__bgmGo.duck(-20, 10)); await pg.waitForTimeout(200); const s1 = await st(pg);
    const want = await pg.evaluate(() => Math.min(1, Math.pow(10, -20 / 20) * (+document.getElementById('vol').value) / 100));
    await pg.click('#bMute'); await pg.waitForTimeout(200); const s2 = await st(pg); await pg.click('#bMute'); await pg.waitForTimeout(200); const s3 = await st(pg);
    const on = s1.on, otherMax = Math.max(...s1.vol.filter((v, k) => k !== on));
    ok('R4 ③ Web Audio 없이 — 들리는 재생기가 aBgm 이 아니어도 −20 덕킹 크기 · 다른 재생기 0 · «음악만 멈춤»이면 0 · 다시 누르면 그 크기', s0.xg.every((x) => x == null) && on !== 0 && Math.abs(s1.vol[on] - want) < 0.02 && otherMax < 0.01 && s2.vol.every((v) => v < 0.01) && Math.abs(s3.vol[on] - want) < 0.02, { on, s0: s0.vol, s1: s1.vol, want, s2: s2.vol, s3: s3.vol });
    ok('R4 ③ 쪽 오류 0', !errs.length, errs); await ctx.close(); }
} catch (e) { ok('검사가 끝까지 돌았다', false, String(e && e.stack || e).slice(0, 600)); }
await br.close(); srv.close();
console.log(fail ? `DETAIL R3 FAIL ${fail}` : 'DETAIL R3 OK');
process.exit(fail ? 1 : 0);
