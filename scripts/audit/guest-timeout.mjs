/* ★[GUEST_TIMEOUT] 하객 화면이 «영영 안 오는 응답»에 갇히지 않는지 본다.
 *
 * ── 왜 (2026-09-13 점검 라운드 4 실측)
 *   guide.html·seat.html 에는 시간제한이 **하나도 없었다**(AbortController 0곳).
 *   응답이 오지도 실패하지도 않는 망(패킷이 버려지는 공공 와이파이·지하 예식장)에서
 *   **45초를 기다려도 스피너만 돌았고 버튼이 0개**였다 — 실측 16·30·45초 전부 같았다.
 *   하객은 카톡 링크로 온 일회성 방문자다. 로그인도, 자력 복구도, 다른 경로도 없다.
 *   ★두 화면의 회복 경로(두 번 재시도 → 「불러오지 못했어요」+재시도 버튼)는 **이미 잘 만들어져 있었다.**
 *     fetch 가 끝나지 않아 그 catch 가 영영 안 불렸을 뿐이다. 고친 것은 «끝나게» 한 것뿐이다.
 *   ★서버가 500 이나 연결실패로 «답을 주는» 경우는 그 전에도 정상이었다 — 이 검사가 보는 것은
 *     «아무 답도 없는» 경우 하나다. 그 하나가 코드를 읽어서는 안 보이던 자리다.
 *
 * ── 무엇을 재나
 *   응답을 영영 주지 않는 GAS 를 걸어 두고, 하객이 «누를 수 있는 것»을 언제 보는지 잰다.
 *   12초(gapi) × 재시도 2회 + 물림 → 45초 안에 재시도 버튼이 나와야 한다.
 *
 * 종료코드: 0 통과 · 1 갇힌다 · 2 브라우저가 없어 못 쟀다
 * 쓰기: node scripts/audit/guest-timeout.mjs      (약 100초 · 야간용)
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
/* 설계상 예산은 12초(gapi) + 1.2 + 12 + 3 + 12 = 약 40초다. 실측 41초.
   60초는 그 위의 여유 — CI 가 느린 날 헛울지 않게. 40초 아래로 내리지 말 것(설계 예산을 자르는 값이 된다). */
const DEADLINE = 60000;
/* [주소, 이름, 그 화면이 내야 할 말, 누를 것이 있어야 하나]
   ★cancel.html 은 재시도 버튼이 없다 — 「메일 링크로 다시」가 그 화면의 복구 경로다. 말이 뜨는지만 본다.
     (2026-09-13 라운드 6: guide·seat 만 고치고 cancel 을 빠뜨릴 뻔했다 — 세 벌 중 두 벌만 고치는 그 병이다) */
const PAGES = [
  ['guide.html?g=' + TOK, '하객 안내', /불러오지 못했어요/, true],
  ['seat.html?t=' + TOK, '좌석 안내', /불러오지 못했어요/, true],
  ['cancel.html?token=TKN&sig=SIG', '예약 취소', /불러오지 못했어요/, false],
  /* ★관리자는 «끊지» 않고 «알리기만» 한다(ADM_SLOW_NOTE) — 리포트·장소 스윕처럼 오래 걸리는 호출을
     12초에 자르면 멀쩡한 작업이 죽는다. 그래서 여기서도 버튼이 아니라 «말»만 본다. */
  ['admin.html', '관리자', /서버 응답이 늦어요/, false, 'me_admin_token'],
];

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
for (const [pg, label, wantRe, wantBtn, seedKey] of PAGES) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
  await page.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');   // [PREVIEW_GUARD_TEST_OFF]
  if (seedKey) await page.addInitScript((k) => { try { localStorage.setItem(k, 'T'); } catch (e) {} }, seedKey);
  await page.route('**', (route) => {
    const u = route.request().url();
    if (u.includes('script.google.com')) return new Promise(() => {});   // 영영 안 온다
    if (u.startsWith(`http://localhost:${PORT}`)) return route.continue();
    return route.fulfill({ status: 200, contentType: 'text/plain', body: '' });
  });
  try { await page.goto(`http://localhost:${PORT}/${pg}`, { waitUntil: 'domcontentloaded', timeout: 15000 }); } catch {}
  /* ★[SERVED_OURS] 우리 화면이 맞는지 먼저 본다 — 아니면 «갇혔다»가 아니라 «못 쟀다»(2)다.
     서버가 안 떴거나 포트를 뺏기면 어떤 화면이든 «말을 안 한다» → 이 검사가 제품 결함처럼 붉는다. */
  await page.waitForTimeout(800);
  const ours = await page.evaluate(() => /MOMENT/i.test(document.body.innerText || '') || !!document.querySelector('#card,#root,#mypageView,#homeView,#loading'));
  if (!ours) {
    console.log(`  · 못 쟀다 — ${label} 자리에 우리 화면이 아닌 것이 떴다(서버가 안 떴거나 포트를 뺏겼다)`);
    await page.close(); await browser.close(); try { server.kill(); } catch {}
    process.exit(2);
  }
  const t0 = Date.now();
  let m = { said: false, btn: 0 };
  while (Date.now() - t0 < DEADLINE) {
    await page.waitForTimeout(1500);
    m = await page.evaluate((src) => ({
      said: new RegExp(src).test(document.body.innerText || ''),
      btn: [...document.querySelectorAll('button,a[href],[role=button]')]
        .filter(e => e.getBoundingClientRect().width > 0 && (e.textContent || '').trim()).length,
    }), wantRe.source);
    if (m.said && (!wantBtn || m.btn)) break;
  }
  const secs = Math.round((Date.now() - t0) / 1000);
  if (m.said && (!wantBtn || m.btn)) console.log(`  ok ${label} — ${secs}초 만에 「${wantRe.source}」${wantBtn ? ` · 누를 것 ${m.btn}개` : ''}`);
  else {
    bad++;
    if (!m.said) console.log(`  ✗ ${label} — ${DEADLINE/1000}초가 지나도 「${wantRe.source}」라고 말하지 않는다(갇힌다)`);
    else console.log(`  ✗ ${label} — 말은 하는데 누를 것이 없다`);
  }
  await page.close();
}
await browser.close(); try { server.kill(); } catch {}

console.log(`\n[GUEST_TIMEOUT] 화면 ${PAGES.length}개 — 갇힘 ${bad}건`);
if (bad) console.log('  12초 제한(gapi·api 의 AbortController)이 살아 있는지 볼 것 — 그게 없으면 load(attempt) 의 catch 가 영영 안 불린다.');
process.exit(bad ? 1 : 0);
