/* [INV_BACK][GV_BACK] 갤러리에서 'Open' 으로 넘어온 화면에 돌아갈 문을 놓는다 — **한 벌로**.
 *
 * 왜 여기로 옮겼나 (2026-08-04) —
 *   원래 이 알약은 shared/hydrate.js 안에 있었고, hydrate 를 쓰는 청첩장 16장에만 떴다.
 *   그런데 갤러리에는 안내 카드가 셋 더 있다(맞춤 안내 · 모바일 참석 · 하객 안내).
 *   그 셋은 hydrate 를 쓰지 않아, Open 으로 들어가면 돌아갈 문이 아예 없었다
 *   (사용자 지적 "오픈눌러서 들어가면 그전 청첩장이랑 똑같은 디자인으로 뒤로가기 버튼 만들기 연속성을 위해").
 *   ★두 벌로 만들지 않았다. 그렇게 하면 언젠가 한쪽만 손대 생김새가 갈린다 —
 *     이번 작업에서 스크롤 표시가 딱 그렇게 8 대 8로 갈라져 있었다. 한 곳에서 만들어 19장이 함께 쓴다.
 *
 * 언제 뜨나 —
 *   ① ?gv=<카드번호>-<판>  갤러리가 Open 에 붙여 보내는 표식(어느 카드로 돌아갈지까지 담겨 있다)
 *   ② ?e=test-couple      표본 청첩장 직접 열람(종전 조건 그대로 — 홍보 링크로 들어온 사람도 돌아갈 수 있게)
 *   ★고객이 받는 진짜 청첩장 주소에는 둘 다 없다. 하객 화면에 '갤러리'가 뜨면 그건 결함이다.
 *   ★갤러리 프레임 안(iframe)에서는 좌우 넘기기가 그 일을 하므로 놓지 않는다.
 *
 * 생김새는 종전 그대로 — 알약 · 한글 세리프 12.5px · 어두운 판에서 색 반전 · 44px 누를 자리.
 */
(function () {
  function inject() {
    try {
      if (document.getElementById('meGvBack')) return true;
      if (!document.body) return false;

      var p, gv = null, e = '';
      try { p = new URLSearchParams(location.search); gv = p.get('gv'); e = (p.get('e') || '').trim(); } catch (_) { return true; }
      if (!gv && e !== 'test-couple') return true;                 // 실제 하객 경로 — 놓지 않는다
      try { if (window.parent && window.parent !== window) return true; } catch (_) { return true; }   // 갤러리 프레임 안

      /* 돌아갈 곳 — 뒤로가기가 살아 있으면 그게 가장 정확하다(보던 카드·판·스크롤 자리 그대로).
         새 탭·직접 열람이면 표식에 담긴 카드로 되돌아간다. */
      var m = /^(\d+)-(on|off)$/.exec(gv || '');
      var back = '/invitation-gallery.html'
        + (m ? ('?i=' + m[1] + '&v=' + (m[2] === 'off' ? 'offline' : 'online')) : '');
      var canBack = false;
      try { canBack = history.length > 1; } catch (_) {}
      if (!canBack && !gv) return true;                            // 종전 조건 유지 — 돌아갈 데가 없으면 문도 없다

      var dark = false;
      try {
        var bc = (getComputedStyle(document.body).backgroundColor || '').match(/[0-9.]+/g);
        if (bc && bc.length >= 3) dark = (0.299 * bc[0] + 0.587 * bc[1] + 0.114 * bc[2]) < 128;
      } catch (_) {}

      var a = document.createElement('button');
      a.id = 'meGvBack';
      a.type = 'button';
      a.setAttribute('aria-label', '갤러리로 돌아가기');
      a.style.cssText = 'position:fixed;left:max(14px,env(safe-area-inset-left));'
        + 'top:calc(12px + env(safe-area-inset-top));z-index:2147483000;'
        + 'display:inline-flex;align-items:center;gap:6px;min-height:44px;padding:11px 16px 11px 13px;'
        + 'font-family:"Noto Serif KR","Nanum Myeongjo",serif;font-size:12.5px;letter-spacing:0.04em;'
        + 'border-radius:999px;cursor:pointer;-webkit-tap-highlight-color:transparent;'
        + 'backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);'
        + (dark
            ? 'background:rgba(28,27,25,0.62);color:#EDE8DF;border:1px solid rgba(184,154,117,0.42);'
            : 'background:rgba(255,255,255,0.82);color:#3A2D22;border:1px solid rgba(28,27,25,0.12);');
      a.innerHTML = '<span aria-hidden="true" style="font-size:15px;line-height:1">‹</span><span>갤러리</span>';
      a.addEventListener('click', function () {
        try {
          if (canBack && (document.referrer || '').indexOf('invitation-gallery.html') > -1) { history.back(); return; }
        } catch (_) {}
        if (back) location.href = back; else { try { history.back(); } catch (_) {} }
      });
      document.body.appendChild(a);

      /* [INV_BACK_DODGE] 알약이 커버 워드마크를 덮었다(02·03·04·05·07 실측 61×14px 겹침, 16종 검수).
         디자인마다 마스트 높이가 달라 고정 top으론 전부 못 피한다 — 붙인 뒤 실제로 밑에 깔린
         텍스트 요소를 히트테스트로 찾아, 있으면 그 아래로 내려앉는다(최대 132px). */
      requestAnimationFrame(function () {
        try {
          var r = a.getBoundingClientRect(), low = 0;
          var pts = [[r.left + 6, r.top + r.height / 2], [r.right - 6, r.top + r.height / 2], [(r.left + r.right) / 2, r.top + 4]];
          for (var i = 0; i < pts.length; i++) {
            var els = document.elementsFromPoint(pts[i][0], pts[i][1]) || [];
            for (var j = 0; j < els.length; j++) {
              var el = els[j];
              if (el === a || a.contains(el) || el === document.body || el === document.documentElement) continue;
              if (!el.textContent || !el.textContent.trim()) continue;
              var b2 = el.getBoundingClientRect();
              if (b2.height > 0 && b2.height < 160 && b2.bottom > low) low = b2.bottom;   // 화면만 한 배경 컨테이너는 제외
            }
          }
          if (low > 0) a.style.top = Math.min(132, Math.round(low) + 10) + 'px';
        } catch (_) {}
      });
      return true;
    } catch (_) { return true; }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', inject);
  else inject();
  // 하이드레이션이 body 를 갈아 끼우는 판이 있다 — 몇 박자 뒤 다시 확인한다(스크롤 표시와 같은 이유)
  [400, 1200, 2500].forEach(function (t) { setTimeout(inject, t); });
})();
