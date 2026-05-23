# Moment Edit · Logo System (Integrated)

**Private Wedding Studio**
*Focus on the Essence, Record the Truth*

이 패키지는 Moment Edit(모먼트 에디트) 브랜드의 **모든 로고 변형**을 하나로 통합한 마스터 패키지입니다.
AI 도구에 이 ZIP 하나만 전달하면 `manifest.json`을 읽고 상황에 맞는 로고를 자동 선택합니다.

---

## 빠른 선택 가이드

| 사용 상황 | 추천 파일 |
|---|---|
| **다크 배경 웹사이트 히어로 (기본)** | `01-primary/02-primary-charcoal-bg.png` |
| **밝은 배경 / 인쇄물 (기본)** | `01-primary/03-primary-beige-bg.png` |
| **검정 위 프리미엄 표현** | `01-primary/01-primary-dark-bg.png` |
| **헤더·네비게이션** | `02-variants/01-no-tagline.png` |
| **인스타 정사각형 포스트** | `02-variants/02-stacked.png` |
| **모바일·작은 영역 (< 200px)** | `02-variants/03-compact.png` |
| **웹사이트 푸터** | `02-variants/04-footer.png` |
| **브라우저 파비콘 / 앱 아이콘** | `03-icon-favicon/favicon-square.png` |
| **인스타·카톡 프로필 이미지** | `03-icon-favicon/stamp-circle.png` |
| **사진 위 워터마크** | `04-utility/watermark.png` |
| **이메일 서명 (라이트)** | `06-marks/moment-edit-mark.png` |
| **이메일 서명 (다크)** | `06-marks/moment-edit-mark-dark.png` |
| **모바일 서명 / 좁은 공간** | `06-marks/moment-edit-mark-minimal.png` |
| **인스타 아바타 / 봉랍** | `06-marks/me-monogram.png` |

---

## 폴더 구조

```
moment-edit-logos/
├── manifest.json                     ← AI가 먼저 읽는 메타데이터
├── README.md                         ← 이 파일
│
├── 01-primary/                       ← 메인 로고 (태그라인 포함)
│   ├── 01-primary-dark-bg.png            검정 배경
│   ├── 02-primary-charcoal-bg.png        차콜 배경 + 크림 글자 ★기본값
│   └── 03-primary-beige-bg.png           베이지 배경 + 다크 글자 ★기본값
│
├── 02-variants/                      ← 변형 로고
│   ├── 01-no-tagline.png                 태그라인 제거
│   ├── 02-stacked.png                    2줄 세로 배치
│   ├── 03-compact.png                    작은 사이즈용
│   └── 04-footer.png                     푸터 전용
│
├── 03-icon-favicon/                  ← 아이콘 / 프로필 / 파비콘 세트
│   ├── favicon-square.png                둥근 사각형 (ME 모노그램)
│   ├── stamp-circle.png                  원형 스탬프
│   ├── favicon-16x16.png                 표준 파비콘
│   ├── favicon-32x32.png
│   ├── favicon.ico
│   ├── apple-touch-icon.png
│   ├── seal-beige.png
│   ├── seal-box.png
│   └── seal-transparent.png
│
├── 04-utility/                       ← 유틸리티
│   └── watermark.png                     반투명 워터마크
│
├── 05-source/                        ← 원본 편집 가능 파일
│   └── logo-system-master.svg            전체 시스템 SVG (수정 가능)
│
└── 06-marks/                         ← v3 워드마크 + 모노그램 (NEW)
    ├── moment-edit-mark.png              v3 메인 로고 라이트모드
    ├── moment-edit-mark-dark.png         v3 메인 로고 다크모드
    ├── moment-edit-mark-minimal.png      v3 슬로건 제외 압축
    ├── me-monogram.png                   M·E 정사각형 모노그램
    └── me-monogram-h.png                 M·E 가로형 모노그램
```

---

## 두 가지 로고 시스템 구분

본 패키지는 두 가지 로고 시스템을 함께 담고 있습니다.

**1. 정식 로고 시스템 (`01`~`05` 폴더)**
- 태그라인 포함 풀 워드마크, 더블 헤어라인 프레임, 인장(seal) 변형 등
- 웹사이트 히어로·인쇄물·소셜 커버 등 **공식 브랜딩** 전반

**2. v3 마크 시스템 (`06-marks/`)**
- 본 도장 제거, 워드마크 + 하단 진사 액센트 라인 버전
- 이메일 서명·명함·M·E 모노그램 등 **실용 운영** 용도

상황에 맞춰 둘 중 하나를 선택해 사용합니다.

---

## 디자인 시스템 요약

- **워드마크 폰트**: Classic Serif (Georgia / Times New Roman / Cormorant Garamond Medium), All Caps
- **자간**: 6-8pt 와이드 트래킹 (0.18em)
- **슬로건 폰트**: 세리프 이탤릭
- **프레임**: 더블 헤어라인 (0.3-0.4px, opacity 0.25)
- **컬러**:
  - 다크 `#1a1a18` · 크림 `#e8e6df` · 베이지 `#f5f4f0`
  - v3 차콜 `#1C1B19` · 진사 `#6B2A24` · 아이보리 `#FAFAF8`
- **톤**: 미니멀, 정제된, 절제된 (한국 예우 × 일본 미학)

---

## 사용 가이드

### 이메일 서명 (Gmail)
- 표시 크기: 폭 300px
- HTML img 태그: `<img src="..." width="300" alt="Moment Edit">`

### 웹사이트
- 데스크탑 헤더: 폭 200px
- 모바일 헤더: 폭 140px

### 인쇄
- 별도 vector(SVG/AI) 파일 제작 권장
- 헤어라인은 인쇄 시 0.75pt 이상

---

## AI 도구 활용 예시

> "Moment Edit 로고를 [상황]에 사용해야 해. 적절한 파일을 골라줘."

- "다크 모드 웹사이트 헤더" → `primary-charcoal-bg`
- "Gmail 라이트 모드 서명" → `mark-v3`
- "인스타 프로필 사진" → `stamp-circle` 또는 `me-monogram`
- "청첩장 표지(밝은 배경)" → `primary-beige-bg`
- "사진 우하단 워터마크" → `watermark`

---

© Moment Edit · 모먼트 에디트 · Private Wedding Studio
