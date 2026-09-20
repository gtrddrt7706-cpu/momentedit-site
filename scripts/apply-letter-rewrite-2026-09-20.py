#!/usr/bin/env python3
# 코워크 재작성본 여섯 편을 원천에 넣는다 [LETTER_REWRITE2] (2026-09-20)
#
# ★회신문에서 «직접» 뽑는다. 내가 옮겨 적지 않는다 — 옮겨 적으면 그 자리에서 뜻이 바뀐다
#   (실청 원문을 요약해 옮겼다가 없는 모순을 만든 적이 있다 · [NOT_THE_SOURCE]).
#
#   python3 scripts/apply-letter-rewrite-2026-09-20.py <회신문.txt> [--write]
import io, re, sys, os

SRC = 'docs/plans/식순연구/배역_예시_대사.txt'
reply = sys.argv[1]
WRITE = '--write' in sys.argv
raw = io.open(reply, encoding='utf-8').read()

# 1절의 여섯 블록을 뽑는다 — 「[NN] R-<slug> · …」 머리 뒤 빈 줄까지
blocks = {}
for m in re.finditer(r'^\[(\d+)\] R-([\w-]+)[^\n]*\n(.*?)(?=\n\s*\n|\Z)', raw, re.S | re.M):
    no, slug, body = m.group(1), m.group(2), m.group(3)
    lines = [l.strip() for l in body.split('\n') if l.strip()]
    if lines: blocks[slug] = (no, lines)

SIX = ['letter-parent', 'letter-each', 'bless-father', 'bless-mother', 'tribute', 'tribute-reply']
miss = [s for s in SIX if s not in blocks]
if miss:
    print(f'✗ 회신문에서 못 읽은 묶음: {miss}'); sys.exit(1)

src = io.open(SRC, encoding='utf-8').read()
out, changed = src, []
for slug in SIX:
    no, lines = blocks[slug]
    # 원천의 그 블록을 통째로 갈아 끼운다
    pat = re.compile(r'(^\[' + re.escape(no) + r'\] R-' + re.escape(slug) + r'[^\n]*\n)(.*?)(?=\n\s*\n|\Z)', re.S | re.M)
    mm = pat.search(out)
    if not mm:
        print(f'✗ 원천에서 [{no}] R-{slug} 블록을 못 찾았습니다'); sys.exit(1)
    old = [l.strip() for l in mm.group(2).split('\n') if l.strip()]
    out = out[:mm.start(2)] + '\n'.join(lines) + out[mm.end(2):]
    changed.append((no, slug, len(old), len(lines)))

print(f'{"묶음":<16}{"전":>4}{"후":>4}')
for no, slug, a, b in changed:
    print(f'{no}_{slug:<13}{a:>4}{b:>4}')
print(f'\n합 {sum(a for _,_,a,_ in changed)} → {sum(b for _,_,_,b in changed)}문장')

if WRITE:
    io.open(SRC, 'w', encoding='utf-8').write(out)
    print(f'\n→ {SRC} 에 반영했습니다.')
else:
    dst = os.environ.get('DRY_OUT')
    if dst:
        io.open(dst, 'w', encoding='utf-8').write(out); print(f'\n→ (드라이런) {dst}')
    else:
        print('\n(드라이런 · 반영하려면 --write)')
