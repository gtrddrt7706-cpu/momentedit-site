/* ★★[FAB_NAMES_1031 사장님 «마우스 올리면 나오는 문구, 위쪽이랑 아래쪽 아이콘도 동일하게» · 코워크] 오른쪽 아이콘 줄(.me-fab-stack)의 모든 단추에 같은 이름표.
   드레스 단추(#mp_dressFab · [DRESS_NM_HOVER])에만 있던 이름표를 공통으로 — 겉모습은 드레스 이름표와 같은 값이다.
   · 마우스가 있는 화면(@media hover:hover)에서만 올림에 뜬다 — 휴대폰 화면 변화 없음 · 키보드 초점(focus-visible)에도 뜬다
   · 이름표와 아이콘 사이 8px 투명 다리 — 포인터를 이름표로 옮겨도 남는다 · Esc 로 닫힘(올림 · 초점이 풀리면 다시)
   · 보일 때 visibility 는 inherit — 줄이 숨었거나(.hide · 메인 첫 화면 전) 맨 위로가 안 보일 때는 이름표도 안 보인다
   · 1회 말풍선(.me-fab-tip)이 떠 있는 동안은 이름표를 안 띄운다(말풍선 우선) · 전체 화면 편집(mp-fs-on) 동안도
   · ★[FAB_NM_ICO_CY 코워크 «이름표 가운데가 아이콘 가운데보다 2px 아래»] 기준은 단추가 아니라 아이콘 가운데(50px → 25px · 680px 이하 46px → 23px) · 올리면 아이콘이 2px 뜨니 이름표도 2px
   · ★[FAB_NM_HOVER_DELAY 코워크 «줄을 훑으면 이름표가 줄줄이 깜빡»] 마우스 올림은 150ms 뒤에 뜬다 · 나갈 땐 지연 없이 · 키보드 초점은 바로
   · ★[FAB_TOUCH_FOCUS] 창을 닫아 초점이 돌아와도 터치 · 마우스였으면 테두리 · 이름표 없음 · 터치 화면은 초점으로 이름표를 띄우지 않는다
   · 줄 위치 · 간격 · 아이콘 크기 · 순서는 건드리지 않는다([RAIL_LOCKED] · FAB_STACK_FIXED · TOPFAB_STEADY)
   한 곳에서만 고친다 — 줄은 advisor-widget.js(마이페이지 · 문의 · 안내 · 식순 미리보기) · index.html · schedule.html 세 곳에서 생기고 셋 다 이 파일을 부른다. */
(function () {
  if (window.__meFabNames) return;
  window.__meFabNames = true;
  /* 이름 표 — aria-label 그대로 두고 화면에 보일 짧은 이름만(표에 없으면 aria-label 그대로) */
  var NAMES = {
    '내 내역 보기': '내 내역',
    '드레스 · 소품 · 부케': '드레스 · 소품 · 부케',
    '상담 도우미 열기': '상담 도우미',
    '맨 위로': '맨 위로',
    '청첩장 샘플 보기': '청첩장 샘플',
    '상담 예약하기': '상담 예약',
    '예식 진행 시간표 보기': '예식 진행 시간표',
    '어른께 드리는 안내 보기': '어른께 드리는 안내',
    '페이지 공유하기': '공유하기',
    '마이페이지': '마이페이지',
    '인스타그램': '인스타그램',
    '전체 메뉴 열기': '전체 메뉴'
  };
  var css = ''
    + '.me-fab-stack .me-fab{position:relative}'
    + '.me-fab-stack .me-fab .me-fab-nm{position:absolute;right:calc(100% + 8px);top:25px;transform:translateY(-50%);padding:8px 10px;background:#fff;border:1px solid var(--border,#DDD8D1);border-radius:9px;font-family:var(--serif-ko,"Noto Serif KR",serif);font-size:13px;line-height:normal;font-weight:400;letter-spacing:normal;color:var(--sub,#5A554C);white-space:nowrap;box-shadow:0 4px 14px rgba(28,27,25,.09);pointer-events:auto;opacity:0;visibility:hidden;transition:opacity .2s ease,visibility 0s linear .2s,transform .3s var(--ease,ease)}'
    + '@media (max-width:680px){.me-fab-stack .me-fab .me-fab-nm{top:23px}}'
    + '.me-fab-stack .me-fab .me-fab-nm::after{content:"";position:absolute;top:0;bottom:0;left:100%;width:10px}'
    + '@media (hover:hover){.me-fab-stack .me-fab:hover .me-fab-nm{opacity:1;visibility:inherit;transform:translateY(calc(-50% - 2px));transition:opacity .2s ease .15s,visibility 0s linear .15s,transform .3s var(--ease,ease)}}'   // [FAB_NM_HOVER_DELAY] 올림은 150ms 뒤에 · 나갈 땐 바로 / [FAB_NM_ICO_CY] 올리면 아이콘이 2px 뜬다(.me-fab:hover .me-fab-ico) — 이름표도 같이
    + '@media (hover:hover){.me-fab-stack .me-fab:focus-visible .me-fab-nm{opacity:1;visibility:inherit;transition:opacity .2s ease,transform .3s var(--ease,ease)}}'   // 키보드 초점은 지연 없이 · [FAB_TOUCH_FOCUS] 터치 화면(hover:none)은 초점으로도 안 뜬다
    + '@media (hover:none){.me-fab-stack .me-fab:focus,.me-fab-stack .me-fab:focus-visible{outline:none}}'   // [FAB_TOUCH_FOCUS] 터치 화면은 줄 단추 초점 테두리 없음
    + '.me-fab-stack .me-fab.nm-ptr{outline:none}'   // [FAB_TOUCH_FOCUS] 터치 · 마우스로 쓰다 초점이 돌아온 단추(창을 닫은 뒤) — 테두리 · 이름표 없음
    + '.me-fab-stack .me-fab.nm-off .me-fab-nm,.me-fab-stack .me-fab.nm-ptr:not(:hover) .me-fab-nm,.me-fab-stack.nm-tip .me-fab-nm,.me-fab-stack.hide .me-fab-nm,body.mp-fs-on .me-fab-stack .me-fab-nm{opacity:0!important;visibility:hidden!important;transition:none!important}'
    + '@media print{.me-fab-nm{display:none!important}}';
  var st = document.createElement('style');
  st.id = 'meFabNamesCss';
  st.textContent = css;
  (document.head || document.documentElement).appendChild(st);

  function nameOf(b) {
    var a = (b.getAttribute('aria-label') || '').trim();
    return NAMES[a] || a;
  }
  function label(b) {
    if (!b || b.nodeType !== 1 || !b.classList.contains('me-fab')) return;
    if (!b.querySelector('.me-fab-nm')) {
      var n = nameOf(b);
      if (!n) return;
      var s = document.createElement('span');
      s.className = 'me-fab-nm';
      s.setAttribute('aria-hidden', 'true');
      s.textContent = n;
      b.appendChild(s);
    }
    if (!b.__nmWired) {
      b.__nmWired = true;
      b.addEventListener('mouseleave', function () { b.classList.remove('nm-off'); });
      b.addEventListener('blur', function () { b.classList.remove('nm-off'); });
    }
  }
  function sync(stack) {
    var bs = stack.querySelectorAll('.me-fab');
    for (var i = 0; i < bs.length; i++) label(bs[i]);
    stack.classList.toggle('nm-tip', !!stack.querySelector('.me-fab-tip'));   // 1회 말풍선이 떠 있으면 이름표는 쉰다
  }
  function watch(stack) {
    if (stack.__nmObs) return;
    sync(stack);
    if (!window.MutationObserver) { stack.__nmObs = true; return; }
    stack.__nmObs = new MutationObserver(function () { sync(stack); });
    stack.__nmObs.observe(stack, { childList: true });   // 나중에 끼워지는 단추(내 내역 · 청첩장 · 맨 위로 · 드레스) · 말풍선
  }
  function scan() {
    var ss = document.querySelectorAll('.me-fab-stack');
    for (var i = 0; i < ss.length; i++) watch(ss[i]);
  }
  window.meFabNames = scan;   // 줄을 새로 만든 곳이 불러도 된다
  scan();
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', scan);
  if (window.MutationObserver && document.body) {
    new MutationObserver(function (ms) {
      for (var i = 0; i < ms.length; i++) if (ms[i].addedNodes.length) { scan(); return; }
    }).observe(document.body, { childList: true });   // 줄이 body 바로 아래에 늦게 생겨도
  }
  /* ★[FAB_TOUCH_FOCUS 2026-10-31 사장님 아이폰 사파리 스크린샷 «모바일인데 우측 아이콘 저거 개선» · 코워크] 창(드레스 · 청첩장 샘플 · 상담 도우미)을 닫으면
     연 단추로 초점이 돌아온다(키보드 · 화면 낭독기 길 · [DRESS_FAB_1024]). 아이폰 사파리는 이 «프로그램 초점»을 :focus-visible 로 쳐서
     파란 사각 테두리와 이름표가 남아 옆 단추를 가렸다. 초점은 그대로 돌려주고, 마지막 입력이 터치 · 마우스였으면 보이는 것만 숨긴다(nm-ptr).
     키보드(Tab · Enter · Esc)로 쓰면 종전대로 테두리 · 이름표가 뜬다. 창 안(iframe) 입력은 여기 안 오니 «연 때의 입력»이 남는다. */
  var kbd = false;
  window.addEventListener('keydown', function (e) { if (e && e.key && !/^(Shift|Control|Alt|Meta|CapsLock|Fn)$/.test(e.key)) kbd = true; }, true);
  ['pointerdown', 'mousedown', 'touchstart'].forEach(function (t) { window.addEventListener(t, function () { kbd = false; }, { capture: true, passive: true }); });
  document.addEventListener('focusin', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.me-fab-stack .me-fab') : null;
    if (b) b.classList.toggle('nm-ptr', !kbd);
  }, true);
  document.addEventListener('focusout', function (e) {
    var b = e.target && e.target.closest ? e.target.closest('.me-fab-stack .me-fab') : null;
    if (b) b.classList.remove('nm-ptr');
  }, true);
  /* Esc = 지금 올려 둔 · 초점 둔 단추의 이름표를 닫는다 */
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape') return;
    var bs = document.querySelectorAll('.me-fab-stack .me-fab');
    for (var i = 0; i < bs.length; i++) {
      var b = bs[i], hov = false;
      try { hov = b.matches(':hover'); } catch (er) {}
      if (hov || document.activeElement === b) b.classList.add('nm-off');
    }
  });
})();
