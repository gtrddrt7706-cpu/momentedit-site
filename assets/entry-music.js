/* ★★[ENTRY_MUSIC_1012 2026-10-12 사장님 «마이페이지 식순 입장 부분에 올려 보자 · 일단 전부 올려 · 지금 오픈 전이니깐»]
   입장 시험실(비공개 · v50)의 «입장 음악»을 실제 빌더(order-preview.html) ② 입장 쪽으로 옮긴 1단계 —
   두 분이 고른 곡 올리기 → 크게 올라오는 자리(찾은 후보 · 앞뒤 들어 보기) → 직접 적기 → 올리기 안내 창.
   · [MUSIC_GONE 2026-08-03 «노래선정부분 완전삭제»]를 «입장» 순간에서만 뒤집는다 — 완성 화면의 곡명 칸(mPeak)은 그대로 없다.
   · 올린 파일은 이 기기 안에서 풀고(서버로 아직 보내지 않는다 · 3단계) 이 기기 IndexedDB 에 둔다(새로고침해도 남게) ·
     고른 곡 이름 · 가수 · 길이 · 고른 자리는 초안 S.mu 에 저장(마이페이지 저장과 함께 서버로 간다).
   · 추천 곡(시험실 카드)은 저장소가 공개라 음원 · 가사를 여기 싣지 않는다 — 사장님 결정 뒤(드라이브 · 로그인한 고객만) 붙인다.
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
  var UP_WALK=102, UP_PRE=15, UP_MIN=60, UP_MAX=60*1024*1024, SONG_LUFS=-12, BED_TRIM=-6;   /* 걷는 시간 = 콘솔 입장 큐 어림(1분 42초) · 앞부분 15초 · 1분 넘는 곡 · 시험실과 같은 값 */
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
  function redraw(){ var box=D.querySelector('.ls-mu .mu-box'); if(!box) return; var ae=D.activeElement, fk=(ae&&box.contains(ae))?ae.getAttribute('data-fk'):null, s0=null, s1=null;
    if(ae&&ae.id==='muOwn'){ try{ s0=ae.selectionStart; s1=ae.selectionEnd; }catch(x){} }
    box.innerHTML=card();
    if(fk){ var n=box.querySelector('[data-fk="'+fk+'"]'); if(n){ try{ n.focus({preventScroll:true}); if(n.id==='muOwn'&&s0!=null) n.setSelectionRange(s0,s1); }catch(x){} } }
    sceneSync(); }   /* [ENTRY_SCENE_1012] 곡 · 자리가 바뀌면 바로 아래 장면 칸도(곡을 올리면 생기고 · 빼면 없어진다) */
  function renderAll(){ try{ if(typeof render==='function') render(); }catch(x){} }
  function toast(m){ try{ if(typeof _noteToast==='function') _noteToast(m); }catch(x){} }   /* [NOTE_TOAST] 빌더 아래 알림 한 줄 */
  function owner(){ try{ return (typeof _who==='string'&&_who)?_who:'local'; }catch(x){ return 'local'; } }

  /* ── 소리 ── */
  function ac(){ if(AC) return AC; var C=window.AudioContext||window.webkitAudioContext; AC=new C({latencyHint:'playback'}); return AC; }
  function wake(){ var a=ac(); try{ if(navigator.audioSession) navigator.audioSession.type='playback'; }catch(x){} try{ if(a.state!=='running') a.resume(); }catch(x){} return a; }   /* 아이폰 무음 스위치에도 들리게 */
  function decoder(){ if(DEC) return DEC; var O=window.OfflineAudioContext||window.webkitOfflineAudioContext; DEC=new O(1,1,48000); return DEC; }
  function decode(ab){ return new Promise(function(ok,no){ try{ var p=decoder().decodeAudioData(ab,ok,no); if(p&&p.then) p.then(ok,no); }catch(x){ no(x); } }); }
  function mono(buf){ var n=buf.length, c=buf.numberOfChannels, y=new Float32Array(n); for(var k=0;k<c;k++){ var x=buf.getChannelData(k); for(var i=0;i<n;i++) y[i]+=x[i]/c; } return y; }
  function lufsOf(x,sr){ try{ var v=window.RecProcess.lufs(x,sr); return isFinite(v)?v:-30; }catch(x2){ return -30; } }   /* [REC_SHARED] rec-process.js 의 BS.1770 */
  function peakOf(x){ var p=0; for(var i=0;i<x.length;i++){ var a=x[i]<0?-x[i]:x[i]; if(a>p) p=a; } return p; }
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
  function prepSong(buf){ var x=mono(buf), sr=buf.sampleRate, L=lufsOf(x,sr), pk=peakOf(x), g=Math.min(db2g(SONG_LUFS-L),0.98/Math.max(pk,1e-4)*db2g(6));
    return {buf:buf,sr:sr,dur:buf.duration,gain:g,lufs:L,cands:hookCands(x,sr),p20:p20(x,sr)}; }
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

  /* ── 올린 곡 ── */
  function upCur(){ return UPS&&UPS.Sg?UPS:(UPS&&UPS.prev)||null; }   /* 다른 곡을 살펴보는 동안에도 고른 곡은 그대로 */
  function upList(u){ return u?u.cands.concat(u.own?[u.own]:[]):[]; }   /* [HOOK_TYPE] 찾은 자리 + 직접 적은 자리(하나) — pick 은 이 목록의 번호 */
  function keep(u){ var c=upList(u)[u.pick]||upList(u)[0]; var s=St(); s.mu={src:'up',name:u.name,t:u.meta.t,a:u.meta.a,dur:Math.round(u.Sg.dur*10)/10,hook:c?c.t:null,typed:(c&&c.own)?c.typed:null}; save(); scReset(); }   /* 스튜디오가 볼 것 = 곡 · 고른 자리 · [ENTRY_SCENE_1012] 곡 · 자리가 바뀌면 듣던 장면은 걷는다(멈춘 자리도) */
  function analyze(f,quiet,want){ var id=++UP_ID, was=upCur(), nm=upName(f.name||''); hush(); UPS={busy:true,name:nm,prev:was}; redraw();
    return f.arrayBuffer().then(function(ab){ var tg=upTags(ab); return decode(ab).then(function(b){ return {b:b,tg:tg}; }); }).then(function(r){ if(id!==UP_ID) return;
      if(!r.b||r.b.duration<UP_MIN){ UPS=was; redraw(); toast('1분 넘는 곡으로 골라 주세요'); return; }
      var Sg=prepSong(r.b), L=upCands(Sg), pk=0; L.forEach(function(c,j){ if(c.rec) pk=j; });
      var u={name:nm,Sg:Sg,cands:L,pick:pk,own:null,ownTxt:'',meta:{t:r.tg.t||nm,a:r.tg.a||''}};
      if(want&&want.hook!=null){ var hit=-1; L.forEach(function(c,j){ if(Math.abs(c.t-want.hook)<0.06) hit=j; });   /* 새로고침 — 고른 자리 그대로 */
        if(hit>=0) u.pick=hit; else if(want.hook<Sg.dur-5){ u.own={t:want.hook,typed:want.typed!=null?want.typed:want.hook,after:Sg.dur-want.hook,own:true}; u.ownTxt=fmtMS(u.own.typed); u.pick=L.length; } }
      UPS=u; if(!quiet){ fPut(f); keep(u); toast(fmtMS(upList(u)[u.pick].t)+'에 맞췄어요'); } redraw();
    }).catch(function(){ if(id!==UP_ID) return; UPS=was; redraw(); if(!quiet) toast('MP3 · M4A만 열 수 있어요'); }); }   /* [TOAST_MIN] 종전 «… 파일만 열 수 있어요» 21자 */
  function upLoad(f){ if(!f) return; if(f.size>UP_MAX){ toast('60MB 아래 파일로 골라 주세요'); return; } analyze(f,false,null); }
  function upDel(){ ++UP_ID; hush(); scReset(); UPS=null; var s=St(); delete s.mu; save(); fDel(); redraw(); toast('올린 곡을 뺐어요'); }
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
  function hush(){ var p=PREV; PREV=null; if(!p) return false; clearTimeout(p.timer); try{ p.src.stop(); }catch(x){} setTimeout(function(){ try{ p.g.disconnect(); }catch(x){} },60); return true; }
  /* 올린 곡 줄 ▶ = 음악만 듣기(킬링 포인트 6초 앞부터 1분 20초 · 시험실 CAR_LEN80 과 같은 길이) · 자리 ▶ = 앞뒤 들어 보기(8초 앞부터 16초) */
  function play(key,h,pre,len){ var u=upCur(); if(!u) return; var was=PREV&&PREV.key===key; hush(); if(was){ redraw(); return; } quietOthers(); scHalt();   /* [ENTRY_SCENE_1012] 소리 하나 — 장면은 그 자리에 멈춘다(이어 듣기) */
    var a=wake(), Sg=u.Sg, t0=a.currentTime+0.08, x0=Math.max(0,h-pre), d=Math.min(Sg.dur-x0,len), lv=Sg.gain*db2g(BED_TRIM);
    var src=a.createBufferSource(); src.buffer=Sg.buf; var g=a.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(lv,t0+0.5); g.gain.setValueAtTime(lv,t0+Math.max(0.6,d-1.2)); g.gain.linearRampToValueAtTime(0.0001,t0+d);
    src.connect(g); g.connect(a.destination); try{ src.start(t0,x0,d); }catch(x){}
    var p={key:key,src:src,g:g}; p.timer=setTimeout(function(){ if(PREV===p){ PREV=null; redraw(); } },d*1000+250); PREV=p; redraw(); }
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
  function card(){ var u=UPS, c0=upCur(), busy=u&&u.busy?'<p class="mu-upbusy" role="status">‹'+e(u.name)+'› 살펴보는 중이에요</p>':'', s=St(), mu=s.mu;
    if(!c0){ var kept=(mu&&mu.src==='up'&&!busy&&RESTORE===2)?'<p class="mu-cs on">‹'+e(mu.t||mu.name)+'› · '+fmtMS(mu.typed!=null?mu.typed:mu.hook||0)+'에 맞춰 두었어요</p>':'';   /* 이 기기에 파일이 없을 때(다른 기기 · 지운 저장소) — 고른 것은 남아 있다 */
      return '<div class="mu-up mu-card">'+(busy||kept+'<p class="mu-cs">곡 파일을 올리면 크게 올라오는 자리를 찾아 마지막 말에 맞춰요</p>')
        +'<div class="mk-sech mk-sech-r mu-upgo"><button type="button" class="mk-hbtn" data-fk="muupopen" onclick="emAct(\'upopen\',this)">'+ICO_PLUS+' 곡 파일 올리기</button></div>'+upHint()+'</div>'; }
    var m=c0.meta, sub=(m.a?m.a+' · ':'')+fmtMS(c0.Sg.dur), pl=!!(PREV&&PREV.key==='up'), h='<div class="mu-up mu-card on">'+busy;
    h+='<ul class="mu-list mu-mine" role="radiogroup" aria-label="내 곡"><li class="mu-row on"><button type="button" class="mk-pl mu-pl'+(pl?' on':'')+'" data-fk="muprev" aria-pressed="'+pl+'" aria-label="'+e(m.t)+' 음악만 '+(pl?'멈추기':'듣기')+'" onclick="emAct(\'prev\',this)">'+(pl?ico('stop'):ico('play'))+'</button>'
      +'<button type="button" class="mu-pick" role="radio" aria-checked="true" tabindex="0" data-fk="musong"><span class="mu-t">'+e(m.t)+'</span><span class="mu-a">'+e(sub)+'</span></button></li></ul>';
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
  function rowHtml(){ fileInput(); var o=owner(); if(RO!==o){ if(RO!==null){ hush(); UPS=null; RESTORE=0; } RO=o; } if(UPS&&UPS.Sg&&!St().mu){ hush(); UPS=null; } restore();
    return '<div class="ls-cg cg-vp cg-hl ls-mu" role="group" aria-label="입장 음악"><span class="gl" aria-hidden="true">입장 음악</span>'
      +'<span class="cg-c"><span class="cg-links"><button type="button" class="pk-link mu-gl" data-fk="muguide" onclick="emAct(\'guide\',this)">올리기 안내 보기</button></span></span>'
      +'<div class="mu-box">'+card()+'</div></div>'; }
  /* 새로고침 · 다시 열기 — 이 기기에 둔 파일로 다시 풀고 고른 자리를 되살린다(조용히 · 알림 없음) */
  function restore(){ if(RESTORE) return; var mu=St().mu; if(!(mu&&mu.src==='up')){ RESTORE=2; return; } RESTORE=1;
    fGet().then(function(b){ if(!b){ RESTORE=2; redraw(); return; } var f=b; try{ if(!(b instanceof File)) f=new File([b],(mu.name||'내 곡')+'.mp3',{type:b.type||'audio/mpeg'}); }catch(x){}
      return analyze(f,true,mu).then(function(){ RESTORE=2; if(UPS&&UPS.Sg&&mu){ UPS.meta.t=mu.t||UPS.meta.t; UPS.meta.a=mu.a||UPS.meta.a; } redraw(); }); }).catch(function(){ RESTORE=2; redraw(); }); }
  /* [UP_GUIDE] 안내 창 — 빌더 «확정하면 이렇게 돼요»(KEEP_DLG) 틀 · 빌더 창(_dlgModel · #mkRecDlg)에서 그린다 · [GUIDE_OK] 아래 단추는 «알겠어요» 하나(창만 닫는다) */
  function guideBody(){ var kp=function(t,tag,on){ return '<span class="mk-kp'+(on?' on':'')+'">'+(on?ico('check'):'')+t+(tag?' '+tag:'')+'</span>'; };
    return '<ol class="mk-rd-steps">'
      +'<li><span class="mk-rd-n" aria-hidden="true">1</span><p><b>곡 파일을 올려요</b>MP3 · M4A 파일을 고르면 바로 곡을 살펴봐요'+(IOS_DEV?' · '+IOS_DEV+' ‹파일 선택›에서 골라요':'')+'</p></li>'
      +'<li><span class="mk-rd-n" aria-hidden="true">2</span><p><b>크게 올라오는 자리를 찾아 드려요</b>후보 몇 곳 중 걷는 동안 곡이 이어지는 자리를 추천해요<span class="mu-gd-c" aria-hidden="true">'+kp('0:38','추천',true)+kp('1:28')+kp('2:24')+'</span></p></li>'
      +'<li><span class="mk-rd-n" aria-hidden="true">3</span><p><b>들어 보고 골라요</b>자리마다 ▶ 를 누르면 그 앞뒤를 들려 드려요</p></li>'
      +'<li><span class="mk-rd-n" aria-hidden="true">4</span><p><b>원하는 자리가 없으면 직접 적어요</b>곡에서 원하는 때를 분:초로 적으면 그 자리에 맞춰요<span class="mu-gd-in" aria-hidden="true">1:05</span></p></li></ol>'
      +(function(){ var st=vNow(), nar=!!(st&&st.nar);   /* [ENTRY_SCENE_1012] 스튜디오 나레이션 판은 마지막 말이 나레이션의 «입장!»이다 — «두 분의 마지막 말»은 AI 판만 */
        return '<p class="mk-note mk-rd-sum"><span>고른 자리는 '+(nar?'«입장!»이':'두 분의 마지막 말이')+' 끝나는 순간 크게 올라와요.</span>'+(EM.scene?'<span><b>음악과 함께 듣기</b>로 '+(nar?'멘트':'인사')+'부터 입장까지 이어서 들어 보세요.</span>':'')+'</p>'; })()
      +'<button type="button" class="mk-dlg-go" data-fk="muguideok" onclick="mkDlgClose()">알겠어요</button>'; }
  function guideOpen(){ try{ if(typeof _tipSeen==='function') _tipSeen('mu'); MK.muGuide=true; }catch(x){} hush(); renderAll(); }   /* 창은 빌더 render 끝(_recDlgPaint)이 그린다 */
  function seen(){ var t=St().tipSeen; return !!(t&&t.mu); }

  /* ── ★★[ENTRY_SCENE_1012] 2단계 «음악과 함께 듣기» — 시험실 v50 장면 엔진(plan · envDb · 그래프)을 빌더 입장 목소리로 ──
     목소리 = 빌더 «이 순간 전체 듣기»가 트는 그 줄(_lSteps 첫 줄 · 두 분 목소리면 own · 나레이션이면 entry-A~F) · 곡 = 이 기기에 올린 곡(위 UPS).
     목소리는 한 파일이라 문장 사이 쉼으로 조각을 나눈다(시험실 sentSplit) — 조각은 «끝에서 두 번째 말이 끝나면 음악이 한 번 더 낮아지는 자리»와 그래프 목소리 대시에만 쓴다.
     하이라이트 = 마지막 말이 끝난 뒤 0.3초(breath) — 파일 끝 빈소리를 걷은 실제 말끝이라 기기 목소리(시험실 TTS 어림)처럼 어긋나지 않는다. 그래서 «이어 듣기»도 같은 계획을 다시 짜면 된다 */
  var SP={lead:4,fade:5,under:-12,build:3,dip:4,breath:0.3,rise:0.3,after:20}, FADE_DN=0.4, OUTF=4, LATE_T=0.3, VOICE_LUFS=-16;   /* 시험실 DEF_P · CUE.fadeDownMs · OUTF · LATE_T · VOICE_LUFS 그대로(곡 낮추기 BED_TRIM −6 은 위) */
  var RUN=null, RID=0, PAUSE=null, ENDED=false, LASTRUN=null, PEND=false, LIM=null, VB={}, VR={}, VFAIL={};
  function lerp(a,b,t){ return a+(b-a)*clamp(t,0,1); }
  function fmtLen(t){ var s=Math.round(t); if(s<60) return '약 '+s+'초'; var m=Math.floor(s/60), r=s%60; return '약 '+m+'분'+(r?' '+r+'초':''); }   /* 시험실 LEN_FMT */
  function vStep(){ try{ if(typeof ENG==='undefined'||!ENG||typeof _lSteps!=='function') return null; var a=_lSteps(ENG,['entry']); for(var i=0;i<a.length;i++){ var x=a[i]; if((x.own&&x.up==='entry')||/^entry-[A-F]$/.test(x.slug||'')) return x; } }catch(x2){} return null; }
  function sentN(t){ return Math.max(1,String(t||'').replace(/([.!?])\s+/g,'$1\n').split('\n').filter(function(s){ return /\S/.test(s); }).length); }
  function vNow(){ var x=vStep(); if(!x) return null; var v={src:x.src||null,txt:String(x.txt||''),nar:!x.own,n:sentN(x.txt)}; v.key=(v.src||'')+'|'+v.n+'|'+(v.nar?1:0); return v; }   /* src 가 없으면 두 분 AI 를 아직 안 만든 것 */
  /* 말 앞뒤 빈소리 — 시험실 edgeTrimIdx(빌더 _edgeTrim 과 같은 문턱) · 문장 조각 — 시험실 sentSplit(빌더 _gapFit 과 같은 문장 끝 찾기) */
  function edgeTrimIdx(x,a,b,sr,side){ var fr=Math.max(1,Math.round(sr*0.01)), nf=Math.floor((b-a)/fr); if(nf<3) return [a,b];
    var r=new Float32Array(nf), mx=0; for(var f=0;f<nf;f++){ var q=0, s0=a+f*fr; for(var j=s0;j<s0+fr;j++) q+=x[j]*x[j]; r[f]=Math.sqrt(q/fr); if(r[f]>mx) mx=r[f]; }
    var th=mx*0.06, keep=Math.round(sr*0.04);
    if(side==='end'){ var en=nf-1; while(en>0&&r[en]<th) en--; return [a,Math.min(b,a+(en+1)*fr+keep)]; }
    var st=0; while(st<nf-1&&r[st]<th) st++; return [Math.max(a,a+st*fr-keep),b]; }
  function sentSplit(x,sr,n){ var fr=Math.max(1,Math.round(sr*0.02)), nf=Math.floor(x.length/fr), rms=new Float32Array(nf);
    for(var f=0;f<nf;f++){ var q=0; for(var j=f*fr;j<(f+1)*fr;j++) q+=x[j]*x[j]; rms[f]=Math.sqrt(q/fr); }
    var so=Array.prototype.slice.call(rms).sort(function(p,q2){ return p-q2; }), thr=Math.max(Math.pow(10,-45/20),(so[Math.floor(nf*0.1)]||0)*3), first=-1, last=-1;
    for(var f2=0;f2<nf;f2++) if(rms[f2]>thr){ if(first<0) first=f2; last=f2; }
    if(first<0) return [];
    var runs=[], a=-1; for(var f3=first;f3<=last;f3++){ if(rms[f3]<=thr){ if(a<0) a=f3; } else if(a>=0){ if(f3-a>=4) runs.push([a,f3]); a=-1; } }
    runs.sort(function(p,q2){ return (q2[1]-q2[0])-(p[1]-p[0]); }); runs=runs.slice(0,Math.max(0,n-1)).sort(function(p,q2){ return p[0]-q2[0]; });
    var pad=Math.round(sr*0.12), segs=[], s=first*fr;
    runs.forEach(function(r){ var mid=Math.round((r[0]+r[1])/2*fr); segs.push([Math.max(0,s-pad),Math.min(r[0]*fr+pad,mid)]); s=Math.max(r[1]*fr-pad,mid); });
    segs.push([Math.max(0,s),Math.min(x.length,(last+1)*fr+pad)]); segs[0][0]=Math.max(0,first*fr-pad);
    return segs; }
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
      var x=mono(b), sr=b.sampleRate, L=lufsOf(x,sr), pk=peakOf(x), g=Math.min(db2g(VOICE_LUFS-L),0.95/Math.max(pk,1e-4)), n=st.n, segs=sentSplit(x,sr,st.nar?n+1:n);
      /* 시험실 buildVO — 나레이션은 모두 «신랑 신부, 입장!»으로 끝나고 쉼표 자리에서 길게 숨을 쉰다(문장 사이보다 길다) → 문장 수 + 1 로 자르고 마지막 둘을 한 줄로 */
      if(st.nar&&segs.length===n+1&&segs.length>1){ var z=segs.pop(); segs[segs.length-1]=[segs[segs.length-1][0],z[1]]; }
      if(segs.length){ var l=segs[segs.length-1]; l[1]=edgeTrimIdx(x,l[0],l[1],sr,'end')[1]; }   /* 마지막 말 끝 빈소리를 걷는다 — «숨»이 실제 말끝에서 하이라이트까지가 되게 */
      var ps=segs.map(function(sg){ return {a:sg[0]/sr,d:(sg[1]-sg[0])/sr}; }), gaps=[]; for(var i=0;i<ps.length-1;i++) gaps.push(Math.max(0,ps[i+1].a-(ps[i].a+ps[i].d)));
      var V0={buf:b,gain:g,pieces:ps,gaps:gaps,key:k}; VR={}; VR[k]=V0; delete VB[k]; delete VFAIL[k]; return V0; },function(err){ delete VB[k]; VFAIL[k]=Date.now(); throw err; });
    return VB[k]; }
  function hookNow(u){ var c=upList(u)[u.pick]||upList(u)[0]; return clamp(c?c.t:u.Sg.dur*0.4,0.5,u.Sg.dur-0.5); }
  /* 장면 짜기 — 마지막 말 끝 + 숨 = 하이라이트. 거기서 거꾸로 곡 시작점을 정한다(시험실 plan · new 그대로) */
  function plan(V0,Sg,H){ var P=SP, rel=[], t=0; V0.pieces.forEach(function(p,i){ rel.push(t); t+=p.d; if(i<V0.gaps.length) t+=V0.gaps[i]; });
    var n=V0.pieces.length, V=t, PL={V:V,rel:rel,n:n,H:H,Sg:Sg}; PL.lastS=n?rel[n-1]:0; PL.penEnd=n>1?rel[n-2]+V0.pieces[n-2].d:0;
    var pre=H-V-P.breath;
    if(pre>=P.lead){ PL.tv=P.lead; PL.tm=0; PL.off=pre-P.lead; }
    else if(pre>=0){ PL.tv=pre; PL.tm=0; PL.off=0; }   /* 곡 앞부분이 짧아 음악이 목소리보다 조금만 먼저 깔린다 */
    else { PL.tv=0; PL.tm=-pre; PL.off=0; }   /* [LATE_MUSIC] 목소리가 곡 앞부분보다 길다 — 목소리가 먼저 · 음악은 뒤에 들어온다 */
    PL.th=PL.tv+V+P.breath; PL.tdip=PL.tv+PL.penEnd;
    var songEnd=PL.tm+(Sg.dur-PL.off); PL.tend=Math.min(PL.th+P.after+OUTF,songEnd); if(PL.tend<PL.tv+V+0.2) PL.tend=Math.min(songEnd,PL.tv+V+0.2);
    return PL; }
  /* 음악 크기(dB) — 목소리 밑에 작게 깔렸다가 · 끝에서 두 번째 말이 끝나면 한 번 더 낮아지고 · 마지막 말 끝에서 0.3초에 걸쳐 크게 · 20초 머문 뒤 4초에 걸쳐 잦아든다 */
  function envDb(PL,x){ var P=SP; if(x<PL.tm||x>PL.tend) return -120;
    var L1=P.under-P.build, Ld=P.under-P.dip, hr=Math.max(PL.tdip,PL.th-P.rise), dr=Math.max(0.05,Math.min(FADE_DN,hr-PL.tdip)), d;
    if(x<PL.tv) d=L1;
    else if(x<PL.tdip) d=lerp(L1,P.under,(x-PL.tv)/Math.max(0.01,PL.tdip-PL.tv));
    else if(x<PL.tdip+dr) d=lerp(PL.n>1?P.under:L1,Ld,(x-PL.tdip)/dr);
    else if(x<hr) d=Ld;
    else if(x<PL.th) d=lerp(Ld,0,(x-hr)/Math.max(0.01,PL.th-hr));
    else if(x<PL.th+P.after) d=0;
    else d=lerp(0,-80,(x-PL.th-P.after)/OUTF);
    return d+BED_TRIM; }
  function envGain(PL,x){ var g=db2g(envDb(PL,x)), u=(x-PL.tm)/Math.max(0.05,SP.fade); if(u<1) g*=u<=0?0:u*u; return g; }   /* 처음 5초는 0 에서 천천히 */
  function envCurve(PL,x0,x1){ var n=Math.max(2,Math.ceil((x1-x0)*200)+1), c=new Float32Array(n); for(var i=0;i<n;i++) c[i]=envGain(PL,x0+(x1-x0)*i/(n-1)); return c; }
  function outNode(){ var a=ac(); if(LIM&&LIM.context===a) return LIM; LIM=a.createDynamicsCompressor(); LIM.threshold.value=-2; LIM.knee.value=0; LIM.ratio.value=20; LIM.attack.value=0.002; LIM.release.value=0.15; LIM.connect(a.destination); return LIM; }   /* 시험실 ac() 의 리미터 — 곡은 −12 LUFS 로 맞춰 터지는 자리에서 겹칠 수 있다 */
  function acReady(){ var a=ac(); if(a.state==='running') return Promise.resolve(a); var r=null; try{ r=a.resume(); }catch(x){}
    return Promise.race([Promise.resolve(r).then(function(){ return a; },function(){ return a; }),new Promise(function(ok){ setTimeout(function(){ ok(a); },1500); })]).then(function(a2){ if(a2.state!=='running'){ var y=new Error('blocked'); y.code='M7'; throw y; } return a2; }); }
  function tau(R){ return R.from+(AC.currentTime-R.t0); }
  function lastOf(R){ return {V0:R.V0,PL:R.PL,key:R.key,txt:R.txt,Sg:R.Sg,hk:R.hk}; }
  function scStop(){ RID++; var R=RUN; RUN=null; PEND=false; if(!R) return null; cancelAnimationFrame(R.raf); R.nodes.forEach(function(n){ try{ n.stop(); }catch(x){} }); setTimeout(function(){ R.gains.forEach(function(g){ try{ g.disconnect(); }catch(x){} }); },60); return R; }
  function scHalt(){ if(RUN){ var R=RUN, x=tau(R); scStop(); PAUSE={x:x}; LASTRUN=lastOf(R); ENDED=false; scPaint(); return true; } if(PEND){ scStop(); scPaint(); return true; } return false; }   /* 그 자리에 멈춤 → «이어 듣기»(시험실 PAUSE) */
  function scReset(){ var had=!!(RUN||PEND||PAUSE||ENDED||LASTRUN); scStop(); PAUSE=null; ENDED=false; LASTRUN=null; if(had) scPaint(); }   /* 곡 · 자리 · 목소리가 바뀌면 멈춘 자리도 걷는다 */
  function scPlay(from){ var st=vNow(), u=upCur(); if(!st||!st.src||!u||!u.Sg) return; hush(); quietOthers(); scStop(); PAUSE=null; ENDED=false; LASTRUN=null; var id=++RID, Sg=u.Sg, H=hookNow(u), key=st.key, txt=st.txt; wake(); PEND=true; scPaint();
    Promise.all([vPrep(st),acReady()]).then(function(rr){ if(id!==RID) return; var V0=rr[0], a=AC, PL=plan(V0,Sg,H); from=clamp(from||0,0,Math.max(0,PL.tend-0.2)); PEND=false;
      var t0=a.currentTime+0.15, R={id:id,V0:V0,PL:PL,from:from,t0:t0,nodes:[],gains:[],key:key,txt:txt,Sg:Sg,hk:H}, out=outNode();
      var mg=a.createGain(); mg.gain.value=Sg.gain; mg.connect(out); var eg=a.createGain(); eg.connect(mg); R.gains.push(mg,eg);
      var sx=Math.max(from,PL.tm), pos=PL.off+(sx-PL.tm); if(pos<Sg.dur){ var ms=a.createBufferSource(); ms.buffer=Sg.buf; ms.connect(eg); R.nodes.push(ms); try{ ms.start(t0+(sx-from),pos); }catch(x){} }
      var c=envCurve(PL,from,PL.tend); eg.gain.value=c[0]; try{ eg.gain.setValueCurveAtTime(c,t0,Math.max(0.05,PL.tend-from)); }catch(x){}
      if(V0.pieces.length){ var p0=V0.pieces[0], pl=V0.pieces[V0.pieces.length-1], a0=p0.a, d0=pl.a+pl.d-a0, tp=PL.tv;
        if(tp+d0>from){ var off=Math.max(0,from-tp), vs=a.createBufferSource(); vs.buffer=V0.buf; var vg=a.createGain(); vg.gain.value=V0.gain; vs.connect(vg); vg.connect(out); R.nodes.push(vs); R.gains.push(vg); try{ vs.start(t0+Math.max(0,tp-from),a0+off,d0-off); }catch(x){} } }
      a.onstatechange=function(){ if(a.state!=='running'&&RUN&&!D.hidden){ scHalt(); toast('소리가 끊겨 멈춰 뒀어요'); } };   /* 시험실 AC_LIFE — 전화 · 다른 앱이 소리를 가져가면 */
      RUN=R; scPaint(); loop(); }).catch(function(err){ if(id!==RID) return; scStop(); scPaint(); toast(errMsg(err)); }); }
  function loop(){ var R=RUN; if(!R) return; var x=tau(R); paintGraph(x); if(x>=R.PL.tend+0.2){ scStop(); LASTRUN=lastOf(R); ENDED=true; PAUSE=null; scPaint(); return; } R.raf=requestAnimationFrame(loop); }
  /* 목소리가 없을 때 누르면 — 빌더 줄 ▶ 와 같은 알림(AI_PLAY_READY · OFF_TOAST «목소리를 먼저 만들어 주세요» · «만들러 가기») */
  function offPress(){ try{ if(typeof _playOff==='function'&&_playOff('entry')&&typeof mkPlayOff==='function'){ mkPlayOff('entry'); return; } }catch(x){} try{ if(typeof _rfUrl==='function') _rfUrl('entry',true); }catch(x){} toast(typeof AI_OFF_PREP==='string'?AI_OFF_PREP:'준비 중이에요'); }
  /* 화면 — 알림(늦게 들어오는 판) → 그래프(흰 카드) → 긴 알약([PLAYER_ORDER]) */
  var SCENE_WAIT=['본식 5분 전부터 문 앞에서 기다려요','본식 5분 전부터 기다려요','5분 전부터 기다려요','기다려요','대기',''], SCENE_WALK=['문이 열리고 걸어 들어와요','걸어 들어와요','입장',''];   /* [SCENE_WAIT5 · WAIT_GROUP] 시험실 그대로 */
  function graphHtml(nar){ var al=nar?'소리 흐름 · 본식 5분 전부터 두 분이 문 앞에서 기다리는 동안 작게 흐르는 음악 위로 입장 멘트가 흐르고, «입장!»이 끝나면 음악이 크게 올라오며 문이 열리고 두 분이 걸어 들어와 도착해요':'소리 흐름 · 본식 5분 전부터 두 분이 문 앞에서 기다리는 동안 작게 흐르는 음악 위로 두 분 목소리로 인사가 흐르고, 마지막 말이 끝나면 음악이 크게 올라오며 문이 열리고 두 분이 걸어 들어와 도착해요';
    return '<div class="em-graph" role="img" aria-label="'+e(al)+'" onclick="emAct(\'graph\',event)"><div class="lg-names" aria-hidden="true"><span>음악</span><span>목소리</span></div><div class="lg-plot"><canvas aria-hidden="true"></canvas></div>'
      +'<div class="lg-scene wait" aria-hidden="true"><span class="lgs-greet">'+SCENE_WAIT[0]+'</span><span class="lgs-walk"><b>'+SCENE_WALK[0]+'</b><em>도착</em></span></div></div>'; }
  function pillHtml(st,PL){ var ok=!!(st&&st.src), busy=PEND, on=!!RUN, ps=!on&&!busy&&!!PAUSE, off=!ok&&!on&&!busy, len=(PL&&!on&&!busy&&!ps)?fmtLen(PL.tend):'';
    return '<button type="button" class="mk-hbtn em-scp'+(on?' on':'')+(off?' off':'')+'" data-fk="emscene" aria-pressed="'+on+'"'+(busy?' aria-busy="true"':'')+(off?' aria-disabled="true"':'')+' onclick="emAct(\'scene\',this)">'+(on?ico('stop'):ico('play'))+' '+(busy?'준비하는 중':on?'멈추기':ps?'이어 듣기':'음악과 함께 듣기')+(len?' <span class="mk-sec-t">'+len+'</span>':'')+'</button>'; }
  /* 지금 목소리 · 곡이 듣던 장면과 다르면(예시를 바꿈 · 글을 고침 · 다른 곡) 듣던 것과 멈춘 자리를 걷는다 */
  function sceneCheck(st){ var R=RUN||LASTRUN; if(!R) return; var u=upCur(); if(!st||st.txt!==R.txt||(st.src&&st.key!==R.key)||!u||u.Sg!==R.Sg||hookNow(u)!==R.hk){ scStop(); PAUSE=null; ENDED=false; LASTRUN=null; } }
  function sceneHtml(){ var st=vNow(), u=upCur(); if(!st||!u||!u.Sg) return ''; sceneCheck(st);
    var V0=st.src?VR[st.key]:null, PL=V0?plan(V0,u.Sg,hookNow(u)):null, R0=RUN||((PAUSE||ENDED)?LASTRUN:null), PLs=R0?R0.PL:PL, late=!!(PLs&&PLs.tm>LATE_T), h='<section class="mk-sec em-scene" aria-label="음악과 함께 듣기">';
    if(late) h+='<div class="mk-recws em-late"><p class="mk-recw"><b>'+(st.nar?'멘트가':'인사가')+' 길어 음악이 '+Math.max(1,Math.round(PLs.tm))+'초 늦게 들어와요</b><span>'+(st.nar?'더 뒤 자리를 고르면 음악이 먼저 흘러요':'조금 줄이면 음악이 먼저 흘러요')+'</span></p></div>';   /* [LATE_MUSIC · LATE_NOTE_FORM] 빌더 알림 모양 */
    if(st.src) h+=graphHtml(st.nar);   /* 목소리가 없으면 그래프를 그리지 않는다 — 없는 소리를 그리지 않는다(GRAPH_MIN) */
    h+='<div class="mk-sech mk-sech-r em-play">'+pillHtml(st,PL)+'</div></section>';
    if(st.src&&!V0&&!VB[st.key]&&!(VFAIL[st.key]&&Date.now()-VFAIL[st.key]<15000)) setTimeout(function(){ vPrep(st).then(function(){ sceneSync(); },function(){}); },0);   /* 길이 · 그래프는 목소리를 풀어야 안다 — 받는 동안 그래프 자리는 그대로(SCENE_HOLD) */
    return h; }
  /* 이 칸만 다시 — 곡 칸(redraw) · 목소리를 풀었을 때 · 빌더가 다 그린 뒤 */
  function sceneSync(){ var row=D.querySelector('.ls-mu'), pick=row&&row.closest('.mk-pick'), old=D.querySelector('.em-scene'); if(!pick){ if(old&&old.parentNode) old.parentNode.removeChild(old); return; }
    var h=sceneHtml(), ae=D.activeElement, fk=(ae&&old&&old.contains(ae))?ae.getAttribute('data-fk'):null;
    if(!h){ if(old&&old.parentNode) old.parentNode.removeChild(old); return; }
    var t=D.createElement('div'); t.innerHTML=h; var nw=t.firstChild; if(old&&old.parentNode) old.parentNode.replaceChild(nw,old); else pick.parentNode.insertBefore(nw,pick.nextSibling);
    if(fk){ var n=nw.querySelector('[data-fk="'+fk+'"]'); if(n) try{ n.focus({preventScroll:true}); }catch(x){} }
    fitPill(); paintGraph(); }
  function paintPill(){ var b=D.querySelector('.em-scene [data-fk="emscene"]'); if(!b) return; var st=vNow(), u=upCur(), V0=st&&st.src&&VR[st.key], PL=V0&&u&&u.Sg?plan(V0,u.Sg,hookNow(u)):null, t=D.createElement('div'); t.innerHTML=pillHtml(st,PL); var n=t.firstChild;
    if(b.outerHTML===n.outerHTML) return; var foc=D.activeElement===b; b.parentNode.replaceChild(n,b); if(foc) try{ n.focus({preventScroll:true}); }catch(x){} fitPill(); }
  function scPaint(){ paintPill(); paintGraph(); }
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
  function scenePlan(){ var R=RUN||((PAUSE||ENDED)?LASTRUN:null); if(R) return {V0:R.V0,PL:R.PL}; var st=vNow(), u=upCur(), V0=st&&st.src&&VR[st.key]; return V0&&u&&u.Sg?{V0:V0,PL:plan(V0,u.Sg,hookNow(u))}:null; }
  function paintGraph(x){ try{ var g=D.querySelector('.em-graph'); if(!g) return; var cv=g.querySelector('canvas'), sc=g.querySelector('.lg-scene'), P2=scenePlan();
      if(!P2){ if(cv){ var c0=cv.getContext('2d'); c0.clearRect(0,0,cv.width,cv.height); } if(sc){ sc.classList.add('wait'); var pw0=(g.querySelector('.lg-plot')||{}).clientWidth||0; if(sc.__wpw!==pw0){ sc.__wpw=pw0; sc.__cols=null; sc.style.gridTemplateColumns=''; fitTxt(sc.querySelector('.lgs-greet'),SCENE_WAIT); fitWalk(sc.querySelector('.lgs-walk')); } } return; }   /* [SCENE_HOLD] 목소리를 받는 동안 자리만 */
      if(x==null) x=RUN?tau(RUN):PAUSE?PAUSE.x:ENDED?P2.PL.tend:null;
      var n=Math.max(40,Math.min(240,Math.floor((cv.clientWidth||300)/3))); drawGraph(cv,graphData(P2.PL,P2.V0,n),x); sceneRow(g,P2.PL,P2.V0,x); }catch(x2){} }   /* [PAINT_GUARD] 그래프는 꾸밈 — 실패해도 소리는 멈추지 않는다 */
  /* [GRAPH_TAP · SCENE_TAP] 그래프는 손을 뗄 때(click) — 누른 자리부터 · 장면 말을 누르면 그 장면 머리부터(기다림 = 처음 · 문이 열리고 = 마지막 말 첫머리) */
  function graphTap(ev){ var st=vNow(); if(!st||!st.src){ offPress(); return; } var P2=scenePlan(); if(!P2) return; var g=D.querySelector('.em-graph'), cv=g&&g.querySelector('canvas'); if(!cv) return;
    var sp=ev&&ev.target&&ev.target.closest?ev.target.closest('.lg-scene>span'):null, PL=P2.PL;
    if(sp){ scPlay(sp.classList.contains('lgs-greet')?0:Math.max(0,PL.tv+(PL.lastS||0))); return; }
    var rr=cv.getBoundingClientRect(); if(!ev||ev.clientX<rr.left) return; scPlay(clamp((ev.clientX-rr.left)/Math.max(1,rr.width),0,1)*PL.tend); }

  /* ── 누름 ── */
  window.emAct=function(a,arg){
    if(a==='guide'){ guideOpen(); return; }
    if(a==='upopen'){ if(!seen()){ guideOpen(); return; } upPick(); return; }   /* [UP_GUIDE] 처음 한 번은 안내 창부터 · 다음부터 바로 파일 창 */
    if(a==='updel'){ upDel(); return; }
    if(a==='prev'){ var u=upCur(); if(u) play('up',upList(u)[u.pick]?upList(u)[u.pick].t:u.Sg.dur*0.3,6,80); return; }
    if(a==='hookprev'){ var u2=upCur(), c=upList(u2)[arg]; if(c) play('up#'+arg,c.t,8,16); return; }
    if(a==='hookpick'){ var u3=upCur(), c3=upList(u3)[arg]; if(!c3||u3.pick===arg) return; u3.pick=arg; keep(u3); redraw(); toast(fmtMS(c3.typed!=null?c3.typed:c3.t)+'에 맞췄어요'); return; }
    if(a==='owntxt'){ var u4=upCur(); if(u4&&arg) u4.ownTxt=arg.value; return; }   /* 적는 중인 글은 기억 — 다시 그려도 칸이 비지 않게 */
    if(a==='ownset'){ var oi=D.getElementById('muOwn'); if(!upOwnSet(oi?oi.value:'')&&oi) try{ oi.focus({preventScroll:true}); }catch(x){} return; }   /* 틀리면 칸으로 돌아가 고친다 */
    /* [ENTRY_SCENE_1012] 음악과 함께 듣기 — 준비하는 중에 누르면 취소 · 트는 중이면 그 자리에 멈춤 · 멈춘 뒤면 이어서 · 끝났으면 처음부터 */
    if(a==='scene'){ if(PEND){ scStop(); scPaint(); return; } if(RUN){ scHalt(); return; } var st=vNow(); if(!st||!st.src){ offPress(); return; } scPlay(PAUSE?PAUSE.x:0); return; }
    if(a==='graph'){ graphTap(arg); return; }
  };
  D.addEventListener('keydown',function(ev){ var t=ev.target; if(t&&t.id==='muOwn'&&ev.key==='Enter'&&!ev.isComposing){ ev.preventDefault(); upOwnSet(t.value); } });   /* 컴퓨터 · 안드로이드 «완료» */
  /* 빌더가 다 그린 뒤 — 이 칸이 사라졌으면(다른 쪽으로 감) 듣던 소리를 멈춘다 */
  function after(){ if(PREV&&!D.querySelector('.ls-mu')) hush();
    if(!D.querySelector('.em-scene')){ if(RUN||PEND) scHalt(); return; }   /* [ENTRY_SCENE_1012] 장면 칸이 없어지면(다른 쪽) 그 자리에 멈춘다 */
    fitPill(); paintGraph(); }   /* 빌더가 다시 그리면 그래프 캔버스가 새것이다 — 지금 자리로 다시 그린다(트는 중이면 다음 틀이 이어 그린다) */

  EM.rowHtml=rowHtml; EM.sceneHtml=sceneHtml; EM.guideBody=guideBody; EM.after=after; EM.hush=function(){ if(hush()) redraw(); scHalt(); };   /* 빌더가 제 소리를 틀 때(_stopMk) — 이 칸 ▶ 만 되돌리고 장면은 그 자리에 멈춘다(쪽 전체를 다시 그리지 않는다) */
  EM._t={ups:function(){ return UPS; },upParse:upParse,upSnap:upSnap,upCands:upCands,prev:function(){ return PREV&&PREV.key; },restore:function(){ return RESTORE; },
    scene:function(){ var P2=scenePlan(); return {run:!!RUN,pend:PEND,pause:PAUSE?PAUSE.x:null,ended:ENDED,x:RUN?tau(RUN):null,plan:P2?{tv:P2.PL.tv,tm:P2.PL.tm,off:P2.PL.off,th:P2.PL.th,tend:P2.PL.tend,V:P2.PL.V,n:P2.PL.n,tdip:P2.PL.tdip,H:P2.PL.H}:null,pieces:P2?P2.V0.pieces.length:0}; },
    envDb:function(x){ var P2=scenePlan(); return P2?envDb(P2.PL,x):null; }};   /* 점검용 */
  window.EntryMusic=EM;
})();
