// 제작 데이터 접근자·확인서 해제 규칙 감사 — GAS를 node vm에 통째로 로드해 실제 함수로 검증한다.
//   Wave 4 PR-A에서 도입(PROD_ACCESSOR): 제작임시저장 읽기/쓰기가 _prodLoad·_prodStoreCols 단일 창구로 수렴됐는지,
//   확인서 해제 규칙(_prodUiStrip)이 UI 전용 변경(_favs 담은 곳·_step 등)에 반응하지 않는지(R-9)를 고정한다.
//   ★PR-B(트랙별 컬럼 분리)에서 이 파일에 S1~S4 마이그레이션 시나리오가 추가된다 — 접근자 계약이 곧 이 테스트다.
//   사용: node scripts/audit/prod-accessor.mjs
import { loadGas } from './gas-lint.mjs';

const { sandbox: G, errors } = loadGas();
if (errors.length) { for (const e of errors) console.log('❌ LOAD FAIL', e.file, '—', e.message); process.exit(1); }

let fail = 0;
const ok = (cond, label, detail) => {
  if (cond) console.log('  ✅ ' + label);
  else { fail++; console.log('  ❌ ' + label + (detail ? ' — ' + detail : '')); }
};

// 시트 행 접근자 목 — cust.get(헤더) 형태(20_customers-data rowFromValues와 같은 계약)
const rowOf = (cells) => ({ num: 2, get: (h) => (h in cells ? cells[h] : '') });

console.log('\n[1] 접근자 왕복 — _prodStoreCols로 쓴 것을 _prodLoad가 그대로 읽는다');
{
  const d = { base: { groomKo: '김철수' }, tracks: { ritual: '완료' }, ritualDraft: { _v: 3, S: { course: 'damback' } } };
  const upd = G._prodStoreCols(d);
  const back = G._prodLoad(rowOf(upd));
  ok(JSON.stringify(back) === JSON.stringify(d), '왕복 무손실', JSON.stringify(back).slice(0, 80));
  ok(Object.keys(upd).length === 1, '쓰기 맵은 제작 컬럼만(부수 컬럼 오염 없음)', Object.keys(upd).join(','));

  const upd2 = G._prodStoreCols(d, { eventId: 'EV1', 신랑이름: '김철수' });
  ok(upd2.eventId === 'EV1' && upd2['신랑이름'] === '김철수', '동반 컬럼 병합 보존(touchCustomer 1회 유지)');
  ok(G._prodCols().every((c) => c in upd2), '제작 컬럼 전부 기록됨', G._prodCols().join(','));
}

console.log('\n[2] 목록 스캔 읽기 — _prodLoadRaw(getter, row)');
{
  const COL = G._prodCols()[0];
  const rv = ['x', JSON.stringify({ tracks: { invitation: '완료' } })];
  const getter = (row, h) => (h === COL ? row[1] : '');
  ok((G._prodLoadRaw(getter, rv).tracks || {}).invitation === '완료', '행 배열 경로도 같은 결과');
  ok(JSON.stringify(G._prodLoadRaw(getter, ['x', '깨진 JSON {{'])) === '{}', '손상 값은 {} 폴백(스캔이 죽지 않음)');
}

console.log('\n[3] 손상 셀 방어 — _prodDraftLoadSafe는 깨진 셀 위 저장을 막는다');
{
  ok(G._prodDraftLoadSafe(rowOf({}), 'ME-T').ok === true, '빈 셀은 정상({} 시작)');
  ok(G._prodDraftLoadSafe(rowOf({ [G._prodCols()[0]]: '{"a":1}' }), 'ME-T').ok === true, '정상 JSON 통과');
  const bad = G._prodDraftLoadSafe(rowOf({ [G._prodCols()[0]]: '{깨짐' }), 'ME-T');
  ok(bad.ok === false && !!(bad.res && bad.res.error), '손상 셀은 저장 차단 + 고객 안내');
  const arr = G._prodDraftLoadSafe(rowOf({ [G._prodCols()[0]]: '[1,2]' }), 'ME-T');
  ok(arr.ok === false, '배열(객체 아님)도 차단 — 전 트랙 덮어쓰기 방지');
}

console.log('\n[4] 용량 캡 — _prodSizeError(DRAFT_SIZE_CAP)');
{
  ok(G._prodSizeError({ a: 1 }) === '', '정상 크기는 통과');
  const big = { ritualDraft: { S: { t: 'ㅁ'.repeat(46000) } } };
  const msg = G._prodSizeError(big);
  ok(!!msg && msg.indexOf('45,000') >= 0, '초과는 자수 명시 안내 반환');
  ok(msg.indexOf('—') < 0, '안내 문구에 전각 줄표 없음(문구 규칙)');
}

console.log('\n[5] R-9 — 담은 곳(_favs)·UI 키 변경은 확인서를 해제하지 않는다 [UISTRIP_FAVS_EXEMPT]');
{
  const base = { venuePick: '식당A', headcount: '20' };
  const before = JSON.stringify(base);
  // (a) 담은 곳 추가 · (b) 하객 공개 토글 · (c) 위저드 단계 이동 — 전부 확인서 무관 변경
  const afterFav = JSON.stringify(Object.assign({}, base, { _favs: [{ n: '식당B', show: false }] }));
  const afterShow = JSON.stringify(Object.assign({}, base, { _favs: [{ n: '식당B', show: true }] }));
  const afterStep = JSON.stringify(Object.assign({}, base, { _step: 2 }));
  const S = (j) => G._prodUiStrip(j, 'dining');
  ok(S(before) === S(afterFav), '담은 곳 추가 → 해제 안 됨');
  ok(S(before) === S(afterShow), '하객 공개 토글 → 해제 안 됨');
  ok(S(afterFav) === S(afterShow), '공개 토글만 바뀐 두 상태는 동일 취급');
  ok(S(before) === S(afterStep), '위저드 단계 이동 → 해제 안 됨');
  // 반대로 확인서에 실제로 찍히는 값이 바뀌면 반드시 해제돼야 한다(예외가 과하지 않은지)
  const realChange = JSON.stringify(Object.assign({}, base, { venuePick: '식당Z' }));
  ok(S(before) !== S(realChange), '최종 선택 장소 변경 → 해제됨(예외 과잉 아님)');
  const headChange = JSON.stringify(Object.assign({}, base, { headcount: '25' }));
  ok(S(before) !== S(headChange), '다이닝 인원 변경 → 해제됨');
  // guideinfo 트랙의 레거시 showSeat 예외도 함께 고정
  ok(G._prodUiStrip('{"seatMode":"all","showSeat":false}', 'guideinfo') === G._prodUiStrip('{"seatMode":"all"}', 'guideinfo'), '레거시 showSeat 예외 유지');
}

console.log('\n[6] 확인서 core 스냅샷 불변 — _favs 변경 전후로 관리자 대조값이 그대로 [R-9 조건]');
{
  // handleSaveProductionTrack의 confirm 분기가 만드는 core와 같은 방식으로 산출(서버가 초안에서 직접 뽑는 값)
  const core = (d) => {
    const _fd = d.finalDraft || {}, _rd = d.ritualDraft || {}, _dd = d.diningDraft || {}, _sd = d.seatDraft || {}, _tr = d.tracks || {};
    let _tc = 0, _pn = 0;
    if (Array.isArray(_sd.tables)) { _tc = _sd.tables.length; _sd.tables.forEach((t) => ((t || {}).seats || []).forEach((v) => { if (String(v || '').trim()) _pn++; })); }
    return JSON.stringify({ heads: String(_fd.headcount || ''), standing: Number(_fd.standing) || 0, extraFee: Number(_fd.extraFee) || 0, drink: String(_fd.drink || ''),
      course: String((_rd.summary || {}).course || ''), venue: String(_dd.venue || _dd.venuePick || ''), seatTables: _tc, seatNames: _pn,
      tracks: { invitation: _tr.invitation || '', dining: _tr.dining || '', ritual: _tr.ritual || '', final: _tr.final || '', seat: _tr.seat || '' } });
  };
  const d1 = { finalDraft: { headcount: '20', standing: 0, extraFee: 0, drink: '샴페인' }, ritualDraft: { summary: { course: '담백 코스' } },
    diningDraft: { venuePick: '식당A' }, seatDraft: { tables: [{ seats: ['김', '이'] }] }, tracks: { dining: '완료', ritual: '완료', final: '완료', seat: '완료' } };
  const d2 = JSON.parse(JSON.stringify(d1));
  d2.diningDraft._favs = [{ n: '식당B', show: true }, { n: '카페C', show: false }];
  ok(core(d1) === core(d2), 'core 스냅샷 불변(_favs는 확인서에 안 들어감)');
  const d3 = JSON.parse(JSON.stringify(d1)); d3.diningDraft.venuePick = '식당Z';
  ok(core(d1) !== core(d3), '최종 선택 장소가 바뀌면 core도 바뀜(대조 유효)');
}

console.log('\n[7] 스키마 단일 출처 — 롤백 초기화·PII 파기가 제작 컬럼 전체를 덮는다 [PR-B 안전장치]');
{
  const cols = G._prodCols();
  ok(Array.isArray(cols) && cols.length >= 1, '_prodCols() 목록 반환', cols.join(','));
  ok(typeof G._custPiiCols === 'function' && cols.every((c) => G._custPiiCols().indexOf(c) >= 0),
    'PII 파기 목록이 제작 컬럼 전부 포함(파기 누락 시 하객 이름·좌석 잔존)');
}

console.log(`\n결과 — 실패 ${fail}건` + (fail ? '' : ' (전부 통과)'));
process.exit(fail ? 1 : 0);
