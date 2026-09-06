// [MID_BAL_CONFIRM][STALE_DAYS_SHOW][HOME_SECTION_ISOLATE] 관리자 화면 감사 — 2026-09-06 «관리자 입장» 점검이 찾은 셋을 영구 검사로.
//   ① 큐에 「중도금 확인」이 뜨는데 상세엔 버튼이 없던 막다른 길(계약금만 신호 무관하게 열려 있었다)
//   ② 「오래 기다린 것」이 며칠째인지 안 보이고 단계순이라 17일짜리가 9일짜리 아래 묻히던 것
//   ③ 홈 다섯 섹션이 한 try 라, 앞이 던지면 뒤가 통째로 사라지고 화면엔 아무 말이 없던 것(돌연변이로 재현)
//   방식: 서버는 진짜 GAS 함수(_gasworld) · 홈만 스텁. ③은 옛 응답 모양(배열 대신 객체)을 일부러 흘려 넣는다.
//   사용: node scripts/audit/admin-ux.mjs   (브라우저 필요 · 약 30초 · 실패 0이어야 한다)
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = 8151; const { G, world } = openWorld();
let fail = 0; const ok = (c,m,d) => { console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+String(d).slice(0,170)}`); if(!c) fail++; };
const REC = JSON.stringify({ 시착:{at:'2026-07-01 10:00',count:2}, 계약:{at:'2026-07-02'} });
const base = (x) => Object.assign({ 신랑이름:'김희준', 신부이름:'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 현재단계:'입금완료', 계약상태:'서명완료', 계약총액:'2500000', 예식일:'2026-10-26', 입금상태:'확인', 입금자명:'김희준', 입금완료신호:kstAgo(1), 시착동의상태:'동의완료', 계약서발송일시:'2026-07-01 12:00', 계약서명일시:'2026-07-02 08:00', 동의기록:REC }, x);
const BK = { 상태:'확정', 캘린더이벤트ID:'BK1', 개인코드:'ME-TEST', '성함(신랑)':'김희준', '성함(신부)':'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 예식일자:'2026-10-26', 하객:'30', 상담일시:'2026-06-20 14:00' };
const PIPE_OK = (n) => [['신청접수',n],['상담확정',1],['입금완료',2],['후기',0]].map(([stage,count]) => ({ stage, count, hasUrgent:false, customers: Array.from({length:count},(_,i)=>({ code:'ME-TEST', names:'고객'+i, sub:'D-30', flag:false })) }));
const _near = new Date(Date.now()+12*86400000).toISOString().slice(0,10);   // 예식 D-12 — 잔금 카드가 생기는 창
const q = (kind,names,sub,wait) => ({ code:'ME-TEST', names, product:'시그니처', kind, sub, _wait: wait });
const mkHome = (pipe) => ({ ok:true, name:'미쿠', today:'2026-09-06',
  queue:{ urgent:[], normal:[ q('계약발송','송강 · 김유정','계약서 발송 대기','2026-08-20'), q('현금영수증발행','조정석 · 임수정','계약금 현금영수증 발행','2026-08-28'), q('단계정리','류준열 · 전여빈','단계 잔재','2026-08-25'), q('신규신청','박서준 · 김지원','새 신청','2026-09-05') ] },
  counts:{ total:4, urgent:0 }, results:[], pipeline:{ 시그니처: pipe, 웨딩스냅: PIPE_OK(1) }, pipeCounts:{ 시그니처:3, 웨딩스냅:1 },
  survey:{ n:2, byProduct:{ 시그니처:2 }, q:{ overall:{ '매우 만족':2 } }, recent:[{ code:'ME-TEST', names:'정해인 · 김고은', product:'시그니처', overall:'매우 만족', recommend:'추천함', gap:'' }] },
  stageFlow:{ 시그니처:['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달','후기'], 웨딩스냅:['신청접수','촬영확정','계약완료','입금완료','촬영완료','결과물전달','후기'] }, stageEx:['미계약','취소','노쇼'] });
let HOME = mkHome(PIPE_OK(2)); let SEED = base({ 중도금상태:'대기' });
function serverCall(p){ try{ if(p.action!=='adminCall') return { ok:true }; const fn=String(p.fn||''); if(fn==='adminHome') return HOME; world(Object.assign({},SEED), Object.assign({},BK)); if(typeof G[fn]!=='function') return { ok:false, error:'없는 함수: '+fn }; const r=G[fn].apply(null,p.args||[]); return r===undefined?{ok:true}:r; }catch(e){ return { ok:false, error:String(e&&e.message||e) }; } }
const server = spawn('python3',['-m','http.server',String(PORT),'--directory',SITE],{stdio:'ignore'}); process.on('exit',()=>{try{server.kill();}catch{}});
await new Promise(r=>setTimeout(r,1500));
const eng = await launchBrowser(); if(!eng){ console.log('브라우저 없음'); process.exit(0); }
const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:1440, height:900 } });
await page.route('**script.google.com**', async route => { let p={}; try{ p=JSON.parse(route.request().postData()||'{}'); }catch{} await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(serverCall(p)) }); });
await page.addInitScript(()=>{ localStorage.setItem('me_admin_token','SHOT-TOKEN'); });
const load = async () => { await page.goto(`http://localhost:${PORT}/admin.html`,{waitUntil:'domcontentloaded'}); await page.waitForTimeout(900); };

console.log('\n[①] 상세 결제 카드 — 중도금·잔금 확인 버튼(고객 신호 없이 통장으로 확인)');
await load();
for (const [tag, cells, want] of [
  ['중도금 대기', base({ 중도금상태:'대기' }), ['confirmMid']],
  ['중도금 확인 · 잔금 대기', base({ 중도금상태:'확인', 중도금확인일시:kstAgo(2), 잔금상태:'대기' }), ['confirmBalance']],
  /* ★잔금 카드(mirror.balance)는 중도금이 «확인»이거나 예식이 잔금일수전+15 안일 때만 생긴다(buildBalanceState 70_journey:1412).
     예식을 멀리 두면 bal 이 null 이라 콤보가 안 나오는 게 정상이다 — 첫 판에서 이걸 결함으로 오판했다(테스트 문제). */
  ['중도금·잔금 모두 완료신호(예식 임박)', base({ 예식일: _near, 중도금상태:'완료신호', 중도금입금신호:kstAgo(1), 잔금상태:'완료신호', 잔금입금신호:kstAgo(1) }), ['confirmMidBal']],
  ['잔금 카드 있고 둘 다 대기(예식 임박)', base({ 예식일: _near, 중도금상태:'확인', 중도금확인일시:kstAgo(2), 잔금상태:'대기' }), ['confirmBalance']],
  ['계약금 미확인(대기)', base({ 입금상태:'대기', 중도금상태:'대기' }), []],
]) {
  SEED = cells; await page.evaluate(()=>window.openDetail('ME-TEST','home')); await page.waitForTimeout(800);
  const acts = await page.evaluate(()=>[...document.querySelectorAll('.card[data-k="payment"] [data-da]')].map(b=>b.getAttribute('data-da')));
  want.forEach(w => ok(acts.indexOf(w)!==-1, `${tag} → 「${w}」 버튼이 있다`, JSON.stringify(acts)));
  if(want.indexOf('confirmMidBal')!==-1) ok(acts.indexOf('confirmBalance')===-1, `${tag} → 콤보가 있을 땐 낱개 잔금 버튼을 겹쳐 내지 않는다`, JSON.stringify(acts));
  if(!want.length) ok(acts.indexOf('confirmMid')===-1 && acts.indexOf('confirmBalance')===-1, `${tag} → 수납 순서를 건너뛴 버튼은 안 낸다`, JSON.stringify(acts));
}
console.log('\n[②] 「오래 기다린 것」 — N일째 표시 + 오래된 순');
SEED = base({ 중도금상태:'대기' }); await load();
const stale = await page.evaluate(()=>{ const hs=[...document.querySelectorAll('#queueWrap .qhead')]; const h=hs.find(x=>/오래 기다린/.test(x.textContent)); if(!h) return null; const out=[]; let el=h.nextElementSibling; while(el&&el.classList.contains('qrow')){ out.push({ names:(el.querySelector('.qn')||{}).textContent.trim().slice(0,14), wait:((el.querySelector('.qwait')||{}).textContent||'') }); el=el.nextElementSibling; } return out; });
ok(!!stale && stale.length===3, '오래 기다린 것 3건', JSON.stringify(stale));
ok(stale && stale.every(r=>/\d+일째/.test(r.wait)), '행마다 «N일째»가 보인다', JSON.stringify(stale.map(r=>r.wait)));
const days = (stale||[]).map(r=>parseInt(r.wait,10));
ok(days.length===3 && days[0]>=days[1] && days[1]>=days[2], '오래된 순으로 서 있다', JSON.stringify(days));
console.log('\n[③] 섹션 격리 — 파이프라인을 일부러 깨뜨려도 후기가 살고, 죽은 자리는 말한다');
HOME = mkHome({ 신청접수:2 });   // 배열이 아니라 객체 = 옛 응답 모양(실제로 던졌던 그 값)
await load();
const iso = await page.evaluate(()=>({ pipe:(document.getElementById('pipeWrap').innerText||'').trim().slice(0,90), survey:(document.getElementById('surveyWrap').innerText||'').trim().slice(0,50), queue:(document.getElementById('queueWrap').innerText||'').slice(0,20) }));
ok(/못 그렸어요/.test(iso.pipe), '깨진 자리에 «못 그렸어요» 한 줄이 있다', iso.pipe);
ok(/재배포/.test(iso.pipe), '무엇을 확인하라는지까지 말한다', iso.pipe);
ok(iso.survey.length>0 && !/못 그렸어요/.test(iso.survey), '뒤 섹션(후기)이 살아남았다', iso.survey);
ok(/처리할 일/.test(iso.queue), '앞 섹션(처리할 일)도 정상', iso.queue);
HOME = mkHome(PIPE_OK(2)); await load();
const back = await page.evaluate(()=>(document.getElementById('pipeWrap').innerText||'').slice(0,40));
ok(!/못 그렸어요/.test(back) && /시그니처|진행/.test(back), '정상 응답이면 그대로 그린다(회귀 없음)', back);
const realErr = errors.filter(e=>!/ERR_FAILED/.test(e) && !/렌더 실패/.test(e));
ok(realErr.length===0, '의도한 것 외 pageerror 없음', realErr.slice(0,2).join(' | '));
console.log(`\n결과 — 실패 ${fail}건`); await eng.close?.(); process.exit(fail?1:0);
