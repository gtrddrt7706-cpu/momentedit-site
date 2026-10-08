#!/usr/bin/env node
/* ★★[WHO_MAKE_NOW 2026-10-08 사장님 «추천대로»] 신랑 ↔ 신부를 바꾸면 늘 그 자리에서 만든다 — «만드는 중» → «확정하기» · 누를 때마다 똑같이.
   종전 ALT_READY(2026-10-04 «이미 만들어져 있어야»)의 «뒤에서 미리 데워 두고 바로 붙이기 · 데우는 중이면 기다리기»는 걷었다 —
   새로 고친 뒤 · 데우는 중 · 실패에 따라 토글이 «바로 / 만드는 중»으로 갈렸다(사장님 «통일이 안 돼»).
   ① 새로 고친 뒤 상태를 받아도 다른 분 소리를 뒤에서 만들지 않는다 ② 신부를 누르면 바로 «만드는 중»(머리 알약 make · «바꾸는 중» 아님 · 업체에 한 번) → 신부 소리
   ③ 기억에 신랑 소리가 있어도 신랑으로 돌아가면 또 «만드는 중» → 신랑 소리(같은 글은 서버가 들고 있어 돈이 들지 않는다)
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import os from 'node:os';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const { chromium } = pw;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), OUT = fs.mkdtempSync(path.join(os.tmpdir(), 'alt-ready-'));
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await chromium.launch(); } catch { try { br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(800);
  await pg.evaluate(() => {
    window.__calls = []; window.__delay = 0;
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window._vc = function (op, d) { if (op === 'make') window.__calls.push('make:' + d.key + ':' + (d.one || '')); if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2, made: '2026-10-04 10:00' }, bride: { consent: true, ready: true, left: 2, made: '2026-10-04 10:00' }, per: {} });
      if (op === 'make') return new Promise((r) => setTimeout(r, window.__delay)).then(() => b64(tone(1.0))).then((a) => ({ ok: true, key: d.key, left: 4, parts: [{ who: d.one || 'groom', mime: 'audio/wav', data: a }] }));
      return Promise.resolve({ ok: true }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; window.__calls.push('upload:' + k); setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-04 10:00' }), 30); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1;
    S.pvVoice = 'couple'; S.vfill = Object.assign({}, S.vfill, { prevideo: 'ai' }); S.pvText = '이 영상을 만들다가 저희가 처음으로 크게 다툴 뻔했습니다. 재미있게 봐 주세요.'; S.pvWho = 'g';
    S.vset = { groom: { tempo: '1.1', pause: 900 }, bride: { tempo: '1.1', pause: 900 } }; S.vsetNeed = {};
    VC.st = null; _vcStatus();
  });
  await pg.waitForTimeout(600);
  const pre = await pg.evaluate(() => ({ cur: _vpCur('prevideo'), need: _recNeed('pv'), ready: _vcReadyFor('pv'), who: _vcLineWho('pv') }));
  ok(`${W} 준비 — 영상 앞 소개 AI · 두 분 목소리 · 신랑이 읽음`, pre.cur === 'ai' && !!pre.need && pre.ready && pre.who === 'groom', JSON.stringify(pre));
  /* 신랑 소리 만들기 */
  await pg.evaluate(() => _vcMake('pv', {})); await pg.waitForTimeout(2500);
  /* ① 새로 고친 것처럼 — 이 탭 기억을 비우고 상태를 다시 받아도 다른 분 소리를 뒤에서 만들지 않는다 */
  await pg.evaluate(() => { for (const k in VC_ALT) delete VC_ALT[k]; window.__calls.length = 0; VC.st = null; _vcStatus(); });
  await pg.waitForTimeout(3500);
  const w1 = await pg.evaluate(() => ({ calls: window.__calls.slice() }));
  ok(`${W} [WHO_MAKE_NOW] ① 새로 고친 뒤 상태를 받아도 다른 분 소리를 미리 만들지 않는다(make 0)`, !w1.calls.some((c) => /^make:/.test(c)), JSON.stringify(w1));
  /* ② 신부를 누르면 바로 «만드는 중» → 신부 소리 */
  await pg.evaluate(() => { window.__calls.length = 0; window.__delay = 600; mkPvWho('b'); }); await pg.waitForTimeout(150);
  const s1a = await pg.evaluate(() => ({ up: MK_UP.pv || '', mode: _aiMode('pv') }));
  await pg.waitForTimeout(2500);
  const s1 = await pg.evaluate(() => ({ calls: window.__calls.slice(), by: (S.up.pv || {}).by, up: MK_UP.pv || '', mode: _aiMode('pv') }));
  ok(`${W} [WHO_MAKE_NOW] ② 신부를 누르면 바로 «만드는 중» → 업체에 한 번 → 신부 소리 «확정하기»`, s1a.up === 'make' && s1a.mode === 'make' && s1.calls.filter((c) => c === 'make:pv:bride').length === 1 && s1.by === 'bride' && !s1.up && s1.mode === 'keep', JSON.stringify({ s1a, s1 }));
  /* ③ 기억에 그 분 소리가 있어도 바로 붙이지 않는다 — 신랑으로 갔다가 신부로 돌아오면(②에서 만든 신부 소리가 기억에 있다) 또 «만드는 중» */
  await pg.evaluate(() => { mkPvWho('g'); }); await pg.waitForTimeout(2500);
  const has = await pg.evaluate(() => ({ by: (S.up.pv || {}).by, mem: !!_vcAltGet('pv', 'bride', _vcAltSig(_recNeed('pv'), _tWho('bride', 'pv'), _pWho('bride', 'pv'))) }));
  await pg.evaluate(() => { window.__calls.length = 0; mkPvWho('b'); }); await pg.waitForTimeout(150);
  const s2a = await pg.evaluate(() => ({ up: MK_UP.pv || '', mode: _aiMode('pv') }));
  await pg.waitForTimeout(2500);
  const s2 = await pg.evaluate(() => ({ calls: window.__calls.slice(), by: (S.up.pv || {}).by, up: MK_UP.pv || '', mode: _aiMode('pv') }));
  ok(`${W} [WHO_MAKE_NOW] ③ 기억에 신부 소리가 있어도 바로 붙이지 않는다 — 또 «만드는 중» → 업체에 한 번 → 신부 소리`, has.by === 'groom' && has.mem && s2a.up === 'make' && s2a.mode === 'make' && s2.calls.filter((c) => c === 'make:pv:bride').length === 1 && s2.by === 'bride' && !s2.up && s2.mode === 'keep', JSON.stringify({ has, s2a, s2 }));
  ok(`${W} 화면 오류 0`, !errs.length, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? `\n실패 ${fail}` : '\n모두 통과'); process.exit(fail ? 1 : 0);
