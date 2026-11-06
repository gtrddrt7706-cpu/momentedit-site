// ★[ENG_ONCE 2026-10-09 고객 여정 A~Z 점검 1라운드 A-4] 소리 엔진(ritual-*.js)을 못 받으면 그리기마다 다시 묻지 않는다.
//   사고(시뮬 재현): 그리기 → 실패 → 다시 그리기가 끝없이 돌아 ② 에서 10초에 엔진 파일을 수백 번 요청했고, 화면은 «흐름을 불러오고 있어요 · 잠깐이면 돼요»에 머물러
//   까닭(L#)이 안 보였다(③ 은 빈 회색 장면).
//   1 엔진 파일이 500 이면 5초 동안 더 묻지 않는다(처음 한 번뿐) · ③ 에 «흐름을 불러오지 못했어요 … (코드 L0)» + «다시 불러오기»
//   2 «다시 불러오기»는 누를 때 한 번만 묻고 · 엔진이 돌아오면 상자가 걷힌다
//   EO_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.EO_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
let cueN = 0, cueFail = true, cueHang = false;   // [B2_GEUL_14] cueHang = 답을 끝없이 미룬다
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]);
  if (/\/assets\/ritual-cue\.js$/.test(u)) { cueN++; if (cueHang) return; if (cueFail) { r.writeHead(500); r.end('x'); return; } }
  const p = path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`${BASE}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
  await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } }); await wait(1200);
  await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'practice') { idx = i; render(); break; } }); await wait(800);
  const n0 = cueN; await wait(5000); const n1 = cueN;
  const box = await pg.evaluate(() => { const b = document.querySelector('[data-fk="engretry"]'); const w = b && b.closest('.mk-wait'); return { has: !!b, t: w ? w.textContent.replace(/\s+/g, ' ').trim() : '' }; });
  ok('1 엔진 파일이 500 이면 5초 동안 더 묻지 않는다 · ③ 에 «흐름을 불러오지 못했어요 (코드 L0)» + «다시 불러오기» [ENG_ONCE]', n1 - n0 === 0 && n1 <= 2 && box.has && /흐름을 불러오지 못했어요/.test(box.t) && /\(코드 L0\)/.test(box.t), JSON.stringify({ more: n1 - n0, total: n1, box }));
  await pg.evaluate(() => document.querySelector('[data-fk="engretry"]').click()); await wait(2500); const n2 = cueN;
  cueFail = false; await pg.evaluate(() => document.querySelector('[data-fk="engretry"]').click()); await wait(2500);
  const rec = await pg.evaluate(() => ({ eng: !!ENG, box: !!document.querySelector('[data-fk="engretry"]') }));
  ok('2 «다시 불러오기»는 누를 때 한 번만 묻고 · 엔진이 돌아오면 상자가 걷힌다', n2 - n1 === 1 && rec.eng && !rec.box, JSON.stringify({ perPress: n2 - n1, rec }));
  /* 3 [B2_GEUL_14] 흐름 파일 하나가 답을 미루면 한도(ENG_TO_MS) 뒤 «흐름을 불러오는 데 오래 걸려요 · 다시 불러와 주세요 (코드 L5)» + «다시 불러오기» · 옛 요청은 새 상태를 덮지 않는다 */
  cueHang = true; await pg.evaluate(() => { ENG = null; ENGP = null; ENG_ERR = ''; ENG_TO_MS = 1500; engine().then(() => render()); render(); }); await wait(2600);
  const hb = await pg.evaluate(() => { const b = document.querySelector('[data-fk="engretry"]'); const w = b && b.closest('.mk-wait'); return { has: !!b, err: ENG_ERR, t: w ? w.textContent.replace(/\s+/g, ' ').trim() : '' }; });
  ok('3 흐름 파일이 답을 미루면 한도 뒤 «흐름을 불러오는 데 오래 걸려요 · 다시 불러와 주세요 (코드 L5)» + «다시 불러오기» [B2_GEUL_14]', hb.has && hb.err === 'L5' && /흐름을 불러오는 데 오래 걸려요/.test(hb.t) && /다시 불러와 주세요 \(코드 L5\)/.test(hb.t), JSON.stringify(hb));
  cueHang = false; await pg.evaluate(() => { ENG_TO_MS = 40000; document.querySelector('[data-fk="engretry"]').click(); }); await wait(2500);
  const hr = await pg.evaluate(() => ({ eng: !!ENG, err: ENG_ERR, box: !!document.querySelector('[data-fk="engretry"]') }));
  ok('3 다시 불러오기 → 엔진이 돌아오면 상자가 걷힌다(멈춘 요청이 덮지 않음)', hr.eng && !hr.err && !hr.box, JSON.stringify(hr));
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nENG ONCE FAIL ${fail}` : '\nENG ONCE OK'); process.exit(fail ? 1 : 0);
