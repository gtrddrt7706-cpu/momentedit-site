#!/usr/bin/env python3
"""[COMMENT_SWALLOW 2026-09-25 코워크 추가전달 1-1] 한 줄 안에서 `//` 주석 뒤에 코드 문장이 이어지는 꼴을 찾는다.
그 코드는 실행되지 않는다 — «파일로 저장»(saveScriptTxt)이 #815 부터 먹통이었던 까닭이 이것이었다.
같은 사고가 네 번째다(ritual-chips 한 줄 · advisor-kb 쉼표 · mypage v1.8 라우팅 · 이번).
판정: 주석 부분에 «이름(…); 이름(…);» 이나 document./window. 호출문이 있으면 삼킴으로 본다.
정규식 안의 `\\/\\/`, URL 의 `://` 는 주석이 아니다. 종료 0 없음 · 1 있음."""
import re, io, glob, sys
files = sorted(set(glob.glob('*.html') + glob.glob('assets/*.js') + glob.glob('shared/*.js') + glob.glob('api/*.js')))
def split_comment(line):
    code = ''; i = 0; q = None
    while i < len(line):
        c = line[i]
        if q:
            if c == '\\': i += 2; continue
            if c == q: q = None
            i += 1; continue
        if c in '"\'`': q = c; i += 1; continue
        if line.startswith('//', i) and (i == 0 or line[i-1] not in '\\:'): return code, line[i+2:]
        if line.startswith('/*', i):
            j = line.find('*/', i + 2)
            if j < 0: return code, None
            i = j + 2; continue
        code += c; i += 1
    return code, None
bad = []
for f in files:
    for n, line in enumerate(io.open(f, encoding='utf-8', errors='ignore').read().split('\n'), 1):
        if '//' not in line: continue
        code, com = split_comment(line)
        if com is None or not code.strip(): continue
        # ★[TILE_SWALLOW 2026-09-26 코워크 회신8] 객체 항목도 삼킨다 — 코드 쪽이 `,` `{` `(` 로 끝나고 주석 쪽에 `이름: '…'` · `이름: {` · `이름: [` 가 있으면
        #   (TILE 표의 letter · toast 가 free 줄 뒤 주석에 먹혀 칸 글이 #872~#875 동안 비었다 · 종전 규칙은 «호출문»만 봐서 못 잡았다)
        obj = code.rstrip().endswith((',', '{', '(')) and re.search(r"(^|[\s,{])[A-Za-z_$][\w$]*\s*:\s*['\"{\[]", com)
        if obj or re.search(r";\s*[A-Za-z_$][\w$.]*\([^)]*\)\s*;", com) or re.search(r"\b(document|window)\.[A-Za-z.]+\([^)]*\)\s*;", com):
            bad.append(f"{f}:{n}  {line.strip()[:160]}")
if bad:
    print('❌ [COMMENT_SWALLOW] 줄 끝 // 주석이 코드 문장을 삼켰다(실행 안 됨) — 주석을 /* */ 로 바꾸거나 코드를 다음 줄로:')
    for b in bad: print('   ' + b)
    sys.exit(1)
print(f'[COMMENT_SWALLOW] ok — {len(files)}개 파일 · 삼킨 줄 0')
