// ★[SEAT_EX_SHOT 2026-11-22 영상 섹션 → 오프라인 디자인 · 사장님 «하객 입장에서 보여주는 게 이해가 더 쉬울 것 같아»]
//   마이페이지 좌석표 «하객분들께 어떻게 보여드릴까요?» 두 칸(전체 공개 · 내 자리만 검색)에 넣는 «하객 화면 예시» 그림을 seat.html 실화면으로 찍는다.
//   예시 성함은 실명처럼 안 보이게 «성 + ○○» · 배치도(assets/seat-plan.js)를 바꾸면 이 스크립트로 다시 찍는다.
//   전체 공개는 성함이 보이는 배치도부터(그 칸 설명이 «검색 없이 바로»라 검색창을 넣지 않는다) · 내 자리만은 검색창 + 답 + 내 자리 알약
//   쓰기: node scripts/seat-example-shots.mjs → assets/seat/ex-all.webp · ex-mine.webp (폰 390 · 2배 · 358×300)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const ROOT=path.resolve(path.dirname(new URL(import.meta.url).pathname),'..'), OUT=path.join(ROOT,'assets/seat'); import { execFileSync } from 'node:child_process';
let pw0=null; for (const p of ['playwright','/opt/node22/lib/node_modules/playwright']) { try { pw0=require(p); break; } catch {} }
const srv=http.createServer((q,r)=>{let u=decodeURIComponent(q.url.split('?')[0]); const p=path.join(ROOT,u); fs.readFile(p,(e,b)=>{ if(e){r.writeHead(404);return r.end();} r.writeHead(200,{'Content-Type':/\.html$/.test(p)?'text/html; charset=utf-8':/\.js$/.test(p)?'text/javascript':/\.css$/.test(p)?'text/css':/\.woff2$/.test(p)?'font/woff2':'application/octet-stream'}); r.end(b);});});
await new Promise(r=>srv.listen(0,'127.0.0.1',r)); const BASE='http://127.0.0.1:'+srv.address().port;
const br=await pw0.chromium.launch();
const SUR='김 이 박 최 정 강 조 윤 장 임 한 오 서 신 권 황 안 송 류 홍 전 고 문 양 손 배 백 허 유 남 심 노 하 곽 성'.split(' ');
const C=[['L',5],['L',3],['L',3],['L',5],['R',4],['R',4],['R',3],['R',3],['R',5]]; let k=0;
const tables=C.map(([s,n],i)=>({name:'테이블 '+(i+1),side:s,seats:Array.from({length:n},()=>SUR[k++]+'○○')}));
const ME='한○○', hti=0, mi=1; tables[hti].seats[mi]=ME;
const seat={groom:'신랑',bride:'신부',date:'2027-05-15',tables};
const room=tables.map((t,i)=>({no:i+1,label:t.name,side:t.side,occ:t.seats.map(x=>x?1:0)}));
for (const mode of ['all','mine']){
  const ctx=await br.newContext({viewport:{width:390,height:1100},deviceScaleFactor:2}); await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  await ctx.route('**/*',async rt=>{const u=rt.request().url(); if(u.includes('script.google.com')){ let b={}; try{b=JSON.parse(rt.request().postData()||'{}')}catch{}
    let r; if(mode==='all') r={ok:true,seat}; else if(!b.q) r={ok:false,mineOnly:true,seat:{groom:seat.groom,bride:seat.bride,date:seat.date}}; else r={ok:true,hits:[{no:1,label:'테이블 1',hti,mi:[mi],nm:ME,room}]};
    return rt.fulfill({status:200,headers:{'Access-Control-Allow-Origin':'*','Content-Type':'application/json'},body:JSON.stringify(r)}); } if(!u.startsWith(BASE)) return rt.abort(); return rt.continue();});
  const page=await ctx.newPage(); page.on('pageerror',e=>console.log('ERR',e.message));
  await page.goto(BASE+'/seat.html?t=TESTTOKEN'); await page.waitForTimeout(1500);
  if(mode==='mine'){ await page.fill('#q',ME); await page.waitForTimeout(1800); }
  await page.evaluate(()=>document.activeElement&&document.activeElement.blur()); await page.waitForTimeout(200);
  await page.evaluate(()=>{ document.querySelectorAll('.me-fab-stack,[class*="fab"]').forEach(e=>e.style.display='none'); });
  const box=await page.evaluate(()=>{ const r=(s)=>{const e=document.querySelector(s); if(!e) return null; const b=e.getBoundingClientRect(); return {x:b.left,y:b.top+scrollY,w:b.width,h:b.height};}; return {find:r('.find'), map:r('.gmap .smap'), card:r('.wrap'), stage:r('.stage')}; });
  const png=path.join(OUT,`ex-${mode}.png`); await page.screenshot({path:png,clip:{x:16,y:(mode==='all'?box.stage.y:box.find.y)-14,width:358,height:300}});
  execFileSync('python3',['-c',`from PIL import Image; im=Image.open('${png}').convert('RGB'); im.save('${png.replace(/\.png$/,'.webp')}','WEBP',quality=82,method=6)`]); fs.unlinkSync(png);
  console.log('찍음', mode, png.replace(/\.png$/,'.webp'));
  await ctx.close();
}
await br.close(); srv.close();
