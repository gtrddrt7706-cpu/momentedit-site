/* Moment Edit — 왼쪽 가장자리 스와이프 → 뒤로가기  [EDGE_BACK]
 *
 * 설계 원칙
 *  1) iOS는 제외한다. 사파리가 이미 왼쪽 가장자리 스와이프를 시스템 뒤로가기로 쓴다.
 *     겹치면 한 번 쓸었는데 두 번 뒤로 가거나 시스템 것이 먹혀 우리 효과만 헛돈다.
 *     안드로이드·데스크톱(터치 지원)에서만 켠다.
 *  2) 시작 영역을 왼쪽 24px로 좁힌다. 본문 가로 스크롤·캔버스 서명 등과 겹치지 않게.
 *  3) 가로 우세(|dx| > |dy|*1.5)일 때만 제스처로 인정한다. 세로 스크롤을 뺏지 않는다.
 *     — mypage의 '당겨서 새로고침'(세로)과 공존해야 한다.
 *  4) prefers-reduced-motion 이면 통째로 끈다. 시스템 뒤로가기는 그대로 쓸 수 있다.
 *  5) 되돌아갈 이력이 없으면 켜지 않는다.
 *
 * 무드 규칙(스킬 momentedit-design 준수)
 *  - 손가락을 따라 페이지가 밀리고, 왼쪽 가장자리에 진사 빛이 얇게 번진다.
 *  - 스프링·바운스·그림자 없음. 되돌아갈 땐 --ease(0.3s), 나갈 땐 0.45s.
 */
(function () {
  "use strict";

  var d = document, w = window;
  if (!("ontouchstart" in w) && !navigator.maxTouchPoints) return;

  // ── 1) iOS 제외 (아이패드는 iPadOS 13+ 부터 Mac으로 위장하므로 터치 수로 판별)
  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
              (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  if (isIOS) return;

  // ── 4) 모션 축소 존중
  if (w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // ── 5) 되돌아갈 곳이 있나
  if (!(history.length > 1)) return;

  var EDGE = 24;        // 시작 인정 영역(px)
  var RATIO = 1.5;      // 가로 우세 판정
  var MAX = 0.42;       // 따라오는 최대 비율(화면폭 대비)
  var COMMIT = 0.30;    // 확정 임계(화면폭 대비)
  var FLICK = 0.55;     // 확정 속도(px/ms) — 짧게 튕겨도 넘어가게

  var startX = 0, startY = 0, startT = 0;
  var dx = 0, active = false, decided = false, vw = 1;
  var glow = null;

  function makeGlow() {
    if (glow) return glow;
    glow = d.createElement("div");
    glow.setAttribute("aria-hidden", "true");
    glow.style.cssText =
      "position:fixed;left:0;top:0;bottom:0;width:56px;z-index:2147483000;" +
      "pointer-events:none;opacity:0;" +
      "background:linear-gradient(to right,rgba(107,42,36,.38),rgba(107,42,36,.14) 42%,rgba(107,42,36,0));";
    d.body.appendChild(glow);
    return glow;
  }

  function paint(x) {
    var p = Math.max(0, Math.min(1, x / (vw * COMMIT)));
    var shift = Math.min(x * 0.55, vw * MAX);
    var root = d.documentElement;
    root.style.transform = "translate3d(" + shift.toFixed(1) + "px,0,0)";
    makeGlow().style.opacity = (p * 0.9).toFixed(3);
  }

  function reset(animate) {
    var root = d.documentElement;
    if (animate) {
      root.style.transition = "transform .3s cubic-bezier(0.16,1,0.3,1)";
      if (glow) glow.style.transition = "opacity .3s cubic-bezier(0.16,1,0.3,1)";
    }
    root.style.transform = "";
    if (glow) glow.style.opacity = "0";
    w.setTimeout(function () {
      root.style.transition = "";
      if (glow) glow.style.transition = "";
    }, animate ? 320 : 0);
  }

  function commit() {
    var root = d.documentElement;
    root.style.transition = "transform .45s cubic-bezier(0.16,1,0.3,1)";
    root.style.transform = "translate3d(" + Math.round(vw * MAX) + "px,0,0)";
    if (glow) {
      glow.style.transition = "opacity .45s cubic-bezier(0.16,1,0.3,1)";
      glow.style.opacity = "0";
    }
    // 화면이 밀리기 시작한 뒤 이동 — 이전 페이지가 그려지며 자연스럽게 이어진다
    w.setTimeout(function () { history.back(); }, 160);
    w.setTimeout(function () { reset(false); }, 700); // 뒤로가기가 실패해도 원위치
  }

  // 터치 시작점이 가로로 스크롤되는 영역 안이면 제스처를 포기한다
  function inScrollable(el) {
    for (var n = el; n && n !== d.body; n = n.parentElement) {
      if (n.scrollWidth > n.clientWidth + 4) return true;
      var t = n.tagName;
      if (t === "CANVAS" || t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return true;
    }
    return false;
  }

  d.addEventListener("touchstart", function (e) {
    active = decided = false;
    if (e.touches.length !== 1) return;
    var t = e.touches[0];
    if (t.clientX > EDGE) return;
    if (inScrollable(e.target)) return;
    vw = w.innerWidth || 1;
    startX = t.clientX; startY = t.clientY; startT = Date.now();
    dx = 0; active = true;
  }, { passive: true });

  d.addEventListener("touchmove", function (e) {
    if (!active || e.touches.length !== 1) return;
    var t = e.touches[0];
    var ddx = t.clientX - startX, ddy = t.clientY - startY;

    if (!decided) {
      if (Math.abs(ddx) < 8 && Math.abs(ddy) < 8) return;   // 아직 방향 미정
      // 세로 우세이거나 왼쪽으로 끌면 제스처 취소 — 스크롤을 뺏지 않는다
      if (ddx <= 0 || Math.abs(ddx) < Math.abs(ddy) * RATIO) { active = false; return; }
      decided = true;
    }
    dx = Math.max(0, ddx);
    if (e.cancelable) e.preventDefault();   // 가로 제스처 확정 후에만 스크롤 차단
    paint(dx);
  }, { passive: false });

  function end() {
    if (!active) return;
    var wasDecided = decided;
    active = decided = false;
    if (!wasDecided) return;
    var v = dx / Math.max(1, Date.now() - startT);
    if (dx > vw * COMMIT || v > FLICK) commit();
    else reset(true);
  }
  d.addEventListener("touchend", end, { passive: true });
  d.addEventListener("touchcancel", function () {
    if (active && decided) reset(true);
    active = decided = false;
  }, { passive: true });
})();
