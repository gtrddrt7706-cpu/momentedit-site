#!/usr/bin/env node
/* ★★[BLESS_PER_SPEAKER 2026-10-14 사장님 «추천대로»] 덕담 시간 신호 — «한 분 말씀»마다 잰다(당일 콘솔 console.html)
   1 덕담 사람 구간(디렉터 화면)에 [다음 분]이 보인다 · 사람 구간 음악은 큐 값(-16)
   2 음악 신호(런북 §8 2단) — swellAt 이 되면 배경 음악이 swellTo(-10)로 오른다 (여기서는 swellAt 을 0.6초로 줄여 잰다)
   3 [다음 분] — 음악이 사람 구간 값으로 내려오고 · 시간(liveT0)을 새로 재고 · 신호를 다시 건다(다시 오른다)
   4 맺는 말 고르기 — 두 분이 2분씩(합 4분) 하셔도 [다음 분]을 눌렀으면 «길었을 때»가 아니다 · 마지막 분이 3분을 넘기면 «길었을 때»
   5 [다음 분]을 안 누르면 종전처럼 덕담 전체로 잰다(4분 → «길었을 때»)
   6 대독(나레이션이 읽는다) · 고객 미리 듣기(embed=1)에는 [다음 분]이 없다 · 쪽 오류 0
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
async function open(S0, q) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '{}' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}${q || ''}`); await pg.waitForTimeout(700);
  if (!q) { await pg.click('#go'); await pg.waitForTimeout(600); }   // 디렉터 화면 — [시작] 을 눌러야 큐가 선다
  return { ctx, pg, errs };
}
const S_ON = { course: 'open', bless: 'on', on: { bless: 1, declare: 1, vow: 1 }, blessProxy: false };
const idx = (pg) => pg.evaluate(() => window.__bps.cues().findIndex((c) => c.k === 'bless' && c.live));
/* 덕담 큐를 쏘고 사람 구간(live)이 될 때까지 — 녹음이 있으면 실제 길이만큼 흐른다 */
async function toLive(pg, i, swellAt) {
  await pg.evaluate(([j, sa]) => { if (sa != null) window.__bps.swell(j, sa); window.__esd.fire(j); }, [i, swellAt]);
  for (let k = 0; k < 120; k++) { if (await pg.evaluate(() => window.__bps.st().phase === 'live')) return true; await pg.waitForTimeout(250); }
  return false;
}
const st = (pg) => pg.evaluate(() => Object.assign(window.__bps.st(), { spk: !document.getElementById('bSpk').hidden, h: document.querySelector('.tm').getBoundingClientRect().height }));

{ const { ctx, pg, errs } = await open(S_ON);
  const i = await idx(pg);
  ok('덕담 큐가 있다 · 사람 구간에 perSpeaker · 맺는 말에 «길었을 때» 갈래', i >= 0 && await pg.evaluate((j) => { const c = window.__bps.cues(); return !!(c[j].ps && c[j + 1] && c[j + 1].alt === 'narr-bless-end-long'); }, i), i);
  const h0 = (await st(pg)).h;
  const live = await toLive(pg, i, 0.6);
  const a = await st(pg);
  ok('1 덕담 사람 구간 — [다음 분]이 보인다 · 음악은 큐 값(-16) · 시간 줄 높이 그대로', live && a.spk && a.duck === -16 && Math.abs(a.h - h0) < 0.5, { live, a, h0 });
  await pg.waitForTimeout(900);
  const b = await st(pg);
  ok('2 음악 신호 — swellAt 이 되면 배경 음악이 swellTo(-10)로', b.duck === -10, b);
  await pg.click('#bSpk'); await pg.waitForTimeout(150);
  const c = await st(pg);
  ok('3 [다음 분] — 음악이 사람 구간 값(-16)으로 · 시간을 새로(liveT0 이 바뀜)', c.duck === -16 && c.t0 > a.t0, { a: a.t0, c });
  await pg.waitForTimeout(900);
  ok('3 [다음 분] — 신호를 다시 건다(다시 -10)', (await st(pg)).duck === -10);
  /* 4 두 분이 2분씩 — 첫 분 2분 → [다음 분] → 둘째 분 2분 → 맺는 말은 보통 판 */
  await pg.evaluate(() => window.__bps.ago(120));
  await pg.click('#bSpk');
  await pg.evaluate(() => window.__bps.ago(120));
  const e1 = await pg.evaluate((j) => { window.__esd.fire(j + 1); return window.__bps.shown(j + 1); }, i);
  ok('4 두 분이 2분씩(합 4분) · [다음 분]을 눌렀으면 맺는 말은 보통 판(narr-bless-end)', e1 === 'narr-bless-end', e1);
  await toLive(pg, i, null);
  await pg.evaluate(() => window.__bps.ago(190));
  const e2 = await pg.evaluate((j) => { window.__esd.fire(j + 1); return window.__bps.shown(j + 1); }, i);
  ok('4 마지막 분이 3분을 넘기면 «길었을 때»(narr-bless-end-long)', e2 === 'narr-bless-end-long', e2);
  await toLive(pg, i, null);
  await pg.evaluate(() => window.__bps.ago(240));
  const e3 = await pg.evaluate((j) => { window.__esd.fire(j + 1); return window.__bps.shown(j + 1); }, i);
  ok('5 [다음 분]을 안 누르면 덕담 전체로 잰다(4분 → «길었을 때»)', e3 === 'narr-bless-end-long', e3);
  ok('맺는 말이 나가면 [다음 분]은 걷힌다', !(await st(pg)).spk);
  ok('쪽 오류 0(디렉터 화면)', errs.length === 0, errs);
  await ctx.close(); }

{ const { ctx, pg, errs } = await open(Object.assign({}, S_ON, { blessProxy: true }));
  const i = await idx(pg);
  const live = await toLive(pg, i, 0.6); await pg.waitForTimeout(900);
  const a = await st(pg);
  ok('6 대독(나레이션이 읽는다) — [다음 분] 없음 · 음악 신호 없음(-16 그대로)', live && !a.spk && a.duck === -16 && await pg.evaluate((j) => !window.__bps.cues()[j].ps, i), a);
  ok('쪽 오류 0(대독)', errs.length === 0, errs);
  await ctx.close(); }

{ const { ctx, pg, errs } = await open(S_ON, '&embed=1');
  const i = await idx(pg);
  await pg.evaluate((j) => { window.__esd.fire(j); }, i); await pg.waitForTimeout(1500);
  ok('6 고객 미리 듣기(embed=1) — [다음 분] 없음', !(await st(pg)).spk);
  ok('쪽 오류 0(고객 미리 듣기)', errs.length === 0, errs);
  await ctx.close(); }

await br.close(); srv.close();
console.log(fail ? `\nBLESS PER SPEAKER FAIL ${fail}` : '\nBLESS PER SPEAKER OK');
process.exit(fail ? 1 : 0);
