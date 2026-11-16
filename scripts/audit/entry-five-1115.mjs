#!/usr/bin/env node
/* ★★[ENTRY_FIVE_1115 2026-11-15 대본 «입장 장면 콘솔 5 를 이번 #1655 에 같이» · 음성 쉼 방 몫 다섯] 입장 장면(입장곡을 받은 날) — 당일 콘솔 넷 + 미리 듣기 하나
   ① [ENTRY_VOICE_CUT_1115] 입장 멘트 도중 도착 GO — 장면 목소리가 0.4초 안에 거둬진다(종전: 도착 멘트와 7초 넘게 겹침) · 곡은 계속
   ② [ENTRY_CALL_RESUME_1115] «입장!» 구호 전에 전체 정지 → GO(잇기) — 곡과 함께 장면 목소리도 다시 걸린다(종전: 곡만 · 구호 사라짐)
   ③ [ENTRY_PAUSE_TWICE_1115] 입장 곡 도중 전체 정지를 두 번 — 멈춘 자리가 남고 다음 GO 가 곡을 잇는다(종전: 기록이 지워져 다음 큐로)
   ④ [ENTRY_FADE_CUT_1115] 짧은 입장 곡 → 본식 피아노 3초 인계 중 전체 정지 — 잦아들던 입장 곡이 0.5초 안에 거둬진다(종전: 3초 더 흐름)
   ⑤ [SHORT_SONG_FADE_1115] 미리 듣기 장면 곡이 «크게 머묾 + 잦아듦»보다 먼저 끝나면 곡 끝 4초 앞부터 잦아든다(종전: 0 dB 로 흐르다 파일 끝에서 끊김 · 60초 곡 · 강조 0:50)
   BP_CON=<console.html> · BP_ES=<entry-scene.js>(깨 보기) · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BP_CON ? path.resolve(process.env.BP_CON) : '', ESF = process.env.BP_ES ? path.resolve(process.env.BP_ES) : path.join(ROOT, 'assets/entry-scene.js');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
/* ⑤ 미리 듣기 장면 크기 — 노드에서 entry-scene.js 를 그대로 읽는다 */
{ const sb = { window: {}, Math, Float32Array, Array, Object, isFinite, Number }; vm.createContext(sb); vm.runInContext(fs.readFileSync(ESF, 'utf8'), sb); const ES = sb.window.EntryScene;
  const V0 = { pieces: [{ a: 0, d: 6 }, { a: 7, d: 2 }], gaps: [1] }, Sg = { dur: 60, gain: 1 }, PL = ES.plan(V0, Sg, 50, { after: 60 });
  const at = (x) => Math.round(ES.envDb(PL, x) * 10) / 10, r5 = { tend: Math.round(PL.tend * 10) / 10, th: Math.round(PL.th * 10) / 10, 끝4초전: at(PL.tend - 4.2), 끝1초전: at(PL.tend - 1), 끝0_1초전: at(PL.tend - 0.1) };
  console.log('  재 본 값 ⑤', JSON.stringify(r5));
  ok('⑤ 짧은 곡(60초 · 강조 0:50) — 곡 끝 4초 앞까지 크게 · 끝 1초 전 −50 dB 아래 · 끝 0.1초 전 −70 dB 아래(끊기지 않고 잦아든다) [SHORT_SONG_FADE_1115]', PL.tend < PL.th + 60 + ES.OUTF && r5.끝4초전 >= -7 && r5.끝1초전 <= -50 && r5.끝0_1초전 <= -70, r5);
  const PL2 = ES.plan(V0, { dur: 400, gain: 1 }, 50, { after: 60 });
  ok('⑤ 대조 — 긴 곡은 종전 그대로(크게 머묾 60초 뒤 4초에 잦아듦)', Math.abs(PL2.tend - (PL2.th + 60 + ES.OUTF)) < 0.01 && ES.envDb(PL2, PL2.th + 59) > -7 && ES.envDb(PL2, PL2.th + 62) < -40, { th: PL2.th, tend: PL2.tend }); }
/* ① ~ ④ 당일 콘솔 */
let pw = null; for (const p of ['playwright', path.join(process.env.NODE_PATH || '', 'playwright'), '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function wav(sec, f, sr = 16000) { const n = Math.round(sr * sec), b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  for (let i = 0; i < n; i++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + i * 2); return b; }
function burst(parts, sr = 16000) { const tot = parts.reduce((a, [d]) => a + Math.round(sr * d), 0), b = Buffer.alloc(44 + tot * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + tot * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(tot * 2, 40);
  let k = 0; for (const [d, f] of parts) { const n = Math.round(sr * d); for (let i = 0; i < n; i++, k++) b.writeInt16LE(Math.round(f ? 8000 * Math.sin(2 * Math.PI * f * i / sr) : 0), 44 + k * 2); } return b; }
const SHORT = burst([[3, 330], [0.8, 0], [1.5, 300]]);   /* 나레이션 대신 — 말 조각 둘(3초 · 쉼 0.8초 · 1.5초) · 장면 목소리가 조각으로 잡히게 */
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/^\/assets\/audio\/narration\/.+\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(SHORT); return; }
  const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'e5-'));
const open = async (sec, hook) => { const FID = 'SONGID0123456789abcd', SONG = wav(sec, 220, 22050).toString('base64');
  const S = Object.assign(O.applyExample({ course: 'open' }, 'standard'), { course: 'open', entry: 'A', bgm: {}, entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: sec, hook, typed: null, sid: 'x1', fid: FID } }); S.on = Object.assign({}, S.on, { prevideo: 0 });
  const cx = await br.newContext({ viewport: { width: 1280, height: 900 } }); await cx.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const pg = await cx.newPage(), er = []; pg.on('pageerror', (e) => er.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(), H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }; if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue();
    if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, sup: {}, files: [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
      if (b.fn === 'adminRitualFileGet') return rt.fulfill({ status: 200, headers: H, body: JSON.stringify({ ok: true, id: FID, mime: 'audio/wav', data: SONG }) }); }
    return rt.fulfill({ status: 200, headers: H, body: '{"ok":true}' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(900);
  for (const [sg, hz] of [['M1', 220], ['M2', 262], ['M4', 330]]) { const f = path.join(fs.mkdtempSync(path.join(TMP, 'f')), sg + '.wav'); fs.writeFileSync(f, wav(60, hz)); try { await pg.setInputFiles(`.sg[data-seg="${sg}"] .sg-song:nth-of-type(1) [data-seg-file]`, f, { timeout: 4000 }); } catch {} }
  await pg.waitForTimeout(1000); const ready = await pg.waitForFunction(() => window.__esd && window.__esd.s().st === 'ok' && window.__esd.s().v0, null, { timeout: 60000 }).then(() => true, () => false);
  await pg.click('#go'); await pg.waitForTimeout(500); const ix = await pg.evaluate(() => window.__esd.idx());
  const st = () => pg.evaluate(() => window.__esd.s()), fire = (i) => pg.evaluate((i) => window.__bgmGo.fire(i), i), sleep = (ms) => pg.waitForTimeout(ms);
  const toEntry = async () => { await fire(ix.e); return pg.waitForFunction(() => window.__esd.s().run, null, { timeout: 8000 }).then(() => true, () => false); };
  return { cx, pg, er, ready, ix, st, fire, sleep, toEntry }; };
try {
  /* ① 입장 멘트 도중 도착 GO */
  { const c = await open(150, 40); const go = c.ready && await c.toEntry(); await c.sleep(1500); const a = await c.st(); await c.fire(c.ix.e + 1); await c.sleep(450); const b = await c.st();
    const r1 = { 준비: [c.ready, go, c.ix.e], 앞_vg: a.vg, 앞_run: a.run, 뒤_vg: b.vg, 뒤_run: b.run, 뒤_cur: b.cur };
    console.log('  재 본 값 ①', JSON.stringify(r1));
    if (!c.ready || !go || !(a.vg > 0.01)) { console.log('못 쟀다 — ① 입장 장면이 서지 않았다'); fail++; }
    else ok('① 입장 멘트 도중 도착 GO — 장면 목소리(크기)가 0.45초 안에 0.002 아래 · 입장 곡은 계속(run) [ENTRY_VOICE_CUT_1115]', b.vg != null && b.vg <= 0.002 && b.run && !c.er.length, r1);
    await c.cx.close(); }
  /* ② 구호 전에 전체 정지 → GO */
  { const c = await open(150, 40); const go = c.ready && await c.toEntry(); await c.sleep(1200); await c.pg.evaluate(() => window.__esd.panic()); await c.sleep(600); const a = await c.st();
    await c.pg.evaluate(() => window.__bgmGo.tap()); await c.sleep(1500); const b = await c.st();
    const r2 = { 준비: [c.ready, go], 정지_기록: a.paused, 정지_목소리자리: a.pzv, 이은뒤_run: b.run, 이은뒤_vg: b.vg, 이은뒤_vsn: b.vsn, cur: [a.cur, b.cur] };
    console.log('  재 본 값 ②', JSON.stringify(r2));
    if (!c.ready || !go) { console.log('못 쟀다 — ② 입장 장면이 서지 않았다'); fail++; }
    else ok('② 구호 전에 전체 정지 → GO(잇기) — 곡이 이어지고 장면 목소리도 다시 걸린다(크기 0.01 위 · 목소리 마디 1 이상) · 같은 큐 [ENTRY_CALL_RESUME_1115]', a.paused != null && a.pzv != null && b.run && b.vg > 0.01 && b.vsn >= 1 && a.cur === b.cur && !c.er.length, r2);
    await c.cx.close(); }
  /* ③ 전체 정지 두 번 */
  { const c = await open(150, 40); const go = c.ready && await c.toEntry(); await c.sleep(1200); await c.pg.evaluate(() => window.__esd.panic()); await c.sleep(500); await c.pg.evaluate(() => window.__esd.panic()); await c.sleep(500); const a = await c.st();
    await c.pg.evaluate(() => window.__bgmGo.tap()); await c.sleep(1200); const b = await c.st();
    const r3 = { 준비: [c.ready, go], 두번뒤_기록: a.paused, GO뒤_run: b.run, cur: [a.cur, b.cur] };
    console.log('  재 본 값 ③', JSON.stringify(r3));
    if (!c.ready || !go) { console.log('못 쟀다 — ③ 입장 장면이 서지 않았다'); fail++; }
    else ok('③ 입장 곡 도중 전체 정지 두 번 — 멈춘 자리가 남고 다음 GO 가 같은 큐에서 곡을 잇는다 [ENTRY_PAUSE_TWICE_1115]', a.paused != null && b.run && a.cur === b.cur && !c.er.length, r3);
    await c.cx.close(); }
  /* ④ 짧은 입장 곡 인계 중 전체 정지 */
  { const c = await open(32, 24); const go = c.ready && await c.toEntry();
    const hand = await c.pg.waitForFunction(() => window.__esd.hand(), null, { timeout: 60000, polling: 50 }).then(() => true, () => false);
    const r4 = { 준비: [c.ready, go, hand] };
    if (hand) { await c.sleep(300); r4.정지전 = await c.pg.evaluate(() => Math.round(window.__esd.frHold() * 1000) / 1000); await c.pg.evaluate(() => window.__esd.panic()); await c.sleep(500); r4.정지뒤 = await c.pg.evaluate(() => Math.round(window.__esd.frNow() * 10000) / 10000); }
    console.log('  재 본 값 ④', JSON.stringify(r4));
    if (!c.ready || !go || !hand) { console.log('못 쟀다 — ④ 짧은 곡 인계 자리가 서지 않았다'); fail++; }
    else ok('④ 짧은 입장 곡 → 본식 피아노 인계 중 전체 정지 — 잦아들던 입장 곡이 0.5초 안에 0.001 아래 [ENTRY_FADE_CUT_1115]', r4.정지전 > 0.05 && r4.정지뒤 <= 0.001 && !c.er.length, r4);
    await c.cx.close(); }
} catch (e) { console.log('못 쟀다 —', String(e && e.stack || e).slice(0, 500)); fail++; }
await br.close(); srv.close();
console.log(fail ? `entry-five-1115: FAIL ${fail}` : 'entry-five-1115: ok'); process.exit(fail ? 1 : 0);
