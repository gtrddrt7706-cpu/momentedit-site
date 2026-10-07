#!/usr/bin/env node
/* ★★[REF_FORM 2026-10-07 사장님 «여기 부분 다른 곳들과 다르게 텍스트박스가 아닌데 · 다른 곳들도 형태가 다른 것이 있는지 하나하나 확인해서 개선»]
   ② 순간 쪽의 «참고 예시» 아래 모양을 390 실렌더로 잰다 — 같은 역할은 같은 모양이어야 한다.
   ① 두 분이 직접 말하는 순간(첫인사 · 서약 · 부모님께 인사 · 편지 · 축배) = 참고 예시를 누르면 «두 분이 할 말» 칸(신랑 · 신부)에 들어간다 · 읽기만 하는 글이 없다 [TOAST_SAY]
   ② 축배 한마디는 선택 칸 — 미완료 셈에 안 든다 · 적으면 대본에 «축배 한마디(두 분 작성)» · 비우면 없다
   ③ 예시 칩 이름이 한 줄에서 겹치지 않는다(성혼 선언 가족 낭독 «한 분이 읽어요» 두 번) [REF_TITLE_WHO]
   ④ 한 분이 잇달아 말하는 예시(축사 네 문단)는 글자 수 · 초를 끝에 한 번 [REF_ONE_COUNT]
   ⑤ 흐름 줄 — 축사 · 가족 낭독은 «말씀하실 · 읽으실 차례» 한 줄(예시 인물을 박지 않는다 · 문단마다 되풀이 없음) [FLOW_ONE_TURN]
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
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 844 }, hasTouch: true }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  /* 모든 순간을 담고 · 성혼 선언 = 가족 낭독 · 준비한 순서 = 축사(3분) — 참고 예시가 붙는 자리를 전부 연다 */
  await pg.evaluate(() => { const R = RitualOpen; R.ORDER.forEach((k) => { if (!R.ALWAYS[k]) S.on[k] = 1; }); S.declareWho = 'family'; S.freeWhat = 'speech'; S.freeLen = '3'; opSync(); });
  await nx(); await pg.waitForTimeout(1500); await pg.evaluate(() => { try { engine(); } catch (e) {} }); await pg.waitForTimeout(900);
  const go = async (k) => { await pg.evaluate((x) => { try { lsStop(); } catch (e) {} mkGo(x); }, k); await pg.waitForTimeout(350); };
  const look = (k) => pg.evaluate((k) => { const q = (s) => document.querySelector('.mk-pg ' + s), qa = (s) => [...document.querySelectorAll('.mk-pg ' + s)];
    return { ref: !!q('.mk-ref'), fill: !!q('.mk-ref .mk-rsel0'), plain: qa('.mk-ref .mk-rw').length, ta: qa('.mk-say textarea').length,
      chips: qa('.mk-ref .mk-exc').map((b) => b.textContent.replace(/\s+/g, ' ').trim()), counts: qa('.mk-ref .mk-rl').length,
      whos: qa('.mk-ref .mk-rw b').map((b) => b.textContent.trim()), talk: qa('.mk-flow li.t b').map((b) => b.textContent.trim()) }; }, k);

  /* ① 두 분이 직접 말하는 순간 — 예시가 칸을 채운다 */
  for (const k of ['welcome', 'vow', 'tribute', 'letter', 'toast']) {
    await go(k); const d = await look(k);
    ok(`① ${k} — 참고 예시 → «두 분이 할 말» 칸(읽기만 하는 글 없음) [TOAST_SAY]`, d.ref && d.fill && d.plain === 0 && d.ta >= 2, JSON.stringify(d));
  }
  /* ② 축배 한마디 — 카드를 누르면 신랑 · 신부 칸에 · 선택 칸(셈 밖) · 대본 */
  await go('toast');
  const tz = await pg.evaluate(() => {
    const u0 = mkUndone(), P = _mkRefPairs('toast', 1), tasks = _mkTasks('toast').filter((x) => x.kind === 'tx').length;
    const s0 = scriptText(); if (P.length) _mkRefFill('toast', 1);   // 칸이 없는 옛 판에서도 멈추지 않고 빨강으로 끝나게
    const g = String((S.tx || {})['toast.g'] || ''), b = String((S.tx || {})['toast.b'] || ''), s1 = scriptText(), u1 = mkUndone();
    const taG = document.getElementById('mkt_toast_g'), taB = document.getElementById('mkt_toast_b');
    return { pairs: P.length, filled: P.length === 2 && !!g && !!b && g === P[0].txt && b === P[1].txt, boxes: !!taG && !!taB && taG.value === g && taB.value === b,
      tasks, same: u0 === u1, before: /축배 한마디\(두 분 작성\)/.test(s0), after: /축배 한마디\(두 분 작성\)/.test(s1) && s1.indexOf(g) > -1 && s1.indexOf(b) > -1,
      note: /비워 두시면 당일 «?위하여»?만 외치셔도 돼요/.test((document.querySelector('.mk-pg .mk-say') || {}).textContent || ''),
      opt: RitualOpen.prepOf('toast', S).filter((q) => q[2] === 'write').every((q) => RitualOpen.prepOpt({ note: q[4] })) };
  });
  ok('② 축배 — 예시 카드를 누르면 신랑 · 신부 칸에 들어간다', tz.pairs === 2 && tz.filled && tz.boxes, JSON.stringify(tz));
  ok('② 축배 한마디는 선택 칸 — 미완료 셈 밖(칸이 비어도 · 채워도 같은 수) · 원천 prepOpt [TOAST_SAY]', tz.tasks === 0 && tz.same && tz.opt, JSON.stringify(tz));
  ok('② 대본 — 비우면 없고 · 적으면 «축배 한마디(두 분 작성)»', !tz.before && tz.after, JSON.stringify(tz));
  ok('② 안 적으면 어떻게 되는지 한 줄(«위하여»만)', tz.note, JSON.stringify(tz));
  /* ③ 칩 이름이 겹치지 않는다 — 참고 예시가 붙는 자리 전부 */
  for (const k of ['welcome', 'bless', 'vow', 'declare', 'tribute', 'free', 'letter', 'toast']) {
    await go(k); const d = await look(k);
    ok(`③ ${k} — 예시 칩 이름이 겹치지 않는다 [REF_TITLE_WHO]`, d.chips.length > 0 && new Set(d.chips).size === d.chips.length, JSON.stringify(d.chips));
  }
  /* ④ ⑤ 축사 · 가족 낭독 · 덕담 */
  await go('free'); const fr = await look('free');
  ok('④ 축사 예시 — 한 분 몫 글자 수 · 초는 끝에 한 번(이름도 한 번) [REF_ONE_COUNT]', fr.plain > 1 && fr.counts === 1 && fr.whos.length === 1, JSON.stringify(fr));
  ok('⑤ 축사 흐름 — «말씀하실 차례» 한 줄(예시 인물 · 문단마다 되풀이 없음) [FLOW_ONE_TURN]', fr.talk.length === 1 && fr.talk[0] === '말씀하실 차례', JSON.stringify(fr.talk));
  await go('declare'); const dc = await look('declare');
  ok('⑤ 가족 낭독 흐름 — «읽으실 차례» 한 줄 [FLOW_ONE_TURN]', dc.talk.length === 1 && dc.talk[0] === '읽으실 차례', JSON.stringify(dc.talk));
  ok('④ 가족 낭독 예시 — 읽는 분마다 이름 · 글자 수 한 번', dc.counts === dc.whos.length && dc.counts >= 1, JSON.stringify(dc));
  await go('bless'); const bl = await look('bless');
  ok('④ 덕담 예시 — 분마다 이름 · 글자 수 한 번(종전 그대로)', bl.counts === bl.whos.length && bl.counts === 2 && bl.talk.length === 1 && bl.talk[0] === '말씀하실 차례', JSON.stringify(bl));
  /* ⑨ 받은 원고 칸 — 덕담 · 축사 같은 꼴 [SPEECH_SCRIPT] */
  await go('bless'); const bk = await pg.evaluate(() => ({ ta: !!document.querySelector('.mk-pg textarea[aria-label="받은 덕담 원고"]'), ck: !!document.querySelector('.mk-pg [data-fk="mkbsite"]') }));
  ok('⑨ 덕담 — 받은 원고 칸 · «원고 없이» 체크(종전 그대로)', bk.ta && bk.ck, JSON.stringify(bk));
  await go('free');
  const sp = await pg.evaluate(() => { const q = _mkItems('free').filter((x) => x.cat === 'ask')[0], ta = document.querySelector('.mk-pg textarea[aria-label="받은 축사 원고"]'), r = { ta: !!ta, ck: !!document.querySelector('.mk-pg [data-fk="mkfsite"]') };
    if (!q || !ta) return r; r.d0 = _mkItemDone(q); ta.value = '하윤아, 결혼 축하한다. 오빠는 언제나 네 편이다.'; ta.dispatchEvent(new Event('input')); r.d1 = _mkItemDone(q); r.sc1 = /축사 원고\(준비하신 분/.test(scriptText());
    r.cnt = ((document.getElementById('mkc_free_p') || {}).textContent || '').trim(); mkChk(q.id, true, 'site'); r.ta2 = !!document.querySelector('.mk-pg textarea[aria-label="받은 축사 원고"]'); r.cue = !!document.querySelector('.mk-pg .mk-cue');
    r.pl = RitualOpen.prepList(S).some((x) => x.k === 'free' && x.cat === 'ask'); r.sc2 = /축사: 원고 없이 현장에서 바로 하세요/.test(scriptText()); r.hd = /축사 원고/.test(document.querySelector('.mk-pg').textContent);
    mkChk(q.id, false); ta && (S.tx['free.p'] = ''); return r; });
  ok('⑨ 축사 — 받은 원고 칸 · 붙이면 부탁 다 됨 · 대본에 «축사 원고» · 글자 수', sp.ta && sp.ck && sp.d0 === false && sp.d1 === true && sp.sc1 && /자 · 약 \d+초/.test(sp.cnt || ''), JSON.stringify(sp));
  ok('⑨ 축사 «원고 없이» — 칸 접히고 끝 신호 칸 · 준비 목록에서 원고 부탁 빠짐 · 대본 한 줄 · 머리 «축사 원고»', sp.ta2 === false && sp.cue && sp.pl === false && sp.sc2 && sp.hd, JSON.stringify(sp));
  const con = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
  ok('⑨ 콘솔 끝 신호 — 축사도 받은 원고 · 끝 신호를 본다', /free: \[\['p:free:0','축사하시는 분','free\.p'\]\]/.test(con));
  /* ⑩ 끝 신호 예시 칩(inline-flex) — 명조로 바꾼 말(«감사합니다») 앞뒤 띄어쓰기가 산다 [GUIL_FLEX_SPACE] */
  await go('free'); await pg.evaluate(() => { const q = _mkItems('free').filter((x) => x.cat === 'ask')[0]; if (q) mkChk(q.id, true, 'site'); }); await pg.waitForTimeout(250);
  const chipTxt = await pg.evaluate(() => ((document.querySelector('.mk-pg .mk-cue-ex .ex-chip') || {}).innerText || ''));
  ok('⑩ 끝 신호 예시 칩 — «마지막에 감사합니다라고 할게요»(띄어쓰기 그대로) [GUIL_FLEX_SPACE]', /마지막에 감사합니다라고 할게요/.test(chipTxt.replace(/\s+/g, ' ')), JSON.stringify(chipTxt));
  await pg.evaluate(() => { const q = _mkItems('free').filter((x) => x.cat === 'ask')[0]; if (q) mkChk(q.id, false); });
  /* ⑦ 가족 낭독 예시 안내 — 바꿀 칸도 이름도 없는 글이다 [DECL_REF_HEAD] */
  await go('declare'); const dh = await pg.evaluate(() => ((document.querySelector('.mk-pg .mk-ref .ls-gnote') || {}).textContent || '').trim());
  ok('⑦ 가족 낭독 예시 안내 = 인쇄해 건네 드리는 선언문(«바꿔도 돼요 · 가상 인물» 없음) [DECL_REF_HEAD]', /선언문은 큰 글씨로 인쇄해/.test(dh) && !/바꿔도 돼요|가상 인물/.test(dh), dh);
  /* ⑧ 한눈에 보기 — 두 분이 부탁하는 줄(축사하실 분)도 목록에 · 머리 «부탁드릴 것» [SUM_ASK_ALL] */
  await go('_sum'); const sm = await pg.evaluate(() => { const t = document.querySelector('.mk-pg').textContent.replace(/\u00a0/g, ' '); return { speech: /축사하실 분께 부탁드리기/.test(t), head: /(^|[^모님께 ])부탁드릴 것/.test(t.replace(/부모님께 부탁드릴 것/g, '')), par: /부모님께 부탁드릴 것/.test(t) }; });
  ok('⑧ 한눈에 보기 — 축사 부탁 줄이 있고 머리는 «부탁드릴 것»(부모님 것만일 때만 «부모님께») [SUM_ASK_ALL]', sm.speech && sm.head && !sm.par, JSON.stringify(sm));
  ok('⑥ 화면 오류 0', errs.length === 0, errs.slice(0, 3).join(' | '));
} catch (e) { console.log('못 쟀다 —', e && e.message); await br.close(); srv.close(); process.exit(2); }
await br.close(); srv.close();
console.log(fail ? `FAIL ${fail}건` : 'ref-form OK');
process.exit(fail ? 1 : 0);
