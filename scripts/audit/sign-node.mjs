#!/usr/bin/env node
/* [SIG_NODE] 계약서 화면의 전자서명이 «문자열 조립»으로 되돌아갔는지 — 브라우저로 재현해 잰다
 *
 * 무엇이 있었나 (2026-09-20 /점검 라운드 2)
 *   contract/v1-1.html · snap-v1-0.html 이 이렇게 그리고 있었다:
 *     gs.innerHTML = '<img src="' + d.signImage + '" alt="…">'
 *   signImage 는 **고객이 POST 로 보내는 값**이고, 서버 검증(_saveSignature)은 접두사와 길이만 봤다.
 *   그래서 `data:image/png;base64,AAA" onerror="…` 가 저장되고, 여기서 이어붙여져 속성을 빠져나갔다.
 *   브라우저로 재현했다 — window.__pwn=1 (두 판 모두).
 *
 * 왜 무거운가
 *   그 값은 admin.html:3377(adminGetSignature → postMessage)을 타고 **관리자 브라우저**에서도 열린다.
 *   관리자 토큰이 localStorage 에 있으므로 고객이 관리자 권한 문맥에서 코드를 돌릴 수 있었다.
 *
 * ★contract/fitting.html:120 은 처음부터 안전했다 — img.src 속성 대입.
 *   셋 중 둘만 낡아 있었던 것이다. 그래서 이 검사는 «안전한 판»도 함께 돌려 기준으로 삼는다.
 *
 * 종료코드: 0 통과 · 1 실행됨 · 2 재지 못함(브라우저 없음 · 서명칸 미도달)
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { chromium = require(p).chromium; break; } catch {} }
if (!chromium) { console.log('SKIP playwright 없음 — 재지 못했다'); process.exit(2); }
const { spawn } = require('child_process');
const ROOT = new URL('../..', import.meta.url).pathname;
const PORT = 8153;

/* 서버 접두사 검사(^data:image/(png|jpeg);base64,)는 통과하면서 src 속성을 빠져나가는 문자열 */
const EVIL = 'data:image/png;base64,iVBORw0KGgo" onerror="window.__pwn=1" x="';
/* 정상 1×1 PNG — 이게 그려져야 «서명칸에 닿았다»가 증명된다(canary) */
const GOOD = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
/* ★메시지 «계약»이 판마다 다르다 — fitting 은 momentedit:fittingFill 이다(contract/fitting.html:126).
   하나로 뭉뚱그려 보냈더니 fitting 에서 서명이 안 그려졌고, canary 가 그것을 「못 쟀다」로 잡았다.
   canary 가 없었으면 «실행 0건»만 보고 통과라고 적었을 것이다. */
const PAGES = [
  { url: '/contract/v1-1.html', type: 'momentedit:contractFill' },
  { url: '/contract/snap-v1-0.html', type: 'momentedit:contractFill' },
  { url: '/contract/fitting.html', type: 'momentedit:fittingFill' },
];

const srv = spawn('python3', ['-m', 'http.server', String(PORT)], { cwd: ROOT, stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 900));
const browser = await chromium.launch();
const ctx = await browser.newContext();
await ctx.route('**/*', (r) => r.request().url().includes('localhost')
  ? r.continue()
  : r.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true}' }));

let fail = 0, unmeasured = 0;
for (const { url: page, type } of PAGES) {
  const p = await ctx.newPage();
  await p.goto(`http://localhost:${PORT}${page}`, { waitUntil: 'domcontentloaded' });
  await p.waitForTimeout(700);
  const push = (sig) => p.evaluate(([s, t]) => {
    window.postMessage({ type: t, data: { signed: true, signImage: s, groom: '김', bride: '이' } }, location.origin);
  }, [sig, type]);

  await push(GOOD); await p.waitForTimeout(700);
  const reached = await p.evaluate((g) => Array.from(document.querySelectorAll('img')).some((i) => i.src === g), GOOD);

  await push(EVIL); await p.waitForTimeout(900);
  const r = await p.evaluate(() => ({ pwn: window.__pwn || 0, brokeOut: !!document.querySelector('img[onerror]') }));
  await p.close();

  if (r.pwn || r.brokeOut) { console.log(`  ✗ ${page} — 실행됨 ${JSON.stringify(r)}`); fail = 1; }
  else if (!reached) { console.log(`  ?? ${page} — 정상 서명이 안 그려졌다(못 쟀다) · 서명칸 선택자나 postMessage 계약이 바뀌었나`); unmeasured++; }
  else console.log(`  ok ${page} — 실행 0 · 정상 서명 렌더 확인`);
}
await browser.close(); srv.kill();
if (fail) console.log('\n[SIG_NODE] 빨강 — 서명 dataUrl 이 문자열로 조립되고 있다. img.src 속성 대입으로 되돌릴 것(contract/fitting.html 참고)');
else if (unmeasured) console.log('\n[SIG_NODE] 못 쟀다 — 통과가 아니다');
else console.log(`\n[SIG_NODE] 통과 — ${PAGES.length}판 실행 0건 · 전부 서명칸 도달 확인`);
process.exit(fail ? 1 : (unmeasured ? 2 : 0));
