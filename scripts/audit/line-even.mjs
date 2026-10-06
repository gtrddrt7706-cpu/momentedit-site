#!/usr/bin/env node
/* ★[LINE_EVEN 2026-10-05 사장님 «따로 입력한 줄의 읽는 속도 · 쉼이 윗줄과 따로 논다»] 섞인 줄(입장 인사 3줄)을 만들면 줄마다 문장 사이 쉼을 맞추고(_gapFit ×3)
   줄끼리 빠르기를 맞추며(_lineEven) · 만든 표시(pf) · 옛 방식 줄은 머리 단추 «목소리 만들기»(390 · 1280). 종료 0 통과 · 1 실패 · 2 재지 못함 */
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
    const sr = 24000;
    // 말소리 흉내 — 낱말 안은 이어지고 낱말 사이 0.15초 · 문장 사이 sg 초 · secPer = 한 글자 길이(작을수록 빠르다)
    const say = (t, secPer, sg) => { const sents = t.split(/(?<=[.!?])\s+/); const parts = []; sents.forEach((st, si) => { st.split(/\s+/).forEach((w) => { const ns = (w.match(/[가-힣]/g) || []).length || 1, L = Math.round(sr * secPer * ns), x = new Float32Array(L + Math.round(sr * 0.15)); for (let i = 0; i < L; i++) x[i] = 0.3 * Math.sin(2 * Math.PI * 160 * i / sr) * Math.min(1, i / 200, (L - i) / 200); parts.push(x); }); if (si < sents.length - 1) parts.push(new Float32Array(Math.round(sr * sg))); });
      const n = parts.reduce((a, p) => a + p.length, 0) + Math.round(sr * 0.2), y = new Float32Array(n); let at = Math.round(sr * 0.1); parts.forEach((p) => { y.set(p, at); at += p.length; }); return _recWav(y, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window.__spy = { gap: 0, even: 0, evenTexts: 0 };
    const g0 = window._gapFit, e0 = window._lineEven; window._gapFit = function () { window.__spy.gap++; return g0.apply(this, arguments); }; window._lineEven = function (c, sr2, tx) { window.__spy.even++; const out = e0.apply(this, arguments), rt = out.map((x, i) => +(x.length / c[i].length).toFixed(3));   /* ★[EX_PREBAKE_ENTRY 2026-10-06] 다른 입장 예시도 뒤에서 미리 만든다(두 줄짜리 등) — «마지막 호출»이 아니라 지금 글(첫 줄이 이 문장)인 호출을 잰다 */ if (!window.__spy.ratio || /^저희 두 사람은 오늘까지/.test((tx || [])[0] || '')) { window.__spy.evenTexts = (tx || []).length; window.__spy.ratio = rt; } return out; };
    window._vc0 = function (op, d) { if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: true, left: 2 } });
      if (op === 'make') { const L = d.lines || [[d.one || 'groom', d.text]]; return Promise.all(L.map((l, i) => b64(say(l[1], i === L.length - 1 ? 0.13 : 0.2, 0.35)))).then((xs) => ({ ok: true, key: d.key, parts: L.map((l, i) => ({ who: l[0] || 'groom', mime: 'audio/mpeg', data: xs[i] })) })); }
      return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-05 10:00' }), 30); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; opSync(); });
  await nx(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => mkVsOpen()); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(2500);
  if (await pg.isVisible('[data-fk="mkvsdone"]')) { await pg.click('[data-fk="mkvsdone"]'); await pg.waitForTimeout(400); }
  await pg.evaluate(() => mkGo('entry')); await pg.waitForTimeout(1500);
  // 사장님 화면 그대로 — 신랑 · 신부 · 신랑(셋째 줄만 따로 적음 · 문장 둘 · 빠르게)
  await pg.evaluate(() => { _slPut('entry', [{ w: 'g', t: '저희 두 사람은 오늘까지 각자의 길을 걸어왔습니다.' }, { w: 'b', t: '이제 그 두 길을, 여기서 하나로 잇습니다.' }, { w: 'g', t: '이 첫걸음을, 박수로 환영해주세요. 저희 들어갑니다!' }]); render(); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="entry"]'); if (b) b.click(); else mkAiGo('entry'); });
  for (let t = 0; t < 30; t++) { await pg.waitForTimeout(500); if (await pg.evaluate(() => ((S.up || {}).entry || {}).src === 'ai' && !MK_UP.entry)) break; }
  const r = await pg.evaluate(() => ({ spy: window.__spy, pf: ((S.up || {}).entry || {}).pf, src: ((S.up || {}).entry || {}).src, err: (MK.lineErr || {}).entry || '' }));
  ok(W + ' 섞인 세 줄 — 줄마다 문장 사이 쉼을 맞춘다(_gapFit 3번)', r.spy.gap >= 3, JSON.stringify(r));
  ok(W + ' 줄끼리 빠르기를 맞춘다 — 빠른 셋째 줄은 길게(1.06 넘게) · 다른 줄은 0.88 ~ 1.12 안', r.spy.even >= 1 && r.spy.evenTexts === 3 && r.spy.ratio && r.spy.ratio[2] > 1.06 && r.spy.ratio.every((x) => x >= 0.879 && x <= 1.121), JSON.stringify(r.spy));
  ok(W + ' 만든 표시 pf = ' + 'LINE_EVEN_V · 오류 없음', r.src === 'ai' && r.pf === 1 && !r.err, JSON.stringify(r));
  // 옛 방식으로 만든 섞인 줄(pf 없음) → 머리 단추가 «목소리 만들기»로 알린다
  /* 만든 직후 머리 단추는 잠깐 «다 됐어요»(aiDone)로 머문다 — 그 동안은 «만드는 중»으로 읽힌다(3번 중 2번 실패의 원인). 가라앉기를 기다린 뒤 잰다 */
  for (let t = 0; t < 20; t++) { if (await pg.evaluate(() => ['make', 'save', 'done'].indexOf(_aiMode('entry')) < 0)) break; await pg.waitForTimeout(300); }
  await pg.evaluate(() => { delete S.up.entry.pf; render(); }); await pg.waitForTimeout(300);
  const pill = await pg.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="entry"]'); return b ? b.textContent.trim() : ''; });
  ok(W + ' 옛 방식 섞인 줄 — 머리 단추 «목소리 만들기»', /목소리 만들기/.test(pill), pill);
  ok(W + ' pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? '\nLINE EVEN FAIL ' + fail : '\nLINE EVEN OK'); process.exit(fail ? 1 : 0);
