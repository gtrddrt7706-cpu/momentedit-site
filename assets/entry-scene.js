/* ★★[ENTRY_SCENE_ENGINE 2026-10-12 사장님 «일단 전부 올려»] 입장 «음악과 함께» 계산 한 곳 — 식순 화면(entry-music.js)과 당일 콘솔(console.html)이 같은 식을 쓴다.
   기획안 «6. 당일 콘솔 · 콘솔이 같은 계산으로 음악 시작 지점 · 페이드인 · 하이라이트를 맞춘다» — 두 곳에 따로 적으면 고객이 미리 들은 장면과 당일 장면이 갈라진다.
   화면 · 빌더 전역에 기대지 않는 순수 계산만 둔다(소리 크기 · 문장 나누기 · 말끝 빈소리 걷기 · 장면 짜기 · 음량 곡선). 값은 시험실 v50 그대로(DEF_P · CUE.fadeDownMs · OUTF · LATE_T · VOICE_LUFS).
   ★여기 값을 바꾸면 식순 화면 미리 듣기와 당일 콘솔이 함께 바뀐다 — 그게 이 파일이 있는 까닭이다. */
(function(){
  'use strict';
  var SP={lead:4,fade:5,under:-12,build:3,dip:4,breath:0.3,rise:0.3,after:20}, FADE_DN=0.4, OUTF=4, LATE_T=0.3, VOICE_LUFS=-16, SONG_LUFS=-12, BED_TRIM=-6;
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
  function prepVoice(b,n,nar){ var x=mono(b), sr=b.sampleRate, L=lufsOf(x,sr), pk=peakOf(x), g=Math.min(db2g(VOICE_LUFS-L),0.95/Math.max(pk,1e-4)), segs=sentSplit(x,sr,nar?n+1:n);
    if(nar&&segs.length===n+1&&segs.length>1){ var z=segs.pop(); segs[segs.length-1]=[segs[segs.length-1][0],z[1]]; }
    if(segs.length){ var l=segs[segs.length-1]; l[1]=edgeTrimIdx(x,l[0],l[1],sr,'end')[1]; }
    var ps=segs.map(function(sg){ return {a:sg[0]/sr,d:(sg[1]-sg[0])/sr}; }), gaps=[]; for(var i=0;i<ps.length-1;i++) gaps.push(Math.max(0,ps[i+1].a-(ps[i].a+ps[i].d)));
    return {buf:b,gain:g,pieces:ps,gaps:gaps}; }
  /* 곡 — 크기(SONG_LUFS · 봉우리 여유 6dB) */
  function prepSong(buf){ var x=mono(buf), sr=buf.sampleRate, L=lufsOf(x,sr), pk=peakOf(x), g=Math.min(db2g(SONG_LUFS-L),0.98/Math.max(pk,1e-4)*db2g(6));
    return {buf:buf,sr:sr,dur:buf.duration,gain:g,lufs:L,x:x}; }
  /* 장면 짜기 — 마지막 말 끝 + 숨 = 하이라이트. 거기서 거꾸로 곡 시작점을 정한다(시험실 plan · new 그대로)
     opts.after — 하이라이트 뒤 크게 머무는 초(식순 화면 20초 · 당일 콘솔은 디렉터가 다음을 누를 때까지라 곡 끝까지) */
  function plan(V0,Sg,H,opts){ var P=SP, rel=[], t=0, after=(opts&&opts.after!=null)?opts.after:P.after; V0.pieces.forEach(function(p,i){ rel.push(t); t+=p.d; if(i<V0.gaps.length) t+=V0.gaps[i]; });
    var n=V0.pieces.length, V=t, PL={V:V,rel:rel,n:n,H:H,Sg:Sg,after:after}; PL.lastS=n?rel[n-1]:0; PL.penEnd=n>1?rel[n-2]+V0.pieces[n-2].d:0;
    var pre=H-V-P.breath;
    if(pre>=P.lead){ PL.tv=P.lead; PL.tm=0; PL.off=pre-P.lead; }
    else if(pre>=0){ PL.tv=pre; PL.tm=0; PL.off=0; }   /* 곡 앞부분이 짧아 음악이 목소리보다 조금만 먼저 깔린다 */
    else { PL.tv=0; PL.tm=-pre; PL.off=0; }   /* [LATE_MUSIC] 목소리가 곡 앞부분보다 길다 — 목소리가 먼저 · 음악은 뒤에 들어온다 */
    PL.th=PL.tv+V+P.breath; PL.tdip=PL.tv+PL.penEnd;
    var songEnd=PL.tm+(Sg.dur-PL.off); PL.tend=Math.min(PL.th+after+OUTF,songEnd); if(PL.tend<PL.tv+V+0.2) PL.tend=Math.min(songEnd,PL.tv+V+0.2);
    return PL; }
  /* 음악 크기(dB) — 목소리 밑에 작게 깔렸다가 · 끝에서 두 번째 말이 끝나면 한 번 더 낮아지고 · 마지막 말 끝에서 0.3초에 걸쳐 크게 · after 초 머문 뒤 4초에 걸쳐 잦아든다 */
  function envDb(PL,x){ var P=SP, after=PL.after!=null?PL.after:P.after; if(x<PL.tm||x>PL.tend) return -120;
    var L1=P.under-P.build, Ld=P.under-P.dip, hr=Math.max(PL.tdip,PL.th-P.rise), dr=Math.max(0.05,Math.min(FADE_DN,hr-PL.tdip)), d;
    if(x<PL.tv) d=L1;
    else if(x<PL.tdip) d=lerp(L1,P.under,(x-PL.tv)/Math.max(0.01,PL.tdip-PL.tv));
    else if(x<PL.tdip+dr) d=lerp(PL.n>1?P.under:L1,Ld,(x-PL.tdip)/dr);
    else if(x<hr) d=Ld;
    else if(x<PL.th) d=lerp(Ld,0,(x-hr)/Math.max(0.01,PL.th-hr));
    else if(x<PL.th+after) d=0;
    else d=lerp(0,-80,(x-PL.th-after)/OUTF);
    return d+BED_TRIM; }
  function envGain(PL,x){ var g=db2g(envDb(PL,x)), u=(x-PL.tm)/Math.max(0.05,SP.fade); if(u<1) g*=u<=0?0:u*u; return g; }   /* 처음 5초는 0 에서 천천히 */
  function envCurve(PL,x0,x1){ var n=Math.max(2,Math.ceil((x1-x0)*200)+1), c=new Float32Array(n); for(var i=0;i<n;i++) c[i]=envGain(PL,x0+(x1-x0)*i/(n-1)); return c; }
  window.EntryScene={SP:SP,FADE_DN:FADE_DN,OUTF:OUTF,LATE_T:LATE_T,VOICE_LUFS:VOICE_LUFS,SONG_LUFS:SONG_LUFS,BED_TRIM:BED_TRIM,
    clamp:clamp,db2g:db2g,lerp:lerp,mono:mono,lufsOf:lufsOf,peakOf:peakOf,sentN:sentN,edgeTrimIdx:edgeTrimIdx,sentSplit:sentSplit,
    prepVoice:prepVoice,prepSong:prepSong,plan:plan,envDb:envDb,envGain:envGain,envCurve:envCurve};
})();
