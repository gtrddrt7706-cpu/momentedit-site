#!/usr/bin/env node
/* ★★[DRESS_SCROLL_LOCK 2026-10-31 사장님 제보 · 코워크] 드레스 창(상담 뒤 아이콘 · 상담 전 스티커)을 끝까지 내린 뒤 더 내려도 뒤 마이페이지가 움직이지 않는다.
 *
 *   크롬 PC 1280(마우스 휠) · 폰 390(터치 끌기) × 상담 뒤 · 상담 전
 *   ① 창 안을 끝까지 내리고 더 내린다 → 뒤 페이지의 보이는 자리(카드 윗선) · scrollY 변화 0
 *   ② 막(창 바깥 어두운 곳) 위에서 휠 · 끌기 → 변화 0
 *   ③ 창이 떠 있는 동안 마이페이지가 화면을 다시 그려도(show) 잠금이 풀리지 않는다
 *   ④ 닫으면 scrollY 가 연 때 그대로
 *   종료: 0 통과 · 1 틀림 · 2 재지 못했다(브라우저 없음)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const SIZES = [[1280, 900, 'wheel'], [390, 844, 'touch']];
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.setHeader('cache-control', 'no-store'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('━━ dress-scroll-lock — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다'); srv.close(); process.exit(2); }

let bad = 0; const rows = [];
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const LIST = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const STATE = (after) => JSON.stringify({ ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-TABS', stage: after ? '상담완료' : '신청접수', stageIndex: after ? 3 : 0, stageList: LIST, nextAction: '', contract: null, payment: null, result: null, isException: false, production: null,
  consult: after ? { status: '상담완료', date: '2026년 10월 20일 (화)', time: '14:00', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '2026-10-20', saved: null } } : { status: '신청접수', scheduleUrl: 'x', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null } } });
const ENTRY = (after) => after ? '#mp_dressFab' : '#mp_consult .dst';
const ANS = { none: null, part: { len: 'ankle', fit: '', pref: [] }, full: { len: 'ankle', fit: 'waist', pref: ['arms'] } };

async function page(W, H, after, opts = {}) {
  const { page: P, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H }, gasBody: STATE(after) });
  if (eng.kind === 'puppeteer' && P.setViewport) await P.setViewport({ width: W, height: H });   // [DRESS_OPS_VIEWPORT] 와 같다
  const init = "if(location.pathname==='/dress.html'){ window.__qObs=1; new MutationObserver(function(){ if(document.querySelector('.pk-q,.pk-opt,.pk-mine,.wz-steps')) window.__qFlash=1; }).observe(document,{subtree:true,childList:true}); } try{ localStorage.setItem('me_token','TOK'); " + (opts.tipSeen === false ? '' : "localStorage.setItem('me_drfabtip_v1','o'); localStorage.setItem('me_ledtip_v1','o'); ") + (opts.ans ? "localStorage.setItem('me_dress_ans:ME-TABS', " + JSON.stringify(JSON.stringify(opts.ans)) + '); ' : "localStorage.removeItem('me_dress_ans:ME-TABS'); ") + '}catch(e){}';
  await (P.addInitScript ? P.addInitScript(init) : P.evaluateOnNewDocument(init));
  await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
  const vp = await P.evaluate(() => [innerWidth, innerHeight]);
  if (vp[0] !== W || vp[1] !== H) throw new Error(`창 크기 ${vp.join('×')} ≠ ${W}×${H}`);
  await P.waitForSelector(ENTRY(after), { timeout: 15000, state: 'visible', visible: true });
  return { P, errors };
}
const open = async (P, after) => { await P.click(ENTRY(after)); const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('#pkMain > *', { timeout: 15000, state: 'attached' }); await wait(500); return fr; };
const closeX = async (P, fr) => { await fr.click('#pkExit'); await wait(500); };

async function gesture(P, fr, kind, x, y, dy) {
  if (kind === 'wheel') { await P.mouse.move(x, y); for (let i = 0; i < 4; i++) { await P.mouse.wheel(0, dy / 4); await wait(60); } return; }
  const cdp = P.context ? await P.context().newCDPSession(P) : await P.target().createCDPSession();
  await cdp.send('Input.synthesizeScrollGesture', { x: Math.round(x), y: Math.round(y), yDistance: -dy, gestureSourceType: 'touch', speed: 1600, repeatCount: 0 });
  await cdp.detach().catch(() => {});
}
const backPos = (P) => P.evaluate(() => { const el = document.getElementById('__tall'); return { y: Math.round(window.scrollY || 0), top: Math.round(el.getBoundingClientRect().top * 10) / 10, se: Math.round(document.scrollingElement.scrollTop) }; });

try {
  for (const [W, H, kind] of SIZES) for (const after of [true, false]) {
    const tag = `${W}×${H} ${kind} ${after ? '상담 뒤' : '상담 전'}`;
    try {
      const { P, errors } = await page(W, H, after, { ans: ANS.full });
      if (eng.kind === 'puppeteer' && kind === 'touch') { rows.push(`${tag} 터치는 playwright 에서만`); await P.close(); continue; }
      await P.evaluate(() => { const d = document.createElement('div'); d.id = '__tall'; d.style.height = '3000px'; document.body.appendChild(d); window.scrollTo(0, 260); }); await wait(250);   // 뒤 페이지가 짧아도 움직일 수 있게 길게(움직이면 보이게)
      const y0 = await P.evaluate(() => Math.round(window.scrollY));
      if (y0 < 200) no(`${tag} 뒤 페이지를 내려 두지 못했다(scrollY ${y0}) — 재는 길이 틀렸다`);
      const fr = await open(P, after);
      const yL = await P.evaluate(() => _mpLockY);   // 잠금이 기억한 «연 때 자리»(단추를 누르며 몇 px 옮겨질 수 있다)
      const b0 = await backPos(P);
      const card = await P.evaluate(() => { const r = document.querySelector('.dr-pop-card').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
      const cx = card[0] + card[2] / 2, cy = card[1] + card[3] * 0.6;
      /* ① 창 안 — 끝까지 내리고 더 */
      let inEnd = -1;
      for (let i = 0; i < 30 && Math.abs(inEnd) > 2; i++) { await gesture(P, fr, kind, cx, cy, 1400); await wait(250); inEnd = await fr.evaluate(() => Math.round(window.pageYOffset + innerHeight - document.documentElement.scrollHeight)); }
      for (let i = 0; i < 4; i++) await gesture(P, fr, kind, cx, cy, 1400);
      await wait(400);
      const b1 = await backPos(P);
      if (Math.abs(inEnd) > 2) no(`${tag} 창 안이 끝까지 안 내려갔다(남은 ${-inEnd}px) — 재는 길이 틀렸다`);
      if (b1.top !== b0.top || b1.y !== b0.y || b1.se !== b0.se) no(`${tag} 창 끝에서 더 내리니 뒤 페이지가 움직였다 ${JSON.stringify(b0)} → ${JSON.stringify(b1)} [DRESS_SCROLL_LOCK]`);
      /* ② 막 위 */
      const mx = kind === 'wheel' ? Math.max(8, card[0] / 2) : W / 2, my = kind === 'wheel' ? H / 2 : Math.max(8, card[1] / 2);
      for (let i = 0; i < 3; i++) await gesture(P, fr, kind, mx, my, 900);
      await wait(400);
      const b2 = await backPos(P);
      if (b2.top !== b0.top || b2.y !== b0.y || b2.se !== b0.se) no(`${tag} 막 위에서 내리니 뒤 페이지가 움직였다 ${JSON.stringify(b0)} → ${JSON.stringify(b2)} [DRESS_SCROLL_LOCK]`);
      /* ③ 창이 떠 있는 동안 화면을 다시 그려도 잠금 그대로 */
      await P.evaluate(() => { try { show('mypageView'); } catch (e) {} }); await wait(300);
      const lk = await P.evaluate(() => [document.body.style.position, document.body.style.overflow].join('/'));
      if (lk !== 'fixed/hidden') no(`${tag} 창이 떠 있는데 다시 그리니 잠금이 풀렸다 ${lk} [DRESS_LOCK_HOLD]`);
      for (let i = 0; i < 3; i++) await gesture(P, fr, kind, mx, my, 900);
      await wait(400);
      const b3 = await backPos(P);
      if (b3.top !== b0.top) no(`${tag} 다시 그린 뒤 막 위에서 내리니 뒤가 움직였다 ${b0.top} → ${b3.top} [DRESS_LOCK_HOLD]`);
      /* ④ 닫으면 원래 자리 */
      await fr.click('#pkExit'); await wait(700);
      const gone = await P.evaluate(() => !document.getElementById('mp_drViewer'));
      if (!gone) { const asked = await P.evaluate(() => !!document.querySelector('.mp-modal.open')); if (asked) { await P.evaluate(() => { const b = [...document.querySelectorAll('.mp-modal.open button')].find((x) => /그냥 나가기/.test(x.textContent)); if (b) b.click(); }); await wait(700); } }
      const y4 = await P.evaluate(() => Math.round(window.scrollY));
      if (Math.abs(y4 - yL) > 1 || Math.abs(yL - y0) > 40) no(`${tag} 닫은 뒤 scrollY ${y4} ≠ 연 때 ${yL}(열기 전 ${y0}) [DRESS_SCROLL_LOCK]`);
      rows.push(`${tag} 창 끝 남은 ${-inEnd} · 뒤 윗선 ${b0.top} → 창 안 ${b1.top} · 막 ${b2.top} · 다시 그림 ${b3.top}(${lk}) · 닫은 뒤 scrollY ${yL} → ${y4}`);
      if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
      await P.close();
    } catch (e) { no(`${tag} 재다가 멈췄다 — ${String(e && e.message || e).split('\n')[0]}`); }
  }
} finally { await eng.close(); srv.close(); }
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-scroll-lock — 실패 ${bad}건 [DRESS_SCROLL_LOCK]`); process.exit(1); }
console.log('━━ dress-scroll-lock — 통과 · PC 휠 · 폰 터치 × 상담 뒤 · 전 — 창 끝에서 더 내려도 · 막 위에서도 · 다시 그려도 뒤 페이지 0 · 닫으면 원래 자리 [DRESS_SCROLL_LOCK · DRESS_LOCK_HOLD]');
