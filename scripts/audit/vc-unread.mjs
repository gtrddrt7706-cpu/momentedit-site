#!/usr/bin/env node
/* ★[VC_UNREAD 2026-10-05 사장님 «만드는 중에서 다시 목소리 만들기 버튼으로 돌아가는데 원인 파악»] 자음 · 모음만 있는 줄(«ㄴㅇㅁ…»)은 업체에 보내지 않고
   그 줄 아래에 «2번째 줄 … 고쳐 주세요»를 말한다 · 고치면 그때 만든다(390 · 1280). 종료 0 통과 · 1 실패 · 2 재지 못함 */
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
    window.__sent = [];
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    // 업체 흉내 — 자음 · 모음만 있는 글은 거절(서버는 «지금은 만들 수 없어요»로 돌려준다)
    window._vc0 = function (op, d) { if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: true, left: 2 } });
      if (op === 'make') { window.__sent.push({ key: d.key, bg: !!d.bg, text: d.text, lines: d.lines }); const all = (d.lines || [[0, d.text]]).map((l) => l[1]).join(' '); if (/[ㄱ-ㆎ]/.test(all)) return Promise.resolve({ ok: false, down: true, error: '지금은 AI 목소리를 만들 수 없어요 · 잠시 뒤 다시 눌러 주세요. 그동안 이 줄은 스튜디오 나레이션으로 나와요' });
        return b64(tone(1)).then((x) => ({ ok: true, key: d.key, parts: (d.lines || [[d.one || 'groom']]).map((l) => ({ who: l[0] || 'groom', mime: 'audio/mpeg', data: x })) })); }
      return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-05 10:00' }), 30); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; opSync(); });
  await nx(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => mkVsOpen()); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(2500);
  if (await pg.isVisible('[data-fk="mkvsdone"]')) { await pg.click('[data-fk="mkvsdone"]'); await pg.waitForTimeout(400); }
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(3000);
  // 사장님 화면 그대로 — 첫 줄은 신랑 · 둘째 줄은 신부 «ㄴㅇㅁ…»
  await pg.evaluate(() => { S.vlines = S.vlines || {}; S.vlines.g0 = [{ w: 'g', t: '저희 두 사람의 결혼식에 와 주셔서 감사합니다.' }, { w: 'b', t: 'ㄴㅇㅁㄴㅇㅁㄴㅇㅁㄴㅇㅁ' }]; delete (S.up || {}).g0; window.__sent = []; render(); });
  await pg.waitForTimeout(600);
  await pg.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="g0"]'); if (b) b.click(); else mkAiGo('g0'); });
  await pg.waitForTimeout(4500);
  const r = await pg.evaluate(() => ({ fg: window.__sent.filter((x) => x.key === 'g0' && !x.bg).length, err: (MK.lineErr || {}).g0 || '', up: MK_UP.g0 || '', shown: [...document.querySelectorAll('.mk-exw')].map((e) => e.textContent).join(' | ') }));
  ok(W + ' 자음 · 모음만 있는 줄 — 업체에 보내지 않는다(누른 만들기 0번)', r.fg === 0, JSON.stringify(r));
  ok(W + ' 그 줄 아래 «2번째 줄 «ㄴㅇㅁㄴㅇㅁㄴㅇ…»처럼 자음 · 모음만 …» · «지금은 만들 수 없어요»가 아니다', /2번째 줄/.test(r.err) && /자음 · 모음만/.test(r.err) && !/지금은 AI 목소리를 만들 수 없어요/.test(r.err) && r.shown.indexOf('2번째 줄') > -1, JSON.stringify(r));
  ok(W + ' «만드는 중»에 머물지 않는다', !r.up, r.up);
  // 고치면 만든다
  await pg.evaluate(() => { mkSlText('g0', 1, '기다리시는 동안 편안히 머물러 주세요.'); window.__sent = []; render(); });
  await pg.waitForTimeout(400);
  await pg.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="g0"]'); if (b) b.click(); else mkAiGo('g0'); });
  await pg.waitForTimeout(5000);
  const r2 = await pg.evaluate(() => ({ fg: window.__sent.filter((x) => x.key === 'g0' && !x.bg).length, err: (MK.lineErr || {}).g0 || '', src: ((S.up || {}).g0 || {}).src || '' }));
  ok(W + ' 글을 고치면 업체에 보내 만든다 · 오류 글은 걷힌다', r2.fg >= 1 && !r2.err && r2.src === 'ai', JSON.stringify(r2));
  ok(W + ' pageerror 0', errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? '\nVC UNREAD FAIL ' + fail : '\nVC UNREAD OK'); process.exit(fail ? 1 : 0);
