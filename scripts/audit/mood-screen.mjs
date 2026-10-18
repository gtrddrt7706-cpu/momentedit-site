#!/usr/bin/env node
/* ★[MOOD_1018 · SCRIPT_VIEW_1018 · MOOD_REF_1018 인스타 섹션 검토 7판 67 · 73 · 74] 화면 — 폰 390 · PC 1280
   ★[MOOD_ROW_OFF_1019 2026-10-19 사장님] 칩 줄을 걷었다 — ① 고르기에 «나레이션 분위기» 줄이 없다(코스 카드 · 감동 흐름은 그대로)
   ② 옛 분위기 초안은 고른 예시(S.narEx)를 저장 · 서는 분 · 코스 바꾸기에도 다시 덮어쓰지 않는다
   ③ 연습하기 «글로 한눈에 보기» = ④ 대본 글(scriptTextOpen)을 읽기 전용 창으로
   SHOT=폴더 를 주면 스크린샷을 남긴다 · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SHOT = process.env.SHOT || '';
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { document.body.style.opacity = 1; document.querySelectorAll('.reveal,section').forEach((e) => { e.style.opacity = 1; e.style.contentVisibility = 'visible'; }); });
  /* ★[MOOD_ROW_OFF_1019 2026-10-19 사장님 «나래이션분위기 저거는 빼도될거같아»] 칩 줄은 걷었다 — 이 검사는 «없음»과 «옛 초안이 그대로»를 지킨다 */
  const lay = await pg.evaluate(() => ({ row: !!document.querySelector('.pk-mood'), btn: document.querySelectorAll('[data-fk^="opmood:"]').length, txt: /나레이션 분위기/.test(document.body.innerText), ex: document.querySelectorAll('.pk-exs [data-fk^="opx:"]').length, flow: !!document.getElementById('pkFlow'), over: document.documentElement.scrollWidth > innerWidth + 1 }));
  ok(`${W} ① 고르기 — «나레이션 분위기» 칩 줄 없음 · 코스 카드 넷 · 감동 흐름은 그대로 [MOOD_ROW_OFF_1019]`, !lay.row && lay.btn === 0 && !lay.txt && lay.ex === 4 && lay.flow && !lay.over, JSON.stringify(lay));
  const r1 = await pg.evaluate(async () => { const R = RitualOpen; R.moodApply(S, 'plain'); if (ENG && ENG.RitualCue) ENG.RitualCue.moodFit(S); const n0 = JSON.stringify(S.narEx || {}), e0 = S.entry;
    _persist(); S.candleWho = 'fathers'; _persist(); const n1 = JSON.stringify(S.narEx || {});
    opEx('family'); await new Promise((r) => setTimeout(r, 500)); _persist();
    return { n0, n1, e0, mood: S.mood, entry: S.entry, n2: JSON.stringify(S.narEx || {}), typeOp: typeof window.opMood }; });
  ok(`${W} ② 옛 분위기 초안(S.mood 담백) — 저장 · 서는 분 · 코스를 바꿔도 고른 예시(S.narEx)를 다시 덮어쓰지 않는다 · opMood 없음`, r1.n0 === r1.n1 && r1.mood === 'plain' && r1.typeOp === 'undefined' && !/"candle":1\b/.test(r1.n1) === !/"candle":1\b/.test(r1.n0), JSON.stringify(r1));
  const r5 = await pg.evaluate(async () => { opToListen(); await new Promise((r) => setTimeout(r, 400)); const ps = _mkPages(); mkGo(ps[ps.length - 1]); await new Promise((r) => setTimeout(r, 300));
    return { ok: 1 }; });
  await pg.evaluate(async () => { const i = STEPS.findIndex((x) => x.k === 'practice'); if (i > -1) { idx = i; render(); } await new Promise((r) => setTimeout(r, 600)); });
  await pg.waitForTimeout(500);
  const r6 = await pg.evaluate(async () => { const b = document.querySelector('[data-fk="prsv"]'); if (!b) return { none: 1 }; b.click(); await new Promise((r) => setTimeout(r, 600));
    const d = document.getElementById('mkRecDlg'); if (!d) return { dlg: 0 }; const txt = d.textContent, inputs = d.querySelectorAll('input,textarea,select').length, hs = d.querySelectorAll('.sv-h').length, q = d.querySelectorAll('.sv-q').length;
    const same = scriptTextOpen().split('\n').filter((l) => l.trim() && !/^우리 예식 대본/.test(l)).slice(0, 6).every((l) => txt.replace(/\s/g, '').indexOf(l.replace(/^[^:.!?]{1,40}:\s?/, '').replace(/\s/g, '').slice(0, 20)) > -1);
    return { dlg: 1, inputs, hs, q, same, t: d.querySelector('.mk-dlg-t').textContent }; });
  ok(`${W} ④ ③ «글로 한눈에 보기» → 창(제목 · 순간마다 덩어리 · 사람 구간 회색 · 입력칸 없음 · ④ 대본과 같은 글)`, r6.dlg && r6.t === '글로 한눈에 보기' && r6.inputs === 0 && r6.hs >= 5 && r6.q >= 1 && r6.same, JSON.stringify(r6));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/sv-${W}.png` });
  await pg.evaluate(() => mkDlgClose()); await pg.waitForTimeout(200);
  ok(`${W} 닫으면 창이 사라진다`, await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `MOOD SCREEN FAIL ${fail}` : 'MOOD SCREEN OK'); process.exit(fail ? 1 : 0);
