#!/bin/sh
# ★[NARR_REBUILD_1110 · 대본 11/10 23:15 «실청 반복으로 고침이 더 올 수 있으니 다시 만들기를 명령 한 줄로»] 나레이션 237클립을 엔진(build-layers 6층)으로 다시 만들고 층 검사를 한 번에 돈다
#   표를 고친다(층1_재료 · 빠르기표_최종_1109 · 층4_쉼 · 층5_자리 · 층6_크기) → 이 한 줄 → 결과 mp3 는 손대지 않는다(엔진으로만 · 높이는 atempo 만)
#   쓰기: sh scripts/narr-rebuild.sh [--ref <비교 mp3 폴더 · 실청 후보 fin>] [--override <승인 소리 폴더>] [--clip =키,…] [--voice 진희|우성] [--list]
#   ★[JINHEE_OUT_1110 사장님 결정 · 대본 11/10 23:20] 진희(안내) 클립은 확정 아님 — 새 성우 녹음이 오면 층1_재료.json 에 l3 테이크(REC_FIX3_1110 처럼) · 빠르기표 값만 넣고
#     sh scripts/narr-rebuild.sh --voice 진희 --list 로 대상 확인 → 그 표로 전체 한 줄(안 바뀐 클립은 바이트 그대로 · 전체로 돌아야 층 검사가 다 맞는다)
#   끝에 «바뀐 클립 / 같은 클립»(--ref 대비 바이트) · 검사 줄마다 ok / FAIL · 하나라도 FAIL 이면 종료 1
set -u
ROOT=$(cd "$(dirname "$0")/.." && pwd); cd "$ROOT"
REF=''; OVR=''; CLIP=''; VOICE=''; LIST=0
while [ $# -gt 0 ]; do case "$1" in --ref) REF=$2; shift 2;; --override) OVR=$2; shift 2;; --clip) CLIP=$2; shift 2;; --voice) VOICE=$2; shift 2;; --list) LIST=1; shift;; *) echo "모르는 인자 $1"; exit 2;; esac; done
if [ -n "$VOICE" ]; then CLIP=$(VOICE="$VOICE" node -e "const fs=require('fs');const m=JSON.parse(fs.readFileSync('docs/plans/식순연구/타입캐스트/manifest.json','utf8'));const all=new Set(require('child_process').execFileSync('node',['scripts/build-layers.mjs','--list']).toString().trim().split(','));const p=(n)=>String(n).padStart(2,'0');console.log(m.clips.filter((c)=>(m.voice||{})[String(c.role).split('|')[0]]===process.env.VOICE&&all.has('='+p(c.no)+'_'+c.file)).map((c)=>'='+p(c.no)+'_'+c.file).join(','))"); fi
if [ "$LIST" = 1 ]; then L=${CLIP:-$(node scripts/build-layers.mjs --list)}; echo "$L" | tr ',' '\n' | grep -c . ; echo "$L"; exit 0; fi
W=${NARR_WORK:-$(mktemp -d "${TMPDIR:-/tmp}/narr-rebuild-XXXX")}; mkdir -p "$W"; rm -f "$W/layer.log" "$W/seat.log"; rm -rf "$W/in"
echo "== 작업 폴더 $W"
LAYER_LOG="$W/layer.log" SEAT_LOG="$W/seat.log" KEEP_IN="$W/in" node scripts/build-layers.mjs --layer 6 ${CLIP:+--clip "$CLIP"} > "$W/build.out" 2>&1 || { tail -20 "$W/build.out"; echo 'FAIL build-layers'; exit 1; }
grep -E '^\[LAYER|✗' "$W/build.out" | tail -20
python3 scripts/build-narration-pad.py > "$W/pad.out" 2>&1 || { cat "$W/pad.out"; echo 'FAIL build-narration-pad'; exit 1; }
fail=0
run() { out=$("$@" 2>&1); rc=$?; echo "$out" | head -14; [ $rc -eq 0 ] || { fail=1; echo "  ↑ FAIL ($*)"; }; }
run node scripts/audit/layer-speed.mjs --log "$W/layer.log"
run node scripts/audit/layer-seats.mjs --seat-log "$W/seat.log"
run node scripts/audit/layer-phrase.mjs --log "$W/layer.log" --seat-log "$W/seat.log" --in "$W/in"
run node scripts/audit/layer-loud.mjs --log "$W/layer.log" --seat-log "$W/seat.log"
# layer-cps(3층 mp3 초당 ±1.5%)는 여기서 돌지 않는다 — 4 · 5층 쉼이 들어간 6층 mp3 에서는 자가 맞지 않는다(9b2b17e 판도 128 밖 · 11/10 실측) · 빠르기는 layer-speed(만들기 기록 ±0.5%)가 잰다 [SPEED_FINAL_1110]
[ -n "$OVR" ] && run node scripts/audit/fix3-match.mjs --a "$OVR"
if [ -n "$REF" ]; then s=0; d=''; for f in "$REF"/*.mp3; do b=$(basename "$f"); if cmp -s "$f" "assets/audio/narration/$b"; then s=$((s+1)); else d="$d ${b%.mp3}"; fi; done
  echo "== --ref 대비 바이트 같음 $s · 다름:${d:- 없음}"; fi
echo "== git 바뀐 mp3 $(git status --short assets/audio/narration | grep -c '\.mp3') 개"
[ $fail -eq 0 ] && echo 'ok   narr-rebuild' || echo 'FAIL narr-rebuild'
exit $fail
