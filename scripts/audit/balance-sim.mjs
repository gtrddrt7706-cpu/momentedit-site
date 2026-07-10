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
sb.buildHeaderIndex = () => ({});
sb.touchCustomer = (s, c, n, patch) => { Object.entries(patch).forEach(([k, v]) => row.set(k, v)); };
sb.notifyKakao = (ev, code, p) => kakao.push({ ev, p });
sb._nfAdminLineEmail = (m) => mails.push(m);
sb.setCustomerStage = () => {};
sb._recordHandler = () => {};
sb.resolveSession = () => ({ ok: true, row: cust });
sb.findRowByPersonalCode = () => null;

function setFinal(head, done = true) {
  const st = Math.max(0, Math.min(head, 30) - 25);   // FINAL_CONFIRM 착석25·최대30
  row.set('제작임시저장', JSON.stringify({ tracks: { final: done ? '완료' : '진행중' }, finalDraft: { headcount: String(head), standing: st, extraFee: st * 50000, drink: '스파클링' } }));
}
const bal = () => sb.buildBalanceState(cust);
const ledger = () => sb._cashReceiptLedger(cust);
const ledBal = (key = '잔금') => ledger().find((x) => x.key === key);

console.log('── 잔금 합산 E2E (실서버 코드) ──');

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
sb.handleSaveProductionTrack({ token: 't', track: 'final', draft: { headcount: '29', drink: '스파클링' }, done: true });
ok(ledBal().amount === 1150000, 'S6a 원장 = 스냅샷 유지(1,150,000 · 현재계산 1,250,000 아님)', ledBal().amount);
ok(mails.some(m => /100,000원 → 200,000원/.test(m) && /차액 정산 필요/.test(m)), 'S6b 차액 경보 메일(10만→20만)', mails);

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

// 10) 임박 번들(_confirmDepositCore) — 계약금 확인 시 잔금까지 일괄 + 스냅샷
freshRow({ 현재단계: '계약완료', 입금상태: '대기', 중도금상태: '대기', 예식일: ymdShift(8) }); setFinal(27);
sb._confirmDepositCore('ME-SIM1', { bundle: true });
rec = JSON.parse(row.get('동의기록') || '{}');
ok(row.get('잔금상태') === '확인' && rec.잔금확정금액 === 1150000, 'S10 임박 번들 확인 → 스냅샷 1,150,000', rec.잔금확정금액);

// 11) 인원 25명 이하 → 추가금 0(합산 없음)
freshRow(); setFinal(24);
b = bal();
ok(b.amount === 1050000 && b.extra === null && b.extraPending === false, 'S11 착석 이내 → 추가금 없음·게이트 예고도 없음', { a: b.amount });

// 12) 웨딩스냅 제외
freshRow({ 상품타입: '웨딩스냅', 현재단계: '입금완료' }); setFinal(29);
b = bal();
ok(b && b.extra == null && (sb._balanceExtraInfo(cust).amount === 0), 'S12 웨딩스냅 → 합산 제외', b && b.extra);

console.log(`\nPASS ${pass} · FAIL ${fail}`);
process.exit(fail ? 1 : 0);
