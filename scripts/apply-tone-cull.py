#!/usr/bin/env python3
# 어조 열넷을 버린다 [TONE_CULL] (2026-09-20 사장님 「겹치거나 별로인 거 전부 삭제해 과감하게 갯수 상관없이」)
#
# ★코워크가 50벌을 **문면으로** 읽어 골랐다. 숫자로 고른 것은 하나도 없다.
#   지울 열넷 가운데 **열둘이 `plain`** 인데, 그게 우연이 아니라는 것이 이 작업의 핵심 발견이다 —
#   `plain` 이 «어조»가 아니라 «짧은 판»이 되어 있었다. 어조는 «같은 일을 다른 태도로 말하는 것»인데
#   지금 담백판은 대부분 «현행을 줄였거나, 같은 틀에 낱말만 갈아 끼운 것»이다.
#
# ★★[CULL_ORDER] 코워크는 「어조표의 옛 문안을 **지우기 전에** 고치라」고 했다(녹음을 두 번 하지 않으려고).
#   그 취지는 맞는데 순서는 뒤집는다 — **지울 열넷 안에 그 옛 문안이 둘 들어 있다**
#   (`toast·plain` 의 「하고 선창하면」 · `toast·both·plain`). 버릴 것을 고치는 것이야말로 두 번 일이다.
#   지우고 **남은 것만** 고친다.
#
# ★원천은 `docs/plans/대본개정/21_B_제안.md` §3 이고 `ritual-data.js` 의 TONE 은 생성물이다.
#   블록을 지우면 그 칸이 비고, 빈 칸은 생성기가 «현행»으로 읽는다(build-tone-table.mjs 머리글).
import io, re, sys, subprocess

WRITE = '--write' in sys.argv
SRC = 'docs/plans/대본개정/21_B_제안.md'
GROUPS = {'3-1': ('entry', ['A','B','C','D','E','F']), '3-2': ('declare', ['1','2','family']),
          '3-3': ('letter', ['parent','each','both']), '3-4': ('tribute', ['flower','bow','hug']),
          '3-5': ('toast', ['toast','cake','both'])}
TONE = {'담백': 'plain', '서정': 'lyric', '다정': 'warm'}
RTONE = {v: k for k, v in TONE.items()}

# ★코워크 판정 — 근거는 지시문_추리기 회신 §4-4 에 문면으로 적혀 있다. 여기엔 한 줄 요약만 둔다.
CULL = [
 ('entry','A','plain','현행의 요약이다. 현행 「그 두 길이 지금 여기서 하나가 됩니다」에는 그림이 있고 「만납니다」에는 없다'),
 ('entry','B','warm','「이 순간을 위해 모이셨습니다」가 현행 「기다리던 순간입니다」와 같은 말이다. 더한 것은 「시작하겠습니다」 한 마디뿐'),
 ('entry','C','plain','★겹쳐서가 아니라 «별로»라서 — 「오늘의 주인공을 모시겠습니다」는 예식장 사회자 말투의 표본이고 두 사람 이야기가 한 글자도 없다'),
 ('entry','D','plain','「오랜 계절을 지나 … 오늘에 닿았습니다」가 현행 「여러 해가 걸려 … 서로에게 닿았습니다」와 뜻도 동사도 같다'),
 ('entry','E','plain','「두 사람을 키워 온 사랑이」 — 추상 주어. 코워크가 22c 에서 정확히 이 문장을 걷어냈다'),
 ('entry','F','plain','현행의 요약이고, 현행의 「각자 써 내려온」이 둘을 따로 세우는데 plain 은 「두 사람의 이야기」로 뭉갠다'),
 ('declare','1','plain','현행과 낱말만 바뀌었다. 게다가 「계신」을 「의」로 줄인 것은 예우를 깎은 것'),
 ('declare','2','plain','「이제」가 두 번이고 하나가 성혼선언 정형구와 겹친다 — 정형구의 무게가 반으로 깎인다'),
 ('letter','parent','plain','셋이 「이제, … 이제, 그 목소리가 이어집니다」 틀 하나다. 세 벌이 아니라 낱말만 끼운 것'),
 ('letter','each','plain','위와 같음'),
 ('letter','both','plain','위와 같음'),
 ('toast','cake','plain','뒤 두 문장이 cake·warm 과 글자까지 같다. 다른 건 첫 문장뿐인데 warm 쪽이 뒤의 「천천히」와 이어진다'),
 ('toast','toast','plain','★65음절로 현행(58)보다 길다. 담백판이 현행보다 길면 담백판이 아니다. 「하고 선창하면」은 4회차에 고친 자리의 옛 꼴'),
 ('toast','both','plain','cake·plain 을 지우면 앞부분이 사라진다. 129음절이다'),
]
# ★[TRIBUTE_KEEP] 코워크가 «지우지 말라»고 못박은 자리 — 표에는 넣지 않았지만 근거를 남긴다.
#   tribute 의 plain 셋은 틀이 같지만 «어조 갈래»가 아니라 «다른 행동»이다(꽃 / 큰절 / 안기).
#   하나라도 지우면 그 행동을 고른 고객에게 담백판이 없어진다. 답은 삭제가 아니라 손질이다.
#   ★declare·family·plain 도 남긴다 — 32번 폴백의 원문이자 «가족이 손에 들고 읽는 인쇄 선언문»이다.

lines = io.open(SRC, encoding='utf-8').read().split('\n')
g = key = tone = None
mark = [None] * len(lines)          # 각 줄이 속한 (그룹,키,톤)
for i, raw in enumerate(lines):
    l = raw.strip()
    h = re.match(r'^###\s+(3-\d)\.', l)
    if h: g = GROUPS.get(h.group(1)); key = tone = None; continue
    if re.match(r'^##\s', l): g = key = tone = None; continue
    if not g: continue
    b = re.match(r'^\*\*(.+?)\*\*', l)
    if b:
        t = TONE.get(b.group(1))
        if t: tone = t; mark[i] = (g[0], key, tone, 'head'); continue
        p = re.search(r'\(([A-Za-z]+)\)', b.group(1))
        cand = p.group(1) if p else b.group(1).split()[0]
        key = cand if cand in g[1] else None
        tone = None; continue
    if l.startswith('>') and key and tone: mark[i] = (g[0], key, tone, 'body')

drop, miss = set(), []
for ev, k, t, why in CULL:
    idx = [i for i, m in enumerate(mark) if m and m[0] == ev and m[1] == k and m[2] == t]
    if not idx: miss.append((ev, k, t)); continue
    print('✓ %-8s %-7s %-6s  %d줄  %s' % (ev, k, RTONE[t], len(idx), why[:58]))
    drop.update(idx)
if miss:
    print('\n✗ 원천에서 못 찾은 자리 %d개 — 아무것도 안 지웠습니다:' % len(miss))
    for m in miss: print('   ', m)
    sys.exit(1)
print('\n지울 블록 %d개 · 줄 %d개' % (len(CULL), len(drop)))
if not WRITE:
    print('(드라이런 · --write 로 실제 삭제)'); sys.exit(0)
io.open(SRC, 'w', encoding='utf-8').write('\n'.join(l for i, l in enumerate(lines) if i not in drop))
print('✓ 원천에서 지웠습니다 — 이제 생성기를 돌립니다')
subprocess.run(['node', 'scripts/build-tone-table.mjs'], check=False)
