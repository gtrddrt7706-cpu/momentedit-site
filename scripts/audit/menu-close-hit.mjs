// 전체 메뉴(풀스크린 오버레이)의 «닫기»가 모든 폭에서 실제로 눌리는가  [MENU_CLOSE_HIT]
//
// ★[MENU_CLOSE_HIT 2026-09-26 사장님 「pc버전 창을좀줄이면 위메뉴가 저렇게 바뀌는데 클로즈가 안먹어 개선해죠 직접확인하고」]
//   창 폭 681~1023px(작은 PC 창 · 아이패드 세로 · 폰 가로)에서 메뉴를 열면 Close 가 눌리지 않았다.
//   원인 — `body.menu-open nav { z-index: 201 }` 이 상단 바를 메뉴(z 200) «위»로 올린다.
//     그 규칙은 상단 바의 단추가 곧 닫기였던 시절의 것이다(주석: 「nav 위로 올려 "Close" 표시」).
//     [MM_TOPROW] 가 Close 를 메뉴 안 눈썹 줄로 옮긴 뒤에도 규칙은 남았고, 투명한 `.nav-in` 띠(높이 약 84px)가
//     Close(y 28~72) 를 통째로 덮어 클릭을 삼켰다. 本 단추는 열린 동안 `pointer-events: none` 이라 그것도 안 먹었다.
//     → Esc 말고는 닫을 길이 없었다(2026-09-26 실측: 700·768·940·1023 네 폭 모두 Close 한가운데의 주인이 `div.nav-in`).
//   폰(≤680)에서는 멀쩡했다 — 거기선 nav 가 static 이고 `.nav-in` 이 display:none 이라 덮을 띠가 없다.
//   [MM_TOPROW] 는 폰 폭에서만 재고 확정했고, [NAV_TABLET_FIX] 가 전환점을 680 → 1023 으로 올리면서
//   그 사이 폭이 처음으로 «상단 바가 떠 있는 채 메뉴가 열리는» 구간이 됐다. 두 결정이 만나는 폭을 아무도 안 쟀다.
//
// 무엇을 보나
//   ① 정적(브라우저 없이도 늘 돈다 · PR 의 merge-guard 가 막는 자리)
//      `body.menu-open nav` 가 메뉴(z 200)보다 위에 있으면 반드시 `pointer-events: none` 이어야 한다.
//   ② 실측(브라우저가 있을 때 · 야간 nightly-screen · 로컬)
//      390 · 681 · 820 · 940 · 1023 에서 사람처럼 연다(보이는 여는 단추를 좌표로 누른다) →
//      Close 안쪽 다섯 점의 주인(elementFromPoint)이 Close 인가 → 실제로 눌러 닫히는가.
//      상단 바가 보이는 폭(681~1023)에서는 本 을 눌러도 닫히는가(열 때 누른 그 자리다).
//   ③ 940 에서 연 채로 창을 900 으로 줄이면 열린 채이고, 1100 으로 넓히면 닫히는가
//      (자동 닫힘은 «상단 메뉴가 펼쳐지는 폭»에서만 — [NAV_TABLET_FIX] 전환점 1023 과 같은 값).
//
// 종료코드: 0 통과 · 1 틀림 · 2 재지 못함(브라우저 없음 · 우리 화면이 아님 — ①은 이미 통과)
// 사람이 손으로 잴 때: node scripts/audit/menu-close-hit.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const HTML = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

let bad = 0;
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const ok = (m) => console.log('   ✓ ' + m);

/* ① 정적 — CSS 주석은 걷고 본다(주석 속 옛 규칙 인용에 속지 않게) */
const css = HTML.replace(/\/\*[\s\S]*?\*\//g, '');
console.log('━━ menu-close-hit ① 정적 — 상단 바가 메뉴 위에 뜨면 클릭을 통과시키는가');
const navOpen = [...css.matchAll(/body\.menu-open\s+nav\s*\{([^}]*)\}/g)].map((m) => m[1]);
if (!navOpen.length) ok('`body.menu-open nav` 규칙 없음 — 상단 바가 메뉴(z 200) 아래에 있어 덮지 않는다');
for (const body of navOpen) {
  const z = Number((body.match(/z-index\s*:\s*(\d+)/) || [])[1] || 0);
  const pass = /pointer-events\s*:\s*none/.test(body);
  if (z > 200 && !pass) no(`\`body.menu-open nav\` 가 z-index ${z}(메뉴 200 위)인데 pointer-events: none 이 없다 — 681~1023px 에서 Close 가 안 눌린다`);
  else ok(`\`body.menu-open nav\` z-index ${z || '없음'} · pointer-events ${pass ? 'none' : '기본'} — 덮지 않는다`);
}

/* ② · ③ 실측 */
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const eng = await launchBrowser();
if (!eng) {
  srv.close();
  if (bad) { console.log(`\n✗ menu-close-hit — ① 정적 ${bad}건(② 실측은 브라우저가 없어 못 쟀다)`); process.exit(1); }
  console.log('━━ menu-close-hit ② 실측 — 브라우저가 없어 재지 못했습니다 · ① 정적은 통과 · 재지 못한 것이지 화면 결함이 아닙니다');
  process.exit(2);
}

const WIDTHS = [390, 681, 820, 940, 1023];
const H = 900;
let notOurs = 0;

/* 사람처럼 — 휠로 내려갔다 조금 올려 상단 바를 불러낸다(맨 위에서는 상단 바가 숨는다 · 2026-06-12 지시) */
async function revealNav(page, W) {
  await page.mouse.move(W / 2, H / 2);
  for (let i = 0; i < 12; i++) { await page.mouse.wheel(0, 250); await page.waitForTimeout(50); }
  await page.waitForTimeout(400);
  for (let i = 0; i < 3; i++) { await page.mouse.wheel(0, -120); await page.waitForTimeout(70); }
  await page.waitForTimeout(1000);
}
/* 지금 눌러서 메뉴를 열 수 있는 단추 — 상단 바의 本 MENU, 없으면 오른쪽 레일의 메뉴(폰) */
const openerBox = (page) => page.evaluate(() => {
  const inView = (el) => {
    if (!el || getComputedStyle(el).display === 'none') return null;
    const b = el.getBoundingClientRect();
    if (b.width < 1 || b.bottom <= 0 || b.top >= innerHeight) return null;
    const nav = el.closest('nav');
    if (nav && Number(getComputedStyle(nav).opacity) < 0.5) return null;
    return { x: b.x + b.width / 2, y: b.y + b.height / 2 };
  };
  const t = inView(document.getElementById('navToggle'));
  if (t) return { kind: '本 MENU', ...t };
  const f = inView(document.querySelector('.me-fab-menu'));
  if (f) return { kind: '레일 메뉴', ...f };
  return null;
});
const isOpen = (page) => page.evaluate(() => document.getElementById('mobileMenu').classList.contains('open'));

for (const W of WIDTHS) {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
  try {
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(800);
    const ours = await page.evaluate(() => !!document.getElementById('mobileMenu') && !!document.getElementById('mobileMenuClose'));
    if (!ours) { notOurs++; console.log(`   · ${W}px — 우리 화면이 아닌 것이 떴다(서버·포트) · 재지 못함`); await page.close(); continue; }
    console.log(`━━ ${W}px`);
    await revealNav(page, W);
    let op = await openerBox(page);
    if (op) await page.mouse.click(op.x, op.y);
    else {
      console.log('   · 여는 단추가 화면에 안 보였다 — 코드로 열고 닫기만 잰다');
      await page.evaluate(() => document.getElementById('navToggle').click());
    }
    await page.waitForTimeout(900);
    if (!(await isOpen(page))) { no(`${W}px: ${op ? op.kind : '코드'}(으)로 메뉴가 안 열렸다`); await page.close(); continue; }

    // Close 안쪽 다섯 점 — 한가운데와 네 모서리(안으로 6px)의 주인이 모두 Close 인가
    const probe = await page.evaluate(() => {
      const c = document.getElementById('mobileMenuClose');
      const b = c.getBoundingClientRect();
      const pts = [[b.x + b.width / 2, b.y + b.height / 2], [b.x + 6, b.y + 6], [b.right - 6, b.y + 6], [b.x + 6, b.bottom - 6], [b.right - 6, b.bottom - 6]];
      const who = (el) => el ? el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (typeof el.className === 'string' && el.className.trim() ? '.' + el.className.trim().split(/\s+/)[0] : '') : 'null';
      const miss = pts.map(([x, y]) => document.elementFromPoint(x, y)).filter((h) => !(h && c.contains(h))).map(who);
      return { cx: pts[0][0], cy: pts[0][1], miss };
    });
    if (probe.miss.length) no(`${W}px: Close 안쪽 ${probe.miss.length}/5 점을 다른 요소가 덮는다 — ${[...new Set(probe.miss)].join(', ')}`);
    else ok(`${W}px: Close 안쪽 5/5 점의 주인이 Close`);
    await page.mouse.click(probe.cx, probe.cy);
    await page.waitForTimeout(700);
    if (await isOpen(page)) no(`${W}px: Close 를 눌러도 메뉴가 안 닫혔다`);
    else ok(`${W}px: Close 로 닫힘`);

    // 상단 바가 보이는 폭 — 本 을 다시 누르면 닫혀야 한다(열 때 누른 그 자리)
    if (W > 680) {
      await revealNav(page, W);
      op = await openerBox(page);
      if (!op || op.kind !== '本 MENU') console.log(`   · ${W}px: 本 이 화면에 안 보여 «本 으로 닫기»는 건너뜀`);
      else {
        await page.mouse.click(op.x, op.y);
        await page.waitForTimeout(900);
        if (!(await isOpen(page))) no(`${W}px: 本 으로 메뉴가 다시 안 열렸다`);
        else {
          await page.mouse.click(op.x, op.y);
          await page.waitForTimeout(700);
          if (await isOpen(page)) no(`${W}px: 열린 메뉴에서 本 을 눌러도 안 닫힌다(보이는데 안 먹는 단추)`);
          else ok(`${W}px: 本 으로도 닫힘`);
        }
      }
    }

    // ③ 자동 닫힘은 상단 메뉴가 펼쳐지는 폭(> 1023)에서만
    if (W === 940) {
      await page.evaluate(() => document.getElementById('navToggle').click());
      await page.waitForTimeout(900);
      await page.setViewportSize({ width: 900, height: H });
      await page.waitForTimeout(500);
      if (!(await isOpen(page))) no('940→900px: 햄버거 폭 안에서 창만 줄였는데 메뉴가 저절로 닫혔다');
      else ok('940→900px: 햄버거 폭 안에서는 열린 채');
      await page.setViewportSize({ width: 1100, height: H });
      await page.waitForTimeout(500);
      if (await isOpen(page)) no('900→1100px: 상단 메뉴가 펼쳐졌는데 전체 메뉴가 안 닫혔다');
      else ok('900→1100px: 상단 메뉴가 펼쳐지는 폭에서 저절로 닫힘');
    }
    const pageErr = errors.filter((e) => !/console\.error/.test(e));
    if (pageErr.length) no(`${W}px: 스크립트 오류 ${pageErr.length}건 — ${pageErr[0].slice(0, 120)}`);
  } catch (e) {
    notOurs++;
    console.log(`   · ${W}px — 재다가 멈췄다(${String(e && e.message || e).slice(0, 100)}) · 재지 못함`);
  }
  await page.close();
}
await eng.close();
srv.close();

if (bad) { console.log(`\n✗ menu-close-hit — ${bad}건`); process.exit(1); }
if (notOurs) { console.log(`\n━━ menu-close-hit — ${notOurs}개 폭을 재지 못했습니다 · 화면 결함이 아닙니다`); process.exit(2); }
console.log(`\n✓ menu-close-hit — ${WIDTHS.join('·')}px 모두 Close 가 눌리고 닫힌다`);
