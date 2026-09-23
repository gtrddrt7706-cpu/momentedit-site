#!/usr/bin/env python3
# 코워크 표를 «클립 단위로 통째» 반영한다 [COWORK_TABLE] (2026-09-21)
#
#   python3 scripts/apply-cowork-table.py              미리보기
#   python3 scripts/apply-cowork-table.py --write      반영
#
# ★왜 표인가 — 코워크가 못박았다: 「json 만으로는 반영하지 마십시오. 위 표가 기준입니다.」
#   round json 의 `new` 는 «제안»이 아니라 «그때의 저장소 문면»일 수 있다([STALE_NEW]).
#   실제로 열넷째 판에서 39_tribute-out 이 그 모양으로 역전을 일으킬 뻔했다.
#
# ★★[SLUG_NOT_KEY] 열쇠는 «번호 + 슬러그» 둘이다. 이 세션에서만 일곱 번 걸린 함정이다.
#   번호는 층마다 겹친다 — 20 은 배역의 `entry-C` 이면서 진행의 `narr-letter-end` 다.
#   슬러그도 겹친다 — `entry-C` 는 나레이션 07 이면서 배역 20 이다.
#   둘 중 하나만 쓰면 반드시 엉뚱한 클립에 남의 대사가 들어간다.
#
# ★★[NOW_MUST_MATCH] 표의 「지금 문면」이 저장소와 다르면 **그 줄은 건드리지 않는다.**
#   코워크는 자기 판에서 이어 작업하므로, 그 사이 이쪽이 고쳤으면 두 판이 갈라진다.
#   덮어쓰면 이쪽 수정이 소리 없이 사라진다 — 그게 이 저장소가 반복해 겪은 «조용한 역전»이다.
#   ★이미 「갈 문면」이 들어가 있으면 «이미 반영됨»으로 세고 넘어간다(회차마다 표가 쌓인다).
#
# ★★[NO_SILENT_SKIP] 설명이 안 되는 줄이 하나라도 있으면 **아무것도 쓰지 않는다.**
#   절반만 반영된 상태가 제일 나쁘다 — 게이트는 초록인데 문면이 반쪽이 된다.
import io, json, re, sys

WRITE = '--write' in sys.argv
# ★[TABLE_ARG 2026-09-23] 표를 인자로 받는다 — 회차마다 표가 새로 온다.
#   인자가 없으면 마지막 표를 쓴다(옛 호출이 그대로 돈다).
TSV = next((a for a in sys.argv[1:] if a.endswith('.tsv')),
           'docs/plans/식순연구/코워크_10차표_20260922.tsv')
MAN = 'docs/plans/식순연구/타입캐스트/manifest.json'
# ★[SRC_FOUR] 문안은 **다섯** 곳에 산다. ritual-cue.js 를 빠뜨리면 식순 «밖» 클립(EXTRA)이 안 잡힌다.
SRC = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
       'docs/plans/식순연구/배역_예시_대사.txt', 'scripts/build-dubbing-script.mjs']

norm = lambda t: re.sub(r'\s+', ' ', t or '').strip()

# ★[ENTRY_ALT_REBUILD] 손으로 적지 않는다 — 원천에서 읽는다. 배역이 늘면 따라온다.
_rd = io.open('assets/ritual-data.js', encoding='utf-8').read()
_m = re.search(r'var\s+ENTRY_ALT\s*=\s*\[([^\]]*)\]', _rd)
ENTRY_ALT = re.findall(r'"([^"]+)"|\'([^\']+)\'', _m.group(1)) if _m else []
ENTRY_ALT = [a or b for a, b in ENTRY_ALT] or ['신랑', '신부']

man = json.loads(io.open(MAN, encoding='utf-8').read())
NOW = {}
for c in man['clips']:
    NOW[(c['no'].lstrip('0') or '0', c['file'])] = ' '.join(norm(s['text']) for s in c['sents'])

rows = []
for ln in io.open(TSV, encoding='utf-8'):
    if ln.startswith('#') or not ln.strip():
        continue
    parts = ln.rstrip('\n').split('\t')
    if len(parts) != 4:
        print('✗ 표 줄이 네 칸이 아니다:', ln[:60]); sys.exit(2)
    rows.append(parts)

srcs = {f: io.open(f, encoding='utf-8').read() for f in SRC}
orig = dict(srcs)
done, same, stop = [], [], []
cast_mismatch = []   # [CAST_COUNT] 배역 대본 줄 수가 안 맞는 자리

for slug, layer, now, new in rows:
    m = re.match(r'^(\d+)_(.+)$', slug)
    if not m:
        stop.append((slug, '번호_슬러그 꼴이 아니다')); continue
    key = (m.group(1).lstrip('0') or '0', m.group(2))
    cur = NOW.get(key)
    if cur is None:
        stop.append((slug, '저장소에 그 클립이 없다 — 폐지됐거나 이름이 다르다')); continue
    now, new = norm(now), norm(new)
    # ★★[NOT_A_SENTENCE] 표의 「갈 문면」 칸에 **문장이 아니라 표시**가 오는 수가 있다.
    #   실측: 12_narr-welcome-out 의 칸이 「✂️ 폐지(큐째로)」였다. 그대로 넣었으면
    #   그 글자가 소스 다섯 곳에 박히고, 예식 당일 스피커에서 그 문장이 나갈 뻔했다.
    #   ★낱말로 거르지 않는다 — 「그대로 보고 계셔도 좋습니다」 같은 멀쩡한 본문이 함께 걸린다(실측).
    #     «맨 앞 글자가 편집 표시인가»만 본다. 폐지는 표가 아니라 RETIRED 로 처리할 일이다.
    if re.match(r'^[\u2702\u270F\u2795\u21A9\u2753\uFE0F\s]*[\u2702\u270F\u2795\u21A9\u2753]', new):
        stop.append((slug, '「갈 문면」이 문장이 아니라 편집 표시다: %r — 표에서 빼거나 RETIRED 로 처리할 것' % new[:30]))
        continue
    if cur == new:
        same.append(slug); continue
    if cur != now:
        # [NOW_MUST_MATCH] 갈라졌다. 어느 쪽이 맞는지 사람이 봐야 한다.
        stop.append((slug, '「지금 문면」이 저장소와 다르다\n        표  : %s\n        저장소: %s' % (now[:90], cur[:90])))
        continue
    hit = cur
    n = 0
    CAST = 'docs/plans/식순연구/배역_예시_대사.txt'
    for f in SRC:
        # ★★[CAST_NOT_FLAT] 배역 파일은 여기서 건드리지 않는다 — 아래 줄 단위 길로만 간다.
        #   아래 치환은 `\s+` 로 잇기 때문에 **줄바꿈까지 먹는다.** 배역 덕담은 한 문장 한 줄로
        #   열다섯 줄인데, 그 열다섯 줄이 **한 줄로 뭉개진 뒤** 줄 수 검사에 걸렸다(실측).
        #   더 나쁜 경우엔 뭉갠 채로 그냥 써져서, 성우가 읽을 줄 나눔이 통째로 사라진다.
        if f == CAST:
            continue
        # 원문은 공백이 접혀 있지 않을 수 있다 — 정규화한 자리를 원문에서 되찾는다
        pat = re.compile(r'\s+'.join(map(re.escape, hit.split(' '))))
        srcs[f], k = pat.subn(new, srcs[f]); n += k
    # ★★[CAST_LINES 2026-09-21] 배역 파일은 **문장을 줄마다** 담는다 — 「신랑: …」 꼴이다.
    #   클립을 한 줄로 이어 붙여 찾는 위 방식은 그 파일에 **영영 안 닿는다.**
    #   그래서 ritual-data.js 만 바뀌고 배역 대본은 옛 말로 남아, 화면과 대본이 조용히 갈라졌다.
    #   ★실제로 났다: 18_entry-A · 23_entry-F 가 그렇게 갈라졌고 check-entry-six 가 잡았다.
    #     게이트가 없었으면 «화면에 적힌 말»과 «성우가 읽는 말»이 다른 채로 녹음까지 갔다.
    #   ★문장 수가 같을 때만 줄 단위로 갈아 끼운다 — 수가 다르면 어느 줄이 어느 줄인지 정할 수 없다.
    #     그때는 아래 stop 으로 떨어져 사람이 본다(짐작해서 넣지 않는다).
    if CAST in SRC:
        head = re.compile(r'^\[%s\]\s.*?→\s*%s_%s\.mp3\s*$' % (m.group(1), m.group(1), re.escape(m.group(2))), re.M)
        hm = head.search(srcs[CAST])
        if hm:
            lines = srcs[CAST][hm.end():].split('\n')
            blk, i2 = [], 1
            while i2 < len(lines) and lines[i2].strip():
                blk.append(lines[i2]); i2 += 1
            olds = [re.sub(r'^[^:]{1,8}:\s*', '', x).strip() for x in blk]
            news = [t.strip() for t in re.split(r'(?<=[.!?])\s+', new) if t.strip()]
            # ★★[CAST_SHAPE] 배역 블록은 **세 가지 꼴**이다. 하나로 다루면 반드시 어긋난다.
            #   ① 화자 접두(「신랑: …」)  입장 여섯 — 누가 어느 줄을 읽는지가 뜻이다. 수가 맞아야 한다
            #   ② 통낭독 한 줄          합창·서약 — 한 줄에 여러 문장. 그 한 줄을 통째로 간다
            #   ③ 접두 없는 여러 줄      덕담·편지·헌정 — 화자가 하나라 줄 나눔은 «읽기 편하라고» 나눈 것.
            #                            수가 달라도 새 문장대로 다시 나누면 된다(뜻을 잃지 않는다)
            has_prefix = bool(blk) and all(re.match(r'^[^:]{1,8}:\s', x) for x in blk)
            whole_take = len(blk) == 1 and len(news) > 1 and not has_prefix
            if blk and not has_prefix and not whole_take and len(olds) != len(news):
                # ③ 접두가 없으면 새 문장 수대로 블록을 다시 쓴다
                head_end = hm.end() + 1
                old_block = '\n'.join(blk)
                srcs[CAST] = srcs[CAST].replace(old_block, '\n'.join(news), 1); n += 1
            elif whole_take:
                # ② 한 줄 통낭독 — 그 줄을 통째로 새 문면으로
                srcs[CAST] = srcs[CAST].replace(blk[0], new, 1); n += 1
            elif blk and has_prefix and len(olds) != len(news) and set(
                    re.match(r'^([^:]{1,8}):', x).group(1) for x in blk) <= set(ENTRY_ALT):
                # ★★[ENTRY_ALT_REBUILD] 화자 배치는 **짐작이 아니라 규칙**이다 —
                #   `D.ENTRY_ALT` 가 「한 문장씩 번갈아」이고 첫 문장이 ENTRY_ALT[0] 이다.
                #   그래서 문장 수가 달라져도 누가 어느 줄을 읽을지 **계산된다.**
                #   ★이 길은 블록의 화자가 ENTRY_ALT 안에 있을 때만 쓴다 — 아버님·어머님이 섞인
                #     블록에까지 번갈아 규칙을 들이대면 남의 대사가 남의 입에 붙는다.
                rebuilt = '\n'.join('%s: %s' % (ENTRY_ALT[i % len(ENTRY_ALT)], t) for i, t in enumerate(news))
                srcs[CAST] = srcs[CAST].replace('\n'.join(blk), rebuilt, 1); n += 1
            elif blk and has_prefix and len(olds) != len(news):
                # ★★[CAST_COUNT] 문장 수가 다르면 **조용히 건너뛰지 않는다.**
                #   첫 판이 그랬다 — ritual-data.js 만 바뀌어 n>0 이 되니 «됨»으로 세고,
                #   배역 대본은 옛 줄 수 그대로 남았다. 23_entry-F 가 «화면 2문장 ≠ 대본 3문장»으로
                #   게이트에 걸려서야 보였다. 절반만 반영된 것을 «반영»이라 부르면 안 된다.
                #   ★어느 줄을 누가 읽을지는 사람이 정한다(ENTRY_ALT 순서를 보고). 짐작하지 않는다.
                cast_mismatch.append((slug, len(olds), len(news)))
            elif blk and olds != news:
                for a, b, raw in zip(olds, news, list(blk)):
                    if a != b:
                        srcs[CAST] = srcs[CAST].replace(raw, raw.replace(a, b), 1); n += 1
    if n:
        done.append((slug, hit, new, n))
    elif any(new in v for v in srcs.values()):
        # ★★[TWIN_TEXT] 못 찾았는데 새 문면이 이미 있다 = **앞 줄이 함께 바꿔 놓은 것**이다.
        #   실측: 41_toast-cake 와 42_toast-both 는 지금 문면도 갈 문면도 **글자까지 같다.**
        #   ritual-data.js 에 그 문장이 두 벌 있어 41 을 바꿀 때 둘 다 바뀌고, 42 차례엔 찾을 것이 없었다.
        #   ★이것을 «멈춤»으로 두면 멀쩡한 판이 통째로 안 써진다([NO_SILENT_SKIP] 이 전부를 막으므로).
        same.append(slug)
    else:
        stop.append((slug, '문면이 대장에는 있는데 원천 다섯 파일 어디에도 없다'))

for slug, a, b in cast_mismatch:
    stop.append((slug, '배역 대본 줄 수가 다르다(대본 %d줄 · 갈 문면 %d문장) — 누가 어느 줄을 읽을지 사람이 정해야 한다' % (a, b)))
print('=== 바꿀 클립 %d · 이미 반영됨 %d · 멈춤 %d ===\n' % (len(done), len(same), len(stop)))
for slug, a, b, n in done:
    print('[%s]  %d곳' % (slug, n))
    print('   전: %s' % a[:110])
    print('   후: %s' % b[:110])
if stop:
    print('\n--- ★멈춤 %d ---' % len(stop))
    for s2, why in stop:
        print('   %s — %s' % (s2, why))
    # [NO_SILENT_SKIP] 절반만 반영하지 않는다
    print('\n★설명이 안 되는 줄이 있어 **아무것도 쓰지 않았습니다.** 위를 보고 표나 저장소를 맞추세요.')
    sys.exit(1)

if WRITE:
    for f in SRC:
        if srcs[f] != orig[f]:
            io.open(f, 'w', encoding='utf-8').write(srcs[f]); print('\n✓ 썼다: %s' % f)
else:
    print('\n(미리보기 · --write 로 반영)')
