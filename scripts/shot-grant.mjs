// 「모두의 창업」 제출용 화면 캡처 [GRANT_SHOTS]
//   원칙 — ①실고객 데이터 절대 사용 금지(더미 예식 1건으로만) ②픽스픽스와 겹치는 화면 제외
//   (예약·계약·결제 화면은 안 찍는다 · docs/국가지원금/픽스픽스_겹침분석.md A칸)
//   $ node scripts/shot-grant.mjs
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './audit/_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '..');
const OUT  = path.join(SITE, '_shots');
const PORT = 8231;
const VP   = { width: 390, height: 844 };   // 숏폼 9:16 과 같은 폭

// ★더미 예식 — 실존 인물·날짜 아님. 신청서 이미지에 들어갈 유일한 데이터다.
const DUMMY = { ok: true, groom: '김도현', bride: '이서진', date: '2027-04-17', eventId: 'KD-LS-0417-demo01' };

// seat.html 이 기대하는 모양 — {ok, seat:{groom,bride,date,tables:[{side,name,seats:[이름…]}]}}
//   ★이름은 전부 가상이다. 실고객 데이터를 여기 넣지 말 것.
const SEAT = { ok: true, seat: {
  groom: '김도현', bride: '이서진', date: '2027-04-17',
  tables: [
    { side: 'L', name: '', seats: ['김정우','김민서','','김하늘','',''] },
    { side: 'R', name: '', seats: ['이현우','이수아','이지호','','',''] },
    { side: 'L', name: '', seats: ['박서준','최유진','','','',''] },
    { side: 'R', name: '', seats: ['정예린','한도윤','','','',''] },
  ],
} };

const TARGETS = [
  { n: '01_홈_가격',       url: '/index.html#pricing',          wait: 1200 },
  { n: '02_청첩장_갤러리', url: '/invitation-gallery.html',      wait: 1200 },
  { n: '03_청첩장_실물',   url: '/i/cover-01.html?e=' + DUMMY.eventId, wait: 1500 },
  { n: '04_식순_빌더',     url: '/order-preview.html',           wait: 1800 },
  { n: '05_어른_안내',     url: '/parents.html',                 wait: 1200 },
  { n: '06_하객_좌석조회', url: '/seat.html?t=demo',   wait: 1800, gas: SEAT },
  { n: '07_하객_안내허브', url: '/guide.html?g=demo',  wait: 1800 },   // 내장 표본 [GUIDE_DEMO] · 서버 안 부른다
];

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

const eng = await launchBrowser();
if (!eng) { console.error('브라우저 없음'); server.kill(); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const t of TARGETS) {
  const { page, errors } = await eng.newPage({ port: PORT, gasBody: JSON.stringify(t.gas || DUMMY), viewport: VP });
  let status = 'ok';
  try {
    await page.goto(`http://localhost:${PORT}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(t.wait);
    await page.screenshot({ path: path.join(OUT, `${t.n}.png`), fullPage: false });
    const text = (await page.evaluate(() => document.body.innerText || '')).trim();
    if (text.length < 40) status = `빈화면(글자 ${text.length}자)`;
    // ★글자 수만으로 'ok' 라 하면 오류 화면을 통과시킨다(1차 실측에서 실제로 그랬다)
    for (const bad of ['찾을 수 없어요', '만료', '잠시 후 다시', '오류가']) {
      if (text.includes(bad)) { status = `오류화면("${bad}" 표시됨)`; break; }
    }
  } catch (e) { status = '실패: ' + String(e).slice(0, 80); }
  report.push({ n: t.n, status, err: errors.slice(0, 2) });
  await page.close();
}
await eng.close(); server.kill();

for (const r of report) {
  console.log(`${r.status === 'ok' ? '  ok' : '  !!'}  ${r.n}  ${r.status}`);
  if (r.err.length) r.err.forEach(e => console.log(`        ${e.slice(0, 100)}`));
}
