// 95_notify 문구 빌더 회귀 테스트 — 실행: node automation/tests/notify-msg.test.js
// 검증: ① 전 고객/관리자 이벤트 문구에 undefined·NaN·전각 줄표(—) 누출 없음
//       ② _nfWon 문자 금액 방어('300,000원' → 300,000 · 임의 문자 → 0, 'NaN원' 금지)
//       ③ 야간 보류 창(21시~익일 8시) 경계 24시간 전수
//       ④ notifyKakao 전 이벤트 무예외(미등록 이벤트 포함 · 발송 OFF 로그 경로)
const fs = require('fs');
const path = require('path');
const src = fs.readFileSync(path.join(__dirname, '..', 'platform', '95_notify.gs'), 'utf8');
const src2 = src;

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


// ⑤ 스냅 단어 분기 — 공용 이벤트가 스냅 고객에겐 '촬영'(상담·예식 아님)으로
[['cust.consultConfirmed','#{유형}'],['cust.consultDayBefore','#{유형}'],['cust.timeProposed','#{유형}']].forEach(function(c){
  const sig = api._nfCustomerMsg(c[0], '하윤·민준', FULL);
  const snp = api._nfCustomerMsg(c[0], '하윤·민준', Object.assign({}, FULL, { snap: true }));
  check(c[0]+' 시그=상담', sig.vars[c[1]] === '상담' && sig.text.indexOf('상담') !== -1, JSON.stringify(sig.vars));
  check(c[0]+' 스냅=촬영', snp.vars[c[1]] === '촬영' && snp.text.indexOf('촬영') !== -1 && snp.text.indexOf('상담') === -1, snp.text);
});
['cust.balancePre','cust.balanceDue'].forEach(function(ev){
  const sig = api._nfCustomerMsg(ev, '하윤·민준', FULL);
  const snp = api._nfCustomerMsg(ev, '하윤·민준', Object.assign({}, FULL, { snap: true }));
  check(ev+' 시그=예식', sig.vars['#{행사}'] === '예식', JSON.stringify(sig.vars));
  check(ev+' 스냅=촬영', snp.vars['#{행사}'] === '촬영' && snp.text.indexOf('예식') === -1, snp.text);
});

// ⑥ off 이벤트 발송 차단 — NOTIFY_ENABLED=true·고객 조회 성공이어도 fetch 0회
(function(){
  let sent = 0;
  const props = { getProperty: function(k){ return ({ NOTIFY_ENABLED:'true', SOLAPI_API_KEY:'k', SOLAPI_API_SECRET:'s', SOLAPI_SENDER:'01000000000', SOLAPI_PF_ID:'KA01PFTEST', ADMIN_PHONE:'01000000000' })[k] || null; }, setProperty(){}, deleteProperty(){}, getProperties(){ return {}; } };
  const row = { get: function(k){ return ({ '연락처':'01012345678', '신랑이름':'민준', '신부이름':'하윤', '상품타입':'시그니처' })[k] || ''; } };
  const api2 = new Function('PropertiesService','Logger','Utilities','LockService','UrlFetchApp','fmtKST','findCustomerByCode','_recordHandler','_kstYmd','_shiftYmd',
    src2 + '\n;return {NOTIFY_EVENTS:NOTIFY_EVENTS, notifyKakao:notifyKakao};')(
    { getScriptProperties: function(){ return props; } }, { log(){} },
    { formatDate: function(d,tz,f){ return f==='H' ? '12' : '2026-06-11'; }, getUuid: function(){ return 'u'; }, computeHmacSha256Signature: function(){ return [0]; } },
    { getScriptLock: function(){ return { waitLock(){}, releaseLock(){} }; } },
    { fetch: function(){ sent++; return { getResponseCode: function(){ return 200; }, getContentText: function(){ return ''; } }; } },
    function(){ return '2026-06-11 12:00'; }, function(){ return row; }, function(){}, function(){ return '2026-06-11'; }, function(y){ return y; });
  Object.keys(api2.NOTIFY_EVENTS).forEach(function(ev){
    if (ev.indexOf('cust.') !== 0) return;
    sent = 0;
    api2.notifyKakao(ev, 'ME-001', FULL);
    const off = !!api2.NOTIFY_EVENTS[ev].off;
    check(ev + (off ? ' off→발송 0회' : ' on→발송 1회'), sent === (off ? 0 : 1), '발송 ' + sent + '회');
  });
})();

// ⑦ md 템플릿 ↔ vars 1:1 — 등록 14종+발송안함 4종 본문 변수가 코드 vars와 정확히 일치
(function(){
  const md = fs.readFileSync(path.join(__dirname, '..', '알림톡_템플릿_신청문안.md'), 'utf8');
  const sec = md.split('## 1. 등록 템플릿')[1].split('## 2. 승인 후')[0];
  const re = /### T\d+[^\n]*— `([^`]+)`[^\n]*\n[^\n]*\n```\n([\s\S]*?)```/g;
  let m, seen = 0;
  while ((m = re.exec(sec))) {
    seen++;
    const evs = m[1].split('·').map(function(s){ return s.replace(/`/g,'').trim(); });
    const bodyVars = (m[2].match(/#\{[^}]+\}/g) || []).filter(function(v,i,a){ return a.indexOf(v) === i; }).sort();
    evs.forEach(function(ev){
      const built = api._nfCustomerMsg(ev, '하윤·민준', Object.assign({}, FULL, { snap: false }));
      check('md↔코드 ' + ev + ' 빌더 존재', !!built);
      if (!built) return;
      const codeVars = Object.keys(built.vars).sort();
      check('md↔코드 ' + ev + ' 변수 일치', JSON.stringify(bodyVars) === JSON.stringify(codeVars), 'md=' + bodyVars + ' 코드=' + codeVars);
      check('md ' + ev + ' 본문 전각줄표 없음', m[2].indexOf('—') === -1);
    });
  }
  check('md 템플릿 블록 18종 파싱(14+4)', seen === 18, seen + '종');
})();

console.log('\n────────────────────────────────────');
console.log('PASS ' + pass + ' · FAIL ' + fail);
console.log(fail ? '실패 있음' : '전부 통과');
process.exit(fail ? 1 : 0);
