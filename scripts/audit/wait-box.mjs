// ★[WAIT_BOX 2026-10-06 사장님 «불러오는 중 · 직관적이게 · 고객 입장에서 기다리면 되는구나 싶게»] (390 · 1280)
//   ①두 분 목소리 쪽 · 상태를 받는 동안 = 기다리는 칸(제목 · 움직이는 막대 · «잠깐이면 돼요») · 옛 «불러오는 중이에요…» 한 줄 없음
//   ②8초가 넘으면 «조금 오래 걸리고 있어요» ③받으면 칸이 사라지고 사람 카드
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
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
const SHOT = process.env.WAIT_SHOT || '';
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: true }, bride: { ready: false } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await pg.evaluate(() => { window._vc = () => new Promise(() => {}); VC.st = null; VC.loading = false; });   // 서버가 아직 답하지 않는 상태
    await wait(300); await pg.evaluate(() => mkGo('_voice')); await wait(600);
    const a = await pg.evaluate(() => { const b = document.querySelector('.mk-vpage .mk-wait'); return { box: !!b, t: b && b.querySelector('.mk-wait-t').textContent, s: b && b.querySelector('.mk-wait-s').textContent, bar: !!(b && b.querySelector('.mk-wait-bar i')), role: b && b.getAttribute('role'), old: /불러오는 중이에요…/.test(document.querySelector('.mk-vpage').textContent) }; });
    ok(`${w} ① 기다리는 칸 — 제목 · 막대 · «잠깐이면 돼요» · 옛 한 줄 없음`, a.box && a.t === '두 분 목소리를 불러오고 있어요' && /잠깐이면 돼요/.test(a.s) && a.bar && a.role === 'status' && !a.old, JSON.stringify(a));
    if (SHOT) { await pg.evaluate(() => { document.querySelector('.mk-wait').scrollIntoView({ block: 'center' }); }); await pg.screenshot({ path: `${SHOT}-${w}.png` }); }
    const b = await pg.evaluate(() => { VC.loadT0 = Date.now() - 9000; render(); return (document.querySelector('.mk-wait-s') || {}).textContent; });
    ok(`${w} ② 8초가 넘으면 «조금 오래 걸리고 있어요»`, /조금 오래 걸리고 있어요/.test(b || ''), b);
    const c = await pg.evaluate(() => { VC.loading = false; VC.st = { groom: { ready: true }, bride: { ready: false } }; render(); return { box: !!document.querySelector('.mk-vpage .mk-wait'), cards: document.querySelectorAll('.mk-vpage .mk-vpc').length }; });
    ok(`${w} ③ 받으면 칸이 사라지고 사람 카드 둘`, !c.box && c.cards === 2, JSON.stringify(c));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nWAIT BOX FAIL ${fail}` : '\nWAIT BOX OK'); process.exit(fail ? 1 : 0);
