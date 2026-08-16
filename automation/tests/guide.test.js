/**
 * Moment Edit · 하객 안내 허브(guide.html) 백엔드 검증 — 실서버 코드(gas-lint 샌드박스)로 구동.
 *   handleGuideView(공개 조회·PII 최소) · handleSaveProductionTrack track='guideinfo'(토글·식사 예약 정보) · 안내공유토큰 발급.
 * 실행: node automation/tests/guide.test.js
 */
import { loadGas } from '../../scripts/audit/gas-lint.mjs';

const { sandbox: sb, errors } = loadGas();
if (errors.length) { console.log('로드 실패', errors); process.exit(1); }

let DB = {}, TOK = {};
const makeRow = (c) => ({ get: (k) => (DB[c] && DB[c][k] !== undefined ? DB[c][k] : ''), num: c });
sb.findCustomerByCode = (c) => (DB[c] ? makeRow(c) : null);
sb._findCustomerBy = (col, val) => { for (const c in DB) { if (String(DB[c][col] || '') === val) return makeRow(c); } return null; };
sb.resolveSession = (t) => (TOK[t] ? { ok: true, row: makeRow(TOK[t]) } : { ok: false, reason: 'x' });
sb._sessionMsg = () => '세션';
sb.getCustomersSheet = () => ({});
// PROD_COL_SPLIT: 제작 저장은 신 컬럼(제작_*)에 쓰고 _prodColsMissing 가드가 colOf에 그 컬럼이 있어야 통과시킨다 → 목 시트에 8개 컬럼 제공.
sb.buildHeaderIndex = () => ({ '안내공유토큰': 99, '제작_ritual': 10, '제작_dining': 11, '제작_seat': 12, '제작_guideinfo': 13, '제작_snap': 14, '제작_final': 15, '제작_invitation': 16, '제작_meta': 17 });
sb.touchCustomer = (s, co, n, patch) => Object.assign(DB[n], patch);
sb.notifyKakao = () => {}; sb.notifyStudio = () => {}; sb._nfAdminLineEmail = () => {};
sb.Utilities = { getUuid: () => 'abcdef0123456789abcdef0123456789', formatDate: (d) => new Date(d).toISOString().slice(0, 10) };   // formatDate 스텁 — _kstYmd(만료 판정)용 · ymdShift와 같은 UTC 기준이라 경계 테스트 결정적

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };
const fresh = () => { DB = { C1: { 개인코드: 'C1', 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '정희준', 신부이름: '미쿠', 예식일: '2026-11-07', eventId: 'ev_abc', 안내공유토큰: '', 좌석공유토큰: 'Sxxxxxxxxxxxxxx1', 제작임시저장: '' } }; TOK = { t1: 'C1' }; };

console.log('── 하객 안내 허브 ──');

// 1) 안내 설정 저장 — 토큰은 다이닝·좌석 완료로만 발급(라이브는 청첩장 결정에서 파생 · 2026-07-17) + 예약 정보 정규화
fresh();
const r1 = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { reserveTime: '오후 1시 30분', reserveName: '정희준', showLive: true, venue: '라비돌웨딩홀', evil: 'x' } });
ok(r1.ok === true && !r1.guideToken, '1 guideinfo 저장은 토큰 발급 없음(다이닝·좌석만 발급)');
const gd = sb._prodLoad(makeRow('C1')).guideinfoDraft;   // PROD_COL_SPLIT: 저장은 신 컬럼 → 실제 접근자로 조립해 읽는다(구 제작임시저장 직접 파싱 폐지)
ok(gd.reserveTime === '오후 1시 30분' && gd.reserveName === '정희준' && gd.showLive === undefined && gd.venue === undefined && gd.evil === undefined, '2 자리토글·예약만 저장 + 폐지(showLive·venue)·미지정 필드 제거');

// 3) 예약 정보 길이 상한
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: false, draft: { reserveTime: 'a'.repeat(100), reserveName: 'b'.repeat(100) } });
const gd2 = sb._prodLoad(makeRow('C1')).guideinfoDraft;   // PROD_COL_SPLIT: 신 컬럼 조립
ok(gd2.reserveTime.length === 40 && gd2.reserveName.length === 30, '3 예약 시간 40자·이름 30자 상한');

// 4) handleGuideView — 공개 조회로 오시는 길·다이닝·좌석·라이브 반환
fresh();
DB.C1.안내공유토큰 = 'Gyyyyyyyyyyyyyy1';
DB.C1.제작임시저장 = JSON.stringify({
  guideinfoDraft: { reserveTime: '오후 1시', reserveName: '정희준' },
  diningDraft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', m: '한정식', tel: '031-0', url: 'https://map/x', src: 'resto' }, { n: '카페', src: 'attr', show: true }] },   // show:true = 하객 노출 선택(2026-07-19 담기≠노출 필터 반영)
  seatDraft: { tables: [{ name: '테이블 1', side: 'L', seats: ['김하객'] }] }
});
const gv = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gv.ok && gv.guide.groom === '정희준' && gv.guide.date === '2026-11-07', '4 부부 이름·예식일');
ok(gv.guide.venue === undefined && gv.guide.dress === undefined, '5 오시는 길·드레스코드 미반환(섹션 폐지)');
ok(gv.guide.dining.rtime === '오후 1시' && gv.guide.dining.rname === '정희준', '5b 식사 예약 시간·예약자 반환(종료 후 집결 안내)');
ok(gv.guide.dining.on && gv.guide.dining.pick === '소반' && gv.guide.dining.restos.length === 1 && gv.guide.dining.spots.length === 1, '6 다이닝(대표·식사·가볼곳)');
ok(gv.guide.seatToken === 'Sxxxxxxxxxxxxxx1' && gv.guide.live === undefined && gv.guide.eventId === undefined, '7 좌석 토큰 반환 · 라이브 필드 미전송(하객 안내 라이브 섹션 삭제 2026-07-17)');
ok(!JSON.stringify(gv).includes('제작임시저장') && !JSON.stringify(gv.guide).includes('_favs'), '8 내부 draft 원본 미노출(PII 최소)');

// 9) 잘못된/빈 토큰 차단
ok(sb.handleGuideView({ g: '' }).ok === false && sb.handleGuideView({ g: 'nope1234' }).ok === false, '9 빈·없는 토큰 → 실패');

// 10) 알 수 없는 track 거부(라우팅 안전)
fresh();
ok(sb.handleSaveProductionTrack({ token: 't1', track: 'evil', done: true, draft: {} }).ok === false, '10 알 수 없는 track 거부');

// ── 후속: 자동 만료 + opt-in 토글 ──
const ymdShift = (days) => { const d = new Date(Date.now() + days * 86400e3); return d.toISOString().slice(0, 10); };
const setup = (over) => { fresh(); DB.C1.안내공유토큰 = 'Gyyyyyyyyyyyyyy1'; Object.assign(DB.C1, over || {});
  DB.C1.제작임시저장 = JSON.stringify(Object.assign({ guideinfoDraft: {}, diningDraft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', src: 'resto' }] }, seatDraft: { tables: [{ name: '테이블 1', side: 'L', seats: ['김하객'] }] } }, (over && over._prod) || {})); };

// 11) 예식 31일 경과 → guide/seat 만료
setup({ 예식일: ymdShift(-31) });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).expired === true, '11a 예식 +31일 → 안내 만료');
ok(sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1' }).expired === true, '11b 예식 +31일 → 좌석 만료');

// 12) 예식 29일 경과 → 아직 열림 · 예식일 미정 → 만료 안 함
setup({ 예식일: ymdShift(-29) });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).ok === true, '12a 예식 +29일 → 아직 열림');
setup({ 예식일: '' });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).ok === true, '12b 예식일 미정 → 만료 안 함');

// 13) (구)showSeat=false 레거시 저장분은 무시(허용 토글 폐지 2026-07-17) · 라이브 필드는 어떤 청첩장 방식에서도 미전송(섹션 삭제)
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { showSeat: false }, invitationDraft: { method: 'both' } } });
const gt1 = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gt1.guide.seatToken === 'Sxxxxxxxxxxxxxx1' && gt1.guide.live === undefined && gt1.guide.eventId === undefined, '13 (구)showSeat=false 무시(좌석 열림) · 온라인 포함(both)이어도 라이브 미전송');

// 14) 기본값: 좌석 토큰 반환 · eventId는 어떤 경우에도 하객 안내 응답에 없음(PII·링크 재료 최소)
setup({ 예식일: ymdShift(10), _prod: { invitationDraft: { method: 'offline' } } });
const gt2 = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gt2.guide.seatToken === 'Sxxxxxxxxxxxxxx1' && !JSON.stringify(gt2).includes('ev_abc'), '14 기본: 좌석 토큰 반환 · eventId 미전송');

// 15) 'final'(인원 확정) 완료는 안내 토큰 발급 안 함 — 하객 노출 콘텐츠가 없어 빈 안내 링크 방지
fresh();
const rf = sb.handleSaveProductionTrack({ token: 't1', track: 'final', done: true, draft: { headcount: '28', drink: '스파클링' } });
ok(rf.ok === true && !rf.guideToken && !DB.C1.안내공유토큰, '15 final 완료 → 안내 토큰 미발급(빈 링크 방지)');
// 16) 반대로 dining 완료는 발급
fresh();
const rd = sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'Y', venuePick: '소반' } });
ok(rd.ok === true && rd.guideToken && rd.guideToken[0] === 'G', '16 dining 완료 → 안내 토큰 발급');

// ── 마지막점검 후속: 빈 안내 방지 · 내부 문구 필터 · showSeat 게이트 ──
// 17) '다이닝 없이'(N)·미정 문구만으로 완료 → 토큰 미발급(빈 안내 링크 방지)
fresh();
const rn = sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' } });
ok(rn.ok === true && !rn.guideToken && !DB.C1.안내공유토큰, '17a 다이닝 없음(N) 완료 → 토큰 미발급');
fresh();
const rp = sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'Y', venuePick: '상담 때 함께 정할게요' } });
ok(rp.ok === true && !rp.guideToken, '17b 미정 문구만 → 토큰 미발급');
// 18) 전부 빈 guideinfo 저장 → 토큰 미발급 · 빈 좌석 완료도 미발급
fresh();
const rg0 = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { showSeat: true, reserveTime: '오후 1시' } });
ok(rg0.ok === true && !rg0.guideToken, '18a guideinfo 저장 → 토큰 미발급(다이닝·좌석 전용)');
fresh();
const rs0 = sb.handleSaveProductionTrack({ token: 't1', track: 'seat', done: true, draft: { tables: [{ name: '테이블 1', side: 'L', seats: ['', ''] }] } });
ok(rs0.ok === true && !rs0.guideToken, '18b 이름 없는 좌석 완료 → 토큰 미발급');
// 19) 내부 선택지 문구는 하객에게 비노출 — pick 걸러짐 · 그것뿐이면 다이닝 섹션 자체 숨김
setup({ 예식일: ymdShift(10), _prod: { diningDraft: { dining_on: 'Y', venuePick: '직접 섭외할게요', _favs: [] } } });
const gvS = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gvS.guide.dining.pick === '' && gvS.guide.dining.on === false, '19 위저드 문구(직접 섭외할게요) → pick 제거·다이닝 숨김');
// 20) (구)showSeat=false 레거시 저장분 — UI가 사라진 플래그가 좌석을 영구 차단하지 않게 무시(2026-07-17 폐지)
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { showSeat: false } } });
ok(sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1' }).ok === true, '20 (구)showSeat=false 무시 → seat 링크 정상(막다른길 해소)');

// ── 예식 확인서(confirm) — 게이트·스냅샷 정규화·수정 시 해제 ──
// 21) 식순·최종 확정 미완료 → 확인 거부
fresh();
DB.C1.제작임시저장 = JSON.stringify({ tracks: { ritual: '진행중', final: '완료' } });
ok(sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '식순', v: 'x' }] } }).ok === false, '21 식순 미완료 → 확인 거부');
// 22) 완료 후 확인 → 스냅샷·시각 저장(+정규화: 길이 상한·미지정 필드 제거)
fresh();
DB.C1.제작임시저장 = JSON.stringify({ tracks: { ritual: '완료', final: '완료' } });
const rc = sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '식순'.repeat(30), v: 'v'.repeat(500), evil: 'x' }] } });
const dc = sb._prodLoad(makeRow('C1'));
ok(rc.ok === true && rc.confirm && rc.confirm.at && dc.confirm.snap[0].k.length === 24 && dc.confirm.snap[0].v.length === 300 && dc.confirm.snap[0].evil === undefined, '22 확인 저장 · 스냅샷 상한·정규화');
ok(dc.confirmDraft === undefined && (dc.tracks.confirm === undefined), '22b confirm은 트랙 아님(Draft·tracks 미기록)');
// 23) 확인 후 트랙 수정 → 확인 해제(stale)
const ri = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { reserveTime: '오후 2시' } });
const dc2 = sb._prodLoad(makeRow('C1'));
ok(ri.ok === true && dc2.confirm === undefined && dc2.confirmStale === true, '23 확인 후 수정 → 자동 해제(재확인 필요)');
// 24) 재확인 → stale 해제
const rc2 = sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '식순', v: 'y' }] } });
const dc3 = sb._prodLoad(makeRow('C1'));
ok(rc2.ok === true && dc3.confirm && dc3.confirmStale === undefined, '24 재확인 → 확인 복구·stale 해제');

// ── 좌석 공개 범위(seatMode) — 2안 단일 체크(2026-07-17): 기본 '전체 배치도 공개' · 체크하면 '내 자리만 검색' ──
// 25) 정규화 — 미지정·잡값은 'all'(기본), 'mine'만 내 자리만
fresh();
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: {} });
ok(sb._prodLoad(makeRow('C1')).guideinfoDraft.seatMode === 'all', '25a seatMode 미지정 → all(기본 전체 공개)');
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'hack' } });
ok(sb._prodLoad(makeRow('C1')).guideinfoDraft.seatMode === 'all', '25b 잡값 → all');
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'mine' } });
ok(sb._prodLoad(makeRow('C1')).guideinfoDraft.seatMode === 'mine', '25c mine → 내 자리만 검색');
// 26) 'mine' 체크 시에만 전체 배치도 차단(mineOnly) — 명단(테이블) 미전송 · 기본은 종전대로 전체 반환
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { seatMode: 'mine' } } });
const sv1 = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1' });
ok(sv1.ok === false && sv1.mineOnly === true && sv1.seat && sv1.seat.groom === '정희준' && !JSON.stringify(sv1).includes('김하객'), '26a mine 체크 → 전체 배치도 차단 · 하객 이름 미전송');
setup({ 예식일: ymdShift(10) });
const sv2 = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1' });
ok(sv2.ok === true && sv2.seat.tables.length === 1, '26b 기본(미지정) → 종전대로 전체 배치 반환');
// 27) guideView seatFull 플래그 — 기본 true · mine이면 false · (구)자리찾기 OFF면 false
setup({ 예식일: ymdShift(10) });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).guide.seatFull === true, '27a 기본 → seatFull true(배치도 링크)');
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { seatMode: 'mine' } } });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).guide.seatFull === false, '27b mine 체크 → seatFull false(검색만)');
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { showSeat: false } } });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).guide.seatFull === true, '27c (구)showSeat=false는 seatFull에 영향 없음(토글 폐지 · seatMode만 유효)');
// 28) 서버 검색(seatView+q) — 일치 테이블 라벨만 답하고 하객 이름은 절대 미포함
setup({ 예식일: ymdShift(10), _prod: { seatDraft: { tables: [
  { name: '테이블 1', side: 'L', seats: ['김하객', '이친구'] },
  { name: '가족석', side: 'R', seats: ['김하늘'] }   // [SEAT_Q_MIN] 두 글자('김하')로도 다중 일치가 나게 — 서버가 한 글자를 막으므로
] } } });
const sf1 = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '이친구' });
ok(sf1.ok === true && sf1.hits.length === 1 && sf1.hits[0].no === 1 && sf1.hits[0].label === '테이블 1', '28a 단일 일치 → 행순서 번호·라벨');
ok(sf1.hits[0].room && sf1.hits[0].room.length === 2 && sf1.hits[0].hti === 0 && JSON.stringify(sf1.hits[0].mi) === '[1]' && sf1.hits[0].nm === '이친구', '28a2 단일 일치 → 홀 전체 배치(익명)+본인 테이블·자리·이름');
ok(JSON.stringify(sf1.hits[0].room[0].occ) === '[1,1]' && sf1.hits[0].room[1].label === '가족석' && sf1.hits[0].seats === undefined, '28a3 room은 점유 여부·라벨만(이름 배열 없음)');
ok(!JSON.stringify(sf1).includes('김하객') && !JSON.stringify(sf1).includes('김하늘'), '28a4 응답 어디에도 타인 이름 없음(본인 이름만)');
const sf2 = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '김하' });   // [SEAT_Q_MIN] 한 글자는 서버가 거절한다(아래 28c 가 그것을 본다)
ok(sf2.ok === true && sf2.hits.length === 2 && sf2.hits[1].label === '가족석' && sf2.hits[1].no === 2, '28b 다중 일치(흔한 성) → 테이블 목록만 · 커스텀명 존중');
ok(sf2.hits[0].room === undefined && sf2.hits[1].room === undefined, '28b2 다중 일치 → 홀 배치·자리 구성 미전송(테이블 특정 전 최소 응답)');
/* ★[SEAT_Q_MIN 2026-08-16 노출 점검] «두 글자부터»가 클라이언트에만 있던 시절, 요청을 직접 보내면
   한 글자('김')로 성씨 단위 훑기가 됐다 — 특정인의 참석 여부를 캐는 열쇠가 된다. 서버에도 같은 값을 둔다. */
const sfq = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '김' });
ok(sfq.ok === false && !JSON.stringify(sfq).includes('김하'), '28c 한 글자 검색은 서버가 거절(명단 훑기 차단) [SEAT_Q_MIN]');
const sf3 = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '박없음' });
ok(sf3.ok === true && sf3.hits.length === 0 && !JSON.stringify(sf3).includes('김하객'), '28c 불일치 → 빈 결과 · 응답에 하객 이름 없음');
const sf4 = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '김 하객' });
ok(sf4.ok === true && sf4.hits.length === 1, '28d 공백 섞인 입력도 매칭(정규화)');
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { showSeat: false } } });
ok(sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '김하객' }).ok === true, '28e (구)showSeat=false 무시 → 검색 정상');

// ── 확인 무결성 후속(2026-07-17 코드리뷰) — 실변경만 해제(_prodUiStrip) · 상태 지문(rev) · 청첩장 연동 해제 ──
// 29) 무변경 재저장(위저드 열고 닫기·자동저장 에코)은 확인을 해제하지 않는다 · showSeat 토글만도 유지(스냅샷 비대상)
fresh();
DB.C1.제작임시저장 = JSON.stringify({ tracks: { ritual: '완료', final: '완료', guideinfo: '완료' }, guideinfoDraft: { showSeat: true, seatMode: 'mine', reserveTime: '오후 1시', reserveName: '정희준' } });
sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '식순', v: 'x' }] } });
const rNoop = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { showSeat: true, seatMode: 'mine', reserveTime: '오후 1시', reserveName: '정희준' } });
const dNoop = sb._prodLoad(makeRow('C1'));
ok(rNoop.ok === true && !!dNoop.confirm && dNoop.confirmStale === undefined, '29a 무변경 재저장 → 확인 유지(가짜 재확인 필요 없음)');
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { showSeat: false, seatMode: 'mine', reserveTime: '오후 1시', reserveName: '정희준' } });
ok(!!sb._prodLoad(makeRow('C1')).confirm, '29b 자리 찾기 토글만 변경 → 확인 유지(_prodUiStrip 제외 필드)');
// 30) 실제 변경(공개 범위) 저장 → 확인 해제
const rCh = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { showSeat: false, seatMode: 'all', reserveTime: '오후 1시', reserveName: '정희준' } });
const dCh = sb._prodLoad(makeRow('C1'));
ok(rCh.ok === true && dCh.confirm === undefined && dCh.confirmStale === true, '30 공개 범위 변경 → 확인 해제(재확인 필요)');
// 31) 상태 지문(rev) 대조 — 옛 화면 확인 거부 · 현재 지문 일치 허용 · 미전송(구버전 프런트) 생략
const rC2 = sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: 's', v: 'y' }] }, rev: 'stale-fingerprint' });
ok(rC2.ok === false && /갱신/.test(rC2.error || ''), '31a 지문 불일치(배우자 탭이 먼저 수정) → 확인 거부');
const _revNow = sb._prodStateRev(sb._prodLoad(makeRow('C1')));
const rC3 = sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: 's', v: 'y' }] }, rev: _revNow });
ok(rC3.ok === true && sb._prodLoad(makeRow('C1')).confirmStale === undefined, '31b 지문 일치 → 확인 허용·stale 해제');
// 32) 청첩장 수정(85_invitation)도 확인 자동 해제 — 스냅샷 1행(청첩장 상태) 무결성
fresh();
DB.C1.제작임시저장 = JSON.stringify({ tracks: { ritual: '완료', final: '완료' } });
sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '청첩장', v: '만듦' }] } });
const rInv = sb.handleSaveInvitationDraft({ token: 't1', draft: { method: 'offline', groomKo: '정희준' } });
const dInv = sb._prodLoad(makeRow('C1'));
ok(rInv.ok === true && dInv.confirm === undefined && dInv.confirmStale === true, '32 청첩장 수정 → 확인 자동 해제(85_invitation 연동)');
// 33) 서버 검색 상한 4 — 프런트 규약(1=단정 · 2~3=후보 나열 · 4=성함 더 입력)
setup({ 예식일: ymdShift(10), _prod: { seatDraft: { tables: [
  { side: 'L', seats: ['김하a'] }, { side: 'R', seats: ['김하b'] }, { side: 'L', seats: ['김하c'] },
  { side: 'R', seats: ['김하d'] }, { side: 'L', seats: ['김하e'] }, { side: 'R', seats: ['김하f'] }
] } } });   // [SEAT_Q_MIN] 두 글자 질의로 — 서버가 한 글자를 거절하므로 상한 검사는 두 글자로 본다
const sfC = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '김하' });
ok(sfC.ok === true && sfC.hits.length === 4, '33 다수 일치 상한 4(응답 최소·프런트 규약)');

// 34) 예약 시간·예약자 — 다이닝 위저드 입력(diningDraft) 우선 · 구 guideinfo 저장분 폴백(2026-07-17 이동)
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { reserveTime: '옛값', reserveName: '옛이름' }, diningDraft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', src: 'resto' }], reserveTime: '오후 1시 30분', reserveName: '김신랑' } } });
const gvR = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gvR.guide.dining.rtime === '오후 1시 30분' && gvR.guide.dining.rname === '김신랑', '34a 다이닝 입력 우선');
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { reserveTime: '오후 1시' }, diningDraft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', src: 'resto' }] } } });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).guide.dining.rtime === '오후 1시', '34b 다이닝에 없으면 구 저장분 폴백');

// ── 3차 리뷰 반영 — 이름 노출 규칙·예약값 지움 존중 ──
// 35) 이름은 '전체 성함 정확 입력'에만 — 부분 검색 단일 일치는 자리 강조만(타인 실명 수집 차단)
setup({ 예식일: ymdShift(10), _prod: { seatDraft: { tables: [{ side: 'L', seats: ['최철수', '박영희'] }] } } });
const sfP = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '최철' });
ok(sfP.ok === true && sfP.hits.length === 1 && sfP.hits[0].nm === '' && JSON.stringify(sfP).indexOf('최철수') === -1, '35a 부분 일치 → 이름 미포함(수집 차단)');
ok(sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '최철수' }).hits[0].nm === '최철수', '35b 전체 성함 정확 일치 → 본인 이름 표시');
// 36) 같은 테이블 부분 일치 여럿 → 이름 없이 자리들만(mi) — 타인 자리에 검색자 이름 오표기 방지
setup({ 예식일: ymdShift(10), _prod: { seatDraft: { tables: [{ side: 'L', seats: ['김민수', '김민지'] }] } } });
const sfM = sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1', q: '김민' });
ok(sfM.hits.length === 1 && sfM.hits[0].mi.length === 2 && sfM.hits[0].nm === '' && JSON.stringify(sfM).indexOf('김민수') === -1, '36 동일 테이블 다중 일치 → 이름 없이 자리 강조만');
// 37) 예약값 '지움' 존중 — 다이닝에 빈 문자열 저장이면 구 guideinfo 값으로 폴백하지 않음
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { reserveTime: '옛값' }, diningDraft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', src: 'resto' }], reserveTime: '' } } });
ok(sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' }).guide.dining.rtime === '', '37 다이닝에서 지운 예약값 → 유령 부활 없음');

console.log('\n' + '─'.repeat(36));
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) process.exit(1);
console.log('하객 안내 허브 검증 통과');
