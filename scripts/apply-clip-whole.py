#!/usr/bin/env python3
# 클립을 «통째로» 코워크 판으로 맞춘다 [CLIP_WHOLE] (2026-09-20)
#
# ★왜 — 문장 단위(old→new)로 붙이니 29자리가 «못 찾음»으로 남았다. 원인은 하나다:
#   **코워크의 `old` 가 저장소의 지금 문면과 다르다.** 코워크는 자기 판에서 이어 작업했고,
#   그 사이 이쪽 문면이 달라진 자리가 여럿이다(`10#2` 는 쉼표 하나, `22c#0` 은 문장 전체).
#   old 를 열쇠로 쓰는 한 이 어긋남은 계속 난다 — 열쇠가 «남의 판»에 있기 때문이다.
#
# ★그래서 열쇠를 «지금 이쪽 문면»으로 옮긴다. manifest 가 클립마다 문장 배열을 들고 있으니
#   그것을 이어 붙인 것이 «지금 전문»이고, round json 의 new 를 이어 붙인 것이 «갈 전문»이다.
#   저장소에서 앞엣것을 찾아 뒤엣것으로 바꾼다. 문장이 늘거나 줄거나 자리가 바뀌어도 한 번에 간다.
#   ★[SUB_TRAP]·[CLIP_CTX] 가 한꺼번에 사라진다 — 전문은 길어서 남의 클립에 우연히 들어맞지 않는다.
import json, io, re, sys, glob

WRITE = '--write' in sys.argv
FILES = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
         'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs']
ALIAS = {'10b':'10','11b':'11','12b':'12','13b':'13','14b':'14','27b':'27','06w':'06','07w':'07',
         '19c':'19','21c':'21','22c':'22','01a':'01','02a':'02','03a':'03','04a':'04',
         '01c':'01','02c':'02','03c':'03','04c':'04'}
norm = lambda t: re.sub(r'\s+', ' ', t or '').strip()

M = json.loads(io.open('docs/plans/식순연구/타입캐스트/manifest.json', encoding='utf-8').read())
# ★(no, file) 로 잡는다 — no 만으로는 안내판/부부판이 겹친다([SLUG_NOT_KEY]).
NOW = {}
for c in M['clips']:
    NOW.setdefault(c['no'].lstrip('0') or '0', []).append(
        (c['file'], ' '.join(norm(s['text']) for s in c['sents'])))

# ★★[REJECT_38 2026-09-20] 코워크 38번 제안은 **안 받는다.**
#   제안: 「두 사람을 키워 주신 분들**께 인사를 드립니다.** 천천히 걸음을 옮겨 주십시오.
#         **인사를 드리는 동안**, 하객 여러분께서는 자리에 계셔 주시기 바랍니다.」
#   ① 한 클립에 「인사」가 **두 번**이다 — 코워크 자신의 «닳은 낱말» 기준에 걸린다.
#   ② 순서가 어긋난다 — «인사를 드립니다»(완료) → «걸음을 옮겨 주십시오»(이동) → «인사를 드리는 동안»(진행).
#      인사를 먼저 선언해 놓고 걸어가라고 한다.
#   지금 판(「분들**이 앞에 계십니다**」)은 상황 → 이동 → 진행으로 이어진다. 이 문장은 2026-09-20 에
#   N2 위반(한 문장 3인칭+2인칭 혼용)을 풀며 둘로 가른 결과이고, 게이트가 그것을 지키고 있다.
REJECT_CLIP = {('38', 'tribute-in'),
               # ★★[STALE_NEW 2026-09-21] 코워크 round json 의 `new` 가 «제안»이 아니라
               #   «그때의 저장소 문면»일 수 있다. 그 사이 이쪽이 고쳤으면 그대로 **역전**이 된다.
               #   실제 사고 직전에 잡았다 — 39 의 new 가 「오늘 두 집안은 서로의 가족이 되었습니다」였다.
               #   그 문장은 2026-09-20 에 [ECHO_TRIBUTE_DECLARE] 로 「오늘로 두 집안은 한 가족입니다」로
               #   바꾼 것이다(선언 30 과 어미 「되었습니다」가 잇달아 겹쳐서). 코워크 열넷째 판 §3 표에
               #   39 는 **한 줄도 없다** — 즉 이건 제안이 아니라 낡은 사본이다.
               #   ★가려내는 법: «표에 있나»를 본다. json 에만 있고 표에 없으면 제안이 아니다.
               ('39', 'tribute-out')}

srcs = {f: io.open(f, encoding='utf-8').read() for f in FILES}
orig = dict(srcs)
done, same, miss = [], 0, []
for f in sorted(glob.glob('scripts/audit/copycheck/round[0-9].json')):
    d = json.loads(io.open(f, encoding='utf-8').read())
    for c in d['clips']:
        if (c['no'], c['slug']) in REJECT_CLIP: continue
        want = ' '.join(norm(s['new']) for s in c['sents'] if norm(s['new']))
        if not want: continue
        key = ALIAS.get(c['no'], c['no']).lstrip('0') or '0'
        cands = NOW.get(key, [])
        # ★★[SLUG_STRICT] 슬러그가 안 맞으면 **건너뛴다. 추측하지 않는다.**
        #   첫 판은 «전문이 저장소에 있는 아무 후보»로 떨어졌고, 번호가 겹치는 자리에서 그대로 당했다 —
        #   `19c`(1인칭 입장 B)가 **노래 클립**에, `21c` 가 **선언 예고**에, `22c` 가 **덕담 예고**에 붙었다.
        #   코워크가 미리 경고한 그 충돌이다(배역 19·21·22 ↔ 진행 21·22). 번호는 열쇠가 아니다([SLUG_NOT_KEY]).
        want_slug = c['slug'].replace('-1인칭', '')
        pick = [t for s2, t in cands if s2 == want_slug]
        hit = next((t for t in pick if t and any(t in norm(v) for v in srcs.values())), None)
        if hit is None:
            if any(want in norm(v) for v in srcs.values()): same += 1
            else: miss.append((c['no'], c['slug'], '슬러그 못 맞춤' if not pick else '전문이 저장소에 없음'))
            continue
        if hit == want: same += 1; continue
        n = 0
        for f2 in FILES:
            # 원문은 공백이 접혀 있지 않을 수 있다 — 정규화한 자리를 원문에서 되찾는다
            pat = re.compile(r'\s+'.join(map(re.escape, hit.split(' '))))
            srcs[f2], k = pat.subn(want, srcs[f2]); n += k
        if n: done.append((c['no'], c['slug'], hit, want, n))
        else: miss.append((c['no'], c['slug']))

print('=== 바꿀 클립 %d · 이미 같음 %d · 못 찾음 %d ===\n' % (len(done), same, len(miss)))
for no, slug, a, b, n in done:
    print('[%s] %s  %d곳' % (no, slug, n))
    print('   전: %s' % a[:100]); print('   후: %s' % b[:100])
if miss:
    print('\n--- 못 찾음 %d ---' % len(miss))
    for m in miss[:12]: print('   ', m)
if WRITE:
    for f in FILES:
        if srcs[f] != orig[f]: io.open(f, 'w', encoding='utf-8').write(srcs[f]); print('\n✓ 썼다: %s' % f)
else:
    print('\n(드라이런 · --write 로 반영)')
