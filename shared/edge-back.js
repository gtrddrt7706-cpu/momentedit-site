/* Moment Edit — 왼쪽 가장자리 스와이프 → 뒤로가기  [EDGE_BACK]
 *
 * 설계 원칙
 *  1) iOS는 끄지 않고 '비켜간다'. 사파리 시스템 뒤로가기는 화면 맨 왼쪽 약 20px에서만
 *     발동하므로, 그 띠를 피해 안쪽 24~76px에서 받으면 충돌 없이 공존한다.
 *     (안드로이드·터치 데스크톱은 0~28px — 시스템 제스처가 없으니 진짜 가장자리에서 받는다)
 *  2) 시작 영역을 좁게 유지한다. 본문 가로 스크롤·캔버스 서명 등과 겹치지 않게.
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

  // ── 1) iOS는 '끄지 않고 비켜간다'
  //    사파리 시스템 뒤로가기는 화면 맨 왼쪽 약 20px에서만 발동한다.
  //    그 띠를 피해 안쪽(24~76px)에서 받으면 충돌 없이 공존한다.
  //    (2026-07-31 1차에서는 iOS를 통째로 껐으나, 주 고객층이 아이폰이라 공존안으로 전환)
  var ua = navigator.userAgent;
  var isIOS = /iPad|iPhone|iPod/.test(ua) ||
              (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1);
  var ZONE_MIN = isIOS ? 24 : 0;
  var ZONE_MAX = isIOS ? 76 : 28;

  // ── 4) 모션 축소 존중
  if (w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  // ── 5) 되돌아갈 곳이 있나
  if (!(history.length > 1)) return;

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
    if (t.clientX < ZONE_MIN || t.clientX > ZONE_MAX) return;
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

/* ── ③ 모달 아래로 쓸어 닫기  [SHEET_DISMISS]
 * mypage의 확인 모달(.mp-modal.open)을 아래로 쓸어 닫는다.
 * 위 가장자리 제스처와 축이 달라(세로) 서로 간섭하지 않는다.
 * 서명 캔버스·입력창 위에서 시작하면 포기한다 — 그림이 끊기면 안 된다.
 */
(function () {
  "use strict";
  var d = document, w = window;
  if (!("ontouchstart" in w) && !navigator.maxTouchPoints) return;
  if (w.matchMedia && w.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

  var THRESH = 96;      // 닫힘 임계(px)
  var FLICK = 0.5;      // 또는 이 속도(px/ms)
  var card = null, y0 = 0, t0 = 0, dy = 0, on = false, moved = false;

  function openCard() {
    var ov = d.querySelector(".mp-modal.open");
    return ov ? ov.querySelector(".mp-modal-card") : null;
  }
  function guard(el) {
    for (var n = el; n && n !== d.body; n = n.parentElement) {
      var t = n.tagName;
      if (t === "CANVAS" || t === "INPUT" || t === "TEXTAREA" || t === "SELECT") return true;
      if (n.scrollHeight > n.clientHeight + 4 && n !== d.documentElement) return true;
    }
    return false;
  }
  function put(v, anim) {
    if (!card) return;
    card.style.transition = anim ? "transform .3s cubic-bezier(0.16,1,0.3,1),opacity .3s cubic-bezier(0.16,1,0.3,1)" : "";
    card.style.transform = v ? "translate3d(0," + v.toFixed(1) + "px,0)" : "";
    card.style.opacity = v ? Math.max(0.35, 1 - v / 320).toFixed(3) : "";
  }
  function clear() {
    if (!card) return;
    var c = card;
    w.setTimeout(function () { c.style.transition = ""; c.style.transform = ""; c.style.opacity = ""; }, 320);
  }

  d.addEventListener("touchstart", function (e) {
    on = moved = false; card = null;
    if (e.touches.length !== 1) return;
    var c = openCard();
    if (!c) return;
    if (guard(e.target)) return;
    card = c; y0 = e.touches[0].clientY; t0 = Date.now(); dy = 0; on = true;
  }, { passive: true });

  d.addEventListener("touchmove", function (e) {
    if (!on || e.touches.length !== 1) return;
    var ddy = e.touches[0].clientY - y0;
    if (!moved) {
      if (Math.abs(ddy) < 8) return;
      if (ddy < 0) { on = false; return; }   // 위로 끌면 취소
      moved = true;
    }
    dy = Math.max(0, ddy);
    if (e.cancelable) e.preventDefault();
    put(dy * 0.85, false);
  }, { passive: false });

  d.addEventListener("touchend", function () {
    if (!on) return;
    var was = moved; on = moved = false;
    if (!was || !card) return;
    var v = dy / Math.max(1, Date.now() - t0);
    if (dy > THRESH || v > FLICK) {
      put(w.innerHeight, true);
      // 기존 닫기 경로를 그대로 쓴다 — '취소'로 처리되어 결과값 계약이 안 깨진다.
      // 백드롭 클릭(e.target===ov)과 Esc 둘 다 쏜다. 모달 내부 done 플래그가 중복을 막는다.
      var ov = d.querySelector(".mp-modal.open");
      if (ov) w.setTimeout(function () {
        ov.click();
        d.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
      }, 90);
      clear();
    } else {
      put(0, true); clear();
    }
  }, { passive: true });
})();
