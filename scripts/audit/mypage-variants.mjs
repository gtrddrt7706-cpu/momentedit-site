// 마이페이지 — 폭별 변형 + 속화면(다이닝 추천·좌석) 캡처 [MYPAGE_VARIANTS]
//   ★GAS 응답을 가로채 더미 한 건으로만 그린다. 실고객 데이터 금지.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_variants');
const PORT = 8245;

const STATE = {
  ok: true, name: '김희준 · 이미쿠', groom: '김희준', bride: '이미쿠', product: '시그니처',
  stage: '제작중', stageList: ['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달','후기'],
  stageIndex: 6, isException: false,
  nextAction: '청첩장에 넣을 문구를 골라 주세요.', code: 'QQ63CW', kakao: '',
  consult: { date: '2026-06-20', time: '14:00' }, fitting: { status: '동의완료' }, contractInfo: null,
  contract: { signed: true, expired: false, link: 'https://example.com/c', fill: { weddingDate: '2026-10-26' } },
  payment: { confirmed: true, midConfirmed: true, balConfirmed: false, bundle: [] },
  midpayment: { confirmed: true, dday: 149, amount: 1320000 },
  balance: { confirmed: false, dday: 9, amount: 1650000, extra: null },
  production: { base: { groomKo: '김희준', weddingDate: '2026-10-26', headcount: 24 }, tracks: {} },
  invitation: { status: '' }, result: null, coupon: null, ledger: null, refund: null,
  change: null, hold: null, refundBank: null, payPolicy: { balanceDays: 9, midDays: 149 }, waiting: '',
};

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1400));
const eng = await launchBrowser();
if (!eng) { console.error('브라우저 없음'); server.kill(); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

async function open(w) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: w, height: 1100 } });
  await page.route('**script.google.com**', async (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
    const body = b.action === 'getMyState' ? STATE
               : b.action === 'autologin' ? { ok: true, token: 'SHOT' } : { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  });
  await page.goto(`http://localhost:${PORT}/mypage.html?token=SHOT`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3200);
  return page;
}

for (const w of [430, 560, 760, 900]) {
  const page = await open(w);
  const t = (await page.evaluate(() => document.body.innerText || '')).trim();
  const bad = ['25명', '25 Guests', '스물다섯'].filter(k => t.includes(k));
  console.log(`  [전체] 폭 ${w} — 로그인아님:${!t.includes('개인코드 (6자)') ? '✅' : '❌'} 준비줄:${t.includes('청첩장') ? '✅' : '❌'} 어긋남:${bad.join(' ') || '없음'}`);
  await page.screenshot({ path: path.join(OUT, `mypage_전체__${w}.png`), fullPage: true });
  await page.close();
}

// 속화면 — 다이닝 추천(애프터 웨딩) · 좌석·음료
for (const [key, label, fn] of [['dining', '다이닝추천', "mp_diningStart"], ['final', '좌석음료', "mp_finalStart"]]) {
  for (const w of [560, 760]) {
    const page = await open(w);
    const clicked = await page.evaluate((id) => { const b = document.getElementById(id); if (!b) return false; b.click(); return true; }, fn);
    await page.waitForTimeout(2600);
    const t = (await page.evaluate(() => document.body.innerText || '')).trim();
    console.log(`  [${label}] 폭 ${w} — 버튼:${clicked ? '✅' : '❌'} 글자 ${t.length}자 · ${t.slice(0, 80).replace(/\s+/g, ' ')}`);
    await page.screenshot({ path: path.join(OUT, `mypage_${label}__${w}.png`), fullPage: true });
    await page.close();
  }
}
await eng.close(); server.kill();
process.exit(0);
