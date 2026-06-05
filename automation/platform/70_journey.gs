/**
 * Moment Edit · 통합 플랫폼 — 02 여정(계약·입금) 핸들러
 * ──────────────────────────────────────────────────────────────────────────
 * 마이페이지 계약·입금 단계의 서버 동작. 세션(로그인토큰) → Customers 행에 기록.
 *   · 시착 동의(02-2): 게이트(시착동의상태) + 클릭 동의 서명 → 시착동의일시 + 동의기록(JSON 스냅샷)
 *   · (예정) 계약서 서명(02-3) · 계약금 입금 신호(02-4)
 *
 * [두 층위] 여기는 Customers '현재단계/보조상태'(여정) 소관. 상담 ST(상담 건)와 섞지 않는다.
 * [효력] 서명 = "클릭 동의 + 기록". 동의기록 JSON = 약관버전·표시금액·약관지문(termsHash)·식별값.
 *        동의기록은 내부 전용 — getMyState(마이페이지)에 절대 노출하지 않는다.
 * [재사용] resolveSession(30) · getCustomersSheet/buildHeaderIndex · findCustomerByCode/touchCustomer(20) · fmtKST
 */

// 시착 동의서 — 마이페이지 표시 + 동의 기록의 단일 출처(문구·금액 한 곳에서만 정의).
var FITTING_CONSENT = {
  version: '시착동의-v1',
  title: '시착 동의서',
  기본벌수: 3,
  추가벌비용: 70000,   // 4벌째부터 1벌당
  예약금: 200000,
  terms: [
    '시착은 3벌까지 포함됩니다. (4벌째부터 1벌당 70,000원)',
    '예약금 200,000원은 계약을 진행하시면 계약금의 일부로 전환됩니다.',
    '시착 후 계약을 진행하지 않으시면 예약금은 시착비로 전환되어 환불되지 않습니다. (시착 전 취소는 전액 환불)'
  ],
  gateNotice: '서명하면 시착이 진행됩니다.',
  reviewNote: '서명 후에도 계약서 서명 전까지 다시 확인하실 수 있습니다.',
  nextNotice: '시착 후, 계약서를 24시간 내에 이 마이페이지로 보내드려요.'   // [③-2] 다음 단계 예고
};

// [02-2] 시착 동의 서명(고객) → 시착동의일시 + 동의기록 + 시착동의상태=동의완료.
//   가드: 상담완료 단계 + 관리자가 '동의요청'으로 게이트를 연 경우만. 멱등(이미 완료면 OK).
//   Lock + 최신 재읽기 = 이중 클릭·동시성 보호.
function handleSignFittingConsent(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);                 // 최신 재읽기
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

    var stage = String(cust.get('현재단계') || '').trim();
    var fStatus = String(cust.get('시착동의상태') || '').trim() || '대기';
    var prevSignedAt = String(cust.get('시착동의일시') || '').trim();

    // 멱등 — 이미 동의완료(또는 일시 기록됨)면 그대로 OK (이중 클릭·새로고침)
    if (fStatus === '동의완료' || prevSignedAt) {
      return { ok: true, already: true, signedAt: prevSignedAt };
    }
    // 게이트 가드 — 단계/상태가 맞아야 서명 가능 (관리자 안내 전 차단)
    if (stage !== '시착') return { ok: false, error: '아직 시착 동의 단계가 아닙니다.' };
    if (fStatus !== '동의요청') return { ok: false, error: '아직 시착 동의 안내 전입니다. 디렉터 안내 후 진행됩니다.' };

    var now = fmtKST(new Date());
    var prev = _parseJsonSafe(cust.get('동의기록'));     // 기존 기록(없으면 {}) 위에 병합
    prev.시착 = {
      type: '시착동의',
      version: FITTING_CONSENT.version,
      signedAt: now,
      code: code,                                        // 식별값
      예약금: FITTING_CONSENT.예약금,                    // 그때 표시·합의된 금액
      기본벌수: FITTING_CONSENT.기본벌수,
      추가벌비용: FITTING_CONSENT.추가벌비용,
      termsHash: _termsHash(FITTING_CONSENT.terms)       // 동의한 정확한 약관 문구의 지문
    };
    touchCustomer(sheet, colOf, cust.num, {
      '시착동의일시': now,
      '시착동의상태': '동의완료',
      '동의기록': JSON.stringify(prev)
    });
    return { ok: true, signedAt: now };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [02-2] 마이페이지 시착 동의 카드용 상태. 동의기록(내부 JSON)은 내보내지 않고 파생값·약관 문구만.
//   노출 조건: 서명함(완료·재열람 카드) 또는 상담완료+관리자 게이트 열림(서명 카드). 그 외 null(카드 없음).
function buildFittingState(r) {
  if (!r) return null;
  var stage = String(r.get('현재단계') || '').trim();
  var status = String(r.get('시착동의상태') || '').trim() || '대기';
  var signedAt = String(r.get('시착동의일시') || '').trim();
  var signed = (status === '동의완료') || !!signedAt;
  var requested = (status === '동의요청');
  if (!signed && !(stage === '시착' && requested)) return null;  // 아직 안내 전 → 카드 없음
  return {
    signed: signed,                 // 서명 완료 여부
    signedAt: signedAt,             // 서명 일시(표시용)
    version: FITTING_CONSENT.version,
    title: FITTING_CONSENT.title,
    terms: FITTING_CONSENT.terms,
    gateNotice: FITTING_CONSENT.gateNotice,
    reviewNote: FITTING_CONSENT.reviewNote,
    nextNotice: FITTING_CONSENT.nextNotice,
    기본벌수: FITTING_CONSENT.기본벌수,
    추가벌비용: FITTING_CONSENT.추가벌비용,
    예약금: FITTING_CONSENT.예약금
  };
}

// 내부 유틸 ── JSON 안전 파싱(없으면 {}) · 약관 지문(동의한 정확한 문구 증명용 16자)
function _parseJsonSafe(v) {
  try { var o = JSON.parse(String(v || '')); return (o && typeof o === 'object') ? o : {}; } catch (e) { return {}; }
}
function _termsHash(terms) {
  var raw = (terms || []).join('\n');
  var bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '').slice(0, 16);
}

// ============================ 02-3 · 계약서 서명 ============================
// 계약서는 시착보다 무거운 게이트 — 서명 = 효력 발생·취소/파기 불가. 발송 +72h 기한, 미서명 자동 파기.
var CONTRACT = {
  version: '계약서명-v1',
  서명기한시간: 72,                 // 발송 +72h 안에 서명
  리마인드시간: 24,                 // 마감 24h 전 리마인드(1차=마이페이지 표시, 알림톡 2차)
  effectNotice: '서명하면 계약의 효력이 발생하며, 이후에는 취소·파기가 불가합니다.',
  reviewNote: '서명 전 계약 내용을 충분히 확인해 주세요. 기한이 지나면 계약서는 자동 파기됩니다.'
};

// [02-3] 계약서 서명(고객) → 계약서명일시 + 계약상태=서명완료 + 동의기록.계약 + 현재단계→계약완료.
//   가드: 계약상태=발송 + 기한 내. 멱등(이미 서명완료). Lock + 최신 재읽기.
function handleSignContract(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);                 // 최신 재읽기
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

    var cStatus = String(cust.get('계약상태') || '').trim();
    var prevSigned = String(cust.get('계약서명일시') || '').trim();
    if (cStatus === '서명완료' || prevSigned) {           // 멱등(이중 클릭·새로고침)
      return { ok: true, already: true, signedAt: prevSigned };
    }
    if (cStatus !== '발송') return { ok: false, error: '서명할 계약서가 없습니다. (디렉터 발송 후 진행됩니다)' };

    // 기한 가드 — 발송 +72h 경과면 차단 (KST)
    var sentAt = _parseKstStr(cust.get('계약서발송일시'));
    if (sentAt && Date.now() > sentAt.getTime() + CONTRACT.서명기한시간 * 3600 * 1000) {
      return { ok: false, expired: true, error: '서명 기한이 지났습니다. 디렉터에게 다시 요청해 주세요.' };
    }

    var now = fmtKST(new Date());
    var prev = _parseJsonSafe(cust.get('동의기록'));
    prev.계약 = {
      type: '계약서명',
      version: CONTRACT.version,
      signedAt: now,
      code: code,
      sentAt: String(cust.get('계약서발송일시') || ''),
      link: String(cust.get('계약서링크') || ''),
      effectHash: _termsHash([CONTRACT.effectNotice])    // 동의한 효력 고지 문구 지문
    };
    touchCustomer(sheet, colOf, cust.num, {
      '계약서명일시': now,
      '계약상태': '서명완료',
      '동의기록': JSON.stringify(prev)
    });
    setCustomerStage(code, 'contract');                   // 현재단계 → 계약완료 (단일 전이점)
    return { ok: true, signedAt: now };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [02-3] 마이페이지 계약서 카드용 상태. 동의기록(내부 JSON) 비노출, 파생값·기한만.
//   노출: 발송(서명 카드+카운트다운) 또는 서명완료(완료+계약서 보기). 미발송 → null.
function buildContractState(r) {
  if (!r) return null;
  var cStatus = String(r.get('계약상태') || '').trim();
  var signedAt = String(r.get('계약서명일시') || '').trim();
  var link = String(r.get('계약서링크') || '').trim();
  var signed = (cStatus === '서명완료') || !!signedAt;
  var sent = (cStatus === '발송');
  if (!signed && !sent) return null;
  var out = {
    signed: signed,
    signedAt: signedAt,
    link: link,
    effectNotice: CONTRACT.effectNotice,
    reviewNote: CONTRACT.reviewNote
  };
  if (!signed && sent) {                                  // 서명 대기 → 기한·카운트다운(서버 기준 잔여초)
    var sentAt = _parseKstStr(r.get('계약서발송일시'));
    if (sentAt) {
      var deadlineMs = sentAt.getTime() + CONTRACT.서명기한시간 * 3600 * 1000;
      out.deadlineKst = fmtKST(new Date(deadlineMs));
      out.remainingSec = Math.max(0, Math.floor((deadlineMs - Date.now()) / 1000));
      out.expired = Date.now() > deadlineMs;
    }
  }
  return out;
}

// [02-3] 시간 트리거 — 계약서 미서명 기한(발송+72h) 경과분 자동 파기(계약상태→미발송, 링크·발송일시 비움 + 이력).
//   ※ '자동 취소'의 여정/환불(예약금) 처리는 취소·환불 흐름에서 결정 — 여기선 계약서 offer만 파기(재발송 가능),
//      현재단계는 건드리지 않는다(상담완료 유지). 운영자: 시간 기반 트리거로 1일 1회 설치.
function expireUnsignedContracts() {
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < P.DATA_START_ROW) return 0;
  var cCol = colOf['계약상태'], sentCol = colOf['계약서발송일시'], histCol = colOf['처리이력'];
  if (!cCol || !sentCol) return 0;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var n = 0, nowMs = Date.now();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][cCol - 1] || '').trim() !== '발송') continue;
    var sentAt = _parseKstStr(vals[i][sentCol - 1]);
    if (!sentAt || nowMs <= sentAt.getTime() + CONTRACT.서명기한시간 * 3600 * 1000) continue;
    var rowNum = P.DATA_START_ROW + i;
    var upd = { '계약상태': '미발송', '계약서링크': '', '계약서발송일시': '' };
    if (histCol) {
      var prevHist = String(vals[i][histCol - 1] || '');
      var line = '[' + fmtKST(new Date()) + '] 시스템: 계약서 미서명 기한경과 자동 파기';
      upd['처리이력'] = prevHist ? (prevHist + '\n' + line) : line;
    }
    touchCustomer(sheet, colOf, rowNum, upd);
    n++;
  }
  Logger.log('expireUnsignedContracts: ' + n + '건 파기');
  return n;
}

// 'YYYY-MM-DD HH:mm'(fmtKST) → Date. appsscript.json timeZone=Asia/Seoul 전제(KST).
function _parseKstStr(s) {
  var m = String(s || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})[ T](\d{1,2}):(\d{2})/);
  if (!m) return null;
  return new Date(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], 0);
}

// ============================ 02-4 · 계약금 입금 ============================
// 계약금 = 총액 20%(예약금 차감 후 납부) · 잔금 = 총액 80%(예식 N일 전, 1차는 안내 카피만).
//   ★ 잔금 시점은 PAYMENT.잔금일수전 단일 출처 — 7→14 수정 시 여기 한 곳만 고치면 전체 반영.
var PAYMENT = {
  예약금: 200000,
  계약금율: 0.2,
  잔금일수전: 7        // 잔금 입금 기한 = 예식 N일 전 (라벨·카피 모두 이 값에서 파생)
};
function _balanceDueLabel() { return '예식 ' + PAYMENT.잔금일수전 + '일 전'; }

// 계약총액 → 금액 산출. 총액 없으면 null(입금화면이 "디렉터 확인 후 안내").
function _journeyAmounts(total) {
  var t = Math.round(Number(total) || 0);
  if (t <= 0) return null;
  var deposit = Math.round(t * PAYMENT.계약금율);            // 계약금(20%)
  return {
    총액: t,
    계약금: deposit,
    예약금: PAYMENT.예약금,
    납부액: Math.max(0, deposit - PAYMENT.예약금),           // 계약금 단계 실제 납부(예약금 차감)
    잔금: t - deposit,                                        // 80%
    잔금시점: _balanceDueLabel()
  };
}

// [02-4] 계약금 입금 신호(고객) → 입금자명 + 입금완료신호 + 입금상태=완료신호.
//   가드: 계약 서명완료 이후. 자동 진행 X — 관리자 통장 대조 승인(adminConfirmPayment)이 트리거.
function handlePaymentSignal(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var payer = String((body && body.payerName) || '').trim();
  if (!payer) return { ok: false, error: '입금자명을 입력해 주세요.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

    if (String(cust.get('계약상태') || '').trim() !== '서명완료') {
      return { ok: false, error: '계약 서명 후 입금을 진행해 주세요.' };
    }
    if (String(cust.get('입금상태') || '').trim() === '확인') {
      return { ok: true, already: true };                    // 이미 관리자 확인 완료
    }
    touchCustomer(sheet, colOf, cust.num, {
      '입금자명': payer,
      '입금완료신호': fmtKST(new Date()),
      '입금상태': '완료신호'
    });
    return { ok: true };                                      // 자동 진행 X — 관리자 승인 대기
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [02-4] 마이페이지 입금 카드용 상태. 계약 서명완료 + 현재단계(계약완료/입금완료)일 때 노출.
//   금액은 계약총액에서 산출(없으면 amounts=null → "디렉터 확인 후 안내"). 내부값 비노출.
function buildPaymentState(r) {
  if (!r) return null;
  if (String(r.get('계약상태') || '').trim() !== '서명완료') return null;   // 계약 서명 전 → 카드 없음
  var stage = String(r.get('현재단계') || '').trim();
  var iStatus = String(r.get('입금상태') || '').trim() || '대기';
  var confirmed = iStatus === '확인';
  // [③-4] 계약완료·입금완료=항상 노출 / 제작중+ 이후엔 '확인' 완료분만 접힌 카드 유지(시착·계약과 일관)
  if (['계약완료', '입금완료'].indexOf(stage) === -1 && !confirmed) return null;
  return {
    status: iStatus,                          // 대기 / 완료신호 / 확인
    confirmed: confirmed,
    payerName: String(r.get('입금자명') || '').trim(),
    amounts: _journeyAmounts(r.get('계약총액')),                            // {계약금,납부액,잔금,잔금시점,...} 또는 null
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : ''
  };
}
