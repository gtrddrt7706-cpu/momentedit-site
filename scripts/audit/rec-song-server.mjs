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
   ★[REC_PUT_1013 2026-10-13 사장님 «드라이브 너가 저장 따로 해»] 서버가 곡 파일을 직접 받는다(ritualFile · key 'rec')
   9a 이름만 오면 «없다(need)» · 폴더가 없으면 만든다 9b 표에 없는 이름 = 거절 9c 지문(SHA-256)이 다르면 거절 · 아무것도 안 쓴다
   9d 지문이 같으면 저장 · 설명 칸에 지문 9e 다시 오면 «있다(same)» · 받은 내용을 풀지 않는다 9f songs.json 이 들어가면 목록이 열린다(REC_FID · 캐시 비움)
   9g 지문 없는 같은 이름 파일(손으로 올린 것)은 새 파일로 바꾸고 옛것은 휴지통 9h 한 시간 120번 넘으면 U1 9i key 가 rec 가 아니면 종전대로 로그인을 본다
   ★[REC_CLIP_1013 2026-10-13 사장님 «기다림 완전 짧게»] 미리 듣기용 짧은 판 — 표는 17개(곡 8 · 짧은 판 8 · 목록) · 곡마다 짧은 판이 짝으로 있다
   10a '<키>-p' = 목록 pf 파일(짧은 판) 10b 목록에 pf 가 없으면(옛 목록) L3 — 화면이 곡 전체로 10c 짧은 판도 한 시간 60번 셈에 든다
   10d 콘솔(rec:<키>)은 종전대로 곡 전체 10e 이상한 꼬리(-px · -p 만) = 찾지 않는다
   종료 코드 0 통과 · 1 실패 */
import { loadGas } from './gas-lint.mjs';
import { createHash } from 'node:crypto';

let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const { sandbox: G, errors } = loadGas();
if (errors.length) { console.log('FAIL GAS 로드 — ' + errors[0].file + ': ' + errors[0].message); process.exit(1); }

/* ── 흉내: 드라이브 ── */
let reads = 0;
let NID = 0;
const mkFile = (name, bytes, at, mime, id) => ({ name, bytes: Buffer.from(bytes), at, mime: mime || 'audio/mpeg', trashed: false, desc: '', id: id || ('F_' + name),
  getName() { return this.name; }, isTrashed() { return this.trashed; }, getLastUpdated() { return new Date(this.at); }, getId() { return this.id; },
  getDescription() { return this.desc; }, setDescription(d) { this.desc = String(d); return this; }, setTrashed(t) { this.trashed = !!t; return this; },
  getBlob() { const f = this; reads++; return { getBytes: () => [...f.bytes], getContentType: () => f.mime, getDataAsString: () => f.bytes.toString('utf8') }; } });
const iter = (arr) => { let i = 0; return { hasNext: () => i < arr.length, next: () => arr[i++] }; };
const mkFolder = (id, files) => ({ id, files, trashed: false, getId() { return this.id; }, isTrashed() { return this.trashed; },
  getFilesByName(n) { return iter(this.files.filter((f) => f.name === n)); },
  createFile(b) { const f = mkFile(b.name, b.bytes, Date.now(), b.mime, 'N_' + (++NID)); this.files.push(f); return f; } });
let FOLDERS = [];
G.DriveApp = { getFoldersByName: (n) => iter(n === 'ME_추천곡' ? FOLDERS : []),
  getFolderById: (id) => { const f = FOLDERS.find((x) => x.id === id); if (!f) throw new Error('not found'); return f; },
  createFolder: (n) => { const f = mkFolder('FD_NEW' + (++NID), []); f.name = n; FOLDERS.push(f); return f; } };
/* ── 흉내: 스크립트 속성 · 캐시 ── */
let PROPS = {}; G.PropertiesService = { getScriptProperties: () => ({ getProperty: (k) => (k in PROPS ? PROPS[k] : null), setProperty: (k, v) => { PROPS[k] = String(v); }, deleteProperty: (k) => { delete PROPS[k]; }, getProperties: () => ({ ...PROPS }) }) };
let CACHE = {}; G.CacheService = { getScriptCache: () => ({ get: (k) => (k in CACHE ? CACHE[k] : null), put: (k, v) => { CACHE[k] = String(v); }, remove: (k) => { delete CACHE[k]; } }) };
let DECODES = 0; const signed = (buf) => [...buf].map((x) => (x > 127 ? x - 256 : x));   // GAS 의 byte[] 는 -128 ~ 127
G.Utilities = Object.assign({}, G.Utilities, { base64Encode: (b) => Buffer.from(b.map ? b.map((x) => (x + 256) % 256) : b).toString('base64'),
  base64Decode: (s) => { DECODES++; return signed(Buffer.from(String(s), 'base64')); },
  DigestAlgorithm: { SHA_256: 'SHA_256' }, computeDigest: (a, b) => signed(createHash('sha256').update(Buffer.from(b.map((x) => (x + 256) % 256))).digest()),
  newBlob: (bytes, mime, name) => ({ bytes: Buffer.from(bytes.map((x) => (x + 256) % 256)), mime, name }) });
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
  // 9 [REC_PUT_1013] 서버가 곡 파일을 직접 받는다
  { const sha = (x) => createHash('sha256').update(Buffer.from(x)).digest('hex'), b64 = (x) => Buffer.from(x).toString('base64');
    const real = Object.assign({}, G.REC_PUT_HASH), SJ = JSON.stringify(SONGS);
    const nm = Object.keys(real), songs8 = nm.filter((n) => /^r\d\.mp3$/.test(n)), clips8 = nm.filter((n) => /^r\dp\.mp3$/.test(n));
    ok('9 · 진짜 표는 파일 17개(곡 8 + 짧은 판 8 [REC_CLIP_1013] + songs.json) · 곡마다 짧은 판이 짝 · 지문은 64자리', nm.length === 17 && songs8.length === 8 && clips8.length === 8 && songs8.every((n) => real[n.replace('.mp3', 'p.mp3')]) && real['songs.json'] && Object.values(real).every((h) => /^[0-9a-f]{64}$/.test(h)) && new Set(Object.values(real)).size === 17, nm);
    G.REC_PUT_HASH = { 'r1.mp3': sha('ID3-put-r1'), 'r9.mp3': sha('ID3-put-r9'), 'songs.json': sha(SJ) };
    FOLDERS = []; PROPS = {}; CACHE = {};
    const put = (name, data) => G.handleRitualFile(Object.assign({ key: 'rec', name }, data === undefined ? {} : { data }));
    const a = put('r1.mp3'); const fo = FOLDERS[0];
    ok('9a 이름만 오면 need · 폴더가 없으면 만든다(ME_추천곡) · REC_PUT_FID', a && a.ok === true && a.need === true && FOLDERS.length === 1 && fo.name === 'ME_추천곡' && PROPS.REC_PUT_FID === fo.id, { a, n: FOLDERS.length, fid: PROPS.REC_PUT_FID });
    const b1 = put('x.mp3', b64('ID3-put-r1')), b2 = put('../songs.json', b64(SJ)), b3 = put('', b64('x')), b4 = put('x.mp3'), b5 = put('toString');
    ok('9b 표에 없는 이름 = 거절(이름만 물어도)', [b1, b2, b3, b4, b5].every((r) => r && r.ok === false && !r.need) && fo.files.length === 0, { b1, b2, b3, b4, b5 });
    const c = put('r1.mp3', b64('ID3-evil'));
    ok('9c 지문이 다르면 거절 · 아무것도 안 쓴다', c && c.ok === false && fo.files.length === 0, { c, files: fo.files.length });
    DECODES = 0; const d = put('r1.mp3', b64('ID3-put-r1')), f1 = fo.files.find((f) => f.name === 'r1.mp3' && !f.trashed);
    ok('9d 지문이 같으면 저장 · 설명 칸에 지문 · mp3', d && d.ok && d.put && f1 && f1.desc === G.REC_PUT_HASH['r1.mp3'] && f1.mime === 'audio/mpeg' && f1.bytes.toString() === 'ID3-put-r1' && DECODES === 1, { d, f1: f1 && { desc: f1.desc, mime: f1.mime } });
    DECODES = 0; const e1 = put('r1.mp3'), e2 = put('r1.mp3', b64('ID3-put-r1'));
    ok('9e 다시 오면 same · 받은 내용을 풀지 않는다', e1 && e1.same === true && e2 && e2.same === true && DECODES === 0 && fo.files.filter((f) => f.name === 'r1.mp3').length === 1, { e1, e2, DECODES });
    put('r9.mp3', b64('ID3-put-r9'));
    const lst0 = get('list');
    ok('9f-1 songs.json 이 오기 전에는 목록이 없다(L3)', lst0 && lst0.ok === false && lst0.ecode === 'L3', lst0);
    CACHE.REC_MF = JSON.stringify({ v: 1, songs: [{ k: 'old', hook: 1 }] });
    const f = put('songs.json', b64(SJ)), lst = get('list'), song = get('r1');
    const mf = fo.files.find((x) => x.name === 'songs.json' && !x.trashed);
    ok('9f-2 songs.json 이 들어가면 목록이 열린다 · REC_FID · 옛 목록 캐시를 비움 · 곡 받기', f && f.put && mf && mf.mime === 'application/json' && PROPS.REC_FID === fo.id && lst && lst.ok && lst.songs.map((x) => x.k).join(',') === 'r1,r9' && song && song.ok && Buffer.from(song.data, 'base64').toString() === 'ID3-put-r1', { f, fid: PROPS.REC_FID, lst: lst && lst.songs && lst.songs.map((x) => x.k) });
    f1.desc = ''; const g = put('r1.mp3', b64('ID3-put-r1')), live = fo.files.filter((x) => x.name === 'r1.mp3' && !x.trashed);
    ok('9g 지문 없는 같은 이름 파일은 새 파일로 · 옛것은 휴지통', g && g.put && live.length === 1 && live[0] !== f1 && f1.trashed === true, { g, live: live.length });
    CACHE.RECPUT_N = '120'; const h = put('r1.mp3');
    ok('9h 한 시간 120번 넘으면 U1', h && h.ok === false && h.ecode === 'U1', h); delete CACHE.RECPUT_N;
    const i = G.handleRitualFile({ key: 'g0', name: 'x.webm', data: b64('x') });
    ok('9i key 가 rec 가 아니면 종전대로 로그인을 본다', i && i.ok === false && i.reason === 'expired', i);
    G.REC_PUT_HASH = real; }
  // 10 [REC_CLIP_1013] 미리 듣기용 짧은 판
  { const SJ2 = { v: 1, songs: [{ k: 'r1', t: 'Popcorn', hook: 38.1, len: 181.3, file: 'r1.mp3', pf: 'r1p.mp3', p0: 0, p1: 112.6, hooks: [38.1, 87.14] }, { k: 'r9', t: 'Reality', hook: 39.5, len: 280.3, file: 'r9.mp3' }] };
    FOLDERS = [mkFolder('FD_CLIP', [mkFile('songs.json', JSON.stringify(SJ2), 4e12, 'application/json'), mkFile('r1.mp3', 'FULL-r1', 4e12), mkFile('r1p.mp3', 'CLIP-r1', 4e12), mkFile('r9.mp3', 'FULL-r9', 4e12)])]; PROPS = {}; CACHE = {};
    const a = get('r1-p'); ok('10a 짧은 판 받기 = 목록 pf 파일', a && a.ok && a.id === 'r1-p' && Buffer.from(a.data, 'base64').toString() === 'CLIP-r1', a && { ok: a.ok, id: a.id, d: a.data && Buffer.from(a.data, 'base64').toString() });
    const b = get('r9-p'); ok('10b 목록에 pf 가 없으면 L3(화면이 곡 전체로)', b && b.ok === false && b.ecode === 'L3', b);
    const n0 = +(CACHE.RECQ_ME0001 || 0); get('r1-p'); ok('10c 짧은 판도 한 시간 셈에 든다', +(CACHE.RECQ_ME0001 || 0) === n0 + 1, { n0, n1: CACHE.RECQ_ME0001 });
    const c = G.adminRitualFileGet('ME0001', 'rec:r1'); ok('10d 콘솔은 곡 전체', c && c.ok && Buffer.from(c.data, 'base64').toString() === 'FULL-r1', c && c.ok);
    const d1 = get('r1-px'), d2 = get('-p'), d3 = get('r1-p-p'); ok('10e 이상한 꼬리 = 찾지 않는다', [d1, d2, d3].every((r) => r && r.ok === false && !r.data), [d1, d2, d3]); }
} catch (e) { ok('잴 수 없었다 — ' + (e && e.stack || e).split('\n').slice(0, 3).join(' | '), false); }
G._rfFileIn = _rfIn;
console.log(fail ? `rec-song-server: FAIL ${fail}` : 'rec-song-server: ok');
process.exit(fail ? 1 : 0);
