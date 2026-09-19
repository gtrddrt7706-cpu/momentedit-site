
// 남은 축 — mobile(420 전 화면) · misop(오조작 위험 전수)
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { launchBrowser } = await import('./_browser.mjs');
const MODE = process.argv[2] || 'mobile';
const PORT = Number(process.env.PORT || 8170);
const { G, world } = openWorld();
let fail = 0; const ok=(c,m,d)=>{ console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+String(d).slice(0,190)}`); if(!c) fail++; };
const note=(m)=>console.log('  · '+m);
const REC = JSON.stringify({ 가예약:{eventId:'EV1',date:'2026-10-26',slot:'12:20',status:'승인',expires:'2026-12-01'}, 시착:{at:'2026-07-01 10:00',count:2}, 계약:{at:'2026-07-02'}, 영수증기준일:{ 예약금: kstAgo(1) } });
const CUST = { 개인코드:'ME-TEST', 신랑이름:'김희준', 신부이름:'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 현재단계:'입금완료', 계약상태:'서명완료', 계약총액:'2500000', 예식일:'2026-10-26', 입금상태:'확인', 입금자명:'김희준', 입금완료신호:kstAgo(1), 중도금상태:'대기', 시착동의상태:'동의완료', 시착동의일시:'2026-07-01 10:00', 계약서발송일시:'2026-07-01 12:00', 계약서명일시:'2026-07-02 08:00', 관리자메모:'메모', 동의기록:REC };
const BK = { 상태:'확정', 캘린더이벤트ID:'BK1', 개인코드:'ME-TEST', '성함(신랑)':'김희준', '성함(신부)':'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 예식일자:'2026-10-26', 하객:'30', 선택날짜:'2026-09-06', 선택시간:'14:00' };
const q=(kind,names,sub,wait)=>({ code:'ME-TEST', names, product:'시그니처', kind, sub, _wait:wait });
const HOME = { ok:true, name:'미쿠', today:'2026-09-06',
  todayConsults:[{time:'10:00',names:'오세훈 · 윤아름',code:'ME-TEST'},{time:'16:30',names:'강태오 · 배수지',code:'ME-TEST'}],
  queue:{ urgent:[ q('입금확인','정민재 · 한소희','계약금 250,000원','2026-09-04') ],
    normal:[ q('계약발송','송강 · 김유정','계약서 발송 대기','2026-08-20'), q('중도금확인','유연석 · 문가영','중도금 1,000,000원','2026-09-05'), q('환불송금','장우영 · 나은비','환불 230,000원','2026-09-03') ] },
  counts:{ total:4, urgent:1 }, results:[{ code:'ME-TEST', names:'이제훈 · 신세경', product:'시그니처', stage:'결과물전달', sub:'원본 전달' }],
  pipeline:{ 시그니처:[{stage:'입금완료',count:2,hasUrgent:true,customers:[{code:'ME-TEST',names:'김희준 · 이미쿠',sub:'D-50'},{code:'ME-TEST',names:'박서준 · 김지원',sub:'D-70'}]}], 웨딩스냅:[] },
  pipeCounts:{ 시그니처:2, 웨딩스냅:0 }, survey:{ n:1, byProduct:{시그니처:1}, q:{overall:{'매우 만족':1}}, recent:[{code:'ME-TEST',names:'정해인 · 김고은',product:'시그니처',overall:'매우 만족',recommend:'추천함',gap:''}] },
  stageFlow:{ 시그니처:['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달','후기'], 웨딩스냅:['신청접수','촬영확정','계약완료','입금완료','촬영완료','결과물전달','후기'] }, stageEx:['미계약','취소','노쇼'] };
const ARCHIVE = { ok:true, total:2, results:[
  { code:'ME-A1', names:'끝난 · 고객1', product:'시그니처', stage:'후기', endType:'완료', endTypeLabel:'전달 완료', wedYmd:'2026-05-10', modified:'2026-05-20', rcptDue:false, rcptFix:false },
  { code:'ME-A2', names:'취소 · 고객2', product:'웨딩스냅', stage:'취소', endType:'중단', endTypeLabel:'취소', wedYmd:'', modified:'2026-04-02', rcptDue:true, rcptFix:false } ] };
function serverCall(p){ try{ if(p.action!=='adminCall') return {ok:true}; const fn=String(p.fn||'');
  if(fn==='adminHome') return HOME; if(fn==='adminArchive') return ARCHIVE;
  if(/^ai/.test(fn)) return { ok:true, rows:[], list:[], notes:[], cases:[], facts:[], log:[], items:[], total:0, month:0, budget:10000, surfaces:{}, pending:[], staff:[] };
  world(Object.assign({},CUST), Object.assign({},BK));
  if(typeof G[fn]!=='function') return { ok:false, error:'없는 함수: '+fn };
  const r=G[fn].apply(null,p.args||[]); return r===undefined?{ok:true}:r; }catch(e){ return { ok:false, error:String(e&&e.message||e) }; } }
const server = spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1500));
const eng = await launchBrowser(); if(!eng){ console.log('브라우저 없음'); process.exit(0); }
const W = Number(process.env.VW || (MODE==='mobile'?420:1440));
const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:W, height:860 } });
await page.route('**script.google.com**', async route=>{ let p={}; try{p=JSON.parse(route.request().postData()||'{}');}catch{} await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(serverCall(p)) }); });
await page.route('**/api/**', async route=>route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true}' }));
await page.addInitScript(()=>{ localStorage.setItem('me_admin_token','SHOT-TOKEN'); });
page.on('dialog', d=>d.accept('테스트').catch(()=>{}));
const load = async()=>{ await page.goto(`http://localhost:${PORT}/admin.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(950); };
const ovf = ()=>page.evaluate(()=>Math.max(document.documentElement.scrollWidth, document.body.scrollWidth)-window.innerWidth);

if (MODE==='mobile') {
  console.log(`\n[모바일 ${W}px] 관리자 전 화면`);
  await load();
  ok(await ovf()<=0, '홈 가로 넘침 없음', 'ovf='+await ovf());
  const h = await page.evaluate(()=>({ today:getComputedStyle(document.getElementById('todayWrap')).display, disp:getComputedStyle(document.getElementById('homeView')).display,
    order:['todayWrap','queueWrap','resultsWrap','pipeWrap','surveyWrap'].map(id=>({id,t:Math.round(document.getElementById(id).getBoundingClientRect().top+scrollY)})),
    wait:[...document.querySelectorAll('.qwait')].map(e=>e.textContent) }));
  ok(h.disp!=='grid', '모바일은 grid 아님(한 열)', h.disp);
  ok(h.today!=='none', '오늘 상담이 뜬다', h.today);
  const asc = h.order.every((o,i)=>i===0||o.t>=h.order[i-1].t);
  ok(asc, '섹션이 위→아래 한 줄로 쌓인다', JSON.stringify(h.order));
  ok(h.wait.length>0 && /일째/.test(h.wait[0]||''), '«N일째»가 모바일에서도 보인다', JSON.stringify(h.wait));
  // 탭 타깃
  /* ★[TB_TAP44] 보이는 높이(getBoundingClientRect)로 재면 ::after 로 넓힌 히트박스를 «못 본다» — 첫 판에서 34px 로 붉혔다(내 검사 잘못).
     mypage-shot 의 TRK_TAP44 와 같이 **실좌표로 눌러** 그 자리에서 그 요소가 잡히는지 본다. 위·아래 4px 지점을 찍는다. */
  const small = await page.evaluate(()=>{
    const out=[]; const _sb=document.documentElement.style.scrollBehavior; document.documentElement.style.scrollBehavior='auto';
    document.querySelectorAll('#homeView button, #homeView .qrow, #homeView .trow, .topbar .tb').forEach(el=>{
      /* ★반드시 화면 안으로 끌어와서 잰다 — 뷰포트 밖 좌표는 elementFromPoint 가 null 이라 «히트박스 없음»으로 오판한다
         (셋째 판에서 «관리 ›» 를 그렇게 붉혔다 · mypage-shot 의 TRK_TAP44 도 같은 이유로 scrollIntoView 를 먼저 한다). */
      el.scrollIntoView({ block:'center' });
      const r=el.getBoundingClientRect(); if(!r.width||!r.height) return;
      /* ★이미 44px 이상인 것은 통과다 — 그걸 4px «밖»에서 찍으면 당연히 이웃 행이 잡힌다(둘째 판에서 목록 행 4개를 그렇게 붉혔다).
         44px 미만인 것만, 44px 상자의 «가장자리»(중심 ±22px)를 찍어 그 자리에서도 자기가 잡히는지 본다. */
      if (r.height >= 43) return;   // 43.5 처럼 반올림으로 44 가 되는 것은 이미 44px 목표다(둘째 판 오탐)
      const x=r.left+r.width/2, cy=r.top+r.height/2;
      const hits=[cy-21, cy+21].map(y=>{ const h=document.elementFromPoint(x,y); return !!(h && (h===el || el.contains(h) || h.contains(el))); });
      if(!hits[0]||!hits[1]) {
        const at=(y)=>{ const h=document.elementFromPoint(x,y); return h? (h.tagName+(h.id?'#'+h.id:'')+(h.className&&typeof h.className==='string'?'.'+h.className.split(' ')[0]:'')) : 'null'; };
        out.push(((el.textContent||'').trim().slice(0,14))+' 보임'+Math.round(r.height)+'px · 위'+(hits[0]?'O':at(cy-21))+' 아래'+(hits[1]?'O':at(cy+21))+' · 부모 '+(el.parentElement?el.parentElement.className:'')); }
    });
    document.documentElement.style.scrollBehavior=_sb; window.scrollTo(0,0);
    return out;
  });
  ok(small.length===0, '44px 미만인 것도 히트박스는 44px', JSON.stringify(small.slice(0,6)));
  await page.evaluate(()=>window.openDetail('ME-TEST','home')); await page.waitForTimeout(950);
  ok(await ovf()<=0, '상세 가로 넘침 없음', 'ovf='+await ovf());
  const d = await page.evaluate(()=>{ const b=document.getElementById('detailBody'); return { cols:getComputedStyle(b).gridTemplateColumns, disp:getComputedStyle(b).display,
    acts:[...document.querySelectorAll('.card[data-k="payment"] [data-da]')].map(x=>x.getAttribute('data-da')),
    small:[...b.querySelectorAll('.btn')].filter(x=>{const r=x.getBoundingClientRect(); return r.width&&r.height<38;}).map(x=>(x.textContent||'').trim().slice(0,14)+' '+Math.round(x.getBoundingClientRect().height)) }; });
  ok(d.disp!=='grid', '상세도 모바일은 한 열', d.disp);
  ok(d.acts.includes('confirmMid'), '중도금 확인 버튼이 모바일에도 있다', JSON.stringify(d.acts));
  ok(d.small.length===0, '상세 버튼이 38px 이상', JSON.stringify(d.small.slice(0,6)));
  await page.evaluate(()=>window.openArchive()); await page.waitForTimeout(950);
  ok(await ovf()<=0, '아카이브 가로 넘침 없음', 'ovf='+await ovf());
  ok(await page.evaluate(()=>document.querySelectorAll('#archiveBody .arow').length)===2, '아카이브 행 2개');
  await page.evaluate(()=>{ try{history.back();}catch(e){} }); await page.waitForTimeout(700);
  await page.evaluate(()=>window.openAiTeam()); await page.waitForTimeout(1200);
  ok(await ovf()<=0, 'AI 직원실 가로 넘침 없음', 'ovf='+await ovf());
} else {
  console.log(`\n[오조작 위험] ${W}px — 위험 동작마다 «확인 판·사유·되돌리기»가 있는가`);
  await load();
  await page.evaluate(()=>window.openDetail('ME-TEST','home')); await page.waitForTimeout(950);
  await page.evaluate(()=>document.querySelectorAll('#detailBody details').forEach(x=>x.open=true));
  const danger = await page.evaluate(()=>[...document.querySelectorAll('#detailBody .btn')].map((b,i)=>({ i, t:(b.textContent||'').trim().slice(0,22), cls:b.className, danger:/btn-danger|btn-seal/.test(b.className), act:b.getAttribute('data-da')||b.getAttribute('data-act')||'' })).filter(x=>x.act));
  note(`상세 액션 버튼 ${danger.length}개 · 위험색 ${danger.filter(x=>x.danger).length}개`);
  let noConfirm = [];
  for (const b of danger) {
    await page.evaluate(()=>{ try{closeModal();}catch(e){} try{_admDlgEnd(false);}catch(e){} });
    await page.evaluate(()=>window.openDetail('ME-TEST','home')); await page.waitForTimeout(500);
    await page.evaluate(()=>document.querySelectorAll('#detailBody details').forEach(x=>x.open=true));
    let calls=0; const cnt=(r)=>{ if(/script\.google\.com/.test(r.url())) calls++; }; page.on('request',cnt);
    const did = await page.evaluate((act)=>{ const el=[...document.querySelectorAll('#detailBody .btn')].find(x=>(x.getAttribute('data-da')||x.getAttribute('data-act'))===act); if(!el) return false; el.click(); return true; }, b.act);
    await page.waitForTimeout(650); page.off('request',cnt);
    if(!did) continue;
    const st = await page.evaluate(()=>({ cm:document.getElementById('confirmModal').classList.contains('show'), dl:document.getElementById('admDlgOv').classList.contains('show'), reason:!!document.querySelector('#confirmModal input, #confirmModal textarea'), view:window._view }));
    const gated = st.cm || st.dl;
    /* ★읽기 전용 뷰어(계약서 보기·동의서 문서)는 서버를 부르지만 «쓰지» 않는다 — 확인 판을 요구하면 오히려 방해다.
       첫 판에서 viewContract 를 «확인 판 없이 서버 호출»로 붉혔는데, 그건 서명 이미지를 가져와 띄우는 조회였다(오탐). */
    const READONLY = /^(viewContract|fittingDoc|openFittingDoc|preview|copy)/i;
    const wrote = calls>0 && !gated && !READONLY.test(b.act);
    if (wrote) noConfirm.push(`${b.t}(${b.act}) — 확인 판 없이 서버 호출 ${calls}회`);
    console.log(`   ${gated?'판 뜸':(calls?'★즉시 실행':'이동/무동작')} · «${b.t}»${st.reason?' · 사유칸 있음':''}`);
  }
  ok(noConfirm.length===0, '확인 판 없이 곧바로 서버를 쓰는 위험 버튼 0', JSON.stringify(noConfirm));
  await page.evaluate(()=>{ try{closeModal();}catch(e){} try{_admDlgEnd(false);}catch(e){} });
}
const real = errors.filter(e=>!/ERR_FAILED/.test(e));
if (real.length) { console.log('  pageerror: '+real.slice(0,3).join(' | ')); fail++; }
console.log(`\n[${MODE}] 결과 — 실패 ${fail}건`);
await eng.close?.(); process.exit(fail?1:0);
