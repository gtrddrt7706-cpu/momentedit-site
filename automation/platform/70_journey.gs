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
  version: '시착동의-v3',   // v3(2026-06-12): 계약 미진행 시에도 벌수 비례 공제로 통일(약관 심사 — 전액 몰취 문언은 계약서 4조⑧ 비례 원칙과 모순·과중 위험). 서명 시점 스냅샷이라 구버전 서명자는 그 버전 유지
  title: '드레스 시착 동의서',
  기본벌수: 3,
  추가벌비용: 70000,   // 4벌째부터 1벌당
  예약금: 200000,
  terms: [
    '드레스 시착은 3벌까지 포함됩니다. (4벌째부터 1벌당 70,000원)',
    '예약금 200,000원은 계약을 진행하시면 계약금의 일부로 전환됩니다.',
    '드레스 시착 후 계약을 진행하지 않으시면, 실제 진행한 벌수만큼(1벌당 70,000원 · 최대 200,000원) 예약금이 시착 비용으로 공제되고 나머지는 전액 환불됩니다. (시착 전 취소는 전액 환불)',
    '계약을 진행하신 뒤 청약철회(이용계약서 제7조 제1항의 기간 내)나 무상취소(예식 150일 전까지)로 전액 환급을 받으시는 경우에도, 시착이 이미 진행되었다면 진행한 벌수만큼(1벌당 70,000원 · 최대 200,000원) 시착 비용으로 공제되고 나머지는 전액 환급됩니다. (이용계약서 제4조 제8항 · 제7조, 「전자상거래법」 제17조 제2항 제5호)'
  ],
  gateNotice: '서명하면 드레스 시착이 진행됩니다.',
  reviewNote: '서명 후에도 계약서 서명 전까지 다시 확인하실 수 있습니다.',
  nextNotice: '드레스 시착 후, 계약서를 24시간 내에 이 마이페이지로 보내드려요.'   // [③-2] 다음 단계 예고
};

// 버전별 동의 전문 — 서명 '당시' 문구로 문서를 재현하기 위한 원문 보존(동의기록.termsHash 검증 짝).
var FITTING_TERMS_BY_VERSION = {
  '시착동의-v1': [
    '드레스 시착은 3벌까지 포함됩니다. (4벌째부터 1벌당 70,000원)',
    '예약금 200,000원은 계약을 진행하시면 계약금의 일부로 전환됩니다.',
    '드레스 시착 후 계약을 진행하지 않으시면 예약금은 시착비로 전환되어 환불되지 않습니다. (시착 전 취소는 전액 환불)'
  ],
  '시착동의-v2': [
    '드레스 시착은 3벌까지 포함됩니다. (4벌째부터 1벌당 70,000원)',
    '예약금 200,000원은 계약을 진행하시면 계약금의 일부로 전환됩니다.',
    '드레스 시착 후 계약을 진행하지 않으시면 예약금은 시착비로 전환되어 환불되지 않습니다. (시착 전 취소는 전액 환불)',
    '계약을 진행하신 뒤 청약철회(이용계약서 제7조 제1항의 기간 내)나 무상취소(예식 150일 전까지)로 전액 환급을 받으시는 경우에도, 시착이 이미 진행되었다면 진행한 벌수만큼(1벌당 70,000원 · 최대 200,000원) 시착 비용으로 공제되고 나머지는 전액 환급됩니다. (이용계약서 제4조 제8항 · 제7조)'
  ],
  '시착동의-v3': FITTING_CONSENT.terms
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
    var _prevFit = prev.시착 || {};                      // 기존 시착 객체 — 벌수 등 서명 외 기록 보존
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
    if (_prevFit.벌수 != null) { prev.시착.벌수 = _prevFit.벌수; prev.시착.벌수기록 = _prevFit.벌수기록 || now; }   // 서명 전 기록된 벌수 보존(가드로 막지만 이중 안전)
    touchCustomer(sheet, colOf, cust.num, {
      '시착동의일시': now,
      '시착동의상태': '동의완료',
      '동의기록': JSON.stringify(prev)
    });
    notifyKakao('admin.fittingSigned', code);   // 관리자: 시착 동의 서명 완료 · 상담완료 처리 인지(카톡)
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
  var _fitCnt = (_parseJsonSafe(r.get('동의기록')).시착 || {}).벌수;
  return {
    signed: signed,                 // 서명 완료 여부
    signedAt: signedAt,             // 서명 일시(표시용)
    벌수: (_fitCnt != null ? Number(_fitCnt) : null),   // 관리자가 기록한 실제 시착 벌수(비례 공제 근거·고객 확인용)
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
  return 'Signatures 시트 준비 완료 · 시착·본계약 서명이 여기 누적 저장됩니다.';
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
  docVersion: 'v1.2',               // 계약서 '문서' 버전(시그니처) — 서명 시 동의기록.계약.docVersion으로 스냅샷, 열람은 그 버전 문서로
  snapDocVersion: 'snap-v1.1',      // 웨딩스냅 계약서 문서 버전 — 동일 메커니즘(구버전 서명자는 archive 보존본으로 열람)
  서명기한시간: 72,                 // 발송 +72h 안에 서명
  리마인드시간: 24,                 // 마감 24h 전 리마인드(1차=마이페이지 표시, 알림톡 2차)
  effectNotice: '서명하면 계약이 성립해요. 서명 자체는 되돌릴 수 없지만, 제7조 청약철회·무상취소는 그대로 가능해요.',
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
    // 예식 슬롯 점유 가드 — 서명=점유 확정. 같은 예식일·슬롯을 다른 서명완료 고객이 선점했으면 차단(더블부킹 0·시그니처).
    if (String(cust.get('상품타입') || '').trim() !== '웨딩스냅') {
      var _rec0 = _parseJsonSafe(cust.get('동의기록'));
      var _wY = _ymdOf(cust.get('예식일')), _wT = (_rec0.계약정보 && _rec0.계약정보.weddingTime) || '';
      if (_wY && _wT && _weddingSlotTaken(sheet, colOf, _wY, _wT, code)) {
        return { ok: false, error: '선택하신 예식 시간이 방금 마감됐어요. 디렉터가 다른 시간을 안내드릴게요.' };
      }
    }

    var now = fmtKST(new Date());
    var sigSaved = _saveSignature(code, '계약', (body && body.signature), now, CONTRACT.version);  // 손글씨 서명 저장
    var prev = _parseJsonSafe(cust.get('동의기록'));
    prev.계약 = {
      type: '계약서명',
      version: CONTRACT.version,
      docVersion: (String(cust.get('상품타입') || '').trim() === '웨딩스냅') ? CONTRACT.snapDocVersion : CONTRACT.docVersion,   // 서명한 계약서 문서 버전(16조③ 버전 고정의 데이터 짝)
      signedAt: now,
      code: code,
      sentAt: String(cust.get('계약서발송일시') || ''),
      link: String(cust.get('계약서링크') || ''),
      effectHash: _termsHash([CONTRACT.effectNotice]),   // 동의한 효력 고지 문구 지문
      signatureSaved: sigSaved                           // 손글씨 서명 이미지 저장 여부(Signatures 시트)
    };
    try {   // 서명본 자동 보관 · 채워진+서명된 계약서 HTML을 구글 드라이브에 저장(베스트에포트, 실패해도 서명은 성공). ※ 재배포 시 Drive 권한 승인 필요.
      var _ah = String((body && body.archiveHtml) || '');
      if (_ah && _ah.length < 3000000) {
        var _an = (String((body && body.archiveName) || '').replace(/[\/\\:*?"<>|\n\r\t]/g, '_').trim().slice(0, 120)) || ('계약서_' + code);
        var _fs = DriveApp.getFoldersByName('모먼트에디트 계약서 서명본');
        var _fd = _fs.hasNext() ? _fs.next() : DriveApp.createFolder('모먼트에디트 계약서 서명본');
        _fd.createFile(_an + '.html', _ah, 'text/html');
      }
    } catch (e) { Logger.log('계약서 자동 보관 실패: ' + (e && e.message)); }
    var isSnapC = String(cust.get('상품타입') || '').trim() === '웨딩스냅';
    if (isSnapC) {                                        // 스냅: 계약금 20%를 계약 시 별도 입금(예약금 충당 없음) → 계약완료에서 입금 대기
      touchCustomer(sheet, colOf, cust.num, { '계약서명일시': now, '계약상태': '서명완료', '동의기록': JSON.stringify(prev) });
      setCustomerStage(code, 'contract');                 // 서명 → 계약완료(계약금 입금 카드 노출)
      notifyKakao('admin.contractSigned', code, { product: '웨딩스냅' });   // 관리자: 계약 서명 완료(카톡)
      return { ok: true, signedAt: now };
    }
    touchCustomer(sheet, colOf, cust.num, {
      '계약서명일시': now,
      '계약상태': '서명완료',
      '입금상태': '확인',                                  // 시그니처: 계약금 = 예약금으로 충당(계약 성립 시 추가 0원) → 자동 확인
      '동의기록': JSON.stringify(prev)
    });
    setCustomerStage(code, 'paid');                       // 시그니처: 서명 = 계약 성립 + 계약금(예약금 충당) → 입금완료(제작 준비)로 자동 진행
    notifyKakao('admin.contractSigned', code, { product: '시그니처', autoPaid: true });   // 관리자: 계약 서명 완료(카톡)
    return { ok: true, signedAt: now, autoPaid: true };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [02-2.5] 고객이 예식일·계약 당사자 정보 입력 + 계약서 요청 (상담완료). 예식일=톱레벨 컬럼, 나머지=동의기록.계약정보.
//   이후: 관리자가 이 정보로 계약서 자동 완성 → 확인·발송. 계약일 별도 문의 불요.
// [02-2.5] 예식(시그니처) 슬롯 — 하루 3타임(엑셀 진행순서 기준). 각 140분(도착~환복). 평일·주말 동일.
var WEDDING_SLOT = {
  SLOTS: ['09:00', '12:20', '15:40'],
  LABELS: { '09:00': '오전', '12:20': '오후', '15:40': '늦은 오후' },
  DURATION: 140
};
// 한 행이 점유하는 (예식일, 슬롯) — ① 서명완료(확정 점유) ② 임시고정 승인(동의기록.가예약). 점유 없으면 null.
function _weddingOccupancy(topWedYmd, contractStatus, stage, rcStr) {
  if (stage === '취소' || stage === '노쇼' || stage === '미계약') return null;
  var rc = {}; try { rc = JSON.parse(rcStr || '{}'); } catch (e) {}
  if (String(contractStatus || '').trim() === '서명완료') {                       // 확정 점유 = 서명완료 + 예식일(톱레벨) + 슬롯
    var d = _ymdOf(topWedYmd), t = (rc.계약정보 && rc.계약정보.weddingTime) || '';
    if (/^\d{4}-\d{2}-\d{2}$/.test(d) && t) return { date: d, slot: t };
  }
  if (rc.가예약 && rc.가예약.status === '승인' && /^\d{4}-\d{2}-\d{2}$/.test(rc.가예약.date || '') && rc.가예약.slot
      && !(rc.가예약.expires && _ymdNum(_ymdOf(new Date())) > _ymdNum(rc.가예약.expires))) {   // 만료된 홀드는 점유 자동해제
    return { date: rc.가예약.date, slot: rc.가예약.slot };                         // 임시고정(관리자 승인) 점유
  }
  return null;
}
// 같은 (예식일·슬롯)을 다른 고객이 점유(서명완료 또는 임시고정 승인)했나 — 요청·서명 시 더블부킹 차단.
function _weddingSlotTaken(sheet, colOf, ymd, slot, exceptCode) {
  if (!ymd || !slot) return false;
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return false;
  var wCol = colOf['예식일'], cCol = colOf['계약상태'], stCol = colOf['현재단계'], recCol = colOf['동의기록'], codeCol = colOf['개인코드'];
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  exceptCode = String(exceptCode || '').trim().toUpperCase();
  for (var i = 0; i < vals.length; i++) {
    if (codeCol && String(vals[i][codeCol - 1] || '').trim().toUpperCase() === exceptCode) continue;
    var occ = _weddingOccupancy(vals[i][wCol - 1], vals[i][cCol - 1], String(vals[i][stCol - 1] || '').trim(), vals[i][recCol - 1]);
    if (occ && occ.date === ymd && occ.slot === slot) return true;
  }
  return false;
}
// 예식 슬롯 실시간 가용 — 점유(서명완료·임시고정 승인)된 (예식일→슬롯목록). 계약요청 캘린더 차단 표시용.
function handleWeddingAvailability(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var last = sheet.getLastRow(), taken = {};
    var myCode = String(s.row.get('개인코드') || '').trim().toUpperCase();
    if (last >= P.DATA_START_ROW) {
      var wCol = colOf['예식일'], cCol = colOf['계약상태'], stCol = colOf['현재단계'], recCol = colOf['동의기록'], codeCol = colOf['개인코드'];
      var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
      vals.forEach(function (row) {
        if (codeCol && String(row[codeCol - 1] || '').trim().toUpperCase() === myCode) return;   // 본인 건 제외
        var occ = _weddingOccupancy(row[wCol - 1], row[cCol - 1], String(row[stCol - 1] || '').trim(), row[recCol - 1]);
        if (!occ) return;
        (taken[occ.date] = taken[occ.date] || []); if (taken[occ.date].indexOf(occ.slot) === -1) taken[occ.date].push(occ.slot);
      });
    }
    return { ok: true, taken: taken, slots: WEDDING_SLOT.SLOTS, labels: WEDDING_SLOT.LABELS };
  } catch (e) { return { ok: true, taken: {}, slots: WEDDING_SLOT.SLOTS, labels: WEDDING_SLOT.LABELS }; }
}
// [임시고정 셀프 관리] 변경 — 새 날짜·슬롯으로 '요청' 재등록(승인됐던 것도 디렉터 재확인). 점유 검증은 요청 생성과 동일.
function handleChangeWeddingHold(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var d = String((body && body.date) || '').trim(), t = String((body && body.slot) || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) return { ok: false, error: '예식 날짜를 선택해 주세요.' };
  if (WEDDING_SLOT.SLOTS.indexOf(t) === -1) return { ok: false, error: '예식 시간을 선택해 주세요.' };
  if (_ymdNum(d) < _ymdNum(_kstYmd(new Date()))) return { ok: false, error: '예식일은 오늘 이후로 선택해 주세요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);                 // 락 안 최신 재읽기 — s.row 스냅샷을 쓰면 그 사이 관리자가 쓴 영수증발행 등이 통째 유실됨
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var rec = _parseJsonSafe(cust.get('동의기록'));
    if (!rec.가예약 || (rec.가예약.status !== '요청' && rec.가예약.status !== '승인')) return { ok: false, error: '변경할 임시 고정이 없습니다.' };
    if (rec.가예약.date === d && rec.가예약.slot === t) return { ok: true, same: true };
    if (_weddingSlotTaken(sheet, colOf, d, t, code)) return { ok: false, error: '그 시간은 지금 선택이 어려워요. 다른 시간을 선택해 주세요.' };
    rec.가예약 = { date: d, slot: t, status: '요청', at: fmtKST(new Date()) };
    touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
    _recordHandler(code, '고객 예식일 임시고정 변경 요청 · ' + d + ' ' + t);
    notifyKakao('admin.holdRequest', code, { date: d, slot: t });   // 관리자: 재승인 필요
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// [임시고정 셀프 관리] 취소 — 가예약 제거(슬롯 반환) + 관리자 인지.
function handleCancelWeddingHold(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);                 // 락 안 최신 재읽기 — 가예약 외 키(영수증발행 등) 보존
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var rec = _parseJsonSafe(cust.get('동의기록'));
    if (!rec.가예약) return { ok: true, already: true };
    var _d = rec.가예약.date, _s2 = rec.가예약.slot;
    delete rec.가예약;
    touchCustomer(sheet, colOf, cust.num, { '동의기록': Object.keys(rec).length ? JSON.stringify(rec) : '' });
    _recordHandler(code, '고객 예식일 임시고정 취소 · ' + (_d || '') + ' ' + (_s2 || ''));
    notifyStudio('[플랫폼] 예식일 임시고정 고객 취소', code + ' · ' + (_d || '') + ' ' + (_s2 || ''));
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
function handleRequestContract(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var info = (body && body.info) || {};
  var wed = String(info.weddingDate || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(wed)) return { ok: false, error: '예식일을 선택해 주세요.' };
  var todayNum = _ymdNum(_kstYmd(new Date())), wedNum = _ymdNum(wed);
  if (wedNum != null && todayNum != null && wedNum < todayNum) return { ok: false, error: '예식일은 오늘 이후로 선택해 주세요.' };
  var wT = String(info.weddingTime || '').trim();
  if (WEDDING_SLOT.SLOTS.indexOf(wT) === -1) return { ok: false, error: '예식 시간대를 선택해 주세요.' };
  var gB = String(info.groomBirth || '').trim(), bB = String(info.brideBirth || '').trim();
  var gA = String(info.groomAddr || '').trim(), bA = String(info.brideAddr || '').trim();
  if (!gB || !bB) return { ok: false, error: '신랑·신부 생년월일을 입력해 주세요.' };
  if (!gA || !bA) return { ok: false, error: '신랑·신부 주소를 입력해 주세요.' };
  if (info.consent !== true && String(info.consent) !== 'true') return { ok: false, error: '개인정보 수집·이용에 동의해 주세요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('현재단계') || '').trim() !== '상담완료') return { ok: false, error: '아직 계약서 요청 단계가 아닙니다.' };
    var _cs = String(cust.get('계약상태') || '').trim();
    if (_cs === '발송' || _cs === '서명완료') return { ok: false, error: '이미 계약이 진행 중입니다.' };   // '미발송'(가입 기본값·만료 후)은 재요청 허용
    if (_weddingSlotTaken(sheet, colOf, wed, wT, code)) return { ok: false, error: '선택하신 예식 시간이 이미 마감됐어요. 다른 날짜·시간을 선택해 주세요.' };
    var rec = _parseJsonSafe(cust.get('동의기록'));
    // [임시고정 연동] 요청한 예식 일정이 잡아둔 가예약과 다르면 — 이제 요청이 기준이므로 가예약 자동 해제(다른 슬롯이 몰래 점유로 남지 않게). 같으면 서명 전까지 슬롯 보호용으로 유지.
    if (rec.가예약 && (rec.가예약.date !== wed || rec.가예약.slot !== wT)) {
      var _ohd = rec.가예약.date, _ohs = rec.가예약.slot;
      delete rec.가예약;
      try { _recordHandler(code, '계약 요청 일정(' + wed + ' ' + wT + ')과 달라 임시고정 자동 해제 · ' + (_ohd || '') + ' ' + (_ohs || '')); } catch (e) {}
    }
    rec.계약정보 = { groomBirth: gB, brideBirth: bB, groomAddr: gA, brideAddr: bA,
      groomAddrRoad: String(info.groomAddrRoad || '').trim(), groomAddrDetail: String(info.groomAddrDetail || '').trim(),   // 분리 원본 · 폼 재수정 시 상세주소 칸 복원(계약서는 합본 groomAddr 사용)
      brideAddrRoad: String(info.brideAddrRoad || '').trim(), brideAddrDetail: String(info.brideAddrDetail || '').trim(),
      weddingDate: wed, weddingTime: wT, groomPhone: String(info.groomPhone || '').trim(), groomEmail: String(info.groomEmail || '').trim(), bridePhone: String(info.bridePhone || '').trim(), brideEmail: String(info.brideEmail || '').trim(), requestedAt: fmtKST(new Date()), privacyConsentAt: fmtKST(new Date()) };
    var _cr = String(info.cashReceipt || '').replace(/[^0-9]/g, '').slice(0, 30); if (_cr) rec.현금영수증 = _cr;   // 현금영수증 발급번호(선택) · 계약 충당분·중도금·잔금 발급에 공통 사용
    touchCustomer(sheet, colOf, cust.num, { '예식일': wed, '동의기록': JSON.stringify(rec) });  // 예식일=돈 계산 기준·슬롯 점유 · 당사자 정보=계약서 자동기입용
    notifyKakao('admin.contractReq', code, { weddingDate: wed });   // 관리자: 계약서 요청됨 · 발송 필요(카톡)
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// [02-2.5] 상담완료 단계 — 계약 정보 입력/요청 카드 상태. 계약 발송 후엔 null(계약 카드가 대체).
function buildContractInfoState(r) {
  if (!r) return null;
  if (String(r.get('현재단계') || '').trim() !== '상담완료') return null;
  var _cs = String(r.get('계약상태') || '').trim();
  if (_cs === '발송' || _cs === '서명완료') return null;   // 발송/서명완료 → 계약 카드로 ('미발송'=가입 기본값·만료 후 → 요청 폼 유지)
  var rec = _parseJsonSafe(r.get('동의기록'));
  var ci = rec.계약정보 || null;
  return {
    requested: !!ci,
    groom: String(r.get('신랑이름') || ''), bride: String(r.get('신부이름') || ''),
    phone: String(r.get('연락처') || ''), email: String(r.get('이메일') || ''),
    weddingDate: ci ? (ci.weddingDate || '') : _ymdOf(r.get('예식일')),
    weddingTime: ci ? (ci.weddingTime || '') : '',
    groomBirth: ci ? (ci.groomBirth || '') : '', brideBirth: ci ? (ci.brideBirth || '') : '',
    groomAddr: ci ? (ci.groomAddr || '') : '', brideAddr: ci ? (ci.brideAddr || '') : '',
    groomAddrRoad: ci ? (ci.groomAddrRoad || '') : '', groomAddrDetail: ci ? (ci.groomAddrDetail || '') : '',
    brideAddrRoad: ci ? (ci.brideAddrRoad || '') : '', brideAddrDetail: ci ? (ci.brideAddrDetail || '') : '',
    cashReceipt: _cashReceiptOf(r),
    requestedAt: ci ? (ci.requestedAt || '') : ''
  };
}

// [02-3b] 계약서 재발송 요청(고객) — 서명 기한 만료 화면의 버튼. 발송 자체는 관리자(adminSendContract)가 수행, 여기선 요청 기록+알림만.
function handleRequestContractResend(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var cs = String(s.row.get('계약상태') || '').trim();
  if (cs === '서명완료') return { ok: false, error: '이미 서명이 완료된 계약이에요.' };
  if (cs !== '발송' && cs !== '미발송') return { ok: false, error: '재발송을 요청할 계약서가 없어요.' };
  _recordHandler(code, '고객 계약서 재발송 요청');
  try { notifyStudio('[플랫폼] 계약서 재발송 요청 (' + code + ')', code + ' · 고객이 만료된 계약서의 재발송을 요청했어요.'); } catch (e) {}
  notifyKakao('admin.contractReq', code, { weddingDate: _ymdOf(s.row.get('예식일')) });   // 관리자: 계약서 발송 필요(기존 키 재사용)
  return { ok: true };
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
  // [02-3 Phase2] 마이페이지 인뷰어(openContractView)가 v1-1 계약서를 고객 정보로 채우도록 표시 필드만 노출(동의기록 JSON 원본은 비노출).
  var _rec = _parseJsonSafe(r.get('동의기록'));
  var _isSnapR = String(r.get('상품타입') || '').trim() === '웨딩스냅';
  var _ci = (_rec && _rec.계약정보) || {};
  out.fill = {
    groom: String(r.get('신랑이름') || ''),
    bride: String(r.get('신부이름') || ''),
    groomBirth: _ci.groomBirth || '',
    brideBirth: _ci.brideBirth || '',
    groomAddr: _ci.groomAddr || '',
    brideAddr: _ci.brideAddr || '',
    groomPhone: _ci.groomPhone || String(r.get('연락처') || ''),   // 신랑 연락처(미입력 시 가입 계정값으로 폴백)
    groomEmail: _ci.groomEmail || String(r.get('이메일') || ''),
    bridePhone: _ci.bridePhone || '',                              // 신부 연락처(계약정보 입력분)
    brideEmail: _ci.brideEmail || '',
    weddingDate: _ymdOf(r.get('예식일')) || (_ci.weddingDate || ''),
    weddingTime: _ci.weddingTime || '',
    weddingTimeLabel: (WEDDING_SLOT.LABELS && WEDDING_SLOT.LABELS[_ci.weddingTime]) || '',
    total: Math.round(Number(r.get('계약총액')) || 0),
    docVersion: signed ? (((_rec && _rec.계약) || {}).docVersion || (_isSnapR ? 'snap-v1.0' : 'v1.1'))
                       : (_isSnapR ? CONTRACT.snapDocVersion : CONTRACT.docVersion)   // 서명자=서명 당시 문서(기록 없는 구서명자는 각 v1.1/snap-v1.0 보존본), 미서명=현행
    // 서명상태(signed/체결일/손글씨)는 마이페이지가 기존 c.signed·c.signedAt·getSignature로 직접 채움 → 여기서 안 보냄(부하↓)
  };
  return out;
}

// [02-3] 시간 트리거 — 계약서 미서명 기한(발송+72h) 경과분 자동 파기(계약상태→미발송, 링크·발송일시 비움 + 이력).
//   ※ '자동 취소'의 여정/환불(예약금) 처리는 취소·환불 흐름에서 결정 — 여기선 계약서 offer만 파기(재발송 가능),
//      현재단계는 건드리지 않는다(상담완료 유지). 운영자: 시간 기반 트리거로 1일 1회 설치.
function expireUnsignedContracts() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return 0; }   // 락: 고객 서명(handleSignContract)과 경쟁 방지 · 스냅샷 후 서명분이 '미발송'으로 덮이는 것 차단(다음 트리거에서 재시도)
  try {
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
  } finally { try { lock.releaseLock(); } catch (e) {} }
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
  계약금율: 0.1,       // 계약서 §4 · 계약금 10% (예약금으로 충당 → 계약 성립 시 추가 0원)
  중도금율: 0.4,       // 중도금 40% (+ 계약금 차액 합산)
  중도금일수전: 149,   // 중도금 기한 = 예식 D-149(무료 취소 종료·일정 확정 시) — 위약금 전 구간이 기수령액으로 커버되도록(2026-06-12 결정)
  잔금일수전: 9        // 잔금 기한 = 예식 D-9 (9~1일 전 위약 50% 구간을 잔금 수령으로 커버 · 라벨·카피 파생)
};
function _balanceDueLabel() { return '예식 ' + PAYMENT.잔금일수전 + '일 전'; }
function _midDueLabel() { return '예식 ' + PAYMENT.중도금일수전 + '일 전'; }
// 임박 계약(예식 149일 이내 성립) 대응 — 기한이 이미 지난 고객에겐 과거 날짜 대신 '계약 시 함께 납부'로 표기(계약서 4조④ 단서와 일치).
function _midDuePast(r) {
  var d = _shiftYmd(r.get('예식일'), -PAYMENT.중도금일수전);
  if (!d) return false;
  var today = _ymdOf(fmtKST(new Date()));
  return today && d < today;   // 둘 다 YYYY-MM-DD 패딩이라 문자열 비교 안전
}
function _midDueLabelFor(r) { return _midDuePast(r) ? '계약 시 함께 납부' : _midDueLabel(); }
function _midDueDateFor(r) { return _midDuePast(r) ? '' : _shiftYmd(r.get('예식일'), -PAYMENT.중도금일수전); }

// 계약총액 → 단계별 금액. 상품 분기: 시그니처=3단계(10/40/50·예약금 충당), 웨딩스냅=2단계(계약금20%·잔금80%, 중도금/충당 없음).
function _journeyAmounts(total, product) {
  var t = Math.round(Number(total) || 0);
  if (t <= 0) return null;
  if (String(product || '').trim() === '웨딩스냅') {        // 스냅 계약서 §4 · 2단계
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

// ============================ 02-8 · 환불 예상액 (계약서 v1-1 §7·§9·§4⑧ 단일 구현) ============================
// 시그니처 전용 — 웨딩스냅 계약서는 위약 구조가 달라 null. r=Customers 행 래퍼 · asOfYmd=기준일(YYYY-MM-DD · 없으면 오늘 KST).
//   기수령액(paid) = 입금 '확인'된 것만(완료신호 제외): 예약금 200,000(Customers 입금상태=확인, 계약 전엔 Bookings 입금확인 폴백)
//                   + 중도금·잔금(각 상태=확인 시 _journeyAmounts 금액).
//   시착 공제(4조⑧) = 진행 벌수 × 70,000원(최대 200,000원=예약금). 동의완료인데 벌수 미기록이면 공제 0으로 계산 + needCount 플래그.
//   분기: ① 계약 전(서명 전) → 위약금 없음 · 시착비만 공제(시착동의 v3 비례 원칙)
//        ② 청약철회(7조①) → 계약 성립일부터 15일 이내 + 예식 전일(dd>=1)까지 · 전액 환급에서 시착비만 공제 · 위약금 표보다 우선(4조④ 단서)
//        ③ 무상취소(7조②) → 예식일 150일 전까지(dd>=150) · 전액 환급에서 시착비만 공제
//        ④ 위약금(9조②) → 총 계약금액 기준 D-149~60 10% · 59~30 20% · 29~10 40% · 9~1 50% · 당일 이후 70%.
//           이 구간에선 시착비를 추가 차감하지 않는다(9조⑤ 위약금에 흡수 · 중복 공제 금지 — fitDeduct는 표시용으로만 반환).
//   반환: {paid, fitCount, fitDeduct, needCount, penalty, rate, rule, refund, dd, asOf}
//        / {pending:true}(계약 후 총액·예식일 미정 — 견적 불가) / null(스냅·행 없음).
function _refundQuote(r, asOfYmd) {
  if (!r) return null;
  if (String(r.get('상품타입') || '').trim() === '웨딩스냅') return null;   // 시그니처 전용
  var asOf = _ymdOf(asOfYmd) || _kstYmd(new Date());

  // 기수령액 — 예약금(상담 시 입금). 계약 전엔 Customers 입금상태가 비어 있으므로 Bookings 입금확인으로 폴백(_cashReceiptLedger와 동일 패턴).
  var depConfirmed = String(r.get('입금상태') || '').trim() === '확인';
  if (!depConfirmed && typeof findRowByPersonalCode === 'function') {
    try {
      var bk = findRowByPersonalCode(String(r.get('개인코드') || '').trim());
      if (bk && String(bk.get('입금확인') || '').trim() === '확인') depConfirmed = true;
    } catch (e) {}
  }
  var paid = depConfirmed ? PAYMENT.예약금 : 0;

  // 시착 공제(4조⑧) — 관리자가 기록한 실제 벌수(동의기록.시착.벌수) 기준. 1벌당 70,000원 · 최대 200,000원.
  var _fit = _parseJsonSafe(r.get('동의기록')).시착 || {};
  var fitCount = (_fit.벌수 != null && _fit.벌수 !== '' && !isNaN(Number(_fit.벌수))) ? Number(_fit.벌수) : null;
  var needCount = (fitCount == null) && String(r.get('시착동의상태') || '').trim() === '동의완료';   // 시착했는데 벌수 미기록 → 산정 보류 플래그
  var fitDeduct = Math.min((fitCount || 0) * FITTING_CONSENT.추가벌비용, PAYMENT.예약금);

  function out(rule, rate, penalty, refund, dd) {   // paid는 클로저 — 중도금·잔금 가산 후 호출돼도 최신값
    return { paid: paid, fitCount: (fitCount == null ? 0 : fitCount), fitDeduct: fitDeduct, needCount: needCount,
             penalty: penalty, rate: rate, rule: rule, refund: Math.max(0, refund), dd: dd, asOf: asOf };
  }

  // ① 계약 전(계약상태!=서명완료) — 위약금 없음. 예약금에서 시착비만 공제(시착 전 취소는 전액 환불).
  if (String(r.get('계약상태') || '').trim() !== '서명완료') return out('계약 전', 0, 0, paid - fitDeduct, null);

  // 계약 후 — 총액·예식일이 있어야 구간 산정 가능. 미정(이례 데이터)이면 견적 보류.
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  if (!amounts) return { pending: true };
  if (String(r.get('중도금상태') || '').trim() === '확인') paid += amounts.중도금;
  if (String(r.get('잔금상태') || '').trim() === '확인') paid += amounts.잔금;
  var dd = _dayDiff(_ymdOf(r.get('예식일')), asOf);   // 예식까지 남은 일수(D-dd · 0=당일 · 음수=지남)
  if (dd == null) return { pending: true };

  // ② 7조① 청약철회 — 계약 성립일부터 15일 이내, 예식 용역 개시 전(예식 전일=dd>=1)까지.
  var signYmd = _ymdOf(r.get('계약서명일시'));
  if (signYmd && asOf <= _shiftYmd(signYmd, 15) && dd >= 1) return out('청약철회(7조)', 0, 0, paid - fitDeduct, dd);
  // ③ 7조② 무상취소 — 예식일 150일 전까지 위약금 없이 해제.
  if (dd >= 150) return out('무상취소(7조)', 0, 0, paid - fitDeduct, dd);
  // ④ 9조② 위약금 — 총 계약금액 기준 시기별 요율. 시착비는 위약금에 흡수(9조⑤) → 추가 차감 없음.
  var rate = dd >= 60 ? 0.1 : dd >= 30 ? 0.2 : dd >= 10 ? 0.4 : dd >= 1 ? 0.5 : 0.7;
  var penalty = Math.round(amounts.총액 * rate);
  return out('위약금 ' + Math.round(rate * 100) + '%(9조)', rate, penalty, paid - penalty, dd);
}

// [02-8] 노출 게이트 — 마이페이지(getMyState.refund)·관리자 상세(adminDetail.refundQuote) 공용.
//   돈이 들어온 뒤에만(계약 서명완료 또는 예약금 입금 확인). 취소·노쇼·미계약(종료) 단계는 null
//   — 취소 건의 실제 환불은 관리자 환불송금 큐가 취소일시 기준 _refundQuote로 따로 계산.
function buildRefundQuote(r) {
  if (!r) return null;
  if (STAGE_EXCEPTIONS.indexOf(String(r.get('현재단계') || '').trim()) !== -1) return null;
  var q = _refundQuote(r, null);
  if (!q) return null;                                                                       // 스냅 등
  if (String(r.get('계약상태') || '').trim() !== '서명완료' && !(q.paid > 0)) return null;   // 계약 전엔 예약금 입금(확인) 후에만
  return q;
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
    _saveCashReceipt(cust, sheet, colOf, body && body.cashReceipt);   // 현금영수증 번호 저장(선택)
    notifyKakao('admin.depositSignal', code, { payer: payer });   // 관리자: 계약금 입금신호 · 확인 필요(카톡)
    return { ok: true };                                      // 자동 진행 X · 관리자 승인 대기
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [02-4] 마이페이지 입금 카드용 상태. 계약 서명완료 + 현재단계(계약완료/입금완료)일 때 노출.
//   금액은 계약총액에서 산출(없으면 amounts=null → "디렉터 확인 후 안내"). 내부값 비노출.
// 현금영수증 번호(선택) — 동의기록 JSON에 저장(시트 컬럼 추가 불필요)·조회. 결제 카드 자동채움 + 관리자 발급용.
function _saveCashReceipt(cust, sheet, colOf, raw) {
  var cr = String(raw || '').trim().slice(0, 40);
  if (!cr) return;
  try { var rec = _parseJsonSafe(cust.get('동의기록')); if (String(rec.현금영수증 || '') === cr) return; rec.현금영수증 = cr; touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) }); } catch (e) {}
}
function _cashReceiptOf(r) { try { return String(_parseJsonSafe(r.get('동의기록')).현금영수증 || ''); } catch (e) { return ''; } }
// [②] 현금영수증 발급 번호(소득공제용) 상시 등록/변경 — 결제 카드 밖(마이페이지 '내 내역')에서도 저장·수정. 빈값이면 등록 해제.
function handleSaveCashReceipt(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var num = String((body && body.cashReceipt) || '').replace(/[^0-9]/g, '').slice(0, 40);   // 휴대폰/사업자번호 · 숫자만
    var rec = _parseJsonSafe(cust.get('동의기록'));
    if (String(rec.현금영수증 || '') === num) return { ok: true, already: true };
    rec.현금영수증 = num;   // 빈값이면 등록 해제(자진발급 전환)
    touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// 현금영수증 발행 원장 — 결제 마일스톤(예약금/계약금·중도금·잔금)별 {입금확인 여부·금액·발행기록}. 관리자 발행 큐·카드 + 마이페이지 '내 내역'이 공통으로 쓰는 단일 소스.
//   의무발행업종 — 입금이 '확인'된 마일스톤은 현금영수증 발급 대상(미발급 20% 가산세). issued=발행완료 기록 / due=확인됐는데 미발행.
function _cashReceiptLedger(r) {
  if (!r) return [];
  var isSnap = (String(r.get('상품타입') || '').trim() === '웨딩스냅');
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  var issued = {};
  try { issued = _parseJsonSafe(r.get('동의기록')).영수증발행 || {}; } catch (e) {}
  var target = _cashReceiptOf(r);   // 고객이 입력한 발급 대상(휴대폰/사업자번호). 빈값이면 자진발급(010-000-1234) 대상.
  function item(key, label, confirmed, amount) {
    var rec = issued[key] || null;
    return {
      key: key, label: label,
      confirmed: !!confirmed,
      amount: Math.round(Number(amount) || 0),
      target: target,
      issued: rec ? { 번호: String(rec.번호 || ''), 금액: Math.round(Number(rec.금액) || 0), 대상: String(rec.대상 || ''), at: String(rec.at || '') } : null,
      due: (!!confirmed && !rec)
    };
  }
  var out = [];
  // 예약금 '받은 날'은 상담 예약 입금 — 계약(서명=입금상태 확인) 전이라도 Bookings 입금확인이면 발급 대상(기한 D+5는 받은 날 기산)
  var _depCf = String(r.get('입금상태') || '').trim() === '확인';
  if (!_depCf && !isSnap && typeof findRowByPersonalCode === 'function') {
    try { var _bkD = findRowByPersonalCode(String(r.get('개인코드') || '').trim()); if (_bkD && String(_bkD.get('입금확인') || '').trim() === '확인') _depCf = true; } catch (e) {}
  }
  out.push(item('예약금', isSnap ? '계약금' : '예약금', _depCf, isSnap ? (amounts ? amounts['계약금'] : 0) : PAYMENT.예약금));
  // 묶음 입금(임박 계약): 중도금·잔금이 같은 확인일시로 기록됐으면 한 번의 이체 → 영수증도 1건(합산)으로
  var _mCf = String(r.get('중도금상태') || '').trim() === '확인', _bCf = String(r.get('잔금상태') || '').trim() === '확인';
  var _mAt = String(r.get('중도금확인일시') || '').trim(), _bAt = String(r.get('잔금확인일시') || '').trim();
  var _combo = !isSnap && _mCf && _bCf && _mAt && _mAt === _bAt;
  if (_combo) {
    out.push(item('중도금잔금', '중도금·잔금', true, amounts ? (amounts['중도금'] + amounts['잔금']) : 0));
  } else {
    if (!isSnap) out.push(item('중도금', '중도금', _mCf, amounts ? amounts['중도금'] : 0));
    out.push(item('잔금', '잔금', _bCf, amounts ? amounts['잔금'] : 0));
  }
  // 추가 보정(과세 용역·10만원↑ 현금 의무발급) — 결제 '완료'된 건만 원장에(금액 0=미신청은 행 자체 생략). 총액 외 별도 매출이라 결제 진행률에는 미합산.
  var _exAmt = Math.round(Number(r.get('추가보정금액')) || 0);
  if (_exAmt > 0 && ['완료', '결제대기'].indexOf(String(r.get('추가보정상태') || '').trim()) !== -1) {
    out.push(item('추가보정', '추가 보정', String(r.get('추가보정상태') || '').trim() === '완료', _exAmt));
  }
  return out;
}
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
    cashReceipt: _cashReceiptOf(r),
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
// 예식일 ± N일 → YYYY-MM-DD (TZ 무관 · UTC 산술). 중도금/잔금 입금 마감일 산출. 예식일 미정이면 ''.
function _shiftYmd(weddingYmd, deltaDays) {
  var m = String(weddingYmd || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return '';
  var d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]) + (deltaDays * 86400000));
  return d.getUTCFullYear() + '-' + ('0' + (d.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + d.getUTCDate()).slice(-2);
}
// 마이페이지 잔금 카드 상태. 계약 서명완료 + 제작 단계에서 노출(확인이면 접힘).
function buildBalanceState(r) {
  if (!r) return null;
  if (String(r.get('계약상태') || '').trim() !== '서명완료') return null;
  var isSnap = (String(r.get('상품타입') || '').trim() === '웨딩스냅');
  var stages = isSnap ? ['입금완료', '촬영완료'] : ['입금완료', '제작중', '예식완료'];   // 스냅은 제작중 없음 · 촬영완료까지 노출
  if (stages.indexOf(String(r.get('현재단계') || '').trim()) === -1) return null;
  var bStatus = String(r.get('잔금상태') || '').trim() || '대기';
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  var dday = _balanceDDay(r.get('예식일'));
  // 시그: 중도금과 함께(예식 D-45 이내)·중도금 확인 후 노출. 스냅: 2단계 결제(20/80)라 입금완료부터 바로 노출(예식일·dday 무관).
  if (!isSnap && bStatus !== '확인' && String(r.get('중도금상태') || '').trim() !== '확인' && !(dday != null && dday <= PAYMENT.잔금일수전 + 15)) return null;
  return {
    status: bStatus,                                   // 대기 / 완료신호 / 확인
    confirmed: bStatus === '확인',
    payerName: String(r.get('잔금입금자명') || '').trim(),
    cashReceipt: _cashReceiptOf(r),
    amount: amounts ? amounts['잔금'] : null,          // 잔금액(총액 80%) 또는 null
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : '',
    dday: dday,                                        // 예식까지 남은 일수(null=예식일 미정)
    due: (dday != null && dday <= PAYMENT.잔금일수전),  // 기한 이내(부각)
    dueLabel: _balanceDueLabel(),
    dueDate: _shiftYmd(r.get('예식일'), -PAYMENT.잔금일수전)   // 잔금 마감일 = 예식 D-7 (YYYY-MM-DD)
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
    var _bStages = (String(cust.get('상품타입') || '').trim() === '웨딩스냅') ? ['입금완료', '촬영완료'] : ['입금완료', '제작중', '예식완료'];
    if (_bStages.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 잔금 단계가 아닙니다.' };
    if (String(cust.get('잔금상태') || '').trim() === '확인') return { ok: true, already: true };
    touchCustomer(sheet, colOf, cust.num, { '잔금입금자명': payer, '잔금입금신호': fmtKST(new Date()), '잔금상태': '완료신호' });
    _saveCashReceipt(cust, sheet, colOf, body && body.cashReceipt);   // 현금영수증 번호 저장(선택)
    notifyKakao('admin.balanceSignal', code, { payer: payer });   // 관리자: 잔금 입금신호 · 확인 필요(카톡)
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// 관리자 잔금 확인(통장 대조). 단계 전이 없음.
function adminConfirmBalance(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (STAGE_EXCEPTIONS.indexOf(String(cust.get('현재단계') || '').trim()) !== -1) return { ok: false, error: '진행이 종료된 고객이에요. (취소·노쇼·미계약)' };   // 종료 고객 입금확인 차단(영수증 큐 오생성 방지)
  if (String(cust.get('잔금상태') || '').trim() === '확인') return { ok: true, already: true };
  touchCustomer(sheet, colOf, cust.num, { '잔금상태': '확인', '잔금확인일시': fmtKST(new Date()) });
  notifyKakao('cust.paymentConfirmed', code, { kind: '잔금' });   // 고객 안심 알림(카톡)
  return { ok: true };
}
// ============================ 02-4b · 중도금 (결제 마일스톤 — 단계 아님) ============================
// 중도금 = 총액 40% + 계약금 차액. 예식 D-149 마감(무료 취소 종료 시·미리 입금 가능). 상태: 대기→완료신호→확인(관리자 통장 대조).
//   계약금이 예약금 충당(0원)이므로 계약 후 첫 실결제. 단계 전이 없음. 계좌는 동일(CONFIG.ACCOUNT).
function buildMidState(r) {
  if (!r) return null;
  if (String(r.get('상품타입') || '').trim() === '웨딩스냅') return null;   // 스냅은 2단계(계약금·잔금) · 중도금 없음
  if (String(r.get('계약상태') || '').trim() !== '서명완료') return null;
  if (['입금완료', '제작중', '예식완료'].indexOf(String(r.get('현재단계') || '').trim()) === -1) return null;
  var mStatus = String(r.get('중도금상태') || '').trim() || '대기';
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  var dday = _balanceDDay(r.get('예식일'));
  // 결제 시기(기한 15일 전부터) 또는 진행/완료일 때만 카드 노출 — 그 전엔 NEXT 자물쇠(인지)만.
  if (mStatus !== '완료신호' && mStatus !== '확인' && !(dday != null && dday <= PAYMENT.중도금일수전 + 15)) return null;
  return {
    status: mStatus,                                   // 대기 / 완료신호 / 확인
    confirmed: mStatus === '확인',
    payerName: String(r.get('중도금입금자명') || '').trim(),
    cashReceipt: _cashReceiptOf(r),
    amount: amounts ? amounts['중도금'] : null,        // 중도금액(40%+차액) 또는 null
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : '',
    dday: dday,
    due: (dday != null && dday <= PAYMENT.중도금일수전),  // 기한 이내(부각)
    dueLabel: _midDueLabelFor(r),
    dueDate: _midDueDateFor(r)   // 중도금 마감일 (YYYY-MM-DD · 임박 계약이면 빈값)
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
    _saveCashReceipt(cust, sheet, colOf, body && body.cashReceipt);   // 현금영수증 번호 저장(선택)
    notifyKakao('admin.midSignal', code, { payer: payer, withBalance: !!(body && body.withBalance) });   // 관리자: 중도금 입금신호 · 확인 필요(카톡)
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// 관리자 중도금 확인(통장 대조). 단계 전이 없음.
function adminConfirmMid(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (STAGE_EXCEPTIONS.indexOf(String(cust.get('현재단계') || '').trim()) !== -1) return { ok: false, error: '진행이 종료된 고객이에요. (취소·노쇼·미계약)' };   // 종료 고객 입금확인 차단(영수증 큐 오생성 방지)
  if (String(cust.get('중도금상태') || '').trim() === '확인') return { ok: true, already: true };
  touchCustomer(sheet, colOf, cust.num, { '중도금상태': '확인', '중도금확인일시': fmtKST(new Date()) });
  notifyKakao('cust.paymentConfirmed', code, { kind: '중도금' });   // 고객 안심 알림(카톡)
  return { ok: true };
}
// 관리자 중도금·잔금 묶음 확인 — 임박 계약(D-9 이내)에서 고객이 한 번에 입금(withBalance)한 경우 1클릭 처리.
//   같은 확인일시(now)로 기록 → 영수증 원장도 '중도금·잔금' 1건으로 합쳐짐(_cashReceiptLedger 콤보 판정 짝).
function adminConfirmMidBalance(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (STAGE_EXCEPTIONS.indexOf(String(cust.get('현재단계') || '').trim()) !== -1) return { ok: false, error: '진행이 종료된 고객이에요. (취소·노쇼·미계약)' };
  var midOk = String(cust.get('중도금상태') || '').trim() === '확인';
  var balOk = String(cust.get('잔금상태') || '').trim() === '확인';
  if (midOk && balOk) return { ok: true, already: true };
  var now = fmtKST(new Date());
  var upd = {};
  if (!midOk) { upd['중도금상태'] = '확인'; upd['중도금확인일시'] = now; }
  if (!balOk) { upd['잔금상태'] = '확인'; upd['잔금확인일시'] = now; }
  touchCustomer(sheet, colOf, cust.num, upd);
  notifyKakao('cust.paymentConfirmed', code, { kind: '중도금·잔금' });
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
    var flag = String(row[c('잔금리마인드') - 1] || '').trim();
    var dday = _balanceDDay(row[c('예식일') - 1]);
    if (dday == null) continue;
    var stagePre = (!flag && dday <= PAYMENT.잔금일수전 + 15 && dday > PAYMENT.잔금일수전);
    var stageDue = ((!flag || flag === '예고') && dday <= PAYMENT.잔금일수전);
    if (!stagePre && !stageDue) continue;
    var email = String(row[c('이메일') - 1] || '').trim();
    var amounts = _journeyAmounts(row[c('계약총액') - 1], row[c('상품타입') - 1]);
    var _isSnapRow = String(row[c('상품타입') - 1] || '').trim() === '웨딩스냅';
    var _comboRem = !_isSnapRow && String(row[c('중도금상태') - 1] || '').trim() !== '확인';   // 중도금도 미납(임박 묶음) → 합산 1통
    var _payL = _comboRem ? '중도금·잔금' : '잔금';
    var amtTxt = amounts ? (Number(_comboRem ? (amounts['중도금'] + amounts['잔금']) : amounts['잔금']).toLocaleString() + '원') : '잔금';
    var dueYmd = _shiftYmd(row[c('예식일') - 1], -PAYMENT.잔금일수전);
    notifyKakao(stageDue ? 'cust.balanceDue' : 'cust.balancePre', String(row[c('개인코드') - 1] || '').trim(), { dday: dday });
    if (CONFIG.SEND_BALANCE_MAIL && email) {
      try {
        if (stageDue) {
          GmailApp.sendEmail(email, '[Moment Edit] ' + _payL + ' 납부일 안내 (예식 D-' + dday + ')',
            '예식이 코앞이에요.\n' + _payL + ' ' + amtTxt + '을 오늘(' + dueYmd + ')까지 입금 부탁드립니다.\n마이페이지에서 계좌·금액을 확인하실 수 있습니다.\n\nMoment Edit');
        } else {
          GmailApp.sendEmail(email, '[Moment Edit] ' + _payL + ' 안내가 열렸어요 (납부일: ' + dueYmd + ')',
            '예식이 다가옵니다.\n' + _payL + ' ' + amtTxt + '의 납부일은 ' + dueYmd + ' (예식 9일 전)입니다.\n마이페이지에 계좌·금액 안내가 열려 있어요.\n\nMoment Edit');
        }
      } catch (e) {}
    }
    sheet.getRange(P.DATA_START_ROW + i, c('잔금리마인드')).setValue(stageDue ? fmtKST(new Date()) : '예고');   // 알림 발송 → 1회 마킹(중복 방지)
  }
}
// [트리거·일1회] 예식 D-30 이내 + 중도금 미확인 + 미발송 → 중도금 리마인드 1회(잔금과 동일 패턴·컬럼 '중도금리마인드').
function sendMidReminders() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  if (!colOf['중도금상태'] || !colOf['중도금리마인드'] || !colOf['예식일']) return;
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var c = function (h) { return colOf[h]; };
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i];
    if (String(row[c('상품타입') - 1] || '').trim() === '웨딩스냅') continue;          // 스냅은 중도금 없음
    if (String(row[c('계약상태') - 1] || '').trim() !== '서명완료') continue;
    if ((String(row[c('중도금상태') - 1] || '').trim() || '대기') === '확인') continue;
    if (['입금완료', '제작중', '예식완료'].indexOf(String(row[c('현재단계') - 1] || '').trim()) === -1) continue;
    var flag = String(row[c('중도금리마인드') - 1] || '').trim();
    var dday = _balanceDDay(row[c('예식일') - 1]);
    if (dday == null) continue;
    if (dday <= PAYMENT.잔금일수전 && String(row[c('잔금상태') - 1] || '').trim() !== '확인') continue;   // 임박 묶음 구간 — 잔금 리마인더가 '중도금·잔금' 합산 1통으로 보냄(중복 2통 방지)
    // 2단계: ① 예고(카드 열리는 D-164) ② 기한일(D-149). 임박 계약(이미 기한 안쪽)은 기한 단계만 1회.
    var stagePre = (!flag && dday <= PAYMENT.중도금일수전 + 15 && dday > PAYMENT.중도금일수전);
    var stageDue = ((!flag || flag === '예고') && dday <= PAYMENT.중도금일수전);
    if (!stagePre && !stageDue) continue;
    var email = String(row[c('이메일') - 1] || '').trim();
    var amounts = _journeyAmounts(row[c('계약총액') - 1], row[c('상품타입') - 1]);
    var amtTxt = amounts ? (Number(amounts['중도금']).toLocaleString() + '원') : '중도금';
    var dueYmd = _shiftYmd(row[c('예식일') - 1], -PAYMENT.중도금일수전);
    notifyKakao(stageDue ? 'cust.midDue' : 'cust.midPre', String(row[c('개인코드') - 1] || '').trim(), { dday: dday });
    if (CONFIG.SEND_BALANCE_MAIL && email) {                                            // 메일은 결제 리마인드 공통 토글
      try {
        if (stageDue) {
          GmailApp.sendEmail(email, '[Moment Edit] 중도금 납부일 안내 (예식 D-' + dday + ')',
            '무료 취소 기간이 끝나고 예식 일정이 확정되는 날이에요.\n중도금 ' + amtTxt + '을 ' + (dday < PAYMENT.중도금일수전 ? '계약 시 안내드린 대로 바로' : '오늘(' + dueYmd + ')까지') + ' 입금 부탁드립니다.\n마이페이지에서 계좌·금액을 확인하실 수 있습니다.\n\nMoment Edit');
        } else {
          GmailApp.sendEmail(email, '[Moment Edit] 중도금 안내가 열렸어요 (납부일: ' + dueYmd + ')',
            '예식 준비가 본격적으로 시작될 시기예요.\n중도금 ' + amtTxt + '의 납부일은 ' + dueYmd + ' (예식 149일 전)입니다.\n마이페이지에 계좌·금액 안내가 열려 있어요. 미리 확인해 두세요.\n\nMoment Edit');
        }
      } catch (e) {}
    }
    sheet.getRange(P.DATA_START_ROW + i, c('중도금리마인드')).setValue(stageDue ? fmtKST(new Date()) : '예고');
  }
}

// [동시성] 트리거가 동의기록 1칸에 '플래그만' 찍을 때 — 메일 발송(루프 내 수십 초) 중 다른 핸들러가 같은 행의
//   다른 키(계약정보·영수증발행·홀드 승인 등)를 써도 유실되지 않도록, 쓰기 직전에 그 셀을 '재읽기→병합→쓰기'(짧은 락).
//   mutate(fresh)는 최신 동의기록 객체에 플래그만 추가한다(통째 교체 금지). 반환: 기록 성공 여부.
function _stampConsentKey(sheet, colOf, rowNum, mutate) {
  var col = colOf['동의기록']; if (!col) return false;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return false; }
  try {
    var cell = sheet.getRange(rowNum, col);
    var fresh = _parseJsonSafe(cell.getValue());     // 스냅샷이 아닌 '지금 시점' 값 — 그 사이 기록된 키 보존
    mutate(fresh);
    cell.setValue(JSON.stringify(fresh));
    return true;
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [트리거·일1회] 임시고정 만료 D-3 — 고객에게 1회 안내(메일 직송+카톡 키). 가예약.expiryNoticed로 중복 방지.
function sendHoldExpiryNotices() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var c = function (h) { return colOf[h]; };
  var today = _kstYmd(new Date());
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i];
    var stage = String(row[c('현재단계') - 1] || '').trim();
    if (STAGE_EXCEPTIONS.indexOf(stage) !== -1) continue;
    if (String(row[c('계약상태') - 1] || '').trim() === '서명완료') continue;          // 계약되면 홀드는 의미 종료
    var rec = _parseJsonSafe(row[c('동의기록') - 1]); var h = rec.가예약;
    if (!h || h.status !== '승인' || !h.expires || h.expiryNoticed) continue;
    var left = _dayDiff(h.expires, today);
    if (left == null || left < 0 || left > 3) continue;                                 // 만료 D-3 ~ D-0
    var code = String(row[c('개인코드') - 1] || '').trim();
    notifyKakao('cust.holdExpiring', code, { date: h.date, slot: h.slot, left: left });
    var email = String(row[c('이메일') - 1] || '').trim();
    if (email) {
      try {
        GmailApp.sendEmail(email, '[Moment Edit] 예식일 임시 고정이 곧 풀려요 (D-' + left + ')',
          '잡아두신 예식 일정(' + h.date + ')의 임시 고정이 ' + h.expires + '에 해제될 예정이에요.\n계속 진행을 원하시면 상담·본계약을 진행해 주시고, 일정 조율이 필요하시면 카카오톡으로 편하게 말씀해 주세요.\n\nMoment Edit');
      } catch (e) {}
    }
    _stampConsentKey(sheet, colOf, P.DATA_START_ROW + i, function (fresh) {   // 재읽기+병합 — 메일 발송 중 끼어든 홀드 승인/거절·계약정보 보존
      if (fresh.가예약) fresh.가예약.expiryNoticed = fmtKST(new Date());        // 그 사이 거절(가예약 삭제)됐으면 통지 마킹 생략(정상)
    });
    try { _recordHandler(code, '임시고정 만료 D-' + left + ' 안내 발송'); } catch (e2) {}
  }
}

// [트리거·일1회] 결과물 보관 만료 7일 전 — 삭제 예정 통지(계약서 12조③: 만료 7일 전까지 통지 후 삭제 가능).
//   기산: 동의기록.결과물전달일(전달 완료 시 기록) + 6개월 = 만료일. 동의기록.보관만료통지로 1회 발송.
function sendArchiveExpiryNotices() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  if (!colOf['결과물상태'] || !colOf['동의기록']) return;
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var c = function (h) { return colOf[h]; };
  var today = _kstYmd(new Date());
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i];
    if (String(row[c('결과물상태') - 1] || '').trim() !== '전달완료') continue;
    var rec = _parseJsonSafe(row[c('동의기록') - 1]);
    if (!rec.결과물전달일 || rec.보관만료통지) continue;
    var p = String(rec.결과물전달일).slice(0, 10).split('-');
    if (p.length !== 3) continue;
    var exp = new Date(Number(p[0]), Number(p[1]) - 1 + 6, Number(p[2]));        // 전달일 +6개월 = 보관 만료일
    var expYmd = exp.getFullYear() + '-' + ('0' + (exp.getMonth() + 1)).slice(-2) + '-' + ('0' + exp.getDate()).slice(-2);
    var left = _dayDiff(expYmd, today);
    if (left == null || left > 7) continue;                                      // 만료 7일 전부터(이미 지난 행도 1회는 안내)
    var code = String(row[c('개인코드') - 1] || '').trim();
    notifyKakao('cust.archiveExpiring', code, { expires: expYmd, left: left });
    var email = String(row[c('이메일') - 1] || '').trim();
    if (email) {
      var when = (left >= 0) ? (expYmd + '에 만료될 예정이에요') : (expYmd + '에 만료되었어요');
      try {
        GmailApp.sendEmail(email, '[Moment Edit] 결과물 보관 기간 안내 (' + expYmd + ')',
          '전달드린 사진·영상의 보관 기간(전달일부터 6개월)이 ' + when + '.\n' +
          '아직 내려받지 않으셨다면 미리 다운로드해 주세요. 만료 후에는 데이터가 삭제될 수 있고, 재발급이 어려울 수 있어요.\n' +
          '이용계약서 제12조 제3항에 따른 안내입니다.\n\nMoment Edit');
      } catch (e) {}
    }
    _stampConsentKey(sheet, colOf, P.DATA_START_ROW + i, function (fresh) {   // 재읽기+병합 — 메일 발송 중 끼어든 영수증발행·계약정보 보존
      fresh.보관만료통지 = fmtKST(new Date());
    });
    try { _recordHandler(code, '결과물 보관 만료(' + expYmd + ') 통지 발송'); } catch (e2) {}
  }
}

// ★ 통합 트리거 설치기 — 1회 실행하면 자동화 전부 등록(멱등: 같은 핸들러 기존 트리거 정리 후 재생성).
//   새 자동화가 추가되면 이 목록에 한 줄 넣고 다시 실행. 실행 결과로 설치 현황 문자열 반환.
function setupAllTriggers() {
  var plan = [
    { fn: 'expireUnsignedContracts', hour: 3,  label: '계약서 72h 만료 자동 파기' },
    { fn: 'sendDailyReminders',      hour: 9,  label: '상담 D-1 리마인드(고객+운영자)' },
    { fn: 'sendMorningBrief',        hour: 9,  label: '아침 운영 브리핑' },
    { fn: 'sendHoldExpiryNotices',   hour: 9,  label: '임시고정 만료 D-3 안내' },
    { fn: 'sendBalanceReminders',    hour: 10, label: '잔금 D-9 리마인드' },
    { fn: 'sendMidReminders',        hour: 10, label: '중도금 D-149 리마인드' },
    { fn: 'sendArchiveExpiryNotices', hour: 11, label: '결과물 보관 만료 7일 전 통지' },
    { fn: 'weeklyReceiptAudit',      hour: 9,  weekly: true, label: '현금영수증 미발행 주간 점검(월)' },
    { fn: 'warmAvailCache',          minutes: 1, label: '가능일 캐시 워밍(기존)' }
  ];
  var names = plan.map(function (p) { return p.fn; });
  ScriptApp.getProjectTriggers().forEach(function (t) { if (names.indexOf(t.getHandlerFunction()) !== -1) ScriptApp.deleteTrigger(t); });
  var out = [];
  plan.forEach(function (p) {
    var b = ScriptApp.newTrigger(p.fn).timeBased();
    if (p.minutes) b.everyMinutes(p.minutes).create();
    else if (p.weekly) b.onWeekDay(ScriptApp.WeekDay.MONDAY).atHour(p.hour).create();
    else b.everyDays(1).atHour(p.hour).create();
    out.push((p.minutes ? ('매 ' + p.minutes + '분') : (p.weekly ? ('매주 월 ' + p.hour + '시') : ('매일 ' + p.hour + '시'))) + ' · ' + p.label + ' (' + p.fn + ')');
  });
  var msg = '트리거 ' + plan.length + '개 설치 완료\n' + out.join('\n');
  Logger.log(msg);
  return msg;
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
