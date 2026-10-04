/* ★★[REC_SHARED 2026-09-28 코워크 0928 6-3 · 6-7] 두 분 목소리 다듬기 — 한 원천.
   식순 빌더(order-preview.html · 두 분이 녹음 · 올리기)와 관리 화면(admin.html · 스튜디오 대신 올리기)이 **같은 다듬기**를 거치게 여기 한 벌만 둔다.
   사본을 만들지 말 것 — 두 벌이면 한쪽만 고쳐져 스튜디오가 올린 줄만 소리 크기가 다르게 나간다.
   window.RecProcess = { process(arrayBuffer, needSec) → Promise<{wav, dur, warn, noisy}>, wav(float32, sr) → Blob, lufs(float32, sr), LUFS, SR } */
(function(){
function fmt(s){ s=Math.max(0,Math.round(s)); return Math.floor(s/60)+':'+('0'+(s%60)).slice(-2); }
/* ★★[REC_TRIM 2026-09-28 코워크 0928 6-3] 다듬기 — 모노 → 80Hz 고역 통과(두 번) → 잡음 재기(목소리와 주변 소리 차이 · 20dB 넘으면 괜찮음) → 앞뒤 빈소리 자르기(0.15초 남김)
   → 소리 크기를 나레이션에 맞춤(LUFS · BS.1770 · 목표 REC_LUFS · 봉우리 -1dB 아래) → 24kHz 16bit 모노 WAV.
   ★나레이션 실측(2026-09-28 · 나레이션 40개 · 브라우저 디코드 + 같은 식) = 중간값 -16.2 LUFS · 봉우리 -1.7dB → 목표 -16 LUFS(GAS VOICE_TARGET_LUFS 기본값과 같다)
   ★원신호의 아주 낮은 소리(직류 치우침 · 팬 · 전기 웅웅거림)를 «시끄러움»으로 보이지 않게 — 고역 통과 뒤에 잰다(데모 «-39dB» 오진) */
var REC_LUFS=-16, REC_PEAK_LIM=-1, REC_SR=24000, REC_QUIET_DB=-54;   /* [REC_LEVEL] · [REC_LEVEL_IOS] 말소리 RMS 가 이 아래면 «작아요» */
/* ★[REC_LEVEL 2026-10-04] 녹음 막대 — RMS 를 dBFS 로 바꿔 -55dB = 0% · -15dB = 100% 로 펼친다(종전: 봉우리 × 1.4 직선 → 보통 목소리 -35dB 가 막대 2% 였다).
   -55 = 조용한 방 바닥 소리쯤(막대가 비어 보인다) · -35 = 휴대폰 20~30cm 보통 목소리(막대 절반) · -15 = 아주 가깝거나 큰 소리(가득).
   올라갈 때는 빠르게(0.6) ·내려갈 때는 천천히(0.15) — 낱말 사이에서 막대가 깜빡이지 않는다 */
/* ★★[REC_LEVEL_IOS 2026-10-04 사장님 «여전히 소리가 작다고 하고 막대가 10~20% 에서 논다»] 아이폰 사파리는 자동 크기 맞춤을 거의 안 해 한 뼘 보통 목소리가 RMS -47 ~ -51 dBFS 로 들어온다(막대 10~20% 를 거꾸로 풀면 이 값).
   그래서 막대를 -62 ~ -32 로 옮기고(보통 목소리 ≈ 40~50%) · «작아요»는 -54 아래만(정말 멀거나 속삭일 때) · 키움 상한 30배 → 80배(+38dB). 잡음은 따로 잰다(목소리와 주변 소리 차이 20dB) — 키워서 잡음이 커지면 그쪽 알림이 뜬다 */
var REC_METER_LO=-62, REC_METER_HI=-32;
function _recMeter(rms,prev){ var d=20*Math.log(Math.max(rms,1e-9))/Math.LN10, v=Math.max(0,Math.min(1,(d-REC_METER_LO)/(REC_METER_HI-REC_METER_LO))), p=prev||0; return v>p?p+(v-p)*0.6:p+(v-p)*0.15; }
function _bqHp(x,sr,f){ var w=2*Math.PI*f/sr, c=Math.cos(w), al=Math.sin(w)/(2*0.7071), a0=1+al, b0=(1+c)/2/a0, b1=-(1+c)/a0, b2=b0, a1=-2*c/a0, a2=(1-al)/a0, y=new Float32Array(x.length), x1=0,x2=0,y1=0,y2=0;
  for(var i=0;i<x.length;i++){ var v=b0*x[i]+b1*x1+b2*x2-a1*y1-a2*y2; x2=x1; x1=x[i]; y2=y1; y1=v; y[i]=v; } return y; }
function _bq(x,b,a){ var y=new Float32Array(x.length), x1=0,x2=0,y1=0,y2=0; for(var i=0;i<x.length;i++){ var v=b[0]*x[i]+b[1]*x1+b[2]*x2-a[1]*y1-a[2]*y2; x2=x1; x1=x[i]; y2=y1; y1=v; y[i]=v; } return y; }
function _lufs(x,sr){   // BS.1770-4 통합 소리 크기(모노) — K 가중(두 필터) · 400ms 블록 75% 겹침 · 절대 -70 · 상대 -10 문턱
  var f0=1681.974450955533, G=3.999843853973347, Q=0.7071752369554196, K=Math.tan(Math.PI*f0/sr), Vh=Math.pow(10,G/20), Vb=Math.pow(Vh,0.4996667741545416), a0=1+K/Q+K*K;
  var y=_bq(x,[(Vh+Vb*K/Q+K*K)/a0,2*(K*K-Vh)/a0,(Vh-Vb*K/Q+K*K)/a0],[1,2*(K*K-1)/a0,(1-K/Q+K*K)/a0]);
  var f1=38.13547087602444, Q1=0.5003270373238773, K1=Math.tan(Math.PI*f1/sr), d1=1+K1/Q1+K1*K1; y=_bq(y,[1,-2,1],[1,2*(K1*K1-1)/d1,(1-K1/Q1+K1*K1)/d1]);
  var bl=Math.round(0.4*sr), hop=Math.round(0.1*sr), z=[]; for(var s=0;s+bl<=y.length;s+=hop){ var q=0; for(var i=s;i<s+bl;i++) q+=y[i]*y[i]; z.push(q/bl); }
  var L=function(m){ return -0.691+10*Math.log(Math.max(m,1e-12))/Math.LN10; }, ab=z.filter(function(m){ return L(m)>-70; }); if(!ab.length) return -70;
  var m1=ab.reduce(function(a,b){ return a+b; },0)/ab.length, g=ab.filter(function(m){ return L(m)>L(m1)-10; }); return L(g.reduce(function(a,b){ return a+b; },0)/g.length); }
function _recProcess(ab,needSec){ var AC=window.AudioContext||window.webkitAudioContext, ac=new AC();
  return new Promise(function(ok,no){ try{ var p=ac.decodeAudioData(ab,ok,no); if(p&&p.then) p.then(ok,no); }catch(e){ no(e); } }).then(function(buf){ try{ ac.close(); }catch(e){}
    var sr=buf.sampleRate, n=buf.length, ch=buf.numberOfChannels, x=new Float32Array(n);
    for(var c=0;c<ch;c++){ var d=buf.getChannelData(c); for(var i=0;i<n;i++) x[i]+=d[i]/ch; }
    var clip=0; for(var i0=0;i0<n;i0++){ if(Math.abs(x[i0])>=0.985) clip++; }   // 찢어짐은 원신호에서
    x=_bqHp(_bqHp(x,sr,80),sr,80);   // [REC_TRIM] 80Hz 고역 통과 두 번
    var peak=0; for(var i=0;i<n;i++){ var a=Math.abs(x[i]); if(a>peak) peak=a; }
    var fr=Math.max(1,Math.round(sr*0.02)), nf=Math.floor(n/fr), rms=[]; for(var f=0;f<nf;f++){ var q=0; for(var j=f*fr;j<(f+1)*fr;j++) q+=x[j]*x[j]; rms.push(Math.sqrt(q/fr)); }
    var db=function(v){ return 20*Math.log(Math.max(v,1e-9))/Math.LN10; }, sorted=rms.slice().sort(function(a,b){ return a-b; }), floor=sorted[Math.floor(sorted.length*0.1)]||1e-6;
    var thr=Math.max(Math.pow(10,-48/20),floor*3.2), first=-1, last=-1; for(var f2=0;f2<nf;f2++){ if(rms[f2]>thr){ if(first<0) first=f2; last=f2; } }
    /* ★★[REC_LEVEL 2026-10-04 사장님 «한 뼘 떨어져 읽으면 막대가 거의 안 움직이고 소리가 너무 작다고 나온다»] «작아요»는 말소리 부분의 RMS 로 잰다(종전: 전체 봉우리 < -35dB).
       봉우리는 잡음 한 번 · 숨소리 한 번에 흔들리고, 쉬는 구간이 섞인 평균은 말이 또렷해도 낮게 나온다 — 말하는 프레임(문턱 위)만 모아 RMS.
       문턱 REC_QUIET_DB = -42 dBFS: 휴대폰 20~30cm 보통 목소리 ≈ -35 dBFS RMS(자동 크기 맞춤을 켜면 -28 ~ -22) · 그보다 7dB(소리 세기 절반쯤) 아래부터 알린다.
       -42 아래는 나레이션 크기(-16 LUFS)로 올리려면 +26dB 넘게 키워야 해(키움 상한 30배 ≈ +29.5dB) 방 잡음도 같이 커진다. 시험: rec-level.mjs(-20 · -30 · -45 dBFS)
       알림은 «무엇이 · 어떻게» 두 줄(\n 으로 나눈다 · [REC_WARN2]) — 식순 창은 두 줄로, 관리 화면은 줄바꿈으로 그대로 읽는다 */
    var warn=[], noisy=false;
    var sp=0, cnt=0; for(var f3=Math.max(0,first);f3<=(first<0?-1:last);f3++){ if(rms[f3]>thr){ sp+=rms[f3]*rms[f3]; cnt++; } } var speech=cnt?Math.sqrt(sp/cnt):1e-4;
    if(first<0||db(speech)<REC_QUIET_DB) warn.push('소리가 작게 녹음됐어요\n휴대폰을 조금 더 가까이 두고 다시 해 보세요');
    if(first<0){ first=0; last=nf-1; }
    if(clip>n*0.0005) warn.push('소리가 찢어졌어요\n휴대폰을 조금 멀리 두고 다시 해 보세요');
    if(db(speech)-db(floor)<20){ noisy=true; warn.push('주변 소리가 목소리에 비해 커요\n조용한 곳에서 다시 해 보세요'); }   // [REC_TRIM] 목소리와 주변 소리 차이 20dB 아래
    var pad=Math.round(sr*0.15), a0=Math.max(0,first*fr-pad), a1=Math.min(n,(last+1)*fr+pad), y=x.subarray(a0,a1);
    var lu=_lufs(y,sr), gain=Math.pow(10,(REC_LUFS-lu)/20), pk=0; for(var i2=0;i2<y.length;i2++){ var a2=Math.abs(y[i2]); if(a2>pk) pk=a2; }
    var lim=Math.pow(10,REC_PEAK_LIM/20); if(pk*gain>lim) gain=lim/Math.max(pk,1e-9); gain=Math.min(gain,80);   // [REC_TRIM] · [REC_LEVEL_IOS] 30 → 80 LUFS 로 맞추고 봉우리 -1dB 아래
    var dur=y.length/sr;
    if(needSec){ if(dur>needSec*2) warn.push('많이 길어요\n조금 빠르게 다시 녹음해 보세요'); else if(dur>needSec*1.2) warn.push('알맞은 길이(약 '+fmt(needSec)+')보다 조금 길어요\n그대로 써도 돼요'); if(dur<needSec*0.5) warn.push('조금 짧아요\n끝까지 읽었는지 들어 보세요'); }   // [REC_WARN2]
    var outN=Math.round(y.length*REC_SR/sr), oc=new (window.OfflineAudioContext||window.webkitOfflineAudioContext)(1,Math.max(1,outN),REC_SR), ib=oc.createBuffer(1,y.length,sr);
    var yy=new Float32Array(y.length); for(var i3=0;i3<y.length;i3++) yy[i3]=y[i3]*gain; ib.getChannelData(0).set(yy);
    var so=oc.createBufferSource(); so.buffer=ib; so.connect(oc.destination); so.start(0);
    return oc.startRendering().then(function(rb){ return {wav:_recWav(rb.getChannelData(0),REC_SR),dur:dur,warn:warn,noisy:noisy}; }); }); }
function _recWav(f,sr){ var n=f.length, b=new ArrayBuffer(44+n*2), v=new DataView(b), w=function(o,s){ for(var i=0;i<s.length;i++) v.setUint8(o+i,s.charCodeAt(i)); };
  w(0,'RIFF'); v.setUint32(4,36+n*2,true); w(8,'WAVE'); w(12,'fmt '); v.setUint32(16,16,true); v.setUint16(20,1,true); v.setUint16(22,1,true); v.setUint32(24,sr,true); v.setUint32(28,sr*2,true); v.setUint16(32,2,true); v.setUint16(34,16,true); w(36,'data'); v.setUint32(40,n*2,true);
  for(var i=0;i<n;i++){ var s2=Math.max(-1,Math.min(1,f[i])); v.setInt16(44+i*2,s2<0?s2*0x8000:s2*0x7FFF,true); } return new Blob([b],{type:'audio/wav'}); }
window.RecProcess={ process:_recProcess, wav:_recWav, lufs:_lufs, meter:_recMeter, LUFS:REC_LUFS, SR:REC_SR, QUIET_DB:REC_QUIET_DB };   /* [REC_LEVEL] meter · QUIET_DB */
})();
