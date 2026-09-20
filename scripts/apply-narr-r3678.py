#!/usr/bin/env python3
# 코워크 3·6·7·8회차 문안을 넣는다 [NARR_R3678] (2026-09-20)
#
# ★왜 한꺼번에 — round3(성혼선언)·round6(미진단 17)이 **통째로 저장소에 안 들어가 있었다.**
#   코워크가 「구간을 물려받아 하객맞이 여덟을 빠뜨렸다」고 고백했는데, 받는 쪽인 나도 같은 짓을 했다:
#   zip 이 올 때마다 자가시험만 보고 문안 적용을 건너뛴 회차가 둘이다.
#   ★그래서 이 스크립트는 «이번 회차»가 아니라 **round0~8 전부**를 훑고, 아직 안 들어간 것만 넣는다.
#     회차를 세지 않는다 — 파일에 있나 없나만 본다([NOT_THE_SOURCE]).
#
# ★[COPY_THREE] 문안은 세 벌이다. 한 벌만 고치면 나머지로 샌다.
# ★[NARV_ZERO] NARR.x 와 NARV.x[0] 은 항상 같아야 한다 → 전역 치환이라 둘 다 함께 간다.
import json, glob, io, sys, re

# ★★[SRC_FOUR 2026-09-20] 문안 원천은 «세 벌»이 아니다. [COPY_THREE] 는 «하객 안내»에 한정된 규칙인데
#   내가 그것을 문안 전체의 목록으로 읽어 첫 판에서 33건을 «못 찾음»으로 흘렸다.
#   · assets/ritual-cue.js 의 var EXTRA — 식순 밖 클립(폐식·배웅·온라인·응답형)의 문면이 여기 산다.
#     ★그 파일 머리글은 「문안·시간은 절대 여기 적지 않는다」고 적어 두었다. **그 말이 사실이 아니다.**
#   · scripts/build-dubbing-script.mjs — 43_parents-letter 낭독본(화면 parents.html 과 의도적으로 다른 벌)
FILES = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
         'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs']
WRITE = '--write' in sys.argv

# ★★[LOCKED_PROPOSAL] 이 걸러 낸 여덟 중 판정이 갈린 것들. 근거는 「사장님이 적으셨다」로 끝내지 않는다([BOSS_HINT]).
REJECT = {
 ('02a', 1): '십 분 전 안내가 할 일은 착석 하나다. 다과가 있다는 사실은 도착 안내(01a)가 이미 말하고, '
             '바로 뒤 03a「자리로 가 주시기 바랍니다」·04a「곧 시작하겠습니다」와 한 흐름이라 '
             '여기서 먹기를 권하면 흐름이 뒤로 간다. 코워크가 걱정한 「아무도 안 먹는다」는 도착 시점에서 풀 일이다. '
             '사장님이 2026-09-14 에 두 번 정하셨다([GUEST_TONE]①「간단한 다과」·②「편히 드시면 이것도 빼자」). '
             '★「~다」 3연속은 합쇼체 안내의 장르 정상이다 — 에세이 자로 재지 않는다(CLAUDE.md humanize 규칙).',
 ('43', 12): '「식사 자리도」 → 「식사도」는 **뜻이 바뀐다.** 우리는 인근 식당을 «안내»하지 식사를 «제공»하지 않는다. '
             '바로 다음 문장이 「저희가 확인한 인근 식당을 안내해 드리고」라 한 문단 안에서 어긋나고, '
             '「책임질 수 없는 안심 금지」(2026-07-15 사장님 지시)에 걸린다. '
             '★[PAR_DINE] 이 지키는 것은 「식사」라는 말의 존재라 그쪽은 안 깨지지만, 깨지는 것은 사실 쪽이다. '
             '「식사 / 자리」 치찰음은 성우 쪽 일이다 — 뜻을 바꿔서 풀 문제가 아니다.',
}
# 뜻은 받고 낱말만 고쳐 넣는 것 — 잠긴 결정을 지키면서 코워크의 목적(음절 낙차)도 살린다.
OVERRIDE = {
 ('04a', 2): ('순서도 이 안내도, 두 사람이 정했습니다.',
              '코워크의 「골랐습니다」는 [GUEST_TONE]③ 이 명시적으로 뺀 낱말이다 — 「고른」은 «남이 차린 것에서 집었다»는 '
              '말이라, 두 사람이 직접 만든 예식이라는 이 상품의 뿌리와 정면으로 어긋난다. '
              '「정했습니다」로 바꾸면 그 결정을 지키면서 27음절→16음절 낙차는 그대로 얻는다.'),
 ('04c', 1): ('순서도 이 안내도, 저희가 정했어요.', '위와 같음(두 분 목소리판).'),
 # 코워크가 §4 에서 「디지털 참석이 상품 용어입니까」 하고 물었다. 실측 — index.html 32회·inquiry 7회·
 # mypage 2회·parents 2회 + GAS 4파일. 상품 이름이 맞다. 그 낱말만 되살리고 나머지 다듬기는 받는다.
 # 「참석 / 자리」 치찰음은 남지만 그건 코워크 말대로 성우 쪽 일이다 — 이름을 지워서 풀 문제가 아니다.
 ('43', 27): ('멀리 계시거나 몸이 편치 않아 못 오시는 분들께는, 외부에 공개되지 않는 디지털 참석 자리를 따로 마련해 드립니다.',
              '「디지털 참석」은 상품 용어다(위 실측). 빼면 혼주가 그게 무엇인지 모른다.'),
}

srcs = {f: io.open(f, encoding='utf-8').read() for f in FILES}
orig = dict(srcs)
syl = lambda s: len(re.findall(r'[가-힣]', s))

done, skip, unknown, rejected = [], [], [], []
for f in sorted(glob.glob('scripts/audit/copycheck/round[0-9].json')):
    d = json.loads(io.open(f, encoding='utf-8').read())
    for c in d['clips']:
        for s in c['sents']:
            old, new = s['old'], s['new']
            k = (c['no'], s['i'])
            if k in REJECT:
                rejected.append((c['no'], s['i'], old, new, REJECT[k])); continue
            if k in OVERRIDE:
                new = OVERRIDE[k][0]
            if old == new or not old.strip():
                continue
            # ★★[SUB_TRAP] «이미 들어갔나»를 **먼저** 본다. old 가 new 의 부분 문자열이면
            #   (「서로를 바라봐 주세요」 ⊂ 「잠시, 서로를 바라봐 주세요」) 이미 고친 자리가 다시 잡혀
            #   「잠시, 잠시, 서로를…」이 된다. 드라이런에서 13곳이 그렇게 걸렸다.
            if new.strip() and any(new in srcs[f2] for f2 in FILES):
                skip.append((c['no'], s['i'], new)); continue
            hits = sum(srcs[f2].count(old) for f2 in FILES)
            if hits == 0:
                unknown.append((c['no'], s['i'], old, new)); continue
            # ★문장 «삭제» 제안(new 가 빈 칸)은 치환이 아니다 — 붙어 있는 공백까지 함께 걷어낸다.
            #   한 클립이 문자열 하나라 그냥 ''로 바꾸면 두 칸 공백이 남는다.
            for f2 in FILES:
                if old not in srcs[f2]: continue
                if not new.strip():
                    if (old + ' ') in srcs[f2]:   srcs[f2] = srcs[f2].replace(old + ' ', '')
                    elif (' ' + old) in srcs[f2]: srcs[f2] = srcs[f2].replace(' ' + old, '')
                    else:                         srcs[f2] = srcs[f2].replace(old, '')
                else:
                    srcs[f2] = srcs[f2].replace(old, new)
            done.append((c['no'], s['i'], old, new or '(문장 삭제)', hits))

print('=== 넣을 것 %d · 이미 있음 %d · 못 찾음 %d · 거부 %d ===\n' % (len(done), len(skip), len(unknown), len(rejected)))
for no, i, old, new, h in done:
    print('[%s]#%s  %d곳' % (no, i, h))
    print('   전: %s  (%d음절)' % (old, syl(old)))
    print('   후: %s  (%d음절)' % (new, syl(new)))
if unknown:
    print('\n--- 못 찾음(손으로 판단) %d건 ---' % len(unknown))
    for no, i, old, new in unknown:
        print('[%s]#%s\n   전: %s\n   후: %s' % (no, i, old[:70], new[:70]))
if rejected:
    print('\n--- 거부 %d건 ---' % len(rejected))
    for no, i, old, new, why in rejected:
        print('[%s]#%s  그대로 둔다: %s\n   코워크안: %s\n   왜: %s' % (no, i, old, new, why))

if WRITE:
    for f in FILES:
        if srcs[f] != orig[f]:
            io.open(f, 'w', encoding='utf-8').write(srcs[f])
            print('\n✓ 썼다: %s' % f)
else:
    print('\n(드라이런 · 실제로 쓰려면 --write)')
