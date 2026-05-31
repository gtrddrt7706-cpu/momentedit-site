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
    kakao: (CONFIG.KAKAO_URL && String(CONFIG.KAKAO_URL).charAt(0) !== '[') ? CONFIG.KAKAO_URL : '' // 카톡 문의(미설정 시 빈값)
  };
}
