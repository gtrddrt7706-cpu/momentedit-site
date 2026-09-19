#!/usr/bin/env node
/* [PUBLIC_SWEEP] 고객이 여는 쪽 전부를 «한 번에» 훑는다 — a11y · 메타 · 탭 타깃 · 404.
 *
 * 왜 (2026-09-11 /점검)
 *   a11y 를 보는 감사는 home-a11y 하나였고 그건 «홈만» 본다. 나머지 쪽은 아무도 안 봤다.
 *   메타·캐노니컬은 감사가 아예 0개였다 — form.html 이 캐노니컬로 /form.html 을 가리키고
 *   og:url 은 /form 을 가리키던 것을 사람이 손으로 찾았다. 손으로 찾은 건 다음에 또 놓친다.
 *
 * ★0건은 «깨끗»이 아니라 «못 잼»일 수 있다 → 쪽마다 훑은 요소 수를 함께 찍고, 0이면 실패로 센다.
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음)
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.json': 'application/json', '.xml': 'application/xml', '.txt': 'text/plain' };
const PAGES = ['index.html', 'inquiry.html', 'parents.html', 'privacy.html', 'schedule.html',
  'cancel.html', 'invitation-gallery.html', 'live.html', 'guide.html?g=demo'];
/* ★form.html 은 빠진다 — 열리자마자 구글폼으로 location.replace 한다.
   DOM 을 보면 이미 다른 문서라 «title 없음·lang 없음»이 뜬다(2026-09-11 실측). 그건 제품이 아니라 측정 문제다.
   그 쪽 메타는 아래 «이동 쪽» 검사에서 소스로 본다. */
const REDIRECT_PAGES = ['form.html'];

const PORT = await freePort();
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(PORT, '127.0.0.1', r));
const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }

let bad = 0; const rows = [];
const fail = (pg, m) => { bad++; rows.push('   ✗ ' + pg.padEnd(24) + m); };
const note = (pg, m) => rows.push('   · ' + pg.padEnd(24) + m);

for (const pg of PAGES) {
  const { page, errors } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  const missing = [];
  page.on('response', (r) => { if (r.status() === 404) missing.push(r.url().replace(`http://localhost:${PORT}`, '')); });
  const res = await page.goto(`http://localhost:${PORT}/${pg}`, { waitUntil: 'load' }).catch(() => null);
  if (!res || res.status() !== 200) { fail(pg, '열리지 않는다 (status ' + (res ? res.status() : '실패') + ')'); await page.close(); continue; }
  await page.waitForTimeout(1100);

  const r = await page.evaluate(() => {
    const vis = (e) => e.checkVisibility ? e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) : !!e.offsetParent;
    const txt = (e) => (e.textContent || '').trim() || e.getAttribute('aria-label') || e.getAttribute('title')
      || (e.querySelector('img') && e.querySelector('img').alt) || '';
    const links = [...document.querySelectorAll('a[href], button')];
    const controls = links.filter(vis);
    /* 메타 */
    const meta = (sel, attr) => { const e = document.querySelector(sel); return e ? (e.getAttribute(attr) || '') : null; };
    const ogUrl = meta('meta[property="og:url"]', 'content');
    const canon = meta('link[rel="canonical"]', 'href');
    /* 제목 순서 */
    const hs = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(vis).map((h) => +h.tagName[1]);
    let jump = null;
    for (let i = 1; i < hs.length; i++) if (hs[i] - hs[i - 1] > 1) { jump = 'h' + hs[i - 1] + ' → h' + hs[i]; break; }
    /* 탭 타깃 — 기준은 WCAG 2.5.8 «최소 24x24»(AA). 44는 2.5.5(AAA)라 여기선 안 쓴다.
       ★WCAG 가 스스로 두는 면제: «문장이나 글 덩어리 안에 있는 링크»는 크기 규정을 받지 않는다.
         본문 속 mailto 한 줄까지 위반으로 세면, 글을 망가뜨리는 쪽으로 몰린다. 그래서 갈라 센다.
       ★히트영역을 ::before 로 넓히는 손도 있다(cancel.html 의 [CAN_TAP40]) — 그건 박스 크기로는 안 잡히니
         면제 대상(인라인)에 들어간다. */
    const box = (e) => { const b = e.getBoundingClientRect(); return { w: Math.round(b.width), h: Math.round(b.height) }; };
    const inlineInText = (e) => {
      const d = getComputedStyle(e).display;
      if (d !== 'inline') return false;
      const own = (e.textContent || '').trim().length;
      const par = e.parentElement ? (e.parentElement.textContent || '').trim().length : 0;
      return par > own + 8;   // 둘레에 다른 글이 있으면 «문장 속»이다
    };
    /* ★2.5.8 의 «간격 예외»까지 넣어야 기준대로 재는 것이다:
         작아도, 각 표적 중심에 지름 24px 원을 놓았을 때 그 원이 다른 표적(또는 다른 작은 표적의 원)과
         안 겹치면 통과다. 이걸 빼고 크기만 보면 멀쩡한 것이 무더기로 잡힌다 —
         실제로 갤러리 11개(18px 높이 · 22px 간격 · 중심 간 40px)가 그렇게 잡혔었다. */
    const rect = (e) => { const b = e.getBoundingClientRect();
      return { cx: b.left + b.width / 2, cy: b.top + b.height / 2, w: b.width, h: b.height }; };
    const boxes = controls.map(rect).filter((r) => r.w > 0 && r.h > 0);
    const sized = controls.map((e, i) => Object.assign(box(e), { t: txt(e).slice(0, 18), inline: inlineInText(e), r: rect(e) }))
      .filter((x) => x.w > 0 && x.h > 0 && (x.w < 24 || x.h < 24));
    const crowded = (x) => boxes.some((b) => {
      if (Math.abs(b.cx - x.r.cx) < 0.5 && Math.abs(b.cy - x.r.cy) < 0.5) return false;   // 자기 자신
      return Math.hypot(b.cx - x.r.cx, b.cy - x.r.cy) < 24;   // 중심 간 24px 미만 = 원이 겹친다
    });
    const small = sized.filter((x) => !x.inline && crowded(x)).map((x) => ({ t: x.t, w: x.w, h: x.h }));
    const smallInline = sized.filter((x) => x.inline || !crowded(x));
    return {
      요소수: controls.length,
      이름없는조작: controls.filter((e) => !txt(e)).map((e) => e.tagName + (e.className ? '.' + String(e.className).split(' ')[0] : '')).slice(0, 6),
      alt없는이미지: [...document.querySelectorAll('img')].filter((i) => vis(i) && i.getAttribute('alt') === null).map((i) => (i.currentSrc || i.src || '').split('/').pop()).slice(0, 6),
      이미지수: document.querySelectorAll('img').length,
      끊긴aria: [...document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]')]
        .flatMap((e) => ['aria-labelledby', 'aria-describedby', 'aria-controls'].flatMap((a) => (e.getAttribute(a) || '').split(/\s+/).filter(Boolean)))
        .filter((id) => !document.getElementById(id)).slice(0, 6),
      중복id: (() => { const s = new Set(), d = new Set(); document.querySelectorAll('[id]').forEach((e) => { if (s.has(e.id)) d.add(e.id); s.add(e.id); }); return [...d].slice(0, 6); })(),
      lang: document.documentElement.getAttribute('lang') || '',
      title: (document.title || '').trim(),
      desc: meta('meta[name="description"]', 'content'),
      canon, ogUrl,
      ogImage: meta('meta[property="og:image"]', 'content'),
      ogTitle: meta('meta[property="og:title"]', 'content'),
      robots: meta('meta[name="robots"]', 'content'),
      h1: document.querySelectorAll('h1').length,
      제목건너뜀: jump,
      작은탭: small.slice(0, 8), 작은탭수: small.length,
      면제된작은표적: smallInline.length,
      보이는글길이: (document.body.innerText || '').trim().length,
      h1전체: document.querySelectorAll('h1').length,
      라벨없는입력: [...document.querySelectorAll('input,select,textarea')].filter((e) => vis(e)
        && !['hidden', 'submit', 'button'].includes(e.type)
        && !e.getAttribute('aria-label') && !e.getAttribute('aria-labelledby')
        && !(e.id && document.querySelector('label[for="' + CSS.escape(e.id) + '"]'))
        && !e.closest('label')).map((e) => e.name || e.id || e.type).slice(0, 6),
    };
  });

  /* ── 판정 ── */
  /* ★조작 0개 자체는 결함이 아니다 — cancel.html 의 «유효하지 않은 링크» 같은 종착 화면이 그렇다.
     정말 «못 잰» 것은 글도 조작도 없을 때다. */
  if (!r.요소수 && r.보이는글길이 < 40) fail(pg, '글도 조작도 없다 — 훑지 못한 것(«깨끗»이 아니다)');
  else note(pg, '훑음: 조작 ' + r.요소수 + ' · 이미지 ' + r.이미지수 + ' · 글 ' + r.보이는글길이 + '자'
    + (r.면제된작은표적 ? ' · 작지만 면제 ' + r.면제된작은표적 + '(문장 속 또는 간격 충분)' : ''));

  if (r.이름없는조작.length) fail(pg, '이름 없는 링크·버튼 ' + r.이름없는조작.length + ': ' + r.이름없는조작.join(', '));
  if (r.alt없는이미지.length) fail(pg, 'alt 속성이 아예 없는 이미지 ' + r.alt없는이미지.length + ': ' + r.alt없는이미지.join(', '));
  if (r.끊긴aria.length) fail(pg, '끊긴 aria 참조: ' + r.끊긴aria.join(', '));
  if (r.중복id.length) fail(pg, '중복 id: ' + r.중복id.join(', '));
  if (r.라벨없는입력.length) fail(pg, '라벨 없는 입력칸: ' + r.라벨없는입력.join(', '));
  /* ko-KR·ko-Kore-KR 은 정상 — BCP47 은 하위태그를 허용한다(ko 만 통과시키던 건 내 규칙이 좁았던 것) */
  if (!/^ko(-|$)/.test(r.lang)) fail(pg, 'html lang 이 한국어가 아니다: «' + r.lang + '»');
  if (!r.title) fail(pg, '제목(title)이 없다');
  /* 상태로 갈리는 쪽(schedule)은 로그아웃 화면에서 h1 을 숨긴다 — «있는가»로 본다 */
  if (r.h1전체 === 0) fail(pg, 'h1 이 아예 없다');
  if (r.h1전체 > 1) fail(pg, 'h1 이 ' + r.h1전체 + '개 — 한 쪽에 하나여야 한다');
  if (r.제목건너뜀) fail(pg, '제목 단계 건너뜀: ' + r.제목건너뜀);
  /* ★meta description 은 «검색 결과 미리보기»용이다. noindex 쪽에 요구하는 건 뜻이 없다 */
  const indexable = !/noindex/i.test(r.robots || '');
  if (indexable && !r.desc) fail(pg, 'meta description 이 없다 (이 쪽은 색인 대상이다)');
  /* 캐노니컬 vs og:url — 한 파일이 두 주소를 말하면 안 된다 */
  if (r.canon && r.ogUrl && r.canon.replace(/\/$/, '') !== r.ogUrl.replace(/\/$/, ''))
    fail(pg, '캐노니컬(' + r.canon + ') 과 og:url(' + r.ogUrl + ') 이 다르다');
  if (r.ogImage) {
    const p = r.ogImage.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    if (!fs.existsSync(path.join(ROOT, decodeURIComponent(p)))) fail(pg, 'og:image 파일이 없다: ' + p);
  }
  if (r.작은탭수) fail(pg, '24x24 미만인데 이웃과 24px 안에 붙어 있는 표적 ' + r.작은탭수 + '개: ' + r.작은탭.map((s) => `「${s.t}」${s.w}x${s.h}`).join(' '));
  if (missing.length) fail(pg, '404 로 받은 자원 ' + missing.length + ': ' + [...new Set(missing)].slice(0, 4).join(', '));
  if (errors.length) fail(pg, '콘솔 오류 ' + errors.length + ': ' + errors[0].slice(0, 70));
  await page.close();
}

/* ── 바깥으로 즉시 이동하는 쪽: DOM 이 아니라 소스로 본다 ── */
for (const f of REDIRECT_PAGES) {
  const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
  const g = (re) => { const m = re.exec(html); return m ? m[1] : null; };
  const title = g(/<title>([^<]*)<\/title>/);
  const canon = g(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)/);
  const ogUrl = g(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)/);
  const lang = g(/<html[^>]+lang=["']([^"']+)/);
  if (!title) fail(f, '제목(title)이 없다');
  if (!lang || !/^ko(-|$)/.test(lang)) fail(f, 'html lang 이 한국어가 아니다: «' + lang + '»');
  if (canon && ogUrl && canon.replace(/\/$/, '') !== ogUrl.replace(/\/$/, '')) fail(f, '캐노니컬(' + canon + ') 과 og:url(' + ogUrl + ') 이 다르다');
  if (!/location\.replace|http-equiv=["']refresh/.test(html)) fail(f, '이동 쪽인데 이동 코드가 없다');
  note(f, '이동 쪽(소스로 봄) — 제목·lang·캐노니컬 확인');
}

/* ── 사이트맵: 공개 쪽이 빠졌거나, 없는 주소를 싣고 있지 않은가 ── */
console.log('\n══ 공개 쪽 스윕 ══');
rows.forEach((l) => console.log(l));
console.log('\n══ 사이트맵 ══');
{
  const sm = fs.readFileSync(path.join(ROOT, 'sitemap.xml'), 'utf8');
  const locs = [...sm.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (!locs.length) { bad++; console.log('   ✗ sitemap 에 주소가 0개 — 못 읽은 것'); }
  else console.log('   · 실린 주소 ' + locs.length + '개');
  for (const u of locs) {
    let p = u.replace(/^https?:\/\/[^/]+/, '').split('?')[0];
    if (p === '/' || p === '') p = '/index.html';
    if (!/\.[a-z0-9]+$/i.test(p)) p += '.html';
    if (!fs.existsSync(path.join(ROOT, decodeURIComponent(p.replace(/^\//, ''))))) { bad++; console.log('   ✗ 사이트맵이 없는 쪽을 가리킨다: ' + u); }
  }
  /* noindex 인 쪽이 사이트맵에 있으면 신호가 충돌한다 */
  for (const pg of PAGES.concat(REDIRECT_PAGES)) {
    const f = pg.split('?')[0];
    const html = fs.readFileSync(path.join(ROOT, f), 'utf8');
    const noindex = /name=["']robots["'][^>]*noindex/i.test(html);
    const inMap = locs.some((u) => u.endsWith('/' + f) || (f === 'index.html' && /\/$/.test(u)));
    if (noindex && inMap) { bad++; console.log('   ✗ ' + f + ' 는 noindex 인데 사이트맵에 있다 (신호 충돌)'); }
  }
  console.log('   ✓ 사이트맵 대조 끝');
}
srv.close(); await eng.close?.();
console.log('\n' + (bad ? '✗ PUBLIC SWEEP — 개선점 ' + bad + '건' : '✓ PUBLIC SWEEP OK — 개선점 0'));
process.exit(bad ? 1 : 0);
