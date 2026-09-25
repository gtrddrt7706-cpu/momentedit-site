// 연락처 한 건이 «신청 → 야간 보류 → 취소 → 아침 발송»을 도는 동안 무슨 일이 나는지
// **실제 GAS 소스를 그대로 실행해** 확인하는 시뮬레이션.
//
// ★[CONTACT_LIFECYCLE_SIM 2026-09-25 사장님 「너가 직접 테스트해봐 시뮬레이션 통해서」]
//   단위 검사(phone-kr-norm · hold-drop)는 함수 하나씩만 본다. 사장님이 실제로 겪은 일은
//   그 함수들이 **줄지어 도는 동안** 생겼다 — 번호가 82… 로 앉고 → 밤에 큐에 쌓이고 →
//   취소했는데 큐는 몰랐고 → 아침마다 재시도되다 사흘째 버려지며 메일이 됐다.
//   그 «줄»을 통째로 돌려 본다.
//
//   ★함수를 베껴 쓰지 않는다. 95_notify.gs·00_platform-config.gs 에서 소스를 **그대로 꺼내**
//     평가한다. 그래서 다음 판이 발송 자나 보류 규칙을 바꾸면 이 시뮬레이션이 같이 따라간다.
//     (베껴 쓰면 «코드는 바뀌었는데 검사는 옛 규칙»이 되어 조용히 초록이 된다 — NOT_THE_SOURCE)
//
//   ★[SERVED_OURS] 파일·함수를 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CFG = path.join(ROOT, 'automation/platform/00_platform-config.gs');
const NOTIFY = path.join(ROOT, 'automation/platform/95_notify.gs');

for (const f of [CFG, NOTIFY]) if (!fs.existsSync(f)) {
  console.log(`━━ contact-lifecycle-sim — ${path.relative(ROOT, f)} 가 없습니다 · 재지 못했습니다`);
  process.exit(2);
}
const cfgSrc = fs.readFileSync(CFG, 'utf8');
const nfSrc = fs.readFileSync(NOTIFY, 'utf8');

// ── 소스를 «그대로» 꺼낸다 (함수 선언 ~ 첫 열 없는 닫는 중괄호)
function grab(src, name, file) {
  const i = src.indexOf(`\nfunction ${name}(`);
  if (i < 0) return null;
  const lines = src.slice(i + 1).split('\n');
  const out = [];
  for (const ln of lines) { out.push(ln); if (ln === '}') break; }
  return out[out.length - 1] === '}' ? out.join('\n') : null;
}
const NEED = { _phoneKR: cfgSrc, _kakaoSend: nfSrc, _nfHoldPush: nfSrc, _nfHoldDrop: nfSrc, flushHeldNotifies: nfSrc };
const bodies = {};
for (const [fn, src] of Object.entries(NEED)) {
  const b = grab(src, fn);
  if (!b) { console.log(`━━ contact-lifecycle-sim — ${fn} 을 꺼내지 못했습니다 · 재지 못했습니다`); process.exit(2); }
  bodies[fn] = b;
}

// ── GAS 흉내 (움직이는 것만 · 나머지는 기록만 남긴다)
const log = [];
const world = {
  props: {},              // ScriptProperties
  sheet: {},              // 개인코드 → { 연락처, 이메일, 상품타입 }
  sent: [],               // 실제로 «나간» 알림
  adminMails: [],         // 관리자에게 간 메일
  custMails: [],          // 고객에게 간 대체 메일 [KAKAO_FAIL_MAIL]
  night: false,
};
const STUBS = `
var __W = __world, __L = __log;
var Logger = { log: function (s) { __L.push(String(s)); } };
var PropertiesService = { getScriptProperties: function () { return {
  getProperty: function (k) { return Object.prototype.hasOwnProperty.call(__W.props, k) ? __W.props[k] : null; },
  setProperty: function (k, v) { __W.props[k] = String(v); },
  deleteProperty: function (k) { delete __W.props[k]; }
}; } };
var LockService = { getScriptLock: function () { return { waitLock: function () {}, releaseLock: function () {} }; } };
var Utilities = { formatDate: function () { return '20260925'; }, getUuid: function () { return 'u-u-u-u'; } };
function fmtKST() { return '2026-09-25 21:00'; }
function _nfProps() { return { key: 'K', secret: 'S', sender: '01000000000', pfId: 'PF', templates: { 'cust.fittingRequest': 'T1', 'cust.balanceDue': 'T2' } }; }
function _nfIsNight() { return !!__W.night; }
function _notifyEnabled() { return true; }
function _adminInfoOn() { return false; }
var NOTIFY_EVENTS = { 'cust.fittingRequest': {}, 'cust.balanceDue': {} };
function findCustomerByCode(code) {
  var row = __W.sheet[String(code || '').trim()];
  if (!row) return null;
  return { get: function (k) { return row[k] == null ? '' : row[k]; } };
}
function _nfCoupleName() { return '신랑·신부'; }
function _nfCustomerMsg(event) { return { vars: {}, text: '문구:' + event }; }
function _solapiSend(cfg, msg) { __W.sent.push({ to: msg.to, text: msg.text }); return true; }
function _nfCustomerEmailFallback(to, n, e) { __W.custMails.push(String(to) + '|' + e); return true; }   // 진짜처럼 «보냈다»를 돌려준다
function _nfAdminLineEmail(t) { __W.adminMails.push(String(t)); }
function _nfAdminText(e) { return 'admin:' + e; }
function _nfPayConfirmAction() { return null; }
`;
let F;
try {
  F = new Function('__world', '__log',
    `${STUBS}\n${Object.values(bodies).join('\n')}\n` +
    `return { _phoneKR: _phoneKR, _kakaoSend: _kakaoSend, _nfHoldPush: _nfHoldPush, _nfHoldDrop: _nfHoldDrop, flushHeldNotifies: flushHeldNotifies };`
  )(world, log);
} catch (e) {
  console.log('━━ contact-lifecycle-sim — 소스를 평가하지 못했습니다: ' + e.message);
  process.exit(2);
}

const bad = [];
const ok = (cond, label) => { if (!cond) bad.push(label); };
const reset = function (phone) {
  world.props = {}; world.sent = []; world.adminMails = []; world.custMails = []; world.night = false; log.length = 0;
  world.sheet = { AB12CD: { 연락처: phone, 이메일: (arguments.length > 1 ? arguments[1] : 'a@b.kr'), 상품타입: '예식' } };
};
const queue = () => JSON.parse(world.props.NOTIFY_HOLD || '[]');

console.log('━━ 연락처 한 건의 생애 — 실제 GAS 소스로 돌린다\n');

// ── 장면 1. 사장님이 겪은 일 그대로 (고친 뒤에는 어떻게 되나)
console.log('【장면 1】 아이폰 자동완성 «+82 10-…»(가상 번호) 으로 신청이 들어온다');
{
  const stored = F._phoneKR('+82 10-7349-9770');        // 40_signup 이 저장 전에 부르는 그 함수
  reset(stored);
  console.log(`  시트에 앉는 값            ${stored}`);
  ok(stored === '01073499770', `저장값이 「${stored}」 — 01073499770 이어야 한다`);

  world.night = true;
  const r1 = F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
  console.log(`  밤 22시 알림 → ${r1} · 큐 ${queue().length}건`);
  ok(r1 === 'held' && queue().length === 1, '밤에는 보류 큐로 들어가야 한다');

  world.night = false;
  F.flushHeldNotifies();
  console.log(`  아침 8시 발송 → 나간 알림 ${world.sent.length}건 (받는 번호 ${world.sent[0] && world.sent[0].to}) · 큐 ${queue().length}건`);
  ok(world.sent.length === 1 && world.sent[0].to === '01073499770', '아침에 그 번호로 실제 발송돼야 한다');
  ok(queue().length === 0, '보낸 뒤 큐가 비어야 한다');
  ok(world.adminMails.length === 0, `관리자에게 쓸데없는 메일이 갔다: ${world.adminMails.join(' / ')}`);
}

// ── 장면 2. 이미 시트에 앉아 있는 «복원 불가» 값 — 억지로 보내면 안 된다
// ★[PHONE_AUTOFILL_82 2026-09-25 정정] 이 값은 «+82 10-7349-7706» 을 우리 문의서 칸이 11자리로 자르며 끝자리 6 을 잃은 것이다(장면 6).
console.log('\n【장면 2】 시트에 이미 있는 «821 0734 9770»(끝자리가 잘린 값)');
{
  reset('821 0734 9770');
  const r = F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
  console.log(`  발송 시도 → ${r} · 나간 알림 ${world.sent.length}건 · 관리자 메일 ${world.adminMails.length}통`);
  ok(r !== true && world.sent.length === 0, '★복원할 수 없는 번호로 «발송»되면 안 된다(오배송)');
  ok(r === 'mail' && world.custMails.length === 1, `★알림톡은 못 보내도 고객에겐 메일로 가야 한다(KAKAO_FAIL_MAIL) — 반환 ${r} · 메일 ${world.custMails.length}통`);
  ok(world.adminMails.length === 1, '대신 관리자에게 한 번 알려야 한다 — 그래야 고칠 수 있다');
  ok(/연락처 형식 이상/.test(world.adminMails[0] || ''), `관리자 메일 문면이 다르다: ${world.adminMails[0]}`);

  const before = world.adminMails.length;
  F._kakaoSend('customer', 'cust.balanceDue', 'AB12CD', null);
  F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
  console.log(`  같은 날 두 번 더 시도 → 관리자 메일 ${world.adminMails.length}통 (하루 1통이어야 한다)`);
  ok(world.adminMails.length === before, '★같은 날 메일이 쏟아지면 그것도 침묵과 같다(알림 피로)');
}

// ── 장면 3. 사장님이 실제로 받은 그 메일 — 취소한 고객의 알림이 사흘 재시도되던 일
console.log('\n【장면 3】 밤에 알림 5건이 쌓인 고객을 «취소»했다 (2026-09-24 메일의 그 상황)');
{
  reset('01073499770');
  world.night = true;
  for (let i = 0; i < 5; i++) F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
  F._nfHoldPush('cust.balanceDue', 'OTHER9', null);       // 남의 고객 1건 — 같이 지워지면 더 큰 사고다
  console.log(`  큐 ${queue().length}건 (내 고객 5 + 남 1)`);
  ok(queue().length === 6, '큐에 6건이어야 한다');

  const dropped = F._nfHoldDrop('AB12CD');                 // adminForceStage 가 부르는 그 함수
  console.log(`  취소 처리 → 내린 알림 ${dropped}건 · 남은 큐 ${queue().length}건`);
  ok(dropped === 5, `내 고객 것 5건만 내려야 하는데 ${dropped}건`);
  ok(queue().length === 1 && queue()[0].c === 'OTHER9', '★남의 고객 알림은 살아 있어야 한다');

  world.night = false;
  F.flushHeldNotifies();
  console.log(`  아침 8시 → 취소한 고객에게 나간 알림 ${world.sent.filter(s => s.to === '01073499770').length}건`);
  ok(world.sent.filter(s => s.to === '01073499770').length === 0, '★취소한 고객에게 알림이 나가면 안 된다');
  ok(world.adminMails.length === 0, `★영문 모를 「3회 실패」 메일이 또 갔다: ${world.adminMails.join(' / ')}`);
}

// ── 장면 4. 고치기 전이었다면? (이 수정이 실제로 무엇을 막았는지 반대로 확인한다)
console.log('\n【장면 4】 되돌려 보기 — 취소가 큐를 안 내렸다면 (종전 동작 · 메일도 없는 고객)');
{
  /* ★2026-09-25 부터 메일이 있는 고객은 첫 아침에 메일로 받고 재시도가 없다(KAKAO_FAIL_MAIL · 장면 5).
     «세 번 시도해도 실패» 메일은 이제 «아무것도 안 닿는» 고객에게만 생긴다 — 그 조건으로 재현한다. */
  reset('821 0734 9770', '');
  world.night = true;
  for (let i = 0; i < 5; i++) F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
  world.night = false;
  for (let day = 1; day <= 3; day++) { world.props = { NOTIFY_HOLD: world.props.NOTIFY_HOLD }; F.flushHeldNotifies(); }
  const drop = world.adminMails.filter(m => /세 번 시도해도 실패/.test(m));
  console.log(`  사흘 치 아침 → 「세 번 시도해도 실패」 메일 ${drop.length}통`);
  console.log(`    ${drop[0] ? drop[0].slice(0, 90) + '…' : '(없음)'}`);
  ok(drop.length === 1, '★사장님이 받으신 그 메일이 재현돼야 «무엇을 고쳤는지»가 증명된다');
  ok(/AB12CD\/cust\.fittingRequest/.test(drop[0] || ''), '메일에 고객코드·이벤트가 찍혀야 한다');
}

// ── 장면 5. 번호가 틀렸지만 메일은 있는 고객 — 아침에 메일 한 통, 재시도 없음 [KAKAO_FAIL_MAIL]
console.log('\n【장면 5】 밤에 쌓인 알림 · 번호가 틀렸고 메일은 있다');
{
  reset('821 0734 9770');
  world.night = true;
  F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
  world.night = false;
  for (let day = 1; day <= 3; day++) { world.props = { NOTIFY_HOLD: world.props.NOTIFY_HOLD }; F.flushHeldNotifies(); }
  console.log(`  사흘 치 아침 → 고객 메일 ${world.custMails.length}통 · 남은 큐 ${queue().length}건 · «세 번 실패» 메일 ${world.adminMails.filter(m => /세 번 시도해도 실패/.test(m)).length}통`);
  ok(world.custMails.length === 1, `★같은 메일이 아침마다 또 가면 안 된다 — ${world.custMails.length}통`);
  ok(queue().length === 0, '메일로 닿았으면 큐에서 내려야 한다');
  ok(!world.adminMails.some(m => /세 번 시도해도 실패/.test(m)), '★닿았는데 «세 번 실패»라고 알리면 안 된다');
}

// ── 장면 6. [PHONE_AUTOFILL_82] 자동완성 «+82 10-7349-7706» 이 문의서 칸 → 저장 → 발송까지
//   장면 2 의 «잘린 값»이 어디서 생겼는지 — 문의서 칸이 숫자만 남긴 12자를 11자로 잘랐다. 그 칸을 실제로 돌린다.
console.log('\n【장면 6】 자동완성 «+82 10-7349-7706» 이 문의서 칸을 지나 저장·발송되기까지');
{
  const vm = await import('node:vm');
  const w = {}; vm.runInNewContext(fs.readFileSync(path.join(ROOT, 'shared/tel-kr.js'), 'utf8'), { window: w });
  const inq = fs.readFileSync(path.join(ROOT, 'inquiry.html'), 'utf8');
  const fmtSrc = (inq.match(/phoneInput\.addEventListener\('input', \(e\) => \{([\s\S]*?)\n\}\);/) || [])[1];
  if (!fmtSrc || !w.meTelDigits) { bad.push('문의서 칸 포맷터나 meTelDigits 를 꺼내지 못했다 — 구조가 바뀌었으면 이 장면을 고칠 것'); }
  else {
    const field = { value: '+82 10-7349-7706' };
    new Function('e', 'window', 'meTelDigits', fmtSrc)({ target: field }, { meTelDigits: w.meTelDigits }, w.meTelDigits);
    const stored = F._phoneKR(field.value);               // 40_signup 이 저장 전에 부르는 그 함수
    reset(stored);
    const r = F._kakaoSend('customer', 'cust.fittingRequest', 'AB12CD', null);
    console.log(`  칸에 보이는 값 ${field.value} → 시트 ${stored} → 발송 ${r} (받는 번호 ${world.sent[0] && world.sent[0].to})`);
    ok(field.value === '010-7349-7706', `★문의서 칸이 「${field.value}」 — 끝자리를 자르면 안 된다(종전 821-0734-9770)`);
    ok(stored === '01073497706' && r === true && world.sent.length === 1 && world.sent[0].to === '01073497706', '그 번호로 알림톡이 실제로 나가야 한다');
  }
}

console.log('');
if (bad.length) {
  console.log('━━ contact-lifecycle-sim — 빨강 ' + bad.length + '건');
  for (const b of bad) console.log('   · ' + b);
  process.exit(1);
}
console.log('━━ contact-lifecycle-sim OK — 여섯 장면 전부 기대대로 (실제 GAS 소스 5개 + 문의서 칸을 그대로 실행)');
process.exit(0);
