// ★[VC_R2 2026-10-09 고객 여정 A~Z 점검 2라운드 · AI 녹음] 두 분 목소리 전 구간의 약속.
//   1 [REC_CAP_ONE]      1분 멈춤 표시는 그 녹음 한 번에만 — 앞 녹음의 표시가 다음 짧은 녹음에 «1분이 되어 녹음이 멈췄어요»로 새지 않는다
//   2 [NR_CLOSE_DIRECT]  다시 해도 안 되는 실패(V2 · V3 · V8 · 지우기 취소) · 한도 창의 «닫기» · ✕ 는 묻지 않고 닫는다
//   3 [NR_ANY_STEP]      이어받은 창(읽은 녹음 없음 · 글 1)도 그 실패면 «닫기» — «녹음 시작»을 권하지 않는다
//   4 [VC_GONE]          지우기로 취소된 만들기 → 그 분은 바로 «없음»(카드 · 채우기가 이 상태를 본다)
//   5 [ADOPT_QUIET]      다른 탭 · 기기가 보낸 만들기를 이어받아 끝나면 맞추기 창 · «맞추기 필요»를 만들지 않는다
//   6 [REVIEW_TAP_GUARD] 들어 보기 화면이 뜬 직후(0.6초)의 누름은 받지 않는다(멈춤 두 번 누름)
//   7 [SETUP_ERRBOX]     안내 목소리 정하기 창도 상태를 못 받으면 오류 칸(코드 · 다시 불러오기)
//   8 [FILL_AI_NOW]      채우는 사이 그 순간을 나레이션으로 바꿨으면 그 순간 줄은 더 만들지 않는다
//   9 [FILL_OWN]         채우기마다 제 기록 — 겹친 채우기가 서로의 개수 · 끝을 건드리지 않는다(하객 맞이 넷 · 줄마다 0.25초 흉내)
//   VR2_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.VR2_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function open() {
  const pg = await br.newPage({ viewport: { width: 390, height: 860 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`${BASE}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
  await pg.evaluate(() => { courseStarted = true; if (COURSES.open) S.course = 'open'; buildSteps(); render(); });
  return { pg, errs };
}
try {
  const { pg, errs } = await open();
  /* 1 — 4초 녹음(220Hz)을 앞 녹음의 1분 멈춤 표시가 남은 채로 받는다 */
  const a = await pg.evaluate(async () => {
    const sr = 24000, n = sr * 4, buf = new ArrayBuffer(44 + n * 2), v = new DataView(buf); const w = (o, s) => { for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i)); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true); v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true); w(36, 'data'); v.setUint32(40, n * 2, true);
    for (let i = 0; i < n; i++) v.setInt16(44 + i * 2, Math.round(Math.sin(2 * Math.PI * 220 * i / sr) * 9000), true);
    window.MK_RECCAP = 'g1';   // 옛 판의 전역 표시 — 새 판은 쓰지 않는다
    _recFromBlob('g1', new Blob([buf], { type: 'audio/wav' }), 'rec');
    for (let i = 0; i < 60 && !(MK_REC && MK_REC.ph !== 'busy'); i++) await new Promise((r) => setTimeout(r, 100));
    return { ph: MK_REC && MK_REC.ph, warn: (MK_REC && MK_REC.warn) || [] }; });
  ok('1 앞 녹음의 1분 멈춤 표시가 다음 녹음에 «1분이 되어 녹음이 멈췄어요»로 새지 않는다 [REC_CAP_ONE]', a.ph === 'review' && !a.warn.some((x) => /1분이 되어/.test(x)), JSON.stringify(a));
  await pg.evaluate(() => { MK_REC = null; render(); });
  /* 2 */
  const b = await pg.evaluate(async () => { VC.read = { who: 'groom', take: { 1: { wav: 'x', dur: 15 }, 2: { wav: 'y', dur: 15 } }, phrase: '오늘은 맑음', step: 2, ph: 'read', err: 'AI 목소리가 막혔어요 · 스튜디오에 알렸어요 (코드 V2)' }; render();
    mkDlgClose(); await new Promise((r) => setTimeout(r, 300)); const ask = !!document.querySelector('.ord-ask.on'); const r = { read: !!VC.read, ask }; if (window._ordOv) _ordOv.__ordClose(false); VC.read = null; render(); return r; });
  ok('2 다시 해도 안 되는 실패(V2)의 «닫기» · ✕ 는 묻지 않고 닫는다 [NR_CLOSE_DIRECT]', !b.read && !b.ask, JSON.stringify(b));
  /* 3 */
  const c = await pg.evaluate(() => { VC.read = { who: 'bride', take: {}, phrase: '', step: 1, ph: 'read', err: 'AI 목소리가 막혔어요 · 스튜디오에 알렸어요 (코드 V2)' }; render();
    const d = document.getElementById('mkRecDlg'); const btns = d ? [...d.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => x.textContent.trim()) : null; VC.read = null; render(); return btns; });
  ok('3 이어받은 창(읽은 녹음 없음 · 글 1)도 V2 면 «닫기» · «녹음 시작» 없음 [NR_ANY_STEP]', !!c && c.indexOf('닫기') > -1 && !c.some((t) => /녹음 시작/.test(t)), JSON.stringify(c));
  /* 4 */
  const d = await pg.evaluate(() => { VC.st = VC.stLast = { ok: true, groom: { ready: true }, bride: { ready: true } }; VC.loading = true;   // 다시 받기(_vcStatus)는 이 시험에서 막아 둔다
    const R = { who: 'groom', take: { 1: { wav: 'x', dur: 15 }, 2: { wav: 'y', dur: 15 } }, phrase: '', step: 2, ph: 'busy', err: '' }, E = { w: 'groom', R, snap: {}, t0: Date.now(), jid: 'j1' };
    VC.enr = { groom: E }; VC.read = null; _vcEnrCtl(E).fail(VC_DEL_STOP_W); const st = VC.st || VC.stLast; return { groom: !!(st.groom || {}).ready, bride: !!(st.bride || {}).ready }; });
  ok('4 지우기로 취소된 만들기 → 그 분은 바로 «없음» · 다른 분은 그대로 [VC_GONE]', d.groom === false && d.bride === true, JSON.stringify(d));
  /* 5 */
  const e = await pg.evaluate(() => { VC.st = VC.stLast = { ok: true, groom: { ready: true }, bride: { ready: true } }; VC.loading = true; S.vsetNeed = {}; VC.tune = null;
    const R = { who: 'bride', take: {}, phrase: '', step: 1, ph: 'busy', err: '', slow: true }, E = { w: 'bride', R, snap: {}, t0: Date.now() - 5000, jid: 'jB', adopt: true };
    VC.enr = { bride: E }; VC.read = R; _vcEnrCtl(E).good({ ok: true }); return { need: (S.vsetNeed || {}).bride || null, tune: !!VC.tune, ph: R.ph, read: !!VC.read }; });
  ok('5 다른 탭 · 기기의 만들기를 이어받아 끝나면 맞추기 창 · «맞추기 필요»를 만들지 않는다 · 이어받은 창은 닫힌다 [ADOPT_QUIET]', !e.need && !e.tune && !e.read, JSON.stringify(e));
  await pg.evaluate(() => { VC.loading = false; VC.read = null; VC.enr = {}; render(); });
  /* 6 */
  const f = await pg.evaluate(() => { const r = { key: 'g1', ph: 'review', url: 'blob:x', wav: new Blob(['x']), dur: 4, warn: [], src: 'rec', t: Date.now() }; MK_REC = r; render(); mkRecAgain(); const same = MK_REC === r && MK_REC.ph === 'review'; MK_REC = null; render(); return same; });
  ok('6 들어 보기 화면이 뜬 직후(0.6초)의 «다시 녹음» 누름은 받지 않는다(멈춤 두 번 누름) [REVIEW_TAP_GUARD]', f, String(f));
  /* 7 */
  const g = await pg.evaluate(() => { if (typeof _vsPanel !== 'function') return { has: false }; VS.ph = 'ai'; VC.st = null; VC.stErr = true; VC.stWhy = '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6)'; VC.loading = true; const h = _vsPanel(); VS.ph = ''; VC.stErr = false; VC.loading = false; return { has: true, err: /불러오지 못했어요/.test(h) && /코드/.test(h), wait: /불러오고 있어요/.test(h) }; });
  ok('7 안내 목소리 정하기 창도 상태를 못 받으면 오류 칸(코드) · «불러오고 있어요» 아님 [SETUP_ERRBOX]', g.has && g.err && !g.wait, JSON.stringify(g));
  /* 8 */
  const h = await pg.evaluate(() => { VC.st = VC.stLast = { ok: true, groom: { ready: true }, bride: { ready: true } }; VC.delBusy = {}; const g0 = S.guestVoice, f0 = S.vfill;
    S.guestVoice = 'couple'; S.vfill = { guest: 'ai' }; const on = _vcFillOk('g1'); S.guestVoice = 'nar'; const nar = _vcFillOk('g1'); S.guestVoice = g0; S.vfill = f0; return { on, nar }; });
  ok('8 채우는 사이 그 순간을 나레이션으로 바꿨으면 그 순간 줄은 더 만들지 않는다 [FILL_AI_NOW]', h.on === true && h.nar === false, JSON.stringify(h));
  /* 9 — 만들기는 흉내(줄마다 0.25초) · A 채우기 0.1초 뒤 B 채우기 */
  const k = await pg.evaluate(async () => { VC.st = VC.stLast = { ok: true, groom: { ready: true }, bride: { ready: true } }; S.guestVoice = 'couple'; S.vfill = { guest: 'ai' }; S.up = {}; S.vself = {};
    window._vcFillOk = function () { return true; }; window._vcFillGot = function () { return true; }; window._vcMake = function () { return new Promise(function (r) { setTimeout(r, 250); }); };
    _vcAutoFill(['groom', 'bride'], false, { keep: true }); const FA = VC.fill, nA = FA.n;
    await new Promise((r) => setTimeout(r, 600)); _vcAutoFill(['groom', 'bride'], false, { keep: true }); const FB = VC.fill;   // A 는 1.0초에 끝나고 B 는 1.6초에 끝난다
    await new Promise((r) => setTimeout(r, 600)); const mid = { aDoing: FA.doing, bDoing: FB.doing, bOk: FB.ok, bN: FB.n };   // 1.2초 — A 만 끝난 때
    await new Promise((r) => setTimeout(r, 700)); return { nA, same: FA === FB, mid, end: { aOk: FA.ok, aN: FA.n, bOk: FB.ok, bN: FB.n, bDoing: FB.doing } }; });
  ok('9 겹친 채우기가 서로의 개수 · 끝을 건드리지 않는다(«3줄 가운데 5줄» 없음) [FILL_OWN]', k.nA === 4 && !k.same && k.mid.aDoing === false && k.mid.bDoing === true && k.mid.bOk <= k.mid.bN && k.end.bOk <= k.end.bN && k.end.aOk <= k.end.aN && k.end.bDoing === false, JSON.stringify(k));
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC R2 FAIL ${fail}` : '\nVC R2 OK'); process.exit(fail ? 1 : 0);
