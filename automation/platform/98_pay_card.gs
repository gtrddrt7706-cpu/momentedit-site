/** ============================ 98 · 카드결제 (토스페이먼츠) — 사전 구축본 · 기능 플래그 뒤 OFF ============================
 * 목적: 오픈 즈음 "키 교체 + ON"만으로 카드결제가 켜지도록 미리 다 만들어 둔다. 지금은 PAY_CARD_ENABLED 미설정 → 전부 비활성.
 *       기존 계좌이체("입금신호 → 관리자 확인") 흐름은 일절 건드리지 않는다(영향 0).
 *
 * 가동 조건(오픈 후): ① 통신판매업 신고 → 토스 라이브 계약 ② ScriptProperty 교체 ③ 프론트 결제버튼은 이미 플래그로 대기.
 *   - PAY_CARD_ENABLED = 'true'
 *   - TOSS_SECRET_KEY  = test_sk_...(지금 샌드박스) → live_sk_...(오픈 후)
 *   - TOSS_CLIENT_KEY  = test_ck_...(공개키 · 프론트에 내려줌) → live_ck_...
 *
 * 흐름: (프론트) 토스 SDK 결제창 → successUrl → doPost(action='cardConfirm', {token, milestone, paymentKey, orderId, amount})
 *       → 서버: 세션검증 → 금액 위변조검증(서버 재계산값과 일치) → 멱등(이미 확인이면 차단) → 토스 confirm API
 *       → 성공 시 기존 관리자확인 함수 재사용으로 기록(단계전이·고객 안심알림까지 동일).
 *
 * 보안: 고객 세션(token) 필수 · 금액은 _journeyAmounts 서버값과 반드시 일치(클라 위변조 차단) · LockService · 이중청구 방지.
 */
var PAY_LOG_SHEET = '카드결제로그';

function _payCfg() {
  var p = PropertiesService.getScriptProperties();
  return {
    enabled: String(p.getProperty('PAY_CARD_ENABLED') || '').trim() === 'true',
    secret:  String(p.getProperty('TOSS_SECRET_KEY') || '').trim(),    // test_sk_... → live_sk_...
    clientKey: String(p.getProperty('TOSS_CLIENT_KEY') || '').trim()   // test_ck_... → live_ck_... (프론트 공개)
  };
}

// 마일스톤별 서버측 기대 금액(위변조 방지) — 계좌이체 카드와 동일 출처(_journeyAmounts) 사용.
function _payExpectedAmount(cust, milestone) {
  var a = (typeof _journeyAmounts === 'function') ? _journeyAmounts(cust.get('계약총액'), cust.get('상품타입')) : null;
  if (!a) return null;
  if (milestone === '계약금') return Number(a.납부액) || 0;   // 계약 성립 시 납부액(예약금 차감 후 잔액)
  if (milestone === '중도금') return Number(a.중도금) || 0;
  if (milestone === '잔금')   return Number(a.잔금) || 0;
  return null;
}

// 토스 결제 승인(confirm) — Basic 인증(secret:). 2xx면 {ok:true,data}, 아니면 {ok:false,error,code}.
function _tossConfirm(cfg, paymentKey, orderId, amount) {
  try {
    var auth = Utilities.base64Encode(cfg.secret + ':');
    var resp = UrlFetchApp.fetch('https://api.tosspayments.com/v1/payments/confirm', {
      method: 'post', contentType: 'application/json',
      headers: { Authorization: 'Basic ' + auth },
      payload: JSON.stringify({ paymentKey: paymentKey, orderId: orderId, amount: amount }),
      muteHttpExceptions: true
    });
    var code = resp.getResponseCode(), txt = resp.getContentText(), data = {};
    try { data = JSON.parse(txt); } catch (e) {}
    if (code >= 200 && code < 300) return { ok: true, data: data };
    return { ok: false, error: (data && data.message) || ('HTTP ' + code), code: (data && data.code) || '' };
  } catch (e) {
    return { ok: false, error: (e && e.message) || '요청 실패', code: 'FETCH_EXCEPTION' };
  }
}

// 카드결제 마커 — 해당 원장 키를 '카드(매출전표)'로 표시해 현금영수증 발급 큐에서 제외.
//   확인 직후(같은 락 안) 동의기록을 최신으로 다시 읽어 결제수단만 병합 → 코어가 쓴 영수증기준일 등 다른 키 보존.
function _payMarkCard(code, ledgerKey) {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return;
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (!rec.결제수단) rec.결제수단 = {};
  if (rec.결제수단[ledgerKey] === '카드') return;
  rec.결제수단[ledgerKey] = '카드';
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
}

function _payLog(row) {
  try {
    var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(PAY_LOG_SHEET);
    if (!sh) { sh = ss.insertSheet(PAY_LOG_SHEET); sh.appendRow(['시각', '개인코드', '단계', '금액', 'orderId', 'paymentKey', '결과', '메모']); sh.setFrozenRows(1); }
    sh.appendRow([fmtKST(new Date()), row.code || '', row.milestone || '', row.amount || '', row.orderId || '', String(row.paymentKey || '').slice(0, 40), row.result || '', String(row.memo || '').slice(0, 200)]);
    if (sh.getLastRow() > 20000) sh.deleteRows(2, 1000);
  } catch (e) {}
}

/** 카드결제 승인 수신 (doPost action='cardConfirm') */
function handleCardConfirm(body) {
  var cfg = _payCfg();
  if (!cfg.enabled) return { ok: false, error: '카드결제는 현재 사용하지 않습니다.' };   // 플래그 OFF — 안전 차단
  if (!cfg.secret)  return { ok: false, error: '결제 설정이 준비되지 않았습니다.' };
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var milestone = String((body && body.milestone) || '').trim();
  if (['계약금', '중도금', '잔금'].indexOf(milestone) === -1) return { ok: false, error: '결제 단계가 올바르지 않습니다.' };
  var paymentKey = String((body && body.paymentKey) || '').trim();
  var orderId = String((body && body.orderId) || '').trim();
  var amount = Math.round(Number((body && body.amount) || 0));
  if (!paymentKey || !orderId || !(amount > 0)) return { ok: false, error: '결제 정보가 올바르지 않습니다.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var code = String(s.row.get('개인코드') || '').trim();
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

    // 멱등 — 이미 확인된 단계면 재confirm 금지(이중청구 방지)
    var statusCol = milestone === '계약금' ? '입금상태' : (milestone === '중도금' ? '중도금상태' : '잔금상태');
    if (String(cust.get(statusCol) || '').trim() === '확인') {
      _payLog({ code: code, milestone: milestone, amount: amount, orderId: orderId, paymentKey: paymentKey, result: '중복(이미확인)' });
      return { ok: true, already: true };
    }

    // 금액 위변조 검증 — 서버 재계산값과 일치해야 함
    var expected = _payExpectedAmount(cust, milestone);
    if (expected == null || expected <= 0) {
      _payLog({ code: code, milestone: milestone, amount: amount, orderId: orderId, result: '실패', memo: '기대금액 산출불가' });
      return { ok: false, error: '결제 금액을 확인할 수 없습니다. 디렉터에게 문의해 주세요.' };
    }
    if (amount !== expected) {
      _payLog({ code: code, milestone: milestone, amount: amount, orderId: orderId, result: '실패', memo: '금액불일치 기대' + expected });
      return { ok: false, error: '결제 금액이 일치하지 않습니다. 다시 시도해 주세요.' };
    }

    // 토스 승인
    var t = _tossConfirm(cfg, paymentKey, orderId, amount);
    if (!t.ok) {
      _payLog({ code: code, milestone: milestone, amount: amount, orderId: orderId, paymentKey: paymentKey, result: '토스실패', memo: (t.error || '') + ' ' + (t.code || '') });
      return { ok: false, error: '결제 승인에 실패했습니다. ' + (t.error || '') };
    }

    // 성공 → 확인 기록(기록·단계전이·고객 안심알림 일관).
    //   ★ 계약금은 관리자 함수(adminConfirmPayment)를 직접 부르면 안 됨 — ① _requireAdmin() 가드로 즉시 throw
    //     ② 임박 시 중도금·잔금까지 자동 번들(카드는 계약금만 실결제라 미결제분이 확인됨). → 가드·번들 없는 코어를 bundle:false로 호출.
    //   중도금·잔금 확인함수(adminConfirmMid/Balance)는 가드 없음·STAGE_EXCEPTIONS 차단·안심알림까지 카드에 그대로 맞음 → 재사용.
    var rec;
    if (milestone === '계약금') rec = (typeof _confirmDepositCore === 'function') ? _confirmDepositCore(code, { bundle: false, via: '카드' }) : { ok: false };
    else if (milestone === '중도금') rec = (typeof adminConfirmMid === 'function') ? adminConfirmMid(code) : { ok: false };
    else rec = (typeof adminConfirmBalance === 'function') ? adminConfirmBalance(code) : { ok: false };
    // [SYNC-3] 카드=매출전표 → 현금영수증 발급 큐에서 제외(_cashReceiptLedger가 결제수단 마커로 판정). ★원장에 항목이 있는 결제분만 마킹★
    //   · 중도금·잔금 → 동명 원장 키.
    //   · 계약금은 상품별로 다름:
    //       - 웨딩스냅: 계약금=20% 전액이 원장 '예약금' 항목과 같은 돈 → 마킹.
    //       - 시그니처: 카드로 내는 건 '납부액'(계약금 10% - 상담예약금 10만)인데 원장에 별도 항목이 없고,
    //                  원장 '예약금'(10만)은 계약 전 계좌이체로 낸 상담 예약금(카드 대상 아님·정당한 현금영수증 대상)이라 절대 건드리면 안 됨 → 마킹 안 함.
    if (rec && rec.ok) {
      try {
        if (milestone === '중도금' || milestone === '잔금') _payMarkCard(code, milestone);
        else if (milestone === '계약금' && String(cust.get('상품타입') || '').trim() === '웨딩스냅') _payMarkCard(code, '예약금');
      } catch (e) {}
    }
    _payLog({ code: code, milestone: milestone, amount: amount, orderId: orderId, paymentKey: paymentKey, result: '성공', memo: (rec && rec.ok) ? '기록OK' : '기록경고(수동확인 필요)' });
    return { ok: true, recorded: !!(rec && rec.ok) };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

/** 프론트가 결제창 띄우기 전 설정 조회 (doPost action='cardPayConfig')
 *  플래그 OFF면 {enabled:false}만 반환 → 프론트는 계좌이체만 노출(현 동작 유지). */
function handleCardPayConfig(body) {
  var cfg = _payCfg();
  if (!cfg.enabled || !cfg.clientKey) return { ok: true, enabled: false };
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var cust = findCustomerByCode(String(s.row.get('개인코드') || '').trim());
  if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var milestone = String((body && body.milestone) || '').trim();
  var amount = _payExpectedAmount(cust, milestone);
  return { ok: true, enabled: true, clientKey: cfg.clientKey, amount: amount || 0, orderName: '모먼트에디트 ' + (milestone || '결제') };
}

/** [점검용] 토스 샌드박스 연결 확인 — 더미 paymentKey로 confirm 호출해 인증/연결만 본다(실결제 아님).
 *  인증 정상이면 결제 관련 에러(NOT_FOUND_PAYMENT 등) · 키 오류면 UNAUTHORIZED_KEY 가 로그에 뜬다. */
function ZZ_tossPing() {
  var cfg = _payCfg();
  if (!cfg.secret) { Logger.log('TOSS_SECRET_KEY 미설정 — 먼저 스크립트 속성에 테스트 키 입력'); return; }
  var t = _tossConfirm(cfg, 'PING_NOT_A_REAL_KEY', 'ping_' + Utilities.getUuid().slice(0, 8), 1000);
  Logger.log('토스 응답: ' + JSON.stringify(t));
}
