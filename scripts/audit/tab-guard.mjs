#!/usr/bin/env node
/* ★[TAB_GUARD_1030 · TAB_GUARD · RELOGIN_MERGE · EDIT_T_AT_INPUT · EMPTY_TOMBSTONE 2026-10-30 GPT 11차 점검(고객) 11-01 ~ 11-05]
   같은 기기 두 창(탭)이 한 localStorage 를 나눠 쓸 때 옛 창이 지금 계정 · 최신 초안을 덮거나 지우지 않는지 잰다.
   창마다 mypage.html 함수 원문을 떼어 vm 하나씩에 싣고, 저장소는 하나를 나눠 쓴다 — 한 창이 쓰거나 지우면 다른 창에 storage 이벤트가 간다(브라우저와 같다).
   식순 화면(order-preview.html)은 _persist 원문을 떼어 부모 창(그 vm)의 _tabStale 을 보게 한다.
   ① 11-05 계정 가의 옛 창 · 다른 창이 계정 나로 로그인 → 옛 창의 «로그인하기» · 로그아웃 · 저장이 나의 토큰 · 초안을 지우거나 나의 토큰을 붙여 보내지 않는다 · 보내는 중이던 답도 버린다 · 한 줄 «다른 창에서 바뀌었어요 (코드 L8)» · 단추 «다시 열기»
   ② 11-03 다른 창이 다시 로그인해 맡긴 최신본을 되돌린 뒤 옛 창이 앱을 내리거나(스냅) 다시 그려도(식순) 최신본을 덮지 않는다 · 같은 토큰이어도 되돌리기 표시(me_relogin_rst)로 옛 창이 된다
   ③ 11-04 옛 창의 다시 맡기기가 최신 맡김을 옛 판으로 바꾸지 않는다 · 맡길 때 앞서 맡긴 것과 종류마다 고친 때로 합치고 이번에 없는 종류는 그대로
   ④ 11-02 다 비운 스냅 임시본은 비운 때를 남긴다({empty:true, t}) — 다시 로그인해도 옛 메모가 되살아나지 않는다 · 카드는 «스냅 기획하기»
   ⑤ 11-01 고친 때는 입력한 그때 — 먼저 입력하고 나중에 내린 창이 나중에 고친 창을 이기지 않는다
   깨 보기: 고친 줄을 옛 꼴로 되돌려 같은 장면이 빨개지는지 본다. TG_MP · TG_OP 로 다른 판(예: 옛 main)을 재면 빨강이 나와야 한다.
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const grabIn = (src, name) => { let i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const brk = (src, pairs) => { let t = src; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
const flush = async () => { for (let i = 0; i < 6; i++) await new Promise((r) => setTimeout(r, 0)); };
const MP = fs.readFileSync(process.env.TG_MP || path.join(ROOT, 'mypage.html'), 'utf8');
const OP = fs.readFileSync(process.env.TG_OP || path.join(ROOT, 'order-preview.html'), 'utf8');
const FNS = ['getToken', 'setToken', '_tabBind', '_tabStale', '_tabStaleShow', '_tabDrop', '_tabWatch', 'clearToken', '_reloginStash', '_reloginCode', '_reloginAcct', '_reloginPack',
  '_reloginKeyNewer', '_reloginStampT', '_reloginLine', '_reloginRestore', '_reloginCurNewer', '_reloginSnapNewer', '_reloginFailShow', '_reloginGoAnyway', '_reloginShowLogin', '_orderOwnerSweep',
  '_errGoLogin', '_saveSessAsk', '_mpLogoutNow', '_post', 'readCachedState', '_snapLocalKey', '_snapLocalGet', '_snapLocalDel', '_snapLocalPut', '_snapEditMark', '_snapOut', '_snapFilledD', '_snapNewD', '_snapZoneNew'];
const MUST = ['clearToken', '_reloginPack', '_reloginRestore', '_errGoLogin', '_post', '_snapLocalPut', '_snapOut', '_mpLogoutNow'];
const TAB_LINE = '다른 창에서 바뀌었어요 (코드 L8)';
const A = 'AAAAAA', B = 'BBBBBB';
const clock = { now: 1.7e12 };
const FakeDate = function () { return new Date(clock.now); }; FakeDate.now = () => clock.now;

/* 한 저장소를 나눠 쓰는 창들 */
function shared(init) { const m = new Map(Object.entries(init || {})), wins = [];
  const fire = (from, key, oldValue, newValue) => { for (const w of wins) if (w !== from) for (const f of (w.L.storage || [])) { try { f({ key, oldValue, newValue }); } catch (e) {} } };
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
  const code = FNS.map((f) => grabIn(src, f)).join('\n') + '\n' + [/var RELOGIN_KEY=[^\n]*/, /var TAB_RST_KEY=[^\n]*/, /var ERR_W=[^\n]*/, /var ERR_DO=[^\n]*/].map((re) => lineIn(src, re)).join('\n')
    + '\nfunction __start(loc, sd){ ' + lineIn(src, /SNAPFLOW=\{ active:true,[^\n]*/) + '\n}\nif(typeof _tabBind=="function"){ _tabBind(); _tabWatch(); }';
  const W = { L: {}, fetches: [], reloaded: 0, shows: [], notes: [], alerts: [], pend: [] };
  const wnd = { _mpStateD: o.acct ? { code: o.acct } : null, addEventListener(t, f) { (W.L[t] = W.L[t] || []).push(f); } };
  const sb = { localStorage: S.view(W, o.quota), sessionStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }, window: wnd, document: mkDoc(W), TOKEN_KEY: 'me_token', STATE_CACHE_KEY: 'me_state_v1',
    EXEC_URL: 'x', JSON, Object, String, Math, Promise, Array, Error, Date: FakeDate, setTimeout, clearTimeout, console,
    _mpAcct: () => (wnd._mpStateD && wnd._mpStateD.code) || '', _mpAcctSweep: () => {}, _flowBusy: () => {}, _errSet: (el, t) => { if (el) el.textContent = String(t); return el; }, _errHtml: (t) => String(t),
    _errLine: (x, L) => (x && x.error) || ('로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 ' + L + '8)'), _errCode: (x, L) => L + '8', _errSess: (x) => !!(x && ({ expired: 1, invalid: 1, no_token: 1, tab_stale: 1 })[x.reason]),
    _wizCurId: () => '', _mpFsOpen: () => false, location: { reload: () => { W.reloaded++; } }, closeLedModal: () => {}, show: (v) => W.shows.push(v), softLoginNote: (t) => W.notes.push(t), cleanUrl: () => {},
    mpAlert: (m) => { W.alerts.push(m); }, mpConfirm: (m) => { W.alerts.push(m); return Promise.resolve(false); }, $: () => null,
    fetch: (u, init) => { const body = JSON.parse(init.body); W.fetches.push(body); return new Promise((res) => { W.pend.push((d) => res({ status: 200, json: () => Promise.resolve(d) })); }); },
    _snapCollect: () => {}, _snapPickCap: () => 4, SNAP_STEPS: [1, 2, 3, 4, 5], opt: {}, p: null, needAgree: true, SNAPFLOW: { active: false } };
  vm.createContext(sb); vm.runInContext(code, sb); S.wins.push(W); W.sb = sb; W.ls = sb.localStorage;
  W.bar = () => { const b = sb.document.getElementById('mp_tabBar'); return b ? { line: (b.kids[0] || {}).textContent, btn: (b.kids[1] || {}).textContent, el: b } : null; };
  W.hide = () => { sb.document.visibilityState = 'hidden'; for (const f of (W.L['doc:visibilitychange'] || [])) f(); sb._snapLocalPut(); };   // 앱 내림(마이페이지의 visibilitychange → _snapLocalPut)
  W.open = (loc, sd) => { sb.__start(loc, sd); if (typeof sb._snapEditMark === 'function') sb._snapEditMark(); };   // 겹화면을 열면 첫 그리기(renderSnapFlow)가 기준을 잡는다
  W.type = (memo) => { sb.SNAPFLOW.d.zones.candle.note = memo; if (typeof sb._snapEditMark === 'function') sb._snapEditMark(); };   // 겹화면의 input 이벤트
  return W; }
/* 식순 화면(iframe) — 부모 창의 _tabStale 을 본다 */
function frame(S, src, parent, who, Sv) {
  const fn = grabIn(src, '_persist'), tg = grabIn(src, '_tabGone'), dl = lineIn(src, /var _editT=[^\n]*/);
  const W = { L: {} }; const sb = { localStorage: S.view(W), JSON, Object, Date: FakeDate, S: Sv, idx: 0, _seenK: {}, courseStarted: true, _doneSaved: false, _who: who, _srvBase: 'k0', _autoLast: 'srv',
    _autoKey: () => JSON.stringify(sb.S), _dirtyMark: () => {}, _closeFit: () => {}, _seamFitKeep: () => {}, _persistBad: false };
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
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), me_order: DR('가의 서약', A, clock.now - 9000), me_snapLocal_AAAAAA: SN('가의 메모', clock.now - 9000) });
  const WA = win(S, src, { acct: A });
  const inflight = WA.sb._post({ action: 'saveProductionTrack', token: WA.sb.getToken(), track: 'snap' });   // 가가 보내던 저장(답이 아직 안 옴)
  const WB = win(S, src, {}); WB.sb.setToken('tb'); S.set('me_state_v1', CACHE('tb', B)); WB.ls.setItem('me_order', DR('나의 서약', B, clock.now)); WB.ls.setItem('me_snapLocal_BBBBBB', SN('나의 메모', clock.now));
  const barNow = WA.bar();
  WA.pend[0] && WA.pend[0]({ ok: false, reason: 'expired' }); const late = await inflight;   // 가의 옛 토큰으로 «로그인 풀림» 답이 늦게 온다
  if (late && late.ok === false && WA.sb._errSess(late)) WA.sb._errGoLogin(late, 'S');
  WA.sb._errGoLogin({ ok: false, reason: 'expired' }, 'S');   // 떠 있던 실패 창의 «로그인하기»
  await flush();
  const n0 = WA.fetches.length; const sentP = WA.sb._post({ action: 'saveProductionTrack', token: WA.sb.getToken(), track: 'snap', draft: { note: '가의 메모' } });   // 옛 편집창의 저장
  if (WA.pend.length > 1) WA.pend[WA.pend.length - 1]({ ok: true }); const sent = await sentP;
  const nSent = WA.fetches.length - n0, sentTok = nSent ? WA.fetches[WA.fetches.length - 1].token : '';
  WA.sb._mpLogoutNow();   // 옛 창의 로그아웃
  return { tok: S.get('me_token'), order: S.get('me_order'), snapB: S.get('me_snapLocal_BBBBBB'), snapA: S.get('me_snapLocal_AAAAAA'), keep: S.get('me_relogin_keep'), late: late && late.reason,
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
  const S = shared({ me_token: 'ta1', me_state_v1: CACHE('ta1', A), me_relogin_keep: JSON.stringify({ code: A, t: T0 - 1000, keys: { me_order: KD, me_snapLocal_AAAAAA: SN('최신 메모', T0 - 1000) } }) });
  const OLD = win(S, src, { acct: A }); OLD.open(JSON.parse(SN('옛 메모', T0 - 50000)), {});   // 옛 창 — 옛 스냅 임시본을 연 채
  const OF = frame(S, op, OLD, A, { tx: { 'vow.g': '옛 서약' } });   // 옛 창의 식순 화면
  const NEW = win(S, src, {}); NEW.sb.setToken('ta2'); NEW.sb.window._mpStateD = { code: A };
  const MID = win(S, src, { acct: A }); MID.open(JSON.parse(SN('그 사이 연 창의 메모', T0 - 40000)), {});   // 새 토큰으로 열었지만 되돌리기 전에 연 창
  NEW.sb._orderOwnerSweep(A); const back = NEW.sb._reloginRestore(A);
  OLD.hide(); OF._persist(); OLD.sb._snapLocalDel();
  const afterOld = { snap: memoOf(S.get('me_snapLocal_AAAAAA')), order: S.get('me_order') };
  MID.hide();
  const NF = frame(S, op, NEW, A, { tx: { 'vow.g': '새 창에서 고친 서약' } }); NF._persist();   // 지금 창은 그대로 쓴다
  return { back, afterOld, mid: memoOf(S.get('me_snapLocal_AAAAAA')), midStale: MID.sb._tabStale && MID.sb._tabStale(), nf: JSON.parse(S.get('me_order') || '{}').S, KD, bar: OLD.bar() };
};
{ const r = await run(s2, MP, OP);
  ok('② 11-03 [TAB_GUARD] 다른 창이 다시 로그인해 최신본을 되돌린 뒤 옛 창이 앱을 내리거나(스냅) · 식순 화면이 다시 써도(_persist) · 지워도 최신본 그대로',
    !r.err && r.back === true && r.afterOld.snap === '최신 메모' && r.afterOld.order === r.KD && !!r.bar, r.err || r);
  ok('② 11-03 [TAB_GUARD] 새 토큰으로 열었어도 되돌리기 전에 연 창은 되돌리기 표시(me_relogin_rst)로 옛 창 — 덮지 않는다 · 지금 창의 식순 화면은 그대로 쓴다',
    !r.err && r.mid === '최신 메모' && r.midStale === true && !!r.nf && r.nf.tx['vow.g'] === '새 창에서 고친 서약', r.err || r); }
{ const bo = brk(OP, [['function _persist(over){ if(typeof _tabGone===\'function\' && _tabGone()) return;', 'function _persist(over){']]); const rb = bo ? await run(s2, MP, bo) : null;
  ok('깨 보기 ② — 식순 화면이 부모의 옛 창 판정을 안 보면 빨강', !!rb && !rb.err && rb.afterOld.order !== rb.KD, rb && (rb.err || rb.afterOld));
  const bm = brk(MP, [['localStorage.setItem(TAB_RST_KEY, ', '(0, ']]); const rm = bm ? await run(s2, bm, OP) : null;
  ok('깨 보기 ② — 되돌리기 표시를 안 남기면 빨강(그 사이 연 창이 덮는다)', !!rm && !rm.err && rm.mid !== '최신 메모', rm && (rm.err || rm.mid)); }

/* ③ 11-04 — 옛 창의 다시 맡기기 · 맡길 때 합치기 */
const s3 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), me_order: DR('최신 서약', A, T0 - 2000), me_snapLocal_AAAAAA: SN('최신 메모', T0 - 2000) });
  const OLD = win(S, src, { acct: A }); OLD.open(JSON.parse(SN('옛 메모', T0 - 60000)), {});
  const NEW = win(S, src, { acct: A }); NEW.sb._errGoLogin({ ok: false, reason: 'expired' }, 'S');   // 새 창이 로그인 풀림 — 최신본을 맡기고 나간다
  const kept = S.get('me_relogin_keep');
  OLD.hide(); OLD.sb._errGoLogin({ ok: false, reason: 'expired' }, 'S');   // 옛 창이 앱을 내렸다가 «로그인하기»
  const k = JSON.parse(S.get('me_relogin_keep') || '{"keys":{}}');
  return { same: S.get('me_relogin_keep') === kept, snap: memoOf(k.keys.me_snapLocal_AAAAAA), order: k.keys.me_order && JSON.parse(k.keys.me_order).S.tx['vow.g'], dev: memoOf(S.get('me_snapLocal_AAAAAA')) };
};
{ const r = await run(s3, MP);
  ok('③ 11-04 [TAB_GUARD] 옛 창이 내렸다가 «로그인하기»를 눌러도 최신 맡김(최신 서약 · 최신 메모)을 옛 판으로 바꾸지 않는다', !r.err && r.same === true && r.snap === '최신 메모' && r.order === '최신 서약' && r.dev === null, r); }
const s3m = async (src) => {   /* 한 창 · 앞서 맡긴 꾸러미가 있는데 다시 맡긴다 */
  const one = (dev, keep) => { const S = shared(Object.assign({ me_token: 'ta', me_state_v1: CACHE('ta', A), me_relogin_keep: JSON.stringify(keep) }, dev)); const W = win(S, src, { acct: A });
    W.sb.clearToken(true); const k = JSON.parse(S.get('me_relogin_keep') || '{"keys":{}}').keys; return { order: k.me_order && JSON.parse(k.me_order).S.tx['vow.g'], snap: memoOf(k.me_snapLocal_AAAAAA), keys: Object.keys(k).sort().join(',') }; };
  const KEEP = { code: A, t: T0 - 3000, keys: { me_order: DR('맡긴 최신 서약', A, T0 - 3000), me_snapLocal_AAAAAA: SN('맡긴 메모', T0 - 3000) } };
  return { older: one({ me_order: DR('이 기기의 옛 서약', A, T0 - 90000) }, KEEP),   // 이 기기 식순이 더 옛것 · 스냅은 되돌리다 못 씀(이 기기에 없음)
    newer: one({ me_order: DR('이 기기에서 나중에 고친 서약', A, T0 - 100), me_snapLocal_AAAAAA: SN('이 기기에서 나중에 고친 메모', T0 - 100) }, KEEP),
    noT: one({ me_order: DR('고친 때 없는 옛 판', A, 0) }, { code: A, t: T0 - 3000, keys: { me_order: DR('맡긴 서약(때 없음)', A, 0) } }),
    saved: one({ me_order: DR('저장한 판', A, 0, false) }, KEEP),   // 이 기기 식순은 저장된 판 — 옛 맡김 식순을 다시 싣지 않는다
    other: one({ me_order: DR('이 기기 서약', A, T0 - 100) }, { code: B, t: T0 - 3000, keys: { me_snapLocal_BBBBBB: SN('남의 메모', T0) } }) };
};
{ const r = await run(s3m, MP);
  ok('③ 11-04 [RELOGIN_MERGE] 다시 맡길 때 앞서 맡긴 것과 종류마다 고친 때를 견준다 — 더 옛 이 기기 식순은 맡긴 최신 서약에 진다 · 이번에 없는 스냅(되돌리다 못 씀)은 맡긴 메모 그대로',
    !r.err && r.older.order === '맡긴 최신 서약' && r.older.snap === '맡긴 메모', r.err || r.older);
  ok('③ 11-04 [RELOGIN_MERGE] 이 기기 것이 더 나중에 고친 것이면 그것 · 고친 때가 없으면 맡긴 때로 견준다 · 이 기기에 저장한 판이 있으면 옛 맡김 식순을 싣지 않는다 · 다른 계정 맡김과는 합치지 않는다',
    !r.err && r.newer.order === '이 기기에서 나중에 고친 서약' && r.newer.snap === '이 기기에서 나중에 고친 메모' && r.noT.order === '맡긴 서약(때 없음)' && r.saved.order === undefined && r.saved.snap === '맡긴 메모' && r.other.keys === 'me_order', r.err || r); }
{ const b = brk(MP, [["if(same) ['me_order', sk]", "if(false) ['me_order', sk]"]]); const rb = b ? await run(s3m, b) : null;
  ok('깨 보기 ③ — 합치지 않고 바꾸면 빨강(맡긴 스냅이 사라진다)', !!rb && !rb.err && rb.older.snap !== '맡긴 메모', rb && (rb.err || rb.older));
  const b2 = brk(MP, [['function _tabStale(){ if(_TAB.stale) return true;', 'function _tabStale(){ return false;']]); const r2 = b2 ? await run(s3, b2) : null;
  ok('깨 보기 ③ — 옛 창 판정을 끄면 빨강(옛 창이 맡김을 바꾼다)', !!r2 && !r2.err && r2.same === false, r2); }

/* ④ 11-02 — 다 비우면 비운 때를 남긴다 */
const s4 = async (src) => {
  const KEEP = JSON.stringify({ code: A, t: T0 - 5000, keys: { me_snapLocal_AAAAAA: SN('이전 메모', T0 - 5000) } });
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A), me_snapLocal_AAAAAA: SN('이전 메모', T0 - 5000), me_relogin_keep: KEEP });
  const W = win(S, src, { acct: A }); W.open(JSON.parse(SN('이전 메모', T0 - 5000)), {});
  clock.now = T0 - 2000; W.type(''); clock.now = T0; W.hide();   // 마지막 메모까지 비우고 앱을 내림
  const dev = S.get('me_snapLocal_AAAAAA'), card = W.sb._snapLocalGet();
  const back = W.sb._reloginRestore(A);   // 같은 계정으로 다시 로그인
  return { dev, card, back, after: memoOf(S.get('me_snapLocal_AAAAAA')), card2: W.sb._snapLocalGet(), keep: S.get('me_relogin_keep') };
};
{ const r = await run(s4, MP);
  ok('④ 11-02 [EMPTY_TOMBSTONE] 다 비우면 기록을 지우지 않고 비운 때를 남긴다 · 카드는 «스냅 기획하기»(읽지 않는다)', !r.err && !!r.dev && JSON.parse(r.dev).empty === true && JSON.parse(r.dev).t === T0 - 2000 && r.card === null, r);
  ok('④ 11-02 [EMPTY_TOMBSTONE] 다시 로그인해도 비운 칸에 이전 메모가 되살아나지 않는다(비운 때가 더 나중) · 맡김은 지운다', !r.err && r.after === '(비움)' && r.card2 === null && r.keep === null, r); }
{ const f = async (src) => { const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) }); const W = win(S, src, { acct: A }); W.open(null, {}); W.hide(); return S.get('me_snapLocal_AAAAAA'); };
  const r = await run(f, MP); ok('④ 11-02 한 번도 고치지 않은 빈 판은 종전대로 남기지 않는다', r === null, r); }
{ const b = brk(MP, [['else if(SNAPFLOW.t) localStorage.setItem(k, JSON.stringify({v:2, empty:true, t:SNAPFLOW.t}));', '']]); const rb = b ? await run(s4, b) : null;
  ok('깨 보기 ④ — 비울 때 지우면 빨강(이전 메모가 되살아난다)', !!rb && !rb.err && rb.after === '이전 메모', rb); }

/* ⑤ 11-01 — 고친 때는 입력한 그때 */
const s5 = async (src) => {
  const S = shared({ me_token: 'ta', me_state_v1: CACHE('ta', A) });
  const W1 = win(S, src, { acct: A }); W1.open(null, {}); W1.hide();
  const W2 = win(S, src, { acct: A }); W2.open(null, {}); W2.hide();
  clock.now = T0 + 1000; W1.type('창1에서 먼저 쓴 메모');
  clock.now = T0 + 2000; W2.type('창2에서 나중에 쓴 메모'); clock.now = T0 + 2100; W2.hide(); W2.sb._reloginStash();   // 창2 — 나중 입력 · 맡김
  clock.now = T0 + 3000; W1.hide();   // 창1을 나중에 내린다
  const t1 = JSON.parse(S.get('me_snapLocal_AAAAAA') || '{}').t;
  const back = W2.sb._reloginRestore(A); clock.now = T0;
  return { t1, back, memo: memoOf(S.get('me_snapLocal_AAAAAA')), keep: S.get('me_relogin_keep') };
};
{ const r = await run(s5, MP);
  ok('⑤ 11-01 [EDIT_T_AT_INPUT] 먼저 입력하고 나중에 내린 창의 쓰기는 입력한 때(1000)를 싣는다 · 되돌리면 나중에 고친 창2의 메모', !r.err && r.t1 === T0 + 1000 && r.memo === '창2에서 나중에 쓴 메모' && r.keep === null, r); }
{ const b = brk(MP, [['if(SNAPFLOW._lj==null) SNAPFLOW._lj=j; else if(SNAPFLOW._lj!==j){ SNAPFLOW._lj=j; SNAPFLOW.t=Date.now(); } }catch(e){} }', 'if(SNAPFLOW._lj==null) SNAPFLOW._lj=j; }catch(e){} }'],
    ['if(SNAPFLOW._lj==null) SNAPFLOW._lj=JSON.stringify(o);', 'var j=JSON.stringify(o); if(SNAPFLOW._lj==null) SNAPFLOW._lj=j; else if(SNAPFLOW._lj!==j){ SNAPFLOW._lj=j; SNAPFLOW.t=Date.now(); }']]);
  const rb = b ? await run(s5, b) : null;
  ok('깨 보기 ⑤ — 쓸 때 고친 때를 적으면(옛 꼴) 빨강', !!rb && !rb.err && rb.memo === '창1에서 먼저 쓴 메모', rb); }

/* 걸림 · 줄 */
ok('[TAB_GUARD] 보내기 한 벌(_post)이 옛 창 · 그 사이 바뀐 답을 막는다 · 로그인 풀림 길(알림 링크 · 상태 불러오기 · 저장 실패 판)이 먼저 _tabDrop 을 본다',
  /_tabStale\(\)\)\{ _tabStaleShow\(\); return Promise\.resolve\(_sd\(\)\); \}/.test(MP) && (MP.match(/typeof _tabDrop=='function' && _tabDrop\(/g) || []).length >= 6 && /tab_stale:1/.test(MP));
ok('[TAB_GUARD] 줄은 짧게(20자 안) · 코드 L8', TAB_LINE.replace(/ \(코드 L8\)$/, '').length <= 20 && MP.includes("TAB_LINE='" + TAB_LINE + "'"));

console.log(fail ? `\n★ 실패 ${fail}건` : '\nTAB GUARD OK'); process.exit(fail ? 1 : 0);
