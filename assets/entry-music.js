/* ★★[ENTRY_MUSIC_1012 2026-10-12 사장님 «마이페이지 식순 입장 부분에 올려 보자 · 일단 전부 올려 · 지금 오픈 전이니깐»]
   입장 시험실(비공개 · v50)의 «입장 음악»을 실제 빌더(order-preview.html) ② 입장 쪽으로 옮긴 1단계 —
   두 분이 고른 곡 올리기 → 크게 올라오는 자리(찾은 후보 · 앞뒤 들어 보기) → 직접 적기 → 올리기 안내 창.
   · [MUSIC_GONE 2026-08-03 «노래선정부분 완전삭제»]를 «입장» 순간에서만 뒤집는다 — 완성 화면의 곡명 칸(mPeak)은 그대로 없다.
   · 올린 파일은 이 기기 안에서 풀고(서버로 아직 보내지 않는다 · 3단계) 이 기기 IndexedDB 에 둔다(새로고침해도 남게) ·
     고른 곡 이름 · 가수 · 길이 · 고른 자리는 초안 S.mu 에 저장(마이페이지 저장과 함께 서버로 간다).
   · 추천 곡(시험실 카드)은 저장소가 공개라 음원 · 가사를 여기 싣지 않는다 — ★[REC_SONG_1012] 4단계-나: 곡 목록 · 곡은 드라이브에서 로그인한 두 분에게만(아래 «추천 곡» 절).
   · ★★[ENTRY_SCENE_1012] 2단계 «음악과 함께 듣기» — 고르기 칸 바로 아래 장면 칸(그래프 · 긴 알약)이 빌더가 트는 그 입장 목소리(두 분 AI 목소리 · 스튜디오 나레이션)와
     올린 곡을 함께 튼다: 곡은 작게 깔리다가 마지막 말이 끝나는 순간(+0.3초) 고른 자리가 크게 올라온다(시험실 plan · envDb 그대로).
     그 자리에서 듣고(PLAY_INLINE) · 다시 누르면 멈춘 자리를 기억해 «이어 듣기» · 그래프를 누르면 그 자리부터. 크게 보기는 다음 판(2단계-나).
     목소리가 아직 없으면(AI 를 안 만들었다) 알약은 흐리고 누르면 빌더 알림(mkPlayOff · AI_PLAY_READY) — 없는 소리를 그래프로 그리지 않는다.
   시험실 결정은 그대로 옮겼다: [MY_SONG] 분석 · 후보 · 추천 규칙 · [HOOK_TYPE] 직접 적기 · [UP_TIDY] 한 줄 · [UP_LINKS_ONE] 링크 한 줄 ·
   [OWN_PILL_SAME] 적는 칸 = ▶ 알약 · [UP_GUIDE] 안내 창 · [GUIDE_OK] «알겠어요» · [UP_ACCEPT] 확장자만 · [TOAST_MIN] 알림 20자 안 ·
   [SOUND_GRAPH · GRAPH_LEVEL] 그래프 · [SCENE_ROW · SCENE_WAIT5] 장면 줄 · [GRAPH_NO_SEAL_LINE] 진사 세로선 없음 · [PLAYER_ORDER] 알림 → 그래프 → 알약 · [LATE_MUSIC] 늦게 들어오는 판 */
(function(){
  'use strict';
  if(window.EntryMusic) return;
  var D=document;
  var UP_WALK=102, UP_PRE=15, UP_MIN=60, UP_MAX=60*1024*1024, ES=window.EntryScene, SONG_LUFS=ES.SONG_LUFS, BED_TRIM=ES.BED_TRIM;   /* 걷는 시간 = 콘솔 입장 큐 어림(1분 42초) · 앞부분 15초 · 1분 넘는 곡 · 시험실과 같은 값 */
  var UPS=null, UP_ID=0, PREV=null, AC=null, DEC=null, RESTORE=0;
  var EM={ scene:true };   /* [ENTRY_SCENE_1012] 2단계가 들어와 안내 창이 «음악과 함께 듣기로 …» 문장을 말한다 */

  function $(s,r){ return (r||D).querySelector(s); }
  function e(s){ return String(s==null?'':s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;'); }   /* 빌더 esc 는 0 을 빈 글로 바꾼다 — 숫자도 그대로 */
  function clamp(x,a,b){ return x<a?a:x>b?b:x; }
  function db2g(db){ return db<=-89?0:Math.pow(10,db/20); }
  function fmtMS(t){ t=Math.max(0,Math.floor(t)); var r=t%60; return Math.floor(t/60)+':'+(r<10?'0':'')+r; }
  function St(){ return window.S||{}; }
  function save(){ try{ if(typeof _persist==='function') _persist(); }catch(x){} }
  /* 이 칸만 다시 그린다 — 빌더 render() 는 빌더 소리를 끄고(_stopAud) 쪽 전체를 다시 짓는다 · 미리 듣기 ▶ ■ 와 분석 끝은 이 칸 일이다 */
  function redraw(){ var box=D.querySelector('.ls-mu .mu-box'); if(!box) return; var ae=D.activeElement, fk=(ae&&box.contains(ae))?ae.getAttribute('data-fk'):null, s0=null, s1=null, oc=box.querySelector('.mu-car');
    if(ae&&ae.id==='muOwn'){ try{ s0=ae.selectionStart; s1=ae.selectionEnd; }catch(x){} }
    box.innerHTML=boxHtml(); carKeep(oc);   /* [REC_SONG_1012] 칩이 고른 쪽 카드(올린 곡 · 추천 곡) · 같은 카드 묶음은 다시 꽂는다 */
    if(fk&&!box.contains(D.activeElement)){ var n=box.querySelector('[data-fk="'+fk+'"]'); if(n){ try{ n.focus({preventScroll:true}); if(n.id==='muOwn'&&s0!=null) n.setSelectionRange(s0,s1); }catch(x){} } }
    sceneSync(); }   /* [ENTRY_SCENE_1012] 곡 · 자리가 바뀌면 바로 아래 장면 칸도(곡을 올리면 생기고 · 빼면 없어진다) */
  function renderAll(){ try{ if(typeof render==='function') render(); }catch(x){} }
  function toast(m){ try{ if(typeof _noteToast==='function') _noteToast(m); }catch(x){} }   /* [NOTE_TOAST] 빌더 아래 알림 한 줄 */
  function owner(){ try{ return (typeof _who==='string'&&_who)?_who:'local'; }catch(x){ return 'local'; } }

  /* ── 소리 ── */
  function ac(){ if(AC) return AC; var C=window.AudioContext||window.webkitAudioContext; AC=new C({latencyHint:'playback'}); return AC; }
  function wake(){ var a=ac(); try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(x){} try{ if(a.state!=='running') a.resume(); }catch(x){} return a; }   /* 아이폰 무음 스위치에도 들리게 */
  function decoder(){ if(DEC) return DEC; var O=window.OfflineAudioContext||window.webkitOfflineAudioContext; DEC=new O(1,1,48000); return DEC; }
  function decode(ab){ return new Promise(function(ok,no){ try{ var p=decoder().decodeAudioData(ab,ok,no); if(p&&p.then) p.then(ok,no); }catch(x){ no(x); } }); }
  var mono=ES.mono, lufsOf=ES.lufsOf, peakOf=ES.peakOf;   /* [ENTRY_SCENE_ENGINE] 소리 크기 · 봉우리는 엔진 한 곳(entry-scene.js) — 당일 콘솔과 같은 자 */
  function p20(x,sr){ var hop=Math.max(1,Math.round(sr/20)), n=Math.ceil(x.length/hop), r=new Float32Array(n); for(var i=0;i<n;i++){ var m=0, en=Math.min(x.length,(i+1)*hop); for(var j=i*hop;j<en;j++){ var v=x[j]<0?-x[j]:x[j]; if(v>m) m=v; } r[i]=m; } return r; }
  /* 하이라이트 후보 — 뒤 6초가 앞 8초보다 커지고 곡 전체보다도 큰 곳 + 그 순간 확 커지는 정도 · 10초 이상 떨어진 셋 · 박(10ms)까지 당겨 맞춘다(시험실 hookCands 그대로) */
  function hookCands(x,sr){ var hop=Math.round(sr*0.05), n=Math.floor(x.length/hop); if(n<400) return [];
    var en=new Float64Array(n); for(var i=0;i<n;i++){ var q=0, s0=i*hop; for(var j=s0;j<s0+hop;j++) q+=x[j]*x[j]; en[i]=q/hop; }
    var P=new Float64Array(n+1); for(var k=0;k<n;k++) P[k+1]=P[k]+en[k];
    var mean=function(a,b){ a=clamp(a,0,n); b=clamp(b,0,n); return b>a?(P[b]-P[a])/(b-a):1e-12; }, dB=function(v){ return 10*Math.log(v+1e-12)/Math.LN10; };
    var glob=dB(mean(0,n)), top=-200, sc=[];
    for(var u=0;u<n-120;u+=4) top=Math.max(top,dB(mean(u,u+120)));
    for(var t=160;t<n-200;t++){ var aft=dB(mean(t,t+120)), bef=dB(mean(t-160,t-10)), hit=clamp(dB(mean(t,t+6))-dB(mean(t-12,t-2)),0,12); sc.push([t,(aft-bef)+1.2*(aft-glob)+0.3*hit-0.8*Math.max(0,top-aft-3)]); }
    sc.sort(function(a,b){ return b[1]-a[1]; }); var picks=[];
    for(var z=0;z<sc.length&&picks.length<3;z++){ var c=sc[z]; if(c[1]<2) break; if(picks.every(function(p){ return Math.abs(p-c[0])>=200; })) picks.push(c[0]); }
    return picks.map(function(p){ return onset(x,sr,p*hop/sr); }); }
  function onset(x,sr,t){ var fr=Math.round(sr*0.01), a=Math.max(0,Math.round((t-0.12)*sr)), b=Math.min(x.length-fr,Math.round((t+0.12)*sr)), best=t, bv=-1, prev=[];
    for(var s=a;s<b;s+=fr){ var q=0; for(var j=s;j<s+fr;j++) q+=x[j]*x[j]; q/=fr; var m=prev.length?prev.reduce(function(u,v){ return u+v; },0)/prev.length:q; var jump=q-m*1.6; if(jump>bv){ bv=jump; best=s/sr; } prev.push(q); if(prev.length>8) prev.shift(); }
    return Math.round(best*100)/100; }
  function prepSong(buf){ var o=ES.prepSong(buf), x=o.x; delete o.x; o.cands=hookCands(x,o.sr); o.p20=p20(x,o.sr); return o; }   /* [ENTRY_SCENE_ENGINE] 크기는 엔진 · 자리 찾기는 이 칸 */
  function upLoud(Sg){ var p=Sg.p20, w=120, sum=0, best=-1, bi=0; for(var i=0;i<p.length;i++){ sum+=p[i]; if(i>=w) sum-=p[i-w]; if(i>=w-1&&sum>best){ best=sum; bi=i-w+1; } } return Math.round(bi/20*100)/100; }
  /* 후보 — 찾기 점수 순서 그대로 두고 규칙(걷는 동안 이어짐 · 앞부분 15초)을 지키는 첫 후보가 «추천» · 없으면 뒤가 가장 긴 후보 · 화면은 시간 순서 */
  function upCands(Sg){ var raw=(Sg.cands&&Sg.cands.length?Sg.cands:[upLoud(Sg)]).filter(function(t,i,a){ return a.indexOf(t)===i; }), L=raw.map(function(t){ return {t:t,after:Sg.dur-t}; }), rec=null;
    L.forEach(function(c){ if(!rec&&c.after>=UP_WALK&&c.t>=UP_PRE) rec=c; });
    if(!rec) L.forEach(function(c){ if(c.t>=UP_PRE&&(!rec||c.after>rec.after)) rec=c; });
    (rec||L[0]).rec=true; return L.sort(function(a,b){ return a.t-b.t; }); }
  function upNote(c){ return (c.rec?'추천 · ':c.own?'직접 적은 자리 · ':'')+(c.after<UP_WALK?'걷는 중에 곡이 끝나요':'걷는 동안 곡이 이어져요'); }
  function upName(f){ var x=String(f||'').replace(/\.[a-z0-9]{2,5}$/i,'').replace(/[_]+/g,' ').replace(/\s+/g,' ').trim(); return x.slice(0,40)||'내 곡'; }
  /* 곡 이름 · 가수 — MP3(ID3v2 TIT2 · TPE1) · FLAC(TITLE · ARTIST) · 없으면 파일 이름 */
  function upTags(ab){ var out={}; try{ var u=new Uint8Array(ab), td=function(enc,b){ try{ return new TextDecoder(enc).decode(b); }catch(x){ return ''; } }, cl=function(x){ return String(x||'').replace(/\u0000/g,' ').replace(/\s+/g,' ').trim().slice(0,60); };
    if(u[0]===0x49&&u[1]===0x44&&u[2]===0x33){ var v=u[3], ss=function(o){ return (u[o]&127)<<21|(u[o+1]&127)<<14|(u[o+2]&127)<<7|(u[o+3]&127); }, end=Math.min(u.length,10+ss(6)), p=10;
      if(u[5]&0x40) p+=v===4?ss(10):((u[10]<<24|u[11]<<16|u[12]<<8|u[13])+4);
      while(p+10<=end){ var id=String.fromCharCode(u[p],u[p+1],u[p+2],u[p+3]); if(!/^[A-Z0-9]{4}$/.test(id)) break; var n=v===4?ss(p+4):(u[p+4]<<24|u[p+5]<<16|u[p+6]<<8|u[p+7]); if(n<=0||p+10+n>end) break;
        if(id==='TIT2'||id==='TPE1'){ var en=u[p+10], b=u.subarray(p+11,p+10+n), tx=en===0?td('iso-8859-1',b):en===3?td('utf-8',b):en===2?td('utf-16be',b):(b[0]===0xFE&&b[1]===0xFF?td('utf-16be',b.subarray(2)):td('utf-16le',b[0]===0xFF&&b[1]===0xFE?b.subarray(2):b)); tx=cl(tx); if(tx) out[id==='TIT2'?'t':'a']=tx; }
        p+=10+n; } }
    else if(u[0]===0x66&&u[1]===0x4C&&u[2]===0x61&&u[3]===0x43){ var q=4, last=false; while(!last&&q+4<=u.length){ last=!!(u[q]&128); var ty=u[q]&127, ln=u[q+1]<<16|u[q+2]<<8|u[q+3], d0=q+4;
        if(ty===4&&d0+ln<=u.length){ var dv=new DataView(ab,d0,ln), o=4+dv.getUint32(0,true), cnt=dv.getUint32(o,true); o+=4; for(var j=0;j<cnt&&o+4<=ln;j++){ var l=dv.getUint32(o,true); o+=4; var m=/^(TITLE|ARTIST)=([\s\S]*)$/i.exec(td('utf-8',u.subarray(d0+o,d0+o+l))); o+=l; if(m){ var k2=m[1].toUpperCase()==='TITLE'?'t':'a'; if(!out[k2]) out[k2]=cl(m[2]); } } }
        q=d0+ln; } } }catch(x){} return out; }

  /* ── 이 기기에 곡 파일 두기(IndexedDB · 빌더 me-ritual-files 와 같은 꼴 · 계정마다 한 곡) ── */
  function db(){ return new Promise(function(ok,no){ try{ var q=indexedDB.open('me-entry-song',1); q.onupgradeneeded=function(){ q.result.createObjectStore('f'); }; q.onsuccess=function(){ ok(q.result); }; q.onerror=function(){ no(q.error); }; }catch(x){ no(x); } }); }
  function fPut(blob){ var k=owner(); return db().then(function(d){ return new Promise(function(ok){ var t=d.transaction('f','readwrite'); t.objectStore('f').put(blob,k); t.oncomplete=function(){ ok(); }; t.onerror=function(){ ok(); }; }); }).catch(function(){}); }
  function fGet(){ var k=owner(); return db().then(function(d){ return new Promise(function(ok){ var q=d.transaction('f').objectStore('f').get(k); q.onsuccess=function(){ ok(q.result||null); }; q.onerror=function(){ ok(null); }; }); }).catch(function(){ return null; }); }
  function fDel(){ var k=owner(); return db().then(function(d){ d.transaction('f','readwrite').objectStore('f').delete(k); }).catch(function(){}); }

  /* ── ★★[ENTRY_SONG_UP 2026-10-12] 3단계-가 올린 곡을 스튜디오로 — 두 분 목소리 파일과 같은 길(마이페이지 → GAS handleRitualFile · 자리 mu · 드라이브 · 공개 주소 없음) ──
     마이페이지 안(EMBED)에서만 보낸다 · 서버 한도(GP_MAX_FILE_MB 20MB)를 넘으면 보내지 않고 카드에 한 줄로 알린다.
     보낸 파일 id 는 초안 S.mu.fid — 당일 콘솔이 이 id 로 미리 받는다(3-나) · 다른 기기에서는 이 id 로 다시 받아 같은 자리를 되살린다.
     곡 번호(S.mu.sid)로 «같은 곡»을 알아본다 — 자리만 바꾸면 파일 그대로 · 다른 곡이면 옛 파일을 지운다 · 빼면 서버 파일도 지운다(서버가 그 자리의 더 옛 사본까지 쓴다 · RF_DEL_SLOT).
     빌더의 줄 파일 답장(_mkUpDone · _rfData · _rfDelDone)은 mu 를 건너뛴다 — 이 칸이 받는다 */
  var SRV_MAX=20*1024*1024, SV={st:'',tk:0,sid:'',err:'',file:null}, SG={id:'',err:'',timer:null};
  function newSid(){ return Date.now().toString(36)+Math.random().toString(36).slice(2,8); }
  function emb(){ try{ return typeof EMBED!=='undefined'&&!!EMBED&&window.parent&&window.parent!==window; }catch(x){ return false; } }
  function post(type,data){ try{ window.parent.postMessage({type:type,data:data},window.location.origin); return true; }catch(x){ return false; } }
  function mimeOf(f){ var t=String(f&&f.type||'').toLowerCase(); if(/^audio\/[a-z0-9.+-]+$/.test(t)) return t; var x=/\.([a-z0-9]+)$/i.exec(f&&f.name||''), M={mp3:'audio/mpeg',m4a:'audio/mp4',aac:'audio/aac',wav:'audio/wav',flac:'audio/flac'}; return (x&&M[x[1].toLowerCase()])||'audio/mpeg'; }   /* 아이폰은 m4a 의 type 을 비워 줄 때가 있다 — 서버는 audio/* 만 받는다 */
  function codeOf(d,L){ var c=String(d&&d.ecode||'').trim(); if(/^[A-Z]\d$/.test(c)) return c; var m=/\(코드 ([A-Z]\d)/.exec(String(d&&d.error||'')); return m?m[1]:L+'0'; }
  function svReset(){ SV.tk++; SV.st=''; SV.err=''; SV.file=null; SV.sid=''; }   /* 가는 중인 것은 도착하면 지운다(번호가 안 맞는다) */
  function srvUp(f){ var mu=upRec(); if(!emb()||!f||!mu) return;   /* [REC_SONG_1012] 올린 곡 기록 — 고른 곡이면 S.mu · 추천 곡을 고른 동안은 S.muUp */
    if(f.size>SRV_MAX){ SV.tk++; SV.st='big'; SV.sid=mu.sid; SV.err=''; SV.file=null; redraw(); return; }
    var tk=++SV.tk; SV.st='up'; SV.sid=mu.sid; SV.err=''; SV.file=f; redraw();
    var rd=new FileReader();
    rd.onload=function(){ if(SV.tk!==tk) return; if(!post('momentedit:ritualFile',{key:'mu',tk:tk,name:String(f.name||'내 곡').slice(0,80),mime:mimeOf(f),src:'up',data:String(rd.result)})){ SV.st='fail'; SV.err='U6'; redraw(); } };
    rd.onerror=function(){ if(SV.tk!==tk) return; SV.st='fail'; SV.err='M6'; redraw(); };   /* 이 기기가 파일을 못 읽었다(M = 기기) */
    rd.readAsDataURL(f); }
  function srvDel(id){ if(emb()&&id) post('momentedit:ritualFileDel',{key:'mu',id:id}); }
  function srvGet(mu){ if(!emb()||!mu||!mu.fid) return; SG.id=mu.fid; SG.err=''; UPS={busy:true,dl:true,name:mu.t||mu.name||'내 곡',prev:null}; redraw();
    clearTimeout(SG.timer); SG.timer=setTimeout(function(){ if(SG.id!==mu.fid||!(UPS&&UPS.dl)) return; SG.id=''; SG.err='L5'; UPS=null; RESTORE=2; redraw(); },200000);   /* 마이페이지가 180초 기다린다 — 그보다 조금 더 */
    post('momentedit:ritualFileGet',{key:'mu',id:mu.fid}); }
  function b64Blob(b64,mime){ if(typeof _b64Blob==='function') return _b64Blob(b64,mime); var bin=atob(b64), u=new Uint8Array(bin.length); for(var i=0;i<bin.length;i++) u[i]=bin.charCodeAt(i); return new Blob([u],{type:mime||'audio/mpeg'}); }
  window.addEventListener('message',function(ev){ var d=ev&&ev.data; if(!d||ev.origin!==window.location.origin||d.key!=='mu') return;
    if(d.type==='momentedit:ritualFileDone'){
      if(+d.tk!==SV.tk||SV.st!=='up'){ if(d.ok&&d.id) srvDel(d.id); return; }   /* 그사이 곡을 빼거나 바꿨다 — 늦게 닿은 파일은 지운다 */
      var mu=upRec(); if(!d.ok){ SV.st='fail'; SV.err=codeOf(d,'U'); redraw(); return; }
      if(!mu||mu.sid!==SV.sid){ srvDel(d.id); svReset(); redraw(); return; }
      var old=mu.fid; mu.fid=d.id; mu.fat=String(d.at||''); save(); SV.st=''; SV.err=''; SV.file=null; if(old&&old!==d.id) srvDel(old); toast('스튜디오로 보냈어요'); redraw(); return; }
    if(d.type==='momentedit:ritualFileData'){ if(!SG.id||d.id!==SG.id) return; SG.id=''; clearTimeout(SG.timer); var mu2=upRec();
      if(!d.ok||!d.data||!mu2||mu2.fid!==d.id){ SG.err=codeOf(d,'L'); UPS=null; RESTORE=2; redraw(); return; }
      var b, f; try{ b=b64Blob(d.data,d.mime||'audio/mpeg'); f=new File([b],(mu2.name||'내 곡')+'.mp3',{type:b.type||'audio/mpeg'}); }catch(x){ SG.err='M6'; UPS=null; RESTORE=2; redraw(); return; }
      fPut(f); UPS=null; analyze(f,true,mu2).then(function(){ RESTORE=2; if(UPS&&UPS.Sg){ UPS.meta.t=mu2.t||UPS.meta.t; UPS.meta.a=mu2.a||UPS.meta.a; } redraw(); }); return; }
    /* 지우기 답(ritualFileDelDone)은 듣지 않는다 — 못 지운 사본은 예식 30일 뒤 폴더째 지워진다(purgeRitualFiles) */
  });
  /* 카드 안 한 줄 — 보내는 중(상태) · 못 보냄(까닭 + 다시 보내기) · 20MB 넘음 / 이 기기로 못 받음(다시 불러오기) */
  function svLine(){ var mu=upRec(); if(!emb()||!mu||SV.sid!==mu.sid) return '';
    if(SV.st==='up') return '<p class="mu-cs mu-sv" role="status">스튜디오로 보내는 중이에요</p>';
    if(SV.st==='big') return '<p class="mk-exw mu-sv">20MB가 넘어 스튜디오로 보내지 못했어요 · <span class="mu-nw">MP3로 올려 주세요</span></p>';
    if(SV.st==='fail') return '<p class="mk-exw mu-sv" role="alert">스튜디오로 보내지 못했어요 · <span class="mu-nw"><button type="button" class="pk-link" data-fk="musvagain" onclick="emAct(\'svagain\',this)">다시 보내기</button> (코드 '+e(SV.err||'U0')+')</span></p>';
    return ''; }
  function sgLine(){ return SG.err&&emb()?'<p class="mk-exw mu-sv" role="alert">곡을 불러오지 못했어요 · <span class="mu-nw"><button type="button" class="pk-link" data-fk="musvget" onclick="emAct(\'svget\',this)">다시 불러오기</button> (코드 '+e(SG.err)+')</span></p>':''; }

  /* ── 올린 곡 ── */
  function upCur(){ return UPS&&UPS.Sg?UPS:(UPS&&UPS.prev)||null; }   /* 다른 곡을 살펴보는 동안에도 고른 곡은 그대로 */
  function upList(u){ return u?u.cands.concat(u.own?[u.own]:[]):[]; }   /* [HOOK_TYPE] 찾은 자리 + 직접 적은 자리(하나) — pick 은 이 목록의 번호 */
  /* [REC_SONG_1012] 올린 곡 기록 — 고른 곡이면 S.mu · 추천 곡을 고른 동안(또는 추천 곡을 풀어 아무것도 안 고른 동안)은 S.muUp 에 비켜 둔다(서버 파일 · 고른 자리 그대로 · 다시 고르면 돌아온다) */
  function upRec(){ var s=St(); return (s.mu&&s.mu.src==='up')?s.mu:(s.muUp&&s.muUp.src==='up')?s.muUp:null; }
  function upOn(){ var mu=St().mu; return !!(mu&&mu.src==='up'); }
  function keep(u){ var c=upList(u)[u.pick]||upList(u)[0]; var s=St(), pv=upRec(); s.mu={src:'up',name:u.name,t:u.meta.t,a:u.meta.a,dur:Math.round(u.Sg.dur*10)/10,hook:c?c.t:null,typed:(c&&c.own)?c.typed:null,sid:u.sid||(pv&&pv.sid)||newSid()};
    if(pv&&pv.fid){ if(pv.sid===s.mu.sid){ s.mu.fid=pv.fid; s.mu.fat=pv.fat; } else srvDel(pv.fid); }   /* [ENTRY_SONG_UP] 같은 곡(자리만 바꿈)이면 스튜디오 파일 그대로 · 다른 곡이면 옛 파일은 지운다 */
    delete s.muUp; SRC='up'; save(); scReset(); }   /* 스튜디오가 볼 것 = 곡 · 고른 자리 · [ENTRY_SCENE_1012] 곡 · 자리가 바뀌면 듣던 장면은 걷는다(멈춘 자리도) · [REC_SONG_1012] 고른 곡은 하나(추천 곡을 골랐었다면 이 곡으로 바뀐다) */
  function analyze(f,quiet,want){ var id=++UP_ID, was=upCur(), nm=upName(f.name||''); hush(); UPS={busy:true,name:nm,prev:was}; redraw();
    return f.arrayBuffer().then(function(ab){ var tg=upTags(ab); return decode(ab).then(function(b){ return {b:b,tg:tg}; }); }).then(function(r){ if(id!==UP_ID) return;
      if(!r.b||r.b.duration<UP_MIN){ UPS=was; redraw(); toast('1분 넘는 곡으로 골라 주세요'); return; }
      var Sg=prepSong(r.b), L=upCands(Sg), pk=0; L.forEach(function(c,j){ if(c.rec) pk=j; });
      var u={name:nm,Sg:Sg,cands:L,pick:pk,own:null,ownTxt:'',meta:{t:r.tg.t||nm,a:r.tg.a||''},sid:quiet?((want&&want.sid)||''):newSid()};
      if(want&&want.hook!=null){ var hit=-1; L.forEach(function(c,j){ if(Math.abs(c.t-want.hook)<0.06) hit=j; });   /* 새로고침 — 고른 자리 그대로 */
        if(hit>=0) u.pick=hit; else if(want.hook<Sg.dur-5){ u.own={t:want.hook,typed:want.typed!=null?want.typed:want.hook,after:Sg.dur-want.hook,own:true}; u.ownTxt=fmtMS(u.own.typed); u.pick=L.length; } }
      UPS=u; if(!quiet){ fPut(f); keep(u); toast(fmtMS(upList(u)[u.pick].t)+'에 맞췄어요'); srvUp(f); } redraw();
    }).catch(function(){ if(id!==UP_ID) return; UPS=was; redraw(); if(!quiet) toast('MP3 · M4A만 열 수 있어요'); }); }   /* [TOAST_MIN] 종전 «… 파일만 열 수 있어요» 21자 */
  function upLoad(f){ if(!f) return; if(f.size>UP_MAX){ toast('60MB 아래 파일로 골라 주세요'); return; } analyze(f,false,null); }
  function upDel(){ ++UP_ID; hush(); UPS=null; var s=St(), r=upRec(), fid=r&&r.fid; if(upOn()){ scReset(); delete s.mu; } delete s.muUp; save(); fDel(); svReset(); if(fid) srvDel(fid); redraw(); toast('올린 곡을 뺐어요'); }   /* [ENTRY_SONG_UP] 스튜디오 파일도 지운다 · [REC_SONG_1012] 추천 곡을 고른 채면 그 곡은 그대로 */
  /* [HOOK_TYPE] 분:초 · 폰 숫자 자판에는 «:»이 없어 숫자만 적어도 읽는다(105 → 1:05 · 두 자리까지는 초) · 0:00 부터 곡 끝 5초 전까지 · 적은 때에서 1초 안 가장 크게 커지는 곳으로 당겨 맞춘다 */
  function upParse(s){ s=String(s||'').replace(/\s+/g,'').replace(/：/g,':'); if(!s) return null; var m=/^(\d{1,3})[:.,](\d{1,2})$/.exec(s), mi, se;
    if(m){ mi=+m[1]; se=+m[2]; } else if(/^\d{1,4}$/.test(s)){ var n=+s; if(s.length<=2) return {t:n}; mi=Math.floor(n/100); se=n%100; } else return null;
    if(se>59) return {err:'초는 59까지 적어 주세요'}; return {t:mi*60+se}; }
  function upSnap(Sg,t){ var p=Sg&&Sg.p20; if(!p||!p.length) return t; var a=Math.max(6,Math.floor((t-0.25)*20)), b=Math.min(p.length-1,Math.ceil((t+1)*20)), bi=-1, br=0;
    for(var i=a;i<=b;i++){ var pre=0; for(var j=i-6;j<i;j++) if(p[j]>pre) pre=p[j]; var r=p[i]/Math.max(pre,1e-4); if(r>br){ br=r; bi=i; } }
    return bi>=0&&br>=1.25?Math.round(bi*5)/100:t; }
  function upOwnSet(txt){ var uc=upCur(); if(!uc) return false; var r=upParse(txt);
    if(!r){ toast('분:초로 적어 주세요'); return false; } if(r.err){ toast(r.err); return false; }
    if(r.t>uc.Sg.dur-5){ toast('곡 길이 안에서 적어 주세요'); return false; }
    var ts=upSnap(uc.Sg,r.t); uc.own={t:ts,typed:r.t,after:uc.Sg.dur-ts,own:true}; uc.ownTxt=fmtMS(r.t); uc.pick=upList(uc).length-1; keep(uc); redraw(); toast(fmtMS(r.t)+'에 맞췄어요'); return true; }

  /* ── 미리 듣기(이 칸만의 소리 · 빌더 소리와 겹치지 않게) ── */
  function quietOthers(){ try{ _stopAud(); }catch(x){} try{ _stopMkOnly(); }catch(x){} try{ _lpHush(); }catch(x){} }
  function _stopMkOnly(){ if(typeof MK!=='undefined'&&MK.aud){ var a=MK.aud; MK.aud=null; MK.audKey=null; a.onended=null; try{ a.pause(); }catch(x){} } }   /* _stopMk 는 이 칸 소리도 끈다(아래 hush 연결) — 여기선 빌더 소리만 */
  function hush(){ var w=PWANT; PWANT=null; PTK++; var p=PREV; PREV=null; if(!p){ if(w) paintCar(); return !!w; } clearTimeout(p.timer); clearTimeout(p.lt); try{ p.src.stop(); }catch(x){} setTimeout(function(){ try{ p.g.disconnect(); }catch(x){} },60); if(p.k){ lyRest(); paintCar(); } return true; }   /* [REC_SONG_1012] 받는 중인 추천 곡(PWANT)도 여기서 걷는다 */
  /* 올린 곡 줄 ▶ = 음악만 듣기(킬링 포인트 12초 앞부터 1분 · 추천 곡 카드 ▶ 와 같은 값 CAR_PRE · CAR_LEN · [PREV_12_60_1013]) · 자리 ▶ = 앞뒤 들어 보기(8초 앞부터 16초) */
  function play(key,h,pre,len,o){ var u=o||upCur(); if(!u||!u.Sg) return; var was=PREV&&PREV.key===key; hush(); if(was){ redraw(); return; } quietOthers(); scHalt();   /* [ENTRY_SCENE_1012] 소리 하나 — 장면은 그 자리에 멈춘다(이어 듣기) · [REC_SONG_1012] o = 추천 곡(받아 푼 것) */
    var a=wake(), Sg=u.Sg, so=Sg.o||0, en=Sg.end!=null?Sg.end:Sg.dur, t0=a.currentTime+0.08, x0=Math.max(so,h-pre), d=Math.min(en-x0,len), lv=Sg.gain*db2g(BED_TRIM);   /* [REC_CLIP_1013] x0 · 가사는 원곡 시각 · 짧은 판이면 판 안 자리로 */
    var src=a.createBufferSource(); src.buffer=Sg.buf; var g=a.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(lv,t0+0.5); g.gain.setValueAtTime(lv,t0+Math.max(0.6,d-1.2)); g.gain.linearRampToValueAtTime(0.0001,t0+d);
    src.connect(g); g.connect(a.destination); if(u.rec) eqTap(g); try{ src.start(t0,x0-so,d); }catch(x){}
    var p={key:key,src:src,g:g,k:u.rec?u.k:null,t0:t0,x0:x0,H:h,d:d,lyI:-2,lyF:null}; p.timer=setTimeout(function(){ if(PREV===p){ PREV=null; if(p.k){ lyRest(); paintCar(); } else redraw(); } },d*1000+250);
    if(p.k) p.lt=setTimeout(function(){ if(PREV!==p) return; p.lit=true; paintCar(); },Math.max(0,(t0+(h-x0)+(a.outputLatency||0)-a.currentTime)*1000));   /* [MUS_CAROUSEL] 크게 올라오는 그 순간(들리는 때 · 출력 지연까지) 사진이 밝아진다 */
    PREV=p; if(p.k){ paintCar(); eqKick(); } else redraw(); }
  D.addEventListener('visibilitychange',function(){ if(!D.hidden) return; if(hush()) redraw(); scHalt(); });   /* [ENTRY_SCENE_1012] 화면을 떠나면 장면도 그 자리에 멈춘다(시험실 AC_LIFE · HIDE_PEND) */

  /* ── 화면 ── */
  var ICO_PLUS='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><path d="M12 5v14M5 12h14"/></svg>';
  function ico(n){ try{ return n==='stop'?ICO_STOP:n==='check'?ICO_CHECK:ICO_PLAY; }catch(x){ return ''; } }   /* 빌더 그림 그대로 */
  /* ★[UP_ACCEPT 2026-10-10] 아이폰 사파리는 파일 칸을 누르면 «사진 보관함 · 비디오 촬영 · 파일 선택» 메뉴를 늘 띄운다 — accept 는 확장자만 · 아이폰 · 아이패드에만 한 줄 */
  var IOS_DEV=(function(){ try{ var ua=navigator.userAgent||''; if(/iPhone|iPod/.test(ua)) return '아이폰은'; if(/iPad/.test(ua)||(navigator.platform==='MacIntel'&&navigator.maxTouchPoints>1)) return '아이패드는'; }catch(x){} return ''; })();
  function upHint(){ return '<span class="mu-uphint">MP3 · M4A</span>'+(IOS_DEV?'<span class="mu-uphint mu-ios">'+IOS_DEV+' ‹파일 선택›에서 골라요</span>':''); }
  function fileInput(){ var fi=D.getElementById('muUpFile'); if(fi) return fi; fi=D.createElement('input'); fi.type='file'; fi.id='muUpFile'; fi.className='sr-only'; fi.accept='.mp3,.m4a,.aac,.wav,.flac'; fi.tabIndex=-1; fi.setAttribute('aria-hidden','true');
    fi.addEventListener('change',function(){ var f=fi.files&&fi.files[0]; if(f) upLoad(f); }); D.body.appendChild(fi); return fi; }   /* 파일 칸은 화면 밖(body)에 하나 — 다시 그려도 고르는 중인 칸이 사라지지 않게 */
  function upPick(){ var fi=fileInput(); fi.value=''; fi.click(); }
  /* [PRESSED_BOOL] aria-pressed 는 늘 true · false(재생이 없을 때 null 이 찍히지 않게 · 시험실 10-10 과 같은 고침) */
  function card(){ var u=UPS, c0=upCur(), busy=u&&u.busy?'<p class="mu-upbusy" role="status">‹'+e(u.name)+'› '+(u.dl?'불러오는 중이에요':'살펴보는 중이에요')+'</p>':'', mu=upRec(), on=upOn();   /* [REC_SONG_1012] on = 올린 곡이 고른 곡 · 아니면(추천 곡을 고름) 곡 줄만 · 누르면 다시 이 곡 */
    if(!c0&&u&&u.dl) return '<div class="mu-up mu-card">'+busy+'</div>';   /* [ENTRY_SONG_UP] 스튜디오에 보낸 곡을 받는 동안 — «곡 파일 올리기»를 같이 두면 다시 올려야 하나 헷갈린다 */
    if(!c0){ var kept=(mu&&on&&!busy&&RESTORE===2)?'<p class="mu-cs on">‹'+e(mu.t||mu.name)+'› · '+fmtMS(mu.typed!=null?mu.typed:mu.hook||0)+'에 맞춰 두었어요</p>':'';   /* 이 기기에 파일이 없을 때(다른 기기 · 지운 저장소) — 고른 것은 남아 있다 */
      return '<div class="mu-up mu-card">'+(busy||kept+sgLine()+'<p class="mu-cs">곡 파일을 올리면 크게 올라오는 자리를 찾아 마지막 말에 맞춰요</p>')
        +'<div class="mk-sech mk-sech-r mu-upgo"><button type="button" class="mk-hbtn" data-fk="muupopen" onclick="emAct(\'upopen\',this)">'+ICO_PLUS+' 곡 파일 올리기</button></div>'+upHint()+'</div>'; }
    var m=c0.meta, sub=(m.a?m.a+' · ':'')+fmtMS(c0.Sg.dur), pl=!!(PREV&&PREV.key==='up'), h='<div class="mu-up mu-card on">'+busy;
    h+='<ul class="mu-list mu-mine" role="radiogroup" aria-label="내 곡"><li class="mu-row'+(on?' on':'')+'"><button type="button" class="mk-pl mu-pl'+(pl?' on':'')+'" data-fk="muprev" aria-pressed="'+pl+'" aria-label="'+e(m.t)+' 음악만 '+(pl?'멈추기':'듣기')+'" onclick="emAct(\'prev\',this)">'+(pl?ico('stop'):ico('play'))+'</button>'
      +'<button type="button" class="mu-pick" role="radio" aria-checked="'+on+'" tabindex="0" data-fk="musong"'+(on?'':' onclick="emAct(\'upuse\',this)"')+'><span class="mu-t">'+e(m.t)+'</span><span class="mu-a">'+e(sub)+'</span></button></li></ul>'+svLine();   /* [ENTRY_SONG_UP] 곡 줄 바로 아래 — 보내는 중 · 못 보냄 · [REC_SONG_1012] 안 고른 곡이면 누르면 이 곡으로 */
    if(!on) return h+'<div class="mu-upft"><button type="button" class="pk-link" data-fk="muupagain" onclick="emAct(\'upopen\',this)">다른 곡 올리기</button><span aria-hidden="true">·</span><button type="button" class="pk-link" data-fk="muupdel" onclick="emAct(\'updel\',this)">빼기</button></div></div>';   /* [REC_SONG_1012] 고른 곡이 아니면 자리 · 직접 적기 · «맞추기»는 숨긴다(시험실 renderUp 그대로) */
    h+='<p class="mu-hkt">크게 올라오는 자리</p><ul class="mu-list mu-hks" role="radiogroup" aria-label="크게 올라오는 자리">'+upList(c0).map(function(c,i){ var ck=i===c0.pick, p2=!!(PREV&&PREV.key==='up#'+i), lb=fmtMS(c.typed!=null?c.typed:c.t);
      return '<li class="mu-row'+(ck?' on':'')+'"><button type="button" class="mk-pl mu-pl'+(p2?' on':'')+'" data-fk="muhkp:'+i+'" aria-pressed="'+p2+'" aria-label="'+lb+' 앞뒤 '+(p2?'멈추기':'들어 보기')+'" onclick="emAct(\'hookprev\','+i+')">'+(p2?ico('stop'):ico('play'))+'</button>'
        +'<button type="button" class="mu-pick" role="radio" aria-checked="'+ck+'" tabindex="'+(ck?0:-1)+'" data-fk="muhk:'+i+'" onclick="emAct(\'hookpick\','+i+')"><span class="mu-t">'+lb+'</span><span class="mu-a">'+e(upNote(c))+'</span></button></li>'; }).join('')+'</ul>'
      /* ★★[UP_TIDY 2026-10-11] 직접 적기 = 후보 줄과 같은 한 줄 · 적는 칸 = ▶ 알약 자리([OWN_PILL_SAME] 같은 크기 · 같은 금빛 테) · 이름표가 칸의 이름(누르면 칸으로) */
      +'<div class="mu-own"><input id="muOwn" class="tin" type="text" inputmode="numeric" autocomplete="off" enterkeyhint="done" maxlength="6" placeholder="0:00" data-fk="muown" value="'+e(c0.ownTxt||'')+'" oninput="emAct(\'owntxt\',this)">'
      +'<label class="mu-ownl" for="muOwn"><span class="mu-t">직접 적기</span><span class="mu-a">분:초 · 이 곡은 '+fmtMS(c0.Sg.dur)+'까지</span></label></div>';
    /* ★★[UP_LINKS_ONE 2026-10-11] 링크 셋 한 줄 «맞추기 · 다른 곡 올리기 · 빼기»(줄 끝) — «빼기»(되돌릴 수 없다)는 맨 끝 */
    h+='<div class="mu-upft"><button type="button" class="pk-link" data-fk="muownset" onclick="emAct(\'ownset\',this)">맞추기</button><span aria-hidden="true">·</span><button type="button" class="pk-link" data-fk="muupagain" onclick="emAct(\'upopen\',this)">다른 곡 올리기</button><span aria-hidden="true">·</span><button type="button" class="pk-link" data-fk="muupdel" onclick="emAct(\'updel\',this)">빼기</button></div>';
    return h+'</div>'; }
  /* 빌더 ② 입장 쪽 고르기 칸 맨 아래 한 줄 — 다른 칩 줄과 같은 틀(이름표 · 줄 끝 링크 · 아래 가로 전체 카드) */
  var RO=null;   /* 되살린 계정 — 같은 기기에서 계정이 바뀌거나(마이페이지 다른 로그인) «처음부터 다시 만들기»로 초안이 비면 앞 곡을 남기지 않는다 */
  function rowHtml(){ fileInput(); var o=owner(); if(RO!==o){ if(RO!==null){ hush(); UPS=null; RESTORE=0; } RO=o; } if(SO!==St()){ SO=St(); SRC=null; MU_OPEN=false; CAR_I=null; } if(UPS&&UPS.Sg&&!upRec()){ hush(); UPS=null; }   /* [REC_SONG_1012] 초안이 바뀌면(계정 · 처음부터 다시 · 되돌리기) 칩도 고른 곡 쪽으로 */
    var src=srcNow(); if(src) SRC=src; if(src==='up'||upOn()) restore(); setTimeout(recWarm,0);   /* [REC_CLIP_1013] ② 입장 쪽이면 칩을 누르기 전에도 목록 · 첫 곡을 미리 받아 둔다(종전 «칩을 볼 때만») */   /* 고른 곡에서 짐작한 칩도 이 쪽에서는 그대로(곡을 빼도 그 칩 카드가 남는다) */   /* [REC_SONG_1012] 올린 곡은 그 칩을 볼 때(또는 고른 곡일 때) 되살리고 · 추천 곡 목록은 그 칩을 볼 때(또는 고른 곡일 때) 받는다 */
    return '<div class="ls-cg cg-vp cg-hl cg-vq ls-mu" role="group" aria-label="입장 음악"><span class="gl" aria-hidden="true">입장 음악</span>'
      +'<span class="cg-c mu-src" role="radiogroup" aria-label="입장 음악 고르는 곳">'+srcChip('두 분이 고른 곡','up',src)+srcChip('추천 곡','rec',src)   /* ★★[REC_SONG_1012 · MU_SRC] 칩 둘 — 처음엔 안 눌린 모양 · 누른 쪽 카드만 아래 */
      +(src==='up'?'<span class="cg-links"><button type="button" class="pk-link mu-gl" data-fk="muguide" onclick="emAct(\'guide\',this)">올리기 안내 보기</button></span>':'')+'</span>'   /* «올리기 안내 보기»는 «두 분이 고른 곡»일 때만 */
      +'<div class="mu-box">'+boxHtml()+'</div></div>'; }
  /* 새로고침 · 다시 열기 — 이 기기에 둔 파일로 다시 풀고 고른 자리를 되살린다(조용히 · 알림 없음) */
  function restore(){ if(RESTORE) return; var mu=upRec(); if(!mu){ RESTORE=2; return; } RESTORE=1;   /* [REC_SONG_1012] 고른 곡이든 비켜 둔 곡(S.muUp)이든 */ if(!mu.sid){ mu.sid=newSid(); save(); }   /* 1단계 때 고른 곡(곡 번호 없음)도 이제부터 같은 곡으로 알아본다 */
    fGet().then(function(b){ if(!b){ if(emb()&&mu.fid){ srvGet(mu); return; } RESTORE=2; redraw(); return; } var f=b; try{ if(!(b instanceof File)) f=new File([b],(mu.name||'내 곡')+'.mp3',{type:b.type||'audio/mpeg'}); }catch(x){}   /* [ENTRY_SONG_UP] 이 기기에 없으면 스튜디오에 보낸 파일로 */
      return analyze(f,true,mu).then(function(){ RESTORE=2; if(UPS&&UPS.Sg&&mu){ UPS.meta.t=mu.t||UPS.meta.t; UPS.meta.a=mu.a||UPS.meta.a; } if(UPS&&UPS.Sg&&!mu.fid) srvUp(f); redraw(); }); }).catch(function(){ RESTORE=2; redraw(); }); }   /* [ENTRY_SONG_UP] 보내다 끊긴 곡(창을 닫음 · 새로고침)은 다시 열 때 보낸다 */
  /* ── ★★[REC_SONG_1012 2026-10-12 사장님 «추천대로»(추천 곡 1번 · 드라이브에 두고 로그인한 두 분에게만) · «왜 추천 노래 부분이 없어?»] 4단계-나 추천 곡 — 시험실 v50 카드를 빌더로 ──
     칩 둘 «두 분이 고른 곡 · 추천 곡»([MU_SRC] · 처음엔 안 눌린 모양 · 누른 쪽 카드만 아래) — 칩은 «어디서 고르나»만 정한다 · 고른 곡은 초안 S.mu 하나(당일 콘솔이 보는 그것).
     곡 목록 · 곡은 마이페이지 → GAS(ritualFileGet · key 'rec' · id 'list' 또는 곡 키) → 드라이브 ME_추천곡 폴더 — 이 파일 · 저장소에는 곡 · 가사가 없다.
     추천 곡을 고르면 S.mu={src:'rec',k,t,a,dur,hook,img,pos} — hook = 문이 열리는 순간(목록 hook0 · 당일 콘솔도 이 값) · 올린 곡 기록은 S.muUp 으로 비켜 둔다(upRec).
     카드([MUS_CAROUSEL] · [LY_SAMPLE]) = 와이드 사진 + 제목 · 가수 + 소리 막대([NOW_EQ]) + 가운데 가사([LY_SYNC · LY_ON_CUE · LY_LEAD · LY_FROM_HOOK · LY_OFF]) + ‹ ▶ ›([CAR_TRANSPORT]) + ✓([PICK_ICON]) + 점([CAR_DOTS_IN]).
     ▶ = 문이 열리는 자리 12초 앞부터 1분([PREV_12_60_1013] · 종전 6초 앞부터 1분 20초 [CAR_LEN80]) · 넘겨도 듣던 노래는 그대로([CAR_KEEP_PLAY]) · ✓ 로 고르면 접힌 한 줄([MU_FOLD] · 바꾸기) · 다시 누르면 풀린다.
     받는 동안은 그 카드 가운데 «곡을 불러오는 중이에요» · 받은 곡은 이 기기에 셋까지(IndexedDB me-rec-song · 다시 들을 때 다시 받지 않는다 · 서버는 시간당 60번) · 풀어 둔 소리는 고른 곡 + 최근 하나 */
  /* ★★[PREV_12_60_1013 2026-10-13 사장님 «12초 앞부터 1분 듣기로 변경»] 미리 듣기(추천 곡 카드 ▶ · 올린 곡 ▶) = 문이 열리는 자리 12초 앞부터 1분.
     종전 6초 앞부터 1분 20초([CAR_LEN80]). 자리 ▶(8초 앞부터 16초) · «음악과 함께» 장면은 그대로. 추천 곡 짧은 판(pf · p0 ~ p1)은 8곡 모두 이 1분을 담는다(rec-song-ui 16) */
  var SRC=null, SO=null, MU_OPEN=false, CAR_I=null, CARN=null, CD=null, CAR_SWALLOW=0, PWANT=null, PTK=0, CAR_PRE=12, CAR_LEN=60, RK=/^[A-Za-z0-9_-]{1,16}$/;
  var REC={ls:null,lst:'',lerr:'',lat:0,ltm:null,lw:[],buf:{},full:{},pend:{},bp:{},get:{},ferr:{},lru:[]}, WARM={q:[],busy:false};   /* [REC_CLIP_1013] full = 짧은 판이 모자랄 때만 받는 곡 전체 · bp = 받는 중인 파일(같은 파일은 한 번만) */
  function recOn(){ var mu=St().mu; return !!(mu&&mu.src==='rec'&&RK.test(String(mu.k||''))); }
  function srcNow(){ if(SRC==='up'||SRC==='rec') return SRC; var mu=St().mu; if(mu&&(mu.src==='up'||mu.src==='rec')) return mu.src; return St().muUp?'up':null; }   /* 칩을 누른 적이 없으면 고른 곡 쪽(없으면 둘 다 안 눌림 · BOSS_WAY 1) */
  function srcChip(t,v,src){ var on=src===v; return '<button type="button" class="op-chip" role="radio" aria-checked="'+on+'" tabindex="'+((on||(!src&&v==='up'))?0:-1)+'" data-fk="musrc:'+v+'" onclick="emAct(\'src\',\''+v+'\')"><span class="cg-t" data-t="'+t+'">'+t+'</span></button>'; }
  function boxHtml(){ var src=srcNow(); return src==='up'?card():src==='rec'?recHtml():''; }
  function rowRedraw(){ var row=D.querySelector('.ls-mu'); if(!row){ renderAll(); return; } var oc=row.querySelector('.mu-car'), t=D.createElement('div'); t.innerHTML=rowHtml(); var nw=t.firstChild; row.parentNode.replaceChild(nw,row); carKeep(oc); sceneSync(); }
  function srcSet(v){ if((v!=='up'&&v!=='rec')||srcNow()===v) return; hush(); SRC=v;   /* 칩을 바꾸면 듣던 미리 듣기는 멈춘다(단추가 사라진 채 소리만 남지 않게) */
    if(v==='up'&&!UPS&&!upRec()){ guideOpen(); return; }   /* [UP_GUIDE_CHIP] 아직 올린 곡이 없으면 칩을 누를 때마다 안내 창(빌더가 다시 그리며 칩도 함께) */
    rowRedraw(); var sc=D.querySelector('.ls-mu [data-fk="musrc:'+v+'"]'); if(sc) try{ sc.focus({preventScroll:true}); }catch(x){} }
  function recE(c){ var y=new Error('rec'); y.code=c||'L4'; y.song=true; return y; }
  function recErr(c){ c=String(c||'L4');   /* [ERR_CODES] 곡 받기 실패 — 자리 L(불러오기) · M(기기) */
    if(c==='L6') return '곡을 불러오지 못했어요 · 인터넷을 확인해 주세요 (코드 L6)';
    if(c==='L5') return '곡을 불러오는 데 오래 걸려요 (코드 L5)';
    if(c==='L1') return '잠시 뒤 다시 눌러 주세요 (코드 L1)';
    if(c==='L3') return '곡 파일을 찾지 못했어요 (코드 L3)';
    if(c==='L8') return '로그인이 풀렸어요 · 다시 로그인해 주세요 (코드 L8)';
    if(c==='M6') return '이 기기에서 곡을 열지 못했어요 (코드 M6)';
    if(c==='M7') return '소리 재생이 막혔어요 · 화면을 누른 뒤 다시 눌러 주세요 (코드 M7)';
    return '곡을 불러오지 못했어요 · 다시 눌러 주세요 (코드 '+(/^[A-Z]\d$/.test(c)?c:'L4')+')'; }
  /* 목록 한 곡 — 키 · 자리가 맞는 곡만 · 사진은 사이트 안 그림(/assets/…)만 · 가사 줄 = [시각, 영문, 한글, 끝?] · 글은 그릴 때 늘 e() 로 */
  function num(x){ x=+x; return isFinite(x)?x:null; }
  function imgOk(v){ return /^\/assets\/[A-Za-z0-9_\/.-]+\.(webp|jpe?g|png)$/.test(String(v||''))&&String(v).indexOf('..')<0?String(v):''; }
  function posOk(v){ return /^\d{1,3}(\.\d+)?% \d{1,3}(\.\d+)?%$/.test(String(v||''))?String(v):'50% 50%'; }
  function recClean(s){ if(!s||!RK.test(String(s.k||''))) return null; var h=num(s.hook), h0=num(s.hook0); if(!(h>0)) return null;
    var str=function(v){ return typeof v==='string'?v.slice(0,200):''; }, nums=function(a){ return Array.isArray(a)?a.map(num).filter(function(v){ return v!=null; }):[]; };
    var ly=Array.isArray(s.ly)?s.ly.filter(function(L){ return Array.isArray(L)&&num(L[0])!=null; }).slice(0,200).map(function(L){ var o=[num(L[0]),str(L[1]),str(L[2])]; if(num(L[3])!=null) o.push(num(L[3])); return o; }):[];
    return {k:String(s.k),t:str(s.t)||str(s.name),a:str(s.a),name:str(s.name),img:imgOk(s.img),pos:posOk(s.pos),hook:h,hook0:(h0!=null&&h0>0)?h0:h,len:num(s.len)||0,file:str(s.file),ly:ly,lyEn:str(s.lyEn),lyKo:str(s.lyKo),
      lyAt:s.lyAt==null?null:Array.isArray(s.lyAt)?nums(s.lyAt):num(s.lyAt)!=null?[num(s.lyAt)]:null,lyT:nums(s.lyT),lyOff:num(s.lyOff)||0,
      hooks:nums(s.hooks).filter(function(v){ return v>0; }).slice(0,6),
      pf:/^[A-Za-z0-9_-]{1,24}\.mp3$/.test(String(s.pf||''))?String(s.pf):'',p0:num(s.p0),p1:num(s.p1),g:num(s.g)>0?num(s.g):null}; }   /* [REC_CLIP_1013] 짧은 판(pf) · 그 판의 처음 · 끝(원곡 초) · 원곡으로 잰 크기 */   /* [BGM_FIRST_1013] 같은 소절이 다시 나오는 자리(문 열림 후보 · 첫째가 hook0) */
  function recMeta(k){ var L=REC.ls||[]; for(var i=0;i<L.length;i++) if(L[i].k===k) return L[i]; return null; }
  function recTitle(k){ var m=recMeta(k); return m?(m.t||m.name):''; }
  function recH(m){ return Math.round((m.hook0||m.hook)*100)/100; }   /* 크게 올라오는 자리 = 문이 열리는 순간(hook0) */
  /* 목록 — 칩을 볼 때 한 번 · 실패했으면 «다시 불러오기»(또는 30초 뒤 다시 그릴 때) */
  function recListDone(){ var w=REC.lw; REC.lw=[]; w.forEach(function(f){ try{ if(REC.lst==='ok') f[0](); else f[1](recE(REC.lerr||'L4')); }catch(x){} }); }
  function recList(){ if(REC.lst==='get'||REC.lst==='ok') return; REC.lat=Date.now(); if(!emb()){ REC.lst='fail'; REC.lerr='L3'; recListDone(); return; }
    REC.lst='get'; REC.lerr=''; clearTimeout(REC.ltm); REC.ltm=setTimeout(function(){ if(REC.lst!=='get') return; REC.lst='fail'; REC.lerr='L5'; recListDone(); redraw(); },200000);   /* 마이페이지가 180초 기다린다 — 그보다 조금 더 */
    if(!post('momentedit:ritualFileGet',{key:'rec',id:'list'})){ clearTimeout(REC.ltm); REC.lst='fail'; REC.lerr='L6'; recListDone(); } }
  function recListAuto(){ if(REC.lst===''||(REC.lst==='fail'&&Date.now()-REC.lat>30000)) recList(); }
  function recListP(){ if(REC.lst==='ok') return Promise.resolve(); return new Promise(function(ok,no){ REC.lw.push([ok,no]); recList(); if(REC.lst==='fail') recListDone(); }); }
  /* 목록이 고른 곡의 자리 · 이름을 바꿨으면(드라이브에서 고침) 초안도 따라간다 — 당일 콘솔이 같은 자리를 쓴다 */
  function recSync(){ var mu=St().mu; if(!recOn()) return; var m=recMeta(mu.k); if(!m) return; var ch=false;
    [['hook',recH(m)],['t',m.t],['a',m.a],['img',m.img],['pos',m.pos]].forEach(function(x){ if(mu[x[0]]!==x[1]){ mu[x[0]]=x[1]; ch=true; } });
    var hs=m.hooks&&m.hooks.length?m.hooks:null; if(JSON.stringify(mu.hooks||null)!==JSON.stringify(hs)){ if(hs) mu.hooks=hs.slice(); else delete mu.hooks; ch=true; }   /* [BGM_FIRST_1013] 당일 콘솔도 같은 후보로 */
    if(ch){ save(); scReset(); } }
  window.addEventListener('message',function(ev){ var d=ev&&ev.data; if(!d||ev.origin!==window.location.origin||d.key!=='rec'||d.type!=='momentedit:ritualFileData') return;
    if(d.id==='list'){ clearTimeout(REC.ltm); if(d.ok&&Array.isArray(d.songs)){ REC.ls=d.songs.map(recClean).filter(Boolean).slice(0,24); REC.lst='ok'; REC.lerr=''; recSync(); } else if(REC.lst!=='ok'){ REC.lst='fail'; REC.lerr=codeOf(d,'L'); } recListDone(); redraw(); recWarm(); return; }
    var g=REC.get[d.id]; if(!g) return; delete REC.get[d.id]; clearTimeout(g.timer);
    if(!d.ok||!d.data){ g.no(codeOf(d,'L')); return; } var b; try{ b=b64Blob(d.data,d.mime||'audio/mpeg'); }catch(x){ g.no('M6'); return; } g.ok(b); });
  function recFetch(k){ return new Promise(function(ok,no){ var g={ok:ok,no:function(c){ no(recE(c)); }}; if(!emb()){ g.no('L3'); return; }
    g.timer=setTimeout(function(){ if(REC.get[k]!==g) return; delete REC.get[k]; g.no('L5'); },200000); REC.get[k]=g;
    if(!post('momentedit:ritualFileGet',{key:'rec',id:k})){ clearTimeout(g.timer); delete REC.get[k]; g.no('L6'); } }); }
  /* ★★[REC_CLIP_1013 2026-10-13 사장님 «추천대로 · 기다림 완전 짧게 · 없으면 더 좋고»] 미리 듣기용 짧은 판 + 미리 받기
     목록에 pf(짧은 판 · 문 열림 앞뒤만 · 원곡 프레임을 그대로 자른 것) · p0 · p1(그 판의 처음 · 끝이 원곡 몇 초) · g(원곡 전체로 잰 크기)가 있으면 곡 전체 대신 '<키>-p'를 받는다.
     재생 · 그래프 · 가사는 모두 원곡 시각으로 센다(판의 0초 = 원곡 p0초) · 판이 «음악과 함께 듣기» 장면을 다 담지 못하면(멘트가 45초를 넘으면) 그때만 곡 전체를 받는다.
     ② 입장 쪽을 열면 목록을 받고 고른 곡 · 지금 카드 · 다음 카드 판을 하나씩 차례로 받아 이 기기에 둔다(recWarm) — ▶ 를 누를 때는 이미 와 있다.
     목록에 pf 가 없으면(옛 목록) 종전대로 곡 전체 · 짧은 판을 못 찾으면(L3) 곡 전체로 */
  function clipOf(m){ return (m&&m.pf&&m.p0!=null&&m.p1!=null&&m.p1>m.p0&&m.p0>=0)?{id:m.k+'-p',o:m.p0,end:m.p1}:null; }
  /* 이 기기에 둔 파일(IndexedDB me-rec-song · 파일마다 하나 · 모두 40MB 안 · 고른 곡은 늘 남긴다) — 목록이 파일을 바꾸면(이름 · 길이 · 자리) 버리고 다시 받는다 */
  function rdb(){ return new Promise(function(ok,no){ try{ var q=indexedDB.open('me-rec-song',1); q.onupgradeneeded=function(){ q.result.createObjectStore('f'); }; q.onsuccess=function(){ ok(q.result); }; q.onerror=function(){ no(q.error); }; }catch(x){ no(x); } }); }
  function rsig(m,id){ var c=clipOf(m); return (c&&id===c.id)?[id,m.pf,m.p0,m.p1].join('|'):[m.k,m.file,m.len,m.hook].join('|'); }
  function rcGet(m,id){ return rdb().then(function(d){ return new Promise(function(ok){ try{ var q=d.transaction('f').objectStore('f').get(id); q.onsuccess=function(){ var v=q.result; ok(v&&v.s===rsig(m,id)&&v.b?v.b:null); }; q.onerror=function(){ ok(null); }; }catch(x){ ok(null); } }); }).catch(function(){ return null; }); }
  function rcPut(m,id,b){ return rdb().then(function(d){ var t=d.transaction('f','readwrite'), st=t.objectStore('f'), all=[], ch=recOn()?St().mu.k:null; st.put({s:rsig(m,id),b:b,at:Date.now(),n:(b&&b.size)||0},id);
      var c=st.openCursor(); c.onsuccess=function(){ var cu=c.result; if(cu){ all.push({k:String(cu.key),at:(cu.value&&cu.value.at)||0,n:(cu.value&&(cu.value.n||(cu.value.b&&cu.value.b.size)))||0}); cu.continue(); return; }
        all.sort(function(x,y){ return y.at-x.at; }); var sum=0, kept=0; all.forEach(function(x){ var mine=x.k===id||(ch&&(x.k===ch||x.k===ch+'-p')); if(mine||(kept<10&&sum+x.n<=40*1024*1024)){ sum+=x.n; kept++; return; } st.delete(x.k); }); }; }).catch(function(){}); }
  /* 파일 받기 — 이 기기에 있으면 그것 · 없으면 마이페이지 → GAS · 같은 파일을 두 번 받지 않는다(받는 중이면 그 약속) */
  function recBlob(m,id){ if(REC.bp[id]) return REC.bp[id]; var p=rcGet(m,id).then(function(b){ return b||recFetch(id).then(function(b2){ rcPut(m,id,b2); return b2; }); });
    REC.bp[id]=p; p.then(function(){ delete REC.bp[id]; },function(){ delete REC.bp[id]; }); return p; }
  /* 받아 풀기 — 같은 곡은 한 번만(받는 중이면 그 약속) · 크기는 엔진 한 곳(ES.prepSong · 당일 콘솔과 같은 자) · 짧은 판이면 원곡으로 잰 크기(g)를 쓴다 · 그래프는 p20(원곡 시각) */
  function recTouch(k){ REC.lru=[k].concat(REC.lru.filter(function(x){ return x!==k; })); var ch=recOn()?St().mu.k:null, n=0;
    REC.lru.slice().forEach(function(x){ if(x===ch||(PREV&&PREV.k===x)) return; n++; if(n>1){ delete REC.buf[x]; delete REC.full[x]; REC.lru=REC.lru.filter(function(y){ return y!==x; }); } }); }   /* 풀어 둔 소리는 고른 곡 + 최근 하나 */
  function recBuild(m,k,buf,c){ var Sg=ES.prepSong(buf), x=Sg.x; delete Sg.x;
    if(c){ Sg.o=c.o; Sg.end=c.o+buf.duration; Sg.dur=Math.max(m.len||0,Sg.end); if(m.g) Sg.gain=m.g; var pre=Math.round(c.o*20), q=p20(x,Sg.sr), P=new Float32Array(pre+q.length); P.set(q,pre); Sg.p20=P; }
    else Sg.p20=p20(x,Sg.sr);
    return {rec:true,k:k,Sg:Sg,meta:{t:m.t,a:m.a},H:recH(m),clip:!!c}; }
  function recSong(k,full){ var bk=full?REC.full:REC.buf, pk=(full?'F:':'')+k; if(bk[k]){ recTouch(k); return Promise.resolve(bk[k]); } if(REC.pend[pk]) return REC.pend[pk];
    if(!recMeta(k)) return recListP().then(function(){ if(!recMeta(k)) throw recE('L3'); return recSong(k,full); });
    var m=recMeta(k), c=full?null:clipOf(m);
    var p=recBlob(m,c?c.id:k).catch(function(err){ if(c&&err&&err.code==='L3'){ c=null; return recBlob(m,k); } throw err; })   /* 짧은 판을 못 찾으면 곡 전체로 */
      .then(function(b){ return b.arrayBuffer?b.arrayBuffer():new Response(b).arrayBuffer(); })
      .then(function(ab){ return decode(ab).catch(function(){ throw recE('M6'); }); })
      .then(function(buf){ var o=recBuild(m,k,buf,c); delete REC.pend[pk]; delete REC.ferr[k]; bk[k]=o; recTouch(k); return o; },
        function(err){ delete REC.pend[pk]; REC.ferr[k]=Date.now(); throw (err&&err.song)?err:recE((err&&err.code)||'L4'); });
    REC.pend[pk]=p; return p; }
  /* 고른 곡은 장면(음악과 함께 듣기)에 쓰려고 뒤에서 받아 둔다 — 실패하면 15초 동안은 다시 안 받는다(다시 그릴 때마다 받지 않게) */
  function recWant(k,full){ var bk=full?REC.full:REC.buf; if(!emb()||bk[k]||REC.pend[(full?'F:':'')+k]) return; if(REC.ferr[k]&&Date.now()-REC.ferr[k]<15000) return; if(!recMeta(k)){ recListAuto(); return; }
    recSong(k,full).then(function(){ if(recOn()&&St().mu.k===k) sceneSync(); },function(){ if(recOn()&&St().mu.k===k) paintGraph(); }); }
  /* [REC_CLIP_1013] 미리 받기 — 고른 곡 · 지금 카드는 받아서 풀어 두고(▶ · 장면이 바로) · 다음 카드는 받아만 둔다 · 하나씩 차례로(서로 길을 나눠 먹지 않게)
     «추천 곡» 칩을 누르기 전에는 받아만 둔다(풀면 기기 메모리를 쓴다) */
  function recWarm(){ var sn=srcNow(); if(!emb()||sn==='up'){ if(sn==='rec'||recOn()) recListAuto(); return; } recListAuto();   /* 마이페이지 밖은 종전대로(칩을 볼 때 «마이페이지에서 들어 볼 수 있어요» · 아무것도 받지 않는다) · [REC_CLIP_1013] 두 분이 고른 곡(up)이면 추천 곡 목록 · 짧은 판을 미리 받지 않는다(데이터 아끼기 · 그 곡 받기와 겹치지 않게) */ var L=REC.ls; if(REC.lst!=='ok'||!L||!L.length) return;
    var want=[], add=function(k,dec){ if(k&&recMeta(k)&&!want.some(function(w){ return w[0]===k; })) want.push([k,dec]); }, on=srcNow()==='rec', i=clamp(CAR_I==null?carIdx():CAR_I,0,L.length-1);
    var sm=function(k){ return !!clipOf(recMeta(k)); };   /* 짧은 판이 없으면(옛 목록 · 곡 전체 4~8MB) 칩을 누르기 전에는 받지 않는다 · 다음 카드도 짧은 판만 */
    if(recOn()) add(St().mu.k,true); if(on||sm(L[i].k)) add(L[i].k,on); if(on&&L[i+1]&&sm(L[i+1].k)) add(L[i+1].k,false);
    WARM.q=want; warmNext(); }
  function warmNext(){ if(WARM.busy) return; var w=WARM.q.shift(); if(!w) return; var k=w[0], m=recMeta(k), c=clipOf(m);
    if(!m||REC.buf[k]||REC.pend[k]||(REC.ferr[k]&&Date.now()-REC.ferr[k]<15000)){ warmNext(); return; }
    WARM.busy=true; var p=w[1]?recSong(k):recBlob(m,c?c.id:k);
    p.then(function(){ WARM.busy=false; if(w[1]&&recOn()&&St().mu.k===k) sceneSync(); warmNext(); },function(){ WARM.busy=false; warmNext(); }); }
  /* 장면 곡 = 고른 곡 하나(S.mu) — 올린 곡이면 이 기기에서 푼 것(UPS) · 추천 곡이면 받아 푼 것 · 아직이면 없다(받기를 건다) */
  function scSong(){ var mu=St().mu; if(!mu) return null; if(mu.src==='rec'){ if(!recOn()) return null; var o=REC.buf[mu.k]; if(o) return o; recWant(mu.k); return null; } return mu.src==='up'?upCur():null; }
  /* [REC_CLIP_1013] 짧은 판이 이 장면(음악이 깔리는 처음 ~ 잦아드는 끝)을 다 담나 — 못 담으면 곡 전체(받는 동안은 없음 · 그래프는 «곡을 불러오는 중이에요») */
  function scCovers(u,V0){ var S=u&&u.Sg; if(!S||S.o==null||!V0) return true; var PL=ES.plan(V0,{dur:S.dur,gain:S.gain},hookNow(u),{hooks:hooksOf(u)}), a=PL.off, b=PL.off+(PL.tend-PL.tm); return a>=S.o-0.02&&b<=S.end+0.02; }
  function scFor(u,V0){ if(!u||!u.rec||!V0||scCovers(u,V0)) return u; var f=REC.full[u.k]; if(f) return f; recWant(u.k,true); return null; }
  function recWaiting(){ if(!recOn()) return false; var k=St().mu.k, st=vNow(); if(!st||!st.src) return false; if(REC.ferr[k]&&Date.now()-REC.ferr[k]<15000) return false; var u=REC.buf[k], V0=VR[st.key]; return !u||(!!V0&&!scFor(u,V0)); }
  /* ▶ 들어 보기 — 받는 동안 ■(누르면 그만) · 받으면 문이 열리는 자리 12초 앞부터 1분([PREV_12_60_1013]) */
  function recPlay(k){ if(!recMeta(k)) return; hush(); quietOthers(); scHalt(); PWANT=k; var tk=PTK; paintCar();
    recSong(k).then(function(o){ if(tk!==PTK||PWANT!==k) return; PWANT=null; play('rec:'+k,o.H,CAR_PRE,CAR_LEN,o); },function(err){ if(tk!==PTK||PWANT!==k) return; PWANT=null; paintCar(); toast(recErr(err&&err.code)); }); }
  /* ✓ 고르기 — 고르면 접힌 한 줄(아래 장면이 올라온다) · 같은 곡을 다시 누르면 풀린다(펼친 그대로) · 고를 때 듣던 미리 듣기는 멈춘다 */
  function recPick(k){ var m=recMeta(k), s=St(), mu=s.mu; if(!m) return;
    if(recOn()&&mu.k===k){ delete s.mu; save(); scReset(); paintCar(); sceneSync(); toast('고른 곡을 풀었어요'); return; }
    hush(); if(mu&&mu.src==='up') s.muUp=mu;   /* 올린 곡 기록은 비켜 둔다(서버 파일 · 고른 자리 그대로) */
    var h0=boxH(); s.mu={src:'rec',k:k,t:m.t,a:m.a,dur:Math.round(m.len*10)/10,hook:recH(m),img:m.img,pos:m.pos}; if(m.hooks&&m.hooks.length) s.mu.hooks=m.hooks.slice();   /* [BGM_FIRST_1013] */ SRC='rec'; MU_OPEN=false; save(); scReset(); redraw(); boxAnim(h0); recWant(k);
    toast(m.t.length<=9?'‹'+m.t+'› 곡으로 들어가요':'이 곡으로 들어가요'); var f=D.querySelector('.ls-mu .mu-fold'); if(f) try{ f.focus({preventScroll:true}); }catch(x){} }   /* [TOAST_MIN] 긴 제목은 «이 곡으로 들어가요» */
  /* 카드 */
  var ICO_TP_L='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M14.5 5.5 8 12l6.5 6.5"/></svg>', ICO_TP_R='<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9.5 5.5 16 12l-6.5 6.5"/></svg>';
  var ICO_TP_PLAY='<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M8 5.2v13.6a.8.8 0 0 0 1.2.7l10.6-6.8a.8.8 0 0 0 0-1.4L9.2 4.5a.8.8 0 0 0-1.2.7z"/></svg>', ICO_TP_STOP='<svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="2"/></svg>';
  var ICO_PICK='<svg width="26" height="26" viewBox="0 0 26 26" aria-hidden="true"><circle class="mu-pkc" cx="13" cy="13" r="11.2" fill="none" stroke="currentColor" stroke-width="1.6"/><path class="mu-pkv" d="M8.4 13.4l3.2 3.2 6.2-6.6" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>';   /* [PICK_ICON] 고르기 전 = 테두리만 · 고른 뒤 = 채운 동그라미 */
  var ICO_CHEV='<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"/></svg>';
  var ICO_FOLD_CK='<svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="11" fill="var(--seal,#6B2A24)"/><path d="M7 12.4l3.2 3.1L17 8.8" fill="none" stroke="#FBF6EE" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  function carIdx(){ var L=REC.ls||[]; if(CAR_I==null){ CAR_I=0; var mu=St().mu; if(recOn()) for(var i=0;i<L.length;i++) if(L[i].k===mu.k) CAR_I=i; } return CAR_I=clamp(CAR_I,0,Math.max(0,L.length-1)); }   /* 처음엔 고른 곡 카드 · 안 골랐으면 첫 카드 */
  function carSig(){ var s=(REC.ls||[]).map(function(m){ return [m.k,m.img,m.pos,m.t,m.a,m.name].join('|'); }).join('/'), h=5381; for(var i=0;i<s.length;i++) h=((h*33)^s.charCodeAt(i))>>>0; return (REC.ls||[]).length+'-'+h.toString(36); }
  function carHtml(){ var L=REC.ls, n=L.length, h='<div class="mu-car" role="region" aria-roledescription="carousel" aria-label="추천 곡" data-sig="'+carSig()+'"><div class="mu-vp"><div class="mu-track">';
    L.forEach(function(m,i){ var sub=[m.a,m.name].filter(Boolean).join(' · '), tt=m.t||m.name;
      h+='<div class="mu-slide" role="group" aria-roledescription="slide" aria-label="'+(i+1)+' / '+n+'" data-k="'+e(m.k)+'"><div class="mu-scr">'
        +'<div class="mu-ph">'+(m.img?'<img src="'+e(m.img)+'" alt="" draggable="false" decoding="async" style="object-position:'+e(m.pos)+'">':'')+'</div>'
        +'<p class="mu-top"><span class="mu-ttr"><span class="mu-tt'+(/[가-힣]/.test(tt)?' ko':'')+'">'+e(tt)+'</span><span class="mu-eq" aria-hidden="true"><i></i><i></i><i></i><i></i></span></span><span class="mu-ta">'+e(sub)+'</span></p>'
        +'<p class="mu-ly"><span class="mu-lines"></span></p></div></div>'; });   /* [LY_ON_CUE] 멈춰 있을 때는 비어 있다 — 그 줄이 불릴 때 lyTick 이 채운다 */
    return h+'</div><div class="mu-tp"><button type="button" class="mu-tb mu-arl" data-fk="mucarprev" aria-label="이전 곡" onclick="emAct(\'carprev\',this)">'+ICO_TP_L+'</button><button type="button" class="mu-tb mu-tpp" data-fk="mucarplay" aria-pressed="false" onclick="emAct(\'carplay\',this)"></button><button type="button" class="mu-tb mu-arr" data-fk="mucarnext" aria-label="다음 곡" onclick="emAct(\'carnext\',this)">'+ICO_TP_R+'</button></div>'
      +'<button type="button" class="mu-pk" data-fk="mucarpick" aria-pressed="false" onclick="emAct(\'carpick\',this)">'+ICO_PICK+'</button>'
      +'<div class="mu-dots" aria-hidden="true">'+L.map(function(){ return '<i></i>'; }).join('')+'</div></div>'
      +'<p class="sr-only mu-live" aria-live="polite"></p></div>'; }
  function foldHtml(mu){ var m=recMeta(mu.k)||{}, tt=String(mu.t||m.t||''), sub=[mu.a||m.a,m.name].filter(Boolean).join(' · '), img=imgOk(mu.img||m.img), pos=posOk(mu.pos||m.pos);
    return '<button type="button" class="mu-fold" data-fk="mufold" aria-expanded="false" aria-label="고른 곡 ‹'+e(tt)+'› · 펼쳐서 바꾸기" onclick="emAct(\'fold\',this)">'
      +'<span class="mu-fph" aria-hidden="true">'+(img?'<img src="'+e(img)+'" alt="" draggable="false" decoding="async" style="object-position:'+e(pos)+'">':'')+'<i class="mu-fck">'+ICO_FOLD_CK+'</i></span>'
      +'<span class="mu-ftx"><span class="mu-ftt'+(/[가-힣]/.test(tt)?' ko':'')+'">'+e(tt)+'</span><span class="mu-fta">'+e(sub)+'</span></span>'
      +'<span class="mu-fgo" aria-hidden="true">바꾸기'+ICO_CHEV+'</span></button>'; }
  function recHtml(){ if(!emb()) return '<div class="mu-card mu-rec0"><p class="mu-cs">추천 곡은 마이페이지에서 들어 볼 수 있어요</p></div>';   /* 목록 · 곡은 로그인한 두 분에게만(마이페이지 안) */
    if(recOn()&&!MU_OPEN) return foldHtml(St().mu);   /* [MU_FOLD] 고른 뒤엔 접힌 한 줄 — 목록을 받기 전에도 그린다(초안에 이름 · 사진이 있다) */
    if(REC.lst==='ok'&&REC.ls.length) return '<div class="mu-carw">'+carHtml()+'</div>';
    if(REC.lst==='fail'||REC.lst==='ok'){ var none=REC.lst==='ok'||REC.lerr==='L3';
      return '<div class="mu-card mu-rec0"><p class="mk-exw mu-sv" role="alert">'+(none?'추천 곡을 아직 준비하지 못했어요':'추천 곡을 불러오지 못했어요')+' · <span class="mu-nw"><button type="button" class="pk-link" data-fk="mureclist" onclick="emAct(\'reclist\',this)">다시 불러오기</button> (코드 '+e(none?'L3':(REC.lerr||'L4'))+')</span></p></div>'; }
    return '<div class="mu-carw"><div class="mu-car mu-car0" aria-busy="true"><div class="mu-vp"><div class="mu-ph"></div><p class="mu-ly"><span class="mu-lines cur"><span class="mu-wt" role="status">추천 곡을 불러오는 중이에요</span></span></p></div></div></div>'; }   /* 받는 동안 카드 자리 그대로(아래 칸이 밀리지 않게) */
  /* [MUS_CAROUSEL] 다시 그려도 같은 카드 묶음을 다시 꽂는다 — 사진을 다시 받거나 넘기던 자리 · 움직임이 끊기지 않게(시험실 carPut) */
  function carKeep(oc){ var nc=D.querySelector('.ls-mu .mu-car:not(.mu-car0)');
    if(oc&&nc&&oc!==nc&&!oc.classList.contains('mu-car0')&&oc.getAttribute('data-sig')===nc.getAttribute('data-sig')){ var ae=D.activeElement, fk=(ae&&nc.contains(ae))?ae.getAttribute('data-fk'):null; nc.parentNode.replaceChild(oc,nc); if(fk){ var n=oc.querySelector('[data-fk="'+fk+'"]'); if(n) try{ n.focus({preventScroll:true}); }catch(x){} } }
    CARN=D.querySelector('.ls-mu .mu-car:not(.mu-car0)'); paintCar(); }
  /* [CAR_EDGE] 멈춰 있을 때(.still)는 지금 카드만 그린다 · 넘기는 동안(0.38초)은 옆 카드도 */
  function carStill(c,now){ clearTimeout(c.__stT); var done=function(){ c.__mv=false; c.classList.add('still'); }; if(now){ done(); return; } c.__mv=true; c.classList.remove('still'); c.__stT=setTimeout(done,450); }
  var WAIT_H='<span class="mu-wt">곡을 불러오는 중이에요</span>';
  function paintCar(mode){ var c=D.querySelector('.ls-mu .mu-car:not(.mu-car0)'), L=REC.ls; if(!c||!L||!L.length) return; var n=L.length, i=carIdx(), m=L[i], k=m.k, tt=m.t||m.name, pk=(PREV&&PREV.k)||null, ck=pk||PWANT, pl=!!ck, lit=!!(PREV&&PREV.k===k&&PREV.lit), on=recOn()&&St().mu.k===k;
    var tr=c.querySelector('.mu-track'), want='translateX('+(-100*i)+'%)';
    if(!c.classList.contains('drag')&&tr.style.transform!==want){ var inst=mode==='instant'||!tr.style.transform; if(inst) tr.classList.add('noanim'); tr.style.transform=want; if(inst){ void tr.offsetWidth; tr.classList.remove('noanim'); } carStill(c,inst||RM); }
    else if(!c.__mv&&!c.classList.contains('drag')) c.classList.add('still');
    [].forEach.call(c.querySelectorAll('.mu-slide'),function(sl,j){ var kj=L[j]&&L[j].k, cur=j===i, wt=!!PWANT&&kj===PWANT&&!pk; sl.classList.toggle('cur',cur); sl.classList.toggle('lit',cur&&lit); sl.classList.toggle('pl',kj===pk); if(cur) sl.removeAttribute('aria-hidden'); else sl.setAttribute('aria-hidden','true');
      if(wt!==!!sl.__wt){ sl.__wt=wt; lyPut(sl,wt?WAIT_H:''); } });   /* 받는 동안 그 카드 가운데 한 줄 */
    [].forEach.call(c.querySelectorAll('.mu-dots i'),function(d,j){ d.classList.toggle('on',j===i); d.classList.toggle('pl',j!==i&&!!L[j]&&L[j].k===pk); });
    eqKick(); lyRest();
    c.querySelector('.mu-arl').setAttribute('aria-disabled',i<=0?'true':'false'); c.querySelector('.mu-arr').setAttribute('aria-disabled',i>=n-1?'true':'false');
    var bp=c.querySelector('.mu-tpp'), bk=c.querySelector('.mu-pk'), hp=pl?ICO_TP_STOP:ICO_TP_PLAY;   /* [CAR_TRANSPORT] 추천 곡이 나오는(받는) 동안은 어느 카드에서나 ■(그 곡을 멈춘다) · 멈춰 있으면 ▶(지금 카드 곡) */
    bp.setAttribute('aria-pressed',pl?'true':'false'); bp.setAttribute('aria-label',pl?recTitle(ck)+' 멈추기':tt+' 들어 보기'); if(PWANT&&!pk) bp.setAttribute('aria-busy','true'); else bp.removeAttribute('aria-busy'); if(bp.__h!==hp){ bp.innerHTML=hp; bp.__h=hp; }
    bk.setAttribute('aria-pressed',on?'true':'false'); bk.setAttribute('aria-label',tt+' 이 곡으로 들어가요'); bk.title=on?'고른 곡 · 다시 누르면 풀려요':'이 곡으로 들어가요'; bk.classList.toggle('on',on); }
  function carGo(i){ var L=REC.ls; if(!L||!L.length) return; i=clamp(i,0,L.length-1); if(i===carIdx()){ paintCar(); return; } CAR_I=i; paintCar(); recWarm(); var m=L[i], lv=D.querySelector('.ls-mu .mu-live'); if(lv) lv.textContent=(i+1)+' / '+L.length+' · '+(m.t||m.name)+(m.a?' · '+m.a:''); }   /* [CAR_KEEP_PLAY] 듣던 노래는 그대로 */
  function boxH(){ var b=D.querySelector('.ls-mu .mu-box'); return b?b.offsetHeight:0; }
  function boxAnim(h0){ var b=D.querySelector('.ls-mu .mu-box'); if(!b||!h0||RM) return; var h1=b.offsetHeight; if(Math.abs(h1-h0)<4) return; var fin=false;   /* [MU_FOLD] 옛 높이 → 새 높이(아래 장면이 미끄러지듯) · 칸은 다시 쓰이니 끝 표시는 이 한 번의 것 */
    b.style.height=h0+'px'; b.style.overflow='hidden'; void b.offsetHeight; b.style.transition='height .34s cubic-bezier(.22,1,.36,1)'; b.style.height=h1+'px';
    var done=function(){ if(fin) return; fin=true; b.style.height=''; b.style.overflow=''; b.style.transition=''; }; b.addEventListener('transitionend',done,{once:true}); setTimeout(done,520); }
  /* [NOW_EQ] 듣는 카드 제목 옆 소리 막대 넷 — 미리 듣기 소리를 엿듣는 AnalyserNode(0 이득으로 끝에 잇는다) · 움직임 줄이기 설정이면 멈춘 높이 */
  var RM=false; try{ RM=matchMedia('(prefers-reduced-motion: reduce)').matches; }catch(x){}
  var EQ={an:null,buf:null,raf:0,slow:null}, EQ_MIN=0.45, EQ_BANDS=[[1,3,170,250],[3,8,160,240],[8,20,125,205],[20,48,60,175]];   /* [EQ_NO_DOT] 바닥 45% · 칸 = [첫 칸, 끝 칸, 바닥, 꼭대기](시험실 실측) */
  function eqTap(g){ try{ var a=g.context; if(!EQ.an||EQ.an.context!==a){ var an=a.createAnalyser(), z=a.createGain(); an.fftSize=256; an.smoothingTimeConstant=0.8; z.gain.value=0; an.connect(z); z.connect(a.destination); EQ.an=an; EQ.buf=new Uint8Array(an.frequencyBinCount); } g.connect(EQ.an); }catch(x){} }
  function eqKick(){ if(!EQ.raf&&PREV&&PREV.k) EQ.raf=requestAnimationFrame(eqTick); }
  function eqTick(){ EQ.raf=0; var p=PREV; if(!p||!p.k){ EQ.slow=null; return; } lyTick(p); var bars=D.querySelectorAll('.ls-mu .mu-slide[data-k="'+p.k+'"] .mu-eq i');
    if(EQ.an&&!RM) try{ EQ.an.getByteFrequencyData(EQ.buf); }catch(x){}
    for(var j=0;j<bars.length&&j<4;j++){ var v=[.45,.75,.6,.35][j];
      if(EQ.an&&!RM){ var B=EQ_BANDS[j], sum=0; for(var q=B[0];q<B[1];q++) sum+=EQ.buf[q]; var cur=sum/(B[1]-B[0]); if(!EQ.slow) EQ.slow=[cur,cur,cur,cur]; EQ.slow[j]+=(cur-EQ.slow[j])*0.05; v=clamp(EQ_MIN+0.4*clamp((cur-B[2])/(B[3]-B[2]),0,1)+0.25*clamp((cur-EQ.slow[j])/18,-1,1),EQ_MIN,1); }
      bars[j].style.transform='scaleY('+v.toFixed(3)+')'; }
    EQ.raf=requestAnimationFrame(eqTick); }
  /* 가사 — [LY_SYNC] 노래에 맞춰 줄마다 · [LY_ON_CUE] 그 줄이 불리는 동안만(길어도 8초 · 마지막 줄 6.5초) · [LY_LEAD] 0.35초 앞서 바뀌기 시작(출력 지연은 0.12초까지만 뺀다)
     [LY_FROM_HOOK] 문이 열리기 전에 끝난 줄은 띄우지 않는다 · [LY_OFF] 곡마다 줄 시각을 통째로 미는 값(목록 lyOff · 귀로 들은 판정) · 가사가 없는 곡은 아무 글도 없다([R3_NO_TEXT]) */
  var LY_MAX=8, LY_LAST=6.5, LY_LEAD=0.35, LY_LAT_MAX=0.12, LY_SWAP_MS=120, LY_HOOK_AT=0.5;
  function lyLines(m){ var h=m.hook0||m.hook; if(m.ly&&m.ly.length) return m.ly; if(m.lyEn||m.lyKo){ var A=m.lyAt==null?[h]:m.lyAt, T=m.lyT||[]; return A.map(function(t){ var j=T.indexOf(t), L=[t,m.lyEn,m.lyKo]; if(j>=0&&j+1<T.length) L.push(Math.min(T[j+1],t+LY_MAX)); return L; }); } return []; }
  function lyEnd(L,i){ var t=+L[i][0]; if(L[i][3]!=null) return +L[i][3]; return i+1<L.length?Math.min(+L[i+1][0],t+LY_MAX):t+LY_LAST; }
  function lyAt(L,x){ for(var i=L.length-1;i>=0;i--) if(+L[i][0]<=x+0.05) return x<lyEnd(L,i)?i:-1; return -1; }
  function lyFirst(L,H){ var hx=H+LY_HOOK_AT; for(var j=0;j<L.length;j++){ if(+L[j][0]>hx||hx<lyEnd(L,j)) return j; } return L.length; }
  function lyBr(s){ return e(s).replace(/\n/g,'<br>'); }   /* 한 시각에 묶인 두 줄 */
  /* ★★[LY_ORIG_TOP 2026-10-13 사장님 «영문 노래는 영문이 위에 노란색 · 한글 노래는 한글이 위에 노란색 · 전부 반대여야지»(Reality 화면을 보시고)]
       원래 부르는 말이 위(노란색 · ly-o) · 옮긴 말이 아래(흰색 · ly-t) — 종전 [LY_KO_TOP] «늘 한글이 위»는 한국어 곡에만 맞았다.
       곡의 원래 말은 아래 표 — 한국어 곡 r1 · r8 · 섞인 곡 r6 는 줄마다(원곡에서 영문으로 부르는 줄의 시각) · 그 밖의 곡은 영문.
       근거: docs 저장소 operations/rec-songs 의 번역 전 목록(d5d4bfa) — 한국어 곡은 한글만 · 영어 곡은 영문이 원문 · r6 는 영문 줄 열 개.
       ★곡을 바꾸면 이 표도 함께(docs operations/rec-songs/README «곡을 바꿀 때») */
  var LY_ORIG={r1:'ko',r8:'ko',r6:{en:[52.12,55.76,59.3,63.29,66.55,92.14,95.74,99.48,102.74,132.27]}};
  function lyOrig(k,t){ var o=LY_ORIG[k]; if(!o) return 'en'; if(typeof o==='string') return o; return (o.en||[]).some(function(x){ return Math.abs(x-(+t))<0.05; })?'en':'ko'; }
  function lyHtml(line,k){ var en=line[1]?'<span class="mu-en" lang="en">'+lyBr(line[1])+'</span>':'', ko=line[2]?'<span class="mu-ko'+(line[1]?'':' mu-nt')+'">'+lyBr(line[2])+'</span>':'';
    if(!en||!ko) return (en||ko).replace('<span class="','<span class="ly-o ');   /* 한쪽뿐이면 그 줄이 원래 말 */
    return lyOrig(k,line[0])==='en'?en.replace('<span class="','<span class="ly-o ')+ko.replace('<span class="','<span class="ly-t '):ko.replace('<span class="','<span class="ly-o ')+en.replace('<span class="','<span class="ly-t '); }   /* [LY_ORIG_TOP] 원래 말 위 · 옮긴 말 아래 */   /* ★[LY_KO_TOP 2026-10-13 사장님 참고 사진] 한글(노란색)이 위 · 영문(흰색 · 살짝 기울임)이 아래 — 종전 영문 위 · 한글 아래 */
  function lyPut(sl,h){ var b=sl&&sl.querySelector('.mu-lines'); if(!b||b.__h===h) return; var was=!!b.__h; b.__h=h; clearTimeout(b.__t);
    if(!h){ b.classList.remove('cur'); b.__t=setTimeout(function(){ if(!b.__h) b.innerHTML=''; },RM?0:400); return; }   /* 사라질 때 = 흐려진 뒤 비운다 */
    if(!was){ b.innerHTML=h; void b.offsetWidth; b.classList.add('cur'); return; }   /* 처음 나타날 때 = 그 순간 떠오른다 */
    b.classList.remove('cur'); b.__t=setTimeout(function(){ b.innerHTML=h; void b.offsetWidth; b.classList.add('cur'); },RM?0:LY_SWAP_MS); }   /* 줄이 바뀔 때 = 0.12초 흐려졌다 새 줄 */
  function lyTick(p){ var m=recMeta(p.k); if(!m||!AC) return; var L=lyLines(m); if(!L.length) return;
    var off=m.lyOff||0, x=p.x0+(AC.currentTime-p.t0)-Math.min(AC.outputLatency||0,LY_LAT_MAX)+LY_LEAD-off, i=lyAt(L,x); if(p.lyF==null) p.lyF=lyFirst(L,+p.H-off); if(i>=0&&i<p.lyF) i=-1;
    if(i===p.lyI) return; p.lyI=i; var sl=D.querySelector('.ls-mu .mu-slide[data-k="'+p.k+'"]'); if(!sl) return; sl.__lyMod=true; sl.__wt=false; lyPut(sl,i>=0?lyHtml(L[i],p.k):''); }   // [LY_ORIG_TOP] 곡 키로 원래 말을 가린다
  function lyRest(){ var pk=PREV&&PREV.k; [].forEach.call(D.querySelectorAll('.ls-mu .mu-slide'),function(sl){ if(!sl.__lyMod||sl.getAttribute('data-k')===pk) return; sl.__lyMod=false; lyPut(sl,''); }); }   /* 멈추면 그 카드 가사는 걷힌다 */
  /* [MUS_CAROUSEL] 손가락 · 마우스로 넘기기 — 가로로 8px 넘게 움직이면 끌기(세로가 먼저면 화면 스크롤 · touch-action:pan-y) · 폭의 18% 넘게 또는 빠르게 밀면 다음 곡 · 끝 카드에서는 덜 끌린다 · 끌고 난 손에는 누르기를 보내지 않는다 */
  D.addEventListener('pointerdown',function(ev){ var vp=ev.target&&ev.target.closest&&ev.target.closest('.ls-mu .mu-car:not(.mu-car0) .mu-vp'); if(!vp||ev.button>0||!ev.isPrimary) return; CD={vp:vp,id:ev.pointerId,x:ev.clientX,y:ev.clientY,t:performance.now(),on:false,dx:0,w:vp.getBoundingClientRect().width||1}; });
  D.addEventListener('pointermove',function(ev){ var d=CD; if(!d||ev.pointerId!==d.id) return; var dx=ev.clientX-d.x, dy=ev.clientY-d.y;
    if(!d.on){ if(Math.abs(dy)>10&&Math.abs(dy)>Math.abs(dx)){ CD=null; return; } if(Math.abs(dx)<8||Math.abs(dx)<=Math.abs(dy)) return; d.on=true; var c0=d.vp.closest('.mu-car'); if(c0) c0.classList.add('drag'); try{ d.vp.setPointerCapture(d.id); }catch(x){} }
    var i=carIdx(), n=(REC.ls||[]).length; if((i<=0&&dx>0)||(i>=n-1&&dx<0)) dx*=0.35; d.dx=dx; var tr=d.vp.querySelector('.mu-track'); if(tr) tr.style.transform='translateX(calc('+(-100*i)+'% + '+dx.toFixed(1)+'px))'; });
  function carDragEnd(ev){ var d=CD; if(!d||ev.pointerId!==d.id) return; CD=null; if(!d.on) return; var c=d.vp.closest('.mu-car'); if(c) c.classList.remove('drag'); CAR_SWALLOW=performance.now();
    var v=d.dx/Math.max(1,performance.now()-d.t), i=carIdx(), go=i; if(ev.type!=='pointercancel'&&(Math.abs(d.dx)>d.w*0.18||Math.abs(v)>0.45)) go=i+(d.dx<0?1:-1);
    if(go!==i&&go>=0&&go<(REC.ls||[]).length) carGo(go); else paintCar(); }   /* 못 넘기면 제자리로 미끄러져 돌아간다 */
  D.addEventListener('pointerup',carDragEnd); D.addEventListener('pointercancel',carDragEnd);
  D.addEventListener('click',function(ev){ if(CAR_SWALLOW&&performance.now()-CAR_SWALLOW<400&&ev.target&&ev.target.closest&&ev.target.closest('.ls-mu .mu-vp')){ CAR_SWALLOW=0; ev.stopPropagation(); ev.preventDefault(); } },true);
  D.addEventListener('keydown',function(ev){ if(ev.key!=='ArrowLeft'&&ev.key!=='ArrowRight') return; var t=ev.target, c=t&&t.closest&&t.closest('.ls-mu .mu-car'); if(!c||c.classList.contains('mu-car0')) return; ev.preventDefault(); carGo(carIdx()+(ev.key==='ArrowRight'?1:-1)); });   /* 카드 묶음 안에서 ← → = ‹ › */

  /* [UP_GUIDE] 안내 창 — 빌더 «확정하면 이렇게 돼요»(KEEP_DLG) 틀 · 빌더 창(_dlgModel · #mkRecDlg)에서 그린다 · [GUIDE_OK] 아래 단추는 «알겠어요» 하나(창만 닫는다) */
  function guideBody(){ var kp=function(t,tag,on){ return '<span class="mk-kp'+(on?' on':'')+'">'+(on?ico('check'):'')+t+(tag?' '+tag:'')+'</span>'; };
    return '<ol class="mk-rd-steps">'
      +'<li><span class="mk-rd-n" aria-hidden="true">1</span><p><b>곡 파일을 올려요</b>MP3 · M4A 파일을 고르면 바로 곡을 살펴봐요'+(IOS_DEV?' · '+IOS_DEV+' ‹파일 선택›에서 골라요':'')+'</p></li>'
      +'<li><span class="mk-rd-n" aria-hidden="true">2</span><p><b>크게 올라오는 자리를 찾아 드려요</b>후보 몇 곳 중 걷는 동안 곡이 이어지는 자리를 추천해요<span class="mu-gd-c" aria-hidden="true">'+kp('0:38','추천',true)+kp('1:28')+kp('2:24')+'</span></p></li>'
      +'<li><span class="mk-rd-n" aria-hidden="true">3</span><p><b>들어 보고 골라요</b>자리마다 ▶ 를 누르면 그 앞뒤를 들려 드려요</p></li>'
      +'<li><span class="mk-rd-n" aria-hidden="true">4</span><p><b>원하는 자리가 없으면 직접 적어요</b>곡에서 원하는 때를 분:초로 적으면 그 자리에 맞춰요<span class="mu-gd-in" aria-hidden="true">1:05</span></p></li></ol>'
      +(function(){ var st=vNow(), nar=!!(st&&st.nar);   /* [ENTRY_SCENE_1012] 스튜디오 나레이션 판은 마지막 말이 나레이션의 «입장!»이다 — «두 분의 마지막 말»은 AI 판만 */
        return '<p class="mk-note mk-rd-sum"><span>고른 자리는 '+(nar?'«입장!»이':'두 분의 마지막 말이')+' 끝나는 순간 크게 올라와요.</span>'+(EM.scene?'<span><b>이 순간 전체 듣기</b>로 '+(nar?'멘트':'인사')+'부터 입장까지 음악과 함께 들어 보세요.</span>':'')+'</p>'; })()
      +'<button type="button" class="mk-dlg-go" data-fk="muguideok" onclick="mkDlgClose()">알겠어요</button>'; }
  function guideOpen(){ try{ if(typeof _tipSeen==='function') _tipSeen('mu'); MK.muGuide=true; }catch(x){} hush(); renderAll(); }   /* 창은 빌더 render 끝(_recDlgPaint)이 그린다 */
  function seen(){ var t=St().tipSeen; return !!(t&&t.mu); }

  /* ── ★★[ENTRY_SCENE_1012] 2단계 «음악과 함께 듣기» — 시험실 v50 장면 엔진(plan · envDb · 그래프)을 빌더 입장 목소리로 ──
     목소리 = 빌더 «이 순간 전체 듣기»가 트는 그 줄(_lSteps 첫 줄 · 두 분 목소리면 own · 나레이션이면 entry-A~F) · 곡 = 이 기기에 올린 곡(위 UPS).
     목소리는 한 파일이라 문장 사이 쉼으로 조각을 나눈다(시험실 sentSplit) — 조각은 «끝에서 두 번째 말이 끝나면 음악이 한 번 더 낮아지는 자리»와 그래프 목소리 대시에만 쓴다.
     하이라이트 = 마지막 말이 끝난 뒤 0.3초(breath) — 파일 끝 빈소리를 걷은 실제 말끝이라 기기 목소리(시험실 TTS 어림)처럼 어긋나지 않는다. 그래서 «이어 듣기»도 같은 계획을 다시 짜면 된다 */
  var SP=ES.SP, FADE_DN=ES.FADE_DN, OUTF=ES.OUTF, LATE_T=ES.LATE_T, VOICE_LUFS=ES.VOICE_LUFS;   /* [ENTRY_SCENE_ENGINE] 시험실 DEF_P · CUE.fadeDownMs · OUTF · LATE_T · VOICE_LUFS — 값은 entry-scene.js 한 곳(당일 콘솔과 같은 계산) */
  var RUN=null, RID=0, PAUSE=null, ENDED=false, LASTRUN=null, PEND=false, LIM=null, VB={}, VR={}, VFAIL={};
  function lerp(a,b,t){ return a+(b-a)*clamp(t,0,1); }
  function vStep(){ try{ if(typeof ENG==='undefined'||!ENG||typeof _lSteps!=='function') return null; var a=_lSteps(ENG,['entry']); for(var i=0;i<a.length;i++){ var x=a[i]; if((x.own&&x.up==='entry')||/^entry-[A-F]$/.test(x.slug||'')) return x; } }catch(x2){} return null; }
  var sentN=ES.sentN;
  function vNow(){ var x=vStep(); if(!x) return null; var v={src:x.src||null,txt:String(x.txt||''),nar:!x.own,n:sentN(x.txt)}; v.key=(v.src||'')+'|'+v.n+'|'+(v.nar?1:0); return v; }   /* src 가 없으면 두 분 AI 를 아직 안 만든 것 */
  var edgeTrimIdx=ES.edgeTrimIdx, sentSplit=ES.sentSplit;   /* [ENTRY_SCENE_ENGINE] 말 앞뒤 빈소리 · 문장 조각 — 엔진 한 곳 */
  /* 받기 — 15초 동안 아무것도 안 오면 끊는다 · 코드는 [ERR_CODES] 표대로(L3 파일 없음 · L5 오래 걸림 · L6 연결 · M6 기기가 못 엶 · M7 재생 막힘) */
  function getAB(url){ var ctl=window.AbortController?new AbortController():null, lim=0, arm=function(){ clearTimeout(lim); lim=setTimeout(function(){ if(ctl) ctl.abort(); },15000); }; arm();
    return fetch(url,ctl?{signal:ctl.signal}:{}).then(function(r){ if(!r.ok){ var y=new Error('http'); y.code='L3'; throw y; } arm(); return r.arrayBuffer(); })
      .then(function(ab){ clearTimeout(lim); return ab; },function(x){ clearTimeout(lim); if(x&&x.code) throw x; var y=new Error('net'); y.code=(x&&x.name==='AbortError')?'L5':'L6'; throw y; }); }
  function errMsg(x){ var c=x&&x.code;
    if(c==='L6') return '목소리를 불러오지 못했어요 · 인터넷을 확인해 주세요 (코드 L6)';
    if(c==='L3') return '목소리 파일을 찾지 못했어요 (코드 L3)';
    if(c==='L5') return '목소리를 불러오는 데 오래 걸려요 (코드 L5)';
    if(c==='M6') return '이 기기에서 목소리를 열지 못했어요 (코드 M6)';
    if(c==='M7') return '소리 재생이 막혔어요 · 화면을 누른 뒤 다시 눌러 주세요 (코드 M7)';
    return '소리를 준비하지 못했어요 · 다시 눌러 주세요 (코드 L4)'; }
  function vPrep(st){ var k=st.key; if(VR[k]) return Promise.resolve(VR[k]); if(VB[k]) return VB[k];
    VB[k]=getAB(st.src).then(function(ab){ return decode(ab).catch(function(){ var y=new Error('decode'); y.code='M6'; throw y; }); }).then(function(b){
      var V0=ES.prepVoice(b,st.n,st.nar); V0.key=k; V0.caps=capsOf(st);   /* [ENTRY_SCENE_ENGINE] 크기 · 문장 조각 · 말끝 걷기(시험실 buildVO)는 엔진 한 곳 */ VR={}; VR[k]=V0; delete VB[k]; delete VFAIL[k]; return V0; },function(err){ delete VB[k]; VFAIL[k]=Date.now(); throw err; });
    return VB[k]; }
  function hookNow(u){ if(u&&u.rec){ var mu=St().mu, h=(recOn()&&mu.k===u.k&&mu.hook!=null)?+mu.hook:u.H; return clamp(h,0.5,u.Sg.dur-0.5); }   /* [REC_SONG_1012] 추천 곡 = 초안의 자리(S.mu.hook · 당일 콘솔과 같은 값) */
    var c=upList(u)[u.pick]||upList(u)[0]; return clamp(c?c.t:u.Sg.dur*0.4,0.5,u.Sg.dur-0.5); }
  /* 장면 짜기 · 음량 곡선 — [ENTRY_SCENE_ENGINE] entry-scene.js 한 곳(마지막 말 끝 + 0.3초 = 하이라이트 · 거꾸로 곡 시작점 · 목소리 밑 작게 → 크게 → 20초 머문 뒤 4초에 잦아듦).
     당일 콘솔이 같은 식을 쓴다(그쪽은 디렉터가 다음을 누를 때까지 크게 머문다) */
  /* [BGM_FIRST_1013] 추천 곡은 같은 소절이 다시 나오는 뒤 자리(hooks)도 함께 넘긴다 — 멘트가 길면 엔진이 그 자리에 문 열림을 맞춰 음악이 늘 먼저(당일 콘솔은 S.mu.hooks) */
  function hooksOf(u){ if(!u||!u.rec) return null; var mu=St().mu, m=recMeta(u.k); if(recOn()&&mu.k===u.k&&Array.isArray(mu.hooks)) return mu.hooks; return (m&&m.hooks&&m.hooks.length)?m.hooks:null; }
  function plan(V0,Sg,H,u){ return ES.plan(V0,Sg,H,{hooks:hooksOf(u)}); }
  function envDb(PL,x){ return ES.envDb(PL,x); }
  function envGain(PL,x){ return ES.envGain(PL,x); }
  function envCurve(PL,x0,x1){ return ES.envCurve(PL,x0,x1); }
  function outNode(){ var a=ac(); if(LIM&&LIM.context===a) return LIM; LIM=a.createDynamicsCompressor(); LIM.threshold.value=-2; LIM.knee.value=0; LIM.ratio.value=20; LIM.attack.value=0.002; LIM.release.value=0.15; LIM.connect(a.destination); return LIM; }   /* 시험실 ac() 의 리미터 — 곡은 −12 LUFS 로 맞춰 터지는 자리에서 겹칠 수 있다 */
  function acReady(){ var a=ac(); if(a.state==='running') return Promise.resolve(a); var r=null; try{ r=a.resume(); }catch(x){}
    return Promise.race([Promise.resolve(r).then(function(){ return a; },function(){ return a; }),new Promise(function(ok){ setTimeout(function(){ ok(a); },1500); })]).then(function(a2){ if(a2.state!=='running'){ var y=new Error('blocked'); y.code='M7'; throw y; } return a2; }); }
  function tau(R){ return R.from+(AC.currentTime-R.t0); }
  function lastOf(R){ return {V0:R.V0,PL:R.PL,key:R.key,txt:R.txt,Sg:R.Sg,hk:R.hk}; }
  function scStop(){ RID++; var R=RUN; RUN=null; PEND=false; if(!R) return null; videoReset(); cancelAnimationFrame(R.raf); R.nodes.forEach(function(n){ try{ n.stop(); }catch(x){} }); setTimeout(function(){ R.gains.forEach(function(g){ try{ g.disconnect(); }catch(x){} }); },60); return R; }
  function scHalt(){ if(RUN){ var R=RUN, x=tau(R); scStop(); PAUSE={x:x,whole:!!R.whole}; LASTRUN=lastOf(R); ENDED=false; scPaint(); return true; } if(PEND){ scStop(); scPaint(); return true; } return false; }   /* 그 자리에 멈춤 → «이어 듣기»(시험실 PAUSE) · [ONE_PLAY_1013] 이어 들어도 다음 줄까지 */
  function scReset(){ var had=!!(RUN||PEND||PAUSE||ENDED||LASTRUN); scStop(); PAUSE=null; ENDED=false; LASTRUN=null; if(had) scPaint(); }   /* 곡 · 자리 · 목소리가 바뀌면 멈춘 자리도 걷는다 */
  function scPlay(from,whole){ var st=vNow(), u=scSong(); if(!st||!st.src||!(u||recOn())) return; hush(); quietOthers(); scStop(); PAUSE=null; ENDED=false; LASTRUN=null; var id=++RID, key=st.key, txt=st.txt; wake(); PEND=true; scPaint();   /* [ONE_PLAY_1013] whole = 장면이 끝나면 그 순간 다음 줄까지(알약 · 그래프) · 크게 보기는 장면만 */
    Promise.all([vPrep(st),acReady(),u?u:recSong(St().mu.k)]).then(function(rr){ var s2=rr[2]; return (s2&&s2.rec&&!scCovers(s2,rr[0]))?recSong(s2.k,true).then(function(f){ rr[2]=f; return rr; }):rr; })   /* [REC_CLIP_1013] 짧은 판이 이 장면을 다 못 담으면 곡 전체 */
    .then(function(rr){ if(id!==RID) return; var V0=rr[0], a=AC, so=rr[2], Sg=so.Sg, H=hookNow(so), PL=plan(V0,Sg,H,so); from=clamp(from||0,0,Math.max(0,PL.tend-0.2)); PEND=false;   /* [REC_SONG_1012] 추천 곡이 아직이면 받으면서 준비한다(준비하는 중) */
      var t0=a.currentTime+0.15, R={id:id,V0:V0,PL:PL,from:from,t0:t0,nodes:[],gains:[],key:key,txt:txt,Sg:Sg,hk:H,whole:!!whole}, out=outNode();
      var mg=a.createGain(); mg.gain.value=Sg.gain; mg.connect(out); var eg=a.createGain(); eg.connect(mg); R.gains.push(mg,eg);
      var sx=Math.max(from,PL.tm), pos=PL.off+(sx-PL.tm), so0=Sg.o||0, en=Sg.end!=null?Sg.end:Sg.dur; if(pos<en){ var ms=a.createBufferSource(); ms.buffer=Sg.buf; ms.connect(eg); R.nodes.push(ms); try{ ms.start(t0+(sx-from),Math.max(0,pos-so0)); }catch(x){} }   /* [REC_CLIP_1013] 원곡 시각 → 판 시각 */
      var c=envCurve(PL,from,PL.tend); eg.gain.value=c[0]; try{ eg.gain.setValueCurveAtTime(c,t0,Math.max(0.05,PL.tend-from)); }catch(x){}
      if(V0.pieces.length&&PL.tv+PL.V>from){ var vg=a.createGain(); vg.gain.value=V0.gain; vg.connect(out); R.gains.push(vg);
        var vv=ES.voiceStart(a,V0,vg,t0,PL.tv,from); R.vsn=vv.nodes.length; vv.nodes.forEach(function(n){ R.nodes.push(n); }); vv.gains.forEach(function(g){ R.gains.push(g); }); }   /* [ENTRY_CALL_PAUSE_1013] 목소리는 엔진이 끊어 건다 — «신랑 신부, 입장!» 앞 쉼(SP.call · 당일 콘솔과 같은 자리) */
      a.onstatechange=function(){ if(a.state!=='running'&&RUN&&!D.hidden){ scHalt(); toast('소리가 끊겨 멈춰 뒀어요'); } };   /* 시험실 AC_LIFE — 전화 · 다른 앱이 소리를 가져가면 */
      RUN=R; scPaint(); loop(); }).catch(function(err){ if(id!==RID) return; scStop(); scPaint(); toast(err&&err.song?recErr(err.code):errMsg(err)); }); }
  function loop(){ var R=RUN; if(!R) return; var x=tau(R); paintGraph(x); if(BIG) paintCap(x); if(x>=R.PL.tend+0.2){ scStop(); LASTRUN=lastOf(R); ENDED=true; PAUSE=null; scPaint(); if(R.whole&&!BIG) restGo(); return; } R.raf=requestAnimationFrame(loop); }
  /* [ONE_PLAY_1013] 장면이 끝나면(음악이 잦아든 뒤) 그 순간 다음 줄부터 빌더가 이어서 튼다 — 쪽을 떠났거나 다른 소리가 흐르면 잇지 않는다 */
  function restGo(){ try{ if(typeof lsRest!=='function'||!D.querySelector('.em-scene')) return; if(typeof LP!=='undefined'&&LP.q&&LP.q.length) return; if(typeof MK!=='undefined'&&MK.aud) return; lsRest('entry'); }catch(x){} }
  /* [ONE_PLAY_1013] 빌더 «이 순간 전체 듣기»(lsPlay('entry'))가 목소리 확인 · 안 만든 줄 만들기를 마친 뒤 부른다 — 곡을 골라 장면이 섰으면 장면부터 틀고 true · 아니면 false(빌더가 종전대로 줄만).
     두 분 AI 소리가 서버에는 있는데 이 기기에 아직 안 왔으면 8초까지 받아 오며 «준비하는 중» · 못 받으면 빌더 길(까닭을 그 줄 아래에 말한다 · PLAY_FILE_WHY) */
  function whole(){ var st=vNow(), u=scSong(); if(!D.querySelector('.em-scene')||!st||!(u||recOn())) return false;
    if(st.src){ scPlay(0,true); return true; }
    var v=(St().up||{}).entry; if(!(v&&typeof v==='object'&&v.id)) return false;
    hush(); quietOthers(); scStop(); PAUSE=null; ENDED=false; LASTRUN=null; var id=++RID, t0=Date.now(); PEND=true; scPaint(); try{ if(typeof _rfUrl==='function') _rfUrl('entry',true); }catch(x){}
    (function w(){ if(id!==RID) return; var s2=vNow(); if(s2&&s2.src){ PEND=false; scPlay(0,true); return; } if(Date.now()-t0>8000){ PEND=false; scPaint(); try{ if(typeof _lStart==='function') _lStart(['entry'],false); }catch(x){} return; } setTimeout(w,200); })();
    return true; }
  /* 목소리가 없을 때 누르면 — 빌더 줄 ▶ 와 같은 알림(AI_PLAY_READY · OFF_TOAST «목소리를 먼저 만들어 주세요» · «만들러 가기») */
  function offPress(){ try{ if(typeof _playOff==='function'&&_playOff('entry')&&typeof mkPlayOff==='function'){ mkPlayOff('entry'); return; } }catch(x){} try{ if(typeof _rfUrl==='function') _rfUrl('entry',true); }catch(x){} toast(typeof AI_OFF_PREP==='string'?AI_OFF_PREP:'준비 중이에요'); }
  /* 화면 — 알림(늦게 들어오는 판) → 그래프(흰 카드) → 긴 알약([PLAYER_ORDER]) */
  var SCENE_WAIT=['본식 5분 전부터 문 앞에서 기다려요','본식 5분 전부터 기다려요','5분 전부터 기다려요','기다려요','대기',''], SCENE_WALK=['문이 열리고 걸어 들어와요','걸어 들어와요','입장',''];   /* [SCENE_WAIT5 · WAIT_GROUP] 시험실 그대로 */
  function graphHtml(nar){ var al=nar?'소리 흐름 · 본식 5분 전부터 두 분이 문 앞에서 기다리는 동안 작게 흐르는 음악 위로 입장 멘트가 흐르고, «입장!»이 끝나면 음악이 크게 올라오며 문이 열리고 두 분이 걸어 들어와 도착해요':'소리 흐름 · 본식 5분 전부터 두 분이 문 앞에서 기다리는 동안 작게 흐르는 음악 위로 두 분 목소리로 인사가 흐르고, 마지막 말이 끝나면 음악이 크게 올라오며 문이 열리고 두 분이 걸어 들어와 도착해요';
    return '<div class="em-graph" role="img" aria-label="'+e(al)+'" onclick="emAct(\'graph\',event)"><div class="lg-names" aria-hidden="true"><span>음악</span><span>목소리</span></div><div class="lg-plot"><canvas aria-hidden="true"></canvas><span class="lg-wait" hidden>곡을 불러오는 중이에요</span></div>'
      +'<div class="lg-scene wait" aria-hidden="true"><span class="lgs-greet">'+SCENE_WAIT[0]+'</span><span class="lgs-walk"><b>'+SCENE_WALK[0]+'</b><em>도착</em></span></div></div>'; }
  /* ★★[ONE_PLAY_1013 2026-10-13 사장님 «플레이 위아래 두 개 · 디자인적으로 별로» → 시안 «a»] 알약 하나 «이 순간 전체 듣기 · 음악과 함께» —
     누르면 빌더 «이 순간 전체 듣기» 입구(lsPlay · 목소리 확인 · 안 만든 줄 만들기 [LS_MAKE_ALL])를 지나 장면(음악 → 멘트 → 문 열림)을 틀고, 장면이 끝나면 그 순간 다음 줄까지 이어서(lsRest).
     곡을 골라 장면이 서면 빌더의 «이 순간 전체 듣기 · n줄 이어서» 알약은 그리지 않는다(order-preview) · 곡이 없으면 그 알약 하나(종전). ★두 알약을 다시 위아래로 두지 말 것 — 2026-10-13 사용자 지시 */
  function mkBusy(){ try{ return !!(typeof MK!=='undefined'&&MK&&(((MK.lsMake||{}).entry)||((MK.lsPend||{}).entry)||MK.lsBusy==='entry')); }catch(x){ return false; } }   /* 빌더가 이 순간 줄을 만드는 중 */
  function restOn(){ try{ return typeof _mpOn==='function'&&_mpOn('entry'); }catch(x){ return false; } }   /* 장면 뒤 줄(맞절 등)을 빌더가 트는 중 */
  function offAll(){ try{ return typeof _playOffAll==='function'&&!!_playOffAll('entry'); }catch(x){ return false; } }   /* 읽는 분 목소리가 아직 없다 — 만들 수도 없다(AI_PLAY_READY) */
  function mkWait(){ try{ if(typeof _wfx!=='function') return {c:'',s:''}; var b=mkBusy(), ck=b?((MK.lsMake||{}).entry||((MK.lsPend||{}).entry?((MK.lsPendAt||{}).entry||{}):(MK.lsBusyAt||{}))):{}; return _wfx('mp:entry',b,ck.d,ck.at); }catch(x){ return {c:'',s:''}; } }   /* [WAIT_FILL] 빌더 알약과 같은 차오름 */
  function pillHtml(st,PL){ var mk=mkBusy(), busy=PEND, on=!busy&&!mk&&(!!RUN||restOn()), ps=!on&&!busy&&!mk&&!!PAUSE, off=!on&&!busy&&!mk&&!ps&&!(st&&st.src)&&offAll(), w=mkWait();
    return '<button type="button" class="mk-hbtn em-scp'+(on?' on':'')+(off?' off':'')+w.c+'"'+w.s+' data-fk="emscene" aria-pressed="'+on+'"'+(busy||mk?' aria-busy="true"':'')+(mk?' disabled':'')+(off?' aria-disabled="true"':'')+' onclick="emAct(\'scene\',this)">'+(on?ico('stop'):ico('play'))+' '+(mk?'만드는 중':busy?'준비하는 중':on?'멈추기':ps?'이어 듣기':'이 순간 전체 듣기 · 음악과 함께')+'</button>'; }
  var ICO_BIG='<svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M7.5 3.5h-4v4M12.5 3.5h4v4M7.5 16.5h-4v-4M12.5 16.5h4v-4"/></svg>';   /* 시험실 ICO_BIG */
  function bigBtnHtml(st){ var off=!(st&&st.src); return '<button type="button" class="mk-hbtn em-bigbtn'+(off?' off':'')+'" data-fk="embig" aria-label="크게 보며 듣기"'+(off?' aria-disabled="true"':'')+' onclick="emAct(\'big\',this)">'+ICO_BIG+'</button>'; }
  /* 지금 목소리 · 곡이 듣던 장면과 다르면(예시를 바꿈 · 글을 고침 · 다른 곡) 듣던 것과 멈춘 자리를 걷는다 */
  function sceneCheck(st){ var R=RUN||LASTRUN; if(!R) return; var u=scSong(); if(!st||st.txt!==R.txt||(st.src&&st.key!==R.key)||!u||u.Sg!==R.Sg||hookNow(u)!==R.hk){ scStop(); PAUSE=null; ENDED=false; LASTRUN=null; } }
  function sceneHtml(){ var st=vNow(), u=scSong(); if(!st||!(u||recOn())) return ''; sceneCheck(st);   /* [REC_SONG_1012] 고른 곡이 추천 곡이면 받는 동안에도 자리를 그린다(그래프는 기다림 · 받으면 채운다) */
    var V0=st.src?VR[st.key]:null; u=(V0&&u)?scFor(u,V0):u; var PL=(V0&&u)?plan(V0,u.Sg,hookNow(u),u):null, R0=RUN||((PAUSE||ENDED)?LASTRUN:null), PLs=R0?R0.PL:PL, late=!!(PLs&&PLs.tm>LATE_T), h='<section class="mk-sec em-scene" aria-label="이 순간 전체 듣기 · 음악과 함께">';
    if(late) h+='<div class="mk-recws em-late"><p class="mk-recw"><b>'+(st.nar?'멘트가':'인사가')+' 길어 음악이 '+Math.max(1,Math.round(PLs.tm))+'초 늦게 들어와요</b><span>'+(st.nar?(u&&u.rec?'더 짧은 멘트를 고르면 음악이 먼저 흘러요':'더 뒤 자리를 고르면 음악이 먼저 흘러요'):'조금 줄이면 음악이 먼저 흘러요')+'</span></p></div>';   /* [LATE_MUSIC · LATE_NOTE_FORM] 빌더 알림 모양 */
    if(st.src) h+=graphHtml(st.nar);   /* 목소리가 없으면 그래프를 그리지 않는다 — 없는 소리를 그리지 않는다(GRAPH_MIN) */
    h+='<div class="mk-sech mk-sech-r em-play">'+pillHtml(st,PL)+bigBtnHtml(st)+'</div>';   /* [ENTRY_BIG_1012] 크게 보기는 옆 작은 단추로만([PLAYER_ORDER]) */
    try{ if(typeof _lsNote==='function') h+=_lsNote('entry'); }catch(x){}   /* [ONE_PLAY_1013] 다 못 만든 줄이 있으면(LS_MAKE_FAIL) 빌더 알약 아래에 서던 한 줄을 이 알약 아래에 */
    h+='</section>';
    if(st.src&&!V0&&!VB[st.key]&&!(VFAIL[st.key]&&Date.now()-VFAIL[st.key]<15000)) setTimeout(function(){ vPrep(st).then(function(){ sceneSync(); },function(){}); },0);   /* 길이 · 그래프는 목소리를 풀어야 안다 — 받는 동안 그래프 자리는 그대로(SCENE_HOLD) */
    return h; }
  /* 이 칸만 다시 — 곡 칸(redraw) · 목소리를 풀었을 때 · 빌더가 다 그린 뒤 */
  /* [ONE_PLAY_1013] 장면 칸이 빌더를 다시 그리지 않고 생기거나(곡을 막 올림 · 받음) 없어질 때 — 빌더 «이 순간 전체 듣기 · n줄 이어서» 알약을 숨기고 · 되살린다(알약은 늘 하나) */
  function mpSync(){ try{ var on=!!D.querySelector('.em-scene'); D.querySelectorAll('.mk-hbtn[data-mp="entry"]').forEach(function(b){ var w=b.closest('.mk-sech')||b, nx=w.nextElementSibling; if(w.hidden!==on) w.hidden=on; if(nx&&nx.classList.contains('mk-ploff')&&nx.hidden!==on) nx.hidden=on; }); }catch(x){} }
  /* 장면 칸이 없어졌는데(곡을 뺌 · 풀어 줌) 빌더 알약이 아예 안 그려져 있으면(장면이 있을 때 그린 쪽) 한 번 다시 그린다 — 렌더 안에서 부를 수 있어 다음 틀에 */
  var MPB=0; function mpBack(){ mpSync(); if(MPB||D.querySelector('.mk-hbtn[data-mp="entry"]')) return; MPB=1; setTimeout(function(){ MPB=0; if(!D.querySelector('.em-scene')&&D.querySelector('.ls-mu')&&!D.querySelector('.mk-hbtn[data-mp="entry"]')) renderAll(); },0); }
  function sceneSync(){ var row=D.querySelector('.ls-mu'), pick=row&&row.closest('.mk-pick'), old=D.querySelector('.em-scene'); if(!pick){ if(old&&old.parentNode){ old.parentNode.removeChild(old); mpBack(); } return; }
    var h=sceneHtml(), ae=D.activeElement, fk=(ae&&old&&old.contains(ae))?ae.getAttribute('data-fk'):null;
    if(!h){ if(old&&old.parentNode){ old.parentNode.removeChild(old); mpBack(); } return; }
    var t=D.createElement('div'); t.innerHTML=h; var nw=t.firstChild; if(old&&old.parentNode) old.parentNode.replaceChild(nw,old); else pick.parentNode.insertBefore(nw,pick.nextSibling);
    if(fk){ var n=nw.querySelector('[data-fk="'+fk+'"]'); if(n) try{ n.focus({preventScroll:true}); }catch(x){} }
    mpSync(); fitPill(); paintGraph(); }
  function paintPill(){ var b=D.querySelector('.em-scene [data-fk="emscene"]'); if(!b) return; var st=vNow(), V0=st&&st.src&&VR[st.key], u=scFor(scSong(),V0), PL=V0&&u&&u.Sg?plan(V0,u.Sg,hookNow(u),u):null, t=D.createElement('div'); t.innerHTML=pillHtml(st,PL); var n=t.firstChild;
    var bb=D.querySelector('.em-scene [data-fk="embig"]'), bo=!(st&&st.src); if(bb&&bb.classList.contains('off')!==bo){ bb.classList.toggle('off',bo); if(bo) bb.setAttribute('aria-disabled','true'); else bb.removeAttribute('aria-disabled'); }
    if(b.outerHTML===n.outerHTML) return; var foc=D.activeElement===b; b.parentNode.replaceChild(n,b); if(foc) try{ n.focus({preventScroll:true}); }catch(x){} fitPill(); }
  function scPaint(){ paintPill(); if(BIG) paintBig(); else paintGraph(); }
  /* [PILL_FIT] 한 줄에 안 들어가면 길이(약 N초)만 뺀다 · 그래도 넘치면 그때만 줄바꿈(시험실 그대로 — 높이 · scrollWidth 로는 못 잰다) */
  function pillOver(b){ var cs=getComputedStyle(b), r=D.createRange(); r.selectNodeContents(b); return r.getBoundingClientRect().width>b.clientWidth-parseFloat(cs.paddingLeft)-parseFloat(cs.paddingRight)+0.5; }
  function fitPill(){ try{ var b=D.querySelector('.em-scene [data-fk="emscene"]'); if(!b) return; var t=b.querySelector('.mk-sec-t'); b.classList.remove('em-wrap'); if(t) t.classList.remove('off'); if(t&&pillOver(b)) t.classList.add('off'); if(pillOver(b)) b.classList.add('em-wrap'); }catch(x){} }
  /* 그래프 — 시험실 GRAPH_LEVEL 그대로: 음악 = 바닥에서 차오르는 음량 면 + 윗선 · 목소리 = 줄마다 얇은 대시 · 들은 쪽이 진해진다 · 진사 세로선 없음([GRAPH_NO_SEAL_LINE]) */
  function lvl(a){ return a<=0?0:clamp((20*Math.log(a)/Math.LN10+42)/42,0,1); }   /* −42dB ~ 0dB 를 0 ~ 1 로 */
  function pkRange(p,t0,t1){ var a=Math.max(0,Math.floor(t0*20)), b=Math.min(p.length,Math.max(a+1,Math.ceil(t1*20))), m=0; for(var i=a;i<b;i++) if(p[i]>m) m=p[i]; return m; }
  function smoothTo(a,k,cut){ var o=new Float32Array(a.length); for(var i=0;i<a.length;i++){ var s0=0,c0=0; for(var j=-k;j<=k;j++){ var q=i+j; if(q<0||q>=a.length||(cut>=0&&((i<cut)!==(q<cut)))) continue; s0+=a[q]; c0++; } o[i]=c0?s0/c0:a[i]; } return o; }
  var CSSV={}; function cssv(n,f){ if(CSSV[n]) return CSSV[n]; var v=''; try{ v=getComputedStyle(D.documentElement).getPropertyValue(n).trim(); }catch(x){} return (CSSV[n]=v||f); }   /* [BRAND_VAR] 캔버스도 토큰 값으로 */
  function graphData(PL,V0,n){ var key=n+'|'+PL.th+'|'+PL.tend+'|'+PL.tm+'|'+PL.off; if(PL.__g&&PL.__g.k===key) return PL.__g;
    var Sg=PL.Sg, T=Math.max(1,PL.tend), mus=new Float32Array(n), segs=[];
    for(var i=0;i<n;i++){ var t0=T*i/n, t1=T*(i+1)/n, tc=(t0+t1)/2; if(tc>=PL.tm){ var s0=PL.off+(t0-PL.tm), s1=PL.off+(t1-PL.tm); if(s0<Sg.dur&&s1>0) mus[i]=pkRange(Sg.p20,s0,s1)*Sg.gain*envGain(PL,tc); } }
    for(var j=0;j<V0.pieces.length;j++){ var p=V0.pieces[j], a0=PL.tv+PL.rel[j]; if(p.d>0.05) segs.push([a0,a0+p.d]); }
    return (PL.__g={k:key,n:n,mus:mus,segs:segs,T:T,th:PL.th}); }
  function drawGraph(cv,G,x){ var dpr=Math.min(3,window.devicePixelRatio||1), W=Math.max(10,cv.clientWidth||300), H=Math.max(10,cv.clientHeight||84);
    if(cv.width!==Math.round(W*dpr)||cv.height!==Math.round(H*dpr)){ cv.width=Math.round(W*dpr); cv.height=Math.round(H*dpr); }
    var c=cv.getContext('2d'); c.setTransform(dpr,0,0,dpr,0,0); c.clearRect(0,0,W,H);
    var n=G.n, bw=W/n, mH=H*0.54, vTop=mH+8, vH=H-vTop, vMid=vTop+vH/2, px=x==null?-1:clamp(x/G.T*W,0,W), cut=Math.round(G.th/G.T*n);
    var cG=cssv('--gold','#B89A75'), cGd=cssv('--gold-deeper','#7A5F37'), cA=cssv('--accent','#3A2D22'), cB=cssv('--border','#DDD8D1');
    var base=mH-1, amp=base-4, lv=new Float32Array(n); for(var i=0;i<n;i++) lv[i]=lvl(G.mus[i]); lv=smoothTo(smoothTo(lv,5,cut),4,cut);
    function Y(i2){ return base-lv[i2]*amp*0.92; }
    function edge(){ c.moveTo(0,base); c.lineTo(0.5*bw,Y(0)); for(var i2=1;i2<n;i2++) c.lineTo((i2+0.5)*bw,Y(i2)); c.lineTo(W,Y(n-1)); }
    var runs=[]; for(var k=0;k<G.segs.length;k++){ var a0=G.segs[k][0]/G.T*W, a1=G.segs[k][1]/G.T*W, L=runs[runs.length-1]; if(L&&a0-L[1]<2.5) L[1]=Math.max(L[1],a1); else runs.push([a0,a1]); }   /* [VOX_RUN] 줄 사이가 2.5px 보다 좁으면 한 대시 */
    var dh=5, dy=vMid-dh/2;
    function pass(x0,x1,on){ if(x1-x0<0.5) return; c.save(); c.beginPath(); c.rect(x0,0,x1-x0,H); c.clip();
      c.globalAlpha=on?0.5:0.16; c.fillStyle=cG; c.beginPath(); edge(); c.lineTo(W,base); c.closePath(); c.fill();
      c.globalAlpha=on?1:0.5; c.strokeStyle=cGd; c.lineWidth=1.75; c.lineJoin='round'; c.lineCap='round'; c.beginPath(); edge(); c.stroke();
      c.globalAlpha=on?1:0.28; c.fillStyle=cA; c.beginPath(); for(var k2=0;k2<runs.length;k2++){ var xr=runs[k2][0], w=Math.max(4,runs[k2][1]-xr-2); if(c.roundRect) c.roundRect(xr,dy,w,dh,dh/2); else c.rect(xr,dy,w,dh); } c.fill(); c.restore(); }
    c.globalAlpha=1; c.fillStyle=cB; c.fillRect(0,base,W,1);   /* 음량 바닥선 하나 */
    pass(Math.max(0,px),W,false); if(px>0) pass(0,px,true); }
  /* [SCENE_ROW · SCENE_FIT] 장면 줄 — 칸 너비 = 시간 · 지금 지나는 칸만 진하게 · 칸이 좁으면 두 줄 안에 드는 가장 긴 말로(낱말을 쪼개지 않는다) */
  function txtLines(el){ var r=D.createRange(); r.selectNodeContents(el); var rs=r.getClientRects(), tops=[]; for(var i=0;i<rs.length;i++){ var t=Math.round(rs[i].top); if(tops.indexOf(t)<0) tops.push(t); } return tops.length; }
  function fitTxt(el,c){ if(!el) return; for(var i=0;i<c.length;i++){ if(el.textContent!==c[i]) el.textContent=c[i]; if(el.scrollWidth<=el.clientWidth+0.5&&txtLines(el)<=2) return; } }
  function fitWalk(w){ if(!w) return; var b=w.querySelector('b'), em=w.querySelector('em'), c=SCENE_WALK; if(!b||!em) return;
    for(var i=0;i<c.length;i++) for(var k=0;k<2;k++){ em.hidden=k===1; if(b.textContent!==c[i]) b.textContent=c[i]; if(b.scrollWidth<=b.clientWidth+0.5&&w.scrollWidth<=w.clientWidth+0.5&&txtLines(b)<=2) return; } }
  function sceneRow(g,PL,V0,x){ var sc=g.querySelector('.lg-scene'); if(!sc) return; var T=Math.max(1,PL.tend), th=clamp(PL.th,0,T), cols='minmax(0,'+th.toFixed(2)+'fr) minmax(0,'+(T-th).toFixed(2)+'fr)', pw=(g.querySelector('.lg-plot')||{}).clientWidth||0;
    if(sc.__cols!==cols||sc.__pw!==pw){ sc.__cols=cols; sc.__pw=pw; sc.style.gridTemplateColumns=cols; sc.classList.remove('wait'); fitTxt(sc.querySelector('.lgs-greet'),SCENE_WAIT); fitWalk(sc.querySelector('.lgs-walk')); }
    var at=x==null||x>=T-0.05?'':x<th?'greet':'walk'; if((sc.getAttribute('data-at')||'')!==at){ if(at) sc.setAttribute('data-at',at); else sc.removeAttribute('data-at'); }
    if(sc.classList.contains('wait')) sc.classList.remove('wait'); }
  /* ★[SCENE_WAIT_FILL 2026-10-13 사장님 «목소리 밑에 간격이 너무 넓은데 개선»] 곡을 받는 동안(«곡을 불러오는 중이에요») 장면 줄을 숨겨 둬 목소리 아래가 텅 비어 보였다 —
     목소리만으로 장면을 짜(곡이 넉넉하다고 보고: 음악 4초 먼저 · 문 열린 뒤 24초) 목소리 조각 · 장면 줄을 먼저 그린다. 곡이 오면 음악 곡선만 더해진다(보통은 자리가 그대로).
     ★받는 동안 장면 줄을 다시 숨기지 말 것 — 2026-10-13 사용자 지시 */
  function voicePlan(){ var st=vNow(), V0=st&&st.src&&VR[st.key]; if(!V0||!V0.pieces||!V0.pieces.length) return null; return {V0:V0,PL:ES.plan(V0,{dur:1e5,gain:1},5e4)}; }
  function voiceData(PL,V0,n){ var segs=[]; for(var j=0;j<V0.pieces.length;j++){ var p=V0.pieces[j], a0=PL.tv+PL.rel[j]; if(p.d>0.05) segs.push([a0,a0+p.d]); } return {k:'v',n:n,mus:new Float32Array(n),segs:segs,T:Math.max(1,PL.tend),th:PL.th}; }
  function scenePlan(){ var R=RUN||((PAUSE||ENDED)?LASTRUN:null); if(R) return {V0:R.V0,PL:R.PL}; var st=vNow(), V0=st&&st.src&&VR[st.key], u=scFor(scSong(),V0); return V0&&u&&u.Sg?{V0:V0,PL:plan(V0,u.Sg,hookNow(u),u)}:null; }
  function paintGraph(x){ try{ var gs=D.querySelectorAll(BIG?'#emFull .em-graph':'.em-scene .em-graph'); if(!gs.length) return; var P2=scenePlan();   /* 크게 보기가 열려 있으면 뒤(잠긴 쪽) 그래프는 그리지 않는다 — 닫을 때 scPaint 가 다시 그린다 */
      if(x==null&&P2) x=RUN?tau(RUN):PAUSE?PAUSE.x:ENDED?P2.PL.tend:null;
      for(var i=0;i<gs.length;i++){ var g=gs[i], cv=g.querySelector('canvas'), sc=g.querySelector('.lg-scene'); if(!cv) continue;
        var lw=g.querySelector('.lg-wait'); if(lw){ var wv=!P2&&recWaiting(); if(lw.hidden===wv) lw.hidden=!wv; }   /* [REC_CLIP_1013] 고른 곡을 받는 동안 빈 칸 대신 한 줄(카드와 같은 말) */
        if(!P2){ var VP=voicePlan(); if(VP){ var nv=Math.max(40,Math.min(240,Math.floor((cv.clientWidth||300)/3))); drawGraph(cv,voiceData(VP.PL,VP.V0,nv),null); sceneRow(g,VP.PL,VP.V0,null); sc&&sc.classList.add('wait'); continue; }   /* [SCENE_WAIT_FILL] 곡을 받는 동안 — 목소리 조각 · 장면 줄은 먼저 */
          var c0=cv.getContext('2d'); c0.clearRect(0,0,cv.width,cv.height); if(sc){ sc.classList.add('wait'); var pw0=(g.querySelector('.lg-plot')||{}).clientWidth||0; if(sc.__wpw!==pw0){ sc.__wpw=pw0; sc.__cols=null; sc.style.gridTemplateColumns=''; fitTxt(sc.querySelector('.lgs-greet'),SCENE_WAIT); fitWalk(sc.querySelector('.lgs-walk')); } } continue; }   /* [SCENE_HOLD] 목소리도 아직이면 장면 줄만(반반) */
        var n=Math.max(40,Math.min(240,Math.floor((cv.clientWidth||300)/3))); drawGraph(cv,graphData(P2.PL,P2.V0,n),x); sceneRow(g,P2.PL,P2.V0,x); } }catch(x2){} }   /* [PAINT_GUARD] 그래프는 꾸밈 — 실패해도 소리는 멈추지 않는다 · 크게 보기 안 그래프도 같은 자리로 */
  /* [GRAPH_TAP · SCENE_TAP] 그래프는 손을 뗄 때(click) — 누른 자리부터 · 장면 말을 누르면 그 장면 머리부터(기다림 = 처음 · 문이 열리고 = 마지막 말 첫머리) · 크게 보기 안 그래프는 그 안에서 */
  function graphTap(ev){ var st=vNow(); if(!st||!st.src){ offPress(); return; } var P2=scenePlan(); if(!P2) return; var g=(ev&&ev.target&&ev.target.closest&&ev.target.closest('.em-graph'))||D.querySelector('.em-graph'), cv=g&&g.querySelector('canvas'); if(!cv) return;
    var sp=ev&&ev.target&&ev.target.closest?ev.target.closest('.lg-scene>span'):null, PL=P2.PL;
    if(sp){ scPlay(sp.classList.contains('lgs-greet')?0:Math.max(0,PL.tv+(PL.lastS||0)),!BIG); return; }   /* [ONE_PLAY_1013] 그 자리 그래프에서 틀어도 장면 뒤 줄까지(크게 보기 안은 장면만) */
    var rr=cv.getBoundingClientRect(); if(!ev||ev.clientX<rr.left) return; scPlay(clamp((ev.clientX-rr.left)/Math.max(1,rr.width),0,1)*PL.tend,!BIG); }

  /* ── ★★[ENTRY_BIG_1012] 2단계-나 크게 보기 — 시험실 openBig · paintBig(고객 화면)를 빌더 크게 보기 틀(.ls-full · .lf-in · .lf-seg · .lf-ctl)로 ──
     알약 옆 작은 단추로만 연다([PLAYER_ORDER] «누르면 전체화면이 아니라 그 자리에서 · 크게 보기는 옆 작은 단추로만»). 열면 듣던 자리에서 이어 크게 · 멈춰 있으면 그 자리부터.
     장면 영상(빌더 _lVid 입장)은 마지막 말이 끝나 음악이 크게 올라온 뒤(0.15초) 돈다 · 자막 = 연출 순서 다섯 칸([SCENE_STEPS] 시험실 STEP_TXT 그대로) · ‹ › = 줄 → 연출 칸([STEP_NAV]).
     빌더 «연습 · 크게 보기»(#lsFull · LP)와 칸을 나눈다 — 이 칸은 #emFull 하나 · 뒤로 가기 · Esc · ⌄ 로 닫는다(빌더 _hPush 깊이 그대로) */
  var BIG=false, BIG_FROM=null, POP_WAIT=false, POP_THEN=null;
  var STEP_AT=[0,0,1.4,3.2], STEP_TXT=['음악이 작게 흐르기 시작해요',null,'음악이 크게 올라와요','문이 열려요','두 분이 함께 걸어 들어와요'];   /* [STEP_TXT] 시험실 그대로 */
  function lateOf(PL){ return !!(PL&&PL.tm!=null&&PL.tm>LATE_T); }
  function stepAt(PL,x){ var b0=lateOf(PL)?PL.tm:PL.tv; if(x<b0) return 0; if(x<PL.th) return 1; if(x<PL.th+STEP_AT[2]) return 2; if(x<PL.th+STEP_AT[3]) return 3; return 4; }
  /* 줄마다 자막 — 나레이션 = 문장(마지막 «신랑 신부, 입장!»까지 한 줄) · 두 분 목소리 = 줄(신랑 · 신부)마다 문장 · 조각 수와 다르면 비율로 */
  function sents(t){ return String(t||'').replace(/([.!?])\s+/g,'$1\n').split('\n').map(function(s){ return s.trim(); }).filter(Boolean); }
  function capsOf(st){ var out=[]; if(st.nar){ sents(st.txt).forEach(function(s){ out.push({w:'n',t:s}); }); return out; }
    try{ if(typeof _slLines==='function') _slLines('entry').forEach(function(l){ var w=l[0]==='신부'?'b':'g'; sents(l[1]).forEach(function(s){ out.push({w:w,t:s}); }); }); }catch(x){}
    if(!out.length) sents(st.txt).forEach(function(s){ out.push({w:'g',t:s}); }); return out; }
  function capAt(V0,i){ var c=V0&&V0.caps; if(!c||!c.length||i<0) return null; var n=V0.pieces.length; return c[n===c.length?i:Math.min(c.length-1,Math.floor(i*c.length/Math.max(1,n)))]; }
  function curIdx(PL,V0,x){ var i=-1; for(var j=0;j<V0.pieces.length;j++){ if(x>=PL.tv+PL.rel[j]-0.05) i=j; } return i; }
  function capFor(stp,pc,late){ if(stp===0&&!late) return {l:'음악',t:STEP_TXT[0]}; if(stp<=1){ var w=pc?pc.w:'g'; return {l:w==='b'?'신부':w==='n'?'나레이션':'신랑',t:pc?pc.t:'…'}; }
    if(stp===2) return {l:'음악',t:STEP_TXT[2]}; if(stp===3) return {l:'문',t:STEP_TXT[3]}; return {l:'입장',t:STEP_TXT[4]}; }   /* [LATE_MUSIC] 늦게 들어오는 판은 0 · 1 칸 모두 지금 줄 */
  /* [STEP_NAV] ‹ › 는 줄 → 연출 칸(음악이 크게 · 문이 열려요 · 걸어 들어와요) 순서 · 마지막 칸에서 › 는 꺼진다 */
  function sceneMarks(PL,V0){ var m=[0]; V0.pieces.forEach(function(p,i){ m.push(Math.max(0,PL.tv+PL.rel[i]-0.3)); }); m.push(Math.max(0,PL.th-0.4),PL.th+STEP_AT[2]-0.2,PL.th+STEP_AT[3]-0.2);
    m=m.filter(function(v){ return v<PL.tend-0.5; }).sort(function(a,b){ return a-b; }); var o=[]; m.forEach(function(v){ if(!o.length||v-o[o.length-1]>0.6) o.push(v); }); return o; }
  function lineJump(P2,x,dir){ var m=sceneMarks(P2.PL,P2.V0), cur=0; for(var i=0;i<m.length;i++) if(x>=m[i]-0.05) cur=i; if(dir<0){ if(x-m[cur]>1.2) return m[cur]; return cur>0?m[cur-1]:0; } return cur+1<m.length?m[cur+1]:null; }
  function nowX(P2){ return RUN?tau(RUN):PAUSE?PAUSE.x:ENDED?P2.PL.tend:0; }
  /* 장면 영상 — 음악이 크게 올라오고 0.15초 뒤 문이 열린다(시험실 VIDEO_AC_CLOCK · 오디오 시계로) · 멈추면 처음 장면으로 */
  function bigVid(){ return D.querySelector('#emFull .lv video'); }
  function videoGo(skip){ var v=bigVid(); if(!v) return; try{ v.muted=true; var to=Math.max(0,skip||0); if(Math.abs((v.currentTime||0)-to)>0.05) v.currentTime=to; var p=v.play(); if(p&&p.catch) p.catch(function(){}); }catch(x){} }
  function videoReset(){ var v=bigVid(); if(!v) return; try{ if(!v.paused) v.pause(); if((v.currentTime||0)>0.05) v.currentTime=0; }catch(x){} }   /* [VIDEO_KEEP] 이미 그 자리면 되감지 않는다 */
  function bigEl(){ var f=D.getElementById('emFull'); if(!f){ f=D.createElement('div'); f.id='emFull'; f.className='ls-full em-full'; f.setAttribute('role','dialog'); f.setAttribute('aria-modal','true'); f.setAttribute('aria-label','입장 · 음악과 함께 크게 보기'); f.hidden=true; D.body.appendChild(f); } return f; }
  function bigHtml(){ var st=vNow(), u=scSong(), on=!!RUN, mu=St().mu, m=u?u.meta:(mu?{t:mu.t||mu.name}:null), vid='';   /* [REC_SONG_1012] 추천 곡을 받는 동안에도 곡 이름 */
    try{ if(typeof _lVid==='function') vid=_lVid('entry',{big:true}); }catch(x){}
    var tag=''; try{ if(typeof _vTag==='function'&&st) tag=_vTag('entry',{own:!st.nar,up:'entry'}); }catch(x){}
    return '<div class="lf-in"><div class="lf-h"><button type="button" class="lf-min" data-fk="embigmin" onclick="emAct(\'bigclose\')" aria-label="작게 보기">'+(typeof ICO_DOWN==='string'?ICO_DOWN:'')+'</button><span class="lf-mode">입장 · 음악과 함께</span><span style="width:44px"></span></div>'
      +'<div class="lf-body">'+vid+'<div class="lf-seg" aria-hidden="true">'+[0,1,2,3,4].map(function(k){ return '<span data-sg="'+k+'"></span>'; }).join('')+'</div><h3>입장</h3>'
      +'<div class="lf-vk">'+tag+(m?'<span class="vk em-vkm">입장 음악 · '+e(m.t||(u&&u.name)||'')+'</span>':'')+'</div>'
      +'<div class="lf-lab" id="emBigLab">음악</div><p class="lf-txt em-cap" id="emBigTxt" aria-live="polite">'+STEP_TXT[0]+'</p>'+(st&&st.src?graphHtml(st.nar):'')+'</div>'
      +'<div class="lf-ctl"><button type="button" data-fk="emb0" onclick="emAct(\'big0\')" aria-label="처음부터">'+(typeof ICO_PREV==='string'?ICO_PREV:'')+'</button><button type="button" class="ln" data-fk="embback" onclick="emAct(\'bigback\')" aria-label="앞 줄">'+(typeof ICO_CHEV_L==='string'?ICO_CHEV_L:'')+'</button>'
      +'<button type="button" class="big" data-fk="embtog" onclick="emAct(\'bigtog\')" aria-label="'+(on?'멈추기':PAUSE?'이어 듣기':ENDED?'처음부터 다시 듣기':'음악과 함께 듣기')+'">'+(on?(typeof ICO_PAUSE==='string'?ICO_PAUSE:ico('stop')):ico('play'))+'</button>'
      +'<button type="button" class="ln" data-fk="embfwd" onclick="emAct(\'bigfwd\')" aria-label="다음 줄">'+(typeof ICO_CHEV_R==='string'?ICO_CHEV_R:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7"/></svg>')+'</button><button type="button" data-fk="emblast" onclick="emAct(\'biglast\')" aria-label="마지막 줄">'+(typeof ICO_NEXT==='string'?ICO_NEXT:'')+'</button></div></div>'; }
  /* 그리기 — 단추 줄(▶ ⏸ · › 꺼짐)은 HTML 을 바꾸고 · 영상은 같은 것을 다시 꽂는다(시험실 VIDEO_KEEP · «같은 영상은 끊지 않고 이어서») */
  function paintBig(){ if(!BIG) return; var f=bigEl(), h=bigHtml(); if(f.__sig!==h){ var ov=f.querySelector('.lv video'), ae=D.activeElement, fk=(ae&&f.contains(ae))?ae.getAttribute('data-fk'):null; f.innerHTML=h; f.__sig=h;
      if(ov){ var nv=f.querySelector('.lv video'); if(nv&&nv.getAttribute('src')===ov.getAttribute('src')) nv.parentNode.replaceChild(ov,nv); }
      if(fk){ var n=f.querySelector('[data-fk="'+fk+'"]'); if(n) try{ n.focus({preventScroll:true}); }catch(x){} } }
    f.hidden=false; paintCap(); paintGraph(); }
  function paintCap(x){ if(!BIG) return; var f=D.getElementById('emFull'); if(!f) return; var P2=scenePlan(), tx=f.querySelector('#emBigTxt'), lb=f.querySelector('#emBigLab'); if(!tx||!lb) return;
    var c, stp, endT=''; if(!P2){ c={l:'음악',t:STEP_TXT[0]}; stp=0; }
    else { if(x==null) x=nowX(P2); stp=ENDED&&!RUN?4:stepAt(P2.PL,x); var i=curIdx(P2.PL,P2.V0,x); c=capFor(stp,capAt(P2.V0,i),lateOf(P2.PL)); if(ENDED&&!RUN) endT='미리 듣기가 끝났어요'; }
    var lt=endT||c.l; if(lb.textContent!==lt) lb.textContent=lt; if(tx.textContent!==c.t) tx.textContent=c.t;
    var segs=f.querySelectorAll('.lf-seg span'); for(var k=0;k<segs.length;k++){ var sk=+segs[k].getAttribute('data-sg'), cl=sk<stp||(ENDED&&!RUN)?'done':sk===stp?'on':''; if(segs[k].className!==cl) segs[k].className=cl; }
    var fb=f.querySelector('[data-fk="embfwd"]'); if(fb){ var nx=!!(P2&&!ENDED&&lineJump(P2,nowX(P2),1)!=null); if(fb.disabled===nx){ if(!nx&&D.activeElement===fb){ var tg=f.querySelector('[data-fk="embtog"]'); if(tg) try{ tg.focus({preventScroll:true}); }catch(x2){} } fb.disabled=!nx; } }   /* [STEP_NAV] 마지막 칸이면 › 꺼짐 */
    if(RUN&&P2){ var R=RUN; if(!R.vgo&&x>=P2.PL.th+0.15){ R.vgo=true; videoGo(Math.max(0,x-P2.PL.th-0.15)); } } }
  function openBig(){ var f=bigEl(); if(!BIG){ BIG_FROM=(D.activeElement&&D.activeElement.getAttribute&&D.activeElement.getAttribute('data-fk'))||'embig';
      var push=function(){ try{ if(typeof _hPush==='function'&&typeof isOpen==='function'&&isOpen()) _hPush({opIdx:(typeof idx!=='undefined'?idx:null),gen:(typeof _opGen!=='undefined'?_opGen:null),em:1}); else history.pushState({em:1},''); }catch(x){} };   /* 빌더 _hPush 로 쌓아 마이페이지 뒤로가기 깊이가 맞는다 */
      if(POP_WAIT) POP_THEN=push; else push();
      ['.wrap','#nav','#meAdvStack'].forEach(function(q){ var w=D.querySelector(q); if(w) w.setAttribute('inert',''); }); D.body.classList.add('lsfull'); }   /* 빌더 크게 보기와 같이 뒤를 잠근다 */
    BIG=true; f.__sig=null; paintBig(); var v=bigVid(); if(v) try{ v.preload='auto'; }catch(x){}
    var t=f.querySelector('[data-fk="embtog"]'); if(t) try{ t.focus({preventScroll:true}); }catch(x){} }
  function closeBig(fromPop){ if(!BIG) return; BIG=false; videoReset(); var f=D.getElementById('emFull'); if(f){ f.hidden=true; f.innerHTML=''; f.__sig=null; }
    ['.wrap','#nav','#meAdvStack'].forEach(function(q){ var w=D.querySelector(q); if(w) w.removeAttribute('inert'); }); D.body.classList.remove('lsfull');
    if(!fromPop){ try{ if(history.state&&history.state.em){ POP_WAIT=true; history.back(); } }catch(x){} }
    scPaint(); var b=D.querySelector('.em-scene [data-fk="'+(BIG_FROM||'embig')+'"]')||D.querySelector('.em-scene [data-fk="embig"]')||D.querySelector('.em-scene [data-fk="emscene"]'); if(b) try{ b.focus({preventScroll:true}); }catch(x){} BIG_FROM=null; }   /* 닫으면 연 단추로 */
  window.addEventListener('popstate',function(ev){ if(POP_WAIT){ POP_WAIT=false; var t=POP_THEN; POP_THEN=null; if(t) t(); return; } var s=ev.state||{}; if(BIG&&!s.em) closeBig(true); });   /* [POP_RACE] 닫을 때 부른 뒤로가 늦게 와 막 다시 연 크게 보기를 닫지 않게 */
  D.addEventListener('keydown',function(ev){ if(BIG&&ev.key==='Escape'){ ev.preventDefault(); ev.stopPropagation(); closeBig(); } },true);

  /* ── 누름 ── */
  window.emAct=function(a,arg){
    if(a==='guide'){ guideOpen(); return; }
    /* ★★[REC_SONG_1012] 칩 · 추천 곡 카드 */
    if(a==='src'){ srcSet(arg); return; }
    if(a==='reclist'){ REC.lst=''; recList(); redraw(); var rl=D.querySelector('.ls-mu .mu-car0 .mu-wt'); if(rl) try{ rl.setAttribute('tabindex','-1'); rl.focus({preventScroll:true}); }catch(x){} return; }   /* 다시 불러오기 — 단추가 사라지니 «불러오는 중» 줄로 */
    if(a==='carprev'||a==='carnext'){ if(arg&&arg.getAttribute&&arg.getAttribute('aria-disabled')==='true') return; carGo(carIdx()+(a==='carnext'?1:-1)); return; }   /* 끝 카드에서는 멈춘다(돌아가지 않는다 · 자동 재생 캐러셀 금지) */
    if(a==='carplay'){ if(PWANT||(PREV&&PREV.k)){ hush(); return; } var cm=REC.ls&&REC.ls[carIdx()]; if(cm) recPlay(cm.k); return; }   /* [CAR_TRANSPORT] 추천 곡이 나오는(받는) 중이면 ■ = 멈춤 · 아니면 지금 카드 곡 */
    if(a==='carpick'){ var pm=REC.ls&&REC.ls[carIdx()]; if(pm) recPick(pm.k); return; }
    if(a==='fold'){ if(recOn()){ var L5=REC.ls||[], mk=St().mu.k; for(var q=0;q<L5.length;q++) if(L5[q].k===mk) CAR_I=q; } var fh=boxH(); MU_OPEN=true; recListAuto(); redraw(); boxAnim(fh); var fp=D.querySelector('.ls-mu [data-fk="mucarpick"]')||D.querySelector('.ls-mu .mu-car0 .mu-wt'); if(fp) try{ if(!fp.matches('button')) fp.setAttribute('tabindex','-1'); fp.focus({preventScroll:true}); }catch(x){} return; }   /* [MU_FOLD] 펼치면 고른 곡 카드에서 · 초점은 ✓ 로 */
    if(a==='upuse'){ var uu=upCur(); if(!uu||upOn()) return; hush(); keep(uu); redraw(); var ut=String(uu.meta&&uu.meta.t||''); toast(ut.length<=9?'‹'+ut+'› 곡으로 들어가요':'이 곡으로 들어가요'); var ub=D.querySelector('.ls-mu [data-fk="musong"]'); if(ub) try{ ub.focus({preventScroll:true}); }catch(x){} return; }   /* 비켜 둔 올린 곡을 다시 고른다(서버 파일 · 자리 그대로) */
    if(a==='upopen'){ if(!seen()){ guideOpen(); return; } upPick(); return; }   /* [UP_GUIDE] 처음 한 번은 안내 창부터 · 다음부터 바로 파일 창 */
    if(a==='updel'){ upDel(); return; }
    /* [ENTRY_SONG_UP] 못 보낸 곡 다시 보내기 · 못 받은 곡 다시 불러오기 */
    if(a==='svagain'){ if(SV.file){ srvUp(SV.file); return; } fGet().then(function(b){ var mu=St().mu; if(!b||!mu) return; var f=b; try{ if(!(b instanceof File)) f=new File([b],(mu.name||'내 곡')+'.mp3',{type:b.type||'audio/mpeg'}); }catch(x){} srvUp(f); }); return; }
    if(a==='svget'){ var mg=St().mu; if(!mg||!mg.fid) return; SG.err=''; RESTORE=1; srvGet(mg); return; }
    if(a==='prev'){ var u=upCur(); if(u) play('up',upList(u)[u.pick]?upList(u)[u.pick].t:u.Sg.dur*0.3,CAR_PRE,CAR_LEN); return; }   /* [PREV_12_60_1013] 올린 곡도 추천 곡과 같은 값 — 숫자를 따로 적지 않는다 */
    if(a==='hookprev'){ var u2=upCur(), c=upList(u2)[arg]; if(c) play('up#'+arg,c.t,8,16); return; }
    if(a==='hookpick'){ var u3=upCur(), c3=upList(u3)[arg]; if(!c3||u3.pick===arg) return; u3.pick=arg; keep(u3); redraw(); toast(fmtMS(c3.typed!=null?c3.typed:c3.t)+'에 맞췄어요'); return; }
    if(a==='owntxt'){ var u4=upCur(); if(u4&&arg) u4.ownTxt=arg.value; return; }   /* 적는 중인 글은 기억 — 다시 그려도 칸이 비지 않게 */
    if(a==='ownset'){ var oi=D.getElementById('muOwn'); if(!upOwnSet(oi?oi.value:'')&&oi) try{ oi.focus({preventScroll:true}); }catch(x){} return; }   /* 틀리면 칸으로 돌아가 고친다 */
    /* [ENTRY_SCENE_1012] 음악과 함께 듣기 — 준비하는 중에 누르면 취소 · 트는 중이면 그 자리에 멈춤 · 멈춘 뒤면 이어서 · 끝났으면 처음부터 */
    /* [ONE_PLAY_1013] 이 순간 전체 듣기 · 음악과 함께 — 장면 뒤 줄을 트는 중이면 멈춤 · 만드는 중이면 그대로(차오름이 말한다) · 처음부터는 빌더 입구(lsPlay)를 지나 장면부터 */
    if(a==='scene'){ if(PEND){ scStop(); scPaint(); return; } if(RUN){ scHalt(); return; } if(restOn()){ try{ lsStop(); }catch(x){} scPaint(); return; } if(mkBusy()) return;
      var st=vNow(); if(PAUSE&&st&&st.src){ scPlay(PAUSE.x,true); return; }
      if(typeof lsPlay==='function'){ lsPlay('entry'); return; }
      if(!st||!st.src){ offPress(); return; } scPlay(0,true); return; }
    if(a==='graph'){ graphTap(arg); return; }
    /* [ENTRY_BIG_1012] 크게 보기 — 듣는 중이면 그대로 크게 · 멈춰 있으면 그 자리부터 · 끝났으면 처음부터(시험실 bigopen · bigtog · STEP_NAV) */
    if(a==='big'){ var sb=vNow(); if(!sb||!sb.src){ offPress(); return; } openBig(); if(!RUN&&!PEND) scPlay(PAUSE?PAUSE.x:0); return; }
    if(a==='bigclose'){ closeBig(); return; }
    if(a==='bigtog'){ if(PEND){ scStop(); scPaint(); return; } if(RUN){ scHalt(); return; } scPlay(PAUSE?PAUSE.x:0); return; }
    if(a==='big0'){ scPlay(0); return; }
    if(a==='bigback'||a==='bigfwd'){ var P3=scenePlan(); if(!P3) return; var to=lineJump(P3,nowX(P3),a==='bigfwd'?1:-1); if(to==null) return; scPlay(to); return; }
    if(a==='biglast'){ var P4=scenePlan(); if(!P4) return; scPlay(Math.max(0,P4.PL.tv+(P4.PL.lastS||0)-0.3)); return; }
  };
  D.addEventListener('keydown',function(ev){ var t=ev.target; if(t&&t.id==='muOwn'&&ev.key==='Enter'&&!ev.isComposing){ ev.preventDefault(); upOwnSet(t.value); } });   /* 컴퓨터 · 안드로이드 «완료» */
  /* 빌더가 다 그린 뒤 — 이 칸이 사라졌으면(다른 쪽으로 감) 듣던 소리를 멈춘다 */
  function after(){ if((PREV||PWANT)&&!D.querySelector('.ls-mu')) hush();
    if(D.querySelector('.ls-mu .mu-car')) carKeep(CARN);   /* [REC_SONG_1012] 빌더가 다시 그려도 넘기던 카드 · 사진 그대로 */
    mpSync();   /* [ONE_PLAY_1013] 알약은 늘 하나 */
    if(!D.querySelector('.em-scene')){ if(RUN||PEND) scHalt(); if(BIG) closeBig(); return; }   /* [ENTRY_SCENE_1012] 장면 칸이 없어지면(다른 쪽) 그 자리에 멈춘다 · 크게 보기도 닫는다 */
    fitPill(); paintGraph(); }   /* 빌더가 다시 그리면 그래프 캔버스가 새것이다 — 지금 자리로 다시 그린다(트는 중이면 다음 틀이 이어 그린다) */

  EM.rowHtml=rowHtml; EM.sceneHtml=sceneHtml; EM.guideBody=guideBody; EM.after=after; EM.whole=whole; EM.paint=paintPill;   /* [ONE_PLAY_1013] 빌더 «이 순간 전체 듣기» 입구 · 빌더 재생 상태가 바뀔 때(_lPaint) 알약만 다시 */ EM.hush=function(){ if(hush()) redraw(); scHalt(); };   /* 빌더가 제 소리를 틀 때(_stopMk) — 이 칸 ▶ 만 되돌리고 장면은 그 자리에 멈춘다(쪽 전체를 다시 그리지 않는다) */
  EM._t={lyHtml:lyHtml,lyOrig:lyOrig,ups:function(){ return UPS; },upParse:upParse,upSnap:upSnap,upCands:upCands,prev:function(){ return PREV&&PREV.key; },restore:function(){ return RESTORE; },
    pv:function(){ return PREV?{key:PREV.key,x0:PREV.x0,d:PREV.d,H:PREV.H}:null; },car:function(){ return {pre:CAR_PRE,len:CAR_LEN}; },   /* [PREV_12_60_1013] 점검용 — 지금 미리 듣기가 원곡 몇 초부터 몇 초 동안인가 */
    scene:function(){ var P2=scenePlan(); return {run:!!RUN,pend:PEND,pause:PAUSE?PAUSE.x:null,ended:ENDED,x:RUN?tau(RUN):null,plan:P2?{tv:P2.PL.tv,tm:P2.PL.tm,off:P2.PL.off,th:P2.PL.th,tend:P2.PL.tend,V:P2.PL.V,n:P2.PL.n,tdip:P2.PL.tdip,H:P2.PL.H}:null,pieces:P2?P2.V0.pieces.length:0,
      cut:P2&&P2.V0.cut?{at:P2.V0.cut.at,add:P2.V0.cut.add,was:P2.V0.cut.was}:null,vsn:RUN?RUN.vsn:null}; },   /* [ENTRY_CALL_PAUSE_1013] 점검용 — 끊은 자리 · 늘린 초 · 지금 걸린 목소리 마디 수 */
    envDb:function(x){ var P2=scenePlan(); return P2?envDb(P2.PL,x):null; },
    rel:function(){ var P2=scenePlan(); return P2?P2.PL.rel.map(function(r){ return Math.round((P2.PL.tv+r)*1000)/1000; }):null; },big:function(){ return BIG; },
    sv:function(){ return {st:SV.st,err:SV.err,sid:SV.sid,tk:SV.tk,get:SG.id,gerr:SG.err,emb:emb()}; },   /* 점검용 · [ENTRY_SONG_UP] */
    rec:function(){ return {lst:REC.lst,lerr:REC.lerr,n:REC.ls?REC.ls.length:0,i:CAR_I,src:srcNow(),open:MU_OPEN,prev:PREV&&PREV.k||null,want:PWANT,buf:Object.keys(REC.buf),lit:!!(PREV&&PREV.lit),lyI:PREV&&PREV.k?PREV.lyI:null,x:PREV&&PREV.k&&AC?PREV.x0+(AC.currentTime-PREV.t0):null}; },   /* 점검용 · [REC_SONG_1012] */
    lyAt:function(k,x){ var m=recMeta(k); if(!m) return null; var L=lyLines(m), i=lyAt(L,x); return {i:i,first:lyFirst(L,(m.hook0||m.hook)-(m.lyOff||0)),n:L.length}; }};
  window.EntryMusic=EM;
})();
