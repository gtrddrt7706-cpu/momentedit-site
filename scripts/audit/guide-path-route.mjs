#!/usr/bin/env node
/* [GUIDE_PATH_ROUTE] /g/<토큰> 이 «끝까지» 열리는가 + 로고 onerror 폴백이 «실패 경로»에서 도는가
 *
 * 왜 이 검사인가 (2026-09-11 점검에서 실제로 걸린 것)
 *   [GUIDE_PATH] 를 넣고 「정규식 반증 0건」으로 통과시켰는데, 그건 «라우트가 무엇을 받는가»만 본 것이다.
 *   ★받은 뒤 화면이 열리는지는 안 봤다. 실제로는 안 열렸다 —
 *     vercel 의 dest 는 «서버» rewrite 라 브라우저 주소는 /g/<토큰> 그대로이고
 *     location.search 가 비어 qp('g') 가 빈 값을 냈다. 「잘못된 주소예요」가 떴다.
 *   → 라우트 검사는 «정규식»이 아니라 «그 주소로 들어갔을 때 화면이 서는가»로 한다.
 *
 * ★vercel.json 의 routes 를 이 스크립트가 직접 적용한다. 안 그러면 /g/ 를 로컬에서 못 잰다.
 * ★onerror 는 «이미지를 404 로 만들어» 실패 경로를 강제한다 — 성공 경로만 보면 폴백은 영영 안 돈다.
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음)
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import zlib from 'node:zlib';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';
import { fileURLToPath } from 'node:url';
const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const MIME={'.html':'text/html','.js':'text/javascript','.css':'text/css','.png':'image/png','.jpg':'image/jpeg','.webp':'image/webp','.svg':'image/svg+xml','.woff2':'font/woff2','.mp3':'audio/mpeg','.json':'application/json'};
const GZIP=new Set(['.html','.js','.css','.svg','.json']);
const VJ=JSON.parse(fs.readFileSync(path.join(ROOT,'vercel.json'),'utf8'));
/* ★vercel.json 의 routes 를 순서대로 적용한다 — 이게 없으면 /g/ 를 «로컬에서 못 잰다». */
const ROUTES=VJ.routes.filter(r=>r.src&&r.dest);
const rewrite=(url)=>{ for(const r of ROUTES){ const m=new RegExp(r.src).exec(url);
  if(m) return r.dest.replace(/\$(\d+)/g,(_,i)=>m[+i]||''); } return url; };

let BREAK_IMG=null;                       // ②용 — 이 경로를 404 로 만들어 onerror 를 강제한다
const PORT=await freePort();
const srv=http.createServer((q,r)=>{
  const raw=q.url; const bare=raw.split('?')[0];
  let target=raw;
  if(!(fs.existsSync(path.join(ROOT,decodeURIComponent(bare))) && fs.statSync(path.join(ROOT,decodeURIComponent(bare))).isFile())) target=rewrite(bare)+ (raw.includes('?')&&!rewrite(bare).includes('?') ? '?'+raw.split('?')[1] : '');
  const f=path.join(ROOT,decodeURIComponent(target.split('?')[0]));
  if(BREAK_IMG && bare.includes(BREAK_IMG)){ r.statusCode=404; r.end('nf'); return; }
  if(!(f.startsWith(ROOT)&&fs.existsSync(f)&&fs.statSync(f).isFile())){ r.statusCode=404; r.end('nf'); return; }
  const ext=path.extname(f); let buf=fs.readFileSync(f);
  r.setHeader('content-type',MIME[ext]||'application/octet-stream');
  if(GZIP.has(ext)&&/gzip/.test(q.headers['accept-encoding']||'')){buf=zlib.gzipSync(buf,{level:6});r.setHeader('content-encoding','gzip');}
  r.setHeader('content-length',buf.length); if(q.method==='HEAD'){r.end();return;} r.end(buf);
});
await new Promise(r=>srv.listen(PORT,'127.0.0.1',r));
const eng=await launchBrowser();
if(!eng){ console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }
let bad=0; const fail=m=>{bad++;console.log('   ✗ '+m);}; const good=m=>console.log('   ✓ '+m);

console.log('\n══ ① /g/<토큰> 라우트 — vercel.json 을 실제로 적용해 끝까지 ══');
const GUIDE=JSON.stringify({ok:true,guide:{groom:'이서준',bride:'정하윤',date:'2027-12-17',seatToken:'x',seatFull:false,
  dining:{on:true,pick:'라 트라토리아',rtime:'12:30',rname:'이서준',restos:[],spots:[]},photoShare:''}});
/* ★demo 는 서버를 안 부른다(renderDemo) — «보낸 토큰»으로 판정하면 안 된다. 화면으로 본다. */
for(const [url, want] of [['/g/G1a2b3c4d5e6f7a','G1a2b3c4d5e6f7a'],['/g/demo','__DEMO__'],['/guide.html?g=G9z8y7x6w5v4u3t','G9z8y7x6w5v4u3t']]){
  const {page,errors}=await eng.newPage({port:PORT,viewport:{width:390,height:844}});
  let sent=null;
  await page.route('**://script.google.com/**', async(route)=>{ let b=''; try{b=route.request().postData()||'';}catch(e){}
    if(b.includes('guideView')){ try{ sent=JSON.parse(b).g; }catch(e){} }
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:GUIDE}); });
  const res=await page.goto(`http://localhost:${PORT}${url}`,{waitUntil:'load'}).catch(e=>null);
  await page.waitForTimeout(1400);
  const st=await page.evaluate(()=>({ 주소:location.pathname+location.search,
    제목:(document.querySelector('.sec-t')||{}).textContent||null,
    오류화면:/잘못된|만료|주소/.test(document.body.innerText.slice(0,400)),
    글:document.body.innerText.replace(/\s+/g,' ').slice(0,60) }));
  const ok = want==='__DEMO__' ? (!st.오류화면 && /이서준/.test(st.글)) : (sent===want && !st.오류화면);
  (ok?good:fail)(`${url.padEnd(26)} → 서버로 보낸 토큰 «${sent}» (기대 ${want}) · 주소 ${st.주소} · 오류화면 ${st.오류화면}${errors&&errors.length?' · pageerror '+errors.length:''}`);
  if(!ok) console.log(`        화면: ${st.글}`);
  await page.close();
}
// 경로 탈출·잘못된 토큰
/* ★'/g/../x' 는 브라우저가 «보내기 전에» 정규화해 /x 가 된다 — 내 정규식은 그걸 본 적이 없다.
   경로 탈출을 이걸로 재는 것은 틀린 측정이다. 서버에 «날것»으로 보내는 것으로 본다. */
/* ★%2e%2e%2f 는 «내 테스트 서버»가 디코드 후 파일을 찾아 200 을 냈다 — 라우트가 아니라 하네스다.
   진짜 질문(그 정규식이 무엇을 받는가)은 아래 rewrite() 직접 반증으로 본다. */
for(const [u,w] of [['/g/../x','/g/../x'],['/g/a/b','/g/a/b'],['/g/'+'a'.repeat(65),'/g/'+'a'.repeat(65)]]){
  (rewrite(u)===w? good : fail)(`rewrite(${u.slice(0,24).padEnd(24)}) → 그대로 (라우트가 안 먹는다)`);
}
for(const url of ['/g/','/g/a%2Fb']){
  const {page}=await eng.newPage({port:PORT,viewport:{width:390,height:844}});
  const res=await page.goto(`http://localhost:${PORT}${url}`,{waitUntil:'domcontentloaded'}).catch(()=>null);
  const code=res?res.status():0;
  (code===404||code===0? good : fail)(`${url.padEnd(26)} → ${code||'실패'} (404 여야 한다)`);
  await page.close();
}

console.log('\n══ ①-2 경로 형태에서 «사진 올리기»가 같은 토큰을 쓰는가 ══');
/* ★고친 것이 bindGuestUpload 의 토큰 출처(qp→guideToken)라, 화면이 뜨는 것만으로는 부족하다.
   실제로 파일을 올려 guestPhoto 요청의 g 가 경로의 토큰과 같은지 본다. */
{
  const TOK='G_test-Token_01';
  const {page,errors}=await eng.newPage({port:PORT,viewport:{width:390,height:844}});
  let photoG=null, hits=0;
  await page.route('**://script.google.com/**', async(route)=>{ let b=''; try{b=route.request().postData()||'';}catch(e){}
    if(b.includes('guideView')) return route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:GUIDE});
    hits++; try{ photoG=JSON.parse(b).g; }catch(e){}
    await route.fulfill({status:200,contentType:'application/json',headers:{'Access-Control-Allow-Origin':'*'},body:'{"ok":true}'}); });
  await page.goto(`http://localhost:${PORT}/g/${TOK}`,{waitUntil:'load'});
  await page.waitForTimeout(1400);
  const png=path.join(ROOT,'scripts/audit/_shots/_pathtok.png');
  fs.mkdirSync(path.dirname(png),{recursive:true});
  fs.writeFileSync(png, Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c6360000002000100ffff03000006000557bfabd40000000049454e44ae426082','hex'));
  const has=await page.evaluate(()=>!!document.getElementById('gpFile'));
  if(!has) fail('경로 형태에서 사진 올리기 입력칸이 없다(업로더가 배선 안 됨)');
  else{
    await page.setInputFiles('#gpFile',[png]);
    await page.waitForFunction(()=>!window.__gpBusy,null,{timeout:20000}).catch(()=>{});
    await page.waitForTimeout(500);
    (photoG===TOK? good : fail)(`업로드가 보낸 토큰 «${photoG}» (기대 ${TOK}) · 요청 ${hits}건${errors&&errors.length?' · pageerror '+errors.length:''}`);
  }
  fs.rmSync(png,{force:true});
  await page.close();
}

console.log('\n══ ② onerror 폴백 — <picture> 로 감싼 뒤 «실패 경로»가 도는가 ══');
BREAK_IMG='wordmark-only';
for(const p of ['index.html','inquiry.html','parents.html','privacy.html']){
  const {page,errors}=await eng.newPage({port:PORT,viewport:{width:1280,height:900}});
  await page.goto(`http://localhost:${PORT}/${p}`,{waitUntil:'load'});
  await page.waitForTimeout(900);
  const m=await page.evaluate(()=>{
    const img=document.querySelector('.nav-logo');
    const fb=document.querySelector('.nav-wordmark,.nav-mark-fb');
    return { 이미지숨김: img? getComputedStyle(img).display==='none' : null,
             폴백보임: fb? getComputedStyle(fb).display!=='none' : null,
             폴백글: fb? (fb.textContent||'').replace(/\s+/g,' ').trim().slice(0,20) : null };
  });
  (m.이미지숨김 && m.폴백보임 ? good : fail)(`${p.padEnd(14)} 이미지숨김=${m.이미지숨김} · 폴백보임=${m.폴백보임} 「${m.폴백글}」${errors&&errors.length?' · pageerror '+errors.length:''}`);
  await page.close();
}
BREAK_IMG=null;
await eng.close(); srv.close();
console.log(bad? `\nGUIDE PATH 위반 ${bad}건` : '\nGUIDE PATH OK — /g/<토큰>·?g= 둘 다 열리고 로고 폴백도 돈다');
process.exit(bad?1:0);
