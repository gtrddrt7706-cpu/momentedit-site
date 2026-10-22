/* ★★[BGM_FORM_1023 2026-10-23 사장님 «홈페이지 식순부분에 알맞게 디자이너 관점으로 적절하게 bgm 도 구현» · «노래는 나중에 따로 검토하고 우선 폼형태부분만»]
   식순 화면(order-preview.html) ② 순간 쪽 «음악» 줄 · ④ 한눈에 보기 «음악» 묶음 · «보낼 것» 한 줄 — 무엇을 고를 수 있나는 assets/bgm-slots.js 한 곳.
   · 자리 = 고르기 칸 맨 아래(입장 음악 줄 EntryMusic.rowHtml 과 같은 자리 · 같은 틀: 이름표 «음악» + 칸) · 새 섹션 · 머리글 · 색 · 아이콘을 만들지 않는다.
   · 접힌 기본값 = 한 줄(성격 한 줄 + 지금 고른 것) · 누르면 칩 줄이 열린다(여백이 고급감 · 순간 쪽이 무거워지지 않게).
   · 칩은 처음엔 안 눌린 모양(BOSS_WAY 1) — 손대지 않은 칸은 S.bgm 에 적지 않고 'studio' 로 읽는다 · 지금 고른 것 줄이 «곡은 스튜디오가 골라 둘게요»라고 정직하게 말한다.
   · 우리가 고른 곡 = 입장 음악 올리기 흐름(파일 받기 · 이 기기 보관 · 곡 이름 · 가수 · 길이 읽기) — 이름 · 길이 표시 + 필요한 길이보다 짧으면 한 줄까지.
     크게 올라오는 자리 · 장면 그래프는 입장만의 기능이라 하지 않는다. 스튜디오로 보내기 · 당일 콘솔 재생은 다음 단계(GAS 자리 · 큐).
   · 이어지는 순간(S4 의 서약 ~ 덕담)은 «앞 순서 곡이 이어져요 · 바꾸려면 ‹고르는 순간›에서» 한 줄 · 음악 칸이 없는 순간(식전 영상 · 맞절 · 옛 «영상» 축사)은 한 줄만. */
(function(){
  'use strict';
  if(window.BgmForm) return;
  var D=document, B=window.BgmSlots;
  if(!B) return;
  var OPEN={}, BUSY={}, TARGET='', MAXB=200*1024*1024, MIN_D=10;   /* 파일 한도 200MB(재생목록 30분 · 이 기기 보관만) · 10초 아래는 잘못 고른 파일로 본다 */

  function e(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function St(){ return window.S||{}; }
  function RO(){ return window.RitualOpen||null; }
  function toast(m){ try{ if(typeof _noteToast==='function') _noteToast(m); }catch(x){} }
  function save(){ try{ if(typeof _persist==='function') _persist(); }catch(x){} }
  function nm(k){ try{ if(typeof _mkName==='function') return _mkName(k); }catch(x){} return k; }
  function off(k){ try{ return typeof _mkOff==='function'&&_mkOff(k); }catch(x){ return false; } }
  function chipT(t){ try{ if(typeof _chipT==='function') return _chipT(t); }catch(x){} return '<span class="cg-t" data-t="'+e(t)+'">'+e(t)+'</span>'; }
  function plus(){ try{ return typeof ICO_PLUS==='string'?ICO_PLUS:''; }catch(x){ return ''; } }
  function onOf(k){ if(k==='guest'||k==='_close') return true; var R=RO(); try{ return !!(R&&R.onOf(St(),k))&&!off(k); }catch(x){ return false; } }
  function opt(){ var R=RO(), S=St(), sq=[]; try{ sq=R?R.bodySeq(S):[]; }catch(x){}
    var fv=false; try{ fv=!!(R&&R.FREE_KIND&&R.FREE_KIND[S.freeWhat]==='video'); }catch(x){}
    return {onOf:onOf, seq:sq, freeVideo:fv}; }

  /* [BGM_LINES_TRUE 2026-10-23 BGM 섹션 검토 1] 접힌 칸 두 줄은 원천 한 곳(B.lines) — 한 줄 = 늘 참인 역할(«음악 없이»면 바뀐다) · 둘째 줄 = 고른 것(스튜디오 곡이면 곡 성격) ·
     펴 있으면 곡 이름 대신 «우리가 고른 곡»(아래 카드가 이름을 말한다 · 한 화면에 두 번 보이지 않게) */
  function lines(s,g){ return B.lines(s,g,!!OPEN[s.id]); }
  /* 올리기 전 한 줄 — 필요한 길이 */
  function needLine(s){ if(s.last) return '재즈 연주는 스튜디오가 골라 둘게요';   /* «마지막 곡 · 파일을 올려 주세요»는 위 줄이 이미 말한다 */
    /* [BGM_NEED_LIST 2026-10-23 BGM 섹션 검토 2] 재생목록 칸(S1)은 «… 재생목록이면 좋아요» — «재생목록 곡이면»은 어색하다 */
    return s.need?s.need.txt+(/재생목록$/.test(s.need.txt)?'이면':' 곡이면')+' 좋아요'+(s.need.max?'':' · 짧으면 반복해서 이어 틀어요'):''; }

  function rec(id){ var S=St(); S.bgm=S.bgm||{}; return S.bgm[id]||(S.bgm[id]={}); }

  /* ── ② 순간 쪽 «음악» 줄 ── */
  function rowHtml(k){ var v=B.viewOf(k,opt()); if(!v||v.kind==='entry') return '';
    var h='<div class="ls-cg ls-bgm" role="group" aria-label="음악" data-k="'+e(k)+'"'+(v.s?' data-slot="'+v.s.id+'"':'')+'><span class="gl" aria-hidden="true">음악</span><div class="bgm-w">';
    if(v.kind==='line') return h+'<p class="bgm-line">'+e(v.t)+'</p></div></div>';
    if(v.kind==='cont') return h+'<p class="bgm-line">앞 순서 곡이 이어져요 · 바꾸려면 <button type="button" class="pk-link bgm-go" data-fk="bgmgo:'+e(v.at)+'" onclick="mkGo(\''+e(v.at)+'\')">'+e(nm(v.at))+'</button>에서</p></div></div>';
    var s=v.s, g=B.get(St(),s.id), op=!!OPEN[s.id], ln=lines(s,g);
    h+='<button type="button" class="bgm-sum" data-fk="bgmopen:'+s.id+'" aria-expanded="'+op+'" aria-controls="bgmB_'+s.id+'" onclick="bgmAct(\'open\',\''+s.id+'\')">'
      +'<span class="bgm-tx"><span class="bgm-one">'+e(ln.one)+'</span><span class="bgm-now'+(g.m==='own'&&!(g.own&&+g.own.d>0)?' todo':'')+((g.m==='own'&&g.own&&+g.own.d>0&&!op)?' nm':'')+'">'+e(ln.now)+'</span></span><span class="bgm-cv" aria-hidden="true"></span></button>';
    if(op){ h+='<div class="bgm-b" id="bgmB_'+s.id+'"><span class="cg-c bgm-ch" role="radiogroup" aria-label="음악 고르기">'
        +s.picks.map(function(p,i){ var on=g.set&&g.m===p; return '<button type="button" class="op-chip" role="radio" aria-checked="'+on+'" tabindex="'+((on||(!g.set&&i===0))?0:-1)+'" data-fk="bgm:'+s.id+':'+p+'" onclick="bgmAct(\'pick\',\''+s.id+'\',\''+p+'\')">'+chipT(B.label(s,p))+'</button>'; }).join('')+'</span>';
      if(g.m==='own') h+=ownCard(s,g);
      h+='</div>'; }
    return h+'</div></div>'; }
  function ownCard(s,g){ var bz=BUSY[s.id];
    if(bz) return '<div class="bgm-card"><p class="bgm-cs" role="status">‹'+e(bz)+'› 살펴보는 중이에요</p></div>';
    var o=g.own&&+g.own.d>0?g.own:null;
    if(!o) return '<div class="bgm-card"><p class="bgm-cs">'+e(needLine(s))+'</p><div class="mk-sech mk-sech-r bgm-upgo"><button type="button" class="mk-hbtn" data-fk="bgmup:'+s.id+'" onclick="bgmAct(\'up\',\''+s.id+'\')">'+plus()+' 곡 파일 올리기</button></div></div>';
    var sn=B.shortNote(s,o.d);
    return '<div class="bgm-card on"><p class="bgm-song"><span class="bgm-t">'+e(o.n)+'</span><span class="bgm-a">'+e((o.a?o.a+' · ':'')+B.mss(o.d))+'</span></p>'+(sn?'<p class="bgm-cs">'+e(sn)+'</p>':'')
      +'<div class="bgm-ft"><button type="button" class="pk-link" data-fk="bgmagain:'+s.id+'" onclick="bgmAct(\'up\',\''+s.id+'\')">다른 곡 올리기</button><span aria-hidden="true">·</span><button type="button" class="pk-link" data-fk="bgmdel:'+s.id+'" onclick="bgmAct(\'del\',\''+s.id+'\')">빼기</button></div></div>'; }

  /* 이 칸만 다시 — 빌더 render() 는 흐르던 소리를 끈다 · 줄 하나만 바꾸고 칩 칸 맞춤(_cgEven)은 쪽 전체로(입장 음악 MU_REDRAW_EVEN_1019 와 같다) */
  function redraw(id,fx){ var row=D.querySelector('.ls-bgm[data-slot="'+id+'"]');
    if(!row){ try{ if(typeof render==='function') render(); }catch(x){} return; }
    var t=D.createElement('div'); t.innerHTML=rowHtml(row.getAttribute('data-k')); var nw=t.firstChild; if(!nw) return; row.parentNode.replaceChild(nw,row);
    try{ if(typeof _cgEven==='function') _cgEven(); }catch(x){}
    if(fx){ var f=D.querySelector(fx); if(f) try{ f.focus({preventScroll:true}); }catch(x){} } }

  /* ── 우리가 고른 곡 — 파일 받기 · 이 기기 보관(IndexedDB · 계정마다 · 칸마다) · 곡 이름 · 가수 · 길이 ── */
  function owner(){ try{ return (typeof _who==='string'&&_who)?_who:'local'; }catch(x){ return 'local'; } }   /* 입장 음악 owner() 와 같은 열쇠 */
  function db(){ return new Promise(function(ok,no){ try{ var q=indexedDB.open('me-bgm-song',1); q.onupgradeneeded=function(){ q.result.createObjectStore('f'); }; q.onsuccess=function(){ ok(q.result); }; q.onerror=function(){ no(q.error); }; }catch(x){ no(x); } }); }
  function fPut(id,blob){ var k=owner()+':'+id; return db().then(function(d){ return new Promise(function(ok){ var t=d.transaction('f','readwrite'); t.objectStore('f').put(blob,k); t.oncomplete=function(){ ok(true); }; t.onerror=function(){ ok(false); }; }); }).catch(function(){ return false; }); }
  function fDel(id){ var k=owner()+':'+id; return db().then(function(d){ d.transaction('f','readwrite').objectStore('f').delete(k); }).catch(function(){}); }
  function fileInput(){ var fi=D.getElementById('bgmUpFile'); if(fi) return fi; fi=D.createElement('input'); fi.type='file'; fi.id='bgmUpFile'; fi.className='sr-only'; fi.accept='.mp3,.m4a,.aac,.wav,.flac'; fi.tabIndex=-1; fi.setAttribute('aria-hidden','true');
    fi.addEventListener('change',function(){ var f=fi.files&&fi.files[0]; if(f&&TARGET) load(TARGET,f); }); D.body.appendChild(fi); return fi; }   /* 파일 칸은 화면 밖(body)에 하나 — 다시 그려도 고르는 중인 칸이 사라지지 않게(입장 음악과 같다) */
  /* 길이 = 소리 칸의 정보만 읽는다(30분 재생목록도 통째로 풀지 않는다) */
  function lenOf(f){ return new Promise(function(ok){ var u=null, a=null, done=false, fin=function(d){ if(done) return; done=true; try{ if(u) URL.revokeObjectURL(u); }catch(x){} ok(d); };
    try{ u=URL.createObjectURL(f); a=D.createElement('audio'); a.preload='metadata'; a.onloadedmetadata=function(){ var d=a.duration; fin(isFinite(d)&&d>0?d:0); }; a.onerror=function(){ fin(0); }; a.src=u; setTimeout(function(){ fin(0); },10000); }catch(x){ fin(0); } }); }
  function tagsOf(f){ var EM=window.EntryMusic; return f.slice(0,1024*1024).arrayBuffer().then(function(ab){ try{ return (EM&&EM.fileTags)?EM.fileTags(ab):{}; }catch(x){ return {}; } }).catch(function(){ return {}; }); }
  function fileNm(n){ var EM=window.EntryMusic; try{ if(EM&&EM.fileName) return EM.fileName(n); }catch(x){} return String(n||'').replace(/\.[a-z0-9]{2,5}$/i,'').slice(0,40)||'내 곡'; }
  function load(id,f){ if(f.size>MAXB){ toast('200MB 아래 파일로 골라 주세요'); return; }
    var n0=fileNm(f.name); BUSY[id]=n0; OPEN[id]=true; redraw(id);
    Promise.all([tagsOf(f),lenOf(f)]).then(function(r){ var tg=r[0]||{}, d=r[1];
      delete BUSY[id];
      if(!(d>=MIN_D)){ redraw(id); toast(d>0?'10초 넘는 곡으로 골라 주세요':'MP3 · M4A만 열 수 있어요'); return; }
      var x=rec(id); x.m='own'; x.own={n:String(tg.t||n0).slice(0,60),a:String(tg.a||'').slice(0,60),d:Math.round(d*10)/10}; save();
      fPut(id,f); redraw(id,'[data-fk="bgmagain:'+id+'"]'); }); }

  /* 누름 — open(접기 · 펴기) · pick(칩) · up(파일 고르기) · del(올린 곡 빼기) */
  function act(kind,id,v){ var s=B.slot(id); if(!s||s.entry) return;
    if(kind==='open'){ OPEN[id]=!OPEN[id]; redraw(id,'[data-fk="bgmopen:'+id+'"]'); return; }
    if(kind==='pick'){ if(s.picks.indexOf(v)<0) return; var g=B.get(St(),id); if(g.set&&g.m===v) return;   /* 이미 고른 칩은 그대로(CHIP_NO_REPLAY 와 같다) */
      rec(id).m=v; save(); redraw(id,'[data-fk="bgm:'+id+':'+v+'"]'); return; }   /* 올린 곡 기록(own)은 다른 칩을 눌러도 남겨 둔다 — 다시 «우리가 고른 곡»을 누르면 그 곡 */
    if(kind==='up'){ TARGET=id; var fi=fileInput(); fi.value=''; fi.click(); return; }
    if(kind==='del'){ var x=rec(id); delete x.own; save(); fDel(id); redraw(id,'[data-fk="bgmup:'+id+'"]'); toast('올린 곡을 뺐어요'); } }

  /* ── 할 일 · 한눈에 보기 ── */
  /* 이 순간 쪽 할 일 — «우리가 고른 곡»인데 파일이 없으면 미완료 한 줄(머리 «남은 할 일» · 순간 점이 같은 것을 센다) */
  function tasks(k){ var v=B.viewOf(k,opt()); if(!v||v.kind!=='pick') return []; var s=v.s, g=B.get(St(),s.id); if(g.m!=='own') return [];
    return [{id:'bgm:'+s.id, kind:'send', who:'', nm:sendNm(s,k), done:!!(g.own&&+g.own.d>0)}]; }
  function sendNm(s,k){ return nm(k)+' 음악 · '+(s.last?'마지막 곡 파일':'우리가 고른 곡 파일'); }
  function chooserOf(s,o){ if(s.id==='S5'&&o.freeVideo) return null; return B.chooser(s,o); }
  /* «보낼 것»에 넣을 줄 — 아직 안 올린 칸만 */
  function sends(){ var o=opt(), out=[]; B.SLOTS.forEach(function(s){ if(s.entry) return; var at=chooserOf(s,o); if(!at) return; var g=B.get(St(),s.id);
    if(g.m==='own'&&!(g.own&&+g.own.d>0)) out.push({k:at, nm:sendNm(s,at), due:7}); }); return out; }
  function entryNow(){ var mu=St().mu||{}, t=mu.t||mu.name||'';
    if(mu.src==='up') return '두 분이 고른 곡'+(t?' ‹'+t+'›':'');
    if(mu.src==='rec') return '추천 곡'+(t?' ‹'+t+'›':'');
    return B.PICK.studio; }   /* 입장 곡을 안 골랐으면 당일 콘솔이 배경음으로 연다(console muPill «입장 음악 없음 · 배경음으로») */
  /* ④ 한 줄 글 = 칩 이름과 같은 말(폰 390 에서 한 줄 · 잘리지 않게) */
  function sumNow(s,g){ var o=g.own&&+g.own.d>0?g.own:null;
    if(g.m==='own') return o?(s.last?'마지막 곡 ':'')+'‹'+o.n+'›':(s.last?'마지막 곡':B.PICK.own)+' · 아직 안 올렸어요';
    return B.label(s,g.m); }
  /* ④ «음악» 묶음 — ★[BGM_SUM_CHANGED 2026-10-23 BGM 섹션 검토 1] 두 분이 바꾼 칸만 한 줄씩(이름 + 고른 것) + 맨 끝 «나머지 n곳은 스튜디오가 골라 둘게요» ·
     하나도 안 바꿨으면 «음악은 모두 스튜디오가 골라 둘게요» 한 줄 — 종전엔 손대지 않은 열 칸이 모두 «스튜디오 곡»으로 서 폰에서 20줄이었다(새로 알려 주는 것이 없다) ·
     바꾼 칸 = 기본(첫 고르기)이 아닌 것 · 입장 · 맞절(S3)은 입장 곡을 고르거나 올렸을 때만 · «이동하기» 단추는 없다(올릴 파일이 남은 칸은 위 «보낼 것»이 데려간다) */
  function sumHtml(){ var o=opt(), rows=[], rest=0;
    B.SLOTS.forEach(function(s){ var on=s.ks.filter(function(k){ return o.onOf(k); }), at=s.entry?'entry':chooserOf(s,o); if(!at||!on.length) return;
      var g=s.entry?null:B.get(St(),s.id), mu=St().mu||{}, ch=s.entry?(mu.src==='up'||mu.src==='rec'):(g.m!==s.picks[0]);
      if(!ch){ rest++; return; }
      var lab=on.length>2?nm(on[0])+' ~ '+nm(on[on.length-1]):on.map(nm).join(' · '), tx=s.entry?entryNow():sumNow(s,g);
      rows.push('<li class="mk-hp" data-slot="'+s.id+'"><span>'+e(lab)+'</span><span class="wr-due">'+e(tx)+'</span></li>'); });
    if(!rows.length&&!rest) return '';
    var tail=rows.length?(rest?'<li class="bgm-rest">나머지 '+rest+'곳은 스튜디오가 골라 둘게요</li>':''):'<li class="bgm-rest">음악은 모두 스튜디오가 골라 둘게요</li>';
    return '<section class="mk-sec mk-bgm"><h4>음악</h4><ul class="mk-list">'+rows.join('')+tail+'</ul></section>'; }

  window.bgmAct=act;
  window.BgmForm={ rowHtml:rowHtml, tasks:tasks, sends:sends, sumHtml:sumHtml, _t:{ open:OPEN, busy:BUSY, now:function(id){ var s=B.slot(id); return s?lines(s,B.get(St(),id)).now:''; }, need:function(id){ var s=B.slot(id); return s?needLine(s):''; }, load:load } };   /* _t = 점검용 */
})();
