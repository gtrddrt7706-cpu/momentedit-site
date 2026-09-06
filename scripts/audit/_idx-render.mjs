
// 메인 홈 실렌더 — 390/1280 · 콘솔 오류 · 넘침 · 섹션 위치 · 첫 화면에 무엇이 보이는가
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = Number(process.env.PORT || 8200);
const server = spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1500));
const eng = await launchBrowser(); if(!eng){ console.log('브라우저 없음'); process.exit(0); }
for (const [W,H,tag] of [[390,844,'mo'],[1280,900,'pc']]) {
  const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:W, height:H } });
  await page.goto(`http://localhost:${PORT}/index.html`, { waitUntil:'load' });
  await page.waitForTimeout(2500);
  const r = await page.evaluate((H) => {
    const secs = [...document.querySelectorAll('section[id]')].map(s=>({ id:s.id, top:Math.round(s.getBoundingClientRect().top+scrollY), h:Math.round(s.getBoundingClientRect().height) }));
    const firstText = (document.body.innerText||'').slice(0,300).replace(/\n+/g,' | ');
    const imgs=[...document.querySelectorAll('img')];
    const cta=[...document.querySelectorAll('a,button')].filter(e=>/문의|상담|예약|신청|RSVP|Inquiry/i.test(e.textContent||'')).map(e=>({t:(e.textContent||'').trim().slice(0,20), top:Math.round(e.getBoundingClientRect().top+scrollY)}));
    return { h:document.documentElement.scrollHeight, ovf:Math.max(document.documentElement.scrollWidth,document.body.scrollWidth)-innerWidth,
      secs, firstText, img:{ total:imgs.length, lazy:imgs.filter(i=>i.loading==='lazy').length, noalt:imgs.filter(i=>!i.alt).length, broken:imgs.filter(i=>i.complete&&i.naturalWidth===0).length },
      cta: cta.slice(0,6), 첫CTA: cta.length?cta[0].top:null, title:document.title, h1:[...document.querySelectorAll('h1')].map(x=>x.textContent.trim().slice(0,40)) };
  }, H);
  console.log(`\n════ ${W}px ════ 문서 ${r.h}px · 가로넘침 ${r.ovf} · 이미지 ${r.img.total}(lazy ${r.img.lazy} · alt없음 ${r.img.noalt} · 깨짐 ${r.img.broken})`);
  console.log('title: ' + r.title);
  console.log('h1: ' + JSON.stringify(r.h1));
  console.log('섹션: ' + r.secs.map(s=>`${s.id}@${s.top}(${s.h})`).join(' '));
  console.log('첫 화면 글: ' + r.firstText.slice(0,180));
  console.log('첫 CTA 위치: ' + r.첫CTA + 'px' + (r.첫CTA!==null && r.첫CTA<H ? ' ★첫화면' : ' ▼스크롤'));
  const real = errors.filter(e=>!/googletagmanager|fonts\.g|ERR_FAILED|net::/i.test(e));
  console.log('콘솔 오류(외부자원 제외): ' + (real.length? real.slice(0,3).join(' | ') : '0'));
  await page.screenshot({ path: `${SITE}/scripts/audit/_shots/idx-${tag}.png`, fullPage:false });
  await page.close();
}
await eng.close?.(); process.exit(0);
