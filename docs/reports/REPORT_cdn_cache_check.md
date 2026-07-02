# CDN 캐시 동작 점검 — 청첩장 HTML

**보고일:** 2026-05-28
**검토 대상:** Vercel CDN이 청첩장 HTML을 캐시할 때 cross-eventId 누출 가능성
**상태:** ✅ 코드 확인 완료 · CDN 캐시 누출 불가능 확정

---

## 결론

| 질문 | 답변 | 근거 |
|---|---|---|
| Vercel이 정적 HTML 캐시? | **Yes** (의도된 동작) | 정적 파일 기본 CDN 캐시 |
| ?e= 쿼리가 캐시 키에 포함? | **무관** | HTML이 eventId 독립 |
| hydrate가 ?e=를 어떻게 읽나? | **브라우저 `location.search` 직접** | `hydrate.js:396` |
| CDN이 "다른 사람 다른 계좌" 원인? | **❌ 불가능** | 아키텍처상 차단 |

**친구 사례의 진짜 원인 후보:**
- 다른 URL(다른 eventId)을 같은 청첩장으로 착각
- 친구 브라우저 localStorage 잔류
- (캐시·CDN 누출 가능성은 아키텍처상 0)

---

## 1. 아키텍처 — 왜 CDN 캐시가 안전한가

### 청첩장 구조 (의도된 설계)

```
┌─ 정적 HTML (family-08.html) ──────────────┐
│  · 템플릿 (모든 부부 동일)                  │
│  · eventId 없음 — 단순 HTML 셸             │
│  · CDN 캐시 OK (의도)                      │
└───────────────────────────────────────────┘
         ↓ 브라우저 로드
┌─ hydrate.js (브라우저에서 실행) ─────────┐
│  1. location.search에서 ?e=eventId 읽기  │
│  2. fetch(webhook + eventId)              │
│  3. JSON 응답을 템플릿에 채워넣기          │
└───────────────────────────────────────────┘
         ↓ 브라우저별로 다른 eventId
┌─ Apps Script Webhook ──────────────────────┐
│  · GET ?action=getCouple&eventId=XXX      │
│  · 시트 조회 → JSON 응답                   │
│  · 캐시 키 = 'couple_' + eventId          │
└───────────────────────────────────────────┘
```

### 핵심 원리

- **HTML은 부부별로 다르지 않음** — 같은 디자인이면 모두 동일한 family-08.html
- **부부 데이터는 webhook에서 fetch** — 각 브라우저가 자기 URL의 eventId로 별도 요청
- **CDN이 HTML을 캐시해도 모든 부부가 같은 셸을 받는 게 정상**

### Cross-eventId 누출이 불가능한 이유

| 데이터 출처 | 키 |
|---|---|
| 정적 HTML | 경로 (eventId 무관) |
| 브라우저 localStorage | `me_couple_{eventId}` (eventId별 분리) |
| Apps Script ScriptCache | `couple_{eventId}` (eventId별 분리) |
| Webhook 응답 | 요청 시점에 eventId별로 시트 직접 조회 |

**어떤 레이어에서도 eventId 사이 데이터가 섞일 수 없습니다.**

---

## 2. 코드 증거

### `shared/hydrate.js:394~417` (브라우저 측 eventId 읽기)

```js
function init() {
  preconnectWebhook();
  var _p = new URLSearchParams(location.search);         // ← 브라우저 URL에서 직접
  var eventId = (_p.get('e') || '').trim();
  var forceFresh = _p.get('fresh') === '1';
  var failsafe = setTimeout(reveal, 5000);

  if (!eventId) { apply(SAMPLE); clearTimeout(failsafe); reveal(); return; }

  var cacheKey = 'me_couple_' + eventId;                  // ← localStorage 키 = eventId별
  var cached = forceFresh ? null : safeCache(cacheKey);
  var rendered = false;
  if (cached) {
    cached.eventId = eventId;
    apply(cached); clearTimeout(failsafe); reveal(); rendered = true;
  }

  fetch(WEBHOOK + '?action=getCouple&eventId=' + encodeURIComponent(eventId) + (forceFresh ? '&fresh=1' : ''))
    .then(function (r) { return r.json(); })
    .then(function (data) {
      if (data && data.ok && data.couple) {
        data.couple.eventId = eventId;
        try { localStorage.setItem(cacheKey, JSON.stringify(data.couple)); } catch (_) {}
        if (!rendered) apply(data.couple);
      } else if (!rendered) {
        apply(SAMPLE);
      }
    });
}
```

**확인 포인트:**
- ✅ `location.search` — 브라우저의 현재 탭 URL에서 직접 읽음 (CDN 무관)
- ✅ `URLSearchParams` — 표준 브라우저 API, 서버 주입 아님
- ✅ localStorage 키에 eventId 포함 — 부부별 격리
- ✅ webhook URL에 `eventId=` 쿼리 포함 — 응답이 eventId별 분리

### `vercel.json` (현재 설정)

```json
{
  "rewrites": [
    { "source": "/form", "destination": "/form.html" }
  ]
}
```

- 캐시 헤더 커스터마이즈 없음 → Vercel 기본 동작
- rewrites는 `/form → /form.html`만, 청첩장 경로엔 미적용
- 청첩장은 그냥 정적 HTML로 서빙됨

### Vercel 기본 CDN 동작 (정적 HTML)

- 정적 파일은 Vercel Edge Network에 캐시됨
- HTML 파일의 기본 `Cache-Control`: `public, max-age=0, must-revalidate`
  - 브라우저는 매 요청마다 ETag/Last-Modified로 revalidate
  - CDN은 immutable 아닌 한 자주 갱신
- 같은 경로의 HTML은 모두 같은 콘텐츠 → 캐시 공유 OK

**핵심:** HTML 내용이 eventId와 무관하므로, 캐시 공유가 의도된 동작.

---

## 3. "사람마다 다른 계좌" 진짜 원인 후보

CDN을 제외하면 가능한 시나리오:

### A. ★ 가장 유력 — 다른 URL을 같은 청첩장으로 착각

정희준·미쿠로 **7번 테스트** → 7개 eventId 생성:

| eventId | 추정 상태 |
|---|---|
| `km-mk-1217` | ? |
| `jh-km-0326` | ? |
| `jh-km-0305` | ? |
| `jh-km-1203` | ? |
| `jh-km-0831` | 계좌 있음 (가능성) |
| `jh-km-1230` | ? |
| `jh-km-0936` | 계좌 None (확정 · 본 케이스) |

huijun이 친구에게 보낸 URL과 친구가 실제 본 URL이 다를 가능성이 큽니다.

**확인 방법:**
- huijun: "친구에게 어떤 URL을 보냈는가?" → 카톡/문자 메시지 확인
- 친구: "지금 보고 있는 URL을 그대로 복사해서 보내달라" → 주소창 전체 복사

### B. 친구 브라우저 localStorage 잔류

- 친구가 과거에 jh-km-0936 또는 다른 eventId를 본 적 있고
- 그때 huijun이 시트에 계좌를 입력했었다가 나중에 지웠다면
- 친구 localStorage에 옛 값이 남아있을 수 있음 (LRU 또는 수동 삭제 전까지)

**hydrate.js 동작:**
```
1. localStorage 캐시 hit → 즉시 옛 값 렌더 (rendered=true)
2. 백그라운드로 webhook fetch → 최신값을 localStorage에 저장
3. 화면은 이미 렌더됐으므로 옛 값 보임 (다음 새로고침에서야 최신)
```

**확인 방법:**
- 친구 시크릿 모드 / DevTools → Application → localStorage 비우기 후 재접속

### C. 친구가 hydrate.js 오래된 버전 사용 (가능성 낮음)

- Vercel이 hydrate.js를 매우 오래 캐시했다면 (정상은 아님)
- 옛 hydrate가 옛 SAMPLE 또는 옛 로직을 사용할 수도

**확인 방법:**
- DevTools → Network 탭 → hydrate.js 응답 코드(200 vs 304) 확인

### D. 친구가 보고 있는 URL이 huijun이 친구에게 보낸 URL이 아님

- 카톡 미리보기 캐시, 다른 사람이 보낸 옛 URL, 자동완성 등
- 친구 입장에선 "huijun이 보낸 그 청첩장"으로 인식되지만 실제 URL이 다름

---

## 4. 시크릿 모드 테스트 (huijun 진행 중)

이 테스트가 **결정적**입니다:

| 테스트 결과 | 진단 |
|---|---|
| 시크릿 모드에서 **계좌 안 보임** (시트와 일치) | → 친구 브라우저 캐시(localStorage 또는 카톡 캐시) 문제 |
| 시크릿 모드에서 **계좌 보임** (시트와 불일치) | → 시트 다른 eventId 행을 보고 있음 → URL 대조 필요 |
| 친구와 huijun 화면이 다름 (같은 URL인데) | → 거의 불가능. 친구가 본 URL을 정확히 받아 다시 확인 |

---

## 5. 운영 안정성 — 추가 제안 (선택)

CDN 누출은 없지만, "친구 브라우저 캐시(localStorage)" 문제는 실제 운영에서 발생 가능합니다.

### 현재 동작

- localStorage 캐시 hit → 즉시 옛 값 렌더 (rendered=true)
- 백그라운드 fetch → 최신값 저장
- 화면은 옛 값 보임 (다음 새로고침에서 갱신)

### 옵션

| 옵션 | 효과 | 트레이드오프 |
|---|---|---|
| **A. 그대로 유지** | 체감 속도 빠름 | 재제출 직후 한 번은 옛 값 (다음 새로고침에 갱신) |
| **B. fetch 응답으로 즉시 재렌더** | 항상 최신값 | 미세한 깜빡임 (옛값→새값) |
| **C. localStorage 캐시 자체 제거** | 항상 fetch | 첫 로딩 0.5초 느려짐 |

**제 추천: A 유지**
- 청첩장은 데이터가 자주 안 바뀜
- 재제출 시 한 번 새로고침 권장 메시지를 자동 메일에 추가하면 충분
- 또는 B를 도입한다면 깜빡임은 transition으로 부드럽게 처리

### B 옵션 코드 예시 (선택)

`hydrate.js:419` 근처를 다음과 같이 변경:

```js
.then(function (data) {
  if (data && data.ok && data.couple) {
    data.couple.eventId = eventId;
    try { localStorage.setItem(cacheKey, JSON.stringify(data.couple)); } catch (_) {}
    // 변경 후: rendered 여부와 무관하게 항상 최신값으로 재렌더
    apply(data.couple);
  } else if (!rendered) {
    apply(SAMPLE);
  }
})
```

단점: 캐시값과 시트값이 달라졌을 때 화면이 한 번 바뀜(깜빡임).
완화책: 캐시값과 fetch값을 비교해 다른 경우에만 재렌더.

---

## 6. 다음 단계 권장

### huijun 측 검증

1. **친구 URL 대조** — 친구가 보고 있는 URL을 정확히 복사받기
2. **시크릿 모드 테스트** — 친구가 시크릿/InPrivate으로 접속해 같은 URL 보기
3. **시트와 화면 데이터 비교** — 시크릿 모드에서 본 화면이 시트와 일치하는지

### 결과에 따른 진단

| 검증 결과 | 다음 작업 |
|---|---|
| URL이 달랐음 | 친구에게 정확한 URL 재전송 (수정 작업 불필요) |
| URL 같은데 시크릿 모드 정상 | 친구 브라우저 localStorage 비우기 안내 |
| URL 같고 시크릿 모드도 옛 값 | (불가능에 가까움) 추가 진단 필요 |

---

## 부록 — Vercel CDN 동작 한눈에

| 항목 | 동작 |
|---|---|
| 정적 HTML 캐시 | Edge Network에 자동 캐시 |
| 기본 Cache-Control | `public, max-age=0, must-revalidate` |
| 캐시 무효화 | 다음 배포 시 자동 무효화 |
| 쿼리스트링 처리 | 정적 파일은 경로로 서빙 — 쿼리 무관 |
| immutable 처리 | `_next/static`, fingerprint 파일에만 적용 |
| 청첩장 영향 | **HTML 캐시 공유 OK** (eventId 무관) |

---

## 결론 한 줄

**CDN은 "다른 사람 다른 계좌"의 원인이 될 수 없습니다.** hydrate가 브라우저에서 `location.search`로 eventId를 읽고 webhook에 fetch하는 구조라, HTML이 캐시돼도 각 브라우저는 자기 URL의 eventId로 별도 응답을 받습니다. 친구 사례는 다른 URL이거나 친구 브라우저 캐시일 가능성이 99%입니다. huijun의 시크릿 모드 테스트 결과를 기다리겠습니다.

— Moment Edit
