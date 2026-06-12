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
