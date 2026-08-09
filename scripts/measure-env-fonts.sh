#!/bin/sh
# 측정 환경의 한글 폰트를 맞춘다 [MEASURE_FONTS · 2026-08-09]
#
#   sh scripts/measure-env-fonts.sh
#
# ★왜 필요한가 — 같은 도구인데 두 세션의 숫자가 달랐다(코드 세션 지적).
#   이 컨테이너들은 fonts.googleapis.com 요청이 나가지 않는다(실측: 폰트 요청 0건).
#   그래서 CSS 가 부르는 'Noto Serif KR' · 'Noto Sans KR' 를 로컬에서 찾는데,
#   설치된 실물의 이름은 'Noto Serif CJK KR' 이라 **이름이 안 맞아 DejaVu Sans 로 떨어진다**
#   (fc-match "Noto Serif KR" → DejaVuSans.ttf 로 확인).
#   한글이 DejaVu 로 그려지면 폭이 달라지고, 폭이 달라지면 줄바꿈이 달라지고,
#   줄바꿈이 달라지면 요소 높이와 줄 간격이 달라진다 — 탭 판정이 갈리는 진짜 원인이다.
#   실측: 16px 한글 13자 폭이 170.0px → 174.4px (2.6%). 빽빽한 카드에서는 한 줄이 오간다.
#
# 이 스크립트는 이름만 이어 준다(별칭). 자형·메트릭은 같은 집안이라 실제 기기에 훨씬 가깝다.
# ★재현성이 목적이다 — 두 세션이 같은 숫자를 봐야 서로의 발견을 검증할 수 있다.
set -e
CONF="$HOME/.config/fontconfig/fonts.conf"
mkdir -p "$(dirname "$CONF")"
if [ -f "$CONF" ] && grep -q 'Noto Serif CJK KR' "$CONF"; then
  echo "이미 되어 있습니다: $CONF"
else
  cat > "$CONF" <<'XML'
<?xml version="1.0"?><!DOCTYPE fontconfig SYSTEM "fonts.dtd">
<fontconfig>
  <alias binding="strong"><family>Noto Serif KR</family><prefer><family>Noto Serif CJK KR</family></prefer></alias>
  <alias binding="strong"><family>Noto Sans KR</family><prefer><family>Noto Sans CJK KR</family></prefer></alias>
  <alias binding="strong"><family>Noto Serif JP</family><prefer><family>Noto Serif CJK JP</family></prefer></alias>
</fontconfig>
XML
  fc-cache -f >/dev/null 2>&1 || true
  echo "별칭을 넣었습니다: $CONF"
fi
echo "  Noto Serif KR → $(fc-match 'Noto Serif KR')"
echo "  Noto Sans KR  → $(fc-match 'Noto Sans KR')"
case "$(fc-match 'Noto Serif KR')" in
  *CJK*) echo "✓ 한글이 Noto CJK 로 그려집니다 — 측정값을 서로 대조해도 됩니다" ;;
  *) echo "✗ 아직 DejaVu 등으로 떨어집니다. fonts-noto-cjk 를 설치하세요:"
     echo "    apt-get install -y fonts-noto-cjk   (또는 배포판 상응 패키지)"; exit 1 ;;
esac
