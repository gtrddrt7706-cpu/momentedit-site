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
 *     375×667(작은 폰)은 «참고»로만 찍는다 — 코워크 기준 밖이라 빨강으로 세지 않는다.
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
    await page.click('[data-act="browse"]');   // [DRESS_SKIP_Q] 질문 없이 바로 보기
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
    if (gate && a && (a.slides !== 1 || a.nav || a.cnt)) no(`${tag} 사진 없는 표본인데 넘김(‹ › · n / 5)이 있다 — 장 ${a.slides}([DRESS_SLIDES])`);
    if (gate && errors.length) no(`${tag} 페이지 오류 ${errors.length} · ${errors[0]}`);
    await page.close();
    // ── 사진을 넣은 사본 — 넘김은 사진 칸 안
    PHOTOS = true;
    const p2 = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await p2.page.goto(`http://localhost:${PORT}/dress.html?pick=1`, { waitUntil: 'networkidle', timeout: 30000 });
    await p2.page.click('[data-act="browse"]');
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
} finally {
  await eng.close();
  srv.close();
}
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-fit — 실패 ${bad}건 [DRESS_DETAIL_FIT]`); process.exit(1); }
console.log(`━━ dress-fit — 통과 · 세 크기 × 네 상태 모두 단추가 막대 위 · 진한 단추 하나 · 넘김은 사진 있는 장만 [DRESS_DETAIL_FIT]`);
