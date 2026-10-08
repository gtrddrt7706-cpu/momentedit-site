// ★[VC_R1_SERVER 2026-10-08 목소리 1라운드 «server» 묶음] 서버(80_production.gs) · 당일 콘솔 · 관리 화면 · 마이페이지 중계를 장면마다 한 번씩 돌린다.
//
//   node scripts/audit/vc-r1-server.mjs
//
// 서버 장면은 80_production.gs 원본을 node vm 에 그대로 올리고 GAS 전역(드라이브 · 속성 · 잠금 · 캐시 · 업체)만 흉내 낸다.
//   57 · 75 [RF_DEL_SLOT]   줄 지우기 → 그 자리의 더 옛 사본도 휴지통 · 스튜디오 파일과 뒤에 올린 것은 둔다
//   76      [RF_PURGE_AI]   30일 지우기 → 하위 폴더 «AI» 까지 · 이미 지운 예식은 하위 폴더만 한 번
//   78      [VC_SAVE_NOLOCK] 잠금을 못 잡아도 다른 분 확인 문장이 남는다
//   79      [VC_PURGE_MERGE] 매일 지우기(retry 정리) 사이에 만든 목소리가 남는다
//   80      [VC_LONG_SPLIT] 600자 넘는 한 분 글 → 글자를 버리지 않고 나눠 읽는다
//   83      [VC_MAKE_KEEP]  여러 줄 중 한 줄만 429 → 받은 줄은 저장 · 글자를 센다 · 다시 누르면 그 줄만
//   85      [VC_DEL_NOKEY]  키가 비어 있으면 지울 목소리를 retry 에 남긴다
//   86      [VC_ON_CODE]    스위치 studio · 시험 예식 → 관리 화면 vc.on = 켜짐
// 화면 장면(playwright 가 있으면)
//   75      [RF_CON_NOOLD]  당일 콘솔 — 두 분이 비운 줄의 옛 테이크는 안 받는다 · 스튜디오가 대신 올린 줄은 받는다
// ★종료 코드 0 = 통과 · 1 = 실패
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import crypto from 'node:crypto'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const J = JSON.stringify;

function boot(startIso) {
  let now = Date.parse(startIso);
  const props = {}, cache = {}, items = {}; let seq = 0;
  const nid = (p) => p + String(++seq).padStart(14, '0');
  const kids = (fid) => Object.values(items).filter((x) => x.parent === fid);
  const trashed = (x) => !!(x && (x.trashed || (x.parent && trashed(items[x.parent]))));
  const it = (a) => { let i = 0; return { hasNext: () => i < a.length, next: () => a[i++] }; };
  const blob = (bytes, mime, name) => ({ getBytes: () => bytes, getContentType: () => mime, getName: () => name });
  function F(x) { return { getId: () => x.id, getName: () => x.name, isTrashed: () => trashed(x), setTrashed: (v) => { x.trashed = !!v; },
    getBlob: () => blob(x.bytes, x.mime, x.name), getSize: () => x.bytes.length, getDateCreated: () => new Date(x.at), getParents: () => it([D(items[x.parent])]) }; }
  function D(x) { return { getId: () => x.id, getName: () => x.name, isTrashed: () => trashed(x), setTrashed: (v) => { x.trashed = !!v; }, getUrl: () => 'u/' + x.id,
    getFiles: () => it(kids(x.id).filter((k) => !k.dir).map(F)), getFolders: () => it(kids(x.id).filter((k) => k.dir).map(D)),
    getFilesByName: (n) => it(kids(x.id).filter((k) => !k.dir && k.name === n).map(F)), getFoldersByName: (n) => it(kids(x.id).filter((k) => k.dir && k.name === n).map(D)),
    createFolder: (n) => { const y = { id: nid('D'), name: n, dir: true, parent: x.id, at: now }; items[y.id] = y; return D(y); },
    createFile: (b) => { const y = { id: nid('F'), name: b.getName(), dir: false, parent: x.id, at: now, bytes: b.getBytes(), mime: b.getContentType() }; items[y.id] = y; now += 1000; return F(y); } }; }
  items.ROOT = { id: 'ROOT', name: 'My Drive', dir: true, parent: null, at: now };
  const DriveApp = { getFolderById: (i) => { const x = items[i]; if (!x || !x.dir) throw new Error('No item with the given ID could be found'); return D(x); },
    getFileById: (i) => { const x = items[i]; if (!x || x.dir) throw new Error('No item with the given ID could be found'); return F(x); },
    getFoldersByName: (n) => D(items.ROOT).getFoldersByName(n), createFolder: (n) => D(items.ROOT).createFolder(n) };
  const kst = (d) => new Date(d.getTime() + 9 * 3600e3), p2 = (n) => String(n).padStart(2, '0');
  const Utilities = { newBlob: (b, m, n) => blob(Array.from(b || []), m, n), base64Encode: (b) => Buffer.from(b).toString('base64'), base64Decode: (s) => Array.from(Buffer.from(String(s), 'base64')),
    base64EncodeWebSafe: (b) => Buffer.from(b).toString('base64url'), computeDigest: (a, s) => Array.from(crypto.createHash('sha256').update(String(s)).digest()),
    DigestAlgorithm: { SHA_256: 1, MD5: 2 }, Charset: { UTF_8: 1 }, sleep: (ms) => { now += ms; },
    formatDate: (d, tz, f) => { const k = kst(d); return (f === 'M' ? String(k.getUTCMonth() + 1) : f === 'd' ? String(k.getUTCDate()) : f).replace('yyyy', k.getUTCFullYear()).replace('MM', p2(k.getUTCMonth() + 1)).replace('dd', p2(k.getUTCDate())).replace('HH', p2(k.getUTCHours())).replace('mm', p2(k.getUTCMinutes())); } };
  const V = { n: 0, voices: new Set(), tts: [], ttsCode: null, delHook: null, dels: [] };
  const R = (c, body, bytes) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : J(body)), getBlob: () => blob(bytes || [], 'audio/mpeg', 'x.mp3') });
  function call(url, o) { const p = url.replace('https://api.typecast.ai', ''), m = String(o.method || 'get').toLowerCase();
    if (m === 'post' && p === '/v1/custom-voices/instant-clone') { const v = 'uc_' + (++V.n); V.voices.add(v); return R(201, { voice_id: v }); }
    if (m === 'delete') { const v = decodeURIComponent(p.split('/').pop()); V.dels.push(v); if (V.delHook) { const h = V.delHook; V.delHook = null; h(); } V.voices.delete(v); return R(204, ''); }
    if (m === 'post' && p === '/v1/text-to-speech') { let t = ''; try { t = JSON.parse(o.payload).text; } catch {} V.tts.push(t); const c = V.ttsCode ? V.ttsCode(t) : 200; return c === 200 ? R(200, '', [9, 9, 9, t.length % 200]) : R(c, { message: 'busy' }); }
    if (p === '/v1/custom-voices') return R(200, [...V.voices]);
    if (p === '/v1/users/me/subscription') return R(200, { plan: 'x', limits: { custom_voice_slot: 50 } });
    return R(404, ''); }
  const P = { getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) };
  const L = { fail: false };
  const CUST = {};
  const ctx = { DriveApp, Utilities, PropertiesService: { getScriptProperties: () => P }, CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = String(v); }, remove: (k) => { delete cache[k]; } }) },
    LockService: { getScriptLock: () => ({ waitLock: () => { if (L.fail) throw new Error('Lock timeout'); }, releaseLock: () => {} }) }, UrlFetchApp: { fetch: call, fetchAll: (rs) => rs.map((r) => call(r.url, r)) },
    Logger: { log: () => {} }, console: { warn: () => {}, log: () => {} },
    resolveSession: (t) => ({ ok: true, row: { get: (h) => (h === '개인코드' ? String(t) : '') } }), _sessionMsg: () => '로그인',
    fmtKST: (d) => Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd HH:mm'), _kstYmd: (d) => Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd'), _ymdOf: (v) => String(v || '').slice(0, 10),
    findCustomerByCode: (c) => (CUST[c] ? { get: (h) => (h === '예식일' ? CUST[c].wy : h === '현재단계' ? (CUST[c].stage || '') : '') } : null),
    _nfAdminLineEmail: () => {}, _nfAdminEmail: () => {}, handleAiCostLog: () => {}, _requireAdmin: () => true, _CURRENT_ADMIN: 'admin' };
  const RealDate = Date;
  ctx.Date = class extends RealDate { constructor(...a) { if (a.length) super(...a); else super(now); } static now() { return now; } };
  vm.createContext(ctx); vm.runInContext(SRC, ctx, { filename: '80_production.gs' });
  return { G: ctx, props, items, V, L, CUST, trashed, tick: (ms) => { now += ms; } };
}
const live = (W, re) => Object.values(W.items).filter((x) => !x.dir && !W.trashed(x) && (!re || re.test(x.name))).map((x) => x.name);
const st = (W, c) => JSON.parse(W.props['VC_' + c] || '{}');

/* 57 · 75 — 줄 지우기 */
{ const W = boot('2026-10-08T01:00:00Z'), c = 'AAA001', f = W.G._rfFolderFor(c), nb = (n) => W.G.Utilities.newBlob([1, 2, 3], 'audio/wav', n);
  const old1 = f.createFile(nb('하객 입장 때 · 첫 테이크.wav')), stu = f.createFile(nb('하객 입장 때 · 스튜디오 · 카톡.wav')), old2 = f.createFile(nb('하객 입장 때 · 다시 보내기 사본.wav')), cur = f.createFile(nb('하객 입장 때 · 지금.wav'));
  const other = f.createFile(nb('시작 10분 전 · 다른 자리.wav')), later = f.createFile(nb('하객 입장 때 · 지운 뒤 새로.wav'));
  const r = W.G.handleRitualFileDel({ token: c, key: 'g0', id: cur.getId() });
  const L0 = live(W);
  ok('57 · 75 [RF_DEL_SLOT] 줄 지우기 → 그 자리 옛 사본 둘도 휴지통 · 스튜디오 · 다른 자리 · 뒤에 올린 것은 남는다', r.ok && r.swept === 2 && !L0.some((n) => /첫 테이크|사본|지금\.wav/.test(n)) && L0.includes('하객 입장 때 · 스튜디오 · 카톡.wav') && L0.includes('시작 10분 전 · 다른 자리.wav') && L0.includes('하객 입장 때 · 지운 뒤 새로.wav'), J({ r, L0 }));
  void old1; void stu; void old2; void other; void later; }

/* 76 — 30일 지우기 · 하위 폴더 AI */
{ const W = boot('2026-12-01T01:00:00Z'), nb = (n) => W.G.Utilities.newBlob([1], 'audio/mpeg', n);
  W.CUST.BBB001 = { wy: '2026-10-10' }; W.CUST.BBB002 = { wy: '2026-10-10' };
  const f1 = W.G._rfFolderFor('BBB001'); f1.createFile(nb('하객 입장 때 · a.wav')); const a1 = W.G._vcAiFolder('BBB001'); a1.createFile(nb('AI 소리 · x1.mp3')); a1.createFile(nb('AI 소리 · x2.mp3')); a1.createFile(nb('읽은 녹음 · 신랑.wav'));
  W.G._rfFolderFor('BBB002'); const a2 = W.G._vcAiFolder('BBB002'); a2.createFile(nb('AI 소리 · y1.mp3')); W.props.RFGONE_BBB002 = '2026-11-15';   // 옛 판이 루트만 지우고 RFGONE 을 적은 예식
  const pv = W.G.previewRitualFiles(); const before = live(W).length;
  const d1 = W.G.purgeRitualFiles(); const L1 = live(W);
  const d2 = W.G.purgeRitualFiles();
  ok('76 [RF_PURGE_AI] 미리보기는 아무것도 안 지운다', before === 5 && pv.length === 2, J({ before, pv }));
  ok('76 [RF_PURGE_AI] 30일 지우기 → 하위 폴더 AI 까지 0개 · 이미 지운 예식도 하위 폴더 한 번 · 다시 돌면 대상 없음', L1.length === 0 && !!W.props.RFGONE_BBB001 && !!W.props.RFAIGONE_BBB002 && d1.length === 2 && d2.length === 0, J({ L1, d1, d2 })); }

/* 78 — 잠금 실패에도 합쳐 쓰기 */
{ const W = boot('2026-10-08T01:00:00Z'), c = 'CCC001';
  W.props.VOICE_CLONE = 'on'; W.props.TYPECAST_API_KEY = 'k';
  W.G.handleVoiceClone({ token: c, op: 'consent', who: 'groom', agree: true }); W.G.handleVoiceClone({ token: c, op: 'consent', who: 'bride', agree: true });
  const base = st(W, c), mine = JSON.parse(J(base)); mine.groom.phrase = { t: '신랑 문장', at: 'x' };
  W.G.handleVoiceClone({ token: c, op: 'phrase', who: 'bride' });   // 그 사이 신부 확인 문장이 저장됨
  W.L.fail = true; W.G._vcSave(c, base, mine); W.L.fail = false;
  const s = st(W, c);
  ok('78 [VC_SAVE_NOLOCK] 잠금 실패 → 합쳐 쓴다 · 신부 확인 문장이 남고 신랑 문장도 들어간다', !!(s.bride && s.bride.phrase && s.bride.phrase.t) && s.groom.phrase && s.groom.phrase.t === '신랑 문장', J(s)); }

/* 79 — 매일 지우기 retry 정리 사이에 만든 목소리 */
{ const W = boot('2026-10-08T01:00:00Z'), c = 'DDD001';
  W.props.VOICE_CLONE = 'on'; W.props.TYPECAST_API_KEY = 'k'; W.CUST[c] = { wy: '2026-12-01' };
  W.props['VC_' + c] = J({ retry: ['uc_stuck'], groom: { consent: { at: 'x' } } });
  W.V.delHook = () => { const s = st(W, c); s.groom.voiceId = 'uc_new'; W.props['VC_' + c] = J(s); };   // 업체 지우기를 기다리는 사이 신랑이 목소리를 만듦
  W.G.purgeVoiceClones();
  const s = st(W, c);
  ok('79 [VC_PURGE_MERGE] retry 정리 뒤에도 방금 만든 목소리가 남고 retry 는 비워진다', s.groom && s.groom.voiceId === 'uc_new' && J(s.retry || []) === '[]', J(s)); }

/* 85 — 키 없이 지우기 */
{ const W = boot('2026-10-08T01:00:00Z'), c = 'EEE001';
  W.props.VOICE_CLONE = 'on'; W.props['VC_' + c] = J({ groom: { consent: { at: 'x' }, voiceId: 'uc_1' } });
  const r = W.G.handleVoiceClone({ token: c, op: 'delete', who: 'groom' }); const s = st(W, c);
  W.props.TYPECAST_API_KEY = 'k'; W.G.purgeVoiceClones(); const s2 = st(W, c);
  ok('85 [VC_DEL_NOKEY] 키 없이 지우기 → retry 에 남는다 · 키가 돌아오면 매일 정리가 업체에서 지운다', r.ok && s.groom.voiceId === '' && J(s.retry) === '["uc_1"]' && W.V.dels.includes('uc_1') && J(s2.retry || []) === '[]', J({ s, s2, dels: W.V.dels })); }

/* 86 — 스위치 studio */
{ const W = boot('2026-10-08T01:00:00Z');
  W.props.VOICE_CLONE = 'studio'; W.props.VOICE_STUDIO_CODES = 'KKK000'; W.props.TYPECAST_API_KEY = 'k';
  const a = W.G.adminRitualFiles('ZZZ999'), b = W.G.adminRitualFiles('KKK000');
  ok('86 [VC_ON_CODE] studio — 시험 예식은 켜짐 · 다른 예식은 꺼짐(캐시가 같아도)', a.vc && a.vc.on === false && b.vc && b.vc.on === true && b.sup && typeof b.sup === 'object', J({ a: a.vc && a.vc.on, b: b.vc && b.vc.on })); }

/* 80 · 83 — 줄 만들기 */
{ const W = boot('2026-10-08T01:00:00Z'), c = 'FFF001';
  W.props.VOICE_CLONE = 'on'; W.props.TYPECAST_API_KEY = 'k';
  W.props['VC_' + c] = J({ groom: { consent: { at: 'x' }, voiceId: 'uc_g' }, bride: { consent: { at: 'x' }, voiceId: 'uc_b' } });
  const long = ('오늘 이 자리에 와 주셔서 고맙습니다. 천천히 들어와 편히 앉아 주세요.\n').repeat(18).trim();   // 약 680자
  const r = W.G.handleVoiceClone({ token: c, op: 'make', key: 'g0', one: 'groom', text: long, tempo: '1', pause: 150 });
  const got = W.V.tts.join('').replace(/\s/g, ''), want = long.replace(/\s/g, '');
  ok('80 [VC_LONG_SPLIT] 600자 넘는 한 분 글 → 조각 둘 이상으로 끝까지 읽는다(글자 하나도 안 버림) · 조각마다 600자 안', r.ok && r.parts.length >= 2 && got === want && W.V.tts.every((t) => t.length <= 600), J({ ok: r.ok, parts: r.parts && r.parts.length, n: long.length, sent: W.V.tts.map((t) => t.length) }));
  W.V.tts = []; const L3 = [['groom', '첫째 줄 글입니다.'], ['bride', '둘째 줄 글입니다.'], ['groom', '셋째 줄 글입니다.']];
  W.V.ttsCode = (t) => (t === '둘째 줄 글입니다.' ? 429 : 200); const c0 = (st(W, c).make || {}).chars || 0;
  const m1 = W.G.handleVoiceClone({ token: c, op: 'make', key: 'entry', text: L3.map((l) => l[1]).join(' '), lines: L3, tempo: '1', pause: 150 }); const s1 = st(W, c), c1 = ((s1.make && s1.make.chars) || 0) - c0, n1 = W.V.tts.length;
  W.V.ttsCode = null; W.V.tts = [];
  const m2 = W.G.handleVoiceClone({ token: c, op: 'make', key: 'entry', text: L3.map((l) => l[1]).join(' '), lines: L3, tempo: '1', pause: 150 }); const s2 = st(W, c);
  ok('83 [VC_MAKE_KEEP] 가운데 줄만 429 → 실패(V1)를 돌려주되 받은 두 줄은 저장 · 글자를 센다 · 다시 누르면 그 줄만 산다', !m1.ok && c1 === L3[0][1].length + L3[2][1].length && n1 === 4 && m2.ok && W.V.tts.length === 1 && W.V.tts[0] === '둘째 줄 글입니다.' && s2.make.chars - c0 === c1 + L3[1][1].length, J({ m1: { ok: m1.ok, ecode: m1.ecode }, c1, n1, m2: m2.ok, again: W.V.tts, c2: s2.make && s2.make.chars })); }

/* 75 — 당일 콘솔(화면) */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) console.log('건너뜀 — playwright 없음(콘솔 장면)');
else {
  const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
  const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const br = await pw.chromium.launch(); const pg = await (await br.newContext({ viewport: { width: 390, height: 844 } })).newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const wav = Buffer.from('RIFF$\u0000\u0000\u0000WAVEfmt \u0010\u0000\u0000\u0000\u0001\u0000\u0001\u0000@\u001f\u0000\u0000\u0080>\u0000\u0000\u0002\u0000\u0010\u0000data\u0000\u0000\u0000\u0000', 'latin1').toString('base64');
  const gets = [];
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue();
    if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: J({ ok: true, sup: { g2: { id: 'F-st2' } }, files: [
        { key: 'g0', id: 'F-old-ai', name: '하객 입장 때 · AI 옛 테이크.wav' }, { key: 'g1', id: 'F-g1', name: '시작 10분 전 · 녹음.wav' }, { key: 'g2', id: 'F-st2', name: '시작 5분 전 · 스튜디오 · 카톡.wav' }, { key: 'g3', id: 'F-old3', name: '시작 1분 전 · 다시 보내기 사본.wav' }] }) });
      gets.push((b.args || [])[1]); return rt.fulfill({ status: 200, headers: H, body: J({ ok: true, id: (b.args || [])[1], mime: 'audio/wav', data: wav }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
  const S0 = { course: 'family', guestVoice: 'couple', entryVoice: 'nar', up: { g0: 0, g1: { id: 'F-g1', n: '녹음', src: 'rec' } } };   // g0 = 두 분이 지운 줄 · g2 = 스튜디오가 대신 올린 줄 · g3 = 아무것도 안 고른 줄
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(J(S0)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(1500);
  const r = await pg.evaluate(() => ({ st: JSON.stringify(window.__rfState ? window.__rfState().st : null), t: (document.getElementById('rfChk') || {}).textContent || '' }));
  ok('75 [RF_CON_NOOLD] 콘솔 — 지운 줄(g0) · 고르지 않은 줄(g3)의 옛 파일은 안 받고 «나레이션» · 두 분 파일(g1) · 스튜디오 파일(g2)은 받아 둔다', !gets.includes('F-old-ai') && !gets.includes('F-old3') && gets.includes('F-g1') && gets.includes('F-st2') && /하객 입장 때파일 없음 · 나레이션으로 나감/.test(r.t) && /시작 1분 전파일 없음/.test(r.t) && /시작 5분 전✓/.test(r.t), J({ gets, t: r.t }));
  ok('75 콘솔 pageerror 0', !errs.length, errs.join(' | '));
  await br.close(); srv.close();
}
console.log(fail ? `빨강 ${fail}건` : '모두 통과'); process.exit(fail ? 1 : 0);
