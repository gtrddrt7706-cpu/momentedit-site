/* 모먼트에디트 · 「하객 사진은 어떻게 오나요」 모달 (공용)
 * 사용: 트리거 요소에 data-gpm-open + <script src="/assets/guest-photo-modal.js" defer></script>
 *
 * ★[GPM_MODAL 2026-08-18 사용자 지시] 메인 홈페이지 청첩장 소개에서 여는 홍보 모달.
 *   사용자 원문: "오프라인 하객안내 사진올리기부분 클릭시 어떻게 되며 신랑신부에게 어떻게
 *   전달이되는지 장점 위주로 홍보 적절하게 팝업형식으로" · "디자인적으로 마케팅적으로 완성도높게"
 *
 * ■ 자동으로 뜨지 않는다 — 브랜드 규칙이 팝업(자동 노출)을 금지한다.
 *   이것은 **누른 사람에게만** 열리는 모달이다. 타이머·스크롤·이탈 감지로 띄우지 말 것.
 * ■ 140분 시간표 모달(sequence-modal.js)과 시각 언어를 맞추되 파일은 나눴다 —
 *   그쪽을 건드리면 예약 페이지까지 흔들린다. 여기서 닫히는 위험만 진다.
 * ■ [ADV_TC] 오버레이 계약을 지킨다 — 이 모달은 불투명 크림이라 '크림 고정'이 맞다.
 *   position:fixed 스크롤 잠금이 scrollY 를 0으로 무너뜨려, 잠그지 않으면 히어로 핸들러가
 *   "지금 맨 위"로 오해하고 상태바를 진사로 되돌린다(아이폰에서 검은 띠처럼 남는다).
 * ■ 값은 전부 램프 안에서만 — 크기 11~20 · 자간 8단 · 굵기 300~600 · 행간 8단 ·
 *   라운드 2/4/6/8/12 · 전환 0.12/0.3/0.45/0.7/1.2 + var(--ease).
 * ■ 골드 2값 분리 — 선·테두리는 --gold, 글자와 같은 줄의 글리프는 --gold-text.
 */
(function () {
  if (window.__meGpmInit) return; window.__meGpmInit = true;

  /* 하객이 겪는 것 — 짧다는 사실 자체가 이 상품의 강점이라 세 걸음으로만 쓴다. */
  var STEPS = [
    ['청첩장의 QR을 찍어요', '직접 건네 드린 청첩장에서 하객 안내가 열려요.'],
    ['「사진 올리기」를 눌러요', '그 자리에서 사진첩이 열려요 · 여러 장 한 번에 고르셔도 돼요.'],
    ['그걸로 끝이에요', '앱을 깔지도, 가입하지도, 이름이나 이메일을 적지도 않아요.']
  ];
  /* 두 분이 얻는 것 — '무엇을 안 하셔도 되는가'가 핵심이다. */
  var GAINS = [
    ['준비하실 것이 없어요', '링크를 만들거나 계정을 여실 필요가 없어요.'],
    ['답하실 것도 없어요', '하객분들께 일일이 답장하거나 받아 주실 일이 없어요.'],
    ['도착하는 대로 보여요', '마이페이지에서 지금까지 몇 장 왔는지 확인하실 수 있어요.'],
    ['결과물과 함께 드려요', '모인 사진을 정리해 두 분의 사진과 같이 전해 드려요.']
  ];

  var V = function (n, f) { return 'var(--' + n + ',' + f + ')'; };
  var css = ''
    + '.gpm-ov{position:fixed;inset:0;z-index:1200;display:none;align-items:flex-end;justify-content:center;'
    +   'background:rgba(28,27,25,.34);opacity:0;transition:opacity .3s ' + V('ease', 'cubic-bezier(.16,1,.3,1)') + '}'
    + '.gpm-ov.show{display:flex}.gpm-ov.open{opacity:1}'
    + '@media(min-width:721px){.gpm-ov{align-items:center}}'
    + '.gpm{position:relative;width:100%;max-width:520px;max-height:88vh;overflow:hidden;display:flex;flex-direction:column;'
    +   'background:' + V('bg', '#FAFAF8') + ';border-radius:12px 12px 0 0;'
    +   'transform:translateY(28px);transition:transform .45s ' + V('ease', 'cubic-bezier(.16,1,.3,1)') + '}'
    + '.gpm-ov.open .gpm{transform:none}'
    + '@media(min-width:721px){.gpm{border-radius:12px;transform:translateY(16px)}}'
    /* 머리 — 눈썹(영문 0.22em) · 제목 · 리드 한 줄. 라벨 위 여백은 아래의 2배([TYPO_RHYTHM]) */
    + '.gpm-head{padding:26px 26px 20px;border-bottom:1px solid ' + V('hairline', 'rgba(28,27,25,.18)') + '}'
    + '.gpm-grip{width:34px;height:3px;border-radius:999px;background:' + V('border', '#DDD8D1') + ';margin:0 auto 18px}'
    + '@media(min-width:721px){.gpm-grip{display:none}}'
    + '.gpm-eyebrow{font-family:' + V('serif', 'Georgia,serif') + ';font-size:11px;font-weight:500;letter-spacing:.22em;'
    +   'text-transform:uppercase;color:' + V('seal', '#6B2A24') + ';line-height:1.4}'
    + '.gpm-title{font-family:' + V('serif-ko', 'serif') + ';font-size:20px;font-weight:500;letter-spacing:-.02em;'
    +   'line-height:1.4;color:' + V('text', '#1C1B19') + ';margin-top:10px}'
    + '.gpm-lead{font-family:' + V('serif-ko', 'serif') + ';font-size:13px;font-weight:300;letter-spacing:.01em;'
    +   'line-height:1.85;color:' + V('sub', '#5A554C') + ';margin-top:12px;word-break:keep-all}'
    + '.gpm-x{position:absolute;top:18px;right:16px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;'
    +   'background:none;border:0;padding:0;cursor:pointer;color:' + V('light', '#75705F') + ';transition:color .3s ' + V('ease', 'ease') + '}'
    + '.gpm-x:hover{color:' + V('text', '#1C1B19') + '}.gpm-x svg{width:18px;height:18px}'
    + '.gpm-body{overflow-y:auto;-webkit-overflow-scrolling:touch;padding:24px 26px 4px}'
    /* 소라벨 — 한글이므로 serif-ko · 12px · 0.08em([LABEL_KO_TRACK]). 라틴 규칙(italic·uppercase) 금지 */
    + '.gpm-sub{font-family:' + V('serif-ko', 'serif') + ';font-size:12px;font-weight:400;letter-spacing:.08em;'
    +   'color:' + V('light', '#75705F') + ';margin:0 0 14px}'
    + '.gpm-step + .gpm-sub,.gpm-gains + .gpm-sub{margin-top:34px}'   /* 라벨 위 여백은 아래(14px)의 2배 이상 */
    /* 걸음 — 번호는 글자와 같은 줄이라 --gold-text. 선 없이 여백으로 나눈다([ADV_INDEX] 1번) */
    + '.gpm-step{display:flex;gap:14px;padding:11px 0}'
    + '.gpm-no{flex:none;font-family:' + V('serif', 'Georgia,serif') + ';font-size:13px;font-weight:500;letter-spacing:.08em;'
    +   'line-height:1.7;color:' + V('gold-text', '#7A5F37') + ';width:22px}'
    + '.gpm-nm{font-family:' + V('serif-ko', 'serif') + ';font-size:14px;font-weight:500;letter-spacing:.01em;'
    +   'line-height:1.7;color:' + V('text', '#1C1B19') + ';word-break:keep-all}'
    + '.gpm-ds{font-family:' + V('serif-ko', 'serif') + ';font-size:12px;font-weight:300;letter-spacing:.01em;'
    +   'line-height:1.85;color:' + V('sub', '#5A554C') + ';margin-top:4px;word-break:keep-all}'
    /* 두 분이 얻는 것 — 잔잔한 카드 대신 얇은 헤어라인 한 줄로 묶는다(선을 줄마다 긋지 않는다) */
    /* ★★[GOLD_BAR_OFF 2026-08-18 사용자 지적] 왼쪽 골드바를 걷었다 — 인용문 관용구라 옛 느낌이 난다.
       묶는 일은 위의 소라벨과 여백이 한다. 걸음(01·02·03)과는 번호 유무로 이미 갈린다. */
    + '.gpm-gains{padding-left:22px}'
    + '.gpm-gain{padding:13px 0}.gpm-gain:first-child{padding-top:2px}.gpm-gain:last-child{padding-bottom:2px}'
    + '.gpm-note{font-family:' + V('serif-ko', 'serif') + ';font-size:12px;font-weight:300;letter-spacing:.01em;'
    +   'line-height:1.85;color:' + V('sub', '#5A554C') + ';margin:30px 0 0;padding:16px 18px;border-radius:6px;'
    +   'background:' + V('bg2', '#F5F3EF') + ';word-break:keep-all}'
    + '.gpm-foot{padding:18px 26px calc(22px + env(safe-area-inset-bottom));border-top:1px solid ' + V('hairline', 'rgba(28,27,25,.18)') + ';'
    +   'font-family:' + V('serif-ko', 'serif') + ';font-size:11px;font-weight:300;letter-spacing:.02em;line-height:1.7;'
    +   'color:' + V('light', '#75705F') + ';word-break:keep-all}'
    /* 트리거 — 목차처럼 글자 바로 뒤에 › ([ADV_INDEX] 2번). ›는 명조 em박스에서 2px 낮게 앉는다 */
    + '.gpm-open{display:inline-flex;align-items:center;gap:5px;margin:4px 0 -6px;background:none;border:0;padding:12px 0;'   /* 세로 12+20+12=44px 탭 타깃 · 음수 마진으로 카드 리듬은 그대로 */
    +   'font-family:' + V('serif-ko', 'serif') + ';font-size:12px;font-weight:400;letter-spacing:.02em;line-height:1.7;'
    +   'color:' + V('gold-text', '#7A5F37') + ';cursor:pointer;transition:color .3s ' + V('ease', 'ease') + '}'
    + '.gpm-open:hover{color:' + V('seal', '#6B2A24') + '}'
    + '.gpm-open .gpm-chev{position:relative;top:-2px;font-family:' + V('serif', 'Georgia,serif') + '}'
    + '@media(prefers-reduced-motion:reduce){.gpm-ov,.gpm{transition-duration:.01ms!important;transition-delay:0s!important;animation-delay:0s!important}}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  var ov = document.createElement('div');
  ov.className = 'gpm-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true');
  ov.setAttribute('aria-label', '하객 사진이 두 분께 오는 길');
  ov.innerHTML = ''
    + '<div class="gpm">'
    + '<div class="gpm-head">'
    +   '<div class="gpm-grip"></div>'
    +   '<div class="gpm-eyebrow">Guest Photos</div>'
    +   '<div class="gpm-title">하객이 담은 오늘, 두 분께로</div>'
    +   '<p class="gpm-lead">예식이 끝나면 그날의 사진은 하객분들 폰 속에 흩어져 남습니다. '
    +     '그 사진들이 두 분께 모이도록, 청첩장에서 이어지는 길을 하나 놓았습니다.</p>'
    +   '<button class="gpm-x" type="button" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>'
    + '</div>'
    + '<div class="gpm-body">'
    +   '<p class="gpm-sub">하객분이 하시는 일</p>'
    +   STEPS.map(function (s, i) {
          return '<div class="gpm-step"><div class="gpm-no">' + ('0' + (i + 1)) + '</div>'
            + '<div><div class="gpm-nm">' + esc(s[0]) + '</div><div class="gpm-ds">' + esc(s[1]) + '</div></div></div>';
        }).join('')
    +   '<p class="gpm-sub">두 분이 하시는 일</p>'
    +   '<div class="gpm-gains">' + GAINS.map(function (g) {
          return '<div class="gpm-gain"><div class="gpm-nm">' + esc(g[0]) + '</div><div class="gpm-ds">' + esc(g[1]) + '</div></div>';
        }).join('') + '</div>'
    +   '<p class="gpm-note">올리신 사진은 하객분들끼리 서로 보이지 않아요. '
    +     '오늘을 담아 주신 마음이 두 분께만 모입니다.</p>'
    + '</div>'
    + '<div class="gpm-foot">종이 청첩장을 직접 만드셔도 인쇄용 QR 한 장으로 그대로 이어져요.</div>'
    + '</div>';
  document.body.appendChild(ov);

  var lockY = 0, locked = false, opener = null;
  function open() {
    opener = document.activeElement;
    ov.classList.add('show');
    var sbw = window.innerWidth - document.documentElement.clientWidth;
    if (sbw > 0) document.documentElement.style.paddingRight = sbw + 'px';
    document.documentElement.style.overflow = 'hidden';
    lockY = window.scrollY || window.pageYOffset || 0;
    var b = document.body;
    b.style.position = 'fixed'; b.style.top = (-lockY) + 'px'; b.style.left = '0'; b.style.right = '0'; b.style.width = '100%';
    locked = true;
    /* [ADV_TC] 불투명 크림 오버레이 → 상태바도 크림으로 고정. 잠그지 않으면 히어로 핸들러가
       무너진 scrollY 를 읽고 진사로 되돌려, 아이폰 상태바만 진사 띠로 남는다. */
    try {
      window.__meTCLock = 1;
      var tc = document.getElementById('meThemeColor');
      if (tc) tc.setAttribute('content', '#faf9f8');
    } catch (e) {}
    requestAnimationFrame(function () { ov.classList.add('open'); });
    var x = ov.querySelector('.gpm-x'); if (x) x.focus();
  }
  function close() {
    ov.classList.remove('open');
    document.documentElement.style.overflow = ''; document.documentElement.style.paddingRight = '';
    if (locked) {
      var b = document.body;
      b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.right = ''; b.style.width = '';
      var html = document.documentElement, prev = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto'; window.scrollTo(0, lockY); html.style.scrollBehavior = prev;
      locked = false;
    }
    /* ★잠금 해제 **뒤에** 동기화한다 — 캐시(tcCream)를 비우고 다시 계산해야 복귀가 안 씹힌다. */
    try { window.__meTCLock = 0; if (typeof window.__meTCSync === 'function') window.__meTCSync(); } catch (e) {}
    setTimeout(function () { ov.classList.remove('show'); }, 320);
    if (opener && opener.focus) { try { opener.focus(); } catch (e) {} }
  }
  ov.querySelector('.gpm-x').addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('open')) close(); });
  /* ★옵션 인자를 받는 함수를 리스너에 그대로 넘기지 않는다([ADV_OPEN_TOP] 사고) — open 은 무인자다. */
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-gpm-open]'); if (!t) return;
    e.preventDefault(); open();
  });
  window.MEguestPhoto = { open: open, close: close };
})();
