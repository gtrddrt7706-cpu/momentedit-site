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

# ★★[폐지 거르기 2026-09-20 · 클로드코드가 제 쪽도 보라고 한 자리]
#   그쪽 재녹음 목록에 **폐지한 클립이 그대로 남아 있었습니다**(12번). 그대로 녹음하면
#   **안 쓸 소리에 돈과 시간을 씁니다.** 제 목록에는 **거르는 자가 아예 없었습니다** —
#   「내가 고친 것은 다 다시 받는다」였고, 고친 뒤에 폐지된 것은 그대로 남습니다.
#
# ★★그런데 «폐지»를 어떻게 아는가가 이 일의 전부입니다. 그쪽 경고를 그대로 새깁니다:
#     「**25·32 는 빼면 안 됩니다.** 정적 분석으로는 「안 부른다」로 보이는데
#      런타임 조건·폴백으로 실제로 나갑니다.」
#   그래서 큐 순서표의 「안 남」을 **폐지로 읽지 않습니다.** 그건 «이 설정들에서 안 불렸다»일 뿐입니다.
#   · 「폐지」  → 거릅니다 (표가 명시한 것)
#   · 표에 아예 없음 → 거릅니다 (15_toast · 79 처럼 클립째 사라진 것)
#   · 「안 남」  → **안 거릅니다. 소리 내어 묻습니다.** 25·32 가 그 자리입니다
# ★그리고 무엇을 걸렀는지 **반드시 찍습니다** — 조용히 빠지면 그게 더 큰 사고입니다.
# ★★[SLUG_NOT_KEY · 여기서도 걸렸습니다] 첫 판에서 번호만으로 표를 읽었더니
#   **12번이 안 걸렸습니다.** 표에 `12_narr-welcome-out`(나레이션 · 「안 남」)과
#   `12_bless-father`(배역 · 아버님 덕담 · 「난다」)가 **둘 다** 있고, 뒤엣것이 덮었습니다.
#   ★클로드코드가 같은 날 「이 세션 여섯 번째」라며 적어 보낸 함정이 **정확히 이 번호**였습니다.
#   그 글을 읽고 만들면서 같은 짓을 했습니다. **번호는 층마다 따로입니다 — 열쇠는 (번호, 층)입니다.**
TBL = '92클립_지금문면_큐순서.txt'
STAGE = {}
ROLE = {}
if os.path.exists(TBL):
    for _l in open(TBL, encoding='utf-8'):
        if _l.startswith('#') or not _l.strip(): continue
        _p = _l.rstrip('\n').split('\t')
        if len(_p) < 7: continue
        _k = (_p[2].split('_')[0], _p[3])
        if _p[1] != '안 남' or _k not in STAGE: STAGE[_k] = _p[1]
        ROLE.setdefault(_k, _p[4])
# ★★[VOICE_FROM_TABLE 2026-09-21] 목소리도 표에 묻습니다 — 제 파일의 voice 칸을 믿으면 안 됩니다.
#   44를 저장소가 진행(우성) 목소리로 옮겼는데 제 파일은 진희로 남아, **진희 묶음에 44가 들어가 있었습니다.**
#   진희 녹음을 멈춘 바로 그 순간에 진희가 안 할 말을 받을 뻔했습니다.
#   ★역할→목소리가 하나로 정해진 둘(안내=진희 · 진행=우성)만 대조합니다. 나머지는 추측하지 않습니다.
ROLE_VOICE = {'안내': '진희', '진행': '우성'}
voice_bad = []
# 내 클립 번호 → (표의 번호, 층)
LAYER = {'01a': ('01','narration'), '02a': ('02','narration'), '03a': ('03','narration'),
         '04a': ('04','narration'), '01c': ('01','cast'), '02c': ('02','cast'),
         '03c': ('03','cast'), '04c': ('04','cast'), '06w': ('06','cast'), '07w': ('07','cast'),
         '19c': ('19','cast'), '21c': ('21','cast'), '22c': ('22','cast'),
         '10b': ('10','cast'), '11b': ('11','cast'), '12b': ('12','cast'), '13b': ('13','cast'),
         '14b': ('14','cast'), '27b': ('27','cast'), '15n': ('87','narration')}
# ★손으로 적는 폐지 — 표의 「안 남」과 «진짜 폐지»를 표가 아직 구분 못 하는 자리입니다.
#   이유 없이 적지 않습니다. 그리고 표가 「폐지」로 말해 주면 여기서 지웁니다.
DEAD = {
 ('12','narration'): '큐째로 폐지(클로드코드 2026-09-20). 표에는 아직 「안 남」으로 나옵니다 — 「폐지」로 바꿔 달라고 부탁해 두었습니다',
}
dropped, asked = [], []

clips = []
for f in sorted(glob.glob('round[0-9].json')):
    d = json.load(open(f, encoding='utf-8'))
    for c in d['clips']:
        chg = [s for s in c['sents'] if s['old'] != s['new']]
        if not chg: continue
        _k = LAYER.get(c['no'], (c['no'], 'narration'))
        _st = STAGE.get(_k)
        if _k in DEAD:
            dropped.append((c['no'], c['slug'], DEAD[_k])); continue
        if _st == '폐지' or (_st is None and STAGE):
            dropped.append((c['no'], c['slug'], '표가 「폐지」' if _st else '표에 없음 — 클립째 사라졌습니다'))
            continue
        if _st == '안 남':
            asked.append((c['no'], c['slug']))
        _rv = ROLE_VOICE.get(ROLE.get(_k, ''))
        if _rv and c['voice'] != _rv:
            voice_bad.append((c['no'], c['slug'], c['voice'], ROLE.get(_k), _rv))
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

if dropped:
    print(f'\n★거른 것 {len(dropped)}개 — **녹음하지 않습니다**')
    for _n, _s, _w in dropped: print(f'  ✗ [{_n}_{_s}] {_w}')
if voice_bad:
    print(f'\n✗ 목소리 어긋남 {len(voice_bad)}개 — 표의 역할과 제 파일의 목소리가 다릅니다. **명단을 믿지 마십시오**')
    for _n, _s, _v, _r, _rv in voice_bad: print(f'  ✗ [{_n}_{_s}] 제 파일 {_v} · 표 «{_r}» → {_rv}')
if asked:
    print(f'\n★물어볼 것 {len(asked)}개 — 표에 「안 남」이지만 **제가 안 거릅니다**')
    print('  25·32 가 그랬듯 런타임 폴백으로 실제로 나가는 것이 있습니다. 코드 쪽에 확인하십시오.')
    for _n, _s in asked: print(f'  ? [{_n}_{_s}]')


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
