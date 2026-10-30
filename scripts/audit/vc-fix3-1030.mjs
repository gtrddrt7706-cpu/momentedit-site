#!/usr/bin/env node
/* ★[VC_FIX3_1030 2026-10-30 GPT 3차 점검 · 클로드 검토] 두 분 AI 목소리 — 서버 하나 · 식순 화면 · 당일 콘솔을 잰다.
   서버(80_production.gs · 원문을 떼어 vm 으로 · 업체 · 드라이브는 가짜)
   ⓢ [VC_ORPHAN]   주인 없는 업체 목소리(<코드>-g 이름 · 어느 상태에도 없음)는 처음 본 날은 적기만 · 다음 날 지운다 · 주인 있는 것 · 다른 이름은 그대로 · 매일 지우기에 물렸다
   식순 화면(order-preview.html · Playwright · 기능 스위치는 이 시험 안에서만 켠다)
   ① [VC_TAKE_LIVE]   1분 읽기 «이 녹음으로 다음 ›»은 글 1 을 그 자리(VC.read.take)에 둔다 — 줄 올리기로 보내지 않는다
   ② [REC_CUT]        두 분이 멈추지 않았는데 멈춘 녹음(마이크 끊김)은 들어 보기에 «중간에 멈췄어요» · 멈춤을 누른 녹음은 아님
   ③ [MIC_WAIT]       마이크 허용을 받기 전엔 숫자 대신 «마이크 허용을 기다리고 있어요» · 받은 뒤 3 → 2
   ④ [VC_REDO_HONEST] 두 분 다 다시 만들기를 다 썼으면 «아쉬우면 다시 녹음해요»를 말하지 않는다
   ⑤ [VC_DEL_SAY]     지운 목소리 카드는 «지웠어요 · 날짜» — «아직 만들지 않았어요»와 가른다
   ⑥ [VC_EFAIL_REDO]  창을 닫은 뒤 «녹음을 다시 읽어야 하는» 실패도 카드에 «만들지 못했어요 (코드 V0)»
   ⑦ [G_IDX_SLUG · PV_IN_ONLY] ② 보고 듣기 — 하객 맞이 두 분 줄은 g0 · g1 · g3 한 번씩(사진 안내는 나레이션) · 식전 영상 두 분 줄은 영상 앞 소개 하나
   당일 콘솔(console.html)
   ⑧ [CON_OWN_FIRST]  두 분 소리가 물린 자리는 폴더의 성우 번호 파일보다 먼저 · 칩도 받아 둔 것만 «AI 목소리»
   ⑨ [CON_OWN_FALL]   두 분 소리가 안 나면 그 자리 나레이션을 처음부터(글 카드로 지나지 않는다)
   깨 보기: 고친 줄을 옛 꼴로 되돌려(서버는 원문 · 화면은 함수 원문을 바꿔 다시 정의) 같은 장면이 빨개지는지 본다.
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 브라우저를 못 띄움(서버 장면은 그래도 잰다 · 서버가 빨갛면 1) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };

/* ───────── 서버 ───────── */
const GS = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
const FN = ['_voiceStudio', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcRdOldTrash_', '_vcSave', '_vcFetch', '_vcAlert', '_vcAiFolder', '_vcDelVoice', '_vcDelMark', '_vcReadTrash', '_vcPendOf', '_vcPracticeTrash', '_vcPurgeNow', '_vcSlots', '_vcOrphanSweep_', 'purgeVoiceClones'];
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
function world(src, o) {
  o = o || {};
  const code = [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/), lineIn(src, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n');
  const props = Object.assign({ TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on' }, o.props || {}), mails = [], cache = {};
  const ctl = { today: '2026-10-20', list: [], dels: [] };
  const res = (c, body) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body || {})), getBlob: () => ({ getBytes: () => [] }) });
  const folder = () => ({ getFoldersByName: () => { const f = folder(); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder(), getFiles: () => ({ hasNext: () => false }), getFilesByName: () => ({ hasNext: () => false }) });
  const fetch1 = (url, q) => { const p = url.replace('https://api.typecast.ai', ''), m = String(q.method || 'get').toUpperCase();
    if (m === 'DELETE') { const v = decodeURIComponent(p.split('/').pop()); ctl.dels.push(v); ctl.list = ctl.list.filter((x) => x.voice_id !== v); return res(204, ''); }
    if (p === '/v1/custom-voices') return res(200, ctl.list);
    if (p === '/v1/users/me/subscription') return res(200, { plan: 'x', limits: { custom_voice_slot: 50 } });
    return res(404, {}); };
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetch: fetch1, fetchAll: (rs) => rs.map((r) => fetch1(r.url, r)) },
    DriveApp: { getFileById: () => { throw new Error('No item with the given ID could be found'); }, getFolderById: () => folder() },
    Utilities: { formatDate: (d, tz, f) => (f === 'yyyy-MM-dd' ? ctl.today : ctl.today), sleep: () => {} },
    fmtKST: () => ctl.today + ' 10:00', _rfFolderFor: () => folder(), findCustomerByCode: () => ({ get: (h) => (h === '예식일' ? '2026-12-12' : '예식준비') }),
    _gsr_: () => {}, _trigIn_: () => {}, _requireAdmin: () => ({ ok: true }), _rfMailFlush: () => {}, _ymdOf: (v) => v,
    _nfAdminLineEmail: (t) => mails.push(t), Logger: { log() {} }, JSON, Math, String, Date, Array, encodeURIComponent, decodeURIComponent, Object, Number, RegExp, Error,
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  return { sb, props, ctl, mails };
}
const SV = {
  orphan(src) { const W = world(src, { props: { VC_AB12CD: JSON.stringify({ groom: { consent: true, voiceId: 'uc_live' }, retry: ['uc_retry'] }) } });
    W.ctl.list = [{ voice_id: 'uc_live', name: 'AB12CD-g' }, { voice_id: 'uc_retry', name: 'AB12CD-b' }, { voice_id: 'uc_orph', name: 'AB12CD-b' }, { voice_id: 'uc_mine', name: '사장님 나레이션' }, { voice_id: 'uc_test', name: 'ME-selftest-10201000' }];
    W.sb.purgeVoiceClones(); const d1 = W.ctl.dels.slice();
    W.ctl.today = '2026-10-21'; W.sb.purgeVoiceClones(); const d2 = W.ctl.dels.slice();
    const left = W.ctl.list.map((x) => x.voice_id);
    return { pass: !d1.includes('uc_orph') && d2.includes('uc_orph') && !d2.includes('uc_live') && !d2.includes('uc_mine') && !d2.includes('uc_test') && left.includes('uc_live') && left.includes('uc_mine') && !JSON.parse(W.props.VC_ORPHAN_SEEN || '{}').uc_orph,
      d: { d1, d2, left, seen: W.props.VC_ORPHAN_SEEN } }; },
  noName(src) { const W = world(src); W.ctl.list = [{ voice_id: 'uc_x' }]; W.sb.purgeVoiceClones(); W.ctl.today = '2026-10-22'; W.sb.purgeVoiceClones();
    return { pass: !W.ctl.dels.includes('uc_x'), d: W.ctl.dels }; },
};
const SV_BREAK = {
  orphan: [["if (seen[id] && seen[id] < today) {", 'if (true) {']],
  noName: [["!/^[A-Z0-9]{4,12}-[gb]$/.test(nm)) return;", 'false) return;']],
};
const SV_NAME = { orphan: 'ⓢ [VC_ORPHAN] 주인 없는 업체 목소리 — 첫날은 적기만 · 다음 날 지움 · 주인 있는 것 · 다른 이름(사장님 · 시험)은 그대로', noName: 'ⓢ [VC_ORPHAN] 업체 목록에 이름 칸이 없으면 아무것도 지우지 않는다' };
{ const miss = FN.filter((f) => !grabIn(GS, f)); if (miss.length) { ok('원문 조각을 못 떼었다 — ' + miss.join(', '), false); } else {
  for (const k of Object.keys(SV)) { let r; try { r = SV[k](GS); } catch (e) { r = { pass: false, d: 'throw ' + String(e && e.stack || e).slice(0, 300) }; } ok(SV_NAME[k], r.pass, r.d);
    let src = GS, mis = ''; for (const [a, b] of SV_BREAK[k]) { if (src.split(a).length !== 2) { mis = a; break; } src = src.replace(a, b); }
    if (mis) { ok('깨 보기 ' + k + ' — 되돌릴 줄을 원문에서 하나만 찾아야 한다', false, mis); continue; }
    let rb; try { rb = SV[k](src); } catch (e) { rb = { pass: false }; } ok('깨 보기 ' + k + ' — 옛 꼴로 되돌리면 빨강', !rb.pass); } } }
ok('ⓢ 매일 지우기(purgeVoiceClones)가 주인 없는 목소리 정리를 부른다', /_vcOrphanSweep_\(today\)/.test(grabIn(GS, 'purgeVoiceClones')));

/* ───────── 화면 ───────── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음(화면 장면)'); console.log(fail ? `\n★ 실패 ${fail}건` : ''); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 깨 보기 — 함수 원문 바꿔 다시 정의(전역 함수 · window.* 둘 다) */
const REDEF = (name, pairs) => `(() => { let t = (window.${name}).toString(); const miss = []; for (const [a, b] of ${JSON.stringify(pairs)}) { if (t.split(a).length !== 2) miss.push(a.slice(0, 50)); t = t.replace(a, b); } if (miss.length) return miss; window.${name} = (0, eval)('(' + t + ')'); return null; })()`;
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(500);
  await pg.evaluate(() => { courseStarted = true; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true;
    VC.st = { ok: true, groom: { consent: true, ready: true, left: 19 }, bride: { consent: true, ready: true, left: 19 } }; window._vc0 = () => Promise.resolve({ ok: false, error: 'x' }); });
  /* ① */
  const sc1 = () => pg.evaluate(() => { VC.read = { who: 'groom', take: {}, phrase: '오늘은', step: 1, ph: 'read', err: '' }; S.up = S.up || {}; delete S.up['vc:groom:1'];
    MK_REC = { key: 'vc:groom:1', ph: 'review', wav: new Blob(['x']), url: '', dur: 31, warn: [], t: Date.now() - 2000 }; mkRecUse();
    return { take: !!(VC.read && VC.read.take[1]), up: !!(S.up || {})['vc:groom:1'], rec: !!MK_REC }; });
  let r = await sc1(); ok('① [VC_TAKE_LIVE] «이 녹음으로 다음 ›» — 글 1 이 그 자리(take)에 · 줄 올리기 없음', r.take && !r.up && !r.rec, r);
  let mis = await pg.evaluate(REDEF('mkRecUse', [["if(/^vc:/.test(r.key)){ _vcTake(); return; }", '']]));
  r = await sc1(); ok('깨 보기 ① — 옛 꼴(주석에 묻힘)이면 빨강', !mis && !(r.take && !r.up), { mis, r });
  /* ② */
  const sc2 = (userStop) => pg.evaluate(async (us) => {
    const tr = new EventTarget(); const stream = { getAudioTracks: () => [tr], getTracks: () => [tr] };
    window.MediaRecorder = class { constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; } static isTypeSupported() { return true; } start() { this.state = 'recording'; } stop() { if (this.state === 'inactive') return; this.state = 'inactive'; setTimeout(() => { this.ondataavailable && this.ondataavailable({ data: new Blob(['abc']) }); this.onstop && this.onstop(); }, 10); } };
    window._recProcess = () => Promise.resolve({ wav: new Blob(['w']), dur: 30, warn: [], silent: false, noisy: false });
    const r0 = { key: 'g0', ph: 'count', stream }; MK_REC = r0; _recStart(r0);
    await new Promise((ok) => setTimeout(ok, 30)); if (us) mkRecStop(); else tr.dispatchEvent(new Event('ended'));
    for (let i = 0; i < 40 && !(MK_REC && MK_REC.ph === 'review'); i++) await new Promise((ok) => setTimeout(ok, 25));
    const w = (MK_REC && MK_REC.warn) || []; const o = { ph: MK_REC && MK_REC.ph, warn: w.join('|') }; MK_REC = null; return o; }, userStop);
  r = await sc2(false); ok('② [REC_CUT] 마이크가 끊겨 멈춘 녹음 — 들어 보기에 «중간에 멈췄어요»', r.ph === 'review' && /중간에 멈췄어요/.test(r.warn), r);
  const r2u = await sc2(true); ok('② [REC_CUT] 멈춤을 누른 녹음엔 그 말이 없다', r2u.ph === 'review' && !/중간에 멈췄어요/.test(r2u.warn), r2u);
  mis = await pg.evaluate(REDEF('_recStart', [["var _cut=r.ph==='rec'||!!r.cut, b=", 'var _cut=false, b=']]));
  r = await sc2(false); ok('깨 보기 ② — 옛 꼴이면 빨강', !mis && !/중간에 멈췄어요/.test(r.warn), { mis, r });
  /* ③ */
  const sc3 = () => pg.evaluate(async () => { let res; MIC_KEEP = null; MK.micOk = false;
    navigator.mediaDevices.getUserMedia = () => new Promise((ok) => { res = ok; }); window._recStart = function () {};
    _mkRecGo('g0'); const a = { wait: !!(MK_REC && MK_REC.wait), html: _recPanel(MK_REC) };
    res({ getTracks: () => [{ readyState: 'live', stop() {} }], getAudioTracks: () => [] }); await new Promise((ok) => setTimeout(ok, 60));
    const b = { n: MK_REC && MK_REC.n, wait: !!(MK_REC && MK_REC.wait) }; await new Promise((ok) => setTimeout(ok, 900)); const c = MK_REC && MK_REC.n;
    clearTimeout(MK_REC && MK_REC.cd); MK_REC = null; return { a, b, c }; });
  r = await sc3(); ok('③ [MIC_WAIT] 허용 전엔 «마이크 허용을 기다리고 있어요»(숫자 없음) · 받은 뒤 3 → 0.8초 뒤 2', r.a.wait && /마이크 허용을 기다리고/.test(r.a.html) && !/>3</.test(r.a.html) && r.b.n === 3 && !r.b.wait && r.c === 2, r);
  mis = await pg.evaluate(REDEF('_mkRecGo', [['wait:!_micLive()', 'wait:false']]));
  r = await sc3(); ok('깨 보기 ③ — 옛 꼴이면 빨강', !mis && !(r.a.wait && r.b.n === 3), { mis, r });
  /* ④ ⑤ */
  const sc4 = () => pg.evaluate(() => { const one = (l) => { VC.st = { ok: true, groom: { consent: true, ready: true, left: l }, bride: { consent: true, ready: true, left: l } }; return _mkVoicePage(); };
    return { none: /아쉬우면 다시 녹음해요/.test(one(0)), some: /아쉬우면 다시 녹음해요/.test(one(19)), ready0: /준비됐어요/.test(one(0)) }; });
  r = await sc4(); ok('④ [VC_REDO_HONEST] 다 쓴 판엔 «아쉬우면 다시 녹음해요» 없음(«준비됐어요»만) · 남은 판엔 그대로', !r.none && r.some && r.ready0, r);
  mis = await pg.evaluate(REDEF('_mkVoicePage', [["redo=!st||g.left!==0||b.left!==0", 'redo=true']]));
  r = await sc4(); ok('깨 보기 ④ — 옛 꼴이면 빨강', !mis && r.none, { mis, r });
  const sc5 = () => pg.evaluate(() => { VC.st = { ok: true, groom: { consent: true, ready: false, left: 19, deleted: '2026-10-30 10:00' }, bride: { consent: true, ready: false, left: 19 } }; VC.efail = {}; VC.enr = {};
    const h = _vcPeople(true); return { del: /지웠어요 · 10월 30일/.test(h), never: (h.match(/아직 만들지 않았어요/g) || []).length }; });
  r = await sc5(); ok('⑤ [VC_DEL_SAY] 지운 분 «지웠어요 · 10월 30일» · 안 만든 분은 «아직 만들지 않았어요»', r.del && r.never === 1, r);
  mis = await pg.evaluate(REDEF('_vcPeople', [["p.deleted?'지웠어요'+(_vcDay(p.deleted)?' · '+_vcDay(p.deleted):''):", '']]));
  r = await sc5(); ok('깨 보기 ⑤ — 옛 꼴이면 빨강', !mis && !r.del, { mis, r });
  /* ⑥ */
  const sc6 = () => pg.evaluate(() => { VC.st = { ok: true, groom: { consent: true, ready: false, left: 19 }, bride: { consent: true, ready: true, left: 19 } }; VC.efail = {}; VC.enr = {}; VC.read = null;
    const R = { who: 'groom', take: { 1: { dur: 30 }, 2: { dur: 30 } }, phrase: 'p', step: 2, ph: 'busy', err: '' }, E = { w: 'groom', R, snap: null, t0: Date.now(), jid: 'j' }; VC.enr.groom = E;
    _vcEnrCtl(E).fail(VC_REC_BAD, true); const h = _vcPeople(true); MK.toast = '';
    return { kept: !!(VC.efail && VC.efail.groom), card: /만들지 못했어요 \(코드 V0\)/.test(h), btn: /다시 만들기/.test(h), step: R.step, take: Object.keys(R.take).length }; });
  r = await sc6(); ok('⑥ [VC_EFAIL_REDO] 창을 닫은 뒤 «다시 읽어야 하는» 실패 — 카드 «만들지 못했어요 (코드 V0)» · «다시 만들기» · 녹음은 비우고 글 1 부터', r.kept && r.card && r.btn && r.step === 1 && r.take === 0, r);
  mis = await pg.evaluate(REDEF('_vcEnrCtl', [['VC.read!==R&&had&&', 'VC.read!==R&&R.take[1]&&']]));
  r = await sc6(); ok('깨 보기 ⑥ — 옛 꼴이면 빨강', !mis && !r.kept, { mis, r });
  /* ⑦ */
  const sc7 = () => pg.evaluate(async () => { const E = await engine(); S.course = Object.keys(COURSES).filter((c) => COURSES[c].open)[0] || S.course; S.guide = true; S.guestVoice = 'couple'; S.pvVoice = 'couple'; S.on = S.on || {}; S.on.prevideo = 1;
    S.pvText = '저희의 이야기를 함께 봐 주세요.'; if (S.vlines) delete S.vlines.pv;
    const g = _lSteps(E, ['guest']), p = _lSteps(E, ['prevideo']);
    return { gUp: g.filter((x) => x.own).map((x) => x.up), photo: g.some((x) => !x.own && /photo/.test(x.slug || '')), pUp: p.filter((x) => x.own).map((x) => x.up), pOut: p.some((x) => !x.own && x.slug === 'narr-prevideo-out') }; });
  r = await sc7(); ok('⑦ [G_IDX_SLUG] 하객 맞이 두 분 줄 g0 · g1 · g3 한 번씩 · 사진 올리기 안내는 나레이션 줄', JSON.stringify(r.gUp) === '["g0","g1","g3"]' && r.photo, r);
  ok('⑦ [PV_IN_ONLY] 식전 영상 두 분 줄은 영상 앞 소개 하나 · 영상 뒤 받는 말은 나레이션', JSON.stringify(r.pUp) === '["pv"]' && r.pOut, r);
  mis = await pg.evaluate(REDEF('_lSteps0', [["(_gi>-1&&S.guestVoice==='couple')||(k==='entry'", "(c.k==='guest'&&S.guestVoice==='couple'&&c.slug!=='narr-open')||(k==='entry'"], ["(_pvIn&&S.pvVoice==='couple'&&_vcOn()", "(c.k==='prevideo'&&S.pvVoice==='couple'&&_vcOn()"]]));
  r = await sc7(); ok('깨 보기 ⑦ — 옛 꼴이면 빨강', !mis && (JSON.stringify(r.gUp) !== '["g0","g1","g3"]' || JSON.stringify(r.pUp) !== '["pv"]'), { mis, r });
  const src = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  ok('[VC_ENR_WAKE] 만들기를 보낼 때 화면을 붙잡고 끝나면 놓는다', /_vcWake\(true\);\s+\/\/ \[VC_ENR_WAKE\]/.test(src) && /Object\.keys\(VC\.enr\|\|\{\}\)\.length\) _vcWake\(false\)/.test(src));
  ok('[VC_TAKE_LIVE] «//» 주석 안에 _vcTake 호출이 다시 묻히지 않았다', !/\/\/[^\n]*if\(\/\^vc:\/\.test\(r\.key\)\)\{ _vcTake\(\); return; \}/.test(src));
  ok('[VC_READ_ALONE] 1분 읽기 안내 «조용한 방에서 혼자»', src.includes('<span>조용한 방에서 혼자, 휴대폰을 입에서 한 뼘 떼고 읽으면 좋아요</span>'));
  ok('식순 화면 pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();

} finally { await br.close(); srv.close(); }

/* ───────── 콘솔(console.html · 함수 원문을 떼어 vm 으로 — 콘솔 스크립트는 즉시 실행 함수 안이라 브라우저에서 부를 수 없다) ───────── */
{ const CS = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
  const run = (src) => { const code = ['narOf', 'srcOf', 'playClip'].map((f) => grabIn(src, f)).join('\n'); if (code.split('function ').length < 4) return { miss: true };
    const calls = []; let card = false, toastN = 0;
    const sb = { CLIPS: { '01': 'blob:nar01', 'guest-1-arrival': 'blob:own' }, RF_OWN: { 'guest-1-arrival': 1 }, RF_ORIG: {}, PARAM: { clipDir: '/n/' }, GUEST: false, STORY: null,
      esdTry: () => false, recOk: () => true, toast: () => { toastN++; }, fallbackCard: () => { card = true; }, playCastList: () => {},
      playSrc: (u, e, cb) => { calls.push(u); cb(u !== 'blob:own', 'x'); } };
    vm.createContext(sb); vm.runInContext(code, sb); const c = { slug: 'guest-1-arrival', no: '01', file: '01_guest-1-arrival', est: 3, text: 'x' };
    const a = sb.srcOf(c); sb.playClip(c, () => {}); return { a, calls, card, toastN }; };
  let r = run(CS); ok('⑧ [CON_OWN_FIRST] 두 분 소리가 물린 자리 — 폴더의 성우 번호 파일(01)보다 두 분 소리 먼저', r.a === 'blob:own', r);
  ok('⑨ [CON_OWN_FALL] 두 분 소리가 안 나면 그 자리 나레이션을 처음부터 · 글 카드로 지나지 않는다', JSON.stringify(r.calls) === '["blob:own","blob:nar01"]' && !r.card && r.toastN === 1, r);
  const brk = (pairs) => { let t = CS; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
  const b8 = brk([["  if (RF_OWN[c.slug] && CLIPS[c.slug]) return CLIPS[c.slug];   // [CON_OWN_FIRST]\n", '']]);
  ok('깨 보기 ⑧ — 옛 꼴이면 빨강', !!b8 && run(b8).a !== 'blob:own');
  const b9 = brk([["if (!GUEST && RF_OWN[c.slug] && url === CLIPS[c.slug]) {", 'if (false) {']]);
  ok('깨 보기 ⑨ — 옛 꼴이면 빨강', !!b9 && run(b9).card === true);
  ok('[CON_OWN_FIRST] 클립 폴더가 두 분 소리를 덮지 않는다 · 칩은 받아 둔 것만 «AI 목소리»', CS.includes('if (RF_OWN[sl]) RF_ORIG[sl] = u; else CLIPS[sl] = u;') && CS.includes("pill('vk', RF_OWN[q.slug] ? rfKindLab(key)")); }
console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC FIX3 1030 OK'); process.exit(fail ? 1 : 0);
