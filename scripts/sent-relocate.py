#!/usr/bin/env python3
# 자리가 밀린 소리를 «글자로 따라가» 옮긴다 [SENT_RELOCATE] (2026-09-20)
#
# 왜 — 한 클립에서 문장을 지우면 뒤 문장의 인덱스가 전부 한 칸씩 앞으로 당겨진다.
#   창고(sent-lib)는 «자리»(`클립#번호`)로 소리를 갖고 있어서, 글은 그대로인데 자리가 바뀐 것을
#   «대장에 없는 자리»로 읽는다. 그대로 `--prune` 하면 **멀쩡한 소리를 버리고 다시 녹음하게 된다.**
#   실제로 2026-09-20 에 6자리가 떴고 그중 둘이 살아 있는 문장이었다 —
#   「이제 두 사람은 부부입니다」(성혼선언 · 사장님이 실청으로 확인하신 자리)와 「큰 박수로 축하해 주세요」.
#
# ★자리가 아니라 **글자**가 같은 곳을 찾아 옮긴다. 옮긴 뒤에도 남는 자리만 버릴 것이다.
# ★옛 소리를 덮어쓰기 전에 먼저 **전부 임시로 꺼내 놓고** 배치한다 — A→B, B→C 가 섞이면 하나가 사라진다.
import json, io, os, shutil, sys, tempfile

WRITE = '--write' in sys.argv
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IDX = os.path.join(ROOT, 'assets/audio/_src/_index.json')
SRC = os.path.join(ROOT, 'assets/audio/_src')
MAN = os.path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json')

M = json.load(io.open(MAN, encoding='utf-8'))
D = json.load(io.open(IDX, encoding='utf-8'))
slots = D['slots']

ledger = {}          # '클립#i' -> text
by_text = {}         # text -> ['클립#i', ...]
for c in M['clips']:
    for s in c['sents']:
        k = '%s_%s#%d' % (c['no'], c['file'], s['i'])
        t = s['text'].strip()
        ledger[k] = t
        by_text.setdefault(t, []).append(k)

moves, drop = [], []
for k, v in slots.items():
    if k in ledger:
        continue                       # 자리가 그대로 있다
    t = (v.get('text') or '').strip()
    # 그 글이 대장 어딘가에 살아 있고, 그 자리의 소리가 아직 그 글이 아니면 → 옮길 수 있다
    # ★★[SAME_CLIP_FIRST 2026-09-20] «글자가 같은 아무 자리»를 집으면 **남의 클립을 친다.**
    #   「신랑 신부, 입장!」처럼 여러 클립에 있는 문장이 그렇다 — 실제로 `07#3` 과 `09#3` 이
    #   **둘 다 `07#2` 로** 가려 했고, 뒤엣것이 앞엣것을 덮을 참이었다. 드라이런이 잡았다.
    #   ★같은 클립 안을 먼저 찾고, 이미 누가 가기로 한 자리는 비켜 간다. 없으면 옮기지 않는다.
    clip = k.rsplit('#', 1)[0]
    taken = {y for _, y, _, _ in moves}
    cand = [y for y in by_text.get(t, [])
            if (slots.get(y, {}).get('text') or '').strip() != t and y not in taken]
    mine = [y for y in cand if y.rsplit('#', 1)[0] == clip]
    if mine:
        moves.append((k, mine[0], t, v))
    else:
        drop.append((k, t))

def path_of(key):
    clip, i = key.rsplit('#', 1)
    return os.path.join(SRC, clip, '%s.flac' % i)

print('[SENT_RELOCATE] 대장에 없는 자리 %d개 — 옮길 수 있는 것 %d · 버릴 것 %d\n'
      % (len(moves) + len(drop), len(moves), len(drop)))
for k, y, t, _ in moves:
    print('  ↪ %-28s → %-28s  「%s」' % (k, y, t[:34]))
    if not os.path.exists(path_of(k)):
        print('      ✗ 소리 파일이 없다: %s' % path_of(k))
for k, t in drop:
    print('  ✕ %-28s  「%s」  (글이 대장에서 사라졌다)' % (k, t[:34]))

if not WRITE:
    print('\n(미리보기 · --write 로 실제로 옮깁니다. 버리는 것은 sent-lib.mjs --prune --write 가 맡습니다)')
    sys.exit(0)

tmp = tempfile.mkdtemp()
held = {}
for k, y, t, v in moves:                       # ★먼저 전부 꺼내 놓는다
    p = path_of(k)
    if os.path.exists(p):
        h = os.path.join(tmp, k.replace('/', '_').replace('#', '_') + '.flac')
        shutil.move(p, h); held[k] = h
for k, y, t, v in moves:                       # ★그 다음에 배치한다
    if k in held:
        dst = path_of(y); os.makedirs(os.path.dirname(dst), exist_ok=True)
        shutil.move(held[k], dst)
    slots[y] = {'text': t, 'voice': v.get('voice'), 'when': v.get('when')}
    slots.pop(k, None)
io.open(IDX, 'w', encoding='utf-8').write(json.dumps(D, ensure_ascii=False, indent=1) + '\n')
print('\n✓ %d자리를 옮겼습니다.' % len(moves))
