/* [PAID_STAGE_BACK 2026-08-16 사용자 제보 "강제로 돌렸는데 입금단계에서 아무것도 고객화면에 안나오는걸 확인"]
   관리자가 **단계를 강제로 되돌렸을 때** 고객 화면이 백지가 되거나 앞뒤가 안 맞는 말을 하지 않는지.

   되돌리기는 실무에서 쓰는 기능이고, 입금 기록은 일부러 남긴다(ROLLBACK_KEEP_PAID · 돈은 지우지 않는다).
   그래서 «단계는 입금 전인데 입금은 확인됨» 같은 조합이 실제로 만들어진다 — 그 조합에서
   화면이 무엇을 말하는지가 이 검사의 주제다.

   지키는 불변식 둘:
     ①[백지 금지] 보이는 카드가 하나도 없으면, NOW 라도 지금 상태를 설명해야 한다.
     ②[내라면 낼 곳] NOW 나 카드가 «입금해 주세요»라고 말하면, 같은 화면에 낼 수단
        (계좌 또는 '입금했어요' 버튼)이 있어야 한다. 내라는데 낼 곳이 없는 화면을 만들지 않는다.

   사용: node scripts/audit/stage-back.mjs
*/
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8157;
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const eng = await launchBrowser();
if (!eng) { console.log('stage-back 건너뜀 — 브라우저 없음.'); process.exit(0); }
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const PAY_CONFIRMED = {
  status: '확인', confirmed: true, payerName: '정희준',
  amounts: { 계약금: 2500000, 예약금: 100000, 납부액: 2400000, 중도금: 1000000, 잔금: 1250000, 잔금시점: '예식 9일 전' },
  account: '000-0000-0000', holder: '모먼트에딧',
};
const PAY_WAITING = Object.assign({}, PAY_CONFIRMED, { status: '대기', confirmed: false });

try {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 900 } });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 900));

  const look = (d) => page.evaluate(async (d) => {
    try { renderMyPage(d); } catch (e) { return { err: e.message }; }
    await new Promise((r) => setTimeout(r, 250));
    const vis = (el) => !!(el && getComputedStyle(el).display !== 'none' && el.textContent.trim());
    const cards = ['mp_hold','mp_consult','mp_fitting','mp_contract','mp_payment','mp_midpayment','mp_balance','mp_production','mp_result','mp_ledger']
      .filter((id) => vis(document.getElementById(id)));
    const nowEl = document.getElementById('mp_nowHead'), subEl = document.getElementById('mp_nowSub');
    const now = (nowEl ? nowEl.textContent : '').trim();
    const sub = (subEl && getComputedStyle(subEl).display !== 'none') ? subEl.textContent.trim() : '';
    const shown = cards.map((id) => document.getElementById(id).textContent).join(' ');
    return { cards, now, sub,
      asksPay: /입금해 주세요|입금해주세요/.test(now + ' ' + sub + ' ' + shown),
      canPay: !!document.getElementById('mp_paySignal') || /입금 계좌/.test(shown),
      body: (now + ' ' + sub + ' ' + shown).replace(/\s+/g, ' ').slice(0, 90) };
  }, d);

  const base = { names: '희준 · 미쿠', product: '시그니처' };
  const SIGNED = { signed: true, signedAt: '2026-07-25' };

  console.log('\n[단계를 되돌렸는데 입금 기록은 남은 조합]');
  for (const stage of ['계약완료', '상담완료', '입금완료']) {
    const r = await look(Object.assign({ stage, contract: SIGNED, payment: PAY_CONFIRMED }, base));
    ok(!r.err, `${stage} · 렌더 오류 없음`, r.err);
    ok(r.cards.length > 0 || !!r.now, `${stage} · 백지가 아니다(카드 또는 NOW 가 상황을 말한다) [PAID_STAGE_BACK]`, JSON.stringify(r.cards) + ' now=' + r.now);
    ok(!(r.asksPay && !r.canPay), `${stage} · «입금해 주세요»라고 하면 낼 곳이 있다`, r.body);
    if (stage === '계약완료') {
      ok(/확인됐어요/.test(r.now + ' ' + r.sub), '계약완료로 되돌렸을 때 «이미 확인됐다»고 말한다', r.now + ' / ' + r.sub);
      ok(/다시 입금하지 않으셔도/.test(r.body), '다시 내지 않아도 된다고 분명히 말한다', r.body);
    }
  }

  console.log('\n[정상 진행 — 종전 동작이 바뀌지 않았는가]');
  const norm = await look(Object.assign({ stage: '계약완료', contract: SIGNED, payment: PAY_WAITING }, base));
  ok(norm.asksPay && norm.canPay, '아직 안 낸 상태에서는 계좌·입금 버튼이 그대로 뜬다', norm.body);
  const done = await look(Object.assign({ stage: '입금완료', contract: SIGNED, payment: PAY_CONFIRMED }, base));
  ok(!/확인됐어요.*다시 입금/.test(done.body), '정상 진행(입금완료)에서는 되돌림 안내가 끼어들지 않는다', done.body);

  ok((errors || []).length === 0, '콘솔 오류 0건', String((errors || []).length));
  console.log(`\n결과 — ${fail ? ('실패 ' + fail + '건') : '실패 0건 (전부 통과)'}`);
} catch (e) { console.log('오류:', e.message); fail++; }
finally { await eng.close?.(); srv.kill(); }
process.exit(fail ? 1 : 0);
