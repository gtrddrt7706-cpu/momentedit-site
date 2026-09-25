#!/usr/bin/env node
/* [RAIL_OVERLAP_SCAN 2026-09-25 코워크 회신3 3-6] 식순 빌더에서 상담 말풍선(#meAdvStack · .me-fab-stack)이
   누를 것을 덮는지 잰다 — ① ② ③ ④ · 크게 보기를 390 · 360 · 320 에서 40px 씩 스크롤하며,
   누를 것(단추 · 링크 · 입력 · 요약 · 칩)과 말풍선이 겹치고 «겹친 곳 가운데를 누르면 말풍선이 눌리는» 것을 센다.
   ★재기만 한다(종료 0). 말풍선은 [RAIL_LOCKED] — 옮기는 것은 사장님 결정이다. */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); fs.readFile(path.join(ROOT, u), (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(u)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
const SCAN = () => {
  const bub = document.getElementById('meAdvStack'); if (!bub) return { none: true, hits: [] };
  const hit = new Set(); const step = 40, H = document.documentElement.scrollHeight;
  const scroller = document.getElementById('lsFull') && !document.getElementById('lsFull').hidden ? document.getElementById('lsFull') : null;
  const max = scroller ? scroller.scrollHeight : H;
  for (let y = 0; y <= max; y += step) {
    if (scroller) scroller.scrollTop = y; else window.scrollTo(0, y);
    const b = bub.getBoundingClientRect(); if (!b.width) continue;
    document.querySelectorAll('button,a[href],input,textarea,select,summary,[role=radio],[role=button]').forEach((el) => {
      if (bub.contains(el)) return; const r = el.getBoundingClientRect(); if (!r.width || !r.height) return;
      const x1 = Math.max(r.left, b.left), x2 = Math.min(r.right, b.right), y1 = Math.max(r.top, b.top), y2 = Math.min(r.bottom, b.bottom);
      if (x2 <= x1 || y2 <= y1) return;
      const top = document.elementFromPoint((x1 + x2) / 2, (y1 + y2) / 2);
      if (top && bub.contains(top)) hit.add((el.getAttribute('data-fk') || el.className || el.tagName) + ':' + (el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 14));
    });
  }
  return { hits: [...hit] };
};
const rows = [];
for (const w of [390, 360, 320]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 800 } }); const pg = await ctx.newPage();
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(800);
  await pg.click('#next'); await pg.waitForTimeout(400); await pg.click('#next'); await pg.waitForTimeout(500);
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  const go = async (k) => { await pg.evaluate((k) => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === k) { idx = i; render(); } }, k); await pg.waitForTimeout(900); };
  const res = {};
  res['①'] = await pg.evaluate(SCAN);
  await go('listen'); res['②'] = await pg.evaluate(SCAN);
  await pg.evaluate(() => { window.scrollTo(0, 0); lsPlayAll(); lsToggle(); }); await pg.waitForTimeout(600); res['크게'] = await pg.evaluate(SCAN);
  await pg.evaluate(() => { lsStop(); }); await go('write'); res['③'] = await pg.evaluate(SCAN);
  await go('done'); res['④'] = await pg.evaluate(SCAN);
  rows.push([w, res]);
  await ctx.close();
}
await br.close(); srv.close();
for (const [w, res] of rows) console.log(w + 'px  ' + Object.entries(res).map(([k, v]) => k + ' ' + (v.none ? '말풍선 없음' : v.hits.length)).join(' · '));
for (const [w, res] of rows) if (w === 390) Object.entries(res).forEach(([k, v]) => console.log('  390 ' + k + ': ' + (v.hits || []).join(' | ')));
