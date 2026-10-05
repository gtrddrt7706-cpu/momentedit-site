// [WED_DONE_CELEBRATE 2026-10-03 사장님] 예식을 마친 뒤 마이페이지를 처음 열 때 한 번 — 축하 그림(꽃잎 · 금빛 가루) + 축하 한 줄
//   node scripts/audit/wed-celebrate.mjs            # 390 · 1280
//   SHOTS=<폴더> node scripts/audit/wed-celebrate.mjs # 움직이는 중 몇 장을 그 폴더에 찍는다
// 보는 것
//   ① 예식완료 · 처음 열기 → 캔버스가 뜨고(꾸밈 · 누르기 통과) 약 5초 안에 지워진다([CELE_GRAND] 세 박자 · 2026-10-05) · 날짜 줄 아래 «두 분의 결혼을 진심으로 축하드려요»
//   ② 다시 열면(새로고침) 다시 안 뜬다 · 축하 한 줄은 그대로
//   ③ 그 앞 단계(제작중 · 예식 준비 다 마침 포함)에서는 안 뜬다 · 한 줄도 없다
//   ④ 처음 연 때가 결과물전달이어도 한 번 뜬다
//   ⑤ 움직임 줄이기면 안 뜬다(띄웠다고 적지도 않는다) · 스냅 상품 · 종료 고객은 안 뜬다
//   ⑥ 그림이 도는 동안에도 누르기가 된다(새로고침 단추)
// 종료 코드 0 통과 · 1 실패 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
const SHOTS = process.env.SHOTS || '';

const base = (o) => Object.assign({
  ok: true, name: '김희준 · 이미쿠', groom: '김희준', bride: '이미쿠', product: '시그니처',
  stage: '예식완료', stageList: ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'], stageIndex: 7, isException: false,
  nextAction: '결과물을 준비하고 있어요. 준비되면 안내드릴게요.', code: 'QQ63CW', kakao: '',
  consult: { date: '2026-06-20', time: '14:00' }, fitting: { status: '동의완료' }, contractInfo: null,
  contract: { signed: true, expired: false, link: 'https://example.com/c', fill: { weddingDate: '2026-09-26' } },
  payment: { confirmed: true, midConfirmed: true, balConfirmed: true, bundle: [] },
  midpayment: { confirmed: true, dday: -7, amount: 1320000 }, balance: { confirmed: true, dday: -7, amount: 1650000, extra: null },
  production: { base: { groomKo: '김희준', weddingDate: '2026-09-26', headcount: 24 }, tracks: { invitation: '완료', seat: '완료', dining: '완료', ritual: '완료', snap: '완료' } },
  invitation: { status: '' }, result: null, coupon: null, ledger: null, refund: null, change: null, hold: null, refundBank: null, payPolicy: { balanceDays: 9, midDays: 149 }, waiting: '',
}, o || {});

async function open(ctx, state) {
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  await pg.route('**', (rt) => { const u = rt.request().url();
    if (u.includes('script.google.com')) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {} return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(b.action === 'getMyState' ? state : b.action === 'autologin' ? { ok: true, token: 'SHOT' } : { ok: true }) }); }
    if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, contentType: 'text/plain', body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/mypage.html?token=SHOT`, { waitUntil: 'domcontentloaded' });
  return { pg, errs };
}
const seen = async (pg, ms) => { try { await pg.waitForSelector('canvas.mp-celebrate', { state: 'attached', timeout: ms }); return true; } catch { return false; } };
const cheer = (pg) => pg.evaluate(() => { const c = document.getElementById('mp_cheer'); return c && c.style.display !== 'none' && getComputedStyle(c).visibility !== 'hidden' ? c.textContent : ''; });

for (const w of [390, 1280]) {
  /* ① · ⑥ · ② */
  { const ctx = await br.newContext({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, hasTouch: w < 1000 });
    const { pg, errs } = await open(ctx, base());
    const t0 = Date.now(), on = await seen(pg, 6000);
    const meta = on ? await pg.evaluate(() => { const c = document.querySelector('canvas.mp-celebrate'), cs = getComputedStyle(c), r = c.getBoundingClientRect(); const hit = document.elementFromPoint(r.width / 2, r.height / 2); return { pe: cs.pointerEvents, hidden: c.getAttribute('aria-hidden'), pos: cs.position, full: Math.round(r.width) === innerWidth, hitCanvas: hit === c }; }) : null;
    if (on && SHOTS) { fs.mkdirSync(SHOTS, { recursive: true }); for (const ms of [450, 900, 1400]) { await pg.waitForTimeout(ms === 450 ? 450 : 500); await pg.screenshot({ path: path.join(SHOTS, `cele-${w}-${ms}.png`) }); } }
    /* ⑥ 도는 동안 누르기 */
    let clicked = false;
    if (on && await pg.$('canvas.mp-celebrate')) { await pg.evaluate(() => { window.__clk = 0; const b = document.getElementById('mp_refresh'); if (b) b.addEventListener('click', () => { window.__clk++; }, { once: true }); }); const b = await pg.$('#mp_refresh'); if (b) { const r = await b.boundingBox(); if (r) { await pg.mouse.click(r.x + r.width / 2, r.y + r.height / 2); clicked = await pg.evaluate(() => window.__clk === 1); } } }
    let gone = false; try { await pg.waitForSelector('canvas.mp-celebrate', { state: 'detached', timeout: 6200 }); gone = true; } catch {}   /* [CELE_GRAND 2026-10-05] 세 박자 약 4.5초 + 여유 */
    const took = Date.now() - t0, line = await cheer(pg), flag = await pg.evaluate(() => localStorage.getItem('me_wedcele_QQ63CW'));
    ok(`① ${w} 예식완료 · 처음 열기 → 축하 그림 한 번(고정 · 화면 가득 · 누르기 통과 · aria-hidden) · 끝나면 지움 · 축하 한 줄은 피어나 남는다 [WED_DONE_CELEBRATE · CELE_STAY]`, on && meta && meta.pe === 'none' && meta.hidden === 'true' && meta.pos === 'fixed' && meta.full && !meta.hitCanvas && gone && line === '두 분의 결혼을 진심으로 축하드려요' && flag === 'o', JSON.stringify({ on, meta, gone, took, line, flag }));
    ok(`⑥ ${w} 그림이 도는 동안에도 누르기가 된다(새로고침 단추)`, clicked, JSON.stringify({ clicked }));
    await pg.reload({ waitUntil: 'domcontentloaded' }); const again = await seen(pg, 4500), line2 = await cheer(pg);
    ok(`② ${w} 다시 열면 다시 안 뜬다 · 축하 한 줄은 그대로 [CELE_STAY]`, !again && line2 === '두 분의 결혼을 진심으로 축하드려요', JSON.stringify({ again, line2 }));
    ok(`①② ${w} 화면 오류 없음`, errs.length === 0, errs.join(' | '));
    await ctx.close(); }
  /* ③ 그 앞 단계 — 예식 준비 다 마침이어도 */
  { const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    const { pg } = await open(ctx, base({ stage: '제작중', stageIndex: 6, nextAction: '예식날 정성껏 준비해서 뵐게요.', contract: { signed: true, expired: false, link: 'https://example.com/c', fill: { weddingDate: '2026-12-26' } }, production: { base: { groomKo: '김희준', weddingDate: '2026-12-26', headcount: 24 }, tracks: { invitation: '완료', seat: '완료', dining: '완료', ritual: '완료', snap: '완료' } } }));
    const on = await seen(pg, 4500), line = await cheer(pg);
    ok(`③ ${w} 제작중(예식 준비 다 마침)에서는 안 뜬다 · 축하 한 줄도 없다`, !on && line === '', JSON.stringify({ on, line }));
    await ctx.close(); }
  /* ④ 처음 연 때가 결과물전달 */
  { const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    const { pg } = await open(ctx, base({ stage: '결과물전달', stageIndex: 8, nextAction: '원본이 도착했어요.' }));
    const on = await seen(pg, 6000);
    ok(`④ ${w} 처음 연 때가 결과물전달이어도 한 번`, on, JSON.stringify({ on }));
    await ctx.close(); }
  /* ⑤ 움직임 줄이기 · 스냅 · 종료 */
  { const ctx = await br.newContext({ viewport: { width: w, height: 900 }, reducedMotion: 'reduce' });
    const { pg } = await open(ctx, base());
    const on = await seen(pg, 4500), flag = await pg.evaluate(() => localStorage.getItem('me_wedcele_QQ63CW'));
    const lineRM = await cheer(pg); const opRM = await pg.evaluate(() => { const c = document.getElementById('mp_cheer'); return c ? getComputedStyle(c).opacity : ''; });
    ok(`⑤ ${w} 움직임 줄이기면 안 뜬다 · 띄웠다고 적지도 않는다 · 축하 한 줄은 정지 화면으로 보인다 [CELE_STAY]`, !on && flag === null && lineRM === '두 분의 결혼을 진심으로 축하드려요' && opRM === '1', JSON.stringify({ on, flag, lineRM, opRM }));
    await ctx.close(); }
  for (const [lab, o] of [['스냅 상품 결과물전달', { product: '웨딩스냅', stage: '결과물전달' }], ['종료 고객', { isException: true }]]) {
    const ctx = await br.newContext({ viewport: { width: w, height: 900 } });
    const { pg } = await open(ctx, base(o)); const on = await seen(pg, 4500);
    ok(`⑤ ${w} ${lab} — 안 뜬다`, !on, JSON.stringify({ on }));
    await ctx.close(); }
}
await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
