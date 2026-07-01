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

const code = [
  stageExLine,
  extractVarObject(SRC_JOURNEY, 'PAYMENT'),
  extractFunction(SRC_JOURNEY, '_parseJsonSafe'),
  extractFunction(SRC_JOURNEY, '_balanceDueLabel'),
  extractFunction(SRC_JOURNEY, '_midDueLabel'),
  extractFunction(SRC_JOURNEY, '_journeyAmounts'),
  extractFunction(SRC_JOURNEY, '_balanceDDay'),
  extractFunction(SRC_JOURNEY, '_shiftYmd'),
  extractFunction(SRC_JOURNEY, '_cashReceiptOf'),
  extractFunction(SRC_JOURNEY, '_cashReceiptLedger'),
  extractFunction(SRC_JOURNEY, 'adminConfirmMid'),
  extractFunction(SRC_JOURNEY, 'adminConfirmBalance'),
  extractFunction(SRC_ADMIN, '_confirmDepositCore'),
  extractFunction(SRC_ADMIN, 'adminConfirmPayment'),
  extractFunction(SRC_CARD, '_payCfg'),
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
let kakaoLog = [], handlerLog = [], payLog = [];

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
  // 토스 네트워크 스텁(실제 confirm 대체)
  _tossConfirm: function () { return TOSS_RESULT; },
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
function reset() { DB = {}; AUTHED = true; PROPS = {}; TOSS_RESULT = { ok: true, data: {} }; TOKMAP = {}; kakaoLog = []; handlerLog = []; payLog = []; }
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

// A2 관리자 계약금 확인 · 예식 임박(D-5) → 통장 일괄수납 번들 ON
reset(); newCust('A2', { 예식일: ymdFromToday(5) });
var r2 = run('adminConfirmPayment("A2")');
check('A2 관리자 계약금 확인(임박 D-5): 입금·중도금·잔금 전부 확인(일괄수납)',
  DB.A2.입금상태 === '확인' && DB.A2.중도금상태 === '확인' && DB.A2.잔금상태 === '확인');
check('A2 bundled=[중도금,잔금]', r2.bundled.join(',') === '중도금,잔금');
check('A2 중도금·잔금 확인일시 동일(콤보 합산 정합)', DB.A2.중도금확인일시 === DB.A2.잔금확인일시);

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
check('C3 결제수단 마커 예약금=카드', run('_parseJsonSafe(__rec).결제수단.예약금') === '카드');
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
// F2 카드 계약금 확인 → 예약금 due=false, card=true
reset(); newCust('F2'); run('_confirmDepositCore("F2", { bundle: false, via: "카드" })'); run('_payMarkCard("F2", "예약금")');
var led2 = run('_cashReceiptLedger(findCustomerByCode("F2"))');
var yeF2 = led2.find(x => x.key === '예약금');
check('F2 카드 계약금: 예약금 due=false · card=true(현금영수증 큐 제외)', yeF2 && yeF2.due === false && yeF2.card === true);
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

/* ── 결과 ── */
console.log('\n' + '─'.repeat(36));
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) { console.log('실패:\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('카드결제 코어 분리 검증 통과');
