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
     가사가 있는 곡(vocal) = (★[SONG_ROW_PLAIN_1101] 곡 이름 옆 «노래»는 뺐다) 고르면 아래 한 줄 «가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요» · 깔릴 때 나레이션 · 사람 구간 vocalExtra(−6) ·
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
  function toast1(t){ try{ if(typeof _noteToast==='function'){ _noteToast(t); return; } }catch(x){} try{ if(typeof toast==='function') toast(t,3000); }catch(x){} }
  function PR(){ var p={}; try{ p=(window.ENG&&ENG.RitualCue&&ENG.RitualCue.PARAM)||{}; }catch(x){}
    var dk=p.duck||{}; return { speech:num(p.duckSpeech,-16), music:num(p.duckMusic,-8), toast:num(p.toastLevel,0), toastUp:num(p.toastUpMs,600),
      down:num(dk.downMs,num(p.fadeDownMs,400)), up:num(dk.upMs,num(p.fadeUpMs,1200)), lead:num(dk.leadMs,800), voc:num(p.vocalExtra,-6), trim:num(p.musicTrim,-3.1), song:num(p.songGain,7) }; }
  function num(v,d){ return (typeof v==='number'&&isFinite(v))?v:d; }
  function gainOf(db){ var p=PR(); return db<=-80?0.00003:Math.pow(10,(db+p.trim+p.song)/20); }   /* [BGM_FIX_1030] 음악 전체 크기(musicTrim) · [LISTEN_LOOK_LEVEL_1101 ②] 곡 보정(songGain +7 · 곡 −23 LUFS → 나레이션 −16 기준) */
  /* [LISTEN_LOOK_LEVEL_1101 ②] 음악 버스 끝 리미터 — 곡 카드와 같은 값(−1 dB · 20:1 · 2ms · 150ms) · 이 순간 전체 듣기 곡이 모두 이 길로 */
  var BUS=null;
  /* ★★[BGM_TIMING2_1101] 피크 ≤ −1 dBTP — 리미터(압축기)만으로는 못 막았다(OfflineAudioContext 4배 오버샘플 실측 · 축배 0 dB 진입 · −2 dBTP 곡 + 3.9 dB = 피아노 +0.35 · 북 +1.07 dBTP · 크롬 압축기는 자동 보정 이득이 붙고 순간 피크를 놓친다)
       → 압축기 뒤에 천장(WaveShaper · 4배 오버샘플 · −2.5 dBFS · 무릎 −3.9 dBFS 아래는 그대로 · 위는 부드럽게 · 실측 북 −1.29 · 피아노 −2.45 · 큰 마스터 −2.32 dBTP) · 말 아래(−16) · 큐 사이(−8) 크기는 천장에 닿지 않는다(곡 −2 dBTP + 순 −4.1 dB = −6.1) · 곡 카드(+7 dB)도 같은 길 */
  var CEIL_DB=-2.5;
  function mkBus(a){ var lim=a.createDynamicsCompressor(); lim.threshold.value=-1; lim.ratio.value=20; lim.attack.value=0.002; lim.release.value=0.15; lim.knee.value=0;
    var w=null; try{ w=a.createWaveShaper(); var n=4097, cv=new Float32Array(n), C=Math.pow(10,CEIL_DB/20), K=C*0.85; for(var i=0;i<n;i++){ var x=i/(n-1)*2-1, ax=Math.abs(x); cv[i]=(x<0?-1:1)*(ax<=K?ax:K+(C-K)*Math.tanh((ax-K)/(C-K))); } w.curve=cv; w.oversample='4x'; w.connect(a.destination); }catch(x){ w=null; }
    lim.connect(w||a.destination); lim._ceil=w; return lim; }   /* 들어가는 곳 = 압축기 · 그 뒤 천장 → 스피커 */
  function bus(a){ if(BUS&&BUS.a===a) return BUS.n; try{ var l=mkBus(a); BUS={ a:a, n:l }; return l; }catch(x){ return a.destination; } }
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
  /* ★[GHIBLI_ADD_1101] 실제로 깔 곡 — 고른 곡(없으면 1순위)의 파일이 드라이브에 아직 없으면 그 구간 목록(고객이 보는 곡만 · fill 아님)에서 파일이 있는 다음 곡 · 콘솔 segPlan 과 같은 차례(BgmPicks.order) ·
       곡 줄 · 접힌 줄에는 원래 곡 이름 그대로(이 함수는 소리만 정한다) */
  function effHas(sg){ var f=eff(sg); if(has(f)) return f; var L=P.PICKS[sg]||[], o=(P.order?P.order(St(),sg):L).filter(function(x){ return L.indexOf(x)>-1; }), i=o.indexOf(f), c=i<0?o:o.slice(i+1).concat(o.slice(0,i));
    for(var j=0;j<c.length;j++){ if(has(c[j])) return c[j]; } return ''; }
  function bedOn(id){ var S=St(); return !!(S.bgm&&S.bgm[id]&&S.bgm[id].m==='bed'); }
  /* 이 순간에 흐르는 구간 — 당일 콘솔 segOfCue 와 같은 갈래(입장 · 맞절 = 입장 곡 · 식전 영상 · 축가 = 자체 소리 · 없음) */
  function segAt(k){
    if(k==='guest') return 'M1'; if(k==='candle') return 'M2';
    if(k==='free') return bedOn('S5')?'M4S5':'M4';   /* ★[NO_SWAP_SONG_1031 식순 걷기 3라운드 2] «음악과 함께»로 고른 곡을 들을 수 없으면 다른 본식 곡으로 바꿔 틀지 않는다 — songAt 이 비어 나레이션만 */
    if(k==='letter') return bedOn('S6')?'M4S6':'M4';
    if(/^(welcome|vow|ring|declare|bless)$/.test(k)) return 'M4';
    if(k==='song') return 'M4';   /* ★[BGM_TIMING2_1101] 축가 순간은 M4 로 못 박는다(앞 곡 잇기면 축사 곡 M4S5 가 축가 여는 말 · 맺는 말에 샜다 · 콘솔 segOfCue 와 같게) */
    if(k==='tribute') return 'M5'; if(k==='_close') return 'M6'; if(k==='toast') return 'M7'; if(k==='table') return 'M8';
    return ''; }
  function songAt(k){ if(k==='matjeol'||(k==='entry'&&entMulti())) return entOn()?ENT_F:''; var sg=segAt(k); if(!sg) return ''; return effHas(sg); }
  /* ★★[ENTRY_CARRY_1101 사장님 «진행»] 입장 곡 이어 듣기 — 맞절 «이 순간 전체 듣기»(늘) · 입장(여러 순간을 이어 들을 때만 · 혼자 들을 때는 입장 장면 EntryMusic 이 맡는다)에
       두 분이 고른 입장 곡(EntryMusic.carry)을 '@ENT' 한 파일로 깐다 · 크기는 입장 엔진 체계(곡 −12 LUFS · intro · under · BED_TRIM) — 구간 곡 보정(+7)은 걸지 않는다(gf) ·
       맞절은 «도착»(문 열림 + 60초 = 장면 끝)부터 · 짧은 판이 거기까지 못 담으면 판 안에서 25초가 남는 가장 늦은 자리 · 이어 듣기 입장 → 맞절은 같은 소리 그대로(다시 시작 없음) ·
       입장 곡을 안 골랐으면 '' (나레이션만 · 맞절 흐름 줄 아래 «입장 곡을 고르시면 함께 들려요») */
  var ENT_F='@ENT', ENT={ sig:'' }, ENT_NEED=25;
  function entOn(){ try{ if(!emb()||!window.EntryMusic||!EntryMusic.carryHas||!EntryMusic.carryHas()) return false; var sg=EntryMusic.carrySig(); if(ENT.sig&&ENT.sig!==sg){ var o=BUF[ENT_F]; if(o&&o.st!=='wait') delete BUF[ENT_F]; } ENT.sig=sg; return true; }catch(x){ return false; } }
  function entMulti(){ try{ return typeof LP!=='undefined'&&!!LP.range&&!!LP.range.ks&&LP.range.ks.length>1; }catch(x){ return false; } }
  function entWant(cb){ var o=BUF[ENT_F]; if(o&&o.st==='ok'){ if(cb) cb(o.b); return; } if(o&&o.st==='wait'){ if(cb) o.cb.push(cb); return; }
    o=BUF[ENT_F]={ st:'wait', b:null, cb:cb?[cb]:[] };
    var fin=function(x){ if(BUF[ENT_F]!==o) return; o.st=x?'ok':'fail'; o.b=x?x.buf:null; o.ext=x||null; o.used=Date.now(); if(!x) delete BUF[ENT_F]; var cs=o.cb; o.cb=[]; cs.forEach(function(c){ try{ c(o.b); }catch(e2){} }); if(x) prune(); };   /* [BED_LOAD_1101 ④] 입장 곡도 셋 안에 센다 */
    try{ EntryMusic.carry().then(fin,function(){ fin(null); }); }catch(x){ fin(null); } }
  /* 입장 곡 크기 — 말 아래(under) · 큐 사이(intro) · 크게(0 · 축배와 같은 크기 자리) 에 BED_TRIM · 곡 gain(−12 LUFS) */
  function entGf(x){ return function(db){ if(db<=-80) return 0.00003; var d=db>=-0.5?0:(db>=PR().music-0.5?x.intro:x.under); return x.gain*Math.pow(10,(d+x.trim)/20); }; }
  /* 곡 판 안의 시작 자리(초) — 입장(이어 듣기) = 문 열림에 멘트 끝이 닿게(뜸 6초 + 멘트 + 숨 0.3초 앞) · 맞절 = 도착(H + 60) */
  function entAt(k){ var o=BUF[ENT_F], x=o&&o.ext; if(!x) return 0; var t;
    if(k==='entry') t=x.H-6-(x.V!=null?x.V:15)-0.3; else { t=x.arrive; if(t+ENT_NEED>x.end) t=x.end-ENT_NEED; }
    t=Math.max(x.o,Math.min(t,x.end-1)); return t-x.o; }
  function atOf(f,st){ if(BED.cur.f===f&&BED.cur.src) return 0; if(f===ENT_F) return entAt(st&&st.k); return LPB.keep[f]!=null?LPB.keep[f]:0; }

  /* ── 있는 곡(드라이브 목록) · 곡 받기 — 마이페이지 안에서만 ── */
  var AV={ st:'', set:{}, t:null };
  function has(f){ return !!f&&AV.st==='ok'&&!!AV.set[f]; }
  function list(){ if(!emb()||AV.st==='wait'||AV.st==='ok') return; AV.st='wait';
    AV.t=setTimeout(function(){ if(AV.st==='wait'){ AV.st='fail'; repaint(); } },60000);
    if(!post('momentedit:ritualFileGet',{key:'bed',id:'list'})){ clearTimeout(AV.t); AV.st='fail'; } }
  var BUF={};   // 곡 번호 → { st:'wait'|'ok'|'fail', b:AudioBuffer, cb:[] }
  function want(f,cb){ if(!f||!emb()){ if(cb) cb(null); return; } if(f===ENT_F){ entWant(cb); return; } var o=BUF[f];
    if(o&&o.st==='ok'){ o.used=Date.now(); if(cb) cb(o.b); return; } if(o&&o.st==='wait'){ if(cb) o.cb.push(cb); return; }
    o=BUF[f]={ st:'wait', b:null, cb:cb?[cb]:[] }; o.t=setTimeout(function(){ if(o.st==='wait') done(f,null,'L5'); },90000);
    if(!post('momentedit:ritualFileGet',{key:'bed',id:f})) done(f,null,'L6'); }
  function done(f,b,ec){ var o=BUF[f]; if(!o) return; clearTimeout(o.t); o.st=b?'ok':'fail'; o.b=b; o.used=Date.now(); if(!b){ delete BUF[f]; LPB.err=LPB.err||{}; LPB.err[f]=ec||'L4'; } var cs=o.cb; o.cb=[]; cs.forEach(function(c){ try{ c(b,ec||(b?'':'L4')); }catch(x){} }); if(b) prune(); }
  /* ★[BED_LOAD_1101 ④] 풀어 둔 곡(AudioBuffer · 2.5MB 곡 하나가 약 60MB)은 셋까지만 — 아이폰은 넘치면 디코딩이 조용히 실패한다 · 지금 흐르는 곡 · 받는 곡 · 지금 줄 곡 · 다음 순간 곡 · 곡 카드는 지우지 않는다 · 입장 곡(@ENT)도 센다 · 다시 필요하면 다시 받는다 */
  var BUF_MAX=3;
  function keepSet(){ var k={}; [BED.cur&&BED.cur.f, LPB.f, LPB.pend, CARD.f, PF.busy].forEach(function(f){ if(f) k[f]=1; }); var st=curStep();
    if(st){ try{ var f1=fileFor(st); if(f1) k[f1]=1; var nk=nextK(st.k), f2=nk?songAt(nk):''; if(f2) k[f2]=1; }catch(x){} } return k; }
  function prune(){ var ks=Object.keys(BUF).filter(function(f){ var o=BUF[f]; return o&&o.st==='ok'&&o.b; }); if(ks.length<=BUF_MAX) return; var keep=keepSet(), n=ks.length;
    ks.sort(function(a,b){ return (BUF[a].used||0)-(BUF[b].used||0); }); for(var i=0;i<ks.length&&n>BUF_MAX;i++){ if(keep[ks[i]]) continue; delete BUF[ks[i]]; n--; } }   /* ec = 못 받은 까닭 코드(서버 · 연결) */
  window.addEventListener('message',function(ev){ var d=ev&&ev.data; if(!d||ev.origin!==window.location.origin||d.type!=='momentedit:ritualFileData'||d.key!=='bed') return;
    if(d.id==='list'){ clearTimeout(AV.t); if(d.ok&&Array.isArray(d.songs)){ AV.set={}; d.songs.forEach(function(x){ var f=x&&String(x.f||'').toUpperCase(); if(f) AV.set[f]=1; }); AV.st='ok'; if(MW.after) warmK(MW.after); } else AV.st='fail'; repaint(); return; }
    var f=String(d.id||'').toUpperCase(); if(!BUF[f]) return;
    if(!d.ok||!d.data){ var m=/\(코드 ([A-Z]\d)/.exec(String(d.error||'')); done(f,null,d.ecode||(m&&m[1])||'L4'); return; }
    var ac=ctx(); if(!ac){ done(f,null,'M6'); return; }
    try{ var bin=atob(d.data), n=bin.length, u=new Uint8Array(n); for(var i=0;i<n;i++) u[i]=bin.charCodeAt(i);
      var p=ac.decodeAudioData(u.buffer,function(b){ done(f,b); },function(){ done(f,null,'M6'); }); if(p&&p.catch) p.catch(function(){}); }catch(x){ done(f,null,'M6'); } });   /* ★[BED_LOAD_1101 ③] 받았는데 못 풂 = M6(이 기기가 소리 파일을 열지 못했어요 · 형식이나 메모리) */

  /* ── 소리 — 곡 하나 · 크기 마디 하나(바꿀 때 3초 겹쳐 넘긴다) ── */
  var AC=null;
  /* ★[BED_LOAD_1101 사장님 «노래가 안 흐르는데?» · 아이폰] iOS 는 Web Audio 가 벨소리 무음 스위치를 따른다 — 나레이션(HTMLAudio)은 나오는데 곡만 안 나올 수 있다 · 소리 길을 열 때 재생 세션으로(iOS 17+ · 없으면 그대로) */
  function sess(){ try{ var s=navigator.audioSession; if(s&&s.type!=='playback') s.type='playback'; }catch(x){} }
  function ctx(){ if(AC) return AC; sess(); try{ var C=window.AudioContext||window.webkitAudioContext; if(C) AC=new C(); }catch(x){ AC=null; } return AC; }
  /* 탭 안에서 소리 문을 연다(아이폰 · 카톡) — 마이페이지 안에서만 */
  D.addEventListener('click',function(){ if(!emb()) return; var a=ctx(); try{ if(a&&a.state==='suspended') a.resume(); }catch(x){} },true);
  function Voice(){ return { src:null, g:null, f:'', t0:0, off:0, want:-90 }; }
  var BED={ cur:Voice(), who:'' };   // who = 'lp'(이 순간 전체 듣기) · 'card'(곡 카드 ▶)
  function ramp(v,db,ms){ var a=AC; if(!a||!v.g) return; v.want=db; var now=a.currentTime, g=v.g.gain; try{ g.cancelScheduledValues(now); g.setValueAtTime(Math.max(0.00003,g.value),now); g.linearRampToValueAtTime(v.gf?v.gf(db):gainOf(db),now+Math.max(0.05,ms/1000)); }catch(x){} }   /* [ENTRY_CARRY_1101] gf = 입장 곡 크기 체계 */
  function startVoice(f,db,fadeMs,at){ var a=ctx(), o=BUF[f]; if(!a||!o||!o.b) return null; var v=Voice();
    try{ v.src=a.createBufferSource(); v.src.buffer=o.b; v.src.loop=f!==ENT_F; if(f===ENT_F&&o.ext) v.gf=entGf(o.ext); v.g=a.createGain(); v.g.gain.value=0.00003; v.src.connect(v.g); v.g.connect(bus(a));
      var off=Math.max(0,Math.min(o.b.duration-0.5,at||0)); v.src.start(0,off); v.t0=a.currentTime; v.off=off; v.f=f; ramp(v,db,fadeMs); }catch(x){ return null; }
    return v; }
  function stopVoice(v,ms){ if(!v||!v.src) return; var a=AC, s=v.src, l=v.lim; if(v.solo&&a&&v.g){ try{ var n=a.currentTime, g=v.g.gain; g.cancelScheduledValues(n); g.setValueAtTime(Math.max(0.00003,g.value),n); g.linearRampToValueAtTime(0.00003,n+Math.max(0.05,ms/1000)); }catch(x){} v.want=-90; } else ramp(v,-90,ms); v.src=null; setTimeout(function(){ try{ s.onended=null; s.stop(); s.disconnect(); if(l){ l.disconnect(); if(l._ceil) l._ceil.disconnect(); } }catch(x){} },Math.max(60,ms)+120); }   /* [SONG_CARD_SOLO_1031] 카드 소리는 +7 dB 판(ramp 의 musicTrim 을 쓰지 않는다) */
  function posOf(v){ if(!AC||!v||!v.src||!v.src.buffer) return 0; var d=v.src.buffer.duration||1; return (v.off+(AC.currentTime-v.t0))%d; }
  /* 곡을 바꾼다 — 같은 곡이면 크기만 · 다르면 3초 겹쳐 넘긴다 · 처음이면 fade 에 걸쳐 올린다 */
  function play(f,db,fadeMs,at){ var c=BED.cur;
    if(c.src&&c.f===f){ ramp(c,db,fadeMs); return true; }
    var nv=startVoice(f,db,c.src?3000:fadeMs,at); if(!nv) return false;
    if(c.src) stopVoice(c,3000); BED.cur=nv; return true; }
  function hushAll(ms){ stopVoice(BED.cur,ms==null?600:ms); BED.cur=Voice(); BED.who=''; }

  /* ── 이 순간 전체 듣기 — 빌더 플레이어(LP)가 줄마다 부른다 ── */
  var LPB={ on:false, f:'', pend:'', cheer:false, keep:{}, lt:0 };   /* [BED_LOAD_1101] lt = 늦게 오는 곡 기다림 차례(0 에서 시작 · undefined 면 ++ 가 NaN) */
  function personal(st){ return !!(st&&(st.talk||st.talk2||st.skip||st.bridge||st.act)); }   /* [LISTEN_PACE_1031] 행동 줄(말없이 · act)도 사람 순간 — 큐 사이 크기(−8)로 살짝 올라온다(당일과 같은 엔진 값) */
  function lvOf(st,f){ var p=PR(), db; if(!st) db=p.music; else if(personal(st)) db=st.ldk!=null?st.ldk:p.music; else db=st.dk!=null?st.dk:p.speech; return vx(db,f!=null?f:BED.cur.f); }
  /* 줄이 시작될 때 — 그 순간 구간 곡(없으면 걷는다) · 그 줄 크기로 */
  /* [BGM_FIX_1030] 이 줄에 깔 곡 — 축배 «위하여» 전 · 닫는 인사 나레이션 줄은 앞 곡을 잇는다(없으면 축배는 닫는 인사 곡 · 닫는 인사는 없음) */
  /* ★[BGM_TIMING_1101] 축배만 따로 들을 때 뜸 곡 — END_FLOW_1030 뒤로 축배는 테이블 인사 다음 · 테이블 인사가 담겼으면 그 곡(M8) · 없으면 축배 바로 앞 순간의 곡(콘솔 segOfCue 주석과 같은 갈래 · 종전 닫는 인사 곡 M6) */
  function nextK(k){ var q=seq().filter(onOf), i=q.indexOf(k); return i>-1&&i+1<q.length?q[i+1]:''; }   /* [BGM_TIMING2_1101] 식순 차례상 다음 순간 */
  function toastBed(){ if(onOf('table')){ var f8=songAt('table'); if(f8) return f8; } var q=seq().filter(onOf), i=q.indexOf('toast');
    for(var j=(i>-1?i:q.length)-1;j>=0;j--){ if(q[j]==='toast') continue; var f=(q[j]==='letter'||q[j]==='free')?m4():songAt(q[j]); if(f) return f; } return ''; }   /* ★[BED_LOAD_1101 덧2] 편지 · 축사 뒤에 잇는 곡은 기본 본식 곡(M4) — «음악과 함께» 곡(M4S5 · M4S6)이 축배로 새지 않게(당일 segOfCue 와 같다) */
  function m4(){ return effHas('M4'); }
  function carry(f){ var a=effHas('M4S5'), b=effHas('M4S6'); return (f&&(f===a||f===b))?m4():f; }   /* 앞 곡이 잇는 순간(축배 · 닫는 인사 첫 줄)에 «음악과 함께» 곡이 흐르면 M4 로 */   /* 콘솔은 마지막으로 깔린 곡이 잇는다 — 그 곡 = 뒤에서부터 곡이 있는 첫 순간 */
  function fileFor(st){ if(st._base){ return effHas(st._base); }   /* ★[BGM_TIMING2_1101] «음악과 함께» 축사 · 편지 여는 말 = 앞 곡(M4) */
    if(st.k==='toast'&&!LPB.m7){ if(BED.who==='lp'&&BED.cur.src) return carry(BED.cur.f); return toastBed(); }   /* [BED_LOAD_1101 덧2] carry = M4S5 · M4S6 → M4 */
    if(st.k==='_close'&&st.slug==='narr-close-bow'){ return (BED.who==='lp'&&BED.cur.src)?carry(BED.cur.f):''; }
    return songAt(st.k); }
  function lpShow(st){ if(!emb()||!st) return; if(BED.who==='card') stopCard(true); if(LPB.note&&LPB.noteK&&st.k!==LPB.noteK) note('');   /* [BED_LOAD_1101] 그 순간 듣기 동안만 */
    if(st.k!==LPB.wk){ LPB.wk=st.k; var _nk=nextK(st.k), _rk=[]; try{ _rk=(typeof LP!=='undefined'&&LP.range&&LP.range.ks)||[]; }catch(x){} if(_nk&&(_rk.indexOf(_nk)>-1||st.k==='letter')) songsOf(_nk).forEach(function(_nf){ if(_nf&&!BUF[_nf]) want(_nf); }); }   /* [BED_LOAD_1101] 다음 순간 곡은 이어 듣는 범위 안이거나 편지 끝(lpTail 이 올린다)일 때만 미리 — 맞절만 들을 때 감사 인사 곡까지 받지 않는다(ENTRY_CARRY 1) */   /* ★[BGM_TIMING2_1101] 편지 끝에 오를 다음 순간 곡을 미리 받는다(편지만 따로 들을 때도 · 받는 동안 정적이 끝나 곡이 안 오르던 자리) */
    /* ★★[BRIDGE_FIRST_1101 사장님 «이어듣기 누르면 노래가 먼저 나오는데 순서가 맞아?»] 다음 순간 몫으로 붙은 이음말(st._pre · 빌더가 BgmSlots.leadAt 으로 표시)은 앞 장면을 닫는 말 —
         새 곡을 걸지 않는다 · 이어 듣기면 앞 곡을 말 아래 크기(−16 · 보컬 −22)로 · 그 순간만 들으면 음악 없이 · 새 곡 뜸은 그 바로 뒤 줄(lpLead) */
    if(st._pre){ LPB.cheer=false; if(BED.who==='lp'&&BED.cur.src){ var pp=PR(), dbp=vx(pp.speech,BED.cur.f); LPB.on=true; ramp(BED.cur,dbp,dbp>(BED.cur.want||-90)+0.5?pp.up:pp.down); } return; }
    if(st.k!=='toast') LPB.m7=false;
    var f=fileFor(st), db=lvOf(st,f), up=db>(BED.cur.want||-90)+0.5, p=PR();
    LPB.cheer=false;
    if(!f){ if(BED.who==='lp'&&BED.cur.src) hushAll(1500); LPB.on=false; LPB.f=''; return; }
    LPB.on=true; BED.who='lp';
    if(BUF[f]&&BUF[f].st==='ok'){ var at=atOf(f,st); play(f,db,up?p.up:p.down,at); LPB.f=f; return; }
    LPB.pend=f; want(f,function(b,ec){ if(!LPB.on||LPB.pend!==f) return; if(!b){ var q0=curStep(); if(q0&&q0.k===st.k) note('fail',ec); return; } var q=curStep(); if(!q||fileFor(q)!==f) return; if(LPB.note) note(''); play(f,lvOf(q,f),p.up,atOf(f,q)); LPB.f=f; });   /* [BED_LOAD_1101 ③] 못 받으면 한 줄 */   /* 곡이 늦게 오면 그때 깐다(나레이션을 기다리게 하지 않는다) */ }
  /* ★[LISTEN_PACE_1031 사장님 «BGM 이 흐르고 뜸 들인 이후 멘트»] 순간 첫 줄 앞 뜸 — 그 순간 곡을 큐 사이 크기(−8)로 깔고 3초(같은 곡이 이어지면 1.5초) ·
     끝 0.8초(미리 낮추기 leadMs) 동안 그 줄 크기로 내린다 · 돌려준 값 = 기다릴 ms · 곡이 없으면(공개 미리보기 · 드라이브에 없음) 0 = 뜸 없음 */
  /* ★★[KNOBS_1031 ②] 성혼 선언 앞 연출을 당일 값 그대로 — 음악을 4초에 걸쳐 끄고(preFadeMs) 2.5초 정적(silenceMs) 뒤 첫 멘트 · 앞 순간 곡이 이어지지 않으면 1.5초 −8 로 먼저 들려준다 */
  function DP(){ var d=(window.RitualCue&&RitualCue.PARAM)||{}; return { pre:(d.declare&&d.declare.preFadeMs)||4000, sil:(d.declare&&d.declare.silenceMs)||2500, lsil:(d.letter&&d.letter.postSilenceMs)||2000, lup:(d.letter&&d.letter.musicUpMs)||4000 }; }
  function lpDeclare(st,f){ var p=PR(), d=DP(), cont=!!(BED.who==='lp'&&BED.cur.src&&BED.cur.f===f), pre=cont?0:1500;
    LPB.on=true; BED.who='lp'; LPB.cheer=false; LPB.m7=false;
    var go=function(){ if(!cont){ play(f,vx(p.music,f),p.up,(BED.cur.f!==f&&LPB.keep[f]!=null)?LPB.keep[f]:0); LPB.f=f; } var v=BED.cur;
      setTimeout(function(){ if(BED.cur===v&&LPB.on&&curStep()===st) ramp(v,-90,d.pre); },pre); };
    if(cont||(BUF[f]&&BUF[f].st==='ok')) go(); else { LPB.pend=f; want(f,function(b){ if(b&&LPB.on&&LPB.pend===f&&curStep()===st) go(); }); }
    return pre+d.pre+d.sil; }
  /* ★★[KNOBS_1031 ②] 편지 끝 — 정적 2초(음악과 함께 읽은 날은 없음) → 4초에 걸쳐 말 아래 크기(−16)로 · 돌려준 값 = 기다릴 ms(곡이 없으면 0) */
  /* ★★[BED_LOAD_1101 덧1 · 덧2 GPT 6 · 7라운드] 편지 끝에 올릴 곡 = «다음 순간 첫 줄에서 실제로 흐르는 곡» — 새 곡을 여는 순간(부모님께 인사 M5 · 테이블 M8 …)은 그 곡 ·
       앞 곡이 잇는 순간(축배 · 닫는 인사)은 기본 본식 곡 M4(당일도 그 자리는 앞 곡이 잇는다 · «음악과 함께» 곡은 M4 로 3초 겹쳐 돌아온다) ·
       다음 곡이 아직 안 왔으면 옛 곡을 올리지 않고 −90 을 지킨다 · 오면 그 곡만 · 못 받으면 조용히(옛 곡으로 돌아가지 않는다) · 다음 첫 줄 곡이 옛 곡(M4)이면 그대로 올린다 */
  function nextFirst(nk,nx){ if(!nk) return ''; if(nk==='toast'||nk==='_close') return m4(); return nx?fileFor(nx):songAt(nk); }
  function lpTail(st,nx){ if(!emb()||!st) return 0;
    var p=PR(), d=DP(), bed=!!(st.dk!=null&&st.dk>-60), w=bed?0:d.lsil, ok=function(x){ return !!(x&&BUF[x]&&BUF[x].st==='ok'); };
    var cur=(BED.who==='lp'&&BED.cur.src)?BED.cur.f:'', f=cur||songAt(st.k), nk=nx?nx.k:nextK(st.k), fn=(nk&&nk!==st.k)?nextFirst(nk,nx):'';
    var um=(bed||nx)?3000:d.lup;   /* ★[BGM_TIMING2_1101] 편지만 따로 들으면(다음 줄 없음) 오름은 종전 그대로(4초 · KNOBS_1031 ②) */
    if(fn&&fn!==f){ LPB.on=true; BED.who='lp'; var v0=BED.cur, tk=++LPB.lt;
      var start=function(){ if(!LPB.on||BED.who!=='lp'||LPB.lt!==tk) return; if(bed&&BED.cur.src&&BED.cur.want>-60){ play(fn,vx(p.speech,fn),3000,atOf(fn,nx)); LPB.f=fn; return; }   /* ★[BGM_TIMING2_1101] «음악과 함께» — 정적 없이 3초 겹침 */
        var nv=startVoice(fn,vx(p.speech,fn),um,atOf(fn,nx)); if(!nv) return; if(BED.cur.src) stopVoice(BED.cur,300); BED.cur=nv; LPB.f=fn; };
      if(!bed&&v0.src) ramp(v0,-90,300);
      if(ok(fn)){ if(bed) start(); else setTimeout(start,w); LPB.tailTo=Date.now()+w+um; return w+um+600; }
      /* 아직 안 왔다 — 옛 곡은 −90(«음악과 함께»도 1.5초에 내린다) · 오면 그 곡만(정적이 남았으면 남은 만큼 뒤에) · 이미 다음 순간 뜸이 맡았으면(lt 가 바뀜) 손대지 않는다 */
      if(bed&&v0.src) ramp(v0,-90,1500); var t0=Date.now(); LPB.pend=fn;
      want(fn,function(b){ if(!b||LPB.lt!==tk) return; setTimeout(start,Math.max(0,w-(Date.now()-t0))); });
      LPB.tailTo=Date.now()+w+um; return w+um+600; }
    /* 다음 첫 줄 곡이 옛 곡과 같다(축배 · 닫는 인사의 M4 등) · 다음 곡이 없다 — 종전대로 옛 곡을 정적 뒤 말 아래 크기로 */
    if(!ok(f)) return 0;
    LPB.on=true; BED.who='lp';
    if(!(BED.cur.src&&BED.cur.f===f)){ play(f,-90,200,LPB.keep[f]||0); LPB.f=f; } var v=BED.cur; if(!bed) ramp(v,-90,300);
    setTimeout(function(){ if(BED.cur===v&&LPB.on) ramp(v,vx(p.speech,f),d.lup); },w);
    LPB.tailTo=Date.now()+w+d.lup; return w+d.lup+600; }
  function lpLead(st,re){ if(!emb()||!st) return 0; if(BED.who==='card') stopCard(true); var f=fileFor(st);
    if(st.k!=='declare'&&lvOf(st,f||BED.cur.f)<=-60){ if(BED.who==='lp'&&BED.cur.src&&(BED.cur.want==null||BED.cur.want>-60)){ LPB.on=true; LPB.cheer=false; ramp(BED.cur,-90,1500); return 2500; } return 0; }   /* ★[BGM_TIMING_1101] 무음 첫 줄 — 그 순간 곡이 없어도(편지 «음악 없이») 흐르던 곡을 1.5초에 끄고 정적 1초 */
    if(!f) return 0;
    if(st.k==='declare'&&lvOf(st,f)<=-60) return lpDeclare(st,f);   /* [KNOBS_1031] 선언 앞은 당일 연출 */
    /* ★[BGM_TIMING_1101] 순간 첫 줄이 무음(−60 이하 · 편지 «음악 없이» 등)이면 뜸 대신 «끄고 정적 1초» — 앞 곡이 흐르면 1.5초에 −90 → 1초 뒤 첫 멘트(당일 1.5초 내림 + 내림 끝 대기와 같다) · 그 순간만이면 처음부터 음악 없이 · 판정은 위(곡이 없어도) */
    var p=PR(), cont=!!(BED.who==='lp'&&BED.cur.src&&BED.cur.f===f), ms=cont?3000:6000;   /* ★[LEAD_LONGER_1031 사장님 «처음 BGM 노래가 좀 더 흐른 뒤 멘트가 나왔으면»] 뜸 새 곡 3 → 6초 · 이어지는 곡 1.5 → 3초(큐 사이 크기 −8 · 끝 0.8초 미리 낮추기) */
    if(st.k!=='toast') LPB.m7=false; LPB.on=true; BED.who='lp'; LPB.cheer=false;
    var go=function(){ play(f,vx(p.music,f),p.up,atOf(f,st)); LPB.f=f; var v=BED.cur, db=lvOf(st,f);
      if(v.want>db+0.5) setTimeout(function(){ if(BED.cur===v&&LPB.on&&curStep()===st) ramp(v,db,p.lead); },Math.max(0,ms-p.lead)); };
    if(BUF[f]&&BUF[f].st==='ok'){ go(); return ms; }
    /* ★★[BED_LOAD_1101 ②] 곡이 아직 안 왔다(LTE · GAS base64) — 뜸이 곡 없이 지나가지 않게 최대 8초 기다린다 · 1.5초 넘으면 지금 줄 아래 «음악을 불러오는 중이에요» ·
         오면 그때부터 뜸 6초(re = 빌더 뜸 시계를 다시 건다) · 8초가 지나면 멘트부터(곡이 오면 lpShow 처럼 그 줄 크기로) · 못 받으면 «불러오지 못했어요 (코드)» 한 줄 · 멘트는 곧바로 */
    var tk=++LPB.lt; LPB.pend=f; clearTimeout(LPB.ln); LPB.ln=setTimeout(function(){ if(LPB.lt===tk&&LPB.pend===f&&leadOf()===st) note('load'); },LOAD_MS);
    want(f,function(b,ec){ if(LPB.lt!==tk) return; clearTimeout(LPB.ln); if(!LPB.on||LPB.pend!==f) return;
      if(!b){ note('fail',ec); if(leadOf()===st&&re) re(0); return; }
      note(''); var q=curStep();
      if(leadOf()===st){ go(); if(re) re(ms); }
      else if(q&&q!==st&&fileFor(q)===f){ play(f,lvOf(q,f),p.up,atOf(f,q)); LPB.f=f; } });
    if(!BUF[f]) return 0;   /* 그 자리에서 못 받음(연결 없음) — 뜸 없이 멘트 · 줄은 위에서 */
    return re?LEAD_WAIT:ms; }
  var LEAD_WAIT=8000;
  function leadOf(){ try{ return (typeof LP!=='undefined')?LP.leadSt:null; }catch(x){ return null; } }
  /* [BED_LOAD_1101 ②③] 지금 줄 아래 한 줄 — 곡 카드 «곡을 불러오는 중이에요»와 같은 꼴(bgm-note bed-load) · 빌더 _lBedNote 가 그린다 · 그 순간 듣기 동안 */
  function note(kind,ec){ var t=kind==='load'?'음악을 불러오는 중이에요':kind==='fail'?'음악을 불러오지 못했어요 · 나레이션만 들려 드려요 (코드 '+(ec||'L4')+')':''; LPB.note=t; LPB.noteK=(curStep()||{}).k||'';
    try{ if(typeof _lBedNote==='function') _lBedNote(t); }catch(x){} }
  /* 줄과 줄 사이 — 다음 줄이 말이면 0.4초 앞서 내린다 · «위하여» 차례가 끝나면 축배 크기로 */
  function lpGap(pv,nx,gap){ if(!emb()||!LPB.on||BED.who!=='lp') return; var p=PR();
    if(LPB.tailTo&&Date.now()<LPB.tailTo) return;   /* ★[BGM_TIMING_1101] 편지 끝 연출(정적 → 오름) 중에는 순간이 바뀌어도 −8 로 올리지 않는다 */
    /* [BGM_FIX_1030] «위하여» 차례가 끝나면 축배 곡(M7)으로 — 강조 위치(start)에서 0.6초에 축배 크기로(곡이 없으면 지금 곡이 크기만) */
    if(pv&&pv.cheer){ LPB.cheer=true; LPB.m7=true; var f7=songAt('toast'), s7=f7?P.byF(f7):null;
      if(f7&&BUF[f7]&&BUF[f7].st==='ok'&&f7!==BED.cur.f){ if(BED.cur.src) stopVoice(BED.cur,p.toastUp); BED.cur=startVoice(f7,p.toast,p.toastUp,s7&&s7.start!=null?+s7.start:0)||Voice(); LPB.f=f7; return; }
      if(!BED.cur.src) return; ramp(BED.cur,p.toast,p.toastUp); var ps=P.byF(BED.cur.f); if(ps&&ps.start!=null&&BED.cur.src){ var at=+ps.start, f=BED.cur.f; stopVoice(BED.cur,200); BED.cur=startVoice(f,p.toast,p.toastUp,at)||Voice(); } return; }
    /* [BGM_FIX_1030] 닫는 인사 나레이션 뒤 — 목례 · 박수와 함께 M6 으로(3초 겹쳐 · 큐 사이 크기) */
    if(pv&&pv.k==='_close'&&pv.slug==='narr-close-bow'){ var f6=songAt('_close'); if(f6&&BUF[f6]&&BUF[f6].st==='ok'){ play(f6,p.music,p.up,LPB.keep[f6]||0); LPB.f=f6; } return; }
    if(!BED.cur.src) return;
    if(pv&&nx&&pv.k!==nx.k&&(nx._pre||nx._noLead)){ var dbb=vx(p.speech,BED.cur.f), vb=BED.cur; if(vb.want>dbb+0.5){ var lb=Math.min(p.lead,Math.max(0,gap)); setTimeout(function(){ if(BED.cur===vb&&LPB.on) ramp(vb,dbb,lb||p.down); },Math.max(0,gap-lb)); } return; }   /* ★[BRIDGE_FIRST_1101] 다음 줄이 이음말이면(★[BGM_TIMING2_1101] «음악과 함께» 축사 · 편지 여는 말도) −8 로 올리지 않고 0.8초 미리 낮춰 말 아래 크기로(앞 곡 그대로) */
    if(pv&&nx&&pv.k!==nx.k&&nx.k!=='declare'&&!personal(nx)&&nx.dk!=null&&nx.dk<=-60) return;   /* ★[BGM_TIMING_1101] 다음 순간 첫 줄이 무음이면 −8 로 올리지 않는다 — 곧 뜸 자리에서 1.5초에 −90 (편지 «음악 없이») */
    if(pv&&nx&&pv.k!==nx.k){ ramp(BED.cur,Math.max(BED.cur.want,vx(p.music,BED.cur.f)),TAIL.up); return; }   /* ★[LISTEN_LOOK_LEVEL_1101 ③] 이어 듣기 — 순간이 바뀔 때 끄지 않고 큐 사이 크기(−8)로 이어 흐른다 · 다음 순간 뜸(lpLead)이 같은 곡이면 그대로 · 새 곡이면 3초 겹쳐 넘긴다 */
    if(!nx||fileFor(nx)!==BED.cur.f) return;
    var db=lvOf(nx); if(BED.cur.want>db+0.5){ var lead=Math.min(nx.fm||p.lead,Math.max(0,gap)), v=BED.cur; setTimeout(function(){ if(BED.cur===v&&LPB.on) ramp(v,db,lead||p.down); },Math.max(0,gap-lead)); } }   /* [BGM_FIX_1030] 미리 낮추기 0.8초 · 박수 뒤 줄 1.5초(fm) */
  function lpEnd(){ if(LPB.note) note(''); LPB.lt++; if(BED.who==='tail'){ clearTimeout(LPB.tt); hushAll(1500); return; }   /* [LISTEN_LOOK_LEVEL_1101 ③] 여운 중 ⏹ = 지금처럼 1.5초에 잦아듦 */
    if(BED.who!=='lp') return; if(BED.cur.f) LPB.keep[BED.cur.f]=posOf(BED.cur); LPB.on=false; LPB.f=''; LPB.pend=''; LPB.m7=false; hushAll(1500); }
  /* ★[LISTEN_LOOK_LEVEL_1101 ③ 사장님 «마지막 나레이션이 끝나면 노래는 다시 커지는 거야?»] 끝까지 들으면(⏹ 가 아니라) 여운 —
       음악이 1.2초에 큐 사이 크기(−8 · 이미 더 크면 그대로)로 올라와 5초 흐른 뒤 3초에 걸쳐 잦아들며 끝 · 그동안 ⏹ · 다른 듣기 · 곡 카드가 오면 그쪽이 이긴다 */
  var TAIL={ up:1200, hold:5000, down:3000 };
  function lpFin(){ if(BED.who!=='lp'||!BED.cur.src){ lpEnd(); return; }
    var p=PR(), v=BED.cur, f=v.f; LPB.keep[f]=posOf(v); LPB.on=false; LPB.f=''; LPB.pend=''; LPB.m7=false; BED.who='tail'; clearTimeout(LPB.tt);
    ramp(v,Math.max(v.want,vx(p.music,f)),TAIL.up);
    LPB.tt=setTimeout(function(){ if(BED.cur!==v||BED.who!=='tail') return; ramp(v,-90,TAIL.down);
      LPB.tt=setTimeout(function(){ if(BED.cur===v&&BED.who==='tail') hushAll(100); },TAIL.down+100); },TAIL.up+TAIL.hold); }
  function curStep(){ try{ return (typeof LP!=='undefined'&&LP.q)?LP.q[LP.i]:null; }catch(x){ return null; } }
  /* 멈춤 · 끝 — 플레이어가 멈추면(■ · 다른 순간 · 끝) 곡도 잦아든다 */
  setInterval(function(){ if(BED.who!=='lp'||!BED.cur.src) return; var dead=true; try{ dead=typeof LP==='undefined'||!LP.q||!LP.q.length||LP.paused||LP.one; }catch(x){} if(dead) lpEnd(); },250);
  /* 듣기 전에 그 순간들의 곡을 받아 둔다 */
  /* ★[BED_LOAD_1101 ⑤] 순간 쪽이 열리면(흐름이 그려질 때) 그 순간 곡 하나를 조용히 받아 둔다 · 한 곡에 한 번 · 셋 한도 안(prune) · 목록이 늦으면 목록이 온 뒤 */
  var MW={ tried:{}, after:'' };
  /* ★[BED_LOAD_1101 덧1 ③] 한 순간에 받아 둘 곡 — 축사 · 편지 «음악과 함께» = 여는 말 곡 M4 + 고른 M4S5 · M4S6 · 축배 = 잇는 곡(toastBed) + 축배 곡 M7 · 그 밖 = 그 순간 곡 */
  function songsOf(k){ var o=[], add=function(f){ if(f&&o.indexOf(f)<0) o.push(f); };
    if(k==='free'&&bedOn('S5')){ add(m4()); add(songAt('free')); } else if(k==='letter'&&bedOn('S6')){ add(m4()); add(songAt('letter')); }
    else if(k==='toast'){ add(toastBed()); add(effHas('M7')); } else add(songAt(k)); return o; }
  function warmK(k){ if(!emb()||!k) return; list(); if(AV.st!=='ok'){ MW.after=k; return; } MW.after=''; if(saveData()) return; songsOf(k).forEach(function(f){ if(!f||BUF[f]||MW.tried[f]) return; MW.tried[f]=1; want(f); }); }
  function lpWarm(ks){ if(!emb()) return; sess(); list(); var _nw=0; if((ks||[]).indexOf('matjeol')>-1||((ks||[]).length>1&&(ks||[]).indexOf('entry')>-1)){ if(entOn()) want(ENT_F); }   /* [ENTRY_CARRY_1101] */ (ks||[]).forEach(function(k){ if(k==='matjeol'||k==='entry') return; songsOf(k).forEach(function(f){ if(_nw<BUF_MAX&&!BUF[f]){ _nw++; want(f); } }); }); }   /* ★[BED_LOAD_1101 ④ · 덧1 ③] 앞 순간부터 셋까지(LRU 한도) — 나머지는 순간이 바뀔 때 다음 순간 곡을 미리 · 한꺼번에 풀면 아이폰 메모리가 넘친다 · 축배는 M7(종전 M6 는 END_FLOW_1030 뒤로 축배 뒤 곡) */

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
  /* ★★[SONG_CARD_TAP_1101 사장님 아이폰 «처음 누르면 로딩 때문인지 아무 표시 없이 재생이 안 돼»] 첫 탭 —
       ① 누른 그 흐름 안에서 소리 길을 연다(AudioContext resume + 무음 한 칸 재생) · 곡이 나중에 와도 그 길로 튼다(아이폰은 네트워크를 기다린 뒤의 재생을 막는다)
       ② 누르자마자 ▶ 가 차오름(다른 ▶ 와 같은 wfill · ld) · 1.5초 넘으면 아래 «곡을 불러오는 중이에요» · 받으면 ■ · 못 받으면 알림 + ▶
       ③ 곡 칸이 화면에 들어오면 그 구간 첫 곡(고른 곡 · 없으면 1순위)을 조용히 받아 둔다(한 번에 하나 · 받았으면 안 받음 · 데이터 절약이면 안 받음) · 손가락이 닿는 순간(pointerdown)에도
       ④ 받는 중에 다른 ▶ 를 누르면 앞 결과는 버리고 새 곡만(tk) */
  function unlock(){ sess(); var a=ctx(); if(!a) return; try{ if(a.state!=='running'){ var r=a.resume(); if(r&&r.catch) r.catch(function(){}); } var b=a.createBuffer(1,1,22050), s=a.createBufferSource(); s.buffer=b; s.connect(a.destination); s.start(0); }catch(x){} }
  var LOAD_MS=1500, WAIT_D=4;
  function card(f,k,sg){ var tk=++CARD.tk; unlock();
    CARD.f=f; CARD.sg=sg||''; CARD.st='load'; CARD.at=Date.now(); CARD.slow=false; repaint();
    setTimeout(function(){ if(tk===CARD.tk&&CARD.st==='load'){ CARD.slow=true; repaint(); } },LOAD_MS);
    want(f,function(b,ec){ if(tk!==CARD.tk) return; CARD.slow=false; if(!b){ CARD.f=''; CARD.st=''; repaint(); toast1(ec==='L3'?'곡을 준비하고 있어요':'곡을 불러오지 못했어요 (코드 '+(ec||'L4')+')'); return; }   /* L3 = 드라이브에 아직 없는 곡 */
      if(BED.who==='lp'||BED.cur.src) hushAll(300); BED.who='card'; CARD.st='play'; repaint();
      var a=ctx(); if(!a) return; var s0=P.byF(f), at=(s0&&s0.start!=null)?Math.max(0,+s0.start-SOLO.pre):0, v=Voice();
      try{ if(a.state==='suspended') a.resume(); v.src=a.createBufferSource(); v.src.buffer=b; v.src.loop=false; v.g=a.createGain(); v.g.gain.value=0.00003;
        var lim=mkBus(a);   /* ★[BGM_TIMING2_1101] 리미터 + 천장(이 순간 전체 듣기 버스와 같은 길) */
        v.src.connect(v.g); v.g.connect(lim); v.lim=lim;
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
  /* [SONG_CARD_TAP_1101] 곡 ▶ 한 곳 — 받는 중이면 차오름(wfill · ld) · 틀면 ■ · 아니면 ▶ */
  function plBtn(sg,k,p,pl,miss){ var ld=pl&&CARD.st==='load', w='', st='';
    if(ld){ w=' wfill ld'; st=' style="--d:'+WAIT_D+'s;--dl:-'+Math.max(0,(Date.now()-(CARD.at||Date.now()))/1000).toFixed(2)+'s"'; }
    return '<button type="button" class="mk-pl mu-pl'+(pl?' on':'')+w+(miss&&!pl?' off':'')+'"'+st+' data-fk="bedp:'+sg+':'+p.f+'" aria-pressed="'+pl+'"'+(ld?' aria-busy="true"':'')+(miss&&!pl?' aria-disabled="true"':'')+' aria-label="'+e(p.t)+(ld?' 불러오는 중':pl?' 멈추기':' · 곡만 듣기')+'" onclick="bedAct(\'prev\',\''+p.f+'\',\''+e(k)+'\',\''+sg+'\')">'+(pl&&!ld?ico('stop'):ico('play'))+'</button>'; }
  function loadNote(sg){ return (CARD.sg===sg&&CARD.st==='load'&&CARD.slow)?'<p class="bgm-note bed-load" role="status">곡을 불러오는 중이에요</p>':''; }
  /* ★★[LIST_NO_PICK_1101 2026-11-01 사장님 «이러면 굳이 곡을 안 골라도 되잖아»] 목록 칸(하객 맞이 M1 · 테이블 인사 M8)은 고르는 칸이 아니라 «이런 곡들이 흘러요» 안내 칸 —
       이름표 아래 한 줄(12.5px · --sub) + 재생 차례대로 곡 줄 전부(BgmPicks.order · 당일 콘솔과 같은 함수 · 3곡 + fill · 다른 구간에서 고른 곡은 빠진다) · 줄 = ▶(곡 카드 · 음악만) + 제목 · 가수 ·
       고르기 · 선택 표시 · «바꾸기» · 접힌 한 줄 없음 · ★BGM_FILL_1101 의 순서 화살표 두 줄(bed-ord)은 이 목록이 대신해 걷었다 — 되살리지 말 것 */
  var INFO={ M1:'하객이 들어와 앉는 동안 아래 곡들이 차례로 흘러요 · 약 30분', M8:'테이블 인사와 사진 동안 아래 곡들이 차례로 흘러요 · 약 30분' };
  function isList(sg){ var d=P.seg(sg); return !!(d&&d.multi); }
  function listRoHtml(sg,k){ var o=P.order?P.order(St(),sg):P.list(sg).map(function(p){ return p.f; });
    var h='<p class="bgm-note bed-info">'+e(INFO[sg]||'아래 곡들이 차례로 흘러요')+'</p><ul class="mu-list mu-ro" aria-label="'+e(labelOf(sg)+' 음악 · 흐르는 차례')+'">';
    o.forEach(function(f){ var p=P.byF(f); if(!p) return; var pl=CARD.f===f&&CARD.sg===sg, miss=AV.st==='ok'&&!AV.set[f];
      h+='<li class="mu-row" data-f="'+e(f)+'">'+(emb()?plBtn(sg,k,p,pl,miss):'')+'<span class="mu-info"><span class="mu-t">'+e(p.t)+'</span><span class="mu-a">'+e(p.a||'')+'</span></span></li>'; });
    return h+'</ul>'+loadNote(sg)+(emb()?'':'<p class="bgm-note bed-note">'+PUB_NOTE+'</p>'); }
  function dupHtml(sg){ var pv=P.dupSeg?P.dupSeg(St(),sg):''; return pv?'<p class="bgm-note bed-dup">'+e(labelOf(pv))+'에서도 고른 곡이에요</p>':''; }
  function foldHtml(sg,k,s){ var gl=labelOf(sg)+' 음악', pl=CARD.f===s.f&&CARD.sg===sg, miss=AV.st==='ok'&&!AV.set[s.f];
    return '<div class="mu-fold1">'
      +(emb()?plBtn(sg,k,s,pl,miss):'')
      +'<div class="mu-fsel"><span class="mu-t">'+e(s.t)+'</span><span class="mu-a">'+e(s.a||'')+'</span></div>'
      +'<button type="button" class="pk-link mu-chg" data-fk="bedchg:'+sg+'" aria-expanded="false" aria-controls="'+boxId(sg)+'" aria-label="'+e(gl)+' 바꾸기" onclick="bedAct(\'open\',\'\',\''+e(k)+'\',\''+sg+'\')">바꾸기</button></div>'+dupHtml(sg)+loadNote(sg); }   /* [SONG_CARD_TAP_1101] 접힌 줄 아래에도 «곡을 불러오는 중이에요» */

  /* ── 화면 — 곡 목록 · 아래 한 줄 ── */
  /* ★[SONG_ROW_LINES_1101 사장님 «이건 삭제해도 될 것 같아»] 곡 칸 아래 «고르지 않으시면 ‹1순위›로 준비해요 · ‹곡›부터 이어서 틀어요» 를 걷었다 — ✓ 표시로 충분 · «고르지 않으시면 ‹1순위›»는 한눈에 보기 요약(sumOf)에만.
       공개 미리보기만 «마이페이지에서 들어 볼 수 있어요» 한 줄 · 되살리지 말 것 */
  var PUB_NOTE='마이페이지에서 들어 볼 수 있어요';
  function listHtml(sg,k){ if(isList(sg)) return listRoHtml(sg,k); var L=P.list(sg), cur=picked(sg), gl=labelOf(sg)+' 음악 곡', cs=cur?P.byF(cur):null;
    if(folded(sg)&&cs) return foldHtml(sg,k,cs);   /* [MUSIC_FOLD_1031 · MUSIC_FOLD_PICK_1031] 고른 곡이 있으면 접힌 한 줄 · «바꾸기»로 편 방문만 목록 */
    var h='<ul class="mu-list" role="radiogroup" aria-label="'+e(gl)+'">';
    L.forEach(function(p,i){ var on=cur===p.f, pl=CARD.f===p.f&&CARD.sg===sg, miss=AV.st==='ok'&&!AV.set[p.f];
      h+='<li class="mu-row'+(on?' on':'')+'">'
        +(emb()?plBtn(sg,k,p,pl,miss):'')
        +'<button type="button" class="mu-pick" role="radio" aria-checked="'+on+'" tabindex="'+((on||(!cur&&i===0))?0:-1)+'" data-fk="bed:'+sg+':'+p.f+'" onclick="bedAct(\'pick\',\''+p.f+'\',\''+e(k)+'\',\''+sg+'\')"><span class="mu-t">'+e(p.t)+'</span><span class="mu-a">'+e(p.a||'')+'</span></button></li>'; });   /* ★[SONG_ROW_PLAIN_1101 사장님 «제목 가수만 나오면 될 거 같아»] 곡 줄은 제목 · 가수(연주자)만 — «노래» · 판(src) · 분위기 한 줄(why)은 화면에서 뺐다(데이터는 bgm-picks.js 그대로 · 콘솔 설정 화면 그대로) · 가사 있는 곡 안내는 고른 뒤 아래 한 줄이 맡는다 */
    var none=emb()&&AV.st==='ok'&&!Object.keys(AV.set).length;   /* ★[BED_EMPTY_RELIST_1031 식순 걷기 3라운드 3] 들어 볼 곡이 하나도 없다고 받았으면 한 줄 + 다시 불러오기(입장 추천 곡과 같게) */
    return h+'</ul>'+loadNote(sg)+(none?'<p class="bgm-note bed-av">아직 들어 볼 수 있는 곡이 없어요 · <button type="button" class="pk-link" data-fk="bedrelist:'+sg+'" onclick="bedAct(\'relist\',\'\',\'\',\''+sg+'\')">다시 불러오기</button></p>':'')+(emb()?'':'<p class="bgm-note bed-note">'+PUB_NOTE+'</p>')+(cs&&cs.vocal?'<p class="bgm-note bed-voc">가사가 있는 곡이라 안내 말씀 때는 더 작게 깔려요</p>':'')+dupHtml(sg); }   /* [BGM_FIX_1030] «노래» · 고른 곡이 노래면 한 줄 */
  /* ② 순간 쪽 «고르기» 칸 — 이 순간이 첫 담긴 순간인 구간마다 «‹순간› 음악» 줄 하나 */
  function rowHtml(k){ var h=''; setTimeout(pfScan,0);   /* [SONG_CARD_TAP_1101] 그려진 뒤 곡 칸을 지켜본다 */
    CUST.forEach(function(sg){ if(chooser(sg)!==k) return; var gl=labelOf(sg.id)+' 음악'; list();
      h+='<div class="ls-cg cg-vp cg-hl cg-vq ls-bed" role="group" aria-label="'+e(gl)+'" data-seg="'+sg.id+'" data-k="'+e(k)+'"><span class="gl" aria-hidden="true">'+e(gl)+'</span><div class="bed-box" id="'+boxId(sg.id)+'">'+listHtml(sg.id,k)+'</div>'+'</div>'; });   /* ★[SONG_ROW_LINES_1101] 곡 칸 맨 아래 «나레이션과 함께 들어 보려면 …» 한 줄(BED_HINT_WHERE_1031 · SONG_CARD_SOLO_1031)을 걷었다 · 되살리지 말 것 */
    return h; }
  /* 축사 · 편지 «음악과 함께» 아래 곡 고르기(bgm-form.js 가 그 줄 안에 넣는다) */
  function subHtml(slot,k){ var sg=SUB[slot]; if(!sg||!bedOn(slot)) return ''; list(); return '<div class="bed-box bed-sub" id="'+boxId(sg)+'" data-seg="'+sg+'" data-k="'+e(k)+'">'+listHtml(sg,k)+'</div>'; }
  /* 공개 미리보기 — 이 순간 전체 듣기 아래 한 줄(이 쪽에 곡 줄이 없을 때만 · 곡 줄이 있으면 그 아래 한 줄이 같은 말을 한다) */
  function pubLine(k){ if(emb()) return ''; var sg=segAt(k); if(!sg) return ''; if(CUST.some(function(s){ return chooser(s)===k; })) return '';
    if(/^(free|letter)$/.test(k)&&bedOn(k==='free'?'S5':'S6')) return '';
    return '<p class="mk-ploff bed-pub">음악은 마이페이지에서 함께 들어 볼 수 있어요</p>'; }
  /* ④ 한눈에 보기 — 구간마다 «‹순간› · ‹곡›» / «‹순간› · 고르지 않으시면 ‹1순위›» (축사 · 편지는 bgm-form 이 «음악과 함께» 뒤에 붙인다) */
  function sumOf(sg){ if(isList(sg)){ var o=P.order?P.order(St(),sg):[], f0=o[0]?P.byF(o[0]):null; return f0?'‹'+f0.t+'›부터 '+o.length+'곡이 차례로':''; }   /* [LIST_NO_PICK_1101] 고르는 칸이 아니다 — «고르지 않으시면» 없이 */
    var L=P.list(sg), k=picked(sg), s=k?P.byF(k):L[0]; if(!s) return ''; return (k?'':'고르지 않으시면 ')+'‹'+s.t+'›'; }
  function sumRows(){ var q=seq(), at=function(k){ if(k==='guest') return -1; var i=q.indexOf(k); return i<0?999:i; };   /* [CARD_ORDER_1031] 예식 차례대로(테이블 인사 → 축배 → 닫는 인사) — 구간 목록 차례(닫는 인사 → 축배 → 테이블)로 적던 것 */
    return CUST.filter(function(s){ return !!chooser(s); }).map(function(s){ return { id:s.id, k:chooser(s), t:labelOf(s.id)+' · '+sumOf(s.id) }; }).sort(function(a,b){ return at(a.k)-at(b.k); }); }

  /* 그 칸만 다시(빌더 render() 는 흐르던 소리를 끈다) */
  var RP=0;
  function repaintSoon(){ clearTimeout(RP); RP=setTimeout(repaint,0); }
  /* [SONG_CARD_TAP_1101] ③ 미리 받기 — 화면에 들어온 곡 칸의 첫 곡 · 한 번에 하나 · 데이터 절약이면 안 받음 */
  var PF={ busy:'', vis:{}, io:null, tried:{} };   /* tried = 한 번 받으려 한 곡(못 받아도 되풀이하지 않는다) */
  function saveData(){ try{ var c=navigator.connection; return !!(c&&c.saveData); }catch(x){ return false; } }
  function pfSong(sg){ var k=picked(sg); if(k) return k; var L=P.list(sg); return L&&L[0]?L[0].f:''; }
  function pfNext(){ if(PF.busy||saveData()||!emb()||AV.st!=='ok') return; var ks=Object.keys(PF.vis);
    for(var i=0;i<ks.length;i++){ var f=pfSong(ks[i]); if(f&&has(f)&&!BUF[f]&&!PF.tried[f]){ PF.tried[f]=1; PF.busy=f; want(f,function(){ PF.busy=''; pfNext(); }); return; } } }
  function pfScan(){ if(!emb()) return; if(!PF.io){ if(typeof IntersectionObserver!=='function') return;
      PF.io=new IntersectionObserver(function(es){ es.forEach(function(en){ var sg=en.target.getAttribute('data-seg'); if(!sg) return; if(en.isIntersecting) PF.vis[sg]=1; else delete PF.vis[sg]; }); pfNext(); },{ rootMargin:'120px 0px' }); }
    D.querySelectorAll('.ls-bed[data-seg]').forEach(function(el){ if(el.__pf) return; el.__pf=1; PF.io.observe(el); }); pfNext(); }
  D.addEventListener('pointerdown',function(ev){ try{ var b=ev.target&&ev.target.closest&&ev.target.closest('.mu-pl[data-fk^="bedp:"]'); if(!b) return; var m=/^bedp:([^:]+):(.+)$/.exec(b.getAttribute('data-fk')||''); if(m&&has(m[2])&&!BUF[m[2]]) want(m[2]); }catch(x){} },true);
  function repaint(){ setTimeout(pfScan,0); D.querySelectorAll('.ls-bed[data-seg],.bed-sub[data-seg]').forEach(function(box){ var sg=box.getAttribute('data-seg'), k=box.getAttribute('data-k'), ae=D.activeElement, fk=(ae&&box.contains(ae))?ae.getAttribute('data-fk'):null;
      var tgt=box.classList.contains('bed-sub')?box:box.querySelector('.bed-box'); if(!tgt) return; tgt.innerHTML=listHtml(sg,k);
      if(fk){ var f=box.querySelector('[data-fk="'+fk+'"]'); if(f) try{ f.focus({preventScroll:true}); }catch(x){} } });
    try{ if(typeof _mpPaint==='function') _mpPaint(); }catch(x){} }

  /* 누름 — pick(곡 고르기) · prev(곡 카드 ▶) */
  function act(kind,f,k,sg){
    if(kind==='relist'){ AV.st=''; AV.set={}; list(); repaint(); return; }   /* [BED_EMPTY_RELIST_1031] */
    if(kind==='open'){ if(!P.seg(sg)) return; FM()[sg]=0; repaint();   /* [MUSIC_FOLD_1031] «바꾸기» — 그 자리에서 편다 · 이 방문 동안 그대로 · 포커스는 고른 곡 줄로(화면은 움직이지 않는다) */
      var bx=D.getElementById(boxId(sg)), r=bx&&(bx.querySelector('.mu-pick[aria-checked="true"]')||bx.querySelector('.mu-pick')); if(r) try{ r.focus({preventScroll:true}); }catch(x){} return; }
    f=String(f||'').toUpperCase(); var d=P.seg(sg); if(!d||!P.byF(f)||(P.PICKS[sg]||[]).indexOf(f)<0) return;   /* [BGM_FIX_1030] 번호 = 곡마다 하나 → 구간은 누른 줄(data-seg)이 건넨다 */
    if(kind==='prev'){ if(CARD.f===f&&CARD.sg===sg){ stopCard(); return; } if(AV.st==='ok'&&!AV.set[f]){ toast1('곡을 준비하고 있어요'); return; }   /* [GHIBLI_ADD_1101] 드라이브에 아직 없는 곡(곡 줄 · 이름은 그대로) */
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
  window.BgmBed={ warmK:warmK, rowHtml:rowHtml, subHtml:subHtml, pubLine:pubLine, sumRows:sumRows, sumOf:sumOf, segAt:segAt,
    on:function(k){ return emb()&&!!songAt(k); }, lpShow:lpShow, lpLead:lpLead, lpTail:lpTail, lpGap:lpGap, lpEnd:lpEnd, lpFin:lpFin, lpWarm:lpWarm, hush:function(){ if(BED.who==='card') stopCard(); },
    _t:{ AV:AV, BUF:BUF, BED:BED, LPB:LPB, CARD:CARD, PF:PF, BUS:function(){ return BUS; }, TAIL:TAIL, toastBed:function(){ return toastBed(); }, prune:prune, BUF_MAX:BUF_MAX, MW:MW, LEAD_WAIT:LEAD_WAIT, note:function(){ return LPB.note||''; }, mkBus:mkBus, CEIL_DB:CEIL_DB, PR:PR, nextK:nextK,   /* [BGM_TIMING_1101] */ ENT:function(){ var o=BUF[ENT_F], x=o&&o.ext; return o?{ st:o.st, x:x?{ o:x.o, end:x.end, H:x.H, arrive:x.arrive, gain:x.gain, V:x.V }:null }:null; }, entAt:entAt, ENT_F:ENT_F, gfOf:function(db){ var v=BED.cur; return v&&v.gf?v.gf(db):gainOf(db); }, lvOf:lvOf, fileFor:function(st){ return fileFor(st); }, vx:vx, folded:function(sg){ return folded(sg); }, chooser:function(id){ return chooser(P.seg(id)); }, eff:eff, songAt:songAt, gainOf:gainOf } };   /* _t = 점검용 */
})();
