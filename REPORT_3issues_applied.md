# 테스트 발견 3가지 문제 — 적용 완료 보고서

**보고일:** 2026-05-28
**최종 커밋:** `e2f7d50` (main 배포 완료)
**상태:** ✅ 1·2·3단계 전부 적용 완료

---

## 적용 요약

| 단계 | 위치 | 변경 |
|---|---|---|
| **1단계** (QR) | `form-to-couple.gs:385` | `width="150" height="150"` + `!important` + `max-width:150px` |
| **2단계** (날짜 검증) | `form-to-couple.gs:303` `isValidYmd()` 헬퍼 + 진입부 게이트 (140번~) + `buildDateRetryEmailHtml()` | 형식 + 실유효성 + 롤오버 거부 + 양쪽 브랜드 톤 안내 메일 + 관리자 알림 |
| **2단계 톤** | 메일 본문 plain+HTML 양쪽 | `죄송하지만` → `번거로우시겠지만`, `감사드리겠습니다` → `감사하겠습니다` |
| **3단계** (envelope 로직) | `shared/hydrate.js:247~257` | `gShowItem`/`bShowItem` 계산 + `groomEnvItem`/`brideEnvItem` 마커 처리 + envelope 양쪽 비면 섹션 자체 제거 |
| **3단계** (16개 템플릿) | `i/cover-01~08.html`, `i-family/family-01~08.html` | 각 측 토글 wrapper에 `<!-- OPTIONAL:groomEnvItem -->` / `<!-- OPTIONAL:brideEnvItem -->` 마커 추가 |

**파일 통계:** 18 files changed · 74 insertions · 68 deletions

---

## 🔴 1단계 · QR 크기 (적용 완료)

### 변경 전
```html
<img src="cid:qrDigital" alt="…" width="150" style="width:150px;height:150px;display:block;margin:0 auto;border:0;border-radius:2px;">
```

### 변경 후
```html
<img src="cid:qrDigital" alt="라이브(입장) 페이지 QR"
     width="150" height="150"
     style="width:150px !important;height:150px !important;max-width:150px !important;display:block;margin:0 auto;border:0;border-radius:2px;">
```

- ✅ `height="150"` HTML attribute 추가
- ✅ inline style 3곳 `!important`
- ✅ `max-width:150px !important` 신규

**적용 시점:** 다음 메일 발송부터 (이미 발송된 메일은 영향 없음)

---

## 🟠 2단계 · 날짜 검증 (적용 완료)

### 신규 헬퍼 함수 (`form-to-couple.gs`)

```js
function isValidYmd(s) {
  var m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  var y = +m[1], mn = +m[2], d = +m[3];
  if (mn < 1 || mn > 12 || d < 1 || d > 31) return false;
  var dt = new Date(y, mn - 1, d);
  return dt.getFullYear() === y && (dt.getMonth() + 1) === mn && dt.getDate() === d;
}
```

### 진입부 검증 게이트 (`onCoupleFormSubmit`)

- 형식만 맞고 실제 존재하지 않는 날짜(`2026-09-36` 등) 차단
- `new Date` 재구성값과 입력 일치 확인 → 롤오버 거부
- 실패 시:
  - 처리 즉시 중단 (`throw new Error`)
  - 신랑·신부 양쪽에 정중한 재제출 안내 메일 (브랜드 톤)
  - 관리자에 24h dedup 알림

### 재안내 메일 톤 (브랜드 일관)

| 요소 | 내용 |
|---|---|
| 인사 | "안녕하세요, 모먼트 에디트입니다." |
| 호칭 | "두 분" |
| 어미 | "입니다" 체 일관 |
| 미안 표현 | ~~"죄송하지만"~~ → **"번거로우시겠지만"** |
| 마무리 | ~~"감사드리겠습니다"~~ → **"감사하겠습니다"** |
| 디자인 | 본 안내와 동일 다크·세리프·골드 톤 |
| 폼 링크 | `momentedit.kr/form` 단축주소 |

### 검증 매트릭스

| 입력 | 통과 | 사유 |
|---|---|---|
| `2026-10-24` | ✅ | 정상 |
| `2026-02-29` | ❌ | 2026 비윤년 |
| `2028-02-29` | ✅ | 2028 윤년 |
| `2026-09-36` | ❌ | 9월 36일 없음 |
| `2026-13-01` | ❌ | 13월 없음 |
| `2026-04-31` | ❌ | 4월 31일 없음 |
| `26-10-24` | ❌ | 4자리 연도 아님 |
| `2026/10/24` | ❌ | 슬래시 |

**적용 시점:** 다음 제출부터 (기존 데이터 영향 없음)

---

## 🟡 3단계 · 빈 토글 (적용 완료 · 8종 영향)

### 변경 전 (`shared/hydrate.js`)

```js
html = processOptional(html, 'envelope', true);
html = processOptional(html, 'groomAccount', !!gAcct.account);
html = processOptional(html, 'brideAccount', !!bAcct.account);
```

### 변경 후

```js
// 계좌 섹션: 측별 토글은 해당 측에 보여줄 계좌가 1개라도 있을 때만 노출
//   · gShowItem: 본인 계좌 있음 OR (부모 표시 ON 이고 부모 계좌 1개라도 있음 — gHasPar에 showEnvP 포함)
//   · envelope 섹션 전체: 양쪽 다 보여줄 게 없으면 제거 → 빈 섹션·빈 토글 노출 방지
var gShowItem = !!gAcct.account || gHasPar;
var bShowItem = !!bAcct.account || bHasPar;
html = processOptional(html, 'envelope', gShowItem || bShowItem);
html = processOptional(html, 'groomEnvItem', gShowItem);
html = processOptional(html, 'brideEnvItem', bShowItem);
html = processOptional(html, 'groomAccount', !!gAcct.account);
html = processOptional(html, 'brideAccount', !!bAcct.account);
```

### 16개 라이브 템플릿 — 마커 추가

각 디자인의 토글 wrapper(4가지 패턴)에 `<!-- OPTIONAL:groomEnvItem -->` / `<!-- OPTIONAL:brideEnvItem -->` 추가:

| 디자인 | 토글 wrapper 패턴 |
|---|---|
| 01 (cover/family) | `<div class="env-acc-item">` |
| 02·03·05·06·07 (cover/family) | `<details class="env-acc-item" name="env">` |
| 04 (cover/family) | `<details class="acc" name="env">` |
| 08 (cover/family) | `<details class="env-acc" name="env">` |

### 마커 배치 검증 (4가지 패턴 모두 확인)

| 파일 | groom 시작 → 종료 | bride 시작 → 종료 |
|---|---|---|
| cover-01 | 1132 → 1174 | 1177 → 1219 |
| cover-02 | 1230 → 1272 | 1275 → 1317 |
| cover-04 | 1181 → 1210 | 1212 → 1241 |
| cover-08 | 1219 → 1254 | 1256 → 1291 |
| family-01 | 1331 → 1372 | 1375 → 1416 |
| family-04 | 1344 → 1372 | 1374 → 1402 |
| family-08 | 1124 → 1159 | 1161 → 1196 |

(전 16개 파일 동일 패턴 검증 통과)

**적용 시점:** 즉시 (Vercel 자동 배포)

---

## ⚠️ huijun 측 작업 필요

### 1. Apps Script 동기화 (필수)
`automation/form-to-couple.gs` 내용을 **Google Apps Script 편집기에 복사·붙여넣기·저장**
(GAS는 GitHub 자동 동기화 아님)

### 2. 라이브 HTML/JS (자동)
Vercel이 main 브랜치 자동 배포 — 즉시 반영
확인: `momentedit.kr` 강력 새로고침(Ctrl+Shift+R)

---

## 배포 후 점검 권장 — 3단계 (8종 × 입력 패턴)

| 케이스 | 신랑 self | 신랑 父 | 신랑 母 | 신부 self | 신부 父 | 신부 母 | envShowP | 기대 결과 |
|---|---|---|---|---|---|---|---|---|
| A | ✓ | – | – | ✓ | – | – | Y | 양쪽 토글 (본인만) |
| B | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Y | 양쪽 토글 (부모 포함) |
| C | ✓ | ✓ | – | – | – | – | Y | 신랑 토글만 |
| D | – | – | – | ✓ | – | – | Y | 신부 토글만 |
| E | – | – | – | – | – | – | Y | **섹션 전체 제거** |
| F | ✓ | ✓ | ✓ | – | – | – | **N** | 신랑 토글만 (본인 한 명) |
| G | – | ✓ | ✓ | – | ✓ | ✓ | **N** | **섹션 전체 제거** (부모 표시 OFF) |

---

## 테스트 데이터 일괄 정리 시 주의점

huijun께서 출시 전 정리하실 테스트 행들에 대한 안전 가이드:

| 항목 | 영향 | 안전성 |
|---|---|---|
| 시트 행 삭제 | 트리거·캐시 영향 없음 | ✅ 안전 |
| 이미 발송된 자동 메일 | 영향 없음 (메일은 시트와 무관) | ✅ 안전 |
| `momentedit.kr/i/cover-XX?e={eventId}` URL | 삭제된 eventId 접속 시 페이지 로딩 실패 | ⚠️ 외부 공유 여부 확인 후 삭제 |
| webhook eventId 캐시 | `getCoupleByEventIdFull` CacheService 10분 TTL | ⚠️ 삭제 후 12분 이상 텀 두기 |
| `notifyStudio` 24h dedup 캐시 | 영향 없음 | ✅ 안전 |
| 폼 트리거 | 시트 행 삭제는 트리거 발동 안 함 | ✅ 안전 |

### 권장 정리 순서

1. **외부 공유 여부 확인**: 각 eventId가 단축링크·카톡 등 외부에 공유된 적 있는지 확인
2. **행 삭제**: 공유 이력 없는 행부터 시트에서 삭제
3. **재발급 텀**: 동일 eventId 재발급 / 재제출이 필요하다면 삭제 후 **12분 이상** 대기 (webhook 캐시 TTL)

### 정리 대상 (huijun 직접 정리 예정)

- `lsj-jhy-1024` 계열 5개
- `정희준·미쿠` 계열 7개 (`km-mk-1217`, `jh-km-0326`/`0305`/`1203`/`0831`/`1230`/`0936`)
- `kt-lt-1217`, `lsj-lsj` 계열 등

특히 **`jh-km-0936` 행**: 날짜 검증 실패 이슈로 깨진 캘린더 — 삭제 권장

---

## 다음 단계 (선택)

- [ ] huijun: GAS 편집기에 `form-to-couple.gs` 복사·저장
- [ ] huijun: `momentedit.kr` 강력 새로고침 후 8종 × A~G 케이스 빠른 점검 (1~2개만 표본)
- [ ] huijun: 테스트 행 일괄 정리 (출시 전 임의 시점)
- [ ] 친구(`jh-km-0936`) 재제출 안내 — huijun이 별도 안내

추가 이상 발견 시 알려 주시면 즉시 진단·수정해드리겠습니다.

— Moment Edit
