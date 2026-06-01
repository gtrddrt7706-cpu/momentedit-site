/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T6 마이페이지 상태 조회
 * ──────────────────────────────────────────────────────────────────────────
 * getMyState(token) → 마이페이지가 그릴 표시용 필드만 반환.
 *   { ok, name, product, stage, stageList, stageIndex, isException, nextAction, code }
 * 민감정보(비번해시·토큰·타인 데이터)는 절대 포함하지 않는다(DoD).
 */

function handleGetMyState(body) {
  var token = String((body && body.token) || '').trim();
  var s = resolveSession(token);
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };

  var r = s.row;
  var product = String(r.get('상품타입') || '').trim() || P.PRODUCT_SIGNATURE;
  var stage = String(r.get('현재단계') || '').trim() || '신청접수';

  var flow = stageFlowFor(product);
  var idx = flow.indexOf(stage);
  var isException = (STAGE_EXCEPTIONS.indexOf(stage) !== -1);

  return {
    ok: true,
    name: customerNames(r),                 // 표시명 (신랑 · 신부)
    groom: String(r.get('신랑이름') || ''),
    bride: String(r.get('신부이름') || ''),
    product: product,                        // '시그니처' / '웨딩스냅'
    stage: stage,                            // 현재단계 라벨
    stageList: flow,                         // 진행바 라벨 세트(상품별)
    stageIndex: idx,                         // 진행바 내 현재 위치(-1=정상경로 밖)
    isException: isException,                // 취소·노쇼·미계약 여부
    nextAction: nextActionFor(product, stage), // "지금 할 일" 한 문장
    code: String(r.get('개인코드') || ''),    // 코드 복사용
    kakao: (CONFIG.KAKAO_URL && String(CONFIG.KAKAO_URL).charAt(0) !== '[') ? CONFIG.KAKAO_URL : '', // 카톡 문의(미설정 시 빈값)
    consult: buildConsultState(String(r.get('개인코드') || ''))  // [P1.5 작업3] 상담/촬영 행 조인(없으면 null)
  };
}

// [P1.5 작업3] 개인코드로 상담예약 행을 조인해 마이페이지 "상담/촬영" 카드용 상태 구성.
// 상담행 없으면 null(원자성 실패 케이스 — 마이페이지는 에러 없이 렌더). 상담토큰·비번 등 민감필드는 내보내지 않음.
function buildConsultState(code) {
  code = String(code || '').trim();
  if (!code) return null;
  var cr = findRowByPersonalCode(code);     // consultation-booking 전역
  if (!cr) return null;

  var status = String(cr.get('상태') || '').trim();
  var dateKey = cr.get('선택날짜');
  var time = String(cr.get('선택시간') || '').trim();
  var consultToken = String(cr.get('토큰') || '');
  var locked = (status === ST.APPROVED || status === ST.CONFIRMED);  // LOCKED_STATES
  var within = locked ? withinCancelDeadline(dateKey, time) : false; // 변경/취소 = 확정 + 24h 전(KST)

  return {
    status: status,                                  // 신청접수·시간선택완료·승인완료·확정·변경제안·취소
    date: dateKey ? prettyDate(dateKey) : '',        // 표시용
    time: time,
    canChange: within,
    canCancel: within,
    scheduleUrl: consultToken ? scheduleUrl(consultToken) : '',  // ?page=schedule&token= (일정선택)
    proposedDate: cr.get('변경제안날짜') ? prettyDate(cr.get('변경제안날짜')) : '',
    proposedTime: String(cr.get('변경제안시간') || '').trim()
  };
}
