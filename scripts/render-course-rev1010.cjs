// [NARR_REV_1010] 개선안 코스 청취 소리 만들기 — node scripts/render-course-rev1010.cjs <번호> <순간,…> <성혼 갈래> <준비한 순서 갈래> <out.mp3> <full|last>
// node render.js <n> <path(comma)> <decl> <free> <out.mp3>
const R='/home/user/momentedit-site/assets/', AUD=R+'audio/narration/';
const O=require(R+'ritual-open.js'),C=require(R+'ritual-cue.js'),P=require(R+'narr-pair-draft.js');
const fs=require('fs'),{execFileSync}=require('child_process');
const [n,pathS,decl,free,out,guestMode]=process.argv.slice(2); const path=pathS.split(',');
const NM={guest:'하객 맞이',prevideo:'식전 영상',candle:'화촉',entry:'입장',welcome:'첫인사',bless:'부모님 덕담',vow:'혼인 서약',ring:'반지 교환',declare:'성혼 선언',tribute:'부모님께 인사',free:'준비한 순서',letter:'편지',cake:'케이크',toast:'축배',_close:'닫는 인사'};
let S={course:'open'};O.applyExample(S,'brief');S.on={};path.forEach(k=>{if(O.PICKABLE.includes(k))S.on[k]=1});S.toast=O.toastMode(S);
O.setChip(S,'declare',decl);O.setChip(S,'free',free);
let cues=C.build(S,{mode:'console'}).cues.filter(c=>!/^(_photo|_final|_goodbye)$/.test(c.k));

// [NARR_REV_1010] 개선안 소리로 바꿔 넣기
const RV=R+'audio/narration-draft/rev1010/';
const RT={'guest-1-arrival':'두 사람의 결혼식을 찾아 주셔서 감사드립니다. 자리 안내가 필요하시면 입구에서 도와드리겠습니다.',
'guest-2-10min':'십 분 뒤에 예식이 시작됩니다. 첫 순간부터, 자연스러운 사진으로 담겠습니다.',
'guest-3-5min':'예식 시작 오 분 전입니다. 앉으셔도, 서 계셔도 괜찮습니다.',
'narr-prevideo-in':'두 사람이 들어오기 전에, 영상을 먼저 보시겠습니다.',
'narr-bless-end':'그 말씀을, 이 자리의 모두가 들었습니다.',
'narr-ring-in':'반지를 주고받는 순서는, 말없이 지나갑니다. 두 분, 서로의 손에 반지를 끼워 주세요.',
'bridge-b3-clap-thanks':'박수, 고맙습니다.',
'tribute-in':'두 사람을 키워 주신 분들이 앞에 계십니다. 신랑 신부, 천천히 걸음을 옮겨 주십시오.',
'tribute-out':'오늘로 두 집안은 한 가족입니다. 두 분, 다시 앞으로 와 주세요.',
'narr-free-in':'마련된 순서가 있습니다.',
'bridge-b5-video-out':'영상은 여기까지입니다.',
'narr-letter-end':'글로 적은 말이, 목소리가 되었습니다.',
'narr-cake-out':'두 사람이 케이크에 첫 칼을 넣었습니다. 두 분, 나이프는 그 자리에 내려놓아 주세요.',
'narr-toast-out':'잔은 내려놓으셔도 됩니다.'};
const ADD={'guest-4-1min-pre':{slug:'narr-photo-ask',text:'안내 페이지의 사진 올리기로, 신랑 신부에게 보내실 수 있습니다. 같은 장면도, 계신 곳마다 다르게 담깁니다.',fire:'chain'},
'narr-candle-out':{slug:'candle-after',text:'앞에 나오신 분들께서는, 자리로 돌아가셔도 좋습니다.',fire:'chain'}};
{const out=[];cues.forEach((c,i)=>{
  if(RT[c.slug]){c={...c,file:null,rev:RV+c.slug+'.mp3',text:RT[c.slug]};}
  if(c.slug==='declare-clap-a'&&!path.includes('vow')){c={...c,file:null,rev:RV+'declare-clap-a-novow.mp3',text:'이 자리의 여러분이 두 사람의 증인이 되어 주신다면, 큰 박수로 답해 주십시오.'};}
  out.push(c);
  if(ADD[c.slug]){const a=ADD[c.slug];out.push({k:c.k,slug:a.slug,rev:RV+a.slug+'.mp3',text:a.text,fire:a.fire,isNew:1});}
  const nx=cues[i+1]; if(c.k==='entry'&&(!nx||nx.k!=='entry')) out.push({k:'entry',slug:'entry-arrive',rev:RV+'entry-arrive.mp3',text:'여러분 곁을 지나, 두 사람이 이 자리에 섰습니다.',fire:'manual',isNew:1});
});cues=out;}
// 하객 맞이: full = 넷 다 · last = 1분 전 안내만(앞뒤 이음을 듣기 위해)
{const g=cues.filter(c=>c.k==='guest'); const keep=guestMode==='full'?g:g.filter(c=>c.slug==='guest-4-1min-pre'||c.slug==='narr-photo-ask'); cues=cues.filter(c=>c.k!=='guest'||keep.includes(c));}
// ③ 케이크만 날: «축사는 따로…»를 케이크 뒤로
const ti=cues.findIndex(c=>c.k==='cake'&&c.slug==='narr-toast-none');
if(ti>-1){const t=cues.splice(ti,1)[0];let last=-1;cues.forEach((c,i)=>{if(c.k==='cake')last=i});cues.splice(last+1,0,t);}
const v={declareFamily:S.declareWho==='family',speech:O.onOf(S,'free')&&O.FREE_KIND[S.freeWhat]==='speech'};
const seq=[];let prevK=null;
cues.forEach(c=>{ const isM=path.includes(c.k);
  if(isM&&prevK&&c.k!==prevK){const L=P.lineOf(prevK,c.k,v); if(L.text) seq.push({bridge:true,k:c.k,text:L.text,file:L.file?R+'audio/narration/'+L.file+'.mp3':null,pair:NM[prevK]+' → '+NM[c.k]});}
  seq.push(c); if(isM) prevK=c.k; });
// 조립
const parts=[],lines=[];let t=0,no=0;const sil=s=>{parts.push({sil:s});t+=s;};
const dur=f=>parseFloat(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','csv=p=0',f]).toString());
let lastLive=null,lastK=null,prevBridge=false;
seq.forEach((c,i)=>{
  if(i>0){ if(lastLive){ sil(3); lines.push(`        (사람 순간 · ${lastLive} · 줄여서 3초)`);} 
    if(c.fire==='clock'&&c.k==='guest'){ lines.push('        (시각에 맞춰 나오는 안내 · 실제로는 몇 분 간격 · 줄여서 2.5초)'); }
    const pv=seq[i-1]; const g=pv&&pv.slug==='narr-vow-out'?5.5:(pv&&pv.slug==='narr-bless-end'?3.5:null); if(g&&!c.bridge){sil(g);lines.push(`        (박수 · 여운 ${g}초)`);} else sil(c.bridge?2.5:(prevBridge?1.0:(c.fire==='manual'||c.fire==='clock'?2.5:2.0))); }
  const f=c.bridge?c.file:(c.rev||(c.file?AUD+c.file+'.mp3':null));
  if(c.k!==lastK&&!c.bridge){lines.push('');lines.push('■ '+(NM[c.k]||c.blockN||c.k));lastK=c.k;}
  no++; const m=Math.floor(t/60),s=Math.floor(t%60);
  lines.push(`${String(no).padStart(2)}  ${m}:${String(s).padStart(2,'0')}  ${c.bridge?'[연결 · '+c.pair+'] ':''}${c.isNew?'[새 줄] ':(c.rev?'[고침] ':'')}${c.text||c.name}`);
  if(f&&fs.existsSync(f)){parts.push({f});t+=dur(f);} else {lines.push('        (소리 파일 없음 · 글만)');sil(2);}
  lastLive=c.live?(c.live.t||'').slice(0,30):null; prevBridge=!!c.bridge; if(c.bridge)lastK=c.k;
});
const args=['-v','error','-y'];let fc='',k=0;
parts.forEach(p=>{ if(p.f){args.push('-i',p.f);} else {args.push('-f','lavfi','-t',String(p.sil),'-i','anullsrc=r=48000:cl=mono');}
  fc+=`[${k}:a]aresample=48000,aformat=channel_layouts=mono[a${k}];`;k++;});
fc+=parts.map((_,i)=>`[a${i}]`).join('')+`concat=n=${parts.length}:v=0:a=1[o]`;
args.push('-filter_complex',fc,'-map','[o]','-b:a','128k',out);execFileSync('ffmpeg',args);
const head=`[개선안 1010] 코스 ${n} · 하객 맞이(${guestMode==='full'?'넷 다':'1분 전 안내만'}) → ${path.filter(k=>k!=='_close').map(k=>NM[k]).join(' → ')} → 닫는 인사\n갈래 · 성혼 ${decl} · 준비한 순서 ${free} · 길이 ${Math.floor(t/60)}분 ${Math.round(t%60)}초`;
fs.writeFileSync(out.replace(/\.mp3$/,'.txt'),head+'\n'+lines.join('\n')+'\n');
console.log(head);
