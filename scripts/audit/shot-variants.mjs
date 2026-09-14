// 같은 화면을 «여러 조건으로» 찍어 놓고 고른다 [SHOT_VARIANTS]
//   대표 지시(2026-09-14): *「시뮬레이션으로 직접 병렬로 여러번 돌리고 좋겠다싶은부분들
//   체크해서 리스트업하고, 이후 스탭바이스탭으로 어떤식으로 캡쳐하면 좀더 좋을지 고민하고
//   최적 최선의 캡쳐 만들어서 올려죠」*
//
//   ★한 번 찍고 «이게 최선»이라고 말하지 않는다. 폭을 바꿔 가며 여러 장 찍고
//     같은 자로 재서 고른다. 사람이 눈으로 고르는 것은 마지막 한 단계뿐이다.
//   재는 것: 크기 · 세로/가로 비 · 잘림 · 신청서와 어긋나는 표기 · 화면에 실제로 뜬 글자
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_variants');
const PORT = 8241;
const WIDTHS = [390, 430, 560, 760];
const CONFLICT = ['25명', '25 Guests', '스물다섯'];

const DUMMY = { ok: true, groom: '김도현', bride: '이서진', date: '2027-04-17', eventId: 'KD-LS-0417-demo01' };
const SEAT = { ok: true, seat: { groom: '김도현', bride: '이서진', date: '2027-04-17', tables: [
  { side: 'L', name: '', seats: ['김정우', '김민서', '', '김하늘', '', ''] },
  { side: 'R', name: '', seats: ['이현우', '이수아', '이지호', '', '', ''] },
  { side: 'L', name: '', seats: ['박서준', '최유진', '', '', '', ''] },
  { side: 'R', name: '', seats: ['정예린', '한도윤', '', '', '', ''] } ] } };

const TARGETS = [
  { n: 'live_비공개참석', url: '/live.html', gas: DUMMY },
  { n: 'gallery_온라인', url: '/invitation-gallery.html', gas: DUMMY },
  { n: 'gallery_오프라인', url: '/invitation-gallery.html', gas: DUMMY, click: '#gv-ver-off' },
  { n: 'seat_좌석', url: '/seat.html?t=demo', gas: SEAT },
  { n: 'guide_하객허브', url: '/guide.html?g=demo', gas: DUMMY },
  { n: 'ritual_식순', url: '/order-preview.html', gas: DUMMY },
  { n: 'parents_어른안내', url: '/parents.html', gas: DUMMY },
  { n: 'invite_청첩장', url: '/i/cover-01.html?e=' + DUMMY.eventId, gas: DUMMY },
];

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1400));

const eng = await launchBrowser();
if (!eng) { console.error('브라우저 없음'); server.kill(); process.exit(1); }
fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(OUT, { recursive: true });

const rows = [];
for (const t of TARGETS) {
  for (const w of WIDTHS) {
    const { page } = await eng.newPage({ port: PORT, gasBody: JSON.stringify(t.gas || DUMMY),
                                         viewport: { width: w, height: 1000 } });
    let note = '';
    try {
      await page.goto(`http://localhost:${PORT}${t.url}`, { waitUntil: 'domcontentloaded', timeout: 20000 });
      await page.waitForTimeout(2200);
      if (t.click) { await page.click(t.click).catch(() => { note += '클릭실패 '; }); await page.waitForTimeout(1200); }
      await page.evaluate(async () => {
        // ★[SHOT_FLOAT 2026-09-14] 떠 있는 위젯(공유·상담 말풍선)을 숨긴다.
        //   적대적 검증에서 잡힌 것 — parents.html 캡처에서 «배경도 테두리도 없는 붉은 공유 아이콘»이
        //   본문 문단 한가운데(x353~369 · y414~430)에 맨몸으로 떠 있었다. 다른 버튼은 전부 테두리
        //   상자를 갖고 있어 이것만 튀었고, 본문 컬럼 경계를 11px 넘었다.
        //   제출용 사진에서는 «미완성 버튼»으로 읽힌다 — 기능이 아니라 사진의 문제라 캡처에서 숨긴다.
        document.querySelectorAll('*').forEach(e => {
          const cs = getComputedStyle(e), r = e.getBoundingClientRect();
          if ((cs.position === 'fixed' || cs.position === 'sticky') && r.width > 8 && r.width < 260 && r.height < 260) e.style.display = 'none';
        });
        document.querySelectorAll('.reveal').forEach(e => e.classList.add('visible', 'revealed'));
        document.querySelectorAll('[loading="lazy"]').forEach(e => e.setAttribute('loading', 'eager'));
        document.querySelectorAll('img[data-src]').forEach(e => { e.src = e.dataset.src; });
        for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise(r => setTimeout(r, 60)); }
        window.scrollTo(0, 0);
      }).catch(() => {});
      await page.waitForTimeout(1000);
      const m = await page.evaluate(() => {
        const t2 = (document.body.innerText || '').trim();
        return { len: t2.length, head: t2.slice(0, 70).replace(/\s+/g, ' '),
                 sh: document.documentElement.scrollHeight, ch: document.documentElement.clientHeight,
                 text: t2 };
      });
      const bad = CONFLICT.filter(k => m.text.includes(k));
      await page.evaluate(() => {
        document.querySelectorAll('*').forEach(e => {
          const cs = getComputedStyle(e), r = e.getBoundingClientRect();
          if ((cs.position === 'fixed' || cs.position === 'sticky') && r.width > 8 && r.width < 260 && r.height < 260) e.style.display = 'none';
        });
      }).catch(() => {});
      await page.waitForTimeout(300);
      const file = `${t.n}__${w}.png`;
      await page.screenshot({ path: path.join(OUT, file), fullPage: true });
      const sz = fs.statSync(path.join(OUT, file)).size;
      rows.push({ name: t.n, w, file, kb: Math.round(sz / 1024), glyphs: m.len,
                  conflict: bad.join(' '), note: note + (m.len < 40 ? '글자없음 ' : ''), head: m.head });
    } catch (e) { rows.push({ name: t.n, w, file: '-', kb: 0, glyphs: 0, conflict: '', note: '실패 ' + e.message.slice(0, 40), head: '' }); }
    await page.close();
  }
}
await eng.close(); server.kill();
fs.writeFileSync(path.join(OUT, 'report.json'), JSON.stringify(rows, null, 1));
console.log('%-18s %5s %6s %7s %-12s %s', '화면', '폭', 'KB', '글자수', '어긋남', '비고');
for (const r of rows) console.log('%-18s %5d %6d %7d %-12s %s', r.name, r.w, r.kb, r.glyphs, r.conflict || '-', r.note || '');
console.log('\n→ ' + OUT);
process.exit(0);
