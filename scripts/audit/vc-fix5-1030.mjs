#!/usr/bin/env node
/* ★[VC_FIX5_1030 2026-10-30 GPT 5차 점검(다섯 사람 걷기 · 당일 진행)] 두 분 AI 목소리 — 서버 · 식순 화면 · 마이페이지 · 당일 콘솔을 잰다.
   서버(80_production.gs · 원문을 떼어 vm 으로 · 업체 · 드라이브는 가짜)
   ⓢ [VC_WED_OVER]     예식 다음 날부터 · 취소 등은 새 목소리 동의 · 확인 문장 · 만들기를 받지 않는다(V0) · 상태 over · 남은 수 0 · 시험 예식은 빼고
   식순 화면(order-preview.html · Playwright · 기능 스위치는 이 시험 안에서만 켠다)
   ① [RELOGIN_BTN]     로그인 풀림(코드 ○8)에는 «다시 불러오기 · 다시 저장하기» 대신 «로그인하기»(상태 칸 · 창 · 저장 · 머리 단추) · 누르면 마이페이지에 알린다
   ② [VC_ST_FRESH]     받은 지 1분 넘은 상태는 화면에 돌아올 때 다시 묻는다(1분 안이면 묻지 않는다)
   ③ [VC_OLD_DEL]      새 목소리가 준비돼도 이전 것을 지우는 중이면 카드에 한 줄
   ④ [VC_WED_OVER]     예식이 끝났으면 카드에 만들기 단추 없이 «예식이 끝나 새 목소리는 만들 수 없어요»(지운 기록이 있으면 «지웠어요»)
   마이페이지(mypage.html)
   ⑤ [RELOGIN_BTN]     식순 화면의 «로그인하기»(orderRelogin)를 받아 로그인 화면으로(_errGoLogin)
   당일 콘솔(console.html · 함수 원문을 떼어 vm 으로)
   ⑥ [CON_FRESH_LIST]  «다시 불러오기»를 누른 순간부터 파일 목록을 묻는 동안에도 «시작»은 기다린다
   ⑦ [RF_GEN_DROP]     새 저장본에서 그 자리 파일이 없어지면 앞 요청이 늦게 와도 «받아 둠»으로 살아나지 않는다
   ⑧ [ESD_NAR_KIND]    로컬 성우 파일(blob:)도 나레이션으로 알아본다(«입장!» 앞 쉼 · 문장 수)
   ⑨ [FIRE_STOP_PREV]  새 순서를 내보내면 앞 말소리를 멈추고 끝 처리를 떼어 낸다
   ⑩ [CON_STALL]       소리가 중간에 멈춘 채 안전 타이머가 울리면 성공 처리하지 않고 자동 진행을 세운다
   ⑪ [CON_RELOAD_GUARD] 진행 중 새로고침은 묻고 · 진행하던 순서를 다시 열면 시작 단추 위에 한 줄
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
const FN = ['_voiceStudio', '_vcMode', '_vcCfg_', '_vcSt', '_vcPut', '_vcM3', '_vcSave', '_vcSpent', '_vcGate', '_vcJobPub', '_vcPub', '_vcWedOver_', 'handleVoiceClone'];
function sv(src, o) {
  const code = [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n');
  const props = Object.assign({ TYPECAST_API_KEY: 'k', VOICE_CLONE: 'on', VC_AB12CD: JSON.stringify({ groom: { consent: { at: 'x' }, voiceId: '', deleted: '2026-10-21 09:00', tries: 1 } }) }, o.props || {});
  const row = { get: (h) => (h === '개인코드' ? 'AB12CD' : h === '예식일' ? o.wed : h === '현재단계' ? (o.stage || '예식준비') : '') };
  const sb = {
    PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => (k in props ? props[k] : null), setProperty: (k, v) => { props[k] = String(v); }, deleteProperty: (k) => { delete props[k]; }, getProperties: () => Object.assign({}, props) }) },
    LockService: { getScriptLock: () => ({ waitLock: () => {}, tryLock: () => true, releaseLock: () => {} }) },
    Utilities: { formatDate: () => o.today, sleep: () => {} },
    resolveSession: () => ({ ok: true, row }), _sessionMsg: () => '', fmtKST: () => o.today + ' 10:00', _ymdOf: (v) => String(v || ''),
    _voiceUpLive: () => false, _rfStudioUps: () => ({}), _gsr_: () => {}, Logger: { log() {} }, JSON, Math, String, Date, Array, Object, Number, RegExp, Error,
  };
  vm.createContext(sb); vm.runInContext(code, sb);
  const call = (op, x) => sb.handleVoiceClone(Object.assign({ token: 't', op, who: 'groom' }, x || {}));
  const st = call('status'), consent = call('consent', { agree: true });   // 예식 전 · 시험 예식은 동의까지만(확인 문장 · 만들기는 업체 쪽이라 여기서 안 돈다)
  return { st, consent, phrase: st.over ? call('phrase') : null, enroll: st.over ? call('enroll', { data: 'data:audio/wav;base64,AAAA' }) : null };
}
const svOver = (src) => { const a = sv(src, { wed: '2026-10-20', today: '2026-10-21' }), b = sv(src, { wed: '2026-12-12', today: '2026-10-21' }), c = sv(src, { wed: '2026-10-20', today: '2026-10-21', props: { VOICE_STUDIO_CODES: 'AB12CD' } }), d = sv(src, { wed: '2026-12-12', today: '2026-10-21', stage: '취소' });
  const rej = (r) => !!(r && r.ok === false && r.over && r.ecode === 'V0' && /예식이 끝나 새 목소리는 만들 수 없어요/.test(r.error));
  return { pass: a.st.ok && a.st.over === true && a.st.groom.left === 0 && a.st.bride.left === 0 && rej(a.consent) && rej(a.phrase) && rej(a.enroll)
      && b.st.over === false && b.st.groom.left > 0 && b.consent.ok === true && c.st.over === false && c.consent.ok === true && d.st.over === true && rej(d.consent),
    d: { a: [a.st.over, a.st.groom && a.st.groom.left, a.consent, a.enroll], b: [b.st.over, b.consent], c: [c.st.over, c.consent], d: [d.st.over] } }; };
{ const miss = FN.filter((f) => !grabIn(GS, f)); if (miss.length) ok('ⓢ 원문 조각을 못 떼었다 — ' + miss.join(', '), false); else {
  let r; try { r = svOver(GS); } catch (e) { r = { pass: false, d: 'throw ' + String(e && e.stack || e).slice(0, 300) }; }
  ok('ⓢ [VC_WED_OVER] 예식 다음 날 · 취소면 동의 · 확인 문장 · 만들기를 V0 로 거절 · 상태 over · 남은 수 0 · 예식 전 · 시험 예식은 그대로', r.pass, r.d);
  const b = brk(GS, [['  var over = _vcWedOver_(code, s.row);', '  var over = false;']]); let rb = { pass: true };
  if (b) { try { rb = svOver(b); } catch (e) { rb = { pass: false }; } } ok('깨 보기 ⓢ — 옛 꼴(예식 뒤에도 받음)이면 빨강', !!b && !rb.pass); } }

/* ───────── 마이페이지 ───────── */
{ const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
  ok('⑤ [RELOGIN_BTN] 마이페이지가 식순 화면의 «로그인하기»(momentedit:orderRelogin)를 받아 _errGoLogin 으로 연다',
    /d\.type==='momentedit:orderRelogin'\)\{[^\n]*_errGoLogin\(\{ok:false, ecode:_rc\}, _rc\.charAt\(0\)\); return; \}/.test(MP)); }

/* ───────── 콘솔 ───────── */
const CS = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
{ /* ⑥ CON_FRESH_LIST · ⑦ RF_GEN_DROP */
  const iife = (src) => { const i = src.indexOf("(function(){ var go = $('#go'), run = go.onclick;"); if (i < 0) return ''; const j = src.indexOf('})();', i); return src.slice(i, j + 5); };
  const mk = (src) => { const code = ['rfWhy', 'rfPrefetch', 'rfFreshApply', 'rfBusyNow'].map((f) => grabIn(src, f)).join('\n') + '\nvar RF_WHY = {}, RF_SKIP = "", RF_GEN = {}, RF_CUR = {}, RF_CACHED = {}, RF_FROM = {}, RF_PUTFAIL = {};\n' + iife(src);
    const pend = {}; let ran = 0; class B { constructor(a) { this.s = String.fromCharCode.apply(null, Array.from(a[0])); } }
    const go = { onclick: () => { ran++; }, dataset: {}, textContent: '시작' };
    const sb = { $: () => go, QS: { get: () => 'AB12CD' }, localStorage: { getItem: () => 'tok' }, GUEST: false, S: { up: { g0: { id: 'A' } } }, rfPaint: () => {}, rfKeys: () => ['g0'], rfSlugOf: () => 'guest-1-arrival', esdWant: () => false, esdPrepVoice: () => {}, render: () => {}, toast: () => {}, rfFresh: () => Promise.resolve(null),
      CLIPS: {}, RF_ORIG: {}, RF_OWN: {}, RF_ST: {}, RF_FRESH: { done: true, ask: null }, RF_EXEC: 'x', atob: (s) => Buffer.from(s, 'base64').toString('binary'), Uint8Array, Blob: B, URL: { createObjectURL: (b) => 'blob:' + b.s }, setTimeout, clearTimeout, AbortController,
      fetch: (u, o) => { const q = JSON.parse(o.body); const key = q.fn === 'adminRitualFiles' ? 'list' + Object.keys(pend).filter((k) => /^list/.test(k)).length : q.args[1];
        return new Promise((res) => { pend[key] = () => res({ json: () => (q.fn === 'adminRitualFiles' ? { ok: true, files: [{ id: 'A' }, { id: 'B' }] } : { ok: true, data: Buffer.from(q.args[1]).toString('base64'), mime: 'audio/wav' }) }); }); } };
    vm.createContext(sb); vm.runInContext(code, sb); return { sb, pend, go, ran: () => ran }; };
  const sc6 = async (src) => { const W = mk(src); W.sb.RF_FRESH.ask = { keys: ['g0'], up: { g0: { id: 'B' } } }; W.sb.rfFreshApply(); await flush();
    W.go.onclick(); const r1 = W.ran(); if (W.pend.list0) W.pend.list0(); for (let i = 0; i < 6; i++) await flush();
    W.go.onclick(); const r2 = W.ran(); if (W.pend.B) W.pend.B(); for (let i = 0; i < 6; i++) await flush(); W.go.onclick();
    return { listing: r1, fetching: r2, after: W.ran(), clip: W.sb.CLIPS['guest-1-arrival'] }; };
  let r = await sc6(CS); ok('⑥ [CON_FRESH_LIST] 다시 불러온 뒤 목록을 묻는 동안 · 파일을 받는 동안 «시작»은 기다리고 다 받으면 시작', r.listing === 0 && r.fetching === 0 && r.after === 1 && r.clip === 'blob:B', r);
  let b = brk(CS, [['RF_FRESH.wait = true; RF_FRESH.list = true; rfPrefetch();', 'RF_FRESH.wait = true; rfPrefetch();']]); r = b ? await sc6(b) : null;
  ok('깨 보기 ⑥ — 옛 꼴이면 빨강', !!r && r.listing === 1, r);
  const sc7 = async (src) => { const W = mk(src); W.sb.rfPrefetch(); W.pend.list0(); for (let i = 0; i < 6; i++) await flush();
    W.sb.RF_FRESH.ask = { keys: ['g0'], up: {} }; W.sb.rfFreshApply(); if (W.pend.list1) W.pend.list1(); for (let i = 0; i < 6; i++) await flush();
    if (!W.pend.A) return { miss: Object.keys(W.pend) }; W.pend.A(); for (let i = 0; i < 6; i++) await flush();
    return { clip: W.sb.CLIPS['guest-1-arrival'] || '', st: W.sb.RF_ST.g0 || '', own: !!W.sb.RF_OWN['guest-1-arrival'] }; };
  r = await sc7(CS); ok('⑦ [RF_GEN_DROP] 새 저장본에서 그 자리 파일이 없어지면 늦게 온 옛 소리(A)가 «받아 둠»으로 살아나지 않는다', r.clip !== 'blob:A' && r.st !== 'ok' && !r.own, r);
  b = brk(CS, [[' delete RF_PUTFAIL[k]; RF_GEN[k] = (RF_GEN[k] || 0) + 1; });', ' delete RF_PUTFAIL[k]; });']]); r = b ? await sc7(b) : null;
  ok('깨 보기 ⑦ — 옛 꼴이면 빨강', !!r && r.clip === 'blob:A', r); }
{ /* ⑧ ESD_NAR_KIND */
  const run8 = async (src, own) => { const code = ['srcOf', 'esdPrepVoice'].map((f) => grabIn(src, f)).join('\n'); const c = { slug: 'entry-A', no: '30', file: '30_entry-A', text: '두 분 글 한 문장.', own: 1, k: 'entry' }; let got = null;
    const sb = { esdWant: () => true, esdEntryCue: () => c, PARAM: { clipDir: '/n/' }, ENTRY: { A: { nar: '성우 글. 둘째 문장.' } }, CLIPS: { 'entry-A': own ? 'blob:own' : 'blob:local-nar' }, RF_OWN: own ? { 'entry-A': 1 } : {}, RF_ORIG: {}, RF_ST: {}, RF_WHY: {},
      ESD: { V0: null, vurl: '', vBusy: null }, ES: { prepVoice: (b, n, nar) => { got = { n, nar }; return { v: 1 }; }, sentN: (t) => String(t).split('.').filter((x) => x.trim()).length }, rfPaint: () => {}, render: () => {},
      fetch: () => Promise.resolve({ ok: true, arrayBuffer: () => Promise.resolve({}) }), esdDecode: () => Promise.resolve('buf') }; sb.window = sb;
    vm.createContext(sb); vm.runInContext(code, sb); sb.esdPrepVoice(); for (let i = 0; i < 12; i++) await flush(); return got; };
  let a = await run8(CS, false), o = await run8(CS, true);
  ok('⑧ [ESD_NAR_KIND] 로컬 성우 파일도 나레이션(성우 글 문장 수 · «입장!» 앞 쉼) · 두 분 소리는 두 분 글', !!a && a.nar === true && a.n === 2 && !!o && o.nar === false && o.n === 1, { a, o });
  const b = brk(CS, [['var isNar = !(RF_OWN[c.slug] && url === CLIPS[c.slug]), ek', "var isNar = url === PARAM.clipDir + c.file + '.mp3', ek"]]); a = b ? await run8(b, false) : null;
  ok('깨 보기 ⑧ — 옛 꼴이면 빨강', !!a && a.nar === false, a); }
{ /* ⑨ FIRE_STOP_PREV */
  const run9 = (src) => { const code = ['fire'].map((f) => grabIn(src, f)).join('\n'); const prev = () => {};
    const aN = { paused: false, onended: prev, onerror: prev, onloadedmetadata: prev, pause() { this.paused = true; } };
    const c1 = { k: 'entry', slug: 'entry-A', name: '입장', duck: -20 };
    const sb = { R: { cues: [{ k: 'g', name: '화촉', duck: -20 }, c1] }, aNarr: aN, finish: () => {}, clearT: () => {}, conMark: () => {}, STALL: -1, cur: 0, fired: {}, shown: {}, GWHY: null, liveT0: 0, castNow: null, blkFresh: false, blkNow: '', phase: 'live', cheerAt: -1,
      resolve: (c) => c, ESD: { run: null }, esdIn: () => true, esdMain: () => true, esdStop: () => {}, doorMark: () => {}, segGo: () => {}, segOfCue: () => '', render: () => {}, audioOn: () => {}, duckTo: () => {}, playClip: () => {}, toast: () => {}, later: () => {},
      PARAM: { duck: { leadMs: 800 }, fadeDownMs: 400 }, MODE: 'console', duckWant: -20, GUEST: false, fmt: (x) => String(x) };
    vm.createContext(sb); vm.runInContext(code, sb); sb.fire(1); return { paused: aN.paused, ended: aN.onended === null }; };
  let r = run9(CS); ok('⑨ [FIRE_STOP_PREV] 큐 목록에서 입장으로 건너뛰면 앞 말소리를 멈추고 끝 처리를 떼어 낸다', r.paused && r.ended, r);
  const b = brk(CS, [['  try { aNarr.onended = aNarr.onerror = aNarr.onloadedmetadata = null; if (!aNarr.paused) aNarr.pause(); } catch (e) {}\n', '']]); r = b ? run9(b) : null;
  ok('깨 보기 ⑨ — 옛 꼴이면 빨강', !!r && !r.paused && !r.ended, r); }
{ /* ⑩ CON_STALL */
  const run10 = (src, flowing) => { const code = grabIn(src, 'playSrc') + '\n' + lineIn(src, /var STALL = -1;/) + '\n' + grabIn(src, 'conStall'); const T = [];
    const aN = { duration: NaN, currentTime: 0, paused: false, ended: false, src: '', play() { return Promise.resolve(); }, pause() { this.paused = true; }, getAttribute: () => '' };
    let cbv = null; const sb = { aNarr: aN, timers: [], stopProg: () => {}, runProg: () => {}, gUnlockOff: () => {}, GUEST: false, MODE: 'console', wired: true, AC: { state: 'running' }, cur: 3, phase: 'clip', render: () => {}, toast: () => {},
      setTimeout: (f) => { T.push(f); return T.length; }, clearTimeout: () => {}, Math, isFinite };
    vm.createContext(sb); vm.runInContext(code, sb); sb.playSrc('blob:x', 3, (o) => { cbv = o; });
    aN.duration = 10; aN.onloadedmetadata(); aN.currentTime = 2; if (!flowing) aN.paused = true; T[T.length - 1]();
    const first = { cb: cbv, phase: sb.phase, stall: sb.STALL };
    if (flowing) { aN.currentTime = 9.95; aN.paused = true; aN.ended = true; T[T.length - 1](); }
    return { first, cb: cbv, phase: sb.phase, stall: sb.STALL }; };
  let r = run10(CS, false); ok('⑩ [CON_STALL] 2초에서 멈춘 10초 소리 — 안전 타이머가 울려도 성공 처리하지 않고 자동 진행을 세운다(phase done · STALL)', r.cb === null && r.phase === 'done' && r.stall === 3, r);
  let f = run10(CS, true); ok('⑩ [CON_STALL] 흐르는 중이면 남은 만큼 다시 기다리고 · 끝까지 가면 성공', f.first.cb === null && f.first.phase === 'clip' && f.cb === true, f);
  const b = brk(CS, [["    if (!GUEST && MODE !== 'preview' && left > 1) {", '    if (false) {']]); r = b ? run10(b, false) : null;
  ok('깨 보기 ⑩ — 옛 꼴이면 빨강', !!r && r.cb === true, r);
  ok('⑩ [CON_STALL] 입장 장면(Web Audio)도 소리 장치가 멈춰 있었으면 다 나간 것으로 치지 않는다', CS.includes("later(function(){ if (ESD.run === run && a.state !== 'running') { conStall(); return; } if (!ESD.run || ESD.run === run) done(); }"));
  ok('⑩ [CON_STALL] 멈춘 줄엔 디렉터 칸에 할 일 한 줄([뒤로] 뒤 다시 누르면 처음부터)', /if \(STALL === cur && phase === 'done'\) htxt = '소리가 중간에 멈췄어요 · 연결을 확인하고 \[뒤로\] 뒤 다시 누르면 이 줄을 처음부터 내보내요'/.test(CS)); }
{ /* ⑪ CON_RELOAD_GUARD */
  const reg = lineIn(CS, /window\.addEventListener\('beforeunload'[^\n]*/); let h = null;
  const sb = { window: { addEventListener: (t, f) => { if (t === 'beforeunload') h = f; } }, GUEST: false, R: { cues: [1, 2, 3] }, cur: 1, phase: 'live', $: () => ({ classList: { contains: () => true } }) };
  vm.createContext(sb); try { vm.runInContext(reg, sb); } catch (e) {}
  let pd = 0; const ev = { preventDefault: () => { pd++; }, returnValue: 'x' }; if (h) h(ev); const live = pd === 1 && ev.returnValue === '';
  sb.phase = 'end'; pd = 0; if (h) h({ preventDefault: () => { pd++; } }); const end = pd === 0;
  ok('⑪ [CON_RELOAD_GUARD] 진행 중 새로고침은 브라우저가 묻는다 · 끝난 뒤엔 묻지 않는다', !!h && live && end);
  const i = CS.indexOf("(function(){ if (GUEST) return; try { var m = JSON.parse(sessionStorage.getItem('me_con_at')"), j = i < 0 ? -1 : CS.indexOf('})();', i);
  const el = { textContent: '', hidden: true }; const sb2 = { GUEST: false, sessionStorage: { getItem: () => JSON.stringify({ q: '?rf=AB12CD', i: 7, n: '입장 인사', at: Date.now() }) }, location: { search: '?rf=AB12CD' }, $: () => el, JSON, Date, String };
  vm.createContext(sb2); if (i >= 0) vm.runInContext(CS.slice(i, j + 5), sb2);
  ok('⑪ [CON_RELOAD_GUARD] 다시 열면 시작 단추 위 «진행하던 순서 · 입장 인사»', !el.hidden && /진행하던 순서 · 입장 인사/.test(el.textContent), el);
  ok('⑪ [CON_RELOAD_GUARD] 새 순서마다 적고(fire) · 끝내면 지운다(finish · 나가기)', /STALL = -1; conMark\(i\);/.test(CS) && /esdStop\(2\); conMarkOff\(\);/.test(CS) && /esdStop\(0\.3\); conMarkOff\(\);/.test(CS)); }

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
  await pg.evaluate(() => { courseStarted = true; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; window.__st = 0;
    window._vc0 = (op) => { if (op === 'status') window.__st++; return new Promise(() => {}); }; });
  /* ① */
  const sc1 = () => pg.evaluate(async () => { const V8 = '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 V8)', V6 = '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6)';
    VC.st = null; VC.stErr = true; VC.stWhy = V8; const box8 = _vcErrBox(), fail8 = _vcStFail('x'); VC.stWhy = V6; const box6 = _vcErrBox(), fail6 = _vcStFail('x'); VC.stErr = false;
    const nr8 = _nrBtns(V8), nr2 = _nrBtns('AI 목소리가 막혔어요 (코드 V2)');
    const msgs = []; const on = (e) => { if (e.data && e.data.type) msgs.push(e.data); }; window.addEventListener('message', on); const E0 = EMBED; EMBED = true;
    _autoState = 'fail'; _autoWhy = '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 S8)'; let ob = document.getElementById('obSave'); if (!ob) { ob = document.createElement('button'); ob.id = 'obSave'; document.body.appendChild(ob); }   // 머리 단추는 마이페이지 안(embed)에서만 생긴다 — 글은 _autoPaint 가 정한다
    _autoPaint(); const obT = ob.textContent; _autoState = ''; _autoWhy = '';
    _saveErr = '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 S8)'; idx = STEPS.length - 1; try { render(); } catch (e) {} const nx = document.getElementById('next'), nxT = nx ? nx.textContent : '', se = (document.querySelector('.save-err') || {}).textContent || '';
    if (nx) nx.click(); await new Promise((r) => setTimeout(r, 30)); _saveErr = ''; EMBED = E0; window.removeEventListener('message', on);
    return { box8: /로그인하기/.test(box8) && !/지금 다시 불러오기/.test(box8), fail8: /로그인하기/.test(fail8) && !/다시 불러오기/.test(fail8), box6: /지금 다시 불러오기/.test(box6) && !/로그인하기/.test(box6), fail6: /다시 불러오기/.test(fail6),
      nr8: /로그인하기/.test(nr8) && /닫기/.test(nr8), nr2: !/로그인하기/.test(nr2) && /닫기/.test(nr2), obT, nxT, se: /로그인하기/.test(se) && !/다시 저장하기/.test(se), msgs: msgs.filter((m) => m.type === 'momentedit:orderRelogin').map((m) => m.ecode) }; });
  let r = await sc1(); ok('① [RELOGIN_BTN] 로그인 풀림(V8 · S8)에는 «로그인하기»(상태 칸 · 창 · 머리 · 저장 단추 · 저장 실패 글) · 누르면 마이페이지에 orderRelogin · 다른 실패는 종전 그대로',
    r.box8 && r.fail8 && r.box6 && r.fail6 && r.nr8 && r.nr2 && r.obT === '로그인하기' && r.nxT === '로그인하기' && r.se && r.msgs.length === 1 && r.msgs[0] === 'S8', r);
  { const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
    ok('① [RELOGIN_BTN] 머리 «로그인하기»를 누르면 저장 대신 로그인으로(mkRelogin)', OP.includes("    if(_autoState==='fail'&&_isSess(_autoWhy)){ mkRelogin(_ecCodeOf(_autoWhy)); return; }   // [RELOGIN_BTN]\n    window._saveBakeSend(); });")); }
  let mis = await pg.evaluate(REDEF('_vcErrBox', [['(lg?_reloginBtn(', '(false?_reloginBtn(']]));
  r = await sc1(); ok('깨 보기 ① — 옛 꼴(로그인 풀림에도 «지금 다시 불러오기»)이면 빨강', !mis && !r.box8, { mis, box8: r.box8 });
  await pg.reload({ waitUntil: 'load' }); await wait(500);
  await pg.evaluate(() => { courseStarted = true; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; window.__st = 0;
    window._vc0 = (op) => { if (op === 'status') window.__st++; return new Promise(() => {}); }; });
  /* ② */
  const sc2 = () => pg.evaluate(() => { VC.loading = false; VC.stErr = false; VC.read = null; VC.panel = null; VC.st = { ok: true, groom: { consent: false, ready: false, left: 19 }, bride: { consent: false, ready: false, left: 19 } };
    window.__st = 0; VC.stAt = Date.now() - 5000; document.dispatchEvent(new Event('visibilitychange')); const fresh = window.__st; VC.loading = false;
    VC.stAt = Date.now() - 120000; document.dispatchEvent(new Event('visibilitychange')); const stale = window.__st; VC.loading = false; return { fresh, stale }; });
  r = await sc2(); ok('② [VC_ST_FRESH] 받은 지 1분 넘은 상태는 화면에 돌아올 때 다시 묻는다(1분 안이면 묻지 않는다)', r.fresh === 0 && r.stale === 1, r);
  mis = await pg.evaluate(() => { window._vcStFresh = function(){}; return null; }); r = await sc2();
  ok('깨 보기 ② — 옛 꼴(못 받았을 때만 다시 묻기)이면 빨강', r.stale === 0, r);
  /* ③ ④ */
  const sc3 = () => pg.evaluate(() => { VC.efail = {}; VC.enr = {}; VC.st = { ok: true, groom: { consent: true, ready: true, left: 19, made: '2026-10-29 10:00', deleting: true }, bride: { consent: true, ready: true, left: 19, made: '2026-10-29 10:00' } };
    const a = _vcPeople(true); VC.st = { ok: true, over: true, groom: { consent: true, ready: false, left: 0, deleted: '2026-10-21 09:00' }, bride: { consent: false, ready: false, left: 0 } }; const b = _vcPeople(true);
    return { old: (a.match(/이전 것은 지우는 중이에요 · 매일 다시 지워요/g) || []).length, made: /목소리 생성/.test(a), overB: /예식이 끝나 새 목소리는 만들 수 없어요/.test(b), overG: /지웠어요/.test(b), noBtn: !/data-fk="mkvcok:/.test(b), noUsed: !/만들기를 다 썼어요/.test(b) }; });
  r = await sc3(); ok('③ [VC_OLD_DEL] 새 목소리 준비 + 이전 것 지우는 중이면 카드에 한 줄(지우는 분만)', r.old === 1 && r.made, r);
  ok('④ [VC_WED_OVER] 예식이 끝났으면 만들기 단추 없이 «예식이 끝나 새 목소리는 만들 수 없어요» · 지운 분은 «지웠어요» · «다 썼어요»라 하지 않는다', r.overB && r.overG && r.noBtn && r.noUsed, r);
  mis = await pg.evaluate(REDEF('_vcPeople', [["+(p.ready&&p.deleting?'<span class=\"mk-vhow\">'", "+(false?'<span class=\"mk-vhow\">'"], ["(VC.st.over?(p.deleted?", "(false?(p.deleted?"]]));
  r = await sc3(); ok('깨 보기 ③ ④ — 옛 꼴이면 빨강', !mis && r.old === 0 && !r.overB, { mis, r });
  ok('식순 화면 pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} finally { await br.close(); srv.close(); }
console.log(fail ? `\n★ 실패 ${fail}건` : '\nVC FIX5 1030 OK'); process.exit(fail ? 1 : 0);
