#!/usr/bin/env node
/* ★[THANKS_DUP_BOTH_R7_1016 라운드 7] 감사 인사와 감사문(서약 카드 «감사문»)을 함께 담으면 «감사 인사와 내용이 겹쳐요» 알림 — 고르는 순서와 상관없이
   (예전엔 감사문을 고를 때만 떴다 · THANKS_DUP_TOAST_1014). 감사문을 먼저 고르고 감사 인사를 담는 순서 · 반대 순서 · 서약만(알림 없음) 셋을 잰다.
   사용: node scripts/audit/thanks-dup-toast.mjs [사이트 폴더] — 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const ROOT = process.argv[2] || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log("못 쟀다 — 브라우저 " + e.message); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + JSON.stringify(d))); if (!c) fail++; };
async function run(order) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(800);
  const got = await pg.evaluate((order) => { const seen = []; const orig = window._lsToast; window._lsToast = function (m) { seen.push(m); return orig && orig.apply(this, arguments); };
    S.on = S.on || {}; delete S.on.welcome; delete S.on.vow; S.vowKind = 'vow';
    if (order === 'thanks-first') { opTgl('vow'); _lSet('vowKind', 'thanks'); seen.length = 0; opTgl('welcome'); }
    else if (order === 'welcome-first') { opTgl('welcome'); opTgl('vow'); seen.length = 0; _lSet('vowKind', 'thanks'); }
    else if (order === 'vow-plain') { opTgl('vow'); seen.length = 0; opTgl('welcome'); }
    return seen; }, order).catch((e) => ['ERR ' + e.message]);
  await ctx.close(); return { got, errs };
}
for (const [o, want] of [['thanks-first', true], ['welcome-first', true], ['vow-plain', false]]) {
  const { got, errs } = await run(o); const hit = got.some((m) => /감사 인사와 내용이 겹쳐요/.test(m));
  ok(`${o}: 겹침 알림 ${want ? '뜬다' : '안 뜬다'}`, hit === want && !errs.length, { got, errs });
}
await br.close(); srv.close(); process.exit(fail ? 1 : 0);
