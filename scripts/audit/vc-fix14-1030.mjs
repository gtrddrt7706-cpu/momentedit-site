#!/usr/bin/env node
/* ★★[VC_FIX14_1030 · MIG_KEEP · PRELOGIN_EPOCH · MODEL_OFF_DEL · PRACTICE_PURGE · RF_CACHE_ID · RFOK_FILE · OWN_TXT_GEN · RF_LOOK_WAIT · RF_SUP_OFF 2026-10-30 GPT 14차 점검(고객 14-01 ~ 14-09 · 당일 14-01 ~ 14-04)]
   원문 조각을 vm 으로 떼어 장면마다 잰다 — 옛 판(V14_MP · V14_OP · V14_CS · V14_GS 로 옛 파일을 주면)에서는 고친 항목마다 빨강이어야 한다.
   ① 고객 14-01 옛 공용 칸 이관 — 31일 전에 고친 초안도 옮긴 같은 부팅의 30일 걷기에 지워지지 않는다 · 옮긴 칸에 w(지금)
   ② 고객 14-02 시각 없는 옛 저장 안 한 초안이 «저장한 서버 판»에 지지 않는다 · 둘 다 저장 안 한 고침인데 견줄 때가 없으면 옛 칸을 지우지 않는다 · 식순 화면도 같은 규칙
   ③ 고객 14-03 맡김 이관은 종류(식순 · 스냅)마다 합친다 · 쓰기 실패면 옛 맡김 그대로
   ④ 고객 14-04 로그인 전 창의 늦은 로그인 답 — 보낼 때의 이 기기 차례가 바뀌었으면 버리고 옛 창(L8)
   ⑤ 고객 14-05 7일 전 모델만 지운 분도 «지우기» · 서버는 «지웠어요»로
   ⑥ 고객 14-06 연습 소리만 남은 예식도 90일 지우기
   ⑦ 고객 14-07 · 당일 14-02 «모두 받아 둠»은 지금 파일 id 가 보관됐을 때만 · 새 파일 보관 실패는 줄에 L4 · 다시 보관하기
   ⑧ 고객 14-08 스튜디오 확인 ✓ 는 파일 id 에 묶는다(아침 보고 · 콘솔 · 관리 화면)
   ⑨ 고객 14-09 · 당일 14-04 글 카드 차례 · 지금 소리와 같은 파일의 글만
   ⑩ 당일 14-01 기기 보관본을 찾는 동안 «시작»이 기다린다
   ⑪ 당일 14-03 스튜디오가 올린 파일도 끊긴 채 다시 열면 기기에서 찾는다
   ⑫ 브라우저 — 390 마이페이지에 옛 공용 me_order(t · w 없음 · 30일 넘음)를 심으면 옮겨지고 · 식순 화면에서 열리고 · 다시 열어도 남는다
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const R = (f, env) => fs.readFileSync(process.env[env] || path.join(ROOT, f), 'utf8');
const MP = R('mypage.html', 'V14_MP'), OP = R('order-preview.html', 'V14_OP'), CS = R('console.html', 'V14_CS'), GS = R('automation/platform/80_production.gs', 'V14_GS'), ADM = R('admin.html', 'V14_ADM');
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

/* ───────── 이 기기 저장소(마이페이지 · 식순 화면 조각) ───────── */
const A = 'AAAAAA';
const DR = (tx, who, t, dirty, extra) => JSON.stringify(Object.assign({ v: 2, S: { tx: { 'vow.g': tx } }, who, dirty: dirty !== false, base: 'k0' }, t ? { t } : {}, extra || {}));
const SN = (memo, t) => JSON.stringify({ v: 2, zones: { candle: { picks: [], ups: [], links: [], note: memo } }, note: '', t });
const txOf = (v) => { try { return JSON.parse(v).S.tx['vow.g']; } catch (e) { return null; } };
function store(init, quota) { const m = new Map(Object.entries(init || {}));
  return { m, ls: { getItem: (k) => (m.has(k) ? m.get(k) : null), key: (i) => Array.from(m.keys())[i] || null, get length() { return m.size; },
    setItem: (k, v) => { if (quota && quota(k)) { const e = new Error('quota'); e.name = 'QuotaExceededError'; throw e; } m.set(k, String(v)); }, removeItem: (k) => { m.delete(k); } } }; }
const MPF = ['_acctOk', '_ordK', '_keepK', '_recE', '_migPick', '_migStampW', '_acctKeysMigrate', '_acctOldSweep', '_reloginStampT', '_reloginKeyNewer'];
function mpBoot(init, quota) { const st = store(init, quota);
  const code = MPF.map((f) => grabIn(MP, f)).join('\n') + '\n' + [/var RELOGIN_KEY=[^\n]*/, /var ACCT_OLD_MS=[^\n]*/, /var _MIG_DONE=[^\n]*/].map((re) => lineIn(MP, re)).join('\n') + '\n_acctKeysMigrate(); _acctOldSweep();';
  const sb = { localStorage: st.ls, JSON, Object, String, Math, Date: FakeDate, ERR_W: {}, ERR_DO: {} }; vm.createContext(sb); vm.runInContext(code, sb); return Object.fromEntries(st.m); }
function opMig(init, quota) { const st = store(init, quota);
  const sb = { localStorage: st.ls, JSON, Object, String, Math, Date: FakeDate }; vm.createContext(sb); vm.runInContext(grabIn(OP, '_recE') + '\n' + grabIn(OP, '_ordMigPick') + '\n' + grabIn(OP, '_ordMigrate') + '\n_ordMigrate();', sb); return Object.fromEntries(st.m); }

await sec('①', async () => {
  const r = mpBoot({ me_order: DR('31일 전 서약', A, NOW - 31 * DAY) });
  const v = r['me_order_' + A], w = v ? +JSON.parse(v).w : 0;
  ok('① 14-01 [MIG_KEEP] 31일 전에 고친 옛 공용 초안(w 없음)이 옮긴 부팅의 30일 걷기에 지워지지 않는다 · 옮긴 칸에 w = 지금', txOf(v) === '31일 전 서약' && w === NOW && !('me_order' in r), r);
  const r2 = mpBoot({ ['me_order_' + A]: DR('정말 오래된 칸', A, NOW - 40 * DAY, true, { w: NOW - 40 * DAY }) });
  ok('① 걷기는 그대로 — 마지막 사용(w)이 30일 넘은 계정 칸은 걷는다', !(('me_order_' + A) in r2), r2);
  /* 연 때 = 마지막 사용(w) — 식순 화면 _ordRestore · 마이페이지 _acctTouch */
  ok('① 14-01 연 때 w 를 지금으로 — 식순 화면 _ordRestore · 마이페이지 renderMyPage(_acctTouch)', /_o\.w=Date\.now\(\); localStorage\.setItem\(k, JSON\.stringify\(_o\)\);/.test(grabIn(OP, '_ordRestore')) && /_acctTouch\(String\(\(d&&d\.code\)\|\|''\)\)/.test(grabIn(MP, 'renderMyPage'))); });

await sec('②', async () => {
  const r = mpBoot({ me_order: DR('시각 없는 옛 서약', A, 0), ['me_order_' + A]: DR('서버 판', A, 0, false, { w: NOW }) });
  ok('② 14-02 [MIG_KEEP] 시각 없는 옛 저장 안 한 초안이 «저장한 서버 판»에 지지 않는다(옮김 · 서버 판과는 LOCAL_AHEAD 가 견준다)', txOf(r['me_order_' + A]) === '시각 없는 옛 서약' && !('me_order' in r), r);
  const k = mpBoot({ me_order: DR('시각 없는 옛 서약', A, 0), ['me_order_' + A]: DR('계정 칸 고침', A, NOW - 1000) });
  ok('② 둘 다 저장 안 한 고침 · 옛 판에 시각이 없다 → 옛 칸을 지우지 않는다(계정 칸도 그대로)', txOf(k.me_order) === '시각 없는 옛 서약' && txOf(k['me_order_' + A]) === '계정 칸 고침', k);
  const d = mpBoot({ me_order: DR('옛 고침', A, NOW - 900), ['me_order_' + A]: DR('계정 칸 더 나중', A, NOW - 500) });
  ok('② 계정 칸이 더 나중에 고친 판임을 확인했을 때만 옛 판을 버린다', txOf(d['me_order_' + A]) === '계정 칸 더 나중' && !('me_order' in d), d);
  const q = mpBoot({ me_order: DR('큰 옛 서약', A, 0) }, (key) => key === 'me_order_' + A);
  ok('② 쓰기 실패(저장 공간 가득) — 옛 칸 그대로(다음에 다시)', txOf(q.me_order) === '큰 옛 서약', q);
  const o = opMig({ me_order: DR('시각 없는 옛 서약', A, 0), ['me_order_' + A]: DR('서버 판', A, 0, false) }), o2 = opMig({ me_order: DR('시각 없는 옛 서약', A, 0), ['me_order_' + A]: DR('계정 칸 고침', A, NOW - 1000) });
  ok('② 식순 화면(_ordMigrate)도 같은 규칙', txOf(o['me_order_' + A]) === '시각 없는 옛 서약' && !('me_order' in o) && txOf(o2.me_order) === '시각 없는 옛 서약', [o, o2]); });

await sec('③', async () => {
  const init = { me_relogin_keep: JSON.stringify({ code: A, t: NOW - 100, keys: { me_order: DR('맡긴 서약', A, NOW - 100) } }), ['me_relogin_keep_' + A]: JSON.stringify({ code: A, t: NOW - 10, keys: { ['me_snapLocal_' + A]: SN('맡긴 메모', NOW - 10) } }) };
  const r = mpBoot(init), kk = r['me_relogin_keep_' + A] ? JSON.parse(r['me_relogin_keep_' + A]) : { keys: {} };
  ok('③ 14-03 [MIG_KEEP] 계정 맡김(스냅만 · 더 나중)이 있어도 옛 맡김의 식순 초안을 버리지 않는다 — 종류마다 합친다', txOf(kk.keys['me_order_' + A]) === '맡긴 서약' && !!kk.keys['me_snapLocal_' + A] && !('me_relogin_keep' in r), kk);
  const init2 = { me_relogin_keep: JSON.stringify({ code: A, t: NOW - 100, keys: { me_order: DR('옛 맡김 서약', A, NOW - 100) } }), ['me_relogin_keep_' + A]: JSON.stringify({ code: A, t: NOW - 10, keys: { ['me_order_' + A]: DR('새 맡김 서약', A, NOW - 10) } }) };
  const r2 = mpBoot(init2), k2 = JSON.parse(r2['me_relogin_keep_' + A] || '{"keys":{}}');
  ok('③ 같은 종류는 더 나중에 고친 쪽', txOf(k2.keys['me_order_' + A]) === '새 맡김 서약', k2);
  const q = mpBoot(init, (key) => key === 'me_relogin_keep_' + A);
  ok('③ 맡김 쓰기 실패 — 옛 맡김(me_relogin_keep) 그대로', !!q.me_relogin_keep, q); });

/* ───────── ④ 로그인 전 창의 늦은 답 ───────── */
await sec('④', async () => {
  const st = store({}); const pend = []; let shown = 0;
  const code = ['_tabEpNow', '_tabBind', '_tabStale', '_tabTie', '_post'].map((f) => grabIn(MP, f)).join('\n') + '\n' + lineIn(MP, /var TAB_EP_KEY=[^\n]*/) + '\n_tabBind();';
  const sb = { localStorage: st.ls, TOKEN_KEY: 'me_token', EXEC_URL: 'x', JSON, Object, String, Math, Promise, Error, setTimeout, clearTimeout, AbortController,
    _tabStaleShow: () => { shown++; }, _flowBusy: () => {}, fetch: () => new Promise((res) => pend.push(res)) };
  vm.createContext(sb); vm.runInContext(code, sb);
  const p = sb._post({ action: 'autologin', token: 'link-A' }); await flush();
  st.ls.setItem('me_auth_ep', '1.other'); st.ls.setItem('me_token', 'TOKEN-B');   // 다른 창이 계정 나로 로그인
  pend[0]({ status: 200, json: () => Promise.resolve({ ok: true, token: 'TOKEN-A' }) }); const d = await p;
  ok('④ 14-04 [PRELOGIN_EPOCH] 로그인 전 창 — 그 사이 다른 창이 로그인했으면 늦게 온 성공 답을 버린다(L8) · 이 창은 옛 창', !!d && d.reason === 'tab_stale' && d.ecode === 'L8' && vm.runInContext('_TAB.stale', sb) === true && shown > 0, d);
  /* 같은 창이 그대로면 답을 그대로 받는다 */
  const st2 = store({}); const pend2 = []; const sb2 = Object.assign({}, sb, { localStorage: st2.ls, fetch: () => new Promise((res) => pend2.push(res)) }); vm.createContext(sb2); vm.runInContext(code, sb2);
  const p2 = sb2._post({ action: 'login' }); await flush(); pend2[0]({ status: 200, json: () => Promise.resolve({ ok: true, token: 'T' }) }); const d2 = await p2;
  ok('④ 아무 일도 없었으면 답 그대로', !!d2 && d2.ok === true && d2.token === 'T', d2); });

/* ───────── 서버(80_production 조각) — vc-decisions-1030 의 세계를 그대로 빌린다 ───────── */
const VD = fs.readFileSync(path.join(ROOT, 'scripts/audit/vc-decisions-1030.mjs'), 'utf8');
const FN = eval(lineIn(VD, /const FN = \[[^\n]*\];/).replace(/^const FN = /, '').replace(/;$/, '')).concat(['_vcPracticeLeft_', '_rfOkIs_', '_rfCurId_', '_rfStudioUps', 'adminRitualFileOk']).filter((v, i, a) => a.indexOf(v) === i);
const srvCode = (src) => [lineIn(src, /var RF_KEYS[^\n]*/), lineIn(src, /var VC_BASE[^\n]*/), lineIn(src, /var VC_DOWN[^\n]*/), lineIn(src, /var VC_COLOR[^\n]*/)].concat(FN.map((f) => grabIn(src, f))).join('\n') + '\nvar _CURRENT_ADMIN = "";';
const world = eval('(' + grabIn(VD, 'world') + ')');
const V = (who, o) => Object.assign({ consent: { at: kst(NOW - 40 * DAY), v: '1003' }, voiceId: 'uc_' + who, made: kst(NOW - 3 * DAY), tries: 1 }, o || {});

await sec('⑤', async () => {
  const W = world({ cust: { ME0001: { wed: ymd(NOW + 5 * DAY) } }, props: {} }, GS); const rid = W.addFile('읽은 녹음 · 신랑');
  W.props.VC_ME0001 = JSON.stringify({ groom: V('groom', { voiceId: '', modelOff: kst(NOW - DAY), delId: 'uc_groom', read: { id: rid, at: kst(NOW - 9 * DAY) } }) });
  const r = W.call({ op: 'delete', who: 'groom' }), s = W.call({ op: 'status' }), g = s.groom || {};
  ok('⑤ 14-05 [MODEL_OFF_DEL] 모델만 지운 분의 «지우기» — 읽은 녹음 휴지통 · 상태는 «지웠어요»(modelOff 걷힘 · deleted)', r.ok && W.files[rid].trash && !g.modelOff && !!g.deleted && !g.ready, [r, g]);
  const card = grabIn(OP, '_vcPeople') || OP;
  ok('⑤ 카드 — 모델만 지운 분(modelOff)도 «지우기»(mkvcdel) · «다시 녹음»은 위 큰 단추 하나 · 지우기 실패 줄도', /\(\(p\.ready\|\|p\.modelOff\)\?'<span class="mk-vsub">'\+\(p\.ready&&p\.left>0\?/.test(OP) && /\+\(\(p\.ready\|\|p\.modelOff\)&&\(VC\.delErr\|\|\{\}\)\[w\]\?/.test(OP) && /_vcStMine\(w,\{ready:false,modelOff:'',deleted:'지움'/.test(OP), card.length); });

await sec('⑥', async () => {
  const mk = (at) => { const W = world({ cust: { ND1: { wed: '' } }, codes: ['ND1'], props: { VC_ND1: JSON.stringify({ practice: 300, practiceAt: kst(at), groom: { consent: { at: kst(at) } } }) } }, GS);
    const f = W.addFile('연습 소리 · 신랑 · 1'); vm.runInContext('purgeVoiceClones()', W.sb); return { trash: W.files[f].trash, purged: W.st('ND1').purged || '' }; };
  const a = mk(NOW - 100 * DAY), b = mk(NOW - 10 * DAY);
  ok('⑥ 14-06 [PRACTICE_PURGE] 예식일 없음 · 연습 소리만 남음 · 마지막 연습 100일 전 → 연습 소리 휴지통 · «다 지웠다»', a.trash === true && !!a.purged, a);
  ok('⑥ 10일 전이면 그대로', b.trash === false && !b.purged, b); });

await sec('⑧', async () => {
  const S = { guestVoice: 'couple', up: { g0: { id: 'NEW', src: 'ai' }, g1: { id: 'A2', src: 'ai' }, g3: { id: 'A3', src: 'ai' } } };
  const W = world({ cust: { ME0001: { wed: ymd(NOW + 2 * DAY), S } }, props: { VC_ME0001: JSON.stringify({ groom: V('groom') }), RFOK_ME0001: JSON.stringify({ g0: { by: 'x', id: 'OLD' }, g1: { by: 'x', id: 'A2' }, g3: { by: 'x', id: 'A3' } }) } }, GS);
  const due = Array.from(vm.runInContext('vcStudioCheckDue_()', W.sb));
  ok('⑧ 14-08 [RFOK_FILE] A 를 확인한 뒤 B 로 다시 만들면 아침 보고가 «확인 안 함»으로 잡는다(그 줄만)', due.length === 1 && /하객 입장 때 확인 안 함|하객 맞이 1/.test(due[0]) && !/1분 전/.test(due[0]), due);
  const r = JSON.parse(JSON.stringify(vm.runInContext('adminRitualFileOk("ME0001", "g0", true)', W.sb))), r2 = JSON.parse(JSON.stringify(vm.runInContext('adminRitualFileOk("ME0001", "g1", true, "A2x")', W.sb)));
  ok('⑧ 확인 ✓ 는 파일 id 와 함께 — 관리 화면이 넘긴 id · 옛 관리 화면(id 없음)이면 지금 줄의 파일', r.ok && r.okMap.g0.id === 'NEW' && r2.okMap.g1.id === 'A2x', [r.okMap, r2.okMap]);
  ok('⑧ 관리 화면은 들은 파일 id 를 넘기고 · 다른 파일의 ✓ 는 «파일이 바뀌었어요 · 다시 확인»', /gas\('adminRitualFileOk', code, key, on, fid\|\|''\)/.test(ADM) && /ok=ok0&&f&&ok0\.id&&ok0\.id===f\.id\?ok0:null/.test(ADM));
  /* 콘솔 */
  const sb = { GUEST: false, S: { up: { g0: { id: 'B', src: 'ai' } } }, RF_CUR: { g0: { id: 'B', up: true } } }; vm.createContext(sb);
  vm.runInContext(['rfKindLab', 'rfOkSet', 'rfUnchecked'].map((f) => grabIn(CS, f)).join('\n') + '\nvar RF_OKMAP = {}, RF_OKSET = false, RF_WED = "";', sb);
  sb.rfOkSet({ okMap: { g0: { by: 'x', id: 'A' } }, wedding: ymd(NOW) }); const u1 = sb.rfUnchecked('g0'); sb.rfOkSet({ okMap: { g0: { by: 'x', id: 'B' } }, wedding: ymd(NOW) }); const u2 = sb.rfUnchecked('g0');
  ok('⑧ 콘솔 — 지금 받은 파일(B)과 ✓ 파일(A)이 다르면 «스튜디오 확인 안 함» · 같으면 없음', u1 === true && u2 === false, [u1, u2]); });

/* ───────── 콘솔 받기 · 기기 보관(가짜 IndexedDB) ───────── */
function fakeIDB() { const dbs = {}, ctl = { putFail: false, getDelay: 0 };
  const later = (f, ms) => setTimeout(f, ms || 0);
  return { dbs, ctl, open(name) { const req = {}; later(() => { const fresh = !dbs[name]; if (fresh) dbs[name] = {}; const S0 = dbs[name];
    const db = { createObjectStore(n) { S0[n] = new Map(); }, transaction(n) { const st = S0[n]; if (!st) throw new Error('no store'); const tx = {}; let ops = 0, fin = false; const end = () => { if (--ops === 0 && !fin) { fin = true; later(() => tx.oncomplete && tx.oncomplete()); } };
      tx.objectStore = () => ({ put(v, k) { ops++; if (ctl.putFail) { later(() => { fin = true; if (tx.onerror) tx.onerror(); else if (tx.onabort) tx.onabort(); }); return; } st.set(k, v); later(end); },
        get(k) { ops++; const r = {}; later(() => { r.result = st.has(k) ? st.get(k) : undefined; r.onsuccess && r.onsuccess(); end(); }, ctl.getDelay); return r; },
        openCursor() { ops++; const r = {}; later(() => { r.result = null; r.onsuccess && r.onsuccess(); end(); }); return r; } });
      return tx; } };
    req.result = db; if (fresh && req.onupgradeneeded) req.onupgradeneeded(); req.onsuccess && req.onsuccess(); }); return req; } }; }
const CFN = ['rfWhy', 'rfPrefetch', 'rfFreshApply', 'rfBusyNow', 'rfLookNow', 'rfOkSet', 'rfUnchecked', 'rfKindLab', 'rfPaint', 'ownDb', 'ownKey', 'ownToday', 'ownDead', 'rfOwnPut', 'rfOwnGet', 'rfOwnGet0', 'rfOwnFall', 'rfOwnSupPut', 'rfOwnSupGet', 'rfOwnSweep',
  'rfCachedNow', 'rfCurSet', 'rfOwnPutAgain', 'rfUpId', 'ownTxtOf', 'ownTxtSet', 'rfOwnTxtLoad', 'rfKeyOfSlug', 'ownTxtFor'];
const CVARS = [/var RF_WHY = \{\}, RF_SKIP[^\n]*/, /var RF_OKMAP = [^\n]*/, /var RF_CACHED = \{\}, RF_FROM = \{\};/, /var RF_CUR = [^\n]*/, /var OWN_TXT = \{\};/, /var OWN_TXT_GEN[^\n]*/, /var RF_ORIG = \{\}, RF_FRESH[^\n]*/, /var RF_SLUG = [^\n]*/];
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
  const idb = fakeIDB(); const S = { up: { g0: { id: 'A', src: 'ai' } } };
  const W = con({ idb, S, fetch: (b) => (b.fn === 'adminRitualFiles' ? J({ ok: true, files: [{ id: 'A' }, { id: 'B' }], okMap: {}, wedding: ymd(NOW + DAY), sup: {} }) : b.fn === 'adminRitualFileGet' ? J(fileRes(b.args[1])) : J({ ok: false })) });
  W.sb.rfPrefetch(); await flush(30); W.sb.rfPaint(); const a1 = W.box.innerHTML;
  idb.ctl.putFail = true; W.sb.RF_FRESH.ask = { keys: ['g0'], up: { g0: { id: 'B', src: 'ai' } } }; W.sb.rfFreshApply(); await flush(30); W.sb.rfPaint(); const a2 = W.box.innerHTML;
  ok('⑦ 14-07 [RF_CACHE_ID] A 를 보관하면 «모두 받아 둠»', /모두 받아 둠/.test(a1), a1.slice(0, 200));
  ok('⑦ 14-07 · 당일 14-02 B 로 바뀐 뒤 B 보관이 실패하면 «모두 받아 둠»이 없다 · 줄에 «새 소리는 이 기기에 보관하지 못했어요 (코드 L4)» · «다시 보관하기»', W.sb.CLIPS['guest-1-arrival'] === 'blob:B' && !/모두 받아 둠/.test(a2) && /새 소리는 이 기기에 보관하지 못했어요 \(코드 L4\)/.test(a2) && /다시 보관하기/.test(a2), a2.slice(0, 400));
  idb.ctl.putFail = false; W.sb.rfOwnPutAgain('g0'); await flush(30); W.sb.rfPaint(); const a3 = W.box.innerHTML;
  ok('⑦ «다시 보관하기» — 쓰기가 끝나면 «모두 받아 둠»(B 의 id)', /모두 받아 둠/.test(a3) && !/보관하지 못했어요/.test(a3) && W.sb.RF_CACHED.g0 === 'B', a3.slice(0, 200)); });

await sec('⑩', async () => {
  const idb = fakeIDB(); const S = { up: { g0: { id: 'A', src: 'ai' } } };
  const W0 = con({ idb, S, fetch: (b) => (b.fn === 'adminRitualFiles' ? J({ ok: true, files: [{ id: 'A' }], okMap: {}, wedding: ymd(NOW + DAY), sup: {} }) : J(fileRes('A'))) }); W0.sb.rfPrefetch(); await flush(30);
  idb.ctl.getDelay = 40;
  const W = con({ idb, S, fetch: (b) => (b.fn === 'adminRitualFiles' ? J({ ok: true, files: [{ id: 'A' }], okMap: {}, wedding: ymd(NOW + DAY), sup: {} }) : NET()) });
  W.sb.rfPrefetch(); await flush(12); const mid = { st: W.sb.RF_ST.g0, busy: W.sb.rfBusyNow() };
  await wait(80); await flush(20); const end = { st: W.sb.RF_ST.g0, busy: W.sb.rfBusyNow(), clip: W.sb.CLIPS['guest-1-arrival'] };
  ok('⑩ 당일 14-01 [RF_LOOK_WAIT] 받기 실패 뒤 기기 보관본을 찾는 동안은 받는 중(시작 잠금) · 찾으면 두 분 소리', mid.busy === true && mid.st !== 'fail' && end.st === 'ok' && end.busy === false && end.clip === 'blob:A', [mid, end]);
  const i = CS.indexOf("(function(){ var go = $('#go'), run = go.onclick;"), iife = i < 0 ? '' : CS.slice(i, CS.indexOf('})();', i) + 5);
  let ran = 0, tst = ''; const go = { onclick: () => { ran++; }, dataset: {}, textContent: '시작' };
  const sb = { $: () => go, RF_FRESH: { done: true, wait: false }, RF_ST: { g0: 'look' }, rfKeys: () => ['g0'], GUEST: false, QS: { get: () => 'AB12CD' }, toast: (t) => { tst = t; }, rfPaint: () => {}, rfFresh: () => Promise.resolve(null) };
  vm.createContext(sb); vm.runInContext(['rfBusyNow', 'rfLookNow'].map((f) => grabIn(CS, f)).join('\n') + '\n' + iife, sb); go.onclick(); const r1 = ran; sb.RF_ST.g0 = 'ok'; go.onclick();
  ok('⑩ «시작» — 처음 열 때도 기기 보관본을 찾는 동안은 기다린다(«기기에 받아 둔 소리 확인 중…») · 끝나면 시작', r1 === 0 && ran === 1 && /기기에 받아 둔 소리 확인 중/.test(tst), [r1, ran, tst]); });

await sec('⑪', async () => {
  const idb = fakeIDB(); const S = { up: {} };
  const W0 = con({ idb, S, fetch: (b) => (b.fn === 'adminRitualFiles' ? J({ ok: true, files: [{ id: 'S1', key: 'g0', name: '하객 입장 때 · 스튜디오 · a' }], okMap: {}, wedding: ymd(NOW + DAY), sup: { g0: { id: 'S1' } } }) : J(fileRes(b.args[1]))) });
  W0.sb.rfPrefetch(); await flush(40); const on = W0.sb.RF_ST.g0;
  const W = con({ idb, S, fetch: () => NET() }); W.sb.rfPrefetch(); await flush(60);
  ok('⑪ 당일 14-03 [RF_SUP_OFF] 스튜디오가 올린 파일을 받아 둔 뒤 끊긴 채 다시 열면(목록 없음) 기기에서 같은 파일로', on === 'ok' && W.sb.RF_ST.g0 === 'ok' && W.sb.RF_FROM.g0 === 'cache' && W.sb.CLIPS['guest-1-arrival'] === 'blob:S1', [on, W.sb.RF_ST.g0, W.sb.RF_FROM.g0, W.sb.RF_WHY.g0]);
  const W2 = con({ idb: fakeIDB(), S, fetch: () => NET() }); W2.sb.rfPrefetch(); await flush(60);
  ok('⑪ 기기에 표가 없으면 종전대로 «받지 못함»(목록 까닭)', W2.sb.RF_ST.g0 === 'fail' && /목록을 못 받았어요/.test(W2.sb.RF_WHY.g0 || ''), [W2.sb.RF_ST.g0, W2.sb.RF_WHY.g0]); });

await sec('⑨', async () => {
  const pend = []; const W = con({ idb: fakeIDB(), S: { entry: 'A', up: {} }, fetch: () => new Promise((res) => pend.push(res)) });
  const det = (t, id) => ({ json: () => ({ result: { ok: true, mirror: { production: { ritualDraft: { S: { vtext: { g0: t }, up: { g0: { id, src: 'ai' } } } } } } } }) });
  W.sb.RF_OWN['guest-1-arrival'] = 1; W.sb.RF_CUR.g0 = { id: 'B', up: true };
  const p1 = W.sb.rfOwnTxtLoad(), p2 = W.sb.rfOwnTxtLoad(); await flush(); pend[1](det('B 의 글', 'B')); await p2; pend[0](det('A 의 글', 'A')); await p1;
  const t1 = W.sb.ownTxtFor({ slug: 'guest-1-arrival' }); W.sb.RF_CUR.g0 = { id: 'A', up: true }; const t2 = W.sb.ownTxtFor({ slug: 'guest-1-arrival' });
  ok('⑨ 14-09 · 당일 14-04 [OWN_TXT_GEN] 늦게 온 옛 글 답(A)이 새 글(B)을 덮지 않는다', t1 === 'B 의 글', t1);
  ok('⑨ 지금 소리(A)와 다른 파일의 글이면 «이 소리의 글을 확인하지 못했어요»', t2 === '이 소리의 글을 확인하지 못했어요', t2); });

/* ───────── ⑫ 브라우저 — 390 마이페이지 · 옛 공용 me_order ───────── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) console.log('건너뜀 ⑫ — 브라우저(playwright)가 없다(CI guard) · 로컬에서 잰다');
else await sec('⑫', async () => {
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
  const OVR = { '/mypage.html': process.env.V14_MP, '/order-preview.html': process.env.V14_OP };   // 옛 판으로 깨 보기
  const srv = http.createServer((q, r) => { const u0 = decodeURIComponent(q.url.split('?')[0]), p = OVR[u0] || path.join(ROOT, u0); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
  let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('건너뜀 ⑫ — 브라우저를 못 띄움 ' + String(e && e.message || e).split('\n')[0]); srv.close(); return; }
  try {
    const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
    const STATE = { ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SHOT', stage: '제작중', stageIndex: 6, stageList: SIG, nextAction: '다음 할 일을 안내해 드릴게요.', contract: { signed: true }, payment: {}, production: {} };
    for (const seed of [{ n: 't · w 없음', t: false }, { n: 't 40일 전 · w 없음', t: true }]) {
      const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
      await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
      await ctx.addInitScript(`try{ if(!localStorage.getItem('__seed14')){ localStorage.setItem('__seed14','1'); localStorage.setItem('me_token','TOK'); var o={ v: 2, S: { course: 'open', tx: { 'vow.g': '사십일 전 옛 서약' } }, who: 'ME-SHOT', idx: 2, cs: true, sv: false, dirty: true, base: 'k0' }; ${seed.t ? "o.t=Date.now()-40*864e5;" : ''} localStorage.setItem('me_order', JSON.stringify(o)); } }catch(e){}`);
      await ctx.route('**/*', async (rt) => { const u = rt.request().url();
        if (u.includes('script.google.com')) { let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {}
          const body = p.action === 'getMyState' ? STATE : { ok: true }; return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) }); }
        if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
      const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
      await pg.goto(BASE + '/mypage.html', { waitUntil: 'load' }); await pg.waitForTimeout(1500);
      const ls1 = await pg.evaluate(() => ({ old: localStorage.getItem('me_order'), acct: localStorage.getItem('me_order_ME-SHOT') }));
      const w1 = ls1.acct ? +JSON.parse(ls1.acct).w : 0;
      ok('⑫ 390 · ' + seed.n + ' — 옛 공용 me_order가 계정 칸으로 옮겨지고 걷히지 않는다(w 가 찍힘)', !ls1.old && txOf(ls1.acct) === '사십일 전 옛 서약' && w1 > Date.now() - 600000, ls1);
      await pg.evaluate(() => openRitualBuilder({}, null)); let got = null;
      for (let i = 0; i < 40 && !got; i++) { await pg.waitForTimeout(250); const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) { try { got = await f.evaluate(() => (typeof S !== 'undefined' && S.tx && S.tx['vow.g']) || null); } catch (e) {} } }
      let dbg = null; { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) { try { dbg = await f.evaluate(() => ({ acct: typeof _ACCT !== 'undefined' ? _ACCT : '?', tx: typeof S !== 'undefined' ? JSON.stringify(S.tx || null).slice(0, 120) : '?', ls: (localStorage.getItem('me_order_ME-SHOT') || '').slice(0, 160), rest: typeof _restored !== 'undefined' ? _restored : '?' })); } catch (e) { dbg = String(e); } } else dbg = pg.frames().map((x) => x.url()); }
      ok('⑫ ' + seed.n + ' · 식순 화면을 열면 옮긴 초안(옛 서약)으로 열린다', got === '사십일 전 옛 서약', [got, dbg]);
      await pg.screenshot({ path: path.join(process.env.V14_SHOT_DIR || '/tmp', 'vc-fix14-390-' + (seed.t ? 't40' : 'not') + '.png') });
      await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(1500);
      const ls2 = await pg.evaluate(() => localStorage.getItem('me_order_ME-SHOT'));
      ok('⑫ ' + seed.n + ' · 다시 열어도 남는다', txOf(ls2) === '사십일 전 옛 서약', ls2);
      ok('⑫ ' + seed.n + ' · 페이지 오류 없음', !errs.length, errs.slice(0, 3));
    await ctx.close(); }
  } finally { await br.close(); srv.close(); } });

console.log(fail ? `\n✗ VC_FIX14_1030 실패 ${fail}건` : '\n✓ VC_FIX14_1030 — 14차 점검 통과');
process.exit(fail ? 1 : 0);
