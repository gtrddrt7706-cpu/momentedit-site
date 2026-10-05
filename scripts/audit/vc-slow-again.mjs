// ★[VC_SLOW_AGAIN · VC_FG_LIVE 2026-10-05] 빌더의 AI 줄 만들기 — 실브라우저(1280)에서 _vc0(마이페이지 다리)만 갈아 끼워 잰다.
//   ①두 분이 누른 만들기가 도는 동안 VC.fg = 1(미리 만들기가 기다린다) · 끝나면 0 ②미리 만들기(bg)는 VC.fg 를 안 올린다
//   ③화면이 기다리다 멈춘 것(timeout)은 8초 뒤 한 번 더 묻는다 → 두 번째가 되면 성공 ④두 번 다 멈추면 «오래 걸려 …» 안내
//   ⑤timeout 아닌 실패(금방 온 down)는 종전대로 3초 뒤 한 번(VC_CALM)
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
try {
  const pg = await br.newPage({ viewport: { width: 1280, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  // ①② 앞일 · 뒷일
  const fg = await pg.evaluate(async () => { const seen = []; _vc0 = (op, d) => new Promise((ok) => { seen.push(VC.fg || 0); setTimeout(() => ok({ ok: true, parts: [] }), 50); });
    await _vc('make', { key: 'entry', text: '안녕하세요 반갑습니다' }); const a = VC.fg || 0; await _vc('make', { key: 'entry', text: '안녕하세요', bg: true }); return { during: seen[0], after: a, bg: seen[1] }; });
  ok('① 두 분이 누른 만들기가 도는 동안 VC.fg = 1 · 끝나면 0 [VC_FG_LIVE]', fg.during === 1 && fg.after === 0, JSON.stringify(fg));
  ok('② 미리 만들기(bg)는 VC.fg 를 안 올린다', fg.bg === 0, JSON.stringify(fg));
  // ③ timeout → 8초 뒤 한 번 더 → 성공
  const t1 = await pg.evaluate(async () => { const at = []; let n = 0; const t0 = Date.now(); _vc0 = (op, d) => { at.push(Date.now() - t0); n++; return Promise.resolve(n === 1 ? { ok: false, down: true, timeout: true, error: 'x' } : { ok: true, parts: [], again: !!d._again }); };
    const r = await _vc('make', { key: 'entry', text: '안녕하세요 반갑습니다' }); return { r, n, at }; });
  ok('③ 기다리다 멈춘 것(timeout) → 8초 뒤 한 번 더 → 성공(저장본) [VC_SLOW_AGAIN]', t1.r.ok && t1.n === 2 && t1.r.again && t1.at[1] >= 7800, JSON.stringify(t1));
  // ④ 두 번 다 timeout
  const t2 = await pg.evaluate(async () => { let n = 0; _vc0 = () => { n++; return Promise.resolve({ ok: false, down: true, timeout: true, error: 'x' }); }; const r = await _vc('make', { key: 'entry', text: '안녕하세요 반갑습니다' }); return { r, n, fg: VC.fg || 0 }; });
  ok('④ 두 번 다 멈추면 «오래 걸려 …» 안내 · 세 번째는 없다 · VC.fg 0', !t2.r.ok && t2.n === 2 && /오래 걸려/.test(t2.r.error) && t2.fg === 0, JSON.stringify(t2));
  // ⑤ 금방 온 down → 3초 뒤 한 번(종전)
  const t3 = await pg.evaluate(async () => { const at = []; let n = 0; const t0 = Date.now(); _vc0 = () => { at.push(Date.now() - t0); n++; return Promise.resolve(n === 1 ? { ok: false, down: true, error: 'x' } : { ok: true, parts: [] }); }; const r = await _vc('make', { key: 'entry', text: '안녕하세요 반갑습니다' }); return { r, n, at }; });
  ok('⑤ 금방 온 실패는 종전대로 3초 뒤 한 번(VC_CALM)', t3.r.ok && t3.n === 2 && t3.at[1] >= 2800 && t3.at[1] < 7000, JSON.stringify(t3));
  ok('pageerror 0', errs.length === 0, errs.slice(0, 2).join(' | '));
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC SLOW AGAIN FAIL ${fail}` : '\nVC SLOW AGAIN OK'); process.exit(fail ? 1 : 0);
