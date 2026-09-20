#!/usr/bin/env python3
# 판정 반영기 [APPLY_PICK] — 2026-09-20 (둘째 판 · 문장별 열쇠)
#
# 왜 — 판정이 돌아온 뒤에 손으로 옮기면 152개 중 몇은 반드시 틀린다.
#   그리고 「다시」에 적어 주신 한 줄이 흩어져서 다음 문안을 쓸 때 못 찾는다.
#
#   python3 apply-pick.py 판정결과.txt            ← 먼저 «무슨 일이 일어날지»만 보여 준다
#   python3 apply-pick.py 판정결과.txt --write    ← 실제로 고친다
#
# ★★[2026-09-20 둘째 판 · 이게 이번에 고친 핵심] 열쇠를 «문서 하나»에서 «문장마다»로 내렸다.
#   왜 바꿨나 — 사장님이 판정을 보고 계시는 동안 내가 이어 읽기로 일곱 문장을 더 고쳤다.
#   옛 방식은 문서 전체 sha1 하나라, **한 글자만 달라도 152개 판정이 통째로 거부된다.**
#   거부는 안전하지만 정답이 아니다. 사장님이 두 시간 들여 누른 것을 버리게 만든다.
#   ★안전과 보존을 둘 다 가지려면 자를 문장 단위로 내리면 된다 —
#     «판정하신 그 글자 그대로인 문장»은 받고, «그 뒤에 내가 고친 문장»만 따로 빼서 다시 여쭙는다.
#   ★어긋난 것을 조용히 넘기지 않는다. 옛 글과 새 글을 나란히 찍어 준다.
import json, re, sys, glob, hashlib, collections, os

args = sys.argv[1:]
WRITE = '--write' in args
SRC = next(a for a in args if not a.startswith('--'))
FILES = sorted(glob.glob('round[0-9].json'))
parts = {f: json.load(open(f, encoding='utf-8')) for f in FILES}

NOW = {}
for f in FILES:
    for c in parts[f]['clips']:
        for s in c['sents']: NOW[f"{c['no']}#{s['i']}"] = s['new']

key = hashlib.sha1(json.dumps(
    [[[s['new'] for s in c['sents']] for c in parts[f]['clips']] for f in FILES],
    ensure_ascii=False).encode()).hexdigest()[:8]

txt = open(SRC, encoding='utf-8').read()
m = re.search(r'key=(\w+)', txt)
if not m:
    print('✗ 판정 글에 열쇠가 없습니다. 판정 화면의 「결과 만들기」가 뽑은 글을 그대로 넣어 주세요.'); sys.exit(1)
PKEY = m.group(1)

# ── 판정하신 그때의 글 — 세 군데에서 찾는다
#   ①판정 글에 문장별 도장(@xxxx)이 찍혀 있으면 그걸 쓴다(앞으로는 늘 이쪽)
#   ②그 열쇠로 찍어 둔 스냅이 있으면 그걸 쓴다(지금 돌고 있는 24f9719a 판이 이 경우)
#   ③열쇠가 지금 문안과 같으면 대조할 것이 없다
THEN, mode = None, ''
if PKEY == key:
    mode = '열쇠가 같습니다 — 판정하신 뒤로 문안이 안 바뀌었습니다'
else:
    snapf = f'판정스냅_{PKEY}.json'
    if os.path.exists(snapf):
        THEN = json.load(open(snapf, encoding='utf-8'))['sents']
        mode = f'열쇠가 다릅니다({PKEY} → {key}). 스냅 {snapf} 로 **문장마다** 대조합니다'
    else:
        print(f'✗ 열쇠가 다릅니다 — 판정 글 {PKEY} · 지금 문안 {key}')
        print(f'   그런데 그때의 글을 찍어 둔 판정스냅_{PKEY}.json 이 없습니다.')
        print('   ★그냥 얹으면 «판정한 글»과 «고칠 글»이 어긋난 채로 반영됩니다.'); sys.exit(1)

# 판정 읽기 — 문장별 도장(@xxxx)이 있으면 함께 읽는다
picks, stamps, notes, cur = {}, {}, {}, None
for line in txt.split('\n'):
    line = line.strip()
    mo = re.match(r'^O\s+([\w]+)#(\d+)\s*=\s*(\S+)(?:\s+@(\w+))?', line)
    if mo:
        cur = (mo.group(1), int(mo.group(2))); picks[cur] = mo.group(3)
        if mo.group(4): stamps[cur] = mo.group(4)
        continue
    if line.startswith('# ') and cur: notes[cur] = line[2:].strip()

def h4(t): return hashlib.sha1(t.encode()).hexdigest()[:4]

# ── 문장마다 «판정하신 글»과 «지금 글»이 같은지
drift = []
for k in list(picks):
    kk = f'{k[0]}#{k[1]}'
    then = None
    if k in stamps:
        if stamps[k] != h4(NOW.get(kk, '')): drift.append((kk, '(도장 불일치)', NOW.get(kk, '')))
    elif THEN is not None:
        then = THEN.get(kk)
        if then is None or then != NOW.get(kk): drift.append((kk, then, NOW.get(kk, '')))

cnt = collections.Counter(picks.values())
print(f'판정 {len(picks)}건 — ' + ' · '.join(f'{k} {v}' for k, v in cnt.most_common()))
print(mode)
if drift:
    print(f'\n★판정하신 뒤에 제가 고친 문장 {len(drift)}개 — 이건 반영하지 않고 **다시 여쭙습니다**')
    for kk, then, now in drift:
        print(f'  [{kk}]')
        print(f'      판정하신 글 : {then}')
        print(f'      지금 글      : {now}')
    print('  ★나머지 판정은 그대로 살립니다. 이 몇 개만 다시 보시면 됩니다.')
DRIFT = {tuple(kk.split("#")) for kk, _, _ in drift}
def drifted(no, i): return (no, str(i)) in DRIFT

print()
todo, changed, skipped = [], 0, 0
for f, d in parts.items():
    for c in d['clips']:
        for s in c['sents']:
            v = picks.get((c['no'], s['i']))
            if v is None: continue
            if drifted(c['no'], s['i']): skipped += 1; continue
            if v == '그대로':
                if s['new'] != s['old'] and not s['old'].startswith('('):
                    print(f"  ← [{c['no']}]#{s['i']} 되돌림: {s['new'][:34]} → {s['old'][:34]}")
                    s['new'] = s['old']; changed += 1
            elif v == '다시':
                todo.append((c['no'], s['i'], c['slug'], s['new'], notes.get((c['no'], s['i']), '')))
            elif v == '채택':
                s['tag'] = (s.get('tag', '') + ' · 사장님 채택').strip(' ·')

if todo:
    print(f'\n★다시 쓸 자리 {len(todo)}개 — 이게 다음 작업 목록입니다')
    for no, i, sl, t, why in todo:
        print(f"  [{no}]#{i} {sl}")
        print(f"      지금 안 : {t}")
        print(f"      걸린 것 : {why or '(적지 않으심 — 여쭤봐야 합니다)'}")

if WRITE:
    for f, d in parts.items():
        json.dump(d, open(f, 'w', encoding='utf-8'), ensure_ascii=False, indent=2)
    print(f'\n기록했습니다 — 되돌린 것 {changed}개 · 다시 여쭐 것 {skipped}개. 이어서 check-copy.py 를 돌리세요.')
else:
    print(f'\n(미리보기입니다. 실제로 고치려면 --write 를 붙이세요 · 되돌릴 것 {changed}개 · 다시 여쭐 것 {skipped}개)')
