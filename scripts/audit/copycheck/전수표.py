#!/usr/bin/env python3
# 전수표 [FULL_ROSTER] — 2026-09-20
#
# 왜 — 회차를 «진단서가 나눠 놓은 구간»에서 가져왔더니 하객맞이 여덟이 통째로 빠졌다.
#   6회차에서 «첫인사 구간이 아예 없어서 17클립이 대상 밖이었다»를 찾아 놓고도 같은 짓을 했다.
#   ★남이 나눈 구간표를 물려받지 않는다. 클립 전수 목록에서 시작해 하나씩 지운다.
#   이 표에 «미착수»가 하나라도 있으면 끝난 게 아니다.
import json, re, glob, sys, collections, os
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
HERE = os.path.dirname(os.path.abspath(__file__))

# 내 회차 키 → 01번 파일의 (번호, 슬러그)
ALIAS = {'10b': ('10','letter-parent'), '11b': ('11','letter-each'), '12b': ('12','bless-father'),
         '13b': ('13','bless-mother'), '14b': ('14','tribute'), '27b': ('27','tribute-reply'),
         '06w': ('06', 'welcome-groom'), '07w': ('07', 'welcome-bride'),
         '19c': ('19', 'entry-B'), '21c': ('21', 'entry-D'), '22c': ('22', 'entry-E'),
         '01a': ('01', 'guest-1-arrival'), '02a': ('02', 'guest-2-10min'),
         '03a': ('03', 'guest-3-5min'), '04a': ('04', 'guest-4-1min'),
         '01c': ('01', 'guest-1'), '02c': ('02', 'guest-2'),
         '03c': ('03', 'guest-3'), '04c': ('04', 'guest-4')}

done = {}   # (no, slug) -> (회차, 고친 문장 수, 전체 문장 수)
for f in sorted(glob.glob(os.path.join(HERE, 'round[0-9].json'))):
    d = json.load(open(f, encoding='utf-8'))
    for c in d['clips']:
        key = ALIAS.get(c['no'], (c['no'], c['slug']))
        ch = sum(1 for s in c['sents'] if s['old'] != s['new'])
        done[key] = (d['round'], ch, len(c['sents']))

# ★★[ROSTER_SRC · 저장소 판] 코워크 판은 여전히 `01_현재_나가는_문안_전체.txt` 를 읽고 주석만 달았다.
#   그 파일은 **내가 뽑아 보낸 중간 산출물**이라 저장소에 없고, 뽑은 날짜로 굳어 있다.
#   ★목록을 지키자고 만든 검사가 낡은 목록을 읽으면 그게 제일 나쁘다([NOT_THE_SOURCE]).
#   → 원천(manifest + ritual-cue 의 RETIRED)에서 바로 세운다. 어디서 실행해도 같은 답이 나온다.
#   ★그래서 코워크가 손으로 붙인 `26_vow-both` 한 줄도 여기서는 필요 없다 — 원천이 이미 갖고 있다.
_M = json.load(open(os.path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), encoding='utf-8'))
_cue = open(os.path.join(ROOT, 'assets/ritual-cue.js'), encoding='utf-8').read()
_b = re.search(r'var RETIRED = \{(.*?)\};', _cue, re.S)
_RET = set(re.findall(r"'([^']+)'\s*:\s*1", _b.group(1))) if _b else set()
_V = _M.get('voice', {})
rows = [(c['no'], c['file'], c.get('role', '?'), _V.get(c.get('role'), '?'), len(c['sents']))
        for c in _M['clips'] if c['file'] not in _RET]

# ★★[ROSTER_SRC 2026-09-20 · 코드 회신] 이 표의 «원천»이 틀렸습니다.
#   01_현재_나가는_문안_전체.txt 는 **제가 뽑아 보낸 중간 산출물**이라 저장소에 없고 날짜로 굳어 있습니다.
#   클로드코드가 원천(manifest + RETIRED)에서 바로 세웠더니 **91이 아니라 92**로 나왔습니다.
#   빠진 하나가 26_vow-both 이고 **빠뜨린 것은 제 파일**입니다. 저는 그 91을 전수로 믿었습니다.
#   ★교훈이 앞의 둘과 같습니다 — «남이 만든 목록»이 아니라 «원천»에서 세워야 합니다.
#     제 손으로 전수표를 만들면서도 입력은 또 물려받은 것을 썼습니다. 네 번째입니다.
#   ★여기서는 빠진 하나를 손으로 붙여 둡니다. 저장소 쪽은 원천에서 세우도록 고쳐졌습니다.
# ★위 [ROSTER_SRC] 로 원천에서 세우므로 손으로 붙이지 않는다(코워크 판의 그 줄은 뺐다).

# 일부러 안 건드린 것 — 이유를 반드시 적는다. 이유 없는 «안 함»은 누락이다.
SKIP = {
 ('08','vow-groom'):   '사장님이 「다시」를 안 누르셨고, 한 줄 한 줄이 게이트에 묶여 있다(VOW_OPENS_COLD·CHAR_ONE·DUP_ONCE)',
 ('09','vow-bride'):   '사장님이 「다시」를 안 누르셨고, 끝 두 줄이 VOW_ECHO 장치다(한쪽만 고치면 짝이 죽는다)',
 ('24','vow-both-1'):  '합창 재료다. 예식에서 이대로 안 나가고 26_vow-both 로 겹쳐 나간다',
 ('25','vow-both-2'):  '위와 같음. 글자가 24와 같아야 겹친 소리가 웅얼거리지 않는다',
 ('18','entry-A'):     '짝인 3인칭 05(A)를 1회차에서 고쳤다 — 함께 볼 자리이나 배역 녹음이 걸려 별도 판단이 필요하다',
 ('20','entry-C'):     '위와 같음(짝 07)',
 ('23','entry-F'):     '위와 같음(짝 10)',
 ('26','vow-both'):    '24·25를 겹쳐 만드는 합창 결과물이라 내 문안이 따로 없다. 24·25를 고치지 않기로 한 판단이 이 클립을 덮는다',
 ('15','toast'):       '사장님 「친구부분멘트 아예 삭제」 — 삭제 대상이라 문안을 고치지 않는다',
}
LETTERS = {('10','letter-parent'),('11','letter-each'),('12','bless-father'),
           ('13','bless-mother'),('14','tribute'),('27','tribute-reply'),('43','parents-letter')}

out = []
cnt = collections.Counter()
for i,(no,slug,role,voice,ns) in enumerate(rows,1):
    k=(no,slug)
    if k in done:
        r,ch,tot = done[k]
        st = f'✅ {r}회차 · {ch}/{tot} 고침' if ch else f'◻ {r}회차 · 전부 유지'
        cnt['본 것'] += 1
    elif k in SKIP:
        st = '⛔ 일부러 안 건드림'; cnt['사유 있는 제외'] += 1
    elif k in LETTERS:
        st = '📄 편지·덕담 본문 (다른 자로 봄)'; cnt['편지'] += 1   # 8회차에서 같은 자로 다시 잼
    else:
        st = '❌ 미착수'; cnt['미착수'] += 1
    out.append((i,no,slug,role,voice,int(ns),st,SKIP.get(k,'')))

w=max(len(r[2]) for r in out)
print(f"{'#':>3} {'클립':<6}{'슬러그':<{w+2}}{'역할':<7}{'문장':>3}  상태")
print('─'*(w+46))
for i,no,slug,role,voice,ns,st,why in out:
    print(f"{i:>3} [{no}]  {slug:<{w+2}}{role:<7}{ns:>3}  {st}")
    if why: print(f"{'':>{w+14}}  └ {why}")
print('─'*(w+46))
print(' · '.join(f'{k} {v}' for k,v in cnt.items()), f"· 합계 {len(out)}")
sys.exit(1 if cnt['미착수'] else 0)
