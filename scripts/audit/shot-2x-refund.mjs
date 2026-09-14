// 환불 조항 FAQ 를 2배 해상도로 [SHOT_2X]
//   ★앞서 세 번 실패한 이유 — #faq 를 통째로 요소 캡처했다. 4.9만px 문서라 스크롤 보정이 어긋났다.
//     정답은 «작은 항목 하나»를 잡는 것(apply-shots-full.mjs:121 findSection 과 같은 방식).
import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SITE=path.resolve(HERE,'../..'), OUT=path.join(HERE,'_variants'), PORT=8265;
const server=spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1400));
const b=await chromium.launch();
const page=await b.newPage({viewport:{width:760,height:1400},deviceScaleFactor:2});
await page.goto(`http://localhost:${PORT}/index.html`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2000);
await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'
  +'.reveal,.reveal *{opacity:1!important;transform:none!important}'
  +'#meAdvStack,#meAdvFab,.me-fab-stack,.me-fab{display:none!important}'
  // ★아코디언 «열림» 표시(×)는 제출용 사진에서 «닫기 버튼»으로 읽힌다 — 뜻이 없으니 숨긴다
  +'.faq-q::after{display:none!important}'});
await page.evaluate(()=>{const t=document.getElementById('faqMoreToggle'); if(t) t.click();});
await page.waitForTimeout(600);
const info=await page.evaluate(()=>{
  const it=Array.from(document.querySelectorAll('.faq-item'))
    .find(e=>(e.textContent||'').includes('150일(5개월) 전까지'));
  if(!it) return {err:'항목 없음'};
  it.classList.add('open');
  const a=it.querySelector('.faq-a');
  if(a){a.style.display='block';a.style.maxHeight='none';a.style.height='auto';a.style.overflow='visible';a.style.opacity='1';}
  it.id='refundItem';
  const txt=it.innerText||'';
  return {bad:['25명','25 Guests','스물다섯'].filter(k=>txt.includes(k)), len:txt.length};
});
if(info.err){ console.log('✗ '+info.err); await b.close(); process.exit(1); }
console.log(`글자 ${info.len} · 어긋남 ${info.bad.join(',')||'없음'}`);
const el=await page.$('#refundItem');
await el.scrollIntoViewIfNeeded(); await page.waitForTimeout(500);
if(!info.bad.length) await el.screenshot({path:path.join(OUT,'환불2x.png')});
await b.close(); server.kill(); process.exit(0);
