#!/usr/bin/env node
/* ★[CHIP_FULL_1019 2026-10-19 사장님 «버튼 짝수로 맞추고 · 서약 감사문 저 부분도 버튼 좌우 꽉 차게 개선 · 그 아래 버튼들도»] 폰 390 — ② 하나씩 만들기 칩 줄
   둘 이상이면 같은 폭 칸으로 좌우를 채운다(둘 = 반반 · 넷 = 2 × 2 · 여섯 = 3 × 2) · 혼자 남는 칩이 없다 · 오른쪽 상담 말풍선 자리 36px 를 비운다([RAIL_LOCKED] 비켜서는 쪽은 칸)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'); const W = 390;
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port; const br = await pw.chromium.launch();
const pg = await br.newPage({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(700);
const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(400);
await pg.evaluate(async () => { S.on.vow = 1; S.vow = 'ok'; opToListen(); await new Promise((r) => setTimeout(r, 500)); });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
for (const k of ['vow', 'matjeol', 'entry', 'guest', 'tribute']) {
  const r = await pg.evaluate(async (k) => { const ps = _mkPages(); if (ps.indexOf(k) < 0) return null; mkGo(k); await new Promise((r) => setTimeout(r, 600)); window.scrollTo(0, 0);
    return [...document.querySelectorAll('.ls-cg .cg-c')].filter((c) => c.offsetParent).map((c) => { const bs = [...c.children].filter((x) => x.tagName === 'BUTTON' && x.offsetParent); const n = +getComputedStyle(c).getPropertyValue('--cgn') || 0;
      const rows = {}; bs.forEach((x) => { const t = Math.round(x.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; }); const cnt = Object.values(rows);
      return { g: (c.parentElement.querySelector('.gl') || {}).textContent, b: bs.length, even: c.classList.contains('cg-even') || c.parentElement.classList.contains('cg-vq'), lone: bs.length > 1 && cnt.some((v) => v === 1), right: Math.max(...bs.map((x) => x.getBoundingClientRect().right)), iw: innerWidth }; }); }, k);
  if (!r) { ok(`390 ${k} 쪽이 있다`, false); continue; }
  const bad = r.filter((x) => x.b >= 2 && (!x.even || x.lone || x.right > x.iw - 16 - 36 + 1));
  ok(`390 ${k} — 칩 줄(둘 이상)은 좌우를 꽉 채우고 · 혼자 남는 칩 없음 · 오른쪽 상담 말풍선 자리(36px)를 비운다 [CHIP_FULL_1019]`, !bad.length, JSON.stringify(bad));
}
ok('화면 오류 없음', !errs.length, errs.slice(0, 2).join(' | '));
await br.close(); srv.close();
console.log(fail ? `CHIP FULL FAIL ${fail}` : 'CHIP FULL OK'); process.exit(fail ? 1 : 0);
