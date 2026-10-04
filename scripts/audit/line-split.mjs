#!/usr/bin/env node
/* ★[LINE_SPLIT 2026-10-04 사장님 «신랑 신부 입력칸이 안 나눠져 있다 · 줄 더하기 · 빼기로 두 분 분업에 맞게 · 같은 폼을 쓰는 곳은 전부»]
   두 분이 읽을 글 칸(하객 맞이 넷 · 입장 인사 · 식전 영상 소개)이 한 모양의 줄 편집기인지 흐름으로 잰다(가짜 서버 · 390 · 1280).
   보는 것: 입장 인사가 문장마다 [신랑]/[신부] 줄로 나뉜다 · 줄 더하기(앞줄과 다른 분 · 그 칸에 초점) · 읽는 분 바꾸기 · 줄 빼기 ·
     AI 만들기가 줄마다 그 분으로(lines) · 하객 맞이 · 식전 영상 소개도 같은 편집기 · 줄을 나누면 한 분 소리는 «다시 만들기»(wq) · pageerror 0
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const { chromium } = pw;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await chromium.launch(); } catch { try { br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
const SHOT = process.env.LS_SHOT || '';
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => {
    window.__make = [];
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window._vc = function (op, d) {
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: true, left: 2 } });
      if (op === 'make') { window.__make.push({ key: d.key, one: d.one, lines: d.lines }); return b64(tone(1)).then((x) => ({ ok: true, key: d.key, parts: (d.lines || [[d.one || 'groom']]).map((l) => ({ who: l[0], mime: 'audio/mpeg', data: x })) })); }
      return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-04 10:00' }), 30); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.on.prevideo = 1; opSync();
  });
  await nx(); await pg.waitForTimeout(1200);
  await pg.evaluate(() => mkVsOpen()); await pg.waitForTimeout(400);
  await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(2500);
  if (await pg.isVisible('[data-fk="mkvsdone"]')) { await pg.click('[data-fk="mkvsdone"]'); await pg.waitForTimeout(400); }
  await pg.evaluate(() => mkGo('entry')); await pg.waitForTimeout(800);
  const e0 = await pg.evaluate(() => { const r = [...document.querySelectorAll('.mk-sl[aria-label^="입장"] .mk-slr, [data-fk^="mksl:entry:"]')]; return { who: [...document.querySelectorAll('[data-fk^="mkslw:entry:"]')].map((b) => b.textContent), ta: document.querySelectorAll('[data-fk^="mksl:entry:"]').length, old: document.querySelectorAll('.mk-vtta').length, txt: [...document.querySelectorAll('[data-fk^="mksl:entry:"]')].map((t) => t.value) }; });
  ok(W + ' 입장 인사 — 문장마다 줄 · 신랑 · 신부 번갈아 · 한 칸 글상자 없음', e0.ta >= 2 && e0.who[0] === '신랑' && e0.who[1] === '신부' && e0.old === 0, JSON.stringify(e0));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/ls-entry-${W}.png`, fullPage: true });
  await pg.click('[data-fk="mksladd:entry"]'); await pg.waitForTimeout(300);
  const e1 = await pg.evaluate(() => { const n = document.querySelectorAll('[data-fk^="mksl:entry:"]').length; const last = document.querySelector('[data-fk="mksl:entry:' + (n - 1) + '"]'); return { n, foc: document.activeElement === last, lastWho: (document.querySelector('[data-fk="mkslw:entry:' + (n - 1) + '"]') || {}).textContent }; });
  ok(W + ' ＋ 줄 더하기 — 한 줄 늘고 · 앞줄과 다른 분 · 새 칸에 초점', e1.n === e0.ta + 1 && e1.foc && e1.lastWho === (e0.ta % 2 ? '신부' : '신랑') && true, JSON.stringify(e1));
  await pg.keyboard.type('마지막으로 함께 인사드립니다.'); await pg.waitForTimeout(200);
  await pg.click('[data-fk="mkslw:entry:0"]'); await pg.waitForTimeout(300);
  const e2 = await pg.evaluate(() => ({ w0: document.querySelector('[data-fk="mkslw:entry:0"]').textContent, lines: _vpLines('entry'), need: _recNeed('entry') }));
  ok(W + ' 읽는 분 바꾸기 — 첫 줄이 신부로 · 대본 줄에도 그대로 · 새 줄 글이 이어 붙음', e2.w0 === '신부' && e2.lines[0][0] === '신부' && /함께 인사드립니다/.test(e2.need) && e2.lines.length === e1.n, JSON.stringify(e2));
  await pg.click('[data-fk="mkslx:entry:' + (e1.n - 1) + '"]'); await pg.waitForTimeout(300);
  const e3 = await pg.evaluate(() => ({ n: document.querySelectorAll('[data-fk^="mksl:entry:"]').length, need: _recNeed('entry') }));
  ok(W + ' 줄 빼기 — 한 줄 줄고 · 그 글이 빠진다', e3.n === e1.n - 1 && !/함께 인사드립니다/.test(e3.need), JSON.stringify(e3));
  await pg.evaluate(() => { window.__make = []; return _vcMake('entry', {}).catch(() => {}); }); await pg.waitForTimeout(900);
  const m1 = await pg.evaluate(() => window.__make[0]);
  ok(W + ' AI 만들기 — 줄마다 그 분(lines: 신부 · 신부 …)', m1 && Array.isArray(m1.lines) && m1.lines[0][0] === 'bride' && m1.lines.length === e3.n, JSON.stringify(m1));
  /* 하객 맞이 · 식전 영상 소개도 같은 편집기 */
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(800);
  const g0 = await pg.evaluate(() => ({ eds: [0, 1, 2, 3].filter((i) => document.querySelector('[data-fk="mksl:g' + i + ':0"]')).length, head: document.querySelectorAll('.mk-whog').length, old: document.querySelectorAll('.mk-vtta').length }));
  ok(W + ' 하객 맞이 넷 — 같은 줄 편집기 · 머리 신랑|신부 고르기 · 한 칸 글상자 없음', g0.eds === 4 && g0.head === 0 && g0.old === 0, JSON.stringify(g0));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/ls-guest-${W}.png`, fullPage: true });
  await pg.evaluate(() => _vcMake('g1', {}).catch(() => {})); await pg.waitForTimeout(900);
  const before = await pg.evaluate(() => ({ stale: _upStale('g1'), wq: (S.up.g1 || {}).wq }));
  await pg.click('[data-fk="mksladd:g1"]'); await pg.waitForTimeout(200); await pg.keyboard.type('저희도 반갑습니다.'); await pg.waitForTimeout(200);
  const after = await pg.evaluate(() => ({ stale: _upStale('g1'), who: _vcLineWho('g1'), mixed: _slMixed('g1') }));
  ok(W + ' 하객 맞이 줄을 두 분이 나누면 — 만든 소리는 «다시 만들기»(wq) · 두 분 목소리로', !before.stale && before.wq && after.stale && after.who === 'both' && after.mixed, JSON.stringify({ before, after }));
  await pg.evaluate(() => { window.__make = []; return _vcMake('g1', {}).catch(() => {}); }); await pg.waitForTimeout(900);
  const m2 = await pg.evaluate(() => window.__make[0]);
  ok(W + ' 나눈 하객 맞이 줄 AI — lines 두 줄(앞 줄 · 새 줄 다른 분)', m2 && Array.isArray(m2.lines) && m2.lines.length === 2 && m2.lines[0][0] !== m2.lines[1][0], JSON.stringify(m2));
  await pg.evaluate(() => mkGo('prevideo')); await pg.waitForTimeout(800);
  const p0 = await pg.evaluate(() => ({ ed: !!document.querySelector('[data-fk="mksl:pv:0"]'), old: !!document.getElementById('mkPvTa'), head: document.querySelectorAll('.mk-whog').length }));
  ok(W + ' 식전 영상 소개 — 같은 줄 편집기 · 옛 한 칸 · 머리 고르기 없음', p0.ed && !p0.old && p0.head === 0, JSON.stringify(p0));
  await pg.click('[data-fk="mkpvex:0"]'); await pg.waitForTimeout(400);
  const p1 = await pg.evaluate(() => ({ t: (document.querySelector('[data-fk="mksl:pv:0"]') || {}).value || '', n: document.querySelectorAll('[data-fk^="mksl:pv:"]').length, pvText: S.pvText }));
  ok(W + ' 소개글 예시 — 한 줄로 들어간다', p1.n === 1 && p1.t && p1.t === p1.pvText, JSON.stringify(p1));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/ls-pv-${W}.png`, fullPage: true });
  const ov = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  ok(W + ' 가로 넘침 없음 · pageerror 0', !ov && !errs.length, JSON.stringify(errs.slice(0, 3)));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? `\n★ 실패 ${fail}건` : '\nLINE SPLIT OK'); process.exit(fail ? 1 : 0);
