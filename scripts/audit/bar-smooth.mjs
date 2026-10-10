#!/usr/bin/env node
// ★★[BAR_SMOOTH 2026-10-10 사장님 «로딩 바 차오르는 게 살짝 뚝뚝 끊기는 느낌이야 개선해 줘»]
// 소리를 따라 차오르는 막대가 «매 화면 조금씩» 차오르는가를 실브라우저로 잰다.
//
//   node scripts/audit/bar-smooth.mjs          # 390 · 1280
//
// 2초 동안 화면마다(requestAnimationFrame) 막대의 보이는 너비를 읽어
//   멈춘 화면 비율 ≤ 10% · 한 화면에 뛴 폭 ≤ max(2px, 그 소리의 한 화면 몫 × 2.5)
// 를 본다. 종전(너비 1% 반올림)은 멈춘 화면 83% · 한 번에 3.5px(폰) · 6.3px(PC) 씩 뛰었다(2026-10-10 실측).
// 보는 것
//   ① ① 창 소리 막대(편지 낭독 · 실제 녹음 mp3)
//   ② ① 창 글만 있는 순간(녹음 없음 · 글 읽는 시간으로 차오름)
//   ③ ① 창 · 소리 시각이 거친 기기 흉내(currentTime 을 0.25초 단위로) — 사이를 시계로 잇는가(_medMs)
//   ④ 크게 보기 AI 차례 막대(#lfTbarI) — 소리가 도는 동안 매 화면(_lfBarGo) · 같은 거친 시계 흉내
// ★스스로 깨 보기 — 종전 반올림(_pvBar 1%) · 잇기 없음(_medMs = currentTime) 판에서 ① · ③ 이 빨강으로 잡혀야 한다.
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 없음)
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }

let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };
const STALL_MAX = 10, JUMP_MIN = 2, JUMP_K = 2.5;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  if (/\.mp4$/.test(u)) { r.writeHead(404); r.end(); return; }   // 장면 영상은 이 검사와 상관없다(헤드리스는 H.264 를 못 푼다)
  const p = path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
let br;
try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }
catch (e) { console.log('못 쟀다 — 브라우저를 못 띄웠다 · ' + String(e.message || e).split('\n')[0]); srv.close(); process.exit(2); }

/* opt.coarse — 소리 시각을 0.25초 단위로만 알려 주는 기기 흉내 · opt.init — 시작 전에 넣을 스크립트(깨 보기) */
async function open(w, opt) {
  opt = opt || {};
  const ctx = await br.newContext({ viewport: { width: w, height: 844 }, hasTouch: w < 1000 });
  if (opt.coarse) await ctx.addInitScript(() => { const d = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'currentTime');
    Object.defineProperty(HTMLMediaElement.prototype, 'currentTime', { configurable: true, get() { return Math.floor(d.get.call(this) * 4) / 4; }, set(v) { d.set.call(this, v); } }); });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(BASE + '/order-preview.html', { waitUntil: 'load' }); await pg.waitForTimeout(700);
  await pg.evaluate(() => Promise.all([engine(), _lrec()])).catch(() => {});
  if (opt.init) await pg.evaluate(opt.init);
  return { ctx, pg, errs };
}
/* 2초 동안 화면마다 막대 너비 — 소리가 도는 화면만 센다(글만 있는 순간은 늘 센다) */
const sample = (pg, a) => pg.evaluate(async (a) => {
  const b = document.getElementById(a.bar), tr = b && b.parentNode, au = a.au === 'pv' ? PV.au : LP.el;
  if (!b || !tr) return null;
  const out = { track: Math.round(tr.getBoundingClientRect().width), dur: au && au.duration, frames: 0, stall: 0, jump: 0 };
  let prev = null; const t0 = performance.now();
  await new Promise((res) => { (function f() { const w = b.getBoundingClientRect().width, on = a.text || (au && !au.paused && !au.ended);
    if (prev != null && on) { out.frames++; const d = Math.abs(w - prev); if (d < 0.01) out.stall++; if (d > out.jump) out.jump = d; }
    prev = w; if (performance.now() - t0 < 2000) requestAnimationFrame(f); else res(); })(); });
  out.stallPct = out.frames ? Math.round(out.stall / out.frames * 100) : 100; out.jump = +out.jump.toFixed(2); return out;
}, a);
/* 판정 — 한 화면 몫(px) = 너비 ÷ 길이(초) ÷ 60 */
function smooth(r, secs) {
  if (!r || r.frames < 60) return { pass: false, why: '잴 화면이 모자라다 ' + JSON.stringify(r) };
  const per = r.track / Math.max(0.5, secs || r.dur || 1) / 60, lim = Math.max(JUMP_MIN, per * JUMP_K);
  return { pass: r.stallPct <= STALL_MAX && r.jump <= lim, why: `멈춘 화면 ${r.stallPct}% · 한 번에 ${r.jump}px(한도 ${lim.toFixed(2)}px) · 화면 ${r.frames}` };
}

async function sheet(w, opt, k) {
  const { ctx, pg, errs } = await open(w, opt);
  await pg.evaluate((k) => opPv(k), k || 'letter'); await pg.waitForTimeout(900);
  const src = await pg.evaluate(() => (PV.au && PV.au.getAttribute('src') || '').split('/').pop());
  const r = await sample(pg, { bar: 'pvBar', au: 'pv' });
  await ctx.close();
  return { r, src, errs };
}
async function sheetText(w) {
  const { ctx, pg, errs } = await open(w, { init: () => { window._lHasSound = () => false; } });   // 녹음 없는 순간 흉내 — 글 읽는 시간으로 차오른다
  await pg.evaluate(() => opPv('letter')); await pg.waitForTimeout(300);
  const ms = await pg.evaluate(() => { const l = _pvLine('letter'); return Math.max(2400, String(l && l.text || '').length * 160); });
  const r = await sample(pg, { bar: 'pvBar', text: true });
  await ctx.close();
  return { r, ms, errs };
}
/* 크게 보기 AI 차례 막대 — 연습 소리 요소(_lAud)에 AI 차례 하나를 세우고 실제 mp3 를 튼다(배선 · _lfBarGo · _medMs 를 그대로 탄다) */
async function bigTurn(w, opt) {
  const { ctx, pg, errs } = await open(w, opt);
  await pg.evaluate(() => { const box = document.createElement('div'); box.className = 'lf-tbar au'; box.style.cssText = 'width:300px;position:fixed;left:20px;top:20px;z-index:9';
    box.innerHTML = '<i id="lfTbarI" style="animation:none;transform:scaleX(0)"></i>'; document.body.appendChild(box);
    LP.q = [{ talk2: true, src: '/assets/audio/narration/28_letter-each.mp3', txt: '시험' }]; LP.i = 0;
    const a = _lAud(); a._lead = 0; a.src = LP.q[0].src; const p = a.play(); if (p && p.catch) p.catch(() => {}); });
  await pg.waitForTimeout(700);
  const r = await sample(pg, { bar: 'lfTbarI', au: 'lp' });
  await pg.evaluate(() => { try { LP.el.pause(); } catch (e) {} });
  await ctx.close();
  return { r, errs };
}

for (const w of [390, 1280]) {
  const a = await sheet(w);
  const ja = smooth(a.r); ok(`${w} ① 창 소리 막대(${a.src}) — ${ja.why}`, ja.pass && /letter/.test(a.src || ''));
  const b = await sheetText(w);
  const jb = smooth(b.r, b.ms / 1000); ok(`${w} ① 창 글만 있는 순간(${b.ms}ms) — ${jb.why}`, jb.pass);
  const c = await sheet(w, { coarse: true });
  const jc = smooth(c.r); ok(`${w} ① 창 · 거친 소리 시각(0.25초) 흉내 — ${jc.why}`, jc.pass);
  const d = await bigTurn(w, { coarse: true });
  const jd = smooth(d.r); ok(`${w} 크게 보기 AI 차례 막대 · 거친 소리 시각 흉내 — ${jd.why}`, jd.pass);
  const errs = [].concat(a.errs, b.errs, c.errs, d.errs);
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 3).join(' | '));
}

/* ★스스로 깨 보기 — 종전처럼 1% 로 반올림하면 / 사이를 잇지 않으면 빨강이어야 한다 */
{
  const old = await sheet(390, { init: () => { window._pvBar = function (f) { const b = document.getElementById('pvBar'); if (b) b.style.transform = 'scaleX(' + Math.round(Math.max(0, Math.min(1, f)) * 100) / 100 + ')'; }; } });
  const j1 = smooth(old.r); ok(`깨 보기 — 1% 반올림이면 잡힌다(${j1.why})`, !j1.pass);
  const raw = await sheet(390, { coarse: true, init: () => { window._medMs = (a) => (a.currentTime || 0) * 1000; } });
  const j2 = smooth(raw.r); ok(`깨 보기 — 거친 시각을 잇지 않으면 잡힌다(${j2.why})`, !j2.pass);
}

await br.close(); srv.close();
console.log(fail ? `✗ BAR_SMOOTH 실패 ${fail}건` : 'ok bar-smooth — 소리를 따라 차오르는 막대가 매 화면 조금씩(① 창 · 글만 · 거친 시각 · 크게 보기 AI 차례 · 깨 보기)');
process.exit(fail ? 1 : 0);
