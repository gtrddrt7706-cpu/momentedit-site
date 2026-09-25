# MOMENTEDIT_EXCEPTIONS — 새 스킬이 권하지만 이 사이트에선 틀린 것

`impeccable` · `web-design-guidelines` · `frontend-design` 는 **범용**이다. 이 사이트를 모른다.
아래는 그 셋이 권하거나 결함으로 채점하는데 **여기선 틀린 것**이다. 점검에서 이 항목이 나오면
**지적으로 올리지 않는다.** 순서는 `CLAUDE.md` 의 `[DESIGN_SKILLS_12]` — `momentedit-design` 다음이 이 문서다.

## 적는 법 (점검이 같은 지적을 두 번 올리면 여기로)

`### [EXC_이름] 한 줄 제목` 아래에 넷을 적는다 — **누가 권하나**(스킬 · 파일 · 원문) ·
**왜 여기선 틀리나** · **근거**(표식 · 파일 · 사장님 지시) · **날짜**.
★«취향이 다르다»는 여기 들어오지 않는다. 그건 코워크에 올린다([COWORK_SPLIT_0925]).
여기는 «이 사이트의 사실이 그 규칙의 전제를 깬다»만 적는다.

---

### [EXC_EYEBROW] 제목 위 영문 라벨(아이브로우)은 지우지 않는다 ★가장 위험

- **누가**: `impeccable/reference/craft-floor.md` «Refuse» — *"A kicker or eyebrow above a heading.
  **This one is a ban, not a default: no brief earns it back.** … delete the label and let the heading speak."*
  impeccable 은 모든 UI 수정 **직전에** 이 파일을 읽으라고 한다(SKILL.md 3번 단계).
- **왜 틀리나**: `THE REALITY` → `결혼식 하루가` 는 이 사이트 타이포의 **뼈대**다. `index.html` 에 `.sec-label` 17개
  (2026-09-25 실측). `momentedit-design` 「타이포그래피」가 «이미 좋은 패턴이다 · **바꾸지 말고 일관되게 지켜라**»라고 적는다.
- **위험**: `polish`·`distill`·`quieter` 갈래를 돌리면 «금지 항목 정리»로 17개를 **한 번에** 지울 수 있다.
  규칙 문장이 «어떤 브리프도 되살리지 못한다»라 스킬 안에서는 되돌릴 근거가 없다.
- **날짜**: 2026-09-25

### [EXC_SECTION_NUM] `Nº 02` 같은 번호는 정보다

- **누가**: `craft-floor.md` — *"Section numbers (01 / 02 / 03) unless the sequence itself carries information."*
- **왜 틀리나**: 스킬이 단 조건 그대로 «정보를 담는» 경우다. `inquiry.html` 의 번호는 신청서 단계 순서이고
  **제목보다 큰 앵커**다([SEC_TITLE_DEVICE] — `Nº 02` 18px > 「예식 정보」 17px). `index.html` 저널 카드 `Nº 01` 도 같은 관용.
- **날짜**: 2026-09-25

### [EXC_NO_DARK] 다크모드 «없음»은 결함이 아니다

- **누가**: `impeccable/reference/audit.md` 3. Theming — *"Broken dark mode: Missing dark mode variants"* 를 감점 ·
  `web-interface-guidelines.md` — *"`color-scheme: dark` on `<html>` for dark themes"*.
- **왜 틀리나**: 다크는 이 브랜드의 **금지 항목**이다(`momentedit-design` 「절대 하지 말 것」).
  `index.html` 의 `@media (prefers-color-scheme: dark)` 블록은 다크를 넣는 코드가 아니라 **라이트를 강제하는 방어 코드**다 —
  지우면 iOS 상태바에 검은 띠가 돌아온다. 이 감점은 받아들이고 점수를 올리려 하지 않는다.
- **날짜**: 2026-09-25

### [EXC_FUNC_ICON] 허용된 기능 아이콘 이모지는 둔다

- **누가**: `craft-floor.md` — *"Unicode glyphs or emoji standing in for an icon system."*
- **왜 틀리나**: CLAUDE.md 「문구 규칙」이 허용한 것은 셋뿐이다 — 카드 아이콘 🍽🍃 · 대본 라벨 🔊🎵 · D-day 「오늘이에요 🤍」 1곳.
  **이 셋은 둔다.** 그 밖의 새 이모지를 막는 것은 우리 규칙과 같은 방향이니 따로 적을 필요 없다.
- **날짜**: 2026-09-25

### [EXC_MOTION_TWO] 모션은 두 종류뿐이다 — 섹션마다 같은 등장은 설계다

- **누가**: `craft-floor.md` Verify·Motion — *"not one identical entrance on every section"* ·
  *"Reach past transform and opacity: blur, backdrop-filter, clip-path, mask, and shadow belong to the palette"*.
- **왜 틀리나**: `momentedit-design` 「모션」이 허용하는 것은 **스크롤 진입 페이드업**과 **미세 호버** 둘뿐이다.
  `.reveal` 36곳이 같은 등장인 것은 «한 목소리»로 고른 결과다. blur·backdrop-filter 를 모션 팔레트에 넣는 것은
  글래스모피즘 금지와 부딪힌다. `bolder`·`delight`·`overdrive`·`animate` 갈래가 특히 이쪽으로 민다.
- **날짜**: 2026-09-25

### [EXC_EASE_VAR] 이징은 리터럴이 아니라 `var(--ease)`

- **누가**: `impeccable/reference/animate.md` 등 — *"Use natural deceleration such as `cubic-bezier(0.16, 1, 0.3, 1)`"*.
- **왜 틀리나**: 값은 맞다 — 우리 `--ease` 와 **같은 곡선**이다. 다만 리터럴로 쓰면 중복이 된다([MOTION_RAMP5] · 7곳 정리한 이력).
  권고의 방향은 따르고 **쓰는 모양만** `var(--ease)` 로.
- **날짜**: 2026-09-25

### [EXC_KO_COPY] 영어 카피 규칙은 한국어 화면에 적용하지 않는다

- **누가**: `web-interface-guidelines.md` Content & Copy — *"Title Case for headings/buttons"* ·
  *"Second person; avoid first person"* · *"`&` over "and""* · Typography *"Placeholders end with `…`"*.
- **왜 틀리나**: 대소문자가 없는 문자다. 「저희」(1인칭 복수)는 보이스 가이드 §6-B 의 목소리다.
  `inquiry.html` 입력칸의 placeholder 는 떠 있는 라벨을 위한 **공백 한 칸(`" "`)** 이라 `:placeholder-shown` 트릭에 쓰인다 —
  글자를 넣으면 라벨이 겹친다. 문구는 CLAUDE.md 「문구 규칙」과 `humanize-korean` 이 맡는다.
- **날짜**: 2026-09-25

### [EXC_TWO_NAMES] 신랑·신부 이름 칸의 `autocomplete="off"` 는 맞다

- **누가**: `web-interface-guidelines.md` Forms — *"Inputs need `autocomplete` and meaningful `name`"*.
- **왜 틀리나**: 한 화면에 **두 사람의 이름**을 받는다. `autocomplete="name"` 을 달면 브라우저가 두 칸에
  **같은 이름**(폰 주인)을 채운다. `off` 가 의도다. (연락처·이메일은 `tel`·`email` 이 이미 달려 있다.)
- **날짜**: 2026-09-25

### [EXC_STATIC_SITE] React·SSR 전제 규칙은 해당 없음

- **누가**: `web-interface-guidelines.md` — Hydration Safety 전체 · *"URL sync via nuqs"* · *"virtualize (`virtua`)"* ·
  `Intl.*` · *"`touch-action: manipulation`"*.
- **왜 틀리나**: 빌드 없는 정적 HTML 이다(`momentedit-design` 「전제가 다르다」). 날짜는 `toLocaleString('ko-KR', …)` 로
  이미 로케일을 박았고 한국어 단일이다. `width=device-width` viewport 에서 최신 브라우저는 더블탭 지연이 없다.
- **날짜**: 2026-09-25

### [EXC_GLASS_MENU] 모바일 메뉴의 반투명·흐림

- **누가**: 점검 전반 — 대비 검사(한글 소제목 약 1.5:1)와 `momentedit-design` 의 글래스모피즘 금지 자체.
- ★[GLASS_MENU_OWNER 2026-09-25 사장님 결정] 글래스모피즘 금지의 **유일한 예외** — `index.html` 모바일 메뉴(`.mobile-menu` · 크림 40% + `backdrop-filter: blur(20px)`)는 사장님이 지금 그대로 두기로 정했다. 알려진 대가: 첫 화면(진사) 위에서 열면 한글 소제목(`.mm-ko` · `--light` 12px) 대비 약 1.5:1, 영문 메뉴(`--accent`) 약 3~3.7:1(코워크 실측). 이 예외를 다른 요소로 넓히지 않는다 — 새 반투명·흐림 면은 여전히 금지다.
- **날짜**: 2026-09-25

### [EXC_RAIL] 오른쪽 아이콘 레일이 본문과 겹친다는 지적

- `[RAIL_LOCKED]` — 계획된 디자인이다. 어떤 스킬의 점검에서 나와도 보고하지 않는다(2026-09-25 사장님 지시).

### [EXC_MOCKUP_TINY] 폰 목업 속 4.5~9px 글자

- **누가**: 대비·최소 글자 크기를 재는 모든 점검.
- **왜 틀리나**: `.live-mockup-wrap`·`jr-showcase`·`delivered-mail`·`.dm-*`·`.mock*` 는 **축소 화면 그림**이다.
  `aria-hidden="true"` 이고 크기는 의도다(`momentedit-design` 「접근성 결정 기록」 · [TYPO_SCALE7] 예외).
  ★단 그 안에 버튼·링크가 생기면 이 예외는 끝난다 — 그때는 `aria-hidden` 부터 다시 본다.
- **날짜**: 2026-09-25
