// br-glue.mjs — 모바일에서 `<br>`이 display:none 되며 앞뒤 문장이 공백 없이 붙는 것을 잡는다.
//
// 배경(2026-07-26 실사고): index.html은 데스크탑용 편집 줄바꿈을 `<br>`로 넣고
//   `.t-body br{display:none}` · `.seq-desc br{display:none}` 로 모바일에서만 해제한다.
//   그런데 `display:none`은 줄바꿈을 '공백으로' 바꾸지 않고 그냥 없앤다.
//   소스가 `…화이트존,<br>두 공간을…` 이면 모바일에서 `…화이트존,두 공간을…` 로 붙어 오타처럼 보인다.
//   실제로 9곳이 이 상태였다(390px 8곳 · 768px 1곳).
//
// 처방은 소스에서 `<br>` **앞에 공백 한 칸**을 두는 것뿐이다.
//   데스크탑: 줄 끝 공백이라 보이지 않음 / 모바일: br이 사라져도 공백이 남아 문장이 정상 분리.
//
// 이 스크립트는 정적 문자열 검사가 아니라 **실제 렌더**에서 `display:none`이 된 br만 본다
//   (사이트 전체 br 177개를 다 잡으면 소음이라, 진짜 물릴 수 있는 것만 본다).
//
//   node scripts/audit/br-glue.mjs
//   → 붙는 곳이 있으면 목록 출력 + exit 1
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const PAGES = ['index.html', 'mypage.html', 'live.html', 'schedule.html', 'inquiry.html', 'guide.html', 'seat.html'];
const WIDTHS = [360, 390, 430, 768, 1024];
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.json': 'application/json' };

const PORT = 8931;
const srv = http.createServer((req, res) => {
  const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (fs.existsSync(p) && fs.statSync(p).isFile()) {
    res.setHeader('content-type', MIME[path.extname(p)] || 'application/octet-stream');
    res.end(fs.readFileSync(p));
  } else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r) => srv.listen(PORT, r));

const eng = await launchBrowser();
if (!eng) { console.log('브라우저 없음 — 건너뜀 (npm i playwright 또는 puppeteer)'); srv.close(); process.exit(0); }

const PROBE = () => {
  const out = [];
  document.querySelectorAll('br').forEach((br) => {
    if (getComputedStyle(br).display !== 'none') return;
    const prev = br.previousSibling, next = br.nextSibling;
    const a = prev ? (prev.textContent || '') : '', b = next ? (next.textContent || '') : '';
    if (!a || !b) return;
    const la = a[a.length - 1], fb = b[0];
    if (la !== ' ' && fb !== ' ' && la !== '\n' && fb !== '\n' && la !== '\t') {
      out.push({
        join: a.slice(-12) + '⟨붙음⟩' + b.slice(0, 12),
        host: ((br.parentElement.className || br.parentElement.tagName) + '').split(' ')[0],
        sec: (br.closest('section[id]') || {}).id || '-',
      });
    }
  });
  return out;
};

let bad = 0, checked = 0;
for (const page of PAGES) {
  if (!fs.existsSync(path.join(ROOT, page))) continue;
  for (const w of WIDTHS) {
    const { page: pg } = await eng.newPage({ port: PORT, viewport: { width: w, height: 900 } });
    try {
      await pg.goto(`http://localhost:${PORT}/${page}`, { waitUntil: 'load' });
      if (eng.kind === 'puppeteer') await pg.setViewport({ width: w, height: 900 });
      const hits = await pg.evaluate(PROBE);
      checked++;
      if (hits.length) {
        bad += hits.length;
        console.log(`\n✗ ${page} @${w}px — ${hits.length}곳`);
        hits.forEach((h, i) => console.log(`   ${i + 1}. [${h.sec}/.${h.host}]  …${h.join}…`));
      }
    } catch (e) { console.log(`  (건너뜀 ${page}@${w}: ${e.message.slice(0, 60)})`); }
    await pg.close();
  }
}
await eng.close(); srv.close();

if (bad) {
  console.log(`\n총 ${bad}곳. 처방: 소스에서 해당 \`<br>\` **앞에 공백 한 칸**을 넣는다 (…습니다. <br>다음문장…).`);
  process.exit(1);
}
console.log(`✓ br 접착 0곳 (${checked}개 조합 점검)`);
