#!/usr/bin/env node
/* ★★[VC_FIX15_1030 · MIG_COPY_ONCE · PRACTICE_MS · RF_LOOK_ALL · OWN_TXT_SURE 2026-10-30 GPT 15차 점검(고객 15-01 ~ 15-06 · 당일 15-01 · 15-02)]
   원문 조각을 vm 으로 떼어 장면마다 잰다 — 옛 판(V15_MP · V15_OP · V15_CS · V15_GS 로 옛 파일을 주면)에서는 고친 항목마다 빨강이어야 한다.
   ① 고객 15-01 이미 옮겨진 계정 칸(쓴 때 w 없음 · 31일 전 고침)이 새 부팅의 30일 걷기에 지워지지 않는다 · w 를 지금으로
   ② 고객 15-02 계정 칸(저장 안 한 고침 · 시각 없음)이 옛 공용 판(시각 있음)에 덮이지 않는다 · 옛 판은 예비본으로 남는다 · 식순 화면(공개 미리보기)도
   ③ 고객 15-03 계정 맡김의 시각 없는 옛 서약이 합친 꾸러미의 새 때를 빌려 이 기기에서 더 나중에 고친 서약을 덮지 않는다 · 한쪽이라도 시각이 없으면 계정 것
   ④ 고객 15-06 스스로 로그아웃하면 그 계정이 주인인 옛 공용 예비본도 지운다 · 계정마다 한 번만 옮긴다(옮긴 표시가 있으면 다시 들이지 않는다)
   ⑤ [MIG_COPY_ONCE] 옛 예비본 지우기 — 서버 저장 성공(옮긴 표시가 있을 때만) · 30일 걷기(옮긴 표시 + 쓴 때 · 고친 때 · 옮긴 때)
   ⑥ 고객 15-04 [PRACTICE_MS] 정리 30초 뒤 새 연습 읽기 — 91일 뒤 정리에서 새 연습 소리도 지운다
   ⑦ 고객 15-05 · 당일 15-01 [RF_LOOK_ALL] 스튜디오 파일 표를 읽는 동안도 «확인 중» · 최신 확인 답 뒤에도 시작 직전에 다시 검사
   ⑧ 당일 15-02 [OWN_TXT_SURE] 글을 못 받았거나 스튜디오 파일이면 기본 글 대신 «이 소리의 글을 확인하지 못했어요»
   ⑨ 브라우저 — 390 마이페이지에 옛 공용 me_order(t · w 없음)를 심으면 계정 칸으로 베끼고 · 식순 화면에서 열리고 · 다시 열어도 남고 · 옛 칸도 남는다 → 서버 저장 성공 뒤 옛 칸이 걷힌다
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const R = (f, env) => fs.readFileSync(process.env[env] || path.join(ROOT, f), 'utf8');
const MP = R('mypage.html', 'V15_MP'), OP = R('order-preview.html', 'V15_OP'), CS = R('console.html', 'V15_CS'), GS = R('automation/platform/80_production.gs', 'V15_GS');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 600)}`); if (!c) fail++; };
const grabIn = (src, name) => { const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0; for (let k = src.indexOf('{', i); k < src.length; k++) { if (src[k] === '{') d++; else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); } } return ''; };
const lineIn = (src, re) => (src.match(re) || [''])[0];
const flush = async (n) => { for (let i = 0; i < (n || 8); i++) await new Promise((r) => setTimeout(r, 0)); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const NOW = Date.parse('2026-10-30T03:00:00Z'), DAY = 864e5;
const kst = (ms) => new Date(ms + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16);
const ymd = (ms) => kst(ms).slice(0, 10);
const FakeDate = class extends Date { constructor(...a) { if (a.length) super(...a); else super(NOW); } static now() { return NOW; } };
async function sec(name, fn) { try { await fn(); } catch (e) { ok(name + ' — 재다가 멈췄다', false, String(e && e.stack || e).split('\n').slice(0, 2).join(' ')); } }

/* ───────── 이 기기 저장소(마이페이지 조각) ───────── */
const A = 'AAAAAA', OK_A = 'me_order_' + A, KK_A = 'me_relogin_keep_' + A, FLAG_A = 'me_mig_done_' + A;
const DR = (tx, who, t, dirty, extra) => JSON.stringify(Object.assign({ v: 2, S: { tx: { 'vow.g': tx } }, who, dirty: dirty !== false, base: 'k0' }, t ? { t } : {}, extra || {}));
const SN = (memo, t) => JSON.stringify(Object.assign({ v: 2, zones: { candle: { picks: [], ups: [], links: [], note: memo } }, note: '' }, t ? { t } : {}));
const txOf = (v) => { try { return JSON.parse(v).S.tx['vow.g']; } catch (e) { return null; } };
function store(init, quota) { const m = new Map(Object.entries(init || {}));
  return { m, ls: { getItem: (k) => (m.has(k) ? m.get(k) : null), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; },
    setItem: (k, v) => { if (quota && quota(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } } }; }
const MPF = ['_acctOk', '_ordK', '_keepK', '_recE', '_migPick', '_migStampW', '_migOwner', '_migDone', '_migOwnT', '_migOrd', '_migKeep', '_migOldDrop', '_migOldSweep', '_acctKeysMigrate', '_acctOldSweep',
  '_reloginStampT', '_reloginKeyNewer', '_reloginRestore', '_reloginCurNewer', '_reloginSnapNewer'];
const MPV = [/var RELOGIN_KEY=[^\n]*/, /var ACCT_OLD_MS=[^\n]*/, /var _MIG_DONE=[^\n]*/, /var MIG_DONE_K=[^\n]*/];
function mpWin(st) { const sb = { localStorage: st.ls, JSON, Object, String, Math, Date: FakeDate, ERR_W: {}, ERR_DO: {} }; vm.createContext(sb);
  vm.runInContext(MPF.map((f) => grabIn(MP, f)).join('\n') + '\n' + MPV.map((re) => lineIn(MP, re)).join('\n'), sb); return sb; }
function mpBoot(init, quota) { const st = store(init, quota); const sb = mpWin(st); vm.runInContext('_acctKeysMigrate(); _acctOldSweep();', sb); return { r: Object.fromEntries(st.m), st, sb }; }
function opMig(init) { const st = store(init); const sb = { localStorage: st.ls, JSON, Object, String, Math, Date: FakeDate }; vm.createContext(sb);
  vm.runInContext(['_recE', '_ordMigPick', '_ordMigrate'].map((f) => grabIn(OP, f)).join('\n') + '\n_ordMigrate();', sb); return Object.fromEntries(st.m); }

await sec('①', async () => {
  /* 이전 판의 미리보기 · 마이페이지가 옮긴 계정 칸 — 쓴 때(w)가 없다 · 옛 공용 칸은 이미 없다 */
  const { r } = mpBoot({ [OK_A]: DR('31일 전 서약', A, NOW - 31 * DAY) });
  const v = r[OK_A], w = v ? +JSON.parse(v).w : 0;
  ok('① 15-01 [MIG_COPY_ONCE] 이미 옮겨진 계정 칸(w 없음 · 31일 전 고침)이 부팅의 30일 걷기에 지워지지 않는다 · 처음 본 지금을 w 로', txOf(v) === '31일 전 서약' && w === NOW, r);
  const { r: r2 } = mpBoot({ [OK_A]: DR('정말 오래된 칸', A, NOW - 40 * DAY, true, { w: NOW - 40 * DAY }) });
  ok('① 걷기는 그대로 — 마지막 사용(w)이 30일 넘은 계정 칸은 걷는다', !(OK_A in r2), r2); });

await sec('②', async () => {
  const { r } = mpBoot({ me_order: DR('옛 공용 판(시각 있음)', A, NOW - 60000), [OK_A]: DR('계정 칸 다른 서약', A, 0, true, { w: NOW - 1000 }) });
  ok('② 15-02 [MIG_COPY_ONCE] 계정 칸(저장 안 한 고침 · 시각 없음)을 옛 공용 판이 덮지 않는다 · 옛 판은 예비본으로 남는다 · 옮긴 표시', txOf(r[OK_A]) === '계정 칸 다른 서약' && txOf(r.me_order) === '옛 공용 판(시각 있음)' && !!r[FLAG_A], r);
  const o = opMig({ me_order: DR('옛 미리보기 판', '', NOW - 60000), me_order_pub: DR('공개 칸 다른 판', '', 0) });
  ok('② 15-02 식순 화면(공개 미리보기)도 공개 칸을 덮지 않는다 · 옛 칸 그대로', txOf(o.me_order_pub) === '공개 칸 다른 판' && txOf(o.me_order) === '옛 미리보기 판', o);
  const e = mpBoot({ me_order: DR('빈 계정 칸으로', A, 0) }).r;
  ok('② 계정 칸이 비었으면 베낀다(w = 지금) · 옛 칸 그대로', txOf(e[OK_A]) === '빈 계정 칸으로' && +JSON.parse(e[OK_A]).w === NOW && txOf(e.me_order) === '빈 계정 칸으로', e); });

await sec('③', async () => {
  /* 계정 맡김 = 옛 서약(시각 없음 · 꾸러미 1000 전) · 옛 공용 맡김 = 새 스냅(10 전) · 이 기기 서약 = 500 전에 고친 저장 안 한 고침 */
  const init = { [KK_A]: JSON.stringify({ code: A, t: NOW - 1000, keys: { [OK_A]: DR('계정 맡김 옛 서약', A, 0) } }),
    me_relogin_keep: JSON.stringify({ code: A, t: NOW - 10, keys: { ['me_snapLocal_' + A]: SN('새 메모', NOW - 10) } }), [OK_A]: DR('기기에서 나중에 고친 서약', A, NOW - 500, true, { w: NOW }) };
  const B = mpBoot(init); const back = B.sb._reloginRestore(A); const after = B.st.ls.getItem(OK_A);
  ok('③ 15-03 [MIG_COPY_ONCE] 계정 맡김의 시각 없는 옛 서약이 합친 꾸러미의 새 때를 빌리지 않는다 — 이 기기에서 나중에 고친 서약이 남는다', txOf(after) === '기기에서 나중에 고친 서약', { back, after, keep: B.r[KK_A] });
  const k2 = mpBoot({ [KK_A]: JSON.stringify({ code: A, t: NOW - 1000, keys: { [OK_A]: DR('계정 맡김(시각 없음)', A, 0) } }), me_relogin_keep: JSON.stringify({ code: A, t: NOW - 10, keys: { me_order: DR('옛 맡김(시각 있음)', A, NOW - 20) } }) }).r;
  const kk = JSON.parse(k2[KK_A] || '{"keys":{}}');
  ok('③ 같은 종류 · 한쪽이라도 제 고친 때가 없으면 계정 것 · 옛 것은 옛 맡김(예비본)에 남는다', txOf(kk.keys[OK_A]) === '계정 맡김(시각 없음)' && !!k2.me_relogin_keep, [kk, k2.me_relogin_keep]);
  const k3 = mpBoot({ [KK_A]: JSON.stringify({ code: A, t: NOW - 1000, keys: { [OK_A]: DR('계정 맡김 옛 고침', A, NOW - 900) } }), me_relogin_keep: JSON.stringify({ code: A, t: NOW - 10, keys: { me_order: DR('옛 맡김 새 고침', A, NOW - 20) } }) }).r;
  ok('③ 둘 다 제 고친 때가 있으면 더 나중에 고친 쪽', txOf(JSON.parse(k3[KK_A] || '{"keys":{}}').keys[OK_A]) === '옛 맡김 새 고침', k3); });

await sec('④', async () => {
  const B = mpBoot({ me_order: DR('옛 공용 서약', A, 0), [OK_A]: DR('계정 칸 서약', A, 0, true, { w: NOW }), me_relogin_keep: JSON.stringify({ code: A, t: NOW - 10, keys: { me_order: DR('맡긴 서약', A, NOW - 10) } }) });
  const hasDrop = typeof B.sb._migOldDrop === 'function'; if (hasDrop) B.sb._migOldDrop(A, 'out'); B.st.ls.removeItem(OK_A);   // 스스로 로그아웃(clearToken 이 계정 칸 · 옛 예비본을 지운다)
  const out = Object.fromEntries(B.st.m);
  ok('④ 15-06 [MIG_COPY_ONCE] 스스로 로그아웃 — 그 계정이 주인인 옛 공용 예비본(me_order · me_relogin_keep)도 지운다 · clearToken 이 부른다',
    hasDrop && !('me_order' in out) && !('me_relogin_keep' in out) && /if\(_c && !keep\) _migOldDrop\(_c, 'out'\);/.test(grabIn(MP, 'clearToken')), out);
  const re = mpBoot({ me_order: DR('옛 공용 서약', A, 0), [FLAG_A]: String(NOW - DAY) }).r;
  ok('④ 15-06 계정마다 한 번 — 옮긴 표시가 있으면 계정 칸이 비어 있어도 다시 들이지 않는다', !(OK_A in re) && txOf(re.me_order) === '옛 공용 서약', re);
  const other = mpBoot({ me_order: DR('나의 옛 서약', 'BBBBBB', 0) }); if (typeof other.sb._migOldDrop === 'function') other.sb._migOldDrop(A, 'out');
  ok('④ 다른 계정이 로그아웃해도 남의 옛 예비본은 그대로', txOf(other.st.ls.getItem('me_order')) === '나의 옛 서약'); });

await sec('⑤', async () => {
  const s1 = mpBoot({ me_order: DR('옛 공용 서약', A, 0), [OK_A]: DR('계정 칸', A, 0, false, { w: NOW }) }); if (typeof s1.sb._migOldDrop === 'function') s1.sb._migOldDrop(A, 'save');
  const s2 = store({ me_order: DR('옮기기 전 옛 서약', A, 0) }); const w2 = mpWin(s2); if (typeof w2._migOldDrop === 'function') w2._migOldDrop(A, 'save');
  ok('⑤ [MIG_COPY_ONCE] 서버 저장 성공 — 옮긴 표시가 있으면 이 계정의 옛 예비본을 지운다 · 아직 옮기지 않았으면 두다 · 저장 성공 길(apiTrackSave 식순)이 부른다',
    s1.st.ls.getItem('me_order') === null && txOf(s2.ls.getItem('me_order')) === '옮기기 전 옛 서약' && /_migOldDrop\(_reloginCode\(\), 'save'\)/.test(grabIn(MP, 'apiTrackSave')), [s1.st.ls.getItem('me_order'), s2.ls.getItem('me_order')]);
  const old = mpBoot({ me_order: DR('옛 공용 서약', A, 0), [FLAG_A]: String(NOW - 31 * DAY), [OK_A]: DR('계정 칸', A, 0, true, { w: NOW }) }).r;
  const fresh = mpBoot({ me_order: DR('옛 공용 서약', A, 0), [FLAG_A]: String(NOW - 2 * DAY), [OK_A]: DR('계정 칸', A, 0, true, { w: NOW }) }).r;
  const noFlag = store({ me_order: DR('옛 공용 서약', A, NOW - 60 * DAY) }); const wn = mpWin(noFlag); if (typeof wn._migOldSweep === 'function') wn._migOldSweep(NOW);
  ok('⑤ 30일 걷기 — 옮긴 표시가 있고 30일 넘게 손대지 않은 옛 예비본만(쓴 때 · 고친 때가 없으면 옮긴 때) · 표시가 없으면 고친 때가 오래돼도 둔다',
    !('me_order' in old) && txOf(fresh.me_order) === '옛 공용 서약' && txOf(noFlag.ls.getItem('me_order')) === '옛 공용 서약', [old, fresh]); });

/* ───────── ⑥ 서버(80_production 조각) — vc-decisions-1030 의 세계를 그대로 빌린다 ───────── */
const VD = fs.readFileSync(path.join(ROOT, 'scripts/audit/vc-decisions-1030.mjs'), 'utf8');
const FN = eval(lineIn(VD, /const FN = \[[^\n]*\];/).replace(/^const FN = /, '').replace(/;$/, '')).concat(['_vcPracticeLeft_', '_vcPracticeMs_']).filter((v, i, a) => a.indexOf(v) === i);
const srvCode = (src) => [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/), lineIn(src, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n') + '\nvar _CURRENT_ADMIN = "";';
const world = eval('(' + grabIn(VD, 'world') + ')');

await sec('⑥', async () => {
  const o = { cust: { ND1: { wed: '' } }, codes: ['ND1'], props: { VC_ND1: JSON.stringify({ practice: 300, practiceAt: kst(NOW - 100 * DAY), groom: { consent: { at: kst(NOW - 100 * DAY) } } }) } };
  const W = world(o, GS); const f1 = W.addFile('연습 소리 · 신랑 · 1');
  vm.runInContext('purgeVoiceClones()', W.sb); const p1 = W.st('ND1').purged || '';
  o.shift = 30000;   // 30초 뒤(같은 분) 새 개인 서약 연습 읽기
  vm.runInContext('_vcHold("ND1", 12, "practice")', W.sb); const f2 = W.addFile('연습 소리 · 신랑 · 2'); if (typeof W.sb._vcPracticeMs_ === 'function') vm.runInContext('_vcPracticeMs_("ND1")', W.sb);
  const mid = W.st('ND1');
  o.shift = 91 * DAY + 30000; vm.runInContext('purgeVoiceClones()', W.sb);
  ok('⑥ 15-04 [PRACTICE_MS] 정리 30초 뒤(같은 분) 새 연습 읽기 — 91일 뒤 정리에서 새 연습 소리도 지운다(천분의 1초로 견준다)', W.files[f1].trash === true && !!p1 && W.files[f2].trash === true, { p1, practiceAt: mid.practiceAt, practiceMs: mid.practiceMs, purgedMs: mid.purgedMs, f2: W.files[f2].trash });
  const L = (st) => vm.runInContext('_vcPracticeLeft_(' + JSON.stringify(st) + ')', W.sb);
  ok('⑥ 남았나 판정 — 둘 다 천분의 1초면 그대로 · 한쪽이 분 단위면 같은 분은 «남았다» · 정리 뒤 연습이 없으면 «없다»',
    L({ practiceMs: NOW + 30000, purgedMs: NOW }) === true && L({ practiceMs: NOW, purgedMs: NOW + 30000 }) === false && L({ practiceAt: kst(NOW), purged: kst(NOW) }) === true && L({ practiceAt: kst(NOW - DAY), purged: kst(NOW) }) === false && L({ practice: 5 }) === true); });

/* ───────── ⑦ ⑧ 콘솔(가짜 IndexedDB) ───────── */
function fakeIDB() { const dbs = {}, ctl = { putFail: false, getDelay: 0 };
  const later = (f, ms) => setTimeout(f, ms || 0);
  return { dbs, ctl, open(name) { const req = {}; later(() => { const fresh = !dbs[name]; if (fresh) dbs[name] = {}; const S0 = dbs[name];
    const db = { createObjectStore(n) { S0[n] = new Map(); }, transaction(n) { const st = S0[n]; if (!st) throw new Error('no store'); const tx = {}; let ops = 0, fin = false; const end = () => { if (--ops === 0 && !fin) { fin = true; later(() => tx.oncomplete && tx.oncomplete()); } };
      tx.objectStore = () => ({ put(v, k) { ops++; if (ctl.putFail) { later(() => { fin = true; if (tx.onerror) tx.onerror(); else if (tx.onabort) tx.onabort(); }); return; } st.set(k, v); later(end); },
        get(k) { ops++; const r = {}; later(() => { r.result = st.has(k) ? st.get(k) : undefined; r.onsuccess && r.onsuccess(); end(); }, ctl.getDelay); return r; },
        openCursor() { ops++; const r = {}; later(() => { r.result = null; r.onsuccess && r.onsuccess(); end(); }); return r; } });
      return tx; } };
    req.result = db; if (fresh && req.onupgradeneeded) req.onupgradeneeded(); req.onsuccess && req.onsuccess(); }); return req; } }; }
const CFN = ['rfWhy', 'rfPrefetch', 'rfFreshApply', 'rfBusyNow', 'rfLookNow', 'rfLookBegin', 'rfLookWait', 'rfOkSet', 'rfUnchecked', 'rfKindLab', 'rfPaint', 'ownDb', 'ownKey', 'ownToday', 'ownDead', 'rfOwnPut', 'rfOwnGet', 'rfOwnGet0', 'rfOwnFall', 'rfOwnSupPut', 'rfOwnSupGet', 'rfOwnSweep',
  'rfCachedNow', 'rfCurSet', 'rfOwnPutAgain', 'rfUpId', 'ownTxtOf', 'ownTxtSet', 'rfOwnTxtLoad', 'rfKeyOfSlug', 'ownTxtFor'];
const CVARS = [/var RF_WHY = \{\}, RF_SKIP[^\n]*/, /var RF_OKMAP = [^\n]*/, /var RF_CACHED = \{\}, RF_FROM = \{\};/, /var RF_CUR = [^\n]*/, /var OWN_TXT = \{\};/, /var OWN_TXT_GEN[^\n]*/, /var RF_ORIG = \{\}, RF_FRESH[^\n]*/, /var RF_SLUG = [^\n]*/, /var RF_LOOK = [^\n]*/];
function con(o) { o = o || {}; const box = { innerHTML: '' }, sec0 = { hidden: false }; class B { constructor(a, t) { this.a = a; this.type = (t || {}).type; } }
  const sb = { indexedDB: o.idb, Blob: B, URL: { createObjectURL: (b) => 'blob:' + (b.a && b.a[0] ? String.fromCharCode.apply(null, Array.from(b.a[0])) : '?') }, QS: { get: () => 'AB12CD' }, localStorage: { getItem: () => 'tok' }, GUEST: false, S: o.S || { up: {} },
    CLIPS: {}, rfKeys: () => ['g0'], rfSlugOf: () => 'guest-1-arrival', esdWant: () => false, esdPrepVoice: () => {}, render: () => {}, esc: (s) => String(s), ecWrap: (s) => s, $: (q) => (q === '#rfSec' ? sec0 : box), document: { getElementById: () => null },
    toast: () => {}, RF_EXEC: 'x', atob: (s) => Buffer.from(s, 'base64').toString('binary'), Uint8Array, setTimeout, clearTimeout, AbortController, Date: FakeDate, Promise, JSON, Object, String, Array, Math, navigator: { onLine: true }, window: {},
    fetch: (u, q) => { const b = JSON.parse(q.body); return o.fetch(b); } };
  vm.createContext(sb); vm.runInContext(CFN.map((f) => grabIn(CS, f)).join('\n') + '\n' + CVARS.map((re) => lineIn(CS, re)).join('\n'), sb); sb.RF_FRESH.done = true; return { sb, box }; }
const J = (d) => Promise.resolve({ json: () => d });
const NET = () => Promise.reject(Object.assign(new TypeError('Failed to fetch'), {}));
const fileRes = (id) => ({ ok: true, data: Buffer.from(id).toString('base64'), mime: 'audio/wav' });

await sec('⑦', async () => {
  /* 스튜디오 파일을 받아 두고(표 · 소리) 끊긴 채 다시 연다 — 기기 저장소가 느리다(표 읽기 40ms) */
  const idb = fakeIDB(); const S = { up: {} };
  const W0 = con({ idb, S, fetch: (b) => (b.fn === 'adminRitualFiles' ? J({ ok: true, files: [{ id: 'S1', key: 'g0', name: '하객 입장 때 · 스튜디오 · a' }], okMap: {}, wedding: ymd(NOW + DAY), sup: { g0: { id: 'S1' } } }) : J(fileRes(b.args[1]))) });
  W0.sb.rfPrefetch(); await flush(40);
  idb.ctl.getDelay = 40; const W = con({ idb, S, fetch: () => NET() }); W.sb.rfPrefetch(); await flush(12);
  const mid = { st: W.sb.RF_ST.g0 || 'none', look: W.sb.rfLookNow() };
  await wait(150); await flush(30); const end = { st: W.sb.RF_ST.g0, look: W.sb.rfLookNow() };
  ok('⑦ 15-05 · 당일 15-01 [RF_LOOK_ALL] 목록을 못 받아 스튜디오 파일 표(기기)를 읽는 동안도 «확인 중»(줄이 아직 look 이 아니어도) · 다 찾으면 풀린다',
    mid.st !== 'look' && mid.look === true && end.st === 'ok' && end.look === false, [mid, end]);
  /* «시작» — 최신 확인을 기다리는 사이 찾기가 시작되면 답 뒤에도 바로 시작하지 않는다 */
  const i = CS.indexOf("(function(){ var go = $('#go'), run = go.onclick;"), iife = i < 0 ? '' : CS.slice(i, CS.indexOf('})();', i) + 5);
  let ran = 0; const tsts = []; let freshOk = null; const go = { onclick: () => { ran++; }, dataset: {}, textContent: '시작' };
  const sb = { $: () => go, RF_FRESH: { done: false, wait: false }, RF_ST: {}, rfKeys: () => ['g0'], GUEST: false, QS: { get: () => 'AB12CD' }, toast: (t) => { tsts.push(t); }, rfPaint: () => {}, setTimeout, Promise,
    rfFresh: () => new Promise((r) => { freshOk = r; }) };
  vm.createContext(sb); vm.runInContext(['rfBusyNow', 'rfLookNow', 'rfLookBegin', 'rfLookWait'].map((f) => grabIn(CS, f)).join('\n') + '\n' + lineIn(CS, /var RF_LOOK = [^\n]*/) + '\n' + iife, sb);
  go.onclick(); await flush(); const rel = typeof sb.rfLookBegin === 'function' ? sb.rfLookBegin() : null; sb.RF_ST.g0 = 'look';   // 최신 확인을 기다리는 사이 찾기가 시작됐다
  freshOk(null); await flush(); const r1 = ran;
  sb.RF_ST.g0 = 'ok'; if (rel) rel(); await flush(); await wait(20); await flush();
  ok('⑦ 당일 15-01 «시작» — 최신 확인 답 뒤에도 시작 직전에 다시 검사(찾는 중이면 «기기에 받아 둔 소리 확인 중…») · 찾기가 끝나면 그때 한 번 시작',
    r1 === 0 && ran === 1 && tsts.some((t) => /기기에 받아 둔 소리 확인 중/.test(t)), [r1, ran, tsts]); });

await sec('⑧', async () => {
  const W = con({ idb: fakeIDB(), S: { entry: 'A', up: { g0: { id: 'A1', src: 'ai' } } }, fetch: () => NET() });
  W.sb.RF_OWN['guest-1-arrival'] = 1; W.sb.RF_CUR.g0 = { id: 'A1', up: true };
  await W.sb.rfOwnTxtLoad(); const t1 = W.sb.ownTxtFor({ slug: 'guest-1-arrival' });
  ok('⑧ 당일 15-02 [OWN_TXT_SURE] 기기 보관본으로 두 분 소리는 되살렸는데 글 요청이 실패 — 기본 글 대신 «이 소리의 글을 확인하지 못했어요»', t1 === '이 소리의 글을 확인하지 못했어요', t1);
  const pend = []; const W2 = con({ idb: fakeIDB(), S: { entry: 'A', up: {} }, fetch: () => new Promise((res) => pend.push(res)) });
  W2.sb.RF_OWN['guest-1-arrival'] = 1; W2.sb.RF_CUR.g0 = { id: 'S1', up: false };
  const p = W2.sb.rfOwnTxtLoad(); await flush(); pend[0]({ json: () => ({ result: { ok: true, mirror: { production: { ritualDraft: { S: { vtext: { g0: '최신 초안 B 글' }, up: {} } } } } } }) }); await p;
  const t2 = W2.sb.ownTxtFor({ slug: 'guest-1-arrival' }); W2.sb.RF_CUR.g0 = { id: 'B1', up: true }; const t3 = W2.sb.ownTxtFor({ slug: 'guest-1-arrival' });
  ok('⑧ 당일 15-02 스튜디오 대체 파일(빈 id)이면 최신 초안 글을 보이지 않는다 — «이 소리의 글을 확인하지 못했어요»', t2 === '이 소리의 글을 확인하지 못했어요', t2);
  ok('⑧ 초안에 없는 두 분 파일이어도 «확인하지 못했어요»', t3 === '이 소리의 글을 확인하지 못했어요', t3);
  const pend3 = []; const W3 = con({ idb: fakeIDB(), S: { entry: 'A', up: {} }, fetch: () => new Promise((res) => pend3.push(res)) });
  W3.sb.RF_OWN['guest-1-arrival'] = 1; W3.sb.RF_CUR.g0 = { id: 'C1', up: true };
  const p3 = W3.sb.rfOwnTxtLoad(); await flush(); pend3[0]({ json: () => ({ result: { ok: true, mirror: { production: { ritualDraft: { S: { vtext: { g0: 'C1 의 글' }, up: { g0: { id: 'C1', src: 'ai' } } } } } } } }) }); await p3;
  ok('⑧ 같은 파일의 글을 받았으면 그 글', W3.sb.ownTxtFor({ slug: 'guest-1-arrival' }) === 'C1 의 글' && W3.sb.ownTxtFor({ slug: 'guest-2-10min' }) === ''); });

/* ───────── ⑨ 브라우저 — 390 마이페이지 · 옛 공용 me_order(t · w 없음) ───────── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) console.log('건너뜀 ⑨ — 브라우저(playwright)가 없다(CI guard) · 로컬에서 잰다');
else await sec('⑨', async () => {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
  const OVR = { '/mypage.html': process.env.V15_MP, '/order-preview.html': process.env.V15_OP };   // 옛 판으로 깨 보기
  const srv = http.createServer((q, r) => { const u0 = decodeURIComponent(q.url.split('?')[0]), p = OVR[u0] || path.join(ROOT, u0); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
  let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('건너뜀 ⑨ — 브라우저를 못 띄움 ' + String(e && e.message || e).split('\n')[0]); srv.close(); return; }
  try {
    const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
    const STATE = { ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SHOT', stage: '제작중', stageIndex: 6, stageList: SIG, nextAction: '다음 할 일을 안내해 드릴게요.', contract: { signed: true }, payment: {}, production: {} };
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
    await ctx.addInitScript(`try{ if(!localStorage.getItem('__seed15')){ localStorage.setItem('__seed15','1'); localStorage.setItem('me_token','TOK'); localStorage.setItem('me_order', JSON.stringify({ v: 2, S: { course: 'open', tx: { 'vow.g': '사십일 전 옛 서약' } }, who: 'ME-SHOT', idx: 2, cs: true, sv: false, dirty: true, base: 'k0' })); } }catch(e){}`);
    const posts = [];
    await ctx.route('**/*', async (rt) => { const u = rt.request().url();
      if (u.includes('script.google.com')) { let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {} posts.push(p.action || '');
        const body = p.action === 'getMyState' ? STATE : { ok: true }; return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) }); }
      if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(BASE + '/mypage.html', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const LS = () => pg.evaluate(() => ({ old: localStorage.getItem('me_order'), acct: localStorage.getItem('me_order_ME-SHOT'), flag: localStorage.getItem('me_mig_done_ME-SHOT') }));
    const ls1 = await LS(); const w1 = ls1.acct ? +JSON.parse(ls1.acct).w : 0;
    ok('⑨ 390 · 옛 공용 me_order(t · w 없음) — 계정 칸으로 베끼고(w 가 찍힘) · 옮긴 표시 · 옛 칸도 그대로', txOf(ls1.acct) === '사십일 전 옛 서약' && w1 > Date.now() - 600000 && !!ls1.flag && txOf(ls1.old) === '사십일 전 옛 서약', ls1);
    await pg.evaluate(() => openRitualBuilder({}, null)); let got = null;
    for (let i = 0; i < 40 && !got; i++) { await pg.waitForTimeout(250); const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) { try { got = await f.evaluate(() => (typeof S !== 'undefined' && S.tx && S.tx['vow.g']) || null); } catch (e) {} } }
    ok('⑨ 식순 화면을 열면 옮긴 초안(옛 서약)으로 열린다', got === '사십일 전 옛 서약', got);
    await pg.screenshot({ path: path.join(process.env.V15_SHOT_DIR || '/tmp', 'vc-fix15-390.png') });
    await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1500);
    const ls2 = await LS();
    ok('⑨ 다시 열어도 계정 칸이 남고 · 옛 칸도 그대로(다시 들이지 않는다 · 표시 그대로)', txOf(ls2.acct) === '사십일 전 옛 서약' && txOf(ls2.old) === '사십일 전 옛 서약' && ls2.flag === ls1.flag, ls2);
    const sv = await pg.evaluate(() => apiTrackSave({ action: 'saveProductionTrack', token: getToken(), track: 'ritual', draft: { _v: 3, S: { course: 'open', tx: { 'vow.g': '사십일 전 옛 서약' } }, summary: {} }, done: false }).then((r) => !!(r && r.ok)));
    await pg.waitForTimeout(300); const ls3 = await LS();
    ok('⑨ 서버 저장이 성공하면 옛 공용 칸을 걷는다 · 계정 칸은 그대로', sv === true && ls3.old === null && txOf(ls3.acct) === '사십일 전 옛 서약', [sv, ls3]);
    ok('⑨ 페이지 오류 없음', !errs.length, errs.slice(0, 3));
    await ctx.close();
  } finally { await br.close(); srv.close(); } });

console.log(fail ? `\n✗ VC_FIX15_1030 실패 ${fail}건` : '\n✓ VC_FIX15_1030 — 15차 점검 통과');
process.exit(fail ? 1 : 0);
