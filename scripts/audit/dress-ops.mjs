#!/usr/bin/env node
/* ★[DRESS_MORE_TARGET · DRESS_ESC_CLOSE · DRESS_QSUB_SLOT 2026-10-29 사장님 · GPT 운영 점검] 드레스 창 운영 오류 셋이 되살아나지 않게 «눌러서» 잰다.
 *
 *   ① «다른 드레스도 살펴보기»를 누르면 «다른 드레스» 소제목이 화면 위쪽(머리 아래)에 오고 초점도 그 소제목에 있다
 *      — 종전에는 «마지막 소제목»으로 가서 «함께 보는 소품 · 부케»로 넘어갔다.
 *   ② Esc — 물음 · 결과 화면에서 누르면 창이 닫히고 초점은 연 단추(스티커 · 아이콘)로 돌아온다 · 자세히에서는 목록으로(종전 그대로).
 *   ③ 물음 1 · 2 · 3 의 첫 보기 위 끝이 1px 안에서 같다 — 물음 3 에만 보조문이 있어 약 28px 아래였다.
 *
 *   크기: 360×780 · 390×844 · 768×1024 · 1280×900 · 상담 전(스티커) · 상담 뒤(아이콘 · ctx=after) 둘 다
 *   종료: 0 통과 · 1 틀림 · 2 재지 못했다(브라우저 없음 — 화면 결함이 아니다)
 *   캡처: DRESS_OPS_SHOTS=<폴더> 를 주면 «다른 드레스» 누른 뒤 · 물음 1/2/3 · Esc 전후를 찍는다.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const SIZES = [[360, 780], [390, 844], [768, 1024], [1280, 900]];
const SHOTS = process.env.DRESS_OPS_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });

const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]);
  const f = path.join(ROOT, u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  r.setHeader('cache-control', 'no-store');
  r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('━━ dress-ops — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다'); srv.close(); process.exit(2); }

let bad = 0;
const rows = [];
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const DR = { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null };
try {
  for (const [W, H] of SIZES) for (const after of [false, true]) {
    const tag = `${W}×${H} ${after ? '상담 뒤' : '상담 전'}`, nm = `${W}-${after ? 'after' : 'pre'}`;
    const { page: P, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    /* 연 단추 자리 — 로그인 없이 여는 길이라 진입 단추를 시험용으로 둔다(닫힌 뒤 초점이 돌아올 곳) */
    await P.evaluate((a) => {
      const b = document.createElement('button'); b.type = 'button'; b.textContent = '진입'; b.style.cssText = 'position:fixed;left:-9999px;top:0';   // 화면 밖(캡처에 안 보이게) · 초점은 받는다
      if (a) { b.id = 'mp_dressFab'; document.body.appendChild(b); } else { const c = document.createElement('div'); c.id = 'mp_consult'; b.className = 'dst'; c.appendChild(b); document.body.appendChild(c); }
      b.focus();
    }, after);
    const open = async () => { await P.evaluate(([dr, a]) => openDressPicker(dr, { after: a }), [DR, after]); const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('.pk-q', { timeout: 15000 }); await P.waitForTimeout(400); return fr; };
    let fr = await open();
    /* ③ 세 물음 첫 보기 위 끝 */
    const tops = [];
    for (let i = 0; i < 3; i++) {
      tops.push(await fr.evaluate(() => document.querySelector('.pk-opt').getBoundingClientRect().top));
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/q${i + 1}-${nm}.png` });
      await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await P.waitForTimeout(350);
    }
    const spread = Math.max(...tops) - Math.min(...tops);
    rows.push(`${tag} 첫 보기 위 끝 ${tops.map((x) => x.toFixed(1)).join(' · ')}`);
    if (spread > 1) no(`${tag} 물음마다 첫 보기 자리가 다르다 ${tops.map((x) => x.toFixed(1)).join(' · ')} [DRESS_QSUB_SLOT]`);
    /* ① 다른 드레스 */
    await fr.waitForSelector('.pk-main [data-act="more"]', { timeout: 8000 });
    await fr.evaluate(() => document.querySelector('.pk-main [data-act="more"]').click()); await P.waitForTimeout(1100);
    const m = await fr.evaluate(() => { const a = document.activeElement, h = document.getElementById('pkMoreH'), hd = document.querySelector('.pk-head'); const ht = h ? h.getBoundingClientRect().top : null, lim = (hd ? hd.getBoundingClientRect().bottom : 0); return { focus: a ? (a.id || a.textContent.trim().slice(0, 20)) : '', ht: ht == null ? null : Math.round(ht), lim: Math.round(lim), vh: innerHeight }; });
    rows.push(`${tag} 다른 드레스 → 초점 ${m.focus} · 소제목 위 끝 ${m.ht} (머리 아래 ${m.lim})`);
    if (m.focus !== 'pkMoreH') no(`${tag} «다른 드레스도 살펴보기» 뒤 초점이 «다른 드레스» 소제목이 아니다(${m.focus}) [DRESS_MORE_TARGET]`);
    if (m.ht == null || m.ht < m.lim - 1 || m.ht > m.lim + 60) no(`${tag} «다른 드레스» 소제목이 머리 바로 아래가 아니다(위 끝 ${m.ht} · 머리 아래 ${m.lim}) [DRESS_MORE_TARGET]`);
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/more-${nm}.png` });
    /* ② Esc — 결과에서 닫힘 · 초점 복귀 */
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/esc-before-${nm}.png` });
    await fr.focus('#pkMoreH').catch(() => {}); await P.keyboard.press('Escape'); await P.waitForTimeout(700);
    const e1 = await P.evaluate((a) => ({ open: !!document.getElementById('mp_drViewer'), focus: document.activeElement === (a ? document.getElementById('mp_dressFab') : document.querySelector('#mp_consult .dst')) }), after);
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/esc-after-${nm}.png` });
    rows.push(`${tag} 결과 Esc → 창 ${e1.open ? '남음' : '닫힘'} · 초점 ${e1.focus ? '연 단추' : '다른 곳'}`);
    if (e1.open || !e1.focus) no(`${tag} 결과에서 Esc 가 창을 닫고 연 단추로 초점을 돌려주지 않는다 [DRESS_ESC_CLOSE]`);
    /* ② Esc — 물음에서 닫힘 · 자세히는 목록으로 */
    fr = await open(); await fr.focus('.pk-opt'); await P.keyboard.press('Escape'); await P.waitForTimeout(700);
    const e2 = await P.evaluate(() => !!document.getElementById('mp_drViewer'));
    if (e2) no(`${tag} 물음에서 Esc 가 창을 닫지 않는다 [DRESS_ESC_CLOSE]`);
    fr = await open(); await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await P.waitForTimeout(500);
    await fr.evaluate(() => document.querySelector('.pk-main [data-open]').click()); await P.waitForTimeout(500);
    await fr.focus('.pk-back'); await P.keyboard.press('Escape'); await P.waitForTimeout(500);
    const e3 = await P.evaluate(() => !!document.getElementById('mp_drViewer')), v3 = e3 ? await fr.evaluate(() => !!document.querySelector('.pk-mine') && !document.querySelector('.pk-back')) : false;
    rows.push(`${tag} 물음 Esc → ${e2 ? '남음' : '닫힘'} · 자세히 Esc → ${v3 ? '목록' : '?'}`);
    if (!e3 || !v3) no(`${tag} 자세히에서 Esc 가 목록으로 가지 않는다 [DRESS_ESC_CLOSE · DRESS_BACK_STEP]`);
    if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
    await P.close();
  }
} finally {
  await eng.close();
  srv.close();
}
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-ops — 실패 ${bad}건 [DRESS_MORE_TARGET · DRESS_ESC_CLOSE · DRESS_QSUB_SLOT]`); process.exit(1); }
console.log('━━ dress-ops — 통과 · 네 크기 × 상담 전 · 뒤 — «다른 드레스» 소제목으로 이동 · 초점 · 물음 · 결과 Esc 닫힘(초점은 연 단추) · 자세히 Esc 목록 · 세 물음 첫 보기 1px 안 [DRESS_MORE_TARGET · DRESS_ESC_CLOSE · DRESS_QSUB_SLOT]');
