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

// ★[SHOT_FULL 2026-09-14] 대표 지시 — *「사진을 좀더 전체적으로 캡쳐해서 볼수있게
//   심사위원 입장에서 플러스가될수있게」*. 종전에는 «첫 화면»만 찍혀서
//   01_홈_가격 은 마룬 배경에 브랜드명만 있는 표지가 되어 있었다(이름은 «홈_가격»인데 가격이 없다).
//   그래서 전부 fullPage 로 바꾼다. 페이지가 끝까지 들어가야 «돌아가는 제품»으로 읽힌다.
//   ★01 은 뺀다 — index.html 은 전체가 너무 길어 한 장으로는 못 읽고,
//     가격·환불은 apply-shots-full.mjs 가 «답 한 덩어리» 단위로 따로 찍는다.
const TARGETS = [
  { n: '02_청첩장_갤러리', url: '/invitation-gallery.html',      wait: 1200, full: true },
  { n: '03_청첩장_실물',   url: '/i/cover-01.html?e=' + DUMMY.eventId, wait: 1500, full: true },
  { n: '04_식순_빌더',     url: '/order-preview.html',           wait: 1800, full: true },
  { n: '05_어른_안내',     url: '/parents.html',                 wait: 1200, full: true },
  // ★[SEAT_414] 좌석 배치도만 414px 로 찍는다. 390px 에서는 우측 테이블 칩 하나가 9px 넘쳐
  //   화면 밖으로 나간다(실측: scrollW 384 > clientW 360 · '이수아' right=399).
  //   버그가 아니라 @media(max-width:400px) 의 가로 스크롤 설계라 실기기에선 밀어서 볼 수 있지만,
  //   정지 이미지로는 잘려 보인다. 414px 에서는 넘치는 칩 0개(실측).
  { n: '06_하객_좌석조회', url: '/seat.html?t=demo',   wait: 1800, full: true, gas: SEAT, vp: { width: 414, height: 844 } },
  { n: '07_하객_안내허브', url: '/guide.html?g=demo',  wait: 1800, full: true },   // 내장 표본 [GUIDE_DEMO] · 서버 안 부른다
  // ★[SHOT_08] 손 스케치가 없을 때의 「과정」 칸 — 코워크 대체 A.
  //   02_자산팩트시트 §4-2(2026-07-21 작성)를 브랜드 톤으로 옮긴 한 장.
  //   공고일(8/20)보다 한 달 앞선 문서라 «계획을 지어내지 않았다»의 물증이 된다.
  { n: '08_전환과제_7월문서', url: '/_shots/src/08_전환과제.html', wait: 1500, full: true },
];

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 900));

const eng = await launchBrowser();
if (!eng) { console.error('브라우저 없음'); server.kill(); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

const report = [];
for (const t of TARGETS) {
  const { page, errors } = await eng.newPage({ port: PORT, gasBody: JSON.stringify(t.gas || DUMMY), viewport: t.vp || VP });
  let status = 'ok';
  try {
    await page.goto(`http://localhost:${PORT}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(t.wait);
    await page.screenshot({ path: path.join(OUT, `${t.n}.png`), fullPage: !!t.full });
    const text = (await page.evaluate(() => document.body.innerText || '')).trim();
    if (text.length < 40) status = `빈화면(글자 ${text.length}자)`;
    // ★글자 수만으로 'ok' 라 하면 오류 화면을 통과시킨다(1차 실측에서 실제로 그랬다)
    for (const bad of ['찾을 수 없어요', '만료', '잠시 후 다시', '오류가']) {
      if (text.includes(bad)) { status = `오류화면("${bad}" 표시됨)`; break; }
    }
    // ★[SHOT_CONFLICT 2026-09-14] 신청서는 「서른 분 모두 앉아서」라고 적는데
    //   사이트는 아직 「25명 착석 + 스탠딩 5」다(대표가 정한 변경이 사이트에 안 내려왔다).
    //   그 표기가 찍힌 사진을 첨부하면 신청서와 사진이 서로 다른 말을 한다.
    for (const c of ['25명', '25 Guests', '스물다섯']) {
      if (text.includes(c)) { status = `★신청서와 어긋남("${c}" 이 찍힌다 · 신청서는 「서른 분」)`; break; }
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
