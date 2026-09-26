/**
 * Moment Edit · «고르는 스냅 기획» 서버 검증 [SNAP_PICK_V2 2026-09-26 사장님 회의] — 실서버 코드(gas-lint 샌드박스)로 구동.
 *   저장 형식 v2 정규화 · 옛 칸 보존(SNAP_LEGACY_KEEP) · 잠금(SNAP_LOCK) · 마감 뒤 알림(SNAP_LATE_MAIL) · 올린 사진(SNAP_UPLOAD) ·
 *   디렉터 확인(SNAP_CONFIRM) · 촬영 브리프(SNAP_BRIEF) · 183일 파기(SNAP_PURGE).
 * 실행: node automation/tests/snap-plan.test.js
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
const fresh = (wedDays, extra) => {
  DB = { C1: Object.assign({ 개인코드: 'C1', 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '정희준', 신부이름: '미쿠', 예식일: ymd(wedDays), 동의기록: JSON.stringify({ 계약정보: { weddingTime: '12:20' } }) }, extra || {}) };
  TOK = { t1: 'C1' }; MAIL = []; CACHE = {};
};
const load = () => sb._prodLoad(makeRow('C1'));
const img = 'data:image/jpeg;base64,' + Buffer.from('JPEGDATA-full').toString('base64');
const th = 'data:image/jpeg;base64,' + Buffer.from('JPEGDATA-th').toString('base64');
const save = (draft, done) => sb.handleSaveProductionTrack({ token: 't1', track: 'snap', done: !!done, draft });

console.log('── 고르는 스냅 기획(서버) ──');

// 1) v2 정규화 — 형식 밖 장면 번호·중복·5장째·http 아닌 링크·<> 는 걸러진다
fresh(40);
const r1 = save({ v: 2, zones: { candle: { picks: ['c05', 'c05', 'w05', 'c06', 'c07', 'c08', 'c09'], ups: [], links: ['https://a.kr/1', 'javascript:alert(1)', 'https://a.kr/1', 'http://b.kr', 'https://c.kr', 'https://d.kr'] }, white: { picks: ['w06'] } }, note: '<b>왼쪽</b> 얼굴' + 'x'.repeat(600) }, true);
const d1 = load().snapDraft;
ok(r1.ok === true, '1a v2 저장 성공', r1);
ok(JSON.stringify(d1.zones.candle.picks) === '["c05","c06","c07","c08"]', '1b 장면 번호 — 공간 형식만 · 중복 없이 · 4장까지(고른 순서 유지)', d1.zones.candle.picks);
ok(JSON.stringify(d1.zones.candle.links) === '["https://a.kr/1","http://b.kr","https://c.kr"]', '1c 링크 — http(s)만 · 중복 없이 · 3개까지', d1.zones.candle.links);
ok(d1.note.indexOf('<') === -1 && d1.note.length === 500, '1d 한 칸 — <> 제거 · 500자 상한', d1.note.length);
ok(load().tracks.snap === '완료', '1e 트랙 완료');

// 2) [SNAP_LEGACY_KEEP] 옛 칸(v1)은 v2 저장이 지우지 않는다 · 옛 화면(v1) 저장도 v2 칸을 지우지 않는다
fresh(40, { 제작_snap: JSON.stringify({ people: ['두 분 중심'], aboutNote: '왼쪽이 편해요', toneStyle: '정적 에디토리얼' }) });
save({ v: 2, zones: { candle: { picks: ['c05'] } }, note: '편지를 가져가요' }, true);
let d2 = load().snapDraft;
ok(d2.aboutNote === '왼쪽이 편해요' && d2.toneStyle === '정적 에디토리얼' && d2.zones.candle.picks[0] === 'c05', '2a v2 저장 뒤에도 옛 칸 그대로', d2);
save({ people: [], aboutNote: '오른쪽', toneStyle: '' }, true);   // 옛 탭(배포 시차)
d2 = load().snapDraft;
ok(d2.v === 2 && d2.zones.candle.picks[0] === 'c05' && d2.note === '편지를 가져가요' && d2.aboutNote === '오른쪽', '2b 옛 화면 저장이 새 기획을 지우지 않는다', d2);

// 3) [SNAP_LOCK] 예식 3일 전부터 잠금 — 저장·올리기 둘 다
fresh(3);
const r3 = save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(r3.ok === false && r3.locked === true, '3a D-3 저장 거부(locked)', r3);
TOK.t1 = 'C1';
const u3 = sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th });
ok(u3.ok === false && u3.locked === true, '3b D-3 사진 올리기 거부', u3);
fresh(4);
ok(save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true).ok === true, '3c D-4 는 열려 있다');

// 4) [SNAP_LATE_MAIL] 마감(14일 전) 뒤 «바뀌면» 관리자 메일 한 통 — 그대로 저장은 조용 · 30분 안 연속 변경은 한 통
fresh(10);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(MAIL.length === 1 && /마감/.test(MAIL[0]) && /C1/.test(MAIL[0]), '4a 마감 뒤 변경 → 메일 1통', MAIL);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(MAIL.length === 1, '4b 같은 내용 재저장 → 메일 없음');
save({ v: 2, zones: { candle: { picks: ['c05', 'c06'] } } }, true);
ok(MAIL.length === 1, '4c 30분 안 연속 변경 → 추가 메일 없음');
fresh(20);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(MAIL.length === 0, '4d 마감 전(D-20) 변경 → 메일 없음');

// 5) [SNAP_UPLOAD] 올리기 → 기록 · 이 고객 것만 기획에 실린다 · 공간마다 3장
fresh(40);
const u5 = sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th, name: 'my<ref>.jpg' });
ok(u5.ok === true && /^F/.test(u5.id) && /^F/.test(u5.th), '5a 올리기 성공 · 사진+작은 그림 두 파일', u5);
const m5 = load().snapMeta;
ok(m5 && m5.folder && m5.uploads.length === 1 && m5.uploads[0].zone === 'candle', '5b 기록 — 폴더 · 올린 목록(공간)', m5);
save({ v: 2, zones: { candle: { ups: [{ id: u5.id, th: 'FORGED000000000', n: 'my<ref>.jpg' }, { id: 'NOTMINE00000000001', th: '' }] } } }, true);
const d5 = load().snapDraft;
ok(d5.zones.candle.ups.length === 1 && d5.zones.candle.ups[0].id === u5.id && d5.zones.candle.ups[0].th === u5.th, '5c 남의 파일 id 는 버리고 · 작은 그림 id 는 서버 기록으로', d5.zones.candle.ups);
save({ v: 2, zones: { white: { ups: [{ id: u5.id, th: u5.th }] } } }, true);
ok((load().snapDraft.zones.white.ups || []).length === 0, '5d 다른 공간으로 옮겨 싣기 불가(공간이 기록과 달라야 실린다)');
fresh(40);
const ups = [1, 2, 3].map(() => sb.handleSnapRefUpload({ token: 't1', zone: 'white', data: img, thumb: th }));
save({ v: 2, zones: { white: { ups: ups.map((u) => ({ id: u.id, th: u.th })) } } }, true);
const u5e = sb.handleSnapRefUpload({ token: 't1', zone: 'white', data: img, thumb: th });
ok(ups.every((u) => u.ok) && u5e.ok === false && /3장/.test(u5e.error), '5e 공간마다 3장 — 넷째는 거부', u5e);
ok(sb.handleSnapRefUpload({ token: 't1', zone: 'roof', data: img, thumb: th }).ok === false, '5f 모르는 공간 거부');
ok(sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: 'data:text/html;base64,PGI+', thumb: th }).ok === false, '5g 사진이 아닌 파일 거부');
ok(sb.handleSnapRefUpload({ token: 'nope', zone: 'candle', data: img, thumb: th }).ok === false, '5h 세션 없으면 거부');

// 6) 작은 그림 — 이 고객 것만
const tt = sb.handleSnapThumbs({ token: 't1', ids: [ups[0].th, 'OTHER00000000001'] });
ok(tt.ok && Object.keys(tt.thumbs).length === 1 && /^data:image\/jpeg;base64,/.test(tt.thumbs[ups[0].th]), '6 작은 그림 — 이 고객이 올린 것만', Object.keys(tt.thumbs));

// 7) 정리 — 기획에서 빠지고 10분 넘은 사진은 휴지통 · 방금 올린 것은 그대로
fresh(40);
const a7 = sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th });
const b7 = sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th });
const meta7 = JSON.parse(DB.C1['제작_meta']); meta7.snapMeta.uploads[0].ts = Date.now() - 11 * 60000; DB.C1['제작_meta'] = JSON.stringify(meta7);
TRASHED = [];
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(TRASHED.includes(a7.id) && TRASHED.includes(a7.th) && !TRASHED.includes(b7.id), '7 안 쓰는 옛 사진만 휴지통(방금 올린 것은 남김)', TRASHED);

// 8) [SNAP_CONFIRM] 확인 → 부부 화면에 보임 · 고치면 stale · 다시 확인하면 풀림
fresh(40);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
const c8 = sb.adminSnapConfirm('C1', '편지 장면은 캔들존 끝에 <b>담을게요</b>');
ok(c8.ok && c8.confirm.reply.indexOf('<') === -1, '8a 확인 + 회신(<> 제거)', c8);
let st = sb.buildProductionState(makeRow('C1'));
ok(st.snapV2 === true && st.snapMeta.confirm && st.snapMeta.confirm.reply && st.snapMeta.stale === false, '8b 부부 상태에 확인·회신', st.snapMeta);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(sb.buildProductionState(makeRow('C1')).snapMeta.stale === false, '8c 그대로 저장 → 확인 유지');
save({ v: 2, zones: { candle: { picks: ['c05', 'c06'] } } }, true);
ok(sb.buildProductionState(makeRow('C1')).snapMeta.stale === true, '8d 고치면 «다시 확인 필요»');
sb.adminSnapConfirm('C1', '');
ok(sb.buildProductionState(makeRow('C1')).snapMeta.stale === false, '8e 다시 확인 → 풀림');
fresh(40);
ok(sb.adminSnapConfirm('C1', '').ok === false, '8f 남긴 것이 없으면 확인 못 함');

// 9) 부부 상태에 폴더·올린 목록·브리프 주소가 새지 않는다
fresh(40);
sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th });
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
sb.adminSnapBrief('C1');
const js9 = JSON.stringify(sb.buildProductionState(makeRow('C1')).snapMeta);
ok(!/folder|uploads|brief|ROOT|D0000/.test(js9), '9 부부 상태엔 확인·회신·잠금만', js9);

// 10) [SNAP_BRIEF] 주소 → 브리프(이름 없음) · 올린 사진은 그 기획에 실린 것만 · 새로 만들면 옛 주소 닫힘 · 촬영 7일 뒤 만료
fresh(10);
const u10 = sb.handleSnapRefUpload({ token: 't1', zone: 'white', data: img, thumb: th });
save({ v: 2, zones: { candle: { picks: ['c06', 'c05'], links: ['https://pin.it/x'] }, white: { ups: [{ id: u10.id, th: u10.th }] } }, note: '안경 반사가 신경 쓰여요' }, true);
const b10 = sb.adminSnapBrief('C1');
const tok = (b10.url || '').split('b=')[1] || '';
ok(b10.ok && /^[a-f0-9]{40}$/.test(tok) && b10.until === ymd(17), '10a 추측 불가 40자 주소 · 촬영 7일 뒤까지', b10);
const v10 = sb.handleSnapBrief({ b: tok });
ok(v10.ok && v10.arrive === '12:20' && v10.zones.candle.picks.join() === 'c06,c05' && v10.note === '안경 반사가 신경 쓰여요', '10b 브리프 — 도착 시각 · 고른 순서 · 한 칸', v10);
ok(!/정희준|미쿠|C1/.test(JSON.stringify(v10)), '10c 이름·코드가 브리프에 없다');
ok(sb.handleSnapBriefImg({ b: tok, id: u10.id }).ok === true && sb.handleSnapBriefImg({ b: tok, id: 'OTHER00000000001' }).ok === false, '10d 사진은 그 기획에 실린 것만');
ok(sb.adminSnapBrief('C1').url === b10.url, '10e 다시 누르면 같은 주소');
const b10n = sb.adminSnapBrief('C1', true);
ok(b10n.url !== b10.url && sb.handleSnapBrief({ b: tok }).ok === false && sb.handleSnapBrief({ b: b10n.url.split('b=')[1] }).ok === true, '10f 새로 만들면 옛 주소는 닫힌다');
ok(sb.handleSnapBrief({ b: 'x'.repeat(40) }).ok === false && sb.handleSnapBrief({ b: '' }).ok === false, '10g 형식 밖 주소 거부');
DB.C1.예식일 = ymd(-8);
ok(sb.handleSnapBrief({ b: b10n.url.split('b=')[1] }).expired === true, '10h 촬영 8일 뒤 → 만료');

// 11) [SNAP_PURGE] 예식 183일 뒤 — 사진 폴더·링크·메모·브리프 지움 · 고른 장면은 남김 · 드라이런은 안 지움
fresh(40);
sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th });
save({ v: 2, zones: { candle: { picks: ['c05'], links: ['https://pin.it/x'] } }, note: '메모' }, true);
const bt = sb.adminSnapBrief('C1').url.split('b=')[1];
const folder = JSON.parse(DB.C1['제작_meta']).snapMeta.folder;
DB.C1.예식일 = ymd(-184);
TRASHED = [];
const dry = sb.purgeSnapRefs();
ok(/드라이런/.test(dry) && /C1/.test(dry) && TRASHED.length === 0, '11a 드라이런 — 대상만 · 안 지움', dry);
sb.purgeSnapRefs(false);
const d11 = load();
ok(TRASHED.includes(folder) && !('SNAPBRIEF_' + bt in PROPS), '11b 폴더 휴지통 · 브리프 주소 닫힘');
ok(d11.snapDraft.zones.candle.picks[0] === 'c05' && d11.snapDraft.zones.candle.links.length === 0 && d11.snapDraft.note === '' && (d11.snapMeta.uploads || []).length === 0, '11c 고른 장면만 남고 링크·메모·올린 목록 비움', d11.snapDraft);
fresh(40); DB.C1.예식일 = ymd(-100);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
ok(!/C1/.test(sb.purgeSnapRefs()), '11d 183일 전이면 대상 아님');

// 12) 비운 기획은 «완료»에서 내려온다(v:2 숫자 때문에 비었다고 못 보던 자리)
fresh(40);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
save({ v: 2, zones: { candle: { picks: [] } } }, false);
ok(load().tracks.snap === '진행중', '12 다 지우고 저장 → 완료 해제', load().tracks);

// 13) 웨딩스냅 고객은 이 기획이 없다(D10 · 시그니처만)
fresh(40, { 상품타입: '웨딩스냅' });
ok(sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th }).ok === false && sb.buildProductionState(makeRow('C1')) === null, '13 웨딩스냅 — 올리기 거부 · 제작 상태 없음');

console.log(`\n${fail ? '❌' : '✅'} snap-plan: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
