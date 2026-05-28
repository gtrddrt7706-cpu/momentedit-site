# 출시 전 업로드 가이드 — 4개 자료 + 폼 재생성 순서

**작성일:** 2026-05-28
**최신 main 커밋:** `2166f7a`
**상태:** "계좌 표시 위치" 기능 + 기존 모든 버그 수정 통합본

---

## 업로드 자료 (4개)

| # | 파일 | 위치 | 비고 |
|---|---|---|---|
| 1 | `Couples_template_v3_39col.xlsx` | 새 Google Sheets 만들거나 기존 Couples 시트 헤더 갱신 | 39열 (신규 3열 강조) |
| 2 | `form-to-couple.gs` | GAS 편집기에 복사·저장 | 트리거 함수 (재배포 불필요) |
| 3 | `guest-letter-webhook.gs` | GAS 편집기에 복사·저장 + **재배포** | doGet은 deployment URL로 호출됨 |
| 4 | `hydrate.js` (참고용) | Vercel 자동 배포 — huijun 작업 없음 | main 푸시로 자동 반영됨 |
| 5 | `live.html` (참고용) | Vercel 자동 배포 — huijun 작업 없음 | main 푸시로 자동 반영됨 |

---

## Step 1 · 시트 헤더 정비

### 옵션 A · 기존 시트에 신규 3열만 추가 (권장)

기존 Couples 시트(36열)에 **3행 37·38·39열**에 영문 헤더 3개 입력:

| 열 | 3행 헤더 (영문, 정확히) |
|---|---|
| 37 | `accountOnline` |
| 38 | `accountLive` |
| 39 | `accountFamily` |

(엑셀 파일에서 노란색 강조된 3개 컬럼 참고)

### 옵션 B · 완전히 새 시트로 시작

`Couples_template_v3_39col.xlsx` 다운로드 → 새 Google Sheets에 가져오기 → 시트 이름 정확히 **`Couples`** 로 변경 → spreadsheet ID는 `1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4`(Letter System)와 같아야 함 (또는 webhook을 새 spreadsheet로 옮기는 추가 작업).

기존 데이터를 옮길 게 없다면 옵션 A가 가장 안전.

---

## Step 2 · GAS 코드 갱신

### form-to-couple.gs (재배포 불필요)
1. GAS 편집기 열기
2. 좌측 파일 목록에서 `form-to-couple.gs` 클릭
3. 전체 선택 → 삭제 → 새 파일 내용 붙여넣기
4. **저장**(Ctrl+S)

### guest-letter-webhook.gs (재배포 필수)
1. GAS 편집기에서 `guest-letter-webhook.gs` 클릭
2. 전체 선택 → 삭제 → 새 파일 내용 붙여넣기
3. **저장**(Ctrl+S)
4. 우상단 **Deploy → Manage deployments**
5. 기존 배포 옆 **연필**(편집) 아이콘
6. **Version** 드롭다운 → **New version** 선택
7. **Deploy** 클릭
8. Deployment URL은 동일 유지됨 (변경 없음)

---

## Step 3 · 새 폼 생성

### `createCoupleForm()` 실행

1. GAS 편집기 → 함수 드롭다운에서 `createCoupleForm` 선택 → ▶ 실행
2. 권한 승인 (처음이면)
3. 실행 로그(Ctrl+Enter) 확인:
   ```
   폼 v2 생성 완료 (6단계)
     작성 URL: https://docs.google.com/forms/d/e/1FAIp.../viewform
     편집 URL: https://docs.google.com/forms/d/.../edit
     트리거: 새로 등록 (또는 이미 있음)
   ```
4. **작성 URL을 복사해 두기** (다음 Step에서 사용)

⚠️ **이미지 fetch 1~2분 소요**. 응답 없어도 기다리기.

### 새 폼 응답 시트 자동 연결 확인

`createCoupleForm` 안에서 `form.setDestination(SPREADSHEET, ss.getId())` 자동 호출 → 현재 활성 spreadsheet(Letter System)의 "설문지 응답 시트"로 응답 자동 전송.

`diagnoseFormSetup()` 한 번 실행해서 확인:
- `[시트→폼 연결]` ✅ 폼 URL 출력
- `[트리거]` ✅ 1개, onFormSubmit, 현재 시트

---

## Step 4 · 단축링크 갱신

`form.html` / `form/index.html` 6개 위치에 새 폼 단축링크 입력 필요:

새 폼 URL 알려주시면 제가 코드 수정해서 main 푸시해드립니다. (또는 huijun이 직접 6곳 grep으로 일괄 수정 가능)

---

## Step 5 · 옛 폼 정리 (선택)

1. 기존 정본 폼 (1FAIpQLScOqdtYiQ...) 편집기 열기
2. 우상단 ⋮ → "휴지통으로 이동"
3. **⚠️ 트리거가 자동 삭제될 수 있음** → `diagnoseFormSetup()`으로 트리거 1개 정상 등록 확인 → 필요 시 `ensureTrigger()` 실행

---

## Step 6 · 테스트 제출

새 폼 URL로 1건 제출 → Couples 시트 4행에 정상 기록되는지 확인:

### 체크 항목

| 컬럼 | 기대 값 |
|---|---|
| eventId | 자동 생성 (예: `ts-tt-1024`) |
| weddingDate | 입력 그대로 (`2026-10-24`) |
| **accountOnline** | 폼에서 "온라인 청첩장" 체크 → `Y` / 미체크 → `N` |
| **accountLive** | "라이브 화면" → `Y` / 미체크 → `N` |
| **accountFamily** | "오프라인 청첩장" → `Y` / 미체크 → `N` |
| 기타 36개 | 폼 답변 그대로 |

### 청첩장 페이지 확인

자동 메일의 청첩장 URL 클릭(또는 시크릿 모드 + `&fresh=1`):

- **`accountOnline=Y`** 이면 cover-XX에 envelope 섹션 표시
- **`accountFamily=Y`** 이면 family-XX에 envelope 섹션 표시
- **`accountLive=Y`** 이면 live.html에 envelope 섹션 표시
- 미체크된 페이지는 envelope 섹션 **통째 hide**

### 디버그 모드 (선택)

`?debug=1` 붙이면 F12 콘솔에 `pageShowAcct`, `gShowItem` 등 모든 평가값 출력.

---

## 진행 순서 요약

```
1. 엑셀(또는 시트 3행 37·38·39열 직접 추가) ← 헤더 정비
2. form-to-couple.gs GAS 복사·저장
3. guest-letter-webhook.gs GAS 복사·저장 + 재배포
4. createCoupleForm() ▶ 실행 → 새 폼 URL 받기
5. diagnoseFormSetup() ▶ 실행 → 트리거·시트 연결 확인
6. 새 폼 URL 알려주기 → 단축링크 갱신 (제가 처리)
7. 옛 폼 휴지통 (선택)
8. 테스트 제출 1건 → 시트·청첩장 확인
9. 출시
```

각 단계 진행 중 막히면 알려주세요.

— Moment Edit
