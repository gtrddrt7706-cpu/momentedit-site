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
