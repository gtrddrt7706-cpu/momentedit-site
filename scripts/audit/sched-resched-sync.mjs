// ★[RESCHED_NOW_SYNC · HOLD_NOTE_ONCE · SUBMIT_ONCE · MY_SLOT_NOW · DONE_NAME_ESC · SCHED_LATE_LOCK 2026-10-09 고객 여정 A~Z 점검 2라운드 D2-6 ~ D2-9] 상담 일정(schedule.html).
//   ① 캐시(신청 · 미입금)로 먼저 그린 화면을 서버 답 전에 만졌어도, 서버가 «확정 · 예약금 받음»이면 그 블록만 맞춘다 — 입금자명을 다시 묻지 않고 신청이 한 번 간다
//   ② 임시 고정 안내는 boot 가 두 번 돌아도 한 줄
//   ③ 고정 바 «신청하기»를 80ms 간격으로 두 번 눌러도 신청은 한 번
//   ④ 지금 잡힌 내 시간은 «마감» 대신 «지금 시간» · ⑤ 완료 창 이름은 글자 그대로(태그로 읽지 않는다)
//   ⑥ 확정된 상담이 24시간 안이면 신청 단추 · 고정 바 대신 안내 + 카카오톡 · 신청이 가지 않는다
//   SRS_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다. 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.SRS_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT)) { r.writeHead(404); return r.end(); }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const pad = (n) => (n < 10 ? '0' : '') + n; const day = (k) => { const d = new Date(); d.setDate(d.getDate() + k); return d; };
const keyOf = (d) => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); const ymd = (d) => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
const TOKEN = 'tok_abcdefghij1234567890';
const BASE_S = { ok: true, avail: [3, 4, 5, 6, 7, 10, 11, 12].map((k) => keyOf(day(k))), full: {}, slotsWeekday: ['11:00', '14:00', '19:00'], slotsWeekend: ['11:00', '14:00', '16:00'], duration: 40,
  names: '김민수 · 정하윤', depositStr: '100,000', account: '하나 123-456789-01', holder: '모먼트에디트', kakao: 'https://pf.kakao.com/_CfxcxlX/chat' };
async function open({ server, cache, delay = 0, subDelay = 0, w = 390, mobile = false }) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, isMobile: mobile, hasTouch: mobile });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  await ctx.addInitScript(`try{localStorage.setItem('me_token','${TOKEN}');${cache ? `localStorage.setItem('me_sched_avail_v1:'+'${TOKEN}'.slice(-10), JSON.stringify({at:Date.now()-120000, data:${JSON.stringify(cache)}}));` : ''}}catch(e){}`);
  const subs = [], served = [];
  await ctx.route('**/*', async (rt) => { const u = rt.request().url();
    if (u.includes('script.google.com')) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      if (b.action === 'getAvailability') { if (delay) await wait(delay); served.push(Date.now()); return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(server) }); }
      if (b.action === 'submitSchedule') { subs.push(b); if (subDelay) await wait(subDelay); }
      return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify({ ok: true, enabled: false }) }); }
    if (u.startsWith(BASE)) return rt.continue();
    return rt.fulfill({ status: 200, body: '' }); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + '/schedule.html?me=1', { waitUntil: 'load' });
  return { ctx, page, errs, subs, served };
}
const pick = async (page, di, si) => { const d = await page.$$('#calGrid .day.avail'); await d[di].click(); await wait(250); const s = await page.$$('#slots .slot:not(.full)'); await s[si].click(); await wait(300); };
try {
  // ① 손댄 캐시 화면 + 서버 «확정 · 예약금 받음»
  { const cur = day(5);
    const o = await open({ cache: { ...BASE_S, currentDate: ymd(cur), currentTime: '11:00', currentStatus: 'picked', depositPaid: false }, server: { ...BASE_S, currentDate: ymd(cur), currentTime: '11:00', currentStatus: 'confirmed', depositPaid: true }, delay: 5000 });
    await o.page.waitForSelector('#calGrid .day.avail', { timeout: 8000 }).catch(() => {}); await wait(300);
    await pick(o.page, 1, 1); const early = !o.served.length;   // 서버 답보다 먼저 만졌다(이 시나리오의 전제)
    for (let i = 0; i < 80 && !o.served.length; i++) await wait(100);
    await wait(700);
    const st = await o.page.evaluate(() => ({ ki: (document.getElementById('kiNow') || {}).textContent || '', dep: !document.querySelector('#guide .deposit:not(#depPaid)').hidden, touched: !!window.__schedTouched }));
    await o.page.click('#submitBtn'); await wait(900);
    const after = await o.page.evaluate(() => ({ modal: document.getElementById('modal').classList.contains('show'), hint: (document.getElementById('depPayerHint') || {}).textContent || '' }));
    ok('① 손댄 캐시 화면도 서버의 «확정 · 예약금 받음»으로 맞춘다 — 확정된 시간 · 예약금 칸 걷힘 · 입금자명 없이 신청 한 번 [RESCHED_NOW_SYNC]', early && st.touched && /확정된 시간/.test(st.ki) && !st.dep && after.modal && o.subs.length === 1 && o.subs[0].payer === '', JSON.stringify({ early, st, after, subs: o.subs.map((x) => x.payer) }));
    ok('pageerror 0 (①)', !o.errs.length, (o.errs[0] || '').slice(0, 140)); await o.ctx.close(); }
  // ② 임시 고정 안내 한 줄
  { const cur = day(12), S = { ...BASE_S, currentDate: ymd(cur), currentTime: '14:00', currentStatus: 'confirmed', depositPaid: true, holdActive: true };
    const o = await open({ cache: S, server: { ...S, avail: S.avail.concat([keyOf(day(20))]) }, delay: 500 });
    await wait(1800);
    const n = await o.page.evaluate(() => [...document.querySelectorAll('div')].filter((d) => d.children.length === 0 && /임시 고정 중에는 상담일을/.test(d.textContent)).length);
    ok('② 임시 고정 안내는 boot 가 두 번 돌아도 한 줄 [HOLD_NOTE_ONCE]', n === 1, 'n=' + n);
    ok('pageerror 0 (②)', !o.errs.length, (o.errs[0] || '').slice(0, 140)); await o.ctx.close(); }
  // ③ 고정 바 두 번 누름(서버가 바로 답할 때 80ms · 0.8초 걸릴 때 250ms) · ⑤ 완료 창 이름
  for (const [gap, subDelay] of [[80, 0], [250, 800]]) {
    const o = await open({ server: { ...BASE_S, names: '<b>김</b> & 정' }, mobile: true, subDelay });
    await wait(800); await pick(o.page, 0, 0); await o.page.fill('#depPayer', '정하윤');
    await o.page.evaluate(() => scrollTo(0, 0)); await wait(400);
    const sb = await o.page.$('#stickyBtn'); const bx = await sb.boundingBox();
    if (bx) { await o.page.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); await wait(gap); await o.page.touchscreen.tap(bx.x + bx.width / 2, bx.y + bx.height / 2); }
    await wait(2200);
    ok(`③ 고정 바 «신청하기»를 ${gap}ms 간격으로 두 번 눌러도(서버 답 ${subDelay}ms) 신청은 한 번 [SUBMIT_ONCE]`, !!bx && o.subs.length === 1, 'bar=' + !!bx + ' submits=' + o.subs.length);
    if (!subDelay) { const mp = await o.page.evaluate(() => { const e = document.getElementById('modalPick'); return { b: e.querySelectorAll('b').length, t: e.textContent }; });
      ok('⑤ 완료 창 이름은 글자 그대로 — «<b>김</b> & 정»이 굵은 글씨(태그)로 읽히지 않는다 [DONE_NAME_ESC]', mp.b === 0 && /<b>김<\/b> & 정 님/.test(mp.t), JSON.stringify(mp)); }
    ok(`pageerror 0 (③ ${gap}ms)`, !o.errs.length, (o.errs[0] || '').slice(0, 140)); await o.ctx.close(); }
  // ④ 내 시간 «지금 시간»
  { const cur = day(5), k = keyOf(cur), S = { ...BASE_S, full: { [k]: ['14:00'] }, currentDate: ymd(cur), currentTime: '14:00', currentStatus: 'confirmed', depositPaid: true };
    const o = await open({ server: S }); await wait(800);
    await o.page.evaluate((k) => { const want = k.split('-').map(Number); for (const b of document.querySelectorAll('#calGrid .day.avail')) { if (+b.textContent.trim() === want[2]) { b.click(); return; } } }, k); await wait(300);
    const tags = await o.page.evaluate(() => [...document.querySelectorAll('#slots .slot')].map((s) => s.getAttribute('aria-label')));
    ok('④ 지금 잡힌 내 시간은 «마감» 대신 «지금 시간»(잠금은 그대로) [MY_SLOT_NOW]', tags.some((t) => /14:00 · 지금 시간/.test(t)) && !tags.some((t) => /14:00 · 마감/.test(t)), JSON.stringify(tags));
    ok('pageerror 0 (④)', !o.errs.length, (o.errs[0] || '').slice(0, 140)); await o.ctx.close(); }
  // ⑥ 24시간 안
  { const tm = new Date(Date.now() + 5 * 3600 * 1000), kst = new Date(tm.getTime() + 9 * 3600 * 1000);
    const S = { ...BASE_S, avail: [1, 2, 3, 4, 5, 6].map((k) => keyOf(day(k))), currentDate: kst.getUTCFullYear() + '-' + pad(kst.getUTCMonth() + 1) + '-' + pad(kst.getUTCDate()), currentTime: pad(kst.getUTCHours()) + ':00', currentStatus: 'confirmed', depositPaid: true };
    const o = await open({ server: S, mobile: true }); await wait(900);
    await pick(o.page, 0, 0); await wait(300);
    const st = await o.page.evaluate(() => { const b = document.getElementById('submitBtn'), sm = document.getElementById('summary');
      return { btnShown: getComputedStyle(b).display !== 'none' && b.getBoundingClientRect().height > 0, sum: sm.textContent, kakao: !!sm.querySelector('a[href*="kakao"]'), bar: document.body.classList.contains('sticky-on') }; });
    await o.page.evaluate(() => { try { document.getElementById('stickyBtn').click(); } catch (e) {} }); await wait(900);
    ok('⑥ 확정 + 24시간 안 — 신청 단추 · 고정 바 대신 «24시간 전부터는 변경이 어려워요» + 카카오톡 · 신청이 가지 않는다 [SCHED_LATE_LOCK]', !st.btnShown && /24시간 전/.test(st.sum) && st.kakao && !st.bar && o.subs.length === 0, JSON.stringify({ ...st, subs: o.subs.length }));
    ok('pageerror 0 (⑥)', !o.errs.length, (o.errs[0] || '').slice(0, 140)); await o.ctx.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSCHED RESCHED SYNC FAIL ${fail}` : '\nSCHED RESCHED SYNC OK'); process.exit(fail ? 1 : 0);
