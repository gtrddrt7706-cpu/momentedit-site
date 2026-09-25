# 출처 — impeccable

- **원천**: https://github.com/pbakaus/impeccable (`main` · `plugin/skills/impeccable/`)
- **버전**: SKILL.md frontmatter `version: 4.4.0` (npm 패키지 `impeccable@4.1.0` 과 번호 체계가 다르다)
- **라이선스**: Apache-2.0 (`LICENSE` 동봉 · SKILL.md frontmatter 에도 `license: Apache 2.0`)
- **받은 날**: 2026-09-25
- **받은 방법**: `raw.githubusercontent.com` 에서 SKILL.md + `reference/*.md` 33개 + `scripts/impeccable{,.cmd}` 런처

## ★`npx impeccable install` 은 이 환경에서 안 된다 (실측 2026-09-25)

```
npx --yes impeccable@4.1.0 install --scope=project --yes
→ Download failed: Could not verify skill bundle:
  Expected a signed bundle release redirect (HTTP 403).
```

CLI 자체는 npm 에서 받아졌다(`npm pack` 으로 확인 — tarball 안에는 `cli/bin/cli.js` 와 README 뿐,
스킬 본문이 없다). 스킬은 GitHub **릴리스 서명 번들**로 따로 내려받는데 그 경로가
실행 환경 이그레스 프록시에서 **403** 이다. 프록시는 풀지 않는다([DEPLOY_ONE]).
그래서 같은 원천의 `raw.githubusercontent.com`(허용 호스트 · 200) 에서 파일을 그대로 받았다.

**갱신할 때도 같은 길로 간다** — `npx impeccable update` 는 같은 403 을 낸다.

## ★런처(`scripts/impeccable`)는 첫 실행에서 바이너리를 내려받는다 — 그 길도 막힐 수 있다

SKILL.md 1번 단계가 `"${CLAUDE_SKILL_DIR}/scripts/impeccable" context` 다.
그 런처는 자체 바이너리를 `~/.impeccable/bin/` 에 **첫 실행 때 내려받는다.**
막히면 SKILL.md 가 스스로 정한 폴백이 있다(23행) — «Context loading did not run;
I'll read the existing project context directly.» 를 알리고 PRODUCT.md·DESIGN.md 를 직접 읽는다.
**그 폴백을 따른다.** 프록시를 우회해 바이너리를 끌어오지 않는다.
