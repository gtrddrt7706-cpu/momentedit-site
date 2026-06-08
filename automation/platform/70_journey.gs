/**
 * Moment Edit · 통합 플랫폼 — 02 여정(계약·입금) 핸들러
 * ──────────────────────────────────────────────────────────────────────────
 * 마이페이지 계약·입금 단계의 서버 동작. 세션(로그인토큰) → Customers 행에 기록.
 *   · 드레스 시착 동의(02-2): 게이트(시착동의상태) + 클릭 동의 서명 → 시착동의일시 + 동의기록(JSON 스냅샷)
 *   · (예정) 계약서 서명(02-3) · 계약금 입금 신호(02-4)
 *
 * [두 층위] 여기는 Customers '현재단계/보조상태'(여정) 소관. 상담 ST(상담 건)와 섞지 않는다.
 * [효력] 서명 = "클릭 동의 + 기록". 동의기록 JSON = 약관버전·표시금액·약관지문(termsHash)·식별값.
 *        동의기록은 내부 전용 — getMyState(마이페이지)에 절대 노출하지 않는다.
 * [재사용] resolveSession(30) · getCustomersSheet/buildHeaderIndex · findCustomerByCode/touchCustomer(20) · fmtKST
 */

// 드레스 시착 동의서 — 마이페이지 표시 + 동의 기록의 단일 출처(문구·금액 한 곳에서만 정의).
var FITTING_CONSENT = {
  version: '시착동의-v1',
  title: '드레스 시착 동의서',
  기본벌수: 3,
  추가벌비용: 70000,   // 4벌째부터 1벌당
  예약금: 200000,
  terms: [
    '드레스 시착은 3벌까지 포함됩니다. (4벌째부터 1벌당 70,000원)',
    '예약금 200,000원은 계약을 진행하시면 계약금의 일부로 전환됩니다.',
    '드레스 시착 후 계약을 진행하지 않으시면 예약금은 시착비로 전환되어 환불되지 않습니다. (시착 전 취소는 전액 환불)'
  ],
  gateNotice: '서명하면 드레스 시착이 진행됩니다.',
  reviewNote: '서명 후에도 계약서 서명 전까지 다시 확인하실 수 있습니다.',
  nextNotice: '드레스 시착 후, 계약서를 24시간 내에 이 마이페이지로 보내드려요.'   // [③-2] 다음 단계 예고
};

// [02-2] 드레스 시착 동의 서명(고객) → 시착동의일시 + 동의기록 + 시착동의상태=동의완료.
//   가드: 시착 단계 + 관리자가 '동의요청'으로 게이트를 연 경우만. 멱등(이미 완료면 OK).
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
    if (stage !== '시착') return { ok: false, error: '아직 드레스 시착 동의 단계가 아닙니다.' };
    if (fStatus !== '동의요청') return { ok: false, error: '아직 드레스 시착 동의 안내 전입니다. 디렉터 안내 후 진행됩니다.' };

    var now = fmtKST(new Date());
    var sigSaved = _saveSignature(code, '시착', (body && body.signature), now, FITTING_CONSENT.version);  // 손글씨 서명 저장
    var prev = _parseJsonSafe(cust.get('동의기록'));     // 기존 기록(없으면 {}) 위에 병합
    prev.시착 = {
      type: '시착동의',
      version: FITTING_CONSENT.version,
      signedAt: now,
      code: code,                                        // 식별값
      예약금: FITTING_CONSENT.예약금,                    // 그때 표시·합의된 금액
      기본벌수: FITTING_CONSENT.기본벌수,
      추가벌비용: FITTING_CONSENT.추가벌비용,
      termsHash: _termsHash(FITTING_CONSENT.terms),      // 동의한 정확한 약관 문구의 지문
      signatureSaved: sigSaved                           // 손글씨 서명 이미지 저장 여부(Signatures 시트)
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

// [02-2] 마이페이지 드레스 시착 동의 카드용 상태. 동의기록(내부 JSON)은 내보내지 않고 파생값·약관 문구만.
//   노출 조건: 서명함(완료·재열람 카드) 또는 시착 단계+관리자 게이트 열림(서명 카드). 그 외 null(카드 없음).
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

// ============================ 손글씨 서명 저장 (Signatures 시트 · Drive 권한 불필요) ============================
// 시착·본계약 서명 이미지(base64 PNG)를 별도 시트에 누적 — Customers 시트는 가볍게(관리자 홈 성능 보존).
//   ★ 1회 실행: setupSignatures()(시트 생성). 시착/계약 서명 핸들러가 _saveSignature 호출. 시착·본계약 공용.
var SIGNATURES_SHEET = 'Signatures';
function setupSignatures() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(SIGNATURES_SHEET) || ss.insertSheet(SIGNATURES_SHEET);
  sh.getRange(1, 1, 1, 5).setValues([['개인코드', '유형', '서명이미지', '서명일시', '버전']]).setFontWeight('bold');
  sh.setFrozenRows(1);
  sh.getRange('C:C').setNumberFormat('@');   // 이미지=문자(긴 base64)
  return 'Signatures 시트 준비 완료 — 시착·본계약 서명이 여기 누적 저장됩니다.';
}
// 서명 저장 — dataUrl 형식·크기 검증 후 append. 성공 true / 미서명·형식오류 false.
function _saveSignature(code, type, dataUrl, signedAt, version) {
  dataUrl = String(dataUrl || '');
  if (!/^data:image\/(png|jpeg);base64,/.test(dataUrl)) return false;   // 형식 검증(미서명이면 빈값 → false)
  if (dataUrl.length > 800000) return false;                           // ~0.6MB↑ 과대 차단(셀 한도 보호)
  try {
    var ss = SpreadsheetApp.getActive();
    var sh = ss.getSheetByName(SIGNATURES_SHEET);
    if (!sh) { setupSignatures(); sh = ss.getSheetByName(SIGNATURES_SHEET); }
    sh.appendRow([String(code || '').toUpperCase(), String(type || ''), dataUrl, signedAt || fmtKST(new Date()), version || '']);
    return true;
  } catch (e) { Logger.log('서명 저장 실패: ' + (e && e.message)); return false; }
}
// 최신 서명 dataUrl 조회(관리자/재열람) — code+type 마지막 매칭 1건.
function getSignatureDataUrl(code, type) {
  var sh = SpreadsheetApp.getActive().getSheetByName(SIGNATURES_SHEET);
  if (!sh || sh.getLastRow() < 2) return '';
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  var found = '', c = String(code || '').trim().toUpperCase(), tp = String(type || '').trim();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toUpperCase() === c && String(vals[i][1]).trim() === tp) found = String(vals[i][2] || '');
  }
  return found;
}
// [02] 마이페이지 완료 카드 펼침용 — 내 시착/계약 손글씨 서명 dataUrl 조회(세션 본인 것만).
function handleGetSignature(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var type = String((body && body.type) || '').trim();
  if (type !== '시착' && type !== '계약') return { ok: false, error: '알 수 없는 요청입니다.' };
  return { ok: true, dataUrl: getSignatureDataUrl(code, type) || '' };
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
    var sigSaved = _saveSignature(code, '계약', (body && body.signature), now, CONTRACT.version);  // 손글씨 서명 저장
    var prev = _parseJsonSafe(cust.get('동의기록'));
    prev.계약 = {
      type: '계약서명',
      version: CONTRACT.version,
      signedAt: now,
      code: code,
      sentAt: String(cust.get('계약서발송일시') || ''),
      link: String(cust.get('계약서링크') || ''),
      effectHash: _termsHash([CONTRACT.effectNotice]),   // 동의한 효력 고지 문구 지문
      signatureSaved: sigSaved                           // 손글씨 서명 이미지 저장 여부(Signatures 시트)
    };
    var isSnapC = String(cust.get('상품타입') || '').trim() === '웨딩스냅';
    if (isSnapC) {                                        // 스냅: 계약금 20%를 계약 시 별도 입금(예약금 충당 없음) → 계약완료에서 입금 대기
      touchCustomer(sheet, colOf, cust.num, { '계약서명일시': now, '계약상태': '서명완료', '동의기록': JSON.stringify(prev) });
      setCustomerStage(code, 'contract');                 // 서명 → 계약완료(계약금 입금 카드 노출)
      return { ok: true, signedAt: now };
    }
    touchCustomer(sheet, colOf, cust.num, {
      '계약서명일시': now,
      '계약상태': '서명완료',
      '입금상태': '확인',                                  // 시그니처: 계약금 = 예약금으로 충당(계약 성립 시 추가 0원) → 자동 확인
      '동의기록': JSON.stringify(prev)
    });
    setCustomerStage(code, 'paid');                       // 시그니처: 서명 = 계약 성립 + 계약금(예약금 충당) → 입금완료(제작 준비)로 자동 진행
    return { ok: true, signedAt: now, autoPaid: true };
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

// ============================ 가격 엔진 (단일 출처) — Phase1 Step1-A ============================
// 예식일 → 평일/주말·공휴일 판별 → 총액 자동 제안. 관리자가 발송 시 최종 확정(보정 가능).
//   index.html 가격표와 동일: 시그니처 평일 210만·주말/공휴일 280만, 웨딩스냅 60만.
var PRICING = {
  '시그니처': { 평일: 2100000, 주말: 2800000 },
  '웨딩스냅': 600000
};
// 한국 공휴일 — 양력 고정일은 코드로 판별(항상 정확). 음력·대체공휴일만 연도별 목록.
//   ※ 음력(설·추석·석가탄신일)·대체공휴일은 매년 달라짐 → 연 1회 확인·갱신. 누락돼도 발송 시 관리자가 보정.
var HOLIDAYS_LUNAR = {
  '2025': ['2025-01-28', '2025-01-29', '2025-01-30', '2025-05-06', '2025-10-06', '2025-10-07', '2025-10-08'],
  '2026': ['2026-02-16', '2026-02-17', '2026-02-18', '2026-05-25', '2026-09-24', '2026-09-25', '2026-09-26'],
  '2027': ['2027-02-07', '2027-02-08', '2027-02-09', '2027-05-13', '2027-09-14', '2027-09-15', '2027-09-16']
};
function _isPublicHoliday(ymd) {
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!m) return false;
  var md = m[2] + '-' + m[3];
  if (['01-01', '03-01', '05-05', '06-06', '08-15', '10-03', '10-09', '12-25'].indexOf(md) >= 0) return true;  // 양력 고정
  return (HOLIDAYS_LUNAR[m[1]] || []).indexOf(m[0]) >= 0;   // 음력·대체(연도별)
}
function _isPremiumDay(ymd) {   // 주말 단가 적용일 = 토·일 또는 공휴일
  var m = String(ymd || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (!m) return false;
  var dow = new Date(+m[1], +m[2] - 1, +m[3]).getDay();   // 0=일 6=토
  return (dow === 0 || dow === 6) || _isPublicHoliday(ymd);
}
// 예식일+상품 → 제안 총액. 예식일 미정이면 null(관리자 직접 선택). {total, premium, reason, weddingYmd}
function suggestContractTotal(product, weddingYmd) {
  product = String(product || '').trim() || '시그니처';
  if (product === '웨딩스냅') return { total: PRICING['웨딩스냅'], premium: false, reason: '웨딩스냅 정가', weddingYmd: '' };
  var m = String(weddingYmd || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  var dow = new Date(+m[1], +m[2] - 1, +m[3]).getDay();
  var dowK = ['일', '월', '화', '수', '목', '금', '토'][dow];
  var prem = _isPremiumDay(weddingYmd);
  var why = (dow === 0 || dow === 6) ? ('주말 ' + dowK + '요일') : (_isPublicHoliday(weddingYmd) ? ('공휴일 ' + dowK + '요일') : ('평일 ' + dowK + '요일'));
  return { total: prem ? PRICING['시그니처'].주말 : PRICING['시그니처'].평일, premium: prem, reason: why, weddingYmd: weddingYmd };
}

// ============================ 02-4 · 계약금 입금 ============================
// 계약금 = 총액 20%(예약금 차감 후 납부) · 잔금 = 총액 80%(예식 N일 전, 1차는 안내 카피만).
//   ★ 잔금 시점은 PAYMENT.잔금일수전 단일 출처 — 7→14 수정 시 여기 한 곳만 고치면 전체 반영.
var PAYMENT = {
  예약금: 200000,
  계약금율: 0.1,       // 계약서 §4 — 계약금 10% (예약금으로 충당 → 계약 성립 시 추가 0원)
  중도금율: 0.4,       // 중도금 40% (+ 계약금 차액 합산)
  중도금일수전: 30,    // 중도금 기한 = 예식 D-30
  잔금일수전: 7        // 잔금 기한 = 예식 D-7 (라벨·카피 모두 이 값에서 파생)
};
function _balanceDueLabel() { return '예식 ' + PAYMENT.잔금일수전 + '일 전'; }
function _midDueLabel() { return '예식 ' + PAYMENT.중도금일수전 + '일 전'; }

// 계약총액 → 단계별 금액. 상품 분기: 시그니처=3단계(10/40/50·예약금 충당), 웨딩스냅=2단계(계약금20%·잔금80%, 중도금/충당 없음).
function _journeyAmounts(total, product) {
  var t = Math.round(Number(total) || 0);
  if (t <= 0) return null;
  if (String(product || '').trim() === '웨딩스냅') {        // 스냅 계약서 §4 — 2단계
    var dep = Math.round(t * 0.2);
    return { 총액: t, 계약금: dep, 예약금: 0, 납부액: dep, 중도금: 0, 중도금시점: '', 잔금: t - dep, 잔금시점: _balanceDueLabel() };
  }
  var 계약금 = Math.round(t * PAYMENT.계약금율);            // 10%
  var 중도금기본 = Math.round(t * PAYMENT.중도금율);        // 40%
  var 잔금 = t - 계약금 - 중도금기본;                       // 나머지(=50%, 반올림 흡수)
  var 차액 = Math.max(0, 계약금 - PAYMENT.예약금);          // 예약금으로 못 덮은 계약금 → 중도금 합산
  return {
    총액: t,
    계약금: 계약금,                                         // 명목 10%
    예약금: PAYMENT.예약금,
    납부액: 0,                                              // 계약 성립 시 추가 납부(예약금 충당·차액 이연) = 0원
    중도금: 중도금기본 + 차액,                              // 40% + 계약금 차액
    중도금시점: _midDueLabel(),
    잔금: 잔금,                                             // 50%
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
    amounts: _journeyAmounts(r.get('계약총액'), r.get('상품타입')),                            // {계약금,납부액,잔금,잔금시점,...} 또는 null
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : ''
  };
}

// ============================ 02-5 · 잔금 (결제 마일스톤 — 단계 아님) ============================
// 잔금 = 총액 80%. 예식 D-7 마감(미리 입금 가능). 상태: 대기→완료신호→확인(관리자 통장 대조).
//   현재단계는 안 바꿈 → 제작 편집 계속 가능. 계좌는 계약금과 동일(CONFIG.ACCOUNT).
function _balanceDDay(weddingDate) {
  var m = String(weddingDate || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return null;
  var w = new Date(+m[1], +m[2] - 1, +m[3]); w.setHours(0, 0, 0, 0);
  var today = new Date(); today.setHours(0, 0, 0, 0);
  return Math.round((w - today) / 86400000);   // 남은 일수(음수=지남)
}
// 마이페이지 잔금 카드 상태. 계약 서명완료 + 제작 단계에서 노출(확인이면 접힘).
function buildBalanceState(r) {
  if (!r) return null;
  if (String(r.get('계약상태') || '').trim() !== '서명완료') return null;
  if (['입금완료', '제작중', '예식완료'].indexOf(String(r.get('현재단계') || '').trim()) === -1) return null;
  var bStatus = String(r.get('잔금상태') || '').trim() || '대기';
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  var dday = _balanceDDay(r.get('예식일'));
  // 중도금과 함께 노출(예식 D-45 이내) — 중도금·잔금 동시 납부 희망 고객 대응. 또는 중도금 확인 후.
  if (bStatus !== '확인' && String(r.get('중도금상태') || '').trim() !== '확인' && !(dday != null && dday <= 45)) return null;
  return {
    status: bStatus,                                   // 대기 / 완료신호 / 확인
    confirmed: bStatus === '확인',
    payerName: String(r.get('잔금입금자명') || '').trim(),
    amount: amounts ? amounts['잔금'] : null,          // 잔금액(총액 80%) 또는 null
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : '',
    dday: dday,                                        // 예식까지 남은 일수(null=예식일 미정)
    due: (dday != null && dday <= PAYMENT.잔금일수전),  // D-7 이내(부각)
    dueLabel: _balanceDueLabel()
  };
}
// 잔금 입금 신호(고객). 단계 전이 없음·멱등.
function handleBalanceSignal(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var payer = String((body && body.payerName) || '').trim();
  if (!payer) return { ok: false, error: '입금자명을 입력해 주세요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('계약상태') || '').trim() !== '서명완료') return { ok: false, error: '계약 후 진행할 수 있어요.' };
    if (['입금완료', '제작중', '예식완료'].indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 잔금 단계가 아닙니다.' };
    if (String(cust.get('잔금상태') || '').trim() === '확인') return { ok: true, already: true };
    touchCustomer(sheet, colOf, cust.num, { '잔금입금자명': payer, '잔금입금신호': fmtKST(new Date()), '잔금상태': '완료신호' });
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// 관리자 잔금 확인(통장 대조). 단계 전이 없음.
function adminConfirmBalance(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (String(cust.get('잔금상태') || '').trim() === '확인') return { ok: true, already: true };
  touchCustomer(sheet, colOf, cust.num, { '잔금상태': '확인', '잔금확인일시': fmtKST(new Date()) });
  return { ok: true };
}
// ============================ 02-4b · 중도금 (결제 마일스톤 — 단계 아님) ============================
// 중도금 = 총액 40% + 계약금 차액. 예식 D-30 마감(미리 입금 가능). 상태: 대기→완료신호→확인(관리자 통장 대조).
//   계약금이 예약금 충당(0원)이므로 계약 후 첫 실결제. 단계 전이 없음. 계좌는 동일(CONFIG.ACCOUNT).
function buildMidState(r) {
  if (!r) return null;
  if (String(r.get('상품타입') || '').trim() === '웨딩스냅') return null;   // 스냅은 2단계(계약금·잔금) — 중도금 없음
  if (String(r.get('계약상태') || '').trim() !== '서명완료') return null;
  if (['입금완료', '제작중', '예식완료'].indexOf(String(r.get('현재단계') || '').trim()) === -1) return null;
  var mStatus = String(r.get('중도금상태') || '').trim() || '대기';
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  var dday = _balanceDDay(r.get('예식일'));
  // 결제 시기(D-45 이내) 또는 진행/완료일 때만 카드 노출 — 그 전엔 NEXT 자물쇠(인지)만. (중도금 due D-30)
  if (mStatus !== '완료신호' && mStatus !== '확인' && !(dday != null && dday <= 45)) return null;
  return {
    status: mStatus,                                   // 대기 / 완료신호 / 확인
    confirmed: mStatus === '확인',
    payerName: String(r.get('중도금입금자명') || '').trim(),
    amount: amounts ? amounts['중도금'] : null,        // 중도금액(40%+차액) 또는 null
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : '',
    dday: dday,
    due: (dday != null && dday <= PAYMENT.중도금일수전),  // D-30 이내(부각)
    dueLabel: _midDueLabel()
  };
}
// 중도금 입금 신호(고객). 단계 전이 없음·멱등.
function handleMidSignal(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var payer = String((body && body.payerName) || '').trim();
  if (!payer) return { ok: false, error: '입금자명을 입력해 주세요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('계약상태') || '').trim() !== '서명완료') return { ok: false, error: '계약 후 진행할 수 있어요.' };
    if (['입금완료', '제작중', '예식완료'].indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 중도금 단계가 아닙니다.' };
    if (String(cust.get('중도금상태') || '').trim() === '확인') return { ok: true, already: true };
    var _upd = { '중도금입금자명': payer, '중도금입금신호': fmtKST(new Date()), '중도금상태': '완료신호' };
    // 잔금 함께 결제(합계) — 고객이 중도금 카드에서 '잔금도 함께'를 선택. 잔금이 아직 확인 전이면 같은 입금신호로 처리.
    if (body && body.withBalance && String(cust.get('잔금상태') || '').trim() !== '확인') {
      _upd['잔금입금자명'] = payer; _upd['잔금입금신호'] = fmtKST(new Date()); _upd['잔금상태'] = '완료신호';
    }
    touchCustomer(sheet, colOf, cust.num, _upd);
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// 관리자 중도금 확인(통장 대조). 단계 전이 없음.
function adminConfirmMid(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (String(cust.get('중도금상태') || '').trim() === '확인') return { ok: true, already: true };
  touchCustomer(sheet, colOf, cust.num, { '중도금상태': '확인', '중도금확인일시': fmtKST(new Date()) });
  return { ok: true };
}

// [트리거·일1회] 예식 D-7 이내 + 미확인 + 미발송 → 잔금 리마인드 메일 1회.
function sendBalanceReminders() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  if (!colOf['잔금상태'] || !colOf['잔금리마인드'] || !colOf['예식일']) return;   // 마이그레이션 전이면 중단
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var c = function (h) { return colOf[h]; };
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i];
    if (String(row[c('계약상태') - 1] || '').trim() !== '서명완료') continue;
    if ((String(row[c('잔금상태') - 1] || '').trim() || '대기') === '확인') continue;
    if (['입금완료', '제작중', '예식완료'].indexOf(String(row[c('현재단계') - 1] || '').trim()) === -1) continue;
    if (String(row[c('잔금리마인드') - 1] || '').trim()) continue;            // 이미 보냄
    var dday = _balanceDDay(row[c('예식일') - 1]);
    if (dday == null || dday > PAYMENT.잔금일수전) continue;                  // D-7 밖
    var email = String(row[c('이메일') - 1] || '').trim();
    if (email) {
      try {
        var amounts = _journeyAmounts(row[c('계약총액') - 1]);
        var amtTxt = amounts ? (Number(amounts['잔금']).toLocaleString() + '원') : '잔금';
        GmailApp.sendEmail(email, '[Moment Edit] 잔금 안내 (예식 ' + (dday >= 0 ? 'D-' + dday : '지남') + ')',
          '예식이 다가옵니다.\n잔금 ' + amtTxt + '을 ' + _balanceDueLabel() + '까지 입금 부탁드립니다.\n마이페이지에서 계좌·금액을 확인하실 수 있습니다.\n\nMoment Edit');
      } catch (e) {}
    }
    sheet.getRange(P.DATA_START_ROW + i, c('잔금리마인드')).setValue(fmtKST(new Date()));
  }
}
function setupBalanceReminderTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sendBalanceReminders') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('sendBalanceReminders').timeBased().everyDays(1).atHour(10).create();
  return '잔금 리마인드 트리거(매일 10시) 등록 완료';
}
// [1회 실행] Customers에 잔금·예식일 컬럼 추가(멱등).
function addBalanceColumns() {
  var sheet = getCustomersSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var need = ['예식일', '잔금상태', '잔금입금자명', '잔금입금신호', '잔금확인일시', '잔금리마인드'], added = [];
  need.forEach(function (h) { if (headers.indexOf(h) === -1) { sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h); added.push(h); } });
  return added.length ? ('추가됨: ' + added.join(', ')) : '이미 모두 있음';
}
