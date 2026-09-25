/* ★[GUEST_STATE] 하객 두 화면이 «서버가 무엇을 답하든» 같은 규칙으로 말하는지 본다.
 *
 * ── 왜 (2026-09-13 점검 라운드 5 실측)
 *   서버(80_production.gs `_guideCloseInfo`)는 닫는 이유를 **둘로 갈라** 준다:
 *     ①reason:'past'    예식이 실제로 +30일 지났다 → 정상 종료 (문의처를 일부러 안 붙인다)
 *     ②reason:'unknown' 예식일을 모른다(되돌림·미기입) → 사고 (문의처를 붙여야 한다)
 *   2026-08-21 [GUIDE_EXPIRE_REASON] 이 이 구분을 넣었는데 **guide.html 에만 내렸다.**
 *   seat.html 은 `d.expired` 만 보고 둘 다 「예식이 끝나 좌석 안내가 닫혔어요」로 말했고,
 *   그 화면엔 **출구가 0개**였다 — 아직 하지도 않은 예식을 끝났다고 듣고 물어볼 곳도 없었다.
 *   두 벌 중 한 벌만 고친 자리다. 한 화면만 봐서는 영영 안 보인다.
 *
 * ── 무엇을 재나
 *   서버가 낼 수 있는 응답 모양을 하나씩 실제로 먹여 ①어느 화면이 뜨는지 ②출구가 몇 개인지 잰다.
 *   **두 화면에 같은 표를 적용한다** — 그래야 한쪽만 고친 것이 드러난다.
 *
 * 종료코드: 0 통과 · 1 어긋남 · 2 브라우저가 없어 못 쟀다
 * 쓰기: node scripts/audit/guest-state.mjs
 */
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
/* ★[FREE_PORT 2026-09-13 점검 라운드 8] 포트를 커널에서 받는다 — 박아 두면 짝이 생긴다.
   실측: 8534 를 다른 프로세스가 쥐고 있을 때 이 검사가 「예식이 끝나…라고 말해야 하는데」로
   **제품 결함처럼** 붉어졌다. 원인은 화면이 아니라 포트였다. _freeport.mjs 머리말이
   2026-08-30 에 같은 사고를 이미 적어 뒀는데(19개 감사가 그래서 이걸 쓴다) 내가 새로 만들며 빠뜨렸다. */
const { freePort } = await import('./_freeport.mjs');
const PORT = await freePort();
const TOK = 'G1234567890abcd';

/* [이름, 서버 응답, 화면에 있어야 할 말, 출구 규칙]
     출구 규칙 — 'none': 0개여야 한다(정상 종료라 문의처를 안 붙인다) · 'exit': 1개 이상이어야 한다 · 'any': 안 본다 */
const SHAPES = [
  ['만료 · 예식이 끝남', { ok: false, expired: true, reason: 'past', error: '예식이 끝나 안내가 닫혔어요.', help: false },
    '예식이 끝나', 'none'],
  ['만료 · 날짜를 모름', { ok: false, expired: true, reason: 'unknown', error: '안내를 준비하고 있어요. 예식 정보가 확정되면 다시 열려요.', help: true },
    '준비하고 있어요', 'exit'],
  ['토큰이 틀림', { ok: false, error: '안내를 찾을 수 없어요.' }, '찾을 수 없어요', 'exit'],
  ['서버가 ok 만 줌', { ok: true }, '찾을 수 없어요', 'exit'],
  ['빈 객체', {}, '찾을 수 없어요', 'exit'],
];
const PAGES = [['guide.html?g=' + TOK, '하객 안내'], ['seat.html?t=' + TOK, '좌석 안내']];

let pw = null;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require_(p); break; } catch {} }
if (!pw) { console.log('· playwright 가 없어 못 쟀습니다(화면 결함이 아닙니다). 종료 2 = 못 쟀다'); process.exit(2); }
function findExe() {
  for (const root of [process.env.PLAYWRIGHT_BROWSERS_PATH, '/opt/pw-browsers'].filter(Boolean)) {
    try { for (const d of fs.readdirSync(root)) if (/^chromium-\d+$/.test(d)) {
      const e = path.join(root, d, 'chrome-linux', 'chrome'); if (fs.existsSync(e)) return e; } } catch {}
  }
  return null;
}
let browser = null;
try { browser = await pw.chromium.launch(); }
catch { const e = findExe(); if (e) { try { browser = await pw.chromium.launch({ executablePath: e }); } catch {} } }
if (!browser) { console.log('· 크로미움을 못 띄워 못 쟀습니다. 종료 2 = 못 쟀다'); process.exit(2); }

const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1500));

let bad = 0;
for (const [pg, label] of PAGES) {
  console.log(`\n  ═══ ${label} ═══`);
  for (const [name, body, want, exitRule] of SHAPES) {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');   // [PREVIEW_GUARD_TEST_OFF]
    await page.route('**', (route) => {
      const u = route.request().url();
      if (u.includes('script.google.com')) return route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(body) });
      if (u.startsWith(`http://localhost:${PORT}`)) return route.continue();
      return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
    });
    try { await page.goto(`http://localhost:${PORT}/${pg}`, { waitUntil: 'networkidle', timeout: 15000 }); } catch {}
    await page.waitForTimeout(1600);
    const m = await page.evaluate(() => ({
      txt: (document.body.innerText || ''),
      n: [...document.querySelectorAll('button,a[href],[role=button]')]
        .filter(e => e.getBoundingClientRect().width > 0 && (e.textContent || '').trim()).length,
    }));
    /* ★[SERVED_OURS] 우리 화면이 맞는지 먼저 본다 — 아니면 «틀렸다»가 아니라 «못 쟀다»(2)다.
       실측: 포트를 다른 프로세스가 쥐면 파이썬의 404 쪽이 떠서, 이 검사가 제품 결함처럼 붉었다.
       freePort 로 충돌 자체를 없앴지만(위), 서버가 안 떴을 때도 같은 오진이 나므로 한 겹 더 둔다. */
    if (!/MOMENT/i.test(m.txt)) {
      console.log(`  · 못 쟀다 — ${label} 자리에 우리 화면이 아닌 것이 떴다(서버가 안 떴거나 포트를 뺏겼다)`);
      await page.close(); await browser.close(); try { server.kill(); } catch {}
      process.exit(2);
    }
    const said = m.txt.indexOf(want) !== -1;
    const exitOk = exitRule === 'any' || (exitRule === 'none' ? m.n === 0 : m.n >= 1);
    if (said && exitOk) console.log(`    ok ${name} — 「${want}」 · 출구 ${m.n}개`);
    else {
      bad++;
      const head = m.txt.trim().split('\n').filter(Boolean).slice(0, 2).join(' · ').slice(0, 56);
      if (!said) console.log(`    ✗ ${name} — 「${want}」라고 말해야 하는데 「${head}」`);
      else console.log(`    ✗ ${name} — 출구가 ${exitRule === 'none' ? '없어야' : '있어야'} 하는데 ${m.n}개다`);
    }
    await page.close();
  }
}
await browser.close(); try { server.kill(); } catch {}

console.log(`\n[GUEST_STATE] ${PAGES.length}화면 × ${SHAPES.length}응답 = ${PAGES.length * SHAPES.length}칸 — 어긋남 ${bad}건`);
if (bad) console.log('  두 화면은 같은 규칙으로 말해야 한다. 한쪽만 고치면 여기서 걸린다.');
process.exit(bad ? 1 : 0);
