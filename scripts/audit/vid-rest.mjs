#!/usr/bin/env node
// ★★[VID_REST_THUMB 2026-10-09 사장님 «시간 지나면 영상 부분 검은색으로 되는 거 같은데 개선해 줘 · 썸네일 화면 계속 남아 있게»]
// 장면 영상 넷(② 하나씩 만들기 · 크게 보기 · ① 창 · 목소리 창)이 «돌지 않을 때» 썸네일 사진을 보이는가를 실브라우저 화소로 잰다.
//
//   node scripts/audit/vid-rest.mjs          # 390 · 1280
//
// 기기가 멈춘 영상의 그림을 놓아 검게 칠하는 일을 흉내 낸다 — 한 번이라도 돈 영상 요소는 검게 칠한다(filter: brightness(0)).
// 그래서 «쉬는 동안 영상 요소가 보이면» 칸이 검게 잡히고, 썸네일 사진이 보이면 밝게 잡힌다(썸네일 평균 밝기 약 200).
// 보는 것
//   ① 돌기 전 · 움직임 줄이기 — 썸네일(밝음)
//   ② 도는 동안 — 영상이 보인다(흉내라 검다 · 흉내가 먹는지도 이것으로 안다)
//   ③ ② 쪽 영상이 끝난 뒤 — 썸네일(밝음) · 다시 그려도(render) 같은 칸 · 같은 사진 요소(사진을 새로 그리다 비지 않게)
//   ④ 크게 보기 잠깐 멈춤 → 썸네일 · 이어서 → 영상
//   ⑤ ① 창 · 목소리 창이 끝난 뒤 → 썸네일 · 목소리 창 다음 장(같은 영상)도 같은 칸
// ★스스로 깨 보기 — 쉬는 영상을 다시 보이게 한 판에서 ③ 이 검게 잡혀야 한다(못 잡으면 이 검사가 죽은 것).
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 · ffmpeg 없음)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }

/* 시험 영상(소리 없음 · 2초 · VP9) — 헤드리스 Chromium 은 H.264 를 못 푼다(listen-page 와 같은 방식) */
const TV = path.join(os.tmpdir(), 'vid-rest-test.webm');
try { execFileSync('ffmpeg', ['-loglevel', 'error', '-y', '-f', 'lavfi', '-i', 'color=c=0x808080:s=320x180:d=2', '-c:v', 'libvpx-vp9', '-b:v', '60k', '-an', TV]); }
catch { console.log('못 쟀다 — ffmpeg 없음'); process.exit(2); }

let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };

/* PNG 읽기(8비트 · 겹침 없음 · RGB/RGBA) — 화면 조각의 평균 밝기를 재려고 */
function png(buf) {
  let o = 8, w = 0, h = 0, ct = 0; const idat = [];
  while (o < buf.length) {
    const len = buf.readUInt32BE(o), t = buf.toString('ascii', o + 4, o + 8), d = buf.subarray(o + 8, o + 8 + len);
    if (t === 'IHDR') { w = d.readUInt32BE(0); h = d.readUInt32BE(4); ct = d[9]; if (d[8] !== 8 || d[12]) throw new Error('PNG 형식이 다르다'); }
    else if (t === 'IDAT') idat.push(d); else if (t === 'IEND') break;
    o += 12 + len;
  }
  const bpp = ct === 6 ? 4 : ct === 2 ? 3 : 0; if (!bpp) throw new Error('PNG 색 형식 ' + ct);
  const raw = zlib.inflateSync(Buffer.concat(idat)), st = w * bpp, out = Buffer.alloc(h * st);
  for (let y = 0; y < h; y++) {
    const f = raw[y * (st + 1)], s = y * (st + 1) + 1, r = y * st, p = r - st;
    for (let x = 0; x < st; x++) {
      const a = x >= bpp ? out[r + x - bpp] : 0, b = y ? out[p + x] : 0, c = (x >= bpp && y) ? out[p + x - bpp] : 0; let v = raw[s + x];
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1;
      else if (f === 4) { const pa = Math.abs(b - c), pb = Math.abs(a - c), pc = Math.abs(a + b - 2 * c); v += (pa <= pb && pa <= pc) ? a : (pb <= pc ? b : c); }
      out[r + x] = v & 255;
    }
  }
  return { w, h, bpp, data: out };
}
/* 평균 밝기 · 결(표준편차) — 썸네일은 사람이 그려진 그림이라 결이 있고, 칸 바탕(--bg2)은 밝지만 결이 없다(사진이 빠져도 «밝음»으로 통과하지 않게) */
function luma(buf) { const { w, h, bpp, data } = png(buf); let s = 0, q = 0; for (let i = 0; i < w * h; i++) { const k = i * bpp, y = 0.299 * data[k] + 0.587 * data[k + 1] + 0.114 * data[k + 2]; s += y; q += y * y; } const n = w * h, m = s / n; return { m: Math.round(m), sd: Math.round(Math.sqrt(Math.max(0, q / n - m * m))) }; }
const BRIGHT = 120, DARK = 40, GRAIN = 6;
const thumbLike = (x) => x.m > BRIGHT && x.sd >= GRAIN, darkLike = (x) => x.m >= 0 && x.m < DARK;

const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]), vid = /\/assets\/video\/moments\/.+\.mp4$/.test(u), p = vid ? TV : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': vid ? 'video/webm' : (TYPES[path.extname(p)] || 'application/octet-stream') }); r.end(b); });
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
let br;
try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); }
catch (e) { console.log('못 쟀다 — 브라우저를 못 띄웠다 · ' + String(e.message || e).split('\n')[0]); srv.close(); process.exit(2); }

async function open(w, opt) {
  opt = opt || {};
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1000, reducedMotion: opt.reduce ? 'reduce' : 'no-preference' });
  /* 한 번이라도 돈 영상 요소에 표시 — 그 요소는 검게 칠한다(기기가 멈춘 영상의 그림을 놓는 일 흉내) */
  await ctx.addInitScript(() => { document.addEventListener('playing', (e) => { const v = e.target; if (v && v.tagName === 'VIDEO') v.setAttribute('data-played', '1'); }, true); });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(BASE + '/order-preview.html', { waitUntil: 'load' }); await pg.waitForTimeout(600);
  await pg.addStyleTag({ content: 'video[data-played]{filter:brightness(0)!important}' + (opt.css || '') });
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } courseStarted = true; S.on = S.on || {}; S.on.declare = 1; render(); });
  await pg.waitForTimeout(300);
  return { ctx, pg, errs };
}
/* 칸 가운데(가장자리 20% 빼고)의 평균 밝기 · 칸이 없으면 -1 */
async function boxLuma(pg, sel) {
  const r = await pg.evaluate((q) => { const e = document.querySelector(q); if (!e) return null; e.scrollIntoView({ block: 'center' }); const b = e.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; }, sel);
  if (!r || r.w < 20 || r.h < 20) return { m: -1, sd: 0 };
  await pg.waitForTimeout(80);
  const ix = r.w * 0.2, iy = r.h * 0.2;
  return luma(await pg.screenshot({ clip: { x: r.x + ix, y: r.y + iy, width: r.w - 2 * ix, height: r.h - 2 * iy } }));
}
const vstate = (pg, sel) => pg.evaluate((q) => { const v = document.querySelector(q); if (!v) return null; return { on: v.classList.contains('on'), rest: v.classList.contains('rest'), played: v.hasAttribute('data-played'), ended: v.ended, paused: v.paused }; }, sel);
const j = (x) => JSON.stringify(x);

/* ③ ② 쪽 — 들어오면 한 번 돌고 · 끝나면 썸네일 · 다시 그려도 같은 칸 */
async function makePage(pg) {
  await pg.evaluate(() => mkGo('declare')); await pg.waitForTimeout(900);
  const s1 = await vstate(pg, '.mk-vid video'), l1 = await boxLuma(pg, '.mk-vid .lv');
  const thumb = await pg.evaluate(() => { const b = document.querySelector('.mk-vid .lv'), i = b && b.querySelector('.lv-still'), v = b && b.querySelector('video'); return !!(i && v && i.getAttribute('src') === v.getAttribute('poster') && i.compareDocumentPosition(v) & Node.DOCUMENT_POSITION_FOLLOWING); });
  await pg.waitForTimeout(2700);
  const s2 = await vstate(pg, '.mk-vid video'), l2 = await boxLuma(pg, '.mk-vid .lv');
  await pg.evaluate(() => { window.__lvb = document.querySelector('.mk-vid .lv'); window.__lvi = window.__lvb && window.__lvb.querySelector('.lv-still'); render(); });
  await pg.waitForTimeout(250);
  const same = await pg.evaluate(() => document.querySelector('.mk-vid .lv') === window.__lvb && document.querySelector('.mk-vid .lv-still') === window.__lvi);
  const l3 = await boxLuma(pg, '.mk-vid .lv');
  return { s1, l1, thumb, s2, l2, same, l3 };
}

for (const w of [390, 1280]) {
  const { ctx, pg, errs } = await open(w);
  const m = await makePage(pg);
  ok(`${w} ② 장면 칸 = 썸네일 사진(영상 poster 와 같은 그림) 위에 영상`, m.thumb);
  ok(`${w} ② 도는 동안 영상이 보인다(흉내 검정 ${j(m.l1)})`, !!(m.s1 && m.s1.played && m.s1.on && !m.s1.rest) && darkLike(m.l1), j({ s: m.s1, l: m.l1 }));
  ok(`${w} ② 끝나면 썸네일(${j(m.l2)})`, !!(m.s2 && m.s2.ended && m.s2.rest) && thumbLike(m.l2), j({ s: m.s2, l: m.l2 }));
  ok(`${w} ② 다시 그려도 같은 칸 · 같은 사진 요소 · 썸네일 그대로(${j(m.l3)})`, m.same && thumbLike(m.l3), j({ same: m.same, l: m.l3 }));

  /* ④ 크게 보기 — 잠깐 멈춤 → 썸네일 · 이어서 → 영상 */
  await pg.evaluate(() => engine()).catch(() => {});
  await pg.evaluate(() => lsBig('declare')); await pg.waitForTimeout(900);
  const b1 = await vstate(pg, '#lsFull video'), lb1 = await boxLuma(pg, '#lsFull .lv');
  await pg.evaluate(() => lsToggle()); await pg.waitForTimeout(950);
  const b2 = await vstate(pg, '#lsFull video'), lb2 = await boxLuma(pg, '#lsFull .lv');
  await pg.evaluate(() => lsToggle()); await pg.waitForTimeout(600);
  const b3 = await vstate(pg, '#lsFull video'), lb3 = await boxLuma(pg, '#lsFull .lv');
  ok(`${w} 크게 보기 도는 동안 영상(${j(lb1)})`, !!(b1 && b1.on) && darkLike(lb1), j({ s: b1, l: lb1 }));
  ok(`${w} 크게 보기 잠깐 멈춤 → 썸네일(${j(lb2)})`, !!(b2 && b2.paused && b2.rest) && thumbLike(lb2), j({ s: b2, l: lb2 }));
  ok(`${w} 크게 보기 이어서 → 영상이 다시 보인다(${j(lb3)})`, !!(b3 && !b3.paused && b3.on) && darkLike(lb3), j({ s: b3, l: lb3 }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);
  await pg.evaluate(() => { try { if (LP.big) lsToggle(); } catch (e) {} });

  /* ⑤ ① 창 — 끝나면 첫 장면 사진 */
  await pg.evaluate(() => opPv('declare')); await pg.waitForTimeout(400);
  await pg.evaluate(() => { const v = document.querySelector('#pvM video'); if (v && !v.hasAttribute('data-played') && v.paused) _pvPlay(); });
  await pg.waitForTimeout(700);
  const c1 = await vstate(pg, '#pvM video'), lc1 = await boxLuma(pg, '#pvM');
  await pg.waitForTimeout(2700);
  const c2 = await vstate(pg, '#pvM video'), lc2 = await boxLuma(pg, '#pvM');
  ok(`${w} ① 창 도는 동안 영상(${j(lc1)})`, !!(c1 && c1.on) && darkLike(lc1), j({ s: c1, l: lc1 }));
  ok(`${w} ① 창 끝나면 첫 장면 사진(${j(lc2)})`, !!(c2 && c2.ended && !c2.on) && thumbLike(lc2), j({ s: c2, l: lc2 }));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(300);

  /* ⑤ 목소리 창 — 끝나면 썸네일 · 다음 장(같은 영상)도 같은 칸 */
  await pg.evaluate(() => mkUseOpen(0)); await pg.waitForTimeout(900);
  const d1 = await vstate(pg, '.mk-vu-img video'), ld1 = await boxLuma(pg, '.mk-vu-img');
  await pg.waitForTimeout(2700);
  const d2 = await vstate(pg, '.mk-vu-img video'), ld2 = await boxLuma(pg, '.mk-vu-img');
  await pg.evaluate(() => { window.__vub = document.querySelector('.mk-vu-img'); mkUseGo(1); }); await pg.waitForTimeout(300);
  const dsame = await pg.evaluate(() => document.querySelector('.mk-vu-img') === window.__vub), ld3 = await boxLuma(pg, '.mk-vu-img');
  ok(`${w} 목소리 창 도는 동안 영상(${j(ld1)})`, !!(d1 && d1.on) && darkLike(ld1), j({ s: d1, l: ld1 }));
  ok(`${w} 목소리 창 끝나면 썸네일(${j(ld2)})`, !!(d2 && d2.ended && d2.rest) && thumbLike(ld2), j({ s: d2, l: ld2 }));
  ok(`${w} 목소리 창 다음 장(같은 영상) — 같은 칸 · 썸네일 그대로(${j(ld3)})`, dsame && thumbLike(ld3), j({ same: dsame, l: ld3 }));
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ① 움직임 줄이기 — 돌지 않으니 썸네일 그대로 */
{
  const { ctx, pg, errs } = await open(390, { reduce: true });
  await pg.evaluate(() => mkGo('declare')); await pg.waitForTimeout(1200);
  const s = await vstate(pg, '.mk-vid video'), l = await boxLuma(pg, '.mk-vid .lv');
  ok(`390 움직임 줄이기 — 돌지 않고 썸네일(${j(l)})`, !!(s && !s.played) && thumbLike(l), j({ s, l }));
  ok('390 움직임 줄이기 pageerror 0', errs.length === 0, errs.slice(0, 3).join(' | '));
  await ctx.close();
}

/* ★스스로 깨 보기 — 쉬는 영상을 다시 보이게(종전 동작) 하면 끝난 뒤 칸이 검게 잡혀야 한다 */
{
  const { ctx, pg } = await open(390, { css: '.lv video.rest,.mk-vu-img video.rest{opacity:1!important}' });
  const m = await makePage(pg);
  ok(`깨 보기 — 쉬는 영상이 보이면 끝난 뒤 칸이 검게 잡힌다(${j(m.l2)})`, darkLike(m.l2), j({ l: m.l2 }));
  await ctx.close();
}

await br.close(); srv.close();
console.log(fail ? `✗ VID_REST_THUMB 실패 ${fail}건` : 'ok vid-rest — 장면 영상이 쉬는 동안 썸네일(② · 크게 보기 · ① 창 · 목소리 창 · 움직임 줄이기 · 깨 보기)');
process.exit(fail ? 1 : 0);
