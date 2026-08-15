// 모먼트에디트 · 공용 AI 상담 위젯 (inquiry.html 예약 페이지 · mypage.html)
// 메인홈(index.html) 위젯과 같은 우측 중앙 아이콘(FAB) + 우측 드로어 디자인.
// 페이지별 설정: window.ME_ADV_PAGE = {
//   page: '예약'|'마이',                    ← /api/handoff 인계 브리핑에 표기
//   greeting: '첫 인사',
//   chips: [{ label:'질문', sched:true? }], ← 빠른질문. sched:true면 신비주의 스케줄 확인으로 라우팅
//   schedule: true|false,                   ← 예식일 가능 여부 질문을 /api/schedule-advisor로 자동 라우팅
//   customer: function(){return {name,stage,code}|null}  ← (마이) 인계 시 고객 식별 정보
//   kakaoUrl: 'URL' | function(){return 'URL'}  ← (선택) 카카오 문의 링크 재정의(마이=GAS KAKAO_URL·미설정 시 KB→메일 폴백)
//   share: { url:'https://…' }                  ← (선택) 공유 FAB 추가 — 링크만 공유(모바일 네이티브 시트·PC 복사, 메인홈과 동일 동작)
//   booking: { url:'/inquiry.html' }             ← (선택) 예약(상담 신청) 바로가기 FAB 추가(달력 아이콘 · 스택 맨 위)
//   sequence: 'trim'|'full'                      ← (선택) 진행 시간표 FAB 추가(시계 아이콘) — sequence-modal.js 로드 필요
// }
// 카톡 문의 동선: 별도 버튼 없이 이 위젯 안에서 — 드로어 하단 상시 링크 + AI가 못 풀 때 에스컬레이션 박스.
// 선택: /assets/advisor-kb.js 가 먼저 로드되면 escalation 설정(카카오 URL·상담시간)을 공유.
(function () {
  var CFG = window.ME_ADV_PAGE || {};
  var KB = window.MOMENT_ADVISOR_KB || null;
  var ESC = (KB && KB.escalation) || { kakaoUrl: 'https://pf.kakao.com/_CfxcxlX/chat', hours: '평일 10시 - 18시' };
  var PAGE = CFG.page || '예약';

  var css = ''
    + '.me-fab-stack{position:fixed;right:22px;top:50%;z-index:95;display:flex;flex-direction:column;align-items:center;gap:13px;transform:translateY(-50%);transition:opacity .55s var(--ease,ease),transform .55s var(--ease,ease)}'
    + '.me-fab-stack.hide{opacity:0;visibility:hidden;pointer-events:none;transform:translateY(-50%) translateX(8px)}'
    + '.me-fab{display:flex;flex-direction:column;align-items:center;gap:4px;text-decoration:none;background:none;border:none;cursor:pointer;padding:0;-webkit-tap-highlight-color:transparent}'
    /* 누끼 아이콘 — 원형 배경 없이 선 아이콘만(터치 영역 50px 유지) · 메인홈과 동일 */
    + '.me-fab-ico{width:50px;height:50px;display:flex;align-items:center;justify-content:center;background:none;border:none;box-shadow:none;color:var(--seal,#6B2A24);opacity:.85;transition:transform .3s var(--ease,ease),opacity .3s var(--ease,ease)}'
    + '.me-fab:hover .me-fab-ico{transform:translateY(-2px);opacity:1}'
    + '.me-fab-ico svg{width:22px;height:22px}'
    + '@media(max-width:680px){.me-fab-stack{right:6px}.me-fab-ico{width:46px;height:46px}.me-fab-ico svg{width:21px;height:21px}}'
    /* 아이콘은 항상 노출(누끼) — 스크롤 숨김 효과는 정신없어 제거 (2026-06-12 사용자 지시) */
    /* ★★[RAIL_OVERLAP_OK 2026-08-10 사용자 확인] 이 레일이 본문 글자 위에 겹치는 것은 **의도된 것이다.**
       > 사용자 원문: *"계획된거야"* (겹침 실측을 보고한 뒤의 답)
       ★고치지 말 것. 재는 사람마다 같은 결론에 닿아 같은 제안을 다시 들고 오게 되어 있다 —
         그러라고 여기 수치를 남긴다. 이미 두 세션이 각각 발견해 각각 고치려 했다.
       실측 (390px · 2026-08-10):
         글리프 띠 x 351~372 (탭 상자는 x 338~384 이지만 배경이 투명이라 칠해지는 것은 svg 뿐)
         본문은 x 20~370 → 글자가 **실제로** 아이콘에 닿는 줄: index 64 · inquiry 24 ·
         order-preview 1 · schedule 0 · mypage/guide 0(레일 없음). 합 89줄.
       ★'상자 기준'으로 세면 195개가 나온다 — 그건 과장이다. 탭 상자는 투명해 아무것도 안 가린다.
         이 둘을 섞어 세지 말 것(같은 이름의 두 숫자는 증명을 방해한다).
       ★해결책이라며 다시 오기 쉬운 것 셋과 그 결말:
         ①본문 오른쪽 여백 22~34px → 랜딩 폭이 통째로 바뀐다. 사용자가 '계획된 것'이라 했다.
         ②레일을 더 오른쪽으로/작게 → 탭 44px 규칙(check-tap-targets)이 깨진다.
         ③스크롤 자동 숨김 → **2026-06-12 사용자 지시로 이미 폐지**(바로 윗줄). 되살리지 말 것. */
    + '.me-adv-backdrop{position:fixed;inset:0;z-index:148;background:rgba(28,27,25,0.34);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;visibility:hidden;transition:opacity .42s,visibility .42s}'
    + '.me-adv-backdrop.open{opacity:1;visibility:visible}'
    + '.me-adv-panel{position:fixed;top:0;right:0;bottom:0;z-index:150;width:452px;max-width:100vw;height:100vh;height:100dvh;background:var(--bg,#FAFAF8);border-left:1px solid var(--border,#DDD8D1);display:flex;flex-direction:column;overflow:hidden;transform:translateX(102%);transition:transform .46s cubic-bezier(0.16,1,0.3,1);will-change:transform}'
    + '.me-adv-panel.open{transform:translateX(0);box-shadow:-26px 0 72px rgba(28,27,25,0.20)}'
    + '.me-adv-panel:focus{outline:none}'
    /* [ADV_NOZOOM 2026-08-03] 여기 있던 `.me-adv-input{font-size:16px}`을 뺐다 — 죽은 규칙이었다.
       이 블록(36행)이 base `.me-adv-input`(아래) 보다 먼저 선언돼, 같은 특이도(0,1,0)에서
       나중에 온 base의 14px가 이겼다. 그래서 모바일에서도 14px로 렌더되고,
       iOS는 입력창 글자가 16px 미만이면 포커스 시 화면을 자동 확대한다(사용자 지적).
       → base를 16px로 올려 근본을 고쳤다. 여기에 다시 넣지 말 것(순서 때문에 또 죽는다). */
    + '@media(max-width:680px){.me-adv-panel{width:100vw;border-left:none}}'
    /* [ADV_PRINT] 인쇄할 때 떠다니는 버튼·패널이 종이에 그대로 찍혔다.
       parents.html 인쇄 미리보기에서 공유 FAB(46×46)이 편지 본문 위에 겹쳐 나왔다(스크린샷에서 발견).
       parents는 인쇄 스타일에서 nav·도구·푸터를 이미 감추는데 이 위젯만 빠져 있었다 —
       위젯 쪽에 두면 이 파일을 쓰는 네 페이지가 전부 같이 해결된다. */
    + '@media print{.me-fab-stack,.me-adv-panel,.me-adv-backdrop,.me-adv-fab{display:none !important}}'
    + '.me-adv-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:22px 22px 19px;background:var(--bg,#FAFAF8);border-bottom:1px solid var(--hairline,rgba(28,27,25,0.18))}'
    + '.me-adv-head-t{display:flex;align-items:center;gap:13px}'
    + '.me-adv-seal{width:42px;height:42px;border-radius:50%;background:#fff;color:var(--seal,#6B2A24);border:1px solid rgba(107,42,36,0.28);display:flex;align-items:center;justify-content:center;font-family:var(--serif,Georgia,serif);font-size:15px;font-weight:500;letter-spacing:0.04em;flex:0 0 auto;box-shadow:0 2px 9px rgba(28,27,25,0.06)}'
    + '.me-adv-titles{display:flex;flex-direction:column;line-height:1.1}'
    /* [ADV_A11Y] 장식용 골드(#B89A75)가 글자에 쓰여 2.54:1이었다 → 읽는 골드 5.71:1.
       ★이 파일은 inquiry·mypage·order-preview·parents 네 페이지가 함께 쓴다(2026-07-27 확인).
         --gold-text를 정의한 페이지는 그 값을, 없는 페이지는 폴백 #7A5F37을 쓴다. */
    + '.me-adv-eyebrow{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold-text,#7A5F37);margin-bottom:4px}'
    + '.me-adv-title{font-family:var(--serif-ko,"Noto Serif KR",serif);font-size:19px;font-weight:500;color:var(--accent,#3A2D22);letter-spacing:0.01em;line-height:1.15}'
    /* [ADV_A11Y] 닫기 30×30 — 패널을 빠져나오는 유일한 버튼인데 가장 작았다 → 44px.
       아이콘 크기는 그대로 두고 히트영역만 넓힌다(모양 변화 없음). */
    + '.me-adv-close{background:none;border:none;cursor:pointer;color:var(--light,#75705F);padding:6px;line-height:0;border-radius:6px;transition:color .3s var(--ease,ease),background .3s var(--ease,ease);min-width:44px;min-height:44px;display:inline-flex;align-items:center;justify-content:center}'
    + '.me-adv-close:hover{color:var(--accent,#3A2D22);background:rgba(28,27,25,0.05)}'
    + '.me-adv-close svg{width:18px;height:18px}'
    + '.me-adv-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:24px 22px 12px;display:flex;flex-direction:column;gap:14px;-webkit-overflow-scrolling:touch}'
    /* 메뉴는 위, 인사말 버블만 하단(입력창 쪽)으로 — 넘치면 auto가 0으로 접혀 정상 채팅 스크롤 (2026-07-07 사용자 지시) */
    + '.me-adv-greet{margin-top:auto}'
    + '.me-adv-msg{max-width:90%;font-size:14px;line-height:1.75;white-space:pre-wrap;word-break:keep-all;border-radius:12px;padding:12px 16px;font-family:var(--sans,sans-serif)}'
    + '.me-adv-msg.bot{align-self:flex-start;background:var(--bg2,#F5F3EF);color:var(--accent,#3A2D22);border-bottom-left-radius:4px}'
    + '.me-adv-msg.me{align-self:flex-end;background:var(--seal,#6B2A24);color:#fff;border-bottom-right-radius:4px}'
    + '.me-adv-typing{align-self:flex-start;display:inline-flex;gap:4px;padding:13px 15px;background:var(--bg2,#F5F3EF);border-radius:12px;border-bottom-left-radius:4px}'
    + '.me-adv-typing i{width:6px;height:6px;border-radius:50%;background:var(--gold,#B89A75);opacity:.5;animation:meAdvBlink 1.2s infinite}'
    + '.me-adv-typing i:nth-child(2){animation-delay:.2s}.me-adv-typing i:nth-child(3){animation-delay:.4s}'
    + '@keyframes meAdvBlink{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'
    /* [ADV_INDEX_SYNC] index.html이 2026-08-01에 받은 상담 메뉴 개편을 이 파일에도 이식(2026-08-03).
       이 파일은 inquiry·parents·mypage·order-preview 네 페이지가 함께 쓰는데, 메인홈만 개편되어
       고객이 페이지를 넘나들 때 같은 패널이 다른 화면으로 보이고 있었다. 되돌리지 말 것.
       ─ 전폭 헤어라인 제거: 12줄이면 선이 12개. 이 브랜드의 주 표현수단인 여백을 12등분해 잘랐다.
       ─ 15px → 14px: 답변 버블(14px)보다 메뉴가 커서 위계가 뒤집혀 있었다. 메뉴는 내용과 같은 격.
       ─ 호버 --gold(#B89A75) → --seal: 구형은 호버하는 순간 2.54:1로 떨어져 AA 미달이었다(10.14:1).
       ─ :active 워시 추가: 폰엔 호버가 없다. 눌림 감각이 통째로 없었다.
       ─ margin -10px: 눌림 워시가 글줄 좌우로 번져야 누른 면적과 보이는 면적이 맞는다.
         글자는 칩의 padding-left:10px이 되받아 본문 22px 라인을 유지한다. */
    + '.me-adv-chips{display:flex;flex-direction:column;gap:2px;margin:2px -10px 0}'
    /* [ADV_KO_FALLBACK] 폴백을 'serif'(브라우저 기본)에서 'Noto Serif KR'로 넓힘(2026-08-03).
       order-preview.html은 :root에 --serif-ko를 정의하지 않아 이 파일의 국문 조판이
       그 페이지에서만 기기 기본 명조로 떨어졌다(iOS 애플명조 · 윈도 바탕 등 제각각).
       네 페이지 모두 Noto Serif KR 웹폰트를 이미 내려받고 있으므로 이름만 적어주면 맞는다.
       ※ 검사기 자체의 기본 serif가 같은 글꼴이라 헤드리스 렌더로는 차이가 안 보인다
         (글자폭 113.94px 동일 실측) — 이 폴백을 'serif'로 되돌리지 말 것. */
    /* [ADV_INDEX_SYNC] 한글을 Cormorant 이탤릭 대문자로 조판하던 자리. Cormorant엔 한글 글리프가
       없어 폴백으로 떨어지고, 거기 italic이 걸려 '가짜 기울임'이 되고, uppercase는 한글에 아무
       효과가 없었다. 색도 --gold(2.54:1)라 AA 미달. → 국문 소라벨 규격(--serif-ko·12px·0.08em·--sub). */
    + '.me-adv-chips-label{font-family:var(--serif-ko,"Noto Serif KR",serif);font-size:12px;font-weight:400;letter-spacing:0.08em;color:var(--sub,#5A554C);margin:10px 0 0}'
    + '.me-adv-chip{display:flex;align-items:center;justify-content:flex-start;gap:4px;width:100%;text-align:left;font-family:var(--serif-ko,"Noto Serif KR",serif);font-size:14px;font-weight:400;letter-spacing:0.01em;color:var(--accent,#3A2D22);background:none;border:none;border-radius:6px;padding:12px 10px;cursor:pointer;transition:color .3s var(--ease,ease),background .12s var(--ease,ease),padding-left .3s var(--ease,ease);line-height:1.5;word-break:keep-all}'
    + '.me-adv-chip:hover{color:var(--seal,#6B2A24);padding-left:18px}'
    + '.me-adv-chip:active{background:var(--bg2,#F5F3EF)}'
    /* [ADV_RAMP] 반px 12.5 → 13([TYPO_SCALE7]) · 라운드 30px → 999px 알약([SCALE_RADIUS6]는 2/4/6/8/12+999만 쓴다) */
    + '.me-adv-escoffer{align-self:flex-start;font-family:var(--serif-ko,"Noto Serif KR",serif);font-size:13px;color:var(--seal,#6B2A24);background:none;border:1px solid rgba(107,42,36,0.35);border-radius:999px;padding:9px 16px;cursor:pointer;transition:background .3s var(--ease,ease),border-color .3s var(--ease,ease);line-height:1.4}'
    + '.me-adv-escoffer:hover{background:rgba(107,42,36,0.05);border-color:var(--seal,#6B2A24)}'
    + '.me-adv-esc{align-self:stretch;background:#fff;border:1px solid rgba(184,154,117,0.45);border-radius:12px;padding:14px 15px;margin-top:2px}'
    + '.me-adv-esc-t{font-family:var(--serif-ko,"Noto Serif KR",serif);font-size:13px;color:var(--accent,#3A2D22);line-height:1.6;margin-bottom:11px}'
    + '.me-adv-esc-btns{display:flex;flex-direction:column;gap:8px}'
    + '.me-adv-esc-btn{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;text-align:center;font-family:var(--sans,sans-serif);font-size:13px;padding:11px 14px;border-radius:8px;transition:opacity .3s var(--ease,ease),transform .3s var(--ease,ease)}'
    + '.me-adv-esc-btn.kakao{background:var(--seal,#6B2A24);color:#fff;font-weight:500;letter-spacing:0.02em}'
    + '.me-adv-esc-btn.kakao:hover{opacity:.92;transform:translateY(-1px);box-shadow:0 6px 18px rgba(107,42,36,0.18)}'
    + '.me-adv-esc-btn.mail{background:var(--bg2,#F5F3EF);color:var(--accent,#3A2D22);border:1px solid var(--border,#DDD8D1)}'
    + '.me-adv-esc-btn.mail:hover{opacity:.9;transform:translateY(-1px)}'
    + '.me-adv-esc-hours{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:11px;color:var(--light,#75705F);text-align:center;margin-top:9px;letter-spacing:0.04em}'
    + '.me-adv-foot{flex:0 0 auto;border-top:1px solid var(--border,#DDD8D1);padding:14px 16px;background:var(--bg,#FAFAF8)}'
    /* [ADV_A11Y] 카카오톡 문의 링크 높이 23px — '해결이 안 될 때' 마지막으로 누르는 자리다 → 44px. */
    /* [ADV_ESC_ONLY 2026-08-03] .me-adv-foot-kakao 4줄 삭제 — 상시 카톡 링크와 함께 사라진 죽은 CSS.
       에스컬레이션 시 뜨는 버튼은 별개 클래스(.me-adv-esc-btn.kakao)라 영향 없다. */
    + '.me-adv-form{display:flex;align-items:flex-end;gap:8px}'
    /* [ADV_NOZOOM] 16px 고정 — iOS는 16px 미만 입력창에 포커스하면 화면을 자동 확대한다.
       메인홈(index.html:7743)의 같은 요소도 16px이라 규격도 이쪽이 맞다. 내리지 말 것. */
    + '.me-adv-input{flex:1 1 auto;resize:none;border:1px solid var(--border,#DDD8D1);border-radius:12px;padding:12px 14px;font-family:var(--sans,sans-serif);font-size:16px;color:var(--text,#1C1B19);background:#fff;line-height:1.5;max-height:96px;outline:none;transition:border-color .3s var(--ease,ease)}'
    + '.me-adv-input:focus{border-color:var(--gold,#B89A75)}'
    + '.me-adv-send{flex:0 0 auto;width:44px;height:44px;border:none;border-radius:50%;background:transparent;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .3s var(--ease,ease),transform .3s var(--ease,ease)}'
    + '.me-adv-send:hover{opacity:.88;transform:translateY(-1px)}'
    + '.me-adv-send:disabled{opacity:.4;cursor:default;transform:none}'
    + '.me-adv-send svg{width:20px;height:20px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var SHARE = (CFG.share && CFG.share.url) ? CFG.share : null;
  var BOOK = (CFG.booking && CFG.booking.url) ? CFG.booking.url : null;
  var SEQ = CFG.sequence ? ((CFG.sequence === 'trim' || (CFG.sequence && CFG.sequence.mode === 'trim')) ? 'trim' : 'full') : null;   // 진행 시간표 FAB — sequence-modal.js가 [data-seq-open] 클릭을 받아 모달을 엶
  var GUIDE = (CFG.guide && CFG.guide.url) ? CFG.guide.url : null;   // 어른께 드리는 안내(부모님 안내문) FAB
  var wrap = document.createElement('div');
  wrap.innerHTML = ''
    + '<div class="me-fab-stack" id="meAdvStack">'
    + (BOOK ? (''
    + '  <a class="me-fab" href="' + BOOK + '" aria-label="상담 예약하기">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><rect x="4" y="5" width="16" height="16" rx="2" stroke="currentColor" stroke-width="1.6"/><path d="M4 9.5h16M8.5 3v4M15.5 3v4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M9 14.5l2 2 4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    + '  </a>') : '')
    + (SEQ ? (''
    + '  <button class="me-fab" id="meAdvSeq" type="button" data-seq-open="' + SEQ + '" aria-label="예식 진행 시간표 보기">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="8.5" stroke="currentColor" stroke-width="1.6"/><path d="M12 7.5V12l3 2" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    + '  </button>') : '')
    + (GUIDE ? (''
    + '  <a class="me-fab" href="' + GUIDE + '" aria-label="어른께 드리는 안내 보기">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 4.5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-13a1 1 0 0 1 1-1Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/><path d="M8 9h8M8 12.5h8M8 16h5" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg></span>'
    + '  </a>') : '')
    + '  <button class="me-fab" id="meAdvFab" aria-label="상담 도우미 열기" type="button">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>'
    + '  </button>'
    + (SHARE ? (''
    + '  <button class="me-fab" id="meAdvShare" aria-label="페이지 공유하기" type="button">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5v10.5M12 3.5 8.5 7M12 3.5 15.5 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11H5.4A1.4 1.4 0 0 0 4 12.4v6.2A1.4 1.4 0 0 0 5.4 20h13.2a1.4 1.4 0 0 0 1.4-1.4v-6.2A1.4 1.4 0 0 0 18.6 11H17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    + '  </button>') : '')
    + '</div>'
    + '<div class="me-adv-backdrop" id="meAdvBackdrop"></div>'
    + '<section class="me-adv-panel" id="meAdvPanel" role="dialog" aria-label="모먼트에디트 상담 도우미" aria-modal="true" tabindex="-1">'
    + '  <header class="me-adv-head">'
    + '    <div class="me-adv-head-t">'
    + '      <span class="me-adv-titles"><span class="me-adv-eyebrow">AI Wedding Concierge</span><span class="me-adv-title">상담 도우미</span></span>'
    + '    </div>'
    + '    <button class="me-adv-close" id="meAdvClose" aria-label="닫기" type="button"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>'
    + '  </header>'
    + '  <div class="me-adv-body" id="meAdvBody"></div>'
    + '  <footer class="me-adv-foot">'
    + '    <form class="me-adv-form" id="meAdvForm">'
    + '      <textarea class="me-adv-input" id="meAdvInput" rows="1" placeholder="궁금한 점을 적어주세요" aria-label="질문 입력"></textarea>'
    + '      <button type="submit" class="me-adv-send" id="meAdvSend" aria-label="전송"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M2.8 11.3 20.3 4.2c.5-.2 1 .3.8.8l-4.7 15.2c-.15.5-.8.6-1.1.16l-3.4-4.8-3 2.4c-.3.24-.75.03-.76-.35l-.06-3.9-5.2-1.1c-.5-.1-.55-.8-.06-1Z" fill="none" stroke="var(--seal,#6B2A24)" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"/></svg></button>'
    + '    </form>'
    /* ★[ADV_ESC_ONLY 2026-08-03 사용자 지시] 여기 있던 상시 노출 '해결이 안 되면 카카오톡 문의'
       링크를 삭제했다. 되살리지 말 것.
       이유: 카톡 안내는 AI가 못 풀 때만 나가는 것이 설계 의도인데(2026-07-05 지시
       "중간 버튼 없이 바로 showEscalation"), 이 링크가 첫 화면부터 상시로 떠 있어
       "이 AI는 어차피 못 푼다"는 인상을 먼저 주고 카톡 직행을 유도하고 있었다.
       메인홈(index.html)에는 애초에 이 링크가 없다 — 공용 위젯만 옛 방식이 남아 있었다.
       인계 유실 없음: showEscalation()이 첫 줄에서 doHandoff()를 호출한다. */
    + '  </footer>'
    + '</section>';
  document.body.appendChild(wrap);

  var fab = document.getElementById('meAdvFab'), stackEl = document.getElementById('meAdvStack'),
      panel = document.getElementById('meAdvPanel'), backdrop = document.getElementById('meAdvBackdrop'),
      closeBtn = document.getElementById('meAdvClose'), body = document.getElementById('meAdvBody'),
      form = document.getElementById('meAdvForm'), input = document.getElementById('meAdvInput'),
      sendBtn = document.getElementById('meAdvSend');   // [ADV_ESC_ONLY] kakaoA(상시 카톡 링크) 제거 — 위 footer 주석 참조

  var started = false, sending = false, escShown = false, handoffSent = false;
  var transcript = [];
  var lastNight = false;   // 직전 응답의 야간 플래그(식순 등 — 에스컬레이션 문구를 정직하게)
  var mode = 'adv';   // 'adv'(/api/advisor) | 'sched'(/api/schedule-advisor 신비주의 스케줄)

  function place(el) { body.appendChild(el); }
  function scrollDown() { body.scrollTop = body.scrollHeight; }
  function addMsg(t, who) {
    var d = document.createElement('div');
    d.className = 'me-adv-msg ' + who; d.textContent = t;
    place(d); scrollDown(); return d;
  }
  function addTyping() {
    var d = document.createElement('div');
    d.className = 'me-adv-typing'; d.innerHTML = '<i></i><i></i><i></i>';
    place(d); scrollDown(); return d;
  }

  // ── 카카오 문의 링크 — CFG.kakaoUrl(문자열|함수) → KB escalation → 메일 폴백 순.
  //    (마이) d.kakao는 비동기로 와서 캐시에 저장되므로, 열 때·누를 때마다 다시 읽는다.
  function kakaoInfo() {
    var u = '';
    try { u = (typeof CFG.kakaoUrl === 'function') ? CFG.kakaoUrl() : (CFG.kakaoUrl || ''); } catch (e) { u = ''; }
    u = String(u || ESC.kakaoUrl || 'mailto:contact@momentedit.kr');
    return { href: u, mail: u.indexOf('mailto:') === 0 };
  }
  /* ★[ADV_ESC_ONLY 2026-08-03] refreshKakaoLink() 삭제 — 상시 카톡 링크가 사라져 대상이 없다.
     카톡/이메일 주소 결정은 kakaoInfo()가 계속 담당하며, showEscalation()이 그때 읽어 쓴다. */

  // ── 에스컬레이션: 답 못 푸는 경우 중간 버튼 없이 바로 카톡 상담 연결(showEscalation)을 띄운다(2026-07-05 사용자 지시) ──
  function doHandoff() {
    if (handoffSent || transcript.length === 0) return; handoffSent = true;
    var payload = { messages: transcript.slice(-16), page: PAGE };
    try { var c = (typeof CFG.customer === 'function') ? CFG.customer() : null; if (c) payload.customer = c; } catch (e) {}
    try { if (typeof CFG.state === 'function') { var _hs = CFG.state(); if (_hs) payload.state = String(_hs).slice(0, CFG.stateMax || 1800); } } catch (e) {}
    try {
      fetch('/api/handoff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(function () {});
    } catch (e) {}
  }
  // 익명(비로그인) 모드 판정 — advExtra().embed가 false면 인계 대신 예약 유도(연락 불가 dead-end 방지 · 기획 v3 §6)
  function isAnonMode() {
    try { var x = (typeof CFG.advExtra === 'function') ? CFG.advExtra() : null; if (x && 'embed' in x) return !x.embed; } catch (e) {}
    return false;
  }
  // 야간(KST) 클라이언트 폴백 — 서버가 night 플래그를 못 실은 오류 경로에서도 문구가 정직하게(서버값 있으면 우선)
  function nightNowKST() { var h = new Date(new Date().getTime() + 9 * 3600 * 1000).getUTCHours(); return h >= 18 || h < 9; }
  function escalateOrBook() {   // 오류/폴백 공용 — 익명이면 인계 금지·예약 유도
    if (isAnonMode()) showBooking(); else showEscalation();
  }
  function showEscalation() {
    if (escShown) return; escShown = true;
    doHandoff();
    var ki = kakaoInfo();
    var box = document.createElement('div'); box.className = 'me-adv-esc';
    var t = document.createElement('div'); t.className = 'me-adv-esc-t';
    t.textContent = (lastNight || nightNowKST())
      ? '문의를 디렉터에게 남겼어요. 내일 영업시간에 이어서 답해드려요.'
      : (ki.mail
      ? '디렉터에게 바로 전달했어요. 이메일로 이어서 문의하실 수 있어요.'
      : '디렉터에게 바로 전달했어요. 카카오톡으로 이어서 상담하실 수 있어요.');
    box.appendChild(t);
    var btns = document.createElement('div'); btns.className = 'me-adv-esc-btns';
    var k = document.createElement('a');
    k.className = 'me-adv-esc-btn ' + (ki.mail ? 'mail' : 'kakao'); k.href = ki.href;
    if (!ki.mail) k.target = '_blank';
    k.rel = 'noopener'; k.textContent = ki.mail ? '이메일로 문의하기' : '카카오톡으로 상담하기';
    btns.appendChild(k);
    box.appendChild(btns);
    if (ESC.hours) {
      var h = document.createElement('div'); h.className = 'me-adv-esc-hours';
      h.textContent = '상담 가능 ' + ESC.hours;
      box.appendChild(h);
    }
    place(box); scrollDown();
  }

  // ── 예약 유도 박스(toBooking) — 익명 모드에서 인계 대신 상담 예약으로(연락 불가 인계 방지) ──
  var bookShown = false;
  function showBooking() {
    if (bookShown) return; bookShown = true;
    var box = document.createElement('div'); box.className = 'me-adv-esc';
    var t = document.createElement('div'); t.className = 'me-adv-esc-t';
    t.textContent = '이어지는 확인은 상담 예약 페이지에서 하실 수 있어요.';
    box.appendChild(t);
    var btns = document.createElement('div'); btns.className = 'me-adv-esc-btns';
    var a = document.createElement('a');
    a.className = 'me-adv-esc-btn kakao'; a.href = (CFG.booking && CFG.booking.url) || '/inquiry.html';
    a.target = '_top';   // 임베드(iframe) 안에서도 예약 페이지가 전체 창으로 열리게(작은 오버레이에 갇히지 않게)
    a.textContent = '상담 예약 페이지로';
    btns.appendChild(a); box.appendChild(btns);
    place(box); scrollDown();
  }

  // ── 신비주의 스케줄 라우팅(예약 페이지) — 예식일 가능 여부 질문은 schedule-advisor로 ──
  function dateish(s) {
    return /(\d{1,4}\s*(년|월|일|주))|내년|올해|내후년|다음\s*달|이번\s*달|봄|여름|가을|겨울|상반기|하반기|중순|월말|월초|주말|평일|(월|화|수|목|금|토|일)요일|공휴일|연휴|크리스마스|성탄/.test(s);
  }
  function slotish(s) {   // 시간대만 짧게 답할 때(예: "오후 12시 20분") 스케줄 흐름 유지
    return /(오전|오후|아침|점심|낮|저녁|늦은\s*오후|새벽|정오|\d{1,2}\s*시|\d{1,2}\s*:\s*\d{2}|시간대|타임)/.test(s);
  }
  function affirmish(s) {   // 짧은 수긍("네 그걸로 할게요")도 스케줄 흐름 유지
    s = s.trim();
    return s.length <= 16 && /(네|예|응|넵|좋아|좋습니다|그래|그걸로|이걸로|그날|확정|그렇게|할게|할께|괜찮|맞아|예약할)/.test(s);
  }
  function offTopicish(s) {   // 명백히 다른 주제면 일반 상담으로 전환
    return /(가격|비용|얼마|금액|예약금|계약금|중도금|잔금|환불|취소|수수료|주차|식사|식대|다이닝|메이크업|메이크|드레스|헤어|청첩장|영상|스냅|반려|결제|계좌|입금|보증|문의서|연락처|환불)/.test(s);
  }
  function schedish(s) {
    if (/(예식\s*일|예식\s*날짜|예식일정)/.test(s) && /(가능|확인|예약|잡|비)/.test(s)) return true;
    if (dateish(s) && /(가능|예약|비어|잡을|잡아|돼요|되나요|될까)/.test(s) && !/상담\s*(예약|일정|시간)/.test(s)) return true;
    return false;
  }
  function todayYmd() {
    var n = new Date();
    return n.getFullYear() + '-' + ('0' + (n.getMonth() + 1)).slice(-2) + '-' + ('0' + n.getDate()).slice(-2);
  }

  function send(q, forceSched) {
    if (sending) return;
    addMsg(q, 'me'); transcript.push({ role: 'user', content: q });
    // 스케줄 모드는 "끈적하게" 유지: 한번 일정 흐름에 들어가면 날짜·시간대·짧은 수긍은 계속 스케줄로,
    // 명백히 다른 주제(가격·환불 등)일 때만 일반 상담으로 빠진다 → 시간대만 답해도 시원한 확정 안내가 나옴.
    var stay = mode === 'sched' && !offTopicish(q) && (dateish(q) || slotish(q) || affirmish(q));
    var useSched = !!CFG.schedule && (forceSched || schedish(q) || stay);
    mode = useSched ? 'sched' : 'adv';
    sending = true; sendBtn.disabled = true;
    var typing = addTyping();
    if (useSched) {
      // 컨텍스트 연속성: 통합 transcript를 넘겨, 앞서 말한 날짜가 다른 엔진을 거쳤어도 유지되게 한다.
      fetch('/api/schedule-advisor', { method: 'POST', headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: transcript.slice(-12), today: todayYmd(), page: PAGE }) })
        .then(function (r) { return r.json(); })
        .then(function (j) {
          typing.remove();
          var t = (j && j.reply) || '지금은 일정 확인이 어려워요. 잠시 후 다시 시도해 주세요.';
          addMsg(t, 'bot');
          transcript.push({ role: 'assistant', content: t });
        })
        .catch(function () { typing.remove(); addMsg('지금은 일정 확인이 어려워요. 잠시 후 다시 시도해 주세요.', 'bot'); })
        .then(function () { sending = false; sendBtn.disabled = false; });
      return;
    }
    var advBody = { messages: transcript.slice(-14), page: PAGE };
    // (마이·식순) 로그인 고객의 실시간 상태를 함께 전송 → AI가 개인 질문에 실데이터로 답(전송 시점에 최신값으로 읽음)
    try { if (typeof CFG.state === 'function') { var _s = CFG.state(); if (_s) advBody.state = String(_s).slice(0, CFG.stateMax || 1800); } } catch (e) {}
    try { if (typeof CFG.advExtra === 'function') { var _x = CFG.advExtra(); if (_x) { for (var _k in _x) advBody[_k] = _x[_k]; } } } catch (e) {}   // 식순: embed·customer 등 판별 필드
    fetch(CFG.endpoint || '/api/advisor', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify(advBody) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        typing.remove();
        var j = res.j || {};
        if (res.ok && j.reply) {
          lastNight = !!j.night;
          addMsg(j.reply, 'bot');
          transcript.push({ role: 'assistant', content: j.reply });
          if (j.escalate) showEscalation();   // 답 못 푸는 경우 바로 카톡 연결 노출(중간 버튼 생략)
          if (j.toBooking) showBooking();     // (식순 독립 모드 등) 인계 대신 상담 예약 유도
        } else {
          try { console.warn('advisor fallback', (res.status || '?'), (j && j.error) || ''); } catch (e) {}
          // 오류 시엔 응답의 escalate/toBooking 플래그(코드마다 제각각)를 믿지 않고 클라 모드로만 판정 —
          //   익명이면 인계 금지·예약 유도, 임베드면 인계(기획 v3 §6 · 익명 dead-end 인계 원천 차단).
          var anon = isAnonMode();
          addMsg(anon ? '지금은 자동 답변을 불러오지 못했어요. 상담 예약 페이지에서 이어서 확인하실 수 있어요.' : '지금은 자동 답변을 불러오지 못했어요. 디렉터가 직접 안내해 드릴게요.', 'bot');
          escalateOrBook();
        }
      })
      .catch(function () {
        typing.remove();
        addMsg(isAnonMode() ? '연결이 잠시 불안정합니다. 상담 예약 페이지에서 이어서 확인하실 수 있어요.' : '연결이 잠시 불안정합니다. 디렉터가 직접 안내해 드릴게요.', 'bot');
        escalateOrBook();
      })
      .then(function () { sending = false; sendBtn.disabled = false; });
  }

  var _chipLab = null, _chipBox = null;
  function _chipsList() {
    var c = null;
    try { c = (typeof CFG.chips === 'function') ? CFG.chips() : CFG.chips; } catch (e) { c = null; }
    return Array.isArray(c) ? c : [];
  }
  function renderChips() {
    var chips = _chipsList();
    if (!chips.length) return;
    // [ADV_INDEX_SYNC] 'Quick Questions'(영문) → 메인홈과 같은 국문 문구. 되돌리지 말 것.
    var lab = document.createElement('div'); lab.className = 'me-adv-chips-label'; lab.textContent = '무엇이 궁금하세요?';
    var box = document.createElement('div'); box.className = 'me-adv-chips';
    chips.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'me-adv-chip'; b.textContent = c.label;
      b.addEventListener('click', function () { send(c.label, !!c.sched); });
      box.appendChild(b);
    });
    // 재렌더(함수형 칩): 기존 노드를 제자리 교체 — append만 하면 열 때마다 칩이 중복 누적됨
    if (_chipBox && _chipBox.parentNode) {
      var _par = _chipBox.parentNode;
      _par.replaceChild(box, _chipBox);
      if (_chipLab && _chipLab.parentNode) _par.replaceChild(lab, _chipLab); else _par.insertBefore(lab, box);
    }
    else { place(lab); place(box); scrollDown(); }
    _chipLab = lab; _chipBox = box;
  }

  // ── 열기/닫기 + 모바일 배경 스크롤 잠금(index.html 위젯과 동일 동작) ──
  var _lockY = 0, _locked = false;
  function lockScroll() {
    var _sbw = window.innerWidth - document.documentElement.clientWidth; if (_sbw > 0) document.documentElement.style.paddingRight = _sbw + 'px';   // 실제 스크롤바(데스크톱)만 보정 · 모바일 팬텀 거터 방지
    document.documentElement.style.overflow = 'hidden';
    if (window.innerWidth <= 680) {
      _lockY = window.scrollY || window.pageYOffset || 0;
      var b = document.body;
      b.style.position = 'fixed'; b.style.top = (-_lockY) + 'px'; b.style.left = '0'; b.style.right = '0'; b.style.width = '100%';
      _locked = true;
    }
  }
  function unlockScroll() {
    document.documentElement.style.overflow = ''; document.documentElement.style.paddingRight = '';
    if (_locked) {
      var b = document.body;
      b.style.position = ''; b.style.top = ''; b.style.left = ''; b.style.right = ''; b.style.width = '';
      var html = document.documentElement, prevSB = html.style.scrollBehavior;
      html.style.scrollBehavior = 'auto';
      window.scrollTo(0, _lockY);
      html.style.scrollBehavior = prevSB;
      _locked = false;
    }
  }
  function open() {
    panel.classList.add('open'); stackEl.classList.add('hide');
    backdrop.classList.add('open');
    lockScroll();
    try { if (typeof CFG.onOpen === 'function') CFG.onOpen(); } catch (e) {}   // 식순: 재생 중 오디오 정지 등
    if (started && typeof CFG.chips === 'function') renderChips();   // 스텝 맥락 칩 갱신(함수형일 때만 · 제자리 교체)
    if (!started) {
      started = true;
      renderChips();   // 메뉴(칩)를 위에
      var g = addMsg(CFG.greeting || '안녕하세요, 모먼트에디트 상담 도우미예요. 궁금하신 점을 무엇이든 물어보세요.', 'bot');
      g.classList.add('me-adv-greet');   // 인사말 버블은 하단(입력창 위)에 정렬
      body.scrollTop = 0;   // 첫 화면은 메뉴부터 보이게
    }
    /* [ADV_FOCUS 2026-08-15 실클릭 점검] 폰(≤680)에서는 포커스가 body 에 남아 SR·키보드 사용자가
       열린 패널을 못 찾았다. 입력창을 폰에서 안 잡는 것은 의도(키보드가 화면 반을 덮는다) —
       대신 **패널 자체**(tabindex=-1)를 잡는다. 스크립트 포커스 링은 CSS 가 끈다(ASK_FOCUS_BOX 와 같은 수법). */
    setTimeout(function () { if (window.innerWidth > 680) input.focus(); else try { panel.focus(); } catch (e) {} }, 480);
  }
  function close() {
    panel.classList.remove('open'); stackEl.classList.remove('hide');
    backdrop.classList.remove('open');
    unlockScroll();
  }
  // 특정 화면에서 아이콘 스택 숨김(예: 마이페이지 로그인 뷰) — CFG.hideOn()이 true인 동안 비노출
  if (typeof CFG.hideOn === 'function') {
    var syncHide = function () {
      var h = false; try { h = !!CFG.hideOn(); } catch (e) {}
      stackEl.style.display = h ? 'none' : '';
      if (h && panel.classList.contains('open')) close();
    };
    syncHide();
    setInterval(syncHide, 600);
  }

  // KAKAO_AI_FIRST(2026-07-25 사용자 지시 "카톡으로 바로 들어오게 하지 말고 AI가 1차 해결 → 안 되면 그때 카톡"):
  //   다른 화면의 '문의하기'류 버튼이 카톡 URL로 직행하지 않고 이 위젯을 열도록 공개 API를 노출한다.
  //   ask(q)는 드로어를 열고 질문을 대신 보낸다 → AI가 답하고, 못 풀면 기존 에스컬레이션(showEscalation)이 카톡을 띄운다.
  //   ★window.MEAdvisor 제거 금지 — 없어지면 호출부가 카톡 직행으로 폴백한다.
  try {
    window.MEAdvisor = {
      open: open,
      close: close,
      ask: function (q) { open(); if (q) setTimeout(function () { try { send(String(q), false); } catch (e) {} }, 320); },
      available: true
    };
  } catch (e) {}

  fab.addEventListener('click', open);
  // 외부에서 상담 도우미 열기: window.meAdvOpen() 또는 [data-adv-open] 요소 클릭
  window.meAdvOpen = open;
  document.addEventListener('click', function (e) {
    var t = e.target.closest ? e.target.closest('[data-adv-open]') : null;
    if (t) { e.preventDefault(); open(); }
  });
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  // [ADV_ESC_ONLY] 상시 카톡 링크와 그 클릭 핸들러 제거. 인계는 showEscalation()이 첫 줄에서 doHandoff()로 처리한다.

  // ── 공유 FAB(옵션 · CFG.share.url) — 링크만 공유(모바일 네이티브 시트·PC 복사). 복사 시 아이콘이 1.6초 체크로 바뀜. ──
  var shareBtn = document.getElementById('meAdvShare');
  if (shareBtn) {
    var _shIco = shareBtn.querySelector('.me-fab-ico');
    var _shSvg = _shIco.innerHTML;
    function shareCopied() {
      _shIco.innerHTML = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12.5l4.2 4.2L19 7" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      setTimeout(function () { _shIco.innerHTML = _shSvg; }, 1600);
    }
    shareBtn.addEventListener('click', function () {
      var data = { url: SHARE.url };   // 글 없이 링크만 — 카톡 등에서 문구가 메시지로 같이 입력되지 않게(메인홈과 동일)
      if (navigator.share) { navigator.share(data).catch(function () {}); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(data.url).then(shareCopied).catch(function () {}); return; }
      try { var t = document.createElement('textarea'); t.value = data.url; document.body.appendChild(t); t.select(); document.execCommand('copy'); document.body.removeChild(t); shareCopied(); } catch (e) {}
    });
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panel.classList.contains('open')) close(); });

  input.addEventListener('input', function () {
    input.style.height = 'auto';
    input.style.height = Math.min(input.scrollHeight, 96) + 'px';
  });
  input.addEventListener('keydown', function (e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); form.requestSubmit(); }
  });
  form.addEventListener('submit', function (e) {
    e.preventDefault();
    var q = input.value.trim();
    if (!q || sending) return;
    input.value = ''; input.style.height = 'auto';
    send(q, false);
  });
})();
