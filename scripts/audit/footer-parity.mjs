// 네 공개 면의 푸터가 «한 벌»인지 재는 검사.
//
// ★[FOOTER_PARITY 2026-09-19 사용자 「여기 풋터부분 좀더 개선해죠 이메일 만있으니초라해보여」
//                            · 「다른페이 풋터부분들도 점검하고 될수있으면통일」]
//
//   왜 이 검사가 있나 — 같은 결함이 두 번 샜다.
//   ① `momentedit-design` 스킬이 이미 적어 두었다: 「푸터 대비 rgba(...,0.44)(2.7:1)는
//      index 에서 고친 뒤에도 inquiry·parents 에 남아 있었다」. 그런데 2026-09-19 에 privacy 를
//      재 보니 «거기만» 2.71:1 / 2.05:1 로 그대로였다 — 하필 법적 고지 면이다.
//      경고를 문서에 적어 둔 것만으로는 세 번째 재발을 못 막는다(DECISION_GUARD).
//   ② parents 는 주소·처리방침·저작권 «세 줄이 통째로» 없었는데 아무 검사도 붉지 않았다.
//      푸터는 어느 페이지에서도 «화면 결함»으로 안 보인다 — 아래쪽이라 아무도 안 본다.
//      그래서 사람 눈이 아니라 기계가 봐야 하는 자리다.
//
//   ★재지 «않는» 것: 푸터의 높이.
//     parents 만 70px 높다. 표류가 아니라 [TAP44-3] 이 그 면의 푸터 링크를
//     `display:inline-block; min-height:44px` 로 키운 결과다. parents.html 은
//     「어른께 드리는 안내」 — 나이 든 독자가 읽는 면이라 엄지 타깃을 실제로 44px 로 채웠다.
//     나머지 셋은 `display:inline` 이라 WCAG 2.5.8 의 «문장 속 인라인» 면제를 탄다.
//     둘 다 통과하는 서로 다른 길이다(check-tap-targets.mjs 로 넷 다 rc=0 · 작다 0 · 겹침 0 실측).
//     ★높이를 여기서 재면 다음 판이 그 «차이»를 결함으로 읽고 44px 를 걷어낸다 —
//       그건 접근성 결정을 되돌리는 것이다. 그래서 일부러 안 잰다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다(브라우저 없음 — 화면 결함 아님)
//
//   ★어디서 도나 — PR 의 merge-guard 가 «아니다».
//     merge-guard.yml 은 node 만 깔아 브라우저가 없다 → 거기선 늘 2(못 쟀다)로 빠진다.
//     실제로 재는 곳은 nightly-screen.yml(chromium 설치 · timeout 25분)이고,
//     run-all.mjs 가 scripts/audit/*.mjs 를 스스로 찾아 돌리므로 이 파일은 자동 등록된다.
//     PR 쪽에서는 merge-guard 의 chk 넷(grep)이 «이 검사를 지우는 것»만 막는다.
//     사람이 손으로 잴 때: node scripts/audit/footer-parity.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const PAGES = ['index', 'inquiry', 'privacy', 'parents'];
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

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
  console.log('━━ footer-parity — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다');
  srv.close();
  process.exit(2);
}

let bad = 0;
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const ok = (m) => console.log('   ✓ ' + m);

const got = {};
for (const name of PAGES) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  try {
    await page.goto(`http://localhost:${PORT}/${name}.html`, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => {
      const f = [...document.querySelectorAll('footer')].find((x) => x.querySelector('.f-copy'));
      if (f) f.scrollIntoView({ block: 'end' });
    });
    await page.waitForTimeout(600);
    got[name] = await page.evaluate(() => {
      // ★사이트 푸터는 «.f-copy 를 가진» <footer> 다. index·parents 에는 본문 폼 안에도
      //   <footer> 가 있어 querySelector('footer') 로 집으면 엉뚱한 것을 잰다(2026-09-19 실측 오류).
      const ft = [...document.querySelectorAll('footer')].find((x) => x.querySelector('.f-copy'));
      // ★[SERVED_OURS] 우리 화면이 맞는지 먼저 본다 — 아니면 «틀렸다»가 아니라 «못 쟀다»(2)다.
      //   포트를 다른 프로세스가 쥐거나 서버가 안 뜨면 404/빈 화면이 뜨는데, 그때 푸터가 없다고
      //   «한 벌이 아니다»라고 붉히면 멀쩡한 화면이 결함으로 보고된다. _freeport.mjs 머리말이
      //   적어 둔 사고가 그것이다 — 「환경 탓으로 붉는 검사는 사람이 곧 무시한다」.
      const ours = /MOMENT\s*EDIT|모먼트에디트/i.test(document.body.innerText || '')
        || !!document.querySelector('.f-footer-logo, link[rel="canonical"][href*="momentedit"]');
      if (!ft) return { ours, ft: false };
      const lum = (c) => {
        const [r, g, b] = c.match(/[\d.]+/g).slice(0, 3).map((v) => {
          const s = v / 255; return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
        });
        return 0.2126 * r + 0.7152 * g + 0.0722 * b;
      };
      // 푸터 배경은 조상까지 거슬러 «투명이 아닌» 첫 색으로 잡는다
      let bgEl = ft, bg = 'rgba(0, 0, 0, 0)';
      while (bgEl) {
        const c = getComputedStyle(bgEl).backgroundColor;
        if (c && !/rgba\(.*,\s*0\)$/.test(c) && c !== 'transparent') { bg = c; break; }
        bgEl = bgEl.parentElement;
      }
      const bl = lum(bg);
      const ratio = (fg) => {
        // 반투명 글자색은 배경 위에 합성해서 잰다 — alpha 를 무시하면 대비를 과대평가한다
        const m = fg.match(/[\d.]+/g).map(Number);
        const a = m.length > 3 ? m[3] : 1;
        const bm = bg.match(/[\d.]+/g).map(Number);
        const mix = `rgb(${[0, 1, 2].map((i) => Math.round(m[i] * a + bm[i] * (1 - a))).join(',')})`;
        const fl = lum(mix);
        const [hi, lo] = fl > bl ? [fl, bl] : [bl, fl];
        return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
      };
      const lines = [...ft.querySelectorAll('.f-copy')];
      return {
        ours, ft: true,
        bg,
        texts: lines.map((l) => l.innerText.replace(/\s+/g, ' ').trim()),
        ratios: lines.map((l) => ratio(getComputedStyle(l).color)),
        hrefs: [...ft.querySelectorAll('a')].map((a) => (a.getAttribute('href') || '').trim()),
        labels: [...ft.querySelectorAll('a')].map((a) => (a.innerText || a.getAttribute('aria-label') || '').replace(/\s+/g, ' ').trim()),
        overflow: Math.max(0, Math.round(ft.scrollWidth - ft.clientWidth)),
      };
    });
  } catch { got[name] = null; }
  await page.close();
}
await eng.close();
srv.close();

// ★[SERVED_OURS] 못 연 면 · 우리 화면이 아닌 면은 «틀림»이 아니라 «못 쟀다»(2)로 빠진다.
const notOurs = PAGES.filter((p) => !got[p] || !got[p].ours);
if (notOurs.length) {
  console.log(`━━ footer-parity — ${notOurs.join('·')} 자리에 우리 화면이 아닌 것이 떴습니다(서버가 안 떴거나 포트를 뺏겼다)`);
  console.log('   · 재지 못한 것이지 화면 결함이 아닙니다');
  process.exit(2);
}
// 여기부터는 «우리 화면은 맞는데» 푸터가 없는 경우 — 이건 진짜 결함이다(parents 가 실제로 그랬다).
const noFooter = PAGES.filter((p) => !got[p].ft);
for (const p of noFooter) no(`${p}: 우리 화면인데 사이트 푸터(.f-copy 를 가진 <footer>)가 없다`);
for (const p of noFooter) delete got[p];

const base = PAGES.find((p) => got[p]);
if (!base) { console.log('\n✗ 푸터가 한 벌이 아닙니다 — 네 면 모두 푸터 없음'); process.exit(1); }
const B = got[base];

console.log(`━━ footer-parity — 기준 ${base} · 네 면 대조 (390px 실렌더)`);

// ① 문구가 글자 하나까지 같은가
for (const p of PAGES) {
  if (!got[p]) continue;
  const a = JSON.stringify(got[p].texts), b = JSON.stringify(B.texts);
  if (a === b) ok(`${p}: 문구 ${got[p].texts.length}줄 동일`);
  else no(`${p}: 문구가 ${base} 와 다르다\n        ${base}: ${b}\n        ${p}: ${a}`);
}

// ② 링크가 같은 곳을 같은 순서로 가리키는가
for (const p of PAGES) {
  if (!got[p]) continue;
  const a = JSON.stringify(got[p].hrefs), b = JSON.stringify(B.hrefs);
  if (a === b) ok(`${p}: 링크 ${got[p].hrefs.length}개 · 순서·주소 동일`);
  else no(`${p}: 링크가 ${base} 와 다르다\n        ${base}: ${b}\n        ${p}: ${a}`);
}

// ③ 표기 표류 — 같은 링크를 페이지마다 다른 말로 부르지 않는가 (실사고: inquiry 만 「마이페이지」)
for (const p of PAGES) {
  if (!got[p]) continue;
  const a = JSON.stringify(got[p].labels), b = JSON.stringify(B.labels);
  if (a === b) ok(`${p}: 링크 표기 동일`);
  else no(`${p}: 링크 «표기»가 ${base} 와 다르다 — 같은 곳을 다른 말로 부른다\n        ${base}: ${b}\n        ${p}: ${a}`);
}

// ④ 대비 AA — 이 검사가 태어난 이유
for (const p of PAGES) {
  if (!got[p]) continue;
  const worst = Math.min(...got[p].ratios);
  if (worst >= 4.5) ok(`${p}: 대비 최저 ${worst}:1 (AA)`);
  else no(`${p}: 대비 ${worst}:1 — AA(4.5) 미달 · 줄별 ${JSON.stringify(got[p].ratios)}`);
}

// ⑤ 가로 넘침
for (const p of PAGES) {
  if (!got[p]) continue;
  if (got[p].overflow === 0) ok(`${p}: 가로 넘침 0`);
  else no(`${p}: 가로로 ${got[p].overflow}px 넘친다`);
}

console.log(bad ? `\n✗ 푸터가 한 벌이 아닙니다 — ${bad}건` : '\n✓ 네 면 푸터가 한 벌입니다');
process.exit(bad ? 1 : 0);
