#!/usr/bin/env node
/* ★[CHIP_FULL_1019 2026-10-19 사장님 «버튼 짝수로 맞추고 · 서약 감사문 저 부분도 버튼 좌우 꽉 차게 개선 · 그 아래 버튼들도»] 폰 390 — ② 하나씩 만들기 칩 줄
   둘 이상이면 같은 폭 칸으로 좌우를 채운다(둘 = 반반 · 넷 = 2 × 2 · 여섯 = 3 × 2) · 혼자 남는 칩이 없다
   ★★[RAIL_IGNORE_1019 2026-10-19 사장님 «우측버튼레일은 신경쓰지마 무시하고 폭넓게 다시만들기»] 오른쪽 끝까지 — 상담 말풍선(레일) 자리를 비우지 않는다(종전 36px 비우기는 걷었다 · 말풍선이 얹혀도 괜찮다)
   ① 예시 카드 흐름 선 · ② 칩 줄 · ④ 완성 단추 덩어리 · 순서 요약 «변경 · 채우기»를 잰다 · 모양 검사(어느 자리든)는 rail-ignore.mjs
   ★★[CHIP_GRID_PC_1019] PC 1280 은 6칸 격자 · 좁은 태블릿 768 은 같은 폭 칸도 잰다(아래)
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
/* ★★[CHIP_GRID_PC_1019 2026-10-19 사장님 «pc버전도 버튼 형태 좀 정렬 깔끔하게 크기를 조절해서 하고싶어»] PC 1280 = 6칸 격자(한 줄 · 같은 크기 · 칸 선이 줄끼리 맞는다)
   고를 것 둘 · 셋 = 두 칸 · 멘트 넷 ~ 여섯 = 한 칸 · «나레이션 자세히»는 같은 줄 오른쪽 끝 / 좁은 태블릿 768 = 폰처럼 같은 폭 칸(혼자 남는 칩 없음) */
for (const PW of [1280, 768]) {
  const p2 = await br.newPage({ viewport: { width: PW, height: 900 } }); const e2 = []; p2.on('pageerror', (e) => e2.push(e.message));
  await p2.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await p2.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await p2.waitForTimeout(700);
  const nx2 = async () => { if (await p2.isVisible('#next')) await p2.click('#next'); else await p2.click('.pk-go'); await p2.waitForTimeout(450); };
  await nx2(); await nx2(); await p2.click('[data-fk="opx:standard"]'); await p2.waitForTimeout(300); await nx2(); await p2.waitForTimeout(900);
  await p2.evaluate(() => { window._vc = function (op) { if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true }, bride: { consent: true, ready: true }, per: {} }); return Promise.resolve({ ok: false }); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.on.vow = 1; S.vow = 'ok'; S.guestVoice = 'nar'; S.entryVoice = 'nar'; });
  for (const k of ['guest', 'vow', 'entry', 'tribute']) {
    const r = await p2.evaluate(async (k) => { mkGo(k); await new Promise((r) => setTimeout(r, 600)); const b0 = [...document.querySelectorAll('.ls-cg .cg-c button')].find((x) => x.offsetParent && x.textContent.trim() === '스튜디오 나레이션' && x.getAttribute('aria-checked') !== 'true'); if (b0) { b0.click(); await new Promise((r) => setTimeout(r, 600)); }
      return [...document.querySelectorAll('.ls-cg .cg-c')].filter((c) => c.offsetParent).map((c) => { const bs = [...c.children].filter((x) => x.tagName === 'BUTTON' && x.offsetParent && x.classList.contains('op-chip')); if (bs.length < 2) return null;
        const cr = c.getBoundingClientRect(), cw = (cr.width - 30) / 6, rs = bs.map((x) => x.getBoundingClientRect()), lines = {}; rs.forEach((q) => { const t = Math.round(q.top); lines[t] = (lines[t] || 0) + 1; });
        const ws = rs.map((q) => q.width), unit = cw + 6, lk = c.querySelector(':scope>.cg-links'), lr = lk && lk.offsetParent ? lk.getBoundingClientRect() : null;
        return { g: ((c.parentElement.querySelector('.gl') || {}).textContent || '').slice(0, 8), n: bs.length, grid: c.classList.contains('cg-grid'), even: c.classList.contains('cg-even'), nl: Object.keys(lines).length, lone: Object.values(lines).some((v) => v === 1),
          same: Math.max(...ws) - Math.min(...ws) <= 1, cells: Math.round((ws[0] + 6) / unit), onGrid: rs.every((q) => { const o = (q.left - cr.left) / unit; return Math.abs(o - Math.round(o)) * unit <= 1.5; }), fitW: Math.abs(ws[0] - (Math.round((ws[0] + 6) / unit) * unit - 6)) <= 1.5,
          lkSame: lr ? Math.abs(lr.top - rs[0].top) < rs[0].height && Math.abs(lr.right - cr.right) <= 2 : null }; }).filter(Boolean); }, k);
    const bad = r.filter((x) => PW >= 1000 ? (!x.grid || x.nl !== 1 || !x.same || !x.onGrid || !x.fitW || (x.n >= 4 ? x.cells !== 1 : x.cells < 2) || x.lkSame === false) : (x.grid ? (!x.same || !x.onGrid || !x.fitW) : (!x.even || x.lone || !x.same)));   // [TONE_FOLD_1023] 말투 칩이 접힌 쪽은 768 에서도 6칸 격자에 선다(_cgEven 이 쪽 전체로 고른다) — 격자면 같은 폭 · 칸 선만 본다
    ok(PW >= 1000 ? `${PW} ${k} — PC 칩 줄 6칸 격자(한 줄 · 같은 크기 · 칸 선 맞춤 · 고를 것 두 칸 · 멘트 한 칸 · 링크 같은 줄 끝) [CHIP_GRID_PC_1019]` : `${PW} ${k} — 좁은 태블릿 칩 줄 같은 폭 칸(혼자 남는 칩 없음) [CHIP_GRID_PC_1019]`, r.length > 0 && !bad.length, JSON.stringify(bad.length ? bad : r).slice(0, 600));
  }
  if (PW >= 1000) {   /* ★[LINK_ONE_LINE_1019 · MU_REDRAW_EVEN_1019 2026-10-19 사장님 «버튼 옆에 · 2줄은 이상 · 문구를 줄여 한 줄로» · «추천 곡 누르면 버튼이 작아지는 현상»] AI 를 고른 판(링크가 둘)도 잰다 — 위 쪽마다 검사는 스튜디오 나레이션 판(링크 하나)만 봤다 */
    await p2.evaluate(async () => { mkGo('entry'); await new Promise((r) => setTimeout(r, 600)); window.scrollTo(0, 0); });
    const aiB = await p2.evaluateHandle(() => [...document.querySelectorAll('.ls-cg .cg-c>button')].find((x) => x.offsetParent && x.textContent.trim() === 'AI 두 분 목소리') || null);
    if (aiB.asElement()) { await aiB.asElement().click(); await p2.waitForTimeout(600); if (await p2.isVisible('[data-fk="mkkeepok"]')) { await p2.click('[data-fk="mkkeepok"]'); await p2.waitForTimeout(300); } }
    const lk = await p2.evaluate(() => { const c = [...document.querySelectorAll('.ls-cg .cg-c')].find((x) => x.offsetParent && x.querySelector(':scope>.cg-links')); if (!c) return null; const cr = c.getBoundingClientRect(), bs = [...c.children].filter((x) => x.tagName === 'BUTTON' && x.offsetParent).map((x) => x.getBoundingClientRect());
      const ls = [...c.querySelector(':scope>.cg-links').children].filter((a) => a.offsetParent).map((a) => { const q = a.getBoundingClientRect(); return { t: a.textContent.trim(), top: Math.round(q.top - bs[0].top), b: Math.round(q.bottom - bs[0].bottom) }; });
      return { n: ls.length, ls, one: ls.every((q) => Math.abs(q.top) <= 2 && Math.abs(q.b) <= 2), rowH: Math.round(cr.height), chipH: Math.round(bs[0].height), endR: Math.abs(c.querySelector(':scope>.cg-links').getBoundingClientRect().right - cr.right) <= 2, kt: ls.some((q) => q.t === '확정 안내') }; });
    ok(`${PW} entry · AI 고른 판 — «확정 안내 · 나레이션 자세히» 둘이 칩과 같은 줄 · 한 줄 · 오른쪽 끝(제 줄 · 두 줄로 내려가지 않는다) [LINK_ONE_LINE_1019]`, !!lk && lk.n === 2 && lk.kt && lk.one && lk.rowH === lk.chipH && lk.endR, JSON.stringify(lk));
    const mu = await p2.evaluate(() => { const c0 = document.querySelector('.ls-mu .cg-c.mu-src'); if (!c0) return null; const w = (c) => [...c.querySelectorAll(':scope>button')].map((b) => Math.round(b.getBoundingClientRect().width)).join('/');
      const before = w(c0), b = [...c0.querySelectorAll(':scope>button')].find((x) => x.textContent.trim() === '스튜디오가 고른 곡'); if (!b) return { before }; b.click(); const c1 = document.querySelector('.ls-mu .cg-c.mu-src'); return { before, at0: w(c1), replaced: c1 !== c0, grid: c1.classList.contains('cg-grid') }; });
    ok(`${PW} entry · «추천 곡»을 누른 그 순간에도 칩 크기 그대로(줄을 새로 끼우면 그 자리에서 칸 맞춤) [MU_REDRAW_EVEN_1019]`, !!mu && !!mu.at0 && mu.before === mu.at0 && mu.grid, JSON.stringify(mu));
  }
  ok(`${PW} 화면 오류 없음`, !e2.length, e2.slice(0, 2).join(' | ')); await p2.close();
}
await br.close(); srv.close();
console.log(fail ? `CHIP FULL FAIL ${fail}` : 'CHIP FULL OK'); process.exit(fail ? 1 : 0);
