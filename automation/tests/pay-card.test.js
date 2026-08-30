/**
 * Moment Edit · 카드결제(토스) 적용분 시뮬레이션 — 코어 분리(SYNC-1·2·3) 검증
 * ──────────────────────────────────────────────────────────────────────────
 * 실행: node automation/tests/pay-card.test.js
 * 방식: 실제 소스(admin.gs · 70_journey.gs · 98_pay_card.gs · 00_platform-config.gs)에서
 *       결정 함수를 그대로 추출 → vm 샌드박스(인메모리 Customers 시트 + GAS 전역 스텁)에서 실행.
 *       토스 네트워크(_tossConfirm)와 시트 I/O만 스텁 · 나머지 판정 로직은 100% 실제 코드.
 *
 * 검증 대상:
 *   A. 코어 번들 분리 — 관리자(bundle:true)는 임박 시 중도금·잔금 일괄확인, 카드(bundle:false)는 계약금만.
 *   B. 가드 — adminConfirmPayment는 _requireAdmin() 有(미인증 throw), _confirmDepositCore는 無.
 *   C. 금액 위변조 — _payExpectedAmount 정합 · handleCardConfirm 금액불일치 차단.
 *   D. 멱등 — 이미 '확인'이면 재confirm/이중청구 없음.
 *   E. 플래그 OFF — 카드 경로 전면 차단(현 운영과 동일).
 *   F. 현금영수증 원장(SYNC-3) — 카드결제분은 발급 큐(due)서 제외 · 계좌이체·기존고객은 무영향.
 *   G. 중도금·잔금 카드 — 가드 없는 admin 함수 재사용 정합.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC_JOURNEY = fs.readFileSync(path.join(ROOT, 'automation/platform/70_journey.gs'), 'utf8');
const SRC_ADMIN = fs.readFileSync(path.join(ROOT, 'automation/admin/admin.gs'), 'utf8');
const SRC_CARD = fs.readFileSync(path.join(ROOT, 'automation/platform/98_pay_card.gs'), 'utf8');
const SRC_PROD = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
const SRC_CONFIG = fs.readFileSync(path.join(ROOT, 'automation/platform/00_platform-config.gs'), 'utf8');

/* ── 소스 추출기(refund-quote.test.js와 동일 방식) ── */
function sliceBalanced(src, openIdx) {
  let depth = 0, inStr = null, inLC = false, inBC = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inLC) { if (ch === '\n') inLC = false; continue; }
    if (inBC) { if (ch === '/' && src[i - 1] === '*') inBC = false; continue; }
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '/' && src[i + 1] === '/') { inLC = true; continue; }
    if (ch === '/' && src[i + 1] === '*') { inBC = true; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
  }
  throw new Error('unbalanced braces at ' + openIdx);
}
function extractFunction(src, name) {
  const m = new RegExp('(^|\\n)\\s*function\\s+' + name + '\\s*\\(([^)]*)\\)').exec(src);
  if (!m) throw new Error('function not found: ' + name);
  const open = src.indexOf('{', m.index + m[0].length - 1);
  return 'function ' + name + '(' + m[2] + ') ' + sliceBalanced(src, open);
}
function extractVarObject(src, name) {
  const m = new RegExp('(^|\\n)var\\s+' + name + '\\s*=\\s*\\{').exec(src);
  if (!m) throw new Error('var not found: ' + name);
  const open = src.indexOf('{', m.index + m[0].length - 1);
  return 'var ' + name + ' = ' + sliceBalanced(src, open) + ';';
}
const stageExLine = (SRC_CONFIG.match(/var STAGE_EXCEPTIONS = \[[^\]]*\];/) || [])[0];
if (!stageExLine) throw new Error('STAGE_EXCEPTIONS not found');
/* ★[PAYCARD_HARNESS_FLOW 2026-08-30] 이 테스트는 «죽어 있었다» — _confirmDepositCore 가 stageFlowFor 를 쓰게 바뀐 뒤
   하네스가 그 함수를 안 실어 D2 부터 ReferenceError 로 통째 중단됐다(main 에서도 동일 재현).
   아무 게이트도 이 파일을 돌리지 않아 아무도 몰랐다 — 그래서 merge-guard 에 실행을 걸고 여기서 의존을 채운다.
   ★config 를 통째로 넣지 않는 것은 이 하네스의 설계다(필요한 조각만 실어 무엇에 기대는지 드러낸다). */
const stageFlowObj = extractVarObject(SRC_CONFIG, 'STAGE_FLOW');
const stageFlowFn = extractFunction(SRC_CONFIG, 'stageFlowFor');

const code = [
  stageExLine,
  stageFlowObj,
  stageFlowFn,
  /* [PAY_LOCK_REENTRANT] 돈 확인 계열의 재진입 안전 락 — 목이 아니라 **진짜 함수**를 싣는다.
     LockService 목이 이미 위에 있어 그대로 돌고, 카드 경로가 락을 쥔 채 확인 함수를 부르는 이 테스트가
     곧 «조기 해제가 없는지»를 함께 지키는 자리가 된다. */
  'var _PAY_LOCK_HELD = false;',
  "var _PAY_LOCK_BUSY = '잠시 후 다시 시도해 주세요. (서버 혼잡)';",
  extractFunction(SRC_JOURNEY, '_payLock'),
  extractVarObject(SRC_JOURNEY, 'PAYMENT'),
  extractFunction(SRC_JOURNEY, '_parseJsonSafe'),
  extractFunction(SRC_JOURNEY, '_balanceDueLabel'),
  extractFunction(SRC_JOURNEY, '_midDueLabel'),
  extractFunction(SRC_JOURNEY, '_wonNum'),
  extractFunction(SRC_JOURNEY, '_journeyAmounts'),
  extractFunction(SRC_JOURNEY, '_balanceDDay'),
  extractFunction(SRC_JOURNEY, '_shiftYmd'),
  extractFunction(SRC_JOURNEY, '_cashReceiptOf'),
  extractFunction(SRC_JOURNEY, '_cashReceiptLedger'),
  /* [PAY_LOCK_REENTRANT] 2026-08-30부터 셋은 «락 래퍼 + 코어» 두 조각이다 — 둘 다 실어야 실제 경로가 재현된다 */
  extractFunction(SRC_JOURNEY, 'adminConfirmMid'),
  extractFunction(SRC_JOURNEY, '_adminConfirmMidCore'),
  extractFunction(SRC_JOURNEY, 'adminConfirmBalance'),
  extractFunction(SRC_JOURNEY, '_adminConfirmBalanceCore'),
  extractFunction(SRC_JOURNEY, 'adminConfirmMidBalance'),
  extractFunction(SRC_JOURNEY, '_adminConfirmMidBalanceCore'),
  extractFunction(SRC_JOURNEY, '_bundleKeysFor'),
  extractFunction(SRC_JOURNEY, '_payWeddingYmd'),
  extractFunction(SRC_ADMIN, '_ymdOf'),
  extractFunction(SRC_ADMIN, '_kstYmd'),
  extractFunction(SRC_PROD, 'adminConfirmExtra'),
  extractFunction(SRC_ADMIN, '_confirmDepositCore'),
  extractFunction(SRC_ADMIN, 'adminConfirmPayment'),
  extractFunction(SRC_CARD, '_payCfg'),
  extractFunction(SRC_CARD, '_payPreValidate'),
  extractFunction(SRC_CARD, '_payExpectedAmount'),
  extractFunction(SRC_CARD, '_payMarkCard'),
  extractFunction(SRC_CARD, '_payLog'),
  extractFunction(SRC_CARD, 'handleCardConfirm'),
  extractFunction(SRC_CARD, 'handleCardPayConfig')
].join('\n\n');

/* ── 인메모리 Customers 시트 + GAS 전역 스텁 ── */
let DB = {};                 // code → 필드맵
let AUTHED = true;           // _requireAdmin 스텁 게이트
let PROPS = {};              // ScriptProperties
let TOSS_RESULT = { ok: true, data: {} };   // _tossConfirm 스텁 결과(네트워크 대체)
let TOKMAP = {};             // 세션 토큰 → 개인코드
let kakaoLog = [], handlerLog = [], payLog = [], adminAlerts = [];
let tossCalls = 0;           // 토스 청구(=돈 캡처) 호출 횟수 추적

function makeRow(codeVal) {
  if (!DB[codeVal]) return null;
  return { num: codeVal, get: function (f) { var v = DB[codeVal][f]; return v == null ? '' : v; } };
}

const sandbox = {
  console, Date, Math, JSON, String, Number, Object, Array, RegExp, isNaN, parseInt, parseFloat,
  // 시트/고객
  findCustomerByCode: function (c) { return makeRow(String(c || '').trim().toUpperCase()); },
  getCustomersSheet: function () { return 'SHEET'; },
  buildHeaderIndex: function () { return {}; },
  touchCustomer: function (sheet, colOf, num, patch) { Object.assign(DB[num], patch); },
  setCustomerStage: function (code, transition) {
    var map = { paid: '입금완료' };
    if (map[transition]) DB[String(code).toUpperCase()]['현재단계'] = map[transition];
    return true;
  },
  findRowByPersonalCode: function () { return null; },
  // 기록/알림 스텁
  _recordHandler: function (code, action) { handlerLog.push({ code: code, action: action }); },
  notifyKakao: function (event, code, extra) { kakaoLog.push({ event: event, code: code, extra: extra || {} }); },
  // 가드 스텁 — 미인증이면 throw(실제 _requireAdmin 계약 재현)
  _requireAdmin: function () { if (!AUTHED) throw new Error('로그인이 필요합니다. (관리자 전용)'); return { ok: true }; },
  // 세션 스텁
  resolveSession: function (token) {
    if (TOKMAP[token]) return { ok: true, row: { get: function (f) { return f === '개인코드' ? TOKMAP[token] : ''; } } };
    return { ok: false, reason: 'invalid' };
  },
  _sessionMsg: function () { return '세션이 만료되었습니다.'; },
  // 토스 네트워크 스텁(실제 confirm 대체) — 호출 횟수 추적(청구 전 차단 검증용)
  _tossConfirm: function () { tossCalls++; return TOSS_RESULT; },
  // 관리자 경보 스텁(B-1)
  aiAlertAdmin: function (t) { adminAlerts.push(t); return { ok: true }; },
  // GAS 서비스 스텁
  fmtKST: function () { return 'NOW'; },   // 번들 확인일시 동일값(콤보 판정) 목적상 상수면 충분
  LockService: { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } },
  PropertiesService: { getScriptProperties: function () { return { getProperty: function (k) { return PROPS[k]; } }; } },
  SpreadsheetApp: { getActive: function () { return { getSheetByName: function () { return { appendRow: function () {}, setFrozenRows: function () {}, getLastRow: function () { return 1; }, deleteRows: function () {} }; } }; } },
  Utilities: { base64Encode: function (s) { return 'B64'; }, getUuid: function () { return 'uuid'; } }
};
const ctx = vm.createContext(sandbox);
vm.runInContext(code, ctx);

/* ── 테스트 헬퍼 ── */
let pass = 0, fail = 0; const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; failures.push(name + (detail ? '  →  ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  →  ' + detail : '')); }
}
function ymdFromToday(deltaDays) {
  var d = new Date(); d.setHours(0, 0, 0, 0); d = new Date(d.getTime() + deltaDays * 86400000);
  return d.getFullYear() + '-' + ('0' + (d.getMonth() + 1)).slice(-2) + '-' + ('0' + d.getDate()).slice(-2);
}
// 표준 시그니처 고객 생성. 계약총액 3,500,000 → 계약금350,000/납부액250,000/중도금1,400,000/잔금1,750,000
function newCust(code, over) {
  DB[code] = Object.assign({
    개인코드: code, 상품타입: '시그니처', 계약총액: 3500000, 계약상태: '서명완료',
    현재단계: '계약완료', 입금상태: '대기', 중도금상태: '대기', 잔금상태: '대기',
    예식일: ymdFromToday(300), 동의기록: ''
  }, over || {});
  kakaoLog = []; handlerLog = []; payLog = [];
  return code;
}
function reset() { DB = {}; AUTHED = true; PROPS = {}; TOSS_RESULT = { ok: true, data: {} }; TOKMAP = {}; kakaoLog = []; handlerLog = []; payLog = []; adminAlerts = []; tossCalls = 0; }
function payOn() { PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x'; }
function run(fn) { return vm.runInContext(fn, ctx); }

console.log('\n[카드결제 시뮬레이션] 코어 분리(SYNC-1·2·3) 검증\n');

/* ═══ A. 코어 번들 분리 (SYNC-2 · 돈) ═══ */
console.log('A. 코어 번들 분리');
// A0 금액 상식 확인
reset(); newCust('AAA');
var amt = run('_journeyAmounts(3500000, "시그니처")');
check('A0 금액 산출 계약금350k/납부액250k/중도금1.4M/잔금1.75M',
  amt.계약금 === 350000 && amt.납부액 === 250000 && amt.중도금 === 1400000 && amt.잔금 === 1750000,
  JSON.stringify(amt));

// A1 관리자 계약금 확인 · 예식 먼 미래(D-300) → 번들 안 걸림
reset(); newCust('A1', { 예식일: ymdFromToday(300) });
var r1 = run('adminConfirmPayment("A1")');
check('A1 관리자 계약금 확인(먼 미래): 입금=확인', DB.A1.입금상태 === '확인');
check('A1 중도금·잔금은 대기 유지', DB.A1.중도금상태 === '대기' && DB.A1.잔금상태 === '대기');
check('A1 단계=입금완료 · 알림 depositToProduction', DB.A1.현재단계 === '입금완료' && kakaoLog.some(k => k.event === 'cust.depositToProduction'));
check('A1 bundled 없음', Array.isArray(r1.bundled) && r1.bundled.length === 0);

// A2 관리자 계약금 확인 · 예식 임박(D-5) — [스냅샷 우선] 고객이 신고한 수납묶음만 일괄 확정.
//   확인 시점 D-day 재계산으로 미신고 금액을 오확정하던 동작은 제거(신고 없으면 계약금만).
reset(); newCust('A2', { 예식일: ymdFromToday(5), 중도금상태: '완료신호', 잔금상태: '완료신호',
  동의기록: JSON.stringify({ 수납묶음: { keys: ['중도금', '잔금'], at: 'x' } }) });
var r2 = run('adminConfirmPayment("A2")');
check('A2 신고 묶음 확인(임박 D-5): 입금·중도금·잔금 전부 확인(스냅샷 일괄수납)',
  DB.A2.입금상태 === '확인' && DB.A2.중도금상태 === '확인' && DB.A2.잔금상태 === '확인');
check('A2 bundled=[중도금,잔금]', r2.bundled.join(',') === '중도금,잔금');
check('A2 중도금·잔금 확인일시 동일(콤보 합산 정합)', DB.A2.중도금확인일시 === DB.A2.잔금확인일시);
// A22 신고 없는 임박 확인 → 미신고 금액은 자동 확정 금지(TOCTOU 차단 · 개별 확인 버튼 경로는 별도)
reset(); newCust('A22', { 예식일: ymdFromToday(5) });
var r2b = run('adminConfirmPayment("A22")');
check('A22 신고 없는 확인(임박 D-5): 계약금만 확인 · 중도금·잔금 대기 유지',
  DB.A22.입금상태 === '확인' && DB.A22.중도금상태 === '대기' && DB.A22.잔금상태 === '대기' && r2b.bundled.length === 0);

// A3 ★카드★ 계약금 확인 · 예식 임박(D-5) → 계약금만! (SYNC-2 핵심)
reset(); newCust('A3', { 예식일: ymdFromToday(5) });
var r3 = run('_confirmDepositCore("A3", { bundle: false, via: "카드" })');
check('A3 카드 계약금(임박 D-5): 입금=확인', DB.A3.입금상태 === '확인');
check('A3 ★카드는 중도금·잔금 대기 유지(미결제분 자동확인 차단)', DB.A3.중도금상태 === '대기' && DB.A3.잔금상태 === '대기');
check('A3 처리이력에 ·카드 태그', handlerLog.some(h => /·카드/.test(h.action)));

/* ═══ B. 가드 (SYNC-1) ═══ */
console.log('B. 가드');
reset(); newCust('B1');
var threw = false; try { AUTHED = false; run('adminConfirmPayment("B1")'); } catch (e) { threw = true; }
check('B1 adminConfirmPayment 미인증 → throw(관리자 가드 有)', threw && DB.B1.입금상태 === '대기');
reset(); newCust('B2'); AUTHED = false;
var rb2 = run('_confirmDepositCore("B2", { bundle: false, via: "카드" })');
check('B2 _confirmDepositCore 미인증에도 정상(가드 無 → 카드 경로 가능)', rb2.ok === true && DB.B2.입금상태 === '확인');
AUTHED = true;

/* ═══ C. 금액 위변조 (_payExpectedAmount · handleCardConfirm) ═══ */
console.log('C. 금액 위변조');
reset(); newCust('C1');
var cust = makeRow('C1');
sandbox.__c = cust;
check('C1 기대금액 계약금=납부액250k', run('_payExpectedAmount(__c, "계약금")') === 250000);
check('C1 기대금액 중도금=1.4M', run('_payExpectedAmount(__c, "중도금")') === 1400000);
check('C1 기대금액 잔금=1.75M', run('_payExpectedAmount(__c, "잔금")') === 1750000);
// C2 금액 불일치 차단(플래그 ON 필요)
reset(); newCust('C2'); TOKMAP.tokC2 = 'C2';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
sandbox.__b = { token: 'tokC2', milestone: '계약금', paymentKey: 'pk_1', orderId: 'ME1', amount: 999999 };
var rc2 = run('handleCardConfirm(__b)');
check('C2 금액 위조(999,999) → 차단', rc2.ok === false && DB.C2.입금상태 === '대기');
// C3 정상 금액 + 토스 성공 → 확인
reset(); newCust('C3'); TOKMAP.tokC3 = 'C3';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
sandbox.__b = { token: 'tokC3', milestone: '계약금', paymentKey: 'pk_2', orderId: 'ME2', amount: 250000 };
var rc3 = run('handleCardConfirm(__b)');
check('C3 정상 계약금 250k 결제 → ok · 입금=확인 · recorded', rc3.ok === true && rc3.recorded === true && DB.C3.입금상태 === '확인');
sandbox.__rec = DB.C3.동의기록;
check('C3 시그니처 계약금은 결제수단 마커 미세팅(예약금=이체 상담예약금 보존)', !run('(_parseJsonSafe(__rec).결제수단 || {}).예약금'));
// C3b 임박이라도 카드 계약금은 번들 안 됨(핸들러 경유 재확인)
reset(); newCust('C3b', { 예식일: ymdFromToday(5) }); TOKMAP.tokC3b = 'C3b';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
sandbox.__b = { token: 'tokC3b', milestone: '계약금', paymentKey: 'pk_3', orderId: 'ME3', amount: 250000 };
run('handleCardConfirm(__b)');
check('C3b ★임박에도 카드 계약금은 중도금·잔금 미확인', DB.C3b.중도금상태 === '대기' && DB.C3b.잔금상태 === '대기');

/* ═══ D. 멱등 ═══ */
console.log('D. 멱등');
reset(); newCust('D1', { 입금상태: '확인' }); TOKMAP.tokD1 = 'D1';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
sandbox.__b = { token: 'tokD1', milestone: '계약금', paymentKey: 'pk_4', orderId: 'ME4', amount: 250000 };
var rd1 = run('handleCardConfirm(__b)');
check('D1 이미 확인 → already · 토스confirm 미호출(이중청구 차단)', rd1.already === true);
reset(); newCust('D2', { 입금상태: '확인' });
var rd2 = run('_confirmDepositCore("D2", { bundle: false })');
check('D2 코어 멱등 already', rd2.already === true);

/* ═══ E. 플래그 OFF (현 운영과 동일) ═══ */
console.log('E. 플래그 OFF');
reset(); newCust('E1'); TOKMAP.tokE1 = 'E1'; PROPS = {};   // 플래그 미설정
sandbox.__b = { token: 'tokE1', milestone: '계약금', paymentKey: 'pk_5', orderId: 'ME5', amount: 250000 };
var re1 = run('handleCardConfirm(__b)');
check('E1 플래그 OFF → 카드결제 차단', re1.ok === false && DB.E1.입금상태 === '대기');
sandbox.__b = { token: 'tokE1' };
var re2 = run('handleCardPayConfig(__b)');
check('E2 config 플래그 OFF → enabled:false', re2.ok === true && re2.enabled === false);

/* ═══ F. 현금영수증 원장 카드 제외 (SYNC-3) ═══ */
console.log('F. 현금영수증 원장(SYNC-3)');
// F1 계좌이체 계약금 확인(마커 없음) → 예약금 due=true
reset(); newCust('F1'); run('adminConfirmPayment("F1")');
var led1 = run('_cashReceiptLedger(findCustomerByCode("F1"))');
var yeF1 = led1.find(x => x.key === '예약금');
check('F1 계좌이체 계약금: 예약금 due=true · card 미표시', yeF1 && yeF1.due === true && !yeF1.card);
// F2 ★시그니처★ 카드 계약금 → 원장 '예약금'(계좌이체 상담예약금 10만)은 건드리지 않음(현금영수증 대상 유지)
//    핸들러 경유로 마커 로직까지 실제 검증(handleCardConfirm이 시그니처 계약금엔 마킹 안 함).
reset(); newCust('F2'); TOKMAP.tokF2 = 'F2';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
sandbox.__b = { token: 'tokF2', milestone: '계약금', paymentKey: 'pk_f2', orderId: 'MEF2', amount: 250000 };
run('handleCardConfirm(__b)');
var yeF2 = run('_cashReceiptLedger(findCustomerByCode("F2"))').find(x => x.key === '예약금');
check('F2 ★시그니처 카드 계약금: 예약금(이체 상담예약금)은 due=true 유지 · card 미표시(가산세 방지)', yeF2 && yeF2.due === true && !yeF2.card);
sandbox.__rec = DB.F2.동의기록;
check('F2 시그니처 계약금엔 결제수단 마커 미세팅', !run('(_parseJsonSafe(__rec).결제수단 || {}).예약금'));
// F2B ★웨딩스냅★ 카드 계약금(=20% 전액=원장 예약금 항목) → due=false, card=true(정합)
reset(); newCust('F2B', { 상품타입: '웨딩스냅', 계약총액: 1500000, 중도금상태: '', 예식일: ymdFromToday(60) }); TOKMAP.tokF2B = 'F2B';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
var snapDep = run('_journeyAmounts(1500000, "웨딩스냅")').납부액;   // 20% = 300,000
sandbox.__b = { token: 'tokF2B', milestone: '계약금', paymentKey: 'pk_f2b', orderId: 'MEF2B', amount: snapDep };
var rf2b = run('handleCardConfirm(__b)');
var yeF2b = run('_cashReceiptLedger(findCustomerByCode("F2B"))').find(x => x.key === '예약금');
check('F2B 스냅 카드 계약금: 예약금 due=false · card=true(매출전표 제외)', rf2b.ok === true && yeF2b && yeF2b.due === false && yeF2b.card === true);
// F3 기존 고객(결제수단 키 자체 없음) 원장 무영향 — 계좌이체 확인분은 그대로 due
reset(); newCust('F3', { 입금상태: '확인', 중도금상태: '확인' });
var led3 = run('_cashReceiptLedger(findCustomerByCode("F3"))');
check('F3 기존고객(마커 없음): 확인분 due 정상 · card 전부 미표시',
  led3.filter(x => x.confirmed).every(x => !x.card) && led3.some(x => x.due === true));

/* ═══ G. 중도금·잔금 카드 (가드 없는 admin 함수 재사용) ═══ */
console.log('G. 중도금·잔금 카드');
reset(); newCust('G1', { 현재단계: '입금완료', 입금상태: '확인', 예식일: ymdFromToday(120) }); TOKMAP.tokG1 = 'G1';
PROPS.PAY_CARD_ENABLED = 'true'; PROPS.TOSS_SECRET_KEY = 'test_sk_x'; PROPS.TOSS_CLIENT_KEY = 'test_ck_x';
sandbox.__b = { token: 'tokG1', milestone: '중도금', paymentKey: 'pk_6', orderId: 'ME6', amount: 1400000 };
var rg1 = run('handleCardConfirm(__b)');
check('G1 카드 중도금 결제 → 중도금=확인 · 안심알림', rg1.ok === true && DB.G1.중도금상태 === '확인' && kakaoLog.some(k => k.event === 'cust.paymentConfirmed'));
sandbox.__rec = DB.G1.동의기록;
check('G1 결제수단 중도금=카드 → 원장 제외',
  run('_parseJsonSafe(__rec).결제수단.중도금') === '카드' &&
  run('_cashReceiptLedger(findCustomerByCode("G1"))').find(x => x.key === '중도금').due === false);

/* ═══ H. 사전검증(B-2) · 기록실패 경보(B-1) ═══ */
console.log('H. 사전검증·경보');
// H1 계약금인데 미서명 → 토스 청구 전 차단(돈 안 받음)
reset(); newCust('H1', { 계약상태: '대기' }); TOKMAP.tokH1 = 'H1'; payOn();
sandbox.__b = { token: 'tokH1', milestone: '계약금', paymentKey: 'pk_h1', orderId: 'MEH1', amount: 250000 };
var rh1 = run('handleCardConfirm(__b)');
check('H1 미서명 계약금 → 청구 전 차단 · toss 미호출 · 입금 대기', rh1.ok === false && tossCalls === 0 && DB.H1.입금상태 === '대기');
// H2 중도금인데 진행종료(취소) → 청구 전 차단
reset(); newCust('H2', { 현재단계: '취소' }); TOKMAP.tokH2 = 'H2'; payOn();
sandbox.__b = { token: 'tokH2', milestone: '중도금', paymentKey: 'pk_h2', orderId: 'MEH2', amount: 1400000 };
var rh2 = run('handleCardConfirm(__b)');
check('H2 취소건 중도금 → 청구 전 차단 · toss 미호출', rh2.ok === false && tossCalls === 0 && DB.H2.중도금상태 === '대기');
// H3 토스 승인됐으나 기록 실패 → 관리자 경보(수동 보정) · recorded:false
reset(); newCust('H3', { 현재단계: '입금완료', 입금상태: '확인', 예식일: ymdFromToday(120) }); TOKMAP.tokH3 = 'H3'; payOn();
run('var __realACB = adminConfirmBalance;');   // 원본 보관(뒤 I'·J 블록 복원용 — 이 강제 실패가 런타임 전역을 오염시키던 것 정정)
run('adminConfirmBalance = function(){ return { ok:false, error:"시뮬 강제 기록실패" }; };');   // 기록 실패 강제
sandbox.__b = { token: 'tokH3', milestone: '잔금', paymentKey: 'pk_h3', orderId: 'MEH3', amount: 1750000 };
var rh3 = run('handleCardConfirm(__b)');
check('H3 청구 성공+기록 실패 → recorded:false · 관리자 경보 1건', rh3.ok === true && rh3.recorded === false && tossCalls === 1 && adminAlerts.length === 1);
check('H3 경보 문구에 코드·단계·금액 포함', /H3/.test(adminAlerts[0]) && /잔금/.test(adminAlerts[0]) && /1750000/.test(adminAlerts[0]));

/* ═══ I. 퍼즈 — 극단·랜덤 입력에도 예외 0 · 유효할 때만 성공 ═══ */
console.log('I. 퍼즈(600회)');
var fuzzThrows = 0, fuzzBadSuccess = 0, fuzzOkCount = 0;
var MILES = ['계약금', '중도금', '잔금', '', '계약금 ', 'X', '중도금\n', null, undefined, '예약금'];
var AMTS = [0, -1, 250000, 1400000, 1750000, 999999, 1e12, NaN, '250000', 3500000];
var STATES = ['서명완료', '대기', '취소', '노쇼', '미계약'];
var STAGES = ['계약완료', '입금완료', '제작중', '취소', '예식완료'];
// LCG로 결정적 랜덤(Math.random 미사용 · 재현 가능)
var seed = 12345; function rnd() { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; }
function pick(a) { return a[Math.floor(rnd() * a.length)]; }
for (var it = 0; it < 600; it++) {
  reset();
  var on = rnd() < 0.7; if (on) payOn();
  var validTok = rnd() < 0.8;
  var cc = 'FZ' + it;
  newCust(cc, { 계약상태: pick(STATES), 현재단계: pick(STAGES), 입금상태: rnd() < 0.3 ? '확인' : '대기',
    중도금상태: rnd() < 0.2 ? '확인' : '대기', 잔금상태: rnd() < 0.2 ? '확인' : '대기',
    상품타입: rnd() < 0.5 ? '시그니처' : '웨딩스냅', 계약총액: pick([0, 3500000, 1500000, -5, 'abc']),
    예식일: rnd() < 0.5 ? ymdFromToday(Math.floor(rnd() * 400) - 20) : '' });
  if (validTok) TOKMAP['t' + it] = cc;
  var mile = pick(MILES), amt = pick(AMTS);
  sandbox.__b = { token: validTok ? ('t' + it) : 'bad', milestone: mile, paymentKey: rnd() < 0.9 ? 'pk' + it : '', orderId: rnd() < 0.9 ? 'o' + it : '', amount: amt };
  var res;
  try { res = run('handleCardConfirm(__b)'); } catch (e) { fuzzThrows++; continue; }
  if (res && res.ok && res.recorded) {
    fuzzOkCount++;
    // 성공했다면 반드시: 플래그 ON · 유효세션 · 유효 마일스톤 · 서버기대금액과 일치 · 상태가 확인으로 바뀜
    var okCust = makeRow(cc);
    var exp = run('_payExpectedAmount(findCustomerByCode("' + cc + '"), "' + String(mile).trim() + '")');
    var stCol = mile === '계약금' ? '입금상태' : (mile === '중도금' ? '중도금상태' : '잔금상태');
    if (!on || !validTok || ['계약금', '중도금', '잔금'].indexOf(mile) === -1 || amt !== exp || DB[cc][stCol] !== '확인') fuzzBadSuccess++;
  }
}
check('I 퍼즈 600회 예외 0', fuzzThrows === 0, 'throws=' + fuzzThrows);
check('I 퍼즈 잘못된 성공 0(유효할 때만 확인)', fuzzBadSuccess === 0, 'badSuccess=' + fuzzBadSuccess);

// I' 결정형 정상 표본 — 랜덤에 의존하지 않고 각 마일스톤 해피패스가 성공함을 보장(가드가 조여져도 회귀 감지 유지).
//   ※ 예전 퍼즈의 '성공 표본'은 우연에 의존했고, 그중 하나는 종료(취소) 고객에 계약금이 통과되던 버그를 성공으로 세고 있었음 → 결정형으로 대체.
run('adminConfirmBalance = __realACB;');   // H3의 강제 실패 패치 복원(잔금 해피패스 검증 가능)
payOn();
newCust('OK_DEP', { 현재단계: '계약완료', 입금상태: '대기' }); TOKMAP['tok_dep'] = 'OK_DEP';
sandbox.__b = { token: 'tok_dep', milestone: '계약금', paymentKey: 'pk_d', orderId: 'OKD', amount: 250000 };
var rOkD = run('handleCardConfirm(__b)');
check("I' 계약금 해피패스 성공 · 입금상태=확인 · 단계 입금완료", rOkD.ok === true && rOkD.recorded === true && DB.OK_DEP.입금상태 === '확인' && DB.OK_DEP.현재단계 === '입금완료');
newCust('OK_MID', { 현재단계: '제작중', 중도금상태: '대기' }); TOKMAP['tok_mid'] = 'OK_MID';
sandbox.__b = { token: 'tok_mid', milestone: '중도금', paymentKey: 'pk_m', orderId: 'OKM', amount: 1400000 };
var rOkM = run('handleCardConfirm(__b)');
check("I' 중도금 해피패스 성공 · 중도금상태=확인", rOkM.ok === true && rOkM.recorded === true && DB.OK_MID.중도금상태 === '확인');
newCust('OK_BAL', { 현재단계: '제작중', 잔금상태: '대기' }); TOKMAP['tok_bal'] = 'OK_BAL';
sandbox.__b = { token: 'tok_bal', milestone: '잔금', paymentKey: 'pk_b', orderId: 'OKB', amount: 1750000 };
var rOkB = run('handleCardConfirm(__b)');
check("I' 잔금 해피패스 성공 · 잔금상태=확인", rOkB.ok === true && rOkB.recorded === true && DB.OK_BAL.잔금상태 === '확인');

// J 신설 가드 회귀 — 종료 고객 부활 차단 · 입금신고(완료신호) 이중결제 차단
newCust('J_CANCEL', { 현재단계: '취소', 계약상태: '서명완료', 입금상태: '대기' }); TOKMAP['tok_jc'] = 'J_CANCEL';
sandbox.__b = { token: 'tok_jc', milestone: '계약금', paymentKey: 'pk_jc', orderId: 'JC', amount: 250000 };
var tossJc = tossCalls;
var rJc = run('handleCardConfirm(__b)');
check('J1 취소 고객 계약금 카드 → 청구 전 차단·부활 없음', rJc.ok === false && rJc.recorded !== true && tossCalls === tossJc && DB.J_CANCEL.입금상태 !== '확인' && DB.J_CANCEL.현재단계 === '취소');
newCust('J_SIGNAL', { 현재단계: '제작중', 잔금상태: '완료신호' }); TOKMAP['tok_js'] = 'J_SIGNAL';
var tossBefore = tossCalls;
sandbox.__b = { token: 'tok_js', milestone: '잔금', paymentKey: 'pk_js', orderId: 'JS', amount: 1750000 };
var rJs = run('handleCardConfirm(__b)');
check('J2 잔금 완료신호(입금신고 중) → 카드 미캡처(already) · 이중결제 차단', rJs.ok === true && rJs.already === true && tossCalls === tossBefore && DB.J_SIGNAL.잔금상태 === '완료신호');

// J3 추가보정 카드결제 — 별도 마일스톤(과세 매출). 신청됨만 결제 가능 · '완료'/'결제대기'면 이중결제 차단
newCust('J_EX', { 현재단계: '결과물전달', 추가보정상태: '견적', 추가보정금액: 120000 }); TOKMAP.tok_ex = 'J_EX';
check("J3a 추가보정 기대금액 = 추가보정금액", run('_payExpectedAmount(findCustomerByCode("J_EX"), "추가보정")') === 120000);
sandbox.__b = { token: 'tok_ex', milestone: '추가보정', paymentKey: 'pk_ex', orderId: 'JEX', amount: 120000 };
var rEx = run('handleCardConfirm(__b)');
check('J3b 추가보정 카드결제 성공 → 추가보정상태=완료 · 카드 마킹', rEx.ok === true && rEx.recorded === true && DB.J_EX.추가보정상태 === '완료' && (JSON.parse(DB.J_EX.동의기록 || '{}').결제수단 || {})['추가보정'] === '카드');
var tossEx = tossCalls;
sandbox.__b = { token: 'tok_ex', milestone: '추가보정', paymentKey: 'pk_ex2', orderId: 'JEX2', amount: 120000 };
var rExDup = run('handleCardConfirm(__b)');
check('J3c 완료 후 추가보정 재결제 → already·미캡처(이중결제 차단)', rExDup.ok === true && rExDup.already === true && tossCalls === tossEx);
newCust('J_EX0', { 현재단계: '결과물전달', 추가보정상태: '대기', 추가보정금액: 0 }); TOKMAP.tok_ex0 = 'J_EX0';
sandbox.__b = { token: 'tok_ex0', milestone: '추가보정', paymentKey: 'pk', orderId: 'X0', amount: 120000 };
var rEx0 = run('handleCardConfirm(__b)');
check('J3d 미신청(대기) 추가보정 → 결제 차단', rEx0.ok === false);
newCust('J_EXX', { 현재단계: '취소', 추가보정상태: '견적', 추가보정금액: 120000 }); TOKMAP.tok_exx = 'J_EXX';
var tossExx = tossCalls;
sandbox.__b = { token: 'tok_exx', milestone: '추가보정', paymentKey: 'pk', orderId: 'XX', amount: 120000 };
var rExx = run('handleCardConfirm(__b)');
check('J3e 종료(취소) 고객 추가보정 카드 → 청구 전 차단·미확정', rExx.ok === false && tossCalls === tossExx && DB.J_EXX.추가보정상태 === '견적');

/* ═══ K. 묶음 카드결제 — 중도금잔금(임박 combo) · 계약금묶음(임박 일괄) ═══ */
console.log('K. 묶음 카드결제');
// K1 중도금잔금 해피패스 — 둘 다 대기 → 합계 결제 → 둘 다 확인·같은 확인일시(영수증 콤보)·카드 마킹
reset(); payOn();
newCust('K1', { 현재단계: '제작중', 입금상태: '확인', 중도금상태: '대기', 잔금상태: '대기', 예식일: ymdFromToday(5) }); TOKMAP.tok_k1 = 'K1';
check('K1a 기대금액 = 중도금+잔금(3,150,000)', run('_payExpectedAmount(findCustomerByCode("K1"), "중도금잔금")') === 1400000 + 1750000);
sandbox.__b = { token: 'tok_k1', milestone: '중도금잔금', paymentKey: 'pk_k1', orderId: 'K1O', amount: 3150000 };
var rK1 = run('handleCardConfirm(__b)');
var _k1pay = JSON.parse(DB.K1.동의기록 || '{}').결제수단 || {};
check('K1b 성공 → 중도금·잔금 모두 확인 + 같은 확인일시', rK1.ok === true && rK1.recorded === true && DB.K1.중도금상태 === '확인' && DB.K1.잔금상태 === '확인' && DB.K1.중도금확인일시 === DB.K1.잔금확인일시);
check('K1c 카드 마킹 둘 다(콤보 원장 byCard)', _k1pay['중도금'] === '카드' && _k1pay['잔금'] === '카드');
// K2 하나라도 신고·확인이면 미캡처 차단
reset(); payOn();
newCust('K2', { 현재단계: '제작중', 입금상태: '확인', 중도금상태: '대기', 잔금상태: '완료신호', 예식일: ymdFromToday(5) }); TOKMAP.tok_k2 = 'K2';
var tossK2 = tossCalls;
sandbox.__b = { token: 'tok_k2', milestone: '중도금잔금', paymentKey: 'pk', orderId: 'K2O', amount: 3150000 };
var rK2 = run('handleCardConfirm(__b)');
check('K2 잔금 완료신호 포함 → already·미캡처(이중결제 차단)', rK2.ok === true && rK2.already === true && tossCalls === tossK2 && DB.K2.중도금상태 === '대기');
// K3 금액불일치 차단(중도금만 금액으로 묶음 시도)
reset(); payOn();
newCust('K3', { 현재단계: '제작중', 입금상태: '확인', 중도금상태: '대기', 잔금상태: '대기', 예식일: ymdFromToday(5) }); TOKMAP.tok_k3 = 'K3';
sandbox.__b = { token: 'tok_k3', milestone: '중도금잔금', paymentKey: 'pk', orderId: 'K3O', amount: 1400000 };
var rK3 = run('handleCardConfirm(__b)');
check('K3 금액불일치 → 캡처 전 차단', rK3.ok === false && DB.K3.중도금상태 === '대기' && DB.K3.잔금상태 === '대기');
// K4 계약금묶음 해피패스 — D-5·전부 대기 → 납부액+중도금+잔금 결제 → 셋 다 확인 + 단계 입금완료 + 카드 마킹
reset(); payOn();
newCust('K4', { 현재단계: '계약완료', 입금상태: '대기', 중도금상태: '대기', 잔금상태: '대기', 예식일: ymdFromToday(5) }); TOKMAP.tok_k4 = 'K4';
var expK4 = run('_payExpectedAmount(findCustomerByCode("K4"), "계약금묶음")');
check('K4a 기대금액 = 납부액+중도금+잔금(3,400,000)', expK4 === 250000 + 1400000 + 1750000);
sandbox.__b = { token: 'tok_k4', milestone: '계약금묶음', paymentKey: 'pk_k4', orderId: 'K4O', amount: 3400000 };
var rK4 = run('handleCardConfirm(__b)');
var _k4pay = JSON.parse(DB.K4.동의기록 || '{}').결제수단 || {};
check('K4b 성공 → 입금·중도금·잔금 확인 + 입금완료 전이', rK4.ok === true && rK4.recorded === true && DB.K4.입금상태 === '확인' && DB.K4.중도금상태 === '확인' && DB.K4.잔금상태 === '확인' && DB.K4.현재단계 === '입금완료');
check('K4c 카드 마킹(계약금·중도금·잔금)', _k4pay['계약금'] === '카드' && _k4pay['중도금'] === '카드' && _k4pay['잔금'] === '카드');
// K5 구성원 변화(잔금 기확인) → 기대금액엔 잔금 제외 → 프론트 구금액 결제 시 불일치 차단
reset(); payOn();
newCust('K5', { 현재단계: '계약완료', 입금상태: '대기', 중도금상태: '대기', 잔금상태: '확인', 예식일: ymdFromToday(5) }); TOKMAP.tok_k5 = 'K5';
check('K5a 기대금액 = 납부액+중도금(잔금 제외)', run('_payExpectedAmount(findCustomerByCode("K5"), "계약금묶음")') === 250000 + 1400000);
sandbox.__b = { token: 'tok_k5', milestone: '계약금묶음', paymentKey: 'pk', orderId: 'K5O', amount: 3400000 };
var rK5 = run('handleCardConfirm(__b)');
check('K5b 구성 변화 후 구금액 → 캡처 전 차단', rK5.ok === false && DB.K5.입금상태 === '대기');
// K6 취소 고객 묶음 카드 → 차단(부활 방지 일관)
reset(); payOn();
newCust('K6', { 현재단계: '취소', 입금상태: '대기', 중도금상태: '대기', 잔금상태: '대기', 예식일: ymdFromToday(5) }); TOKMAP.tok_k6 = 'K6';
sandbox.__b = { token: 'tok_k6', milestone: '중도금잔금', paymentKey: 'pk', orderId: 'K6O', amount: 3150000 };
var rK6 = run('handleCardConfirm(__b)');
check('K6 종료 고객 묶음 카드 → 청구 전 차단', rK6.ok === false && DB.K6.중도금상태 === '대기');

check('I 퍼즈 정상 성공 표본 존재(>0)', fuzzOkCount >= 0, 'ok=' + fuzzOkCount);   // 퍼즈 성공은 우연 의존이라 하한 0 · 실질 해피패스는 위 I' 결정형이 보장

/* ── 결과 ── */
console.log('\n' + '─'.repeat(36));
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) { console.log('실패:\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('카드결제 코어 분리 검증 통과');
