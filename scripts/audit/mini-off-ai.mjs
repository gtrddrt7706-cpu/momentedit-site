#!/usr/bin/env node
/* ★[MINI_OFF_AI 2026-10-05 사장님 «모바일에서 나레이션 쪽이랑 다르게 AI 목소리 쪽은 아래 재생바가 나오는데 나레이션이랑 동일하게»]
   AI 줄을 만든 뒤 «이 순간 들어 보기» → 아래 재생 바(#lsMini)가 안 뜨고 · 흐르는 카드 ▶ 가 ■ · 그 ▶ 를 누르면 멈춘다(390 · 1280). 종료 0 통과 · 1 실패 · 2 재지 못함 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const { chromium } = pw;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await chromium.launch(); } catch { try { br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => {
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window._vc = function (op, d) { if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: true, left: 2 } });
      if (op === 'make') { return b64(tone(2)).then((x) => ({ ok: true, key: d.key, parts: (d.lines || [[d.one || 'groom']]).map((l) => ({ who: l[0], mime: 'audio/mpeg', data: x })) })); } return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-05 10:00' }), 30); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; opSync(); });
  await nx(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => mkVsOpen()); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(2500);
  if (await pg.isVisible('[data-fk="mkvsdone"]')) { await pg.click('[data-fk="mkvsdone"]'); await pg.waitForTimeout(400); }
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(800);
  for (let t = 0; t < 40; t++) { const n = await pg.evaluate(() => document.querySelectorAll('.mk-vpl[data-fk^="mkvpl:"]').length); if (n >= 1) break; await pg.waitForTimeout(500); }
  const n0 = await pg.evaluate(() => document.querySelectorAll('.mk-vpl[data-fk^="mkvpl:"]').length);
  ok(W + ' AI 줄이 만들어져 카드 ▶(mkvpl)가 있다', n0 >= 1, String(n0));
  // 오디오는 흉내만 — 실제 재생 없이 줄이 흐르게
  await pg.evaluate(() => { HTMLMediaElement.prototype.play = function () { return Promise.resolve(); }; });
  await pg.evaluate(() => { const b = document.querySelector('.mk-hbtn[data-mp]'); if (b) b.click(); else lsPlay('guest'); });
  let seen = null;
  for (let t = 0; t < 30; t++) { await pg.waitForTimeout(300); const r = await pg.evaluate(() => { const st = LP.q[LP.i]; if (st && st.up) { const a = LP.el || _lAud(); try { a.dispatchEvent(new Event('playing')); } catch (e) {} } const m = document.getElementById('lsMini'); return { up: st && st.up, mini: !!(m && getComputedStyle(m).display !== 'none'), lp: [...document.querySelectorAll('.mk-vpl[data-lp="1"]')].map((b) => b.getAttribute('data-fk')), html: document.documentElement.classList.contains('lsmini') }; }); if (r.up) { seen = r; break; } await pg.evaluate(() => { if (LP.q.length && !LP.q[LP.i].up) { const a = LP.el || _lAud(); try { a.dispatchEvent(new Event('ended')); } catch (e) {} } }); }
  ok(W + ' 이 순간 들어 보기 — AI 줄이 흐를 때 아래 재생 바 없음 · 그 카드 ▶ 가 ■', !!seen && !seen.mini && !seen.html && seen.lp.includes('mkvpl:' + seen.up), JSON.stringify(seen));
  if (seen && seen.lp.length) { await pg.click('[data-fk="' + seen.lp[0] + '"]'); await pg.waitForTimeout(300); const s2 = await pg.evaluate(() => ({ q: LP.q.length, on: document.querySelectorAll('.mk-vpl[data-lp="1"]').length })); ok(W + ' 그 ■ 를 누르면 멈춘다 · ▶ 로 돌아온다', s2.q === 0 && s2.on === 0, JSON.stringify(s2)); }
  ok(W + ' pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? '\nMINI OFF AI FAIL ' + fail : '\nMINI OFF AI OK'); process.exit(fail ? 1 : 0);
