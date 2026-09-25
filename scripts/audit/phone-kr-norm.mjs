// 국제표기 휴대폰(+82)이 저장 전에 국내표기로 바뀌는지 재는 검사.
//
// ★[PHONE_KR_NORM 2026-09-25 사장님 「오류발생」 · ⚠ 연락처 형식이 이상해요 · 821 0734 9770]
//   그 값은 아이폰 연락처에서 자동완성된 `+82 10-7349-9770` 이 그대로 저장된 것이다.
//   inquiry.html 의 입력 패턴이 `[0-9\-\s\+]{9,}` 라 +·공백을 받고,
//   40_signup 은 `.trim()` 만 해서 시트에 `821 0734 9770` 로 앉았다.
//   그 뒤 95_notify 의 발송 자(/^01[016789][0-9]{7,8}$/)가 떨어뜨려
//   그 고객의 알림톡·문자가 전부 생략됐고, 야간 보류 큐의 것도 아침마다 같은 자에서
//   떨어져 실패로 남아 관리자 메일이 됐다.
//
//   ★종전 두 판은 «드러내기»(CONTACT_SILENT 관리자 메일)와 «고치기»(연락처 정정 화면)였다.
//     둘 다 사람 손이 필요하고 다음 고객에게 또 난다. 이번 판은 «막기»다 — 셋이 층을 이룬다.
//
//   ★이 검사가 보는 것 — 세 가지다.
//     ① _phoneKR 이 +82 계열을 0… 으로 바꾸고, **모르는 모양은 그대로 두는가**
//        (억지로 고치면 «남의 번호»를 만들어 발송 자를 통과시킨다 — 그게 더 큰 사고다)
//     ② 저장 경로(40_signup)와 발송 경로(95_notify)가 실제로 그것을 부르는가
//     ③ 판정하는 네 자리가 **같은 자**를 쓰는가
//        (발송은 통과하는데 목록은 «조용하다»고 올리면 관리자가 멀쩡한 번호를 고친다)
//
//   ★[SERVED_OURS] 파일·함수를 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const CFG = path.join(ROOT, 'automation/platform/00_platform-config.gs');
const SIGNUP = path.join(ROOT, 'automation/platform/40_signup.gs');
const NOTIFY = path.join(ROOT, 'automation/platform/95_notify.gs');
const ADMIN = path.join(ROOT, 'automation/admin/admin.gs');

for (const f of [CFG, SIGNUP, NOTIFY, ADMIN]) {
  if (!fs.existsSync(f)) {
    console.log(`━━ phone-kr-norm — ${path.relative(ROOT, f)} 가 없습니다 · 재지 못한 것이지 결함이 아닙니다`);
    process.exit(2);
  }
}
const cfg = fs.readFileSync(CFG, 'utf8');
const m = cfg.match(/function _phoneKR\(v\)[\s\S]*?\n}\n/);
if (!m) {
  console.log('━━ phone-kr-norm — 00_platform-config 에서 _phoneKR 을 찾지 못했습니다 · 재지 못했습니다');
  process.exit(2);
}

let _phoneKR;
try { _phoneKR = new Function(`${m[0]}\nreturn _phoneKR;`)(); }
catch (e) {
  console.log('━━ phone-kr-norm — _phoneKR 을 평가하지 못했습니다: ' + e.message);
  process.exit(2);
}

const GATE = /^01[016789][0-9]{7,8}$/;          // 95_notify 의 발송 자와 같은 값
const bad = [];
const ok = (cond, label) => { if (!cond) bad.push(label); };

// ① 바꿔야 하는 것 — 같은 번호의 여러 표기가 전부 010… 하나로 모인다
for (const [inp, want] of [
  ['+82 10-7349-9770', '01073499770'],          // ★사장님 화면에 뜬 실제 모양
  ['+82-10-7349-9770', '01073499770'],
  ['+821073499770', '01073499770'],
  ['008210 7349 9770', '01073499770'],          // 00 국제접속 + 82
  ['+82 010 7349 9770', '01073499770'],         // 0 을 두 번 적은 값
  ['+82 11 234 5678', '0112345678'],            // 구 통신사 10자리는 정상
  ['010-7349-9770', '01073499770'],             // 이미 국내표기면 그대로
  ['01073499770', '01073499770'],
]) ok(_phoneKR(inp) === want, `정규화 «${inp}» → 「${_phoneKR(inp)}」 · 기대 「${want}」`);

// ② 그리고 그 결과가 발송 자를 통과해야 한다 — 바꿨는데 여전히 막히면 고친 게 아니다
for (const inp of ['+82 10-7349-9770', '008210 7349 9770', '+82 11 234 5678'])
  ok(GATE.test(_phoneKR(inp)), `발송 자 통과 «${inp}» → 「${_phoneKR(inp)}」 가 여전히 막힙니다`);

// ③ 건드리면 안 되는 것 — 모르는 모양을 «그럴싸하게» 만들면 남의 번호로 알림이 간다
for (const [inp, want] of [
  ['', ''],
  [null, ''],
  [undefined, ''],
  ['821 0734 9770', '82107349770'],             // ★시트에 실제로 앉아 있던 값 · 숫자 11자 = 한 자리 빠졌다
  ['+82 10 7349 977', '82107349977'],           // 010 + 7자리가 될 값 — 복원 금지
  ['+82 2 1234 5678', '82212345678'],           // 서울 유선 — 휴대폰이 아니다
  ['+82 31 935 7114', '823193 5711 4'.replace(/[^0-9]/g, '')],
  ['+1 415 555 1234', '14155551234'],           // 미국 번호 — 82 가 아니다
  ['822', '822'],                               // 너무 짧다
  ['82', '82'],
  ['abc', ''],
]) ok(_phoneKR(inp) === want, `보존 «${inp}» → 「${_phoneKR(inp)}」 · 기대 「${want}」`);

// ★그리고 그 «보존»된 값들은 발송 자를 통과하지 못해야 한다 — 통과하면 오배송이다
for (const inp of ['821 0734 9770', '+82 10 7349 977', '+82 2 1234 5678', '+1 415 555 1234', '822', 'abc'])
  ok(!GATE.test(_phoneKR(inp)), `★오배송 위험 «${inp}» → 「${_phoneKR(inp)}」 가 발송 자를 통과합니다`);

// ④ 멱등 — 이미 정규화된 값을 다시 넣어도 같아야 한다(저장·발송 두 곳에서 두 번 돈다)
for (const inp of ['+82 10-7349-9770', '010-7349-9770', '821 0734 9770', '+82 2 1234 5678', ''])
  ok(_phoneKR(_phoneKR(inp)) === _phoneKR(inp), `멱등 깨짐 «${inp}»`);

// ⑤ 배선 — 함수만 있고 안 부르면 있으나 마나다
const wires = [
  [SIGNUP, /_phoneKR\(body\.phone\)/, '40_signup 이 저장 전에 _phoneKR 을 부르지 않습니다'],
  [NOTIFY, /_phoneKR\(cust\.get\('연락처'\)\)/, '95_notify 가 발송 전에 _phoneKR 을 부르지 않습니다'],
  [ADMIN, /_phoneKR\(phone\)/, 'admin 의 연락처 정정이 _phoneKR 을 부르지 않습니다'],
  [ADMIN, /_phoneKR\(curP\)/, 'admin 의 wasSilent 판정이 _phoneKR 을 부르지 않습니다'],
  [ADMIN, /_phoneKR\(vals\[i\]\[cP - 1\]\)/, 'adminSilentContacts 가 _phoneKR 을 부르지 않습니다'],
];
for (const [f, re, why] of wires)
  ok(re.test(fs.readFileSync(f, 'utf8')), why);

// ⑥ 표식이 «함수 본문 안»에 있는가 — 밖에 있으면 deployCheck 가 영영 «누락»으로만 뜬다(FILE_COVER)
ok(/\[PHONE_KR_NORM\]/.test(m[0]), '★표식 [PHONE_KR_NORM] 이 _phoneKR 본문 «안»에 없습니다 — deployCheck 가 못 읽습니다');

if (bad.length) {
  console.log('━━ phone-kr-norm — 빨강 ' + bad.length + '건');
  for (const b of bad) console.log('   · ' + b);
  process.exit(1);
}
console.log('━━ phone-kr-norm OK — +82 복원 8종 · 복원 금지 11종 · 오배송 방지 6종 · 멱등 5종 · 배선 5곳');
process.exit(0);
