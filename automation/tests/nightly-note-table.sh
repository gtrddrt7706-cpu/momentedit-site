#!/bin/sh
# 야간 잡의 note() 가 상태를 제대로 가르는가 [NOTE_TABLE]
#
#   sh automation/tests/nightly-note-table.sh
#
# ★왜 (2026-08-11)
#   note() 는 「표에 무엇을 적을까」와 「요약을 무슨 색으로 낼까」를 **동시에** 정한다.
#   둘이 어긋나면 표엔 ✗ 가 찍히는데 요약은 「전부 통과」가 된다 —
#   이 저장소가 EXIT_TRAP · GUARD_FAIL_VAR 로 이미 두 번 당한 병이다.
#   실제로 어긋나 있었다: 0·1·2 말고 **다른 종료 코드**(127 없음 · 124 시간초과 ·
#   137 메모리 · 139 충돌)가 오면 표엔 붉게 적히고 worst 는 0 으로 남았다.
#   야간 잡은 chromium 을 5쪽×2폭 띄운다. 러너에서 OOM(137)은 상상이 아니다.
#
# ★함수를 여기에 베끼지 않는다 — 진짜 yml 에서 **떼어 온다.**
#   베끼면 언젠가 갈라지고, 갈라진 쪽이 초록을 낸다(이 저장소의 단골 사고).
#
# ★[NO_GATE 아님] 이 검사는 브라우저도 서버도 필요 없다 — merge-guard 가 직접 돌린다.

set -u
YML="$(dirname "$0")/../../.github/workflows/nightly-screen.yml"
[ -f "$YML" ] || { echo "✗ nightly-screen.yml 이 없습니다"; exit 1; }

# ── 진짜 yml 에서 note() 정의를 떼어 온다 (worst=0 초기화 줄부터 함수 닫는 } 까지) ──
SRC=$(sed -n '/^ *worst=0$/,/^          }$/p' "$YML" | sed 's/^          //')
case "$SRC" in
  *"note()"*) : ;;
  *) echo "✗ yml 에서 note() 를 못 떼어 왔습니다 — 들여쓰기나 위치가 바뀌었는지 보세요"; exit 1 ;;
esac

GITHUB_STEP_SUMMARY=$(mktemp); export GITHUB_STEP_SUMMARY
summary() { printf '%s\n' "$1" >> "$GITHUB_STEP_SUMMARY"; }
eval "$SRC"

fail=0
# $1 기대 worst · $2 설명 · $3 실행할 note 호출들
t() {
  want=$1; what=$2; cmds=$3
  worst=0; : > "$GITHUB_STEP_SUMMARY"
  eval "$cmds"
  row=$(sed 's/.*| \(.*\) |$/\1/' "$GITHUB_STEP_SUMMARY" | tr '\n' '/')
  if [ "$worst" = "$want" ]; then
    printf 'ok   %-34s worst=%s\n' "$what" "$worst"
  else
    printf '✗    %-34s worst=%s (기대 %s) · 표: %s\n' "$what" "$worst" "$want" "$row"
    fail=1
  fi
}

echo "━━ note() 상태표 — 표에 붉게 적은 것은 요약도 붉어야 한다"
t 0 '전부 정상인 밤'             'note a 0; note m 2 expected'
t 2 '진짜 못 잰 밤'              'note a 2; note m 2 expected'
t 1 '재서 틀린 밤'               'note a 1; note m 2 expected'
t 1 'expected 인데 1 (틀림은 틀림)' 'note m 1 expected'
t 1 '1 뒤에 2 — 1 이 유지되나'     'note a 1; note b 2'
t 1 '2 뒤에 1 — 1 로 올라가나'     'note a 2; note b 1'
# ★아래 다섯이 이 파일이 생긴 이유다. 전에는 전부 worst=0 이었다(표엔 ✗ 를 찍고도).
t 1 '명령 없음 127'              'note a 127'
t 1 '시간초과 124'               'note a 124'
t 1 '메모리 부족 137'            'note a 137'
t 1 '충돌 139'                   'note a 139'
t 1 '코드가 빈 문자열'           'note a ""'

rm -f "$GITHUB_STEP_SUMMARY"
[ "$fail" = 0 ] || { echo "\n✗ 표와 요약이 어긋납니다 — 붉게 적고 초록으로 끝내는 자리가 있습니다"; exit 1; }
echo "✓ NOTE TABLE OK — 11가지 갈림 전부 표와 요약이 같은 말을 합니다"
