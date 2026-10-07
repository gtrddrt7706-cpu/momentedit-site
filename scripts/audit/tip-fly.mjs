// ★[TIP_FLY 2026-10-07 사장님 «AI 두 분 목소리 누르면 팝업 · 닫으면 확정 안내 보기 쪽으로 쏙 들어가는 모션» · «나레이션 자세히도 같이» → «추천대로»] (390 · 1280)
//   ①AI 두 분 목소리를 처음 누르면 «확정하면 이렇게 돼요» 창 ②알겠어요 → 창이 닫히고 «확정 안내 보기»가 한 번 빛난다 · 본 것 기억
//   ③스튜디오 나레이션을 처음 누르면 «안내 목소리, 무엇이 다른가요» 창 → 확인 → «나레이션 자세히»가 빛난다 ④다시 눌러도 안 뜬다
//   ⑤코드가 값을 바꿀 때(고객이 누른 것이 아닐 때)는 안 뜬다 ⑥움직임 줄이기면 창만 닫고 빛만
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
const st = (pg) => pg.evaluate(() => ({ t: (document.getElementById('mkDlgT') || {}).textContent || '', dlg: !!document.querySelector('#mkRecDlg .mk-dlg-c'), glowK: !!document.querySelector('[data-fk="mkkeept:guest"].tip-glow'), glowN: !!document.querySelector('[data-fk="mkvsopen"].tip-glow'), seen: JSON.stringify(S.tipSeen || {}) }));
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await setup(pg);
    await pg.click('[data-fk="lsc:guestVoice:ai"]'); await wait(400);
    const a = await st(pg); ok(`${w} ① AI 두 분 목소리 처음 → «확정하면 이렇게 돼요» 창`, a.t === '확정하면 이렇게 돼요' && a.dlg, JSON.stringify(a));
    await pg.click('[data-fk="mkkeepok"]'); await wait(650);
    const b = await st(pg); ok(`${w} ② 알겠어요 → 창 닫힘 · «확정 안내 보기» 빛남 · 본 것 기억`, !b.dlg && b.glowK && /"keep":1/.test(b.seen), JSON.stringify(b));
    await pg.click('[data-fk="lsc:guestVoice:nar"]'); await wait(400);
    const c = await st(pg); ok(`${w} ③ 스튜디오 나레이션 처음 → «안내 목소리, 무엇이 다른가요» 창`, c.t === '안내 목소리, 무엇이 다른가요' && c.dlg, JSON.stringify(c));
    await pg.click('[data-fk="mkvsdone"]'); await wait(650);
    const d = await st(pg); ok(`${w} ③ 확인 → 창 닫힘 · «나레이션 자세히» 빛남`, !d.dlg && d.glowN && /"nar":1/.test(d.seen), JSON.stringify(d));
    await pg.click('[data-fk="lsc:guestVoice:ai"]'); await wait(400); const e1 = await st(pg);
    await pg.click('[data-fk="lsc:guestVoice:nar"]'); await wait(400); const e2 = await st(pg);
    ok(`${w} ④ 다시 눌러도 안 뜬다`, !e1.dlg && !e2.dlg, JSON.stringify({ e1, e2 }));
    const f = await pg.evaluate(() => { delete S.tipSeen; _lSet('entryVoice', 'ai'); render(); return !!document.querySelector('#mkRecDlg .mk-dlg-c'); });
    ok(`${w} ⑤ 코드가 값을 바꿀 때는 안 뜬다`, !f, String(f));
    ok(`${w} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
  const pg = await br.newPage({ viewport: { width: 390, height: 900 }, hasTouch: true, reducedMotion: 'reduce' }); await setup(pg);
  await pg.click('[data-fk="lsc:guestVoice:ai"]'); await wait(300); await pg.click('[data-fk="mkkeepok"]'); await wait(120);
  const g = await st(pg); ok('390 ⑥ 움직임 줄이기 — 바로 닫히고 빛만', !g.dlg && g.glowK, JSON.stringify(g)); await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nTIP FLY FAIL ${fail}` : '\nTIP FLY OK'); process.exit(fail ? 1 : 0);
