/* ★[ROLLBACK_ANYWHERE 2026-08-17 사용자 질문 "강제되돌리기 돌려도 관리자페이지에서 처리할게 있으면 원클릭으로 가능한거야?"]

   답을 코드가 아니라 **실행으로** 낸다 — 되돌릴 수 있는 «모든» 목표 단계에서,
   두 상품 각각, 처리할 일에 뜨는가 · 그 한 번으로 잔재 없이 끝나는가.

   ── 이 검사를 만든 이유 (첫 실측이 아니오였다)
   계약완료로 되돌린 경우만 「단계 맞추기」가 됐다. 더 앞(상담완료·시착·상담확정·신청접수)으로
   되돌리면 _clearForwardData 가 계약상태를 비워, 서버가 «계약 서명 완료 후 입금 확인이 가능합니다»로
   거부했다 — 큐엔 뜨는데 원클릭은 실패하는 «보이는데 안 되는 버튼»이었다.
   또 계약금만 취소하면 중도금·잔금 '확인'이 남아 큐가 다시 떴다 — 그건 원클릭이 아니라 3클릭이다.

   ── 그래서 두 갈래를 «상태로» 정하고, 취소는 '전체' 한 번으로 끝낸다
   ·계약 살아 있음 → 단계 맞추기(수납 보존 · 여정 재개)
   ·계약 지워짐   → 수납 전부 취소(계약서 재발송부터 다시)
   두 경우 모두 **한 번 누르면 큐가 빈다**는 것이 이 검사의 불변식이다.

   사용: node scripts/audit/rollback-anywhere.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const OLD = kstAgo(24 * 23);
const CODE = 'ME-TEST';
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 110)}`); if (!c) fail++; };

let C = null, B = null;
function seedPaid(prod) {
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: prod, 현재단계: (prod === '웨딩스냅' ? '촬영완료' : '제작중'),
    계약상태: '서명완료', 계약서명일시: OLD, 계약서발송일시: OLD,
    계약총액: (prod === '웨딩스냅' ? 1200000 : 2500000), 예식일: '2026-10-28',
    입금상태: '확인', 입금자명: '정희준',
    중도금상태: (prod === '웨딩스냅' ? '' : '확인'), 중도금확인일시: OLD, 잔금상태: '확인', 잔금확인일시: OLD,
    시착동의상태: '동의완료',
    동의기록: JSON.stringify({ 계약: { at: OLD }, 시착: { at: OLD, 벌수: 2 }, 영수증기준일: { 예약금: OLD } }), 처리이력: '' };
  B = { 개인코드: CODE, 상태: '확정', 선택날짜: '2026-09-01', 선택시간: '14:50', 토큰: 'tk' };
}
function act(fn) {
  const w = world(Object.assign({}, C), Object.assign({}, B));
  G.setCustomerStage = REAL;
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let r, e = '';
  try { r = fn(G); } catch (x) { e = String((x && x.message) || x); }
  C = Object.assign({}, w.C); if (w.B) B = Object.assign({}, w.B);
  return { r, e };
}
const queue = () => {
  const { r } = act((g) => g.adminHome());
  const q = (r && r.queue) || {};
  return ((q.urgent || []).concat(q.normal || [])).filter((x) => x.kind === '단계정리');
};
/* 화면(doFixStage)이 고르는 갈래를 그대로 흉내낸다 — 화면 조건이 서버와 어긋나면 여기서 갈린다 */
const branchOf = () => (C.입금상태 === '확인' && C.계약상태 === '서명완료') ? 'fix' : 'undoAll';

for (const prod of ['시그니처', '웨딩스냅']) {
  const flow = G.STAGE_FLOW[prod];
  const targets = flow.slice(0, flow.indexOf('입금완료'));   // 되돌릴 수 있는 모든 앞 단계
  console.log(`\n[${prod} — 되돌림 목표 ${targets.length}곳 전수]`);
  for (const t of targets) {
    seedPaid(prod);
    const f = act((g) => g.adminForceStage(CODE, t, '점검'));
    if (!(f.r && f.r.ok)) { ok(false, `${t} · 강제변경 자체가 실패`, JSON.stringify(f.r)); continue; }
    ok(queue().length === 1, `${t} · 처리할 일에 「단계정리」가 뜬다`, JSON.stringify(queue().map((x) => x.sub)));
    const br = branchOf();
    const one = (br === 'fix') ? act((g) => g.adminConfirmPayment(CODE))
                               : act((g) => g.adminUndoConfirmPayment(CODE, '전체', '되돌림 정리'));
    ok(!!(one.r && one.r.ok), `${t} · 원클릭(${br === 'fix' ? '단계 맞추기' : '수납 전부 취소'}) 성공`,
      String((one.r && one.r.error) || one.e));
    ok(queue().length === 0, `${t} · ★한 번으로 큐가 빈다(잔재 0)`, JSON.stringify(queue().map((x) => x.sub)));
    if (br === 'fix') {
      ok(C.현재단계 === '입금완료' && C.입금상태 === '확인' && C.계약상태 === '서명완료',
        `${t} · 수납·계약 보존한 채 입금완료로`, C.현재단계 + '/' + C.입금상태 + '/' + C.계약상태);
    } else {
      const rest = [C.입금상태 === '확인' ? '계약금' : null, C.중도금상태 === '확인' ? '중도금' : null,
        C.잔금상태 === '확인' ? '잔금' : null].filter(Boolean);
      ok(rest.length === 0, `${t} · 확인 잔재가 하나도 안 남는다`, rest.join('·'));
      ok(C.현재단계 === t, `${t} · 단계는 되돌린 자리 그대로(임의로 올리지 않는다)`, C.현재단계);
    }
  }
}

/* 반대편 — '전체' 취소가 정상 고객의 보호까지 뚫지 않는가 */
console.log('\n[반대편 — 정상 고객에게 «전체»를 쏴도 보호가 살아 있는가]');
seedPaid('시그니처'); C.현재단계 = '입금완료';
const n1 = act((g) => g.adminUndoConfirmPayment(CODE, '전체', '점검'));
ok(!!(n1.r && n1.r.block === 'E'), `정상 입금완료 + 23일 경과 → 24시간 창(E)이 «전체»도 막는다`, JSON.stringify(n1.r).slice(0, 80));
seedPaid('시그니처'); C.현재단계 = '취소';
const n2 = act((g) => g.adminUndoConfirmPayment(CODE, '전체', '점검'));
ok(!!(n2.r && n2.r.block === 'D'), `종료(취소) 고객 → 차단 D 가 «전체»도 막는다`, JSON.stringify(n2.r).slice(0, 70));
seedPaid('웨딩스냅');
act((g) => g.adminForceStage(CODE, '계약완료', '점검'));
const n3 = act((g) => g.adminUndoConfirmPayment(CODE, '전체', '점검'));
ok(!!(n3.r && n3.r.ok), `웨딩스냅에 «전체» → 중도금 없음이 오류가 아니라 건너뛰기`, String((n3.r && n3.r.error) || ''));

/* ── 막는 것이 있을 때 «그 다음 손잡이»가 값으로 오는가 [BLOCK_CHAIN] ──
   화면이 한글 문구를 파싱해 알아내면 문구를 다듬는 순간 조용히 깨진다. blockKey 로 온다. */
console.log('\n[막힘 → 다음 손잡이 — 영수증 발행분]');
seedPaid('시그니처');
act((g) => g.adminForceStage(CODE, '계약완료', '점검'));
C.동의기록 = JSON.stringify({ 계약: { at: OLD }, 영수증기준일: { 예약금: OLD }, 영수증발행: { 계약금: { 번호: '1', 금액: 150000 } } });
const bk = act((g) => g.adminUndoConfirmPreview(CODE, '전체'));
ok(!!(bk.r && bk.r.block === 'B'), `영수증 발행분은 여전히 막는다(세무 기록이 먼저)`, JSON.stringify(bk.r).slice(0, 70));
ok(!!(bk.r && bk.r.blockKey === '계약금'), `★무엇이 막는지 blockKey 로 온다(화면이 문구를 파싱하지 않게)`, JSON.stringify(bk.r && bk.r.blockKey));
const rc = act((g) => g.adminUndoCashReceipt(CODE, bk.r && bk.r.blockKey));
ok(!!(rc.r && rc.r.ok), `그 키로 영수증 발행 취소가 바로 된다`, JSON.stringify(rc.r).slice(0, 60));
const after = act((g) => g.adminUndoConfirmPayment(CODE, '전체', '정리'));
ok(!!(after.r && after.r.ok), `이어서 입금 확인 취소가 통과한다(막힘 → 해소 → 진행 한 흐름)`, String((after.r && after.r.error) || ''));
ok(queue().length === 0, `★영수증이 있던 건도 결국 큐가 빈다`, JSON.stringify(queue().map((x) => x.sub)));

console.log(`\n최종 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
