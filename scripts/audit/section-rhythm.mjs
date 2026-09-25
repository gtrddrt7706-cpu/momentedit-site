// index.html 의 섹션 세로 리듬이 «정해진 2단»을 지키는지 실렌더로 재는 검사.
//
// ★[RHYTHM_LOCK 2026-09-20 사장님 「메인홈페이지 섹션과의 간격 지금이 적절한지 디자이너 관점으로」
//                          → 판정 「현행 유지 · 줄이지 않는다」 → 그 판정을 여기 건다]
//
//   왜 필요했나 — 종전 게이트는 «주석»만 보고 «값»을 안 봤다.
//   merge-guard 에 이 두 줄이 있었다:
//       chk 'SECTION_RHYTHM'       index.html 2
//       chk 'SECTION_RHYTHM_TIER2' index.html 1
//   둘 다 문자열이 살아 있는지만 센다. 그래서 2026-09-20 에 반증해 보니
//   `--gap: 104px` → `88px` 로 바꿔 **모든 섹션 경계가 248 → 216px 으로 좁아졌는데도**
//   merge-guard 가 「ALL MARKERS OK · rc=0」 이라고 답했다.
//   이 저장소의 [DECISION_GUARD] 가 적어 둔 실패 모양 그대로다 —
//   「결정이 게이트 주석에만 적히고 실행이 안 됐다」.
//
//   ★이 값에는 사고 이력이 있다. 한 번 200/248 단일값으로 통일했다가 배포 직후
//     사장님이 답답함을 느껴 되돌렸다(momentedit-design 「섹션 리듬」 절).
//     즉 «근거가 완벽해 보여도 조용히 좁히면 안 되는» 자리다. 그래서 기계가 지킨다.
//
//   2026-09-20 실측 근거 (1280px):
//     섹션 «안»의 소제목 덩어리 사이 = 113px
//     섹션 경계 248px → 안쪽의 2.2배 · 장 전환 312px → 2.76배
//     디자인 문서의 자기 기준이 «최소 3배» 이므로 248 은 이미 하한에 가깝다.
//     → 더 줄이면 「섹션이 바뀌었다」가 안 읽힌다. 줄이는 방향은 근거가 없다.
//
//   ★숫자를 일부러 바꾸려면 이 파일의 EXPECT 도 «같은 커밋에서» 바꿔라.
//     그게 이 검사의 목적이다 — 조용히 바뀌는 것을 막고, 바꿀 땐 눈에 보이게 한다.
//     (merge-guard 의 「기능을 정당히 폐지하면 가드 목록도 같은 커밋에서 갱신」과 같은 규약)
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다(화면 결함 아님)
//   ★[SERVED_OURS] 셋을 가른다 — 서버가 안 떴거나 포트를 뺏겨 «우리 화면이 아닌 것»이 뜨면
//     «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다. 환경 탓으로 붉는 검사는 사람이 곧 무시한다.
//
//   ★어디서 도나 — PR 의 merge-guard 가 «아니다»(브라우저가 없어 늘 2로 빠진다).
//     실제로 재는 곳은 nightly-screen.yml 이고, run-all.mjs 가 scripts/audit/*.mjs 를
//     스스로 찾아 돌리므로 이 파일은 자동 등록된다. 손으로 잴 때:
//         node scripts/audit/section-rhythm.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/* 문서 순서. 히어로는 divider 로 나뉘지 않아 대상이 아니다. */
const ORDER = ['reality', 'about', 'archive', 'service', 'live', 'invest', 'journey', 'director', 'faq', 'rsvp'];

/* 장 전환 4곳 — [SECTION_RHYTHM_TIER2] 가 정한 그 넷. 갤러리·가격·여정·사람 진입. */
const CHAPTER = new Set(['about→archive', 'live→invest', 'invest→journey', 'journey→director']);

/* ★정본 수치. --gap(104/80) × 2 + 스탬프 40 = 기본 · 장 전환은 (--gap+32) × 2 + 40 */
/* ★★[RHYTHM_G2 2026-09-25 사장님 「섹션 간의 간격을 좀 더 벌리고 싶어」 · 선택 «g2»]
   --gap 둘만 바꿨다(104→152 · 680px 이하 80→112). 장 전환 +32px 상수와 .divider 구조는 그대로.
   안쪽 113px 대비 2.2배 → **3.0배** — 스킬 문서가 적어 둔 「섹션 사이는 안쪽의 최소 3배」를 이제 만족한다.
   ★이 숫자를 또 바꾸려면 여기 EXPECT 를 «같은 커밋에서» 고친다. 먼저 안 고치고 돌려 붉는 것을
     확인한 뒤 고쳤다(반증) — 실측이 정확히 264/328 · 344/408 로 나왔다. */
const EXPECT = {
  390:  { base: 264, chapter: 328 },
  1280: { base: 344, chapter: 408 },
};

/* divider 가 없는 두 경계 — 값을 고정하지 않고 «있다»만 확인한다.
   reality→about 는 #about 이 화면 꽉 찬 사진으로 열려 사진이 경계 노릇을 한다(104/80px).
   rsvp→footer 는 마지막 자식의 새는 마진이 만드는 자리라 [PERF_CV_SECTIONS] 가 일부러 남겨 뒀다. */
const NO_DIVIDER = new Set(['reality→about']);

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
  console.log('━━ section-rhythm — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다');
  srv.close();
  process.exit(2);
}

let bad = 0;
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const ok = (m) => console.log('   ✓ ' + m);

for (const W of [390, 1280]) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: W, height: 900 } });
  let data = null;
  try {
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 60000 });
    /* content-visibility:auto 가 걸린 섹션은 훑어야 레이아웃이 생긴다([PERF_CV_SECTIONS]) */
    await page.addStyleTag({ content: `*{animation:none!important;transition:none!important}
      .reveal,.reveal *{opacity:1!important;transform:none!important}
      section{content-visibility:visible!important}` });
    await page.evaluate(async () => {
      const H = document.documentElement.scrollHeight;
      for (let y = 0; y < H; y += 500) { window.scrollTo(0, y); await new Promise((r) => requestAnimationFrame(r)); }
      window.scrollTo(0, 0); await new Promise((r) => setTimeout(r, 400));
    });
    await page.waitForTimeout(900);
    data = await page.evaluate((ORDER) => {
      /* ★[SERVED_OURS] 우리 화면이 맞는지 먼저 본다 — 아니면 «틀렸다»가 아니라 «못 쟀다»(2)다.
         포트를 뺏기거나 서버가 안 뜨면 404 가 뜨는데, 그때 「리듬이 깨졌다」고 붉히면
         멀쩡한 화면이 결함으로 보고된다(_freeport.mjs 머리말의 사고). */
      const ours = /MOMENT\s*EDIT|모먼트에디트/i.test(document.body.innerText || '');
      const secs = ORDER.map((id) => document.getElementById(id)).filter(Boolean);
      if (!ours || secs.length < ORDER.length) return { ours, found: secs.length };
      /* ★섹션 «상자»끼리 잰다. 자손을 훑으면 배경이미지 타일·접힌 FAQ·절대배치 장식을
         빈칸으로 세어 값이 통째로 틀린다(2026-09-20 에 세 번 겪었다). 상자는 그 전부를 품는다. */
      const box = (e) => { const r = e.getBoundingClientRect(); return { t: Math.round(r.top + scrollY), b: Math.round(r.bottom + scrollY) }; };
      const divs = [...document.querySelectorAll('.divider')].map((d) => {
        const r = d.getBoundingClientRect();
        return { t: Math.round(r.top + scrollY), h: Math.round(r.height) };
      });
      const out = [];
      for (let i = 0; i < secs.length - 1; i++) {
        const a = box(secs[i]), b = box(secs[i + 1]);
        const d = divs.find((x) => x.t >= a.b - 2 && x.t <= b.t + 2) || null;
        out.push({ key: `${secs[i].id}→${secs[i + 1].id}`, gap: b.t - a.b, divH: d ? d.h : null });
      }
      return { ours: true, rows: out };
    }, ORDER);
  } catch { data = null; }
  await page.close();

  if (!data || !data.ours || !data.rows) {
    console.log(`━━ section-rhythm ${W}px — 우리 화면이 아닌 것이 떴습니다(서버가 안 떴거나 포트를 뺏겼다)`);
    console.log('   · 재지 못한 것이지 화면 결함이 아닙니다');
    await eng.close(); srv.close();
    process.exit(2);
  }

  const E = EXPECT[W];
  console.log(`━━ section-rhythm ${W}px — 기본 ${E.base}px · 장 전환 ${E.chapter}px`);
  const bases = [];
  for (const r of data.rows) {
    if (NO_DIVIDER.has(r.key)) {
      if (r.divH === null) ok(`${r.key}: divider 없음 (사진이 경계) · ${r.gap}px`);
      else no(`${r.key}: divider 가 새로 생겼다 — 이 경계는 사진이 대신하기로 한 자리다`);
      continue;
    }
    const want = CHAPTER.has(r.key) ? E.chapter : E.base;
    const tag = CHAPTER.has(r.key) ? '장 전환' : '기본';
    if (r.divH === null) { no(`${r.key}: divider 가 사라졌다 (${tag} ${want}px 이어야 한다)`); continue; }
    if (r.gap !== want) no(`${r.key}: ${tag} 경계가 ${r.gap}px — ${want}px 이어야 한다 (${r.gap - want > 0 ? '+' : ''}${r.gap - want})`);
    else ok(`${r.key}: ${tag} ${r.gap}px`);
    if (!CHAPTER.has(r.key)) bases.push(r.gap);
  }
  /* 드리프트 재발 감시 — 예전에 248·256·264 로 구간마다 갈라져 있었다. 기본끼리는 전부 같아야 한다. */
  const uniq = [...new Set(bases)];
  if (uniq.length > 1) no(`기본 경계가 서로 다르다: ${uniq.join(' / ')}px — 구간별 개별값은 드리프트다`);
  else ok(`기본 경계 ${bases.length}곳이 모두 같다`);
}

await eng.close();
srv.close();
console.log(bad ? `\n✗ 섹션 리듬이 정해진 2단과 다릅니다 — ${bad}건` : '\n✓ 섹션 리듬이 2단 그대로입니다');
process.exit(bad ? 1 : 0);
