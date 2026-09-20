#!/usr/bin/env python3
# 잠긴 결정과 부딪치는 제안을 «넣기 전에» 잡는다 [LOCKED_PROPOSAL] (2026-09-20)
#
# 왜 — 코워크가 보낸 7회차 제안 여덟 클립 중 셋이 사장님이 게이트에 잠가 둔 결정을 되돌렸다.
#   · 04a#2 · 04c#1 「두 사람이 정한」 → 「골랐습니다」   ← [GUEST_TONE]③ 「고른」은 남이 차린 것에서 집었다는 말
#   · 02a#1 「간단한 다과 … 준비해 두었습니다」 → 「… 두었으니 편히 드십시오」
#         ← [GUEST_TONE]① 「간단한 다과」는 사장님이 고른 말 · ② 사장님 「편히 드시면 이것도 빼자」
#
# ★셋 다 악의가 아니라 «게이트를 안 읽고 제안했다»이다. 그런데 결과는 같다 — 잠긴 결정이 조용히 뒤집힌다.
# ★★그리고 02a#1 은 nochk 를 **우회**했다. 막은 것이 「편히 드시면」이라 「편히 드십시오」로 샌다.
#   문자열 하나를 열쇠로 쓰면 그 말의 «다른 꼴»로 언제든 새어 나간다([DECISION_GUARD] 의 한계).
#   그래서 이 검사는 게이트 목록을 기계로 읽어 **제안 전체**를 대조한다. 사람이 91클립을 다시 읽지 않는다.
import json, re, glob, sys, io

GATE = io.open('automation/tests/merge-guard.sh', encoding='utf-8').read()
# ★★[TARGET_FOUR 2026-09-20] 한 파일만 보다 놓쳤다. 07w#1 「오늘 오신 분들은…」 은
#   `배역_예시_대사.txt` 를 겨눈 chk 가 지키고 있어서 이 검사를 그냥 통과했다.
#   문안은 네 곳에 산다([SRC_FOUR]) — 게이트가 어디를 겨누든 제안은 같은 말을 친다.
TARGETS = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
           'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs']

def rules(kind):
    # chk '문자열' 파일 N   /   nochk '문자열' 파일
    out = []
    for t in TARGETS:
        pat = r"^%s\s+(['\"])(.+?)\1\s+'?%s'?(?:\s+(\d+))?\s*(?:#.*)?$" % (kind, re.escape(t))
        out += [(m.group(2), m.group(3)) for m in re.finditer(pat, GATE, re.M)]
    return out

NO  = [s for s, _ in rules('nochk')]
YES = [(s, int(n or 1)) for s, n in rules('chk') if (n or '1') != '0']

# ★★[JUDGED 2026-09-20] 이미 «판정한» 제안은 다시 묻지 않는다. 판정은 apply 스크립트의 REJECT 에 산다 —
#   거기에 «왜 안 받는지»가 함께 적혀 있어, 판정과 근거가 갈라질 수 없다(사본을 만들지 않는다).
#   그래서 이 검사는 게이트에 걸 수 있다. 붉어지는 것은 **새로 들어온 제안이 잠긴 결정을 깰 때**뿐이다.
APPLY = io.open('scripts/apply-narr-r3678.py', encoding='utf-8').read()
JUDGED = set()
for m in re.finditer(r"^\s*\('([^']+)',\s*(\d+)\):", APPLY, re.M):
    JUDGED.add((m.group(1), int(m.group(2))))

# ★★[JUDGED_TSV] 판정한 자리는 apply 스크립트 «둘»에 산다. 한쪽만 읽으면 이미 끝낸 것이 다시 뜬다.
#   실제로 [CUE_READ_APPLY] 로 반영한 26·64·45 가, 그 옛 문면을 든 round5 때문에 셋 다 빨갛게 떴다.
#   내가 방금 건 nochk 를 내 옛 회차가 깨는 꼴이라 «사고»가 아니라 «이미 처리»다.
#   ★표를 못 읽으면 조용히 넘기지 않는다 — 0줄이면 그 자체로 이상이다.
import csv, os
_TSV = 'docs/plans/식순연구/큐순서읽기_반영_20260920.tsv'
if os.path.exists(_TSV):
    _rows = list(csv.DictReader(io.open(_TSV, encoding='utf-8'), delimiter='\t'))
    if len(_rows) < 5:
        print('[LOCKED_PROPOSAL] FAIL %s 를 %d줄밖에 못 읽었다 — 표 모양이 깨졌다' % (_TSV, len(_rows)))
        raise SystemExit(1)
    # ★문장 번호로 맞추면 안 된다 — 제안이 든 판에서는 그 클립의 «문장 수»가 달랐다.
    #   실제로 64 는 옛 판에서 2문장이라 제안이 #1 인데 지금은 1문장(#0)이다.
    #   그래서 «그 잠금말이 내가 방금 일부러 지운 말인가»로 본다. 번호와 무관하게 참이다.
    #   ★★그리고 «자리»째로 면제하면 안 된다. 처음에 (번호, 문장) 을 JUDGED 에 넣었더니
    #     그 자리의 **모든 새 제안이 영원히 통과**했다 — 일부러 잠금말을 되살리는 제안을
    #     26#1 에 넣어 보니 조용히 지나갔다. 면제는 «그 말 하나»에만 준다.
    _RETIRED_WORDS = [_r['전'].strip() for _r in _rows if _r.get('전', '').strip()]
else:
    _RETIRED_WORDS = []

# ★★[DROPPED_BRANCH] 표는 «문면 교체»용이다 — 「전 → 후」 한 쌍이 있어야 쓴다.
#   그런데 «갈래 폐지»는 짝이 없다. 그 자리가 통째로 사라지고 폴백이 대신한다.
#   실제로 79 를 표에 억지로 넣었다가, 「전」이 폐지 근거를 적은 **주석에도 있어서**
#   apply 가 주석까지 치환할 뻔했다. 성격이 다른 것을 한 표에 담으면 그렇게 된다.
#   ★그래서 여기 따로 적는다. 이 문면을 되살리자는 제안이 오면 «이미 판정된 옛 판»으로 넘긴다.
#   ★되살릴 때는 이 목록에서 빼고 entryOutBy 와 order-preview 사본을 **함께** 채운다.
_RETIRED_WORDS += [
    '두 사람이 나란히 있습니다.',   # 79_narr-entry-out-B — 52(A) 와 뜻이 같아 폐지 [ENTRY_OUT_B_DROP]
    '지금 들으신 것이 두 사람의 첫 인사였습니다.',  # 12_narr-welcome-out — 큐째로 폐지 [WELCOME_OUT_DROP]
]

props = []
for f in sorted(glob.glob('scripts/audit/copycheck/round[0-9].json')):
    d = json.load(io.open(f, encoding='utf-8'))
    for c in d['clips']:
        for s in c['sents']:
            if s['old'] != s['new']:
                props.append((d['round'], c['no'], s['i'], s['old'], s['new']))

bad, skipped = [], []
for rd, no, i, old, new in props:
    if (no, i) in JUDGED:
        continue
    for s in NO:
        if s in new:
            # ★[JUDGED_TSV] 그 nochk 가 «내가 방금 일부러 지운 말»이면 이 제안은 이미 판정된 옛 판이다.
            #   문장 번호로는 못 거른다 — 제안이 든 판에서는 그 클립의 문장 수가 달랐다(64 는 2→1문장).
            #   ★조용히 넘기지 않는다 — 걸러낸 것을 세어 찍는다. 이 자루가 소리 없이 커지면
            #     「경고가 0이라 안전하다」가 거짓이 된다.
            if any(s in w for w in _RETIRED_WORDS):
                skipped.append((rd, no, i, s)); continue
            bad.append((rd, no, i, 'nochk', s, new))
    for s, n in YES:
        # 잠긴 말을 «지우는» 제안인가 — 옛 문면에 있고 새 문면에 없다
        if s in old and s not in new:
            bad.append((rd, no, i, 'chk', s, new))

print('제안 %d건 · 게이트 잠금 chk %d · nochk %d' % (len(props), len(YES), len(NO)))
if skipped:
    print('  · 이미 판정한 자리라 넘긴 것 %d건 (표: %s)' % (len(skipped), _TSV.split('/')[-1]))
    for rd, no, i, w in skipped[:6]: print('      R%s [%s]#%s  %s' % (rd, no, i, w[:30]))
if not bad:
    print('\n✓ 잠긴 결정과 부딪치는 제안이 없습니다.')
    sys.exit(0)
print('\n✗ 잠긴 결정과 부딪치는 제안 %d건 — 넣기 전에 판단이 필요합니다.\n' % len(bad))
for rd, no, i, kind, s, new in bad:
    print('  R%s [%s]#%s  %s 「%s」' % (rd, no, i, kind, s))
    print('        새 문면: %s' % new)
sys.exit(1)
