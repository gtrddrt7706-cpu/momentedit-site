#!/usr/bin/env node
/* ★[TAP_NO_RING 2026-10-23 사장님 «엑스표 주변 색 들어가 있는 거 개선»] 순간 미리 보기 창이 열리면 스크립트가 × 로 초점을 옮기는데,
   폰(손가락)에서는 그 초점에 금색 고리를 그리지 않는다 · 키보드로 옮겨 다니면 고리가 돌아온다 · 키보드만 쓰는 분은 처음부터 고리.
   1 손가락으로 칸을 눌러 창을 연다 → 초점은 × · 고리 없음(outline none) · html.tap-mode
   2 그 상태에서 Tab → tap-mode 풀림 · 초점 단추에 고리(2px)
   3 창을 닫으면 초점이 칸으로 돌아간다 — 손가락이면 칸 둘레 고리 없음
   4 키보드만(누른 적 없음) — 창을 열면 × 에 고리 2px
   390(손가락) · 1280(마우스 = 3 만). 종료 코드 0 통과 · 1 실패 · 2 재지 못함. TN_OP = 돌연변이 확인용(그 판의 order-preview 로 잰다) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.TN_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('skip tap-no-ring: 브라우저가 없어 재지 못함'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('skip tap-no-ring: 브라우저 ' + e.message); srv.close(); process.exit(2); }
const ring = (pg) => pg.evaluate(() => { const a = document.activeElement, cs = a ? getComputedStyle(a) : null, tile = a && a.closest && a.closest('.pk-tile'), ts = tile ? getComputedStyle(tile) : null;
  return { fk: a && a.getAttribute && (a.getAttribute('data-fk') || a.className), fv: !!(a && a.matches && a.matches(':focus-visible')), ow: cs ? cs.outlineStyle + ' ' + cs.outlineWidth : '', tile: ts ? ts.outlineStyle + ' ' + ts.outlineWidth : '', tap: document.documentElement.classList.contains('tap-mode'), open: !!(document.getElementById('pvSheet') && !document.getElementById('pvSheet').hidden) }; });
const drawn = (s) => /^solid 2px/.test(s);
const toPick = async (pg) => { for (let i = 0; i < 2; i++) { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); } await pg.waitForTimeout(400); };
try {
  { const ctx = await br.newContext({ viewport: { width: 390, height: 900 }, hasTouch: true, isMobile: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
    await pg.tap('#next').catch(() => pg.click('#next')); await pg.waitForTimeout(500); if (await pg.isVisible('#next')) await pg.tap('#next'); else await pg.tap('.pk-go'); await pg.waitForTimeout(700);
    const sel = await pg.evaluate(() => { const b = [...document.querySelectorAll('.pk-open[data-fk^="pto:"]')].find((x) => x.offsetParent); return b ? '[data-fk="' + b.getAttribute('data-fk') + '"]' : ''; });
    await pg.locator(sel).scrollIntoViewIfNeeded().catch(() => {}); await pg.tap(sel); await pg.waitForTimeout(600);
    const R1 = await ring(pg);
    ok(`390 1 손가락으로 칸(${sel})을 눌러 창을 열면 초점은 × · 고리 없음(${R1.ow}) · tap-mode`, R1.open && R1.fk === 'pv-x' && R1.tap && !drawn(R1.ow), R1);
    await pg.keyboard.press('Tab'); await pg.waitForTimeout(150);
    const R2 = await ring(pg);
    ok(`390 2 그 상태에서 Tab → tap-mode 풀림 · 초점 단추에 고리(${R2.ow})`, !R2.tap && R2.fv && drawn(R2.ow), R2);
    await pg.tap('.pv-x'); await pg.waitForTimeout(600);
    const R3 = await ring(pg);
    ok(`390 3 손가락으로 × 를 눌러 닫으면 초점이 칸으로 돌아가도 칸 둘레 고리 없음(${R3.ow} · 칸 ${R3.tile})`, !R3.open && R3.tap && /^pto:/.test(R3.fk || '') && !drawn(R3.ow) && !drawn(R3.tile), R3);
    /* 1b 아이폰 흉내 — 크롬은 손가락 뒤 스크립트 초점에 :focus-visible 을 안 켜서 위 1 · 3 은 고친 줄 없이도 초록이다(실측).
       아이폰(WebKit)은 켠다(사장님 스크린샷). 그래서 키보드로 :focus-visible 을 켜 둔 채 손가락 표시(tap-mode)만 세우고 열어 본다 — 고리 조건이 켜져도 그리지 않아야 한다 */
    await pg.keyboard.press('Tab'); await pg.evaluate(() => { document.activeElement && document.activeElement.blur && document.activeElement.blur(); document.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true })); });
    const k1 = (sel.match(/pto:([^"]+)/) || [])[1]; await pg.evaluate((k) => opPv(k), k1); await pg.waitForTimeout(500);
    const R1b = await ring(pg);
    ok(`390 1b 아이폰 흉내 — :focus-visible 이 켜졌어도(${R1b.fv}) 손가락이면 × 고리 없음(${R1b.ow})`, R1b.open && R1b.fk === 'pv-x' && R1b.fv && R1b.tap && !drawn(R1b.ow), R1b);
    await pg.evaluate(() => opPvClose()); await pg.waitForTimeout(500);
    const R3b = await ring(pg);
    ok(`390 3b 아이폰 흉내 — 닫고 칸으로 돌아가도 칸 둘레 고리 없음(${R3b.tile})`, !R3b.open && R3b.fv && R3b.tap && !drawn(R3b.ow) && !drawn(R3b.tile), R3b);
    ok('390 페이지 오류 없음', errs.length === 0, errs);
    await ctx.close(); }
  { const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage();
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
    await pg.evaluate(() => { try { opStepNav('pick'); } catch (e) {} }); await pg.waitForTimeout(500);
    const k = await pg.evaluate(() => { const b = [...document.querySelectorAll('.pk-open[data-fk^="pto:"]')].find((x) => x.offsetParent); return b ? b.getAttribute('data-fk').slice(4) : ''; });
    if (!k) { await toPick(pg); }
    const k2 = k || await pg.evaluate(() => { const b = [...document.querySelectorAll('.pk-open[data-fk^="pto:"]')].find((x) => x.offsetParent); return b ? b.getAttribute('data-fk').slice(4) : ''; });
    await pg.keyboard.press('Tab'); await pg.evaluate((k) => opPv(k), k2); await pg.waitForTimeout(500);
    const R4 = await ring(pg);
    ok(`1280 4 키보드만(누른 적 없음) — 창을 열면 × 에 고리(${R4.ow})`, R4.open && R4.fk === 'pv-x' && !R4.tap && drawn(R4.ow), R4);
    await ctx.close(); }
} finally { await br.close(); srv.close(); }
console.log(fail ? `tap-no-ring: FAIL ${fail}` : 'tap-no-ring: ok');
process.exit(fail ? 1 : 0);
