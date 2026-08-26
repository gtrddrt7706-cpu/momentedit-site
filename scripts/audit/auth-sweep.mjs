/* ★[AUTH_SWEEP 2026-08-26 사용자 지시 "한번더 병렬로 시뮬레이션 디테일점검"]
   고객 핸들러 권한·입력 전수 — 잘못된 토큰 11종 × 핸들러 9종(99회) + 공개 조회 + 필드 누락.

   ── 무엇을 지키려는가
   이 저장소의 고객 인증은 «토큰 하나»다. 토큰이 틀렸을 때 무엇을 돌려주느냐가
   개인정보의 마지막 문이다. 그래서 세계에 **진짜 이름·연락처를 가진 고객**을 하나 심어 두고,
   거절 응답 어딘가에 그 값이 섞여 나오는지 문자열로 훑는다 —
   «샐 데이터가 없는 세계»에서 «안 샜다»고 말하는 것은 아무 뜻이 없다.
   ★함께 보는 것: 던지지 않는가(500 은 그 자체로 정보다) · 내부 정보(시트명·스택)가 새지 않는가.

   사용: node scripts/audit/auth-sweep.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';
const { G, world } = openWorld();
const REAL=G.setCustomerStage, CODE='ME-TEST', NOW=kstAgo(1);
let fail=0; const ok=(c,m,d)=>{console.log(`  ${c?'✅':'❌'} ${m}${c||d===undefined?'':' — '+String(d).slice(0,180)}`); if(!c)fail++;};
/* 실제 고객 한 명이 있는 세계 — 남의 데이터가 새는지 보려면 «샐 데이터»가 있어야 한다 */
const SECRET={신랑이름:'김비밀',신부이름:'이비밀',연락처:'010-9999-8888',이메일:'secret@x.com'};
const C=Object.assign({개인코드:CODE,상품타입:'시그니처',현재단계:'제작중',계약상태:'서명완료',
  계약총액:2500000,예식일:'2026-12-20',입금상태:'확인',안내공유토큰:'realguidetoken99',좌석공유토큰:'realseattoken99',
  동의기록:JSON.stringify({계약:{at:NOW}}),처리이력:''},SECRET);
const B={개인코드:CODE,상태:'확정',선택날짜:'2026-09-01',선택시간:'14:50',토큰:'realtoken1234'};
function call(fn,arg){const w=world(Object.assign({},C),Object.assign({},B));
  G.setCustomerStage=REAL; /* resolveSession 은 진짜를 쓴다 — 그게 이 검사의 대상이다 */
  let r,e=''; try{r=fn(G,arg);}catch(x){e=String((x&&x.message)||x);} return {r,e};}

const BAD=['','x','../../','<script>alert(1)</script>',"' OR 1=1 --",'realtoken1234x','REALTOKEN1234',
  'a'.repeat(500),'%00','null','undefined'];
const HANDLERS=[
  ['handleGetMyState',(g,t)=>g.handleGetMyState({token:t})],
  ['handleSignContract',(g,t)=>g.handleSignContract({token:t,signature:'data:image/png;base64,AAA',agree:true})],
  ['handleSignFittingConsent',(g,t)=>g.handleSignFittingConsent({token:t,signature:'data:image/png;base64,AAA',agree:true})],
  ['handlePaymentSignal',(g,t)=>g.handlePaymentSignal({token:t,payerName:'x'})],
  ['handleRequestContract',(g,t)=>g.handleRequestContract({token:t,info:{weddingDate:'2026-12-20',consent:true}})],
  ['handleSaveProductionTrack',(g,t)=>g.handleSaveProductionTrack({token:t,track:'ritual',ritualDraft:{}})],
  ['handleSubmitSurvey',(g,t)=>g.handleSubmitSurvey({token:t,answers:{overall:'very',recommend:'definitely'}})],
  ['handleSubmitResultSelection',(g,t)=>g.handleSubmitResultSelection({token:t,picks:[{id:'ID1',name:'a.jpg'}]})],
  ['handleGetResultGallery',(g,t)=>g.handleGetResultGallery({token:t})],
];
console.log(`\n═══ ① 잘못된 토큰 ${BAD.length}종 × 핸들러 ${HANDLERS.length}종 ═══`);
let leaked=0, threw=0, allowed=0;
for(const [name,fn] of HANDLERS){
  for(const t of BAD){
    const {r,e}=call(fn,t);
    const blob=JSON.stringify(r||{});
    if(e){ threw++; ok(false,`${name}(${JSON.stringify(t).slice(0,18)}) · 던졌다`,e); continue; }
    if(r&&r.ok===true){ allowed++; ok(false,`★${name}(${JSON.stringify(t).slice(0,18)}) · 잘못된 토큰인데 통과`,blob.slice(0,110)); }
    if(/김비밀|이비밀|010-9999|secret@x/.test(blob)){ leaked++; ok(false,`★${name} · 남의 개인정보가 샜다`,blob.slice(0,140)); }
    if(/\bat .*\.gs|SpreadsheetApp|getRange|Sheet1|Customers!/.test(blob)){ ok(false,`${name} · 내부 정보가 샜다`,blob.slice(0,140)); }
  }
}
ok(threw===0,`던진 곳 0 (총 ${HANDLERS.length*BAD.length}회 호출)`,String(threw));
ok(allowed===0,'★잘못된 토큰이 통과한 곳 0',String(allowed));
ok(leaked===0,'★개인정보가 샌 곳 0',String(leaked));

console.log('\n═══ ② 무인증 공개 조회 — 토큰 틀리면 «없다»로 끝나는가 ═══');
for(const [nm,fn] of [['guideView',(g,t)=>g.handleGuideView({g:t})],['seatView',(g,t)=>g.handleSeatView?g.handleSeatView({s:t}):{ok:false}]]){
  let bad=0;
  for(const t of BAD.concat(['realguidetoken9','realseattoken9'])){
    const {r,e}=call(fn,t);
    if(e){ bad++; ok(false,`${nm}(${String(t).slice(0,14)}) · 던졌다`,e); }
    const blob=JSON.stringify(r||{});
    if(r&&r.ok===true){ bad++; ok(false,`★${nm} · 틀린 토큰이 열렸다`,blob.slice(0,110)); }
    if(/김비밀|010-9999|secret@x/.test(blob)){ bad++; ok(false,`★${nm} · 개인정보 유출`,blob.slice(0,140)); }
  }
  ok(bad===0,`${nm} · 전부 안전하게 거절`,String(bad));
}

console.log('\n═══ ③ 필수 필드 누락 — 던지지 않고 거절하는가 ═══');
const MISSING=[
  ['handleSignContract 서명 없음',(g)=>g.handleSignContract({token:'realtoken1234',agree:true})],
  ['handleSignContract 동의 없음',(g)=>g.handleSignContract({token:'realtoken1234',signature:'data:image/png;base64,AAA'})],
  ['handlePaymentSignal 이름 없음',(g)=>g.handlePaymentSignal({token:'realtoken1234'})],
  ['handleSubmitSurvey 답 없음',(g)=>g.handleSubmitSurvey({token:'realtoken1234',answers:{}})],
  ['handleSubmitResultSelection 빈 선택',(g)=>g.handleSubmitResultSelection({token:'realtoken1234',picks:[]})],
  ['handleSaveProductionTrack 트랙 없음',(g)=>g.handleSaveProductionTrack({token:'realtoken1234'})],
  ['본문 자체가 없음',(g)=>g.handleGetMyState()],
  ['본문이 문자열',(g)=>g.handleGetMyState('x')],
];
for(const [nm,fn] of MISSING){
  const {r,e}=call((g)=>fn(g));
  ok(!e,`${nm} · 던지지 않는다`,e);
  if(!e) ok(!(r&&r.ok===true),`${nm} · 통과시키지 않는다`,JSON.stringify(r).slice(0,110));
}
console.log(`\n결과 — ${fail?'발견 '+fail+'건':'발견 0건'}`);
process.exit(fail?1:0);
