// ★[FLOW_FILL 2026-10-07 사장님 «전체 선택하면 "천천히 진행되면 …" 문구가 나오면서 그래프 아래에 빈 간격 · 확인 개선»] (1280 · 1000 · PC 두 칸 판)
//   알림이 붙어 오른쪽 칸이 길어져도 왼쪽 그림 아래 빈칸이 단추 아래 빈칸과 같다(그림이 그만큼 늘어난다) · 알림 없으면 그대로
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

const next = async (pg) => { await pg.waitForTimeout(450); await pg.evaluate(() => document.getElementById('next').click()); };
try { for (const w of [1280, 1000]) for (const all of [false,true]) { const pg = await br.newPage({ viewport: { width: w, height: 900 } }); const errs=[]; pg.on('pageerror',e=>errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  await next(pg); await wait(350); await next(pg); await wait(450); await pg.click('[data-fk="opx:family"]'); await wait(400);
  if (all) { await pg.evaluate(() => { Object.keys(RitualOpen.CARDS).forEach(k=>{ if(!RitualOpen.ALWAYS[k]&&k!=='_close'&&!(S.on||{})[k]) opTgl(k); }); }); await wait(600); }
  const m = await pg.evaluate(() => { const fp=document.querySelector('.pk-fp'); if(!fp) return null; const sv=fp.querySelector('.pk-fg svg'), r=fp.getBoundingClientRect(), b=sv&&sv.getBoundingClientRect(), go=fp.querySelector('.pk-side .pk-go'); return { note: !!fp.querySelector('.pk-side .op-note'), svgH: b&&Math.round(b.height), gapBelowSvg: b&&Math.round(r.bottom-b.bottom), goToBottom: go&&Math.round(r.bottom-go.getBoundingClientRect().bottom) }; });
  ok(`${w} ${all?'전체 담음(알림 있음)':'가족 예시'} 그림 아래 빈칸 = 단추 아래 빈칸(${m&&m.gapBelowSvg} · ${m&&m.goToBottom})`, m && Math.abs(m.gapBelowSvg-m.goToBottom)<=4 && (!all||m.note), JSON.stringify(m));
  ok(`${w} pageerror 0`, !errs.length, errs.slice(0,2).join(' | '));
  await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nFLOW FILL FAIL ${fail}` : '\nFLOW FILL OK'); process.exit(fail ? 1 : 0);
