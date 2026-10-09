// ★[HIST_DEPTH · EXIT_HOLD 2026-10-09 고객 여정 A~Z 점검 1라운드 A-3 · A-5] 마이페이지 안 식순 빌더의 뒤로가기.
//   사고(시뮬 재현):
//   A-5 빌더는 걸음마다 기록을 한 칸씩 쌓는데 닫을 때 마이페이지가 한 칸만 되감아, 닫은 뒤 뒤로가기 4번이 아무 일도 안 했다(창 하나 닫는 데 5번)
//   A-3 폰 뒤로가기로 나갈 때 «저장하지 않은 변경이 있어요» 판이 떠도 마이페이지의 3초 닫기가 그대로 돌아 저장 없이 창이 닫히고 «저장 확인 중이에요»가 떴다
//   1 저장하고 나간 뒤 — 마이페이지의 다음 층은 뒤로가기 한 번에 닫힌다 [HIST_DEPTH]
//   2 뒤로가기로 판이 뜨면 4초가 지나도 창이 그대로 · «저장 확인 중이에요» 없음 [EXIT_HOLD]
//   3 «취소하고 계속 만들기» 뒤 다시 뒤로가기 — 마이페이지를 떠나지 않고 판이 다시 뜬다 · «그냥 나가기» 뒤 다음 층도 한 번에 [EXIT_HOLD]
//   BB_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.BB_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 가짜 GAS — 마이페이지 상태는 «없음», 저장은 늘 성공 */
const GAS = () => { if (window.top !== window) return; const real = window.fetch.bind(window);
  window.__saves = 0;
  window.fetch = function (url, o) { if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    const res = (x) => new Promise((r) => setTimeout(() => r(new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } })), 150));
    if (b.action === 'getMyState') return res({ ok: false, reason: 'none' });
    if (b.action === 'saveProductionTrack') { window.__saves++; return res({ ok: true }); }
    return res({ ok: true }); }; };
async function frame(pg) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
/* 마이페이지 → 빌더 열기 → 안내 둘 → ‹가족› 예시 → ② (기록 칸 셋) · 고친 것 하나(저장 안 함) */
async function open() {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(GAS);
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`${BASE}/mypage.html`); await wait(1500);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await wait(1500);
  const f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  for (let i = 0; i < 100 && !(await f.evaluate(() => typeof S === 'object' && typeof render === 'function' && !!document.getElementById('next')).catch(() => false)); i++) await wait(100);
  const nx = async () => { await f.evaluate(() => document.getElementById('next').click()); await wait(700); };
  await nx(); await nx();
  await f.evaluate(() => { const b = document.querySelector('[data-fk="opx:family"]'); if (b) b.click(); }); await wait(700);
  await nx(); await wait(500);
  await f.evaluate(() => { S.tx = Object.assign({}, S.tx, { 'welcome.g': '고친 글' }); _persist(); });
  return { ctx, pg, f, errs };
}
const askText = (f) => f.evaluate(() => ((document.querySelector('.ord-ask.on') || {}).innerText || '').split('\n')[0]).catch(() => '');
const overlay = (pg) => pg.evaluate(() => !!document.getElementById('mp_obViewer'));
async function backUntilAsk(pg, f) { for (let i = 0; i < 6; i++) { await pg.goBack({ timeout: 1500 }).catch(() => {}); await wait(800); if (await askText(f)) return i + 1; } return -1; }
async function nextLayerBacks(pg) { await pg.evaluate(() => { window.__closed = 0; bkOpen(function () { window.__closed++; }); }); await wait(300);
  for (let i = 1; i <= 6; i++) { await pg.goBack({ timeout: 800 }).catch(() => {}); await wait(700); if (await pg.evaluate(() => window.__closed)) return i; } return -1; }
try {
  /* 1 */
  { const { ctx, pg, f, errs } = await open();
    const d = await f.evaluate(() => (history.state || {}).d | 0);
    await f.evaluate(() => document.getElementById('obExit').click()); await wait(900);
    await f.evaluate(() => { const b = document.querySelector('.ord-ask.on .oa-yes'); if (b) b.click(); }); await wait(2000);
    const closed = !(await overlay(pg)), saves = await pg.evaluate(() => window.__saves), n = await nextLayerBacks(pg);
    ok('1 저장하고 나간 뒤 마이페이지의 다음 층은 뒤로가기 한 번에 닫힌다(빌더가 쌓은 칸까지 한 번에 되감는다) [HIST_DEPTH]', d >= 2 && closed && saves === 1 && n === 1, JSON.stringify({ depth: d, closed, saves, backs: n }));
    ok('1 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  /* 2 · 3 */
  { const { ctx, pg, f, errs } = await open();
    const k = await backUntilAsk(pg, f); const a1 = await askText(f);
    await wait(4000);
    const still = await overlay(pg), toast = await pg.evaluate(() => /저장 확인 중이에요/.test(document.body.innerText));
    ok('2 뒤로가기로 «저장하지 않은 변경이 있어요»가 뜨면 4초가 지나도 창이 그대로 · «저장 확인 중이에요» 없음 [EXIT_HOLD]', k > 0 && /저장하지 않은 변경/.test(a1) && still && !toast, JSON.stringify({ backs: k, a1, still, toast }));
    await f.evaluate(() => { const b = document.querySelector('.ord-ask.on .oa-cancel'); if (b) b.click(); }); await wait(800);
    await pg.goBack({ timeout: 1500 }).catch(() => {}); await wait(1200);
    const p2 = await pg.evaluate(() => location.pathname), a2 = await askText(f), still2 = await overlay(pg);
    ok('3 «취소하고 계속 만들기» 뒤 다시 뒤로가기 — 마이페이지를 떠나지 않고 판이 다시 뜬다 [EXIT_HOLD]', p2 === '/mypage.html' && still2 && /저장하지 않은 변경/.test(a2), JSON.stringify({ p2, still2, a2 }));
    await f.evaluate(() => { const b = document.querySelector('.ord-ask.on .oa-no'); if (b) b.click(); }).catch(() => {}); await wait(1200);
    const closed = !(await overlay(pg)), n = await nextLayerBacks(pg), p3 = await pg.evaluate(() => location.pathname);
    ok('3 «그냥 나가기» 뒤 다음 층도 뒤로가기 한 번에 · 마이페이지에 머문다', closed && n === 1 && p3 === '/mypage.html', JSON.stringify({ closed, backs: n, p3 }));
    ok('2 · 3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nBUILDER BACK FAIL ${fail}` : '\nBUILDER BACK OK'); process.exit(fail ? 1 : 0);
