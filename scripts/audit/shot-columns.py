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
SPLIT_OVER = 2.8  # 이 비를 넘으면 단으로 나눈다 (좌우 여백을 없앤 뒤 기준 · 대표 「너무 길어지면 잘라서 2줄로」)
GUT = 28          # 단 사이 여백
PAD = 20          # 바깥 여백
BG = (247, 246, 243)
LINE = (214, 208, 198)
NUM = (150, 120, 80)

def _bg(im):
    """★바탕색은 «자르기 전» 원본 가장자리에서 잰다.
    좌우 여백을 먼저 자르면 가장자리가 카드 안쪽(흰색)이 되어, 카드 속 흰 줄이
    «카드 사이 여백»으로 잡힌다 — 실제로 단이 카드 한가운데를 갈랐다(2026-09-14 눈으로 잡음)."""
    from collections import Counter
    w, h = im.size; px = im.load(); c = Counter()
    for y in range(0, h, 3):
        c[px[1, y]] += 1; c[px[w - 2, y]] += 1
    return c.most_common(1)[0][0]


def trim(im):
    """위아래·좌우로 «완전히 빈 줄»을 잘라낸다.
    ★2026-09-14 실측 — 마이페이지 다이닝 위저드는 높이 100%% 통 안에서 세로 가운데 정렬이라
      4,200px 로 찍으면 위쪽 1,000px 이 통째로 빈다. 그대로 단을 나누면 1단이 백지가 된다.
      «찍을 때 잘 찍는다»로는 못 막는다(요소의 바깥 상자가 화면 높이 그대로다). 그래서 자른다."""
    w, h = im.size
    px = im.convert('RGB').load()
    def blank(y):
        c = {}
        for x in range(0, w, 4):
            v = px[x, y]; c[v] = c.get(v, 0) + 1
        return max(c.values()) / float(len(range(0, w, 4))) >= 0.995
    top = 0
    while top < h - 1 and blank(top): top += 1
    bot = h - 1
    while bot > top and blank(bot): bot -= 1
    top = max(0, top - 24); bot = min(h - 1, bot + 24)      # 숨 쉴 여백은 남긴다

    return im.crop((0, top, w, bot + 1)), _bg(im)


def side_trim(im):
    """좌우 «완전히 빈 칸»을 잘라낸다 (2026-09-14 대표 지시 「좌우 여백 날리고 확대해서」).
    ★단을 나눈 «뒤»에 한다. 먼저 하면 페이지 여백이 사라져 카드 테두리를 못 보고,
      카드 안쪽 여백까지 «카드 사이»로 잡아 단이 카드 한가운데를 가른다(실측으로 확인)."""
    w, h = im.size; px = im.load()
    def blank_col(x):
        c = {}
        c = {}
        for y in range(0, h, 4):
            v = px[x, y]; c[v] = c.get(v, 0) + 1
        return max(c.values()) / float(len(range(0, h, 4))) >= 0.995
    left = 0
    while left < w - 1 and blank_col(left): left += 1
    right = w - 1
    while right > left and blank_col(right): right -= 1
    left = max(0, left - 18); right = min(w - 1, right + 18)
    return im.crop((left, 0, right + 1, h))


def columnize(src, dst):
    im, BGC = trim(Image.open(src).convert('RGB'))
    w, h = im.size
    # ★몇 단으로 나눌지는 «좌우 여백을 뗀 뒤» 비로 정한다(그게 실제로 보이는 모양이다).
    #   자르는 «자리»는 여백이 남아 있는 원본에서 찾는다 — 카드 테두리가 거기에만 보인다.
    probe = side_trim(im)
    ratio = probe.size[1] / float(probe.size[0])
    if ratio <= SPLIT_OVER:
        one = side_trim(im)
        one.save(dst)
        return 1, ratio, one.size[1] / float(one.size[0])
    n = max(2, int(round(math.sqrt(ratio / TARGET))))
    ch = int(math.ceil(h / float(n)))                      # 단 하나의 높이

    # ★자르는 자리를 «카드 사이 여백»으로 옮긴다 (2026-09-14 · 눈으로 잡음)
    #   그냥 h/n 에서 자르면 카드 한가운데가 갈린다 — 「스냅 기획」 카드가 1단 끝과 2단 머리에
    #   반씩 걸쳐 찍혔다. 사람이 보면 «잘린 것»으로 읽히지 «이어진 것»으로 안 읽힌다.
    #   그래서 ±12% 안에서 가로로 «거의 한 색인 줄»(=카드 사이 여백)을 찾아 거기서 자른다.
    px2 = im.load()
    # ★«카드 사이»는 «바탕색이 많은 줄»이 아니라 «바탕색 말고는 한 점도 없는 줄»이다.
    #   이 디자인은 카드 배경과 페이지 배경이 같은 색이라, 비율로 재면 카드 «안쪽» 여백까지
    #   걸린다 — 실제로 「스냅 기획」 카드 한가운데가 갈렸다(2026-09-14 눈으로 잡고 실측으로 확인).
    #   그래서 «완전히 빈 줄»이 10px 이상 이어지는 띠만 카드 사이로 본다.
    def nonbg(y):
        n = 0
        for x in range(0, w, 2):
            q = px2[x, y]
            if not (abs(q[0] - BGC[0]) <= 6 and abs(q[1] - BGC[1]) <= 6 and abs(q[2] - BGC[2]) <= 6):
                n += 1
        return n
    bands, cur = [], None
    for y in range(h):
        if nonbg(y) == 0:
            if cur is None: cur = y
        else:
            if cur is not None and y - cur >= 10: bands.append((cur + y) // 2)
            cur = None
    if cur is not None and h - cur >= 10: bands.append((cur + h) // 2)
    cuts = []
    for i in range(1, n):
        want = i * ch
        # ★너무 먼 빈 띠로 끌려가면 단이 한쪽으로 쏠린다 — 하객 안내가 실제로
        #   1단에 머리글만 남고 전부 2단으로 갔다(2026-09-14 눈으로 잡음).
        #   카드를 지키는 것보다 «두 단이 비슷하게 차는 것»이 먼저다. ±30% 안에서만 끌어당긴다.
        reach = int(ch * 0.30)
        cand = [b for b in bands if 0 < b < h and b not in cuts and abs(b - want) <= reach]
        cuts.append(min(cand, key=lambda b: abs(b - want)) if cand else want)
    cuts.sort()
    bounds = [0] + cuts + [h]
    ch = max(bounds[i + 1] - bounds[i] for i in range(n))   # 가장 긴 단에 맞춘다
    W = PAD * 2 + n * w + (n - 1) * GUT
    H = PAD * 2 + ch
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    parts = [side_trim(im.crop((0, bounds[i], w, bounds[i + 1]))) for i in range(n)]
    w = max(p.size[0] for p in parts)
    ch = max(p.size[1] for p in parts)
    W = PAD * 2 + n * w + (n - 1) * GUT
    H = PAD * 2 + ch
    out = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(out)
    for i in range(n):
        part = parts[i]
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
