// ★[VP_FOLLOW_1122 2026-11-22 사장님 «처음 고른 스튜디오 나레이션 / AI 두 분 목소리를 다른 곳도 따라가게»]
//   하객 맞이에서 스튜디오 나레이션을 고르면 아직 안 고른 입장 · 식전 영상 소개도 같은 것으로 골라진다(눌린 모양) · 이미 고른 자리는 그대로
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  const st = await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.upLive = true; courseStarted = true; S.on = S.on || {}; S.on.entry = 1; S.on.prevideo = 1; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } return { live: _upLive(), vc: _vcOn() }; });
  if (!st.live) { console.log('못 쟀다 — 안내 목소리 칩 줄이 없는 판(_upLive false)'); process.exit(2); }
  await wait(300); await pg.evaluate(() => mkGo('guest')); await wait(600);
  const before = await pg.evaluate(() => ({ e: _vpUnpicked('entry'), p: _vpUnpicked('prevideo') }));
  await pg.click('[data-fk="lsc:guestVoice:nar"]'); await wait(500);
  const a = await pg.evaluate(() => ({ e: _vpUnpicked('entry'), p: _vpUnpicked('prevideo'), ev: _vpCur('entry'), pv: _vpCur('prevideo'), t: Object.keys(S.touched || {}).filter((k) => /Voice$/.test(k)).sort().join() }));
  ok('하객 맞이에서 스튜디오 나레이션 → 입장 · 식전 영상 소개도 스튜디오 나레이션 · 눌린 모양', before.e === true && a.e === false && a.ev === 'nar' && (!st.vc || (a.p === false && a.pv === 'nar')), JSON.stringify({ before, a }));
  if (st.vc) {
    await pg.evaluate(() => { S.touched = {}; delete S.guestVoice; delete S.entryVoice; delete S.pvVoice; S.vfill = {}; S.touched.pvVoice = 1; render(); }); await wait(300);
    await pg.evaluate(() => mkGo('guest')); await wait(500);
    await pg.click('[data-fk="lsc:guestVoice:ai"]').catch(() => pg.evaluate(() => _lSet('guestVoice', 'ai'))); await wait(500);
    const b = await pg.evaluate(() => ({ ev: _vpCur('entry'), pv: _vpCur('prevideo'), e: _vpUnpicked('entry') }));
    ok('AI 두 분 목소리 → 안 고른 입장은 AI · 이미 고른 식전 영상 소개(손댐)는 그대로(스튜디오)', b.ev === 'ai' && b.e === false && b.pv === 'nar', JSON.stringify(b));
  }
  ok('pageerror 0', errs.length === 0, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `VP FOLLOW FAIL ${fail}` : 'VP FOLLOW OK'); process.exit(fail ? 1 : 0);
