#!/usr/bin/env node
/* ★[DRESS_DETAIL_FIT 2026-10-23 코워크 검토 2 «시착 준비»] 고르기 화면 «자세히» 첫 화면에서 고르는 단추가 아래 막대에 가리지 않는지 «숫자로» 잰다.
 *
 *   왜 — 검토 1 에서 아래 막대(#pkBar)를 화면에 붙이자, 사진 아래에 있던 «입어 볼 드레스로 고르기»가 막대 뒤로 숨었다
 *        (390×844 단추 top 789 · 막대 top 707). 막대만 보면 누를 수 없는 «두 벌을 골라 주세요»뿐이라 어디서 고르는지 몰랐다.
 *        단추 자리는 사진 크기 · 글 길이 · 막대 높이가 함께 정한다 — 눈대중이 아니라 세 화면 크기에서 잰다.
 *
 *   잰다 — 390×844 · 390×740 · 1280×900 에서 «자세히» 첫 화면(스크롤 0)의 네 상태
 *     ① 아직 안 고름 «입어 볼 드레스로 고르기»(칠한 단추) ② 고름 «Nº 01 고른 드레스예요 · 빼기»
 *     ③ 한 벌 고른 뒤 다른 드레스 «Nº 02로 고르기»(외곽 단추 · [DRESS_PICK_TIER] 코워크 검토 4) ④ 두 칸이 다 참 «… 다 찼어요» 줄
 *     기준: 그 아래 끝 ≤ 막대 위 끝. 덤으로 가로 넘침 0 · 페이지 오류 0 · 진한 단추가 한 화면에 둘이 아니다.
 *     ★[DRESS_SLIDES 코워크 검토 4] 넘겨 보는 사진은 사진이 있는 장만 — 표본(사진 없음)은 한 장이라 ‹ › · n / 5 가 없어야 하고,
 *       사진을 넣은 사본(이 검사가 시험 사진을 꽂는다)에서는 ‹ › 가 사진 칸 안에 있어야 한다(사진 아래 줄로 돌아가면 단추가 다시 내려간다).
 *     ★[DRESS_SOLO_NOSAVE] 그다음 막대 단추로 완료 화면에 가서, 단독(저장 없음)이면 머리 «저장» · «남기기»가 안 보이고 «저장됨 · 남겼어요»라 말하지 않는지 본다.
 *     ★[DRESS_LIST_FIRST 명세 2] 열면 드레스 목록부터 — 맨 위 띠(«답하기 ›» · 누르는 칸 44px) · 진행 표시 없음 · 띠 아래 점 줄 둘을 보고,
 *       «답하기 ›» → 물음 셋(진행 표시 셋 · 점 줄 없음) → 목록(띠 «발목까지 · 몸 선을 따라 · 노출이 적은 드레스 · 답 바꾸기 ›»)을 따라간다.
 *     ★[코워크 디자인 라운드 1] 띠 글 «원하시는 길이와 핏을 고르시면 그 드레스부터 보여 드려요»([DRESS_BAND_WORDS]) · 점 줄 둘([DRESS_BAND_DOTS]) · 보이는 소제목 없음 ·
 *       답한 뒤에도 한 그리드(맞는 칸 앞 · «답과 맞아요» [DRESS_ONE_GRID]) · 물음에 «아직 몰라요» 없음([DRESS_Q_TRIM]) · 단독 완료 화면 단추는 글을 써도 «마이페이지로 돌아가기»([DRESS_MEMO_ONEBTN])
 *     ★[DRESS_PUBLIC_OFF 명세 2] /dress.html(?pick=1 없이)은 마이페이지로 넘어간다(한 크기에서).
 *     375×667(작은 폰)은 «참고»로만 찍는다 — 코워크 기준 밖이라 빨강으로 세지 않는다.
 *     ★[DRESS_BAR_FIT 코워크 디자인 라운드 1 · 2 «390 · 1280 목록 · 자세히에서 막대에 반쯤 걸린 글 0»] 첫 화면(스크롤 0)의 글줄이 막대 위 끝을 가르지 않는다 —
 *       여섯 크기(360×780 · 375×812 · 390×844 · 390×740 · 414×896 · 1280×900) × (목록 + 표본 여섯 자세히)를 마이페이지 겹화면(고객이 실제 보는 길 · 목록에서 칸을 눌러 들어간다)에서,
 *       390×844 · 1280×900 은 단독(?pick=1 · &open= 으로 바로 연 자세히)에서도 잰다. 크기마다 줄 자리가 달라 한두 크기만 보면 놓친다(10/23 실측: 390×844 목록 · 375 · 360 · 414 폭 자세히).
 *
 *   종료: 0 통과 · 1 가린다 · 2 재지 못했다(브라우저 없음 — 화면 결함이 아니다)
 *   어디서 도나 — PR 의 merge-guard(브라우저 없음)에서는 2 로 빠지고, nightly-screen(run-all.mjs 가 스스로 찾는다)과 로컬에서 실제로 잰다.
 *   사람이 잴 때: node scripts/audit/dress-fit.mjs   (숫자만 보려면 --print)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.ico': 'image/x-icon' };
const SIZES = [[390, 844, true], [390, 740, true], [1280, 900, true], [375, 667, false]];
const BAR_SIZES = [[360, 780], [375, 812], [390, 844], [390, 740], [414, 896], [1280, 900]];   // [DRESS_BAR_FIT] 막대 선에 걸린 글줄 0 — 겹화면은 여섯 다 · 단독은 390×844 · 1280×900

/* 시험 사진 — PHOTOS 가 켜진 동안만 원천에 넘겨 보는 사진 세 장을 꽂는다(파일은 홈 Styling 사진을 빌린다 · 저장소에 아무것도 더하지 않는다) */
let PHOTOS = false;
const PATCH = "\n;(function(R){ if(!R) return; R.dresses.slice(0, 3).forEach(function(d){ d.ex = [{ t: '앞', img: '__fit/p' }, { t: '뒤', img: '__fit/p' }, { t: '디테일', img: '__fit/p' }]; }); })(window.DRESS_REFS);\n";
const PORT = await freePort();
const srv = http.createServer((q, r) => {
  let u = decodeURIComponent(q.url.split('?')[0]);
  if (u === '/assets/dress-refs/__fit/p.webp' || u === '/assets/dress-refs/__fit/p.jpg') u = '/assets/home/styling' + path.extname(u);
  const f = path.join(ROOT, u);
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
  r.setHeader('cache-control', 'no-store');
  if (PHOTOS && u === '/assets/dress-refs.js') return r.end(fs.readFileSync(f, 'utf8') + PATCH);
  r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));

const eng = await launchBrowser();
if (!eng) {
  console.log('━━ dress-fit — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다');
  srv.close();
  process.exit(2);
}

let bad = 0;
const rows = [];
const no = (m) => { bad++; console.log('   ✗ ' + m); };
try {
  for (const [W, H, gate] of SIZES) {
    const tag = `${W}×${H}`;
    // 자세히 첫 화면 한 장의 숫자(스크롤 0) — 단추 아래 끝 · 막대 위 끝 · 사진 높이 · 넘김 · 칠한 단추 수
    const shot = (page, sel) => page.evaluate((s) => {
      window.scrollTo(0, 0);
      const c = document.querySelector(s), b = document.querySelector('.wz-bar'), v = document.querySelector('.pk-main .dv-strip');
      if (!c || !b) return null;
      const x = c.getBoundingClientRect(), y = b.getBoundingClientRect();
      const nav = document.querySelector('.pk-main .dv-view .dv-next'), vr = v ? v.getBoundingClientRect() : null, nr = nav ? nav.getBoundingClientRect() : null;
      const dark = [...document.querySelectorAll('#pickView .cc-btn')].filter((e) => !e.classList.contains('cc-btn-wait') && !e.classList.contains('pk-skip') && e.offsetParent).length;
      return { ctlTop: Math.round(x.top), ctlBottom: Math.round(x.bottom), barTop: Math.round(y.top), photoH: vr ? Math.round(vr.height) : 0,
        slides: v ? v.children.length : 0, nav: !!nav, cnt: !!document.querySelector('.pk-main #dvCnt'), dark,
        navIn: !!(nr && vr && nr.top >= vr.top && nr.bottom <= vr.bottom && nr.left >= vr.left && nr.right <= vr.right),
        over: document.documentElement.scrollWidth > window.innerWidth };
    }, sel);
    // ── 표본(사진 없음) — 네 상태
    PHOTOS = false;
    const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await page.goto(`http://localhost:${PORT}/dress.html?pick=1`, { waitUntil: 'networkidle', timeout: 30000 });
    // ★[DRESS_LIST_FIRST] 열면 목록 — 띠 · 진행 표시 없음 · 띠 아래 한 줄 → «답하기 ›» → 물음 셋 → 목록(답한 띠)
    const flow = (s0) => page.evaluate((s0) => {
      const q = (x) => document.querySelector(x), b = q('.pk-band [data-act="ask"]');
      return { s0, cells: document.querySelectorAll('.pk-main [data-open]').length, steps: document.querySelectorAll('.pk-main .wz-steps li').length,
        band: q('.pk-band-t') ? q('.pk-band-t').textContent.replace(/\u00a0/g, ' ') : '', btn: b ? b.textContent.trim() : '', btnH: b ? Math.round(b.getBoundingClientRect().height) : 0,
        dot: document.querySelectorAll('.pk-band-dots .dotln').length, anyDot: /고르셔도|고르지 않으셔도/.test((q('.pk-main') || {}).textContent || ''), gh: [...document.querySelectorAll('.pk-main h2')].filter((e) => e.offsetWidth > 1).map((e) => e.textContent).join('|'),
        grids: document.querySelectorAll('.pk-main .pk-grid').length, fit: [...document.querySelectorAll('.pk-main .dr-cell')].map((c) => (c.querySelector('.dr-fit') ? 1 : 0)).join(''),
        opts: [...document.querySelectorAll('.pk-opt')].map((e) => e.textContent.trim()).join('|'), steps2: [...document.querySelectorAll('.pk-main .wz-steps li')].map((e) => e.textContent).join('|'),
        over: document.documentElement.scrollWidth > window.innerWidth };
    }, s0);
    const f0 = await flow('열기');
    if (gate && (f0.cells < 3 || f0.steps !== 0 || f0.band !== '원하시는 길이와 핏을 고르시면 그 드레스부터 보여 드려요' || f0.btn !== '답하기 ›' || f0.btnH < 44 || f0.dot !== 2 || f0.gh !== '' || f0.grids !== 1 || /1/.test(f0.fit) || f0.over)) no(`${tag} 열면 목록 · 띠 «답하기 ›» · 점 줄 둘 · 보이는 소제목 없음 · 한 그리드 · 진행 표시 없음이 아니다 ${JSON.stringify(f0)} [DRESS_LIST_FIRST · DRESS_BAND_WORDS · DRESS_BAND_DOTS]`);
    await page.click('.pk-band [data-act="ask"]');
    const f1 = await flow('첫 물음');
    if (gate && (f1.steps !== 3 || f1.anyDot || f1.band || /아직 몰라요/.test(f1.opts) || f1.steps2 !== '길이|핏|노출 · 소매')) no(`${tag} «답하기 ›» 뒤 첫 물음 — 진행 표시 셋(길이 · 핏 · 노출 · 소매) · 점 줄 없음 · «아직 몰라요» 없음이 아니다 ${JSON.stringify(f1)} [DRESS_LIST_FIRST · DRESS_Q_TRIM]`);
    await page.click('.pk-opt[data-a="ankle"]'); await page.click('.wz-bar [data-go="1"]');
    await page.click('.pk-opt[data-a="body"]'); await page.click('.wz-bar [data-go="1"]');
    await page.click('.pk-opt[data-a="low"]'); await page.click('.wz-bar [data-go="1"]');
    const f2 = await flow('답한 뒤');
    if (gate && (f2.steps !== 0 || f2.band !== '발목까지 · 몸 선을 따라 · 노출이 적은 드레스' || f2.btn !== '답 바꾸기 ›' || f2.btnH < 44 || f2.dot !== 2 || f2.gh !== '' || f2.grids !== 1 || !/^1+0*$/.test(f2.fit) || !/1/.test(f2.fit) || f2.over)) no(`${tag} 답한 뒤 목록 — 띠 «발목까지 · 몸 선을 따라 · 노출이 적은 드레스 · 답 바꾸기 ›» · 한 그리드 · 맞는 칸이 앞(«답과 맞아요»)이 아니다 ${JSON.stringify(f2)} [DRESS_LIST_FIRST · DRESS_ONE_GRID]`);
    rows.push(`${tag} 목록부터: 열기 띠 «${f0.btn}» ${f0.btnH}px · 점 줄 ${f0.dot} · 진행 ${f0.steps} → 물음 «${f1.steps2}» → 답한 뒤 «${f2.band}» «${f2.btn}» · 그리드 ${f2.grids} · 맞는 칸 ${f2.fit}${gate ? '' : ' (참고)'}`);
    await page.click('.pk-band [data-act="ask"]'); await page.click('.pk-skipq');   // 답은 그대로 두고 목록으로(아래 네 상태는 표본 순서와 상관없이 처음 세 칸을 쓴다)
    const ids = await page.$$eval('.pk-main [data-open]', (els) => els.map((e) => e.getAttribute('data-open')));
    if (ids.length < 3) { no(`${tag} 드레스 칸이 셋보다 적다(${ids.length}) — 표본이 안 그려졌다`); await page.close(); continue; }
    const open = async (id) => { await page.evaluate(() => { const b = document.querySelector('.pk-main [data-act="list"]'); if (b) b.click(); }); await page.click(`.pk-main [data-open="${id}"]`); };
    await page.click(`.pk-main [data-open="${ids[0]}"]`);
    const a = await shot(page, '.pk-ctl [data-act="pick"]');                 // ① 0벌 — 칠한 단추
    await page.click('.pk-ctl [data-act="pick"]');
    const b = await shot(page, '.pk-ctl .pk-picked');                        // ② 고름
    await open(ids[1]);
    const c = await shot(page, '.pk-ctl [data-act="pick"]');                 // ③ 한 벌 뒤 다른 드레스 — 외곽 «Nº 02로 고르기»
    const cLab = await page.evaluate(() => { const e = document.querySelector('.pk-ctl [data-act="pick"]'); return e ? e.className + '|' + e.textContent : ''; });
    await page.click('.pk-ctl [data-act="pick"]');
    await open(ids[2]);
    const d = await shot(page, '.pk-ctl .pk-full');                          // ④ 다 참
    const st = [['고르기 단추(0벌)', a], ['고른 줄 · 빼기', b], ['Nº 02로 고르기', c], ['다 찼어요 줄', d]];
    for (const [nm, m] of st) {
      if (!m) { if (gate) no(`${tag} ${nm} — 찾지 못했다`); continue; }
      rows.push(`${tag} ${nm}: 아래 끝 ${m.ctlBottom} · 막대 위 끝 ${m.barTop} · 사진 ${m.photoH}px · 칠한 단추 ${m.dark}${gate ? '' : ' (참고)'}`);
      if (gate && m.ctlBottom > m.barTop) no(`${tag} ${nm}이 막대에 가린다 — 아래 끝 ${m.ctlBottom} > 막대 위 끝 ${m.barTop}`);
      if (gate && m.over) no(`${tag} 가로 넘침`);
      if (gate && m.dark > 1) no(`${tag} ${nm} — 진한 단추가 한 화면에 ${m.dark}개([DRESS_PICK_TIER])`);
    }
    if (gate && c && !/cc-btn-ghost\|Nº 02로 고르기/.test(cLab)) no(`${tag} 한 벌 고른 뒤 다른 드레스의 단추가 외곽 «Nº 02로 고르기»가 아니다 — ${cLab}`);
    // ★[DRESS_SOLO_NOSAVE] 단독 완료 화면 — 저장이 없으니 머리 «저장» · 완료 «남기기»가 안 보이고 «저장됨 · 남겼어요»라 말하지 않는다(«나가기» · 머리 아래 한 줄은 그대로)
    await page.click('.wz-bar [data-act="save"]');
    await page.fill('#pkMemo', '남길 말');   // [DRESS_MEMO_ONEBTN] 단독은 글을 써도 «남기고»라 하지 않는다(저장이 없다)
    const solo = await page.evaluate(() => {
      const el = (id) => document.getElementById(id), vis = (id) => !!(el(id) && el(id).offsetParent);
      return { done: !!el('pkMemo'), save: vis('pkSave'), leave: !!el('pkLeave'), exit: vis('pkExit'), line: vis('pkSolo'), home: el('pkHome') ? el('pkHome').textContent : '',
        said: [el('pkSave'), el('pkHome')].some((e) => !!e && /저장됨|남겼어요|남기고/.test(e.textContent)) };
    });
    if (gate && (!solo.done || solo.save || solo.leave || !solo.exit || !solo.line || solo.said || solo.home !== '마이페이지로 돌아가기')) no(`${tag} 단독 완료 화면 — 저장이 없는데 «저장»이 보이거나 «남기기» 알약이 있거나 «저장됨 · 남기고»라 말한다 ${JSON.stringify(solo)} [DRESS_SOLO_NOSAVE · DRESS_MEMO_ONEBTN]`);
    if (gate && a && (a.slides !== 1 || a.nav || a.cnt)) no(`${tag} 사진 없는 표본인데 넘김(‹ › · n / 5)이 있다 — 장 ${a.slides}([DRESS_SLIDES])`);
    if (gate && errors.length) no(`${tag} 페이지 오류 ${errors.length} · ${errors[0]}`);
    await page.close();
    // ── 사진을 넣은 사본 — 넘김은 사진 칸 안
    PHOTOS = true;
    const p2 = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await p2.page.goto(`http://localhost:${PORT}/dress.html?pick=1`, { waitUntil: 'networkidle', timeout: 30000 });   // [DRESS_LIST_FIRST] 열면 목록
    await p2.page.click(`.pk-main [data-open="${ids[0]}"]`);
    const e = await shot(p2.page, '.pk-ctl [data-act="pick"]');
    PHOTOS = false;
    if (e) rows.push(`${tag} 사진 3장 사본: 아래 끝 ${e.ctlBottom} · 막대 위 끝 ${e.barTop} · 장 ${e.slides} · 넘김 사진 안 ${e.navIn ? '예' : '아니오'}${gate ? '' : ' (참고)'}`);
    if (gate && (!e || e.slides !== 3 || !e.cnt)) no(`${tag} 사진을 넣은 사본에서 넘겨 보는 사진이 셋이 아니다(${e ? e.slides : '없음'})`);
    if (gate && e && !e.navIn) no(`${tag} 사진 넘김(›)이 사진 칸 안에 있지 않다 — 사진 아래 줄로 돌아가면 단추가 다시 내려간다`);
    if (gate && e && e.ctlBottom > e.barTop) no(`${tag} 사진을 넣은 사본에서 고르기 단추가 막대에 가린다 — ${e.ctlBottom} > ${e.barTop}`);
    if (gate && p2.errors.length) no(`${tag} (사진 사본) 페이지 오류 ${p2.errors.length} · ${p2.errors[0]}`);
    await p2.page.close();
  }
  // ★[DRESS_BAR_FIT 코워크 디자인 라운드 1 · 2] 첫 화면 막대 선에 걸린 글줄 0 — 겹화면(마이페이지 → 고르기) 여섯 크기 · 단독 두 크기 × (목록 + 자세히 여섯)
  const cutLines = (fr) => fr.evaluate(() => {
    window.scrollTo(0, 0);
    const bar = document.querySelector('#pkBar .wz-bar'), main = document.querySelector('.pk-main'); if (!bar || !main) return null;
    const T = bar.getBoundingClientRect().top, out = [];
    const w = document.createTreeWalker(main, NodeFilter.SHOW_TEXT); let t;
    while ((t = w.nextNode())) {
      if (!t.nodeValue.trim()) continue;
      const rg = document.createRange(); rg.selectNodeContents(t);
      for (const r of rg.getClientRects()) if (r.height > 4 && r.top < T - 1 && r.bottom > T + 1) out.push(t.nodeValue.trim().slice(0, 14) + ' ' + Math.round(r.top) + '~' + Math.round(r.bottom) + '/' + Math.round(T));
    }
    return out;
  });
  const DR = { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null };
  let cutViews = 0;
  for (const [W, H] of BAR_SIZES) {
    const tag = `${W}×${H}`, cut = [];
    const pe = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await pe.page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    const ids6 = await pe.page.evaluate(() => (window.DRESS_REFS && window.DRESS_REFS.list ? window.DRESS_REFS.list().map((d) => d.id) : []));
    if (ids6.length < 3) { no(`${tag} 겹화면 — 마이페이지에서 드레스 목록을 못 읽었다(${ids6.length})`); await pe.page.close(); continue; }
    // 카드에서 연 목록 → 칸을 눌러 자세히 → «목록»으로 돌아오기(고객 손가락 순서 · 화면 안 이동도 맞추는지 본다)
    await pe.page.evaluate((dr) => openDressPicker(dr, {}), DR);
    const fr = await (await pe.page.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame();
    await fr.waitForSelector('.pk-band', { timeout: 15000 });
    await pe.page.waitForTimeout(250);
    for (const id of ['', ...ids6]) {
      if (id) { await fr.click(`.pk-main [data-open="${id}"]`); await fr.waitForSelector('.dv-nm', { timeout: 15000 }); await pe.page.waitForTimeout(120); }
      const c = await cutLines(fr); cutViews++;
      if (c === null) { no(`${tag} 겹화면 ${id || '목록'} — 막대를 못 찾았다`); continue; }
      if (c.length) cut.push(`겹화면 ${id || '목록'} ${JSON.stringify(c)}`);
      if (id) { await fr.click('.pk-main [data-act="list"]'); await fr.waitForSelector('.pk-band', { timeout: 15000 }); }
    }
    if (pe.errors.length) no(`${tag} 겹화면 페이지 오류 ${pe.errors.length} · ${pe.errors[0]}`);
    await pe.page.close();
    if ((W === 390 && H === 844) || W === 1280) {
      const ps = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
      for (const id of ['', ...ids6]) {
        await ps.page.goto(`http://localhost:${PORT}/dress.html?pick=1${id ? '&open=' + id : ''}`, { waitUntil: 'load', timeout: 30000 });
        await ps.page.waitForSelector(id ? '.dv-nm' : '.pk-band', { timeout: 15000 });
        await ps.page.waitForTimeout(150);
        const c = await cutLines(ps.page); cutViews++;
        if (c && c.length) cut.push(`단독 ${id || '목록'} ${JSON.stringify(c)}`);
      }
      if (ps.errors.length) no(`${tag} 단독 페이지 오류 ${ps.errors.length} · ${ps.errors[0]}`);
      await ps.page.close();
    }
    rows.push(`${tag} 막대 선에 걸린 글줄: ${cut.length ? cut.join(' · ') : '0'}`);
    if (cut.length) no(`${tag} 첫 화면 막대 선에 걸린 글줄이 있다 — ${cut.join(' · ')} [DRESS_BAR_FIT]`);
  }
  rows.push(`막대 선 검사 화면 ${cutViews}장`);
  // ★[DRESS_PUBLIC_OFF 명세 2] ?pick=1 없이 열면 마이페이지로 넘어간다(그리기 전에 · replace)
  const p3 = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  await p3.page.goto(`http://localhost:${PORT}/dress.html`, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
  await p3.page.waitForTimeout(800);
  const landed = p3.page.url();
  rows.push(`/dress.html → ${landed.replace(/^https?:\/\/[^/]+/, '')}`);
  if (!/\/mypage\.html(\?|#|$)/.test(landed)) no(`/dress.html(공개 화면 주소)이 마이페이지로 넘어가지 않는다 — ${landed} [DRESS_PUBLIC_OFF]`);
  await p3.page.close();
} finally {
  await eng.close();
  srv.close();
}
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-fit — 실패 ${bad}건 [DRESS_DETAIL_FIT]`); process.exit(1); }
console.log(`━━ dress-fit — 통과 · 열면 목록(띠 · 점 줄 둘 · 물음 셋 · 답한 뒤 한 그리드) · 세 크기 × 네 상태 모두 단추가 막대 위 · 진한 단추 하나 · 넘김은 사진 있는 장만 · 단독 완료 화면에 저장 단추 없음 · 여섯 크기 첫 화면 막대 선에 걸린 글줄 0 · 공개 주소는 마이페이지로 [DRESS_DETAIL_FIT · DRESS_BAR_FIT]`);
