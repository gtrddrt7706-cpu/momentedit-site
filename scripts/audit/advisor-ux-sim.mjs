#!/usr/bin/env node
/* [ADVISOR_UX] 챗봇을 «키보드로 · 막혔을 때» 쓴다 — 눈과 마우스가 아닌 쪽.
 *
 * advisor-sim 은 서버 핸들러를, advisor-tree-sim 은 대화트리를 잰다. 둘 다 «잘 되는 길»이다.
 * 여기서 재는 것은 두 가지 — ①키보드만으로 열고 닫고 빠져나올 수 있는가
 *                            ②서버가 죽었을 때 화면이 «길»을 주는가(침묵하지 않는가)
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음)
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json' };
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }
let bad = 0, n = 0;
const ok = (m) => { n++; console.log('   ✓ ' + m); };
const no = (m) => { n++; bad++; console.log('   ✗ ' + m); };
const FAB = 'button[aria-label*="상담 도우미"]';

/* ══════════ ① 키보드만으로 ══════════ */
console.log('\n══ ① 키보드만으로 열고 · 닫고 · 빠져나오기 ══');
/* ★★[ADV_TWO_COPIES] 위젯은 «두 벌»이다 — index.html 은 자체 인라인 사본, 나머지 쪽은
   assets/advisor-widget.js 를 부른다(index.html:8071 주석도 같은 말을 한다).
   그래서 한쪽만 고치면 그 쪽만 낫는다. 실제로 2026-09-11 에 파일만 고쳐 놓고
   «고쳤다»고 할 뻔했다 — 홈은 그대로였다. 그러니 여기서 «둘 다» 연다. */
for (const PG of ['index.html', 'inquiry.html']) {
  console.log('  ── ' + PG + (PG === 'index.html' ? ' (인라인 사본)' : ' (파일판)'));
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 1280, height: 900 } });
  await page.goto(`http://localhost:${PORT}/${PG}`, { waitUntil: 'load' });
  await page.waitForTimeout(1200);
  /* ★레일은 쪽 맨 위에서 visibility:hidden 이고 스크롤해야 .reveal 이 붙는다(설계).
     그래서 «로드 직후»에 재면 포커스를 못 받는 게 당연하다 — 그건 결함이 아니라 아직 안 나온 것이다.
     (2026-09-11: 이걸 안 하고 재서 «버튼이 포커스를 못 받는다» 외 3건이 줄줄이 딸려 나왔다. 전부 내 오류였다.) */
  await page.evaluate(() => window.scrollTo(0, 1200));
  await page.waitForFunction(() => document.querySelector('.me-fab-stack.reveal')
    && getComputedStyle(document.querySelector('.me-fab-stack')).visibility === 'visible', null, { timeout: 6000 }).catch(() => {});
  await page.waitForTimeout(400);

  await page.evaluate((s) => document.querySelector(s).focus(), FAB);
  const beforeIsFab = await page.evaluate((s) => document.activeElement === document.querySelector(s), FAB);
  beforeIsFab ? ok(PG + ' 상담 버튼에 포커스를 줄 수 있다') : no(PG + ' 상담 버튼이 포커스를 못 받는다');

  await page.keyboard.press('Enter');
  await page.waitForTimeout(900);
  const open1 = await page.evaluate(() => !!document.querySelector('.me-adv-panel.open'));
  open1 ? ok(PG + ' Enter 로 열린다') : no(PG + ' Enter 로 안 열린다');
  const inside = await page.evaluate(() => { const p = document.querySelector('.me-adv-panel');
    return !!(p && document.activeElement && p.contains(document.activeElement)); });
  inside ? ok(PG + ' 열리면 포커스가 패널 «안»으로 들어간다') : no(PG + ' 열려도 포커스가 패널 밖에 있다');

  /* Tab 을 계속 눌러 패널을 빠져나가는지 — aria-modal 이라고 써 놓고 새면 그게 더 나쁘다 */
  let escaped = null;
  for (let i = 0; i < 30; i++) {
    await page.keyboard.press('Tab');
    const where = await page.evaluate(() => { const p = document.querySelector('.me-adv-panel');
      const a = document.activeElement;
      return { out: !!(p && a && a !== document.body && !p.contains(a)),
        who: a ? (a.tagName + (a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : '') + (a.className ? '.' + String(a.className).split(' ')[0] : '')) : 'none' };
    });
    if (where.out) { escaped = i + 1 + '번째 Tab 에서 ' + where.who; break; }
  }
  escaped ? no(PG + ' Tab 이 패널 밖으로 샌다 (' + escaped + ') — aria-modal="true" 와 어긋난다')
          : ok(PG + ' Tab 30회를 눌러도 포커스가 패널 안에 머문다');

  await page.keyboard.press('Escape');
  await page.waitForTimeout(700);
  const open2 = await page.evaluate(() => !!document.querySelector('.me-adv-panel.open'));
  !open2 ? ok(PG + ' Escape 로 닫힌다') : no(PG + ' Escape 로 안 닫힌다');

  const back = await page.evaluate((s) => { const a = document.activeElement;
    return { onFab: a === document.querySelector(s),
      who: a ? (a.tagName + (a.getAttribute('aria-label') ? '[' + a.getAttribute('aria-label') + ']' : '')) : 'none' }; }, FAB);
  back.onFab ? ok(PG + ' 닫으면 포커스가 «열었던 버튼»으로 돌아온다')
             : no(PG + ' 닫은 뒤 포커스가 돌아오지 않는다 (지금 ' + back.who + ') — 키보드 사용자는 쪽 처음부터 다시 Tab 해야 한다');

  const hidden = await page.evaluate(() => { const p = document.querySelector('.me-adv-panel');
    return [...p.querySelectorAll('a[href],button,input,textarea,select')].filter((e) => e.tabIndex >= 0).length; });
  const reach = await page.evaluate(() => { const p = document.querySelector('.me-adv-panel');
    return getComputedStyle(p).visibility; });
  (reach === 'hidden') ? ok(PG + ' 닫힌 패널은 Tab 순서에서 빠진다 (조작 ' + hidden + '개)')
                       : no(PG + ' 닫힌 패널이 여전히 Tab 에 걸린다 (visibility=' + reach + ')');
  await page.close();
}

/* ══════════ ② 서버가 죽었을 때 ══════════ */
console.log('\n══ ② 서버가 죽었을 때 화면이 길을 주는가 ══');
for (const [name, handler] of [
  ['503 미설정', (route) => route.fulfill({ status: 503, contentType: 'application/json', body: '{"error":"advisor_unconfigured","escalate":true}' })],
  ['429 과호출', (route) => route.fulfill({ status: 429, contentType: 'application/json', body: '{"error":"rate_limited","escalate":true}' })],
  ['502 상위오류', (route) => route.fulfill({ status: 502, contentType: 'application/json', body: '{"error":"upstream_error","escalate":true}' })],
  ['연결 끊김', (route) => route.abort()],
]) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 1280, height: 900 } });
  await page.route('**/api/advisor', handler);
  await page.route('**/api/handoff', (r) => r.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }));
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1100);
  await page.evaluate(() => window.scrollTo(0, 1200));   // 레일은 스크롤 뒤에 나온다(위 주석)
  await page.waitForTimeout(700);
  await page.evaluate((s) => document.querySelector(s).click(), FAB);
  await page.waitForTimeout(800);
  /* 자유질문 칸에 한 마디 넣고 보낸다 */
  const sent = await page.evaluate(async () => {
    const inp = document.getElementById('meAdvInput') || document.querySelector('.me-adv-input');
    const btn = document.getElementById('meAdvSend');
    if (!inp) return '입력칸 없음';
    inp.focus(); inp.value = '식사 가격대가 어떻게 되나요?';
    inp.dispatchEvent(new Event('input', { bubbles: true }));
    if (btn) btn.click(); else inp.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }));
    return 'ok';
  });
  if (sent !== 'ok') { no(name + ' — ' + sent); await page.close(); continue; }
  await page.waitForTimeout(2500);
  const r = await page.evaluate(() => {
    const p = document.querySelector('.me-adv-panel');
    const vis = (e) => e.checkVisibility ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : true;
    const msgs = [...p.querySelectorAll('.me-adv-msg.bot')].map((m) => m.textContent.trim());
    const esc = [...p.querySelectorAll('.me-adv-esc-btn, a[href*="kakao"], a[href^="mailto:"]')].filter(vis)
      .map((a) => (a.textContent || '').trim().slice(0, 22) + ' → ' + (a.getAttribute('href') || '').slice(0, 34));
    const typing = !!p.querySelector('.me-adv-typing');
    return { last: msgs[msgs.length - 1] || '', 말수: msgs.length, 출구: esc, 아직도돌고있나: typing };
  });
  if (r.아직도돌고있나) no(name + ' — 점 세 개가 계속 돈다(침묵). 고객은 기다리다 나간다');
  else if (!r.last) no(name + ' — 아무 말도 안 한다');
  else if (!r.출구.length) no(name + ' — 말은 하는데 «나갈 길»이 없다: 「' + r.last.slice(0, 50) + '」');
  else ok(name + ' → 말하고 길을 준다: 「' + r.last.slice(0, 34) + '…」 + ' + r.출구.join(' / '));
  await page.close();
}

srv.close(); await eng.close?.();
console.log('\n' + (bad ? '✗ ADVISOR UX — 개선점 ' + bad + '건 / ' + n + '검사' : '✓ ADVISOR UX OK — ' + n + '검사 전부 통과'));
process.exit(bad ? 1 : 0);
