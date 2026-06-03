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
  reviewNote: '서명 후에도 계약서 서명 전까지 다시 확인하실 수 있습니다.'
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
    if (stage !== '상담완료') return { ok: false, error: '아직 시착 동의 단계가 아닙니다.' };
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
  if (!signed && !(stage === '상담완료' && requested)) return null;  // 아직 안내 전 → 카드 없음
  return {
    signed: signed,                 // 서명 완료 여부
    signedAt: signedAt,             // 서명 일시(표시용)
    version: FITTING_CONSENT.version,
    title: FITTING_CONSENT.title,
    terms: FITTING_CONSENT.terms,
    gateNotice: FITTING_CONSENT.gateNotice,
    reviewNote: FITTING_CONSENT.reviewNote,
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
