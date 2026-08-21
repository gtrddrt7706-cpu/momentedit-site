/* ★[COUPON_FLOW 2026-08-18 사용자 지시 "연동 직접 시뮬 돌려보고 테스트 점검 · 개선점 찾아보기"]
   커피쿠폰(후기 완주 보상) 전 경로 — 서버·관리자 큐·고객 화면을 한 번에 건다.

   ── 왜 이 검사가 필요한가
   이 흐름은 **약속이 먼저 나가고 이행은 사람 손에 달린** 유일한 자리다.
   후기를 받는 순간 고객 화면은 «감사의 마음으로 커피 2잔을 준비해요»라고 말해 버린다.
   그런데 그 고객은 같은 순간 아카이브로 넘어가고, 남는 리마인드는 메일 한 통뿐이었다.
   말은 자동으로 나가는데 이행은 기억에 맡기는 구조 — 그래서 화면·큐·문구를 한 검사로 묶는다.

   보는 것: 발급/회수/재발급 · 잘못된 입력 방어 · 큐 등장·소멸 · 아카이브 · 알림 배선(꺼짐 확인)
   사용: node scripts/audit/coupon-flow.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';
const { G, world } = openWorld();
const REAL=G.setCustomerStage, CODE='ME-TEST', NOW=kstAgo(1);
let fail=0; const ok=(c,m,d)=>{console.log(`  ${c?'✅':'❌'} ${m}${c||d===undefined?'':' — '+String(d).slice(0,190)}`); if(!c)fail++;};
const note=(m)=>console.log('  · '+m);
let C=null,B=null;
const IMG='data:image/jpeg;base64,'+'A'.repeat(3000);
function seed(stage){ C={개인코드:CODE,신랑이름:'희준',신부이름:'미쿠',연락처:'010-0000-0000',이메일:'t@e.com',상품타입:'시그니처',
  현재단계:stage||'결과물전달',계약상태:'서명완료',계약총액:2500000,예식일:'2026-06-20',입금상태:'확인',중도금상태:'확인',잔금상태:'확인',
  결과물상태:'전달완료',원본링크:'https://drive.google.com/drive/folders/AAAAAAAAAAAA',보정본폴더:'https://drive.google.com/drive/folders/BBBBBBBBBBBB',
  설문상태:'',쿠폰상태:'',쿠폰데이터:'',동의기록:JSON.stringify({계약:{at:NOW},결과물전달일:'2026-07-10'}),처리이력:''};
  B={개인코드:CODE,상태:'확정',선택날짜:'2026-09-01',선택시간:'14:50',토큰:'tk'}; }
function act(fn){const w=world(Object.assign({},C),Object.assign({},B));G.setCustomerStage=REAL;
  G.resolveSession=()=>({ok:true,row:G.findCustomerByCode(CODE)});let r,e='';
  /* ★ev = 이 세계가 받아 적은 부작용 로그. 하네스가 notifyKakao 를 자기 스텁으로 갈아끼우므로
     (_gasworld 97) 스파이를 꽂아도 덮인다 — 알림은 이 로그로 확인한다. */
  try{r=fn(G);}catch(x){e=String((x&&x.message)||x);}C=Object.assign({},w.C);if(w.B)B=Object.assign({},w.B);
  return{r,e,ev:(w.ev||[]).slice()};}
const SURVEY={token:'tk',answers:{overall:'very',recommend:'definitely',gap:'none',source:'insta',reason:'mood'},review:'좋았어요',reviewPublic:'Y'};

console.log('\n═══ ① 정상 흐름 ═══');
seed();
let r=act(g=>g.handleSubmitSurvey(SURVEY));
ok(!!(r.r&&r.r.ok),'후기 제출',r.e||JSON.stringify(r.r).slice(0,80));
ok(C.설문상태==='완료'&&C.현재단계==='후기','설문 완료 · 단계 후기',C.설문상태+'/'+C.현재단계);
let st=act(g=>g.handleGetMyState({token:'tk'}));
ok(st.r&&st.r.coupon===null,'아직 쿠폰 카드는 없다(발급 전)',JSON.stringify(st.r&&st.r.coupon));
r=act(g=>g.adminIssueCoupon(CODE,[IMG],'2026-11-20','스타벅스 커피 2잔'));
ok(!!(r.r&&r.r.ok),'관리자 발급',r.e||JSON.stringify(r.r).slice(0,90));
ok(C.쿠폰상태==='발급','쿠폰상태=발급',C.쿠폰상태);
st=act(g=>g.handleGetMyState({token:'tk'}));
const cp=st.r&&st.r.coupon;
ok(!!cp&&cp.images.length===1,'★고객 화면에 바코드가 실린다',JSON.stringify(cp&&{t:cp.title,n:cp.images.length,e:cp.expiry}));
ok(cp&&cp.expiry==='2026-11-20','사용기한이 그대로 전달된다',cp&&cp.expiry);
ok(String(C.처리이력||'').indexOf('커피쿠폰 발급')!==-1,'처리이력에 남는다',String(C.처리이력||'').slice(-70));

console.log('\n═══ ② 회수·재발급 ═══');
r=act(g=>g.adminRevokeCoupon(CODE));
ok(!!(r.r&&r.r.ok)&&C.쿠폰상태==='회수','회수됨',C.쿠폰상태);
st=act(g=>g.handleGetMyState({token:'tk'}));
ok(st.r&&st.r.coupon===null,'고객 화면에서 사라진다',JSON.stringify(st.r&&st.r.coupon));
r=act(g=>g.adminIssueCoupon(CODE,[IMG,IMG],'2026-12-01','스타벅스 커피 2잔'));
ok(!!(r.r&&r.r.ok)&&C.쿠폰상태==='발급','재발급 된다(2장)',C.쿠폰상태);
st=act(g=>g.handleGetMyState({token:'tk'}));
ok(st.r&&st.r.coupon&&st.r.coupon.images.length===2,'2장 다 실린다',st.r&&st.r.coupon&&st.r.coupon.images.length);

console.log('\n═══ ③ 방어 — 잘못된 입력 ═══');
seed(); act(g=>g.handleSubmitSurvey(SURVEY));
r=act(g=>g.adminIssueCoupon(CODE,[],'2026-11-20',''));
ok(!(r.r&&r.r.ok),'이미지 없으면 거부',JSON.stringify(r.r).slice(0,90));
r=act(g=>g.adminIssueCoupon(CODE,['javascript:alert(1)'],'2026-11-20',''));
ok(!(r.r&&r.r.ok),'★data:image 가 아니면 거부(스크립트 주입 차단)',JSON.stringify(r.r).slice(0,90));
r=act(g=>g.adminIssueCoupon(CODE,['data:image/jpeg;base64,'+'A'.repeat(60000)],'2026-11-20',''));
ok(!(r.r&&r.r.ok),'너무 큰 이미지는 거부(셀 한계)',JSON.stringify(r.r).slice(0,90));
r=act(g=>g.adminIssueCoupon(CODE,[IMG],'','선물'));
ok(!!(r.r&&r.r.ok),'기한 없이도 발급은 된다(선택값)',JSON.stringify(r.r).slice(0,60));
st=act(g=>g.handleGetMyState({token:'tk'}));
ok(st.r&&st.r.coupon&&st.r.coupon.expiry==='','기한 없으면 빈값으로 내려간다(화면이 줄을 숨김)',JSON.stringify(st.r&&st.r.coupon&&st.r.coupon.expiry));

console.log('\n═══ ④ 서버 게이트 — 후기 안 낸 고객에게도 발급되나 ═══');
seed('입금완료'); C.설문상태='';
r=act(g=>g.adminIssueCoupon(CODE,[IMG],'2026-11-20',''));
note('결과: '+JSON.stringify(r.r).slice(0,90)+' / 쿠폰상태='+(C.쿠폰상태||'(빔)'));
note('화면 버튼은 «설문상태=완료»에서만 뜨지만(admin.html 2450), 서버엔 그 조건이 없다 — 관찰 항목');

console.log('\n═══ ⑤ 되돌림과의 충돌 — 쿠폰은 어떻게 되나 ═══');
seed(); act(g=>g.handleSubmitSurvey(SURVEY)); act(g=>g.adminIssueCoupon(CODE,[IMG],'2026-11-20',''));
ok(C.쿠폰상태==='발급'&&C.설문상태==='완료','전제 — 후기 완료 + 쿠폰 발급',C.쿠폰상태+'/'+C.설문상태);
const f=act(g=>g.adminForceStage(CODE,'결과물전달','후기 다시 받기'));
ok(!!(f.r&&f.r.ok),'결과물전달로 되돌림',JSON.stringify(f.r).slice(0,90));
note('되돌린 뒤 — 설문상태='+(C.설문상태||'(빔)')+' / 쿠폰상태='+(C.쿠폰상태||'(빔)'));
st=act(g=>g.handleGetMyState({token:'tk'}));
/* ★서버 쪽 의도: 쿠폰은 남기고(실제로 산 기프티콘이고 이미 썼을 수도 있다) 설문만 초기화한다.
   그래서 «쿠폰 있음 + 설문 미완료»가 정상 상태다 — 되돌린 뒤 후기를 다시 받을 수 있어야 하니까.
   ★이 조합에서 화면이 «후기 쓰면 커피 드려요»를 다시 말하면 안 되는데, 그 판정은 문구라 여기서 못 잰다.
     [CPN_SAY_ONCE] 실렌더 검사가 rollback-notice.mjs 에 있다(같은 상태를 진짜 mypage 에 그려 확인). */
ok(!!(st.r&&st.r.coupon),'되돌려도 쿠폰은 남는다(준 것을 도로 가져가지 않는다)',JSON.stringify(!!(st.r&&st.r.coupon)));
ok(!(st.r&&st.r.result&&st.r.result.survey&&st.r.result.survey.status==='완료'),
  '설문은 초기화된다(후기를 다시 받을 수 있다)',JSON.stringify(st.r&&st.r.result&&st.r.result.survey));


/* ── 관리자 큐·아카이브 — «약속했으면 화면에 남는가» [CPN_QUEUE] ── */
const q=(k)=>{const{r,e}=act(g=>g.adminHome()); if(e){console.log('   adminHome 예외: '+e.slice(0,160)); return [];}
  const qq=(r&&r.queue)||{}; return ((qq.urgent||[]).concat(qq.normal||[])).filter(x=>!k||x.kind===k);};
const arch=()=>{const{r,e}=act(g=>g.adminArchive('','all')); if(e){console.log('   adminArchive 예외: '+e.slice(0,160)); return [];} return (r&&r.results)||[];};

console.log('\n═══ ① 후기 전 — 쿠폰 큐 없음 ═══');
seed();
ok(q('쿠폰발급').length===0,'후기 전엔 안 뜬다',JSON.stringify(q('쿠폰발급').map(x=>x.sub)));

console.log('\n═══ ② 후기 제출 — 큐에 뜨고, 아카이브로 안 넘어간다 ═══');
act(g=>g.handleSubmitSurvey(SURVEY));
const items=q('쿠폰발급');
ok(items.length===1,'★「쿠폰발급」 1건이 뜬다',JSON.stringify(items.map(x=>x.sub)));
if(items.length){
  ok(/커피쿠폰\(스타벅스 2잔\) 바코드를 등록/.test(items[0].sub),'다음 행동이 문장에 있다',items[0].sub);
  ok(items[0].sub.indexOf('—')===-1,'전각 줄표 없음',items[0].sub);
  ok(!items[0]._urgent,'급한 일로 위장하지 않는다(조용한 항목)',JSON.stringify(items[0].badge));
}
/* ★설계 결정: 아카이브 정의는 건드리지 않는다(후기 마감 = 끝난 고객). 대신 «끝났어도 우리 의무»는
   큐에 남긴다 — 추가보정 입금·현금영수증 미발행이 이미 그렇게 동작한다. 같은 자리, 같은 규칙. */
ok(arch().filter(x=>x.code===CODE).length===1,'아카이브에는 들어간다(후기 마감 = 끝난 고객)',JSON.stringify(arch().map(x=>x.code)));
ok(q('쿠폰발급').length===1,'★그래도 할 일은 큐에 남는다(끝난 고객이라도 의무는 남는다)',JSON.stringify(q('쿠폰발급').map(x=>x.kind)));

console.log('\n═══ ③ 발급하면 큐가 비고 아카이브로 넘어간다 ═══');
act(g=>g.adminIssueCoupon(CODE,[IMG],'2026-11-20','스타벅스 커피 2잔'));
ok(q('쿠폰발급').length===0,'큐에서 사라진다',JSON.stringify(q('쿠폰발급').map(x=>x.sub)));
ok(arch().filter(x=>x.code===CODE).length===1,'★이제 «끝난 고객»으로 아카이브에 들어간다',JSON.stringify(arch().map(x=>x.code)));

console.log('\n═══ ④ 회수하면 다시 미완으로 돌아온다 ═══');
act(g=>g.adminRevokeCoupon(CODE));
const it2=q('쿠폰발급');
ok(it2.length===1,'큐에 다시 뜬다',JSON.stringify(it2.map(x=>x.sub)));
ok(it2.length&&/회수 후 미발급/.test(it2[0].sub),'회수였다는 사실을 말한다',it2.length&&it2[0].sub);
ok(arch().filter(x=>x.code===CODE).length===1,'아카이브 자리는 그대로(끝난 고객)',JSON.stringify(arch().map(x=>x.code)));

console.log('\n═══ ⑤ 후기를 «건너뜀» 처리한 고객은 대상이 아니다 ═══');
seed(); act(g=>g.adminSkipSurvey(CODE));
ok(C.설문상태==='건너뜀','전제 — 건너뜀',C.설문상태);
ok(q('쿠폰발급').length===0,'★후기를 안 쓴 분께 드릴 커피는 없다(큐에 안 뜸)',JSON.stringify(q('쿠폰발급').map(x=>x.sub)));
ok(arch().filter(x=>x.code===CODE).length===1,'건너뜀은 종전대로 아카이브',JSON.stringify(arch().map(x=>x.code)));

console.log('\n═══ ⑥ 알림 — 발급 시 이벤트가 «꺼진 채» 배선돼 있는가 ═══');
seed(); act(g=>g.handleSubmitSurvey(SURVEY));
{
  /* ★하네스가 notifyKakao 를 자기 스텁으로 갈아끼운다(_gasworld 97) — 스파이를 꽂아도 덮인다.
     그래서 «세계의 이벤트 로그»를 읽는다. 자를 하네스에 맞춰야지, 하네스를 속이면 안 된다. */
  const out=act(g=>g.adminIssueCoupon(CODE,[IMG],'2026-11-20','스타벅스 커피 2잔'));
  const notes=(out.ev||[]).filter(x=>x&&x.t==='notify');
  ok(notes.some(x=>x.k==='cust.couponIssued'),'★발급 시 알림 이벤트를 부른다',JSON.stringify(notes));
  const meta=G.NOTIFY_EVENTS&&G.NOTIFY_EVENTS['cust.couponIssued'];
  ok(!!meta,'이벤트가 표에 등록돼 있다(미등록이면 조용히 버려진다)',JSON.stringify(meta));
  ok(!!(meta&&meta.off),'★기본은 꺼짐 — 고객에게 실제로 나가지 않는다(사용자가 켤 때까지)',JSON.stringify(meta));
}
console.log(`\n결과 — ${fail?'발견 '+fail+'건':'발견 0건'}`);
process.exit(fail?1:0);
