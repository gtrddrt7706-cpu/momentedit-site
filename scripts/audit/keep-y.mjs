// ★[KEEP_Y 2026-10-07 사장님 «스튜디오 나레이션 버튼을 누르면 화면이 자동으로 위로 올라가는데 그대로 있게 · 다른 곳들도 마찬가지»] (390 · 1280)
//   ①하객 맞이 · 입장 인사 · 식전 영상에서 AI ↔ 스튜디오 나레이션을 눌러 아래 글이 짧아져도 누른 칩이 제자리 ②맨 위로 올라가면 받침이 풀린다 ③다른 쪽으로 넘어가면 받침이 풀린다
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
const setup = async (pg) => { await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['prevideo', 'entry'].forEach((k) => { S.on[k] = 1; }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; window._vc = () => new Promise(() => {}); VC.st = { groom: { ready: true }, bride: { ready: true } }; VC.loading = false; S.tipSeen = { keep: 1 }; buildSteps(); for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
  await wait(300); };
try { for (const w of [390,1280]) { const pg = await br.newPage({ viewport: { width: w, height: 800 }, hasTouch: w<1000 }); const errs=[]; pg.on('pageerror',(e)=>errs.push(e.message)); await setup(pg);
  for (const mom of ['guest','entry','prevideo']) {
    await pg.evaluate((m) => mkGo(m), mom); await wait(500);
    const key = mom==='guest'?'guestVoice':mom==='entry'?'entryVoice':'pvVoice';
    for (const [from,to] of [['ai','nar'],['nar','ai']]) {
      await pg.evaluate(([k,v]) => { _lSet(k,v); render(); }, [key,from]); await wait(300);
      const sel='[data-fk="lsc:'+key+':'+to+'"]';
      await pg.evaluate((s)=>{ const r=document.querySelector(s).getBoundingClientRect(); scrollBy(0, r.top-250); }, sel); await wait(300);
      const b = await pg.evaluate((s)=>Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
      await pg.click(sel); await wait(600);
      const a = await pg.evaluate((s)=>Math.round(document.querySelector(s).getBoundingClientRect().top), sel);
      ok(`${w} ${mom} ${from}→${to} 누른 칩이 제자리(${b}→${a})`, Math.abs(a-b)<=1, `${b}→${a}`);
    }
  }
  // 위로 스크롤하면 받침이 준다 · 다른 쪽으로 넘어가면 풀린다
  await pg.evaluate(() => { scrollTo(0,0); }); await wait(300);
  const c = await pg.evaluate(() => document.body.style.minHeight);
  ok(`${w} 맨 위로 올라가면 받침이 풀린다`, c==='', c);
  await pg.evaluate(() => { scrollTo(0, 300); _lSet('pvVoice','ai'); render(); _lSet('pvVoice','nar'); render(); mkGo('guest'); }); await wait(400);
  const d = await pg.evaluate(() => document.body.style.minHeight);
  ok(`${w} 다른 쪽으로 넘어가면 받침이 풀린다`, d==='', d);
  ok(`${w} pageerror 0`, !errs.length, errs.slice(0,2).join(' | '));
  await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nKEEP Y FAIL ${fail}` : '\nKEEP Y OK'); process.exit(fail ? 1 : 0);
