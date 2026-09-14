// 라이브·하객안내를 2배 해상도로 다시 찍는다 [SHOT_2X]
//   1배로 찍힌 장은 심사위원이 확대하면 계단이 보인다(실측: 「내 자리 찾기」 3배 확대에서 확인).
import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SITE=path.resolve(HERE,'../..'), OUT=path.join(HERE,'_variants'), PORT=8263;
const CONFLICT=['25명','25 Guests','스물다섯'];   // [SHOT_CONFLICT] 신청서는 「서른 분」이다
const TIGHTEN='.hero,.section{min-height:0!important}'
  +'.hero{padding:40px 22px 44px!important}.section{padding:44px 22px 0!important}'
  +'.hero-scroll{display:none!important}'
  // ★position:sticky 는 fullPage 이어붙이기에서 «맨 위»와 «스크롤 끝» 두 곳에 찍힌다.
  //   실측(2026-09-14): 1단 꼬리에 「이름·날짜·계좌 모두 예시예요」가 한 번 더 나왔다.
  +'body>div[style*="position:sticky"],body>div[style*="position: sticky"]{position:static!important}';
const T=[
  {n:'live2x',  url:'/live.html',  w:560, css:TIGHTEN},
  {n:'guide2x', url:'/guide.html?g=demo', w:560, css:''},
];
const server=spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1400));
const b=await chromium.launch();
for(const t of T){
  const page=await b.newPage({viewport:{width:t.w,height:1000},deviceScaleFactor:2});
  await page.route('**script.google.com**', r=>r.fulfill({status:200,contentType:'application/json',
    headers:{'Access-Control-Allow-Origin':'*'},body:'{"ok":true}'}));
  await page.goto(`http://localhost:${PORT}${t.url}`,{waitUntil:'domcontentloaded'});
  await page.waitForTimeout(2400);
  await page.addStyleTag({content:'*{animation:none!important;transition:none!important}'
    +'#meAdvStack,#meAdvFab,#meAdvPanel,#meAdvBackdrop,.me-fab-stack,.me-fab,.me-adv-panel,.me-adv-backdrop{display:none!important}'
    +t.css});
  await page.evaluate(async()=>{   // 스크롤로 나타나는 구간을 전부 깨운다 [SHOT_BLANK]
    document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible','revealed'));
    document.querySelectorAll('[loading="lazy"]').forEach(e=>e.setAttribute('loading','eager'));
    for(let y=0;y<document.body.scrollHeight;y+=400){window.scrollTo(0,y);await new Promise(r=>setTimeout(r,60));}
    window.scrollTo(0,0);
  });
  await page.waitForTimeout(900);
  const txt=await page.evaluate(()=>document.body.innerText||'');
  const bad=CONFLICT.filter(k=>txt.includes(k));
  console.log(`${t.n} — 글자 ${txt.length} · 어긋남 ${bad.join(',')||'없음'}`);
  if(!bad.length) await page.screenshot({path:path.join(OUT,`${t.n}.png`),fullPage:true});
  await page.close();
}
await b.close(); server.kill(); process.exit(0);
