/**
 * Moment Edit · 관리자 페이지 v1 (청사진 P6를 P2 앞으로)
 * ──────────────────────────────────────────────────────────────────────────
 * 미쿠·희준이 폰에서 구글 로그인 → 처리할 일(홈) → 상담 승인·변경·취소.
 *
 * [원칙] 관리자 동작은 P1.5 기존 함수 재사용 — 새 상태 로직 없음.
 *   actApprove · actAccept · doAdminCancel · submitProposal (consultation-booking.gs)
 *   슬롯 Lock+재확인 · setCustomerStage 단일 전이 = P1.5 그대로. 관리자 래퍼는 '호출만'.
 *
 * [라우트] doGet ?admin=1 → serveAdmin. 고객용 흐름(신청·schedule·메일버튼)과 분리.
 * [인증] 구글 로그인 + Admins 시트 화이트리스트. 동작 함수마다 isAdmin 재확인(보안 O).
 * [배포] 관리자용 별도 웹앱(액세스: Google 계정 보유 사용자). 고객 배포는 '모든 사용자' 유지.
 *
 * 재사용(consultation-booking 전역): getSheet·buildHeaderIndex·row·findRowByPersonalCode·
 *   actApprove·actAccept·doAdminCancel·submitProposal·sign·getAvailability·_slotTaken·
 *   ST·LOCKED_STATES·normalizeDateKey·prettyDate·slotsForDate·parseDateTime·esc·CONFIG·SYS·fmtKST
 * 재사용(platform): getCustomersSheet·findCustomerByCode·touchCustomer·customerNames·P
 */

var ADMIN_SHEET = 'Admins';

// ============================ 인증 · Admins 화이트리스트 (작업1) ============================
function setupAdmins() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(ADMIN_SHEET) || ss.insertSheet(ADMIN_SHEET);
  sh.getRange(1, 1, 1, 4).setValues([['이메일', '이름', '역할', '등록일']])
    .setFontWeight('bold').setBackground('#F3ECDF').setFontColor('#3A2D22');
  sh.setFrozenRows(1);
  // 미쿠·희준 시드 등록 (중복 방지·멱등)
  var seed = [
    ['side.minds.1616@gmail.com', '미쿠', '대표'],
    ['gtrddrt7706@gmail.com', '희준', '대표']
  ];
  var existing = {};
  var last = sh.getLastRow();
  if (last >= 2) {
    sh.getRange(2, 1, last - 1, 1).getValues().forEach(function (r) { existing[String(r[0]).trim().toLowerCase()] = true; });
  }
  seed.forEach(function (s) {
    if (!existing[s[0].toLowerCase()]) sh.appendRow([s[0], s[1], s[2], fmtKST(new Date())]);
  });
  Logger.log('✅ setupAdmins 완료 — Admins 시트 + 미쿠·희준');
  return 'Admins 설치 완료';
}

function _adminSheet() { return SpreadsheetApp.getActive().getSheetByName(ADMIN_SHEET); }

// 이메일이 Admins 시트에 있나 (소문자 비교)
function isAdmin(email) {
  email = String(email || '').trim().toLowerCase();
  if (!email) return false;
  var sh = _adminSheet();
  if (!sh) return false;
  var last = sh.getLastRow();
  if (last < 2) return false;
  var vals = sh.getRange(2, 1, last - 1, 1).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toLowerCase() === email) return true;
  }
  return false;
}

function adminNameOf(email) {
  email = String(email || '').trim().toLowerCase();
  var sh = _adminSheet();
  if (!sh) return email;
  var last = sh.getLastRow();
  if (last < 2) return email;
  var vals = sh.getRange(2, 1, last - 1, 2).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0]).trim().toLowerCase() === email) return String(vals[i][1] || email);
  }
  return email;
}

function currentAdminEmail() {
  try { return String(Session.getActiveUser().getEmail() || '').trim(); } catch (e) { return ''; }
}

// 동작 함수 진입 가드 (보안 O — 화면만 막으면 우회 가능)
function _requireAdmin() {
  var e = currentAdminEmail();
  if (!isAdmin(e)) throw new Error('권한이 없습니다. (관리자 전용)');
  return e;
}

// ── 웹앱 진입 (doGet ?admin=1 에서 호출) ──
function serveAdmin(e) {
  var email = currentAdminEmail();
  if (!isAdmin(email)) {
    return infoPage('접근 권한이 없습니다',
      '관리자 전용 페이지입니다.<br>' +
      (email ? ('현재 로그인: ' + esc(email)) : '구글 로그인이 필요합니다.') +
      '<br><br>접근이 필요하시면 관리자에게 등록을 요청해 주세요.', false);
  }
  var t = HtmlService.createTemplateFromFile('Admin');
  t.adminName = adminNameOf(email);
  return t.evaluate().setTitle('Moment Edit · 관리자')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================ 홈 — 처리할 일 (작업2) ============================
// Customers 개인코드→{상품·단계} 맵 (상담 항목에 상품/단계 붙이기 — 1회 빌드)
function _custMap() {
  var m = {};
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < P.DATA_START_ROW) return m;
  var cCode = colOf['개인코드'], cProd = colOf['상품타입'], cStage = colOf['현재단계'];
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var c = String(vals[i][cCode - 1] || '').trim().toUpperCase();
    if (c) m[c] = { product: String(vals[i][cProd - 1] || ''), stage: String(vals[i][cStage - 1] || '') };
  }
  return m;
}

function adminHome() {
  _requireAdmin();
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var name = adminNameOf(currentAdminEmail());
  var groups = { pending: [], proposed: [], applied: [], upcoming: [] };
  var last = sheet.getLastRow();
  if (last < SYS.DATA_START_ROW) return { ok: true, groups: groups, name: name };

  var cmap = _custMap();
  // KST 기준 오늘 0시 ~ +7일 (스크립트 타임존 Asia/Seoul 전제 — P1.5)
  var now = new Date();
  var today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  var d7 = new Date(today0); d7.setDate(d7.getDate() + 7);

  var vals = sheet.getRange(SYS.DATA_START_ROW, 1, last - SYS.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  vals.forEach(function (rv) {
    var get = function (h) { var c = colOf[h]; return c ? rv[c - 1] : ''; };
    var st = String(get('상태') || '').trim();
    var code = String(get('개인코드') || '').trim().toUpperCase();
    var meta = cmap[code] || { product: '', stage: '' };
    var item = {
      code: code,
      names: _names(get('성함(신랑)'), get('성함(신부)')),
      product: meta.product,
      dateKey: normalizeDateKey(get('선택날짜')),
      time: String(get('선택시간') || '').trim(),
      dateLabel: get('선택날짜') ? prettyDate(get('선택날짜')) : ''
    };
    if (st === ST.PICKED) groups.pending.push(item);
    else if (st === ST.PROPOSED) groups.proposed.push(item);
    else if (st === ST.APPLIED) groups.applied.push(item);
    else if (LOCKED_STATES.indexOf(st) !== -1) {
      var sd = parseDateTime(get('선택날짜'), '00:00');
      if (sd && sd >= today0 && sd <= d7) {
        item.isToday = (sd.getTime() === today0.getTime());
        groups.upcoming.push(item);
      }
    }
  });
  groups.upcoming.sort(function (a, b) { return (a.dateKey + ' ' + a.time).localeCompare(b.dateKey + ' ' + b.time); });
  return { ok: true, groups: groups, name: name };
}

function _names(g, b) {
  g = String(g || '').trim(); b = String(b || '').trim();
  return (g && b) ? (g + ' · ' + b) : (g || b || '고객');
}

// ============================ 고객 상세 (작업3) ============================
function adminDetail(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: '개인코드가 없습니다.' };
  var cust = findCustomerByCode(code);
  var cr = findRowByPersonalCode(code);
  if (!cust && !cr) return { ok: false, error: '고객을 찾을 수 없습니다.' };

  var d = { ok: true, code: code };
  if (cust) {
    d.names = customerNames(cust);
    d.product = String(cust.get('상품타입') || '');
    d.stage = String(cust.get('현재단계') || '');
    d.phone = String(cust.get('연락처') || '');
    d.email = String(cust.get('이메일') || '');
    d.memo = String(cust.get('관리자메모') || '');
  } else {
    d.names = _names(cr.get('성함(신랑)'), cr.get('성함(신부)'));
    d.product = ''; d.stage = ''; d.phone = String(cr.get('연락처') || ''); d.email = String(cr.get('이메일') || ''); d.memo = '';
  }
  d.consult = cr ? _consultDetail(cr) : null;   // [상담] 섹션 (계약·제작은 v2·v3 — 프론트 자리)
  return d;
}

// 상담 27필드 + 상태·일정·환불·이력
function _consultDetail(cr) {
  var labels = ['경로', '예식일자', '요일', '시간대', '하객', '디지털참석', '의상',
    '분위기·스냅', '중요하게여김', '망설이는점', '준비상황', '참고링크', '자유메모',
    '그외가능시간대', '기타희망시간'];
  var fields = labels.map(function (h) {
    var v = String(cr.get(h) || '').trim();
    return { label: h, value: v || '—', isLink: (h === '참고링크' && /^https?:\/\//i.test(v)) };
  });
  return {
    status: String(cr.get('상태') || '').trim(),
    date: cr.get('선택날짜') ? prettyDate(cr.get('선택날짜')) : '',
    time: String(cr.get('선택시간') || '').trim(),
    rawDate: normalizeDateKey(cr.get('선택날짜')),
    proposedDate: cr.get('변경제안날짜') ? prettyDate(cr.get('변경제안날짜')) : '',
    proposedTime: String(cr.get('변경제안시간') || '').trim(),
    refund: String(cr.get('환불계좌') || '').trim(),
    confirmedAt: cr.get('확정일시') ? String(cr.get('확정일시')) : '',
    cancelledAt: cr.get('취소일시') ? String(cr.get('취소일시')) : '',
    fields: fields
  };
}

// 검색 (개인코드·이름·연락처 — 모든 상태 / 개선 E)
function adminSearch(query) {
  _requireAdmin();
  query = String(query || '').trim().toLowerCase();
  if (!query) return { ok: true, results: [] };
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < P.DATA_START_ROW) return { ok: true, results: [] };
  var q = query.replace(/[\s\-]/g, '');  // 연락처 하이픈·공백 무시 비교
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var get = function (rv, h) { var c = colOf[h]; return c ? String(rv[c - 1] || '') : ''; };
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var rv = vals[i];
    var code = get(rv, '개인코드').trim();
    var g = get(rv, '신랑이름'), b = get(rv, '신부이름'), phone = get(rv, '연락처');
    var hay = (code + ' ' + g + ' ' + b).toLowerCase();
    var phoneN = phone.replace(/[\s\-]/g, '');
    if (hay.indexOf(query) !== -1 || (q && phoneN.indexOf(q) !== -1)) {
      out.push({ code: code, names: _names(g, b), product: get(rv, '상품타입'), stage: get(rv, '현재단계') });
      if (out.length >= 30) break;
    }
  }
  return { ok: true, results: out };
}

// 관리자 메모 저장 (21열 · 내부 전용 — 마이페이지 미노출)
function adminSaveMemo(code, memo) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  touchCustomer(sheet, colOf, cust.num, { '관리자메모': String(memo || '') });
  return { ok: true };
}

// 처리 이력 append (개선 C·D — 사유·처리자를 관리자메모에 한 줄)
function _recordHandler(code, action) {
  try {
    var who = adminNameOf(currentAdminEmail());
    var cust = findCustomerByCode(code);
    if (!cust) return;
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var prev = String(cust.get('관리자메모') || '');
    var line = '[' + fmtKST(new Date()) + '] ' + who + ': ' + action;
    touchCustomer(sheet, colOf, cust.num, { '관리자메모': prev ? (prev + '\n' + line) : line });
  } catch (e) { Logger.log('처리이력 기록 실패: ' + e.message); }
}

// ============================ 상담 동작 (작업4) — 기존 함수 호출 + 가드 ============================
// 모든 동작: _requireAdmin(보안 O) · 최신 재조회(Q) · 취소건 가드(K) · 처리자 기록(D)

function adminApprove(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var sheet = getSheet(), colOf = buildHeaderIndex(sheet);
  var cr = findRowByPersonalCode(code);
  if (!cr) return { ok: false, error: '예약 정보를 찾을 수 없습니다.' };
  var r = row(sheet, colOf, cr.num);                 // Q 최신값
  var st = String(r.get('상태') || '').trim();
  if (st === ST.CANCELLED) return { ok: false, error: '취소된 예약은 승인할 수 없습니다. (되살아남 방지)' };  // K
  if (st !== ST.PICKED && LOCKED_STATES.indexOf(st) === -1) {
    return { ok: false, error: '승인할 수 있는 상태가 아닙니다. (현재: ' + (st || '없음') + ')' };
  }
  actApprove(sheet, colOf, r);                        // P1.5 Lock+슬롯재확인+setCustomerStage
  var after = String(row(sheet, colOf, cr.num).get('상태') || '').trim();
  if (after === ST.APPROVED || after === ST.CONFIRMED) { _recordHandler(code, '승인'); return { ok: true }; }
  return { ok: false, slotTaken: true, error: '그 시간이 방금 다른 예약으로 마감됐어요. 변경 제안을 보내 주세요.' };  // L
}

function adminAcceptProposal(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var sheet = getSheet(), colOf = buildHeaderIndex(sheet);
  var cr = findRowByPersonalCode(code);
  if (!cr) return { ok: false, error: '예약 정보를 찾을 수 없습니다.' };
  var r = row(sheet, colOf, cr.num);
  var st = String(r.get('상태') || '').trim();
  if (st === ST.CANCELLED) return { ok: false, error: '취소된 예약입니다.' };  // K
  if (st !== ST.PROPOSED) return { ok: false, error: '변경제안 상태가 아닙니다. (현재: ' + (st || '없음') + ')' };
  actAccept(sheet, colOf, r);
  _recordHandler(code, '변경제안 수락');
  return { ok: true };
}

function adminCancel(code, reason) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var sheet = getSheet(), colOf = buildHeaderIndex(sheet);
  var cr = findRowByPersonalCode(code);
  if (!cr) return { ok: false, error: '예약 정보를 찾을 수 없습니다.' };
  var r = row(sheet, colOf, cr.num);
  if (String(r.get('상태') || '').trim() === ST.CANCELLED) { _recordHandler(code, '취소(중복)'); return { ok: true }; }  // 멱등
  doAdminCancel(sheet, colOf, r);                     // 캘린더 삭제 + 상태=취소 + setCustomerStage(cancel)
  _recordHandler(code, '취소' + (reason ? (' · ' + reason) : ''));  // C·D 사유·처리자
  return { ok: true };
}

// 변경 제안 (개선 A·F) — 날짜·시간 입력 + 슬롯 충돌 검사
function adminProposeTime(code, newDate, newTime, memo) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var sheet = getSheet(), colOf = buildHeaderIndex(sheet);
  var cr = findRowByPersonalCode(code);
  if (!cr) return { ok: false, error: '예약 정보를 찾을 수 없습니다.' };
  var r = row(sheet, colOf, cr.num);
  if (String(r.get('상태') || '').trim() === ST.CANCELLED) return { ok: false, error: '취소된 예약입니다.' };
  newDate = normalizeDateKey(newDate);
  newTime = String(newTime || '').trim();
  if (!newDate || !newTime) return { ok: false, error: '날짜와 시간을 선택해 주세요.' };
  if (slotsForDate(newDate).indexOf(newTime) === -1) return { ok: false, error: '예약 가능한 시간이 아닙니다.' };
  if (_slotTaken(newDate, newTime, r.num)) return { ok: false, error: '그 시간은 이미 다른 예약으로 찼습니다. 다른 시간을 골라 주세요.' };  // F
  var consultToken = String(r.get('토큰') || '');
  var sig = sign(consultToken, 'change');             // submitProposal이 요구하는 서명 — 관리자가 직접 생성
  submitProposal(consultToken, sig, newDate, newTime, String(memo || ''));
  _recordHandler(code, '변경제안 ' + newDate + ' ' + newTime);
  return { ok: true };
}

// 변경 제안 입력창용 — 가능 슬롯 (getAvailability 재사용)
function adminAvailability() {
  _requireAdmin();
  var d = getAvailability();
  return { ok: true, avail: d.avail, full: d.full, slotsWeekday: CONFIG.SLOTS_WEEKDAY, slotsWeekend: CONFIG.SLOTS_WEEKEND };
}
