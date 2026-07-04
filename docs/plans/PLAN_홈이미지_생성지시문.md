# 메인 홈페이지 임시 이미지 생성 지시문 (Manus AI용)

목적: 정식 오픈(2027 하반기) 전까지 메인 홈에 걸어둘 **브랜드에 어울리는 임시 사진 15장**을 생성.
지금은 picsum.photos 랜덤 이미지가 걸려 있어 톤이 안 맞음. 실제 예식 촬영본이 없으므로 AI 생성으로 대체하되, 나중에 실촬영본으로 교체.

작성: 2026-07-04

---

## 0. 가장 중요한 원칙 (먼저 읽기)

1. **얼굴을 정면으로 또렷하게 넣지 말 것.** 아직 실제 고객 촬영본이 아니므로, AI로 만든 또렷한 인물 얼굴은 ① 가짜(언캐니)로 보이고 ② 실제 고객처럼 오해를 줌. → **뒷모습·실루엣·손·부분 클로즈업·거리감 있는 원경·초점 아웃**으로 인물을 암시만 한다. 이게 이 브랜드의 절제된 무드와도 정확히 맞음.
2. **동양(한국) 인물.** 인물이 들어갈 땐 한국인/동아시아 신랑신부·가족으로. 서양식 웨딩 클리셰(대형 홀·샹들리에·풍성한 부케 던지기) 금지.
3. **15장 전체가 한 세트처럼 보이게.** 같은 색보정(따뜻한 아이보리 톤)·같은 필름 질감으로 통일. 아래 '공통 스타일'을 모든 프롬프트 앞에 붙일 것.
4. **글자·로고·워터마크 없음.** 이미지 안에 텍스트가 들어가면 안 됨.
5. **비율(가로×세로)을 정확히 지킬 것.** 사이트 레이아웃이 그 비율에 맞춰져 있어, 어긋나면 화면이 깨짐.

---

## 1. 공통 스타일 (모든 프롬프트 앞에 붙이는 고정 문구)

> Editorial fine-art wedding photograph, warm ivory and cream tones, muted low-saturation color grade, soft natural window light, gentle film grain, Kodak Portra 400 film look, calm and serene mood, generous negative space, understated luxury, Korean-Japanese minimalist aesthetic, intimate private micro-wedding (not a big wedding hall), shallow depth of field. Color palette: warm off-white #FAFAF8, deep espresso brown #3A2D22, muted gold #B89A75, deep crimson accent #6B2A24. No text, no logos, no watermark. Faces not clearly visible — figures shown from behind, in silhouette, cropped, or softly out of focus.

**브랜드 배경(참고용, 프롬프트엔 안 넣어도 됨):** 모먼트에디트는 양가 직계가족 최대 25명이 함께하는 프라이빗 마이크로웨딩. "한국의 예우와 일본의 미학". 디렉터 川名 美玖(Kawana Miku). 슬로건 "본질을 기록하다 / Record the Truth". 실내 스튜디오에 **캔들존(따뜻한 촛불 무드)**과 **화이트존(하이키 에디토리얼)** 두 공간.

---

## 2. 생성할 이미지 15장 (비율·용도·개별 프롬프트)

각 프롬프트 = **공통 스타일 + 아래 개별 문구**. 괄호 안은 정확한 픽셀 크기(가로×세로).

### A. 히어로 — 1600×900 (16:9)  · 파일명 `hero.jpg`
첫 화면 대표 이미지. 브랜드 전체 인상을 좌우함.
> A private micro-wedding studio interior bathed in warm afternoon light, a bride and groom seen from behind or in soft silhouette standing close together near a large window, sheer curtains, minimal elegant furniture, warm candle glow in the background, cinematic wide composition with lots of breathing space.

### B. 소개(About) — 1400×800 (7:4)  · 파일명 `about.jpg`
스튜디오 내부 전경.
> Quiet interior of an intimate wedding studio, warm minimalist space with wooden and ivory tones, a few candles, a styled table, soft daylight from the side, no people or one blurred figure in the far distance, architectural editorial feel.

### C. 갤러리 그리드 — 600×600 정사각형 9장 (1:1)  · 파일명 `gallery-01.jpg` ~ `gallery-09.jpg`
정사각형 9칸. 서로 조금씩 다르게, 전체는 한 세트로. 아래 9개를 각각:
1. `gallery-01` — Bride and groom holding hands, close-up of hands only, warm candlelight, wedding ring detail.
2. `gallery-02` — Back view of a bride in a simple elegant dress, veil softly lit, white editorial studio, high-key lighting.
3. `gallery-03` — A small family group (parents and couple) seen from behind or mid-distance, gathered warmly, candle-lit space, no clear faces.
4. `gallery-04` — Detail of a bridal bouquet resting on ivory linen, muted dried-flower tones, soft shadow.
5. `gallery-05` — Groom's hands adjusting a boutonniere / bow tie, cropped at chest, warm tone.
6. `gallery-06` — Candle Zone atmosphere: rows of warm candles, amber glow, a blurred couple silhouette in background.
7. `gallery-07` — White Zone atmosphere: clean high-key white studio, a single elegant chair and soft daylight, minimal.
8. `gallery-08` — Over-the-shoulder view of a couple looking toward a window, backlit, film grain.
9. `gallery-09` — Quiet still life: wedding invitation card, ring, and a candle on a warm ivory surface, top-down.

### D. 캔들존 — 800×600 (4:3)  · 파일명 `zone-candle.jpg`
> Candle Zone of the studio: warm amber candlelight filling an intimate room, soft glowing bokeh, a couple's silhouette barely visible, cozy and emotional atmosphere, deep warm shadows.

### E. 화이트존 — 800×600 (4:3)  · 파일명 `zone-white.jpg`
> White Zone of the studio: bright high-key white studio, clean minimal lines, soft even daylight, a single figure's crisp silhouette or empty elegant space, editorial fashion mood.

### F. 스타일링 — 1400×700 (2:1)  · 파일명 `styling.jpg`
드레스·소품 무드 컷(인물 없음 권장).
> Styling collection flat-lay / hanging shot: an elegant wedding dress on a wooden hanger against an ivory wall, veil, delicate jewelry and accessories neatly arranged, soft window light, refined boutique mood, no people.

### G. 세레모니 — 1600×900 (16:9)  · 파일명 `ceremony.jpg`
프라이빗 본식 장면.
> An intimate private wedding ceremony scene, a couple standing together at the front seen from behind, a very small number of seated family guests (about 20) in a warm minimal indoor space, candlelight and soft daylight, cinematic wide shot, emotional and quiet, no clear faces.

---

## 3. 기술 사양 (전달 방식)

- **형식:** JPG (사진), 화질 우선. 용량은 각 파일 300~500KB 목표(웹 최적화). 필요하면 내가 압축.
- **정확한 픽셀 크기**로 출력(위 각 항목의 가로×세로). 최소 그 크기 이상이면 내가 크롭·리사이즈 가능.
- **파일명**을 위 지정대로(`hero.jpg`, `gallery-01.jpg` …). 그래야 코드에 바로 연결.
- **총 15장**: hero, about, gallery-01~09(9장), zone-candle, zone-white, styling, ceremony.
- 색보정·필름톤을 15장 모두 **동일하게** 맞춰 주세요(가장 중요).

## 4. 받은 뒤 내가 할 일 (참고)

파일 15장을 주시면 내가:
1. `/assets/home/`에 넣고
2. `index.html`의 picsum URL 15곳을 해당 파일로 교체(비율 그대로라 레이아웃 안 깨짐)
3. `loading`·`decoding`·`onerror` 속성 유지, alt 텍스트 유지
4. 커밋·배포

## 5. 나중에 실촬영본으로 교체할 때

같은 파일명으로 덮어쓰면 코드 수정 없이 자동 교체됨. 실촬영본이 생기면 이 임시 이미지부터 우선 교체.

---

### 교체 대상 아님(건드리지 말 것)
- `/assets/journey/mp-*.png` (마이페이지 실제 화면 캡처)
- `/assets/brand/wordmark-gold.png` (로고)
- 청첩장 프리뷰 이미지들
