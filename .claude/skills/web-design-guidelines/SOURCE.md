# 출처 — web-design-guidelines

- **원천**: https://github.com/vercel-labs/agent-skills (`main` · `skills/web-design-guidelines/SKILL.md`)
- **버전**: frontmatter `version: "1.0.0"` · author `vercel`
- **라이선스**: MIT (Copyright (c) 2025 Vercel Labs) — `LICENSE` 는
  규칙 본문 저장소 https://github.com/vercel-labs/web-interface-guidelines 에서 받았다.
  `agent-skills` 저장소 루트에는 LICENSE 파일이 없었다(실측 404).
- **받은 날**: 2026-09-25

## ★규칙 본문을 «동봉»했다 (기술 판단 · 코드 결정)

원본 SKILL.md 는 점검할 때마다 WebFetch 로
`raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md` 를
**새로 받아 오라**고 적는다. 그 방식을 그대로 두면 점검 결과가
«그날 프록시가 열렸는지»에 따라 달라진다 — 게이트에 걸 수 없는 검사가 된다.

그래서 그 파일을 `web-interface-guidelines.md`(190행) 로 동봉하고,
SKILL.md 에 `[WDG_VENDORED]` 블록을 덧붙여 **동봉본을 먼저 읽게** 했다.
새로 받아 오는 길은 «갱신»으로 남겼다 — 받아졌으면 동봉본을 갱신하고 커밋한다.
