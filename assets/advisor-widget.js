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
  var ESC = (KB && KB.escalation) || { kakaoUrl: 'https://pf.kakao.com/_momentedit', hours: '평일 10시 - 18시' };
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
    + '.me-adv-backdrop{position:fixed;inset:0;z-index:148;background:rgba(28,27,25,0.34);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px);opacity:0;visibility:hidden;transition:opacity .42s,visibility .42s}'
    + '.me-adv-backdrop.open{opacity:1;visibility:visible}'
    + '.me-adv-panel{position:fixed;top:0;right:0;bottom:0;z-index:150;width:452px;max-width:100vw;height:100vh;height:100dvh;background:var(--bg,#FAFAF8);border-left:1px solid var(--border,#DDD8D1);box-shadow:-26px 0 72px rgba(28,27,25,0.20);display:flex;flex-direction:column;overflow:hidden;transform:translateX(102%);transition:transform .46s cubic-bezier(0.16,1,0.3,1);will-change:transform}'
    + '.me-adv-panel.open{transform:translateX(0)}'
    + '@media(max-width:680px){.me-adv-panel{width:100vw;border-left:none}.me-adv-input{font-size:16px}}'
    + '.me-adv-head{flex:0 0 auto;display:flex;align-items:center;justify-content:space-between;padding:22px 22px 19px;background:var(--bg,#FAFAF8);border-bottom:1px solid var(--hairline,rgba(28,27,25,0.18))}'
    + '.me-adv-head-t{display:flex;align-items:center;gap:13px}'
    + '.me-adv-seal{width:42px;height:42px;border-radius:50%;background:#fff;color:var(--seal,#6B2A24);border:1px solid rgba(107,42,36,0.28);display:flex;align-items:center;justify-content:center;font-family:var(--serif,Georgia,serif);font-size:15px;font-weight:500;letter-spacing:0.04em;flex:0 0 auto;box-shadow:0 2px 9px rgba(28,27,25,0.06)}'
    + '.me-adv-titles{display:flex;flex-direction:column;line-height:1.1}'
    + '.me-adv-eyebrow{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:10px;letter-spacing:0.16em;text-transform:uppercase;color:var(--gold,#B89A75);margin-bottom:4px}'
    + '.me-adv-title{font-family:var(--serif-ko,serif);font-size:19px;font-weight:500;color:var(--accent,#3A2D22);letter-spacing:0.01em;line-height:1.15}'
    + '.me-adv-close{background:none;border:none;cursor:pointer;color:var(--light,#75705F);padding:6px;line-height:0;border-radius:6px;transition:color .25s,background .25s}'
    + '.me-adv-close:hover{color:var(--accent,#3A2D22);background:rgba(28,27,25,0.05)}'
    + '.me-adv-close svg{width:18px;height:18px}'
    + '.me-adv-body{flex:1 1 auto;overflow-y:auto;overscroll-behavior:contain;padding:24px 22px 12px;display:flex;flex-direction:column;gap:14px;-webkit-overflow-scrolling:touch}'
    + '.me-adv-msg{max-width:90%;font-size:14px;line-height:1.75;white-space:pre-wrap;word-break:keep-all;border-radius:15px;padding:12px 16px;font-family:var(--sans,sans-serif)}'
    + '.me-adv-msg.bot{align-self:flex-start;background:var(--bg2,#F5F3EF);color:var(--accent,#3A2D22);border-bottom-left-radius:4px}'
    + '.me-adv-msg.me{align-self:flex-end;background:var(--seal,#6B2A24);color:#fff;border-bottom-right-radius:4px}'
    + '.me-adv-typing{align-self:flex-start;display:inline-flex;gap:4px;padding:13px 15px;background:var(--bg2,#F5F3EF);border-radius:13px;border-bottom-left-radius:4px}'
    + '.me-adv-typing i{width:6px;height:6px;border-radius:50%;background:var(--gold,#B89A75);opacity:.5;animation:meAdvBlink 1.2s infinite}'
    + '.me-adv-typing i:nth-child(2){animation-delay:.2s}.me-adv-typing i:nth-child(3){animation-delay:.4s}'
    + '@keyframes meAdvBlink{0%,60%,100%{opacity:.3;transform:translateY(0)}30%{opacity:1;transform:translateY(-3px)}}'
    + '.me-adv-chips{display:flex;flex-direction:column;gap:0;margin-top:8px}'
    + '.me-adv-chips-label{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:11.5px;letter-spacing:0.08em;color:var(--gold,#B89A75);text-transform:uppercase;margin:6px 0 -2px}'
    + '.me-adv-chip{display:flex;align-items:center;justify-content:space-between;gap:10px;width:100%;text-align:left;font-family:var(--serif-ko,serif);font-size:15px;font-weight:400;color:var(--accent,#3A2D22);background:none;border:none;border-bottom:1px solid var(--hairline,rgba(28,27,25,0.18));border-radius:0;padding:15px 2px;cursor:pointer;transition:color .22s,padding-left .22s;line-height:1.45;word-break:keep-all}'
    + '.me-adv-chip:last-child{border-bottom:none}'
    + '.me-adv-chip:hover{color:var(--gold,#B89A75);padding-left:8px}'
    + '.me-adv-escoffer{align-self:flex-start;font-family:var(--serif-ko,serif);font-size:12.5px;color:var(--seal,#6B2A24);background:none;border:1px solid rgba(107,42,36,0.35);border-radius:30px;padding:9px 16px;cursor:pointer;transition:background .25s,border-color .25s;line-height:1.4}'
    + '.me-adv-escoffer:hover{background:rgba(107,42,36,0.05);border-color:var(--seal,#6B2A24)}'
    + '.me-adv-esc{align-self:stretch;background:#fff;border:1px solid rgba(184,154,117,0.45);border-radius:12px;padding:14px 15px;margin-top:2px}'
    + '.me-adv-esc-t{font-family:var(--serif-ko,serif);font-size:13px;color:var(--accent,#3A2D22);line-height:1.6;margin-bottom:11px}'
    + '.me-adv-esc-btns{display:flex;flex-direction:column;gap:8px}'
    + '.me-adv-esc-btn{display:flex;align-items:center;justify-content:center;gap:8px;text-decoration:none;text-align:center;font-family:var(--sans,sans-serif);font-size:13px;padding:11px 14px;border-radius:8px;transition:opacity .25s,transform .25s}'
    + '.me-adv-esc-btn.kakao{background:#FEE500;color:#181600;font-weight:500}'
    + '.me-adv-esc-btn.kakao:hover{opacity:.9;transform:translateY(-1px)}'
    + '.me-adv-esc-btn.mail{background:var(--bg2,#F5F3EF);color:var(--accent,#3A2D22);border:1px solid var(--border,#DDD8D1)}'
    + '.me-adv-esc-btn.mail:hover{opacity:.9;transform:translateY(-1px)}'
    + '.me-adv-esc-hours{font-family:var(--serif,Georgia,serif);font-style:italic;font-size:10.5px;color:var(--light,#75705F);text-align:center;margin-top:9px;letter-spacing:0.04em}'
    + '.me-adv-foot{flex:0 0 auto;border-top:1px solid var(--border,#DDD8D1);padding:14px 16px;background:var(--bg,#FAFAF8)}'
    + '.me-adv-foot-kakao{display:block;text-align:center;margin-top:11px;font-family:var(--serif-ko,serif);font-size:11.5px;letter-spacing:0.03em;color:var(--light,#75705F);text-decoration:none;transition:color .25s}'
    + '.me-adv-foot-kakao u{text-decoration:underline;text-decoration-color:rgba(117,112,95,0.45);text-underline-offset:3px}'
    + '.me-adv-foot-kakao:hover{color:var(--seal,#6B2A24)}'
    + '.me-adv-foot-kakao:hover u{text-decoration-color:rgba(107,42,36,0.5)}'
    + '.me-adv-form{display:flex;align-items:flex-end;gap:8px}'
    + '.me-adv-input{flex:1 1 auto;resize:none;border:1px solid var(--border,#DDD8D1);border-radius:12px;padding:12px 14px;font-family:var(--sans,sans-serif);font-size:14px;color:var(--text,#1C1B19);background:#fff;line-height:1.5;max-height:96px;outline:none;transition:border-color .25s}'
    + '.me-adv-input:focus{border-color:var(--gold,#B89A75)}'
    + '.me-adv-send{flex:0 0 auto;width:44px;height:44px;border:none;border-radius:50%;background:var(--seal,#6B2A24);color:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:opacity .25s,transform .25s}'
    + '.me-adv-send:hover{opacity:.88;transform:translateY(-1px)}'
    + '.me-adv-send:disabled{opacity:.4;cursor:default;transform:none}'
    + '.me-adv-send svg{width:17px;height:17px}';
  var st = document.createElement('style'); st.textContent = css; document.head.appendChild(st);

  var SHARE = (CFG.share && CFG.share.url) ? CFG.share : null;
  var BOOK = (CFG.booking && CFG.booking.url) ? CFG.booking.url : null;
  var SEQ = CFG.sequence ? ((CFG.sequence === 'trim' || (CFG.sequence && CFG.sequence.mode === 'trim')) ? 'trim' : 'full') : null;   // 진행 시간표 FAB — sequence-modal.js가 [data-seq-open] 클릭을 받아 모달을 엶
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
    + '  <button class="me-fab" id="meAdvFab" aria-label="상담 도우미 열기" type="button">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M21 11.5a8.5 8.5 0 0 1-12.2 7.6L3 21l1.9-5.8A8.5 8.5 0 1 1 21 11.5Z" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/></svg></span>'
    + '  </button>'
    + (SHARE ? (''
    + '  <button class="me-fab" id="meAdvShare" aria-label="페이지 공유하기" type="button">'
    + '    <span class="me-fab-ico"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M12 3.5v10.5M12 3.5 8.5 7M12 3.5 15.5 7" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11H5.4A1.4 1.4 0 0 0 4 12.4v6.2A1.4 1.4 0 0 0 5.4 20h13.2a1.4 1.4 0 0 0 1.4-1.4v-6.2A1.4 1.4 0 0 0 18.6 11H17" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg></span>'
    + '  </button>') : '')
    + '</div>'
    + '<div class="me-adv-backdrop" id="meAdvBackdrop"></div>'
    + '<section class="me-adv-panel" id="meAdvPanel" role="dialog" aria-label="모먼트에디트 상담 도우미" aria-modal="true">'
    + '  <header class="me-adv-head">'
    + '    <div class="me-adv-head-t">'
    + '      <span class="me-adv-seal">ME</span>'
    + '      <span class="me-adv-titles"><span class="me-adv-eyebrow">AI Wedding Concierge</span><span class="me-adv-title">상담 도우미</span></span>'
    + '    </div>'
    + '    <button class="me-adv-close" id="meAdvClose" aria-label="닫기" type="button"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg></button>'
    + '  </header>'
    + '  <div class="me-adv-body" id="meAdvBody"></div>'
    + '  <footer class="me-adv-foot">'
    + '    <form class="me-adv-form" id="meAdvForm">'
    + '      <textarea class="me-adv-input" id="meAdvInput" rows="1" placeholder="궁금한 점을 적어주세요" aria-label="질문 입력"></textarea>'
    + '      <button type="submit" class="me-adv-send" id="meAdvSend" aria-label="전송"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M4 12l16-8-6 16-3-7-7-1Z" stroke="#fff" stroke-width="1.5" stroke-linejoin="round"/></svg></button>'
    + '    </form>'
    + '    <a class="me-adv-foot-kakao" id="meAdvKakao" href="#" rel="noopener">해결이 안 되면 <u>카카오톡 문의</u></a>'
    + '  </footer>'
    + '</section>';
  document.body.appendChild(wrap);

  var fab = document.getElementById('meAdvFab'), stackEl = document.getElementById('meAdvStack'),
      panel = document.getElementById('meAdvPanel'), backdrop = document.getElementById('meAdvBackdrop'),
      closeBtn = document.getElementById('meAdvClose'), body = document.getElementById('meAdvBody'),
      form = document.getElementById('meAdvForm'), input = document.getElementById('meAdvInput'),
      sendBtn = document.getElementById('meAdvSend'), kakaoA = document.getElementById('meAdvKakao');

  var started = false, sending = false, escShown = false, handoffSent = false;
  var transcript = [];
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
  function refreshKakaoLink() {
    var k = kakaoInfo();
    kakaoA.href = k.href;
    kakaoA.innerHTML = k.mail ? '해결이 안 되면 <u>이메일 문의</u>' : '해결이 안 되면 <u>카카오톡 문의</u>';
    if (k.mail) kakaoA.removeAttribute('target'); else kakaoA.setAttribute('target', '_blank');
  }

  // ── 에스컬레이션: 자동으로 들이밀지 않고 버튼으로 · 누르면 관리자 인계 + 카카오 안내 ──
  function offerEscalation() {
    if (escShown || body.querySelector('.me-adv-escoffer')) return;
    var b = document.createElement('button');
    b.type = 'button'; b.className = 'me-adv-escoffer';
    b.textContent = '더 정확한 답이 필요하신가요? 디렉터에게 연결하기';
    b.addEventListener('click', function () { b.remove(); showEscalation(); });
    place(b); scrollDown();
  }
  function doHandoff() {
    if (handoffSent || transcript.length === 0) return; handoffSent = true;
    var payload = { messages: transcript.slice(-16), page: PAGE };
    try { var c = (typeof CFG.customer === 'function') ? CFG.customer() : null; if (c) payload.customer = c; } catch (e) {}
    try {
      fetch('/api/handoff', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(payload) }).catch(function () {});
    } catch (e) {}
  }
  function showEscalation() {
    if (escShown) return; escShown = true;
    doHandoff();
    var ki = kakaoInfo();
    var box = document.createElement('div'); box.className = 'me-adv-esc';
    var t = document.createElement('div'); t.className = 'me-adv-esc-t';
    t.textContent = ki.mail
      ? '디렉터에게 바로 전달했어요. 이메일로 이어서 문의하실 수 있어요.'
      : '디렉터에게 바로 전달했어요. 카카오톡으로 이어서 상담하실 수 있어요.';
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
    fetch('/api/advisor', { method: 'POST', headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ messages: transcript.slice(-14), page: PAGE }) })
      .then(function (r) { return r.json().then(function (j) { return { ok: r.ok, status: r.status, j: j }; }); })
      .then(function (res) {
        typing.remove();
        var j = res.j || {};
        if (res.ok && j.reply) {
          addMsg(j.reply, 'bot');
          transcript.push({ role: 'assistant', content: j.reply });
          if (j.escalate) offerEscalation();
        } else {
          try { console.warn('advisor fallback', (res.status || '?'), (j && j.error) || ''); } catch (e) {}
          addMsg('지금은 자동 답변을 불러오지 못했어요. 디렉터가 직접 안내해 드릴게요.', 'bot');
          showEscalation();
        }
      })
      .catch(function () {
        typing.remove();
        addMsg('연결이 잠시 불안정합니다. 디렉터가 직접 안내해 드릴게요.', 'bot');
        showEscalation();
      })
      .then(function () { sending = false; sendBtn.disabled = false; });
  }

  function renderChips() {
    var chips = Array.isArray(CFG.chips) ? CFG.chips : [];
    if (!chips.length) return;
    var lab = document.createElement('div'); lab.className = 'me-adv-chips-label'; lab.textContent = 'Quick Questions';
    place(lab);
    var box = document.createElement('div'); box.className = 'me-adv-chips';
    chips.forEach(function (c) {
      var b = document.createElement('button');
      b.type = 'button'; b.className = 'me-adv-chip'; b.textContent = c.label;
      b.addEventListener('click', function () { send(c.label, !!c.sched); });
      box.appendChild(b);
    });
    place(box); scrollDown();
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
    refreshKakaoLink();
    if (!started) {
      started = true;
      addMsg(CFG.greeting || '안녕하세요, 모먼트에디트 상담 도우미예요. 궁금하신 점을 무엇이든 물어보세요.', 'bot');
      renderChips();
    }
    setTimeout(function () { if (window.innerWidth > 680) input.focus(); }, 480);
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

  fab.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  backdrop.addEventListener('click', close);
  refreshKakaoLink();
  // 카톡으로 넘어갈 때도 디렉터에게 대화 인계(있을 때만) — 고객이 같은 말을 두 번 안 하게.
  kakaoA.addEventListener('click', function () { refreshKakaoLink(); doHandoff(); });

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
