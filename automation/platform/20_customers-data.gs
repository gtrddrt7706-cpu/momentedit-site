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
  // 빠른 경로: TextFinder가 해당 컬럼의 일치 셀을 서버에서 직접 찾음(전체 시트 전송 회피 → 매 인증요청 가속).
  //   matchEntireCell=정확히 일치만. 미스/예외 시 아래 전체스캔으로 폴백 → 정확성 보장(트림 일치 등).
  try {
    var hit = sheet.getRange(P.DATA_START_ROW, c, last - P.DATA_START_ROW + 1, 1)
      .createTextFinder(value).matchEntireCell(true).matchCase(!caseInsensitive).findNext();
    if (hit) {
      var rn = hit.getRow();
      return rowFromValues(colOf, sheet.getRange(rn, 1, 1, sheet.getLastColumn()).getValues()[0], rn);
    }
  } catch (e) { /* 폴백 진행 */ }
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

// 이메일로 '가장 최근 활성 행' 조회 — 같은 이메일 다중 신청 대응(코드 찾기·비번 재설정).
//   취소·노쇼·미계약(STAGE_EXCEPTIONS) 제외한 활성 행 중 등록 시각(생성일시) 최신 1건.
//   활성 행이 없으면 전체 중 최신(완료·취소 고객도 본인 최신 코드 회수 가능). 생성일시='YYYY-MM-DD HH:mm' → 문자열 비교가 곧 시각순.
function findLatestCustomerByEmail(email) {
  email = String(email == null ? '' : email).trim().toLowerCase();
  if (!email) return null;
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var cEmail = colOf['이메일'], cStage = colOf['현재단계'], cCreated = colOf['생성일시'];
  var last = sheet.getLastRow();
  if (!cEmail || last < P.DATA_START_ROW) return null;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var DEAD = ['취소', '노쇼'];   // 완전 종료 건만 재설정 대상에서 제외. 미계약(상담만·계약 전)은 '살아있는 최근 건'이라 포함
  var bestLive = null, bestLiveKey = '', bestAny = null, bestAnyKey = '';
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][cEmail - 1] == null ? '' : vals[i][cEmail - 1]).trim().toLowerCase() !== email) continue;
    var createdKey = String(cCreated ? (vals[i][cCreated - 1] || '') : '') + ('00000' + i).slice(-5); // 시각 동률이면 시트 뒤쪽(나중 추가)이 최신
    var rowObj = rowFromValues(colOf, vals[i], P.DATA_START_ROW + i);
    if (createdKey >= bestAnyKey) { bestAnyKey = createdKey; bestAny = rowObj; }
    var stage = String(cStage ? (vals[i][cStage - 1] || '') : '').trim();
    if (DEAD.indexOf(stage) === -1) {                                  // 취소·노쇼가 아닌 '가장 최근' 가입 건
      if (createdKey >= bestLiveKey) { bestLiveKey = createdKey; bestLive = rowObj; }
    }
  }
  return bestLive || bestAny;                                          // [2026-06-22] 활성 우선 → 최신 우선으로 변경: 같은 이메일 다계정 시 가장 최근(취소·노쇼 제외) 가입건으로 재설정(다계정 혼선 방지)
}

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

// ============================ 개인정보 보유기간 자동 파기 ============================
// 처리방침 약속: "상담 미진행·계약 없음 → 6개월 후 파기". 이를 실제로 이행하는 자동 익명화.
//   ★안전 원칙:
//     · 계약(서명완료)·입금(중도금/잔금 확인·완료신호) 이력이 조금이라도 있으면 절대 건드리지 않음
//       (전자상거래법·세법상 법정 보관 의무 대상 → 파기 금지).
//     · 행을 삭제하지 않고(설계 규칙: 행 직접삭제 금지) PII 컬럼만 복구 불가하게 비움(익명화).
//     · 개인코드·상품타입·현재단계·생성일시는 통계·중복검사용으로 남김(그 자체로는 개인식별 불가).
//   비활성 기준: 최종수정(없으면 생성일시)이 CUTOFF일(기본 183일=6개월) 이전.
//   ScriptProperty 'CUSTOMER_PURGE_OFF'='Y' 이면 정지. 'CUSTOMER_PURGE_DAYS' 로 일수 조정 가능.
//   실행: 주간 트리거(purgeAdvisorLog)가 함께 호출. 첫 도입 시 previewStaleCustomers()로 대상만 미리 확인 권장.
var _CUST_PII_COLS = [
  '비번해시', '로그인토큰', '토큰만료',
  '신랑이름', '신부이름', '연락처', '이메일',
  '동의기록', '입금자명', '잔금입금자명', '중도금입금자명', '추가보정입금자명',
  '제작임시저장', '계약서링크', '쿠폰데이터', '선택사진', '설문응답',
  '원본링크', '영상링크', '보정본폴더', '좌석공유토큰'
];
// 이 컬럼 중 하나라도 '보관 의무' 값이면 파기 제외(법정 보관 · 진행 중 계약 보호).
function _custRetained(get) {
  if (String(get('계약상태') || '').trim() === '서명완료') return true;
  if (String(get('계약서명일시') || '').trim()) return true;
  if (['완료신호', '확인'].indexOf(String(get('입금상태') || '').trim()) !== -1) return true;
  if (String(get('중도금상태') || '').trim() === '확인') return true;
  if (String(get('잔금상태') || '').trim() === '확인') return true;
  if (String(get('계약총액') || '').trim()) return true;   // 관리자가 계약총액을 넣었다면 계약 성립 신호
  return false;
}
function purgeStaleCustomers(dryRun) {
  try { if (PropertiesService.getScriptProperties().getProperty('CUSTOMER_PURGE_OFF') === 'Y') return { ok: true, skipped: 'off' }; } catch (e) {}
  var days = 183;
  try { var d = parseInt(PropertiesService.getScriptProperties().getProperty('CUSTOMER_PURGE_DAYS'), 10); if (d >= 30) days = d; } catch (e) {}
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow(), lastCol = sheet.getLastColumn();
  if (last < P.DATA_START_ROW) return { ok: true, purged: 0 };
  var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - days);
  var rows = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, lastCol).getValues();
  var purged = 0, samples = [], codes = [];
  for (var i = 0; i < rows.length; i++) {
    var vals = rows[i];
    var get = function (h) { var c = colOf[h]; return c ? vals[c - 1] : ''; };
    if (!String(get('개인코드') || '').trim()) continue;                 // 빈 행
    // 이미 익명화된 행(식별정보 전부 비었음) 건너뜀
    if (!String(get('신랑이름') || '').trim() && !String(get('신부이름') || '').trim()
      && !String(get('연락처') || '').trim() && !String(get('이메일') || '').trim()) continue;
    if (_custRetained(get)) continue;                                     // 법정 보관 · 계약/입금 이력 → 보호
    var lastAt = String(get('최종수정') || get('생성일시') || '').trim();
    var when = lastAt ? new Date(lastAt.replace(' ', 'T')) : null;
    if (!when || isNaN(when.getTime()) || when >= cutoff) continue;       // 아직 6개월 안 지남 · 날짜 불명
    samples.push({ code: String(get('개인코드')), 최종수정: lastAt, 현재단계: String(get('현재단계') || '') });
    if (dryRun) { purged++; continue; }
    // ── 익명화: PII 컬럼 비우기 + 파기 표식 ──
    for (var k = 0; k < _CUST_PII_COLS.length; k++) { var cc = colOf[_CUST_PII_COLS[k]]; if (cc) vals[cc - 1] = ''; }
    var mark = '[자동파기 ' + fmtKST(new Date()) + '] 상담 미계약 6개월 경과 · 개인정보 삭제';
    if (colOf['관리자메모']) vals[colOf['관리자메모'] - 1] = mark;
    if (colOf['처리이력']) vals[colOf['처리이력'] - 1] = (String(get('처리이력') || '') + '\n' + mark).trim().slice(0, 4000);
    if (colOf['현재단계']) vals[colOf['현재단계'] - 1] = '미계약';        // 진행바 예외로 정리(드롭다운 유효값)
    if (colOf['최종수정']) vals[colOf['최종수정'] - 1] = fmtKST(new Date());
    sheet.getRange(P.DATA_START_ROW + i, 1, 1, lastCol).setValues([vals]);
    codes.push(String(get('개인코드') || '').trim().toUpperCase());
    purged++;
  }
  // ── 파기 완전화: 같은 개인코드의 다른 시트 PII도 함께 익명화(상담예약·서명이미지) ──
  var extra = { bookings: 0, signatures: 0 };
  if (!dryRun && codes.length) {
    try { extra.bookings = _purgeBookingsPII(codes); } catch (e) { Logger.log('_purgeBookingsPII 실패: ' + (e && e.message)); }
    try { extra.signatures = _purgeSignaturesPII(codes); } catch (e) { Logger.log('_purgeSignaturesPII 실패: ' + (e && e.message)); }
  }
  Logger.log((dryRun ? '[DRY] ' : '') + 'purgeStaleCustomers: ' + purged + '건 (' + days + '일 경과·미계약) · 상담예약 ' + extra.bookings + '행 · 서명 ' + extra.signatures + '행 · ' +
    samples.slice(0, 20).map(function (s) { return s.code + '(' + s.최종수정 + ')'; }).join(', '));
  return { ok: true, purged: purged, bookings: extra.bookings, signatures: extra.signatures, dryRun: !!dryRun, cutoffDays: days, samples: samples };
}
// 미리보기 — 실제 삭제 없이 '이번에 파기될 대상'만 로그로 확인(도입 첫 실행 전 점검용).
function previewStaleCustomers() { return purgeStaleCustomers(true); }

// 상담예약(Bookings) 시트에서 주어진 개인코드들의 PII 컬럼을 비운다(행 보존). 반환=처리 행수.
//   Customers 익명화와 짝 — 같은 SS·개인코드 키. 성함·연락처·이메일·환불계좌·토큰·자유메모 등 식별/민감 컬럼만 비움.
function _purgeBookingsPII(codes) {
  var sh = SpreadsheetApp.getActive().getSheetByName('상담예약');
  if (!sh || sh.getLastRow() < 2) return 0;
  var set = {}; for (var i = 0; i < codes.length; i++) if (codes[i]) set[codes[i]] = true;
  var colOf = buildHeaderIndex(sh), cCode = colOf['개인코드'];
  if (!cCode) return 0;
  var lastCol = sh.getLastColumn();
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues();
  var wipe = ['성함(신랑)', '성함(신부)', '연락처', '이메일', '환불계좌', '토큰', '자유메모', '참고링크', '망설이는점', '준비상황', '중요하게여김', '기타희망시간'];
  var n = 0;
  for (var r = 0; r < vals.length; r++) {
    var code = String(vals[r][cCode - 1] || '').trim().toUpperCase();
    if (!code || !set[code]) continue;
    var changed = false;
    for (var w = 0; w < wipe.length; w++) { var c = colOf[wipe[w]]; if (c && String(vals[r][c - 1] || '') !== '') { vals[r][c - 1] = ''; changed = true; } }
    if (changed) { sh.getRange(2 + r, 1, 1, lastCol).setValues([vals[r]]); n++; }
  }
  return n;
}
// Signatures 시트에서 주어진 개인코드들의 서명이미지(base64)를 비운다(행 보존). 반환=처리 행수.
function _purgeSignaturesPII(codes) {
  var sh = SpreadsheetApp.getActive().getSheetByName('Signatures');
  if (!sh || sh.getLastRow() < 2) return 0;
  var set = {}; for (var i = 0; i < codes.length; i++) if (codes[i]) set[codes[i]] = true;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();   // [개인코드, 유형, 서명이미지]
  var n = 0;
  for (var r = 0; r < vals.length; r++) {
    var code = String(vals[r][0] || '').trim().toUpperCase();
    if (!code || !set[code] || !String(vals[r][2] || '')) continue;
    sh.getRange(2 + r, 3).setValue('');   // 서명이미지 컬럼만 비움
    n++;
  }
  return n;
}
