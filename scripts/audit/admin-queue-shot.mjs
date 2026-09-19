// 관리자 «처리할 일» 화면 캡처 [ADMIN_QUEUE_SHOT]
//   받치는 본문 — Q3-1 「저희가 보는 운영 화면도 같은 자리에 '입금 확인' 같은 처리할 일을 줄로 세웁니다」
//   ★대표가 「관리자 페이지도 우리 사업화의 핵심 축」이라고 한 그 화면이다.
//   ★이름·코드는 전부 더미. 실고객 데이터를 여기 넣지 말 것.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_variants');
const PORT = 8243;

const q = (kind, names, code, sub, badge, wait) => ({
  kind, names, code, sub, product: '시그니처',
  badge: badge ? { level: badge[0], text: badge[1] } : null, _wait: wait || '',
});

const HOME = {
  ok: true, name: '희준',
  counts: { total: 7, urgent: 2 },
  queue: {
    urgent: [
      q('입금확인', '김도현 · 이서진', 'AB12CD', '잔금 1,650,000원 · 예식 D-9', ['red', '오늘까지']),
      q('계약발송', '박서준 · 최유진', 'EF34GH', '상담완료 · 계약서 미발송', ['red', '2일 지남']),
    ],
    normal: [
      q('상담완료', '이현우 · 정예린', 'IJ56KL', '2026-09-08 14:00 상담', ['yellow', '벌수 미기록'], '2026-09-05'),
      q('시착보내기', '한도윤 · 김하늘', 'MN78OP', '드레스 시착 동의 대기', null, '2026-09-06'),
      q('신규신청', '김민서 · 이수아', 'QR90ST', '평일 · 2027-03-20 희망', null, ''),
      q('임시고정', '정민호 · 한서영', 'UV12WX', '2027-04-17(토) 오후', null, ''),
      q('현금영수증발행', '이지호 · 김서준', 'YZ34AB', '중도금 1,320,000원', null, ''),
    ],
  },
  results: [], pipeline: {}, survey: [], blocks: [], stageFlow: {}, stageEx: [],
};

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1400));

const eng = await launchBrowser();
if (!eng) { console.error('브라우저 없음'); server.kill(); process.exit(1); }
fs.mkdirSync(OUT, { recursive: true });

for (const w of [430, 560, 760]) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: w, height: 1000 } });
  await page.addInitScript(() => { localStorage.setItem('me_admin_token', 'SHOT-TOKEN'); });
  await page.route('**script.google.com**', async (route) => {
    let b = {}; try { b = JSON.parse(route.request().postData() || '{}'); } catch {}
    const fn = String(b.fn || '');
    const body = fn === 'adminHome' ? HOME : { ok: true };
    await route.fulfill({ status: 200, contentType: 'application/json',
      headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
  });
  await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(3000);
  const t = (await page.evaluate(() => document.body.innerText || '')).trim();
  const okLogin = !t.includes('비밀번호') || t.includes('처리할 일');
  const okQueue = t.includes('처리할 일');
  console.log(`  폭 ${w} — 로그인아님:${okLogin ? '✅' : '❌'} 큐:${okQueue ? '✅' : '❌'} 글자 ${t.length}자`);
  console.log('     ' + t.slice(0, 110).replace(/\s+/g, ' '));
  await page.screenshot({ path: path.join(OUT, `admin_처리할일전체__${w}.png`), fullPage: true });
  // ★개업 전이라 아래 세 칸(결과물·진행 중·설문)이 비어 있다. 정직한 화면이지만 사진의 절반을
  //   «아직 없어요»로 채울 이유가 없다. 「처리할 일」 묶음만 잘라 담는다.
  const box = await page.evaluate(() => {
    const heads = Array.from(document.querySelectorAll('.sect-h'));
    const start = heads.find(e => (e.textContent || '').includes('처리할 일'));
    const stop = heads.find(e => (e.textContent || '').includes('결과물'));
    if (!start) return null;
    const sy = window.scrollY;
    const a = start.getBoundingClientRect().top + sy - 16;
    const b = stop ? stop.getBoundingClientRect().top + sy - 18
                   : document.documentElement.scrollHeight;
    return { x: 0, y: Math.max(0, a), width: document.documentElement.clientWidth, height: b - a };
  });
  if (box) {
    await page.screenshot({ path: path.join(OUT, `admin_처리할일__${w}.png`), clip: box, fullPage: true });
    console.log(`     → 처리할 일만 ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
  await page.close();
}
await eng.close(); server.kill();
process.exit(0);
