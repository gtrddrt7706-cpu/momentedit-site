// ★[TIP_NO_AUTO · TUNE_PLAY_TRUE · IOS_PLAY_SESSION 2026-10-07 사장님 «모바일에서 녹음하고 플레이 누르면 소리가 안 난다 · 쓰는 법에 따라 말투 안내가 자동으로 자꾸 펼쳐진다»] (390 · 1280)
//   ①만든 직후 맞추기 창에서도 «쓰는 법에 따라 말투가 달라져요»는 접혀 시작 ②펼치면 점을 눌러 다시 그려도 펼친 채 · 접으면 접힌 채
//   ③틀기가 막히면(아이폰 탭 밖 재생) «멈추기»로 남지 않고 «예시 들어 보기»로 돌아온다 ④틀리면 «멈추기»
//   ⑤소리 세션 — 마이크를 열 때 «녹음+재생» · 닫으면 «재생»(navigator.audioSession 있는 브라우저)
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__block = false; const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (window.__block && !/^data:/.test(this.src)) return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' })); return Promise.resolve(); };
      navigator.audioSession = { type: 'auto' };
      navigator.mediaDevices.getUserMedia = () => Promise.resolve({ getTracks: () => [{ readyState: 'live', stop() { this.readyState = 'ended'; } }] }); });
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { ok: true, on: true, groom: { consent: true, ready: true }, bride: {} };
      for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); }
      VC.sraw = VC.sraw || {}; VC.sraw.groom = { x: new Float32Array(16000), sr: 8000, text: _tuneText() }; _vcTuneOpen('groom', 'enroll'); });
    await wait(500);
    const tip = () => pg.evaluate(() => { const d = document.querySelector('#mkRecDlg details.mk-tip'); return d ? d.open : null; });
    ok(`${w} ① 만든 직후 창에서도 말투 안내는 접혀 시작`, (await tip()) === false, String(await tip()));
    await pg.click('#mkRecDlg details.mk-tip > summary'); await wait(150);
    await pg.click('[data-fk="mktune:t:4"]'); await wait(300);
    ok(`${w} ② 펼친 뒤 점을 눌러 다시 그려도 펼친 채`, (await tip()) === true, String(await tip()));
    await pg.click('#mkRecDlg details.mk-tip > summary'); await wait(150);
    await pg.click('[data-fk="mktune:t:3"]'); await wait(300);
    ok(`${w} ② 접은 뒤 점을 눌러 다시 그려도 접힌 채`, (await tip()) === false, String(await tip()));
    await pg.evaluate(() => { _stopMk(); window.__block = true; _vcSamplePlay(true); }); await wait(200);
    const a = await pg.evaluate(() => ({ aud: !!MK.aud, lab: (document.querySelector('[data-fk="mktuneplay"]') || {}).textContent || '' }));
    ok(`${w} ③ 틀기가 막히면 «멈추기»로 남지 않는다`, !a.aud && !/멈추기/.test(a.lab), JSON.stringify(a));
    await pg.evaluate(() => { window.__block = false; }); await pg.click('[data-fk="mktuneplay"]'); await wait(200);
    const b = await pg.evaluate(() => ({ aud: !!MK.aud, lab: (document.querySelector('[data-fk="mktuneplay"]') || {}).textContent || '' }));
    ok(`${w} ④ 눌러서 틀리면 «멈추기»`, b.aud && /멈추기/.test(b.lab), JSON.stringify(b));
    const c = await pg.evaluate(() => _micGet().then(() => { const r1 = navigator.audioSession.type; _micDrop(); return [r1, navigator.audioSession.type]; }));
    ok(`${w} ⑤ 마이크 열 때 «녹음+재생» · 닫으면 «재생»`, c[0] === 'play-and-record' && c[1] === 'playback', JSON.stringify(c));
    ok(`${w} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nTUNE IOS FAIL ${fail}` : '\nTUNE IOS OK'); process.exit(fail ? 1 : 0);
