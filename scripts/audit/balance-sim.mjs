// 잔금 합산 E2E 시뮬레이션 — 실제 GAS 코드(gas-lint 샌드박스 로드)를 가짜 시트 행으로 구동.
//   경로: 최종확정 전/후 → 카드 금액검증 일치 → 확인 스냅샷 → 확인 후 인원 변경(동결·차액 메일) → 영수증 원장 → 콤보·번들·스냅·구데이터.
//   사용: node scripts/audit/balance-sim.mjs
import { loadGas } from './gas-lint.mjs';

const { sandbox: sb, errors } = loadGas();
if (errors.length) { console.log('로드 실패', errors); process.exit(1); }

let pass = 0, fail = 0;
const ok = (c, m, d) => { if (c) { pass++; console.log('  ok   ' + m); } else { fail++; console.log('  FAIL ' + m + (d !== undefined ? ('  →  ' + JSON.stringify(d)) : '')); } };
const ymdShift = (days) => { const d = new Date(Date.now() + days * 86400e3 + 9 * 3600e3); return d.toISOString().slice(0, 10); };

// ── 가짜 데이터 계층 ──
let row, kakao, mails;
function freshRow(over) {
  row = new Map(Object.entries(Object.assign({
    개인코드: 'ME-SIM1', 상품타입: '시그니처', 현재단계: '제작중', 계약상태: '서명완료',
    계약총액: 2100000, 예식일: ymdShift(12), 중도금상태: '확인', 잔금상태: '대기',
    입금상태: '확인', 동의기록: '', 제작임시저장: '', 중도금확인일시: '', 잔금확인일시: '', 현금영수증: ''
  }, over || {})));
  kakao = []; mails = [];
}
const cust = { get: (k) => (row.has(k) ? row.get(k) : ''), num: 2 };
sb.findCustomerByCode = () => cust;
sb.getCustomersSheet = () => ({});
// ★PRODCOL_STUB(2026-07-26): 빈 헤더 인덱스를 주면 PR-B 가드(_prodColsMissing)가 '컬럼 미생성'으로 보고 제작 저장을 통째로 거부한다.
//   그러면 S6a·S6b가 '저장이 막혀서' 통과/실패하는 가짜 결과가 된다(운영 시트엔 컬럼이 있다).
//   제작 8열만 넣지 않고 CUSTOMER_HEADERS 전체를 인덱스로 준다 — 목이 실제 시트에서 더 멀어지지 않게(다른 컬럼 조회도 함께 성립).
const _COLIDX = {}; (sb.CUSTOMER_HEADERS || []).forEach((h, i) => { _COLIDX[h] = i + 1; });
sb.buildHeaderIndex = () => _COLIDX;
sb.touchCustomer = (s, c, n, patch) => { Object.entries(patch).forEach(([k, v]) => row.set(k, v)); };
sb.notifyKakao = (ev, code, p) => kakao.push({ ev, p });
sb._nfAdminLineEmail = (m) => mails.push(m);
sb.setCustomerStage = () => {};
sb._recordHandler = () => {};
sb.resolveSession = () => ({ ok: true, row: cust });
sb.findRowByPersonalCode = () => null;

/* ★[STALE_EXTRA_FEE 2026-09-19] 픽스처가 단가를 손으로 적으면 상수와 갈린다.
   실제로 갈렸다 — 여기 50000 이 박혀 있었고, 제품이 저장값을 그대로 믿던 탓에 검사는 초록이었다.
   그 사이 «정책 변경 전에 확정한 고객은 잔금에 15만 원이 계속 붙는» 버그가 안 보였다.
   이제 픽스처도 제품도 같은 상수를 본다. 합산 «배선»을 검증할 구간은 unitOn() 으로 단가를 세운다. */
function setFinal(head, done = true) {
  const st = Math.max(0, Math.min(head, Number(sb.FINAL_CONFIRM.최대)) - Number(sb.FINAL_CONFIRM.착석));
  const unit = Number(sb.FINAL_CONFIRM.초과단가) || 0;
  row.set('제작임시저장', JSON.stringify({ tracks: { final: done ? '완료' : '진행중' }, finalDraft: { headcount: String(head), standing: st, extraFee: st * unit, drink: '스파클링' } }));
}
const UNIT_REAL = sb.FINAL_CONFIRM.초과단가;            // 현행 정책값(0) — 정책 검사는 이걸 본다
const SEAT_REAL = sb.FINAL_CONFIRM.착석;               // 현행 정책값(30 · 전원 착석 [SEATED30])
/* ★옛 조건은 «단가»와 «착석 정원» 둘이 함께 만든다. 단가만 세우면 착석 30 이라 standing 이 늘 0 이고,
   합산 배선은 한 번도 안 타는데 검사는 초록이 된다(2026-09-19 실측 — S6b 가 그렇게 죽었다).
   재현하려는 옛 조건은 「착석 25 + 스탠딩 5 · 1인 50,000원」이므로 둘 다 되돌려 놓는다. */
const unitOn = () => { sb.FINAL_CONFIRM.초과단가 = 50000; sb.FINAL_CONFIRM.착석 = 25; };
const unitOff = () => { sb.FINAL_CONFIRM.초과단가 = UNIT_REAL; sb.FINAL_CONFIRM.착석 = SEAT_REAL; };
const bal = () => sb.buildBalanceState(cust);
const ledger = () => sb._cashReceiptLedger(cust);
const ledBal = (key = '잔금') => ledger().find((x) => x.key === key);

console.log('── 잔금 합산 E2E (실서버 코드) ──');
unitOn();   // S1~S6b: 「추가금이 잔금에 합산된다」 배선 자체를 검증하는 구간

// 1) 최종확정 전 — 기본 잔금 + 예고 플래그
freshRow();
let b = bal();
ok(b && b.amount === 1050000 && b.extraPending === true && b.extra === null, 'S1 확정 전: 기본 1,050,000 + extraPending', b && { a: b.amount, ep: b.extraPending });

// 2) 최종확정 27명 → 스탠딩2·+100,000 합산
setFinal(27);
b = bal();
ok(b.amount === 1150000 && b.baseAmount === 1050000 && b.extra && b.extra.amount === 100000 && b.extra.standing === 2 && b.extraPending === false, 'S2 확정 후: 1,150,000 합산+산식', { a: b.amount, x: b.extra });

// 3) 카드 금액검증 = 화면 금액 (단일 출처)
ok(sb._payExpectedAmount(cust, '잔금') === 1150000, 'S3 카드 검증 금액 일치(1,150,000)', sb._payExpectedAmount(cust, '잔금'));

// 4) 원장(미확인) = 기본+현재 추가금
ok(ledBal().amount === 1150000 && ledBal().confirmed === false, 'S4 원장 미확인 표시 1,150,000', ledBal().amount);

// 5) 관리자 확인 → 스냅샷 고정 + 고객 안심 카톡
sb.adminConfirmBalance('ME-SIM1');
let rec = JSON.parse(row.get('동의기록') || '{}');
ok(row.get('잔금상태') === '확인' && rec.잔금확정금액 === 1150000 && kakao.some(k => k.ev === 'cust.paymentConfirmed'), 'S5 확인 → 스냅샷 1,150,000 + 안심 알림', rec.잔금확정금액);

// 6) 확인 후 인원 29명으로 변경 → 원장 스냅샷 유지(동결) + 차액 메일
// ★[GUEST30_NOFEE 2026-09-19] 인원 추가금 정책이 0원이 되어(FINAL_CONFIRM.초과단가), 인원 변경만으로는
//   더 이상 금액이 달라지지 않는다. 그렇다고 이 검사를 지우면 「확정 후 금액이 바뀌면 관리자에게 알린다」는
//   기능이 영영 검증되지 않는다 — 추가금 말고도 금액이 달라질 경로는 남는다.
//   그래서 S6a·S6b 구간에서만 단가를 세워 옛 조건을 재현하고, 정책 자체는 S6c가 따로 검증한다.
sb.handleSaveProductionTrack({ token: 't', track: 'final', draft: { headcount: '29', drink: '스파클링' }, done: true });
ok(ledBal().amount === 1150000, 'S6a 원장 = 스냅샷 유지(1,150,000 · 현재계산 1,250,000 아님)', ledBal().amount);
ok(mails.some(m => /100,000원 → 200,000원/.test(m) && /차액 정산 필요/.test(m)), 'S6b 차액 경보 메일(10만→20만)', mails);
unitOff();   // ← 여기서부터 현행 정책값으로 돌아온다

// 6-c) ★현행 정책 — 30명까지 추가금 없음. 29명으로 바꿔도 추가금이 붙지 않는다
ok(sb.FINAL_CONFIRM.초과단가 === 0, 'S6c 인원 추가금 정책 = 0원(30명까지)', sb.FINAL_CONFIRM.초과단가);
//   ※ 「30명이어도 추가금 0」의 실경로 검증은 S11(착석 이내 → 추가금 없음)이 이미 덮는다.
//     제작 데이터는 [PROD_COL_SPLIT] 이후 신 컬럼에 저장되므로 구셀(제작임시저장)을 읽어
//     확인하려 들면 옛 값을 보게 된다 — 읽기 경로를 틀린 검사를 남기지 않는다.

unitOn();   // S7~S10c: 스냅샷·콤보·일괄확정 배선 검증
// 7) 카드 금액검증 — 확인 후엔 추가금 미합산(이중청구 방지 · 멱등가드가 선차단이지만 이중 안전)
ok(sb._payExpectedAmount(cust, '잔금') === 1050000 + 0, 'S7 확인 후 검증금액 동결', sb._payExpectedAmount(cust, '잔금'));

// 8) 구데이터 폴백 — 스냅샷 없이 확인된 행 → 기본 잔금
freshRow({ 잔금상태: '확인' }); setFinal(27);
ok(ledBal().amount === 1050000, 'S8 구데이터(스냅샷 없음) → 기본 잔금 보존', ledBal().amount);

// 9) 콤보(같은 확인일시) → 중도금·잔금 1건 = 840,000 + 스냅샷
//    ※ adminConfirmMidBalance는 '둘 다 대기'(임박 함께입금)용 — 중도금 기확인 픽스처는 실사용과 불일치(하네스 교훈)
freshRow({ 중도금상태: '대기' }); setFinal(27);
sb.adminConfirmMidBalance('ME-SIM1');
rec = JSON.parse(row.get('동의기록') || '{}');
const combo = ledBal('중도금잔금');
ok(rec.잔금확정금액 === 1150000 && combo && combo.amount === 840000 + 1150000, 'S9 묶음확인 → 스냅샷+콤보 1,990,000', combo && combo.amount);

// 10) 임박 번들(_confirmDepositCore) — [스냅샷 우선] 고객 신고(handlePaymentSignal)가 고정한 수납묶음만 일괄 확정.
//     확인 시점 D-day 재계산으로 '신고 없는 금액'을 오확정하던 TOCTOU(신고 D-150 → 확인 D-149) 제거 검증.
freshRow({ 현재단계: '계약완료', 입금상태: '대기', 중도금상태: '대기', 예식일: ymdShift(8) }); setFinal(27);
sb.handlePaymentSignal({ token: 't', payerName: '홍길동' });
rec = JSON.parse(row.get('동의기록') || '{}');
ok(row.get('중도금상태') === '완료신호' && row.get('잔금상태') === '완료신호'
   && ((rec.수납묶음 || {}).keys || []).join() === '중도금,잔금', 'S10a 신고 → 수납묶음 스냅샷+구성원 완료신호', rec.수납묶음);
sb._confirmDepositCore('ME-SIM1', { bundle: true });
rec = JSON.parse(row.get('동의기록') || '{}');
ok(row.get('잔금상태') === '확인' && row.get('중도금상태') === '확인' && rec.잔금확정금액 === 1150000, 'S10b 확인 → 스냅샷 일괄 확정 + 1,150,000', rec.잔금확정금액);
// 10c) 신고 없이 임박 확인 → 미신고 금액은 절대 자동 확정하지 않음(개별 확인 버튼 경로는 별도)
freshRow({ 현재단계: '계약완료', 입금상태: '대기', 중도금상태: '대기', 예식일: ymdShift(8) }); setFinal(27);
sb._confirmDepositCore('ME-SIM1', { bundle: true });
ok(row.get('입금상태') === '확인' && row.get('중도금상태') === '대기' && row.get('잔금상태') === '대기', 'S10c 신고 없는 확인 → 계약금만(미신고분 오확정 금지)', { m: row.get('중도금상태'), b: row.get('잔금상태') });

unitOff();   // S11~: 현행 정책(30명까지 추가금 없음) 검증
// 11) 인원 25명 이하 → 추가금 0(합산 없음)
freshRow(); setFinal(24);
b = bal();
ok(b.amount === 1050000 && b.extra === null && b.extraPending === false, 'S11 착석 이내 → 추가금 없음·게이트 예고도 없음', { a: b.amount });

/* 11-b) ★GUEST30_NOFEE — «스탠딩이 있는데 요금은 0» 구간(26~30명). 2026-09-19 점검에서
   버그가 살던 자리가 정확히 여기다. S11(착석 이내)은 standing 자체가 0 이라 이 구간을 안 덮는다.
   실사고 — 관리자 메일·처리이력이 이 구간에서 「추가 0원 잔금 합산 청구」를 찍었다(5건).
   잔금 쪽도 같은 함정이 있다: standing 만 보고 합산을 켜면 0원짜리 추가 줄이 원장에 붙는다. */
freshRow(); setFinal(28);
b = bal();
ok(b.amount === 1050000 && b.extra === null && b.extraPending === false,
   'S11b 스탠딩 3명·요금 0 → 잔금 그대로·추가 줄 없음', { a: b.amount, x: b.extra });
ok(sb._balanceExtraInfo(cust).amount === 0 && (sb._balanceExtraInfo(cust).standing || 0) === 0,
   'S11c [SEATED30] 28명도 전원 착석 — 스탠딩 0·금액 0', sb._balanceExtraInfo(cust));
ok(sb.FINAL_CONFIRM.착석 === 30 && sb.FINAL_CONFIRM.최대 === 30,
   'S11c2 정책 = 서른 분 전원 착석(검토38)', sb.FINAL_CONFIRM);

/* 11-d) ★[STALE_EXTRA_FEE] «옛 세대 데이터»를 손으로 만들어 넣는다 — 이 케이스만이 상한을 지킨다.
   setFinal() 은 이제 살아 있는 상수에서 단가를 가져오므로, 정책 구간에서는 옛 값이 든 행이
   저절로는 만들어지지 않는다. 그런데 시트에는 **정책을 내리기 전에 확정한 행**이 그대로 남아 있다.
   그 행을 읽는 경로가 상한 없이 저장값을 믿으면 고객은 홈페이지가 「추가금 없음」이라 약속한 뒤에도
   잔금에서 15만 원을 더 낸다. 반증 실측 — 상한을 지우면 이 두 줄만 빨개진다(나머지 18개는 초록). */
freshRow();
row.set('제작임시저장', JSON.stringify({ tracks: { final: '완료' },
  finalDraft: { headcount: '28', standing: 3, extraFee: 150000, drink: '스파클링' } }));   // 정책 변경 전에 확정된 행
b = bal();
ok(b.amount === 1050000 && b.extra === null,
   'S11d 옛 단가가 박힌 행 → 현행 단가로 상한(잔금 그대로)', { a: b.amount, x: b.extra });
ok(sb._balanceExtraInfo(cust).amount === 0,
   'S11e 옛 저장값 150,000 → 0 으로 내림', sb._balanceExtraInfo(cust).amount);

// 12) 웨딩스냅 제외
freshRow({ 상품타입: '웨딩스냅', 현재단계: '입금완료' }); setFinal(29);
b = bal();
ok(b && b.extra == null && (sb._balanceExtraInfo(cust).amount === 0), 'S12 웨딩스냅 → 합산 제외', b && b.extra);

console.log(`\nPASS ${pass} · FAIL ${fail}`);
process.exit(fail ? 1 : 0);
