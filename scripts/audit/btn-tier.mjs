// btn-tier.mjs — 홈 버튼 2단 체계가 다시 어긋나는 것을 막는다. (2026-07-26 BTN_TIER)
//
// 배경: '어른께 드리는 안내 보기' 버튼이 주 CTA와 같은 색·같은 폭·같은 채움인데
//   높이 55(vs 60) · 글자 13px(vs 15.5) · 라운드 3px(vs 4) · 패딩 15/22(vs 20/48)로
//   전 축이 미세하게 어긋나 있었다. '같은 급'으로 읽히면서 '덜 만든 것'처럼 보이는 상태.
//   → 체계를 세웠다: **채움 마룬 = 전환(inquiry.html) · 외곽 마룬 = 보조 이동(parents.html)**
//     규격(글자·총높이·라운드)은 둘이 같고 채움 여부만 다르다.
//     ★외곽은 테두리 1px×2가 더해지므로 패딩을 19px로 둬야 총높이가 60으로 같아진다.
//
//   node scripts/audit/btn-tier.mjs   → 어긋나면 목록 + exit 1
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json' };
const PORT = 8933;
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) { res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream'); res.end(fs.readFileSync(p)); }
  else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r) => srv.listen(PORT, r));
const eng = await launchBrowser();
if (!eng) { console.log('브라우저 없음 — 건너뜀'); srv.close(); process.exit(0); }

let fail = 0;
for (const W of [390, 768, 1280]) {
  const { page: pg } = await eng.newPage({ port: PORT, viewport: { width: W, height: 900 } });
  await pg.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await pg.addStyleTag({ content: '.reveal{opacity:1!important;transform:none!important}' });
  await pg.evaluate(async () => { for (let y = 0; y < document.body.scrollHeight; y += 500) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 30)); } window.scrollTo(0, 0); });
  await new Promise((r) => setTimeout(r, 700));
  const R = await pg.evaluate(() => {
    const seal = 'rgb(107, 42, 36)';
    const pick = (sel) => [...document.querySelectorAll(sel)].filter((e) => { const b = e.getBoundingClientRect(); return b.width > 0 && b.height > 0; })
      .map((e) => { const c = getComputedStyle(e), b = e.getBoundingClientRect();
        return { h: Math.round(b.height), fs: c.fontSize, r: c.borderTopLeftRadius, bg: c.backgroundColor, bd: c.borderTopColor,
                 arrow: /[→↗]/.test(e.textContent || '') }; });
    return { filled: pick('.cta-btn'), outline: pick('.journal-guide-link'), seal };
  });
  const f = R.filled, o = R.outline;
  const say = (m) => { console.log(`✗ ${W}px — ${m}`); fail++; };
  if (f.length !== 3) say(`채움 전환 버튼이 3개가 아니다(${f.length}개)`);
  /* ★[TIER_COUNT 2026-08-10 점검] 외곽 개수를 1로 박아 뒀던 것을 푼다 — **검사가 낡았던 것이다.**
     2026-08-01 에 청첩장 미리보기 CTA 를 .journal-guide-link 로 통일했다(index.html:4606 주석에
     그 결정이 적혀 있다). 그때부터 외곽은 정당하게 2개인데 검사는 1을 기대해 **9일간 빨간 채**였다.
     아무도 못 본 이유는 이 검사를 도는 게이트가 없어서다 — check-tap-targets 와 같은 자리다.
     ★이 검사의 뜻은 개수가 아니라 **2단 체계가 유지되는가**다(규격 동일 · 채움 여부만 다름 ·
       화살표는 외곽에만). 개수는 화면이 자라면 늘어난다. 뜻을 지키고 수는 풀어 준다.
     ★대신 '하나도 없음'은 여전히 실패다 — 보조 이동이 통째로 사라진 것이니 알아야 한다.
     실측 2026-08-10(390·1280): 채움 3 · 외곽 2 · 다섯 전부 h=58 · fs=14px · r=4px. */
  const uniq = (a, k) => [...new Set(a.map((x) => x[k]))];
  const spec = (a) => [...new Set(a.map((x) => `h${x.h}/${x.fs}/${x.r}`))];
  if (!o.length) say('외곽 보조 버튼이 하나도 없다 — 2단 체계의 한 축이 사라졌다');
  if (spec(o).length > 1) say(`외곽 보조 버튼끼리 규격이 다르다: ${spec(o).join(' / ')}`);
  if (uniq(f, 'h').length > 1) say(`채움 버튼 높이가 서로 다르다: ${uniq(f, 'h').join('/')}`);
  if (uniq(f, 'fs').length > 1) say(`채움 버튼 글자 크기가 서로 다르다: ${uniq(f, 'fs').join('/')}`);
  if (f[0] && o[0]) {
    if (f[0].h !== o[0].h) say(`채움(${f[0].h}px)과 외곽(${o[0].h}px) 총높이가 다르다 — 외곽은 테두리 1px×2를 패딩에서 빼야 한다`);
    if (f[0].fs !== o[0].fs) say(`글자 크기가 다르다: 채움 ${f[0].fs} / 외곽 ${o[0].fs}`);
    if (f[0].r !== o[0].r) say(`라운드가 다르다: 채움 ${f[0].r} / 외곽 ${o[0].r}`);
    if (o[0].bg === R.seal) say('외곽 버튼이 채움으로 되돌아갔다 — 전환 버튼이 4개가 된다');
    if (!o[0].arrow) say('외곽 버튼의 화살표(→)가 사라졌다 — 페이지 이동 신호');
    if (f.some((x) => x.arrow)) say('채움 전환 버튼에 화살표가 붙었다 — 화살표는 보조 이동 전용');
  }
  if (!fail) console.log(`✓ ${W}px  채움 ${f.length}개 ${f[0] && f[0].h}px/${f[0] && f[0].fs} · 외곽 1개 동일 규격 · 화살표 규칙 정상`);
  await pg.close();
}
await eng.close(); srv.close();
if (fail) { console.log(`\n총 ${fail}건. 규칙: 채움=전환(inquiry) / 외곽=보조 이동(parents) · 규격은 같고 채움만 다름 · 화살표는 외곽에만.`); process.exit(1); }
console.log('✓ 버튼 2단 체계 정상');
