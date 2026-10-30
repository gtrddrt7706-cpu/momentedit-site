#!/usr/bin/env node
/* ★★[BGM_CONSOLE2_1023 2026-10-23 사장님 결정 «8구간» · BGM 섹션 라운드 2 PR 1 «음악이 사람보다 먼저 커지지 않게»]
   당일 콘솔(console.html)을 실제로 띄워 음악 크기 명령(duckTo)을 시각과 함께 잰다.
   ① [TOAST_GO] 축배 선창 클립이 끝나도 음악은 «위하여 대기»(−8) · 첫 GO 에 0.6초로 toastLevel · 순서는 그대로 · 다음 GO 에 마무리
   ② [HOLD_LINK] 짧은 이음 네 자리(라운드 1 표) — 사이에 −8 로 올라가지 않는다: 144 → 맞절(1.25초) · 141 → 38(1초) · 142 → 38(1초) · 137 → 90(3초)
   ③ [PRE_DUCK] 음악을 내려야 하는 큐는 음성보다 0.4초 먼저 내린다 — GO 로 여는 큐(음성은 0.4초 뒤) · 이어지는 큐(사이 끝 0.4초 전에 미리)
   ④ [HOLD_LIVE] 사람 구간은 GO 까지 그 크기 — 축사 무음 −90 · 편지 «음악과 함께» −20 이 짧은 안내가 끝났다고 풀리지 않는다
   ⑤ 쪽 오류 0
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · BC_CON = 돌연변이 확인용(그 판의 console.html 로 잰다) */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.BC_CON || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const SOF = (ex, more) => { const pl = /\+declare$/.test(ex); ex = ex.replace(/\+declare$/, ''); const S = O.applyExample({ course: 'open' }, ex); S.course = 'open'; if (pl) S.on = Object.assign({}, S.on, { declare: 1 });   /* [COURSE_ONE_PROMISE_1030] 기록이 선언을 안 담아 선언 → 부모님께 인사 짝을 담아서 잰다 */ return Object.assign(S, more || {}); };
async function open(S0) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S0)).toString('base64'))}`); await pg.waitForTimeout(600);
  await pg.click('#go'); await pg.waitForTimeout(300);
  /* duckTo · 음성 시작을 시각과 함께 적는다(전역 함수라 바꿔 끼우면 콘솔이 이것을 부른다) */
  await pg.evaluate(() => { window.__L = window.__bgmLog = [];
    document.getElementById('aNarr').addEventListener('play', () => window.__L.push({ t: Math.round(performance.now()), play: (document.getElementById('aNarr').getAttribute('src') || '').split('/').pop() })); });
  return { ctx, pg, errs };
}
const idx = (pg, slug, from) => pg.evaluate(([s, f]) => { const cs = window.__esd ? null : null; const R0 = window.__bgmR ? window.__bgmR() : null; return R0 ? R0.findIndex((c, i) => i >= (f || 0) && c.slug === s) : -1; }, [slug, from || 0]);
const st = (pg) => pg.evaluate(() => window.__bgmSt());
const waitSt = (pg, fn, ms) => pg.waitForFunction(fn, null, { timeout: ms || 60000 }).then(() => true, () => false);
try {
  const probe = await open(SOF('standard'));
  const hasHook = await probe.pg.evaluate(() => typeof window.__bgmSt === 'function' && typeof window.__bgmR === 'function' && !!window.__bgmGo);
  await probe.ctx.close();
  if (!hasHook) { ok('콘솔 점검 고리(__bgmSt · __bgmR)가 있다 [BGM_CONSOLE2_1023]', false, '없음 — 옛 판'); throw new Error('hook'); }

  /* ① 축배 */
  { const { ctx, pg, errs } = await open(SOF('record'));
    const ti = await idx(pg, 'toast-toast'); await pg.evaluate((i) => window.__bgmGo.fire(i), ti);
    const live = await waitSt(pg, () => window.__bgmSt().phase === 'live', 40000); await pg.waitForTimeout(1600);
    const A = await st(pg), L1 = await pg.evaluate(() => window.__L.slice());
    const rose = L1.filter((x) => x.db !== undefined && x.db > -8);
    ok('① 축배 선창 클립이 끝나도 «위하여 대기» — 음악 −8 그대로 · 0 dB 로 오르지 않는다 [TOAST_GO]', live && A.cur === ti && A.phase === 'live' && A.want === -8 && !rose.length && A.main.indexOf('축배 음악 올리기') === 0, { live, A, rose });
    await pg.evaluate(() => window.__bgmGo.tap()); await pg.waitForTimeout(300);
    const B = await st(pg), up = (await pg.evaluate(() => window.__L.slice())).filter((x) => x.db === 0);
    ok('① 첫 GO — 순서는 그대로(축배 사람 구간) · 0.6초에 toastLevel(0) 로 오른다', B.cur === ti && B.phase === 'live' && B.want === 0 && up.length === 1 && up[0].ms === 600, { B, up });
    await pg.waitForTimeout(1700); await pg.evaluate(() => window.__bgmGo.tap()); await pg.waitForTimeout(400);
    const C = await st(pg);
    ok('① 다음 GO — [END_FLOW_1030] 닫는 인사(187) 로 넘어간다(56 은 안 튼다 · 잔 내려놓기는 축배 사람 구간 안)', C.cur === ti + 1 && C.slug === 'narr-close-bow', C);
    ok('⑤ 쪽 오류 0(축배)', !errs.length, errs.slice(0, 2)); await ctx.close(); }

  /* ② 짧은 이음 네 자리 */
  for (const [ex, a, b, gap] of [['standard', 'narr-entry-arrive', 'narr-entry-bow', 1.25], ['standard', 'narr-tribute-name', 'tribute-in', 1], ['record+declare', 'narr-tribute-pair', 'tribute-in', 1], ['brief', 'narr-open', 'narr-prevideo-in', 3]]) {
    const { ctx, pg, errs } = await open(SOF(ex)); const ia = await idx(pg, a), ib = await idx(pg, b, ia);
    await pg.evaluate((i) => window.__bgmGo.fire(i), ia);
    const got = await waitSt(pg, () => window.__bgmSt().cur > 0 && window.__bgmSt().slug !== null, 1000);
    const reached = await pg.waitForFunction((j) => window.__bgmSt().cur === j, ib, { timeout: 60000 }).then(() => true, () => false);
    await pg.waitForTimeout(300);
    const L = await pg.evaluate(() => window.__L.slice()), ds = L.filter((x) => x.db !== undefined).map((x) => x.db);
    ok(`② ${ex} ${a} → ${b}(사이 ${gap}초) — 이음 사이에 −8 로 오르지 않는다 [HOLD_LINK]`, got && reached && ib === ia + 1 && !ds.includes(-8), { ia, ib, reached, ds });
    ok(`⑤ 쪽 오류 0(${a})`, !errs.length, errs.slice(0, 2)); await ctx.close(); }

  /* ③ 앞 낮춤 — GO 로 여는 큐: 기록 b8(−8) 은 이어지는 큐 · 정석 «감사 인사 이음말»(−8) → 11(−16, chain 2초) 은 사이 끝 0.4초 전에 미리 */
  { const { ctx, pg, errs } = await open(SOF('standard'));
    const ia = await idx(pg, 'bridge-b8-face-guests'), ib = await idx(pg, 'narr-welcome-in', ia);
    await pg.evaluate((i) => window.__bgmGo.fire(i), ia);
    await pg.waitForFunction((j) => window.__bgmSt().cur === j && window.__L.some((x) => x.play && /welcome-in/.test(x.play)), ib, { timeout: 60000 }).catch(() => {});
    const L = await pg.evaluate(() => window.__L.slice()); const dn = L.filter((x) => x.db === -16), pl = L.filter((x) => x.play && /welcome-in/.test(x.play));
    const lead = dn.length && pl.length ? pl[0].t - dn[0].t : null;
    ok('③ 이어지는 큐(이음말 −8 → 감사 인사 11 −16) — 사이 끝 0.4초 전에 미리 내려 음성은 그 뒤에 [PRE_DUCK]', lead != null && lead >= 330 && lead <= 900, { lead, dn: dn.slice(0, 2), pl: pl.slice(0, 1) });
    /* GO 로 여는 큐 — 서약 맺는 말 14(−16) 뒤 지금 −8 상태에서 디렉터가 «선언 여는 말»이 아니라 서약 여는 말 13(−16)을 GO */
    await pg.evaluate(() => { window.__L.length = 0; }); const iv = await idx(pg, 'narr-vow-in');
    await pg.evaluate(() => { window.__bgmGo.duck(-8, 10); }); await pg.waitForTimeout(200); await pg.evaluate(() => { window.__L.length = 0; });
    await pg.evaluate((i) => window.__bgmGo.fire(i), iv); await pg.waitForFunction(() => window.__L.some((x) => x.play), null, { timeout: 20000 }).catch(() => {});
    const L2 = await pg.evaluate(() => window.__L.slice()); const d2 = L2.find((x) => x.db === -16), p2 = L2.find((x) => x.play);
    const lead2 = d2 && p2 ? p2.t - d2.t : null;
    ok('③ GO 로 여는 큐(−8 상태 → 서약 13 −16) — GO 순간 내리고 음성은 0.4초 뒤 [PRE_DUCK]', lead2 != null && lead2 >= 350 && lead2 <= 900, { lead2, L2: L2.slice(0, 3) });
    ok('⑤ 쪽 오류 0(앞 낮춤)', !errs.length, errs.slice(0, 2)); await ctx.close(); }

  /* ④ 사람 구간 유지 — 축사(무음 −90) · 편지 «음악과 함께»(−20) */
  for (const [nm, S0, slug, want] of [['축사 무음', SOF('standard'), 'narr-free-in-speech', -90], ['편지 음악과 함께', SOF('standard', { on: Object.assign({}, SOF('standard').on, { letter: 1 }), bgm: { S6: { m: 'bed' } } }), null, -20]]) {
    const { ctx, pg, errs } = await open(S0);
    const i0 = slug ? await idx(pg, slug) : await pg.evaluate(() => window.__bgmR().findIndex((c) => c.k === 'letter' && c.live));
    await pg.evaluate((i) => window.__bgmGo.fire(i), i0);
    const live = await waitSt(pg, () => window.__bgmSt().phase === 'live', 40000); await pg.evaluate(() => { window.__L.length = 0; });
    await pg.waitForTimeout(2500);
    const A = await st(pg), L = await pg.evaluate(() => window.__L.slice());
    ok(`④ ${nm} — 사람 구간 동안 ${want} 그대로 · GO 전엔 풀리지 않는다 [HOLD_LIVE]`, i0 >= 0 && live && A.cur === i0 && A.want === want && !L.some((x) => x.db !== undefined && x.db !== want), { i0, live, A, L });
    ok(`⑤ 쪽 오류 0(${nm})`, !errs.length, errs.slice(0, 2)); await ctx.close(); }
} catch (e) { if (e.message !== 'hook') { console.log('못 쟀다 —', e.message); await br.close(); srv.close(); process.exit(2); } }
await br.close(); srv.close();
console.log(fail ? `bgm-console2: FAIL ${fail}` : 'bgm-console2: ok'); process.exit(fail ? 1 : 0);
