#!/usr/bin/env node
/* ★★[FM_COUPON_1116 2026-11-16 대본 15:55 · 대표님 13:07 «협력사 필메이커 쿠폰은 무료 · 요청한 분께만 · 진행 안 하면 안 나간다 · 협력사라고 알려 주기 · 안 쓰면 다른 곳 · 직접 만든 영상 링크»]
   협력사(필메이커) 쿠폰 — 서버(진짜 89_prevideo · admin 함수 · 시트만 가로챈다) · 관리자 «처리할 일»(진짜 adminHome) · 마이페이지 화면 글을 한 번에 잰다.
   ① 요청 없이는 쿠폰이 없다 — 첫 상태 none · 코드 없음 · 관리자 넣기도 요청 없는 줄에는 거절
   ② 요청 → 관리자 줄(협력사쿠폰 · 제휴 확정 전) · 같은 요청 두 번 = 한 번 · 식중은 식순에 담긴 때만 · 사용하지 않기면 거절
   ③ 넣기 → 마이페이지에 코드(또는 링크) · 회수 · 취소 흐름(발급 전 취소 = 요청 거둠 · 발급 뒤 취소 = 회수 줄 → 회수하면 코드 지움)
   ④ 한 시간 상한(cpnHour) · 닫힌 고객은 줄 없음
   ⑤ 마이페이지 — 두 길(협력사 필메이커 · 직접 준비하기 [TWO_WAY_1116] · 옛 세 길) · 상태별 글 · 식중 비용 말 «쿠폰으로 기본 템플릿 무료 · 추가는 두 분 부담»
   ⑥ ★[COUPON_GATE_1116 2026-11-16 대표님 17:41 «쿠폰(우리 비용)이 진행 안 하는 팀에 헛되이 · 번호가 두 겹»] 쿠폰 문 —
      식중 요청은 식순 확정 뒤만(tracks.ritual 완료 · 순서 마감 예식 14일 전) · 두 번 요청 · 받은 뒤 · 회수 뒤 거절(S0) · 발급 전 취소는 다시 요청 ·
      식중 뺌 → 발급 전 요청 자동 취소 · 발급 뒤 회수 줄(gone) · 관리자 넣기 막힘(식중 미확정 · 큐 ✗ · 흐린 단추) · 고르는 카드(번호 없음 · 처음 둘 다 안 눌림 · 고른 카드만 테 · 다음 행동은 그 안에서만) ·
      «직접 준비하기» = 발급 전 요청 거둠 · 확인 칸은 화면 안(confirm 0)
   ⑦ ★[PRE_CPN_RECLAIM_1119 2026-11-19 대표님 «추천대로»] 식전 «사용하지 않기» = 식중 뺌과 같은 규칙 — 발급 전 요청 거둠(관리자 줄 없음 · 넣기 거절) · 발급 뒤 회수 줄(gone · 까닭 «사용하지 않기»)
      ★[RULES_SLIM ⑧] 옛 기대 «① ② 번호» · «같은 요청 두 번 = ok same» · «쿠폰 요청하기가 바로 보임» · «회수 뒤 다시 요청 단추»는 이 PR 에서 새 기대로 바꿨다
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
let store = {}, mails = [], cache = new Map(), RIT = { on: { midvid: 1, prevideo: 1 }, midLen: '4' }, WED = ymd(40), TRK = { ritual: '완료' };   // [COUPON_GATE_1116] TRK = 식순 트랙(완료 = 순서 확정)
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
G._prodLoad = () => ({ ritualDraft: { _v: 3, S: RIT }, tracks: TRK });
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
ok(r && r.ok === false && r.ecode === 'S0' && /이미 요청하셨어요/.test(r.error) && r.cpn && r.cpn.st === 'req' && store['T1#mid'].m.rev === rev0 && mails.length === 1, '② [COUPON_GATE_1116] 같은 요청 두 번 = 서버 거절(S0 «이미 요청하셨어요» · 쓰기 · 메일 없음 · 지금 상태를 돌려준다) · 옛 기대 «ok same»', r);
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
ok(r && r.ok && pub('mid').st === 'used' && !store['T1#mid'].m.cpn.code && store['T1#mid'].m.cpn.revoked && !queue().T1, '③ 관리자 회수 → 코드 지움 · 줄 없음 · 고객은 «이미 한 번 받으셨어요»(used · [COUPON_GATE_1116] 옛 «요청 단추로»)', [pub('mid'), store['T1#mid'].m.cpn]);
const revU = store['T1#mid'].m.rev; r = req('mid'); ok(r && r.ok === false && r.ecode === 'S0' && /한 장/.test(r.error) && store['T1#mid'].m.cpn.revoked && store['T1#mid'].m.rev === revU, '③ [COUPON_GATE_1116] 회수 뒤 다시 요청 = 거절(영상 한 편에 한 장 · 새 요청 없음)', r);
r = req('pre'); const r2 = cancel('pre');
ok(r.ok && r2.ok && r2.cpn.st === 'none' && !(store.T1.m.cpn || {}).req && !queue().T1, '③ 발급 전 취소 = 요청을 거둠(관리자 줄도 없음)', [r2, store.T1.m.cpn]);
r = G.adminPvCoupon('T1', 'pre', 'issue', 'https://feelmaker.example/cpn/1'); ok(r && r.ok === false, '③ 거둔 요청에는 넣지 못한다', r);
req('pre'); r = G.adminPvCoupon('T1', 'pre', 'issue', 'https://feelmaker.example/cpn/1');
ok(r && r.ok && pub('pre').st === 'issued' && pub('pre').link === 'https://feelmaker.example/cpn/1' && !pub('pre').code, '③ 링크로 넣으면 링크로 싣는다', pub('pre'));
r = G.adminPvCoupon('T1', 'mid', 'issue', 'x'.repeat(G.PV_UP.cpnMax + 1)); ok(r && r.ok === false, '③ 너무 긴 값 거절', r);

// ④ 횟수 상한
cache = new Map(); delete store['T1#mid']; let lim = null; for (let i = 0; i < G.PV_UP.cpnHour + 2; i++) { const x = i % 2 ? cancel('mid') : req('mid'); if (x && x.ok === false && x.ecode === 'S0') { lim = i; break; } }
ok(lim === G.PV_UP.cpnHour, '④ 한 시간 ' + G.PV_UP.cpnHour + '번 뒤 «잠시 뒤 다시»(코드 S0)', lim);

console.log('━━ ⑥ [COUPON_GATE_1116] 쿠폰 문(서버)');
cache = new Map(); store = {}; mails = [];
TRK = { ritual: '진행중' }; WED = ymd(40);
ok(G._pvRitOk_(cust()) === false && G._pvPublic('T1', cust(), 'mid').rok === false, '⑥ 식순 진행 중 · 예식 40일 전 = 순서 미확정(rok false)', G._pvPublic('T1', cust(), 'mid'));
r = req('mid'); ok(r && r.ok === false && r.ecode === 'S0' && /식순을 확정하면 쿠폰을 요청할 수 있어요/.test(r.error) && !store['T1#mid'] && !mails.length, '⑥ 식순 미확정 식중 요청 = 서버 거절(쓰기 · 메일 없음)', r);
WED = ymd(14); ok(G._pvRitOk_(cust()) === false, '⑥ 예식 14일 전 그날은 아직 순서를 고칠 수 있다(미확정)', WED);
WED = ymd(13); ok(G._pvRitOk_(cust()) === true && G._pvPublic('T1', cust(), 'mid').rok === true, '⑥ 순서 마감(예식 14일 전)이 지나면 확정으로 본다(D-13)', WED);
WED = ymd(40); TRK = { ritual: '완료' };
ok(G._pvRitOk_(cust()) === true, '⑥ 두 분이 식순을 끝까지 저장(tracks.ritual 완료) = 확정', TRK);
r = req('mid'); ok(r && r.ok && r.cpn.st === 'req' && store['T1#mid'].m.way === 'fm', '⑥ 확정 뒤 식중 요청 = 요청 상태 · 요청은 필메이커 길(m.way fm)', [r, store['T1#mid'].m.way]);
r = req('mid'); ok(r && r.ok === false && r.ecode === 'S0' && /이미 요청/.test(r.error), '⑥ 두 번째 요청 거절(서버)', r);
r = cancel('mid'); ok(r && r.ok && r.cpn.st === 'none', '⑥ 발급 전 취소', r);
r = req('mid'); ok(r && r.ok && r.cpn.st === 'req', '⑥ 발급 전 취소 뒤 다시 요청은 된다(쿠폰이 나간 적 없음)', r);
TRK = { ritual: '진행중' };
let q6 = queue(); ok(q6.T1 && q6.T1[0].st === 'req' && q6.T1[0].rok === false, '⑥ 관리자 재료 — 식중 요청 · 식순 확정 ✗(rok false)', q6);
r = G.adminPvCoupon('T1', 'mid', 'issue', 'FM-MID'); ok(r && r.ok === false && /식순 확정 전/.test(r.error) && pub('mid').st === 'req', '⑥ 관리자 넣기 막힘(식중 식순 미확정 · 서버)', r);
TRK = { ritual: '완료' }; q6 = queue(); ok(q6.T1 && q6.T1[0].rok === true, '⑥ 확정되면 ✓(rok true)', q6);
// 식중 뺌 → 발급 전 요청 자동 취소
RIT = { on: { prevideo: 1 } };
ok(!queue().T1, '⑥ 식순에서 뺀 식중의 발급 전 요청 = 관리자 줄 없음(읽는 때 판정)', queue());
const p6 = G._pvPublic('T1', cust(), 'mid'); ok(p6.cpn.st === 'none' && store['T1#mid'].m.cpn && !store['T1#mid'].m.cpn.req, '⑥ 식중 뺌 → 고객 상태를 읽을 때 발급 전 요청을 거둔다(시트에서도 지움)', [p6.cpn, store['T1#mid'].m.cpn]);
RIT = { on: { midvid: 1, prevideo: 1 }, midLen: '4' };
ok(G._pvPublic('T1', cust(), 'mid').cpn.st === 'none', '⑥ 다시 담아도 거둔 요청은 돌아오지 않는다(다시 요청하면 된다)');
req('mid'); G.adminPvCoupon('T1', 'mid', 'issue', 'FM-MID');
ok(pub('mid').st === 'issued' && !queue().T1, '⑥ 확정 뒤 넣기 → 쓰는 중(할 일 없음)', [pub('mid'), queue()]);
RIT = { on: { prevideo: 1 } }; q6 = queue();
ok(q6.T1 && q6.T1[0].st === 'gone' && q6.T1[0].kind === 'mid', '⑥ 발급 뒤 식중 뺌 → 회수 줄(gone)', q6);
r = G.adminPvCoupon('T1', 'mid', 'revoke', ''); ok(r && r.ok && pub('mid').st === 'used' && !queue().T1, '⑥ 회수하면 줄 없음 · 고객 used', [r, queue()]);
RIT = { on: { midvid: 1, prevideo: 1 }, midLen: '4' };
// 고르는 카드(pvSave op way)
store = {}; cache = new Map(); mails = [];
const way = (w, kind) => G.handlePvSave({ token: 't', op: 'way', way: w, kind });
ok(G._pvPublic('T1', cust(), 'pre').way === '', '⑥ 처음 = 안 고름(way 빈 값)', G._pvPublic('T1', cust(), 'pre'));
r = way('fm'); ok(r && r.ok && r.pv.way === 'fm' && store.T1.m.way === 'fm' && r.pv.cpn.st === 'none' && !store.T1.m.st, '⑥ 카드 고르기 = 저장만(m.way · 쿠폰 없음 · 상태 그대로)', [r, store.T1]);
r = req('pre'); ok(r && r.ok && r.cpn.st === 'req', '⑥ 식전 = 협력사 카드 뒤 요청', r);
r = way('self'); ok(r && r.ok && r.pv.way === 'self' && r.pv.cpn.st === 'none' && !(store.T1.m.cpn || {}).req && !queue().T1, '⑥ «직접 준비하기»로 바꾸면 발급 전 요청을 거둔다(관리자 줄도 없음)', [r && r.pv, store.T1.m.cpn]);
r = way('xx'); ok(r && r.ok === false && store.T1.m.way === 'self', '⑥ 모르는 길 거절', r);
store.T1 = { d: { v: 1, mode: 'upload', link: 'https://drive.google.com/x' }, m: { st: 'done', cpn: { req: 'x', at: 'y', code: 'C' } } };
ok(G._pvPublic('T1', cust(), 'pre').way === 'fm', '⑥ 옛 줄(way 없음) · 쿠폰 받은 줄 = 필메이커 길로 읽는다', G._pvPublic('T1', cust(), 'pre').way);
r = way('self'); ok(r && r.ok && store.T1.m.st === 'done' && store.T1.d.link === 'https://drive.google.com/x' && store.T1.m.cpn.code === 'C', '⑥ 고르기는 초안 · 상태 · 발급된 쿠폰을 건드리지 않는다', store.T1);
store = {};
console.log('━━ ⑦ [PRE_CPN_RECLAIM_1119] 식전 «사용하지 않기» = 식중 뺌과 같은 규칙(발급 전 요청 거둠 · 발급 뒤 회수 줄)');
cache = new Map(); mails = [];
const off = () => G.handlePvSave({ token: 't', op: 'off', kind: 'pre', rev: (store.T1 && store.T1.m.rev) || 0 });
const reopen = () => G.handlePvSave({ token: 't', op: 'reopen', kind: 'pre', rev: (store.T1 && store.T1.m.rev) || 0 });
// 가) 요청 → 사용하지 않기
r = way('fm'); r = req('pre'); ok(r && r.ok && r.cpn.st === 'req' && queue().T1 && queue().T1[0].st === 'req', '⑦ 전 · 식전 요청 = 관리자 요청 줄', queue());
r = off(); ok(r && r.ok && store.T1.m.st === 'off', '⑦ «사용하지 않기» 저장', r && (r.error || r.ok));
ok(!queue().T1, '⑦ 후 · 발급 전 요청은 관리자 줄 없음(읽는 때 판정 · 디렉터가 보내지 않는다)', queue());
const p7 = G._pvPublic('T1', cust(), 'pre'); ok(p7.cpn.st === 'none' && !(store.T1.m.cpn || {}).req, '⑦ 후 · 고객 상태를 읽을 때 발급 전 요청을 거둔다(시트에서도 지움)', [p7.cpn, store.T1.m.cpn]);
r = G.adminPvCoupon('T1', 'pre', 'issue', 'FM-PRE'); ok(r && r.ok === false && !(store.T1.m.cpn || {}).code, '⑦ 후 · 관리자 넣기도 막힘(거둔 요청 · 사용하지 않기)', r);
r = reopen(); ok(r && r.ok && store.T1.m.st !== 'off' && G._pvPublic('T1', cust(), 'pre').cpn.st === 'none', '⑦ 다시 하기로 돌아와도 거둔 요청은 돌아오지 않는다(다시 요청하면 된다)', [r && (r.error || r.ok), store.T1.m.st]);
// 나) 발급 → 사용하지 않기
r = req('pre'); ok(r && r.ok && r.cpn.st === 'req', '⑦ 다시 요청', r);
store.T1.m.st = 'off'; r = G.adminPvCoupon('T1', 'pre', 'issue', 'FM-PRE'); ok(r && r.ok === false && /사용하지 않기/.test(r.error) && !store.T1.m.cpn.code && store.T1.m.cpn.req, '⑦ 요청 뒤 «사용하지 않기»로 바뀐 줄 = 관리자 넣기 거절(서버 · 글이 곧 까닭 · 고객이 화면을 열기 전이라도)', r);
r = reopen(); r = G.adminPvCoupon('T1', 'pre', 'issue', 'FM-PRE'); ok(r && r.ok && pub('pre').st === 'issued' && !queue().T1, '⑦ 전 · 발급 = 쓰는 중(할 일 없음)', [pub('pre'), queue()]);
r = off(); ok(r && r.ok && store.T1.m.st === 'off', '⑦ 발급 뒤 «사용하지 않기»', r && (r.error || r.ok));
let q7 = queue(); ok(q7.T1 && q7.T1.length === 1 && q7.T1[0].kind === 'pre' && q7.T1[0].st === 'gone', '⑦ 후 · 발급 뒤 = 관리자 회수 줄(gone · 식전)', q7);
ok(store.T1.m.cpn.code === 'FM-PRE' && !store.T1.m.cpn.revoked, '⑦ 후 · 회수 전까지 발급 기록은 그대로(관리자가 필메이커에서 회수)', store.T1.m.cpn);
r = G.adminPvCoupon('T1', 'pre', 'revoke', ''); ok(r && r.ok && pub('pre').st === 'used' && !queue().T1, '⑦ 회수하면 줄 없음 · 고객 used', [r, queue()]);
store = {};
const gs = read('automation/platform/89_prevideo.gs');
ok(/function _pvCpnOff_\(kind, cust, m, on\) \{ _gsr_\(\);/.test(gs) && (gs.match(/_pvCpnOff_\(/g) || []).length >= 4 && /_pvCpnOff_\('pre', cust, m\)/.test(read('automation/admin/admin.gs')), '⑦ 판정 한 곳(_pvCpnOff_) — _pvPublic · _pvCpnQueue_ · adminPvCoupon 이 같은 함수를 부른다');
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
  ok(it.length === 2 && it[0].kind === '협력사쿠폰' && it[0].fm === 'mid' && it[0].badge.text === '제휴 확정 전' && /^협력사 쿠폰 요청 · 식중 · 식순 확정 ✓/.test(it[0].sub) && it[0].fmOk === true && it[1].kind === '협력사쿠폰회수' && it[1].fm === 'pre', '④ 요청 = «협력사쿠폰»(식중 · 제휴 확정 전 · «협력사 쿠폰 요청 · 식중 · 식순 확정 ✓») · 발급 뒤 취소 = «협력사쿠폰회수»(식전)', it.map((x) => [x.kind, x.fm, x.badge && x.badge.text, x.sub]));
  it = home('제작중', { 'ME-TEST': [{ kind: 'mid', st: 'req', req: '', rok: false }, { kind: 'pre', st: 'req', req: '', rok: true }, { kind: 'mid', st: 'gone', req: '' }] });
  ok(it.length === 3 && it[0].fmOk === false && /식순 확정 ✗/.test(it[0].sub) && it[1].fmOk === true && /^협력사 쿠폰 요청 · 식전 · 쿠폰/.test(it[1].sub) && !/식순 확정/.test(it[1].sub) && it[2].kind === '협력사쿠폰회수' && /식순에서 식중 영상을 뺐어요/.test(it[2].sub), '④ [COUPON_GATE_1116] 식중 미확정 = ✗ · 넣기 흐림(fmOk false) · 식전은 확정 표시 없음 · 식순에서 뺀 발급 뒤 = 회수 줄', it.map((x) => [x.kind, x.fmOk, x.sub]));
  it = home('제작중', { 'ME-TEST': [{ kind: 'pre', st: 'gone', req: '' }] });
  ok(it.length === 1 && it[0].kind === '협력사쿠폰회수' && it[0].fm === 'pre' && /^식전 영상 · 고객이 «사용하지 않기»로 정했어요 · 보낸 쿠폰을 필메이커에서 회수한 뒤 «회수»를 눌러 주세요$/.test(it[0].sub) && !/식순에서/.test(it[0].sub), '④ [PRE_CPN_RECLAIM_1119] 식전 회수 줄 = «사용하지 않기» 까닭(식중 글을 빌리지 않는다)', it);
  it = home('취소', { 'ME-TEST': [{ kind: 'mid', st: 'req', req: '' }] });
  ok(it.length === 0, '④ 닫힌 고객(취소)은 줄 없음', it);
  it = home('제작중', {});
  ok(it.length === 0, '④ 요청이 없으면 줄 없음', it);
} catch (e) { ok(false, '④ adminHome 을 돌리지 못했다', String(e && e.stack || e).slice(0, 300)); }

console.log('━━ ⑤ 마이페이지 · 관리 화면 글');
const my = read('mypage.html'), ad = read('admin.html');
const ctx = { PVCFLOW: {}, PVC_FEEL_ON: true, escapeHtml: (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'), _pvcFeelIn: (m) => (m === 'link' ? '<button type="button" class="pvc-lk pvc-feel-lk" data-pvcgo="feel">만드는 법 보기</button>' : '') };
vm.createContext(ctx); vm.runInContext(['_pvcCpnOpen', '_pvcCpnHtml', '_pvcCpnX', '_pvcWayCard', '_pvcWays', '_mvcCond'].map((n) => fnSrc(my, n)).join('\n'), ctx);
/* [COUPON_GATE_1116] 화면 글은 «협력사 카드를 고른 · 식순 확정된» 상태로 잰다(문이 열린 때) — 문 · 카드 모양은 ⑥ 에서 따로 */
const html = (cpn, kind, way, rok, ask) => { ctx.PVCFLOW = { cpn, kind: kind || 'mid', way: way === undefined ? 'fm' : way, rok: rok === undefined ? true : rok, _cpnAsk: !!ask }; return vm.runInContext('_pvcWays()', ctx); };
const strip = (h) => h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
let h = html({ st: 'none' });
{ const st = strip(h), two = /직접 준비하기/.test(st) && st.includes('다른 곳에 맡기거나 직접 만든 영상도 좋아요. 비용은 두 분 부담이고, 다 되면 아래 «영상 올리기»로 링크를 보내 주세요.') && !/[①②③]/.test(st) && !st.includes('다른 곳에 맡기기');   // [TWO_WAY_1116] · [COUPON_GATE_1116] 번호 없음
  ok(/협력사 필메이커로 만들기/.test(st) && /필메이커는 저희 협력사예요/.test(h) && /템플릿 이용 쿠폰은 무료예요/.test(h) && /제작 대행 · USB 같은 추가는 두 분 부담이에요/.test(h) && two, '⑤ [TWO_WAY_1116] 두 길 — 협력사(쿠폰 무료 · 추가는 두 분) · 직접 준비하기(다른 곳 · 직접 · 두 분 부담 · 아래 «영상 올리기») · 번호 · ③ 없음([COUPON_GATE_1116])', st); }
ok(/data-pvccpn="ask">쿠폰 요청하기</.test(h) && !/data-pvccpn="req"/.test(h) && !/쿠폰 코드/.test(h) && !/data-pvccpncopy/.test(h), '⑤ 요청 전 = «쿠폰 요청하기» 단추만(코드 없음 · 누르면 확인 칸 · 바로 요청 아님)', strip(h));
h = html({ st: 'req', req: 'x' });
ok(/요청했어요 · 디렉터가 쿠폰을 보내 드려요/.test(h) && /data-pvccpn="cancel">요청 취소</.test(h) && !/data-pvccpn="req"/.test(h) && !/쿠폰 코드/.test(h), '⑤ 요청 뒤 = «요청했어요 · 디렉터가 쿠폰을 보내 드려요» + 요청 취소', strip(h));
h = html({ st: 'issued', code: 'FM-1<2>', link: '' });
ok(/쿠폰 코드/.test(h) && /FM-1&lt;2&gt;/.test(h) && /data-pvccpncopy>복사</.test(h) && /결제 화면 쿠폰 칸에 넣어 주세요/.test(h) && /data-pvccpn="cancel">쿠폰 쓰지 않기</.test(h), '⑤ 발급 뒤 = 코드(이스케이프) · 복사 · 쓰는 법 한 줄 · 쓰지 않기', strip(h));
h = html({ st: 'issued', code: '', link: 'https://feelmaker.example/c' });
ok(/href="https:\/\/feelmaker\.example\/c"[^>]*>쿠폰 받기</.test(h) && !/data-pvccpncopy/.test(h), '⑤ 링크로 받은 쿠폰 = «쿠폰 받기» 링크', strip(h));
ctx.PVC_FEEL_ON = false; h = html({ st: 'issued', code: 'X' });
ok(!/필메이커|쿠폰/.test(h) && /^직접 준비하기 /.test(strip(h)) && !/[①②③]/.test(h) && !/data-pvcway|role="radio"/.test(h), '⑤ 필메이커 길을 거두면(PVC_FEEL_ON false) 쿠폰 말 · 단추 0 · 고를 카드 없음', strip(h));
ok(strip(vm.runInContext('_mvcCond(true)', ctx)) === '선택 사항 제작비는 두 분 부담', '⑤ 길을 거둔 날 식중 머리 줄은 옛 말 그대로', strip(vm.runInContext('_mvcCond(true)', ctx)));
ctx.PVC_FEEL_ON = true;
ok(strip(vm.runInContext('_mvcCond(true)', ctx)) === '선택 사항 쿠폰으로 기본 템플릿 무료 추가는 두 분 부담', '⑤ 식중 머리 조건 줄 «선택 사항 · 쿠폰으로 기본 템플릿 무료 · 추가는 두 분 부담»', strip(vm.runInContext('_mvcCond(true)', ctx)));
const blk = my.slice(my.indexOf('function _pvcThree('), my.indexOf('function _pvcUpload('));
ok(!/쿠폰 · 기본 템플릿은 식전 영상에만|쿠폰은 식전 영상에만|템플릿 비용은 두 분 부담이에요/.test(blk.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '')), '⑤ 식중 «쿠폰은 식전 영상에만» · «템플릿 비용은 두 분 부담» 말 없음(화면 글)');
ok(/data-pvccpn/.test(fnSrc(my, '_pvcBind')) && /data-pvccpncopy/.test(fnSrc(my, '_pvcBind')) && /data-pvcway/.test(fnSrc(my, '_pvcBind')) && /PVCFLOW\.cpn=\(v\.cpn&&typeof v\.cpn==='object'\)\?v\.cpn:\{st:'none'\};/.test(my), '⑤ 단추 연결 · 서버 cpn 을 받는다(옛 GAS 면 none)');

console.log('━━ ⑥ [COUPON_GATE_1116] 고르는 카드 · 쿠폰 문(화면)');
const cards = (h) => [...h.matchAll(/<div class="pvc-way (fm|self)( on)?"><button type="button" class="pvc-way-b" role="radio" aria-checked="(true|false)"/g)].map((m) => ({ k: m[1], on: !!m[2], ck: m[3] }));
const inner = (h, k) => { const a = h.indexOf('<div class="pvc-way ' + k); const b = h.indexOf('<div class="pvc-way ', a + 10); return h.slice(a, b < 0 ? undefined : b); };
h = html({ st: 'none' }, 'pre', '');
let cs = cards(h);
ok(cs.length === 2 && cs.every((c) => !c.on && c.ck === 'false') && /role="radiogroup"/.test(h) && !/[①②③]/.test(strip(h)), '⑥ 처음 = 고르는 카드 둘 · 둘 다 안 눌림(기본값을 눌린 모양으로 두지 않는다) · 번호 없음', cs);
ok(!/data-pvccpn/.test(h) && !/만드는 법 보기/.test(h), '⑥ 안 고르면 다음 행동(쿠폰 요청 · 만드는 법 보기) 없음', strip(h));
h = html({ st: 'none' }, 'pre', 'fm'); cs = cards(h);
ok(cs.filter((c) => c.on).map((c) => c.k).join() === 'fm' && cs.find((c) => c.k === 'fm').ck === 'true' && cs.find((c) => c.k === 'self').ck === 'false', '⑥ 협력사를 고르면 그 카드만 테(on · aria-checked)', cs);
ok(/data-pvccpn="ask"/.test(inner(h, 'fm')) && /만드는 법 보기/.test(inner(h, 'fm')) && !/data-pvccpn|만드는 법/.test(inner(h, 'self')), '⑥ 식전 · 협력사 고름 = 쿠폰 요청하기 열림 · 다음 행동은 고른 카드 안에서만', strip(h));
h = html({ st: 'none' }, 'pre', 'self'); cs = cards(h);
ok(cs.filter((c) => c.on).map((c) => c.k).join() === 'self' && !/data-pvccpn|만드는 법 보기/.test(h), '⑥ 직접 준비하기를 고르면 쿠폰 단추 없음', strip(h));
h = html({ st: 'none' }, 'mid', 'fm', false);
ok(/data-pvccpn="wait" aria-disabled="true"[^>]*>쿠폰 요청하기</.test(h) && strip(h).includes('식순을 확정하면 쿠폰을 요청할 수 있어요') && !/data-pvccpn="(ask|req)"/.test(h), '⑥ 식중 · 식순 미확정 = 흐린 단추 + «식순을 확정하면 쿠폰을 요청할 수 있어요»', strip(h));
h = html({ st: 'none' }, 'mid', 'fm', true);
ok(/data-pvccpn="ask">쿠폰 요청하기</.test(h) && !/aria-disabled/.test(inner(h, 'fm')) && !strip(h).includes('식순을 확정하면'), '⑥ 식중 · 식순 확정 뒤 = 쿠폰 요청하기 열림', strip(h));
h = html({ st: 'none' }, 'mid', 'fm', true, true);
ok(strip(h).includes('쿠폰은 영상 한 편에 한 장이에요 · 받은 뒤 진행하지 않아도 다시 드리지 않아요') && /data-pvccpn="req">요청할게요</.test(h) && /data-pvccpn="no">취소</.test(h), '⑥ 요청 누름 = 화면 안 확인 칸(한 편에 한 장 · 요청할게요 / 취소)', strip(h));
h = html({ st: 'used' }, 'pre', 'fm');
ok(strip(h).includes('쿠폰은 이미 한 번 받으셨어요') && !/data-pvccpn="(ask|req)"/.test(h), '⑥ 회수 뒤 = 다시 요청 단추 없음(한 편에 한 장)', strip(h));
{ const cpnFns = ['_pvcCpnGo', '_pvcWayGo', '_pvcCpnHtml', '_pvcWays', '_pvcWayCard'].map((n) => fnSrc(my, n)).join('\n').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  ok(cpnFns.length > 500 && !/\bconfirm\(|\balert\(|mpConfirm\(|mpAlert\(/.test(cpnFns), '⑥ 확인은 화면 안 칸 — confirm() · alert() · 확인 창 0'); }
ok(/_pvcSave\('way', \{way:k\}\)/.test(fnSrc(my, '_pvcWayGo')) && /\[COUPON_GATE_1116\] 고르는 카드/.test(fnSrc(my, '_pvcBind')), '⑥ 카드 고르기 = 저장(pvSave op way)만 · 쿠폰 요청은 따로');
{ const css = (sel) => (my.match(new RegExp('\\n' + sel.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\{([^}]*)\\}')) || [])[1] || '';
  ok(/border-color:var\(--gold-deep\)/.test(css('.pvc-way.on')) && /background:var\(--gold-bg\)/.test(css('.pvc-way.on')) && /border:1px solid var\(--border\)/.test(css('.pvc-way')) && !/background:/.test(css('.pvc-way')) && /min-height:44px/.test(css('.pvc-way-b')), '⑥ [SEL_ONE] 고른 카드만 금빛 테 한 겹 + 옅은 금빛 바탕 · 안 고른 카드는 가는 테(칠 없음) · 누르는 칸 44', [css('.pvc-way'), css('.pvc-way.on')]); }
ok(/function doFmCoupon\(code,names,kind,revoke,sub\)/.test(ad) && /'협력사쿠폰':'fmCoupon','협력사쿠폰회수':'fmCoupon'/.test(ad) && /var FM_PENDING=true;/.test(ad) && /runAct\(\['adminPvCoupon',code,kind,'issue',v\]/.test(ad) && /runAct\(\['adminPvCoupon',code,kind,'revoke',''\]/.test(ad) && /제휴 확정 전/.test(fnSrc(ad, 'doFmCoupon')), '⑤ 관리 화면 — 큐 단추 · 넣기 · 회수 모달 · «제휴 확정 전» 표시');
ok(/adminPvCoupon: adminPvCoupon,/.test(read('automation/admin/admin.gs')), '⑤ 관리 함수 화이트리스트(FNS)에 adminPvCoupon');
ok(/it\.fmOk===false\?' disabled aria-disabled="true"/.test(fnSrc(ad, 'queueRow')) && /if\(el&&el\.getAttribute\('aria-disabled'\)==='true'\) return; doFmCoupon\(/.test(ad), '⑥ [COUPON_GATE_1116] 관리 화면 — 식중 미확정 줄은 넣기 단추 흐림(disabled) · 눌러도 모달 안 엶');
console.log(fail ? `FM COUPON FAIL ${fail}` : 'FM COUPON OK');
process.exit(fail ? 1 : 0);
