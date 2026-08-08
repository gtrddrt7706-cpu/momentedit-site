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

run() {
  CURF="$1"; a="$2"; b="$3"; n=$((n + 1))
  cp "$CURF" "$BK/cur" || return
  python3 -c "
import io,sys
p,a,b=sys.argv[1],sys.argv[2],sys.argv[3]
s=io.open(p,encoding='utf-8').read()
assert a in s, 'ANCHOR-MISSING '+p+' :: '+a
io.open(p,'w',encoding='utf-8').write(s.replace(a,b,1))
" "$CURF" "$a" "$b" || { echo "SKIP    $CURF ($a) — 기준 문자열이 없다(형식이 바뀜)"; fail=$((fail + 1)); return; }
  node scripts/check-source-drift.mjs >/dev/null 2>&1; r=$?
  cp "$BK/cur" "$CURF"
  if [ $r -ne 0 ]; then echo "CAUGHT  $CURF ($a)"
  else echo "MISSED  $CURF ($a) — 검사가 이 자리를 못 본다"; fail=$((fail + 1)); fi
}

# 시간표가 적힌 열 자리 + 원천(MIN.base) 자체
run index.html '16~24<span>' '30<span>'                                   # 보이는 시퀀스 표
run index.html '16~24m | The Ceremony' '30m | The Ceremony'               # FAQ 블록
run index.html 'Ceremony 16~24분' 'Ceremony 30분'                          # Service JSON-LD
run assets/sequence-modal.js "'16~24분'" "'30분'"                          # 공용 진행표 모달(한글 표)
run order-preview.html "'16~24분'" "'30분'"                                # 식순 만들기 표
run order-preview.html '본식 16~24분' '본식 30분'                           # 표 밖 산문
run assets/advisor-kb.js 'Ceremony 16~24분' 'Ceremony 30분'                # AI 상담사
run api/_kb.js '16~24분 The Ceremony' '30분 The Ceremony'                  # 서버 지식
run contract/v1-1.html '(16~24분)' '(30분)'                                # 계약서 3조
run docs/smartstore/상세페이지_원본.html '16~24<small>' '30<small>'         # 스마트스토어 원본
run assets/ritual-data.js 'record:16' 'record:12'                          # 원천이 바뀌면 열 벌이 함께 틀린다

restore
echo ""
if [ $fail -ne 0 ]; then
  echo "── ${n}자리 중 ${fail}자리를 검사가 못 본다. 검사부터 고칠 것."
  exit 1
fi
echo "DRIFT MUTATION OK — ${n}자리 전부 잡힌다"
