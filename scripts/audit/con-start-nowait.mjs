#!/usr/bin/env node
/* ★★[CON_START_NOWAIT · RF_NOWAIT_EMPTY · RF_WAIT_ONCE 2026-10-31 GPT 17차 점검(당일 17-01 · 17-02)]
   당일 콘솔 «시작»의 기다림을 원문 조각(vm)으로 잰다 — 옛 판(CSN_CS 로 옛 console.html 을 주면)에서는 ① ③ 이 빨강이어야 한다.
   ① 17-01 [RF_NOWAIT_EMPTY] 받을 두 분 소리도 입장 곡도 없는 예식 + 파일 목록 답이 늦다 → «시작»이 목록을 기다리지 않는다(최신 확인 CON_FRESH 만 거쳐 바로)
   ② 받을 줄이 있으면 종전대로 목록 · 파일 받기를 기다린다(RF_READY_ALL 그대로)
   ③ 17-02 [RF_WAIT_ONCE] 받기가 130초 넘게 안 끝나면 기다림은 한 번만 끝난다 — 받은 것만으로 시작 · L5 한 줄 · 새 기다림을 다시 걸지 않는다 · 다시 눌러도 바로
   ④ 다시 받기(rfAgainRun(true))는 늦음 표시를 걷고 다시 받는다 · 확인 칸에 같은 줄 + 단추 · 코드 표에 L5 뜻
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
  const fetch = (u, opt) => { const b = JSON.parse(opt.body); W.calls.push(b.fn);
    return new Promise((res, rej) => C.setTimeout(() => { if (b.fn === 'adminRitualFiles' && o.listFail) rej(new Error('net')); else res({ json: () => Promise.resolve({ result: b.fn === 'adminRitualFiles' ? { ok: true, files: [], sup: {} } : { ok: false } }) }); }, b.fn === 'adminRitualFiles' ? o.listMs : (o.fileMs || 10))); };
  const sb = { $: () => go, RF_FRESH: { done: !!o.done, wait: false, ask: null }, RF_ST: o.st || {}, RF_WHY: {}, RF_GEN: {}, RF_SKIP: '', RF_EXEC: 'x', S: { up: o.up || {} },
    rfKeys: () => o.keys.slice(), esdWant: () => !!o.mu, ESD: { st: '' }, GUEST: false, QS: { get: (k) => (k === 'rf' ? 'AB12CD' : null) },
    localStorage: { getItem: () => 'TOK' }, toast: (t) => { W.tsts.push(t); }, rfPaint: () => {}, rfWhy: () => '연결이 끊겼어요 (코드 L6)', rfOkSet: () => {}, rfOwnSupPut: () => {},
    rfOwnSupGet: () => { W.sup++; return new Promise((r) => C.setTimeout(() => r(null), 4000)); }, rfSlugOf: (k) => k, rfOwnFall: () => {},
    fetch, AbortController: undefined, setTimeout: C.setTimeout, clearTimeout: C.clearTimeout, Promise, JSON, Object, String, Array, Uint8Array, atob, URL, Blob,
    Date: { now: () => C.now() }, rfFresh: () => new Promise((r) => C.setTimeout(() => r(null), o.freshMs || 300)) };
  vm.createContext(sb);
  vm.runInContext(['rfBusyNow', 'rfLookNow', 'rfLookBegin', 'rfLookWait', 'rfPending', 'rfReadyWait', 'rfPrefetch'].map((f) => grabIn(CS, f)).join('\n') + '\n'
    + lineIn(CS, /var RF_LOOK = [^\n]*/) + '\n' + lineIn(CS, /var RF_READY = [^\n]*/) + '\n' + lineIn(CS, /var RF_LATE_SAY = [^\n]*/) + '\n' + iife, sb);
  const bl = sb.rfLookBegin; sb.rfLookBegin = function () { W.look++; return bl(); };
  W.go = go; W.sb = sb; return W; }

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
  const ar = grabIn(CS, 'rfAgainRun');
  if (ar) { vm.runInContext(ar, W.sb); W.sb.rfAgainRun(true); ran = true; }
  ok('④ «다시 받기»(rfAgainRun(true)) — 늦음 표시를 걷고 받는 중이던 줄을 다시 받는다', ran && W.sb.RF_READY.late === false && W.calls.includes('adminRitualFiles'), { ran, late: W.sb.RF_READY.late, calls: W.calls });
  const pt = grabIn(CS, 'rfPaint');
  ok('④ 소리 파일 확인 칸 — 늦었고 아직 받는 중이면 같은 줄 + «다시 받기»(rfLate)', /RF_READY && RF_READY\.late && rfPending\(\)/.test(pt) && /RF_LATE_SAY/.test(pt) && /id="rfLate">다시 받기</.test(pt) && /rfAgainRun\(true\)/.test(pt));
  const sb = { window: {} }; vm.createContext(sb); vm.runInContext(EC, sb); const x = sb.window.ME_ERR && sb.window.ME_ERR.explain('L5');
  ok('④ 코드 표 L5 — 기다리다 멈춤 · 콘솔 «소리 준비가 늦어요» 뜻(RF_WAIT_ONCE)', !!x && /기다리다 멈췄어요/.test(x.what) && /소리 준비가 늦어요/.test(x.fix), x); });

console.log(fail ? `\n✗ CON_START_NOWAIT 실패 ${fail}건` : '\n✓ CON_START_NOWAIT — 시작 기다림 통과');
process.exit(fail ? 1 : 0);
