/**
 * 95_notify.gs — 카톡 알림톡 훅 (채널 추상화)
 * ------------------------------------------------------------------
 * 여정의 각 시점에서 notifyKakao(event, code, extra)를 호출한다.
 * 지금은 발송부가 비어 있어 "로그만" 남긴다(카톡 계정·알림톡 템플릿 준비 전).
 * 카톡 연동 시 → NOTIFY.ENABLED=true + _kakaoSend()만 구현하면, 훅 위치는 그대로.
 *
 * 설계 원칙
 *  - 베스트에포트: 알림 실패가 본 흐름(계약·입금·결과물)을 절대 막지 않는다(내부 try/catch).
 *  - 단일 진입점: 모든 알림이 notifyKakao 한 곳을 지난다 → 나중에 발송부 1곳만 연결.
 *  - 이벤트 카탈로그(NOTIFY_EVENTS): 시점별 수신자(admin/customer)·용도. 문구는 3단계에서 템플릿화.
 */

var NOTIFY = {
  ENABLED: false,   // 카톡 연동 전 false — 호출돼도 실제 발송 안 함(로그만). 연동 후 true.
  LOG: true         // 훅 호출을 Logger에 기록(디버깅/검증용)
};

// 시점별 이벤트 — to: 수신자 / need: 행동게이트(true)인지 안내(false) / desc: 용도
var NOTIFY_EVENTS = {
  // ── 관리자: 직접 눌러야 다음 스텝(행동 게이트) ──
  'admin.newSignup':      { to: 'admin', need: true,  desc: '신규 신청 — 일정 잡기' },
  'admin.slotPicked':     { to: 'admin', need: true,  desc: '상담 슬롯 선택됨 — 승인 필요' },
  'admin.contractReq':    { to: 'admin', need: true,  desc: '계약서 요청됨 — 발송 필요' },
  'admin.depositSignal':  { to: 'admin', need: true,  desc: '계약금 입금신호 — 확인 필요' },
  'admin.midSignal':      { to: 'admin', need: true,  desc: '중도금 입금신호 — 확인 필요' },
  'admin.balanceSignal':  { to: 'admin', need: true,  desc: '잔금 입금신호 — 확인 필요' },
  'admin.holdRequest':    { to: 'admin', need: true,  desc: '예식일 임시고정 요청 — 승인/거절 필요' },
  // ── 관리자: 권장(업무 착수 신호) ──
  'admin.fittingSigned':  { to: 'admin', need: false, desc: '시착 동의 서명 완료 — 상담완료 처리' },
  'admin.contractSigned': { to: 'admin', need: false, desc: '계약 서명 완료' },
  'admin.resultPicked':   { to: 'admin', need: false, desc: '결과물(보정본) 선택됨 — 작업 착수' },
  'admin.extraSignal':    { to: 'admin', need: true,  desc: '추가보정 입금신호 — 확인 필요' },
  'admin.cancelRefund':   { to: 'admin', need: true,  desc: '예약 취소 — 환불 송금 필요' },
  // ── 고객: 행동 필요 ──
  'cust.consultConfirmed':{ to: 'customer', need: false, desc: '상담 확정' },
  'cust.timeProposed':    { to: 'customer', need: true,  desc: '상담 시간 변경 제안 — 수락 필요' },
  'cust.fittingRequest':  { to: 'customer', need: true,  desc: '시착 동의 요청 — 서명 필요' },
  'cust.contractArrived': { to: 'customer', need: true,  desc: '계약서 도착 — 72시간 내 서명' },
  'cust.balanceDue':      { to: 'customer', need: true,  desc: '잔금 안내 — 입금' },
  'cust.resultDelivered': { to: 'customer', need: true,  desc: '결과물 전달 — 다운로드' },
  // ── 고객: 권장(안심) ──
  'cust.paymentConfirmed':{ to: 'customer', need: false, desc: '입금 확인됨' },
  'cust.cashReceiptIssued':{ to: 'customer', need: false, desc: '현금영수증 발행됨' },
  'cust.holdGranted':     { to: 'customer', need: false, desc: '예식일 임시고정 승인됨' },
  'cust.holdExpiring':    { to: 'customer', need: true,  desc: '임시고정 만료 임박(D-3) — 상담/연장 안내' },
  'cust.midDue':          { to: 'customer', need: true,  desc: '중도금 안내(D-149) — 입금' },
  'admin.dailyBrief':     { to: 'admin',    need: false, desc: '아침 운영 브리핑(오늘 상담·처리할 일 요약)' },
  'cust.holdReleased':    { to: 'customer', need: false, desc: '예식일 임시고정 해제됨' },
  'cust.consultDayBefore':{ to: 'customer', need: false, desc: '상담 하루 전 안내' },
  'cust.archiveExpiring': { to: 'customer', need: true,  desc: '결과물 보관 만료 임박 — 다운로드 안내' }
};

/**
 * 알림 훅 — 여정 각 시점에서 호출. 절대 throw 하지 않음(본 흐름 보호).
 * @param {string} event  NOTIFY_EVENTS 키
 * @param {string} code   고객 개인코드(고객 알림 시 수신번호 조회용 · 관리자 알림 시 참고)
 * @param {Object=} extra 부가정보(금액·D-day·이름 등) — 문구 템플릿/디버깅용
 */
function notifyKakao(event, code, extra) {
  try {
    var meta = NOTIFY_EVENTS[event];
    if (!meta) { if (NOTIFY.LOG) Logger.log('[notifyKakao] ⚠️ 미등록 이벤트: ' + event); return; }
    if (NOTIFY.LOG) {
      Logger.log('[notifyKakao] ' + event + ' → ' + meta.to + (meta.need ? '(행동필요)' : '(안내)')
        + ' · ' + (code || '-') + (extra ? (' · ' + _safeJson(extra)) : ''));
    }
    if (!NOTIFY.ENABLED) return;          // 카톡 연동 전 — 로그만 남기고 종료
    _kakaoSend(meta.to, event, code, extra);
  } catch (e) {
    try { Logger.log('[notifyKakao] 예외(무시): ' + (e && e.message)); } catch (_) {}
  }
}

/**
 * 실제 카톡(알림톡) 발송 — ★카톡 계정·템플릿 준비되면 여기만 구현★.
 *  - to==='admin'    → 운영자 번호(고정)로 발송. code는 참고용.
 *  - to==='customer' → code로 고객 휴대폰 조회 후 발송.
 * 지금은 미구현(NOTIFY.ENABLED=false 라 호출되지 않음).
 */
function _kakaoSend(to, event, code, extra) {
  // TODO(카톡 연동):
  //   1) 수신번호: admin=운영자번호 / customer=findCustomerByCode(code).연락처
  //   2) event → 알림톡 템플릿코드 + 치환변수(extra·이름·금액·링크) 매핑
  //   3) 알림톡 API(예: 카카오 비즈메시지/대행사) 호출. 실패 시 SMS 대체 검토.
}

function _safeJson(o) { try { return JSON.stringify(o); } catch (e) { return String(o); } }
