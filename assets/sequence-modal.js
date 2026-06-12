/* 모먼트에디트 · 140분 시그니처 시퀀스 "진행 시간표" 모달 (공용)
 * 사용: 트리거 요소에 data-seq-open="full"(상세) | "trim"(간결) | "snap"(평일 웨딩스냅 흐름) + <script src="/assets/sequence-modal.js"></script>
 * 세 타임(오전·오후·늦은 오후)을 탭으로 전환해 보는 고객용 진행 시간표. snap은 고정 시각 없이 60~90분 흐름만.
 *  - 고객이 알아야 할 정보만 노출. 홀 정리·다음 예식 준비 같은 내부 운영은 제외(관리자 영역).
 *  - 본예식 세부(개식·서약·예물 등)는 "본식" 한 블록으로만(사장 지시).
 *  - trim(예약 페이지): 시간·순서만 간결히 · full(스케줄·마이): 상세 설명까지.
 *  - 모바일에서도 또렷한 HTML/CSS · 타임라인 마커.
 */
(function () {
  if (window.__meSeqInit) return; window.__meSeqInit = true;

  var SLOTS = [
    { key: 'am', tab: '오전', sub: '9시 시작', end: '11:20' },
    { key: 'pm', tab: '오후', sub: '12시 20분 시작', end: '14:40' },
    { key: 'ev', tab: '늦은 오후', sub: '3시 40분 시작', end: '18:00' },
  ];
  // 고객 진행 흐름만 — [순서, 소요, [오전, 오후, 늦은오후 시작시각], 상세, 하이라이트?]
  var ROWS = [
    ['신랑·신부 도착', '20분', ['09:00', '12:20', '15:40'], '도착 후 드레스 착장과 메이크업 정돈으로 예식을 준비해요.'],
    ['단독 스냅 촬영', '40분', ['09:20', '12:40', '16:00'], '하객과 분리된 캔들존·화이트존에서 두 분만의 화보 같은 스냅을 담아요.'],
    ['하객 입장', '20분', ['09:40', '13:00', '16:20'], '하객분들이 입장하며 웰컴 와인과 좌석 안내를 받는 시간이에요.', true],
    ['신랑·신부 입장', '5분', ['10:00', '13:20', '16:40'], '예식의 시작, 두 분이 함께 입장해요.'],
    ['본식', '25분', ['10:05', '13:25', '16:45'], '서약·편지·예물·와인 세리머니 등으로 채워지는 예식의 중심이에요.'],
    ['가족·지인 단체 촬영', '30분', ['10:30', '13:50', '17:10'], '양가 가족과 가까운 분들이 한자리에 모여 단체 기록을 남겨요.'],
    ['마무리·배웅', '20분', ['11:00', '14:20', '17:40'], '입구에서 하객분들과 따뜻하게 인사 나누고, 두 분은 편하게 환복하며 마무리해요.'],
  ];
  // 평일 웨딩스냅(60~90분) 진행 흐름 — 고정 시각표가 없어 순서·소요만 안내. [순서, 소요, 상세]
  var SNAP_ROWS = [
    ['도착·준비 정돈', '10~15분', '착장과 메이크업을 정돈하고, 두 공간의 촬영 동선을 안내받아요.'],
    ['캔들존 촬영', '30~35분', '따뜻한 캔들 무드의 첫 번째 존에서 촬영을 시작해요.'],
    ['화이트존 촬영', '30~35분', '밝고 깨끗한 두 번째 존에서 분위기를 바꿔 담아요.'],
    ['마무리·환복', '5~10분', '촬영을 마무리하고 편하게 환복하며 마치는 시간이에요.'],
  ];

  var css = ''
    + '.meseq-ov{position:fixed;inset:0;z-index:200;display:none;align-items:flex-end;justify-content:center;background:rgba(28,27,25,0.5);backdrop-filter:blur(4px);-webkit-backdrop-filter:blur(4px);opacity:0;transition:opacity .28s ease}'
    + '.meseq-ov.show{display:flex}.meseq-ov.open{opacity:1}'
    + '@media(min-width:600px){.meseq-ov{align-items:center;padding:24px}}'
    + '.meseq{background:var(--bg,#FAFAF8);width:100%;max-width:540px;max-height:92vh;max-height:92dvh;border-radius:18px 18px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -12px 60px rgba(28,27,25,0.3);transform:translateY(100%);transition:transform .34s cubic-bezier(0.16,1,0.3,1)}'
    + '.meseq-ov.open .meseq{transform:translateY(0)}'
    + '@media(min-width:600px){.meseq{border-radius:16px;transform:translateY(16px) scale(0.98)}.meseq-ov.open .meseq{transform:translateY(0) scale(1)}}'
    + '.meseq-head{flex:0 0 auto;padding:22px 24px 0;position:relative}'
    + '.meseq-grip{display:none}'
    + '@media(max-width:599px){.meseq-grip{display:block;width:38px;height:4px;border-radius:3px;background:var(--border,#DDD8D1);margin:0 auto 14px}}'
    + '.meseq-eyebrow{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:10px;letter-spacing:0.18em;text-transform:uppercase;color:var(--gold,#B89A75);margin-bottom:5px}'
    + '.meseq-title{font-family:var(--serif-ko,serif);font-size:19px;font-weight:500;color:var(--accent,#3A2D22);letter-spacing:0.01em}'
    + '.meseq-note{font-family:var(--serif-ko,serif);font-size:11.5px;font-weight:300;color:var(--light,#75705F);line-height:1.7;margin-top:7px;word-break:keep-all}'
    + '.meseq-x{position:absolute;top:18px;right:18px;background:var(--bg2,#F1EEE9);border:none;cursor:pointer;color:var(--sub,#5A554C);width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;line-height:0;transition:background .2s}'
    + '.meseq-x:hover{background:var(--bg3,#E8E3DC);color:var(--accent,#3A2D22)}.meseq-x svg{width:16px;height:16px}'
    + '.meseq-tabs{flex:0 0 auto;display:flex;gap:6px;padding:16px 24px 14px}'
    + '.meseq-tab{flex:1;border:1px solid var(--border,#DDD8D1);background:none;border-radius:11px;padding:10px 4px;cursor:pointer;font-family:var(--serif-ko,serif);color:var(--sub,#5A554C);line-height:1.25;transition:all .2s}'
    + '.meseq-tab b{display:block;font-size:13px;font-weight:500}.meseq-tab span{display:block;font-size:10px;color:var(--light,#75705F);margin-top:2px}'
    + '.meseq-tab.on{background:#4E3F31;border-color:#4E3F31;color:#fff}.meseq-tab.on span{color:rgba(255,255,255,0.82)}'   /* 마이페이지 .cc-btn과 같은 색 */
    + '.meseq-tab.on:hover{background:#3A2D22;border-color:#3A2D22}.meseq-tab.on:active{background:#9C7E55;border-color:#9C7E55}'
    + '.meseq-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:6px 24px 20px;-webkit-overflow-scrolling:touch}'
    + '.meseq-tl{position:relative;margin:6px 0 0;padding-left:64px}'
    + '.meseq-tl::before{content:"";position:absolute;left:63px;top:8px;bottom:18px;width:1px;background:var(--border,#DDD8D1)}'
    + '.meseq-it{position:relative;padding:11px 0 13px 18px}'
    + '.meseq-it::before{content:"";position:absolute;left:-6.5px;top:13px;width:9px;height:9px;border-radius:50%;background:var(--bg,#FAFAF8);border:1.5px solid var(--gold,#B89A75);box-sizing:content-box}'
    + '.meseq-it.hl::before{background:var(--seal,#6B2A24);border-color:var(--seal,#6B2A24)}'
    + '.meseq-clk{position:absolute;left:-64px;top:12px;width:52px;text-align:right;font-family:var(--serif-ko,serif);font-size:13px;font-weight:500;color:#4E3F31;letter-spacing:-0.02em}'
    + '.meseq-nm{font-family:var(--serif-ko,serif);font-size:14.5px;font-weight:500;color:var(--accent,#3A2D22);display:flex;align-items:baseline;gap:7px;flex-wrap:wrap}'
    + '.meseq-dur{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:12px;font-weight:500;color:#8C7355;letter-spacing:0.02em}'
    + '.meseq-ds{font-family:var(--serif-ko,serif);font-size:12px;font-weight:300;color:var(--sub,#5A554C);line-height:1.7;margin-top:4px;word-break:keep-all}'
    + '.meseq-end{position:relative;padding:8px 0 2px 18px;font-family:var(--serif-ko,serif);font-size:12px;color:var(--light,#75705F)}'
    + '.meseq-end::before{content:"";position:absolute;left:-5px;top:11px;width:9px;height:9px;border-radius:50%;background:var(--border,#DDD8D1)}'
    + '.meseq-foot{flex:0 0 auto;padding:13px 24px 20px;border-top:1px solid var(--hairline,rgba(28,27,25,0.1));font-family:var(--serif-ko,serif);font-size:11px;font-weight:300;color:var(--light,#75705F);line-height:1.7;word-break:keep-all}'
    + '.meseq-it.compact{padding:9px 0 9px 18px}'
    + '.meseq-it.compact::before{top:11px}'
    + '@media(max-width:380px){.meseq-tl{padding-left:56px}.meseq-tl::before{left:55px}.meseq-clk{left:-56px;width:46px;font-size:12px}}'
    /* 스냅 모드 — 고정 시각이 없어 왼쪽 시계 칸 없이 흐름만 */
    + '.meseq-tl.snap{padding-left:10px}.meseq-tl.snap::before{left:9px}'
    + '@media(max-width:380px){.meseq-tl.snap{padding-left:10px}.meseq-tl.snap::before{left:9px}}'
    /* 상품 전환(예약 페이지 trim·snap에서만) — 시그니처 140분 / 평일 웨딩스냅 */
    + '.meseq-prod{flex:0 0 auto;display:flex;gap:6px;padding:14px 24px 0}'
    + '.meseq-prod button{flex:1;border:1px solid var(--border,#DDD8D1);background:none;border-radius:8px;padding:9px 4px;cursor:pointer;font-family:var(--serif-ko,serif);font-size:12.5px;color:var(--sub,#5A554C);transition:all .2s}'
    + '.meseq-prod button.on{background:#4E3F31;border-color:#4E3F31;color:#fff}'
    /* 시간표 열기 버튼(예약·스케줄·마이 공용) — 마이페이지 .cc-btn과 같은 색·효과 */
    + '.seq-open-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;background:#4E3F31;color:#fff;border:none;border-radius:6px;padding:13px 0;font-family:var(--serif-ko,serif);font-size:13px;letter-spacing:0.01em;cursor:pointer;transition:background .3s}'
    + '.seq-open-btn:hover{background:#3A2D22}.seq-open-btn:active{background:#9C7E55}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var ov = document.createElement('div'); ov.className = 'meseq-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '140분 진행 시간표');
  ov.innerHTML = ''
    + '<div class="meseq">'
    + '  <div class="meseq-head">'
    + '    <div class="meseq-grip"></div>'
    + '    <div class="meseq-eyebrow">The 140 Signature</div>'
    + '    <div class="meseq-title">예식 진행 시간표</div>'
    + '    <div class="meseq-note">세 타임 모두 같은 140분 흐름으로 진행되고, 시작 시간만 달라요. 원하시는 시간대를 골라 보세요.</div>'
    + '    <button class="meseq-x" id="meseqX" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button>'
    + '  </div>'
    + '  <div class="meseq-prod" id="meseqProd" style="display:none"></div>'
    + '  <div class="meseq-tabs" id="meseqTabs"></div>'
    + '  <div class="meseq-body" id="meseqBody"></div>'
    + '  <div class="meseq-foot">시작 시각 기준이에요. 대기 공간이 없어, 하객분들께는 <b style="font-weight:500;color:var(--sub,#5A554C)">하객 입장 시간</b>에 맞춰 오시도록 안내해 주세요. 세부 식순은 계약 후 직접 설계하실 수 있어요.</div>'
    + '</div>';
  document.body.appendChild(ov);

  var tabsEl = ov.querySelector('#meseqTabs'), bodyEl = ov.querySelector('#meseqBody'), noteEl = ov.querySelector('.meseq-note');
  var titleEl = ov.querySelector('.meseq-title'), eyebrowEl = ov.querySelector('.meseq-eyebrow'), footEl = ov.querySelector('.meseq-foot');
  var prodEl = ov.querySelector('#meseqProd');
  var curSlot = 0, mode = 'full';
  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }
  function renderTabs() {
    tabsEl.innerHTML = SLOTS.map(function (s, i) {
      return '<button class="meseq-tab' + (i === curSlot ? ' on' : '') + '" data-i="' + i + '"><b>' + s.tab + '</b><span>' + s.sub + '</span></button>';
    }).join('');
  }
  function renderBody() {
    if (mode === 'snap') {   // 스냅: 고정 시각 없이 흐름(순서·소요·설명)만
      var sItems = SNAP_ROWS.map(function (r) {
        return '<div class="meseq-it">'
          + '<div class="meseq-nm">' + esc(r[0]) + '<span class="meseq-dur">' + esc(r[1]) + '</span></div>'
          + '<div class="meseq-ds">' + esc(r[2]) + '</div>'
          + '</div>';
      }).join('');
      sItems += '<div class="meseq-end">촬영 마무리 · 총 60~90분</div>';
      bodyEl.innerHTML = '<div class="meseq-tl snap">' + sItems + '</div>';
      bodyEl.scrollTop = 0;
      return;
    }
    var full = (mode === 'full');
    var items = ROWS.map(function (r) {
      return '<div class="meseq-it' + (r[4] ? ' hl' : '') + (full ? '' : ' compact') + '">'
        + '<span class="meseq-clk">' + esc(r[2][curSlot]) + '</span>'
        + '<div class="meseq-nm">' + esc(r[0]) + '<span class="meseq-dur">' + esc(r[1]) + '</span></div>'
        + (full ? ('<div class="meseq-ds">' + esc(r[3]) + '</div>') : '')
        + '</div>';
    }).join('');
    items += '<div class="meseq-end"><span class="meseq-clk" style="position:absolute">' + esc(SLOTS[curSlot].end) + '</span>예식 마무리</div>';
    bodyEl.innerHTML = '<div class="meseq-tl">' + items + '</div>';
    bodyEl.scrollTop = 0;
  }
  // 예약 페이지(trim·snap)에서만 모달 안 상품 전환 토글 노출 — 우측 아이콘으로 열어도 둘 다 볼 수 있게
  function renderProd() {
    if (mode === 'full') { prodEl.style.display = 'none'; return; }
    prodEl.style.display = 'flex';
    prodEl.innerHTML = ''
      + '<button type="button" data-pm="trim"' + (mode !== 'snap' ? ' class="on"' : '') + '>시그니처 140분</button>'
      + '<button type="button" data-pm="snap"' + (mode === 'snap' ? ' class="on"' : '') + '>평일 웨딩스냅</button>';
  }
  function applyMode(m) {
    mode = (m === 'snap') ? 'snap' : (m === 'trim') ? 'trim' : 'full';
    if (mode === 'snap') {
      eyebrowEl.textContent = 'The Private Snap';
      titleEl.textContent = '웨딩스냅 진행 흐름';
      noteEl.textContent = '평일 원하시는 시간에 맞춰 60~90분 동안 진행돼요. 두 분만을 위한 프라이빗 촬영이라 대기 없이 바로 시작해요.';
      footEl.textContent = '소요 시간은 진행 상황에 따라 조금 달라질 수 있어요. 원본 사진 전량과 보정본은 마이페이지로 전해드려요.';
      tabsEl.style.display = 'none';
    } else {
      eyebrowEl.textContent = 'The 140 Signature';
      titleEl.textContent = '예식 진행 시간표';
      noteEl.textContent = (mode === 'trim')
        ? '세 타임 모두 같은 140분 흐름이고 시작 시간만 달라요. 시간대를 골라 한눈에 살펴보세요.'
        : '세 타임 모두 같은 140분 흐름으로 진행되고, 시작 시간만 달라요. 원하시는 시간대를 골라 보세요.';
      footEl.innerHTML = '시작 시각 기준이에요. 대기 공간이 없어, 하객분들께는 <b style="font-weight:500;color:var(--sub,#5A554C)">하객 입장 시간</b>에 맞춰 오시도록 안내해 주세요. 세부 식순은 계약 후 직접 설계하실 수 있어요.';
      tabsEl.style.display = '';
    }
    renderProd(); renderTabs(); renderBody();
  }
  function open(m) {
    applyMode(m);
    ov.classList.add('show');
    var _sbw = window.innerWidth - document.documentElement.clientWidth; if (_sbw > 0) document.documentElement.style.paddingRight = _sbw + 'px';   // 실제 스크롤바만 보정 · 모바일 팬텀 거터 방지
    document.documentElement.style.overflow = 'hidden';
    requestAnimationFrame(function () { ov.classList.add('open'); });
  }
  function close() {
    ov.classList.remove('open'); document.documentElement.style.overflow = ''; document.documentElement.style.paddingRight = '';
    setTimeout(function () { ov.classList.remove('show'); }, 320);
  }
  prodEl.addEventListener('click', function (e) {
    var t = e.target.closest('[data-pm]'); if (!t) return;
    applyMode(t.getAttribute('data-pm'));
  });
  tabsEl.addEventListener('click', function (e) {
    var t = e.target.closest('.meseq-tab'); if (!t) return;
    curSlot = +t.getAttribute('data-i'); renderTabs(); renderBody();
  });
  ov.querySelector('#meseqX').addEventListener('click', close);
  ov.addEventListener('click', function (e) { if (e.target === ov) close(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && ov.classList.contains('open')) close(); });
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-seq-open]'); if (!t) return;
    e.preventDefault(); open(t.getAttribute('data-seq-open'));
  });
  window.MEsequence = { open: open, close: close };
})();
