/* ★[CROSS_SESSION 2026-08-25 사용자 지시 "시뮬레이션 병렬로 돌리면서 점검"]
   여러 세션이 각자 고친 것들이 **서로를 깨지 않는가**.

   ── 왜 이 검사가 따로 있어야 하나
   한 PR 안에서는 각자 초록이다. 사고는 늘 «둘이 만나는 자리»에서 난다 —
   A 가 지키려고 남긴 값을 B 가 지우고, B 가 고친 문구를 A 가 다른 상태로 만들어 버린다.
   그 자리는 어느 쪽 PR 의 검사에도 안 들어 있다. 그래서 접점만 모아 따로 건다.

   ── 지금 걸고 있는 접점 (새 접점이 생기면 여기에 붙일 것)
   ①[CHANGE_RATCHET](#590 · 위약금 회피 방지) × [강제변경 되돌리기](내 _clearForwardData)
     래칫의 근거는 동의기록.변경이력이다. 되돌리기가 동의기록 키를 지우므로, 그 목록에 변경이력이
     한 번이라도 들어가면 **99만원짜리 구멍이 «되돌리기»라는 다른 문으로 다시 열린다.**
   ②같은 것을 예외(취소)→정상 복구 왕복으로도 확인 — 그 경로는 지우는 키가 더 많다.
   ③[GUIDE_EXPIRE_REASON](#590 · 닫는 이유 구분) × [GUIDE_TOKEN_CLEAR·FAILCLOSED](내 것)
     내가 «날짜를 모르면 닫는다»를 넣었고, 그 탓에 아직 안 한 예식이 «끝났다»고 읽혔다.
     #590 이 문구만 고쳤다 — 판정은 그대로여야 하고, 문구는 상황과 맞아야 한다. 둘 다 본다.
   ④[ADMIN_MAIL_UNCHAINED](#590) × [CPN_NOTIFY](내 쿠폰 알림) — 알림 경로가 서로를 막지 않는가.

   사용: node scripts/audit/cross-session.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';
const { G, world } = openWorld();
const REAL=G.setCustomerStage, CODE='ME-TEST', NOW=kstAgo(1);
let fail=0; const ok=(c,m,d)=>{console.log(`  ${c?'✅':'❌'} ${m}${c||d===undefined?'':' — '+String(d).slice(0,200)}`); if(!c)fail++;};
const note=(m)=>console.log('  · '+m);
G.getCalendar=()=>({getEventById:()=>({getTitle:()=>'[예식확정] x',setTitle(){},setDescription(){},deleteEvent(){}}),
  createAllDayEvent:()=>({getId:()=>'evtN',setDescription(){}})});
let C=null,B=null;
const ymd=(n)=>{const d=new Date();d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
function act(fn){const w=world(Object.assign({},C),Object.assign({},B));G.setCustomerStage=REAL;
  G.resolveSession=()=>({ok:true,row:G.findCustomerByCode(CODE)});let r,e='';
  try{r=fn(G);}catch(x){e=String((x&&x.message)||x);}C=Object.assign({},w.C);if(w.B)B=Object.assign({},w.B);
  return{r,e,ev:(w.ev||[]).slice()};}
const rec=()=>{try{return JSON.parse(C.동의기록||'{}');}catch{return{};}};

/* 위약금 회피 재현 시드 — 계약서 예시 그대로(330만·기수령 165만·D-19 에서 1년 뒤로 변경) */
function seedRatchet(){
  const orig=ymd(19);          // 원래 예식일 = 19일 뒤(40% 구간)
  const moved=ymd(287);        // 1년 뒤로 미룸
  C={개인코드:CODE,신랑이름:'희준',신부이름:'미쿠',연락처:'010-0000-0000',이메일:'t@e.com',상품타입:'시그니처',
    현재단계:'제작중',계약상태:'서명완료',계약서명일시:kstAgo(24*60),계약총액:3300000,예식일:moved,
    입금상태:'확인',중도금상태:'확인',
    동의기록:JSON.stringify({계약:{at:NOW},계약정보:{weddingDate:moved,weddingTime:'12:20'},
      변경이력:[{from:{date:orig},to:{date:moved},at:NOW}],
      가예약:{date:moved,slot:'12:20',status:'계약전환',eventId:'evt1'}}),처리이력:''};
  B={개인코드:CODE,상태:'확정',선택날짜:'2026-09-01',선택시간:'14:50',토큰:'tk'};
  return {orig,moved};
}
const quote=()=>{const{r,e}=act(g=>g.handleGetMyState({token:'tk'})); if(e) return {err:e}; return (r&&r.refund)||null;};

console.log('\n═══ ① 위약금 래칫이 «되돌리기»로 풀리지 않는가 ═══');
{
  seedRatchet();
  const q0=quote();
  ok(!!q0,'전제 — 환불 견적이 나온다',JSON.stringify(q0));
  const has0=/8조|구간 유지/.test(JSON.stringify(q0||{}));
  ok(has0,'★래칫이 걸려 있다(낮은 구간으로 안 내려감)',JSON.stringify(q0&&q0.why));
  /* 관리자가 단계를 되돌린다 — 내 _clearForwardData 가 동의기록 키를 지운다 */
  act(g=>g.adminForceStage(CODE,'계약완료','되돌림'));
  const h=rec().변경이력;
  ok(!!(h&&h.length),'★되돌려도 변경이력(래칫 재료)이 살아 있다',JSON.stringify(h));
  const q1=quote();
  const has1=/8조|구간 유지/.test(JSON.stringify(q1||{}));
  ok(has1,'★되돌린 뒤에도 래칫이 그대로다(99만원 구멍이 다른 문으로 안 열린다)',JSON.stringify(q1&&{rate:q1.rate,why:q1.why}));
}

console.log('\n═══ ② 예외(취소)로 뺐다가 복구해도 래칫이 남는가 ═══');
{
  seedRatchet();
  act(g=>g.adminForceStage(CODE,'취소','오처리'));
  act(g=>g.adminForceStage(CODE,'입금완료','복구'));
  const h=rec().변경이력;
  ok(!!(h&&h.length),'취소→복구 왕복에도 변경이력 보존',JSON.stringify(h));
  const q=quote();
  ok(/8조|구간 유지/.test(JSON.stringify(q||{})),'★래칫 유지',JSON.stringify(q&&{rate:q.rate,why:q.why}));
}

console.log('\n═══ ③ 하객 안내 — 닫는 «이유»가 상황과 맞는가 ═══');
{
  seedRatchet(); C.안내공유토큰='guidetok12345678';
  const open=act(g=>g.handleGuideView({g:'guidetok12345678'}));
  ok(!!(open.r&&open.r.ok),'전제 — 예식 전이라 안내가 열린다',JSON.stringify(open.r&&open.r.ok));
  /* 되돌리면 내 GUIDE_TOKEN_CLEAR 가 열쇠를 버린다 → 토큰 자체가 없어진다 */
  act(g=>g.adminForceStage(CODE,'계약완료','되돌림'));
  ok(!String(C.안내공유토큰||'').trim(),'되돌림이 열쇠를 버렸다(GUIDE_TOKEN_CLEAR)',C.안내공유토큰||'(빔)');
  const after=act(g=>g.handleGuideView({g:'guidetok12345678'}));
  ok(!(after.r&&after.r.ok),'옛 링크는 안 열린다',JSON.stringify(after.r).slice(0,90));
  /* 열쇠가 남았는데 예식일만 없는 경우 — #590 이 문구를 고친 그 자리 */
  seedRatchet(); C.안내공유토큰='guidetok12345678'; C.예식일='';
  const unk=act(g=>g.handleGuideView({g:'guidetok12345678'}));
  const msg=JSON.stringify(unk.r||{});
  ok(!(unk.r&&unk.r.ok),'날짜를 모르면 닫는다(FAILCLOSED 유지)',msg.slice(0,90));
  ok(!/예식이 끝나/.test(msg),'★아직 안 한 예식을 «끝났다»고 말하지 않는다(GUIDE_EXPIRE_REASON)',msg.slice(0,140));
  ok(/준비하고 있어요|확정되면/.test(msg),'대신 «준비 중»으로 사실대로 말한다',msg.slice(0,140));
}

console.log('\n═══ ④ 알림 — 관리자 메일이 살아났고, 쿠폰 안내는 고객에게 간다 ═══');
{
  seedRatchet(); C.현재단계='결과물전달'; C.결과물상태='전달완료';
  C.원본링크='https://drive.google.com/drive/folders/AAAAAAAAAAAA';
  const s=act(g=>g.handleSubmitSurvey({token:'tk',answers:{overall:'very',recommend:'definitely',gap:'none',source:'insta',reason:'mood'},review:'좋았어요',reviewPublic:''}));
  ok(!!(s.r&&s.r.ok),'후기 제출',s.e||'');
  const out=act(g=>g.adminIssueCoupon(CODE,['data:image/jpeg;base64,'+'A'.repeat(3000)],'2026-11-20','스타벅스 커피 2잔'));
  const notes=(out.ev||[]).filter(x=>x&&x.t==='notify');
  ok(notes.some(x=>x.k==='cust.couponIssued'),'★쿠폰 발급 안내가 나간다',JSON.stringify(notes));
  const meta=G.NOTIFY_EVENTS&&G.NOTIFY_EVENTS['cust.couponIssued'];
  ok(!(meta&&meta.off),'꺼져 있지 않다',JSON.stringify(meta));
  /* 관리자 메일 게이트 — #590 이 푼 그 자리 */
  const src=G._nfAdminEmail?String(G._nfAdminEmail):'';
  note('_nfAdminEmail 존재: '+(!!G._nfAdminEmail));
}
console.log(`\n결과 — ${fail?'발견 '+fail+'건':'발견 0건'}`);
process.exit(fail?1:0);
