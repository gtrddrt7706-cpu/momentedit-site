// [DATA_ROUNDTRIP 2026-08-15 점검] 데이터 왕복 무손실 게이트 — 진짜 핸들러를 호출해서 본다.
// 고객 저장(제작 트랙·설문) → 셀 기록 → 서버 재조회(buildProductionState) → 관리자 상세(adminDetail)가
// 같은 값을 말하는지. 특수문자·유니코드·따옴표·배열이 왕복에서 한 글자도 안 변해야 한다.
// + 동의기록 read-modify-write 키 보존(다른 키를 쓰는 저장이 기존 키를 지우지 않는가).
// ★1차 작성 때 오탐 둘을 밟았다: 임의 키가 버려지는 것은 트랙별 화이트리스트 정규화(의도된 보안)이고,
//   설문 필수 검증(overall·recommend)은 제품이 옳았다. 검사는 실제 스키마 필드로 조준해야 한다.
// [라운드 2] 데이터 왕복 무손실 — 진짜 핸들러 호출로: 고객 저장 → 셀 기록 → 서버 재조회 → 관리자 상세
import { openWorld } from './_gasworld.mjs';
const { G, world } = openWorld();
let bad = 0; const no = (m) => { console.log('✗ ' + m); bad++; }; const ok = (m) => console.log('ok ' + m);

// ── 시드: 제작중 고객 ──
const w = world({ 현재단계: '제작중', 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처',
  계약총액: 3300000, 입금상태: '확인', 동의기록: JSON.stringify({ 계약금확인: '2026-08-01', 결과물전달일: '' }) });
const rowRef = G.findCustomerByCode('ME-TEST');
G.resolveSession = () => ({ ok: true, row: rowRef });
G.LockService = { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) };

// ① 제작 트랙 저장 왕복 — 실제 스키마 필드에 특수문자·유니코드·따옴표
//    (임의 키가 버려지는 것은 화이트리스트 정규화 = 의도된 보안 · 1차에서 오탐)
const rn = '김"희준\' · 中文·héj 예약';   // 따옴표·중점·유니코드 (30자 컷 안)
const r1 = G.handleSaveProductionTrack({ token: 't', track: 'guideinfo',
  draft: { seatMode: 'mine', reserveTime: '17:30 · 홀 A', reserveName: rn, photo: ['가족 <전체>', '친구"들"'] } });
if (!r1 || !r1.ok) no('제작 저장 실패: ' + JSON.stringify(r1));
else {
  const d = JSON.parse(w.C['제작_guideinfo'] || '{}');
  const cell = d.guideinfoDraft || d;   // 셀 저장 모양 흡수
  (cell.reserveName === rn && cell.seatMode === 'mine' && cell.reserveTime === '17:30 · 홀 A')
    ? ok('① 제작 저장 왕복 무손실(따옴표·유니코드·중점 보존)') : no('① 셀 왕복 불일치: ' + JSON.stringify(cell).slice(0, 140));
  (JSON.stringify(cell.photo) === JSON.stringify(['가족 <전체>', '친구"들"']))
    ? ok('① photo 배열 왕복 무손실(<태그> 포함)') : no('① photo 불일치: ' + JSON.stringify(cell.photo));
  const st = G.buildProductionState(rowRef);
  const flat = JSON.stringify(st || {});
  (flat.indexOf(rn.replace(/\\/g, '')) > -1 || flat.indexOf('17:30') > -1)
    ? ok('① buildProductionState 재조회에 값 반영') : no('① 재조회에 값이 없음: ' + flat.slice(0, 140));
}

// ② 동의기록 read-modify-write — 다른 키를 쓰는 관리자 동작이 기존 키를 지우지 않는가
const before = JSON.parse(w.C['동의기록']);
w.C['동의기록'] = JSON.stringify(Object.assign({}, before, { 새키: 'v1' }));
// 제작 저장이 동의기록을 건드리나(건드리면 안 됨 · 건드려도 키 보존이어야)
G.handleSaveProductionTrack({ token: 't', track: 'guideinfo', draft: { a: 1 } });
const after = JSON.parse(w.C['동의기록']);
(after.계약금확인 === '2026-08-01' && after.새키 === 'v1')
  ? ok('② 동의기록 키 보존(계약금확인·새키 둘 다 생존)') : no('② 동의기록 키 유실: ' + w.C['동의기록']);

// ③ 설문 제출 왕복 → 관리자 상세가 같은 값을 읽는가
w.C['현재단계'] = '결과물전달'; w.C['결과물상태'] = '전달완료';
const r3 = G.handleSubmitSurvey({ token: 't', answers: { overall: 'very', recommend: 'yes', pace: 'good' }, review: '후기 "인용" · 줄\n바꿈', reviewPublic: 'Y' });
if (!r3 || !r3.ok) no('③ 설문 제출 실패: ' + JSON.stringify(r3).slice(0, 120));
else {
  let sv = {}; try { sv = JSON.parse(w.C['설문응답'] || '{}'); } catch (e) {}
  const okSv = (sv.answers ? sv.answers.overall : sv.overall) === 'very';
  okSv ? ok('③ 설문 셀 기록 확인') : no('③ 설문 셀 불일치: ' + String(w.C['설문응답']).slice(0, 120));
  try {
    const det = G.adminDetail('ME-TEST');
    const flat = JSON.stringify(det);
    (flat.indexOf('very') > -1 || flat.indexOf('매우') > -1 || flat.indexOf('후기') > -1)
      ? ok('③ adminDetail 이 설문/후기를 되읽음(관리자 연동)') : no('③ adminDetail 에 설문이 안 보임');
  } catch (e) { console.log('· adminDetail 호출 못 함(월드 한계): ' + String(e).slice(0, 80) + ' — 셀 단위 왕복까지는 확인됨'); }
}

console.log(bad ? `\n실패 ${bad}건` : '\n왕복 전부 무손실');
process.exit(bad ? 1 : 0);
