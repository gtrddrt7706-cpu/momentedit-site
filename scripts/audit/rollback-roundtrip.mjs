/* ★[ROLLBACK_ROUNDTRIP 2026-08-17 사용자 지시 "되돌리기(강제변경) 부분에서 내가원하는 의도를 파악후
   직접 시뮬레이션 병렬로 돌려보고 스탭바이스탭으로 문제점 개선점 찾기"]

   ── 파악한 의도 (이 검사가 지키려는 것)
   강제변경은 **사고 복구용 비상구**다. 그러니 세 가지가 참이어야 한다:
     ① 되돌린 뒤 **어디에도 갇히지 않는다** — 관리자 원클릭으로 정상 흐름에 복귀할 수 있다
     ② 되돌린 상태 자체가 **앞뒤가 맞는다** — 지워질 것은 지워지고 남을 것은 남는다
     ③ 복귀한 뒤 **끝까지 다시 갈 수 있다** — 한 번 되돌린 고객이 반쪽 상태로 남지 않는다
   ③이 이 파일의 핵심이다. 앞선 검사들(rollback-anywhere·rollback-redo)은 «정리»까지만 봤다.
   정리가 됐다고 여정이 이어진다는 보장은 없다 — 그건 따로 걸어 봐야 안다.

   ── 무엇을 하나 (왕복)
   끝(결과물전달)까지 정상으로 간다 → **각 되돌림 지점마다** 강제변경으로 내린다
   → 원클릭으로 정리한다 → **거기서 다시 끝까지 걸어 본다** → 도착했는가.
   두 상품 전부. 목표 단계는 손으로 적지 않고 STAGE_FLOW 에서 뽑는다(빠뜨림 방지).

   사용: node scripts/audit/rollback-roundtrip.mjs
*/
import { openWorld, kstAgo } from './_gasworld.mjs';

const { G, world } = openWorld();
const REAL = G.setCustomerStage;
const NOW = kstAgo(1);
const CODE = 'ME-TEST';
let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' — ' + String(d).slice(0, 120)}`); if (!c) fail++; };

let C = null, B = null;
function fresh(prod) {
  C = { 개인코드: CODE, 신랑이름: '희준', 신부이름: '미쿠', 연락처: '010-0000-0000', 이메일: 't@e.com',
    상품타입: prod, 현재단계: '신청접수', 계약총액: (prod === '웨딩스냅' ? 1200000 : 2500000),
    동의기록: '{}', 처리이력: '' };
  B = { 개인코드: CODE, 상태: '시간선택완료', 선택날짜: '2026-09-01', 선택시간: '14:50',
    신랑이름: '희준', 신부이름: '미쿠', 이메일: 't@e.com', 토큰: 'tk' };
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
const queue = () => {
  const { r } = act((g) => g.adminHome());
  const q = (r && r.queue) || {};
  return ((q.urgent || []).concat(q.normal || [])).filter((x) => x.kind === '단계정리');
};

/* ── 정상 여정 한 걸음씩. 이미 지난 걸음은 조용히 건너뛴다(멱등) ── */
function walkToEnd(prod, log) {
  const isSnap = prod === '웨딩스냅';
  const steps = [
    /* ★강제변경으로 신청접수까지 내리면 예약행도 초기화된다(_resetConsultBooking) — 고객이 시간을 다시 고른다.
       이 걸음을 빼면 «예약 승인»이 «승인할 수 있는 상태가 아닙니다»로 막혀, 제품 버그가 아닌 것이 붉어진다. */
    ['고객 일정 선택', (g) => g.handleSubmitSchedule({ token: 'tk', dateKey: '2026-09-01', time: '14:50' })],
    ['예약 승인', (g) => g.adminApprove(CODE)],
    ...(isSnap ? [] : [
      ['시착 동의 보내기', (g) => g.adminOpenFittingConsent(CODE)],
      ['고객 시착 서명', (g) => g.handleSignFittingConsent({ token: 'tk', signature: 'data:image/png;base64,AAA', agree: true })],
      ['시착 벌수 기록', (g) => g.adminSetFittingCount(CODE, 2)],
      ['상담완료 처리', (g) => g.adminMarkConsultDone(CODE)],
    ]),
    /* ★계약서 발송은 «고객이 계약정보를 넣은 뒤»에만 된다(admin.gs 1342) — 시그니처 한정.
       되돌리면 동의기록.계약정보도 지워지므로 이 걸음이 매번 다시 필요하다. */
    ...(isSnap ? [] : [['고객 계약정보 입력', (g) => g.handleRequestContract({ token: 'tk', info: {
      weddingDate: '2026-12-20', weddingTime: '12:20', groomBirth: '1990-01-01', brideBirth: '1991-02-02',
      groomAddr: '서울시 어딘가 1', brideAddr: '서울시 어딘가 2', consent: true } })]]),
    ['계약서 발송', (g) => g.adminSendContract(CODE, 'https://momentedit.kr/contract/v1-1.html')],
    ['고객 계약 서명', (g) => g.handleSignContract({ token: 'tk', signature: 'data:image/png;base64,AAA', agree: true })],
    ['고객 입금 신고', (g) => g.handlePaymentSignal({ token: 'tk', payerName: '정희준' })],
    ['관리자 입금 확인', (g) => g.adminConfirmPayment(CODE)],
    ...(isSnap ? [] : [['고객 제작 저장', (g) => g.handleSaveProductionTrack({ token: 'tk', track: 'ritual', ritualDraft: { S: { course: 'A' } }, done: false })]]),
    ['예식·촬영완료', (g) => g.adminMarkEventDone(CODE)],
    /* ★순서가 실무 그대로여야 한다 — 원본만 먼저 올린다. 보정본을 같이 올리면 결과물상태가
       바로 '컨펌대기'가 되어 고객의 «사진 선택»이 «보정이 시작되어…»로 막힌다(가짜 실패). */
    ['원본 링크 등록', (g) => g.adminSetResultLinks(CODE, { 원본: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 영상: 'https://vimeo.com/1' })],
    ['고객 사진 선택', (g) => g.handleSubmitResultSelection({ token: 'tk', picks: [{ id: 'ID0000000001', name: 'a.jpg' }] })],
    ['보정 착수', (g) => g.adminStartRetouch(CODE)],
    ['보정본 등록(컨펌대기)', (g) => g.adminSetResultLinks(CODE, { 원본: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 보정본: 'https://drive.google.com/drive/folders/BBBBBBBBBBBB', 영상: 'https://vimeo.com/1' })],
    ['고객 보정본 컨펌', (g) => g.handleConfirmRetouch({ token: 'tk' })],
    ['결과물 전달', (g) => g.adminMarkDelivered(CODE, true)],
  ];
  const blocked = [];
  /* ★[WALK_TRACE 2026-08-18] 걸음마다 «그때의 단계»를 적어 둔다 — 발자국.
     도착 단계만 보면 «건너뛰고 도착한» 여정을 통과시킨다(실사고: FITTING_SPLIT 회귀 때
     시착·상담완료가 막혔는데도 계약서 발송에 서버 단계 가드가 없어 결과물전달까지 갔다).
     발자국을 남겨야 «어느 방을 안 밟았는지»를 물을 수 있다. */
  const seen = [C.현재단계];
  for (const [name, fn] of steps) {
    const r = act(fn);
    if (!(r.r && r.r.ok !== false) || r.e) blocked.push(`${name}: ${String((r.r && r.r.error) || r.e).slice(0, 60)}`);
    if (seen[seen.length - 1] !== C.현재단계) seen.push(C.현재단계);
  }
  if (log && blocked.length) console.log('        막힌 걸음: ' + blocked.join(' | '));
  return { stage: C.현재단계, blocked, seen };
}

/* 출발 단계 다음부터 결과물전달까지 «모든 방을 밟았는가». 안 밟은 방 이름을 돌려준다. */
function skipped(flow, from, seen) {
  const a = flow.indexOf(from), b = flow.indexOf('결과물전달');
  if (a < 0 || b < 0) return [];
  return flow.slice(a + 1, b + 1).filter((st) => seen.indexOf(st) === -1);
}

for (const prod of ['시그니처', '웨딩스냅']) {
  const flow = G.STAGE_FLOW[prod];
  console.log(`\n═══ ${prod} — 끝까지 → 되돌림 → 정리 → 다시 끝까지 ═══`);

  fresh(prod);
  const base = walkToEnd(prod, true);
  ok(base.stage === '결과물전달' && base.blocked.length === 0,
    `기준 여정: 신청접수 → 결과물전달 (막힘 0)`, base.stage + ' / 막힘 ' + base.blocked.length);
  const endSnapshot = Object.assign({}, C), endBooking = Object.assign({}, B);

  /* 되돌림 지점 = 결과물전달보다 앞선 «모든» 단계 (손목록 금지 — 흐름에서 뽑는다) */
  const points = flow.slice(0, flow.indexOf('결과물전달'));
  for (const t of points) {
    C = Object.assign({}, endSnapshot); B = Object.assign({}, endBooking);
    const f = act((g) => g.adminForceStage(CODE, t, '왕복 점검'));
    if (!(f.r && f.r.ok)) { ok(false, `${t} · 강제변경 실패`, JSON.stringify(f.r).slice(0, 70)); continue; }

    /* ② 되돌린 상태가 앞뒤가 맞는가 — 목표보다 «뒤» 데이터는 남지 않아야 한다 */
    const ti = flow.indexOf(t);
    if (ti < flow.indexOf('예식완료') && ti < flow.indexOf('촬영완료')) {
      const leftover = [C.원본링크 ? '원본링크' : null, C.결과물상태 === '전달완료' ? '결과물상태=전달완료' : null].filter(Boolean);
      ok(leftover.length === 0, `${t} · 결과물 흔적이 남지 않았다`, leftover.join('·'));
    }

    /* ① 갇히지 않는가 — 큐에 뜨고, 원클릭 한 번으로 빈다 */
    const q = queue();
    if (q.length) {
      const canFix = (C.입금상태 === '확인' && C.계약상태 === '서명완료');
      const one = canFix ? act((g) => g.adminConfirmPayment(CODE))
                         : act((g) => g.adminUndoConfirmPayment(CODE, '전체', '왕복 정리'));
      ok(!!(one.r && one.r.ok), `${t} · 원클릭 정리 성공(${canFix ? '단계 맞추기' : '수납 전부 취소'})`,
        String((one.r && one.r.error) || one.e));
      ok(queue().length === 0, `${t} · 한 번으로 큐가 빈다`, JSON.stringify(queue().map((x) => x.sub)));
    }

    /* ③ ★거기서 다시 끝까지 갈 수 있는가 — 이 검사의 핵심.
       ★도착지만 묻지 않는다. 원클릭 정리가 끝난 «그 자리»부터 결과물전달까지
       빠짐없이 밟았는지 발자국으로 확인한다(WALK_TRACE 참고). */
    const startStage = C.현재단계;
    const again = walkToEnd(prod, true);
    ok(again.stage === '결과물전달', `${t} · ★되돌린 뒤 다시 결과물전달까지 완주`,
      '도착=' + again.stage + (again.blocked.length ? ' / 막힘: ' + again.blocked.slice(0, 2).join(' | ') : ''));
    const miss = skipped(flow, startStage, again.seen);
    ok(miss.length === 0, `${t} · ★건너뛴 단계 없이 밟고 갔다(정리 지점 ${startStage} 이후)`,
      '안 밟음: ' + miss.join('·') + (again.blocked.length ? ' / 막힘: ' + again.blocked.slice(0, 2).join(' | ') : ''));
  }
}


/* ── 건너뛰기 우회로 — «계약서 발송»이 시착·상담완료를 뛰어넘지 못한다 [CONTRACT_STAGE_GATE] ──
   발자국 검사(WALK_TRACE)가 결과로 잡아내는 사고를 **원인 쪽에서** 한 번 더 못 박는다.
   순서대로 걸으면 이 우회로를 밟지 않아, 게이트를 지워도 위 검사는 초록으로 남는다 —
   그래서 «되돌린 자리에서 곧바로 계약서를 보내면?» 을 직접 눌러 본다. */
console.log('\n═══ 시그니처 — 되돌린 자리에서 계약서 발송 우회 시도 ═══');
{
  fresh('시그니처');
  walkToEnd('시그니처', false);
  const back = act((g) => g.adminForceStage(CODE, '상담확정', '우회로 점검'));
  ok(!!(back.r && back.r.ok) && C.현재단계 === '상담확정', '상담확정으로 되돌렸다', C.현재단계);
  ok(String(C.예식일 || '') !== '', '수납이 살아 있어 예식일은 보존됐다(KEEP_MONEY_BASIS)', C.예식일);
  const send = act((g) => g.adminSendContract(CODE, 'https://momentedit.kr/contract/v1-1.html'));
  ok(!(send.r && send.r.ok), '★상담완료 전에는 계약서 발송이 막힌다(시착·상담완료 건너뛰기 차단)',
    JSON.stringify(send.r).slice(0, 120));
  ok(C.현재단계 === '상담확정', '막힌 뒤에도 단계가 앞으로 튀지 않았다', C.현재단계);

  /* [CONTRACT_AMOUNT_REQ] 총액 없는 계약서 — «받은 돈은 있는데 얼마인지 모르는» 상태의 입구 */
  fresh('시그니처');
  C.계약총액 = '';                                   // 되돌림으로 총액이 비워진 자리(미수납이라 정상 삭제)
  walkToEnd('시그니처', false);
  ok(String(C.계약상태 || '') !== '서명완료', '★총액 없이는 계약서가 안 나가 서명까지 못 간다', C.계약상태 || '(빔)');
  ok(String(C.입금상태 || '') !== '확인', '★따라서 «총액 없는 입금 확인»도 생기지 않는다', C.입금상태 || '(빔)');
  const amt = act((g) => g.adminSendContract(CODE, 'https://momentedit.kr/contract/v1-1.html', 2500000, '2026-12-20'));
  ok(!!(amt.r && amt.r.ok), '총액을 넣으면 그대로 지나간다(막다른 길이 아니다)', JSON.stringify(amt.r).slice(0, 90));
}

/* ── 예외 단계 왕복 — 취소·노쇼·미계약으로 뺐다가 «정상으로 되돌리기» ──
   의도상 여기도 갇히면 안 된다. 실무에서 가장 잦은 오처리가 «잘못 취소»이고,
   그때 되돌릴 길이 없으면 고객 하나가 통째로 못 쓰게 된다. */
for (const prod of ['시그니처', '웨딩스냅']) {
  const flow = G.STAGE_FLOW[prod];
  const backTo = flow[flow.indexOf('입금완료')];   // 복구 목표 = 수납이 살아 있는 자리
  console.log(`\n═══ ${prod} — 예외로 뺐다가 정상 복구 ═══`);
  fresh(prod);
  const base = walkToEnd(prod, false);
  const snap = Object.assign({}, C), snapB = Object.assign({}, B);
  for (const ex of G.STAGE_EXCEPTIONS) {
    C = Object.assign({}, snap); B = Object.assign({}, snapB);
    const toEx = act((g) => g.adminForceStage(CODE, ex, '오처리 재현'));
    ok(!!(toEx.r && toEx.r.ok) && C.현재단계 === ex, `${ex} · 예외로 뺄 수 있다`, C.현재단계);
    /* 환불 완료까지 표시된 «가장 나쁜» 상태를 만든다 — 이게 복구를 막는 흔적이다(차단 F) */
    act((g) => g.adminMarkRefunded(CODE));
    const rec0 = JSON.parse(C.동의기록 || '{}');
    ok(!!rec0.환불완료, `${ex} · 환불 완료 표시까지 붙였다(최악 조건)`, String(rec0.환불완료 || ''));
    const back = act((g) => g.adminForceStage(CODE, backTo, '오처리 복구'));
    ok(!!(back.r && back.r.ok) && C.현재단계 === backTo, `${ex} · 정상(${backTo})으로 복구된다`, C.현재단계);
    const rec1 = JSON.parse(C.동의기록 || '{}');
    ok(!rec1.환불완료, `${ex} · ★복구하면 환불완료 흔적이 지워진다(안 지우면 입금 되돌리기가 영영 막힌다)`, String(rec1.환불완료 || ''));
    /* [REFUND_MARK_TRACE] 지우되 «지웠다»는 말은 남아야 한다 — 돈이 이미 나간 고객이
       «입금 확인 · 환불 흔적 없음»으로만 보이면 두 번 송금할 수 있다. */
    ok(String(C.처리이력 || '').indexOf('환불완료 표시 해제') !== -1,
      `${ex} · ★환불완료 표시를 지운 사실이 처리이력에 남는다`, String(C.처리이력 || '').slice(-160));
    const startStage = C.현재단계;
    const again = walkToEnd(prod, true);
    ok(again.stage === '결과물전달', `${ex} · 복구 후 다시 끝까지 완주`,
      '도착=' + again.stage + (again.blocked.length ? ' / 막힘: ' + again.blocked.slice(0, 2).join(' | ') : ''));
    const miss = skipped(flow, startStage, again.seen);
    ok(miss.length === 0, `${ex} · 복구 후에도 건너뛴 단계 없음(${startStage} 이후)`, '안 밟음: ' + miss.join('·'));
  }
}

console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
