/**
 * Moment Edit · 관리자 페이지 (⑧ — 자체 아이디·비번 로그인)
 * ──────────────────────────────────────────────────────────────────────────
 * 미쿠·희준이 폰·PC 어디서든 URL 접속 → 아이디·비번 로그인 → 처리할 일·현황·상세·아카이브.
 *
 * [원칙] 관리자 동작은 P1.5 기존 함수 재사용 — 새 상태 로직 없음.
 *   actApprove · actAccept · doAdminCancel · submitProposal (consultation-booking.gs)
 *   슬롯 Lock+재확인 · setCustomerStage 단일 전이 = P1.5 그대로. 관리자 래퍼는 '호출만'.
 *
 * [라우트] doGet ?admin=1 → serveAdmin(셸만). 고객용 흐름과 분리.
 * [인증] 자체 아이디·비번(Admins 시트·해시) → 로그인토큰. adminCall(token,fn,args) 단일 게이트웨이가
 *   토큰 1회 검증(_AUTHED) 후 위임 → 각 동작 함수는 _requireAdmin()만(보안 O). 편집기 실행은 소유자 폴백.
 *   계정 등록 = setAdminAccount(아이디,비번,이름)(편집기). 비번은 해시로만 저장.
 * [배포] 관리자 웹앱 액세스 = '모든 사용자'(토큰이 게이트). 고객 배포와 별개 배포.
 *
 * 재사용(consultation-booking 전역): getSheet·buildHeaderIndex·row·findRowByPersonalCode·
 *   actApprove·actAccept·doAdminCancel·submitProposal·sign·getAvailability·_slotTaken·
 *   ST·LOCKED_STATES·normalizeDateKey·prettyDate·slotsForDate·parseDateTime·esc·CONFIG·SYS·fmtKST
 * 재사용(platform): getCustomersSheet·findCustomerByCode·touchCustomer·customerNames·P
 */

var ADMIN_SHEET = 'Admins';
var ADMIN_HEADERS = ['아이디', '비번해시', '이름', '역할', '로그인토큰', '토큰만료', '등록일'];
var _ADMIN_OWNER_EMAILS = ['side.minds.1616@gmail.com', 'gtrddrt7706@gmail.com']; // 편집기(소유자) 실행 폴백
var _AUTHED = false;          // adminCall 디스패처가 토큰 검증 후 true (1회 실행 한정)
var _CURRENT_ADMIN = '';      // _requireAdmin이 이름 저장 → _recordHandler가 처리이력에 사용

// ============================ 인증 · Admins (아이디·비번 로그인) ============================
// 구글 로그인 대신 자체 아이디·비번(마이페이지 패턴) — 어떤 기기·브라우저든 URL 로그인.
// 비번은 평문 저장 X → setAdminAccount(아이디,비번,이름)로 해시 등록(편집기 실행).
function setupAdmins() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(ADMIN_SHEET) || ss.insertSheet(ADMIN_SHEET);
  if (sh.getMaxColumns() < ADMIN_HEADERS.length) sh.insertColumnsAfter(sh.getMaxColumns(), ADMIN_HEADERS.length - sh.getMaxColumns());
  sh.getRange(1, 1, 1, ADMIN_HEADERS.length).setValues([ADMIN_HEADERS])
    .setFontWeight('bold').setBackground('#F3ECDF').setFontColor('#3A2D22');
  sh.setFrozenRows(1);
  var colOf = buildHeaderIndex(sh);
  ['비번해시', '로그인토큰', '토큰만료'].forEach(function (h) { if (colOf[h]) sh.getRange(2, colOf[h], Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@'); });
  Logger.log('✅ setupAdmins 완료 — Admins 시트. setAdminAccount("아이디","비번","이름")으로 계정 등록하세요.');
  return 'Admins 설치 완료 — setAdminAccount(아이디, 비번, 이름)으로 계정을 등록하세요.';
}

function _adminSheet() { return SpreadsheetApp.getActive().getSheetByName(ADMIN_SHEET); }

// 한 컬럼 값으로 Admins 행 → {num, get} 또는 null
function _findAdminRow(header, value, ci) {
  var sh = _adminSheet(); if (!sh) return null;
  var colOf = buildHeaderIndex(sh), c = colOf[header], last = sh.getLastRow();
  if (!c || last < 2) return null;
  var cmp = ci ? String(value).trim().toLowerCase() : String(value).trim();
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var cell = String(vals[i][c - 1] || '').trim();
    if ((ci ? cell.toLowerCase() : cell) === cmp) return rowFromValues(colOf, vals[i], 2 + i);
  }
  return null;
}

// ★ 계정 등록·갱신 (편집기에서 실행) — 비번은 해시로만 저장. 예: setAdminAccount('nm012','비번6자↑','미쿠')
function setAdminAccount(id, pw, name, role) {
  id = String(id || '').trim(); name = String(name || '').trim(); role = String(role || '대표').trim();
  if (!id || !name) return '사용법: setAdminAccount("아이디","비밀번호","이름")  (예: setAdminAccount("nm012","비번6자↑","미쿠"))';
  var pe = pwPolicyError(pw); if (pe) return pe;
  var sh = _adminSheet(); if (!sh) return 'Admins 시트가 없습니다 — setupAdmins() 먼저 실행하세요.';
  var colOf = buildHeaderIndex(sh), hash = hashPassword(pw);
  var ex = _findAdminRow('아이디', id, true);
  if (ex) {
    sh.getRange(ex.num, colOf['비번해시']).setValue(hash);
    sh.getRange(ex.num, colOf['이름']).setValue(name);
    sh.getRange(ex.num, colOf['역할']).setValue(role);
    // 비번 변경 시 기존 세션 토큰 전부 무효화 — 유출·구 세션이 새 비번 이후에도 살아있지 않게(재로그인 강제)
    if (colOf['로그인토큰']) sh.getRange(ex.num, colOf['로그인토큰']).setValue('');
    if (colOf['토큰만료']) sh.getRange(ex.num, colOf['토큰만료']).setValue('');
    Logger.log('✅ 계정 갱신: ' + id + ' (' + name + ') · 기존 세션 토큰 초기화(재로그인 필요)');
    return '계정 갱신됨: ' + id + ' (' + name + ')';
  }
  var rowData = ADMIN_HEADERS.map(function (h) {
    return h === '아이디' ? id : h === '비번해시' ? hash : h === '이름' ? name : h === '역할' ? role : h === '등록일' ? fmtKST(new Date()) : '';
  });
  sh.appendRow(rowData);
  Logger.log('✅ 계정 등록: ' + id + ' (' + name + ')');
  return '계정 등록됨: ' + id + ' (' + name + ')';
}

// [다중 기기 토큰 · 2026-06-12] 로그인토큰 칸에 JSON 배열 [{t:토큰,e:만료}] 최근 5개 보관.
//   기존(단일 토큰 덮어쓰기) 구조에서는 폰·다른 브라우저로 로그인하는 순간 기존 기기가
//   '세션 만료'로 풀리던 문제("됐다가 안 됨")가 있었음. 레거시 단일 문자열도 그대로 인식.
function _parseTokens(cell) {
  var s = String(cell || '').trim();
  if (!s) return [];
  if (s.charAt(0) === '[') { try { var a = JSON.parse(s); return Array.isArray(a) ? a : []; } catch (e) { return []; } }
  return [{ t: s, e: '' }];   // 레거시 단일 토큰(만료는 토큰만료 칸 기준)
}
function _liveTokens(list, legacyExpiry) {
  return (list || []).filter(function (it) { return it && it.t && !tokenExpired(it.e || legacyExpiry); });
}

// 로그인 — 아이디·비번 검증 → 토큰 발급(기기 5대까지 동시 유지). (인증 자체이므로 토큰 불필요 · 디스패처 밖에서 직접 호출)
function adminLogin(id, pw) {
  id = String(id || '').trim();
  if (!id || !pw) return { ok: false, error: '아이디와 비밀번호를 입력해 주세요.' };
  var r = _findAdminRow('아이디', id, true);
  if (!r || !verifyPassword(pw, r.get('비번해시'))) return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  var sh = _adminSheet(), colOf = buildHeaderIndex(sh);
  var token = makeToken();
  var expiry = fmtKST(new Date(Date.now() + (P.TOKEN_VALID_DAYS || 14) * 86400 * 1000));
  var list = _liveTokens(_parseTokens(r.get('로그인토큰')), r.get('토큰만료'));
  list.push({ t: token, e: expiry });
  if (list.length > 5) list = list.slice(-5);
  sh.getRange(r.num, colOf['로그인토큰']).setValue(JSON.stringify(list));
  sh.getRange(r.num, colOf['토큰만료']).setValue(expiry);   // 표시용(가장 최근 만료)
  return { ok: true, token: token, name: String(r.get('이름') || id) };
}

function adminLogout(token) {
  token = String(token || '').trim();
  if (!token) return { ok: true };
  var sh = _adminSheet(); if (!sh) return { ok: true };
  var colOf = buildHeaderIndex(sh), last = sh.getLastRow();
  if (!colOf['로그인토큰'] || last < 2) return { ok: true };
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var r = rowFromValues(colOf, vals[i], 2 + i);
    var list = _parseTokens(r.get('로그인토큰'));
    var kept = list.filter(function (it) { return it.t !== token; });
    if (kept.length !== list.length) {
      sh.getRange(r.num, colOf['로그인토큰']).setValue(kept.length ? JSON.stringify(kept) : '');
      if (!kept.length) sh.getRange(r.num, colOf['토큰만료']).setValue('');
      break;
    }
  }
  return { ok: true };
}

// 토큰 → 관리자 {ok, id, name, role} / {ok:false}
function _resolveAdmin(token) {
  token = String(token || '').trim();
  if (!token) return { ok: false };
  var sh = _adminSheet(); if (!sh) return { ok: false };
  var colOf = buildHeaderIndex(sh), last = sh.getLastRow();
  if (!colOf['로그인토큰'] || last < 2) return { ok: false };
  var vals = sh.getRange(2, 1, last - 1, sh.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var r = rowFromValues(colOf, vals[i], 2 + i);
    var list = _parseTokens(r.get('로그인토큰'));
    for (var k = 0; k < list.length; k++) {
      if (list[k] && list[k].t === token) {
        if (tokenExpired(list[k].e || r.get('토큰만료'))) return { ok: false, reason: 'expired' };
        return { ok: true, id: String(r.get('아이디') || ''), name: String(r.get('이름') || ''), role: String(r.get('역할') || '') };
      }
    }
  }
  return { ok: false };
}

// 동작 가드 — 디스패처가 이미 검증(_AUTHED)했으면 통과 / 아니면 토큰 OR 편집기 소유자(폴백).
function _requireAdmin(token) {
  if (_AUTHED) return { ok: true, name: _CURRENT_ADMIN };
  var a = _resolveAdmin(token);
  if (a.ok) { _CURRENT_ADMIN = a.name || '관리자'; return a; }
  var email = ''; try { email = String(Session.getActiveUser().getEmail() || '').trim().toLowerCase(); } catch (e) {}
  if (email && _ADMIN_OWNER_EMAILS.indexOf(email) !== -1) { _CURRENT_ADMIN = '관리자'; return { ok: true, name: '관리자' }; }
  throw new Error('로그인이 필요합니다. (관리자 전용)');
}

// ★ 단일 게이트웨이 — Admin.html의 모든 데이터·동작 호출이 여기로(토큰 1회 검증 → 위임).
//   client: gas(fn,...args) → adminCall(TOKEN, fn, [args]). adminLogin/Logout만 직접 호출.
function adminCall(token, fn, args) {
  _requireAdmin(token);          // 토큰 검증(실패 시 throw) + _CURRENT_ADMIN 설정
  _AUTHED = true;
  try {
    args = args || [];
    var FNS = {
      adminHome: adminHome, adminDetail: adminDetail, adminArchive: adminArchive, adminSearch: adminSearch, adminSaveMemo: adminSaveMemo,
      adminApprove: adminApprove, adminAcceptProposal: adminAcceptProposal, adminCancel: adminCancel, adminProposeTime: adminProposeTime, adminAvailability: adminAvailability,
      adminGetSignature: adminGetSignature, adminListAiHandoffs: adminListAiHandoffs, adminResolveAiHandoff: adminResolveAiHandoff, adminListWeddingBlocks: adminListWeddingBlocks, adminSetWeddingBlock: adminSetWeddingBlock, adminRemoveWeddingBlock: adminRemoveWeddingBlock, adminSendContract: adminSendContract, adminConfirmPayment: adminConfirmPayment, adminConfirmBalance: adminConfirmBalance, adminConfirmMid: adminConfirmMid, adminOpenFittingConsent: adminOpenFittingConsent,
      adminMarkConsultDone: adminMarkConsultDone, adminSetResultLinks: adminSetResultLinks, adminMarkEventDone: adminMarkEventDone, adminMarkDelivered: adminMarkDelivered,
      adminConfirmExtra: adminConfirmExtra, adminStartRetouch: adminStartRetouch, adminGrantWeddingHold: adminGrantWeddingHold, adminDeclineWeddingHold: adminDeclineWeddingHold, adminSkipSurvey: adminSkipSurvey,
      adminForceStage: adminForceStage, adminCloseFitting: adminCloseFitting, adminMarkNoshow: adminMarkNoshow, adminMarkUncontracted: adminMarkUncontracted,
      adminUndoConfirmPayment: adminUndoConfirmPayment, adminUndoConfirmPreview: adminUndoConfirmPreview,   // [ADM_AC1]
      adminUndoRefunded: adminUndoRefunded,   // [ADM_AC2]
      adminForceStagePreview: adminForceStagePreview,   // [ADM_AC3]
      adminNotifyText: adminNotifyText,   // [ADM_AC5]
      adminIssueCashReceipt: adminIssueCashReceipt, adminUndoCashReceipt: adminUndoCashReceipt, adminMarkRefunded: adminMarkRefunded, adminFittingDoc: adminFittingDoc, adminSetFittingCount: adminSetFittingCount, adminConfirmMidBalance: adminConfirmMidBalance,
      adminConfirmWeddingChange: adminConfirmWeddingChange, adminDeclineWeddingChange: adminDeclineWeddingChange,
      aiCostSummary24h: aiCostSummary24h, aiTestScenarios: aiTestScenarios, aiTestScenariosSave: aiTestScenariosSave,
      aiDraftAnswer: aiDraftAnswer,   // [KB_DRAFT] «가르치기» 탭 원클릭 초안 — 화이트리스트에 없으면 버튼이 «알 수 없는 요청»으로 죽는다
      aiKbNoteList: aiKbNoteList, aiKbNoteAdd: aiKbNoteAdd, aiKbNoteSetActive: aiKbNoteSetActive, aiKbNoteDelete: aiKbNoteDelete,
      aiTestRunSave: aiTestRunSave, aiAlertAdmin: aiAlertAdmin, aiBudgetGet: aiBudgetGet, aiBudgetSet: aiBudgetSet, aiQuestionLog: aiQuestionLog,
      aiSafetyNow: aiSafetyNow, aiSafetyHistory: aiSafetyHistory, aiDigestPreview: aiDigestPreview, aiQuestionReport: aiQuestionReport,
      aiFactsList: aiFactsList, aiFactSet: aiFactSet, aiFactDelete: aiFactDelete, aiFactHistory: aiFactHistory, aiFactRollback: aiFactRollback,
      aiRegList: aiRegList, aiRegAdd: aiRegAdd, aiRegSetActive: aiRegSetActive, aiRegDelete: aiRegDelete,
      adminListLeads: adminListLeads, adminResolveLead: adminResolveLead, aiQuestionResolve: aiQuestionResolve,
      adminIssueCoupon: adminIssueCoupon, adminRevokeCoupon: adminRevokeCoupon,
      solapiUsageSummary: solapiUsageSummary
    };
    var f = FNS[fn];
    if (!f) return { ok: false, error: '알 수 없는 요청: ' + fn };
    return f.apply(null, args);
  } finally { _AUTHED = false; }
}

// [서류] 시착 동의서 문서 데이터 — 문서 뷰어(/contract/fitting.html) 채움용(이름·일시·서명·서명 당시 버전 전문).
function adminFittingDoc(code) {
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var rec = _parseJsonSafe(cust.get('동의기록')).시착 || {};
  var ver = String(rec.version || (typeof FITTING_CONSENT !== 'undefined' ? FITTING_CONSENT.version : ''));
  var terms = (typeof FITTING_TERMS_BY_VERSION !== 'undefined' && FITTING_TERMS_BY_VERSION[ver])
    || ((typeof FITTING_CONSENT !== 'undefined' && FITTING_CONSENT.terms) ? FITTING_CONSENT.terms : []);
  return { ok: true, doc: {
    version: ver, terms: terms,
    groom: String(cust.get('신랑이름') || ''), bride: String(cust.get('신부이름') || ''),
    signedAt: String(cust.get('시착동의일시') || ''),
    signImage: getSignatureDataUrl(code, '시착') || '',
    count: (rec.벌수 != null ? Number(rec.벌수) : null),               // 기록된 시착 벌수(공제·증빙용)
    countAt: String(rec.벌수기록 || '')
  } };
}

// ============================ 운영 블록 (날짜 막기 · 2026-06-12) ============================
// 휴무·개인 일정 등으로 예식 슬롯을 통째로 막는다 — Script Properties 'WEDDING_BLOCKS'.
// 반영 범위: 마이페이지 계약요청·예식일변경·임시고정 달력(weddingAvailability) + 요청·서명 서버 가드(_weddingSlotTaken).
function adminListWeddingBlocks() {
  _requireAdmin();
  var bk = _weddingBlocks(), out = [];
  for (var d in bk) out.push({ date: d, slots: bk[d] });
  out.sort(function (a, b) { return a.date < b.date ? -1 : 1; });
  return { ok: true, blocks: out };
}
function adminSetWeddingBlock(date, slots) {
  _requireAdmin();
  date = String(date || '').trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return { ok: false, error: '날짜 형식이 올바르지 않습니다. (YYYY-MM-DD)' };
  var ALL = ['09:00', '12:20', '15:40'];
  var list = (Array.isArray(slots) ? slots : []).filter(function (t) { return ALL.indexOf(t) !== -1; });
  if (!list.length) list = ALL.slice();   // 타임 미지정 = 전일 휴무
  var bk = _weddingBlocks();
  bk[date] = list;
  PropertiesService.getScriptProperties().setProperty('WEDDING_BLOCKS', JSON.stringify(bk));
  _recordHandler('-', '운영 블록 설정: ' + date + ' · ' + (list.length === 3 ? '전체' : list.join(',')));
  return { ok: true, blocks: adminListWeddingBlocks().blocks };
}
function adminRemoveWeddingBlock(date) {
  _requireAdmin();
  date = String(date || '').trim();
  var bk = _weddingBlocks();
  if (bk[date]) { delete bk[date]; PropertiesService.getScriptProperties().setProperty('WEDDING_BLOCKS', JSON.stringify(bk)); _recordHandler('-', '운영 블록 해제: ' + date); }
  return { ok: true, blocks: adminListWeddingBlocks().blocks };
}

// [02-2] 시착 벌수 기록 — 벌수 비례 공제(계약서 4조⑧·시착동의 v3)의 산정 근거. 동의기록.시착.벌수에 저장(이력 포함).
//   환불 계산: 공제 = min(벌수×50,000, 100,000) / 3벌째부터는 추가 시착비(1벌당 50,000원) 별도 청구 대상.
function adminSetFittingCount(code, n) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cnt = Math.floor(Number(n));
  if (!(cnt >= 0 && cnt <= 9)) return { ok: false, error: '벌수는 0~9 사이 숫자로 입력해 주세요.' };
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    if (String(cust.get('시착동의상태') || '').trim() !== '동의완료') return { ok: false, error: '시착 동의 서명 후에 벌수를 기록할 수 있어요.' };   // 서명 전 기록 차단 — handleSignFittingconsent가 시착 객체를 통째 교체하므로 유실 방지
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var rec = _parseJsonSafe(cust.get('동의기록'));
    rec.시착 = rec.시착 || {};
    var prev = (rec.시착.벌수 != null) ? Number(rec.시착.벌수) : null;
    rec.시착.벌수 = cnt;
    rec.시착.벌수기록 = fmtKST(new Date());
    touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
    _recordHandler(code, '시착 벌수 기록: ' + cnt + '벌' + (prev != null && prev !== cnt ? ' (이전 ' + prev + '벌)' : ''));
    return { ok: true, count: cnt, deduct: Math.min(cnt * 50000, 100000), extra: Math.max(0, cnt - 2) * 50000 };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// ── 웹앱 진입 (doGet ?admin=1) — 셸만 서빙(로그인은 클라이언트 토큰). 접근=모든 사용자 배포. ──
function serveAdmin(e) {
  var t = HtmlService.createTemplateFromFile('Admin');
  return t.evaluate().setTitle('Moment Edit · 관리자')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================ ⑧ 공통 — 명시적 KST 날짜 헬퍼 (프로젝트 TZ 무관·A3.1) ============================
function _kstYmd(d) { return Utilities.formatDate(d || new Date(), 'Asia/Seoul', 'yyyy-MM-dd'); }
function _ymdOf(v) {
  if (v instanceof Date) return _kstYmd(v);
  var m = String(v == null ? '' : v).match(/(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? (m[1] + '-' + ('0' + m[2]).slice(-2) + '-' + ('0' + m[3]).slice(-2)) : '';
}
function _ymdNum(ymd) { var m = String(ymd || '').match(/(\d{4})-(\d{1,2})-(\d{1,2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3]) : null; }
// a - b (정수 일수). 양수 = a가 b보다 미래. 못 읽으면 null.
function _dayDiff(aYmd, bYmd) { var a = _ymdNum(aYmd), b = _ymdNum(bYmd); return (a == null || b == null) ? null : Math.round((a - b) / 86400000); }
// 대기 타이브레이크 — 오래된(작은 날짜) 먼저. 빈값은 맨 뒤.
function _cmpWait(a, b) { a = a || '9999'; b = b || '9999'; return a < b ? -1 : (a > b ? 1 : 0); }

// 자정(KST) 기준 남은 날 라벨 — 오늘/내일/내일모레/그 이후 D-n (+날짜). 지난·미정은 빈값.
function _dueWhen(n, md) {
  var tag = (n == null || n < 0) ? '' : (n === 0 ? '오늘' : (n === 1 ? '내일' : (n === 2 ? '내일모레' : 'D-' + n)));
  if (!tag) return md ? ' · ' + md : '';
  return ' · ' + tag + (md ? ' (' + md + ')' : '');
}

// 예식일 변경 표시용 — '11/27(토)'(+슬롯 라벨 '오후'). 변경확인 큐 카드의 from→to 짧은 표기.
function _chgWhenLabel(ymd, slot) {
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(ymd || '');
  var w = ['일', '월', '화', '수', '목', '금', '토'][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
  var lab = ({ '09:00': '오전', '12:20': '오후', '15:40': '늦은 오후' })[String(slot || '').trim()] || '';
  return (+m[2]) + '/' + (+m[3]) + '(' + w + ')' + (lab ? (' ' + lab) : '');
}

// 임시고정 표시용 — '2026.6.11(목) 오후 12:20'
function _holdWhenLabel(ymd, slot) {
  slot = String(slot || '').trim();
  var lab = ({ '09:00': '오전', '12:20': '오후', '15:40': '늦은 오후' })[slot] || '';
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return (String(ymd || '') + ' ' + slot).trim();
  var w = ['일', '월', '화', '수', '목', '금', '토'][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
  return m[1] + '.' + (+m[2]) + '.' + (+m[3]) + '(' + w + ') ' + (lab ? lab + ' ' : '') + slot;
}

/* [DATE_ONE_STYLE 2026-08-18 점검] 'YYYY-MM-DD' → '2026.8.20(수)'. _holdWhenLabel 과 같은 표기를 쓴다.
   한 문장에 '2026.12.20(일)' 과 '2026-08-20' 이 같이 나오면 두 날짜가 다른 종류처럼 읽힌다. */
function _ymdDot(ymd) {
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return String(ymd || '');
  var w = ['일', '월', '화', '수', '목', '금', '토'][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
  return m[1] + '.' + (+m[2]) + '.' + (+m[3]) + '(' + w + ')';
}

// 현황 줄 하위상태 1줄 (B2.2) — 단계+상품+보조상태
function _subStatusFor(stage, isSnap, x) {
  switch (stage) {
    case '신청접수': return (x.booking === ST.PICKED) ? '승인 대기' : '시간 선택 대기';
    case '상담확정': return x.consultPast ? ('상담일 지남' + (x.consultDate ? ' · ' + x.consultDate : '')) : ('상담 예정' + _dueWhen(x.cdday, x.consultDate));
    case '촬영확정': return x.consultPast ? ('촬영일 지남' + (x.consultDate ? ' · ' + x.consultDate : '')) : ('촬영 예정' + _dueWhen(x.cdday, x.consultDate));
    case '시착': return (x.시착 === '동의완료') ? '시착 완료 · 상담완료 대기' : '고객 시착 서명 대기';
    case '상담완료': return (!x.계약 || x.계약 === '미발송') ? (x.hasReq ? '계약서 발송 대기' : '고객 계약정보 입력 대기') : '계약 진행 중';
    case '계약완료': {   // [STALE_ROLLBACK_Q] 되돌려진 상태 — '입금 대기'라고 하면 이미 낸 돈을 또 기다리는 것처럼 읽힌다
      // [STALE_ROLLBACK_WIDE] 계약금이 취소돼도 중도금·잔금 '확인'이 남아 있으면 같은 «정리 필요» 상태다
      var _srSub = [];
      if (x.입금 === '확인') _srSub.push('계약금');
      if (x.중도금 === '확인') _srSub.push('중도금');
      if (x.잔금 === '확인') _srSub.push('잔금');
      if (_srSub.length) return _srSub.join('·') + ' 확인됨 · 단계 정리 필요';
      return (x.계약 === '서명완료') ? '입금 대기' : '계약 서명 대기';
    }
    case '입금완료': return isSnap ? '촬영 준비' : '제작 시작 대기';
    // ★SUBSTATUS_TRACKS(2026-07-25 코워크 교차검증 주의2): 청첩장 하나만 보던 판정 → 트랙 전체.
    //   식순·좌석만 만든 고객이 '제작 시작 전'으로 잘못 보이던 문제(전이 정상화로 유입 증가). invStatus 단독 판정 복원 금지.
    case '제작중': return (function () {
      var _t = x.tracks || {};
      var _keys = ['invitation', 'ritual', 'dining', 'final', 'seat', 'snap', 'guideinfo'];
      var _done = 0, _doing = 0;
      _keys.forEach(function (k) { var v = String(_t[k] || '').trim(); if (v === '완료') _done++; else if (v) _doing++; });
      if (!_done && !_doing) return (x.invStatus === '완료') ? '청첩장 발행됨' : (x.invStatus === '진행중' ? '청첩장 만드는 중' : '제작 시작 전');
      return '제작 진행 중 · ' + _done + '/' + (_done + _doing) + ' 완료';
    })();
    case '예식완료': return _resultSub(x);
    case '촬영완료': return _resultSub(x);
    default: return '';
  }
}
// 결과물 단계 서브상태 — 결과물상태 기준(원본전달=고객 선택 대기 / 선택완료=보정 대기 / 보정중=전달 대기)
function _resultSub(x) {
  var r = (x.결과물 === '업로드') ? '원본전달' : (x.결과물 || '');
  if (r === '컨펌완료') return '고객 컨펌 완료 · 전달 가능';
  if (r === '컨펌대기') return '보정본 전달 · 고객 컨펌 대기';
  if (r === '보정중') return '보정 중';
  if (r === '선택완료') return '고객 ' + (x.선택수 || '0') + '컷 선택 · 보정 대기';
  if (r === '원본전달') return '고객 컷 선택 대기';
  return x.원본 ? '결과물 진행 중' : '결과물 등록 대기';
}

// ============================ 자동 브리핑 (트리거 — setupAllTriggers) ============================
// 브리핑 메일 직송 게이트 — SEND_ADMIN_MAIL(건별 알림 OFF)과 별개. CONFIG에 SEND_DAILY_BRIEF=false로 끌 수 있음.
function _briefMailOk() {
  try { return CONFIG.SEND_DAILY_BRIEF !== false && CONFIG.ADMIN_EMAIL && String(CONFIG.ADMIN_EMAIL).charAt(0) !== '['; } catch (e) { return false; }
}
// [데이터] 아침 브리핑 소스 — 오늘 상담 일정 + 처리할 일 큐. 발송 안 함(읽기 전용).
//   2026-06-29 통합: aiMorningReport가 이 데이터를 읽어 '아침 운영 보고' 메일 1통에 합쳐 보냄(개별 브리핑 메일 폐지).
function morningBriefData() {
  var d;
  _AUTHED = true;                                  // 트리거 컨텍스트 — adminCall과 동일한 내부 인증 패턴
  try { d = adminHome(); } finally { _AUTHED = false; }
  if (!d || !d.ok) return null;
  var today = d.today;
  var bs = getSheet(), bc = buildHeaderIndex(bs), bLast = bs.getLastRow();
  var todays = [];
  if (bLast >= SYS.DATA_START_ROW) {
    var rows = bs.getRange(SYS.DATA_START_ROW, 1, bLast - SYS.DATA_START_ROW + 1, bs.getLastColumn()).getValues();
    var bg = function (rv, h) { var col = bc[h]; return col ? rv[col - 1] : ''; };
    rows.forEach(function (rv) {
      var st = String(bg(rv, '상태') || '').trim();
      if (st !== ST.APPROVED && st !== ST.CONFIRMED) return;
      if (_ymdOf(bg(rv, '선택날짜')) !== today) return;
      todays.push(String(bg(rv, '선택시간') || '').trim() + ' ' + _names(bg(rv, '성함(신랑)'), bg(rv, '성함(신부)')));
    });
    todays.sort();
  }
  var q = d.queue.urgent.concat(d.queue.normal);
  var byKind = {};
  q.forEach(function (it) { byKind[it.kind] = (byKind[it.kind] || 0) + 1; });
  var kindLine = Object.keys(byKind).map(function (k) { return k + ' ' + byKind[k]; }).join(' · ');
  return { todays: todays, total: d.counts.total, urgent: d.counts.urgent, kindLine: kindLine,
    urgentNames: d.queue.urgent.slice(0, 6).map(function (it) { return it.names + '·' + it.kind; }) };
}

/* [ADM_AC5] 고객에게 보낼 카톡 문구 1건을 그대로 돌려준다(발송하지 않음).
     중도금·잔금·묶음 확인은 cust.paymentConfirmed가 꺼져 있어(95_notify · 2026-06-12 사용자 결정) 자동 발송이 없다.
     ★여기서 알림을 켜지 않는다. 대신 관리자가 필요할 때 직접 보낼 수 있게 문구만 복사해 준다.
     문구는 95_notify의 템플릿(_nfCustomerMsg)을 그대로 읽는다 — 관리자용 문구를 따로 쓰면 두 곳이 갈라진다. */
function adminNotifyText(code, event, kind) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  event = String(event || '').trim();
  if (['cust.paymentConfirmed'].indexOf(event) === -1) return { ok: false, error: '지원하지 않는 알림 문구예요.' };
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (typeof _nfCustomerMsg !== 'function') return { ok: false, error: '알림 문구 모듈을 불러오지 못했어요. (95_notify 배포 확인)' };
  var name = '';
  try { name = customerNames(cust); } catch (e) {}
  var msg = _nfCustomerMsg(event, name || '고객', { kind: String(kind || '').trim() || '결제' });
  var text = String((msg && msg.text) || '').trim();
  if (!text) return { ok: false, error: '문구를 만들지 못했어요.' };
  return { ok: true, text: text };
}

/* [ADM_AC4] 이번 달 사업현황(읽기 전용) — aiMorningReport가 읽어 아침 메일에 한 줄로 싣는다.
     ★매출 집계 기준 = '확인'된 입금의 합(실입금). 계약총액 합계가 아니다.
       계약총액으로 세면 아직 안 들어온 돈까지 매출로 잡혀 숫자를 믿을 수 없게 된다.
     · 계약금 잔액 = 계약 시 실제로 들어온 현금(_journeyAmounts.납부액). 확인 시각은 동의기록.영수증기준일.예약금.
     · 중도금·잔금 = 각 확인일시가 이번 달인 것. 잔금은 확정 스냅샷(잔금확정금액) 우선 · 없으면 기본액.
     · 추가 보정 = '완료'(입금 확인)된 건 · 확인 시각은 동의기록.영수증기준일.추가보정.
     · 상담 예약금(10만)은 Bookings에 '확인' 여부만 있고 확인 날짜가 없어 월 귀속을 할 수 없다 → 제외(라벨에 명시).
     계약 건수 = 이번 달 계약서명일시 · 전달 건수 = 이번 달 동의기록.결과물전달일. */
function monthBusinessData() {
  var mon = Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM');
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return { month: mon, contracts: 0, revenue: 0, delivered: 0 };
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var g = function (rv, h) { var c = colOf[h]; return c ? rv[c - 1] : ''; };
  var inMon = function (v) { var y = _ymdOf(v); return !!y && y.slice(0, 7) === mon; };
  var contracts = 0, revenue = 0, delivered = 0;
  vals.forEach(function (rv) {
    if (!String(g(rv, '개인코드') || '').trim()) return;
    if (inMon(g(rv, '계약서명일시'))) contracts++;
    var rec = _parseJsonSafe(g(rv, '동의기록'));
    if (inMon(rec.결과물전달일)) delivered++;
    var am = _journeyAmounts(g(rv, '계약총액'), g(rv, '상품타입'));
    if (am) {
      if (String(g(rv, '입금상태') || '').trim() === '확인' && inMon((rec.영수증기준일 || {}).예약금)) revenue += Number(am.납부액) || 0;
      if (String(g(rv, '중도금상태') || '').trim() === '확인' && inMon(g(rv, '중도금확인일시'))) revenue += Number(am.중도금) || 0;
      if (String(g(rv, '잔금상태') || '').trim() === '확인' && inMon(g(rv, '잔금확인일시'))) revenue += Math.round(Number(rec.잔금확정금액) || Number(am.잔금) || 0);
    }
    if (String(g(rv, '추가보정상태') || '').trim() === '완료' && inMon((rec.영수증기준일 || {}).추가보정)) revenue += Math.round(Number(g(rv, '추가보정금액')) || 0);
  });
  return { month: mon, contracts: contracts, revenue: Math.round(revenue), delivered: delivered };
}

// (구) 아침 브리핑 개별 메일 — 2026-06-29 aiMorningReport로 통합(중복 제거). 트리거에서 제거 · 하위호환 no-op.
function sendMorningBrief() { return; }

// 현금영수증 발급 기한 배지 — 받은 날(확인일)부터 5일(의무발행). 3일 경과부터 빨강, 5일 넘으면 '기한 경과'.
function _crDueBadge(baseStr, todayYmd) {
  var b = _ymdOf(baseStr); if (!b) return { level: 'yellow', text: '발행 대기' };
  var n = _dayDiff(todayYmd, b);
  if (n >= 5) return { level: 'red', text: '기한 경과 D+' + n };
  if (n >= 3) return { level: 'red', text: '기한 D-' + (5 - n) };
  return { level: 'yellow', text: '발행 대기 D+' + n };
}

// [트리거·매주 월 9시] 현금영수증 미발행 주간 점검 — 입금 확인됐는데 미발행(의무발급·가산세 방지) 전 고객 집계(아카이브 포함).
function weeklyReceiptAudit() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  // 상담 예약금 입금 확인(서명 전) 맵 — 예약금 영수증 기한은 '받은 날' 기준이라 계약 전 건도 잡는다
  var bkPaid = {};
  try {
    var bs = getSheet(), bCol = buildHeaderIndex(bs), bLast = bs.getLastRow();   // 예약(Bookings) 시트
    var bRows = (bLast >= SYS.DATA_START_ROW) ? bs.getRange(SYS.DATA_START_ROW, 1, bLast - SYS.DATA_START_ROW + 1, bs.getLastColumn()).getValues() : [];
    bRows.forEach(function (bv) {
      var bc = bCol['개인코드'] ? String(bv[bCol['개인코드'] - 1] || '').trim().toUpperCase() : '';
      if (bc && bCol['입금확인'] && String(bv[bCol['입금확인'] - 1] || '').trim() === '확인') bkPaid[bc] = true;
    });
  } catch (e) { Logger.log('weeklyReceiptAudit: 예약 시트 조회 실패 — ' + (e && e.message)); }
  var dues = [], sum = 0;
  for (var i = 0; i < vals.length; i++) {
    var rv = vals[i];
    var rWrap = { get: function (h) { var c = colOf[h]; return c ? rv[c - 1] : ''; } };   // _cashReceiptLedger 재사용용 행 래퍼
    var names = _names(rWrap.get('신랑이름'), rWrap.get('신부이름'));
    var codeUp = String(rWrap.get('개인코드') || '').trim().toUpperCase();
    var stageEx = STAGE_EXCEPTIONS.indexOf(String(rWrap.get('현재단계') || '').trim()) !== -1;   // 취소·노쇼·미계약은 환불 흐름이라 제외
    if (stageEx) continue;   // [B-1] 종료(환불 흐름) 고객의 미발행분은 '발행 필요'가 아니라 정리 대상 — 주간 집계에서 제외(기발행 정리는 큐 카드가 담당)
    _cashReceiptLedger(rWrap, { bookingPaid: !!bkPaid[codeUp] }).forEach(function (it) {   // RECEIPT_PAID_SPLIT: 상담 예약금 수령 여부를 맵으로 전달(행별 시트 조회 회피 · 예약금 항목에만 적용)
      var due = it.due;
      if (!due) return;
      dues.push('  - ' + names + ' · ' + it.label + ' ' + Number(it.amount || 0).toLocaleString() + '원');
      sum += Number(it.amount || 0);
    });
  }
  if (!dues.length) { Logger.log('weeklyReceiptAudit: 미발행 0건'); return; }
  var body = '입금 확인됐는데 현금영수증이 아직 발행되지 않은 건이에요. (의무발행업종 · 미발급 가산세 20%)\n\n'
    + dues.join('\n') + '\n\n합계 ' + dues.length + '건 · ' + sum.toLocaleString() + '원\n\n관리자에서 발행: https://momentedit.kr/admin.html';
  if (_briefMailOk()) {
    try { GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, '[Moment Edit] 현금영수증 미발행 ' + dues.length + '건 · ' + sum.toLocaleString() + '원 (주간 점검)', body, { name: 'Moment Edit', cc: (typeof adminCc === 'function' ? adminCc() : '') }); } catch (e) { Logger.log('주간 점검 메일 실패: ' + (e && e.message)); }
  }
}

// ============================ 홈 — 처리할 일 큐 + 진행 중 현황 (⑧ 재구성) ============================
// v1(상담 4그룹) → Customers 주도 순회 + 상담예약 조인(개인코드). read 2번(풀폭)·인메모리 계산.
// 끝난 고객(예외 미계약·취소·노쇼 + 결과물전달) = 아카이브 → 큐·현황 제외.
function adminHome() {
  _requireAdmin();
  var name = _CURRENT_ADMIN || '관리자';
  var today = _kstYmd(new Date());
  var nowMs = Date.now();

  var cs = getCustomersSheet(), cc = buildHeaderIndex(cs);
  var bs = getSheet(), bc = buildHeaderIndex(bs);
  var cLast = cs.getLastRow(), bLast = bs.getLastRow();
  var custRows = (cLast >= P.DATA_START_ROW) ? cs.getRange(P.DATA_START_ROW, 1, cLast - P.DATA_START_ROW + 1, cs.getLastColumn()).getValues() : [];
  var bookRows = (bLast >= SYS.DATA_START_ROW) ? bs.getRange(SYS.DATA_START_ROW, 1, bLast - SYS.DATA_START_ROW + 1, bs.getLastColumn()).getValues() : [];

  var cget = function (rv, h) { var c = cc[h]; return c ? rv[c - 1] : ''; };
  var bget = function (rv, h) { var c = bc[h]; return c ? rv[c - 1] : ''; };

  // 상담예약 맵(개인코드 → 최신 행) + Customers 단계 맵(신규신청 booking 필터용)
  var bookMap = {};
  bookRows.forEach(function (rv) { var code = String(bget(rv, '개인코드') || '').trim().toUpperCase(); if (code) bookMap[code] = rv; });
  var custStageMap = {};

  var urgent = [], normal = [], queueCodes = {}, resultsList = [];
  var pipe = {}; pipe[P.PRODUCT_SIGNATURE] = {}; pipe[P.PRODUCT_SNAP] = {};
  function pushQ(it) { queueCodes[it.code] = true; if (it._urgent) urgent.push(it); else normal.push(it); }
  // 만족도 설문 집계(전 고객 — 완료자는 아카이브여도 포함)
  var surveyAgg = { n: 0, byProduct: {}, q: {}, recent: [] };
  function surveyTally(rv, code, names, product) {
    if (String(cget(rv, '설문상태') || '').trim() !== '완료') return;
    var parsed; try { parsed = JSON.parse(String(cget(rv, '설문응답') || '') || '{}'); } catch (e) { parsed = {}; }
    var ans = (parsed && parsed.answers) || {}, k;
    surveyAgg.n++;
    surveyAgg.byProduct[product] = (surveyAgg.byProduct[product] || 0) + 1;
    for (k in ans) { if (ans.hasOwnProperty(k)) { var v = String(ans[k] || ''); if (!v) continue; if (!surveyAgg.q[k]) surveyAgg.q[k] = {}; surveyAgg.q[k][v] = (surveyAgg.q[k][v] || 0) + 1; } }
    if (surveyAgg.recent.length < 40) surveyAgg.recent.push({ code: code, names: names, product: product, overall: String(ans.overall || ''), recommend: String(ans.recommend || ''), gap: String(ans.gap || ''), review: String(parsed.review || ''), reviewPublic: String(parsed.reviewPublic || ''), date: String(cget(rv, '설문일시') || '') });
  }

  // ── Customers 순회: 여정 트리거 + 현황 ──
  custRows.forEach(function (rv) {
    var code = String(cget(rv, '개인코드') || '').trim().toUpperCase();
    if (!code) return;
    var product = String(cget(rv, '상품타입') || '').trim() || P.PRODUCT_SIGNATURE;
    var isSnap = (product === P.PRODUCT_SNAP);
    var stage = String(cget(rv, '현재단계') || '').trim() || '신청접수';
    var names = _names(cget(rv, '신랑이름'), cget(rv, '신부이름'));
    var createdYmd = _ymdOf(cget(rv, '생성일시'));
    custStageMap[code] = { stage: stage, product: product, names: names, created: createdYmd };
    surveyTally(rv, code, names, product);
    var survStatus = String(cget(rv, '설문상태') || '').trim();
    var surveyClosed = (survStatus === '완료' || survStatus === '건너뜀');   // 후기 마감(제출/넘기기) = 아카이브 조건
    // ★STAGE_REVIEW: 아카이브 판정 = 예외 단계 이거나 (결과물전달·후기 중 하나 + 설문 마감).
    //   '후기'가 새 종료 대기 단계지만, 구 데이터(단계=결과물전달 + 설문완료)도 그대로 아카이브에 남도록 두 값을 함께 본다(기획 §5 검증6).
    if (STAGE_EXCEPTIONS.indexOf(stage) !== -1 || ((stage === '결과물전달' || stage === '후기') && surveyClosed)) {
      // 아카이브(예외/후기 마감)라도 추가 보정 입금 신호는 운영자 확인 필요 → 큐 노출
      if ((stage === '결과물전달' || stage === '후기') && String(cget(rv, '추가보정상태') || '').trim() === '결제대기') {   // STAGE_REVIEW
        pushQ({ code: code, names: names, product: product, kind: '추가보정확인', sub: '추가 보정 입금 확인 (전달 후)', badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 8, _wait: createdYmd });
      }
      /* ★★[CPN_QUEUE 2026-08-18 쿠폰 연동 점검] 아카이브라도 «커피쿠폰 미발급»은 큐에 남긴다.
         후기를 받으면 고객 화면은 «감사의 마음으로 커피 2잔을 준비해요»라고 말해 둔다.
         그런데 설문이 마감되는 순간 이 분기로 들어와 보드에서 사라진다 — 남는 리마인드는
         제출 시점 관리자 메일 한 통뿐이고, 그걸 놓치면 되짚을 화면이 없다.
         두 분은 기다리는데 아무 일도 안 일어난다. 사람 기억에만 기대던 유일한 마감이었다.
         ★위의 추가보정·현금영수증과 같은 성격이라 같은 자리에 둔다 — «끝난 고객이라도 우리 의무는 남는다».
         ★'건너뜀'은 제외 — 후기를 안 쓴 분께 드릴 커피가 없다(약속 자체가 성립하지 않는다).
         ★회수도 다시 띄운다 — 회수는 «아직 못 드린» 상태로 돌아간 것이다.
         ★배지로 겁주지 않는다 — 며칠이 지나야 급한지 정한 바가 없다. 조용히 남아 있기만 하면 된다. */
      if ((stage === '결과물전달' || stage === '후기') && survStatus === '완료') {
        var _cpS = String(cget(rv, '쿠폰상태') || '').trim();
        if (_cpS !== '발급') {
          pushQ({ code: code, names: names, product: product, kind: '쿠폰발급',
            sub: '후기를 남겨 주셨어요 · 커피쿠폰(스타벅스 2잔) 바코드를 등록해 주세요'
              + (_cpS === '회수' ? ' (회수 후 미발급)' : ''),
            badge: { level: 'yellow', text: '후기 감사' }, _urgent: false, _loss: 5, _stage: 9, _wait: createdYmd });
        }
      }
      // 아카이브라도 추가 보정 현금영수증 미발행분은 큐 유지(의무발급·가산세 방지)
      if ((stage === '결과물전달' || stage === '후기')) {   // STAGE_REVIEW
        var _exArc = Math.round(Number(cget(rv, '추가보정금액')) || 0);
        var _isuArc = _parseJsonSafe(cget(rv, '동의기록')).영수증발행 || {};
        if (String(cget(rv, '추가보정상태') || '').trim() === '완료' && _exArc > 0 && !_isuArc['추가보정']) {
          var _bdgArc = _crDueBadge(String((_parseJsonSafe(cget(rv, '동의기록')).영수증기준일 || {}).추가보정 || ''), today);
          pushQ({ code: code, names: names, product: product, kind: '현금영수증발행', sub: '추가 보정 현금영수증 발행 · ' + _exArc.toLocaleString() + '원',
            badge: _bdgArc, _urgent: _bdgArc.level === 'red', _stage: 8, _wait: createdYmd });
        }
      }
      // 취소·노쇼·미계약 고객의 기발행 현금영수증 — 환불·공제가 생기면 발행 취소(공제 후 금액으로 재발행) 필요. 발행 취소 처리하면 사라짐.
      if (STAGE_EXCEPTIONS.indexOf(stage) !== -1) {
        var _cxIss = _parseJsonSafe(cget(rv, '동의기록')).영수증발행 || {};
        var _cxKeys = Object.keys(_cxIss).map(function (k) { return k === '중도금잔금' ? '중도금·잔금' : k; });
        if (_cxKeys.length) {
          pushQ({ code: code, names: names, product: product, kind: '현금영수증취소', sub: stage + ' 건 영수증 발행취소 후 재발행(환불·공제 반영) · ' + _cxKeys.join('·'),
            badge: { level: 'red', text: '발행취소·재발행' }, _urgent: false, _stage: 9, _wait: createdYmd });
        }
      }
      // 취소 환불 송금 대기 — 환불계좌 입력됨 또는 예약금 수령분(입금확인=확인) 있음 & 아직 환불완료 처리 안 함(카톡/메일 끊겨도 놓치지 않게 큐로). 환불 완료 처리하면 사라짐.
      // [REFUND_QUEUE_CANCEL_NOACCT 2026-07-25] 계좌 미입력이어도 예약금 수령분이 있으면 '계좌 요청 필요' 라벨로 노출 — 취소+계좌없음이 큐서 빠지던 구멍 차단(노쇼·미계약 분기와 동일 패턴)
      if (stage === '취소') {
        var _rbk = bookMap[code], _racct = _rbk ? String(bget(_rbk, '환불계좌') || '').trim() : '';
        var _rdone = !!_parseJsonSafe(cget(rv, '동의기록')).환불완료;
        var _rPaidC = (_rbk && String(bget(_rbk, '입금확인') || '').trim() === '확인') || String(cget(rv, '입금상태') || '').trim() === '확인';   // [REFUND_QUEUE_CANCEL_NOACCT · FU1 2026-07-25] 수령분 판정을 노쇼·미계약(_rPaid2)·Q5(_paidF)와 통일 — Bookings.입금확인 외 Customers.입금상태='확인'(계약 후 취소)도 포함해 큐 누락 차단
        if ((_racct || _rPaidC) && !_rdone) {
          var _rcd = _rbk ? _ymdOf(bget(_rbk, '취소일시')) : '';
          var _rdays = _dayDiff(today, _rcd);
          var _rsub = '예약금 환불 송금 필요';
          var _rZeroC = false;   // [REFUND_QUEUE_CANCEL_NOACCT · FU2 2026-07-25] 산정 환불액 0원(공제 등·needCount 아님) 여부
          try {   // [02-8] 송금액 견적(계약서 7조·9조·4조⑧ · _refundQuote) — 기준일=취소일시(없으면 오늘). 스냅·산정 불가면 기본 문구 유지.
            var _rq = _refundQuote({ get: function (h) { var c = cc[h]; return c ? rv[c - 1] : ''; } }, _rcd || today);
            if (_rq && _rq.needCount) _rsub += ' · 시착 벌수 기록 후 산정';
            else if (_rq && !_rq.pending && _rq.refund != null) {
              if (Number(_rq.refund) <= 0) _rZeroC = true;   // [FU2] 공제로 환불액 0원
              _rsub += ' · ' + Number(_rq.refund).toLocaleString() + '원';
              if (_rq.penalty > 0) _rsub += '(위약금 ' + Math.round((_rq.rate || 0) * 100) + '% 공제)';
              else if (_rq.fitCount > 0) _rsub += '(시착 ' + _rq.fitCount + '벌 공제)';
            }
          } catch (e) {}
          // [REFUND_QUEUE_CANCEL_NOACCT · FU2 2026-07-25] 계좌 미입력 신규 노출분은 환불액 0원이면 큐 생략(고객 환불카드도 안 떠 계좌 받을 일 자체가 없음 · 노쇼·미계약 분기와 동일). 계좌 입력 건은 사람 판단 위해 유지(변화 0).
          if (_racct || !_rZeroC) {
            if (!_racct) _rsub += ' · 환불 계좌 요청 필요(카톡)';   // [REFUND_QUEUE_CANCEL_NOACCT] 계좌 미입력 취소 건 — 관리자에게 계좌 요청 필요 신호
            pushQ({ code: code, names: names, product: product, kind: '환불송금', sub: _rsub,
              badge: (_rdays != null && _rdays >= 1) ? { level: 'red', text: '취소 ' + _rdays + '일째' } : { level: 'yellow', text: '환불 대기' },
              _urgent: (_rdays != null && _rdays >= 1), _loss: 2, _stage: 9, _wait: createdYmd });
          }
        }
      }
      // [환불 안전망] 노쇼·미계약 — 관리자 처리 종료라 환불계좌 입력 경로가 없어 큐에서 빠지던 구멍.
      //   예약금(또는 그 이상) 수령분이 있고 환불액>0이면 리마인드(계좌 없으면 '계좌 요청 필요' 라벨). 환불 완료 처리하면 사라짐.
      if (stage === '노쇼' || stage === '미계약') {
        var _rbk2 = bookMap[code];
        var _rdone2 = !!_parseJsonSafe(cget(rv, '동의기록')).환불완료;
        var _rPaid2 = (_rbk2 && String(bget(_rbk2, '입금확인') || '').trim() === '확인') || String(cget(rv, '입금상태') || '').trim() === '확인';
        if (_rPaid2 && !_rdone2) {
          var _racct2 = _rbk2 ? String(bget(_rbk2, '환불계좌') || '').trim() : '';
          var _rsub2 = stage + ' 처리 · 예약금 환불 확인', _show2 = true;
          /* ★★[EXIT_QUOTE_TS 2026-08-25 환불 경계값 점검 F6] 기준일 = 취소일시(없으면 오늘).
             '취소' 큐(위)는 취소일시 기준인데 **노쇼·미계약 큐만 today 고정**이었다 —
             FORCE_EXIT_TS(2390)가 노쇼·미계약에도 취소일시를 찍어 두는데 이 분기만 안 읽었다.
             결과: 관리자가 처리를 하루 미룰 때마다 큐의 환불액이 혼자 바뀌고(위약 구간이 흘러가므로),
             관리자 상세·마이페이지(취소일시 기준)와 최대 33만 원이 갈렸다.
             ★돈 숫자는 사건이 일어난 날에 고정한다 — 화면을 여는 날에 따라 바뀌면 신뢰가 깎인다. */
          var _rcd2 = _rbk2 ? _ymdOf(bget(_rbk2, '취소일시')) : '';
          try {
            var _rq2 = _refundQuote({ get: function (h) { var c = cc[h]; return c ? rv[c - 1] : ''; } }, _rcd2 || today);
            if (_rq2 && _rq2.needCount) _rsub2 += ' · 시착 벌수 기록 후 산정';
            else if (_rq2 && !_rq2.pending && _rq2.refund != null) {
              if (Number(_rq2.refund) <= 0) _show2 = false;   // 공제로 환불액 0원 — 송금할 게 없어 큐 생략(상세 환불 산정에는 그대로 표시)
              else _rsub2 += ' · ' + Number(_rq2.refund).toLocaleString() + '원' + (_rq2.fitCount > 0 ? ('(시착 ' + _rq2.fitCount + '벌 공제)') : '');
            }
          } catch (e) {}
          if (_show2) {
            if (!_racct2) _rsub2 += ' · 환불 계좌 요청 필요(카톡)';
            pushQ({ code: code, names: names, product: product, kind: '환불송금', sub: _rsub2,
              badge: { level: 'yellow', text: '환불 확인' }, _urgent: false, _loss: 2, _stage: 9, _wait: createdYmd });
          }
        }
      }
      return;  // 끝남 → 제외(아카이브)
    }

    var 계약 = String(cget(rv, '계약상태') || '').trim();
    var 입금 = String(cget(rv, '입금상태') || '').trim();
    var 시착 = String(cget(rv, '시착동의상태') || '').trim();
    var 원본 = String(cget(rv, '원본링크') || '').trim();
    var 잔금 = String(cget(rv, '잔금상태') || '').trim();
    var 결과물 = String(cget(rv, '결과물상태') || '').trim();
    var 추가보정 = String(cget(rv, '추가보정상태') || '').trim();
    var 선택수 = String(cget(rv, '선택수') || '').trim();
    var bk = bookMap[code];
    var draft = _prodLoadRaw(cget, rv);   // PROD_ACCESSOR
    var invStatus = (draft.tracks && draft.tracks.invitation) || '시작전';
    var wedYmd = _ymdOf(draft.base && draft.base.weddingDate) || _ymdOf(bk ? bget(bk, '예식일자') : '');
    var consultYmd = _ymdOf(bk ? bget(bk, '선택날짜') : '');
    var bookingStatus = bk ? String(bget(bk, '상태') || '').trim() : '';
    var bookingLocked = (bookingStatus === ST.APPROVED || bookingStatus === ST.CONFIRMED);   // 예약이 실제 승인/확정됨. 현재단계(최고수위)와 별개 — 미승인(신청·시간선택·변경제안) 예약엔 시착 안내 안 띄움
    var consultPast = consultYmd ? (_dayDiff(today, consultYmd) > 0) : false;
    var consultDue = consultYmd ? (_dayDiff(today, consultYmd) >= 0) : false;   // 상담 당일부터(오늘 포함) — 시착 동의서 보낼 시점
    var consultMD = (function(){ var m=String((bk ? normalizeDateKey(bget(bk,'선택날짜')) : '')||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? ((+m[2])+'/'+(+m[3])) : ''; })();   // 예정일 짧은 표기(M/D) — 현황 한눈에

    // 현금영수증 발행 — 입금 '확인'된 마일스톤 중 미발행분(의무발행업종·미발급 20% 가산세 방지). 발행(승인번호 기록) 전까지 단계와 무관하게 계속 노출(결과물전달까지). 취소·노쇼·미계약(STAGE_EXCEPTIONS)은 위에서 이미 return.
    // [RECEIPT_QUEUE_LEDGER 2026-07-25 사용자 지시 "실입금보다 많은 금액이 발급되면 안 된다"]
    //   큐가 자체 계산하던 것을 원장(_cashReceiptLedger) 단일 소스로 통일. 자체 계산 복원 금지 — 아래 3건이 되살아난다.
    //   ① 카드결제분 이중발급: 큐가 동의기록.결제수단을 안 읽어, 카드로 낸 중도금·잔금(매출전표 발급분)도
    //      "현금영수증 발행" 지시가 계속 떴다. 홈택스 발급은 수동이라 그대로 발급하면 실수령 현금보다 큰 금액이 신고된다.
    //   ② 계약금 잔액 영구 누락: 원장·상세카드엔 뜨는데 큐에만 없어, 큐만 보고 일하면 의무발급 미이행(가산세 20%).
    //   ③ 잔금 금액 불일치: 큐는 정가, 원장은 확정 스냅샷(인원 추가요금 반영) — 표시 금액이 실제와 달랐다.
    var _crRec = _parseJsonSafe(cget(rv, '동의기록'));
    var _crStamp = _crRec.영수증기준일 || {};
    var _crAmt = _journeyAmounts(cget(rv, '계약총액'), product);   // 아래 입금확인 큐(중도금·잔금 금액 표기)가 계속 사용 — 영수증 금액은 원장이 담당
    var _crWrap = { get: function (h) { return cget(rv, h); } };   // 원장 재사용용 행 래퍼(weeklyReceiptAudit와 동일 패턴)
    var _crBkPaid = !!(bk && String(bget(bk, '입금확인') || '').trim() === '확인');   // 상담 예약금 수령 — 행별 시트 조회 없이 전달
    var _crBase = {   // 발급 기한(D+5) 기산일 — 항목별 '받은 날'
      '예약금': String(_crStamp['예약금'] || (bk ? bget(bk, '확정일시') : '') || ''),
      '계약금': String(_crStamp['예약금'] || ''),   // 계약금 잔액도 계약금 입금 확인 시점 기산
      '중도금': String(cget(rv, '중도금확인일시') || ''),
      '잔금': String(cget(rv, '잔금확인일시') || ''),
      '중도금잔금': String(cget(rv, '중도금확인일시') || ''),
      '추가보정': String(_crStamp['추가보정'] || '')
    };
    _cashReceiptLedger(_crWrap, { bookingPaid: _crBkPaid }).forEach(function (it) {
      if (!it.due) return;   // due = 입금 확인 + 미발행 + 카드 아님(원장이 판정)
      var _bdg = _crDueBadge(_crBase[it.key] || '', today);
      var _won = it.amount ? (' · ' + Math.round(it.amount).toLocaleString() + '원') : '';
      pushQ({ code: code, names: names, product: product, kind: '현금영수증발행', sub: it.label + ' 현금영수증 발행' + _won,
        badge: _bdg, _urgent: _bdg.level === 'red', _stage: 5, _wait: createdYmd });
    });
    // 결과물 전달 후 — 후기(설문) 대기(미마감). 아카이브 보류 → 결과물 관리 보드에 '후기 대기'로 노출, 진행 현황엔 미포함.
    if ((stage === '결과물전달' || stage === '후기')) {   // STAGE_REVIEW — 후기 단계도 결과물 보드에 '후기 대기'로 노출
      if (추가보정 === '결제대기') pushQ({ code: code, names: names, product: product, kind: '추가보정확인', sub: '추가 보정 입금 확인 (전달 후)', badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 8, _wait: createdYmd });
      resultsList.push({ code: code, names: names, product: product, 상태: '후기대기', 선택수: 선택수, 원본: !!원본, 보정본: !!String(cget(rv, '보정본폴더') || '').trim(), 영상: !!String(cget(rv, '영상링크') || '').trim(), 추가보정: 추가보정, 추가보정수량: String(cget(rv, '추가보정수량') || ''), 설문: survStatus, dday: (wedYmd ? _dayDiff(today, wedYmd) : null) });
      return;
    }

    // 예식일 임시고정(가예약) 승인 대기 — 상담 신청 시 함께 들어온 가예약 요청. 대면상담 승인(신규신청)과 별개 항목으로 분리 노출(놓침 방지). 승인/거절하면 사라짐.
    var _hold = _parseJsonSafe(cget(rv, '동의기록')).가예약;
    if (_hold && _hold.status === '요청' && _hold.date && _hold.slot && 계약 !== '서명완료') {
      var _hReqYmd = _ymdOf(_hold.at) || createdYmd;
      var _hDays = _dayDiff(today, _hReqYmd);
      pushQ({ code: code, names: names, product: product, kind: '임시고정', sub: '예식일 임시고정 요청 · ' + _holdWhenLabel(_hold.date, _hold.slot),
        hold: { date: _hold.date, slot: _hold.slot },
        badge: (_hDays != null && _hDays >= 4) ? { level: 'red', text: '요청 ' + _hDays + '일째' } : ((_hDays != null && _hDays >= 2) ? { level: 'yellow', text: '요청 ' + _hDays + '일째' } : { level: 'yellow', text: '승인 대기' }),
        _urgent: (_hDays != null && _hDays >= 4), _loss: 3, _stage: 1, _wait: _hReqYmd });
    }

    // 시착 동의 보내기(시그) — 예약 승인/확정됨 & 상담확정 & 상담일 지남 & 시착 미발송
    if (!isSnap && stage === '상담확정' && bookingLocked && consultDue && 시착 !== '동의요청' && 시착 !== '동의완료') {
      pushQ({ code: code, names: names, product: product, kind: '시착보내기', sub: '시착 동의서 보내기',
        badge: { level: 'yellow', text: '상담일' }, _urgent: true, _stage: 2, _wait: createdYmd });
    }
    // 상담완료 처리(시그) — 예약 승인/확정됨 & 시착 & 시착동의완료 & 상담일 지남
    // [홈 인라인] 시착 동의완료(=대면상담·시착 끝남)면 상담일 게이트 없이 바로 노출 — 벌수+상담완료를 홈에서 처리
    if (!isSnap && stage === '시착' && bookingLocked && 시착 === '동의완료') {
      var _fitN = (_parseJsonSafe(cget(rv, '동의기록')).시착 || {}).벌수;   // 벌수 미기록이면 상담완료 게이트에 막힘 — 카드에서 먼저 보이게
      pushQ({ code: code, names: names, product: product, kind: '상담완료',
        sub: (_fitN != null) ? ('시착 ' + _fitN + '벌 기록됨 · 상담완료 처리') : '상담완료 처리 · 시착 벌수 먼저 기록',
        badge: (_fitN != null) ? null : { level: 'yellow', text: '벌수 미기록' }, _urgent: false, _stage: 2, _wait: createdYmd });
    }
    // 계약서 발송 — 시그(상담완료&시착동의완료&고객 계약요청완료) / 스냅(촬영확정) — & 계약 미발송
    var hasReq = isSnap ? true : (!!_parseJsonSafe(cget(rv, '동의기록')).계약정보 || /^\d{4}-\d{2}-\d{2}$/.test(_ymdOf(cget(rv, '예식일'))));   // 고객이 계약정보(예식일·인적사항) 입력/요청했나
    var canSend = isSnap ? (stage === '촬영확정') : (stage === '상담완료' && 시착 === '동의완료' && hasReq);
    if (canSend && bookingLocked && (!계약 || 계약 === '미발송')) {   // bookingLocked: 미승인 새 예약(현재단계만 최고수위로 남은 경우) 조기 노출 차단
      pushQ({ code: code, names: names, product: product, kind: '계약발송', sub: '계약서 발송 대기',
        badge: null, _urgent: false, _stage: 3, _wait: createdYmd });
    }
    /* ★★[SLOT_HOLD_EXPIRY_Q 2026-08-18 점검 라운드5] 되돌림으로 «잠가 둔» 예식 자리가 조용히 풀리는 것을 막는다.
       ROLLBACK_SLOT 은 되돌릴 때 확정 점유를 임시고정(승인·14일)으로 돌려 자리를 잡아 둔다.
       그런데 만료 안내(D-3)는 **고객에게만** 간다(70_journey sendHoldExpiryNotices).
       되돌린 것은 관리자이고 다시 계약을 보낼 사람도 관리자다 — 정작 공을 쥔 쪽이 아무 신호를 못 받으면,
       14일 뒤 그 날짜가 아무도 모르게 열린다. 되돌림 때 지킨 자리를 시간이 대신 빼앗는 셈이다.
       ★«되돌림으로 잠근 것»만 띄운다(source==='단계되돌림'). 평범한 계약요청 홀드는 계약발송 큐가 이미 몰고 간다 —
         전부 띄우면 큐가 시끄러워지고, 시끄러운 큐는 아무도 안 본다. */
    var _shH = _parseJsonSafe(cget(rv, '동의기록')).가예약;
    if (_shH && _shH.status === '승인' && _shH.source === '단계되돌림' && _shH.date && _shH.slot && 계약 !== '서명완료') {
      var _shLeft = _shH.expires ? _dayDiff(_shH.expires, today) : null;    // 만료까지 남은 날(음수=지남)
      if (_shLeft != null && _shLeft <= 5) {
        var _shGone = (_shLeft < 0);
        pushQ({ code: code, names: names, product: product, kind: '자리만료',
          sub: _shGone
            ? ('되돌리며 잡아 둔 예식 자리(' + _holdWhenLabel(_shH.date, _shH.slot) + ')가 이미 풀렸어요 · 다른 분이 예약할 수 있어요')
            : ('되돌리며 잡아 둔 예식 자리(' + _holdWhenLabel(_shH.date, _shH.slot) + ')가 ' + _ymdDot(_shH.expires) + '에 풀려요 · 계약서를 다시 보내 주세요'),   /* [DATE_ONE_STYLE] 한 문장 안에서 날짜 표기를 섞지 않는다 */
          hold: { date: _shH.date, slot: _shH.slot },
          badge: _shGone ? { level: 'red', text: '자리 풀림' } : { level: (_shLeft <= 2 ? 'red' : 'yellow'), text: 'D-' + _shLeft },
          _urgent: (_shLeft <= 2), _loss: 2, _stage: 2, _wait: createdYmd });
      }
    }
    // 계약 만료 임박/만료됨 — 계약상태=발송 & 발송+72h 잔여<24h (고객대기 예외 큐)
    if (계약 === '발송') {
      var sent = _parseKstStr(cget(rv, '계약서발송일시'));
      if (sent) {
        var leftMs = sent.getTime() + CONTRACT.서명기한시간 * 3600 * 1000 - nowMs;
        if (leftMs < 24 * 3600 * 1000) {
          var _exp = (leftMs <= 0);
          var btxt = _exp ? '만료됨' : (leftMs < 12 * 3600 * 1000 ? (Math.max(1, Math.round(leftMs / 3600000)) + '시간') : 'D-1');   // 배지=짧은 긴급 태그
          var subtxt = _exp ? '계약 서명 기한이 지났어요 · 재발송' : '계약 서명 기한 임박 · 곧 만료';                                  // 부제=설명(배지와 중복 제거)
          pushQ({ code: code, names: names, product: product, kind: '계약만료', sub: subtxt,
            badge: { level: 'red', text: btxt }, _urgent: true, _loss: 1, _wait: createdYmd });
        }
      }
    }
    // 입금 확인 — 입금상태=완료신호 (스냅: 계약 시 계약금 입금 신호. 시그: 계약 서명 시 예약금 충당으로 입금완료 자동 전이 → 여기 안 옴)
    /* ★★[STALE_ROLLBACK_Q 2026-08-17 사용자 제보 "아무쪽에도 어떤푸시가없는데"] 되돌려진 채 잊힌 고객.
       단계는 입금 전(계약완료 등)인데 입금상태가 '확인'인 상태 — adminForceStage 되돌리기가
       돈 기록을 남기므로(ROLLBACK_KEEP_PAID) 실무에서 실제로 생긴다.
       고객 화면은 «디렉터가 진행 단계를 확인하는 중»이라며 기다리는데([PAID_STAGE_BACK] 카드),
       이 큐엔 항목이 없어 관리자는 «처리할 일이 없어요 · 다 됐어요»를 봤다 —
       **양쪽 다 상대를 기다리는 교착**이고, 어느 화면에도 다음 행동이 없었다.
       ★공은 관리자에게 있다 — 되돌린 것도 관리자고, 고객은 할 일이 없는 게 맞다. 그러니 여기에 띄운다. */
    /* ★[STALE_ROLLBACK_WIDE 2026-08-17 교차점검] 계약금만 보지 않는다 — 중도금·잔금 '확인'도 같은 갇힘이다.
       실제로 만들어지는 경로: behind 상태에서 계약금만 취소하면(UNDO_BEHIND) 중도금·잔금 '확인'은 남는데,
       입금상태는 ''라서 종전 조건(입금==='확인')이 그 고객을 놓쳤다 — 같은 교착이 이름만 바꿔 재발한다.
       ★기준 단계는 여전히 «입금완료보다 앞»뿐 — 입금완료·제작중에서 미리 낸 중도금·잔금은 정상이라 안 띄운다. */
    var _srPaid = [];
    if (입금 === '확인') _srPaid.push('계약금');
    if (!isSnap && String(cget(rv, '중도금상태') || '').trim() === '확인') _srPaid.push('중도금');
    if (잔금 === '확인') _srPaid.push('잔금');
    if (_srPaid.length) {
      var _fwQ = stageFlowFor(product), _siQ = _fwQ.indexOf(stage), _piQ = _fwQ.indexOf('입금완료');
      if (_siQ !== -1 && _piQ !== -1 && _siQ < _piQ) {
        pushQ({ code: code, names: names, product: product, kind: '단계정리',
          /* [UNDO_ALL] 무엇을 해야 하는지가 계약 유무로 갈린다 — 계약이 지워졌으면 단계만 올릴 수 없다(서버가 막는다) */
          sub: _srPaid.join('·') + ' 확인됐는데 단계가 ' + stage + '에 머물러 있어요 · '
            + (계약 === '서명완료' ? '단계를 맞추거나 입금 확인을 취소해 주세요' : '계약이 초기화됐어요 · 입금 확인을 취소하고 계약서부터 다시 보내 주세요'),
          badge: { level: 'yellow', text: '되돌림 정리 대기' }, _urgent: false, _stage: 4, _wait: createdYmd });
      }
    }
    if (입금 === '완료신호') {
      var sigDays = _dayDiff(today, _ymdOf(cget(rv, '입금완료신호')));
      // [수납묶음] 신고 시점 스냅샷(동의기록.수납묶음)이 있으면 묶음 구성+합산 금액을 카드에 직표시 — 통장 대조할 총액을 큐에서 바로 알게
      var _sbk = (_crRec.수납묶음 && _crRec.수납묶음.keys) || [];
      var _sbTxt = '';
      if (_sbk.length && _crAmt) {
        var _sbSum = (Number(_crAmt['납부액']) || 0)
          + (_sbk.indexOf('중도금') !== -1 ? (Number(_crAmt['중도금']) || 0) : 0)
          + (_sbk.indexOf('잔금') !== -1 ? (Number(_crAmt['잔금']) || 0) : 0);
        _sbTxt = ' · 계약금·' + _sbk.join('·') + ' 한 번에 ' + Math.round(_sbSum).toLocaleString() + '원 (확인 시 함께 확정)';
      }
      pushQ({ code: code, names: names, product: product, kind: '입금확인', sub: '입금 확인' + _sbTxt + (String(cget(rv, '입금자명') || '').trim() ? (' · 입금자 ' + String(cget(rv, '입금자명') || '').trim()) : ''),
        badge: (sigDays != null && sigDays >= 1) ? { level: 'yellow', text: '입금 신호 ' + sigDays + '일째' } : null,
        _urgent: false, _stage: 4, _wait: createdYmd });
    }
    // 예식일 변경 확인 — 동의기록.변경요청(고객 셀프 요청 · 02-9 계약 8조①). 확인(적용)/거절하면 사라짐.
    var _chgReq = _crRec.변경요청;
    if (_chgReq && _chgReq.to && _chgReq.to.date && 계약 === '서명완료') {
      var _chgReqYmd = _ymdOf(_chgReq.at) || createdYmd;
      var _chgDays = _dayDiff(today, _chgReqYmd);
      var _chgFee = Math.round(Number(_chgReq.fee) || 0);
      pushQ({ code: code, names: names, product: product, kind: '변경확인',
        sub: '예식일 변경 확인 · ' + _chgWhenLabel((_chgReq.from && _chgReq.from.date) || '', '') + '→' + _chgWhenLabel(_chgReq.to.date, _chgReq.to.slot)
           + ' · ' + (_chgFee > 0 ? ('수수료 ' + _chgFee.toLocaleString() + '원' + (_chgReq.payer ? ('(입금자 ' + _chgReq.payer + ')') : '')) : '무상'),
        chg: { fd: (_chgReq.from && _chgReq.from.date) || '', fs: (_chgReq.from && _chgReq.from.slot) || '', td: _chgReq.to.date, ts: _chgReq.to.slot || '', fee: _chgFee, payer: _chgReq.payer || '' },
        badge: (_chgDays != null && _chgDays >= 2) ? { level: 'yellow', text: '요청 ' + _chgDays + '일째' } : { level: 'yellow', text: '확인 대기' },
        _urgent: false, _stage: 4, _wait: _chgReqYmd });
    }
    // 기한 경과 미납(신호도 없음) — 계약서 11조 최고(7일) 운영 리마인드. 입금 신호가 오면 아래 '확인' 카드로 대체됨.
    (function(){
    if (계약 !== '서명완료') return;   // 결제 의무는 서명 후 발생 — 발송만 된 계약(예식일 기입됨)에 미납 카드가 뜨지 않게
    var _wd = _ymdOf(cget(rv, '예식일')) || _ymdOf((_crRec.계약정보 || {}).weddingDate); if (!_wd) return;   // 예식일 셀 빈값(스냅 등)이면 동의기록 폴백
    var _dd = _dayDiff(_wd, today);   // 예식까지 남은 일수
    var _pend = function (h) { var v = String(cget(rv, h) || '').trim(); return v === '' || v === '대기'; };   // 미납 = 빈값 포함(시트는 신호 전까지 빈칸 — '대기' 문자열만 보면 영구 미탐지)
    if (!isSnap && _pend('중도금상태') && !String(cget(rv, '중도금입금신호') || '').trim() && _dd != null && _dd <= PAYMENT.중도금일수전 && _dd > PAYMENT.잔금일수전) {
      var _over = PAYMENT.중도금일수전 - _dd;   // 0=기한 당일(고객 리마인더와 같은 날 관리자도 인지) · 1~=기한 경과
      pushQ({ code: code, names: names, product: product, kind: '중도금확인',
        sub: _over === 0 ? '중도금 기한일(오늘) · 입금 확인 대기' : ('중도금 미납 D+' + _over + ' · 7일 최고 후 해제 절차(계약 11조)'),
        badge: _over === 0 ? { level: 'yellow', text: '기한 당일' } : { level: 'red', text: '기한 경과' },
        _urgent: _over > 0, _stage: 5, _wait: createdYmd });
    }
    var _balDays = isSnap ? PAYMENT.잔금일수전_스냅 : PAYMENT.잔금일수전;   // [SNAP_BALANCE_D7] 스냅 잔금은 촬영 D-7(계약서 §4)
    if (_pend('잔금상태') && !String(cget(rv, '잔금입금신호') || '').trim() && _dd != null && _dd <= _balDays) {
      var _over2 = _balDays - _dd;   // 기한 당일부터 노출 — 중도금 카드(기한 초과 구간)와 빈틈 없이 이어짐
      // [B-7] 잔금 기한 이내 중도금까지 통미납이면 합산 1카드 — 고객 화면(묶음 입금 안내)·확인 처리(중도금잔금확인)와 짝
      var _midAlso = !isSnap && _pend('중도금상태') && !String(cget(rv, '중도금입금신호') || '').trim();
      var _ovLbl = _midAlso ? '중도금·잔금' : '잔금';
      var _ovAmt = (_midAlso && _crAmt) ? (' · ' + Math.round(_crAmt['중도금'] + _crAmt['잔금']).toLocaleString() + '원 (한 번에 입금 안내됨)') : '';
      pushQ({ code: code, names: names, product: product, kind: _midAlso ? '중도금잔금확인' : '잔금확인',
        sub: _over2 === 0 ? (_ovLbl + ' 기한일(오늘) · 입금 확인 대기' + _ovAmt) : (_ovLbl + ' 미납 D+' + _over2 + _ovAmt + ' · 7일 최고 후 해제 절차(계약 11조)'),
        badge: _over2 === 0 ? { level: 'yellow', text: '기한 당일' } : { level: 'red', text: '기한 경과' },
        _urgent: _over2 > 0, _stage: 6, _wait: createdYmd });
    }
    // [B-7 보완] 잔금은 이미 확인됐는데 중도금만 미납인 역순 케이스가 잔금 기한 안쪽으로 들어오면
    //   위 두 분기(중도금 기한 초과 구간 · 잔금 미납)를 모두 비켜가 카드가 0장이 됨 — 중도금 단독 카드로 메움
    if (!isSnap && _pend('중도금상태') && !String(cget(rv, '중도금입금신호') || '').trim()
        && String(cget(rv, '잔금상태') || '').trim() === '확인' && _dd != null && _dd <= PAYMENT.잔금일수전) {
      var _overM = PAYMENT.중도금일수전 - _dd;
      pushQ({ code: code, names: names, product: product, kind: '중도금확인',
        sub: '중도금 미납 D+' + _overM + ' (잔금은 확인됨) · 7일 최고 후 해제 절차(계약 11조)',
        badge: { level: 'red', text: '기한 경과' }, _urgent: true, _stage: 5, _wait: createdYmd });
    }
    })();
    // 중도금·잔금 입금 신호 — 묶음 입금(임박 계약·한 번에 이체)이면 확인도 1건으로
    var _midSig = String(cget(rv, '중도금상태') || '').trim() === '완료신호';
    var _won = function (n) { return (n > 0) ? (' · ' + Math.round(n).toLocaleString() + '원') : ''; };   // 큐에서 통장 대조 완결용(금액·입금자명 직표시)
    var _pyr = function (h) { var v = String(cget(rv, h) || '').trim(); return v ? (' · 입금자 ' + v) : ''; };
    // [수납묶음 정리] 계약금 신고(수납묶음 스냅샷)에 포함된 중도금·잔금은 위 '입금확인' 카드 1장이 담당(확인 시 함께 확정) — 한 이체에 카드 2장 중복 방지
    var _depBk = (입금 === '완료신호') ? ((_crRec.수납묶음 && _crRec.수납묶음.keys) || []) : [];
    var _midCovered = _depBk.indexOf('중도금') !== -1, _balCovered = _depBk.indexOf('잔금') !== -1;
    // [잔금 합산 정합] 신고 금액 = 기본 잔금 + 최종확정 인원 추가(고객 카드와 동일 _balanceExtraInfo) — 기본액만 보이면 통장 이체액과 안 맞음
    var _rvW = { get: function (h) { return cget(rv, h); } };
    var _balX = (잔금 !== '확인' && typeof _balanceExtraInfo === 'function') ? (_balanceExtraInfo(_rvW).amount || 0) : 0;
    if (_midSig && 잔금 === '완료신호' && !(_midCovered && _balCovered)) {
      pushQ({ code: code, names: names, product: product, kind: '중도금잔금확인',
        sub: '중도금·잔금 입금 확인 (한 번에 입금)' + _won(_crAmt ? (_crAmt['중도금'] + _crAmt['잔금'] + _balX) : 0) + _pyr('중도금입금자명'),
        badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 4, _wait: createdYmd });
    } else if (!(_midSig && 잔금 === '완료신호')) {
    if (_midSig && !_midCovered) {
      pushQ({ code: code, names: names, product: product, kind: '중도금확인', sub: '중도금 입금 확인' + _won(_crAmt ? _crAmt['중도금'] : 0) + _pyr('중도금입금자명'),
        badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 4, _wait: createdYmd });
    }
    if (잔금 === '완료신호' && !_balCovered) {
      pushQ({ code: code, names: names, product: product, kind: '잔금확인', sub: '잔금 입금 확인' + _won(_crAmt ? (_crAmt['잔금'] + _balX) : 0) + _pyr('잔금입금자명'),
        badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 4, _wait: createdYmd });
    }
    }
    // 예식/촬영 완료 — 시그(제작중&예식일 지남) / 스냅(입금완료&촬영일 지남)
    // ★EVENT_GATE_WIDE(2026-07-25 코워크 교차검증 치명2): 시그니처 예식완료 진입을 '제작중' 단일에서 ['입금완료','제작중']로 확장.
    //   제작 항목은 전부 선택이라 하나도 안 만든 고객은 입금완료에 머무는데, 그러면 예식이 지나도 일감이 안 뜨고
    //   adminMarkEventDone도 거부돼 강제 단계 변경 말곤 방법이 없었다(막다른길). 스냅은 현행 유지. 좁히지 말 것.
    var eventStages = isSnap ? ['입금완료'] : ['입금완료', '제작중'];
    var dplus = (eventStages.indexOf(stage) !== -1 && wedYmd) ? _dayDiff(today, wedYmd) : null;
    if (dplus != null && dplus > 0) {
      var ev = isSnap ? '촬영' : '예식';
      pushQ({ code: code, names: names, product: product, kind: isSnap ? '촬영완료' : '예식완료',
        sub: ev + ' D+' + dplus + ' · 완료 처리', badge: { level: 'red', text: ev + ' D+' + dplus },
        _urgent: true, _loss: 5, _wait: createdYmd });
    }
    // 결과물 — 결과물상태 기준. 원본전달=고객 선택 대기(운영자 액션 없음→큐 제외) / 선택완료=보정 / 보정중=전달.
    if (stage === '예식완료' || stage === '촬영완료') {
      var rs = (결과물 === '업로드') ? '원본전달' : (결과물 || '대기');
      if (!원본 || rs === '대기' || rs === '') {
        pushQ({ code: code, names: names, product: product, kind: '결과물등록', sub: '원본 링크 등록', badge: null, _urgent: false, _stage: 6, _wait: createdYmd });
      } else if (rs === '선택완료' || rs === '보정중') {
        pushQ({ code: code, names: names, product: product, kind: '보정시작', sub: '고객 ' + (선택수 || '0') + '컷 선택 · 보정본 등록', badge: { level: 'yellow', text: '선택 완료' }, _urgent: false, _stage: 6, _wait: createdYmd });
      } else if (rs === '컨펌완료') {
        pushQ({ code: code, names: names, product: product, kind: '결과물전달', sub: '고객 컨펌 완료 · 결과물 전달', badge: { level: 'yellow', text: '컨펌 완료' }, _urgent: false, _stage: 7, _wait: createdYmd });
      }
      /* ★★[REVISION_QUEUE 2026-08-26 결과물 여정 점검 #1] 수정요청은 «운영자 액션»이다 — 큐에 띄운다.
         종전엔 컨펌대기가 통째로 «고객 대기»로 큐 제외였는데, 그 상태에서 들어오는 수정요청은
         정반대다: 접수되는 순간 고객은 컨펌도(1419) 재요청도(1450) 못 하게 잠기고,
         관리자 쪽 신호는 메일 1통뿐이었다 — 놓치면 **무기한 침묵**이 구조적으로 가능했다.
         고객이 잠겨 있는 상태라 노란 배지로 눈에 걸리게 한다. */
      else if (rs === '컨펌대기') {
        try {
          var _rvHist = (_crRec.수정요청이력 || []);
          var _rvLast = _rvHist.length ? _rvHist[_rvHist.length - 1] : null;
          if (_rvLast && String(_rvLast.status || '') === '대기') {
            pushQ({ code: code, names: names, product: product, kind: '수정요청', sub: '보정 수정 요청 처리 · 고객이 답을 기다려요',
              badge: { level: 'yellow', text: '고객 잠김' }, _urgent: false, _stage: 6, _wait: createdYmd });
          }
        } catch (e) {}
      }
      // rs === '원본전달'(고객 선택 대기) · '컨펌대기'(고객 컨펌 대기) → 운영자 액션 없음 → 큐 제외(보드·현황에만)
      // 결과물 관리 보드 — 결과물전달(아카이브) 전까지 모든 결과물 단계 고객을 한곳에.
      resultsList.push({
        code: code, names: names, product: product,
        상태: rs,                                   // 대기/원본전달/선택완료/보정중
        선택수: 선택수,
        원본: !!원본,
        보정본: !!String(cget(rv, '보정본폴더') || '').trim(),
        영상: !!String(cget(rv, '영상링크') || '').trim(),
        추가보정: 추가보정,
        추가보정수량: String(cget(rv, '추가보정수량') || ''),
        dday: (wedYmd ? _dayDiff(today, wedYmd) : null)   // 예식 후 경과(D+)
      });
    }
    // 추가 보정 입금 확인 — 추가보정상태=결제대기
    if (추가보정 === '결제대기') {
      pushQ({ code: code, names: names, product: product, kind: '추가보정확인', sub: '추가 보정 입금 확인', badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 6, _wait: createdYmd });
    }

    // 현황 그룹
    var g = pipe[isSnap ? P.PRODUCT_SNAP : P.PRODUCT_SIGNATURE];
    (g[stage] = g[stage] || []).push({
      code: code, names: names,
      sub: _subStatusFor(stage, isSnap, { booking: bookingStatus, consultPast: consultPast, consultDate: consultMD, cdday: (consultYmd ? _dayDiff(consultYmd, today) : null), 시착: 시착, 계약: 계약, hasReq: hasReq, 입금: 입금, 중도금: (isSnap ? '' : String(cget(rv, '중도금상태') || '').trim()), 잔금: 잔금, 원본: 원본, invStatus: invStatus, tracks: (draft.tracks || {}), 결과물: 결과물, 선택수: 선택수, 추가보정: 추가보정 }),   // SUBSTATUS_TRACKS — 트랙 전체 전달(청첩장 단독 판정 탈피) · STALE_ROLLBACK_WIDE — 중도금·잔금도
      dday: (wedYmd ? _dayDiff(wedYmd, today) : null),
      cdday: (consultYmd ? _dayDiff(consultYmd, today) : null),   // 대면상담까지 D-day(상담확정·촬영확정 그룹 표시·정렬용). +면 예정·0 오늘·-면 지남
      _created: createdYmd
    });
  });

  // ── 상담예약 순회: 신규신청(시간선택완료) ──
  bookRows.forEach(function (rv) {
    if (String(bget(rv, '상태') || '').trim() !== ST.PICKED) return;
    var code = String(bget(rv, '개인코드') || '').trim().toUpperCase();
    if (!code) return;
    var meta = custStageMap[code];
    if (meta && (STAGE_EXCEPTIONS.indexOf(meta.stage) !== -1 || meta.stage === '결과물전달' || meta.stage === '후기')) return;  // 끝난 고객 booking 제외 · STAGE_REVIEW
    var product = meta ? meta.product : P.PRODUCT_SIGNATURE;
    var names = meta ? meta.names : _names(bget(rv, '성함(신랑)'), bget(rv, '성함(신부)'));
    var createdYmd = meta ? meta.created : _ymdOf(bget(rv, '신청일시'));
    var nd = _dayDiff(today, createdYmd);
    var badge = (nd != null && nd >= 4) ? { level: 'red', text: '신청 ' + nd + '일째' } : ((nd != null && nd >= 2) ? { level: 'yellow', text: '신청 ' + nd + '일째' } : null);
    var it = { code: code, names: names, product: product, kind: '신규신청', sub: '신규 신청', badge: badge, _wait: createdYmd };
    if (badge && badge.level === 'red') { it._urgent = true; it._loss = 3; } else { it._urgent = false; it._stage = 1; }
    pushQ(it);
  });

  // ── 정렬: 긴급(잃는것순→대기) / 그외(단계순→대기) ──
  urgent.sort(function (a, b) { return (a._loss - b._loss) || _cmpWait(a._wait, b._wait); });
  normal.sort(function (a, b) { return (a._stage - b._stage) || _cmpWait(a._wait, b._wait); });
  var urgentCodes = {}; urgent.forEach(function (it) { urgentCodes[it.code] = true; });

  // ── 현황 그룹 빌드(상품별·단계순·0명 포함) ──
  function buildPipe(product) {
    var g = pipe[product], out = [];
    stageFlowFor(product).forEach(function (stage) {
      if (stage === '결과물전달') return;  // 아카이브 (★STAGE_REVIEW: '후기'는 스킵하지 않는다 — 현황에 '후기 대기 N명'을 보이게. 기획 §6 결정3)
      var list = g[stage] || [];
      var byConsult = (stage === '상담확정' || stage === '촬영확정');   // 예식일이 아직 없는 단계 → 대면상담 D-day(cdday)로 가까운순 정렬
      list.sort(function (a, b) {
        var ak = byConsult ? a.cdday : a.dday, bk = byConsult ? b.cdday : b.dday;
        var an = (ak == null), bn = (bk == null);
        if (an !== bn) return an ? 1 : -1;                 // 날짜 미정 뒤로
        if (!an && ak !== bk) return ak - bk;              // 가까운 먼저(위에서부터)
        return _cmpWait(a._created, b._created);
      });
      var hasUrgent = false;
      list.forEach(function (c) { c.flag = !!queueCodes[c.code]; if (urgentCodes[c.code]) hasUrgent = true; });
      out.push({ stage: stage, count: list.length, hasUrgent: hasUrgent, customers: list });
    });
    return out;
  }
  function countPipe(g) { var n = 0; Object.keys(g).forEach(function (k) { n += (g[k] || []).length; }); return n; }

  return {
    ok: true, name: name, today: today,
    queue: { urgent: urgent, normal: normal },
    counts: { total: urgent.length + normal.length, urgent: urgent.length },
    results: resultsList,
    pipeline: { 시그니처: buildPipe(P.PRODUCT_SIGNATURE), 웨딩스냅: buildPipe(P.PRODUCT_SNAP) },
    pipeCounts: { 시그니처: countPipe(pipe[P.PRODUCT_SIGNATURE]), 웨딩스냅: countPipe(pipe[P.PRODUCT_SNAP]) },
    survey: surveyAgg,
    stageFlow: { 시그니처: stageFlowFor(P.PRODUCT_SIGNATURE), 웨딩스냅: stageFlowFor(P.PRODUCT_SNAP) },   // 단계 목록 단일 출처(00_platform-config) 서빙 — admin.html 하드코딩 사본의 드리프트 방지
    stageEx: (typeof STAGE_EXCEPTIONS !== 'undefined' ? STAGE_EXCEPTIONS : ['미계약', '취소', '노쇼'])
  };
}

function _names(g, b) {
  g = String(g || '').trim(); b = String(b || '').trim();
  return (g && b) ? (g + ' · ' + b) : (g || b || '고객');
}

// ============================ 고객 상세 (⑧ 확장 — raw 척추 + 거울 + product-aware) ============================
function adminDetail(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: '개인코드가 없습니다.' };
  var cust = findCustomerByCode(code);
  var cr = findRowByPersonalCode(code);
  if (!cust && !cr) return { ok: false, error: '고객을 찾을 수 없습니다.' };

  var d = { ok: true, code: code };

  // Customers 행 없음(원자성 실패 등) — 상담 정보만
  if (!cust) {
    d.names = _names(cr.get('성함(신랑)'), cr.get('성함(신부)'));
    d.product = ''; d.stage = ''; d.phone = String(cr.get('연락처') || ''); d.email = String(cr.get('이메일') || '');
    d.pin = { 예식일: _ymdOf(cr.get('예식일자')), 하객: String(cr.get('하객') || ''), 상품: '' };
    d.raw = {}; d.mirror = {}; d.cards = []; d.consent = null; d.memo = ''; d.history = [];
    d.consult = _consultDetail(cr);
    return d;
  }

  var product = String(cust.get('상품타입') || '').trim();
  var isSnap = (product === P.PRODUCT_SNAP);
  var stage = String(cust.get('현재단계') || '').trim();
  d.names = customerNames(cust);
  d.product = product;
  d.stage = stage;
  d.phone = String(cust.get('연락처') || '');
  d.email = String(cust.get('이메일') || '');

  // 헤더 핀 — 예식일(계약 확정 톱레벨 우선 · 없으면 제작 base · 없으면 상담 예식일자)·하객·상품
  var draft = _prodLoad(cust);   // PROD_ACCESSOR
  d.pin = {
    예식일: _ymdOf(cust.get('예식일')) || _ymdOf(draft.base && draft.base.weddingDate) || _ymdOf(cr ? cr.get('예식일자') : ''),
    하객: String(cr ? (cr.get('하객') || '') : ''),
    상품: product
  };
  d.priceSuggest = suggestContractTotal(product, d.pin.예식일);   // 계약 발송 모달 자동 제안(예식일→주말/공휴일→총액). null=예식일 미정
  var _rec = _parseJsonSafe(cust.get('동의기록'));
  d.contractReq = _rec.계약정보 || null;   // [02-2.5] 고객이 입력한 계약 정보(예식일·생년월일·주소). null=고객 요청 전
  d.cashReceipt = _rec.현금영수증 || '';   // 현금영수증 발급 대상(고객 입력 휴대폰/사업자번호)
  d.receipts = _cashReceiptLedger(cust);   // 현금영수증 발행 원장 — 마일스톤별 입금확인·금액·발행기록(발행 카드/큐)
  /* ★★[DEPOSIT_TICK 2026-08-16 시뮬레이션 점검] 예약금 입금확인이 비어 있으면 관리자에게 알린다.
     고객 화면은 «여기까지 왔으면 예약금은 이미 받았다»고 보고 예약금 행을 항상 '결제 완료'로 찍는다
     (60_mypage.gs 148 · 의도된 판단 — 예약금을 받고 나서 상담을 진행하니 실무와 맞다).
     그런데 관리자 쪽 근거는 **예약 시트의 입금확인 칸**이라, 그 칸이 비면 조용히 둘이 갈린다:
       · 현금영수증 원장에 예약금이 '발행 대기'로 뜨지 않아 → **의무발급(받은 날 D+5)이 영구 미발행**
       · 환불 견적의 기수령액에서 10만 원이 빠져 → 환불 금액이 틀린다
     둘 다 돈·세무 문제이고, 화면 어디에도 «칸이 비었다»는 신호가 없었다.
     ★고객 화면을 '확인 중'으로 바꾸는 쪽은 택하지 않았다 — 실제로 낸 분께 안 냈다고 말하는 것이 더 나쁘다.
       고칠 곳은 «비어 있는 칸을 채우게 하는 것»이다. */
  d.depositTick = null;
  try {
    if (product !== '웨딩스냅') {
      var _dtStage = String(cust.get('현재단계') || '').trim();
      var _dtPast = (typeof STAGE_EXCEPTIONS === 'undefined' || STAGE_EXCEPTIONS.indexOf(_dtStage) === -1)
        && ['신청접수'].indexOf(_dtStage) === -1;   // 상담확정 이후 = 예약금을 받고 진행한 뒤
      var _dtBk = findRowByPersonalCode(code);
      var _dtOk = !!(_dtBk && String(_dtBk.get('입금확인') || '').trim() === '확인');
      if (_dtPast && !_dtOk) d.depositTick = { missing: true, amount: (typeof PAYMENT !== 'undefined' ? PAYMENT.예약금 : 100000) };
    }
  } catch (e) {}
  /* [ADM_AB1B] 마일스톤별 금액을 서버가 계산해 실어 보낸다 — 확인 모달이 통장과 대조할 금액을 바로 보여주게.
       종전엔 상세에 계약금 자리에 '계약 총액'이 떴고(대조 대상이 다름) 중도금은 금액이 아예 없었다.
       ★프론트에서 금액 산식을 복제하지 말 것 — _journeyAmounts(70_journey) 단일 원천. 잔금은 확정 스냅샷 우선. */
  try {
    var _amt = _journeyAmounts(cust.get('계약총액'), cust.get('상품타입'));
    if (_amt) {
      var _balSnap = Math.round(Number(_rec.잔금확정금액) || 0);
      var _balX = (typeof _balanceExtraInfo === 'function') ? (_balanceExtraInfo(cust).amount || 0) : 0;
      var _balCf = String(cust.get('잔금상태') || '').trim() === '확인';
      d.milestoneAmounts = {
        계약금: Math.round(Number(_amt.납부액) || 0),       // 계약 시 실제로 내는 돈(시그=계약금-예약금 · 스냅=계약금 전액)
        예약금: Math.round(Number(_amt.예약금) || 0),
        중도금: Math.round(Number(_amt.중도금) || 0),
        잔금: _balCf ? (_balSnap || Math.round(Number(_amt.잔금) || 0)) : (Math.round(Number(_amt.잔금) || 0) + _balX),
        총액: Math.round(Number(_amt.총액) || 0)
      };
      d.milestoneAmounts.중도금잔금 = d.milestoneAmounts.중도금 + d.milestoneAmounts.잔금;
    }
  } catch (e) {}
  d.hold = _rec.가예약 || null;   // 예식일 임시고정(요청/승인) — 관리자 승인/거절용
  if (d.hold && d.hold.status === '승인' && d.hold.expires && _ymdNum(_kstYmd(new Date())) > _ymdNum(d.hold.expires)) d.hold.expired = true;   // 14일 만료(점유 자동해제됨) — UI 표기용
  d.changeReq = _rec.변경요청 || null;   // [02-9] 예식일 변경 요청(고객 셀프) — 계약 카드 확인/거절용. null=요청 없음
  d.changeUsed = (_rec.변경이력 && _rec.변경이력.length) || 0;   // 적용된 변경 횟수(8조① 1회 무상 산정 근거)
  d.refundDone = String(_rec.환불완료 || '');   // 취소 환불 송금 완료 시각(있으면 완료). 환불계좌는 d.consult.refund
  d.refundQuote = buildRefundQuote(cust);   // [02-8] 지금 취소 시 환불 예상(계약서 7조·9조·4조⑧ · 70_journey) — 결제 카드 한 줄. 종료 단계·스냅·입금 전 null
  if (!d.refundQuote && STAGE_EXCEPTIONS.indexOf(stage) !== -1) {   // 종료(취소·노쇼·미계약) 고객 — 환불 송금 근거를 상세에서도(취소일 기준 고정, 환불송금 큐와 동일 계산)
    try {
      var _rbk2 = findRowByPersonalCode(code);
      var _rAsOf = _rbk2 ? _ymdOf(_rbk2.get('취소일시')) : '';
      var _rq2 = _refundQuote(cust, _rAsOf || null);
      if (_rq2 && !_rq2.pending) { _rq2.closed = true; _rq2.asOfLabel = _rAsOf ? ('취소일 ' + _rAsOf + ' 기준') : '오늘 기준'; d.refundQuote = _rq2; }
    } catch (e) {}
  }

  // raw 척추 — 각 축 정확값(거울이 null이어도 항상)
  d.raw = {
    현재단계: stage,
    시착동의상태: String(cust.get('시착동의상태') || ''),
    계약상태: String(cust.get('계약상태') || ''),
    입금상태: String(cust.get('입금상태') || ''),
    결과물상태: String(cust.get('결과물상태') || ''),
    eventId: String(cust.get('eventId') || ''),
    원본링크: String(cust.get('원본링크') || ''),
    영상링크: String(cust.get('영상링크') || ''),
    보정본폴더: String(cust.get('보정본폴더') || ''),
    선택사진: String(cust.get('선택사진') || ''),
    선택수: String(cust.get('선택수') || ''),
    선택확정일시: String(cust.get('선택확정일시') || ''),
    추가보정상태: String(cust.get('추가보정상태') || ''),
    추가보정수량: String(cust.get('추가보정수량') || ''),
    추가보정금액: String(cust.get('추가보정금액') || ''),
    추가보정입금자명: String(cust.get('추가보정입금자명') || ''),
    컨펌일시: String(cust.get('컨펌일시') || ''),
    설문상태: String(cust.get('설문상태') || ''),
    설문응답: String(cust.get('설문응답') || ''),
    설문일시: String(cust.get('설문일시') || ''),
    계약총액: String(cust.get('계약총액') || ''),
    중도금상태: String(cust.get('중도금상태') || ''),
    중도금입금자명: String(cust.get('중도금입금자명') || ''),
    잔금상태: String(cust.get('잔금상태') || ''),
    잔금입금자명: String(cust.get('잔금입금자명') || ''),
    계약서링크: String(cust.get('계약서링크') || ''),
    계약서발송일시: String(cust.get('계약서발송일시') || ''),
    계약서명일시: String(cust.get('계약서명일시') || ''),
    시착동의일시: String(cust.get('시착동의일시') || ''),
    입금완료신호: String(cust.get('입금완료신호') || ''),
    입금자명: String(cust.get('입금자명') || ''),
    쿠폰상태: String(cust.get('쿠폰상태') || ''),   // 커피쿠폰(후기 완주 보상) — 발급/회수. 발급 버튼·회수 버튼 게이트용
    결제수단: _rec.결제수단 || {},   // 카드결제 마커(98_pay_card) — 관리자 화면 '카드' 뱃지·환불 주의 표기용
    수정요청: (function () {   // [REVISION_LOOP] 고객 보정 수정 요청(최근 1건) — 결과물 카드 배지·내용 노출용
      try {
        var a = _rec.수정요청이력 || [];
        if (!a.length) return null;
        var L = a[a.length - 1];
        return { pending: String(L.status || '') === '대기', at: String(L.at || ''), cats: (L.cats || []).join(' · '), note: String(L.note || ''), round: a.length };
      } catch (e) { return null; }
    })()
  };

  // 거울 — 고객이 보는 카드(buildXState(r)). product-aware는 cards로 게이트.
  d.mirror = {
    consult: buildConsultState(code),
    fitting: buildFittingState(cust),
    contract: buildContractState(cust),
    payment: buildPaymentState(cust),
    balance: buildBalanceState(cust),
    production: buildProductionState(cust),
    invitation: buildInvitationState(cust),
    result: buildResultState(cust)
  };

  // product-aware 카드 세트 — 스냅은 시착·제작(청첩장) 없음
  d.cards = isSnap ? ['consult', 'contract', 'payment', 'result']
                   : ['consult', 'fitting', 'contract', 'payment', 'production', 'result'];

  // 동의기록(proof) — 시착·계약(version·금액·termsHash·시각). 마이페이지 비노출분.
  var consent = _parseJsonSafe(cust.get('동의기록'));
  d.consent = { fitting: consent.시착 || null, contract: consent.계약 || null };

  // 메모(수동) + 처리이력(32열·자동·최신순)
  d.memo = String(cust.get('관리자메모') || '');
  var hist = String(cust.get('처리이력') || '').trim();
  d.history = hist ? hist.split('\n').reverse() : [];

  // 상담 27필드 + 상태·일정
  d.consult = cr ? _consultDetail(cr) : null;
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
      out.push({ code: code, names: _names(g, b), product: get(rv, '상품타입'), stage: get(rv, '현재단계'), wedding: _ymdOf(get(rv, '예식일')) });   // 예식일=동명이인 구분용
      if (out.length >= 30) break;
    }
  }
  return { ok: true, results: out };
}

// ============================ 아카이브 (⑧ 신규 — 끝난 고객 검색·최근 N·종료유형) ============================
// 끝남 = 미계약·취소·노쇼·결과물전달(현재단계). 온디맨드(아카이브 진입 시만). 종료일 = 최종수정(proxy).
//   query: 이름·개인코드·연락처 / filter: all | done(완료·전달) | stopped(중단·취소/노쇼/미계약)
function adminArchive(query, filter) {
  _requireAdmin();
  query = String(query || '').trim().toLowerCase();
  filter = String(filter || 'all');
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < P.DATA_START_ROW) return { ok: true, results: [], total: 0 };
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var get = function (rv, h) { var c = colOf[h]; return c ? String(rv[c - 1] || '') : ''; };
  var ENDED = STAGE_EXCEPTIONS.concat(['결과물전달', '후기']);   // 미계약·취소·노쇼 + 결과물전달(구 데이터)·후기(신규) · STAGE_REVIEW
  var q = query.replace(/[\s\-]/g, '');
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var rv = vals[i];
    var stage = get(rv, '현재단계').trim();
    if (ENDED.indexOf(stage) === -1) continue;            // 끝난 고객만
    if ((stage === '결과물전달' || stage === '후기')) { var _ss = get(rv, '설문상태').trim(); if (_ss !== '완료' && _ss !== '건너뜀') continue; }   // 후기 대기는 아직 진행 중(보드) → 아카이브 제외 · STAGE_REVIEW
    var endType = ((stage === '결과물전달' || stage === '후기')) ? '완료' : '중단';   // 완료(전달·후기 마감·그린) / 중단(취소·노쇼·미계약·레드) · STAGE_REVIEW
    if (filter === 'done' && endType !== '완료') continue;
    if (filter === 'stopped' && endType !== '중단') continue;
    var code = get(rv, '개인코드').trim();
    var g = get(rv, '신랑이름'), b = get(rv, '신부이름'), phone = get(rv, '연락처');
    if (query) {
      var hay = (code + ' ' + g + ' ' + b).toLowerCase();
      var phoneN = phone.replace(/[\s\-]/g, '');
      if (hay.indexOf(query) === -1 && !(q && phoneN.indexOf(q) !== -1)) continue;
    }
    var draft = _prodLoadRaw(get, rv);   // PROD_ACCESSOR
    // [B-1 연동] 영수증 상태 뱃지 — 중단 종료는 기발행 여부만 JSON 직독(행마다 Bookings 스캔 방지),
    //   완료 종료만 원장 산출(이때 입금상태='확인'이라 예약금 Bookings 폴백을 타지 않음 → 빠름)
    var _issuedA = _parseJsonSafe(get(rv, '동의기록')).영수증발행 || {};
    var _rcptIssuedA = false; for (var _ik in _issuedA) { if (_issuedA.hasOwnProperty(_ik)) { _rcptIssuedA = true; break; } }
    var _rcptDueA = false;
    if (endType === '완료') {
      try { _cashReceiptLedger({ get: function (h) { var c = colOf[h]; return c ? rv[c - 1] : ''; } }).forEach(function (it) { if (it.due) _rcptDueA = true; }); } catch (e) {}
    }
    out.push({
      code: code, names: _names(g, b), product: get(rv, '상품타입').trim(),
      stage: stage, endType: endType, endTypeLabel: stage,
      wedYmd: _ymdOf(draft.base && draft.base.weddingDate),
      modified: get(rv, '최종수정').trim(),
      rcptDue: (endType === '완료' && _rcptDueA),       // 영수증 미발행(발행 필요 · 가산세 방지)
      rcptFix: (endType === '중단' && _rcptIssuedA)     // 기발행 정리 필요(환불 연동 취소·재발행)
    });
  }
  out.sort(function (a, b) { return (b.modified || '').localeCompare(a.modified || ''); });   // 종료일 desc
  var total = out.length;
  if (!query) out = out.slice(0, 20);                     // 검색 없으면 최근 20
  return { ok: true, results: out, total: total };
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

// 처리 이력 append — 처리이력(32열)에 시간순 한 줄(Topic 3: 관리자메모[수동]와 분리).
//   adminSaveMemo는 관리자메모만, 모든 액션 로그는 여기(처리이력). 표시 시 ④에서 M/D HH:mm로 단축.
function _recordHandler(code, action) {
  try {
    var who = _CURRENT_ADMIN || '관리자';
    var cust = findCustomerByCode(code);
    if (!cust) return;
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var prev = String(cust.get('처리이력') || '');
    var line = '[' + fmtKST(new Date()) + '] ' + who + ': ' + action;
    touchCustomer(sheet, colOf, cust.num, { '처리이력': prev ? (prev + '\n' + line) : line });
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
  doAdminCancel(sheet, colOf, r);                     // 캘린더 삭제 + 상태=취소 + setCustomerStage(cancel) + 가예약 해제(actCancel 공통)
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
  notifyKakao('cust.timeProposed', code, { date: newDate, time: newTime });   // 고객: 시간 변경 제안 — 수락 필요(카톡)
  return { ok: true };
}

// 변경 제안 입력창용 — 가능 슬롯 (getAvailability 재사용)
function adminAvailability() {
  _requireAdmin();
  var d = getAvailability();
  return { ok: true, avail: d.avail, full: d.full, slotsWeekday: CONFIG.SLOTS_WEEKDAY, slotsWeekend: CONFIG.SLOTS_WEEKEND };
}

// ============================ 계약·입금 동작 (02) — Customers 측 ============================
// [02-3] 계약서 발송 — 계약상태=발송 + 계약서발송일시(now, +72h 기한 기준) + 계약서링크.
//   서명은 고객 측(signContract). 발송 시각을 정확히 찍어야 기한 계산이 맞으므로 이 핸들러로 발송(시트 직접 입력 X).
// total = 계약총액(주말 3300000 / 평일 2400000 등, 공휴일=주말단가 · PRICE_2026_08 인상 전은 2800000/2100000). 입금화면의 계약금·잔금 산출 기준.
// [계약] 관리자 — 고객 손글씨 서명 진본 조회(미리보기 검증용). getSignatureDataUrl 재사용.
function adminGetSignature(code, type) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  if (!code) return { ok: false, error: '개인코드가 없습니다.' };
  return { ok: true, dataUrl: getSignatureDataUrl(code, String(type || '계약').trim()) || '' };
}
function adminSendContract(code, link, total, weddingYmd, weddingTime) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };   // 만료 파기 트리거·고객 서명과 직렬화(재발송 직후 파기 경쟁 차단) + 동의기록 RMW 보호
  try {
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stage = String(cust.get('현재단계') || '').trim();
  if (['취소', '노쇼', '미계약'].indexOf(stage) !== -1) {
    return { ok: false, error: '진행할 수 없는 상태입니다. (현재단계: ' + stage + ')' };
  }
  if (String(cust.get('계약상태') || '').trim() === '서명완료') {   // 이미 서명된 계약 — 재발송 시 서명상태 다운그레이드(고객 결제카드 소실) 방지
    return { ok: false, error: '이미 서명이 완료된 계약입니다. 다시 보내려면 강제 단계 변경으로 초기화 후 진행해 주세요.' };
  }
  // [A-2] 예약 미승인(신청·시간선택·변경제안)이면 상품 무관 차단 — 현재단계가 최고수위로만 남은 경우 조기 발송 방지(시착 보내기와 동일 게이트)
  var _bk = findRowByPersonalCode(code), _bs = _bk ? String(_bk.get('상태') || '').trim() : '';
  if (_bs === ST.APPLIED || _bs === ST.PICKED || _bs === ST.PROPOSED) {
    return { ok: false, error: '상담(촬영) 예약을 먼저 승인/확정한 뒤에 계약서를 보낼 수 있어요. (예약 상태: ' + _bs + ')' };
  }
  if (String(cust.get('상품타입') || '').trim() !== '웨딩스냅') {   // 시그니처: 고객이 계약 정보(예식일·생년월일·주소)를 입력/요청해야 발송 — 빈 계약서·예식일 미설정(중도금·잔금 D-day 깨짐) 방지
    var _rec = _parseJsonSafe(cust.get('동의기록'));
    /* ★★[CONTRACT_STAGE_GATE 2026-08-18 rollback-fuzz/roundtrip 발자국 검사가 찾음]
       예식일만 있어도 통과시키던 우회로를 «상담완료 이후»로 좁힌다.
       왜 생겼나 — [KEEP_MONEY_BASIS] 로 되돌려도 예식일을 남기게 되면서, 상담확정으로 내린
       고객도 이 fallback 을 타고 계약서 발송이 됐다. 그러면 **시착·상담완료를 건너뛴 채**
       계약완료로 올라간다(발자국 검사가 «안 밟음: 시착·상담완료» 로 잡아낸 그 모양).
       시착 벌수는 환불 공제의 근거라(계약서 4조⑧) 건너뛰면 돈 계산이 틀어진다.
       ★예식일 fallback 자체는 남긴다 — 계약정보 기록이 없는 옛 고객을 위한 길이고,
         그 고객들은 이미 상담완료 이후에 있다. 단계 조건만 붙여 우회로를 막는다. */
    var _flowC = stageFlowFor(cust.get('상품타입'));
    var _consultDone = (_flowC.indexOf(stage) >= _flowC.indexOf('상담완료'));
    var _ymdOk = /^\d{4}-\d{2}-\d{2}$/.test(String(cust.get('예식일') || '').trim()) && _consultDone;
    if (!_rec.계약정보 && !_ymdOk) {
      return { ok: false, error: '고객이 아직 계약 정보(예식일·인적사항)를 입력하지 않았어요. 고객이 마이페이지에서 입력(요청)하면 발송할 수 있어요.' };
    }
  }
  var linkStr = String(link || '').trim();
  if (!/^https?:\/\//i.test(linkStr)) {                       // #5 — 빈/잘못된 링크 발송 방지(고객 빈 계약서 차단)
    return { ok: false, error: '계약서 링크(https://…)를 입력해 주세요.' };
  }
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var now = fmtKST(new Date());
  var amt = Math.round(Number(total) || 0);                   // 0이면 미설정(입금화면이 "확인 후 안내")
  /* ★★[CONTRACT_AMOUNT_REQ 2026-08-18 rollback-fuzz 무작위 순서 검사가 찾음]
     총액이 «지금도 없고 이번에도 안 왔으면» 발송을 막는다.
     실측 경로 — 되돌림으로 계약총액이 비워진(미수납이라 정상) 고객에게 총액 없이 계약서를 다시
     보내면, 그대로 서명·입금까지 가서 **«받은 돈은 있는데 얼마인지 아무도 모르는» 상태**가 된다
     (현금영수증 원장·환불 견적이 전부 계약총액 하나를 근거로 계산한다 · KEEP_MONEY_BASIS 참고).
     ★막다른 길을 만들지 않는다 — 관리자는 발송 모달에서 금액을 고르면 바로 지나간다.
     ★이미 총액이 있는 고객은 종전대로 총액 없이 재발송할 수 있다(값 유지 · 화면 습관 안 깨짐). */
  if (amt <= 0 && !(Number(String(cust.get('계약총액') || '').replace(/[^0-9]/g, '')) > 0)) {
    return { ok: false, error: '계약 총액을 골라 주세요. 금액이 없으면 입금 안내·현금영수증·환불 계산이 모두 비어요.' };
  }
  var wed = String(weddingYmd || '').trim();                  // 계약 시점에 예식일 확정 → 돈 계산(중도금·잔금 D-day) 단일 기준
  var wT = String(weddingTime || '').trim();                  // 예식 슬롯(관리자 픽스) — 예식일과 함께 잠금
  /* ★★[SEND_TIME_REQ 2026-08-29 점검 · stage-reach 가 찾음] 시그니처는 **예식 시간 없이 발송하지 않는다.**
     발송 폼은 예식일만 검사하고 시간은 «고객이 요청한 슬롯»에서 딸려 오는 값이라, 요청이 없던 고객
     (관리자 수기 생성 · 상담에서 시간 미확정)에게는 빈 채로 나갔다. 그러면 [SIGN_SLOT_REQUIRED] 가
     서명을 막아 **고객이 계약서를 받고도 서명할 수 없는 막다른 길**이 된다(실측: stage-reach 에서
     계약완료에 닿는 정상 경로가 0). 막는 자리는 서명이 아니라 여기다 — 고칠 수 있는 사람이
     이쪽에 있다(관리자는 시간을 고르면 되지만, 고객은 아무것도 할 수 없다).
     ★웨딩스냅은 예식 슬롯 개념이 없어 제외(서명 가드와 같은 기준). */
  if (String(cust.get('상품타입') || '').trim() !== '웨딩스냅' && WEDDING_SLOT.SLOTS.indexOf(wT) === -1) {
    return { ok: false, error: '예식 시간을 먼저 정해 주세요. 시간 없이 보내면 고객이 서명할 수 없어요. (선택 가능: ' + WEDDING_SLOT.SLOTS.join(' · ') + ')' };
  }
  if (wT && WEDDING_SLOT.SLOTS.indexOf(wT) !== -1 && /^\d{4}-\d{2}-\d{2}$/.test(wed) && _weddingSlotTaken(sheet, colOf, wed, wT, code)) {   // 발송 시점에 슬롯 충돌 차단(서명 때 늦은 거절 방지)
    return { ok: false, error: '그 예식 시간(' + wed + ' ' + wT + ')은 이미 다른 예약으로 마감됐어요. 다른 슬롯으로 보내 주세요.' };
  }
  /* ★[CONTRACT_NOTIFY_THROTTLE 2026-08-25 알림 전수점검] 직전 발송이 3분 안이면 고객 알림을 생략한다.
     재발송 알림 자체는 정당하다(새 링크·새 72시간 기한 — 고객이 알아야 한다). 막는 것은
     **모달을 두 번 확인하거나 화면이 두 번 그려져 몇 초 간격으로 두 번 나가는** 연타뿐이다.
     ★시간 창을 늘리지 말 것 — 링크를 고쳐 곧바로 다시 보내는 정상 재발송(수 분 뒤)은 알림이 가야 한다. */
  var _prevSentAt = _parseKstStr(cust.get('계약서발송일시'));
  var _justSent = !!(_prevSentAt && (Date.now() - _prevSentAt.getTime()) < 3 * 60 * 1000);
  var upd = { '계약상태': '발송', '계약서발송일시': now, '계약서링크': linkStr };
  if (amt > 0) upd['계약총액'] = amt;
  if (/^\d{4}-\d{2}-\d{2}$/.test(wed)) upd['예식일'] = wed;    // 톱레벨 예식일 = 잔금 D-9·중도금 D-149 산출 기준(계약에서 잠금 · PAYMENT 단일 출처)
  if (wT && WEDDING_SLOT.SLOTS.indexOf(wT) !== -1) {          // 예식 슬롯 반영(고객 요청분 확정 또는 관리자 변경)
    var _rec = _parseJsonSafe(cust.get('동의기록')); _rec.계약정보 = _rec.계약정보 || {};
    _rec.계약정보.weddingTime = wT; if (/^\d{4}-\d{2}-\d{2}$/.test(wed)) _rec.계약정보.weddingDate = wed;
    /* ★★[SEND_HOLD_SYNC 2026-08-26 더블부킹 점검 S2·S3] 발송하는 슬롯을 **가예약이 따라간다.**
       ①관리자가 발송 모달에서 슬롯을 바꾸면(가장 흔한 운영 동작) 종전엔 가예약이 옛 슬롯에 남아
         **새 슬롯이 서명 순간까지 무주공산**이었다 — 하루 세 팀이 붐비는 날 두 팀 동시 발송이 실제로 난다.
       ②가예약 만료(+14일)가 계약 발송·72h 서명 창과 연동돼 있지 않아, 요청 15일째에 발송하면
         유효한 계약서를 손에 든 부부가 서명에서 튕길 수 있었다 — 발송 시 만료를 **서명 창 이후**까지 민다.
       ★가예약이 없던 발송(옛 고객 fallback)에도 여기서 만들어 준다 — 발송 순간부터 슬롯이 잠긴다. */
    if (/^\d{4}-\d{2}-\d{2}$/.test(wed)) {
      var _sExp = new Date(); _sExp.setDate(_sExp.getDate() + 5);   // 72h 서명 창 + 여유 2일
      var _sExpYmd = _kstYmd(_sExp);
      if (!_rec.가예약) _rec.가예약 = {};
      _rec.가예약.date = wed; _rec.가예약.slot = wT;
      if (_rec.가예약.status !== '계약전환') _rec.가예약.status = '승인';
      if (!_rec.가예약.expires || _ymdNum(_rec.가예약.expires) < _ymdNum(_sExpYmd)) _rec.가예약.expires = _sExpYmd;
    }
    upd['동의기록'] = JSON.stringify(_rec);
  }
  touchCustomer(sheet, colOf, cust.num, upd);
  _recordHandler(code, '계약서 발송' + (amt > 0 ? (' · 총액 ' + amt + '원') : '') + (wed ? (' · 예식일 ' + wed + (wT ? (' ' + wT) : '')) : '') + ' (링크)');
  if (!_justSent) notifyKakao('cust.contractArrived', code);   // 고객: 계약서 도착 — 72시간 내 서명(카톡) · [CONTRACT_NOTIFY_THROTTLE] 3분 내 연타는 1통
  try {   // 고객 알림 — 계약서 도착(72h 서명). 메일 실패해도 발송 자체는 성공(베스트에포트).
    var _cem = String(cust.get('이메일') || '').trim();
    if (CONFIG.SEND_CONTRACT_MAIL && _cem) {   // OFF 기본 — 마이페이지+카톡 대체. (복구: SEND_CONTRACT_MAIL=true)
      GmailApp.sendEmail(_cem, '[Moment Edit] 계약서가 도착했어요 · 72시간 내 서명', '', {
        name: 'Moment Edit',
        htmlBody: '<div style="font-family:sans-serif;line-height:1.7;color:#3a2f25">'
          + '<p>안녕하세요, 모먼트에디트입니다.</p>'
          + '<p>요청하신 <b>계약서가 마이페이지에 도착</b>했어요. 내용을 확인하시고 <b>72시간 안에</b> 서명해 주세요.</p>'
          + '<p style="margin:18px 0"><a href="https://momentedit.kr/mypage.html" style="background:#4E3F31;color:#fff;padding:11px 20px;border-radius:6px;text-decoration:none">마이페이지에서 계약서 보기</a></p>'
          + '<p style="color:#8a7f70;font-size:13px">기한이 지나면 계약서는 자동 파기되며, 디렉터에게 재발송을 요청하실 수 있어요.</p></div>'
      });
    }
  } catch (e) { Logger.log('계약서 발송 메일 실패: ' + (e && e.message)); }
  return { ok: true, sentAt: now };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [02-4] 계약금 입금 확인(통장 대조 후) → 입금상태=확인 + 현재단계=입금완료. 자동 진행 아님(이 승인이 트리거).
function adminConfirmPayment(code) {
  _requireAdmin();
  return _confirmDepositCore(code, { bundle: true });   // 관리자: 통장 일괄 수납(임박) 번들 ON — 기존 동작 그대로
}

// [02-4·코어] 계약금 입금 확인 코어 — 가드 없음(호출측이 인증 책임). 관리자 승인·카드결제가 공유.
//   opts.bundle : 임박(D-149/D-9) 시 중도금·잔금까지 함께 '확인' 할지. 관리자=통장 일괄수납이라 true.
//                 카드는 계약금 금액만 실제 결제되므로 반드시 false(미결제 마일스톤이 확인되는 것 방지).
//   opts.via    : 처리이력에 남길 경로 표기(예: '카드'). 관리자 경로는 생략.
function _confirmDepositCore(code, opts) {
  opts = opts || {};
  var viaTag = opts.via ? ('·' + opts.via) : '';
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  // 종료(취소·노쇼·미계약) 고객은 입금 확인 금지 — 카드결제·낡은 탭이 setCustomerStage('paid')로 여정을 되살리는 것 차단(adminConfirmMid/Balance와 동일 가드)
  if (STAGE_EXCEPTIONS.indexOf(String(cust.get('현재단계') || '').trim()) !== -1) {
    return { ok: false, error: '진행이 종료된 고객이에요. (취소·노쇼·미계약)' };
  }
  if (String(cust.get('계약상태') || '').trim() !== '서명완료') {
    return { ok: false, error: '계약 서명 완료 후 입금 확인이 가능합니다.' };
  }
  if (String(cust.get('입금상태') || '').trim() === '확인') {
    /* ★★[PAID_STAGE_RESYNC 2026-08-16 사용자 신고 "강제변경으로 전으로 돌리고 다시 진행하려는데 더 이상 진행이 안 된다"]
       막다른 길이 실제로 있었다. 세 규칙이 맞물린다:
         ① ROLLBACK_KEEP_PAID — 강제변경으로 단계를 내려도 **확인된 수납은 일부러 보존**한다(돈 기록을 지우지 않는 건 맞다).
         ② 이 함수 — 입금상태가 이미 '확인'이면 `already` 로 조용히 빠져나가며 **단계를 전진시키지 않는다**.
         ③ adminUndoConfirmPayment — 24시간(UNDO_WINDOW_HOURS)이 지나면 되돌리기도 막힌다.
       셋이 겹치면 계약완료에 선 채로 입금완료로 갈 문이 사라진다. 실제 사고 경로:
         제작중 → (강제변경) 입금완료 → 계약완료 → 상담완료 → 계약 재발송·재서명 → **계약완료에서 정지**
       ★고침은 '돈'이 아니라 '단계'만 만진다 — 수납 기록·영수증·동의기록은 한 글자도 건드리지 않는다.
         수납이 확인된 고객이 그보다 앞 단계에 서 있는 것은 그 자체로 어긋난 상태이므로, 맞춰 주는 것이 옳다.
       ★setCustomerStage 가 멱등·역행금지를 이미 들고 있어(consultation-booking 276) 앞선 단계면 아무 일도 안 한다. */
    var _psCur = String(cust.get('현재단계') || '').trim();
    var _psFlow = stageFlowFor(String(cust.get('상품타입') || '').trim());
    var _psI = _psFlow.indexOf(_psCur), _psPaid = _psFlow.indexOf('입금완료');
    if (_psI !== -1 && _psPaid !== -1 && _psI < _psPaid) {
      setCustomerStage(code, 'paid');
      _recordHandler(code, '입금 확인(이미 확인됨) · 단계만 ' + _psCur + '→입금완료로 맞춤' + viaTag);
      return { ok: true, already: true, stageFixed: true };
    }
    _recordHandler(code, '입금 확인(중복)' + viaTag); return { ok: true, already: true };
  }
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var rec0 = _parseJsonSafe(cust.get('동의기록'));
  rec0.영수증기준일 = rec0.영수증기준일 || {};
  rec0.영수증기준일.예약금 = fmtKST(new Date());   // 받은 날 기준(현금영수증 의무발급 5일 기한 계산용 · 스냅 계약금 포함)
  var patch = { '입금상태': '확인', '동의기록': JSON.stringify(rec0) };
  // [임박 계약 일괄 수납] 계약금과 함께 받은 중도금·잔금도 한 번에 확인.
  //   기준(스냅샷 우선): ① 고객 신고 시점에 handlePaymentSignal이 고정한 동의기록.수납묶음.keys를 그대로 확정
  //                     ② 스냅샷이 없으면(구데이터) '완료신호'로 신고된 마일스톤만.
  //   확인 시점 D-day 재계산은 하지 않는다 — 신고 D-150 → 확인 D-149처럼 경계를 넘긴 확인이 '받지 않은 돈'을 오확정하고
  //   영수증까지 오발급하던 문제 차단. 신고에 없던 금액은 개별 확인 버튼(adminConfirmMid 등)으로 처리(기능 손실 없음).
  //   ※ 중도금·잔금 확인일시는 '같은 now'로 찍어야 _cashReceiptLedger 콤보(중도금·잔금 1건 합산) 판정(_mAt===_bAt)이 성립. fmtKST가 분 단위라 new Date() 두 번이면 분 경계서 갈릴 수 있음.
  //   ※ 카드결제(opts.bundle=false)는 계약금 금액만 승인되므로 절대 번들하지 않는다(미결제분 확인 방지). 임박 일괄은 프론트 '일괄결제' 옵션으로 별도 처리.
  var bundled = [], _bNow = fmtKST(new Date());
  if (opts.bundle && String(cust.get('상품타입') || '').trim() !== '웨딩스냅') {
    var _bk = (rec0.수납묶음 && rec0.수납묶음.keys && rec0.수납묶음.keys.length) ? rec0.수납묶음.keys.slice() : [];
    if (!_bk.length) {
      if (String(cust.get('중도금상태') || '').trim() === '완료신호') _bk.push('중도금');
      if (String(cust.get('잔금상태') || '').trim() === '완료신호') _bk.push('잔금');
    }
    if (_bk.indexOf('중도금') !== -1 && String(cust.get('중도금상태') || '').trim() !== '확인') { patch['중도금상태'] = '확인'; patch['중도금확인일시'] = _bNow; bundled.push('중도금'); }
    if (_bk.indexOf('잔금') !== -1 && String(cust.get('잔금상태') || '').trim() !== '확인') {
      patch['잔금상태'] = '확인'; patch['잔금확인일시'] = _bNow; bundled.push('잔금');
      if (!(Number(rec0.잔금확정금액) > 0)) {   // [잔금 스냅샷] 번들 확인도 동일 고정(이미 고정돼 있으면 유지)
        var _dX = (typeof _balanceExtraInfo === 'function') ? _balanceExtraInfo(cust) : { amount: 0 };
        var _dAm = _journeyAmounts(cust.get('계약총액'), cust.get('상품타입'));
        rec0.잔금확정금액 = Math.round((_dAm ? Number(_dAm['잔금']) || 0 : 0) + (_dX.amount || 0));
      }
      patch['동의기록'] = JSON.stringify(rec0);
    }
  }
  touchCustomer(sheet, colOf, cust.num, patch);
  setCustomerStage(code, 'paid');                            // 현재단계 → 입금완료
  _recordHandler(code, '입금 확인 → 입금완료' + viaTag + (bundled.length ? (' (일괄: 계약금·' + bundled.join('·') + ')') : ''));
  notifyKakao('cust.depositToProduction', code);   // [2026-06-23] 계약금 입금 확인 + 다음 단계 안내(시그=제작 정보 입력 / 스냅=촬영 준비) · paymentConfirmed(off·안심만)를 대체해 여정 정체 방지
  return { ok: true, bundled: bundled };
}

// [02-7] 현금영수증 발행 기록 — 입금 확인된 마일스톤(예약금/계약금·중도금·잔금)을 홈택스에서 발급한 뒤, 승인번호(발행번호)를 여기 기록.
//   기록되면 발행 큐에서 사라지고 고객 '내 내역'에 발행완료로 표시. 금액은 원장에서 자동 산출(관리자는 번호만 입력).
function adminIssueCashReceipt(code, kind, num) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  kind = String(kind || '').trim();
  num = String(num || '').replace(/[^0-9\-]/g, '').trim();   // 승인번호(숫자·하이픈)
  if (['예약금', '계약금', '중도금', '잔금', '추가보정', '중도금잔금'].indexOf(kind) === -1) return { ok: false, error: '발행 항목이 올바르지 않습니다.' };   // '계약금'=시그 계약금 잔액(원장 행 · _cashReceiptLedger가 due 발행)
  if (!num) return { ok: false, error: '발행번호(홈택스 승인번호)를 입력해 주세요.' };
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stOk = (kind === '추가보정') ? '완료' : '확인';   // 추가 보정은 '완료'가 입금 확인 상태
  if (kind === '중도금잔금') {   // 묶음 발행 — 두 마일스톤 모두 확인이어야
    if (String(cust.get('중도금상태') || '').trim() !== '확인' || String(cust.get('잔금상태') || '').trim() !== '확인') return { ok: false, error: '입금 확인 후에 현금영수증을 발행할 수 있어요. (중도금·잔금)' };
  } else {
  // 계약금 잔액은 계약 시 실입금분 → 입금상태(예약금과 동일 컬럼)가 확인이면 발급 대상
  var stCol = (kind === '예약금' || kind === '계약금') ? '입금상태' : (kind === '중도금' ? '중도금상태' : (kind === '잔금' ? '잔금상태' : '추가보정상태'));
  var _stPass = String(cust.get(stCol) || '').trim() === stOk;
  if (!_stPass && kind === '예약금' && String(cust.get('상품타입') || '').trim() !== '웨딩스냅') {   // 계약(서명) 전이라도 상담 예약금 입금이 확인됐으면 발급 가능 — 받은 날+5일 기한이 서명을 기다려주지 않음
    try { var _bkI = findRowByPersonalCode(code); if (_bkI && String(_bkI.get('입금확인') || '').trim() === '확인') _stPass = true; } catch (e) {}
  }
  if (!_stPass) return { ok: false, error: '입금 확인 후에 현금영수증을 발행할 수 있어요. (' + kind + ')' };
  }
  var amt = 0, led = _cashReceiptLedger(cust);
  for (var i = 0; i < led.length; i++) if (led[i].key === kind) amt = led[i].amount;
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (!rec.영수증발행) rec.영수증발행 = {};
  if (rec.영수증발행[kind] && String(rec.영수증발행[kind].번호 || '') === num) return { ok: true, already: true };
  rec.영수증발행[kind] = { 금액: amt, 번호: num, 대상: _cashReceiptOf(cust), at: fmtKST(new Date()) };
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
  _recordHandler(code, '현금영수증 발행(' + kind + ' ' + num + ')');
  notifyKakao('cust.cashReceiptIssued', code, { kind: kind, num: num, amount: amt });   // 고객 안내(카톡)
  return { ok: true };
}
// [02-7b] 현금영수증 발행 취소(오기재·환불) — 기록 제거 → 다시 발행 대기로. 홈택스 실제 취소는 별도(자료 안내).
function adminUndoCashReceipt(code, kind) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  kind = String(kind || '').trim();
  if (['예약금', '계약금', '중도금', '잔금', '추가보정', '중도금잔금'].indexOf(kind) === -1) return { ok: false, error: '발행 항목이 올바르지 않습니다.' };
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (!rec.영수증발행 || !rec.영수증발행[kind]) return { ok: true, already: true };
  delete rec.영수증발행[kind];
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
  _recordHandler(code, '현금영수증 발행 취소(' + kind + ')');
  return { ok: true };
}


/* ============================ [ADM_AC1] 입금 확인 취소 (오처리 복구 전용) ============================
   입금 확인은 한 번에 6가지를 바꾼다(입금상태·영수증 기산점·번들 마일스톤·잔금 스냅샷·현재단계·고객 카톡).
   잘못 누른 걸 되돌릴 경로가 없어 지금까지는 강제변경으로 우회했는데, 강제변경의 롤백은
   _clearForwardData의 ROLLBACK_KEEP_PAID가 '확인된 수납은 보존'하도록 설계돼 있어 입금은 애초에 안 지워진다.
   그래서 이 액션은 그 경로를 재사용하지 않고 별도로 둔다.

   되돌리면 안 되는 경우는 각각 다른 메시지로 돌려준다 — "안 됩니다" 하나로 뭉치면 왜 막혔는지 몰라
   결국 강제변경으로 우회하게 되고, 그게 더 많은 데이터를 지운다.
     A 카드로 확정된 건(동의기록.결제수단) · B 현금영수증 발행됨 · C 다음 단계로 전진함(계약금만)
     D 종료 고객(취소·노쇼·미계약) · E 되돌리기 시간 경과 · F 환불 정산이 끝난 건

   UNDO_WINDOW_HOURS: 오처리는 대개 몇 분 안에 발견된다. 시간이 지난 건은 현금영수증 기한·환불 견적이
   이미 그 값을 물고 있어 조용한 되돌리기가 더 위험하므로 창을 좁게 둔다(정책값 · 결정 대기함 등재). */
var UNDO_WINDOW_HOURS = 24;

// 'yyyy-MM-dd HH:mm'(KST) 문자열에서 지금까지 경과 시간(h). 값이 없거나 형식이 다르면 null(=시각 미상).
function _undoHoursSince(kst) {
  var m = String(kst == null ? '' : kst).match(/(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/);
  if (!m) return null;
  var t = Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4] - 9, +m[5]);   // KST(+09:00) → UTC
  if (isNaN(t)) return null;
  return (new Date().getTime() - t) / 3600000;
}

// 마일스톤별 되돌리기 스펙 — 상태·신호·확인일시 컬럼, 카드 판정 키, 영수증 판정 키(콤보 포함).
function _undoSpec(milestone, isSnap) {
  if (milestone === '계약금') return { label: '계약금', stateCol: '입금상태', signalCol: '입금완료신호', atCol: '', payKey: isSnap ? '예약금' : '계약금', receiptKeys: isSnap ? ['예약금'] : ['계약금'], stage: true };
  if (milestone === '중도금') return { label: '중도금', stateCol: '중도금상태', signalCol: '중도금입금신호', atCol: '중도금확인일시', payKey: '중도금', receiptKeys: ['중도금', '중도금잔금'], stage: false };
  if (milestone === '잔금') return { label: '잔금', stateCol: '잔금상태', signalCol: '잔금입금신호', atCol: '잔금확인일시', payKey: '잔금', receiptKeys: ['잔금', '중도금잔금'], stage: false };
  return null;
}

// 되돌리기 코어 — preview=true면 아무것도 쓰지 않고 '무엇이 어떻게 되돌아가는지'만 계획으로 돌려준다.
function _undoConfirmCore(code, milestone, reason, preview) {
  code = String(code || '').trim().toUpperCase();
  milestone = String(milestone || '').trim();
  reason = String(reason || '').trim();
  /* ★★[UNDO_ALL 2026-08-17 사용자 질문 "원클릭으로 가능한거야?"] '전체' = 확인된 수납을 한 번에.
     실측: 되돌려진 고객의 계약금만 취소하면 중도금·잔금 '확인'이 남아 큐가 다시 뜨고, 운영자가
     같은 팝업을 두세 번 더 눌러야 했다 — 그건 원클릭이 아니다.
     targets 루프는 이미 여러 항목을 돌 수 있으므로 목록만 넓히면 «한 번의 사유·한 번의 확인»으로 끝난다.
     ★스냅은 중도금이 없다 — '전체'에서는 오류가 아니라 «건너뛴다»(아래 targets 구성에서 제외). */
  if (['계약금', '중도금', '잔금', '중도금잔금', '전체'].indexOf(milestone) === -1) return { ok: false, error: '되돌릴 항목이 올바르지 않아요. (계약금·중도금·잔금·중도금잔금·전체)' };
  if (!preview && !reason) return { ok: false, error: '되돌리는 사유를 입력해 주세요. 금전 기록이라 처리이력에 남겨요.' };
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stageNow = String(cust.get('현재단계') || '').trim();
  var isSnap = String(cust.get('상품타입') || '').trim() === P.PRODUCT_SNAP;
  var rec = _parseJsonSafe(cust.get('동의기록'));
  // D · 종료 고객 — 확인 함수와 같은 가드(취소 건의 정산은 환불 큐에서 따로 본다)
  if (STAGE_EXCEPTIONS.indexOf(stageNow) !== -1) return { ok: false, block: 'D', error: '진행이 종료된 고객이에요(' + stageNow + '). 되돌리려면 먼저 단계를 정상으로 복구해 주세요.' };
  // F · 환불 정산 완료 — 환불액은 기수령액(=확인된 입금)으로 계산돼서, 정산 뒤 입금을 되돌리면 장부가 어긋난다
  if (rec.환불완료) return { ok: false, block: 'F', error: '이미 환불 완료로 정리된 고객이에요. 입금을 되돌리면 환불 계산과 어긋나요. 환불 완료 취소를 먼저 해주세요.' };

  /* ★★[UNDO_BEHIND 2026-08-17 사용자 실측 스크린샷] «되돌려진 상태»에서는 되돌리기를 막지 않는다.
     강제변경으로 단계를 입금완료보다 앞(계약완료·상담완료…)으로 내리면 확인된 수납만 남는다(ROLLBACK_KEEP_PAID).
     그 상태에서 관리자가 「입금 확인 취소」를 누르면 종전 차단 C 가 «이미 계약완료(으)로 **진행된** 고객이에요»
     라고 막았다 — 계약완료는 입금완료보다 앞인데 «진행됐다»는 말 자체가 거짓이고,
     취소하려면 단계를 먼저 입금완료로 올렸다가 취소하는 **숨은 2단 춤**이 필요했다(아무도 발견 못 한다).
     차단 C(전진 고객 보호)의 취지는 «앞 단계 데이터가 수납에 의존하는데 수납만 빼는 것»을 막는 것 —
     단계가 수납보다 뒤에 있는 상태엔 그 의존이 없다. 그래서 behind 면 C 를 면제한다.
     ★E(24시간 창)도 behind 면 면제한다 — 이 상태는 관리자가 강제변경으로만 만들 수 있는 이상 상태라
       «정상 흐름의 오래된 확정을 실수로 뒤집는 것»(E 의 취지)이 아니고, E 를 두면 오래된 되돌림 건은
       영영 정리할 수 없다(강제변경은 수납을 보존하므로 지울 다른 길이 없다). 사유 필수·처리이력은 그대로. */
  var _ubFlow = stageFlowFor(String(cust.get('상품타입') || '').trim());
  var _ubSi = _ubFlow.indexOf(stageNow), _ubPi = _ubFlow.indexOf('입금완료');
  var _ubBehind = (_ubSi !== -1 && _ubPi !== -1 && _ubSi < _ubPi);

  var targets = (milestone === '중도금잔금') ? ['중도금', '잔금']
    : (milestone === '전체') ? (isSnap ? ['계약금', '잔금'] : ['계약금', '중도금', '잔금'])   // [UNDO_ALL] 스냅은 중도금 없음 — 오류 대신 제외
    : [milestone];
  var plan = [], patch = {}, recDirty = false, consentRemoved = [];
  for (var i = 0; i < targets.length; i++) {
    var sp = _undoSpec(targets[i], isSnap);
    if (!sp) return { ok: false, error: '되돌릴 항목이 올바르지 않아요.' };
    if (isSnap && targets[i] === '중도금') return { ok: false, error: '웨딩스냅은 중도금이 없어요. (계약금·잔금 2단계)' };
    var cur = String(cust.get(sp.stateCol) || '').trim();
    if (cur !== '확인') continue;                                        // 멱등 — 이미 확인이 아니면 되돌릴 게 없다
    // A · 카드 확정분 — 시트에서만 되돌리면 장부와 PG가 어긋난다
    if (rec.결제수단 && rec.결제수단[sp.payKey] === '카드') return { ok: false, block: 'A', blockKey: sp.payKey, blockLabel: sp.label, error: sp.label + '은 카드로 결제된 건이에요. 시트만 되돌리면 결제 기록과 어긋나요. 토스에서 결제 취소를 먼저 진행해 주세요.' };
    // B · 현금영수증 발행분 — 발행 취소가 먼저다
    var issued = rec.영수증발행 || {};
    for (var k = 0; k < sp.receiptKeys.length; k++) {
      /* ★[BLOCK_KEY 2026-08-17 사용자 지시 "현금영수증 발행취소같은것도 확인 메세지 나와서 바로선택해서 넘길수있게"]
         무엇이 막는지를 **문구가 아니라 값으로** 돌려준다 — 화면이 한글을 파싱해 알아내면
         문구를 다듬는 순간 조용히 깨진다. blockKey 를 보고 «그럼 그것부터 취소할까요?»를 바로 낸다. */
      if (issued[sp.receiptKeys[k]]) return { ok: false, block: 'B', blockKey: sp.receiptKeys[k], blockLabel: sp.label,
        error: sp.label + '은 현금영수증이 이미 발행됐어요(' + sp.receiptKeys[k] + '). 현금영수증 발행 취소를 먼저 해주세요.' };
    }
    // C · 다음 단계로 전진함 — 계약금에만 적용. 중도금·잔금은 원래 제작중·예식완료에서 확인하는 마일스톤이라 여기서 막으면 정상 건이 전부 막힌다
    //     [UNDO_BEHIND] behind(단계가 입금완료보다 앞 = 되돌려진 상태)면 면제 — «진행된» 것이 아니라 «되돌려진» 것이다
    if (sp.stage && stageNow !== '입금완료' && !_ubBehind) return { ok: false, block: 'C', error: '이미 ' + (stageNow || '다음 단계') + '(으)로 진행된 고객이에요. 계약금 확인은 입금완료 단계에 머물러 있을 때만 되돌릴 수 있어요.' };
    // E · 되돌리기 시간 — 계약금은 영수증 기산점, 중도금·잔금은 확인일시가 확인 시각. [UNDO_BEHIND] behind 면 면제(위 근거)
    var atStr = sp.atCol ? String(cust.get(sp.atCol) || '').trim() : String((rec.영수증기준일 || {}).예약금 || '').trim();
    var hrs = _undoHoursSince(atStr);
    if (!_ubBehind) {
      if (hrs == null) return { ok: false, block: 'E', error: sp.label + ' 확인 시각이 기록에 없어요(예전 데이터). 되돌리기 대신 강제 단계 변경으로 정리해 주세요.' };
      if (hrs > UNDO_WINDOW_HOURS) return { ok: false, block: 'E', error: sp.label + ' 확인 후 ' + Math.floor(hrs) + '시간이 지났어요. 되돌리기는 확인 후 ' + UNDO_WINDOW_HOURS + '시간 안에만 가능해요.' };
    }
    // 되돌린 상태 — 고객 입금 신고가 남아 있으면 '완료신호'로, 없으면 빈값(대기)으로
    var back = String(cust.get(sp.signalCol) || '').trim() ? '완료신호' : '';
    patch[sp.stateCol] = back;
    if (sp.atCol) patch[sp.atCol] = '';
    plan.push({ key: targets[i], label: sp.label, from: '확인', to: back || '대기', at: atStr, hours: (hrs == null ? null : Math.max(0, Math.round(hrs * 10) / 10)) });
    if (targets[i] === '계약금' && rec.영수증기준일 && rec.영수증기준일.예약금) { delete rec.영수증기준일.예약금; recDirty = true; consentRemoved.push('영수증기준일.예약금(현금영수증 5일 기한 기산점)'); }
    if (targets[i] === '잔금' && rec.잔금확정금액 != null) { delete rec.잔금확정금액; recDirty = true; consentRemoved.push('잔금확정금액(확정 시점 금액 스냅샷)'); }
  }
  if (!plan.length) return { ok: true, already: true, error: '' };      // 멱등 — 두 번 눌러도 안전

  var stagePlan = null;
  /* [UNDO_BEHIND] 단계는 «입금완료에 서 있을 때만» 계약완료로 내린다.
     behind(이미 계약완료·상담완료…)면 그대로 둔다 — 상담완료에서 취소했는데 계약완료로 «올리면» 그게 새 사고다. */
  if (targets.indexOf('계약금') !== -1 && stageNow === '입금완료') stagePlan = { from: stageNow, to: '계약완료' };
  var notice = '이미 나간 입금 확인 카톡은 취소되지 않아요. 필요하면 직접 안내해 주세요.';
  if (preview) return { ok: true, preview: true, milestone: milestone, plan: plan, stage: stagePlan, consentRemoved: consentRemoved, notice: notice, windowHours: UNDO_WINDOW_HOURS };

  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    if (recDirty) patch['동의기록'] = JSON.stringify(rec);
    // 현재단계는 touchCustomer로 직접 쓴다 — setCustomerStage는 역행(입금완료→계약완료)을 무시한다
    if (stagePlan) patch['현재단계'] = stagePlan.to;
    touchCustomer(sheet, colOf, cust.num, patch);
    _recordHandler(code, '입금 확인 취소(' + plan.map(function (p) { return p.label; }).join('·') + ')' + (stagePlan ? ' → ' + stagePlan.to : '') + ' · 사유: ' + reason);
    return { ok: true, undone: plan.map(function (p) { return p.key; }), stage: stagePlan, notice: notice };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 실행 — 사유 필수 · 멱등 · 처리이력. milestone: 계약금 | 중도금 | 잔금 | 중도금잔금
function adminUndoConfirmPayment(code, milestone, reason) {
  _requireAdmin();
  return _undoConfirmCore(code, milestone, reason, false);
}
// 미리보기(dry-run) — 아무것도 쓰지 않고 무엇이 어떻게 되돌아가는지만 돌려준다. 모달이 실행 전에 보여준다.
function adminUndoConfirmPreview(code, milestone) {
  _requireAdmin();
  return _undoConfirmCore(code, milestone, '', true);
}

// [02-0] 시착 동의 게이트 열기 → 시착동의상태=동의요청 (고객 마이페이지에 동의서 노출). 상담확정 단계에서.
function adminOpenFittingConsent(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (String(cust.get('상품타입') || '').trim() === P.PRODUCT_SNAP) return { ok: false, error: '웨딩스냅은 시착 단계가 없습니다.' };
  var stage = String(cust.get('현재단계') || '').trim();
  if (stage !== '상담확정' && stage !== '시착') return { ok: false, error: '상담확정 단계에서 시착 동의서를 보낼 수 있습니다. (현재: ' + (stage || '없음') + ')' };
  var _bk = findRowByPersonalCode(code), _bs = _bk ? String(_bk.get('상태') || '').trim() : '';   // 예약이 미승인(신청·시간선택·변경제안)이면 차단 — 현재단계가 최고수위로만 남은 경우 조기 발송 방지
  if (_bs === ST.APPLIED || _bs === ST.PICKED || _bs === ST.PROPOSED) return { ok: false, error: '상담 예약을 먼저 승인/확정한 뒤에 시착 동의서를 보낼 수 있어요. (예약 상태: ' + _bs + ')' };
  if (String(cust.get('시착동의상태') || '').trim() === '동의완료') return { ok: true, already: true };
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  touchCustomer(sheet, colOf, cust.num, { '시착동의상태': '동의요청' });
  setCustomerStage(code, 'fitting');                          // 상담확정 → 시착 (진행바 전진)
  _recordHandler(code, '시착 동의서 발송(→시착)');
  notifyKakao('cust.fittingRequest', code);                   // 고객: 시착 동의서 서명 요청(카톡)
  return { ok: true };
}

// ============================ ⑤⑥⑦·예외 동작 (⑧ 신규 8액션) ============================
// 공통: _requireAdmin · LockService(15s) · 최신 재읽기 · 자체 멱등 · 입력검증 · 처리이력 · {ok:false,error}.
//   ★ EX 멱등 함정(이음새 4-A): setCustomerStage는 EX→정상 차단 + 가드가 멱등보다 먼저 →
//      노쇼/미계약/강제는 현재단계를 직접 touchCustomer로 쓰고 멱등(현재===타겟)을 스스로 처리한다.
function _adminLock() {
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); return lock; } catch (e) { try { lockBusySignal('관리자'); } catch (_e) {} return null; }
}
var _LOCK_BUSY = '잠시 후 다시 시도해 주세요. (서버 혼잡)';

// 1. 상담완료 처리 (시그니처 전용) — 상담확정 → 상담완료
function adminMarkConsultDone(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    if (String(cust.get('상품타입') || '').trim() === P.PRODUCT_SNAP) return { ok: false, error: '웨딩스냅은 상담완료 단계가 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    if (stage === '상담완료') return { ok: true, already: true, stage: stage };
    if (stage !== '시착') return { ok: false, error: '시착 단계에서 상담완료로 넘길 수 있습니다. (현재: ' + (stage || '없음') + ')' };
    if (String(cust.get('시착동의상태') || '').trim() !== '동의완료') return { ok: false, error: '고객이 시착 동의서에 서명한 뒤 상담완료로 넘길 수 있어요.' };
    var _fitRecMC = _parseJsonSafe(cust.get('동의기록')).시착 || {};
    if (_fitRecMC.벌수 == null) return { ok: false, error: '시착 벌수를 먼저 기록해 주세요. (시착 카드에서 입력 · 안 입으셨으면 0벌) 환불 산정의 근거가 돼요.' };   // [필수화] 벌수 없으면 환불 계산 불가 → 상담완료 게이트에서 강제
    setCustomerStage(code, 'complete');
    _recordHandler(code, '상담완료 처리');
    notifyKakao('cust.consultDone', code);   // 고객: 다음 단계(마이페이지 계약 진행 요청) 안내 · 없으면 여기서 여정 정체(카톡)
    try {   // [2026-06-23] 상담완료는 카톡+메일 둘 다(중요 단계 · 사용자 결정). best-effort — 실패해도 처리는 완료.
      var _cdNm = _names(cust.get('신랑이름'), cust.get('신부이름'));
      _notifyCustomerEmail(code, '[Moment Edit] 상담이 마무리되었습니다 · 다음 단계 안내', '상담이 마무리되었습니다',
        centerP(esc(_cdNm) + ' 님,<br>상담에 함께해 주셔서 감사합니다.') +
        centerP('다음 단계로 마이페이지에서<br>예식일과 기본 정보를 입력해 계약 진행을 요청해 주세요.') +
        emailBtn(P.MYPAGE_URL, 'My Page') +
        smallP('확인 후 이용계약서를 보내드립니다.'));
    } catch (e) {}
    return { ok: true, stage: '상담완료' };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [LINK_VERIFY 2026-07-25] 결과물 링크 서버 검증(best-effort) — 저장은 항상 수행하고 경고만 돌려준다.
//   판정(리다이렉트 기반 · 2026-07-25 더블체크 리뷰 반영): ①https:// 시작 아님 → 형식 경고
//   ②리다이렉트 Location이 구글 로그인(accounts.google.com)으로 향함 → 공유 제한 추정
//     (본문 'ServiceLogin' 문자열 판정은 정상 공유 페이지의 로그인 버튼에도 걸려 오경고 위험 → 제거)
//   ③최종 응답 400 이상 → 접근 불가 ④fetch 예외 → 확인 실패(단정하지 않는 문구).
//   리다이렉트는 최대 4회만 수동 추적. 어떤 경우에도 밖으로 throw 하지 않는다.
function _resultLinkCheck(label, url) {
  try {
    // [LINK_VERIFY_FIX 2026-07-25] 저장 검증(okUrl)은 http(s) 모두 허용 → 검증기도 http(s)로 맞춰 작동하는 http 링크에 거짓 형식경고를 내지 않게 함
    if (!/^https?:\/\//i.test(url)) return label + ' 링크: http(s):// 로 시작하는 주소가 아니에요. 주소를 확인해 주세요.';
    var cur = url, codeN = 0;
    for (var hop = 0; hop < 5; hop++) {
      var resp;
      try {
        resp = UrlFetchApp.fetch(cur, { muteHttpExceptions: true, followRedirects: false });
      } catch (e) {
        return label + ' 링크: 접속 확인이 안 됐어요(검증 불가). 링크가 정상일 수도 있으니 한 번 직접 열어 확인해 주세요.';
      }
      codeN = resp.getResponseCode();
      if (codeN >= 300 && codeN < 400) {
        var loc = '';
        try { loc = String((resp.getAllHeaders() || {})['Location'] || (resp.getAllHeaders() || {})['location'] || ''); } catch (eH) { loc = ''; }
        if (!loc) break;
        if (loc.indexOf('accounts.google.com') !== -1) {
          return label + ' 링크: 공유 설정이 제한되어 고객이 열지 못할 수 있어요.';
        }
        if (/^\/\//.test(loc)) loc = 'https:' + loc;   // 프로토콜 상대(//host/…) — origin을 붙이면 잘못된 주소가 돼 오경고(404)로 이어지던 것 방지
        else if (loc.indexOf('http') !== 0) { try { loc = cur.replace(/^(https?:\/\/[^\/]+).*$/i, '$1') + (loc.charAt(0) === '/' ? loc : '/' + loc); } catch (eA) { break; } }   // 상대경로 보정 — [LINK_VERIFY_FIX 2026-07-25] 슬래시 없는 상대경로(view?id=x)도 '/' 보강해 'hostview…' 깨진 주소·거짓 404 방지
        cur = loc;
        continue;
      }
      break;
    }
    if (codeN >= 400) return label + ' 링크: 열 수 없음(' + codeN + '). 주소를 확인해 주세요.';
    return null;
  } catch (e3) { return null; }   // 검증 자체 실패는 저장·응답에 영향 주지 않음(best-effort)
}
function _resultLinkWarnings(items) {
  var warns = [];
  try {
    for (var i = 0; i < items.length; i++) {
      var it = items[i];
      if (!it || !String(it.url || '').trim()) continue;   // 빈 칸은 검사 안 함
      var w = _resultLinkCheck(it.label, String(it.url).trim());
      if (w) warns.push(w);
    }
  } catch (e) {}
  return warns;
}

// 2. 결과물 링크 등록 — 원본·영상·보정본(부분 허용·https) + 결과물상태 자동(전달완료는 유지)
function adminSetResultLinks(code, links) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  links = links || {};
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    /* ★★[RESULT_LINK_REVIEW 2026-08-17 stage-reach 도달성 검사가 찾음] '후기' 단계도 받는다.
       화면은 후기 단계에서도 «보정본 등록·결과물 링크 수정» 버튼을 그린다(admin.html DELIV_FORCE_RESUME).
       그런데 서버 목록에만 '후기'가 빠져 있어, 누르면 «결과물 준비 단계가 아닙니다»로 거부됐다 —
       보이는 버튼이 안 되는 것은 없는 버튼보다 나쁘다(운영자가 자기 손을 의심하게 된다).
       ★후기는 «결과물을 이미 받은 뒤»라 링크를 고칠 자격은 결과물전달과 같다. 목록을 좁히지 말 것. */
    if (['제작중', '예식완료', '촬영완료', '결과물전달', '후기'].indexOf(stage) === -1) {
      return { ok: false, error: '결과물 준비 단계가 아닙니다. (현재: ' + (stage || '없음') + ')' };
    }
    var isSnap = String(cust.get('상품타입') || '').trim() === P.PRODUCT_SNAP;
    var clean = function (v) { return String(v == null ? '' : v).trim(); };
    var okUrl = function (v) { return v === '' || /^https?:\/\//i.test(v); };
    var 원본 = clean(links['원본']), 보정본 = clean(links['보정본']), 영상 = isSnap ? '' : clean(links['영상']);
    if (!okUrl(원본)) return { ok: false, error: '원본 링크가 올바른 주소가 아니에요 (https://…).' };
    if (!okUrl(보정본)) return { ok: false, error: '보정본 링크가 올바른 주소가 아니에요 (https://…).' };
    if (!okUrl(영상)) return { ok: false, error: '영상 링크가 올바른 주소가 아니에요 (https://…).' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    // [MPD3_GAL 2026-07-25] B안 썸네일 갤러리 — 원본링크에서 folders/<ID> 자동 추출 → 원본폴더ID(컬럼 없으면 멱등 추가).
    //   관리자는 폴더ID를 따로 입력하지 않는다. 원본이 폴더 링크가 아니면 빈값(갤러리 대신 번호 입력 폴백).
    var _galFid = (원본.match(/folders\/([A-Za-z0-9_-]{10,})/) || [])[1] || '';
    if (!colOf['원본폴더ID']) { try { sheet.getRange(1, sheet.getLastColumn() + 1).setValue('원본폴더ID'); colOf = buildHeaderIndex(sheet); } catch (eCol) {} }
    var upd = { '원본링크': 원본, '보정본폴더': 보정본 };
    if (colOf['원본폴더ID']) upd['원본폴더ID'] = _galFid;
    if (!isSnap) upd['영상링크'] = 영상;
    // [REVISION_LOOP 2026-07-25] 대기 중 수정 요청이 있는데 보정본을 (재)등록하면 = 반영 완료 — 이력에 '반영' 표시 + 고객에게 보정본 재안내(락 해제 후 발송).
    var _nfRevDone = false;
    try {
      if (보정본) {
        var _rvRec = _parseJsonSafe(cust.get('동의기록'));
        var _rvA = _rvRec.수정요청이력 || [];
        if (_rvA.length && String(_rvA[_rvA.length - 1].status || '') === '대기') {
          _rvA[_rvA.length - 1].status = '반영';
          _rvA[_rvA.length - 1].doneAt = fmtKST(new Date());
          _rvRec.수정요청이력 = _rvA;
          upd['동의기록'] = JSON.stringify(_rvRec);
          _nfRevDone = true;
        }
      }
    } catch (eRv) {}
    var cur결과물 = String(cust.get('결과물상태') || '').trim();
    if (cur결과물 === '업로드') cur결과물 = '원본전달';                         // 레거시
    if (cur결과물 !== '전달완료') {
      var ns = cur결과물 || '대기';
      if (보정본 && cur결과물 !== '컨펌완료') ns = '컨펌대기';                    // 보정본 등록 = 고객 컨펌 대기
      else if (원본 && (ns === '대기' || ns === '')) ns = '원본전달';            // 원본만 = 원본 전달(고객 선택 대기)
      if (!(원본 || 보정본 || 영상)) ns = '대기';
      upd['결과물상태'] = ns;
    }
    touchCustomer(sheet, colOf, cust.num, upd);
    _recordHandler(code, '결과물 링크 등록' + (원본 ? ' 원본' : '') + (보정본 ? ' 보정본' : '') + (영상 ? ' 영상' : ''));
    // [RESULT_NOTIFY_STEPS 2026-07-25] 상태가 실제로 전이된 1회만 고객 알림 플래그(링크 수정 재저장 시 중복 발송 방지) — 발송은 락 해제 후
    var _nfOrig = (upd['결과물상태'] === '원본전달' && cur결과물 !== '원본전달');
    var _nfReto = (upd['결과물상태'] === '컨펌대기' && cur결과물 !== '컨펌대기');
    var _lvRes = { ok: true, links: { 원본: 원본, 보정본: 보정본, 영상: 영상 }, 결과물상태: upd['결과물상태'] || cur결과물 };
  } finally { try { lock.releaseLock(); } catch (e) {} }
  // [LINK_VERIFY 2026-07-25] 저장 후 접근성 검증(경고하되 저장은 허용) — 더블체크 리뷰 반영: 외부 fetch(최대 3링크)가
  //   락 점유 중 실행되면 다른 관리자 액션이 _LOCK_BUSY로 막힐 수 있어 락 해제 후로 이동. 저장은 이미 완료된 상태.
  if (!_lvRes) return { ok: false, error: '저장 결과를 확인하지 못했어요. 다시 시도해 주세요.' };
  // [RESULT_NOTIFY_STEPS 2026-07-25] 원본·보정본이 올라온 순간 고객 알림(카톡 · 템플릿 미승인 시 이메일 자동 폴백) —
  //   대기 카드 '올라올 때마다 알려드려요' 약속의 근거. 실패해도 저장 응답에 영향 없음(try) · 락 해제 후 실행.
  try {
    if (_nfOrig) notifyKakao('cust.resultOriginal', code);
    else if (_nfReto || _nfRevDone) notifyKakao('cust.resultRetouch', code);   // [REVISION_LOOP] 수정 반영 재등록은 상태 전이가 없어도 재안내(같은 컨펌대기 유지)
  } catch (eNf) {}
  var _lvWarns = [];
  try {
    _lvWarns = _resultLinkWarnings([{ label: '원본', url: _lvRes.links['원본'] }, { label: '보정본', url: _lvRes.links['보정본'] }, { label: '영상', url: _lvRes.links['영상'] }]);
    // [LINK_VERIFY_RECLOCK 2026-07-25] 락 해제 후 실행되는 처리이력 기록을 짧은 락으로 보호 — 처리이력은 read-modify-write라
    //   동시 관리자 액션과 겹치면 한 줄이 유실될 수 있음(점검 제안 반영). 5초 안에 락을 못 얻으면 기록 생략(경고는 이미 응답·모달로 전달됨).
    if (_lvWarns.length) {
      try {
        var _rlLock = LockService.getScriptLock();
        if (_rlLock.tryLock(5000)) {
          try { _recordHandler(code, '[링크검증] ' + _lvWarns.join(' / ').slice(0, 400)); } finally { try { _rlLock.releaseLock(); } catch (eL) {} }
        } else { Logger.log('[링크검증] 처리이력 기록 생략(락 대기 초과): ' + code); }
      } catch (eR) {}
    }
  } catch (eV) { _lvWarns = []; }
  _lvRes.warnings = _lvWarns;
  // [MPD3_GAL] Drive 접근 방어 — GAS 운영 계정이 원본 폴더를 못 읽으면 갤러리가 안 열림. 저장은 막지 않고 관리자에게 공유 요청 안내만(락 해제 후 실행).
  try {
    var _galFid2 = (String(_lvRes.links['원본'] || '').match(/folders\/([A-Za-z0-9_-]{10,})/) || [])[1] || '';
    if (_galFid2) {
      try { DriveApp.getFolderById(_galFid2).getName(); _lvRes.gallery = true; }
      catch (eGal) { _lvRes.gallery = false; _lvRes.galleryWarn = '운영 계정에서 이 폴더를 열 수 없어요. 폴더를 운영 계정과 공유해 주세요. 공유 전까지 고객 화면은 번호 입력으로 자동 폴백돼요.'; }
    }
  } catch (eGw) {}
  return _lvRes;
}

// 3. 예식/촬영 완료 처리 — 제품분기(시그 제작중→예식완료 / 스냅 입금완료→촬영완료)
function adminMarkEventDone(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var isSnap = String(cust.get('상품타입') || '').trim() === P.PRODUCT_SNAP;
    var stage = String(cust.get('현재단계') || '').trim();
    var target = isSnap ? '촬영완료' : '예식완료';
    var fromStage = isSnap ? '입금완료' : '제작중';   // (표시용 · 실제 허용은 아래 EVENT_GATE_WIDE 목록)
    var fromStages = isSnap ? ['입금완료'] : ['입금완료', '제작중'];   // ★EVENT_GATE_WIDE — 제작 미작업(입금완료) 고객도 예식완료 처리 가능. 큐 조건과 동일 목록 유지
    if (stage === target) return { ok: true, already: true, stage: stage };
    if (fromStages.indexOf(stage) === -1) return { ok: false, error: target + ' 처리는 ' + fromStages.join('·') + ' 상태에서만 가능합니다. (현재: ' + (stage || '없음') + ')' };
    setCustomerStage(code, 'event');
    _recordHandler(code, target + ' 처리');
    return { ok: true, stage: target };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 4. 결과물 전달 완료 — 예식완료/촬영완료 + 원본 필수 → 결과물전달(후기 대기, 아카이브는 후기 마감 후)
function adminMarkDelivered(code, force) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    // [DELIV_FORCE_RESUME 2026-07-25] 강제 변경 등으로 단계만 먼저 결과물전달이 된 고객(결과물상태≠전달완료)도 전달 완료 처리 가능하게 —
    //   종전엔 already로 조기 반환해 상태·기록·알림 없이 영영 마감 불가(막다른길). 이미 전달완료면 종전대로 멱등 반환.
    /* ★[DELIV_RESUME_REVIEW 2026-08-17 admin-btn-server 검사가 찾음] '후기'도 같이 본다.
       화면은 결과물전달·후기 둘 다에서 «결과물 전달 처리» 버튼을 그리는데(admin.html DELIV_FORCE_RESUME)
       서버는 결과물전달만 봐서, 후기 단계에 올려 둔 미완 건은 누를 때마다 거부됐다.
       두 단계 모두 «강제변경으로 단계만 앞서간» 같은 상황이다 — 자격을 다르게 둘 이유가 없다. */
    var _stageAlreadyDeliv = (stage === '결과물전달' || stage === '후기');
    if (_stageAlreadyDeliv && String(cust.get('결과물상태') || '').trim() === '전달완료') return { ok: true, already: true, stage: stage };
    if (!_stageAlreadyDeliv && ['예식완료', '촬영완료'].indexOf(stage) === -1) return { ok: false, error: '예식완료/촬영완료 상태에서만 전달할 수 있습니다. (현재: ' + (stage || '없음') + ')' };
    if (!String(cust.get('원본링크') || '').trim()) return { ok: false, error: '결과물(원본)을 먼저 등록해 주세요.' };
    // [B-2] 미수금 가드 — 잔금(시그는 중도금 포함)·추가보정 미확인 상태로 결과물을 내보내는 사고 방지. 의도적 전달은 force(상세 카드 경고 확인)로만.
    var _isSnapD = String(cust.get('상품타입') || '').trim() === '웨딩스냅';
    var _unpaid = [];
    if (!_isSnapD && String(cust.get('중도금상태') || '').trim() !== '확인') _unpaid.push('중도금');
    if (String(cust.get('잔금상태') || '').trim() !== '확인') _unpaid.push('잔금');
    if (String(cust.get('추가보정상태') || '').trim() === '결제대기') _unpaid.push('추가 보정');
    if (_unpaid.length && force !== true) {
      return { ok: false, needForce: true, error: '미수금이 있어요: ' + _unpaid.join('·') + ' 미확인. 입금 확인 후 전달하거나, 고객 상세의 결과물 카드에서 경고를 확인하고 그래도 전달을 선택해 주세요.' };
    }
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var _dRec = _parseJsonSafe(cust.get('동의기록'));
    _dRec.결과물전달일 = fmtKST(new Date());                     // 인도 완료일(계약서 12조③ 보관 6개월 기산 · 만료 통지 기준)
    touchCustomer(sheet, colOf, cust.num, { '결과물상태': '전달완료', '동의기록': JSON.stringify(_dRec) });
    if (!_stageAlreadyDeliv) setCustomerStage(code, 'deliver');   // 단계가 이미 결과물전달이면(강제 변경 복구) 상태·기록·알림만 마감 · DELIV_FORCE_RESUME
    _recordHandler(code, '결과물 전달 완료' + (_unpaid.length ? (' · 미수금(' + _unpaid.join('·') + ') 경고 확인 후 전달') : ''));
    var _dlvKakao = notifyKakao('cust.resultDelivered', code);   // 고객: 결과물 준비 완료 · 다운로드 안내(가장 중요 · 카톡). 반환 true/'held'/'off'/false — NOTIFY_SENT_RET
    var _dlvMail = false;
    try {   // [2026-06-23] 결과물 전달은 카톡+메일 둘 다(다운로드 링크를 메일에도 남겨 6개월 내 찾기 쉽게). best-effort.
      var _rdNm = _names(cust.get('신랑이름'), cust.get('신부이름'));
      _dlvMail = _notifyCustomerEmail(code, '[Moment Edit] 결과물이 준비되었습니다', '결과물이 준비되었습니다',
        centerP(esc(_rdNm) + ' 님,<br>두 분의 시간이 담긴 결과물이 준비되었습니다.') +
        centerP('전달일부터 6개월 보관됩니다.<br>마이페이지에서 다운로드해 꼭 옮겨 보관해 주세요.') +
        emailBtn(P.MYPAGE_URL, 'My Page') +
        smallP('보관 기간이 끝나면 파일이 삭제될 수 있어요.')) === true;
    } catch (e) {}
    // [SILENT_FAIL_ALERT 2026-07-25] 알림톡·메일 둘 다 미도달이면 관리자 메일 — 고객이 결과물 준비 소식을 모른 채 방치되는 조용한 실패 방지.
    //   야간 보류('held')는 아침 발송 예정, 전역 OFF('off')는 의도된 미발송(테스트 모드)이라 둘 다 실패로 치지 않음(더블체크 리뷰 반영).
    //   메일 발송 자체 실패가 전달 처리를 막지 않게 try로 감쌈.
    try {
      if (_dlvKakao !== true && _dlvKakao !== 'held' && _dlvKakao !== 'off' && !_dlvMail) {
        var _dlvNm = _names(cust.get('신랑이름'), cust.get('신부이름'));
        _nfAdminEmail('[Moment Edit] 결과물 전달 알림 미도달: ' + _dlvNm + ' / ' + code,
          '결과물 전달 처리(' + code + ' · ' + _dlvNm + ')는 완료됐지만,<br>'
          + '고객 알림톡과 이메일이 모두 발송되지 못했어요.<br>'
          + '고객이 결과물 준비 소식을 받지 못했을 수 있으니 직접 연락해 안내해 주세요.');
      }
    } catch (eN) {}
    return { ok: true, stage: '결과물전달', survey: '대기' };   // 후기 대기 · 고객 후기 제출/운영자 넘기기 시 아카이브
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 4-1. 후기 넘기기 — 후기 미작성 고객을 수동 마감 → 설문상태=건너뜀 → 아카이브
// [보상] 커피쿠폰 발급 — 관리자가 바코드 이미지(base64 data URI, 최대 2장)+사용기한 저장 → 고객 마이페이지에 표시
function adminIssueCoupon(code, images, expiry, title) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var imgs = [];
    if (Object.prototype.toString.call(images) === '[object Array]') {
      for (var i = 0; i < images.length && imgs.length < 2; i++) {
        var s = String(images[i] || '').trim();
        if (s.indexOf('data:image/') === 0 && s.length < 40000) imgs.push(s);
      }
    }
    if (!imgs.length) return { ok: false, error: '바코드 이미지를 첨부해 주세요(가벼운 이미지).' };
    var data = { title: String(title || '스타벅스 커피 2잔').slice(0, 60), images: imgs, expiry: String(expiry || '').slice(0, 10), issuedAt: fmtKST(new Date()), note: '' };
    var json = JSON.stringify(data);
    if (json.length > 48000) return { ok: false, error: '이미지 용량이 커요. 더 작은 바코드 이미지로 올려 주세요.' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    /* ★[COUPON_NOTIFY_ONCE 2026-08-25 알림 전수점검] «선물 도착» 카톡은 **처음 발급에만** 보낸다.
       종전엔 바코드 이미지를 바꿔 다시 저장할 때마다 고객에게 또 나갔다 — 같은 선물을 두 번 받은 것처럼.
       재발급(회수 후 다시 발급)은 상태가 '발급'이 아니게 되므로 정상적으로 다시 알린다. */
    var _wasIssued = String(cust.get('쿠폰상태') || '').trim() === '발급';
    touchCustomer(sheet, colOf, cust.num, { '쿠폰상태': '발급', '쿠폰데이터': json });
    _recordHandler(code, '커피쿠폰 발급(' + imgs.length + '장' + (data.expiry ? (' · ~' + data.expiry) : '') + ')');
    /* [CPN_NOTIFY] 바코드가 떴다고 알린다 — 기본 off 라 지금은 로그만 남는다(95_notify 이벤트 표에서 off 를 지우면 켜진다).
       ★호출을 미리 심어 두는 이유: 켜는 순간 코드를 다시 만지지 않아도 되게. 실패해도 발급은 이미 끝났다. */
    if (!_wasIssued) { try { notifyKakao('cust.couponIssued', code, { title: data.title, expiry: data.expiry }); } catch (eNf) {} }   // [COUPON_NOTIFY_ONCE]
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
// [보상] 커피쿠폰 회수 — 고객이 아직 안 썼으면 마이페이지에서 내림
function adminRevokeCoupon(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    touchCustomer(sheet, colOf, cust.num, { '쿠폰상태': '회수', '쿠폰데이터': '' });
    _recordHandler(code, '커피쿠폰 회수');
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}
function adminSkipSurvey(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    /* ★★[SURVEY_STAGE_BOTH 2026-08-16 시뮬레이션 점검] '후기' 단계도 받는다.
       종전엔 '결과물전달'만 허용했는데, 후기를 기다리는 단계는 **'후기'** 다(adminForceStage 로 올린다).
       그래서 «후기 대기 중인 고객의 후기를 넘기려 하면 거부»되는 막다른 길이 있었다 —
       실행으로 확인: 후기 단계에서 «결과물 전달 완료 고객만…» 오류.
       ★두 단계 다 «결과물을 이미 받은 뒤»라 후기를 생략할 자격은 같다. 조건을 좁히지 말 것. */
    var _sg = String(cust.get('현재단계') || '').trim();
    if (_sg !== '결과물전달' && _sg !== '후기') return { ok: false, error: '결과물 전달 완료 고객만 후기를 넘길 수 있습니다. (현재: ' + (_sg || '미정') + ')' };
    var cur = String(cust.get('설문상태') || '').trim();
    if (cur === '완료' || cur === '건너뜀') return { ok: true, already: true, archived: true };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    touchCustomer(sheet, colOf, cust.num, { '설문상태': '건너뜀' });
    /* [STAGE_REVIEW_DOOR] 넘기기도 «후기 마감»이다 — 고객 제출과 같은 문으로 마지막 칸에 올린다.
       (이미 '후기'면 setCustomerStage 가 멱등으로 그대로 둔다) */
    if (_sg === '결과물전달') setCustomerStage(code, 'review');
    _recordHandler(code, '후기 넘기기(설문 생략)');
    return { ok: true, archived: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 5. ★강제 단계 변경 (복구/초기화용) — 현재단계 변경 + '이후 단계 진행 데이터 초기화'(완전 초기화) · 제품 유효성 검증
//   ※ 상담 예약(상담예약 시트·캘린더)은 별개라 건드리지 않음.
// [ADM_AC3] report(선택)를 넘기면 무엇이 비워지고 무엇이 보존되는지 함께 채운다 — 미리보기와 실행이 같은 함수를 쓰게 해
//   "미리보기와 실제 결과가 다른 안전장치"(= 함정)가 생기지 않도록. report를 안 넘기면 동작은 종전과 완전히 같다.
/* [KEEP_MONEY_BASIS] 수납이 하나라도 살아 있는가 — «금액 근거를 남길 이유»가 있는지 판정.
   확인분은 물론 '완료신호'(고객이 이미 이체하고 신고한 것)도 센다(KEEP_SIGNAL 과 같은 기준). */
function _rbPaidAny(c) {
  var v = function (k) { return String(c.get(k) || '').trim(); };
  var paid = function (x) { return x === '확인' || x === '완료신호'; };
  return paid(v('입금상태')) || paid(v('중도금상태')) || paid(v('잔금상태'));
}

function _clearForwardData(colOf, cust, product, targetStage, fromException, report) {
  var flow = stageFlowFor(product);
  var ti = flow.indexOf(targetStage);
  if (ti < 0) return {};
  var isSnap = (product === P.PRODUCT_SNAP);
  // [컬럼들, 이 데이터가 생기는 단계(상품 기준), 동의기록 키] — 목표가 그 단계보다 앞이면 비움
  var groups = [
    { cols: [], at: isSnap ? '촬영확정' : '상담확정', consent: '가예약' },   // 예식일 임시고정 — 신청접수로 내리면(예약 자체 리셋) 요청/승인·슬롯 점유까지 제거. 상담확정 이상 복귀는 보존
    /* ★★[FITTING_SPLIT 2026-08-17 «한번더 점검»에서 내가 만든 회귀를 잡음]
       시착은 **컬럼과 기록을 나눠서** 다룬다.
       ·컬럼(시착동의상태·일시)은 언제나 비운다 — 남기면 되돌린 뒤 「시착 동의 보내기」가
         already 로 조용히 넘어가고(admin.gs 1640 조기반환) 단계가 안 올라, 「상담완료 처리」가
         «시착 단계에서…»로 거부된다. 관리자가 그 자리에 갇힌다(실측으로 재현).
       ·기록(동의기록.시착)은 수납이 있으면 남긴다 — 벌수가 환불 공제의 근거다(계약서 4조⑧).
         지우면 재취소 때 공제가 빠져 **과다 환불**이 난다. 돈이 나가는 방향이라 더 위험하다.
       ★둘을 한 그룹으로 묶어 keep 을 걸면 컬럼까지 남아 위 갇힘이 생긴다. 나눠 두는 이유가 이것이다. */
    { cols: ['시착동의상태', '시착동의일시'], at: '시착' },
    { cols: [], at: '시착', consent: '시착', keep: function (c) { return _rbPaidAny(c); } },
    /* ★★[KEEP_MONEY_BASIS 2026-08-17 조사 실측] 수납이 살아 있으면 «금액의 근거»도 함께 남긴다.
       종전엔 입금상태='확인'은 보존(ROLLBACK_KEEP_PAID)하면서 계약총액은 무조건 지웠다.
       계약총액은 금액 계산의 단일 근거다(_journeyAmounts → 현금영수증 원장·환불 견적).
       그래서 «받은 돈은 기록에 남았는데 얼마인지는 아무도 모르는» 상태가 만들어졌다 —
       현금영수증 큐는 계속 뜨는데 금액이 비고, 고객 내 내역에서 결제가 통째로 사라졌다(실측).
       ★예식일도 같이 남긴다 — 환불 위약 구간(D-60·30·10)이 예식일로 계산된다. 지우면 환불액이 틀어진다.
       ★수납이 없으면 종전대로 전부 지운다(계약을 처음부터 다시 받는 것이 맞다). */
    { cols: ['계약상태', '계약서발송일시', '계약서명일시', '계약서링크'], at: '계약완료', consent: ['계약', '계약정보'] },
    { cols: ['계약총액', '예식일'], at: '계약완료', keep: function (c) { return _rbPaidAny(c); } },
    /* ★시착 벌수는 환불 공제의 근거다(계약서 4조⑧ · _refundQuote 가 동의기록.시착.벌수 를 읽는다).
       수납이 있는 고객에게서 이걸 지우면 재취소 때 공제가 빠져 **과다 환불**이 난다. 돈이 나가는 방향이라 더 위험하다. */  // 계약정보=고객이 입력한 계약서 요청 정보(상담완료 단계 산출물) → 함께 비워야 '요청 완료' 카드도 초기화. 예식일(톱레벨 복사본)도 함께 — 남으면 계약발송 큐·'계약서 준비 중' 안내가 잘못 살아남
    { cols: ['입금상태', '입금완료신호', '입금자명'], at: '입금완료', consent: '현금영수증', keep: function (c) { var _v = String(c.get('입금상태') || '').trim(); return _v === '확인' || _v === '완료신호'; } },   // ROLLBACK_KEEP_PAID · 확인된 수납은 롤백에도 보존(지우면 카드 이중청구·영수증 큐 소실·환불계산 누락 — 2026-07-25 점검) · ★[KEEP_SIGNAL 2026-08-17] '완료신호'(고객이 이미 이체하고 신고한 상태)도 보존 — 지우면 화면이 «계약금 입금만 남았어요»로 돌아가 **이미 보낸 분께 또 보내라고 말한다**(조사 실측). 신고는 고객이 한 일이지 되돌릴 대상이 아니다
    { cols: ['중도금상태', '중도금입금자명', '중도금입금신호', '중도금확인일시', '중도금리마인드'], at: '제작중', keep: function (c) { return String(c.get('중도금상태') || '').trim() === '확인'; } },        // 중도금(시그 3단계 마일스톤) · ROLLBACK_KEEP_PAID
    { cols: ['잔금상태', '잔금입금자명', '잔금입금신호', '잔금확인일시', '잔금리마인드'], at: isSnap ? '촬영완료' : '제작중', keep: function (c) { return String(c.get('잔금상태') || '').trim() === '확인'; } }, // 잔금(제작/촬영 단계 마일스톤) · ROLLBACK_KEEP_PAID
    /* ★★[GUIDE_TOKEN_CLEAR 2026-08-18 문서화된 미해결건을 실측으로 확인] 공개 링크 열쇠도 함께 버린다.
       안내공유토큰·좌석공유토큰은 «제작 데이터»에서 발급된다(다이닝·좌석 완료 시). 그 데이터를 여기서
       지우면서 열쇠만 남겨 두면, 이미 뿌려진 QR·링크가 **빈 안내를 계속 열어 준다** —
       그 화면에는 두 분의 실명이 실린다. 게다가 만료는 예식일로 판정하는데(_guideExpired),
       미수납 되돌림에선 예식일까지 지워져 **영영 만료되지 않는다**(실측 확인).
       ★열쇠는 다시 발급된다 — 두 분이 다이닝·좌석을 다시 마치면 새 토큰이 나온다(80_production 627).
         옛 QR 이 죽는 것은 되돌림의 당연한 결과다(안내 내용 자체가 이미 지워졌다). */
    { cols: _prodCols().concat(['eventId', '제작상태', '안내공유토큰', '좌석공유토큰']), at: isSnap ? '입금완료' : '제작중' },   // PROD_ACCESSOR — 제작 컬럼 목록은 _prodCols() 단일 출처(PR-B 트랙 분리 시 자동 확장 · 신 컬럼 잔존=데이터 부활 사고 차단)   // 스냅은 flow에 '제작중'이 없어 이 그룹이 영영 스킵되던 것 수정(스냅 기획·청첩장 초안도 초기화 대상 — 2026-07-25 점검)
    /* ★[GAL_FID_CLEAR 2026-08-18] 원본폴더ID 도 같은 등급이다 — 원본링크를 지우면서 이 열을 남기면
       같은 Drive 폴더를 그대로 가리킨다(20_customers-data 의 파기 목록이 같은 이유로 이 열을 넣어 뒀다).
       지금은 단계 가드(RESULT_STAGES)가 갤러리를 막아 새는 창은 없지만, 가드 하나에만 기대지 않는다. */
    { cols: ['원본링크', '영상링크', '보정본폴더', '결과물상태', '선택사진', '선택수', '선택확정일시', '컨펌일시', '원본폴더ID'], at: isSnap ? '촬영완료' : '예식완료' },
    { cols: ['추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명'], at: isSnap ? '촬영완료' : '예식완료', keep: function (c) { return String(c.get('추가보정상태') || '').trim() === '완료'; } },   // ROLLBACK_KEEP_PAID · 완료(입금확인)된 추가 보정 — 현금영수증 의무발급 큐 유지
    { cols: ['설문상태', '설문응답', '설문일시'], at: '후기' },   // 후기(설문)는 '후기' 단계 산출물 — 그 아래로 내리면 초기화
    /* [ADM_DELIVDATE 2026-07-26 사용자 결정] 보관 시계는 '결과물전달' 단계 산출물 — 후기 단계에서 결과물전달로만 내리는 롤백에는 지우지 않는다.
         결과물전달일은 계약 12조③ 보관 6개월 기산일이자 만료 통지(70_journey)·마이페이지 만료 배너·아침보고 전달 건수의 근거라,
         전달은 그대로인데 시계만 사라지면 재전달을 다시 처리하지 않는 한 복구되지 않는다.
         결과물전달 아래(예식완료 등)로 내리면 종전대로 셋 다 초기화 — 재전달 사이클에서 만료통지·6개월 자동정리가 다시 산다. */
    { cols: [], at: '결과물전달', consent: ['결과물전달일', '보관만료통지', '결과물파기'] }
  ];
  var upd = {}, consentKeys = [];
  groups.forEach(function (g) {
    var gi = flow.indexOf(g.at);
    if (gi < 0 || ti >= gi) return;                 // 이 상품에 없거나, 목표가 이 데이터 단계 이상이면 보존
    if (g.keep && g.keep(cust)) {                   // ROLLBACK_KEEP_PAID · 확인된 결제 사실은 초기화하지 않음
      if (report) g.cols.forEach(function (c) { if (colOf[c] && String(cust.get(c) || '').trim()) report.kept.push(c); });   // [ADM_AC3] 화면에 '유지됨'으로 구분 표시
      return;
    }
    g.cols.forEach(function (c) { if (colOf[c]) { upd[c] = ''; if (report && String(cust.get(c) || '').trim()) report.cleared.push(c); } });
    if (g.consent) consentKeys = consentKeys.concat(g.consent);   // string·array 모두 허용(한 그룹에서 여러 동의기록 키 제거)
  });
  // ROLLBACK_TRACK_DEMOTE · 결과물전달 아래(결과물 단계 구간)로 내릴 때 — 작업물(링크·선택·컨펌)은 그 단계 산출물이라 보존하되,
  //   '전달완료' 상태만 한 단계(컨펌완료)로 강등해 단계·고객 화면(전달완료·후기 UI)·관리자 트랙이 함께 되돌아가게(2026-07-25 사용자 신고 · 추천안 ①).
  //   ★STAGE_REVIEW 확인(기획 §3 #11): flow 끝에 '후기'가 붙어도 '결과물전달' 인덱스는 그대로라 아래 판정은 불변.
  //   후기 → 결과물전달 되돌리기는 ti === _di 라 강등되지 않는다(결과물전달 단계에선 '전달완료'가 정상값이므로 의도된 동작).
  var _di = flow.indexOf('결과물전달'), _ri = flow.indexOf(isSnap ? '촬영완료' : '예식완료');
  if (_di >= 0 && _ri >= 0 && ti < _di && ti >= _ri && colOf['결과물상태'] && !('결과물상태' in upd)
      && String(cust.get('결과물상태') || '').trim() === '전달완료') upd['결과물상태'] = '컨펌완료';
  // 예외(취소·노쇼·미계약)→정상 복구 — 환불완료 흔적 제거(남으면 이후 재취소 때 환불송금 큐가 영영 안 뜸). 실제 송금 이력은 처리이력에 보존.
  if (fromException) consentKeys.push('환불완료');
  // ※ 동의기록.영수증발행(홈택스 발행 기록)은 의도적 보존 — 세무 증빙. 취소는 adminUndoCashReceipt로만.
  if (consentKeys.length) {                          // 동의기록 JSON에서 해당 키 제거
    var rec = _parseJsonSafe(cust.get('동의기록'));
    if (report) consentKeys.forEach(function (k) { if (rec[k] !== undefined) report.consent.push(k); });   // [ADM_AC3] 실제로 값이 있는 키만 미리보기에
    /* [ADM_AC3FIX 2026-07-26] 캘린더 이벤트 삭제(_holdCalDelete)를 여기서 하지 않는다 — 이 함수는 미리보기(dry-run)도 같이 쓰는
         계산 함수라, 여기에 외부 부작용이 있으면 단계를 골라보기만 해도 가예약 슬롯이 실제로 풀린다(6차 검증 AC3-BUG).
         지울 대상만 report.holdCal로 알리고, 실제 삭제는 실행 경로(adminForceStage)가 시트 쓰기 뒤에 한다.
         ★이 함수 본문에 _holdCalDelete 호출을 되살리지 말 것 — merge-guard가 본문 안 0곳을 감시한다. */
    if (report && consentKeys.indexOf('가예약') !== -1 && rec.가예약) report.holdCal = rec.가예약;
    consentKeys.forEach(function (k) { delete rec[k]; });
    upd['동의기록'] = Object.keys(rec).length ? JSON.stringify(rec) : '';
  }
  return upd;
}
// 강제 되돌리기로 '신청접수'까지 내릴 때 — 상담 예약을 초기상태(신청접수)로 되돌리고 캘린더 슬롯 해제.
//   상태→신청접수 + 선택날짜·시간·확정·변경제안·취소일시 비움 + 캘린더 이벤트 삭제(슬롯 해제). 이미 초기상태면 무해(false).
function _resetConsultBooking(code) {
  try {
    var cr = findRowByPersonalCode(code);
    if (!cr) return false;
    var curStatus = String(cr.get('상태') || '').trim();
    var hasEvent = !!String(cr.get('캘린더이벤트ID') || '').trim();
    if (curStatus === ST.APPLIED && !hasEvent) return false;          // 이미 신청접수 + 캘린더 없음 = 할 일 없음
    var bsheet = getSheet(), bcolOf = buildHeaderIndex(bsheet);
    deleteCalendarEvent(bsheet, bcolOf, cr.num, coupleNames(cr));     // 캘린더 슬롯 해제
    var reset = { '상태': ST.APPLIED, '선택날짜': '', '선택시간': '', '확정일시': '', '변경제안날짜': '', '변경제안시간': '', '취소일시': '' };
    Object.keys(reset).forEach(function (h) { if (bcolOf[h]) writeCell(bsheet, bcolOf, cr.num, h, reset[h]); });
    return true;
  } catch (e) {
    notifyStudio('[관리자] ⚠️오류 · 강제 되돌리기 상담예약 초기화 실패', code + '\n' + (e && e.message));
    return false;
  }
}
/* [ADM_AC3] 강제 변경 미리보기(dry-run) — 실행 전에 "무엇이 비워지고 무엇이 남는지"를 목록으로 보여준다.
     실행과 같은 _clearForwardData를 report 모드로 부르므로 미리보기와 실제 결과가 어긋날 수 없다.
     ROLLBACK_KEEP_PAID로 보존되는 항목은 '유지됨'으로 따로 돌려준다 — 입금 기록이 안 지워진다는 걸 화면에서 알아야
     입금 오처리를 강제변경으로 우회하지 않고 AC1(입금 확인 취소)로 가게 된다. */
/* [ADM_AC3NOOP 2026-07-26] '실제로 값이 바뀌는 컬럼'만 변경으로 센다.
     _clearForwardData는 이미 비어 있는 컬럼에도 upd[c]=''를 넣기 때문에 Object.keys(upd).length로 세면
     바뀔 게 하나도 없는 재적용(예: 신청접수 고객을 다시 신청접수로)도 '변경 있음'이 돼 noop 가드가 사문화된다
     (빈 컬럼 수십 개를 다시 쓰고 처리이력에 전부 나열). 결과물상태 강등(ROLLBACK_TRACK_DEMOTE)처럼
     ''가 아닌 값을 넣는 경우도 이 비교로 함께 잡힌다. Object.keys 비교로 되돌리지 말 것. */
function _fsChangedCols(cust, upd) {
  // [ADM_AC3NOOP · NOOP_ZERO 2026-07-26] `|| ''`를 쓰면 숫자 0·false가 빈 값으로 뭉개져 "이미 비어 있다"로 오판된다.
  //   → 0이 든 열은 초기화 대상에서 빠지고 그 값이 남는다. == null 로 '없음'만 빈 문자열로 바꾼다.
  //   현재 대상 숫자 열은 전부 쓰기 시점에 0을 막고 있어(선택수←!picks / 추가보정수량←!(qty>0) / 계약총액←amt>0)
  //   실제 도달 사례는 없지만, 앞으로 숫자 열이 이 목록에 추가되면 바로 함정이 되는 자리라 미리 막는다.
  return Object.keys(upd).filter(function (k) {
    var a = cust.get(k), b = upd[k];
    return String(a == null ? '' : a) !== String(b == null ? '' : b);
  });
}
/* ★★[ROLLBACK_SLOT 2026-08-18 사용자 결정 «추천대로»] 되돌려도 예식 «자리»는 이 부부 것으로 둔다.

   ── 무엇이 문제였나
   되돌리면 계약상태가 비워진다. 그런데 예식 슬롯 점유 판정(_weddingOccupancy)이
   «계약상태=서명완료 + 예식일 + 계약정보.weddingTime» 셋을 함께 본다 —
   즉 되돌리는 순간 그 날짜가 **다른 부부에게 열린다.** 되돌린 부부는 그 사실을 모른다.
   되돌림의 대부분은 사고 복구인데, 복구하려다 날짜를 잃으면 그건 복구가 아니라 새 계약이다.

   ── 어떻게 잠그나 (새 장치를 만들지 않는다)
   저장소에는 «계약 전에 날짜를 잡아 두는» 장치가 이미 있다 — 임시고정(동의기록.가예약 · 승인).
   되돌릴 때 확정 점유를 **그 상태로 되돌려 놓는다.** 점유 판정·만료 안내(D-3)·관리자 해제 버튼·
   캘린더 표시가 전부 이미 그 장치를 알고 있어서, 새로 만들 것도 새로 배울 것도 없다.
   기한은 임시고정과 같은 14일 — 무기한으로 잡아 두면 아무도 모르게 자리가 묶인다.

   ── 여는 경우 (관리자가 고른다)
   강제변경 확인창의 체크 한 칸(기본 꺼짐)으로 «이 날짜를 다른 분께 엽니다»를 고를 수 있다.
   신청접수까지 내리거나 취소·노쇼·미계약으로 뺄 때는 자리를 놓아 준다 — 그건 되돌림이 아니라 종료다. */
function _rbConfirmedSlot(cust) {
  try {
    if (String(cust.get('계약상태') || '').trim() !== '서명완료') return null;
    var d = _ymdOf(cust.get('예식일'));
    var rc = _parseJsonSafe(cust.get('동의기록'));
    var t = (rc.계약정보 && rc.계약정보.weddingTime) || '';
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(d || '')) || !t) return null;
    return { date: d, slot: t, eventId: (rc.가예약 && rc.가예약.eventId) || '' };
  } catch (e) { return null; }
}
/* 캘린더 제목만 바꾼다(지우지 않는다) — 사용자 선택 (나).
   지우면 되돌릴 수 없고, 사고 복구용 되돌림에서 예식이 달력에서 통째로 사라진다.
   ★[예식확정] · [가예약] · [보류] 어느 상태에서 와도 한 번에 갈아끼운다(접두사만 교체). */
function _rbCalRetitle(eventId, prefix, note) {
  try {
    if (!eventId || typeof getCalendar !== 'function') return false;
    var cal = getCalendar(); if (!cal) return false;
    var ev = cal.getEventById(eventId); if (!ev) return false;
    var t = String(ev.getTitle() || '');
    var body = t.replace(/^\s*\[[^\]]*\]\s*/, '');          // 앞의 [xxx] 하나를 떼고
    ev.setTitle(prefix + ' ' + body);                          // 새 접두사로 붙인다
    if (note) { try { ev.setDescription(note); } catch (e2) {} }
    return true;
  } catch (e) { try { Logger.log('ROLLBACK_SLOT 캘린더 제목 변경 실패: ' + (e && e.message)); } catch (e3) {} return false; }
}

/* [ROLLBACK_SLOT] «자리를 어떻게 할 것인가» 판정 — 미리보기와 실행이 **같은 함수**를 쓴다.
   (예고와 실행이 갈라지면 확인창은 뜻을 잃는다 · FORCE_MODAL_TRUTH 와 같은 이유)
     null    — 확정 점유가 없다(잠글 것도 열 것도 없다)
     'lock'  — 이 부부 것으로 임시고정해 둔다(기본)
     'release' — 다른 분께 연다(관리자가 골랐거나 · 신청접수까지 내리거나 · 종료로 뺄 때) */
function _rbSlotPlan(slot, cur, targetStage, flow, bookingReset, releaseSlot) {
  if (!slot) return null;
  var ci = flow.indexOf(cur), ti = flow.indexOf(targetStage);
  var isEx = (STAGE_EXCEPTIONS.indexOf(targetStage) !== -1);
  if (!isEx && !(ti >= 0 && ci >= 0 && ti < ci)) return null;      // 앞으로 가는 이동은 자리를 건드리지 않는다
  if (releaseSlot === true || isEx || bookingReset) return 'release';
  return 'lock';
}

function adminForceStagePreview(code, targetStage, releaseSlot) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  targetStage = String(targetStage || '').trim();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (!targetStage) return { ok: false, error: '바꿀 단계를 선택해 주세요.' };
  var product = String(cust.get('상품타입') || '').trim();
  if (stageFlowFor(product).concat(STAGE_EXCEPTIONS).indexOf(targetStage) === -1) return { ok: false, error: '이 상품에 없는 단계입니다: ' + targetStage };
  var cur = String(cust.get('현재단계') || '').trim();
  var colOf = buildHeaderIndex(getCustomersSheet());
  var report = { cleared: [], kept: [], consent: [], holdCal: null };
  var _pvUpd = _clearForwardData(colOf, cust, product, targetStage, STAGE_EXCEPTIONS.indexOf(cur) !== -1, report);
  var flow = stageFlowFor(product), ti = flow.indexOf(targetStage);
  var bookConfirm = flow.indexOf(product === P.PRODUCT_SNAP ? '촬영확정' : '상담확정');
  var bookingReset = (ti >= 0 && bookConfirm >= 0 && ti < bookConfirm);   // 신청접수까지 내리면 상담 예약·캘린더 슬롯도 초기화
  /* [ROLLBACK_SLOT] 예식 자리를 어떻게 할지도 미리 말한다 — 실행과 같은 판정식으로. */
  var _pvSlot = _rbConfirmedSlot(cust);
  var _pvPlan = _rbSlotPlan(_pvSlot, cur, targetStage, flow, bookingReset, releaseSlot);
  return { ok: true, preview: true, from: cur, to: targetStage,
    cleared: report.cleared, kept: report.kept, consent: report.consent, bookingReset: bookingReset,
    holdRelease: !!report.holdCal,   // [ADM_AC3FIX] 가예약 캘린더 슬롯이 풀린다는 것도 미리 알린다(삭제는 실행할 때만)
    slot: _pvSlot ? { date: _pvSlot.date, time: _pvSlot.slot, plan: _pvPlan } : null,   // [ROLLBACK_SLOT] lock=이 부부 것으로 잠금 · release=다른 분께 열림 · null=해당 없음
    noop: (cur === targetStage && !_fsChangedCols(cust, _pvUpd).length && !bookingReset) };   // [ADM_AC3NOOP] 실행 가드와 같은 판정식(미리보기·실행 불일치 차단)
}

function adminForceStage(code, targetStage, reason, releaseSlot) {   // [ROLLBACK_SLOT] releaseSlot=true 면 예식 자리를 다른 분께 연다(기본 false = 잠근 채 둔다)
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  targetStage = String(targetStage || '').trim();
  reason = String(reason || '').trim();
  if (!reason) return { ok: false, error: '강제 변경 사유를 입력해 주세요.' };
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var product = String(cust.get('상품타입') || '').trim();
    if (stageFlowFor(product).concat(STAGE_EXCEPTIONS).indexOf(targetStage) === -1) {
      return { ok: false, error: '이 상품에 없는 단계입니다: ' + targetStage };
    }
    var cur = String(cust.get('현재단계') || '').trim();
    var flow = stageFlowFor(product), ti = flow.indexOf(targetStage), isSnap = (product === P.PRODUCT_SNAP);
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var _fsRep = { cleared: [], kept: [], consent: [], holdCal: null };   // [ADM_AC3FIX] 부작용 대상 수집(삭제는 아래 쓰기 뒤에)
    var cleared = _clearForwardData(colOf, cust, product, targetStage, STAGE_EXCEPTIONS.indexOf(cur) !== -1, _fsRep);   // 이후 단계 진행 데이터 초기화(완전 초기화) + 예외 복구 시 환불 흔적 제거
    // 상담확정 이전(신청접수)까지 내릴 땐 상담 예약도 초기화 + 캘린더 슬롯 해제
    var bookConfirm = flow.indexOf(isSnap ? '촬영확정' : '상담확정');
    var needBookingReset = (ti >= 0 && bookConfirm >= 0 && ti < bookConfirm);
    /* [ROLLBACK_SLOT] ★반드시 쓰기 «전»에 잡는다 — 계약상태가 비워진 뒤에 재면 확정 점유가 사라져 보인다. */
    var _rbSlot = _rbConfirmedSlot(cust);
    var _rbPlan = _rbSlotPlan(_rbSlot, cur, targetStage, flow, needBookingReset, releaseSlot);
    /* ★★[REFUND_MARK_TRACE 2026-08-18 rollback-fuzz 관찰 «환불완료 + 수납 확인 동시 존재» 37회]
       예외→정상 복구는 «환불완료» 표시를 지운다(안 지우면 재취소 때 환불 큐가 영영 안 뜬다 · 2141행).
       그런데 지운 사실은 어디에도 안 남았다 — 처리이력 줄은 동의기록을 일부러 뺀다(ADM_AC3NOOP).
       그 결과 복구된 고객은 «입금 확인 · 환불 흔적 없음»으로 보인다. 돈이 이미 나갔는데도.
       ★송금 자체를 되돌릴 수는 없다(사람의 계좌 이체다). 우리가 할 수 있는 건 **그 사실이
         타임라인의 그 자리에 남게** 하는 것뿐이다. 값을 지우되, 지웠다는 말과 원래 시각을 남긴다. */
    var _rfWas = '';
    try { if (_fsRep.consent.indexOf('환불완료') !== -1) _rfWas = String(_parseJsonSafe(cust.get('동의기록')).환불완료 || ''); } catch (eRf) {}
    var _fsChanged = _fsChangedCols(cust, cleared);   // [ADM_AC3NOOP] ★반드시 touchCustomer 앞에서 계산 — 쓰기 뒤에 재면 전부 '안 바뀜'이 된다
    if (cur === targetStage && !_fsChanged.length && !needBookingReset) return { ok: true, noop: true, from: cur, to: targetStage };   // [ADM_AC3NOOP] 값이 실제로 바뀌는 컬럼이 하나도 없을 때만 noop
    var upd = { '현재단계': targetStage };
    _fsChanged.forEach(function (k) { upd[k] = cleared[k]; });   // [ADM_AC3NOOP] 이미 비어 있는 컬럼은 다시 쓰지 않는다(빈 셀 수십 개 재기록 방지 · 결과는 동일)
    // ★STAGE_REVIEW 본체(기획 §3 #12): '후기'로 보낼 때는 설문상태를 '대기'로 되돌려 고객 화면에 설문 카드가 다시 뜨게 한다.
    //   _clearForwardData는 목표가 그 데이터 단계 '이상'이면 보존하므로(ti >= gi) 후기로 이동할 때 설문 그룹을 지우지 않는다 → 여기서 명시 리셋.
    //   설문응답·설문일시는 지우지 않는다(재제출 시 덮어씀 · 과거 답변 보존). 제거 금지.
    if (targetStage === '후기' && colOf['설문상태']) upd['설문상태'] = '대기';
    touchCustomer(sheet, colOf, cust.num, upd);
    // [ADM_AC3FIX] 가예약 캘린더 이벤트 해제 — 시트에서 '가예약'이 실제로 지워진 뒤에만(미리보기에서는 여기까지 오지 않는다).
    //   실패해도 단계 변경 자체는 이미 끝났으므로 막지 않는다(로그만).
    /* ★[ROLLBACK_SLOT] 다만 «계약전환»된 이벤트는 지우지 않는다 — 그건 임시고정이 아니라 **확정된 예식**이다.
       사용자 선택 (나): 지우지 않고 제목만 바꾼다. 지우면 되돌릴 수 없고, 사고 복구용 되돌림에서
       예식이 달력에서 통째로 사라진다. 아직 안 넘어간 진짜 임시고정은 종전대로 지운다. */
    if (_fsRep.holdCal && String(_fsRep.holdCal.status || '') === '계약전환') {
      _rbCalRetitle(_fsRep.holdCal.eventId, '[보류]', '단계 되돌림으로 보류 · ' + _kstYmd(new Date()) + ' · 개인코드 ' + code);
    } else if (_fsRep.holdCal && typeof _holdCalDelete === 'function') { try { _holdCalDelete(_fsRep.holdCal); } catch (eHc) { Logger.log('가예약 캘린더 해제 실패: ' + (eHc && eHc.message)); } }
    // [FORCE_CANCEL_TS 2026-07-25] 강제이동 목표가 '취소'면 Bookings.취소일시를 기록(정상 취소 경로와 동일). 없으면 환불 견적·큐 aging이 '오늘' 기준으로 매일 흔들리던 문제 차단. 멱등(이미 있으면 유지).
    /* ★[FORCE_EXIT_TS 2026-08-17 조사 실측] 노쇼·미계약도 같은 처리를 받는다.
       종전엔 '취소'만 취소일시를 찍었다. 노쇼·미계약으로 강제이동하면 그 칸이 비어
       환불 견적이 «오늘» 기준으로 계산되고(60_mypage 86 → 70_journey 794),
       고객 화면의 환불 예정 금액이 구간(D-60·30·10)을 넘길 때마다 하루아침에 떨어졌다.
       돈에 관한 숫자가 가만히 있는데 저 혼자 바뀌면, 그건 화면이 아니라 신뢰가 깎이는 일이다. */
    if (STAGE_EXCEPTIONS.indexOf(targetStage) !== -1) {
      try {
        var _bkTs = findRowByPersonalCode(code);
        if (_bkTs) {
          var _bsTs = getSheet(), _bcTs = buildHeaderIndex(_bsTs);
          /* ★[EXIT_TS_REFRESH 2026-08-17 조사 실측] «새로 종료로 들어올 때»는 기준일을 갱신한다.
             종전 멱등 가드는 «이미 값이 있으면 유지»였다 — 취소했다가 정상 복구하고 다시 취소하면
             기준일이 **첫 취소일에 굳어**, 두 번째 취소의 위약 구간(D-60·30·10)이 틀린 값으로 계산됐다.
             정상 단계에서 예외로 «전환»될 때만 다시 찍는다(예외→예외 이동은 그대로 둔다 · 같은 종료의 연장이므로). */
          var _exFresh = (STAGE_EXCEPTIONS.indexOf(cur) === -1);
          if (_bcTs['취소일시'] && (_exFresh || !String(_bkTs.get('취소일시') || '').trim())) writeCell(_bsTs, _bcTs, _bkTs.num, '취소일시', new Date());
        }
        // [REFUND_ACCT_REQ 2026-07-25] 강제취소 고객이 수령분(입금확인/입금상태=확인) 있고 환불계좌 미입력이면 고객에게 계좌 입력 요청 1회(카톡→SMS→메일 폴백). 이 블록은 취소로 '전환'될 때만 도달(같은 단계 재지정은 상단 noop). 계좌 있으면 생략.
        var _acctF = _bkTs ? String(_bkTs.get('환불계좌') || '').trim() : '';
        var _paidF = String(cust.get('입금상태') || '').trim() === '확인' || (_bkTs && String(_bkTs.get('입금확인') || '').trim() === '확인');
        if (!_acctF && _paidF) { try { notifyKakao('cust.refundAcctReq', code); } catch (eNf) {} }
      } catch (eTs) {}
    }
    // FORCE_SEAT_INV · 제작임시저장(좌석 데이터 원천)이 초기화되면 하객 좌석 공개 조회 캐시도 즉시 무효화 — 6분 톰스톤(wedchg-seat-inv 동일 패턴 · 2026-07-25 점검)
    if (_prodCols().some(function (c) { return c in cleared; })) {   // PROD_ACCESSOR
      try {
        var _svTokF = String(cust.get('좌석공유토큰') || '').trim();
        if (_svTokF) { var _svcF = CacheService.getScriptCache(); _svcF.put('seatv_inv_' + _svTokF, '1', 360); _svcF.remove('seatv_' + _svTokF); _svcF.remove('seatf_' + _svTokF); }
      } catch (eSv) {}
    }
    var bookingReset = needBookingReset ? _resetConsultBooking(code) : false;   // 예약 취소 + 캘린더 슬롯 해제
    var clearedCols = _fsChanged.filter(function (k) { return k !== '동의기록'; });   // [ADM_AC3NOOP] 처리이력엔 실제로 비워진 컬럼만(빈 컬럼 수십 개 나열 방지)

    /* ★★[ROLLBACK_NOTICE 2026-08-17 사용자 지시 "관리자에의해 되돌라갔다 뭐 문구적절하게 꾸며서
       고객마이페이지 화면에 팝업 안내가 적절하게 나왔으면좋겠어"] 되돌린 사실을 고객 쪽에 남긴다.
       종전엔 고객 화면이 «조용히» 앞 단계로 돌아갔다 — 서명한 계약이 사라진 것처럼 보이는데
       아무 설명이 없으니, 두 분 입장에선 사고를 의심할 수밖에 없다.
       ★남기는 것은 «무엇이 그대로고 무엇을 다시 하게 되는지»뿐이다. 관리자 사유는 내부 기록이라 넣지 않는다.
       ★컬럼 이름을 그대로 주지 않는다 — 고객이 읽을 말로 바꿔서 담는다(계약서명일시 같은 말이 새면 안 된다). */
    var _rbWord = { '계약상태': '계약서 서명', '계약서명일시': '계약서 서명', '계약서발송일시': '계약서 서명',
      '계약총액': '계약 내용', '예식일': '예식 일정', '시착동의상태': '드레스 시착 동의', '시착동의일시': '드레스 시착 동의',
      '결과물상태': '사진 고르기', '선택사진': '사진 고르기', '선택수': '사진 고르기', '컨펌일시': '사진 고르기',
      '원본링크': '결과물 확인', '보정본폴더': '결과물 확인', '영상링크': '결과물 확인',
      '설문상태': '후기', '설문응답': '후기' };
    var _rbRedo = [];
    clearedCols.forEach(function (c) {
      var w = _rbWord[c] || (c.indexOf('제작_') === 0 ? '예식 준비(청첩장·식순·좌석)' : '');
      if (w && _rbRedo.indexOf(w) === -1) _rbRedo.push(w);
    });
    if (bookingReset && _rbRedo.indexOf('상담 일정 선택') === -1) _rbRedo.unshift('상담 일정 선택');
    /* 보존된 것 — 확인된 수납은 강제변경으로 지워지지 않는다(ROLLBACK_KEEP_PAID). 이것이 안심의 «근거»다. */
    var _rbKeep = [];
    if (String(cust.get('입금상태') || '').trim() === '확인') _rbKeep.push('계약금');
    if (String(cust.get('중도금상태') || '').trim() === '확인') _rbKeep.push('중도금');
    if (String(cust.get('잔금상태') || '').trim() === '확인') _rbKeep.push('잔금');
    /* ★upd 는 위(2196)에서 이미 시트에 쓰였다 — 여기서 upd 를 더 채워도 **아무 일도 일어나지 않는다.**
       (첫 판에서 실제로 그렇게 썼다가 «조용한 실패»를 만들 뻔했다. 내가 이번에 없애려던 바로 그 모양.)
       그래서 별도 쓰기로 남긴다. 읽을 원본도 upd 에 방금 담긴 값이 우선이다 —
       cust 는 쓰기 전에 읽은 스냅샷이라 _clearForwardData 가 지운 키가 되살아난다. */
    /* ★뒤로 간 이동에만 남긴다 — 앞으로 가는 복구(계약완료→입금완료)에도 기록하면
       now===was 가 되어 «되돌아가 있어요» 팝업이 복구 직후에 뜬다(조사 지적). 그건 거짓말이다. */
    var _rbFlow = stageFlowFor(product), _rbCur = _rbFlow.indexOf(cur), _rbTo = _rbFlow.indexOf(targetStage);
    var _rbBack = (_rbCur === -1) || (_rbTo !== -1 && _rbTo < _rbCur);   // 예외에서 나오는 복구(cur=-1)도 «설명이 필요한 이동»이다
    /* ★«전진이면 건너뛴다»를 throw 로 하지 않는다 — 그러면 정상 흐름이 catch 로 떨어져
       **앞으로 가는 복구를 할 때마다** «기록 실패» 로그가 쌓인다. 로그가 거짓말하면 진짜 실패를 못 찾는다. */
    if (_rbBack) {
      try {
        var _rbRec = _parseJsonSafe(upd['동의기록'] != null ? upd['동의기록'] : cust.get('동의기록'));
        _rbRec.단계되돌림 = { at: fmtKST(new Date()), to: targetStage, redo: _rbRedo, keep: _rbKeep };
        touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(_rbRec) });
      } catch (eRb) { try { Logger.log('ROLLBACK_NOTICE 기록 실패: ' + (eRb && eRb.message)); } catch (e2) {} }
    }
    /* ★★[ROLLBACK_SLOT] 예식 «자리» 처리 — 시트 쓰기가 끝난 뒤에 한 번.
       lock    : 확정 점유를 임시고정(승인·14일)으로 되돌려 이 부부 것으로 잠근다 + 캘린더 [가예약]
       release : 자리를 놓아 준다(관리자 선택 · 신청접수까지 내림 · 종료) + 캘린더 [보류](지우지 않는다)
       ★동의기록은 위 ROLLBACK_NOTICE 와 같은 이유로 «다시 읽어» 쓴다 — upd 를 고쳐도 이미 쓴 뒤라 안 먹는다. */
    var _rbSlotWord = '';
    if (_rbPlan === 'lock' || _rbPlan === 'release') {
      try {
        var _slRec = _parseJsonSafe(cust.get('동의기록'));
        if (_rbPlan === 'lock') {
          var _slExp = new Date(); _slExp.setDate(_slExp.getDate() + 14);   // 임시고정과 같은 14일 — 무기한은 아무도 모르게 자리를 묶는다
          _slRec.가예약 = { date: _rbSlot.date, slot: _rbSlot.slot, status: '승인',
            requestedAt: fmtKST(new Date()), grantedAt: fmtKST(new Date()), expires: _kstYmd(_slExp),
            source: '단계되돌림', eventId: _rbSlot.eventId || '' };
          touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(_slRec) });
          _rbCalRetitle(_rbSlot.eventId, '[가예약]', '단계 되돌림으로 임시고정 전환 · ~' + _kstYmd(_slExp) + ' · 개인코드 ' + code);
          _rbSlotWord = ' · 예식 자리 잠금 유지(' + _rbSlot.date + ' ' + _rbSlot.slot + ' · 임시고정 ~' + _kstYmd(_slExp) + ')';
        } else {
          if (_slRec.가예약) { delete _slRec.가예약; touchCustomer(sheet, colOf, cust.num, { '동의기록': Object.keys(_slRec).length ? JSON.stringify(_slRec) : '' }); }
          _rbCalRetitle(_rbSlot.eventId, '[보류]', '단계 되돌림으로 자리 개방 · ' + _kstYmd(new Date()) + ' · 개인코드 ' + code);
          _rbSlotWord = ' · ★예식 자리 개방(' + _rbSlot.date + ' ' + _rbSlot.slot + ' · 다른 분이 예약할 수 있음)';
        }
      } catch (eSl) { try { Logger.log('ROLLBACK_SLOT 처리 실패: ' + (eSl && eSl.message)); } catch (e4) {} }
    }
    _recordHandler(code, '★강제변경 ' + (cur || '없음') + '→' + targetStage
      + (clearedCols.length ? (' · 이후 데이터 초기화(' + clearedCols.join('·') + ')') : '')
      + (bookingReset ? ' · 상담예약 초기화(캘린더 해제)' : '')
      + (_rfWas ? (' · [REFUND_MARK_TRACE] 환불완료 표시 해제(원래 ' + _rfWas + ') · 실제 송금 여부는 위 «환불 송금 완료» 기록으로 확인') : '')
      + _rbSlotWord
      + ' · 사유: ' + reason);
    /* ★★[FORCE_WARN_TRUTH 2026-08-17 사용자 고립 사례] 지운 것이 없으면 «지웠다»고 말하지 않는다.
       종전엔 결과 문구가 무조건 «이후 단계 진행 데이터를 초기화했습니다» 였다. 앞으로 가는 이동
       (계약완료→입금완료 같은 복구)은 실제로 **아무것도 안 지운다**(cleared: []). 그런데도 같은 경고가 떠서,
       고립을 푸는 유일한 손잡이를 «누르면 데이터가 날아간다»로 읽게 만들었다 — 실제로 그래서 못 눌렀다.
       ★거짓 경고는 없는 경고보다 나쁘다. 안 누르게 만들기 때문이다. 지운 것이 있을 때만 그렇게 말한다.
       ★`cleared` 는 _fsChanged 로 «실제로 값이 바뀐 컬럼»만 담긴다 — 빈 칸을 비운 것은 여기 안 들어온다. */
    var _fwWarn = (clearedCols.length || bookingReset)
      ? ((bookingReset ? '이후 단계 진행 데이터와 상담 예약(캘린더 포함)을' : '이후 단계 진행 데이터를') + ' 초기화했습니다.')   // [ADM_JOSA] 조사를 분기 안으로 — 밖에 붙여 쓰면 앞 낱말이 바뀔 때 틀린다(끝 음절 '함'은 ㅁ받침이라 '을')
      : '초기화된 데이터는 없어요. 단계만 바꿨어요.';
    return { ok: true, from: cur, to: targetStage, cleared: clearedCols, bookingReset: bookingReset, warning: _fwWarn,
      slot: _rbSlot ? { date: _rbSlot.date, time: _rbSlot.slot, plan: _rbPlan } : null };   // [ROLLBACK_SLOT] 자리를 어떻게 했는지 화면에 그대로 돌려준다
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 6. 시착 동의 닫기 (실수 복구) — 동의요청 & 미서명만 → 대기
function adminCloseFitting(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var fit = String(cust.get('시착동의상태') || '').trim();
    if (fit === '대기' || fit === '') return { ok: true, already: true };
    if (fit === '동의완료' || String(cust.get('시착동의일시') || '').trim()) return { ok: false, error: '이미 서명된 시착 동의는 닫을 수 없습니다.' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    touchCustomer(sheet, colOf, cust.num, { '시착동의상태': '대기' });
    _recordHandler(code, '시착 동의 닫기(요청 취소)');
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [임시고정] 예식일 가예약 승인 — 요청 → 승인(점유 확정·14일 후 자동해제). 승인 직전 슬롯 재확인(더블부킹 0).
function adminGrantWeddingHold(code) {
  _requireAdmin();
  /* ★★[HOLD_LOCK 2026-08-26 더블부킹 점검 S4] 이 함수와 아래 거절 함수만 락 밖에 있었다.
     승인이 동의기록 스냅샷을 읽고(아래) 다시 통째로 쓰는 사이에 고객 서명(handleSignContract · 같은
     ScriptLock 계열)이 끼면, 서명이 남긴 동의기록.계약(손글씨 저장 여부·효력 해시·문서 버전)이
     **스냅샷 덮어쓰기로 소멸**한다 — 계약상태 컬럼만 서명완료로 남아 분쟁 시 서명 증적이 없다.
     다른 관리자 함수는 전부 _adminLock() 을 쓴다. 이 락을 빼지 말 것. */
  var _hl = _adminLock(); if (!_hl) return { ok: false, error: _LOCK_BUSY };
  try {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (STAGE_EXCEPTIONS.indexOf(String(cust.get('현재단계') || '').trim()) !== -1) return { ok: false, error: '진행이 종료된 고객이에요. (노쇼·미계약 잔존 요청은 거절로 정리해 주세요)' };
  var rec = _parseJsonSafe(cust.get('동의기록')), hold = rec.가예약;
  if (!hold || !hold.date || !hold.slot) return { ok: false, error: '임시고정 요청이 없습니다.' };
  if (hold.status === '승인') return { ok: true, already: true };
  if (_weddingSlotTaken(sheet, colOf, hold.date, hold.slot, code)) return { ok: false, error: '그 예식 시간이 이미 다른 예약으로 마감됐어요.' };
  var exp = new Date(); exp.setDate(exp.getDate() + 14);
  hold.status = '승인'; hold.grantedAt = fmtKST(new Date()); hold.expires = _kstYmd(exp);
  if (typeof _holdCalCreate === 'function') _holdCalCreate(cust, hold);   // 구글 캘린더 종일 이벤트(가시화 · eventId는 가예약에 저장)
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
  _recordHandler(code, '예식일 임시고정 승인 · ' + hold.date + ' ' + hold.slot);
  notifyKakao('cust.holdGranted', code, { date: hold.date, slot: hold.slot });
  return { ok: true };
  } finally { try { _hl.releaseLock(); } catch (e) {} }   // [HOLD_LOCK]
}
// [임시고정] 예식일 가예약 거절/해제 — 동의기록.가예약 제거 + 고객 안내.
function adminDeclineWeddingHold(code) {
  _requireAdmin();
  var _hl = _adminLock(); if (!_hl) return { ok: false, error: _LOCK_BUSY };   // [HOLD_LOCK] 승인과 같은 이유 — 스냅샷 덮어쓰기로 서명 기록이 소멸하는 것 방지
  try {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (!rec.가예약) return { ok: true, already: true };
  var _d = rec.가예약.date, _s = rec.가예약.slot;
  if (typeof _holdCalDelete === 'function') _holdCalDelete(rec.가예약);
  delete rec.가예약;
  touchCustomer(sheet, colOf, cust.num, { '동의기록': Object.keys(rec).length ? JSON.stringify(rec) : '' });
  _recordHandler(code, '예식일 임시고정 거절/해제 · ' + (_d || '') + ' ' + (_s || ''));
  notifyKakao('cust.holdReleased', code, { date: _d, slot: _s });
  return { ok: true };
  } finally { try { _hl.releaseLock(); } catch (e) {} }   // [HOLD_LOCK]
}

// 7. ★노쇼 처리 — 상담확정/촬영확정 → 현재단계=노쇼 (자체 멱등·직접 쓰기·캘린더/메일/상담예약 안 건드림)
function adminMarkNoshow(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    if (stage === '노쇼') return { ok: true, already: true, stage: stage, archived: true };   // ★EX 멱등(가드 함정 회피)
    if (['상담확정', '촬영확정', '시착'].indexOf(stage) === -1) return { ok: false, error: '상담/촬영 확정·시착 상태에서만 노쇼 처리할 수 있습니다. (현재: ' + (stage || '없음') + ')' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var _nRec = _parseJsonSafe(cust.get('동의기록'));
    var _nUpd = { '현재단계': '노쇼' };
    if (_nRec.가예약) { if (typeof _holdCalDelete === 'function') _holdCalDelete(_nRec.가예약); delete _nRec.가예약; _nUpd['동의기록'] = Object.keys(_nRec).length ? JSON.stringify(_nRec) : ''; }   // 가예약 정리(취소와 일관 · 잔존 슬롯/배너 방지)
    touchCustomer(sheet, colOf, cust.num, _nUpd);
    _recordHandler(code, '노쇼 처리');
    return { ok: true, stage: '노쇼', archived: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 8. ★미계약 처리 — 계약 전 단계(서명 전) 포기 → 현재단계=미계약 (자체 멱등·직접 쓰기)
function adminMarkUncontracted(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    if (stage === '미계약') return { ok: true, already: true, stage: stage, archived: true };   // ★EX 멱등
    var flow = stageFlowFor(String(cust.get('상품타입') || '').trim());
    var ci = flow.indexOf('계약완료'), si = flow.indexOf(stage);
    if (si < 0 || ci < 0 || si >= ci) return { ok: false, error: '계약 전 단계에서만 미계약 처리할 수 있습니다. (현재: ' + (stage || '없음') + ')' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var _uRec = _parseJsonSafe(cust.get('동의기록'));
    var _uUpd = { '현재단계': '미계약' };
    if (_uRec.가예약) { if (typeof _holdCalDelete === 'function') _holdCalDelete(_uRec.가예약); delete _uRec.가예약; _uUpd['동의기록'] = Object.keys(_uRec).length ? JSON.stringify(_uRec) : ''; }   // 가예약 정리(취소와 일관 · 잔존 슬롯/배너 방지)
    touchCustomer(sheet, colOf, cust.num, _uUpd);
    _recordHandler(code, '미계약 처리');
    return { ok: true, stage: '미계약', archived: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 취소 환불 송금 완료 처리 — 동의기록.환불완료=시각 기록 → 환불 송금 큐에서 사라짐. (멱등)
/* [ADM_AC2] 환불 완료 취소 — '송금 완료 표시'를 되돌리는 것이지 송금 자체를 되돌리는 게 아니다.
     표시를 지우면 그 고객이 다시 환불 송금 큐에 떠서, 잘못 눌러 큐에서 사라진 건을 되찾을 수 있다.
     금전 표시라 사유 필수 · 멱등 · 처리이력은 AC1과 같은 규칙. */
function adminUndoRefunded(code, reason) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  reason = String(reason || '').trim();
  if (!reason) return { ok: false, error: '되돌리는 사유를 입력해 주세요. 금전 기록이라 처리이력에 남겨요.' };
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (!rec.환불완료) return { ok: true, already: true };   // 멱등 — 두 번 눌러도 안전
  var at = String(rec.환불완료 || '');
  delete rec.환불완료;
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
  _recordHandler(code, '환불 완료 표시 취소(완료 표시 ' + at + ') · 사유: ' + reason);
  return { ok: true, was: at };
}

function adminMarkRefunded(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (rec.환불완료) return { ok: true, already: true };
  rec.환불완료 = fmtKST(new Date());
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
  _recordHandler(code, '환불 송금 완료');
  return { ok: true };
}
