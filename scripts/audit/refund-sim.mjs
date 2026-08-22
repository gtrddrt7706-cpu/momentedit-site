/* ★[REFUND_SIM 2026-08-21 사용자 지시 "실제 시뮬레이션 버그 찾고 … 개선점이 없을때까지"]
   환불 계산 시뮬레이터 — **진짜 _refundQuote 를 경계일마다 호출해** 계약서와 어긋나는 값을 찾는다.

   ★왜 경계일인가: 위약 구간은 «예식 150일 전»처럼 하루로 갈린다.
     `>` 와 `>=` 한 글자 차이가 곧 수십만 원 차이이고, 코드를 읽어서는 잘 안 보인다.
     그래서 D-151·150·149 … 처럼 **하루씩 옮겨 가며 실제 값을 뽑아** 계단이 어디서 지는지 본다.

   ★불변식(계약서와 무관하게 늘 참이어야 하는 것):
     ①환불액은 음수가 아니다  ②환불액 ≤ 기수령액(받은 것보다 많이 돌려주지 않는다)
     ③예식이 가까워질수록 환불액이 늘어나지 않는다(단조 감소 — 늘면 계산이 뒤집힌 것)
   사용: node scripts/audit/refund-sim.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';
const { G, world } = openWorld();
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const AMT = 3300000;
const ymdPlus = (days) => {          // 오늘부터 N일 뒤 (KST 기준 문자열)
  const d = new Date(Date.now() + days * 86400000 + 9 * 3600e3);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`;
};

function quoteAt(daysToWedding, extra) {
  world(Object.assign({
    신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST',
    현재단계: '입금완료', 계약상태: '서명완료', 계약총액: AMT,
    입금상태: '확인', 예식일: ymdPlus(daysToWedding),
    동의기록: JSON.stringify({ 시착: { 벌수: 2 } }),
  }, extra || {}), { 상태: '확정', 입금확인: '확인' });
  const ref = G.findCustomerByCode('ME-TEST');
  try { return G.buildRefundQuote(ref); } catch (e) { return { err: e.message }; }
}

console.log('\n[위약 구간의 계단이 어디서 지는가 — 하루씩 옮겨 가며 실제 값]');
const steps = [];
for (const d of [200, 151, 150, 149, 100, 31, 30, 29, 10, 9, 8, 1, 0]) {
  const q = quoteAt(d);
  if (q && q.err) { ok(false, `D-${d} 계산 중 오류`, q.err); continue; }
  steps.push({ d, refund: q ? Number(q.refund || 0) : null, paid: q ? Number(q.paid || 0) : null, rule: q ? String(q.rule || '') : '' });
}
steps.forEach((s) => console.log(`  D-${String(s.d).padStart(3)} · 환불 ${String(s.refund).padStart(9)} · 기수령 ${String(s.paid).padStart(9)} · ${s.rule.slice(0, 40)}`));

console.log('\n[불변식]');
{
  const bad신 = steps.filter((s) => s.refund != null && s.refund < 0);
  ok(bad신.length === 0, '환불액이 음수가 되는 구간이 없다', bad신.map((s) => 'D-' + s.d).join(','));

  const over = steps.filter((s) => s.refund != null && s.paid != null && s.refund > s.paid);
  ok(over.length === 0, '받은 것보다 많이 돌려주는 구간이 없다', over.map((s) => `D-${s.d}(환불 ${s.refund} > 기수령 ${s.paid})`).join(' · '));

  /* 예식이 가까워질수록(=d 가 작아질수록) 환불이 늘면 계산이 뒤집힌 것이다. */
  const asc = [...steps].filter((s) => s.refund != null).sort((a, b) => b.d - a.d);   // 먼 미래 → 가까운 순
  let rise = null;
  for (let i = 1; i < asc.length; i++) if (asc[i].refund > asc[i - 1].refund) { rise = `${asc[i - 1].d}일전 ${asc[i - 1].refund} → ${asc[i].d}일전 ${asc[i].refund}`; break; }
  ok(!rise, '예식이 가까워질수록 환불이 늘지 않는다(단조 감소)', rise);
}

console.log('\n[8조⑤ 변경을 통한 회피 — 미루고 취소해도 그때 구간이 유지되는가]');
{
  /* 계약서 제8조⑤: «변경 시점에 최초 예식일 기준으로 이미 도달한 위약금 구간이 있는 경우,
     그보다 낮은 구간은 적용하지 아니한다». 2026-08-21 점검 전에는 이 조항이 코드에 없었고,
     D-19(40%)에서 1년 뒤로 미룬 뒤 취소하면 «무상취소»가 되어 **99만원이 새어 나갔다.** */
  const hist = (fromDays, atDays) => [{ from: { date: ymdPlus(fromDays) }, to: { date: ymdPlus(300) }, fee: 330000, at: ymdPlus(atDays) + ' 10:00' }];
  const base = { 중도금상태: '확인', 중도금확인일시: '2026-01-01 10:00', 동의기록: JSON.stringify({ 시착: { 벌수: 0 } }) };
  const withHist = (h) => Object.assign({}, base, { 동의기록: JSON.stringify({ 시착: { 벌수: 0 }, 변경이력: h }) });

  const 미룬뒤 = quoteAt(300, withHist(hist(19, 0)));      // D-19(40%)에서 미룸
  const 그때취소 = quoteAt(19, base);                       // 미루지 않고 그때 취소했다면
  ok(Number(미룬뒤.refund) === Number(그때취소.refund),
    '미루고 취소해도 그때 구간이 유지된다(8조⑤) [CHANGE_RATCHET]',
    `미룬 뒤 ${미룬뒤.refund} vs 그때 ${그때취소.refund}`);
  ok(/8조⑤/.test(String(미룬뒤.rule || '')), '적용 근거가 문구에 남는다', String(미룬뒤.rule));

  const 무상에서미룸 = quoteAt(400, withHist(hist(300, 0)));   // 무상 구간(D-300)에서 미룬 것은 하한 없음
  ok(/무상취소/.test(String(무상에서미룸.rule || '')), '무상 구간에서 미룬 것은 그대로 무상이다(과잉 적용 금지)', String(무상에서미룸.rule));

  const 이력없음 = quoteAt(300, base);
  ok(/무상취소/.test(String(이력없음.rule || '')), '변경 이력이 없으면 종전대로 무상', String(이력없음.rule));
}

console.log('\n[중도금·잔금까지 받은 뒤 취소 — 큰 금액이 오갈 때]');
{
  /* ★여기가 진짜 위험 구간이다. 계약금만 받았을 때는 위약금이 기수령을 넘어 0 으로 잘리지만,
     중도금·잔금까지 받으면 **실제로 돌려줄 돈이 생긴다** — 그때 계산이 틀리면 그대로 송금 사고다. */
  const paidAll = { 중도금상태: '확인', 중도금확인일시: '2026-08-01 10:00', 잔금상태: '확인', 잔금확인일시: '2026-08-01 10:00' };
  const rows = [];
  for (const d of [200, 150, 149, 30, 29, 9, 0]) {
    const q = quoteAt(d, paidAll);
    rows.push({ d, refund: q ? Number(q.refund || 0) : null, paid: q ? Number(q.paid || 0) : null, rule: q ? String(q.rule || '') : '' });
  }
  rows.forEach((r0) => console.log(`  D-${String(r0.d).padStart(3)} · 환불 ${String(r0.refund).padStart(9)} · 기수령 ${String(r0.paid).padStart(9)} · ${r0.rule.slice(0, 34)}`));
  ok(rows.every((r0) => r0.refund >= 0), '전액 수령 상태에서도 환불이 음수가 아니다', rows.filter((r0) => r0.refund < 0).map((r0) => 'D-' + r0.d).join(','));
  ok(rows.every((r0) => r0.refund <= r0.paid), '받은 것보다 많이 돌려주지 않는다', rows.filter((r0) => r0.refund > r0.paid).map((r0) => `D-${r0.d}(${r0.refund}>${r0.paid})`).join(' · '));
  const big = rows.find((r0) => r0.d === 200);
  ok(big && big.paid > 1000000, '중도금·잔금이 기수령에 실제로 합산된다', big ? String(big.paid) : '(없음)');
  let rise2 = null;
  for (let i = 1; i < rows.length; i++) if (rows[i].refund > rows[i - 1].refund) { rise2 = `D-${rows[i - 1].d} ${rows[i - 1].refund} → D-${rows[i].d} ${rows[i].refund}`; break; }
  ok(!rise2, '전액 수령 상태에서도 단조 감소', rise2);
}

console.log('\n[시착 벌수에 따른 공제 — 0벌·2벌·5벌]');
for (const n of [0, 2, 5]) {
  const q = quoteAt(200, { 동의기록: JSON.stringify({ 시착: { 벌수: n } }) });
  const fd = q ? Number(q.fitDeduct || 0) : null;
  console.log(`  ${n}벌 → 공제 ${fd} · 환불 ${q ? q.refund : '?'}`);
  ok(fd != null && fd >= 0, `${n}벌 공제가 음수가 아니다`, String(fd));
}
{
  const q0 = quoteAt(200, { 동의기록: JSON.stringify({ 시착: { 벌수: 0 } }) });
  const q5 = quoteAt(200, { 동의기록: JSON.stringify({ 시착: { 벌수: 5 } }) });
  ok(Number(q5.fitDeduct || 0) >= Number(q0.fitDeduct || 0), '시착을 더 했으면 공제가 줄지 않는다', `0벌=${q0.fitDeduct} 5벌=${q5.fitDeduct}`);
}

console.log('\n[예식일이 비었을 때 — 계산이 터지지 않는가]');
{
  const q = quoteAt(100, { 예식일: '' });
  ok(!(q && q.err), '예식일이 비어도 오류를 던지지 않는다', q && q.err);
  if (q && !q.err) ok(q.refund == null || Number(q.refund) >= 0, '그 경우에도 음수 환불이 나오지 않는다', String(q && q.refund));
}

console.log(`\n결과 — ${fail ? ('문제 ' + fail + '건') : '문제 0건'}`);
process.exit(fail ? 1 : 0);
