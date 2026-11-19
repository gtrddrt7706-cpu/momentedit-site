// 임시(커밋 안 함) — NIGHT20 R3X2 #17: 마이페이지 상영 영상 안쪽 화면을 #20 이 안 본 폭으로 찍고 잰다
import path from 'node:path'; import { spawn } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const { chromium } = require('playwright');
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const OUT = '/home/claude/n20/x2';
const { openWorld } = await import(path.join(ROOT, 'scripts/audit/_gasworld.mjs'));
const { G, world } = openWorld(); G.jsonOut = (o) => ({ __out: o });
const BASE = { 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST', 동의기록: '{}', 계약상태: '서명완료', 계약서명일시: '2026-10-14 10:00', 계약총액: 3300000, 현재단계: '제작중', 입금상태: '확인', 중도금상태: '확인' };
const plus = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const today = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10), WED = plus(today, 40);
const ritOf = () => ({ _v: 3, summary: { course: '담백', count: 7, min: '약 21분', flow: [] }, S: { course: 'open', on: { prevideo: 1, vow: 1, midvid: 1, song: 1 }, midLen: '4' } });
const CASES = {
  fresh: { pv: { st: '' }, mv: { st: '' } },
  issued: { pv: { st: '', way: 'fm', cpn: { st: 'issued', code: 'FMK-7Q2X-9K4D-PLMN' } }, mv: { st: '', way: 'fm', cpn: { st: 'issued', code: 'FMK-AAAA-BBBB-CCCC' } } },
  req: { pv: { st: '', way: 'fm', cpn: { st: 'req' } }, mv: { st: '', way: 'fm', cpn: { st: 'req' } } },
  off: { pv: { st: 'off' }, mv: { st: '' } },
};
let CUR;
function setWorld() { world(Object.assign({}, BASE, { 예식일: WED }), { 상태: '확정', 입금확인: '확인', 선택날짜: WED, 선택시간: '14:00', 토큰: 'BT1' });
  const ref = G.findCustomerByCode('ME-TEST'); G.resolveSession = () => ({ ok: true, row: ref });
  const d = G.handleGetMyState({ token: 't' }); G.handleSaveProductionTrack({ token: 't', track: 'ritual', draft: ritOf(), done: true, rev: (d.production.trackRevs || {}).ritual || d.production.rev }); }
function patch(out, c) { const p = out && out.production; if (!p) return out; const due = plus(WED, -7);
  p.prevideo = Object.assign({ up: true, kind: 'pre', st: '', d: null, consent: true, conf: null, due, wed: WED }, c.pv);
  p.midvideo = Object.assign({ up: true, kind: 'mid', st: '', d: null, consent: true, conf: null, due, wed: WED, on: true, len: 4 }, c.mv); return out; }
const PORT = 8600 + Math.floor(Math.random() * 90);
const srv = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', ROOT], { stdio: 'ignore' }); await new Promise((r) => setTimeout(r, 1200));
const b = await chromium.launch({ executablePath: '/usr/bin/google-chrome', args: ['--no-sandbox'] });
const SIZES = (process.env.SIZES || '320x700,360x780,768x1024,1024x768,844x390').split(',');
const res = [];
const meas = (page, tag) => page.evaluate((tag) => {
  const c = document.getElementById('mp_pvcInner'); const iw = innerWidth, sw = document.documentElement.scrollWidth;
  const out = { tag, iw, sw, over: [], clip: [], small: [], txt: c ? c.innerText.replace(/\s+/g, ' ').slice(0, 900) : '(안쪽 화면 없음)' };
  if (c) { const cr = c.getBoundingClientRect();
    for (const e of c.querySelectorAll('*')) { const r = e.getBoundingClientRect(); if (!r.width || e.offsetParent === null) continue;
      if (r.right > iw + 1 || r.left < -1) out.over.push(e.tagName + '.' + (e.className + '').slice(0, 30) + ' ' + Math.round(r.left) + '~' + Math.round(r.right));
      if (e.children.length === 0 && e.textContent.trim() && (e.scrollWidth > e.clientWidth + 2) && getComputedStyle(e).overflow !== 'visible') out.clip.push((e.className + '').slice(0, 25) + ':' + e.textContent.trim().slice(0, 30));
      if (/^(BUTTON|A)$/.test(e.tagName) && (r.height < 40 || r.width < 40) && e.textContent.trim()) out.small.push(e.textContent.trim().slice(0, 18) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height)); } }
  const nowCells = c ? [...c.querySelectorAll('.pvc-now b')] : [];
  out.dueLines = nowCells.map((e) => { const r = e.getBoundingClientRect(), lh = parseFloat(getComputedStyle(e).lineHeight) || 20; return e.textContent.trim().slice(0, 22) + ' ' + Math.round(r.height / lh) + '줄'; });
  return out; }, tag);
try {
  for (const S of SIZES) { const [W, H] = S.split('x').map(Number);
    for (const [name, c] of Object.entries(CASES)) { CUR = c; setWorld();
      for (const k of ['pre', 'mid']) {
        const ctx = await b.newContext({ viewport: { width: W, height: H }, locale: 'ko-KR', timezoneId: 'Asia/Seoul', hasTouch: W < 800, isMobile: W < 800 });
        const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(String(e.message || e))); page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errs.push(m.type() + ':' + m.text().slice(0, 120)); });
        await page.route('**/script.google.com/**', async (r) => { const body = r.request().postData() || '{}'; const out = G.doPost({ postData: { contents: body }, parameter: {} }); const o = patch(out.__out, CUR); if (o && o.pv && typeof o.pv === 'object') { const mid = /"kind"\s*:\s*"mid"|midvideo|Mid/.test(body); Object.assign(o.pv, mid ? CUR.mv : CUR.pv); } await r.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(o) }); });
        await page.route(/googleusercontent|tosspayments|naver|feelmaker|kakao|vimeo|youtube/, (r) => r.abort());
        await page.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; try { localStorage.setItem('me_token', 't'); localStorage.setItem('me_ledtip_v1', 'o'); localStorage.setItem('me_nudge_seen', '1'); } catch (e) {} });
        await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' });
        await page.waitForFunction(() => window._curView === 'mypageView', null, { timeout: 25000 }).catch(() => {}); await page.waitForTimeout(1000);
        const id = k === 'pre' ? 'mp_pvcStart' : 'mp_mvcStart';
        await page.evaluate((id) => { const f = document.getElementById('mp_vuFold'), h = document.getElementById('mp_vuOpen'); if (f && f.hidden && h) h.click(); const b = document.getElementById(id); if (b) b.click(); }, id); await page.waitForTimeout(800);
        const tag = `${S}_${name}_${k}`;
        await page.screenshot({ path: `${OUT}/${tag}_0.png` }); res.push(Object.assign(await meas(page, tag + '_0'), { errs: errs.slice() }));
        if (name === 'fresh') {   // 필메이커 카드 → 안내 화면
          const picked = await page.evaluate(() => { const b = document.querySelector('[data-pvcway="fm"]'); if (b) { b.click(); return true; } return false; }); await page.waitForTimeout(500);
          if (picked) { await page.screenshot({ path: `${OUT}/${tag}_1fm.png` }); res.push(Object.assign(await meas(page, tag + '_1fm'), { errs: errs.slice() }));
            const g = await page.evaluate(() => { const b = [...document.querySelectorAll('[data-pvcgo="feel"]')].find((x) => x.offsetParent !== null); if (b) { b.click(); return true; } return false; }); await page.waitForTimeout(600);
            if (g) { await page.screenshot({ path: `${OUT}/${tag}_2guide.png` }); res.push(Object.assign(await meas(page, tag + '_2guide'), { errs: errs.slice() })); } }
          // 키보드: Tab 15번 — 초점이 보이는지(outline 또는 box-shadow)
          const foc = []; for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); foc.push(await page.evaluate(() => { const e = document.activeElement; if (!e || e === document.body) return 'body'; const cs = getComputedStyle(e); const vis = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || (cs.boxShadow && cs.boxShadow !== 'none'); const inPvc = !!e.closest('#mp_pvcInner'); return (inPvc ? 'IN ' : 'OUT ') + e.tagName + ':' + (e.textContent || e.getAttribute('aria-label') || '').trim().slice(0, 14) + (vis ? '' : ' [초점안보임]'); })); }
          res.push({ tag: tag + '_tab', foc });
        }
        await ctx.close(); } } }
} finally { await b.close(); srv.kill(); }
console.log(JSON.stringify(res, null, 0));
