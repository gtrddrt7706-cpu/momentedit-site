// 우측 아이콘 레일이 본문 글자 위에 겹치는 것은 «의도된 것»이다. 그 의도를 지키는 검사.
//
// ★★[RAIL_OVERLAP_OK] 2026-08-10 사용자 확인 *"계획된거야"*
//                     2026-09-20 사장님 재확인 *"우측 아이콘트랙은 손대지마
//                                                따로 여백을 두지도마 의도된거야"*
//
// ── 이 검사의 극성은 «거꾸로»다. 겹침이 있으면 통과, 겹침이 사라지면 빨강이다. ──
//
//   왜 그런가 — 이 항목은 네 번 되살아났다. 2026-07-26 기각 · 2026-08-10 확인 ·
//   2026-09-06 종결 · 그리고 2026-09-20 에 내가 또 들고 왔다.
//   네 번 다 «누가 주석을 지워서»가 아니다. 주석은 멀쩡히 있었고 merge-guard 도
//   chk 로 그것을 지키고 있었다. 그런데도 되살아났다 —
//
//     ★종전 게이트는 «결정의 글»을 지켰지 «결정의 결론»을 지키지 않았다.
//       주석은 assets/advisor-widget.js 안에 있고, 발견은 index.html 을 «렌더해서 재는»
//       쪽에서 나온다. 재는 사람은 위젯 소스를 열 일이 없다. 둘이 만나지 않는다.
//
//   그래서 이 검사는 «재는 자리»에 verdict 를 둔다. 겹침을 재고 싶은 사람은 여기서 재게 되고,
//   재면 숫자와 함께 「닫힌 결정」이 같이 찍힌다. 숫자만 들고 나갈 수가 없다.
//
//   그리고 더 중요한 것 — 누가 «고치면» 이 검사가 붉는다.
//   겹침을 없애는 길은 셋뿐이고(아래 ①②③) 셋 다 여기서 잡힌다:
//     ① 본문 오른쪽에 여백을 준다      → 글자 오른끝이 레일 왼끝보다 왼쪽으로 간다 → 빨강
//     ② 레일을 더 오른쪽으로/작게 한다 → right 22/6px 이 아니게 된다 → 빨강
//     ③ 스크롤 자동 숨김을 되살린다    → 2026-06-12 폐지된 것이다(별건·widget 주석 참조)
//   ①이 오늘 사장님이 명시로 금지한 것이다 — *"따로 여백을 두지도마"*.
//
//   ★이 검사를 «통과시키려고» 본문 폭을 넓히지 말 것. 지금 값이 정본이고,
//     이 검사는 그 값이 움직였는지만 본다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다(브라우저 없음 — 화면 결함 아님)
//   사람이 손으로 잴 때: node scripts/audit/rail-overlap-intent.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const MIME = { '.html': 'text/html;charset=utf-8', '.css': 'text/css', '.js': 'text/javascript', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.woff2': 'font/woff2' };

// 레일이 서는 자리 — advisor-widget.js 의 CSS 와 같은 값이어야 한다.
// 일부러 여기 «다시» 적는다. 위젯에서 읽어 오면 위젯이 바뀔 때 기대값도 함께 바뀌어
// 검사가 무엇도 잡지 못한다(자기 자신과 대조하는 죽은 게이트가 된다).
const EXPECT_RIGHT = { wide: 22, narrow: 6 };   // narrow = max-width:680px
const NARROW_AT = 680;

// ★겹침을 «요구»하는 폭은 좁은 쪽뿐이다.
//   넓은 폭에서는 본문이 --max 로 묶여 가운데 정렬되므로 레일 곁에 자연히 빈 자리가 생긴다.
//   그건 «누가 여백을 넣은 것»이 아니라 레이아웃의 원래 모양이다.
//   ★이 줄이 없던 첫 판이 1280px 을 빨강으로 냈다(실측: 본문 잉크 1194 · 레일 1208).
//     제품이 아니라 자가 틀린 것이었다 — [NOT_THE_SOURCE] 의 그 실패다.
//   문서의 실측표도 320~820px 만 담고 있다(design-round §2-2).
const OVERLAP_REQUIRED_UPTO = 680;

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
  console.log('━━ rail-overlap-intent — 브라우저가 없어 재지 못했습니다 · 재지 못한 것이지 화면 결함이 아닙니다');
  srv.close();
  process.exit(2);
}

console.log('━━ rail-overlap-intent ━━ [RAIL_OVERLAP_OK] 우측 아이콘 레일과 본문의 겹침');
console.log('   이것은 «닫힌 결정»입니다 — 2026-08-10 "계획된거야" · 2026-09-20 "손대지마 따로 여백을 두지도마 의도된거야"');
console.log('   아래 숫자는 결함이 아니라 «의도가 살아 있다»는 증거입니다. 겹침이 0 이 되면 이 검사가 붉습니다.');

let bad = 0;
const no = (m) => { bad++; console.log('   ✗ ' + m); };
const ok = (m) => console.log('   ✓ ' + m);

for (const W of [320, 390, 1280]) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: W, height: 900 } });
  let m;
  try {
    await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil: 'networkidle', timeout: 30000 });
    // 레일은 페이지 맨 위에서 .reveal 로 opacity 0 이고, 전환 «중»에는 좌표가 12px 어긋난다
    // (round-protocol §11). 그래서 조금 내려서 전환을 끝낸 뒤 잰다.
    await page.evaluate(() => window.scrollTo(0, 1600));
    await page.waitForTimeout(900);
    m = await page.evaluate(() => {
      // [SERVED_OURS] 우리 화면이 맞는지 먼저 본다 — 아니면 «틀렸다»가 아니라 «못 쟀다»다
      const ours = /MOMENT\s*EDIT|모먼트에디트/i.test(document.body.innerText || '');
      const ico = document.querySelector('.me-fab-stack .me-fab-ico');
      const stack = document.querySelector('.me-fab-stack');
      if (!ours || !ico || !stack) return { ours, rail: false };
      const rb = ico.getBoundingClientRect();          // 글리프가 실제로 칠해지는 띠
      const railRight = parseFloat(getComputedStyle(stack).right);

      // 본문 글자의 «실제 잉크» 오른끝 — Range.getClientRects() 로 잰다.
      // element.getBoundingClientRect() 는 줄바꿈된 블록의 전체 상자를 줘서 부정확하다
      // (design-round §2-1 가 그렇게 적어 두었다).
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      // ★«겹친 줄 수»는 일부러 세지 않는다.
      //   레일은 position:fixed 라 한 스크롤 지점의 세로 구간에만 걸치는데, 그 자리에
      //   긴 줄이 없으면 0 이 나온다. 첫 판이 세 폭 모두 0 을 찍었다 — design-round §2-1 이
      //   「한 지점만 재면 0 이 나온다. 실제로 그렇게 속았다」고 경고한 바로 그 함정이다.
      //   제대로 세려면 문서 전체를 700px 씩 훑어야 하는데, 그 숫자는 이미 design-round §2-2 에
      //   실측표로 있다(320px 118줄 · 390px 72줄). **틀린 숫자를 남기느니 안 센다.**
      //   이 검사가 지키는 것은 «겹침이 있느냐»이고, 그건 스크롤과 무관한 가로 좌표로 난다.
      let inkRight = -1, sample = '', n;
      while ((n = w.nextNode())) {
        if (!n.nodeValue.trim()) continue;
        const p = n.parentElement;
        if (!p || p.closest('.me-fab-stack, .me-adv-panel, script, style, svg')) continue;
        const cs = getComputedStyle(p);
        if (cs.visibility === 'hidden' || cs.display === 'none' || cs.opacity === '0') continue;
        const r = document.createRange(); r.selectNodeContents(n);
        for (const box of r.getClientRects()) {
          if (box.width < 1 || box.height < 1) continue;
          if (box.right > inkRight) { inkRight = box.right; sample = n.nodeValue.trim().slice(0, 28); }
          // 세로로도 겹치는 줄만 «겹쳤다»로 센다
        }
      }
      return { ours: true, rail: true, railLeft: rb.left, railRight, inkRight, sample, vw: innerWidth };
    });
  } finally { await page.close().catch(() => {}); }

  if (!m.ours || !m.rail) { console.log(`   [${W}px] 못 쟀습니다 — 우리 화면이 아니거나 레일이 없습니다`); srv.close(); await eng.close(); process.exit(2); }

  const want = W <= NARROW_AT ? EXPECT_RIGHT.narrow : EXPECT_RIGHT.wide;
  const gap = m.inkRight - m.railLeft;   // 양수 = 아직 겹친다
  console.log(`   [${W}px] 레일 왼끝 ${m.railLeft.toFixed(0)} · 본문 잉크 오른끝 ${m.inkRight.toFixed(0)} · 가장 오른쪽까지 간 글 「${m.sample}」`);

  if (Math.abs(m.railRight - want) > 0.5) no(`[${W}px] 레일이 움직였다 — right ${m.railRight}px (정본 ${want}px). 레일을 옮겨 겹침을 피한 것이라면 되돌릴 것 [RAIL_OVERLAP_OK]`);
  else ok(`[${W}px] 레일 right ${m.railRight}px — 제자리`);

  if (W > OVERLAP_REQUIRED_UPTO) ok(`[${W}px] 겹침 ${gap > 0 ? gap.toFixed(0) + 'px' : '없음'} — 넓은 폭은 본문이 --max 로 묶여 가운데 정렬되니 요구하지 않는다`);
  else if (gap <= 0) no(`[${W}px] ★겹침이 사라졌다 (본문 잉크가 레일보다 ${(-gap).toFixed(0)}px 왼쪽). 본문 오른쪽에 여백이 생긴 것이다 — 2026-09-20 사장님 「따로 여백을 두지도마 의도된거야」. 되돌릴 것 [RAIL_OVERLAP_OK]`);
  else ok(`[${W}px] 겹침 ${gap.toFixed(0)}px — 의도대로 살아 있다`);
}

srv.close();
await eng.close();
console.log(bad ? `   ✗ ${bad}건 — 의도가 깨졌습니다` : '   ✓ [RAIL_OVERLAP_OK] 의도대로입니다 · 이 항목은 다시 올리지 마십시오');
process.exit(bad ? 1 : 0);
