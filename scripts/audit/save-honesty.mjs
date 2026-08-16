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


  console.log(`\n[좌석 — 인원·요금(파생) 저장이 실패했을 때 · ${label}]`);
  await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800)); await cut(mode);
  const fin=await page.evaluate(async(mode)=>{
    /* 좌석 저장은 성공하고 **파생(인원·스탠딩·추가요금)만** 실패하는 경우 —
       종전엔 콘솔에만 남고 '자리 배치를 저장했어요' 토스트가 떴다(자리는 저장 · 요금은 미저장). */
    window.apiTrackSave=function(p){
      if(p&&p.track==='final') return (mode==='reject')?Promise.reject(new Error('끊김')):Promise.resolve({ok:false,error:'거절(점검)'});
      return Promise.resolve({ok:true});
    };
    startSeatFlow({tables:[{name:'테이블 1',side:'L',seats:['김희준','이미쿠',''],drinks:['C','C','']}]},{headcount:''},'T',{seatMode:'all'});
    await new Promise(r=>setTimeout(r,400));
    window.__said=[]; window._mpNextToast='';
    exitSeatFlow();
    await new Promise(r=>setTimeout(r,900));
    return { said:(window.__said||[]).join(' | '), toast:String(window._mpNextToast||''),
      stillOpen:(typeof SEATFLOW!=='undefined'&&SEATFLOW.active===true) };
  }, mode);
  ok(!/자리 배치를 저장했어요/.test(fin.toast), "요금이 저장 안 됐는데 '저장했어요'라고 하지 않는다 [SAVE_FALSE_OK]", fin.toast.slice(0,50)||'(토스트 없음)');
  ok(/저장이 안 됐어요|confirm:/.test(fin.said), '실패했다고 말하고 다시 저장할 길을 준다', fin.said.slice(0,70));

  console.log(`\n[위저드 손잡이 — 배경 저장이 실패했을 때 · ${label}]`);
  await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800)); await cut(mode);
  const handle=await page.evaluate(async()=>{
    /* 저장 버튼을 거치지 않은 배경 저장(초안 자동 저장)이 실패해도, 머리의 손잡이가 사실을 말해야 한다. */
    startTrkFlow('dining',{},{weddingDate:'2026-10-26'});
    await new Promise(r=>setTimeout(r,400));
    try{ saveTrkDraft(false); }catch(e){}
    await new Promise(r=>setTimeout(r,600));
    const b=document.querySelector('[data-wiz-save]');
    return { txt:b?b.textContent.trim():'(없음)', bad:b?/bad/.test(b.className):false };
  });
  ok(handle.bad || /다시 저장/.test(handle.txt), "배경 저장이 실패하면 손잡이가 '다시 저장'으로 바뀐다 [SAVE_FALSE_OK]", handle.txt);

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

/* ★거짓 실패도 거짓 성공만큼 나쁘다 — 위 수정들이 «정상 저장»을 실패로 오인하면
   두 분은 멀쩡히 저장된 것을 계속 다시 누르게 된다. 서버가 정상일 때를 반드시 함께 본다. */
console.log('\n[서버가 정상일 때 — 거짓 실패가 없는가]');
await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
await page.evaluate(()=>{
  window.__said=[];
  ['_miniToast','mpToast','mpAlert'].forEach(function(n){ const o=window[n]; if(typeof o==='function'&&!o.__wrapped){ const w=function(){ try{ window.__said.push(String(arguments[0]).slice(0,70)); }catch(e){} return Promise.resolve(true); }; w.__wrapped=true; window[n]=w; } });
  window.apiTrackSave=()=>Promise.resolve({ok:true});
  window._mpStateD={production:{base:{weddingDate:'2026-10-26'},tracks:{}}};
  try{ show('mypageView'); const b=document.getElementById('mp_production'); if(b) b.style.display='block'; }catch(e){}
});
const good=await page.evaluate(async()=>{
  startTrkFlow('dining',{},{weddingDate:'2026-10-26'});
  await new Promise(r=>setTimeout(r,400));
  try{ saveTrkDraft(false); }catch(e){}
  await new Promise(r=>setTimeout(r,600));
  const b=document.querySelector('[data-wiz-save]');
  return { txt:b?b.textContent.trim():'(없음)', bad:b?/bad/.test(b.className):false, said:(window.__said||[]).join(' | ') };
});
ok(!good.bad && !/다시 저장/.test(good.txt), "정상 저장이면 손잡이가 '다시 저장'이 되지 않는다", good.txt);
ok(!/안 됐어요/.test(good.said), '정상 저장에 실패 토스트가 뜨지 않는다', good.said.slice(0,60)||'(조용함)');

const goodSeat=await page.evaluate(async()=>{
  window.apiTrackSave=()=>Promise.resolve({ok:true});
  /* _mpNextToast 는 _mpRefresh 가 250ms 뒤 소비하고 null 로 비운다(2456) —
     나중에 읽으면 늘 비어 있다. 대입되는 순간을 기록한다. */
  window.__toastSet=''; try{ let _v=''; Object.defineProperty(window,'_mpNextToast',{configurable:true,
    get:function(){ return _v; }, set:function(x){ _v=x; if(x) window.__toastSet=String(x); } }); }catch(e){}
  startSeatFlow({tables:[{name:'테이블 1',side:'L',seats:['김희준','이미쿠',''],drinks:['C','C','']}]},{headcount:''},'T',{seatMode:'all'});
  await new Promise(r=>setTimeout(r,400));
  window.__said=[]; window._mpNextToast='';
  exitSeatFlow();
  await new Promise(r=>setTimeout(r,900));
  return { toast:String(window.__toastSet||window._mpNextToast||''), said:(window.__said||[]).join(' | '),
    closed:(typeof SEATFLOW==='undefined'||SEATFLOW.active!==true) };
});
ok(/자리 배치를 저장했어요/.test(goodSeat.toast), '정상일 때는 좌석 저장 완료 토스트가 그대로 뜬다', goodSeat.toast.slice(0,40)||'(없음)');
ok(goodSeat.closed, '정상이면 좌석 화면이 그대로 닫힌다(거짓 실패로 붙잡지 않는다)', String(goodSeat.closed));
ok(!/안 됐어요/.test(goodSeat.said), '정상 좌석 저장에 실패 안내가 끼지 않는다', goodSeat.said.slice(0,60)||'(조용함)');


/* ★[TRK_INFLIGHT] 같은 트랙을 겹쳐 저장해도 «다른 기기에서 먼저 저장됐어요»가 뜨지 않는가.
   rev 를 보내는 순간에 채우고 성공에서만 갱신하는 구조라, 큐가 없으면 **자기 자신과 충돌**한다.
   실측으로 재현했던 사고 — 별(담기) 두 번 탭이면 났다. */
console.log('\n[같은 트랙 겹쳐 저장 — 자기 자신과 충돌하지 않는가]');
await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
const race=await page.evaluate(async()=>{
  const sent=[]; let rev=1, conflict=0;
  window.api=function(p){ sent.push(p.rev);
    return new Promise(function(res){ setTimeout(function(){
      if(p.rev!=null && p.rev!==rev) return res({ok:false, code:'rev', error:'다른 기기에서 먼저 저장됐어요'});
      rev++; res({ok:true, rev:rev}); }, 100); }); };
  window.mpConfirm=function(){ conflict++; return Promise.resolve(false); };
  window.mpAlert=function(){ return Promise.resolve(true); };
  window._mpStateD={production:{base:{},tracks:{},trackRevs:{dining:1}}};
  const rs=await Promise.all([
    apiTrackSave({action:'saveProductionTrack', track:'dining', draft:{n:1}}),
    apiTrackSave({action:'saveProductionTrack', track:'dining', draft:{n:2}}),
    apiTrackSave({action:'saveProductionTrack', track:'dining', draft:{n:3}, done:true}),
  ]);
  return { conflict, oks:rs.filter(x=>x&&x.ok).length, revs:sent.join(','),
    lastDone:(rs[2]&&rs[2].ok)===true };
});
ok(race.conflict===0, '겹쳐 저장해도 충돌 판이 뜨지 않는다 [TRK_INFLIGHT]', '충돌 '+race.conflict+'회 · rev '+race.revs);
ok(race.oks===3, '겹친 저장이 전부 성공으로 끝난다(하나도 버려지지 않는다)', String(race.oks)+'/3');
ok(race.lastDone, "완료 표시(done:true)가 큐에서 사라지지 않는다", String(race.lastDone));


/* ★[MODAL_ONE] 판이 겹쳐 열릴 때 — 첫 약속이 영영 안 풀리면 그 자리에 걸린 '저장 중…' 베일이
   안 걷혀 화면이 통째로 멈춘다. 실측으로 재현했던 사고. */
console.log('\n[판이 겹쳐 열릴 때 — 약속이 영영 안 풀리지 않는가]');
await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
const modal=await page.evaluate(async()=>{
  let a=false,b=false;
  mpModalOpen({title:'첫 번째', body:'A'}).then(()=>{ a=true; });
  await new Promise(r=>setTimeout(r,80));
  mpModalOpen({title:'두 번째', body:'B'}).then(()=>{ b=true; });
  await new Promise(r=>setTimeout(r,80));
  const click=async()=>{ const x=document.querySelector('#mpModalActions .mp-modal-btn'); if(x) x.click(); await new Promise(r=>setTimeout(r,250)); };
  await click(); const afterFirst={a,b};
  await click();
  return { afterFirst, a, b, open:(document.getElementById('mpModal')||{classList:{contains:()=>false}}).classList.contains('open'),
    pos:getComputedStyle(document.body).position };
});
ok(modal.afterFirst.a, '겹쳐 열려도 첫 약속이 풀린다(영영 대기 없음) [MODAL_ONE]', JSON.stringify(modal.afterFirst));
ok(modal.a && modal.b, '줄 서 있던 판도 차례로 처리된다(버려지지 않는다)', 'a='+modal.a+' b='+modal.b);
ok(!modal.open && modal.pos!=='fixed', '다 끝나면 스크롤 잠금이 풀린다(body fixed 잔존 없음)', modal.pos);


/* ★[TRK_INFLIGHT · 청첩장] rev 가드가 없는 유일한 트랙 — 늦게 도착한 옛 초안이 새 초안을 덮던 사고. */
console.log('\n[청첩장 — 늦게 온 옛 저장이 새 저장을 덮지 않는가]');
await page.reload({waitUntil:'load'}); await new Promise(r=>setTimeout(r,800));
const inv=await page.evaluate(async()=>{
  const server={draft:null}; let n=0;
  window.api=function(p){ n++; const my=n; const d=JSON.parse(JSON.stringify(p.draft||{}));
    return new Promise(function(res){ setTimeout(function(){ server.draft=d; res({ok:true}); }, my===1?300:60); }); };   // 첫 요청이 일부러 늦게 온다
  window._mpStateD={production:{base:{},tracks:{}}};
  INVFLOW.draft={step:'method', design:''}; INVFLOW.step='method';
  saveInvDraft();
  await new Promise(r=>setTimeout(r,30));
  INVFLOW.draft.design='클래식'; saveInvDraft();
  await new Promise(r=>setTimeout(r,700));
  return { design:String((server.draft||{}).design||'(없음)') };
});
ok(inv.design==='클래식', '나중에 고른 디자인이 살아남는다 [TRK_INFLIGHT]', inv.design);

console.log(`\n결과 — ${fail?('실패 '+fail+'건'):'실패 0건 (전부 통과)'}`);
}catch(e){ console.log('오류:', e.message); fail++; }
finally{ await eng.close?.(); srv.kill(); }
process.exit(fail?1:0);
