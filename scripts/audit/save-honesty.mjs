/* [SAVE_FALSE_OK 2026-08-16 사용자 지시 "데이터 저장 비슷한경우 전수점검"]
   저장 정직성 게이트 — **서버를 끊어 놓고** 저장 손잡이를 실제로 눌러, 화면이
   ①성공이라고 말하지 않는가 ②실패했다고 말하는가 ③되돌릴 것을 되돌리는가 를 본다.
   ★이 검사가 없던 동안 같은 병이 여러 곳에 살았다 — 정적 읽기로는 'undefined 가 검사를 통과하는' 모양을 놓친다. */
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
const HERE=path.dirname(fileURLToPath(import.meta.url));
const SITE=path.resolve(HERE,'../..'); const PORT=8141;
let fail=0;
const ok=(c,m,d)=>{ console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+d}`); if(!c) fail++; };
const eng=await launchBrowser();
if(!eng){ console.log('save-honesty 건너뜀 — 브라우저 없음.'); process.exit(0); }
const srv=spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
await new Promise(r=>setTimeout(r,1500));
try{
const { page }=await eng.newPage({ port:PORT, viewport:{width:390,height:844} });
await page.goto(`http://localhost:${PORT}/mypage.html`,{waitUntil:'load'});
await new Promise(r=>setTimeout(r,900));

// 서버를 끊고, 화면이 사용자에게 한 말을 함수 단에서 가로챈다
const cut=(mode)=>page.evaluate((mode)=>{
  window.__said=[];
  ['_miniToast','mpToast','mpAlert'].forEach(function(n){ const o=window[n]; if(typeof o!=='function') return;
    if(!o.__wrapped){ const w=function(){ try{ window.__said.push(String(arguments[0]).slice(0,70)); }catch(e){} return Promise.resolve(true); }; w.__wrapped=true; window[n]=w; } });
  const oc=window.mpConfirm; if(typeof oc==='function' && !oc.__wrapped){ const w=function(o){ try{ window.__said.push('confirm: '+String((o&&o.title)||'').slice(0,40)); }catch(e){} return Promise.resolve(false); }; w.__wrapped=true; window.mpConfirm=w; }
  const fail=()=> (mode==='reject') ? Promise.reject(new Error('네트워크 끊김')) : Promise.resolve({ok:false,error:'서버 거절(점검)'});
  window.apiTrackSave=fail;
  window._mpStateD={production:{base:{weddingDate:'2026-10-26'},tracks:{}}};
  try{ show('mypageView'); const b=document.getElementById('mp_production'); if(b) b.style.display='block'; }catch(e){}
}, mode);

for(const mode of ['reject','okfalse']){
  const label=(mode==='reject')?'네트워크가 끊겼을 때':'서버가 거절했을 때';

  console.log(`\n[다이닝 '완료' — ${label}]`);
  await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800)); await cut(mode);
  const done=await page.evaluate(async()=>{
    startTrkFlow('dining',{venuePick:'다이닝 없이 진행할게요',dining_on:'N',_step:1},{weddingDate:'2026-10-26'});
    await new Promise(r=>setTimeout(r,400));
    const b=document.getElementById('trk_next'); if(!b) return {no:true};
    b.click(); await new Promise(r=>setTimeout(r,600));
    return { open:(typeof TRKFLOW!=='undefined'&&TRKFLOW.active), err:(document.getElementById('trk_err')||{}).textContent||'',
      btn:(document.getElementById('trk_next')||{}).textContent||'' };
  });
  ok(!done.no && done.open, '저장에 실패하면 위저드를 닫지 않는다 [SAVE_FALSE_OK]', JSON.stringify(done));
  ok(/안 됐어요|거절/.test(done.err), '실패했다고 화면에 적는다', done.err.slice(0,50));
  ok(/완료/.test(done.btn), "단추가 '저장 중…'에 멈추지 않고 되돌아온다", done.btn);

  console.log(`\n[다이닝 '예식만으로 조용히 마무리' — ${label}]`);
  await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800)); await cut(mode);
  const none=await page.evaluate(async()=>{
    startTrkFlow('dining',{},{weddingDate:'2026-10-26'});
    await new Promise(r=>setTimeout(r,400));
    const b=document.getElementById('dn_none'); if(!b) return {no:true};
    b.click(); await new Promise(r=>setTimeout(r,700));
    return { step:TRKFLOW.step, pick:String(TRKFLOW.draft.venuePick||''), said:(window.__said||[]).join(' | ') };
  });
  ok(!none.no && none.step===0, "실패하면 '안내 없이 진행해요' 완료 화면으로 넘어가지 않는다 [SAVE_FALSE_OK]", JSON.stringify(none));
  ok(none.pick==='', '서버가 모르는 결정을 화면만 기억하지 않는다(되돌림)', none.pick);
  ok(/안 됐어요|거절/.test(none.said), '실패했다고 말한다', none.said.slice(0,60));

  console.log(`\n[찜 · 하객 공개 토글 — ${label}]`);
  await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800)); await cut(mode);
  const fav=await page.evaluate(async()=>{
    /* 취합 뷰(_step:1)에서만 공개 토글이 있고, **대표로 뽑힌 곳엔 없다**(대표는 항상 공개) —
       그래서 두 곳을 담아 대표가 아닌 쪽의 토글을 누른다. */
    startTrkFlow('dining',{_favs:[{n:'대표식당',m:'메모',show:false,src:'db'},{n:'둘째식당',m:'메모2',show:false,src:'db'}],venuePick:'대표식당',_step:1},{weddingDate:'2026-10-26'});
    await new Promise(r=>setTimeout(r,500));
    const b=document.querySelector('[data-favshow]'); if(!b) return {no:true, btns:[...document.querySelectorAll('button')].map(x=>x.textContent.trim().slice(0,12)).slice(0,10).join(',')};
    b.click(); await new Promise(r=>setTimeout(r,700));
    const v=(TRKFLOW.draft._favs||[]).filter(function(x){return x.n==='둘째식당';})[0]||{};
    return { show:v.show===true, said:(window.__said||[]).join(' | ') };
  });
  if(fav.no) ok(false, '공개 토글을 화면에서 찾지 못했다(검사 자체가 헛돎)', fav.btns||'');
  else {
    ok(!fav.show, '저장에 실패하면 공개 상태를 되돌린다 [SAVE_FALSE_OK]', String(fav.show));
    ok(/안 됐어요/.test(fav.said), '하객에게 보이는 설정이 어긋나면 말해 준다', fav.said.slice(0,60));
  }
}
console.log(`\n결과 — ${fail?('실패 '+fail+'건'):'실패 0건 (전부 통과)'}`);
}catch(e){ console.log('오류:', e.message); fail++; }
finally{ await eng.close?.(); srv.kill(); }
process.exit(fail?1:0);
