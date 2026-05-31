/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T2 개인코드 + Customers 행 접근
 * ──────────────────────────────────────────────────────────────────────────
 * makePersonalCode()       : 혼동문자 제외 6자 영숫자 + 1열 충돌검사(재생성).
 * findCustomerByCode/Token/Email : 개인코드/토큰/이메일로 행 조회(접근자 객체).
 * touchCustomer()          : '최종수정' 자동 갱신 + writeCell 묶음.
 *
 * 행 접근자는 consultation-booking.gs 의 rowFromValues 구조를 그대로 따른다.
 */

// ============================ 개인코드 발급 ============================
// 사용 문자: ACDEFGHJKMNPQRTUVWXY34679 (혼동문자 0O1IL2Z5S8B 제외).
// 6자 무작위 → 1열(개인코드)에서 충돌검사 → 있으면 재생성. 대문자만.
function makePersonalCode() {
  var sheet = getCustomersSheet();
  var existing = _existingCodeSet(sheet);
  for (var tries = 0; tries < P.CODE_MAX_TRIES; tries++) {
    var code = _randomCode();
    if (!existing[code]) return code;
  }
  // 극히 드문 경우(거의 불가) — 안전장치
  throw new Error('개인코드 생성 충돌이 반복됩니다. 잠시 후 다시 시도해 주세요.');
}

// 무작위 6자 (암호학적 난수 우선, 실패 시 Math.random 폴백)
function _randomCode() {
  var A = P.CODE_ALPHABET, n = A.length, out = '';
  var bytes;
  try {
    // 충분한 엔트로피 확보용 난수 바이트
    bytes = Utilities.computeDigest(
      Utilities.DigestAlgorithm.SHA_256,
      Utilities.getUuid() + ':' + Date.now() + ':' + Math.random()
    );
  } catch (e) { bytes = null; }
  for (var i = 0; i < P.CODE_LEN; i++) {
    var r = bytes ? (bytes[i] & 0xff) : Math.floor(Math.random() * 256);
    out += A.charAt(r % n);
  }
  return out;
}

// 1열(개인코드) 전체를 set 으로 — 충돌검사용
function _existingCodeSet(sheet) {
  var set = {};
  var colOf = buildHeaderIndex(sheet);
  var c = colOf['개인코드'];
  var last = sheet.getLastRow();
  if (!c || last < P.DATA_START_ROW) return set;
  var vals = sheet.getRange(P.DATA_START_ROW, c, last - P.DATA_START_ROW + 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    var v = String(vals[i][0] || '').trim().toUpperCase();
    if (v) set[v] = true;
  }
  return set;
}

// ============================ Customers 행 조회 ============================
// 한 컬럼 값으로 행을 찾아 접근자 객체 반환({num, get}). 대소문자 무시 비교 옵션.
function _findCustomerBy(header, value, caseInsensitive) {
  value = String(value == null ? '' : value).trim();
  if (!value) return null;
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var c = colOf[header];
  var last = sheet.getLastRow();
  if (!c || last < P.DATA_START_ROW) return null;
  var cmp = caseInsensitive ? value.toLowerCase() : value;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var cell = String(vals[i][c - 1] == null ? '' : vals[i][c - 1]).trim();
    if ((caseInsensitive ? cell.toLowerCase() : cell) === cmp) {
      // rowFromValues 는 consultation-booking.gs 의 헬퍼 재사용
      return rowFromValues(colOf, vals[i], P.DATA_START_ROW + i);
    }
  }
  return null;
}

function findCustomerByCode(code) { return _findCustomerBy('개인코드', code, true); }
function findCustomerByToken(token) { return _findCustomerBy('로그인토큰', token, false); }
function findCustomerByEmail(email) { return _findCustomerBy('이메일', email, true); }

// ============================ Customers 쓰기 (최종수정 자동 갱신) ============================
// updates = { 헤더: 값, ... }. 모든 쓰기 끝에 '최종수정'을 자동으로 찍는다(설계서 노트).
function touchCustomer(sheet, colOf, rowNum, updates) {
  Object.keys(updates || {}).forEach(function (h) {
    writeCell(sheet, colOf, rowNum, h, updates[h]); // 재사용
  });
  writeCell(sheet, colOf, rowNum, '최종수정', fmtKST(new Date()));
}

// 표시·기록용 한국시간 문자열 'YYYY-MM-DD HH:mm' (KST=JST)
function fmtKST(d) {
  if (!(d instanceof Date)) d = new Date(d);
  return Utilities.formatDate(d, 'Asia/Seoul', 'yyyy-MM-dd HH:mm');
}

// 신랑·신부 표시명 (Customers 행용)
function customerNames(rowObj) {
  var g = String(rowObj.get('신랑이름') || '').trim();
  var b = String(rowObj.get('신부이름') || '').trim();
  return (g && b) ? (g + ' · ' + b) : (g || b || '고객');
}
