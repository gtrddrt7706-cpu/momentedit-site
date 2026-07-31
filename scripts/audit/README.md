# 점검 스크립트 (audit)

`/점검` 슬래시 커맨드(`.claude/commands/점검.md`)가 바닥 점검으로 호출하는 자동 스크립트.
컨테이너가 재활용돼도 살아남도록 repo에 둔다(테스트 하네스는 `/tmp`라 휘발).

## gas-lint.mjs
`automation/`의 `.gs`(R3n9Mr 대상)를 node `vm`에 GAS 서비스 목으로 전부 로드해
**재배포 전 로드/구문/전역참조 오류**를 잡는다(실제 시트 없이).

```bash
node scripts/audit/gas-lint.mjs
```
- 별도 프로젝트 파일(`archive/`, `form-to-couple.gs`, `guest-letter-*`, `가족청첩장빌드.gs`)은 `.claspignore`와 동일하게 제외.
- `makeSandbox()` / `loadGas()` export — 특정 함수 동작까지 보려면 import해 sandbox 재사용(시트 시드는 호출 측에서).

## render-check.mjs
1. 대상 HTML의 인라인 `<script>` 구문 검사(`new Function`).
2. puppeteer로 `mypage.html`·`admin.html`을 띄워 `script.google.com`을 목(CORS 헤더 포함)하고 `pageerror`/`console.error` 수집.

```bash
node scripts/audit/render-check.mjs
```
- puppeteer가 없으면 1번만 실행하고 안내 출력(`npm i puppeteer`). `/tmp/dz/node_modules`가 있으면 그것도 자동 탐색.
- 자체적으로 `python3 -m http.server 8111`을 띄우고 끝나면 종료한다.

> 화면 동작(플로우 클릭·텍스트 검증)·퍼즈·계약서 채움 같은 **건별 점검**은 커맨드 프롬프트 지시에 따라 그때그때 puppeteer로 수행한다. 이 스크립트는 매번 동일한 "바닥 점검"만 담당.

## func-check.mjs
실제 클릭·제출로 **기능(폼·버튼·검증) 정상/실패/멱등 경로**를 확인한다.
현재 대상: `inquiry.html` 문의 폼(메인 전환 경로) — 빈 제출 차단 · 유효 제출→이메일확인→POST→성공화면 ·
허니팟 payload 노출 · 비번 불일치·하객 상한 차단 · 전화 자동포맷 · 확인 모달 연타 이중제출 멱등.

```bash
node scripts/audit/func-check.mjs
```
- puppeteer 없으면 통째로 건너뜀(`/tmp/dz/node_modules`도 자동 탐색). `script.google.com`은 목 응답.
- 마이페이지·관리자의 상태별 액션 클릭은 `/tmp/dz` 목 하네스(`mp.js`·`adm.js`)로 그때그때 수행(시트 시드가 필요해 repo 상주 X).

## deliv-matrix.mjs — 결과물 여정 정합 매트릭스 (2026-07-25)
단계(예식완료/촬영완료/결과물전달) × 결과물상태 7종 × 상품 2종 = 32조합을 실제 mypage 렌더로 돌려
진행바(STEP)·NOW·대기 카드 제목의 모순을 검사. 기대값은 DELIV_STEP_HONEST·DELIV_FLOW_STEP·
DELIV_WAIT_TITLE 마커의 합의 동작과 세트 — 그 동작을 바꾸면 이 스크립트도 같은 커밋에서 갱신.
`node scripts/audit/deliv-matrix.mjs`

## _browser.mjs — 감사 공용 브라우저 어댑터 (2026-07-25)
playwright(원격 점검 환경 기본·PLAYWRIGHT_BROWSERS_PATH 자동 탐색) 우선, puppeteer 폴백.
render-check·deliv-matrix가 공용 — 원격 환경에서 렌더 점검이 더는 '건너뜀'으로 빠지지 않는다.

## ritual-order-sim.mjs — 식순 순서 엔진 전수 시뮬레이터 (2026-07-27)
`order-preview.html`의 순서 엔진 선언(`COURSES`·`GADD`·`RANK`·`RANK_OV`·`rankOf`·`isGAdd`·`isOptK`·
`defaultOrd`·`ordNow`·`curSeq`·`OFFTGL`·`momOn`)을 **원문 그대로 잘라 실행**해 5코스 × 순서축 전 부분집합 ×
상태축 곱집합 = **13,632조합**을 돌린다. 손으로 옮겨 적지 않는다.

```bash
node scripts/audit/ritual-order-sim.mjs                    # HEAD 자기검사
node scripts/audit/ritual-order-sim.mjs a.html b.html      # 두 변형 비교(RANK 조정안 검증)
node scripts/audit/ritual-order-sim.mjs --legacy a.html b.html   # 2026-07-27판 1664조합 축으로 대조
```
- **★축2는 끄기 축이 아니라 상태 축이다 (2026-07-28에 고침).** 초판(2026-07-27)은 축2를 **끄는 방향으로만**
  훑었다. 기본값이 `valley:'none'`이고 off 분기도 `'none'`이라 켜는 경로가 팔레트뿐이었고 거기선 항상
  `'wine'`이었다 → 1664조합 중 `S.valley==='cake'`가 **0개**, 담백처럼 `valley`가 seq 붙박이인 코스는
  **밸리를 켠 조합이 0개**. `S.toast`는 아예 설정되지 않아 전 조합 `undefined`였다.
  그래서 `order-preview.html`이 주석으로 **명시 금지한** 담백 seq 역전(밸리를 편지 뒤로)이 시뮬레이터·감사·
  `chk` 마커 셋 다 초록으로 통과했다. 지금은 `STATES`(`ring`·`bless`·`veil`·`valley`·`toast`)의 곱집합을 돈다.
  값 목록은 전부 실측이다(`momOn` 1087행 · 검증 분기 1724행 · `quickOff` 1096~1097행 · pick 카드 1350~1352·1380행).
- **구판 1664조합은 확장판 안에 순서 그대로 들어 있다** — 자기검사 `[8]`이 매번 실측한다. 확장은 덮어쓰기가
  아니라 추가다. 이전 문서(회신9~13)가 인용한 수(1112·896·160·77.8% …)는 `--legacy`로 그대로 재현된다.
- **지표 이름을 갈랐다.** 구 `cakeAdjacent()`는 `S.valley`도 `S.toast`도 안 보고 순서 인접만 셌다.
  → `valleyToastAdjacent()`(순서 지표) · `cakeDup()`(`_cakeDup()` 등가 내용 지표)로 분리했다.
  회신9~13의 "케이크 인접 160/16"은 전부 **밸리·축배 인접**을 가리키고, 그 조합은 전부 `wine`이었다.
- **★식순은 2축이다.** 축1 = `curSeq()`(seq + opt 제자리 삽입 + 팔레트) · 축2 = `OFFTGL`+`momOn()`으로
  `BLOCK[k]()`가 `null`. `curSeq()`만 보면 **꺼진 순간이 배열에 그대로 남아** 거짓 결론이 나온다
  (담백의 `valley`·`bless`는 seq 붙박이라 `isOptK`=false → 축1에서 절대 안 걸러진다). 실사고 1건.
- 자기검사가 보는 것: 구조 무결성(중복 순간·빈 순서·축2 누수·`RANK` 미등재 키) · 5코스 기본 상태 ·
  §4-4 위반(이완이 정점보다 뒤) · 밸리·축배 인접 · 케이크 중복(`_cakeDup` 발화 자리) · 덕담↔서약 역전 ·
  정점 후반 배치율 · 구판 포함 관계. 가운데 다섯은 **경고성 지표**라 0이 아니어도 실패로 보지 않는다(안끼리 비교용).
- 엔진 심볼 이름이 바뀌면 조용히 통과하지 않고 **예외로 죽는다**(없음·중복 둘 다 에러). 리팩터링하면
  스크립트 상단 `DECLS` 목록을 같은 커밋에서 갱신할 것 — 마커 `RITUAL_ORDER_SIM`.

## ritual-order-sim-audit.mjs — 시뮬레이터 자체 감사 (2026-07-27)
`ritual-order-sim.mjs`가 **엉뚱한 문자열을 실행 중이어도 출력은 그럴듯하게 나온다.**
그래서 잘라내기 스캐너 자체를 다섯 갈래로 감사한다 — 마커 `RITUAL_ORDER_SIM_AUDIT`.

```bash
node scripts/audit/ritual-order-sim-audit.mjs                 # HEAD의 order-preview.html
node scripts/audit/ritual-order-sim-audit.mjs /tmp/BR.html    # 다른 변형 파일
```
- **[1] 커버리지** — 잘라낸 조각이 원문과 문자단위 동일한가 · 조각끼리 겹치지 않는가 · 빠뜨린 선언이 없는가.
- **[2] 경계** — 구조가 반대인 두 번째 토크나이저(마스킹 후 계수)가 같은 끝 지점을 짚는가.
  ★마스킹은 **선언 시작점부터** 건다. HTML 전체를 마스킹하면 본문 아포스트로피 하나가 가짜 문자열을 열어
  상태가 오염된다(초안에서 실제로 7건 오탐). 꼬리 공백은 비교 전에 떼고 본다(`s.core`).
- **[3] 자유변수** — `vm` 격리 컨텍스트 + 카나리아 21종(`process`·`document`·`window`…)으로
  엔진이 `S` 밖 전역을 몰래 읽지 않는지 본다. 격리 실행 전 조합이 일반 실행과 전건 일치해야 통과.
  ★S를 키 문자열에서 재구성하던 코드는 2026-07-28에 `states` 스냅샷 사용으로 바꿨다. 그건 `enumerate()`의
  복제본이라 열거가 바뀌면 조용히 어긋나는 자리였고, 여기서 볼 것은 열거가 아니라 **엔진의 자유변수**다.
- **[4] 변이 검출** — 엔진을 건드리면 반드시 티가 나고(양성), 엔진 밖을 건드리면 반드시 조용해야(음성) 한다.
  변이 지점은 하드코딩이 아니라 **파싱한 `RANK`에서 런타임 유도** — main과 브랜치의 `RANK`가 달라서다.
  ★양성 하나는 **사각지대 회귀 가드**다: `COURSES`의 seq에서 **밸리만** 자리를 옮긴다. 구판(끄기 축)에선
  이게 0조합이었다. 여기가 다시 0조합이 되면 축2가 끄기 축으로 되돌아간 것이다.
  ★음성 대조에 "아무 순위도 넘지 않는 값 변경"(예: `veil 5→4`)을 넣는다. **`RANK`는 서수다** —
  `defaultOrd()`는 값 자체가 아니라 `RANK[x] > gr` 비교만 하므로, 아무도 넘지 않는 변경이 0조합인 것이 정상이다.
- **[5] 축2 누수** — `inSeq('<OFFTGL 키>')` 호출부에 같은 줄·다음 줄에서 `S.<키>` 값 확인이 붙어 있는지 자동 검사.
  `inSeq()`는 축1(`curSeq()`)만 보므로 꺼진 순간이 배열에 남는다. 현재 6곳 전부 안전.
