#!/usr/bin/env node
/* ★★[FM_COUPON_1116 2026-11-16 대본 15:55 · 대표님 13:07 «협력사 필메이커 쿠폰은 무료 · 요청한 분께만 · 진행 안 하면 안 나간다 · 협력사라고 알려 주기 · 안 쓰면 다른 곳 · 직접 만든 영상 링크»]
   협력사(필메이커) 쿠폰 — 서버(진짜 89_prevideo · admin 함수 · 시트만 가로챈다) · 관리자 «처리할 일»(진짜 adminHome) · 마이페이지 화면 글을 한 번에 잰다.
   ① 요청 없이는 쿠폰이 없다 — 첫 상태 none · 코드 없음 · 관리자 넣기도 요청 없는 줄에는 거절
   ② 요청 → 관리자 줄(협력사쿠폰 · 제휴 확정 전) · 같은 요청 두 번 = 한 번 · 식중은 식순에 담긴 때만 · 사용하지 않기면 거절
   ③ 넣기 → 마이페이지에 코드(또는 링크) · 회수 · 취소 흐름(발급 전 취소 = 요청 거둠 · 발급 뒤 취소 = 회수 줄 → 회수하면 코드 지움)
   ④ 한 시간 상한(cpnHour) · 닫힌 고객은 줄 없음
   ⑤ 마이페이지 — 두 길(협력사 필메이커 · 직접 준비하기 [TWO_WAY_1116] · 옛 세 길) · 상태별 글 · 식중 비용 말 «쿠폰으로 기본 템플릿 무료 · 추가는 두 분 부담»
   종료 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { loadGas } from './gas-lint.mjs';
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
let fail = 0; const ok = (c, m, d) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || d === undefined ? '' : ' → ' + String(typeof d === 'string' ? d : JSON.stringify(d)).slice(0, 300))); if (!c) fail++; };
const fnSrc = (src, name) => { const a = src.indexOf('function ' + name + '('); if (a < 0) return ''; const b = src.indexOf('\nfunction ', a + 10); return src.slice(a, b < 0 ? undefined : b); };
const J = (o) => JSON.parse(JSON.stringify(o));

console.log('━━ ① ~ ④ 서버(진짜 함수 · 시트 · 캐시 · 메일만 가로챈다)');
const { sandbox: G, errors } = loadGas();
if (errors.length) { console.log('재지 못했습니다 — GAS 로드 실패 ' + errors[0].file + ' ' + errors[0].message); process.exit(2); }
for (const fn of ['handlePvCpnReq', 'handlePvCpnCancel', '_pvCpnPub_', '_pvCpnQueue_', 'adminPvCoupon', '_pvPublic']) if (typeof G[fn] !== 'function') { console.log('재지 못했습니다 — ' + fn + ' 없음'); process.exit(2); }
const kst = new Date(Date.now() + 9 * 3600e3), ymd = (x) => new Date(Date.UTC(kst.getUTCFullYear(), kst.getUTCMonth(), kst.getUTCDate()) + x * 864e5).toISOString().slice(0, 10);
let store = {}, mails = [], cache = new Map(), RIT = { on: { midvid: 1, prevideo: 1 }, midLen: '4' }, WED = ymd(40);
const cust = () => ({ get: (h) => (h === '예식일' ? WED : (h === '개인코드' ? 'T1' : '')) });
G.CacheService = { getScriptCache: () => ({ get: (k) => (cache.has(k) ? cache.get(k) : null), put: (k, v) => cache.set(k, v) }) };
G._nfAdminLineEmail = (l) => mails.push(l);
G.LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
G._pvSheet_ = () => ({});
G._pvRow_ = (sh, code) => (store[code] ? { num: 2, d: J(store[code].d), m: J(store[code].m) } : null);
G._pvWrite_ = (sh, row, code, d, m) => { m.rev = (Number(m.rev) || 0) + 1; store[code] = { d: J(d), m: J(m) }; };
G._pvSess_ = () => ({ code: 'T1', cust: cust() });
G._pvSeePreview_ = () => false;
G._recordHandler = () => {};
G._prodLoad = () => ({ ritualDraft: { _v: 3, S: RIT } });
G.PV_UP.midFrom = '2026-01-01';
G._adminLock = () => ({ releaseLock() {} });
G.findCustomerByCode = (c) => (c === 'T1' ? cust() : null);
G._AUTHED = true;   // 관리자 길(디스패처가 이미 검증한 판)
const req = (kind) => G.handlePvCpnReq({ token: 't', kind });
const cancel = (kind) => G.handlePvCpnCancel({ token: 't', kind });
const pub = (kind) => G._pvPublic('T1', cust(), kind).cpn;
const sheetOf = () => ({ getLastRow: () => Object.keys(store).length + 1, getRange: () => ({ getValues: () => Object.keys(store).map((k) => [k, '', '', JSON.stringify(store[k].d), JSON.stringify(store[k].m), '']) }) });
const queue = () => G._pvCpnQueue_(sheetOf());

// ① 요청 없이는 없다
ok(pub('mid').st === 'none' && !('code' in pub('mid')) && pub('pre').st === 'none', '① 처음엔 쿠폰 없음(none · 코드 칸 없음) — 식전 · 식중', [pub('mid'), pub('pre')]);
let r = G.adminPvCoupon('T1', 'pre', 'issue', 'FM-0000');
ok(r && r.ok === false && !store.T1, '① 요청 없는 줄에는 관리자도 넣지 못한다(요청 없이 나가는 길 없음)', r);
store.T1 = { d: {}, m: { st: 'draft' } };
r = G.adminPvCoupon('T1', 'pre', 'issue', 'FM-0000');
ok(r && r.ok === false && !(store.T1.m.cpn && store.T1.m.cpn.code), '① 줄은 있어도 요청이 없으면 거절', r);
delete store.T1;

// ② 요청 → 관리자 줄
r = req('mid');
ok(r && r.ok && r.cpn.st === 'req' && store['T1#mid'] && store['T1#mid'].m.cpn.req && !store['T1#mid'].m.cpn.code, '② 식중 쿠폰 요청 → 요청 상태(코드 없음) · «개인코드#mid» 줄 m.cpn', r);
ok(mails.length === 1 && /협력사\(필메이커\) 쿠폰 요청/.test(mails[0]) && /제휴 확정 전/.test(mails[0]), '② 관리자 메일 한 줄(제휴 확정 전)', mails);
const rev0 = store['T1#mid'].m.rev; r = req('mid');
ok(r && r.ok && r.same && store['T1#mid'].m.rev === rev0 && mails.length === 1, '② 같은 요청 두 번 = 한 번(쓰기 · 메일 없음)', r);
let q = queue();
ok(q.T1 && q.T1.length === 1 && q.T1[0].kind === 'mid' && q.T1[0].st === 'req', '② 관리자 «처리할 일» 재료 — 요청 한 줄(식중)', q);
RIT = { on: { prevideo: 1 } };
r = req('mid'); ok(r && r.ok === false && /식순/.test(r.error), '② 식순에 식중 영상이 없으면 식중 쿠폰 요청 거절', r);
RIT = { on: { midvid: 1, prevideo: 1 }, midLen: '4' };
store.T1 = { d: {}, m: { st: 'off' } }; r = req('pre');
ok(r && r.ok === false && /사용하지 않기/.test(r.error) && !store.T1.m.cpn, '② 식전 «사용하지 않기»면 요청 거절', r);
delete store.T1;

// ③ 넣기 · 취소 · 회수
r = G.adminPvCoupon('T1', 'mid', 'issue', 'FM-1234-ABCD');
ok(r && r.ok && pub('mid').st === 'issued' && pub('mid').code === 'FM-1234-ABCD', '③ 관리자 넣기 → 마이페이지 상태에 코드', pub('mid'));
ok(!queue().T1, '③ 넣은 뒤 «처리할 일» 줄 사라짐', queue());
r = G.adminPvCoupon('T1', 'mid', 'issue', 'FM-9999'); ok(r && r.ok === false && pub('mid').code === 'FM-1234-ABCD', '③ 이미 보낸 줄에 다시 넣기 거절(코드 그대로)', r);
r = G.adminPvCoupon('T1', 'mid', 'issue', 'http://bad'); void r;
r = cancel('mid');
ok(r && r.ok && r.cpn.st === 'none' && pub('mid').st === 'none' && store['T1#mid'].m.cpn.code === 'FM-1234-ABCD' && store['T1#mid'].m.cpn.cancel, '③ 발급 뒤 취소 → 고객 화면 none(코드 안 보임) · 시트엔 취소 표시', [r, store['T1#mid'].m.cpn]);
q = queue(); ok(q.T1 && q.T1[0].st === 'cancel', '③ 회수 줄(협력사쿠폰회수 재료)', q);
r = req('mid'); ok(r && r.ok && r.cpn.st === 'issued' && r.cpn.code === 'FM-1234-ABCD' && !queue().T1, '③ 취소한 뒤 다시 요청 = 받은 쿠폰 그대로 · 회수 줄 사라짐', r);
cancel('mid'); r = G.adminPvCoupon('T1', 'mid', 'revoke', '');
ok(r && r.ok && pub('mid').st === 'none' && !store['T1#mid'].m.cpn.code && store['T1#mid'].m.cpn.revoked && !queue().T1, '③ 관리자 회수 → 코드 지움 · 줄 없음 · 고객은 요청 단추로', [pub('mid'), store['T1#mid'].m.cpn]);
r = req('pre'); const r2 = cancel('pre');
ok(r.ok && r2.ok && r2.cpn.st === 'none' && !(store.T1.m.cpn || {}).req && !queue().T1, '③ 발급 전 취소 = 요청을 거둠(관리자 줄도 없음)', [r2, store.T1.m.cpn]);
r = G.adminPvCoupon('T1', 'pre', 'issue', 'https://feelmaker.example/cpn/1'); ok(r && r.ok === false, '③ 거둔 요청에는 넣지 못한다', r);
req('pre'); r = G.adminPvCoupon('T1', 'pre', 'issue', 'https://feelmaker.example/cpn/1');
ok(r && r.ok && pub('pre').st === 'issued' && pub('pre').link === 'https://feelmaker.example/cpn/1' && !pub('pre').code, '③ 링크로 넣으면 링크로 싣는다', pub('pre'));
r = G.adminPvCoupon('T1', 'mid', 'issue', 'x'.repeat(G.PV_UP.cpnMax + 1)); ok(r && r.ok === false, '③ 너무 긴 값 거절', r);

// ④ 횟수 상한
cache = new Map(); let lim = null; for (let i = 0; i < G.PV_UP.cpnHour + 2; i++) { const x = i % 2 ? cancel('mid') : req('mid'); if (x && x.ok === false && x.ecode === 'S0') { lim = i; break; } }
ok(lim === G.PV_UP.cpnHour, '④ 한 시간 ' + G.PV_UP.cpnHour + '번 뒤 «잠시 뒤 다시»(코드 S0)', lim);
const gs = read('automation/platform/89_prevideo.gs');
ok(/function handlePvCpnReq\(body\) \{ _gsr_\(\);/.test(gs) && /function handlePvCpnCancel\(body\) \{ _gsr_\(\);/.test(gs) && /function adminPvCoupon\(code, kind, op, val\) \{\n  _requireAdmin\(\);/.test(read('automation/admin/admin.gs')), '④ 첫 줄 — 고객 입구 _gsr_ · 관리 _requireAdmin [B19_LOCK]');
ok(/case 'pvCpnReq':\s+return jsonOut\(handlePvCpnReq\(body\)\);/.test(read('automation/consultation/consultation-booking.gs')) && /'pvCpnReq', 'pvCpnCancel'/.test(read('automation/platform/95_notify.gs')) && /pvCpnReq:'S',pvCpnCancel:'S'/.test(read('mypage.html')), '④ 길(doPost) · 실패 코드 자리 S(서버 ERR_AREA · 화면 ERR_ACT)');
ok(!/쿠폰|cpn/.test(fnSrc(read('automation/platform/80_production.gs'), 'buildProductionState').replace(/_pvPublic/g, '')) && /out\.cpn = _pvCpnPub_\(row\.m \|\| \{\}\);/.test(gs), '④ 마이페이지 상태는 _pvPublic 한 곳이 싣는다(코드는 발급 뒤에만)');

console.log('━━ ④ 관리자 «처리할 일»(진짜 adminHome)');
try {
  const { openWorld } = await import('./_gasworld.mjs');
  const W = openWorld(), H = W.G;
  const C = { 개인코드: 'ME-TEST', 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com', 상품타입: '시그니처', 현재단계: '제작중', 계약상태: '서명완료', 계약총액: 3300000, 예식일: WED, 입금상태: '확인', 중도금상태: '확인', 잔금상태: '', 동의기록: '{}', 처리이력: '' };
  const B = { 개인코드: 'ME-TEST', 상태: '확정', 선택날짜: ymd(-30), 선택시간: '14:00', 토큰: 'tk' };
  const home = (stage, Q) => { W.world(Object.assign({}, C, { 현재단계: stage }), Object.assign({}, B)); H._pvCpnQueue_ = () => Q; const r0 = H.adminHome(); const qq = (r0 && r0.queue) || {}; return (qq.urgent || []).concat(qq.normal || []).filter((x) => /^협력사쿠폰/.test(x.kind)); };
  let it = home('제작중', { 'ME-TEST': [{ kind: 'mid', st: 'req', req: new Date().toISOString() }, { kind: 'pre', st: 'cancel', req: '' }] });
  ok(it.length === 2 && it[0].kind === '협력사쿠폰' && it[0].fm === 'mid' && it[0].badge.text === '제휴 확정 전' && /식중 영상/.test(it[0].sub) && it[1].kind === '협력사쿠폰회수' && it[1].fm === 'pre', '④ 요청 = «협력사쿠폰»(식중 · 제휴 확정 전) · 발급 뒤 취소 = «협력사쿠폰회수»(식전)', it.map((x) => [x.kind, x.fm, x.badge && x.badge.text, x.sub]));
  it = home('취소', { 'ME-TEST': [{ kind: 'mid', st: 'req', req: '' }] });
  ok(it.length === 0, '④ 닫힌 고객(취소)은 줄 없음', it);
  it = home('제작중', {});
  ok(it.length === 0, '④ 요청이 없으면 줄 없음', it);
} catch (e) { ok(false, '④ adminHome 을 돌리지 못했다', String(e && e.stack || e).slice(0, 300)); }

console.log('━━ ⑤ 마이페이지 · 관리 화면 글');
const my = read('mypage.html'), ad = read('admin.html');
const ctx = { PVCFLOW: {}, PVC_FEEL_ON: true, escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), _pvcFeelIn: () => '' };
vm.createContext(ctx); vm.runInContext(fnSrc(my, '_pvcCpnHtml') + '\n' + fnSrc(my, '_pvcCpnX') + '\n' + fnSrc(my, '_pvcWays') + '\n' + fnSrc(my, '_mvcCond'), ctx);
const html = (cpn, kind) => { ctx.PVCFLOW = { cpn, kind: kind || 'mid' }; return vm.runInContext('_pvcWays()', ctx); };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
let h = html({ st: 'none' });
{ const st = strip(h), two = /② 직접 준비하기/.test(st) && st.includes('다른 곳에 맡기거나 직접 만든 영상도 좋아요. 비용은 두 분 부담이고, 다 되면 아래 «영상 올리기»로 링크를 보내 주세요.') && !st.includes('③') && !st.includes('다른 곳에 맡기기');   // [TWO_WAY_1116]
  ok(/① 협력사 필메이커로 만들기/.test(st) && /필메이커는 저희 협력사예요/.test(h) && /템플릿 이용 쿠폰은 무료예요/.test(h) && /제작 대행 · USB 같은 추가는 두 분 부담이에요/.test(h) && two, '⑤ [TWO_WAY_1116] 두 길 — ① 협력사(쿠폰 무료 · 추가는 두 분) ② 직접 준비하기(다른 곳 · 직접 · 두 분 부담 · 아래 «영상 올리기») · ③ 없음', st); }
ok(/data-pvccpn="req">쿠폰 요청하기</.test(h) && !/쿠폰 코드/.test(h) && !/data-pvccpncopy/.test(h), '⑤ 요청 전 = «쿠폰 요청하기» 단추만(코드 없음)', strip(h));
h = html({ st: 'req', req: 'x' });
ok(/요청했어요 · 디렉터가 쿠폰을 보내 드려요/.test(h) && /data-pvccpn="cancel">요청 취소</.test(h) && !/data-pvccpn="req"/.test(h) && !/쿠폰 코드/.test(h), '⑤ 요청 뒤 = «요청했어요 · 디렉터가 쿠폰을 보내 드려요» + 요청 취소', strip(h));
h = html({ st: 'issued', code: 'FM-1<2>', link: '' });
ok(/쿠폰 코드/.test(h) && /FM-1&lt;2&gt;/.test(h) && /data-pvccpncopy>복사</.test(h) && /결제 화면 쿠폰 칸에 넣어 주세요/.test(h) && /data-pvccpn="cancel">쿠폰 쓰지 않기</.test(h), '⑤ 발급 뒤 = 코드(이스케이프) · 복사 · 쓰는 법 한 줄 · 쓰지 않기', strip(h));
h = html({ st: 'issued', code: '', link: 'https://feelmaker.example/c' });
ok(/href="https:\/\/feelmaker\.example\/c"[^>]*>쿠폰 받기</.test(h) && !/data-pvccpncopy/.test(h), '⑤ 링크로 받은 쿠폰 = «쿠폰 받기» 링크', strip(h));
ctx.PVC_FEEL_ON = false; h = html({ st: 'issued', code: 'X' });
ok(!/필메이커|쿠폰/.test(h) && /^직접 준비하기 /.test(strip(h)) && !/[①②③]/.test(h), '⑤ 필메이커 길을 거두면(PVC_FEEL_ON false) 쿠폰 말 · 단추 0', strip(h));
ok(strip(vm.runInContext('_mvcCond(true)', ctx)) === '선택 사항 제작비는 두 분 부담', '⑤ 길을 거둔 날 식중 머리 줄은 옛 말 그대로', strip(vm.runInContext('_mvcCond(true)', ctx)));
ctx.PVC_FEEL_ON = true;
ok(strip(vm.runInContext('_mvcCond(true)', ctx)) === '선택 사항 쿠폰으로 기본 템플릿 무료 추가는 두 분 부담', '⑤ 식중 머리 조건 줄 «선택 사항 · 쿠폰으로 기본 템플릿 무료 · 추가는 두 분 부담»', strip(vm.runInContext('_mvcCond(true)', ctx)));
const blk = my.slice(my.indexOf('function _pvcThree('), my.indexOf('function _pvcUpload('));
ok(!/쿠폰 · 기본 템플릿은 식전 영상에만|쿠폰은 식전 영상에만|템플릿 비용은 두 분 부담이에요/.test(blk.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), '⑤ 식중 «쿠폰은 식전 영상에만» · «템플릿 비용은 두 분 부담» 말 없음(화면 글)');
ok(/data-pvccpn/.test(fnSrc(my, '_pvcBind')) && /data-pvccpncopy/.test(fnSrc(my, '_pvcBind')) && /PVCFLOW\.cpn=\(v\.cpn&&typeof v\.cpn==='object'\)\?v\.cpn:\{st:'none'\};/.test(my), '⑤ 단추 연결 · 서버 cpn 을 받는다(옛 GAS 면 none)');
ok(/function doFmCoupon\(code,names,kind,revoke\)/.test(ad) && /'협력사쿠폰':'fmCoupon','협력사쿠폰회수':'fmCoupon'/.test(ad) && /var FM_PENDING=true;/.test(ad) && /runAct\(\['adminPvCoupon',code,kind,'issue',v\]/.test(ad) && /runAct\(\['adminPvCoupon',code,kind,'revoke',''\]/.test(ad) && /제휴 확정 전/.test(fnSrc(ad, 'doFmCoupon')), '⑤ 관리 화면 — 큐 단추 · 넣기 · 회수 모달 · «제휴 확정 전» 표시');
ok(/adminPvCoupon: adminPvCoupon,/.test(read('automation/admin/admin.gs')), '⑤ 관리 함수 화이트리스트(FNS)에 adminPvCoupon');
console.log(fail ? `FM COUPON FAIL ${fail}` : 'FM COUPON OK');
process.exit(fail ? 1 : 0);
