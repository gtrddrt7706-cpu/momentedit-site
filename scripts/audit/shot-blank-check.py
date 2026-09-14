# -*- coding: utf-8 -*-
"""찍은 그림이 «빈 상자»가 아닌지 기계로 잰다 [SHOT_BLANK]
   선택자 검사가 ✅여도 스크롤 애니메이션 때문에 흰 화면이 찍힐 수 있다(2026-09-14 실제 사고).
   기준: 고유 색 300가지 «미만»이거나 가장 흔한 색이 97% 이상.
   ★2026-09-14 기준을 느슨하게 고쳤다 — 처음에 「최다색 92% 이상」으로 잡았더니
     마이페이지 «일곱 줄»(흰 바탕에 글자만 있는 목록)이 멀쩡한데도 빨강이 됐다.
     흰 바탕 UI 는 최다색 비율이 원래 높다. CLAUDE.md 의 「기준은 한도에 비례시킨다」와 같은 병이고,
     빨강이 잦으면 사람이 빨강을 안 보게 된다. 고유 색 수가 진짜 신호다."""
import sys, os, glob
from PIL import Image
d = sys.argv[1]
bad = 0
for p in sorted(glob.glob(os.path.join(d, '*.png'))):
    im = Image.open(p).convert('RGB')
    w, h = im.size
    small = im.resize((min(w, 400), min(h, 1200)))
    cols = small.getcolors(maxcolors=1 << 24) or []
    n = len(cols)
    top = max(c[0] for c in cols) / float(small.size[0] * small.size[1]) if cols else 1.0
    blank = (n < 300) or (top > 0.97)
    print('  %s %-28s %4dx%-5d 색 %5d · 최다색 %5.1f%%' % ('❌빈그림' if blank else '  ok  ', os.path.basename(p), w, h, n, top * 100))
    if blank: bad += 1
print('  → 빈 그림 %d장' % bad)
sys.exit(1 if bad else 0)
