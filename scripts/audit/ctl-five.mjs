#!/usr/bin/env node
/* ★[CTL_FIVE 2026-10-05 사장님 «하단 플레이 단추가 왔다 갔다 이동한다 · 고정으로 전부 두고 못 누르는 건 투명 처리?» → «추천대로»] 실브라우저 시험(390 · 1280)
   보는 것: 크게 보기 아래 줄은 늘 다섯 칸(⏮ ‹ ❚❚ › ⏭) · 줄을 넘겨도 ❚❚ 자리가 그대로 · 못 누르는 칸은 disabled + 흐리게 · 작은 플레이어도 다섯 칸 · 폰에서 넘치지 않는다
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch { try { br = await pw.chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(1600);
  // 크게 보기 · 한 순간(여러 줄)
  await pg.evaluate(() => { lsBig('vow'); }); await pg.waitForTimeout(700);
  const xs = [], st = [];
  for (let n = 0; n < 4; n++) {
    const m = await pg.evaluate(() => { const c = document.querySelector('#lsFull .lf-ctl'); if (!c) return null; const bs = [...c.querySelectorAll('button')]; const t = c.querySelector('[data-fk="lftog"]').getBoundingClientRect(); return { n: bs.length, x: Math.round(t.left + t.width / 2), dis: bs.filter((b) => b.disabled).map((b) => b.getAttribute('data-fk')).join(','), op: bs.filter((b) => b.disabled).map((b) => getComputedStyle(b).opacity).join(',') }; });
    if (m) { xs.push(m.x); st.push(m); }
    await pg.evaluate(() => { try { lsLine(1); LP.paused = true; } catch (e) {} }); await pg.waitForTimeout(250);
  }
  if (process.env.SHOT) { await pg.evaluate(() => { lsBig('vow'); }); await pg.waitForTimeout(600); await pg.screenshot({ path: process.env.SHOT + '-' + W + '.png', clip: { x: 0, y: 844 - 110, width: W, height: 110 } }); await pg.evaluate(() => lsCloseBig()); await pg.waitForTimeout(200); await pg.evaluate(() => { lsBig('vow'); }); await pg.waitForTimeout(300); }
  ok(W + ' 크게 보기 아래 줄은 늘 다섯 칸 [CTL_FIVE]', st.length > 1 && st.every((m) => m.n === 5), JSON.stringify(st));
  ok(W + ' 줄을 넘겨도 ❚❚ 자리가 그대로', new Set(xs).size === 1, JSON.stringify(xs));
  ok(W + ' 한 순간만 들을 때 ⏮ ⏭ 는 흐리게(disabled · 0.3)', st.every((m) => /lfprev(,|$)/.test(m.dis) && /lfnext(,|$)/.test(m.dis) && m.op.split(',').every((o) => o === '0.3')), JSON.stringify(st));
  await pg.evaluate(() => lsCloseBig()); await pg.waitForTimeout(300);
  // 작은 플레이어 — 그리게 해서 단추 수 · 넘침
  const mini = await pg.evaluate(() => new Promise((res) => { LP.big = false; _lStart(['vow'], false); setTimeout(() => { const el = document.getElementById('lsMini'); el.style.display = 'flex'; try { _lPaint(); } catch (e) {} const bs = el ? [...el.querySelectorAll('.lm-b')] : []; const tog = el && el.querySelector('[data-fk="lmtog"]'); const r = el ? el.getBoundingClientRect() : {}; res({ n: bs.filter((b) => b.getAttribute('data-fk') !== 'lmx').length, dis: bs.filter((b) => b.disabled).length, over: el ? el.scrollWidth - el.clientWidth : -1, right: Math.round(r.right || 0), w: innerWidth, tog: !!tog }); lsStop(); }, 500); }));
  ok(W + ' 작은 플레이어도 다섯 칸(× 빼고) · 넘치지 않는다', mini.n === 5 && mini.over <= 1 && mini.right <= mini.w, JSON.stringify(mini));
  ok(W + ' pageerror 0', errs.length === 0, errs.join(' | ').slice(0, 300));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? '\nCTL_FIVE FAIL ' + fail : '\nCTL_FIVE OK'); process.exit(fail ? 1 : 0);
