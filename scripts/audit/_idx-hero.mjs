
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = 8201;
const server = spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1500));
const eng = await launchBrowser();
const { page } = await eng.newPage({ port:PORT, viewport:{ width:390, height:844 } });
const reqs=[]; page.on('response', r=>{ if(/\.(jpg|jpeg|png|webp|avif)/i.test(r.url())) reqs.push(r.status()+' '+r.url().split('/').pop().slice(0,40)); });
await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil:'load' });
await page.waitForTimeout(5000);
const hero = await page.evaluate(() => {
  const cands=[...document.querySelectorAll('*')].filter(e=>{ const r=e.getBoundingClientRect(); return r.top<50 && r.height>400 && r.width>300; }).slice(0,6);
  return cands.map(e=>{ const cs=getComputedStyle(e); return { tag:e.tagName, id:e.id, cls:(e.className&&typeof e.className==='string'?e.className.slice(0,40):''),
    bgImg:(cs.backgroundImage||'').slice(0,90), bg:cs.backgroundColor, h:Math.round(e.getBoundingClientRect().height),
    kids:[...e.children].map(c=>c.tagName+(c.className&&typeof c.className==='string'?'.'+c.className.split(' ')[0]:'')).slice(0,6) }; });
});
console.log('── 첫 화면을 채우는 요소들 ──');
hero.forEach(h=>console.log(JSON.stringify(h)));
const vids = await page.evaluate(()=>[...document.querySelectorAll('video')].map(v=>({src:(v.currentSrc||v.src||'').split('/').pop(), paused:v.paused, ready:v.readyState, w:v.videoWidth})));
console.log('\n── video ──'); console.log(JSON.stringify(vids));
console.log('\n── 로드된 이미지 응답(앞 12) ──'); console.log(reqs.slice(0,12).join('\n') || '(없음)');
await page.screenshot({ path:`${SITE}/scripts/audit/_shots/idx-hero-5s.png` });
await eng.close?.(); process.exit(0);
