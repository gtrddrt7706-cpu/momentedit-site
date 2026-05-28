# cover 빈 토글 미작동 — 진단 보고서

**보고일:** 2026-05-28
**증상:** cover-08?e=jh-km-0625&fresh=1 시크릿 모드에서도 빈 계좌 토글이 노출
**status:** 마커 정상 확인 · 추가 진단 필요

---

## 1. 16개 템플릿 마커 점검 — **전부 정상**

```
i/cover-01.html: 4 markers ✅
i/cover-02.html: 4 markers ✅
i/cover-03.html: 4 markers ✅
i/cover-04.html: 4 markers ✅
i/cover-05.html: 4 markers ✅
i/cover-06.html: 4 markers ✅
i/cover-07.html: 4 markers ✅
i/cover-08.html: 4 markers ✅
i-family/family-01~08.html: 각 4 markers ✅
```

cover 8개 + family 8개 = 16개 × 4마커 = 64개 모두 존재.

---

## 2. cover-08 vs family-08 envelope 구조 비교

### `diff <(cover-08 envelope) <(family-08 envelope)`

```diff
1,3c1
< <!-- OPTIONAL:envelope -->
< <!-- ═══ Nº V — ENVELOPE (축의) ═══ -->
< <section class="sec sec-env" aria-labelledby="sec-05-title">
---
> <!-- OPTIONAL:envelope --><section class="sec sec-env" aria-labelledby="sec-05-title">
```

차이는 **단순 줄바꿈만** — `OPTIONAL:envelope`가 cover에선 따로 줄, family에선 `<section>`과 같은 줄. processOptional 정규식은 `[\\s\\S]*?` non-greedy라 줄바꿈 차이는 영향 없음.

### 마커 위치 (cover-08)

```
1219:      <!-- OPTIONAL:groomEnvItem --><details class="env-acc" name="env">
1254:      </details><!-- /OPTIONAL:groomEnvItem -->
1256:      <!-- OPTIONAL:brideEnvItem --><details class="env-acc" name="env">
1291:      </details><!-- /OPTIONAL:brideEnvItem -->
```

family-08과 동일 위치·동일 패턴. **템플릿 자체는 정상.**

---

## 3. hydrate.js 로직 — cover/family 공통

`shared/hydrate.js:247~256` — envelope/groomEnvItem/brideEnvItem 처리는 **famPage 분기 없음**. cover/family 동일 로직.

```js
var gShowItem = !!gAcct.account || gHasPar;
var bShowItem = !!bAcct.account || bHasPar;
html = processOptional(html, 'envelope', gShowItem || bShowItem);
html = processOptional(html, 'groomEnvItem', gShowItem);
html = processOptional(html, 'brideEnvItem', bShowItem);
```

---

## 4. **결론: 템플릿·로직 둘 다 정상.** 다른 원인 추적 필요.

### 가설 A · GAS deployment가 옛 코드 (가장 유력)

cover-08에서만 안 되는 게 아니라, **모든 청첩장에서** 안 될 수 있음. family-08은 우연히 정상으로 보일 수도 (다른 이유).

GAS `guest-letter-webhook.gs`의 `doGet`은 deployment URL을 통해 호출되므로 **재배포 안 했으면 옛 코드** 실행.

**확인 방법:**
```
브라우저에서 직접 호출:
https://script.google.com/macros/s/AKfycbwWuUVCgRRclss-i0gO_RAwyVVtgVh_fPUgYpFg40gFQJlmo4Su4IxGwj3s-qDvrqbAyg/exec?action=getCouple&eventId=jh-km-0625&fresh=1

응답 JSON에서:
- couple.groomAccount 값이 정말 비어있는지
- couple.brideAccount 값이 비어있는지
- couple.groomBank 값이 어떤지
- couple.envelopeShowParents 값이 어떤지
```

### 가설 B · 시트 데이터에 보이지 않는 잔여

시트에서 보기엔 비어있지만 실제 셀에 공백 문자, 옛 문자열, 또는 다른 컬럼이 잘못 매핑된 경우.

**확인 방법:**
- 시트 jh-km-0625 행 → 신랑 계좌·신랑 은행 컬럼 클릭 → 수식 입력줄에서 실제 값 확인

### 가설 C · cover/family 응답이 다른 시트/캐시

`form-to-couple.gs`와 `guest-letter-webhook.gs`가 **다른 Apps Script 프로젝트**라면 시트 참조가 다를 수 있음.

**확인 방법:** GAS 편집기에서 두 파일이 같은 좌측 파일 목록에 있는지.

---

## 5. 권장 진단 순서

### Step 1 · webhook 응답 직접 확인 (가장 빠름)

브라우저 새 탭에 다음 URL 직접 입력:
```
https://script.google.com/macros/s/AKfycbwWuUVCgRRclss-i0gO_RAwyVVtgVh_fPUgYpFg40gFQJlmo4Su4IxGwj3s-qDvrqbAyg/exec?action=getCouple&eventId=jh-km-0625&fresh=1
```

JSON 응답 캡처해서 알려주세요. 특히:
- `groomAccount`, `brideAccount`
- `groomBank`, `brideBank`
- `groomFatherAccount`, `groomMotherAccount`
- `brideFatherAccount`, `brideMotherAccount`
- `envelopeShowParents`

### Step 2 · 응답이 비어있다면 (예상)

cover-08?e=jh-km-0625에서 브라우저 DevTools → Console:
```js
// localStorage 캐시 확인
console.log(localStorage.getItem('me_couple_jh-km-0625'));

// 강제 비우고 새로고침
localStorage.clear();
location.reload();
```

### Step 3 · 응답에 계좌가 있다면

시트 jh-km-0625 행에 실제 값이 있는 것. 시트 직접 점검 필요.

### Step 4 · 응답 비었고 캐시 비었어도 계좌 보이면

hydrate 코드에 디버그 로그 임시 추가 후 재배포. 알려주세요 — 진단 코드 작성해드리겠습니다.

---

## 6. 즉시 점검 가능한 한 가지

webhook 응답이 비어있다는 가정 하에, **localStorage 강제 비우기** 후 다시 시도:

```js
// cover-08 페이지에서 DevTools Console
localStorage.removeItem('me_couple_jh-km-0625');
location.reload();
```

시크릿 모드라면 이미 비어있지만, 만약 일반 모드와 시크릿이 같은 데이터를 공유한다면(예: 동일 도메인 sync) 캐시 잔류 가능성 있음.

---

## 다음 단계

위 Step 1 (webhook 직접 호출 결과)을 알려주시면 정확한 원인 확정해드리겠습니다. 가설 A(재배포 미실시)가 가장 유력해 보입니다.

— Moment Edit
