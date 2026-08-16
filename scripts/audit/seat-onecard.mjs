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
  ok(one.chips.length === 5, '알콜을 아직 안 골랐으면 다섯(샴페인·레드와인·논알콜·유아·어린이)', one.chips.join(' / '));
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
  await tap(page, '.dk-chip[data-drink="C"]');   // 샴페인(위치가 아니라 값으로 — 칩이 늘어도 안 어긋난다)
  const afterC = await page.evaluate(() => ({
    chips: [...document.querySelectorAll('.dk-chip')].map((b) => b.textContent.trim()),
    n4: !!document.querySelector('.sdb-opts.n4'),
    d: SEATFLOW.tables[0].drinks[1],
    note: (document.querySelector('.sdb-note') || {}).textContent || '',
    alcLine: (document.querySelector('.ss-alc') || {}).textContent || '',
  }));
  ok(afterC.d === 'C', '고른 음료가 그 자리에 저장된다', String(afterC.d));
  ok(afterC.chips.length === 4 && afterC.n4, '알콜이 정해지면 선택지는 넷(그 알콜·논알콜·유아·어린이)', afterC.chips.join(' / '));
  ok(/레드와인/.test(afterC.chips.join('')) === false, '다른 알콜(레드와인)은 자리 창에 뜨지 않는다', afterC.chips.join(' / '));
  ok(/샴페인/.test(afterC.alcLine), '요약 카드가 행사 알콜을 알려 준다', afterC.alcLine.replace(/\s+/g, ' ').slice(0, 60));
  await page.screenshot({ path: path.join(OUT, 'seat-1b-알콜정해짐-390.png'), fullPage: false });

  // 논알콜은 언제나 고를 수 있다(고정) — 자리를 눌러서 연다
  await tap(page, '[data-seat-edit][data-ti="0"][data-si="2"]');
  await page.fill('.sdb-nm', '아이');
  await tap(page, '.dk-chip[data-drink="N"]');   // 논알콜
  const afterN = await page.evaluate(() => ({ d: SEATFLOW.tables[0].drinks[2], counts: (document.querySelector('.ss-drinks') || {}).textContent || '' }));
  ok(afterN.d === 'N', '논알콜 스파클링은 알콜과 무관하게 자리별로 고를 수 있다', String(afterN.d));

  /* ★[KID_SEAT] 아이 자리 — 음료 한 칸으로 물과 유아용 의자를 함께 정한다.
     코드 K 는 mypage·guide·admin·80_production 네 곳이 한 벌이라, 화면에서 골라지는지만 봐서는 부족하다.
     저장 왕복은 data-roundtrip ①-a 가, 하객·관리자 표시는 아래 라벨 대조가 맡는다. */
  console.log('\n[유아 자리]');
  await tap(page, '[data-seat-edit][data-ti="1"][data-si="0"]');
  await page.click('.sdb-nm');
  await page.keyboard.type('아기', { delay: 30 });
  await new Promise((r) => setTimeout(r, 120));
  const kidChips = await page.evaluate(() => [...document.querySelectorAll('.dk-chip')].map((b) => b.textContent.trim()));
  ok(kidChips.some((t) => /유아/.test(t)), '자리 창에 유아 칸이 있다', kidChips.join(' / '));
  await tap(page, '.dk-chip[data-drink="K"]');
  const kid = await page.evaluate(() => ({
    d: SEATFLOW.tables[1].drinks[0],
    alc: _seatAlc(),
    pills: (document.querySelector('.ss-drinks') || {}).textContent || '',
    dot: !!document.querySelector('.rs-dk.dk-K'),
    chipSub: (document.querySelector('.dk-chip[data-drink="K"] .dk-sub') || {}).textContent || '',
    kidOn: !!document.querySelector('.dk-chip[data-drink="K"].on'),
    youngOn: !!document.querySelector('.dk-chip[data-drink="Y"].on'),
  }));
  ok(kid.d === 'K', '유아를 고르면 그 자리에 K 가 남는다', String(kid.d));
  ok(kid.alc === 'C', '유아는 알콜로 세지 않는다(행사 알콜은 그대로)', kid.alc);
  ok(/유아/.test(kid.pills), '요약 집계에 유아가 뜬다(하이체어 수량)', kid.pills.replace(/\s+/g, ' '));
  ok(kid.dot, '캔버스 색점도 유아 색으로 찍힌다');
  ok(/유아용 의자/.test(kid.chipSub), '유아 칸이 유아용 의자를 준비한다고 말한다', kid.chipSub);
  ok(kid.kidOn && !kid.youngOn, '유아를 고르면 유아만 켜진다(어린이와 섞이지 않는다) [KID_CHAIR]', kid.kidOn + '/' + kid.youngOn);
  await tap(page, '[data-seat-edit][data-ti="1"][data-si="1"]');
  await page.click('.sdb-nm');
  await page.keyboard.type('큰애', { delay: 30 });
  await new Promise((r) => setTimeout(r, 120));
  await tap(page, '.dk-chip[data-drink="Y"]');
  const yng = await page.evaluate(() => ({ d: SEATFLOW.tables[1].drinks[1], c: seatDrinkCounts(SEATFLOW.tables), pills: (document.querySelector('.ss-drinks') || {}).textContent || '' }));
  ok(yng.d === 'Y', '어린이도 자리별로 고를 수 있다 [KID_CHAIR]', String(yng.d));
  ok(yng.c.K === 1 && yng.c.Y === 1, '유아용 의자 수량은 유아만 센다(어린이는 안 센다)', 'K=' + yng.c.K + ' Y=' + yng.c.Y);
  ok(/어린이/.test(yng.pills), '요약에 어린이도 따로 뜬다', yng.pills.replace(/\s+/g, ' '));
  await page.screenshot({ path: path.join(OUT, 'seat-6-유아-390.png'), fullPage: false });

  /* ★[SEAT_NOTE] 「미리 알려주실 것」 — 칩으로 못 적는 것(거동 불편·아기 나이)을 받는 칸.
     ★[ALLERGY_ASK_OFF 2026-08-16] 화면에서 알레르기는 **묻지 않는다**(사용자 지시). 아래 입력값에 그 단어가
       남아 있는 것은 '고객이 그렇게 적으면 그대로 저장되는가'를 재는 것이지, 우리가 묻는다는 뜻이 아니다.
     이 칸이 없던 반년 동안 관리자 화면은 빈 '알레르기·특이사항' 줄을 계속 그리고 있었다.
     그래서 여기서 보는 것은 '입력칸이 있다'가 아니라 **적은 값이 final 트랙 페이로드에 실려 나가는가**다. */
  console.log('\n[미리 알려주실 것]');
  const noteSent = await page.evaluate(async () => {
    const sent = [];
    const orig = window.apiTrackSave;
    window.apiTrackSave = (p) => { sent.push(p); return Promise.resolve({ ok: true }); };
    const ta = document.querySelector('[data-seat-note]');
    if (!ta) { window.apiTrackSave = orig; return { no: true }; }
    ta.value = '3번 테이블 아기 8개월 · 땅콩 알레르기 한 분';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 200));
    window.apiTrackSave = orig;
    const fin = sent.filter((p) => p && p.track === 'final').pop();
    return { no: false, ph: ta.getAttribute('placeholder') || '', max: ta.getAttribute('maxlength'),
      allergy: fin ? String((fin.draft || {}).allergy || '') : '(final 저장 없음)',
      head: fin ? String((fin.draft || {}).headcount || '') : '' };
  });
  ok(!noteSent.no, '좌석 화면에 「미리 알려주실 것」 칸이 있다');
  ok(/땅콩 알레르기/.test(noteSent.allergy), '적은 내용이 final 트랙의 allergy 로 저장된다(관리자 화면이 읽는 그 칸)', noteSent.allergy);
  ok(noteSent.head !== '', '같은 저장에 인원도 함께 실린다(파생값을 지우지 않는다) [SEAT_ROW_TRUTH]', noteSent.head);
  ok(noteSent.max === '300', '길이 상한이 걸려 있다', String(noteSent.max));

  /* ★[SEAT_NOTE_TRUTH] 저장이 실패했는데 '저장됐어요'라고 말하지 않는가.
     첫 판이 그랬다 — 서버가 끊겨도 초록 글씨가 떴다. 여기 적히는 것은 알레르기라,
     안 닿았는데 닿았다고 말하면 두 분은 말한 줄 알고 당일을 맞는다. */
  console.log('\n[저장 실패를 실패라고 말하는가]');
  const lie = await page.evaluate(async () => {
    const orig = window.apiTrackSave;
    window.apiTrackSave = () => Promise.reject(new Error('네트워크 끊김'));
    const ta = document.querySelector('[data-seat-note]');
    ta.value = '새우 알레르기 한 분';
    ta.dispatchEvent(new Event('input', { bubbles: true }));
    ta.dispatchEvent(new Event('blur', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 400));
    const st = (document.querySelector('[data-seat-note-st]') || {}).textContent || '';
    window.apiTrackSave = orig;
    return st;
  });
  ok(!/저장됐어요/.test(lie), "서버가 끊기면 '저장됐어요'라고 하지 않는다 [SEAT_NOTE_TRUTH]", lie);
  ok(/안 됐어요/.test(lie), '실패했다고 분명히 말한다', lie);

  /* ★[CF_SEAT_DRINK] 확인서 — 두 분이 도장을 찍는 자리에 음료 집계와 특이사항이 실리는가.
     유아 수 = 당일 유아용 의자 수량이라, 여기서 눈에 걸려야 틀린 채로 확정되지 않는다. */
  console.log('\n[확인서에 실리는가]');
  const cf = await page.evaluate(() => {
    const p = { tracks: { seat: '완료', final: '완료' },
      seatDraft: { tables: [{ name: '테이블 1', side: 'L', seats: ['김희준', '이미쿠', '아기', '큰애'], drinks: ['C', 'N', 'K', 'Y'] }] },
      finalDraft: { headcount: '4', allergy: '8개월 아기 · 새우 알레르기 한 분' }, guideinfoDraft: { seatMode: 'all' } };
    let h = ''; try { h = String(prodConfirmHtml(p, {}) || ''); } catch (e) { h = 'ERR ' + e.message; }
    const plain = h.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    return { drink: /유아 1\(유아용 의자\)/.test(plain) && /어린이 1/.test(plain),
      /* ★[CF_DRINK_ONE 2026-08-16] 집계는 **한 번만** 실려야 한다. 병렬 세션 둘이 같은 날 각각 넣어
         「좌석 · 음료」와 「좌석 배치」 두 줄에 서로 다른 말로 겹쳐 있었다(사용자가 화면에서 발견).
         자리를 옮겨도 이 수는 1이어야 한다 — 두 곳에 두는 순간 다시 2가 되어 붉어진다. */
      drinkOnce: (plain.match(/샴페인 \d/g) || []).length,
      note: /새우 알레르기 한 분/.test(plain),
      falseWarn: /미리 알려주실 것 미완료/.test(plain) };
  });
  ok(cf.drink, '확인서에 음료 집계(유아·어린이 포함)가 실린다 [CF_SEAT_DRINK]');
  ok(cf.drinkOnce === 1, '음료 집계는 확인서에 한 번만 실린다 [CF_DRINK_ONE]', '샴페인 집계 ' + cf.drinkOnce + '회');
  ok(cf.note, '확인서에 「미리 알려주실 것」이 실린다 [SEAT_NOTE]');
  const cf2 = await page.evaluate(() => {
    const p = { tracks: { seat: '완료', final: '완료' }, seatDraft: { tables: [{ seats: ['김희준'], drinks: ['C'] }] }, finalDraft: { headcount: '1' }, guideinfoDraft: {} };
    let h = ''; try { h = String(prodConfirmHtml(p, {}) || ''); } catch (e) {}
    return /미리 알려주실 것/.test(h.replace(/<[^>]+>/g, ' '));
  });
  ok(!cf2, "안 적었으면 그 줄 자체가 없다(빈 값을 '미완료'로 겁주지 않는다)", String(cf2));

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
  await tap(page, '[data-seat-edit][data-ti="1"][data-si="3"]');   // 앞 절에서 손대지 않은 빈 자리(유아 절이 si 0 을 K 로 만들어 둔다)
  await page.click('.sdb-nm');
  await page.keyboard.type('새하객', { delay: 30 });
  await new Promise((r) => setTimeout(r, 120));
  const fresh = await page.evaluate(() => {
    renderSeat(document.getElementById('mp_production'));
    return { d: SEATFLOW.tables[1].drinks[3], clear: document.querySelectorAll('.sdb-clear').length, on: [...document.querySelectorAll('.dk-chip.on')].map((b) => b.textContent.trim()).join(',') };
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
  ok(mixed.chips === 5, '섞여 있을 땐 알콜 둘을 다 보여 준다(무엇으로 되어 있는지 보여야 고친다)', String(mixed.chips));
  ok(/섞여/.test(mixed.warn), '요약 카드가 섞인 상태를 알려 준다', mixed.warn.replace(/\s+/g, ' ').slice(0, 60));
  ok(/섞여/.test(mixed.note), '자리 창도 같은 사실을 말한다', mixed.note);

  /* ★[SEAT_FIT] 이름이 세 글자만 넘어가도 자리 알약이 카드 밖으로 30px 넘게 나가던 것(390px 실측).
     지그재그 배율(_seatZig 1.9→1.15)과 --zig(26→20)로 잡았다 — 숫자를 도로 키우면 여기서 붉게 진다. */
  console.log('\n[긴 이름이 카드 밖으로 안 나간다]');
  await openSeat(page, [
    { name: '양가 부모님', side: 'L', seats: ['김희준', '이미쿠', '아버님', '어머님'], drinks: ['C', 'C', 'C', 'C'] },
    { name: '', side: 'R', seats: ['고모', '이모', '삼촌', '사촌형'], drinks: ['C', 'N', 'C', 'C'] },
    { name: '친구', side: 'L', seats: ['친구A', '친구B', '친구C', '친구D'], drinks: ['C', 'C', 'N', 'C'] },
    { name: '회사', side: 'R', seats: ['회사동료', '선배', '후배', '최고참'], drinks: ['C', 'C', 'C', 'C'] },
  ]);
  const fit = await page.evaluate(() => {
    const card = document.getElementById('mp_production').querySelector('.seat-card').getBoundingClientRect();
    let worst = 0, who = '', clash = 0;
    document.querySelectorAll('#mp_production .rs').forEach((b) => {
      const r = b.getBoundingClientRect();
      const o = Math.max(Math.round(card.left - r.left), Math.round(r.right - card.right));
      if (o > worst) { worst = o; who = (b.textContent || '').trim(); }
    });
    document.querySelectorAll('#mp_production .rt-wrap').forEach((w) => {
      const cap = w.querySelector('.rt-cap'); if (!cap) return;
      const c = cap.getBoundingClientRect();
      w.querySelectorAll('.rs').forEach((b) => {
        const r = b.getBoundingClientRect();
        if (Math.min(c.right, r.right) - Math.max(c.left, r.left) > 0 && Math.min(c.bottom, r.bottom) - Math.max(c.top, r.top) > 0) clash++;
      });
    });
    return { worst, who, clash, caps: document.querySelectorAll('#mp_production .rt-cap').length };
  });
  ok(fit.worst <= 2, '390px에서 자리 알약이 카드 테두리를 넘지 않는다 [SEAT_FIT]', fit.worst + 'px ' + fit.who);
  ok(fit.caps === 3, '테이블 이름은 원 아래 한 줄로 나온다', String(fit.caps));
  ok(fit.clash === 0, '테이블 이름이 자리 알약과 겹치지 않는다 [SEAT_FIT]', String(fit.clash));
  await page.screenshot({ path: path.join(OUT, 'seat-5-긴이름-390.png'), fullPage: false });

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
  await tap(page, '[data-seat-edit][data-ti="0"][data-si="0"]');   // 창을 열어 둔 상태에서 잰다(앞 절에서 닫혔을 수 있다)
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
