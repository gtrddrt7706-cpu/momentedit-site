#!/usr/bin/env node
/* ★[CHIP_FULL_1019 2026-10-19 사장님 «버튼 짝수로 맞추고 · 서약 감사문 저 부분도 버튼 좌우 꽉 차게 개선 · 그 아래 버튼들도»] 폰 390 — ② 하나씩 만들기 칩 줄
   둘 이상이면 같은 폭 칸으로 좌우를 채운다(둘 = 반반 · 넷 = 2 × 2 · 여섯 = 3 × 2) · 혼자 남는 칩이 없다
   ★★[RAIL_IGNORE_1019 2026-10-19 사장님 «우측버튼레일은 신경쓰지마 무시하고 폭넓게 다시만들기»] 오른쪽 끝까지 — 상담 말풍선(레일) 자리를 비우지 않는다(종전 36px 비우기는 걷었다 · 말풍선이 얹혀도 괜찮다)
   ① 예시 카드 흐름 선 · ② 칩 줄 · ④ 완성 단추 덩어리 · 순서 요약 «변경 · 채우기»를 잰다 · 모양 검사(어느 자리든)는 rail-ignore.mjs
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
/* [RAIL_IGNORE_1019] ① 고르기 쪽 예시 카드 넷 — 감동 흐름 선(오른쪽 끝)은 카드 안쪽 끝까지(종전 PK_EX_BUBBLE_1019 의 말풍선 자리 36px 는 걷었다) · 카드 테두리도 끝까지 */
const pkx = async () => pg.evaluate(() => { const iw = document.documentElement.clientWidth; return [...document.querySelectorAll('.pk-exs .pk-ex')].filter((c) => c.offsetParent).map((c) => { const g = c.querySelector('svg') || c.lastElementChild; const cr = c.getBoundingClientRect(); return { n: (c.textContent || '').trim().slice(0, 6), g: Math.round(g.getBoundingClientRect().right), c: Math.round(cr.right), iw }; }); });
let pkSeen = null; for (let t = 0; t < 3 && !pkSeen; t++) { const r = await pkx(); if (r.length) pkSeen = r; else await nx(); }
if (!pkSeen) ok('390 ① 고르기 쪽 예시 카드를 찾았다', false);
else ok('390 ① 고르기 쪽 예시 카드 — 흐름 선도 카드 테두리도 끝까지(말풍선 자리를 비우지 않는다) [RAIL_IGNORE_1019]', pkSeen.every((x) => x.g >= x.c - 16 && x.c >= x.iw - 20), JSON.stringify(pkSeen));
await pg.evaluate(() => { try { localStorage.clear(); sessionStorage.clear(); } catch (e) {} }); await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(700);   /* 저장된 초안을 지워 처음 쪽부터 */
await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(400);
await pg.evaluate(async () => { S.on.vow = 1; S.vow = 'ok'; opToListen(); await new Promise((r) => setTimeout(r, 500)); });
const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
for (const k of ['vow', 'matjeol', 'entry', 'guest', 'tribute']) {
  const r = await pg.evaluate(async (k) => { const ps = _mkPages(); if (ps.indexOf(k) < 0) return null; mkGo(k); await new Promise((r) => setTimeout(r, 600)); window.scrollTo(0, 0);
    return [...document.querySelectorAll('.ls-cg .cg-c')].filter((c) => c.offsetParent).map((c) => { const bs = [...c.children].filter((x) => x.tagName === 'BUTTON' && x.offsetParent); const n = +getComputedStyle(c).getPropertyValue('--cgn') || 0;
      const rows = {}; bs.forEach((x) => { const t = Math.round(x.getBoundingClientRect().top); rows[t] = (rows[t] || 0) + 1; }); const cnt = Object.values(rows);
      return { g: (c.parentElement.querySelector('.gl') || {}).textContent, b: bs.length, even: c.classList.contains('cg-even') || c.parentElement.classList.contains('cg-vq'), lone: bs.length > 1 && cnt.some((v) => v === 1), right: Math.max(...bs.map((x) => x.getBoundingClientRect().right)), cr: c.getBoundingClientRect().right, pr: parseFloat(getComputedStyle(c).paddingRight) || 0, iw: innerWidth }; }); }, k);
  if (!r) { ok(`390 ${k} 쪽이 있다`, false); continue; }
  const bad = r.filter((x) => x.b >= 2 && (!x.even || x.lone || x.pr > 0 || x.right < x.cr - 1 || x.cr < x.iw - 20));
  ok(`390 ${k} — 칩 줄(둘 이상)은 좌우를 꽉 채우고 · 혼자 남는 칩 없음 · 오른쪽 끝까지(말풍선 자리를 비우지 않는다) [CHIP_FULL_1019 · RAIL_IGNORE_1019]`, !bad.length, JSON.stringify(bad));
}
/* [RAIL_IGNORE_1019] ④ 완성 — 단추 덩어리 · 순서 요약 «변경 · 채우기»도 오른쪽 끝까지(종전 DONE_BUBBLE_1019 의 36px 는 걷었다) */
await pg.evaluate(() => opGoStep('done')); await pg.waitForTimeout(700);
{ const d = await pg.evaluate(() => { const p = document.querySelector('.play-acts'); const bs = p ? [...p.querySelectorAll('button')].filter((b) => b.offsetParent) : [];
    const sr = [...document.querySelectorAll('.sumry .sumrow .sr-c')].filter((x) => x.offsetParent);
    return { acts: !!p && bs.length > 0, pr: p ? parseFloat(getComputedStyle(p).paddingRight) || 0 : -1, gap: p && bs.length ? Math.round(p.getBoundingClientRect().right - Math.max(...bs.map((b) => b.getBoundingClientRect().right))) : -1, sr: sr.length, srm: sr.map((x) => parseFloat(getComputedStyle(x).marginRight) || 0).filter((v) => v > 0).length }; });
  ok('390 ④ 완성 단추 덩어리 · 순서 요약 «변경 · 채우기» — 오른쪽 끝까지(말풍선 자리를 비우지 않는다) [RAIL_IGNORE_1019]', d.acts && d.pr === 0 && d.gap <= 1 && d.sr > 0 && d.srm === 0, JSON.stringify(d)); }
ok('화면 오류 없음', !errs.length, errs.slice(0, 2).join(' | '));
await br.close(); srv.close();
console.log(fail ? `CHIP FULL FAIL ${fail}` : 'CHIP FULL OK'); process.exit(fail ? 1 : 0);
