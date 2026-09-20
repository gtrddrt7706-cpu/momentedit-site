#!/usr/bin/env python3
# [CUE_READ_APPLY] 큐 «순서»를 알고서야 보인 것들을 반영한다 (2026-09-20)
#
# ★왜 이 회차가 따로 있나 — 순서 없이는 못 보던 병이다
#   코워크가 식순을 손으로 지어내고 있었고, 그 위에서 판정하니 **없는 병을 고치고 있는 병을 놓쳤다.**
#   [CUE_ORDER_TEXT] 로 실제 차례를 보내자 그쪽 걱정 둘이 취소되고 다섯이 새로 나왔다.
#   전부 «한 클립 안»이 아니라 «이웃한 클립 사이»라, 클립 단위 검사로는 영영 안 잡히는 것들이다.
#     「이제」 5회 중 셋이 18·20·21 연달아 · 44와 60이 같은 말 · 26과 64가 같은 지시 ·
#     45 「일어나셔서」인데 그 앞이 단체사진이라 이미 서 있다
#
# ★★[TSV_IS_THE_LIST] 무엇을 고치는지는 **표에만** 적는다. 코드에 문면을 박지 않는다.
#   박아 두면 다음 회차에 표와 코드가 갈라지고, 갈라진 날 어느 쪽이 참인지 알 수 없다.
#
# ★[NO_SILENT_SKIP] 못 찾으면 아무것도 쓰지 않고 멈춘다(apply-tone-text 와 같은 규칙).
#
#   python3 scripts/apply-cue-read.py [--dry]
import io, csv, sys, subprocess

TSV = 'docs/plans/식순연구/큐순서읽기_반영_20260920.tsv'
# ★★[SRC_FOUR] 문안은 **다섯** 곳에 산다. 처음에 ritual-cue.js 를 빠뜨렸더니 44·45 가
#   「어느 파일에서도 못 찾음」으로 떨어졌다 — 식순 «밖» 클립(EXTRA)이 거기 살기 때문이다.
#   cue.js 머리글은 「문안·시간은 절대 여기 적지 않는다」고 적어 두었는데 사실이 아니다.
# ★pick-*.html(되돌리기 판)은 **일부러 뺀다.** 그건 「예전 문장」을 보여 주는 스냅샷이라
#   함께 고치면 사장님이 보시는 대조가 틀어진다.
SRC = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
       'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs']
DRY = '--dry' in sys.argv

rows = list(csv.DictReader(io.open(TSV, encoding='utf-8'), delimiter='\t'))
assert len(rows) >= 5, '표를 %d줄밖에 못 읽었다 — 모양이 깨졌다' % len(rows)

buf = {p: io.open(p, encoding='utf-8').read() for p in SRC}
done, skip = [], []
for r in rows:
    old, new = r['전'].strip(), r['후'].strip()
    tag = '%s_%s#%s' % (r['번호'], r['슬러그'], r['문장'])
    hits = [p for p in SRC if old in buf[p]]
    if not hits:
        # ★★[IDEMPOTENT] 표는 회차마다 «쌓인다». 이미 넣은 줄은 「전」이 없고 「후」가 있다.
        #   그걸 「못 찾음」으로 세면 **한 줄만 새로 넣어도 전체가 멈춘다.**
        #   apply-tone-cull 에서 같은 실수를 한 번 했다 — 두 번째 실행이 통째로 실패했다.
        if any(new in buf[p] for p in SRC): done.append((tag, '이미 반영됨')); continue
        skip.append((tag, '전·후 어느 쪽도 못 찾음')); continue
    for p in hits: buf[p] = buf[p].replace(old, new)
    done.append((tag, '%d파일 · %s' % (len(hits), ', '.join(x.split('/')[-1] for x in hits))))

print('[CUE_READ_APPLY] 반영 %d · 못한 것 %d' % (len(done), len(skip)))
for t, w in done: print('  ✓ %-24s %s' % (t, w))
for t, w in skip: print('  ✗ %-24s %s' % (t, w))
if skip:
    print('\n★ 못 찾은 자리가 있어 아무 파일도 쓰지 않았다.'); sys.exit(1)
if DRY:
    print('\n(--dry · 쓰지 않음)'); sys.exit(0)
for p in SRC: io.open(p, 'w', encoding='utf-8').write(buf[p])
print('\n썼다.')
