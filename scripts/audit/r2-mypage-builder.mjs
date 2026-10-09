// ★[R2_MP_BUILDER 2026-10-09 고객 여정 A~Z 점검 2라운드 · 마이페이지 안 식순 창] 충돌 판 · 새로고침 · 뒤로가기 · 겹쳐 열기.
//   1 [RELOAD_UNWIND]     식순 창 «새로고침» 뒤 저장하고 나가도 마이페이지 다음 층은 뒤로가기 한 번에 닫힌다
//   2 [HOLD_RESTACK]      뒤로가기로 «저장하지 않은 변경이 있어요»가 뜬 뒤 한 번 더 뒤로가기 — 마이페이지를 떠나지 않고 그 판만 닫힌다
//   3 [REV_FORCE_DIRECT]  충돌 판 «내가 쓴 내용으로 저장 → 덮어쓰기»가 실제로 나간다 · 그 트랙 저장 줄이 잠기지 않는다(다음 저장도 나간다)
//   4 [LATEST_FILL]       충돌 판 «최신 내용 불러오기» → 식순 창 내용이 다른 기기 판으로 바뀐다
//   5 [OB_OPEN_ONCE]      식순 창을 두 번 열어도 하나 · 닫은 뒤 본문 잠금 · 뒤로가기 층이 남지 않는다
//   6 [PARENT_ASK_HOLD]   식순 창 위에 마이페이지 판이 떠 있는 동안 뒤로가기는 식순 걸음을 바꾸지 않는다
//   R2M_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.R2M_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 가짜 GAS — 마이페이지 상태 «없음» · 저장은 성공(REV 모드면 첫 저장 하나를 «다른 기기에서 먼저 저장됐어요»로) */
const GAS = (mode) => { if (window.top !== window) return; const real = window.fetch.bind(window);
  window.__saves = []; let first = true;
  window.fetch = function (url, o) { if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    const res = (x) => new Promise((r) => setTimeout(() => r(new Response(JSON.stringify(x), { status: 200, headers: { 'Content-Type': 'application/json' } })), 150));
    if (b.action === 'getMyState') return res({ ok: false, reason: 'none' });
    if (b.action === 'saveProductionTrack') { window.__saves.push({ force: !!b.force, vow: (((b.draft || {}).S || {}).tx || {})['vow.g'] || '' });
      if (mode === 'rev' && first && !b.force) { first = false; const S2 = JSON.parse(JSON.stringify((b.draft || {}).S || {})); S2.tx = Object.assign({}, S2.tx, { 'vow.g': '다른 기기에서 쓴 서약' });
        return res({ ok: false, code: 'rev', error: '다른 기기(또는 탭)에서 이 항목이 먼저 저장됐어요.', latest: { rev: '7', draft: { _v: 3, S: S2, summary: {} }, tracks: {} } }); }
      return res({ ok: true, rev: String(window.__saves.length + 7) }); }
    return res({ ok: true }); }; };
async function frame(pg) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function ready(f) { for (let i = 0; i < 100 && !(await f.evaluate(() => typeof S === 'object' && typeof render === 'function' && !!document.getElementById('next')).catch(() => false)); i++) await wait(100); }
async function open(mode) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(GAS, mode || '');
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.goto(`${BASE}/mypage.html`); await wait(1500);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await wait(1500);
  let f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다'); await ready(f);
  const nx = async () => { await f.evaluate(() => document.getElementById('next').click()); await wait(700); };
  await nx(); await nx();
  await f.evaluate(() => { const b = document.querySelector('[data-fk="opx:family"]'); if (b) b.click(); }); await wait(700);
  await nx(); await wait(500);
  await f.evaluate(() => { S.tx = Object.assign({}, S.tx, { 'vow.g': '이 기기에서 쓴 서약' }); _persist(); });
  return { ctx, pg, f, errs };
}
const askText = (f) => f.evaluate(() => ((document.querySelector('.ord-ask.on') || {}).innerText || '').split('\n')[0]).catch(() => '');
const overlay = (pg) => pg.evaluate(() => !!document.getElementById('mp_obViewer'));
/* 마이페이지 판(#mpModal)은 #mypageView 안에 있다 — 가짜 상태(«없음»)에서는 그 화면이 숨어 판도 안 보여 먼저 보이게 한다(하니스 몫 · 실제 고객 화면은 늘 보인다) */
const mpBtn = (pg, re) => pg.evaluate((src) => { try { if (typeof show === 'function') show('mypageView'); } catch (e) {} const re = new RegExp(src); const m = document.getElementById('mpModal'); if (!m || !m.classList.contains('open')) return false;
  const b = [...m.querySelectorAll('button')].find((x) => re.test(x.textContent)); if (b) { b.click(); return true; } return false; }, re.source);
async function nextLayerBacks(pg) { await pg.evaluate(() => { window.__closed = 0; bkOpen(function () { window.__closed++; }); }); await wait(300);
  for (let i = 1; i <= 6; i++) { await pg.goBack({ timeout: 800 }).catch(() => {}); await wait(700); if (await pg.evaluate(() => window.__closed)) return i; } return -1; }
try {
  /* 1 */
  { const { ctx, pg, f, errs } = await open();
    const d0 = await f.evaluate(() => (history.state || {}).d | 0);
    await f.evaluate(() => window._obReload()); await wait(2500);
    const f2 = await frame(pg); await ready(f2);
    await f2.evaluate(() => { S.tx = Object.assign({}, S.tx, { 'vow.g': '새로고침 뒤 고친 글' }); _persist(); });
    await f2.evaluate(() => document.getElementById('obExit').click()); await wait(900);
    await f2.evaluate(() => { const b = document.querySelector('.ord-ask.on .oa-yes'); if (b) b.click(); }); await wait(2000);
    const closed = !(await overlay(pg)), n = await nextLayerBacks(pg), p = await pg.evaluate(() => location.pathname);
    ok('1 식순 창 «새로고침» 뒤 저장하고 나가도 마이페이지 다음 층은 뒤로가기 한 번 [RELOAD_UNWIND]', d0 >= 2 && closed && n === 1 && p === '/mypage.html', JSON.stringify({ d0, closed, backs: n, p }));
    ok('1 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  /* 2 */
  { const { ctx, pg, f, errs } = await open();
    let k = -1; for (let i = 0; i < 6; i++) { await pg.goBack({ timeout: 1500 }).catch(() => {}); await wait(800); if (await askText(f)) { k = i + 1; break; } }
    await pg.goBack({ timeout: 1500 }).catch(() => {}); await wait(1200);
    const p = await pg.evaluate(() => location.pathname).catch(() => 'gone'), still = await overlay(pg).catch(() => false), a2 = await askText(f);
    ok('2 판이 뜬 뒤 한 번 더 뒤로가기 — 마이페이지를 떠나지 않고 그 판만 닫힌다 [HOLD_RESTACK · BACK_DISMISS]', k > 0 && p === '/mypage.html' && still && !a2, JSON.stringify({ k, p, still, ask: a2 }));
    ok('2 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  /* 3 */
  { const { ctx, pg, f, errs } = await open('rev');
    await f.evaluate(() => { _dirtyMark(); document.getElementById('obSave').click(); }); await wait(1500);
    const m1 = await mpBtn(pg, /내가 쓴 내용으로 저장/); await wait(700);
    const m2 = await mpBtn(pg, /덮어쓰기/); await wait(1800);
    const s1 = await pg.evaluate(() => ({ saves: window.__saves.map((x) => x.force), busy: (window._sqBusy || {})['trk:ritual'] }));
    await f.evaluate(() => { S.tx = Object.assign({}, S.tx, { 'vow.g': '덮어쓴 뒤 또 고친 글' }); _persist(); _dirtyMark(); document.getElementById('obSave').click(); }); await wait(1500);
    const s2 = await pg.evaluate(() => window.__saves.length);
    ok('3 «내가 쓴 내용으로 저장 → 덮어쓰기»가 실제로 나간다 · 저장 줄이 잠기지 않는다(다음 저장도 나간다) [REV_FORCE_DIRECT]', m1 && m2 && s1.saves.length === 2 && s1.saves[1] === true && !s1.busy && s2 === 3, JSON.stringify({ m1, m2, s1, s2 }));
    ok('3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  /* 4 */
  { const { ctx, pg, f, errs } = await open('rev');
    await f.evaluate(() => { _dirtyMark(); document.getElementById('obSave').click(); }); await wait(1500);
    const m = await mpBtn(pg, /최신 내용 불러오기/); await wait(1500);
    const v = await f.evaluate(() => ({ vow: (S.tx || {})['vow.g'], save: (document.getElementById('obSave') || {}).textContent }));
    ok('4 «최신 내용 불러오기» → 식순 창 내용이 다른 기기 판으로 [LATEST_FILL]', m && v.vow === '다른 기기에서 쓴 서약', JSON.stringify(Object.assign({ m }, v)));
    ok('4 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  /* 5 */
  { const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
    await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}'); await ctx.addInitScript(GAS, '');
    await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
    const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.goto(`${BASE}/mypage.html`); await wait(1500);
    await pg.evaluate(() => { openRitualBuilder({}, {}); openRitualBuilder({}, {}); }); await wait(1800);
    const n1 = await pg.evaluate(() => document.querySelectorAll('#mp_obViewer').length);
    const f = await frame(pg); await ready(f);
    await f.evaluate(() => document.getElementById('obExit').click()); await wait(1500);
    const after = await pg.evaluate(() => ({ ov: !!document.getElementById('mp_obViewer'), pos: document.body.style.position || '', of: document.body.style.overflow || '' }));
    const n = await nextLayerBacks(pg);
    ok('5 두 번 열어도 창 하나 · 닫은 뒤 본문이 잠기지 않고 다음 층은 뒤로가기 한 번 [OB_OPEN_ONCE]', n1 === 1 && !after.ov && after.pos !== 'fixed' && n === 1, JSON.stringify({ n1, after, backs: n }));
    ok('5 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
  /* 6 */
  { const { ctx, pg, f, errs } = await open();
    const k0 = await f.evaluate(() => STEPS[idx] && STEPS[idx].k);
    await pg.evaluate(() => { mpConfirm({ title: '시험 판', body: '', yes: '예', no: '아니오' }); }); await wait(600);
    await pg.goBack({ timeout: 1500 }).catch(() => {}); await wait(1000);
    const k1 = await f.evaluate(() => STEPS[idx] && STEPS[idx].k), p = await pg.evaluate(() => location.pathname);
    await mpBtn(pg, /아니오/); await wait(400);
    ok('6 식순 창 위에 마이페이지 판이 떠 있는 동안 뒤로가기는 식순 걸음을 바꾸지 않는다 [PARENT_ASK_HOLD]', k0 === k1 && p === '/mypage.html', JSON.stringify({ k0, k1, p }));
    ok('6 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await ctx.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nR2 MP BUILDER FAIL ${fail}` : '\nR2 MP BUILDER OK'); process.exit(fail ? 1 : 0);
