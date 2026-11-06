#!/usr/bin/env node
/* ★[INTERNAL_NOINDEX_1106 2026-11-06 대본 지시 4] 내부 점검 화면 · 옛 계약 보존본은 고객 주소에서 내려 둔다.
 *   ① 내부 화면(INTERNAL) · 계약 보존본(contract/archive/*)에 noindex 가 있다
 *   ② 사이트맵에 없다
 *   ③ 고객 화면(루트의 나머지 .html)이 그 주소로 링크하지 않는다(href · src · location — 주석은 뺀다)
 *   ④ 제목에 «점검 · 검토 · 내부용 · 되돌리기 · 정리본 · 실청»이 든 새 화면이 INTERNAL 목록 밖에 생기면 빨강(목록에 넣고 noindex)
 *   ⑤ 깨 보기 — noindex 를 뺀 판 · 링크를 단 판에서 빨강이 되는지
 * 종료: 0 통과 · 1 빨강
 */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const INTERNAL = ['script-review.html', 'order-audit.html', 'audio-review.html', 'audio-review-tone.html', 'flow-7c2e.html', 'pair-7c2e.html',
  'listen-abb5d829.html', 'pick-396ca38a.html', 'pick-final.html', 'brief.html', 'admin.html', 'console.html'];
const ARCH = fs.readdirSync(path.join(ROOT, 'contract/archive')).filter((f) => f.endsWith('.html')).map((f) => 'contract/archive/' + f);
const noidx = (h) => /<meta name="robots" content="[^"]*noindex/i.test(h);
const vis = (h) => h.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
function check(files) {
  const bad = [];
  for (const f of INTERNAL.concat(ARCH)) { if (!(f in files)) { bad.push('없는 파일 ' + f); continue; } if (!noidx(files[f])) bad.push('① noindex 없음 — ' + f); }
  const sm = files['sitemap.xml'] || '';
  for (const f of INTERNAL.concat(ARCH)) if (sm.indexOf('/' + f) !== -1) bad.push('② 사이트맵에 있음 — ' + f);
  const cust = Object.keys(files).filter((f) => f.endsWith('.html') && !f.includes('/') && INTERNAL.indexOf(f) === -1);
  for (const c of cust) {
    const h = vis(files[c]);
    for (const f of INTERNAL.filter((x) => x !== 'admin.html' && x !== 'console.html').concat(ARCH)) {
      const re = new RegExp('(href|src|location(?:\\.href)?)\\s*=\\s*["\']?[^"\'>\\s]*' + f.replace(/[.\/]/g, (m) => '\\' + m));
      if (re.test(h)) bad.push('③ 고객 화면 ' + c + ' 이 ' + f + ' 로 링크한다');
    }
    const t = (files[c].match(/<title>([^<]*)/) || [, ''])[1];
    if (/점검|검토|내부용|되돌리기|정리본|실청/.test(t)) bad.push('④ 내부 화면으로 보이는 ' + c + '(«' + t.slice(0, 30) + '») 이 INTERNAL 목록 밖에 있다 — 목록에 넣고 noindex');
  }
  return bad;
}
const files = {};
for (const f of fs.readdirSync(ROOT)) if (f.endsWith('.html')) files[f] = rd(f);
for (const f of ARCH) files[f] = rd(f);
files['sitemap.xml'] = fs.existsSync(path.join(ROOT, 'sitemap.xml')) ? rd('sitemap.xml') : '';
const bad = check(files);
const m1 = { ...files, 'order-audit.html': files['order-audit.html'].replace(/<meta name="robots"[^>]*>/, '') };
const m2 = { ...files, 'index.html': files['index.html'] + '<a href="/script-review.html">x</a>' };
if (!check(m1).some((x) => /^①/.test(x)) || !check(m2).some((x) => /^③/.test(x))) bad.push('⑤ 깨 보기 — noindex 를 빼거나 링크를 달아도 빨강이 안 된다');
if (bad.length) { console.log('━━ internal-noindex — 빨강 ' + bad.length + '건 [INTERNAL_NOINDEX_1106]'); bad.forEach((b) => console.log('  ✖ ' + b)); process.exit(1); }
console.log(`━━ internal-noindex — 통과 · 내부 화면 ${INTERNAL.length} · 계약 보존본 ${ARCH.length} 모두 noindex · 사이트맵 0 · 고객 화면 링크 0 · 깨 보기 둘 [INTERNAL_NOINDEX_1106]`);
