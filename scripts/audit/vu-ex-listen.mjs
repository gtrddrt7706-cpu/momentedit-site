#!/usr/bin/env node
/* ★★[VU_EX_LISTEN 2026-10-06 사장님 «식전 영상 소개는 왜 들어 보기가 없어 · 다음 누를 때마다 간격이 바뀐다 · 한 사이즈로 고정 · 예시는 만들어서 넣어 놓자 · 여기 역할은 임시로 들어 볼 수 있게만»]
   두 분 목소리 «나오는 곳» 작은 창을 실제 화면으로 잰다(390 · 1280)
   ① 식전 영상 소개 · 입장 인사 = «예시 1~4» 칩 · 고르면 그 글 · 두 분 글은 바뀌지 않는다
   ② 소리 파일이 없는 글도 «들어 보기» — 그 자리에서 AI 로 읽는다(practice) · «임시로 들려 드리는 AI 목소리예요»
   ③ 다음 · 칩을 눌러도 글 칸 높이 · «다음» 단추 자리가 그대로
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · SHOTS=<폴더> 면 찍는다 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
for (const w of [390, 1280]) {
  const pg = await br.newPage({ viewport: { width: w, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__plays = []; HTMLMediaElement.prototype.play = function () { if (this.tagName === 'AUDIO') window.__plays.push(String(this.getAttribute('src') || this.src || '')); return Promise.resolve(); }; });
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.pvText = ''; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true; VC.st = { groom: { ready: true }, bride: { ready: false } };
    window.__calls = []; _vc0 = (op, d) => { window.__calls.push(op + ':' + (d && d.role) + ':' + String(d && d.text || '').slice(0, 8)); return new Promise((ok) => setTimeout(() => ok({ ok: true, mime: 'audio/mpeg', data: btoa('MP3') }), 200)); };
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
  await wait(500); await pg.evaluate(() => mkGo('_voice')); await wait(700);
  await pg.click('[data-fk="mkvuse:pv"]'); await wait(400);
  const geo = () => pg.evaluate(() => { const q = document.getElementById('mkVuQ'), n = document.querySelector('[data-fk="mkusenext"]'); return { P: q && (q.parentNode.className + ':' + Math.round(q.parentNode.getBoundingClientRect().height) + ':' + q.parentNode.style.minHeight + ':box' + Math.round(document.querySelector('#mkRecDlg [role=dialog]').getBoundingClientRect().top)), qh: q ? Math.round(q.getBoundingClientRect().height) : 0, ny: n ? Math.round(n.getBoundingClientRect().top) : 0, t: (document.getElementById('mkDlgT') || {}).textContent }; });
  const a = await pg.evaluate(() => ({ chips: [...document.querySelectorAll('[data-fk^="mkuseex:"]')].map((b) => b.textContent), q: (document.getElementById('mkVuQ') || {}).textContent || '', play: !!document.querySelector('[data-fk="mkuseplay"]'), tmp: !!document.querySelector('.mk-vu-tmp') }));
  ok(`${w} ① 식전 영상 소개 — «예시 1~4» 칩 · 예시 1 글 · «들어 보기» 있음 · «임시로 들려 드리는 AI 목소리예요» 없음 [VU_FLOW_FREE]`, a.chips.join('|') === '예시 1|예시 2|예시 3|예시 4' && a.q === await pg.evaluate(() => PV_EX[0][1]) && a.play && !a.tmp && !/임시로 들려/.test(await pg.evaluate(() => document.getElementById('mkRecDlg').textContent)), JSON.stringify(a));
  const g0 = await geo();
  if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `vu-ex-${w}.png`) });
  await pg.click('[data-fk="mkuseex:2"]'); await wait(300);
  const b = await pg.evaluate(() => ({ q: (document.getElementById('mkVuQ') || {}).textContent || '', pv: S.pvText }));
  const g1 = await geo();
  ok(`${w} ① 예시 3 칩 → 그 글 · 두 분 글(S.pvText)은 그대로 · 차례 = 칩 → 글 → 들어 보기 → 이전 · 다음 [VU_FLOW_FREE]`, b.q === await pg.evaluate(() => PV_EX[2][1]) && b.pv === '' && await pg.evaluate(() => { const y = (s) => { const e = document.querySelector(s); return e ? e.getBoundingClientRect().top : -1; }; return y('[data-fk^="mkuseex:"]') < y('#mkVuQ') && y('#mkVuQ') < y('[data-fk="mkuseplay"]') && y('[data-fk="mkuseplay"]') < y('[data-fk="mkusenext"]'); }), JSON.stringify({ b, g0, g1 }));
  await pg.click('[data-fk="mkuseplay"]'); await wait(700);
  const c = await pg.evaluate(() => ({ calls: window.__calls.slice(), plays: window.__plays.slice() }));
  ok(`${w} ② 소리 파일이 없는 글 «들어 보기» → AI 로 읽기(practice · 신랑) · 그 소리를 튼다`, c.calls.some((x) => /^practice:groom:/.test(x)) && c.plays.some((x) => /^blob:/.test(x)), JSON.stringify(c));
  await pg.click('[data-fk="mkuseplay"]'); await wait(300);
  ok(`${w} ② 같은 글 두 번째 «들어 보기»는 다시 만들지 않는다`, (await pg.evaluate(() => window.__calls.filter((x) => /^practice:/.test(x)).length)) === c.calls.filter((x) => /^practice:/.test(x)).length);   /* [EX_PREBAKE] 예시 미리 만들기(make)는 뒤에서 돈다 · 들어 보기(practice)만 센다 */
  /* ③ 다음 · 이전 — 높이 그대로 */
  const hs = [g0.qh]; const ys = [g0.ny]; const ps = [g0.P];
  { await pg.click('[data-fk="mkusenext"]'); await wait(300); const g = await geo(); hs.push(g.qh); ys.push(g.ny); ps.push(g.P); }   // 식전 영상 소개 → 입장 인사(마지막)
  for (let i = 0; i < 4; i++) { await pg.click('[data-fk="mkuseprev"]'); await wait(300); const g = await geo(); hs.push(g.qh); ys.push(g.ny); ps.push(g.P); }
  /* ★[VU_FLOW_FREE 2026-10-06 사장님 «그냥 창 움직이게 하고 최적화»] 종전 «다음 · 이전을 오가도 높이 같다» → 높이는 글만큼 · 본문에 최소 높이를 걸지 않는다 */
  ok(`${w} ③ 다음 · 이전 — 창 본문에 고정 높이 없음(글만큼) · 들어 보기와 이전 · 다음 사이 빈칸 30px 이하 [VU_FLOW_FREE]`, ps.every((p) => p && p.split(':')[2] === '') && await pg.evaluate(() => { const a = document.querySelector('[data-fk="mkuseplay"]').getBoundingClientRect(), n = document.querySelector('.mk-vu-nav').getBoundingClientRect(); return n.top - a.bottom <= 30; }), JSON.stringify({ hs, ys, ps }));
  ok(`${w} ④ 다음 · 이전을 오가도 이전 · 다음 단추 자리 그대로(±1px) · 위쪽이 늘고 준다 [VU_BOTTOM_FIX]`, Math.max(...ys) - Math.min(...ys) <= 1, JSON.stringify(ys));
  ok(`${w} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
}
await br.close(); srv.close();
console.log(fail ? `✗ VU_EX_LISTEN 실패 ${fail}건` : '✓ VU_EX_LISTEN 통과'); process.exit(fail ? 1 : 0);
