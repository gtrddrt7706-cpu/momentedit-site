// 라운드2 — GAS 돈 계산 오프라인 검증 (계약서 v1-1 §4·§7·§8·§9를 기대값으로)
import { loadGas } from './gas-lint.mjs';

process.env.TZ = process.env.TZ || 'Asia/Seoul';   // GAS 운영 TZ 재현 — _balanceDDay(로컬 Date)와 _kstYmd(KST) 기준을 일치시킨다. 없으면 UTC 낮 시간대 실행 시 D-day가 하루 어긋나 E4/E6 등 경계 케이스가 거짓 실패한다(실제 코드는 정상).

const { sandbox: sb, errors } = loadGas();
if (errors.length) { console.log('로드 실패', errors); process.exit(1); }

// Bookings 폴백 제어용 스텁(테스트 케이스가 직접 지정)
let bookingsDeposit = '';
sb.findRowByPersonalCode = () => ({ get: (k) => (k === '입금확인' ? bookingsDeposit : '') });

function row(data) { return { get: (k) => (k in data ? data[k] : '') }; }
function ymdShift(base, days) {
  const d = new Date(base + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
const ASOF = '2026-06-13';
let n = 0, fails = 0;
function check(name, got, want) {
  n++;
  const ok = typeof want === 'function' ? want(got) : JSON.stringify(got) === JSON.stringify(want);
  if (!ok) { fails++; console.log('✗ ' + name + '\n   got: ' + JSON.stringify(got)); }
  else console.log('ok ' + name);
}

// ── A. _journeyAmounts (§4 분할: 10/40/50 · 예약금 충당) ──
const a280 = sb._journeyAmounts(2800000, '시그니처');
check('A1 280만 분할', [a280.계약금, a280.예약금, a280.납부액, a280.중도금, a280.잔금], [280000, 100000, 180000, 1120000, 1400000]);
check('A2 280만 합계=총액', a280.계약금 + a280.중도금 + a280.잔금, 2800000);
const a210 = sb._journeyAmounts(2100000, '시그니처');
check('A3 210만 분할', [a210.납부액, a210.중도금, a210.잔금], [110000, 840000, 1050000]);
check('A4 콤마 문자 방어', sb._journeyAmounts('2,800,000원', '시그니처').납부액, 180000);
const aSnap = sb._journeyAmounts(900000, '웨딩스냅');
check('A5 스냅 20% 선금', [aSnap.계약금, aSnap.납부액, aSnap.잔금], [180000, 180000, 720000]);
const aOdd = sb._journeyAmounts(333333, '시그니처');
check('A6 홀수 총액 반올림 흡수(합계 일치)', aOdd.계약금 + aOdd.중도금 + aOdd.잔금, 333333);
check('A7 0원 → null', sb._journeyAmounts(0, '시그니처'), null);

// ── B. _refundQuote 구간 (§7 철회·무상 / §9② 표 / §9⑤ 실비 흡수·중복금지) ──
function rq({ dd, sign, dep = '확인', mid = '', bal = '', fit = 2, fitState = '동의완료', contract = '서명완료', bkDep = '' }) {
  bookingsDeposit = bkDep;
  const data = {
    상품타입: '시그니처', 현재단계: '입금완료', 계약상태: contract, 계약총액: 2800000,
    예식일: dd == null ? '' : ymdShift(ASOF, dd),
    동의기록: JSON.stringify({ 시착: fit == null ? {} : { 벌수: fit } }),
    시착동의상태: fitState, 개인코드: 'T1',
    입금상태: dep, 중도금상태: mid, 잔금상태: bal,
    계약서명일시: sign || '',
  };
  return sb._refundQuote(row(data), ASOF);
}
// 계약 전(예약금만 · Bookings 폴백)
check('B1 계약 전·시착2벌 → 0원', rq({ dd: 300, contract: '', dep: '', bkDep: '확인' }).refund, 0);
check('B2 계약 전·시착1벌 → 5만', rq({ dd: 300, contract: '', dep: '', bkDep: '확인', fit: 1 }).refund, 50000);
check('B3 계약 전·시착0벌 → 전액 10만', rq({ dd: 300, contract: '', dep: '', bkDep: '확인', fit: 0 }).refund, 100000);
// 청약철회(서명 후 15일 이내) — paid 28만 − 시착 10만
const r철회 = rq({ dd: 200, sign: ymdShift(ASOF, -10) });
check('B4 청약철회 → 18만 · 위약 0', [r철회.rule.indexOf('청약철회') !== -1, r철회.penalty, r철회.refund], [true, 0, 180000]);
// 무상취소(150일 전·철회기간 경과)
const r무상 = rq({ dd: 160, sign: ymdShift(ASOF, -30) });
check('B5 무상취소 → 18만', [r무상.rule.indexOf('무상취소') !== -1, r무상.refund], [true, 180000]);
check('B6 경계 dd=150 → 무상취소', rq({ dd: 150, sign: ymdShift(ASOF, -30) }).rule.indexOf('무상취소') !== -1, true);
// 위약 구간 — 시착비 추가 공제 없음(§9⑤)
const r149 = rq({ dd: 149, sign: ymdShift(ASOF, -30) });
check('B7 dd=149 → 10%·환급 0(28만−28만)', [r149.rate, r149.penalty, r149.refund], [0.1, 280000, 0]);
check('B8 dd=60 → 여전히 10%', rq({ dd: 60, sign: ymdShift(ASOF, -30) }).rate, 0.1);
check('B9 dd=59 → 20%', rq({ dd: 59, sign: ymdShift(ASOF, -30) }).rate, 0.2);
const r59m = rq({ dd: 59, sign: ymdShift(ASOF, -30), mid: '확인' });
check('B10 dd=59+중도금 → 140만−56만=84만', r59m.refund, 840000);
check('B11 dd=30 → 20%', rq({ dd: 30, sign: ymdShift(ASOF, -30) }).rate, 0.2);
check('B12 dd=29 → 40%', rq({ dd: 29, sign: ymdShift(ASOF, -30) }).rate, 0.4);
const r29 = rq({ dd: 29, sign: ymdShift(ASOF, -30), mid: '확인' });
check('B13 dd=29+중도금 → 140만−112만=28만', r29.refund, 280000);
check('B14 dd=10 → 40%', rq({ dd: 10, sign: ymdShift(ASOF, -30) }).rate, 0.4);
check('B15 dd=9 → 50%', rq({ dd: 9, sign: ymdShift(ASOF, -30) }).rate, 0.5);
const r9 = rq({ dd: 9, sign: ymdShift(ASOF, -30), mid: '확인', bal: '확인' });
check('B16 dd=9 완납 → 280만−140만=140만', r9.refund, 1400000);
check('B17 dd=1 → 50%', rq({ dd: 1, sign: ymdShift(ASOF, -30) }).rate, 0.5);
const r0 = rq({ dd: 0, sign: ymdShift(ASOF, -30), mid: '확인', bal: '확인' });
check('B18 당일 → 70%·280만−196만=84만', [r0.rate, r0.refund], [0.7, 840000]);
// 시착비가 위약 구간에서 이중 공제되지 않는지 명시 검증: fit 0벌과 2벌의 환급이 같아야 함
check('B19 위약 구간 시착 공제 없음(0벌=2벌)', rq({ dd: 100, sign: ymdShift(ASOF, -30), fit: 0 }).refund === rq({ dd: 100, sign: ymdShift(ASOF, -30), fit: 2 }).refund, true);
// 벌수 미기록 + 동의완료 → needCount
check('B20 벌수 미기록 → needCount', rq({ dd: 200, sign: ymdShift(ASOF, -1), fit: null }).needCount, true);
// 환급 음수 방지
check('B21 환급 하한 0', rq({ dd: 0, sign: ymdShift(ASOF, -30) }).refund, 0);
// 스냅 → null
bookingsDeposit = '';
check('B22 웨딩스냅 → null', sb._refundQuote(row({ 상품타입: '웨딩스냅' }), ASOF), null);

// ── C. _changeFeeQuote (§8①) — 오늘 기준 상대 예식일 ──
const today = sb._kstYmd(new Date());
function cf(dd, used) {
  return sb._changeFeeQuote(row({ 예식일: ymdShift(today, dd), 동의기록: JSON.stringify({ 변경이력: Array(used).fill({}) }), 계약총액: 2800000 }), null);
}
check('C1 dd=150 → 무상(횟수 무관)', [cf(150, 3).fee, cf(150, 0).fee], [0, 0]);
check('C2 dd=60·1회째 → 무상', cf(60, 0).fee, 0);
check('C3 dd=60·2회째 → 10%', cf(60, 1).fee, 280000);
check('C4 dd=59·1회째 → 10%', cf(59, 0).fee, 280000);

// ── D. 시점 라벨(§4 일정) ──
check('D1 중도금 라벨', sb._midDueLabel(), (s) => String(s).indexOf('149일') !== -1);
check('D2 잔금 라벨', sb._balanceDueLabel(), (s) => String(s).indexOf('9일') !== -1);
check('D3 PAYMENT 상수', [sb.PAYMENT.예약금, sb.PAYMENT.계약금율, sb.PAYMENT.중도금율], [100000, 0.1, 0.4]);
check('D4 시착 상수(기본 2벌·5만)', [sb.FITTING_CONSENT.기본벌수, sb.FITTING_CONSENT.추가벌비용], [2, 50000]);

// ── E. buildPaymentState 묶음 수납(§4④ 임박 계약 일괄) — bundleTotal = 납부액 + (D≤149 중도금) + (D≤9 잔금) ──
function pay({ dd, mid = '', bal = '', stage = '계약완료' }) {
  return sb.buildPaymentState(row({
    상품타입: '시그니처', 계약상태: '서명완료', 현재단계: stage, 계약총액: 2800000,
    예식일: ymdShift(today, dd), 입금상태: '대기', 중도금상태: mid, 잔금상태: bal,
    입금자명: '민준', 동의기록: '{}',
  }));
}
check('E1 D-200(여유) → 묶음 없음·납부액만', (function () { const p = pay({ dd: 200 }); return [p.bundle.length, p.bundleTotal]; })(), [0, 180000]);
check('E2 D-100(중도금 임박) → +중도금', (function () { const p = pay({ dd: 100 }); return [p.bundle.indexOf('중도금') !== -1, p.bundle.indexOf('잔금') !== -1, p.bundleTotal]; })(), [true, false, 1300000]);
check('E3 D-5(전액 임박) → +중도금+잔금=총액−예약금', (function () { const p = pay({ dd: 5 }); return [p.bundle.length, p.bundleTotal]; })(), [2, 2700000]);
check('E4 경계 D-149 → 중도금 포함', pay({ dd: 149 }).bundle.indexOf('중도금') !== -1, true);
check('E5 경계 D-150 → 중도금 제외', pay({ dd: 150 }).bundle.indexOf('중도금'), -1);
check('E6 경계 D-9 → 잔금 포함', pay({ dd: 9 }).bundle.indexOf('잔금') !== -1, true);
check('E7 D-100+중도금 이미 확인 → 묶음에서 제외', pay({ dd: 100, mid: '확인' }).bundle.indexOf('중도금'), -1);
check('E8 묶음 합 = 총액 − 예약금(D-5)', pay({ dd: 5 }).bundleTotal, 2800000 - 100000);

// ── F. _cashReceiptLedger(현금영수증 원장) — 발급 대상·합산·과세 추가매출 ──
function led(extra) {
  bookingsDeposit = '';
  return sb._cashReceiptLedger(row(Object.assign({
    상품타입: '시그니처', 계약총액: 2800000, 입금상태: '확인', 개인코드: 'T1',
    중도금상태: '', 잔금상태: '', 중도금확인일시: '', 잔금확인일시: '',
    추가보정금액: 0, 추가보정상태: '', 동의기록: JSON.stringify({ 현금영수증: '01012345678' }),
  }, extra || {})));
}
const lg1 = led();
check('F1 일반 원장 키', lg1.map((x) => x.key), ['예약금', '중도금', '잔금']);
check('F2 예약금 발급 대상·금액', [lg1[0].target, lg1[0].amount, lg1[0].confirmed], ['01012345678', 100000, true]);
check('F3 중도금·잔금 금액', [lg1[1].amount, lg1[2].amount], [1120000, 1400000]);
const lgCombo = led({ 중도금상태: '확인', 잔금상태: '확인', 중도금확인일시: '2026-06-01 10:00', 잔금확인일시: '2026-06-01 10:00' });
check('F4 같은 확인일시 → 중도금·잔금 합산 1건', (function () { const c = lgCombo.find((x) => x.key === '중도금잔금'); return c ? c.amount : 'none'; })(), 2520000);
check('F5 합산 시 개별 중도금/잔금 행 없음', lgCombo.filter((x) => x.key === '중도금' || x.key === '잔금').length, 0);
const lgEx = led({ 추가보정금액: 300000, 추가보정상태: '완료' });
check('F6 추가보정 완료 → 별도 행(과세 매출)', (function () { const e = lgEx.find((x) => x.key === '추가보정'); return e ? [e.amount, e.confirmed] : 'none'; })(), [300000, true]);
check('F7 추가보정 미신청(0원) → 행 생략', led({ 추가보정금액: 0 }).some((x) => x.key === '추가보정'), false);
const lgSnap = sb._cashReceiptLedger(row({ 상품타입: '웨딩스냅', 계약총액: 900000, 입금상태: '확인', 동의기록: '{}', 개인코드: 'S1' }));
check('F8 스냅 원장 → 계약금(20%) 행', (function () { const c = lgSnap.find((x) => x.label === '계약금'); return c ? c.amount : 'none'; })(), 180000);

// ── G. 발급 대상 파싱 _cashReceiptOf ──
check('G1 발급 대상 추출', sb._cashReceiptOf(row({ 동의기록: JSON.stringify({ 현금영수증: '2208612345' }) })), '2208612345');
check('G2 미입력 → 빈 문자열(자진발급 대상)', sb._cashReceiptOf(row({ 동의기록: '{}' })), '');

console.log('\n결과: ' + (n - fails) + '/' + n + (fails ? ' · 실패 ' + fails : ' 전부 통과'));
process.exit(fails ? 1 : 0);
