#!/usr/bin/env node
/* ★★[VP_ASK_FIRST 2026-10-06 사장님 «첫 화면인데 어떻게 준비할까요 아무것도 클릭 안 했는데 밑에는 이미 스튜디오 나레이션으로 기본 셋팅이 되어 있어»]
   하객 맞이 · 입장 · 식전 영상 소개 — 안내 목소리를 아직 안 골랐으면(CHIP_UNPICKED) 아래에 나레이션 흐름 · «나레이터가 읽어요» 덧말을 그리지 않고 «먼저 골라 주세요» 한 칸만.
   고르면 그 칸이 걷히고 그 판의 흐름이 열린다 · 칩은 여전히 비어 있다(기본을 눌린 것처럼 보이지 않는다)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · SHOTS=<폴더> 면 찍는다 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
/* [VP_ROW_A] «어떻게 준비할까요» 줄 재기 — 질문 글씨 · 줄 수 · 칩 폭 · 링크 자리(글자 끝 ↔ 첫 링크 사이) */
const vpRow = (pg, vk) => pg.evaluate((vk) => { const row = [...document.querySelectorAll('#stage .ls-cg')].find((g) => g.querySelector('[data-fk^="lsc:' + vk + ':"]')); if (!row) return null;
  const gl = row.querySelector('.gl'), cs = getComputedStyle(gl), gr = gl.getBoundingClientRect(), cc = row.querySelector('.cg-c').getBoundingClientRect(), ch = [...row.querySelectorAll('.cg-c > .op-chip')].map((b) => b.getBoundingClientRect());
  const rg = document.createRange(); rg.selectNodeContents(gl); const tq = [...rg.getClientRects()].pop(); const lk = [...row.querySelectorAll('.cg-links .pk-link')], lr = lk.map((a) => a.getBoundingClientRect());
  return { vq: row.classList.contains('cg-vq'), fs: cs.fontSize, fw: cs.fontWeight, col: cs.color, lines: Math.round((gr.height - parseFloat(cs.paddingTop)) / parseFloat(cs.lineHeight)), n: ch.length,
    eq: ch.length === 2 && Math.abs(ch[0].width - ch[1].width) <= 1, fill: ch.length === 2 && Math.abs(ch[0].left - cc.left) <= 1 && Math.abs(ch[1].right - cc.right) <= 1, beside: !!ch.length && Math.abs((ch[0].top + ch[0].bottom) / 2 - (tq.top + tq.bottom) / 2) <= 3 && ch[0].left > tq.right,
    nlk: lk.length, lfs: lk.length ? getComputedStyle(lk[0]).fontSize : '', gap: lr.length ? Math.round(Math.min(...lr.map((q) => q.left)) - tq.right) : 99, lup: !lr.length || lr.every((q) => q.bottom <= (ch[0] ? ch[0].top : 1e9) + 1), lkdn: row.classList.contains('cg-lkdn'), below: !!lr.length && lr.every((q) => q.top >= Math.max(...ch.map((c) => c.bottom)) - 1 && q.right <= cc.right + 1) }; }, vk);
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window._vc = (op) => Promise.resolve(op === 'status' ? { ok: true, on: true, groom: {}, bride: {}, per: {} } : { ok: false }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.on.prevideo = 1; opSync(); });
  for (const [k, vk] of [['guest', 'guestVoice'], ['entry', 'entryVoice'], ['prevideo', 'pvVoice']]) {
    await pg.evaluate((k) => { mkGo(k); try { lsStop(); } catch (e) {} window.scrollTo(0, 0); }, k); await pg.waitForTimeout(400);
    const look = (vk) => pg.evaluate((vk) => ({ ask: ((([...document.querySelectorAll('.ls-cg')].find((g) => g.querySelector('[data-fk^="lsc:' + vk + ':"]')) || document).querySelector('.mk-vpask1')) || {}).textContent || '',   /* [EX_ROW 2026-10-07] 예시 칩 줄도 같은 줄(mk-vpask1 · «아직 고르지 않았어요 · 고르지 않으면 담백하게로») — 목소리 칩 줄 것만 */ box: !!document.querySelector('.mk-vpask'), flow: !!document.querySelector('.mk-flow'), cards: document.querySelectorAll('.mk-vc').length,
      note: [...document.querySelectorAll('.ls-gnote')].map((e) => e.textContent).join('|'), toast: ((u) => (u && !u.hidden ? u.textContent : ''))(document.getElementById('lsToast')) /* [NOTE_TOAST] 누른 그 순간 아래 알림 */, on: [...document.querySelectorAll('[data-fk^="lsc:' + vk + ':"]')].filter((e) => e.getAttribute('aria-checked') === 'true' || e.classList.contains('on')).length }), vk);
    const a = await look(vk);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `vp-ask-${k}-${W}.png`), fullPage: true });
    ok(`${W} ${k} 안 고름 — 칩 아래 한 줄 없음(VP_MUST · 사장님 «저 문구 삭제») · 상자 없음 [VP_ASK_ONE] · 흐름 · 줄 카드 · «나레이터가 읽어요» 없음 · 칩 비어 있음`,
      !a.ask && !a.box /* [VP_ASK_ONE] 상자 없이 칩 아래 한 줄 */ && !a.flow && a.cards === 0 && !/나레이터가 읽어요/.test(a.note) && a.on === 0, JSON.stringify(a));
    /* ★★[VP_ROW_A 2026-10-08 사장님 «추천두개» = 안 A · «PC 는 지금이 적절 · 바꾼다면 모바일만»] 폰 = 질문 14px 먹색 600 한 줄 · 칩 반반(줄을 꽉 채운 같은 폭 두 칸) · 링크 12.5px 는 질문 줄 오른쪽 · 질문과 안 겹친다
       PC = 칩은 글자 폭 그대로 · 제목 글씨는 같다(CG_TITLE · 질문 옆에 칩 한 줄 · VP_CHIP_ROW) */
    const vr = await vpRow(pg, vk);
    if (W <= 460) ok(`${W} ${k} [VP_ROW_A] 폰 — «어떻게 준비할까요» 14px · 600 · 먹색 · 한 줄 · 칩 둘이 같은 폭으로 줄을 꽉 채운다 · 링크 12.5px 는 질문 줄 오른쪽(질문과 12px 넘게)`, vr && vr.vq && vr.fs === '14px' && vr.fw === '600' && vr.col === 'rgb(58, 45, 34)' && vr.lines === 1 && vr.eq && vr.fill && vr.lfs === '12.5px' && vr.gap >= 12 && vr.lup, JSON.stringify(vr));
    else ok(`${W} ${k} [VP_ROW_A · CG_TITLE] PC — 제목 14px · 600 · 먹색 · 한 줄 · 질문 옆에 칩(사장님 «제목 폰트는 PC 도»)`, vr && vr.fs === '14px' && vr.fw === '600' && vr.col === 'rgb(58, 45, 34)' && vr.lines === 1 && vr.beside, JSON.stringify(vr));
    await pg.click(`[data-fk="lsc:${vk}:nar"]`); await pg.waitForTimeout(400);
    const b = await look(vk);
    ok(`${W} ${k} 스튜디오 나레이션 고름 — 칸이 걷히고 흐름이 열린다 · «나레이터가 …»는 칩 아래가 아니라 아래 알림 «나레이터가 두 분 대신 읽어요» [NOTE_TOAST]`, !b.ask && b.flow && !/나레이터가/.test(b.note) && b.toast === '나레이터가 두 분 대신 읽어요' && b.on === 1, JSON.stringify(b));
  }
  /* ★★[VP_MUST 2026-10-08 사장님 «무조건 고르게»] 안 고른 채 «다음»을 누르면 그 쪽에 머물고 한 줄이 진사색(must) · 고르면 넘어간다 · ② → ③ 문도 안 고른 쪽으로 데려간다 */
  { await pg.evaluate(() => { const t = Object.assign({}, S.touched); delete t.guestVoice; S.touched = t; mkGo('guest'); try { lsStop(); } catch (e) {} window.scrollTo(0, 0); }); await pg.waitForTimeout(400);
    await pg.click('#next'); await pg.waitForTimeout(500);
    const tst = () => pg.evaluate(() => { const t = document.getElementById('lsToast'); return t ? { txt: t.textContent, op: t.hidden ? '0' : '1' } : { txt: '', op: '' }; });   // 칩 알림과 같은 떠 있는 안내(_lsToast · CHIP_TOAST)
    const m1 = Object.assign(await pg.evaluate(() => ({ at: _mkRO().at, line: !!document.querySelector('#stage .cg-vp .mk-vpask1'), focus: (document.activeElement && document.activeElement.dataset || {}).fk || '' })), await tst());
    ok(`${W} [VP_MUST] 하객 맞이 안 고름 — «다음»을 눌러도 그 쪽에 머문다 · 떠 있는 안내(칩 알림과 같은 브라운 알약) «어떻게 준비할지 먼저 골라 주세요» · 칩 아래 줄 없음 · 첫 칩에 포커스`, m1.at === 'guest' && m1.txt === '어떻게 준비할지 먼저 골라 주세요' && m1.op === '1' && !m1.line && /^lsc:guestVoice:/.test(m1.focus), JSON.stringify(m1));
    await pg.click('[data-fk="lsc:guestVoice:nar"]'); await pg.waitForTimeout(400); await pg.evaluate(() => { try { lsStop(); } catch (e) {} });
    await pg.click('#next'); await pg.waitForTimeout(500);
    const m2 = await pg.evaluate(() => _mkRO().at);
    ok(`${W} [VP_MUST] 고르면 «다음»으로 넘어간다`, m2 !== 'guest', m2);
    await pg.evaluate(() => { const t = Object.assign({}, S.touched); delete t.entryVoice; S.touched = t; const ps = _mkPages(); mkGo(ps[ps.length - 1]); try { lsStop(); } catch (e) {} }); await pg.waitForTimeout(400);
    await pg.click('#next'); await pg.waitForTimeout(600);
    const m3 = Object.assign(await pg.evaluate(() => ({ step: STEPS[idx] && STEPS[idx].k, at: _mkRO().at })), await tst());
    ok(`${W} [VP_MUST] ② 마지막 쪽에서 «다음»(연습하기) — 안 고른 입장 쪽으로 데려가고 같은 알림`, m3.step === 'listen' && m3.at === 'entry' && m3.txt === '어떻게 준비할지 먼저 골라 주세요', JSON.stringify(m3));
    await pg.click('[data-fk="lsc:entryVoice:nar"]'); await pg.waitForTimeout(300); await pg.evaluate(() => { try { lsStop(); } catch (e) {} }); }
  /* ★[CHIP_W_FIX 2026-10-06 사장님 «버튼 클릭하는 거에 따라 2줄이 되고 1줄이 되고 · 1줄로 고정»] 어느 칩을 눌러도 칩 폭 · 줄 수가 그대로 */
  await pg.evaluate(() => { mkGo('entry'); try { lsStop(); } catch (e) {} });
  await pg.waitForTimeout(300);
  const fks = await pg.evaluate(() => [...document.querySelectorAll('[data-fk^="lsc:entry:"]')].map((e) => e.dataset.fk)); const seen = new Set();
  for (const fk of fks) { await pg.click(`[data-fk="${fk}"]`); await pg.waitForTimeout(200); await pg.evaluate(() => { try { lsStop(); } catch (e) {} });
    seen.add(await pg.evaluate(() => { const cs = [...document.querySelectorAll('[data-fk^="lsc:entry:"]')]; return new Set(cs.map((e) => Math.round(e.getBoundingClientRect().top))).size + ':' + cs.map((e) => Math.round(e.getBoundingClientRect().width)).join(','); })); }
  /* 이 환경의 대체 글꼴은 굵기가 같아 폭이 안 갈린다 — 그래서 «굵은 폭을 잡아 두는 장치» 자체도 본다(칩마다 숨은 굵은 사본) */
  const res = await pg.evaluate(() => [...document.querySelectorAll('.ls-cg .op-chip, .op-chips .op-chip')].every((b) => { const t = b.querySelector('.cg-t'), a = t && getComputedStyle(t, '::after'); return !!a && a.fontWeight === '600' && a.content === JSON.stringify(t.textContent) && a.visibility === 'hidden'; }));
  ok(`${W} [CHIP_W_FIX] 칩마다 굵은 폭 사본(.cg-t::after · 600 · 숨김)이 있다`, res);
  ok(`${W} [CHIP_W_FIX] 입장 멘트 칩 ${fks.length}개를 하나씩 눌러도 칩 폭 · 줄 수가 같다`, fks.length >= 4 && seen.size === 1, [...seen].join(' / '));
  /* ★[VS_UNPICKED 2026-10-06 사장님 «나레이션 선택되어 있는데 미선택으로»] «안내 목소리 정하기» 창도 안 골랐으면 둘 다 비어 있고 · 고르면 그 갈래가 눌려 있다 */
  const vs = await pg.evaluate(async () => { const t0 = S.touched; S.touched = {}; ['guestVoice', 'entryVoice', 'pvVoice'].forEach((k) => { delete S[k]; }); mkGo('guest'); await new Promise((r) => setTimeout(r, 200)); mkVsOpen(); await new Promise((r) => setTimeout(r, 200));
    const a = [...document.querySelectorAll('[data-fk^="mkvs:"]')].map((b) => b.getAttribute('aria-pressed')).join(','); try { mkVsClose(); } catch (e) {} S.touched = Object.assign({}, t0, { guestVoice: 1, entryVoice: 1, pvVoice: 1 }); S.guestVoice = 'nar'; S.entryVoice = 'nar'; S.pvVoice = 'nar'; render(); await new Promise((r) => setTimeout(r, 200)); mkVsOpen(); await new Promise((r) => setTimeout(r, 200));
    const b = [...document.querySelectorAll('[data-fk^="mkvs:"]')].map((x) => x.getAttribute('aria-pressed')).join(','); try { mkVsClose(); } catch (e) {} return { a, b }; });
  ok(`${W} [VS_UNPICKED] 안내 목소리 창 — 안 골랐으면 두 갈래 다 비어 있고(false,false) · 나레이션을 고르면 나레이션이 눌린다`, vs.a === 'false,false' && vs.b === 'false,true', JSON.stringify(vs));
  ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
/* ★[VP_ROW_A] 링크가 둘(«확정 안내 보기» · «나레이션 자세히»)일 때 — 320 은 12.5px 둘이 질문 끝에 7px 겹쳤다(실렌더) · 360 아래 폰은 11px · 사이 12 ·
   그래도 질문 글자와 12px 안이면(폴드 바깥 화면 280 · 대체 글꼴) 칩 아래 제 줄 오른쪽(cg-lkdn) — 어느 쪽이든 겹치지 않는다 */
for (const W of [280, 320, 390]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: true }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window._vc = (op) => Promise.resolve(op === 'status' ? { ok: true, on: true, groom: {}, bride: {}, per: {} } : { ok: false }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1;
    S.touched = Object.assign({}, S.touched, { guestVoice: 1 }); S.guestVoice = 'couple'; S.vfill = Object.assign({}, S.vfill || {}, { guest: 'ai' }); opSync(); mkGo('guest'); try { lsStop(); } catch (e) {} }); await pg.waitForTimeout(500);
  const vr = await vpRow(pg, 'guestVoice');
  const sw = await pg.evaluate(() => document.documentElement.scrollWidth), sep = vr && (vr.lkdn ? vr.below : vr.lup && vr.gap >= 12);
  ok(`${W} [VP_ROW_A] 링크 둘 — 질문 14px · 링크 ${W <= 359 ? '11px(360 아래 폰)' : '12.5px'} · 질문 줄 오른쪽(질문과 12px 넘게) 또는 칩 아래 제 줄 — 안 겹친다 · 칩 반반 · 가로 넘침 없음`, vr && vr.nlk === 2 && vr.fs === '14px' && vr.lfs === (W <= 359 ? '11px' : '12.5px') && sep && vr.eq && vr.fill && sw <= W, JSON.stringify(vr) + ' sw ' + sw);
  if (W === 390) ok(`${W} [VP_ROW_A] 넉넉한 폭은 질문 줄 오른쪽 그대로(VS_LINK_TOP · 칩 아래로 안 내림)`, vr && !vr.lkdn && vr.lup, JSON.stringify(vr));
  if (W === 280) ok(`${W} [VP_ROW_A] 폴드 바깥 화면 — 질문 줄에 안 들어가 칩 아래 제 줄 오른쪽으로 내린다`, vr && vr.lkdn && vr.below, JSON.stringify(vr));
  ok(`${W} [VP_ROW_A] 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `✗ VP_ASK_FIRST 실패 ${fail}건` : '✓ VP_ASK_FIRST 통과'); process.exit(fail ? 1 : 0);
