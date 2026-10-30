#!/usr/bin/env node
/* ★[RELOGIN_KEEP_1030 · RELOGIN_STASH_FIRST · RELOGIN_ACCT_CACHE · RELOGIN_OWNER 2026-10-30 GPT 7차 점검(고객) 7-01 · 7-02 · 7-03]
   로그인이 풀려 로그인 화면으로 갈 때 맡기는 초안([RELOGIN_KEEP] · mypage.html)이 사라지지 않는지 잰다(함수 원문을 떼어 vm 으로).
   ① 7-01 맡김 쓰기가 실패하면(QuotaExceededError) 원본(식순 초안 · 스냅 임시본 · 로그인 표시)을 그대로 두고 «초안을 보관하지 못했어요 (코드 S4)»
         · «이어서 저장해 주세요»를 말하지 않는다 · 알림 링크 · 상태 불러오기 길도 같다
   ② 7-02 알림 링크 길(마이페이지를 그리기 전 · 지금 계정이 빔) · 스냅 임시본만 있어도 이 토큰의 상태 캐시 코드로 맡기고 같은 코드로 되돌린다
         · 맡긴 것이 없으면 «이어서 저장해 주세요»를 말하지 않는다
   ③ 7-03 되돌릴 때 이 기기 식순 초안이 다른 주인(공개 미리보기 who '' · 다른 계정)이면 막지 않고 이 계정 것으로 · 같은 계정 초안이 있으면 그것
         · 되돌리기 쓰기가 실패하면 맡김을 남긴다(다 되돌린 뒤에야 지운다)
   ④ 8-01 [RELOGIN_NEWER] 같은 계정 초안이 이미 있으면 고친 때를 견준다 — 저장 안 한 고침이고 맡긴 것보다 나중일 때만 그것 · 고친 때가 없거나 더 오래됐으면 맡긴 것
         · 식순 화면 _persist 가 «실제로 고친 때»만 적는다(다시 쓰기만 해서 새것이 되지 않는다)
   ⑤ 8-02 [RELOGIN_S4_GO] 식순 화면 «로그인하기» → S4 판에 «그대로 로그인하기» · 누르면 로그인 표시만 지우고 이 기기 초안은 그대로 로그인 화면으로
         · 다른 계정으로 로그인하면 남의 초안을 걷는다(_orderOwnerSweep · 식순 화면 ORDER_OWNER)
   ⑥ 9-01 [RELOGIN_SNAP_KEEP] 식순 초안 없이 스냅 임시본만 있는 기기 — S4 «그대로 로그인하기» 뒤 만료된 알림 링크(계정을 모름)로 다시 들어와도 코드별 임시본을 지우지 않는다
         · 같은 계정 로그인이면 그대로(«이어서 고르기») · 다른 계정 로그인 확인 · 스스로 로그아웃이면 지운다
   ⑦ 10-01 [RELOGIN_SNAP_NEWER] 맡긴 최신 스냅 임시본 vs 같은 계정 옛 탭이 앱을 내릴 때 다시 쓴 옛 임시본 — 고친 때를 견줘 나중 것 · 고친 때가 없는 이 기기 것은 진다
         · _snapLocalPut 은 글이 바뀔 때만 고친 때를 새로 적는다(다시 쓰기 · 앱 내림 · 걸음 넘김은 그대로)
   깨 보기: 고친 줄을 옛 꼴로 되돌려 같은 장면이 빨개지는지 본다.
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const grabIn = (src, name) => { let i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const brk = (src, pairs) => { let t = src; for (const [a, b] of pairs) { if (t.split(a).length !== 2) return null; t = t.replace(a, b); } return t; };
const flush = () => new Promise((r) => setTimeout(r, 0));
const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const FNS = ['clearToken', '_reloginStash', '_reloginCode', '_reloginAcct', '_reloginPack', '_reloginLine', '_reloginRestore', '_reloginCurNewer', '_reloginSnapNewer', '_reloginFailShow', '_reloginGoAnyway', '_reloginShowLogin', '_orderOwnerSweep', '_errGoLogin', '_autoLogin', 'readCachedState'];
const FAIL_LINE = '초안을 보관하지 못했어요 (코드 S4)';
/* quota = 이 이름에 쓰면 QuotaExceededError */
const mkStore = (init, quota) => { const m = new Map(Object.entries(init || {}));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (quota && quota(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); },
    removeItem: (k) => m.delete(k), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; } }; };
function world(src, o) {
  const code = FNS.map((f) => grabIn(src, f)).join('\n') + '\n' + lineIn(src, /var RELOGIN_KEY=[^\n]*/) + '\n' + lineIn(src, /var ERR_W=[^\n]*/) + '\n' + lineIn(src, /var ERR_DO=[^\n]*/);
  const ls = mkStore(o.ls, o.quota), ss = mkStore(); const W = { alerts: [], btns: [], notes: [], shows: [], reloaded: 0 };
  const sb = { localStorage: ls, sessionStorage: ss, TOKEN_KEY: 'me_token', STATE_CACHE_KEY: 'me_state_v1', _mpAcctSweep: () => {}, _mpAcct: () => o.acct || '',
    getToken: () => ls.getItem('me_token') || '', _errLine: (x, L) => '로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 ' + L + '8)', _errSess: () => true, _errHtml: (s) => String(s),
    _wizCurId: () => (o.wiz ? 'order' : ''), _mpFsOpen: () => false, location: { reload: () => { W.reloaded++; } }, mpAlert: (m) => { W.alerts.push(m && (m.bodyHtml || m.body)); W.btns.push(['확인']); },
    mpConfirm: (m) => { W.alerts.push(m && (m.bodyHtml || m.body)); W.btns.push([m.yes, m.no]); return Promise.resolve(o.pick === undefined ? false : o.pick); },
    closeLedModal: () => {}, _flowBusy: () => {}, show: (v) => W.shows.push(v), softLoginNote: (t) => W.notes.push(t), cleanUrl: () => {}, setToken: () => {}, loadMyState: () => {}, _loadSlowRetry: () => {},
    api: () => Promise.resolve({ ok: false, reason: 'expired' }), JSON, Date, Object, String };
  vm.createContext(sb); vm.runInContext(code, sb); return { sb, ls, ss, W };
}
const miss = FNS.filter((f) => !grabIn(MP, f));
if (miss.length) { ok('원문 조각을 못 떼었다 — ' + miss.join(', '), false); process.exit(1); }
const DRAFT = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '고친 서약' } }, who: 'AB12CD', dirty: true, base: 'k0' });
const SNAP = '{"n":1}';
const BASE = () => ({ me_token: 't', me_state_v1: JSON.stringify({ t: 't', d: { code: 'AB12CD' } }), me_order: DRAFT, me_snapLocal_AB12CD: SNAP });

/* ① 7-01 — 맡김 쓰기 실패 */
const t1 = async (src) => {
  const A = world(src, { acct: 'AB12CD', wiz: true, ls: BASE(), quota: (k) => k === 'me_relogin_keep' });
  A.sb._errGoLogin({ ok: false, ecode: 'S8' }, 'S');
  const a = { order: A.ls.getItem('me_order'), snap: A.ls.getItem('me_snapLocal_AB12CD'), tok: A.ls.getItem('me_token'), note: A.ss.getItem('me_login_note'), alerts: A.W.alerts, shows: A.W.shows, reloaded: A.W.reloaded };
  const B = world(src, { ls: BASE(), quota: (k) => k === 'me_relogin_keep' }); B.sb._autoLogin('url'); for (let i = 0; i < 4; i++) await flush();
  const b = { order: B.ls.getItem('me_order'), snap: B.ls.getItem('me_snapLocal_AB12CD'), notes: B.W.notes };
  return { a, b };
};
{ let r; try { r = await t1(MP); } catch (e) { r = { err: String(e && e.stack || e).slice(0, 300) }; }
  const pass = !r.err && r.a.order === DRAFT && r.a.snap === SNAP && r.a.tok === 't' && r.a.note === null && r.a.reloaded === 0 && !r.a.shows.includes('loginView')
    && r.a.alerts.length === 1 && r.a.alerts[0] === FAIL_LINE && r.b.order === DRAFT && r.b.snap === SNAP && r.b.notes.length === 1 && r.b.notes[0] === FAIL_LINE && !/이어서/.test(r.b.notes.join(''));
  ok('① 7-01 [RELOGIN_STASH_FIRST] 맡김 쓰기가 실패하면 초안 · 스냅 임시본 · 로그인 표시를 지우지 않고 지금 화면에 «초안을 보관하지 못했어요 (코드 S4)» · «이어서 저장»을 말하지 않는다(알림 링크 길도)', pass, r);
  const b = brk(MP, [['if(_kp<0) return null;', 'if(_kp<0) _kp=0;']]); let rb = null; try { rb = b ? await t1(b) : null; } catch (e) { rb = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ① — 옛 꼴(못 맡겨도 지우고 넘어감)이면 빨강', !!rb && !rb.err && rb.a.order === null, rb); }
{ /* 쓰기는 됐는데 다시 읽어 다르면(조용히 잘림) 못 맡긴 것 */
  const A = world(MP, { acct: 'AB12CD', ls: BASE() }); const si = A.ls.setItem; A.ls.setItem = (k, v) => si(k, k === 'me_relogin_keep' ? String(v).slice(0, 10) : v);
  let r; try { A.sb._errGoLogin({ ok: false, ecode: 'S8' }, 'S'); r = { order: A.ls.getItem('me_order'), alerts: A.W.alerts }; } catch (e) { r = { err: String(e).slice(0, 200) }; }
  ok('① 7-01 [RELOGIN_STASH_FIRST] 맡김을 다시 읽어 같지 않으면 못 맡긴 것 — 초안 그대로 · S4', !r.err && r.order === DRAFT && r.alerts[0] === FAIL_LINE, r); }

/* ② 7-02 — 알림 링크 길 · 지금 계정이 빔 · 스냅 임시본만 */
const t2 = async (src, ls) => { const A = world(src, { ls }); A.sb._autoLogin('url'); for (let i = 0; i < 4; i++) await flush();
  const mid = { snap: A.ls.getItem('me_snapLocal_AB12CD'), keep: A.ls.getItem('me_relogin_keep'), notes: A.W.notes.slice() };
  const back = A.sb._reloginRestore('AB12CD'); return { mid, back, snap: A.ls.getItem('me_snapLocal_AB12CD'), keep: A.ls.getItem('me_relogin_keep') }; };
{ const L = () => ({ me_token: 't', me_state_v1: JSON.stringify({ t: 't', d: { code: 'AB12CD' } }), me_snapLocal_AB12CD: SNAP });
  let r, n0; try { r = await t2(MP, L()); n0 = await t2(MP, { me_token: 't', me_state_v1: JSON.stringify({ t: 't', d: { code: 'AB12CD' } }) }); } catch (e) { r = { err: String(e && e.stack || e).slice(0, 300) }; }
  const pass = !r.err && r.mid.snap === null && !!r.mid.keep && /다시 로그인한 뒤 이어서 저장해 주세요 \(코드 L8\)/.test(r.mid.notes[0] || '') && r.back === true && r.snap === SNAP && r.keep === null;
  ok('② 7-02 [RELOGIN_ACCT_CACHE] 알림 링크 길(지금 계정 빔 · 식순 초안 없음 · 스냅 임시본만) — 이 토큰의 상태 캐시 코드로 맡기고 같은 코드 로그인에서 되돌린다', pass, r);
  ok('② 7-02 맡긴 것이 없으면 «이어서 저장해 주세요»를 말하지 않는다(우리 기본 글 그대로)', !!n0 && n0.mid.keep === null && n0.mid.notes[0] === '로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 L8)', n0);
  /* 남의 토큰 캐시(토큰이 다름)는 쓰지 않는다 */
  let x; try { x = await t2(MP, { me_token: 't', me_state_v1: JSON.stringify({ t: 'other', d: { code: 'AB12CD' } }), me_snapLocal_AB12CD: SNAP }); } catch (e) { x = { err: String(e).slice(0, 200) }; }
  ok('② 7-02 상태 캐시는 지금 토큰에 맞을 때만 쓴다', !!x && !x.err && x.mid.keep === null, x);
  const b = brk(MP, [['var code=_reloginCode(); if(!code)', 'var code=_mpAcct()||String((r&&r.who)||\'\'); if(!code)']]); let rb = null; try { rb = b ? await t2(b, L()) : null; } catch (e) { rb = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ② — 옛 꼴(지금 계정만 봄)이면 빨강', !!rb && !rb.err && rb.back === false && rb.snap === null, rb); }

/* ③ 7-03 — 되돌릴 때 다른 주인의 me_order */
const KEEP = JSON.stringify({ code: 'AB12CD', t: Date.now(), keys: { me_order: DRAFT, me_snapLocal_AB12CD: SNAP } });
const t3 = (src, cur, quota) => { const ls = { me_relogin_keep: KEEP }; if (cur != null) ls.me_order = cur;
  const A = world(src, { ls, quota }); const back = A.sb._reloginRestore('AB12CD'); return { back, order: A.ls.getItem('me_order'), snap: A.ls.getItem('me_snapLocal_AB12CD'), keep: A.ls.getItem('me_relogin_keep') }; };
{ const pub = JSON.stringify({ v: 2, S: { tx: {} }, who: '', dirty: true }), oth = JSON.stringify({ v: 2, S: {}, who: 'ZZ99ZZ', dirty: true }), mine = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '다른 탭에서 더 쓴 글' } }, who: 'AB12CD', dirty: true, t: Date.now() + 60000 });
  let p, o2, m, q, no; try { p = t3(MP, pub); o2 = t3(MP, oth); m = t3(MP, mine); q = t3(MP, null, (k) => k === 'me_order'); no = t3(MP, null); } catch (e) { p = { err: String(e && e.stack || e).slice(0, 300) }; }
  ok('③ 7-03 [RELOGIN_OWNER] 이 기기 식순 초안이 공개 미리보기(who \'\') · 다른 계정 것이면 막지 않고 이 계정 초안으로 되돌린다 · 맡김은 그 뒤에 지운다', !p.err && p.back === true && p.order === DRAFT && p.snap === SNAP && p.keep === null && o2.back === true && o2.order === DRAFT && o2.keep === null, { p, o2 });
  ok('③ 7-03 같은 계정 초안이 맡긴 것보다 나중에 고친 것이면 그것을 둔다 · 스냅 임시본은 되돌린다', !!m && m.order === mine && m.snap === SNAP && m.keep === null, m);
  ok('③ 7-03 되돌리기 쓰기가 실패하면 맡김을 남긴다(다음 로그인에 다시) · 초안이 없던 기기는 종전대로 되돌린다', !!q && q.order === null && q.keep === KEEP && !!no && no.back === true && no.order === DRAFT && no.keep === null, { q, no });
  const b = brk(MP, [["      if(String(cj.who||'')===c && _reloginCurNewer(cj, v, o.t)) return; }", '      return; }']]); let rb = null; try { rb = b ? t3(b, pub) : null; } catch (e) { rb = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ③ — 옛 꼴(주인을 안 보고 건너뜀)이면 빨강', !!rb && !rb.err && rb.order === pub, rb);
  const b2 = brk(MP, [['  var c=String(code), n=0, all=true;', '  var c=String(code), n=0, all=true; localStorage.removeItem(RELOGIN_KEY);']]); let rc = null; try { rc = b2 ? t3(b2, null, (k) => k === 'me_order') : null; } catch (e) { rc = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ③ — 옛 꼴(맡김부터 지움)이면 빨강', !!rc && !rc.err && rc.keep === null, rc); }

/* ④ 8-01 — 같은 계정 초안이 이미 있을 때 고친 때를 견준다 */
const T1 = Date.now() - 5000;
const KD = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '방금 고친 서약' } }, who: 'AB12CD', dirty: true, base: 'k0', t: T1 });
const t4 = (src, cur, keptOrder, ot) => { const ls = { me_relogin_keep: JSON.stringify({ code: 'AB12CD', t: ot || Date.now(), keys: { me_order: keptOrder || KD } }) }; if (cur != null) ls.me_order = cur;
  const A = world(src, { ls }); const back = A.sb._reloginRestore('AB12CD'); return { back, order: A.ls.getItem('me_order'), keep: A.ls.getItem('me_relogin_keep') }; };
{ const older = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '옛 탭의 글' } }, who: 'AB12CD', dirty: true, t: T1 - 60000 }),
    clean = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '옛 탭의 글' } }, who: 'AB12CD', dirty: false }),
    noT = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '옛 탭의 글' } }, who: 'AB12CD', dirty: true }),
    newer = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '다른 탭이 나중에 고친 글' } }, who: 'AB12CD', dirty: true, t: T1 + 60000 }),
    keptNoT = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '방금 고친 서약' } }, who: 'AB12CD', dirty: true });
  let a, b, c, d, e, f; try { a = t4(MP, older); b = t4(MP, clean); c = t4(MP, noT); d = t4(MP, newer); e = t4(MP, JSON.stringify({ v: 2, S: {}, who: 'AB12CD', dirty: true, t: T1 + 1000 }), keptNoT, T1 + 5000); f = t4(MP, JSON.stringify({ v: 2, S: {}, who: 'AB12CD', dirty: true, t: T1 + 9000 }), keptNoT, T1 + 5000); } catch (x) { a = { err: String(x && x.stack || x).slice(0, 300) }; }
  ok('④ 8-01 [RELOGIN_NEWER] 같은 계정 초안이 더 오래전에 고친 것이면(저장 안 한 고침 · 그냥 판 모두) 맡긴 고침을 되돌린다 · 맡김은 그 뒤에 지운다', !a.err && a.back === true && a.order === KD && a.keep === null && b.back === true && b.order === KD && b.keep === null, { a, b });
  ok('④ 8-01 같은 계정 초안에 고친 때가 없으면 맡긴 것(이 탭이 떠날 때의 마지막 판)', !!c && c.back === true && c.order === KD && c.keep === null, c);
  ok('④ 8-01 같은 계정 초안이 더 나중에 고친 것이면 그것을 두고 맡김을 지운다(더 새것임을 확인했으니)', !!d && d.order === newer && d.keep === null, d);
  ok('④ 8-01 맡긴 초안에 고친 때가 없으면 맡긴 때로 견준다', !!e && e.order === keptNoT && !!f && f.order !== keptNoT && f.keep === null, { e, f });
  const bk = brk(MP, [['_reloginCurNewer(cj, v, o.t)) return; }', 'true) return; }']]); let rb = null; try { rb = bk ? t4(bk, older) : null; } catch (x) { rb = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ④ — 옛 꼴(같은 계정이면 견주지 않고 그것을 둠)이면 빨강', !!rb && !rb.err && rb.order === older && rb.keep === null, rb); }
{ /* 식순 화면 _persist — «실제로 고친 때»만 적는다 */
  const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  const pt = (src) => { const fn = grabIn(src, '_persist') + '\n' + grabIn(src, '_ordKey'), dl = lineIn(src, /var _editT=[^\n]*/), rs = lineIn(src, /if\(!\(_sv0&&_sv0\.who&&!EMBED\)&&_applySaved\(_sv0\)\)[^\n]*/);
    if (!fn || !dl || !rs) return { err: '원문 조각을 못 떼었다' };
    let now = 1000; const ls = mkStore({}); const sb = { localStorage: ls, JSON, Object, Date: { now: () => now }, S: { a: 1 }, idx: 0, _seenK: {}, courseStarted: true, _doneSaved: false, _who: 'AB12CD', _srvBase: 'k0', _autoLast: 'srv',
      _autoKey: () => JSON.stringify(sb.S), _dirtyMark: () => {}, _closeFit: () => {}, _seamFitKeep: () => {}, _applySaved: (v) => { sb.S = v.S; return true; }, EMBED: true, _persistBad: false };
    vm.createContext(sb); vm.runInContext(fn + '\n' + dl + '\nfunction _go(){ var _sv0=JSON.parse(localStorage.getItem("me_order")||"null");\n' + rs + '\n}', sb);
    const rd = () => JSON.parse(ls.getItem('me_order')).t;
    sb._persist(); const t1 = rd(); now = 2000; sb._persist(); const t2 = rd(); now = 3000; sb.S = { a: 2 }; sb._persist(); const t3 = rd();
    sb._autoLast = JSON.stringify(sb.S); now = 4000; sb._persist(); const t4b = rd();
    /* 다른 탭: 옛 판(고친 때 1500)을 되살린 뒤 다시 쓰기만 한다 */
    ls.setItem('me_order', JSON.stringify({ v: 2, S: { a: 9 }, who: 'AB12CD', dirty: true, t: 1500 })); sb._autoLast = 'srv'; vm.runInContext('_editT=0; _editK=null; _go();', sb); now = 9000; sb._persist(); const t5 = rd();
    return { t1, t2, t3, t4b, t5 }; };
  let r; try { r = pt(OP); } catch (x) { r = { err: String(x && x.stack || x).slice(0, 300) }; }
  ok('④ 8-01 [RELOGIN_NEWER] 식순 화면이 저장 안 한 고침이 생긴 때만 적는다 · 다시 쓰기만 하면 그대로 · 되살린 판은 그 판의 때 그대로', !r.err && r.t1 === 1000 && r.t2 === 1000 && r.t3 === 3000 && r.t4b === undefined && r.t5 === 1500, r);
  const bk = brk(OP, [['if(rec.dirty&&_ek!==_editK) _editT=Date.now();', 'if(rec.dirty) _editT=Date.now();']]); let rb = null; try { rb = bk ? pt(bk) : null; } catch (x) { rb = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ④ — 쓸 때마다 새 때를 적으면 빨강', !!rb && !rb.err && rb.t2 === 2000, rb); }

/* ⑤ 8-02 — S4 판에서 «그대로 로그인하기» */
const t5 = async (src, pick, wiz) => { const ls = Object.assign(BASE(), { me_deliv_AB12CD: '1', me_prod_ping: '1' });
  const A = world(src, { acct: 'AB12CD', wiz, pick, ls, quota: (k) => k === 'me_relogin_keep' }); A.sb._errGoLogin({ ok: false, ecode: 'S8' }, 'S'); for (let i = 0; i < 4; i++) await flush();
  return { tok: A.ls.getItem('me_token'), cache: A.ls.getItem('me_state_v1'), order: A.ls.getItem('me_order'), snap: A.ls.getItem('me_snapLocal_AB12CD'), deliv: A.ls.getItem('me_deliv_AB12CD'),
    note: A.ss.getItem('me_login_note'), reloaded: A.W.reloaded, shows: A.W.shows, notes: A.W.notes, alerts: A.W.alerts, btns: A.W.btns }; };
{ let go, stay, flat; try { go = await t5(MP, true, true); stay = await t5(MP, false, true); flat = await t5(MP, true, false); } catch (x) { go = { err: String(x && x.stack || x).slice(0, 300) }; }
  ok('⑤ 8-02 [RELOGIN_S4_GO] S4 판은 실패 한 줄 그대로 · 단추는 «그대로 로그인하기» · «확인»', !go.err && go.alerts[0] === FAIL_LINE && JSON.stringify(go.btns[0]) === JSON.stringify(['그대로 로그인하기', '확인']), go);
  ok('⑤ 8-02 «그대로 로그인하기» — 로그인 표시 · 상태 캐시 · 다른 기억은 지우고 이 기기 초안 · 스냅 임시본은 그대로 · 로그인 화면으로(겹화면이면 새로 열어 그 줄을 로그인 칸에)',
    !go.err && go.tok === null && go.cache === null && go.deliv === null && go.order === DRAFT && go.snap === SNAP && go.reloaded === 1 && /\(코드 S8\)/.test(go.note || '')
    && !!flat && flat.tok === null && flat.order === DRAFT && flat.shows.includes('loginView') && /\(코드 S8\)/.test(flat.notes[0] || ''), { go, flat });
  ok('⑤ 8-02 «확인»이면 종전대로 아무것도 지우지 않고 지금 화면', !!stay && stay.tok === 't' && stay.order === DRAFT && stay.reloaded === 0 && !stay.shows.includes('loginView'), stay);
  const bk = brk(MP, [['if(go===true) _reloginGoAnyway(line);', '']]); let rb = null; try { rb = bk ? await t5(bk, true, true) : null; } catch (x) { rb = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ⑤ — 옛 꼴(로그인으로 갈 길 없음)이면 빨강', !!rb && !rb.err && rb.tok === 't' && rb.reloaded === 0, rb);
  const bk2 = brk(MP, [["if(k && k!=='me_order' && !/^me_snapLocal_/.test(k) && /^me_(order|", "if(k && /^me_(order|"]]); let rc = null; try { rc = bk2 ? await t5(bk2, true, true) : null; } catch (x) { rc = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ⑤ — 초안까지 지우면 빨강', !!rc && !rc.err && rc.order === null, rc); }
{ /* 다른 계정 로그인 — 남의 초안을 걷는다 */
  const sw = (src, cur, code) => { const A = world(src, { ls: cur == null ? {} : { me_order: cur } }); A.sb._orderOwnerSweep(code); return A.ls.getItem('me_order'); };
  const pub = JSON.stringify({ v: 2, S: {}, who: '' });
  let r; try { r = { other: sw(MP, DRAFT, 'ZZ99ZZ'), same: sw(MP, DRAFT, 'AB12CD'), pub: sw(MP, pub, 'ZZ99ZZ') }; } catch (x) { r = { err: String(x).slice(0, 200) }; }
  const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  const opOwner = /if\(CUST&&CUST\.code&&_restored&&_who!==String\(CUST\.code\)\)\{\s*try\{ var _ow=JSON\.parse\(localStorage\.getItem\('me_order'\)\|\|'null'\); if\(!_tabGone\(\) && String\(\(_ow&&_ow\.who\)\|\|''\)===String\(_who\|\|''\)\) localStorage\.removeItem\('me_order'\); \}/.test(OP);   // [TAB_GUARD_FILL] 공통 판정 · 되살린 그 주인 판일 때만
  ok('⑤ 8-02 다른 계정으로 로그인하면 남의 식순 초안을 걷는다(같은 계정 · 공개 미리보기는 그대로) · 상태를 받자마자 · 식순 화면 ORDER_OWNER 도 그대로',
    !r.err && r.other === null && r.same === DRAFT && r.pub === pub && /_orderOwnerSweep\(d\.code\); _reloginRestore\(d\.code\);/.test(MP) && opOwner, { r, opOwner }); }

/* ⑥ 9-01 [RELOGIN_SNAP_KEEP] 식순 초안 없이 스냅 임시본만 있는 기기 — S4 «그대로 로그인하기» 뒤 만료된 알림 링크로 다시 들어와도(계정을 모름) 임시본이 남는다 */
const t6 = async (src) => {
  const A = world(src, { acct: 'AB12CD', wiz: true, pick: true, ls: { me_token: 't', me_state_v1: JSON.stringify({ t: 't', d: { code: 'AB12CD' } }), me_snapLocal_AB12CD: SNAP, me_snapLocal_ZZ99ZZ: '{"n":9}' }, quota: (k) => k === 'me_relogin_keep' });
  A.sb._errGoLogin({ ok: false, ecode: 'S8' }, 'S'); for (let i = 0; i < 4; i++) await flush();
  const s4 = { tok: A.ls.getItem('me_token'), snap: A.ls.getItem('me_snapLocal_AB12CD') };
  const B = world(src, { ls: Object.fromEntries(A.ls.m) }); B.ls.setItem('me_token', 'old'); B.sb._autoLogin('url'); for (let i = 0; i < 4; i++) await flush();   // 새로 연 쪽(지금 계정 빔 · 상태 캐시 없음)
  const mid = { snap: B.ls.getItem('me_snapLocal_AB12CD'), other: B.ls.getItem('me_snapLocal_ZZ99ZZ'), tok: B.ls.getItem('me_token'), keep: B.ls.getItem('me_relogin_keep'), notes: B.W.notes.slice() };
  const C = world(src, { ls: Object.fromEntries(B.ls.m) }); C.sb._orderOwnerSweep('AB12CD'); C.sb._reloginRestore('AB12CD');   // 같은 계정으로 로그인(상태를 받은 자리 그대로)
  const same = { snap: C.ls.getItem('me_snapLocal_AB12CD'), other: C.ls.getItem('me_snapLocal_ZZ99ZZ') };
  const D = world(src, { ls: Object.fromEntries(B.ls.m) }); D.sb._orderOwnerSweep('ZZ99ZZ'); D.sb._reloginRestore('ZZ99ZZ');   // 다른 계정으로 로그인
  const sw = { snap: D.ls.getItem('me_snapLocal_AB12CD'), own: D.ls.getItem('me_snapLocal_ZZ99ZZ') };
  const E = world(src, { ls: Object.fromEntries(B.ls.m) }); E.sb.clearToken();   // 스스로 로그아웃
  const out = { snap: E.ls.getItem('me_snapLocal_AB12CD'), other: E.ls.getItem('me_snapLocal_ZZ99ZZ') };
  return { s4, mid, same, sw, out };
};
{ let r; try { r = await t6(MP); } catch (e) { r = { err: String(e && e.stack || e).slice(0, 300) }; }
  ok('⑥ 9-01 [RELOGIN_SNAP_KEEP] S4 «그대로 로그인하기» 뒤 만료된 알림 링크(계정을 모름) — 코드별 스냅 임시본을 지우지 않는다 · 로그인 표시는 지운다 · «이어서 저장»은 말하지 않는다',
    !r.err && r.s4.tok === null && r.s4.snap === SNAP && r.mid.snap === SNAP && r.mid.other === '{"n":9}' && r.mid.tok === null && r.mid.keep === null && !/이어서/.test(r.mid.notes.join('')), r);
  ok('⑥ 9-01 같은 계정으로 로그인하면 그 임시본이 그대로(«이어서 고르기») · 다른 계정으로 로그인하면 남의 임시본을 걷고 제 것은 둔다 · 스스로 로그아웃하면 다 지운다',
    !r.err && r.same.snap === SNAP && r.same.other === null && r.sw.snap === null && r.sw.own === '{"n":9}' && r.out.snap === null && r.out.other === null, r);
  const bk = brk(MP, [["&& !(_ksnap && /^me_snapLocal_/.test(k))", '']]); let rb = null; try { rb = bk ? await t6(bk) : null; } catch (x) { rb = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ⑥ — 옛 꼴(계정을 몰라도 코드별 임시본을 다 지움)이면 빨강', !!rb && !rb.err && rb.mid.snap === null, rb); }

/* ⑦ 10-01 [RELOGIN_SNAP_NEWER] 스냅 임시본도 고친 때를 견준다 — 맡긴 최신 메모 vs 옛 탭이 다시 쓴 옛 메모 */
const T7 = Date.now() - 5000;
const SN = (memo, t) => { const o = { v: 2, zones: { candle: { picks: [], ups: [], links: [], note: memo }, white: { picks: [], ups: [], links: [], note: '' } }, note: '' }; if (t) o.t = t; return JSON.stringify(o); };
const NEWM = '최신 메모: 아이와 함께 준비해 주세요', OLDM = '이전 메모: 두 사람만 준비해 주세요';
const t7 = (src, cur, kept, ot) => { const ls = { me_relogin_keep: JSON.stringify({ code: 'AB12CD', t: ot || Date.now(), keys: { me_snapLocal_AB12CD: kept } }) }; if (cur != null) ls.me_snapLocal_AB12CD = cur;
  const A = world(src, { ls }); const back = A.sb._reloginRestore('AB12CD'); const sv = A.ls.getItem('me_snapLocal_AB12CD');
  return { back, memo: sv && JSON.parse(sv).zones.candle.note, keep: A.ls.getItem('me_relogin_keep') }; };
const r7 = (src) => ({
  old: t7(src, SN(OLDM, T7 - 60000), SN(NEWM, T7)),          // 옛 탭이 다시 쓴 옛 임시본(더 오래전에 고침)
  noT: t7(src, SN(OLDM), SN(NEWM, T7)),                       // 고친 때가 없는 옛 판
  newer: t7(src, SN(OLDM, T7 + 60000), SN(NEWM, T7)),         // 이 기기 것이 정말 나중에 고친 것
  kNoT: t7(src, SN(OLDM, T7 + 1000), SN(NEWM), T7 + 5000),    // 맡긴 것에 고친 때가 없으면 맡긴 때로
  kNoT2: t7(src, SN(OLDM, T7 + 9000), SN(NEWM), T7 + 5000) });
{ let r; try { r = r7(MP); } catch (e) { r = { err: String(e && e.stack || e).slice(0, 300) }; }
  ok('⑦ 10-01 [RELOGIN_SNAP_NEWER] 같은 계정 옛 탭이 앱을 내릴 때 다시 쓴 옛 스냅 임시본(«이전 메모»)이 있어도 맡긴 최신본(«최신 메모»)을 되돌린다 · 맡김은 그 뒤에 지운다',
    !r.err && r.old.back === true && r.old.memo === NEWM && r.old.keep === null, r);
  ok('⑦ 10-01 이 기기 임시본에 고친 때가 없으면 맡긴 것 · 이 기기 것이 더 나중에 고친 것이면 그것을 두고 맡김을 지운다(더 새것임을 확인)',
    !r.err && r.noT.memo === NEWM && r.noT.keep === null && r.newer.memo === OLDM && r.newer.keep === null, r);
  ok('⑦ 10-01 맡긴 임시본에 고친 때가 없으면 맡긴 때로 견준다', !r.err && r.kNoT.memo === NEWM && r.kNoT2.memo === OLDM && r.kNoT2.keep === null, r);
  const bk = brk(MP, [["if(k!=='me_order'){ if(_reloginSnapNewer(cj, v, o.t)) return; }", "if(k!=='me_order'){ return; }"]]); let rb = null; try { rb = bk ? r7(bk) : null; } catch (x) { rb = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ⑦ — 옛 꼴(이미 있으면 견주지 않고 그것을 두고 맡김을 지움)이면 빨강', !!rb && !rb.err && rb.old.memo === OLDM && rb.old.keep === null, rb); }
{ /* _snapLocalPut — 글이 바뀔 때만 고친 때를 새로 적는다 · [EDIT_T_AT_INPUT 11-01] 적는 것은 손으로 고친 그때(_snapEditMark) · 이 기기에 쓰기는 때를 바꾸지 않는다 */
  const pt = (src) => { const fn = grabIn(src, '_snapLocalPut') + '\n' + grabIn(src, '_snapEditMark'), so = grabIn(src, '_snapOut'), sf = grabIn(src, '_snapFilledD'), sn = grabIn(src, '_snapNewD'), sz = grabIn(src, '_snapZoneNew');
    const st = lineIn(src, /SNAPFLOW=\{ active:true,[^\n]*/);
    if (!fn || !so || !sf || !sn || !sz || !st) return { err: '원문 조각을 못 떼었다' };
    let now = 1000; const ls = mkStore({}); const sb = { localStorage: ls, JSON, Object, Math, String, Date: { now: () => now }, _snapLocalKey: () => 'me_snapLocal_AB12CD', _snapCollect: () => {}, _snapPickCap: () => 0, opt: {}, p: null, needAgree: true, SNAPFLOW: null, window: {} };
    vm.createContext(sb); vm.runInContext(so + '\n' + sf + '\n' + sn + '\n' + sz + '\n' + fn + '\nfunction _start(loc, sd){ ' + st + '\n}', sb);
    const rd = () => { const v = ls.getItem('me_snapLocal_AB12CD'); return v ? JSON.parse(v).t : null; };
    sb.SNAP_STEPS = [1, 2, 3, 4, 5];
    sb._start(JSON.parse(SN(OLDM, 1500)), {}); sb._snapLocalPut(); const a = rd(); now = 2000; sb._snapLocalPut(); const b = rd();   // 되살린 임시본 · 다시 쓰기만
    sb.SNAPFLOW.d.zones.candle.note = NEWM; now = 3000; if (typeof sb._snapEditMark === 'function') sb._snapEditMark(); now = 3500; sb._snapLocalPut(); const c = rd(); now = 4000; sb._snapLocalPut(); const d = rd();   // 고침(입력 3000) · 쓰기(3500) · 다시 쓰기
    sb._start(null, JSON.parse(SN(OLDM))); now = 5000; sb._snapLocalPut(); const e = ls.getItem('me_snapLocal_AB12CD') && rd();   // 서버 판에서 열고 고치지 않음
    return { a, b, c, d, e }; };
  let r; try { r = pt(MP); } catch (x) { r = { err: String(x && x.stack || x).slice(0, 300) }; }
  ok('⑦ 10-01 [RELOGIN_SNAP_NEWER] 스냅 임시본은 글이 바뀔 때만 고친 때를 적는다 · 되살린 임시본은 그 때 그대로 · 다시 쓰기 · 앱 내림 · 걸음 넘김은 그대로 · 고치지 않은 판엔 없다',
    !r.err && r.a === 1500 && r.b === 1500 && r.c === 3000 && r.d === 3000 && (r.e === undefined || r.e === null), r);
  const bk = brk(MP, [['if(SNAPFLOW._lj==null) SNAPFLOW._lj=JSON.stringify(o);', 'SNAPFLOW.t=Date.now();']]); let rb = null; try { rb = bk ? pt(bk) : null; } catch (x) { rb = { err: String(x).slice(0, 200) }; }
  ok('깨 보기 ⑦ — 쓸 때마다 새 때를 적으면 빨강', !!rb && !rb.err && rb.b === 2000, rb); }

/* 다른 계정 · 7일 지남은 종전대로 지운다 */
{ const A = world(MP, { ls: { me_relogin_keep: KEEP } }); const b1 = A.sb._reloginRestore('ZZ99ZZ'); const k1 = A.ls.getItem('me_relogin_keep'), o1 = A.ls.getItem('me_order');
  const old = JSON.parse(KEEP); old.t -= 8 * 864e5; const B = world(MP, { ls: { me_relogin_keep: JSON.stringify(old) } }); const b2 = B.sb._reloginRestore('AB12CD');
  ok('다른 계정 로그인 · 7일 지남이면 되돌리지 않고 맡김을 지운다', b1 === false && k1 === null && o1 === null && b2 === false && B.ls.getItem('me_relogin_keep') === null && B.ls.getItem('me_order') === null); }
ok('상태 불러오기 · 알림 링크 길도 못 맡기면 S4 한 줄(지우지 않음)', (MP.match(/softLoginNote\(_kp[34]===null\?RELOGIN_FAIL:/g) || []).length === 2);

console.log(fail ? `\n★ 실패 ${fail}건` : '\nRELOGIN KEEP OK'); process.exit(fail ? 1 : 0);
