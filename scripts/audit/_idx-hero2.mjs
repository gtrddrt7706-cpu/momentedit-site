
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = 8202;
const server = spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1500));
const eng = await launchBrowser();
const { page } = await eng.newPage({ port:PORT, viewport:{ width:390, height:844 } });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil:'load' });
for (const wait of [1200, 4000, 8000]) {
  await page.waitForTimeout(wait===1200?1200:wait-1200);
  const h = await page.evaluate(() => {
    const hero=document.querySelector('.hero'); if(!hero) return {none:true};
    const cs=getComputedStyle(hero); const r=hero.getBoundingClientRect();
    const kids=[...hero.querySelectorAll('*')].slice(0,10).map(e=>{ const c=getComputedStyle(e); const b=e.getBoundingClientRect();
      return { t:e.tagName+(e.className&&typeof e.className==='string'?'.'+e.className.split(' ')[0]:''), op:c.opacity, bg:(c.backgroundImage||'none').slice(0,60), vis:c.visibility, h:Math.round(b.height), src:(e.currentSrc||e.src||'').split('/').pop().slice(0,24) }; });
    const img=hero.querySelector('img');
    return { rect:{t:Math.round(r.top), h:Math.round(r.height)}, op:cs.opacity, bgImg:(cs.backgroundImage||'none').slice(0,80), bg:cs.backgroundColor, kids,
      imgOk: img? { complete:img.complete, nw:img.naturalWidth, op:getComputedStyle(img).opacity, src:(img.currentSrc||'').split('/').pop() } : null };
  });
  console.log(`\n[${wait}ms] ` + JSON.stringify(h).slice(0,900));
}
await page.screenshot({ path:`${SITE}/scripts/audit/_shots/idx-hero-8s.png` });
// 스크롤 조금 내려 본다
await page.evaluate(()=>window.scrollTo(0,600)); await page.waitForTimeout(1200);
await page.screenshot({ path:`${SITE}/scripts/audit/_shots/idx-scroll600.png` });
await eng.close?.(); process.exit(0);
