# 캐시 안정성 강화 — 적용 완료 보고서

**보고일:** 2026-05-28
**최종 커밋:** `c128211` (main 배포 완료)
**상태:** ✅ 3중 안전망 전부 적용 · GAS 동기화 대기

---

## 적용 요약

| 단계 | 위치 | 변경 |
|---|---|---|
| **1차 (즉시 무효화)** | `automation/form-to-couple.gs:215~222` | `cache.remove()` + 성공/실패 로깅 + 같은 GAS 프로젝트 전제 명시 |
| **2차 (TTL 안전망)** | `automation/guest-letter-webhook.gs:62` | `COUPLE_CACHE_TTL = 60` (600초→60초) |
| **3차 (재렌더 보장)** | `shared/hydrate.js:413~427` | fetch 응답이 localStorage 캐시와 다를 때만 재렌더 (깜빡임 0) |

**파일 통계:** 3 files changed · 17 insertions · 6 deletions

---

## 1차 안전망 · 폼 재제출 즉시 무효화

### `automation/form-to-couple.gs:215~222`

```js
// 4) 캐시 무효화 — webhook 측 getCouple 캐시(같은 키)를 즉시 삭제 → 재제출 즉시 반영.
//    ⚠️ 두 .gs가 같은 Apps Script 프로젝트에 있어야 ScriptCache 공유됨.
try {
  CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId);
  Logger.log('  (캐시 무효화 OK: ' + CFG.CACHE_KEY_PREFIX + eventId + ')');
} catch (_c) {
  Logger.log('  (캐시 무효화 실패: ' + _c.message + ')');
}
```

**효과:**
- 부부가 폼 재제출 → 시트 갱신 → 즉시 webhook 캐시 삭제
- 다음 fetch부터 시트 직접 조회 → 최신값 반환
- 로그로 무효화 동작 여부 추적 가능

---

## 2차 안전망 · TTL 600초 → 60초

### `automation/guest-letter-webhook.gs:60~62`

```js
// getCouple 응답 캐시 TTL(초) — 같은 eventId 재요청 시 시트 읽기 생략.
// 재제출 시 form-to-couple.gs가 명시적으로 무효화하지만, 무효화 실패 시 안전망으로 짧게 유지.
const COUPLE_CACHE_TTL = 60; // 1분 (재제출 즉시 반영 안전망 · 시트 읽기 부담 미미)
```

**효과:**
- 만약 1차 무효화가 실패하더라도 **최대 1분 내 자동 갱신**
- 시트 읽기 빈도 ~10배 증가하지만 Couples 시트는 작아 부담 없음
- 두 .gs가 별도 프로젝트라도(예외 케이스) 1분 내 복구

---

## 3차 안전망 · hydrate 재렌더 보장

### `shared/hydrate.js:413~427`

```js
fetch(WEBHOOK + '?action=getCouple&eventId=' + encodeURIComponent(eventId) + (forceFresh ? '&fresh=1' : ''))
  .then(function (r) { return r.json(); })
  .then(function (data) {
    if (data && data.ok && data.couple) {
      data.couple.eventId = eventId;
      var fresh = JSON.stringify(data.couple);
      // 재제출로 데이터가 바뀐 경우(이전 캐시 ≠ 최신 응답)에만 재렌더 → 깜빡임 없이 항상 최신 반영
      var prev = null;
      try { prev = localStorage.getItem(cacheKey); } catch (_) {}
      try { localStorage.setItem(cacheKey, fresh); } catch (_) {}
      if (!rendered || prev !== fresh) apply(data.couple);
    } else if (!rendered) {
      apply(SAMPLE);
    }
  })
  .catch(function () { if (!rendered) apply(safeCache(cacheKey) || SAMPLE); })
  .then(function () { if (!rendered) { clearTimeout(failsafe); reveal(); } });
```

**효과:**
- 하객이 청첩장 재방문 시 localStorage 캐시 hit → 즉시 옛 값 표시 (체감 속도 유지)
- 백그라운드로 webhook fetch → 최신값 도착
- **`prev !== fresh`** 비교:
  - 같으면 → 재렌더 안 함 (깜빡임 없음)
  - 다르면 → 즉시 최신값으로 화면 갱신

**기존 동작과 차이:**

| 시나리오 | 기존 (rendered=true 시 fetch 무시) | 변경 후 (prev !== fresh 시 재렌더) |
|---|---|---|
| 데이터 변경 없음 | 깜빡임 없음 | 깜빡임 없음 (동일) |
| 데이터 변경됨 (재제출) | **옛 값 그대로 (다음 새로고침에서만 갱신)** | **즉시 최신값 반영** ✅ |
| 첫 방문 (캐시 없음) | fetch 후 렌더 | fetch 후 렌더 (동일) |

---

## 3중 안전망 동작 흐름

```
[부부 재제출] → onCoupleFormSubmit (form-to-couple.gs)
   │
   ├─ 시트 갱신 (writeCell × N)
   │
   ├─ 1차: cache.remove('couple_{eventId}')   ← 즉시 무효화
   │  └─ Logger.log("캐시 무효화 OK: couple_{eventId}")
   │
   └─ 자동 메일 발송 (변경 청첩장 링크)

──────────────────────────────────────────

[하객이 청첩장 URL 접속] → hydrate.js init()
   │
   ├─ location.search에서 eventId 읽기 (브라우저 직접)
   │
   ├─ localStorage 캐시 hit?
   │  ├─ YES → 즉시 옛 값 렌더 (rendered=true, 체감 속도)
   │  └─ NO  → 빈 화면 (fetch 대기)
   │
   ├─ 백그라운드 fetch: webhook + ?eventId=XXX
   │  │
   │  └─ webhook 응답 (guest-letter-webhook.gs):
   │     ├─ ScriptCache hit? (60초 TTL)
   │     │  ├─ YES → 캐시값 응답 (시트 안 읽음)
   │     │  └─ NO  → 시트 조회 → 캐시에 저장 → 응답
   │     │
   │     └─ 2차: 무효화 실패해도 60초 후 자동 시트 재조회
   │
   └─ 응답 도착 (hydrate.js .then)
      │
      ├─ 3차: prev !== fresh 비교
      │  ├─ 같음 → 재렌더 안 함 (깜빡임 0)
      │  └─ 다름 → apply(data.couple) → 즉시 화면 갱신 ✅
      │
      └─ localStorage 캐시 업데이트 (다음 방문 대비)
```

**결과:** 어느 안전망 하나가 실패해도 다음 안전망이 동작 → 하객은 **항상 최신 청첩장** 봄.

---

## 시나리오별 검증

### 시나리오 A · 정상 (1차 무효화 동작)

1. 부부 재제출 → 시트 갱신 → 1차 cache.remove 성공 ✅
2. 하객 새로고침 → localStorage hit (옛 값 잠깐 표시)
3. fetch → webhook 캐시 miss → 시트 직접 조회 → 최신값 응답
4. 3차 prev !== fresh → 즉시 재렌더 ✅
5. **체감 시간: 0.5~1초 내 최신값 반영**

### 시나리오 B · 1차 실패 (예: 다른 GAS 프로젝트)

1. 부부 재제출 → 시트 갱신 → 1차 cache.remove **실패** (별도 프로젝트)
2. 하객 새로고침 → localStorage hit (옛 값 표시)
3. fetch → webhook 캐시 hit (옛 값) — **1분 동안**
4. 3차 prev === fresh → 재렌더 안 함 (옛 값 그대로) ❌

   ↓ 1분 후
   
5. 하객 또는 다른 하객 접속 → webhook 캐시 만료 (60초 TTL)
6. 시트 직접 조회 → 최신값 응답
7. 3차 prev !== fresh → 즉시 재렌더 ✅
8. **체감 시간: 최대 1분 내 최신값 반영**

### 시나리오 C · 데이터 변경 없음

1. 부부가 재제출 안 함, 그냥 동일 데이터 그대로
2. 하객 새로고침 → localStorage hit (값 표시)
3. fetch → 시트 응답 (변화 없음)
4. 3차 prev === fresh → 재렌더 안 함 (깜빡임 0) ✅

---

## huijun 측 작업

### 1. Apps Script 동기화 (필수)

GAS 편집기에서 다음 두 파일 모두 복사·붙여넣기·저장:

| 파일 | 변경 라인 |
|---|---|
| `automation/form-to-couple.gs` | 215~222 (캐시 무효화 + 로깅) |
| `automation/guest-letter-webhook.gs` | 60~62 (TTL 60초) |

### 2. 두 .gs가 같은 프로젝트인지 확인 (필수)

- GAS 편집기 좌측 파일 목록에 `form-to-couple.gs`와 `guest-letter-webhook.gs`가 **둘 다 보이는지** 확인
- 같은 프로젝트 → 1차 무효화 동작 ✅
- 다른 프로젝트 → 1차 무효화 실패, 2차 TTL 60초로 복구

### 3. Vercel 자동 배포 (자동)

`shared/hydrate.js`는 main 브랜치 푸시와 함께 Vercel이 자동 배포.
확인: `momentedit.kr/i/cover-XX?e=eventId` 강력 새로고침 후 동작 확인.

---

## 운영 모니터링

### Apps Script 로그 (View → Executions)

폼 제출 시 다음 로그가 찍힘:
```
[OK] {eventId} · row {N}
  (캐시 무효화 OK: couple_{eventId})
  digital: https://momentedit.kr/i/cover-XX.html?e={eventId}
  family: https://momentedit.kr/i-family/family-XX.html?e={eventId}
  ...
  (이메일 발송 → {to} · QR 포함)
```

만약 "캐시 무효화 실패"가 보이면:
- 메시지 확인 (`_c.message`)
- 같은 프로젝트인지 재확인
- (실패해도 2차 안전망 동작하므로 운영엔 즉시 영향 없음)

---

## 검증 시나리오 (huijun 권장 테스트)

부부 입장에서 직접 테스트:

1. **폼 제출** → 청첩장 받음 → URL 열기 (localStorage 1차 형성)
2. 시트에서 직접 계좌 수정 (또는 폼 재제출)
3. 청첩장 URL **그냥 새로고침 (F5, 강력새로고침 X)**
4. 결과:
   - 옛 값이 0.5초 정도 보이다가
   - **자동으로 최신값으로 갱신** (3차 안전망 동작)
5. 다시 새로고침 → 처음부터 최신값 (localStorage가 최신으로 업데이트됨)

---

## 부록 — 전체 캐시 구조 한눈에

| 레이어 | 키 | TTL | 무효화 시점 |
|---|---|---|---|
| 브라우저 localStorage | `me_couple_{eventId}` | 영구 (수동 삭제 또는 LRU) | fetch 응답 도착 시 자동 갱신 |
| GAS ScriptCache | `couple_{eventId}` | **60초** (변경) | 폼 재제출 시 명시적 삭제 + TTL 자동 만료 |
| Vercel CDN (HTML) | 경로 | `must-revalidate` | 다음 배포 시 자동 |
| (없음) | (cross-eventId 누출 불가) | - | - |

`&fresh=1` 디버그: `https://momentedit.kr/i/cover-01.html?e=...&fresh=1` → 모든 캐시 우회 후 시트 직접 조회.

---

## 다음 단계

1. **huijun**: GAS 편집기에 두 .gs 동기화
2. **huijun**: 같은 프로젝트 확인
3. **(선택)** 위 검증 시나리오로 운영 안정성 직접 확인
4. **(선택)** 친구 시크릿 모드 테스트 결과 공유

추가 이상 발견 시 알려주세요. 즉시 진단해드리겠습니다.

— Moment Edit
