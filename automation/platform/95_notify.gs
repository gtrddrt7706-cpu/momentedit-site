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
  'admin.newSignup':      { to: 'admin', need: true,  desc: '신규 신청 — 일정 잡기' },
  'admin.slotPicked':     { to: 'admin', need: true,  desc: '상담 슬롯 선택됨 — 승인 필요' },
  'admin.contractReq':    { to: 'admin', need: true,  desc: '계약서 요청됨 — 발송 필요' },
  'admin.depositSignal':  { to: 'admin', need: true,  desc: '계약금 입금신호 — 확인 필요' },
  'admin.midSignal':      { to: 'admin', need: true,  desc: '중도금 입금신호 — 확인 필요' },
  'admin.balanceSignal':  { to: 'admin', need: true,  desc: '잔금 입금신호 — 확인 필요' },
  'admin.holdRequest':    { to: 'admin', need: true,  desc: '예식일 임시고정 요청 — 승인/거절 필요' },
  'admin.changeRequest':  { to: 'admin', need: true,  desc: '예식일 변경 요청 — 슬롯 확인 후 적용/거절 필요' },
  // ── 관리자: 권장(업무 착수 신호) — need:false는 기본 폰 발송 안 함(아침 브리핑 메일·관리자 페이지로 확인 · ADMIN_NOTIFY_INFO='true'로 복구) ──
  'admin.fittingSigned':  { to: 'admin', need: false, desc: '시착 동의 서명 완료 — 상담완료 처리' },
  'admin.contractSigned': { to: 'admin', need: false, desc: '계약 서명 완료' },
  'admin.resultPicked':   { to: 'admin', need: false, desc: '결과물(보정본) 선택됨 — 작업 착수' },
  'admin.extraSignal':    { to: 'admin', need: true,  desc: '추가보정 입금신호 — 확인 필요' },
  'admin.cancelRefund':   { to: 'admin', need: true,  desc: '예약 취소 — 환불 송금 필요' },
  'admin.diningConsult':  { to: 'admin', need: false, desc: "다이닝 '상담 때 함께 정할게요' 선택 — 상담 의제 준비" },
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
  // ── 고객: 안내성 — off:true는 발송 안 함(2026-06-12 사용자 결정: '없으면 진행 막히는 알림'만 유지 · 줄 지우면 즉시 복구) ──
  'cust.paymentConfirmed':{ to: 'customer', need: false, off: true, desc: '입금 확인됨' },
  'cust.cashReceiptIssued':{ to: 'customer', need: false, off: true, desc: '현금영수증 발행됨' },
  'cust.holdGranted':     { to: 'customer', need: false, off: true, desc: '예식일 임시고정 승인됨' },
  'cust.changeConfirmed': { to: 'customer', need: false, off: true, desc: '예식일 변경 적용됨' },
  'cust.changeDeclined':  { to: 'customer', need: true,  desc: '예식일 변경 거절됨 — 재조율 필요' },
  'cust.holdExpiring':    { to: 'customer', need: true,  desc: '임시고정 만료 임박(D-3) — 상담/연장 안내' },
  'cust.holdReleased':    { to: 'customer', need: false, off: true, desc: '예식일 임시고정 해제됨' },
  'cust.consultDayBefore':{ to: 'customer', need: false, desc: '상담 하루 전 안내' },
  'cust.archiveExpiring': { to: 'customer', need: true,  desc: '결과물 보관 만료 임박 — 다운로드 안내' }
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
    // [관리자 알림 최소화 · 2026-06-11] 행동 게이트(need:true)만 폰으로 — 관리자가 페이지에서 처리해야
    // 고객 진행이 풀리는 일만. 안내성(서명완료·보정본선택·다이닝·브리핑 등)은 메일 브리핑·관리자 페이지로 충분.
    var meta = NOTIFY_EVENTS[event] || {};
    if (meta.need !== true && !_adminInfoOn()) { Logger.log('[notify] 관리자 안내성 알림 생략(need:false): ' + event); return; }
    if (!cfg.adminPhone) { Logger.log('[notify] ADMIN_PHONE 미설정 — 발송 생략'); return; }
    _solapiSend(cfg, { to: cfg.adminPhone, from: cfg.sender, text: _nfAdminText(event, code, extra) });
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

  var m = _nfCustomerMsg(event, name, extra);   // { vars, text }
  if (!m) { Logger.log('[notify] 문구 미정의 이벤트: ' + event + ' — 발송 생략'); return; }

  var tplId = String(cfg.templates[event] || '').trim();
  var msg = { to: phone, from: cfg.sender, text: m.text };   // text = 알림톡 실패 시 SMS 대체 문구
  if (tplId && cfg.pfId) {
    msg.kakaoOptions = { pfId: cfg.pfId, templateId: tplId, variables: m.vars };
  }
  // 템플릿 미승인 상태면 kakaoOptions 없이 SMS로 발송 → 승인 후 KAKAO_TEMPLATES에 코드만 넣으면 알림톡 전환
  _solapiSend(cfg, msg, { code: String(code || '').trim(), event: event });
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
    } else {
      Logger.log('[notify] 발송 실패 HTTP ' + codeN + ' · ' + String(resp.getContentText()).slice(0, 300));
      _notifyFailMark(ctx, 'HTTP ' + codeN);
    }
  } catch (e) {
    Logger.log('[notify] 발송 예외: ' + (e && e.message));
    _notifyFailMark(ctx, (e && e.message) || '예외');
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
  var lock = null, arr = [];
  try { lock = LockService.getScriptLock(); lock.waitLock(15000); } catch (e) { lock = null; }
  try {
    var p = PropertiesService.getScriptProperties();
    try { arr = JSON.parse(p.getProperty('NOTIFY_HOLD') || '[]'); } catch (e) { arr = []; }
    p.deleteProperty('NOTIFY_HOLD');
  } finally { try { if (lock) lock.releaseLock(); } catch (e2) {} }
  if (!arr.length) { Logger.log('flushHeldNotifies: 보류 0건'); return; }
  if (!_notifyEnabled()) { Logger.log('flushHeldNotifies: NOTIFY_ENABLED OFF — ' + arr.length + '건 폐기(로그만)'); return; }
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

var NF_MYPAGE = 'momentedit.kr/mypage.html';

function _nfCustomerMsg(event, name, x) {
  x = x || {};
  var d;
  switch (event) {
    case 'cust.consultConfirmed':
      d = _nfDate(x.date) + (x.time ? (' ' + x.time) : '');
      return { vars: { '#{이름}': name, '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 상담 일정이 확정되었습니다(' + d + '). 이 시간은 두 분만을 위해 비워두는 단독 상담입니다. 변경이 필요하시면 마이페이지에서 미리 알려주세요. ' + NF_MYPAGE };
    case 'cust.consultDayBefore':
      d = _nfDate(x.date) + (x.time ? (' ' + x.time) : '');
      return { vars: { '#{이름}': name, '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 내일 ' + d + ' 상담이 예정되어 있어요. 준비물은 없습니다. 편안히 오시면 됩니다. 내일 뵙겠습니다.' };
    case 'cust.timeProposed':
      d = _nfDate(x.date) + (x.time ? (' ' + x.time) : '');
      return { vars: { '#{이름}': name, '#{일시}': d },
        text: '[모먼트에디트] ' + name + '님, 상담 시간 변경을 제안드렸어요(' + d + '). 마이페이지에서 수락하시거나 더 편한 시간을 선택해 주세요. 확인해 주시면 바로 확정해 드릴게요. ' + NF_MYPAGE };
    case 'cust.fittingRequest':
      return { vars: { '#{이름}': name },
        text: '[모먼트에디트] ' + name + '님, 드레스 시착 동의서가 도착했어요. 시착은 기본 3벌까지 포함이에요. 마이페이지에서 확인 후 서명해 주세요. 서명 후 시착이 진행됩니다. ' + NF_MYPAGE };
    case 'cust.contractArrived':
      return { vars: { '#{이름}': name },
        text: '[모먼트에디트] ' + name + '님, 이용계약서가 도착했어요. 상담에서 말씀 나눈 내용 그대로 담았습니다. 72시간 안에 마이페이지에서 차분히 확인 후 서명해 주세요(기한 경과 시 자동 파기). ' + NF_MYPAGE };
    case 'cust.paymentConfirmed':
      return { vars: { '#{이름}': name, '#{항목}': String(x.kind || '결제') },
        text: '[모먼트에디트] ' + name + '님, ' + String(x.kind || '결제') + ' 입금이 확인되었습니다. 감사합니다. 받은 마음 그대로 정성껏 준비하겠습니다. 내역은 마이페이지에서 확인하실 수 있어요. ' + NF_MYPAGE };
    case 'cust.cashReceiptIssued':
      return { vars: { '#{이름}': name, '#{항목}': String(x.kind || ''), '#{금액}': _nfWon(x.amount) },
        text: '[모먼트에디트] ' + name + '님, ' + String(x.kind || '') + ' 현금영수증(' + _nfWon(x.amount) + '원)이 발행되었습니다. 승인번호와 발행 내역은 마이페이지에서 확인하실 수 있어요. ' + NF_MYPAGE };
    case 'cust.midPre':
    case 'cust.midDue':
      return { vars: { '#{이름}': name, '#{디데이}': String(x.dday != null ? x.dday : '') },
        text: '[모먼트에디트] ' + name + '님, 중도금 일정을 안내드립니다(예식 ' + (x.dday != null ? ('D-' + x.dday) : '예정') + '). 금액과 계좌는 마이페이지에 정리해 두었어요. 입금자명을 남겨주시면 확인이 더 빨라요. ' + NF_MYPAGE };
    case 'cust.balancePre':
    case 'cust.balanceDue':
      return { vars: { '#{이름}': name, '#{디데이}': String(x.dday != null ? x.dday : '') },
        text: '[모먼트에디트] ' + name + '님, 잔금 일정을 안내드립니다(예식 ' + (x.dday != null ? ('D-' + x.dday) : '예정') + '). 예식 준비는 저희가 차근차근 마무리하고 있습니다. 금액과 계좌는 마이페이지에서 확인해 주세요. ' + NF_MYPAGE };
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
    case 'admin.diningConsult':  return tag + ' 다이닝: 상담 때 함께 정하기로 함' + c + ' / 상담 의제로 준비';
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

function _safeJson(o) { try { return JSON.stringify(o); } catch (e) { return String(o); } }
