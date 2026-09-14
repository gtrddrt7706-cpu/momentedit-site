# -*- coding: utf-8 -*-
"""세로로 긴 화면 캡처를 «신문 단»처럼 잘라 가로로 붙인다 [SHOT_COLUMNS]

대표 질문(2026-09-14): *「사진을 이렇게 한번에 올리면 깨지지 않을까? 아니라면 부분부분
나눠서 올리는 건 어때? 한번에 올리는 게 좋긴 한데 깨질까 봐 방법을 찾아봐」*

★진짜 위험은 «깨짐»이 아니라 «작아져서 못 읽힘»이다.
  파일은 PNG 무손실이라 화질이 깨질 일은 없다. 문제는 비율이다 —
  어른 안내 사진은 세로가 가로의 **9.8배**라, 보는 쪽이 높이에 맞춰 줄이면
  가로가 10분의 1로 쪼그라들어 글자가 사라진다(대표가 보신 그 화면).

★그렇다고 «나눠서 여러 장»으로 올리면 열 장 한도를 금방 먹는다.
  세 화면만 3등분해도 아홉 장이다. 한 화면이 한 장이어야 «이 제품이 이렇게 생겼다»가 남는다.

그래서 자르되 «따로 올리지 않고» 한 장 안에서 옆으로 잇는다.
읽는 순서를 잃지 않도록 단마다 번호와 구분선을 넣는다.

  N = round(sqrt((h/w) / 목표비))   · 목표비 1.2 = 세로가 가로의 1.2배(읽기 좋은 비)
  결과 비 = (h/N) / (N*w)

  $ python3 scripts/audit/shot-columns.py <넣을폴더> <나올폴더>
"""
import sys, os, glob, math
from PIL import Image, ImageDraw

TARGET = 1.2      # 목표 «세로/가로»
SPLIT_OVER = 2.6  # 이 비를 넘을 때만 단으로 나눈다 (그 아래는 그냥 둔다)
GUT = 28          # 단 사이 여백
PAD = 20          # 바깥 여백
BG = (247, 246, 243)
LINE = (214, 208, 198)
NUM = (150, 120, 80)

def columnize(src, dst):
    im = Image.open(src).convert('RGB')
    w, h = im.size
    ratio = h / float(w)
    if ratio <= SPLIT_OVER:
        im.save(dst)
        return 1, ratio, ratio
    n = max(2, int(round(math.sqrt(ratio / TARGET))))
    ch = int(math.ceil(h / float(n)))                      # 단 하나의 높이
    W = PAD * 2 + n * w + (n - 1) * GUT
    H = PAD * 2 + ch
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    for i in range(n):
        top = i * ch
        part = im.crop((0, top, w, min(h, top + ch)))
        x = PAD + i * (w + GUT)
        out.paste(part, (x, PAD))
        d.rectangle([x - 1, PAD - 1, x + w, PAD + part.size[1]], outline=LINE)
        # 단 번호 — 읽는 순서를 잃지 않게
        d.ellipse([x + w - 34, PAD + 10, x + w - 10, PAD + 34], fill=(255, 255, 255), outline=NUM)
        d.text((x + w - 25, PAD + 16), str(i + 1), fill=NUM)
        if i < n - 1:                                       # 이어짐 표시
            mx = x + w + GUT // 2
            d.line([mx, PAD + ch // 2 - 10, mx, PAD + ch // 2 + 10], fill=LINE, width=2)
    out.save(dst)
    return n, ratio, (ch / float(W))

if __name__ == '__main__':
    src_dir, dst_dir = sys.argv[1], sys.argv[2]
    os.makedirs(dst_dir, exist_ok=True)
    print('%-22s %11s %6s  %-11s %6s' % ('파일', '종전', '세로배', '→ 지금', '세로배'))
    for p in sorted(glob.glob(os.path.join(src_dir, '*.png'))):
        name = os.path.basename(p)
        q = os.path.join(dst_dir, name)
        n, before, after = columnize(p, q)
        a = Image.open(p).size
        b = Image.open(q).size
        print('%-22s %5dx%-5d %5.1f배  %5dx%-5d %5.1f배 %s'
              % (name, a[0], a[1], before, b[0], b[1], after,
                 ('← %d단으로 나눔' % n) if n > 1 else ''))
