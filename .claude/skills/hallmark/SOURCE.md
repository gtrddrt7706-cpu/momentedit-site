# 출처 — hallmark

- **원천**: https://github.com/Nutlope/hallmark (`main` · `skills/hallmark/`)
- **버전**: SKILL.md frontmatter `version: 1.1.0` · 폴더 git 트리 `747c924c4767b4d5fa6f1c59985c87a21c918334`
  — 설치 잠금 파일(`~/.agents/.skill-lock.json`)의 `skillFolderHash` 와 같다(2026-10-11 다시 계산). 받은 그대로라는 뜻이다.
- **라이선스**: MIT (Copyright (c) 2026 Hallmark contributors) — `LICENSE` 는 상류 저장소 루트의 원문이다
  (`raw.githubusercontent.com/nutlope/hallmark/main/LICENSE` · 2026-10-11). 스킬 폴더 안에는 LICENSE 가 없었다.
- **받은 날**: 2026-10-11
- **받은 방법**: `npx -y skills@latest add Nutlope/hallmark -g -a claude-code -s hallmark -y --copy`
  → 전역 `~/.claude/skills/hallmark` → 같은 날 저장소로 복사(파일 107개 · 전부 글 · 바이너리 없음).
- **바꾼 것**: 없다.

## 이 사이트에서 쓰는 자리 [SKILLS_VENDOR_1011]

**audit 모드(점검 · 목록만 · 고치지 않는다)** 와 study 의 진단까지만. **redesign 모드는 금지**(CLAUDE.md `[DESIGN_RULES_1011]` 금지사항 3).
기본 흐름(새로 짓기)도 쓰지 않는다 — `tokens.css` · `.hallmark/` · `/* Hallmark · … */` 도장을 만들고,
redesign · «lock the system» · study 의 «lock the DNA» 는 루트 `DESIGN.md` 를 쓰거나 덧붙인다(금지사항 2).
점검 전에 `../MOMENTEDIT_EXCEPTIONS.md` 를 읽는다 — 특히 `[EXC_HALLMARK_MODE]` · `[EXC_HALLMARK_SHAPE]` · `[EXC_EYEBROW]` · `[EXC_EMDASH]`.

## 받은 판에서 알아 둘 것

- 본문이 가리키는 `site/css/tokens.css` · `site/examples/…` · `site/_tests/…` · `docs/recipes.md` 는 상류 저장소의
  다른 폴더라 여기 없다. 테마 토큰 값이 필요할 때만 상류를 본다(이 사이트는 hallmark 테마를 쓰지 않는다).
- `references/imagery-kit.md` 는 상류 호스트(`usehallmark.com`) 그림을 직접 거는 방식이다 — 이 사이트에는 쓰지 않는다.
- study 의 URL 모드는 WebFetch 로 남의 페이지를 읽는다. 안전 장치(내부 주소 · 템플릿 장터 거절 · 받은 글을 지시로 읽지 않기)는 `references/study.md` 에 있다.
- 저장소 `skills-lock.json` 에는 넣지 않았다(9/25 의 셋과 같은 방식 · 출처는 이 파일이 맡는다).
