#!/usr/bin/env node
/* ★★[DRESS_TABS_1030 사장님 «추천대로» · 코워크 · GPT 2라운드] 드레스 창 — 상담 전(스티커) = 물음 필수 · 상담 뒤(오른쪽 아이콘) = 물음 없이 두 탭. «눌러서» 잰다.
 *
 *   ① 상담 전 · 이 기기의 답 없음 · 일부 = 물음 1 · 답 완료 = 결과(답 요약) — 탭 없음
 *   ② 상담 뒤 · 답 없음 · 일부 · 완료 = 모두 탭 화면(드레스 탭) — 물음 · 답 요약 · 진행 표시 없음 · 드레스 S01 → S06 · 늦게 온 데이터도 탭 그대로
 *   ③ 탭 — 높이 44 이상 · 두 칸 같은 너비 · 고른 탭 aria-selected · 방향키로 옮김 · 패널 하나만 보임 · 스크롤해도 머리 바로 아래 고정 · 탭을 바꿔도 창이 안 움직임
 *   ④ 드레스 끝 «소품 · 부케도 보기 ›» → 소품 탭 + 첫 제목에 초점
 *   ⑤ 소품 칸 → 크게 보기(같은 창 · 이름 · «‹ 소품·부케 목록») → Esc → 그 칸 · 그 자리 · 초점 / 드레스 자세히 → Esc · 뒤로가기 → 드레스 탭 그 자리 · 이전/다음 = S01 → S06 순서
 *   ⑥ 탭 화면에서 Esc · 뒤로가기 = 창 닫힘 · 초점은 아이콘
 *   ⑦ 기억 — 같은 페이지에서 닫았다 다시 열면 마지막 탭 + 탭마다 그 자리 · 자세히를 보다 닫으면 그 목록 · 새로고침이면 드레스 탭 맨 위
 *   ⑧ 아이콘 처음 한 번 말풍선 — 새 기기에서 뜨고 약 4.5초 뒤 사라지고 다시 들어오면 안 뜬다
 *
 *   크기: 360×780 · 390×844 · 768×1024 · 1280×900 · 진입은 «실제» 스티커 · 아이콘(로그인 마이페이지 · 가짜 서버 답)
 *   종료: 0 통과 · 1 틀림 · 2 재지 못했다(브라우저 없음 — 화면 결함이 아니다)
 *   캡처: DRESS_TABS_SHOTS=<폴더> — 드레스 탭 · 소품 탭 · 소품 크게 보기 · 드레스 자세히 · 닫았다 다시 열기 · 말풍선
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
const SHOTS = process.env.DRESS_TABS_SHOTS || '';
if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const u = decodeURIComponent(q.url.split('?')[0]); const f = path.join(ROOT, u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.setHeader('cache-control', 'no-store'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('━━ dress-tabs — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다'); srv.close(); process.exit(2); }

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
const view = (fr) => fr.evaluate(() => {
  const tl = document.getElementById('pkTabs'), vis = (e) => !!(e && e.offsetParent !== null && !e.hidden);
  return { q: !!document.querySelector('.pk-q'), mine: !!document.querySelector('.pk-mine'), steps: !!document.querySelector('.wz-steps'), tabs: vis(tl),
    tab: tl ? (document.querySelector('.pk-tab[aria-selected="true"]') || {}).id : '', panD: vis(document.getElementById('pkPanD')), panA: vis(document.getElementById('pkPanA')),
    ids: [...document.querySelectorAll('#pkPanD [data-open]')].map((e) => e.getAttribute('data-open')).join(','), y: Math.round(pageYOffset), focus: (document.activeElement && (document.activeElement.id || document.activeElement.getAttribute('data-open') || document.activeElement.getAttribute('data-acc'))) || '' };
});

try {
  for (const [W, H] of SIZES) {
    const tag = `${W}×${H}`;
    try {
      /* ① · ② 답 상태 셋 × 상담 전 · 뒤 */
      for (const after of [false, true]) for (const k of Object.keys(ANS)) {
        const { P, errors } = await page(W, H, after, { ans: ANS[k] });
        const fr = await open(P, after); const v = await view(fr);
        const who = `${tag} ${after ? '상담 뒤' : '상담 전'} 답 ${k}`;
        if (!after) {
          const wantQ = k !== 'full';
          if (wantQ ? !(v.q && v.steps) : !(v.mine && !v.q)) no(`${who} — ${wantQ ? '물음 1' : '결과(답 요약)'}이 아니다 ${JSON.stringify(v)} [DRESS_Q_FIRST]`);
          if (v.tabs) no(`${who} — 상담 전 창에 탭이 있다 [DRESS_TABS_1030]`);
        } else {
          const fl = await fr.evaluate(() => [!!window.__qObs, !!window.__qFlash]);
          if (!fl[0]) no(`${who} — 물음 깜빡임 감시가 창에 안 걸렸다(못 쟀다) [DRESS_AFTER_NOFLASH]`); else if (fl[1]) no(`${who} — 물음 · 결과가 잠깐이라도 그려졌다 [DRESS_AFTER_NOFLASH]`);
          if (v.q || v.mine || v.steps || !v.tabs || v.tab !== 'pkTabD' || !v.panD || v.panA) no(`${who} — 탭 화면(드레스)이 아니다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
          if (v.ids !== 'S01,S02,S03,S04,S05,S06') no(`${who} — 드레스 순서 ${v.ids} [DRESS_TABS_1030]`);
          /* 늦게 온 데이터 — 부모가 dressFill 을 다시 보내도 탭 그대로 */
          await P.evaluate(() => document.getElementById('mp_drFrame').contentWindow.postMessage({ type: 'momentedit:dressFill', key: 'ME-TABS', open: true, saved: null }, location.origin)); await wait(300);
          const v2 = await view(fr); if (v2.q || v2.mine || !v2.tabs) no(`${who} — 늦게 온 데이터로 물음 · 결과가 나왔다 [DRESS_TABS_1030]`);
        }
        rows.push(`${who} → ${after ? (v.tabs ? '탭 · ' + v.ids : '?') : (v.q ? '물음 1' : v.mine ? '결과' : '?')}`);
        if (errors.length) no(`${who} — 페이지 오류 ${errors[0]}`);
        await P.close();
      }
      /* ③ ~ ⑦ 상담 뒤 · 답 완료 기기 */
      const { P, errors } = await page(W, H, true, { ans: ANS.full });
      let fr = await open(P, true);
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/tab-dress-${W}.png` });
      const tb = await fr.evaluate(() => [...document.querySelectorAll('.pk-tab')].map((b) => { const r = b.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; }));
      if (tb.length !== 2 || tb.some((x) => x[1] < 44) || Math.abs(tb[0][0] - tb[1][0]) > 1) no(`${tag} 탭 크기 ${JSON.stringify(tb)} — 높이 44 이상 · 같은 너비 [DRESS_TABS_1030]`);
      /* [DRESS_TAB_A11Y] 활성 0 · 비활성 −1 · aria-controls ↔ 패널 aria-labelledby · 비활성 패널 hidden */
      const ax = await fr.evaluate(() => [...document.querySelectorAll('.pk-tab')].map((b) => { const pn = document.getElementById(b.getAttribute('aria-controls')); return [b.id, b.getAttribute('aria-selected'), b.tabIndex, pn ? pn.getAttribute('aria-labelledby') : '', pn ? pn.hidden : null, pn ? pn.getAttribute('role') : ''].join(':'); }).join(' | '));
      if (ax !== 'pkTabD:true:0:pkTabD:false:tabpanel | pkTabA:false:-1:pkTabA:true:tabpanel') no(`${tag} 탭 속성 ${ax} [DRESS_TAB_A11Y]`);
      /* [DRESS_AFTER_NOEND] 상담 뒤 목록 — «방문 전 준비» · 맨 아래 안내 없음 · 스타일 예시 표시 · 소품 안내는 그대로 */
      const ne = await fr.evaluate(() => ({ end: document.querySelectorAll('#pkMain .pk-end-dots, #pkMain .pk-prep-h').length, visit: /방문 때|방문 전 준비/.test(document.getElementById('pkMain').textContent), ex: document.querySelectorAll('#pkPanD .dr-kick, #pkPanD .dr-ex').length + '/' + document.querySelectorAll('#pkPanA .pk-accx').length, lead: !!document.querySelector('#pkPanA .pk-sub-s') }));
      if (ne.end || ne.visit || /^0\//.test(ne.ex) || /\/0$/.test(ne.ex) || !ne.lead) no(`${tag} 상담 뒤 목록 아래 안내 ${JSON.stringify(ne)} [DRESS_AFTER_NOEND]`);
      /* Tab = 활성 패널 첫 카드 · 초점 테 2px #7A5F37(밑줄과 따로) */
      await fr.focus('#pkTabD'); await P.keyboard.press('ArrowRight'); await wait(200); await P.keyboard.press('ArrowLeft'); await wait(200);
      const ring = await fr.evaluate(() => { const b = document.activeElement, c = getComputedStyle(b); return [b.id, c.outlineStyle, c.outlineWidth, c.outlineColor, c.outlineOffset].join(' '); });
      if (ring !== 'pkTabD solid 2px rgb(122, 95, 55) -5px') no(`${tag} 탭 초점 테 ${ring} [DRESS_TAB_RING]`);
      await P.keyboard.press('Tab'); await wait(150);
      const tb1 = await fr.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-open'));
      if (tb1 !== 'S01') no(`${tag} 드레스 탭에서 Tab → 첫 카드(S01)가 아니다 ${tb1} [DRESS_TAB_A11Y]`);
      await fr.focus('#pkTabD'); await P.keyboard.press('ArrowRight'); await wait(200); await P.keyboard.press('ArrowRight'); await wait(200);
      const wrap = await fr.evaluate(() => document.activeElement.id + ':' + document.activeElement.getAttribute('aria-selected'));
      if (wrap !== 'pkTabD:true') no(`${tag} 방향키 → 끝에서 처음으로 돌아 바로 선택되지 않는다 ${wrap} [DRESS_TAB_A11Y]`);
      await P.keyboard.press('ArrowLeft'); await wait(200); await P.keyboard.press('Tab'); await wait(150);
      const tb2 = await fr.evaluate(() => document.activeElement && document.activeElement.getAttribute('data-acc'));
      if (!tb2) no(`${tag} 소품 탭에서 Tab → 첫 칸이 아니다 [DRESS_TAB_A11Y]`);
      await fr.click('#pkTabD'); await wait(200); await fr.evaluate(() => window.scrollTo(0, 0)); await wait(150);
      const card0 = await P.evaluate(() => { const r = document.querySelector('.dr-pop-card').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)].join('/'); });
      /* 고정 — 아래로 내려도 탭이 머리 바로 아래 */
      await fr.evaluate(() => window.scrollTo(0, 500)); await wait(250);
      const st = await fr.evaluate(() => { const h = document.querySelector('.pk-head').getBoundingClientRect(), t = document.getElementById('pkTabs').getBoundingClientRect(); return [Math.round(h.bottom), Math.round(t.top)]; });
      if (Math.abs(st[0] - st[1]) > 1) no(`${tag} 스크롤 뒤 탭이 머리 바로 아래가 아니다 ${st.join(' → ')} [DRESS_TABS_1030]`);
      const yD = await fr.evaluate(() => Math.round(pageYOffset));
      /* [DRESS_TAB_SAME] 고른 탭을 다시 누름 · Home 은 자리 그대로(1px 이내) */
      await fr.click('#pkTabD'); await wait(200); const yS1 = await fr.evaluate(() => Math.round(pageYOffset));
      await fr.focus('#pkTabD'); await P.keyboard.press('Home'); await wait(200); const yS2 = await fr.evaluate(() => Math.round(pageYOffset));
      if (Math.abs(yS1 - yD) > 1 || Math.abs(yS2 - yD) > 1) no(`${tag} 고른 탭을 다시 고르니 자리가 튀었다 ${yD} → 누름 ${yS1} · Home ${yS2} [DRESS_TAB_SAME]`);
      /* 탭 바꾸기 — 누름 · 방향키 */
      await fr.click('#pkTabA'); await wait(300);
      let v = await view(fr);
      if (v.tab !== 'pkTabA' || !v.panA || v.panD) no(`${tag} 소품 탭으로 안 바뀐다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      const card1 = await P.evaluate(() => { const r = document.querySelector('.dr-pop-card').getBoundingClientRect(); return [Math.round(r.top), Math.round(r.height)].join('/'); });
      if (card0 !== card1) no(`${tag} 탭을 바꾸니 창이 움직였다 ${card0} → ${card1} [POPUP_FIXED_1024]`);
      if (SHOTS) { await fr.evaluate(() => window.scrollTo(0, 0)); await wait(200); await P.screenshot({ path: `${SHOTS}/tab-acc-${W}.png` }); }
      await fr.focus('#pkTabA'); await P.keyboard.press('ArrowLeft'); await wait(250);
      v = await view(fr); if (v.tab !== 'pkTabD' || v.focus !== 'pkTabD') no(`${tag} 방향키로 드레스 탭에 안 간다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      if (Math.abs(v.y - yD) > 2) no(`${tag} 드레스 탭으로 돌아오니 자리가 바뀌었다 ${yD} → ${v.y} [DRESS_TABS_1030]`);
      /* ④ 드레스 끝 «소품 · 부케도 보기 ›» */
      await fr.click('[data-act="toacc"]'); await wait(350);
      /* [DRESS_ACC_ALIGN] 같은 행 소품 사진 윗선 1px 이내 */
      const al = await fr.evaluate(() => { const rows = {}; document.querySelectorAll('#pkPanA button.pk-acci').forEach((b) => { const k = Math.round(b.getBoundingClientRect().top); (rows[k] = rows[k] || []).push(b.querySelector('.pk-accp').getBoundingClientRect().top); }); return Object.values(rows).map((r) => Math.round((Math.max(...r) - Math.min(...r)) * 10) / 10); });
      if (!al.length || al.some((d) => d > 1)) no(`${tag} 소품 같은 행 사진 윗선 차이 ${JSON.stringify(al)} [DRESS_ACC_ALIGN]`);
      v = await view(fr); if (v.tab !== 'pkTabA' || v.focus !== 'pkAccH') no(`${tag} «소품 · 부케도 보기» 뒤 소품 탭 · 첫 제목 초점이 아니다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      /* ⑤ 소품 크게 보기 → Esc */
      await fr.evaluate(() => window.scrollTo(0, 300)); await wait(200); const yA = await fr.evaluate(() => Math.round(pageYOffset));
      await fr.click('[data-acc="shoes"]'); await wait(400);
      const big = await fr.evaluate(() => ({ nm: (document.getElementById('dvName') || {}).textContent, back: (document.querySelector('.pk-back') || {}).textContent, ex: !!document.querySelector('.pk-accv .dr-ex'), tabs: !document.getElementById('pkTabs').hidden, fit: (() => { const ph = document.querySelector('.pk-accv .pk-accp'), im = ph && ph.querySelector('img'), m = document.getElementById('pkMain'); return ph && im ? [getComputedStyle(im).objectFit, ph.getBoundingClientRect().width <= 420.5, ph.getBoundingClientRect().width <= m.clientWidth + 0.5].join(':') : ''; })() }));
      if (big.fit !== 'contain:true:true') no(`${tag} 소품 크게 보기 사진 ${big.fit} — 최대 420 · 본문 폭 이하 · contain [DRESS_ACC_FIT]`);
      if (big.nm !== '새틴 슈즈' || !/소품·부케 목록/.test(big.back || '') || !big.ex || big.tabs) no(`${tag} 소품 크게 보기 ${JSON.stringify(big)} [DRESS_ACC_BIG]`);
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/acc-big-${W}.png` });
      await fr.focus('.pk-back'); await P.keyboard.press('Escape'); await wait(400);
      v = await view(fr); if (v.tab !== 'pkTabA' || v.focus !== 'shoes' || Math.abs(v.y - yA) > 2) no(`${tag} 크게 보기 Esc → 소품 목록 · 그 칸 · 그 자리가 아니다(${yA}) ${JSON.stringify(v)} [DRESS_ACC_BIG]`);
      /* 드레스 자세히 → Esc · 뒤로가기 */
      await fr.click('#pkTabD'); await wait(250); await fr.evaluate(() => window.scrollTo(0, 400)); await wait(200); const yD2 = await fr.evaluate(() => Math.round(pageYOffset));
      await fr.evaluate(() => document.querySelector('[data-open="S03"]').click()); await wait(400);
      const nb = await fr.evaluate(() => ({ p: (document.querySelector('.pk-nb-p') || { getAttribute: () => '' }).getAttribute('data-nb'), n: (document.querySelector('.pk-nb-n') || { getAttribute: () => '' }).getAttribute('data-nb'), back: (document.querySelector('.pk-back') || {}).textContent, q: !!document.querySelector('.pk-q'), end: document.querySelectorAll('#pkMain .pk-end-dots').length }));
      if (nb.end) no(`${tag} 상담 뒤 자세히에 맨 아래 안내가 있다 [DRESS_AFTER_NOEND]`);
      if (nb.p !== 'S02' || nb.n !== 'S04' || !/드레스 목록/.test(nb.back || '')) no(`${tag} 자세히 이전/다음 · «‹ 드레스 목록» ${JSON.stringify(nb)} [DRESS_TABS_1030]`);
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/detail-${W}.png` });
      await fr.focus('.pk-back'); await P.keyboard.press('Escape'); await wait(400);
      v = await view(fr); if (v.tab !== 'pkTabD' || v.focus !== 'S03' || Math.abs(v.y - yD2) > 2 || v.q) no(`${tag} 자세히 Esc → 드레스 탭 · S03 · 그 자리가 아니다(${yD2}) ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      await fr.evaluate(() => document.querySelector('[data-open="S05"]').click()); await wait(400);
      await P.evaluate(() => history.back()); await wait(900);
      v = await view(fr); if (v.tab !== 'pkTabD' || v.q || v.mine) no(`${tag} 자세히에서 뒤로가기 → 드레스 탭이 아니다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      /* ⑥ 탭 화면 Esc = 닫힘 · 아이콘 초점 */
      await fr.focus('#pkTabD'); await P.keyboard.press('Escape'); await wait(700);
      const c1 = await P.evaluate(() => ({ open: !!document.getElementById('mp_drViewer'), focus: document.activeElement === document.getElementById('mp_dressFab') }));
      if (c1.open || !c1.focus) no(`${tag} 탭 화면 Esc → 창 닫힘 · 아이콘 초점이 아니다 ${JSON.stringify(c1)} [DRESS_TABS_1030]`);
      /* ⑦ 기억 — 소품 탭 300 · 드레스 탭 600 에서 닫고 다시 열기 */
      fr = await open(P, true);
      await fr.evaluate(() => window.scrollTo(0, 600)); await wait(400); const mD = await fr.evaluate(() => Math.round(pageYOffset));
      await fr.click('#pkTabA'); await wait(200); await fr.evaluate(() => window.scrollTo(0, 200)); await wait(400); const mA = await fr.evaluate(() => Math.round(pageYOffset));
      await closeX(P, fr); fr = await open(P, true);
      v = await view(fr); if (v.tab !== 'pkTabA' || Math.abs(v.y - mA) > 2) no(`${tag} 다시 열면 마지막 탭(소품) · 그 자리(${mA})가 아니다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      if (SHOTS) await P.screenshot({ path: `${SHOTS}/reopen-${W}.png` });
      await fr.click('#pkTabD'); await wait(300); v = await view(fr); if (Math.abs(v.y - mD) > 2) no(`${tag} 다시 연 뒤 드레스 탭 자리(${mD})가 아니다 ${v.y} [DRESS_TABS_1030]`);
      await fr.evaluate(() => document.querySelector('[data-open="S02"]').click()); await wait(400); await closeX(P, fr); fr = await open(P, true);
      v = await view(fr); if (v.tab !== 'pkTabD' || !v.tabs || Math.abs(v.y - mD) > 2) no(`${tag} 자세히를 보다 닫으면 드레스 목록(${mD})이 아니다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      await closeX(P, fr);
      /* [DRESS_MEM_CLOSE] 스크롤 직후(0 ~ 100ms) ✕ · Esc · 바깥 · 뒤로로 닫아도 다시 열면 그 자리(2px 이내) */
      const cl = [];
      for (const [how, gap] of [['x', 0], ['esc', 30], ['out', 60], ['back', 100]]) {
        fr = await open(P, true); await fr.click('#pkTabD'); await wait(150);
        const want = 650 + cl.length * 37; await fr.evaluate((y) => window.scrollTo(0, y), want); const got0 = await fr.evaluate(() => Math.round(pageYOffset)); if (gap) await wait(gap);
        if (how === 'x') await fr.click('#pkExit');
        else if (how === 'esc') { await fr.focus('#pkTabD'); await P.keyboard.press('Escape'); }
        else if (how === 'out') await P.mouse.click(Math.round(W / 2), 6);
        else await P.evaluate(() => history.back());
        await wait(how === 'back' ? 1000 : 500);
        const gone = await P.evaluate(() => !document.getElementById('mp_drViewer')); if (!gone) { no(`${tag} ${how} 로 창이 안 닫혔다 [DRESS_MEM_CLOSE]`); continue; }
        fr = await open(P, true); const y2 = await fr.evaluate(() => Math.round(pageYOffset)); cl.push(`${how} ${got0}→${y2}`);
        if (Math.abs(y2 - got0) > 2) no(`${tag} 스크롤 ${gap}ms 뒤 ${how} 로 닫고 다시 열면 ${got0} 이 아니라 ${y2} [DRESS_MEM_CLOSE]`);
        await closeX(P, fr);
      }
      rows.push(`${tag} 닫기 직후 기억 ${cl.join(' · ')}`);
      /* [DRESS_FAB_LATEST] 고객 A → B → A — 아이콘은 누른 때의 고객 · 예약 · 리스너 하나 */
      const ab = await P.evaluate((S) => { const base = JSON.parse(S), got = [], orig = window.openDressPicker; window.openDressPicker = (dr, o) => { got.push(o.key + ':' + (dr && dr.attire)); };
        const mk = (c, at) => Object.assign({}, base, { code: c, consult: Object.assign({}, base.consult, { dress: Object.assign({}, base.consult.dress, { attire: at }) }) });
        for (const [c, at] of [['ME-A', '대여 희망 · 1벌'], ['ME-B', '대여 희망 · 2벌'], ['ME-A', '대여 희망 · 1벌']]) { ensureDressFab(mk(c, at)); document.getElementById('mp_dressFab').click(); }
        window.openDressPicker = orig; ensureDressFab(base); return got.join(' | ') + ' #' + document.querySelectorAll('#mp_dressFab').length; }, STATE(true));
      if (ab !== 'ME-A:대여 희망 · 1벌 | ME-B:대여 희망 · 2벌 | ME-A:대여 희망 · 1벌 #1') no(`${tag} 고객이 바뀐 뒤 아이콘이 옛 고객을 연다 ${ab} [DRESS_FAB_LATEST]`);
      /* [DRESS_NM_HOVER] 마우스로 아이콘 → 이름표로 옮겨도 이름표가 남는다 · Esc 로 닫힌다(마우스가 있는 폭만) */
      if (W >= 768) {
        const bb = await P.evaluate(() => { const r = document.getElementById('mp_dressFab').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
        await P.mouse.move(bb[0] + bb[2] / 2, bb[1] + bb[3] / 2); await wait(300);
        const nb2 = await P.evaluate(() => { const r = document.querySelector('#mp_dressFab .me-fab-nm').getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; });
        await P.mouse.move(nb2[0] + nb2[2] - 4, nb2[1] + nb2[3] / 2, { steps: 6 }); await wait(300);
        const nmV = await P.evaluate(() => getComputedStyle(document.querySelector('#mp_dressFab .me-fab-nm')).visibility);
        await P.keyboard.press('Escape'); await wait(250);
        const nmE = await P.evaluate(() => getComputedStyle(document.querySelector('#mp_dressFab .me-fab-nm')).visibility);
        await P.mouse.move(5, Math.round(H / 2)); await wait(300);
        if (nmV !== 'visible' || nmE !== 'hidden') no(`${tag} 이름표로 옮기면 ${nmV} · Esc 뒤 ${nmE} [DRESS_NM_HOVER]`);
      }
      await P.reload({ waitUntil: 'load' }); await P.waitForSelector(ENTRY(true), { timeout: 15000, state: 'visible', visible: true }); fr = await open(P, true);
      v = await view(fr); if (v.tab !== 'pkTabD' || v.y !== 0) no(`${tag} 새로고침 뒤에는 드레스 탭 맨 위가 아니다 ${JSON.stringify(v)} [DRESS_TABS_1030]`);
      rows.push(`${tag} 탭 ${tb.map((x) => x.join('×')).join(' · ')} · 고정 ${st.join('→')} · 창 ${card0} · 기억 소품 ${mA} · 드레스 ${mD}`);
      if (errors.length) no(`${tag} 페이지 오류 ${errors[0]}`);
      await P.close();
      /* ⑧ 말풍선 — 새 기기 */
      const t = await page(W, H, true, { tipSeen: false });
      const seen = [];
      for (const at of [400, 3000, 5300]) { await wait(at - (seen.length ? [400, 3000, 5300][seen.length - 1] : 0)); seen.push(await t.P.evaluate(() => !!document.querySelector('.me-fab-tip2'))); if (at === 400 && SHOTS) await t.P.screenshot({ path: `${SHOTS}/tip-${W}.png` }); }
      await t.P.reload({ waitUntil: 'load' }); await t.P.waitForSelector(ENTRY(true), { timeout: 15000, state: 'visible', visible: true }); await wait(800);
      const again = await t.P.evaluate(() => !!document.querySelector('.me-fab-tip2'));
      rows.push(`${tag} 말풍선 0.4s ${seen[0]} · 3s ${seen[1]} · 5.3s ${seen[2]} · 다시 ${again}`);
      if (!(seen[0] && seen[1] && !seen[2]) || again) no(`${tag} 처음 한 번 말풍선 — 0.4s ${seen[0]} · 3s ${seen[1]} · 5.3s ${seen[2]} · 다시 들어오면 ${again} [DRESS_FAB_1024]`);
      await t.P.close();
    } catch (e) { no(`${tag} 재다가 멈췄다 — ${String(e && e.message || e).split('\n')[0]}`); }
  }
} finally { await eng.close(); srv.close(); }
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-tabs — 실패 ${bad}건 [DRESS_TABS_1030]`); process.exit(1); }
console.log('━━ dress-tabs — 통과 · 네 크기 · 상담 전 = 물음 필수(답 없음 · 일부 → 물음 1 · 완료 → 결과) · 상담 뒤 = 첫 렌더부터 물음 없이 두 탭(늦게 온 데이터 포함) · 탭 크기 · 속성 · Tab · 초점 테 · 고정 · 방향키(끝 돌기) · 아래 안내 없음 · 소품 크게 보기 · 복귀(자리 · 초점) · 닫힘 · 기억 · 말풍선 1회 · 같은 탭 다시 고름 · 소품 행 맞춤 · 닫기 직후 기억 · 고객 바뀜 [DRESS_TABS_1030]');
