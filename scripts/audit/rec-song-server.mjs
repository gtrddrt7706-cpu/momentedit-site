#!/usr/bin/env node
/* ★★[REC_SONG_1012 2026-10-12 사장님 «추천대로»(추천 곡 1번 · 드라이브에 곡을 두고 로그인한 고객에게만)] 서버 길 점검 — 80_production.gs 를 그대로 불러
   드라이브 · 캐시 · 스크립트 속성 · 로그인만 흉내 낸다(실제 함수를 부른다 · 코드 읽기가 아니다).
   1 폴더가 없으면 목록 = L3 «아직 준비하지 못했어요»
   2 같은 이름 폴더가 둘이면 songs.json 이 든 쪽 · 목록은 키 · 자리가 맞는 곡만 · 찾은 폴더 id 를 REC_FID 에 적는다
   3 곡 받기 = 그 곡 파일 base64 · mime · 목록에 없는 키 = L3 · 이상한 키(경로 · 긴 글) = 거절
   4 로그인이 풀렸으면 reason 그대로(두 분 목소리 받기와 같은 길)
   5 두 분 쪽 곡 받기는 한 시간 60번까지 — 61번째 = L1 · 콘솔(adminRitualFileGet 'rec:')은 상한 없음 · 셈도 안 늘린다
   6 목록은 캐시(REC_MF) — 두 번째 목록 요청은 드라이브를 다시 읽지 않는다
   7 적어 둔 폴더가 휴지통으로 가면 다음 요청이 다시 찾는다
   8 key 가 'rec' 가 아니면 종전 두 분 목소리 받기 그대로(추천 곡 폴더를 보지 않는다)
   종료 코드 0 통과 · 1 실패 */
import { loadGas } from './gas-lint.mjs';

let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const { sandbox: G, errors } = loadGas();
if (errors.length) { console.log('FAIL GAS 로드 — ' + errors[0].file + ': ' + errors[0].message); process.exit(1); }

/* ── 흉내: 드라이브 ── */
let reads = 0;
const mkFile = (name, bytes, at, mime) => ({ name, bytes: Buffer.from(bytes), at, mime: mime || 'audio/mpeg', trashed: false,
  getName() { return this.name; }, isTrashed() { return this.trashed; }, getLastUpdated() { return new Date(this.at); }, getId() { return 'F_' + this.name; },
  getBlob() { const f = this; reads++; return { getBytes: () => [...f.bytes], getContentType: () => f.mime, getDataAsString: () => f.bytes.toString('utf8') }; } });
const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
const mkFolder = (id, files) => ({ id, files, trashed: false, getId() { return this.id; }, isTrashed() { return this.trashed; },
  getFilesByName(n) { return iter(this.files.filter((f) => f.name === n)); } });
let FOLDERS = [];
G.DriveApp = { getFoldersByName: (n) => iter(n === 'ME_추천곡' ? FOLDERS : []),
  getFolderById: (id) => { const f = FOLDERS.find((x) => x.id === id); if (!f) throw new Error('not found'); return f; } };
/* ── 흉내: 스크립트 속성 · 캐시 ── */
let PROPS = {}; G.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in PROPS ? PROPS[k] : null), setProperty: (k, v) => { PROPS[k] = String(v); }, deleteProperty: (k) => { delete PROPS[k]; }, getProperties: () => ({ ...PROPS }) }) };
let CACHE = {}; G.CacheService = { getScriptCache: () => ({ get: (k) => (k in CACHE ? CACHE[k] : null), put: (k, v) => { CACHE[k] = String(v); }, remove: (k) => { delete CACHE[k]; } }) };
G.Utilities = Object.assign({}, G.Utilities, { base64Encode: (b) => Buffer.from(b).toString('base64') });
/* ── 흉내: 로그인 ── */
G.resolveSession = (t) => (t === 'T0K' ? { ok: true, row: { get: (h) => (h === '개인코드' ? 'ME0001' : '') } } : { ok: false, reason: 'expired' });
G._sessionMsg = () => '로그인이 풀렸어요';
G._requireAdmin = () => {};
let RF_CALLS = 0; const _rfIn = G._rfFileIn; G._rfFileIn = function () { RF_CALLS++; return null; };

const SONGS = { v: 1, songs: [
  { k: 'r1', t: 'Popcorn', a: '도경수', hook: 38.05, len: 181.3, file: 'r1.mp3', ly: [[38.1, 'line', '줄']] },
  { k: 'r9', t: 'Reality', a: '라붐 OST', hook: 39.51, len: 280.3, file: 'r9.mp3' },
  { k: '../x', t: 'bad', hook: 10 },          // 키가 이상하다 — 목록에서 빠진다
  { k: 'r0', t: 'no hook' } ] };               // 자리가 없다 — 목록에서 빠진다
const manifest = (at) => mkFile('songs.json', JSON.stringify(SONGS), at, 'application/json');
const get = (id, tok) => G.handleRitualFileGet({ token: tok || 'T0K', key: 'rec', id });

try {
  // 1
  { FOLDERS = []; PROPS = {}; CACHE = {};
    const r = get('list'); ok('1 폴더가 없으면 목록 = L3 «아직 준비하지 못했어요»', r && r.ok === false && r.ecode === 'L3', r); }
  // 2
  { const decoy = mkFolder('FD_DECOY', [mkFile('r1.mp3', 'decoy', 2e12)]), real = mkFolder('FD_REAL', [manifest(1e12), mkFile('r1.mp3', 'ID3-r1-bytes', 1e12), mkFile('r9.mp3', 'ID3-r9', 1e12)]);
    FOLDERS = [decoy, real]; PROPS = {}; CACHE = {};
    const r = get('list');
    ok('2 songs.json 이 든 폴더 · 목록은 키 · 자리가 맞는 곡만(r1 · r9) · REC_FID 적음', r && r.ok && r.key === 'rec' && r.id === 'list' && r.songs.map((s) => s.k).join(',') === 'r1,r9' && PROPS.REC_FID === 'FD_REAL', { r: r && { ok: r.ok, ks: r.songs && r.songs.map((s) => s.k) }, fid: PROPS.REC_FID }); }
  // 3
  { const r = get('r1'); ok('3a 곡 받기 = 그 곡 파일 base64 · mime', r && r.ok && r.id === 'r1' && r.mime === 'audio/mpeg' && Buffer.from(r.data, 'base64').toString() === 'ID3-r1-bytes', r && { ok: r.ok, id: r.id, mime: r.mime });
    const r2 = get('r7'); ok('3b 목록에 없는 키 = L3', r2 && r2.ok === false && r2.ecode === 'L3', r2);
    const r3 = get('../songs.json'); const r4 = get('x'.repeat(40)); ok('3c 이상한 키(경로 · 긴 글) = 거절', r3.ok === false && r4.ok === false && !r3.data && !r4.data, { r3, r4 }); }
  // 4
  { const r = get('list', 'BAD'); ok('4 로그인이 풀렸으면 reason 그대로', r && r.ok === false && r.reason === 'expired' && !r.songs, r); }
  // 5
  { CACHE = {}; let last = null, okN = 0; for (let i = 0; i < 61; i++) { last = get('r9'); if (last.ok) okN++; }
    ok('5a 두 분 쪽 곡 받기는 한 시간 60번 — 61번째 = L1', okN === 60 && last.ok === false && last.ecode === 'L1', { okN, last });
    const before = CACHE.RECQ_ME0001, a = G.adminRitualFileGet('ME0001', 'rec:r9');
    ok('5b 콘솔(adminRitualFileGet rec:) 은 상한 없음 · 셈도 그대로', a && a.ok && a.key === 'rec' && Buffer.from(a.data, 'base64').toString() === 'ID3-r9' && CACHE.RECQ_ME0001 === before, { a: a && { ok: a.ok, key: a.key }, before, after: CACHE.RECQ_ME0001 }); }
  // 6
  { CACHE = {}; reads = 0; get('list'); const r1 = reads; get('list'); ok('6 목록은 캐시 — 두 번째는 드라이브를 다시 읽지 않는다', r1 === 1 && reads === 1, { r1, reads }); }
  // 7
  { const again = mkFolder('FD_AGAIN', [manifest(3e12), mkFile('r1.mp3', 'again', 3e12)]); FOLDERS.find((f) => f.id === 'FD_REAL').trashed = true; FOLDERS.push(again); CACHE = {};
    const r = get('r1'); ok('7 적어 둔 폴더가 휴지통이면 다시 찾는다', r && r.ok && Buffer.from(r.data, 'base64').toString() === 'again' && PROPS.REC_FID === 'FD_AGAIN', { r: r && r.ok, fid: PROPS.REC_FID }); }
  // 8
  { RF_CALLS = 0; reads = 0; const r = G.handleRitualFileGet({ token: 'T0K', key: 'entry', id: 'F_SOMEFILE123' });
    ok('8 key 가 rec 가 아니면 종전 길(두 분 폴더 · 추천 곡 폴더를 안 본다)', RF_CALLS === 1 && reads === 0 && r && r.ok === false, { RF_CALLS, reads, r }); }
} catch (e) { ok('잴 수 없었다 — ' + (e && e.stack || e).split('\n').slice(0, 3).join(' | '), false); }
G._rfFileIn = _rfIn;
console.log(fail ? `rec-song-server: FAIL ${fail}` : 'rec-song-server: ok');
process.exit(fail ? 1 : 0);
