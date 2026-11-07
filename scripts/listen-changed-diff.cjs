const path=require('path');const A=process.argv[2],B=process.argv[3];
const CA=require(path.join(A,'assets/ritual-cue.js')),OA=require(path.join(A,'assets/ritual-open.js'));
const CB=require(path.join(B,'assets/ritual-cue.js'));
const P=OA.PICKABLE.filter(k=>k!=='cake');const NX=OA.NAR_EX||{};
const OPT=[{},{meal:1,mealFull:1},{meal:1,mealFull:1,resv:'13:30'},{meal:1},{guide:false},{guide:false,meal:1,mealFull:1},{guide:false,meal:1,mealFull:1,resv:'13:30'},{digital:true},{digital:true,meal:1,mealFull:1,guide:false},{digital:true,meal:1,mealFull:1,guide:false,resv:'13:30'},
 {entry:'B'},{entry:'C'},{entry:'D'},{entry:'E'},{entry:'F'},{freeWhat:'video'},{vowKind:'thanks'},{letter:'parent'},{songBy:'self'},{pvVoice:'couple'},{guestVoice:'couple'}];
const sig=(C,S)=>{try{return C.build(JSON.parse(JSON.stringify(S)),{mode:'console'}).cues.map(c=>(c.no||c.slug||'-')+'§'+(c.text||'')+(c.live?'§L':'')+'§'+(c.k||''));}catch(e){return ['ERR '+e.message];}};
const groups=new Map();let N=0,M=0;
function cmp(S){N++;const a=sig(CA,S),b=sig(CB,S);if(a.join('\n')===b.join('\n'))return;M++;
 const n=a.length,m=b.length,L=Array.from({length:n+1},()=>new Int16Array(m+1));for(let x=n-1;x>=0;x--)for(let y=m-1;y>=0;y--)L[x][y]=a[x]===b[y]?L[x+1][y+1]+1:Math.max(L[x+1][y],L[x][y+1]);
 let x=0,y=0,ra=[],rb=[],st=-1;const flush=()=>{if(!ra.length&&!rb.length)return;const na=ra.map(t=>t.split('§')[0]),nb=rb.map(t=>t.split('§')[0]);
  const nx=(x<n?a[x]:'').split('§');const key=na.join('+')+' → '+nb.join('+')+(na.join()===nb.join()?' (글)':'')+(!nb.length?' [다음 '+(nx[nx.length-1]||'끝')+']':'');let g=groups.get(key);if(!g){g={key,n:0,ex:S,prev:st>=0?a[st]:null,next:x<n?a[x]:null,ha:ra.slice(),hb:rb.slice()};groups.set(key,g);}g.n++;g.c=(g.c||0);ra=[];rb=[];};
 while(x<n||y<m){if(x<n&&y<m&&a[x]===b[y]){flush();st=x;x++;y++;}else if(y<m&&(x>=n||L[x][y+1]>=L[x+1][y])){rb.push(b[y]);y++;}else{ra.push(a[x]);x++;}}flush();}
for(let m=0;m<(1<<P.length);m++){const on={};P.forEach((k,i)=>{if(m>>i&1)on[k]=1});
 for(const o of OPT)cmp(Object.assign({course:'open',on},o));
 for(const k of Object.keys(NX)){const L=(NX[k].names||[]).length;for(let n=1;n<L;n++){const ne={};ne[k]=n;cmp({course:'open',on,narEx:ne});}}}
for(const course of ['damback','gamdong','record'])for(const o of OPT)cmp(Object.assign({course},o));
const out={N,M,groups:[...groups.values()].sort((x,y)=>y.n-x.n)};require('fs').writeFileSync(process.argv[4],JSON.stringify(out));
console.log('조합',N,'바뀐 조합',M,'바뀜',out.groups.length);out.groups.forEach(g=>console.log(g.n,g.key));
