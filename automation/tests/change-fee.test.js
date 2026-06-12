/**
 * Moment Edit · 예식일 변경(02-9 · 계약서 v1-1 §8①) 단위테스트 + GS/HTML 구문검증
 * ──────────────────────────────────────────────────────────────────────────
 * 실행: node automation/tests/change-fee.test.js
 * 방식: 실제 소스(70_journey.gs · admin.gs · 20_customers-data.gs · 00_platform-config.gs)에서
 *       함수를 그대로 추출해 vm 샌드박스(GAS 전역·시트 mock)에서 실행.
 * 검증:
 *   [1] _changeFeeQuote 경계 — dd>=150 횟수 무관 무상 / dd 149~60 used0 1회 무상 / used1 10% / dd 59 10% / 반올림
 *   [2] handleQuoteWeddingChange 가드 — 스냅·서명 전·예식 당일·과거일·슬롯 형식·동일 일정·슬롯 마감
 *   [3] handleRequestWeddingChange — fee>0 입금자명 필수 · 변경요청 기록 · 멱등(같은 to) · 재요청 덮어쓰기
 *   [4] handleCancelWeddingChange — 요청 삭제 · 멱등
 *   [5] adminConfirmWeddingChange — 슬롯 재검증 · 예식일/계약정보 갱신 · 변경이력 push · 요청 삭제 · 리마인드 리셋 · 영수증기준일(fee>0)
 *       adminDeclineWeddingChange — 요청 삭제 · 사유 알림
 *   [6] buildChangeState — 스냅/서명 전/종료 단계 null · request/used/eligible
 *   [7] 구문검증 — automation 전체 .gs + mypage/admin/cancel/Admin HTML 인라인 스크립트 (new Function)
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC_JOURNEY = fs.readFileSync(path.join(ROOT, 'automation/platform/70_journey.gs'), 'utf8');
const SRC_ADMIN = fs.readFileSync(path.join(ROOT, 'automation/admin/admin.gs'), 'utf8');
const SRC_DATA = fs.readFileSync(path.join(ROOT, 'automation/platform/20_customers-data.gs'), 'utf8');
const SRC_CONFIG = fs.readFileSync(path.join(ROOT, 'automation/platform/00_platform-config.gs'), 'utf8');
const SRC_BOOKING = fs.readFileSync(path.join(ROOT, 'automation/consultation/consultation-booking.gs'), 'utf8');

/* ── 소스 추출기 — 문자열·주석을 건너뛰며 중괄호 균형으로 선언 전체를 잘라냄 (refund-quote.test.js와 동일) ── */
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
if (!stageExLine) throw new Error('STAGE_EXCEPTIONS not found in 00_platform-config.gs');

const code = [
  stageExLine,
  extractVarObject(SRC_JOURNEY, 'WEDDING_SLOT'),
  extractVarObject(SRC_JOURNEY, 'FITTING_CONSENT'),
  extractVarObject(SRC_JOURNEY, 'PAYMENT'),
  extractFunction(SRC_BOOKING, '_consultRefundQuote'),
  extractFunction(SRC_JOURNEY, '_parseJsonSafe'),
  extractFunction(SRC_JOURNEY, '_changeFeeQuote'),
  extractFunction(SRC_JOURNEY, '_changeGuard'),
  extractFunction(SRC_JOURNEY, '_changeInput'),
  extractFunction(SRC_JOURNEY, 'handleQuoteWeddingChange'),
  extractFunction(SRC_JOURNEY, 'handleRequestWeddingChange'),
  extractFunction(SRC_JOURNEY, 'handleCancelWeddingChange'),
  extractFunction(SRC_JOURNEY, 'adminConfirmWeddingChange'),
  extractFunction(SRC_JOURNEY, 'adminDeclineWeddingChange'),
  extractFunction(SRC_JOURNEY, 'buildChangeState'),
  extractFunction(SRC_DATA, 'fmtKST'),
  extractFunction(SRC_ADMIN, '_kstYmd'),
  extractFunction(SRC_ADMIN, '_ymdOf'),
  extractFunction(SRC_ADMIN, '_ymdNum'),
  extractFunction(SRC_ADMIN, '_dayDiff'),
  extractFunction(SRC_ADMIN, '_chgWhenLabel')
].join('\n\n');

/* ── GAS 전역 스텁 + 시트 mock 샌드박스 ── */
const ctx = vm.createContext({
  console,
  Utilities: {
    formatDate(d, tz, fmt) {   // Asia/Seoul 고정 스텁(refund-quote.test.js와 동일)
      const t = new Date(d.getTime() + 9 * 3600 * 1000);
      const p = n => ('0' + n).slice(-2);
      const ymd = t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate());
      return fmt === 'yyyy-MM-dd' ? ymd : ymd + ' ' + p(t.getUTCHours()) + ':' + p(t.getUTCMinutes());
    }
  },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  CONFIG: { ACCOUNT: '기업 000-000-00000', ACCOUNT_HOLDER: '모먼트에디트' },
  getCustomersSheet: () => ({}),
  buildHeaderIndex: () => ({}),
  _sessionMsg: r => '로그인이 필요합니다.',
  _requireAdmin: () => ({ ok: true, name: '테스트' }),
  _adminLock: () => ({ releaseLock() {} }),
  _LOCK_BUSY: '잠시 후 다시 시도해 주세요. (서버 혼잡)'
});
// 시트 mock — 단일 고객 행 저장소. touchCustomer 쓰기가 곧바로 다음 findCustomerByCode 읽기에 반영(락 안 재읽기 검증).
ctx.CUST = null;
ctx.SLOT_TAKEN = false;            // _weddingSlotTaken 결과(테스트별 제어)
ctx.NOTIFIED = [];                 // notifyKakao 호출 기록
ctx.HISTORY = [];                  // _recordHandler 기록
ctx.findCustomerByCode = () => ctx.CUST ? ctx.CUST.row : null;
ctx.resolveSession = () => ctx.CUST ? { ok: true, row: ctx.CUST.row } : { ok: false, reason: 'invalid' };
ctx.touchCustomer = (sheet, colOf, num, upd) => { Object.keys(upd || {}).forEach(k => { ctx.CUST.data[k] = upd[k]; }); };
ctx._weddingSlotTaken = () => !!ctx.SLOT_TAKEN;
ctx.notifyKakao = (ev, code, extra) => { ctx.NOTIFIED.push({ ev, code, extra }); };
ctx._recordHandler = (code, action) => { ctx.HISTORY.push(action); };
vm.runInContext(code, ctx);

/* ── 테스트 헬퍼 ── */
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; failures.push(name + (detail ? '  →  ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  →  ' + detail : '')); }
}
function row(fields) { return { get: h => (fields[h] != null ? fields[h] : '') }; }
function addDays(ymd, n) {
  const m = ymd.split('-').map(Number);
  return new Date(Date.UTC(m[0], m[1] - 1, m[2]) + n * 86400000).toISOString().slice(0, 10);
}
const TODAY = ctx._kstYmd(new Date());          // 소스와 같은 스텁 경유 → dd 산정 기준 일치
const TOTAL = 2800000;                           // 주말·공휴일 총액 → 10% = 280,000
function rec(consent) { return JSON.stringify(consent || {}); }
function hist(n) { const a = []; for (let i = 0; i < n; i++) a.push({ from: null, to: { date: '2026-01-0' + (i + 1), slot: '09:00' }, fee: 0, at: '2026-01-01 10:00' }); return a; }
// 서명완료 시그니처 기본 행 — dd·used를 케이스별로 덮어씀
function base(dd, used, extra) {
  const wed = addDays(TODAY, dd);
  return Object.assign({
    개인코드: 'TC01', 상품타입: '시그니처', 현재단계: '입금완료', 계약상태: '서명완료', 계약총액: TOTAL,
    예식일: wed,
    동의기록: rec({ 계약정보: { weddingDate: wed, weddingTime: '12:20' }, 변경이력: hist(used || 0) })
  }, extra || {});
}
function setCust(fields) { ctx.CUST = { data: Object.assign({}, fields), row: { num: 2, get: h => (ctx.CUST.data[h] != null ? ctx.CUST.data[h] : '') } }; ctx.SLOT_TAKEN = false; ctx.NOTIFIED = []; ctx.HISTORY = []; }
function consent() { return JSON.parse(String(ctx.CUST.data['동의기록'] || '{}')); }

console.log('\n[0] _consultRefundQuote — 상담 취소 환불 예상 (예약금 100,000 · 시착 4조⑧ 공제 · cancel.html)');
ctx.CUST = null;   // Customers 행 없음(원자성 실패)
let cq = ctx._consultRefundQuote('NOROW1');
check('Customers 행 없음 → 전액 100,000 · 공제 0', cq.amount === 100000 && cq.fitDeduct === 0 && cq.fitCount === 0 && !cq.needCount, JSON.stringify(cq));
setCust({ 개인코드: 'TQ01', 시착동의상태: '대기', 동의기록: '' });
cq = ctx._consultRefundQuote('TQ01');
check('시착 전(동의 전) → 전액 환불', cq.amount === 100000 && cq.fitDeduct === 0 && !cq.needCount, JSON.stringify(cq));
setCust({ 개인코드: 'TQ02', 시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { 벌수: 0 } }) });
cq = ctx._consultRefundQuote('TQ02');
check('시착 0벌 → 전액 환불(공제 0)', cq.amount === 100000 && cq.fitCount === 0 && cq.fitDeduct === 0 && !cq.needCount, JSON.stringify(cq));
setCust({ 개인코드: 'TQ03', 시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { 벌수: 2 } }) });
cq = ctx._consultRefundQuote('TQ03');
check('시착 2벌 → 공제 100,000(상한) · 환불 0', cq.amount === 0 && cq.fitCount === 2 && cq.fitDeduct === 100000, JSON.stringify(cq));
setCust({ 개인코드: 'TQ04', 시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { 벌수: 4 } }) });
cq = ctx._consultRefundQuote('TQ04');
check('시착 4벌 → 공제 상한 100,000 · 환불 0', cq.amount === 0 && cq.fitDeduct === 100000, JSON.stringify(cq));
setCust({ 개인코드: 'TQ05', 시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { signedAt: 'x' } }) });
cq = ctx._consultRefundQuote('TQ05');
check('동의완료 + 벌수 미기록 → needCount(공제 0 유지)', cq.needCount === true && cq.fitDeduct === 0 && cq.amount === 100000, JSON.stringify(cq));

console.log('\n[1] _changeFeeQuote — 계약서 8조① 경계 (오늘 ' + TODAY + ' 기준)');
let q = ctx._changeFeeQuote(row(base(150, 0)), addDays(TODAY, 200));
check('dd=150 used=0 → 무상(무상취소 기간)', q.fee === 0 && q.basis === '무상취소 기간 · 횟수 무관 무상' && q.dd === 150, JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(150, 3)), addDays(TODAY, 200));
check('dd=150 used=3 → 무상(횟수 무관)', q.fee === 0 && q.basis === '무상취소 기간 · 횟수 무관 무상' && q.used === 3, JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(149, 0)), addDays(TODAY, 200));
check('dd=149 used=0 → 무상(60일 전 1회)', q.fee === 0 && q.basis === '60일 전 1회 무상', JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(149, 1)), addDays(TODAY, 200));
check('dd=149 used=1 → 10% 280,000', q.fee === 280000 && q.basis === '변경 수수료 10%', JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(60, 0)), addDays(TODAY, 200));
check('dd=60 used=0 → 무상 경계(60일 전 1회)', q.fee === 0 && q.basis === '60일 전 1회 무상' && q.dd === 60, JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(60, 1)), addDays(TODAY, 200));
check('dd=60 used=1 → 10%(2회째)', q.fee === 280000 && q.basis === '변경 수수료 10%', JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(59, 0)), addDays(TODAY, 200));
check('dd=59 used=0 → 10%(D-60 이후)', q.fee === 280000 && q.basis === '변경 수수료 10%' && q.dd === 59, JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(1, 0)), addDays(TODAY, 200));
check('dd=1 used=0 → 10%', q.fee === 280000, JSON.stringify(q));
q = ctx._changeFeeQuote(row(base(59, 0, { 계약총액: 2100000 })), addDays(TODAY, 200));
check('평일 총액 2,100,000 → 수수료 210,000(반올림)', q.fee === 210000, 'fee=' + q.fee);
q = ctx._changeFeeQuote(row(base(200, 2)), addDays(TODAY, 250));
check('used = 변경이력 길이 그대로 반환', q.used === 2, 'used=' + q.used);

console.log('\n[2] handleQuoteWeddingChange — 가드');
const TO_OK = { toDate: addDays(TODAY, 210), toSlot: '09:00' };
setCust(base(200, 0, { 상품타입: '웨딩스냅' }));
let r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('스냅 → 거절', r.ok === false && /웨딩스냅/.test(r.error), JSON.stringify(r));
setCust(base(200, 0, { 계약상태: '발송' }));
r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('서명 전(계약상태=발송) → 거절', r.ok === false && /계약 후/.test(r.error), JSON.stringify(r));
setCust(base(0, 0));
r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('예식 당일(dd=0) → 거절', r.ok === false && /당일/.test(r.error), JSON.stringify(r));
setCust(base(200, 0, { 현재단계: '취소' }));
r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('종료 단계(취소) → 거절', r.ok === false, JSON.stringify(r));
setCust(base(200, 0));
r = ctx.handleQuoteWeddingChange({ token: 't', toDate: addDays(TODAY, -1), toSlot: '09:00' });
check('과거일 → 거절', r.ok === false && /오늘 이후/.test(r.error), JSON.stringify(r));
r = ctx.handleQuoteWeddingChange({ token: 't', toDate: addDays(TODAY, 210), toSlot: '11:11' });
check('슬롯 화이트리스트 밖 → 거절', r.ok === false && /시간을 선택/.test(r.error), JSON.stringify(r));
r = ctx.handleQuoteWeddingChange({ token: 't', toDate: '2026-13-99', toSlot: '09:00' });
check('날짜 형식 오류 → 거절', r.ok === false && /날짜를 선택/.test(r.error), JSON.stringify(r));
r = ctx.handleQuoteWeddingChange({ token: 't', toDate: addDays(TODAY, 200), toSlot: '12:20' });
check('현재 일정과 동일 → 거절', r.ok === false && /지금 예식 일정과 같/.test(r.error), JSON.stringify(r));
ctx.SLOT_TAKEN = true;
r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('슬롯 마감 → 거절', r.ok === false && /마감/.test(r.error), JSON.stringify(r));
ctx.SLOT_TAKEN = false;
r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('정상(무상 구간) → fee 0 · basis · 계좌 동봉', r.ok === true && r.fee === 0 && r.basis === '무상취소 기간 · 횟수 무관 무상' && r.account === '기업 000-000-00000', JSON.stringify(r));
setCust(base(59, 0));
r = ctx.handleQuoteWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('정상(10% 구간) → fee 280,000', r.ok === true && r.fee === 280000 && r.basis === '변경 수수료 10%', JSON.stringify(r));

console.log('\n[3] handleRequestWeddingChange — 기록·멱등·입금자명');
setCust(base(59, 0));   // 10% 구간
r = ctx.handleRequestWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('fee>0 + 입금자명 없음 → 거절', r.ok === false && /입금자명/.test(r.error), JSON.stringify(r));
check('거절 시 변경요청 미기록', !consent().변경요청, ctx.CUST.data['동의기록']);
r = ctx.handleRequestWeddingChange(Object.assign({ token: 't', payerName: '정희준' }, TO_OK));
let cr = consent().변경요청;
check('fee>0 + 입금자명 → 요청 기록', r.ok === true && !!cr, JSON.stringify(r));
check('변경요청.from = 현 예식일·슬롯', cr && cr.from.date === addDays(TODAY, 59) && cr.from.slot === '12:20', JSON.stringify(cr));
check('변경요청.to·fee·basis·payer·at 기록', cr && cr.to.date === TO_OK.toDate && cr.to.slot === '09:00' && cr.fee === 280000 && cr.basis === '변경 수수료 10%' && cr.payer === '정희준' && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(cr.at), JSON.stringify(cr));
check('관리자 알림(admin.changeRequest) 발신', ctx.NOTIFIED.some(n => n.ev === 'admin.changeRequest'), JSON.stringify(ctx.NOTIFIED));
r = ctx.handleRequestWeddingChange(Object.assign({ token: 't', payerName: '정희준' }, TO_OK));
check('같은 to 재요청 → 멱등 already', r.ok === true && r.already === true, JSON.stringify(r));
r = ctx.handleRequestWeddingChange({ token: 't', toDate: addDays(TODAY, 220), toSlot: '15:40', payerName: '김미쿠' });
cr = consent().변경요청;
check('다른 to 재요청 → 덮어쓰기', r.ok === true && cr.to.date === addDays(TODAY, 220) && cr.to.slot === '15:40' && cr.payer === '김미쿠', JSON.stringify(cr));
setCust(base(200, 0));   // 무상 구간 — 입금자명 없이 요청 가능
r = ctx.handleRequestWeddingChange(Object.assign({ token: 't' }, TO_OK));
cr = consent().변경요청;
check('무상 구간 → 입금자명 없이 요청 · fee 0 기록', r.ok === true && cr && cr.fee === 0 && cr.payer === '', JSON.stringify(cr));
setCust(base(200, 0));
ctx.SLOT_TAKEN = true;
r = ctx.handleRequestWeddingChange(Object.assign({ token: 't' }, TO_OK));
check('요청 시점 슬롯 마감 → 거절·미기록', r.ok === false && /마감/.test(r.error) && !consent().변경요청, JSON.stringify(r));
ctx.SLOT_TAKEN = false;

console.log('\n[4] handleCancelWeddingChange — 철회');
setCust(base(200, 0, { 동의기록: rec({ 계약정보: { weddingDate: addDays(TODAY, 200), weddingTime: '12:20' }, 변경요청: { from: {}, to: { date: addDays(TODAY, 210), slot: '09:00' }, fee: 0 }, 영수증발행: { 예약금: { 번호: '1' } } }) }));
r = ctx.handleCancelWeddingChange({ token: 't' });
check('철회 → 변경요청 삭제', r.ok === true && !consent().변경요청, ctx.CUST.data['동의기록']);
check('철회해도 다른 동의기록 키 보존(영수증발행)', !!consent().영수증발행, ctx.CUST.data['동의기록']);
r = ctx.handleCancelWeddingChange({ token: 't' });
check('재철회 → 멱등 already', r.ok === true && r.already === true, JSON.stringify(r));

console.log('\n[5] adminConfirm/DeclineWeddingChange — 적용·거절');
setCust(base(200, 0));
r = ctx.adminConfirmWeddingChange('tc01');
check('요청 없음 → 에러', r.ok === false && /변경 요청이 없/.test(r.error), JSON.stringify(r));
// 유료 요청 적용 — 예식일·계약정보·이력·리마인드·영수증기준일
const FROM_D = addDays(TODAY, 59), TO_D = addDays(TODAY, 210);
setCust(base(59, 0, {
  중도금리마인드: '예고', 잔금리마인드: '2026-06-01 10:00',
  동의기록: rec({ 계약정보: { weddingDate: FROM_D, weddingTime: '12:20' },
    변경요청: { from: { date: FROM_D, slot: '12:20' }, to: { date: TO_D, slot: '09:00' }, fee: 280000, basis: '변경 수수료 10%', payer: '정희준', at: '2026-06-10 09:00' } })
}));
ctx.SLOT_TAKEN = true;
r = ctx.adminConfirmWeddingChange('tc01');
check('적용 직전 슬롯 마감 → 에러(재조율 안내)', r.ok === false && /마감/.test(r.error) && /재조율/.test(r.error), JSON.stringify(r));
check('마감 에러 시 아무것도 안 바뀜', ctx.CUST.data['예식일'] === FROM_D && !!consent().변경요청, JSON.stringify(consent()));
ctx.SLOT_TAKEN = false;
r = ctx.adminConfirmWeddingChange('tc01');
let c5 = consent();
check('적용 OK', r.ok === true && r.date === TO_D, JSON.stringify(r));
check('예식일(톱레벨) 갱신', ctx.CUST.data['예식일'] === TO_D, '예식일=' + ctx.CUST.data['예식일']);
check('동의기록.계약정보.weddingDate/Time 갱신', c5.계약정보.weddingDate === TO_D && c5.계약정보.weddingTime === '09:00', JSON.stringify(c5.계약정보));
check('변경이력 push({from,to,fee,at})', c5.변경이력 && c5.변경이력.length === 1 && c5.변경이력[0].from.date === FROM_D && c5.변경이력[0].to.date === TO_D && c5.변경이력[0].fee === 280000 && !!c5.변경이력[0].at, JSON.stringify(c5.변경이력));
check('변경요청 삭제', !c5.변경요청, JSON.stringify(c5));
check('중도금·잔금 리마인드 리셋(새 날짜 재안내)', ctx.CUST.data['중도금리마인드'] === '' && ctx.CUST.data['잔금리마인드'] === '', JSON.stringify({ m: ctx.CUST.data['중도금리마인드'], b: ctx.CUST.data['잔금리마인드'] }));
check('fee>0 → 영수증기준일.변경수수료 기록', !!(c5.영수증기준일 && c5.영수증기준일.변경수수료), JSON.stringify(c5.영수증기준일));
check('고객 알림(cust.changeConfirmed) 발신', ctx.NOTIFIED.some(n => n.ev === 'cust.changeConfirmed'), JSON.stringify(ctx.NOTIFIED));
check('적용 후 used=1 (다음 변경은 유료 근거)', ctx._changeFeeQuote(ctx.CUST.row, null).used === 1, '');
// 무상 요청 적용 — 영수증기준일 없음
setCust(base(200, 0, { 동의기록: rec({ 계약정보: { weddingDate: addDays(TODAY, 200), weddingTime: '12:20' }, 변경요청: { from: { date: addDays(TODAY, 200), slot: '12:20' }, to: { date: TO_D, slot: '15:40' }, fee: 0, basis: '무상취소 기간 · 횟수 무관 무상', payer: '', at: '2026-06-10 09:00' } }) }));
r = ctx.adminConfirmWeddingChange('tc01');
c5 = consent();
check('무상 적용 → 영수증기준일 미기록', r.ok === true && !(c5.영수증기준일 && c5.영수증기준일.변경수수료), JSON.stringify(c5.영수증기준일 || null));
check('취소·노쇼 등 종료 단계 → 에러', (function () { setCust(base(59, 0, { 현재단계: '노쇼', 동의기록: rec({ 변경요청: { to: { date: TO_D, slot: '09:00' } } }) })); return ctx.adminConfirmWeddingChange('tc01').ok === false; })(), '');
check('계약 풀린 행(서명완료 아님) → 에러(예식일 오기록 방지)', (function () { setCust(base(59, 0, { 계약상태: '미발송', 동의기록: rec({ 변경요청: { to: { date: TO_D, slot: '09:00' } } }) })); var rr = ctx.adminConfirmWeddingChange('tc01'); return rr.ok === false && ctx.CUST.data['예식일'] === addDays(TODAY, 59); })(), '');
// 거절
setCust(base(59, 0, { 동의기록: rec({ 계약정보: { weddingDate: FROM_D, weddingTime: '12:20' }, 변경요청: { from: { date: FROM_D, slot: '12:20' }, to: { date: TO_D, slot: '09:00' }, fee: 280000, payer: '정희준' } }) }));
r = ctx.adminDeclineWeddingChange('tc01', '그 주는 진행이 어려워요');
c5 = consent();
check('거절 → 변경요청 삭제 · 예식일 유지', r.ok === true && !c5.변경요청 && ctx.CUST.data['예식일'] === FROM_D, JSON.stringify(c5));
check('거절 사유 알림(cust.changeDeclined)', ctx.NOTIFIED.some(n => n.ev === 'cust.changeDeclined' && n.extra && /어려워요/.test(n.extra.reason)), JSON.stringify(ctx.NOTIFIED));
check('거절 이력 기록(처리이력)', ctx.HISTORY.some(h => /변경 거절/.test(h)), JSON.stringify(ctx.HISTORY));
r = ctx.adminDeclineWeddingChange('tc01', '');
check('재거절 → 멱등 already', r.ok === true && r.already === true, JSON.stringify(r));

console.log('\n[6] buildChangeState — 마이페이지 노출 게이트');
check('스냅 → null', ctx.buildChangeState(row(base(200, 0, { 상품타입: '웨딩스냅' }))) === null);
check('서명 전 → null', ctx.buildChangeState(row(base(200, 0, { 계약상태: '발송' }))) === null);
check('종료 단계(취소) → null', ctx.buildChangeState(row(base(200, 0, { 현재단계: '취소' }))) === null);
let st = ctx.buildChangeState(row(base(200, 2)));
check('서명완료 → {request:null,used,history,eligible}', !!st && st.request === null && st.used === 2 && st.history === 2 && st.eligible === true, JSON.stringify(st));
st = ctx.buildChangeState(row(base(0, 0)));
check('예식 당일 → eligible=false', !!st && st.eligible === false, JSON.stringify(st));
st = ctx.buildChangeState(row(base(200, 0, { 동의기록: rec({ 변경요청: { from: { date: 'a' }, to: { date: TO_D, slot: '09:00' }, fee: 280000, basis: '변경 수수료 10%', payer: '정희준', at: 'x' } }) })));
check('요청 대기 → request.to·fee·payer 노출', !!st && st.request && st.request.to.date === TO_D && st.request.fee === 280000 && st.request.payer === '정희준', JSON.stringify(st));

console.log('\n[6b] _chgWhenLabel — 변경확인 큐 표기');
check('날짜 → M/D(요일)', /^\d{1,2}\/\d{1,2}\([일월화수목금토]\)$/.test(ctx._chgWhenLabel('2026-11-27', '')), ctx._chgWhenLabel('2026-11-27', ''));
check('슬롯 라벨 동반(12:20=오후)', /\) 오후$/.test(ctx._chgWhenLabel('2026-12-05', '12:20')), ctx._chgWhenLabel('2026-12-05', '12:20'));

/* ── [7] 구문검증 — automation 전체 .gs + 변경 HTML 인라인 스크립트 (new Function) ── */
console.log('\n[7] 구문검증 (new Function)');
function listGs(dir) {
  let out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listGs(p));
    else if (e.name.endsWith('.gs')) out.push(p);
  });
  return out;
}
listGs(path.join(ROOT, 'automation')).forEach(function (f) {
  try { new Function(fs.readFileSync(f, 'utf8')); check('GS  ' + path.relative(ROOT, f), true); }
  catch (e) { check('GS  ' + path.relative(ROOT, f), false, e.message); }
});
['mypage.html', 'admin.html', 'cancel.html', 'automation/admin/Admin.html'].forEach(function (rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let m, i = 0, re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = re.exec(html))) {
    i++;
    if (/\bsrc\s*=/.test(m[1]) || /type\s*=\s*["'](?!text\/javascript)[^"']*["']/.test(m[1])) continue;
    if (!m[2].trim()) continue;
    try { new Function(m[2]); check('HTML ' + rel + ' <script #' + i + '>', true); }
    catch (e) { check('HTML ' + rel + ' <script #' + i + '>', false, e.message); }
  }
});

console.log('\n────────────────────────────────────');
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) { console.log('실패 목록:\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('전부 통과');
