/**
 * Moment Edit · «고르는 스냅 기획» 서버 검증 [SNAP_PICK_V2 2026-09-26 사장님 회의] — 실서버 코드(gas-lint 샌드박스)로 구동.
 *   저장 형식 v2 정규화 · 옛 칸 보존(SNAP_LEGACY_KEEP) · 잠금(SNAP_LOCK) · 마감 뒤 알림(SNAP_LATE_MAIL) · 올린 사진(SNAP_UPLOAD) ·
 *   디렉터 확인(SNAP_CONFIRM) · 촬영 브리프(SNAP_BRIEF) · 183일 파기(SNAP_PURGE).
 * 실행: node automation/tests/snap-plan.test.js
 */
import fs from 'node:fs';
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
const FROM = sb.SNAP_V2.from;   // [SNAP_V2_FROM] 처리방침 시행일 — 1~13 은 «시행일이 지난 세상»에서 잰다(14 에서 시행일 전을 따로 잰다)
sb.SNAP_V2.from = ymd(-1);
const fresh = (wedDays, extra) => {
  DB = { C1: Object.assign({ 개인코드: 'C1', 상품타입: '시그니처', 현재단계: '제작중', 신랑이름: '정희준', 신부이름: '미쿠', 예식일: ymd(wedDays), 동의기록: JSON.stringify({ 계약정보: { weddingTime: '12:20' } }) }, extra || {}) };
  TOK = { t1: 'C1' }; MAIL = []; CACHE = {};
};
const load = () => sb._prodLoad(makeRow('C1'));
const img = 'data:image/jpeg;base64,' + Buffer.from('JPEGDATA-full').toString('base64');
const th = 'data:image/jpeg;base64,' + Buffer.from('JPEGDATA-th').toString('base64');
// [SNAP_CONSENT] 1~14 는 «동의하고 시작한 부부»로 잰다(부부 화면이 첫 저장 · 첫 올리기에 snapConsent 를 싣는다) — 동의가 없을 때는 15 에서 따로 잰다
const save = (draft, done) => sb.handleSaveProductionTrack({ token: 't1', track: 'snap', done: !!done, draft, snapConsent: 1 });
const upl = (o) => sb.handleSnapRefUpload(Object.assign({ snapConsent: 1 }, o));

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
const u3 = upl({ token: 't1', zone: 'candle', data: img, thumb: th });
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
const u5 = upl({ token: 't1', zone: 'candle', data: img, thumb: th, name: 'my<ref>.jpg' });
ok(u5.ok === true && /^F/.test(u5.id) && /^F/.test(u5.th), '5a 올리기 성공 · 사진+작은 그림 두 파일', u5);
const m5 = load().snapMeta;
ok(m5 && m5.folder && m5.uploads.length === 1 && m5.uploads[0].zone === 'candle', '5b 기록 — 폴더 · 올린 목록(공간)', m5);
save({ v: 2, zones: { candle: { ups: [{ id: u5.id, th: 'FORGED000000000', n: 'my<ref>.jpg' }, { id: 'NOTMINE00000000001', th: '' }] } } }, true);
const d5 = load().snapDraft;
ok(d5.zones.candle.ups.length === 1 && d5.zones.candle.ups[0].id === u5.id && d5.zones.candle.ups[0].th === u5.th, '5c 남의 파일 id 는 버리고 · 작은 그림 id 는 서버 기록으로', d5.zones.candle.ups);
save({ v: 2, zones: { white: { ups: [{ id: u5.id, th: u5.th }] } } }, true);
ok((load().snapDraft.zones.white.ups || []).length === 0, '5d 다른 공간으로 옮겨 싣기 불가(공간이 기록과 달라야 실린다)');
fresh(40);
const ups = [1, 2, 3].map(() => upl({ token: 't1', zone: 'white', data: img, thumb: th }));
save({ v: 2, zones: { white: { ups: ups.map((u) => ({ id: u.id, th: u.th })) } } }, true);
const u5e = upl({ token: 't1', zone: 'white', data: img, thumb: th });
ok(ups.every((u) => u.ok) && u5e.ok === false && /3장/.test(u5e.error), '5e 공간마다 3장 — 넷째는 거부', u5e);
ok(upl({ token: 't1', zone: 'roof', data: img, thumb: th }).ok === false, '5f 모르는 공간 거부');
ok(upl({ token: 't1', zone: 'candle', data: 'data:text/html;base64,PGI+', thumb: th }).ok === false, '5g 사진이 아닌 파일 거부');
ok(upl({ token: 'nope', zone: 'candle', data: img, thumb: th }).ok === false, '5h 세션 없으면 거부');

// 6) 작은 그림 — 이 고객 것만
const tt = sb.handleSnapThumbs({ token: 't1', ids: [ups[0].th, 'OTHER00000000001'] });
ok(tt.ok && Object.keys(tt.thumbs).length === 1 && /^data:image\/jpeg;base64,/.test(tt.thumbs[ups[0].th]), '6 작은 그림 — 이 고객이 올린 것만', Object.keys(tt.thumbs));

// 7) 정리 — 기획에서 빠지고 10분 넘은 사진은 휴지통 · 방금 올린 것은 그대로
fresh(40);
const a7 = upl({ token: 't1', zone: 'candle', data: img, thumb: th });
const b7 = upl({ token: 't1', zone: 'candle', data: img, thumb: th });
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
upl({ token: 't1', zone: 'candle', data: img, thumb: th });
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);
sb.adminSnapBrief('C1');
const js9 = JSON.stringify(sb.buildProductionState(makeRow('C1')).snapMeta);
ok(!/folder|uploads|brief|ROOT|D0000/.test(js9), '9 부부 상태엔 확인·회신·잠금만', js9);

// 10) [SNAP_BRIEF] 주소 → 브리프(이름 없음) · 올린 사진은 그 기획에 실린 것만 · 새로 만들면 옛 주소 닫힘 · 촬영 7일 뒤 만료
fresh(10);
const u10 = upl({ token: 't1', zone: 'white', data: img, thumb: th });
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
upl({ token: 't1', zone: 'candle', data: img, thumb: th });
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
ok(upl({ token: 't1', zone: 'candle', data: img, thumb: th }).ok === false && sb.buildProductionState(makeRow('C1')) === null, '13 웨딩스냅 — 올리기 거부 · 제작 상태 없음');

// 14) [SNAP_V2_FROM] 처리방침 시행일 전에는 새 기획이 닫혀 있다 — 참고 사진 수집·작가 위탁이 공고한 날보다 먼저 시작되지 않게
const PRIV = fs.readFileSync(new URL('../../privacy.html', import.meta.url), 'utf8'), PVD = (PRIV.match(/개정 시행일자 · (\d{4})\.(\d{2})\.(\d{2})/) || []).slice(1).join('-');
ok(!!PVD && FROM === PVD, '14a 여는 날(SNAP_V2.from) = 처리방침 «개정 시행일자» [SNAP_OPEN_NOW]', { FROM, PVD });
fresh(40);
save({ v: 2, zones: { candle: { picks: ['c05'] } } }, true);                     // 시행일이 지난 세상에서 하나 저장해 둔다
const pre = sb.adminSnapBrief('C1'); ok(!!(pre && pre.ok && pre.url), '14b 시행일이 지났으면 브리프를 만든다', pre);
sb.SNAP_V2.from = ymd(1);                                                         // 내일부터 연다 = 오늘은 시행일 전
ok(sb.buildProductionState(makeRow('C1')).snapV2 === false, '14c 시행일 전 — 부부 화면에 snapV2 false(카드·«지금 할 일»이 숨는다)');
const n14 = save({ v: 2, zones: { candle: { picks: ['c06'] } } }, true);
ok(n14.ok === false && /10월 3일|월 .*일부터/.test(n14.error || '') && JSON.stringify(load().snapDraft.zones.candle.picks) === '["c05"]', '14d 시행일 전 — 새 기획 저장 거절 · 저장분 그대로', { n14, picks: load().snapDraft.zones.candle.picks });
const f14 = Object.keys(FILES).length, u14 = upl({ token: 't1', zone: 'candle', data: img, thumb: th });
ok(u14.ok === false && Object.keys(FILES).length === f14, '14e 시행일 전 — 참고 사진 올리기 거절 · 드라이브에 아무것도 안 생김', { u14, before: f14, after: Object.keys(FILES).length });
const b14 = sb.adminSnapBrief('C1', true);
ok(b14.ok === false && /시행일/.test(b14.error || ''), '14f 시행일 전 — 촬영 브리프 만들기 거절(사진작가 위탁이 그날부터)', b14);
const v1 = save({ aboutNote: '옛 탭에서 온 메모' }, false);
ok(v1.ok === true, '14g 시행일 전에도 옛 칸 저장(배포 시차로 남은 탭)은 종전대로 받는다', v1);
sb.SNAP_V2.from = ymd(0);                                                         // 오늘부터 = 오늘 연다(경계)
ok(sb.buildProductionState(makeRow('C1')).snapV2 === true, '14h 시행일 당일(한국 날짜) 0시부터 열린다');
sb.SNAP_V2.from = ymd(-1);

// 15) [SNAP_CONSENT] 동의 — 모으는 그 자리에서 따로 받는다(사장님 · 코워크 명세 ①)
const raw = (draft, extra) => sb.handleSaveProductionTrack(Object.assign({ token: 't1', track: 'snap', done: true, draft }, extra || {}));
fresh(40);
const n15 = raw({ v: 2, zones: { candle: { picks: ['c05'] } } });
ok(n15.ok === false && n15.consent === false && /동의가 필요/.test(n15.error || '') && !load().snapDraft, '15a 동의 없이 새 기획 저장 → 거절 · 아무것도 안 남는다', n15);
const f15 = Object.keys(FILES).length, nu15 = sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th });
ok(nu15.ok === false && nu15.consent === false && Object.keys(FILES).length === f15, '15b 동의 없이 사진 올리기 → 거절 · 드라이브에 아무것도 안 생김', nu15);
ok(raw({ people: ['두 분 중심'] }).ok === true, '15c 옛 칸 저장(배포 시차로 남은 탭)은 종전대로');
fresh(40);
const y15 = raw({ v: 2, zones: { candle: { picks: ['c05'] } } }, { snapConsent: 1 }), c15 = (load().snapMeta || {}).consent || {};
ok(y15.ok === true && /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}$/.test(c15.at || '') && c15.ver === sb.SNAP_V2.from, '15d 동의와 함께 첫 저장 → 기록 {한국 시각 · 그때의 처리방침 시행일}', c15);
const e15 = raw({ v: 2, zones: { candle: { picks: ['c05', 'c06'] } } });
ok(e15.ok === true && load().snapMeta.consent.at === c15.at, '15e 한 번 동의하면 다음 저장은 동의 없이 · 처음 기록 그대로', e15);
const st15 = sb.buildProductionState(makeRow('C1')).snapMeta;
ok(!!(st15.consent && st15.consent.at === c15.at) && st15.withdrawn === null, '15f 부부 화면에 동의 기록이 간다(다시 묻지 않게)', st15);
fresh(40);
const fu15 = sb.handleSnapRefUpload({ token: 't1', zone: 'candle', data: img, thumb: th, snapConsent: 1 });
ok(fu15.ok === true && !!(load().snapMeta.consent || {}).at, '15g 첫 올리기가 첫 저장보다 먼저여도 — 그 올리기의 동의로 기록', load().snapMeta);
raw({ v: 2, zones: { candle: { picks: ['c05'], ups: [{ id: fu15.id }], links: ['https://a.kr/x'] } }, note: '왼쪽이 편해요' });
const bt15 = sb.adminSnapBrief('C1').url.split('b=')[1], fold15 = load().snapMeta.folder;
TRASHED = []; MAIL = [];
const w15 = sb.handleSnapWithdraw({ token: 't1' }), L15 = load();
ok(w15.ok === true && JSON.stringify(L15.snapDraft) === '{}' && L15.tracks.snap === '시작전', '15h 지우기 → 기획이 비고 카드는 «시작전»', { w15, sd: L15.snapDraft, t: L15.tracks });
ok(!L15.snapMeta.consent && !!L15.snapMeta.withdrawn && L15.snapMeta.withdrawn.by === '두 분' && !L15.snapMeta.uploads && !L15.snapMeta.folder && !L15.snapMeta.brief, '15i 동의 기록 · 올린 목록 · 폴더 · 브리프를 지우고 지운 때만 남긴다', L15.snapMeta);
ok(TRASHED.includes(fold15) && TRASHED.includes(fu15.id) && TRASHED.includes(fu15.th) && !(('SNAPBRIEF_' + bt15) in PROPS) && sb.handleSnapBrief({ b: bt15 }).ok === false, '15j 올린 사진은 휴지통 · 브리프 주소는 닫힌다', TRASHED);
ok(MAIL.length === 1 && /지웠어요/.test(MAIL[0]) && /C1/.test(MAIL[0]), '15k 디렉터에게 메일 한 통(사진작가에게 이미 보냈다면 알리게)', MAIL);
const st15b = sb.buildProductionState(makeRow('C1')).snapMeta;
ok(st15b.consent === null && !!(st15b.withdrawn && st15b.withdrawn.at), '15l 부부 화면 — 동의가 없으니 다시 체크부터', st15b);
ok(raw({ v: 2, zones: { candle: { picks: ['c05'] } } }).ok === false, '15m 지운 뒤 동의 없이 저장 → 거절(다른 탭에 남은 화면)');
ok(raw({ v: 2, zones: { candle: { picks: ['c05'] } } }, { snapConsent: 1 }).ok === true && !load().snapMeta.withdrawn && !!load().snapMeta.consent, '15n 다시 동의하면 다시 시작(지운 기록은 걷힌다)');
fresh(2, { 제작_snap: JSON.stringify({ v: 2, zones: { candle: { picks: ['c05'], ups: [], links: [] } }, note: '메모' }), 제작_meta: JSON.stringify({ tracks: { snap: '완료' }, snapMeta: { consent: { at: '2026-09-26 10:00', ver: '2026-09-26' } } }) });
MAIL = [];
const w15o = sb.handleSnapWithdraw({ token: 't1' });
ok(w15o.ok === true && JSON.stringify(load().snapDraft) === '{}', '15o 잠긴 뒤(D-2)에도 거둘 수 있다 — 고치기가 아니라 동의를 거두는 것', w15o);
fresh(40, { 제작_snap: JSON.stringify({ v: 2, zones: { candle: { picks: ['c05'], ups: [], links: [] } }, note: '' }), 제작_meta: JSON.stringify({ tracks: { snap: '완료' }, snapMeta: { consent: { at: '2026-09-26 10:00', ver: '2026-09-26' } } }) });
MAIL = [];
const a15 = sb.adminSnapWithdraw('C1');
ok(a15.ok === true && load().snapMeta.withdrawn.by === '디렉터' && MAIL.length === 0, '15p 디렉터 «기획 지우기» — 같은 길 · 누가 지웠는지 남긴다(자기에게 메일은 안 보낸다)', { a15, m: load().snapMeta, MAIL });
fresh(40, { 제작_snap: JSON.stringify({ v: 2, zones: { candle: { picks: ['c05'], ups: [], links: ['https://a.kr/1'] } }, note: '비밀 메모' }) });
const bq = sb.adminSnapBrief('C1'), bv = sb.handleSnapBrief({ b: (bq.url || '').split('b=')[1] });
ok(bv.ok === true && bv.consent === false && bv.zones.candle.picks.length === 0 && bv.zones.candle.links.length === 0 && bv.note === '' && !!bv.wed, '15q 동의가 없으면 브리프에 기획이 안 실린다(예식 일시 · 기본 장면만)', bv);

// 16) [SNAP_ZONE_NOTE 2026-09-26 사장님] 공간별 «사진작가에게 전할 말» — 정규화 · 완료 · 부부 화면 표시 · 브리프(동의 있을 때만) · 옛 저장분 재저장은 조용 · 파기
fresh(40);
const r16 = save({ v: 2, zones: { candle: { picks: [], note: '<b>눈</b>을 맞추는 ' + 'x'.repeat(400) }, white: { note: '   ' } } }, true);
const d16 = load().snapDraft;
ok(r16.ok === true && d16.zones.candle.note.indexOf('<') === -1 && d16.zones.candle.note.length === sb.SNAP_ZONE_NOTE_MAX && !('note' in d16.zones.white), '16a 전할 말 — <> 제거 · 상한 · 빈 칸(공백만)은 키 없이', d16.zones);
ok(load().tracks.snap === '완료' && sb._snapFilled({ v: 2, zones: { white: { note: '뒷모습' } } }) === true, '16b 전할 말만 남겨도 «남긴 것»(완료)');
ok(sb.buildProductionState(makeRow('C1')).snapZoneNoteOk === true, '16c 부부 화면 표시 snapZoneNoteOk — 이 칸을 아는 서버(옛 서버는 표시가 없어 칸이 안 열린다)');
const b16 = sb.handleSnapBrief({ b: sb.adminSnapBrief('C1').url.split('b=')[1] });
ok(b16.ok === true && b16.zones.candle.note === d16.zones.candle.note && b16.zones.white.note === '', '16d 브리프에 공간별 전할 말(동의 있음)', b16.zones);
fresh(40, { 제작_snap: JSON.stringify({ v: 2, zones: { candle: { picks: ['c05'], ups: [], links: [], note: '비밀 부탁' } }, note: '' }) });
const b16n = sb.handleSnapBrief({ b: (sb.adminSnapBrief('C1').url || '').split('b=')[1] });
ok(b16n.ok === true && b16n.consent === false && b16n.zones.candle.note === '', '16e 동의가 없으면 전할 말도 브리프에 안 실린다', b16n.zones);
fresh(10, { 제작_snap: JSON.stringify({ v: 2, zones: { candle: { picks: ['c05'], ups: [], links: [] }, white: { picks: [], ups: [], links: [] } }, note: '' }), 제작_meta: JSON.stringify({ tracks: { snap: '완료' }, snapMeta: { consent: { at: '2026-09-26 10:00', ver: '2026-09-26' }, confirm: { at: '2026-09-26 11:00', reply: '' } } }) });
MAIL = [];
const s16 = save({ v: 2, zones: { candle: { picks: ['c05'], note: '' }, white: { note: '' } }, note: '' }, true);
ok(s16.ok === true && !load().snapMeta.stale && MAIL.length === 0, '16f 옛 저장분(칸 없음)을 빈 전할 말과 함께 다시 저장 → 바뀜 아님(디렉터 확인 유지 · 마감 뒤 메일 없음)', { s16, m: load().snapMeta, MAIL });
save({ v: 2, zones: { candle: { picks: ['c05'], note: '촛불 앞에서 한 장 더' } } }, true);
ok(load().snapMeta.stale === true && MAIL.length === 1, '16g 전할 말을 고치면 바뀜 — 디렉터 다시 확인 · 마감 뒤면 메일 한 통', { m: load().snapMeta, MAIL });
fresh(40);
save({ v: 2, zones: { candle: { picks: ['c05'], note: '부탁' } } }, true);
DB.C1.예식일 = ymd(-184);
ok(/C1/.test(sb.purgeSnapRefs()), '16h 전할 말만 남아도 파기 대상(처리방침 «메모 6개월 이내 파기»)');
sb.purgeSnapRefs(false);
ok(!('note' in load().snapDraft.zones.candle) && load().snapDraft.zones.candle.picks[0] === 'c05', '16i 파기 — 전할 말 지움 · 고른 장면은 남김', load().snapDraft);

console.log(`\n${fail ? '❌' : '✅'} snap-plan: ${pass} 통과 · ${fail} 실패`);
process.exit(fail ? 1 : 0);
