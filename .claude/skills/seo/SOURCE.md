# 출처 — seo

- **원천**: https://github.com/addyosmani/web-quality-skills (`skills/seo/`)
- **upstream 커밋**: `afa8da942115f2961fdbfa80807ea0b232ff6c00` (2026-08-24)
- **버전**: SKILL.md frontmatter `metadata.version: "2.0"`
- **라이선스**: MIT (`LICENSE` 동봉 — upstream 루트 LICENSE 를 그대로 복사 · Copyright (c) 2026 Addy Osmani)
- **받은 날**: 2026-11-14 · `[SKILLS_UPDATE_1114]`
- **받은 방법**: upstream 저장소를 읽기용으로 받아 둔 폴더에서 이 폴더만 복사했다(`npx … add` · 설치 스크립트는 실행하지 않았다).
- **쓰는 때**: 기술 SEO 점검 목록(구글 기준) — 점검용. 순서는 `docs/rules/디자인.md` 의 `[SKILLS_UPDATE_1114]`.

## 넣은 것 · 넣지 않은 것

- 넣은 것: `SKILL.md` · `references/STRUCTURED-DATA.md` + `LICENSE` · 이 파일.
- 넣지 않은 것: upstream 루트의 `.agents/` · `.claude-plugin/` · `.gemini/` · `codex/` · `gemini-extension.json` · `AGENTS.md` · `CLAUDE.md` · `README.md` · `CHANGELOG.md` · `docs/`
  (다른 도구용 설정 · 설치 안내라 이 저장소에 쓸 데가 없다 · 훅은 넣지 않았다).

## 바꾼 것

- `SKILL.md` 맨 끝에 `<!-- ─── 아래는 momentedit-site 에서 덧붙인 것 (원본에 없음) ─── -->` 뒤로 `## [WQ_LOCAL] 이 저장소에서는` 블록을 붙였다. 그 줄 위는 upstream 과 바이트 단위로 같다.
  다시 받을 때는 이 블록을 다시 붙인다(merge-guard 가 `WQ_LOCAL` 을 본다).

## 이 스킬이 권하는 도구 — 여기서는

- 본문은 Lighthouse · Chrome DevTools MCP · `npx lighthouse` 같은 바깥 도구를 쓰라고 한다. 이 저장소 갱신은 그 도구를 설치하지 않았다 —
  도구가 없을 때는 소스와 렌더 화면을 직접 읽어 점검한다. 전역 설치(`npm install -g …`)는 사장님께 먼저 묻는다.
