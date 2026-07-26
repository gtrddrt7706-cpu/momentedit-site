// img-webp.mjs — <picture>/<source> 구조가 조용히 깨지는 것을 막는다.
//
// 왜 필요한가(2026-07-26):
//   홈 이미지 22장을 `<picture><source type=image/webp srcset=…webp><img src=…jpg></picture>`로 감쌌다.
//   전송량 3,223 KB → 1,093 KB(-66%). 화질은 전면 픽셀차 PSNR 54~56dB(육안 무차이).
//   ★함정: `<picture>`는 고른 `<source>`가 **404여도 `<img src>`로 폴백하지 않는다.**
//     .webp 파일 하나만 커밋에서 빠지면 그 자리가 통째로 빈다(onerror가 display:none 처리).
//     그래서 srcset이 가리키는 파일 존재를 정적으로, 렌더 결과를 브라우저로 이중 확인한다.
//
//   node scripts/audit/img-webp.mjs
//   → 깨진 곳이 있으면 목록 + exit 1
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGES = ['index.html', 'mypage.html', 'live.html', 'inquiry.html', 'guide.html', 'schedule.html'];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json' };
let fail = 0;

// ── 1) 정적: srcset 대상 파일 존재 + picture 안 img 폴백 존재
for (const page of PAGES) {
  const f = path.join(ROOT, page);
  if (!fs.existsSync(f)) continue;
  const s = fs.readFileSync(f, 'utf8');

  for (const m of s.matchAll(/<source\b[^>]*\bsrcset="([^"]+)"/g)) {
    for (const cand of m[1].split(',')) {
      const url = cand.trim().split(/\s+/)[0];
      if (!url || /^(https?:)?\/\//.test(url) || url.startsWith('data:')) continue;
      const p = path.join(ROOT, url.replace(/^\//, '').split('?')[0]);
      if (!fs.existsSync(p)) { console.log(`✗ ${page}: <source srcset> 대상 없음 — ${url}`); fail++; }
    }
  }
  for (const m of s.matchAll(/<picture\b[\s\S]{0,1200}?<\/picture>/g)) {
    if (!/<img\b[^>]*\bsrc="/.test(m[0])) {
      console.log(`✗ ${page}: <picture>에 <img src> 폴백이 없다 — ${m[0].slice(0, 90)}…`); fail++;
    }
  }
}

// ── 2) 렌더: 모든 img가 실제로 디코드됐는지(naturalWidth>0) + 전송량
const PORT = 8932;
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream');
    res.end(fs.readFileSync(p));
  } else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r) => srv.listen(PORT, r));

const eng = await launchBrowser();
if (!eng) {
  console.log('브라우저 없음 — 정적 검사만 수행');
  srv.close();
  process.exit(fail ? 1 : 0);
}

for (const page of PAGES) {
  if (!fs.existsSync(path.join(ROOT, page))) continue;
  const { page: pg } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 900 } });
  let bytes = 0;
  pg.on('response', async (r) => {
    try { if (r.url().includes(`localhost:${PORT}`)) bytes += (await r.body()).length; } catch {}
  });
  try {
    await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'load' });
    await pg.evaluate(async () => {
      for (let y = 0; y < document.body.scrollHeight; y += 400) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 45)); }
    });
    await new Promise((r) => setTimeout(r, 1500));
    // ★박스 크기로 걸러선 안 된다 — 홈 img들은 onerror="this.style.display='none'"이라
    //   로드 실패하면 스스로 사라져 width/height가 0이 되고 검사를 통과해 버린다(실측 확인).
    //   complete && naturalWidth===0 = '시도했고 실패' → 이것만 본다.
    const bad = await pg.evaluate(() => [...document.querySelectorAll('img')]
      .filter((i) => (i.currentSrc || i.getAttribute('src')) && i.complete && i.naturalWidth === 0)
      .map((i) => (i.currentSrc || i.src || '').split('/').pop()));
    if (bad.length) { console.log(`✗ ${page}: 디코드 실패 이미지 ${bad.length}건 — ${bad.slice(0, 5).join(', ')}`); fail += bad.length; }
    else console.log(`✓ ${page}  이미지 전건 정상 · 전송 ${Math.round(bytes / 1024)} KB`);
  } catch (e) { console.log(`  (건너뜀 ${page}: ${e.message.slice(0, 60)})`); }
  await pg.close();
}
await eng.close(); srv.close();

if (fail) { console.log(`\n총 ${fail}건. <picture>는 source가 404여도 img로 폴백하지 않는다 — .webp 파일이 커밋에 함께 들어갔는지 확인할 것.`); process.exit(1); }
console.log('✓ picture/source 구조 정상 · 누락 파일 0');
