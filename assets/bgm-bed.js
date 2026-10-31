/* ★★[BGM_PREVIEW_1024 2026-10-24 사장님 «고객이 진행하면서 나레이션과 함께 들어볼 수 있게 해야 할 거 아니야» · «노래도 이벤트마다 들어 보게 하고 그래야 선택을 하지» ·
   «우리가 리스트를 만들면 그 안에서 고객이 ‹이 시간에는 이 노래가 좋겠어› 선택할 수 있게» · «그걸 또 분위기를 볼 수 있게 직접 나레이션과 들어 볼 수 있게» · 질문 답 «고객이 고름»]
   식순 화면(order-preview.html) 구간 음악 — 고르기 줄 · 곡 카드 ▶(그 곡을 깐 이 순간 첫 나레이션) · 이 순간 전체 듣기 아래로 까는 소리.
   · 목록은 스튜디오가 정한다(assets/bgm-picks.js · cust 구간 · 축사 · 편지 하위 칸) — 고객은 그 안에서만 고른다 · 올리기 · 직접 곡은 입장만(entry-music.js)
   · 자리 = 그 구간의 첫 담긴 순간 쪽 «고르기» 칸 맨 아래 «‹순간› 음악» 줄 하나 · 같은 구간의 다음 순간에는 다시 두지 않는다(흐름 음악 줄 «…부터 이어져요» 그대로)
     축사 · 편지 = «음악과 함께»를 고르면 그 줄 아래 곡 고르기(bgm-form.js 가 subHtml 을 부른다 · «음악 없이»면 없음)
   · 처음엔 아무 곡도 눌린 모양이 아니다(BOSS_WAY 1) · 아래 한 줄 «고르지 않으시면 ‹1순위›로 준비해요» · 고르면 «‹곡›으로 준비해요»(줄 수가 그대로)
   · 저장 S.bgm[구간] = { k: 곡 번호 } · 축사 · 편지 S.bgm.S5 · S6 = { m:'bed', k } (assets/bgm-slots.js clean) — 당일 콘솔은 그 곡을 구간 기본으로 쓴다
   · 소리는 로그인한 두 분(마이페이지 안)에게만 — 마이페이지 → GAS(ritualFileGet · key 'bed' · id 'list' 또는 곡 번호) → 드라이브 «ME_구간곡»(입장 «스튜디오가 고른 곡»과 같은 길)
     공개 미리보기(마이페이지 밖)는 곡 이름 · 한 줄만 · ▶ 대신 «마이페이지에서 들어 볼 수 있어요» · 아무것도 받지 않는다
   · 크기 = 당일 콘솔과 같은 엔진 값(엔진 큐의 duck · live.duck — 빌더 줄 dk · ldk) · 낮춤 0.4초 · 올림 1.2초 · 음성 0.4초 앞 낮춤 · 줄 사이는 버틴다(이음 보호 3.5초 안) ·
     축배 «위하여» 차례가 끝나면 축배 크기로 0.6초에(디렉터 GO 자리를 미리 듣기 시계로) · 곡이 없으면 그 구간은 나레이션만(오류 없이) · 미리 듣기 길이는 늘리지 않는다
   · 소리 하나(ONE_SOUND) — 곡 카드 ▶ 를 누르면 다른 소리는 멈추고, 다른 소리를 틀면 곡 카드 소리는 멈춘다
   ★★[BGM_FIX_1030 2026-10-30 BGM 섹션 · GPT(Ultra) 합의] 곡 번호 = 곡마다 하나(B01 …) — 번호로는 구간을 알 수 없어 누름이 구간(data-seg)을 함께 건넨다 ·
     가사가 있는 곡(vocal) = 곡 이름 옆 «노래»(작은 글 · 새 색 · 아이콘 없음) · 고르면 아래 한 줄 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요» · 깔릴 때 나레이션 · 사람 구간 vocalExtra(−6) ·
     음악 전체 크기 musicTrim(−3.1 dB · 콘솔 «음악 볼륨»과 같은 값) · 미리 낮추기 0.8초(박수 뒤 줄은 1.5초) ·
     닫는 인사 곡(M6)은 닫는 나레이션 뒤 목례 · 박수부터(그 줄 동안은 앞 곡을 낮게) · 축배 곡(M7)은 «위하여» 뒤 강조 위치에서 0.6초에 — 당일 콘솔과 같다 */
(function(){
  'use strict';
  if(window.BgmBed) return;
  var D=document, P=window.BgmPicks;
  if(!P) return;
  var CUST=P.SEGS.filter(function(s){ return s.cust; });
  var SUB={ S5:'M4S5', S6:'M4S6' };

  function e(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }
  function St(){ return window.S||{}; }
  function RO(){ return window.RitualOpen||null; }
  function emb(){ try{ return typeof EMBED!=='undefined'&&!!EMBED&&window.parent&&window.parent!==window; }catch(x){ return false; } }
  function post(type,data){ try{ window.parent.postMessage({type:type,data:data},window.location.origin); return true; }catch(x){ return false; } }
  function save(){ try{ if(typeof _persist==='function') _persist(); }catch(x){} }
  function ico(n){ try{ return n==='stop'?ICO_STOP:ICO_PLAY; }catch(x){ return ''; } }
  function ro(w){ try{ if(typeof _josaRo==='function') return _josaRo(w); }catch(x){} return '로'; }
  function toast1(t){ try{ if(typeof _noteToast==='function'){ _noteToast(t); return; } }catch(x){} try{ if(typeof toast==='function') toast(t,3000); }catch(x){} }
  function PR(){ var p={}; try{ p=(window.ENG&&ENG.RitualCue&&ENG.RitualCue.PARAM)||{}; }catch(x){}
    var dk=p.duck||{}; return { speech:num(p.duckSpeech,-16), music:num(p.duckMusic,-8), toast:num(p.toastLevel,0), toastUp:num(p.toastUpMs,600),
      down:num(dk.downMs,num(p.fadeDownMs,400)), up:num(dk.upMs,num(p.fadeUpMs,1200)), lead:num(dk.leadMs,800), voc:num(p.vocalExtra,-6), trim:num(p.musicTrim,-3.1) }; }
  function num(v,d){ return (typeof v==='number'&&isFinite(v))?v:d; }
  function gainOf(db){ return db<=-80?0.00003:Math.pow(10,(db+PR().trim)/20); }   /* [BGM_FIX_1030] 음악 전체 크기(musicTrim) */
  function voc(f){ var s=P.byF(f); return !!(s&&s.vocal); }
  /* 노래 곡이 깔린 동안 나레이션 · 사람 구간(큐 사이 −8 보다 낮은 크기)은 vocalExtra 만큼 더 낮게 — 콘솔 duckTo 와 같은 자 */
  function vx(db,f){ var p=PR(); return (db>-80&&db<p.music-0.5&&voc(f))?db+p.voc:db; }

  /* ── 구간 · 순간 ── */
  function onOf(k){ if(k==='guest'||k==='_close') return true; var R=RO(); try{ return !!(R&&R.onOf(St(),k))&&!(typeof _mkOff==='function'&&_mkOff(k)); }catch(x){ return false; } }
  function seq(){ var R=RO(); try{ return R?R.bodySeq(St()):[]; }catch(x){ return []; } }
  /* 그 구간의 첫 담긴 순간 — 고르기 줄이 서는 쪽(본식 차례 · 없으면 목록 차례) */
  function chooser(sg){ var on=sg.ks.filter(onOf); if(on.length<2) return on[0]||null; var q=seq();
    on.sort(function(a,b){ var i=q.indexOf(a), j=q.indexOf(b); return (i<0?99+sg.ks.indexOf(a):i)-(j<0?99+sg.ks.indexOf(b):j); }); return on[0]; }
  function nameOf(k){ var R=RO(); try{ return R?String(R.nameOf(k,St())||''):''; }catch(x){ return ''; } }
  function labelOf(sg){ var d=P.seg(sg); if(!d) return ''; if(d.slot) return (d.slot==='S5'?'축사':'편지'); var k=chooser(d); if(k==='free'||k==='letter') return '본식'; var n=nameOf(k); return (n&&n!==k)?n:d.nm; }   /* [BGM_FIX_1030] 엔진 이름표가 없는 순간(guest · _close)은 열쇠가 그대로 돌아온다 — 구간 이름(하객 맞이 · 닫는 인사)으로 */   /* 감사 인사 ~ 덕담을 다 뺀 날 첫 순간이 축사 · 편지면 그 칩 줄 이름(«축사 음악»)과 겹친다 */
  /* 고른 곡 번호 · 실제로 쓸 곡(안 골랐으면 1순위) */
  function picked(sg){ return P.custK(St(),sg); }
  function eff(sg){ var k=picked(sg); if(k) return k; var L=P.list(sg); return L[0]?L[0].f:''; }
  function bedOn(id){ var S=St(); return !!(S.bgm&&S.bgm[id]&&S.bgm[id].m==='bed'); }
  /* 이 순간에 흐르는 구간 — 당일 콘솔 segOfCue 와 같은 갈래(입장 · 맞절 = 입장 곡 · 식전 영상 · 축가 = 자체 소리 · 없음) */
  function segAt(k){
    if(k==='guest') return 'M1'; if(k==='candle') return 'M2';
    if(k==='free') return (bedOn('S5')&&has(eff('M4S5')))?'M4S5':'M4';
    if(k==='letter') return (bedOn('S6')&&has(eff('M4S6')))?'M4S6':'M4';
    if(/^(welcome|vow|ring|declare|bless)$/.test(k)) return 'M4';
    if(k==='tribute') return 'M5'; if(k==='_close') return 'M6'; if(k==='toast') return 'M7'; if(k==='table') return 'M8';
    return ''; }
  function songAt(k){ var sg=segAt(k); if(!sg) return ''; var f=eff(sg); return has(f)?f:''; }

  /* ── 있는 곡(드라이브 목록) · 곡 받기 — 마이페이지 안에서만 ── */
  var AV={ st:'', set:{}, t:null };
  function has(f){ return !!f&&AV.st==='ok'&&!!AV.set[f]; }
  function list(){ if(!emb()||AV.st==='wait'||AV.st==='ok') return; AV.st='wait';
    AV.t=setTimeout(function(){ if(AV.st==='wait'){ AV.st='fail'; repaint(); } },60000);
    if(!post('momentedit:ritualFileGet',{key:'bed',id:'list'})){ clearTimeout(AV.t); AV.st='fail'; } }
  var BUF={};   // 곡 번호 → { st:'wait'|'ok'|'fail', b:AudioBuffer, cb:[] }
  function want(f,cb){ if(!f||!emb()){ if(cb) cb(null); return; } var o=BUF[f];
    if(o&&o.st==='ok'){ if(cb) cb(o.b); return; } if(o&&o.st==='wait'){ if(cb) o.cb.push(cb); return; }
    o=BUF[f]={ st:'wait', b:null, cb:cb?[cb]:[] }; o.t=setTimeout(function(){ if(o.st==='wait') done(f,null,'L5'); },90000);
    if(!post('momentedit:ritualFileGet',{key:'bed',id:f})) done(f,null,'L6'); }
  function done(f,b,ec){ var o=BUF[f]; if(!o) return; clearTimeout(o.t); o.st=b?'ok':'fail'; o.b=b; if(!b) delete BUF[f]; var cs=o.cb; o.cb=[]; cs.forEach(function(c){ try{ c(b,ec); }catch(x){} }); }   /* ec = 못 받은 까닭 코드(서버 · 연결) */
  window.addEventListener('message',function(ev){ var d=ev&&ev.data; if(!d||ev.origin!==window.location.origin||d.type!=='momentedit:ritualFileData'||d.key!=='bed') return;
    if(d.id==='list'){ clearTimeout(AV.t); if(d.ok&&Array.isArray(d.songs)){ AV.set={}; d.songs.forEach(function(x){ var f=x&&String(x.f||'').toUpperCase(); if(f) AV.set[f]=1; }); AV.st='ok'; } else AV.st='fail'; repaint(); return; }
    var f=String(d.id||'').toUpperCase(); if(!BUF[f]) return;
    if(!d.ok||!d.data){ var m=/\(코드 ([A-Z]\d)/.exec(String(d.error||'')); done(f,null,d.ecode||(m&&m[1])||'L4'); return; }
    var ac=ctx(); if(!ac){ done(f,null); return; }
    try{ var bin=atob(d.data), n=bin.length, u=new Uint8Array(n); for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
      var p=ac.decodeAudioData(u.buffer,function(b){ done(f,b); },function(){ done(f,null); }); if(p&&p.catch) p.catch(function(){}); }catch(x){ done(f,null); } });

  /* ── 소리 — 곡 하나 · 크기 마디 하나(바꿀 때 3초 겹쳐 넘긴다) ── */
  var AC=null;
  function ctx(){ if(AC) return AC; try{ var C=window.AudioContext||window.webkitAudioContext; if(C) AC=new C(); }catch(x){ AC=null; } return AC; }
  /* 탭 안에서 소리 문을 연다(아이폰 · 카톡) — 마이페이지 안에서만 */
  D.addEventListener('click',function(){ if(!emb()) return; var a=ctx(); try{ if(a&&a.state==='suspended') a.resume(); }catch(x){} },true);
  function Voice(){ return { src:null, g:null, f:'', t0:0, off:0, want:-90 }; }
  var BED={ cur:Voice(), who:'' };   // who = 'lp'(이 순간 전체 듣기) · 'card'(곡 카드 ▶)
  function ramp(v,db,ms){ var a=AC; if(!a||!v.g) return; v.want=db; var now=a.currentTime, g=v.g.gain; try{ g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.00003,g.value),now); g.linearRampToValueAtTime(gainOf(db),now+Math.max(0.05,ms/1000)); }catch(x){} }
  function startVoice(f,db,fadeMs,at){ var a=ctx(), o=BUF[f]; if(!a||!o||!o.b) return null; var v=Voice();
    try{ v.src=a.createBufferSource(); v.src.buffer=o.b; v.src.loop=true; v.g=a.createGain(); v.g.gain.value=0.00003; v.src.connect(v.g); v.g.connect(a.destination);
      var off=Math.max(0,Math.min(o.b.duration-0.5,at||0)); v.src.start(0,off); v.t0=a.currentTime; v.off=off; v.f=f; ramp(v,db,fadeMs); }catch(x){ return null; }
    return v; }
  function stopVoice(v,ms){ if(!v||!v.src) return; var a=AC, s=v.src, l=v.lim; if(v.solo&&a&&v.g){ try{ var n=a.currentTime, g=v.g.gain; g.cancelScheduledValues(n); g.setValueAtTime(Math.max(0.00003,g.value),n); g.linearRampToValueAtTime(0.00003,n+Math.max(0.05,ms/1000)); }catch(x){} v.want=-90; } else ramp(v,-90,ms); v.src=null; setTimeout(function(){ try{ s.onended=null; s.stop(); s.disconnect(); if(l) l.disconnect(); }catch(x){} },Math.max(60,ms)+120); }   /* [SONG_CARD_SOLO_1031] 카드 소리는 +7 dB 판(ramp 의 musicTrim 을 쓰지 않는다) */
  function posOf(v){ if(!AC||!v||!v.src||!v.src.buffer) return 0; var d=v.src.buffer.duration||1; return (v.off+(AC.currentTime-v.t0))%d; }
  /* 곡을 바꾼다 — 같은 곡이면 크기만 · 다르면 3초 겹쳐 넘긴다 · 처음이면 fade 에 걸쳐 올린다 */
  function play(f,db,fadeMs,at){ var c=BED.cur;
    if(c.src&&c.f===f){ ramp(c,db,fadeMs); return true; }
    var nv=startVoice(f,db,c.src?3000:fadeMs,at); if(!nv) return false;
    if(c.src) stopVoice(c,3000); BED.cur=nv; return true; }
  function hushAll(ms){ stopVoice(BED.cur,ms==null?600:ms); BED.cur=Voice(); BED.who=''; }

  /* ── 이 순간 전체 듣기 — 빌더 플레이어(LP)가 줄마다 부른다 ── */
  var LPB={ on:false, f:'', pend:'', cheer:false, keep:{} };
  function personal(st){ return !!(st&&(st.talk||st.talk2||st.skip||st.bridge||st.act)); }   /* [LISTEN_PACE_1031] 행동 줄(말없이 · act)도 사람 순간 — 큐 사이 크기(−8)로 살짝 올라온다(당일과 같은 엔진 값) */
  function lvOf(st,f){ var p=PR(), db; if(!st) db=p.music; else if(personal(st)) db=st.ldk!=null?st.ldk:p.music; else db=st.dk!=null?st.dk:p.speech; return vx(db,f!=null?f:BED.cur.f); }
  /* 줄이 시작될 때 — 그 순간 구간 곡(없으면 걷는다) · 그 줄 크기로 */
  /* [BGM_FIX_1030] 이 줄에 깔 곡 — 축배 «위하여» 전 · 닫는 인사 나레이션 줄은 앞 곡을 잇는다(없으면 축배는 닫는 인사 곡 · 닫는 인사는 없음) */
  function fileFor(st){ if(st.k==='toast'&&!LPB.m7){ if(BED.who==='lp'&&BED.cur.src) return BED.cur.f; var f6=eff('M6'); return has(f6)?f6:''; }
    if(st.k==='_close'&&st.slug==='narr-close-bow'){ return (BED.who==='lp'&&BED.cur.src)?BED.cur.f:''; }
    return songAt(st.k); }
  function lpShow(st){ if(!emb()||!st) return; if(BED.who==='card') stopCard(true);
    if(st.k!=='toast') LPB.m7=false;
    var f=fileFor(st), db=lvOf(st,f), up=db>(BED.cur.want||-90)+0.5, p=PR();
    LPB.cheer=false;
    if(!f){ if(BED.who==='lp'&&BED.cur.src) hushAll(1500); LPB.on=false; LPB.f=''; return; }
    LPB.on=true; BED.who='lp';
    if(BUF[f]&&BUF[f].st==='ok'){ var at=(BED.cur.f!==f&&LPB.keep[f]!=null)?LPB.keep[f]:0; play(f,db,up?p.up:p.down,at); LPB.f=f; return; }
    LPB.pend=f; want(f,function(b){ if(!b||!LPB.on||LPB.pend!==f) return; var q=curStep(); if(!q||fileFor(q)!==f) return; play(f,lvOf(q,f),p.up,0); LPB.f=f; });   /* 곡이 늦게 오면 그때 깐다(나레이션을 기다리게 하지 않는다) */ }
  /* ★[LISTEN_PACE_1031 사장님 «BGM 이 흐르고 뜸 들인 이후 멘트»] 순간 첫 줄 앞 뜸 — 그 순간 곡을 큐 사이 크기(−8)로 깔고 3초(같은 곡이 이어지면 1.5초) ·
     끝 0.8초(미리 낮추기 leadMs) 동안 그 줄 크기로 내린다 · 돌려준 값 = 기다릴 ms · 곡이 없으면(공개 미리보기 · 드라이브에 없음) 0 = 뜸 없음 */
  function lpLead(st){ if(!emb()||!st) return 0; if(BED.who==='card') stopCard(true); var f=fileFor(st); if(!f) return 0;
    var p=PR(), cont=!!(BED.who==='lp'&&BED.cur.src&&BED.cur.f===f), ms=cont?3000:6000;   /* ★[LEAD_LONGER_1031 사장님 «처음 BGM 노래가 좀 더 흐른 뒤 멘트가 나왔으면»] 뜸 새 곡 3 → 6초 · 이어지는 곡 1.5 → 3초(큐 사이 크기 −8 · 끝 0.8초 미리 낮추기) */
    if(st.k!=='toast') LPB.m7=false; LPB.on=true; BED.who='lp'; LPB.cheer=false;
    var go=function(){ play(f,vx(p.music,f),p.up,(BED.cur.f!==f&&LPB.keep[f]!=null)?LPB.keep[f]:0); LPB.f=f; var v=BED.cur, db=lvOf(st,f);
      if(v.want>db+0.5) setTimeout(function(){ if(BED.cur===v&&LPB.on&&curStep()===st) ramp(v,db,p.lead); },Math.max(0,ms-p.lead)); };
    if(BUF[f]&&BUF[f].st==='ok') go(); else { LPB.pend=f; want(f,function(b){ if(b&&LPB.on&&LPB.pend===f&&curStep()===st) go(); }); }
    return ms; }
  /* 줄과 줄 사이 — 다음 줄이 말이면 0.4초 앞서 내린다 · «위하여» 차례가 끝나면 축배 크기로 */
  function lpGap(pv,nx,gap){ if(!emb()||!LPB.on||BED.who!=='lp') return; var p=PR();
    /* [BGM_FIX_1030] «위하여» 차례가 끝나면 축배 곡(M7)으로 — 강조 위치(start)에서 0.6초에 축배 크기로(곡이 없으면 지금 곡이 크기만) */
    if(pv&&pv.cheer){ LPB.cheer=true; LPB.m7=true; var f7=songAt('toast'), s7=f7?P.byF(f7):null;
      if(f7&&BUF[f7]&&BUF[f7].st==='ok'&&f7!==BED.cur.f){ if(BED.cur.src) stopVoice(BED.cur,p.toastUp); BED.cur=startVoice(f7,p.toast,p.toastUp,s7&&s7.start!=null?+s7.start:0)||Voice(); LPB.f=f7; return; }
      if(!BED.cur.src) return; ramp(BED.cur,p.toast,p.toastUp); var ps=P.byF(BED.cur.f); if(ps&&ps.start!=null&&BED.cur.src){ var at=+ps.start, f=BED.cur.f; stopVoice(BED.cur,200); BED.cur=startVoice(f,p.toast,p.toastUp,at)||Voice(); } return; }
    /* [BGM_FIX_1030] 닫는 인사 나레이션 뒤 — 목례 · 박수와 함께 M6 으로(3초 겹쳐 · 큐 사이 크기) */
    if(pv&&pv.k==='_close'&&pv.slug==='narr-close-bow'){ var f6=songAt('_close'); if(f6&&BUF[f6]&&BUF[f6].st==='ok'){ play(f6,p.music,p.up,LPB.keep[f6]||0); LPB.f=f6; } return; }
    if(!BED.cur.src) return;
    if(!nx||fileFor(nx)!==BED.cur.f) return;
    var db=lvOf(nx); if(BED.cur.want>db+0.5){ var lead=Math.min(nx.fm||p.lead,Math.max(0,gap)), v=BED.cur; setTimeout(function(){ if(BED.cur===v&&LPB.on) ramp(v,db,lead||p.down); },Math.max(0,gap-lead)); } }   /* [BGM_FIX_1030] 미리 낮추기 0.8초 · 박수 뒤 줄 1.5초(fm) */
  function lpEnd(){ if(BED.who!=='lp') return; if(BED.cur.f) LPB.keep[BED.cur.f]=posOf(BED.cur); LPB.on=false; LPB.f=''; LPB.pend=''; LPB.m7=false; hushAll(1500); }
  function curStep(){ try{ return (typeof LP!=='undefined'&&LP.q)?LP.q[LP.i]:null; }catch(x){ return null; } }
  /* 멈춤 · 끝 — 플레이어가 멈추면(■ · 다른 순간 · 끝) 곡도 잦아든다 */
  setInterval(function(){ if(BED.who!=='lp'||!BED.cur.src) return; var dead=true; try{ dead=typeof LP==='undefined'||!LP.q||!LP.q.length||LP.paused||LP.one; }catch(x){} if(dead) lpEnd(); },250);
  /* 듣기 전에 그 순간들의 곡을 받아 둔다 */
  function lpWarm(ks){ if(!emb()) return; list(); (ks||[]).forEach(function(k){ var f=songAt(k); if(f) want(f); if(k==='toast'||k==='_close'){ var f6=eff('M6'); if(has(f6)) want(f6); } }); }   /* [BGM_FIX_1030] 축배 나레이션은 닫는 인사 곡을 잇는다 */

  /* ── 곡 카드 ▶ — 그 곡을 깐 이 순간 첫 나레이션(없으면 곡만) ── */
  var CARD={ f:'', sg:'', st:'', tk:0, na:null };   /* sg = 누른 줄의 구간(같은 곡이 두 구간에 있어도 그 줄 ▶ 만 «멈추기») */
  function firstLine(k){ try{ if(!window.ENG||typeof _lSteps!=='function') return null; return _lSteps(ENG,[k]).filter(function(x){ return !x.quiet&&!x.talk&&!x.skip&&!x.talk2&&x.src; })[0]||null; }catch(x){ return null; } }
  function na(){ if(!CARD.na){ CARD.na=new Audio(); CARD.na.preload='auto'; } return CARD.na; }
  function stopCard(quiet){ CARD.tk++; var was=CARD.f; CARD.f=''; CARD.sg=''; CARD.st=''; try{ if(CARD.na){ CARD.na.onended=null; CARD.na.pause(); } }catch(x){} if(BED.who==='card') hushAll(SOLO.fade);   /* [SONG_CARD_SOLO_1031] 0.8초에 걸쳐 내려가며 */ if(was&&!quiet) repaint(); else if(was) repaintSoon(); }
  /* ★★[SONG_CARD_SOLO_1031 2026-10-31 사장님 «음악만 나와야 하는 거 아니야? · 여기서는 좀 크게»] 곡 카드 ▶ = 그 곡만(나레이션 없음).
       크기 = 곡 파일 −23 LUFS 를 나레이션(−16 LUFS)과 같게 +7 dB(musicTrim · 덕킹 없음) · 그 길에만 리미터(threshold −1 dB · ratio 20 · attack 2ms · release 150ms) ·
       0.8초에 걸쳐 오르고 · ■ 나 다른 소리를 틀면 0.8초에 걸쳐 내려가며 멈춘다 · 곡 처음부터(짧은 판 길이만큼) · 강조 위치(start)가 있으면 그 5초 전부터.
       «이 순간 전체 듣기 · 음악과 함께»는 그대로(엔진 크기 · 나레이션과 함께) */
  var SOLO={ db:7, fade:800, pre:5 };
  function card(f,k,sg){ var tk=++CARD.tk;
    CARD.f=f; CARD.sg=sg||''; CARD.st='load'; repaint();
    want(f,function(b,ec){ if(tk!==CARD.tk) return; if(!b){ CARD.f=''; CARD.st=''; repaint(); toast1(ec==='L3'?'이 곡은 아직 준비 중이에요':'곡을 불러오지 못했어요 (코드 '+(ec||'L4')+')'); return; }   /* L3 = 드라이브에 아직 없는 곡 */
      if(BED.who==='lp'||BED.cur.src) hushAll(300); BED.who='card'; CARD.st='play'; repaint();
      var a=ctx(); if(!a) return; var s0=P.byF(f), at=(s0&&s0.start!=null)?Math.max(0,+s0.start-SOLO.pre):0, v=Voice();
      try{ if(a.state==='suspended') a.resume(); v.src=a.createBufferSource(); v.src.buffer=b; v.src.loop=false; v.g=a.createGain(); v.g.gain.value=0.00003;
        var lim=a.createDynamicsCompressor(); lim.threshold.value=-1; lim.ratio.value=20; lim.attack.value=0.002; lim.release.value=0.15; lim.knee.value=0;
        v.src.connect(v.g); v.g.connect(lim); lim.connect(a.destination); v.lim=lim;
        var off=Math.max(0,Math.min(b.duration-0.5,at)); v.src.start(0,off); v.t0=a.currentTime; v.off=off; v.f=f; v.solo=true;
        var now=a.currentTime, G=Math.pow(10,SOLO.db/20); v.g.gain.setValueAtTime(0.00003,now); v.g.gain.linearRampToValueAtTime(G,now+SOLO.fade/1000); v.want=SOLO.db;
        var left=Math.max(0.2,b.duration-off); v.g.gain.setValueAtTime(G,now+Math.max(SOLO.fade/1000,left-SOLO.fade/1000)); v.g.gain.linearRampToValueAtTime(0.00003,now+left);
        v.src.onended=function(){ if(tk===CARD.tk&&BED.cur===v) stopCard(); }; }catch(x){ return; }
      BED.cur=v; }); }

  /* ★★[MUSIC_FOLD_1031 2026-10-31 사장님 시안 «1 · 음악만 접기» 고름] 곡을 «직접» 골라 둔 구간은 그 순간 쪽에 «새로 들어올 때»(쪽 옮김 · 화면 열기 · 다시 열기) 한 줄로 접는다 —
     접힌 줄 = (마이페이지 안이면 그 곡 ▶) + 곡 이름 · 아랫줄 + 오른쪽 «바꾸기»(밑줄 글 단추 · .pk-link 색 · LINK_GOLD_1031) · 아래 «준비해요» 한 줄은 펼쳤을 때만.
     · 안 고른 구간(«고르지 않으시면 ‹1순위›…»)은 접지 않는다 · ★고르면 바로 접는다(MUSIC_FOLD_PICK_1031 · 종전 «머무는 동안 고르면 접지 않는다»는 걷었다 — 입장 음악과 달라 사장님이 짚었다) · 비교는 ▶ 로(고르지 않고 듣기만)
     · «바꾸기» = 그 자리에서 목록을 편다(덮는 창 · 움직임 없음) · 그 방문 동안은 다시 그려도(render) 펼친 채 · 접힌 줄 ▶ 는 듣기만(고름을 바꾸지 않는다)
     · 방문 = MK.pgTok(쪽 들어옴 · _mkGoNow) — ② 걸음 밖에서 그리거나 초안을 새로 얹으면(_applySaved) MK.muFold 를 비운다(order-preview.html) · 칩 줄은 그대로 */
  var FB={};
  function FM(){ var M=null; try{ M=window.MK||null; }catch(x){} if(!M) M=FB; var t=M.pgTok||0; if(!M.muFold||M.muFold.tok!==t) M.muFold={ tok:t, m:{} }; return M.muFold.m; }
  /* 이 방문에서 처음 그릴 때 정한다 — 그때 직접 고른 곡이 있으면 접는다 · 아니면 이 방문 내내 편 채 */
  function folded(sg){ return !!picked(sg)&&FM()[sg]!==0; }   /* ★★[MUSIC_FOLD_PICK_1031 2026-10-31 사장님 «왜 안 접히는 부분들이 있어 · 저런 거 있는 곳들은 똑같이»] 입장 음악 추천 곡([MU_FOLD] · ✓ 로 고르면 바로 접힘)과 같게 — 고르는 순간 접는다 · 편 채로 두는 것은 «바꾸기»로 연 그 방문뿐(0) · 다시 고르면 또 접힌다 */
  function boxId(sg){ return 'bedBox_'+sg; }
  function foldHtml(sg,k,s){ var gl=labelOf(sg)+' 음악', pl=CARD.f===s.f&&CARD.sg===sg, miss=AV.st==='ok'&&!AV.set[s.f];
    return '<div class="mu-fold1">'
      +(emb()?'<button type="button" class="mk-pl mu-pl'+(pl?' on':'')+(miss&&!pl?' off':'')+'" data-fk="bedp:'+sg+':'+s.f+'" aria-pressed="'+pl+'"'+(miss&&!pl?' aria-disabled="true"':'')+' aria-label="'+e(s.t)+(pl?' 멈추기':' · 곡만 듣기')+'" onclick="bedAct(\'prev\',\''+s.f+'\',\''+e(k)+'\',\''+sg+'\')">'+(pl?ico('stop'):ico('play'))+'</button>':'')
      +'<div class="mu-fsel"><span class="mu-t">'+e(s.t)+(s.vocal?'<span class="mu-voc"> 노래</span>':'')+'</span><span class="mu-a">'+e([s.src,s.a,s.why].filter(Boolean).join(' · '))+'</span></div>'
      +'<button type="button" class="pk-link mu-chg" data-fk="bedchg:'+sg+'" aria-expanded="false" aria-controls="'+boxId(sg)+'" aria-label="'+e(gl)+' 바꾸기" onclick="bedAct(\'open\',\'\',\''+e(k)+'\',\''+sg+'\')">바꾸기</button></div>'; }

  /* ── 화면 — 곡 목록 · 아래 한 줄 ── */
  function noteOf(sg){ var L=P.list(sg), k=picked(sg), s=k?P.byF(k):L[0]; if(!s) return '';
    var d=P.seg(sg), t=(k?'':'고르지 않으시면 ')+'‹'+s.t+'›'+((d&&d.multi)?'부터 이어서 틀어요':ro(s.t)+' 준비해요'); return emb()?t:t+' · 마이페이지에서 들어 볼 수 있어요'; }   /* [BGM_FIX_1030 덧붙임 4] 여러 곡을 이어 트는 구간(하객 맞이 · 테이블 인사)은 «‹곡›부터 이어서 틀어요» */
  function listHtml(sg,k){ var L=P.list(sg), cur=picked(sg), gl=labelOf(sg)+' 음악 곡', cs=cur?P.byF(cur):null;
    if(folded(sg)&&cs) return foldHtml(sg,k,cs);   /* [MUSIC_FOLD_1031 · MUSIC_FOLD_PICK_1031] 고른 곡이 있으면 접힌 한 줄 · «바꾸기»로 편 방문만 목록 */
    var h='<ul class="mu-list" role="radiogroup" aria-label="'+e(gl)+'">';
    L.forEach(function(p,i){ var on=cur===p.f, pl=CARD.f===p.f&&CARD.sg===sg, miss=AV.st==='ok'&&!AV.set[p.f];
      h+='<li class="mu-row'+(on?' on':'')+'">'
        +(emb()?'<button type="button" class="mk-pl mu-pl'+(pl?' on':'')+(miss&&!pl?' off':'')+'" data-fk="bedp:'+sg+':'+p.f+'" aria-pressed="'+pl+'"'+(miss&&!pl?' aria-disabled="true"':'')+' aria-label="'+e(p.t)+(pl?' 멈추기':' · 곡만 듣기')+'" onclick="bedAct(\'prev\',\''+p.f+'\',\''+e(k)+'\',\''+sg+'\')">'+(pl?ico('stop'):ico('play'))+'</button>':'')
        +'<button type="button" class="mu-pick" role="radio" aria-checked="'+on+'" tabindex="'+((on||(!cur&&i===0))?0:-1)+'" data-fk="bed:'+sg+':'+p.f+'" onclick="bedAct(\'pick\',\''+p.f+'\',\''+e(k)+'\',\''+sg+'\')"><span class="mu-t">'+e(p.t)+(p.vocal?'<span class="mu-voc"> 노래</span>':'')+'</span><span class="mu-a">'+e([p.src,p.a,p.why].filter(Boolean).join(' · '))+'</span></button></li>'; });
    return h+'</ul><p class="bgm-note bed-note">'+e(noteOf(sg))+'</p>'+(cs&&cs.vocal?'<p class="bgm-note bed-voc">가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요</p>':''); }   /* [BGM_FIX_1030] «노래» · 고른 곡이 노래면 한 줄 */
  /* ② 순간 쪽 «고르기» 칸 — 이 순간이 첫 담긴 순간인 구간마다 «‹순간› 음악» 줄 하나 */
  function rowHtml(k){ var h='';
    CUST.forEach(function(sg){ if(chooser(sg)!==k) return; var gl=labelOf(sg.id)+' 음악'; list();
      h+='<div class="ls-cg cg-vp cg-hl cg-vq ls-bed" role="group" aria-label="'+e(gl)+'" data-seg="'+sg.id+'" data-k="'+e(k)+'"><span class="gl" aria-hidden="true">'+e(gl)+'</span><div class="bed-box" id="'+boxId(sg.id)+'">'+listHtml(sg.id,k)+'</div>'+((emb()&&(typeof _mpHas!=='function'||_mpHas(k)))?'<p class="bgm-note bed-hint">나레이션과 함께 들어 보려면 아래 ‹이 순간 전체 듣기›를 눌러 주세요</p>':'')   /* ★[BED_HINT_WHERE_1031 식순 걷기 1라운드 GPT 11] 단추는 곡 목록 아래 · 단추가 없는 쪽(나레이션 한 줄 · 테이블 인사)에서는 이 줄을 쓰지 않는다 */+'</div>'; });   /* [SONG_CARD_SOLO_1031] 곡 칸 맨 아래 한 줄(작은 글 · 새 색 없음) */
    return h; }
  /* 축사 · 편지 «음악과 함께» 아래 곡 고르기(bgm-form.js 가 그 줄 안에 넣는다) */
  function subHtml(slot,k){ var sg=SUB[slot]; if(!sg||!bedOn(slot)) return ''; list(); return '<div class="bed-box bed-sub" id="'+boxId(sg)+'" data-seg="'+sg+'" data-k="'+e(k)+'">'+listHtml(sg,k)+'</div>'; }
  /* 공개 미리보기 — 이 순간 전체 듣기 아래 한 줄(이 쪽에 곡 줄이 없을 때만 · 곡 줄이 있으면 그 아래 한 줄이 같은 말을 한다) */
  function pubLine(k){ if(emb()) return ''; var sg=segAt(k); if(!sg) return ''; if(CUST.some(function(s){ return chooser(s)===k; })) return '';
    if(/^(free|letter)$/.test(k)&&bedOn(k==='free'?'S5':'S6')) return '';
    return '<p class="mk-ploff bed-pub">음악은 마이페이지에서 함께 들어 볼 수 있어요</p>'; }
  /* ④ 한눈에 보기 — 구간마다 «‹순간› · ‹곡›» / «‹순간› · 고르지 않으시면 ‹1순위›» (축사 · 편지는 bgm-form 이 «음악과 함께» 뒤에 붙인다) */
  function sumOf(sg){ var L=P.list(sg), k=picked(sg), s=k?P.byF(k):L[0]; if(!s) return ''; return (k?'':'고르지 않으시면 ')+'‹'+s.t+'›'; }
  function sumRows(){ var q=seq(), at=function(k){ if(k==='guest') return -1; var i=q.indexOf(k); return i<0?999:i; };   /* [CARD_ORDER_1031] 예식 차례대로(테이블 인사 → 축배 → 닫는 인사) — 구간 목록 차례(닫는 인사 → 축배 → 테이블)로 적던 것 */
    return CUST.filter(function(s){ return !!chooser(s); }).map(function(s){ return { id:s.id, k:chooser(s), t:labelOf(s.id)+' · '+sumOf(s.id) }; }).sort(function(a,b){ return at(a.k)-at(b.k); }); }

  /* 그 칸만 다시(빌더 render() 는 흐르던 소리를 끈다) */
  var RP=0;
  function repaintSoon(){ clearTimeout(RP); RP=setTimeout(repaint,0); }
  function repaint(){ D.querySelectorAll('.ls-bed[data-seg],.bed-sub[data-seg]').forEach(function(box){ var sg=box.getAttribute('data-seg'), k=box.getAttribute('data-k'), ae=D.activeElement, fk=(ae&&box.contains(ae))?ae.getAttribute('data-fk'):null;
      var tgt=box.classList.contains('bed-sub')?box:box.querySelector('.bed-box'); if(!tgt) return; tgt.innerHTML=listHtml(sg,k);
      if(fk){ var f=box.querySelector('[data-fk="'+fk+'"]'); if(f) try{ f.focus({preventScroll:true}); }catch(x){} } });
    try{ if(typeof _mpPaint==='function') _mpPaint(); }catch(x){} }

  /* 누름 — pick(곡 고르기) · prev(곡 카드 ▶) */
  function act(kind,f,k,sg){
    if(kind==='open'){ if(!P.seg(sg)) return; FM()[sg]=0; repaint();   /* [MUSIC_FOLD_1031] «바꾸기» — 그 자리에서 편다 · 이 방문 동안 그대로 · 포커스는 고른 곡 줄로(화면은 움직이지 않는다) */
      var bx=D.getElementById(boxId(sg)), r=bx&&(bx.querySelector('.mu-pick[aria-checked="true"]')||bx.querySelector('.mu-pick')); if(r) try{ r.focus({preventScroll:true}); }catch(x){} return; }
    f=String(f||'').toUpperCase(); var d=P.seg(sg); if(!d||!P.byF(f)||(P.PICKS[sg]||[]).indexOf(f)<0) return;   /* [BGM_FIX_1030] 번호 = 곡마다 하나 → 구간은 누른 줄(data-seg)이 건넨다 */
    if(kind==='prev'){ if(CARD.f===f&&CARD.sg===sg){ stopCard(); return; } if(AV.st==='ok'&&!AV.set[f]){ toast1('이 곡은 아직 준비 중이에요'); return; }
      try{ if(typeof _stopAud==='function') _stopAud(); }catch(x){} try{ if(typeof LP!=='undefined'&&LP.q&&LP.q.length&&typeof lsStop==='function') lsStop(true); }catch(x){} try{ if(window.EntryMusic) EntryMusic.hush(); }catch(x){}
      stopCard(true); card(f,k,sg); return; }
    if(kind!=='pick') return; var S=St(); if(picked(sg)===f){ var bs=D.getElementById(boxId(sg)), hs=bs?bs.offsetHeight:0; FM()[sg]=1; if(CARD.f&&CARD.sg===sg&&CARD.f!==f) stopCard(); repaint(); foldAnim(sg,hs); var cs=D.querySelector('#'+boxId(sg)+' .mu-chg'); if(cs) try{ cs.focus({preventScroll:true}); }catch(x){} return; }   /* [MUSIC_FOLD_PICK_1031] «바꾸기»로 편 뒤 같은 곡을 다시 누르면 그대로 접는다(고른 곡은 그대로) */
    S.bgm=(window.BgmSlots?BgmSlots.clean(S.bgm):S.bgm)||{};
    if(d.slot){ S.bgm[d.slot]={ m:'bed', k:f }; } else S.bgm[sg]={ k:f };
    var bx0=D.getElementById(boxId(sg)), h0=bx0?bx0.offsetHeight:0; FM()[sg]=1; if(CARD.f&&CARD.sg===sg&&CARD.f!==f) stopCard();   /* [MUSIC_FOLD_PICK_1031] 고르면 바로 한 줄 · ★[FOLD_HUSH_1031 2라운드 4] 다른 곡을 듣던 중이면 멈춘다(접힌 줄엔 고른 곡 ▶ 뿐이라 듣던 곡을 멈출 단추가 사라졌다) */
    save(); repaint(); foldAnim(sg,h0); var cb=D.querySelector('#'+boxId(sg)+' .mu-chg'); if(cb) try{ cb.focus({preventScroll:true}); }catch(x){} }   /* 포커스는 «바꾸기»로(키보드로 이어서 · 화면은 움직이지 않는다) */
  /* [MUSIC_FOLD_PICK_1031] 옛 높이 → 새 높이(입장 음악 boxAnim 과 같은 곡선 · 0.34초) · 움직임 줄이기면 바로 */
  var RMB=false; try{ RMB=matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(x){}
  function foldAnim(sg,h0){ var b=D.getElementById(boxId(sg)); if(!b||!h0||RMB) return; var h1=b.offsetHeight; if(Math.abs(h1-h0)<4) return; var fin=false;
    b.style.height=h0+'px'; b.style.overflow='hidden'; void b.offsetHeight; b.style.transition='height .34s cubic-bezier(.22,1,.36,1)'; b.style.height=h1+'px';
    var done=function(){ if(fin) return; fin=true; b.style.height=''; b.style.overflow=''; b.style.transition=''; }; b.addEventListener('transitionend',done,{once:true}); setTimeout(done,520); }

  window.bedAct=act;
  window.BgmBed={ rowHtml:rowHtml, subHtml:subHtml, pubLine:pubLine, sumRows:sumRows, sumOf:sumOf, segAt:segAt,
    on:function(k){ return emb()&&!!songAt(k); }, lpShow:lpShow, lpLead:lpLead, lpGap:lpGap, lpEnd:lpEnd, lpWarm:lpWarm, hush:function(){ if(BED.who==='card') stopCard(); },
    _t:{ AV:AV, BUF:BUF, BED:BED, LPB:LPB, CARD:CARD, lvOf:lvOf, fileFor:function(st){ return fileFor(st); }, vx:vx, folded:function(sg){ return folded(sg); }, chooser:function(id){ return chooser(P.seg(id)); }, eff:eff, songAt:songAt, gainOf:gainOf } };   /* _t = 점검용 */
})();
