/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 상담 3화면을 «실제로 띄워» 본다 [CONSULT_RENDER]
 *
 * ★왜 만드나 (2026-09-20 점검 라운드 1)
 *   ScreenA_apply · ScreenB_schedule · ScreenC_change 는 고객이 상담 예약금 100,000원을
 *   내기까지 지나는 화면인데, 저장소의 어떤 감사도 이것을 «렌더»한 적이 없었다.
 *   copy-rule · guest-cap-truth · deploycheck-sim 은 전부 파일을 grep 만 한다.
 *   render-check.mjs 가 도는 목록에도 이 셋은 없다(admin·index·schedule·inquiry·계약서 2판뿐).
 *
 * ★그 사각지대에서 실제로 나온 것 (이 검사를 만든 이유 · 둘 다 390px 실렌더로 찾았다)
 *   [SLOTS_SPAN]  .slots 는 3칸 그리드인데 .time-empty 에 grid-column 이 없어 «1/3 폭»에 갇혔다.
 *                 <br> 로 두 줄로 설계한 글이 네 줄로 쪼개져 보였다. 날짜를 고르기 «전» 화면이라
 *                 모든 방문자가 본다. 지표(pageerror 0 · 가로넘침 0)는 이것을 못 잡는다 —
 *                 스크린샷을 눈으로 보고서야 알았다([NOT_THE_SOURCE]).
 *   [DEPOSIT_HERE] 「상담 예약금 · 신청 시 안내」 — 여기가 바로 그 신청 화면인데 그렇게 적혀 있었다.
 *
 * ★스텁을 손으로 적지 않는다
 *   처음에 depositStr 을 '100,000원' 이라고 손으로 적었더니 ₩100,000원 으로 렌더돼
 *   «제품 버그»처럼 보였다. formatWon 은 쉼표만 넣는다. 그래서 여기서는 CONFIG 와 같은 식을
 *   .gs 에서 읽어 만든다 — 사본을 재면 언제든 갈라진다([RULE_MEASURED]).
 *   avail/full 도 마찬가지다. getAvailability 는 { avail: 배열, full: 객체 } 를 준다 —
 *   처음에 이 둘을 뒤집어 넣어 SERVER.avail.indexOf 가 터졌고, 하마터면 제품 버그로 셀 뻔했다.
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SRC = path.join(ROOT, 'automation/consultation');
const GS = fs.readFileSync(path.join(SRC, 'consultation-booking.gs'), 'utf8');

let fail = 0, unmeasured = 0;
const say = (ok, msg) => { if (!ok) fail = 1; console.log((ok ? 'ok   ' : 'FAIL ') + msg); };

/* ── 서버가 실제로 넘기는 값을 .gs 에서 뽑는다 (손으로 적지 않는다) ── */
const pick = (k) => { const m = GS.match(new RegExp(k + "\\s*:\\s*'([^']*)'")); return m ? m[1] : ''; };
const num = (k) => Number((GS.match(new RegExp(k + '\\s*:\\s*(\\d+)')) || [])[1]);
const arr = (k) => {
  const m = GS.match(new RegExp(k + "\\s*:\\s*\\[([^\\]]*)\\]"));
  return m ? m[1].split(',').map((s) => s.trim().replace(/^'|'$/g, '')).filter(Boolean) : [];
};
const DEPOSIT = num('DEPOSIT');
const formatWon = (n) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ',');   // consultation-booking.gs 의 formatWon 과 같은 식
const DEPOSIT_STR = formatWon(DEPOSIT);
if (!DEPOSIT) { console.log('못 잼: consultation-booking.gs 에서 CONFIG.DEPOSIT 을 못 읽었다'); process.exit(2); }

/* 달력이 «가능일이 있는 달»을 열도록 미래 날짜를 넣는다(오늘 기준이라 해가 바뀌어도 안 낡는다) */
const T = new Date(); T.setHours(0, 0, 0, 0);
const dk = (off) => { const d = new Date(T); d.setDate(d.getDate() + off); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const server = {
  slotsWeekday: arr('SLOTS_WEEKDAY'), slotsWeekend: arr('SLOTS_WEEKEND'), duration: num('SLOT_DURATION_MIN'),
  avail: [dk(7), dk(8), dk(9), dk(14)],          // ★배열 — getAvailability 는 Object.keys(avail) 를 준다
  full: { [dk(8)]: arr('SLOTS_WEEKDAY') },       // ★객체 — addFull(full, dk, time) 가 채운다. 이 날은 전부 마감
  names: '김신랑 · 이신부', token: 'tok123456789', me: false,
};
const SUB = {
  ScreenA_apply: { kakao: pick('KAKAO_URL') },
  ScreenB_schedule: {
    names: server.names, account: pick('ACCOUNT'), holder: pick('ACCOUNT_HOLDER'),
    depositStr: DEPOSIT_STR, kakao: pick('KAKAO_URL'),
    serverJson: JSON.stringify(server).replace(/</g, '\\u003c'),
  },
  ScreenC_change: { names: server.names, token: 'tok1', sig: 's1', curDate: dk(7), curTime: server.slotsWeekday[0] || '11:30', etc: '', flex: '' },
};

/* ── 템플릿 태그를 서버와 같은 방식으로 채운다 ── */
const gesc = (v) => String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
const TMP = fs.mkdtempSync(path.join(process.env.TMPDIR || '/tmp', 'consult-'));
for (const [f, sub] of Object.entries(SUB)) {
  let h = fs.readFileSync(path.join(SRC, f + '.html'), 'utf8');
  /* ★GAS 를 그대로 흉내낸다 — <?= ?> 는 HTML 을 «자동 escape» 하고 <?!= ?> 만 날것이다.
     처음에 둘을 똑같이 치환했더니, GAS 가 막아 주는 자리까지 주입이 통해 「2건」으로 보였다.
     하네스가 제품보다 무르면 없는 버그를 만든다. */
  h = h.replace(/<\?!=\s*JSON\.stringify\((\w+)\)\s*\?>/g, (m, k) => JSON.stringify(sub[k] ?? ''))
    .replace(/<\?=\s*(\w+)\s*\|\|\s*'([^']*)'\s*\?>/g, (m, k, d) => gesc(sub[k] || d))
    .replace(/<\?!=\s*(\w+)\s*\?>/g, (m, k) => sub[k] ?? '')
    .replace(/<\?=\s*(\w+)\s*\?>/g, (m, k) => gesc(sub[k] ?? ''));
  const left = (h.match(/<\?/g) || []).length;
  say(left === 0, `${f} 템플릿 태그 치환 (남은 것 ${left}개)`);
  fs.writeFileSync(path.join(TMP, f + '.html'), h);
}

const eng = await launchBrowser();
if (!eng) { console.log('못 잼: playwright·puppeteer 둘 다 없음 — 통과가 아니라 안 본 것입니다'); process.exit(2); }

const port = 8000 + (process.pid % 900);
const srv = http.createServer((q, r) => {
  const p = path.join(TMP, decodeURIComponent(q.url.split('?')[0]));
  if (!p.startsWith(TMP) || !fs.existsSync(p)) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  r.end(fs.readFileSync(p));
});
await new Promise((res) => srv.listen(port, res));

async function open(file, width) {
  const { page, errors } = await eng.newPage({ port, viewport: { width, height: 900 } });
  await page.goto(`http://localhost:${port}/${file}.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  return { page, errors };
}

/* ── ① 세 화면이 오류 없이 뜨는가 · 390/1280 가로 넘침 0 ── */
for (const f of Object.keys(SUB)) {
  for (const w of [390, 1280]) {
    const { page, errors } = await open(f, w);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    say(errors.length === 0, `${f} @${w} pageerror ${errors.length}${errors.length ? ' · ' + errors[0] : ''}`);
    say(over <= 0, `${f} @${w} 가로 넘침 ${over}px`);
    await page.close();
  }
}

/* ── ② [SLOTS_SPAN] 빈 상태가 슬롯 그리드 «한 칸»에 갇히지 않는가 ──
   .slots 는 3칸 그리드다. grid-column:1/-1 이 없으면 폭이 1/3 로 줄고 글이 네 줄로 쪼개진다.
   폭으로 재는 이유 — pageerror 도 가로 넘침도 이것을 못 잡는다(실측). */
{
  const { page } = await open('ScreenB_schedule', 390);
  const r = await page.evaluate(() => {
    const box = document.querySelector('.slots'), e = document.querySelector('.time-empty');
    if (!box || !e) return null;
    return { box: box.getBoundingClientRect().width, empty: e.getBoundingClientRect().width, lines: e.getClientRects().length };
  });
  if (!r) { say(false, '[SLOTS_SPAN] .slots 또는 .time-empty 를 못 찾음 — 구조가 바뀌었으면 이 검사를 고칠 것'); }
  else {
    const ratio = r.empty / r.box;
    say(ratio > 0.9, `[SLOTS_SPAN] 빈 상태 폭 ${Math.round(r.empty)}px / 슬롯 ${Math.round(r.box)}px (${(ratio * 100).toFixed(0)}% · 90% 초과여야 함)`);
  }
  await page.close();
}

/* ── ③ 돈·정책 문장 (화면과 원천이 같은가) ── */
{
  const { page } = await open('ScreenB_schedule', 390);
  const txt = await page.evaluate(() => document.body.innerText);
  const must = [
    [`₩${DEPOSIT_STR}`, '[DEPOSIT_HERE] 상담 예약금 금액 · CONFIG.DEPOSIT 에서 온 값'],
    ['이후 카카오톡 문의', '[CONSULT_REFUND_TRUTH] 24시간은 «취소 창구»를 가른다'],
    ['전액 환불해 드립니다', '[CONSULT_REFUND_TRUTH] 시착 전 취소는 전액 환불'],
    ['드레스 시착도 상담 당일', '[FITTING_PRECOND] 시착은 계약 전에 한다'],
  ];
  const never = [
    ['반환 불가', '[CONSULT_REFUND_TRUTH] 시간 경과 몰취는 우리 규칙에 없다'],
    ['본 계약을 체결하신 경우', '[FITTING_PRECOND] 순서가 반대다'],
    ['신청 시 안내', '[DEPOSIT_HERE] 여기가 바로 그 신청 화면이다'],
  ];
  for (const [s, why] of must) say(txt.includes(s), `있어야 함 「${s}」 — ${why}`);
  for (const [s, why] of never) say(!txt.includes(s), `없어야 함 「${s}」 — ${why}`);

  /* ★고객 화면에는 전각 줄표를 쓰지 않는다(2026-06-11 지시). «렌더된 글»로 센다 —
     원문 grep 은 주석까지 세서 오탐이 난다(ScreenA 는 원문 19건인데 렌더 0건이었다).
     ScreenC 는 미쿠(운영자) 승인 화면이라 이 규칙 대상이 아니다(링크가 ADMIN_EMAIL 로 간다). */
  const dash = (txt.match(/—/g) || []).length;
  say(dash === 0, `ScreenB 렌더된 글의 전각 줄표 ${dash}건`);
  await page.close();
}
{
  const { page } = await open('ScreenA_apply', 390);
  const dash = await page.evaluate(() => (document.body.innerText.match(/—/g) || []).length);
  say(dash === 0, `ScreenA 렌더된 글의 전각 줄표 ${dash}건`);
  await page.close();
}

/* ── ④ 실제로 눌러 본다 — 가능일을 고르면 시간이 열리는가 · 마감일은 막히는가 ── */
{
  const { page, errors } = await open('ScreenB_schedule', 390);
  const before = await page.evaluate(() => document.querySelectorAll('.slot').length);
  say(before === 0, `날짜 고르기 전 슬롯 ${before}개 (0이어야 함)`);
  const clicked = await page.evaluate(() => {
    const d = [...document.querySelectorAll('.day')].find((e) => e.classList.contains('avail') || e.classList.contains('on') || e.querySelector('.dot'));
    if (!d) return null;
    d.click(); return d.textContent.trim();
  });
  if (clicked === null) { say(false, '가능일 칸을 못 찾음 — 달력 구조가 바뀌었으면 이 검사를 고칠 것'); }
  else {
    await page.waitForTimeout(300);
    const after = await page.evaluate(() => document.querySelectorAll('.slot').length);
    say(after > 0, `가능일 ${clicked}일 클릭 → 시간 슬롯 ${after}개 열림`);
    say(errors.length === 0, `클릭 뒤 pageerror ${errors.length}${errors.length ? ' · ' + errors[0] : ''}`);
  }
  await page.close();
}


/* ── ⑤ [NAME_NODE] 고객이 쓴 성함이 화면에서 «실행»되지 않는가 (카나리) ──
   ScreenB:modalPick 이 innerHTML 이었다. SERVER.names 는 고객이 신청서에 직접 쓴 성함이고,
   서버의 replace 는 스크립트 조기 종료만 막지 innerHTML 을 안전하게 만들지 않는다.
   ★도달을 먼저 증명한다 — 이 화면의 sink 는 google.script.run.withSuccessHandler 안이라,
     스텁이 없으면 «영영 안 돈다». 처음에 그것 없이 재고 「xss 0」 을 보고 안전하다 할 뻔했다.
     도달 0 이면 통과가 아니라 «못 잼»(종료 2)으로 센다([XSS_CANARY] 와 같은 규약). */
{
  const X = '<img src=x onerror="window.__xss=(window.__xss||0)+1">CANARY7788';
  const srv2 = { ...server, names: X };
  const sub2 = { ...SUB.ScreenB_schedule, names: X, serverJson: JSON.stringify(srv2).replace(/</g, '\\u003c') };
  let h = fs.readFileSync(path.join(SRC, 'ScreenB_schedule.html'), 'utf8');
  h = h.replace(/<\?!=\s*(\w+)\s*\?>/g, (m, k) => sub2[k] ?? '')
    .replace(/<\?=\s*(\w+)\s*\?>/g, (m, k) => gesc(sub2[k] ?? ''));
  fs.writeFileSync(path.join(TMP, 'xss.html'), h);

  const { page, errors } = await eng.newPage({ port, viewport: { width: 390, height: 900 } });
  await page.addInitScript(() => {
    window.__ran = 0; let ok = null; const t = {};
    const proxy = new Proxy(t, { get: (o, k) => {
      if (k === 'withSuccessHandler') return (f) => { ok = f; return proxy; };
      if (k === 'withFailureHandler') return () => proxy;
      return () => { window.__ran++; setTimeout(() => ok && ok({ ok: true }), 10); };
    } });
    window.google = { script: { run: proxy, host: { close() {}, setHeight() {} } } };
  });
  await page.goto(`http://localhost:${port}/xss.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(400);
  await page.evaluate(() => { const d = [...document.querySelectorAll('.day')].find((e) => e.querySelector('.dot') || e.classList.contains('avail')); if (d) d.click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const s = document.querySelector('.slot:not(.full)'); if (s) s.click(); });
  await page.waitForTimeout(250);
  await page.evaluate(() => { const b = document.getElementById('submitBtn'); if (b && !b.disabled) b.click(); });
  await page.waitForTimeout(600);
  const r = await page.evaluate(() => ({ ran: window.__ran || 0, xss: window.__xss || 0, imgs: document.querySelectorAll('img[src="x"]').length, seen: (document.body.innerText || '').includes('CANARY7788') }));
  if (!r.ran) {
    console.log('skip [NAME_NODE] 카나리가 sink 에 도달하지 못했습니다(모달 경로 변경?) — 통과가 아니라 안 본 것입니다');
    unmeasured = 1;
  } else {
    say(r.xss === 0 && r.imgs === 0, `[NAME_NODE] 성함 주입 · 도달 ${r.ran}회 · 실행 ${r.xss}회 · 태그 ${r.imgs}개 (실행·태그 모두 0이어야 함)`);
    say(r.seen, '[NAME_NODE] 카나리가 «글자»로는 보인다(값이 지워진 것이 아니라 escape 된 것)');
    say(errors.length === 0, `[NAME_NODE] pageerror ${errors.length}${errors.length ? ' · ' + errors[0] : ''}`);
  }
  await page.close();
}

await eng.close();
srv.close();
fs.rmSync(TMP, { recursive: true, force: true });
console.log(fail ? '\n상담 화면 렌더 — 틀림' : '\n상담 3화면 렌더 이상 없음');
process.exit(fail ? 1 : (unmeasured ? 2 : 0));
