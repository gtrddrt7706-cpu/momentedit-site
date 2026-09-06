
// 관리자 전수 점검 — 모드별: archive · ai · keyboard · gap
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { launchBrowser } = await import('./_browser.mjs');
const MODE = process.argv[2] || 'archive';
const PORT = Number(process.env.PORT || 8160);
const { G, world } = openWorld();
let fail = 0; const ok = (c,m,d)=>{ console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+String(d).slice(0,180)}`); if(!c) fail++; };
const note = (m)=>console.log('  · ' + m);
const REC = JSON.stringify({ 시착:{at:'2026-07-01 10:00',count:2}, 계약:{at:'2026-07-02'} });
const CUST = { 개인코드:'ME-TEST', 신랑이름:'김희준', 신부이름:'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 현재단계:'입금완료', 계약상태:'서명완료', 계약총액:'2500000', 예식일:'2026-10-26', 입금상태:'확인', 입금완료신호:kstAgo(1), 시착동의상태:'동의완료', 동의기록:REC };
const BK = { 상태:'확정', 개인코드:'ME-TEST', '성함(신랑)':'김희준', '성함(신부)':'이미쿠', 예식일자:'2026-10-26', 하객:'30', 선택날짜:'2026-09-06', 선택시간:'14:00' };
const HOME = { ok:true, name:'미쿠', today:'2026-09-06', todayConsults:[{time:'14:00',names:'김희준 · 이미쿠',code:'ME-TEST'}],
  queue:{ urgent:[], normal:[{ kind:'입금확인', code:'ME-TEST', names:'김희준 · 이미쿠', product:'시그니처', sub:'계약금 250,000원' }] }, counts:{ total:1, urgent:0 },
  results:[], pipeline:{ 시그니처:[{stage:'입금완료',count:1,hasUrgent:false,customers:[{code:'ME-TEST',names:'김희준 · 이미쿠',sub:'D-50'}]}], 웨딩스냅:[] },
  pipeCounts:{ 시그니처:1, 웨딩스냅:0 }, survey:{ n:0, byProduct:{}, q:{}, recent:[] },
  stageFlow:{ 시그니처:['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달','후기'], 웨딩스냅:['신청접수','촬영확정','계약완료','입금완료','촬영완료','결과물전달','후기'] }, stageEx:['미계약','취소','노쇼'] };
/* ★서버(adminArchive)는 {ok, results, total} 을 준다 — 첫 판에서 rows 로 스텁했다가 «7건 실패» 라는
   가짜 발견을 만들었다. 스텁 모양은 반드시 실제 함수를 돌려 확인하고 맞출 것. */
const ARCHIVE = { ok:true, total:3, results:[
  { code:'ME-A1', names:'끝난 · 고객1', product:'시그니처', stage:'후기', endType:'완료', endTypeLabel:'전달 완료', wedYmd:'2026-05-10', modified:'2026-05-20', rcptDue:false, rcptFix:false },
  { code:'ME-A2', names:'취소 · 고객2', product:'웨딩스냅', stage:'취소', endType:'중단', endTypeLabel:'취소', wedYmd:'', modified:'2026-04-02', rcptDue:true, rcptFix:false },
  { code:'ME-A3', names:'노쇼 · 고객3', product:'시그니처', stage:'노쇼', endType:'중단', endTypeLabel:'노쇼', wedYmd:'', modified:'2026-03-11', rcptDue:false, rcptFix:false } ] };
let OLD_SERVER = false;
function serverCall(p){
  try{
    if (p.action !== 'adminCall') return { ok:true };
    const fn = String(p.fn||'');
    if (fn === 'adminHome') { const h = JSON.parse(JSON.stringify(HOME)); if (OLD_SERVER) delete h.todayConsults; return h; }
    if (fn === 'adminArchive') return ARCHIVE;
    if (/^ai/.test(fn)) return { ok:true, rows:[], list:[], notes:[], cases:[], facts:[], log:[], items:[], total:0, month:0, budget:10000, surfaces:{}, pending:[], staff:[], text:'', draft:'초안', reply:'답' };
    world(Object.assign({},CUST), Object.assign({},BK));
    if (typeof G[fn] !== 'function') return { ok:false, error:'없는 함수: '+fn };
    const r = G[fn].apply(null, p.args||[]); return r===undefined?{ok:true}:r;
  }catch(e){ return { ok:false, error:String(e&&e.message||e) }; }
}
const server = spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'});
process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1500));
const eng = await launchBrowser(); if(!eng){ console.log('브라우저 없음'); process.exit(0); }
const VW = Number(process.env.VW||1440);
const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:VW, height:900 } });
await page.route('**script.google.com**', async route => { let p={}; try{ p=JSON.parse(route.request().postData()||'{}'); }catch{} await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(serverCall(p)) }); });
await page.route('**/api/**', async route => route.fulfill({ status:200, contentType:'application/json', body:'{"ok":true,"reply":"테스트"}' }));
await page.addInitScript(()=>{ localStorage.setItem('me_admin_token','SHOT-TOKEN'); });
page.on('dialog', d=>d.accept('테스트').catch(()=>{}));
const load = async()=>{ await page.goto(`http://localhost:${PORT}/admin.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(900); };

if (MODE === 'archive') {
  console.log(`\n[아카이브] ${VW}px — 끝난 고객 목록`);
  await load();
  await page.evaluate(()=>window.openArchive()); await page.waitForTimeout(900);
  const a = await page.evaluate(()=>{ const v=document.getElementById('archiveView'); const rows=[...v.querySelectorAll('.arow')]; return { shown:v.style.display!=='none', n:rows.length, txt:(v.innerText||'').slice(0,400), chips:[...v.querySelectorAll('.achip')].map(c=>c.textContent.trim()), ovf:document.documentElement.scrollWidth-window.innerWidth, cols:getComputedStyle(document.getElementById('archiveBody')).gridTemplateColumns }; });
  ok(a.shown, '아카이브 화면이 열린다');
  ok(a.n===3, '행 3개', 'n='+a.n);
  ok(!/NaN|undefined|\[object/.test(a.txt), 'NaN·undefined 노출 없음', (a.txt.match(/.{0,30}(NaN|undefined).{0,30}/)||[''])[0]);
  ok(a.txt.indexOf('—')===-1, '전각 줄표 없음');
  ok(a.ovf<=0, '가로 넘침 없음', 'ovf='+a.ovf);
  ok(a.chips.length>=3, '필터 칩', JSON.stringify(a.chips));
  note('열: ' + a.cols);
  const clicked = await page.evaluate(()=>{ const r=document.querySelector('#archiveBody .arow'); if(!r) return null; r.click(); return true; });
  await page.waitForTimeout(900);
  ok(clicked && await page.evaluate(()=>window._view==='detail'), '행을 누르면 상세로 간다');
  await page.evaluate(()=>history.back()); await page.waitForTimeout(800);
  ok(await page.evaluate(()=>window._view==='archive'), '뒤로가기로 아카이브 복귀', await page.evaluate(()=>window._view));
  for (const f of ['done','stopped','all']) {
    await page.evaluate((f)=>{ const c=[...document.querySelectorAll('.achip')].find(x=>x.getAttribute('data-f')===f); if(c) c.click(); }, f);
    await page.waitForTimeout(600);
    const st = await page.evaluate(()=>({ view:window._view, n:document.querySelectorAll('#archiveBody .arow').length }));
    ok(st.view==='archive', `필터 «${f}» 뒤에도 아카이브에 머문다`, JSON.stringify(st));
  }
} else if (MODE === 'ai') {
  console.log(`\n[AI 직원실] ${VW}px — 3탭 렌더·오류`);
  await load();
  await page.evaluate(()=>window.openAiTeam()); await page.waitForTimeout(800);
  for (const tab of ['핵심정보','가르치기','기록']) {
    const e0 = errors.length;
    await page.evaluate((t)=>{ const b=[...document.querySelectorAll('button')].find(x=>(x.textContent||'').trim()===t); if(b) b.click(); }, tab);
    await page.waitForTimeout(1500);
    const v = await page.evaluate(()=>{ const ov=document.querySelector('.adm-ov, #aiTeamOv, [id^=aiTeam]'); const host=ov||document.body; const t=host.innerText||''; return { len:t.length, bad:(t.match(/.{0,30}(NaN|undefined|\[object Object\]).{0,30}/)||[''])[0], em:t.indexOf('—')!==-1, btns:host.querySelectorAll('button').length, ovf:document.documentElement.scrollWidth-window.innerWidth }; });
    ok(v.len>50, `«${tab}» 탭이 내용을 그린다`, 'len='+v.len);
    ok(!v.bad, `«${tab}» NaN·undefined 노출 없음`, v.bad);
    ok(!v.em, `«${tab}» 전각 줄표 없음`);
    ok(v.ovf<=0, `«${tab}» 가로 넘침 없음`, 'ovf='+v.ovf);
    const ne = errors.slice(e0).filter(x=>!/ERR_FAILED/.test(x));
    ok(ne.length===0, `«${tab}» pageerror 없음`, ne.slice(0,2).join(' | '));
    note(`«${tab}» 버튼 ${v.btns}개`);
  }
} else if (MODE === 'keyboard') {
  console.log(`\n[키보드] ${VW}px — 탭 순서·Enter·Esc`);
  await load();
  const tabOrder = await page.evaluate(async()=>{
    const seq=[]; document.body.focus();
    for(let i=0;i<12;i++){ const e=document.activeElement; seq.push((e&&(e.id||e.className||e.tagName))+':'+((e&&e.textContent||'').trim().slice(0,12))); await new Promise(r=>setTimeout(r,10)); }
    return seq;
  });
  note('초기 포커스 요소: ' + (await page.evaluate(()=>document.activeElement.tagName+'#'+document.activeElement.id)));
  await page.keyboard.press('Tab'); await page.waitForTimeout(120);
  const f1 = await page.evaluate(()=>({ id:document.activeElement.id, tag:document.activeElement.tagName }));
  ok(!!f1.id || f1.tag!=='BODY', '첫 Tab 이 요소로 들어간다', JSON.stringify(f1));
  await page.evaluate(()=>{ const q=document.getElementById('q'); q.focus(); q.value='김희준'; });
  await page.keyboard.press('Enter'); await page.waitForTimeout(900);
  ok(await page.evaluate(()=>(document.getElementById('queueWrap').innerText||'').indexOf('검색 결과')!==-1), '검색칸에서 Enter 로 검색된다');
  await page.evaluate(()=>{ document.getElementById('q').value=''; window.doSearch(); }); await page.waitForTimeout(800);
  await page.evaluate(()=>window.openDetail('ME-TEST','home')); await page.waitForTimeout(900);
  await page.evaluate(()=>{ const b=[...document.querySelectorAll('#detailBody .btn')].find(x=>/현금영수증 발행/.test(x.textContent)); if(b) b.click(); });
  await page.waitForTimeout(700);
  const mo = await page.evaluate(()=>({ open:document.getElementById('confirmModal').classList.contains('show'), focus:document.activeElement.id }));
  ok(mo.open, '모달이 열렸다(전제)');
  note('모달 열린 뒤 포커스: ' + mo.focus);
  await page.keyboard.press('Escape'); await page.waitForTimeout(400);
  ok(!(await page.evaluate(()=>document.getElementById('confirmModal').classList.contains('show'))), 'Esc 로 모달이 닫힌다');
  ok(await page.evaluate(()=>document.body.style.overflow!=='hidden'), 'Esc 뒤 스크롤 잠금이 안 남는다');
} else if (MODE === 'gap') {
  console.log(`\n[배포 갭] 서버가 «옛 판»일 때 관리자 화면이 어떻게 되는가`);
  OLD_SERVER = true; await load();
  const g = await page.evaluate(()=>({ today:getComputedStyle(document.getElementById('todayWrap')).display, queue:(document.getElementById('queueWrap').innerText||'').slice(0,14), pipe:(document.getElementById('pipeWrap').innerText||'').slice(0,14), err:(document.getElementById('toast')||{}).textContent||'' }));
  ok(g.today==='none', '오늘 상담 칸은 숨는다(안 깨진다)', g.today);
  ok(/처리할 일/.test(g.queue), '나머지 화면은 정상', JSON.stringify(g));
  note('★ 그런데 «서버가 옛 판이라 숨은 것»과 «오늘 상담이 없어 숨은 것»을 화면이 구분해 주지 않는다');
  OLD_SERVER = false; await load();
  ok(await page.evaluate(()=>getComputedStyle(document.getElementById('todayWrap')).display!=='none'), '새 판이면 뜬다(대조)');
} else if (MODE === 'money') {
  /* 오조작의 핵심 — 확인 판이 «실제로 확정될 금액»을 말하는가. 판의 숫자가 결제 카드 원장과 어긋나면
     사장이 틀린 금액을 보고 확인을 누른다. 판 숫자를 카드 숫자와 대조한다. */
  console.log('\n[돈 확인 판] 판의 금액 ↔ 결제 카드 원장');
  const CASES = [
    ['계약금 확인 대기', { 현재단계:'계약완료', 입금상태:'대기' }, 'confirmPay'],
    ['중도금 확인', { 중도금상태:'대기' }, 'confirmMid']
  ];
  const BASE = JSON.parse(JSON.stringify(CUST));
  for (const c of CASES) {
    const tag = c[0], over = c[1], act = c[2];
    for (const k of Object.keys(CUST)) delete CUST[k];
    Object.assign(CUST, BASE, over);
    await load();
    await page.evaluate(function(){ return window.openDetail('ME-TEST','home'); });
    await page.waitForTimeout(900);
    const led = await page.evaluate(function(){ const el=document.querySelector('.card[data-k="payment"]'); return el ? (el.innerText||'') : ''; });
    const nums = led.match(/[\d,]{4,}원/g) || [];
    ok(nums.length > 0, tag + ' · 결제 카드에 금액이 보인다', JSON.stringify(nums.slice(0,4)));
    const opened = await page.evaluate(function(a){ const b=document.querySelector('[data-da="'+a+'"]'); if(!b) return false; b.click(); return true; }, act);
    await page.waitForTimeout(800);
    if (!opened) { note(tag + ' · «' + act + '» 버튼 없음 — 건너뜀'); continue; }
    const modal = await page.evaluate(function(){ const m=document.getElementById('confirmModal'); return m.classList.contains('show') ? (document.getElementById('modalBox').innerText||'') : ''; });
    ok(!!modal, tag + ' · 확인 판이 뜬다');
    ok(!/NaN|undefined/.test(modal), tag + ' · 판에 NaN·undefined 없음', (modal.match(/.{0,25}(NaN|undefined).{0,25}/)||[''])[0]);
    const mnums = modal.match(/[\d,]{4,}원/g) || [];
    const same = mnums.every(function(n){ return led.indexOf(n) !== -1; });
    ok(mnums.length === 0 || same, tag + ' · 판의 금액이 카드 원장과 같다', '판=' + JSON.stringify(mnums) + ' 카드=' + JSON.stringify(nums.slice(0,5)));
    note(tag + ' · 판 첫 줄: ' + (modal.split('\n').filter(Boolean)[0]||''));
    await page.evaluate(function(){ try { closeModal(); } catch(e) {} });
  }
  for (const k of Object.keys(CUST)) delete CUST[k];
  Object.assign(CUST, BASE);
} else if (MODE === 'danger') {
  /* 위험 버튼이 «일상 버튼과 구분되는가 · 확인 판을 거치는가 · 큐에 안 나오는가» */
  console.log('\n[오조작 위험] 위험 버튼 전수');
  await load();
  await page.evaluate(function(){ return window.openDetail('ME-TEST','home'); });
  await page.waitForTimeout(900);
  await page.evaluate(function(){ document.querySelectorAll('#detailBody details').forEach(function(d){ d.open = true; }); });
  const btns = await page.evaluate(function(){ return [].slice.call(document.querySelectorAll('#detailBody .btn[data-da]')).map(function(b){ return { act:b.getAttribute('data-da'), label:(b.textContent||'').trim(), danger:b.classList.contains('btn-danger') }; }); });
  const risky = btns.filter(function(b){ return /undo|force|refund|noshow|취소|되돌|환불|강제|해제/i.test(b.act + b.label); });
  note('상세 버튼 ' + btns.length + '개 중 위험 후보 ' + risky.length + '개');
  for (const b of risky) ok(b.danger, '«' + b.label + '» 이 위험 색으로 구분된다', b.act);
  const noConfirm = [];
  for (const b of risky) {
    await page.evaluate(function(){ try { closeModal(); } catch(e) {} try { _admDlgEnd(false); } catch(e) {} });
    await page.evaluate(function(a){ const el=document.querySelector('[data-da="'+a+'"]'); if(el) el.click(); }, b.act);
    await page.waitForTimeout(700);
    const st = await page.evaluate(function(){ return { cm:document.getElementById('confirmModal').classList.contains('show'), dl:document.getElementById('admDlgOv').classList.contains('show'), reason:!!document.querySelector('#confirmModal input, #confirmModal textarea') }; });
    if (!st.cm && !st.dl) noConfirm.push(b.label);
    else if (/undo|되돌|환불/i.test(b.act + b.label)) {
      /* ★사유칸이 없다고 바로 결함이 아니다 — 서버가 «지금은 되돌릴 수 없다»고 막으면 그건 «차단 안내» 판이고
         거기엔 사유칸이 없는 게 정답이다. 판의 글을 읽어 둘을 가른다(첫 판에서 이걸 안 갈라 오탐이 났다). */
      const txt = await page.evaluate(function(){ const m=document.getElementById('modalBox'); return m ? (m.innerText||'') : ''; });
      const blocked = /없어요|없습니다|불가|막혔|지났|경과|안 돼요|할 수 없/.test(txt);
      ok(st.reason || st.dl || blocked, '«' + b.label + '» 이 사유를 받거나, 못 하는 이유를 말한다', JSON.stringify(st) + ' 판=' + txt.replace(/\s+/g,' ').slice(0,110));
      if (blocked && !st.reason) note('«' + b.label + '» 은 지금 상태에선 차단 안내 판 — 사유칸 없는 것이 정답');
    }
  }
  ok(noConfirm.length === 0, '위험 버튼은 모두 확인 판을 거친다', noConfirm.join(', '));
  await page.evaluate(function(){ try { closeModal(); } catch(e) {} });
  await page.evaluate(function(){ return window.loadHome(); });
  await page.waitForTimeout(800);
  const inQueue = await page.evaluate(function(){ return [].slice.call(document.querySelectorAll('#queueWrap .qbtn')).map(function(b){ return (b.textContent||'').trim(); }); });
  ok(!inQueue.some(function(l){ return /되돌|확인 취소/.test(l); }), '큐(일상 목록)에는 되돌리기류를 두지 않는다', JSON.stringify(inQueue));
}
const real = errors.filter(e=>!/ERR_FAILED/.test(e));
if (real.length) { console.log('  pageerror: ' + real.slice(0,3).join(' | ')); fail++; }
console.log(`\n[${MODE}] 결과 — 실패 ${fail}건`);
await eng.close?.(); process.exit(fail?1:0);
