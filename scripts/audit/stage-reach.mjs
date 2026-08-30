/* ★[STAGE_REACH 2026-08-17 사용자 지시 "이런버그는 운영하는데 나오면 너무 취약하니깐 상세하게 각각
   전부 병렬로 스텝바이스텝 시뮬레이션 돌려서 구석구석 찾아내자 경우의수 따져서 전부말이야"]

   여정 «도달성» 검사기 — 막다른 길을 기계가 찾는다.

   ── 왜 새로 만드나 (journey-sim 이 이미 있는데)
   journey-sim 은 «그 상태에서 화면이 뭐라고 말하나»를 본다. 그건 [PAID_STAGE_BACK] 류를 잡는다.
   그런데 [PAID_STAGE_RESYNC] 는 그 그물을 통과했다 — 화면은 멀쩡했다("✓ 입금 확인됨").
   문제는 «거기서 앞으로 갈 문이 하나도 없다»는 것이었고, 그건 **한 상태만 봐서는 안 보인다.**
   상태와 상태 사이(간선)를 봐야 보인다.

   ── 무엇을 하나
   ① 신청접수 한 칸에서 시작해 **진짜 .gs 함수**를 실제로 호출한다(코드 읽기 아님).
   ② 성공해서 값이 바뀌면 그건 새 상태다 → 큐에 넣는다(너비우선). 도달 가능한 상태를 전부 연다.
   ③ 다 열고 나서 그래프에 묻는다:
      · 막다른 길   — 끝(후기/예외)이 아닌데 앞으로 가는 간선이 하나도 없는 상태
      · 갇힌 방     — 간선은 있지만 아무리 가도 '후기'에 못 닿는 상태
      · 강제변경 의존 — 강제변경(사고 복구용 비상구)을 빼면 위 둘이 되는 상태 ★이번 사고가 이것
      · 조용한 실패 — ok:true 를 돌려주는데 시트가 한 글자도 안 바뀌는 호출
   ④ 되돌리기 창(24h)이 열렸을 때/닫혔을 때를 **따로 두 판** 돌린다 —
      이번 사고가 «시간이 지나서» 났기 때문이다. 한 판만 돌리면 그 절반을 못 본다.

   ── 두 가지를 일부러 안 한다
   · 상태를 손으로 나열하지 않는다. 손목록은 «생각해 낸 것»만 담긴다 — 이번에 못 본 칸이 딱 그거였다.
   · 강제변경을 정상 간선으로 세지 않는다. 그건 비상구지 길이 아니다.
     비상구로만 나갈 수 있는 방 = 사고. 그래서 정상 간선만으로 한 번 더 계산한다.

   사용: node scripts/audit/stage-reach.mjs [--verbose]

   ── 2026-08-18 · 이제 초록으로 끝난다 [STAGE_REVIEW_DOOR]
   마지막까지 남았던 지적은 「후기」 단계로 올려 주는 동작이 없다는 것이었다.
   «후기»의 뜻을 정하고(결과물전달 = 후기를 기다리는 중 · 후기 = 여정이 끝난 자리)
   문을 하나 냈다 — 후기 마감(고객 제출 · 관리자 넘기기)이 그 문이다.
   ★CI(merge-guard)에는 여전히 걸지 않는다. 이 검사는 한 판에 10분 가까이 걸려
     auto-merge 게이트로 쓰면 병합이 그만큼 늦어진다. 대신 **되돌아가면 걸리는 마커**를
     merge-guard 에 심어 두었다(STAGE_REVIEW_DOOR) — 문이 사라지면 초당 단위로 잡힌다.
     상태공간 자체가 바뀌는 변경(단계 추가·가드 변경)을 했을 때 손으로 한 번 돌린다.
*/
import { openWorld, kstAgo } from './_gasworld.mjs';

const VERBOSE = process.argv.includes('--verbose');
const { G, world } = openWorld();
/* ★world() 는 매번 setCustomerStage 를 빈 함수로 갈아끼운다(다른 검사들이 부작용을 원치 않아서).
   여기서는 **진짜 단계 기계**가 돌아야 한다 — 이번 사고가 그 기계 안에 있었다. 그래서 미리 붙잡아 둔다. */
const REAL_SET_STAGE = G.setCustomerStage;

/* ── 상태 벡터 — 가드들이 실제로 읽는 칸만. 여기 없는 칸은 시드에 고정해 둔다 ── */
/* ★'시착벌수'는 컬럼이 아니라 동의기록 JSON 안에 산다(admin.gs 269). 그런데 상담완료 처리의 관문이라
   상태에 안 넣으면 «상담완료로 갈 문이 없다»는 가짜 경보가 뜬다 — 실제로 떴다. 파생 축으로 넣는다. */
const AXES = ['현재단계', '계약상태', '입금상태', '중도금상태', '잔금상태',
  '시착동의상태', '시착벌수', '결과물상태', '원본', '보정본', '설문상태', 'B상태'];
const keyOf = (s) => AXES.map((a) => s[a] || '').join('|');
const CODE = 'ME-TEST';

/* ── 창(window): 되돌리기 24시간이 열렸나 닫혔나. 두 판을 따로 돈다 ── */
const WINDOWS = [
  { name: '확인 직후(되돌리기 열림)', hours: 1 },
  { name: '24시간 경과(되돌리기 닫힘)', hours: 200 },
];

/* ── 고정 시드 — 상태 벡터에 없지만 핸들러가 필요로 하는 칸 ── */
function seedFor(st, hours) {
  const stamp = kstAgo(hours);
  /* ★계약정보.weddingTime — 서명 가드가 읽는 키(70_journey 242·253 «예식 시간 미확정이면 서명 거부» · #597 신설).
     안 실으면 계약 문이 닫혀 «계약완료·입금완료로 올려 주는 동작이 없다»는 가짜 경보가 뜬다(2026-08-30 실측 4건).
     원본링크 시드(아래 77행 주석)와 같은 종류의 함정이다 — 가드가 새 칸을 읽기 시작하면 여기도 같은 커밋에서 싣는다. */
  const rec = { 시착: { at: stamp }, 계약: { at: stamp }, 계약정보: { weddingTime: '12:20' } };
  if (st.시착벌수 !== '') rec.시착.벌수 = Number(st.시착벌수);
  return {
    개인코드: CODE, 신랑이름: '김희준', 신부이름: '이미쿠', 연락처: '010-1234-5678', 이메일: 't@example.com',
    상품타입: st.상품타입, 예식일: '2026-12-20', 계약총액: st.상품타입 === '웨딩스냅' ? 1200000 : 3300000,
    현재단계: st.현재단계, 계약상태: st.계약상태, 입금상태: st.입금상태,
    중도금상태: st.중도금상태, 잔금상태: st.잔금상태, 시착동의상태: st.시착동의상태,
    결과물상태: st.결과물상태, 설문상태: st.설문상태,
    /* 시각 칸 — 창(window)을 여기서 만든다. 확인일시가 오래되면 undo 가 막힌다(UNDO_WINDOW_HOURS) */
    /* ★계약서 «발송» 시각은 창을 따라가지 않는다 — 72시간 서명 기한은 되돌리기 창과 다른 규칙이고,
       같이 늙히면 «200시간 판»에서 계약완료·입금완료가 통째로 못 닿는 것으로 나온다(가짜 경보 2건).
       기한 만료 자체는 고객의 «재발송 요청» 동작이 따로 덮는다. */
    계약서발송일시: kstAgo(1), 계약서명일시: st.계약상태 === '서명완료' ? stamp : '',
    /* ★결과물 링크는 «다음 걸음»의 관문이다(전달 처리가 원본을 요구). 상태에 안 실으면
       링크등록 → 전달 이 두 걸음에 걸쳐 끊겨 «결과물전달에 못 닿는다»는 가짜 경보가 된다. */
    원본링크: st.원본 ? 'https://drive.google.com/drive/folders/AAAAAAAAAAAA' : '',
    보정본폴더: st.보정본 ? 'https://drive.google.com/drive/folders/BBBBBBBBBBBB' : '',
    확인일시: st.입금상태 === '확인' ? stamp : '', 중도금확인일시: st.중도금상태 === '확인' ? stamp : '',
    잔금확인일시: st.잔금상태 === '확인' ? stamp : '',
    입금자명: st.입금상태 ? '정희준' : '', 중도금입금자명: st.중도금상태 ? '정희준' : '',
    잔금입금자명: st.잔금상태 ? '정희준' : '',
    동의기록: JSON.stringify(rec), 처리이력: '',
  };
}
const bookingFor = (st) => (st.B상태 ? { 개인코드: CODE, 상태: st.B상태, 선택날짜: '2026-09-01', 선택시간: '14:50',
  신랑이름: '김희준', 신부이름: '이미쿠', 이메일: 't@example.com', 토큰: 'tk' } : null);

/* ── 동작 목록 ────────────────────────────────────────────────────────────────
   ★버튼이 보이든 말든 **서버를 직접 두드린다.** 화면 조건과 서버 가드가 어긋나는 것 자체가
     이번에 찾으려는 것이라, 화면 조건으로 미리 거르면 그 어긋남이 그대로 숨는다. */
const CUST = (fn, extra) => (g) => g[fn](Object.assign({ token: 'tk' }, extra || {}));
const ADMIN = (fn, args) => (g) => g[fn].apply(null, [CODE].concat(args || []));

const ACTIONS = [
  /* 고객 */
  { k: '고객:계약서명', side: 'cust', run: CUST('handleSignContract', { signature: 'data:image/png;base64,AAA', agree: true }) },
  { k: '고객:계약금 입금신고', side: 'cust', run: CUST('handlePaymentSignal', { payerName: '정희준' }) },
  { k: '고객:중도금 입금신고', side: 'cust', run: CUST('handleMidSignal', { payerName: '정희준' }) },
  { k: '고객:잔금 입금신고', side: 'cust', run: CUST('handleBalanceSignal', { payerName: '정희준' }) },
  { k: '고객:시착 동의서명', side: 'cust', run: CUST('handleSignFittingConsent', { signature: 'data:image/png;base64,AAA', agree: true }) },
  { k: '고객:제작 기초정보 저장', side: 'cust', run: CUST('handleSaveProductionBase', { base: { groomKo: '김희준', brideKo: '이미쿠' } }) },
  { k: '고객:사진 선택 제출', side: 'cust', run: CUST('handleSubmitResultSelection', { picks: [{ id: 'ID000000001', name: 'a.jpg' }, { id: 'ID000000002', name: 'b.jpg' }] }) },
  { k: '고객:보정본 컨펌', side: 'cust', run: CUST('handleConfirmRetouch', {}) },
  { k: '고객:후기 제출', side: 'cust', run: CUST('handleSubmitSurvey', { answers: { overall: 'very', recommend: 'yes' }, review: '좋았어요', reviewPublic: 'Y' }) },
  { k: '고객:계약서 재발송 요청', side: 'cust', run: CUST('handleRequestContractResend', {}) },
  /* ★강제변경은 예약행을 «신청접수»로 되돌린다(_resetConsultBooking). 거기서 나가는 문은
     고객의 일정 선택과 관리자의 시간 직접 제안 둘뿐이다 — 빠뜨리면 그 칸이 통째로 막다른 길로 뜬다. */
  { k: '고객:상담 일정 선택', side: 'cust', run: CUST('handleSubmitSchedule', { dateKey: '2026-09-01', time: '14:50' }) },
  /* 관리자 — 일상
     ★예약(상담) 쪽 동작을 빠뜨리면 «신청접수에서 나갈 문이 없다»는 가짜 경보가 뜬다(첫 판에서 실제로 그랬다).
       도구가 모르는 문은 없는 문과 구별되지 않는다 — 그래서 adminCall FNS 표를 훑어 전부 채웠다. */
  { k: '관리자:예약 승인', side: 'adm', run: ADMIN('adminApprove') },
  { k: '관리자:변경제안 수락', side: 'adm', run: ADMIN('adminAcceptProposal') },
  { k: '관리자:시간 직접 제안', side: 'adm', run: ADMIN('adminProposeTime', ['2026-09-02', '18:10', '']) },
  { k: '관리자:상담완료 처리', side: 'adm', run: ADMIN('adminMarkConsultDone') },
  { k: '관리자:임시고정 승인', side: 'adm', run: ADMIN('adminGrantWeddingHold') },
  { k: '관리자:중도금·잔금 한번에 확인', side: 'adm', run: ADMIN('adminConfirmMidBalance') },
  { k: '관리자:추가보정 입금확인', side: 'adm', run: ADMIN('adminConfirmExtra') },
  { k: '관리자:시착 동의 보내기', side: 'adm', run: ADMIN('adminOpenFittingConsent') },
  { k: '관리자:시착 동의 취소', side: 'adm', run: ADMIN('adminCloseFitting') },
  { k: '관리자:시착 벌수 기록', side: 'adm', run: ADMIN('adminSetFittingCount', [2]) },
  /* ★링크 인자 필수 — 빼면 서버가 거부해 계약 이후 절반이 통째로 안 열린다.
     ★[SEND_TIME_REQ 2026-08-30] 총액·예식일·**예식 시간**도 함께 넘긴다 — 시그니처는 시간 없는
       발송을 서버가 거부한다(고객이 서명할 수 없는 계약서를 만들지 않으려고). 빼면 계약완료·
       입금완료가 통째로 «닿지 않는 단계»로 잘못 잡힌다(스냅은 시간을 무시하므로 같은 인자로 돈다). */
  { k: '관리자:계약서 발송', side: 'adm', run: ADMIN('adminSendContract', ['https://momentedit.kr/contract/v1-1.html', 3300000, '2026-12-20', '12:20']) },
  { k: '관리자:입금 확인', side: 'adm', run: ADMIN('adminConfirmPayment') },
  { k: '관리자:중도금 확인', side: 'adm', run: ADMIN('adminConfirmMid') },
  { k: '관리자:잔금 확인', side: 'adm', run: ADMIN('adminConfirmBalance') },
  { k: '관리자:예식·촬영완료 처리', side: 'adm', run: ADMIN('adminMarkEventDone') },
  { k: '관리자:결과물 링크 등록', side: 'adm', run: ADMIN('adminSetResultLinks', [{ 원본: 'https://drive.google.com/drive/folders/AAAAAAAAAAAA', 보정본: 'https://drive.google.com/drive/folders/BBBBBBBBBBBB', 영상: 'https://vimeo.com/1' }]) },
  { k: '관리자:보정 착수', side: 'adm', run: ADMIN('adminStartRetouch') },
  { k: '관리자:결과물 전달', side: 'adm', run: ADMIN('adminMarkDelivered') },
  { k: '관리자:후기 건너뜀', side: 'adm', run: ADMIN('adminSkipSurvey') },
  /* 관리자 — 종료 처리(정상 경로의 끝이 아니라 이탈) */
  { k: '관리자:노쇼 처리', side: 'exit', run: ADMIN('adminMarkNoshow') },
  { k: '관리자:미계약 처리', side: 'exit', run: ADMIN('adminMarkUncontracted') },
  { k: '관리자:예약 취소', side: 'exit', run: ADMIN('adminCancel', ['점검']) },
  { k: '관리자:환불 완료 처리', side: 'exit', run: ADMIN('adminMarkRefunded') },
  /* 관리자 — 비상구(정상 간선으로 세지 않는다) */
  { k: '관리자:입금확인 취소', side: 'rescue', run: ADMIN('adminUndoConfirmPayment', ['계약금', '오처리 복구']) },
];
/* 강제변경 — 모든 목표 단계로. 비상구다. */
for (const target of ['신청접수', '상담확정', '촬영확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '촬영완료', '결과물전달', '후기']) {
  ACTIONS.push({ k: `관리자:강제변경→${target}`, side: 'force', force: target,
    run: ADMIN('adminForceStage', [target, '점검']) });
}

const NORMAL = (a) => a.side === 'cust' || a.side === 'adm';   // '앞으로 가는 정상 간선'으로 셀 것

/* ── 한 상태에서 한 동작을 실행하고 결과 상태를 돌려준다 ── */
function step(st, act, hours) {
  const w = world(seedFor(st, hours), bookingFor(st));
  G.setCustomerStage = REAL_SET_STAGE;                      // ★진짜 단계 기계로 되돌린다
  G.resolveSession = () => ({ ok: true, row: G.findCustomerByCode(CODE) });
  let res, threw = '';
  try { res = act.run(G); } catch (e) { threw = String((e && e.message) || e); }
  const after = Object.assign({}, st);
  let rec = {}; try { rec = JSON.parse(String(w.C['동의기록'] || '{}')) || {}; } catch (e) { rec = {}; }
  const beolsu = (rec.시착 && rec.시착.벌수 != null) ? String(rec.시착.벌수) : '';
  for (const a of AXES) {
    if (a === 'B상태') { if (w.B) after.B상태 = String(w.B['상태'] || ''); }
    else if (a === '시착벌수') after.시착벌수 = beolsu;
    else if (a === '원본') after.원본 = w.C['원본링크'] ? 'Y' : '';
    else if (a === '보정본') after.보정본 = w.C['보정본폴더'] ? 'Y' : '';
    else after[a] = String(w.C[a] || '');
  }
  after.상품타입 = st.상품타입;
  const moved = keyOf(after) !== keyOf(st);
  const okFlag = !!(res && res.ok !== false) && !threw;
  return { after, moved, ok: okFlag, threw, res, wrote: w.writes().length };
}

/* ── 너비우선 탐색 ── */
function explore(product, hours) {
  const start = { 상품타입: product, 현재단계: '신청접수', 계약상태: '', 입금상태: '', 중도금상태: '',
    잔금상태: '', 시착동의상태: '', 시착벌수: '', 결과물상태: '', 원본: '', 보정본: '', 설문상태: '', B상태: '시간선택완료' };
  const seen = new Map(); const queue = [start];
  seen.set(keyOf(start), { st: start, out: [] });
  const silent = [];
  while (queue.length) {
    const st = queue.shift(); const node = seen.get(keyOf(st));
    for (const act of ACTIONS) {
      const r = step(st, act, hours);
      /* 조용한 실패 — 성공이라 답했는데 아무것도 안 바뀌고 아무것도 안 썼다.
         멱등(already)은 정상이므로 뺀다. */
      if (r.ok && !r.moved && r.wrote === 0 && !(r.res && (r.res.already || r.res.skipped))
          && NORMAL(act)) silent.push({ st: keyOf(st), act: act.k });
      if (!r.ok || !r.moved) continue;
      node.out.push({ act, to: keyOf(r.after) });
      if (!seen.has(keyOf(r.after))) { seen.set(keyOf(r.after), { st: r.after, out: [] }); queue.push(r.after); }
    }
  }
  return { seen, silent };
}

/* ── 그래프에 묻는다 ── */
const FLOW = { 시그니처: G.STAGE_FLOW['시그니처'], 웨딩스냅: G.STAGE_FLOW['웨딩스냅'] };
const EX = G.STAGE_EXCEPTIONS;

function analyse(product, seen) {
  const flow = FLOW[product]; const goal = flow[flow.length - 1];      // '후기'
  /* ★끝을 무엇으로 볼 것인가 — 여기서 정직해야 한다.
     STAGE_FLOW 의 마지막 칸은 '후기'다. 그런데 **코드 어디도 현재단계를 '후기'로 올리지 않는다**
     (setCustomerStage MAP 에 그 전이가 없다 · admin.gs 1958 주석도 «adminForceStage 로 올린다»고 적혀 있다).
     그래서 '후기 도달'만을 끝으로 잡으면 **모든 상태가 붉게** 뜬다 — 한 가지 사실을 천 번 말하는 셈이라
     정작 다른 막다른 길이 그 소음에 묻힌다(첫 판이 정확히 그랬다).
     그래서 끝은 «저장소가 실제로 끝으로 취급하는 것»으로 잡는다 — 아카이브 판정과 같은 식
     (admin.gs 549: 결과물전달·후기 + 설문 마감). 그리고 '후기 도달 불가'는 아래에서 **따로** 한 줄로 말한다. */
  const surveyClosed = (s) => s.설문상태 === '완료' || s.설문상태 === '건너뜀';
  const isTerminal = (s) => EX.indexOf(s.현재단계) !== -1
    || ((s.현재단계 === '결과물전달' || s.현재단계 === goal) && surveyClosed(s));
  /* 정상 간선만으로 goal 에 닿는가 — 역방향 도달성 */
  const canReach = (edgeOk) => {
    const good = new Set();
    for (const [k, n] of seen) if (isTerminal(n.st)) good.add(k);
    let grew = true;
    while (grew) { grew = false;
      for (const [k, n] of seen) { if (good.has(k)) continue;
        if (n.out.some((e) => edgeOk(e.act) && good.has(e.to))) { good.add(k); grew = true; } } }
    return good;
  };
  const reachAll = canReach(() => true);
  const reachNormal = canReach(NORMAL);
  const dead = [], trapped = [], rescueOnly = [];
  for (const [k, n] of seen) {
    if (isTerminal(n.st)) continue;
    const fwd = n.out.filter((e) => NORMAL(e.act));
    if (!n.out.length) dead.push(k);
    else if (!reachAll.has(k)) trapped.push(k);
    else if (!reachNormal.has(k)) rescueOnly.push({ k, only: n.out.filter((e) => !NORMAL(e.act)).map((e) => e.act.k) });
    else if (!fwd.length) rescueOnly.push({ k, only: n.out.map((e) => e.act.k) });
  }
  /* 정상 간선만으로 각 단계에 한 번이라도 닿는가 — 「비상구로만 갈 수 있는 단계」를 이름으로 집어낸다 */
  const normalStages = new Set();
  /* ★«그 상태의 단계»가 아니라 «단계를 실제로 바꾼» 간선만 센다.
     안 그러면 후기 단계에서 후기를 제출하는 것(단계는 그대로)도 «후기에 닿았다»로 세어져
     정작 «후기로 올려 주는 문이 없다»는 사실이 초록으로 덮인다(실제로 덮였다). */
  for (const [, n] of seen) for (const e of n.out) {
    if (!NORMAL(e.act)) continue;
    const to = seen.get(e.to).st;
    if (to.현재단계 !== n.st.현재단계) normalStages.add(to.현재단계);
  }
  const unreachableStages = flow.filter((s) => !normalStages.has(s) && s !== '신청접수');
  return { dead, trapped, rescueOnly, unreachableStages, total: seen.size };
}

let fail = 0;
const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : '\n       ' + d}`); if (!c) fail++; };

for (const product of ['시그니처', '웨딩스냅']) {
  for (const win of WINDOWS) {
    console.log(`\n[${product} · ${win.name}]`);
    const { seen, silent } = explore(product, win.hours);
    const a = analyse(product, seen);
    console.log(`  · 도달 가능한 상태 ${a.total}가지 · 간선 ${[...seen.values()].reduce((s, n) => s + n.out.length, 0)}개`);
    ok(a.dead.length === 0, `막다른 길 없음(끝이 아닌데 나가는 문이 0개)`,
      a.dead.slice(0, 6).join('\n       '));
    ok(a.trapped.length === 0, `갇힌 방 없음(어떤 수를 써도 '후기'에 못 닿음)`,
      a.trapped.slice(0, 6).join('\n       '));
    ok(a.rescueOnly.length === 0, `비상구 없이도 앞으로 갈 수 있다(강제변경·되돌리기 의존 0)`,
      a.rescueOnly.slice(0, 8).map((x) => x.k + '  ← 남은 문: ' + x.only.slice(0, 3).join(', ')).join('\n       '));
    ok(a.unreachableStages.length === 0, `모든 단계에 정상 동작으로 닿는다(강제변경 없이)`,
      a.unreachableStages.map((s) => `「${s}」 — 이 단계로 올려 주는 동작이 하나도 없다`).join('\n       '));
    const sil = [...new Set(silent.map((s) => s.act + '  @ ' + s.st))];
    ok(sil.length === 0, `조용한 실패 없음(성공이라 답했는데 시트가 안 바뀜)`, sil.slice(0, 8).join('\n       '));
    if (VERBOSE) for (const [k, n] of seen) console.log('    ' + k + ' → ' + n.out.map((e) => e.act.k).join(', '));
  }
}

console.log(`\n결과 — ${fail ? '실패 ' + fail + '건' : '실패 0건 (전부 통과)'}`);
process.exit(fail ? 1 : 0);
