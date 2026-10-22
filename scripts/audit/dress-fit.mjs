#!/usr/bin/env node
/* ★[DRESS_DETAIL_FIT 2026-10-23 코워크 검토 2 «시착 준비»] 고르기 화면 «자세히» 첫 화면에서 고르는 단추가 아래 막대에 가리지 않는지 «숫자로» 잰다.
 *
 *   왜 — 검토 1 에서 아래 막대(#pkBar)를 화면에 붙이자, 사진 아래에 있던 «입어 볼 드레스로 고르기»가 막대 뒤로 숨었다
 *        (390×844 단추 top 789 · 막대 top 707). 막대만 보면 누를 수 없는 «두 벌을 골라 주세요»뿐이라 어디서 고르는지 몰랐다.
 *        단추 자리는 사진 크기 · 글 길이 · 막대 높이가 함께 정한다 — 눈대중이 아니라 세 화면 크기에서 잰다.
 *
 *   잰다 — 390×844 · 390×740 · 1280×900 에서 «자세히» 첫 화면(스크롤 0)의 세 상태
 *     ① 아직 안 고름 «입어 볼 드레스로 고르기» ② 고름 «Nº 01 고른 드레스예요 · 빼기» ③ 두 칸이 다 참 «… 다 찼어요» 줄
 *     기준: 그 아래 끝 ≤ 막대 위 끝. 덤으로 가로 넘침 0 · 페이지 오류 0 · 사진 넘김(‹ › · n / 5)이 사진 안에 있다.
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

const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
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
    const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: H } });
    await page.goto(`http://localhost:${PORT}/dress.html?pick=1`, { waitUntil: 'networkidle', timeout: 30000 });
    // 자세히 첫 화면 한 장의 숫자(스크롤 0) — 단추 아래 끝 · 막대 위 끝 · 사진 높이
    const shot = (sel) => page.evaluate((s) => {
      window.scrollTo(0, 0);
      const c = document.querySelector(s), b = document.querySelector('.wz-bar'), v = document.querySelector('.pk-main .dv-strip');
      if (!c || !b) return null;
      const x = c.getBoundingClientRect(), y = b.getBoundingClientRect();
      const nav = document.querySelector('.pk-main .dv-view .dv-next'), vr = v ? v.getBoundingClientRect() : null, nr = nav ? nav.getBoundingClientRect() : null;
      return { ctlTop: Math.round(x.top), ctlBottom: Math.round(x.bottom), barTop: Math.round(y.top), photoH: vr ? Math.round(vr.height) : 0,
        navIn: !!(nr && vr && nr.top >= vr.top && nr.bottom <= vr.bottom && nr.left >= vr.left && nr.right <= vr.right),
        over: document.documentElement.scrollWidth > window.innerWidth };
    }, sel);
    const tag = `${W}×${H}`;
    await page.click('[data-act="browse"]');
    const ids = await page.$$eval('.pk-main [data-open]', (els) => els.map((e) => e.getAttribute('data-open')));
    if (ids.length < 3) { no(`${tag} 드레스 칸이 셋보다 적다(${ids.length}) — 표본이 안 그려졌다`); await page.close(); continue; }
    const open = async (id) => { await page.evaluate((i) => { const b = document.querySelector('.pk-main [data-act="list"]'); if (b) b.click(); }, null); await page.click(`.pk-main [data-open="${id}"]`); };
    // ① 아직 안 고름
    await page.click(`.pk-main [data-open="${ids[0]}"]`);
    const a = await shot('.pk-ctl [data-act="pick"]');
    // ② 고름(고른 줄 · 빼기)
    await page.click('.pk-ctl [data-act="pick"]');
    const b = await shot('.pk-ctl .pk-picked');
    // ③ 두 칸이 다 참 — 둘째를 고르고 셋째를 연다
    await open(ids[1]); await page.click('.pk-ctl [data-act="pick"]');
    await open(ids[2]);
    const c = await shot('.pk-ctl .pk-full');
    const st = [['고르기 단추', a], ['고른 줄 · 빼기', b], ['다 찼어요 줄', c]];
    for (const [nm, m] of st) {
      if (!m) { if (gate) no(`${tag} ${nm} — 찾지 못했다`); continue; }
      rows.push(`${tag} ${nm}: 아래 끝 ${m.ctlBottom} · 막대 위 끝 ${m.barTop} · 사진 ${m.photoH}px${gate ? '' : ' (참고)'}`);
      if (gate && m.ctlBottom > m.barTop) no(`${tag} ${nm}이 막대에 가린다 — 아래 끝 ${m.ctlBottom} > 막대 위 끝 ${m.barTop}`);
      if (gate && m.over) no(`${tag} 가로 넘침`);
    }
    if (gate && a && !a.navIn) no(`${tag} 사진 넘김(›)이 사진 칸 안에 있지 않다 — 사진 아래 줄로 돌아가면 단추가 다시 내려간다`);
    if (gate && errors.length) no(`${tag} 페이지 오류 ${errors.length} · ${errors[0]}`);
    await page.close();
  }
} finally {
  await eng.close();
  srv.close();
}
if (process.argv.includes('--print') || bad) rows.forEach((r) => console.log('   · ' + r));
if (bad) { console.log(`━━ dress-fit — 실패 ${bad}건 [DRESS_DETAIL_FIT]`); process.exit(1); }
console.log(`━━ dress-fit — 통과 · 세 크기 × 세 상태 모두 단추가 막대 위 [DRESS_DETAIL_FIT]`);
