/* 홈 JOURNEY 목업(폰 5장)용 캡처 — assets/journey/mp-*.png 를 실제 마이페이지 화면에서 다시 뽑는다.
 *
 *   node scripts/journey-shots.mjs            → scripts/_jr-shots/ 에 시안을 만든다(자산은 안 건드림)
 *   node scripts/journey-shots.mjs --apply    → assets/journey/ 에 바로 반영
 *
 * ★[JR_SHOT_SPEC] 규격은 .jr-screen 의 aspect-ratio: 9/19 에서 온다 —
 *   390 × 823.3 CSS px 를 DPR 2 로 찍어 780×1647. 기존 자산과 같은 비율이라 크롭이 0이다.
 *   (2026-07-31 커밋 「스크린 9:19 정합으로 캡처 크롭 0」이 세운 규격을 그대로 잇는다)
 *
 * ★왜 손으로 안 찍나 — 화면은 계속 바뀌는데 자산은 안 바뀐다. 7/31 자산과 9/6 화면 사이가
 *   한 달 넘게 벌어져, 그동안 생긴 기능(하객 사진·좌석 음료)이 홍보에 하나도 안 나오고 있었다.
 *   스크립트로 두면 다음엔 한 줄로 다시 뽑는다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './audit/_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const OUT = process.argv.includes('--apply') ? path.join(SITE, 'assets/journey') : path.join(HERE, '_jr-shots');
const PORT = 8137;
const W = 390, H = 823;                       // 9:19 → 390 × 823.3

const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const base = (stage, extra) => Object.assign({
  name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-SHOT',
  stage, stageIndex: SIG.indexOf(stage), stageList: SIG.slice(),
  nextAction: '다음 할 일을 안내해 드릴게요.',
  contract: { signed: true }, payment: { confirmed: true },
  weddingDate: '2026-10-26', result: null, production: null, isException: false,
}, extra || {});

/* 제작중 · «예식 준비» 허브.
   ★트랙을 «완료»로 채워 찍는다 — 빈 상태로 찍으면 전부 「시작하기」라 «할 일이 많다»로 읽힌다.
     이 목업의 임무는 «두 분이 다 쥐고 있다»를 보여 주는 것이라, ✓·「완료·수정」 쪽이 맞다. */
const PREP = base('제작중', {
  invitation: { status: '완료', draft: { method: 'both', designOnline: '05', designFamily: '05' }, published: { eventId: 'e', urls: {} } },
  production: {
    entered: true,
    base: { groomKo: '희준', brideKo: '미쿠', weddingDate: '2026-10-26', weddingTime: '13:20' },
    tracks: { invitation: '완료', dining: '완료', ritual: '완료', final: '완료', seat: '완료' },
    ritualDraft: { _v: 3, summary: { course: '담백', count: 7, min: '약 19분', flow: [] }, S: {} },
    diningDraft: { dining_on: 'Y', venue: '잔치연' },
    finalDraft: { headcount: '6', standing: 0, extraFee: 0, drink: '샴페인' },
  },
});

fs.mkdirSync(OUT, { recursive: true });
const eng = await launchBrowser();
if (!eng) { console.log('건너뜀 — playwright·puppeteer 미설치.'); process.exit(0); }
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

const shots = [];
try {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: W, height: H }, deviceScaleFactor: 2 });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 900));

  const snap = async (name, prep) => {
    await prep();
    await new Promise((r) => setTimeout(r, 450));
    const f = path.join(OUT, name + '.png');
    await page.screenshot({ path: f, fullPage: false });
    const b = fs.readFileSync(f);
    shots.push(`${name}.png  ${b.readUInt32BE(16)}x${b.readUInt32BE(20)}`);
  };

  /* 01 진행 현황 — 첫 화면(D-day·다음 할 일) */
  await snap('mp-now', () => page.evaluate((s) => { show('mypageView'); renderMyPage(s); window.scrollTo(0, 0); }, base('제작중')));

  /* ★후보 A — 예식 준비 허브. 「두 분이 직접 정합니다」를 체크 목록으로 증명한다 */
  await snap('cand-prep', () => page.evaluate((s) => {
    show('mypageView'); renderMyPage(s);
    /* 카드 «머리»가 화면 맨 위에 오게 — scrollIntoView 는 헤더에 가려 중간이 잘린다 */
    const el = document.getElementById('mp_production');
    if (el) window.scrollTo(0, el.getBoundingClientRect().top + window.scrollY - 10);
  }, PREP));

  /* ★후보 B — 좌석·음료. 자리를 눌러 하객 성함과 음료를 정하는 그 화면 */
  await snap('cand-seat', () => page.evaluate(() => {
    window._mpStateD = { production: { base: { weddingDate: '2026-10-26' }, tracks: {} } };
    show('mypageView');
    const el = document.getElementById('mp_production'); if (el) el.style.display = 'block';
    startSeatFlow(null, { headcount: '' }, 'TESTTOKEN', { seatMode: 'all' });
    window.scrollTo(0, 0);
  }));

  /* 03 내 내역 — 금액·서류가 가린 것 없이 */
  await snap('mp-ledger', () => page.evaluate((s) => { show('mypageView'); renderMyPage(s); window.scrollTo(0, 0); }, base('제작중', { payment: { confirmed: true } })));

  console.log('\n찍은 것 (규격 780x1647 이어야 한다)');
  shots.forEach((s) => console.log('  ' + s));
  console.log('\n→ ' + OUT);
} finally {
  try { server.kill(); } catch {}
  try { await eng.close(); } catch {}
}
