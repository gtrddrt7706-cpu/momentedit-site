#!/usr/bin/env node
/* ★★[FLOW_THREAD 2026-10-07 사장님 «이런 상황에서 이런 멘트가 나오고 그다음 이런 액션이 있구나 한눈에 · 다른 곳들도 · 여기서 정하고 일괄 수정» → 시안 A «흐름선»]
   ② 순간 쪽 흐름(.mk-flow)을 390 · 1280 실렌더로 잰다 — 화촉(멘트 · 행동 · 멘트) · 부모님께 인사(행동 · 차례 둘 · 멘트 둘) · 축배(차례 · 한마디) · 케이크(행동으로 끝남) · 식전 영상(넘기는 자리)
   ① 세 갈래(▶ 나레이션 · ● 행동 · ○ 직접 말하는 차례) 글 왼끝이 한 세로선(±1px)
   ② 마디 가운데가 한 세로선(±1.5px) — ▶ 원 · ● 점 · ○ 테
   ③ 흐름선 — 줄 사이 틈 0 · 첫 마디에서 시작 · 마지막 마디에서 멈춘다
   ④ 행동 줄 = 먹빛 16px · ● 점은 금빛 짙은(#7A5F37) · 차례 줄 ○ = 속이 빈 테
   ⑤ 끝의 «말 없이» · «미리 듣기에서는 넘겨요» = 작은 표(.mk-qt) · 행동 글에는 안 남는다
   ⑥ 화면 오류 0
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저를 못 띄움', e && e.message); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const KS = ['candle', 'tribute', 'toast', 'cake', 'prevideo'];
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
    const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
    await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
    await pg.evaluate(() => { const R = RitualOpen; R.ORDER.forEach((k) => { if (!R.ALWAYS[k]) S.on[k] = 1; }); opSync(); });
    await nx(); await pg.waitForTimeout(1500);
    await pg.evaluate(() => { try { engine(); } catch (e) {} }); await pg.waitForTimeout(900);
    for (const k of KS) {
      await pg.evaluate((k) => { try { lsStop(); } catch (e) {} mkGo(k); }, k); await pg.waitForTimeout(450);
      const d = await pg.evaluate(() => {
        const ol = document.querySelector('.mk-pg .mk-flow'); if (!ol) return null;
        const lis = [...ol.children], px = (v) => parseFloat(v) || 0;
        const rows = lis.map((li) => { const r = li.getBoundingClientRect(), c = li.className, af = getComputedStyle(li, '::after'), bf = getComputedStyle(li, '::before');
          let tx = null, node = null;
          if (c === 'n') { const sp = li.querySelector(':scope > span'), sv = li.querySelector('.mk-pl svg'); tx = sp && sp.getBoundingClientRect().left; if (sv) { const s = sv.getBoundingClientRect(); node = s.left + s.width / 2; } }
          else { const t = li.querySelector(c === 'q' ? '.qa' : 'b'); tx = t && t.getBoundingClientRect().left; node = r.left + px(af.left) + px(af.width) / 2; }
          return { c, tx, node, color: getComputedStyle(li).color, fs: getComputedStyle(li).fontSize, afBg: af.backgroundColor, afBd: af.borderTopColor, afCt: af.content, bfW: bf.width, bfTop: bf.top, bfH: bf.height, bfDisp: bf.display, top: r.top, bottom: r.bottom,
            qa: (li.querySelector('.qa') || {}).textContent || '', qt: (li.querySelector('.mk-qt') || {}).textContent || '' }; });
        return { gap: getComputedStyle(ol).rowGap, rows };
      });
      if (!d) { ok(`${w} ${k} 흐름 칸이 있다`, false); continue; }
      const R = d.rows, xs = R.map((r) => r.tx).filter((v) => v != null), ns = R.map((r) => r.node).filter((v) => v != null);
      ok(`${w} ${k} ① 세 갈래 글 왼끝 한 세로선 (${[...new Set(R.map((r) => r.c))].join('·')})`, xs.length === R.length && Math.max(...xs) - Math.min(...xs) <= 1, xs.map((v) => v.toFixed(1)).join(','));
      ok(`${w} ${k} ② 마디 가운데 한 세로선`, ns.length === R.length && Math.max(...ns) - Math.min(...ns) <= 1.5, ns.map((v) => v.toFixed(1)).join(','));
      const cont = R.every((r, i) => i === 0 || Math.abs(r.top - R[i - 1].bottom) <= 0.5);
      const first = R[0], last = R[R.length - 1];
      ok(`${w} ${k} ③ 흐름선 — 줄 사이 틈 0 · 선 1px · 첫 마디에서 시작 · 마지막 마디에서 멈춤`, d.gap === '0px' && cont && R.length > 1 && R.every((r) => r.bfW === '1px')
        && first.bfTop === (first.c === 'n' ? '19px' : '13px') && last.bfH === (last.c === 'n' ? '19px' : '13px'), JSON.stringify({ gap: d.gap, cont, f: [first.c, first.bfTop], l: [last.c, last.bfH] }));
      R.filter((r) => r.c === 'q').forEach((r) => ok(`${w} ${k} ④ 행동 줄 먹빛 16px · ● 금빛 짙은 «${r.qa.slice(0, 14)}»`, r.color === 'rgb(58, 45, 34)' && r.fs === '16px' && r.afBg === 'rgb(122, 95, 55)', [r.color, r.fs, r.afBg].join(' ')));
      R.filter((r) => r.c === 't').forEach((r) => ok(`${w} ${k} ④ 차례 줄 ○ 속이 빈 테`, r.afBd === 'rgb(122, 95, 55)' && r.afBg === 'rgb(250, 250, 248)', [r.afBd, r.afBg].join(' ')));
      if (k === 'candle') ok(`${w} ${k} ⑤ «말 없이» = 작은 표 · 행동 글에는 없다`, R.some((r) => r.c === 'q' && r.qt.replace(/\s|·/g, '') === '말없이' && !/말 없이/.test(r.qa)), JSON.stringify(R.filter((r) => r.c === 'q').map((r) => [r.qa, r.qt])));
      if (k === 'prevideo') ok(`${w} ${k} ⑤ «미리 듣기에서는 넘겨요» = 작은 표`, R.some((r) => r.c === 'q' && /미리 듣기에서는 넘겨요/.test(r.qt) && !/미리 듣기/.test(r.qa)), JSON.stringify(R.filter((r) => r.c === 'q').map((r) => [r.qa, r.qt])));
    }
    ok(`${w} ⑥ 화면 오류 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nFLOW THREAD FAIL ${fail}` : '\nFLOW THREAD OK'); process.exit(fail ? 1 : 0);
