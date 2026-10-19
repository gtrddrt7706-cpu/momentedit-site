/* ★★[ENTRY_SCENE_ENGINE 2026-10-12 사장님 «일단 전부 올려»] 입장 «음악과 함께» 계산 한 곳 — 식순 화면(entry-music.js)과 당일 콘솔(console.html)이 같은 식을 쓴다.
   기획안 «6. 당일 콘솔 · 콘솔이 같은 계산으로 음악 시작 지점 · 페이드인 · 하이라이트를 맞춘다» — 두 곳에 따로 적으면 고객이 미리 들은 장면과 당일 장면이 갈라진다.
   화면 · 빌더 전역에 기대지 않는 순수 계산만 둔다(소리 크기 · 문장 나누기 · 말끝 빈소리 걷기 · 장면 짜기 · 음량 곡선 · 목소리를 어디서 끊어 트나).
   목소리 걸기(voiceStart)만 소리 마디를 만든다 — 넘겨받은 AudioContext 하나만 쓰고 전역은 보지 않는다(두 곳이 같은 자리에서 끊게 · [ENTRY_CALL_PAUSE_1013]). 값은 시험실 v50 그대로(DEF_P · CUE.fadeDownMs · OUTF · LATE_T · VOICE_LUFS).
   ★여기 값을 바꾸면 식순 화면 미리 듣기와 당일 콘솔이 함께 바뀐다 — 그게 이 파일이 있는 까닭이다. */
(function(){
  'use strict';
  var SP={lead:10,fade:6,intro:-6,duck:1.5,under:-12,build:3,dip:4,breath:0.3,rise:0.3,after:60,call:1.8}, PREV_FADE=2.5, FADE_DN=0.4, OUTF=4, LATE_T=0.3, VOICE_LUFS=-16, SONG_LUFS=-12, BED_TRIM=-6, PRE_ROLL=0.3;
  /* ★★[ENTRY_BGM_1019 2026-10-19 사장님 «처음도입부분을 좀더 길게 늘리고 서서히 0에서 볼륨을 높였다가 멘트 직전에 낮출것이고 모든 bgm전부(입장)» ·
       «도착 까지 시간을 좀더 늘릴거야 행진이후 1분이상»] (BGM 섹션 설계 명세 1 · 10/19)
     음악이 멘트보다 10초 먼저(lead · 종전 4초) — 첫소리 0 에서 6초에 걸쳐 올라와(fade · u² · 종전 2.5초) 6 ~ 8.5초 intro(-6dB)로 깔리고
     멘트 1.5초 전부터(duck · 종전 0.5초) 목소리 밑 크기로 내려온다 · 문 열린 뒤 크게 60초(after · 종전 20초) 머문 뒤 4초에 잦아든다 = «도착»까지 64초.
     근거(명세): 자료 «음악 재생 후 12초 안에 멘트»(실전 대본 · 신랑 입장) · 다른 실전 대본도 문 열림이 음악 16 ~ 26초.
     ★미리 듣기(카드 ▶ · 올린 곡 ▶ · 자리 ▶ · 음악만 듣기)의 첫소리는 PREV_FADE 2.5초 그대로 — 12초 앞자락의 절반이 페이드면 곡을 확인할 수 없다(명세 2).
     당일 콘솔은 같은 lead · fade · duck 로 시작하고 문 열린 뒤는 종전대로 디렉터가 다음을 누를 때까지(after 1e5).
     ★값을 되돌리지 말 것 — scripts/audit/bgm-first.mjs 1 · 7 과 entry-bgm.mjs(6판 × 추천 8곡)가 잰다 */
  /* ★★[SOFT_START_1013 2026-10-13 사장님 «처음 부분 잔잔하게(페이드인) 시작하게 해 줘 · 미리 듣기 부분도 · 입장 멘트 동시 듣기 부분도»] 첫 소리는 2.5초에 걸쳐 0 에서 올라온다(fade · 종전 1.2초).
     장면(식순 화면 · 당일 콘솔이 같은 곡선)과 미리 듣기(카드 ▶ · 올린 곡 ▶ · 자리 ▶)가 같은 값 · 같은 모양(u² · fadeCurve). 멘트는 여전히 4초에 시작한다(lead) — 음악은 2.5초에 다 올라와 1초 깔린 뒤 멘트 0.5초 전부터 낮아진다(→ [ENTRY_BGM_1019] 장면은 10초 · 6초 · 1.5초 · 미리 듣기는 2.5초 그대로).
     ★★[PRE_ROLL_1013 같은 날 «듣기 플레이 버튼 누르고 30초 후 들리게 해 줘 · 씹힘 방지»] 0.3초로 읽었다(누르고 30초 조용하면 고장으로 보인다) — 식순 화면은 누르고 0.3초 뒤에 소리를 건다(종전 미리 듣기 0.08초 · 장면 0.15초).
       폰 · 블루투스 기기가 깨어나는 동안 첫소리가 잘리지 않게. 당일 콘솔은 배경음이 늘 흐르고 있어(소리 장치가 깨어 있다) 종전 0.15초 그대로 — 그 시각에 묶인 차례(대사 끝 · 진행 막대)를 건드리지 않는다 */
  /* ★★[ENTRY_CALL_PAUSE_1013 2026-10-13 사장님 «따뜻한 박수로 맞이해 주시면 감사하겠습니다. 이후 신랑 신부 입장까지 적절하게 쉼을 좀 주는 게 좋을 것 같아»]
     음악과 함께 듣는 장면에서만 «신랑 신부, 입장!» 앞 쉼을 1.8초(call · 말끝에서 다음 말머리까지)로 늘린다 — 녹음은 0.66 ~ 0.78초(C 만 1.09초 · 실측 2026-10-13).
     ★같은 날 1초로 넣은 뒤 사장님 «신랑 신부 입장 앞 쉼 부분 1.8초로 해 보자» → 1.8초. 값은 이 한 곳(SP.call)이다.
     그 쉼에 음악이 한 번 더 낮아져(dip) 숨을 고르고, «입장!» 뒤 0.3초에 크게 올라온다. 이미 그보다 긴 녹음은 그대로(늘리기만 · 줄이지 않는다).
     ★나레이션만 들을 때(곡 없음 · 당일 곡을 못 받은 길)는 녹음 그대로 0.6초 — 10/10 사장님 «감사하겠습니다 다음 신랑 신부가 너무 느려»(PACE_D · 견본 D)를 그대로 둔다.
       (9/09 ENTRY_HOLD 1.2초 · 10/10 «너무 느려»는 나레이션만 들을 때의 이야기다 — 장면은 음악이 낮아진 채 쉼을 채운다.)
     소리는 한 파일이라 쉼 한가운데에서 둘로 끊어 튼다(voiceSegs · voiceStart) — 식순 화면과 당일 콘솔이 같은 자리에서 끊어 같은 쉼을 낸다 */
  /* ★★[BGM_FIRST_1013 2026-10-13 사장님 «bgm이 먼저 조금 깔리다가 멘트를 하는 게 좋을 것 같은데»] 멘트 앞 4초(lead)에 음악이 «들리게» —
     종전 곡선은 처음 5초를 0 에서 천천히 올리고(fade 5) 멘트 전에도 목소리 밑 크기(-15dB)라 앞 4초가 거의 들리지 않았다(시험 곡 실측 -49 ~ -25dB).
     이제 1.2초에 걸쳐 올라와(fade) 멘트 전에는 -6dB(intro · 하이라이트보다 6dB 아래)로 깔리고, 멘트 시작 0.5초 전부터(duck) 목소리 밑 크기로 내려간다.
     멘트가 곡 앞부분보다 길면 같은 소절이 다시 나오는 뒤 자리(목록 hooks)에 문 열림을 맞춘다(pickHook) — 음악이 늘 먼저 4초(→ [ENTRY_BGM_1019] 10초). 당일 콘솔도 같은 식(S.mu.hooks) */
  function clamp(x,a,b){ return x<a?a:x>b?b:x; }
  function db2g(db){ return db<=-89?0:Math.pow(10,db/20); }
  function lerp(a,b,t){ return a+(b-a)*clamp(t,0,1); }
  function mono(buf){ var n=buf.length, c=buf.numberOfChannels, y=new Float32Array(n); for(var k=0;k<c;k++){ var x=buf.getChannelData(k); for(var i=0;i<n;i++) y[i]+=x[i]/c; } return y; }
  function lufsOf(x,sr){ try{ var v=window.RecProcess.lufs(x,sr); return isFinite(v)?v:-30; }catch(x2){ return -30; } }   /* [REC_SHARED] rec-process.js 의 BS.1770 — 없으면 -30 으로 어림 */
  function peakOf(x){ var p=0; for(var i=0;i<x.length;i++){ var a=x[i]<0?-x[i]:x[i]; if(a>p) p=a; } return p; }
  function sentN(t){ return Math.max(1,String(t||'').replace(/([.!?])\s+/g,'$1\n').split('\n').filter(function(s){ return /\S/.test(s); }).length); }
  /* 말 앞뒤 빈소리 — 시험실 edgeTrimIdx(빌더 _edgeTrim 과 같은 문턱) */
  function edgeTrimIdx(x,a,b,sr,side){ var fr=Math.max(1,Math.round(sr*0.01)), nf=Math.floor((b-a)/fr); if(nf<3) return [a,b];
    var r=new Float32Array(nf), mx=0; for(var f=0;f<nf;f++){ var q=0, s0=a+f*fr; for(var j=s0;j<s0+fr;j++) q+=x[j]*x[j]; r[f]=Math.sqrt(q/fr); if(r[f]>mx) mx=r[f]; }
    var th=mx*0.06, keep=Math.round(sr*0.04);
    if(side==='end'){ var en=nf-1; while(en>0&&r[en]<th) en--; return [a,Math.min(b,a+(en+1)*fr+keep)]; }
    var st=0; while(st<nf-1&&r[st]<th) st++; return [Math.max(a,a+st*fr-keep),b]; }
  /* 문장 조각 — 시험실 sentSplit(빌더 _gapFit 과 같은 문장 끝 찾기) */
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
  /* 목소리 — 크기(VOICE_LUFS · 봉우리 0.95) · 문장 조각 · 조각 사이 쉼(시험실 buildVO)
     나레이션은 모두 «신랑 신부, 입장!»으로 끝나고 쉼표 자리에서 길게 숨을 쉰다(문장 사이보다 길다) → 문장 수 + 1 로 자르고 마지막 둘을 한 줄로.
     마지막 말 끝 빈소리를 걷는다 — «숨»이 실제 말끝에서 하이라이트까지가 되게 */
  function prepVoice(b,n,nar){ var x=mono(b), sr=b.sampleRate, L=lufsOf(x,sr), pk=peakOf(x), g=Math.min(db2g(VOICE_LUFS-L),0.95/Math.max(pk,1e-4)), segs=sentSplit(x,sr,nar?n+1:n), call=false;
    if(nar&&segs.length===n+1&&segs.length>1){ var z=segs.pop(); segs[segs.length-1]=[segs[segs.length-1][0],z[1]]; call=segs.length>1; }   /* call = 마지막 조각이 «신랑 신부, 입장!»으로 확인됐다(쉼표 숨까지 한 줄로 묶였다) */
    if(segs.length){ var l=segs[segs.length-1]; l[1]=edgeTrimIdx(x,l[0],l[1],sr,'end')[1]; }
    var ps=segs.map(function(sg){ return {a:sg[0]/sr,d:(sg[1]-sg[0])/sr}; }), gaps=[]; for(var i=0;i<ps.length-1;i++) gaps.push(Math.max(0,ps[i+1].a-(ps[i].a+ps[i].d)));
    var V0={buf:b,gain:g,pieces:ps,gaps:gaps};
    if(call){ var k=ps.length-2, pe=edgeTrimIdx(x,segs[k][0],segs[k][1],sr,'end')[1]/sr, ls=edgeTrimIdx(x,segs[k+1][0],segs[k+1][1],sr,'start')[0]/sr, add=SP.call-(ls-pe);   /* [ENTRY_CALL_PAUSE_1013] 말끝(«…감사하겠습니다.») → 말머리(«신랑») */
      if(add>0.01){ V0.cut={at:(ps[k].a+ps[k].d+ps[k+1].a)/2,add:add,was:ls-pe}; gaps[k]+=add; } }   /* 두 조각 사이 빈자리 한가운데에서 끊고 add 초를 띄운다 — rel · V · 하이라이트(th)가 함께 밀린다 */
    return V0; }
  /* [ENTRY_CALL_PAUSE_1013] 목소리를 어디서 끊어 장면 몇 초에 트나 — t = 목소리 시작(tv)부터 · a = 파일 자리 · d = 길이 · fo/fi = 끊는 자리 15ms 페이드(딸깍 방지) */
  function voiceSegs(V0){ var P=V0&&V0.pieces||[], n=P.length; if(!n) return []; var a0=P[0].a, en=P[n-1].a+P[n-1].d, c=V0.cut;
    if(!c||!(c.at>a0&&c.at<en)||!(c.add>0)) return [{t:0,a:a0,d:en-a0}];
    return [{t:0,a:a0,d:c.at-a0,fo:1},{t:c.at-a0+c.add,a:c.at,d:en-c.at,fi:1}]; }
  /* 목소리 걸기 — 넘겨받은 AudioContext(a) · 나갈 곳(dest)만 쓴다. t0 = 장면 0초의 기기 시각 · tv = 목소리 시작 · from = 장면 몇 초부터(이어 듣기) */
  function voiceStart(a,V0,dest,t0,tv,from){ var out={nodes:[],gains:[]}, F=0.015; from=from||0;
    voiceSegs(V0).forEach(function(sg){ var s=tv+sg.t; if(s+sg.d<=from+0.01) return; var off=Math.max(0,from-s), at=t0+Math.max(0,s-from), d=sg.d-off, src=a.createBufferSource(), fg=a.createGain();
      src.buffer=V0.buf; src.connect(fg); fg.connect(dest);
      if(sg.fi&&off<F){ fg.gain.setValueAtTime(0,at); fg.gain.linearRampToValueAtTime(1,at+F); }
      if(sg.fo&&d>2*F){ fg.gain.setValueAtTime(1,at+d-F); fg.gain.linearRampToValueAtTime(0,at+d); }
      try{ src.start(at,sg.a+off,d); }catch(x){} out.nodes.push(src); out.gains.push(fg); });
    return out; }
  /* 곡 — 크기(SONG_LUFS · 봉우리 여유 6dB) */
  function prepSong(buf){ var x=mono(buf), sr=buf.sampleRate, L=lufsOf(x,sr), pk=peakOf(x), g=Math.min(db2g(SONG_LUFS-L),0.98/Math.max(pk,1e-4)*db2g(6));
    return {buf:buf,sr:sr,dur:buf.duration,gain:g,lufs:L,x:x}; }
  /* 장면 짜기 — 마지막 말 끝 + 숨 = 하이라이트. 거기서 거꾸로 곡 시작점을 정한다(시험실 plan · new 그대로)
     opts.after — 하이라이트 뒤 크게 머무는 초(식순 화면 60초 [ENTRY_BGM_1019] · 종전 20초 · 당일 콘솔은 디렉터가 다음을 누를 때까지라 곡 끝까지) */
  /* [BGM_FIRST_1013] 문 열림 자리 고르기 — 고른 자리(H)에서 음악이 멘트보다 lead 초 먼저 깔릴 수 있으면 그대로(사장님이 귀로 고른 자리가 먼저) ·
     모자라면 같은 소절이 다시 나오는 뒤 자리 중 처음으로 넉넉한 곳 · 어디도 모자라면 가장 뒤(가장 덜 늦는 곳). 후보가 없으면(두 분이 올린 곡) 고른 자리 그대로 */
  function pickHook(H,hooks,V){ var need=V+SP.breath+SP.lead; if(!(H<need)||!Array.isArray(hooks)) return H;
    var L=hooks.map(Number).filter(function(h){ return isFinite(h)&&h>H+0.5; }).sort(function(a,b){ return a-b; });
    for(var i=0;i<L.length;i++) if(L[i]>=need) return L[i];
    return L.length?L[L.length-1]:H; }
  function plan(V0,Sg,H,opts){ var P=SP, rel=[], t=0, after=(opts&&opts.after!=null)?opts.after:P.after; V0.pieces.forEach(function(p,i){ rel.push(t); t+=p.d; if(i<V0.gaps.length) t+=V0.gaps[i]; });
    var n=V0.pieces.length, V=t, H0=H; H=pickHook(H,opts&&opts.hooks,V); var PL={V:V,rel:rel,n:n,H:H,H0:H0,Sg:Sg,after:after}; PL.lastS=n?rel[n-1]:0; PL.penEnd=n>1?rel[n-2]+V0.pieces[n-2].d:0;   /* [BGM_FIRST_1013] H = 실제 문 열림 자리 · H0 = 고른 자리 */
    var pre=H-V-P.breath;
    if(pre>=P.lead){ PL.tv=P.lead; PL.tm=0; PL.off=pre-P.lead; }
    else if(pre>=0){ PL.tv=pre; PL.tm=0; PL.off=0; }   /* 곡 앞부분이 짧아 음악이 목소리보다 조금만 먼저 깔린다 */
    else { PL.tv=0; PL.tm=-pre; PL.off=0; }   /* [LATE_MUSIC] 목소리가 곡 앞부분보다 길다 — 목소리가 먼저 · 음악은 뒤에 들어온다 */
    PL.th=PL.tv+V+P.breath; PL.tdip=PL.tv+PL.penEnd;
    var songEnd=PL.tm+((Sg.end!=null?Sg.end:Sg.dur)-PL.off);   /* [REC_CLIP_1013] 미리 듣기용 짧은 판이면 그 판의 끝(곡 시각)까지 */ PL.tend=Math.min(PL.th+after+OUTF,songEnd); if(PL.tend<PL.tv+V+0.2) PL.tend=Math.min(songEnd,PL.tv+V+0.2);
    return PL; }
  /* 음악 크기(dB) — 목소리 밑에 작게 깔렸다가 · 끝에서 두 번째 말이 끝나면 한 번 더 낮아지고 · 마지막 말 끝에서 0.3초에 걸쳐 크게 · after 초 머문 뒤 4초에 걸쳐 잦아든다 */
  function envDb(PL,x){ var P=SP, after=PL.after!=null?PL.after:P.after; if(x<PL.tm||x>PL.tend) return -120;
    var L1=P.under-P.build, Ld=P.under-P.dip, hr=Math.max(PL.tdip,PL.th-P.rise), dr=Math.max(0.05,Math.min(FADE_DN,hr-PL.tdip)), d;
    if(x<PL.tv){ var ds=Math.max(PL.tm,PL.tv-P.duck); d=x<ds?P.intro:lerp(P.intro,L1,(x-ds)/Math.max(0.01,PL.tv-ds)); }   /* [BGM_FIRST_1013] 멘트 앞은 들리게(intro) · 멘트 1.5초 전부터(SP.duck [ENTRY_BGM_1019] · 종전 0.5초) 목소리 밑 크기로 */
    else if(x<PL.tdip) d=lerp(L1,P.under,(x-PL.tv)/Math.max(0.01,PL.tdip-PL.tv));
    else if(x<PL.tdip+dr) d=lerp(PL.n>1?P.under:L1,Ld,(x-PL.tdip)/dr);
    else if(x<hr) d=Ld;
    else if(x<PL.th) d=lerp(Ld,0,(x-hr)/Math.max(0.01,PL.th-hr));
    else if(x<PL.th+after) d=0;
    else d=lerp(0,-80,(x-PL.th-after)/OUTF);
    return d+BED_TRIM; }
  function envGain(PL,x){ var g=db2g(envDb(PL,x)), u=(x-PL.tm)/Math.max(0.05,SP.fade); if(u<1) g*=u<=0?0:u*u; return g; }   /* 처음 SP.fade(6초 [ENTRY_BGM_1019] · 종전 2.5초 [SOFT_START_1013] · 1.2초 [BGM_FIRST_1013] · 그 전 5초)는 0 에서 */
  function fadeCurve(lv,F){ var n=Math.max(2,Math.ceil(F*200)+1), c=new Float32Array(n); for(var i=0;i<n;i++){ var u=i/(n-1); c[i]=lv*u*u; } return c; }   /* [SOFT_START_1013] 미리 듣기 첫소리 — 장면 처음(envGain)과 같은 u² 로 0 → lv · 길이는 PREV_FADE 2.5초([ENTRY_BGM_1019] 장면만 6초) */
  function envCurve(PL,x0,x1){ var n=Math.max(2,Math.ceil((x1-x0)*200)+1), c=new Float32Array(n); for(var i=0;i<n;i++) c[i]=envGain(PL,x0+(x1-x0)*i/(n-1)); return c; }
  window.EntryScene={SP:SP,PREV_FADE:PREV_FADE,FADE_DN:FADE_DN,OUTF:OUTF,LATE_T:LATE_T,VOICE_LUFS:VOICE_LUFS,SONG_LUFS:SONG_LUFS,BED_TRIM:BED_TRIM,PRE_ROLL:PRE_ROLL,fadeCurve:fadeCurve,
    clamp:clamp,db2g:db2g,lerp:lerp,mono:mono,lufsOf:lufsOf,peakOf:peakOf,sentN:sentN,edgeTrimIdx:edgeTrimIdx,sentSplit:sentSplit,
    prepVoice:prepVoice,prepSong:prepSong,pickHook:pickHook,plan:plan,envDb:envDb,envGain:envGain,envCurve:envCurve,voiceSegs:voiceSegs,voiceStart:voiceStart};
})();
