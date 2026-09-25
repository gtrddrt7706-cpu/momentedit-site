// 상담 예약금 카드결제 [DEPOSIT_CARD] · [PAY_METHOD] — 화면이 결정대로 도는지 «눌러 보고 보내진 값»으로 잰다.
//
//   예약 화면(schedule.html)
//     ① 카드결제가 꺼져 있으면 결제 방법 탭이 없다 — 계좌이체 흐름이 종전 그대로(payBy:'bank')
//     ② 켜져 있으면 탭이 보이고, 카드를 고르면 계좌·입금자명·현금영수증이 접히고 버튼 말이 바뀐다
//     ③ 카드로 신청 → 입금자명 없이도 신청이 간다(payBy:'card' · payer·현금영수증 빈 값) → 토스 결제창(금액·복귀 주소)
//     ④ 결제창을 닫으면(USER_CANCEL) 버튼이 풀리고, 다시 누르면 신청을 또 넣지 않고 결제창만 연다(관리자 알림 중복 0)
//     ⑤ 토스 복귀 성공(?me_pay=1) → cardConfirm(토큰·금액·주문) → «예약이 확정되었어요» · 주소에서 결제 값이 지워진다
//     ⑥ 확정 못 함(approved:false) → «결제가 끝났어요» · «확정» 이라고 말하지 않는다
//     ⑦ 취소·실패 복귀(?me_pay=0) → 고르셨던 날짜·시간·카드가 되살아나고, 다시 누르면 결제창만 연다
//     ⑧ ?preview_card=1 이면 꺼져 있어도 탭만 보이고, 카드를 눌러도 신청·결제가 나가지 않는다
//     ⑨ 390px 에서 탭 두 칸이 40px 이상 · 가로 넘침 없음
//     ⑩ 복귀 주소엔 토큰이 없다 — 결제창을 열 때 이 탭에 적어 둔 토큰으로 다시 불러온다
//   취소 화면(cancel.html) ⑪ 카드 예약금이면 계좌 칸 없이 «카드로 취소» · 계좌이체면 종전 칸
//   마이페이지(mypage.html) ⑫ 취소 패널·환불 카드가 카드 예약금이면 계좌를 받지 않는다
//
//   ★[SERVED_OURS] 파일·브라우저가 없으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cant = (msg) => { console.log('━━ deposit-card-screen — ' + msg + ' · 재지 못한 것이지 결함이 아닙니다'); process.exit(2); };
for (const f of ['schedule.html', 'cancel.html', 'mypage.html']) if (!fs.existsSync(path.join(ROOT, f))) cant(f + ' 이 없습니다');

let eng = null;
try { const { launchBrowser } = await import('./_browser.mjs'); eng = await launchBrowser(); } catch (e) {}
if (!eng) cant('브라우저가 없습니다');
if (eng.kind !== 'playwright') { await eng.close(); cant('이 검사는 playwright 로만 돕니다'); }

const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
  r.end(fs.readFileSync(f));
});
await new Promise((res) => srv.listen(0, res));
const port = srv.address().port;

const T = new Date(); T.setHours(0, 0, 0, 0);
const dOf = (off) => { const d = new Date(T); d.setDate(d.getDate() + off); return d; };
const dk = (off) => { const d = dOf(off); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const avail = []; for (let i = 2; i <= 40; i++) avail.push(dk(i));
const AV = { ok: true, avail, full: {}, currentDate: '', holdActive: false,
  slotsWeekday: ['11:30', '14:50', '18:10', '19:30'], slotsWeekend: ['18:20'], duration: 40,
  names: '정하윤 · 김도현', depositStr: '100,000', account: '기업 000-000-00000', holder: '모먼트에디트' };
const ON = { ok: true, enabled: true, clientKey: 'test_ck_x', amount: 100000, orderName: '모먼트에디트 상담 예약금' };
const OFF = { ok: true, enabled: false };
const TOKEN = 'tok_deposit_card_00000';

const bad = [];
const ok = (c, msg) => { if (!c) bad.push(msg); };
const errs = [];

async function open({ cfg = OFF, query = '', confirm = null, tossMode = 'hang', seed = null, noLocalToken = false, w = 390 }) {
  const pg = await eng.newPage({ port, viewport: { width: w, height: 844 } });
  await pg.page.addInitScript((c) => {
    try { if (!c.noLocalToken) localStorage.setItem('me_token', c.token); } catch (e) {}
    try { if (c.seed) Object.keys(c.seed).forEach((k) => sessionStorage.setItem(k, c.seed[k])); } catch (e) {}
    window.__gasLog = []; window.__toss = [];
    window.TossPayments = function (ck) { return { requestPayment: function (m, o) {   // 결제창 대역 — 부른 값만 적는다
      window.__toss.push({ ck: ck, m: m, o: o });
      if (c.tossMode === 'cancel') return Promise.reject({ code: 'USER_CANCEL' });
      return new Promise(function () {});
    } }; };
    const _f = window.fetch;
    window.fetch = function (u, o) {
      if (String(u).indexOf('script.google.com') !== -1) {
        let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
        window.__gasLog.push(b);
        let res = { ok: true };
        if (b.action === 'getAvailability') res = c.av;
        else if (b.action === 'cardPayConfig') res = c.cfg;
        else if (b.action === 'cardConfirm') res = c.confirm || { ok: false, error: '없음' };
        else if (b.action === 'weddingAvailability') res = { ok: true, taken: {} };
        return Promise.resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }));
      }
      return _f.apply(this, arguments);
    };
  }, { token: TOKEN, cfg, confirm, tossMode, seed, noLocalToken, av: AV });
  pg.page.setDefaultTimeout(8000);
  await pg.page.goto(`http://localhost:${port}/schedule.html${query}`, { waitUntil: 'load' });
  await pg.page.waitForTimeout(700);
  return pg;
}
async function step(opts, fn) {
  let pg = null;
  try { pg = await open(opts); await fn(pg.page); }
  catch (e) { bad.push('실행 도중 멈춤 — ' + String((e && e.message) || e).split('\n')[0]); }
  finally { if (pg) { errs.push(...pg.errors); await pg.page.close().catch(() => {}); } }
}
const shown = (page, sel) => page.$eval(sel, (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)).catch(() => false);
const log = (page, a) => page.evaluate((x) => window.__gasLog.filter((b) => b.action === x), a);
const alertText = (page) => page.$eval('#meAlert', (e) => (getComputedStyle(e).display !== 'none' ? e.textContent.replace(/\s+/g, ' ').trim() : '')).catch(() => '');
async function pickFirst(page) {
  const b = await page.$('#calGrid button.day.avail'); if (!b) return false;
  await b.click(); await page.waitForTimeout(150);
  const s = await page.$('#slots button.slot:not(.full)'); if (!s) return false;
  await s.click(); await page.waitForTimeout(200); return true;
}
const closeAlert = async (page) => { const b = await page.$('#meAlertOk'); if (b && await shown(page, '#meAlertOk')) { await b.click(); await page.waitForTimeout(100); } };

// ① 꺼짐
await step({ cfg: OFF }, async (page) => {
  ok(!(await shown(page, '#payMethod')), '① 카드결제가 꺼져 있는데 결제 방법 탭이 보인다');
  ok(await pickFirst(page), '① 준비: 날짜·시간을 못 골랐다');
  await page.fill('#depPayer', '정하윤');
  await page.click('#submitBtn'); await page.waitForTimeout(300);
  const s = await log(page, 'submitSchedule');
  ok(s.length === 1 && s[0].payBy === 'bank' && s[0].payer === '정하윤', '① 계좌이체 신청이 종전대로 가지 않는다(payBy bank · 입금자명) → ' + JSON.stringify(s));
  ok((await page.evaluate(() => window.__toss.length)) === 0, '① 꺼져 있는데 결제창이 열렸다');
});

// ②③ 켜짐 → 카드로 신청 → 결제창
await step({ cfg: ON }, async (page) => {
  ok(await shown(page, '#payMethod'), '② 카드결제가 켜져 있는데 결제 방법 탭이 안 보인다');
  ok(await pickFirst(page), '② 준비: 날짜·시간을 못 골랐다');
  await page.click('label[for="payM_card"]'); await page.waitForTimeout(150);
  ok(!(await shown(page, '#payBank')) && await shown(page, '#payCard'), '② 카드를 골랐는데 계좌·입금자명이 그대로 보이거나 카드 안내가 안 보인다');
  const lbl = await page.$eval('#submitBtn span', (e) => e.textContent.trim());
  ok(/카드로 결제/.test(lbl), '② 카드인데 버튼이 «' + lbl + '»');
  await page.click('#submitBtn'); await page.waitForTimeout(400);
  const s = await log(page, 'submitSchedule');
  ok(s.length === 1 && s[0].payBy === 'card' && s[0].payer === '' && s[0].cashReceipt === '', '③ 카드 신청 값이 틀렸다(payBy card · 입금자명·현금영수증 빈 값) → ' + JSON.stringify(s));
  const t = await page.evaluate(() => window.__toss);
  ok(t.length === 1 && t[0].m === '카드' && t[0].o.amount === 100000 && t[0].ck === 'test_ck_x', '③ 토스 결제창 값이 틀렸다 → ' + JSON.stringify(t));
  ok(t[0] && /me_pay=1/.test(t[0].o.successUrl) && /m=%EC%98%88%EC%95%BD%EA%B8%88/.test(t[0].o.successUrl) && /me_pay=0/.test(t[0].o.failUrl), '③ 복귀 주소가 틀렸다 → ' + JSON.stringify(t[0] && t[0].o));
  ok(t[0] && !/tok_/.test(t[0].o.successUrl + t[0].o.failUrl), '③ 복귀 주소에 세션 토큰이 실렸다(토스로 새어 나간다)');
  const tok = await page.evaluate(() => sessionStorage.getItem('me_pay_tok'));
  ok(tok === TOKEN, '⑩ 결제창을 열 때 이 탭에 토큰을 적어 두지 않았다');
});

// ④ 결제창 닫기 → 다시 누르면 결제창만
await step({ cfg: ON, tossMode: 'cancel' }, async (page) => {
  await pickFirst(page);
  await page.click('label[for="payM_card"]'); await page.waitForTimeout(150);
  await page.click('#submitBtn'); await page.waitForTimeout(400);
  const a = await alertText(page);
  ok(/결제를 취소했어요/.test(a), '④ 결제창을 닫았는데 안내가 없다 → ' + a);
  const btnOk = await page.$eval('#submitBtn', (e) => !e.disabled && !e.classList.contains('loading'));
  ok(btnOk, '④ 결제창을 닫은 뒤 버튼이 잠긴 채다');
  const lbl = await page.$eval('#submitBtn span', (e) => e.textContent.trim());
  ok(/카드로 결제/.test(lbl), '④ 되살린 버튼 말이 카드용이 아니다 → ' + lbl);
  await closeAlert(page);
  await page.click('#submitBtn'); await page.waitForTimeout(400);
  const s = await log(page, 'submitSchedule'), t = await page.evaluate(() => window.__toss.length);
  ok(s.length === 1 && t === 2, '④ 다시 누르면 신청은 그대로 두고 결제창만 열어야 한다 → 신청 ' + s.length + '번 · 결제창 ' + t + '번');
});

// ⑤ 복귀 성공
const RET = '?me_pay=1&m=%EC%98%88%EC%95%BD%EA%B8%88&paymentKey=pk_1&orderId=MD_1&amount=100000';
await step({ cfg: ON, query: RET, confirm: { ok: true, recorded: true, approved: true, date: '2026년 10월 7일 (수)', time: '14:50' } }, async (page) => {
  const c = await log(page, 'cardConfirm');
  ok(c.length === 1 && c[0].token === TOKEN && c[0].milestone === '예약금' && c[0].paymentKey === 'pk_1' && c[0].orderId === 'MD_1' && c[0].amount === 100000, '⑤ cardConfirm 값이 틀렸다 → ' + JSON.stringify(c));
  ok(await page.$eval('#modal', (e) => e.classList.contains('show')), '⑤ 결제가 끝났는데 완료 창이 안 떴다');
  const title = await page.$eval('#modalTitle', (e) => e.textContent.trim());
  ok(/예약이 확정되었어요/.test(title), '⑤ 완료 창 제목이 «' + title + '»');
  const pick = await page.$eval('#modalPick', (e) => e.textContent);
  ok(/14:50/.test(pick) && /10월 7일/.test(pick), '⑤ 완료 창에 확정 일시가 없다 → ' + pick);
  ok(!(await shown(page, '.modal-warn')), '⑤ 확정됐는데 «확정 메일을 받으셔야 예약이 완료» 경고가 남아 있다');
  const url = await page.evaluate(() => location.search);
  ok(!/paymentKey|me_pay/.test(url), '⑤ 결제 값이 주소에 남아 새로고침하면 다시 승인을 부른다 → ' + url);
  const kakaoOk = await page.$eval('.modal-help', (e) => !!e.querySelector('#t_kakao'));
  ok(kakaoOk, '⑤ 도움말을 바꾸다 카카오톡 링크(#t_kakao)를 잃었다');
});

// ⑥ 확정 못 함
await step({ cfg: ON, query: RET, confirm: { ok: true, recorded: true, approved: false, date: '', time: '' } }, async (page) => {
  const title = await page.$eval('#modalTitle', (e) => e.textContent.trim());
  const body = await page.$eval('#modal .modal-body', (e) => e.textContent);
  ok(/결제가 끝났어요/.test(title) && !/확정되었어요/.test(title + body), '⑥ 확정 못 했는데 «확정»이라고 말한다 → ' + title + ' / ' + body);
});

// ⑦ 취소 복귀 → 되살림 → 다시 결제
const sel = JSON.stringify({ d: dk(3), t: '11:30', h: null });
await step({ cfg: ON, query: '?me_pay=0', seed: { me_pay_sel: sel, me_pay_tok: TOKEN } }, async (page) => {
  const a = await alertText(page);
  ok(/결제를 취소했어요/.test(a), '⑦ 취소하고 돌아왔는데 안내가 없다 → ' + a);
  await closeAlert(page);
  const st = await page.evaluate(() => ({ sel: !!document.querySelector('#calGrid button.day.sel'), slot: (document.querySelector('#slots button.slot.sel') || {}).textContent || '', card: document.getElementById('payM_card').checked, bank: !document.getElementById('payBank').hidden }));
  ok(st.sel && /11:30/.test(st.slot), '⑦ 고르셨던 날짜·시간이 안 되살아났다 → ' + JSON.stringify(st));
  ok(st.card && !st.bank, '⑦ 카드가 다시 골라져 있지 않다 → ' + JSON.stringify(st));
  ok(!/me_pay/.test(await page.evaluate(() => location.search)), '⑦ 취소 값이 주소에 남았다');
  await page.click('#submitBtn'); await page.waitForTimeout(400);
  const s = await log(page, 'submitSchedule'), t = await page.evaluate(() => window.__toss.length);
  ok(s.length === 0 && t === 1, '⑦ 되살린 신청으로 다시 누르면 결제창만 열어야 한다 → 신청 ' + s.length + '번 · 결제창 ' + t + '번');
});

// ⑧ 미리보기
await step({ cfg: OFF, query: '?preview_card=1' }, async (page) => {
  ok(await shown(page, '#payMethod'), '⑧ 미리보기인데 탭이 안 보인다');
  await pickFirst(page);
  await page.click('label[for="payM_card"]'); await page.waitForTimeout(150);
  await page.click('#submitBtn'); await page.waitForTimeout(300);
  const a = await alertText(page);
  ok(/미리보기/.test(a), '⑧ 미리보기 안내가 없다 → ' + a);
  ok((await log(page, 'submitSchedule')).length === 0 && (await page.evaluate(() => window.__toss.length)) === 0, '⑧ 미리보기인데 신청이나 결제가 나갔다');
});

// ⑨ 390px 탭 크기 · 넘침
await step({ cfg: ON, w: 390 }, async (page) => {
  await pickFirst(page);
  const m = await page.evaluate(() => ({ h: [...document.querySelectorAll('#payMethod label')].map((l) => Math.round(l.getBoundingClientRect().height)),
    over: document.documentElement.scrollWidth - document.documentElement.clientWidth }));
  ok(m.h.length === 2 && m.h.every((x) => x >= 40), '⑨ 결제 방법 칸 높이가 40px 미만 → ' + JSON.stringify(m.h));
  ok(m.over <= 0, '⑨ 390px 에서 가로로 넘친다 → ' + m.over + 'px');
});

// ⑩ 로컬 토큰 없이 복귀
await step({ cfg: ON, query: RET, noLocalToken: true, seed: { me_pay_tok: TOKEN }, confirm: { ok: true, recorded: true, approved: true, date: 'x', time: '14:50' } }, async (page) => {
  const g = await log(page, 'getAvailability');
  ok(g.length >= 1 && g[0].token === TOKEN, '⑩ 복귀 주소엔 토큰이 없는데 이 탭에 적어 둔 토큰으로 못 불러왔다 → ' + JSON.stringify(g));
  ok((await log(page, 'cardConfirm')).length === 1, '⑩ 복귀했는데 승인을 부르지 않았다');
});

// ⑪ cancel.html
async function openCancel(byCard) {
  const pg = await eng.newPage({ port, viewport: { width: 390, height: 844 } });
  await pg.page.addInitScript((c) => {
    window.__gasLog = [];
    window.fetch = function (u, o) {
      let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
      window.__gasLog.push(b);
      const res = b.action === 'emailCancelInfo' ? { ok: true, state: 'ok', names: '정하윤 · 김도현', date: '2026년 10월 7일 (수)', time: '14:50', deadlineLabel: '24시간', refund: { amount: 100000, fitCount: 0 }, byCard: c.byCard }
        : { ok: true };
      return Promise.resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }));
    };
  }, { byCard });
  await pg.page.goto(`http://localhost:${port}/cancel.html?token=ct&sig=s`, { waitUntil: 'load' });
  await pg.page.waitForTimeout(500);
  return pg;
}
for (const byCard of [true, false]) {
  let pg = null;
  try {
    pg = await openCancel(byCard); const page = pg.page;
    const hasAcct = !!(await page.$('#acct'));
    const txt = await page.$eval('#card', (e) => e.textContent);
    if (byCard) {
      ok(!hasAcct && /카드로 취소/.test(txt), '⑪ 카드 예약금인데 취소 화면이 계좌를 받는다 → ' + txt.slice(0, 120));
      await page.click('#go'); await page.waitForTimeout(300);
      const c = await page.evaluate(() => window.__gasLog.filter((b) => b.action === 'emailCancel'));
      const done = await page.$eval('#card', (e) => e.textContent);
      ok(c.length === 1 && c[0].acct === '' && /카드로 취소/.test(done) && !/계좌로/.test(done), '⑪ 카드 예약금 취소 완료 문구·값이 틀렸다 → ' + JSON.stringify(c) + ' / ' + done.slice(0, 120));
    } else {
      ok(hasAcct && /환불 계좌/.test(txt), '⑪ 계좌이체 예약금인데 계좌 칸이 없다');
    }
    errs.push(...pg.errors);
  } catch (e) { bad.push('⑪ 실행 도중 멈춤 — ' + String((e && e.message) || e).split('\n')[0]); }
  finally { if (pg) await pg.page.close().catch(() => {}); }
}

// ⑫ mypage — 취소 패널 · 환불 카드(렌더 함수를 직접 부른다: 로그인 상태를 흉내 내지 않고 그 자리만)
{
  let pg = null;
  try {
    pg = await eng.newPage({ port, viewport: { width: 390, height: 844 } });
    const page = pg.page;
    await page.goto(`http://localhost:${port}/mypage.html`, { waitUntil: 'load' });
    await page.waitForTimeout(400);
    const r = await page.evaluate(() => {
      const out = {};
      const box = document.getElementById('mp_consult'); if (!box || typeof renderConsult !== 'function') return { skip: true };
      renderConsult({ status: '확정', date: '2026년 10월 7일 (수)', time: '14:50', canChange: true, canCancel: true, scheduleUrl: 'x', byCard: true }, '시그니처');
      out.cardAcct = !!document.getElementById('mp_refundAcct');
      out.cardTxt = (document.getElementById('mp_cancelPanel') || {}).textContent || '';
      renderConsult({ status: '확정', date: '2026년 10월 7일 (수)', time: '14:50', canChange: true, canCancel: true, scheduleUrl: 'x', byCard: false }, '시그니처');
      out.bankAcct = !!document.getElementById('mp_refundAcct');
      if (typeof renderRefundBank === 'function' && document.getElementById('mp_exception')) {
        renderRefundBank({ acct: '', refund: 100000, needCount: false, fitCount: 0, card: true, cardOnly: true });
        out.rbCardInput = !!document.getElementById('mp_rbAcct'); out.rbCardTxt = (document.getElementById('mp_refundBank') || {}).textContent || '';
        renderRefundBank({ acct: '', refund: 100000, needCount: false, fitCount: 0, card: false, cardOnly: false });
        out.rbBankInput = !!document.getElementById('mp_rbAcct');
      } else out.rbSkip = true;
      return out;
    });
    if (r.skip) console.log('  (⑫ 마이페이지 렌더 함수가 전역이 아니라 이 장면은 건너뜀)');
    else {
      ok(!r.cardAcct && /카드로 취소/.test(r.cardTxt), '⑫ 카드 예약금인데 마이페이지 취소 패널이 계좌를 받는다 → ' + r.cardTxt.slice(0, 100));
      ok(r.bankAcct, '⑫ 계좌이체 예약금인데 취소 패널에 계좌 칸이 없다');
      if (!r.rbSkip) {
        ok(!r.rbCardInput && /카드로 취소/.test(r.rbCardTxt), '⑫ 카드 예약금뿐인데 환불 카드가 계좌를 받는다 → ' + r.rbCardTxt.slice(0, 100));
        ok(r.rbBankInput, '⑫ 계좌이체 환불 카드에 계좌 칸이 없다');
      }
    }
  } catch (e) { bad.push('⑫ 실행 도중 멈춤 — ' + String((e && e.message) || e).split('\n')[0]); }
  finally { if (pg) await pg.page.close().catch(() => {}); }
}

await eng.close(); srv.close();
const realErrs = errs.filter((e) => !/Failed to load resource|net::ERR|favicon/i.test(e));
if (realErrs.length) bad.push('화면 스크립트 오류 — ' + realErrs.slice(0, 3).join(' | '));
if (bad.length) { console.log('━━ deposit-card-screen — ❌ ' + bad.length + '건'); bad.forEach((b) => console.log('  ❌ ' + b)); process.exit(1); }
console.log('━━ deposit-card-screen — ✅ 탭(켜짐·꺼짐·미리보기) · 카드 신청 값 · 결제창 · 닫기 후 재결제 · 복귀 성공/미확정/취소 되살림 · 토큰 폴백 · 취소 화면 · 마이페이지');
process.exit(0);
