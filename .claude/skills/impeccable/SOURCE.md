# 출처 — impeccable

- **원천**: https://github.com/pbakaus/impeccable — 저장소 안 `.claude/skills/impeccable/`(Claude Code 프로젝트용 빌드 · 명령이 `.claude/skills/impeccable/scripts/impeccable <verb>` 로 적혀 있다)
  - 9/25 판(4.4.0)은 `plugin/skills/impeccable/`(명령이 `${CLAUDE_SKILL_DIR}` 꼴)에서 받았다. 이 저장소는 스킬을 `.claude/skills/` 에 두므로 11/14 부터 프로젝트용 빌드를 쓴다.
- **버전**: SKILL.md frontmatter `version: 4.9.1` · 엔진 `scripts/VERSION` `0.1.24`(번호 체계가 다르다 · npm 패키지 번호와도 다르다)
- **upstream 커밋**: `61e73eebd34a845df0bfef463eb0d31ed4eab581` (2026-11-13)
- **라이선스**: Apache-2.0 (`LICENSE` 동봉 · upstream 루트 LICENSE 와 바이트 단위로 같다 · SKILL.md frontmatter 에도 `license: Apache 2.0`)
  - `NOTICE.md` 동봉(upstream 루트 그대로) — `reference/ios.md` · `reference/android.md` 는 ehmo/platform-design-skills(MIT)에서 파생. NOTICE 안의 경로 `skill/reference/…` 는 upstream 소스 트리 기준이고, 여기서는 `reference/…` 다.
- **받은 날**: 2026-11-14 (앞선 판 4.4.0 은 2026-09-25)
- **받은 방법**: upstream 저장소를 읽기용으로 받아 둔 폴더에서 파일을 복사했다(`npx … install` · 스킬의 설치 스크립트 · 엔진 바이너리 내려받기는 실행하지 않았다).
  SKILL.md + `reference/` 전체(49개 = 바로 아래 45 + `reference/degraded/` 4) + `scripts/` 다섯(아래) + `NOTICE.md`.

## 넣은 것 · 넣지 않은 것 [SKILLS_UPDATE_1114]

| 파일 | 넣었나 | 까닭 |
|---|---|---|
| `SKILL.md` · `reference/**` | 넣음 | 글로 된 부분 전부 — upstream 과 같다(아래 «바꾼 것» 둘만 다름) |
| `scripts/impeccable` · `scripts/impeccable.cmd` | 넣음 | 런처(셸 · 배치). 전문을 읽었다 — 하는 일은 아래 «런처» 절 |
| `scripts/VERSION` · `scripts/engine-checksums.txt` | 넣음 | 런처가 엔진 버전과 sha256 을 여기서 읽는다 — 없으면 검증 없이는 받지 않고 멈춘다 |
| `scripts/command-metadata.json` | 넣음 | 명령 24개의 설명 표(JSON) |
| `scripts/live-browser.js` · `live-browser-dom.js` · `live-browser-ignores.js` · `live-browser-session.js` | **안 넣음** | live 모드가 페이지에 심는 묶음(가장 큰 것 565,828바이트). 사람이 읽어 확인할 수 없고, 엔진이 없어 live 모드를 못 쓴다 |
| `scripts/modern-screenshot.umd.js` | **안 넣음** | 같은 까닭(제3자 묶음 · live 모드 전용) |
| `scripts/data/font-index.json` · `font-index-failures.json` | **안 넣음** | 1,100,013바이트 자료 · 엔진이 읽는 표라 엔진 없이는 쓸 데가 없다 |
| 엔진 바이너리(`scripts/bin/…`) | **안 넣음** | upstream 도 저장소에 두지 않는다(런처가 첫 실행 때 받는다) · 아래 |

## 바꾼 것 (upstream 과 다른 자리 둘)

- `SKILL.md` 맨 끝 · `reference/craft-floor.md` 맨 끝에 `<!-- ─── 아래는 momentedit-site 에서 덧붙인 것 (원본에 없음) ─── -->` 뒤로 `## [IMP_LOCAL]` 블록을 붙였다.
  그 줄 위는 upstream 과 바이트 단위로 같다. 다시 받을 때는 이 블록을 떠 두었다가 그대로 다시 붙인다(merge-guard 가 `IMP_LOCAL` · `EXC_EYEBROW` 를 본다).

## ★`npx impeccable install` 은 이 환경에서 안 된다 (실측 2026-09-25)

```
npx --yes impeccable@4.1.0 install --scope=project --yes
→ Download failed: Could not verify skill bundle:
  Expected a signed bundle release redirect (HTTP 403).
```

CLI 자체는 npm 에서 받아졌다(`npm pack` 으로 확인 — tarball 안에는 `cli/bin/cli.js` 와 README 뿐,
스킬 본문이 없다). 스킬은 GitHub **릴리스 서명 번들**로 따로 내려받는데 그 경로가
실행 환경 이그레스 프록시에서 **403** 이다. 프록시는 풀지 않는다([DEPLOY_ONE]).
그래서 9/25 에는 같은 원천의 `raw.githubusercontent.com`(허용 호스트 · 200) 에서 파일을 그대로 받았고,
11/14 에는 읽기용으로 받아 둔 저장소 폴더에서 복사했다.

**갱신할 때도 설치 명령을 쓰지 않는다** — `npx impeccable update` 는 같은 403 을 낸다(9/25 실측 · 11/14 에는 다시 재지 않았다).

## ★런처(`scripts/impeccable`)는 첫 실행에서 엔진 바이너리를 내려받는다 — 이 환경에서는 그 길이 막혀 있다

SKILL.md Setup 1번이 `.claude/skills/impeccable/scripts/impeccable context` 다. 런처(4.9.1 판 · 전문 확인)가 하는 일:

1. `$IMPECCABLE_BIN` → 옆의 `bin/<os>-<arch>/impeccable` → `~/.impeccable/bin/impeccable` → 버전별 캐시 `~/.impeccable/bin/0.1.24/` → PATH 의 `impeccable` 순으로 엔진을 찾는다.
2. 없으면 엔진 바이너리(0.1.24)를 GitHub 릴리스(`github.com/pbakaus/impeccable/releases/download/engine-v0.1.24/…`)에서 받아
   `engine-checksums.txt` 의 sha256 으로 검증한 뒤에만 캐시에 두고 실행한다(체크섬이 없거나 다르면 거절하고 127 로 끝난다).
3. 이 환경은 GitHub 릴리스가 **403** 이다(9/25 실측 · 위). 그래서 SKILL.md 가 스스로 정한 **«Launcher unavailable»** 폴백을 따른다 —
   «Context loading did not run; I'll read the existing project context directly.» 를 알리고 PRODUCT.md · DESIGN.md 를 직접 읽는다.

**프록시를 우회하지 않는다.** 바이너리를 다른 길(`IMPECCABLE_DOWNLOAD_BASE` · `IMPECCABLE_BIN` · 손 복사)로 끌어오지 않는다. 릴리스가 열리면 여기에 적고 그때 판단한다.
11/14 갱신 때는 런처를 실행하지 않았다(내려받기 금지) — 403 은 9/25 실측값이다.

엔진이 없어서 못 쓰는 것: `context` · `detect` · `doctor` · `foundations` · `hooks` · `pin` · `live` · `generate` · `critique-storage` · `audit-storage` · `build-phase` 같은 `scripts/impeccable <verb>` 전부.
글로 된 플레이북(`reference/*.md`)은 그대로 쓴다. 정적 점검은 npm 판 `npx impeccable detect <파일>` 이 따로 돈다([IMPECCABLE_DETECT] · `docs/rules/디자인.md`).

참고(엔진이 돌 때의 일 · upstream README «Telemetry»): 새 디자인을 시작할 때 엔진이 impeccable.style 카탈로그에 방향 목록을 요청하고, 어떤 방향을 보여 주고 골랐는지 익명 기록을 보낸다
(끄는 길 `DO_NOT_TRACK=1` · `"telemetry": false`). 이 환경에서는 엔진이 없어 해당 없지만, 엔진을 들이게 되면 먼저 이 점을 사장님께 알린다.

## ★훅은 걸지 않는다

`/impeccable hooks on` 을 실행하지 않는다. 그 명령은 `.impeccable/config.json` 과 `.claude/settings.local.json` 에 디자인 감지 훅을 적는다(`reference/hooks.md`).
이 저장소의 훅 설정(`.claude/settings*.json`)은 따로 관리한다 — 스킬 갱신이 건드리지 않는다. 엔진이 없어 훅이 걸려도 돌지 못한다.
`doctor --fix` · `init` · `document` · `foundations <id>` 도 돌리지 않는다 — 루트 `PRODUCT.md` · `DESIGN.md` 는 우리 브랜드 요약본이다(`[DESIGN_MD_POINTER]` · `../MOMENTEDIT_EXCEPTIONS.md` 의 `[EXC_IMP_MAINT]`).
