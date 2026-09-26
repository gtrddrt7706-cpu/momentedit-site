/**
 * Moment Edit · «가족 · 친구 스냅» 친구들과 자유롭게 [PHOTO_FRIEND 2026-09-26 사장님 G1·G2] — 실서버 코드(gas-lint 샌드박스)로 구동.
 *   사장님 원문: «단체사진 계획된거 전부 가족들과 찍고 후에 친구들과 자유스럽게 찍데 촬영작가님에게 도움요청 그걸 대략적으로 적을수있게만»
 *   guideinfo 는 트랙 통째 교체다 — 화이트리스트에 없으면 «저장됐어요»인데 사라진다(photoWish · photoCaller 가 겪은 사고).
 * 실행: node automation/tests/photo-friend.test.js
 */
import { loadGas } from '../../scripts/audit/gas-lint.mjs';

const { sandbox: sb, errors } = loadGas();
if (errors.length) { console.log('로드 실패', errors); process.exit(1); }

let DB = {}, TOK = {}, MAIL = [], FILES = {}, TRASHED = [], PROPS = {}, CACHE = {}, NEXT = 1;
const makeRow = (c) => ({ get: (k) => (DB[c] && DB[c][k] !== undefined ? DB[c][k] : ''), num: c });
sb.findCustomerByCode = (c) => (DB[c] ? makeRow(c) : null);
sb.resolveSession = (t) => (TOK[t] ? { ok: true, row: makeRow(TOK[t]) } : { ok: false, reason: 'x' });
sb._sessionMsg = () => '세션';
sb.P = Object.assign(sb.P || {}, { DATA_START_ROW: 2 });
sb.getCustomersSheet = () => ({ getLastRow: () => 1 + Object.keys(DB).length, getLastColumn: () => 99, getRange: () => ({ getValues: () => Object.keys(DB).map((c) => ({ __c: c })) }) });
sb.rowFromValues = (colOf, v) => makeRow(v.__c);
sb.buildHeaderIndex = () => ({ '제작_ritual': 10, '제작_dining': 11, '제작_seat': 12, '제작_guideinfo': 13, '제작_snap': 14, '제작_final': 15, '제작_invitation': 16, '제작_meta': 17 });
sb.touchCustomer = (s, co, n, patch) => Object.assign(DB[n], patch);
sb.notifyKakao = () => {}; sb.notifyStudio = () => {};
sb._nfAdminLineEmail = (t) => MAIL.push(t);
sb._recordHandler = () => {};
sb.setCustomerStage = () => {};
sb._requireAdmin = () => ({ ok: true });
sb.CacheService = { getScriptCache: () => ({ get: (k) => CACHE[k] || null, put: (k, v) => { CACHE[k] = v; }, remove: (k) => { delete CACHE[k]; } }) };
sb.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in PROPS ? PROPS[k] : null), setProperty: (k, v) => { PROPS[k] = v; }, deleteProperty: (k) => { delete PROPS[k]; } }) };
const mkFile = (bytes, mime, name) => { const id = 'F' + String(NEXT++).padStart(12, '0'); FILES[id] = { bytes, mime, name }; return { getId: () => id, setTrashed: () => TRASHED.push(id) }; };
const mkFolder = (id) => ({ getId: () => id, createFolder: (n) => mkFolder('D' + String(NEXT++).padStart(12, '0')), createFile: (blob) => mkFile(blob.getBytes(), blob.getContentType(), blob.getName()), setTrashed: () => TRASHED.push(id) });
sb.DriveApp = {
  getFoldersByName: () => ({ hasNext: () => false }), createFolder: () => mkFolder('ROOT00000000001'),
  getFolderById: (id) => { if (TRASHED.includes(id)) throw new Error('gone'); return mkFolder(id); },
  getFileById: (id) => { if (!FILES[id]) throw new Error('nf'); return { setTrashed: () => TRASHED.push(id), getBlob: () => ({ getContentType: () => FILES[id].mime, getBytes: () => FILES[id].bytes }) }; }
};
sb.Utilities = Object.assign({}, sb.Utilities, {
  newBlob: (data, mime, name) => ({ getBytes: () => data, getContentType: () => mime, getName: () => name }),
  base64Decode: (b) => Buffer.from(b, 'base64'), base64Encode: (b) => Buffer.from(b).toString('base64'),
  formatDate: (d, tz, f) => new Date(new Date(d).getTime() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, f && f.indexOf('HH') > -1 ? 16 : 10)
});

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };
const ymd = (days) => new Date(Date.now() + 9 * 3600e3 + days * 864e5).toISOString().slice(0, 10);
const fresh = () => {
  DB = { C1: { 개인코드: 'C1', 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '정희준', 신부이름: '미쿠', 예식일: ymd(40), 동의기록: JSON.stringify({ 계약정보: { weddingTime: '12:20' } }) } };
  TOK = { t1: 'C1' }; MAIL = []; CACHE = {};
};
const gi = () => (sb._prodLoad(makeRow('C1')).guideinfoDraft || {});
const saveGi = (draft) => sb.handleSaveProductionTrack({ token: 't1', track: 'guideinfo', done: true, draft });

console.log('── 친구들과 자유롭게(서버) ──');

// 1) 적은 대로 남는다 — 화이트리스트에 있다
fresh();
const r1 = saveGi({ seatMode: 'all', photo: ['양가 가족 전체'], photoFriend: '대학 동기들과 폰으로도 몇 장 부탁드려요' });
ok(r1.ok === true && gi().photoFriend === '대학 동기들과 폰으로도 몇 장 부탁드려요', '1 친구 부탁이 저장된다(화이트리스트에 있다)', { r1, gi: gi() });
ok(JSON.stringify(gi().photo) === '["양가 가족 전체"]', '1b 구도는 그대로', gi().photo);

// 2) 200자 · <> 제거 · 앞뒤 공백
fresh();
saveGi({ seatMode: 'all', photoFriend: '  <b>친구</b>' + '가'.repeat(260) + '  ' });
const f2 = gi().photoFriend || '';
ok(f2.length >= 190 && f2.length <= 200 && f2.indexOf('<') === -1 && f2.indexOf('>') === -1 && f2.indexOf('b친구/b') === 0, '2 200자로 자름(뒤이어 앞뒤 공백 걷기) · <> 지움 · 칸이 있어야 초록(비면 통과하지 않는다)', { len: f2.length, head: f2.slice(0, 12) });

// 3) 비우면 키가 없다(무변경 재저장이 가짜 재확인을 만들지 않게 — 옆 칸들과 같은 규칙)
fresh();
saveGi({ seatMode: 'all', photoFriend: '처음 부탁' });
saveGi({ seatMode: 'all', photoFriend: '   ' });
ok(!('photoFriend' in gi()), '3 비우면 키 미포함', gi());

// 4) 부부 화면에 «이 서버는 안다» 표시
fresh();
const st = sb.buildProductionState(makeRow('C1'));
ok(st && st.photoFriendOk === true, '4 buildProductionState.photoFriendOk = true(부부 화면은 이것이 있을 때만 칸을 연다)', st && st.photoFriendOk);
ok(st && st.guideinfoDraft !== undefined, '4b guideinfoDraft 도 함께 내려간다', st && Object.keys(st).filter((k) => /guide/.test(k)));

// 5) 좌석 화면 저장(부탁을 같이 실어 보냄)이 지우지 않는다 — 트랙 통째 교체
fresh();
saveGi({ seatMode: 'all', photoFriend: '친구 부탁 그대로' });
const keep = gi();
saveGi({ seatMode: 'mine', reserveTime: '', reserveName: '', photo: keep.photo || [], photoFriend: keep.photoFriend });
ok(gi().seatMode === 'mine' && gi().photoFriend === '친구 부탁 그대로', '5 좌석 공개만 바꿔도 친구 부탁이 남는다', gi());

console.log(`\n${fail ? '❌' : '✅'} photo-friend: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
