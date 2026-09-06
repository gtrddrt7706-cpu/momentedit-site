// 홈(index.html) 접근성·성능 실측 — 일회성 점검용(1280/390)
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const MIME = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.ico':'image/x-icon','.json':'application/json','.mp3':'audio/mpeg','.mp4':'video/mp4'};
const PORT = await freePort();
const srv = http.createServer((req,res)=>{ const f=path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile()){res.setHeader('content-type',MIME[path.extname(f)]||'application/octet-stream');res.end(fs.readFileSync(f));}
  else {res.statusCode=404;res.end('nf');} });
await new Promise((r,j)=>{srv.on('error',j);srv.listen(PORT,'127.0.0.1',r);});
const eng = await launchBrowser();
if(!eng){ console.log('· 못 봄(브라우저 없음)'); srv.close(); process.exit(2); }

const A11Y = `(() => {
  const out = { head:[], link:[], btn:[], aria:[], dupid:[], land:{}, tab:[], lang:document.documentElement.lang||'', contrast:[], meta:{} };
  // 1. 제목 계층
  const hs=[...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].filter(h=>h.offsetParent!==null||h.tagName==='H1');
  out.meta.h1 = document.querySelectorAll('h1').length;
  let prev=0; hs.forEach(h=>{ const lv=+h.tagName[1];
    if(prev && lv>prev+1) out.head.push({from:prev,to:lv,t:h.textContent.replace(/\\s+/g,' ').trim().slice(0,40)});
    prev=lv; });
  // 2. 링크·버튼 이름
  const nameOf=(el)=>((el.getAttribute('aria-label')||'')+' '+(el.getAttribute('title')||'')+' '+el.textContent+' '+
    [...el.querySelectorAll('img')].map(i=>i.alt).join(' ')).replace(/\\s+/g,' ').trim();
  document.querySelectorAll('a[href]').forEach(a=>{ const r=a.getBoundingClientRect();
    if(r.width===0&&r.height===0) return; const n=nameOf(a);
    if(!n) out.link.push({why:'이름없음', href:a.getAttribute('href').slice(0,40)});
    else if(/^(여기|클릭|더보기|자세히|link|here)$/i.test(n)) out.link.push({why:'맥락없는 이름', n, href:a.getAttribute('href').slice(0,40)});
  });
  document.querySelectorAll('button,[role=button]').forEach(b=>{ const r=b.getBoundingClientRect();
    if(r.width===0&&r.height===0) return; if(!nameOf(b)) out.btn.push({cls:(b.className||'').toString().slice(0,40)}); });
  // 3. aria 오용 + tabindex
  document.querySelectorAll('[aria-labelledby],[aria-describedby],[aria-controls]').forEach(el=>{
    ['aria-labelledby','aria-describedby','aria-controls'].forEach(k=>{ const v=el.getAttribute(k); if(!v) return;
      v.split(/\\s+/).forEach(id=>{ if(!document.getElementById(id)) out.aria.push({k,id,el:el.tagName+'.'+(el.className||'').toString().slice(0,24)}); }); }); });
  document.querySelectorAll('[tabindex]').forEach(el=>{ const t=+el.getAttribute('tabindex'); if(t>0) out.tab.push({t,el:el.tagName+'.'+(el.className||'').toString().slice(0,24)}); });
  // 4. 중복 id
  const seen={}; document.querySelectorAll('[id]').forEach(el=>{ const i=el.id; seen[i]=(seen[i]||0)+1; });
  Object.keys(seen).forEach(i=>{ if(seen[i]>1) out.dupid.push({id:i,n:seen[i]}); });
  // 5. 랜드마크
  out.land = { main:document.querySelectorAll('main,[role=main]').length, nav:document.querySelectorAll('nav,[role=navigation]').length,
    header:document.querySelectorAll('header,[role=banner]').length, footer:document.querySelectorAll('footer,[role=contentinfo]').length,
    skip:!!document.querySelector('a[href^="#"][class*=skip],a[href^="#"][class*=Skip],.skip-link') };
  // 6. 대비 — 배경을 위로 훑어 불투명한 색을 찾는다. 이미지·그라디언트 위면 '확인불가'로 센다.
  const px=(c)=>{ const m=(c||'').match(/[\\d.]+/g); return m?m.map(Number):null; };
  const lum=(r,g,b)=>{ const f=(v)=>{v/=255; return v<=0.03928?v/12.92:Math.pow((v+0.055)/1.055,2.4);}; return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b); };
  let skipped=0;
  document.querySelectorAll('p,span,a,li,h1,h2,h3,h4,h5,h6,button,div,td,th,label,small,strong,em').forEach(el=>{
    if(!el.firstChild) return;
    const own=[...el.childNodes].filter(n=>n.nodeType===3&&n.textContent.trim().length>1);
    if(!own.length) return;
    const r=el.getBoundingClientRect(); if(r.width<2||r.height<2) return;
    const cs=getComputedStyle(el); if(cs.visibility==='hidden'||cs.display==='none'||+cs.opacity<0.15) return;
    const fg=px(cs.color); if(!fg) return; if(fg[3]!==undefined&&fg[3]<0.15) return;
    let bg=null, node=el, imgy=false;
    while(node&&node!==document.documentElement){ const c=getComputedStyle(node);
      if(c.backgroundImage&&c.backgroundImage!=='none'){ imgy=true; break; }
      const b=px(c.backgroundColor);
      if(b&&(b[3]===undefined||b[3]>0.85)){ bg=b; break; }
      node=node.parentElement; }
    if(imgy||!bg){ skipped++; return; }
    const L1=lum(fg[0],fg[1],fg[2]), L2=lum(bg[0],bg[1],bg[2]);
    const ratio=(Math.max(L1,L2)+0.05)/(Math.min(L1,L2)+0.05);
    const size=parseFloat(cs.fontSize), bold=+cs.fontWeight>=700;
    const need=(size>=24||(size>=18.66&&bold))?3.0:4.5;
    if(ratio<need) out.contrast.push({ratio:+ratio.toFixed(2),need,size:+size.toFixed(1),
      t:el.textContent.replace(/\\s+/g,' ').trim().slice(0,32), fg:cs.color, bg:'rgb('+bg.slice(0,3).join(',')+')'});
  });
  out.meta.contrastSkipped = skipped;
  out.meta.nodes = document.querySelectorAll('*').length;
  return out;
})()`;

const TAP = `(() => {
  const SEL='a[href],button,[role=button],input,select,textarea,summary,[onclick]';
  const small=[];
  document.querySelectorAll(SEL).forEach(el=>{ const r=el.getBoundingClientRect();
    if(r.width<2||r.height<2) return; const cs=getComputedStyle(el);
    if(cs.visibility==='hidden'||cs.display==='none') return;
    if(r.height<43||r.width<43) small.push(el); });
  return small.length;
})()`;

const results={};
for(const W of [1280,390]){
  const { page, errors } = await eng.newPage({ port: PORT, viewport:{width:W,height:900} });
  const reqs=[]; let bytes=0;
  page.on('response', async(r)=>{ try{ if(r.url().includes(`localhost:${PORT}`)){ const b=await r.body(); bytes+=b.length; reqs.push({u:r.url().split('/').pop().slice(0,34), n:b.length}); } }catch{} });
  const t0=Date.now();
  await page.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'load'});
  const loadMs=Date.now()-t0;
  await page.waitForTimeout(1500);
  await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight)); await page.waitForTimeout(1200);
  await page.evaluate(()=>window.scrollTo(0,0)); await page.waitForTimeout(400);
  const a=await page.evaluate(A11Y);
  const smallN=await page.evaluate(TAP);
  // 작은 표적의 실제 히트영역 — ::after/::before 확장을 좌표로 확인
  const tapBad=await page.evaluate(()=>{
    const SEL='a[href],button,[role=button],input,select,textarea,summary,[onclick]';
    const bad=[]; const els=[...document.querySelectorAll(SEL)].filter(el=>{const r=el.getBoundingClientRect();
      if(r.width<2||r.height<2) return false; const cs=getComputedStyle(el);
      if(cs.visibility==='hidden'||cs.display==='none') return false; return r.height<43; });
    const prevBeh=document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior='auto';
    for(const el of els){ el.scrollIntoView({block:'center'});
      const r=el.getBoundingClientRect(); const cx=r.left+r.width/2, cy=r.top+r.height/2;
      if(cy-21<0||cy+21>window.innerHeight||cx<0||cx>window.innerWidth) continue;
      const hit=(x,y)=>{ const t=document.elementFromPoint(x,y); return !!(t&&(t===el||el.contains(t)||t.contains(el))); };
      if(!(hit(cx,cy-21)&&hit(cx,cy+21))) bad.push({ h:+r.height.toFixed(1), w:+r.width.toFixed(1),
        t:(el.textContent||el.getAttribute('aria-label')||el.className||'').toString().replace(/\s+/g,' ').trim().slice(0,30) });
    }
    document.documentElement.style.scrollBehavior=prevBeh; return bad;
  });
  reqs.sort((x,y)=>y.n-x.n);
  results[W]={a,smallN,tapBad,loadMs,bytes,reqN:reqs.length,top:reqs.slice(0,6),errors:errors.slice(0,5)};
  await page.close();
}
await eng.close(); srv.close();

for(const W of [1280,390]){
  const R=results[W], a=R.a;
  console.log(`\n══════ ${W}px ══════`);
  console.log(`load ${R.loadMs}ms · 요청 ${R.reqN}건 · 전송 ${(R.bytes/1024).toFixed(0)}KB · DOM ${a.meta.nodes}개 · 콘솔오류 ${R.errors.length}`);
  console.log(`상위: ${R.top.map(t=>`${t.u} ${(t.n/1024).toFixed(0)}KB`).join(' · ')}`);
  console.log(`lang="${a.lang}" · h1 ${a.meta.h1}개 · main ${a.land.main} nav ${a.land.nav} header ${a.land.header} footer ${a.land.footer} · 건너뛰기링크 ${a.land.skip?'있음':'없음'}`);
  const line=(name,arr,fmt)=>console.log(arr.length?`✗ ${name} ${arr.length}건\n   `+arr.slice(0,8).map(fmt).join('\n   '):`✓ ${name} 0`);
  line('제목계층 건너뜀', a.head, x=>`h${x.from}→h${x.to} 「${x.t}」`);
  line('링크 이름', a.link, x=>`${x.why} ${x.n||''} → ${x.href}`);
  line('버튼 이름없음', a.btn, x=>x.cls);
  line('aria 참조끊김', a.aria, x=>`${x.k}="${x.id}" (${x.el})`);
  line('중복 id', a.dupid, x=>`#${x.id} ×${x.n}`);
  line('tabindex 양수', a.tab, x=>`${x.t} ${x.el}`);
  line('대비 미달', a.contrast, x=>`${x.ratio}:1 (필요 ${x.need}) ${x.size}px 「${x.t}」 ${x.fg} on ${x.bg}`);
  console.log(`   (대비 확인불가 ${a.meta.contrastSkipped}개 — 이미지·그라디언트 위)`);
  console.log(R.tapBad.length?`✗ 탭 표적 44px 미달 ${R.tapBad.length}건\n   `+R.tapBad.slice(0,10).map(x=>`${x.h}px 「${x.t}」`).join('\n   '):`✓ 탭 표적 44px (작은 요소 ${R.smallN}개 전부 히트영역 확장됨)`);
  if(R.errors.length) console.log('오류: '+R.errors.join(' | '));
}
