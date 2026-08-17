/* ★[JOURNEY_SIM 2026-08-16 사용자 지시 "관리자 페이지와 고객마이페이지 연동 호환관련해서 스탭바이스탭으로
   a~z까지 여러경우의 수를 따져서 심층 점검"]

   여정 시뮬레이터 — **진짜 서버 핸들러의 응답을 진짜 화면에 그려** 확인한다.
     ① _gasworld 로 GAS 를 Node 에서 돌린다(시트 쓰기는 이벤트로 가로챈다)
     ② 각 단계마다 handleGetMyState 로 **고객이 실제로 받는 페이로드**를 뜬다
     ③ 그 페이로드를 실제 mypage.html 의 renderMyPage 에 넣어 그린다
     ④ 불변식을 검사한다 — 화면이 백지인가 · 모순되는 말을 하는가 · 낼 곳 없이 내라고 하는가

   ★코드를 읽어서 판단하지 않는다. 서버가 실제로 준 값으로 화면을 그려 본다 —
     [PAID_STAGE_BACK] 사고가 «읽어서는 안 보이는» 종류였다(단계·입금상태·카드 접기 규칙 세 개가 겹쳐야 났다).

   사용: node scripts/audit/journey-sim.mjs
*/
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { openWorld } from './_gasworld.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8159;
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const { G, world } = openWorld();

/* 여정의 각 지점을 «시트가 실제로 그렇게 생긴 모양»으로 만든다.
   ★값은 관리자 동작이 남기는 것과 같은 컬럼에 넣는다 — 화면이 읽는 것이 그 컬럼이기 때문. */
const AMT = 3300000;
const STOPS = [
  { at: '신청접수',   row: { 현재단계: '신청접수' } },
  { at: '상담확정',   row: { 현재단계: '상담확정' } },
  { at: '시착',       row: { 현재단계: '시착' } },
  { at: '상담완료',   row: { 현재단계: '상담완료' } },
  /* [CONTRACT_STAGE_BLANK] 단계만 계약완료로 올라가고 계약서가 없는 조합 — adminForceStage(상담완료→계약완료) 한 번으로 도달한다. */
  { at: '계약완료·계약서 없음', row: { 현재단계: '계약완료' } },
  { at: '계약발송',   row: { 현재단계: '계약완료', 계약상태: '발송', 계약서발송일시: '2026-08-16 10:00', 계약총액: AMT } },
  { at: '서명완료·입금대기', row: { 현재단계: '계약완료', 계약상태: '서명완료', 계약서명일시: '2026-08-16 11:00', 계약총액: AMT, 입금상태: '대기' } },
  { at: '입금신고',   row: { 현재단계: '계약완료', 계약상태: '서명완료', 계약서명일시: '2026-08-16 11:00', 계약총액: AMT, 입금상태: '완료신호', 입금자명: '정희준' } },
  { at: '입금확인',   row: { 현재단계: '입금완료', 계약상태: '서명완료', 계약서명일시: '2026-08-16 11:00', 계약총액: AMT, 입금상태: '확인', 입금자명: '정희준' } },
  { at: '제작중',     row: { 현재단계: '제작중',   계약상태: '서명완료', 계약총액: AMT, 입금상태: '확인' } },
  { at: '예식완료',   row: { 현재단계: '예식완료', 계약상태: '서명완료', 계약총액: AMT, 입금상태: '확인' } },
  { at: '결과물전달', row: { 현재단계: '결과물전달', 계약상태: '서명완료', 계약총액: AMT, 입금상태: '확인', 결과물상태: '전달완료' } },
];
/* 돈 기록이 여러 단계 쌓인 뒤의 되돌리기 — 중도금·잔금까지 확인된 상태에서 앞으로 밀면 무엇이 보이나. */
const PAID_MORE = { 계약상태: '서명완료', 계약서명일시: '2026-08-16 11:00', 계약총액: AMT,
  입금상태: '확인', 입금자명: '정희준', 중도금상태: '확인', 잔금상태: '확인' };
/* 되돌리기 전수 — **진짜 adminForceStage 를 호출해** 상태를 만든다.
   ★손으로 행을 짜면 _clearForwardData·ROLLBACK_KEEP_PAID 의 실제 동작이 아니라 «내 추측»을 검사하게 된다.
     실제 함수를 부르면 지워지는 열·남는 열이 제품이 정한 그대로다(2026-08-16 전환).
   ★손으로 목록을 적으면 빠뜨린 조합이 남는다 — 그 빠뜨린 칸이 [PAID_STAGE_BACK] 이었다. */
const ORDER = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달'];
const FULL_LATE = { 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST',
  계약상태: '서명완료', 계약서명일시: '2026-08-16 11:00', 계약총액: AMT, 예식일: '2026-10-26',
  입금상태: '확인', 입금자명: '정희준', 중도금상태: '확인', 잔금상태: '확인',
  시착동의상태: '동의완료', 시착동의일시: '2026-07-01 10:00', 결과물상태: '전달완료',
  원본링크: 'https://drive.google.com/x',
  동의기록: JSON.stringify({ 시착: { 벌수: 2 }, 계약정보: { weddingDate: '2026-10-26' } }) };
function rollbackTo(fromStage, toStage) {
  const w = world(Object.assign({}, FULL_LATE, { 현재단계: fromStage }), { 상태: '확정', 입금확인: '확인' });
  let fs = null;
  try { fs = G.adminForceStage('ME-TEST', toStage, '시뮬레이션 점검'); } catch (e) { fs = { ok: false, error: e.message }; }
  const ref = G.findCustomerByCode('ME-TEST');
  G.resolveSession = () => ({ ok: true, row: ref });
  let d = null, err = '';
  try { d = G.handleGetMyState({ token: 't' }); } catch (e) { err = e.message; }
  let adm = null; try { adm = G.adminDetail('ME-TEST'); } catch (e) {}
  return { d, err, adm, fs, stage: String(w.C['현재단계'] || '') };
}
/* 예외 단계 — 취소·노쇼·미계약. 돈 기록이 남은 채 예외로 빠지면 화면이 무엇을 말하나. */
const EXC = ['취소', '노쇼', '미계약'].map(function (st) {
  return { at: `예외 단계 ${st}(돈 기록 유지)`, row: Object.assign({}, PAID_MORE, { 현재단계: st }) };
});
/* 웨딩스냅 — 여정이 다르다(계약금 20%·잔금 80% · 중도금 없음). 같은 불변식이 지켜지나. */
const SNAP = ['계약완료', '입금완료', '촬영완료', '결과물전달'].map(function (st) {
  return { at: `웨딩스냅 ${st}`, row: { 현재단계: st, 상품타입: '웨딩스냅', 계약상태: '서명완료',
    계약서명일시: '2026-08-16 11:00', 계약총액: 1200000, 입금상태: (st === '계약완료' ? '대기' : '확인') } };
});
const BACKS = [
  { at: '입금확인 → 계약완료로 되돌림', row: { 현재단계: '계약완료', 계약상태: '서명완료', 계약서명일시: '2026-08-16 11:00', 계약총액: AMT, 입금상태: '확인', 입금자명: '정희준' } },
  { at: '입금확인 → 상담완료로 되돌림', row: { 현재단계: '상담완료', 계약총액: AMT, 입금상태: '확인', 입금자명: '정희준' } },
  { at: '제작중 → 입금완료로 되돌림',   row: { 현재단계: '입금완료', 계약상태: '서명완료', 계약총액: AMT, 입금상태: '확인' } },
  { at: '예식완료 → 제작중으로 되돌림', row: { 현재단계: '제작중', 계약상태: '서명완료', 계약총액: AMT, 입금상태: '확인' } },
];

/* ★★[SIM_FIXTURE_REAL 2026-08-16] 픽스처에 **상담 예약 행**을 함께 심는다.
   처음엔 Customers 행만 심었더니 서버가 정당하게 consult:null 을 줘서 «카드 0개»가 나왔다 —
   제품 결함이 아니라 픽스처 결함이었다. 실제 고객은 신청 순간부터 예약 행을 갖는다.
   ★가짜 백지로 붉어지면 진짜 백지를 못 본다. 픽스처는 «실제로 있을 수 있는 행»이어야 한다. */
function payloadAt(row, booking) {
  const w = world(Object.assign({ 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST', 동의기록: '{}' }, row),
    booking || { 상태: '확정', 입금확인: '확인' });
  const ref = G.findCustomerByCode('ME-TEST');
  G.resolveSession = () => ({ ok: true, row: ref });
  let d = null, err = '';
  try { d = G.handleGetMyState({ token: 't' }); } catch (e) { err = e.message; }
  let adm = null;
  try { adm = G.adminDetail('ME-TEST'); } catch (e) {}
  return { d, err, adm, w };
}

const eng = await launchBrowser();
if (!eng) { console.log('journey-sim 건너뜀 — 브라우저 없음.'); process.exit(0); }
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

try {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 900 } });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 900));

  const draw = (d) => page.evaluate(async (d) => {
    try { renderMyPage(d); } catch (e) { return { err: e.message }; }
    await new Promise((r) => setTimeout(r, 220));
    const vis = (el) => !!(el && getComputedStyle(el).display !== 'none' && el.textContent.trim());
    const ids = ['mp_hold','mp_consult','mp_fitting','mp_contract','mp_payment','mp_midpayment','mp_balance','mp_snap','mp_production','mp_result','mp_ledger'];
    const cards = ids.filter((id) => vis(document.getElementById(id)));
    const nowEl = document.getElementById('mp_nowHead'), subEl = document.getElementById('mp_nowSub');
    const now = (nowEl ? nowEl.textContent : '').trim();
    const sub = (subEl && getComputedStyle(subEl).display !== 'none') ? subEl.textContent.trim() : '';
    const shown = cards.map((id) => document.getElementById(id).textContent).join(' ');
    const all = (now + ' ' + sub + ' ' + shown).replace(/\s+/g, ' ');
    return { cards, now, sub, all: all.slice(0, 400),
      asksPay: /입금해 주세요|입금해주세요/.test(all),
      canPay: !!document.getElementById('mp_paySignal') || /입금 계좌/.test(shown),
      leak: (all.match(/undefined|NaN|\[object Object\]|null원/) || [])[0] || '' };
  }, d);

  const inspect = async (label, got, stageForExc) => {
    const { d, err, adm } = got;
    if (err || !d || d.ok === false) { ok(false, `${label} · 서버가 상태를 못 줬다`, err || JSON.stringify(d).slice(0, 80)); return; }
    const r = await draw(d);
    ok(!r.err, `${label} · 화면 렌더 오류 없음`, r.err);
    /* ★★[BLANK_STRICT 2026-08-16 자체 점검에서 잡음] 이 판정은 처음에 «카드가 있거나 NOW 가 있으면 통과»였다.
       그런데 NOW 문구에는 폴백이 있어(mypage 2286 «디렉터가 확인하고 안내드릴게요.») **항상 비어 있지 않다** —
       즉 그 조건은 **절대 실패할 수 없는 사문**이었다. 초록이 안전을 뜻하지 않았다.
       ★NOW 는 한 줄 요약이지 «지금 할 일이 있는 자리»가 아니다. 카드가 0개면 고객은 화면에서 아무것도 할 수 없다.
       그래서 카드 존재를 직접 본다. 예외 단계(취소·노쇼·미계약)는 «끝난 여정»이라 카드가 없는 것이 정상이다. */
    const _excStage = ['취소', '노쇼', '미계약'].indexOf(String(stageForExc || '')) !== -1;
    if (!_excStage) ok(r.cards.length > 0, `${label} · 보이는 카드가 하나는 있다(백지 금지) [BLANK_STRICT]`, JSON.stringify(r.cards) + ' now=' + r.now);
    ok(!(r.asksPay && !r.canPay), `${label} · «입금해 주세요»면 낼 곳이 있다`, r.all.slice(0, 90));
    ok(!r.leak, `${label} · undefined·NaN 노출 없음`, r.leak);
    /* 관리자↔고객 모순 — 관리자가 '확인'이라 말하는 입금을 고객 화면이 '내라'고 하지 않는가 */
    const admPaid = !!(adm && adm.ok && String(JSON.stringify(adm)).indexOf('"입금상태":"확인"') > -1);
    if (admPaid) ok(!/계약금을 입금해 주세요/.test(r.all), `${label} · 관리자가 '확인'인데 고객에게 계약금을 내라고 하지 않는다`, r.all.slice(0, 90));
    /* ★금액은 두 화면이 **같은 숫자**를 말해야 한다 — 서로 다른 계산식을 쓰면
       «관리자는 23만이라는데 고객 화면엔 33만»이 되고, 그 차이가 전화 통화에서 사고가 된다.
       ★★짝을 정확히 맞출 것(2026-08-16 첫 판에서 여기서 헛발질했다):
         관리자 milestoneAmounts.계약금 은 **«계약 시 실제로 내는 돈»**(=예약금 차감 후)이다
         (admin.gs 981 주석 · 화면 라벨도 '계약금(계약 시 납부)'). 고객 쪽에서 그에 대응하는 값은
         amounts.계약금(총액)이 아니라 **amounts.납부액**이다. 이름이 같은 계약금끼리 비교하면
         멀쩡한 코드가 붉게 뜬다 — 이름이 아니라 «뜻»으로 짝지어야 한다.
       ★잔금은 비교에서 뺀다 — 관리자 쪽은 추가보정분(_balX)을 더하고 확정 시 스냅샷을 쓰므로
         고객의 기본 잔금과 다른 것이 정상이다. 억지로 맞추면 가짜 실패만 만든다. */
    const ma = (adm && adm.milestoneAmounts) || null;
    if (ma && d.payment && d.payment.amounts) {
      const cu = d.payment.amounts;
      const same = (a, b) => (a == null || b == null) ? true : Number(a) === Number(b);
      ok(same(ma.계약금, cu.납부액) && same(ma.중도금, cu.중도금) && same(ma.예약금, cu.예약금),
        `${label} · 관리자와 고객이 같은 금액을 말한다`,
        '관리자 ' + JSON.stringify({ 납부: ma.계약금, 중도금: ma.중도금, 예약금: ma.예약금 })
        + ' 고객 ' + JSON.stringify({ 납부: cu.납부액, 중도금: cu.중도금, 예약금: cu.예약금 }));
    }
  };

  /* ★[DEPOSIT_TICK] 예약금 입금확인 칸이 비면 관리자에게 보여야 한다 —
     고객 화면은 예약금을 '결제 완료'로 찍는데(의도) 관리자 근거는 예약 시트의 그 칸이라,
     비어 있으면 현금영수증 의무발급이 큐에 안 뜨고 환불 기수령액에서 빠진다(둘 다 돈·세무). */
  const check = (label, row) => inspect(label, payloadAt(row), row.현재단계);

  console.log('\n[예약금 입금확인 칸이 비었을 때 — 관리자가 아는가]');
  {
    const a = payloadAt({ 현재단계: '입금완료', 계약상태: '서명완료', 계약총액: AMT, 입금상태: '확인' }, { 상태: '확정' });   // ★입금확인 칸이 빈 예약 행(기본 픽스처는 채워져 있다)
    ok(!!(a.adm && a.adm.depositTick && a.adm.depositTick.missing), '칸이 비면 관리자 상세가 그 사실을 싣는다 [DEPOSIT_TICK]', JSON.stringify(a.adm && a.adm.depositTick));
    const b = payloadAt({ 현재단계: '신청접수' }, { 상태: '신청접수' });
    ok(!(b.adm && b.adm.depositTick), '예약금을 받기 전(신청접수)에는 경고하지 않는다', JSON.stringify(b.adm && b.adm.depositTick));
    const c = payloadAt({ 현재단계: '입금완료', 상품타입: '웨딩스냅', 계약상태: '서명완료', 계약총액: 1200000, 입금상태: '확인' }, { 상태: '확정' });
    ok(!(c.adm && c.adm.depositTick), '웨딩스냅(예약금 개념 없음)에는 경고하지 않는다', JSON.stringify(c.adm && c.adm.depositTick));
  }

  console.log('\n[A~Z 정상 여정 — 각 단계에서 고객 화면]');
  for (const s of STOPS) await check(s.at, s.row);

  console.log('\n[되돌리기 — 관리자가 단계를 앞으로 밀었을 때]');
  for (const b of BACKS) await check(b.at, b.row);

  let _mn = 0;
  console.log('\n[되돌리기 전수 — 진짜 adminForceStage 로 만든 상태]');
  for (let from = 4; from < ORDER.length; from++) {
    for (let to = 0; to < from; to++) {
      _mn++;
      const got = rollbackTo(ORDER[from], ORDER[to]);
      await inspect(`${ORDER[from]} → ${ORDER[to]}`, got, ORDER[to]);
    }
  }
  console.log(`  · 되돌리기 조합 ${_mn}가지 확인`);

  console.log('\n[예외 단계 — 취소·노쇼·미계약]');
  for (const e of EXC) await check(e.at, e.row);

  console.log('\n[웨딩스냅 — 다른 여정]');
  for (const s2 of SNAP) await check(s2.at, s2.row);

  ok((errors || []).length === 0, '브라우저 콘솔 오류 0건', String((errors || []).length));
  console.log(`\n결과 — ${fail ? ('실패 ' + fail + '건') : '실패 0건 (전부 통과)'}`);
} catch (e) { console.log('오류:', e.message, e.stack ? String(e.stack).slice(0, 200) : ''); fail++; }
finally { await eng.close?.(); srv.kill(); }
process.exit(fail ? 1 : 0);
