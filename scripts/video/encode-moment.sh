#!/bin/sh
# [VIDEO_ENCODE 2026-09-26 코워크 회신5 4-8 · 연구 F05] 장면 영상 굽기 — 사장님이 주신 mp4 하나를 사이트 규격으로.
#   쓰는 법:  sh scripts/video/encode-moment.sh 받은파일.mp4 entry-look [화질 CRF(기본 24)] [칸 그림 초(자른 뒤 기준 · 기본 첫 장면)]
#   ★★[VID_MOVE_NOW 2026-10-09 사장님 «처음에 멈춰 있는 시간이 너무 긴 거 같아 · 직접 보고 확인해서 열자마자 움직일 수 있게»] 굽기가 둘을 함께 한다.
#     ① 앞의 멈춘 구간을 자른다 — 실제로 움직이기 시작하는 프레임(4프레임 안에 눈에 띄게 바뀌는 첫 프레임)의 2프레임 앞에서 시작한다.
#        재는 곳은 scripts/audit/video-start.mjs --start 한 곳(검사와 같은 셈) · START=초 로 직접 줄 수도 있다.
#        받은 v8 묶음은 실제로 움직이기까지 0.17~3.17초 동안 그림이 그대로였다(식전 영상 3.17초) — 폰이 받는 시간과 겹쳐 «한참 멈춰 있다»로 보였다.
#     ② 가볍게 — CRF 24 · 상한 2.5Mbps. 받은 판 1.59~4.20Mbps → 0.67~1.49Mbps(합 65.0MB → 21.2MB) · 첫 1초 분량 272~668KB → 113~307KB.
#        같은 프레임끼리 SSIM 0.981~0.993(17편) · 2배 확대에서도 연필 결 · 머리카락이 같았다.
#     KEEP_CARD=1 이면 칸 그림(-640.webp)은 그대로 둔다 — 사장님이 고른 장면(candle · entry · prevideo · tribute · toast)을 다시 뽑지 않을 때만.
#        나머지는 KEEP_CARD 없이 — 칸 그림 = 새 첫 장면(받은 표지는 뒤 장면과 조금 달라 옛 칸 그림을 두면 ① 창에서 그림이 튄다 · listen-page V-5).
#     ★받은 파일을 그대로 assets 에 넣지 않는다 — 10/9 v8 교체 때 그대로 넣어 위 둘이 다 빠졌다. video-start.mjs 가 막는다.
#   ★[THUMB_PICK 2026-10-03] 칸 그림(-640.webp)만 다른 장면에서 뜰 수 있다 — 넷째 값이 그 초(★자른 뒤 기준). 창 · 영상 첫 장면(<이름>.webp)은 늘 첫 장면(재생이 튀지 않게).
#     지금 칸 그림(v8 받은 원본 기준 초): candle 9.8(두 초 다 켜짐) · entry 8.0 · prevideo 7.7 · tribute 8.0 · toast 2.5(사장님 지정 · 가슴 높이로 든 잔) · 나머지 첫 장면.
#     다시 구울 때 넷째 값을 빼먹으면 첫 장면으로 돌아간다 — 표는 assets/ritual-open.js 의 [THUMB_PICK].
#   만드는 것: assets/video/moments/<이름>.mp4 (H.264 High · 1280×720 · 소리 트랙 없음 · faststart)
#             assets/video/moments/<이름>.webp (첫 장면 · poster · 창에서)
#             assets/video/moments/<이름>-640.webp (첫 장면 칸용 작은 판 · 640px 폭) [POSTER_SMALL 2026-09-26 코워크 최종판 3-5]
#               ① 칸 열세 개가 1280 판을 받으면 카톡 데이터가 든다 — 칸은 작은 판만 쓴다(창은 큰 판 + 영상).
#   ★이름은 사장님 촬영표 17편 그대로(guest · prevideo · candle · entry · entry-look · welcome · bless · vow · ring ·
#     declare · tribute · free · letter · cake · toast-pour · toast · close) + table(테이블 인사 · 2026-10-09 사장님 «table 넣어» · [TABLE_VIDEO_1009]) = 18편. 절 영상(entry-bow · tribute-bow)은 만들지 않는다([BOW_VIDEO_OFF]).
#   ★다 구운 뒤 assets/ritual-open.js 의 VIDEO_READY 에 이름을 더해야 화면에 나온다.
#   ★어두운 촛불 장면(candle · guest · prevideo)은 폰 밝기를 최대로 하고 계단 무늬(밴딩)가 보이는지 본다 —
#     보이면 그 편만 CRF 를 낮춰(예: 21) 다시 굽는다.
set -e
IN="$1"; NAME="$2"; CRF="${3:-24}"; TAT="${4:-}"
[ -f "$IN" ] && [ -n "$NAME" ] || { echo "쓰는 법: sh scripts/video/encode-moment.sh 받은파일.mp4 이름 [CRF] [칸 그림 초]"; exit 2; }
HERE="$(dirname "$0")"; OUT="$HERE/../../assets/video/moments"; mkdir -p "$OUT"
# ① [VID_MOVE_NOW] 앞의 멈춘 구간 — 실제로 움직이기 시작하는 프레임의 2프레임 앞(0 아래로 안 간다 · 안 움직이면 자르지 않는다)
[ -n "${START:-}" ] || START="$(node "$HERE/../audit/video-start.mjs" --start "$IN")"
echo "앞을 자름: ${START}초"
TMP="$OUT/.$NAME.tmp.mp4"   # 받은 파일이 같은 자리에 있어도(다시 굽기) 읽던 파일을 덮지 않게
ffmpeg -nostdin -y -ss "$START" -i "$IN" -an -c:v libx264 -profile:v high -pix_fmt yuv420p -preset slow -crf "$CRF" -maxrate 2500k -bufsize 5000k \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -movflags +faststart "$TMP"
mv "$TMP" "$OUT/$NAME.mp4"
ffmpeg -nostdin -y -i "$OUT/$NAME.mp4" -frames:v 1 -vf "scale=1280:720" -c:v libwebp -quality 80 "$OUT/$NAME.webp"
if [ "${KEEP_CARD:-}" = 1 ] && [ -f "$OUT/$NAME-640.webp" ]; then echo "칸 그림은 그대로(KEEP_CARD=1)"
elif [ -n "$TAT" ]; then ffmpeg -nostdin -y -ss "$TAT" -i "$OUT/$NAME.mp4" -frames:v 1 -vf "scale=640:-2" -c:v libwebp -quality 78 "$OUT/$NAME-640.webp"   # [THUMB_PICK]
else ffmpeg -nostdin -y -i "$OUT/$NAME.mp4" -frames:v 1 -vf "scale=640:-2" -c:v libwebp -quality 78 "$OUT/$NAME-640.webp"; fi   # [POSTER_SMALL]
ls -la "$OUT/$NAME.mp4" "$OUT/$NAME.webp" "$OUT/$NAME-640.webp"
if ffmpeg -nostdin -hide_banner -i "$OUT/$NAME.mp4" 2>&1 | grep -q 'Audio:'; then echo "소리 트랙이 남았다 — 실패"; exit 1; fi
echo "소리 트랙 없음 · 새 판 움직임 시작 $(node "$HERE/../audit/video-start.mjs" --onset "$OUT/$NAME.mp4")초 · 끝"
