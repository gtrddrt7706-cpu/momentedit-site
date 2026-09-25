#!/usr/bin/env node
/* ★★[PREVIEW_GUARD 2026-09-25] 미리보기 안전장치 검사 — shared/preview-guard.js 가 제 일을 하는지.
 *
 *   node scripts/audit/preview-guard.mjs          판정식 · 배선(정적) — 게이트가 매번 돈다
 *   node scripts/audit/preview-guard.mjs --live   + 실브라우저(390px) — 운영 흉내 · 미리보기 흉내 둘 다
 *
 * ── 셋을 본다
 *   ① 판정식 — 운영 주소만 «운영»이다. 비슷하게 생긴 주소(momentedit.kr.evil.com · evil-momentedit.kr ·
 *      sub.momentedit.kr)는 운영이 아니다. shared/venue.js 의 목록과 같아야 한다.
 *   ② 배선 — GAS 주소를 품은 페이지는 전부 <head> 맨 앞에서 이 장치를 불러야 한다.
 *      새 페이지가 GAS 를 부르기 시작했는데 장치를 안 달면 여기서 빨개진다(조용히 새는 길을 막는다).
 *   ③ (--live) 실제로 막히나 · 운영에서는 정말 아무것도 안 바뀌나
 *      같은 페이지를 127.0.0.1 로 한 번, www.momentedit.kr(로컬로 돌려 둠)로 한 번 연다.
 *      앞쪽은 GAS 요청 0 + 띠가 보여야 하고, 뒤쪽은 띠가 없고 요청이 «종전대로» 나가야 한다.
 *      ★요청은 네트워크 층에서 전부 끊는다 — 운영 흉내 쪽도 실제 GAS 에는 한 건도 닿지 않는다.
 *
 * 종료코드: 0 통과 · 1 실패 · 2 재지 못했다(브라우저 없음 등 · --live 일 때만)
 */
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);
const require = createRequire(import.meta.url);
let fail = 0;
const ok = (name, cond, extra) => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (extra ? '  ' + extra : '')); if (!cond) fail = 1; };

/* ── ① 판정식 ── */
const GUARD = fs.readFileSync(P('shared/preview-guard.js'), 'utf8');
function evalGuard(host) {
  const w = { location: { hostname: host, href: 'http://' + host + '/' } };
  vm.runInNewContext(GUARD, { window: w, document: { body: null, addEventListener() {} }, console, URL, Promise, setTimeout });
  return w.ME_PREVIEW_GUARD;
}
const CASES = [
  ['momentedit.kr', false], ['www.momentedit.kr', false], ['WWW.MOMENTEDIT.KR', false], ['momentedit.kr.', false],
  ['127.0.0.1', true], ['localhost', true], ['momentedit-site-git-claude-preview-x.vercel.app', true],
  ['momentedit.kr.evil.com', true], ['evil-momentedit.kr', true], ['sub.momentedit.kr', true], ['', true],
];
for (const [h, on] of CASES) {
  const g = evalGuard(h);
  ok(`판정 ${JSON.stringify(h)} → ${on ? '막음' : '운영(그대로)'}`, g && g.on === on);
}
const hosts = evalGuard('momentedit.kr').PROD_HOSTS;
const VENUE = fs.readFileSync(P('shared/venue.js'), 'utf8');
const vHosts = [...VENUE.slice(0, 2000).matchAll(/h !== '([^']+)'/g)].map((m) => m[1]);
ok('venue.js 의 운영 주소 = preview-guard.js 의 PROD_HOSTS', JSON.stringify(vHosts.sort()) === JSON.stringify([...hosts].sort()), vHosts.join(','));
ok('venue.js 가 운영이 아닐 때만 장치를 끼운다', /document\.write\('<script src="\/shared\/preview-guard\.js"><\\\/script>'\)/.test(VENUE));

/* ── ② 배선 ── GAS 주소를 품은 페이지는 <head> 맨 앞에서 장치를 부른다 */
const SKIP_DIRS = new Set(['docs', 'automation', 'scripts', 'node_modules', '.git', '.claude', '.agents', '_workspace', '_asr', 'contract', 'api', 'i', 'i-family', '청첩장']);
/* ★MomentEdit_청첩장_프리뷰_16개 — 옛 v3 사본이다. 어디서도 링크하지 않고, 템플릿이라 손으로 고치지 않는다.
   그 대신 «빠진 것»을 숫자로 남겨 둔다(아래 LEGACY). 늘어나면 빨강. */
const LEGACY = 'MomentEdit_청첩장_프리뷰_16개';
const pages = [];
(function walk(dir) {
  for (const f of fs.readdirSync(P(dir || '.'))) {
    const rel = dir ? dir + '/' + f : f;
    const st = fs.statSync(P(rel));
    if (st.isDirectory()) { if (!SKIP_DIRS.has(f) && f !== LEGACY) walk(rel); continue; }
    if (/\.html$/.test(f)) pages.push(rel);
  }
})('');
let wired = 0;
for (const rel of pages) {
  const s = fs.readFileSync(P(rel), 'utf8');
  if (!/script\.google(usercontent)?\.com\/macros/.test(s)) continue;
  const head = s.slice(0, s.search(/<\/head>/i) > 0 ? s.search(/<\/head>/i) : 3000);
  const firstScript = head.search(/<script\b/i);
  const guardAt = head.indexOf('<script src="/shared/preview-guard.js"></script>');
  ok(`배선 ${rel} — <head> 맨 앞 스크립트가 장치`, guardAt >= 0 && guardAt === firstScript);
  wired++;
}
ok('배선 대상 페이지를 찾았다(0 이면 검사가 죽은 것)', wired >= 8, `${wired}개`);
const legacyN = fs.readdirSync(P(LEGACY), { recursive: true }).filter((f) => /\.html$/.test(f)
  && /script\.google(usercontent)?\.com\/macros/.test(fs.readFileSync(P(path.join(LEGACY, f)), 'utf8'))).length;
ok(`${LEGACY} — 장치 없이 GAS 를 부르는 옛 사본이 16개를 넘지 않는다`, legacyN <= 16, `${legacyN}개`);

/* ── ③ 실브라우저 ── */
if (process.argv.includes('--live')) await live();
process.exit(fail);

async function live() {
  let pw = null;
  for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
  if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
  const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.mp3': 'audio/mpeg', '.woff2': 'font/woff2' };
  const srv = http.createServer((req, res) => {
    let u = decodeURIComponent(req.url.split('?')[0]); if (u.endsWith('/')) u += 'index.html';
    const f = path.join(ROOT, u);
    if (!f.startsWith(ROOT) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.statusCode = 404; return res.end('nf'); }
    res.setHeader('Content-Type', MIME[path.extname(f)] || 'application/octet-stream'); fs.createReadStream(f).pipe(res);
  });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r));
  const port = srv.address().port;
  let browser;
  try { browser = await pw.chromium.launch({ args: [`--host-resolver-rules=MAP www.momentedit.kr 127.0.0.1:${port},MAP momentedit.kr 127.0.0.1:${port}`] }); }
  catch (e) { console.log('못 쟀다 — 브라우저 실행 실패', e.message); process.exit(2); }

  const PAGES = [
    ['mypage.html', '?code=ZZTEST&sig=x'], ['admin.html', ''], ['guide.html', '?g=zzguidetest'], ['inquiry.html', ''],
    ['seat.html', '?t=zzseattest'], ['schedule.html', '?token=zztest'], ['cancel.html', '?t=zztest'],
    ['live.html', '?e=zz-test-0101'], ['i/cover-01.html', '?e=zz-test-0101'], ['i-family/family-01.html', '?e=zz-test-0101'],
  ];
  const PROBE = `(async () => {
    const U = 'https://script.google.com/macros/s/ZZPROBE/exec';
    const r = {};
    try { await fetch(U + '?p=fetch'); r.fetch = 'sent'; } catch (e) { r.fetch = 'blocked'; }
    r.xhr = await new Promise((res) => { const x = new XMLHttpRequest(); x.open('GET', U + '?p=xhr'); x.onerror = () => res('blocked'); x.onload = () => res('sent'); x.send(); setTimeout(() => res('timeout'), 3000); });
    r.jsonp = await new Promise((res) => { const s = document.createElement('script'); s.onerror = () => res('blocked-or-failed'); s.onload = () => res('sent'); s.src = U + '?p=jsonp'; document.head.appendChild(s); setTimeout(() => res('timeout'), 3000); });
    r.beacon = navigator.sendBeacon ? String(navigator.sendBeacon(U + '?p=beacon', 'x')) : 'none';
    return r;
  })()`;
  async function run(base, host) {
    const out = [];
    for (const [pg, q] of PAGES) {
      const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
      const page = await ctx.newPage();
      const gas = [];
      await page.route('**/*', (route) => {
        const u = route.request().url();
        if (/script\.google(usercontent)?\.com/.test(u)) { gas.push(u); return route.abort(); }
        if (!u.startsWith(base)) return route.abort();   // 바깥(폰트·지도 등)은 전부 끊는다 — 운영 흉내도 밖으로 안 나간다
        return route.continue();
      });
      const errs = []; page.on('pageerror', (e) => errs.push(String(e.message).slice(0, 80)));
      try { await page.goto(base + '/' + pg + q, { waitUntil: 'load', timeout: 20000 }); } catch (e) { errs.push('goto:' + e.message.slice(0, 60)); }
      await page.waitForTimeout(2500);
      const onLoad = gas.length;
      let probe = null; try { probe = await page.evaluate(PROBE); } catch (e) { probe = { err: String(e.message).slice(0, 60) }; }
      await page.waitForTimeout(500);
      const bar = await page.evaluate(() => { const b = document.getElementById('mePreviewBar'); if (!b) return null; const r = b.getBoundingClientRect(); return { h: Math.round(r.height), w: Math.round(r.width), top: Math.round(r.top), text: b.textContent }; });
      const guard = await page.evaluate(() => window.ME_PREVIEW_GUARD ? { on: window.ME_PREVIEW_GUARD.on, blocked: window.ME_PREVIEW_GUARD.blocked } : null);
      out.push({ pg, host, onLoad, total: gas.length, probe, bar, guard, errs });
      await ctx.close();
    }
    return out;
  }
  const prev = await run(`http://127.0.0.1:${port}`, '127.0.0.1');
  const prod = await run(`http://www.momentedit.kr:${port}`, 'www.momentedit.kr');
  await browser.close(); srv.close();

  console.log('\n── 미리보기 흉내 (127.0.0.1 · 390px) ──');
  for (const r of prev) {
    const good = r.total === 0 && r.bar && r.bar.h > 0 && r.bar.top === 0;
    ok(`${r.pg} — GAS 요청 ${r.total}건(로드 ${r.onLoad}) · 띠 ${r.bar ? r.bar.w + '×' + r.bar.h : '없음'} · 막은 수 ${r.guard ? r.guard.blocked : '-'}`, good,
      JSON.stringify(r.probe) + (r.errs.length ? ' · pageerror ' + r.errs.length : ''));
  }
  console.log('\n── 운영 흉내 (www.momentedit.kr → 로컬 · 요청은 네트워크 층에서 끊음) ──');
  for (const r of prod) {
    const pv = prev.find((x) => x.pg === r.pg);
    /* ★운영에서는 «종전대로» — 띠 없음 · 장치 꺼짐 · 탐침 네 갈래가 전부 밖으로 나간다(네트워크가 끊은 것이지 장치가 아니다) */
    const probeOut = r.probe && r.probe.fetch === 'blocked' ? r.total >= 1 : true;
    const good = !r.bar && (!r.guard || r.guard.on === false) && r.total >= 3 && probeOut;
    ok(`${r.pg} — 띠 ${r.bar ? '있음' : '없음'} · 장치 ${r.guard ? (r.guard.on ? '켜짐' : '꺼짐') : '미설치'} · GAS 요청 ${r.total}건(로드 ${r.onLoad}) · 미리보기 쪽 ${pv ? pv.total : '-'}건`, good,
      r.errs.length ? 'pageerror ' + r.errs.length : '');
  }
}
