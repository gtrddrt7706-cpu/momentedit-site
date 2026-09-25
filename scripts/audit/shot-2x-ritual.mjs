// 식순 화면을 2배 해상도로 다시 찍는다 — 열 장 중 이것만 폭이 552px 이라 나란히 놓으면 흐리다
import path from 'node:path'; import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SITE=path.resolve(HERE,'../..'), OUT=path.join(HERE,'_variants'), PORT=8261;
const server=spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1400));
const eng=await chromium.launch();
const page=await eng.newPage({viewport:{width:520,height:1000},deviceScaleFactor:2});
await page.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');   // [PREVIEW_GUARD_TEST_OFF]
await page.route('**script.google.com**', r=>r.fulfill({status:200,contentType:'application/json',
  headers:{'Access-Control-Allow-Origin':'*'},body:'{"ok":true}'}));
await page.goto(`http://localhost:${PORT}/order-preview.html`,{waitUntil:'domcontentloaded'});
await page.waitForTimeout(2200);
await page.addStyleTag({content:'#meAdvStack,#meAdvFab,.me-fab-stack,.me-fab{display:none!important}'
  +'*{animation:none!important;transition:none!important}'});
await page.evaluate(()=>{document.querySelectorAll('.reveal').forEach(e=>e.classList.add('visible','revealed'));});
await page.waitForTimeout(500);
const t=await page.evaluate(()=>document.body.innerText||'');
const bad=['25명','25 Guests','스물다섯'].filter(k=>t.includes(k));
console.log('글자',t.length,'· 어긋남',bad.join(',')||'없음');
if(!bad.length) await page.screenshot({path:path.join(OUT,'식순_2배__520.png')});
await eng.close(); server.kill(); process.exit(0);
