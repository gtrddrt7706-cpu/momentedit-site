#!/usr/bin/env node
/* ★[VC_FIX6_1030 2026-10-30 GPT 6차 점검(다섯 사람 걷기 · 당일 진행)] 5차에서 고친 자리의 회귀 넷을 잰다(함수 원문을 떼어 vm 으로).
   마이페이지(mypage.html)
   ① [RELOGIN_KEEP]     «로그인하기»(로그인 풀림)로 로그인 화면에 갈 때 저장 못 한 식순 초안을 계정 코드에 묶어 맡기고 · 같은 코드로 로그인하면 되돌린다
                        · 다른 계정 · 7일 지남 · 스스로 로그아웃이면 지운다 · 로그인 칸 글은 «다시 로그인한 뒤 이어서 저장해 주세요 (코드 S8)»
   당일 콘솔(console.html)
   ② [RF_LIST_GEN]      «다시 불러오기» 뒤 처음 열 때 보낸 옛 목록 답이 먼저 와도 잠금을 풀거나 쓰지 않는다(새 목록 답만)
   ③ [PLAY_GEN]         앞 두 분 소리의 재생 요청이 늦게 실패해도(입장으로 건너뛴 뒤의 AbortError 등) «두 분 소리 대신 나레이션으로» · 앞자리 성우를 내지 않는다
   ④ [STALL_HOLD_CLOCK] 소리가 멈춘 채(CON_STALL)면 시각 큐도 저절로 나가지 않는다 · 디렉터가 순서를 내면 풀린다
   깨 보기: 고친 줄을 옛 꼴로 되돌려 같은 장면이 빨개지는지 본다.
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const grabIn = (src, name) => { let i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const brk = (src, pairs) => { let t = src; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
const flush = () => new Promise((r) => setTimeout(r, 0));

/* ───────── ① 마이페이지 · 로그인하기 뒤 초안 ───────── */
const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const mkStore = (init) => { const m = new Map(Object.entries(init || {}));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; } }; };
function mp1(src, o) {
  const code = ['clearToken', '_reloginStash', '_reloginCode', '_reloginAcct', '_reloginPack', '_reloginLine', '_reloginRestore', '_reloginCurNewer', '_reloginFailShow', '_reloginGoAnyway', '_reloginShowLogin', '_errGoLogin', '_acctOk', '_ordK', '_keepK', '_recE', '_acctOldSweep'].map((f) => grabIn(src, f)).join('\n')   /* [ACCT_KEYS] 계정 칸 */ + '\n' + lineIn(src, /var RELOGIN_KEY=[^\n]*/) + '\n' + lineIn(src, /var ERR_W=[^\n]*/) + '\n' + lineIn(src, /var ERR_DO=[^\n]*/);
  const draft = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '고친 서약' } }, who: 'AB12CD', dirty: true, base: 'k0' });
  const OK = 'me_order_AB12CD', KK = 'me_relogin_keep_AB12CD';   // [ACCT_KEYS]
  const ls = mkStore({ me_token: 't', me_state_v1: '{}', [OK]: draft, me_snapLocal_AB12CD: '{"n":1}' }), ss = mkStore();
  let reloaded = 0; const sb = { localStorage: ls, sessionStorage: ss, TOKEN_KEY: 'me_token', STATE_CACHE_KEY: 'me_state_v1', _mpAcctSweep: () => {}, _mpAcct: () => o.acct || '', readCachedState: () => null, mpAlert: () => {}, mpConfirm: () => Promise.resolve(false), _errHtml: (x) => String(x),   /* [RELOGIN_STASH_FIRST] 7차 */
    _errLine: () => '로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 S8)', _wizCurId: () => 'order', _mpFsOpen: () => false, location: { reload: () => { reloaded++; } },
    closeLedModal: () => {}, _flowBusy: () => {}, show: () => {}, softLoginNote: () => {}, JSON, Date, Object, String, Math };
  vm.createContext(sb); vm.runInContext(code, sb);
  sb._errGoLogin({ ok: false, ecode: 'S8' }, 'S');
  const after = { order: ls.getItem(OK), note: ss.getItem('me_login_note'), reloaded };
  if (o.age) { const k = JSON.parse(ls.getItem(KK) || 'null'); if (k) { k.t -= o.age; ls.setItem(KK, JSON.stringify(k)); } }
  if (o.logout) sb.clearToken();
  const back = sb._reloginRestore(o.login);
  return { after, back, order: ls.getItem(OK), snap: ls.getItem('me_snapLocal_AB12CD'), keep: ls.getItem(KK), oz: ls.getItem('me_order_ZZ99ZZ'), draft };
}
{ const miss = ['clearToken', '_reloginStash', '_reloginCode', '_reloginAcct', '_reloginPack', '_reloginLine', '_reloginRestore', '_reloginCurNewer', '_reloginFailShow', '_reloginGoAnyway', '_reloginShowLogin', '_errGoLogin'].filter((f) => !grabIn(MP, f)); if (miss.length) ok('① 원문 조각을 못 떼었다 — ' + miss.join(', '), false); else {
  const t = (src) => { try { return { same: mp1(src, { acct: 'AB12CD', login: 'AB12CD' }), other: mp1(src, { acct: 'AB12CD', login: 'ZZ99ZZ' }), old: mp1(src, { acct: 'AB12CD', login: 'AB12CD', age: 8 * 864e5 }), out: mp1(src, { acct: 'AB12CD', login: 'AB12CD', logout: true }) }; } catch (e) { return { err: String(e && e.stack || e).slice(0, 300) }; } };
  const r = t(MP);
  const pass = !r.err && r.same.after.order === null && /다시 로그인한 뒤 이어서 저장해 주세요 \(코드 S8\)/.test(r.same.after.note || '') && r.same.back === true && r.same.order === r.same.draft && r.same.snap === '{"n":1}' && r.same.keep === null
    && r.other.back === false && r.other.order === null && r.other.oz === null && r.other.keep !== null && r.old.back === false && r.old.order === null && r.out.back === false && r.out.order === null && r.out.keep === null;
  ok('① [RELOGIN_KEEP] 로그인하기 → 초안을 계정에 묶어 맡김 · 같은 코드 로그인이면 되돌림(식순 · 스냅 임시본) · 다른 계정에는 싣지 않음([ACCT_KEYS] 그 계정 맡김 칸 그대로) · 7일 · 스스로 로그아웃이면 지움 · 로그인 칸 «이어서 저장»', pass, r.err || { same: [r.same.after, r.same.back, !!r.same.order], other: [r.other.back, r.other.keep], old: r.old.back, out: [r.out.back, r.out.keep] });
  const b = brk(MP, [['var line=_errLine(x, L), _kp=clearToken(true);', 'var line=_errLine(x, L), _kp=clearToken();']]); const rb = b ? t(b) : null;
  ok('깨 보기 ① — 옛 꼴(clearToken 이 초안을 그냥 지움)이면 빨강', !!rb && !rb.err && rb.same.back === false && rb.same.order === null, rb && (rb.err || rb.same));
  ok('① [RELOGIN_KEEP] 로그인 성공(getMyState)에서 화면을 그리기 전에 같은 코드의 맡긴 초안을 되돌린다', /if \(d && d\.ok\)\{ (?:_orderOwnerSweep\(d\.code\); )?_reloginRestore\(d\.code\); cacheState\(d\); renderMyPage\(d\);/.test(MP));
  ok('① [RELOGIN_KEEP] 상태 · 알림 링크의 로그인 풀림도 맡긴다(clearToken(true)) · 스스로 로그아웃은 맡기지 않는다', (MP.match(/clearToken\(true\)/g) || []).length >= 3 && /function _mpLogoutNow\(\)\{ (?:if\(typeof _tabDrop=='function' && _tabDrop\(\)\) return; )?clearToken\(\);/.test(MP)); } }

/* ───────── 콘솔 ───────── */
const CS = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
{ /* ② RF_LIST_GEN */
  const iife = (src) => { const i = src.indexOf("(function(){ var go = $('#go'), run = go.onclick;"); if (i < 0) return ''; const j = src.indexOf('})();', i); return src.slice(i, j + 5); };
  const mk = (src) => { const code = ['rfWhy', 'rfPrefetch', 'rfFreshApply', 'rfBusyNow'].map((f) => grabIn(src, f)).join('\n') + '\nvar RF_WHY = {}, RF_SKIP = "", RF_GEN = {};\n' + iife(src);
    const pend = {}; let ran = 0, nList = 0; class B { constructor(a) { this.s = String.fromCharCode.apply(null, Array.from(a[0])); } }
    const go = { onclick: () => { ran++; }, dataset: {}, textContent: '시작' };
    const sb = { $: () => go, QS: { get: () => 'AB12CD' }, localStorage: { getItem: () => 'tok' }, GUEST: false, S: { up: { g0: { id: 'A' } } }, rfPaint: () => {}, rfKeys: () => ['g0'], rfSlugOf: () => 'guest-1-arrival', esdWant: () => false, esdPrepVoice: () => {}, render: () => {}, toast: () => {}, rfFresh: () => Promise.resolve(null),
      CLIPS: {}, RF_ORIG: {}, RF_OWN: {}, RF_ST: {}, RF_FRESH: { done: true, ask: null }, RF_EXEC: 'x', atob: (s) => Buffer.from(s, 'base64').toString('binary'), Uint8Array, Blob: B, URL: { createObjectURL: (b) => 'blob:' + b.s }, setTimeout, clearTimeout, AbortController,
      fetch: (u, o) => { const q = JSON.parse(o.body); const n = q.fn === 'adminRitualFiles' ? nList++ : -1, key = n >= 0 ? 'list' + n : q.args[1];
        /* 처음 열 때의 목록(list0)에는 새 파일 B 가 아직 없다 · 다시 불러온 목록(list1)에는 있다 */
        return new Promise((res) => { pend[key] = () => res({ json: () => (n === 0 ? { ok: true, files: [{ id: 'A' }] } : n > 0 ? { ok: true, files: [{ id: 'A' }, { id: 'B' }] } : { ok: true, data: Buffer.from(q.args[1]).toString('base64'), mime: 'audio/wav' }) }); }); } };
    vm.createContext(sb); vm.runInContext(code, sb); return { sb, pend, go, ran: () => ran }; };
  const sc = async (src) => { const W = mk(src); W.sb.rfPrefetch();   // 처음 열 때 · 목록(list0) 대기
    W.sb.RF_FRESH.ask = { keys: ['g0'], up: { g0: { id: 'B' } } }; W.sb.rfFreshApply(); await flush();   // «다시 불러오기» · 목록(list1) 대기
    W.pend.list0(); for (let i = 0; i < 6; i++) await flush(); W.go.onclick(); const early = W.ran(), listLock = !!W.sb.RF_FRESH.list;
    if (W.pend.list1) W.pend.list1(); for (let i = 0; i < 6; i++) await flush(); if (W.pend.B) W.pend.B(); for (let i = 0; i < 6; i++) await flush(); W.go.onclick();
    return { early, listLock, after: W.ran(), clip: W.sb.CLIPS['guest-1-arrival'] || '' }; };
  let r; try { r = await sc(CS); } catch (e) { r = { err: String(e).slice(0, 200) }; }
  ok('② [RF_LIST_GEN] 옛 목록 답이 먼저 와도 «시작»은 기다리고(잠금 그대로) · 새 목록 · 새 소리를 받은 뒤 새 소리(B)로 시작', !r.err && r.early === 0 && r.listLock && r.after === 1 && r.clip === 'blob:B', r);
  const b = brk(CS, [['if (lg !== RF_FRESH.lgen) return; var L = x.L', 'var L = x.L']]); try { r = b ? await sc(b) : null; } catch (e) { r = { err: String(e) }; }
  ok('깨 보기 ② — 옛 꼴이면 빨강', !!r && !r.err && r.early === 1, r); }
{ /* ③ PLAY_GEN */
  const run3 = async (src, how) => { const code = grabIn(src, 'playSrc') + '\n' + grabIn(src, 'playClip'); const T = []; let rej = null; const plays = [], toasts = [], cards = []; let doneN = 0;
    const aN = { duration: NaN, currentTime: 0, paused: false, ended: false, src: '', _pg: 4, play() { plays.push(this.src); return new Promise((res, rj) => { rej = rj; }); }, pause() { this.paused = true; }, getAttribute(k) { return k === 'src' ? this.src : ''; } };
    const c = { slug: 'guest-4-1min', no: '04', file: '04_g', est: 6 };
    const sb = { aNarr: aN, timers: [], stopProg: () => {}, runProg: () => {}, gUnlockOff: () => {}, GUEST: false, MODE: 'console', wired: true, AC: { state: 'running' }, cur: 3, phase: 'clip', render: () => {}, toast: (m) => toasts.push(m), conStall: () => {},
      esdTry: () => false, STORY: null, srcOf: () => 'blob:own', recOk: () => true, narOf: () => '/n/04_g.mp3', RF_OWN: { 'guest-4-1min': 1 }, CLIPS: { 'guest-4-1min': 'blob:own' }, fallbackCard: (cc, w) => cards.push(w),
      setTimeout: (f) => { T.push(f); return T.length; }, clearTimeout: () => {}, Math, isFinite };
    vm.createContext(sb); vm.runInContext(code, sb); sb.playClip(c, () => { doneN++; });
    if (how === 'jump') { aN.onended = aN.onerror = aN.onloadedmetadata = null; aN.pause(); aN._pg++; rej({ name: 'AbortError', message: 'interrupted by pause' }); }   // fire() 가 하는 일 → 늦은 AbortError
    else if (how === 'late') { aN._pg++; rej({ name: 'NotAllowedError', message: 'x' }); }   // 순서가 바뀐 뒤 늦게 온 다른 실패
    else rej({ name: 'NotSupportedError', message: 'x' });   // 지금 순서의 진짜 실패 — 종전대로 나레이션으로
    for (let i = 0; i < 6; i++) await flush(); return { plays: plays.length, toasts, cards, doneN }; };
  let j, l, n; try { j = await run3(CS, 'jump'); l = await run3(CS, 'late'); n = await run3(CS, 'now'); } catch (e) { j = { err: String(e).slice(0, 200) }; }
  ok('③ [PLAY_GEN] 입장으로 건너뛴 뒤 앞 두 분 소리의 늦은 AbortError · 다른 실패는 버린다(«두 분 소리 대신 나레이션으로» · 앞자리 성우 · 글 카드 없음)', !j.err && j.plays === 1 && !j.toasts.length && !j.cards.length && j.doneN === 0 && l.plays === 1 && !l.toasts.length && !l.cards.length, { j, l });
  ok('③ [PLAY_GEN] 지금 순서의 진짜 재생 실패는 종전대로 그 자리 나레이션으로(CON_OWN_FALL)', !!n && n.plays === 2 && n.toasts.length === 1, n);
  const b = brk(CS, [['    if (pg !== aNarr._pg) return;   /*', '    /*'], ["function(e){ if (e && e.name === 'AbortError') return; settle(false, '재생 막힘', e); }", "function(e){ if (e && e.name === 'AbortError' && aNarr.getAttribute('src') !== url) return; settle(false, '재생 막힘', e); }"]]);
  try { j = b ? await run3(b, 'jump') : null; } catch (e) { j = { err: String(e) }; }
  ok('깨 보기 ③ — 옛 꼴이면 빨강', !!j && !j.err && j.toasts.length === 1 && j.plays === 2, j);
  /* fire · [뒤로] · 전체 정지가 차례를 올린다 */
  const fi = grabIn(CS, 'fire'); const aN = { paused: false, _pg: 2, pause() { this.paused = true; } };
  const sb = { R: { cues: [{ k: 'g', name: '하객', duck: -20 }, { k: 'entry', slug: 'entry-A', name: '입장', duck: -20 }] }, aNarr: aN, finish: () => {}, clearT: () => {}, conMark: () => {}, STALL: -1, cur: 0, fired: {}, shown: {}, GWHY: null, liveT0: 0, castNow: null, blkFresh: false, blkNow: '', phase: 'live', cheerAt: -1,
    resolve: (c) => c, ESD: { run: null }, esdIn: () => true, esdMain: () => true, esdStop: () => {}, doorMark: () => {}, segGo: () => {}, segOfCue: () => '', render: () => {}, audioOn: () => {}, duckTo: () => {}, playClip: () => {}, toast: () => {}, later: () => {},
    PARAM: { duck: { leadMs: 800 }, fadeDownMs: 400 }, MODE: 'console', duckWant: -20, GUEST: false, fmt: (x) => String(x) };
  let fired = false; try { vm.createContext(sb); vm.runInContext(fi, sb); sb.fire(1); fired = aN._pg === 3; } catch (e) {}
  ok('③ [PLAY_GEN] 새 순서(fire) · [뒤로] · 전체 정지가 재생 차례를 올린다', fired && /\$\('#bBack'\)\.onclick = function\(\)\{\n  clearT\(\);\n  try \{ aNarr\.pause\(\); aNarr\.currentTime = 0; \} catch\(e\)\{\}\n  aNarr\._pg = \(aNarr\._pg \|\| 0\) \+ 1;/.test(CS) && /function panic\(\)\{\n  clearT\(\);\n  try \{ aNarr\.pause\(\); aNarr\.currentTime = 0; \} catch\(e\)\{\}\n  aNarr\._pg = \(aNarr\._pg \|\| 0\) \+ 1;/.test(CS)); }
{ /* ④ STALL_HOLD_CLOCK */
  const run4 = (src, stall) => { const code = grabIn(src, 'tick'); let fired = -1; const now = Date.now();
    const sb = { R: { cues: [{ fire: 'manual' }, { fire: 'clock', atMin: 0, name: '개식' }] }, startAt: now - 5000, MODE: 'console', phase: 'done', STALL: stall, fired: {}, fire: (i) => { fired = i; }, $: () => ({ textContent: '' }), Date };
    vm.createContext(sb); vm.runInContext(code, sb); sb.tick(); return fired; };
  let a, b0; try { a = run4(CS, 0); b0 = run4(CS, -1); } catch (e) { a = 'err ' + String(e).slice(0, 200); }
  ok('④ [STALL_HOLD_CLOCK] 소리가 멈춘 채(STALL)면 개식 시각이 되어도 시각 큐가 저절로 나가지 않는다 · 멈춤이 없으면 종전대로 나간다', a === -1 && b0 === 1, { a, b0 });
  const b = brk(CS, [[" || phase === 'live' || STALL >= 0) return;", " || phase === 'live') return;"]]); let r = null; try { r = b ? run4(b, 0) : null; } catch (e) {}
  ok('깨 보기 ④ — 옛 꼴이면 빨강', r === 1, r);
  ok('④ [STALL_HOLD_CLOCK] 멈춤은 디렉터가 순서를 낼 때(fire) · 새로 시작할 때(resetRun)만 걷힌다', /STALL = -1; conMark\(i\);/.test(CS) && /function resetRun\(\)\{\n[^\n]*STALL = -1;/.test(CS) && /function conStall\(\)\{ STALL = cur; phase = 'done';/.test(CS)); }

console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC FIX6 1030 OK'); process.exit(fail ? 1 : 0);
