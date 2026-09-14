// ⑦가격 · ⑨하객이 만나는 화면 을 2배 해상도로 [SHOT_2X]
import path from 'node:path'; import fs from 'node:fs';
import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SITE=path.resolve(HERE,'../..'), OUT=path.join(HERE,'_variants'), PORT=8269;
const server=spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1400));
const b=await chromium.launch();
const page=await b.newPage({viewport:{width:820,height:1500},deviceScaleFactor:2});
await page.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'networkidle'}).catch(()=>{});
await page.waitForTimeout(1200);
await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'
  +'.reveal,.reveal *{opacity:1!important;transform:none!important;visibility:visible!important;filter:none!important}'
  +'#invest,#invest *,#live,#live *{opacity:1!important;transform:none!important;visibility:visible!important;filter:none!important}'
  +'#meAdvStack,#meAdvFab,.me-fab-stack,.me-fab{display:none!important}'});
// 스크롤로 깨우기
await page.evaluate(async()=>{
  document.querySelectorAll('[loading="lazy"]').forEach(e=>e.setAttribute('loading','eager'));
  for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50));}
  window.scrollTo(0,0);
});
await page.waitForTimeout(1200);
// ⑦ 가격 — 「25명이 모이는 자리라면」 문단 뒤를 DOM 에서 뺀다 [SHOT_CONFLICT]
const p=await page.evaluate(()=>{
  const sec=document.getElementById('invest');
  const kill=Array.from(sec.querySelectorAll('*')).filter(e=>{
    const t=e.textContent||''; return t.includes('25명이 모이는 자리라면')||t.includes('25 Guests');});
  let n=0; kill.filter(e=>!kill.some(o=>o!==e&&o.contains(e))).forEach(e=>{e.remove();n++;});
  const note=Array.from(sec.querySelectorAll('*')).filter(e=>(e.textContent||'').includes('선택 항목 비용은')&&e.children.length===0)[0];
  const top=sec.getBoundingClientRect().top;
  const end=note? note.getBoundingClientRect().bottom : top+900;
  const txt=sec.innerText||'';
  return {n, cut:Math.round(end-top+30), bad:['25명','25 Guests','스물다섯'].filter(k=>txt.includes(k))};
});
console.log(`⑦ 지운 문단 ${p.n} · 자를 높이 ${p.cut} · 어긋남 ${p.bad.join(',')||'없음'}`);
if(!p.bad.length){ const el=await page.$('#invest'); await el.screenshot({path:path.join(OUT,'가격2x.png')});
  fs.writeFileSync(path.join(OUT,'가격2x_cut.txt'),String(p.cut)); }
// ⑨ 하객이 만나는 화면 — ★폭 748 로 따로 찍는다.
//   820 에서는 폰 목업이 커지면서 속 iframe 이 목업 폭을 넘어 「HA YOON」이 오른쪽으로 잘렸다.
await page.close();
// ★폭 748 로 둔다. 900 이면 01~04 목록이 폰 «옆»에 서서 세로가 짧아지지만(2.08→1.45배),
//   그 폭에서는 iframe 이 백지로 찍힌다 — 목업 크기가 바뀌며 축소(scale) 계산이 어긋난다.
//   resize 이벤트를 태워 transform·opacity·상자 크기를 정상으로 만들어도 내용이 그려지지 않았다(실측).
//   ★폰 안의 «살아 있는 청첩장»이 이 사진의 핵심이라 그것을 잃으면 안 된다.
//   세로가 긴 문제는 캡처 뒤에 «좌우 여백 제거 + 2단»으로 푼다(배율 29%→42%).
const page2=await b.newPage({viewport:{width:748,height:1400},deviceScaleFactor:2});
await page2.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'networkidle'}).catch(()=>{});
await page2.waitForTimeout(1200);
await page2.addStyleTag({content:'*{animation:none!important;transition:none!important}'
  +'.reveal,.reveal *{opacity:1!important;transform:none!important;visibility:visible!important;filter:none!important}'
  // ★.ga-frame 은 «제외»한다 — 이 iframe 은 폭 390px 을 transform:scale 로 줄여 폰 목업에 맞춘다.
  //   transform:none 을 걸면 축소가 풀려 목업 밖으로 삐져나오고 「HA YOON」이 오른쪽에서 잘린다(실측).
  +'#live:not(.ga-frame),#live *:not(.ga-frame){opacity:1!important;visibility:visible!important;filter:none!important}'
  +'#live>*:not(.ga-frame){transform:none!important}'
  +'.ga-frame{opacity:1!important}'
  +'#meAdvStack,#meAdvFab,.me-fab-stack,.me-fab{display:none!important}'});
await page2.evaluate(async()=>{
  document.querySelectorAll('[loading="lazy"]').forEach(e=>e.setAttribute('loading','eager'));
  for(let y=0;y<document.body.scrollHeight;y+=500){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,50));}
  window.scrollTo(0,0);
});
await page2.waitForTimeout(900);
// ★iframe#gaFrame 은 «화면에 들어와야» src 가 채워진다(lazy). 요소 캡처만 하면 폰 목업이 백지다.
//   실측(2026-09-14): 스크롤로 깨워도 비어 있었다 — 그 자리에 머무르며 src 가 붙기를 기다린다.
await page2.evaluate(()=>{ const f=document.getElementById('gaFrame'); if(f) f.scrollIntoView({block:'center'}); });
await page2.waitForTimeout(1200);
try{
  await page2.waitForFunction(()=>{ const f=document.getElementById('gaFrame');
    return f && f.src && f.src.length>10; }, {timeout:8000});
  const fr=page2.frame({url:u=>/live|invite|guide/.test(String(u))});
  if(fr) await fr.waitForLoadState('load').catch(()=>{});
  await page2.waitForTimeout(2500);
  // ★iframe 안이 «마지막 구간(봉투·계좌)»에 가 있었다 — 목록은 01 Invitation 이 활성인데 화면은 04 였고,
  //   예시 계좌번호까지 사진에 찍혔다. 맨 위(초대장 표지)로 돌려 목록과 짝을 맞춘다.
  if(fr){ await fr.evaluate(()=>{ window.scrollTo(0,0); document.documentElement.scrollTop=0;
    if(document.body) document.body.scrollTop=0; }).catch(()=>{}); }
  await page2.waitForTimeout(1200);
  const filled=await page2.evaluate(()=>{ const f=document.getElementById('gaFrame');
    try{ return (f.contentDocument.body.innerText||'').trim().length; }catch(e){ return -1; } });
  console.log('   gaFrame 속 글자', filled);
}catch(e){ console.log('   gaFrame 안 채워짐:', String(e).slice(0,60)); }
// ★폭을 900 으로 넓히면 목업 크기가 바뀌는데 iframe 축소(scale) 계산이 다시 돌지 않아
//   폰 안이 백지로 찍혔다(실측). 리사이즈를 한 번 태워 다시 계산하게 한다.
await page2.evaluate(()=>window.dispatchEvent(new Event('resize')));
await page2.waitForTimeout(1500);
await page2.evaluate(()=>{ const f=document.getElementById('gaFrame');
  if(f){ f.classList.add('ready'); f.style.opacity='1'; } });
await page2.waitForTimeout(600);
const seen=await page2.evaluate(()=>{ const f=document.getElementById('gaFrame');
  if(!f) return 'no frame';
  const cs=getComputedStyle(f), r=f.getBoundingClientRect();
  return `opacity=${cs.opacity} transform=${cs.transform.slice(0,28)} box=${Math.round(r.width)}x${Math.round(r.height)}`; });
console.log('   gaFrame 상태:', seen);
await page2.evaluate(()=>window.scrollTo(0,0));
await page2.waitForTimeout(500);
const g=await page2.evaluate(()=>{
  const sec=document.getElementById('live');
  const txt=sec.innerText||'';
  return {bad:['25명','25 Guests','스물다섯'].filter(k=>txt.includes(k)), len:txt.length};
});
console.log(`⑨ 글자 ${g.len} · 어긋남 ${g.bad.join(',')||'없음'}`);
if(!g.bad.length){ const el=await page2.$('#live'); await el.screenshot({path:path.join(OUT,'확장장소2x.png')}); }
await b.close(); server.kill(); process.exit(0);
