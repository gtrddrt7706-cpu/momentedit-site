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
sb.buildHeaderIndex = () => ({ '안내공유토큰': 99 });
sb.touchCustomer = (s, co, n, patch) => Object.assign(DB[n], patch);
sb.notifyKakao = () => {}; sb.notifyStudio = () => {}; sb._nfAdminLineEmail = () => {};
sb.Utilities = { getUuid: () => 'abcdef0123456789abcdef0123456789', formatDate: (d) => new Date(d).toISOString().slice(0, 10) };   // formatDate 스텁 — _kstYmd(만료 판정)용 · ymdShift와 같은 UTC 기준이라 경계 테스트 결정적

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };
const fresh = () => { DB = { C1: { 개인코드: 'C1', 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '정희준', 신부이름: '미쿠', 예식일: '2026-11-07', eventId: 'ev_abc', 안내공유토큰: '', 좌석공유토큰: 'Sxxxxxxxxxxxxxx1', 제작임시저장: '' } }; TOK = { t1: 'C1' }; };

console.log('── 하객 안내 허브 ──');

// 1) 안내 설정 저장 — '라이브 켬'이 발급 사유(입력 필드 폐지 2026-07-17) + 토글·예약 정보만 정규화
fresh();
const r1 = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { showLive: true, reserveTime: '오후 1시 30분', reserveName: '정희준', venue: '라비돌웨딩홀', evil: 'x' } });
ok(r1.ok === true && r1.guideToken && r1.guideToken[0] === 'G', '1 라이브 켬 저장 → 안내 토큰(G…) 발급');
const gd = JSON.parse(DB.C1.제작임시저장).guideinfoDraft;
ok(gd.reserveTime === '오후 1시 30분' && gd.reserveName === '정희준' && gd.venue === undefined && gd.evil === undefined, '2 토글·예약만 저장 + 폐지(venue)·미지정 필드 제거');

// 3) 예약 정보 길이 상한
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: false, draft: { reserveTime: 'a'.repeat(100), reserveName: 'b'.repeat(100) } });
const gd2 = JSON.parse(DB.C1.제작임시저장).guideinfoDraft;
ok(gd2.reserveTime.length === 40 && gd2.reserveName.length === 30, '3 예약 시간 40자·이름 30자 상한');

// 4) handleGuideView — 공개 조회로 오시는 길·다이닝·좌석·라이브 반환
fresh();
DB.C1.안내공유토큰 = 'Gyyyyyyyyyyyyyy1';
DB.C1.제작임시저장 = JSON.stringify({
  guideinfoDraft: { reserveTime: '오후 1시', reserveName: '정희준' },
  diningDraft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반', m: '한정식', tel: '031-0', url: 'https://map/x', src: 'resto' }, { n: '카페', src: 'attr' }] },
  seatDraft: { tables: [{ name: '테이블 1', side: 'L', seats: ['김하객'] }] }
});
const gv = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gv.ok && gv.guide.groom === '정희준' && gv.guide.date === '2026-11-07', '4 부부 이름·예식일');
ok(gv.guide.venue === undefined && gv.guide.dress === undefined, '5 오시는 길·드레스코드 미반환(섹션 폐지)');
ok(gv.guide.dining.rtime === '오후 1시' && gv.guide.dining.rname === '정희준', '5b 식사 예약 시간·예약자 반환(종료 후 집결 안내)');
ok(gv.guide.dining.on && gv.guide.dining.pick === '소반' && gv.guide.dining.restos.length === 1 && gv.guide.dining.spots.length === 1, '6 다이닝(대표·식사·가볼곳)');
ok(gv.guide.seatToken === 'Sxxxxxxxxxxxxxx1' && gv.guide.live === false && gv.guide.eventId === '', '7 좌석 토큰(자리찾기 기본 ON) · 라이브 기본 OFF(eventId 비노출)');
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

// 13) 토글: 자리 찾기 OFF → seatToken 빈값 / 라이브 ON → live true
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { showSeat: false, showLive: true } } });
const gt1 = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gt1.guide.seatToken === '' && gt1.guide.live === true && gt1.guide.eventId === 'ev_abc', '13 자리찾기 OFF→seatToken빈값 · 라이브 ON→live·eventId 노출');

// 14) 기본값: 자리 찾기 ON(seatToken 있음) · 라이브 OFF(eventId 안 내려감·죽은 링크 방지)
setup({ 예식일: ymdShift(10) });
const gt2 = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gt2.guide.seatToken === 'Sxxxxxxxxxxxxxx1' && gt2.guide.live === false && gt2.guide.eventId === '', '14 기본: 자리찾기 ON · 라이브 OFF(eventId 비노출)');

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
const rg0 = sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { showSeat: true, showLive: false, reserveTime: '오후 1시' } });
ok(rg0.ok === true && !rg0.guideToken, '18a 빈 안내정보 저장 → 토큰 미발급');
fresh();
const rs0 = sb.handleSaveProductionTrack({ token: 't1', track: 'seat', done: true, draft: { tables: [{ name: '테이블 1', side: 'L', seats: ['', ''] }] } });
ok(rs0.ok === true && !rs0.guideToken, '18b 이름 없는 좌석 완료 → 토큰 미발급');
// 19) 내부 선택지 문구는 하객에게 비노출 — pick 걸러짐 · 그것뿐이면 다이닝 섹션 자체 숨김
setup({ 예식일: ymdShift(10), _prod: { diningDraft: { dining_on: 'Y', venuePick: '직접 섭외할게요', _favs: [] } } });
const gvS = sb.handleGuideView({ g: 'Gyyyyyyyyyyyyyy1' });
ok(gvS.guide.dining.pick === '' && gvS.guide.dining.on === false, '19 위저드 문구(직접 섭외할게요) → pick 제거·다이닝 숨김');
// 20) showSeat OFF → 직접 공유된 seat 링크도 닫힘(토글 약속 이행)
setup({ 예식일: ymdShift(10), _prod: { guideinfoDraft: { showSeat: false } } });
ok(sb.handleSeatView({ t: 'Sxxxxxxxxxxxxxx1' }).ok === false, '20 자리찾기 OFF → seat.html 직접 링크도 비공개');

console.log('\n' + '─'.repeat(36));
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) process.exit(1);
console.log('하객 안내 허브 검증 통과');
