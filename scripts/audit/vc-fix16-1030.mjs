#!/usr/bin/env node
/* ★★[VC_FIX16_1030 · OLD_DRAFT_OFFER · MS_SET · RF_READY_ALL 2026-10-30 GPT 16차 점검(고객 16-01 ~ 16-05 · 당일 16-01 · 16-02)]
   원문 조각을 vm 으로 떼어 장면마다 잰다 — 옛 판(V16_MP · V16_OP · V16_CS · V16_GS 로 옛 파일을 주면)에서는 고친 항목마다 빨강이어야 한다.
   ① 고객 16-02 옮긴 뒤에도 배포 전 창이 옛 공용 me_order 에 더 고쳤다 → 마이페이지가 «예전 고침» 한 줄을 띄우고 · 불러오기 = 지금 계정 칸을 _prev 로 먼저 남기고 예비본을 계정 칸으로
   ② 고객 16-01 베끼기에 실패한 긴 원본 · 계정 칸에는 짧은 서버 판(저장 안 한 고침 아님)이 생겼다 → 다시 열면 한 줄이 뜬다 · 서버 저장 성공으로 예비본을 지우지 않는다
   ③ [OLD_DRAFT_OFFER] 닫기 = 같은 내용으로는 다시 묻지 않는다(내용이 바뀌면 다시) · 옮기기가 베낀 예비본은 묻지 않는다 · 계정 칸이 더 나중 고침이면 묻지 않는다
   ④ [OLD_DRAFT_OFFER] 예비본 지우기 = 스스로 로그아웃 · 예비본이 스스로 마지막으로 쓰인 때에서 30일(내용이 바뀌면 그때부터 다시) — 옮긴 표시와 상관없이
   ⑤ 고객 16-03 마지막 사용(w)은 작은 칸(me_order_w_<코드>)에 — 마이페이지 · 식순 화면이 초안 본문을 다시 쓰지 않는다(그 사이 다른 창의 입력을 덮지 않는다)
   ⑥ 고객 16-04 [MS_SET] 목소리 상태 합치기 — 시각(purgedMs · practiceMs · phrase.ms)은 더하지 않는다 · 세는 칸은 그대로 더한다
   ⑦ 고객 16-05 · 당일 16-01 [RF_READY_ALL] 처음 열 때도 파일 받기(busy)가 끝날 때까지 «시작»이 기다린다 · 목록을 묻는 동안도 · 다 받으면 다시 검사해 시작
   ⑧ 당일 16-02 [RF_READY_ALL] 기다리는 사이 «새로 저장된 소리가 있어요»가 뜨면 앞서 기다리던 «시작»은 버린다 · 디렉터가 다시 누르면 그 창 그대로 시작
   ⑨ 브라우저 — 390 마이페이지에 옛 공용 me_order(저장 안 한 고침) + 다른 계정 칸을 심으면 한 줄이 뜨고 · 불러오기 · _prev · 닫은 뒤 다시 안 뜬다(스크린샷)
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const R = (f, env) => fs.readFileSync(process.env[env] || path.join(ROOT, f), 'utf8');
const MP = R('mypage.html', 'V16_MP'), OP = R('order-preview.html', 'V16_OP'), CS = R('console.html', 'V16_CS'), GS = R('automation/platform/80_production.gs', 'V16_GS');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 600)}`); if (!c) fail++; };
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const flush = async (n) => { for (let i = 0; i < (n || 8); i++) await new Promise((r) => setTimeout(r, 0)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
let NOW = Date.parse('2026-10-30T03:00:00Z'); const DAY = 864e5;
const FakeDate = class extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
async function sec(name, fn) { try { await fn(); } catch (e) { ok(name + ' — 재다가 멈췄다', false, String(e && e.stack || e).split('\n').slice(0, 2).join(' ')); } }

/* ───────── 이 기기 저장소(마이페이지 조각) ───────── */
const A = 'AAAAAA', OK_A = 'me_order_' + A, FLAG_A = 'me_mig_done_' + A, X_A = 'me_mig_x_' + A, PREV_A = OK_A + '_prev', W_A = 'me_order_w_' + A;
const DR = (tx, who, t, dirty, extra) => JSON.stringify(Object.assign({ v: 2, S: { tx: { 'vow.g': tx } }, who, dirty: dirty !== false, base: 'k0' }, t ? { t } : {}, extra || {}));
const txOf = (v) => { try { return JSON.parse(v).S.tx['vow.g']; } catch (e) { return null; } };
function store(init) { const m = new Map(Object.entries(init || {})), sets = [];
  return { m, sets, ls: { getItem: (k) => (m.has(k) ? m.get(k) : null), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; },
    setItem: (k, v) => { sets.push(k); m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } } }; }
const MPF = ['_acctOk', '_ordK', '_keepK', '_recE', '_migStampW', '_migOwner', '_migDone', '_migOwnT', '_migOrd', '_migKeep', '_migOldDrop', '_migOldSweep', '_acctKeysMigrate', '_acctOldSweep', '_acctTouch',
  '_reloginStampT', '_reloginKeyNewer', '_useK', '_useW', '_useSet', '_strSig', '_sameS', '_migOldW', '_migOffer', '_migLoad', '_migOfferX'];
const MPV = [/var RELOGIN_KEY=[^\n]*/, /var ACCT_OLD_MS=[^\n]*/, /var MIG_DONE_K=[^\n]*/, /var MIG_X_K=[^\n]*/];
function mpWin(st) { const sb = { localStorage: st.ls, JSON, Object, String, Math, Date: FakeDate }; vm.createContext(sb);
  vm.runInContext(MPF.map((f) => grabIn(MP, f)).join('\n') + '\n' + MPV.map((re) => lineIn(MP, re)).join('\n'), sb); return sb; }
function mpBoot(init, st0) { const st = st0 || store(init); const sb = mpWin(st); vm.runInContext('_acctKeysMigrate(); _acctOldSweep();', sb); return { st, sb, r: () => Object.fromEntries(st.m) }; }
const offer = (sb) => (typeof sb._migOffer === 'function' ? sb._migOffer(A) : null);

await sec('①', async () => {
  /* 배포 전 창이 남긴 옛 공용 판 → 새 창이 계정 칸으로 베꼈다 → 그 뒤 배포 전 창에서 더 고쳤다(t 가 나중) */
  NOW = Date.parse('2026-10-30T03:00:00Z');
  const B = mpBoot({ me_order: DR('처음 서약', A, NOW - 9000) });
  NOW += 60000; B.st.ls.setItem(OK_A, DR('처음 서약', A, NOW - 9000, true, { w: NOW }));   // 새 창 식순 화면이 그 판을 다시 썼다
  NOW += 60000; B.st.ls.setItem('me_order', DR('배포 전 창에서 더 고친 서약', A, NOW));   // 배포 전 창(옛 칸에 쓴다)
  NOW += 60000; vm.runInContext('_acctKeysMigrate(); _acctOldSweep();', B.sb);   // 다시 연다
  const o = offer(B.sb), before = B.st.ls.getItem(OK_A);
  ok('① 16-02 [OLD_DRAFT_OFFER] 옮긴 뒤 배포 전 창에서 더 고친 옛 공용 판 — 계정 칸이 덮이지도 무시되지도 않고 «예전 고침» 한 줄이 뜬다', !!o && txOf(before) === '처음 서약' && txOf(B.st.ls.getItem('me_order')) === '배포 전 창에서 더 고친 서약', { o: !!o, acct: txOf(before) });
  const ld = typeof B.sb._migLoad === 'function' ? B.sb._migLoad(A) : false;
  ok('① 불러오기 — 지금 계정 칸은 _prev 에 먼저 남고 · 예비본이 계정 칸으로 · 그 뒤 한 줄은 다시 안 뜬다 · 예비본은 그대로',
    ld === true && txOf(B.st.ls.getItem(OK_A)) === '배포 전 창에서 더 고친 서약' && txOf(B.st.ls.getItem(PREV_A)) === '처음 서약' && !offer(B.sb) && txOf(B.st.ls.getItem('me_order')) === '배포 전 창에서 더 고친 서약', B.r());
  const nj = JSON.parse(B.st.ls.getItem(OK_A) || '{}');
  ok('① 불러온 판은 지금 바꾼 판(e · w = 지금) — 열려 있던 다른 식순 창의 옛 판이 덮지 않는다([SAME_ACCT_T])', nj.e === NOW && nj.w === NOW, nj);
  NOW += 1000; vm.runInContext('_acctKeysMigrate(); _acctOldSweep();', B.sb);
  ok('① 다시 열어도 _prev · 계정 칸 그대로', txOf(B.st.ls.getItem(PREV_A)) === '처음 서약' && txOf(B.st.ls.getItem(OK_A)) === '배포 전 창에서 더 고친 서약', B.r()); });

await sec('②', async () => {
  NOW = Date.parse('2026-10-30T03:00:00Z');
  /* 1번 방문: 저장 공간이 모자라 긴 원본을 못 베꼈다 → 식순 화면이 짧은 서버 판(저장 안 한 고침 아님)을 계정 칸에 남겼다 → 공간을 비우고 다시 연다 */
  const st = store({ me_order: DR('긴 서약 '.repeat(40), A, NOW - 3600e3), [OK_A]: DR('짧은 서버 서약', A, 0, false, { w: NOW - 60000 }) });
  const B = mpBoot(null, st);
  ok('② 16-01 [OLD_DRAFT_OFFER] 계정 칸(짧은 서버 판)이 먼저 생겼어도 베끼지 못한 긴 원본은 «예전 고침» 한 줄로 되찾는다', !!offer(B.sb) && !!B.st.ls.getItem(FLAG_A), B.r());
  if (typeof B.sb._migOldDrop === 'function') B.sb._migOldDrop(A, 'save');
  ok('② 16-01 · 16-02 서버 저장 성공으로 옛 예비본을 지우지 않는다 — 저장 성공 길(apiTrackSave)이 지우기를 부르지 않는다',
    txOf(B.st.ls.getItem('me_order')) === '긴 서약 '.repeat(40) && !/_migOldDrop\(_reloginCode\(\), 'save'\)/.test(MP), B.st.ls.getItem('me_order') ? 'kept' : 'gone');
  const ld = typeof B.sb._migLoad === 'function' ? B.sb._migLoad(A) : false;
  ok('② 불러오면 긴 서약이 계정 칸 · 짧은 서버 판은 _prev', ld === true && txOf(B.st.ls.getItem(OK_A)) === '긴 서약 '.repeat(40) && txOf(B.st.ls.getItem(PREV_A)) === '짧은 서버 서약', B.r()); });

await sec('③', async () => {
  NOW = Date.parse('2026-10-30T03:00:00Z');
  const B = mpBoot({ me_order: DR('예전 고침', A, NOW - 9000), [OK_A]: DR('계정 칸 서버 판', A, 0, false, { w: NOW - 60000 }) });
  if (typeof B.sb._migOfferX === 'function') B.sb._migOfferX(A);
  ok('③ [OLD_DRAFT_OFFER] 닫으면 같은 내용으로는 다시 묻지 않는다', !offer(B.sb) && !!B.st.ls.getItem(X_A), B.r());
  B.st.ls.setItem('me_order', DR('예전 고침 바뀜', A, NOW - 100));
  ok('③ 예비본 내용이 바뀌면 다시 묻는다', !!offer(B.sb));
  /* 보통 길 — 계정 칸이 비어 베꼈다 → 새 창에서 계속 고쳤다 */
  const C = mpBoot({ me_order: DR('옮긴 서약', A, NOW - 9000) });
  C.st.ls.setItem(OK_A, DR('새 창에서 더 고친 서약', A, NOW, true, { w: NOW }));
  ok('③ 옮기기가 베낀 예비본은 묻지 않는다(계정 칸에 이미 있다) — 새 창에서 더 고쳐도', !offer(C.sb), C.r());
  const D = mpBoot({ me_order: DR('옛 고침', A, NOW - 9000), [OK_A]: DR('계정 칸 더 나중 고침', A, NOW - 500, true, { w: NOW - 400 }) });
  ok('③ 계정 칸이 저장 안 한 고침이고 더 나중에 쓰였으면 묻지 않는다', !offer(D.sb), D.r());
  const E = mpBoot({ me_order: DR('때 없는 옛 고침', A, 0), [OK_A]: DR('계정 칸 고침', A, NOW - 500, true, { w: NOW - 400 }) });
  ok('③ 예비본에 때가 없으면 묻는다(어느 쪽이 나중인지 모른다)', !!offer(E.sb));
  const F = mpBoot({ me_order: DR('남의 고침', 'BBBBBB', NOW), [OK_A]: DR('계정 칸', A, 0, false, { w: NOW }) });
  const G = mpBoot({ me_order: DR('저장한 판', A, NOW, false), [OK_A]: DR('계정 칸', A, 0, false, { w: NOW - 9000 }) });
  ok('③ 다른 계정의 예비본 · 저장 안 한 고침이 아닌 예비본은 묻지 않는다', !offer(F.sb) && !offer(G.sb)); });

await sec('④', async () => {
  NOW = Date.parse('2026-10-30T03:00:00Z');
  const B = mpBoot({ me_order: DR('옛 서약', A, NOW - 9000), [OK_A]: DR('계정', A, 0, false, { w: NOW }), [FLAG_A]: String(NOW - DAY) });
  NOW += 20 * DAY; B.st.ls.setItem('me_order', DR('배포 전 창이 다시 쓴 서약', A, 0));   // 20일 뒤 옛 창이 다시 썼다(때 없음)
  vm.runInContext('_acctOldSweep();', B.sb);
  NOW += 15 * DAY; vm.runInContext('_acctOldSweep();', B.sb);
  ok('④ [OLD_DRAFT_OFFER] 예비본 30일은 그 예비본이 스스로 마지막으로 쓰인 때부터 — 다시 쓰인 뒤 15일이면 남는다(처음 옮긴 때부터 35일)', txOf(B.st.ls.getItem('me_order')) === '배포 전 창이 다시 쓴 서약', B.r());
  NOW += 16 * DAY; vm.runInContext('_acctOldSweep();', B.sb);
  ok('④ 마지막으로 쓰인 뒤 31일이면 걷는다', B.st.ls.getItem('me_order') === null, B.r());
  NOW = Date.parse('2026-10-30T03:00:00Z');
  const N = mpBoot({ me_order: DR('옮긴 표시 없는 옛 서약', 'BBBBBB', NOW - 40 * DAY, true, { w: NOW - 40 * DAY }) });
  ok('④ 옮긴 표시가 없어도 스스로 쓰인 때가 30일 넘었으면 걷는다(공용 기기에 오래 남지 않게)', N.st.ls.getItem('me_order') === null, N.r());
  const S2 = mpBoot({ me_order: DR('옛 서약', A, NOW - 9000), [OK_A]: DR('계정', A, 0, false, { w: NOW }) });
  S2.sb._migOldDrop(A, 'out');
  ok('④ 스스로 로그아웃 — 그 주인의 예비본은 지운다 · 로그아웃이 _prev · 마지막 사용 칸도 지운다', S2.st.ls.getItem('me_order') === null && /_ordK\(_c\)\+'_prev'/.test(grabIn(MP, 'clearToken')) && /_useK\(_ordK\(_c\)\)/.test(grabIn(MP, 'clearToken')), S2.r()); });

await sec('⑤', async () => {
  NOW = Date.parse('2026-10-30T03:00:00Z');
  const st = store({ [OK_A]: DR('31일 전 서약', A, NOW - 31 * DAY), ['me_snapLocal_' + A]: JSON.stringify({ v: 2, zones: {}, t: NOW - DAY }) });
  const B = mpBoot(null, st); const draftSets = st.sets.filter((k) => k === OK_A || k === 'me_snapLocal_' + A);
  ok('⑤ 16-03 [OLD_DRAFT_OFFER] 쓴 때(w)가 없는 계정 칸 — 걷지 않고 작은 칸에 지금을 적는다 · 초안 본문은 다시 쓰지 않는다', txOf(st.ls.getItem(OK_A)) === '31일 전 서약' && +st.ls.getItem(W_A) === NOW && !draftSets.length, { sets: st.sets, w: st.ls.getItem(W_A) });
  NOW += 2 * 3600e3; st.sets.length = 0; if (typeof B.sb._acctTouch === 'function') B.sb._acctTouch(A);
  ok('⑤ 마이페이지를 연 때(_acctTouch)도 작은 칸만 — 초안 본문을 다시 쓰지 않는다', +st.ls.getItem(W_A) === NOW && !st.sets.includes(OK_A) && !st.sets.includes('me_snapLocal_' + A), st.sets);
  NOW += 29 * DAY; vm.runInContext('_acctOldSweep();', B.sb);
  ok('⑤ 30일 걷기는 작은 칸의 마지막 사용도 본다(29일 → 남는다)', !!st.ls.getItem(OK_A));
  NOW += 2 * DAY; vm.runInContext('_acctOldSweep();', B.sb);
  ok('⑤ 마지막 사용 31일 → 칸과 작은 칸을 함께 걷는다', st.ls.getItem(OK_A) === null && st.ls.getItem(W_A) === null, Object.fromEntries(st.m));
  const rs = grabIn(OP, '_ordRestore'), mg = grabIn(OP, '_ordMigrate');
  ok('⑤ 식순 화면 — 열 때(_ordRestore) · 공개 칸 베끼기(_ordMigrate)도 읽어 둔 초안을 다시 쓰지 않고 작은 칸(_ordUse)에',
    !!rs && !/localStorage\.setItem\(k, JSON\.stringify\(_o\)\)/.test(rs) && /_ordUse\(k\)/.test(rs) && !/r\.w=Date\.now\(\)/.test(mg) && /_ordUse\(tk\)/.test(mg) && /me_order_w_/.test(grabIn(OP, '_ordUse')), { rs: rs.slice(0, 80) }); });

/* ───────── ⑥ 서버 _vcM3 ───────── */
await sec('⑥', async () => {
  const sb = { _gsr_: () => {}, JSON, Array, Object }; vm.createContext(sb); vm.runInContext(grabIn(GS, '_vcM3'), sb);
  const P0 = NOW - 3600e3, P1 = NOW, P2 = NOW + 1000;
  const r = vm.runInContext(`_vcM3(${JSON.stringify({ purgedMs: P2, practice: 7, make: { chars: 30, total: 2, per: { g0: 2 } }, groom: { phrase: { t: 'b', ms: P2 } } })}, ${JSON.stringify({ purgedMs: P0, practice: 5, make: { chars: 10, total: 1, per: { g0: 1 } }, groom: { phrase: { t: 'a', ms: P0 } } })}, ${JSON.stringify({ purgedMs: P1, practice: 6, make: { chars: 20, total: 2, per: { g0: 2 } }, groom: { phrase: { t: 'a', ms: P0 } } })})`, sb);
  ok('⑥ 16-04 [MS_SET] 겹친 두 정리 — 지운 때(purgedMs)는 더하지 않고 바꾼 값(정리1 + 정리2 − 앞 정리가 아니다)', r.purgedMs === P1, { got: r.purgedMs, want: P1, added: P2 + P1 - P0 });
  ok('⑥ 세는 칸(연습 글자 · 만들기 글자 · 만든 수 · 줄마다 센 수)은 그대로 바꾼 만큼 더한다', r.practice === 8 && r.make.chars === 40 && r.make.total === 3 && r.make.per.g0 === 3, r);
  ok('⑥ 이 요청이 안 바꾼 시각(phrase.ms)은 지금 값 그대로', r.groom.phrase.ms === P2 && r.groom.phrase.t === 'b', r.groom);
  const r2 = vm.runInContext(`_vcM3({ practiceMs: ${P2} }, { practiceMs: ${P0} }, { practiceMs: ${P1} })`, sb);
  ok('⑥ practiceMs 도 더하지 않는다', r2.practiceMs === P1, r2); });

/* ───────── ⑦ ⑧ 콘솔 «시작» ───────── */
function startWorld(st) {
  const i = CS.indexOf("(function(){ var go = $('#go'), run = go.onclick;"), iife = i < 0 ? '' : CS.slice(i, CS.indexOf('})();', i) + 5);
  const W = { ran: 0, tsts: [], freshOk: null }; const go = { onclick: () => { W.ran++; }, dataset: {}, textContent: '시작' };
  const sb = { $: () => go, RF_FRESH: { done: false, wait: false, ask: null }, RF_ST: st || {}, rfKeys: () => ['g0', 'g1'], GUEST: false, QS: { get: () => 'AB12CD' }, toast: (t) => { W.tsts.push(t); }, rfPaint: () => {}, setTimeout, Promise, Date,
    rfFresh: () => new Promise((r) => { W.freshOk = r; }) };
  vm.createContext(sb); vm.runInContext(['rfBusyNow', 'rfLookNow', 'rfLookBegin', 'rfLookWait', 'rfPending', 'rfReadyWait'].map((f) => grabIn(CS, f)).join('\n') + '\n' + lineIn(CS, /var RF_LOOK = [^\n]*/) + '\n' + lineIn(CS, /var RF_READY = [^\n]*/) + '\n' + iife, sb);
  W.go = go; W.sb = sb; return W; }

await sec('⑦', async () => {
  /* 처음 열 때(RF_FRESH.wait 없음) — 스튜디오 파일 표를 읽고 파일을 받는 중(busy) · 최신 확인은 이미 했다(done) */
  const W = startWorld({ g0: 'busy', g1: 'ok' }); W.sb.RF_FRESH.done = true;
  W.go.onclick(); await flush(); const r0 = W.ran;
  await wait(400); const r1 = W.ran;
  W.sb.RF_ST.g0 = 'ok'; await wait(400); await flush();
  ok('⑦ 16-05 · 당일 16-01 [RF_READY_ALL] 처음 열 때도 파일 받기(busy)가 끝날 때까지 «시작»이 기다린다(«새 소리를 받는 중이에요») · 다 받으면 그때 한 번 시작',
    r0 === 0 && r1 === 0 && W.ran === 1 && W.tsts.some((t) => /새 소리를 받는 중이에요/.test(t)), { r0, r1, ran: W.ran, t: W.tsts });
  /* 목록을 묻는 동안(줄이 아직 busy 가 아니다) */
  const W2 = startWorld({}); W2.sb.RF_FRESH.done = true; W2.sb.RF_FRESH.list = true;
  W2.go.onclick(); await wait(300); const a = W2.ran; W2.sb.RF_FRESH.list = false; W2.sb.RF_ST.g0 = 'busy'; await wait(300); const b = W2.ran; W2.sb.RF_ST.g0 = 'ok'; await wait(400);
  ok('⑦ 목록 → 파일 받기로 이어지는 동안 내내 기다린다 · 끝나면 시작', a === 0 && b === 0 && W2.ran === 1, { a, b, ran: W2.ran });
  const pf = grabIn(CS, 'rfPrefetch');
  ok('⑦ 처음 열 때(rfPrefetch)도 목록을 묻는 동안은 «받는 중»(RF_FRESH.list = true · 받을 것이 있을 때 · [RF_NOWAIT_EMPTY] con-start-nowait.mjs)', /if \(!code \|\| !tok\) \{ RF_FRESH\.list = false; return; \} RF_FRESH\.list = (true|need);/.test(pf)); });

await sec('⑧', async () => {
  /* 최신 확인 중에 시작을 다시 누름 → 기기 보관본 확인 대기 → 새 파일 B 안내가 먼저 → A 보관본 확인 끝 */
  const W = startWorld({ g0: 'ok', g1: 'ok' });
  W.go.onclick(); await flush();   // 1: 최신 확인 중
  W.sb.RF_ST.g0 = 'look'; W.go.onclick(); await flush();   // 2: 보관본 확인을 기다린다
  W.freshOk({ keys: ['g0'], up: {}, sel: null }); await flush();   // 새로 저장된 소리 B
  W.sb.RF_ST.g0 = 'ok'; await wait(400); await flush();
  ok('⑧ 당일 16-02 [RF_READY_ALL] 기다리는 사이 «새로 저장된 소리가 있어요»가 뜨면 앞서 기다리던 «시작»은 버린다 — 옛 A 로 시작하지 않는다',
    W.ran === 0 && W.tsts.some((t) => /새로 저장된 소리가 있어요/.test(t)) && !!W.sb.RF_FRESH.ask, { ran: W.ran, t: W.tsts });
  W.go.onclick(); await flush();
  ok('⑧ 안내 뒤 디렉터가 다시 누르면 그 창 그대로 시작(종전 «시작을 한 번 더»)', W.ran === 1, W.ran);
  const W2 = startWorld({ g0: 'ok', g1: 'ok' });
  W2.go.onclick(); await flush(); W2.sb.RF_ST.g1 = 'busy'; W2.go.onclick(); await flush();
  W2.freshOk({ keys: [], up: {}, sel: ['guestVoice'] }); await flush(); W2.sb.RF_ST.g1 = 'ok'; await wait(400);
  ok('⑧ 목소리 선택이 바뀐 안내도 같다(기다리던 시작을 버린다)', W2.ran === 0 && W2.tsts.some((t) => /목소리 선택이 바뀌었어요/.test(t)), { ran: W2.ran, t: W2.tsts }); });

/* ───────── ⑨ 브라우저 — 390 마이페이지 ───────── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) console.log('건너뜀 ⑨ — 브라우저(playwright)가 없다(CI guard) · 로컬에서 잰다');
else await sec('⑨', async () => {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
  const OVR = { '/mypage.html': process.env.V16_MP, '/order-preview.html': process.env.V16_OP };
  const srv = http.createServer((q, r) => { const u0 = decodeURIComponent(q.url.split('?')[0]), p = OVR[u0] || path.join(ROOT, u0); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
  let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('건너뜀 ⑨ — 브라우저를 못 띄움 ' + String(e && e.message || e).split('\n')[0]); srv.close(); return; }
  try {
    const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
    const STATE = { ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SHOT', stage: '제작중', stageIndex: 6, stageList: SIG, nextAction: '다음 할 일을 안내해 드릴게요.', contract: { signed: true }, payment: {}, production: {} };
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
    await ctx.addInitScript(`try{ if(!localStorage.getItem('__seed16')){ localStorage.setItem('__seed16','1'); localStorage.setItem('me_token','TOK'); localStorage.setItem('me_mig_done_ME-SHOT', String(Date.now()-864e5));
      localStorage.setItem('me_order', JSON.stringify({ v: 2, S: { course: 'open', tx: { 'vow.g': '배포 전 창에서 고친 긴 서약' } }, who: 'ME-SHOT', idx: 2, cs: true, sv: false, dirty: true, base: 'k0', t: Date.now()-60000 }));
      localStorage.setItem('me_order_ME-SHOT', JSON.stringify({ v: 2, S: { course: 'open', tx: { 'vow.g': '짧은 서버 서약' } }, who: 'ME-SHOT', idx: 2, cs: true, sv: false, dirty: false, base: 'k0', w: Date.now()-30000 })); } }catch(e){}`);
    await ctx.route('**/*', async (rt) => { const u = rt.request().url();
      if (u.includes('script.google.com')) { let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {}
        const body = p.action === 'getMyState' ? STATE : { ok: true }; return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) }); }
      if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(BASE + '/mypage.html', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const line = () => pg.evaluate(() => { const b = document.getElementById('mp_migLoad'), s = b && b.closest('.trk-sub'); if (!s) return null; const r = s.getBoundingClientRect(), g = b.getBoundingClientRect(), x = document.getElementById('mp_migX').getBoundingClientRect();
      return { text: s.textContent.replace(/\s+/g, ' ').trim(), h: Math.round(r.height), goH: Math.round(g.height), xW: Math.round(x.width), right: Math.round(x.right), vw: innerWidth, sw: document.documentElement.scrollWidth }; });
    const L1 = await line();
    ok('⑨ 390 · 옛 공용 me_order(저장 안 한 고침) + 다른 계정 칸 — 식순 줄 아래 «이 기기에 저장 안 된 예전 고침이 있어요 · 불러오기» 한 줄', !!L1 && /^이 기기에 저장 안 된 예전 고침이 있어요 · 불러오기/.test(L1.text) && L1.goH >= 44 && L1.xW + 16 >= 44 && L1.h <= 40 && L1.right <= L1.vw && L1.sw <= L1.vw, L1);
    if (L1) { await pg.evaluate(() => { document.querySelectorAll('.me-fab-tip').forEach((e) => e.remove()); document.getElementById('mp_migLoad').closest('.trk-list').scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(300); }   // 1회 안내 말풍선(레일)은 걷고 찍는다
    console.log('   ⑨ 줄 실측 ' + JSON.stringify(L1));
    await pg.screenshot({ path: path.join(process.env.V16_SHOT_DIR || '/tmp', 'vc-fix16-390.png') });
    if (L1) await pg.tap('#mp_migLoad');
    let got = null; for (let i = 0; i < 40 && !got; i++) { await pg.waitForTimeout(250); const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) { try { got = await f.evaluate(() => (typeof S !== 'undefined' && S.tx && S.tx['vow.g']) || null); } catch (e) {} } }
    const ls = await pg.evaluate(() => ({ acct: localStorage.getItem('me_order_ME-SHOT'), prev: localStorage.getItem('me_order_ME-SHOT_prev'), old: localStorage.getItem('me_order') }));
    ok('⑨ 불러오기 — 계정 칸 = 예전 고침 · 앞 계정 칸은 _prev · 식순 화면이 열린다', txOf(ls.acct) === '배포 전 창에서 고친 긴 서약' && txOf(ls.prev) === '짧은 서버 서약' && !!got, { got, acct: txOf(ls.acct), prev: txOf(ls.prev) });
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1500);
    ok('⑨ 다시 열면 한 줄이 없다(불러온 그 내용)', (await line()) === null);
    await pg.evaluate(() => { const o = JSON.parse(localStorage.getItem('me_order')); o.S.tx['vow.g'] = '또 다른 예전 고침'; o.t = Date.now(); localStorage.setItem('me_order', JSON.stringify(o)); });
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const L2 = await line(); if (L2) await pg.tap('#mp_migX'); await pg.waitForTimeout(200);
    const L3 = await line(); await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1500); const L4 = await line();
    ok('⑨ 예비본이 바뀌면 다시 뜨고 · 닫으면 사라지고 · 다시 열어도 안 뜬다', !!L2 && L3 === null && L4 === null, { L2, L3, L4 });
    ok('⑨ 페이지 오류 없음', !errs.length, errs.slice(0, 3));
    await ctx.close();
  } finally { await br.close(); srv.close(); } });

console.log(fail ? `\n✗ VC_FIX16_1030 실패 ${fail}건` : '\n✓ VC_FIX16_1030 — 16차 점검 통과');
process.exit(fail ? 1 : 0);
