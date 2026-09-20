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

props = []
for f in sorted(glob.glob('scripts/audit/copycheck/round[0-9].json')):
    d = json.load(io.open(f, encoding='utf-8'))
    for c in d['clips']:
        for s in c['sents']:
            if s['old'] != s['new']:
                props.append((d['round'], c['no'], s['i'], s['old'], s['new']))

bad = []
for rd, no, i, old, new in props:
    if (no, i) in JUDGED:
        continue
    for s in NO:
        if s in new:
            bad.append((rd, no, i, 'nochk', s, new))
    for s, n in YES:
        # 잠긴 말을 «지우는» 제안인가 — 옛 문면에 있고 새 문면에 없다
        if s in old and s not in new:
            bad.append((rd, no, i, 'chk', s, new))

print('제안 %d건 · 게이트 잠금 chk %d · nochk %d' % (len(props), len(YES), len(NO)))
if not bad:
    print('\n✓ 잠긴 결정과 부딪치는 제안이 없습니다.')
    sys.exit(0)
print('\n✗ 잠긴 결정과 부딪치는 제안 %d건 — 넣기 전에 판단이 필요합니다.\n' % len(bad))
for rd, no, i, kind, s, new in bad:
    print('  R%s [%s]#%s  %s 「%s」' % (rd, no, i, kind, s))
    print('        새 문면: %s' % new)
sys.exit(1)
