#!/usr/bin/env python3
# 편지·덕담 여섯 묶음이 「한 공식」으로 수렴하지 않았나 [LETTER_REWRITE]
#
# 2026-09-20 사장님 지시 「어머니 아버지 신랑 신부 편지부분도 전부 다시 짤거야」.
# 실청에서는 「억지감동」이라 하셨는데, 세어 보니 원인은 문장 하나하나가 아니라
# 여섯 편이 **같은 틀**이라는 것이었다 (호명 6/6 · 짧은 여운 6/6 · 「이제 안다」 4/6).
# 한 편만 들으면 안 보이고 연달아 들으면 보인다. 그래서 「한 편의 품질」이 아니라
# 「여섯의 흩어짐」을 잰다.
#
# ★이 여섯은 assets/audio/cast/ = 미리듣기다. 당일 스피커로 나가지 않는다.
#   고객이 계약 전에 듣고 «나도 이 정도면 쓰겠다»를 판단하는 **본보기**이므로,
#   틀이 하나뿐이면 고객의 편지도 그 틀로만 나온다. 그게 흩어짐을 요구하는 이유다.
#
# 기본은 **보고만** 하고 종료코드 0 — 아직 재작성 전이라 목표 미달이 정상이다.
#   ([TERM_DIGITAL] 교훈 — 넣는 날부터 빨간 검사는 고칠 수 없는 빨강이 된다)
# 재작성이 끝나면 merge-guard 의 호출을 `LETTER_STRICT=1` 로 바꿔 조인다.
#   그 한 줄이 이 문서의 «완료» 표시다.
import io, os, re, sys

SRC = 'docs/plans/식순연구/배역_예시_대사.txt'
SIX = ['bless-father', 'bless-mother', 'letter-parent', 'letter-each', 'tribute', 'tribute-reply']
STRICT = os.environ.get('LETTER_STRICT') == '1'
# 목표 — 여섯 중 몇 편까지 같은 수를 써도 되나
GOAL = {'호명 열기': 2, '짧은 여운 닫기': 3, '「이제 안다」 공식': 1, '한 어미 100%': 0}

def blocks(path):
    out, cur, name = {}, None, None
    for ln in io.open(path, encoding='utf-8'):
        m = re.match(r'^\[\d+\]\s+R-([\w-]+)\s', ln)
        if m:
            if name: out[name] = cur
            name, cur = m.group(1), []
            continue
        if name is None: continue
        t = ln.strip()
        if not t:
            if cur: out[name] = cur; name, cur = None, None
            continue
        cur.append(t)
    if name: out[name] = cur
    return out

def syl(s): return len(re.findall(r'[가-힣]', s))

if not os.path.exists(SRC):
    print(f'✗ 원천을 못 찾았습니다: {SRC}'); sys.exit(1)
B = blocks(SRC)
miss = [k for k in SIX if k not in B]
if miss:
    print(f'✗ 원천에서 이 묶음을 못 읽었습니다: {miss}')
    print('  → 파일 모양이 바뀌었을 수 있습니다. 조용히 통과하면 안 되니 빨강으로 둡니다.')
    sys.exit(1)

rows, tally = [], {k: 0 for k in GOAL}
for k in SIX:
    ss = B[k]
    call = bool(re.match(r'^[가-힣]{1,4}(아|야|,\s*[가-힣]|님[,.]|, )', ss[0])) and syl(ss[0]) <= 12
    tail = syl(ss[-1]) <= 16
    ALL = ' '.join(ss)
    know = bool(re.search(r'(이제 (압니다|안다|알)|그때는 (모르|몰랐)|아직도 모르|내려놓|잘 잔다)', ALL))
    body = [t for t in ss if syl(t) > 8]
    da = sum(1 for t in body if re.search(r'(다|라)\.$', t))
    mono = bool(body) and da == len(body)
    for flag, key in ((call, '호명 열기'), (tail, '짧은 여운 닫기'), (know, '「이제 안다」 공식'), (mono, '한 어미 100%')):
        if flag: tally[key] += 1
    rows.append((k, call, tail, know, mono, len(ss), f'{da}/{len(body)}'))

print('\n편지·덕담 여섯 묶음 — 틀이 흩어졌나 [LETTER_REWRITE]')
print(f'  원천: {SRC}\n')
print(f"  {'묶음':<16}{'문장':>4}  {'호명열기':<9}{'여운닫기':<9}{'이제안다':<9}{'어미'}")
for k, call, tail, know, mono, n, ratio in rows:
    d = lambda f: '●' if f else '·'
    print(f"  {k:<16}{n:>4}  {d(call):<9}{d(tail):<9}{d(know):<9}{ratio}{'  ← 한 어미 100%' if mono else ''}")

print('\n  ● = 그 틀을 쓰고 있다. 여섯이 다 ● 면 공식이 보인다.\n')
bad = []
for key, goal in GOAL.items():
    got = tally[key]
    ok = got <= goal
    print(f"  {'✓' if ok else '✗'} {key:<18} {got}/6   (목표 {goal} 이하)")
    if not ok: bad.append(f'{key} {got}>{goal}')

print()
if not bad:
    print('  → 틀이 흩어져 있습니다.')
    sys.exit(0)
if STRICT:
    print('  ✗ 아직 한 공식으로 몰려 있습니다: ' + ' · '.join(bad))
    print('    docs/plans/식순연구/편지_재작성_20260920.md 4절을 보고 여는 문·닫는 문을 갈라 주세요.')
    sys.exit(1)
print('  · 재작성 전이라 아직 몰려 있습니다(정상). 끝나면 LETTER_STRICT=1 로 조입니다.')
print('    ' + ' · '.join(bad))
sys.exit(0)
