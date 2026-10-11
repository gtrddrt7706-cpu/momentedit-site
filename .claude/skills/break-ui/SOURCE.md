# 출처 — break-ui

- **원천**: https://github.com/emilkowalski/skills (`main` · `skills/break-ui/` · `SKILL.md` + `CATALOG.md`)
- **버전**: frontmatter 에 버전이 없다. 설치 잠금 파일의 `skillFolderHash` `60ada67662925f4df5e3c6ff41cac3ab241b66f8898100a5ffcd7ba7196cb868`
  · 두 파일이 상류 `main` 과 바이트까지 같다(2026-10-11 대조).
- **라이선스**: MIT (Copyright (c) 2026 Emil Kowalski) — `LICENSE` 는 상류 저장소 루트의 원문이다
  (`raw.githubusercontent.com/emilkowalski/skills/main/LICENSE` · 2026-10-11). 스킬 폴더 안에는 LICENSE 가 없었다.
- **받은 날**: 2026-10-11
- **받은 방법**: `npx -y skills@latest add emilkowalski/skills -g -a claude-code -s emil-design-eng review-animations mobile-native break-ui -y --copy`
  → 전역 `~/.claude/skills/` → 같은 날 저장소로 복사.
- **바꾼 것**: 없다.

## 이 사이트에서 쓰는 자리 [SKILLS_VENDOR_1011]

**극단 데이터 점검** — 긴 이름 · 끊을 곳 없는 이메일 · 한 글자 이름 · 빈 목록 · 큰 수 · 0과 1.
«Demo data / Worst case» 토글과 가짜 데이터는 **사이트 파일에 넣지 않는다** — 정적 사이트라 dev 전용 자리가 없고
main 병합이 곧 배포다(`../MOMENTEDIT_EXCEPTIONS.md` `[EXC_APPLY_LATER]`). 스크래치패드의 독립 HTML 이나 Playwright 주입으로만 시험한다.
본문의 «dark mode» · RTL 점검은 이 사이트가 지원하지 않아 건너뛴다(`[EXC_NO_DARK]`).

## 받은 판에서 알아 둘 것

- `CATALOG.md` 26행의 «Priya» 예시 값에는 보이지 않는 결합 문자(U+200D)가 들어 있다 — ZWJ 이모지 시퀀스를 시험하려고 일부러 넣은 값이다.
- 본문이 가리키는 `prototype` 스킬은 들이지 않았다 — 이 저장소에 없는 이름이다.
- 저장소 `skills-lock.json` 에는 넣지 않았다(출처는 이 파일이 맡는다).
