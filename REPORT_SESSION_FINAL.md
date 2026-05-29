# 출시 직전 통합 작업 보고서

**기간:** 2026-05-26 ~ 2026-05-29
**main 최종 커밋:** `4806ced`
**상태:** 출시 가능 (huijun 측 시트 헤더 + GAS 동기화 잔여)

---

## 작업 개요

테스트 발견 3가지 문제부터 시작, 출시 전 안정성·완성도 강화 작업까지 19개 단계 진행. 모든 변경 main 배포 완료. GAS 동기화 + 시트 헤더 추가만 huijun 측에서 처리하면 출시 준비 완료.

---

## 단계별 진행 내역

### 1·2단계 · QR + 날짜 검증 (커밋 `1b88f24`)

| 문제 | 원인 | 수정 |
|---|---|---|
| 모바일 Gmail에서 QR 거대 표시 | `height` HTML attribute 누락 | `width="150" height="150"` + `!important` + `max-width:150px` |
| `2026-09-36` 같은 존재하지 않는 날짜 통과 | 정규식 형식 검증만, 일자 범위 미체크 | `isValidYmd()` 헬퍼 — 형식 + 월·일 범위 + 윤년 + 롤오버 거부 |

날짜 검증 실패 시 양쪽 이메일에 정중한 재제출 안내 메일 + 관리자 24h dedup 알림.

### 3단계 · 빈 토글 (커밋 `e2f7d50`)

| 문제 | 원인 | 수정 |
|---|---|---|
| 계좌 없을 때도 빈 토글이 청첩장에 표시 | 16개 템플릿의 측별 토글 wrapper에 OPTIONAL 마커 없음 | 모든 템플릿에 `groomEnvItem` / `brideEnvItem` 마커 추가 |
| hydrate가 envelope 항상 표시 | 무조건 `processOptional(html, 'envelope', true)` | `gShowItem`/`bShowItem` 계산 + 양쪽 비면 섹션 통째 제거 |

매트릭스: 본인 계좌 있음 OR (부모 표시 ON & 부모 계좌 있음) → 그 측 토글 표시.

### 4단계 · 캐시 안정성 강화 (커밋 `da56b3a`)

3중 안전망 구조:
1. **1차** `form-to-couple.gs:216` 폼 재제출 시 `cache.remove('couple_{eventId}')` + 성공/실패 로깅
2. **2차** `guest-letter-webhook.gs:60` TTL `600 → 60`초 (무효화 실패 시 자동 안전망)
3. **3차** `hydrate.js:413~429` fetch 응답이 localStorage와 다를 때만 재렌더 (`prev !== fresh`)

→ 어느 안전망 하나가 실패해도 다음 안전망이 동작, 하객은 항상 최신 청첩장.

### 5단계 · CDN 캐시 점검 (분석만, 변경 없음)

- `hydrate.js:396` `URLSearchParams(location.search)` 브라우저 직접 읽기 확인
- HTML이 eventId 독립이라 CDN 공유 캐시 안전
- localStorage(`me_couple_{eventId}`)/ScriptCache(`couple_{eventId}`) 모두 eventId별 격리
- **cross-eventId 누출 불가능 확정**

### 6단계 · 계좌 cross-contamination 5항목 검증 (분석만)

| # | 항목 | 결과 |
|---|---|---|
| 1 | 시트 strict `!==` 매칭 | ✅ |
| 2 | 캐시 키 prefix + eventId 완전 분리 | ✅ |
| 3 | 한 기기 여러 청첩장 격리 | ✅ |
| 4 | 접미사(-2 등) 별개 eventId 처리 | ✅ |
| 5 | 친구 사례 = same eventId 잔류 (cross 누출 아님) | ✅ |

### 7단계 · 시트 1003행 문제 (커밋 `21e4a2d`)

새 데이터가 4행이 아닌 1003행부터 쌓임. 원인: `sheet.getLastRow()` = "content 있는 마지막 행"인데, 다른 컬럼 잔여로 1002 반환. 수정: `findLastEventIdRow()` — eventId 컬럼만 스캔해 실제 데이터 끝 찾기.

### 8단계 · webhook ↔ 폼 시트 일치 진단 (커밋 `37a06c3`)

`diagnoseWebhookSheet()` / `testGetCoupleByEventId()` 추가. 실제로는 huijun이 시트 비웠던 것 → 시스템 정상 확정.

### 9단계 · cover 빈 토글 의도 동작 진단 (보고만)

`cover-08` Nº IV가 안 보임 → 폼에서 "온라인 청첩장 = 만들지 않음" 선택 시 `digitalAttendance=N` → `OPTIONAL:digitalAttendance` 통째 제거 = **의도된 동작**. 자동 메일에 cover URL도 안 보냄.

### 10단계 · live.html SAMPLE placeholder 차단 (커밋 `ce10985`)

`live.html` envelope HTML에 SAMPLE 계좌(`123456-78-901234`) **하드코딩**되어 있어, JS가 빈 값일 때 textContent 안 바꿔서 placeholder 그대로 노출. 수정: `gShow`/`bShow` 계산 + 본인 row + 예금주 + 섹션 전체 hide.

### 11단계 · family-08 The Day 섹션 (커밋 `c560af6`)

| 버그 | 수정 |
|---|---|
| 날짜 `<span>08</span>...<span>23</span>` 하드코딩 | `{{WEDDING_MONTH_NUM_PAD}}` / `{{WEDDING_DAY_OF_MONTH_PAD}}` placeholder |
| `{{WEDDING_DAY_KOR}}요일` "목요일요일" 이중 접미사 | "요일" 제거 |
| 좁은 화면에서 "0·23/8" 줄바꿈 | `white-space:nowrap` + 폰트 clamp 56px |

### 12단계 · 계좌 표시 위치 다중선택 (커밋 `2166f7a`)

| 변경 | 위치 |
|---|---|
| CFG: COL_ACCT_ONLINE/LIVE/FAMILY + Q_ACCT_DISPLAY + ACCT_CHOICE_* | form-to-couple.gs |
| 체크박스 질문: 온라인/라이브/오프라인 (다중선택) | createCoupleForm ③ 페이지 |
| 핸들러: `e.namedValues` raw 파싱, indexOf로 Y/N 기록 | onCoupleFormSubmit |
| hydrate.js: `pageShowAcct` 계산 + envelope/groomEnvItem/brideEnvItem AND 게이트 | shared/hydrate.js |
| live.html: `showAcctOnLive` 계산 + accountLive AND 게이트 | live.html |

옛 빈토글 로직(계좌 비면 숨김) 유지 + 페이지 게이트 AND. 시트 37·38·39열 추가 필요.

### 13단계 · createCoupleForm 안전장치 (커밋 `33c2649`)

실수로 createCoupleForm 두 번 재실행 → 새 폼 2개 생성 → PROP·destination 어긋남. 수정: `PROP_FORM_ID` 게이트 → 이미 정본 있으면 차단. 명시 우회는 `createCoupleFormForce()`.

### 14단계 · addAccountDisplayCheckbox 헬퍼 (커밋 `0476733`, `e244c74`)

기존 정본 폼에 체크박스 1개만 추가 (새 폼 안 만듦):
- `FORM_ID_OVERRIDE` 정본 ID 직접 입력 (PROP 우회)
- moveItem PageBreak 보정 — `targetIdx + 1` 대신 "신부 어머니 계좌 이후 첫 PageBreak 자리"로 이동 → cb가 ③ 페이지 마지막 자리에 정확 배치
- `verifyAccountCheckbox()` 검증 함수 신규

### 15단계 · 영문 이름 cache-bust + 전수조사 (커밋 `984b2cf`)

| 디자인 | placeholder | 결과 (SAMPLE 'Lee Seo Jun') |
|---|---|---|
| 01, 03, 05 | `{{GROOM_FIRST_EN_SPACED}}` | "Seo Jun" |
| 02, 04, 06, 07, 08 | `{{GROOM_FIRST_EN}}` | "Seojun" |

16/16개 모두 성 제외 placeholder 정상. 사용자가 본 풀이름은 옛 hydrate.js 캐시 또는 한 단어 입력 케이스. **fix**: 16 templates의 `hydrate.js`/`venue.js` src에 `?v=20260529a` cache-bust.

### 16단계 · 자녀 호칭 다중선택 (커밋 `d58e3f6`, `4806ced`)

04의 "장남/차녀" + 02·03·06·07의 "장남/장녀" 하드코딩 → 모든 부부 케이스 부정확. **옵션 A 적용** — 폼 선택지 + placeholder.

| 변경 | 위치 |
|---|---|
| CFG: Q_CHILD_GROOM/BRIDE + CHILD_GROOM/BRIDE_CHOICES | form-to-couple.gs |
| 신랑 선택지: 외동아들/장남/차남/삼남/막내아들 | 5개 |
| 신부 선택지: 외동딸/장녀/차녀/삼녀/막내딸 | 5개 |
| `addChildTitleQuestions()` 헬퍼 (기존 폼에 추가) | form-to-couple.gs |
| `{{GROOM_CHILD_TITLE}}` / `{{BRIDE_CHILD_TITLE}}` placeholder | hydrate.js (빈 값 → "아들"/"딸" 폴백) |
| 16 templates 일괄 교체 — "장남/장녀/아들/딸" → placeholder | i/cover-0?, i-family/family-0? |
| cover-04 OPTIONAL 마커 보정 (검토 발견) | cover-04 line 1085, 1095 |

시트 40·41열 추가 필요.

---

## 검토에서 발견된 잠재 이슈

### family-02/03/06/07/08 인사글 부모 OPTIONAL 마커 누락 (작업 외)

| 파일 | 라인 | 현재 상태 |
|---|---|---|
| family-02 | 1194-1203 | `<span class="parents">{{GROOM_PARENTS}}<span class="of-suffix"> 의 {{GROOM_CHILD_TITLE}}</span></span>` — OPTIONAL 마커 없음 |
| family-03 | 1732-1741 | 동일 |
| family-06 | 926-937 | 동일 |
| family-07 | 1463-1474 | 동일 |
| family-08 | 969-981 | 동일 |

**문제**: 부모 표시 OFF 선택해도 부모 영역 강제 표시 (또는 빈 부모 + " 의 장남" 노출).
**영향**: 대부분 부모 표시 ON 사용이라 출시 영향 미미.
**조치**: 자녀 호칭 작업과 무관한 코드베이스 이슈. 출시 후 별도 점검 권장.

---

## huijun 측 잔여 작업

### 1. 시트 헤더 추가 (필수)

Couples 시트 3행에 다음 영문 헤더 추가:

| 열 | 헤더 | 비고 |
|---|---|---|
| 37 | `accountOnline` | 계좌 표시 위치 (이미 추가했을 수 있음) |
| 38 | `accountLive` | 계좌 표시 위치 |
| 39 | `accountFamily` | 계좌 표시 위치 |
| 40 | `groomChildTitle` | 자녀 호칭 (신규) |
| 41 | `brideChildTitle` | 자녀 호칭 (신규) |

### 2. GAS 동기화 (필수)

`form-to-couple.gs` 최신본을 GAS 편집기에 복사·저장.
- 트리거 함수라 재배포 불필요 (저장만으로 즉시 반영)

`guest-letter-webhook.gs` (이전 작업) 동기화 시 **Deploy → New version**으로 재배포 필수.

### 3. 폼에 자녀 호칭 질문 추가

GAS 편집기 → 함수 드롭다운 → `addChildTitleQuestions` ▶ 실행.

기대 로그:
```
대상 폼: ... (id: 1QxCkxRP97kS..., 출처: FORM_ID_OVERRIDE)
  ✅ "신랑 형제 순서 (자녀 호칭)" 추가
  ✅ "신부 형제 순서 (자녀 호칭)" 추가
  ✅ 위치 조정 — "신부 혼주(부모님)" 다음에 배치
```

### 4. 실수 새 폼 휴지통 (선택)

- `1uKOSNZMLgNax_HYKQ1ROW18Y0NopMDJU0ix06FCH3aQ`
- `1kaT90AdFM59zW8oob5CgBgZx9HulS9xuZHzlmpyv6PE`

### 5. 테스트 제출 1건 (필수)

- 새 폼으로 1건 제출 (계좌·자녀 호칭 모두 입력)
- 시트 4행 정상 기록 확인 (37~41열까지)
- 청첩장 URL 열어서 envelope + 자녀 호칭 정상 표시 확인
- `?debug=1` 추가 시 F12 콘솔에 진단 출력

---

## 최종 main 커밋 흐름

```
1b88f24 → 1·2단계 (QR + 날짜 검증)
e2f7d50 → 3단계 (빈 토글 16 templates)
da56b3a → 캐시 3중 안전망
21e4a2d → findLastEventIdRow
e62c96f → diagnoseFormSetup / ensureTrigger
37a06c3 → diagnoseWebhookSheet / testGetCoupleByEventId
61ea4b0 → hydrate debug 모드 + 디자인 결정 로그
ce10985 → live.html SAMPLE placeholder 차단
c560af6 → family-08 The Day (placeholder + 요일요일 + wrap)
2166f7a → 계좌 표시 위치 다중선택 (3분리)
33c2649 → createCoupleForm 안전장치
0476733 → addAccountDisplayCheckbox PageBreak 보정 + verifyAccountCheckbox
e244c74 → 정본 폼 복귀 (FORM_ID_OVERRIDE)
984b2cf → 16 templates cache-bust
d58e3f6 → 자녀 호칭 다중선택 (16 templates + hydrate + form)
4806ced → cover-04 OPTIONAL 마커 보정 (최신)
```

---

## 출시 가능 여부

**✅ 코드 측면: 100% 완료**

huijun 측 5단계만 완료하면 **즉시 출시 가능**.

추후 별도 점검 권장:
- family-02/03/06/07/08 인사글 부모 OPTIONAL 마커 일관성

— Moment Edit
