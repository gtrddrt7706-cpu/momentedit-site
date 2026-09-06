/* [HOME_A11Y] 홈(index.html)의 «읽히는가» 를 기계가 지킨다 — 2026-09-06
 *
 * 왜 만들었나: [GOLD_TEXT_AA] 정리(장식용 골드를 글자에서 빼는 일)가 .step-num 과
 *   .jr-step.on .jr-n 은 고쳤는데 .mockup-item.active .mockup-num 과 편지 카드 3줄을
 *   놓쳤다. 사람이 눈으로 훑어 찾는 방식이라 «같은 구문인데 한 자리만 빠지는» 사고가 났다.
 *   이제 색을 계산해서 찾는다 — 새 자리에 --gold 를 글자로 쓰면 여기서 붉어진다.
 *
 * ★탭 표적은 여기서 재지 않는다. scripts/check-tap-targets.mjs 가 권위다.
 *   그쪽은 접힌 아코디언·::before 확장을 제대로 걸러 내는데, 여기서 어설프게 또 재면
 *   «화면은 멀쩡한데 붉는» 검사가 하나 더 생긴다(실제로 초안에서 오탐 4건이 났다).
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음)
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
const PORT = await freePort();
const srv = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
    res.end(fs.readFileSync(f));
  } else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r, j) => { srv.on('error', j); srv.listen(PORT, '127.0.0.1', r); })
  .catch((e) => { console.log('· 못 봄(포트 · ' + String(e && e.code || e) + ')'); process.exit(2); });

const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }

const PROBE = `(() => {
  const out = { gold: [], head: [], link: [], aria: [], dup: [], skip: null, contrast: [] };
  const vis = (el) => { const b = el.getBoundingClientRect(); const c = getComputedStyle(el);
    return b.width > 1 && b.height > 1 && c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.15; };
  const own = (el) => [...el.childNodes].filter((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
  const px = (c) => { const m = (c || '').match(/[\\d.]+/g); return m ? m.map(Number) : null; };
  const lum = (r, g, b) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };

  document.querySelectorAll('*').forEach((el) => {
    if (!own(el).length || !vis(el)) return;
    const cs = getComputedStyle(el);
    const label = el.tagName.toLowerCase() + (el.className ? '.' + el.className.toString().trim().replace(/\\s+/g, '.').slice(0, 34) : '')
      + ' 「' + el.textContent.replace(/\\s+/g, ' ').trim().slice(0, 22) + '」';

    // ① 장식용 골드(--gold #b89a75)를 «글자»로 쓴 자리 — 배경과 무관하게 잡는다
    if (cs.color === 'rgb(184, 154, 117)') out.gold.push(label);

    // ② 그 밖의 대비 — 불투명 배경을 찾을 수 있을 때만. 이미지·그라디언트 위는 세지 않는다
    const fg = px(cs.color); if (!fg || (fg[3] !== undefined && fg[3] < 0.15)) return;
    let bg = null, node = el;
    while (node && node !== document.documentElement) {
      const c = getComputedStyle(node);
      if (c.backgroundImage && c.backgroundImage !== 'none') return;
      const b = px(c.backgroundColor);
      if (b && (b[3] === undefined || b[3] > 0.85)) { bg = b; break; }
      node = node.parentElement;
    }
    if (!bg) return;
    const ratio = (Math.max(lum(...fg.slice(0,3)), lum(...bg.slice(0,3))) + 0.05)
                / (Math.min(lum(...fg.slice(0,3)), lum(...bg.slice(0,3))) + 0.05);
    const size = parseFloat(cs.fontSize), need = (size >= 24 || (size >= 18.66 && +cs.fontWeight >= 700)) ? 3.0 : 4.5;
    if (ratio < need) out.contrast.push(label + '  ' + ratio.toFixed(2) + ':1 (필요 ' + need + ' · ' + size + 'px)');
  });

  // ③ 제목 계층 건너뜀
  let prev = 0;
  [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).forEach((h) => {
    const lv = +h.tagName[1];
    if (prev && lv > prev + 1) out.head.push('h' + prev + '→h' + lv + ' 「' + h.textContent.replace(/\\s+/g, ' ').trim().slice(0, 30) + '」');
    prev = lv;
  });

  // ④ 이름 없는 링크 · ⑤ 끊긴 aria 참조 · ⑥ 중복 id
  document.querySelectorAll('a[href]').forEach((a) => { if (!vis(a)) return;
    const n = ((a.getAttribute('aria-label') || '') + ' ' + a.textContent + ' '
      + [...a.querySelectorAll('img')].map((i) => i.alt).join(' ')).replace(/\\s+/g, ' ').trim();
    if (!n) out.link.push(a.getAttribute('href').slice(0, 40)); });
  ['aria-labelledby', 'aria-describedby', 'aria-controls'].forEach((k) => {
    document.querySelectorAll('[' + k + ']').forEach((el) => {
      (el.getAttribute(k) || '').split(/\\s+/).filter(Boolean).forEach((id) => {
        if (!document.getElementById(id)) out.aria.push(k + '="' + id + '"'); }); }); });
  const seen = {};
  document.querySelectorAll('[id]').forEach((el) => { seen[el.id] = (seen[el.id] || 0) + 1; });
  Object.keys(seen).forEach((i) => { if (seen[i] > 1) out.dup.push('#' + i + ' ×' + seen[i]); });

  // ⑦ 본문 랜드마크 — 내용 섹션이 전부 <main> 안에 있는가
  //   ★[MAIN_LANDMARK] 짝 없는 </div> 하나가 파서로 하여금 <main> 을 일찍 닫게 만들어
  //     다섯 섹션(가격·마이페이지·디렉터·FAQ·RSVP)이 본문 밖으로 밀려나 있었다(2026-09-06).
  //     화면은 멀쩡해 보여 오래 안 보였다 — 랜드마크로 훑는 사람에게만 반쪽이었다.
  const _main = document.querySelector('main');
  out.outside = _main
    ? [...document.querySelectorAll('section[id]')]
        .filter((s) => s.getAttribute('role') !== 'dialog' && !_main.contains(s))
        .map((s) => '#' + s.id)
    : ['<main> 자체가 없다'];

  // ⑧ 건너뛰기 링크 — 있는지 + 평소엔 화면 밖인지 (WCAG 2.4.1 A)
  const sl = document.querySelector('.skip-link');
  out.skip = sl ? { href: sl.getAttribute('href'), 화면밖: sl.getBoundingClientRect().bottom <= 0,
    표적있음: !!document.querySelector((sl.getAttribute('href') || '#none')) } : null;
  return out;
})()`;

let bad = 0;
for (const W of [390, 1280]) {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: W, height: 844 } });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'load' });
  await page.waitForTimeout(1600);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(1100);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(400);
  const r = await page.evaluate(PROBE);
  console.log(`\n══ ${W}px ══`);
  const say = (name, arr) => { if (arr.length) { bad += arr.length; console.log(`✗ ${name} ${arr.length}건`); arr.slice(0, 8).forEach((x) => console.log('   ' + x)); }
    else console.log(`✓ ${name} 0`); };
  say('장식 골드(--gold)를 글자로 쓴 자리', r.gold);
  say('그 밖의 대비 미달', r.contrast);
  say('제목 계층 건너뜀', r.head);
  say('이름 없는 링크', r.link);
  say('끊긴 aria 참조', r.aria);
  say('중복 id', r.dup);
  say('본문(main) 밖으로 밀려난 섹션', r.outside);
  if (!r.skip) { bad++; console.log('✗ 건너뛰기 링크(.skip-link) 없음 — WCAG 2.4.1 Level A'); }
  else if (!r.skip.화면밖 || !r.skip.표적있음) { bad++; console.log(`✗ 건너뛰기 링크 이상 (평소 화면밖 ${r.skip.화면밖} · 표적 ${r.skip.href} ${r.skip.표적있음})`); }
  else console.log(`✓ 건너뛰기 링크 정상 (평소 화면밖 · ${r.skip.href} 존재)`);
  // Tab 한 번에 실제로 나타나는가
  await page.keyboard.press('Tab'); await page.waitForTimeout(350);
  const t = await page.evaluate(() => { const a = document.activeElement; const b = a.getBoundingClientRect();
    return { skip: a.classList && a.classList.contains('skip-link'), top: Math.round(b.top) }; });
  if (!t.skip || t.top < 0 || t.top > 200) { bad++; console.log(`✗ Tab 1회에 건너뛰기 링크가 안 나타난다 (skip=${t.skip} top=${t.top})`); }
  else console.log(`✓ Tab 1회 → 건너뛰기 링크 top ${t.top}px`);
  if (errors.length) { bad += errors.length; console.log('✗ 콘솔오류 ' + errors.length + '건: ' + errors.slice(0, 3).join(' | ')); }
  else console.log('✓ 콘솔오류 0');
  await page.close();
}
await eng.close(); srv.close();
console.log(bad ? `\n홈 접근성 위반 ${bad}건` : '\nHOME A11Y OK — 홈은 읽히는 상태다');
process.exit(bad ? 1 : 0);
