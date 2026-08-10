// 예식 길이는 화면마다 같은 수여야 한다 [EST_ONE_NUMBER]
//
// ★왜 이 검사가 생겼나 (2026-08-10 실사고)
//   식순 빌더 완성 화면은 「감동 코스 · 약 28분」이라 하고, 거기서 만든 미리듣기를 열면
//   「실제 예식은 약 47분이에요」가 떴다. 같은 고객이 같은 예식에 대해 두 수를 봤다.
//   원인: 미리듣기 인트로가 meta.totalSec(= clipSec + liveSec + 여백)을 「실제 예식」이라 불렀다.
//   그 값은 디렉터 패널이 「통틀어」라 부르는 수다 — 예식 길이가 아니라 **예식 + 남는 시간**이다.
//   ★거꾸로 붙어 있어서 더 나빴다: 짧은 코스일수록 남는 시간이 커져 이 수가 커진다
//     (기록 16분 → 54분 · 축제 30분 → 44분). 고객이 볼수록 헷갈리는 방향이었다.
//
// ★이 검사는 문자열을 안 믿는다 — 두 화면을 실제로 띄워 **눈에 보이는 수**를 읽어 맞댄다.
//   코드에서 'minLabel 을 쓰는가'만 보면, 다른 곳에서 다시 totalSec 으로 덮어써도 통과한다.
//
// ★종료 코드 [CANT_LOOK] — 0 통과 · 1 재서 틀림 · 2 재지 못함(브라우저·서버 없음).
//   못 잰 것을 통과로 적지 않는다.
//
// ★이 검사는 어떤 게이트도 돌리지 않는다 [NO_GATE] — 브라우저와 로컬 서버(:8895)가 필요해서다.
//   식순·코스 시간을 건드렸으면 손으로 돌린다. 0/1/2 는 사람이 읽는 값이다.
//     PORT=8895 python3 -m http.server 8895   (저장소 루트)
//     node scripts/check-est-one.mjs

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execSync } from 'node:child_process';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const PORT = process.env.PORT || 8895;
const COURSES = ['damback', 'minimal', 'gamdong', 'family', 'record', 'festive'];

/* [PW_FIND] playwright 자리를 넓게 묻는다 — 한 경로를 박아 두면 다른 세션에서 조용히 안 돈다. */
let chromium;
{
  let g = '';
  try { g = execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* npm 없음 */ }
  for (const t of [process.env.PW, 'playwright', 'playwright-core', g && `${g}/playwright/index.js`,
    '/opt/node-tools/node_modules/playwright/index.js'].filter(Boolean)) {
    try { chromium = require(t).chromium; break; } catch { /* 다음 */ }
    try { const m = await import(t); chromium = (m.default ?? m).chromium; if (chromium) break; } catch { /* 다음 */ }
  }
}
if (!chromium) { console.log('✗ playwright 를 못 찾아 아무것도 재지 못했습니다.\n  ※ 종료 코드 2 = 재지 못했다(화면 결함 아님) · 1 = 재서 틀렸다'); process.exit(2); }

const EXE = process.env.PW_EXE || '/opt/pw-browsers/chromium';
let browser;
try { browser = await chromium.launch({ executablePath: EXE }); }
catch { try { browser = await chromium.launch(); } catch (e) {
  console.log(`✗ 브라우저를 못 띄워 아무것도 재지 못했습니다 (${String(e).slice(0, 60)})`); process.exit(2); } }

const B = `http://127.0.0.1:${PORT}/`;
const bad = [], rows = [];
try {
  // ① 빌더에서 코스별 '완성 화면에 보이는 분'과 미리듣기 주소를 얻는다
  const gen = await browser.newPage();
  try { await gen.goto(B + 'order-preview.html', { waitUntil: 'load', timeout: 20000 }); }
  catch { console.log(`✗ 로컬 서버(:${PORT})에 못 붙었습니다 — 저장소 루트에서 python3 -m http.server ${PORT} 를 띄우세요.\n  ※ 종료 코드 2 = 재지 못했다 · 1 = 재서 틀렸다`); await browser.close(); process.exit(2); }
  await gen.waitForTimeout(800);
  const built = [];
  for (const c of COURSES) {
    const r = await gen.evaluate((c) => {
      S.course = c; courseStarted = true; buildSteps(); goDone();
      const m = document.getElementById('stage').innerText.match(/약\s*([0-9]+)\s*분/);
      return { shown: m ? +m[1] : null, url: RitualPreviewLink.url(S, {}) };
    }, c);
    built.push({ c, ...r });
  }
  await gen.close();

  // ② 그 주소를 열어 인트로에 보이는 '실제 예식' 분을 읽는다
  for (const b of built) {
    if (!b.url) { bad.push(`${b.c}: 미리듣기 주소가 안 만들어졌다`); continue; }
    const p = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const full = b.url.startsWith('http') ? b.url : B + b.url.replace(/^\.?\//, '');
    await p.goto(full, { waitUntil: 'load', timeout: 20000 });
    await p.waitForTimeout(1200);
    const t = await p.evaluate(() => document.body.innerText);
    await p.close();
    const m = t.match(/실제 예식은 약\s*([0-9]+)\s*분/);
    const got = m ? +m[1] : null;
    rows.push([b.c, b.shown, got]);
    if (b.shown == null) bad.push(`${b.c}: 완성 화면에서 분을 못 읽었다(화면이 바뀌었나)`);
    else if (got == null) bad.push(`${b.c}: 미리듣기 인트로에서 '실제 예식은 약 N분'을 못 읽었다`);
    else if (got !== b.shown) bad.push(`${b.c}: 완성 화면 ${b.shown}분 ↔ 미리듣기 ${got}분 — 같은 예식에 두 수`);
  }
} finally { await browser.close(); }

console.log('코스        완성 화면   미리듣기');
rows.forEach(([c, a, d]) => console.log(`${String(c).padEnd(11)} ${String(a ?? '?').padStart(5)}분  ${String(d ?? '?').padStart(7)}분  ${a === d ? '✓' : '✗'}`));
if (!rows.length) { console.log('\n✗ 한 코스도 재지 못했습니다 — 통과가 아니라 안 본 것입니다.'); process.exit(2); }
if (bad.length) { console.log('\n✗ 예식 길이가 화면마다 다릅니다 [EST_ONE_NUMBER]'); bad.forEach((x) => console.log('   ' + x));
  console.log('   → 미리듣기 인트로는 meta.minLabel 을 쓸 것. totalSec 은 「통틀어」(예식 + 남는 시간)다.'); process.exit(1); }
console.log(`\n✓ ${rows.length}코스 전부 두 화면이 같은 수를 말합니다.`);
process.exit(0);
