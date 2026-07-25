// [ADM_DELIVDATE 회귀] 강제 롤백이 '보관 기산일'(동의기록.결과물전달일)을 지키는지 —
//   grep 마커가 아니라 실제 admin.gs 함수를 돌려 결과 값으로 확인한다.
//   배경: #284가 설문 그룹의 at을 '결과물전달'→'후기'로 올릴 때 같은 그룹에 매달려 있던
//   consent 키(결과물전달일·보관만료통지·결과물파기)까지 함께 올라갔고, 그래서 후기 → 결과물전달
//   되돌리기가 '전달은 됐는데 보관 시계만 없는' 상태를 만들었다(계약 12조③ 6개월 기산일 소실).
//   ★그 상태는 UI로 복구가 안 된다 — adminMarkDelivered는 결과물상태==='전달완료'면 already로
//   조기 반환해 결과물전달일을 다시 찍지 않고, 롤백은 '전달완료'를 강등하지 않기 때문(의도된 동작).
//   #299에서 보관 시계를 독립 그룹(at:'결과물전달')으로 분리해 고쳤고, 이 스크립트가 그 동작을 붙잡는다.
//   사용: node scripts/audit/rollback-deliverydate.mjs
import { openWorld } from './_gasworld.mjs';

const { G, world } = openWorld();
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? 'OK  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const rec = (w) => { try { return JSON.parse(w.C.동의기록 || '{}'); } catch (e) { return {}; } };

// 전달까지 끝나고 후기 단계로 넘어간 시그니처 고객
const seed = () => ({
  현재단계: '후기', 상품타입: '시그니처',
  계약상태: '서명완료', 계약총액: '2620000', 입금상태: '확인', 중도금상태: '확인', 잔금상태: '확인',
  원본링크: 'https://example.com/o', 보정본폴더: 'https://example.com/r', 결과물상태: '전달완료',
  설문상태: '완료', 설문응답: '{"q1":"좋았어요"}', 설문일시: '2026-07-20 10:00',
  동의기록: JSON.stringify({ 계약: 'y', 결과물전달일: '2026-07-19 15:00', 보관만료통지: '', 결과물파기: '' }),
});

console.log('\n[1] 후기 → 결과물전달 되돌리기 (전달 사실·보관 시계는 그대로여야 한다)');
{
  const w = world(seed());
  const pv = G.adminForceStagePreview('ME-TEST', '결과물전달');
  console.log(`     미리보기 · 비워짐=[${(pv.cleared || []).join('·')}] / 동의기록 제거=[${(pv.consent || []).join('·')}]`);
  ok((pv.consent || []).indexOf('결과물전달일') === -1, '미리보기가 기산일을 제거 대상으로 잡지 않는다', (pv.consent || []).join('·'));
  const r = G.adminForceStage('ME-TEST', '결과물전달', '후기 재요청');
  ok(r.ok, '실행 성공', JSON.stringify(r).slice(0, 100));
  ok(!w.C.설문상태 && !w.C.설문응답, '설문 응답은 초기화된다(후기 단계 산출물이라 정상)');
  ok(String(w.C.결과물상태) === '전달완료', "결과물상태 '전달완료' 유지(ROLLBACK_TRACK_DEMOTE 주석대로 강등 안 함)", String(w.C.결과물상태));
  ok(rec(w).결과물전달일 === '2026-07-19 15:00', '★보관 기산일(동의기록.결과물전달일)이 그대로 남는다', `현재=${JSON.stringify(rec(w))}`);
}

console.log('\n[2] 만약 지워진다면 UI로 복구 불가 — 이 회귀가 왜 비싼지의 근거');
{
  const w = world(Object.assign(seed(), { 현재단계: '결과물전달', 설문상태: '', 설문응답: '', 설문일시: '',
    동의기록: JSON.stringify({ 계약: 'y' }) }));   // 기산일이 이미 지워진 상태를 그대로 재현
  const r = G.adminMarkDelivered('ME-TEST');
  ok(r && r.already === true, "재실행이 already로 조기 반환한다(= 기산일을 다시 못 찍는다)", JSON.stringify(r));
  ok(!rec(w).결과물전달일, '따라서 기산일은 비어 있는 채로 남는다(일방향 손실 확인)');
}

console.log('\n[3] 예식완료로 더 내리는 경우 — 전달 자체를 되돌리므로 시계는 지워지는 게 맞다');
{
  const w = world(seed());
  const pv = G.adminForceStagePreview('ME-TEST', '예식완료');
  console.log(`     미리보기 · 비워짐=[${(pv.cleared || []).join('·')}] / 동의기록 제거=[${(pv.consent || []).join('·')}]`);
  G.adminForceStage('ME-TEST', '예식완료', '전달 취소');
  ok(!rec(w).결과물전달일, '기산일 제거(전달 사실을 되돌리는 롤백이므로 정상 · 재전달 사이클 리셋)');
  // 작업물(원본·보정본)은 '예식완료' 단계 산출물이라 ti === gi로 보존되는 게 정상 — 지워지면 오히려 사고.
  ok(!!w.C.원본링크 && !!w.C.보정본폴더, '원본·보정본 링크는 보존(예식완료 단계 산출물)', `원본=${w.C.원본링크} 보정=${w.C.보정본폴더}`);
  ok(String(w.C.결과물상태) === '컨펌완료', "결과물상태만 '컨펌완료'로 강등(ROLLBACK_TRACK_DEMOTE)", String(w.C.결과물상태));
}

console.log('\n[4] 미리보기 == 실제 (목표 단계 전수) — 미리보기가 거짓말하지 않는지');
for (const target of ['결과물전달', '예식완료', '제작중', '계약완료', '신청접수']) {
  const wp = world(seed());
  const pv = G.adminForceStagePreview('ME-TEST', target);
  const wr = world(seed());
  const before = JSON.parse(wr.C.동의기록);
  G.adminForceStage('ME-TEST', target, '전수 점검');
  const after = rec(wr);
  const actualConsent = Object.keys(before).filter((k) => after[k] === undefined);
  const pvConsent = (pv.consent || []).slice().sort().join('·');
  ok(pvConsent === actualConsent.slice().sort().join('·'),
    `→ ${target} · 동의기록 제거 목록 일치 [${pvConsent}]`, `실제=[${actualConsent.join('·')}]`);
  ok(JSON.parse(wp.C.동의기록 || '{}').결과물전달일 === '2026-07-19 15:00',
    `→ ${target} · 미리보기는 아무것도 쓰지 않는다(dry-run)`);
}

console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(fail ? 1 : 0);
