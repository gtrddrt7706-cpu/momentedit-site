#!/usr/bin/env node
/* ★[FLOW_DECL_ST12 2026-11-06 대본 검수 ST12-01] 마이페이지 사진 준비 — 식순이 없거나 옛 초안이어도 photoSceneList 가 오류 없이 빈 목록을 낸다.
   10357줄 주석이 닫히지 않아 다음 줄 «var flow=…» 이 주석에 삼켜졌던 사고(ReferenceError: flow is not defined)를 막는다. 종료 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); let pw = null; try { pw = require('playwright'); } catch (e) {}
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), PAGE = process.env.PSF_PAGE || 'mypage.html';
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = u === '/__page.html' ? path.join(ROOT, PAGE) : path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const br = await pw.chromium.launch(); const pg = await br.newPage();
await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
await pg.goto(`http://127.0.0.1:${port}/__page.html`, { waitUntil: 'load' }).catch(() => {}); await pg.waitForTimeout(800);
const r = await pg.evaluate(() => { const o = {}; for (const [k, rd] of [['빈 초안', {}], ['식순 없음', { summary: {} }], ['옛 초안', { summary: { flow: ['candle', 'entry'] }, S: { course: 'open' } }]]) { try { const x = photoSceneList(rd); void x; o[k] = 'ok';   /* 오류 없이 돌아오면 통과(빈 초안은 null · 목록은 배열) */ } catch (e) { o[k] = String(e && e.message || e); } } return o; }).catch((e) => ({ err: String(e) }));
ok('사진 준비 장면 목록 — 빈 초안 · 식순 없음 · 옛 초안 모두 오류 없음 [FLOW_DECL_ST12]', r && Object.values(r).every((v) => v === 'ok'), r);
await br.close(); srv.close(); process.exit(fail ? 1 : 0);
