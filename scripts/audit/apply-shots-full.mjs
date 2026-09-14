// 신청서 첨부 사진 — «화면 전체»로 다시 찍는다 [APPLY_SHOTS_FULL]
//   대표 지시(2026-09-14): *「사진을 좀더 전체적으로 캡쳐해서 볼수있게 했으면좋겠는데
//   심사위원 입장에서 플러스가될수있게」*
//
//   ★종전 apply-shots.mjs 는 «문장을 받치는 가장 작은 요소»를 찍었다. 근거로는 맞지만
//     심사위원에게는 조각으로 보인다 — 어느 화면의 어디인지 모르는 잘린 상자다.
//     이 판은 반대로 «그 문장이 들어 있는 화면 전체»를 찍는다. 맥락이 함께 보여야
//     「진짜 돌아가는 제품이구나」가 된다. 사진은 채점 대상이 아니라 이해를 돕는 자료이므로
//     (운영기관 2026-09-10) 점수용 도표가 아니라 «실물»로 값을 낸다.
//   ★[SHOT_BLANK] 는 그대로 — reveal 을 열고, 찍은 뒤 빈 그림 검사를 돌리고, 눈으로 본다.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_apply_full');
const PORT = 8237;
const W = 900;                      // 모바일 조각보다 넓게 — 한 장에 맥락이 들어온다

let fail = 0;
const ok = (c, l, d) => { if (c) console.log('  ✅ ' + l); else { fail++; console.log('  ❌ ' + l + (d ? ' — ' + d : '')); } };
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });

async function unveil(page) {
  await page.evaluate(async () => {
    document.querySelectorAll('.reveal').forEach(e => e.classList.add('visible', 'revealed'));
    document.querySelectorAll('[loading="lazy"]').forEach(e => e.setAttribute('loading', 'eager'));
    document.querySelectorAll('img[data-src]').forEach(e => { e.src = e.dataset.src; });
    for (let y = 0; y < document.body.scrollHeight; y += 600) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
    window.scrollTo(0, 0);
  });
  await page.waitForTimeout(1200);
  try { await page.evaluate(() => Promise.all(Array.from(document.images).filter(i => !i.complete).map(i => new Promise(r => { i.onload = i.onerror = r; })))); } catch {}
}

/* 문장이 들어 있는 «섹션»을 찾는다 — 조각이 아니라 section/article 단위 */
async function findSection(page, needles) {
  return page.evaluate(({ needles }) => {
    const all = Array.from(document.querySelectorAll('section,article,main>div,.section'));
    const hit = all.filter(e => { const t = e.textContent || ''; return needles.every(n => t.includes(n)); })
                   .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
    if (!hit) return null;
    if (!hit.id) hit.id = 'full-' + Math.abs(needles.join('').length * 7919 % 99999);
    hit.scrollIntoView({ block: 'center' });
    return { sel: '#' + hit.id, h: hit.getBoundingClientRect().height,
             text: (hit.textContent || '').trim().slice(0, 60).replace(/\s+/g, ' ') };
  }, { needles });
}

/* ★[SHOT_CONFLICT 2026-09-14] 찍은 화면이 신청서와 다른 말을 하면 빨강.
   신청서 Q3-2 는 「서른 분 모두 앉아서 식을 보실 수 있게」라고 네 번 적는데
   홈페이지는 아직 「25명 착석 + 스탠딩 5」다(대표가 정한 변경이 사이트에 안 내려왔다).
   그 화면을 첨부하면 «신청서와 사진이 서로 다른 말을 하는» 상태가 된다.
   사진은 이해를 돕는 자료인데, 어긋나면 오히려 의심을 만든다. 그래서 붙이기 전에 센다. */
const CONFLICT = ['25명', '25 Guests', '스물다섯'];
async function conflictCheck(page, sel, label) {
  const t = sel ? await page.$eval(sel, e => e.textContent || '').catch(() => '')
                : await page.evaluate(() => document.body.innerText || '');
  const hit = CONFLICT.filter(k => t.includes(k));
  if (hit.length) { fail++; console.log('  ⛔ ' + label + ' — 신청서와 어긋나는 표기가 찍힌다: ' + hit.join(' · ') + ' (신청서는 「서른 분」)'); return false; }
  console.log('  ✅ 신청서와 어긋나는 인원 표기 없음 — ' + label);
  return true;
}

async function snap(page, sel, name, label) {
  try {
    const el = sel === null ? null : await page.$(sel);
    const p = path.join(OUT, name);
    if (el) { await el.scrollIntoViewIfNeeded().catch(() => {}); await page.waitForTimeout(400); await el.screenshot({ path: p }); }
    else { await page.screenshot({ path: p, fullPage: true }); }
    const kb = Math.round(fs.statSync(p).size / 1024);
    console.log('  📸 ' + name + '  (' + label + ') ' + kb + 'KB');
  } catch (e) { fail++; console.log('  ❌ ' + label + ' — ' + e.message); }
}

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

async function main() {
  await new Promise(r => setTimeout(r, 1500));
  fs.rmSync(OUT, { recursive: true, force: true });
  fs.mkdirSync(OUT, { recursive: true });
  const eng = await launchBrowser();
  if (!eng) { console.log('브라우저 엔진 없음'); return; }

  // ── index.html — 가격 · 환불 · 포함사항
  const { page } = await eng.newPage({ port: PORT, viewport: { width: W, height: 1400 } });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle' }).catch(() => {});
  await page.waitForTimeout(800);
  await unveil(page);

  console.log('\n[Q2] 가격 섹션 전체');
  const price = await findSection(page, ['330', '250']);
  ok(!!price, '가격 섹션', price && `${price.text} / 높이 ${Math.round(price.h)}px`);
  if (price && await conflictCheck(page, price.sel, '가격 섹션')) await snap(page, price.sel, '01_Q2_가격_섹션전체.png', '주말 330만·평일 250만이 상품 카드와 함께');

  console.log('\n[Q3-1] FAQ 전체 — 환불·결제·포함사항이 한 장에');
  await page.evaluate(() => { const t = document.getElementById('faqMoreToggle'); if (t) t.click(); });
  await page.waitForTimeout(600);
  await page.evaluate(() => document.querySelectorAll('.faq-item').forEach(i => {
    const a = i.querySelector('.faq-a'); if (a) { a.style.display = 'block'; a.style.maxHeight = 'none'; a.style.overflow = 'visible'; }
    i.classList.add('open', 'active');
  }));
  await page.waitForTimeout(700);
  const faq = await findSection(page, ['150일(5개월) 전까지']);
  ok(!!faq, 'FAQ 섹션(환불 조항 포함·전부 펼침)', faq && `${faq.text} / 높이 ${Math.round(faq.h)}px`);
  if (faq && await conflictCheck(page, faq.sel, 'FAQ 전체')) await snap(page, faq.sel, '02_Q3-1_FAQ_전체펼침.png', '환불·결제·원본 전체가 한 화면에');

  console.log('\n[Q3-1] 환불 조항 — 답 한 덩어리를 통째로');
  const ref = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('.faq-item'));
    const hit = all.filter(e => (e.textContent || '').includes('150일(5개월) 전까지'))[0];
    if (!hit) return null;
    let n = hit; for (let i = 0; i < 6 && n; i++) { n.style.display = 'block'; n.style.maxHeight = 'none'; n.style.overflow = 'visible'; n = n.parentElement; }
    hit.id = 'full-refund'; hit.scrollIntoView({ block: 'center' });
    return { sel: '#full-refund', text: (hit.textContent || '').trim().slice(0, 50).replace(/\s+/g, ' ') };
  });
  ok(!!ref, '환불 FAQ 한 덩어리', ref && ref.text);
  if (ref && await conflictCheck(page, ref.sel, '환불 FAQ')) await snap(page, ref.sel, '04_Q3-1_환불조항_답전체.png', '150일 전 전액 · 구간별 공제 · 몰취 없음');

  console.log('\n[Q2] 가격 — 카드 한 장 통째로');
  const card = await page.evaluate(() => {
    const all = Array.from(document.querySelectorAll('div,article,section,p,li'));
    const hit = all.filter(e => { const t = (e.textContent || '').replace(/\u00a0/g, ' '); return t.includes('250만') && t.includes('330만') && t.includes('All Included') && t.length < 600; })
                   .sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)[0];
    if (!hit) return null;
    hit.id = 'full-price'; hit.scrollIntoView({ block: 'center' });
    return { sel: '#full-price', text: (hit.textContent || '').trim().slice(0, 60).replace(/\s+/g, ' ') };
  });
  ok(!!card, '가격 카드', card && card.text);
  if (card && await conflictCheck(page, card.sel, '가격 카드')) await snap(page, card.sel, '05_Q2_가격카드.png', '평일 250만·주말 330만, 그 밖은 미리 밝힙니다');

  // ── 마이페이지 — 페이지 전체
  console.log('\n[Q3-1 · Q4-1] 마이페이지 전체 화면');
  const { page: mp } = await eng.newPage({ port: PORT, viewport: { width: W, height: 1400 } });
  await mp.route('**script.google.com**', async (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify(b.action === 'getMyState' ? STATE : b.action === 'autologin' ? { ok: true, token: 'SHOT' } : { ok: true }) });
  });
  await mp.goto(`http://localhost:${PORT}/mypage.html?token=SHOT`, { waitUntil: 'domcontentloaded' });
  await mp.waitForTimeout(3200);
  await unveil(mp);
  const t = await mp.evaluate(() => (document.body.innerText || '').slice(0, 400));
  ok(!t.includes('개인코드 (6자)'), '★로그인 화면이 아니다', t.slice(0, 70).replace(/\s+/g, ' '));
  ok(t.includes('청첩장'), '준비 줄이 그려졌다', t.slice(0, 90).replace(/\s+/g, ' '));
  await conflictCheck(mp, null, '마이페이지 전체');
  await snap(mp, null, '03_Q3-1_마이페이지_전체.png', '준비가 한 곳에서 끝난다 — 페이지 전체');
  await mp.close();
  await page.close();
  await eng.close();
  server.kill();

  console.log('\n[빈 그림 검사]');
  const r = spawn('python3', [path.join(HERE, 'shot-blank-check.py'), OUT], { stdio: 'inherit' });
  r.on('exit', (code) => process.exit(fail || code ? 1 : 0));
}
main().catch(e => { console.error(e); server.kill(); process.exit(1); });
