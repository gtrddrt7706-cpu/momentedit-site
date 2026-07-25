// 강제 단계 변경 noop·로그 회귀 점검 — 실제 admin.gs 함수를 샌드박스에서 호출한다.
//   [ADM_AC3NOOP] 값이 안 바뀌는 재적용이 진짜 no-op인지 · 처리이력에 빈 컬럼이 나열되지 않는지 · 확인된 입금이 보존되는지.
//   실행: node scripts/audit/admin-forcestage-noop.mjs
import { openWorld } from './_gasworld.mjs';
const { G, world } = openWorld();
let f=0; const ok=(c,m)=>{ console.log((c?'  OK   ':'  FAIL ')+m); if(!c)f++; };

// 1) 이미 '계약완료'인 (이후 데이터 없는) 고객을 다시 '계약완료'로 → 진짜 noop
let w = world({ 현재단계:'계약완료', 계약상태:'서명완료' }, null);
let r = G.adminForceStage('ME-TEST','계약완료','재적용 테스트');
ok(r.ok && r.noop === true, 'noop 반환 · ' + JSON.stringify(r));
ok(w.writes().length === 0, '시트 쓰기 0건 (실제 '+w.writes().length+')');
w = world({ 현재단계:'계약완료', 계약상태:'서명완료' }, null);
ok(G.adminForceStagePreview('ME-TEST','계약완료').noop === true, '미리보기도 noop === true');

// 2) 신청접수 재적용 — 상담예약 초기화가 있으니 noop은 아니지만, 빈 컬럼을 다시 쓰지는 않아야
w = world({ 현재단계:'신청접수' }, null);
r = G.adminForceStage('ME-TEST','신청접수','재적용');
const heads = w.writes().map(e=>e.h);
ok(heads.every(h=>['현재단계','최종수정','처리이력'].indexOf(h)!==-1), '★빈 컬럼 재기록 없음 — 쓰기 '+w.writes().length+'건 전부 메타(' + heads.join('·') + ')');
ok(!r.cleared.length, '처리이력에 나열된 초기화 컬럼 0건');

// 3) 진짜 변경 건은 그대로 동작
w = world({ 현재단계:'제작중', 계약상태:'서명완료', 계약총액:'2500000', 동의기록:JSON.stringify({계약:'2026-07-02', 시착:'2026-07-01'}) }, null);
ok(G.adminForceStagePreview('ME-TEST','신청접수').noop === false, '진짜 변경 건은 미리보기 noop 아님');
w = world({ 현재단계:'제작중', 계약상태:'서명완료', 계약총액:'2500000', 동의기록:JSON.stringify({계약:'2026-07-02', 시착:'2026-07-01'}) }, null);
r = G.adminForceStage('ME-TEST','신청접수','정리');
ok(r.ok && !r.noop, '실행도 noop 아님');
ok(r.cleared.join('·') === '계약상태·계약총액', '★처리이력=실제 비워진 것만: '+r.cleared.join('·'));
ok(w.C['계약상태'] === '' && w.C['계약총액'] === '', '값이 실제로 비워짐');
ok(w.C['현재단계'] === '신청접수', '단계 이동됨');
ok(JSON.parse(w.C['동의기록']||'{}').계약 === undefined, '동의기록 계약 키 제거됨');
ok(String(r.warning||'').indexOf('데이터를') !== -1, '조사 "데이터를" · ' + r.warning);

// 4) ROLLBACK_KEEP_PAID — 확인된 입금은 여전히 보존
w = world({ 현재단계:'제작중', 입금상태:'확인', 입금자명:'김희준', 중도금상태:'확인' }, null);
r = G.adminForceStage('ME-TEST','계약완료','정리');
ok(w.C['입금상태'] === '확인' && w.C['중도금상태'] === '확인', '★확인된 입금 보존(ROLLBACK_KEEP_PAID 무손상)');
console.log(f ? `\n실패 ${f}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(f?1:0);
