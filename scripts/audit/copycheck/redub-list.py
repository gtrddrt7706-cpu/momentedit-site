#!/usr/bin/env python3
# 재더빙 명단 [REDUB_LIST] — 2026-09-20
#
# 왜 — 문안이 바뀌면 그 클립은 다시 받아야 한다. 그런데 «어느 클립»을 «누구 목소리로»
#   다시 받는지가 정리 안 되면, 사장님이 타입캐스트에 붙여넣을 때 빠지거나 겹친다.
#   ★앞 회차에서 실제로 난 사고 — 성우를 바꿨는데 «문안이 안 바뀐 클립»을 명단에서 빼먹어
#     03·19·20·21 네 개가 옛 목소리로 남았다. 그래서 이 명단은 «문안이 바뀐 것»만이 아니라
#     «다시 받아야 하는 이유»를 함께 적는다.
#
#   python3 redub-list.py            ← 화면에 요약
#   python3 redub-list.py --write    ← 성우별 붙여넣기 파일까지 만든다
import json, glob, sys, collections, os

WRITE = '--write' in sys.argv
OUT = '재더빙'
clips = []
for f in sorted(glob.glob('round[0-9].json')):
    d = json.load(open(f, encoding='utf-8'))
    for c in d['clips']:
        chg = [s for s in c['sents'] if s['old'] != s['new']]
        if not chg: continue
        cut = [s for s in c['sents'] if not s['new'].strip()]
        add = [s for s in c['sents'] if s['old'].startswith('(없음')]
        clips.append({'r': d['round'], 'no': c['no'], 'slug': c['slug'],
                      'voice': c['voice'], 'label': c['label'],
                      'sents': [s['new'] for s in c['sents'] if s['new'].strip()],
                      'nchg': len(chg), 'ncut': len(cut), 'nadd': len(add)})

syl = lambda s: len([ch for ch in s if '가' <= ch <= '힣'])
byv = collections.defaultdict(list)
for c in clips: byv[c['voice']].append(c)

print(f'재더빙 대상 — 클립 {len(clips)}개 · 문장 {sum(len(c["sents"]) for c in clips)}개\n')
print(f"{'성우':<12}{'클립':>4}{'문장':>5}{'음절':>6}   대략 길이")
print('─' * 54)
tot = 0
for v, cs in sorted(byv.items(), key=lambda x: -len(x[1])):
    ns = sum(len(c['sents']) for c in cs); sy = sum(syl(t) for c in cs for t in c['sents'])
    tot += sy
    print(f"{v:<12}{len(cs):>4}{ns:>5}{sy:>6}   {sy/5.5/60:.1f}분")
print('─' * 54)
print(f"{'합계':<12}{len(clips):>4}{sum(len(c['sents']) for c in clips):>5}{tot:>6}   {tot/5.5/60:.1f}분")
print('  ★길이는 «초당 5.5음절» 어림입니다. 실제 값은 받아 봐야 압니다.')

if WRITE:
    os.makedirs(OUT, exist_ok=True)
    for f in glob.glob(f'{OUT}/*'): os.remove(f)
    idx = []
    for v, cs in sorted(byv.items()):
        safe = {'우성':'woosung','진희':'jinhee','이겸':'igyeom','서진':'seojin',
                '권일':'kwonil','주하':'jooha','규민':'gyumin','정숙':'jungsook',
                '신랑·신부':'couple'}.get(v, 'etc')
        lines = [f'# 재더빙 · {v} · 클립 {len(cs)}개',
                 '# ★한 클립씩 따로 받으세요. 클립 사이에 빈 줄 하나가 경계입니다.', '']
        for c in sorted(cs, key=lambda x: x['no']):
            why = []
            if c['nadd']: why.append(f'문장 {c["nadd"]}개 새로 들어감')
            if c['ncut']: why.append(f'{c["ncut"]}개 빠짐')
            why.append(f'{c["nchg"]}줄 고침')
            lines.append(f"[{c['no']}] {c['slug']} — {c['label']}   ({' · '.join(why)})")
            lines += c['sents']; lines.append('')
        p = f'{OUT}/{safe}_{len(cs)}clips.txt'
        open(p, 'w', encoding='utf-8').write('\n'.join(lines))
        idx.append(f"{v:<10} {len(cs):>2}클립  {os.path.basename(p)}")
    open(f'{OUT}/00_목록.txt', 'w', encoding='utf-8').write(
        '재더빙 묶음\n\n' + '\n'.join(idx) +
        '\n\n★파일명은 영문입니다 — 한글 파일명이 든 압축을 한국 프로그램이 못 여는 일이 있었습니다.\n'
        '★문안이 안 바뀐 클립은 여기 없습니다. 성우를 바꾸시는 경우에는 그 성우의 «모든» 클립을\n'
        '  받아야 하니 이 명단만 믿으면 안 됩니다 — 앞에 그 사고가 한 번 났습니다.')
    print(f'\n{OUT}/ 에 성우별 붙여넣기 파일을 만들었습니다.')
