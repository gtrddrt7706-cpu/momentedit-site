// ★[TIP_ONCE 2026-10-07 사장님 «모션그래픽 부분만 없애고 팝업은 AI 두 분 목소리 누르면 나오게»] (390 · 1280)
//   ①AI 두 분 목소리를 처음 누르면 «확정하면 이렇게 돼요» 창 ②알겠어요 → 그냥 닫힘(움직임 · 빛남 없음) · 본 것 기억 · «확정 안내 보기» 링크가 있다
//   ③스튜디오 나레이션을 눌러도 창이 안 뜬다 ④AI 를 다시 눌러도 안 뜬다 ⑤코드가 값을 바꿀 때는 안 뜬다 ⑥첫 AI 순간에 네 줄을 펼쳐 두지 않는다
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
const setup = async (pg) => { await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['prevideo', 'entry'].forEach((k) => { S.on[k] = 1; }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; window._vc = () => new Promise(() => {}); VC.st = { groom: { ready: false }, bride: { ready: false } }; VC.loading = false; delete S.tipSeen; buildSteps(); for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
  await wait(300); await pg.evaluate(() => mkGo('guest')); await wait(500); };
const st = (pg) => pg.evaluate(() => ({ t: (document.getElementById('mkDlgT') || {}).textContent || '', dlg: !!document.querySelector('#mkRecDlg .mk-dlg-c'), anim: document.getAnimations().filter((a) => a.effect && a.effect.target && a.effect.target.closest && a.effect.target.closest('#mkRecDlg, [data-fk^="mkkeept"]')).length, glow: !!document.querySelector('.tip-glow'), link: !!document.querySelector('[data-fk="mkkeept:guest"]'), open: document.querySelectorAll('.mk-keepg:not(.shut)').length, seen: JSON.stringify(S.tipSeen || {}) }));
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await setup(pg);
    await pg.click('[data-fk="lsc:guestVoice:ai"]'); await wait(400);
    const a = await st(pg); ok(`${w} ① AI 두 분 목소리 처음 → «확정하면 이렇게 돼요» 창`, a.t === '확정하면 이렇게 돼요' && a.dlg, JSON.stringify(a));
    await pg.click('[data-fk="mkkeepok"]'); await wait(80);
    const b = await st(pg); ok(`${w} ② 알겠어요 → 바로 닫힘 · 움직임 · 빛남 없음 · 본 것 기억 · «확정 안내 보기» 있음`, !b.dlg && !b.anim && !b.glow && b.link && /"keep":1/.test(b.seen), JSON.stringify(b));
    ok(`${w} ⑥ 첫 AI 순간에 네 줄을 펼쳐 두지 않는다`, b.open === 0, JSON.stringify(b));
    await pg.click('[data-fk="lsc:guestVoice:nar"]'); await wait(400);
    const c = await st(pg); ok(`${w} ③ 스튜디오 나레이션은 창이 안 뜬다`, !c.dlg, JSON.stringify(c));
    await pg.click('[data-fk="lsc:guestVoice:ai"]'); await wait(400); const e1 = await st(pg);
    ok(`${w} ④ AI 를 다시 눌러도 안 뜬다`, !e1.dlg, JSON.stringify(e1));
    const f = await pg.evaluate(() => { delete S.tipSeen; _lSet('entryVoice', 'ai'); render(); return !!document.querySelector('#mkRecDlg .mk-dlg-c'); });
    ok(`${w} ⑤ 코드가 값을 바꿀 때는 안 뜬다`, !f, String(f));
    ok(`${w} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nTIP ONCE FAIL ${fail}` : '\nTIP ONCE OK'); process.exit(fail ? 1 : 0);
