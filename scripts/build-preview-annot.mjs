#!/usr/bin/env node
/* 청첩장 예시 이미지 생성기 — assets/preview/*.png
 * ────────────────────────────────────────────────────────────────
 * ★이 파일을 지우지 말 것. 2026-08-02 판까지는 임시 스크립트로 뽑고 버려서,
 *   2026-08-03 에 "예시 퀄리티를 올리자"는 지시가 왔을 때 원본이 없어 통째로 다시 만들었다.
 *   예시를 다시 뽑아야 할 일은 반드시 또 온다(디자인 수정·문구 변경·표본 교체).
 *
 * 하는 일: 실제 청첩장 페이지(i/cover-NN · i-family/family-NN)를 표본 데이터로 띄우고,
 *          "여기를 고칠 수 있어요" 주석(점선 + 라벨)을 얹어 통짜 스크린샷을 뜬다.
 *
 * 사용법:
 *   node scripts/build-preview-annot.mjs               전체(16장)
 *   node scripts/build-preview-annot.mjs 04            04만 양면
 *   node scripts/build-preview-annot.mjs 04 family     04 오프라인만
 *   node scripts/build-preview-annot.mjs --check       주석 대상이 전부 잡히는지만 점검(이미지 안 씀)
 *   PORT=8099 node scripts/build-preview-annot.mjs     로컬 서버 포트 지정(기본 8099)
 *
 * ── 주석 디자인 규칙(2026-08-03 사용자 지적으로 전면 재설계) ──
 *  ① 점선은 **글자 실제 폭**을 감싼다. 예전엔 요소 박스(367px 전폭)를 감싸서
 *     가운데 정렬된 '초대의 글'(70px) 둘레에 빈 상자가 크게 떠 있었다 → Range 로 잉크 폭을 잰다.
 *  ② 점선은 가늘게(1.1px · 대시 4/3.5). 예전 2px 굵은 대시는 청첩장 본문보다 강해
 *     "예시가 아니라 오류 표시"처럼 읽혔다.
 *  ③ 모서리 반경은 5px 고정. 예전 999px 알약 반경이 가로로 긴 상자에 걸려 캡슐처럼 보였다.
 *  ④ 라벨은 자기 상자의 위 모서리에 탭처럼 걸친다. 상자가 세로로 촘촘히 쌓이면
 *     좌/우를 번갈아 놓아 아래 상자를 덮지 않는다 — '한글 부제' 라벨이 인사말 상자 위에
 *     얹혀 엉뚱한 곳을 가리키던 사고(2026-08-03 제보)가 이 규칙이 없어서 났다.
 *  ⑤ 그래도 겹치면 상자 바깥(좌/우)으로 밀어낸다. 마지막 수단은 아래 모서리.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';
// playwright 는 전역 설치본을 쓴다(저장소에 node_modules 를 두지 않는다) — 없으면 npm i -g playwright
const require_ = createRequire(import.meta.url);
let chromium;
try { ({ chromium } = require_('playwright')); }
catch (e) { ({ chromium } = require_(require_('child_process').execSync('npm root -g').toString().trim() + '/playwright')); }

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PORT = process.env.PORT || 8099;
const BASE = `http://127.0.0.1:${PORT}`;
const OUT = path.join(ROOT, 'assets/preview');

/* ── 디자인별 주석 대상 ─────────────────────────────────────────
 * cover-NN(온라인)과 family-NN(오프라인)은 같은 디자인의 두 판이라 마크업이 같다 → 표 하나로 양면을 덮는다.
 * sel  : 대상 선택자. nth 로 몇 번째인지 지정(같은 클래스가 다른 섹션에도 쓰이는 디자인이 있다).
 * label: 고객이 위저드에서 실제로 채우는 칸 이름과 같은 말을 쓸 것 — 다르면 어디를 고치는지 못 잇는다.
 * group: 같은 group 이면 상자 하나로 합친다(이름+날짜처럼 한 덩어리로 읽히는 것).
 *
 * ★선택자는 반드시 브라우저로 확인하고 적을 것 — 8종은 클래스 이름이 제각각이라 짐작이 거의 다 빗나간다.
 *   (한글 이름 하나만 봐도 01·02·03·06·07 은 .cover-names-ko, 05 는 .cover-title-ko, 08 은 .cover-display .ko,
 *    04 는 세로 .vname 두 개다. 혼주 성함은 01 .inv-parents / 02 .parents / 03·05·06 .inv-sig-parents /
 *    04 .sign-parents / 07 .parents / 08 .gs-parents — 여섯 가지다.)
 *   아래 표의 값은 2026-08-03 에 표본(?e=test-couple · 신랑 이서준 / 신부 정하윤 / 혼주 이재환·최미경, 정영석·박윤희)으로
 *   16장 모두 실측해 넣은 것이다. 마크업이 바뀌면 --check 가 잡아 준다.
 *
 * 부제(큰 제목 아래 작은 줄)는 shared/hydrate.js applyTitles 의 SUB 표가 단일 원천이다:
 *   { '03': '.inv-title-sub', '04': '.sec-title-ko', '07': '.inv-title-ko', '08': '.sec-title-ko' }
 *   → 01·02·05·06 은 부제 칸 자체가 없다(고객이 채울 수 없으므로 주석도 달지 않는다).
 */
const SPEC = {
  // 01 표지는 영문 이름 → 한글 이름 → 날짜가 60~80px 간격으로 이어져 한 상자로 합쳐진다.
  // 축의는 <details> 가 아니라 .open 클래스로 여는 버튼 아코디언이라 캡처 때 펼쳐지지 않는다(run() 의
  // details 강제 펼침이 안 먹는다) — 펼친 본문(.env-acc-a)을 잡으면 화면에 없는 380px 를 감싸므로
  // 보이는 제목 줄(.env-acc-q)만 잡는다. 8종 중 유일하게 계좌번호가 접힌 채 찍힌다.
  '01': [
    { g: '이름·날짜', sel: '.cover-names, .cover-names-ko, .cover-date', all: true },
    { g: '큰 제목', sel: '.inv-title', nth: 0 },          // 01 만 제목에 id 가 없다(#sec-01-title 없음)
    { g: '인사말 — 직접 작성', sel: '.inv-text', nth: 0 },
    { g: '혼주 성함', sel: '.inv-parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc-item', all: true },   // 위에서 .open 을 켜므로 펼친 본문까지 감싼다
  ],
  // 02 표지는 눈썹줄이 예식 월({{WEDDING_MONTH_EN}})이라 이름 바로 위에 날짜가 붙어 있다 → 한 덩어리.
  // 상단 마스트헤드의 .cover-mast-date 는 04 의 .cover-date-tag 와 같은 장식 태그라 04 를 따라 뺀다.
  // 서명은 표가 아니라 바이라인 — 부모 성함이 .parents 라는 흔한 이름이므로 .inv-byline 으로 묶어 둔다.
  '02': [
    { g: '이름·날짜', sel: '.cover-eyebrow, .cover-names-en, .cover-names-ko', all: true },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '인사말 — 직접 작성', sel: '.inv-text', nth: 0 },
    { g: '혼주 성함', sel: '.inv-byline .parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc-item', all: true },
  ],
  // 03 은 표지 카드 한 장 안에 모노그램(영문)·한글 이름·날짜·요일이 차례로 들어 있어 한 상자로 합쳐진다.
  // 부제가 영문인 디자인은 03 뿐이다(SUB 표).
  '03': [
    { g: '이름·날짜', sel: '.cover-monogram, .cover-names-ko, .cover-date, .cover-date-sub', all: true },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '영문 부제', sel: '.inv-title-sub', nth: 0 },
    { g: '인사말 — 직접 작성', sel: '.inv-text', nth: 0 },
    { g: '혼주 성함', sel: '.inv-sig-parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc-item', all: true },
  ],
  '04': [
    // 표지는 세로 한글 이름과 아래 영문+날짜가 500px 떨어져 있다 — 한 상자로 묶으면 빈 여백을
    // 크게 감싸는 상자가 되고, 같은 라벨 두 개를 붙이면 되풀이로 읽힌다. 각자 가진 것을 이름으로 부른다.
    { g: '이름', sel: '.vname', all: true },
    { g: '이름(영문) · 날짜', sel: '.cover-en-names, .cover-date', all: true },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '한글 부제', sel: '.sec-title-ko', nth: 0 },
    { g: '인사말 — 직접 작성', sel: '.invite-text', nth: 0 },
    { g: '혼주 성함', sel: '.sign-parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.acc', all: true },
  ],
  // 05 표지는 영문 이름 → 한글 이름 → 큰 날짜(.cover-date-hero) → 요일·시간 순. 한글 이름과 큰 날짜
  // 사이가 80px 라 아슬아슬하게 한 상자로 합쳐진다(합치기 기준 90px).
  // ★ .cover-title 은 05 에서 표지 h1 자체다 — 06 의 .cover-title(이름 묶음 래퍼)과 다른 물건이니 옮겨 쓰지 말 것.
  '05': [
    { g: '이름·날짜', sel: '.cover-title, .cover-title-ko, .cover-date-hero, .cover-date-sub', all: true },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '인사말 — 직접 작성', sel: '.inv-text', nth: 0 },
    { g: '혼주 성함', sel: '.inv-sig-parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc-item', all: true },
  ],
  // 06 은 한글 이름이 크고(h1.cover-names-ko) 영문이 그 아래 작게 붙는다 — 8종 중 한글이 주인공인 유일한 표지.
  '06': [
    { g: '이름·날짜', sel: '.cover-names-ko, .cover-names-en, .cover-date, .cover-date-sub', all: true },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '인사말 — 직접 작성', sel: '.inv-text', nth: 0 },
    { g: '혼주 성함', sel: '.inv-sig-parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc-item', all: true },
  ],
  // 07 은 표지 날짜가 상단 태그(.cover-date-tag)와 하단 푸터(.cover-foot-left, 식장명과 한 줄)로 흩어져 있어
  // 04 같은 '영문 이름 + 날짜' 덩어리가 없다 → 이름만 잡는다(푸터를 잡으면 식장명까지 묶이고, 이름과 380px 떨어져
  // 같은 라벨 상자가 둘로 갈라진다). 서명은 표(table.inv-table) — 부모 성함 클래스가 .parents 라 표로 묶어 둔다.
  '07': [
    { g: '이름', sel: '.cover-names, .cover-names-ko', all: true },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '한글 부제', sel: '.inv-title-ko', nth: 0 },
    { g: '인사말 — 직접 작성', sel: '.inv-text', nth: 0 },
    { g: '혼주 성함', sel: '.inv-table .parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc-item', all: true },
  ],
  // 08 표지 h1 은 'We are getting married.' 고정문이고 고객이 채우는 건 그 안의 한글 이름 스팬뿐이라
  // .cover-display 를 통째로 잡으면 못 고치는 영문 문장까지 감싼다 → .cover-display .ko 만.
  // 날짜는 하단 메타 줄이 식장명과 좌우로 나뉘어 있어(.cover-meta / .cover-meta.r) 이름에 붙는 날짜 덩어리가 없다.
  // 인사말 본문은 .greeting(.inv-text 아님), 계좌는 .env-acc(다른 7종의 -item 접미사가 없다).
  '08': [
    { g: '이름', sel: '.cover-display .ko', nth: 0 },
    { g: '큰 제목', sel: '#sec-01-title', nth: 0 },
    { g: '한글 부제', sel: '.sec-title-ko', nth: 0 },       // 08 은 섹션마다 있어 5개 — 첫 번째(초대의 글)만
    { g: '인사말 — 직접 작성', sel: '.greeting', nth: 0 },
    { g: '혼주 성함', sel: '.gs-parents', all: true },
    { g: '마음 전하실 곳 — 계좌', sel: '.env-acc', all: true },
  ],
};

/* 페이지 안에서 도는 주석 그리기 — 위 규칙 ①~⑤가 여기 들어 있다 */
const DRAW = `(SPEC) => {
  const SEAL = '#6B2A24';
  const PAD = 6;            // 잉크 둘레 여백
  const st = document.createElement('style');
  st.textContent = \`
    .anx-layer{position:absolute;inset:0;pointer-events:none;z-index:99999}
    .anx-box{position:absolute;border:1.1px dashed rgba(107,42,36,.66);border-radius:5px}
    .anx-lb{position:absolute;display:inline-flex;align-items:center;gap:4px;
      background:\${SEAL};color:#fff;border-radius:4px;padding:3px 7px;
      font-family:-apple-system,BlinkMacSystemFont,'Apple SD Gothic Neo','Noto Sans KR',sans-serif;
      font-size:10px;font-weight:600;letter-spacing:-0.01em;line-height:1.25;white-space:nowrap;
      box-shadow:0 1px 2px rgba(40,20,14,.18)}
    .anx-lb svg{width:9px;height:9px;flex:none;opacity:.92}
  \`;
  document.head.appendChild(st);
  const layer = document.createElement('div');
  layer.className = 'anx-layer';
  document.body.appendChild(layer);

  const PENCIL = '<svg viewBox="0 0 16 16" fill="none" stroke="#fff" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M11.5 2.5l2 2L6 12l-2.6.6L4 10z"/></svg>';

  /* 글자의 실제 잉크 상자(규칙 ①).
     ★ selectNodeContents(el) 하나로 재면 안 된다 — 안에 블록 자식이 있으면 그 블록 상자(전폭)가
       그대로 잡혀, 가운데 정렬된 짧은 글 둘레에 전폭 점선이 그려진다(2026-08-03 표지 '이름·날짜'에서 실측).
       텍스트 노드를 하나씩 걸어 각 줄 상자만 합친다. */
  const inkRect = (el) => {
    const w = document.createTreeWalker(el, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    let l = Infinity, t = Infinity, rr = -Infinity, bb = -Infinity, any = false;
    let n;
    while ((n = w.nextNode())) {
      const r = document.createRange(); r.selectNodeContents(n);
      for (const x of r.getClientRects()) {
        if (x.width < 1 || x.height < 1) continue;
        any = true;
        l = Math.min(l, x.left); t = Math.min(t, x.top);
        rr = Math.max(rr, x.right); bb = Math.max(bb, x.bottom);
      }
    }
    if (!any) { const b = el.getBoundingClientRect(); return b.width ? b : null; }
    return { left: l, top: t, right: rr, bottom: bb, width: rr - l, height: bb - t };
  };

  const sy = window.scrollY, sx = window.scrollX;
  const boxes = [], missing = [];

  for (const spec of SPEC) {
    const els = [...document.querySelectorAll(spec.sel)];
    const pick = spec.all ? els : (els[spec.nth || 0] ? [els[spec.nth || 0]] : []);
    const rects = pick.map(inkRect).filter(Boolean);
    if (!rects.length) { missing.push(spec.g); continue; }
    // all:true 는 한 덩어리로 합치되, 세로로 크게 떨어져 있으면(다른 섹션) 나눠 그린다
    const groups = [];
    rects.sort((a, b) => a.top - b.top).forEach(r => {
      const last = groups[groups.length - 1];
      if (last && r.top - last.bottom < 90) {
        last.left = Math.min(last.left, r.left); last.right = Math.max(last.right, r.right);
        last.top = Math.min(last.top, r.top); last.bottom = Math.max(last.bottom, r.bottom);
      } else groups.push({ left: r.left, right: r.right, top: r.top, bottom: r.bottom });
    });
    groups.forEach(gr => boxes.push({
      label: spec.g,
      x: gr.left + sx - PAD, y: gr.top + sy - PAD,
      w: (gr.right - gr.left) + PAD * 2, h: (gr.bottom - gr.top) + PAD * 2,
    }));
  }

  boxes.sort((a, b) => a.y - b.y);

  /* 청첩장 본문 글자 자리 — 라벨이 남의 글자를 덮지 않게(2026-08-03 2차 지적의 뿌리).
     점선 상자·다른 라벨만 피하게 했더니 라벨이 바로 위 '이서준'·'Seojun' 위에 앉았다.
     문서의 모든 텍스트 노드 잉크를 모아 후보 채점에 같이 넣는다. */
  const inkAll = [];
  {
    const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
      acceptNode: (n) => (n.nodeValue && n.nodeValue.trim()) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT,
    });
    let n;
    while ((n = w.nextNode())) {
      const pe = n.parentElement;
      if (!pe || pe.closest('.anx-layer')) continue;
      const cs = getComputedStyle(pe);
      if (cs.visibility === 'hidden' || cs.display === 'none' || parseFloat(cs.opacity) < 0.05) continue;
      const r = document.createRange(); r.selectNodeContents(n);
      for (const x of r.getClientRects()) {
        if (x.width < 2 || x.height < 2) continue;
        inkAll.push({ x: x.left + sx, y: x.top + sy, w: x.width, h: x.height });
      }
    }
  }

  // 라벨 배치 — 자기 상자 위 모서리에 탭으로 걸치되, 위 상자와 부딪히면 좌우를 바꾸고
  // 그래도 안 되면 상자 바깥으로 밀어낸다(규칙 ④⑤).
  const placed = [];
  const overlap = (a, b) => !(a.x + a.w <= b.x || b.x + b.w <= a.x || a.y + a.h <= b.y || b.y + b.h <= a.y);
  const docW = document.documentElement.scrollWidth;

  boxes.forEach((bx, i) => {
    const el = document.createElement('div');
    el.className = 'anx-box';
    el.style.cssText = \`left:\${bx.x}px;top:\${bx.y}px;width:\${bx.w}px;height:\${bx.h}px\`;
    layer.appendChild(el);

    const lb = document.createElement('div');
    lb.className = 'anx-lb';
    lb.innerHTML = PENCIL + '<span>' + bx.label + '</span>';
    layer.appendChild(lb);
    const lw = lb.offsetWidth, lh = lb.offsetHeight;

    /* 후보 자리 — 어느 것도 상자 **안**으로 들어가지 않는다(규칙 ④ 보강 · 2026-08-03 2차).
       1차 판에선 라벨을 상자 위 모서리에 절반 걸쳤는데, '초대의 글'·'이재환 · 최미경'처럼
       한 줄짜리 낮은 상자에선 그 절반이 글자를 통째로 덮었다. 위/아래/좌/우 바깥만 쓴다. */
    const GAP = 3;
    const cands = [
      { x: bx.x,                     y: bx.y - lh - GAP },        // 위-왼
      { x: bx.x + bx.w - lw,         y: bx.y - lh - GAP },        // 위-오른
      { x: bx.x + bx.w + 5,          y: bx.y + (bx.h - lh) / 2 }, // 오른쪽 바깥
      { x: bx.x - lw - 5,            y: bx.y + (bx.h - lh) / 2 }, // 왼쪽 바깥
      { x: bx.x,                     y: bx.y + bx.h + GAP },      // 아래-왼
      { x: bx.x + bx.w - lw,         y: bx.y + bx.h + GAP },      // 아래-오른
    ];
    let best = null, bestScore = -1e9;
    cands.forEach((c, ci) => {
      if (c.x < 2 || c.x + lw > docW - 2) return;
      const r = { x: c.x, y: c.y, w: lw, h: lh };
      let bad = 0;
      boxes.forEach(o => { if (overlap(r, o)) bad += 10; });      // 어떤 점선 상자와도 겹치면 안 된다(자기 것 포함)
      placed.forEach(o => { if (overlap(r, o)) bad += 8; });      // 다른 라벨과도
      for (const t of inkAll) { if (overlap(r, t)) { bad += 6; break; } }   // 청첩장 본문 글자와도
      const score = -bad - ci * 0.5;                              // 앞 후보 선호
      if (score > bestScore) { bestScore = score; best = r; }
    });
    best = best || { x: bx.x, y: bx.y - lh - GAP, w: lw, h: lh };
    lb.style.left = best.x + 'px';
    lb.style.top = best.y + 'px';
    placed.push(best);
  });

  return { drawn: boxes.length, missing };
}`;

async function run() {
  const args = process.argv.slice(2);
  const checkOnly = args.includes('--check');
  const only = args.find(a => /^0[1-8]$/.test(a));
  const onlySide = args.find(a => a === 'family' || a === 'digital');

  if (!checkOnly) fs.mkdirSync(OUT, { recursive: true });
  const browser = await chromium.launch();
  let fail = 0;
  const report = [];

  for (const n of Object.keys(SPEC)) {
    if (only && n !== only) continue;
    for (const side of ['family', 'digital']) {
      if (onlySide && side !== onlySide) continue;
      /* ?e=test-couple — 표본 경로. 이게 있어야 ① 오시는 길에 지도 도식이 서고(VENUE_MAP_DEMO)
         ② 온라인 표지 Enter 가 표본 라이브로 나간다. 시트 조회는 타지 않는다(hydrate 가 SAMPLE 로 즉시 그린다). */
      const url = `${BASE}/${side === 'family' ? 'i-family/family' : 'i/cover'}-${n}.html?e=test-couple`;
      const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
      const errs = [];
      page.on('pageerror', e => errs.push(String(e).slice(0, 90)));
      try {
        await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 });
        await page.waitForTimeout(2200);
        // 스크롤 등장 애니메이션을 전부 끝난 상태로 고정(통짜 캡처라 뷰포트 밖도 보여야 한다)
        await page.evaluate(() => {
          document.querySelectorAll('.reveal').forEach(e => {
            e.classList.add('in', 'show', 'visible');
            e.style.opacity = '1'; e.style.transform = 'none'; e.style.transition = 'none';
          });
          document.querySelectorAll('.cover-scroll').forEach(e => { e.style.display = 'none'; });
          /* 계좌는 접힌 아코디언(details.acc)이다 — 편집 대상(계좌번호)이 보여야 예시 구실을 한다.
             ★ open 속성만 켜면 안 된다: 한쪽만 열리는 배타 토글이 있으면 곧바로 다시 닫히고,
               그 뒤에 주석을 그리면 이미 어긋난 자리에 점선이 남는다(2026-08-03 신랑측이 닫힌 채 실측).
               CSS 로 본문을 강제 노출하고, open 은 표식(+/×) 방향을 맞추는 용도로만 함께 켠다. */
          /* ★ display 만 켜면 글자가 안 나온다 — 크롬은 닫힌 details 의 내용을 content-visibility:hidden
             으로 건너뛴다. 자리(216px)는 잡히는데 글자는 안 그려져, 신랑측 칸이 빈 상자로 찍혔다(실측).
             게다가 이 아코디언은 한쪽만 열리는 배타 토글이라 open 을 둘 다 켜도 앞엣것이 곧 닫힌다.
             그래서 open 에 기대지 않고 CSS 로 내용을 드러낸다. 표식(+/×)도 펼친 모양으로 고정. */
          const fs2 = document.createElement('style');
          fs2.textContent = 'details{display:block!important}'
            + 'details > summary{list-style:none}'
            + 'details > *:not(summary){display:block!important;height:auto!important;overflow:visible!important;'
            + 'content-visibility:visible!important;contain-intrinsic-size:auto!important}'
            + 'details.acc summary::after{transform:rotate(45deg)!important}'
            /* ★핵심: 닫힌 details 의 내용은 라이트 DOM 자식이 아니라 UA 그림자의 ::details-content 가
               display:none 으로 잡는다. 자식만 켜면 자리(216px)는 잡히는데 부모 details 는 77px 에 머물러
               내용이 잘려 빈 칸으로 찍힌다(신랑측 실측). Chromium 131+ 는 이 가상요소를 직접 열 수 있다. */
            + 'details::details-content{display:block!important;content-visibility:visible!important;'
            + 'block-size:auto!important;height:auto!important;opacity:1!important}';
          document.head.appendChild(fs2);
          document.querySelectorAll('details').forEach(d => { d.open = true; });
          /* 01 은 <details> 가 아니라 .env-acc-item.open 클래스로 여는 버튼 아코디언이다
             (.open 이면 .env-acc-a{max-height:2000px}). 위 details 강제는 안 먹으므로 클래스를 직접 켠다.
             이걸 안 하면 8종 중 01 만 계좌번호가 접힌 채 찍혀 예시 구실을 못 한다. */
          document.querySelectorAll('.env-acc-item').forEach(e => {
            e.classList.add('open');
            const q = e.querySelector('.env-acc-q'); if (q) q.setAttribute('aria-expanded', 'true');
          });
        });
        await page.waitForTimeout(500);
        await page.evaluate(() => { document.querySelectorAll('details').forEach(d => { d.open = true; }); });   // 토글이 되돌렸을 경우 한 번 더
        await page.waitForTimeout(400);
        const res = await page.evaluate(new Function('SPEC', `return (${DRAW})(SPEC)`), SPEC[n]);
        const tag = `${side}-${n}`;
        if (res.missing.length) { fail = 1; report.push(`  ✗ ${tag} 대상 못 찾음: ${res.missing.join(', ')}`); }
        else report.push(`  ok ${tag} 주석 ${res.drawn}개${errs.length ? ' (JS오류 ' + errs.length + ')' : ''}`);
        if (!checkOnly) {
          await page.screenshot({ path: path.join(OUT, `prev-${side}-${n}.png`), fullPage: true });
          /* 위저드 2/4 단계(혼주·마음 전하실 곳)에 인라인으로 붙는 작은 예시.
             통짜 캡처와 따로 찍지 않고 같은 화면에서 잘라 낸다 — 따로 찍으면 두 이미지의
             주석 두께·라벨 문구가 갈린다(예전 판이 실제로 그랬다). 오프라인 판만 쓴다(EG_SIDE_HONEST). */
          if (side === 'family') {
            for (const [key, name] of [['혼주 성함', 'parents'], ['마음 전하실 곳 — 계좌', 'env']]) {
              const box = await page.evaluate((k) => {
                const labs = [...document.querySelectorAll('.anx-lb')].filter(e => e.innerText.trim() === k);
                if (!labs.length) return null;
                const rs = [];
                labs.forEach(l => {
                  rs.push(l.getBoundingClientRect());
                  // 라벨과 짝인 상자 = 라벨에 가장 가까운 상자
                  let best = null, bd = 1e9;
                  document.querySelectorAll('.anx-box').forEach(bx => {
                    const b = bx.getBoundingClientRect();
                    const lb2 = l.getBoundingClientRect();
                    const d = Math.hypot(b.left - lb2.left, b.top - lb2.top);
                    if (d < bd) { bd = d; best = b; }
                  });
                  if (best) rs.push(best);
                });
                let t = 1e9, b2 = -1e9;
                rs.forEach(r => { t = Math.min(t, r.top + scrollY); b2 = Math.max(b2, r.bottom + scrollY); });
                // 아래는 넉넉히 — 혼주 줄 바로 밑에 오는 이름('장남 이서준')까지 보여야 어느 자리인지 읽힌다.
                // 22px 이면 그 이름이 글자 중간에서 잘렸다(2026-08-03 실측).
                // 위아래 모두 넉넉히 — 위엔 신랑·신부 이름, 아래엔 '장남 이서준' 같은 호칭 줄이 온다.
                // 20px 이면 위 이름이 글자 중간에서 잘렸다(03·05·06·08 실측).
                return { top: Math.max(0, t - 58), bottom: b2 + 62 };
              }, key);
              if (!box) continue;
              await page.screenshot({
                path: path.join(OUT, `sec-family-${n}-${name}.png`),
                clip: { x: 0, y: box.top, width: 430, height: Math.max(60, box.bottom - box.top) },
                fullPage: true,
              });
            }
          }
        }
      } catch (e) {
        fail = 1; report.push(`  ✗ ${side}-${n} ${String(e).slice(0, 90)}`);
      }
      await page.close();
    }
  }
  /* 모바일 참석 화면(live.html)의 계좌 예시 — 위저드 2/4 단계에 청첩장 크롭과 나란히 붙는다.
     예전엔 이 한 장만 따로 찍어서 점선 굵기·라벨 모양이 청첩장 예시와 달랐다(2026-08-03 실측:
     굵은 점선 + 알약 라벨 + 첫 줄만 감싼 상자). 같은 그리기 코드를 태워 손을 맞춘다. */
  if (!only) {
    const LIVE_SPEC = [{ g: '마음 전하실 곳 — 계좌', sel: '.env-item', all: true }];
    const page = await browser.newPage({ viewport: { width: 430, height: 932 }, deviceScaleFactor: 2 });
    try {
      await page.goto(`${BASE}/live.html?e=test-couple`, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(2500);
      await page.evaluate(() => {
        document.querySelectorAll('.reveal').forEach(e => {
          e.classList.add('in', 'show', 'visible');
          e.style.opacity = '1'; e.style.transform = 'none'; e.style.transition = 'none';
        });
        document.querySelectorAll('.env-item').forEach(e => {
          e.classList.add('open');
          const q = e.querySelector('.env-q'); if (q) q.setAttribute('aria-expanded', 'true');
        });
        document.querySelectorAll('.env-a').forEach(e => { e.style.maxHeight = 'none'; e.style.overflow = 'visible'; });
      });
      await page.waitForTimeout(600);
      const res = await page.evaluate(new Function('SPEC', `return (${DRAW})(SPEC)`), LIVE_SPEC);
      if (res.missing.length) { fail = 1; report.push(`  ✗ live 대상 못 찾음: ${res.missing.join(', ')}`); }
      else {
        report.push(`  ok live 주석 ${res.drawn}개`);
        if (!checkOnly) {
          const box = await page.evaluate(() => {
            const rs = [...document.querySelectorAll('.anx-box'), ...document.querySelectorAll('.anx-lb')]
              .map(e => e.getBoundingClientRect());
            let t = 1e9, b = -1e9;
            rs.forEach(r => { t = Math.min(t, r.top + scrollY); b = Math.max(b, r.bottom + scrollY); });
            return { top: Math.max(0, t - 58), bottom: b + 30 };
          });
          await page.screenshot({
            path: path.join(OUT, 'sec-live-account.png'),
            clip: { x: 0, y: box.top, width: 430, height: Math.max(60, box.bottom - box.top) },
            fullPage: true,
          });
        }
      }
    } catch (e) { fail = 1; report.push(`  ✗ live ${String(e).slice(0, 90)}`); }
    await page.close();
  }
  await browser.close();
  console.log(report.join('\n'));
  console.log(fail ? '\n주석 대상 누락이 있다 — SPEC 의 선택자를 고칠 것' : '\n전부 정상');
  process.exit(fail);
}
run();
