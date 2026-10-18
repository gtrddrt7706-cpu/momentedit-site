#!/usr/bin/env node
/* ★[TAKE_TIME_1019 검토 133-4] 당일 콘솔 «천천히» 단추 — 말하는 사람 순간(서약 · 감사문 · 편지 · 부모님께 드리는 말 · 덕담 · 축사 · 감사 인사)에서만 보이고,
   누르면 이미 녹음된 «천천히 하셔도 괜찮습니다.»(우성 · 서약 여는 말 판)를 한 번 튼다 · 한 순간에 한 번만 · 진행 위치는 그대로
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
const S0 = { course: 'open', on: { prevideo: 1, vow: 1, letter: 1 } };
const st = (pg) => pg.evaluate(() => window.__rr.st());
async function toLive(pg, i) {
  await pg.evaluate((j) => window.__esd.fire(j), i);
  for (let k = 0; k < 120; k++) { if ((await st(pg)).phase === 'live') return true; await pg.waitForTimeout(250); }
  return false;
}
const tk = (pg) => pg.evaluate(() => { const b = document.getElementById('bTake'); return b ? { hidden: b.hidden, dis: b.disabled } : null; });
{ const { ctx, pg, errs } = await open(S0);
  const asked = []; pg.on('request', (q) => { if (/take-time\.mp3/.test(q.url())) asked.push(q.url()); });
  const cues = await pg.evaluate(() => window.__rr.cues());
  const pv = cues.findIndex((c) => c.k === 'prevideo' && c.live), vw = cues.findIndex((c) => c.k === 'vow' && c.live);
  ok('식전 영상 · 서약 사람 구간이 있다', pv >= 0 && vw > pv, { pv, vw });
  const a0 = await tk(pg); ok('1 시작 전에는 «천천히»가 숨어 있다', a0 && a0.hidden === true, a0);
  await toLive(pg, pv); const a1 = await tk(pg); ok('2 식전 영상(말하는 순간 아님)에서는 숨어 있다', a1 && a1.hidden === true, a1);
  const live = await toLive(pg, vw); const a2 = await tk(pg); ok('3 서약 사람 구간에서는 보이고 눌린다', live && a2 && !a2.hidden && !a2.dis, a2);
  await pg.click('#bTake'); await pg.waitForTimeout(500); const a3 = await tk(pg);
  ok('4 누르면 이미 녹음된 «천천히 하셔도 괜찮습니다.» 판(take-time.mp3)을 틀고 · 그 순간엔 한 번만(흐려짐) · 진행은 그대로(사람 구간)', asked.length >= 1 && a3 && a3.dis === true && (await st(pg)).phase === 'live', { asked: asked.length, a3 });
  ok('5 파일이 있다', fs.existsSync(path.join(ROOT, 'assets/audio/console/take-time.mp3')));
  ok('쪽 오류 0', !errs.length, errs);
  await ctx.close(); }
await br.close(); srv.close();
console.log(fail ? `TAKE TIME FAIL ${fail}` : 'TAKE TIME OK'); process.exit(fail ? 1 : 0);
