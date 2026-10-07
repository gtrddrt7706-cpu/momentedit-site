// ★[ERR_CODE_PAY 2026-10-07 사장님 «오류 코드로 관리자가 어떤 문제인지 알 수 있게 · 전부 개선»] 카드결제(지금 꺼져 있음 · 켜기 전에 맞춰 둔다)의 실패 길을 «실제 .gs 함수»로 태운다.
//   ① 토스가 거절하면 P4 · 토스 코드를 화면에 넘긴다(종전엔 버렸다)
//   ② 결제 정보가 빈 복귀(주소에 값 없음)도 결제로그에 남는다 · P0
//   ③ 승인 뒤 기록 함수가 «던지면» → B-1 길(관리자 즉시 알림 · 결제로그 «성공 · 기록경고» · 화면엔 ok · recorded:false)
//      종전엔 예외가 doPost 로 새 «요청을 처리하지 못했어요»만 남고 돈 받은 흔적은 Logger 뿐이었다
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import { openWorld } from './_gasworld.mjs';
let rc = 0; const say = (m, c, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 240)}`); if (!c) rc = 1; };   // (문구, 조건, 자세히) — 순서를 바꾸면 늘 통과하는 죽은 검사가 된다(2026-10-07 실제로 그랬다)
let G, world;
try { ({ G, world } = openWorld()); } catch (e) { console.log('━━ card-err — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
for (const fn of ['handleCardConfirm', '_depositCardConfirm']) if (typeof G[fn] !== 'function') { console.log(`━━ card-err — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
const props = G.PropertiesService.getScriptProperties();
props.setProperty('PAY_CARD_ENABLED', 'true'); props.setProperty('TOSS_SECRET_KEY', 'test_sk_x'); props.setProperty('TOSS_CLIENT_KEY', 'test_ck_x');
let logs = [], alerts = [];
function mk() {
  world({ 개인코드: 'ME-TEST', 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '김', 신부이름: '이', 동의기록: '', 중도금상태: '', 잔금상태: '' }, null);
  logs = []; alerts = [];
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode('ME-TEST') });
  G._payExpectedAmount = () => 500000; G._payPreValidate = () => '';
  G._payLog = (r) => logs.push(r);
  G.aiAlertAdmin = (t) => alerts.push(String(t)); G._nfAdminLineEmail = (t) => alerts.push(String(t));
}
const call = (body) => { try { return G.handleCardConfirm(body); } catch (e) { return { ok: false, error: 'THROW ' + e.message }; } };
const B = { token: 't', milestone: '중도금', paymentKey: 'pk_1', orderId: 'oid_1', amount: 500000 };

mk(); G._tossConfirm = () => ({ ok: false, error: '카드사에서 승인하지 않았어요', code: 'REJECT_CARD_COMPANY' });
let r = call(B);
say('① 토스 거절 → ecode P4 · tossCode 그대로 · 한국어 한 줄 «카드사에서 승인하지 않았어요 · 다른 카드로 해 주세요 (코드 P4 · REJECT_CARD_COMPANY)» · 영문 · 토스 원문 없음 · 결제로그 «토스실패» [PAY_UNKNOWN]', r && r.ok === false && r.ecode === 'P4' && r.tossCode === 'REJECT_CARD_COMPANY' && r.error === '카드사에서 승인하지 않았어요 · 다른 카드로 해 주세요 (코드 P4 · REJECT_CARD_COMPANY)' && logs.some((x) => x.result === '토스실패'), JSON.stringify({ r, logs }));

mk(); r = call(Object.assign({}, B, { paymentKey: '' }));
say('② 결제 정보 없음 → P0 · 결제로그에 «결제 정보 없음»(종전엔 흔적 없음)', r && r.ok === false && r.ecode === 'P0' && logs.some((x) => /결제 정보 없음/.test(x.memo || '')), JSON.stringify({ r, logs }));

mk(); G._tossConfirm = () => ({ ok: true, data: {} }); G.adminConfirmMid = () => { throw new Error('시트 시간 초과'); };
r = call(B);
say('③ 승인 뒤 기록 함수가 던지면 → ok · recorded:false (던지지 않는다)', r && r.ok === true && r.recorded === false, JSON.stringify(r));
say('③ 관리자 즉시 알림 «기록실패 · 수동확인» · 까닭 «기록 함수 예외»', alerts.some((t) => /기록실패/.test(t) && /기록 함수 예외/.test(t)), alerts.join(' | '));
say('③ 결제로그 «성공 · 기록경고»(돈 받은 흔적이 남는다)', logs.some((x) => x.result === '성공' && /기록경고/.test(x.memo || '')), JSON.stringify(logs));

mk(); G._tossConfirm = () => ({ ok: true, data: {} }); G.adminConfirmMid = () => ({ ok: true });
r = call(B);
say('④ 정상 승인 · 기록 성공은 종전 그대로(ok · recorded:true)', r && r.ok === true && r.recorded === true, JSON.stringify(r));

/* ⑤ [PAY_UNKNOWN 2026-10-08] 토스 승인이 «연결 예외 · 이미 처리됨»이면 돈이 나갔을 수 있다 — 조회로 확인해 됐으면 성공 · 모르면 P5(다시 결제하지 마세요) + 관리자 메일 */
mk(); G._tossConfirm = () => ({ ok: false, error: 'Exception: Timeout: https://api.tosspayments.com/v1/payments/confirm', code: 'FETCH_EXCEPTION' });
G._tossLookup = () => ({ ok: true, data: { status: 'DONE', orderId: 'oid_1', totalAmount: 500000 } }); G.adminConfirmMid = () => ({ ok: true });
r = call(B);
say('⑤ 연결 예외 → 조회가 «완료 · 같은 주문 · 같은 금액»이면 성공으로 기록(ok · recorded) · 결제로그 «토스조회성공»', r && r.ok === true && r.recorded === true && logs.some((x) => x.result === '토스조회성공'), JSON.stringify({ r, logs }));
mk(); G._tossConfirm = () => ({ ok: false, error: 'Exception: Timeout', code: 'FETCH_EXCEPTION' }); G._tossLookup = () => ({ ok: false, code: 'FETCH_EXCEPTION' });
r = call(B);
say('⑤ 연결 예외 + 조회도 실패 → P5 · unknown · «다시 결제하지 마시고» · 영문 · 토스 주소 없음 · 관리자 «결과 모름» 메일 · 결제로그 «토스결과모름»', r && r.ok === false && r.ecode === 'P5' && r.unknown === true && /다시 결제하지 마시고/.test(r.error || '') && !/[A-Za-z]{4,}|https?:/.test(r.error || '') && alerts.some((t) => /결과 모름/.test(t)) && logs.some((x) => x.result === '토스결과모름'), JSON.stringify({ r, alerts, logs }));
mk(); G._tossConfirm = () => ({ ok: false, error: '이미 처리된 결제 입니다.', code: 'ALREADY_PROCESSED_PAYMENT' }); G._tossLookup = () => ({ ok: true, data: { status: 'DONE', orderId: 'oid_1', totalAmount: 1000 } });
r = call(B);
say('⑤ 이미 처리됨 + 조회 금액이 다르면 성공으로 넘기지 않는다 → P5', r && r.ok === false && r.ecode === 'P5', JSON.stringify(r));
mk(); G._tossConfirm = () => ({ ok: false, error: 'HTTP 500', code: '' });
r = call(B);
say('⑤ 토스 5xx(코드 없음) → P4 «결제 승인이 되지 않았어요 · …» · 조회는 안 한다(결과 모름이 아님)', r && r.ok === false && r.ecode === 'P4' && /^결제 승인이 되지 않았어요/.test(r.error || '') && !/HTTP/.test(r.error || ''), JSON.stringify(r));

console.log(rc ? '━━ card-err — ❌ 어긋남' : '━━ card-err — ✅ 전부 통과');
process.exit(rc);
