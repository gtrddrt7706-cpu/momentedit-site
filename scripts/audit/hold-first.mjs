// 예약 화면(schedule.html) [HOLD_FIRST] · [CR_OPTIN] 실동작 — 사장님 «추천대로»(2026-09-25)로 적용한 두 결정이
// 실제 화면에서 그렇게 도는지 잰다. 문자열이 아니라 «눌러 보고 보내진 값»으로 본다.
//
//   ★[HOLD_FIRST] 임시 고정 체크를 달력 «앞»에 두고, 체크하면 7일 안 상담일만 연다 — 두 번 고를 일을 없앤다.
//     ① 체크가 달력보다 앞에 있다
//     ② 체크하면 오늘+7일 밖 날짜는 고를 수 없다(서버 백스톱 consultation-booking «7일 규칙 백스톱»과 같은 경계)
//     ③ 먼 날짜를 먼저 골랐으면 비우고 달력 위에 알린다 → 7일 안 날짜를 다시 고르면 그 안내는 내려간다
//     ④ 7일 안에 빈 상담이 하나도 없으면 체크를 잠그고 까닭을 적는다
//     ⑤ boot() 는 캐시→서버 두 번 돈다 — 캐시엔 없고 서버엔 있으면 잠금이 «풀려야» 한다
//     ⑥ 임시 고정 값(예식 날짜·시간)이 신청에 실려 간다
//   ★[CR_OPTIN] 현금영수증은 «제 번호로 받을게요»를 고를 때만 칸이 열린다.
//     ⑦ 처음엔 칸이 닫혀 있고, 안 고르고 신청하면 빈 값(=자진발급)으로 간다
//     ⑧ 골랐는데 비우면 신청이 막히고 까닭이 보인다
//     ⑨ 자동완성 «+82 10-…»는 010 으로 간다([PHONE_AUTOFILL_82] 가 이 칸에서도 산다)
//   ★[COPY_ACCT_GLOBAL] ⑩ 계좌 옆 «복사» 버튼이 실제로 복사하고(오류 없음) 높이 40px 이상이다 — 버튼이 조용히 죽어 있던 것을 여기서 잡았다.
//   ★[SCH_LIVE] ⑪ 날짜를 비운 까닭 · 복사 결과가 늘 있는 라이브 영역으로 간다(나타났다 사라지는 상자는 낭독기가 제때 못 읽는다)
//   ★⑫ 새로고침이 체크만 되살려도 예식 날짜·시간 칸이 열린다 · ★[SCH_INERT] ⑬ 접힌 예약금 영역은 시간을 고르기 전 inert
//   ★[SERVED_OURS] 파일·브라우저가 없으면 «틀렸다(1)»가 아니라 «못 쟀다(2)».
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const cant = (msg) => { console.log('━━ hold-first — ' + msg + ' · 재지 못한 것이지 결함이 아닙니다'); process.exit(2); };
if (!fs.existsSync(path.join(ROOT, 'schedule.html'))) cant('schedule.html 이 없습니다');

let eng = null;
try { const { launchBrowser } = await import('./_browser.mjs'); eng = await launchBrowser(); } catch (e) {}
if (!eng) cant('브라우저가 없습니다');
if (eng.kind !== 'playwright') { await eng.close(); cant('이 검사는 playwright 로만 돕니다'); }

const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { r.writeHead(404); return r.end(); }
  r.writeHead(200, { 'Content-Type': f.endsWith('.js') ? 'text/javascript' : 'text/html; charset=utf-8' });
  r.end(fs.readFileSync(f));
});
await new Promise((res) => srv.listen(0, res));
const port = srv.address().port;

// 날짜 — 화면의 today 와 같은 시계(이 기계의 지역 시각)로 만든다. 키는 화면과 같은 비패딩 'Y-M-D'
const T = new Date(); T.setHours(0, 0, 0, 0);
const dOf = (off) => { const d = new Date(T); d.setDate(d.getDate() + off); return d; };
const dk = (off) => { const d = dOf(off); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
const LIM = dOf(7);
const availFrom = (a, b) => { const o = []; for (let i = a; i <= b; i++) if (i % 3 !== 1) o.push(dk(i)); return o; };
const AV = (avail) => ({ ok: true, avail, full: {}, currentDate: '', holdActive: false,
  slotsWeekday: ['11:30', '14:50', '18:10', '19:30'], slotsWeekend: ['18:20'], duration: 40,
  names: '정하윤 · 김도현', depositStr: '100,000', account: '기업 000-000-00000', holder: '모먼트에디트' });
const NEAR = AV(availFrom(2, 40));          // 7일 안에도 밖에도 상담일이 있다
const FAR_ONLY = AV(availFrom(9, 40));      // 7일 안 상담일이 하나도 없다
const TOKEN = 'tok_hold_first_000000';
const CACHE_KEY = 'me_sched_avail_v1:' + TOKEN.slice(-10);

const bad = [];
const ok = (c, msg) => { if (!c) bad.push(msg); };

async function open({ server, cache = null, delay = 0 }) {
  const pg = await eng.newPage({ port, viewport: { width: 390, height: 844 } });
  await pg.page.addInitScript((cfg) => {
    try { localStorage.setItem('me_token', cfg.token); if (cfg.cache) localStorage.setItem(cfg.cacheKey, JSON.stringify({ at: Date.now(), data: cfg.cache })); } catch (e) {}
    window.__gasLog = [];
    const _f = window.fetch;
    window.fetch = function (u, o) {   // 요청마다 다른 답 · 보낸 값 기록(공용 어댑터는 한 가지 답만 준다)
      if (String(u).indexOf('script.google.com') !== -1) {
        let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
        window.__gasLog.push(b);
        let res = { ok: true };
        if (b.action === 'getAvailability') res = cfg.server;
        else if (b.action === 'weddingAvailability') res = { ok: true, taken: {} };
        const wait = b.action === 'getAvailability' ? cfg.delay : 0;
        return new Promise((r) => setTimeout(() => r(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })), wait));
      }
      return _f.apply(this, arguments);
    };
  }, { token: TOKEN, cacheKey: CACHE_KEY, cache, server, delay });
  pg.page.setDefaultTimeout(8000);   // 막히면 30초씩 기다리지 말고 빨리 빨강으로
  await pg.page.goto(`http://localhost:${port}/schedule.html`, { waitUntil: 'load' });
  await pg.page.waitForTimeout(600 + delay);
  return pg;
}
const labelOf = (off) => { const d = dOf(off); return `${d.getFullYear()}년 ${d.getMonth() + 1}월 ${d.getDate()}일 `; };
async function pickDay(page, off) {
  const d = dOf(off), want = d.getFullYear() + ' ' + d.toLocaleString('en', { month: 'long' });
  for (let k = 0; k < 3; k++) {
    const t = await page.$eval('#calTitle', (e) => e.textContent.trim());
    if (t === want) break;
    const nx = await page.$('#nextM'); if (!nx || await nx.isDisabled()) break; await nx.click(); await page.waitForTimeout(120);
  }
  const b = await page.$(`#calGrid button.day.avail[aria-label^="${labelOf(off)}"]`);
  if (!b) return false;
  await b.click(); await page.waitForTimeout(150); return true;
}
async function pickSlot(page) { const s = await page.$('#slots button.slot:not(.full)'); if (!s) return false; await s.click(); await page.waitForTimeout(150); return true; }
const shown = (page, sel) => page.$eval(sel, (e) => !!(e.offsetWidth || e.offsetHeight || e.getClientRects().length)).catch(() => false);
const availDays = (page) => page.$$eval('#calGrid button.day.avail', (a) => a.map((x) => x.getAttribute('aria-label')));
const submits = (page) => page.evaluate(() => window.__gasLog.filter((b) => b.action === 'submitSchedule'));
const nearOff = [2, 3, 5, 6].find((i) => i % 3 !== 1);
const farOff = (() => { for (let i = 10; i < 40; i++) if (i % 3 !== 1) return i; return 11; })();
const errs = [];
// 장면 하나가 도중에 멈추면(버튼을 못 누름 · 화면 스크립트가 깨짐) 그 자리에서 빨강 한 줄로 남기고 다음 장면으로 간다 — 통째로 죽지 않게
async function step(opts, fn) {
  let pg = null;
  try { pg = await open(opts); await fn(pg.page, pg.errors); }
  catch (e) { bad.push('실행 도중 멈춤 — ' + String((e && e.message) || e).split('\n')[0]); }
  finally { if (pg) { errs.push(...pg.errors); await pg.page.close().catch(() => {}); } }
}

// ── ①②③ 순서 · 좁힘 · 비우고 알림 · 다시 고르면 내려감
await step({ server: NEAR }, async (page, errors) => {
  const order = await page.evaluate(() => { const h = document.getElementById('holdWrap'), g = document.getElementById('calGrid'); return !!(h && g && (h.compareDocumentPosition(g) & Node.DOCUMENT_POSITION_FOLLOWING)); });
  ok(order, '① 임시 고정 체크(#holdWrap)가 상담 달력보다 뒤에 있다 — [HOLD_FIRST] 는 «앞»이다');
  ok(await pickDay(page, farOff), `준비: 먼 날짜(+${farOff}일)를 못 골랐다`);
  await pickSlot(page);
  await page.click('#holdChk'); await page.waitForTimeout(300);
  const sel = await page.$('#calGrid button.day.sel');
  ok(!sel, '③ 먼 날짜를 골라 둔 채 체크했는데 그 날짜가 그대로 선택돼 있다');
  ok(await shown(page, '#holdCalNote'), '③ 날짜를 비웠는데 «비워 두었어요» 안내가 안 보인다');
  await page.waitForTimeout(150);
  const live = await page.$eval('#srLive', (e) => e.textContent).catch(() => '');
  ok(/비워 두었어요/.test(live), `⑪ [SCH_LIVE] 날짜를 비운 까닭이 라이브 영역(#srLive)에 없다 — 낭독기가 못 읽는다(«${live}»)`);
  // 좁힘 — 보이는 달의 가능일이 전부 오늘+7일 안인가(달을 넘겨 가며 전부)
  let seen = [];
  for (let k = 0; k < 3; k++) {
    seen = seen.concat(await availDays(page));
    const nx = await page.$('#nextM'); if (!nx || await nx.isDisabled()) break; await nx.click(); await page.waitForTimeout(120);
  }
  const outside = seen.filter((l) => { const m = l.match(/^(\d+)년 (\d+)월 (\d+)일/); return m && new Date(+m[1], +m[2] - 1, +m[3]) > LIM; });
  ok(seen.length > 0, '② 체크했더니 고를 수 있는 상담일이 하나도 없다(7일 안 상담일이 있는데)');
  ok(outside.length === 0, `② 체크했는데 7일 밖 날짜가 열려 있다: ${outside.slice(0, 3).join(' / ')}`);
  // 다시 7일 안 날짜를 고르면 안내는 끝난 말이다
  await page.goto(`http://localhost:${port}/schedule.html`, { waitUntil: 'load' }).catch(() => {});
  await page.waitForTimeout(600);
  await pickDay(page, farOff); await page.click('#holdChk'); await page.waitForTimeout(300);
  ok(await pickDay(page, nearOff), `③ 체크 뒤 7일 안 날짜(+${nearOff}일)를 못 골랐다`);
  ok(!(await shown(page, '#holdCalNote')), '③ 7일 안 날짜를 다시 골랐는데 «비워 두었어요» 안내가 남아 있다');
  // 체크를 풀면 다시 넓은 달력
  await page.click('#holdChk'); await page.waitForTimeout(300);
  let wide = [];
  for (let k = 0; k < 3; k++) {
    wide = wide.concat(await availDays(page));
    const pv = await page.$('#prevM'); if (!pv || await pv.isDisabled()) break; await pv.click(); await page.waitForTimeout(120);
  }
  const back = await page.evaluate(() => (document.getElementById('calLegendMuted') || {}).textContent || '');
  ok(/표시된 날짜만/.test(back), '체크를 풀었는데 달력 아래 안내가 «7일 안»으로 남아 있다');
});

// ── ⑫ 새로고침·뒤로가기가 체크만 되살린 상태(change 없음)에서도 예식 날짜·시간 칸이 함께 열린다
await step({ server: NEAR }, async (page) => {
  const vis = await page.evaluate(() => { const c = document.getElementById('holdChk'); c.checked = true; if (window.__holdApply) window.__holdApply(); const b = document.getElementById('holdBox'); return getComputedStyle(b).display; });
  ok(vis === 'block', `⑫ 체크가 되살아났는데 예식 날짜·시간 칸(#holdBox)이 닫혀 있다(display ${vis}) — 제출하면 안 보이는 칸으로 스크롤한다`);
});

// ── ④ 7일 안 빈 상담이 없으면 잠금 · ⑤ 캐시엔 없고 서버엔 있으면 풀림
await step({ server: FAR_ONLY }, async (page, errors) => {
  ok(await page.$eval('#holdChk', (e) => e.disabled), '④ 7일 안 상담이 없는데 임시 고정 체크가 열려 있다');
  ok(await shown(page, '#holdNone'), '④ 체크를 잠갔는데 까닭(#holdNone)이 안 보인다');
});
await step({ server: NEAR, cache: FAR_ONLY, delay: 500 }, async (page, errors) => {
  ok(!(await page.$eval('#holdChk', (e) => e.disabled)), '⑤ 캐시(7일 안 없음) 뒤 서버(있음)로 다시 그렸는데 체크가 잠긴 채다 — boot 두 번째에 «풀기»가 없다');
  ok(!(await shown(page, '#holdNone')), '⑤ 서버 응답 뒤에도 «신청하실 수 없어요» 안내가 남아 있다');
});

// ── ⑦⑧⑨ 현금영수증 · ⑥ 임시 고정 값
await step({ server: NEAR }, async (page, errors) => {
  ok(!(await shown(page, '#depCRBox')), '⑦ 처음부터 현금영수증 번호 칸이 열려 있다 — «제 번호로 받을게요»를 고를 때만 열린다');
  ok(await page.$eval('#guide', (g) => g.inert === true), '⑬ [SCH_INERT] 시간을 고르기 전 접힌 예약금 영역이 inert 가 아니다 — Tab·낭독기에 잡힌다');
  await pickDay(page, nearOff); await pickSlot(page);
  ok(await page.$eval('#guide', (g) => g.inert === false), '⑬ 시간을 골랐는데 예약금 영역이 아직 inert 다 — 입금자명을 못 적는다');
  await page.fill('#depPayer', '정하윤');
  ok(await shown(page, '#depCRAuto'), '⑦ 번호 칸이 닫혀 있는데 «안 적으셔도 발급돼요» 안내가 안 보인다');
  // ⑩ [COPY_ACCT_GLOBAL] 계좌 옆 «복사» 버튼이 실제로 동작하는가(onclick 이 전역 함수를 찾는다)
  const nErr = errors.length;
  await page.click('#acctCopyBtn'); await page.waitForTimeout(200);
  const copied = await page.$eval('#acctCopyBtn', (b) => b.textContent.trim());
  ok(copied === '복사됨' && errors.length === nErr, `⑩ 계좌 «복사» 버튼을 눌렀는데 동작하지 않는다(버튼 «${copied}» · 오류 ${errors.slice(nErr).join(' | ') || '없음'})`);
  const said = await page.$eval('#srLive', (e) => e.textContent).catch(() => '');
  ok(/복사했어요/.test(said), `⑩ 복사 결과가 라이브 영역(#srLive)에 없다 — 낭독기가 복사됐는지 모른다(«${said}»)`);
  const bh = await page.$eval('#acctCopyBtn', (b) => Math.round(b.getBoundingClientRect().height));
  ok(bh >= 40, `⑩ 계좌 «복사» 버튼 높이가 ${bh}px — [SCH_TAP40] 은 40px 이상이다`);
  await page.click('#submitBtn'); await page.waitForTimeout(500);
  let s = await submits(page);
  ok(s.length === 1 && s[0].cashReceipt === '', `⑦ 고르지 않고 신청했는데 현금영수증 값이 «${s[0] && s[0].cashReceipt}» 로 갔다(빈 값 = 자진발급이어야 한다)`);
  ok(s.length === 1 && !s[0].hold, '⑦ 임시 고정을 안 골랐는데 hold 가 실려 갔다');
});
await step({ server: NEAR }, async (page, errors) => {
  await pickDay(page, nearOff); await pickSlot(page);
  await page.fill('#depPayer', '정하윤');
  await page.click('label.cr-want'); await page.waitForTimeout(200);
  ok(await shown(page, '#depCRBox'), '⑧ «제 번호로 받을게요»를 골랐는데 번호 칸이 안 열린다');
  ok(await page.evaluate(() => document.activeElement && document.activeElement.id !== 'depCR'), '⑧ 체크하자마자 번호 칸으로 초점이 옮겨졌다 — 폰에서 자판이 바로 튀어나온다(WCAG 3.2.2)');
  await page.click('#submitBtn'); await page.waitForTimeout(400);
  ok((await submits(page)).length === 0, '⑧ 번호를 비운 채 신청이 나갔다');
  ok(await shown(page, '#depCRErr'), '⑧ 신청을 막았는데 까닭(#depCRErr)이 안 보인다');
  const v = await page.evaluate(() => { const el = document.getElementById('depCR'); el.value = '+82 10-7349-7706'; el.dispatchEvent(new Event('input', { bubbles: true })); return el.value; });
  ok(v === '01073497706', `⑨ 자동완성 +82 가 «${v}» 로 남았다`);
  await page.click('#submitBtn'); await page.waitForTimeout(500);
  const s = await submits(page);
  ok(s.length === 1 && s[0].cashReceipt === '01073497706', `⑨ 신청에 실린 현금영수증 번호가 «${s[0] && s[0].cashReceipt}»`);
});
await step({ server: NEAR }, async (page, errors) => {
  await page.click('#holdChk'); await page.waitForTimeout(300);
  await pickDay(page, nearOff); await pickSlot(page);
  await page.fill('#depPayer', '정하윤');
  const wd = dOf(60); const wds = wd.getFullYear() + '-' + String(wd.getMonth() + 1).padStart(2, '0') + '-' + String(wd.getDate()).padStart(2, '0');
  await page.evaluate((v) => { const h = document.getElementById('holdDate'); h.value = v; h.dispatchEvent(new Event('change', { bubbles: true })); const s = document.getElementById('holdSlot'); s.value = '12:20'; s.dispatchEvent(new Event('change', { bubbles: true })); }, wds);
  await page.click('#submitBtn'); await page.waitForTimeout(500);
  const s = await submits(page);
  ok(s.length === 1 && s[0].hold && s[0].hold.date === wds && s[0].hold.slot === '12:20', `⑥ 임시 고정 값이 신청에 안 실렸다: ${JSON.stringify(s[0] && s[0].hold)}`);
});

await eng.close(); srv.close();
const realErrs = errs.filter((e) => !/Failed to load resource|net::ERR/.test(e));
ok(realErrs.length === 0, '화면 오류: ' + realErrs.slice(0, 3).join(' | '));
if (bad.length) {
  console.log('━━ hold-first — 빨강 ' + bad.length + '건');
  for (const b of bad) console.log('   · ' + b);
  process.exit(1);
}
console.log('━━ hold-first OK — 체크가 달력 앞 · 7일 창 · 비우고 알림/다시 고르면 내려감 · 잠금과 두 번째 boot 풀림 · 임시 고정 값 · 현금영수증 «제 번호로» 선택형(빈 값=자진발급 · 비우면 막힘 · +82→010) · 계좌 복사 버튼 동작');
process.exit(0);
