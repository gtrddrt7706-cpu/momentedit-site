#!/usr/bin/env python3
# 마커 지킴 [MARKER_KEEP] — 2026-09-20
#
# 왜 — 클로드코드가 보낸 `전수표.py` 를 제 판으로 **통째로 되돌려 보냈더니** 두 가지가 함께 죽었습니다.
#   ① 그쪽이 고쳐 둔 «입력을 원천에서 세우기»  ② 그쪽 [ROSTER_92] 주석
#   저쪽 게이트가 그걸 잡았습니다 — `REVERT? … 'ROSTER_92' (0<1)`.
#   ★마커는 «조용한 역전»을 막으려고 다는 이름이고, 게이트가 글자로 셉니다. 지우면 푸시가 막힙니다.
#
# ★★이건 제가 이번 주에 세 번째로 저지른 같은 실수입니다 —
#   ①남이 뽑아 준 91클립 목록을 원천으로 씀 ②도구 출력의 `.,` 를 저장소 사실로 씀
#   ③받은 파일을 **머지하지 않고 덮어써서** 보냄.
#   앞의 둘은 사람이 눈으로 찾았고, 셋째는 기계가 잡았습니다. 그래서 이쪽에도 기계를 답니다.
#
#   python3 마커점검.py 받은파일 보낼파일       ← 둘을 견준다
#   python3 마커점검.py --dir 받은폴더 보낼폴더  ← 같은 이름끼리 전부
import re, sys, os, glob

# ★[오탐 교정] 마커 뒤에 말이 붙는다 — 「[LOCKED_PROPOSAL · 코워크 로컬판]」 처럼.
#   게이트는 «그 이름 글자»를 세지 대괄호 짝을 보지 않는다. 이름까지만 읽는다.
MARK = re.compile(r'\[([A-Z][A-Z0-9_]{2,})(?=[\]\s·:])')
def marks(p):
    try: return set(MARK.findall(open(p, encoding='utf-8').read()))
    except Exception: return set()

def one(a, b):
    lost = marks(a) - marks(b)
    if lost:
        print(f'✗ {os.path.basename(b)} — 받은 판에 있던 마커 {len(lost)}개가 없습니다')
        for m in sorted(lost): print(f'     [{m}]')
        print('     ★지워야 할 이유가 있으면 전달문에 «이 마커를 왜 뺀다»고 한 줄 적으십시오.')
    return len(lost)

args = sys.argv[1:]
bad = 0
if args[:1] == ['--dir']:
    src, dst = args[1], args[2]
    for f in sorted(glob.glob(os.path.join(src, '*'))):
        t = os.path.join(dst, os.path.basename(f))
        if os.path.isfile(f) and os.path.exists(t): bad += one(f, t)
else:
    bad = one(args[0], args[1])
print('✓ 지워진 마커 없음' if not bad else f'\n마커 {bad}개가 사라졌습니다.')
sys.exit(1 if bad else 0)
