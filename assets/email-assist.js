/* 이메일 도메인 어시스트 — @ 입력 시 국내 주요 도메인 리스트(치는 대로 필터·탭/Enter 완성) + 흔한 오타 교정 제안.
 * 적용: input[type=email] 전부 자동 + data-email-assist 지정 필드(로그인 겸용 칸 등). 동적 생성 필드도 focusin 위임으로 자동 부착.
 * 디자인: 골드 캡션·헤어라인·크림 호버(날짜 선택기와 같은 결). 패널은 fixed 배치라 어떤 폼 구조에도 안전(래핑 없음).
 * 디테일: 아래 공간 부족 시 위로(키보드 가림 방지) · 첫 항목 상시 하이라이트(Enter 예측 가능) · 5개 높이+스크롤 ·
 *         listbox aria · touchstart 즉시 선택(iOS blur 경합 방지) · reduced-motion 존중 · IME 조합 방어 ·
 *         완성/자동완성 주소는 리스트 미노출(이중 팝업 0).
 */
(function(){
  'use strict';
  var DOMAINS=['naver.com','gmail.com','daum.net','hanmail.net','nate.com','kakao.com','icloud.com'];   // 국내 사용률 순
  var TYPO={'gmial.com':'gmail.com','gamil.com':'gmail.com','gmali.com':'gmail.com','gmaill.com':'gmail.com','gmail.co':'gmail.com','gmail.net':'gmail.com',
    'navr.com':'naver.com','naver.co':'naver.com','nver.com':'naver.com','naber.com':'naver.com','navet.com':'naver.com',
    'hanmial.net':'hanmail.net','hanmail.com':'hanmail.net','hanmali.net':'hanmail.net','daum.com':'daum.net','duam.net':'daum.net',
    'nate.net':'nate.com','kakao.net':'kakao.com','icloud.co':'icloud.com','iclould.com':'icloud.com'};   // 흔한 오타 → 교정(운영하며 추가)

  var css='.me-ea-panel{position:fixed;background:#fff;border:1px solid var(--border,#DDD8D1);border-radius:8px;box-shadow:0 10px 32px rgba(40,28,16,.12);overflow:hidden;z-index:2147483000;display:none}'
    +'.me-ea-panel.open{display:block;animation:meEaIn .18s cubic-bezier(.16,1,.3,1)}'
    +'@keyframes meEaIn{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}'
    +'@media(prefers-reduced-motion:reduce){.me-ea-panel.open{animation:none}}'
    +'.me-ea-cap{font-family:var(--serif,\'Cormorant Garamond\',Georgia,serif);font-size:9.5px;letter-spacing:.18em;text-transform:uppercase;color:var(--gold,#B89A75);padding:10px 14px 6px}'
    +'.me-ea-list{max-height:218px;overflow-y:auto;-webkit-overflow-scrolling:touch}'
    +'.me-ea-item{display:flex;align-items:baseline;gap:2px;padding:11px 14px;font-family:var(--serif-ko,\'Noto Serif KR\',serif);font-size:14px;font-weight:400;line-height:1.5;cursor:pointer;border-top:1px solid rgba(28,27,25,.05)}'
    +'.me-ea-item:first-child{border-top:none}'
    +'.me-ea-item .u{color:var(--label-soft,#9a9182);font-weight:300;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:45%}'
    +'.me-ea-item .d{color:var(--accent,#3A2D22)}'
    +'.me-ea-item.on,.me-ea-item:hover{background:var(--bg2,#F5F3EF)}'
    +'.me-ea-item.on .d{color:var(--gold-deep,#9a7b3f);font-weight:500}'
    +'.me-ea-typo{font-family:var(--serif-ko,\'Noto Serif KR\',serif);font-size:11.5px;font-weight:400;color:var(--gold-deep,#9a7b3f);margin-top:6px;line-height:1.6;text-align:left}'
    +'.me-ea-typo b{cursor:pointer;font-weight:500;text-decoration:underline;text-underline-offset:2px}';
  var st=document.createElement('style'); st.textContent=css; document.head.appendChild(st);

  var panel=null, cur=null, idx=0, items=[];
  function getPanel(){ if(!panel){ panel=document.createElement('div'); panel.className='me-ea-panel'; document.body.appendChild(panel); } return panel; }
  function esc(s){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
  function close(){ if(!panel) return; panel.classList.remove('open'); panel.innerHTML=''; items=[]; if(cur) cur.setAttribute('aria-expanded','false'); cur=null; }
  function vpH(){ return (window.visualViewport&&window.visualViewport.height)||window.innerHeight; }
  function place(input){
    var r=input.getBoundingClientRect(), p=getPanel();
    p.style.left=r.left+'px'; p.style.width=r.width+'px';
    var below=vpH()-r.bottom;
    if(below<260){ p.style.top='auto'; p.style.bottom=(window.innerHeight-r.top+6)+'px'; }   // 위로(키보드 가림 방지)
    else { p.style.bottom='auto'; p.style.top=(r.bottom+6)+'px'; }
  }
  function pick(input, d){
    var at=input.value.indexOf('@');
    input.value=input.value.slice(0,at+1)+d;
    close(); checkTypo(input);
    try{ input.focus(); }catch(e){}
    try{ input.dispatchEvent(new Event('input',{bubbles:true})); }catch(e){}
  }
  function render(input){
    var v=input.value, at=v.indexOf('@');
    if(at<0 || !v.slice(0,at).trim()){ close(); return; }
    var typed=v.slice(at+1).toLowerCase();
    var list=DOMAINS.filter(function(d){ return d.indexOf(typed)===0 && d!==typed; });
    if(!list.length){ close(); return; }
    if(idx>list.length-1) idx=0;
    var user=v.slice(0,at), p=getPanel();
    p.innerHTML='<div class="me-ea-cap">Select Address</div><div class="me-ea-list" role="listbox">'+list.map(function(d,i){
      return '<div class="me-ea-item'+(i===idx?' on':'')+'" role="option" aria-selected="'+(i===idx)+'" data-d="'+d+'"><span class="u">'+esc(user)+'@</span><span class="d">'+d+'</span></div>';
    }).join('')+'</div>';
    place(input);
    p.classList.add('open');
    cur=input; input.setAttribute('aria-expanded','true');
    items=[].slice.call(p.querySelectorAll('.me-ea-item'));
    items.forEach(function(el){
      ['mousedown','touchstart'].forEach(function(ev){ el.addEventListener(ev, function(e){ e.preventDefault(); pick(input, el.getAttribute('data-d')); }, {passive:false}); });   // blur 경합 방지 · 즉시 선택
    });
  }
  function checkTypo(input){
    var v=input.value, at=v.indexOf('@');
    var dom=at>=0?v.slice(at+1).toLowerCase().trim():'';
    var fix=TYPO[dom];
    var host=input.closest('.field')||input.parentNode;
    var hint=host?host.querySelector('.me-ea-typo'):null;
    if(!fix){ if(hint) hint.style.display='none'; return; }
    if(!hint){ hint=document.createElement('div'); hint.className='me-ea-typo'; host.appendChild(hint); }
    hint.innerHTML='혹시 <b>@'+esc(fix)+'</b> 아닐까요? 누르면 바꿔드려요.';
    hint.style.display='block';
    hint.querySelector('b').addEventListener('click', function(){
      var a=input.value.indexOf('@');
      if(a>=0){ input.value=input.value.slice(0,a+1)+fix; try{ input.dispatchEvent(new Event('input',{bubbles:true})); }catch(e){} }
      hint.style.display='none';
    });
  }
  function attach(input){
    if(input.__meEA) return; input.__meEA=1;
    var composing=false;
    input.setAttribute('aria-autocomplete','list'); input.setAttribute('aria-expanded','false');
    input.addEventListener('compositionstart', function(){ composing=true; });
    input.addEventListener('compositionend', function(){ composing=false; idx=0; render(input); });
    input.addEventListener('input', function(){ if(composing) return; idx=0; render(input); var h=(input.closest('.field')||input.parentNode); var t=h&&h.querySelector('.me-ea-typo'); if(t&&t.style.display!=='none') checkTypo(input); });
    input.addEventListener('blur', function(){ setTimeout(function(){ if(cur===input) close(); }, 150); checkTypo(input); });
    input.addEventListener('keydown', function(e){
      if(!panel || !panel.classList.contains('open') || cur!==input) return;
      if(e.key==='ArrowDown'){ e.preventDefault(); idx=Math.min(idx+1, items.length-1); render(input); }
      else if(e.key==='ArrowUp'){ e.preventDefault(); idx=Math.max(idx-1, 0); render(input); }
      else if(e.key==='Enter'){ if(items[idx]){ e.preventDefault(); pick(input, items[idx].getAttribute('data-d')); } }
      else if(e.key==='Escape'){ close(); }
    });
  }
  // 자동 부착 — 정적·동적(계약서 요청 폼 등) 모두 첫 포커스에 lazy attach
  document.addEventListener('focusin', function(e){
    var t=e.target;
    if(!t || t.tagName!=='INPUT') return;
    if(t.type==='email' || t.hasAttribute('data-email-assist')){ attach(t); render(t); }
  });
  // 열려 있는 동안 스크롤·리사이즈 → 위치 추적
  ['scroll','resize'].forEach(function(ev){ window.addEventListener(ev, function(){ if(panel&&panel.classList.contains('open')&&cur) place(cur); }, {passive:true}); });
  if(window.visualViewport) window.visualViewport.addEventListener('resize', function(){ if(panel&&panel.classList.contains('open')&&cur) place(cur); });
})();
