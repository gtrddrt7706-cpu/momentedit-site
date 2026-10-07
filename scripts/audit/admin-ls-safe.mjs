#!/usr/bin/env node
/* ★[ADM_LS_SAFE 2026-10-07 점검] 관리자 화면 — 저장소(localStorage)가 막힌 브라우저에서도 로그인 화면이 뜨고 안내 한 줄이 보이나.
   ①저장 막힘(읽기 · 쓰기가 오류) ②저장소 자체 접근 오류(SecurityError) ③카카오톡 안 창 ④보통 창 — 390 실렌더
   종전엔 맨 위 «var TOKEN = localStorage.getItem(…)» 한 줄에서 화면이 통째로 멈춰 ADM_KEEP_LOGIN 안내가 바로 그 상황에서만 안 떴다.
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움'); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1';
const KAKAO = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.4.5';
try {
  for (const [name, ua, mode, want] of [['저장 막힘', SAFARI, 'methods', /로그인을 저장하지 못해요/], ['저장소 접근 오류', SAFARI, 'getter', /로그인을 저장하지 못해요/], ['카카오톡 안 창', KAKAO, '', /다른 브라우저로 열기/], ['보통 창', SAFARI, '', null]]) {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, userAgent: ua }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    if (mode === 'methods') await pg.addInitScript(() => { const bad = { getItem() { throw new Error('blocked'); }, setItem() { throw new Error('blocked'); }, removeItem() { throw new Error('blocked'); } }; try { Object.defineProperty(window, 'localStorage', { get() { return bad; } }); } catch (e) {} });
    if (mode === 'getter') await pg.addInitScript(() => { try { Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } }); } catch (e) {} });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '{}', headers: { 'Access-Control-Allow-Origin': '*' } })));
    await pg.goto(`http://127.0.0.1:${port}/admin.html`); await pg.waitForTimeout(1200);
    const r = await pg.evaluate(() => { const k = document.querySelector('.login-keep'); const id = document.getElementById('lgId'); return { keep: k && k.offsetParent ? k.innerText.replace(/\s+/g, ' ') : '', login: !!(id && id.offsetParent) }; });
    ok(`${name} — 화면 오류 0 · 로그인 화면이 뜬다`, errs.length === 0 && r.login, JSON.stringify({ errs: errs.slice(0, 2), login: r.login }));
    ok(`${name} — 안내 한 줄 ${want ? '있음' : '없음'}`, want ? want.test(r.keep) : r.keep === '', r.keep);
    await ctx.close();
  }
} catch (e) { console.log('못 쟀다 —', e && e.message); await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `FAIL ${fail}건` : 'admin-ls-safe OK'); process.exit(fail ? 1 : 0);
