// ★[R2_BUILDER 2026-10-09 고객 여정 A~Z 점검 2라운드 · 식순] 저장 · 다시 열기 · 뒤로가기 · 나가기 · 새로고침의 약속.
//   1 [CANON_EMPTY]    서버 합치기가 덧붙이는 빈 칸(tx · mkc · up {})과 fAt 은 지문에 넣지 않는다 · 글이 다르면 지문도 다르다
//   2 [BASE_AFTER_PULL] 저장 답의 바탕 = 보낸 판 + 서버가 지킨 칸(pull)
//   3 [DONE_CLEAN]     완성 저장(④)이 되면 그 판이 기준선 — 이 기기 판 dirty:false · 다시 열면 완성 그대로(«저장 전 고침» 알림 없음) [SEEN_NOT_KEY]
//   4 [LATEST_FILL]    충돌 판 «최신 내용 불러오기» → 이 창이 그 판으로 바뀐다 · 기다리던 저장이 풀린다
//   5 [BACK_DISMISS]   판이 떠 있으면 폰 뒤로가기는 그 판만 닫는다(걸음 그대로 · 칸을 되돌린다)
//   6 [EXIT_HOLD_ALL]  판이 떠 있을 때 마이페이지의 나가기 요청 → «잡고 있어요»를 먼저 · 판은 닫힌다
//   7 [EXIT_PILL_ONE]  나가기가 기다리는 동안 그리기를 해도 «나가기» 알약은 기다림(차오름)을 지킨다 · 폭이 그대로
//   8 [RESTART_GEN_NOW] «모두 비우기» 뒤 판 번호가 이 창의 기억 · 지금 칸에도 적힌다
//   9 [RELOAD_ONCE · RELOAD_UNWIND] 새로고침을 두 번 눌러도 한 번 · 이 창이 쌓은 칸을 먼저 되감고 남은 깊이(d)를 알린다
//  10 [BUSY_SAY_TRUE]  AI 줄을 만드는 일은 «보내는 중»이 아니다 · «이어서 해요»는 빈 줄 채우기에만
//  11 [PARENT_ASK_HOLD] 마이페이지 판이 떠 있으면 뒤로가기가 걸음을 바꾸지 않는다
//  12 [S5_EXIT_TITLE]  나가기 저장의 답이 늦음(S5)이면 판 제목은 «저장됐는지 아직 몰라요»
//  13 [EXIT_WAIT_ONE_SAY] 나가기가 기다리던 저장이 실패하면 알림은 생략(판이 말한다)
//  14 [PERSIST_TRUE]   이 기기에 남기지 못했으면 «이 기기에는 남아 있어요»라고 약속하지 않는다
//  15 [IDX_SANE]       깨진 자리(음수 · 글자)로 다시 열어도 빈 화면이 아니다
//  16 [DONE_AFTER_BAKE] ④ «이대로 저장하기»는 구울 줄을 다 구운 뒤에 완성 저장을 보낸다
//   R2B_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.R2B_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 마이페이지 안(embed=1)에서 연 새 코스 빌더 — 부모 메시지는 같은 출처 postMessage 로 흉내(부모 = 이 창) · 이 창이 부모에게 보낸 것은 __msgs 에 모은다 */
async function open(w) {
  const pg = await br.newPage({ viewport: { width: w || 390, height: 860 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`${BASE}/order-preview.html?embed=1`, { waitUntil: 'load' }); await wait(700);
  await pg.evaluate(() => { window.__msgs = []; window.addEventListener('message', (e) => { if (e.data && e.data.type) window.__msgs.push(e.data); });
    if (COURSES.open) S.course = 'open'; else S.course = Object.keys(COURSES)[0]; courseStarted = true; _restored = true; _who = 'ME0001'; CUST = { code: 'ME0001' };
    buildSteps(); for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'pick') { idx = i; break; } render(); _autoLast = _autoKey(); _persist(); });
  await wait(300); return { pg, errs };
}
const post = (pg, m) => pg.evaluate((m) => { window.postMessage(m, window.location.origin); }, m);
const toastT = (pg) => pg.evaluate(() => ((document.getElementById('_toast') || {}).textContent || '').trim());
const stepOf = (pg, k) => pg.evaluate((k) => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === k) return i; return -1; }, k);
try {
  { const { pg, errs } = await open();
    /* 1 */
    const a = await pg.evaluate(() => { const b = JSON.parse(JSON.stringify(S)); delete b.tx; delete b.mkc; delete b.up; delete b.fAt;
      const c = JSON.parse(JSON.stringify(b)); c.tx = {}; c.mkc = {}; c.up = {}; c.fAt = { 'tx.vow.g': 123 };
      const d = JSON.parse(JSON.stringify(b)); d.tx = { 'vow.g': '다른 글' }; return { same: _canonS(b) === _canonS(c), diff: _canonS(b) !== _canonS(d) }; });
    ok('1 서버가 덧붙인 빈 칸 · fAt 은 지문을 바꾸지 않는다 · 글이 다르면 다르다 [CANON_EMPTY]', a.same && a.diff, JSON.stringify(a));
    /* 2 */
    const b = await pg.evaluate(() => { const s = JSON.parse(JSON.stringify(S)); s.tx = { 'vow.g': '이 기기 글' };
      const pull = { tx: { 'vow.b': '다른 기기 글' }, mkc: {}, up: {}, fAt: { 'tx.vow.b': 5 } };
      const m = JSON.parse(JSON.stringify(s)); m.tx['vow.b'] = '다른 기기 글'; m.mkc = {}; m.up = {}; m.fAt = { 'tx.vow.b': 5 };
      return { has: typeof _baseAfter === 'function', eq: typeof _baseAfter === 'function' && _baseAfter(s, pull) === _canonS(m) }; });
    ok('2 저장 답의 바탕 = 보낸 판 + 서버가 지킨 칸 [BASE_AFTER_PULL]', b.has && b.eq, JSON.stringify(b));
    /* 3 완성 저장 → 다시 열기 */
    const at = await stepOf(pg, 'done');
    await pg.evaluate((at) => { S.tx = Object.assign({}, S.tx, { 'vow.g': '완성 글' }); idx = at; render(); window.__msgs = []; doSave(); }, at); await wait(500);
    const sent = await pg.evaluate(() => (window.__msgs.find((m) => m.type === 'momentedit:orderSave') || {}).data || null);
    await post(pg, { type: 'momentedit:orderSaved', pull: null }); await wait(500);
    const c = await pg.evaluate(() => { const v = JSON.parse(localStorage.getItem('me_order') || 'null') || {}; return { ds: _doneSaved, clean: _autoKey() === _autoLast, dirty: v.dirty, sv: v.sv }; });
    ok('3 완성 저장이 되면 그 판이 기준선 — 이 기기 판 dirty:false · sv:true [DONE_CLEAN]', !!sent && c.ds && c.clean && c.dirty === false && c.sv === true, JSON.stringify(c));
    await pg.evaluate(() => { const t = document.getElementById('_toast'); if (t) t.textContent = ''; });
    await post(pg, { type: 'momentedit:orderFill', cust: { code: 'ME0001' }, draft: { S: sent && sent.S }, done: true }); await wait(900);
    const c2 = await pg.evaluate(() => ({ ds: _doneSaved, k: STEPS[idx] && STEPS[idx].k, nx: (document.getElementById('next') || {}).textContent }));
    const t3 = await toastT(pg);
    ok('3 완성한 식순을 다시 열면 완성 그대로 · «저장 전 고침을 이어서 열었어요» 없음 [DONE_CLEAN · SEEN_NOT_KEY]', c2.ds && c2.k === 'done' && !/저장 전 고침/.test(t3), JSON.stringify(Object.assign(c2, { toast: t3 })));
    ok('1~3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  { const { pg, errs } = await open();
    /* 4 */
    const other = await pg.evaluate(() => { const o = JSON.parse(JSON.stringify(S)); o.tx = Object.assign({}, o.tx, { 'vow.g': '다른 기기에서 쓴 서약' }); S.tx = Object.assign({}, S.tx, { 'vow.g': '이 기기 서약' }); _autoWait = true; return o; });
    await post(pg, { type: 'momentedit:orderLatest', via: 'draft', draft: { S: other }, done: false }); await wait(500);
    const d = await pg.evaluate(() => ({ tx: (S.tx || {})['vow.g'], wait: _autoWait, clean: _autoKey() === _autoLast }));
    const t4 = await toastT(pg);
    ok('4 «최신 내용 불러오기» → 이 창이 그 판으로 · 기다리던 저장이 풀린다 · 한 줄 알림 [LATEST_FILL]', d.tx === '다른 기기에서 쓴 서약' && !d.wait && d.clean && /다른 기기 내용으로 바꿨어요/.test(t4), JSON.stringify(Object.assign(d, { toast: t4 })));
    /* 5 판 + 뒤로가기 */
    const ls = await stepOf(pg, 'listen'), pk = await stepOf(pg, 'pick');
    await pg.evaluate(([ls, pk]) => { idx = pk; history.replaceState({ opIdx: pk, gen: _opGen, d: 0 }, ''); idx = ls; render(); history.pushState({ opIdx: ls, gen: _opGen, d: 1, from: pk }, '');
      ordAsk({ title: '시험 판', body: '', yes: '예', no: '아니오' }); }, [ls, pk]); await wait(400);
    await pg.evaluate(() => history.back()); await wait(900);
    const e = await pg.evaluate(() => ({ ov: !!_ordOv, k: STEPS[idx] && STEPS[idx].k, d: (history.state || {}).d }));
    ok('5 판이 떠 있으면 뒤로가기는 그 판만 닫는다 · 걸음 그대로 · 칸을 되돌린다 [BACK_DISMISS]', !e.ov && e.k === 'listen' && e.d === 1, JSON.stringify(e));
    /* 6 */
    await pg.evaluate(() => { window.__msgs = []; ordAsk({ title: '시험 판 2', body: '', yes: '예', no: '아니오' }); }); await wait(300);
    await post(pg, { type: 'momentedit:orderExitReq' }); await wait(500);
    const f = await pg.evaluate(() => ({ hold: window.__msgs.some((m) => m.type === 'momentedit:orderExitHold' && m.on === true), ov: !!_ordOv }));
    ok('6 판이 떠 있을 때 나가기 요청 → «잡고 있어요»를 먼저 · 판은 닫힌다 [EXIT_HOLD_ALL]', f.hold && !f.ov, JSON.stringify(f));
    /* 7 */
    const g = await pg.evaluate(() => { const b = document.getElementById('obExit'); const w0 = Math.round(b.getBoundingClientRect().width); if (typeof _xPaint !== 'function') return { has: false };
      _xBusy = 'wait'; _xPaint(); render(); const t = b.textContent, ld = b.classList.contains('ld'), bz = b.getAttribute('aria-busy'), w1 = Math.round(b.getBoundingClientRect().width);
      _xBusy = ''; _xPaint(); return { has: true, t, ld, bz, w0, w1 }; });
    ok('7 나가기를 기다리는 동안 그리기를 해도 알약은 기다림(차오름 · aria-busy) · 글자 «나가기» · 폭 그대로 [EXIT_PILL_ONE]', g.has && g.t === '나가기' && g.ld && g.bz === 'true' && g.w0 === g.w1, JSON.stringify(g));
    /* 10 */
    const j = await pg.evaluate(() => { if (typeof _vcBusyBody !== 'function') return { has: false }; MK_UP.g1 = 'make'; VC_MKP.g1 = { sig: 'x' }; const a = _upBusyKeys().length;
      const f0 = VC.fill; VC.fill = { doing: false }; const b = _vcBusyBody(); VC.fill = { doing: true }; const c = _vcBusyBody(); VC.fill = f0 || {}; delete MK_UP.g1; delete VC_MKP.g1; return { has: true, a, b, c }; });
    ok('10 AI 줄을 만드는 일은 «보내는 중»이 아니다 · «이어서 해요»는 빈 줄 채우기에만 [BUSY_SAY_TRUE]', j.has && j.a === 0 && /다음에 다시 만들어요/.test(j.b) && /이어서 해요/.test(j.c), JSON.stringify(j));
    /* 11 */
    await post(pg, { type: 'momentedit:orderParentAsk', on: true }); await wait(200);
    await pg.evaluate(([ls, pk]) => { idx = pk; history.replaceState({ opIdx: pk, gen: _opGen, d: 0 }, ''); idx = ls; render(); history.pushState({ opIdx: ls, gen: _opGen, d: 1, from: pk }, ''); }, [ls, pk]); await wait(200);
    await pg.evaluate(() => history.back()); await wait(900);
    const h = await pg.evaluate(() => ({ k: STEPS[idx] && STEPS[idx].k, d: (history.state || {}).d }));
    await post(pg, { type: 'momentedit:orderParentAsk', on: false }); await wait(200);
    ok('11 마이페이지 판이 떠 있으면 뒤로가기가 걸음을 바꾸지 않는다 [PARENT_ASK_HOLD]', h.k === 'listen' && h.d === 1, JSON.stringify(h));
    /* 12 · 13 */
    await pg.evaluate(() => { const t = document.getElementById('_toast'); if (t) t.textContent = ''; });
    await post(pg, { type: 'momentedit:orderExitReset', msg: '응답이 늦어요', ecode: 'S5' }); await wait(400);
    const k = await pg.evaluate(() => ((document.querySelector('.ord-ask.on .oa-t') || {}).textContent || '').trim());
    await pg.evaluate(() => { if (_ordOv) _ordOv.__ordClose(false); }); await wait(250);
    ok('12 나가기 저장의 답이 늦음(S5)이면 판 제목 «저장됐는지 아직 몰라요» [S5_EXIT_TITLE]', /저장됐는지 아직 몰라요/.test(k), k);
    const m = await pg.evaluate(() => { const t = document.getElementById('_toast'); if (t) t.textContent = ''; _xBusy = 'wait'; _autoFail('응답이 늦어요 (코드 S5)'); const a = ((document.getElementById('_toast') || {}).textContent || '').trim(); _xBusy = ''; return a; });
    ok('13 나가기가 기다리던 저장이 실패하면 알림은 생략(판이 말한다) [EXIT_WAIT_ONE_SAY]', !m, m);
    /* 14 */
    const n = await pg.evaluate(() => { if (typeof _keepLine !== 'function') return { has: false }; const o = _persistBad; _persistBad = true; const a = _keepLine(), b = _keepHere(); _persistBad = o; return { has: true, a, b }; });
    ok('14 이 기기에 남기지 못했으면 «남아 있어요»라고 약속하지 않는다 [PERSIST_TRUE]', n.has && !/남아 있어요|그대로 있어요/.test(n.a + n.b), JSON.stringify(n));
    /* 15 */
    const o = await pg.evaluate(() => { const r = _applySaved({ v: 2, S: JSON.parse(JSON.stringify(S)), idx: -3, cs: true, sv: false }, true); render(); return { r, idx, k: STEPS[idx] && STEPS[idx].k }; });
    ok('15 깨진 자리(-3)로 다시 열어도 빈 화면이 아니다 [IDX_SANE]', o.r && o.idx >= 0 && !!o.k, JSON.stringify(o));
    ok('4~15 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  { const { pg, errs } = await open();
    /* 8 */
    const p8 = await pg.evaluate(() => { window.__g0 = _opGen; opRestart(); return true; }); await wait(400);
    await pg.evaluate(() => { const y = document.querySelector('.ord-ask.on .oa-yes'); if (y) y.click(); }); await wait(500);
    const q = await pg.evaluate(() => { let ss = ''; try { ss = sessionStorage.getItem('me_order_gen') || ''; } catch (e) {} return { g0: window.__g0, g: _opGen, ss, st: (history.state || {}).gen }; });
    ok('8 «모두 비우기» 뒤 판 번호가 이 창의 기억 · 지금 칸에도 [RESTART_GEN_NOW]', p8 && q.g !== q.g0 && q.ss === q.g && q.st === q.g, JSON.stringify(q));
    /* 9 */
    await pg.evaluate(() => { _hPush({ opIdx: idx, gen: _opGen }); _hPush({ opIdx: idx, gen: _opGen }); window.__d0 = _hDepth(); window.__msgs = []; window._obReload(); window._obReload(); }); await wait(2600);
    const r = await pg.evaluate(() => ({ d0: window.__d0, sent: window.__msgs.filter((m) => m.type === 'momentedit:orderReload').map((m) => m.d) }));
    ok('9 새로고침을 두 번 눌러도 한 번 · 쌓은 칸(2 이상)을 먼저 되감고 남은 깊이 0 을 알린다 [RELOAD_ONCE · RELOAD_UNWIND]', r.d0 >= 2 && r.sent.length === 1 && r.sent[0] === 0, JSON.stringify(r));
    ok('8 · 9 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  { const { pg, errs } = await open();
    /* 16 — 굽기는 흉내(0.9초) */
    const at = await stepOf(pg, 'done');
    await pg.evaluate((at) => { idx = at; render(); window.__msgs = []; window.__baked = false;
      _vcOn = function () { return true; }; _vtAllKeys = function () { return ['g1']; }; _vtNeed = function () { return !window.__baked; };
      _vtBakeAll = function () { return new Promise(function (r) { setTimeout(function () { window.__baked = true; r(); }, 900); }); }; doSave(); }, at); await wait(350);
    const s1 = await pg.evaluate(() => ({ sent: window.__msgs.filter((m) => m.type === 'momentedit:orderSave').length, saving: _saving }));
    await wait(1300);
    const s2 = await pg.evaluate(() => ({ sent: window.__msgs.filter((m) => m.type === 'momentedit:orderSave').length, baked: window.__baked }));
    ok('16 ④ «이대로 저장하기»는 구울 줄을 다 구운 뒤에 완성 저장을 보낸다(굽는 동안 «저장 중…») [DONE_AFTER_BAKE]', s1.sent === 0 && s1.saving && s2.sent === 1 && s2.baked, JSON.stringify({ s1, s2 }));
    ok('16 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nR2 BUILDER FAIL ${fail}` : '\nR2 BUILDER OK'); process.exit(fail ? 1 : 0);
