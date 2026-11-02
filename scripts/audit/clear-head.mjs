#!/usr/bin/env node
/* ★[CLEAR_HEAD_1102] 2026-11-02 사장님 아이폰 «위에 ‹식전 1/2› — 모두 비우기 하면 남아 있는 버그»
   하나씩 만들기 · 식전 2쪽 → «모두 비우기» → 고르기로 돌아오면 머리 상태 단추가 보이지 않는다(«식전» · «1/2» 없음) · 걸음 = 고르기 ·
   새로 고침 뒤도 같다 · 다시 고르고 «다음»을 누르면 지운 순간이 아니라 첫 쪽(예식 흐름)부터 · 하나씩 만들기에서 연습하기로 가도 머리 단추가 남지 않는다.
   원인: .mk-status.one(inline-flex)이 .mk-status[hidden] 뒤에 있어 숨김을 이겼다. 390 · 1280. 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.BP_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + JSON.stringify(d)}`); if (!c) fail++; };

for (const w of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, hasTouch: w < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  const st = () => pg.evaluate(() => { const b = document.getElementById('mkStat'), cs = b && getComputedStyle(b), r = b && b.getBoundingClientRect();
    const seen = !!(b && cs.display !== 'none' && cs.visibility !== 'hidden' && r.width > 0 && r.height > 0);
    const on = document.querySelector('.op-steps li.on');
    return { step: STEPS[idx] && STEPS[idx].k, seen, txt: seen ? b.textContent : '', inner: b ? b.textContent : '', on: on ? on.textContent.trim() : '', at: (S.mk || {}).at || '' }; });
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await nx();   /* 하나씩 만들기 */
  const pre = await pg.evaluate(() => _mkPages().filter((k) => _mkNo(k) === '식전'));
  await pg.evaluate((k) => mkGo(k), pre[pre.length - 1]); await pg.waitForTimeout(400);
  const a = await st();
  ok(`${w} 전제 — 하나씩 만들기 식전 마지막 쪽에서 머리 단추가 «식전 ${pre.length}/${pre.length}»`, a.seen && /식전/.test(a.txt), a);
  await pg.evaluate(() => opRestart()); await pg.waitForTimeout(300);
  await pg.click('text=모두 비우기'); await pg.waitForTimeout(600);
  const b = await st();
  ok(`${w} 모두 비우기 → 걸음 = 고르기 · 머리 단추 안 보임 · 글에 «식전» · «/» 없음`, b.step === 'pick' && /고르기/.test(b.on) && !b.seen && !/식전|\d\/\d/.test(b.txt + b.inner), b);
  ok(`${w} 모두 비우기 → 지운 순간 위치 기억 없음(S.mk.at · 펼침 · 이어 보기)`, !b.at && await pg.evaluate(() => !MK.navOpen && !MK.flowKeep && !MK.toastGo), b);
  await pg.reload(); await pg.waitForTimeout(900);
  const c = await st();
  ok(`${w} 새로 고침 뒤도 고르기 · 머리 단추 안 보임`, c.step === 'pick' && !c.seen && !/식전|\d\/\d/.test(c.txt), c);
  /* 다시 고르고 «다음» — 지운 순간(식전 마지막)이 아니라 첫 쪽부터 */
  await pg.click('[data-fk="opx:family"]').catch(() => {}); await pg.waitForTimeout(300);
  await nx();
  const d = await st(), first = await pg.evaluate(() => _mkPages()[0]), cur = await pg.evaluate(() => _mkPages()[_mkIdx()]);
  ok(`${w} 다시 고르고 «다음» → 하나씩 만들기 첫 쪽(${first})부터 · 지운 순간(${pre[pre.length - 1]}) 아님`, d.step === 'listen' && cur === first && cur !== pre[pre.length - 1], { d, cur });
  /* 하나씩 만들기 → 연습하기로 가도 머리 단추가 남지 않는다(같은 CSS 원인) */
  await pg.evaluate(() => { if (window.opGoStep) opGoStep('practice'); }); await pg.waitForTimeout(500);
  const e = await st();
  ok(`${w} 하나씩 만들기 → 연습하기 · 머리 단추 안 보임`, e.step === 'practice' && !e.seen, e);
  ok(`${w} 페이지 오류 0`, !errs.length, errs);
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `CLEAR HEAD FAIL ${fail}` : 'CLEAR HEAD OK'); process.exit(fail ? 1 : 0);
