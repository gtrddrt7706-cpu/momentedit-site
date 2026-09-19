// 신청서 첨부 사진 — 본문이 «주장하는 것»을 화면에서 그대로 찍는다 [APPLY_SHOTS]
//   폼 실측: 사진 첨부가 되는 문항은 Q2 · Q3-1 · Q4-1 셋(모두의창업_질문지_백지.md).
//   ★원칙 — 예쁜 화면이 아니라 «본문 문장의 근거»를 찍는다. 문장이 없으면 사진도 없다.
//
//   ★★[SHOT_BLANK 2026-09-14] 「요소를 찾았다」는 «내용이 찍혔다»가 아니다.
//     첫 판에서 선택자 검사는 전부 ✅였는데 실제 PNG 는 거의 흰 화면이었다.
//     index.html 은 `.reveal` → IntersectionObserver → `.visible` 로 그리고 이미지가 lazy 라,
//     화면에 들어오기 전에 찍으면 «빈 상자»가 나온다. 그래서 둘을 함께 한다:
//       ① 찍기 전에 reveal 을 전부 열고 lazy 이미지를 강제로 받는다
//       ② 찍은 뒤 blank-check.py 로 «색이 몇 가지인가»를 재서 빈 그림을 빨강으로 잡는다
//     검사만 믿지 않는다 — CLAUDE.md [NOT_THE_SOURCE] 「화면은 지표로 대신하지 않는다」.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_apply');
const PORT = 8231;

let fail = 0;
const shots = [];
const ok = (c, l, d) => { if (c) console.log('  ✅ ' + l); else { fail++; console.log('  ❌ ' + l + (d ? ' — ' + d : '')); } };

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });

/* 화면에 들어와야 그려지는 것을 전부 미리 연다 — 스크롤 애니메이션·lazy 이미지 */
async function unveil(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('visible', 'revealed'));
    document.querySelectorAll('[loading="lazy"]').forEach(e => e.setAttribute('loading', 'eager'));
    document.querySelectorAll('img[data-src]').forEach(e => { e.src = e.dataset.src; });
    window.scrollTo(0, document.body.scrollHeight);
    await new Promise(r => setTimeout(r, 400));
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(900);
  try { await page.evaluate(() => Promise.all(Array.from(document.images).filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })))); } catch {}
}

/* 문장으로 요소를 찾되 «가장 작은» 것을 고른다 — 페이지를 통째로 감싼 div 를 잡지 않게 */
async function findByText(page, needles, maxLen = 900) {
  return page.evaluate(({ needles, maxLen }) => {
    const all = Array.from(document.querySelectorAll('section,div,article,li,table'));
    const hit = all
      .filter(e => { const t = e.innerText || ''; return needles.every(n => t.includes(n)) && t.length <= maxLen && t.trim().length > 20; })
      .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
    if (!hit) return null;
    if (!hit.id) hit.id = 'shot-' + Math.abs(needles.join('').length * 7919 % 99999);
    hit.scrollIntoView({ block: 'center' });
    return { sel: '#' + hit.id, text: (hit.innerText || '').slice(0, 70).replace(/\s+/g, ' ') };
  }, { needles, maxLen });
}

async function snap(page, sel, name, label) {
  try {
    const el = await page.$(sel);
    if (!el) { ok(false, label, '요소 없음 ' + sel); return; }
    await el.scrollIntoViewIfNeeded().catch(() => {});
    await page.waitForTimeout(500);
    const p = path.join(OUT, name);
    await el.screenshot({ path: p });
    shots.push({ name, label });
    console.log('  📸 ' + name + '  (' + label + ')');
  } catch (e) { fail++; console.log('  ❌ ' + label + ' — ' + e.message); }
}

async function main() {
  await new Promise(r => setTimeout(r, 1500));
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const eng = await launchBrowser();
  if (!eng) { console.log('브라우저 엔진 없음'); return; }
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 430, height: 1200 } });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  await unveil(page);

  console.log('\n[Q2 배경] 우리가 무엇을 뒤집었나');
  const price = await findByText(page, ['330', '250'], 700);
  ok(!!price, '가격 블록', price && price.text);
  if (price) await snap(page, price.sel, 'Q2-1_가격공개.png', '주말 330만·평일 250만 계약 전 공개');

  console.log('\n[Q3-1 차별점] 본문 문장의 근거');
  await page.evaluate(() => { const t = document.getElementById('faqMoreToggle'); if (t) t.click(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('.faq-item').forEach(i => { const a = i.querySelector('.faq-a'); if (a) { a.style.display = 'block'; a.style.maxHeight = 'none'; } i.classList.add('open', 'active'); }));
  await page.waitForTimeout(500);

  const refund = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.faq-a-inner,.faq-item,div'));
    const hit = all.filter(e => (e.textContent || '').includes('150일(5개월) 전까지') && (e.textContent || '').length < 2400)
                   .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
    if (!hit) return null;
    let n = hit; for (let i = 0; i < 6 && n; i++) { n.style.display = 'block'; n.style.maxHeight = 'none'; n.style.overflow = 'visible'; n = n.parentElement; }
    if (!hit.id) hit.id = 'shot-refund';
    hit.scrollIntoView({ block: 'center' });
    return { sel: '#' + hit.id, text: (hit.textContent || '').slice(0, 60).replace(/\s+/g, ' ') };
  });
  ok(!!refund, '환불 조항', refund && refund.text);
  if (refund) await snap(page, refund.sel, 'Q3-1_환불조항.png', '150일 전 전액 · 구간별 공제(몰취 없음)');

  const pay = await findByText(page, ['중도금 40%', '잔금 50%'], 700);
  ok(!!pay, '결제 단계', pay && pay.text);
  if (pay) await snap(page, pay.sel, 'Q3-1_결제단계.png', '계약금 10% · 중도금 40%(D-149) · 잔금 50%(D-9)');

  const incl = await findByText(page, ['원본'], 900);
  ok(!!incl, '원본 전체 제공', incl && incl.text);
  if (incl) await snap(page, incl.sel, 'Q3-1_원본전체.png', '보정본만이 아니라 원본 전체');


  // ── 마이페이지 — 「한 곳에서 준비가 끝난다」의 실물 (Q3-1 2번 · 일곱 줄)
  console.log('\n[Q3-1 · Q4-1] 마이페이지 — 준비가 한 화면에서 끝난다');
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
    production: { base: { groomKo: '김희준', weddingDate: '2026-10-26' }, tracks: {} },
    invitation: { status: '' }, result: null, coupon: null, ledger: null, refund: null,
    change: null, hold: null, refundBank: null, payPolicy: { balanceDays: 9, midDays: 149 }, waiting: '',
  };
  const { page: mp } = await eng.newPage({ port: PORT, viewport: { width: 430, height: 1600 } });
  await mp.route('**script.google.com**', async (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(
        b.action === 'getMyState' ? STATE
        : b.action === 'autologin' ? { ok: true, token: 'SHOT' }
        : { ok: true }) });
  });
  await mp.goto(`http://localhost:${PORT}/mypage.html?token=SHOT`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(3000);
  await unveil(mp);
  const mpTxt = await mp.evaluate(() => (document.body.innerText || '').slice(0, 400));
  ok(!mpTxt.includes('개인코드 (6자)'), '★로그인 화면이 아니다(찍힌 것이 맞는 화면인가)', mpTxt.slice(0, 80).replace(/\s+/g, ' '));
  ok(mpTxt.includes('청첩장') || mpTxt.includes('식순') || mpTxt.includes('좌석'), '마이페이지 준비 줄이 그려졌다', mpTxt.slice(0, 90).replace(/\s+/g, ' '));
  const todo = await findByText(mp, ['청첩장'], 200);
  if (todo) await snap(mp, todo.sel, 'Q3-1_할일한문장.png', '진행 단계 이름 대신 할 일 한 문장');
  // 일곱 줄 — 준비 항목이 함께 보이는 넓은 영역
  const wide = await mp.evaluate(() => {
    const all = Array.from(document.querySelectorAll('section,div'));
    const hit = all.filter(e => { const t = e.innerText || ''; return t.includes('청첩장') && (t.includes('좌석') || t.includes('식순')) && t.length < 3000; })
                   .sort((a, b) => (a.innerText || '').length - (b.innerText || '').length)[0];
    if (!hit) return null;
    if (!hit.id) hit.id = 'shot-rows';
    hit.scrollIntoView({ block: 'center' });
    return { sel: '#' + hit.id, text: (hit.innerText || '').slice(0, 70).replace(/\s+/g, ' ') };
  });
  ok(!!wide, '준비 항목이 한 화면에 모여 있다', wide && wide.text);
  if (wide) await snap(mp, wide.sel, 'Q3-1_마이페이지_일곱줄.png', '청첩장·식순·식사·좌석·단체사진·하객안내·확인서 한 화면');
  else await snap(mp, 'body', 'Q3-1_마이페이지_전체.png', '마이페이지 전체');
  await mp.close();

  await page.close();
  await eng.close();
  server.kill();

  console.log('\n[빈 그림 검사] — 「요소를 찾았다」는 「내용이 찍혔다」가 아니다');
  const r = spawn('python3', [path.join(HERE, 'shot-blank-check.py'), OUT], { stdio: 'inherit' });
  r.on('exit', (code) => process.exit(fail || code ? 1 : 0));
}
main().catch(e => { console.error(e); server.kill(); process.exit(1); });
