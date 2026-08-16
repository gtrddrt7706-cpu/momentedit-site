// 좌석·음료 편집기 실동작 점검 — [SEAT_ONE_CARD] 한 창(이름+음료) · [ALC_ONE] 알콜 1종 규칙.
//   눈으로 볼 스크린샷(390/1280)과 함께, 실제 탭·타이핑으로 모델이 어떻게 바뀌는지를 검사한다.
//   사용: node scripts/audit/seat-onecard.mjs      (스크린샷 → scripts/audit/_shots/seat-*.png)
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const SITE = path.resolve(HERE, '../..');
const OUT = path.join(HERE, '_shots');
const PORT = 8129;

let fail = 0;
const ok = (cond, msg, detail) => { console.log(`  ${cond ? '✅' : '❌'} ${msg}${cond || !detail ? '' : ' → ' + detail}`); if (!cond) fail++; };

fs.mkdirSync(OUT, { recursive: true });
const eng = await launchBrowser();
if (!eng) { console.log('seat-onecard 건너뜀 — playwright·puppeteer 미설치.'); process.exit(0); }
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 1500));

// 편집기만 띄운다(마이페이지 전체 상태는 필요 없음) — startSeatFlow가 오버레이를 직접 그린다.
const openSeat = async (page, tables) => page.evaluate((tbls) => {
  window._mpStateD = { production: { base: { weddingDate: '2026-10-26' }, tracks: {} } };
  show('mypageView');
  document.getElementById('mp_production').style.display = 'block';
  startSeatFlow(tbls ? { tables: tbls } : null, { headcount: '' }, 'TESTTOKEN', { seatMode: 'all' });
}, tables || null);

const tap = async (page, sel) => { await page.click(sel); await new Promise((r) => setTimeout(r, 120)); };
const model = (page) => page.evaluate(() => SEATFLOW.tables.map((t) => ({ s: t.seats.slice(), d: (t.drinks || []).slice() })));

try {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
  await new Promise((r) => setTimeout(r, 900));

  console.log('\n[한 창 · 이름+음료]');
  await openSeat(page);
  await tap(page, '[data-seat-edit][data-ti="0"][data-si="0"]');
  const one = await page.evaluate(() => ({
    bars: document.querySelectorAll('.seat-drinkbar').length,
    nmInBar: !!document.querySelector('.seat-drinkbar .sdb-nm'),
    canvasEdit: document.querySelectorAll('.rs-edit').length,
    focused: document.activeElement && document.activeElement.className,
    chips: [...document.querySelectorAll('.dk-chip')].map((b) => b.textContent.trim()),
    label: (document.querySelector('.sdb-label') || {}).textContent || '',
    selRing: document.querySelectorAll('.rs.sel').length,
    next: (document.querySelector('.sdb-ok') || {}).textContent || '',
  }));
  ok(one.bars === 1, '자리를 탭하면 창은 하나만 뜬다', String(one.bars));
  ok(one.nmInBar, '이름칸이 그 창 안에 있다');
  ok(one.canvasEdit === 0, '캔버스 자리 알약 안 입력칸(rs-edit)은 더 이상 없다', String(one.canvasEdit));
  ok(one.focused === 'sdb-nm', '창을 열면 이름칸에 바로 커서가 간다', String(one.focused));
  ok(one.selRing === 1, '열어 둔 자리에 표시(.rs.sel)가 남는다', String(one.selRing));
  ok(one.chips.length === 3, '아직 알콜을 아무도 안 골랐으면 셋 다 보인다', one.chips.join(' / '));
  ok(one.next.trim() === '확인', "단추는 '확인' 하나 · 다음 자리로 끌고 가지 않는다 [SEAT_NO_CHAIN]", one.next);
  await page.screenshot({ path: path.join(OUT, 'seat-1-한창-390.png'), fullPage: false });

  /* [SEAT_DIRTY_KEEP] 여기는 fill(값 한 번에 대입)이 아니라 **한 글자씩 실타이핑**이어야 한다 —
     f515438 이후 라이브에서 이름이 통째로 사라지던 사고가 '글자를 치는 동안 편집이 닫히는' 경로였고,
     fill 은 그 경로를 지나가지 않는다. 이 검사가 그 회귀를 붙잡는 자리다. */
  console.log('\n[이름 적고 엔터 = 이 자리만 마치고 닫힘]');
  await page.click('.sdb-nm');
  await page.keyboard.type('김희준', { delay: 40 });
  await new Promise((r) => setTimeout(r, 120));
  const typed = await page.evaluate(() => ({ n: SEATFLOW.tables[0].seats[0], e: JSON.stringify(SEATFLOW.edit) }));
  ok(typed.n === '김희준', '치는 동안 이름이 모델에 들어간다(편집이 닫히지 않는다)', typed.n + ' edit=' + typed.e);
  await page.press('.sdb-nm', 'Enter');
  await new Promise((r) => setTimeout(r, 260));
  const afterEnter = await page.evaluate(() => ({
    sel: JSON.stringify(SEATFLOW.sel), name0: SEATFLOW.tables[0].seats[0],
    bars: document.querySelectorAll('.seat-drinkbar').length,
    shown: [...document.querySelectorAll('.rs-nm')].map((e) => e.textContent).join(','),
  }));
  ok(afterEnter.name0 === '김희준', '적은 이름이 모델에 남는다', afterEnter.name0);
  ok(afterEnter.sel === 'null' && afterEnter.bars === 0, '엔터를 누르면 그 자리만 마치고 창이 닫힌다 [SEAT_NO_CHAIN]', afterEnter.sel + ' bars=' + afterEnter.bars);
  ok(afterEnter.shown === '김희준', '캔버스에 그 이름이 보인다', afterEnter.shown);

  // 다음 자리는 '눌러서' 연다 — 자동으로 열리지 않는다
  await tap(page, '[data-seat-edit][data-ti="0"][data-si="1"]');
  const opened = await page.evaluate(() => ({ sel: JSON.stringify(SEATFLOW.sel), val: (document.querySelector('.sdb-nm') || {}).value }));
  ok(opened.sel === '{"ti":0,"si":1}' && opened.val === '', '다음 자리는 눌렀을 때만 열린다(빈 칸으로)', opened.sel + ' val=' + opened.val);

  console.log('\n[알콜 1종 규칙]');
  await page.fill('.sdb-nm', '이미쿠');
  await tap(page, '.dk-chip:nth-child(1)');   // 샴페인
  const afterC = await page.evaluate(() => ({
    chips: [...document.querySelectorAll('.dk-chip')].map((b) => b.textContent.trim()),
    n2: !!document.querySelector('.sdb-opts.n2'),
    d: SEATFLOW.tables[0].drinks[1],
    note: (document.querySelector('.sdb-note') || {}).textContent || '',
    alcLine: (document.querySelector('.ss-alc') || {}).textContent || '',
  }));
  ok(afterC.d === 'C', '고른 음료가 그 자리에 저장된다', String(afterC.d));
  ok(afterC.chips.length === 2 && afterC.n2, '알콜이 정해지면 선택지는 둘(그 알콜·논알콜)', afterC.chips.join(' / '));
  ok(/레드와인/.test(afterC.chips.join('')) === false, '다른 알콜(레드와인)은 자리 창에 뜨지 않는다', afterC.chips.join(' / '));
  ok(/샴페인/.test(afterC.alcLine), '요약 카드가 행사 알콜을 알려 준다', afterC.alcLine.replace(/\s+/g, ' ').slice(0, 60));
  await page.screenshot({ path: path.join(OUT, 'seat-1b-알콜정해짐-390.png'), fullPage: false });

  // 논알콜은 언제나 고를 수 있다(고정) — 자리를 눌러서 연다
  await tap(page, '[data-seat-edit][data-ti="0"][data-si="2"]');
  await page.fill('.sdb-nm', '아이');
  await tap(page, '.sdb-opts .dk-chip:last-child');   // 논알콜
  const afterN = await page.evaluate(() => ({ d: SEATFLOW.tables[0].drinks[2], counts: (document.querySelector('.ss-drinks') || {}).textContent || '' }));
  ok(afterN.d === 'N', '논알콜 스파클링은 알콜과 무관하게 자리별로 고를 수 있다', String(afterN.d));

  console.log('\n[알콜 종류 통째로 바꾸기]');
  await page.evaluate(() => { SEATFLOW.sel = null; SEATFLOW.edit = null; renderSeat(document.getElementById('mp_production')); });
  await tap(page, '[data-alc-all="R"]');
  await new Promise((r) => setTimeout(r, 200));
  const confirmTxt = await page.evaluate(() => (document.querySelector('.mp-modal') || {}).innerText || '');
  ok(/레드와인/.test(confirmTxt) && /\d+곳/.test(confirmTxt) && !/미정/.test(confirmTxt), '무엇이 몇 곳 바뀌는지 먼저 묻는다(미정 언급 없이)', confirmTxt.replace(/\s+/g, ' ').slice(0, 80));
  await page.evaluate(() => { const b = [...document.querySelectorAll('.mp-modal button')].find((x) => /바꾸기/.test(x.textContent)); if (b) b.click(); });
  await new Promise((r) => setTimeout(r, 250));
  const afterSwap = await page.evaluate(() => ({ d: SEATFLOW.tables[0].drinks.slice(0, 3).join(',') }));
  ok(afterSwap.d === 'R,R,N', '알콜만 통째로 바뀌고 논알콜은 그대로다', afterSwap.d);

  /* [SEAT_NO_UNDEC] '미정'이라는 상태를 만들지 않는다 — 이름이 붙는 순간 음료가 하나 붙는다.
     되돌리는 길(창의 '미정으로' 단추)도, 미정을 세는 자리(요약 알약)도 없어야 한다. */
  console.log('\n[미정이 생기지 않는다]');
  await page.evaluate(() => {
    SEATFLOW.tables[0].seats = ['가', '나', '다', '라'];
    SEATFLOW.tables[0].drinks = ['', 'R', 'N', ''];   // 옛 데이터 모양(이름은 있는데 음료가 빈 자리)
    SEATFLOW.sel = null; SEATFLOW.edit = null;
    renderSeat(document.getElementById('mp_production'));
  });
  const noUndec = await page.evaluate(() => ({
    d: SEATFLOW.tables[0].drinks.join(','),
    pills: (document.querySelector('.ss-drinks') || {}).textContent || '',
    rings: document.querySelectorAll('.rs-dk-none').length,
    fill: document.querySelectorAll('[data-alc-fill]').length,
  }));
  ok(noUndec.d === 'R,R,N,R', '이름 있는데 빈 자리는 열자마자 기본값(행사 알콜)으로 채워진다', noUndec.d);
  ok(!/미정/.test(noUndec.pills), '요약 집계에 미정 알약이 없다', noUndec.pills.replace(/\s+/g, ' '));
  ok(noUndec.rings === 0, '캔버스에 미정 빈 링이 없다', String(noUndec.rings));
  ok(noUndec.fill === 0, "'미정 일괄 채우기' 단추가 없다", String(noUndec.fill));

  // 새 이름을 적으면 그 자리도 곧바로 음료가 붙는다 + 창에 '미정으로' 되돌리는 길이 없다
  await tap(page, '[data-seat-edit][data-ti="1"][data-si="0"]');
  await page.click('.sdb-nm');
  await page.keyboard.type('새하객', { delay: 30 });
  await new Promise((r) => setTimeout(r, 120));
  const fresh = await page.evaluate(() => {
    renderSeat(document.getElementById('mp_production'));
    return { d: SEATFLOW.tables[1].drinks[0], clear: document.querySelectorAll('.sdb-clear').length, on: [...document.querySelectorAll('.dk-chip.on')].map((b) => b.textContent.trim()).join(',') };
  });
  ok(fresh.d === 'R', '이름을 적으면 그 자리에 음료가 곧바로 붙는다', String(fresh.d));
  ok(fresh.clear === 0, "창에 '미정으로 되돌리기' 단추가 없다", String(fresh.clear));
  ok(/레드와인/.test(fresh.on), '붙은 음료가 창에서 선택된 상태로 보인다', fresh.on);
  await page.screenshot({ path: path.join(OUT, 'seat-2-요약-390.png'), fullPage: false });

  console.log('\n[섞인 옛 데이터]');
  await openSeat(page, [
    { name: '테이블 1', side: 'L', seats: ['가', '나', '다', '라'], drinks: ['C', 'R', 'N', ''] },   // '' 는 기본값으로 메워지고, C·R 섞임만 남는다
    { name: '테이블 2', side: 'R', seats: ['', '', '', ''], drinks: ['', '', '', ''] },
  ]);
  await tap(page, '[data-seat-edit][data-ti="0"][data-si="0"]');
  const mixed = await page.evaluate(() => ({
    chips: [...document.querySelectorAll('.dk-chip')].map((b) => b.textContent.trim()).length,
    warn: (document.querySelector('.ss-alc-mix') || {}).textContent || '',
    note: (document.querySelector('.sdb-note') || {}).textContent || '',
  }));
  ok(mixed.chips === 3, '섞여 있을 땐 셋 다 보여 준다(무엇으로 되어 있는지 보여야 고친다)', String(mixed.chips));
  ok(/섞여/.test(mixed.warn), '요약 카드가 섞인 상태를 알려 준다', mixed.warn.replace(/\s+/g, ' ').slice(0, 60));
  ok(/섞여/.test(mixed.note), '자리 창도 같은 사실을 말한다', mixed.note);

  console.log('\n[문구 · 넘침]');
  const txt = await page.evaluate(() => document.getElementById('mp_production').innerText || '');
  ok(txt.indexOf('—') === -1, '전각 줄표(—) 없음', (txt.match(/.{0,24}—.{0,24}/) || [''])[0]);
  ok(!/NaN|undefined|\[object Object\]/.test(txt), 'NaN·undefined 노출 없음');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  ok(overflow <= 0, '390px에서 가로 넘침 없음', String(overflow));
  await page.screenshot({ path: path.join(OUT, 'seat-3-섞임-390.png'), fullPage: false });

  console.log('\n[1280px]');
  await page.setViewportSize({ width: 1280, height: 900 });
  await new Promise((r) => setTimeout(r, 250));
  const w = await page.evaluate(() => { const b = document.querySelector('.seat-drinkbar'); const r = b.getBoundingClientRect(); return { w: Math.round(r.width), cx: Math.round(r.left + r.width / 2), mid: Math.round(window.innerWidth / 2) }; });
  ok(w.w <= 360 && Math.abs(w.cx - w.mid) <= 2, '넓은 화면에서도 창은 360px 고정 · 가운데', JSON.stringify(w));
  await page.screenshot({ path: path.join(OUT, 'seat-4-한창-1280.png'), fullPage: false });

  console.log('\n[JS 오류]');
  const real = errors.filter((e) => !/favicon|net::ERR/.test(e));
  ok(real.length === 0, '콘솔 오류 0건', real.slice(0, 3).join(' | '));

  await page.close();
  await eng.close();
} finally { server.kill(); }

console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(fail ? 1 : 0);
