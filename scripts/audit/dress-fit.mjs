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
 *     ★[DRESS_BACK_STEP 코워크 디자인 라운드 2 · 1] 휴대폰 뒤로가기(history.back) = 겹화면 안에서 한 걸음 — 390×844 마이페이지 겹화면에서
 *       자세히 → 목록(읽던 자리 · 그 칸 초점) · 물음 3 → 2 → 1 → 목록 · 목록(바뀐 것 없음) → 닫힘(마이페이지에 남는다) · 고른 뒤 목록 → «저장하지 않은 변경이 있어요» 판.
 *       ★[DRESS_NEXT_PREV] 덤으로 자세히 맨 아래 «‹ 이전 드레스 · 다음 드레스 ›»(첫 드레스는 다음만 · 누르면 다음 드레스 · 44px).
 *     ★[코워크 디자인 라운드 3] 두 벌 찬 뒤 다른 드레스 «두 벌을 다 골랐어요.» + «Nº 01과 바꾸기 · Nº 02와 바꾸기»(한 줄 · 44px) → «Nº 02와 바꾸기» = 막대 Nº 02 만 바뀐다([DRESS_FULL_SWAP]) ·
 *       막대 작은 사진 = 그 드레스 자세히(고른 수 그대로 · [DRESS_SLOT_SEE]) · 답을 바꾼 뒤에도 고른 두 벌 그대로 · 띠 아래 점 줄 하나([DRESS_NO_PICK_CARD]).
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
        subs: [...document.querySelectorAll('.pk-main .pk-sub-h')].map((e) => e.textContent).join('|'), more: !!q('.pk-main [data-act="more"]'), end: document.querySelectorAll('.pk-main .pk-end-dots .dotln').length,
        browse: !!q('[data-act="browse"]') || /건너뛰기|바로 보기/.test(document.body.innerText), nextDis: (q('.wz-bar [data-go="1"]') || { getAttribute: () => '' }).getAttribute('aria-disabled') || '',
        over: document.documentElement.scrollWidth > window.innerWidth };
    }, s0);
    /* ★[DRESS_Q_FIRST 2026-10-24 사장님] 열면 물음 1 — 목록 · 띠 없음 · «건너뛰기» · «드레스 바로 보기» 없음 · 답하기 전 «다음»은 옅고 눌러도 안 넘어간다 */
    const f0 = await flow('열기'), f1 = f0;
    if (gate && (f0.cells !== 0 || f0.band || f0.steps !== 3 || f0.anyDot || /아직 몰라요/.test(f0.opts) || f0.steps2 !== '길이|핏|노출 · 소매' || f0.browse || f0.nextDis !== 'true' || f0.over)) no(`${tag} 열면 물음 1 — 진행 표시 셋 · 목록 없음 · 건너뛰기 · 바로 보기 없음 · 다음 옅음이 아니다 ${JSON.stringify(f0)} [DRESS_Q_FIRST]`);
    await page.click('.wz-bar [data-go="1"]', { force: true }); await page.waitForTimeout(80);
    if (gate && (await flow('안 답하고 다음')).steps2 !== '길이|핏|노출 · 소매') no(`${tag} 답하기 전 «다음»이 넘어갔다 [DRESS_Q_FIRST]`);
    if (gate && !(await page.evaluate(() => !!document.querySelector('.pk-opt[data-a="ankle"]') && document.getElementById('pkQ').textContent === window.DRESS_REFS.questions[0].q))) no(`${tag} 답하기 전 «다음»을 눌렀는데 첫 물음이 아니다 [DRESS_Q_FIRST]`);
    await page.click('.pk-opt[data-a="ankle"]'); await page.click('.wz-bar [data-go="1"]');
    await page.click('.pk-opt[data-a="body"]'); await page.click('.wz-bar [data-go="1"]');
    await page.click('.pk-opt[data-a="low"]'); await page.click('.wz-bar [data-go="1"]');
    const f2 = await flow('답한 뒤');
    if (gate && (f2.steps !== 0 || f2.band !== '발목까지 · 몸 선을 따라 · 노출이 적은 드레스' || f2.btn !== '답 바꾸기 ›' || f2.btnH < 44 || f2.subs !== '답에 맞는 드레스' || !f2.more || f2.end !== 1 || f2.grids !== 1 || /1/.test(f2.fit) || f2.cells < 1 || f2.over)) no(`${tag} 답한 뒤 결과 — 띠 «… · 답 바꾸기 ›» · «답에 맞는 드레스» 맞는 칸만 · «다른 드레스도 보기» · 맨 아래 점 줄 하나가 아니다 ${JSON.stringify(f2)} [DRESS_RESULT_SPLIT]`);
    await page.click('.pk-main [data-act="more"]'); await page.waitForTimeout(80);
    const f3 = await flow('펼친 뒤');
    if (gate && (f3.subs !== '답에 맞는 드레스|다른 드레스' || f3.more || f3.grids !== 2 || f3.cells !== 6 || f3.over)) no(`${tag} «다른 드레스도 보기» 뒤 — «다른 드레스» 아래로 나머지 전부 · 단추 사라짐이 아니다 ${JSON.stringify(f3)} [DRESS_RESULT_SPLIT]`);
    rows.push(`${tag} 물음 먼저: 열기 진행 «${f0.steps2}» · 다음 옅음 ${f0.nextDis} → 결과 «${f2.band}» «${f2.btn}» · «${f2.subs}» ${f2.cells}칸 · 더 보기 ${f2.more} → 펼침 «${f3.subs}» ${f3.cells}칸${gate ? '' : ' (참고)'}`);
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
    const d = await shot(page, '.pk-ctl .pk-swap');                          // ④ 다 참 — «두 벌을 다 골랐어요.» + 바꾸기 둘([DRESS_FULL_SWAP])
    const st = [['고르기 단추(0벌)', a], ['고른 줄 · 빼기', b], ['Nº 02로 고르기', c], ['두 벌 다 고름 · 바꾸기 줄', d]];
    for (const [nm, m] of st) {
      if (!m) { if (gate) no(`${tag} ${nm} — 찾지 못했다`); continue; }
      rows.push(`${tag} ${nm}: 아래 끝 ${m.ctlBottom} · 막대 위 끝 ${m.barTop} · 사진 ${m.photoH}px · 칠한 단추 ${m.dark}${gate ? '' : ' (참고)'}`);
      if (gate && m.ctlBottom > m.barTop) no(`${tag} ${nm}이 막대에 가린다 — 아래 끝 ${m.ctlBottom} > 막대 위 끝 ${m.barTop}`);
      if (gate && m.over) no(`${tag} 가로 넘침`);
      if (gate && m.dark > 1) no(`${tag} ${nm} — 진한 단추가 한 화면에 ${m.dark}개([DRESS_PICK_TIER])`);
    }
    if (gate && c && !/cc-btn-ghost\|Nº 02로 고르기/.test(cLab)) no(`${tag} 한 벌 고른 뒤 다른 드레스의 단추가 외곽 «Nº 02로 고르기»가 아니다 — ${cLab}`);
    // ★[코워크 디자인 라운드 3] ② 두 벌 찬 뒤 다른 드레스 «Nº 02와 바꾸기» → 막대 Nº 02 가 이 드레스 · Nº 01 그대로 ① 막대 작은 사진 → 그 드레스 자세히(고른 수 그대로) ③ 답 바꾸기 뒤에도 두 벌 그대로
    const slots = () => page.evaluate(() => [...document.querySelectorAll('#pkBar .pk-slot')].map((e) => e.getAttribute('aria-label') || ''));
    const nm = (i) => page.evaluate((i) => window.DRESS_REFS.dress(i).name, i);
    const [n0, n1, n2] = [await nm(ids[0]), await nm(ids[1]), await nm(ids[2])];
    const sw = await page.evaluate(() => { const r = (e) => e ? e.getBoundingClientRect() : null; const bs = [...document.querySelectorAll('.pk-ctl .pk-swap-b button')]; const t = document.querySelector('.pk-ctl .pk-swap-t'); return { t: t ? t.textContent : '', btn: bs.map((e) => e.textContent), h: bs.map((e) => Math.round(r(e).height)), row: bs.length === 2 && Math.abs(r(bs[0]).top - r(bs[1]).top) < 1, cls: bs.map((e) => e.className).join('|'), over: document.documentElement.scrollWidth > innerWidth }; });
    if (gate && (sw.t !== '두 벌을 다 골랐어요.' || sw.btn.join('|') !== 'Nº 01과 바꾸기|Nº 02와 바꾸기' || !sw.row || sw.h.some((x) => x < 44) || sw.cls !== 'cc-btn-ghost|cc-btn-ghost' || sw.over)) no(`${tag} 두 벌 찬 뒤 다른 드레스 = «두 벌을 다 골랐어요.» + 외곽 «Nº 01과 바꾸기 · Nº 02와 바꾸기» 한 줄 44px 가 아니다 ${JSON.stringify(sw)} [DRESS_FULL_SWAP]`);
    await page.click('.pk-ctl [data-swap="1"]'); await page.waitForTimeout(120);
    const s1 = await slots(), afterSw = await page.evaluate(() => (document.querySelector('.pk-ctl .pk-picked') || {}).textContent || '');
    rows.push(`${tag} 바꾸기: «Nº 02와 바꾸기» → 막대 ${JSON.stringify(s1)} · 단추 줄 «${afterSw}»`);
    if (gate && (s1[0] !== `Nº 01 ${n0} 자세히 보기` || s1[1] !== `Nº 02 ${n2} 자세히 보기` || !/Nº 02/.test(afterSw) || !/빼기/.test(afterSw))) no(`${tag} «Nº 02와 바꾸기» 뒤 막대 Nº 02 = ${n2} · Nº 01 = ${n0} 그대로 · 단추 줄 «Nº 02 고른 드레스예요 · 빼기»가 아니다 ${JSON.stringify(s1)} «${afterSw}» [DRESS_FULL_SWAP]`);
    await page.click('#pkBar .pk-slot[data-i="0"]'); await page.waitForTimeout(150);
    const s2 = await slots(), see0 = await page.evaluate(() => (document.querySelector('.dv-nm') || {}).textContent || '');
    rows.push(`${tag} 막대 작은 사진 Nº 01 누름 → 자세히 «${see0}» · 막대 ${s2.filter((x) => /자세히 보기/.test(x)).length}벌`);
    if (gate && (see0 !== n0 || JSON.stringify(s2) !== JSON.stringify(s1) || /빼기|&times;|×/.test(s2.join('')))) no(`${tag} 막대 작은 사진을 누르면 그 드레스 자세히(고른 수 그대로)가 아니다 «${see0}» ${JSON.stringify(s2)} [DRESS_SLOT_SEE]`);
    await page.click('.pk-main [data-act="list"]'); await page.click('.pk-band [data-act="ask"]'); await page.click('.pk-opt[data-a="calf"]'); await page.click('.wz-bar [data-go="1"]'); await page.click('.wz-bar [data-go="1"]'); await page.click('.wz-bar [data-go="1"]'); await page.waitForTimeout(120);   // [DRESS_Q_FIRST] 답 바꾸기 = 물음 1부터 · 고른 답은 켜져 있다
    const s3 = await slots(), band3 = await page.evaluate(() => (document.querySelector('.pk-band-t') || {}).textContent || '');
    rows.push(`${tag} 답 바꾸기(«${band3.replace(/ /g, ' ')}») 뒤 막대 ${JSON.stringify(s3)}`);
    if (gate && JSON.stringify(s3) !== JSON.stringify(s1)) no(`${tag} 답을 바꾼 뒤 고른 두 벌이 그대로가 아니다 ${JSON.stringify(s3)} [DRESS_FULL_SWAP]`);
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
    await p2.page.goto(`http://localhost:${PORT}/dress.html?pick=1&open=${ids[0]}`, { waitUntil: 'networkidle', timeout: 30000 });   // [DRESS_Q_FIRST] 열면 물음이라 자세히로 바로(&open=)
    await p2.page.waitForSelector('.dv-nm', { timeout: 15000 });
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
  const DRA = { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: { picks: [], names: [], ans: { len: 'ankle', fit: 'body', pref: ['none'] }, memo: '', at: '' } };   // [DRESS_Q_FIRST] 답한 적 있음 → 결과로 바로
  const expand = async (fr) => { await fr.evaluate(() => { const b = document.querySelector('.pk-main [data-act="more"]'); if (b) b.click(); }); };
  let cutViews = 0;
  for (const [W, H] of BAR_SIZES) {
    const tag = `${W}×${H}`, cut = [];
    const pe = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await pe.page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    const ids6 = await pe.page.evaluate(() => (window.DRESS_REFS && window.DRESS_REFS.list ? window.DRESS_REFS.list().map((d) => d.id) : []));
    if (ids6.length < 3) { no(`${tag} 겹화면 — 마이페이지에서 드레스 목록을 못 읽었다(${ids6.length})`); await pe.page.close(); continue; }
    // 카드에서 연 목록 → 칸을 눌러 자세히 → «목록»으로 돌아오기(고객 손가락 순서 · 화면 안 이동도 맞추는지 본다)
    await pe.page.evaluate((dr) => openDressPicker(dr, {}), DRA);
    const fr = await (await pe.page.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame();
    await fr.waitForSelector('.pk-band', { timeout: 15000 });
    await pe.page.waitForTimeout(250);
    const cut0 = await cutLines(fr); cutViews++; if (cut0 && cut0.length) cut.push(`겹화면 결과(접힘) ${JSON.stringify(cut0)}`);
    await expand(fr); await pe.page.waitForTimeout(80);
    for (const id of ['', ...ids6]) {
      if (id) { await fr.click(`.pk-main [data-open="${id}"]`); await fr.waitForSelector('.dv-nm', { timeout: 15000 }); await pe.page.waitForTimeout(120); }
      const c = await cutLines(fr); cutViews++;
      if (c === null) { no(`${tag} 겹화면 ${id || '목록'} — 막대를 못 찾았다`); continue; }
      if (c.length) cut.push(`겹화면 ${id || '목록'} ${JSON.stringify(c)}`);
      if (id) { await fr.click('.pk-main [data-act="list"]'); await fr.waitForSelector('.pk-band', { timeout: 15000 }); }
    }
    if (pe.errors.length) no(`${tag} 겹화면 페이지 오류 ${pe.errors.length} · ${pe.errors[0]}`);
    await pe.page.close();
    /* [DRESS_RESULT_SPLIT] 답에 맞는 것이 없는 결과(가까운 3벌 · 한 줄 · 한 벌 고름 · 접힘)와 맞는 것 하나(접힘)도 첫 화면을 잰다 */
    for (const [nm, ans, picks] of [['맞는 것 0', { len: 'knee', fit: 'loose', pref: ['arms'] }, ['S01']], ['맞는 것 1', { len: 'ankle', fit: 'body', pref: ['low'] }, []]]) {
      const pn = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
      await pn.page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
      await pn.page.evaluate(([dr]) => openDressPicker(dr, {}), [{ attire: '대여 희망 · 2벌', open: true, ymd: '', saved: { picks, names: [], ans, memo: '', at: '' } }]);
      const fn = await (await pn.page.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame();
      await fn.waitForSelector('.pk-band', { timeout: 15000 }); await pn.page.waitForTimeout(250);
      const cn = await cutLines(fn); cutViews++;
      if (cn === null) no(`${tag} 겹화면 결과(${nm}) — 막대를 못 찾았다`); else if (cn.length) cut.push(`겹화면 결과(${nm}) ${JSON.stringify(cn)}`);
      if (pn.errors.length) no(`${tag} 겹화면(${nm}) 페이지 오류 ${pn.errors.length} · ${pn.errors[0]}`);
      await pn.page.close();
    }
    if ((W === 390 && H === 844) || W === 1280) {
      const ps = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
      for (const id of ids6) {   // [DRESS_Q_FIRST] 단독은 답이 없어 물음부터 — 자세히(&open=)만 잰다(결과는 겹화면에서 잰다)
        await ps.page.goto(`http://localhost:${PORT}/dress.html?pick=1&open=${id}`, { waitUntil: 'load', timeout: 30000 });
        await ps.page.waitForSelector('.dv-nm', { timeout: 15000 });
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
  /* ★★[DRESS_STICKER 2026-10-24 코워크 설계 명세] 상담 카드 스티커 — 7폭(360 · 390 · 430 · 768 · 820 · 1024 · 1280) × (확정 0벌 · 확정 2벌 · 일정 선택 전)
     «방문 전 안내»(일정 선택 전은 «진행 흐름») 제목 · «상담 장소» 줄을 비롯해 카드 안 글과 겹침 0 · 누름 칸 44px 이상 · 가로 넘침 0 ·
     그린 뒤 자리 흔들림 0(글꼴 · 그림이 늦게 와도) · 크기 56 · 64 · 76 · 88 · 폰(768 미만)은 폰 자리(구분선 1/4 걸침) · 알약은 2벌에만(폰은 스티커 칸 안) ·
     따로 카드(#mp_dress)는 비어 있다. 실제 마이페이지 칸(#mp_consult)에 renderConsult 로 그려 잰다(로그인 없이 · 같은 폭) */
  {
    const ST_W = [360, 390, 430, 768, 820, 1024, 1280];
    const LIST = ['신청접수', '상담확정', '시착', '상담완료'];
    const mkSt = (kind) => { const pre = kind === 'pre';
      return { product: '시그니처', code: 'ME-T', stage: pre ? '신청접수' : '상담확정', stageList: LIST, isException: false,
        consult: pre ? { status: '신청접수', scheduleUrl: 'x', dress: { attire: '대여 희망 · 2벌', open: true, ymd: '', saved: null } }
          : { status: '승인완료', date: '2026년 11월 3일 (화)', time: '14:00', canChange: true, canCancel: true, deposit: { amount: 100000, confirmed: true },
              dress: { attire: '대여 희망 · 2벌', open: true, ymd: '2026-11-03', saved: kind === 'two' ? { picks: ['S01', 'S02'], names: [], ans: { len: 'ankle', fit: 'body', pref: ['low'] }, memo: '' } : null } } }; };
    const stRows = [];
    for (const kind of ['zero', 'two', 'pre']) for (const W of ST_W) {
      const tag = `스티커 ${kind} ${W}`;
      const ps = await eng.newPage({ port: PORT, viewport: { width: W, height: 900 } });
      await ps.page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
      const at = (m) => ps.page.evaluate(() => { const st = document.querySelector('#mp_consult .dst'); if (!st) return null;
        const card = st.closest('.consult-card'), vg = st.parentNode, C0 = card.getBoundingClientRect(), sb = st.getBoundingClientRect(), box = st.querySelector('.dst-box').getBoundingClientRect();
        const hits = []; const rg = document.createRange(); const w = document.createTreeWalker(card, NodeFilter.SHOW_TEXT);
        const shape = (typeof _dstVis === 'function') ? _dstVis(st).rest.concat([st.querySelector('.dst-lb').getBoundingClientRect()]) : [sb];   // ★[STICKER_HIT_SHAPE] 드레스 윤곽(쉼 −3°) · 글 — 그림 칸의 투명한 모서리는 보지 않는다(누름도 받지 않는다)
        for (let t = w.nextNode(); t; t = w.nextNode()) { if (!/\S/.test(t.nodeValue) || st.contains(t)) continue; rg.selectNodeContents(t);
          for (const r of rg.getClientRects()) if (r.width >= 1 && shape.some((b) => r.right > b.left && r.left < b.right && r.bottom > b.top && r.top < b.bottom)) hits.push(t.nodeValue.trim().slice(0, 12)); }
        const tapTop = (() => { const b = st.querySelector('.dst-box').getBoundingClientRect(), e = document.elementFromPoint(b.left + 2, b.top + b.height - 2); return e ? (st.contains(e) ? 'dst' : (e.className || e.tagName)) : ''; })();   // 그림 칸 왼쪽 아래 모서리(투명) = 단추가 아니다
        const txt = () => { const o = []; const w2 = document.createTreeWalker(card, NodeFilter.SHOW_TEXT); for (let t = w2.nextNode(); t; t = w2.nextNode()) { if (!/\S/.test(t.nodeValue) || st.contains(t)) continue; const r2 = document.createRange(); r2.selectNodeContents(t); for (const q of r2.getClientRects()) o.push([q.left, q.top, q.width, q.height].map((v) => Math.round(v * 10) / 10).join(',')); } return o.join('|') + '#' + card.getBoundingClientRect().height; };
        const withSt = txt(); st.style.display = 'none'; const noSt = txt(); st.style.display = '';   // ★[STICKER_NO_REFLOW] 스티커가 있을 때와 없을 때 카드 글 상자가 같아야 한다
        const pill = st.querySelector('.dst-pill'), pr = pill && pill.getBoundingClientRect(), lb = st.querySelector('.dst-lb').getBoundingClientRect();
        const lbR = st.querySelector('.dst-lb').getBoundingClientRect();
        const v = (typeof _dstVis === 'function') ? _dstVis(st) : null, cr = card.getBoundingClientRect();   // ★[STICKER_VIS_EDGE] 기운 드레스 · 그림자 · 알약 · 진행 점
        const dots = [...document.querySelectorAll('span,i,div,li')].filter((e) => { const r = e.getBoundingClientRect(); return !e.children.length && r.width > 3 && r.width < 16 && r.height > 3 && r.height < 16 && r.bottom <= cr.top && v && r.right > v.left && r.left < v.right; }).map((e) => e.getBoundingClientRect().bottom);
        const vis = v ? { l: v.left, r: v.right, t: v.top, dress: v.dress, lbL: lbR.left, lbR: lbR.right, lbAt: st.querySelector('.dst-lb').getAttribute('data-at'), dotB: dots.length ? Math.max(...dots) : -1e9 } : null;
        return { reflow: withSt !== noSt, pm: st.classList.contains('dst-pm'), cardW: Math.round(C0.width), mode: st.getAttribute('data-at') || '?', inView: lbR.left >= 4 && lbR.right <= innerWidth - 4, tapTop, inCard: st.parentNode === card, pos: [sb.left - C0.left, sb.top - C0.top, sb.width, sb.height].map(Math.round).join(','), cardH: Math.round(C0.height),
          w: sb.width, h: sb.height, box: Math.round(box.width), hits, ow: document.documentElement.scrollWidth - innerWidth, lbH: lb.height,
          overDiv: Math.round(vg.getBoundingClientRect().top - box.top), pill: pill ? pill.textContent : '', pillIn: pill ? (Math.abs(pr.right - box.right) <= 0.5 && pr.top >= box.top - 6.5 && pr.top <= box.top + 2.5 && pr.height <= 18.5 && pr.width >= 23.5) : true,
          dressCard: (document.getElementById('mp_dress') || {}).innerHTML || '', vis }; });
      await ps.page.evaluate((d) => { const v = document.getElementById('mp_consult'); for (let e = v; e && e !== document.body; e = e.parentElement) if (getComputedStyle(e).display === 'none') e.style.display = 'block';
        renderConsult(d.consult, d.product, d); renderDress(d); }, mkSt(kind));
      const m0 = await at(); await ps.page.waitForTimeout(900); const m = await at();
      if (!m) { no(`${tag} 스티커가 없다 [DRESS_STICKER]`); await ps.page.close(); continue; }
      const want = W < 375 ? 72 : W < 414 ? 76 : W < 768 ? 80 : W < 820 ? 84 : W < 1024 ? 88 : W < 1280 ? 92 : 96;   // [STICKER_FINISH_1024] 폭마다 고정
      const bad = [];
      if (m.hits.length) bad.push(`글과 겹침 ${m.hits.join('|')}`);
      if (m.w < 44 || m.h < 44) bad.push(`누름 칸 ${m.w}×${m.h}`);
      if (m.ow > 0) bad.push(`가로 넘침 ${m.ow}`);
      if (m0.pos !== m.pos || m0.cardH !== m.cardH) bad.push(`자리 흔들림 ${m0.pos}→${m.pos} · 카드 ${m0.cardH}→${m.cardH}`);
      if (m.box !== want) bad.push(`크기 ${m.box}(이 폭은 ${want})`);
      if (m.reflow) bad.push('스티커 때문에 카드 글 자리 · 폭 · 줄바꿈이 바뀌었다 [STICKER_NO_REFLOW]');
      if ((W < 768) !== m.pm) bad.push(`글 모양 — 폰은 옷걸이 왼쪽 위 11.5px · 넓으면 그림 아래 12px (${m.pm ? '폰' : '넓은 화면'}) [STICKER_LABEL_HANG]`);
      if (m.tapTop === 'dst') bad.push('그림 칸의 투명한 모서리가 누름을 받는다 [STICKER_HIT_SHAPE]');
      if (m.lbH > 22) bad.push(`글이 한 줄이 아니다(${m.lbH}px · 알약은 위아래 1px)`);
      if (!m.inCard) bad.push('스티커가 상담 카드 머리에 있지 않다 [DRESS_STICKER_HEAD]');
      if (m.mode === 'none' || m.mode === '?') bad.push(`맞는 자리를 못 찾았다(${m.mode})`);
      if (m.cardW >= 500 && W >= 768 && m.mode !== 'in') bad.push(`768+ 넓은 카드는 카드 안이어야 한다(${m.mode} · 카드 ${m.cardW}px)`);
      if (W < 768 && m.mode !== 'edge') bad.push(`폰은 모서리 걸침이어야 한다(${m.mode})`);
      if (!m.inView) bad.push('스티커 · 글이 화면 밖');
      if ((kind === 'two') !== (m.pill === '2벌')) bad.push(`알약 «${m.pill}»`);
      if (!m.pillIn) bad.push('«n벌»이 고리 오른쪽 옆(칸 위 −6 ~ +2 · 오른쪽 끝 맞춤 · 24×18)이 아니다');   // [DRESS_STICKER_HEAD] 자리는 겹침으로 — 안쪽 모서리(in) · 모서리 걸침(edge) · 글은 그대로
      { const v = m.vis, M = W < 768 ? 16 : W < 1024 ? 24 : 32;   // ★[STICKER_VIS_EDGE] 기운 드레스(흔들림 포함) · 그림자 · 글이 화면 끝 16 · 24 · 32px 안 · 보이는 드레스 56 이상 · 진행 점과 겹침 0
        if (!v) bad.push('보이는 드레스를 잴 수 없다(_dstVis 없음)');
        else { if (v.r > W - M + 0.5 || v.l < M) bad.push(`기운 드레스 · 그림자가 화면 끝 ${M}px 밖(${Math.round(v.l)}~${Math.round(v.r)} / ${W})`);
          if (v.lbR > W - M || v.lbL < M) bad.push(`글이 화면 끝 ${M}px 밖(${Math.round(v.lbL)}~${Math.round(v.lbR)})`);
          if (v.dress < 56 - 0.01) bad.push(`보이는 드레스 ${v.dress.toFixed(1)}px(56 아래)`);
          if (v.t < v.dotB) bad.push(`진행 점과 겹친다(드레스 위 ${Math.round(v.t)} · 점 아래 ${Math.round(v.dotB)})`); } }
      if (m.dressCard) bad.push('따로 카드가 다시 그려졌다');
      if (ps.errors.length) bad.push(`페이지 오류 ${ps.errors[0]}`);
      stRows.push(`${W}/${kind}=${m.mode}`);
      if (bad.length) no(`${tag} — ${bad.join(' · ')} [DRESS_STICKER]`);
      await ps.page.close();
    }
    rows.push(`스티커 자리 ${stRows.join(' ')}`);
  }
  // ★[DRESS_BACK_STEP 코워크 디자인 라운드 2 · 1] 휴대폰 뒤로가기 = 겹화면 안에서 한 걸음(390×844 · 마이페이지 겹화면)
  {
    const pb = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
    const P = pb.page;
    await P.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load', timeout: 30000 });
    const open = async (demo, dr) => { await P.evaluate(([dr, demo]) => openDressPicker(dr, demo ? { demo: true } : {}), [dr || DR, demo]); const fr = await (await P.waitForSelector('#mp_drFrame', { timeout: 15000 })).contentFrame(); await fr.waitForSelector('.pk-band, .pk-q', { timeout: 15000 }); await P.waitForTimeout(250); return fr; };
    const look = (fr) => fr.evaluate(() => ({ list: !!document.querySelector('.pk-main .pk-band'), detail: (document.querySelector('.dv-nm') || {}).textContent || '', q: (document.getElementById('pkQ') || {}).textContent || '', y: Math.round(window.pageYOffset), focus: document.activeElement ? (document.activeElement.getAttribute('data-open') || '') : '' })).catch(() => ({ gone: true }));   // 겹화면이 닫혔으면(옛 동작 · 뒤로가기 = 통째 닫기) gone
    const back = async (ms = 500) => { await P.evaluate(() => history.back()); await P.waitForTimeout(ms); };
    const rows2 = [];
    const QS = await P.evaluate(() => window.DRESS_REFS.questions.map((q) => q.q));
    try {
    let fr = await open(false);
    /* [DRESS_Q_FIRST] 열면 물음 1 — 셋을 답해 결과로 · 펼쳐서 읽던 자리를 만든다 */
    const q0 = await look(fr);
    if (q0.q !== QS[0]) { no(`뒤로가기 — 처음 연 겹화면이 물음 1 이 아니다 ${JSON.stringify(q0)} [DRESS_Q_FIRST]`); throw new Error('stop'); }
    await fr.click('.pk-opt[data-a="ankle"]'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt[data-a="body"]'); await fr.click('.wz-bar [data-go="1"]'); await fr.click('.pk-opt[data-a="low"]'); await fr.click('.wz-bar [data-go="1"]'); await P.waitForTimeout(150);
    await expand(fr); await P.waitForTimeout(80);
    await fr.evaluate(() => window.scrollTo(0, 300)); await P.waitForTimeout(120);
    const y0 = await fr.evaluate(() => Math.round(window.pageYOffset));
    const id3 = await fr.evaluate(() => { const c = document.querySelectorAll('.pk-main [data-open]')[2]; c.click(); return c.getAttribute('data-open'); }); await P.waitForTimeout(250);
    const a = await look(fr); await back(); const b2 = await look(fr);
    rows2.push(`자세히 «${a.detail}» → 뒤로 = ${b2.list ? '목록' : '?'} · 자리 ${y0} → ${b2.y} · 초점 ${b2.focus}`);
    if (!a.detail || !b2.list || b2.y !== y0 || b2.focus !== id3) { no(`뒤로가기 — 자세히 → 목록(읽던 자리 ${y0} · 그 칸 초점)이 아니다 ${b2.gone ? '— 겹화면이 통째로 닫혔다' : JSON.stringify(b2)} [DRESS_BACK_STEP]`); throw new Error('stop'); }
    /* ★[DRESS_Q_FIRST] 결과 → 물음 3 → 2 → 1 → 닫기 판단 */
    await back(); const q3 = await look(fr); await back(); const q2 = await look(fr); await back(); const q1 = await look(fr);
    rows2.push(`결과 → 뒤로 = 물음 «${q3.q}» → «${q2.q}» → «${q1.q}»`);
    if (q3.q !== QS[2] || q2.q !== QS[1] || q1.q !== QS[0]) { no(`뒤로가기 — 결과 → 물음 3 → 2 → 1 이 아니다 ${JSON.stringify([q3.q || q3, q2.q || q2, q1.q || q1])} [DRESS_BACK_STEP · DRESS_Q_FIRST]`); throw new Error('stop'); }
    await back(900);
    const gone = !(await P.$('#mp_drFrame')), path1 = await P.evaluate(() => location.pathname);
    rows2.push(`물음 1(바뀐 것 없음) → 뒤로 = 겹화면 ${gone ? '닫힘' : '그대로'} · ${path1}`);
    if (!gone || !/\/mypage\.html$/.test(path1)) no(`뒤로가기 — 물음 1 에서(바뀐 것 없음) 겹화면이 닫히지 않았거나 마이페이지를 떠났다 [DRESS_BACK_STEP]`);
    fr = await open(true, DRA);
    const f1 = await fr.evaluate(() => document.querySelector('.pk-main [data-open]').getAttribute('data-open'));
    await fr.click(`.pk-main [data-open="${f1}"]`); await P.waitForTimeout(150);
    const nb1 = await fr.evaluate(() => { const g = (s) => { const e = document.querySelector(s); return e ? { t: e.textContent.replace(/ /g, ' '), h: Math.round(e.getBoundingClientRect().height) } : null; }; return { prev: g('.pk-nb-p'), next: g('.pk-nb-n') }; });
    await fr.click('.pk-nb-n'); await P.waitForTimeout(150);
    const n2 = await look(fr);
    const want2 = await P.evaluate((id) => { const R = window.DRESS_REFS, rk = R.rank({ len: 'ankle', fit: 'body', pref: ['none'] }, R.list()), ids = rk.match.concat(rk.rest).map((x) => x.id); return R.dress(ids[ids.indexOf(id) + 1]).name; }, f1);   // [DRESS_RESULT_SPLIT] 화면 순서(맞는 칸이 둘 이상이라 첫 칸의 다음은 같다)
    rows2.push(`첫 드레스 이웃 줄 ${JSON.stringify(nb1)} → 다음 = «${n2.detail}»`);
    if (nb1.prev || !nb1.next || nb1.next.t !== '다음 드레스 ›' || nb1.next.h < 44 || n2.detail !== want2) no(`이웃 넘기기 — 첫 드레스는 «다음 드레스 ›»만(44px) · 누르면 목록 다음 드레스가 아니다 ${JSON.stringify(nb1)} «${n2.detail}» [DRESS_NEXT_PREV]`);
    await fr.click('.pk-ctl [data-act="pick"]'); await fr.click('.pk-main [data-act="list"]'); await P.waitForTimeout(150);
    await back(); await back(); await back(); await back(700);   // [DRESS_Q_FIRST] 결과 → 물음 3 → 2 → 1 → 판
    const dlg = await P.evaluate(() => { const m = document.getElementById('mpModal'); return m && m.classList.contains('open') ? m.innerText.replace(/\s+/g, ' ').slice(0, 30) : ''; });
    rows2.push(`고른 뒤 결과 → 물음 3 · 2 · 1 → 뒤로 = 판 «${dlg}»`);
    if (!/저장하지 않은 변경이 있어요/.test(dlg) || !(await P.$('#mp_drFrame'))) no(`뒤로가기 — 고른 뒤 물음 1 에서 «저장하지 않은 변경이 있어요» 판이 아니다(${dlg}) [DRESS_BACK_STEP]`);
    } catch (e) { if (e.message !== 'stop') no(`뒤로가기 검사가 끝까지 돌지 못했다 — ${String(e.message).split('\n')[0]} [DRESS_BACK_STEP]`); }
    if (pb.errors.length) no(`뒤로가기 검사 페이지 오류 ${pb.errors.length} · ${pb.errors[0]}`);
    rows.push('390×844 뒤로가기: ' + rows2.join(' · '));
    await P.close();
  }
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
console.log(`━━ dress-fit — 통과 · 열면 물음 1(답해야 다음 · 건너뛰기 없음) · 결과 «답에 맞는 드레스» → «다른 드레스도 보기» → 펼침 · 두 벌 찬 뒤 바꾸기 · 막대 작은 사진 = 자세히 · 답 바꾸기 뒤 두 벌 그대로 · 세 크기 × 네 상태 모두 단추가 막대 위 · 진한 단추 하나 · 넘김은 사진 있는 장만 · 단독 완료 화면에 저장 단추 없음 · 여섯 크기 첫 화면 막대 선에 걸린 글줄 0 · 뒤로가기 한 걸음(자세히 → 목록 · 물음 3 → 2 → 1 → 목록 · 목록 → 나가기 판단) · 이웃 넘기기 · 공개 주소는 마이페이지로 [DRESS_DETAIL_FIT · DRESS_BAR_FIT · DRESS_BACK_STEP]`);
