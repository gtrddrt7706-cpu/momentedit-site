# -*- coding: utf-8 -*-
"""찍은 그림이 «빈 상자»가 아닌지 기계로 잰다 [SHOT_BLANK]
   선택자 검사가 ✅여도 스크롤 애니메이션 때문에 흰 화면이 찍힐 수 있다(2026-09-14 실제 사고).

   ★★2026-09-14 두 번째 사고 — 기준이 세 가지로 늘어난 이유
     fullPage 로 바꾸자 03_청첩장_실물.png 이 3,617px 짜리 «거의 빈 띠»로 나왔다.
     스크롤로 나타나는 페이지를 통째로 찍으니 화면에 들어온 적 없는 구간이 백지로 남은 것이다.
     그런데 종전 검사는 그것을 «ok» 로 통과시켰다 — 고유 색 4,902가지 · 최다색 91.5%.
     위쪽 한 화면에 내용이 있으면 색 수가 충분해지고, 최다색도 97%에 못 미친다.
     ★«전체 평균»으로 재면 «부분이 통째로 빈 것»을 못 잡는다. 대표가 눈으로 잡았다.

   그래서 셋을 함께 본다.
     ① 고유 색 300가지 미만 — 아예 단색
     ② 최다색 97% 이상 — 거의 단색
     ③ ★빈 줄 비율 — 가로 한 줄이 «거의 한 색»인 행이 전체의 65% 이상
        (긴 세로 그림에서 «아래가 통째로 백지»인 경우가 여기서 잡힌다)
     ③은 짧은 그림에서는 오탐이 날 수 있어 높이 1,200px 이상에만 건다.
     짧은 카드 그림은 여백이 많은 것이 정상이다."""
import sys, os, glob
from PIL import Image

ROW_BLANK_RATIO = 0.65     # 빈 줄이 이보다 많으면 빨강
TALL = 1200                # ③ 을 거는 높이

d = sys.argv[1]
bad = 0
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    small = im.resize((min(w, 400), min(h, 1200)))
    cols = small.getcolors(maxcolors=1 << 24) or []
    n = len(cols)
    top = max(c[0] for c in cols) / float(small.size[0] * small.size[1]) if cols else 1.0

    # ③ 행 단위 — 한 줄 안에서 가장 흔한 색이 99% 이상이면 «빈 줄»
    sw, sh = small.size
    px = small.load()
    empty = 0
    for y in range(sh):
        cnt = {}
        for x in range(0, sw, 2):
            c = px[x, y]; cnt[c] = cnt.get(c, 0) + 1
        if max(cnt.values()) / float(len(range(0, sw, 2))) >= 0.99:
            empty += 1
    rows = empty / float(sh)

    why = []
    if n < 300: why.append('색 %d가지' % n)
    if top > 0.97: why.append('최다색 %.1f%%' % (top * 100))
    if h >= TALL and rows >= ROW_BLANK_RATIO: why.append('★빈 줄 %.0f%%' % (rows * 100))
    blank = bool(why)
    print('  %s %-28s %4dx%-5d 색 %5d · 최다색 %5.1f%% · 빈줄 %4.0f%%  %s'
          % ('❌빈그림' if blank else '  ok  ', os.path.basename(p), w, h, n, top * 100, rows * 100,
             ('← ' + ' · '.join(why)) if blank else ''))
    if blank: bad += 1
print('  → 빈 그림 %d장' % bad)
sys.exit(1 if bad else 0)
