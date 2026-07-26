import { chromium } from 'playwright';
import { createServer } from 'http';
import { readFileSync, existsSync } from 'fs';
import { join, extname } from 'path';
const ROOT='/home/claude/momentedit-site';
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json'};
const srv=createServer((req,res)=>{const p=join(ROOT,decodeURIComponent(req.url.split('?')[0]));
 if(existsSync(p)&&!p.endsWith('/')){res.setHeader('content-type',MIME[extname(p)]||'application/octet-stream');res.end(readFileSync(p));}else{res.statusCode=404;res.end('nf');}});
await new Promise(r=>srv.listen(8899,r));
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const ctx=await browser.newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true});
const pg=await ctx.newPage();
const cdp=await ctx.newCDPSession(pg);
await cdp.send('Emulation.setEmulatedMedia',{features:[{name:'hover',value:'none'},{name:'pointer',value:'coarse'}]});
await pg.goto('http://127.0.0.1:8899/index.html',{waitUntil:'load'});
await pg.addStyleTag({content:'html{scroll-behavior:auto!important}.reveal{opacity:1!important;transform:none!important}'});
await pg.waitForTimeout(700);
const r=await pg.evaluate(()=>{
  const rail=document.querySelector('.me-fab-stack').getBoundingClientRect();
  // FAQ 검색 버튼과 겹치는지
  const btn=document.querySelector('.faq-ask-btn')||document.querySelector('#faq button');
  document.querySelector('#faq').scrollIntoView({block:'center'});
  const bb=btn?btn.getBoundingClientRect():null;
  const rr=document.querySelector('.me-fab-stack').getBoundingClientRect();
  return {rail:{t:Math.round(rr.top),b:Math.round(rr.bottom),l:Math.round(rr.left)},
          btn: bb&&{t:Math.round(bb.top),b:Math.round(bb.bottom),r:Math.round(bb.right)},
          collide: bb? (rr.left<bb.right && rr.top<bb.bottom && rr.bottom>bb.top) : null};
});
console.log('FAB 박스', JSON.stringify(r.rail), '| 검색버튼', JSON.stringify(r.btn), '| 겹침', r.collide);
await browser.close(); srv.close();
