#!/usr/bin/env node
/* ★★[UX1_1023 2026-10-23 사장님 «음악을 제외한 나머지 추천대로 진행 · 너가 판단해서»(BGM 섹션 전달 · GPT 식순 빌더 검토 다섯)]
   고친 둘을 실렌더로 잰다 — 나머지 셋(예시 칩 눌림 EX_CHIP_ON · 예시 = 바로 채움 REF_START_OFF · CUE_FORM · 식전 영상 한 칸 PV_LINK_ONE · 넘길 때 팝업 LEAVE_POP)은 사장님 결정이라 그대로다.
   ① [UNPICK_LINE] 화촉 «서는 분» · 편지 «받는 분»을 안 골랐으면 칩 아래 한 줄(«아직 고르지 않았어요 · 고르지 않으면 …») · 고르면 걷힌다
   ② [REF_FOLD] 보기만 하는 참고 예시(축사)는 첫 네 줄 남짓 + «예시 전체 보기» · 같은 단추 «예시 접기»로 다시 접고 단추는 화면에서 같은 자리
   ③ 네 줄 안에 드는 예시(1280 성혼 선언)는 단추 없이 그대로 · 다른 예시 칩을 누르면 다시 접힌 모양
   ④ 화면 오류 0
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
const open = async (W) => {
  const pg = await br.newPage({ viewport: { width: W, height: 900 }, hasTouch: W < 500 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(450); };
  await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(900);
  await pg.evaluate(() => { S.on = Object.assign({}, S.on, { letter: 1 }); opSync(); });
  return { pg, errs };
};
const go = (pg, k) => pg.evaluate(async (x) => { try { lsStop(); } catch (e) {} mkGo(x); await new Promise((r) => setTimeout(r, 500)); }, k);
const notes = (pg, lab) => pg.evaluate((lab) => { const c = [...document.querySelectorAll('#stage .ls-cg')].find((x) => x.offsetParent && (x.querySelector('.gl') || {}).textContent === lab); if (!c) return null;
  return [...c.querySelectorAll('.ls-gnote')].filter((x) => x.offsetParent).map((x) => x.textContent.trim()); }, lab);
const fold = (pg, k) => pg.evaluate((k) => { const b = document.getElementById('mkRb_' + k), m = document.querySelector('[data-fk="mkrm:' + k + '"]');
  return { box: !!b, h: b ? Math.round(b.getBoundingClientRect().height) : 0, full: b ? b.scrollHeight : 0, btn: !!(m && m.offsetParent), lab: m ? m.textContent.trim() : '', exp: m ? m.getAttribute('aria-expanded') : '' }; }, k);
try {
  /* ① 안 고른 한 줄 */
  { const { pg, errs } = await open(390);
    for (const [k, lab, want, pick] of [['candle', '서는 분', '아직 고르지 않았어요 · 고르지 않으면 양가 어머님께서 밝혀요', 'lsc:candleWho:fathers'], ['letter', '받는 분', '아직 고르지 않았어요 · 고르지 않으면 서로에게 읽어요', 'lsc:letter:parent']]) {
      await go(pg, k); const n0 = await notes(pg, lab);
      ok(`① ${k} «${lab}» — 안 골랐으면 칩 아래 한 줄 [UNPICK_LINE]`, !!n0 && n0.length === 1 && n0[0] === want, JSON.stringify(n0));
      const b = await pg.$(`[data-fk="${pick}"]`); if (b) { await b.click(); await pg.waitForTimeout(400); if (await pg.evaluate(() => [...document.querySelectorAll('[role=dialog],[role=alertdialog]')].some((d) => d.offsetParent))) { await pg.keyboard.press('Escape'); await pg.waitForTimeout(300); } }
      const n1 = await notes(pg, lab); ok(`① ${k} — 고르면 그 줄이 걷힌다`, !!b && !!n1 && n1.length === 0, JSON.stringify({ btn: !!b, n1 }));
    }
    /* ② 긴 예시 접기 · 펼치기 · 다시 접기 */
    await go(pg, 'free'); const f0 = await fold(pg, 'free');
    ok('② 축사 참고 예시 — 처음엔 첫 네 줄 남짓(160px 안) + «예시 전체 보기» [REF_FOLD]', f0.box && f0.h > 0 && f0.h <= 160 && f0.full > f0.h + 100 && f0.btn && f0.lab === '예시 전체 보기' && f0.exp === 'false', JSON.stringify(f0));
    const y0 = await pg.evaluate(() => { const m = document.querySelector('[data-fk="mkrm:free"]'); if (!m) return null; m.scrollIntoView({ block: 'center' }); m.click(); return null; });
    await pg.waitForTimeout(200); const f1 = await fold(pg, 'free');
    ok('② 누르면 다 펼쳐지고 같은 단추가 «예시 접기»', f1.h >= f1.full - 2 && f1.h > 300 && f1.lab === '예시 접기' && f1.exp === 'true', JSON.stringify(f1));
    const yy = await pg.evaluate(async () => { const m = document.querySelector('[data-fk="mkrm:free"]'); if (!m) return null; m.scrollIntoView({ block: 'center' }); await new Promise((r) => setTimeout(r, 60)); const a = m.getBoundingClientRect().top; m.click(); await new Promise((r) => setTimeout(r, 120)); return [a, m.getBoundingClientRect().top]; });
    const f2 = await fold(pg, 'free');
    ok('② 다시 누르면 접히고 단추는 화면에서 같은 자리(±3px)', f2.h <= 160 && f2.lab === '예시 전체 보기' && !!yy && Math.abs(yy[0] - yy[1]) <= 3, JSON.stringify({ f2, yy }));
    await pg.evaluate(() => { const m = document.querySelector('[data-fk="mkrm:free"]'); if (m) m.click(); }); await pg.waitForTimeout(150);
    const c1 = await pg.$('[data-fk="mkrc:free:1"]'); if (c1) { await c1.click(); await pg.waitForTimeout(400); }
    const f3 = await fold(pg, 'free'); ok('③ 다른 예시 칩을 누르면 다시 접힌 모양', !!c1 && f3.box && f3.lab === '예시 전체 보기' && f3.exp === 'false', JSON.stringify(f3));
    ok('④ 화면 오류 0(390)', errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close(); }
  { const { pg, errs } = await open(1280);
    await go(pg, 'declare'); const d = await fold(pg, 'declare');
    ok('③ 네 줄 안에 드는 예시(1280 성혼 선언)는 단추 없이 그대로', d.box && !d.btn && d.h >= d.full - 2, JSON.stringify(d));
    await go(pg, 'free'); const f = await fold(pg, 'free');
    ok('② 1280 축사 예시도 접힌 모양 + 단추', f.box && f.btn && f.h <= 160, JSON.stringify(f));
    ok('④ 화면 오류 0(1280)', errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close(); }
} catch (e) { console.log('못 쟀다 —', e && e.message); await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `FAIL ${fail}건` : 'ALL OK'); process.exit(fail ? 1 : 0);
