# 출시 전 최종 점검 — 코드 영역 확인 결과

**보고일:** 2026-05-28
**최종 점검 커밋:** main `c128211`
**상태:** ✅ 모든 변경 main 배포 완료 · GAS 동기화만 남음

---

## 1. 라이브 배포 최종 확인

### main 브랜치 최신 커밋

| 커밋 | 내용 | 배포 경로 |
|---|---|---|
| **`c128211`** (HEAD) | Merge: 캐시 안정성 강화 (3중 안전망) | Vercel 자동 (hydrate.js) + GAS 수동 (.gs) |
| `da56b3a` | 캐시 안정성 강화 본체 | 동일 |
| `e2f7d50` | 2단계 톤 + 3단계 빈토글 (16 템플릿 + hydrate) | Vercel 자동 |
| `1b88f24` | 1·2단계 (QR + 날짜 검증) | GAS 수동 |

### 배포 상태별 항목

| 변경 | 파일 | 배포 경로 | 상태 |
|---|---|---|---|
| QR `height="150"` + `!important` | `form-to-couple.gs:391` | **GAS 수동** | ⏳ huijun 동기화 대기 |
| 날짜 `isValidYmd` 검증 | `form-to-couple.gs:309, 140~` | **GAS 수동** | ⏳ huijun 동기화 대기 |
| 캐시 무효화 로깅 | `form-to-couple.gs:215~222` | **GAS 수동** | ⏳ huijun 동기화 대기 |
| TTL 600→60초 | `guest-letter-webhook.gs:62` | **GAS 수동** | ⏳ huijun 동기화 대기 |
| 빈 토글 마커 (16 템플릿) | `i/cover-0?.html`, `i-family/family-0?.html` | Vercel 자동 | ✅ 배포 완료 |
| hydrate 빈 토글 로직 | `shared/hydrate.js:247~257` | Vercel 자동 | ✅ 배포 완료 |
| hydrate 3차 재렌더 | `shared/hydrate.js:413~429` | Vercel 자동 | ✅ 배포 완료 |
| live.html 진사색 점 | `live.html` | Vercel 자동 | ✅ 배포 완료 |
| 04 외부 그레이 베이지 | `i/cover-04.html`, `i-family/family-04.html` | Vercel 자동 | ✅ 배포 완료 |
| `vercel.json` rewrite `/form` | `vercel.json` | 즉시 적용 | ✅ 활성 |

### Vercel 자동 배포 확인 방법

`momentedit.kr` 강력 새로고침(Ctrl+Shift+R) 후 DevTools → Network → `hydrate.js` 응답 확인:
- 본문에 `gShowItem`, `prev !== fresh` 포함되어 있어야 정상

### GAS 수동 동기화 확인 방법

GAS 편집기 → 편집 후 저장 → "최근 실행" 로그 확인. 폼 제출 테스트 1건:
- `(캐시 무효화 OK: couple_XXX)` 로그가 보이면 동기화 성공

---

## 2. 출시 전 코드 체크리스트

### `form-to-couple.gs` 핵심 라인 점검

| 라인 | 항목 | 상태 |
|---|---|---|
| `103` | `PROP_FORM_URL: 'FORM_PUBLISHED_URL'` | ✅ |
| `140~175` | 날짜 검증 게이트 (재안내 메일 + 관리자 알림) | ✅ |
| `215~222` | 캐시 무효화 + 로깅 | ✅ |
| `265~296` | `resolveEventId` (접미사 충돌 처리) | ✅ |
| `309~316` | `isValidYmd` 헬퍼 | ✅ |
| `391` | QR `width="150" height="150"` + `!important` | ✅ |
| `398~432` | 재안내 메일 빌더 (브랜드 톤) | ✅ |

### `guest-letter-webhook.gs` 핵심 라인 점검

| 라인 | 항목 | 상태 |
|---|---|---|
| `62` | `COUPLE_CACHE_TTL = 60` | ✅ |
| `78~82` | eventId 정규식 가드 `^[a-z0-9-]{3,64}$` | ✅ |
| `83~98` | 캐시 hit → 직접 응답 / miss → 시트 조회 + 저장 | ✅ |
| `86` | `cacheKey = 'couple_' + eventId` | ✅ |
| `95` | NOT_FOUND 응답 `{ ok: false, error: 'COUPLE_NOT_FOUND' }` | ✅ |
| `227~273` | `getCoupleByEventIdFull` (`!==` strict 매칭) | ✅ |

### `shared/hydrate.js` 핵심 라인 점검

| 라인 | 항목 | 상태 |
|---|---|---|
| `247~257` | 빈 토글 로직 (gShowItem/bShowItem) | ✅ |
| `396~397` | `URLSearchParams(location.search)` eventId 직접 읽기 | ✅ |
| `401` | eventId 없으면 SAMPLE | ✅ |
| `403` | `cacheKey = 'me_couple_' + eventId` | ✅ |
| `406~411` | localStorage hit 시 즉시 렌더 (rendered=true) | ✅ |
| `413~429` | fetch + 3차 재렌더 (`prev !== fresh`) | ✅ |
| `425` | NOT_FOUND 응답 시 SAMPLE 폴백 (rendered=false 한정) | ✅ |
| `428` | 네트워크 오류 시 캐시 또는 SAMPLE 폴백 | ✅ |

### 16개 청첩장 템플릿 마커 검증

```
i/cover-01.html       — groom/bride 마커 4개
i/cover-02.html       — groom/bride 마커 4개
i/cover-03.html       — groom/bride 마커 4개
i/cover-04.html       — groom/bride 마커 4개
i/cover-05.html       — groom/bride 마커 4개
i/cover-06.html       — groom/bride 마커 4개
i/cover-07.html       — groom/bride 마커 4개
i/cover-08.html       — groom/bride 마커 4개
i-family/family-01.html ~ family-08.html — 각 4개
────────────────────────────────────────
합계: 16파일 × 4마커 = 64개 ✅ 정확히 일치
```

### `vercel.json` 확인

```json
{
  "rewrites": [
    { "source": "/form", "destination": "/form.html" }
  ]
}
```

- `/form` 단축주소 → `form.html` 리라이트 ✅
- 캐시 헤더 커스터마이즈 없음 (Vercel 기본 동작 사용) ✅

### 누락/미배포 변경

❌ **없음**. main 브랜치가 모든 변경의 최종본을 반영하고 있음.

---

## 3. 테스트 데이터 삭제 시 캐시 주의사항

### Q1 · 삭제 후 webhook 캐시 TTL 60초 → 1분 대기 맞나요?

✅ **맞습니다.**

`guest-letter-webhook.gs:62`
```js
const COUPLE_CACHE_TTL = 60; // 1분
```

**상세 동작:**
1. 시트에서 행 삭제
2. 해당 eventId가 캐시에 남아있다면(누가 그 사이에 접속) → **최대 60초** 동안 옛 값 응답
3. 60초 경과 → 캐시 만료 → 시트 직접 조회 → `getCoupleByEventIdFull`이 `null` 반환 → `COUPLE_NOT_FOUND`

**권장 대기:** 안전 마진 포함해 **1분 30초** ~ **2분** 대기

### Q2 · 삭제한 eventId로 누가 접속하면?

#### webhook 응답
```js
// guest-letter-webhook.gs:95
const payload = couple ? { ok: true, couple: couple } : { ok: false, error: 'COUPLE_NOT_FOUND' };
```

→ `{ ok: false, error: 'COUPLE_NOT_FOUND' }` JSON 응답

#### hydrate.js 동작 (`shared/hydrate.js:415~426`)

```js
.then(function (data) {
  if (data && data.ok && data.couple) {     // ← false → 진입 안 함
    // ... 정상 렌더
  } else if (!rendered) {                    // ← rendered 여부에 따라 분기
    apply(SAMPLE);
  }
})
```

**시나리오별 결과:**

| 하객 상태 | localStorage 캐시 | 결과 |
|---|---|---|
| 첫 접속 (캐시 없음) | – | SAMPLE 표시 (이서준·정하윤) |
| 이전 접속 적 있음 | 옛 값 있음 | **옛 localStorage 캐시 표시** (3차 재렌더 안 됨 — NOT_FOUND라 갱신 신호 없음) |

⚠️ **잠재 이슈:** 삭제된 eventId를 가진 옛 캐시는 localStorage에 영구 잔존 (LRU 또는 수동 삭제 전까지).

테스트 행 삭제 후 그 eventId를 알고 있던 사람이 다시 접속하면 자기 브라우저의 옛 값이 보일 수 있음. **출시 전 테스트 데이터 정리에선 무관**(외부 공유 안 됐을 테니).

### Q3 · 깨진 행 (`jh-km-0936`, 09-36) 삭제 시 주의

**특별 주의사항: 없음 — 일반 삭제와 동일.**

- 날짜가 깨진 행이지만 시트 데이터 자체는 정상 (텍스트 `2026-09-36`이 들어있을 뿐)
- 삭제 후 `webhook getCouple` 호출 시 `null` → `COUPLE_NOT_FOUND` 응답 (정상 동작)
- 폼 v2 적용 후엔 동일 입력 재발생 차단됨 (`isValidYmd` 통과 불가)

**삭제 순서 추천:**
1. **친구에게 별도 안내** — 만약 `jh-km-0936` URL을 갖고 있다면 더 이상 유효하지 않음 알림
2. 시트에서 행 삭제 (행 우클릭 → "행 삭제")
3. 1~2분 대기 (캐시 만료)
4. (선택) `?e=jh-km-0936` 접속해 SAMPLE 표시 확인

---

## 4. 정본 폼 URL (`PROP_FORM_URL`) 확인

### 코드상 저장 위치

**`form-to-couple.gs:103, 625`**
```js
// CFG
PROP_FORM_URL: 'FORM_PUBLISHED_URL'

// createCoupleForm() 내부 — 폼 생성 직후 저장
try {
  PropertiesService.getScriptProperties().setProperty(
    CFG.PROP_FORM_URL,
    form.getPublishedUrl()
  );
} catch (_p) {}
```

저장된 URL = `form.getPublishedUrl()` = 응답 받는 URL (`/viewform`).

### 저장 시점

- `createCoupleForm()` 실행 시마다 **덮어쓰기**
- 폼을 새로 생성할 때마다 그 폼의 published URL이 저장됨
- 즉 **마지막으로 `createCoupleForm()` 호출한 폼의 URL**이 현재 저장값

### 현재 저장값 확인 방법

PropertiesService는 GAS 편집기에서만 조회 가능 (GitHub에서 못 봄).

**huijun께서 GAS 편집기에서:**

#### 방법 A — 즉석 확인 함수 실행

GAS 편집기에 임시 함수 추가 후 1회 실행:

```js
function checkFormUrl() {
  var url = PropertiesService.getScriptProperties()
    .getProperty(CFG.PROP_FORM_URL);
  Logger.log('저장된 정본 폼 URL: ' + url);
}
```

실행 → "실행 로그" 확인 → URL에 `1FAIpQLScOqdtYiQ...` 포함되어 있는지 검증

#### 방법 B — Apps Script 사이드바

GAS 편집기 → 좌측 톱니바퀴 → "프로젝트 속성" → "스크립트 속성" 탭 → `FORM_PUBLISHED_URL` 값 확인

### 정본 일치 검증

| 항목 | 기대 값 | 확인 위치 |
|---|---|---|
| `PROP_FORM_URL` | `https://docs.google.com/forms/d/e/1FAIpQLScOqdtYiQ.../viewform` | GAS Properties (위 방법으로) |
| `form.html` 메타 refresh | 동일 단축링크 | `grep -n 1FAIpQLSc form.html` |
| `form/index.html` | 동일 단축링크 | `grep -n 1FAIpQLSc form/index.html` |
| 자동 메일 본문 폼 링크 | `momentedit.kr/form` (Vercel rewrite) | 자동 처리 |

### 코드 측 form.html 단축링크 확인 (현재 라이브 값)

`form.html` / `form/index.html` 모두 동일한 단축링크 3곳에 박혀있음:

```
form.html:19    meta http-equiv refresh    1FAIpQLScOqdtYiQNm_u7Pc3ZIeASzY15CwGJIdqRrEZzbguqeg9uIPQ
form.html:20    script location.replace    동일
form.html:33    a href 폴백 링크           동일
form/index.html:19~33  동일 3곳
```

✅ **6개 위치 모두 `1FAIpQLScOqdtYiQ...` 정본과 일치**

→ huijun이 GAS `PROP_FORM_URL` 확인 결과가 동일한 단축링크라면 모든 경로가 정본 폼으로 일치됨.

---

## 종합 — 출시 전 최종 상태

### ✅ 완료된 항목

- 1·2·3단계 (QR · 날짜 · 빈토글)
- 캐시 3중 안전망 (즉시 무효화 + 60초 TTL + 재렌더 비교)
- cross-contamination 0 확정 (계좌 안전)
- main 브랜치 최종본 = `c128211`
- 16개 청첩장 템플릿 마커 정확 배치
- live.html 진사색 + 04 외부 그레이 베이지

### ⏳ 남은 huijun 작업 (코드 변경 없이 수동)

1. **GAS 동기화** (필수):
   - `form-to-couple.gs` 복사·저장
   - `guest-letter-webhook.gs` 복사·저장
   - 두 .gs 같은 프로젝트 확인
2. **PROP_FORM_URL 확인** (위 방법 A 또는 B)
3. **폼 정리** (구 폼 휴지통)
4. **테스트 데이터 삭제** (1~2분 대기 후 확인)
5. **종합 점검** (제출 → 시트 수정 → 새로고침 갱신 확인)
6. **출시**

추가 확인 필요한 부분 있으시면 알려주세요.

— Moment Edit
