// [XSS_GUEST] 하객 화면 XSS 주입 점검 — guide.html · seat.html
//
// 왜 이 검사인가 (2026-09-20 /점검 라운드 1 · 체크리스트 J4 「다음 점검 라운드 1순위」)
//   ① 기존 xss-check.mjs 는 **mypage.html 하나만** 연다(실측). 하객이 여는 두 화면은 아무도 안 봤다.
//   ② 이 두 화면에 꽂히는 문자열은 **부부가 직접 타이핑한 것**이다 —
//      하객 이름(seatDraft.tables[].seats[]) · 테이블 이름 · 식당 이름/메뉴/전화 · 예약자명.
//      서버는 String() 으로 감쌀 뿐 이스케이프하지 않는다(80_production.gs handleSeatView/handleGuideView).
//   ③ 그리고 이 화면은 **로그인이 없다.** 토큰만 있으면 하객 누구나 연다 — 피해 범위가 제일 넓다.
//
// 통과 기준: 실행(window.__xss) 0 · 주입 요소(img[src=x] · svg[onload]) 0 · pageerror 0
// 종료코드: 0 통과 · 1 주입됨 · 2 재지 못함(playwright 없음)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { chromium = require(p).chromium; break; } catch {} }
if (!chromium) { console.log('SKIP playwright 없음 — 재지 못했다'); process.exit(2); }
const { spawn } = require('child_process');

const X1 = '<img src=x onerror="window.__xss=(window.__xss||0)+1">CANARY7788';
const X2 = '"><svg onload="window.__xss=(window.__xss||0)+1">CANARY7788';
const X3 = "'><svg onload=\"window.__xss=(window.__xss||0)+1\">CANARY7788";

/* ★[XSS_CANARY] 페이로드마다 CANARY7788 을 붙인다 — 그 글자가 화면에 안 보이면
   «주입이 막힌 것»이 아니라 «페이로드가 렌더 경로에 닿지도 않은 것»이다.
   첫 판이 정확히 그랬다: seat.html 을 ?s= 로 열어(실제는 ?t=) 「잘못된 주소예요」만 띄웠는데
   주입 0건이라 «통과»가 나왔다. 0건은 깨끗이 아니라 못 잰 것일 수 있다([NOT_THE_SOURCE]).
   이제 canary 가 없으면 통과가 아니라 «못 쟀다»로 보고한다. */
const CANARY = 'CANARY7788';

/* 응답 모양은 automation/platform/80_production.gs 실물에서 옮겼다.
   전체 배치도 seat:{groom,bride,date,tables:[{name,side,seats[]}]} ·
   이름 검색 hits:[{label,no}] · 안내 허브 guide:{...} */
const SEAT = { ok: true, seat: {
  groom: X1, bride: X2, date: '2027-05-15',
  tables: [
    { name: X1, side: 'L', seats: [X2, X3, '김하객', ''] },
    { name: X2, side: 'R', seats: [X1, '이하객'] },
  ],
} };
const GUIDE = { ok: true, guide: {
  groom: X1, bride: X2, date: '2027-05-15',
  dining: { on: true, pick: X1,
    restos: [{ n: X1, m: X2, tel: X3, url: 'https://example.com' }],
    spots: [{ n: X2, m: X1, tel: X1, url: '' }],
    rtime: X1, rname: X2 },
  seatToken: 'seattok123456', seatFull: true, photoShare: 'https://example.com/p',
} };

const CASES = [
  { name: 'seat.html · 배치도 전체', url: '/seat.html?t=tok123456789', resp: { seatView: SEAT } },
  /* 검색 UI 는 «내 자리만» 모드에서만 그려진다 — 첫 응답으로 그 화면을 띄운 뒤,
     q 가 실린 두 번째 요청에만 hits 를 준다. 한 응답으로 뭉뚱그리면 검색창이 없어 못 잰다. */
  { name: 'seat.html · 이름 검색(hits)', url: '/seat.html?t=tok123456789', search: '김하객',
    resp: { seatView: (b) => (String((b && b.q) || '').trim()
      ? { ok: true, hits: [{ label: X1, no: 3 }, { label: X2, no: 5 }] }
      : { ok: false, mineOnly: true, seat: { groom: X1, bride: X2, date: '2027-05-15' } }) } },
  { name: 'seat.html · 내 자리만 모드', url: '/seat.html?t=tok123456789',
    resp: { seatView: { ok: false, mineOnly: true, seat: { groom: X1, bride: X2, date: '2027-05-15' } } } },
  { name: 'guide.html · 안내 허브', url: '/guide.html?g=tok123456789', resp: { guideView: GUIDE, seatView: SEAT } },
];

const PORT = 8143;
(async () => {
  const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: new URL('../..', import.meta.url).pathname, stdio: 'ignore' });
  await new Promise((r) => setTimeout(r, 900));
  const browser = await chromium.launch();
  const failures = [], unmeasured = [];
  for (const c of CASES) {
    const ctx = await browser.newContext();
    await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');   // [PREVIEW_GUARD_TEST_OFF]
    await ctx.route('**/*', async (route) => {
      const req = route.request(), u = req.url();
      if (u.includes('script.google.com')) {
        let body = {}; try { body = JSON.parse(req.postData() || '{}'); } catch {}
        const spec = c.resp[body.action];
        const resp = (typeof spec === 'function') ? spec(body) : (spec || { ok: true });
        return route.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*' }, contentType: 'application/json', body: JSON.stringify(resp) });
      }
      if (!u.includes('localhost')) return route.abort();
      return route.continue();
    });
    const p = await ctx.newPage();
    const errs = [];
    p.on('pageerror', (e) => errs.push(String(e.message)));
    await p.goto(`http://localhost:${PORT}${c.url}`, { waitUntil: 'domcontentloaded' });
    await p.waitForTimeout(1600);
    if (c.search) {
      try {
        await p.evaluate((q) => {
          const i = document.getElementById('q');
          if (!i) return;
          i.value = q;
          for (const ev of ['input', 'change', 'keyup']) i.dispatchEvent(new Event(ev, { bubbles: true }));
          const f = i.closest('form'); if (f) f.requestSubmit();
        }, c.search);
        await p.waitForTimeout(1400);
      } catch {}
    }
    const r = await p.evaluate((canary) => ({
      xss: window.__xss || 0,
      imgs: document.querySelectorAll('img[src="x"]').length,
      svgs: document.querySelectorAll('svg[onload]').length,
      reached: (document.body.innerHTML || '').includes(canary),
      text: (document.body.innerText || '').length,
    }), CANARY);
    const bad = r.xss > 0 || r.imgs > 0 || r.svgs > 0;
    if (bad) { console.log('  ✗ ' + c.name + ' → ' + JSON.stringify(r)); failures.push(`${c.name} — 주입됨 ${JSON.stringify(r)}`); }
    else if (!r.reached) { console.log('  ?? ' + c.name + ' → 페이로드가 화면에 닿지 않았다(못 쟀다) ' + JSON.stringify(r)); unmeasured.push(c.name); }
    else console.log('  ok ' + c.name + ' → 주입 0 · 페이로드 도달 확인 ' + JSON.stringify(r));
    const real = errs.filter((e) => !/favicon|net::ERR/i.test(e));
    if (real.length) { console.log('    pageerror: ' + real[0].slice(0, 140)); failures.push(`${c.name} — pageerror ${real[0].slice(0, 140)}`); }
    await ctx.close();
  }
  await browser.close(); srv.kill();
  if (failures.length) console.log('\n[XSS_GUEST] 빨강 ' + failures.length + '\n' + failures.join('\n'));
  else if (unmeasured.length) console.log('\n[XSS_GUEST] 못 쟀다 — 페이로드가 안 닿은 경로: ' + unmeasured.join(' · ') + '\n  통과가 아니다. 주소·응답 모양이 바뀌었는지 볼 것.');
  else console.log('\n[XSS_GUEST] 통과 — ' + CASES.length + '경로 전부 페이로드 도달 · 주입 0건');
  process.exit(failures.length ? 1 : (unmeasured.length ? 2 : 0));
})();
