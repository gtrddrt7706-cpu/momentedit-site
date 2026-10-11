# 출처 — emil-design-eng

- **원천**: https://github.com/emilkowalski/skills (`main` · `skills/emil-design-eng/`)
- **버전**: frontmatter 에 버전이 없다. 설치 잠금 파일의 `skillFolderHash` `51f2537e04d15911b41d78e2de24c36a0e26d41beae15e82a954fe5496a5eda9`
  · `SKILL.md` 가 상류 `main` 과 바이트까지 같다(2026-10-11 대조).
- **라이선스**: MIT (Copyright (c) 2026 Emil Kowalski) — `LICENSE` 는 상류 저장소 루트의 원문이다
  (`raw.githubusercontent.com/emilkowalski/skills/main/LICENSE` · 2026-10-11). 스킬 폴더 안에는 LICENSE 가 없었다.
- **받은 날**: 2026-10-11
- **받은 방법**: `npx -y skills@latest add emilkowalski/skills -g -a claude-code -s emil-design-eng review-animations mobile-native break-ui -y --copy`
  → 전역 `~/.claude/skills/` → 같은 날 저장소로 복사(잠금 파일 기록상 넷이 13:51:21Z 에 함께 들어왔다).
- **바꾼 것**: 없다.

## 이 사이트에서 쓰는 자리 [SKILLS_VENDOR_1011]

**모션 점검 — 속도 · 곡선 · 눌림 · 호버.** 단 **bounce · spring 권고는 버린다**(`momentedit-design` 「절대 하지 말 것」 ·
`../MOMENTEDIT_EXCEPTIONS.md` `[EXC_SPRING]`). 「UI 300ms 아래」 권고는 우리 램프가 이긴다(`[EXC_UNDER_300]`).
점검은 목록만 — 고치기는 사장님 승인 뒤(CLAUDE.md `[DESIGN_RULES_1011]`).

## 받은 판에서 알아 둘 것

- ★부를 때 **대상(파일 · 화면 · 질문)을 함께 넘긴다.** 본문 첫 절 «Initial Response» 가 «질문 없이 불리면 인사 한 줄만 하고 멈춰라»라고 적는다.
- 본문 예시는 React · Framer Motion 전제다. 이 사이트는 빌드 없는 정적 HTML 이다(`[EXC_STATIC_SITE]`).
- 저장소 `skills-lock.json` 에는 넣지 않았다(출처는 이 파일이 맡는다).
