#!/usr/bin/env python3
# check-copy 의 «선취» 검사가 읽을 배역 본문 여섯 편을 뽑는다 [BODY_SIX] (2026-09-20)
#
# ★코워크 copycheck 묶음에 본문_여섯편.txt 가 빠져 있었다. README 는 「없어도 돕니다」라 하지만
#   인자로 «주면서 파일이 없으면» FileNotFoundError 로 죽고, selftest-check.py 는 무조건 준다.
#   그래서 코워크가 「10건 중 10건 잡는다」고 한 자가시험이 이쪽에서는 한 건도 못 돌았다.
#   ★손으로 만들지 않는다 — 본문이 바뀌면 이 파일도 같이 바뀌어야 하고, 손 사본은 반드시 낡는다.
#
#   python3 scripts/build-body-six.py > scripts/audit/copycheck/본문_여섯편.txt
import io, re, sys
SRC = 'docs/plans/식순연구/배역_예시_대사.txt'
SIX = ['letter-parent', 'letter-each', 'bless-father', 'bless-mother', 'tribute', 'tribute-reply']
s = io.open(SRC, encoding='utf-8').read()
out = []
for slug in SIX:
    m = re.search(r'^\[(\d+)\] R-' + re.escape(slug) + r'[^\n]*\n(.*?)(?=\n\s*\n|\Z)', s, re.S | re.M)
    if not m:
        sys.stderr.write(f'✗ 원천에서 {slug} 를 못 찾았습니다 — 파일 모양이 바뀌었을 수 있습니다\n')
        sys.exit(1)
    out.append(f'[{m.group(1)}] {slug}')
    out += [l.strip() for l in m.group(2).split('\n') if l.strip()]
    out.append('')
sys.stdout.write('\n'.join(out))
