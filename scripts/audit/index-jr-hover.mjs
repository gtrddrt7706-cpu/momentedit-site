// index.html 「My Page」 목업 — 목록을 «짚기만 해도» 그 화면으로 넘어가는가
//
//   node scripts/audit/index-jr-hover.mjs
//
// 왜 (2026-08-30 사용자 지시)
//   "이부분도 위쪽 목업 처럼 클릭하지않아도 마우스 올려도 전환되게 해죠"
//   위쪽 「하객이 만나는 화면」은 원래 mouseover 로 넘어간다. 아래 My Page 목업만 클릭이라야 넘어갔다.
//
// 무엇을 지키는가
//   ① 짚으면 그 칸이 켜지고, 폰 화면(.jr-shot)도 «같은 번호»로 함께 넘어간다
//   ② 짚은 동안 자동 넘김이 멈춘다 — 안 그러면 보고 있는 화면이 손대지 않았는데 바뀐다
//   ③ 누르는 길은 그대로 산다 — hover 를 넣다가 click 을 잃으면 터치 기기에서 기능이 사라진다
//
// ★한 번 넣었다 뺀 검사 — "같은 칸에서 움직여도 다시 켜지지 않는가".
//   깨뜨려 봐도(같은 칸 가드를 지워도) 끝내 빨간불이 안 떴다. 이미 켜진 칸에 classList.toggle(...,true)
//   를 다시 부르면 브라우저가 속성을 안 건드려서, 지켜볼 «변화»라는 게 아예 없었다.
//   초록으로만 뜰 수 있는 검사는 아무것도 지키지 못하므로 남기지 않는다.
import { spawn } from 'node:child_process';
import { freePort } from './_freeport.mjs';
import path from 'node:path';
import { launchBrowser } from './_browser.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');

const PORT = await freePort();   // [FREE_PORT] 근거는 _freeport.mjs 주석에
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', root], { stdio: 'ignore' });
const stop = () => { try { srv.kill(); } catch {} };
process.on('exit', stop);
await new Promise((r) => setTimeout(r, 1400));

const br = await launchBrowser();
if (!br) { console.error('✗ 브라우저를 못 띄웠습니다'); stop(); process.exit(1); }

let bad = 0;
const fail = (m) => { console.log(`  ✗ ${m}`); bad++; };

const { page } = await br.newPage({ port: PORT, viewport: { width: 1280, height: 900 } });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'domcontentloaded' });
await page.waitForSelector('.jr-showcase .jr-step', { timeout: 15000 });
await page.evaluate(() => document.querySelector('.jr-showcase').scrollIntoView({ block: 'center' }));
await page.waitForTimeout(900);

const state = () => page.evaluate(() => {
  const steps = [...document.querySelectorAll('.jr-showcase .jr-step')];
  const shots = [...document.querySelectorAll('.jr-showcase .jr-shot')];
  return {
    n: steps.length,
    step: steps.findIndex((e) => e.classList.contains('on')),
    shot: shots.findIndex((e) => e.classList.contains('on')),
    pressed: steps.findIndex((e) => e.querySelector('.jr-step-btn')?.getAttribute('aria-pressed') === 'true'),
  };
});

const n = (await state()).n;
console.log(`\n목록 ${n}칸`);

/* ① 짚으면 넘어가는가 — 모든 칸을 하나씩 */
console.log('\n── 1) 마우스를 올리면 그 화면으로 넘어가는가');
for (let i = n - 1; i >= 0; i--) {
  await page.hover(`.jr-showcase .jr-step:nth-child(${i + 1}) .jr-step-btn`);
  await page.waitForTimeout(220);
  const s = await state();
  const ok = s.step === i && s.shot === i && s.pressed === i;
  console.log(`  ${i + 1}번 칸에 올림 → 칸=${s.step + 1} 폰화면=${s.shot + 1} aria-pressed=${s.pressed + 1} ${ok ? '' : '  ← 어긋남'}`);
  if (s.step !== i) fail(`${i + 1}번 칸을 짚었는데 켜진 칸은 ${s.step + 1}번입니다`);
  if (s.shot !== i) fail(`${i + 1}번 칸을 짚었는데 폰 화면은 ${s.shot + 1}번입니다 — 글과 그림이 다른 말을 합니다`);
  if (s.pressed !== i) fail(`${i + 1}번 칸을 짚었는데 aria-pressed 는 ${s.pressed + 1}번입니다 — 낭독기가 다른 칸을 읽습니다`);
}

/* ② 짚은 채로 두면 자동 넘김이 멈춰 있는가 */
console.log('\n── 2) 짚고 있는 동안 혼자 넘어가지 않는가');
await page.hover('.jr-showcase .jr-step:nth-child(2) .jr-step-btn');
await page.waitForTimeout(300);
const held0 = await state();
await page.waitForTimeout(6500);                 // 자동 넘김 주기(5.4초)보다 길게
const held1 = await state();
console.log(`  6.5초 붙잡고 있었더니  ${held0.step + 1}번 → ${held1.step + 1}번`);
if (held1.step !== held0.step) fail(`짚고 있는데 혼자 ${held0.step + 1}→${held1.step + 1}번으로 넘어갔습니다`);

/* ③ 누르는 길은 그대로 사는가 */
console.log('\n── 3) 눌러서 넘기는 길이 그대로 사는가(터치 기기)');
await page.mouse.move(5, 5);
await page.waitForTimeout(200);
await page.click('.jr-showcase .jr-step:nth-child(4) .jr-step-btn');
await page.waitForTimeout(250);
const clicked = await state();
console.log(`  4번 칸을 눌렀더니  칸=${clicked.step + 1} 폰화면=${clicked.shot + 1}`);
if (clicked.step !== 3 || clicked.shot !== 3) fail('눌렀는데 4번으로 넘어가지 않았습니다 — 터치 기기에서 기능이 사라집니다');

await page.close();
await br.close();
stop();
console.log(bad ? `\n✗ ${bad}건 실패` : '\n✓ 세 가지 모두 통과 — 짚어도 넘어가고, 짚은 동안 멈추고, 누르는 길도 삽니다');
process.exit(bad ? 1 : 0);
