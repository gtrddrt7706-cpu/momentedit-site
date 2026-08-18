/* 제 자리를 벗어난 문구를 찾는 자 [ORPHAN_COPY]
 *
 * ★왜 만드나 — 2026-08-18 사용자 지적: "여기 문구 이상한 위치에서 확인되는데".
 *   「자리는 그날 인원에 맞춰 다시 놓고…」 한 줄이 설명하는 카드(25 Guests)와 갈라져,
 *   divider 건너편 「Our Perspective」 블록의 **첫 줄**로 들어가 있었다(#507 에서 끼워 넣을 때
 *   바로 아래 .reveal 을 잡았다). 양쪽 어디에도 안 붙은 채 가운데 정렬로 떠 보였다.
 *
 * ★무엇을 재나 — 「본문이 제목보다 앞서는 블록」. 이 사이트의 섹션은 예외 없이
 *   라벨·제목이 먼저 오고 본문이 따른다. 본문 문단이 제목 **앞**에 있다는 것은
 *   그 문단이 원래 앞 블록 것인데 경계를 넘어왔다는 뜻이다.
 *   ★정렬 차이로 찾지 않는다 — 정렬은 증상일 뿐이고 left/start 가 같은 값이라 잡음만 난다(실측 3건 전부 오탐).
 *
 * ★적대 검증 — 고치기 전 파일로 되돌려 돌리면 그 한 건을 정확히 집어낸다(1건), 고친 뒤엔 0건.
 *
 * 쓰는 법: node scripts/audit/orphan-copy.mjs   (서버는 스스로 띄운다 · 브라우저 없으면 종료코드 2 = 안 쟀다)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openProbe, PORT, serverRooted } from './page-probe.mjs';

const PAGES = ['index.html', 'live.html', 'guide.html?g=demo', 'inquiry.html', 'schedule.html', 'mypage.html'];
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon' };

/* 서버는 스스로 띄운다 — 사람이 미리 띄워 둘 리 없는 자리(merge-guard 안)에서도 실제로 재려고 */
let srv = null;
if (!(await serverRooted()).ok) {
  srv = http.createServer((req, res) => {
    const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
      res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
      res.end(fs.readFileSync(f));
    } else { res.statusCode = 404; res.end('nf'); }
  });
  await new Promise((r, j) => { srv.on('error', j); srv.listen(PORT, '127.0.0.1', r); }).catch(() => { srv = null; });
}
const stopSrv = () => { if (srv) try { srv.close(); } catch { /* 이미 닫힘 */ } };

const SCAN = () => {
  const out = [];
  const HEAD = (el) => /sec-label|sec-title|card-label|t-emph|sec-t|^h[1-4]$/i.test(el.className + ' ' + el.tagName);
  const vis = (el) => {
    const r = el.getBoundingClientRect(); const cs = getComputedStyle(el);
    return r.width > 0 && r.height > 0 && cs.display !== 'none' && cs.visibility !== 'hidden' && parseFloat(cs.opacity) > 0.05;
  };
  document.querySelectorAll('.reveal, section, .sec').forEach((box) => {
    const kids = [...box.children].filter((c) => c.textContent.trim().length > 8 && vis(c));
    if (kids.length < 2) return;
    const headAt = kids.findIndex(HEAD);
    if (headAt <= 0) return;                       // 제목이 없거나 이미 맨 앞이면 정상
    kids.slice(0, headAt)
      .filter((c) => c.tagName === 'P' && c.textContent.trim().length > 20)   // 라벨·눈금·버튼은 제외
      .forEach((c) => out.push({
        box: (box.className || box.tagName).toString().slice(0, 44),
        head: kids[headAt].textContent.replace(/\s+/g, ' ').trim().slice(0, 34),
        text: c.textContent.replace(/\s+/g, ' ').trim().slice(0, 60),
      }));
  });
  return out;
};

let bad = 0, looked = 0;
for (const pg of PAGES) {
  let probe;
  try { probe = await openProbe(pg, { width: 390, height: 900 }); }
  catch (e) {
    if (e.cantLook) { console.log('· 못 봄(' + e.message + ') — 이 자리에선 재지 않는다.'); stopSrv(); process.exit(2); }
    stopSrv(); throw e;
  }
  const { page, close } = probe;
  /* 바깥 글꼴이 막힌 자리에서는 문서 해석이 멈춰 본문이 덜 그려진다 — 재는 쪽 사정이라 스텁한다 */
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.fulfill({ status: 200, contentType: 'text/css', body: '/*stub*/' }));
  await page.goto('http://127.0.0.1:' + PORT + '/' + pg, { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);
  const hits = await page.evaluate(SCAN);
  looked++;
  if (hits.length) {
    bad += hits.length;
    hits.forEach((h) => console.log('✗ ' + pg + ' — 제목「' + h.head + '」보다 앞선 본문\n   ' + h.box + ' : ' + h.text));
  } else console.log('ok ' + pg);
  await close();
}
stopSrv();
console.log(bad ? `\n제자리를 벗어난 문구 ${bad}건` : `\nORPHAN COPY OK — ${looked}쪽 모두 제목이 본문보다 앞선다`);
process.exit(bad ? 1 : 0);
