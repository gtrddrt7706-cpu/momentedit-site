#!/usr/bin/env bash
# [DEPLOY_ONE] 배포 한 줄 — 검증하고, 밀고, 막히면 사람이 이어받을 수 있는 형태로 내려놓는다.
#
#   sh scripts/deploy.sh
#
# 왜 이 파일이 있나 (2026-08-04) —
#   이 저장소는 main 에 푸시되면 Vercel 이 자동 배포한다. 그래서 '푸시 = 배포'다.
#   그런데 세션이 도는 도중에 실행 환경의 git 프록시가 **저장소 승인 검사**를 켤 수 있다.
#   그러면 토큰이 멀쩡해도 403 이 나고, 그 시점부터 그 세션에서는 어떤 방법으로도 못 민다.
#   그때마다 사람이 상황을 파악하고 패치를 뽑는 일을 반복하지 않도록, 여기서 한 번에 끝낸다.
#
# ★절대 하지 않는 것 — 프록시 우회.
#   프록시 환경변수를 비우고 git 설정까지 꺼서 토큰을 URL 에 실어 미는 '해법'이 돌아다닌다(자세한 형태는
#   CLAUDE.md '배포가 막혔을 때' 참고 — 여기엔 그대로 도는 형태로 적지 않는다).
#   그건 실행 환경이 에이전트에게 건 통제를 벗기는 일이다. 저장소도 토큰도 우리 것이지만
#   그 통제는 우리 것이 아니다. 프록시 안내문(~/.ccr/README.md)도 같은 말을 한다:
#   "never unset HTTPS_PROXY, do not retry organization policy denials (403/407) — report them instead".
#   막히면 뚫지 말고, 아래처럼 사람이 30초에 이어받을 수 있게 내려놓는다.

set -u
cd "$(dirname "$0")/.." || exit 1

OUT="_deploy-patch"

say() { printf '%s\n' "$*"; }

# ── ① 마커 자가진단 (푸시 전 필수 · CLAUDE.md 병렬 세션 규칙 5)
if [ -f automation/tests/merge-guard.sh ]; then
  say "▸ merge-guard 자가진단…"
  if ! sh automation/tests/merge-guard.sh > /tmp/deploy-mg.log 2>&1; then
    say "✗ merge-guard 실패 — 배포를 멈춘다. 아래 확인:"
    grep -E "REVERT|중단" /tmp/deploy-mg.log | head -20
    exit 1
  fi
  say "  ok"
fi

# ── ② 최신 main 위로
say "▸ origin/main 최신화…"
git pull --rebase -q 2>/dev/null || say "  (pull 생략 — 원격을 못 읽었다. 아래 푸시에서 다시 판명된다)"

AHEAD=$(git rev-list --count @{u}..HEAD 2>/dev/null || echo 0)
if [ "$AHEAD" = "0" ]; then
  say "▸ 올릴 커밋이 없다. 이미 배포된 상태."
  exit 0
fi
say "▸ 올릴 커밋 ${AHEAD}건:"
git log --oneline @{u}..HEAD | sed 's/^/    /'

# ── ③ 푸시
say "▸ push…"
if git push 2>/tmp/deploy-push.log; then
  say "✅ 배포 완료 — Vercel 이 main 을 받아 자동 반영한다(보통 1분 내)."
  say "   라이브 확인: curl -sL https://www.momentedit.kr/ | head -c 200"
  rm -rf "$OUT"
  exit 0
fi

# ── ④ 막혔을 때 — 원인을 가려서 알려주고, 사람이 이어받을 것을 만들어 둔다
say ""
if grep -q "authorized repository set\|access denied by the git proxy" /tmp/deploy-push.log; then
  say "✗ 실행 환경의 git 프록시가 막았다 (403 · 정책 거부)."
  say ""
  say "  원인 — 이 세션의 '승인된 저장소 목록'에 이 저장소가 없다."
  say "         토큰 문제가 아니다(유효한 토큰이 있어도 같은 403 이 난다)."
  say "         목록은 **세션이 시작할 때** 한 번 읽어 온다 → 지금 승인해도 이 세션엔 안 붙는다."
  say ""
  say "  ★프록시를 벗겨서 뚫지 말 것. 아래대로 넘긴다."
else
  say "✗ push 실패:"
  tail -3 /tmp/deploy-push.log | sed 's/^/    /'
fi

rm -rf "$OUT"; mkdir -p "$OUT"
git format-patch @{u}..HEAD -o "$OUT" -q
say ""
say "  ▸ 이어받을 것을 ${OUT}/ 에 만들어 뒀다:"
ls -1 "$OUT" | sed 's/^/      /'
say ""
say "  ▸ 사람이 할 일 (둘 중 하나 · 30초)"
say "     A. 새 세션(저장소 승인된 상태로 시작)에서 이 패치들을 붙이고 푸시"
say "     B. 저장소 폴더에서:  git am --3way ${OUT}/*.patch && git push"
say ""
say "  ▸ 다음부터 안 막히려면 — 세션을 **시작하기 전에** 소스 목록에 이 저장소를 넣어 둔다."
exit 1
