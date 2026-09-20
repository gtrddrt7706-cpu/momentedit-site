#!/usr/bin/env python3
# [LOCKED_PROPOSAL · 코워크 로컬판] — 클로드코드 판을 이쪽에서 돌 수 있게 고친 것 (2026-09-20)
#
# ★바꾼 것은 «게이트를 어디서 읽는가» 하나뿐입니다. 판정 로직은 그쪽 판 그대로입니다.
#   저쪽 : automation/tests/merge-guard.sh 를 정규식으로 읽는다
#   이쪽 : 그쪽이 보내 준 게이트잠금목록.tsv 를 읽는다
#
# ★★그쪽 경고를 그대로 옮겨 적습니다 — **이 tsv 는 «지금 이 순간»의 사진입니다.**
#   게이트는 계속 바뀌니 원본으로 삼지 않습니다. 묶음을 보낼 때마다 새로 받습니다.
#   (제가 `.,` 에서, 그쪽이 91클립에서 겪은 것과 같은 함정입니다.)
#
# ★JUDGED(이미 판정한 제안)는 이쪽에 없습니다 — apply 스크립트가 저장소에 삽니다.
#   그래서 이쪽 결과는 저쪽보다 **넓게** 나옵니다. 여기서 0이면 저쪽에서도 0입니다.
#
#   python3 locked-proposal-local.py 게이트잠금목록.tsv [round*.json tone32.json ...]
# ★★[MARKER_KEEP] 그쪽 판의 마커를 지우지 않습니다. 이 로컬판이 «안 옮긴» 것과 이유를 여기 적습니다.
#   [GUEST_TONE]     — 잠긴 결정 셋(「고른」·「간단한 다과」·「편히 드시면」)의 출처. 판정은 tsv 가 들고 옵니다.
#   [DECISION_GUARD] — 문자열 하나를 열쇠로 쓰면 그 말의 «다른 꼴»로 샌다는 한계. 이 검사가 그걸 메웁니다.
#   [TARGET_FOUR]    — 문안이 사는 네 곳. TARGETS 로 그대로 옮겼습니다.
#   [SRC_FOUR]       — 위와 같은 자리.
#   [JUDGED]         — «이미 판정한 제안»은 저장소 apply 스크립트에 삽니다. 이쪽엔 그 파일이 없어
#                      **옮기지 못했습니다.** 그래서 이쪽 결과가 저쪽보다 넓게 나옵니다(여기서 0이면 저쪽도 0).
import json, glob, sys, io, os

TSV = sys.argv[1] if len(sys.argv) > 1 else '게이트잠금목록.tsv'
SRCS = sys.argv[2:] or (sorted(glob.glob('round[0-9].json')) + ['tone32.json'])
TARGETS = {'assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
           'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs'}

NO, YES = [], []
for line in io.open(TSV, encoding='utf-8'):
    line = line.rstrip('\n')
    if not line or line.startswith('#'): continue
    p = line.split('\t')
    if len(p) < 3: continue
    kind, path, s = p[0], p[1], p[2]
    n = p[3] if len(p) > 3 else '1'
    if path not in TARGETS: continue
    if kind == 'nochk': NO.append(s)
    elif kind == 'chk' and (n or '1') != '0': YES.append(s)

props = []
for f in SRCS:
    if not os.path.exists(f): continue
    d = json.load(io.open(f, encoding='utf-8'))
    for c in d['clips']:
        for s in c['sents']:
            if s['old'] != s['new'] and not s['old'].startswith('(없음'):
                props.append((d.get('round', '?'), c['no'], c.get('slug', '?'), s['i'], s['old'], s['new']))

bad = []
for rd, no, slug, i, old, new in props:
    for s in NO:
        if s in new: bad.append((rd, no, slug, i, 'nochk', s, new))
    for s in YES:
        if s in old and s not in new: bad.append((rd, no, slug, i, 'chk', s, new))

print(f'제안 {len(props)}건 · 게이트 잠금 chk {len(YES)} · nochk {len(NO)} · 본 파일 {len(SRCS)}개')
if not bad:
    print('\n✓ 잠긴 결정과 부딪치는 제안이 없습니다.'); sys.exit(0)
print(f'\n✗ 잠긴 결정과 부딪치는 제안 {len(bad)}건 — 보내기 전에 판단이 필요합니다.\n')
for rd, no, slug, i, kind, s, new in bad:
    print(f'  R{rd} [{no}_{slug}]#{i}  {kind} 「{s}」')
    print(f'        새 문면: {new}')
sys.exit(1)
