// 관리자 복구 액션(AC 스프린트) 실행 검증 — 코드를 읽는 대신 실제로 함수를 돌려서 확인한다.
//   대상: AC1 입금 확인 취소(_undoConfirmCore) · AC1B 중도금잔금 콤보 · AC3 강제 단계 변경 미리보기/실행.
//   방식: gas-lint의 vm 샌드박스에 Customers 한 행을 시드하고, 시트 쓰기·_holdCalDelete 호출을
//         '이벤트 로그'로 가로채 횟수와 순서까지 본다(미리보기가 부작용을 내는지 = 6차 검증 AC3-BUG 재발 감시).
//   사용: node scripts/audit/admin-ac-check.mjs
import { loadGas } from './gas-lint.mjs';

const { sandbox: G, errors } = loadGas();
if (errors.length) { for (const e of errors) console.log('❌ LOAD FAIL', e.file, '—', e.message); process.exit(1); }

let fail = 0;
const ok = (cond, label, detail) => {
  if (cond) console.log('  ✅ ' + label);
  else { fail++; console.log('  ❌ ' + label + (detail !== undefined && detail !== '' ? ' — ' + detail : '')); }
};

// 'yyyy-MM-dd HH:mm'(KST) — hoursAgo 시간 전
const kstAgo = (hoursAgo) => {
  const d = new Date(Date.now() - hoursAgo * 3600e3 + 9 * 3600e3);
  const z = (n) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())} ${z(d.getUTCHours())}:${z(d.getUTCMinutes())}`;
};

// ---------- 세계 만들기 — Customers 1행 + 상담예약 1행을 샌드박스에 시드 ----------
const HEADERS = [].concat(G.CUSTOMER_HEADERS, G._prodCols(), ['중도금상태', '중도금입금자명', '중도금입금신호', '중도금확인일시', '중도금리마인드',
  '잔금상태', '잔금입금자명', '잔금입금신호', '잔금확인일시', '잔금리마인드', '설문상태', '설문응답', '설문일시',
  '추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명', '선택사진', '선택수', '선택확정일시', '컨펌일시',
  '원본링크', '영상링크', '보정본폴더', '좌석공유토큰', '입금완료신호', '입금자명', '시착동의상태', '시착동의일시',
  '계약서발송일시', '계약서명일시', '계약서링크', '계약총액', '예식일', '동의기록', '처리이력', '최종수정'])
  .filter((h, i, a) => a.indexOf(h) === i);
const COL_OF = {}; HEADERS.forEach((h, i) => { COL_OF[h] = i + 1; });
const COL_BY_NUM = {}; HEADERS.forEach((h, i) => { COL_BY_NUM[i + 1] = h; });

function world(cells, booking) {
  const ev = [];                                        // 이벤트 로그(쓰기·캘린더 삭제 순서까지 기록)
  const C = Object.assign({ 개인코드: 'ME-TEST', 상품타입: '시그니처' }, cells);
  const B = booking ? Object.assign({}, booking) : null;
  const sheetC = { getRange: (r, c) => ({ setValue: (v) => { ev.push({ t: 'writeC', h: COL_BY_NUM[c], v }); C[COL_BY_NUM[c]] = v; } }) };
  const sheetB = { getRange: (r, c) => ({ setValue: (v) => { ev.push({ t: 'writeB', h: COL_BY_NUM[c], v }); if (B) B[COL_BY_NUM[c]] = v; } }) };
  const row = (o, n) => ({ num: n, get: (h) => (h in o ? o[h] : '') });

  G._AUTHED = true;                                     // 디스패처가 이미 인증한 상태로 진입(_requireAdmin 통과)
  G._CURRENT_ADMIN = '점검';
  G.findCustomerByCode = () => row(C, 2);
  G.getCustomersSheet = () => sheetC;
  G.getSheet = () => sheetB;
  G.buildHeaderIndex = () => COL_OF;
  G.findRowByPersonalCode = () => (B ? row(B, 2) : null);
  G.deleteCalendarEvent = () => { ev.push({ t: 'calBooking' }); };
  G.coupleNames = () => '테스트 · 고객';
  G._holdCalDelete = (hold) => { ev.push({ t: 'holdCalDelete', hold }); };
  G.notifyKakao = (k) => { ev.push({ t: 'notify', k }); };
  G.notifyStudio = () => {};
  G.setCustomerStage = () => {};

  return {
    C, B, ev,
    writes: () => ev.filter((e) => e.t === 'writeC' || e.t === 'writeB'),
    holdDeletes: () => ev.filter((e) => e.t === 'holdCalDelete'),
    idx: (pred) => ev.findIndex(pred),
    snapshot: () => JSON.stringify(C),
  };
}

const REC = (o) => JSON.stringify(o);

// ============================================================ AC3
console.log('\n[AC3-1] 강제변경 미리보기는 아무 부작용도 내지 않는다 [ADM_AC3FIX]');
{
  const w = world({
    현재단계: '계약완료', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-10-26',
    시착동의상태: '동의완료', 시착동의일시: '2026-07-01 10:00',
    동의기록: REC({ 가예약: { eventId: 'EV123', date: '2026-10-26' }, 시착: '2026-07-01', 계약: '2026-07-02' }),
  }, { 상태: '확정', 캘린더이벤트ID: 'BK1' });
  const before = w.snapshot();
  const p = G.adminForceStagePreview('ME-TEST', '신청접수');

  ok(p && p.ok === true && p.preview === true, '미리보기 반환 ok', JSON.stringify(p).slice(0, 120));
  ok(w.holdDeletes().length === 0, '★_holdCalDelete 호출 0회 (단계만 골라봐도 슬롯이 풀리던 AC3-BUG 재발 없음)', '호출 ' + w.holdDeletes().length + '회');
  ok(w.writes().length === 0, '★시트 쓰기 0회 (dry-run)', '쓰기 ' + w.writes().length + '건');
  ok(w.snapshot() === before, '고객 행 원본 그대로');
  ok(p.holdRelease === true, '가예약 해제 예정을 화면에 알림(holdRelease)');
  ok(p.consent.indexOf('가예약') !== -1 && p.consent.indexOf('계약') !== -1, '동의기록 제거 예정 키 표기', (p.consent || []).join('·'));
  ok(p.bookingReset === true, '상담 예약 초기화 예정 표기');
  ok(p.cleared.indexOf('계약총액') !== -1 && p.cleared.indexOf('시착동의상태') !== -1, '비워질 컬럼 목록', (p.cleared || []).join('·'));
}

console.log('\n[AC3-2] 실행은 시트에 쓴 "뒤에" 캘린더를 정확히 1회 해제한다 [ADM_AC3FIX]');
{
  const w = world({
    현재단계: '계약완료', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-10-26',
    시착동의상태: '동의완료',
    동의기록: REC({ 가예약: { eventId: 'EV123' }, 시착: '2026-07-01', 계약: '2026-07-02' }),
  }, { 상태: '확정', 캘린더이벤트ID: 'BK1' });
  const r = G.adminForceStage('ME-TEST', '신청접수', '점검 테스트');

  ok(r && r.ok === true && r.to === '신청접수', '실행 ok', JSON.stringify(r).slice(0, 120));
  ok(w.holdDeletes().length === 1, '★_holdCalDelete 정확히 1회', '호출 ' + w.holdDeletes().length + '회');
  ok(JSON.stringify((w.holdDeletes()[0] || {}).hold) === JSON.stringify({ eventId: 'EV123' }), '해제 대상이 동의기록의 가예약 그대로');
  const iStage = w.idx((e) => e.t === 'writeC' && e.h === '현재단계');
  const iConsent = w.idx((e) => e.t === 'writeC' && e.h === '동의기록');
  const iHold = w.idx((e) => e.t === 'holdCalDelete');
  ok(iStage >= 0 && iStage < iHold, '★시트에 단계 쓰기 → 그 뒤 캘린더 해제(순서)', `현재단계 #${iStage} · 해제 #${iHold}`);
  ok(iConsent >= 0 && iConsent < iHold, '동의기록에서 가예약이 지워진 뒤 해제', `동의기록 #${iConsent} · 해제 #${iHold}`);
  ok(String(w.C['현재단계']) === '신청접수', '현재단계 반영됨');
  ok((JSON.parse(w.C['동의기록'] || '{}').가예약) === undefined, '동의기록에서 가예약 제거됨', String(w.C['동의기록']).slice(0, 60));
  ok(w.C['계약총액'] === '' && w.C['시착동의상태'] === '', '이후 단계 데이터 초기화됨');
  ok(r.bookingReset === true && w.ev.some((e) => e.t === 'calBooking'), '상담 예약도 초기화(캘린더 슬롯 해제)');
}

console.log('\n[AC3-3] 미리보기와 실행 결과가 어긋나지 않는다 (같은 _clearForwardData)');
{
  const seed = {
    현재단계: '예식완료', 계약상태: '서명완료', 계약총액: '2500000', 예식일: '2026-10-26',
    입금상태: '', 결과물상태: '전달완료', 원본링크: 'https://x/o', 컨펌일시: '2026-07-10 10:00',
    동의기록: REC({ 가예약: { eventId: 'EV9' }, 계약: '2026-07-02' }),
  };
  const wp = world(JSON.parse(JSON.stringify(seed)), null);
  const p = G.adminForceStagePreview('ME-TEST', '계약완료');
  const we = world(JSON.parse(JSON.stringify(seed)), null);
  const r = G.adminForceStage('ME-TEST', '계약완료', '점검 테스트');
  const sortJ = (a) => JSON.stringify((a || []).slice().sort());
  // 미리보기는 "실제로 값이 있어 눈에 띄게 비워지는" 컬럼만 보여준다(빈 칸까지 나열하면 관리자가 못 읽음).
  //   → 계약은 두 가지: ① 미리보기 목록 ⊆ 실행 목록 ② 실행이 비운 것 중 값이 있던 것 = 미리보기 목록.
  const hadValue = (c) => String(seed[c] || '').trim() !== '';
  ok((p.cleared || []).every((c) => (r.cleared || []).indexOf(c) !== -1), '★미리보기 목록은 전부 실행이 실제로 비운 컬럼(없는 걸 예고하지 않음)', sortJ(p.cleared));
  ok(sortJ((r.cleared || []).filter(hadValue)) === sortJ(p.cleared), '★실행이 비운 것 중 "값이 있던" 컬럼 = 미리보기 목록(누락 없음)',
    sortJ((r.cleared || []).filter(hadValue)) + ' vs ' + sortJ(p.cleared));
  ok(p.holdRelease === false && we.holdDeletes().length === 0, '계약완료 복귀는 가예약 보존(해제 없음)');
  ok(wp.writes().length === 0, '미리보기 쪽은 여전히 쓰기 0');
}

console.log('\n[AC3-4] ROLLBACK_KEEP_PAID — 확인된 수납은 롤백해도 안 지운다');
{
  const w = world({
    현재단계: '제작중', 입금상태: '확인', 입금자명: '김철수', 계약총액: '2500000',
    중도금상태: '확인', 중도금확인일시: kstAgo(2),
    동의기록: REC({ 계약: '2026-07-02', 현금영수증: '동의' }),
  }, null);
  const p = G.adminForceStagePreview('ME-TEST', '계약완료');
  ok(p.kept.indexOf('입금상태') !== -1, '★입금 기록은 "유지됨"으로 화면에 구분 표기', (p.kept || []).join('·'));
  ok(p.cleared.indexOf('입금상태') === -1, '비움 목록에는 없음');
  const r = G.adminForceStage('ME-TEST', '계약완료', '점검 테스트');
  ok(w.C['입금상태'] === '확인' && w.C['입금자명'] === '김철수', '실행 후에도 입금 기록 보존(카드 이중청구·환불계산 사고 차단)');
  ok(r.ok === true, '실행 자체는 성공');
}

console.log('\n[AC3-5] 후기로 강제 이동하면 설문 카드가 다시 뜬다 [STAGE_REVIEW]');
{
  const w = world({ 현재단계: '결과물전달', 결과물상태: '전달완료', 설문상태: '건너뜀', 설문응답: '{"a":1}' }, null);
  const r = G.adminForceStage('ME-TEST', '후기', '점검 테스트');
  ok(r.ok === true && w.C['설문상태'] === '대기', '설문상태 → 대기', String(w.C['설문상태']));
  ok(w.C['설문응답'] === '{"a":1}', '과거 답변은 보존(재제출 시 덮어씀)');
}

console.log('\n[AC3-6] 멱등·유효성');
{
  // noop이 실제로 도는 조건 = 목표가 마지막 단계라 '이후 데이터'가 아예 없는 경우
  const w0 = world({ 현재단계: '후기', 설문상태: '완료' }, null);
  const r0 = G.adminForceStage('ME-TEST', '후기', '점검');
  ok(r0.noop === true && w0.writes().length === 0, '이후 데이터가 없는 같은 단계 재지정은 noop · 쓰기 0', JSON.stringify(r0));

  // ⚠ 관찰 — 이른 단계로의 재지정은 값이 비어 있어도 noop이 아니다(빈칸 위에 빈칸을 덮어씀).
  //   데이터 손실은 없지만 처리이력에 "이후 데이터 초기화(47개)"가 남아 나중에 로그를 읽을 때 오해를 부른다.
  const w1 = world({ 현재단계: '신청접수' }, { 상태: '신청접수', 캘린더이벤트ID: '' });   // ST.APPLIED
  const r1 = G.adminForceStage('ME-TEST', '신청접수', '점검');
  if (r1.noop === true) ok(true, '이미 신청접수인 고객 재지정도 noop');
  else console.log(`  ⚠ 관찰 — 이미 '신청접수'인 고객에 같은 단계를 다시 걸면 noop이 아니라 빈 컬럼 ${(r1.cleared || []).length}개를 다시 비우고 처리이력에 전부 나열한다(데이터 손실은 없음 · 로그 가독성만 문제).`);
  ok(Object.keys(w1.C).every((h) => h === '처리이력' || h === '최종수정' || h === '개인코드' || h === '상품타입' || h === '현재단계' || String(w1.C[h]) === ''), '재지정이 실제로 지운 값은 없음(빈칸 위 빈칸 · 손실 0)');
  const w2 = world({ 현재단계: '계약완료', 상품타입: '웨딩스냅' }, null);
  const r2 = G.adminForceStage('ME-TEST', '시착', '점검');
  ok(r2.ok === false && /없는 단계/.test(r2.error || ''), '상품에 없는 단계는 거부(웨딩스냅·시착)', r2.error);
  const w3 = world({ 현재단계: '계약완료' }, null);
  const r3 = G.adminForceStage('ME-TEST', '신청접수', '');
  ok(r3.ok === false && w3.writes().length === 0, '사유 없으면 거부 · 쓰기 0');
}

// ============================================================ AC1
console.log('\n[AC1-1] 입금 확인 취소 — 정상 경로와 dry-run');
{
  const base = {
    현재단계: '입금완료', 입금상태: '확인', 입금완료신호: '완료신호', 입금자명: '김철수',
    동의기록: REC({ 영수증기준일: { 예약금: kstAgo(2) } }),
  };
  const wp = world(JSON.parse(JSON.stringify(base)), null);
  const p = G.adminUndoConfirmPreview('ME-TEST', '계약금');
  ok(p.ok === true && p.preview === true, '미리보기 ok', JSON.stringify(p).slice(0, 120));
  ok(wp.writes().length === 0, '★미리보기 쓰기 0건 (dry-run)', '쓰기 ' + wp.writes().length + '건');
  ok(p.plan.length === 1 && p.plan[0].to === '완료신호', '고객 입금 신고가 남아 있으면 "완료신호"로 되돌림', JSON.stringify(p.plan[0]));
  ok(p.stage && p.stage.to === '계약완료', '단계도 계약완료로 되돌아감을 미리 알림');
  ok(p.windowHours === 24, '되돌리기 창 24시간 표기(UNDO_WINDOW_HOURS)', String(p.windowHours));
  ok(/이미 나간 입금 확인 카톡은 취소되지 않아요/.test(p.notice || ''), '이미 나간 카톡 안내 문구 포함');
  ok(String(p.notice).indexOf('—') < 0, '안내 문구에 전각 줄표 없음(문구 규칙)');

  const we = world(JSON.parse(JSON.stringify(base)), null);
  const r = G.adminUndoConfirmPayment('ME-TEST', '계약금', '입금 오처리');
  ok(r.ok === true && we.C['입금상태'] === '완료신호', '실행 → 입금상태 되돌림', String(we.C['입금상태']));
  ok(we.C['현재단계'] === '계약완료', '현재단계 역행 반영(setCustomerStage 우회 · touchCustomer 직접)');
  ok((JSON.parse(we.C['동의기록'] || '{}').영수증기준일 || {}).예약금 === undefined, '현금영수증 5일 기산점 제거');
  ok(/입금 확인 취소/.test(String(we.C['처리이력'] || '')), '처리이력 기록', String(we.C['처리이력']).slice(0, 60));

  const r2 = G.adminUndoConfirmPayment('ME-TEST', '계약금', '두 번째 클릭');
  ok(r2.ok === true && r2.already === true, '★멱등 — 두 번 눌러도 안전');

  const wn = world(JSON.parse(JSON.stringify(base)), null);
  const rn = G.adminUndoConfirmPayment('ME-TEST', '계약금', '');
  ok(rn.ok === false && wn.writes().length === 0, '사유 없으면 거부 · 쓰기 0', rn.error);
}

console.log('\n[AC1-2] 차단 A~F 6종 — 각각 다른 메시지로 막는다');
{
  const mk = (over) => Object.assign({
    현재단계: '입금완료', 입금상태: '확인', 입금자명: '김철수',
    동의기록: REC({ 영수증기준일: { 예약금: kstAgo(2) } }),
  }, over);
  const run = (over, ms) => { const w = world(mk(over), null); const r = G.adminUndoConfirmPayment('ME-TEST', ms || '계약금', '사유'); return { w, r }; };

  const A = run({ 동의기록: REC({ 결제수단: { 계약금: '카드' }, 영수증기준일: { 예약금: kstAgo(2) } }) });
  ok(A.r.block === 'A' && A.w.writes().length === 0, 'A 카드 결제분 차단 · 쓰기 0', A.r.error);
  ok(/토스에서 결제 취소/.test(A.r.error || ''), 'A 안내가 다음 행동을 지시');

  const B = run({ 동의기록: REC({ 영수증발행: { 계약금: true }, 영수증기준일: { 예약금: kstAgo(2) } }) });
  ok(B.r.block === 'B' && B.w.writes().length === 0, 'B 현금영수증 발행분 차단 · 쓰기 0', B.r.error);

  const C = run({ 현재단계: '제작중' });
  ok(C.r.block === 'C' && C.w.writes().length === 0, 'C 다음 단계로 전진한 건 차단 · 쓰기 0', C.r.error);

  const D = run({ 현재단계: '취소' });
  ok(D.r.block === 'D' && D.w.writes().length === 0, 'D 종료 고객 차단 · 쓰기 0', D.r.error);

  const E1 = run({ 동의기록: REC({ 영수증기준일: { 예약금: kstAgo(25) } }) });
  ok(E1.r.block === 'E' && /24시간 안에만/.test(E1.r.error || ''), 'E 24시간 경과 차단', E1.r.error);
  const E2 = run({ 동의기록: REC({}) });
  ok(E2.r.block === 'E' && /예전 데이터/.test(E2.r.error || ''), 'E 확인 시각 미상은 별도 안내(강제 단계 변경으로 유도)', E2.r.error);

  const F = run({ 동의기록: REC({ 환불완료: true, 영수증기준일: { 예약금: kstAgo(2) } }) });
  ok(F.r.block === 'F' && F.w.writes().length === 0, 'F 환불 정산 완료 건 차단 · 쓰기 0', F.r.error);

  const msgs = [A, B, C, D, E1, F].map((x) => x.r.error);
  ok(new Set(msgs).size === msgs.length, '★6종 메시지가 서로 다름(무엇을 먼저 해야 하는지 구분됨)');
  ok(msgs.every((m) => String(m).indexOf('—') < 0), '차단 문구 전부 전각 줄표 없음');
}

console.log('\n[AC1-3] C 차단은 계약금에만 — 중도금·잔금은 원래 뒤 단계에서 확인한다');
{
  const w = world({
    현재단계: '제작중', 중도금상태: '확인', 중도금확인일시: kstAgo(1), 중도금입금신호: '',
    동의기록: REC({}),
  }, null);
  const r = G.adminUndoConfirmPayment('ME-TEST', '중도금', '오처리');
  ok(r.ok === true && w.C['중도금상태'] === '', '★제작중 단계에서 중도금 되돌리기 정상(정상 건이 C로 전부 막히지 않음)', JSON.stringify(r).slice(0, 100));
  ok(w.C['중도금확인일시'] === '', '확인일시도 비움');
  ok(w.C['현재단계'] === '제작중', '중도금·잔금은 단계를 건드리지 않음');
}

console.log('\n[AC1B] 중도금잔금 콤보');
{
  const base = {
    현재단계: '예식완료', 중도금상태: '확인', 중도금확인일시: kstAgo(3),
    잔금상태: '확인', 잔금확인일시: kstAgo(1), 잔금입금신호: '완료신호',
    동의기록: REC({ 잔금확정금액: 1200000 }),
  };
  const wp = world(JSON.parse(JSON.stringify(base)), null);
  const p = G.adminUndoConfirmPreview('ME-TEST', '중도금잔금');
  ok(p.ok === true && p.plan.length === 2, '미리보기에 2건(중도금·잔금) 표시', (p.plan || []).map((x) => x.label).join('·'));
  ok(wp.writes().length === 0, '콤보 미리보기도 쓰기 0');
  ok(p.plan[1].to === '완료신호' && p.plan[0].to === '대기', '입금 신고 유무에 따라 되돌림 값이 다름', JSON.stringify(p.plan.map((x) => x.to)));
  ok((p.consentRemoved || []).some((s) => /잔금확정금액/.test(s)), '잔금확정금액 스냅샷 제거 예고', (p.consentRemoved || []).join('·'));

  const we = world(JSON.parse(JSON.stringify(base)), null);
  const r = G.adminUndoConfirmPayment('ME-TEST', '중도금잔금', '이중 입금 오처리');
  ok(r.ok === true && r.undone.length === 2, '실행 → 2건 되돌림', JSON.stringify(r.undone));
  ok(we.C['중도금상태'] === '' && we.C['잔금상태'] === '완료신호', '두 상태 각각 반영');
  ok(we.C['중도금확인일시'] === '' && we.C['잔금확인일시'] === '', '확인일시 둘 다 비움');
  ok(JSON.parse(we.C['동의기록'] || '{}').잔금확정금액 === undefined, '잔금확정금액 제거');

  // 콤보인데 잔금만 영수증이 발행된 경우 — 부분 성공 없이 통째 차단돼야 장부가 안 어긋난다
  const wb = world(Object.assign(JSON.parse(JSON.stringify(base)), { 동의기록: REC({ 영수증발행: { 중도금잔금: true } }) }), null);
  const rb = G.adminUndoConfirmPayment('ME-TEST', '중도금잔금', '사유');
  ok(rb.ok === false && rb.block === 'B', '★콤보 중 하나라도 영수증 발행분이면 통째 차단', rb.error);
  ok(wb.writes().length === 0, '★부분 반영 없음(쓰기 0) — 중도금만 되돌아간 반쪽 상태가 안 생김', '쓰기 ' + wb.writes().length + '건');

  const ws = world({ 현재단계: '촬영완료', 상품타입: '웨딩스냅', 잔금상태: '확인', 잔금확인일시: kstAgo(1), 동의기록: REC({}) }, null);
  const rs = G.adminUndoConfirmPayment('ME-TEST', '중도금잔금', '사유');
  ok(rs.ok === false && /중도금이 없어요/.test(rs.error || ''), '웨딩스냅은 콤보 거부(계약금·잔금 2단계)', rs.error);
  ok(ws.writes().length === 0, '거부 시 쓰기 0');

  const wx = world(JSON.parse(JSON.stringify(base)), null);
  const rx = G.adminUndoConfirmPayment('ME-TEST', '없는항목', '사유');
  ok(rx.ok === false && wx.writes().length === 0, '알 수 없는 마일스톤 거부 · 쓰기 0', rx.error);
}

console.log(`\n결과 — 실패 ${fail}건` + (fail ? '' : ' (전부 통과)'));
process.exit(fail ? 1 : 0);
