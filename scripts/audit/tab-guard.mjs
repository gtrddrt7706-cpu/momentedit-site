#!/usr/bin/env node
/* ★[TAB_GUARD_1030 · TAB_GUARD · RELOGIN_MERGE · EDIT_T_AT_INPUT · EMPTY_TOMBSTONE 2026-10-30 GPT 11차 점검(고객) 11-01 ~ 11-05]
   ★[TAB_GUARD2_1030 · TAB_GUARD_VC · TAB_GUARD_FILL · PREVIEW_KEY_SPLIT · STALE_KEEP_INPUT · TOMBSTONE_READ · AUTH_EPOCH 2026-10-30 GPT 12차 점검(고객) 12-01 ~ 12-06] ⑥ ~ ⑪ 아래
   같은 기기 두 창(탭)이 한 localStorage 를 나눠 쓸 때 옛 창이 지금 계정 · 최신 초안을 덮거나 지우지 않는지 잰다.
   창마다 mypage.html 함수 원문을 떼어 vm 하나씩에 싣고, 저장소는 하나를 나눠 쓴다 — 한 창이 쓰거나 지우면 다른 창에 storage 이벤트가 간다(브라우저와 같다).
   식순 화면(order-preview.html)은 _persist 원문을 떼어 부모 창(그 vm)의 _tabStale 을 보게 한다.
   ① 11-05 계정 가의 옛 창 · 다른 창이 계정 나로 로그인 → 옛 창의 «로그인하기» · 로그아웃 · 저장이 나의 토큰 · 초안을 지우거나 나의 토큰을 붙여 보내지 않는다 · 보내는 중이던 답도 버린다 · 한 줄 «다른 창에서 바뀌었어요 (코드 L8)» · 단추 «다시 열기»
   ② 11-03 다른 창이 다시 로그인해 맡긴 최신본을 되돌린 뒤 옛 창이 앱을 내리거나(스냅) 다시 그려도(식순) 최신본을 덮지 않는다 · 같은 토큰이어도 되돌리기 표시(me_relogin_rst)로 옛 창이 된다
   ③ 11-04 옛 창의 다시 맡기기가 최신 맡김을 옛 판으로 바꾸지 않는다 · 맡길 때 앞서 맡긴 것과 종류마다 고친 때로 합치고 이번에 없는 종류는 그대로
   ④ 11-02 다 비운 스냅 임시본은 비운 때를 남긴다({empty:true, t}) — 다시 로그인해도 옛 메모가 되살아나지 않는다 · 카드는 «스냅 기획하기»
   ⑤ 11-01 고친 때는 입력한 그때 — 먼저 입력하고 나중에 내린 창이 나중에 고친 창을 이기지 않는다
   ★[TAB_GUARD3_1030 · ACCT_KEYS · FRAME_READY_BACK · SAME_ACCT_T · KEEP_FAIL_STOP · DL_GUARD · EPOCH_VERIFY 2026-10-30 GPT 13차 점검(고객) 13-01 ~ 13-07] ⑫ ~ ⑱ 아래
   이 기기 초안은 계정 칸(me_order_<코드> · me_relogin_keep_<코드> · me_snapLocal_<코드>) — 위 장면도 그 칸으로 잰다 · 옛 공용 칸은 열 때 옮긴다(⑱)
   깨 보기: 고친 줄을 옛 꼴로 되돌려 같은 장면이 빨개지는지 본다. TG_MP · TG_OP 로 다른 판(예: 옛 main)을 재면 빨강이 나와야 한다.
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const grabIn = (src, name) => { let i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const RELAY = (src) => { const s0 = "if(d.type==='momentedit:voiceClone' && d.data && d.data.op){"; const i = src.indexOf(s0); if (i < 0) return '';
  let d = 0; for (let k = i + s0.length - 1; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const brk = (src, pairs) => { let t = src; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0)); };
const MP = fs.readFileSync(process.env.TG_MP || path.join(ROOT, 'mypage.html'), 'utf8');
const OP = fs.readFileSync(process.env.TG_OP || path.join(ROOT, 'order-preview.html'), 'utf8');
const FNS = ['getToken', 'setToken', '_tabEpBump', '_tabEpFail', '_tabStaleMark', '_acctOk', '_ordK', '_keepK', '_recE', '_acctKeysMigrate', '_acctOldSweep', '_tabTie', '_tabSd', '_tabKeepUnkept', '_snapLocalRec', '_tabBind', '_tabStale', '_tabStaleShow', '_tabDrop', '_tabWatch', 'clearToken', '_reloginStash', '_reloginCode', '_reloginAcct', '_reloginPack',
  '_reloginKeyNewer', '_reloginStampT', '_reloginLine', '_reloginRestore', '_reloginCurNewer', '_reloginSnapNewer', '_reloginFailShow', '_reloginGoAnyway', '_reloginShowLogin',
  '_errGoLogin', '_saveSessAsk', '_mpLogoutNow', '_post', 'readCachedState', '_snapLocalKey', '_snapLocalGet', '_snapLocalDel', '_snapLocalPut', '_snapEditMark', '_snapOut', '_snapFilledD', '_snapNewD', '_snapZoneNew'];
const MUST = ['clearToken', '_reloginPack', '_reloginRestore', '_errGoLogin', '_post', '_snapLocalPut', '_snapOut', '_mpLogoutNow'];
const OK_A = 'me_order_AAAAAA', OK_B = 'me_order_BBBBBB', KK_A = 'me_relogin_keep_AAAAAA', KK_B = 'me_relogin_keep_BBBBBB';
const KEEPGO = (src) => (src.match(/window\.rfKeepGo=function\(f\)\{[\s\S]*?\};/) || [''])[0];   // [DL_GUARD] 내려받기 폼 들머리(원문)
const TAB_LINE = '다른 창에서 바뀌었어요 (코드 L8)';
const A = 'AAAAAA', B = 'BBBBBB';
const clock = { now: 1.7e12 };
const FakeDate = function () { return new Date(clock.now); }; FakeDate.now = () => clock.now;

/* 한 저장소를 나눠 쓰는 창들 */
function shared(init) { const m = new Map(Object.entries(init || {})), wins = [];
  const fire = (from, key, oldValue, newValue) => { for (const w of wins) if (w !== from) { if (w.mute) { w.held.push({ key, oldValue, newValue }); continue; } for (const f of (w.L.storage || [])) { try { f({ key, oldValue, newValue }); } catch (e) {} } } };   // mute = 이 창에는 이벤트가 늦게 온다(12-06)
  const view = (w, quota) => ({ getItem: (k) => (m.has(k) ? m.get(k) : null), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; },
    setItem: (k, v) => { if (quota && quota(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } const o = m.has(k) ? m.get(k) : null; m.set(k, String(v)); if (o !== String(v)) fire(w, k, o, String(v)); },
    removeItem: (k) => { if (!m.has(k)) return; const o = m.get(k); m.delete(k); fire(w, k, o, null); } });
  return { m, wins, view, get: (k) => (m.has(k) ? m.get(k) : null), set: (k, v) => m.set(k, String(v)) }; }
function mkDoc(W) { const els = new Map();
  const mk = (tag) => { const el = { tag, id: '', style: {}, kids: [], textContent: '', attrs: {}, L: {}, setAttribute(k, v) { this.attrs[k] = v; }, appendChild(c) { this.kids.push(c); },
    addEventListener(t, f) { (this.L[t] = this.L[t] || []).push(f); }, click() { (this.L.click || []).forEach((f) => f()); } }; Object.defineProperty(el, 'innerHTML', { set(v) { el.textContent = String(v); }, get() { return el.textContent; } }); return el; };
  return { visibilityState: 'visible', createElement: mk, getElementById: (id) => els.get(id) || null, body: { appendChild(el) { if (el.id) els.set(el.id, el); } },
    addEventListener(t, f) { (W.L['doc:' + t] = W.L['doc:' + t] || []).push(f); } }; }
/* 창 하나 — o.acct 이 창이 그린 계정 · o.quota 이 창의 쓰기 실패 */
function win(S, src, o) { o = o || {};
  const code = FNS.map((f) => grabIn(src, f)).join('\n') + '\n' + [/var RELOGIN_KEY=[^\n]*/, /var TAB_RST_KEY=[^\n]*/, /var TAB_EP_KEY=[^\n]*/, /var ACCT_OLD_MS=[^\n]*/, /var ERR_W=[^\n]*/, /var ERR_DO=[^\n]*/].map((re) => lineIn(src, re)).join('\n')
    + '\nfunction __start(loc, sd){ ' + lineIn(src, /SNAPFLOW=\{ active:true,[^\n]*/) + '\n}'
    + '\nfunction __start2(sd, p, needAgree, opt){ opt=opt||{};\n' + lineIn(grabIn(src, 'startSnapFlow'), /  var (?:rec=_snapLocalRec\(\), )?loc=[^\n]*\n[\s\S]*?SNAPFLOW=\{ active:true,[^\n]*\n(?:  if\(!loc && rec[^\n]*\n)?/) + '\n}'   // [TOMBSTONE_READ] 편집을 여는 줄들(startSnapFlow 원문)
    + '\nfunction __vcRelay(d){ ' + RELAY(src) + '\n}'   // [TAB_GUARD_VC] 목소리 중계(원문)
    + '\nvar window_rf=null; (function(window){ ' + KEEPGO(src) + '\n window_rf=window.rfKeepGo; })(window);'
    + '\nif(typeof _tabBind=="function"){ _tabBind(); _tabWatch(); }';
  const W = { L: {}, fetches: [], reloaded: 0, shows: [], notes: [], alerts: [], pend: [], rejs: [], posts: [], mute: false, held: [] };
  const wnd = { _mpStateD: o.acct ? { code: o.acct } : null, addEventListener(t, f) { (W.L[t] = W.L[t] || []).push(f); } };
  const sb = { localStorage: S.view(W, o.quota), sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, window: wnd, document: mkDoc(W), TOKEN_KEY: 'me_token', STATE_CACHE_KEY: 'me_state_v1',
    EXEC_URL: 'x', JSON, Object, String, Math, Promise, Array, Error, Date: FakeDate, setTimeout, clearTimeout, console,
    _mpAcct: () => (wnd._mpStateD && wnd._mpStateD.code) || '', _mpAcctSweep: () => {}, _flowBusy: () => {}, _errSet: (el, t) => { if (el) el.textContent = String(t); return el; }, _errHtml: (t) => String(t),
    _errLine: (x, L) => (x && x.error) || ('로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 ' + L + '8)'), _errCode: (x, L) => L + '8', _errSess: (x) => !!(x && ({ expired: 1, invalid: 1, no_token: 1, tab_stale: 1 })[x.reason]),
    _wizCurId: () => '', _mpFsOpen: () => false, location: { origin: 'x', reload: () => { W.reloaded++; } }, navigator: { onLine: true }, fr: { contentWindow: { postMessage: (m) => W.posts.push(m) } }, closeLedModal: () => {}, show: (v) => W.shows.push(v), softLoginNote: (t) => W.notes.push(t), cleanUrl: () => {},
    mpAlert: (m) => { W.alerts.push(m); }, mpConfirm: (m) => { W.alerts.push(m); return Promise.resolve(false); }, $: () => null,
    fetch: (u, init) => { const body = JSON.parse(init.body); W.fetches.push(body); return new Promise((res, rej) => { W.pend.push((d) => res({ status: 200, json: () => Promise.resolve(d) })); W.rejs.push((e) => rej(e)); }); },
    _snapCollect: () => {}, _snapPickCap: () => 4, SNAP_STEPS: [1, 2, 3, 4, 5], opt: {}, p: null, needAgree: true, SNAPFLOW: { active: false } };
  vm.createContext(sb); vm.runInContext(code, sb); S.wins.push(W); W.sb = sb; W.ls = sb.localStorage;
  W.bar = () => { const b = sb.document.getElementById('mp_tabBar'); return b ? { line: (b.kids[0] || {}).textContent, btn: (b.kids[1] || {}).textContent, el: b } : null; };
  W.hide = () => { sb.document.visibilityState = 'hidden'; for (const f of (W.L['doc:visibilitychange'] || [])) f(); sb._snapLocalPut(); };   // 앱 내림(마이페이지의 visibilitychange → _snapLocalPut)
  W.open = (loc, sd) => { sb.__start(loc, sd); if (typeof sb._snapEditMark === 'function') sb._snapEditMark(); };   // 겹화면을 열면 첫 그리기(renderSnapFlow)가 기준을 잡는다
  W.type = (memo) => { sb.SNAPFLOW.d.zones.candle.note = memo; if (typeof sb._snapEditMark === 'function') sb._snapEditMark(); };   // 겹화면의 input 이벤트
  return W; }
/* 식순 화면(iframe) — 부모 창의 _tabStale 을 본다 */
function frame(S, src, parent, who, Sv) {
  const fn = grabIn(src, '_persist') + '\n' + grabIn(src, '_ordKey') + '\n' + grabIn(src, '_recE') + '\n' + grabIn(src, '_ordNewer'), tg = grabIn(src, '_tabGone'), dl = lineIn(src, /var _editT=[^\n]*/);
  const W = { L: {} }; const sb = { localStorage: S.view(W), JSON, Object, Date: FakeDate, S: Sv, idx: 0, _seenK: {}, courseStarted: true, _doneSaved: false, _who: who, _srvBase: 'k0', _autoLast: 'srv',
    _autoKey: () => JSON.stringify(sb.S), _dirtyMark: () => {}, _closeFit: () => {}, _seamFitKeep: () => {}, _persistBad: false, EMBED: !!parent, _ACCT: parent ? who : '', _fillSeen: true };
  sb.window = { parent: parent ? parent.sb : null }; if (!parent) sb.window.parent = sb.window;
  vm.createContext(sb); vm.runInContext(tg + '\n' + fn + '\n' + dl, sb); S.wins.push(W); return sb; }

const SN = (memo, t) => { const o = { v: 2, zones: { candle: { picks: [], ups: [], links: [], note: memo }, white: { picks: [], ups: [], links: [], note: '' } }, note: '' }; if (t) o.t = t; return JSON.stringify(o); };
const memoOf = (v) => { try { const j = JSON.parse(v); return j && j.zones ? j.zones.candle.note : (j && j.empty ? '(비움)' : null); } catch (e) { return null; } };
const DR = (txt, who, t, dirty = true) => JSON.stringify(Object.assign({ v: 2, S: { tx: { 'vow.g': txt } }, who, dirty, base: 'k0' }, t ? { t } : {}));
const CACHE = (tok, c) => JSON.stringify({ t: tok, d: { code: c } });
const run = async (f, src, op) => { try { return await f(src, op); } catch (e) { return { err: String(e && e.stack || e).slice(0, 400) }; } };

{ const miss = MUST.filter((f) => !grabIn(MP, f)); if (miss.length) { ok('원문 조각을 못 떼었다 — ' + miss.join(', '), false); process.exit(1); } }

/* ① 11-05 — 계정 가의 옛 창 · 다른 창이 계정 나로 로그인 */
const s1 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), [OK_A]: DR('가의 서약', A, clock.now - 9000), me_snapLocal_AAAAAA: SN('가의 메모', clock.now - 9000) });
  const WA = win(S, src, { acct: A });
  const inflight = WA.sb._post({ action: 'saveProductionTrack', token: WA.sb.getToken(), track: 'snap' });   // 가가 보내던 저장(답이 아직 안 옴)
  const WB = win(S, src, {}); WB.sb.setToken('tb'); S.set('me_state_v1', CACHE('tb', B)); WB.ls.setItem(OK_B, DR('나의 서약', B, clock.now)); WB.ls.setItem('me_snapLocal_BBBBBB', SN('나의 메모', clock.now));
  const barNow = WA.bar();
  WA.pend[0] && WA.pend[0]({ ok: false, reason: 'expired' }); const late = await inflight;   // 가의 옛 토큰으로 «로그인 풀림» 답이 늦게 온다
  if (late && late.ok === false && WA.sb._errSess(late)) WA.sb._errGoLogin(late, 'S');
  WA.sb._errGoLogin({ ok: false, reason: 'expired' }, 'S');   // 떠 있던 실패 창의 «로그인하기»
  await flush();
  const n0 = WA.fetches.length; const sentP = WA.sb._post({ action: 'saveProductionTrack', token: WA.sb.getToken(), track: 'snap', draft: { note: '가의 메모' } });   // 옛 편집창의 저장
  if (WA.pend.length > 1) WA.pend[WA.pend.length - 1]({ ok: true }); const sent = await sentP;
  const nSent = WA.fetches.length - n0, sentTok = nSent ? WA.fetches[WA.fetches.length - 1].token : '';
  WA.sb._mpLogoutNow();   // 옛 창의 로그아웃
  return { tok: S.get('me_token'), order: S.get(OK_B), snapB: S.get('me_snapLocal_BBBBBB'), snapA: S.get('me_snapLocal_AAAAAA'), keep: S.get(KK_A) || S.get(KK_B), late: late && late.reason,
    nSent, sentTok, sentReason: sent && sent.reason, barNow, bar: WA.bar(), shows: WA.shows, reloaded: WA.reloaded, WA };
};
{ const r = await run(s1, MP);
  ok('① 11-05 [TAB_GUARD] 옛 창(계정 가)의 «로그인하기» · 늦게 온 «로그인 풀림» 답 · 로그아웃이 다른 창이 들어온 계정 나의 토큰 · 식순 초안 · 스냅 임시본을 지우지 않는다(맡기지도 않는다)',
    !r.err && r.tok === 'tb' && memoOf(r.snapB) === '나의 메모' && JSON.parse(r.order || '{}').who === B && r.keep === null && r.late === 'tab_stale' && !r.shows.includes('loginView'), r.err || { tok: r.tok, order: r.order, snapB: r.snapB, keep: r.keep, late: r.late, shows: r.shows });
  ok('① 11-05 [TAB_GUARD] 옛 창의 저장은 보내지 않는다(나의 토큰을 가의 메모에 붙이지 않는다)', !r.err && r.nSent === 0 && r.sentReason === 'tab_stale', r.err || { nSent: r.nSent, sentTok: r.sentTok });
  ok('① 11-05 [TAB_GUARD] 다른 창이 바꾸면 바로 한 줄 «다른 창에서 바뀌었어요 (코드 L8)» · 단추 «다시 열기» 하나 · 누르면 새로 연다',
    !r.err && !!r.barNow && r.barNow.line === TAB_LINE && r.barNow.btn === '다시 열기' && r.barNow.el.kids.length === 2 && (r.barNow.el.click.call(r.barNow.el.kids[1]), r.WA.reloaded === 1), r.err || r.barNow); }
{ /* 로그인 전 창 · 같은 창 스스로 로그인 / 로그아웃은 옛 창이 아니다 */
  const f = async (src) => { const S = shared({}); const W1 = win(S, src, {}); const W2 = win(S, src, {}); W2.sb.setToken('tb');
    const pre = { stale: W1.sb._tabStale(), bar: W1.bar() }; W1.sb.setToken('tc'); W1.sb.clearToken(); W1.sb.setToken('td');
    return { pre, self: W1.sb._tabStale(), bar1: W1.bar(), w2: W2.sb._tabStale(), bar2: !!W2.bar() }; };
  const r = await run(f, MP);
  ok('① [TAB_GUARD] 로그인 전 창은 다른 창의 로그인으로 옛 창이 되지 않는다 · 스스로 로그인 · 로그아웃은 기준을 새로 잡는다 · 그 로그인을 본 다른 창은 옛 창', !r.err && r.pre.stale === false && r.pre.bar === null && r.self === false && r.bar1 === null && r.w2 === true && r.bar2 === true, r); }
{ const b = brk(MP, [['function _tabStale(){ if(_TAB.stale) return true;', 'function _tabStale(){ return false;']]); const rb = b ? await run(s1, b) : null;
  ok('깨 보기 ① — 옛 창 판정을 끄면 빨강(나의 토큰이 지워진다)', !!rb && !rb.err && rb.tok !== 'tb', rb && (rb.err || { tok: rb.tok })); }

/* ② 11-03 — 다른 창이 되돌린 최신본을 옛 창이 덮는다 */
const T0 = clock.now;
const s2 = async (src, op) => {
  const KD = DR('되돌린 최신 서약', A, T0 - 1000);
  const S = shared({ me_token: 'ta1', me_state_v1: CACHE('ta1', A), [KK_A]: JSON.stringify({ code: A, t: T0 - 1000, keys: { [OK_A]: KD, me_snapLocal_AAAAAA: SN('최신 메모', T0 - 1000) } }) });
  const OLD = win(S, src, { acct: A }); OLD.open(JSON.parse(SN('옛 메모', T0 - 50000)), {});   // 옛 창 — 옛 스냅 임시본을 연 채
  const OF = frame(S, op, OLD, A, { tx: { 'vow.g': '옛 서약' } });   // 옛 창의 식순 화면
  const NEW = win(S, src, {}); NEW.sb.setToken('ta2'); NEW.sb.window._mpStateD = { code: A };
  const MID = win(S, src, { acct: A }); MID.open(JSON.parse(SN('그 사이 연 창의 메모', T0 - 40000)), {});   // 새 토큰으로 열었지만 되돌리기 전에 연 창
  const back = NEW.sb._reloginRestore(A); const midStale0 = MID.sb._tabStale();   // [AUTH_EPOCH] 되돌린 그때 그 사이 연 창은 이미 옛 창(앱을 내리기 전)
  OLD.hide(); OF._persist(); OLD.sb._snapLocalDel();
  const afterOld = { snap: memoOf(S.get('me_snapLocal_AAAAAA')), order: S.get(OK_A) };
  MID.hide();
  const NF = frame(S, op, NEW, A, { tx: { 'vow.g': '새 창에서 고친 서약' } }); NF._persist();   // 지금 창은 그대로 쓴다
  return { back, afterOld, mid: memoOf(S.get('me_snapLocal_AAAAAA')), midStale: midStale0, nf: JSON.parse(S.get(OK_A) || '{}').S, KD, bar: OLD.bar() };
};
{ const r = await run(s2, MP, OP);
  ok('② 11-03 [TAB_GUARD] 다른 창이 다시 로그인해 최신본을 되돌린 뒤 옛 창이 앱을 내리거나(스냅) · 식순 화면이 다시 써도(_persist) · 지워도 최신본 그대로',
    !r.err && r.back === true && r.afterOld.snap === '최신 메모' && r.afterOld.order === r.KD && !!r.bar, r.err || r);
  ok('② 11-03 [TAB_GUARD] 새 토큰으로 열었어도 되돌리기 전에 연 창은 [AUTH_EPOCH] 차례로 옛 창 — 덮지 않는다 · 지금 창의 식순 화면은 그대로 쓴다',
    !r.err && r.mid === '최신 메모' && r.midStale === true && !!r.nf && r.nf.tx['vow.g'] === '새 창에서 고친 서약', r.err || r); }
{ const bo = brk(OP, [['function _persist(over){ if(typeof _tabGone===\'function\' && _tabGone()) return;', 'function _persist(over){']]); const rb = bo ? await run(s2, MP, bo) : null;
  ok('깨 보기 ② — 식순 화면이 부모의 옛 창 판정을 안 보면 빨강', !!rb && !rb.err && rb.afterOld.order !== rb.KD, rb && (rb.err || rb.afterOld));
  const bm = brk(MP, [["if(put.length && typeof _tabEpBump=='function' && !_tabEpBump()){ _tabEpFail(); return false; }", ""]]); const rm = bm ? await run(s2, bm, OP) : null;
  ok('깨 보기 ② — 되돌리기 차례를 안 남기면 빨강(그 사이 연 창이 옛 창이 되지 않는다)', !!rm && !rm.err && rm.midStale === false, rm && (rm.err || rm.midStale)); }

/* ③ 11-04 — 옛 창의 다시 맡기기 · 맡길 때 합치기 */
const s3 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), [OK_A]: DR('최신 서약', A, T0 - 2000), me_snapLocal_AAAAAA: SN('최신 메모', T0 - 2000) });
  const OLD = win(S, src, { acct: A }); OLD.open(JSON.parse(SN('옛 메모', T0 - 60000)), {});
  const NEW = win(S, src, { acct: A }); NEW.sb._errGoLogin({ ok: false, reason: 'expired' }, 'S');   // 새 창이 로그인 풀림 — 최신본을 맡기고 나간다
  const kept = S.get(KK_A);
  OLD.hide(); OLD.sb._errGoLogin({ ok: false, reason: 'expired' }, 'S');   // 옛 창이 앱을 내렸다가 «로그인하기»
  const k = JSON.parse(S.get(KK_A) || '{"keys":{}}');
  return { same: !!kept && S.get(KK_A) === kept, snap: memoOf(k.keys.me_snapLocal_AAAAAA), order: k.keys[OK_A] && JSON.parse(k.keys[OK_A]).S.tx['vow.g'], dev: memoOf(S.get('me_snapLocal_AAAAAA')) };
};
{ const r = await run(s3, MP);
  ok('③ 11-04 [TAB_GUARD] 옛 창이 내렸다가 «로그인하기»를 눌러도 최신 맡김(최신 서약 · 최신 메모)을 옛 판으로 바꾸지 않는다', !r.err && r.same === true && r.snap === '최신 메모' && r.order === '최신 서약' && r.dev === null, r); }
const s3m = async (src) => {   /* 한 창 · 앞서 맡긴 꾸러미가 있는데 다시 맡긴다 */
  const one = (dev, keep, kk) => { const S = shared(Object.assign({ me_token: 'ta', me_state_v1: CACHE('ta', A), [kk || KK_A]: JSON.stringify(keep) }, dev)); const W = win(S, src, { acct: A });
    W.sb.clearToken(true); const k = JSON.parse(S.get(KK_A) || '{"keys":{}}').keys; return { order: k[OK_A] && JSON.parse(k[OK_A]).S.tx['vow.g'], snap: memoOf(k.me_snapLocal_AAAAAA), keys: Object.keys(k).sort().join(','), kb: S.get(KK_B) }; };
  const KEEP = { code: A, t: T0 - 3000, keys: { [OK_A]: DR('맡긴 최신 서약', A, T0 - 3000), me_snapLocal_AAAAAA: SN('맡긴 메모', T0 - 3000) } };
  return { older: one({ [OK_A]: DR('이 기기의 옛 서약', A, T0 - 90000) }, KEEP),   // 이 기기 식순이 더 옛것 · 스냅은 되돌리다 못 씀(이 기기에 없음)
    newer: one({ [OK_A]: DR('이 기기에서 나중에 고친 서약', A, T0 - 100), me_snapLocal_AAAAAA: SN('이 기기에서 나중에 고친 메모', T0 - 100) }, KEEP),
    noT: one({ [OK_A]: DR('고친 때 없는 옛 판', A, 0) }, { code: A, t: T0 - 3000, keys: { [OK_A]: DR('맡긴 서약(때 없음)', A, 0) } }),
    saved: one({ [OK_A]: DR('저장한 판', A, 0, false) }, KEEP),   // 이 기기 식순은 저장된 판 — 옛 맡김 식순을 다시 싣지 않는다
    other: one({ [OK_A]: DR('이 기기 서약', A, T0 - 100) }, { code: B, t: T0 - 3000, keys: { me_snapLocal_BBBBBB: SN('남의 메모', T0) } }, KK_B) };
};
{ const r = await run(s3m, MP);
  ok('③ 11-04 [RELOGIN_MERGE] 다시 맡길 때 앞서 맡긴 것과 종류마다 고친 때를 견준다 — 더 옛 이 기기 식순은 맡긴 최신 서약에 진다 · 이번에 없는 스냅(되돌리다 못 씀)은 맡긴 메모 그대로',
    !r.err && r.older.order === '맡긴 최신 서약' && r.older.snap === '맡긴 메모', r.err || r.older);
  ok('③ 11-04 [RELOGIN_MERGE] 이 기기 것이 더 나중에 고친 것이면 그것 · 고친 때가 없으면 맡긴 때로 견준다 · 이 기기에 저장한 판이 있으면 옛 맡김 식순을 싣지 않는다 · 다른 계정 맡김과는 합치지 않는다',
    !r.err && r.newer.order === '이 기기에서 나중에 고친 서약' && r.newer.snap === '이 기기에서 나중에 고친 메모' && r.noT.order === '맡긴 서약(때 없음)' && r.saved.order === undefined && r.saved.snap === '맡긴 메모' && r.other.keys === OK_A && !!r.other.kb && JSON.parse(r.other.kb).code === B, r.err || r); }
{ const b = brk(MP, [["if(same) [ok, sk]", "if(false) [ok, sk]"]]); const rb = b ? await run(s3m, b) : null;
  ok('깨 보기 ③ — 합치지 않고 바꾸면 빨강(맡긴 스냅이 사라진다)', !!rb && !rb.err && rb.older.snap !== '맡긴 메모', rb && (rb.err || rb.older));
  const b2 = brk(MP, [['function _tabStale(){ if(_TAB.stale) return true;', 'function _tabStale(){ return false;']]); const r2 = b2 ? await run(s3, b2) : null;
  ok('깨 보기 ③ — 옛 창 판정을 끄면 빨강(옛 창이 맡김을 바꾼다)', !!r2 && !r2.err && r2.same === false, r2); }

/* ④ 11-02 — 다 비우면 비운 때를 남긴다 */
const s4 = async (src) => {
  const KEEP = JSON.stringify({ code: A, t: T0 - 5000, keys: { me_snapLocal_AAAAAA: SN('이전 메모', T0 - 5000) } });
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), me_snapLocal_AAAAAA: SN('이전 메모', T0 - 5000), [KK_A]: KEEP });
  const W = win(S, src, { acct: A }); W.open(JSON.parse(SN('이전 메모', T0 - 5000)), {});
  clock.now = T0 - 2000; W.type(''); clock.now = T0; W.hide();   // 마지막 메모까지 비우고 앱을 내림
  const dev = S.get('me_snapLocal_AAAAAA'), card = W.sb._snapLocalGet();
  const back = W.sb._reloginRestore(A);   // 같은 계정으로 다시 로그인
  return { dev, card, back, after: memoOf(S.get('me_snapLocal_AAAAAA')), card2: W.sb._snapLocalGet(), keep: S.get(KK_A) };
};
{ const r = await run(s4, MP);
  ok('④ 11-02 [EMPTY_TOMBSTONE] 다 비우면 기록을 지우지 않고 비운 때를 남긴다 · 카드는 «스냅 기획하기»(읽지 않는다)', !r.err && !!r.dev && JSON.parse(r.dev).empty === true && JSON.parse(r.dev).t === T0 - 2000 && r.card === null, r);
  ok('④ 11-02 [EMPTY_TOMBSTONE] 다시 로그인해도 비운 칸에 이전 메모가 되살아나지 않는다(비운 때가 더 나중) · 맡김은 지운다', !r.err && r.after === '(비움)' && r.card2 === null && r.keep === null, r); }
{ const f = async (src) => { const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) }); const W = win(S, src, { acct: A }); W.open(null, {}); W.hide(); return S.get('me_snapLocal_AAAAAA'); };
  const r = await run(f, MP); ok('④ 11-02 한 번도 고치지 않은 빈 판은 종전대로 남기지 않는다', r === null, r); }
{ const b = brk(MP, [['else if(SNAPFLOW.t) localStorage.setItem(k, JSON.stringify({v:2, empty:true, t:SNAPFLOW.t, w:_w}));', '']]); const rb = b ? await run(s4, b) : null;
  ok('깨 보기 ④ — 비울 때 지우면 빨강(이전 메모가 되살아난다)', !!rb && !rb.err && rb.after === '이전 메모', rb); }

/* ⑤ 11-01 — 고친 때는 입력한 그때 */
const s5 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
  const W1 = win(S, src, { acct: A }); W1.open(null, {}); W1.hide();
  const W2 = win(S, src, { acct: A }); W2.open(null, {}); W2.hide();
  clock.now = T0 + 1000; W1.type('창1에서 먼저 쓴 메모');
  clock.now = T0 + 2000; W2.type('창2에서 나중에 쓴 메모'); clock.now = T0 + 2100; W2.hide(); W2.sb._reloginStash();   // 창2 — 나중 입력 · 맡김
  clock.now = T0 + 3000; W1.hide();   // 창1을 나중에 내린다
  const t1 = JSON.parse(S.get('me_snapLocal_AAAAAA') || '{}').t, w1Stale = W1.sb._tabStale();
  const back = W2.sb._reloginRestore(A); clock.now = T0;
  return { t1, w1Stale, back, memo: memoOf(S.get('me_snapLocal_AAAAAA')), keep: S.get(KK_A) };
};
{ const r = await run(s5, MP);
  ok('⑤ 11-01 [EDIT_T_AT_INPUT] · 13-03 [SAME_ACCT_T] 먼저 입력하고 나중에 내린 창은 나중에 고친 창2의 기록을 덮지 않는다(창1은 옛 창) · 되돌리면 창2의 메모', !r.err && r.t1 === T0 + 2000 && r.w1Stale === true && r.memo === '창2에서 나중에 쓴 메모' && r.keep === null, r); }
{ const b = brk(MP, [['if(SNAPFLOW._lj==null) SNAPFLOW._lj=j; else if(SNAPFLOW._lj!==j){ SNAPFLOW._lj=j; SNAPFLOW.t=Date.now(); _snapLocalPut(); } }catch(e){} }', 'if(SNAPFLOW._lj==null) SNAPFLOW._lj=j; }catch(e){} }'],
    ['if(SNAPFLOW._lj==null) SNAPFLOW._lj=JSON.stringify(o);', 'var j=JSON.stringify(o); if(SNAPFLOW._lj==null) SNAPFLOW._lj=j; else if(SNAPFLOW._lj!==j){ SNAPFLOW._lj=j; SNAPFLOW.t=Date.now(); }']]);
  const rb = b ? await run(s5, b) : null;
  ok('깨 보기 ⑤ — 쓸 때 고친 때를 적으면(옛 꼴) 빨강', !!rb && !rb.err && rb.memo === '창1에서 먼저 쓴 메모', rb); }

/* ⑥ 12-01 [TAB_GUARD_VC] 목소리 중계(_post 를 거치지 않는다) — 옛 창 · 그 사이 바뀐 답 · 다시 묻기 */
const s6 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
  const WA = win(S, src, { acct: A }); const WB = win(S, src, {});
  /* (가) 보내는 중에 다른 창이 나로 로그인 — 늦은 답 */
  WA.sb.__vcRelay({ type: 'momentedit:voiceClone', data: { op: 'delete', rid: 'r1', who: 'groom' } });
  const sent1 = WA.fetches.map((f) => f.token);
  WB.sb.setToken('tb'); S.set('me_state_v1', CACHE('tb', B));
  WA.pend[0] && WA.pend[0]({ ok: true, deleted: 1 }); await flush();
  const late = WA.posts.find((m) => m.rid === 'r1') || null;
  /* (나) 이미 옛 창 — 보내지 않는다 */
  const n0 = WA.fetches.length; WA.sb.__vcRelay({ type: 'momentedit:voiceClone', data: { op: 'delete', rid: 'r2', who: 'groom' } }); await flush();
  const stale = { n: WA.fetches.length - n0, toks: WA.fetches.slice(n0).map((f) => f.token), ans: WA.posts.find((m) => m.rid === 'r2') || null };
  /* (다) 끊긴 뒤 다시 묻기 전에 바뀜 — 다시 묻지 않는다(지금 계정 토큰을 붙이지 않는다) */
  const S2 = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) }); const W2 = win(S2, src, { acct: A }); const W3 = win(S2, src, {});
  W2.sb.__vcRelay({ type: 'momentedit:voiceClone', data: { op: 'make', rid: 'r3' } });
  W3.sb.setToken('tb'); const e = new TypeError('Failed to fetch'); W2.rejs[0] && W2.rejs[0](e); await flush();
  const retry = { toks: W2.fetches.map((f) => f.token), ans: W2.posts.find((m) => m.rid === 'r3') || null };
  return { sent1, late, stale, retry, bar: !!WA.bar() };
};
{ const r = await run(s6, MP);
  ok('⑥ 12-01 [TAB_GUARD_VC] 목소리 중계 — 보내는 중 다른 창이 다른 계정으로 로그인하면 늦게 온 성공 답을 옛 식순 화면에 넘기지 않는다(«다른 창에서 바뀌었어요 (코드 L8)»)',
    !r.err && r.sent1.join() === 'ta' && !!r.late && r.late.ok === false && r.late.reason === 'tab_stale' && r.late.ecode === 'L8' && r.bar, r.err || r);
  ok('⑥ 12-01 [TAB_GUARD_VC] 옛 창의 «지우기»는 보내지 않는다(지금 계정 토큰을 붙이지 않는다) · 끊긴 뒤 다시 묻기도 그 사이 바뀌었으면 보내지 않는다',
    !r.err && r.stale.n === 0 && !!r.stale.ans && r.stale.ans.reason === 'tab_stale' && r.retry.toks.join() === 'ta' && !!r.retry.ans && r.retry.ans.reason === 'tab_stale', r.err || r); }
{ const b = brk(MP, [['if(_vcTie && _vcTie()){ _vcBack({}); return; }   // [TAB_GUARD_VC] 옛 창', 'if(0){ _vcBack({}); return; }   // [TAB_GUARD_VC] 옛 창']]); const rb = b ? await run(s6, b) : null;
  ok('깨 보기 ⑥ — 중계 들머리 판정을 빼면 빨강(옛 창이 지금 계정 토큰으로 지우기를 보낸다)', !!rb && !rb.err && rb.stale.n > 0 && rb.stale.toks.includes('tb'), rb && (rb.err || rb.stale)); }

/* ⑦ 12-02 [TAB_GUARD_FILL] 늦은 orderReady / orderFill — 옛 식순 화면이 지금 계정 초안을 «주인이 다르다»며 지우지 않는다 */
const FILL = (src) => { const s0 = "if(ev.data.type==='momentedit:orderFill'){"; const i = src.indexOf(s0); if (i < 0) return '';
  let d = 0; for (let k = i + s0.length - 1; k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
function fillFrame(S, src, parent, restoredWho) {
  const got = [];
  const sb = { localStorage: S.view({ L: {} }), sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, JSON, Object, String, Math, Date: FakeDate, S: { a: 1 }, _S0: '{"a":0}',
    RitualOpen: { FEATURE: {}, setPost: () => {}, picked: () => [] }, buildSteps: () => {}, render: () => { sb.renders++; }, renders: 0, CUST: null, CUSTDIG: false, CUSTPHOTO: false, CUSTTBL: 0, CUSTGUIDE: false, CUSTMEAL: false,
    _restored: !!restoredWho, _who: restoredWho, _fillSeen: false, courseStarted: true, _doneSaved: false, _seenK: {}, idx: 0, PR_FROM_MP: false, EMBED: true, _ACCT: restoredWho || '', _navKey: 'x',
    _srvBase: '', _autoLast: '', _editT: 0, _editK: null, _editE: 0, _autoKey: () => '', got,
    _applySaved: (v) => { got.push(v && v.S && v.S.tx && v.S.tx['vow.g']); return !!(v && v.S); } };
  sb.window = { parent: parent ? parent.sb : null, location: { search: '?embed=1' } };
  vm.createContext(sb); vm.runInContext(grabIn(src, '_tabGone') + '\n' + grabIn(src, '_ordKey') + '\n' + grabIn(src, '_ordRestore') + '\n' + grabIn(src, '_recE') + '\nfunction __fill(ev){ ' + FILL(src) + '\n}', sb); return sb; }
const s7 = async (src, op) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), [OK_A]: DR('가의 서약', A, clock.now - 9000) });
  const WA = win(S, src, { acct: A }); const F = fillFrame(S, op, WA, A);   // 옛 창의 식순 화면이 가의 초안을 먼저 되살렸다
  const WB = win(S, src, {}); WB.sb.setToken('tb'); S.set('me_state_v1', CACHE('tb', B)); WB.ls.setItem(OK_B, DR('나의 서약', B, clock.now));
  F.__fill({ data: { type: 'momentedit:orderFill', draft: null, done: false, acct: B, cust: { code: B } } });   // 늦게 처리된 orderReady 가 지금 캐시의 나 코드를 실어 보냈다
  const stale = JSON.parse(S.get(OK_B) || '{}').who;
  /* [ACCT_KEYS] 옛 창 판정이 없어도 — 처음 받은 계정 칸만 읽는다 · 다른 계정 칸 · 공개 칸은 읽지도 지우지도 않는다 */
  const S2 = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), [OK_B]: DR('나의 서약', B, clock.now), [OK_A]: DR('가의 서약', A, clock.now - 50), me_order_pub: DR('미리보기', '', clock.now) }); const W2 = win(S2, src, { acct: A }); const F2 = fillFrame(S2, op, W2, '');
  F2.__fill({ data: { type: 'momentedit:orderFill', draft: null, done: false, acct: A, cust: { code: A } } }); const other = JSON.parse(S2.get(OK_B) || '{}').who, read2 = F2.got.join(), pub2 = !!S2.get('me_order_pub'), drew2 = F2.renders > 0 && F2._navKey === '';
  F2.__fill({ data: { type: 'momentedit:orderFill', draft: null, done: false, acct: B, cust: { code: B } } }); const read2b = F2.got.join(), acct2 = F2._ACCT;   // 다른 계정의 두 번째 채우기는 버린다
  return { stale, other, read2, pub2, read2b, acct2, drew2 };
};
{ const r = await run(s7, MP, OP);
  ok('⑦ 12-02 [TAB_GUARD_FILL] 옛 창의 식순 화면은 늦게 온 orderFill(다른 계정 코드)로 지금 계정(나)의 식순 초안을 지우지 않는다', !r.err && r.stale === B, r.err || r);
  ok('⑦ 12-02 · 13-06 [ACCT_KEYS] 식순 화면은 마이페이지가 확인해 준 계정 칸만 읽는다(가의 서약) · 다른 계정 · 공개 칸은 읽지도 지우지도 않는다 · 다른 계정의 늦은 채우기는 버린다 · 되살린 판으로 바로 그린다', !r.err && r.other === B && r.read2 === '가의 서약' && r.pub2 && r.read2b === '가의 서약' && r.acct2 === A && r.drew2, r.err || r);
  const g = grabIn(MP, 'openOrderBuilder') || MP; const i = MP.indexOf("if(d.type==='momentedit:orderReady'){"), seg = i < 0 ? '' : MP.slice(i, i + 700);
  ok('⑦ 12-02 [TAB_GUARD_FILL] 마이페이지 옛 창은 orderReady 에 orderFill(계정 코드)을 돌려주지 않는다 — [FRAME_READY_BACK] 다음 줄이 옛 창 판정', /momentedit:orderReady'\)\{\s*_frameReady=true;[^\n]*\n\s*\/\*[\s\S]*?\*\/\s*if\(typeof _tabStale=='function' && _tabStale\(\)\)\{ _tabStaleShow\(\); return; \}/.test(seg), seg.slice(0, 160)); }

/* ⑧ 12-03 [PREVIEW_KEY_SPLIT] 그냥 연 공개 미리보기(부모 없음)는 고객 식순 칸(me_order)을 쓰지 않는다 */
const s8 = async (src, op) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), [OK_A]: DR('되살린 저장 안 한 서약', A, clock.now - 1000) });
  const PUB = frame(S, op, null, '', { tx: { 'vow.g': '미리보기 예시' } }); PUB._persist();
  const cust = JSON.parse(S.get(OK_A) || '{}'), pub = JSON.parse(S.get('me_order_pub') || 'null');
  /* 첫 되살리기 — 옛 공용 칸은 열 때 옮긴다(주인 없는 판은 공개 칸이 비었을 때만) · 공개 미리보기는 공개 칸만 읽는다 · [ACCT_KEYS] 마이페이지 안은 열 때 읽지 않는다 */
  const rs = lineIn(op, /if\(!EMBED\)\{ _ordMigrate\(\); try\{ _ordRestore\(\); \}catch\(e\)\{\} \}/);
  const restore = (init, emb) => { const S2 = shared(init); const got = []; const sb = { localStorage: S2.view({ L: {} }), JSON, Object, String, Math, EMBED: !!emb, _ACCT: '', window: { location: { search: emb ? '?embed=1' : '' } }, _srvBase: '', _autoLast: 'x', _editT: 0, _editK: null, _editE: 0,
      _applySaved: (v) => { got.push(v && v.S && v.S.tx && v.S.tx['vow.g']); return !!v; }, _autoKey: () => '' };
    vm.createContext(sb); vm.runInContext(grabIn(op, '_ordKey') + '\n' + grabIn(op, '_recE') + '\n' + grabIn(op, '_ordMigrate') + '\n' + grabIn(op, '_ordRestore') + '\n' + rs, sb); return { got: got.join() || null, legacy: S2.get('me_order'), owned: S2.get(OK_A) }; };
  const lg = restore({ me_order: DR('예전 미리보기 판', '', 0, false) }), ow = restore({ me_order: DR('고객 판', A, 0) }), bo = restore({ me_order: DR('예전 미리보기 판', '', 0, false), me_order_pub: DR('공개 칸 판', '', 0, false) }), em = restore({ [OK_A]: DR('고객 판', A, 0), me_order: DR('예전', A, 0) }, true);
  return { cust: cust.S && cust.S.tx['vow.g'], custWho: cust.who, pub: pub && pub.S && pub.S.tx['vow.g'], rsOk: !!rs,
    legacy: lg.got, legacyGone: lg.legacy === null, owned: ow.got, ownedMoved: !!ow.owned, both: bo.got, bothGone: bo.legacy === null, emb: em.got, embLegacy: em.legacy };
};
{ const r = await run(s8, MP, OP);
  ok('⑧ 12-03 [PREVIEW_KEY_SPLIT] 남겨 둔 공개 미리보기에서 진행해도 로그인 창이 되살린 저장 안 한 식순 초안(me_order)을 덮지 않는다 · 미리보기는 me_order_pub 에', !r.err && r.cust === '되살린 저장 안 한 서약' && r.custWho === A && r.pub === '미리보기 예시', r.err || r);
  ok('⑧ 12-03 [PREVIEW_KEY_SPLIT] 공개 미리보기는 자기 칸을 되살리고 · 비었으면 예전 미리보기의 주인 없는 판을 한 번 잇는다 · 고객 판은 읽지 않는다 · 처음부터 다시(지우기)도 자기 칸',
    !r.err && r.rsOk && r.legacy === '예전 미리보기 판' && r.legacyGone && r.owned === null && r.ownedMoved && r.both === '공개 칸 판' && r.bothGone && /var _rk=_ordKey\(\); if\(_rk\) localStorage\.removeItem\(_rk\); sessionStorage\.setItem\('me_order_reset','1'\)/.test(OP), r.err || r);
  ok('⑧ 13-06 [ACCT_KEYS] 마이페이지 안 식순 화면은 열 때 이 기기 초안을 읽지 않는다(계정을 받기 전) · 옛 공용 칸도 그때 건드리지 않는다', !r.err && r.emb === null && r.embLegacy !== null, r.err || r); }
{ const b = brk(OP, [["if(!e) return 'me_order_pub';", "if(!e) return 'me_order_AAAAAA';"]]); const rb = b ? await run(s8, MP, b) : null;
  ok('깨 보기 ⑧ — 칸을 나누지 않으면 빨강(미리보기 예시가 고객 초안을 덮는다)', !!rb && !rb.err && rb.cust === '미리보기 예시', rb && (rb.err || rb.cust)); }

/* ⑨ 12-04 [STALE_KEEP_INPUT] 같은 계정 두 창 — 입력은 그때 이 기기에 · 옛 창 «다시 열기»는 못 남긴 입력을 같은 계정 맡김에 */
const s9 = async (src, otherAcct) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
  const W1 = win(S, src, { acct: A }); W1.open(null, {});
  clock.now = T0 + 1000; W1.type('입력한 그때 메모'); const dev1 = memoOf(S.get('me_snapLocal_AAAAAA'));   // 앱을 내리지 않았다(두 창 다 보임)
  const W2 = win(S, src, {}); W2.sb.setToken('ta2'); S.set('me_state_v1', CACHE('ta2', otherAcct || A)); W2.sb.window._mpStateD = { code: otherAcct || A };   // 다른 창이 로그인(같은 계정 · 또는 다른 계정)
  clock.now = T0 + 2000; W1.type('옛 창이 된 뒤 쓴 메모');   // 옛 창 — 이 기기 쓰기는 막힌다
  const dev2 = memoOf(S.get('me_snapLocal_AAAAAA')); const bar = W1.bar(); if (bar) bar.el.kids[1].click();
  const keep = S.get(KK_A); const W3 = win(S, src, { acct: A }); if (!otherAcct) W3.sb._reloginRestore(A); clock.now = T0;   // 새로 연 창이 상태를 불러온다
  return { dev1, dev2, keep: keep && memoOf(JSON.parse(keep).keys.me_snapLocal_AAAAAA), keepB: S.get(KK_B), after: memoOf(S.get('me_snapLocal_AAAAAA')), reloaded: W1.reloaded };
};
{ const r = await run(s9, MP); const ro = await run((src) => s9(src, B), MP);
  ok('⑨ 12-04 [STALE_KEEP_INPUT] 앱을 내리지 않아도 입력한 그때 글이 이 기기에 남는다(옛 창이 되기 전까지)', !r.err && r.dev1 === '입력한 그때 메모' && r.dev2 === '입력한 그때 메모', r.err || r);
  ok('⑨ 12-04 [STALE_KEEP_INPUT] · [ACCT_KEYS] «다시 열기»가 옛 창이 된 뒤 쓴 입력을 이 창 계정 맡김에 두고 새로 연다 → 다시 연 창에 그 메모 · 다른 계정이 들어왔어도 이 창 계정 칸에만(그 계정 맡김은 건드리지 않는다)',
    !r.err && r.keep === '옛 창이 된 뒤 쓴 메모' && r.after === '옛 창이 된 뒤 쓴 메모' && r.reloaded === 1 && !ro.err && ro.keep === '옛 창이 된 뒤 쓴 메모' && ro.keepB === null && ro.reloaded === 1, r.err || ro.err || { r, ro }); }

/* ⑩ 12-05 [TOMBSTONE_READ] 비운 표시는 카드에는 안 보이지만 편집을 열 때는 그 고친 때를 이어받는다 — 열기만 해서는 지우지 않는다 */
const s10 = async (src) => {
  const KEEP = JSON.stringify({ code: A, t: T0 - 5000, keys: { me_snapLocal_AAAAAA: SN('이전 메모', T0 - 5000) } });   // 일부 되돌리기 실패로 남은 옛 맡김
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), me_snapLocal_AAAAAA: JSON.stringify({ v: 2, empty: true, t: T0 - 2000 }), [KK_A]: KEEP });
  const W = win(S, src, { acct: A }); const card = W.sb._snapLocalGet();
  W.sb.__start2({}, null, true, {}); W.sb._snapEditMark(); const t = W.sb.SNAPFLOW.t; W.hide();   // «스냅 기획하기»로 편집을 다시 열고 · 그냥 앱을 내림
  const dev = S.get('me_snapLocal_AAAAAA'); W.sb._reloginRestore(A);
  return { card, t, dev: dev && JSON.parse(dev), after: memoOf(S.get('me_snapLocal_AAAAAA')) };
};
{ const r = await run(s10, MP);
  ok('⑩ 12-05 [TOMBSTONE_READ] 편집을 다시 열면 비운 표시의 고친 때를 이어받고 · 열고 내리기만 해서는 지우지 않는다 · 카드는 «스냅 기획하기» 그대로', !r.err && r.card === null && r.t === T0 - 2000 && !!r.dev && r.dev.empty === true && r.dev.t === T0 - 2000, r.err || r);
  ok('⑩ 12-05 [TOMBSTONE_READ] 그 뒤 다시 로그인해도 지운 메모가 되살아나지 않는다', !r.err && r.after === '(비움)', r.err || r); }

/* ⑪ 12-06 [AUTH_EPOCH] 가 → 나 → 가(알림 링크)로 같은 토큰에 돌아와도 · storage 이벤트가 늦어도 옛 창 */
const s11 = async (src, op) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), [OK_A]: DR('최신 서약', A, clock.now - 100) });
  const OLD = win(S, src, { acct: A }); const OF = frame(S, op, OLD, A, { tx: { 'vow.g': '옛 창의 옛 서약' } });
  const inflight = OLD.sb._post({ action: 'saveProductionTrack', token: OLD.sb.getToken(), track: 'ritual' });   // 보내던 저장
  OLD.mute = true;   // 이 창(뒤에 있는 탭)에는 이벤트가 늦게 온다
  const W = win(S, src, {}); W.sb.setToken('tb'); W.sb.setToken('ta');   // 다른 창 — 나로 로그인했다가 · 가의 알림 링크(같은 토큰)로 돌아옴
  OLD.pend[0] && OLD.pend[0]({ ok: true }); const late = await inflight;
  const stale = OLD.sb._tabStale(); OF._persist();
  const n0 = OLD.fetches.length; const sp = OLD.sb._post({ action: 'saveProductionTrack', token: OLD.sb.getToken(), track: 'ritual' }); if (OLD.fetches.length > n0) OLD.pend[OLD.pend.length - 1]({ ok: true }); const sent = await sp;
  return { stale, late: late && (late.reason || (late.ok && 'ok')), order: JSON.parse(S.get(OK_A) || '{}').S.tx['vow.g'], nSent: OLD.fetches.length - n0, sent: sent && sent.reason };
};
{ const r = await run(s11, MP, OP);
  ok('⑪ 12-06 [AUTH_EPOCH] 다른 창이 가 → 나 → 가로 돌아와 토큰이 처음과 같아도 · 이벤트가 늦어도 옛 창 — 옛 식순이 최신 초안을 덮지 않고 저장도 보내지 않는다', !r.err && r.stale === true && r.order === '최신 서약' && r.nSent === 0 && r.sent === 'tab_stale', r.err || r);
  ok('⑪ 12-06 [AUTH_EPOCH] 보내던 저장의 답도 그 사이 차례가 바뀌었으면 버린다', !r.err && r.late === 'tab_stale', r.err || r); }
{ const b = brk(MP, [["if(tok!==_TAB.tok || ep!==_TAB.ep) _TAB.stale=true;", "if(tok!==_TAB.tok) _TAB.stale=true;"]]); const rb = b ? await run(s11, b, OP) : null;
  ok('깨 보기 ⑪ — 차례를 안 보면 빨강(같은 토큰으로 돌아온 옛 창이 쓴다)', !!rb && !rb.err && rb.stale === false && rb.order !== '최신 서약', rb); }

/* ⑫ 13-01 [FRAME_READY_BACK] 식순 화면이 뜨면 _frameReady — 폰 뒤로가기 · Esc 가 빌더 나가기 판을 거친다 */
{ const i = MP.indexOf("if(d.type==='momentedit:orderReady'){"), seg = i < 0 ? '' : MP.slice(i, i + 200);
  const ob = grabIn(MP, 'openRitualBuilder') || '';
  ok('⑫ 13-01 [FRAME_READY_BACK] orderReady 첫 줄이 _frameReady=true(옛 창 판정보다 먼저) · 뒤로가기는 그것이 없을 때만 그냥 닫는다',
    /^if\(d\.type==='momentedit:orderReady'\)\{\s*_frameReady=true;/.test(seg) && /if\(!_frameReady\)\{ done\(\); return; \}/.test(ob) && (ob.match(/_frameReady=true/g) || []).length >= 1, seg.slice(0, 120)); }

/* ⑬ 13-03 [SAME_ACCT_T] 같은 계정 두 창 — 먼저 연 창의 다시 쓰기가 다른 창의 최신 초안(식순 · 스냅)을 덮지 않는다 */
const s13 = async (src, op) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
  const P1 = win(S, src, { acct: A }), P2 = win(S, src, { acct: A });
  const F1 = frame(S, op, P1, A, { tx: { 'vow.g': '창1 서약' } }), F2 = frame(S, op, P2, A, { tx: { 'vow.g': '창2 서약' } });
  clock.now = T0 + 1000; F1._persist(); clock.now = T0 + 2000; F2._persist();   // 창1 고침 · 창2 나중 고침
  clock.now = T0 + 3000; F1._persist();   // 창1 다시 그리기(고친 것 없음)
  const order = JSON.parse(S.get(OK_A) || '{}').S, st1 = P1.sb._tabStale(), bar1 = P1.bar();
  /* 스냅 — 창1 입력 · 창2 나중 입력 · 창1 앱 내림 */
  const W1 = win(S, src, { acct: A }); W1.open(null, {}); const W2 = win(S, src, { acct: A }); W2.open(null, {});
  clock.now = T0 + 4000; W1.type('창1 메모'); clock.now = T0 + 5000; W2.type('창2 메모'); clock.now = T0 + 6000; W1.hide();
  const memo = memoOf(S.get('me_snapLocal_AAAAAA')), st2 = W1.sb._tabStale();
  /* 창1 이 그 뒤에 정말 고치면(옛 창이 아니라면) 그 고친 때가 더 나중이라 쓴다 — 같은 계정 한 창만이면 늘 쓴다 */
  const S2 = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) }); const Q = win(S2, src, { acct: A }); const G = frame(S2, op, Q, A, { tx: { 'vow.g': '혼자 쓴 서약' } });
  G._persist(); G.S = { tx: { 'vow.g': '혼자 고친 서약' } }; clock.now = T0 + 7000; G._persist(); G._persist(); clock.now = T0;
  return { order: order && order.tx['vow.g'], st1, bar1: bar1 && bar1.line, memo, st2, solo: JSON.parse(S2.get(OK_A) || '{}').S.tx['vow.g'], soloStale: Q.sb._tabStale() };
};
{ const r = await run(s13, MP, OP);
  ok('⑬ 13-03 [SAME_ACCT_T] 같은 계정 두 창 — 먼저 연 창의 다시 쓰기는 나중에 고친 창의 식순 초안을 덮지 않고 «다른 창에서 바뀌었어요 (코드 L8)»로 멈춘다', !r.err && r.order === '창2 서약' && r.st1 === true && r.bar1 === TAB_LINE, r.err || r);
  ok('⑬ 13-03 [SAME_ACCT_T] 스냅 임시본도 — 먼저 입력한 창이 나중에 앱을 내려도 나중 입력을 덮지 않는다 · 한 창만이면 고칠 때마다 그대로 쓴다', !r.err && r.memo === '창2 메모' && r.st2 === true && r.solo === '혼자 고친 서약' && r.soloStale === false, r.err || r);
  const bo = brk(OP, [["if(_ce && _ce>_me){ _ordNewer(); }", "if(0){ _ordNewer(); }"]]); const rb = bo ? await run(s13, MP, bo) : null;
  ok('깨 보기 ⑬ — 식순 화면이 쓰기 전에 견주지 않으면 빨강', !!rb && !rb.err && rb.order === '창1 서약', rb && (rb.err || rb.order));
  const bm = brk(MP, [["if(_ct && _ct>(+SNAPFLOW.t||0)){ _tabStaleMark(); return; }", ""]]); const rm = bm ? await run(s13, bm, OP) : null;
  ok('깨 보기 ⑬ — 스냅 임시본을 견주지 않으면 빨강', !!rm && !rm.err && rm.memo === '창1 메모', rm && (rm.err || rm.memo)); }

/* ⑭ 13-04 [KEEP_FAIL_STOP] 옛 창 «다시 열기» — 못 맡겼거나 이 창 계정을 모르면 새로 열지 않는다 */
const s14 = async (src) => {
  const one = async (quota, forget) => { const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
    const W1 = win(S, src, { acct: A, quota }); W1.open(null, {}); clock.now = T0 + 1000; W1.type('먼저 쓴 메모');
    const W2 = win(S, src, {}); W2.sb.setToken('tb'); clock.now = T0 + 2000; W1.type('옛 창이 된 뒤 쓴 메모'); clock.now = T0;
    if (forget) W1.sb.window._mpStateD = null;
    const bar = W1.bar(); const btn = bar && bar.el.kids[1]; if (btn) btn.click(); const line1 = bar && bar.el.kids[0].textContent, btn1 = btn && btn.textContent, re1 = W1.reloaded;
    if (btn) btn.click(); return { line1, btn1, re1, re2: W1.reloaded }; };
  return { quota: await one((k) => /^me_relogin_keep/.test(k)), forget: await one(null, true), fine: await one(null) };
};
{ const r = await run(s14, MP); const FL = '초안을 보관하지 못했어요 (코드 S4)';
  ok('⑭ 13-04 [KEEP_FAIL_STOP] 맡김 쓰기가 실패하면 새로 열지 않고 «초안을 보관하지 못했어요 (코드 S4)» · 단추 «그대로 다시 열기» · 한 번 더 누르면 그때 연다',
    !r.err && r.quota.line1 === FL && r.quota.btn1 === '그대로 다시 열기' && r.quota.re1 === 0 && r.quota.re2 === 1, r.err || r.quota);
  ok('⑭ 13-04 [KEEP_FAIL_STOP] 이 창 계정을 모르면(맡길 칸을 모름) «맡길 것 없음»으로 읽지 않는다 · 맡겼으면 종전대로 바로 연다', !r.err && r.forget.line1 === FL && r.forget.re1 === 0 && r.fine.re1 === 1, r.err || r); }

/* ⑮ 13-05 [DL_GUARD] 내려받기 폼 — 옛 창은 보내지 않는다 · 토큰은 누르는 그때 지금 창의 것만 */
const s15 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) }); const WA = win(S, src, { acct: A });
  const form = () => ({ elements: { token: { value: '' } } });
  const f1 = form(); const go1 = WA.sb.window_rf(f1); const tok1 = f1.elements.token.value;
  const WB = win(S, src, {}); WB.sb.setToken('tb');
  const f2 = form(); const go2 = WA.sb.window_rf(f2);
  const body = grabIn(src, '_rfKeepNote');
  return { go1, tok1, go2, tok2: f2.elements.token.value, bar: !!WA.bar(), html: /name="token" value=""/.test(body) && /onsubmit="return rfKeepGo\(this\)"/.test(body) && !/getToken\(\)/.test(body) };
};
{ const r = await run(s15, MP);
  ok('⑮ 13-05 [DL_GUARD] 내려받기는 그릴 때 토큰을 싣지 않는다(빈 칸) · 누르는 그때 이 창의 살아 있는 토큰 · 다른 창이 다른 계정으로 로그인한 뒤에는 보내지 않고 «다른 창에서 바뀌었어요 (코드 L8)»',
    !r.err && r.html && r.go1 === true && r.tok1 === 'ta' && r.go2 === false && r.tok2 === '' && r.bar, r.err || r); }

/* ⑯ 13-07 [EPOCH_VERIFY] 차례 표식을 못 남기면 로그인을 마치지 않고 이 창을 멈춘다 */
const s16 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
  const OLD = win(S, src, { acct: A }); const W = win(S, src, { quota: (k) => k === 'me_auth_ep' });
  const r1 = W.sb.setToken('tb'); const tok1 = S.get('me_token'), st = W.sb._tabStale(), bar = W.bar();
  const n0 = W.fetches.length; const sp = W.sb._post({ action: 'getMyState', token: 'tb' }); const sent = await Promise.race([sp, flush().then(() => null)]);
  const W2 = win(S, src, { acct: A, quota: (k) => k === 'me_auth_ep' }); W2.sb.clearToken(); const st2 = W2.sb._tabStale(), bar2 = W2.bar(), tok2 = S.get('me_token');
  return { r1, tok1, st, line: bar && bar.line, nSent: W.fetches.length - n0, sent: sent && sent.reason, st2, line2: bar2 && bar2.line, tok2, old: OLD.sb._tabStale() };
};
{ const r = await run(s16, MP); const EL = '창 상태를 남기지 못했어요 (코드 L4)';
  ok('⑯ 13-07 [EPOCH_VERIFY] 차례 표식(me_auth_ep)을 못 남기면 로그인을 마치지 않는다(토큰 그대로) · 이 창은 멈추고 «창 상태를 남기지 못했어요 (코드 L4)» · 보내지 않는다',
    !r.err && r.r1 === false && r.tok1 === 'ta' && r.st === true && r.line === EL && r.nSent === 0 && r.sent === 'tab_stale', r.err || r);
  ok('⑯ 13-07 [EPOCH_VERIFY] 로그아웃은 하되(토큰을 지운다 — 다른 창은 토큰으로 안다) 이 창은 멈춘다 · 다른 창은 옛 창', !r.err && r.tok2 === null && r.st2 === true && r.line2 === EL && r.old === true, r.err || r);
  const b = brk(MP, [["localStorage.setItem(TAB_EP_KEY, v); return localStorage.getItem(TAB_EP_KEY)===v; }catch(e){ return false; } }", "localStorage.setItem(TAB_EP_KEY, v); }catch(e){} return true; }"]]); const rb = b ? await run(s16, b) : null;
  ok('깨 보기 ⑯ — 다시 읽어 확인하지 않으면 빨강(못 남겨도 로그인한다)', !!rb && !rb.err && rb.tok1 === 'tb', rb && (rb.err || rb.tok1)); }

/* ⑰ 13-02 · 12-02 [ACCT_KEYS] 다른 계정으로 로그인 · 로그아웃해도 남의 계정 칸은 읽지도 지우지도 않는다 */
const s17 = async (src) => {
  const S = shared({ me_token: 'tb', me_state_v1: CACHE('tb', B), [OK_A]: DR('가의 서약', A, clock.now - 100), me_snapLocal_AAAAAA: SN('가의 메모', clock.now - 100), [KK_A]: JSON.stringify({ code: A, t: clock.now - 100, keys: { me_snapLocal_AAAAAA: SN('가의 맡긴 메모', clock.now - 100) } }),
    [OK_B]: DR('나의 서약', B, clock.now), me_snapLocal_BBBBBB: SN('나의 메모', clock.now), me_deliv_BBBBBB: 'o', me_deliv_AAAAAA: 'c' });
  const W = win(S, src, { acct: B });
  if (typeof W.sb._orderOwnerSweep === 'function') W.sb._orderOwnerSweep(B);   // (옛 판) 로그인 상태를 받았을 때
  W.sb._reloginRestore(B); const mid = { a: S.get(OK_A), sa: S.get('me_snapLocal_AAAAAA'), ka: S.get(KK_A) };
  W.sb._mpLogoutNow();
  return { mid, a: S.get(OK_A), sa: S.get('me_snapLocal_AAAAAA'), ka: S.get(KK_A), da: S.get('me_deliv_AAAAAA'), b: S.get(OK_B), sb: S.get('me_snapLocal_BBBBBB'), db: S.get('me_deliv_BBBBBB'), tok: S.get('me_token') };
};
{ const r = await run(s17, MP);
  ok('⑰ 13-02 [ACCT_KEYS] 나로 로그인해 상태를 받아도 가의 식순 초안 · 스냅 임시본 · 맡김을 지우지 않는다(로그인 때 남의 초안 걷기가 없다)', !r.err && !!r.mid.a && !!r.mid.sa && !!r.mid.ka && !/function _orderOwnerSweep\(/.test(MP) && /if \(d && d\.ok\)\{ _reloginRestore\(d\.code\); cacheState\(d\);/.test(MP), r.err || r.mid);
  ok('⑰ [ACCT_KEYS] 스스로 로그아웃하면 그 계정 칸만 지운다(나의 초안 · 스냅 · 펼침) · 가의 칸은 그대로', !r.err && r.tok === null && r.b === null && r.sb === null && r.db === null && !!r.a && !!r.sa && !!r.ka && r.da === 'c', r.err || r); }

/* ⑱ [ACCT_KEYS] 옛 공용 칸 옮기기 · 오래된 칸 걷기 */
const s18 = async (src, op) => {
  const mig = (init, quota) => { const S = shared(init); const W = win(S, src, { quota }); W.sb._acctKeysMigrate(); return Object.fromEntries(S.m); };
  const owned = mig({ me_order: DR('가의 옛 칸 서약', A, clock.now - 50) });
  const pub = mig({ me_order: DR('주인 없는 판', '', 0, false) });
  const pubFull = mig({ me_order: DR('주인 없는 판', '', 0, false), me_order_pub: DR('공개 칸 판', '', 0, false) });
  const newer = mig({ me_order: DR('옛 칸 더 나중 고침', A, clock.now - 10), [OK_A]: DR('계정 칸', A, clock.now - 500) });
  const older = mig({ me_order: DR('옛 칸 옛 고침', A, clock.now - 900), [OK_A]: DR('계정 칸', A, clock.now - 500) });
  const fail = mig({ me_order: DR('가의 옛 칸 서약', A, clock.now - 50) }, (k) => k === OK_A);
  const keep = mig({ me_relogin_keep: JSON.stringify({ code: A, t: clock.now - 100, keys: { me_order: DR('맡긴 서약', A, clock.now - 100), me_snapLocal_AAAAAA: SN('맡긴 메모', clock.now - 100) } }) });
  const keepOld = mig({ me_relogin_keep: JSON.stringify({ code: A, t: clock.now - 8 * 864e5, keys: { me_order: DR('오래된', A, 1) } }) });
  /* 식순 화면(그냥 연 미리보기)도 같은 규칙 */
  const opm = (init) => { const S = shared(init); const sb = { localStorage: S.view({ L: {} }), JSON, Object, String, Math }; vm.createContext(sb); vm.runInContext(grabIn(op, '_recE') + '\n' + grabIn(op, '_ordMigrate'), sb); sb._ordMigrate(); return Object.fromEntries(S.m); };
  const op1 = opm({ me_order: DR('가의 옛 칸 서약', A, clock.now - 50) }), op2 = opm({ me_order: DR('주인 없는 판', '', 0, false), me_order_pub: DR('공개 칸 판', '', 0, false) });
  /* 30일 · 7일 걷기 */
  const old = (n) => clock.now - n * 864e5;
  const swS = shared({ [OK_A]: JSON.stringify({ v: 2, S: {}, who: A, w: old(31) }), [OK_B]: JSON.stringify({ v: 2, S: {}, who: B, w: old(2) }), me_snapLocal_AAAAAA: JSON.stringify({ v: 2, zones: {}, t: old(40), w: old(40) }), me_order_v2note_AAAAAA: '1',
    [KK_A]: JSON.stringify({ code: A, t: old(8), keys: {} }), [KK_B]: JSON.stringify({ code: B, t: old(1), keys: {} }), me_snapLocal_BBBBBB: JSON.stringify({ v: 2, zones: {} }) });
  const SW = win(swS, src, {}); SW.sb._acctOldSweep(); const sw = Object.fromEntries(swS.m);
  return { owned, pub, pubFull, newer, older, fail, keep, keepOld, op1, op2, sw };
};
{ const r = await run(s18, MP, OP); const tx = (v) => { try { return JSON.parse(v).S.tx['vow.g']; } catch (e) { return null; } };
  ok('⑱ [ACCT_KEYS] 옛 공용 칸(me_order · who 가) → me_order_가 · 옛 칸은 옮긴 뒤 지운다 · 주인 없는 판은 공개 칸이 비었을 때만(아니면 버린다)',
    !r.err && tx(r.owned[OK_A]) === '가의 옛 칸 서약' && !('me_order' in r.owned) && tx(r.pub.me_order_pub) === '주인 없는 판' && !('me_order' in r.pub) && tx(r.pubFull.me_order_pub) === '공개 칸 판' && !('me_order' in r.pubFull), r.err || r);
  ok('⑱ [ACCT_KEYS] 계정 칸이 이미 있으면 더 나중에 고친 쪽 · 쓰기가 실패하면 옛 칸을 지우지 않는다(다음에 다시)', !r.err && tx(r.newer[OK_A]) === '옛 칸 더 나중 고침' && tx(r.older[OK_A]) === '계정 칸' && !('me_order' in r.older) && tx(r.fail.me_order) === '가의 옛 칸 서약' && !(OK_A in r.fail), r.err || r);
  ok('⑱ [ACCT_KEYS] 옛 맡김(me_relogin_keep) → me_relogin_keep_가 · 안의 식순 칸 이름도 me_order_가 · 7일 지난 맡김은 버린다 · 식순 화면(미리보기)도 같은 규칙',
    !r.err && !!r.keep[KK_A] && tx(JSON.parse(r.keep[KK_A]).keys[OK_A]) === '맡긴 서약' && !('me_relogin_keep' in r.keep) && !(KK_A in r.keepOld) && !('me_relogin_keep' in r.keepOld)
    && tx(r.op1[OK_A]) === '가의 옛 칸 서약' && !('me_order' in r.op1) && tx(r.op2.me_order_pub) === '공개 칸 판' && !('me_order' in r.op2), r.err || r);
  ok('⑱ [ACCT_KEYS] 30일 넘게 손대지 않은 계정 칸 · 7일 지난 맡김은 걷는다 · 최근 것 · 때가 없는 옛 기록 · 다른 기억(v2note)은 둔다',
    !r.err && !(OK_A in r.sw) && (OK_B in r.sw) && !('me_snapLocal_AAAAAA' in r.sw) && (KK_B in r.sw) && !(KK_A in r.sw) && ('me_snapLocal_BBBBBB' in r.sw) && ('me_order_v2note_AAAAAA' in r.sw), r.err || r.sw); }

/* 걸림 · 줄 */
ok('[TAB_GUARD] 보내기 한 벌(_post)이 옛 창 · 그 사이 바뀐 답을 막는다 · 로그인 풀림 길(알림 링크 · 상태 불러오기 · 저장 실패 판)이 먼저 _tabDrop 을 본다',
  /_tabStale\(\)\)\{ _tabStaleShow\(\); return Promise\.resolve\(_sd\(\)\); \}/.test(MP) && (MP.match(/typeof _tabDrop=='function' && _tabDrop\(/g) || []).length >= 6 && /tab_stale:1/.test(MP));
ok('[TAB_GUARD] 줄은 짧게(20자 안) · 코드 L8 · [EPOCH_VERIFY] L4 줄도', TAB_LINE.replace(/ \(코드 L8\)$/, '').length <= 20 && MP.includes("TAB_LINE='" + TAB_LINE + "'") && MP.includes("TAB_EP_LINE='창 상태를 남기지 못했어요 (코드 L4)'"));

console.log(fail ? `\n★ 실패 ${fail}건` : '\nTAB GUARD OK'); process.exit(fail ? 1 : 0);
