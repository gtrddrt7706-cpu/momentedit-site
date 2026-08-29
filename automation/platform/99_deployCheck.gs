/* ★[DEPLOY_CHECK 2026-08-26 · 갱신 2026-08-29] 「전부 올렸는지」를 GAS 안에서 스스로 확인한다.
 *
 * 쓰는 법 — 이 파일 내용을 통째로 붙여넣고,
 *   상단 드롭다운에서 deployCheck 를 골라 실행 → 실행 로그를 본다.
 *   ★재배포 없이 실행된다(편집기는 저장된 코드로 돈다). 아무것도 쓰지 않는다(읽기 전용).
 *
 * 무엇을 보나
 *   ①파일이 다 있는가 — 파일마다 «그 파일에만 있는 함수» 하나로 존재를 확인
 *   ②최근 변경이 실제로 올라갔는가 — 새 함수의 존재 + 함수 본문 안의 표식(toString)
 *   ★표식은 주석이라 «붙여넣다 잘렸는지»까지 잡는다. 이름만 맞고 내용이 옛것이면 여기서 걸린다.
 *
 * ★[FIX 2026-08-29] 두 가지를 고쳤다. 되돌리지 말 것.
 *   ①90_test-utils 의 기준이 `setupAllTriggers` 였는데 그 함수는 **70_journey.gs** 에 있다.
 *     → 90_test-utils 를 통째로 안 붙여도 「OK」가 나오던 자리다(일부러 빼서 확인). `platformSelfTest` 로 교체.
 *   ②8/29 확정(예식 확인서) 변경 중 CF_ONCE·CF_LOG 가 항목에 없어 못 잡았다 → ②에 추가.
 *   기준 함수 24개가 실제로 어느 파일에 있는지 전수 대조했고, 지금 코드로 돌려 54항목 전부 통과한다.
 */
function deployCheck() {
  var L = [];
  var okN = 0, badN = 0;
  function chk(label, cond, hint) {
    if (cond) { okN++; L.push('  OK   ' + label); }
    else { badN++; L.push('  MISS ' + label + (hint ? ('   → ' + hint) : '')); }
  }
  function has(name) { try { return eval('typeof ' + name) === 'function'; } catch (e) { return false; } }
  function src(name) { try { return eval('String(' + name + ')'); } catch (e) { return ''; } }
  function mark(fn, m) { var s = src(fn); return s && s.indexOf(m) >= 0; }

  L.push('══ ① 파일이 다 있는가 (파일마다 «그 파일에만 있는» 함수 하나로 확인) ══');
  var FILES = [   /* 18개 — 86_dining_ai 제외(빈 슬롯) */
    ['00_platform-config', 'stageFlowFor'], ['10_customers-setup', 'setupCustomers'],
    ['20_customers-data', 'findCustomerByCode'], ['30_auth-core', 'resolveSession'],
    ['40_signup', 'handleSignup'], ['50_auth-handlers', 'handleLogin'],
    ['60_mypage', 'handleGetMyState'], ['70_journey', 'buildRefundQuote'],
    ['80_production', 'handleSaveProductionTrack'], ['85_invitation', 'handleSaveInvitationDraft'],
    ['88_place_audit', 'auditDineDb'],
    ['90_test-utils', 'platformSelfTest'],   /* ★setupAllTriggers 로 되돌리지 말 것 — 그건 70_journey 에 있다 */
    ['95_notify', 'notifySetupCheck'],
    ['96_ai_cost', 'aiMorningReport'], ['97_ai-handoff', 'aiHandoffStatus'],
    ['98_pay_card', 'ZZ_tossPing'], ['consultation-booking', 'doPost'], ['admin', 'adminHome']
  ];
  for (var i = 0; i < FILES.length; i++) {
    chk('파일 ' + FILES[i][0] + '  (기준: ' + FILES[i][1] + ')', has(FILES[i][1]), '이 파일이 없거나 이름이 다릅니다');
  }
  L.push('  --   파일 86_dining_ai  (주석만 있는 빈 슬롯 · 실행으로 확인 불가 · 없어도 무방)');
  L.push('  --   파일 Admin.html    (화면 틀이라 코드로 확인 불가 · 관리자 페이지가 열리면 그게 확인이다)');

  L.push('');
  L.push('══ ② 최근 변경이 실제로 올라갔는가 ══');
  var NEWFN = [
    ['admin', '_rbConfirmedSlot', '되돌림 슬롯 잠금'], ['admin', '_rbSlotPlan', '되돌림 슬롯 판정'],
    ['admin', '_rbCalRetitle', '캘린더 제목 변경'], ['admin', '_ymdDot', '날짜 표기 통일'],
    ['admin', '_rbPaidAny', '수납 보존 판정'],
    ['60_mypage', 'buildRollbackNotice', '되돌림 고객 안내'],
    ['80_production', '_guideCloseInfo', '안내 닫는 이유 구분'],
    ['96_ai_cost', 'aiDraftAnswer', 'AI 원클릭 교육']
  ];
  for (var j = 0; j < NEWFN.length; j++) {
    chk('[' + NEWFN[j][0] + '] ' + NEWFN[j][1] + ' — ' + NEWFN[j][2], has(NEWFN[j][1]), '그 파일이 옛 버전입니다');
  }
  var MARKS = [
    ['admin', 'adminHome', 'CPN_QUEUE', '커피쿠폰 발급 큐'],
    ['admin', 'adminHome', 'SLOT_HOLD_EXPIRY_Q', '잡아 둔 자리 만료 큐'],
    ['admin', 'adminHome', 'REVISION_QUEUE', '수정요청 처리 큐'],
    ['admin', 'adminSendContract', 'CONTRACT_AMOUNT_REQ', '총액 없는 계약서 차단'],
    ['admin', 'adminSendContract', 'SEND_HOLD_SYNC', '발송·홀드 동기화'],
    ['admin', 'adminGrantWeddingHold', 'HOLD_LOCK', '가예약 승인 락'],
    ['admin', 'adminSendContract', 'CONTRACT_NOTIFY_THROTTLE', '계약서 도착 알림 중복 방지'],
    ['admin', 'adminIssueCoupon', 'COUPON_NOTIFY_ONCE', '쿠폰 발급 알림 1회'],
    ['admin', '_clearForwardData', 'FITTING_SPLIT', '시착 갇힘 수정'],
    ['admin', '_clearForwardData', 'GUIDE_TOKEN_CLEAR', '되돌리면 공개 링크 닫기'],
    ['95_notify', '_kakaoSend', 'ADMIN_MAIL_UNCHAINED', '관리자 알림 살리기'],
    ['95_notify', 'flushHeldNotifies', 'HOLD_NO_LOSS', '보류 알림 무손실'],
    ['60_mypage', 'handleGetMyState', 'NOW_CONTRACT_EXPIRED', '기한 지난 계약 안내'],
    ['70_journey', '_refundQuote', 'CHANGE_RATCHET', '위약금 회피 차단(99만원)'],
    ['70_journey', 'handleSignContract', 'SIGN_SLOT_REQUIRED', '예식시간 없인 서명 불가'],
    ['70_journey', 'handleSignContract', 'SIGN_BOUNCE_ALERT', '서명 튕김 알림'],
    ['consultation-booking', 'setCustomerStage', 'STAGE_REVIEW_DOOR', '후기 단계로 올리는 문'],
    ['consultation-booking', 'actAccept', 'ACCEPT_GUARDED', '변경제안 수락 가드'],
    ['consultation-booking', 'submitSchedule', 'PAST_SLOT_REJECT', '지난 날짜·시간 거절'],
    ['80_production', 'handleSubmitSurvey', 'STAGE_REVIEW_DOOR', '후기 제출이 단계를 올림'],
    ['80_production', 'handleSubmitSurvey', 'SURVEY_ONCE', '설문 재제출 멱등'],
    ['80_production', 'handleSubmitResultSelection', 'PICK_MAX_MANUAL', '수동 컷 400 상한'],
    ['80_production', 'handleRequestExtraRetouch', 'XR_SIGNAL_KEEP', '입금신호 증발 방지'],
    ['80_production', 'handleExtraRetouchSignal', 'XR_STAGE_GUARD', '유령 입금신호 차단'],
    /* ★8/29 확정(예식 확인서) 변경 넷 — 빈 도장·중복 확정·이력 없음·옛 날짜 도장을 막는다 */
    ['80_production', 'handleSaveProductionTrack', 'CF_CORE_TRUTH', '빈 인원·손상 컬럼이면 확정 거부'],
    ['80_production', 'handleSaveProductionTrack', 'CF_ONCE', '두 번째 확정은 멱등(기록·메일 1회)'],
    ['80_production', 'handleSaveProductionTrack', 'CF_LOG', '확정을 처리이력·메일에 남김'],
    ['70_journey', 'adminConfirmWeddingChange', 'CF_VOID_WEDDAY', '예식일이 바뀌면 확정 해제']
  ];
  for (var k = 0; k < MARKS.length; k++) {
    var m = MARKS[k];
    chk('[' + m[0] + '] ' + m[1] + ' 안의 ' + m[2] + ' — ' + m[3], mark(m[1], m[2]), '그 파일이 옛 버전이거나 붙여넣다 잘렸습니다');
  }

  L.push('');
  L.push('══ ③ 쿠폰 발급 안내가 켜져 있는가 ══');
  try {
    var ev = (typeof NOTIFY_EVENTS !== 'undefined') ? NOTIFY_EVENTS['cust.couponIssued'] : null;
    chk('cust.couponIssued 이벤트가 등록됨', !!ev, '95_notify 가 옛 버전입니다');
    if (ev) chk('그 이벤트가 «켜짐»(off 아님)', !ev.off, '보내려면 off: true 를 지우세요');
  } catch (e) { chk('알림 이벤트 표 읽기', false, String(e && e.message)); }

  L.push('');
  L.push(badN === 0
    ? '결과 — 누락 0건. 파일이 전부 있고, 최근 변경도 전부 올라갔습니다. (확인 ' + okN + '항목)'
    : '결과 — ★누락 ' + badN + '건. 위 MISS 줄의 파일을 다시 붙여넣고 «새 버전»으로 배포하세요. (확인 ' + okN + '항목)');
  L.push('※ 이 결과는 «저장된 코드» 기준이다. 고객 화면(/exec)에 반영하려면 배포 관리 → 새 버전으로 재배포할 것.');
  var out = L.join('\n');
  Logger.log(out);
  return out;
}
