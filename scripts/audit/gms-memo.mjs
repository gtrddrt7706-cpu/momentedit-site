#!/usr/bin/env node
/* ★★[GMS_MEMO · SIG_FIND 2026-10-08 사장님 «모바일에서 새로고침하면 (코드 L5)» · «pc 에서도 자꾸» · «원인파악해서 확실하게»]
   마이페이지 «최신 내용을 불러오지 못했어요 (코드 L5)» = 화면이 getMyState 를 12초 기다리다 멈춤.
   원인은 서버 한 번 불러오기가 하는 일의 양이었다(계약 · 입금을 마친 고객일수록 많다):
     ① 서명 시트 «전체»(모든 고객의 손글씨 서명 그림)를 매번 통째로 읽었다 — getSignatureDataUrl
     ② 같은 상담 시트 행을 상태에 따라 2~3번 · 고객 행을 2번 따로 찾았다(찾을 때마다 머리줄 + 검색 + 행 읽기)
   이 검사는 진짜 .gs 를 node vm 에서 돌려 다음을 확인한다(브라우저 없음 · CI 에서 돈다):
     1. 기억(GMS_MEMO)을 켠 결과 = 끈 결과(한 글자도 같다)
     2. 켜면 상담 행 찾기 1번 · 고객 행(개인코드) 찾기 0번 · 고객 시트 머리줄 1번
     3. 끝나면 원래 함수로 돌아온다 — 예외가 나도
     4. 서명 찾기(SIG_FIND) = 종전 전체 읽기와 같은 답(무작위 300판) · 전체 읽기를 하지 않는다 · 찾기가 멈추면 종전 길
   종료 코드 0 통과 · 1 실패 */
import { openWorld, kstAhead, kstAgo } from './_gasworld.mjs';
const { G, world } = openWorld();
let fail = 0; const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' — ' + String(d).slice(0, 220)}`); if (!c) fail++; };

/* 서명 시트 흉내 — TextFinder(통째 일치 · 대소문자 무시)와 줄 읽기를 센다 */
function sigSheet(rows) {
  const calls = { full: 0, part: 0, tf: 0 };
  return { calls, getLastRow: () => rows.length + 1,
    getRange: (r, c, nr, nc) => ({
      getValues: () => { if ((nr || 1) > 1 && (nc || 1) >= 3) calls.full++; else calls.part++;
        return Array.from({ length: nr || 1 }, (_, i) => rows[r - 2 + i].slice(c - 1, c - 1 + (nc || 1))); },
      createTextFinder: (v) => { calls.tf++; let whole = false, mc = true; const tf = {
        matchEntireCell: (b) => { whole = !!b; return tf; }, matchCase: (b) => { mc = !!b; return tf; },
        findAll: () => { const out = []; for (let i = 0; i < (nr || 1); i++) { const cell = String(rows[r - 2 + i][c - 1]);
          const a = mc ? cell : cell.toLowerCase(), b = mc ? String(v) : String(v).toLowerCase(); if (whole ? a === b : a.indexOf(b) > -1) out.push({ getRow: () => r + i }); } return out; } };
        return tf; } }) };
}
/* 종전 판(2026-10-08 전) 그대로 — 대조 기준 */
const oldSig = (rows, code, type) => { let found = ''; const c = String(code || '').trim().toUpperCase(), tp = String(type || '').trim();
  for (const v of rows) if (String(v[0]).trim().toUpperCase() === c && String(v[1]).trim() === tp) found = String(v[2] || ''); return found; };
const SA0 = G.SpreadsheetApp;
const useSig = (sh) => { G.SpreadsheetApp = { getActive: () => ({ getSheetByName: (n) => (n === G.SIGNATURES_SHEET ? sh : null) }) }; };

/* 계약 · 시착 · 입금까지 마친 «제작중» 고객 — getMyState 가 상담 행 · 고객 행 · 서명을 모두 찾는 상태 */
const CODE = 'ME-TEST';
const C0 = { 개인코드: CODE, 신랑이름: '김신랑', 신부이름: '이신부', 이메일: 'a@b.c', 상품타입: '시그니처', 현재단계: '제작중',
  로그인토큰: 'tk', 토큰만료: '2099-01-01 00:00', 계약상태: '서명완료', 계약서명일시: kstAgo(24 * 40), 계약총액: 3300000, 예식일: kstAhead(9),
  시착동의상태: '동의완료', 시착동의일시: kstAgo(24 * 50), 입금상태: '확인', 중도금상태: '확인', 잔금상태: '',
  동의기록: JSON.stringify({ 결제수단: { 예약금: '카드' }, 카드결제: { 예약금: { orderId: 'o-1' } } }) };
const B0 = { 상태: '완료', 선택날짜: kstAgo(24 * 60).slice(0, 10), 선택시간: '14:50', 토큰: 'bk', 입금확인: '확인' };
const SIGROWS = [['ME-OTHER', '시착', 'data:image/png;base64,OTHER', '', ''], [CODE, '시착', 'data:image/png;base64,OLD', '', ''],
  [CODE, '계약', 'data:image/png;base64,CTR', '', ''], [CODE, '시착', 'data:image/png;base64,NEW', '', '']];

function run(memoOn, cells) {
  const w = world(Object.assign({}, C0, cells || {}), Object.assign({}, B0));
  const row = { num: 2, get: (h) => (h in w.C ? w.C[h] : '') };
  const n = { bk: 0, cu: 0, csh: 0, hdr: 0 };
  const keep = {};
  const count = (name, k) => { const f = G[name]; keep[name] = f; G[name] = function () { n[k]++; return f.apply(this, arguments); }; };
  count('findRowByPersonalCode', 'bk'); count('findCustomerByCode', 'cu'); count('getCustomersSheet', 'csh'); count('buildHeaderIndex', 'hdr');
  const tokKeep = G.findCustomerByToken; G.findCustomerByToken = () => row;
  const memoKeep = G._gmsMemoOn; if (!memoOn) G._gmsMemoOn = () => () => {};
  const sh = sigSheet(SIGROWS.map((r) => r.slice())); useSig(sh);
  const wrapped = {}; Object.keys(keep).forEach((k) => { wrapped[k] = G[k]; });
  let out, err = '';
  try { out = G.handleGetMyState({ token: 'tk' }); } catch (e) { err = String(e && e.message || e); }
  const restored = Object.keys(wrapped).every((k) => G[k] === wrapped[k]);
  const flags = { on: G.__GMS_ON, memo: G.__GMS };
  G._gmsMemoOn = memoKeep; G.findCustomerByToken = tokKeep; Object.keys(keep).forEach((k) => { G[k] = keep[k]; }); G.SpreadsheetApp = SA0;
  return { out, err, n, sig: sh.calls, restored, flags };
}

console.log('\n═══ ① 기억을 켜도 결과는 한 글자도 같다 [GMS_MEMO] ═══');
const on = run(true), off = run(false);
ok(!on.err && !off.err && on.out && on.out.ok && off.out && off.out.ok, '두 판 모두 ok', on.err || off.err);
ok(JSON.stringify(on.out) === JSON.stringify(off.out), '켠 판 결과 = 끈 판 결과', JSON.stringify(on.out).length + ' vs ' + JSON.stringify(off.out).length);
const doc = ((on.out && on.out.ledger && on.out.ledger.documents) || []).find((d) => d.label === '시착 동의서');
ok(!!doc && doc.sig === oldSig(SIGROWS, CODE, '시착') && doc.sig.endsWith('NEW'), '시착 동의서 서명 = 종전 방식이 고르던 그 한 장(마지막 · 같은 종류)', doc && doc.sig);
ok(!!(on.out && on.out.consult && on.out.consult.byCard), '예약금 카드(고객 행 다시 찾기 자리)도 그대로 나온다', JSON.stringify(on.out && on.out.consult));

console.log('\n═══ ② 켜면 같은 행을 다시 찾지 않는다 ═══');
const say = (t, a, b) => console.log(`  · ${t}: 상담 행 ${a.n.bk} → ${b.n.bk} · 고객 행(개인코드) ${a.n.cu} → ${b.n.cu} · 고객 시트 ${a.n.csh} → ${b.n.csh} · 머리줄 ${a.n.hdr} → ${b.n.hdr}  (끈 판 → 켠 판)`);
say('제작중(계약금 입금 뒤)', off, on);
ok(off.n.bk === 2 && on.n.bk === 1, '제작중 — 상담 행 찾기 2번 → 1번(상담 카드 · 제작 하객 수 미리 채우기가 같은 행)', off.n.bk + ' → ' + on.n.bk);
ok(off.n.cu >= 1 && on.n.cu === 0, '고객 행(개인코드) 찾기 → 0번 — 로그인으로 찾은 행을 쓴다(예약금 카드 확인 자리)', off.n.cu + ' → ' + on.n.cu);
ok(on.n.csh <= 1 && on.n.hdr <= 1, '고객 시트 열기 · 머리줄 읽기 각 1번 이하', on.n.csh + '/' + on.n.hdr);
/* 계약금 입금 «전»(서명은 했다) — 환불 예상 · 현금영수증이 예약금 입금을 상담 행에서 다시 본다 · 상담 행을 가장 많이 찾는 상태 */
const PRE = { 현재단계: '계약완료', 입금상태: '', 중도금상태: '' };
const onP = run(true, PRE), offP = run(false, PRE);
say('계약금 입금 전', offP, onP);
ok(!onP.err && !offP.err && JSON.stringify(onP.out) === JSON.stringify(offP.out), '계약금 입금 전 — 켠 판 결과 = 끈 판 결과', onP.err || offP.err);
ok(offP.n.bk >= 3 && onP.n.bk === 1, '계약금 입금 전 — 상담 행 찾기 3번 이상 → 1번', offP.n.bk + ' → ' + onP.n.bk);

console.log('\n═══ ③ 끝나면 원래 함수로 — 예외가 나도 ═══');
ok(on.restored && on.flags.on === false && on.flags.memo === null, '정상 끝: 함수 5개 원래대로 · 기억 꺼짐', JSON.stringify(on.flags));
{ const keepB = G.buildConsultState; G.buildConsultState = () => { throw new Error('일부러 멈춤'); };
  const r = run(true); G.buildConsultState = keepB;
  ok(/일부러 멈춤/.test(r.err) && r.restored && r.flags.on === false && r.flags.memo === null, '중간에 예외: 함수 원래대로 · 기억 꺼짐 · 예외는 그대로 위로', r.err + ' · ' + JSON.stringify(r.flags)); }
{ const r1 = run(true), r2 = run(true);
  ok(JSON.stringify(r1.out) === JSON.stringify(r2.out) && r2.n.bk === 1, '연달아 두 번 불러도 같은 결과 · 매번 새 기억(앞 판 기억이 남지 않는다)', r2.n.bk); }
ok(typeof G.findRowByPersonalCode === 'function' && !/GMS_MEMO|M\.bk/.test(String(G.findRowByPersonalCode)), '불러오기 밖에서는 진짜 찾기 함수 그대로');

console.log('\n═══ ④ 서명 찾기 = 종전 전체 읽기와 같은 답 · 전체 읽기 없음 [SIG_FIND] ═══');
{ let same = 0, full = 0, total = 0; const codes = ['ME-A1', 'ME-B2', 'ME-C3', 'ME-D4'], types = ['시착', '계약'];
  const rnd = (k) => Math.floor(Math.random() * k);
  for (let t = 0; t < 300; t++) {
    const rows = Array.from({ length: 1 + rnd(25) }, (_, i) => { const c = codes[rnd(codes.length)]; return [Math.random() < 0.2 ? c.toLowerCase() : c, types[rnd(2)] + (Math.random() < 0.1 ? ' ' : ''), 'data:image/png;base64,S' + i, '', '']; });
    const sh = sigSheet(rows); useSig(sh);
    const q = codes[rnd(codes.length)], tp = types[rnd(2)], qq = Math.random() < 0.3 ? q.toLowerCase() : q;
    const got = G.getSignatureDataUrl(qq, tp), want = oldSig(rows, qq, tp);
    total++; if (got === want) same++; full += sh.calls.full;
  }
  G.SpreadsheetApp = SA0;
  ok(same === total, `무작위 ${total}판 모두 종전과 같은 답(대소문자 · 종류 뒤 공백 · 여러 장 중 마지막)`, same + '/' + total);
  ok(full === 0, '서명 시트 전체(그림 칸까지)를 한 번도 통째로 읽지 않았다', full); }
{ const rows = SIGROWS.map((r) => r.slice()), sh = sigSheet(rows); sh.getRange = ((g) => (r, c, nr, nc) => { const x = g(r, c, nr, nc); x.createTextFinder = () => { throw new Error('TextFinder 없음'); }; return x; })(sh.getRange); useSig(sh);
  const got = G.getSignatureDataUrl(CODE, '시착'); G.SpreadsheetApp = SA0;
  ok(got === oldSig(SIGROWS, CODE, '시착') && sh.calls.full === 1, '찾기가 멈추면 종전 전체 읽기로 같은 답', got + ' · full=' + sh.calls.full); }
{ const sh = sigSheet(SIGROWS.map((r) => r.slice())); useSig(sh); const a = G.getSignatureDataUrl('', '시착'), b = G.getSignatureDataUrl('ME-NONE', '시착'); G.SpreadsheetApp = SA0;
  ok(a === '' && b === '' && sh.calls.full === 0, '코드가 비었거나 없는 코드면 빈 값(전체 읽기 없이)', JSON.stringify([a, b, sh.calls])); }

console.log(fail ? `\n❌ ${fail}건 실패` : '\n✅ 모두 통과');
process.exit(fail ? 1 : 0);
