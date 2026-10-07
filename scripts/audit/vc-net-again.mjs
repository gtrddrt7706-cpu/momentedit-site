// ★[VC_NET_AGAIN 2026-10-08 사장님 «지금도 그러는데?»(맞추기 창 V6 되풀이)] 아이폰은 60초 넘는 답을 «연결 끊김»으로 끊는다 — 서버는 끝까지 만들어 저장해 둔다.
//   ①만들기가 연결로 두 번 끊겨도 세 번째(저장본)에 받아 온다 ②세 번 다 끊기면 그때 V6 ③서버 답이 깨짐(V7)은 다시 묻지 않는다 ④기다리는 동안 앞일 셈(VC.fg)이 새지 않는다
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.clock.install();
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.clock.runFor(1000);
  const run = async (fails, kind, op) => {
    await pg.evaluate(([fails, kind, op]) => { window.__n = 0; window.__r = null; VC.fg = 0;
      _vc0 = () => { window.__n++; return Promise.resolve(window.__n <= fails ? { ok: false, down: true, net: kind, error: '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6)' } : { ok: true, parts: [{ data: '' }] }); };
      _vc(op, { key: 'g0', text: '안녕하세요 반갑습니다', one: 'groom' }).then((d) => { window.__r = d; }); }, [fails, kind, op]);
    await pg.clock.runFor(60000);
    return pg.evaluate(() => ({ n: window.__n, ok: !!(window.__r && window.__r.ok), err: (window.__r || {}).error || '', fg: VC.fg }));
  };
  const a = await run(2, 1, 'make'); ok('① 만들기 — 연결로 두 번 끊겨도 세 번째에 받아 온다 · 앞일 셈 0', a.n === 3 && a.ok && a.fg === 0, JSON.stringify(a));
  const p = await run(2, 'srv', 'practice'); ok('① 연습 읽기 — 서버에서 멈춤(V8)도 다시 묻는다', p.n === 3 && p.ok, JSON.stringify(p));
  const b = await run(5, 1, 'make'); ok('② 세 번 다 끊기면 그때 실패 글(V6)을 그대로 보인다 · 네 번째는 묻지 않는다', b.n === 3 && !b.ok && /V6/.test(b.err) && b.fg === 0, JSON.stringify(b));
  const c = await run(5, 'bad', 'make'); ok('③ 서버 답이 깨짐(V7)은 연결 다시 묻기를 하지 않는다(종전 한 번만)', c.n <= 2 && !c.ok, JSON.stringify(c));
  ok('화면 오류 없음', !errs.length, errs.slice(0, 2).join(' | '));
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC NET AGAIN FAIL ${fail}` : '\nVC NET AGAIN OK'); process.exit(fail ? 1 : 0);
