#!/bin/sh
# check-source-drift.test.sh — 검사가 진짜로 잡는지 시험한다 [DRIFT_MUTATION]
#
# ★왜 만들었나 (2026-08-08)
#   시간표 검사를 네 번 고쳐 썼는데, 그때마다 "초록이니 됐다"고 넘어갔다.
#   초록은 **아무것도 증명하지 않는다** — 검사가 눈감고 있어도 초록이다.
#   실제로 두 번 뚫려 있었다:
#     ① index.html 의 보이는 표를 30분으로 망가뜨려도 바로 위 주석이 16~24 를 대신 내줘서 통과
#     ② 고객 문구 줄 뒤에 붙은 주석 한 조각이 그 줄을 통째로 면제시켜 통과
#   둘 다 **행을 일부러 낡게 바꿔 보고 나서야** 드러났다.
#
# 무엇을 하나
#   시간표가 적힌 자리를 하나씩 옛 숫자로 바꿔 놓고 check-source-drift 를 돌린다.
#   실패하면 CAUGHT(검사가 산다) · 통과하면 MISSED(구멍). 원본은 무조건 되돌린다.
#
# 쓰기: sh scripts/check-source-drift.test.sh
set -u
cd "$(dirname "$0")/.." || exit 1

BK=$(mktemp -d) || exit 1
restore() { [ -f "$BK/cur" ] && [ -n "${CURF:-}" ] && cp "$BK/cur" "$CURF"; rm -rf "$BK"; }
trap 'restore; exit 130' INT TERM HUP
fail=0; n=0

# ★[DRIFT_EVERY_HIT 2026-08-10] 기준 문자열이 그 파일에 **여러 번** 나오면 전부 하나씩 시험한다.
#   왜 — 옛 판은 replace(a,b,1) 이라 **맨 앞 하나만** 바꿨다. 같은 문장이 두 곳에 있으면
#   앞 것만 시험하고 CAUGHT 를 찍는데, 정작 **뒤 것은 한 번도 시험되지 않는다.**
#   그런데 화면에 실제로 보이는 쪽이 뒤에 있을 수 있다 — 지금 이 저장소가 그랬다:
#     index.html '16~24m | The Ceremony' 는 162행 JSON-LD 와 6334행 FAQ 본문 두 곳에 있고,
#     시험은 늘 앞(JSON-LD)만 망가뜨렸다. 보이는 FAQ 는 초록 밑에서 미검증으로 있었다.
#     (2026-08-10 실측: 뒤엣것만 따로 망가뜨리면 exit 1 — 다행히 막혀 있었다. 막혀 있었다는 것과
#      막혀 있음을 **증명했다**는 것은 다르다. 초록은 아무것도 증명하지 않는다 — 이 파일의 첫 줄 그대로다.)
#   ★'2개 이상이면 실패' 로 막지 않는 이유 — 위 둘은 **둘 다 정당한 자리**다(구조화 데이터와 본문).
#   시험을 통과시키려고 화면 글이나 JSON-LD 를 지우게 만들면, 그건 검사가 내용을 지시하는 것이다.
#   세는 대신 **전부 시험한다.** 개수는 아래 출력에 'k/n번째' 로 늘 보이므로 조용해지지 않는다.
run() {
  CURF="$1"; a="$2"; b="$3"
  # ★[DRIFT_NO_FILE 2026-08-10] 파일을 못 읽으면 **조용히 넘어가지 않는다.**
  #   옛 판은 `cp … || return` 이라 그냥 돌아갔고, 그 자리는 세어지지도 않았다.
  #   실측(2026-08-10): 열한 자리 파일이 전부 없는 데서 옛 판을 돌리면
  #   아무것도 시험하지 않고 "11자리 전부 잡힌다 · exit 0" 을 찍었다. 완전한 거짓말이다.
  #   파일을 옮기거나 이름만 바꿔도 같은 일이 난다 — '없으면 통과'는 늘 조용한 거짓말이 된다.
  cp "$CURF" "$BK/cur" 2>/dev/null || {
    echo "NOFILE  $CURF — 파일을 못 읽는다(옮겼거나 이름이 바뀜). 목록을 고치세요"
    fail=$((fail + 1)); return
  }
  cnt=$(python3 -c "
import io,sys
print(io.open(sys.argv[1],encoding='utf-8').read().count(sys.argv[2]))
" "$CURF" "$a" 2>/dev/null) || cnt=0
  if [ "${cnt:-0}" -eq 0 ]; then
    echo "SKIP    $CURF ($a) — 기준 문자열이 없다(형식이 바뀜)"; fail=$((fail + 1)); return
  fi
  k=1
  while [ "$k" -le "$cnt" ]; do
    n=$((n + 1))
    python3 -c "
import io,sys
p,a,b,k=sys.argv[1],sys.argv[2],sys.argv[3],int(sys.argv[4])
s=io.open(p,encoding='utf-8').read()
i=-1
for _ in range(k): i=s.find(a,i+1)        # k번째 자리 하나만 바꾼다
io.open(p,'w',encoding='utf-8').write(s[:i]+b+s[i+len(a):])
" "$CURF" "$a" "$b" "$k"
    node scripts/check-source-drift.mjs >/dev/null 2>&1; r=$?
    cp "$BK/cur" "$CURF"
    at=''; [ "$cnt" -gt 1 ] && at=" ${k}/${cnt}번째"
    if [ $r -ne 0 ]; then echo "CAUGHT  $CURF ($a)$at"
    else echo "MISSED  $CURF ($a)$at — 검사가 이 자리를 못 본다"; fail=$((fail + 1)); fi
    k=$((k + 1))
  done
}

# 시간표가 적힌 열 자리 + 원천(MIN.base) 자체
run index.html '>21<span>min' '>30<span>min'                              # 보이는 시퀀스 표 · [MID_FORM] 이제 가운데값을 적는다 — 겨눌 자리가 칸으로 옮겼다
run index.html '>35<span>min' '>44<span>min'                              # 같은 표 · 인사 사진 칸(가운데값)도 낡으면 잡히는지
run index.html '16~25m | The Ceremony' '30m | The Ceremony'               # FAQ 블록
run index.html 'Ceremony 16~25분' 'Ceremony 30분'                          # Service JSON-LD
run assets/sequence-modal.js "'16~25분'" "'30분'"                          # 공용 진행표 모달 · 소요 칸이 범위를 진다(랜딩=가운데값 · 모달=범위 · MID_FORM)
run order-preview.html "'16~25분'" "'30분'"                                # 식순 만들기 표
run order-preview.html '본식 16~25분' '본식 30분'                           # 표 밖 산문
run assets/advisor-kb.js 'Ceremony 16~25분' 'Ceremony 30분'                # AI 상담사
run api/_kb.js '16~25분 The Ceremony' '30분 The Ceremony'                  # 서버 지식
run contract/v1-1.html '(16~25분)' '(30분)'                                # 계약서 3조
run docs/smartstore/상세페이지_원본.html '16~25<small>' '30<small>'         # 스마트스토어 원본
run assets/ritual-data.js "min:'약 16분'" "min:'약 12분'"                          # 원천이 바뀌면 열 벌이 함께 틀린다

restore
echo ""
# ★[DRIFT_RAN_NONE 2026-08-10] 한 자리도 못 돌았으면 초록을 내지 않는다.
#   위 NOFILE 이 각 자리를 잡아 주지만, 이 한 줄은 그 뒤에 무엇을 덧붙여도 남는 최후의 바닥이다.
#   "내 자리에서 돌았다는 것은 검사가 돈다는 뜻이 아니다" — 목록에 우리가 같이 적은 그 줄.
if [ "$n" -eq 0 ]; then
  echo "── 아무것도 시험하지 않았다. 초록이 아니다 — 목록·경로부터 확인할 것."
  exit 1
fi
if [ $fail -ne 0 ]; then
  echo "── ${n}자리 중 ${fail}자리를 검사가 못 본다. 검사부터 고칠 것."
  exit 1
fi
echo "DRIFT MUTATION OK — ${n}자리 전부 잡힌다"
