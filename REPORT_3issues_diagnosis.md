# 테스트 발견 3가지 문제 — 진단 및 수정안

**보고일:** 2026-05-28
**테스트 케이스:** `jh-km-0936` (친구) vs `kt-lt-1217` (본인)
**상태:** 진단 완료 · 적용 대기 (검토 후 진행)

---

## 요약

| # | 문제 | 심각도 | 영향 범위 | 수정 위치 | 적용 시점 |
|---|---|---|---|---|---|
| 1 | 날짜 검증 허점 (`2026-09-36` 통과) | 🔴 심각 | 다음 제출부터 | `form-to-couple.gs` | .gs 저장 즉시 |
| 2 | 계좌 없을 때 빈 토글 노출 | 🟠 중대 | 8종 청첩장 전체 (16개 파일) | 16 HTML + `hydrate.js` | 배포 즉시 |
| 3 | QR 크기 (모바일 Gmail 등 거대) | 🟡 경미 | 다음 메일 발송부터 | `form-to-couple.gs` | .gs 저장 즉시 |

---

## 🔴 문제 1 · 날짜 검증 허점

### 원인 확정

| 단계 | 위치 | 동작 |
|---|---|---|
| 입력 | 폼 | `weddingDate = "2026-09-36"` |
| 폼 검증 | `form-to-couple.gs:219` 정규식 `^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$` | ✅ **통과 (형식만 검사 · 일자 범위 미체크)** |
| eventId | `makeEventId()` | `mmdd = '09' + '36' = '0936'` → `jh-km-0936` |
| 클라이언트 렌더 | `hydrate.js:152` `new Date(2026, 8, 36)` | JS 자동 롤오버 → **10월 6일(화요일)** |
| 화면 표시 | display = `"2026.09.36"` (원본 문자열) + dayKor = `"화요일"` (롤오버 결과) | **모순 발생** |
| 캘린더 | `generateCalendarCells()` weddingDay=36 vs daysInMonth(9월)=30 | 9월 달력 그려지나 마킹할 셀 없음 → 세로 정렬 깨짐 |
| `화요일요일` | 일부 템플릿에 `{{WEDDING_DAY_KOR}}요일` 패턴이 있을 가능성 | 이중 접미사 (별도 검증 필요) |

### 핵심 누락
- `pad2()`는 디자인 번호 전용 (01~99 범위 체크). 날짜에는 미적용.
- `transformDate`도 입력값을 그대로 신뢰. **실제 존재 날짜 검증 없음.**

### 수정안 (form-to-couple.gs)

**1) 신규 헬퍼 함수 추가** (`pad2()` 옆에):

```js
/** 실제 존재하는 YYYY-MM-DD 인지 검증.
 *  형식 + 월(01~12) + 일(해당 월의 실제 일수) + 윤년 자동 처리.
 *  롤오버 거부: new Date()로 재구성한 값이 입력과 일치해야 함.
 */
function isValidYmd(s) {
  var m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  var y = +m[1], mn = +m[2], d = +m[3];
  if (mn < 1 || mn > 12 || d < 1 || d > 31) return false;
  var dt = new Date(y, mn - 1, d);
  return dt.getFullYear() === y && (dt.getMonth() + 1) === mn && dt.getDate() === d;
}
```

**2) `onCoupleFormSubmit()` 진입부에 검증 게이트 추가** (eventId 생성 직전, ~140번 라인 근처):

```js
// 0-1) 날짜 실유효성 검증 — 형식만 맞고 실제 없는 날짜(예: 2026-09-36) 차단
var weddingDateRaw = g('결혼식 날짜');
if (!isValidYmd(weddingDateRaw)) {
  notifyStudio(
    '[Moment Edit] ⚠️ 날짜 검증 실패 — 폼 제출 차단',
    '신랑: ' + g('신랑 한글 이름') + ' / 신부: ' + g('신부 한글 이름') + '\n' +
    '입력값: "' + weddingDateRaw + '"\n' +
    '신랑 이메일: ' + g('신랑 이메일') + '\n신부 이메일: ' + g('신부 이메일') + '\n\n' +
    '양쪽에 재제출 안내 메일 발송 완료.',
    'invalid_date_' + weddingDateRaw
  );
  try {
    var to = [g('신랑 이메일'), g('신부 이메일')]
      .filter(function (x) { return x && x.trim(); })
      .filter(function (x, i, arr) { return arr.indexOf(x) === i; })
      .join(',');
    if (to) {
      GmailApp.sendEmail(to,
        '[Moment Edit] 결혼식 날짜 재확인 요청',
        '안녕하세요. 모먼트에디트입니다.\n\n' +
        '제출하신 결혼식 날짜 "' + weddingDateRaw + '" 가 실제 존재하지 않는 날짜로 확인되었습니다.\n' +
        '죄송하지만 폼을 다시 한 번 작성해 주시기 바랍니다.\n' +
        '(예: 2026-10-24 처럼 실제 달력의 날짜로 입력해 주세요.)\n\n' +
        '폼 주소: ' + CFG.SITE_BASE + '/form\n\n— Moment Edit',
        { from: CFG.STUDIO_EMAIL, name: 'Moment Edit' });
    }
  } catch (e) { Logger.log('재제출 안내 메일 실패: ' + e.message); }
  throw new Error('날짜 검증 실패 — 처리 중단: ' + weddingDateRaw);
}
```

### 검증 매트릭스

| 입력 | 통과 여부 | 사유 |
|---|---|---|
| `2026-10-24` | ✅ | 정상 |
| `2026-02-29` | ❌ | 2026은 윤년 아님 (Feb 29 없음) |
| `2028-02-29` | ✅ | 2028은 윤년 |
| `2026-09-36` | ❌ | 9월 36일 없음 |
| `2026-13-01` | ❌ | 13월 없음 |
| `2026-04-31` | ❌ | 4월 31일 없음 |
| `26-10-24` | ❌ | 4자리 연도 아님 |
| `2026/10/24` | ❌ | 슬래시 (폼은 `-`만 받음) |

### 파급
- 다음 제출부터 적용
- **기존 `jh-km-0936` 행은 수동 정리 필요** (시트에서 삭제 후 재안내)
- 과거 날짜 경고는 선택 옵션 (미포함 — 추후 결정)

---

## 🟠 문제 2 · 빈 토글 노출 (8종 청첩장 전체)

### 원인 확정 — 16개 템플릿 전수 조사

모두 동일 구조: 토글 래퍼는 OPTIONAL:envelope **안**, 본인은 OPTIONAL 마커 **밖**.

```
<!-- OPTIONAL:envelope -->
  <section>
    <details class="env-acc-item|env-acc|acc">    ← 토글 래퍼 (마커 없음 · 항상 남음)
      <summary>Groom · {{GROOM_NAME}}</summary>
      <body>
        <!-- OPTIONAL:groomAccount       → ...→ /OPTIONAL:groomAccount -->         ← 비면 내용만 제거
        <!-- OPTIONAL:groomFatherAccount → ...→ /OPTIONAL:groomFatherAccount -->
        <!-- OPTIONAL:groomMotherAccount → ...→ /OPTIONAL:groomMotherAccount -->
      </body>
    </details>                                    ← 3개 다 비어도 래퍼는 그대로
    <details>...</details>                        ← 신부 동일 구조
  </section>
<!-- /OPTIONAL:envelope -->
```

### 디자인별 토글 요소

| 디자인 | cover & family 공통 토글 요소 |
|---|---|
| 01 | `<div class="env-acc-item">` |
| 02, 03, 05, 06, 07 | `<details class="env-acc-item" name="env">` |
| 04 | `<details class="acc" name="env">` |
| 08 | `<details class="env-acc" name="env">` |

### 친구(`jh-km-0936`) vs 본인(`kt-lt-1217`) 차이 추정

| 항목 | `kt-lt-1217` (정상) | `jh-km-0936` (이상) |
|---|---|---|
| 신랑 본인 계좌 | 입력 추정 | **공란 추정** |
| 신랑 아버님 계좌 | – | **공란 추정** |
| 신랑 어머님 계좌 | – | **공란 추정** |
| 결과 | 내용 일부가 남아 정상 보임 | 토글 wrapper만 남고 펼치면 빈 패널 |

(시트 직접 확인 필요 — 환경상 불가. 위는 코드 분석 기반 추정.)

### 수정안

**Step A · 16개 템플릿에 신규 OPTIONAL 마커 추가**

각 측 토글을 통째로 감쌈:
```html
<!-- OPTIONAL:groomEnvItem --><details ...>...</details><!-- /OPTIONAL:groomEnvItem -->
<!-- OPTIONAL:brideEnvItem --><details ...>...</details><!-- /OPTIONAL:brideEnvItem -->
```

대상 파일:
- `i/cover-01.html` ~ `cover-08.html` (8개)
- `i-family/family-01.html` ~ `family-08.html` (8개)
- `MomentEdit_청첩장_프리뷰_16개/i/cover-XX.html` (8개)
- `MomentEdit_청첩장_프리뷰_16개/i-family/family-XX.html` (8개)

(스크립트로 일괄 변환)

**Step B · hydrate.js (247~250번 라인 교체)**

```js
// 변경 전
html = processOptional(html, 'envelope', true);
html = processOptional(html, 'groomAccount', !!gAcct.account);
html = processOptional(html, 'brideAccount', !!bAcct.account);

// 변경 후
var gShowItem = !!gAcct.account || (showEnvP && gHasPar);
var bShowItem = !!bAcct.account || (showEnvP && bHasPar);
html = processOptional(html, 'envelope', gShowItem || bShowItem);
html = processOptional(html, 'groomEnvItem', gShowItem);
html = processOptional(html, 'brideEnvItem', bShowItem);
html = processOptional(html, 'groomAccount', !!gAcct.account);
html = processOptional(html, 'brideAccount', !!bAcct.account);
```

### 기대 동작 매트릭스

| 신랑 self | 신랑 父 | 신랑 母 | 신부 self | 신부 父 | 신부 母 | `envelopeShowParents` | 결과 |
|---|---|---|---|---|---|---|---|
| ✓ | – | – | ✓ | – | – | Y | 양쪽 토글 정상 (부모 비표시) |
| ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | Y | 양쪽 토글 + 부모 표시 |
| ✓ | ✓ | – | – | – | – | Y | 신랑 토글만, 신부 토글 **제거** |
| – | – | – | ✓ | – | – | Y | 신부 토글만, 신랑 토글 **제거** |
| – | – | – | – | – | – | Y/N | **Envelope 섹션 전체 제거** |
| ✓ | ✓ | – | ✓ | – | – | **N** | 양쪽 토글 (본인만 · 부모 숨김) |
| – | ✓ | ✓ | – | ✓ | ✓ | **N** | **양쪽 토글 제거** (showEnvP=false라서 부모도 안 나타나는 게 맞음) |

### 파급
- 모든 청첩장에 즉시 영향 → **배포 직후 8종 × 양쪽 입력 패턴 점검 필수**
- 프리뷰 폴더 16개 standalone 동기화 필요

---

## 🟡 문제 3 · QR 크기 (이메일 환경별 거대 표시)

### 현재 코드 (form-to-couple.gs:339)

```html
<img src="cid:qrDigital" alt="라이브(입장) 페이지 QR"
     width="150"
     style="width:150px;height:150px;display:block;margin:0 auto;border:0;border-radius:2px;">
```

### 원인 확정

| 항목 | 상태 | 영향 |
|---|---|---|
| HTML attribute `width="150"` | ✅ 있음 | 폭은 150 (대부분 호환) |
| HTML attribute `height="..."` | ❌ **없음** | 모바일 Gmail이 inline style 무시 시 높이는 원본(600px) 비율 추정 → 확대 |
| `max-width` | ❌ 없음 | 반응형 CSS가 `width:100%` 주입하면 화면 가득 |
| `!important` | ❌ 없음 | 외부 CSS가 덮어쓸 수 있음 |

### 수정안

```html
<img src="cid:qrDigital" alt="라이브(입장) 페이지 QR"
     width="150" height="150"
     style="width:150px !important;height:150px !important;max-width:150px !important;display:block;margin:0 auto;border:0;border-radius:2px;">
```

**변경 사항:**
- ✅ `height="150"` HTML attribute 추가
- ✅ inline style `width`/`height`에 `!important` 추가
- ✅ `max-width:150px !important` 신규 추가

### 호환성 매트릭스 (예상)

| 클라이언트 | 변경 전 | 변경 후 |
|---|---|---|
| Gmail 웹 | 정상 | 정상 |
| Gmail iOS | 거대 표시 발생 | 150x150 고정 |
| Gmail Android | 거대 표시 발생 | 150x150 고정 |
| Apple Mail | 정상 | 정상 |
| Outlook | 정상 | 정상 |
| Naver/Daum | 미검증 | 안정성 향상 |

### 파급
- 다음 메일 발송부터 적용
- 이미 발송된 메일에는 영향 없음 (재발송은 따로 처리 필요시)

---

## 진행 권장 순서

가장 안전한 순서로 단계적 적용:

### 1단계 · 문제 3 (QR)
- 단일 라인 수정
- 다음 발송부터 적용 (즉시 위험 없음)
- **권장: 즉시 적용**

### 2단계 · 문제 1 (날짜)
- 단일 `.gs` 파일 + 신규 함수 + 진입부 게이트
- 다음 제출부터 적용 (기존 데이터 영향 없음)
- 검증 매트릭스 8케이스로 테스트 가능
- **권장: 1단계 후 적용**

### 3단계 · 문제 2 (envelope)
- **16개 템플릿 + hydrate.js 동시 수정** (영향 범위 큼)
- 모든 청첩장에 즉시 적용 → 배포 직후 패턴별 점검 필요
- 프리뷰 폴더 16개 standalone 동기화 필요
- **권장: 1·2단계 안정화 후 별도 세션에서 신중히 적용**

---

## 사후 작업

- [ ] `jh-km-0936` 시트 행 정리 (수동 — 시트에서 삭제 또는 정상 날짜로 교정)
- [ ] 친구에게 재제출 안내 (선택)
- [ ] 신규 검증 통과/실패 케이스 로깅 모니터링 (1주 관찰)
- [ ] envelope 수정 후 8종 × 입력 패턴 자동 회귀 테스트 추가 검토 (선택)

---

## 시트 직접 확인이 가능했다면 추가 점검할 항목

(자동화 환경상 Couples 시트에 직접 접근 불가 — 사용자 측에서 수동 확인 권장)

`jh-km-0936` 행:
- `envelopeShowParents` 값
- `groomAccount`, `brideAccount` (본인 계좌)
- `groomFatherAccount`, `groomMotherAccount` (신랑 부모 계좌)
- `brideFatherAccount`, `brideMotherAccount` (신부 부모 계좌)

확인 결과를 알려주시면 문제 2 추정 시나리오를 100% 확정해드릴 수 있습니다.
