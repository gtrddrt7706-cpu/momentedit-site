#!/usr/bin/env node
/* ★★[STATE_PATIENT 2026-10-08 사장님 «모바일에서 새로고침하면 (코드 L5)» · «pc 에서도 자꾸» · «원인파악해서 확실하게»]
   진짜 마이페이지(mypage.html) + 가짜 GAS(페이지 안 fetch) + 가짜 시계로 «상태 불러오기»를 잰다.
   약속: 늦거나 끊기면 한 번 더 묻고, 두 번 다 안 될 때만 «최신 내용을 불러오지 못했어요 (코드 L5 · L6)».
   장면
     slow15     새로고침 · 서버 15초 → 막대 없이 새 내용(종전엔 12초에 L5)
     hangOnce   첫 요청이 20초 넘게 멈춤 · 두 번째 바로 → 막대 없이 새 내용 · 요청 2번
     netOnce    첫 요청 끊김 · 1.2초 뒤 다시 → 막대 없이 · 요청 2번
     hangTwice  두 번 다 멈춤 → 그때서야 «(코드 L5)» 막대 · 39초 전엔 막대 없음 · 요청 2번
     pull       당겨서 새로고침(베일) · 서버 멈춤 → 12초에 베일이 걷히고 화면을 쓸 수 있다 · 두 번째에 새 내용
     first      첫 방문(저장본 없음) · 서버 15초 → 12초에 «조금 오래 걸리고 있어요» · 15초에 마이페이지 · 다음 불러오기는 «불러오는 중…»부터
     reject     서버 거절(L4) → 다시 묻지 않고 곧장 막대 · 요청 1번
     expired    로그인 풀림 → 다시 묻지 않고 로그인 화면 · 요청 1번
     logout     끊김 뒤 다시 묻기 전에 로그아웃 → 두 번째 요청 없음 · 남의 화면을 그리지 않는다
   SP_MY=<mypage.html 경로> 면 그 판을 잰다(돌연변이 검사 · 2026-10-08 옛 판에서 9건 빨강 확인 · 거절 · 로그인 풀림은 옛 판도 같아 초록)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 220)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg' };
const ALT = process.env.SP_MY || '';   // 다른 판 mypage.html 로 재기(되돌리면 빨강인지 · 돌연변이 검사)
const srv = http.createServer((q, r) => { const u0 = decodeURIComponent(q.url.split('?')[0]), p = ALT && u0 === '/mypage.html' ? ALT : path.join(ROOT, u0); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const STATE = (name) => ({ ok: true, name, product: '시그니처', code: 'ME-SHOT', stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(), nextAction: '다음 할 일을 안내해 드릴게요.', contract: { signed: true }, payment: { confirmed: true }, result: null, production: null, isException: false });

/* 페이지 안 가짜 GAS — 동작마다 답 차례(Q[action] = [{hold, json} | {abort} | {hang}]) · 페이지 시계를 따른다 · AbortSignal 을 지킨다 */
const SERVER = () => {
  if (window.top !== window) return;
  window.__Q = {}; window.__CALLS = [];
  const real = window.fetch.bind(window);
  window.fetch = function (url, o) {
    if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    window.__CALLS.push({ a: b.action, t: Date.now() });
    const q = window.__Q[b.action] || [], h = q.length > 1 ? q.shift() : (q[0] || { json: { ok: true } });
    return new Promise((res, rej) => {
      const sig = o && o.signal; let done = false, tm = null;
      const fin = () => { done = true; if (tm) clearTimeout(tm); };
      if (sig) sig.addEventListener('abort', () => { if (done) return; fin(); rej(new DOMException('aborted', 'AbortError')); });
      if (h.abort) { fin(); rej(new TypeError('Failed to fetch')); return; }
      if (h.hang) return;
      tm = setTimeout(() => { if (done) return; fin(); res(new Response(JSON.stringify(h.json), { status: 200, headers: { 'Content-Type': 'application/json' } })); }, h.hold || 0);
    });
  };
};
async function adv(pg, ms, step = 500) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(Math.min(step, ms - t)); await wait(3); } }
const look = (pg) => pg.evaluate(() => ({ bar: (document.getElementById('mp_loadBar') || {}).textContent || '', my: document.getElementById('mypageView').classList.contains('show'),
  login: document.getElementById('loginView').classList.contains('show'), view: window._curView, name: (document.getElementById('mp_names') || {}).textContent || '',
  veil: !!document.getElementById('flow_busy'), load: ((document.querySelector('#loading .busy-row span:last-child') || {}).textContent) || '', calls: window.__CALLS.filter((c) => c.a === 'getMyState').length }));

/* 한 판 — cached=저장본으로 새로고침(종전 막대가 뜨던 길) · q=getMyState 답 차례 */
async function open(o) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  await ctx.addInitScript(SERVER);
  await ctx.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  /* 토큰 없이 연다(로그인 화면) — 부팅이 저절로 서버를 부르지 않게. 그다음 토큰 · 저장본을 넣고 reboot 가 부팅과 같은 길을 탄다 */
  await pg.goto(`${BASE}/mypage.html`, { waitUntil: 'domcontentloaded' }); await adv(pg, 1500);
  await pg.evaluate((cached) => { localStorage.setItem('me_token', 'TOK'); if (cached) localStorage.setItem('me_state_v1', JSON.stringify({ t: 'TOK', d: cached })); else localStorage.removeItem('me_state_v1'); }, o.cached || null);
  return { ctx, pg, errs };
}
const setQ = (pg, q) => pg.evaluate((q) => { window.__Q.getMyState = q; }, q);
/* 새로고침 흉내 — 이 판은 페이지를 연 뒤 답 차례를 넣어야 해서(초기 스크립트가 먼저 돈다) boot 를 다시 부르는 대신 저장본 그리기 + 조용한 갱신을 그대로 재현한다 */
const reboot = (pg) => pg.evaluate(() => { const c = readCachedState(); if (c) { show('loading'); renderMyPage(c); show('mypageView'); loadMyState({ silent: true }); } else loadMyState(); });   // boot 와 같은 순서
const OLD = STATE('옛 내용'), NEW = STATE('새 내용');

const SC = {
  async slow15() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ hold: 15000, json: NEW }]); await reboot(pg);
    await adv(pg, 12500); const a = await look(pg); await adv(pg, 3500); const b = await look(pg);
    ok('slow15 — 12.5초에 막대 없음(종전엔 여기서 L5) · 15초에 새 내용 · 막대 없음 · 요청 1번 · 오류 0', !a.bar && !b.bar && /새 내용/.test(b.name) && b.calls === 1 && !errs.length, JSON.stringify([a, b, errs[0]])); await ctx.close(); },
  async hangOnce() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ hang: 1 }, { hold: 800, json: NEW }]); await reboot(pg);
    await adv(pg, 19500); const a = await look(pg); await adv(pg, 2000); const b = await look(pg);
    ok('hangOnce — 첫 요청 멈춤 → 20초에 한 번 더 · 막대 없이 새 내용 · 요청 2번 · 오류 0', !a.bar && a.calls === 1 && !b.bar && /새 내용/.test(b.name) && b.calls === 2 && !errs.length, JSON.stringify([a, b, errs[0]])); await ctx.close(); },
  async netOnce() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ abort: 1 }, { hold: 500, json: NEW }]); await reboot(pg);
    await adv(pg, 600); const a = await look(pg); await adv(pg, 1500); const b = await look(pg);
    ok('netOnce — 끊김 → 1.2초 뒤 다시 · 막대 없이 새 내용 · 요청 2번 · 오류 0', !a.bar && a.calls === 1 && !b.bar && /새 내용/.test(b.name) && b.calls === 2 && !errs.length, JSON.stringify([a, b, errs[0]])); await ctx.close(); },
  async hangTwice() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ hang: 1 }, { hang: 1 }]); await reboot(pg);
    await adv(pg, 39000); const a = await look(pg); await adv(pg, 1500); const b = await look(pg);
    ok('hangTwice — 39초까지 막대 없음 · 두 번 다 멈추면 «최신 내용을 불러오지 못했어요 (코드 L5)» · 화면은 저장본 그대로 · 로그아웃 없음', !a.bar && a.calls === 2 && /최신 내용을 불러오지 못했어요 \(코드 L5\)/.test(b.bar) && b.my && /옛 내용/.test(b.name) && !errs.length, JSON.stringify([a, b, errs[0]])); await ctx.close(); },
  async pull() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ hold: 300, json: OLD }]); await reboot(pg); await adv(pg, 1000);
    await setQ(pg, [{ hang: 1 }, { hold: 1500, json: NEW }]); await pg.evaluate(() => _mpRefresh()); await adv(pg, 6000); const a = await look(pg); await adv(pg, 6500); const b = await look(pg); await adv(pg, 9500); const c = await look(pg);
    ok('pull — 당겨서 새로고침 · 서버 멈춤 → 6초엔 베일 · 12초가 지나면 베일이 걷힌다(화면을 쓸 수 있다) · 막대 없음', a.veil && !b.veil && !b.bar, JSON.stringify([a, b]));
    ok('pull — 두 번째 요청이 새 내용을 그린다 · 막대 없음 · 오류 0', /새 내용/.test(c.name) && !c.bar && !errs.length, JSON.stringify([c, errs[0]])); await ctx.close(); },
  async first() { const { ctx, pg, errs } = await open({}); await setQ(pg, [{ hold: 15000, json: NEW }]); await reboot(pg);
    await adv(pg, 6000); const a = await look(pg); await adv(pg, 6500); const b = await look(pg); await adv(pg, 3000); const c = await look(pg);
    ok('first — 첫 방문: 6초엔 «불러오는 중…» · 12초가 지나면 «조금 오래 걸리고 있어요…» · 15초에 마이페이지', a.view === 'loading' && a.load === '불러오는 중…' && b.view === 'loading' && /조금 오래 걸리고 있어요/.test(b.load) && c.my && /새 내용/.test(c.name), JSON.stringify([a, b, c]));
    await setQ(pg, [{ hold: 3000, json: NEW }]); await pg.evaluate(() => loadMyState()); await adv(pg, 1000); const d = await look(pg); await adv(pg, 2500);
    ok('first — 다음 불러오기는 다시 «불러오는 중…»부터(지난번 말이 남지 않는다) · 오류 0', d.view === 'loading' && d.load === '불러오는 중…' && !errs.length, JSON.stringify([d, errs[0]])); await ctx.close(); },
  async reject() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ hold: 300, json: { ok: false, ecode: 'L4', error: '불러오지 못했어요. 다시 눌러 주세요. (코드 L4)' } }]); await reboot(pg);
    await adv(pg, 2500); const a = await look(pg);
    ok('reject — 서버 거절(L4)은 다시 묻지 않고 곧장 막대 «(코드 L4)» · 요청 1번', /코드 L4/.test(a.bar) && a.calls === 1 && a.my && !errs.length, JSON.stringify([a, errs[0]])); await ctx.close(); },
  async expired() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ hold: 300, json: { ok: false, reason: 'expired', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요.' } }]); await reboot(pg);
    await adv(pg, 2500); const a = await look(pg);
    ok('expired — 로그인 풀림은 다시 묻지 않고 로그인 화면 · 요청 1번', a.login && a.calls === 1 && !errs.length, JSON.stringify([a, errs[0]])); await ctx.close(); },
  async logout() { const { ctx, pg, errs } = await open({ cached: OLD }); await setQ(pg, [{ abort: 1 }, { hold: 300, json: NEW }]); await reboot(pg);
    await adv(pg, 400); await pg.evaluate(() => { clearToken(); show('loginView'); }); await adv(pg, 3000); const a = await look(pg);
    ok('logout — 끊김 뒤 다시 묻기 전에 로그아웃 → 두 번째 요청 없음 · 로그인 화면 그대로 · 막대 없음', a.calls === 1 && a.login && !a.my && !a.bar && !errs.length, JSON.stringify([a, errs[0]])); await ctx.close(); },
};
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
for (const [k, fn] of Object.entries(SC)) { if (ONLY.length && !ONLY.includes(k)) continue; try { await fn(); } catch (e) { ok(k + ' — 재다가 멈췄다', false, String(e && e.message || e).split('\n')[0]); } }
await br.close(); srv.close();
console.log(fail ? `\n${fail}건 실패` : '\n모두 통과');
process.exit(fail ? 1 : 0);
