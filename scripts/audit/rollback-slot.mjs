/* ★[ROLLBACK_SLOT_AUDIT 2026-08-18 사용자 결정 «추천대로»] 되돌려도 예식 «자리»는 이 부부 것이다.

   ── 왜 이 검사가 필요한가
   점유 판정(_weddingOccupancy)은 «계약상태=서명완료 + 예식일 + 계약정보.weddingTime» 셋을 함께 본다.
   되돌리면 계약상태가 비워지므로, 아무것도 안 하면 그 날짜가 **다른 부부에게 열린다.**
   되돌린 부부는 그 사실을 모른다 — 사고 복구가 날짜 상실로 끝난다.
   그래서 되돌릴 때 확정 점유를 임시고정(승인·14일)으로 되돌려 잠근다.
   ★«잠갔다»는 말이 아니라 **점유 판정으로** 확인한다. 기록만 남고 판정이 안 따라오면 아무 소용이 없다.

   ── 함께 보는 것 (사용자가 고른 (나) 두 가지)
   ·자리를 여는 것은 관리자가 고른다(기본은 잠금) · 종료·신청접수는 자동으로 연다
   ·캘린더는 **지우지 않는다** — 제목만 [가예약]·[보류]로 바꾸고, 다시 서명하면 [예식확정]으로 돌아온다

   사용: node scripts/audit/rollback-slot.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const CODE = 'ME-TEST';
const NOW = kstAgo(1);
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 120)}`); if (!c) fail++; };

/* 캘린더 목 — 진짜 CalendarApp 은 샌드박스에 없다. 제목이 실제로 어떻게 바뀌는지 보려고 최소한만 흉내낸다.
   ★지워졌는지도 재야 한다(사용자가 «지우지 않는다»를 골랐다) — deleted 플래그로 남긴다. */
const CAL = { title: '[예식확정] 희준·미쿠 · 12:20', deleted: false };
G.getCalendar = () => ({
  getEventById: (id) => (id === 'evt123' && !CAL.deleted ? {
    getTitle: () => CAL.title,
    setTitle: (t) => { CAL.title = t; },
    setDescription: () => {},
    deleteEvent: () => { CAL.deleted = true; },
  } : null),
});

let C = null, B = null;
function seed(stage) {
  CAL.title = '[예식확정] 희준·미쿠 · 12:20'; CAL.deleted = false;
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: '시그니처', 현재단계: stage || '입금완료', 계약상태: '서명완료', 계약서명일시: NOW, 계약서발송일시: NOW,
    계약총액: 2500000, 예식일: '2026-12-20', 입금상태: '확인',
    동의기록: JSON.stringify({ 계약: { at: NOW }, 계약정보: { weddingDate: '2026-12-20', weddingTime: '12:20' },
      가예약: { date: '2026-12-20', slot: '12:20', status: '계약전환', eventId: 'evt123' } }), 처리이력: '' };
  B = { 개인코드: CODE, 상태: '확정', 선택날짜: '2026-09-01', 선택시간: '14:50', 토큰: 'tk' };
}
function act(fn) {
  const w = world(Object.assign({}, C), Object.assign({}, B));
  G.setCustomerStage = REAL;
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let r, e = '';
  try { r = fn(G); } catch (x) { e = String((x && x.message) || x); }
  C = Object.assign({}, w.C); if (w.B) B = Object.assign({}, w.B);
  return { r, e };
}
/* 진짜 점유 판정 — «다른 부부가 이 날을 잡을 수 있는가»의 유일한 답 */
const occupied = () => G._weddingOccupancy(C.예식일, C.계약상태, C.현재단계, C.동의기록);

console.log('\n═══ 기본 — 되돌려도 잠근 채 둔다 ═══');
seed();
ok(!!occupied(), '전제 — 되돌리기 전엔 이 부부가 자리를 쥐고 있다', JSON.stringify(occupied()));
const pv = act((g) => g.adminForceStagePreview(CODE, '상담완료'));
ok(!!(pv.r && pv.r.slot && pv.r.slot.plan === 'lock'), '미리보기가 «잠금»이라고 미리 말한다', JSON.stringify(pv.r && pv.r.slot));
const f = act((g) => g.adminForceStage(CODE, '상담완료', '자리 점검'));
ok(!!(f.r && f.r.ok && f.r.slot && f.r.slot.plan === 'lock'), '실행 결과도 «잠금»(예고와 실행이 같다)', JSON.stringify(f.r && f.r.slot));
ok(!!occupied(), '★되돌린 뒤에도 자리가 이 부부 것이다(점유 판정으로 확인)', JSON.stringify(occupied()));
{
  const h = JSON.parse(C.동의기록 || '{}').가예약 || {};
  ok(h.status === '승인' && h.source === '단계되돌림' && !!h.expires,
    '임시고정(승인·기한 있음)으로 되돌려 놓는다 — 무기한으로 묶지 않는다', JSON.stringify(h));
}
ok(!CAL.deleted, '★캘린더 일정을 지우지 않는다', CAL.title);
ok(CAL.title.indexOf('[가예약]') === 0, '캘린더 제목이 상태를 말한다([가예약])', CAL.title);
ok(String(C.처리이력 || '').indexOf('예식 자리 잠금 유지') !== -1, '처리이력에 자리 처리가 남는다', String(C.처리이력 || '').slice(-90));

console.log('\n═══ 관리자가 «다른 분께 엽니다»를 고른 경우 ═══');
seed();
const f2 = act((g) => g.adminForceStage(CODE, '상담완료', '자리 개방', true));
ok(!!(f2.r && f2.r.slot && f2.r.slot.plan === 'release'), '실행 결과가 «개방»', JSON.stringify(f2.r && f2.r.slot));
ok(!occupied(), '★자리가 풀린다(다른 분이 잡을 수 있다)', JSON.stringify(occupied()));
ok(!CAL.deleted && CAL.title.indexOf('[보류]') === 0, '열더라도 캘린더는 지우지 않고 제목만 [보류]로', CAL.title + ' / 삭제=' + CAL.deleted);
ok(String(C.처리이력 || '').indexOf('예식 자리 개방') !== -1, '처리이력에 «개방»이 분명히 남는다', String(C.처리이력 || '').slice(-90));

console.log('\n═══ 종료로 뺄 때 — 자리는 놓아 준다(고를 것이 없다) ═══');
for (const ex of G.STAGE_EXCEPTIONS) {
  seed();
  const r = act((g) => g.adminForceStage(CODE, ex, '오처리'));
  ok(!!(r.r && r.r.slot && r.r.slot.plan === 'release'), `${ex} · 자리를 놓아 준다`, JSON.stringify(r.r && r.r.slot));
  ok(!occupied(), `${ex} · 점유가 풀린다`, JSON.stringify(occupied()));
  ok(!CAL.deleted, `${ex} · 그래도 캘린더는 지우지 않는다`, CAL.title);
}

console.log('\n═══ 신청접수까지 내리면 — 새로 시작이라 자리도 놓는다 ═══');
seed();
const f3 = act((g) => g.adminForceStage(CODE, '신청접수', '전부 초기화'));
ok(!!(f3.r && f3.r.slot && f3.r.slot.plan === 'release'), '자리를 놓아 준다', JSON.stringify(f3.r && f3.r.slot));
ok(!CAL.deleted, '★확정된 예식은 지우지 않는다(제목만 [보류])', CAL.title + ' / 삭제=' + CAL.deleted);

console.log('\n═══ 앞으로 가는 이동은 자리를 건드리지 않는다 ═══');
seed('계약완료');
const f4 = act((g) => g.adminForceStage(CODE, '입금완료', '복구'));
ok(!(f4.r && f4.r.slot && f4.r.slot.plan), '«잠금»도 «개방»도 아니다(할 일이 없다)', JSON.stringify(f4.r && f4.r.slot));
ok(CAL.title.indexOf('[예식확정]') === 0, '캘린더 제목도 그대로', CAL.title);

console.log('\n═══ 잠근 뒤 다시 서명하면 확정으로 돌아온다 ═══');
seed();
act((g) => g.adminForceStage(CODE, '상담완료', '되돌림'));
ok(CAL.title.indexOf('[가예약]') === 0, '전제 — 지금 제목은 [가예약]', CAL.title);
{
  /* 재서명은 70_journey 가 접두사를 통째로 갈아끼운다. 그 한 줄만 그대로 불러 확인한다
     (전체 서명 흐름은 journey-sim 이 따로 본다 — 여기서는 «제목이 돌아오는가»만). */
  const ev = G.getCalendar().getEventById('evt123');
  ev.setTitle('[예식확정] ' + String(ev.getTitle() || '').replace(/^\s*\[[^\]]*\]\s*/, ''));
  ok(CAL.title === '[예식확정] 희준·미쿠 · 12:20', '★[가예약]에서도 [보류]에서도 [예식확정]으로 되돌아온다', CAL.title);
}


/* ══ [연동·회귀] 임시고정 장치를 재활용했으니, 그 장치를 쓰는 «모든 길»이 이 상태를 감당해야 한다 ══
   ★아래 검사들은 되돌림 지점을 «상담완료»로 잡는다 — 계약 요청이 열리는 자리가 거기뿐이라(70_journey 461),
     상담확정으로 내려 놓고 요청하면 제품이 옳게 막는다(CONTRACT_STAGE_GATE). 그건 결함이 아니다. */
const rec = () => { try { return JSON.parse(C.동의기록 || '{}'); } catch { return {}; } };
const ymdShift = (n) => { const d = new Date(); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
const setExp = (d) => { const rc = rec(); rc.가예약.expires = d; C.동의기록 = JSON.stringify(rc); };
const qOf = (kind) => { const { r, e } = act((g) => g.adminHome()); if (e) return []; 
  const qq = (r && r.queue) || {}; return ((qq.urgent || []).concat(qq.normal || [])).filter((x) => !kind || x.kind === kind); };
function seedFull() {   /* 계약정보까지 갖춘 시드 — 재요청·재서명 왕복을 걸어 보려면 필요하다 */
  seed();
  const rc = JSON.parse(C.동의기록);
  rc.계약정보 = { weddingDate: '2026-12-20', weddingTime: '12:20', groomBirth: '1990-01-01', brideBirth: '1991-02-02', groomAddr: '서울 1', brideAddr: '서울 2' };
  C.동의기록 = JSON.stringify(rc);
}

console.log('\n═══ [연동] 잠근 뒤 고객 화면이 말이 되는가(buildHoldState) ═══');
seedFull(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
{
  const st=act(g=>g.handleGetMyState({token:'tk'}));
  ok(!st.e,'고객 화면이 던지지 않는다',st.e);
  const h=st.r&&st.r.hold;
  ok(!!h,'임시고정 카드가 뜬다(자리가 잡혀 있음을 두 분도 안다)',JSON.stringify(h));
  const blob=JSON.stringify(h||{});
  ok(blob.indexOf('—')===-1,'전각 줄표 없음',blob.slice(0,120));
  ok(!/단계되돌림|강제/.test(blob),'★내부 용어(단계되돌림)가 고객에게 새지 않는다',blob.slice(0,160));
}

console.log('\n═══ ② 관리자가 그 잠금을 풀 수 있는가(해제 버튼) ═══');
seedFull(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
{
  const r=act(g=>g.adminDeclineWeddingHold(CODE));
  ok(!!(r.r&&r.r.ok),'해제(거절) 버튼이 먹는다',r.e||JSON.stringify(r.r).slice(0,90));
  ok(!rec().가예약,'해제하면 잠금이 사라진다',JSON.stringify(rec().가예약||null));
  const occ=G._weddingOccupancy(C.예식일,C.계약상태,C.현재단계,C.동의기록);
  ok(!occ,'해제 후 자리가 열린다',JSON.stringify(occ));
}

console.log('\n═══ ③ 두 분이 같은 날짜로 다시 계약 요청 — 자기 잠금에 막히지 않는가 ═══');
/* ★계약 요청이 열리는 자리는 «상담완료»뿐이다(70_journey 461). 상담확정으로 내려 놓고 요청하면
   제품이 옳게 막는다 — 그건 결함이 아니라 CONTRACT_STAGE_GATE 가 지키는 순서다. */
seedFull(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
{
  ok(!!rec().가예약,'전제 — 잠금이 걸려 있다',JSON.stringify(rec().가예약));
  const r=act(g=>g.handleRequestContract({token:'tk',info:{weddingDate:'2026-12-20',weddingTime:'12:20',
    groomBirth:'1990-01-01',brideBirth:'1991-02-02',groomAddr:'서울 1',brideAddr:'서울 2',consent:true}}));
  ok(!!(r.r&&r.r.ok),'★같은 날짜로 다시 요청해도 «내» 잠금에 막히지 않는다',r.e||JSON.stringify(r.r).slice(0,150));
}

console.log('\n═══ ④ 다른 고객은 그 날짜를 못 잡는가(잠금이 진짜인가) ═══');
seedFull(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
{
  const taken=(()=>{const w=world(Object.assign({},C),Object.assign({},B));
    try{return G._weddingSlotTaken(G.getCustomersSheet(),G.buildHeaderIndex(G.getCustomersSheet()),'2026-12-20','12:20','ME-OTHER');}catch(e){return 'ERR '+e.message;}})();
  ok(taken===true,'★다른 고객 기준으로는 «찼음»으로 보인다',String(taken));
}

console.log('\n═══ ⑤ 만료 안내(D-3)가 이 상태를 감당하는가 ═══');
seedFull(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
{
  const r=act(g=>g.sendHoldExpiryNotices());
  ok(!r.e,'만료 안내 배치가 던지지 않는다',r.e);
}

console.log('\n═══ ⑥ 되돌림→재서명 왕복 — 자리가 확정으로 돌아오는가 ═══');
seedFull(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
{
  act(g=>g.handleRequestContract({token:'tk',info:{weddingDate:'2026-12-20',weddingTime:'12:20',
    groomBirth:'1990-01-01',brideBirth:'1991-02-02',groomAddr:'서울 1',brideAddr:'서울 2',consent:true}}));
  const s=act(g=>g.adminSendContract(CODE,'https://momentedit.kr/contract/v1-1.html',2500000,'2026-12-20','12:20'));
  ok(!!(s.r&&s.r.ok),'계약서 재발송',s.e||JSON.stringify(s.r).slice(0,120));
  const g2=act(g=>g.handleSignContract({token:'tk',signature:'data:image/png;base64,AAA',agree:true}));
  ok(!!(g2.r&&g2.r.ok),'재서명',g2.e||JSON.stringify(g2.r).slice(0,120));
  const h=rec().가예약||{};
  ok(h.status==='계약전환','★잠금이 다시 «계약전환»(확정)으로 돌아온다',JSON.stringify(h));
  const occ=G._weddingOccupancy(C.예식일,C.계약상태,C.현재단계,C.동의기록);
  ok(!!occ&&occ.date==='2026-12-20'&&occ.slot==='12:20','확정 점유로 복귀',JSON.stringify(occ));
}

console.log('\n═══ ⑦ 이중 실행(연타) — 같은 되돌림을 두 번 눌러도 안전한가 ═══');
seed();
{
  const a=act(g=>g.adminForceStage(CODE,'상담완료','1차'));
  const h1=JSON.stringify(rec().가예약);
  const b=act(g=>g.adminForceStage(CODE,'상담완료','2차'));
  ok(!!(b.r&&(b.r.ok||b.r.noop)),'두 번째도 오류 없이 처리',JSON.stringify(b.r).slice(0,110));
  const h2=JSON.stringify(rec().가예약);
  ok(!!rec().가예약,'잠금이 사라지지 않는다',h2);
  ok(rec().가예약.date==='2026-12-20'&&rec().가예약.slot==='12:20','날짜·슬롯이 그대로',h2);
}

console.log('\n═══ [만료] 갓 잠갔을 때(14일 남음) — 아직 안 띄운다 ═══');
seed(); act(g=>g.adminForceStage(CODE,'상담완료','되돌림'));
ok(qOf('자리만료').length===0,'만료가 멀면 큐를 어지럽히지 않는다',JSON.stringify(qOf('자리만료').map(x=>x.sub)));

console.log('\n═══ 만료 임박(D-2) — 관리자에게 뜬다 ═══');
setExp(ymdShift(2));
{
  const items=qOf('자리만료');
  ok(items.length===1,'★「자리만료」 1건이 뜬다',JSON.stringify(items.map(x=>x.sub)));
  if(items.length){
    ok(/2026\.12\.20\(일\)/.test(items[0].sub),'어느 날짜인지 이름을 부른다',items[0].sub);
    ok(!/\d{4}-\d{2}-\d{2}/.test(items[0].sub),'★한 문장 안에서 날짜 표기를 섞지 않는다(전부 2026.8.20(수) 꼴)',items[0].sub);
    ok(/계약서를 다시 보내/.test(items[0].sub),'다음 행동이 문장에 있다',items[0].sub);
    ok(items[0].badge&&items[0].badge.level==='red','D-2 는 빨강',JSON.stringify(items[0].badge));
    ok(items[0].sub.indexOf('—')===-1,'전각 줄표 없음',items[0].sub);
  }
}

console.log('\n═══ 이미 지났을 때 — 사실대로 말한다 ═══');
setExp(ymdShift(-1));
{
  const items=qOf('자리만료');
  ok(items.length===1,'만료된 뒤에도 뜬다(조용히 사라지지 않는다)',JSON.stringify(items.map(x=>x.sub)));
  if(items.length){
    ok(/이미 풀렸어요/.test(items[0].sub),'★«풀렸다»고 사실대로 말한다',items[0].sub);
    ok(items[0].badge&&items[0].badge.text==='자리 풀림','배지도 사실대로',JSON.stringify(items[0].badge));
  }
}

console.log('\n═══ 다시 계약이 서명되면 사라진다 ═══');
{
  C.계약상태='서명완료';
  ok(qOf('자리만료').length===0,'서명되면 큐에서 빠진다',JSON.stringify(qOf('자리만료').map(x=>x.sub)));
}

console.log('\n═══ 평범한 계약요청 홀드는 안 띄운다(큐 소음 방지) ═══');
seed(); C.현재단계='상담완료'; C.계약상태='';
{
  const rc=JSON.parse(C.동의기록); rc.가예약={date:'2026-12-20',slot:'12:20',status:'승인',source:'계약요청',expires:ymdShift(2)};
  C.동의기록=JSON.stringify(rc);
  ok(qOf('자리만료').length===0,'★source 가 계약요청이면 이 큐에 안 뜬다(계약발송 큐가 이미 몬다)',JSON.stringify(qOf('자리만료').map(x=>x.sub)));
}

console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
