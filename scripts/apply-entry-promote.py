#!/usr/bin/env python3
# 입장 C·E 의 «현행»을 버리고 다정판을 그 자리에 올린다 [ENTRY_PROMOTE] (2026-09-20)
#
# ★★사장님 「베스트 멘트로 이벤트당 3~8개로 완전 추려서 합쳐, 나머지 전부 삭제」 — 입장 11 → 8.
#   `C·현행`·`E·현행` 을 버리는데, 이 둘은 **어조판이 아니라 갈래의 기본 문안**이다.
#   그래서 [TONE_CULL] 의 «원천에서 블록 지우기»로는 안 된다 — 현행은 어조표가 아니라
#   `ritual-data.js` 의 `ENTRY` 에 직접 살기 때문이다.
#
# ★버리는 방식 — **갈래를 없애지 않는다.** C·E 를 통째로 지우면 그 갈래를 고른 고객에게 문안이 없어진다.
#   현행 자리에 다정판 문면을 **올리고**, 어조판 칸을 비운다. 결과는 «갈래마다 한 벌»이다.
#   · C : 「귀한 걸음 해 주신 여러분 앞에…」(옛 다정판)  ← 하객 예우
#   · E : 「부모님께는 여전히 아이 같은 두 사람이…」(옛 다정판)  ← 아이와 어른
#
# ★왜 버리는가(코워크 문면 근거)
#   · `C·현행` 「이 순간을 두 사람이 **오래 기다렸습니다**」 ↔ `D·현행` 「**여러 해가 걸려** … 닿았습니다」 — 같은 일.
#     그리고 「첫걸음을 내딛습니다」가 `E·현행` 과 겹친다. 62음절로 입장에서 가장 길다.
#   · `E·현행` 은 그 겹침의 반대편이고, 같은 갈래 다정판이 훨씬 선명하다.
#
# ★[COPY_THREE] 사본까지 함께 간다 — order-preview.html 의 빌더 인라인 사본.
import io, re, sys, subprocess, json

WRITE = '--write' in sys.argv
SRC = 'docs/plans/대본개정/21_B_제안.md'
FILES = ['assets/ritual-data.js', 'order-preview.html']

D = {}
exec_js = subprocess.run(['node', '-e',
    "const D=require('./assets/ritual-data.js');"
    "console.log(JSON.stringify({C:(D.TONE.entry.C||{}).warm||'',E:(D.TONE.entry.E||{}).warm||'',"
    "cC:(D.ENTRY.C||{}).nar||'',cE:(D.ENTRY.E||{}).nar||''}))"],
    capture_output=True, text=True)
D = json.loads(exec_js.stdout)
for k in ('C', 'E'):
    if not D[k] or not D['c' + k]:
        print('✗ %s 의 현행 또는 다정판을 못 읽었습니다 — 멈춥니다' % k); sys.exit(1)

print('=== 올릴 문면 ===')
for k in ('C', 'E'):
    print('[%s] 버릴 현행: %s' % (k, D['c' + k][:56]))
    print('     올릴 다정: %s' % D[k][:56])

srcs = {f: io.open(f, encoding='utf-8').read() for f in FILES}
hit = 0
for k in ('C', 'E'):
    old, new = D['c' + k], D[k]
    for f in FILES:
        n = srcs[f].count(old)
        if n:
            srcs[f] = srcs[f].replace(old, new); hit += n
            print('  %s  %s %d곳' % (k, f.split('/')[-1], n))
if not hit:
    print('✗ 바꿀 자리를 못 찾았습니다'); sys.exit(1)

if not WRITE:
    print('\n(드라이런 · --write 로 반영 — 이어서 21_B 에서 C·E 다정 블록을 지우고 생성기를 돌립니다)')
    sys.exit(0)
for f in FILES:
    io.open(f, 'w', encoding='utf-8').write(srcs[f])
print('\n✓ 현행 자리에 다정판을 올렸습니다')
