# 출처 — web-quality-audit

- **원천**: https://github.com/addyosmani/web-quality-skills (`skills/web-quality-audit/`)
- **upstream 커밋**: `afa8da942115f2961fdbfa80807ea0b232ff6c00` (2026-08-24)
- **버전**: SKILL.md frontmatter `metadata.version: "2.0"`
- **라이선스**: MIT (`LICENSE` 동봉 — upstream 루트 LICENSE 를 그대로 복사 · Copyright (c) 2026 Addy Osmani)
- **받은 날**: 2026-11-14 · `[SKILLS_UPDATE_1114]`
- **받은 방법**: upstream 저장소를 읽기용으로 받아 둔 폴더에서 이 폴더만 복사했다(`npx … add` · 설치 스크립트는 실행하지 않았다).
- **쓰는 때**: 다섯 갈래를 묶은 종합 점검 — 점검용. 순서는 `docs/rules/디자인.md` 의 `[SKILLS_UPDATE_1114]`.

## 넣은 것 · 넣지 않은 것

- 넣은 것: `SKILL.md` · `scripts/analyze.sh` + `LICENSE` · 이 파일.
- 넣지 않은 것: upstream 루트의 `.agents/` · `.claude-plugin/` · `.gemini/` · `codex/` · `gemini-extension.json` · `AGENTS.md` · `CLAUDE.md` · `README.md` · `CHANGELOG.md` · `docs/`
  (다른 도구용 설정 · 설치 안내라 이 저장소에 쓸 데가 없다 · 훅은 넣지 않았다).

## 바꾼 것

- `SKILL.md` 맨 끝에 `<!-- ─── 아래는 momentedit-site 에서 덧붙인 것 (원본에 없음) ─── -->` 뒤로 `## [WQ_LOCAL] 이 저장소에서는` 블록을 붙였다. 그 줄 위는 upstream 과 바이트 단위로 같다.
  다시 받을 때는 이 블록을 다시 붙인다(merge-guard 가 `WQ_LOCAL` 을 본다).

## `scripts/analyze.sh` 를 넣은 까닭 (전문을 읽고 확인 · 2026-11-14)

- 읽기 전용 HTML 분석기다 — `grep` · `find` · `jq` 만 쓴다. 파일을 쓰거나 지우는 명령(`>` 파일 · `rm` · `mv` · `cp` · `tee` · `sed -i`)이 없고, 네트워크 명령(`curl` · `wget` · `nc`)도 없다.
- 표준 출력에 JSON(issues · warnings), 표준 오류에 진행 글만 낸다. 보는 것: doctype · charset · viewport · `<html lang>` · `<title>` · alt 없는 `<img>` · `http://` 주소.
- `jq` 가 없으면 «missing_dependency» JSON 을 내고 끝난다(설치하라는 안내 글뿐 · 스스로 설치하지 않는다).
- 실행 권한(100755)은 upstream 과 같다.

## 이 스킬이 권하는 도구 — 여기서는

- 본문은 Lighthouse · Chrome DevTools MCP · `npx lighthouse` 같은 바깥 도구를 쓰라고 한다. 이 저장소 갱신은 그 도구를 설치하지 않았다 —
  도구가 없을 때는 소스와 렌더 화면을 직접 읽어 점검한다. 전역 설치(`npm install -g …`)는 사장님께 먼저 묻는다.
