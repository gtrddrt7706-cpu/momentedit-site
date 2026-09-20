#!/usr/bin/env python3
# [GATE_LOCK_EXPORT] 게이트가 «글자로» 지키는 목록을 tsv 로 뽑는다 (2026-09-20)
#
# 왜 — 코워크는 이 저장소를 갖고 있지 않아 merge-guard.sh 를 직접 읽지 못한다.
#   그쪽 `locked-proposal-local.py` 가 이 tsv 를 대신 읽어, 보내 오는 제안이
#   «잠근 결정»을 깨는지 미리 본다. 손으로 추려 보내면 그때마다 빠뜨린다.
#
# ★★[LOCK_SNAPSHOT] 이 파일은 «지금 이 순간»의 사진이다. 원본이 아니다.
#   게이트는 매 커밋 바뀌므로 묶음을 보낼 때마다 다시 뽑는다.
#   (코워크가 `.,` 를, 내가 91클립을 «원본»으로 믿은 것과 같은 함정 — [NOT_THE_SOURCE])
#
#   python3 scripts/audit/export-gate-locks.py > 게이트잠금목록.tsv
import re, io, sys

GUARD = 'automation/tests/merge-guard.sh'
# [TARGET_FOUR]/[SRC_FOUR] 문안이 사는 다섯 곳. 그 밖의 chk 는 코워크 판정과 무관하다
TARGETS = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
           'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs']

# ★따옴표가 두 꼴로 섞여 있다(홑·겹). 한 꼴만 잡으면 조용히 절반이 샌다
# ★★[PATH_QUOTED] **경로도 따옴표가 붙는다** — 한글 경로(배역_예시_대사.txt)가 전부 그렇다.
#   처음엔 경로를 `\S+` 로만 잡아 **63줄이 통째로 빠졌고**, 지난 판과 개수를 견주어서야 보였다.
#   값 하나가 어긋나면 그 묶음을 만든 절차가 틀린 것이다([RULE_MEASURED]) — 그래서 개수를 찍는다.
Q = r"""(?:'([^']*)'|"([^"]*)"|(\S+))"""
LINE = re.compile(r'^\s*(chk|nochk)\s+' + Q + r'\s+' + Q + r'(?:\s+(\d+))?')

rows, seen = [], set()
for ln in io.open(GUARD, encoding='utf-8'):
    m = LINE.match(ln)
    if not m: continue
    kind, a1, a2, a3, b1, b2, b3, n = m.groups()
    s = a1 if a1 is not None else (a2 if a2 is not None else a3)
    path = b1 if b1 is not None else (b2 if b2 is not None else b3)
    if path not in TARGETS: continue
    if '\t' in s: continue           # tsv 를 깨는 값은 내보내지 않는다(현재 0건)
    key = (kind, path, s)
    if key in seen: continue
    seen.add(key)
    rows.append((kind, path, s, n or '1'))

rows.sort(key=lambda r: (TARGETS.index(r[1]), r[0], r[2]))
out = sys.stdout
out.write('# 게이트가 글자로 지키는 목록 — 2026-09-20 [CULL_3]+[CAKE_DROP]+[ENTRY_PROMOTE] 반영판\n')
out.write('# ★지난 판은 버리십시오. 케이크가 nochk 로 뒤집혔고 어조가 또 줄었습니다.\n')
out.write('# kind\t파일\t문자열\t최소건수(nochk 는 무시)\n')
for r in rows:
    out.write('\t'.join(r) + '\n')
sys.stderr.write('[GATE_LOCK_EXPORT] %d줄 (chk %d · nochk %d)\n'
                 % (len(rows), sum(1 for r in rows if r[0] == 'chk'),
                    sum(1 for r in rows if r[0] == 'nochk')))
