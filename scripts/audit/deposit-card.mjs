// 상담 예약금 카드결제 [DEPOSIT_CARD] — 서버가 결정대로 도는지 «실제 .gs 함수»를 불러 잰다.
//
// ★[DEPOSIT_CARD 2026-09-25 사장님 «추천대로»] 예약 화면(schedule.html)에서 상담 예약금도 카드로 받는다.
//   카드 승인 = 예약 확정이라 되돌리기 비싼 변경이다 — 그래서 문자열이 아니라 돈의 길을 하나씩 태워 본다.
//     ① 카드결제가 꺼져 있으면(PAY_CARD_ENABLED) 설정도 승인도 아무 일도 안 한다(라이브 영향 0)
//     ② 켜져 있으면 설정 조회가 금액·키를 준다
//     ③ 승인 성공 → 입금확인·결제수단·카드키 기록 → 락 밖에서 자동 확정(승인완료) · 토스는 딱 한 번
//     ④ 같은 주문을 다시 부르면(복귀 화면 새로고침) «성공»으로 다시 알려 주고 토스는 안 부른다
//     ⑤ 이미 계좌이체로 확인된 예약금이면 결제하지 않는다
//     ⑥ 그 시간이 이미 확정됐으면 결제 «전»에 막는다(돈부터 받지 않는다)
//     ⑦ 금액이 다르면 막는다 · ⑧ 시간 선택 전(신청접수)이면 막는다 · ⑨ 스냅은 쓰지 않는다
//     ⑩ 토스가 거절하면 아무것도 적지 않는다
//     ⑪ 결제는 됐는데 확정 순간 그 시간이 찼으면 → 결제 기록은 남고 «변경 제안 필요» 관리자 알림
//     ⑫ 신청이 «카드로 낼 신청»임을 적고, 관리자 알림이 «승인 필요»가 아니라 «카드 결제 대기»가 된다(꺼져 있으면 무시)
//     ⑬ 환불 — 카드 예약금뿐이면 계좌를 여쭙지 않고, 처리할 일·마이페이지·취소 화면이 «카드 결제 취소»로 말한다
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다([SERVED_OURS])
import { openWorld, kstAheadWeekday } from './_gasworld.mjs';

let rc = 0;
const say = (c, m, d) => {
  console.log(`  ${c ? '✅' : '❌'} ${m}${c || d === undefined ? '' : ' → ' + String(d).slice(0, 220)}`);
  if (!c) rc = 1;
};

let G, world;
try { ({ G, world } = openWorld()); }
catch (e) { console.log('━━ deposit-card — GAS 세계를 못 만들었습니다 · 재지 못했습니다: ' + e.message); process.exit(2); }
for (const fn of ['handleCardPayConfig', 'handleCardConfirm', '_depositCardConfirm', '_depositCardConfig', 'actApprove', 'submitSchedule',
  '_maybeRefundAcctReq', '_depositCardOf', 'handleEmailCancelInfo', 'buildConsultState', 'buildRefundBankState', 'adminHome', '_nfAdminText']) {
  if (typeof G[fn] !== 'function') { console.log(`━━ deposit-card — ${fn} 이 없습니다 · 재지 못했습니다`); process.exit(2); }
}

const props = G.PropertiesService.getScriptProperties();
const cardOn = (on) => {
  if (on) { props.setProperty('PAY_CARD_ENABLED', 'true'); props.setProperty('TOSS_SECRET_KEY', 'test_sk_x'); props.setProperty('TOSS_CLIENT_KEY', 'test_ck_x'); }
  else props.deleteProperty('PAY_CARD_ENABLED');
};
const DAY = kstAheadWeekday(12);   // 과거가 되지도, 주말이 되지도 않는 날([KST_AHEAD]·[KST_WEEKDAY])

let tossCalls = 0, tossAns = { ok: true }, slotSeq = null, adminLines = [], notes = [], approveSide = [];
function mk(cust, book) {
  const w = world(Object.assign({ 개인코드: 'ME-TEST', 상품타입: '시그니처', 현재단계: '신청접수', 신랑이름: '김', 신부이름: '이', 동의기록: '' }, cust || {}),
    book === null ? null : Object.assign({ 상태: '시간선택완료', 선택날짜: DAY, 선택시간: '14:50', 입금확인: '', 토큰: 'ctok', 이메일: 'a@b.c', 연락처: '01012345678' }, book || {}));
  tossCalls = 0; tossAns = { ok: true }; slotSeq = null; adminLines = []; notes = []; approveSide = [];
  G._sessionToConsult = () => ({ ok: true, code: 'ME-TEST', cust: G.findCustomerByCode(), consult: G.findRowByPersonalCode() });
  G._tossConfirm = () => { tossCalls++; return tossAns; };
  G._slotTaken = () => (slotSeq ? slotSeq.shift() : false);
  G.syncCalendarEvent = () => { approveSide.push('cal'); };
  G._bustAvailCache = () => {};
  G.sendConfirmEmail = () => { approveSide.push('confirmMail'); };
  G.sendStudioBriefEmail = () => {};
  G._nfAdminLineEmail = (t) => { adminLines.push(String(t)); };
  G.notifyKakao = (k, code, x) => { notes.push({ k, x: x || {} }); };
  G.sendAdminNotifyEmail = (row, dk, tm, flex, etc, byCard) => { notes.push({ k: 'adminMail', x: { card: !!byCard } }); };
  return w;
}
const rec = (w) => { try { return JSON.parse(w.C['동의기록'] || '{}'); } catch (e) { return {}; } };
const call = (fn, body) => { try { return G[fn](body); } catch (e) { return { ok: false, error: 'THROW ' + e.message }; } };
const BODY = (o) => Object.assign({ token: 't', milestone: '예약금', paymentKey: 'pk_1', orderId: 'MD_1', amount: 100000 }, o || {});

console.log('━━ deposit-card — ① 꺼져 있으면 아무 일도 안 한다');
{
  mk(); cardOn(false);
  const c = call('handleCardPayConfig', { token: 't', milestone: '예약금' });
  say(c && c.ok === true && c.enabled === false, '설정 조회 → enabled:false', JSON.stringify(c));
  const r = call('handleCardConfirm', BODY());
  say(r && r.ok === false && tossCalls === 0, '승인 → 거절 · 토스 안 부름', JSON.stringify(r));
}

console.log('━━ deposit-card — ② 켜져 있으면 금액·키를 준다');
{
  mk({}, { 상태: '신청접수', 선택날짜: '', 선택시간: '' }); cardOn(true);
  const c = call('handleCardPayConfig', { token: 't', milestone: '예약금' });
  say(c && c.ok && c.enabled === true && c.amount === 100000 && c.clientKey === 'test_ck_x' && /예약금/.test(c.orderName || ''), '시간 선택 전에도 결제 방법을 고를 수 있다(금액 100,000 · 공개키)', JSON.stringify(c));
}

console.log('━━ deposit-card — ③ 승인 성공 → 기록 → 자동 확정');
{
  const w = mk(); cardOn(true);
  const r = call('handleCardConfirm', BODY());
  const R = rec(w);
  say(r && r.ok && r.recorded && r.approved === true, '응답 ok · approved', JSON.stringify(r));
  say(tossCalls === 1, '토스 승인은 딱 한 번', tossCalls);
  say(w.B['입금확인'] === '확인', '예약 시트 입금확인 = 확인', w.B['입금확인']);
  say(w.B['상태'] === '승인완료', '상태 = 승인완료(자동 확정)', w.B['상태']);
  say(approveSide.indexOf('cal') !== -1 && approveSide.indexOf('confirmMail') !== -1, '확정 부수효과(캘린더·확정 메일)가 기존 승인과 같은 길로 간다', approveSide.join(','));
  say((R.결제수단 || {}).예약금 === '카드', '결제수단.예약금 = 카드(현금영수증 발급 큐에서 빠진다)', JSON.stringify(R));
  say(((R.카드결제 || {}).예약금 || {}).orderId === 'MD_1' && ((R.카드결제 || {}).예약금 || {}).paymentKey === 'pk_1', '카드 취소에 쓸 주문번호·결제키를 남긴다', JSON.stringify(R.카드결제));
  say(!!r.date && r.time === '14:50', '화면이 띄울 확정 일시를 돌려준다', JSON.stringify(r));
  say(adminLines.some((t) => /자동 확정됨/.test(t)), '관리자 한 줄 알림 «예약 자동 확정됨»', adminLines.join(' | '));

  console.log('━━ deposit-card — ④ 같은 주문 재호출(새로고침) → 성공으로 다시 알림 · 토스 안 부름');
  const r2 = call('handleCardConfirm', BODY());
  say(r2 && r2.ok && r2.repeat === true && r2.approved === true && !r2.already, '재호출 → ok · repeat · approved(«결제 안 됨»으로 오인시키지 않는다)', JSON.stringify(r2));
  say(tossCalls === 1, '토스는 여전히 한 번', tossCalls);
  const r3 = call('handleCardConfirm', BODY({ orderId: 'MD_2', paymentKey: 'pk_2' }));
  say(r3 && r3.ok && r3.already === true && tossCalls === 1, '다른 주문으로 또 결제하려 하면 막는다(이중 결제 0)', JSON.stringify(r3));
}

console.log('━━ deposit-card — ⑤ 이미 계좌이체로 확인된 예약금');
{
  const w = mk({}, { 입금확인: '확인' }); cardOn(true);
  const r = call('handleCardConfirm', BODY());
  say(r && r.ok && r.already === true && tossCalls === 0, '결제하지 않는다(already)', JSON.stringify(r));
  say(!(rec(w).결제수단 || {}).예약금, '카드 표시를 남기지 않는다', w.C['동의기록']);
  const c = call('handleCardPayConfig', { token: 't', milestone: '예약금' });
  say(c && c.ok && c.enabled === false, '설정 조회도 카드 탭을 닫는다', JSON.stringify(c));
}

console.log('━━ deposit-card — ⑥ 그 시간이 이미 확정됨 → 결제 «전»에 막는다');
{
  const w = mk(); cardOn(true); slotSeq = [true];
  const r = call('handleCardConfirm', BODY());
  say(r && r.ok === false && r.slotTaken === true && tossCalls === 0, '토스를 부르지 않고 slotTaken 으로 돌려준다', JSON.stringify(r));
  say(w.B['입금확인'] === '' && w.B['상태'] === '시간선택완료', '아무것도 적지 않는다', w.B['입금확인'] + '/' + w.B['상태']);
}

console.log('━━ deposit-card — ⑦ 금액 위변조 · ⑧ 시간 선택 전 · ⑨ 스냅');
{
  mk(); cardOn(true);
  const r = call('handleCardConfirm', BODY({ amount: 90000 }));
  say(r && r.ok === false && tossCalls === 0, '⑦ 금액이 다르면 막는다', JSON.stringify(r));
  mk({}, { 상태: '신청접수' }); cardOn(true);
  const r2 = call('handleCardConfirm', BODY());
  say(r2 && r2.ok === false && tossCalls === 0, '⑧ 신청(시간 선택)이 없으면 막는다', JSON.stringify(r2));
  mk({ 상품타입: '웨딩스냅' }); cardOn(true);
  const c = call('handleCardPayConfig', { token: 't', milestone: '예약금' });
  const r3 = call('handleCardConfirm', BODY());
  say(c && c.enabled === false && r3 && r3.ok === false && tossCalls === 0, '⑨ 스냅은 쓰지 않는다(원장 키 «예약금»이 이미 계약금 카드분)', JSON.stringify(c) + ' ' + JSON.stringify(r3));
}

console.log('━━ deposit-card — ⑩ 토스 거절');
{
  const w = mk(); cardOn(true); tossAns = { ok: false, error: '한도 초과' };
  const r = call('handleCardConfirm', BODY());
  say(r && r.ok === false && tossCalls === 1, '실패로 돌려준다', JSON.stringify(r));
  say(w.B['입금확인'] === '' && !(rec(w).결제수단 || {}).예약금 && w.B['상태'] === '시간선택완료', '아무것도 적지 않는다', w.B['입금확인'] + '/' + w.C['동의기록']);
}

console.log('━━ deposit-card — ⑪ 결제 뒤 확정 순간 그 시간이 참');
{
  const w = mk(); cardOn(true); slotSeq = [false, true];   // 결제 전 확인은 비어 있음 → actApprove 의 확인에서 참
  const r = call('handleCardConfirm', BODY());
  say(r && r.ok && r.recorded && r.approved === false, '결제는 기록 · 확정은 못 함(approved:false)', JSON.stringify(r));
  say(w.B['입금확인'] === '확인' && w.B['상태'] === '시간선택완료', '돈을 받았다는 사실은 남는다(입금확인) · 상태는 그대로', w.B['입금확인'] + '/' + w.B['상태']);
  say(adminLines.some((t) => /변경 제안/.test(t)), '관리자에게 «변경 제안을 보내 주세요»', adminLines.join(' | '));
}

console.log('━━ deposit-card — ⑫ «카드로 낼 신청» 기록 · 관리자 알림');
{
  const w = mk({}, { 상태: '신청접수', 선택날짜: '', 선택시간: '', 신청일시: new Date() }); cardOn(true);
  G.findRowByToken = () => ({ num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  let r; try { r = G.submitSchedule('ctok', DAY, '14:50', [], '', null, '', '', 'card'); } catch (e) { r = { ok: false, error: 'THROW ' + e.message }; }
  say(r && r.ok === true, '신청 ok', JSON.stringify(r));
  say(rec(w).예약금결제 === '카드', '동의기록.예약금결제 = 카드(처리할 일 «카드 결제 대기»의 근거)', w.C['동의기록']);
  const sp = notes.find((n) => n.k === 'admin.slotPicked'), am = notes.find((n) => n.k === 'adminMail');
  say(!!sp && sp.x.card === true && !!am && am.x.card === true, '관리자 알림·메일이 «카드 결제 대기»로 간다', JSON.stringify(notes));
  say(/카드 결제 대기/.test(G._nfAdminText('admin.slotPicked', 'ME-TEST', { names: 'a', date: DAY, time: '14:50', card: true }) || ''), '한 줄 알림 문구 «카드 결제 대기 · 결제되면 자동 확정»');
  say(/승인 필요/.test(G._nfAdminText('admin.slotPicked', 'ME-TEST', { names: 'a', date: DAY, time: '14:50' }) || ''), '계좌이체는 종전대로 «승인 필요»');
  notes = [];
  try { G.submitSchedule('ctok', DAY, '14:50', [], '', null, '', '정하윤', 'bank'); } catch (e) {}
  say(!rec(w).예약금결제 && (notes.find((n) => n.k === 'admin.slotPicked') || { x: {} }).x.card === false, '계좌이체로 다시 신청하면 카드 표시를 지운다', w.C['동의기록']);
  cardOn(false); notes = [];
  try { G.submitSchedule('ctok', DAY, '14:50', [], '', null, '', '', 'card'); } catch (e) {}
  say(!rec(w).예약금결제 && (notes.find((n) => n.k === 'admin.slotPicked') || { x: {} }).x.card === false, '카드결제가 꺼져 있으면 payBy=card 를 무시한다(낼 수 없는 카드를 «대기»로 적지 않는다)', w.C['동의기록']);
  const admH = G._nfAdminText('admin.cancelRefund', 'ME-TEST', { names: 'a', card: true }) || '';
  say(/카드 결제 취소/.test(admH) && !/송금/.test(admH), '취소 한 줄 알림 — 카드면 «카드 결제 취소»(송금 아님)', admH);
}

console.log('━━ deposit-card — ⑬ 환불: 카드 예약금뿐이면 계좌를 여쭙지 않는다');
{
  const CARDREC = JSON.stringify({ 결제수단: { 예약금: '카드' }, 카드결제: { 예약금: { orderId: 'MD_9', paymentKey: 'pk_9', amount: 100000 } } });
  // 셀프·이메일 취소 공통 — 계좌 요청 알림
  let w = mk({ 동의기록: CARDREC }, { 입금확인: '확인', 상태: '취소' });
  G._maybeRefundAcctReq(G.getSheet(), G.buildHeaderIndex(G.getSheet()), { num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  say(!notes.some((n) => n.k === 'cust.refundAcctReq'), '카드 예약금뿐 → 계좌 요청 알림을 안 보낸다', JSON.stringify(notes));
  w = mk({ 동의기록: '' }, { 입금확인: '확인', 상태: '취소' });
  G._maybeRefundAcctReq(G.getSheet(), G.buildHeaderIndex(G.getSheet()), { num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  say(notes.some((n) => n.k === 'cust.refundAcctReq'), '계좌이체 예약금 → 종전대로 계좌를 여쭙는다', JSON.stringify(notes));
  w = mk({ 동의기록: CARDREC, 입금상태: '확인' }, { 입금확인: '확인', 상태: '취소' });
  G._maybeRefundAcctReq(G.getSheet(), G.buildHeaderIndex(G.getSheet()), { num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  say(notes.some((n) => n.k === 'cust.refundAcctReq'), '계약금을 계좌로 받았으면 카드 예약금이 있어도 계좌를 여쭙는다(계좌 환불분이 있다)', JSON.stringify(notes));
  w = mk({ 동의기록: CARDREC, 상품타입: '웨딩스냅' }, { 입금확인: '확인' });
  say(G._depositCardOf('ME-TEST') === null, '스냅의 «예약금» 카드 표시는 상담 예약금으로 읽지 않는다', JSON.stringify(G._depositCardOf('ME-TEST')));

  // 취소 화면(cancel.html) 이 받는 값
  w = mk({ 동의기록: CARDREC }, { 입금확인: '확인', 상태: '확정' });
  G.verifySig = () => true; G.findRowByToken = () => ({ num: 2, get: (h) => (h in w.B ? w.B[h] : '') });
  const info = call('handleEmailCancelInfo', { token: 'ctok', sig: 's' });
  say(info && info.ok && info.state === 'ok' && info.byCard === true, 'cancel.html 이 byCard 를 받는다(계좌 칸 대신 카드 취소 안내)', JSON.stringify(info));
  w = mk({ 동의기록: '' }, { 입금확인: '확인', 상태: '확정' });
  const info2 = call('handleEmailCancelInfo', { token: 'ctok', sig: 's' });
  say(info2 && info2.ok && info2.byCard === false, '계좌이체 예약금이면 byCard=false(종전 화면)', JSON.stringify(info2));

  // 마이페이지
  w = mk({ 동의기록: CARDREC }, { 입금확인: '확인', 상태: '확정' });
  let cs; try { cs = G.buildConsultState('ME-TEST'); } catch (e) { cs = { error: 'THROW ' + e.message }; }
  say(!!cs && cs.byCard === true, '마이페이지 상담 카드 byCard=true(취소 패널이 계좌를 안 받는다)', JSON.stringify(cs));
  w = mk({ 동의기록: CARDREC, 현재단계: '취소' }, { 입금확인: '확인', 상태: '취소', 취소일시: '2026-09-20' });
  let rb; try { rb = G.buildRefundBankState(G.findCustomerByCode()); } catch (e) { rb = { error: 'THROW ' + e.message }; }
  say(!!rb && rb.cardOnly === true, '종료 고객 환불 카드 cardOnly=true(계좌 칸 없이 «카드 취소» 안내)', JSON.stringify(rb));
  w = mk({ 동의기록: '', 현재단계: '취소' }, { 입금확인: '확인', 상태: '취소', 취소일시: '2026-09-20' });
  try { rb = G.buildRefundBankState(G.findCustomerByCode()); } catch (e) { rb = { error: 'THROW ' + e.message }; }
  say(!!rb && rb.cardOnly === false, '계좌이체 예약금은 cardOnly=false(종전 계좌 칸)', JSON.stringify(rb));

  // 관리자 처리할 일
  const q = (h) => [...((h && h.queue && h.queue.urgent) || []), ...((h && h.queue && h.queue.normal) || [])].filter((x) => x.code === 'ME-TEST');
  w = mk({ 동의기록: CARDREC, 현재단계: '취소' }, { 입금확인: '확인', 상태: '취소', 취소일시: '2026-09-20' });
  G._AUTHED = true;
  let h; try { h = G.adminHome(); } catch (e) { h = { ok: false, error: 'THROW ' + e.message }; }
  let it = q(h).find((x) => x.kind === '환불송금');
  say(!!it && /카드 결제 취소/.test(it.sub) && !/계좌 요청/.test(it.sub) && !/송금 필요/.test(it.sub), '처리할 일 «예약금 카드 결제 취소 필요(토스)» · 계좌 요청 없음', JSON.stringify(it || h));
  w = mk({ 동의기록: '', 현재단계: '취소' }, { 입금확인: '확인', 상태: '취소', 취소일시: '2026-09-20' });
  try { h = G.adminHome(); } catch (e) { h = { ok: false, error: 'THROW ' + e.message }; }
  it = q(h).find((x) => x.kind === '환불송금');
  say(!!it && /송금 필요/.test(it.sub) && /계좌 요청/.test(it.sub), '계좌이체 예약금은 종전대로 «송금 필요 · 계좌 요청»', JSON.stringify(it || h));
  w = mk({ 동의기록: JSON.stringify({ 예약금결제: '카드' }) }, { 상태: '시간선택완료', 입금확인: '' });
  try { h = G.adminHome(); } catch (e) { h = { ok: false, error: 'THROW ' + e.message }; }
  it = q(h).find((x) => x.kind === '신규신청');
  say(!!it && /카드 결제 대기/.test(it.sub), '카드로 낼 신청은 «신규 신청 · 카드 결제 대기(… 먼저 승인하지 말 것)»', JSON.stringify(it || h));
}

cardOn(false);
console.log(rc === 0 ? '━━ deposit-card — ✅ 전부 통과' : '━━ deposit-card — ❌ 틀린 곳이 있습니다');
process.exit(rc);
