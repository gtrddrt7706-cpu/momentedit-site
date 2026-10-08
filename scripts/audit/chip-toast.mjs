#!/usr/bin/env node
/* ★★[CHIP_TOAST · CHIP_FEW_WORDS · TOAST_BROWN · TOAST_PILL · TOAST_SHORT 2026-10-08 사장님]
   «아래 안내 글이 바뀌었어요랑 밑에 글 부분 바탕이 변하는 효과 · 전부 삭제하고 · 첫 번째 사진처럼 안내 문구 · 바탕색이 너무 진하니깐 디자이너 시선으로»
   «단어 몇 개만 바뀌면 고객이 뭐가 바뀌었나 헷갈릴 거 같아서 · 확실하게 바뀌었다는 걸 · 다른 이벤트들 써먹을 만한 곳들도»
   «테두리가 좀 무거운데 사진처럼 테두리 없이 라운드로 · 요약해서 짧게 안내» · «색상 그 아래 브라운 저 색이랑 같이 하는 게 좋겠다»
   진짜 식순 화면(order-preview.html) · 진짜 칩을 손가락으로 누른다 · 320 · 390 · 1280
   1 ② 작은 바뀜(화촉 «양가 어머님 → 양가 아버님») — 떠 있는 안내 «‹양가 아버님›으로 바꿨어요» 한 줄 · 아래 막대 8px 위 · 화면 안 · 3초 뒤 닫힘 · 읽어 주기(#lsLive)
     칩 줄 아래 한 줄(.ls-chg) · 바뀐 줄 바탕(.chg) 없음 · 모양 = «다음» 단추 브라운(#4E3F31) · 흰 글 · 테두리 없음 · 알약(999px)
   2 ② 큰 바뀜(입장 멘트 · 성혼 선언 말투)은 말하지 않는다
   3 ② 줄 수가 바뀌는 작은 바뀜도 알린다 — 서약 «각자 차례로»(로로 겹침 없이) · 부모님께 인사 «말 없이»
   4 크게 보기의 칩도 같은 안내 — 그 화면 재생 단추 줄 8px 위 · 크게 보기 위에 뜬다
   5 다른 떠 있는 알림도 같은 모양 — ① 예시 알림(#pkUndo) · window.toast
   6 안 고른 기본 칩을 처음 고르면(글이 그대로) 말하지 않는다 — «»가 굵은 글씨로 바뀌는 틈(GUIL_OFF)을 «바뀜»으로 읽은 헛알림(입장 «이야기처럼») 재발 방지
   CT_OP=<order-preview.html 경로>(그 판으로 잰다 — 돌연변이 확인용)  VERBOSE=1
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.CT_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const VERB = !!process.env.VERBOSE;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${(c && !VERB) || d === undefined ? '' : ' → ' + JSON.stringify(d)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const BROWN = 'rgb(78, 63, 49)', WHITE = 'rgb(255, 255, 255)';   // [TOAST_BROWN] 아래 막대 «다음» 단추(.btn-next #4E3F31)와 같은 브라운 · 흰 글

async function open(W) {
  const ctx = await br.newContext({ viewport: { width: W, height: W < 1000 ? 844 : 900 }, deviceScaleFactor: 1 });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(BASE + '/order-preview.html', { waitUntil: 'load' }); await wait(600);
  return { ctx, pg, errs };
}
async function toMake(pg) {
  await pg.evaluate(() => { const R = RitualOpen; S.on = S.on || {}; R.ORDER.forEach((k) => { S.on[k] = 1; }); courseStarted = true; buildSteps();
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'make') { idx = i; render(); break; } });
  await wait(400);
}
async function go(pg, k) { await pg.evaluate((k) => mkGo(k), k); await wait(450); }
async function quiet(pg) { await pg.evaluate(() => { const u = document.getElementById('lsToast'); if (u) { u.hidden = true; u.innerHTML = ''; } }); }
async function tap(pg, sel) { const l = pg.locator(sel).first(); await l.scrollIntoViewIfNeeded(); await l.click(); await wait(350); }
const TOAST = () => { const u = document.getElementById('lsToast'); if (!u || u.hidden) return { shown: false, text: '' };
  const r = u.getBoundingClientRect(), cs = getComputedStyle(u), sp = u.querySelector('span'), lh = sp ? parseFloat(getComputedStyle(sp).lineHeight) || 18 : 18;
  return { shown: true, text: u.textContent, live: ((document.getElementById('lsLive') || {}).textContent || '').trim(), bg: cs.backgroundColor, fg: cs.color, bw: cs.borderTopWidth, rad: cs.borderRadius,
    left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, lines: sp ? Math.round(sp.getBoundingClientRect().height / lh) : 0, bottom: r.bottom,
    inline: document.querySelectorAll('#stage .ls-chg').length, chg: document.querySelectorAll('#stage .chg').length }; };

for (const W of [320, 390, 1280]) {
  const { ctx, pg, errs } = await open(W);
  await toMake(pg); await go(pg, 'candle');
  // 1 — 작은 바뀜
  await tap(pg, '#stage [data-fk="lsc:candleWho:mothers"]'); await quiet(pg);
  await tap(pg, '#stage [data-fk="lsc:candleWho:fathers"]');
  const a = await pg.evaluate(TOAST); const navTop = await pg.evaluate(() => document.getElementById('nav').getBoundingClientRect().top);
  ok(`${W} 1 화촉 «양가 아버님» → 떠 있는 안내 «‹양가 아버님›으로 바꿨어요» [CHIP_TOAST · TOAST_SHORT]`, a.shown && a.text === '‹양가 아버님›으로 바꿨어요' && a.live === a.text, a);
  ok(`${W} 1 한 줄 · 화면 안 · 아래 막대 8px 위 [CHIP_TOAST]`, a.shown && a.lines === 1 && a.left >= 0 && a.right <= a.vw && Math.abs(Math.round(navTop - a.bottom) - 8) <= 1, { lines: a.lines, left: a.left, right: a.right, gap: Math.round(navTop - a.bottom) });
  ok(`${W} 1 «다음» 단추 브라운 · 흰 글 · 테두리 없음 · 알약 [TOAST_BROWN · TOAST_PILL]`, a.bg === BROWN && a.fg === WHITE && a.bw === '0px' && a.rad === '999px', { bg: a.bg, fg: a.fg, bw: a.bw, rad: a.rad });
  ok(`${W} 1 칩 줄 아래 한 줄 · 바뀐 줄 바탕 없음(사용자 지시로 삭제)`, a.inline === 0 && a.chg === 0, { inline: a.inline, chg: a.chg });
  await wait(3200); ok(`${W} 1 3초 뒤 닫힘`, !(await pg.evaluate(TOAST)).shown);
  if (W === 390) {
    // 2 — 큰 바뀜은 말하지 않는다
    for (const [k, pre] of [['entry', 'lsc:entry:'], ['declare', 'lsc:declare:']]) {
      await go(pg, k); await quiet(pg);
      const pick = await pg.evaluate((pre) => { const bs = [...document.querySelectorAll('#stage [data-fk^="' + pre + '"]')]; const off = bs.find((b) => b.getAttribute('aria-checked') !== 'true'); return off ? off.getAttribute('data-fk') : null; }, pre);
      if (pick) await tap(pg, `#stage [data-fk="${pick}"]`);
      const b = await pg.evaluate(TOAST);
      ok(`390 2 ${k} 칩(${pick}) — 글이 통째로 바뀌면 말하지 않는다 [CHIP_FEW_WORDS]`, !!pick && !b.shown, { pick, b });
    }
    // 3 — 줄 수가 바뀌는 작은 바뀜
    for (const [k, want] of [['vow', '‹각자 차례로› 바꿨어요'], ['tribute', '‹말 없이›로 바꿨어요']]) {
      await go(pg, k); await quiet(pg);
      const real = await pg.evaluate(([k, want]) => { const g = _lGroups(k).find((g) => g.list.some((x) => want.indexOf('‹' + x[1] + '›') === 0)); const x = g && g.list.find((x) => want.indexOf('‹' + x[1] + '›') === 0); return g && x ? 'lsc:' + g.key + ':' + x[0] : null; }, [k, want]);
      if (real) await tap(pg, `#stage [data-fk="${real}"]`);
      const c = await pg.evaluate(TOAST);
      ok(`390 3 ${k} «${want}» — 줄 수가 바뀌어도 단어 몇 개면 알린다 [CHIP_FEW_WORDS]`, !!real && c.shown && c.text === want, { real, c });
      await quiet(pg);
    }
  }
  if (W !== 320) {
    // 4 — 크게 보기
    await go(pg, 'candle'); await pg.evaluate(() => lsBig('candle')); await wait(600); await quiet(pg);
    await tap(pg, '#lsFull [data-fk="lfc:candleWho:parents"]');
    const d = await pg.evaluate(() => { const t = (function () { const u = document.getElementById('lsToast'); return u && !u.hidden ? u : null; })(); const ctl = document.querySelector('#lsFull .lf-ctl');
      if (!t || !ctl) return { shown: !!t, ctl: !!ctl }; const r = t.getBoundingClientRect(); t.style.pointerEvents = 'auto'; const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); t.style.pointerEvents = '';
      return { shown: true, text: t.textContent, gap: Math.round(ctl.getBoundingClientRect().top - r.bottom), onTop: !!(top && t.contains(top)) }; });
    ok(`${W} 4 크게 보기 칩 «양가 부모님 네 분» → 같은 안내 · 재생 단추 줄 8px 위 · 크게 보기 위 [CHIP_TOAST]`, d.shown && d.text === '‹양가 부모님 네 분›으로 바꿨어요' && Math.abs(d.gap - 8) <= 1 && d.onTop, d);
    await pg.evaluate(() => lsCloseBig()); await wait(300);
  }
  if (W === 390) {
    // 5 — 다른 떠 있는 알림도 같은 모양
    const e = await pg.evaluate(() => { window.toast('확인용 알림'); const t = document.getElementById('_toast'), cs = getComputedStyle(t), nb = document.querySelector('.btn-next'); return { bg: cs.backgroundColor, fg: cs.color, bw: cs.borderTopWidth, rad: cs.borderRadius, next: nb ? getComputedStyle(nb).backgroundColor : '' }; });
    ok('390 5 window.toast — «다음» 단추와 같은 브라운 · 흰 글 · 테두리 없음 · 알약 [TOAST_BROWN · TOAST_PILL]', e.bg === BROWN && e.fg === WHITE && e.bw === '0px' && e.rad === '999px' && e.next === BROWN, e);
    await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'pick') { idx = i; render(); break; } }); await wait(400);
    const f = await pg.evaluate(() => { opEx('promise'); const u = document.getElementById('pkUndo'), cs = getComputedStyle(u); return { shown: !u.hidden, text: u.textContent, bg: cs.backgroundColor, fg: cs.color, bw: cs.borderTopWidth, rad: cs.borderRadius }; });
    ok('390 5 ① 예시 알림(#pkUndo) — 같은 모양 [TOAST_BROWN · TOAST_PILL]', f.shown && f.bg === BROWN && f.fg === WHITE && f.bw === '0px' && f.rad === '999px', f);
  }
  ok(`${W} 화면 오류 없음`, errs.length === 0, errs.slice(0, 2));
  await ctx.close();
}
{ // 6 — 안 고른 기본 칩을 처음 고르면(글이 그대로) 말하지 않는다 · «»가 굵은 글씨로 바뀌는 틈(GUIL_OFF)을 «바뀜»으로 읽지 않는다
  const { ctx, pg, errs } = await open(390); await toMake(pg);
  const gs = await pg.evaluate(() => { const o = []; RitualOpen.ORDER.forEach((k) => { try { _lGroups(k).forEach((g) => { if (!/Voice$/.test(g.key) && g.picked === false) o.push([k, 'lsc:' + g.key + ':' + g.cur]); }); } catch (e) {} }); return o; });
  const bad = [];
  for (const [k, fk] of gs) { await go(pg, k); await quiet(pg); if (!(await pg.locator(`#stage [data-fk="${fk}"]`).count())) continue; await tap(pg, `#stage [data-fk="${fk}"]`); const t = await pg.evaluate(TOAST); if (t.shown) bad.push(fk + ' → ' + t.text); }
  ok(`390 6 안 고른 기본 칩 ${gs.length}개를 처음 고를 때 헛알림 없음 [CHIP_TOAST]`, gs.length >= 5 && bad.length === 0, { n: gs.length, bad });
  ok('390 6 화면 오류 없음', errs.length === 0, errs.slice(0, 2));
  await ctx.close(); }
await br.close(); srv.close();
console.log(fail ? `칩 알림 실패 ${fail}건` : '칩 알림 약속 지킴');
process.exit(fail ? 1 : 0);
