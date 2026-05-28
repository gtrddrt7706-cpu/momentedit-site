# 🔴 webhook ↔ 폼 응답 시트 불일치 — 확정 진단

**보고일:** 2026-05-28 23:43
**진단 함수:** `diagnoseWebhookSheet()` 실행 결과
**상태:** 원인 확정 · 해결 방안 3가지 제시

---

## 1. 진단 결과 — 핵심 사실

### webhook이 보는 spreadsheet

```
ID:   1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4
이름:  Moment Edit · Letter System
URL:   https://docs.google.com/spreadsheets/d/1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4/edit
```

### 이 spreadsheet의 시트 상태

| 시트 | lastRow | 의미 |
|---|---|---|
| 설문지 응답 시트 | **1** | ❌ 폼 응답이 **여기로 안 들어옴** (헤더만) |
| Couples | **3** | ❌ 헤더만 있고 **데이터 0행** |
| BuildLogs | 1 | 정상 (헤더만) |
| Messages | 9 | 정상 (게스트 편지) |
| Moderation | 1 | 정상 |
| Banned | 178 | 정상 |

### 헤더는 정상

```
3행 헤더 (36개 컬럼):
eventId | groomName | brideName | groomNameEn | brideNameEn | groomEmail |
brideEmail | weddingDate | weddingTime | designFamily | designOnline |
digitalAttendance | groomBank | groomAccount | brideBank | brideAccount |
groomParents | brideParents | greetingShowParents | envelopeShowParents |
groomFatherAccount | groomMotherAccount | brideFatherAccount | brideMotherAccount |
invitationText | digInvitationText | pullQuote | groomBio | brideBio |
famInvTitle | famInvSubKo | digInvTitle | digInvSubKo |
digPullQuote | digGroomBio | digBrideBio
```

- 컬럼 36개 ✅
- eventId index 0 ✅
- 헤더 위치 3행 (0-indexed 2) ✅

---

## 2. 원인 확정

**폼이 이 spreadsheet (`1GJX2pk...`)와 연결되어 있지 않습니다.**

증거:
- "설문지 응답 시트" lastRow=1 → 폼 응답이 이 spreadsheet로 안 들어옴
- "Couples" lastRow=3 → form-to-couple.gs가 이 시트에 안 씀

huijun이 본 "Couples 시트 4행에 jh-km-0625 데이터"는 **다른 spreadsheet에 있는 것**입니다. 같은 이름의 별도 spreadsheet이거나, 폼이 다른 spreadsheet로 응답 전송 중.

---

## 3. 시스템 구성 그림

### 현재 상태 (불일치)

```
[정본 폼 1FAIpQLScOqdtYiQ...]
         │
         └─ 응답 → ??? (다른 spreadsheet) ← huijun이 보는 곳
                       │
                       └─ 설문지 응답 시트 → form-to-couple.gs onCoupleFormSubmit
                                              ↓
                                            Couples 시트 (4행에 jh-km-0625)

[1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4 · Letter System]
         │
         └─ guest-letter-webhook.gs ← webhook URL이 가리키는 곳
              │
              └─ Couples 시트 (헤더만, 빈 시트)
                  → getCouple 호출 시 COUPLE_NOT_FOUND 반환
```

### 권장 상태 (통합)

```
[하나의 spreadsheet]
  │
  ├─ 폼 응답 → 설문지 응답 시트
  │                ↓
  │           form-to-couple.gs onCoupleFormSubmit (트리거)
  │                ↓
  ├─ Couples 시트 ←── 데이터 기록
  │     ↑
  │     └─── guest-letter-webhook.gs getCouple ← webhook URL
  │
  ├─ Messages / Moderation / Banned (게스트 편지)
  ├─ BuildLogs
  └─ GAS 프로젝트 (모든 .gs 통합)
```

---

## 4. 해결 방안 3가지

### 방안 A · 폼 응답을 Letter System으로 연결 (권장)

**장점:** webhook이 이미 가리키는 spreadsheet라 변경 최소. GAS 재배포 불필요.

**단점:** huijun이 보던 옛 spreadsheet의 데이터(jh-km-0625 등)는 수동 옮기거나 재제출 필요.

**작업:**
1. 정본 폼 편집기 열기 (1FAIpQLScOqdtYiQ...)
2. 상단 **응답** 탭
3. 우상단 ⋮ (메뉴) → **응답 수집 위치 선택**
4. **기존 스프레드시트 선택**
5. **"Moment Edit · Letter System"** 선택
6. (옛 응답 spreadsheet의 폼 연결은 자동 해제됨)
7. GAS 프로젝트가 Letter System에 묶여있는지 확인:
   - `form-to-couple.gs`가 Letter System의 GAS 프로젝트에 있어야 함
   - 없다면 코드를 그 프로젝트로 옮겨야 함
8. `ensureTrigger()` 실행 → 트리거를 Letter System에 재등록
9. 폼 1건 테스트 제출 → Couples 시트에 정상 기록되는지 확인

### 방안 B · webhook을 huijun이 보던 시트로 옮기기

**장점:** huijun이 보던 데이터(jh-km-0625 등) 그대로 활용.

**단점:** webhook URL 변경 → hydrate.js의 WEBHOOK 상수 수정 → Vercel 재배포 필요.

**작업:**
1. huijun이 보던 spreadsheet의 ID 확인 (브라우저 주소창)
2. 그 spreadsheet에 GAS 프로젝트 생성 (또는 기존 프로젝트 있으면 사용)
3. `guest-letter-webhook.gs` 코드 그 프로젝트로 복사
4. **Deploy → New deployment** → Web App URL 받음
5. hydrate.js의 `WEBHOOK = 'https://script.google.com/...'` 새 URL로 교체
6. main 브랜치에 푸시 → Vercel 자동 배포

### 방안 C · 모든 것을 한 spreadsheet로 통합 (가장 깔끔)

**장점:** 운영 단순, 향후 혼란 0.

**단점:** 시간 소요 + 데이터 이전 필요.

**작업:**
1. 어느 spreadsheet를 정본으로 할지 결정 (Letter System 권장 — webhook URL 유지)
2. 다른 spreadsheet의 데이터 옮기기 (Couples 행 복사·붙여넣기)
3. 폼 응답 연결을 정본 spreadsheet로 변경
4. 모든 .gs (form-to-couple, guest-letter-webhook, guest-letter-email)를 정본 spreadsheet의 GAS 프로젝트에 모음
5. webhook 재배포 (코드 그대로면 URL 유지됨, 새 코드면 New version)
6. `ensureTrigger()` 실행
7. 옛 spreadsheet는 백업 후 휴지통

---

## 5. 즉시 확인 필요 — huijun 측

### Q1. 폼 응답 연결 확인

정본 폼 편집기에서 **응답** 탭 → **응답 수집 위치** 확인.

| 결과 | 의미 |
|---|---|
| `Moment Edit · Letter System` (1GJX2pk...) | 폼은 정상 연결, 다른 문제 (트리거 등) |
| 다른 이름의 spreadsheet | **방안 A** 적용 (폼 연결 변경) |

### Q2. huijun이 본 "Couples 시트 4행" spreadsheet ID 확인

브라우저 주소창에서 그 시트의 URL 확인:
```
https://docs.google.com/spreadsheets/d/{이 부분이 ID}/edit
```

| ID | 의미 |
|---|---|
| `1GJX2pk...` | 진단 결과와 모순 (재확인 필요) |
| 다른 ID | huijun이 옛 spreadsheet 보고 있음 |

### Q3. GAS 프로젝트 위치

GAS 편집기 좌측 상단에 프로젝트 이름이 나옴.

- 그 프로젝트의 좌측 파일 목록에 `form-to-couple.gs`, `guest-letter-webhook.gs` 모두 있는지
- 같이 있다면 어느 spreadsheet에 묶여있는지 (편집기 좌상단 `🔗 ⋮` → "프로젝트 정보" 또는 단순히 어느 시트에서 열었는지)

---

## 6. 다음 단계

위 Q1·Q2·Q3 결과 알려주시면 정확한 정리 절차 안내해드리겠습니다. **방안 A**가 가장 유력해 보입니다 (변경 최소).

**임시 처치 — 출시 보류 권장:** 현재 폼·webhook·시트가 따로 노는 상태라 실 고객 데이터가 들어와도 청첩장 페이지에 안 보일 수 있습니다. 통합 확정 후 출시 권장합니다.

— Moment Edit
