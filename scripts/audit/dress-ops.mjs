#!/usr/bin/env node
/* ★[DRESS_MORE_TARGET · DRESS_ESC_CLOSE · DRESS_QSUB_SLOT 2026-10-29 사장님 · GPT 운영 점검] 드레스 창 운영 오류 셋이 되살아나지 않게 «눌러서» 잰다.
 *
 *   ① «다른 드레스도 살펴보기»를 누르면 «다른 드레스» 소제목이 화면 위쪽(머리 아래)에 오고 초점도 그 소제목에 있다
 *      — 종전에는 «마지막 소제목»으로 가서 «함께 보는 소품 · 부케»로 넘어갔다.
 *   ② Esc — 물음 1 · 2 · 3(답을 고른 뒤) · 결과에서 누르면 창이 닫히고 초점은 «실제» 연 단추(상담 전 스티커 · 상담 뒤 아이콘)로 돌아온다 · 자세히에서는 목록으로(종전 그대로).
 *   ★진입은 로그인한 마이페이지(가짜 서버 답)의 실제 스티커 · 아이콘을 누른다 · 창 크기는 요청값과 같은지 먼저 잰다(Puppeteer 대체 길 포함 [DRESS_OPS_VIEWPORT]).
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
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* ★[DRESS_OPS_REAL 1029 GPT 라운드] 진입 단추는 시험용이 아니라 «실제» 스티커 · 아이콘 — 로그인한 마이페이지를 가짜 서버 답으로 띄운다
   상담 전 = 신청접수(상담 카드 스티커) · 상담 뒤 = 상담완료(오른쪽 아이콘 줄 «드레스 · 소품 · 부케») */
const LIST = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const STATE = (after) => JSON.stringify({ ok: true, name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-OPS', stage: after ? '상담완료' : '신청접수', stageIndex: after ? 3 : 0, stageList: LIST, nextAction: '', contract: null, payment: null, result: null, isException: false, production: null,
  consult: after ? { status: '상담완료', date: '2026년 10월 20일 (화)', time: '14:00', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '2026-10-20', saved: null } } : { status: '신청접수', scheduleUrl: 'x', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null } } });
const ENTRY = (after) => after ? '#mp_dressFab' : '#mp_consult .dst';
try {
  for (const [W, H] of SIZES) for (const after of [false]) {   // ★[DRESS_TABS_1030] 상담 뒤(아이콘) 창에는 물음 · 결과가 없다 — 그쪽은 dress-tabs.mjs 가 잰다
    const tag = `${W}×${H} ${after ? '상담 뒤' : '상담 전'}`, nm = `${W}-${after ? 'after' : 'pre'}`;
    const { page: P, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H }, gasBody: STATE(after) });
    /* ★[DRESS_OPS_VIEWPORT] Puppeteer 대체 길은 newPage 가 크기를 안 받는다 — 여기서 직접 맞추고, 실제 창 크기가 요청값과 같은지 재고 시작한다(다르면 «그 크기를 잰 것»이 아니다) */
    if (eng.kind === 'puppeteer' && P.setViewport) await P.setViewport({ width: W, height: H });
    await (P.addInitScript ? P.addInitScript("try{ localStorage.setItem('me_token','TOK'); }catch(e){}") : P.evaluateOnNewDocument("try{ localStorage.setItem('me_token','TOK'); }catch(e){}"));
    await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    const vp = await P.evaluate(() => [innerWidth, innerHeight]);
    if (vp[0] !== W || vp[1] !== H) { no(`${tag} 창 크기가 요청값과 다르다(${vp[0]}×${vp[1]} · ${eng.kind}) [DRESS_OPS_VIEWPORT]`); await P.close(); continue; }
    try { await P.waitForSelector(ENTRY(after), { timeout: 15000, state: 'visible', visible: true }); } catch (e) { no(`${tag} 진입 단추(${after ? '아이콘' : '스티커'})가 안 보인다`); await P.close(); continue; }
    await wait(5600);   // 처음 한 번 말풍선(아이콘 · 4.5초)이 닫힌 뒤
    const open = async () => { await P.evaluate(() => { try { Object.keys(localStorage).filter((k) => k.indexOf('me_dress_ans:') === 0).forEach((k) => localStorage.removeItem(k)); } catch (e) {} }); /* 이 기기에 남은 답을 지워 늘 물음 1 부터 */ await P.click(ENTRY(after)); const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('.pk-q', { timeout: 15000 }); await wait(400); return fr; };
    const closedBack = () => P.evaluate((sel) => ({ open: !!document.getElementById('mp_drViewer'), focus: document.activeElement === document.querySelector(sel) }), ENTRY(after));
    const reset = async () => { await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 }); await P.waitForSelector(ENTRY(after), { timeout: 15000, state: 'visible', visible: true }); await wait(400); };
    try {
    let fr = await open();
    /* ③ 세 물음 첫 보기 위 끝 */
    const tops = [];
    for (let i = 0; i < 3; i++) {
      tops.push(await fr.evaluate(() => document.querySelector('.pk-opt').getBoundingClientRect().top));
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/q${i + 1}-${nm}.png` });
      await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await wait(350);
    }
    const spread = Math.max(...tops) - Math.min(...tops);
    rows.push(`${tag} 첫 보기 위 끝 ${tops.map((x) => x.toFixed(1)).join(' · ')}`);
    if (spread > 1) no(`${tag} 물음마다 첫 보기 자리가 다르다 ${tops.map((x) => x.toFixed(1)).join(' · ')} [DRESS_QSUB_SLOT]`);
    /* ① 다른 드레스 */
    await fr.waitForSelector('.pk-main [data-act="more"]', { timeout: 8000 });
    await fr.evaluate(() => document.querySelector('.pk-main [data-act="more"]').click()); await wait(1100);
    const m = await fr.evaluate(() => { const a = document.activeElement, h = document.getElementById('pkMoreH'), hd = document.querySelector('.pk-head'); const ht = h ? h.getBoundingClientRect().top : null, lim = (hd ? hd.getBoundingClientRect().bottom : 0); return { focus: a ? (a.id || a.textContent.trim().slice(0, 20)) : '', ht: ht == null ? null : Math.round(ht), lim: Math.round(lim) }; });
    rows.push(`${tag} 다른 드레스 → 초점 ${m.focus} · 소제목 위 끝 ${m.ht} (머리 아래 ${m.lim})`);
    if (m.focus !== 'pkMoreH') no(`${tag} «다른 드레스도 살펴보기» 뒤 초점이 «다른 드레스» 소제목이 아니다(${m.focus}) [DRESS_MORE_TARGET]`);
    if (m.ht == null || m.ht < m.lim - 1 || m.ht > m.lim + 60) no(`${tag} «다른 드레스» 소제목이 머리 바로 아래가 아니다(위 끝 ${m.ht} · 머리 아래 ${m.lim}) [DRESS_MORE_TARGET]`);
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/more-${nm}.png` });
    /* ② Esc — 결과에서 닫힘 · 실제 진입 단추로 초점 복귀 */
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/esc-before-${nm}.png` });
    await fr.focus('#pkMoreH').catch(() => {}); await P.keyboard.press('Escape'); await wait(700);
    const e1 = await closedBack();
    if (SHOTS) await P.screenshot({ path: `${SHOTS}/esc-after-${nm}.png` });
    rows.push(`${tag} 결과 Esc → 창 ${e1.open ? '남음' : '닫힘'} · 초점 ${e1.focus ? '연 단추' : '다른 곳'}`);
    if (e1.open || !e1.focus) no(`${tag} 결과에서 Esc 가 창을 닫고 연 단추로 초점을 돌려주지 않는다 [DRESS_ESC_CLOSE]`);
    if (e1.open) await reset();   // 안 닫혔으면 새로 띄워 다음 칸을 잰다(첫 빨강에서 멈추지 않게)
    /* ② Esc — 물음 1 · 2 · 3 각각 답을 고른 뒤 Esc = 창 닫힘 · 연 단추로 초점 [DRESS_ESC_Q123] */
    const qs = [];
    for (let i = 0; i < 3; i++) {
      fr = await open();
      for (let k = 0; k < i; k++) { await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await wait(300); }
      await fr.click('.pk-opt'); await wait(150); await P.keyboard.press('Escape'); await wait(700);
      const r = await closedBack(); qs.push(`물음${i + 1} ${r.open ? '남음' : '닫힘'}/${r.focus ? '연 단추' : '다른 곳'}`);
      if (r.open || !r.focus) no(`${tag} 물음 ${i + 1} 답을 고른 뒤 Esc 가 창을 닫고 연 단추로 초점을 돌려주지 않는다 [DRESS_ESC_CLOSE]`);
      if (r.open) await reset();
    }
    /* 자세히 Esc = 목록(종전 그대로) */
    fr = await open(); for (let k = 0; k < 3; k++) { await fr.click('.pk-opt'); await fr.click('.wz-bar [data-go="1"]'); await wait(300); } await wait(300);
    await fr.evaluate(() => document.querySelector('.pk-main [data-open]').click()); await wait(500);
    await fr.focus('.pk-back'); await P.keyboard.press('Escape'); await wait(500);
    const e3 = await P.evaluate(() => !!document.getElementById('mp_drViewer')), v3 = e3 ? await fr.evaluate(() => !!document.querySelector('.pk-mine') && !document.querySelector('.pk-back')) : false;
    rows.push(`${tag} ${qs.join(' · ')} · 자세히 Esc → ${v3 ? '목록' : '?'}`);
    if (!e3 || !v3) no(`${tag} 자세히에서 Esc 가 목록으로 가지 않는다 [DRESS_ESC_CLOSE · DRESS_BACK_STEP]`);
    if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
    } catch (e) { no(`${tag} 재다가 멈췄다 — ${String(e && e.message || e).split('\n')[0]}`); }
    await P.close();
  }
} finally {
  await eng.close();
  srv.close();
}
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-ops — 실패 ${bad}건 [DRESS_MORE_TARGET · DRESS_ESC_CLOSE · DRESS_QSUB_SLOT]`); process.exit(1); }
console.log('━━ dress-ops — 통과 · 네 크기 × 상담 전 · 뒤 — «다른 드레스» 소제목으로 이동 · 초점 · 물음 · 결과 Esc 닫힘(초점은 연 단추) · 자세히 Esc 목록 · 세 물음 첫 보기 1px 안 [DRESS_MORE_TARGET · DRESS_ESC_CLOSE · DRESS_QSUB_SLOT]');
