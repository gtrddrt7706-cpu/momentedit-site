#!/usr/bin/env node
/**
 * console-alt-clip.mjs — 덕담 길어짐 대응(ALT_CLIP) 실렌더 검증  [ALT_CLIP_TEST]
 *
 * 무엇을 지키나:
 *   1) 덕담이 3분 안에 끝나면 마무리는 기본 문안(narr-bless-end)
 *   2) 3분을 넘기면 콘솔이 스스로 '길었을 때' 문안으로 바꿔 발사한다 — 디렉터는 '다음'만 눌렀다
 *   3) 교체 사실이 토스트·배지로 보인다 (몰래 바뀌면 나중에 왜 다른 소리가 났는지 못 찾는다)
 *   4) PHASE_CLIP — 마무리 클립이 흐르는 동안 '사람의 시간' 표시가 남지 않는다
 *   5) 390 / 1280 넘침 0
 *
 * 브라우저가 필요해 merge-guard.sh에는 걸지 않는다. 콘솔·엔진을 고쳤으면 손으로 한 번 돌린다:
 *   (python3 -m http.server 8765 &) ; node automation/tests/console-alt-clip.mjs
 */
const PW = await import('playwright')
  .catch(() => import('/home/claude/.npm-global/lib/node_modules/playwright/index.js'));
const { chromium } = PW.default || PW;

const PORT = process.env.PORT || 8765;
const S = Buffer.from(JSON.stringify({ course: 'damback', bless: 'on' }), 'utf8').toString('base64');
const URL = `http://127.0.0.1:${PORT}/console.html?course=damback&S=` + encodeURIComponent(S) + '&auto=1';

// 이 환경엔 미리 깔린 크로미움이 있다(PLAYWRIGHT_BROWSERS_PATH). 없으면 기본 탐색에 맡긴다.
const EXE = process.env.CHROMIUM_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { existsSync } = await import('node:fs');
const b = await chromium.launch(existsSync(EXE) ? { executablePath: EXE } : {});

async function run(fastForwardSec, label) {
  const ctx = await b.newContext({ viewport: { width: 390, height: 844 } });
  const page = await ctx.newPage();
  await page.clock.install();
  await page.goto(URL);
  await page.waitForSelector('#run:not([hidden])', { timeout: 10000 }).catch(() => {});
  await page.waitForTimeout(300);

  const state = () => page.evaluate(() => ({
    name: document.querySelector('#nName').textContent,
    pos: document.querySelector('#bPos').textContent,
    tags: [...document.querySelectorAll('#nTag .pill')].map(e => e.textContent),
    live: /\blive\b/.test(document.querySelector('#nProg').className),
    btn: document.querySelector('#mBtn').textContent
  }));

  // 덕담 사람 구간(부모님 말씀)에 닿을 때까지 진행한다.
  // ★클립이 도는 동안 누르면 그 큐의 사람 구간을 통째로 건너뛴다 — 시계를 먼저 굴리고, 멈춰 섰을 때만 누른다.
  let guard = 0, reached = false, lastPos = '';
  while (guard++ < 80) {
    await page.clock.runFor(20000);
    await page.waitForTimeout(60);
    const s = await state();
    if (s.live && /덕담|말씀/.test(s.name + s.btn)) { reached = true; break; }
    if (s.pos === lastPos) {                    // 사람을 기다리는 자리 — 여기서만 누른다
      if (s.live) { await page.locator('#mBtn').click({ force: true }); }
      else await page.locator('#mBtn').click({ force: true });
      await page.waitForTimeout(60);
    }
    lastPos = s.pos;
  }
  if (!reached) { console.log(label + ': 덕담 live 구간에 못 닿음'); await ctx.close(); return null; }

  const before = await state();
  if (fastForwardSec) await page.clock.fastForward(fastForwardSec * 1000);
  await page.locator('#mBtn').click({ force: true });
  await page.clock.runFor(500);
  await page.waitForTimeout(120);
  const after = await state();
  const toast = await page.evaluate(() => document.querySelector('#toast').textContent);

  // 넘침 측정 (390 / 1280)
  const over = {};
  for (const w of [390, 1280]) {
    await page.setViewportSize({ width: w, height: w === 390 ? 844 : 800 });
    await page.waitForTimeout(120);
    over[w] = await page.evaluate(() => {
      let n = 0;
      document.querySelectorAll('body *').forEach(e => {
        const r = e.getBoundingClientRect();
        if (r.width > 0 && (r.right > document.documentElement.clientWidth + 1 || r.left < -1)) n++;
      });
      return n;
    });
  }
  await ctx.close();
  console.log(`── ${label}`);
  console.log(`   live 진입   : ${before.name}`);
  console.log(`   다음 큐 이름 : ${after.name}`);
  console.log(`   배지        : ${JSON.stringify(after.tags)}`);
  console.log(`   토스트      : ${toast || '(없음)'}`);
  console.log(`   넘침 390/1280: ${over[390]} / ${over[1280]}`);
  return { after, toast, over };
}

const ctrl = await run(0, '대조군 · 덕담이 짧게 끝남');
const alt = await run(190, '실험군 · 덕담이 3분 10초 이어짐');
await b.close();

let bad = 0;
if (!ctrl || !/마무리$/.test(ctrl.after.name.trim())) { console.log('FAIL 대조군이 기본 마무리가 아니다'); bad = 1; }
if (!alt || !/길었을 때/.test(alt.after.name)) { console.log('FAIL 실험군이 alt 문안으로 안 바뀌었다'); bad = 1; }
if (alt && !/문안을 바꿔/.test(alt.toast || '')) { console.log('FAIL 교체 토스트가 안 떴다'); bad = 1; }
if (alt && !alt.after.tags.some(t => /길어짐 대응/.test(t))) { console.log('FAIL 길어짐 대응 배지가 없다'); bad = 1; }
if (ctrl && ctrl.after.tags.some(t => /길어짐 대응/.test(t))) { console.log('FAIL 대조군에 교체 배지가 떴다'); bad = 1; }
// PHASE_CLIP — 마무리 클립이 나가는 동안에도 "사람의 시간"이 남아 있으면 마이크 주인이 거꾸로 보인다
for (const [r, n] of [[ctrl, '대조군'], [alt, '실험군']]) {
  if (r && r.after.tags.some(t => /사람의 시간|직접 말하는/.test(t))) { console.log('FAIL ' + n + ': 클립 재생 중 사람 구간 배지가 남았다'); bad = 1; }
  if (r && r.after.live) { console.log('FAIL ' + n + ': 클립 재생 중 진행막대가 live 상태다'); bad = 1; }
}
for (const r of [ctrl, alt]) if (r && (r.over[390] || r.over[1280])) { console.log('FAIL 넘침 발생'); bad = 1; }
console.log(bad ? 'ALT_CLIP 검증 실패' : 'ALT_CLIP 검증 통과');
process.exit(bad);
