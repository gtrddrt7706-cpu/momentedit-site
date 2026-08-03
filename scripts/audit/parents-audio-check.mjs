// parents.html — 음원이 놓인 뒤 「듣기」가 음원 재생으로 바뀌는지 실렌더로 확인한다
//
//   node scripts/audit/parents-audio-check.mjs
//
// 왜 실렌더인가
//   parents.html은 fetch(AUDIO_SRC, {method:'HEAD'})가 200일 때만 setupAudioMode()를 켠다.
//   파일을 놓았는지는 ls로 알 수 있지만, 그 경로로 브라우저가 실제 200을 받는지는 렌더해야 안다.
//   ★내 도구가 되는 것과 사용자 화면에서 되는 것은 다른 질문이다.

import { spawn } from 'node:child_process';
import path from 'node:path';
import { launchBrowser } from './_browser.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const PORT = 8231;
const AUDIO = '/assets/audio/parents-letter.mp3';

const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'],
  { cwd: root, stdio: 'ignore' });
const stop = () => { try { srv.kill('SIGTERM'); } catch {} };
process.on('exit', stop);

await new Promise((r) => setTimeout(r, 900));

const br = await launchBrowser();
if (!br) { console.error('✗ 브라우저를 못 띄웠습니다'); stop(); process.exit(1); }

let bad = 0;

for (const vp of [{ width: 390, height: 844 }, { width: 1280, height: 900 }]) {
  const { page, errors } = await br.newPage({ port: PORT, viewport: vp });

  // 음원 요청이 실제로 몇으로 떨어지는지 그대로 받아 적는다
  const audioHits = [];
  page.on('response', (res) => {
    const u = res.url();
    if (u.includes('parents-letter.mp3')) audioHits.push(`${res.request().method()} ${res.status()}`);
  });

  await page.goto(`http://localhost:${PORT}/parents.html`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(700);

  const st = await page.evaluate(() => {
    const btn = document.querySelector('[data-listen], .listen-btn, button#listen')
      || [...document.querySelectorAll('button')].find((b) => /듣기|들어/.test(b.textContent || ''));
    const sign = document.querySelector('.sign-name');
    return {
      btnText: btn ? (btn.textContent || '').trim() : null,
      btnHidden: btn ? !!btn.hidden : null,
      btnVisible: btn ? !!(btn.offsetWidth || btn.offsetHeight) : false,
      signName: sign ? (sign.textContent || '').trim() : null,
    };
  });

  const tag = `${vp.width}px`;
  const err404 = errors.filter((e) => /404|parents-letter/.test(e));
  console.log(`\n── ${tag}`);
  console.log(`  음원 응답      ${audioHits.join(' · ') || '(요청 없음)'}`);
  console.log(`  듣기 버튼      ${st.btnText === null ? '없음' : `"${st.btnText}" hidden=${st.btnHidden} 보임=${st.btnVisible}`}`);
  console.log(`  화면 서명      ${st.signName || '(없음)'}`);
  console.log(`  pageerror     ${errors.length}건${err404.length ? ' ★음원 관련 ' + err404.length + '건' : ''}`);
  if (errors.length) errors.slice(0, 5).forEach((e) => console.log(`      · ${e.slice(0, 120)}`));

  if (!audioHits.some((h) => /200/.test(h))) { console.log(`  ✗ ${tag}: 음원이 200으로 안 떨어집니다`); bad++; }
  if (!st.btnVisible) { console.log(`  ✗ ${tag}: 듣기 버튼이 화면에 없습니다`); bad++; }
  if (st.signName !== 'Moment Edit') { console.log(`  ✗ ${tag}: 화면 서명이 'Moment Edit'가 아닙니다`); bad++; }
  if (err404.length) { console.log(`  ✗ ${tag}: 음원 관련 오류가 남아 있습니다`); bad++; }

  await page.close();
}

await br.close();
stop();
console.log(bad ? `\n✗ ${bad}건 실패` : '\n✓ 두 폭 모두 통과 — 음원 200 · 듣기 버튼 노출 · 서명 노출 · 음원 오류 0');
process.exit(bad ? 1 : 0);
