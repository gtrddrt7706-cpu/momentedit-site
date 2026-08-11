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

# ── 진짜 yml 에서 note() 정의만 떼어 온다 ──
#
# ★★[SLICE_ONLY_FN 2026-08-11 · 클로드코드 적대검증] 떼어 온 것이 **함수 하나인지 확인한다.**
#   옛 판은 `worst=0` 줄부터 `^          }$`(들여쓰기 10칸 고정) 까지를 잘라 그대로 eval 했다.
#   들여쓰기를 두 칸 늘려 보니 닫는 } 를 못 찾아 **범위가 아래로 흘러넘쳤고**,
#   그 안에 든 `node scripts/audit/page-probe.mjs …` 들이 **그대로 실행됐다.**
#   화면에 뜬 것은 「· index.html@390 — 재지 못했습니다」 — 이 검사의 말이 아니라 page-probe 의 말이다.
#   ★가드(`case "$SRC" in *"note()"*`)는 통과했다. 넓게 자른 조각에도 note() 는 들어 있으니까.
#     「그 문자열이 있나」는 「그것만 있나」와 다르다.
#   ★종료 코드도 거짓이었다 — 2 가 나왔는데 그건 이 검사의 [CANT_LOOK] 2 가 아니라
#     마지막에 돌아간 남의 명령이 남긴 값이다. 뜻이 다른 두 2 가 한 자리에서 겹쳤다.
#
#   → 고침 셋
#     ① 시작점을 `note() {` 로 잡는다(worst=0 이 아니라). worst=0 은 t() 가 매번 초기화하므로 필요 없다.
#     ② 끝점을 **같은 들여쓰기의 }** 로 잡는다 — 들여쓰기 폭을 첫 줄에서 읽어 쓴다(10 을 박지 않는다).
#     ③ 떼어 온 조각에 **명령이 섞였는지** 본다. 함수 정의에는 node·curl·npx 가 있을 리 없다.
#        섞였으면 범위가 넘친 것이다 — 조용히 돌리지 않고 붉게 선다.
IND=$(sed -n 's/^\( *\)note() {.*/\1/p' "$YML" | head -1)
if [ -z "$IND" ]; then
  echo "✗ yml 에서 'note() {' 줄을 못 찾았습니다 — 함수 이름이나 꼴이 바뀌었는지 보세요"; exit 1
fi
#   ※ 시작 줄에는 꼬리 주석이 붙어 있다(`note() {   # $1 이름 …`) — 통째 비교하면 안 잡힌다.
#     **앞부분만** 본다. 끝 줄은 들여쓰기를 벗긴 뒤 정확히 `}` 인 줄이다.
SRC=$(awk -v ind="$IND" '
  index($0, ind "note() {") == 1 { on = 1 }
  on { line = $0; sub("^" ind, "", line); print line; if (line == "}") exit }
' "$YML")

case "$SRC" in
  *"note()"*) : ;;
  *) echo "✗ yml 에서 note() 를 못 떼어 왔습니다 — 들여쓰기나 위치가 바뀌었는지 보세요"; exit 1 ;;
esac
# ★함수 하나만 잘렸는가 — 명령이 섞였으면 범위가 넘친 것이다(그대로 eval 하면 야간 잡이 여기서 돈다)
if printf '%s\n' "$SRC" | grep -qE '^[[:space:]]*(node|npx|curl|nohup|set )[[:space:]]'; then
  echo "✗ 떼어 온 조각에 실행 명령이 섞였습니다 — 범위가 함수 밖으로 넘쳤습니다."
  echo "  (그대로 eval 하면 야간 잡의 검사들이 여기서 돌고, 종료 코드도 남의 것이 됩니다)"
  printf '%s\n' "$SRC" | grep -nE '^[[:space:]]*(node|npx|curl|nohup|set )[[:space:]]' | head -3 | sed 's/^/  │ /'
  exit 1
fi
# ★닫혔는가 — 마지막 줄이 } 여야 한다. 안 닫힌 조각을 eval 하면 문법 오류로 죽는다
case "$(printf '%s\n' "$SRC" | tail -1)" in
  '}') : ;;
  *) echo "✗ 떼어 온 조각이 } 로 안 끝납니다 — 함수가 안 닫혔습니다(끝점을 못 찾았습니다)"; exit 1 ;;
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
