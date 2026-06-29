/**
 * 95_notify.gs — 카톡 알림톡 + SMS 발송 (솔라피 Solapi 연동)
 * ------------------------------------------------------------------
 * 여정의 각 시점에서 notifyKakao(event, code, extra)를 호출한다(훅 35곳).
 *
 * 발송 정책
 *  - 고객(customer): 알림톡(승인된 템플릿 코드가 있을 때) → 실패 시 SMS 자동 대체.
 *                    템플릿 코드가 아직 없으면 같은 내용을 SMS로 발송(승인 전에도 운영 가능).
 *  - 관리자(admin):  SMS/LMS (템플릿 승인 불필요 · ADMIN_PHONE으로).
 *                    [최소 발송 · 2026-06-11] 행동 게이트(need:true · 관리자가 처리해야 고객 진행이 풀리는 일)만 발송.
 *                    안내성(need:false)은 기본 생략 — 아침 브리핑 메일·관리자 페이지에서 확인.
 *  - 베스트에포트: 발송 실패가 본 흐름(계약·입금·결과물)을 절대 막지 않는다(내부 try/catch).
 *
 * ★ 설정은 전부 Script Properties (코드 수정·재배포 없이 변경 가능) ★
 *   NOTIFY_ENABLED    'true'면 실발송. 그 외(미설정 포함)는 로그만.
 *   SOLAPI_API_KEY    솔라피 콘솔 > API Key
 *   SOLAPI_API_SECRET 〃 API Secret
 *   SOLAPI_SENDER     사전 등록한 발신번호(숫자만, 예: 01012345678) — SMS 발신용
 *   SOLAPI_PF_ID      카카오 채널 연동 후 발급되는 pfId — 알림톡 발신프로필
 *   ADMIN_PHONE       관리자(디렉터) 휴대폰(숫자만)
 *   ADMIN_NOTIFY_INFO 'true'면 안내성(need:false) 관리자 알림도 발송. 기본(미설정)은 행동 게이트만.
 *   KAKAO_TEMPLATES   JSON 한 줄. 승인된 템플릿만 채우면 그 이벤트부터 알림톡 전환.
 *                     예: {"cust.consultConfirmed":"KA01TP아이디...","cust.contractArrived":"KA01TP..."}
 *
 * 템플릿 신청 문안: automation/알림톡_템플릿_신청문안.md (변수명까지 이 파일과 1:1)
 * 테스트: notifySetupCheck() → notifyTestAdminSms() → notifyTestCustomerByCode('개인코드')
 */

var NOTIFY = {
  LOG: true         // 훅 호출을 Logger에 기록(디버깅/검증용)
};

function _notifyEnabled() {
  try { return PropertiesService.getScriptProperties().getProperty('NOTIFY_ENABLED') === 'true'; }
  catch (e) { return false; }
}
// [관리자 알림 최소화] 안내성(need:false) 관리자 알림도 폰으로 받을지 — 기본 false(행동 게이트만)
function _adminInfoOn() {
  try { return PropertiesService.getScriptProperties().getProperty('ADMIN_NOTIFY_INFO') === 'true'; }
  catch (e) { return false; }
}

// 시점별 이벤트 — to: 수신자 / need: 행동게이트(true)인지 안내(false) / desc: 용도
var NOTIFY_EVENTS = {
  // ── 관리자: 직접 눌러야 다음 스텝(행동 게이트) ──
  // [2026-06-23] newSignup은 행동 게이트 아님 → need:false(폰 생략). 신청 직후 다음 차례는 고객(마이페이지에서 상담 슬롯 선택)이고,
  //   관리자 첫 행동(승인)은 고객이 슬롯을 고른 뒤 admin.slotPicked부터 발생. 신규 신청은 아침 브리핑·관리자 페이지 큐로 확인(ADMIN_NOTIFY_INFO='true'면 복구).
  'admin.newSignup':      { to: 'admin', need: false, desc: '신규 신청 접수(폰 생략 · 다음 행동=고객 슬롯 선택 · 관리자 게이트는 slotPicked부터)' },
  'admin.slotPicked':     { to: 'admin', need: true,  desc: '상담 슬롯 선택됨 — 승인 필요' },
  'admin.contractReq':    { to: 'admin', need: true,  desc: '계약서 요청됨 — 발송 필요' },
  'admin.depositSignal':  { to: 'admin', need: true,  desc: '계약금 입금신호 — 확인 필요' },
  'admin.midSignal':      { to: 'admin', need: true,  desc: '중도금 입금신호 — 확인 필요' },
  'admin.balanceSignal':  { to: 'admin', need: true,  desc: '잔금 입금신호 — 확인 필요' },
  'admin.holdRequest':    { to: 'admin', need: true,  desc: '예식일 임시고정 요청 — 승인/거절 필요' },
  'admin.changeRequest':  { to: 'admin', need: true,  desc: '예식일 변경 요청 — 슬롯 확인 후 적용/거절 필요' },
  // ── 관리자: 권장(업무 착수 신호) — need:false는 기본 폰 발송 안 함(아침 브리핑 메일·관리자 페이지로 확인 · ADMIN_NOTIFY_INFO='true'로 복구) ──
  'admin.fittingSigned':  { to: 'admin', need: true,  desc: '시착 동의 서명 완료 · 상담완료 처리(2026-06-23 켬)' },
  'admin.contractSigned': { to: 'admin', need: false, desc: '계약 서명 완료' },
  'admin.resultPicked':   { to: 'admin', need: true,  desc: '결과물(보정본) 선택됨 · 작업 착수(2026-06-23 켬)' },
  'admin.extraSignal':    { to: 'admin', need: true,  desc: '추가보정 입금신호 — 확인 필요' },
  'admin.cancelRefund':   { to: 'admin', need: true,  desc: '예약 취소 — 환불 송금 필요' },
  'admin.diningConsult':  { to: 'admin', need: false, desc: '다이닝 장소 미정으로 완료 — 디렉터 추천·예약 도움 필요' },
  'admin.refundAcct':     { to: 'admin', need: true,  desc: '환불 계좌 입력됨 — 송금 처리 필요' },
  'admin.dailyBrief':     { to: 'admin', need: false, desc: '아침 운영 브리핑(오늘 상담·처리할 일 요약)' },
  // ── 고객: 행동 필요 ──
  'cust.consultConfirmed':{ to: 'customer', need: false, desc: '상담 확정' },
  'cust.timeProposed':    { to: 'customer', need: true,  desc: '상담 시간 변경 제안 — 수락 필요' },
  'cust.fittingRequest':  { to: 'customer', need: true,  desc: '시착 동의 요청 — 서명 필요' },
  'cust.contractArrived': { to: 'customer', need: true,  desc: '계약서 도착 — 72시간 내 서명' },
  'cust.balanceDue':      { to: 'customer', need: true,  desc: '잔금 안내(기한 도래) — 입금' },
  'cust.balancePre':      { to: 'customer', need: false, desc: '잔금 사전 안내(기한 전 리마인드)' },
  'cust.midDue':          { to: 'customer', need: true,  desc: '중도금 안내(기한 도래) — 입금' },
  'cust.midPre':          { to: 'customer', need: false, desc: '중도금 사전 안내(기한 전 리마인드)' },
  'cust.resultDelivered': { to: 'customer', need: true,  desc: '결과물 전달 — 다운로드' },
  'cust.consultDone':     { to: 'customer', need: true,  desc: '상담 완료 · 마이페이지에서 계약 진행 요청(예식일·정보 입력) · 카톡+메일' },
  'cust.depositToProduction':{ to: 'customer', need: true, desc: '계약금 입금 확인 + 다음 단계 안내(시그=제작 정보 입력 / 스냅=촬영 준비) · 2026-06-23 신규' },
  // ── 고객: 안내성 — off:true는 발송 안 함(2026-06-12 사용자 결정: '없으면 진행 막히는 알림'만 유지 · 줄 지우면 즉시 복구) ──
  'cust.paymentConfirmed':{ to: 'customer', need: false, off: true, desc: '입금 확인됨' },
  'cust.cashReceiptIssued':{ to: 'customer', need: false, off: true, desc: '현금영수증 발행됨' },
  'cust.holdGranted':     { to: 'customer', need: false, off: true, desc: '예식일 임시고정 승인됨' },
  'cust.changeConfirmed': { to: 'customer', need: false, desc: '예식일 변경 적용됨(2026-06-23 켬 · 요청 결과 통보)' },
  'cust.changeDeclined':  { to: 'customer', need: true,  desc: '예식일 변경 거절됨 — 재조율 필요' },
  'cust.holdExpiring':    { to: 'customer', need: true,  desc: '임시고정 만료 임박(D-3) — 상담/연장 안내' },
  'cust.holdReleased':    { to: 'customer', need: false, off: true, desc: '예식일 임시고정 해제됨' },
  'cust.consultDayBefore':{ to: 'customer', need: false, desc: '상담 하루 전 안내' },
  'cust.archiveExpiring': { to: 'customer', need: true,  off: true, desc: '결과물 보관 만료 임박 · 다운로드 안내(2026-06-23 카톡 끔 · 메일로만 = sendArchiveExpiryNotices가 메일 발송)' }
};

/**
 * 알림 훅 — 여정 각 시점에서 호출. 절대 throw 하지 않음(본 흐름 보호).
 * @param {string} event  NOTIFY_EVENTS 키
 * @param {string} code   고객 개인코드(고객 알림 시 수신번호 조회용 · 관리자 알림 시 참고)
 * @param {Object=} extra 부가정보(금액·D-day·이름 등) — 문구 변수용
 */
function notifyKakao(event, code, extra) {
  try {
    var meta = NOTIFY_EVENTS[event];
    if (!meta) { if (NOTIFY.LOG) Logger.log('[notifyKakao] ⚠️ 미등록 이벤트: ' + event); return; }
    if (meta.off) { if (NOTIFY.LOG) Logger.log('[notifyKakao] 발송 안 함(off · 2026-06-12 사용자 결정): ' + event); return; }
    if (NOTIFY.LOG) {
      Logger.log('[notifyKakao] ' + event + ' → ' + meta.to + (meta.need ? '(행동필요)' : '(안내)')
        + ' · ' + (code || '-') + (extra ? (' · ' + _safeJson(extra)) : ''));
    }
    if (!_notifyEnabled()) return;        // 발송 OFF — 로그만 남기고 종료
    _kakaoSend(meta.to, event, code, extra);
    try { _nfMaybeBalanceCheck(); } catch (e) {}   // 발송 활동 시 시간당 1회 잔액 점검 → 0 되기 전 빠른 경고
  } catch (e) {
    try { Logger.log('[notifyKakao] 예외(무시): ' + (e && e.message)); } catch (_) {}
  }
}

// ============================ 발송부 (솔라피) ============================

function _nfProps() {
  var p = PropertiesService.getScriptProperties();
  var tpls = {};
  try { tpls = JSON.parse(p.getProperty('KAKAO_TEMPLATES') || '{}'); } catch (e) { tpls = {}; }
  return {
    key: String(p.getProperty('SOLAPI_API_KEY') || '').trim(),
    secret: String(p.getProperty('SOLAPI_API_SECRET') || '').trim(),
    sender: String(p.getProperty('SOLAPI_SENDER') || '').replace(/[^0-9]/g, ''),
    pfId: String(p.getProperty('SOLAPI_PF_ID') || '').trim(),
    adminPhone: String(p.getProperty('ADMIN_PHONE') || '').replace(/[^0-9]/g, ''),
    templates: tpls
  };
}

/**
 * 실제 발송 — admin=SMS / customer=알림톡(템플릿 있으면)→SMS 대체.
 * notifyKakao의 try 안에서만 호출되므로 여기서 예외가 나도 본 흐름은 안전.
 * opts.skipHold=true 면 야간 보류를 건너뛰고 즉시 발송(아침 플러시·테스트용).
 */
function _kakaoSend(to, event, code, extra, opts) {
  var cfg = _nfProps();
  if (!cfg.key || !cfg.secret || !cfg.sender) { Logger.log('[notify] 설정 누락(SOLAPI_API_KEY/SECRET/SENDER) — 발송 생략'); return; }

  if (to === 'admin') {
    // [관리자 알림 최소화 · 2026-06-11] 행동 게이트(need:true)만 알림 — 관리자가 페이지에서 처리해야
    // 고객 진행이 풀리는 일만. 안내성(서명완료·보정본선택·다이닝·브리핑 등)은 아침보고·관리자 페이지로 충분.
    // [메일 전용 전환 · 2026-06-29] 문자비 0 — 관리자 알림은 SMS 대신 메일로(운영자 개인메일 cc). 이 메일에 폰 알람을 걸면 즉시 확인.
    var meta = NOTIFY_EVENTS[event] || {};
    if (meta.need !== true && !_adminInfoOn()) { Logger.log('[notify] 관리자 안내성 알림 생략(need:false): ' + event); return; }
    if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail(_nfAdminText(event, code, extra));
    return;
  }

  // [야간 보류] 고객 알림은 21시~익일 8시엔 보류 큐로 적재 → 아침 8시 트리거가 발송(정보성이라도 새벽 카톡 방지). 관리자 알림은 즉시.
  if (!(opts && opts.skipHold) && _nfIsNight()) { _nfHoldPush(event, code, extra); return; }

  // customer — 개인코드로 연락처·이름 조회
  var cust = null;
  try { cust = findCustomerByCode(String(code || '').trim()); } catch (e) {}
  if (!cust) { Logger.log('[notify] 고객 조회 실패: ' + code + ' — 발송 생략'); return; }
  var phone = String(cust.get('연락처') || '').replace(/[^0-9]/g, '');
  if (!/^01[016789][0-9]{7,8}$/.test(phone)) { Logger.log('[notify] 연락처 형식 아님(' + code + ') — 발송 생략'); return; }
  var name = _nfCoupleName(cust);

  // 상품별 단어 — 스냅은 '상담'→'촬영', '예식'→'촬영' (확정·D-1·제안·잔금 문구가 두 상품 공용이라 단어만 분기)
  extra = extra || {};
  if (extra.snap == null) { try { extra.snap = (String(cust.get('상품타입') || '').trim() === '웨딩스냅'); } catch (e) { extra.snap = false; } }

  var m = _nfCustomerMsg(event, name, extra);   // { vars, text }
  if (!m) { Logger.log('[notify] 문구 미정의 이벤트: ' + event + ' — 발송 생략'); return; }

  // [SMS 미사용 · 2026-06-29] 고객 알림은 카톡(알림톡) + 이메일만. SMS는 안 보냄 → 발신번호(개인번호) 화면 노출 0.
  //   알림톡에 disableSms:true → 카톡 실패해도 SMS 대체발송 안 함. from은 솔라피 식별용(고객 비노출).
  var tplId = String(cfg.templates[event] || '').trim();
  var sentKakao = false;
  if (tplId && cfg.pfId) {
    var msg = { to: phone, from: cfg.sender, text: m.text,
      kakaoOptions: { pfId: cfg.pfId, templateId: tplId, variables: m.vars, disableSms: true } };
    var sent = _solapiSend(cfg, msg, { code: String(code || '').trim(), event: event });
    sentKakao = (sent !== false);
  }
  // 이메일: 카톡을 못 보낸 경우(템플릿 미승인 → 솔라피 미발송 · 또는 전송 실패)에만 발송 = '실패 시에만'.
  //   카톡이 정상 발송되면 이메일은 보내지 않음(중복 없음). 요즘 거의 다 카톡을 써서 카톡으로 사실상 전원 도달.
  //   consultDone·resultDelivered는 admin.gs에서 이미 메일 → 중복 방지로 제외.
  try {
    var emailedElsewhere = (event === 'cust.consultDone' || event === 'cust.resultDelivered');
    var custEmail = String(cust.get('이메일') || '').trim();
    if (custEmail && custEmail.indexOf('@') > 0 && !emailedElsewhere && !sentKakao) {
      _nfCustomerEmailFallback(custEmail, name, event, m.text);
    }
  } catch (e) {}
}

// 솔라피 v4 단건 발송 — HMAC-SHA256 인증.
//   실패는 고객 처리이력에 '[알림] … 발송 실패'로 남겨 상세에서 보이게(잔액 부족·번호 오류를 운영자가 알 수 있게).
//   성공 이력 전체는 솔라피 콘솔 > 메시지 로그에서 조회.
function _solapiSend(cfg, message, ctx) {
  try {
    var date = new Date().toISOString();
    var salt = Utilities.getUuid().replace(/-/g, '');
    var sigBytes = Utilities.computeHmacSha256Signature(date + salt, cfg.secret);
    var signature = sigBytes.map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    var resp = UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send', {
      method: 'post',
      contentType: 'application/json',
      headers: { Authorization: 'HMAC-SHA256 apiKey=' + cfg.key + ', date=' + date + ', salt=' + salt + ', signature=' + signature },
      payload: JSON.stringify({ message: message }),
      muteHttpExceptions: true
    });
    var codeN = resp.getResponseCode();
    if (codeN >= 200 && codeN < 300) {
      Logger.log('[notify] 발송 OK → ' + message.to + (message.kakaoOptions ? ' (알림톡)' : ' (SMS)'));
      try { _solapiLogSend(message); } catch (e) {}   // 발송 건수 집계용(관리자 💰 문자비)
      try { if (ctx && ctx.code) _nfTrackSend(resp, ctx, message); } catch (e) {}   // 전달결과 웹훅 매칭용 messageId↔code 기록(고객 알림톡)
      return true;
    }
    Logger.log('[notify] 발송 실패 HTTP ' + codeN + ' · ' + String(resp.getContentText()).slice(0, 300));
    _notifyFailMark(ctx, 'HTTP ' + codeN);
    return false;
  } catch (e) {
    Logger.log('[notify] 발송 예외: ' + (e && e.message));
    _notifyFailMark(ctx, (e && e.message) || '예외');
    return false;
  }
}

// 고객 알림 실패 → 처리이력 기록 + 일별 실패 카운터(아침 브리핑 집계용). 베스트에포트 · 본 흐름 절대 불간섭.
function _notifyFailMark(ctx, why) {
  try {
    if (ctx && ctx.code && typeof _recordHandler === 'function') {
      _recordHandler(ctx.code, '[알림] ' + (ctx.event || '') + ' 발송 실패 · ' + String(why || '').slice(0, 80));
    }
  } catch (e) {}
  try {
    var p = PropertiesService.getScriptProperties();
    var k = 'NOTIFY_FAIL_' + _kstYmd(new Date());
    p.setProperty(k, String((Number(p.getProperty(k)) || 0) + 1));
    // 그날 첫 실패면 관리자에게 GAS 메일 1통(솔라피 안 거침). 나머지 실패는 아침 브리핑에 집계.
    var mk = 'NOTIFY_FAILMAIL_' + _kstYmd(new Date());
    if (!p.getProperty(mk)) {
      p.setProperty(mk, '1');
      _nfAdminEmail('[Moment Edit] 고객 알림 발송 실패 감지',
        '오늘 고객 알림 발송 실패가 감지됐어요.<br>'
        + '항목: ' + ((ctx && ctx.event) || '-') + (ctx && ctx.code ? (' · ' + ctx.code) : '') + '<br>'
        + '사유: ' + String(why || '').slice(0, 120) + '<br>'
        + '솔라피 잔액·발신번호·수신번호를 확인해 주세요. 이후 실패 건수는 내일 아침 브리핑에 집계됩니다.');
    }
  } catch (e2) {}
}

// 어제 알림 실패 건수(아침 브리핑용) — 읽는 김에 7일 지난 카운터 키 정리
function notifyFailYesterday() {
  try {
    var p = PropertiesService.getScriptProperties();
    var yd = _shiftYmd(_kstYmd(new Date()), -1);
    var n = Number(p.getProperty('NOTIFY_FAIL_' + yd)) || 0;
    var all = p.getProperties();
    for (var k in all) {
      if (k.indexOf('NOTIFY_FAIL_') === 0) {
        var d = k.slice('NOTIFY_FAIL_'.length);
        if (_shiftYmd(d, 7) < _kstYmd(new Date())) p.deleteProperty(k);
      }
    }
    return n;
  } catch (e) { return 0; }
}

// ============================ 야간 보류 ============================
// 21:00~익일 07:59(KST) 사이의 고객 알림은 보류 큐(Script Property JSON)에 쌓고, 아침 8시 트리거가 발송.
function _nfIsNight() {
  var h = Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'H'));
  return h >= 21 || h < 8;
}
function _nfHoldPush(event, code, extra) {
  var lock = null;
  try { lock = LockService.getScriptLock(); lock.waitLock(5000); } catch (e) { lock = null; }
  try {
    var p = PropertiesService.getScriptProperties();
    var arr = [];
    try { arr = JSON.parse(p.getProperty('NOTIFY_HOLD') || '[]'); } catch (e) { arr = []; }
    if (arr.length >= 200) { Logger.log('[notify] 보류 큐 초과 — 폐기: ' + event); return; }
    arr.push({ e: event, c: String(code || ''), x: extra || null, at: fmtKST(new Date()) });
    p.setProperty('NOTIFY_HOLD', JSON.stringify(arr));
    Logger.log('[notify] 야간 보류 적재(아침 8시 발송): ' + event + ' · ' + code);
  } catch (e2) {
    Logger.log('[notify] 보류 적재 실패: ' + (e2 && e2.message));
  } finally { try { if (lock) lock.releaseLock(); } catch (e3) {} }
}
// [트리거·매일 8시] 보류 알림 발송 — 큐를 비우고 순차 발송(개별 실패는 _notifyFailMark가 기록, 재적재 없음)
function flushHeldNotifies() {
  // [버그수정 2026-06-28] OFF면 큐를 비우지 말고 그대로 유지 — 예전엔 큐를 먼저 지우고 OFF면 폐기라
  //   발송 OFF 상태로 아침이 오면 밤사이 보류된 고객 알림이 영구 소실됐다. 다시 켜지면 그때 발송.
  if (!_notifyEnabled()) { Logger.log('flushHeldNotifies: NOTIFY_ENABLED OFF — 보류 큐 유지(미발송)'); return; }
  var lock = null, arr = [];
  try { lock = LockService.getScriptLock(); lock.waitLock(15000); } catch (e) { lock = null; }
  try {
    var p = PropertiesService.getScriptProperties();
    try { arr = JSON.parse(p.getProperty('NOTIFY_HOLD') || '[]'); } catch (e) { arr = []; }
    p.deleteProperty('NOTIFY_HOLD');
  } finally { try { if (lock) lock.releaseLock(); } catch (e2) {} }
  if (!arr.length) { Logger.log('flushHeldNotifies: 보류 0건'); return; }
  arr.forEach(function (it) {
    try { _kakaoSend('customer', it.e, it.c, it.x, { skipHold: true }); } catch (e) {}
  });
  Logger.log('flushHeldNotifies: ' + arr.length + '건 발송 시도 완료');
}

// ============================ 문구 빌더 ============================
// 알림톡 변수(vars)는 automation/알림톡_템플릿_신청문안.md 의 #{변수명}과 1:1.
// text는 템플릿 미승인·알림톡 실패 시 나가는 SMS 문구(자유 문구).

function _nfCoupleName(cust) {
  var g = String(cust.get('신랑이름') || '').trim(), b = String(cust.get('신부이름') || '').trim();
  return (g && b) ? (g + '·' + b) : (g || b || '고객');
}
function _nfDate(ymd) {   // '2026-06-17' → '2026년 6월 17일'
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
  return m ? (m[1] + '년 ' + Number(m[2]) + '월 ' + Number(m[3]) + '일') : String(ymd || '');
}
function _nfWon(n) {
  var v = Number(String(n == null ? 0 : n).replace(/[,원\s]/g, ''));   // 시트 문자 금액('300,000원') 방어 · 못 읽으면 0 (고객 문자 'NaN원' 방지)
  if (!isFinite(v)) v = 0;
  return v.toLocaleString ? v.toLocaleString('ko-KR') : String(v);
}
// 디데이 표기 방어 — 정상 0 이상 정수만 'D-N', 그 외(음수=예식일 과거 오입력 · null · NaN)는 '예정'. (고객 문자 'D--3'·'D-NaN' 방지)
function _nfDday(d) { return (typeof d === 'number' && isFinite(d) && d >= 0) ? ('D-' + d) : '예정'; }

var NF_MYPAGE = 'momentedit.kr/mypage.html';

function _nfCustomerMsg(event, name, x) {
  x = x || {};
  var d;
  switch (event) {
    case 'cust.consultConfirmed':
      d = _nfDate(x.date) + (x.time ? (' ' + x.time) : '');
      return { vars: { '#{이름}': name, '#{유형}': (x.snap ? '촬영' : '상담'), '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, ' + (x.snap ? '촬영' : '상담') + ' 일정이 확정되었습니다(' + d + '). 이 시간은 두 분만을 위해 비워둡니다. 변경은 마이페이지에서 가능해요. ' + NF_MYPAGE };
    case 'cust.consultDayBefore':
      d = _nfDate(x.date) + (x.time ? (' ' + x.time) : '');
      return { vars: { '#{이름}': name, '#{유형}': (x.snap ? '촬영' : '상담'), '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 내일 ' + d + ' ' + (x.snap ? '촬영' : '상담') + '이 예정되어 있어요. 편안히 오시면 됩니다. 내일 뵙겠습니다.' };
    case 'cust.timeProposed':
      d = _nfDate(x.date) + (x.time ? (' ' + x.time) : '');
      return { vars: { '#{이름}': name, '#{유형}': (x.snap ? '촬영' : '상담'), '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, ' + (x.snap ? '촬영' : '상담') + ' 시간 변경을 제안드렸어요(' + d + '). 마이페이지에서 수락하시거나 더 편한 시간을 선택해 주세요. 확인해 주시면 바로 확정해 드릴게요. ' + NF_MYPAGE };
    case 'cust.consultDone':
      return { vars: { '#{이름}': name },
        text: '[모먼트에디트] ' + name + '님, 상담에 함께해 주셔서 감사합니다. 다음 단계로 마이페이지에서 예식일과 기본 정보를 입력해 계약 진행을 요청해 주세요. 확인 후 이용계약서를 보내드립니다. ' + NF_MYPAGE };
    case 'cust.depositToProduction':
      // 상품별 다음 안내가 달라 #{안내} 변수로 분기(알림톡 T18 · SMS 대체문구는 동일 결과)
      var depGuide = x.snap
        ? '이제 촬영 준비를 시작할게요. 일정에 맞춰 차근차근 안내드리겠습니다.'
        : '다음 단계로 마이페이지에서 제작 정보를 입력해 주세요. 입력해 주시면 제작이 시작됩니다.';
      return { vars: { '#{이름}': name, '#{안내}': depGuide },
        text: '[모먼트에디트] ' + name + '님, 계약금 입금이 확인되었습니다. ' + depGuide + ' ' + NF_MYPAGE };
    case 'cust.fittingRequest':
      return { vars: { '#{이름}': name },
        text: '[모먼트에디트] ' + name + '님, 드레스 시착 동의서가 도착했어요. 시착은 기본 2벌까지 포함이에요. 마이페이지에서 확인 후 서명해 주세요. 서명 후 시착이 진행됩니다. ' + NF_MYPAGE };
    case 'cust.contractArrived':
      return { vars: { '#{이름}': name },
        text: '[모먼트에디트] ' + name + '님, 이용계약서가 도착했어요. 안내드린 내용 그대로 담았습니다. 72시간 안에 마이페이지에서 차분히 확인 후 서명해 주세요(기한 경과 시 자동 파기). ' + NF_MYPAGE };
    case 'cust.paymentConfirmed':
      return { vars: { '#{이름}': name, '#{항목}': String(x.kind || '결제') },
        text: '[모먼트에디트] ' + name + '님, ' + String(x.kind || '결제') + ' 입금이 확인되었습니다. 감사합니다. 받은 마음 그대로 정성껏 준비하겠습니다. 내역은 마이페이지에서 확인하실 수 있어요. ' + NF_MYPAGE };
    case 'cust.cashReceiptIssued':
      return { vars: { '#{이름}': name, '#{항목}': String(x.kind || ''), '#{금액}': _nfWon(x.amount) },
        text: '[모먼트에디트] ' + name + '님, ' + String(x.kind || '') + ' 현금영수증(' + _nfWon(x.amount) + '원)이 발행되었습니다. 승인번호와 발행 내역은 마이페이지에서 확인하실 수 있어요. ' + NF_MYPAGE };
    case 'cust.midPre':
    case 'cust.midDue':
      return { vars: { '#{이름}': name, '#{디데이}': String(x.dday != null ? x.dday : '') },
        text: '[모먼트에디트] ' + name + '님, 중도금 일정을 안내드립니다(예식 ' + _nfDday(x.dday) + '). 금액과 계좌는 마이페이지에 정리해 두었어요. 입금자명을 남겨주시면 확인이 더 빨라요. ' + NF_MYPAGE };
    case 'cust.balancePre':
    case 'cust.balanceDue':
      return { vars: { '#{이름}': name, '#{행사}': (x.snap ? '촬영' : '예식'), '#{디데이}': String(x.dday != null ? x.dday : '') },
        text: '[모먼트에디트] ' + name + '님, 잔금 일정을 안내드립니다(' + (x.snap ? '촬영' : '예식') + ' ' + _nfDday(x.dday) + '). 남은 준비는 저희가 차근차근 마무리하고 있습니다. 금액과 계좌는 마이페이지에서 확인해 주세요. ' + NF_MYPAGE };
    case 'cust.resultDelivered':
      return { vars: { '#{이름}': name },
        text: '[모먼트에디트] ' + name + '님, 두 분의 시간이 담긴 결과물이 준비되었습니다. 전달일부터 6개월 보관되니 마이페이지에서 다운로드해 꼭 옮겨 보관해 주세요. ' + NF_MYPAGE };
    case 'cust.holdGranted':
      d = _nfDate(x.date) + (x.slot ? (' ' + x.slot) : '');
      return { vars: { '#{이름}': name, '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 예식일 임시고정(' + d + ')이 승인되었습니다. 14일 동안 이 자리는 두 분을 위해 비워둡니다. 상담에서 확정하시면 그대로 이어져요. ' + NF_MYPAGE };
    case 'cust.holdReleased':
      d = _nfDate(x.date) + (x.slot ? (' ' + x.slot) : '');
      return { vars: { '#{이름}': name, '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 예식일 임시고정(' + d + ')이 해제되었습니다. 마음이 정해지시면 마이페이지에서 언제든 다시 요청하실 수 있어요. ' + NF_MYPAGE };
    case 'cust.holdExpiring':
      d = _nfDate(x.date) + (x.slot ? (' ' + x.slot) : '');
      return { vars: { '#{이름}': name, '#{일시}': d, '#{남은일}': String(x.left != null ? x.left : '') },
        text: '[모먼트에디트] ' + name + '님, 예식일 임시고정(' + d + ') 만료가 ' + (x.left != null ? (x.left + '일') : '곧') + ' 남았어요. 기간이 지나면 자리는 자동으로 풀립니다. 상담을 확정하시면 그대로 유지돼요. ' + NF_MYPAGE };
    case 'cust.changeConfirmed':
      d = _nfDate(x.date) + (x.slot ? (' ' + x.slot) : '');
      return { vars: { '#{이름}': name, '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 요청하신 예식일 변경이 적용되었습니다. 새 일시는 ' + d + '입니다. 이후 안내는 새 날짜 기준으로 정리해 두었어요. ' + NF_MYPAGE };
    case 'cust.changeDeclined':
      return { vars: { '#{이름}': name, '#{사유}': String(x.reason || '요청하신 일정 진행이 어려워요') },
        text: '[모먼트에디트] ' + name + '님, 죄송하게도 요청하신 예식일 변경을 진행하지 못했습니다. 마이페이지에서 다른 일정으로 다시 요청하실 수 있어요. 가능한 방향을 함께 찾아보겠습니다. ' + NF_MYPAGE };
    case 'cust.archiveExpiring':
      return { vars: { '#{이름}': name, '#{만료일}': _nfDate(x.expires) },
        text: '[모먼트에디트] ' + name + '님, 결과물 보관 기간이 ' + _nfDate(x.expires) + '에 끝나요. 만료 후에는 파일이 삭제될 수 있어요. 마이페이지에서 미리 다운로드해 주세요. ' + NF_MYPAGE };
    default:
      return null;
  }
}

// 관리자 SMS — 짧고 행동 중심(템플릿 승인 불필요)
function _nfAdminText(event, code, x) {
  x = x || {};
  var tag = '[모먼트에디트]';
  var c = code ? (' · ' + code) : '';
  switch (event) {
    case 'admin.newSignup':      return tag + ' 신규 신청 ' + (x.names || '') + ' (' + (x.product || '') + ')' + c + ' / 일정 잡기';
    case 'admin.slotPicked':     return tag + ' 상담 슬롯 선택 ' + (x.names || '') + ' ' + (x.date || '') + ' ' + (x.time || '') + c + ' / 승인 필요';
    case 'admin.contractReq':    return tag + ' 계약서 요청' + c + ' (예식 ' + (x.weddingDate || '-') + ') / 발송 필요';
    case 'admin.depositSignal':  return tag + ' 계약금 입금신호' + c + ' (입금자 ' + (x.payer || '-') + ') / 확인 필요';
    case 'admin.midSignal':      return tag + ' 중도금 입금신호' + c + ' (입금자 ' + (x.payer || '-') + (x.withBalance ? ' · 잔금 동시' : '') + ') / 확인 필요';
    case 'admin.balanceSignal':  return tag + ' 잔금 입금신호' + c + ' (입금자 ' + (x.payer || '-') + ') / 확인 필요';
    case 'admin.holdRequest':    return tag + ' 임시고정 요청' + c + ' ' + (x.date || '') + ' ' + (x.slot || '') + ' / 승인·거절';
    case 'admin.changeRequest':  return tag + ' 예식일 변경 요청' + c + ' ' + (x.from || '') + ' → ' + (x.to || '') + (x.fee ? (' · 수수료 ' + _nfWon(x.fee) + '원(입금자 ' + (x.payer || '-') + ')') : ' · 무상') + ' / 확인 필요';
    case 'admin.fittingSigned':  return tag + ' 시착 동의 서명 완료' + c + ' / 상담완료 처리';
    case 'admin.contractSigned': return tag + ' 계약 서명 완료' + c + ' (' + (x.product || '') + ')';
    case 'admin.resultPicked':   return tag + ' 보정본 선택 완료' + c + ' (' + (x.count || 0) + '컷) / 작업 착수';
    case 'admin.extraSignal':    return tag + ' 추가보정 입금신호' + c + ' (입금자 ' + (x.payer || '-') + ') / 확인 필요';
    case 'admin.cancelRefund':   return tag + ' 예약 취소 ' + (x.names || '') + c + ' / 환불 송금 필요' + (x.acct ? (' (' + x.acct + ')') : '');
    case 'admin.diningConsult':  return tag + ' 다이닝: 식당을 못 정한 채 마무리' + c + ' / 디렉터가 추천·예약 도와줄 것';
    case 'admin.refundAcct':     return tag + ' 환불 계좌 입력 ' + (x.names || '') + c + (x.acct ? (' (' + x.acct + ')') : '') + ' / 송금 처리';
    case 'admin.dailyBrief':     return tag + ' 오늘 브리핑 / 처리할 일 ' + (x.total != null ? x.total : '-') + '건(긴급 ' + (x.urgent != null ? x.urgent : '-') + ') · 오늘 상담 ' + (x.consults != null ? x.consults : '-') + '건' + (Number(x.fail) > 0 ? (' · 알림실패 ' + x.fail + '건') : '');
    default:                     return tag + ' 알림 ' + event + c;
  }
}

// ============================ 점검·테스트 ============================

// 1) 설정 점검 — 발송 없이 현재 설정 상태만 로그로 출력 (실행 후 Ctrl+Enter 로그 확인)
function notifySetupCheck() {
  var cfg = _nfProps();
  Logger.log('NOTIFY_ENABLED = ' + _notifyEnabled());
  Logger.log('SOLAPI_API_KEY = ' + (cfg.key ? '설정됨(' + cfg.key.slice(0, 4) + '…)' : '❌ 없음'));
  Logger.log('SOLAPI_API_SECRET = ' + (cfg.secret ? '설정됨' : '❌ 없음'));
  Logger.log('SOLAPI_SENDER = ' + (cfg.sender || '❌ 없음(발신번호 사전등록 필요)'));
  Logger.log('SOLAPI_PF_ID = ' + (cfg.pfId || '(없음 — 알림톡 미사용, 전부 SMS로 발송)'));
  Logger.log('ADMIN_PHONE = ' + (cfg.adminPhone || '❌ 없음(관리자 알림 불가)'));
  Logger.log('ADMIN_NOTIFY_INFO = ' + (_adminInfoOn() ? 'true(안내성 알림도 발송)' : '(기본 — 행동 게이트만 발송)'));
  var keys = Object.keys(cfg.templates);
  Logger.log('KAKAO_TEMPLATES = ' + keys.length + '건 등록' + (keys.length ? (' (' + keys.join(', ') + ')') : ' — 전부 SMS로 발송됨'));
}

// 2) 관리자 SMS 테스트 — ADMIN_PHONE으로 1건 실발송(요금 발생)
function notifyTestAdminSms() {
  var cfg = _nfProps();
  if (!cfg.key || !cfg.secret || !cfg.sender) { Logger.log('SOLAPI 설정 누락 — notifySetupCheck() 먼저'); return; }
  if (!cfg.adminPhone) { Logger.log('ADMIN_PHONE 미설정'); return; }
  _solapiSend(cfg, { to: cfg.adminPhone, from: cfg.sender, text: '[모먼트에디트] 알림 연동 테스트입니다. 이 문자가 보이면 SMS 연동 성공!' });
}

// 3) 고객 발송 테스트 — 개인코드로 상담확정 문구 1건 실발송(본인 명의 테스트 고객 코드로 권장 · 야간 보류 무시하고 즉시)
function notifyTestCustomerByCode(code) {
  _kakaoSend('customer', 'cust.consultConfirmed', String(code || ''), { date: '2026-06-17', time: '19:30' }, { skipHold: true });
}

// 고객 메일 1통(best-effort) — 중요 시점(상담완료·결과물전달 등)에 카톡과 함께 메일도 보낸다.
//   emailShell·centerP·emailBtn·smallP·esc·SYS·P 는 같은 GAS 프로젝트(consultation-booking·00_platform-config)의 것을 재사용.
//   발송 실패는 본 흐름(상담완료·전달 처리)을 절대 막지 않는다 — 호출부도 try 안에서 부른다.
function _notifyCustomerEmail(code, subject, headline, innerHtml) {
  try {
    var cust = findCustomerByCode(String(code || '').trim());
    if (!cust) { Logger.log('[notify] 고객 메일 — 고객 조회 실패: ' + code); return; }
    var to = String(cust.get('이메일') || '').trim();
    if (!to || to.indexOf('@') < 0) { Logger.log('[notify] 고객 메일 — 이메일 없음/형식오류: ' + code); return; }
    if (typeof emailShell !== 'function') { Logger.log('[notify] 고객 메일 — emailShell 미정의'); return; }
    GmailApp.sendEmail(to, subject, '', { htmlBody: emailShell(headline, innerHtml), name: (typeof SYS !== 'undefined' ? SYS.FROM_NAME : 'Moment Edit') });
    Logger.log('[notify] 고객 메일 발송 → ' + to + ' · ' + subject);
  } catch (e) { try { Logger.log('[notify] 고객 메일 실패(무시): ' + (e && e.message)); } catch (_) {} }
}

// ============================ 관리자 잔액·실패 경고 (GAS 이메일 · 솔라피 무관) ============================
// 솔라피를 거치지 않는 GAS(Gmail) 메일이라 잔액이 0이어도 경고는 나간다(역설 해결).
//   notifyBalanceCheck() — 매일 1회(aiDaily가 호출) 잔액이 임계 이하면 관리자 메일 경고.
//   _notifyFailMark() — 발송 실패 첫 건이면 그날 1통 관리자 메일 경고(나머지는 아침 브리핑 집계).
// 설정(스크립트 속성): SOLAPI_LOW_BALANCE(임계 원화·기본 5000) · ADMIN_ALERT_EMAIL(없으면 CONFIG.ADMIN_EMAIL→contact@momentedit.kr)

// 솔라피 잔액(원) 조회 — 실패 시 null. _solapiSend와 같은 HMAC-SHA256 인증.
function _solapiBalance() {
  try {
    var p = PropertiesService.getScriptProperties();
    var key = String(p.getProperty('SOLAPI_API_KEY') || '').trim();
    var secret = String(p.getProperty('SOLAPI_API_SECRET') || '').trim();
    if (!key || !secret) return null;
    var date = new Date().toISOString();
    var salt = Utilities.getUuid().replace(/-/g, '');
    var sig = Utilities.computeHmacSha256Signature(date + salt, secret)
      .map(function (b) { return ('0' + (b & 0xFF).toString(16)).slice(-2); }).join('');
    var resp = UrlFetchApp.fetch('https://api.solapi.com/cash/v1/balance', {
      method: 'get',
      headers: { Authorization: 'HMAC-SHA256 apiKey=' + key + ', date=' + date + ', salt=' + salt + ', signature=' + sig },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() >= 200 && resp.getResponseCode() < 300) {
      var j = JSON.parse(resp.getContentText());
      var bal = Number(j.balance != null ? j.balance : j.point);
      return isFinite(bal) ? bal : null;
    }
    Logger.log('[notify] 잔액조회 HTTP ' + resp.getResponseCode());
  } catch (e) { Logger.log('[notify] 잔액조회 예외: ' + (e && e.message)); }
  return null;
}

// 매일 1회(aiDaily가 호출) — 잔액이 임계 이하면 관리자 GAS 메일 1통(하루 1통 제한).
function notifyBalanceCheck() {
  try {
    var p = PropertiesService.getScriptProperties();
    var thr = Number(p.getProperty('SOLAPI_LOW_BALANCE')) || 3000;   // 자동충전 임계(5000)보다 낮게 → 자동충전 실패 시에만(헛경고X), 0 전에 버퍼 두고 경고
    var bal = _solapiBalance();
    if (bal == null) return;
    Logger.log('[notify] 솔라피 잔액 = ' + bal + '원 (임계 ' + thr + ')');
    if (bal >= thr) return;
    var k = 'SOLAPI_BAL_WARN_' + _kstYmd(new Date());
    if (p.getProperty(k)) return;           // 하루 1통
    // [중복 억제] 오늘 '발송 실패' 경고 메일이 이미 갔으면(대개 잔액부족이 원인) 잔액경고는 생략 — 같은 날 같은 취지 2통 방지
    if (p.getProperty('NOTIFY_FAILMAIL_' + _kstYmd(new Date()))) { p.setProperty(k, '1'); Logger.log('[notify] 잔액경고 생략(오늘 실패경고 이미 발송)'); return; }
    p.setProperty(k, '1');
    _nfAdminEmail('[Moment Edit] 솔라피 잔액 부족 경고',
      '솔라피 잔액이 ' + _nfWon(bal) + '원으로 임계(' + _nfWon(thr) + '원) 아래입니다.<br>'
      + '충전하지 않으면 고객 알림(카톡·문자)이 발송되지 않을 수 있어요.<br>'
      + '솔라피 콘솔에서 충전하거나 자동충전 설정을 확인해 주세요.');
  } catch (e) { Logger.log('[notify] 잔액경고 실패: ' + (e && e.message)); }
}

// 관리자 GAS 메일 1통(best-effort) — 솔라피 안 거침. 운영자 개인메일(ADMIN_CC)도 함께 받게 cc.
//   [2026-06-29] 관리자 알림을 '메일 전용'으로 전환 — 문자비 0. 이 메일에 폰 알림(알람)을 걸어두면 즉시 확인 가능.
function _nfAdminEmail(subject, bodyHtml, opts) {
  try {
    var p = PropertiesService.getScriptProperties();
    var to = String(p.getProperty('ADMIN_ALERT_EMAIL') || '').trim()
      || ((typeof CONFIG !== 'undefined' && CONFIG.ADMIN_EMAIL) ? CONFIG.ADMIN_EMAIL : 'contact@momentedit.kr');
    var head = (opts && opts.head) ? opts.head : String(subject).replace(/^\[Moment Edit\]\s*/, '');
    // opts.raw=true면 bodyHtml을 그대로 본문에 넣음(섹션 레이아웃 등). 아니면 한 문단(centerP)으로 감쌈.
    var inner = (opts && opts.raw) ? bodyHtml : ((typeof centerP === 'function') ? centerP(bodyHtml) : ('<p>' + bodyHtml + '</p>'));
    var html = (typeof emailShell === 'function') ? emailShell(head, inner) : bodyHtml;
    var sendOpts = { htmlBody: html, name: (typeof SYS !== 'undefined' ? SYS.FROM_NAME : 'Moment Edit') };
    try { var cc = (typeof adminCc === 'function') ? adminCc() : ''; if (cc) sendOpts.cc = cc; } catch (e0) {}
    GmailApp.sendEmail(to, subject, String(bodyHtml).replace(/<[^>]+>/g, ' '), sendOpts);
    Logger.log('[notify] 관리자 메일 → ' + to + ' · ' + subject);
  } catch (e) { try { Logger.log('[notify] 관리자 메일 실패: ' + (e && e.message)); } catch (_) {} }
}

// 관리자 짧은 알림 1건을 '메일'로 — 문자 대체(메일 전용 운영). 제목은 한눈에·본문은 전체·관리자 페이지 버튼.
//   text 예: '[모먼트에디트] 신규 신청 … / 일정 잡기'  ·  '📋 새 인계: …'  ·  '🛡️ 안전점검 …'
function _nfAdminLineEmail(text) {
  try {
    var raw = String(text || '').trim();
    if (!raw) return;
    var body = raw.replace(/^\[[^\]]{1,20}\]\s*/, '');     // 앞 태그([모먼트에디트]·[AI 직원실]) 제거
    var parts = body.split(' / ');
    var head;
    if (parts.length > 1) head = parts[parts.length - 1].trim();        // 액션('일정 잡기'·'승인 필요' 등)
    else if (body.indexOf(':') > -1) head = body.split(':')[0].trim();  // '📋 새 인계'
    else head = '모먼트에디트 알림';
    var safe = (typeof esc === 'function') ? esc : function (s) { return String(s == null ? '' : s); };
    var inner = (typeof centerP === 'function') ? centerP(safe(body)) : ('<p>' + safe(body) + '</p>');
    if (typeof emailBtn === 'function') inner += emailBtn('https://momentedit.kr/admin.html', '관리자 페이지 열기');
    _nfAdminEmail('[Moment Edit] ' + body.slice(0, 60), inner, { raw: true, head: head });
  } catch (e) { try { Logger.log('[notify] 관리자 라인메일 실패: ' + (e && e.message)); } catch (_) {} }
}

// 발송 활동 시 시간당 1회 잔액 점검 → 0 되기 전 빠른 경고(일일 aiDaily 외 보조 · 하루 1통 가드는 notifyBalanceCheck가 함).
function _nfMaybeBalanceCheck() {
  try {
    var p = PropertiesService.getScriptProperties();
    var last = Number(p.getProperty('SOLAPI_BAL_CHK_AT') || 0);
    var now = new Date().getTime();
    if (now - last < 3600000) return;   // 1시간 throttle
    p.setProperty('SOLAPI_BAL_CHK_AT', String(now));
    if (typeof notifyBalanceCheck === 'function') notifyBalanceCheck();
  } catch (e) {}
}

// ============================ 전달결과 웹훅 (전달 실패 시 고객 이메일) ============================
// 알림톡은 '접수 성공(2xx)' 후 실제 전달 성공/실패가 비동기로 통보됨(솔라피 리포트 웹훅 → 이 웹앱 /exec로 POST).
//   발송 성공 시 messageId↔code↔text를 '알림톡추적' 시트에 기록 → 리포트가 '실패'면 그 고객에게 이메일(카톡 미수신 커버).
//   ★보수적: '명확한 실패'만 이메일. 성공/불명확은 발송 안 함(카톡 받은 고객에 오발송 방지). 형식은 로그로 확인·튜닝 가능.
// 설정: 솔라피 콘솔 > 설정 > 리포트(전달결과) 웹훅 URL = 이 웹앱 배포 /exec 주소.
var NF_TRACK_SHEET = '알림톡추적';
function _nfTrackSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(NF_TRACK_SHEET);
  if (!sh) { sh = ss.insertSheet(NF_TRACK_SHEET); sh.appendRow(['messageId', '시각', 'code', 'event', 'text', '상태']); sh.setFrozenRows(1); }
  return sh;
}
// 발송 성공 시 messageId 기록(고객 알림톡만 · ctx.code 있을 때). 실패 시 그대로 보낼 text도 보관.
function _nfTrackSend(resp, ctx, message) {
  var mid = '';
  try { var j = JSON.parse(resp.getContentText()); mid = String(j.messageId || (j.groupInfo && j.groupInfo.groupId) || j.groupId || '').trim(); } catch (e) {}
  if (!mid) return;
  var sh = _nfTrackSheet();
  if (sh.getLastRow() > 20000) return;
  sh.appendRow([mid, new Date(), String(ctx.code || ''), String(ctx.event || ''), String((message && message.text) || '').slice(0, 1000), '발송']);
}
// 솔라피 전달결과 리포트 처리(doPost가 배열/리포트 형태 감지 시 호출). 명확한 실패만 고객 이메일.
function handleSolapiReport(raw) {
  try {
    Logger.log('[notify] 솔라피 리포트 수신: ' + String(JSON.stringify(raw)).slice(0, 700));
    var arr = Array.isArray(raw) ? raw : [raw];
    var sh = SpreadsheetApp.getActive().getSheetByName(NF_TRACK_SHEET);
    if (!sh || sh.getLastRow() < 2) return { ok: true, emailed: 0, note: '추적 없음' };
    var rows = sh.getRange(2, 1, sh.getLastRow() - 1, 6).getValues();   // messageId,시각,code,event,text,상태
    var failKw = /fail|error|reject|undeliver|expire|실패|거부|미수신|차단|반려|오류|만료|없는/i;
    var failCodes = { '3008': 1, '3014': 1, '4040': 1, '5000': 1, '6000': 1 };   // 알려진 실패코드(테스트 후 보강)
    var okKw = /성공|완료|정상|delivered|complete|sent/i;
    var emailed = 0;
    arr.forEach(function (r) {
      try {
        var mid = String((r && (r.messageId || r.messageid || r.mid)) || '').trim();
        if (!mid) return;
        var sc = String((r && (r.statusCode || r.status)) || '').trim();
        var msg = String((r && (r.statusMessage || r.reason || r.statusMsg)) || '');
        var failed = (sc && failCodes[sc]) || failKw.test(msg);
        var success = (sc === '4000') || okKw.test(msg);
        for (var i = rows.length - 1; i >= 0; i--) {
          if (String(rows[i][0]).trim() !== mid) continue;
          var st = String(rows[i][5]).trim();
          if (st === '완료' || st === '이메일') return;   // 이미 처리
          if (failed) {
            var code = String(rows[i][2]).trim(), event = String(rows[i][3]).trim(), text = String(rows[i][4]);
            try {
              var cust = findCustomerByCode(code);
              var to = cust ? String(cust.get('이메일') || '').trim() : '';
              var name = cust ? _nfCoupleName(cust) : '';
              if (to && to.indexOf('@') > 0 && text) { _nfCustomerEmailFallback(to, name, event, text); emailed++; Logger.log('[notify] 전달실패→고객 이메일: ' + code + ' · ' + event); }
            } catch (e) {}
            sh.getRange(i + 2, 6).setValue('이메일');
          } else {
            sh.getRange(i + 2, 6).setValue(success ? '완료' : '확인');   // 불명확은 '확인'(이메일 안 함 · 후속 리포트 재처리 가능)
          }
          return;
        }
      } catch (e) {}
    });
    return { ok: true, emailed: emailed };
  } catch (e) { Logger.log('[notify] 리포트 처리 실패: ' + (e && e.message)); return { ok: false, error: (e && e.message) }; }
}
// [정리] 알림톡추적 7일 경과분 삭제 — purgeAdvisorLog(주간)가 함께 호출(별도 트리거 불필요).
function purgeNfTrack() {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(NF_TRACK_SHEET);
    if (!sh || sh.getLastRow() < 2) return;
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 7);
    var vals = sh.getRange(2, 2, sh.getLastRow() - 1, 1).getValues();   // 시각 열(append 순)
    var del = 0;
    for (var i = 0; i < vals.length; i++) { var t = vals[i][0]; if (!(t instanceof Date)) t = new Date(t); if (!isNaN(t.getTime()) && t < cutoff) del++; else break; }
    if (del > 0) { sh.deleteRows(2, del); Logger.log('purgeNfTrack: ' + del + '건 삭제'); }
  } catch (e) {}
}

// 이벤트별 메일 제목·헤드라인·버튼 라벨(브랜드 메일 다듬기). 없으면 제너릭.
var NF_EMAIL_TITLE = {
  'cust.consultConfirmed':    { subj: '상담 일정이 확정되었습니다', head: '상담이 확정되었어요' },
  'cust.consultDayBefore':    { subj: '내일 일정 안내', head: '내일 뵙겠습니다', nobtn: true },   // 리마인드 — CTA 없이 깔끔하게
  'cust.timeProposed':        { subj: '시간 변경을 제안드렸어요', head: '시간 변경 제안', btn: '시간 확인·선택' },
  'cust.fittingRequest':      { subj: '드레스 시착 동의서가 도착했어요', head: '시착 동의서가 도착했어요', btn: '동의서 확인·서명' },
  'cust.contractArrived':     { subj: '이용계약서가 도착했어요', head: '계약서가 도착했어요', btn: '계약서 확인·서명' },
  'cust.depositToProduction': { subj: '계약금 입금이 확인되었습니다', head: '계약금이 확인되었어요', btn: '다음 단계 확인' },
  'cust.midPre':              { subj: '중도금 일정을 안내드립니다', head: '중도금 안내', btn: '금액·계좌 확인' },
  'cust.midDue':              { subj: '중도금 일정을 안내드립니다', head: '중도금 안내', btn: '금액·계좌 확인' },
  'cust.balancePre':          { subj: '잔금 일정을 안내드립니다', head: '잔금 안내', btn: '금액·계좌 확인' },
  'cust.balanceDue':          { subj: '잔금 일정을 안내드립니다', head: '잔금 안내', btn: '금액·계좌 확인' },
  'cust.holdExpiring':        { subj: '예식일 임시고정 만료 안내', head: '임시고정 만료 임박', btn: '상담 확정하러 가기' },
  'cust.changeConfirmed':     { subj: '예식일 변경이 적용되었습니다', head: '예식일 변경 적용', btn: '변경 내용 확인' },
  'cust.changeDeclined':      { subj: '예식일 변경 안내', head: '예식일 변경 보류', btn: '다시 요청하기' },
  'cust.consultDone':         { subj: '상담이 마무리되었습니다', head: '상담이 마무리되었어요', btn: '계약 진행하기' },
  'cust.resultDelivered':     { subj: '결과물이 준비되었습니다', head: '결과물이 준비되었어요', btn: '결과물 확인' }
};

// 고객 알림이 카톡으로 못 나갔을 때(템플릿없음·전송실패·전달실패) 같은 내용을 '고객 이메일'로 발송.
//   SMS 문구(text)에서 태그([모먼트에디트])·끝 URL·시작 '이름님,'을 정리 → 깔끔한 본문 + 마이페이지 버튼 + 이벤트별 제목.
//   GAS GmailApp이라 솔라피와 무관하게 발송. 이메일 없는 고객은 호출 측에서 건너뜀.
function _nfCustomerEmailFallback(to, name, event, text) {
  try {
    var safe = (typeof esc === 'function') ? esc : function (s) { return String(s == null ? '' : s); };
    var meta = NF_EMAIL_TITLE[event] || { subj: '안내드립니다', head: '모먼트에디트 안내' };
    // 본문 정리: 태그·끝 URL 제거. 'OOO님,'으로 시작하면 그게 인사라 그대로 두고, 아니면 인사 한 줄 추가.
    var body = String(text || '').replace(/^\[모먼트에디트\]\s*/, '').replace(/\s*momentedit\.kr\/mypage\.html\s*$/i, '').trim();
    if (!body) body = (name || '고객') + '님께 안내드립니다.';
    var hasGreet = /^[^\s,]{1,20}\s*[·][^\s,]{1,20}\s*님|^[^\s,]{1,20}\s*님/.test(body);
    var inner = (typeof centerP === 'function')
      ? centerP((hasGreet ? '' : (name ? (safe(name) + '님,<br>') : '')) + safe(body).replace(/\n/g, '<br>'))
      : ('<p>' + safe(body) + '</p>');
    if (typeof emailBtn === 'function' && !meta.nobtn) inner += emailBtn('https://momentedit.kr/mypage.html', meta.btn || '마이페이지 열기');
    if (typeof smallP === 'function') {
      // 카톡으로 닿지 않아 보내는 메일 → 다시 카톡으로 안내하면 모순(카톡 없는 고객은 막힘).
      //   항상 닿는 채널(마이페이지·메일 회신)로만 문의를 유도한다.
      inner += smallP('카카오톡으로 닿지 않아 이메일로 보내드려요. 문의는 '
        + '<a href="https://momentedit.kr/mypage.html" style="color:#B89A75;font-weight:500">마이페이지</a>'
        + '에서 또는 이 메일에 회신해 주시면 됩니다.');
    }
    var html = (typeof emailShell === 'function') ? emailShell(meta.head, inner) : inner;
    GmailApp.sendEmail(to, '[Moment Edit] ' + meta.subj, String(body).slice(0, 500),
      { htmlBody: html, name: (typeof SYS !== 'undefined' ? SYS.FROM_NAME : 'Moment Edit') });
    Logger.log('[notify] 고객 이메일 → ' + to + ' · ' + event);
  } catch (e) { try { Logger.log('[notify] 고객 이메일 실패: ' + (e && e.message)); } catch (_) {} }
}

// ============================ 문자/알림톡 사용량 (관리자 💰) ============================
//  발송 1건당 종류만 적재(개인정보 없음) → 관리자 페이지에서 잔액 + 이번달 건수·추정비용 표시.
//  시트 '문자발송로그' [시각, 종류]. 종류 = SMS / LMS / 알림톡. 추정단가는 SOLAPI_PRICE(스크립트 속성 JSON)로 조정.
function _solapiLogSend(message) {
  var kind = (message && message.kakaoOptions) ? '알림톡' : ((String(message.text || '').length > 45) ? 'LMS' : 'SMS');
  var sh = SpreadsheetApp.getActive().getSheetByName('문자발송로그');
  if (!sh) { sh = SpreadsheetApp.getActive().insertSheet('문자발송로그'); sh.appendRow(['시각', '종류']); }
  if (sh.getLastRow() > 20000) return;   // 폭주 가드(수년치 · 그 전에 충분 · purgeSmsLog가 주간 정리)
  sh.appendRow([new Date(), kind]);
}
// [정리] 문자발송로그 180일 경과분 삭제 — purgeAdvisorLog(주간 트리거)가 함께 호출(별도 트리거 불필요).
//   append-only(위→아래 오래된 것) 가정. 20000행 상한 도달로 적재가 멈추는 것 방지.
function purgeSmsLog() {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName('문자발송로그');
    if (!sh || sh.getLastRow() < 2) return;
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 180);
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
    var del = 0;
    for (var i = 0; i < vals.length; i++) { var t = vals[i][0]; if (!(t instanceof Date)) t = new Date(t); if (!isNaN(t.getTime()) && t < cutoff) del++; else break; }
    if (del > 0) { sh.deleteRows(2, del); Logger.log('purgeSmsLog: ' + del + '건 삭제'); }
  } catch (e) { try { Logger.log('purgeSmsLog 실패: ' + (e && e.message)); } catch (_) {} }
}
// 관리자: 솔라피 잔액 + 이번달/24h 발송 건수·추정비용 (adminCall fn='solapiUsageSummary')
function solapiUsageSummary() {
  var tz = 'Asia/Seoul';
  var price = { SMS: 20, LMS: 50, '알림톡': 15 };   // 추정 단가(원) — 실제는 솔라피 콘솔 기준
  try { var pj = JSON.parse(PropertiesService.getScriptProperties().getProperty('SOLAPI_PRICE') || '{}'); for (var k in pj) price[k] = Number(pj[k]) || price[k]; } catch (e) {}
  var base = { ok: true, balance: _solapiBalance(), month: { count: 0, krw: 0, by: {} }, day: { count: 0 } };
  var sh = SpreadsheetApp.getActive().getSheetByName('문자발송로그');
  if (!sh || sh.getLastRow() < 2) return base;
  var n = Math.min(sh.getLastRow() - 1, 20000);
  var vals = sh.getRange(sh.getLastRow() - n + 1, 1, n, 2).getValues();
  var now = new Date(), dayCut = new Date(now.getTime() - 24 * 3600 * 1000), thisMonth = Utilities.formatDate(now, tz, 'yyyy-MM');
  for (var i = 0; i < vals.length; i++) {
    var t = vals[i][0]; if (!(t instanceof Date)) t = new Date(t); if (isNaN(t.getTime())) continue;
    var kind = String(vals[i][1] || 'SMS');
    if (Utilities.formatDate(t, tz, 'yyyy-MM') === thisMonth) { base.month.count++; base.month.by[kind] = (base.month.by[kind] || 0) + 1; base.month.krw += (price[kind] || 20); }
    if (t >= dayCut) base.day.count++;
  }
  base.month.krw = Math.round(base.month.krw);
  return base;
}

function _safeJson(o) { try { return JSON.stringify(o); } catch (e) { return String(o); } }
