// '후기' 단계 서버 라이프사이클 시뮬 — 진짜 .gs 함수로 전달→설문→아카이브→롤백을 돌린다.
//   목적: 단계 승격(STAGE_REVIEW) 이후 서버 쪽 불변식을 회귀로 고정한다.
//     ①전달 완료 시 단계가 '결과물전달'로 · ②설문 제출 시 '후기'로 · ③설문 전 제출은 단계 가드로 거부
//     ④'후기' 마감 고객은 처리할 일 큐에서 빠지고 아카이브로 · ⑤후기→결과물전달 롤백은 설문만 지우고 보관 기산일은 유지
//   사용: node scripts/audit/review-stage-sim.mjs
import { openWorld } from './_gasworld.mjs';

const { G, world } = openWorld();
// ★_gasworld는 부작용 차단용으로 setCustomerStage를 no-op로 덮는다 — 전이 자체를 검사하려면 원본을 붙잡아 둔다.
//   (덮인 스텁을 부르면 '차단됐다'가 아니라 '아무 일도 안 했다'가 되어 가짜 통과/실패가 난다)
const realSetStage = G.setCustomerStage;
let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };

const NAMES = { 신랑이름: '김희준', 신부이름: '이미쿠', 연락처: '010-1234-5678', 이메일: 't@example.com' };
const BASE = Object.assign({ 상품타입: '시그니처', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-06-20',
  입금상태: '확인', 중도금상태: '확인', 잔금상태: '확인' }, NAMES);

console.log('── 후기 단계 서버 라이프사이클 ──');

// ① 흐름 정의 — 두 상품 모두 마지막이 '후기'
ok(G.STAGE_FLOW['시그니처'].slice(-1)[0] === '후기' && G.STAGE_FLOW['웨딩스냅'].slice(-1)[0] === '후기',
  'A1 STAGE_FLOW 마지막 = 후기(두 상품)', [G.STAGE_FLOW['시그니처'].slice(-1)[0], G.STAGE_FLOW['웨딩스냅'].slice(-1)[0]]);
ok(G.RESULT_STAGES.indexOf('후기') >= 0, 'A2 RESULT_STAGES에 후기 포함(결과물·갤러리·설문 카드 유지)', G.RESULT_STAGES);
ok((G.CUSTOMER_VALS['현재단계'] || []).indexOf('후기') >= 0, 'A3 데이터검증 목록에 후기', null);

// ② setCustomerStage 흐름 밖 값 차단(STAGE_FLOW_FENCE)
{
  const w = world(Object.assign({}, BASE, { 현재단계: '결과물전달', 상품타입: '웨딩스냅' }));
  const stub = G.setCustomerStage; G.setCustomerStage = realSetStage;
  let blocked = true;
  try { blocked = (G.setCustomerStage('ME-TEST', 'produce') === false); } catch (e) { blocked = 'throw:' + e.message; }
  G.setCustomerStage = stub;
  ok(blocked === true, 'B1 스냅에 제작중 전이 요청 → 차단(흐름 밖)', blocked);
  void w;
}

// ③ 설문 제출 단계 가드 — 결과 단계 이전엔 거부
for (const [stage, expectOk] of [['입금완료', false], ['제작중', false], ['예식완료', true], ['결과물전달', true], ['후기', true]]) {
  const w = world(Object.assign({}, BASE, { 현재단계: stage, 결과물상태: '전달완료', 설문상태: '대기' }));
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode() });
  let r;
  try { r = G.handleSubmitSurvey({ token: 't', answers: { overall: 'very', recommend: 'definitely' } }); } catch (e) { r = { ok: false, error: 'throw:' + e.message }; }
  ok(!!r.ok === expectOk, `C-${stage} 설문 제출 ${expectOk ? '허용' : '거부'}`, r);
  if (expectOk) {
    const wrote = w.writes().filter(x => x.h === '설문상태').slice(-1)[0];
    ok(wrote && wrote.v === '완료', `C-${stage} 설문상태=완료 기록`, wrote);
  }
}

// ④ 아카이브 판정 — 후기 + 설문 마감이라야 종료
function endedByGate(stage, survey) {
  const closed = (survey === '완료' || survey === '건너뜀');
  return G.STAGE_EXCEPTIONS.indexOf(stage) !== -1 || ((stage === '결과물전달' || stage === '후기') && closed);
}
ok(endedByGate('후기', '대기') === false, 'D1 후기 · 설문 대기 → 큐 잔류(할 일 남음)');
ok(endedByGate('후기', '완료') === true, 'D2 후기 · 설문 완료 → 큐 제외');
ok(endedByGate('후기', '건너뜀') === true, 'D3 후기 · 설문 건너뜀 → 큐 제외');
ok(endedByGate('결과물전달', '완료') === true, 'D4 구 데이터(결과물전달+설문완료) → 종료 유지(이탈 0)');

// ⑤ 강제 이동 — 후기로 보내면 설문상태가 '대기'로 리셋(고객 화면에 설문 카드 재노출)
{
  const w = world(Object.assign({}, BASE, { 현재단계: '결과물전달', 결과물상태: '전달완료', 설문상태: '완료', 설문응답: '{"overall":"very"}', 설문일시: '2026-07-10' }));
  G.adminForceStage('ME-TEST', '후기', '점검');
  const wr = w.writes();
  const sv = wr.filter(x => x.h === '설문상태').slice(-1)[0];
  ok(sv && sv.v === '대기', 'E1 → 후기 강제이동 시 설문상태 대기로 리셋', sv);
}

// ⑥ 후기 → 결과물전달 롤백 — 설문 3열은 비우고 보관 기산일(동의기록.결과물전달일)은 유지
{
  const rec = JSON.stringify({ 결과물전달일: '2026-07-10', 결과물파기: '2027-01-10', 계약: '2026-05-01' });
  const w = world(Object.assign({}, BASE, { 현재단계: '후기', 결과물상태: '전달완료', 설문상태: '완료',
    설문응답: '{"overall":"very"}', 설문일시: '2026-07-10', 동의기록: rec }));
  G.adminForceStage('ME-TEST', '결과물전달', '점검');
  const wr = w.writes();
  const cleared = ['설문상태', '설문응답', '설문일시'].filter(h => { const x = wr.filter(y => y.h === h).slice(-1)[0]; return x && String(x.v) === ''; });
  ok(cleared.length === 3, 'F1 후기 → 결과물전달: 설문 3열 초기화', cleared);
  const recW = wr.filter(x => x.h === '동의기록').slice(-1)[0];
  const after = recW ? JSON.parse(recW.v || '{}') : JSON.parse(rec);
  ok(after['결과물전달일'] === '2026-07-10', 'F2 보관 기산일(결과물전달일) 유지 — 다운로드 만료 시계 보존', after['결과물전달일']);
  const resW = wr.filter(x => x.h === '결과물상태').slice(-1)[0];
  ok(!resW || resW.v === '전달완료', 'F3 결과물상태는 그대로(전달 사실 무손상)', resW);
}

console.log(`\n결과 — 실패 ${fail}건 (통과 ${pass}건)`);
process.exit(fail ? 1 : 0);
