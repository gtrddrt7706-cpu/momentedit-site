/**
 * Moment Edit · 하객 안내 식사 답 [DINING_RSVP] · 식사 여부 먼저 [MEAL_ASK_FIRST] — 실서버 코드(gas-lint 샌드박스)로 구동.
 *   사장님 결정(2026-09-26): 식사 참석은 하객 안내 페이지에서 받는다 · 청첩장 1단계에서 «식사 자리가 있나요?»만 먼저 묻는다.
 *   89_dine_rsvp.gs(handleDineRsvp · handleDineRsvpList · handleDineRsvpEdit · dineRsvpDaily) +
 *   80_production(handleGuideView rsvp · byEvent rsvp · 안내공유토큰 발급 · guideinfo dineRsvp · _prodUiStrip · buildProductionState).
 *
 * ★«식당 없음»의 뜻 — 명세 6번 첫 줄은 «식당 없음 → 거절»이고 마지막 줄은 «식당 없이 dining_on 'Y'만 있어도 rsvp:true»다.
 *   둘은 [MEAL_ASK_FIRST] 앞뒤 판이 섞인 것이다. 여기서는 이렇게 맞춘다:
 *     · 식당도 없고 «식사 자리가 있다»도 정하지 않았다(dining_on 빈칸 · 담은 곳 없음) → 거절(식사 자리를 모른다)
 *     · 식당은 없지만 dining_on 'Y' → 받는다(사장님 두 번째 결정 · 식당을 기다리지 않는다)
 * 실행: node automation/tests/dine-rsvp.test.js
 */
import { loadGas } from '../../scripts/audit/gas-lint.mjs';

const { sandbox: sb, errors } = loadGas();
if (errors.length) { console.log('로드 실패', errors); process.exit(1); }

// ── 목 ──────────────────────────────────────────────────────────
let DB = {}, TOK = {}, CACHE = {}, SHEETS = {}, MAILS = [];
const makeRow = (c) => ({ get: (k) => (DB[c] && DB[c][k] !== undefined ? DB[c][k] : ''), num: c });
sb.findCustomerByCode = (c) => (DB[c] ? makeRow(c) : null);
sb._findCustomerBy = (col, val) => { for (const c in DB) { if (String(DB[c][col] || '') === val) return makeRow(c); } return null; };
sb.resolveSession = (t) => (TOK[t] ? { ok: true, row: makeRow(TOK[t]) } : { ok: false, reason: 'x' });
sb._sessionMsg = () => '로그인이 필요해요.';
sb.P = Object.assign(sb.P || {}, { DATA_START_ROW: 2 });
sb.getCustomersSheet = () => ({ getLastRow: () => 1 + Object.keys(DB).length, getLastColumn: () => 99, getRange: () => ({ getValues: () => Object.keys(DB).map((c) => ({ __c: c })) }) });   // ③ 식당 마감 전날 알림이 고객을 한 번씩 훑는다(_drEachCustomer)
sb.rowFromValues = (colOf, v) => makeRow(v.__c);
sb.buildHeaderIndex = () => ({ '안내공유토큰': 99, '제작_ritual': 10, '제작_dining': 11, '제작_seat': 12, '제작_guideinfo': 13, '제작_snap': 14, '제작_final': 15, '제작_invitation': 16, '제작_meta': 17 });
sb.touchCustomer = (s, co, n, patch) => Object.assign(DB[n], patch);
sb.notifyKakao = () => {}; sb.notifyStudio = () => {}; sb._nfAdminLineEmail = () => {}; sb.setCustomerStage = () => {}; sb._recordHandler = () => {};
sb.CacheService = { getScriptCache: () => ({ get: (k) => (k in CACHE ? CACHE[k] : null), put: (k, v) => { CACHE[k] = String(v); }, remove: (k) => { delete CACHE[k]; } }) };
sb._notifyCustomerEmail = (code, subject, headline, inner) => { MAILS.push({ code, subject, headline, inner }); return true; };

function makeSheet() {
  const rows = [];
  const sh = {
    rows,
    getLastRow: () => rows.length,
    getMaxRows: () => 1000,
    getRange: (r, c, nr = 1, nc = 1) => ({
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = rows[r - 1 + i] || []; out.push(Array.from({ length: nc }, (_, j) => (row[c - 1 + j] === undefined ? '' : row[c - 1 + j]))); } return out; },
      setValues: (v) => { for (let i = 0; i < nr; i++) { rows[r - 1 + i] = rows[r - 1 + i] || []; for (let j = 0; j < nc; j++) rows[r - 1 + i][c - 1 + j] = v[i][j]; } },
      setValue: (v) => { rows[r - 1] = rows[r - 1] || []; rows[r - 1][c - 1] = v; },
      setNumberFormat: () => {}
    }),
    appendRow: (a) => { rows.push(a.slice()); },
    deleteRow: (r) => { rows.splice(r - 1, 1); },
    setFrozenRows: () => {}
  };
  return sh;
}
sb.SpreadsheetApp = { getActive: () => ({ getSheetByName: (n) => SHEETS[n] || null, insertSheet: (n) => (SHEETS[n] = makeSheet()) }) };

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };
const kstShift = (days) => new Date(Date.now() + 9 * 3600e3 + days * 86400e3).toISOString().slice(0, 10);
const tsShift = (days) => new Date(Date.now() + 9 * 3600e3 + days * 86400e3).toISOString().replace('T', ' ').slice(0, 19);
const ON = () => { sb.DINE_RSVP.from = '2020-01-01'; };
const OFF = () => { sb.DINE_RSVP.from = '2099-12-31'; };
const G1 = 'Gaaaaaaaaaaaaaa1', G2 = 'Gbbbbbbbbbbbbbb2';
const cust = (code, token, wedDays, prod, more) => Object.assign({ 개인코드: code, 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '정희준', 신부이름: '미쿠',
  예식일: wedDays == null ? '' : kstShift(wedDays), eventId: 'ev-' + code.toLowerCase() + '-0101', 안내공유토큰: token, 좌석공유토큰: '', 제작임시저장: JSON.stringify(prod || {}) }, more || {});
const MEALY = { diningDraft: { dining_on: 'Y' } };
const fresh = (over) => {
  DB = { C1: cust('C1', G1, 20, MEALY), C2: cust('C2', G2, 20, MEALY) };
  if (over) over(DB);
  TOK = { t1: 'C1', t2: 'C2' }; CACHE = {}; SHEETS = {}; MAILS = []; ON();
};
const sheet = () => SHEETS['식사답'];
const rowsOf = (code) => (sheet() ? sheet().rows.slice(1).filter((r) => String(r[0]) === code) : []);
const send = (o) => sb.handleDineRsvp(Object.assign({ g: G1, name: '홍길동', ans: 'Y', n: 2 }, o || {}));

console.log('── 하객 식사 답 [DINING_RSVP] ──');

// 1) 거절 — 토큰 틀림 · 닫힘 · 스위치 전 · 식사 끔 · 식당도 식사 여부도 없음 · 두 분이 끔 · 예식 당일
fresh();
ok(send({ g: 'bad token!' }).ok === false && send({ g: 'Gnope000000000' }).ok === false, '1a 토큰 모양 틀림 · 없는 토큰 → 거절');
fresh((d) => { d.C1.예식일 = kstShift(-31); });
const r1b = send();
ok(r1b.ok === false && r1b.expired === true, '1b 예식 +31일(안내 닫힘) → 닫힘 답 그대로', r1b);
fresh((d) => { d.C1.예식일 = ''; });
ok(send().ok === false && send().reason === 'unknown', '1b2 예식일 모름 → 닫힘(unknown)');
fresh(); OFF();
const r1c = send();
ok(r1c.ok === false && r1c.error === '지금은 식사 답을 받지 않아요.', '1c 기능 스위치(DINE_RSVP.from) 전 → 거절', r1c);
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' } }); });
ok(send().error === '지금은 식사 답을 받지 않아요.', '1d 애프터 웨딩 «안 함»(N) → 거절');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: '', _favs: [] } }); });
ok(send().error === '지금은 식사 답을 받지 않아요.', '1e 식당도 없고 식사 자리도 안 정함 → 거절');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'Y' }, guideinfoDraft: { dineRsvp: 'off' } }); });
ok(send().error === '지금은 식사 답을 받지 않아요.', '1f 두 분이 끔(guideinfo dineRsvp off) → 거절');
fresh((d) => { d.C1.예식일 = kstShift(0); });
const r1g = send();
ok(r1g.ok === false && r1g.error === '오늘은 두 분께 직접 알려 주세요.', '1g 예식 당일 → 거절(두 분께 직접)', r1g);
ok(!sheet() || rowsOf('C1').length === 0, '1h 거절된 답은 한 줄도 안 남는다');
fresh((d) => { d.C1.예식일 = kstShift(1); });
ok(send().ok === true, '1i 예식 전날 → 받는다');

// 2) 새 답 · 같은 이름 바꾸기 · 다른 고객 줄
fresh();
const r2 = send({ name: '김 민준', ans: 'Y', n: 3 });
ok(r2.ok === true && r2.name === '김 민준' && r2.ans === 'Y' && r2.n === 3, '2a 새 답 → {ok,name,ans,n}', r2);
ok(rowsOf('C1').length === 1 && rowsOf('C1')[0][2] === '김민준' && rowsOf('C1')[0][5] === 'guest', '2b 한 줄 · 이름키(공백 뺌) · 넣은 곳 guest');
sb.handleDineRsvp({ g: G2, name: '김민준', ans: 'N', n: 0 });
const r2c = send({ name: '김민준', ans: 'N', n: 5 });
ok(r2c.ok === true && r2c.n === 0 && rowsOf('C1').length === 1 && rowsOf('C1')[0][3] === 'N' && String(rowsOf('C1')[0][4]) === '0', '2c «김 민준»과 «김민준»은 같은 줄로 바뀐다(새 줄 아님)');
ok(rowsOf('C2').length === 1 && rowsOf('C2')[0][3] === 'N', '2d 다른 고객 줄은 따로 · 건드리지 않는다');
send({ name: '김·민준', ans: 'Y', n: 1 });
ok(rowsOf('C1').length === 1 && rowsOf('C1')[0][3] === 'Y', '2e 가운뎃점도 이름키에서 뺀다(«김·민준» = «김민준»)');
ok(JSON.stringify(r2c).indexOf('updated') === -1 && JSON.stringify(r2c).indexOf('이미') === -1, '2f 같은 이름이 있었는지 드러내지 않는다');

// 3) 이름 · 인원
fresh();
ok(send({ name: '' }).error === '이름을 적어 주세요.' && send({ name: '   ' }).error === '이름을 적어 주세요.', '3a 이름 0자 → 거절');
ok(send({ name: '가'.repeat(21) }).error === '이름은 20자까지 적을 수 있어요.', '3b 21자 → 거절');
ok(send({ name: '가'.repeat(20) }).ok === true, '3b2 20자 → 받는다');
ok(send({ name: '!!! ###' }).error === '이름을 적어 주세요.' && send({ name: '1234' }).error === '이름을 적어 주세요.', '3c 기호뿐 · 숫자뿐 → 거절');
ok(send({ name: '<b>홍</b>' }).name === 'b홍/b', '3d <> 를 뺀다');
ok(send({ name: '영', n: 0 }).n === 1 && send({ name: '영', n: 7 }).n === 1 && send({ name: '영', n: 2.5 }).n === 1 && send({ name: '영', n: 'x' }).n === 1, '3e n 이 0 · 7 · 소수 · 글자면 1');
ok(send({ name: '영', n: 6 }).n === 6 && send({ name: '영', n: '4' }).n === 4, '3f 1~6 정수는 그대로');
ok(send({ name: '영', ans: 'N', n: 4 }).n === 0, '3g 예식만(N) → 0');
ok(send({ name: '영', ans: 'X' }).ok === false, '3h 답이 Y · N 이 아니면 거절');
const rF = send({ name: '=HYPERLINK("x")' });
ok(rF.ok === true && rowsOf('C1').some((r) => String(r[1]).indexOf("'=") === 0), '3i 수식으로 시작하는 이름은 _deFormula');

// 4) 한도 · 150줄
fresh();
let r4 = null; for (let i = 1; i <= 21; i++) r4 = send({ name: '하객' + String.fromCharCode(44032 + i) });
ok(r4.ok === false && r4.error === '잠시 뒤에 다시 보내 주세요.', '4a 1분 21번째 → 거절', r4);
ok(rowsOf('C1').length === 20, '4b 20번째까지만 저장');
CACHE = {}; for (let i = 0; i < 5; i++) send({ name: '' });
ok(Number(CACHE['dr_m_' + G1]) === 5, '4c 막힌 시도(이름 없음)도 센다');
fresh();
const sh4 = (sb._drSheet(true));
for (let i = 0; i < 150; i++) sh4.appendRow(['C1', '손님' + i, '손님' + i, 'Y', 1, 'guest', tsShift(-1), tsShift(-1), '']);
const r4d = send({ name: '새손님' });
ok(r4d.ok === false && r4d.error === '답이 많이 모였어요. 두 분께 직접 알려 주세요.', '4d 150줄 넘으면 새 이름 거절', r4d);
ok(send({ name: '손님3', n: 4 }).ok === true && rowsOf('C1').length === 150, '4e 이미 있는 이름은 150줄이어도 바꿀 수 있다');

// 5) 두 분 — List · Edit
fresh();
send({ name: '홍길동', n: 2 }); send({ name: '김영희', ans: 'N' });
sb.handleDineRsvp({ g: G2, name: '남의하객', ans: 'Y', n: 5 });
const L = sb.handleDineRsvpList({ token: 't1' });
ok(L.ok && L.rows.length === 2 && !JSON.stringify(L).includes('남의하객'), '5a List 는 그 고객 줄만', L.rows);
ok(L.yes === 2 && L.no === 1 && L.open === true && L.due === kstShift(13), '5b 셈(함께 2분 · 예식만 1분) · 받는 중 · 마감(예식 7일 전)', { yes: L.yes, no: L.no, due: L.due });
ok(sb.handleDineRsvpList({ token: 'nope' }).ok === false && sb.handleDineRsvpEdit({ token: '', op: 'add', name: '가', ans: 'Y' }).ok === false, '5c 세션 없으면 거절');
const E1 = sb.handleDineRsvpEdit({ token: 't1', op: 'add', name: '큰 아버지', ans: 'Y', n: 3 });
ok(E1.ok && E1.rows.some((r) => r.name === '큰 아버지' && r.by === 'couple' && r.n === 3) && E1.yes === 5, '5d Edit add → by couple · 셈 갱신');
const E2 = sb.handleDineRsvpEdit({ token: 't1', op: 'add', name: '큰아버지', ans: 'N' });
ok(E2.rows.filter((r) => r.key === '큰아버지').length === 1 && E2.no === 2, '5e 같은 이름키면 바꾼다');
const E3 = sb.handleDineRsvpEdit({ token: 't1', op: 'del', key: '홍길동' });
ok(E3.ok && !E3.rows.some((r) => r.key === '홍길동') && rowsOf('C2').length === 1, '5f Edit del → 그 줄만(다른 고객 그대로)');
ok(sb.handleDineRsvpEdit({ token: 't1', op: 'add', name: '###', ans: 'Y' }).ok === false, '5g 두 분 넣기도 이름 검사는 같다');
OFF(); ok(sb.handleDineRsvpEdit({ token: 't1', op: 'add', name: '가나', ans: 'Y' }).ok === false, '5h 스위치 전에는 직접 넣기도 거절'); ON();

// 6) guideView rsvp · rsvpDue
fresh();
let gv = sb.handleGuideView({ g: G1 });
ok(gv.ok && gv.guide.dining.rsvp === true && gv.guide.dining.rsvpDue === kstShift(13), '6a guideView rsvp:true · rsvpDue = 예식 7일 전', gv.guide.dining);
ok(gv.guide.dining.on === false && gv.guide.dining.pick === '', '6b 식당 없이 dining_on Y 만 → 식사 칸은 rsvp 로만 연다 [MEAL_ASK_FIRST]');
OFF(); ok(sb.handleGuideView({ g: G1 }).guide.dining.rsvp === false && sb.handleGuideView({ g: G1 }).guide.dining.rsvpDue === '', '6c 스위치 전 → rsvp:false'); ON();
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'N' } }); });
ok(sb.handleGuideView({ g: G1 }).guide.dining.rsvp === false, '6d «안 함» → rsvp:false');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'Y' }, guideinfoDraft: { dineRsvp: 'off' } }); });
ok(sb.handleGuideView({ g: G1 }).guide.dining.rsvp === false, '6e 두 분이 끔 → rsvp:false');
fresh((d) => { d.C1.예식일 = kstShift(0); });
ok(sb.handleGuideView({ g: G1 }).guide.dining.rsvp === false, '6f 예식 당일 → rsvp:false');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: '' } }); });
ok(sb.handleGuideView({ g: G1 }).guide.dining.rsvp === false, '6g 식사 자리를 안 정함 → rsvp:false');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { venuePick: '소반', _favs: [{ n: '소반', src: 'resto' }] } }); });
ok(sb.handleGuideView({ g: G1 }).guide.dining.rsvp === true, '6h dining_on 없이 고른 식당만 있어도(지금의 diningOn) rsvp:true');
ok(!JSON.stringify(sb.handleGuideView({ g: G1 })).includes('홍길동'), '6i guideView 에 남의 답이 실리지 않는다');

// 7) 안내공유토큰 발급 [MEAL_ASK_FIRST] · 스위치 전엔 옛 규칙
fresh((d) => { d.C1.안내공유토큰 = ''; d.C1.제작임시저장 = ''; });
const t7 = sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: false, draft: { dining_on: 'Y' } });
ok(t7.ok && /^G/.test(t7.guideToken || '') && /^G/.test(DB.C1.안내공유토큰), '7a 청첩장 «있어요»(dining_on Y · 완료 아님) → 안내공유토큰 발급', t7);
const keep = DB.C1.안내공유토큰;
sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'Y', venuePick: '장소 미정' } });
ok(DB.C1.안내공유토큰 === keep, '7b 한 번 생긴 링크는 그대로');
fresh((d) => { d.C1.안내공유토큰 = ''; d.C1.제작임시저장 = ''; });
ok(!sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'N', venuePick: '다이닝 없이 진행할게요' } }).guideToken, '7c «없어요»(N) → 발급 없음');
fresh((d) => { d.C1.안내공유토큰 = ''; d.C1.제작임시저장 = ''; }); OFF();
ok(!sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: false, draft: { dining_on: 'Y' } }).guideToken
  && !sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'Y', venuePick: '장소 미정' } }).guideToken, '7d 스위치 전 → 옛 규칙 그대로(자리표시만으로는 발급 없음)');
ok(/^G/.test(sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: true, draft: { dining_on: 'Y', venuePick: '소반', _favs: [{ n: '소반' }] } }).guideToken || ''), '7e 스위치 전에도 옛 규칙(식당 있는 완료)은 발급');
ON();

// 8) byEvent — rsvp 함께 · 캐시에 담긴 값 포함
fresh();
const b1 = sb.handleGuideView({ byEvent: 'ev-c1-0101' });
ok(b1.ok && b1.g === G1 && b1.rsvp === true, '8a byEvent 가 g 와 rsvp 를 함께', b1);
DB.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'N' } });
const b2 = sb.handleGuideView({ byEvent: 'ev-c1-0101' });
ok(b2.ok && b2.rsvp === true && CACHE['gbe_ev-c1-0101'] === G1 + '|1', '8b 5분 캐시(gbe_)에 rsvp 도 담긴다(토큰|1)', CACHE);
CACHE = { 'gbe_ev-c1-0101': G1 };
const b3 = sb.handleGuideView({ byEvent: 'ev-c1-0101' });
ok(b3.ok && b3.g === G1 && b3.rsvp === false, '8c 배포 직후 옛 캐시(토큰만) → rsvp 없이(지금 글)');
CACHE = {}; OFF();
ok(sb.handleGuideView({ byEvent: 'ev-c1-0101' }).rsvp === false, '8d 스위치 전 → rsvp:false'); ON();

// 9) 두 분이 끄기 — guideinfo 화이트리스트 · 키 없는 저장은 «끔»을 지킨다 · 확인서 비교에서 뺀다
fresh();
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'all', dineRsvp: 'off' } });
let gi = sb._prodLoad(makeRow('C1')).guideinfoDraft;
ok(gi.dineRsvp === 'off' && sb.handleGuideView({ g: G1 }).guide.dining.rsvp === false, '9a 끄기 저장 → dineRsvp:off · 하객 화면 rsvp:false');
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'mine', photo: ['양가 부모님'] } });
gi = sb._prodLoad(makeRow('C1')).guideinfoDraft;
ok(gi.dineRsvp === 'off' && gi.seatMode === 'mine', '9b dineRsvp 키가 없는 다른 저장(좌석 · 사진)은 «끔»을 지우지 않는다');
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'mine', photo: ['양가 부모님'], dineRsvp: '' } });
gi = sb._prodLoad(makeRow('C1')).guideinfoDraft;
ok(!('dineRsvp' in gi) && sb.handleGuideView({ g: G1 }).guide.dining.rsvp === true, '9c 켜기(빈 값) → 키 없음 · 다시 받는다');
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'mine', dineRsvp: 'hack' } });
ok(!('dineRsvp' in sb._prodLoad(makeRow('C1')).guideinfoDraft), '9d 잡값은 켜짐(키 없음)');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ tracks: { ritual: '완료', final: '완료' }, finalDraft: { headcount: 12 }, guideinfoDraft: { seatMode: 'all', reserveTime: '', reserveName: '' } }); });
sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '식순', v: 'x' }] } });
sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft: { seatMode: 'all', dineRsvp: 'off' } });
const d9 = sb._prodLoad(makeRow('C1'));
ok(!!d9.confirm && d9.confirmStale === undefined, '9e 식사 답 켜고 끄기만으로 예식 확인서가 풀리지 않는다(_prodUiStrip)');

// 10) buildProductionState — 화면이 날짜를 박지 않게 서버가 상태를 준다
fresh();
const ps = sb.buildProductionState(makeRow('C1'));
ok(ps && ps.dineRsvp && ps.dineRsvp.live === true && ps.dineRsvp.meal === true && ps.dineRsvp.open === true && ps.dineRsvp.due === kstShift(13) && ps.dineRsvp.maxN === 6, '10a 마이페이지 상태에 dineRsvp{live,meal,open,due}', ps && ps.dineRsvp);
OFF(); ok(sb.buildProductionState(makeRow('C1')).dineRsvp.live === false, '10b 스위치 전 → live:false(물음 · 덩어리 숨김)'); ON();
ok(!JSON.stringify(ps.dineRsvp).includes('rows'), '10c 상태에는 명단을 싣지 않는다(패널을 열 때 dineRsvpList)');

// 11) 매일 — 지우기
fresh((d) => {
  d.C3 = cust('C3', 'Gccccccccccccc3', -31, MEALY);   // +31 → 지움
  d.C4 = cust('C4', 'Gddddddddddddd4', -30, MEALY);   // +30 → 남김
  d.C5 = cust('C5', 'Geeeeeeeeeeeee5', null, MEALY);  // 날짜 모름
});
const s11 = sb._drSheet(true);
s11.appendRow(['C3', '가', '가', 'Y', 1, 'guest', tsShift(-40), tsShift(-40), '']);
s11.appendRow(['C4', '나', '나', 'Y', 1, 'guest', tsShift(-40), tsShift(-40), '']);
s11.appendRow(['C5', '다', '다', 'Y', 1, 'guest', tsShift(-31), tsShift(-31), '']);
s11.appendRow(['C5', '라', '라', 'Y', 1, 'guest', tsShift(-30), tsShift(-30), '']);
s11.appendRow(['CX', '마', '마', 'Y', 1, 'guest', tsShift(-1), tsShift(-1), '']);   // 고객이 없어진 줄
s11.appendRow(['C1', '바', '바', 'Y', 1, 'guest', tsShift(-1), tsShift(-1), '']);
const m11 = sb.dineRsvpDaily();
const names11 = s11.rows.slice(1).map((r) => r[1]).join('');
ok(names11 === '나라바', '11a 예식 +31일 지움 · +30일 남김 · 날짜 모름은 마지막 답 +30일 · 고객이 없어진 줄 지움', names11);
ok(/지운 줄 3/.test(m11) && !/[가-힣]{2,}\s*·\s*함께/.test(m11) && m11.indexOf('나') === -1, '11b 로그엔 수만(이름 없음)', m11);

// 12) 매일 — 늦은 답 메일
fresh((d) => { d.C1.예식일 = kstShift(10); d.C2.예식일 = kstShift(3); });
const s12 = sb._drSheet(true);
s12.appendRow(['C1', '이른답', '이른답', 'Y', 2, 'guest', tsShift(-1), tsShift(0), '']);   // 마감(예식 10일 전 → 마감 3일 뒤) 전 변경
s12.appendRow(['C2', '새하객', '새하객', 'Y', 2, 'guest', tsShift(0), tsShift(0), '']);      // 마감(4일 전) 뒤 새로
s12.appendRow(['C2', '바꾼하객', '바꾼하객', 'N', 0, 'guest', tsShift(-9), tsShift(0), '']);  // 마감 전에 처음 · 마감 뒤 바꿈
s12.appendRow(['C2', '큰아버지', '큰아버지', 'Y', 3, 'couple', tsShift(0), tsShift(0), '']); // 두 분이 넣은 줄
sb.dineRsvpDaily();
ok(MAILS.length === 1 && MAILS[0].code === 'C2', '12a 마감 전 변경은 안 보냄 · 마감 뒤 하객 변경만 · 하루 한 통', MAILS.map((m) => m.code));
const m12 = MAILS[0] || { inner: '', subject: '', headline: '' };
const due12 = kstShift(3 - 7); ok(m12.subject === '[Moment Edit] 식사 답이 새로 들어왔어요' && m12.headline === `하객 마감(${+due12.slice(5, 7)}월 ${+due12.slice(8, 10)}일)이 지난 뒤 들어온 식사 답이에요`, '12b 제목 · 머리(하객 마감 날짜)', m12.headline);
ok(/새하객 · 함께할게요 2분 · 새로/.test(m12.inner) && /바꾼하객 · 예식만 함께할게요 · 바뀜/.test(m12.inner) && m12.inner.indexOf('큰아버지') === -1, '12c 줄 — 새로 · 바뀜 · 두 분이 넣은 줄은 알리지 않는다');
ok(/지금까지 함께 5분 · 예식만 1분/.test(m12.inner) && /식당 예약 인원을 한 번 더 확인해 주세요\./.test(m12.inner) && /mypage\.html\?focus=dine/.test(m12.inner), '12d 끝 — 합계 · 확인 부탁 · 마이페이지 단추');
const all12 = m12.subject + m12.headline + m12.inner;
ok(all12.indexOf('—') === -1 && !/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(all12), '12e 글에 «—» · 이모지 없음');
ok(s12.rows.slice(1).filter((r) => r[0] === 'C2' && r[5] === 'guest').every((r) => String(r[8]).length >= 16), '12f 보낸 줄의 메일 칸에 시각');
MAILS = []; sb.dineRsvpDaily();
ok(MAILS.length === 0, '12g 한 번 보낸 줄은 다시 안 보낸다');
s12.rows[2][7] = tsShift(0).slice(0, 10) + ' 23:59:59'; s12.rows[2][4] = 4;   // 새하객이 또 바꿈
sb.dineRsvpDaily();
ok(MAILS.length === 1 && /새하객 · 함께할게요 4분 · 바뀜/.test(MAILS[0].inner), '12h 보낸 뒤 또 바꾸면 «바뀜»으로 한 번 더');
fresh((d) => { d.C2.예식일 = kstShift(0); });
sb._drSheet(true).appendRow(['C2', '당일', '당일', 'Y', 1, 'guest', tsShift(0), tsShift(0), '']);
sb.dineRsvpDaily();
ok(MAILS.length === 0, '12i 예식 당일부터는 보내지 않는다');

// 13) 시트 머리가 어긋나면 쓰지 않는다(저장했다고 답했는데 없음 방지)
fresh();
SHEETS['식사답'] = makeSheet(); SHEETS['식사답'].appendRow(['개인코드', '이름', '다른칸']);
const r13 = send();
ok(r13.ok === false && SHEETS['식사답'].rows.length === 1, '13 머리가 다른 «식사답» 시트엔 쓰지 않고 거절', r13);

// 14) 하객 마감 [RESTO_DUE] — 식당 마감 7 · 5 · 3 · 1 → 11 · 9 · 7 · 5일 전 · 안 고르면 3 → 7 · 잡값도 3
const dueOf = (rd) => { fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: Object.assign({ dining_on: 'Y' }, rd === undefined ? {} : { restoDue: rd }) }); }); return sb.handleGuideView({ g: G1 }).guide.dining.rsvpDue; };
ok(dueOf(7) === kstShift(20 - 11) && dueOf(5) === kstShift(20 - 9) && dueOf(3) === kstShift(20 - 7) && dueOf(1) === kstShift(20 - 5), '14a 식당 마감 7 · 5 · 3 · 1 → 하객 마감 11 · 9 · 7 · 5일 전', [dueOf(7), dueOf(5), dueOf(3), dueOf(1)]);
ok(dueOf(undefined) === kstShift(13) && dueOf(4) === kstShift(13) && dueOf('x') === kstShift(13), '14b 안 고르면 · 잡값이면 기본 3 → 7일 전');
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'Y', restoDue: 1 } }); });
const ps14 = sb.buildProductionState(makeRow('C1')).dineRsvp;
ok(ps14.restoN === 1 && ps14.due === kstShift(15) && ps14.restoDate === kstShift(19) && ps14.guestGap === 4 && JSON.stringify(ps14.restoDue) === '[7,5,3,1]', '14c 마이페이지 상태에 restoN · restoDate · guestGap · 고를 수 있는 날(화면이 서버 값을 쓴다)', ps14);
fresh((d) => { d.C1.제작임시저장 = JSON.stringify({ tracks: { ritual: '완료', final: '완료' }, finalDraft: { headcount: 12 }, diningDraft: { dining_on: 'Y', venuePick: '소반' } }); });
sb.handleSaveProductionTrack({ token: 't1', track: 'confirm', done: true, draft: { snap: [{ k: '식순', v: 'x' }] } });
sb.handleSaveProductionTrack({ token: 't1', track: 'dining', done: false, draft: { dining_on: 'Y', venuePick: '소반', restoDue: 5 } });
const d14 = sb._prodLoad(makeRow('C1'));
ok(!!d14.confirm && d14.confirmStale === undefined && d14.diningDraft.restoDue === 5, '14d 식당 마감을 골라도 예식 확인서가 풀리지 않는다(_prodUiStrip · 저장은 된다)');

// 15) ③ 식당 마감 전날 알림 [RESTO_REMIND]
fresh((d) => {
  d.C1.예식일 = kstShift(4); d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'Y', restoDue: 3 } });                 // 식당 마감 = 내일
  d.C2.예식일 = kstShift(5); d.C2.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'Y', restoDue: 3 } });                 // 모레 — 아직
  d.C3 = cust('C3', 'Gccccccccccccc3', 4, { diningDraft: { dining_on: 'N' } });                                                     // 식사 없음
  d.C4 = cust('C4', 'Gddddddddddddd4', 2, { diningDraft: { dining_on: 'Y', restoDue: 1 }, guideinfoDraft: { dineRsvp: 'off' } });   // 끔 — 인원 줄 없이
});
const s15 = sb._drSheet(true);
s15.appendRow(['C1', '가하객', '가하객', 'Y', 3, 'guest', tsShift(-9), tsShift(-9), '']);
s15.appendRow(['C1', '늦은하객', '늦은하객', 'Y', 2, 'guest', tsShift(0), tsShift(0), '']);   // 하객 마감(예식 7일 전 = 사흘 전) 뒤 — ② 도 같은 날
sb.dineRsvpDaily();
const byC = {}; MAILS.forEach((m) => { byC[m.code] = (byC[m.code] || 0) + 1; });
ok(byC.C1 === 1 && !byC.C2 && !byC.C3 && byC.C4 === 1, '15a 식당 마감 전날만 · 식사 있는 두 분만 · 같은 날 늦은 답과 한 통', byC);
const m15 = MAILS.find((m) => m.code === 'C1') || { subject: '', headline: '', inner: '' };
const rd15 = kstShift(1);
ok(m15.subject === '[Moment Edit] 내일까지 식당에 최종 인원을 알려 주세요' && m15.headline === `${+rd15.slice(5, 7)}월 ${+rd15.slice(8, 10)}일은 식당에 최종 인원을 알리는 날이에요`, '15b 제목 · 머리', m15);
ok(/지금까지 함께 5분 · 두 분까지 7분이에요\. 양가 가족이 함께하시면 더해 주세요\./.test(m15.inner) && /늦은하객 · 함께할게요 2분 · 새로/.test(m15.inner) && /mypage\.html\?focus=dine/.test(m15.inner), '15c 본문(인원 · 두 분 포함) · 늦은 답 줄이 아래에 · 패널로 가는 단추', m15.inner);
const m15b = MAILS.find((m) => m.code === 'C4') || { inner: '' };
ok(m15b.inner.indexOf('지금까지') === -1, '15d 답 받기가 꺼졌으면 인원 줄 없이');
const all15 = MAILS.map((m) => m.subject + m.headline + m.inner).join('');
ok(all15.indexOf('—') === -1 && !/[\u{1F000}-\u{1FFFF}\u{2600}-\u{27BF}]/u.test(all15), '15e 알림 글에 «—» · 이모지 없음');
MAILS = []; sb.dineRsvpDaily();
ok(!MAILS.some((m) => /내일까지/.test(m.subject)), '15f 같은 날 두 번 돌려도 전날 알림은 한 통');
fresh((d) => { d.C1.예식일 = kstShift(4); d.C1.제작임시저장 = JSON.stringify({ diningDraft: { dining_on: 'Y', restoDue: 3 } }); }); OFF();
sb._drSheet(true).appendRow(['C1', '늦은하객', '늦은하객', 'Y', 2, 'guest', tsShift(0), tsShift(0), '']);
sb.dineRsvpDaily();
ok(MAILS.length === 0, '15g 스위치 전엔 메일이 하나도 안 나간다(고객 변화 0)'); ON();

console.log('\n' + '─'.repeat(36));
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) process.exit(1);
console.log('하객 식사 답 검증 통과');
