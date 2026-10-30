#!/usr/bin/env node
/* ★★[CON_START_NOWAIT · RF_NOWAIT_EMPTY · RF_WAIT_ONCE 2026-10-31 GPT 17차 점검(당일 17-01 · 17-02)]
   당일 콘솔 «시작»의 기다림을 원문 조각(vm)으로 잰다 — 옛 판(CSN_CS 로 옛 console.html 을 주면)에서는 ① ③ 이 빨강이어야 한다.
   ① 17-01 [RF_NOWAIT_EMPTY] 받을 두 분 소리도 입장 곡도 없는 예식 + 파일 목록 답이 늦다 → «시작»이 목록을 기다리지 않는다(최신 확인 CON_FRESH 만 거쳐 바로)
   ② 받을 줄이 있으면 종전대로 목록 · 파일 받기를 기다린다(RF_READY_ALL 그대로)
   ③ 17-02 [RF_WAIT_ONCE] 받기가 130초 넘게 안 끝나면 기다림은 한 번만 끝난다 — 받은 것만으로 시작 · L5 한 줄 · 새 기다림을 다시 걸지 않는다 · 다시 눌러도 바로
   ④ 다시 받기(rfAgainRun)는 늦음 표시를 걷고 다시 받는다 · 확인 칸에 같은 줄 + 단추 · 코드 표에 L5 뜻
   ⑤ 18-01(고객) [RF_AGAIN_RESET] 130초 뒤 남은 요청이 실패로 끝나 일반 «다시 받기»만 남아도, 그 단추가 늦음 표시를 걷고 새 차례로 받는다 — 다음 «시작»은 다시 기다린다
   ⑥ 18-01(당일) [RF_LATE_FREEZE] 130초로 시작한 뒤 늦게 온 파일 · 입장 곡 답이 소리를 바꾸지 않는다(못 받은 줄은 «받지 못함 · L5») · «다시 받기»를 누르면 그때 새 차례로 붙는다
   ⑦ 18-02(당일) [RF_SEL_REFETCH] 나레이션으로 열고 하객 맞이 칩을 «두 분 목소리»로 바꾸면 need 를 다시 재고 새 차례로 받는다 — «시작»이 목록 · 파일을 기다린다
   옛 판(#1453 · 375d6ad1)에서는 ⑤ ⑥ ⑦ 이 빨강이어야 한다
   ⑧ 19-01(고객) [RF_WAIT_GEN] «새로 저장된 소리가 있어요»로 시작 예약이 버려지면 옛 130초 시계도 끝난다 — 뒤의 «다시 불러오기» 받기를 굳히지 않는다 ·
      기다리는 «시작»은 새 받기(다시 받기 · 칩)를 새 130초로 이어서 기다린다
   ⑨ 19-01(당일) [RF_FREEZE_TRUE] 굳힐 때 이미 물린 지금 파일은 «받아 둠» 그대로(그 소리가 나간다) · 나레이션으로 나갈 줄은 두 분 파일 연결을 걷는다
   옛 판(#1454 · 0a2664b1)에서는 ⑧ ⑨ 가 빨강이어야 한다
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CS = fs.readFileSync(process.env.CSN_CS || path.join(ROOT, 'console.html'), 'utf8');
const EC = fs.readFileSync(path.join(ROOT, 'assets/err-codes.js'), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const iife = (() => { const i = CS.indexOf("(function(){ var go = $('#go'), run = go.onclick;"); return i < 0 ? '' : CS.slice(i, CS.indexOf('})();', i) + 5); })();
async function sec(name, fn) { try { await fn(); } catch (e) { ok(name + ' — 재다가 멈췄다', false, String(e && e.stack || e).split('\n').slice(0, 2).join(' ')); } }

/* 가짜 시계 — setTimeout · Date.now 를 손으로 민다(130초를 실제로 기다리지 않는다) */
function clock() { let now = 1e12, seq = 0; const q = [];
  const flush = async () => { for (let i = 0; i < 12; i++) await new Promise((r) => setImmediate(r)); };
  return { now: () => now, q, setTimeout: (f, ms) => { const t = { at: now + (+ms || 0), f, id: ++seq }; q.push(t); return t.id; }, clearTimeout: (id) => { const i = q.findIndex((t) => t.id === id); if (i >= 0) q.splice(i, 1); },
    async advance(ms) { const end = now + ms; await flush(); for (;;) { q.sort((a, b) => a.at - b.at || a.id - b.id); const t = q[0]; if (!t || t.at > end) break; q.shift(); now = t.at; t.f(); await flush(); } now = end; await flush(); } }; }

function world(o) {
  const C = clock(), W = { ran: 0, tsts: [], look: 0, sup: 0, calls: [], C };
  const go = { onclick: () => { W.ran++; }, dataset: {}, textContent: '시작' };
  /* 목록 답(adminRitualFiles)은 o.listMs 뒤 — o.listFail 이면 실패 */
  /* 파일 답(adminRitualFileGet) — o.fileQ[id] = [[ms, 성공?], …] 차례대로 · 없으면 o.fileMs 뒤 거절 */
  const fetch = (u, opt) => { const b = JSON.parse(opt.body); W.calls.push(b.fn + (b.fn === 'adminRitualFileGet' ? ':' + b.args[1] : ''));
    const fq = b.fn === 'adminRitualFileGet' && o.fileQ && o.fileQ[b.args[1]] && o.fileQ[b.args[1]].length ? o.fileQ[b.args[1]].shift() : null;
    const ms = b.fn === 'adminRitualFiles' ? o.listMs : fq ? fq[0] : (o.fileMs || 10);
    const body = b.fn === 'adminRitualFiles' ? { ok: true, files: o.files || [], sup: {} } : fq && fq[1] ? { ok: true, data: 'AAAA', mime: 'audio/wav' } : { ok: false };
    return new Promise((res, rej) => C.setTimeout(() => { if (b.fn === 'adminRitualFiles' && o.listFail) rej(new Error('net')); else res({ json: () => Promise.resolve({ result: body }) }); }, ms)); };
  const sb = { $: () => go, RF_FRESH: { done: !!o.done, wait: false, ask: null }, RF_ST: o.st || {}, RF_WHY: {}, RF_GEN: {}, RF_SKIP: '', RF_EXEC: 'x', S: { up: o.up || {} },
    rfKeys: () => (o.keysFn ? o.keysFn(sb.S) : o.keys.slice()), esdWant: () => !!o.mu, ESD: { st: '' }, ES: { prepSong: () => ({ x: 1 }) }, esdDecode: () => Promise.resolve({}), esdPrepVoice: () => {}, render: () => {},
    RF_ORIG: {}, CLIPS: {}, RF_OWN: {}, RF_CUR: {}, RF_CACHED: {}, RF_FROM: {}, RF_PUTFAIL: {}, MODE: 'console', paint: () => {}, GUEST: false, QS: { get: (k) => (k === 'rf' ? 'AB12CD' : null) },
    localStorage: { getItem: () => 'TOK' }, toast: (t) => { W.tsts.push(t); }, rfPaint: () => {}, rfWhy: () => '연결이 끊겼어요 (코드 L6)', rfOkSet: () => {}, rfOwnSupPut: () => {},
    rfOwnSupGet: () => { W.sup++; return new Promise((r) => C.setTimeout(() => r(null), 4000)); }, rfSlugOf: (k) => k, rfOwnFall: () => {},
    fetch, AbortController: undefined, setTimeout: C.setTimeout, clearTimeout: C.clearTimeout, Promise, JSON, Object, String, Array, Uint8Array, atob, URL, Blob,
    Date: { now: () => C.now() }, rfFresh: () => new Promise((r) => C.setTimeout(() => r(o.freshFn ? o.freshFn() : null), o.freshMs || 300)) };
  vm.createContext(sb);
  if (o.mu) sb.S.mu = { src: 'up', fid: 'MU', name: '곡' };
  let n = 0; sb.URL = { createObjectURL: () => 'blob:' + (++n) };
  vm.runInContext(['rfBusyNow', 'rfLookNow', 'rfLookBegin', 'rfLookWait', 'rfPending', 'rfReadyWait', 'rfPrefetch', 'rfAgainRun', 'rfGenBump', 'rfFreeze', 'rfSelSig', 'rfSelRefetch', 'rfCurSet', 'rfFreshApply'].map((f) => grabIn(CS, f)).join('\n') + '\n'
    + lineIn(CS, /var RF_LOOK = [^\n]*/) + '\n' + lineIn(CS, /var RF_READY = [^\n]*/) + '\n' + lineIn(CS, /var RF_LATE_SAY = [^\n]*/) + '\n' + iife, sb);
  const bl = sb.rfLookBegin; sb.rfLookBegin = function () { W.look++; return bl(); };
  W.go = go; W.sb = sb;
  /* 칩 누르기 — 원문 칩 onclick 몸통 그대로(OPT · paint 는 가짜) */
  const ci = CS.indexOf('b.onclick = function(){'), cj = CS.indexOf('host.appendChild(b);', ci);
  vm.runInContext('function chipPress(OPT, id, b){ ' + CS.slice(ci, cj) + ' b.onclick(); }', sb);
  W.chip = (key, v) => sb.chipPress({ X: [key, []] }, 'X', { dataset: { v: String(v) } });
  /* 확인 칸의 일반 «다시 받기»(rfAgain) · 늦음 «다시 받기»(rfLate) — rfPaint 가 단추에 거는 호출 그대로 */
  const pt = grabIn(CS, 'rfPaint'), btn = (id) => (pt.match(new RegExp("getElementById\\('" + id + "'\\); if \\(\\w+\\) \\w+\\.onclick = function\\(\\)\\{ ([^}]*?); \\}")) || [])[1];
  W.press = (id) => { const ex = btn(id); if (!ex) throw new Error('단추 ' + id + ' 를 못 찾음'); vm.runInContext(ex, sb); };
  return W; }

await sec('①', async () => {
  /* 오늘 모든 예식 — 두 분 목소리 꺼짐 · 입장 곡도 없음 · 관리 화면은 rf 를 붙여 연다 · 목록 답이 늦다(50초) */
  const W = world({ keys: [], listMs: 50000 });
  W.sb.rfPrefetch(); await W.C.advance(0);
  ok('① 17-01 [RF_NOWAIT_EMPTY] 받을 것이 없으면 목록을 묻는 동안도 «받는 중»이 아니다(RF_FRESH.list 거짓)', !W.sb.RF_FRESH.list && !W.sb.rfPending(), { list: W.sb.RF_FRESH.list });
  W.go.onclick(); await W.C.advance(400);
  ok('① «시작» — 최신 확인(CON_FRESH · 0.3초)만 거쳐 바로 시작 · «새 소리를 받는 중이에요»를 띄우지 않는다', W.ran === 1 && !W.tsts.some((t) => /받는 중/.test(t)), { ran: W.ran, t: W.tsts });
  const W2 = world({ keys: [], listMs: 2000, listFail: true });
  W2.sb.rfPrefetch(); await W2.C.advance(2500);
  ok('① 목록이 실패해도 받을 것이 없으면 기기 표(rfOwnSupGet)를 읽지 않는다 — 그동안 «시작»을 잡지 않게', W2.look === 0 && W2.sup === 0 && !W2.sb.rfPending(), { look: W2.look, sup: W2.sup });
  W2.go.onclick(); await W2.C.advance(400);
  ok('① 그 뒤 «시작»도 바로', W2.ran === 1, W2.ran); });

await sec('②', async () => {
  const W = world({ keys: ['g0'], up: { g0: { id: 'F1' } }, listMs: 3000, done: true });
  W.sb.rfPrefetch(); await W.C.advance(0); W.go.onclick(); await W.C.advance(1000);
  const a = W.ran; await W.C.advance(3000);
  ok('② 받을 줄이 있으면 종전대로 목록 · 파일 받기를 기다린 뒤 한 번 시작([RF_READY_ALL] 그대로)', a === 0 && W.ran === 1 && W.tsts.some((t) => /새 소리를 받는 중이에요/.test(t)), { a, ran: W.ran, t: W.tsts });
  const W3 = world({ keys: [], mu: true, listMs: 3000, done: true });
  W3.sb.rfPrefetch(); await W3.C.advance(0); W3.go.onclick(); await W3.C.advance(1000);
  ok('② 입장 곡만 받을 때도 목록을 기다린다', W3.ran === 0 && !!W3.sb.RF_FRESH.list, { ran: W3.ran }); });

await sec('③', async () => {
  /* 줄 하나가 받는 중(busy)에 멈춰 풀리지 않는다 · 최신 확인은 이미 했다 */
  const W = world({ keys: ['g0', 'g1'], st: { g0: 'busy', g1: 'ok' }, listMs: 1, done: true });
  W.go.onclick(); await W.C.advance(129000); const a = W.ran;
  await W.C.advance(2000);
  ok('③ 17-02 [RF_WAIT_ONCE] 130초 한도에 닿으면 기다림이 끝나 받은 것만으로 한 번 시작', a === 0 && W.ran === 1, { a, ran: W.ran });
  ok('③ 한 줄 «소리 준비가 늦어요 · 없는 줄은 나레이션으로 (코드 L5)»', W.tsts.includes('소리 준비가 늦어요 · 없는 줄은 나레이션으로 (코드 L5)') && W.sb.RF_READY.late === true, W.tsts);
  const left = W.C.q.length; await W.C.advance(300000);
  ok('③ 새 130초 기다림을 다시 걸지 않는다(남은 시계 0 · 300초 뒤에도 시작 한 번)', left === 0 && W.ran === 1 && !W.sb.RF_READY.p, { left, ran: W.ran });
  W.go.onclick(); await W.C.advance(10);
  ok('③ 아직 받는 중이어도 다시 누르면 기다리지 않고 바로', W.ran === 2, W.ran); });

await sec('④', async () => {
  const W = world({ keys: ['g0'], up: { g0: { id: 'F1' } }, st: { g0: 'busy' }, listMs: 5, done: true });
  W.sb.RF_READY.late = true; let ran = false;
  W.press('rfLate'); ran = true;
  ok('④ 늦음 «다시 받기»(rfLate) — 늦음 표시를 걷고 받는 중이던 줄을 다시 받는다', ran && W.sb.RF_READY.late === false && W.calls.includes('adminRitualFiles'), { ran, late: W.sb.RF_READY.late, calls: W.calls });
  const pt = grabIn(CS, 'rfPaint');
  ok('④ 소리 파일 확인 칸 — 늦었으면 같은 줄 + «다시 받기»(rfLate) 하나(일반 단추와 겹치지 않게)', /var _late = [^;]*RF_READY\.late;/.test(pt) && /if \(_late\) _fr \+=/.test(pt) && /RF_LATE_SAY/.test(pt) && /id="rfLate">다시 받기</.test(pt) && /\+ \(!_late && /.test(pt));
  const sb = { window: {} }; vm.createContext(sb); vm.runInContext(EC, sb); const x = sb.window.ME_ERR && sb.window.ME_ERR.explain('L5');
  ok('④ 코드 표 L5 — 기다리다 멈춤 · 콘솔 «소리 준비가 늦어요» 뜻(RF_WAIT_ONCE)', !!x && /기다리다 멈췄어요/.test(x.what) && /소리 준비가 늦어요/.test(x.fix), x); });

await sec('⑤', async () => {
  /* g0 은 바로 받고 g1 은 오래 걸리다(200초) 실패 · 130초에 받은 것만으로 시작 · 그 뒤 일반 «다시 받기» · 새 받기는 5초 */
  const W = world({ keys: ['g0', 'g1'], files: [{ id: 'F0', key: 'g0', name: 'a' }, { id: 'F1', key: 'g1', name: 'b' }], up: { g0: { id: 'F0' }, g1: { id: 'F1' } }, listMs: 5, done: true, fileQ: { F0: [[10, true], [10, true]], F1: [[200000, false], [5000, true]] } });
  W.sb.rfPrefetch(); await W.C.advance(0); W.go.onclick(); await W.C.advance(131000);
  const a = W.ran; await W.C.advance(80000);
  ok('⑤ 130초에 한 번 시작 · 남은 줄은 «받지 못함»으로 끝난다', a === 1 && W.sb.RF_ST.g1 === 'fail', { a, st: W.sb.RF_ST });
  W.press('rfAgain');
  ok('⑤ 18-01(고객) [RF_AGAIN_RESET] 일반 «다시 받기»도 늦음 표시를 걷는다', W.sb.RF_READY.late === false, { late: W.sb.RF_READY.late });
  W.go.onclick(); await W.C.advance(1000); const b = W.ran;
  await W.C.advance(10000);
  ok('⑤ 다음 «시작»은 새 받기를 기다렸다가(1초에 아직) 다 받은 뒤 한 번', b === 1 && W.ran === 2 && W.sb.RF_OWN.g1 === 1, { b, ran: W.ran, own: W.sb.RF_OWN }); });

await sec('⑥', async () => {
  /* g0 은 바로 · g1 과 입장 곡은 150초 뒤에야 성공 답이 온다 */
  const W = world({ keys: ['g0', 'g1'], mu: true, files: [{ id: 'MU', key: 'mu', name: '곡' }, { id: 'F0', key: 'g0', name: 'a' }, { id: 'F1', key: 'g1', name: 'b' }], up: { g0: { id: 'F0' }, g1: { id: 'F1' } }, listMs: 5, done: true,
    fileQ: { F0: [[10, true], [10, true]], F1: [[150000, true], [3000, true]], MU: [[150000, true], [3000, true]] } });
  W.sb.rfPrefetch(); await W.C.advance(0); W.go.onclick(); await W.C.advance(131000);
  const a = W.ran, own0 = !!W.sb.RF_OWN.g1, st0 = W.sb.RF_ST.g1, why0 = W.sb.RF_WHY.g1;
  await W.C.advance(30000);
  ok('⑥ 130초에 받은 것만으로 시작 · 못 받은 줄은 그 자리에서 «받지 못함 · 응답이 늦어요 (코드 L5)»', a === 1 && !own0 && st0 === 'fail' && /코드 L5/.test(why0 || '') && W.sb.ESD.st === 'fail', { a, st0, why0, esd: W.sb.ESD.st });
  ok('⑥ 18-01(당일) [RF_LATE_FREEZE] 늦게 온 성공 답(150초)이 소리를 바꾸지 않는다 — 두 분 소리 · 입장 곡이 진행 중에 붙지 않는다', !W.sb.RF_OWN.g1 && !W.sb.CLIPS.g1 && W.sb.RF_ST.g1 === 'fail' && W.sb.ESD.st === 'fail' && !W.sb.ESD.Sg, { own: W.sb.RF_OWN, clips: W.sb.CLIPS, st: W.sb.RF_ST, esd: W.sb.ESD.st });
  W.press('rfLate'); await W.C.advance(5000);
  ok('⑥ «다시 받기»를 누르면 그때 새 차례로 받아 붙는다(디렉터가 고른 길 하나)', W.sb.RF_OWN.g1 === 1 && W.sb.RF_ST.g1 === 'ok' && W.sb.ESD.st === 'ok' && W.sb.RF_READY.late === false, { own: W.sb.RF_OWN, st: W.sb.RF_ST, esd: W.sb.ESD.st }); });

await sec('⑦', async () => {
  /* 나레이션으로 열고(받을 것 없음) 목록 답은 20초 · 하객 맞이 칩을 «두 분 목소리»로 */
  const W = world({ keysFn: (S) => (S.guestVoice === 'couple' ? ['g0'] : []), files: [{ id: 'F0', key: 'g0', name: 'a' }], up: { g0: { id: 'F0' } }, listMs: 20000, done: true, fileQ: { F0: [[3000, true], [3000, true]] } });
  W.sb.S.guestVoice = 'nar'; W.sb.rfPrefetch(); await W.C.advance(0);
  const l0 = !!W.sb.RF_FRESH.list;
  W.chip('guestVoice', 'couple'); await W.C.advance(0);
  ok('⑦ 18-02(당일) [RF_SEL_REFETCH] 칩을 «두 분 목소리»로 바꾸면 need 를 다시 재 목록을 «받는 중»으로', !l0 && W.sb.S.guestVoice === 'couple' && !!W.sb.RF_FRESH.list, { l0, list: W.sb.RF_FRESH.list });
  W.go.onclick(); await W.C.advance(1000); const a = W.ran;
  await W.C.advance(30000);
  ok('⑦ «시작»은 목록 · 파일을 기다렸다가 두 분 소리가 붙은 뒤 한 번', a === 0 && W.ran === 1 && W.sb.RF_OWN.g0 === 1, { a, ran: W.ran, own: W.sb.RF_OWN });
  W.chip('guestVoice', 'nar'); await W.C.advance(0);
  ok('⑦ 다시 «나레이션»으로 바꾸면 두 분 소리를 걷어 나레이션으로 되돌린다', !W.sb.RF_OWN.g0 && !W.sb.RF_FRESH.list && !W.sb.rfPending(), { own: W.sb.RF_OWN, list: W.sb.RF_FRESH.list }); });

await sec('⑧', async () => {
  /* 열 때 g0 은 받고 g1 은 실패 · «시작»(최신 확인 중) · «다시 받기»로 g1 이 오래 걸림 · «시작»을 다시 눌러 기다림 · 최신 확인이 «새로 저장된 소리»(g1 → F2) ·
     40초에 «다시 불러오기» — 새 목록 50초 · 새 파일 50초(옛 시계라면 130.3초에 굳혀 버린다) */
  const o8 = { keys: ['g0', 'g1'], files: [{ id: 'F0', key: 'g0', name: 'a' }, { id: 'F1', key: 'g1', name: 'b' }, { id: 'F2', key: 'g1', name: 'c' }], up: { g0: { id: 'F0' }, g1: { id: 'F1' } }, listMs: 5, done: false, freshMs: 1000,
    freshFn: () => ({ keys: ['g1'], up: { g0: { id: 'F0' }, g1: { id: 'F2' } }, sel: null }), fileQ: { F0: [[10, true], [10, true], [10, true]], F1: [[10, false], [300000, false]], F2: [[50000, true]] } }, W = world(o8), T0 = W.C.now();
  W.sb.rfPrefetch(); await W.C.advance(50);
  W.go.onclick(); await W.C.advance(50);   // 시작 — 최신 확인 중(1초)
  W.sb.rfAgainRun(); await W.C.advance(100);   // 다시 받기 — g1 이 오래 걸린다
  W.go.onclick(); const live = !!W.sb.RF_READY.p; await W.C.advance(1000);   // 시작 다시 — 기다림 · 그 사이 최신 확인 답 «새로 저장된 소리»
  const noticed = !!W.sb.RF_FRESH.ask, p0 = !!W.sb.RF_READY.p;
  await W.C.advance(T0 + 40000 - W.C.now()); o8.listMs = 50000; W.sb.rfFreshApply(); await W.C.advance(0);   // 40초에 «다시 불러오기» — 새 목록 50초
  ok('⑧ 19-01(고객) [RF_WAIT_GEN] 안내로 시작 예약이 버려지면 옛 기다림(시계 · 약속)도 끝난다', live && noticed && !p0, { live, noticed, p0 });
  await W.C.advance(120000);
  ok('⑧ 옛 130초 시계가 «다시 불러오기»의 새 받기를 굳히지 않는다 — 새 파일 F2 가 붙는다 · 늦음 아님', W.sb.RF_ST.g1 === 'ok' && W.sb.RF_OWN.g1 === 1 && W.sb.RF_CUR.g1 && W.sb.RF_CUR.g1.id === 'F2' && !W.sb.RF_READY.late && W.ran === 0, { st: W.sb.RF_ST, why: W.sb.RF_WHY, late: W.sb.RF_READY.late, ran: W.ran });
  W.go.onclick(); await W.C.advance(10);
  ok('⑧ 그 뒤 «시작»은 새 소리로 바로 한 번', W.ran === 1, W.ran);
  /* 기다리는 «시작» + 100초에 «다시 받기»(새 파일 50초) — 새 받기는 새 130초 */
  const V = world({ keys: ['g0'], files: [{ id: 'F0', key: 'g0', name: 'a' }], up: { g0: { id: 'F0' } }, listMs: 5, done: true, fileQ: { F0: [[300000, false], [50000, true]] } });
  V.sb.rfPrefetch(); await V.C.advance(10); V.go.onclick(); await V.C.advance(100000);
  V.sb.rfAgainRun(); await V.C.advance(35000); const a = V.ran, late = V.sb.RF_READY.late;
  await V.C.advance(20000);
  ok('⑧ [RF_WAIT_GEN] 기다리는 사이 새 받기 — 처음 시계(130초)로 굳히지 않고 새 받기를 기다렸다가 두 분 소리로 한 번 시작', a === 0 && !late && V.ran === 1 && V.sb.RF_OWN.g0 === 1 && !V.sb.RF_READY.late, { a, late, ran: V.ran, own: V.sb.RF_OWN, st: V.sb.RF_ST }); });

await sec('⑨', async () => {
  /* 열 때 g0 은 받고 g1 은 실패 · «다시 받기» — g0 · g1 다시 받기가 둘 다 오래 걸린다 · «시작» 130초로 굳힘 */
  const W = world({ keys: ['g0', 'g1'], files: [{ id: 'F0', key: 'g0', name: 'a' }, { id: 'F1', key: 'g1', name: 'b' }], up: { g0: { id: 'F0' }, g1: { id: 'F1' } }, listMs: 5, done: true, fileQ: { F0: [[10, true], [300000, true]], F1: [[10, false], [300000, true]] } });
  W.sb.rfPrefetch(); await W.C.advance(50); const c0 = W.sb.CLIPS.g0;
  W.sb.rfAgainRun(); await W.C.advance(50); const busy = W.sb.RF_ST.g0;
  W.go.onclick(); await W.C.advance(131000);
  ok('⑨ 19-01(당일) [RF_FREEZE_TRUE] 굳힐 때 이미 물린 지금 파일(같은 id)은 «받아 둠» 그대로 — 화면과 나가는 소리가 같다', busy === 'busy' && W.ran === 1 && W.sb.RF_ST.g0 === 'ok' && W.sb.RF_OWN.g0 === 1 && W.sb.CLIPS.g0 === c0 && !W.sb.RF_WHY.g0, { busy, ran: W.ran, st: W.sb.RF_ST, why: W.sb.RF_WHY, own: W.sb.RF_OWN });
  ok('⑨ 받은 적 없는 줄은 «받지 못함 · L5» · 나레이션', W.sb.RF_ST.g1 === 'fail' && /코드 L5/.test(W.sb.RF_WHY.g1 || '') && !W.sb.RF_OWN.g1 && !W.sb.CLIPS.g1, { st: W.sb.RF_ST, own: W.sb.RF_OWN });
  /* 다시 받으려던 파일이 지금 물린 것과 다르다(F0 → F9) — 나레이션으로 나가니 두 분 파일 연결을 걷는다 */
  const V = world({ keys: ['g0'], files: [{ id: 'F0', key: 'g0', name: 'a' }, { id: 'F9', key: 'g0', name: 'z' }], up: { g0: { id: 'F0' } }, listMs: 5, done: true, fileQ: { F0: [[10, true]], F9: [[300000, true]] } });
  V.sb.rfPrefetch(); await V.C.advance(50); const o0 = V.sb.RF_OWN.g0;
  V.sb.S.up = { g0: { id: 'F9' } }; V.sb.RF_ST.g0 = 'fail'; V.sb.rfAgainRun(); await V.C.advance(50);
  V.go.onclick(); await V.C.advance(131000);
  ok('⑨ [RF_FREEZE_TRUE] «받지 못함 · 나레이션으로 나감»인 줄은 두 분 소리 연결(RF_OWN · CLIPS)을 걷는다 — 실제로 나레이션이 나간다', o0 === 1 && V.ran === 1 && V.sb.RF_ST.g0 === 'fail' && !V.sb.RF_OWN.g0 && !V.sb.CLIPS.g0 && !V.sb.RF_CUR.g0, { o0, ran: V.ran, st: V.sb.RF_ST, own: V.sb.RF_OWN, clips: V.sb.CLIPS }); });

console.log(fail ? `\n✗ CON_START_NOWAIT 실패 ${fail}건` : '\n✓ CON_START_NOWAIT — 시작 기다림 통과');
process.exit(fail ? 1 : 0);
