# 출처 — review-animations

- **원천**: https://github.com/emilkowalski/skills (`main` · `skills/review-animations/` · `SKILL.md` + `STANDARDS.md`)
- **버전**: frontmatter 에 버전이 없다. 설치 잠금 파일의 `skillFolderHash` `b4e5f0f4fe3e2743c85bf7354108f48a0b9d502cb20ef5c4a9c195da91f93736`
  · 받은 두 파일이 상류 `main` 과 바이트까지 같았다(2026-10-11 대조 · 아래 한 줄을 빼기 전).
- **라이선스**: MIT (Copyright (c) 2026 Emil Kowalski) — `LICENSE` 는 상류 저장소 루트의 원문이다
  (`raw.githubusercontent.com/emilkowalski/skills/main/LICENSE` · 2026-10-11). 스킬 폴더 안에는 LICENSE 가 없었다.
- **받은 날**: 2026-10-11
- **받은 방법**: `npx -y skills@latest add emilkowalski/skills -g -a claude-code -s emil-design-eng review-animations mobile-native break-ui -y --copy`
  → 전역 `~/.claude/skills/` → 같은 날 저장소로 복사.
- **바꾼 것**: `SKILL.md` frontmatter 의 `disable-model-invocation: true` 한 줄을 뺐다 — 2026-10-11 사장님 «필요하면 알아서 사용».
  그 한 줄이 있으면 모델이 스스로 부르지 못하고 사람이 이름으로 불러야만 뜬다. 본문을 읽어 보니 하는 일은
  «점검 표 + 판정(Block / Approve)» 뿐이고 배포 · 삭제 · 푸시 · 파일 수정 지시가 없다 — 알아서 불러도 위험한 동작이 없다.
  ★다시 받으면(`npx skills add` 등으로 덮어쓰면) 이 한 줄이 되살아난다 — 그때 다시 뺀다. 나머지는 받은 그대로다.

## 이 사이트에서 쓰는 자리 [SKILLS_VENDOR_1011]

**모션 점검 — 속도 · 곡선 · 끊김 · 접근성.** 단 **bounce · spring 권고는 버린다**(`../MOMENTEDIT_EXCEPTIONS.md` `[EXC_SPRING]`) ·
「UI 300ms 아래」는 우리 램프가 이긴다(`[EXC_UNDER_300]`). 판정 «Block» 은 점검표의 영향도로 옮겨 적고, 고치기는 사장님 승인 뒤(CLAUDE.md `[DESIGN_RULES_1011]`).

## 받은 판에서 알아 둘 것

- ★부를 때 **대상(파일 · 화면 · 질문)을 함께 넘긴다.** «Initial Response» 절이 «질문 없이 불리면 인사 한 줄만 하고 멈춰라»라고 적는다.
- 저장소 `skills-lock.json` 에는 넣지 않았다 — 넣으면 복원 명령이 위의 한 줄을 되살린다.
