// 섹션으로 가는 링크가 목표 «머리»에 정확히 멈추는가  [ANCHOR_LAND]
//
// ★[ANCHOR_LAND 2026-09-26 사장님 「직접확인하고」 · 「완료후 직접보면서 점검까지 진행」]
//   전체 메뉴 Close([MENU_CLOSE_HIT])를 고치며 메뉴 항목을 눌러 보다 드러났다. 고치기 전 코드 실측:
//     1280 상단 메뉴  FAQ −2136px · RSVP −1624 · Service +423 · Experience +157
//      940 전체 메뉴  FAQ −2146 · RSVP −1615 · Service +413 · Experience +167
//      390 전체 메뉴  FAQ −717 · RSVP −699 · Experience −105
//   (음수 = 목표를 그만큼 지나쳐 섰다 · 양수 = 못 미쳐 섰다 · 기준은 scroll-padding-top 70px 자리)
//   원인 — [PERF_CV_SECTIONS]. 화면 밖 섹션은 그려지기 전까지 «추정 키»(contain-intrinsic-size · 390px 실측값)로 선다.
//     부드러운 스크롤은 출발할 때 한 번 목표를 계산하는데, 가는 도중 지나가는 섹션이 그려지며 실제 키로 바뀌면
//     목표가 그만큼 움직인다. 브라우저는 출발 때 계산한 자리에 멈춘다.
//
// 무엇을 재나 — 사람처럼 누른다(좌표 클릭). 폭마다 «처음 가는 길»이어야 하므로 경우마다 새 페이지다
//   (한 번 지나간 섹션은 실제 키를 기억해 두 번째부터는 고치기 전 코드도 맞게 선다 — 그걸 재면 검사가 죽는다).
//   ① 1280 상단 메뉴 · 940 전체 메뉴(本 MENU) · 390 전체 메뉴(오른쪽 레일) → Service · FAQ · RSVP
//   ② 1280 가격 줄 링크(#invest) — 문서 안 평범한 앵커
//   ③ 카카오 버튼처럼 주소로 바로 들어오기(/#invest · /#director) — 390
//   ④ 움직임 줄이기(prefers-reduced-motion) 1280 FAQ
//   멈춘 뒤 목표 머리가 70px ± 4 에 있으면 통과. 페이지 끝이라 더 못 내려가면 끝에 닿았는지만 본다.
//
// 종료코드: 0 통과 · 1 틀림 · 2 재지 못함(브라우저 없음 · 우리 화면이 아님)
// 사람이 손으로 잴 때: node scripts/audit/anchor-land.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0].split('#')[0]);
  const f = path.join(ROOT, u === '/' ? 'index.html' : u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

let bad = 0, cant = 0;
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const ok = (m) => console.log('   ✓ ' + m);

/* ⓪ 정적(브라우저 없이도 · PR 에서 막는 자리) — 추정 키 섹션 목록이 두 곳에서 같은가.
   CSS 의 content-visibility:auto 목록([PERF_CV_SECTIONS])에 섹션이 늘었는데 meLand 의 CV 목록에 없으면
   그 섹션은 «먼저 그리기»에서 빠져 다시 되감긴다. */
{
  const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const css = (html.match(/((?:#[a-z-]+\s*,\s*)*#[a-z-]+)\s*\{\s*content-visibility:\s*auto;?\s*\}/) || [])[1];
  const js = (html.match(/var CV = \[([^\]]*)\];/) || [])[1];
  const a = css ? css.split(',').map((x) => x.trim().slice(1)).sort() : null;
  const b = js ? [...js.matchAll(/'([a-z-]+)'/g)].map((m) => m[1]).sort() : null;
  console.log('━━ ⓪ 정적 — 추정 키 섹션 목록(CSS ↔ meLand)');
  if (!a || !b) no(`목록을 못 찾았다 — CSS ${a ? 'O' : 'X'} · meLand ${b ? 'O' : 'X'}(장치가 지워졌거나 모양이 바뀌었다)`);
  else if (a.join() !== b.join()) no(`어긋난다 — CSS [${a.join(' ')}] · meLand [${b.join(' ')}]`);
  else ok(`같다 — ${a.join(' · ')}`);
}

const eng = await launchBrowser();
if (!eng) {
  srv.close();
  if (bad) { console.log(`\n✗ anchor-land — ⓪ 정적 ${bad}건(실측은 브라우저가 없어 못 쟀다)`); process.exit(1); }
  console.log('━━ anchor-land — ⓪ 정적 통과 · 실측은 브라우저가 없어 재지 못했습니다 · 화면 결함이 아닙니다');
  process.exit(2);
}
const H = 900, TOL = 4;

/* 멈출 때까지 — scrollY 가 600ms 동안 그대로면 멈춘 것 */
async function settle(page) {
  let last = -1, same = 0;
  for (let i = 0; i < 80; i++) {
    const y = await page.evaluate(() => Math.round(window.scrollY));
    if (y === last) { if (++same >= 6) break; } else same = 0;
    last = y;
    await page.waitForTimeout(100);
  }
}
/* 목표 머리 자리 — 기준은 scroll-padding-top. 끝에 닿아 더 못 가면 at_end */
const where = (page, sel) => page.evaluate((s) => {
  const t = document.querySelector(s);
  const pad = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
  const max = document.documentElement.scrollHeight - innerHeight;
  return { top: Math.round(t.getBoundingClientRect().top), pad, atEnd: window.scrollY >= max - 2 };
}, sel);
/* 사람처럼 — 휠로 내려갔다 조금 올려 상단 바를 불러낸다(맨 위에서는 상단 바가 숨는다) */
async function revealNav(page, W) {
  await page.mouse.move(W / 2, H / 2);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(50); }
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(70); }
  await page.waitForTimeout(1000);
  await page.mouse.move(5, H - 5);   // 휠이 겨누기를 끊지 않게 손을 치운다(휠 = 사용자가 이긴다)
}
const center = (page, sel, text) => page.evaluate(([s, t]) => {
  const el = [...document.querySelectorAll(s)].find((x) => !t || x.getAttribute('href') === t);
  if (!el) return null;
  const b = el.getBoundingClientRect();
  if (b.width < 1 || b.bottom <= 0 || b.top >= innerHeight) return null;
  return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
}, [sel, text]);
/* 궤적 — 누르기 직전부터 프레임마다 scrollY 를 적는다. 아래로 가는 길에 위로 40px 넘게 돌아오면 «되감김»이다
   (처음 판이 그랬다: 목표는 맞게 섰는데 끝에서 647px 지나쳤다가 돌아왔다). */
const record = (page) => page.evaluate(() => { window.__ys = []; (function rec() { window.__ys.push(Math.round(scrollY)); if (window.__ys.length < 900) requestAnimationFrame(rec); })(); });
async function rewind(page, label) {
  const ys = await page.evaluate(() => window.__ys || []);
  let back = 0;
  for (let i = 1; i < ys.length; i++) { const d = ys[i] - ys[i - 1]; if (d < -2) back += -d; }
  if (back > 40) no(`${label}: 가는 도중 ${back}px 되감겼다(지나쳤다 돌아옴)`);
}
function judge(label, w) {
  if (w.atEnd && w.top >= w.pad - TOL) return ok(`${label}: 페이지 끝에 닿음(목표 머리 ${w.top}px)`);
  const d = w.top - w.pad;
  if (Math.abs(d) <= TOL) ok(`${label}: 목표 머리 ${w.top}px(기준 ${w.pad})`);
  else no(`${label}: 목표 머리 ${w.top}px — ${d < 0 ? `${-d}px 지나쳐` : `${d}px 못 미쳐`} 섰다`);
}
async function fresh(W, opts = {}) {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
  if (opts.reduce) await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(`http://localhost:${PORT}/${opts.hash || ''}`, { waitUntil: 'load', timeout: 30000 });
  await page.waitForTimeout(opts.hash ? 2500 : 900);
  const ours = await page.evaluate(() => !!document.getElementById('mobileMenu') && !!document.getElementById('faq'));
  if (!ours) { cant++; console.log(`   · ${W}px — 우리 화면이 아닌 것이 떴다(서버·포트) · 재지 못함`); await page.close(); return null; }
  return { page, errors };
}

const TARGETS = ['#service', '#faq', '#rsvp'];
// ① 메뉴로 가기
for (const W of [1280, 940, 390]) {
  console.log(`━━ ${W}px ${W > 1023 ? '상단 메뉴' : '전체 메뉴'}`);
  for (const href of TARGETS) {
    const f = await fresh(W); if (!f) continue;
    const { page } = f;
    try {
      await revealNav(page, W);
      if (W > 1023) {
        const c = await center(page, '.nav-links a', href);
        if (!c) { cant++; console.log(`   · ${href}: 상단 메뉴 링크가 화면에 안 보였다 · 재지 못함`); await page.close(); continue; }
        await record(page);
        await page.mouse.click(c.x, c.y);
      } else {
        const op = (await center(page, '#navToggle')) || (await center(page, '.me-fab-menu'));
        if (!op) { cant++; console.log(`   · ${href}: 메뉴 여는 단추가 안 보였다 · 재지 못함`); await page.close(); continue; }
        await page.mouse.click(op.x, op.y);
        await page.waitForTimeout(1300);
        const c = await center(page, '#mobileMenu a', href);
        if (!c) { cant++; console.log(`   · ${href}: 메뉴 항목이 안 보였다 · 재지 못함`); await page.close(); continue; }
        await page.mouse.click(c.x, c.y);
        await page.waitForTimeout(250);   // 메뉴가 닫히며 보던 자리로 돌아간 «뒤»부터 적는다(그 복원은 되감김이 아니다)
        await record(page);
      }
      await page.mouse.move(5, H - 5);
      await page.waitForTimeout(500);
      await settle(page);
      judge(`${W}px ${href}`, await where(page, href));
      await rewind(page, `${W}px ${href}`);
    } catch (e) { cant++; console.log(`   · ${W}px ${href} — 재다가 멈췄다(${String(e && e.message || e).slice(0, 90)})`); }
    await page.close();
  }
}
// ② 문서 안 평범한 앵커 — 가격 줄
{
  console.log('━━ 1280px 가격 줄 링크 → #invest');
  const f = await fresh(1280);
  if (f) {
    const { page } = f;
    try {
      await page.evaluate(() => { const a = document.querySelector('a.core-price-link'); const de = document.documentElement; de.style.scrollBehavior = 'auto'; a.scrollIntoView({ block: 'center' }); de.style.scrollBehavior = ''; });
      await page.waitForTimeout(900);
      const c = await center(page, 'a.core-price-link');
      if (!c) { cant++; console.log('   · 가격 줄 링크가 화면에 안 보였다 · 재지 못함'); }
      else {
        await page.mouse.click(c.x, c.y);
        await page.mouse.move(5, H - 5);
        await page.waitForTimeout(500);
        await settle(page);
        judge('1280px 가격 줄 → #invest', await where(page, '#invest'));
      }
    } catch (e) { cant++; console.log(`   · 가격 줄 — 재다가 멈췄다(${String(e && e.message || e).slice(0, 90)})`); }
    await page.close();
  }
}
// ③ 주소로 바로 들어오기(카카오 버튼)
console.log('━━ 390px 주소로 바로 들어오기');
for (const hash of ['#invest', '#director']) {
  const f = await fresh(390, { hash });
  if (!f) continue;
  const { page } = f;
  await settle(page);
  judge(`390px /${hash}`, await where(page, hash));
  await page.close();
}
// ④ 움직임 줄이기
{
  console.log('━━ 1280px 움직임 줄이기 → #faq');
  const f = await fresh(1280, { reduce: true });
  if (f) {
    const { page } = f;
    try {
      await revealNav(page, 1280);
      const c = await center(page, '.nav-links a', '#faq');
      if (!c) { cant++; console.log('   · 상단 메뉴 링크가 안 보였다 · 재지 못함'); }
      else {
        await page.mouse.click(c.x, c.y);
        await page.mouse.move(5, H - 5);
        await page.waitForTimeout(500);
        await settle(page);
        judge('1280px 움직임 줄이기 #faq', await where(page, '#faq'));
      }
    } catch (e) { cant++; console.log(`   · 움직임 줄이기 — 재다가 멈췄다(${String(e && e.message || e).slice(0, 90)})`); }
    await page.close();
  }
}
await eng.close();
srv.close();

if (bad) { console.log(`\n✗ anchor-land — ${bad}건(목표에 못 섬 · 가는 도중 되감김)`); process.exit(1); }
if (cant) { console.log(`\n━━ anchor-land — ${cant}건 재지 못했습니다 · 화면 결함이 아닙니다`); process.exit(2); }
console.log('\n✓ anchor-land — 메뉴 · 상단 메뉴 · 가격 줄 · 주소 바로가기 · 움직임 줄이기 모두 목표 머리에 섰다');
