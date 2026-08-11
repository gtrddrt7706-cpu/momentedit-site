// 화면을 재는 공용 자 [PROBE_RULER]
//
// ★왜 만드나 — 2026-08-10 한 세션에서 **같은 종류의 측정 실수를 여섯 번** 했다.
//   매번 "앱이 이상하다"로 갈 뻔했고, 매번 원인은 자였다.
//     ① innerText 로 읽어 2321자만 잡히자 "없어야 할 것 전부 없음"으로 읽었다
//        → 접힌 FAQ·모달 안을 **안 본 것**이었다. 못 찾은 것이 아니다.
//     ② 숨은 것까지 훑자 이번엔 <script> 안 코드 문자열을 화면 글로 셌다(2~1 · 86~1)
//     ③ 잘린 부모(overflow:hidden) 안에 있어 사용자가 못 보는 것을 '가로 넘침'으로 셌다
//     ④ 로컬 서버를 저장소 밖에서 띄워 404 를 받고 "페이지가 깨졌다"고 읽었다
//     ⑤ 코스 화면에서 숨겨진 버튼(display:none)을 눌러 "진행 불가"로 읽었다
//     ⑥ 상태를 직접 주입해 고르는 화면을 건너뛰고, 그 화면이 거르던 것까지 세었다
//   여섯 번의 공통점: **재기 전에 자를 재지 않았다.**
//
// ★이 파일이 지키는 것 (도구 쪽에서 미리 막는다)
//   - 서버가 저장소 루트를 보고 있는지 먼저 확인한다. 아니면 즉시 멈춘다(404 를 결함으로 읽지 않게)
//   - 화면 글 = script·style·noscript·template 을 뺀 텍스트 노드. 주석도 안 센다
//   - '보이는 글'과 '숨은 글'을 **따로** 준다. 하나로 합쳐 주면 부르는 쪽이 반드시 헷갈린다
//   - 가로 넘침은 '요소가 삐져나왔나'가 아니라 **문서가 가로로 스크롤되나**로 판정한다
//   - 무엇을 못 봤는지 함께 돌려준다(unseen) — 안 본 것을 안 봤다고 말한다
//
// 쓰는 법 (다른 검사에서 import)
//   import { openProbe } from './page-probe.mjs';
//   const { page, probe, close } = await openProbe('order-preview.html', { width: 390 });
//   const r = await probe();   // { visible, hidden, all, scrollsX, overflow, unseen, errors }
//
// 단독 실행 — 여러 쪽을 한 번에 훑는다
//   node scripts/audit/page-probe.mjs index.html order-preview.html console.html

import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
export const PORT = process.env.PORT || 8895;
const BASE = `http://127.0.0.1:${PORT}/`;

/* [PW_FIND] 한 경로를 박아 두면 다른 세션에서 조용히 안 돈다 — 넓게 묻는다. */
async function findChromium() {
  let g = '';
  try { g = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* npm 없음 */ }
  for (const t of [process.env.PW, 'playwright', 'playwright-core', g && `${g}/playwright/index.js`,
    '/opt/node-tools/node_modules/playwright/index.js'].filter(Boolean)) {
    try { return require(t).chromium; } catch { /* 다음 */ }
    try { const m = await import(t); if ((m.default ?? m).chromium) return (m.default ?? m).chromium; } catch { /* 다음 */ }
  }
  return null;
}

/* ★서버가 **저장소 루트**를 보고 있는지 먼저 잰다.
   실사고: /home/claude 에서 띄워 놓고 order-preview.html 이 404 났는데,
   그걸 "페이지 JS 가 깨졌다"로 읽고 방금 한 편집을 의심했다. 서버 자리는 결함이 아니다. */
export async function serverRooted() {
  const marker = 'assets/ritual-cue.js';                 // 저장소에만 있는 파일
  if (!fs.existsSync(path.join(ROOT, marker))) return { ok: false, why: `저장소에 ${marker} 가 없다 — ROOT 계산이 틀렸다` };
  try {
    const r = await fetch(BASE + marker, { method: 'GET' });
    if (!r.ok) return { ok: false, why: `서버가 ${marker} 를 ${r.status} 로 준다 — 저장소 루트에서 안 띄웠다` };
    return { ok: true };
  } catch (e) { return { ok: false, why: `서버(:${PORT})에 못 붙었다 (${String(e).slice(0, 50)})` }; }
}

const EXTRACT = `(() => {
  const SKIP = /^(SCRIPT|STYLE|NOSCRIPT|TEMPLATE|TITLE)$/;
  const walk = () => {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode(n){ return SKIP.test(n.parentNode.nodeName) ? NodeFilter.FILTER_REJECT : NodeFilter.FILTER_ACCEPT; } });
    const out = []; let n;
    while ((n = w.nextNode())) {
      const v = n.nodeValue; if (!v || !v.trim()) continue;
      const el = n.parentElement;
      // 보이는가 — offsetParent 는 fixed 에서 null 이라 rect 도 함께 본다
      const r = el ? el.getBoundingClientRect() : null;
      const cs = el ? getComputedStyle(el) : null;
      const shown = !!(r && (r.width > 0 || r.height > 0) && cs && cs.visibility !== 'hidden' && cs.display !== 'none');
      out.push([v, shown]);
    }
    return out;
  };
  const nodes = walk();
  const de = document.documentElement;
  const overflow = [...document.querySelectorAll('body *')].filter(e => {
    const b = e.getBoundingClientRect(); if (!(b.width > 0 && b.height > 0)) return false;
    if (b.right <= innerWidth + 2) return false;
    if (getComputedStyle(e).position === 'fixed') return false;
    for (let q = e.parentElement; q && q !== document.body; q = q.parentElement) {
      const s = getComputedStyle(q);
      if (s.overflow !== 'visible' || s.overflowX !== 'visible') return false;   // 잘려서 안 보인다
    }
    return true;
  }).map(e => e.tagName.toLowerCase() + (typeof e.className === 'string' && e.className.trim() ? '.' + e.className.trim().split(/\\s+/)[0] : ''));
  return {
    visible: nodes.filter(x => x[1]).map(x => x[0]).join('\\n'),
    hidden:  nodes.filter(x => !x[1]).map(x => x[0]).join('\\n'),
    scrollsX: de.scrollWidth > de.clientWidth + 1,
    scrollWidth: de.scrollWidth, clientWidth: de.clientWidth,
    overflow: [...new Set(overflow)],
    domNodes: document.querySelectorAll('*').length
  };
})()`;

export async function openProbe(pageName, opts = {}) {
  const chromium = await findChromium();
  if (!chromium) { const e = new Error('playwright 없음'); e.cantLook = true; throw e; }
  const root = await serverRooted();
  if (!root.ok) { const e = new Error(root.why); e.cantLook = true; throw e; }
  let browser;
  try { browser = await chromium.launch({ executablePath: process.env.PW_EXE || '/opt/pw-browsers/chromium' }); }
  catch { try { browser = await chromium.launch(); } catch (err) { const e = new Error('브라우저를 못 띄움: ' + String(err).slice(0, 50)); e.cantLook = true; throw e; } }
  const page = await browser.newPage({ viewport: { width: opts.width || 390, height: opts.height || 900 } });
  const errors = [], unseen = [];
  /* ★[TUNNEL_UNSEEN 2026-08-11] 바깥에 못 닿은 것을 '페이지 오류'로 세지 않는다.
     실사고: index.html 을 이 자로 재니 exit 1 이었다. 이유는
     `console: Failed to load resource: net::ERR_TUNNEL_CONNECTION_FAILED` 한 줄 —
     실행 환경의 프록시가 fonts.googleapis 를 막은 것이다. 페이지 결함이 아니다.
     ★목록에 `fonts.googleapis` 가 이미 있었는데도 안 걸렸다. 콘솔 문구에는 **주소가 없고**
       오류 이름만 있어서다. 주소로 거르는 그물은 주소가 안 적힌 줄을 못 잡는다.
     ★이건 이 파일이 막으려던 바로 그 실수의 일곱 번째 꼴이다(머리말 ①~⑥ 참고) —
       재는 쪽 사정을 재이는 쪽 결함으로 읽었다. 걸러서 `unseen` 으로 보낸다.
       안 본 것은 통과도 실패도 아니라 **안 봤다고 말할 것**이다. */
  const NOISE = /fonts\.googleapis|fonts\.gstatic|ERR_CONNECTION_RESET|ERR_FAILED|ERR_NAME_NOT_RESOLVED|ERR_BLOCKED|ERR_TUNNEL_CONNECTION_FAILED|ERR_PROXY/;
  page.on('pageerror', (e) => errors.push('pageerror: ' + String(e).slice(0, 120)));
  page.on('console', (m) => { if (m.type() === 'error' && !NOISE.test(m.text())) errors.push('console: ' + m.text().slice(0, 120)); });
  page.on('response', (r) => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${r.url().split('/').pop().slice(0, 40)}`); });
  page.on('requestfailed', (r) => { if (NOISE.test(r.failure()?.errorText || '')) unseen.push('바깥 자원 못 받음: ' + r.url().split('/')[2]); });
  await page.goto(BASE + pageName, { waitUntil: opts.waitUntil || 'domcontentloaded', timeout: opts.timeout || 25000 });
  await page.waitForTimeout(opts.settle ?? 1800);
  const probe = async () => {
    const r = await page.evaluate(EXTRACT);
    return { ...r, all: r.visible + '\n' + r.hidden, errors: [...new Set(errors)], unseen: [...new Set(unseen)] };
  };
  return { page, probe, close: () => browser.close() };
}

/* ── 단독 실행 ── */
if (import.meta.url === `file://${process.argv[1]}`) {
  const pages = process.argv.slice(2);
  if (!pages.length) { console.log('쓰기: node scripts/audit/page-probe.mjs index.html order-preview.html …'); process.exit(2); }
  let worst = 0;
  for (const pg of pages) {
    for (const width of [390, 1280]) {
      let h;
      try { h = await openProbe(pg, { width }); }
      catch (e) { console.log(`· ${pg}@${width} — 재지 못했습니다: ${e.message}`); worst = Math.max(worst, e.cantLook ? 2 : 1); continue; }
      const r = await h.probe();
      const flag = r.errors.length || r.scrollsX;
      if (flag) worst = Math.max(worst, 1);
      console.log(`${flag ? '▲' : '✓'} ${pg.padEnd(19)}@${String(width).padEnd(5)} 보이는 글 ${String(r.visible.length).padStart(6)}자 · 숨은 글 ${String(r.hidden.length).padStart(6)}자 · DOM ${r.domNodes}`
        + ` · 가로스크롤 ${r.scrollsX ? '★있음 ' + r.scrollWidth + '/' + r.clientWidth : '없음'}`
        + (r.overflow.length ? ` · 삐져나온 것 ${r.overflow.length}(${r.overflow.slice(0, 3).join(' ')})` : ''));
      r.errors.forEach((e) => console.log('      ★ ' + e));
      r.unseen.forEach((e) => console.log('      ☐ 못 봄: ' + e));
      await h.close();
    }
  }
  console.log(worst === 0 ? '\n✓ 전부 통과' : worst === 2 ? '\n· 일부를 재지 못했습니다(종료 2 — 결함 아님)' : '\n✗ 살펴볼 것이 있습니다(종료 1)');
  process.exit(worst);
}
