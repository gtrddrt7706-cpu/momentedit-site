// 95_notify 문구 빌더 회귀 테스트 — 실행: node automation/tests/notify-msg.test.js
// 검증: ① 전 고객/관리자 이벤트 문구에 undefined·NaN·전각 줄표(—) 누출 없음
//       ② _nfWon 문자 금액 방어('300,000원' → 300,000 · 임의 문자 → 0, 'NaN원' 금지)
//       ③ 야간 보류 창(21시~익일 8시) 경계 24시간 전수
//       ④ notifyKakao 전 이벤트 무예외(미등록 이벤트 포함 · 발송 OFF 로그 경로)
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'platform', '95_notify.gs'), 'utf8');

// GAS 전역 스텁 — 발송 없이 문구·게이트 로직만 평가
let HOUR = 12;
const PropertiesService = { getScriptProperties: () => ({ getProperty: () => null, setProperty() {}, deleteProperty() {}, getProperties: () => ({}) }) };
const api = new Function('PropertiesService', 'Logger', 'Utilities', 'LockService', 'UrlFetchApp', 'fmtKST', 'findCustomerByCode', '_recordHandler', '_kstYmd', '_shiftYmd',
  src + '\n;return {NOTIFY_EVENTS:NOTIFY_EVENTS,_nfCustomerMsg:_nfCustomerMsg,_nfAdminText:_nfAdminText,_nfWon:_nfWon,_nfIsNight:_nfIsNight,notifyKakao:notifyKakao};')(
  PropertiesService, { log() {} },
  { formatDate: (d, tz, f) => (f === 'H' ? String(HOUR) : '2026-06-11'), getUuid: () => 'u', computeHmacSha256Signature: () => [0] },
  { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  { fetch: () => ({ getResponseCode: () => 200, getContentText: () => '' }) },
  () => '2026-06-11 12:00', () => null, () => {}, () => '2026-06-11', (y) => y);

let pass = 0, fail = 0;
function check(name, ok, detail) {
  if (ok) { pass++; }
  else { fail++; console.log('FAIL ' + name + (detail ? ' · ' + String(detail).slice(0, 120) : '')); }
}

// ① 전 이벤트 문구 누출 점검 (실전형 extras)
const FULL = { date: '2026-07-01', time: '19:30', slot: '12:20', kind: '계약금', amount: 300000, dday: 9, left: 2,
  expires: '2026-12-01', reason: '일정 충돌', names: '하윤·민준', payer: '홍길동', product: '시그니처', count: 12,
  total: 3, urgent: 1, consults: 2, fail: 0, weddingDate: '2027-01-01', from: '2027-01-01 09:00', to: '2027-02-01 12:20', fee: 50000, acct: '국민 1-2', withBalance: true, num: 'A-1' };
Object.keys(api.NOTIFY_EVENTS).forEach(function (ev) {
  if (ev.indexOf('cust.') === 0) {
    const m = api._nfCustomerMsg(ev, '하윤·민준', FULL);
    check(ev + ' 문구 정의', !!(m && m.text));
    if (m && m.text) {
      check(ev + ' 누출 없음', !/undefined|NaN/.test(m.text), m.text);
      check(ev + ' 전각줄표 없음', m.text.indexOf('—') === -1, m.text);
      Object.keys(m.vars).forEach(function (k) { check(ev + ' vars 문자열 ' + k, typeof m.vars[k] === 'string'); });
    }
  } else {
    const t = api._nfAdminText(ev, 'ME-001', FULL);
    check(ev + ' 누출 없음', !/undefined|NaN/.test(t), t);
  }
});

// ② _nfWon 문자 금액 방어
[[300000, '300,000'], ['300,000', '300,000'], ['300,000원', '300,000'], ['삼십만', '0'], [undefined, '0'], [null, '0'], [NaN, '0'], [0, '0']]
  .forEach(function (c) { check('_nfWon(' + c[0] + ')', api._nfWon(c[0]) === c[1], api._nfWon(c[0]) + ' ≠ ' + c[1]); });

// ③ 야간 보류 창 경계 24시간
for (let h = 0; h < 24; h++) { HOUR = h; check('야간창 ' + h + '시', api._nfIsNight() === (h >= 21 || h < 8)); }
HOUR = 12;

// ④ notifyKakao 무예외(발송 OFF 경로 · 미등록 이벤트 포함)
let threw = 0;
Object.keys(api.NOTIFY_EVENTS).concat(['unknown.event']).forEach(function (ev) {
  [undefined, {}, FULL].forEach(function (x) { try { api.notifyKakao(ev, 'ME-001', x); } catch (e) { threw++; } });
});
check('notifyKakao 무예외', threw === 0, threw + '건 예외');

console.log('\n────────────────────────────────────');
console.log('PASS ' + pass + ' · FAIL ' + fail);
console.log(fail ? '실패 있음' : '전부 통과');
process.exit(fail ? 1 : 0);
