---
name: Moment Edit
description: 경기 고양시 프라이빗 스몰웨딩 스튜디오 · 신뢰와 절제 · 여백이 고급감 · 사진이 주인공
colors:
  canvas: "#fafaf8"
  canvas-2: "#f5f3ef"
  canvas-3: "#edebe6"
  ink: "#1c1b19"
  sub: "#5a554c"
  light: "#6E6959"
  accent: "#3a2d22"
  seal: "#6b2a24"
  gold: "#b89a75"
  gold-text: "#7a5f37"
  border: "#ddd8d1"
  footer-bg: "#1a1714"
  footer-text: "#c9c3b8"
typography:
  display-en:
    fontFamily: "Cormorant Garamond, Noto Serif KR, Georgia, serif"
    fontWeight: 300
  heading-ko:
    fontFamily: "Noto Serif KR, Nanum Myeongjo, serif"
    fontWeight: 500
    letterSpacing: "-0.02em"
  body:
    fontFamily: "Noto Sans KR, -apple-system, sans-serif"
    fontWeight: 400
    lineHeight: 1.85
  eyebrow-en:
    fontFamily: "Cormorant Garamond, Georgia, serif"
    letterSpacing: "0.22em"
rounded:
  xs: "2px"
  sm: "4px"
  md: "6px"
  lg: "8px"
  xl: "12px"
  pill: "999px"
components:
  button-primary:
    backgroundColor: "{colors.seal}"
    textColor: "{colors.canvas}"
    rounded: "{rounded.pill}"
  button-secondary:
    backgroundColor: "{colors.canvas}"
    textColor: "{colors.accent}"
    rounded: "{rounded.pill}"
---

<!-- ★[DESIGN_MD_POINTER 2026-10-05 사장님 «노션 가이드(frontend-design → DESIGN.md → Impeccable) 분석해서 이용해 보자»]
     이 파일은 impeccable · frontend-design 같은 도구가 작업 폴더에서 «먼저 읽는» 자리에 우리 브랜드를 두기 위한 요약본이다.
     ★정본은 `.claude/skills/momentedit-design/SKILL.md` 다 — 어긋나면 그쪽이 이긴다([DESIGN_AUTHORITY]).
     ★다른 브랜드의 DESIGN.md(getdesign.md · awesome-design-md)를 가져와 덮지 않는다 — 우리 팔레트 · 금지 목록과 정면으로 부딪친다.
     위 색 값은 index.html `:root` 와 같아야 한다 — scripts/audit/design-md-sync.mjs 가 대조한다. -->

## Overview

경기 고양시의 프라이빗 스몰웨딩 스튜디오. 하객 30명 이하 · 한 타임 한 팀 · 가격 전액 공개.
보는 사람은 대형 예식장의 소모적인 하루가 부담스러운 30대 예비부부이고, 그들이 확인하고 싶은 것은 «여기는 믿을 만한가» 하나다.
그래서 디자인 목표는 자극이 아니라 **신뢰와 절제**다. 여백이 곧 고급감이고, 사진이 주인공이고, 타이포는 사진을 받친다.
정적 HTML 사이트(빌드 없음 · 페이지마다 인라인 `<style>` 의 `:root`)라 Tailwind · React 전제 조언은 해당하지 않는다.

## Colors

- 캔버스는 따뜻한 크림(`canvas`), 본문은 순수 검정 대신 먹색(`ink`).
- `seal`(딥 버건디)은 CTA · 강조 포인트에만 — 넓은 면적에 칠하지 않는다.
- **골드는 두 값으로 나눈다.** `gold`(#b89a75)는 선 · 아이콘 · 테두리 전용(글자로 쓰면 2.54:1 · AA 미달),
  골드빛 **글자는 늘 `gold-text`**(#7a5f37 · 5.71:1). 마우스를 올렸을 때(hover)의 글자색도 마찬가지다([HOVER_GOLD_TEXT]).
- 본문 글자는 `light`(5.25:1)보다 옅게 내리지 않는다. 옅어 보이게 하고 싶으면 색이 아니라 크기 · 자간으로.
- 팔레트 밖 색(보라 · 청록 · 형광 · 네온)은 쓰지 않는다.

## Typography

- 영문 라벨(아이브로우): Cormorant, 작게 · 대문자 · 자간 넓게(0.14~0.28em).
- 국문 제목: Noto Serif KR, 굵기 600 이하, 자간 −0.02em 안팎.
- 본문: Noto Sans KR, 행간 1.7~1.9.
- 크기는 11 / 12 / 13 / 14 / 16 / 18 / 20px 일곱 단계(디스플레이 22px 이상은 별도) · 반 px 금지.
- 굵기는 300 / 400 / 500 / 600 네 단계만(350 은 300 으로 붙는 유령값).

## Layout

- 섹션 사이 간격은 인접 요소 간격의 3배 이상 · 본문 폭 65~75자.
- 390px(폰) · 1280px(PC) 두 폭에서 실제로 렌더해 확인한다. 가로 넘침 0.
- 오른쪽 아이콘 레일(`.me-fab-stack`)은 계획된 디자인이다 — 겹친다는 지적은 결함이 아니다([RAIL_LOCKED]).

## Elevation & Depth

- 그림자는 아주 옅게(`0 1px 2px` + `0 8px 24px` 5% 안팎). 글로우 · 색 그림자 · 빛 번짐 없음.

## Shapes

- 모서리는 2 / 4 / 6 / 8 / 12px + 알약(999px). 큰 라운드는 캐주얼해진다.

## Components

- 주 버튼: 진사 바탕 + 크림 글자 · 알약. 보조 버튼: 크림 바탕 + 먹색 글자 · 얇은 테두리.
- 안내 상자는 왼쪽 굵은 세로줄 · 칠한 배경 대신 들여쓰기 · 작은 라벨로([NO_SIDE_STRIPE]).

## Do's and Don'ts

- Do: 여백으로 고급감을 낸다 · 사진을 크게 · 문구는 근거를 붙여 안심시킨다.
- Don't: 다크 모드 · 글래스모피즘(모바일 메뉴 1곳만 예외) · 네온 · 글로우 · 그라디언트 메시.
- Don't: 튕김 · 회전 · 3D 틸트 · 과한 패럴랙스 · 자동 재생 캐러셀 · 팝업 · 카운트다운 · 긴급성 배너.
  (예외 한 곳: 예식을 마친 뒤 마이페이지를 처음 열 때의 축하 그림 [WED_DONE_CELEBRATE])
- Don't: UI 장식 이모지 · 고객 문구의 전각 줄표 · 지어낸 숫자(사용자 수 · 평점).
