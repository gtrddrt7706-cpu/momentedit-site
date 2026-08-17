/* ★[QUEUE_ONECLICK 2026-08-17 사용자 지시 "처리할일에 나오고 원클릭으로 팝업 안내가 나오고 진행을 클릭하면"]

   되돌림 정리 원클릭을 **진짜 화면에서 진짜로 눌러 본다.**
   rollback-redo(서버)가 못 보는 절반 — 큐에 버튼이 그려지는가 · 팝업이 뜨는가 · 진행이 서버를 부르는가.
   [PAID_STAGE_RESYNC] 가 «서버는 되는데 화면에 문이 없는» 사고였으므로, 화면 없는 검사는 절반이다.

   ① 갇힌 고객으로 진짜 adminHome() → 진짜 admin.html 홈에 그린다
   ② 처리할 일의 「단계 맞추기」 인라인 버튼을 실제 클릭 → 팝업 확인
   ③ 「진행」 클릭 → 서버로 adminConfirmPayment 가 나가는지 · 처리 후 토스트 확인
   ④ 대안 버튼(확인 취소) 클릭 → 되돌리기 미리보기 모달이 뜨는지(behind 라 서버가 허용해야 열린다)
   ⑤ 계약금은 취소됐고 중도금·잔금만 남은 경우 → 팝업이 «남은 확인 취소»로 갈아탄다

   사용: node scripts/audit/queue-oneclick.mjs
*/
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWorld, kstAgo } from './_gasworld.mjs';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const PORT = 8181;
const CODE = 'ME-TEST';
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 120)}`); if (!c) fail++; };

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const OLD = kstAgo(24 * 23);
const STUCK = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
  상품타입: '시그니처', 현재단계: '계약완료', 계약상태: '서명완료', 계약서명일시: OLD, 계약서발송일시: OLD,
  계약총액: 2500000, 예식일: '2026-10-28', 입금상태: '확인', 입금자명: '정희준',
  동의기록: JSON.stringify({ 계약: { at: OLD }, 영수증기준일: { 예약금: OLD } }), 처리이력: '' };
const LEFTOVER = Object.assign({}, STUCK, { 입금상태: '', 입금자명: '', 중도금상태: '확인', 중도금확인일시: OLD, 잔금상태: '확인', 잔금확인일시: OLD });
const BK = { 개인코드: CODE, 상태: '확정', 선택날짜: '2026-09-01', 선택시간: '14:50', 토큰: 'tk' };

let CUR = STUCK;
const CALLS = [];
function serverCall(p) {
  try {
    if (p.action !== 'adminCall') return { ok: true };
    CALLS.push(p.fn);
    world(Object.assign({}, CUR), Object.assign({}, BK));
    G.setCustomerStage = REAL;
    if (typeof G[p.fn] !== 'function') return { ok: false, error: '없는 함수: ' + p.fn };
    const r = G[p.fn].apply(null, p.args || []);
    return r === undefined ? { ok: true } : r;
  } catch (e) { return { ok: false, error: String((e && e.message) || e) }; }
}

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { srv.kill(); } catch {} });
await new Promise((r) => setTimeout(r, 1500));
const eng = await launchBrowser();
if (!eng) { console.log('브라우저 없음 — 건너뜀'); srv.kill(); process.exit(0); }
const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 430, height: 1400 } });
await page.route('**script.google.com**', async (route) => {
  let p = {}; try { p = JSON.parse(route.request().postData() || '{}'); } catch {}
  await route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(serverCall(p)) });
});
await page.addInitScript(() => { localStorage.setItem('me_admin_token', 'CHK'); });
await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil: 'domcontentloaded' });
await page.waitForTimeout(900);

console.log('[① 갇힌 고객 — 처리할 일에 원클릭 버튼]');
{
  const row = await page.evaluate(() => {
    const r = document.querySelector('.qrow[data-kind="단계정리"]');
    if (!r) return null;
    const b = r.querySelector('button[data-act]');
    return { sub: (r.querySelector('.qs') || {}).textContent || '', btn: b ? b.textContent.trim() : '', act: b ? b.getAttribute('data-act') : '' };
  });
  ok(!!row, '큐에 「단계정리」 행이 있다', JSON.stringify(row));
  ok(!!row && row.act === 'fixStage' && /단계 맞추기/.test(row.btn), '인라인 버튼 = 「단계 맞추기」(상세로 안 보내고 바로)', row && (row.btn + '/' + row.act));
  ok(!!row && /계약금 확인/.test(row.sub), '요약이 무엇이 확인됐는지 말한다', row && row.sub);
}

console.log('\n[②③ 버튼 클릭 → 팝업 → 진행 → 서버]');
{
  CALLS.length = 0;
  await page.click('.qrow[data-kind="단계정리"] button[data-act="fixStage"]');
  await page.waitForTimeout(500);
  const modal = await page.evaluate(() => ({
    open: document.getElementById('confirmModal').classList.contains('show'),
    title: (document.getElementById('cm_title') || {}).textContent || '',
    text: (document.getElementById('cm_text') || {}).textContent || '',
    yes: (document.getElementById('cm_yes') || {}).textContent || '',
    hasAlt: !!document.getElementById('fxUndo'),
  }));
  ok(modal.open && /되돌려진 단계를 정리/.test(modal.title), '팝업이 뜬다 · 제목이 상황을 말한다', modal.title);
  ok(/단계만 입금완료로 맞춰요/.test(modal.text) && /그대로예요/.test(modal.text), '안내가 «무엇이 보존되는지»를 말한다', modal.text.slice(0, 80));
  ok(/진행/.test(modal.yes), '주 버튼 = 「진행」', modal.yes);
  ok(modal.hasAlt, '대안(확인 취소) 버튼도 팝업 안에 있다');
  await page.click('#cm_yes');
  await page.waitForTimeout(700);
  ok(CALLS.indexOf('adminConfirmPayment') !== -1, '「진행」이 서버 adminConfirmPayment 를 부른다', CALLS.join(','));
  const t = await page.evaluate(() => (document.getElementById('toast') || {}).textContent || '');
  ok(/처리됨|단계/.test(t), '처리 토스트가 뜬다', t);
}

console.log('\n[④ 대안 — 확인 취소를 고르면 되돌리기 모달로(behind 허용 실증)]');
{
  await page.evaluate(() => { try { closeModal(); } catch (e) {} });
  await page.evaluate(() => loadHome());
  await page.waitForTimeout(600);
  await page.click('.qrow[data-kind="단계정리"] button[data-act="fixStage"]');
  await page.waitForTimeout(500);
  await page.click('#fxUndo');
  await page.waitForTimeout(700);
  const m2 = await page.evaluate(() => ({
    title: (document.getElementById('cm_title') || {}).textContent || '',
    hasReason: !!document.getElementById('upR'),
    text: (document.getElementById('cm_text') || {}).textContent || '',
  }));
  ok(/입금 확인을 되돌릴까요/.test(m2.title), '되돌리기 미리보기 모달이 열린다(구버전은 «되돌릴 수 없어요»)', m2.title);
  ok(m2.hasReason, '사유 입력칸이 있다(금전 기록 — 처리이력에 남긴다)');
  ok(!/진행된 고객이에요/.test(m2.text), '«이미 진행된» 거짓 차단 문구가 없다', m2.text.slice(0, 80));
}

console.log('\n[⑤ 계약금은 취소됐고 중도금·잔금만 남은 잔재 — 팝업이 갈래를 바꾼다]');
{
  CUR = LEFTOVER;
  await page.evaluate(() => { try { closeModal(); } catch (e) {} });
  await page.evaluate(() => loadHome());
  await page.waitForTimeout(600);
  const row = await page.evaluate(() => {
    const r = document.querySelector('.qrow[data-kind="단계정리"]');
    return r ? { sub: (r.querySelector('.qs') || {}).textContent || '' } : null;
  });
  ok(!!row && /중도금·잔금 확인/.test(row.sub), '큐가 남은 것(중도금·잔금)을 이름 부른다', row && row.sub);
  await page.click('.qrow[data-kind="단계정리"] button[data-act="fixStage"]');
  await page.waitForTimeout(600);
  const m3 = await page.evaluate(() => ({
    title: (document.getElementById('cm_title') || {}).textContent || '',
    yes: (document.getElementById('cm_yes') || {}).textContent || '',
    text: (document.getElementById('cm_text') || {}).textContent || '',
  }));
  ok(/남은 입금 확인을 정리/.test(m3.title), '팝업이 «남은 확인 취소» 갈래로 뜬다', m3.title);
  ok(/중도금·잔금 확인 취소/.test(m3.yes), '주 버튼이 남은 항목을 정확히 가리킨다', m3.yes);
  ok(/계약금은 이미 취소됐는데/.test(m3.text), '왜 단계 맞추기가 아닌지(계약금 미확인)를 설명한다', m3.text.slice(0, 90));
}

ok((errors || []).length === 0, '브라우저 콘솔 오류 0건', String((errors || []).length));
console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
await eng.close?.(); srv.kill();
process.exit(fail ? 1 : 0);
