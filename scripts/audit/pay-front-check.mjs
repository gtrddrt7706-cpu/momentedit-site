/**
 * 카드결제 프론트(meCardPay) 실코드 시뮬레이션 — mypage.html에서 IIFE를 그대로 추출해
 * 크롬(puppeteer)에서 실행. api()/getToken()/mpAlert() 등은 스텁, 로직은 100% 실제 코드.
 * 실행: node scripts/audit/pay-front-check.mjs   (puppeteer 없으면 조용히 스킵)
 *
 * 검증: A 플래그 ON → 3개 마일스톤 버튼 부착(라벨·data-m·'또는' 래퍼)
 *       B 재렌더(afterRender 재호출) → 중복 부착 없음
 *       C 플래그 OFF → 버튼 0 + config 호출 1회만(페이지당 1회 가드)
 *       D 토스 성공 복귀(?me_pay=1&m=..&paymentKey=..) → cardConfirm 호출(milestone=URL m) + 성공 알림 + loadMyState + URL 정리
 *       E 취소 복귀(?me_pay=0) → 취소 알림 · confirm 미호출
 *       F m 파라미터 없이 복귀(sessionStorage 폴백) → cardConfirm 호출
 */
import fs from 'fs';
import path from 'path';
import os from 'os';
import { fileURLToPath } from 'url';

let puppeteer;
try { puppeteer = (await import('puppeteer')).default; }
catch { console.log('puppeteer 없음 — 프론트 결제 점검 건너뜀(npm i puppeteer).'); process.exit(0); }

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const html = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');

// meCardPay IIFE 원문 추출
const start = html.indexOf('var meCardPay = (function(){');
if (start === -1) { console.error('meCardPay 못 찾음'); process.exit(1); }
const endMark = '})();';
const end = html.indexOf(endMark, start);
const src = html.slice(start, end + endMark.length);

// 테스트 페이지 — 스텁 + 결제카드 앵커 3개(실 렌더와 같은 배치: cc-actions 안 버튼)
const page = `<!doctype html><html><head><meta charset="utf-8"></head><body>
<div class="cc-actions" id="wrapPay"><button id="mp_paySignal">입금 완료</button><div class="cc-note">노트</div></div>
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
function mpAlert(m){ window.__alerts.push(m); }
function loadMyState(){ window.__loadMyState++; }
function api(body){ window.__apiCalls.push(body); return Promise.resolve(body.action==='cardConfirm' ? window.__confirmRes : window.__cfg); }
${src}
window.meCardPay = meCardPay;
</script></body></html>`;

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'payfront-'));
const file = path.join(tmp, 'test.html');
fs.writeFileSync(file, page);

const browser = await puppeteer.launch({ executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || '/opt/pw-browsers/chromium', args: ['--no-sandbox'] })
  .catch(() => puppeteer.launch({ args: ['--no-sandbox'] }));

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
    btns: [...document.querySelectorAll('.me-card-pay')].map(b => ({ m: b.getAttribute('data-m'), t: b.textContent })),
    ors: document.querySelectorAll('.me-pay-or').length,
    orText: document.querySelector('.me-pay-or') && document.querySelector('.me-pay-or').textContent
  }));
  check('A1 버튼 3개(계약금·중도금·잔금) 부착', a.btns.length === 3 && ['계약금','중도금','잔금'].every(m => a.btns.some(b => b.m === m)), JSON.stringify(a.btns));
  check('A2 라벨 = 카드로 결제 (250,000원)', a.btns.every(b => b.t === '카드로 결제 (250,000원)'), JSON.stringify(a.btns.map(b=>b.t)));
  check('A3 \'또는\' 래퍼 3개', a.ors === 3 && a.orText === '또는');
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
  check('D2 성공 알림 + 상태 새로고침', d.alerts.some(a => /결제가 완료/.test(a)) && d.lms === 1, JSON.stringify(d.alerts));
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

await browser.close();
fs.rmSync(tmp, { recursive: true, force: true });
console.log('\nPASS ' + pass + ' · FAIL ' + fail);
process.exit(fail ? 1 : 0);
