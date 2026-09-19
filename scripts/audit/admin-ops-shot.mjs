// 관리자 «처리할 일» 화면 캡처 [ADMIN_QUEUE_SHOT]
//   받치는 본문 — Q3-1 「저희가 보는 운영 화면도 같은 자리에 '입금 확인' 같은 처리할 일을 줄로 세웁니다」
//   ★대표가 「관리자 페이지도 우리 사업화의 핵심 축」이라고 한 그 화면이다.
//   ★이름·코드는 전부 더미. 실고객 데이터를 여기 넣지 말 것.
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

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
  // ★파이프라인·결과물도 채운다 — 「처리할 일」 한 줄만으로는 신청서 459행
  //   「승인과 계약서 발송과 입금 확인처럼 사람이 정해야 하는 일만 화면이 모아」와
  //   76행 「진행 단계」를 절반밖에 증명하지 못한다.
  //   ★전부 더미다. 실고객 데이터 금지(원 스크립트 주석과 같은 규칙).
  pipeCounts: { '시그니처': 9, '웨딩스냅': 3 },
  pipeline: {
    '시그니처': [
      { stage:'신청접수', count:2, hasUrgent:false, customers:[
        {code:'QR90ST',names:'김민서 · 이수아',sub:'평일 · 2027-03-20 희망',dday:null},
        {code:'UV12WX',names:'정민호 · 한서영',sub:'2027-04-17(토) 오후',dday:null}]},
      { stage:'상담확정', count:1, hasUrgent:false, customers:[
        {code:'CD56EF',names:'윤채원 · 오지민',sub:'2026-09-20 14:00 방문',dday:null}]},
      { stage:'시착',     count:1, hasUrgent:false, customers:[
        {code:'MN78OP',names:'한도윤 · 김하늘',sub:'드레스 시착 동의 대기',dday:null}]},
      { stage:'상담완료', count:1, hasUrgent:true,  customers:[
        {code:'IJ56KL',names:'이현우 · 정예린',sub:'계약서 미발송 · 2일 지남',dday:null}]},
      { stage:'계약완료', count:1, hasUrgent:false, customers:[
        {code:'EF34GH',names:'박서준 · 최유진',sub:'계약금 입금 대기',dday:120}]},
      { stage:'입금완료', count:1, hasUrgent:false, customers:[
        {code:'GH78IJ',names:'강나윤 · 강민재',sub:'중도금 확인 · 제작 시작 전',dday:64}]},
      { stage:'제작중',   count:1, hasUrgent:true,  customers:[
        {code:'AB12CD',names:'김도현 · 이서진',sub:'잔금 1,650,000원 · 오늘까지',dday:9}]},
      { stage:'예식완료', count:1, hasUrgent:false, customers:[
        {code:'YZ34AB',names:'이지호 · 김서준',sub:'원본 등록 필요',dday:-6}]},
      { stage:'결과물전달', count:0, hasUrgent:false, customers:[]},
      { stage:'후기',     count:0, hasUrgent:false, customers:[]},
    ],
    '웨딩스냅': [],
  },
  // ★[SHOT_LEGIBLE 2026-09-14 대표 「10번 사진도 잘 안 보여」] 「결과물 관리」를 뺐다.
  //   세 화면을 한 장에 넣자 세로가 길어져 화면에 맞춰 볼 때 글자가 작아졌다 — 많이 넣을수록 작아지는 맞바꿈이다.
  //   셋 중 결과물 관리가 신청서 문장을 가장 덜 받친다(459행은 「승인·계약서 발송·입금 확인」, 76행은 「진행 단계」).
  //   ★남긴 둘이 그 두 문장을 정확히 증명하고, 대신 글자가 커진다.
  results: [],
  survey: [], blocks: [], stageFlow: {}, stageEx: [],
};

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1400));

const eng = await chromium.launch();   // ★2배 해상도로 찍는다 [SHOT_2X] — 1배는 확대하면 계단이 보인다
fs.mkdirSync(OUT, { recursive: true });

for (const w of [560]) {
  const page = await eng.newPage({ viewport: { width: w, height: 1000 }, deviceScaleFactor: 2 });
  await page.addInitScript(() => {
    localStorage.setItem('me_admin_token', 'SHOT-TOKEN');
    localStorage.setItem('me_admin_filter', '시그니처');
    // ★단계 묶음을 펼쳐 둔다 — 접힌 채로는 «몇 명인가»만 보이고 «누가 어느 단계인가»가 안 보인다
    localStorage.setItem('me_admin_open', JSON.stringify(
      ['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료']
        .map(s => '시그니처:' + s)));
  });
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
  await page.screenshot({ path: path.join(OUT, `admin_홈전체__${w}.png`), fullPage: true });
  // ★개업 전이라 아래 세 칸(결과물·진행 중·설문)이 비어 있다. 정직한 화면이지만 사진의 절반을
  //   «아직 없어요»로 채울 이유가 없다. 「처리할 일」 묶음만 잘라 담는다.
  // ★「예시 데이터」 고지 띠를 넣는다 — 신청서는 「아직 문을 열기 전」이라 밝히고 있다.
  //   진행 중 현황에 고객 12명이 보이면 «이미 12명이 있다»로 읽힐 수 있다.
  //   라이브·하객안내 화면에는 제품 안에 이미 같은 고지가 있다. 관리자에는 없으니 여기서 붙인다.
  // ★결과물 목록을 비우면 그 자리에 「아직 결과물 단계 고객이 없어요」 빈 칸이 남는다 — 칸째로 숨긴다
  await page.evaluate(() => {
    const rw = document.getElementById('resultsWrap');
    if (rw) rw.style.display = 'none';
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => {
    const head = Array.from(document.querySelectorAll('.sect-h'))
      .find(e => (e.textContent || '').includes('처리할 일'));
    if (!head) return;
    const b = document.createElement('div');
    b.id = 'shotNotice';
    b.textContent = '예시 데이터예요 · 개업 전이라 실제 고객은 없습니다 · 운영 화면의 구조를 보여 드리는 화면입니다';
    b.style.cssText = 'margin:4px 2px 2px;padding:9px 12px;border:1px solid #d8b06a;'
      + 'border-radius:8px;background:#fdf6ec;color:#8a5a1a;font-size:12.5px;line-height:1.5;text-align:center';
    head.parentNode.insertBefore(b, head);
  });
  await page.waitForTimeout(300);
  const box = await page.evaluate(() => {
    const heads = Array.from(document.querySelectorAll('.sect-h'));
    const start = document.getElementById('shotNotice');
    const stop = heads.find(e => (e.textContent || '').includes('설문'));
    if (!start) return null;
    const sy = window.scrollY;
    const a = start.getBoundingClientRect().top + sy - 16;
    const b = stop ? stop.getBoundingClientRect().top + sy - 18
                   : document.documentElement.scrollHeight;
    return { x: 0, y: Math.max(0, a), width: document.documentElement.clientWidth, height: b - a };
  });
  // ★단을 어디서 자를지 «캡처할 때» 재 둔다 — 나중에 픽셀로 찾으면 카드 한가운데가 갈린다(⑥ 에서 겪음)
  const cut = await page.evaluate(() => {
    const start = document.getElementById('shotNotice');
    const pipe = Array.from(document.querySelectorAll('.sect-h'))
      .find(e => (e.textContent || '').includes('진행 중 현황'));
    if (!start || !pipe) return null;
    const sy = window.scrollY;
    const a = start.getBoundingClientRect().top + sy - 16;
    return Math.round(pipe.getBoundingClientRect().top + sy - a - 10);
  });
  if (cut) { fs.writeFileSync(path.join(OUT, `admin_cut_${w}.txt`), String(cut)); console.log(`     → 단 나눌 자리 ${cut}px (「진행 중 현황」 머리글 위)`); }
  if (box) {
    await page.screenshot({ path: path.join(OUT, `admin_운영화면__${w}.png`), clip: box, fullPage: true });
    console.log(`     → 처리할 일만 ${Math.round(box.width)}x${Math.round(box.height)}`);
  }
  await page.close();
}
await eng.close(); server.kill();
process.exit(0);
