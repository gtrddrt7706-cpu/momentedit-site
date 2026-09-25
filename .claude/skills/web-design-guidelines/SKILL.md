---
name: web-design-guidelines
description: Review UI code for Web Interface Guidelines compliance. Use when asked to "review my UI", "check accessibility", "audit design", "review UX", or "check my site against best practices".
metadata:
  author: vercel
  version: "1.0.0"
  argument-hint: <file-or-pattern>
---

# Web Interface Guidelines

Review files for compliance with Web Interface Guidelines.

## How It Works

1. Fetch the latest guidelines from the source URL below
2. Read the specified files (or prompt user for files/pattern)
3. Check against all rules in the fetched guidelines
4. Output findings in the terse `file:line` format

## Guidelines Source

Fetch fresh guidelines before each review:

```
https://raw.githubusercontent.com/vercel-labs/web-interface-guidelines/main/command.md
```

Use WebFetch to retrieve the latest rules. The fetched content contains all the rules and output format instructions.

## Usage

When a user provides a file or pattern argument:
1. Fetch guidelines from the source URL above
2. Read the specified files
3. Apply all rules from the fetched guidelines
4. Output findings using the format specified in the guidelines

If no files specified, ask the user which files to review.

<!-- ─── 아래는 momentedit-site 에서 덧붙인 것 (원본에 없음) ─── -->

## [WDG_VENDORED] 이 저장소에서는 동봉본을 먼저 읽는다

규칙 본문이 **같은 폴더의 `web-interface-guidelines.md`** 에 있다(2026-09-25 받음 · 190행).
위 «Fetch fresh guidelines» 는 **갱신할 때만** 한다 — 점검은 동봉본으로 돈다.
받아졌고 내용이 바뀌었으면 동봉본을 갈아 끼우고 커밋한다(`SOURCE.md` 날짜도 함께).

**점검 전에 `../MOMENTEDIT_EXCEPTIONS.md` 를 읽는다.** 거기 적힌 규칙은 이 사이트에서 틀린 것이라
지적으로 올리지 않는다. 순서는 `CLAUDE.md` 의 `[DESIGN_SKILLS_12]`.
