#!/usr/bin/env node
/* ★[VC_FIX4_1030 2026-10-30 GPT 4차 점검(다섯 사람 걷기 · 당일 진행)] 두 분 AI 목소리 — 서버 · 식순 화면 · 마이페이지 · 당일 콘솔을 잰다.
   서버(80_production.gs · 원문을 떼어 vm 으로 · 업체 · 드라이브는 가짜)
   ⓢ [VC_RD_OLD]      지우기를 못 끝낸 옛 읽은 녹음이 있는데 다시 만들면 그 id 를 지울 목록(rdOld)에 남긴다 · «지우는 중» · 매일 지우기가 옛 것만 지운다(지금 녹음은 그대로)
   식순 화면(order-preview.html · Playwright · 기능 스위치는 이 시험 안에서만 켠다)
   ① [REC_CUT_KEEP]   1분 멈춤 · 중간 멈춤 알림이 다른 알림을 덮지 않는다 — 무음이면 «소리가 녹음되지 않았어요» 그대로 · 잡음 알림은 함께
   ② [READ_LOSE_SAME] 1분 읽기 글 1 을 들어 보는 중 × 는 한 번 묻는다 · 녹음 중에도 브라우저 새로고침이 묻는다(_vcReadDirty)
   ③ [VC_DEL_DAILY]   지우는 중 카드는 «매일 다시 지워요»(«곧 끝나요» 없음)
   마이페이지(mypage.html · 함수 원문을 떼어 vm 으로)
   ④ [VC_PEND_STAY]   «모두 지우기» 뒤(gone) 다시 열어도 AI 목소리가 지우는 중(aiPend)이면 그 한 줄이 남는다
   당일 콘솔(console.html · 함수 원문을 떼어 vm 으로)
   ⑤ [RF_GEN]         다시 불러온 뒤 늦게 온 옛 요청이 새 소리를 덮지 않는다
   ⑥ [CON_FRESH_WAIT] 다시 불러온 새 소리를 받는 동안 «시작»은 기다린다 · 다 받으면 시작
   ⑦ [CON_SEL_FRESH]  파일이 같아도 고객이 목소리 선택을 바꿨으면 «목소리 선택이 바뀌었어요»로 멈춘다
   ⑧ [ESD_OWN_FALL]   두 분 입장 인사를 못 풀면 그 자리를 나레이션으로 되돌리고 그 소리로 입장 장면을 다시 잰다
   깨 보기: 고친 줄을 옛 꼴로 되돌려 같은 장면이 빨개지는지 본다.
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 브라우저를 못 띄움(vm 장면은 그래도 잰다 · 그쪽이 빨갛면 1) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const grabIn = (src, name) => { let i = src.indexOf('function ' + name + '('); if (i < 0) { i = src.indexOf('window.' + name + '=function('); if (i < 0) return ''; }
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const brk = (src, pairs) => { let t = src; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
const flush = () => new Promise((r) => setTimeout(r, 0));

/* ───────── 서버 ───────── */
const GS = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
const FN = ['_voiceStudio', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcSave', '_vcFetch', '_vcAlert', '_vcAiFolder', '_vcDelVoice', '_vcDelMark', '_vcRdOldTrash_', '_vcReadTrash', '_vcPendOf', '_vcPracticeTrash', '_vcPurgeNow', '_vcSlots', '_vcOrphanSweep_', 'purgeVoiceClones', '_vcCodeSet_', '_vcTs_', '_vcLastAct_', '_vcAiTrashAll_', '_vcVoiceKeys_', '_vcModelOffDue_', '_vcModelOff_', '_vcMonthCap_', '_vcMonthWarn_', '_vcErr', '_vcWhy', '_vcJobPub', '_vcPub', '_vcEnrollAfter'];
function world(src) {
  const code = [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/), lineIn(src, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n');
  const st0 = { groom: { consent: true, voiceId: '', delId: 'v_old', deleted: '2026-10-20 09:00', read: { id: 'rd_old', del: '2026-10-20 09:00' }, tries: 1 }, retry: ['v_old'] };
  const props = { TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on', VC_AB12CD: JSON.stringify(st0) }, cache = {};
  const ctl = { today: '2026-10-20', bad: new Set(['rd_old']), trashed: [] };
  const res = (c, body) => ({ getResponseCode: () => c, getContentText: () => (typeof body === 'string' ? body : JSON.stringify(body || {})), getBlob: () => ({ getBytes: () => [] }) });
  const folder = () => ({ getFoldersByName: () => { const f = folder(); return { hasNext: () => true, next: () => f }; }, createFolder: () => folder(), getFiles: () => ({ hasNext: () => false }), getFilesByName: () => ({ hasNext: () => false }), createFile: () => ({ getId: () => 'rd_new' }) });
  const fetch1 = (url, q) => { const m = String(q.method || 'get').toUpperCase(); if (m === 'DELETE') return res(204, ''); if (/custom-voices$/.test(url)) return res(200, []); return res(404, {}); };
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, releaseLock: () => {} }) },
    CacheService: { getScriptCache: () => ({ get: (k) => cache[k] || null, put: (k, v) => { cache[k] = v; }, remove: (k) => { delete cache[k]; } }) },
    UrlFetchApp: { fetch: fetch1, fetchAll: (rs) => rs.map((r) => fetch1(r.url, r)) },
    DriveApp: { getFileById: (id) => ({ setTrashed: () => { if (ctl.bad.has(id)) throw new Error('Service error: Drive'); ctl.trashed.push(id); } }), getFolderById: () => folder() },
    Utilities: { formatDate: () => ctl.today, sleep: () => {}, newBlob: () => ({}) },
    fmtKST: () => ctl.today + ' 10:00', _rfFolderFor: () => folder(), findCustomerByCode: () => ({ get: (h) => (h === '예식일' ? '2026-12-12' : '예식준비') }),
    _gsr_: () => {}, _trigIn_: () => {}, _requireAdmin: () => ({ ok: true }), _rfMailFlush: () => {}, _ymdOf: (v) => v, _nfAdminLineEmail: () => {},
    Logger: { log() {} }, JSON, Math, String, Date, Array, encodeURIComponent, decodeURIComponent, Object, Number, RegExp, Error,
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  return { sb, props, ctl, st: () => JSON.parse(props.VC_AB12CD) };
}
const svRdOld = (src) => { const W = world(src), code = 'AB12CD', st = W.sb._vcSt(code), pp = st.groom;
  let base = JSON.parse(JSON.stringify(st)); const save = (g) => { const sv = W.sb._vcSave(code, base, st, g); if (sv !== 'stop' && sv !== 'busy') base = JSON.parse(JSON.stringify(st)); return sv; };
  const c = { code, who: 'groom', pp, st, cfg: W.sb._vcCfg_(code), js: null, jid: 'j1', t0: 0, bytes: [], mime: 'audio/wav', ph: '오늘은', WHO: { groom: '신랑', bride: '신부' }, save };
  const r = W.sb._vcEnrollAfter(c, { code: 201, r: res0('{"voice_id":"v_new"}') }, null);
  const a = W.st(), pub = W.sb._vcPub(a.groom, code, a), pend = W.sb._vcPendOf(a);
  W.ctl.bad.clear(); W.ctl.today = '2026-10-21'; W.sb.purgeVoiceClones(); const b = W.st();
  return { pass: !!(r && r.ok) && a.groom.voiceId === 'v_new' && a.groom.read && a.groom.read.id === 'rd_new' && JSON.stringify(a.groom.rdOld) === '["rd_old"]' && pub.deleting && pend
      && !b.groom.rdOld && b.groom.read && b.groom.read.id === 'rd_new' && W.ctl.trashed.includes('rd_old') && !W.ctl.trashed.includes('rd_new'),
    d: { r, a: a.groom, pub: pub && pub.deleting, pend, b: b.groom, trashed: W.ctl.trashed } }; };
function res0(t) { return { getResponseCode: () => 201, getContentText: () => t }; }
{ const miss = FN.filter((f) => !grabIn(GS, f)); if (miss.length) ok('원문 조각을 못 떼었다 — ' + miss.join(', '), false); else {
  let r; try { r = svRdOld(GS); } catch (e) { r = { pass: false, d: 'throw ' + String(e && e.stack || e).slice(0, 300) }; }
  ok('ⓢ [VC_RD_OLD] _vcM3 의 rdOld 합치기가 주석에 묻히지 않았다', /k0 === 'rdOld'\) && Array\.isArray\(m\)\) \{[^\n]*var fa = /.test(GS) && !/\/\/[^\n]*var fa = Array/.test(GS));
  ok('ⓢ [VC_RD_OLD] 지우기 대기 중 다시 만들기 — 옛 읽은 녹음 id 를 rdOld 에 남김 · «지우는 중» · 매일 지우기가 옛 것만 지움(새 녹음 그대로)', r.pass, r.d);
  const b = brk(GS, [['if (rdAdd) pp.rdOld = (pp.rdOld', 'if (false) pp.rdOld = (pp.rdOld']]); let rb = { pass: false };
  if (b) { try { rb = svRdOld(b); } catch (e) {} } ok('깨 보기 ⓢ — 옛 꼴(저장 뒤 한 번 보내 보고 잊음)이면 빨강', !!b && !rb.pass); } }

/* ───────── 마이페이지 ───────── */
{ const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
  const run = (src) => { const code = ['_rfKeepList', '_rfKeepNote'].map((f) => grabIn(src, f)).join('\n') + '\nvar RF_KEEP_LAB={};';
    const sb = { _kstDdayOf: () => -10, escapeHtml: (s) => String(s), getToken: () => 't', Object, String, Date, RegExp, Number };
    vm.createContext(sb); vm.runInContext(code, sb);
    return { pend: sb._rfKeepNote({ S: { up: {} } }, { weddingDate: '2026-10-10' }, { gone: '2026-10-20', aiPend: true }), done: sb._rfKeepNote({ S: { up: {} } }, { weddingDate: '2026-10-10' }, { gone: '2026-10-20', aiGone: '2026-10-11' }) }; };
  const r = run(MP); ok('④ [VC_PEND_STAY] 파일을 지운 뒤 다시 열어도 AI 목소리가 지우는 중이면 «지우는 중이에요 · 매일 다시 지워요» 한 줄 · 다 지웠으면 없음', /지우는 중이에요 · 매일 다시 지워요/.test(r.pend) && r.done === '', r);
  const b = brk(MP, [['if(voice.gone||!L.length) return pendP;', "if(voice.gone||!L.length) return '';"]]);
  ok('깨 보기 ④ — 옛 꼴이면 빨강', !!b && run(b).pend === '');
  ok('[VC_DEL_DAILY] 마이페이지에 «곧 끝나요»가 남지 않았다', !/지우는 중이에요 · 곧 끝나요/.test(MP)); }

/* ───────── 콘솔 ───────── */
{ const CS = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
  /* ⑤ RF_GEN */
  const run5 = (src) => { const code = ['rfWhy', 'rfPrefetch'].map((f) => grabIn(src, f)).join('\n') + '\nvar RF_WHY = {}, RF_SKIP = "", RF_GEN = {};';
    const pend = {}; class B { constructor(a) { this.s = String.fromCharCode.apply(null, Array.from(a[0])); } }
    const sb = { QS: { get: () => 'AB12CD' }, localStorage: { getItem: () => 'tok' }, S: { up: { g0: { id: 'A' } } }, rfPaint: () => {}, rfKeys: () => ['g0'], rfSlugOf: () => 'guest-1-arrival', esdWant: () => false, esdPrepVoice: () => {}, render: () => {},
      CLIPS: {}, RF_ORIG: {}, RF_OWN: {}, RF_ST: {}, RF_FRESH: { done: true }, RF_EXEC: 'x', atob: (s) => Buffer.from(s, 'base64').toString('binary'), Uint8Array, Blob: B, URL: { createObjectURL: (b) => 'blob:' + b.s }, setTimeout, clearTimeout, AbortController,
      fetch: (u, o) => { const q = JSON.parse(o.body); if (q.fn === 'adminRitualFiles') return Promise.resolve({ json: () => ({ ok: true, files: [{ id: 'A' }, { id: 'B' }] }) });
        return new Promise((res) => { pend[q.args[1]] = () => res({ json: () => ({ ok: true, data: Buffer.from(q.args[1]).toString('base64'), mime: 'audio/wav' }) }); }); } };
    vm.createContext(sb); vm.runInContext(code, sb); return { sb, pend }; };
  const sc5 = async (src) => { const { sb, pend } = run5(src); sb.rfPrefetch(); await flush(); await flush(); sb.S.up = { g0: { id: 'B' } }; sb.rfPrefetch(); await flush(); await flush();
    if (!pend.A || !pend.B) return { miss: Object.keys(pend) }; pend.B(); for (let i = 0; i < 6; i++) await flush(); pend.A(); for (let i = 0; i < 6; i++) await flush();
    return { clip: sb.CLIPS['guest-1-arrival'], st: sb.RF_ST.g0 }; };
  let r = await sc5(CS); ok('⑤ [RF_GEN] 새 요청(B)이 먼저 와도 늦게 온 옛 요청(A)이 덮지 않는다', r.clip === 'blob:B' && r.st === 'ok', r);
  let b = brk(CS, [['if (RF_GEN[k] !== gen) throw 1; ', '']]); r = b ? await sc5(b) : null;
  ok('깨 보기 ⑤ — 옛 꼴이면 빨강', !!r && r.clip === 'blob:A', r);
  /* ⑥ CON_FRESH_WAIT · ⑦ CON_SEL_FRESH (시작 단추) */
  const iife = (src) => { const i = src.indexOf("(function(){ var go = $('#go'), run = go.onclick;"); if (i < 0) return ''; const j = src.indexOf('})();', i); return src.slice(i, j + 5); };
  const run6 = (src, fresh) => { const code = grabIn(src, 'rfBusyNow') + '\n' + iife(src); let ran = 0, toast = '';
    const go = { onclick: () => { ran++; }, dataset: {}, textContent: '시작' };
    const sb = { $: () => go, RF_FRESH: { done: true, wait: true }, RF_ST: { g0: 'busy' }, rfKeys: () => ['g0'], GUEST: false, QS: { get: () => 'AB12CD' }, toast: (t) => { toast = t; }, rfPaint: () => {}, rfFresh: fresh || (() => Promise.resolve(null)) };
    vm.createContext(sb); vm.runInContext(code, sb); return { sb, go, ran: () => ran, toast: () => toast }; };
  const sc6 = (src) => { const W = run6(src); W.go.onclick(); const a = W.ran(); W.sb.RF_ST.g0 = 'ok'; W.go.onclick(); return { busyRan: a, okRan: W.ran(), toast: W.toast() }; };
  r = sc6(CS); ok('⑥ [CON_FRESH_WAIT] 다시 불러온 소리를 받는 동안 «시작»은 기다린다 · 다 받으면 시작', r.busyRan === 0 && r.okRan === 1 && /받는 중/.test(r.toast), r);
  b = brk(CS, [["    if (RF_FRESH.wait && rfBusyNow()) {", '    if (false) {']]); r = b ? sc6(b) : null;
  ok('깨 보기 ⑥ — 옛 꼴이면 빨강', !!r && r.busyRan === 1, r);
  const run7 = (src) => { const code = ['rfKeys0', 'rfUpId', 'rfFresh'].map((f) => grabIn(src, f)).join('\n');
    const sb = { QS: { get: () => 'AB12CD' }, localStorage: { getItem: () => 'tok' }, GUEST: false, S: { guestVoice: 'couple', up: { g0: { id: 'A' } } }, rfKeys: () => ['g0'], RF_EXEC: 'x', AbortController, setTimeout, clearTimeout, String,
      fetch: () => Promise.resolve({ json: () => ({ ok: true, mirror: { production: { ritualDraft: { S: { guestVoice: 'narr', up: { g0: { id: 'A' } } } } } } }) }) };
    vm.createContext(sb); vm.runInContext(code, sb); return sb.rfFresh(); };
  r = await run7(CS); ok('⑦ [CON_SEL_FRESH] 파일이 같아도 목소리 선택이 바뀌면 sel 로 알린다', !!(r && r.sel && r.sel.includes('guestVoice')), r);
  b = brk(CS, [['sel: sel.length ? sel : null', 'sel: null']]); r = b ? await run7(b) : null;
  ok('깨 보기 ⑦ — 옛 꼴이면 빨강', !!b && !(r && r.sel));
  { const W = run6(CS, () => Promise.resolve({ keys: [], up: {}, sel: ['guestVoice'] })); W.sb.RF_FRESH = { done: false, ask: null }; W.go.onclick(); for (let i = 0; i < 4; i++) await flush();
    ok('⑦ [CON_SEL_FRESH] 시작 단추 — 선택이 바뀌었으면 시작하지 않고 칸에 알린다', W.ran() === 0 && !!(W.sb.RF_FRESH.ask && W.sb.RF_FRESH.ask.sel) && /목소리 선택이 바뀌었어요/.test(W.toast()), { ran: W.ran(), ask: W.sb.RF_FRESH.ask, t: W.toast() }); }
  ok('[CON_SEL_FRESH · CON_FRESH_SAY] 칸 글 — 선택이 바뀌면 «콘솔을 다시 열어 주세요» · 새 소리는 «다시 불러오면 새 소리로 · … 이 창에 받아 둔 소리로»',
    CS.includes('목소리 선택이 바뀌었어요 · 관리 화면에서 당일 콘솔을 다시 열어 주세요') && CS.includes('다시 불러오면 새 소리로 · 시작을 한 번 더 누르면 이 창에 받아 둔 소리로') && !CS.includes('시작을 한 번 더 누르면 지금 소리로 <button'));
  /* ⑧ ESD_OWN_FALL */
  const run8 = async (src) => { const code = ['srcOf', 'esdPrepVoice'].map((f) => grabIn(src, f)).join('\n'); const c = { slug: 'entry-A', no: '30', file: '30_entry-A', text: '입장', own: 1, k: 'entry' };
    const sb = { esdWant: () => true, esdEntryCue: () => c, PARAM: { clipDir: '/n/' }, ENTRY: { A: { nar: '입장' } }, CLIPS: { 'entry-A': 'blob:own' }, RF_OWN: { 'entry-A': 1 }, RF_ORIG: { 'entry-A': 'blob:nar' }, RF_ST: { entry: 'ok' }, RF_WHY: {},
      ESD: { V0: null, vurl: '', vBusy: null }, ES: { prepVoice: () => ({ v: 1 }), sentN: () => 1 }, rfPaint: () => {}, render: () => {},
      fetch: (u) => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({ u }) }), esdDecode: (ab) => (ab.u === 'blob:own' ? Promise.reject(new Error('decode')) : Promise.resolve('buf')) }; sb.window = sb;   // [ESD_NAR_KIND] 되돌린 나레이션은 성우 글(window.ENTRY)을 읽는다
    vm.createContext(sb); vm.runInContext(code, sb); sb.esdPrepVoice(); for (let i = 0; i < 12; i++) await flush();
    return { own: !!sb.RF_OWN['entry-A'], clip: sb.CLIPS['entry-A'], vurl: sb.ESD.vurl, v0: !!sb.ESD.V0, st: sb.RF_ST.entry, why: sb.RF_WHY.entry || '' }; };
  r = await run8(CS); ok('⑧ [ESD_OWN_FALL] 두 분 입장 인사를 못 풀면 나레이션으로 되돌리고 그 소리로 장면을 다시 잰다 · 칸 «받지 못함»(M6)', !r.own && r.clip === 'blob:nar' && r.vurl === 'blob:nar' && r.v0 && r.st === 'fail' && /M6/.test(r.why), r);
  b = brk(CS, [['if (RF_OWN[c.slug] && CLIPS[c.slug] === url) {', 'if (false) {']]); r = b ? await run8(b) : null;
  ok('깨 보기 ⑧ — 옛 꼴이면 빨강', !!r && !r.v0, r);
  const m = /toast\('(두 분 소리[^']*)'\);\s+\/\* \[CON_FALL_SHORT/.exec(CS);
  ok('[CON_FALL_SHORT] 나레이션 대신 알림은 20자 안', !!m && m[1].length <= 20, m && m[1]); }

/* ───────── 식순 화면 ───────── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음(화면 장면)'); console.log(fail ? `\n★ 실패 ${fail}건` : ''); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(fail ? 1 : 2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const REDEF = (name, pairs) => `(() => { let t = (window.${name}).toString(); const miss = []; for (const [a, b] of ${JSON.stringify(pairs)}) { if (t.split(a).length !== 2) miss.push(a.slice(0, 50)); t = t.replace(a, b); } if (miss.length) return miss; window.${name} = (0, eval)('(' + t + ')'); return null; })()`;
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(500);
  await pg.evaluate(() => { courseStarted = true; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true;
    VC.st = { ok: true, groom: { consent: true, ready: true, left: 19 }, bride: { consent: true, ready: true, left: 19 } }; window._vc0 = () => Promise.resolve({ ok: false, error: 'x' }); });
  /* ① */
  const sc1 = () => pg.evaluate(async () => { const one = async (o, cap, cut) => { window._recProcess = () => Promise.resolve(Object.assign({ wav: new Blob(['w']), dur: 30, noisy: false, silent: false }, o));
      VC.read = { who: 'groom', take: {}, phrase: 'p', step: 1, ph: 'read', err: '' }; _recFromBlob('vc:groom:1', new Blob(['abc']), 'rec', '', cap, cut);
      for (let i = 0; i < 40 && !(MK_REC && MK_REC.ph === 'review'); i++) await new Promise((r) => setTimeout(r, 20)); const w = ((MK_REC && MK_REC.warn) || []).join('|'); MK_REC = null; VC.read = null; return w; };
    return { silentCap: await one({ silent: true, warn: ['소리가 녹음되지 않았어요\n마이크를 확인하고 다시 녹음해 주세요'] }, true, false),
      noisyCut: await one({ noisy: true, warn: ['주변 소리가 목소리에 비해 커요\n조용한 곳에서 다시 해 보세요', '조금 짧아요\n끝까지 읽었는지 들어 보세요'] }, false, true) }; });
  let r = await sc1(); ok('① [REC_CUT_KEEP] 무음 1분 멈춤은 «소리가 녹음되지 않았어요» 그대로 · 잡음 중간 멈춤은 멈춤 + 잡음 알림(길이 알림만 뺌)',
    /녹음되지 않았어요/.test(r.silentCap) && !/들어 보세요/.test(r.silentCap) && /중간에 멈췄어요/.test(r.noisyCut) && /주변 소리/.test(r.noisyCut) && !/조금 짧아요/.test(r.noisyCut), r);
  let mis = await pg.evaluate(REDEF('_recFromBlob', [["if(!o.silent&&(_cap||(src==='rec'&&cut))) o.warn=[_cap?'1분이 되어 녹음이 멈췄어요\\n끝까지 읽었는지 들어 보세요':'녹음이 중간에 멈췄어요\\n끝까지 읽었는지 들어 보세요'].concat((o.warn||[]).filter(function(x){ return !/길어요|짧아요/.test(x); }));",
    "if(_cap) o.warn=['1분이 되어 녹음이 멈췄어요\\n끝까지 읽었는지 들어 보세요'];   if(src==='rec'&&cut&&!_cap&&!o.silent) o.warn=['녹음이 중간에 멈췄어요\\n끝까지 읽었는지 들어 보세요'];"]]));
  r = await sc1(); ok('깨 보기 ① — 옛 꼴이면 빨강', !mis && (/들어 보세요/.test(r.silentCap) || !/주변 소리/.test(r.noisyCut)), { mis, r });
  await pg.reload({ waitUntil: 'load' }); await wait(500);
  await pg.evaluate(() => { courseStarted = true; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { ok: true, groom: { consent: true, ready: false, left: 19 }, bride: { consent: true, ready: false, left: 19 } }; window._vc0 = () => Promise.resolve({ ok: false, error: 'x' }); });
  /* ② */
  const sc2 = () => pg.evaluate(() => { let asked = 0; const oa = window.ordAsk; window.ordAsk = () => { asked++; return Promise.resolve(false); };
    VC.read = { who: 'groom', take: {}, phrase: 'p', step: 1, ph: 'read', err: '' }; MK_REC = { key: 'vc:groom:1', ph: 'review', url: '', dur: 30, warn: [], t: Date.now() - 2000 }; mkDlgClose(); const a = asked, stillOpen = !!MK_REC;
    MK_REC = { key: 'vc:groom:1', ph: 'rec' }; const dirtyRec = window._vcReadDirty(); MK_REC = { key: 'vc:groom:1', ph: 'review', silent: true }; const dirtySilent = window._vcReadDirty();
    MK_REC = null; VC.read = null; window.ordAsk = oa; return { asked: a, stillOpen, dirtyRec, dirtySilent }; });
  r = await sc2(); ok('② [READ_LOSE_SAME] 글 1 들어 보기 × 는 묻는다(닫히지 않음) · 녹음 중 새로고침도 묻는다 · 무음 녹음은 묻지 않는다', r.asked === 1 && r.stillOpen && r.dirtyRec && !r.dirtySilent, r);
  mis = await pg.evaluate(REDEF('mkDlgClose', [["||(r&&r.ph==='review'&&(!/^vc:/.test(r.key)||!r.silent));", "||(r&&r.ph==='review'&&!/^vc:/.test(r.key));"]]));
  r = await sc2(); ok('깨 보기 ② — 옛 꼴이면 빨강', !mis && r.asked === 0, { mis, r });
  /* ③ */
  const h3 = await pg.evaluate(() => { VC.st = { ok: true, groom: { consent: true, ready: false, left: 19, deleting: true }, bride: { consent: true, ready: false, left: 19 } }; VC.efail = {}; VC.enr = {}; return _vcPeople(true); });
  ok('③ [VC_DEL_DAILY] 지우는 중 카드 «지우는 중이에요 · 매일 다시 지워요» · «곧 끝나요» 없음', /지우는 중이에요 · 매일 다시 지워요/.test(h3) && !/곧 끝나요/.test(h3));
  const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  ok('[VC_DEL_DAILY] 식순 화면 글에 «지우는 중이에요 · 곧 끝나요»가 남지 않았다', !OP.includes("'지우는 중이에요 · 곧 끝나요'"));
  ok('식순 화면 pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} finally { await br.close(); srv.close(); }
console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC FIX4 1030 OK'); process.exit(fail ? 1 : 0);
