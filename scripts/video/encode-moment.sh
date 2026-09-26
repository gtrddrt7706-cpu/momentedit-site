#!/bin/sh
# [VIDEO_ENCODE 2026-09-26 코워크 회신5 4-8 · 연구 F05] 장면 영상 굽기 — 사장님이 주신 mp4 하나를 사이트 규격으로.
#   쓰는 법:  sh scripts/video/encode-moment.sh 받은파일.mp4 entry-look [비트레이트(기본 2500k)]
#   만드는 것: assets/video/moments/<이름>.mp4 (H.264 High · 1280×720 · 소리 트랙 없음 · faststart)
#             assets/video/moments/<이름>.webp (첫 장면 · poster)
#   ★이름은 사장님 촬영표 17편 그대로(guest · prevideo · candle · entry · entry-look · welcome · bless · vow · ring ·
#     declare · tribute · free · letter · cake · toast-pour · toast · close). 절 영상(entry-bow · tribute-bow)은 만들지 않는다([BOW_VIDEO_OFF]).
#   ★다 구운 뒤 assets/ritual-open.js 의 VIDEO_READY 에 이름을 더해야 화면에 나온다.
#   ★어두운 촛불 장면(candle · guest · prevideo)은 폰 밝기를 최대로 하고 계단 무늬(밴딩)가 보이는지 본다 —
#     보이면 그 편만 비트레이트를 올려(예: 3500k) 다시 굽는다.
set -e
IN="$1"; NAME="$2"; BR="${3:-2500k}"
[ -f "$IN" ] && [ -n "$NAME" ] || { echo "쓰는 법: sh scripts/video/encode-moment.sh 받은파일.mp4 이름 [비트레이트]"; exit 2; }
OUT="$(dirname "$0")/../../assets/video/moments"; mkdir -p "$OUT"
ffmpeg -y -i "$IN" -an -c:v libx264 -profile:v high -pix_fmt yuv420p \
  -vf "scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2" \
  -b:v "$BR" -maxrate "$BR" -bufsize "$(echo "$BR" | sed 's/k$//' | awk '{print $1*2"k"}')" \
  -movflags +faststart "$OUT/$NAME.mp4"
ffmpeg -y -i "$OUT/$NAME.mp4" -frames:v 1 -vf "scale=1280:720" -c:v libwebp -quality 80 "$OUT/$NAME.webp"
ls -la "$OUT/$NAME.mp4" "$OUT/$NAME.webp"
ffprobe -v error -select_streams a -show_entries stream=index -of csv=p=0 "$OUT/$NAME.mp4" | grep -q . && { echo "소리 트랙이 남았다 — 실패"; exit 1; } || echo "소리 트랙 없음 · 끝"
