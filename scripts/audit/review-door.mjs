/* ★[REVIEW_DOOR_AUDIT 2026-08-18] '후기' 로 올려 주는 문이 살아 있는가 [STAGE_REVIEW_DOOR]

   ── 왜 따로 두나
   `stage-reach` 가 이 결함을 찾았지만 한 판에 10분 가까이 걸려 자주 못 돌린다.
   그래서 «그 문 하나»만 초 단위로 확인하는 검사를 따로 둔다 — 되돌아가면 여기서 먼저 붉어진다.

   ── 무엇이 참이어야 하나
   ①결과물전달에서 후기 마감(고객 제출·관리자 넘기기)이면 '후기'로 올라간다 — 두 상품 모두
   ②그보다 앞(예식완료 등)에서 제출해도 **단계는 그대로** — RESULT_STAGES 가 예식완료까지 넓어서,
     조건 없이 올리면 결과물을 못 받은 고객이 결과물전달을 건너뛰고 끝으로 튄다
   ③두 번 눌러도 안전(멱등) ④예외 단계(취소 등)는 애초에 설문이 거부된다

   사용: node scripts/audit/review-door.mjs
*/
import { openWorld } from './_gasworld.mjs';

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const CODE = 'ME-TEST';
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 110)}`); if (!c) fail++; };

let C = null;
function seed(stage, prod) {
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: prod || '시그니처', 현재단계: stage, 계약상태: '서명완료', 계약총액: 2500000, 예식일: '2026-10-28',
    입금상태: '확인', 결과물상태: stage === '결과물전달' ? '전달완료' : '컨펌완료',
    원본링크: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 설문상태: '', 동의기록: '{}', 처리이력: '' };
}
function act(fn) {
  const w = world(Object.assign({}, C), { 개인코드: CODE, 상태: '확정', 토큰: 'tk', 선택날짜: '2026-09-01', 선택시간: '14:50' });
  G.setCustomerStage = REAL;
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let r, e = '';
  try { r = fn(G); } catch (x) { e = String((x && x.message) || x); }
  C = Object.assign({}, w.C);
  return { r, e };
}
const SURVEY = { token: 'tk', answers: { overall: 'very', recommend: 'definitely', gap: 'none', source: 'insta', reason: 'mood' }, review: '좋았어요', reviewPublic: 'Y' };

for (const prod of ['시그니처', '웨딩스냅']) {
  console.log(`\n═══ ${prod} ═══`);
  seed('결과물전달', prod);
  let r = act((g) => g.handleSubmitSurvey(SURVEY));
  ok(!!(r.r && r.r.ok), '고객 후기 제출이 받아진다', r.e || JSON.stringify(r.r).slice(0, 80));
  ok(C.현재단계 === '후기', '★결과물전달 → 후기 (고객 제출이 문이다)', C.현재단계);
  ok(C.설문상태 === '완료', '설문상태=완료', C.설문상태);

  seed('결과물전달', prod);
  r = act((g) => g.adminSkipSurvey(CODE));
  ok(!!(r.r && r.r.ok) && C.현재단계 === '후기' && C.설문상태 === '건너뜀',
    '★관리자 「후기 넘기기」도 같은 문으로 올린다', C.현재단계 + '/' + C.설문상태);
  r = act((g) => g.adminSkipSurvey(CODE));
  ok(!!(r.r && r.r.ok && r.r.already) && C.현재단계 === '후기', '두 번 눌러도 안전(멱등)', JSON.stringify(r.r));

  /* ★앞 단계 보호 — 여기가 무너지면 «결과물을 못 받았는데 여정이 끝난» 고객이 생긴다 */
  const before = prod === '웨딩스냅' ? '촬영완료' : '예식완료';
  seed(before, prod);
  act((g) => g.handleSubmitSurvey(SURVEY));
  ok(C.현재단계 === before, `★${before} 에서 제출해도 단계는 그대로(끝으로 튀지 않는다)`, C.현재단계);

  seed('취소', prod); C.설문상태 = '';
  act((g) => g.handleSubmitSurvey(SURVEY));
  ok(C.현재단계 === '취소' && !C.설문상태, '종료(취소) 고객은 설문 자체가 거부된다', C.현재단계 + '/' + (C.설문상태 || '(빔)'));
}

console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
