/* ★[ADMIN_IDEMPOTENT 2026-08-26 사용자 지시 "한번더 병렬로 시뮬레이션 디테일점검"]
   관리자 동작을 «두 번» 눌러도 안전한가 — 상태를 바꾸는 16동작 전수.

   ── 왜 이 각도인가
   실무에서 가장 흔한 사고는 «응답이 늦어 한 번 더 누른» 것이다. 화면은 로딩만 돌고,
   사람은 안 눌린 줄 알고 또 누른다. 그때 두 번째 호출이 무엇을 하느냐가 이 검사의 전부다.
   ★두 가지를 함께 본다 — ①두 번째가 «오류»로 끝나지 않을 것(관리자가 실패한 줄 안다)
     ②두 번째가 상태를 **바꾸지 않을 것**(이중 확인·이중 발송·단계 두 칸 전진 방지).
   ①만 보면 «조용히 두 번 처리»를 놓치고, ②만 보면 «되긴 되는데 빨간 오류»를 놓친다.

   사용: node scripts/audit/admin-idempotent.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';
const { G, world } = openWorld();
const REAL=G.setCustomerStage, CODE='ME-TEST', NOW=kstAgo(1);
let fail=0; const ok=(c,m,d)=>{console.log(`  ${c?'✅':'❌'} ${m}${c||d===undefined?'':' — '+String(d).slice(0,170)}`); if(!c)fail++;};
G.getCalendar=()=>({getEventById:()=>({getTitle:()=>'[예식확정] x',setTitle(){},setDescription(){},deleteEvent(){}}),createAllDayEvent:()=>({getId:()=>'e',setDescription(){}})});
const IMG='data:image/jpeg;base64,'+'A'.repeat(2000);
let C=null,B=null;
function seed(over){ C=Object.assign({개인코드:CODE,신랑이름:'희준',신부이름:'미쿠',연락처:'010-0000-0000',이메일:'t@e.com',
  상품타입:'시그니처',현재단계:'입금완료',계약상태:'서명완료',계약서명일시:kstAgo(24*60),계약서발송일시:kstAgo(24*61),
  계약총액:2500000,예식일:'2026-12-20',입금상태:'확인',입금자명:'정희준',확인일시:NOW,
  동의기록:JSON.stringify({계약:{at:NOW},계약정보:{weddingDate:'2026-12-20',weddingTime:'12:20'},영수증기준일:{예약금:NOW}}),
  처리이력:''},over||{});
  B={개인코드:CODE,상태:'확정',선택날짜:'2026-09-01',선택시간:'14:50',토큰:'tk',입금확인:'확인'}; }
function act(fn){const w=world(Object.assign({},C),Object.assign({},B));G.setCustomerStage=REAL;
  G.resolveSession=()=>({ok:true,row:G.findCustomerByCode(CODE)});let r,e='';
  try{r=fn(G);}catch(x){e=String((x&&x.message)||x);}C=Object.assign({},w.C);if(w.B)B=Object.assign({},w.B);return{r,e};}
const snap=()=>JSON.stringify({s:C.현재단계,계약:C.계약상태,입금:C.입금상태,중도:C.중도금상태,잔금:C.잔금상태,
  결과:C.결과물상태,설문:C.설문상태,쿠폰:C.쿠폰상태,시착:C.시착동의상태});

/* [이름, 시드 덮어쓰기, 실행] — 두 번 부른다 */
const CASES=[
  ['시착 동의 보내기',{현재단계:'상담확정',계약상태:'',입금상태:''},g=>g.adminOpenFittingConsent(CODE)],
  ['시착 벌수 기록',{현재단계:'시착',계약상태:'',입금상태:'',시착동의상태:'동의완료'},g=>g.adminSetFittingCount(CODE,2)],
  ['계약서 발송',{현재단계:'상담완료',계약상태:'',입금상태:'',
    동의기록:JSON.stringify({계약정보:{weddingDate:'2026-12-20',weddingTime:'12:20'}})},
    g=>g.adminSendContract(CODE,'https://momentedit.kr/contract/v1-1.html',2500000,'2026-12-20','12:20')],
  ['입금 확인',{현재단계:'계약완료',입금상태:'완료신호'},g=>g.adminConfirmPayment(CODE)],
  ['중도금 확인',{현재단계:'제작중',중도금상태:'완료신호'},g=>g.adminConfirmMid(CODE)],
  ['잔금 확인',{현재단계:'제작중',잔금상태:'완료신호'},g=>g.adminConfirmBalance(CODE)],
  ['예식완료 처리',{현재단계:'제작중'},g=>g.adminMarkEventDone(CODE)],
  ['원본 링크 등록',{현재단계:'예식완료'},g=>g.adminSetResultLinks(CODE,{원본:'https://drive.google.com/drive/folders/AAAAAAAAAAAA'})],
  ['결과물 전달',{현재단계:'예식완료',결과물상태:'컨펌완료',원본링크:'https://drive.google.com/drive/folders/AAAAAAAAAAAA',
    보정본폴더:'https://drive.google.com/drive/folders/BBBBBBBBBBBB'},g=>g.adminMarkDelivered(CODE,true)],
  ['후기 넘기기',{현재단계:'결과물전달',결과물상태:'전달완료'},g=>g.adminSkipSurvey(CODE)],
  ['커피쿠폰 발급',{현재단계:'후기',결과물상태:'전달완료',설문상태:'완료'},g=>g.adminIssueCoupon(CODE,[IMG],'2026-11-20','스타벅스 커피 2잔')],
  ['커피쿠폰 회수',{현재단계:'후기',설문상태:'완료',쿠폰상태:'발급',쿠폰데이터:JSON.stringify({images:[IMG]})},g=>g.adminRevokeCoupon(CODE)],
  ['환불 완료 표시',{현재단계:'취소'},g=>g.adminMarkRefunded(CODE)],
  ['환불 표시 취소',{현재단계:'취소',동의기록:JSON.stringify({환불완료:NOW})},g=>g.adminUndoRefunded(CODE,'오처리')],
  ['강제변경(같은 단계)',{현재단계:'입금완료'},g=>g.adminForceStage(CODE,'입금완료','멱등 점검')],
  ['입금 확인 취소',{현재단계:'입금완료'},g=>g.adminUndoConfirmPayment(CODE,'계약금','오처리')],
];
console.log('\n═══ 관리자 동작 «두 번 누르기» 전수 ═══');
for (const [name,over,fn] of CASES){
  seed(over);
  const a=act(fn), s1=snap();
  const b=act(fn), s2=snap();
  const aOk=!!(a.r&&a.r.ok!==false)&&!a.e;
  ok(aOk,`${name} · 첫 번째가 성공`,a.e||JSON.stringify(a.r).slice(0,90));
  if(!aOk) continue;
  const bOk=!!(b.r&&b.r.ok!==false)&&!b.e;
  ok(bOk,`${name} · ★두 번째도 오류로 끝나지 않는다`,b.e||JSON.stringify(b.r).slice(0,110));
  ok(s1===s2,`${name} · ★두 번째가 상태를 바꾸지 않는다`,'1='+s1+' / 2='+s2);
}
console.log(`\n결과 — ${fail?'발견 '+fail+'건':'발견 0건'}`);
process.exit(fail?1:0);
