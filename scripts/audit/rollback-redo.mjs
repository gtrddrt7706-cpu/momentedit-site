/* ★[ROLLBACK_REDO 2026-08-17 사용자 지시 "강제로 되돌림을 설정하면 … 원클릭으로 … 모든셋팅 · 구현후 테스트 반복진행"]

   되돌림 → 정리 → 전진 → 또 되돌림 — 그 **사이클 전체**를 진짜 .gs 로 반복해서 돈다.

   ── 왜 사이클로 도나 (한 판이 아니라)
   이번 사고들은 전부 «한 번은 되는데 되돌린 뒤 두 번째가 안 되는» 모양이었다
   ([PAID_STAGE_RESYNC]·차단 C 의 «이미 진행된» 거짓말·숨은 2단 춤).
   한 판 검사는 첫 바퀴만 본다. 세 바퀴를 돌아야 «정리가 상태를 깨끗이 복원하는지»가 검증된다.

   ── 사이클 (매 바퀴 같아야 한다)
   ①갇힘(계약완료+입금확인) → ②-A 원클릭 «단계 맞추기»(adminConfirmPayment 재확인 = resync) → 입금완료
   → ③고객 제작 저장 → 제작중 → ④강제변경으로 다시 계약완료(수납 보존) → ①로.
   별도로 ②-B 원클릭 «확인 취소»(UNDO_BEHIND) → 재입금신고 → 재확인 → 입금완료 도 돈다.

   ── 지켜야 하는 반대편 (완화가 정상 보호를 깨지 않았는가)
   behind(단계<입금완료)만 면제다 — 전진 고객(제작중)의 계약금 취소는 여전히 C 로 막고,
   정상 입금완료의 24시간 창(E)도 그대로, 종료 고객(D)도 그대로.

   사용: node scripts/audit/rollback-redo.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const OLD = kstAgo(24 * 23);          // 23일 전 — 사용자 실사례(7/25 확인)와 같은 «오래된 확정»
const CODE = 'ME-TEST';
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 110)}`); if (!c) fail++; };

let C = null, B = null;
function seedStuck() {
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: '시그니처', 현재단계: '계약완료', 계약상태: '서명완료', 계약서명일시: OLD, 계약서발송일시: OLD,
    계약총액: 2500000, 예식일: '2026-10-28', 입금상태: '확인', 입금자명: '정희준',
    중도금상태: '확인', 중도금확인일시: OLD,
    동의기록: JSON.stringify({ 계약: { at: OLD }, 영수증기준일: { 예약금: OLD } }), 처리이력: '' };
  B = { 개인코드: CODE, 상태: '확정', 선택날짜: '2026-09-01', 선택시간: '14:50', 토큰: 'tk' };
}
function act(fn) {
  const w = world(Object.assign({}, C), Object.assign({}, B));
  G.setCustomerStage = REAL;
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let r, err = '';
  try { r = fn(G); } catch (e) { err = String((e && e.message) || e); }
  C = Object.assign({}, w.C); if (w.B) B = Object.assign({}, w.B);
  return { r, err, w };
}
const homeHas = () => {
  const { r } = act((g) => g.adminHome());
  /* adminHome 의 큐는 urgent/normal 두 통으로 나뉜다(stranded-queue 와 같은 독법) */
  const qq = (r && r.queue) || {};
  const q = (qq.urgent || []).concat(qq.normal || []);
  return q.filter((x) => x.kind === '단계정리');
};

/* ── 사이클 3바퀴 — 경로 A(단계 맞추기) ── */
for (let cyc = 1; cyc <= 3; cyc++) {
  console.log(`\n[사이클 ${cyc} — 원클릭 «단계 맞추기» 경로]`);
  if (cyc === 1) seedStuck();
  ok(C.현재단계 === '계약완료' && C.입금상태 === '확인', `갇힌 상태에서 시작(계약완료·입금 확인)`, C.현재단계 + '/' + C.입금상태);
  const q1 = homeHas();
  ok(q1.length === 1, `처리할 일에 「단계정리」 1건`, JSON.stringify(q1.map((x) => x.sub)));
  ok(q1.length && /계약금/.test(q1[0].sub), `문구가 무엇이 확인됐는지 이름을 부른다`, q1.length && q1[0].sub);
  const a = act((g) => g.adminConfirmPayment(CODE));
  ok(!!(a.r && a.r.ok && a.r.stageFixed), `진행(재확인) → stageFixed 로 단계만 맞춤`, JSON.stringify(a.r));
  ok(C.현재단계 === '입금완료' && C.입금상태 === '확인' && C.계약상태 === '서명완료' && String(C.계약총액) === '2500000',
    `입금완료 · 수납/계약/총액 무손상`, C.현재단계 + '/' + C.입금상태 + '/' + C.계약총액);
  ok(homeHas().length === 0, `정리 후 「단계정리」가 큐에서 사라진다`);
  const p = act((g) => g.handleSaveProductionTrack({ token: 'tk', track: 'ritual', ritualDraft: { S: { course: 'A' } }, done: false }));
  ok(!!(p.r && p.r.ok) && C.현재단계 === '제작중', `고객 제작 저장 → 제작중(여정 전진 재개)`, p.err || JSON.stringify(p.r).slice(0, 60));
  /* 전진 상태의 보호가 살아 있는가 — 제작중의 계약금 취소는 여전히 C 로 막혀야 한다 */
  const g1 = act((g) => g.adminUndoConfirmPayment(CODE, '계약금', '점검'));
  ok(!!(g1.r && g1.r.block === 'C'), `전진(제작중) 고객의 계약금 취소는 여전히 차단 C`, JSON.stringify(g1.r).slice(0, 80));
  const f = act((g) => g.adminForceStage(CODE, '계약완료', '사이클 재현'));
  ok(!!(f.r && f.r.ok) && C.현재단계 === '계약완료' && C.입금상태 === '확인',
    `강제변경 → 계약완료 · 수납 보존(다음 바퀴 시작점)`, C.현재단계 + '/' + C.입금상태);
}

/* ── 경로 B — 원클릭 «확인 취소»(UNDO_BEHIND) → 재입금 흐름 ── */
console.log('\n[경로 B — 되돌려진 상태에서 확인 취소 → 재입금 → 재확인]');
seedStuck();
const pv = act((g) => g.adminUndoConfirmPreview(CODE, '계약금'));
ok(!!(pv.r && pv.r.ok && !pv.r.block), `미리보기가 behind 를 막지 않는다(구: «이미 계약완료로 진행된» 거짓 차단)`, JSON.stringify(pv.r).slice(0, 90));
ok(!!(pv.r && pv.r.ok && !pv.r.stage), `단계 계획 없음 — 계약완료를 유지(앞으로 «올리지» 않는다)`, JSON.stringify(pv.r && pv.r.stage));
const u1 = act((g) => g.adminUndoConfirmPayment(CODE, '계약금', '되돌림 정리 · 재입금 흐름'));
ok(!!(u1.r && u1.r.ok), `확인 취소 실행됨(23일 지난 확정도 behind 라 허용 · E 면제)`, JSON.stringify(u1.r).slice(0, 90));
ok(C.입금상태 === '' && C.현재단계 === '계약완료', `입금상태 비워짐 · 단계 그대로 계약완료`, C.입금상태 + '/' + C.현재단계);
/* 계약금이 비워졌지만 중도금 '확인'이 남았다 — 넓힌 큐가 이 잔재를 잡는가 [STALE_ROLLBACK_WIDE] */
const q2 = homeHas();
ok(q2.length === 1 && /중도금/.test(q2[0].sub) && !/계약금/.test(q2[0].sub),
  `남은 중도금 확인을 큐가 이름 불러 잡는다(구 조건은 놓쳤다)`, q2.length && q2[0].sub);
const u2 = act((g) => g.adminUndoConfirmPayment(CODE, '중도금', '되돌림 정리'));
ok(!!(u2.r && u2.r.ok) && C.중도금상태 === '', `중도금도 취소(behind · 23일 경과여도) → 잔재 0`, C.중도금상태);
ok(homeHas().length === 0, `전부 정리되면 큐도 빈다`);
const s1 = act((g) => g.handlePaymentSignal({ token: 'tk', payerName: '정희준' }));
ok(!!(s1.r && s1.r.ok && !s1.r.already) && C.입금상태 === '완료신호', `고객 재입금 신고가 다시 열렸다(already 아님)`, C.입금상태);
const c1 = act((g) => g.adminConfirmPayment(CODE));
ok(!!(c1.r && c1.r.ok) && C.현재단계 === '입금완료' && C.입금상태 === '확인', `재확인 → 입금완료 · 여정 정상 재개`, C.현재단계);

/* ── 반대편 보호 4종 — 완화가 새 구멍이 아님을 못 박는다 ── */
console.log('\n[반대편 — behind 가 아닌 곳의 보호는 그대로인가]');
seedStuck(); C.현재단계 = '입금완료'; C.확인일시 = OLD;
const e1 = act((g) => g.adminUndoConfirmPayment(CODE, '계약금', '점검'));
ok(!!(e1.r && e1.r.block === 'E'), `정상 입금완료 + 23일 경과 → 24시간 창(E) 그대로 차단`, JSON.stringify(e1.r).slice(0, 80));
seedStuck(); C.현재단계 = '입금완료';
C.동의기록 = JSON.stringify({ 계약: { at: OLD }, 영수증기준일: { 예약금: kstAgo(2) } });
const e2 = act((g) => g.adminUndoConfirmPayment(CODE, '계약금', '점검'));
ok(!!(e2.r && e2.r.ok) && C.현재단계 === '계약완료', `정상 입금완료 + 2시간 안 → 종전대로 취소되고 단계도 계약완료로`, C.현재단계);
seedStuck(); C.현재단계 = '취소';
const e3 = act((g) => g.adminUndoConfirmPayment(CODE, '계약금', '점검'));
ok(!!(e3.r && e3.r.block === 'D'), `종료(취소) 고객 → 차단 D 그대로`, JSON.stringify(e3.r).slice(0, 70));
seedStuck();
C.동의기록 = JSON.stringify({ 계약: { at: OLD }, 영수증기준일: { 예약금: OLD }, 영수증발행: { 계약금: { 번호: '1' } } });
const e4 = act((g) => g.adminUndoConfirmPayment(CODE, '계약금', '점검'));
ok(!!(e4.r && e4.r.block === 'B'), `영수증 발행분 → behind 여도 차단 B 그대로(발행 취소가 먼저)`, JSON.stringify(e4.r).slice(0, 80));

console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
