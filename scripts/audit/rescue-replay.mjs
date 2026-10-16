#!/usr/bin/env node
/* ★★[RESCUE_REPLAY_1016 라운드 6] «재생 안 됨»으로 미룬 순서를 콘솔이 기억한다(당일 콘솔 console.html)
   고객 화면 안심 «사진 시간에 다시 틀어 드려요»(식전 영상 · 준비한 순서의 영상 · 음원)의 짝 — 예전엔 미룬 것을 어디에도 적지 않았다.
   1 «재생 안 됨» 단추는 영상 · 음원 순서(rescue 를 가진 사람 구간)에서만 눌린다 · 그 밖에서는 흐리다(자리 · 글은 그대로)
   2 ★[WAIT_CLIP_OFF_1016] 단추 글에 «대기 클립»이 없다 — 대기 클립(49)은 9/6 폐지(WAIT_BRIDGE_RETIRED)
   3 식전 영상 사람 구간에서 누르면 미룬 순서에 «식전 영상»이 적힌다
   4 사진 시간 첫 큐(단체 사진 안내 narr-close)에서 디렉터 칸에 «미룬 순서 · 식전 영상 · 사진 시간에 다시 틀어 주세요»
   5 안 미룬 날은 그 줄이 없다 · 쪽 오류 0
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
async function open(S0) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '{}' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(700);
  await pg.click('#go'); await pg.waitForTimeout(600);   // 디렉터 화면 — [시작] 을 눌러야 큐가 선다
  return { ctx, pg, errs };
}
const S0 = { course: 'open', on: { prevideo: 1, vow: 1 } };
const st = (pg) => pg.evaluate(() => window.__rr.st());
async function toLive(pg, i) {
  await pg.evaluate((j) => window.__esd.fire(j), i);
  for (let k = 0; k < 120; k++) { if ((await st(pg)).phase === 'live') return true; await pg.waitForTimeout(250); }
  return false;
}
{ const { ctx, pg, errs } = await open(S0);
  const cues = await pg.evaluate(() => window.__rr.cues());
  const pv = cues.findIndex((c) => c.k === 'prevideo' && c.rescue && c.live), close = cues.findIndex((c) => c.slug === 'narr-close');
  ok('식전 영상 큐(재생 안 됨 · 사람 구간)와 단체 사진 안내 큐가 있다', pv >= 0 && close > pv, { pv, close });
  const a0 = await st(pg);
  ok('1 영상 순서 밖(시작 전)에서는 «재생 안 됨»이 흐리다', a0.bw === true, a0);
  ok('2 단추 글에 «대기 클립»이 없다(WAIT_CLIP_OFF_1016)', !/대기 클립/.test(a0.bwText) && /재생 안 됨/.test(a0.bwText), a0.bwText);
  const live = await toLive(pg, pv);
  const a1 = await st(pg);
  ok('1 식전 영상 사람 구간에서는 «재생 안 됨»이 눌린다', live && a1.bw === false, a1);
  await pg.click('#bWait'); await pg.waitForTimeout(300);
  const a2 = await st(pg);
  ok('3 누르면 미룬 순서에 «식전 영상»', a2.rescued.length === 1 && a2.rescued[0] === '식전 영상', a2);
  await pg.evaluate((j) => window.__esd.fire(j), close); await pg.waitForTimeout(400);
  const a3 = await st(pg);
  ok('4 사진 시간 첫 큐에서 디렉터 칸에 미룬 순서 한 줄', a3.hintOn && a3.hint.indexOf('미룬 순서 · 식전 영상 · 사진 시간에 다시 틀어 주세요') === 0, a3);
  ok('쪽 오류 0', errs.length === 0, errs);
  await ctx.close(); }
{ const { ctx, pg, errs } = await open(S0);
  const cues = await pg.evaluate(() => window.__rr.cues());
  const close = cues.findIndex((c) => c.slug === 'narr-close');
  await pg.evaluate((j) => window.__esd.fire(j), close); await pg.waitForTimeout(400);
  const b = await st(pg);
  ok('5 안 미룬 날은 그 줄이 없다', b.rescued.length === 0 && b.hint.indexOf('미룬 순서') < 0, b);
  ok('쪽 오류 0(안 미룬 날)', errs.length === 0, errs);
  await ctx.close(); }
await br.close(); srv.close();
console.log(fail ? `\nRESCUE REPLAY FAIL ${fail}` : '\nRESCUE REPLAY OK');
process.exit(fail ? 1 : 0);
