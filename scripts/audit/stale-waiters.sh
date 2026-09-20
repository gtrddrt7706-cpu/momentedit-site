#!/bin/bash
# [STALE_WAIT] 영영 안 끝나는 «대기 루프»를 찾는다 — 토큰을 갉아먹는 찌꺼기 탐지
#
# 무엇이 있었나 (2026-09-20 사장님 지적 「항상 이런거 없는지 탐지 자동으로해 토큰갈아먹잖아」)
#   백그라운드에 대기 작업 5개가 떠 있었고 그중 4개가 찌꺼기였다. 1시간 27분째 돌던 것도 있었다.
#   원인은 하나다 — `until ! pgrep -f "merge-guard.sh"; do sleep; done` 처럼 걸어 놓으면
#   **그 패턴이 자기 자신의 명령줄에도 걸린다.** pgrep 은 자기를 뺀 모든 프로세스를 보는데,
#   대기 루프를 돌리는 «부모 bash» 의 명령줄에 그 문자열이 통째로 들어 있기 때문이다.
#   그래서 조건이 영영 안 풀리고, 알림만 계속 올라와 토큰을 먹는다.
#
# 어떻게 잡나 — 추측이 아니라 «확정»으로
#   각 대기 프로세스의 pgrep 패턴을 꺼내, **그 프로세스 자신의 명령줄에 그 패턴이 맞는지** 본다.
#   맞으면 그건 «느린 것»이 아니라 **수학적으로 안 끝나는 것**이다. 오탐이 없다.
#   덤으로 오래 도는 sleep 루프도 참고로 적는다(이건 판단이 필요하니 빨강으로 안 센다).
#
# 종료코드: 0 깨끗 · 1 자기참조 대기 루프 발견(즉시 정리할 것)
set -u
SELF_PID=$$
found=0
note=0

while IFS= read -r line; do
  line=${line#"${line%%[![:space:]]*}"}   # ★ps 가 pid 앞에 공백을 채운다 — 안 벗기면 pid 가 빈 값이 된다(첫 판 실수)
  pid=${line%% *}
  cmd=${line#* }
  [ "$pid" = "$SELF_PID" ] && continue
  case "$cmd" in *stale-waiters*) continue;; esac          # 자기 자신은 뺀다
  case "$cmd" in *pgrep*) ;; *) continue;; esac            # pgrep 을 쓰는 것만
  case "$cmd" in *until*|*while*) ;; *) continue;; esac    # 그중 루프만

  # pgrep -f "패턴" / pgrep -f 패턴 에서 패턴을 꺼낸다
  pat=$(printf '%s' "$cmd" | sed -n 's/.*pgrep[[:space:]]\+-[a-z]*f[a-z]*[[:space:]]\+"\([^"]*\)".*/\1/p')
  [ -z "$pat" ] && pat=$(printf '%s' "$cmd" | sed -n "s/.*pgrep[[:space:]]\+-[a-z]*f[a-z]*[[:space:]]\+'\([^']*\)'.*/\1/p")
  [ -z "$pat" ] && pat=$(printf '%s' "$cmd" | sed -n 's/.*pgrep[[:space:]]\+-[a-z]*f[a-z]*[[:space:]]\+\([^ ;|)]*\).*/\1/p')
  [ -z "$pat" ] && continue

  if printf '%s' "$cmd" | grep -qE -- "$pat" 2>/dev/null; then
    found=1
    echo "STALE_WAIT 자기참조 대기 루프 — pid $pid 는 영영 안 끝난다"
    echo "  찾는 패턴 : $pat"
    echo "  그런데 자기 명령줄이 그 패턴에 걸린다 → 조건이 풀릴 수 없다"
    echo "  명령줄    : $(printf '%s' "$cmd" | cut -c1-160)"
    echo "  정리      : TaskStop 으로 그 작업을 멈출 것(또는 kill $pid)"
  else
    note=$((note+1))
  fi
done < <(ps -eo pid=,args= 2>/dev/null)

if [ "$found" = 0 ]; then
  [ "$note" -gt 0 ] && echo "[STALE_WAIT] 자기참조 0건 (대기 루프 ${note}개는 정상 — 패턴이 자기를 안 문다)" \
                    || echo "[STALE_WAIT] 대기 루프 없음"
fi
exit "$found"
