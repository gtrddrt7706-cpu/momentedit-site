/* 모먼트에디트 · 140분 시그니처 시퀀스 "전체 진행 시간표" 모달 (공용)
 * 사용: 트리거 요소에 data-seq-open="full"(전체 · 내부 운영 포함) 또는 "trim"(고객 흐름만) 지정.
 *       <button data-seq-open="full">진행 시간표</button>  +  <script src="/assets/sequence-modal.js"></script>
 * 자동으로 모달을 1개 생성하고, data-seq-open 요소 클릭 시 해당 모드로 연다.
 * 사실 정보성 시간표 — 세 타임(오전·오후·늦은 오후)을 탭으로 전환해 본다. 모바일에서도 또렷한 HTML/CSS 표.
 * 본예식 세부(개식·서약·예물 등)는 "메인 본식" 한 블록으로만 표기(사장 지시).
 */
(function () {
  if (window.__meSeqInit) return; window.__meSeqInit = true;

  var SLOTS = [
    { key: 'am', tab: '오전', sub: '9시 시작' },
    { key: 'pm', tab: '오후', sub: '12시 20분 시작' },
    { key: 'ev', tab: '늦은 오후', sub: '3시 40분 시작' },
  ];
  // [순서, 소요, [오전, 오후, 늦은오후], 상세, 내부운영?]
  var ROWS = [
    ['도착 및 환복', '20분', ['09:00 ~ 09:20', '12:20 ~ 12:40', '15:40 ~ 16:00'], '도착 즉시 드레스 착장·화장 수정'],
    ['캔들존 스냅', '20분', ['09:20 ~ 09:40', '12:40 ~ 13:00', '16:00 ~ 16:20'], '캔들존에서 두 분의 스냅 촬영'],
    ['화이트존 스냅', '20분', ['09:40 ~ 10:00', '13:00 ~ 13:20', '16:20 ~ 16:40'], '화이트존에서 두 분의 스냅 촬영'],
    ['하객 입장', '20분', ['09:40 ~ 10:00', '13:00 ~ 13:20', '16:20 ~ 16:40'], '캔들존 하객 입장·웰컴 와인·어르신 좌석 안내 (스냅과 동시 진행)'],
    ['신랑·신부 입장', '5분', ['10:00 ~ 10:05', '13:20 ~ 13:25', '16:40 ~ 16:45'], '예식 시작·오프닝'],
    ['메인 본식', '25분', ['10:05 ~ 10:30', '13:25 ~ 13:50', '16:45 ~ 17:10'], '서약·편지·예물·세리머니 등 본식 진행'],
    ['가족·지인 촬영', '30분', ['10:30 ~ 11:00', '13:50 ~ 14:20', '17:10 ~ 17:40'], '가족·지인 단체 사진 촬영'],
    ['퇴실 및 배웅', '10분', ['11:00 ~ 11:10', '14:20 ~ 14:30', '17:40 ~ 17:50'], '홀 입구에서 감사 인사·배웅'],
    ['신랑·신부 환복', '10분', ['11:10 ~ 11:20', '14:30 ~ 14:40', '17:50 ~ 18:00'], '개인 옷으로 환복·소지품 정리'],
    ['홀 정리', '30분', ['11:20 ~ 11:50', '14:40 ~ 15:10', '18:00 ~ 18:30'], '홀 클리닝·다음 예식 준비', true],
    ['예약 답사', '30분', ['11:50 ~ 12:20', '15:10 ~ 15:40', '18:30 ~ 19:00'], '상담 고객 홀 투어·상담', true],
  ];

  var css = ''
    + '.meseq-ov{position:fixed;inset:0;z-index:200;display:none;align-items:flex-end;justify-content:center;background:rgba(28,27,25,0.46);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}'
    + '.meseq-ov.open{display:flex}'
    + '@media(min-width:600px){.meseq-ov{align-items:center}}'
    + '.meseq{background:var(--bg,#FAFAF8);width:100%;max-width:560px;max-height:90vh;max-height:90dvh;border-radius:16px 16px 0 0;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 -10px 50px rgba(28,27,25,0.25);transform:translateY(6%);transition:transform .3s cubic-bezier(0.16,1,0.3,1)}'
    + '.meseq-ov.open .meseq{transform:translateY(0)}'
    + '@media(min-width:600px){.meseq{border-radius:14px}}'
    + '.meseq-head{flex:0 0 auto;padding:20px 22px 0;position:relative}'
    + '.meseq-eyebrow{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold,#B89A75);margin-bottom:5px}'
    + '.meseq-title{font-family:var(--serif-ko,serif);font-size:18px;font-weight:500;color:var(--accent,#3A2D22);letter-spacing:0.01em}'
    + '.meseq-note{font-family:var(--serif-ko,serif);font-size:11.5px;font-weight:300;color:var(--light,#75705F);line-height:1.7;margin-top:6px;word-break:keep-all}'
    + '.meseq-x{position:absolute;top:16px;right:16px;background:none;border:none;cursor:pointer;color:var(--light,#75705F);padding:6px;line-height:0;border-radius:6px}'
    + '.meseq-x:hover{background:rgba(28,27,25,0.05);color:var(--accent,#3A2D22)}.meseq-x svg{width:18px;height:18px}'
    + '.meseq-tabs{flex:0 0 auto;display:flex;gap:6px;padding:14px 22px 12px}'
    + '.meseq-tab{flex:1;border:1px solid var(--border,#DDD8D1);background:none;border-radius:9px;padding:9px 4px;cursor:pointer;font-family:var(--serif-ko,serif);color:var(--sub,#5A554C);line-height:1.25;transition:all .2s}'
    + '.meseq-tab b{display:block;font-size:13px;font-weight:500}.meseq-tab span{display:block;font-size:10px;color:var(--light,#75705F);margin-top:2px}'
    + '.meseq-tab.on{background:var(--seal,#6B2A24);border-color:var(--seal,#6B2A24);color:#fff}.meseq-tab.on span{color:rgba(255,255,255,0.8)}'
    + '.meseq-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:4px 22px 22px;-webkit-overflow-scrolling:touch}'
    + '.meseq-row{display:grid;grid-template-columns:92px 1fr;gap:12px;padding:12px 0;border-bottom:1px solid var(--hairline,rgba(28,27,25,0.12))}'
    + '.meseq-row:last-child{border-bottom:none}'
    + '.meseq-time{font-family:var(--serif-ko,serif);font-size:12.5px;font-weight:500;color:var(--seal,#6B2A24);letter-spacing:-0.01em;white-space:nowrap;padding-top:1px}'
    + '.meseq-dur{display:block;font-size:10.5px;font-weight:300;color:var(--light,#75705F);margin-top:2px}'
    + '.meseq-name{font-family:var(--serif-ko,serif);font-size:14px;font-weight:500;color:var(--accent,#3A2D22)}'
    + '.meseq-desc{font-family:var(--serif-ko,serif);font-size:12px;font-weight:300;color:var(--sub,#5A554C);line-height:1.65;margin-top:3px;word-break:keep-all}'
    + '.meseq-div{margin:16px 0 4px;font-family:var(--serif,Georgia,serif);font-style:italic;font-size:10px;letter-spacing:0.14em;text-transform:uppercase;color:var(--gold,#B89A75);display:flex;align-items:center;gap:8px}'
    + '.meseq-div::after{content:"";flex:1;height:1px;background:var(--hairline,rgba(28,27,25,0.12))}'
    + '.meseq-row.internal .meseq-name{color:var(--light,#75705F);font-weight:400}.meseq-row.internal .meseq-time{color:var(--light,#75705F)}'
    + '.meseq-foot{flex:0 0 auto;padding:12px 22px 18px;border-top:1px solid var(--hairline,rgba(28,27,25,0.12));font-family:var(--serif-ko,serif);font-size:11px;font-weight:300;color:var(--light,#75705F);line-height:1.7;word-break:keep-all}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var ov = document.createElement('div'); ov.className = 'meseq-ov'; ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', '140분 진행 시간표');
  ov.innerHTML = ''
    + '<div class="meseq">'
    + '  <div class="meseq-head">'
    + '    <div class="meseq-eyebrow">The 140 Signature</div>'
    + '    <div class="meseq-title">140분 진행 시간표</div>'
    + '    <div class="meseq-note" id="meseqNote"></div>'
    + '    <button class="meseq-x" id="meseqX" aria-label="닫기"><svg viewBox="0 0 24 24" fill="none"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>'
    + '  </div>'
    + '  <div class="meseq-tabs" id="meseqTabs"></div>'
    + '  <div class="meseq-body" id="meseqBody"></div>'
    + '  <div class="meseq-foot">예식 시작 기준 시간이에요. 하객분께는 대기 공간이 없어 <b style="font-weight:500;color:var(--sub,#5A554C)">하객 입장 시간</b>에 맞춰 오시도록 안내해 주세요. 세부 식순은 계약 후 마이페이지에서 직접 설계하실 수 있습니다.</div>'
    + '</div>';
  document.body.appendChild(ov);

  var tabsEl = ov.querySelector('#meseqTabs'), bodyEl = ov.querySelector('#meseqBody'), noteEl = ov.querySelector('#meseqNote');
  var curSlot = 0, mode = 'trim';

  function esc(s) { return String(s).replace(/[&<>]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]; }); }

  function renderTabs() {
    tabsEl.innerHTML = SLOTS.map(function (s, i) {
      return '<button class="meseq-tab' + (i === curSlot ? ' on' : '') + '" data-i="' + i + '"><b>' + s.tab + '</b><span>' + s.sub + '</span></button>';
    }).join('');
  }
  function renderBody() {
    var html = '', dividerDone = false;
    ROWS.forEach(function (r) {
      var internal = r[4];
      if (internal && mode !== 'full') return;   // 추린 모드에선 내부 운영 숨김
      if (internal && !dividerDone) { html += '<div class="meseq-div">예식 후 · 홀 운영</div>'; dividerDone = true; }
      html += '<div class="meseq-row' + (internal ? ' internal' : '') + '">'
        + '<div class="meseq-time">' + esc(r[2][curSlot]) + '<span class="meseq-dur">' + esc(r[1]) + '</span></div>'
        + '<div><div class="meseq-name">' + esc(r[0]) + '</div><div class="meseq-desc">' + esc(r[3]) + '</div></div>'
        + '</div>';
    });
    bodyEl.innerHTML = html; bodyEl.scrollTop = 0;
  }
  function open(m) {
    mode = (m === 'full') ? 'full' : 'trim';
    noteEl.textContent = (mode === 'full')
      ? '세 타임 모두 같은 흐름으로 진행되며 시간만 다릅니다. 예식 후 홀 운영까지 전체 일정이에요.'
      : '세 타임 모두 같은 흐름으로 진행되며 시간만 다릅니다. 원하시는 시간대를 골라 보세요.';
    renderTabs(); renderBody();
    ov.classList.add('open'); document.documentElement.style.overflow = 'hidden';
  }
  function close() { ov.classList.remove('open'); document.documentElement.style.overflow = ''; }

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
