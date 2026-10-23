/* ★★[BGM_INFO_1023 2026-10-23 사장님 «BGM 까지는 ‹우리가 고른 곡›으로 안 해도 될 것 같아» · «입장곡은 지금 세팅처럼 직접 할 수 있게» · «최선인지 한 번 더 검토해 보고 제안대로 구현»]
   식순 화면(order-preview.html) ② 순간 쪽 «음악» 줄 · ④ 한눈에 보기 «음악» 묶음 — 무엇을 말하나 · 고를 수 있나는 assets/bgm-slots.js 한 곳.
   · 자리 = 고르기 칸 맨 아래(입장 음악 줄 EntryMusic.rowHtml 과 같은 자리 · 같은 틀: 이름표 «음악» + 칸) · 새 섹션 · 머리글 · 색 · 아이콘을 만들지 않는다.
   · 고를 것이 없는 칸은 한 줄(맞절 «입장 곡이 이어져요»와 같은 꼴) — 카드 · 꺾쇠 · 칩 · 펼치기 없음.
   · 축사 · 편지만 칩 둘(«음악 없이» · «음악과 함께» · 기본이 먼저) — 같은 쪽의 다른 칩 줄과 똑같이 바로 보인다(접기 없음) ·
     처음엔 안 눌린 모양(BOSS_WAY 1) · 아래 한 줄(12.5px)이 지금 상태를 말한다 · «음악과 함께»만 S.bgm 에 적힌다(엔진이 낭독 아래 −20 으로 깐다 · ritual-cue duckRead).
   ★★[BGM_R1_1023 2026-10-23 BGM 섹션 라운드 1 «안내는 ‹흐름›으로 · 고르기에는 고를 것만»] 고를 것이 없는 음악 한 줄은 «고르기»에서 빠지고 «흐름»의 채운 점 줄 하나(flowRow · 빌더 _mkFlow 가 그 자리에 끼운다) ·
     «고르기»에는 축사 · 편지 칩 줄만(이름표 «축사 음악 · 편지 음악» · 입장은 entry-music.js «입장 음악») · ④ 입장 곡을 안 골랐으면 «고르지 않으시면 스튜디오가 준비해요» + «이동하기»(미완료 셈에 안 넣는다).
   ★음악 칸의 «우리가 고른 곡»(칩 · 곡 파일 올리기 · 곡 카드 · 짧은 곡 안내 · 이 기기 보관 me-bgm-song · «보낼 것» 음악 줄 · 남은 할 일 셈) ·
     접는 카드(.bgm-sum · 꺾쇠) · 부모님께 인사 음악 칩 · 테이블 인사 «마지막 곡만 고르기» 금지 — 2026-10-23 사장님 지시로 삭제 [BGM_INFO_1023] */
(function(){
  'use strict';
  if(window.BgmForm) return;
  var D=document, B=window.BgmSlots;
  if(!B) return;
  /* «음악 없이»는 기본과 같아 적지 않는다 — 이 탭에서 누른 칩은 여기서만 눌린 모양으로 둔다(다시 열면 안 눌린 모양 · 아래 한 줄이 상태를 말한다) */
  var TOUCH={};
  /* 옛 «우리가 고른 곡» 이 기기 보관함을 비운다(곡 파일이 남지 않게) — 없으면 아무 일도 없다 */
  try{ if(window.indexedDB) indexedDB.deleteDatabase('me-bgm-song'); }catch(x){}

  function e(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function St(){ return window.S||{}; }
  function RO(){ return window.RitualOpen||null; }
  function save(){ try{ if(typeof _persist==='function') _persist(); }catch(x){} }
  function off(k){ try{ return typeof _mkOff==='function'&&_mkOff(k); }catch(x){ return false; } }
  function chipT(t){ try{ if(typeof _chipT==='function') return _chipT(t); }catch(x){} return '<span class="cg-t" data-t="'+e(t)+'">'+e(t)+'</span>'; }
  function onOf(k){ if(k==='guest'||k==='_close') return true; var R=RO(); try{ return !!(R&&R.onOf(St(),k))&&!off(k); }catch(x){ return false; } }
  function opt(){ var R=RO(), S=St(), sq=[]; try{ sq=R?R.bodySeq(S):[]; }catch(x){}
    var fk=''; try{ fk=(R&&R.FREE_KIND&&R.FREE_KIND[S.freeWhat||'speech'])||''; }catch(x){}
    return {onOf:onOf, seq:sq, freeKind:fk, nameOf:function(k){ try{ return R?R.nameOf(k,St()):k; }catch(x){ return k; } }}; }

  /* ── ② 순간 쪽 «고르기» 칸 음악 줄 — 축사 · 편지만(이름표 «축사 음악 · 편지 음악» [BGM_R1_1023]) ── */
  function rowHtml(k){ var v=B.viewOf(k,opt()); if(!v||v.kind!=='pick') return '';
    var gl=(v.s.short||'')+' 음악';
    var h='<div class="ls-cg ls-bgm" role="radiogroup" aria-label="'+e(gl)+'" data-k="'+e(k)+'" data-slot="'+v.s.id+'"><span class="gl" aria-hidden="true">'+e(gl)+'</span>';
    var s=v.s, g=B.get(St(),s.id), pr=g.set?g.m:(TOUCH[s.id]||'');
    return h+'<span class="cg-c">'+s.picks.map(function(p,i){ var on=pr===p;
        return '<button type="button" class="op-chip" role="radio" aria-checked="'+on+'" tabindex="'+((on||(!pr&&i===0))?0:-1)+'" data-fk="bgm:'+s.id+':'+p+'" onclick="bgmAct(\'pick\',\''+s.id+'\',\''+p+'\')">'+chipT(B.label(s,p))+'</button>'; }).join('')
      +'<span class="bgm-note">'+e(pr?B.lineOf(s,g.m):(B.lineOf(s,'unset')||B.lineOf(s,g.m)))+'</span></span></div>'; }   /* [BGM_R4_1023] 아직 안 눌렀으면 «고르지 않으시면 …»(기본을 말한다 · 칩은 안 눌린 모양 그대로) */

  /* ── ② 순간 쪽 «흐름» 음악 줄 [BGM_R1_1023] — 고를 것이 없는 안내 한 줄 · 채운 점 줄(li.q[data-bgm] · 입장 «음악에 맞춰 걸어 들어와요»와 같은 꼴) ·
     st = 빌더 엔진 줄(_lSteps) · at = «이 번호 줄 앞에»(0 맨 앞 · st.length 맨 뒤) · ▶ 가 없어 줄 수 · 듣기 차례에 끼지 않는다 ── */
  function flowRow(k,st){ var v=B.viewOf(k,opt()); if(!v||v.kind!=='flow') return null;
    var f=B.flowFind?B.flowFind(v.at,st||[]):{ i:B.flowAt(v.at,st||[]), hit:true };   /* [BGM_R3_1023] hit = 큐 열쇠로 자리를 찾았나(못 찾으면 맨 앞 · 검사가 빨강) */
    return { at:f.i, hit:f.hit, by:v.at, html:'<li class="q" data-bgm="'+e(v.s?v.s.id:k)+'"><span class="qa">'+e(v.t)+'</span></li>' }; }   /* 행동 줄과 같은 class(q) — 음악 줄 표시는 data-bgm 하나(흐름선 · 점 · 글 검사가 같은 줄로 잰다) */

  /* 이 칸만 다시 — 빌더 render() 는 흐르던 소리를 끈다 · 줄 하나만 바꾸고 칩 칸 맞춤(_cgEven)은 쪽 전체로(입장 음악 MU_REDRAW_EVEN_1019 와 같다) */
  function redraw(id,fx){ var row=D.querySelector('.ls-bgm[data-slot="'+id+'"]');
    if(!row){ try{ if(typeof render==='function') render(); }catch(x){} return; }
    var t=D.createElement('div'); t.innerHTML=rowHtml(row.getAttribute('data-k')); var nw=t.firstChild; if(!nw) return; row.parentNode.replaceChild(nw,row);
    try{ if(typeof _cgEven==='function') _cgEven(); }catch(x){}
    if(fx){ var f=D.querySelector(fx); if(f) try{ f.focus({preventScroll:true}); }catch(x){} } }

  /* 누름 — 축사 · 편지 칩만 · 'bed' 만 적는다(«음악 없이» = 지운다) */
  function act(kind,id,v){ var s=B.slot(id); if(kind!=='pick'||!s||s.picks.indexOf(v)<0) return;
    var S=St(), g=B.get(S,id), pr=g.set?g.m:(TOUCH[id]||''); if(pr===v) return;   /* 이미 고른 칩은 그대로(CHIP_NO_REPLAY 와 같다) */
    TOUCH[id]=v;
    if(v==='bed'){ S.bgm=B.clean(S.bgm)||{}; S.bgm[id]={m:'bed'}; }
    else { var c=B.clean(S.bgm); if(c) delete c[id]; S.bgm=B.clean(c); if(!S.bgm) delete S.bgm; }
    save(); redraw(id,'[data-fk="bgm:'+id+':'+v+'"]'); }

  /* ── ④ 한눈에 보기 «음악» 묶음 — 두 줄 ──
     첫 줄 = 입장 곡(두 분이 고르거나 올렸으면 곡 이름 · 아니면 «고르지 않으시면 스튜디오가 준비해요» + «이동하기»(입장 쪽 · 미완료 셈에는 안 넣는다 [BGM_R1_1023])) ·
     그다음 담긴 축사 · 편지마다 «축사 · 음악 없이 / 음악과 함께» · 끝 줄 «그 밖의 음악은 스튜디오가 준비해요» [BGM_R4_1023] */
  function entryNow(){ var mu=St().mu||{}, t=String(mu.t||mu.name||'');
    if(mu.src==='up'||mu.src==='rec') return t?'‹'+t+'›':(mu.src==='up'?'두 분이 고른 곡':'추천 곡');
    return ''; }   /* 입장 곡을 안 골랐으면 당일 콘솔이 배경음으로 연다(console muPill «입장 음악 없음 · 배경음으로») */
  /* ★[BGM_R4_1023] 담긴 축사 · 편지마다 지금 상태 한 줄(«축사 · 음악 없이» · «축사 · 음악과 함께») — 종전 «축사는 음악과 함께 · 나머지는 …»는 편지가 무음인지 스튜디오가 정하는지 말하지 않았다 */
  function pickRows(){ var o=opt(), out=[];
    B.SLOTS.forEach(function(s){ if(s.picks.indexOf('bed')<0) return; var at=B.chooser(s,o); if(!at) return; var v=B.viewOf(at,o); if(!v||v.kind!=='pick') return;
      out.push({ id:s.id, t:s.short+' · '+B.label(s,B.get(St(),s.id).m) }); });
    return out; }
  function sumHtml(){ var pk=pickRows();
    var en=entryNow(), one=en?'입장 곡 · '+en:'입장 곡 · 고르지 않으시면 스튜디오가 준비해요';
    return '<section class="mk-sec mk-bgm"><h4>음악</h4><ul class="mk-vlist">'
      +'<li class="mk-vr bgm-sl"><span class="mk-vt"><span class="mk-vn">'+e(one)+'</span></span>'+(en?'':'<button type="button" class="rowbtn mk-vb" data-fk="bgmgo:entry" onclick="mkGo(\'entry\')">이동하기</button>')+'</li>'
      +pk.map(function(r){ return '<li class="mk-vr bgm-pk" data-slot="'+r.id+'"><span class="mk-vt"><span class="mk-vn">'+e(r.t)+'</span></span></li>'; }).join('')
      +'<li class="mk-vr bgm-rest"><span class="mk-vt"><span class="mk-vn">그 밖의 음악은 스튜디오가 준비해요</span></span></li></ul></section>'; }   /* [BGM_R1_1023] 다른 묶음(부탁 · 보낼 것)과 같은 줄 꼴 · 이동하기는 안 골랐을 때만 · [BGM_R4_1023] 축사 · 편지 줄은 버튼 없음 · 둘 다 없는 날은 끝 줄만 */   /* [BGM_R1_1023] 다른 묶음(부탁 · 보낼 것)과 같은 줄 꼴 · 이동하기는 안 골랐을 때만 */

  window.bgmAct=act;
  window.BgmForm={ rowHtml:rowHtml, flowRow:flowRow, sumHtml:sumHtml, _t:{ touch:TOUCH } };   /* _t = 점검용 */
})();
