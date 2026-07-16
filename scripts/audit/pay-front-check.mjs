/**
 * 카드결제 프론트(meCardPay) 실코드 시뮬레이션 — mypage.html에서 IIFE를 그대로 추출해
 * 크롬(puppeteer 또는 playwright)에서 실행. api()/getToken()/mpAlert() 등은 스텁, 로직은 100% 실제 코드.
 * 실행: node scripts/audit/pay-front-check.mjs   (puppeteer/playwright 둘 다 없으면 조용히 스킵)
 *
 * 검증: A 플래그 ON → 3개 마일스톤 버튼 부착(라벨 '카드로 결제'·data-m·aria-label 금액·'또는' 래퍼)
 *       B 재렌더(afterRender 재호출) → 중복 부착 없음
 *       C 플래그 OFF → 버튼 0 + config 호출 1회만(페이지당 1회 가드)
 *       D 토스 성공 복귀(?me_pay=1&m=..&paymentKey=..) → cardConfirm 호출(milestone=URL m) + 성공 알림 + loadMyState + URL 정리
 *       E 취소 복귀(?me_pay=0) → 취소 알림 · confirm 미호출
 *       F m 파라미터 없이 복귀(sessionStorage 폴백) → cardConfirm 호출
 *       G 묶음/combo(data-bundle·data-combo="1") → 해당 버튼엔 카드 미부착(금액 정합)
 *       H 미리보기(?preview_card=1) → api 0회로 버튼 부착 + 클릭 시 미리보기 알림(결제 없음)
 *       I 클릭 → '결제창 여는 중…' 비활성(더블탭 방지) · SDK 로드 실패 시 복구
 *       J requestPayment reject(USER_CANCEL·결제창 닫기) → 조용히 복구(영구잠금 없음)
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

let launch;
try { const pp = (await import('puppeteer')).default; launch = () => pp.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] }).catch(() => pp.launch({ args: ['--no-sandbox'] })); }
catch {
  try { const { chromium } = await import('playwright'); launch = () => chromium.launch(); }
  catch {
    try { const { chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs'); launch = () => chromium.launch(); }
    catch { console.log('puppeteer/playwright 없음 — 프론트 결제 점검 건너뜀.'); process.exit(0); }
  }
}

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');

// meCardPay IIFE 원문 추출 — 내부에 인라인 IIFE(`})();` 포함: PREVIEW)가 있어 줄 시작(`\n})();`)으로 닫는다
const start = html.indexOf('var meCardPay = (function(){');
if (start === -1) { console.error('meCardPay 못 찾음'); process.exit(1); }
const endMark = '\n})();';
const end = html.indexOf(endMark, start);
if (end === -1) { console.error('meCardPay 끝(\\n})();) 못 찾음'); process.exit(1); }
const src = html.slice(start, end + endMark.length);

// 테스트 페이지 — 스텁 + 결제카드 앵커 3개(실 렌더와 같은 배치: cc-actions 안 버튼)
const page = `<!doctype html><html><head><meta charset="utf-8"></head><body><main>
<div class="cc-actions" id="wrapPay"><button id="mp_paySignal">입금했어요</button><div class="cc-note">노트</div></div>
<div class="cc-actions" id="wrapMid"><button id="mp_mSignal">입금했어요</button></div>
<div class="cc-actions" id="wrapBal"><button id="mp_bSignal">입금했어요</button></div>
<script>
window.__apiCalls = [];
window.__alerts = [];
window.__loadMyState = 0;
window.__cfg = { ok:true, enabled:false };            // 시나리오별 교체
window.__confirmRes = { ok:true };
function $(id){ return document.getElementById(id); }
function getToken(){ return 'tok'; }
function fmtWon(n){ n=Number(n)||0; try{ return n.toLocaleString('ko-KR')+'원'; }catch(e){ return n+'원'; } }
function mpAlert(m){ window.__alerts.push(m && typeof m==='object' ? ((m.title||'')+' '+(m.body||'')) : String(m)); }
function loadMyState(){ window.__loadMyState++; }
function api(body){ window.__apiCalls.push(body); return Promise.resolve(body.action==='cardConfirm' ? window.__confirmRes : window.__cfg); }
${src}
window.meCardPay = meCardPay;
</script></main></body></html>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'payfront-'));
const file = path.join(tmp, 'test.html');
fs.writeFileSync(file, page);

const browser = await launch();

let pass = 0, fail = 0;
const check = (name, cond, detail) => {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; console.log('  FAIL ' + name + (detail ? '  →  ' + detail : '')); }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));

// ── A·B: 플래그 ON 부착 + 재렌더 중복 없음 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => { window.__cfg = { ok: true, enabled: true, clientKey: 'ck', amount: 250000, orderName: 'x' }; meCardPay.afterRender(); });
  await sleep(150);
  const a = await p.evaluate(() => ({
    btns: [...document.querySelectorAll('.me-card-pay')].map(b => ({ m: b.getAttribute('data-m'), t: b.textContent, aria: b.getAttribute('aria-label') })),
    ors: document.querySelectorAll('.me-pay-or').length,
    orText: document.querySelector('.me-pay-or') && document.querySelector('.me-pay-or').textContent
  }));
  check('A1 버튼 3개(계약금·중도금·잔금) 부착', a.btns.length === 3 && ['계약금','중도금','잔금'].every(m => a.btns.some(b => b.m === m)), JSON.stringify(a.btns));
  check('A2 라벨 = 카드로 결제(금액 없음·담백)', a.btns.every(b => b.t === '카드로 결제'), JSON.stringify(a.btns.map(b=>b.t)));
  check('A3 aria-label에 금액 유지(a11y)', a.btns.every(b => /250,000원/.test(b.aria||'')), JSON.stringify(a.btns.map(b=>b.aria)));
  check('A4 \'또는\' 래퍼 3개', a.ors === 3 && a.orText === '또는');
  await p.evaluate(() => meCardPay.afterRender());
  await sleep(150);
  const b = await p.evaluate(() => document.querySelectorAll('.me-card-pay').length);
  check('B1 재렌더에도 중복 부착 없음(3 유지)', b === 3, 'count=' + b);
  await p.close();
}

// ── C: 플래그 OFF → 버튼 0 · config 1회만 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => { window.__cfg = { ok: true, enabled: false }; meCardPay.afterRender(); meCardPay.afterRender(); });
  await sleep(150);
  const c = await p.evaluate(() => ({ btns: document.querySelectorAll('.me-card-pay').length, calls: window.__apiCalls.filter(x => x.action === 'cardPayConfig').length }));
  check('C1 OFF → 버튼 0', c.btns === 0);
  check('C2 OFF → config 호출 1회(재호출 가드)', c.calls === 1, 'calls=' + c.calls);
  await p.close();
}

// ── D: 성공 복귀(m=URL) → cardConfirm + 알림 + loadMyState + URL 정리 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file + '?me_pay=1&m=' + encodeURIComponent('계약금') + '&paymentKey=pk_1&orderId=ME1&amount=250000');
  await p.evaluate(() => { window.__confirmRes = { ok: true }; meCardPay.afterRender(); });
  await sleep(150);
  const d = await p.evaluate(() => ({
    confirm: window.__apiCalls.find(x => x.action === 'cardConfirm'),
    alerts: window.__alerts, lms: window.__loadMyState, search: location.search
  }));
  check('D1 cardConfirm 호출(milestone=계약금·paymentKey·amount 전달)', !!d.confirm && d.confirm.milestone === '계약금' && d.confirm.paymentKey === 'pk_1' && d.confirm.amount === 250000, JSON.stringify(d.confirm));
  check('D2 성공 알림(완료 모달) + 상태 새로고침', d.alerts.some(a => /결제가 완료/.test(a)) && d.lms === 1, JSON.stringify(d.alerts));
  check('D3 URL 쿼리 정리됨', d.search === '', d.search);
  await p.close();
}

// ── E: 취소 복귀 → 취소 알림 · confirm 미호출 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file + '?me_pay=0');
  await p.evaluate(() => meCardPay.afterRender());
  await sleep(150);
  const e = await p.evaluate(() => ({ confirm: window.__apiCalls.some(x => x.action === 'cardConfirm'), alerts: window.__alerts }));
  check('E1 취소 → confirm 미호출 + 취소 알림', !e.confirm && e.alerts.some(a => /취소/.test(a)), JSON.stringify(e.alerts));
  await p.close();
}

// ── F: m 없이 복귀 → sessionStorage 폴백 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file);
  const ssOk = await p.evaluate(() => { try { sessionStorage.setItem('me_pay_milestone', '잔금'); return true; } catch (e) { return false; } });
  if (ssOk) {
    await p.goto('file://' + file + '?me_pay=1&paymentKey=pk_2&orderId=ME2&amount=1750000');
    await p.evaluate(() => meCardPay.afterRender());
    await sleep(150);
    const f = await p.evaluate(() => window.__apiCalls.find(x => x.action === 'cardConfirm'));
    check('F1 URL m 없음 → sessionStorage 폴백으로 confirm(잔금)', !!f && f.milestone === '잔금', JSON.stringify(f));
  } else {
    console.log('  skip F1 (file:// sessionStorage 불가 환경)');
  }
  await p.close();
}

// ── G: 묶음/combo → 해당 마일스톤 카드 미부착(금액 정합) ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => {
    document.getElementById('mp_paySignal').setAttribute('data-bundle', '1');   // 계약금+중도금 묶음
    document.getElementById('mp_mSignal').setAttribute('data-combo', '1');      // 중도금+잔금 combo
    window.__cfg = { ok: true, enabled: true, clientKey: 'ck', amount: 250000 };
    meCardPay.afterRender();
  });
  await sleep(150);
  const g = await p.evaluate(() => [...document.querySelectorAll('.me-card-pay')].map(b => b.getAttribute('data-m')).sort());
  check('G1 묶음/combo도 카드 부착 — 계약금묶음·잔금·중도금잔금', g.length === 3 && g.join(',') === ['계약금묶음','잔금','중도금잔금'].sort().join(','), JSON.stringify(g));
  await p.close();
}

// ── H: 미리보기(?preview_card=1) → api 0회 부착 + 클릭 시 미리보기 알림 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file + '?preview_card=1');
  await p.evaluate(() => meCardPay.afterRender());
  await sleep(150);
  const h = await p.evaluate(() => {
    const btns = document.querySelectorAll('.me-card-pay');
    if (btns[0]) btns[0].click();
    return { count: btns.length, api: window.__apiCalls.length, alerts: window.__alerts };
  });
  check('H1 미리보기 → 서버 호출 0회로 3개 부착', h.count === 3 && h.api === 0, 'count=' + h.count + ' api=' + h.api);
  check('H2 클릭 → 미리보기 알림(결제 없음)', h.alerts.some(a => /미리보기/.test(a)), JSON.stringify(h.alerts));
  await p.close();
}

// ── I: 클릭 → 로딩 상태·더블탭 방지 + SDK 로드 실패 복구 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => { window.__cfg = { ok: true, enabled: true, clientKey: 'ck', amount: 250000 }; meCardPay.afterRender(); });
  await sleep(150);
  const i1 = await p.evaluate(() => {
    const b = document.querySelector('.me-card-pay');
    b.click();   // https 토스 SDK는 file://에서 로드 실패 → onerror 경로
    return { text: b.textContent, disabled: b.disabled };
  });
  check('I1 클릭 즉시 \'결제창 여는 중…\' 비활성(더블탭 방지)', i1.text === '결제창 여는 중…' && i1.disabled === true, JSON.stringify(i1));
  await sleep(700);   // SDK 로드 실패 대기
  const i2 = await p.evaluate(() => { const b = document.querySelector('.me-card-pay'); return { text: b.textContent, disabled: b.disabled, alerts: window.__alerts }; });
  check('I2 SDK 로드 실패 → 알림 + 버튼 복구', i2.text === '카드로 결제' && i2.disabled === false && i2.alerts.some(a => /결제 모듈/.test(a)), JSON.stringify(i2));
  await p.close();
}

// ── J: requestPayment reject(USER_CANCEL·결제창 닫기) → 조용히 복구 ──
{
  const p = await browser.newPage();
  await p.goto('file://' + file);
  await p.evaluate(() => {
    window.__cfg = { ok: true, enabled: true, clientKey: 'ck', amount: 250000 };
    // 토스 SDK 스텁 — 결제창 닫기(USER_CANCEL reject) 재현
    window.TossPayments = function(){ return { requestPayment: function(){ return Promise.reject({ code: 'USER_CANCEL', message: '취소' }); } }; };
    meCardPay.afterRender();
  });
  await sleep(150);
  await p.evaluate(() => { document.querySelector('.me-card-pay').click(); });
  await sleep(200);
  const j = await p.evaluate(() => { const b = document.querySelector('.me-card-pay'); return { text: b.textContent, disabled: b.disabled, alerts: window.__alerts }; });
  check('J1 결제창 닫기(USER_CANCEL) → 알림 없이 버튼 복구(영구잠금 없음)', j.text === '카드로 결제' && j.disabled === false && j.alerts.length === 0, JSON.stringify(j));
  // 다른 오류 reject → 알림 + 복구
  await p.evaluate(() => {
    window.TossPayments = function(){ return { requestPayment: function(){ return Promise.reject({ code: 'INVALID_CARD', message: 'x' }); } }; };
    document.querySelector('.me-card-pay').click();
  });
  await sleep(200);
  const j2 = await p.evaluate(() => { const b = document.querySelector('.me-card-pay'); return { text: b.textContent, disabled: b.disabled, alerts: window.__alerts }; });
  check('J2 기타 오류 reject → 안내 + 버튼 복구', j2.text === '카드로 결제' && j2.disabled === false && j2.alerts.some(a => /진행하지 못했어요/.test(a)), JSON.stringify(j2));
  await p.close();
}

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nPASS ' + pass + ' · FAIL ' + fail);
process.exit(fail ? 1 : 0);
