# 캐시 의심 건 — 코드 분석 및 답변

**보고일:** 2026-05-28
**검토 대상:** `getCoupleByEventIdFull` 10분 TTL · 재제출 시 캐시 무효화 동작
**상태:** 코드 레벨 확인 완료 · 결론 도출

---

## 결론 요약

| # | 질문 | 답변 |
|---|---|---|
| 1 | 10분 캐시 때문에 옛 데이터(계좌 있던 버전)가 보일 수 있나? | **이론적으로 가능하나, 친구 사례엔 해당 안 됨** |
| 2 | 재제출 시 캐시 자동 무효화? | **YES — 이미 구현되어 있음** (`form-to-couple.gs:216`) |
| 3 | 재제출 즉시 반영이 맞나? | **맞음 — 현재 코드는 이미 그렇게 동작** |

**단, 필수 전제조건:** `form-to-couple.gs`와 `guest-letter-webhook.gs`가 **같은 Apps Script 프로젝트** 내에 있어야 ScriptCache 공유.

---

## 1. 현재 캐시 무효화 로직 — 코드 확인

### `form-to-couple.gs` (폼 제출 핸들러)

**파일 상단 (CFG 정의)**
```js
var CFG = {
  // ...
  CACHE_KEY_PREFIX: 'couple_',
  // ...
};
```

**핸들러 본문 (line 216) — 시트 쓰기 직후 캐시 삭제**
```js
// 3) 혼주 표시 토글 처리 ...
writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ...);
writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ...);

// 4) 캐시 무효화
try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

// 5) URL 조립 ...
```

### `guest-letter-webhook.gs` (청첩장 데이터 응답)

**doGet getCouple 엔드포인트 (line 83~98)**
```js
// ── 캐시(CacheService): 같은 eventId 응답을 재사용해 시트 읽기 생략 → 응답 빨라짐 ──
//    편집 직후 즉시 확인하려면 URL 끝에 &fresh=1 (캐시 무시).
const cache = CacheService.getScriptCache();
const cacheKey = 'couple_' + eventId;
const skipCache = String((e.parameter.fresh || '')) === '1';
if (!skipCache) {
  const hit = cache.get(cacheKey);
  if (hit) return jsonResponse(JSON.parse(hit));
}

const couple = getCoupleByEventIdFull(eventId);
const payload = couple ? { ok: true, couple: couple } : { ok: false, error: 'COUPLE_NOT_FOUND' };
if (couple) {
  try { cache.put(cacheKey, JSON.stringify(payload), COUPLE_CACHE_TTL); } catch (_e) {}
}
```

**TTL 정의 (line 60)**
```js
// getCouple 응답 캐시 TTL(초) — 같은 eventId 재요청 시 시트 읽기 생략
const COUPLE_CACHE_TTL = 600;
```

### 키 일치 확인

| 파일 | 캐시 키 |
|---|---|
| `form-to-couple.gs` | `CFG.CACHE_KEY_PREFIX + eventId` = `'couple_' + eventId` |
| `guest-letter-webhook.gs` | `'couple_' + eventId` |

✅ **완전 일치** — 폼 재제출 시 정확히 해당 eventId 캐시만 삭제됨.

### 동작 흐름 (재제출 시)

```
1. 부부가 폼 재제출 (같은 성함·날짜)
2. onCoupleFormSubmit 트리거 발동
3. resolveEventId → 기존 행 발견 (덮어쓰기 모드)
4. writeCell × N (계좌·디자인·텍스트 등 갱신)
5. cache.remove('couple_' + eventId)  ← 즉시 무효화
6. 자동 메일 발송 (변경 URL 또는 동일 URL)
7. 하객이 그 직후 URL 접속 → cache.get 실패 → 시트 재조회 → 최신값
```

→ **재제출 즉시 반영됨.**

---

## 2. ⚠️ 필수 전제조건 — 같은 Apps Script 프로젝트

### 왜 중요한가

`CacheService.getScriptCache()`는 **같은 Apps Script 프로젝트 내에서만 공유**됩니다.

- 두 .gs 파일이 같은 프로젝트 → 캐시 공유 ✅
- 두 .gs 파일이 다른 프로젝트 → 각자 별도 캐시 ❌

만약 별도 프로젝트라면:
- `form-to-couple.gs`의 `cache.remove(...)` 호출은 **자기 프로젝트 캐시만** 지움
- `guest-letter-webhook.gs` 캐시는 그대로 유지 → 10분 동안 옛 데이터 응답

### huijun께서 확인하실 점

**Google Apps Script 편집기에서:**
1. `form-to-couple.gs`가 들어있는 프로젝트 열기
2. 좌측 파일 목록에 `guest-letter-webhook.gs`도 함께 있는지 확인
3. **같은 프로젝트라면**: 정상 (현재 코드가 그대로 동작)
4. **다른 프로젝트라면**: 한쪽으로 합치는 작업 필요

(현재 상태가 같은 프로젝트일 가능성이 높지만, 운영 안정성을 위해 확인 권장)

---

## 3. 친구 사례 — 캐시일 가능성은 낮습니다

### 핵심 사실

- `jh-km-0936`은 **처음 생성된 행** (huijun 시트 확인 결과)
- 계좌가 있었다가 None으로 바뀐 게 아니라, **처음부터 None**
- 따라서 그 eventId에 대한 "계좌 있던 옛 캐시"가 존재할 수가 없음

### 친구가 계좌를 본 다른 가능성

| 추정 | 설명 | 확인 방법 |
|---|---|---|
| **A. 다른 eventId** | 친구가 본 URL이 `jh-km-0831` 등 다른 제출본 (계좌 있던 버전) | huijun이 보낸 URL과 친구가 본 URL 대조 |
| **B. 브라우저 자동완성** | 친구가 옛 URL을 자동완성으로 들어감 | 친구 브라우저 히스토리 확인 |
| **C. 공유 메시지 잔류** | 카톡·문자에 옛 청첩장 메시지가 남아있고 그걸 다시 클릭 | 친구의 대화창 확인 |
| **D. iframe/임베드** | 어떤 페이지에 옛 청첩장이 임베드돼 있음 | (가능성 낮음) |

### 가장 가능성 높은 시나리오

정희준·미쿠로 **7번 테스트** → 7개 eventId 생성:
- `km-mk-1217`
- `jh-km-0326` / `0305` / `1203` / `0831` / `1230` / `0936`

이 중 일부는 **계좌 입력**, 일부는 **공란**. huijun이 친구에게 어떤 URL을 보냈고, 친구가 어떤 URL을 클릭했는지가 다를 가능성이 큽니다.

→ huijun이 친구에게 "정확히 어떤 URL 보냈는지" + "친구가 본 URL이 뭔지" 대조하시면 확정됩니다.

---

## 4. 운영 안정성 강화 제안 (선택)

현재 구조가 정상 동작하지만, 만약 추가 보강을 원하시면:

### 옵션 비교

| 옵션 | 효과 | 트레이드오프 | 추천 |
|---|---|---|---|
| **A. TTL 600초 → 60초** | 무효화 실패해도 1분 내 자동 갱신 | 시트 읽기 ~10배 증가 (Couples 시트는 작음 → 부담 없음) | ⭐ |
| **B. 무효화 로깅 추가** | Apps Script 로그에서 무효화 성공 여부 추적 | 코드 5줄 추가 | ⭐ |
| **C. hydrate에 cache buster (`&fresh=1`)** | 항상 최신 fetch | 캐시 효용 사라짐 — 응답 느려짐 | ✗ 비추천 |
| **D. 그대로 유지 + 같은 프로젝트 확인** | 변경 0 | huijun 수동 확인 필요 | (옵션) |

### 제 추천: A + B 조합

**A. TTL 60초**
```js
// guest-letter-webhook.gs line 60
const COUPLE_CACHE_TTL = 60;   // 600 → 60 (재제출 즉시 반영 안전망)
```

**B. 무효화 로깅**
```js
// form-to-couple.gs line 216
try {
  CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId);
  Logger.log('  (캐시 무효화 OK: ' + CFG.CACHE_KEY_PREFIX + eventId + ')');
} catch (_c) {
  Logger.log('  (캐시 무효화 실패: ' + _c.message + ')');
}
```

### 효과

- 폼 재제출 → 캐시 무효화 호출 → 즉시 반영
- 만약 어떤 이유로 무효화가 실패하더라도 **1분 이내 자동 갱신**
- 로그에서 무효화 동작 여부 확인 가능 → 운영 추적

---

## 5. 권장 진행 순서

1. **huijun**: 친구에게 보낸 URL ↔ 친구가 본 URL 대조 (캐시 아닌 다른 원인 확인)
2. **huijun**: GAS 편집기에서 `form-to-couple.gs`와 `guest-letter-webhook.gs`가 같은 프로젝트인지 확인
3. **위 2가지 확인 후**, 강화 옵션 (A+B) 적용 여부 결정
4. (선택) 강화 옵션 적용 → main 배포 → GAS 동기화

---

## 부록 — 캐시 키/TTL 한눈에

| 항목 | 값 | 위치 |
|---|---|---|
| 캐시 키 prefix | `couple_` | 양 .gs 일치 |
| 캐시 키 형식 | `couple_{eventId}` | 예: `couple_jh-km-0936` |
| TTL | 600초 (10분) | `guest-letter-webhook.gs:60` |
| 무효화 호출 | `cache.remove(...)` | `form-to-couple.gs:216` |
| 우회 파라미터 | `&fresh=1` | `guest-letter-webhook.gs:87` |
| 캐시 종류 | `CacheService.getScriptCache()` (프로젝트 범위) | 두 파일 동일 |

`&fresh=1`은 디버그용 — 청첩장 URL 끝에 붙이면 캐시 무시하고 시트 직접 조회.
예: `https://momentedit.kr/i/cover-01.html?e=jh-km-0936&fresh=1`

(단, hydrate.js가 `&fresh=1`을 webhook 호출에 전달해야 동작 — 확인 필요)

---

## 다음 단계

추가 이상 발견 시 알려 주세요. 강화 옵션 적용 결정하시면 바로 진행해드리겠습니다.

— Moment Edit
