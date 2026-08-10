// 탭 영역 전수 점검 [TAP_HITTEST · 2026-08-09]
//
//   node scripts/check-tap-targets.mjs index.html inquiry.html ...
//   node scripts/check-tap-targets.mjs --why            (판정 기준만 출력하고 끝)
//   PORT=8895 로 로컬 정적 서버가 떠 있어야 한다.
//
// ★★왜 새로 쓰나 — 앞선 두 판이 전부 초록을 잘못 냈다.
//   ① 1판(bbox): 요소의 사각형만 쟀다. `::before` 로 넓힌 히트영역을 못 봐서
//      실효 44px 인 링크를 '위반'이라 했다(거짓 양성).
//   ② 2판(히트테스트): 사각형이 이미 44×44 이상이면 **검사를 통째로 건너뛰었다**
//      (`if (b.width>=44 && b.height>=44) return false;` — '이미 크다'는 지름길).
//      큰 상자는 크니까 눌린다고 믿은 것이다. 그런데 **크기와 눌림은 다른 문제다.**
//      실제 사고: 푸터 `My Page` 는 60×50 으로 충분히 큰데, 이웃 줄 링크의 상자가
//      그 위에 겹쳐 **한가운데를 누르면 개인정보처리방침으로 갔다**(390px 실좌표 탭 재현).
//      2판은 이 자리를 아예 안 봤다. 초록이었다.
//   → 그래서 이 3판은 **모든 렌더된 타깃을 예외 없이 히트테스트**하고,
//      못 눌리는 이유를 '작다'와 '가려졌다'로 나눠서 말한다. 지름길은 없다.
//
// 판정 기준 (--why 로도 출력된다 · 이 목록이 유일한 원천이다)
//   대상  : a · button · [role=button] · summary · input[type=checkbox|radio]
//   방법  : 요소를 화면 가운데로 올린 뒤 中·上·下·左·右 다섯 점에서 elementFromPoint.
//           ±21.5px = 애플 44pt 창의 반지름. 맞은 것이 자기 자신이거나 자기 자손이면 통과.
//           ★`t.contains(e)`(조상도 통과)를 넣으면 안 된다 — 42px 버튼이 전부 초록이 된다.
//   면제  : ① 안 그려진 것(display:none·visibility:hidden·opacity<0.05·0크기)
//           ② 문장 속 인라인 링크 — `display:inline` 이면서 부모에 실제 글자가 흐르는 <a>
//              (WCAG 2.5.8 inline exception). ★<button>·inline-block·inline-flex 는 면제 아님.
//           ③ <label>이 달린 input — 실질 히트영역은 라벨이다
//   면제가 아닌 것: 사각형이 크다는 사실. 크기는 근거가 아니다.
//
// 등급
//   ★오터치 : 어떤 점에서 **다른 조작 타깃**이 맞았다. 제일 나쁘다 — 엉뚱한 데로 간다.
//   ✗작다   : 자기/자손이 아닌 **비조작 요소**나 아무것도 안 맞았다. 순수 크기 부족.
//   (접힘)  : 한가운데조차 안 눌린다 + 가린 것이 조작 타깃이 아니다.
//             접힌 아코디언·닫힌 모달 안이라 지금 화면에서 누를 대상이 아니다. 세기만 한다.
// ★playwright 를 찾는 자리가 기계마다 다르다(로컬 설치 · 전역 설치 · NODE_PATH).
//   ESM 의 `import 'playwright'` 는 NODE_PATH 를 안 본다 — 전역에만 깔린 환경에서 그냥 죽는다.
//   여기서 죽으면 "검사를 못 돌린 것"이 "검사를 통과한 것"처럼 넘어가기 쉬우니, 찾는 자리를 넓히고
//   그래도 없으면 **설치 방법을 말하며 exit 1** 로 세운다(조용히 건너뛰지 않는다).
const pw = await (async () => {
  // ★`$HOME/.npm-global` 로 짐작하지 않는다 — 이 컨테이너는 HOME=/root 인데 전역 모듈은
  //   /home/claude/.npm-global 에 있다(짐작으로 썼다가 한 번 헛다리를 짚었다).
  //   `npm root -g` 가 실제 자리를 말해 주니 그걸 묻는다.
  let g = '';
  try { g = (await import('node:child_process')).execSync('npm root -g', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim(); } catch { /* npm 이 없을 수도 */ }
  const tries = [process.env.PW, 'playwright', 'playwright-core',
    g && `${g}/playwright/index.js`, '/usr/lib/node_modules/playwright/index.js'].filter(Boolean);
  for (const t of tries) { try { return (await import(t)).default ?? (await import(t)); } catch { /* 다음 자리 */ } }
  console.error('✗ playwright 를 못 찾았습니다.  npm i -g playwright  후 다시 실행하세요.');
  process.exit(1);
})();

/* ★★[MEASURE_FONTS 2026-08-09] 재려면 **먼저** `sh scripts/measure-env-fonts.sh` 를 돌릴 것.
   이 컨테이너는 fonts.googleapis.com 요청이 나가지 않아(실측 0건) CSS 가 부르는
   'Noto Serif KR' 를 로컬에서 찾는데, 설치된 실물 이름은 'Noto Serif CJK KR' 이라
   **이름이 안 맞아 DejaVu Sans 로 떨어진다.** 한글 폭이 달라지고 → 줄바꿈이 달라지고
   → 요소 높이와 줄 간격이 달라진다. 두 세션의 숫자가 갈렸던 진짜 원인이 이것이다.
   실측: 16px 한글 13자 170.0px(DejaVu) → 174.4px(Noto CJK). 빽빽한 카드는 한 줄이 오간다.
   ★숫자가 서로 안 맞으면 판정 로직보다 **폰트부터** 의심할 것. */
const SEL = 'a,button,[role="button"],summary,input[type=checkbox],input[type=radio]';
const PORT = process.env.PORT || 8895;
const R = 21.5;

const WHY = `[TAP_HITTEST] 판정 기준
  대상 : ${SEL}
  방법 : 화면 가운데로 올린 뒤 中·上下左右(±${R}px) 5점 elementFromPoint.
         맞은 것이 자기 자신이거나 자기 자손이면 통과(조상은 통과 아님).
  면제 : ①안 그려진 것 ②문장 속 인라인 <a>(display:inline + 부모에 글자) ③label 달린 input
  ★면제가 아닌 것 : 사각형이 44×44 이상이라는 사실. 크기는 눌림을 보증하지 않는다.
  등급 : ★오터치(다른 조작 타깃이 맞음) · ✗작다(비조작 요소/공백) · (접힘)(중앙부터 안 눌림)
  2026-08-09 조임(적대 검증 실측 · CENTER_NO_MERCY/CLIP_FOLD/SPACING_24):
   · 한가운데(C)는 무관용 — 스침(bite≤1.5)·조상 예외는 가장자리 전용. 조상 예외도 경계 1px 띠에서만
   · overflow 로 0 에 가깝게 잘린 것은 (접힘) — 접힌 아코디언 속 요소가 '작다'로 새지 않게
   · '작다'에만 WCAG 2.5.8 간격 면제 — 지름 24px 원이 다른 타깃과 안 겹치면 통과(간격면제로 표기)`;

if (process.argv.includes('--why')) { console.log(WHY); process.exit(0); }

const pages = process.argv.slice(2).filter((a) => !a.startsWith('--'));
if (!pages.length) { console.error('✗ 점검할 페이지를 주세요. 예: node scripts/check-tap-targets.mjs index.html'); process.exit(1); }

const br = await pw.chromium.launch();
let bad = 0, steal = 0;
/* ★★[CANT_LOOK 2026-08-10 · 코워크 제안] **못 잰 것은 2, 재서 틀린 것은 1.**
   왜 — 코워크가 이 검사를 서버 없이 돌려 「✗ 겹침·작다 1건」을 보고 **없는 화면 결함을 고칠 뻔했다.**
   실제로는 페이지를 못 연 것이었는데, 그 실패가 `bad++` 로 결함과 같은 통에 담겨 있었다.
   색(빨강)만 보면 둘이 구분되지 않는다 — 우리 셋이 이번 회차에 세 번 같은 종류로 헛돌았다.
   ★자를 늘리는 것이 아니라 **'못 잰 것'과 '재서 틀린 것'을 갈라 놓는** 일이다.
   ★그래도 0 은 아니다. 못 본 것을 통과로 세면 검사가 거짓말을 시작한다(NO_SILENT_SKIP). */
let cantLook = 0;

for (const page_ of pages) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
  const pg = await ctx.newPage();
  try { await pg.goto(`http://127.0.0.1:${PORT}/${page_}`, { waitUntil: 'domcontentloaded', timeout: 30000 }); }
  catch { console.log(`\n━━ ${page_} — 열지 못했습니다(서버가 떠 있나요?) · 재지 못한 것이지 화면 결함이 아닙니다`); cantLook++; await ctx.close(); continue; }
  await pg.waitForTimeout(1200);
  await pg.evaluate(() => document.fonts && document.fonts.ready);
  /* ★★[SWEEP_SETTLE 2026-08-09] 쓸고 나서 **수가 멎을 때까지** 기다린다. 고정 대기가 아니다.
     왜 — 두 세션이 같은 쪽에서 '대상 42' 와 '대상 48' 을 봤다. 처음엔 폰트 탓이라 생각했는데
     (그것도 실재했다 · MEASURE_FONTS) 진짜 원인은 따로 있었다:
       **쓸기가 6개를 잠깐 드러냈다가 도로 감춘다.** 실측 곡선이 늘 `49 → 43` 이다.
       화면 밖 것을 깨우려고 아래까지 스크롤하면 접혀 있던 것들이 잠시 펴지고,
       뒤늦게 도는 스크립트가 다시 접는다. 그 사이를 고정 900ms 가 어디서 자르느냐에 따라
       49 도 되고 43 도 된다. 어느 쪽도 틀리지 않았다 — **움직이는 것을 한 번 찍었을 뿐이다.**
     ★고정 대기를 늘리는 것으로는 안 된다. 기계가 느리면 그만큼 늦게 접힌다(CPU 6배 실측).
       시간이 아니라 **상태**를 기다려야 한다. 2초(250ms×8) 연속 같은 수면 멎은 것으로 본다.
     실측: CPU 1배·6배 각 2회 = 4회 전부 43. 걸린 시간 2.9~3.8초.
     ★★[SETTLE_LIMIT 2026-08-09] 이 정착이 지키는 것은 **보이는 타깃의 개수**뿐이다.
       그 수가 멎은 뒤에도 **문서 높이와 요소 좌표는 계속 움직인다.** 실측: 수가 멎은 뒤에도
       body 높이가 22536 → 21384 로 줄었다. 그래서 `scrollIntoView({block:'center'})` 로
       한 번 올려 둔 요소가 곧 화면 위로 596px 밀려나 있었다.
       이 검사 자체는 요소마다 그때그때 가운데로 올리고 바로 재니 문제가 없다.
       ★하지만 **이 파일 밖에서** 위치에 의존하는 시험(어떤 요소가 화면에 있을 때만
         무엇이 일어나는가)을 쓸 때는 정착만으로 부족하다. 목표 요소가 원하는 자리에 올 때까지
         **좌표를 수렴시켜야** 한다(scrollBy 반복 · 두 번 연속 같은 자리면 착지).
       두 세션이 FAQ_DODGE 를 검증하다 연달아 이 함정을 밟았다 — "안 비켜난다"고 세 번 봤는데
       코드가 아니라 시험이 틀렸다. 겹칠 수 없는 자리에서 겹침을 찾고 있었다.
     ★애니메이션 정지(getAnimations)까지 조건에 넣어 봤더니 무한 애니메이션이 있어
       25초를 채우고도 안 끝났다. 수만 보는 편이 빠르고 정확하다. */
  const settled = await pg.evaluate(async (SEL) => {
    const n = () => [...document.querySelectorAll(SEL)].filter((e) => {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      return !(s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || b.width === 0 || b.height === 0);
    }).length;
    const h = document.body.scrollHeight;
    for (let y = 0; y < h; y += 700) { window.scrollTo(0, y); await new Promise((r) => setTimeout(r, 40)); }
    window.scrollTo(0, 0);
    let prev = -1, same = 0, seen = [];
    for (let i = 0; i < 80; i++) {
      await new Promise((r) => setTimeout(r, 250));
      const c = n(); seen.push(c); same = c === prev ? same + 1 : 0; prev = c;
      if (same >= 8) return { n: prev, curve: [...new Set(seen)].join('→'), ok: true };
    }
    return { n: prev, curve: [...new Set(seen)].join('→'), ok: false };
  }, SEL);
  /* 20초를 기다려도 안 멎으면 **재지 않는다.** 움직이는 페이지에서 뽑은 숫자는
     맞아도 맞은 줄 모르고, 틀려도 틀린 줄 모른다. 조용히 재는 것이 제일 나쁘다. */
  if (!settled.ok) {
    console.log(`\n━━ ${page_} — 화면이 20초 동안 안 멎었습니다(대상 수 ${settled.curve}). 재지 않았습니다.`);
    bad++; await ctx.close(); continue;
  }

  const n = await pg.evaluate((SEL) => {
    window.__tap = [...document.querySelectorAll(SEL)].filter((e) => {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      if (s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || b.width === 0 || b.height === 0) return false;
      // 문장 속 인라인 링크만 면제 — inline-block·inline-flex·<button> 은 여기 안 걸린다
      if (e.tagName === 'A' && s.display === 'inline'
        && [...e.parentNode.childNodes].some((nd) => nd.nodeType === 3 && nd.nodeValue.trim().length > 2)) return false;
      if (e.labels && e.labels.length) return false;
      return true;
    });
    return window.__tap.length;
  }, SEL);

  /* ★★[TAP_UNSEEN 2026-08-10] **못 잰 것을 함께 말한다.**
     실측으로 드러난 것 — `mypage.html` 은 "화면에 7 · 잰 것 7 · ✓ 전부 통과" 로 초록인데,
     그 7 은 **로그인 폼**이다. 로그인 뒤에 있는 제작 카드 · 좌석 캔버스 · 위저드 ·
     음료 시트(방금 44px 로 고친 그 닫기 버튼)는 **한 번도 재지 않았다.**
     숫자만 보면 "이 쪽은 통과"로 읽힌다. 그건 이 검사가 한 말이 아니다.
     ★그래서 DOM 에 있으나 안 그려진 타깃 수와, 그것들이 어느 껍데기 안에 있는지를 함께 찍는다.
       실패로 세지 않는다 — 접힌 아코디언·닫힌 모달은 정당히 숨어 있다.
       다만 **'전부 통과'가 '전부 쟀다'로 읽히는 것**을 막는다.
     ★이 줄이 크면 게이트에 넣을 값이 적다는 뜻이다 — 게이트는 재는 것만 지킬 수 있다. */
  const unseen = await pg.evaluate((SEL) => {
    const box = {};
    let hid = 0;
    for (const e of document.querySelectorAll(SEL)) {
      const s = getComputedStyle(e), b = e.getBoundingClientRect();
      if (!(s.display === 'none' || s.visibility === 'hidden' || +s.opacity < 0.05 || b.width === 0 || b.height === 0)) continue;
      hid++;
      let p = e, id = '';
      while (p && p !== document.body) { if (p.id) id = p.id; p = p.parentElement; }   // 가장 바깥 id = 화면 이름
      box[id || '(이름 없는 자리)'] = (box[id || '(이름 없는 자리)'] || 0) + 1;
    }
    const top = Object.entries(box).sort((a, b2) => b2[1] - a[1]).slice(0, 4).map(([k, v]) => `${k} ${v}`);
    return { hid, top };
  }, SEL);

  const rows = [];
  for (let i = 0; i < n; i++) {
    /* ★자리가 멈춘 뒤에 잰다. 이 사이트는 스크롤 진입 애니메이션(.reveal)이
       transform:translateY 로 올라온다. getBoundingClientRect 는 변형을 반영하므로
       올라오는 도중에 재면 요소가 제 자리보다 위에 있고, 뒤 형제(.divider)와 겹쳐 보인다
       (실제로 '어른께 드리는 안내 보기'가 그 이유로 빨갛게 나왔다 — 다 올라오면 안 겹친다).
       두 번 연속 같은 사각형이 나올 때까지 기다린다. */
    await pg.evaluate(async (i) => {
      const e = window.__tap[i]; e.scrollIntoView({ block: 'center', behavior: 'instant' });
      let prev = '', same = 0;
      for (let k = 0; k < 10 && same < 2; k++) {
        await new Promise((r) => requestAnimationFrame(() => setTimeout(r, 12)));
        const r = e.getBoundingClientRect(), key = `${r.top.toFixed(1)},${r.left.toFixed(1)},${r.width.toFixed(1)},${r.height.toFixed(1)}`;
        same = key === prev ? same + 1 : 0; prev = key;
      }
    }, i);
    rows.push(await pg.evaluate(({ i, SEL, R }) => {
      const e = window.__tap[i], b = e.getBoundingClientRect();
      const cx = b.left + b.width / 2, cy = b.top + b.height / 2;
      const name = (x) => { const id = x.id ? '#' + x.id : ''; const cl = (typeof x.className === 'string' && x.className) ? '.' + x.className.trim().split(/\s+/).slice(0, 2).join('.') : ''; return x.tagName.toLowerCase() + id + cl; };
      // ★뷰포트 밖 좌표는 elementFromPoint 가 무조건 null 이라 '못 눌린다'로 오판된다.
      //   문서 맨 끝 요소는 가운데로 못 올라오니 그 점은 검사에서 뺀다(거짓 양성 차단).
      /* ★맞닿은 것과 겹친 것을 가른다.
         44px 짜리 두 줄을 세로로 쌓으면 앞 줄의 ±21.5 점은 뒷 줄과 **0.2px 차이로 스친다**
         (44 를 44.0 으로 재느냐 43.98 로 재느냐에 따라 판정이 뒤집힌다).
         그건 이상적인 밀착 배치이지 결함이 아니다. 반면 'My Page' 사고는 이웃 상자가
         **30px 를 파고든** 것이었다. 그래서 막은 놈의 상자가 내 상자를 얼마나 파고들었는지를 재고,
         1.5px 이하로 스친 것은 결함으로 세지 않는다. 숫자 하나로 둘을 가를 수 있다. */
      const bite = (t) => { const r = t.getBoundingClientRect();
        const w = Math.min(b.right, r.right) - Math.max(b.left, r.left);
        const h = Math.min(b.bottom, r.bottom) - Math.max(b.top, r.top);
        return Math.min(w, h); };
      const probe = (x, y, isCenter) => {
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return { s: 'skip' };
        const t = document.elementFromPoint(x, y);
        if (!t) return { s: 'void' };
        if (t === e || e.contains(t)) return { s: 'ok' };
        /* ★★[CENTER_NO_MERCY 2026-08-09 · 적대 검증 실측] 두 용서(스침·조상)는 **가장자리 전용**이다.
           둘 다 '경계에서 일어나는 측정 잡음'을 위해 만든 것인데, 한가운데에도 적용돼 있었다:
             ①1.4px 폭 타깃 실오라기가 피해자의 세로 중심선을 통째로 차지 → bite 1.4 로 용서 → 초록
             ②stretched-link(카드 ::after 가 inset:0 덮개) → 안쪽 버튼의 **모든 탭**이 카드로 감 →
               가상요소는 원소유자(카드)로 잡히고, 카드는 조상이라 조상 예외로 용서 → 전부 통과
           한가운데는 손가락의 조준점이다 — 거기서 다른 것이 맞았다면 그건 잡음이 아니라 사실이다.
           그래서 C 프로브에서는 어떤 용서도 없다. 가장자리(±21.5)에서만 종전 규칙이 산다. */
        if (!isCenter && bite(t) <= 1.5) return { s: 'ok' };            // 스쳤을 뿐 — 맞닿은 이웃
        /* ★조상이 맞았고 그 점이 내 상자 **경계 1px 안**이면 통과다.
           높이가 딱 44.00px 인 버튼을 ±21.5 로 찌르면 아래 0.5px 자리에서 브라우저가
           자식이 아니라 **부모**를 돌려주는 일이 있다(반올림). 부모는 자식을 덮지 못한다
           — 실제로 가린 것이 아니라 경계에서 미끄러진 것이다. 이걸 '작다'로 세면
           44px 로 맞춰 놓은 칩 넷이 영영 빨갛다.
           ★[CENTER_NO_MERCY] 종전엔 '상자 안 어디든'이었다 — 그 넓이가 stretched-link 강탈을
             숨겼다. 반올림은 경계에서만 일어난다. 경계 1px 띠 밖에서 조상이 잡혔다면
             그건 미끄러짐이 아니라 **덮개**다. */
        const nearEdge = Math.min(Math.abs(x - b.left), Math.abs(x - b.right), Math.abs(y - b.top), Math.abs(y - b.bottom)) <= 1
          && x >= b.left - 1 && x <= b.right + 1 && y >= b.top - 1 && y <= b.bottom + 1;
        if (t.contains(e) && nearEdge) return { s: 'ok' };
        const other = t.closest(SEL);
        return other && other !== e ? { s: 'steal', by: name(other), tx: (other.innerText || other.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 18) } : { s: 'void' };
      };
      const P = { C: probe(cx, cy, true), U: probe(cx, cy - R), D: probe(cx, cy + R), L: probe(cx - R, cy), Rt: probe(cx + R, cy) };
      const list = Object.entries(P).filter(([, v]) => v.s !== 'skip');
      const miss = list.filter(([, v]) => v.s !== 'ok');
      /* ★등급은 **한가운데부터** 본다. 가장자리에 뭐가 걸렸는지로 등급을 정하면
         접힌 아코디언 속 항목이 그 아코디언 토글에 가려진 것까지 '오터치'가 된다(실제로 그랬다).
           C 가 다른 타깃  → 오터치. 누르면 엉뚱한 데로 간다. 제일 나쁘다.
           C 가 안 눌림    → 접힘·가려짐. 지금 화면에서 누를 대상이 아니다.
           C 는 되는데 가장자리에 다른 타깃 → 겹침. 눌리긴 하나 44 창을 이웃과 나눠 쓴다.
           C 는 되는데 가장자리가 빈 곳 → 작다. 순수 크기 부족. */
      /* ★[CLIP_FOLD 2026-08-09 · 적대 검증에서 발견] overflow 로 잘려 안 보이는 것은 등급 밖이다.
         inquiry #dtTrigger(308×48)가 '작다 U D'로 잡혔는데, 실제로는 max-height:0·overflow:hidden
         **접힌 아코디언 안**이었다("날짜를 정했어요"를 골라야 펼쳐진다). getBoundingClientRect 는
         잘림을 모르고 48px 라 말하지만 그 자리엔 아무것도 그려져 있지 않다 — 지금 화면에서
         누를 대상이 아니니 '접힘'과 같은 부류다. 잘림을 안 가르면 접힌 요소의 등급이
         스크롤 위치 따라 작다/접힘 사이를 오간다(재현 불가능한 빨간불 = 아무도 안 믿는 검사). */
      const clipped = (() => {
        let vis = { l: b.left, r: b.right, t: b.top, bm: b.bottom };
        for (let a = e.parentElement; a; a = a.parentElement) {
          const cs = getComputedStyle(a);
          if (!/(hidden|clip|auto|scroll)/.test(cs.overflow + cs.overflowX + cs.overflowY)) continue;
          const ar = a.getBoundingClientRect();
          vis = { l: Math.max(vis.l, ar.left), r: Math.min(vis.r, ar.right), t: Math.max(vis.t, ar.top), bm: Math.min(vis.bm, ar.bottom) };
        }
        return (vis.r - vis.l) < Math.min(8, b.width) || (vis.bm - vis.t) < Math.min(8, b.height);
      })();
      let grade = 'ok';
      if (clipped) grade = 'folded';
      else if (P.C.s === 'steal') grade = 'steal';
      else if (P.C.s !== 'ok') grade = 'folded';
      else if (miss.some(([, v]) => v.s === 'steal')) grade = 'overlap';
      else if (miss.length) grade = 'small';
      return {
        i, grade, k: name(e), box: `${Math.round(b.width)}×${Math.round(b.height)}`,
        tx: (e.innerText || e.getAttribute('aria-label') || '').trim().replace(/\s+/g, ' ').slice(0, 24),
        at: miss.map(([k, v]) => k + (v.by ? `←${v.by}"${v.tx}"` : '')).join(' '),
      };
    }, { i, SEL, R }));
  }

  /* ★[SPACING_24 2026-08-09] '작다'에만 WCAG 2.5.8 의 간격 면제를 적용한다 — 조문 그대로:
     지름 24px 원을 각 타깃의 상자 중심에 놓았을 때, 그 원이 **다른 타깃의 상자**나
     다른 미달 타깃의 원과 겹치지 않으면 크기 미달이어도 적합(AA)이다.
     왜 필요한가 — mypage 로그인 보조 링크는 줄 간격이 29.9px 라 44px 상자를 깔면
     서로 파고들어 **오터치**가 된다(실측). 44 를 채우는 길과 안 겹치는 길이 양립 불가한 자리다.
     간격 24px+ 는 그 딜레마의 WCAG 공인 출구다. 줄 간격을 벌려 44 를 채우는 것은
     화면 모양이 바뀌는 일이라 사용자 선택으로 남긴다.
     ★오터치·겹침에는 절대 적용하지 않는다 — 그건 크기 문제가 아니라 강탈이다. */
  {
    const geo = await pg.evaluate(() => window.__tap.map((t) => {
      const r = t.getBoundingClientRect();
      return { l: r.left + scrollX, t: r.top + scrollY, r: r.right + scrollX, b: r.bottom + scrollY, small: r.width < 24 || r.height < 24 };
    }));
    const cir = (g) => ({ x: (g.l + g.r) / 2, y: (g.t + g.b) / 2 });
    for (const row of rows) {
      if (row.grade !== 'small') continue;
      const me = geo[row.i]; const c = cir(me);
      const clear = geo.every((g, j) => {
        if (j === row.i) return true;
        if (g.small || (g.r - g.l) < 44 || (g.b - g.t) < 44) {           // 상대도 미달이면 원끼리
          const o = cir(g); return Math.hypot(c.x - o.x, c.y - o.y) >= 24;
        }
        const dx = Math.max(g.l - c.x, 0, c.x - g.r), dy = Math.max(g.t - c.y, 0, c.y - g.b);
        return Math.hypot(dx, dy) >= 12;                                  // 원(반지름 12) vs 상자
      });
      if (clear) row.grade = 'spaced';
    }
  }
  const S = rows.filter((r) => r.grade === 'steal');
  const O = rows.filter((r) => r.grade === 'overlap');
  const B = rows.filter((r) => r.grade === 'small');
  const SP = rows.filter((r) => r.grade === 'spaced').length;
  const F = rows.filter((r) => r.grade === 'folded').length;
  steal += S.length; bad += O.length + B.length;
  /* ★[TWO_COUNTS 2026-08-09] 한 이름에 두 숫자를 붙였다가 두 세션이 사흘을 헷갈렸다.
     정착 루프가 세는 43(화면에 보이는 타깃 전부)과 출력의 42(면제를 뺀 것)가
     둘 다 '대상'이었다. 숫자가 안 맞는 줄 알고 원인을 찾아 들어갔는데,
     실은 **같은 것을 다르게 세고 있었을 뿐**이었다(차이 1개 = 문장 속 인라인 <a>).
     ★검사 결과를 두 사람이 대조할 거라면, 두 숫자에 반드시 다른 이름을 준다.
       숫자가 틀린 것보다 이름이 겹치는 것이 사람을 더 멀리 돌게 만든다. */
  console.log(`\n━━ ${page_} — 화면에 ${settled.n} · 잰 것 ${n}(면제 ${settled.n - n})`
    + ` · ★오터치 ${S.length} · ⚠겹침 ${O.length} · ✗작다 ${B.length} · (접힘 ${F}` + ` · 간격면제 ${SP})`);
  // ★TAP_UNSEEN — '전부 통과'가 '전부 쟀다'로 읽히지 않게. 실패는 아니다.
  if (unseen.hid) console.log(`  · 못 잰 것 ${unseen.hid}+(안 그려진 상태 — ${unseen.top.join(' · ')})`
    + `${unseen.hid > n ? '  ← 잰 것보다 많다. 이 쪽은 「통과」가 아니라 「보이는 데까지 봤다」이다' : ''}`);
  /* ★'+' 를 붙인 이유 — 이 수는 **DOM 에 있으나 안 그려진 것**만 센다.
     로그인 뒤 JS 가 나중에 만들어 붙이는 화면(제작 카드·좌석 캔버스·음료 시트)은
     지금 DOM 에 아예 없어 **이 수에도 안 잡힌다.** 그래서 실제 못 잰 것은 늘 이보다 많다.
     ★수를 정확히 만들려 하지 말 것. 정확한 수보다 '이게 전부가 아니다'가 중요하다. */
  const LB = { steal: '★오터치', overlap: '⚠겹침 ', small: '✗작다  ' };
  const seen = new Set();
  for (const r of [...S, ...O, ...B]) {
    const k = r.grade + r.k + r.box; if (seen.has(k)) continue; seen.add(k);
    console.log(`  ${LB[r.grade]} ${r.k} ${r.box} "${r.tx}"   ${r.at}`);
  }
  await ctx.close();
}
await br.close();

/* [CANT_LOOK] 결론 — 재서 틀린 것이 있으면 1(그게 더 급하다) · 그것 없이 못 잰 것만 있으면 2 · 둘 다 없으면 0 */
if (cantLook) console.log(`\n※ 못 연 쪽 ${cantLook}개 — 종료 코드 2 = 재지 못했다(화면 결함 아님) · 1 = 재서 틀렸다`);
console.log(`\n${steal || bad ? `✗ 오터치 ${steal}건 · 겹침·작다 ${bad}건` : (cantLook ? '· 잰 쪽에서는 결함 없음' : '✓ 전부 통과')}`);
process.exit(steal || bad ? 1 : (cantLook ? 2 : 0));
