// 모먼트에디트 · lazy-video 헬퍼 (2026-07-20 · marker: ME_LAZY_VIDEO)
// AI 무드 영상(캔들/화이트)을 jpg 슬롯 대체로 넣기 위한 재사용 유틸.
// 지금은 어디서도 참조 안 함(inert) — 영상 자산이 생기면 아래 마크업만 넣으면 동작.
// 근거 기획: docs/plans/PLAN_AI영상_제작가이드.md §6.
//
// [마크업 예]
//   <video class="lazy-video" poster="/assets/home/snap.jpg"
//          muted loop playsinline preload="none" aria-hidden="true">
//     <source data-src="https://cdn.example/snap.webm" type="video/webm">
//     <source data-src="https://cdn.example/snap.mp4"  type="video/mp4">
//   </video>
// [로드]  <script src="/assets/lazy-video.js" defer></script>
// [동적 삽입 후]  window.initLazyVideos()  ← 마이페이지처럼 나중에 그려지는 DOM 재스캔
//
// 동작:
//  · 뷰포트 진입 시에만 data-src→src 승격 후 재생(초기 로딩·모바일 데이터 절약)
//  · prefers-reduced-motion: reduce → 승격/재생 안 함(poster 정지 이미지만 · 접근성)
//  · 소스 로드 실패(onerror) → poster 이미지로 자동 폴백(현행 jpg onerror 규칙과 동일)
(function () {
  'use strict';
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  var reduce = false;
  try {
    reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  } catch (e) { reduce = false; }

  function toPosterImg(v) {
    // 재생 실패·소스 없음 → poster를 <img>로 교체(레이아웃 유지)
    try {
      var poster = v.getAttribute('poster') || '';
      if (!poster) { v.style.display = 'none'; return; }
      var img = new Image();
      img.src = poster;
      img.loading = 'lazy';
      img.alt = v.getAttribute('data-alt') || '';
      if (v.className) img.className = v.className;
      img.setAttribute('aria-hidden', 'true');
      if (v.parentNode) v.parentNode.replaceChild(img, v);
    } catch (e) { try { v.style.display = 'none'; } catch (_) {} }
  }

  function promote(v) {
    if (v._lvDone) return;
    v._lvDone = true;
    var srcs = v.querySelectorAll('source[data-src]');
    if (!srcs.length) { toPosterImg(v); return; }
    for (var i = 0; i < srcs.length; i++) {
      var s = srcs[i];
      s.setAttribute('src', s.getAttribute('data-src'));
      s.removeAttribute('data-src');
    }
    v.addEventListener('error', function () { toPosterImg(v); }, true);
    try { v.load(); } catch (e) {}
    var p = v.play && v.play();
    if (p && typeof p.catch === 'function') p.catch(function () { /* autoplay 차단 시 poster 유지 */ });
  }

  var io = null;
  function observer() {
    if (io || typeof IntersectionObserver === 'undefined') return io;
    io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { promote(en.target); io.unobserve(en.target); }
      });
    }, { rootMargin: '200px 0px' });
    return io;
  }

  function init(root) {
    var scope = root && root.querySelectorAll ? root : document;
    var vids = scope.querySelectorAll('video.lazy-video');
    for (var i = 0; i < vids.length; i++) {
      var v = vids[i];
      if (v._lvSeen) continue;
      v._lvSeen = true;
      // reduce-motion 이거나 IO 미지원(구형) → 승격 안 하고 poster만(정지)
      if (reduce) continue;
      var ob = observer();
      if (ob) ob.observe(v); else promote(v);   // IO 없으면 즉시 로드(폴백)
    }
  }

  window.initLazyVideos = init;
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { init(document); });
  } else {
    init(document);
  }
})();
