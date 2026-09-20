#!/usr/bin/env python3
# [TONE_TEXT_APPLY] 코워크가 다듬은 어조 문면을 «원천»에 박는다 (2026-09-20)
#
# ★★왜 이 스크립트가 생겼나 — 열여섯 건을 통째로 빠뜨렸다
#   코워크가 보낸 tone32.json 에는 «지울 것»과 «고칠 것»이 함께 있었는데,
#   내가 「지울 목록만 주십시오」라고 부탁해 놓고 **그 눈으로만 읽었다.**
#   지우는 것은 다 됐고([TONE_CULL]) 고치는 것은 하나도 안 됐다.
#   그 상태에서 [ENTRY_PROMOTE] 가 돌아 **고치기 전 문면이 기본값으로 승격**됐다.
#   → 받은 것과 넣은 것이 같은 물건인가 [DECISION_GATE] 의 어조표판이다.
#
# ★어디를 고치나 — 자리마다 «원천»이 다르다. 한 곳만 고치면 다른 곳이 남는다
#   어조판(plain·warm·lyric) : docs/plans/대본개정/21_B_제안.md §3  → 생성기가 TONE_TABLE 을 만든다
#   현행(승격된 entry C·E)   : assets/ritual-data.js + order-preview.html  (생성구역 밖 · 직접 고친다)
#
# ★★[NO_SILENT_SKIP] 못 찾으면 **건너뛰지 않고 멈춘다.**
#   [SLUG_STRICT] 에서 배운 것 — 조용한 건너뜀은 「다 됐다」로 보이고, 그게 이번 사고의 모양이었다.
#
#   python3 scripts/apply-tone-text.py [--dry]
import io, csv, re, sys, subprocess

TSV  = 'docs/plans/식순연구/어조표_문면_대조.tsv'
PROP = 'docs/plans/대본개정/21_B_제안.md'
DATA = ['assets/ritual-data.js', 'order-preview.html']
DRY  = '--dry' in sys.argv

rows = list(csv.DictReader(io.open(TSV, encoding='utf-8'), delimiter='\t'))
norm = lambda s: re.sub(r'\s+', ' ', s).strip()

prop = io.open(PROP, encoding='utf-8').read()
data = {p: io.open(p, encoding='utf-8').read() for p in DATA}
done, skip = [], []

for r in rows:
    ev, br, tone = r['이벤트'].strip(), r['갈래'].strip(), r['판'].strip()
    now, go = norm(r['지금 문면(저장소)']), norm(r['갈 문면'])
    tag = '%s·%s·%s' % (ev, br, tone)
    if now == go:
        skip.append((tag, '지금과 갈 곳이 같다')); continue

    if tone == '현행':
        # ★승격된 자리 — 생성구역 밖이라 두 파일을 직접 고친다.
        #   끝의 「신랑 신부, 입장!」은 데이터에만 있고 tsv 에는 없다 → 앞부분만 갈아 끼운다
        hit = 0
        for p in DATA:
            if now in data[p]:
                data[p] = data[p].replace(now, go); hit += 1
        if hit == len(DATA): done.append((tag, 'ritual-data.js + order-preview.html'))
        else: skip.append((tag, '두 파일 중 %d곳에서만 찾음 — 멈춤' % hit))
    else:
        if now in prop:
            prop = prop.replace(now, go, 1); done.append((tag, PROP))
        elif br == 'both':
            # ★★[TONE_ARRAY] both 는 «두 조각»이다 — 케이크 한 줄, 축배 한 줄로 따로 적혀 있다.
            #   tsv 는 한 덩어리로 보내 오므로 같은 경계로 다시 쪼개야 한다.
            #   경계는 «지금 둘째 줄의 첫 문장». 그 문장이 갈 문면에도 그대로 있어야만 자른다 —
            #   없으면 자리를 추측하게 되고, 추측은 [SLUG_STRICT] 에서 이미 크게 데인 자리다.
            lines = [l[2:].strip() for l in prop.splitlines() if l.startswith('> ')]
            two = [l for l in lines if norm(l) and norm(l) in now]
            head2 = None
            for l in lines:
                if norm(l) and norm(l) in now and now.index(norm(l)) > 0: head2 = norm(l)
            if head2 and head2.split('. ')[0] + '.' in go:
                cutw = head2.split('. ')[0] + '.'
                i = go.index(cutw)
                a, b = go[:i].strip(), go[i:].strip()
                p1 = norm(now[:now.index(head2)])
                if p1 in prop and head2 in prop:
                    prop = prop.replace(p1, a, 1).replace(head2, b, 1)
                    done.append((tag, PROP + ' (두 조각)'))
                else:
                    skip.append((tag, '두 조각 중 한쪽을 제안서에서 못 찾음 — 멈춤'))
            else:
                skip.append((tag, '두 조각의 경계 문장을 갈 문면에서 못 찾음 — 멈춤'))
        else:
            skip.append((tag, '제안서 §3 에서 못 찾음 — 멈춤'))

print('[TONE_TEXT_APPLY] 반영 %d · 못한 것 %d' % (len(done), len(skip)))
for t, w in done: print('  ✓', t, '→', w)
for t, w in skip: print('  ✗', t, '—', w)

# ★★[NO_SILENT_SKIP] 「같다」가 아닌 이유로 하나라도 못 하면 아무것도 쓰지 않고 1로 끝낸다
hard = [s for s in skip if '같다' not in s[1]]
if hard:
    print('\n★ 못 찾은 자리가 있어 **아무 파일도 쓰지 않았다.** 글자를 맞추고 다시 돌릴 것.')
    sys.exit(1)
if DRY:
    print('\n(--dry · 쓰지 않음)'); sys.exit(0)
io.open(PROP, 'w', encoding='utf-8').write(prop)
for p in DATA: io.open(p, 'w', encoding='utf-8').write(data[p])
print('\n생성기를 다시 돌린다 — build-tone-table.mjs')
sys.exit(subprocess.call(['node', 'scripts/build-tone-table.mjs']))
