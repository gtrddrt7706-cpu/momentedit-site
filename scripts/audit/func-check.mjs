// 기능(버튼·폼·검증) 점검 — 실제 클릭/제출로 정상·실패 경로를 확인한다.
//   대상: inquiry.html 문의 폼(메인 전환 경로) — 빈 제출 차단 / 유효 제출→이메일확인→POST→성공화면 /
//         허니팟 payload 노출 / 비번 불일치·하객 상한 차단 / 전화 자동포맷 / 이중제출 멱등.
//   사용: node scripts/audit/func-check.mjs
//   puppeteer 없으면 통째로 건너뛴다(설치 안내). script.google.com은 목(mock) 응답.
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PORT = 8137;
const require = createRequire(import.meta.url);
let puppeteer = null;
for (const p of ['puppeteer', '/tmp/dz/node_modules/puppeteer']) { try { puppeteer = require(p); break; } catch {} }
if (!puppeteer) { console.log('puppeteer 없음 — 기능 점검 건너뜀(npm i puppeteer 또는 /tmp/dz 하네스).'); process.exit(0); }

const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: SITE, stdio: 'ignore' });
await new Promise(r => setTimeout(r, 800));
const browser = await puppeteer.launch({ args: ['--no-sandbox', '--ignore-certificate-errors'] });
let fails = [];
const ok = (c, m) => { if (!c) fails.push(m); console.log((c ? '  ok ' : '  ✗ ') + m); };

let lastPost = null;
async function fresh() {
  const page = await browser.newPage();
  page.on('pageerror', e => fails.push('PAGEERR ' + e.message));
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (/fonts\.|picsum|instagram|gstatic|google\.com\/(?!macros)/.test(u) && !u.includes('localhost')) return req.abort();
    if (u.includes('script.google.com')) { try { lastPost = JSON.parse(req.postData() || '{}'); } catch { lastPost = null; } return req.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ ok: true, code: 'ME-FUNC1' }) }); }
    req.continue();
  });
  await page.goto(`http://localhost:${PORT}/inquiry.html`, { waitUntil: 'networkidle0', timeout: 30000 });
  return page;
}
// 모든 필수 칸을 유효하게 채운다(필수 라디오 5+3종 포함). date_type=fixed면 날짜 채움.
async function fillValid(page) {
  await page.evaluate(() => {
    document.getElementById('groom').value = '김민준';
    document.getElementById('bride').value = '이하윤';
    document.getElementById('phone').value = '010-1234-5678';
    document.getElementById('email').value = 'test@example.com';
    const pick = (n, i) => { const e = document.querySelectorAll('input[name="' + n + '"]'); if (e[i]) e[i].checked = true; };
    ['referral', 'attire', 'priority', 'hesitation', 'stage', 'weekday', 'wedding_time', 'streaming'].forEach(n => pick(n, 0));
    const dt = document.querySelector('input[name="date_type"]'); if (dt) dt.checked = true;
    document.getElementById('guests').value = '20';
    document.getElementById('pw').value = 'abc123';
    document.getElementById('pw2').value = 'abc123';
    const pc = document.getElementById('privacyConsent'); if (pc) pc.checked = true;
    const dtc = document.querySelector('input[name="date_type"]:checked');
    if (dtc && dtc.value === 'fixed') { const df = document.getElementById('dateFixed'); if (df) df.value = '2027-05-15'; }
  });
}
const submit = (page) => page.evaluate(() => document.querySelector('form').requestSubmit());
const confirmYes = (page) => page.evaluate(() => { const b = [...document.querySelectorAll('button,a')].find(x => /맞습니다/.test(x.textContent)); if (b) b.click(); });

// T1 빈 폼 → 차단(POST 0)
{ lastPost = null; const page = await fresh(); await submit(page); await new Promise(r => setTimeout(r, 300));
  ok(lastPost === null, 'T1 빈 폼 제출 → 차단(POST 안 감)'); await page.close(); }

// T2 유효 폼 → 이메일확인 모달 → 맞습니다 → POST 페이로드 → 성공화면 코드
{ lastPost = null; const page = await fresh(); await fillValid(page); await submit(page); await new Promise(r => setTimeout(r, 350));
  const modal = await page.evaluate(() => document.body.innerText.includes('이메일을 확인'));
  ok(modal, 'T2a 유효 제출 → 이메일 확인 모달');
  await confirmYes(page); await new Promise(r => setTimeout(r, 400));
  ok(lastPost && lastPost.groom === '김민준' && lastPost.email === 'test@example.com', 'T2b POST 페이로드에 입력값');
  ok(await page.evaluate(() => document.body.innerText.includes('ME-FUNC1')), 'T2c 성공화면에 개인코드 표시');
  await page.close(); }

// T3 허니팟 채움 → payload에 실려 서버 판별 가능
{ lastPost = null; const page = await fresh(); await fillValid(page);
  await page.evaluate(() => { document.getElementById('hp_website').value = 'spam-bot'; });
  await submit(page); await new Promise(r => setTimeout(r, 250)); await confirmYes(page); await new Promise(r => setTimeout(r, 350));
  ok(lastPost && JSON.stringify(lastPost).includes('spam-bot'), 'T3 허니팟 값이 payload에 실림(서버 판별 가능)');
  await page.close(); }

// T4 비번 불일치 → 모달 안 뜸 + 인라인 에러
{ const page = await fresh(); await fillValid(page);
  await page.evaluate(() => { document.getElementById('pw2').value = 'different9'; });
  await submit(page); await new Promise(r => setTimeout(r, 250));
  const modal = await page.evaluate(() => document.body.innerText.includes('이메일을 확인'));
  const err = await page.evaluate(() => { const e = document.getElementById('pwError'); return e && getComputedStyle(e).display !== 'none'; });
  ok(!modal && err, 'T4 비번 불일치 → 차단(인라인 에러)');
  await page.close(); }

// T5 하객 31명(상한 30 초과) → 차단
{ const page = await fresh(); await fillValid(page);
  await page.evaluate(() => { document.getElementById('guests').value = '31'; });
  await submit(page); await new Promise(r => setTimeout(r, 250));
  ok(!(await page.evaluate(() => document.body.innerText.includes('이메일을 확인'))), 'T5 하객 31명 → 제출 차단');
  await page.close(); }

// T6 전화 자동 하이픈 포맷
{ const page = await fresh(); await page.focus('#phone'); await page.type('#phone', '01098765432');
  ok((await page.$eval('#phone', e => e.value)) === '010-9876-5432', 'T6 전화 자동 하이픈 포맷');
  await page.close(); }

// T7 이중 제출 멱등 — 확인 모달 '맞습니다' 연타 시 POST 1회(느린 응답 모사)
{ const page = await browser.newPage();
  page.on('pageerror', e => fails.push('PAGEERR ' + e.message));
  let posts = 0;
  await page.setRequestInterception(true);
  page.on('request', req => {
    const u = req.url();
    if (/fonts\.|picsum|instagram|gstatic|google\.com\/(?!macros)/.test(u) && !u.includes('localhost')) return req.abort();
    if (u.includes('script.google.com')) { posts++; return setTimeout(() => req.respond({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify({ ok: true, code: 'ME-FUNC1' }) }), 500); }
    req.continue();
  });
  await page.goto(`http://localhost:${PORT}/inquiry.html`, { waitUntil: 'networkidle0' });
  await fillValid(page); await submit(page); await new Promise(r => setTimeout(r, 300));
  await page.evaluate(() => { const b = [...document.querySelectorAll('button,a')].find(x => /맞습니다/.test(x.textContent)); if (b) { b.click(); b.click(); b.click(); } });
  await new Promise(r => setTimeout(r, 250));
  ok(posts === 1, 'T7 제출 버튼 연타 → POST 1회(멱등) (실제 ' + posts + '회)');
  await page.close(); }

await browser.close(); srv.kill();
console.log(fails.length ? ('\n기능 점검 실패 ' + fails.length + '건\n' + fails.join('\n')) : '\n기능 점검 — 정상·실패·멱등 경로 전부 통과');
process.exit(fails.length ? 1 : 0);
