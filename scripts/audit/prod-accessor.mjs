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
  const upd = G._prodStoreCols(d, {}, { full: true });
  const back = G._prodLoad(rowOf(upd));
  ok(JSON.stringify(back) === JSON.stringify(d), '왕복 무손실(full 저장)', JSON.stringify(back).slice(0, 80));
  ok(Object.keys(upd).every((h) => G._prodCols().indexOf(h) >= 0), '쓰기 맵은 제작 컬럼만(부수 컬럼 오염 없음)', Object.keys(upd).join(','));
  const updMeta = G._prodStoreCols(d, {}, {});
  ok(Object.keys(updMeta).length === 1 && updMeta[G.PROD_META_COL] !== undefined, '트랙 미지정 저장은 메타 컬럼만(확인서·예식일 동기화 경로)');

  const upd2 = G._prodStoreCols(d, { eventId: 'EV1', 신랑이름: '김철수' }, { full: true });
  ok(upd2.eventId === 'EV1' && upd2['신랑이름'] === '김철수', '동반 컬럼 병합 보존(touchCustomer 1회 유지)');
  ok(G._prodNewCols().every((c) => c in upd2), 'full 저장은 신설 컬럼 전부 기록', G._prodNewCols().join(','));
  ok(!(G.PROD_LEGACY_COL in upd2), '★구셀은 어떤 저장 경로에서도 안 건드림(동결)');
}

console.log('\n[2] 목록 스캔 읽기 — _prodLoadRaw(getter, row)');
{
  const COL = G._prodCols()[0];
  const rv = ['x', JSON.stringify({ tracks: { invitation: '완료' } })];
  const getter = (row, h) => (h === COL ? row[1] : '');
  ok((G._prodLoadRaw(getter, rv).tracks || {}).invitation === '완료', '행 배열 경로도 같은 결과');
  const broke = G._prodLoadRaw(getter, ['x', '깨진 JSON {{']);
  ok(broke && broke.tracks === undefined && broke.ritualDraft === undefined, '손상 값은 빈 데이터 폴백(스캔이 죽지 않음)', JSON.stringify(broke));
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
  const msg = G._prodSizeError(big, { track: 'ritual' });
  ok(!!msg && /[0-9,]+자/.test(msg), '초과는 자수 명시 안내 반환', msg.slice(0, 50));
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

console.log('\n[8] PR-B 마이그레이션 S1~S4 — 두 세대 공존 [PROD_COL_SPLIT]');
{
  const LEG = G.PROD_LEGACY_COL, META = G.PROD_META_COL, TC = G.PROD_TRACK_COL;
  // 실제 고객 모양의 논리 객체(전 트랙 + 크로스트랙 키)
  const full = {
    base: { groomKo: '김철수', brideKo: '이영희', weddingDate: '2026-10-26' },
    tracks: { invitation: '완료', ritual: '완료', dining: '완료', final: '완료', seat: '완료' },
    confirm: { at: '2026-07-20 10:00', core: { heads: '20' } },
    eventId: 'EV-1', invitationUrls: { online: 'https://x/o' },
    ritualDraft: { _v: 3, S: { course: 'damback' }, summary: { course: '담백 코스' } },
    diningDraft: { venuePick: '식당A', _favs: [{ n: '식당B', show: true }] },
    seatDraft: { tables: [{ seats: ['김', '이'] }] },
    guideinfoDraft: { seatMode: 'all', photo: ['부모님'] },
    finalDraft: { headcount: '20', standing: 0, extraFee: 0, drink: '샴페인' },
    invitationDraft: { method: 'online', designOnline: 'A1' },
  };

  // ── S1: 구셀만 있는 고객 → 읽기 정상 → 저장 1회 → 전 트랙 이전 + 구셀 동결 ──
  const s1row = { [LEG]: JSON.stringify(full) };
  const d1 = G._prodLoad(rowOf(s1row));
  ok(d1._mig === true, 'S1 구세대 감지(_mig)');
  ok(JSON.stringify(d1.ritualDraft) === JSON.stringify(full.ritualDraft) && d1.eventId === 'EV-1', 'S1 구셀 읽기 정상(트랙+크로스트랙)');
  const upd1 = G._prodStoreCols(d1, {}, { track: 'ritual' });   // 한 트랙만 저장했는데도
  const wroteAll = Object.keys(TC).every((t) => upd1[TC[t]] !== undefined);
  ok(wroteAll, 'S1 첫 저장은 전 트랙 통째 이전(반쪽 상태 안 만듦)');
  ok(upd1[META] !== undefined, 'S1 메타 컬럼 기록');
  ok(!(LEG in upd1), 'S1 ★구셀 미갱신·미삭제(동결) — 반쪽 마이그레이션 증발 사고 차단');
  ok(!('_mig' in d1) && upd1[META].indexOf('_mig') < 0, 'S1 내부 표시(_mig) 영속 안 됨');
  // 이전 후 읽기 = 이전 전과 동일한 논리 객체여야
  const s1after = Object.assign({}, s1row, upd1);
  const d1b = G._prodLoad(rowOf(s1after));
  ok(G._prodStateRev(d1b) === G._prodStateRev(full), 'S1 ★마이그레이션 전후 _prodStateRev 동일(전 고객 409 사고 없음)');
  ok(Object.keys(TC).every((t) => G._prodTrackRev(d1b, t) === G._prodTrackRev(full, t)), 'S1 트랙 rev도 전부 동일');

  // ── S2: 이전 완료 고객 — 재저장·확인서·발행 경로가 신 컬럼으로 ──
  const d2 = G._prodLoad(rowOf(s1after));
  ok(d2._mig === undefined, 'S2 이전 완료 행은 구세대 표시 없음');
  const upd2 = G._prodStoreCols(d2, {}, { track: 'seat' });
  ok(upd2[TC.seat] !== undefined && upd2[TC.ritual] === undefined, 'S2 재저장은 변경 트랙만 기록(락 시간 단축)');
  ok(upd2[META] !== undefined && !(LEG in upd2), 'S2 메타는 매번 · 구셀은 여전히 미갱신');
  const upd2c = G._prodStoreCols(d2, {}, {});   // 확인서(메타만)
  ok(upd2c[META] !== undefined && Object.keys(TC).every((t) => upd2c[TC[t]] === undefined), 'S2 확인서 경로는 메타만 갱신');

  // ── S3: 혼재 — 일부 트랙만 이전된 행 ──
  const s3row = { [LEG]: JSON.stringify(full), [META]: upd1[META], [TC.ritual]: upd1[TC.ritual] };   // ritual만 이전
  const d3 = G._prodLoad(rowOf(s3row));
  ok(JSON.stringify(d3.ritualDraft) === JSON.stringify(full.ritualDraft), 'S3 이전된 트랙은 신 컬럼에서');
  ok(JSON.stringify(d3.diningDraft) === JSON.stringify(full.diningDraft), 'S3 ★미이전 트랙은 구셀 폴백(증발 없음)');
  ok(JSON.stringify(d3.seatDraft) === JSON.stringify(full.seatDraft), 'S3 좌석도 폴백');
  ok(G._prodStateRev(d3) === G._prodStateRev(full), 'S3 혼재 상태에서도 rev 동일(가드 유지)');

  // ── S4: 신규 고객 — 구셀 미사용 ──
  const d4 = G._prodLoad(rowOf({}));
  ok(JSON.stringify(d4) === '{"_mig":true}' || d4._mig === true, 'S4 빈 행은 구세대 취급(첫 저장에 전 컬럼 기록)');
  const d4b = { base: { groomKo: '새신랑' }, tracks: {}, ritualDraft: { _v: 3, S: {} } };
  const upd4 = G._prodStoreCols(d4b, {}, { track: 'ritual', full: true });
  ok(!(LEG in upd4), 'S4 신규 고객도 구셀에 안 씀');
  const d4c = G._prodLoad(rowOf(upd4));
  ok(d4c.base.groomKo === '새신랑' && d4c.ritualDraft._v === 3, 'S4 신 컬럼만으로 왕복');
  ok(d4c.diningDraft === undefined, 'S4 없는 트랙은 undefined 유지({}로 채우면 초안 있음으로 오독)');
}

console.log('\n[9] 캡·손상 격리 — 한 트랙 사고가 다른 트랙을 막지 않는다 [PROD_COL_SPLIT]');
{
  const TC = G.PROD_TRACK_COL, META = G.PROD_META_COL, LEG = G.PROD_LEGACY_COL;
  // 캡: 식순 초과는 식순 저장만 거부 · 같은 상태에서 좌석 저장은 통과
  const big = { tracks: {}, ritualDraft: { S: { t: 'ㅁ'.repeat(13000) } }, seatDraft: { tables: [] } };
  const rErr = G._prodSizeError(big, { track: 'ritual' });
  const sErr = G._prodSizeError(big, { track: 'seat' });
  ok(!!rErr && rErr.indexOf('식순') >= 0, '초과 트랙은 그 트랙 이름으로 거부', rErr.slice(0, 40));
  ok(sErr === '', '★같은 고객의 다른 트랙 저장은 정상(분리의 목적)');
  ok(rErr.indexOf('—') < 0, '캡 안내 문구 전각 줄표 없음');
  // 합산 상한도 살아있다
  const huge = { tracks: {} };
  Object.keys(TC).forEach((t) => { huge[t + 'Draft'] = { t: 'ㅁ'.repeat((t === 'ritual' || t === 'dining') ? 11900 : 19900) }; });   // 각 컬럼 캡 바로 아래 → 개별은 통과, 합계만 초과
  ok(!!G._prodSizeError(huge, { full: true }), '신설 컬럼 합산 상한 유효(시트 행 한도 보호)');

  // 손상 격리
  const okRow = (o) => rowOf(Object.assign({ [META]: '{"tracks":{}}' }, o));
  ok(G._prodDraftLoadSafe(okRow({ [TC.dining]: '{깨짐' }), 'ME-T', null, 'ritual').ok === true, '★다이닝 손상 + 식순 저장 → 통과(분리 전보다 나빠지지 않음)');
  ok(G._prodDraftLoadSafe(okRow({ [TC.dining]: '{깨짐' }), 'ME-T', null, 'dining').ok === false, '깨진 컬럼 그 자체 위에는 여전히 못 씀');
  ok(G._prodDraftLoadSafe(okRow({ [META]: '{깨짐' }), 'ME-T', null, 'ritual').ok === false, '메타 손상은 전면 차단(tracks·confirm이 거기 있음)');
  ok(G._prodDraftLoadSafe(rowOf({ [LEG]: '{깨짐' }), 'ME-T', null, 'ritual').ok === false, '구세대 행의 구셀 손상은 전면 차단(그 행의 전부)');
  ok(G._prodDraftLoadSafe(okRow({ [LEG]: '{깨짐' }), 'ME-T', null, 'ritual').ok === true, '이전 완료 행의 구셀 손상은 무해(동결·폴백 대상일 뿐)');
}

console.log('\n[10] _prev(force 백업) 거처 — 메타 캡을 잡아먹지 않는다');
{
  const TC = G.PROD_TRACK_COL, META = G.PROD_META_COL;
  const d = { tracks: {}, seatDraft: { tables: [{ seats: ['새'] }] }, _prev: { track: 'seat', at: '2026-07-25 10:00', draft: { tables: [{ seats: ['옛'] }] } } };
  const upd = G._prodStoreCols(d, {}, { track: 'seat' });
  ok(upd[META].indexOf('_prev') < 0, '★_prev는 메타에 안 들어감(확인서 스냅샷이 백업에 밀리지 않게)');
  ok(upd[TC.seat].indexOf('옛') >= 0, '_prev는 해당 트랙 컬럼에 보존');
  const back = G._prodLoad(rowOf(upd));
  ok(JSON.stringify(back.seatDraft) === JSON.stringify(d.seatDraft), '_prev 래퍼가 있어도 초안 원형 복원');
  ok(back._prev && back._prev.track === 'seat', '_prev 복원');
  ok(G._prodTrackRev(back, 'seat') === G._prodTrackRev(d, 'seat'), '_prev 유무가 트랙 rev를 흔들지 않음');
}

console.log('\n[11] A-1 컬럼 미생성 가드 — 조용한 유실을 시끄러운 거부로');
{
  const all = {}; G._prodNewCols().forEach((h, i) => { all[h] = i + 1; });
  ok(G._prodColsMissing(all).length === 0, '컬럼이 전부 있으면 통과');
  const partial = Object.assign({}, all); delete partial[G.PROD_TRACK_COL.dining];
  ok(G._prodColsMissing(partial).length === 1, '하나만 없어도 감지');
  const rej = G._prodColsMissingError(partial, 'ME-T', []);
  ok(rej && rej.ok === false && !!rej.error, '★저장을 명시적으로 거부(무증상 유실 대신)');
  ok(rej.error.indexOf('—') < 0, '거부 문구 전각 줄표 없음');
  ok(G._prodColsMissingError(all, 'ME-T', []) === null, '정상 상태에선 거부하지 않음');
  // 컬럼 생성 순서: meta가 마지막이어야 '전부 있거나 전부 없거나'
  const order = G._prodCreateOrder();
  ok(order[order.length - 1] === G.PROD_META_COL, '★addProdTrackColumns는 meta를 마지막에 생성(중단 시 반쪽 migrated 방지)');
  ok(order.length === G._prodNewCols().length, '생성 순서 목록과 신설 컬럼 수 일치');
}

console.log('\n[12] B-6 합산 상한 — 이번에 안 쓰는 컬럼까지 더해야 행을 실제로 묶는다');
{
  const TC = G.PROD_TRACK_COL;
  // 이미 다른 컬럼이 가득 찬 행에 작은 트랙 하나를 더 저장 → cust 없으면 통과(구멍), cust 주면 거부
  //   코워크가 지목한 우회 시나리오 그대로: 각 컬럼은 자기 캡 안이지만 합치면 행 상한을 넘는 상태에서 마지막 트랙을 저장
  const filled = {};
  ['ritual', 'dining'].forEach((t) => { filled[TC[t]] = 'x'.repeat(11900); });          // 각 12k 캡 안
  ['seat', 'guideinfo', 'snap', 'final'].forEach((t) => { filled[TC[t]] = 'x'.repeat(19900); });   // 각 20k 캡 안
  const d = { tracks: {}, invitationDraft: { m: 'x'.repeat(19800) } };                   // 이번에 쓰는 트랙도 자기 캡 안
  ok(G._prodSizeError(d, { track: 'invitation' }) === '', 'cust 없이 쓰기분만 보면 통과(종전 구멍 재현)');
  const withRow = G._prodSizeError(d, { track: 'invitation', cust: rowOf(filled) });
  ok(!!withRow, '★행 전체를 보면 거부 — 트랙을 하나씩 채워 상한을 우회할 수 없음');
  ok(G._prodSizeError(d, { track: 'invitation', cust: rowOf({}) }) === '', '빈 행이면 당연히 통과(과잉 차단 아님)');
}

console.log('\n[13] B-8 writeCell 빈 값 의미 — 강제 롤백이 8컬럼을 실제로 비우는가');
{
  // R3n9Mr에 실제 올라가는 writeCell은 1벌뿐(.claspignore가 form-to-couple.gs를 제외 · gas-lint EXCLUDE 동일).
  // 그 1벌은 빈 값 skip이 없어 upd[c]='' 가 실제로 셀을 지운다 → 강제 롤백이 신 컬럼 8개를 모두 비운다.
  const writes = [];
  const sheet = { getRange: () => ({ setValue: (v) => writes.push(v) }) };
  const colOf = {}; G._prodCols().forEach((h, i) => { colOf[h] = i + 1; });
  colOf['최종수정'] = 99;
  const upd = {}; G._prodCols().forEach((h) => { upd[h] = ''; });
  G.touchCustomer(sheet, colOf, 2, upd);
  const cleared = writes.filter((v) => v === '').length;
  ok(cleared === G._prodCols().length, '★빈 값 쓰기가 스킵되지 않고 실제로 지워짐(데이터 부활 사고 없음)', '지워진 셀 ' + cleared + '/' + G._prodCols().length);
}

console.log('\n[14] 재검토 A급 — 이전(마이그레이션)은 절대 실패하지 않는다');
{
  const LEG = G.PROD_LEGACY_COL, META = G.PROD_META_COL, TC = G.PROD_TRACK_COL;
  // 구셀 시절 합법이던 크기(전체 45k 안, 단일 트랙 22k) — 신 seat 캡 20k를 넘는다
  const legacy = { base: { groomKo: '김' }, tracks: { seat: '완료' }, seatDraft: { note: 'x'.repeat(22000) } };
  const row = { [LEG]: JSON.stringify(legacy) };
  const d = G._prodLoad(rowOf(row));
  ok(d._mig === true, '구세대 감지');
  const pk = G._prodPack(d, { track: 'seat' });
  ok(pk.err === '', '★이전은 캡으로 막히지 않음(막히면 그 행은 영구 정체)', pk.err.slice(0, 60));
  ok(pk.cols[META] !== undefined, '메타가 기록됨 → 다음 로드부터 migrated=true(재시도 루프 탈출)');
  const after = G._prodLoad(rowOf(Object.assign({}, row, pk.cols)));
  ok(after._mig === undefined, '이전 후에는 구세대 표시 사라짐');
  ok(JSON.stringify(after.seatDraft) === JSON.stringify(legacy.seatDraft), '초과 트랙도 손실 없이 이전됨');
  // 이전 후 '더 키우려' 하면 그때는 정상 거부(캡은 앞으로의 입력을 막는 용도)
  ok(!!G._prodPack(after, { track: 'seat' }).err, '이전 후 같은 트랙 재저장은 캡으로 정상 거부(안내 가능 상태)');
  // 다른 트랙은 영향 없음 — 분리의 목적
  ok(G._prodPack(after, { track: 'ritual' }).err === '', '★초과 트랙이 있어도 다른 트랙 저장은 정상');
}

console.log('\n[15] 재검토 A급 — _prodStoreCols가 err를 삼키지 않는다');
{
  const over = { tracks: {}, ritualDraft: { t: 'ㅁ'.repeat(13000) } };   // ritual 캡 12k 초과 · 구세대 아님
  ok(!!G._prodPack(over, { track: 'ritual' }).err, '캡 초과는 err 발생');
  let threw = false, msg = '';
  try { G._prodStoreCols(over, {}, { track: 'ritual' }); } catch (e) { threw = true; msg = String(e.message || e); }
  ok(threw, '★err를 삼키고 빈 cols로 진행하지 않고 던진다(조용한 ok:true 차단)');
  ok(msg.indexOf('자') >= 0, '던진 메시지가 고객 안내 문구 그대로', msg.slice(0, 50));
  // 정상 크기는 당연히 안 던짐
  let ok2 = true; try { G._prodStoreCols({ tracks: {}, ritualDraft: { t: 'ok' } }, {}, { track: 'ritual' }); } catch (e) { ok2 = false; }
  ok(ok2, '정상 저장은 그대로 통과');
}

console.log('\n[16] 재검토 B급 — 백업(_prev)이 고객 데이터 저장을 막지 않는다');
{
  const TC = G.PROD_TRACK_COL;
  const body = { S: { t: 'ㅁ'.repeat(6900) } };                       // 고객 글 자체는 캡 안
  const d = { tracks: {}, ritualDraft: body, _prev: { track: 'ritual', at: '2026-07-25 10:00', draft: body } };
  const pk = G._prodPack(d, { track: 'ritual' });
  ok(pk.err === '', '★현재본+백업이 캡을 넘으면 백업을 포기하고 저장은 성공(우선순위: 고객 데이터 > 백업)', pk.err.slice(0, 60));
  const back = G._prodLoad(rowOf(pk.cols));
  ok(JSON.stringify(back.ritualDraft) === JSON.stringify(body), '고객 초안은 그대로 보존');
  ok(back._prev === undefined, '이번 저장에서는 백업만 생략됨');
  // 둘 다 여유 있으면 백업도 함께 남는다
  const small = { tracks: {}, seatDraft: { a: 1 }, _prev: { track: 'seat', at: 'x', draft: { a: 0 } } };
  const back2 = G._prodLoad(rowOf(G._prodPack(small, { track: 'seat' }).cols));
  ok(back2._prev && back2._prev.track === 'seat', '여유 있으면 백업 보존(종전 동작 유지)');
}

console.log('\n[17] 재검토 B급 — 합산 상한이 6경로 전부에서 도는가(cust 배선)');
{
  const TC = G.PROD_TRACK_COL;
  const filled = {};
  ['ritual', 'dining'].forEach((t) => { filled[TC[t]] = 'x'.repeat(11900); });
  ['seat', 'guideinfo', 'snap', 'final'].forEach((t) => { filled[TC[t]] = 'x'.repeat(19900); });
  const d = { tracks: {}, invitationDraft: { m: 'x'.repeat(19800) } };
  ok(!!G._prodSizeError(d, { track: 'invitation', cust: rowOf(filled) }), '청첩장 경로도 행 전체 합산으로 거부(B급1 배선 확인)');
  const full7 = Object.assign({}, filled); full7[TC.invitation] = 'x'.repeat(19900);   // 7트랙 전부 채운 행(≈123k)
  const meta = { tracks: {}, base: { g: 'x'.repeat(100) } };
  ok(!!G._prodSizeError(meta, { cust: rowOf(full7) }), '메타 전용 경로(기초정보·확인서)도 합산 적용');
  ok(G._prodSizeError(meta, { cust: rowOf(filled) }) === '', '아직 여유 있는 행은 메타 저장 통과(과잉 차단 아님)');
}

console.log(`\n결과 — 실패 ${fail}건` + (fail ? '' : ' (전부 통과)'));
process.exit(fail ? 1 : 0);
