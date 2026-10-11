/* ★★[ENTRY_MUSIC_1012 2026-10-12 사장님 «마이페이지 식순 입장 부분에 올려 보자 · 일단 전부 올려 · 지금 오픈 전이니깐»]
   입장 시험실(비공개 · v50)의 «입장 음악»을 실제 빌더(order-preview.html) ② 입장 쪽으로 옮긴 1단계 —
   두 분이 고른 곡 올리기 → 크게 올라오는 자리(찾은 후보 · 앞뒤 들어 보기) → 직접 적기 → 올리기 안내 창.
   · [MUSIC_GONE 2026-08-03 «노래선정부분 완전삭제»]를 «입장» 순간에서만 뒤집는다 — 완성 화면의 곡명 칸(mPeak)은 그대로 없다.
   · 올린 파일은 이 기기 안에서 풀고(서버로 아직 보내지 않는다 · 3단계) 이 기기 IndexedDB 에 둔다(새로고침해도 남게) ·
     고른 곡 이름 · 가수 · 길이 · 고른 자리는 초안 S.mu 에 저장(마이페이지 저장과 함께 서버로 간다).
   · 추천 곡(시험실 카드)은 저장소가 공개라 음원 · 가사를 여기 싣지 않는다 — 사장님 결정 뒤(드라이브 · 로그인한 고객만) 붙인다.
   · 2단계 «음악과 함께 듣기»(두 분 목소리 → 마지막 말 끝에 하이라이트 · 그래프)는 다음 판 — 그 전까지 안내 창은 그 문장을 말하지 않는다(EM.scene).
   시험실 결정은 그대로 옮겼다: [MY_SONG] 분석 · 후보 · 추천 규칙 · [HOOK_TYPE] 직접 적기 · [UP_TIDY] 한 줄 · [UP_LINKS_ONE] 링크 한 줄 ·
   [OWN_PILL_SAME] 적는 칸 = ▶ 알약 · [UP_GUIDE] 안내 창 · [GUIDE_OK] «알겠어요» · [UP_ACCEPT] 확장자만 · [TOAST_MIN] 알림 20자 안 */
(function(){
  'use strict';
  if(window.EntryMusic) return;
  var D=document;
  var UP_WALK=102, UP_PRE=15, UP_MIN=60, UP_MAX=60*1024*1024, SONG_LUFS=-12, BED_TRIM=-6;   /* 걷는 시간 = 콘솔 입장 큐 어림(1분 42초) · 앞부분 15초 · 1분 넘는 곡 · 시험실과 같은 값 */
  var UPS=null, UP_ID=0, PREV=null, AC=null, DEC=null, RESTORE=0;
  var EM={ scene:false };   /* 2단계에서 true — 안내 창 «음악과 함께 듣기로 …» 문장 */

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
    if(fk){ var n=box.querySelector('[data-fk="'+fk+'"]'); if(n){ try{ n.focus({preventScroll:true}); if(n.id==='muOwn'&&s0!=null) n.setSelectionRange(s0,s1); }catch(x){} } } }
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
  function keep(u){ var c=upList(u)[u.pick]||upList(u)[0]; var s=St(); s.mu={src:'up',name:u.name,t:u.meta.t,a:u.meta.a,dur:Math.round(u.Sg.dur*10)/10,hook:c?c.t:null,typed:(c&&c.own)?c.typed:null}; save(); }   /* 스튜디오가 볼 것 = 곡 · 고른 자리 */
  function analyze(f,quiet,want){ var id=++UP_ID, was=upCur(), nm=upName(f.name||''); hush(); UPS={busy:true,name:nm,prev:was}; redraw();
    return f.arrayBuffer().then(function(ab){ var tg=upTags(ab); return decode(ab).then(function(b){ return {b:b,tg:tg}; }); }).then(function(r){ if(id!==UP_ID) return;
      if(!r.b||r.b.duration<UP_MIN){ UPS=was; redraw(); toast('1분 넘는 곡으로 골라 주세요'); return; }
      var Sg=prepSong(r.b), L=upCands(Sg), pk=0; L.forEach(function(c,j){ if(c.rec) pk=j; });
      var u={name:nm,Sg:Sg,cands:L,pick:pk,own:null,ownTxt:'',meta:{t:r.tg.t||nm,a:r.tg.a||''}};
      if(want&&want.hook!=null){ var hit=-1; L.forEach(function(c,j){ if(Math.abs(c.t-want.hook)<0.06) hit=j; });   /* 새로고침 — 고른 자리 그대로 */
        if(hit>=0) u.pick=hit; else if(want.hook<Sg.dur-5){ u.own={t:want.hook,typed:want.typed!=null?want.typed:want.hook,after:Sg.dur-want.hook,own:true}; u.ownTxt=fmtMS(u.own.typed); u.pick=L.length; } }
      UPS=u; if(!quiet){ fPut(f); keep(u); toast(fmtMS(upList(u)[u.pick].t)+'에 맞췄어요'); } redraw();
    }).catch(function(){ if(id!==UP_ID) return; UPS=was; redraw(); if(!quiet) toast('MP3 · M4A 파일만 열 수 있어요'); }); }
  function upLoad(f){ if(!f) return; if(f.size>UP_MAX){ toast('60MB 아래 파일로 골라 주세요'); return; } analyze(f,false,null); }
  function upDel(){ ++UP_ID; hush(); UPS=null; var s=St(); delete s.mu; save(); fDel(); redraw(); toast('올린 곡을 뺐어요'); }
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
  function play(key,h,pre,len){ var u=upCur(); if(!u) return; var was=PREV&&PREV.key===key; hush(); if(was){ redraw(); return; } quietOthers();
    var a=wake(), Sg=u.Sg, t0=a.currentTime+0.08, x0=Math.max(0,h-pre), d=Math.min(Sg.dur-x0,len), lv=Sg.gain*db2g(BED_TRIM);
    var src=a.createBufferSource(); src.buffer=Sg.buf; var g=a.createGain(); g.gain.setValueAtTime(0.0001,t0); g.gain.linearRampToValueAtTime(lv,t0+0.5); g.gain.setValueAtTime(lv,t0+Math.max(0.6,d-1.2)); g.gain.linearRampToValueAtTime(0.0001,t0+d);
    src.connect(g); g.connect(a.destination); try{ src.start(t0,x0,d); }catch(x){}
    var p={key:key,src:src,g:g}; p.timer=setTimeout(function(){ if(PREV===p){ PREV=null; redraw(); } },d*1000+250); PREV=p; redraw(); }
  D.addEventListener('visibilitychange',function(){ if(D.hidden&&hush()) redraw(); });

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
      +'<p class="mk-note mk-rd-sum"><span>고른 자리는 두 분의 마지막 말이 끝나는 순간 크게 올라와요.</span>'+(EM.scene?'<span><b>음악과 함께 듣기</b>로 인사부터 입장까지 이어서 들어 보세요.</span>':'')+'</p>'
      +'<button type="button" class="mk-dlg-go" data-fk="muguideok" onclick="mkDlgClose()">알겠어요</button>'; }
  function guideOpen(){ try{ if(typeof _tipSeen==='function') _tipSeen('mu'); MK.muGuide=true; }catch(x){} hush(); renderAll(); }   /* 창은 빌더 render 끝(_recDlgPaint)이 그린다 */
  function seen(){ var t=St().tipSeen; return !!(t&&t.mu); }

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
  };
  D.addEventListener('keydown',function(ev){ var t=ev.target; if(t&&t.id==='muOwn'&&ev.key==='Enter'&&!ev.isComposing){ ev.preventDefault(); upOwnSet(t.value); } });   /* 컴퓨터 · 안드로이드 «완료» */
  /* 빌더가 다 그린 뒤 — 이 칸이 사라졌으면(다른 쪽으로 감) 듣던 소리를 멈춘다 */
  function after(){ if(PREV&&!D.querySelector('.ls-mu')) hush(); }

  EM.rowHtml=rowHtml; EM.guideBody=guideBody; EM.after=after; EM.hush=function(){ if(hush()) redraw(); };   /* 빌더가 제 소리를 틀 때(_stopMk) — 이 칸 ▶ 만 되돌린다(쪽 전체를 다시 그리지 않는다) */
  EM._t={ups:function(){ return UPS; },upParse:upParse,upSnap:upSnap,upCands:upCands,prev:function(){ return PREV&&PREV.key; },restore:function(){ return RESTORE; }};   /* 점검용 */
  window.EntryMusic=EM;
})();
