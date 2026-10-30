#!/usr/bin/env node
/* ★[RELOGIN_KEEP_1030 · RELOGIN_STASH_FIRST · RELOGIN_ACCT_CACHE · RELOGIN_OWNER 2026-10-30 GPT 7차 점검(고객) 7-01 · 7-02 · 7-03]
   로그인이 풀려 로그인 화면으로 갈 때 맡기는 초안([RELOGIN_KEEP] · mypage.html)이 사라지지 않는지 잰다(함수 원문을 떼어 vm 으로).
   ① 7-01 맡김 쓰기가 실패하면(QuotaExceededError) 원본(식순 초안 · 스냅 임시본 · 로그인 표시)을 그대로 두고 «초안을 보관하지 못했어요 (코드 S4)»
         · «이어서 저장해 주세요»를 말하지 않는다 · 알림 링크 · 상태 불러오기 길도 같다
   ② 7-02 알림 링크 길(마이페이지를 그리기 전 · 지금 계정이 빔) · 스냅 임시본만 있어도 이 토큰의 상태 캐시 코드로 맡기고 같은 코드로 되돌린다
         · 맡긴 것이 없으면 «이어서 저장해 주세요»를 말하지 않는다
   ③ 7-03 되돌릴 때 이 기기 식순 초안이 다른 주인(공개 미리보기 who '' · 다른 계정)이면 막지 않고 이 계정 것으로 · 같은 계정 초안이 있으면 그것
         · 되돌리기 쓰기가 실패하면 맡김을 남긴다(다 되돌린 뒤에야 지운다)
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
const FNS = ['clearToken', '_reloginStash', '_reloginAcct', '_reloginPack', '_reloginLine', '_reloginRestore', '_reloginFailShow', '_errGoLogin', '_autoLogin', 'readCachedState'];
const FAIL_LINE = '초안을 보관하지 못했어요 (코드 S4)';
/* quota = 이 이름에 쓰면 QuotaExceededError */
const mkStore = (init, quota) => { const m = new Map(Object.entries(init || {}));
  return { m, getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => { if (quota && quota(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); },
    removeItem: (k) => m.delete(k), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; } }; };
function world(src, o) {
  const code = FNS.map((f) => grabIn(src, f)).join('\n') + '\n' + lineIn(src, /var RELOGIN_KEY=[^\n]*/) + '\n' + lineIn(src, /var ERR_W=[^\n]*/) + '\n' + lineIn(src, /var ERR_DO=[^\n]*/);
  const ls = mkStore(o.ls, o.quota), ss = mkStore(); const W = { alerts: [], notes: [], shows: [], reloaded: 0 };
  const sb = { localStorage: ls, sessionStorage: ss, TOKEN_KEY: 'me_token', STATE_CACHE_KEY: 'me_state_v1', _mpAcctSweep: () => {}, _mpAcct: () => o.acct || '',
    getToken: () => ls.getItem('me_token') || '', _errLine: (x, L) => '로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 ' + L + '8)', _errSess: () => true, _errHtml: (s) => String(s),
    _wizCurId: () => (o.wiz ? 'order' : ''), _mpFsOpen: () => false, location: { reload: () => { W.reloaded++; } }, mpAlert: (m) => { W.alerts.push(m && (m.bodyHtml || m.body)); },
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
  const b = brk(MP, [['if(_kp<0) return null; }', 'if(_kp<0) _kp=0; }']]); let rb = null; try { rb = b ? await t1(b) : null; } catch (e) { rb = { err: String(e).slice(0, 200) }; }
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
  const b = brk(MP, [['var code=_reloginAcct()||String(', 'var code=_mpAcct()||String(']]); let rb = null; try { rb = b ? await t2(b, L()) : null; } catch (e) { rb = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ② — 옛 꼴(지금 계정만 봄)이면 빨강', !!rb && !rb.err && rb.back === false && rb.snap === null, rb); }

/* ③ 7-03 — 되돌릴 때 다른 주인의 me_order */
const KEEP = JSON.stringify({ code: 'AB12CD', t: Date.now(), keys: { me_order: DRAFT, me_snapLocal_AB12CD: SNAP } });
const t3 = (src, cur, quota) => { const ls = { me_relogin_keep: KEEP }; if (cur != null) ls.me_order = cur;
  const A = world(src, { ls, quota }); const back = A.sb._reloginRestore('AB12CD'); return { back, order: A.ls.getItem('me_order'), snap: A.ls.getItem('me_snapLocal_AB12CD'), keep: A.ls.getItem('me_relogin_keep') }; };
{ const pub = JSON.stringify({ v: 2, S: { tx: {} }, who: '', dirty: true }), oth = JSON.stringify({ v: 2, S: {}, who: 'ZZ99ZZ', dirty: true }), mine = JSON.stringify({ v: 2, S: { tx: { 'vow.g': '다른 탭에서 더 쓴 글' } }, who: 'AB12CD', dirty: true });
  let p, o2, m, q, no; try { p = t3(MP, pub); o2 = t3(MP, oth); m = t3(MP, mine); q = t3(MP, null, (k) => k === 'me_order'); no = t3(MP, null); } catch (e) { p = { err: String(e && e.stack || e).slice(0, 300) }; }
  ok('③ 7-03 [RELOGIN_OWNER] 이 기기 식순 초안이 공개 미리보기(who \'\') · 다른 계정 것이면 막지 않고 이 계정 초안으로 되돌린다 · 맡김은 그 뒤에 지운다', !p.err && p.back === true && p.order === DRAFT && p.snap === SNAP && p.keep === null && o2.back === true && o2.order === DRAFT && o2.keep === null, { p, o2 });
  ok('③ 7-03 같은 계정 초안이 이미 있으면 그것(더 새것)을 둔다 · 스냅 임시본은 되돌린다', !!m && m.order === mine && m.snap === SNAP && m.keep === null, m);
  ok('③ 7-03 되돌리기 쓰기가 실패하면 맡김을 남긴다(다음 로그인에 다시) · 초안이 없던 기기는 종전대로 되돌린다', !!q && q.order === null && q.keep === KEEP && !!no && no.back === true && no.order === DRAFT && no.keep === null, { q, no });
  const b = brk(MP, [['      if(cw===c) return; }', '      return; }']]); let rb = null; try { rb = b ? t3(b, pub) : null; } catch (e) { rb = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ③ — 옛 꼴(주인을 안 보고 건너뜀)이면 빨강', !!rb && !rb.err && rb.order === pub, rb);
  const b2 = brk(MP, [['  var c=String(code), n=0, all=true;', '  var c=String(code), n=0, all=true; localStorage.removeItem(RELOGIN_KEY);']]); let rc = null; try { rc = b2 ? t3(b2, null, (k) => k === 'me_order') : null; } catch (e) { rc = { err: String(e).slice(0, 200) }; }
  ok('깨 보기 ③ — 옛 꼴(맡김부터 지움)이면 빨강', !!rc && !rc.err && rc.keep === null, rc); }

/* 다른 계정 · 7일 지남은 종전대로 지운다 */
{ const A = world(MP, { ls: { me_relogin_keep: KEEP } }); const b1 = A.sb._reloginRestore('ZZ99ZZ'); const k1 = A.ls.getItem('me_relogin_keep'), o1 = A.ls.getItem('me_order');
  const old = JSON.parse(KEEP); old.t -= 8 * 864e5; const B = world(MP, { ls: { me_relogin_keep: JSON.stringify(old) } }); const b2 = B.sb._reloginRestore('AB12CD');
  ok('다른 계정 로그인 · 7일 지남이면 되돌리지 않고 맡김을 지운다', b1 === false && k1 === null && o1 === null && b2 === false && B.ls.getItem('me_relogin_keep') === null && B.ls.getItem('me_order') === null); }
ok('상태 불러오기 · 알림 링크 길도 못 맡기면 S4 한 줄(지우지 않음)', (MP.match(/softLoginNote\(_kp[34]===null\?RELOGIN_FAIL:/g) || []).length === 2);

console.log(fail ? `\n★ 실패 ${fail}건` : '\nRELOGIN KEEP OK'); process.exit(fail ? 1 : 0);
