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
    Logger.log('✅ 계정 갱신: ' + id + ' (' + name + ')');
    return '계정 갱신됨: ' + id + ' (' + name + ')';
  }
  var rowData = ADMIN_HEADERS.map(function (h) {
    return h === '아이디' ? id : h === '비번해시' ? hash : h === '이름' ? name : h === '역할' ? role : h === '등록일' ? fmtKST(new Date()) : '';
  });
  sh.appendRow(rowData);
  Logger.log('✅ 계정 등록: ' + id + ' (' + name + ')');
  return '계정 등록됨: ' + id + ' (' + name + ')';
}

// 로그인 — 아이디·비번 검증 → 토큰 발급. (인증 자체이므로 토큰 불필요 · 디스패처 밖에서 직접 호출)
function adminLogin(id, pw) {
  id = String(id || '').trim();
  if (!id || !pw) return { ok: false, error: '아이디와 비밀번호를 입력해 주세요.' };
  var r = _findAdminRow('아이디', id, true);
  if (!r || !verifyPassword(pw, r.get('비번해시'))) return { ok: false, error: '아이디 또는 비밀번호가 올바르지 않습니다.' };
  var sh = _adminSheet(), colOf = buildHeaderIndex(sh);
  var token = makeToken();
  var expiry = fmtKST(new Date(Date.now() + (P.TOKEN_VALID_DAYS || 14) * 86400 * 1000));
  sh.getRange(r.num, colOf['로그인토큰']).setValue(token);
  sh.getRange(r.num, colOf['토큰만료']).setValue(expiry);
  return { ok: true, token: token, name: String(r.get('이름') || id) };
}

function adminLogout(token) {
  var r = token ? _findAdminRow('로그인토큰', String(token).trim(), false) : null;
  if (r) { var sh = _adminSheet(), colOf = buildHeaderIndex(sh); sh.getRange(r.num, colOf['로그인토큰']).setValue(''); sh.getRange(r.num, colOf['토큰만료']).setValue(''); }
  return { ok: true };
}

// 토큰 → 관리자 {ok, id, name, role} / {ok:false}
function _resolveAdmin(token) {
  token = String(token || '').trim();
  if (!token) return { ok: false };
  var r = _findAdminRow('로그인토큰', token, false);
  if (!r) return { ok: false };
  if (tokenExpired(r.get('토큰만료'))) return { ok: false, reason: 'expired' };
  return { ok: true, id: String(r.get('아이디') || ''), name: String(r.get('이름') || ''), role: String(r.get('역할') || '') };
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
      adminGetSignature: adminGetSignature, adminSendContract: adminSendContract, adminConfirmPayment: adminConfirmPayment, adminConfirmBalance: adminConfirmBalance, adminConfirmMid: adminConfirmMid, adminOpenFittingConsent: adminOpenFittingConsent,
      adminMarkConsultDone: adminMarkConsultDone, adminSetResultLinks: adminSetResultLinks, adminMarkEventDone: adminMarkEventDone, adminMarkDelivered: adminMarkDelivered,
      adminConfirmExtra: adminConfirmExtra, adminStartRetouch: adminStartRetouch, adminGrantWeddingHold: adminGrantWeddingHold, adminDeclineWeddingHold: adminDeclineWeddingHold, adminSkipSurvey: adminSkipSurvey,
      adminForceStage: adminForceStage, adminCloseFitting: adminCloseFitting, adminMarkNoshow: adminMarkNoshow, adminMarkUncontracted: adminMarkUncontracted,
      adminIssueCashReceipt: adminIssueCashReceipt, adminUndoCashReceipt: adminUndoCashReceipt, adminMarkRefunded: adminMarkRefunded
    };
    var f = FNS[fn];
    if (!f) return { ok: false, error: '알 수 없는 요청: ' + fn };
    return f.apply(null, args);
  } finally { _AUTHED = false; }
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

// 임시고정 표시용 — '2026.6.11(목) 오후 12:20'
function _holdWhenLabel(ymd, slot) {
  slot = String(slot || '').trim();
  var lab = ({ '09:00': '오전', '12:20': '오후', '15:40': '늦은 오후' })[slot] || '';
  var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return (String(ymd || '') + ' ' + slot).trim();
  var w = ['일', '월', '화', '수', '목', '금', '토'][new Date(+m[1], +m[2] - 1, +m[3]).getDay()];
  return m[1] + '.' + (+m[2]) + '.' + (+m[3]) + '(' + w + ') ' + (lab ? lab + ' ' : '') + slot;
}

// 현황 줄 하위상태 1줄 (B2.2) — 단계+상품+보조상태
function _subStatusFor(stage, isSnap, x) {
  switch (stage) {
    case '신청접수': return (x.booking === ST.PICKED) ? '승인 대기' : '시간 선택 대기';
    case '상담확정': return x.consultPast ? ('상담일 지남' + (x.consultDate ? ' · ' + x.consultDate : '')) : ('상담 예정' + _dueWhen(x.cdday, x.consultDate));
    case '촬영확정': return x.consultPast ? ('촬영일 지남' + (x.consultDate ? ' · ' + x.consultDate : '')) : ('촬영 예정' + _dueWhen(x.cdday, x.consultDate));
    case '시착': return (x.시착 === '동의완료') ? '시착 완료 · 상담완료 대기' : '고객 시착 서명 대기';
    case '상담완료': return (!x.계약 || x.계약 === '미발송') ? (x.hasReq ? '계약서 발송 대기' : '고객 계약정보 입력 대기') : '계약 진행 중';
    case '계약완료': return (x.계약 === '서명완료') ? '입금 대기' : '계약 서명 대기';
    case '입금완료': return isSnap ? '촬영 준비' : '제작 시작 대기';
    case '제작중': return (x.invStatus === '완료') ? '청첩장 발행됨' : (x.invStatus === '진행중' ? '청첩장 만드는 중' : '제작 시작 전');
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
    if (surveyAgg.recent.length < 40) surveyAgg.recent.push({ code: code, names: names, product: product, overall: String(ans.overall || ''), recommend: String(ans.recommend || ''), review: String(parsed.review || ''), reviewPublic: String(parsed.reviewPublic || ''), date: String(cget(rv, '설문일시') || '') });
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
    if (STAGE_EXCEPTIONS.indexOf(stage) !== -1 || (stage === '결과물전달' && surveyClosed)) {
      // 아카이브(예외/후기 마감)라도 추가 보정 입금 신호는 운영자 확인 필요 → 큐 노출
      if (stage === '결과물전달' && String(cget(rv, '추가보정상태') || '').trim() === '결제대기') {
        pushQ({ code: code, names: names, product: product, kind: '추가보정확인', sub: '추가 보정 입금 확인 (전달 후)', badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 8, _wait: createdYmd });
      }
      // 취소 환불 송금 대기 — 환불계좌 입력됨 & 아직 환불완료 처리 안 함(카톡/메일 끊겨도 놓치지 않게 큐로). 환불 완료 처리하면 사라짐.
      if (stage === '취소') {
        var _rbk = bookMap[code], _racct = _rbk ? String(bget(_rbk, '환불계좌') || '').trim() : '';
        var _rdone = !!_parseJsonSafe(cget(rv, '동의기록')).환불완료;
        if (_racct && !_rdone) {
          var _rcd = _rbk ? _ymdOf(bget(_rbk, '취소일시')) : '';
          var _rdays = _dayDiff(today, _rcd);
          pushQ({ code: code, names: names, product: product, kind: '환불송금', sub: '예약금 환불 송금 필요',
            badge: (_rdays != null && _rdays >= 1) ? { level: 'red', text: '취소 ' + _rdays + '일째' } : { level: 'yellow', text: '환불 대기' },
            _urgent: (_rdays != null && _rdays >= 1), _loss: 2, _stage: 9, _wait: createdYmd });
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
    var draft = _parseJsonSafe(cget(rv, '제작임시저장'));
    var invStatus = (draft.tracks && draft.tracks.invitation) || '시작전';
    var wedYmd = _ymdOf(draft.base && draft.base.weddingDate) || _ymdOf(bk ? bget(bk, '예식일자') : '');
    var consultYmd = _ymdOf(bk ? bget(bk, '선택날짜') : '');
    var bookingStatus = bk ? String(bget(bk, '상태') || '').trim() : '';
    var bookingLocked = (bookingStatus === ST.APPROVED || bookingStatus === ST.CONFIRMED);   // 예약이 실제 승인/확정됨. 현재단계(최고수위)와 별개 — 미승인(신청·시간선택·변경제안) 예약엔 시착 안내 안 띄움
    var consultPast = consultYmd ? (_dayDiff(today, consultYmd) > 0) : false;
    var consultDue = consultYmd ? (_dayDiff(today, consultYmd) >= 0) : false;   // 상담 당일부터(오늘 포함) — 시착 동의서 보낼 시점
    var consultMD = (function(){ var m=String((bk ? normalizeDateKey(bget(bk,'선택날짜')) : '')||'').match(/^(\d{4})-(\d{2})-(\d{2})$/); return m ? ((+m[2])+'/'+(+m[3])) : ''; })();   // 예정일 짧은 표기(M/D) — 현황 한눈에

    // 현금영수증 발행 — 입금 '확인'된 마일스톤 중 미발행분(의무발행업종·미발급 20% 가산세 방지). 발행(승인번호 기록) 전까지 단계와 무관하게 계속 노출(결과물전달까지). 취소·노쇼·미계약(STAGE_EXCEPTIONS)은 위에서 이미 return.
    var _crIssued = _parseJsonSafe(cget(rv, '동의기록')).영수증발행 || {};
    var _crAmt = _journeyAmounts(cget(rv, '계약총액'), product);
    [['입금상태', '예약금', isSnap ? (_crAmt ? _crAmt['계약금'] : 0) : PAYMENT.예약금],
     ['중도금상태', '중도금', _crAmt ? _crAmt['중도금'] : 0],
     ['잔금상태', '잔금', _crAmt ? _crAmt['잔금'] : 0]].forEach(function (cr) {
      if (cr[0] === '중도금상태' && isSnap) return;   // 스냅은 중도금 없음
      if (String(cget(rv, cr[0]) || '').trim() !== '확인' || _crIssued[cr[1]]) return;
      var _won = cr[2] ? (' · ' + Math.round(cr[2]).toLocaleString() + '원') : '';
      pushQ({ code: code, names: names, product: product, kind: '현금영수증발행', sub: cr[1] + ' 현금영수증 발행' + _won,
        badge: { level: 'yellow', text: '발행 대기' }, _urgent: false, _stage: 5, _wait: createdYmd });
    });
    // 결과물 전달 후 — 후기(설문) 대기(미마감). 아카이브 보류 → 결과물 관리 보드에 '후기 대기'로 노출, 진행 현황엔 미포함.
    if (stage === '결과물전달') {
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
    if (!isSnap && stage === '시착' && bookingLocked && 시착 === '동의완료' && consultDue) {
      pushQ({ code: code, names: names, product: product, kind: '상담완료', sub: '시착 완료 · 상담완료 처리',
        badge: null, _urgent: false, _stage: 2, _wait: createdYmd });
    }
    // 계약서 발송 — 시그(상담완료&시착동의완료&고객 계약요청완료) / 스냅(촬영확정) — & 계약 미발송
    var hasReq = isSnap ? true : (!!_parseJsonSafe(cget(rv, '동의기록')).계약정보 || /^\d{4}-\d{2}-\d{2}$/.test(_ymdOf(cget(rv, '예식일'))));   // 고객이 계약정보(예식일·인적사항) 입력/요청했나
    var canSend = isSnap ? (stage === '촬영확정') : (stage === '상담완료' && 시착 === '동의완료' && hasReq);
    if (canSend && bookingLocked && (!계약 || 계약 === '미발송')) {   // bookingLocked: 미승인 새 예약(현재단계만 최고수위로 남은 경우) 조기 노출 차단
      pushQ({ code: code, names: names, product: product, kind: '계약발송', sub: '계약서 발송 대기',
        badge: null, _urgent: false, _stage: 3, _wait: createdYmd });
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
    if (입금 === '완료신호') {
      var sigDays = _dayDiff(today, _ymdOf(cget(rv, '입금완료신호')));
      pushQ({ code: code, names: names, product: product, kind: '입금확인', sub: '입금 확인',
        badge: (sigDays != null && sigDays >= 1) ? { level: 'yellow', text: '입금 신호 ' + sigDays + '일째' } : null,
        _urgent: false, _stage: 4, _wait: createdYmd });
    }
    // 중도금 확인 — 중도금상태=완료신호 (계약 후 첫 실결제, D-30 구간)
    if (String(cget(rv, '중도금상태') || '').trim() === '완료신호') {
      pushQ({ code: code, names: names, product: product, kind: '중도금확인', sub: '중도금 입금 확인',
        badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 4, _wait: createdYmd });
    }
    // 잔금 확인 — 잔금상태=완료신호 (단계 무관, 제작~예식 구간에서 발생)
    if (잔금 === '완료신호') {
      pushQ({ code: code, names: names, product: product, kind: '잔금확인', sub: '잔금 입금 확인',
        badge: { level: 'yellow', text: '입금 신호' }, _urgent: false, _stage: 4, _wait: createdYmd });
    }
    // 예식/촬영 완료 — 시그(제작중&예식일 지남) / 스냅(입금완료&촬영일 지남)
    var eventStage = isSnap ? '입금완료' : '제작중';
    var dplus = (stage === eventStage && wedYmd) ? _dayDiff(today, wedYmd) : null;
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
      sub: _subStatusFor(stage, isSnap, { booking: bookingStatus, consultPast: consultPast, consultDate: consultMD, cdday: (consultYmd ? _dayDiff(consultYmd, today) : null), 시착: 시착, 계약: 계약, hasReq: hasReq, 입금: 입금, 원본: 원본, invStatus: invStatus, 결과물: 결과물, 선택수: 선택수, 추가보정: 추가보정 }),
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
    if (meta && (STAGE_EXCEPTIONS.indexOf(meta.stage) !== -1 || meta.stage === '결과물전달')) return;  // 끝난 고객 booking 제외
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
      if (stage === '결과물전달') return;  // 아카이브
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
    survey: surveyAgg
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
  var draft = _parseJsonSafe(cust.get('제작임시저장'));
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
  d.hold = _rec.가예약 || null;   // 예식일 임시고정(요청/승인) — 관리자 승인/거절용
  if (d.hold && d.hold.status === '승인' && d.hold.expires && _ymdNum(_kstYmd(new Date())) > _ymdNum(d.hold.expires)) d.hold.expired = true;   // 14일 만료(점유 자동해제됨) — UI 표기용
  d.refundDone = String(_rec.환불완료 || '');   // 취소 환불 송금 완료 시각(있으면 완료). 환불계좌는 d.consult.refund

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
    입금자명: String(cust.get('입금자명') || '')
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
  var ENDED = STAGE_EXCEPTIONS.concat(['결과물전달']);   // 미계약·취소·노쇼·결과물전달
  var q = query.replace(/[\s\-]/g, '');
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var rv = vals[i];
    var stage = get(rv, '현재단계').trim();
    if (ENDED.indexOf(stage) === -1) continue;            // 끝난 고객만
    if (stage === '결과물전달') { var _ss = get(rv, '설문상태').trim(); if (_ss !== '완료' && _ss !== '건너뜀') continue; }   // 후기 대기는 아직 진행 중(보드) → 아카이브 제외
    var endType = (stage === '결과물전달') ? '완료' : '중단';   // 완료(전달·그린) / 중단(취소·노쇼·미계약·레드)
    if (filter === 'done' && endType !== '완료') continue;
    if (filter === 'stopped' && endType !== '중단') continue;
    var code = get(rv, '개인코드').trim();
    var g = get(rv, '신랑이름'), b = get(rv, '신부이름'), phone = get(rv, '연락처');
    if (query) {
      var hay = (code + ' ' + g + ' ' + b).toLowerCase();
      var phoneN = phone.replace(/[\s\-]/g, '');
      if (hay.indexOf(query) === -1 && !(q && phoneN.indexOf(q) !== -1)) continue;
    }
    var draft = _parseJsonSafe(get(rv, '제작임시저장'));
    out.push({
      code: code, names: _names(g, b), product: get(rv, '상품타입').trim(),
      stage: stage, endType: endType, endTypeLabel: stage,
      wedYmd: _ymdOf(draft.base && draft.base.weddingDate),
      modified: get(rv, '최종수정').trim()
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
// total = 계약총액(주말 2800000 / 평일 2100000 등, 공휴일=주말단가). 입금화면의 계약금·잔금 산출 기준.
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
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stage = String(cust.get('현재단계') || '').trim();
  if (['취소', '노쇼', '미계약'].indexOf(stage) !== -1) {
    return { ok: false, error: '진행할 수 없는 상태입니다. (현재단계: ' + stage + ')' };
  }
  if (String(cust.get('계약상태') || '').trim() === '서명완료') {   // 이미 서명된 계약 — 재발송 시 서명상태 다운그레이드(고객 결제카드 소실) 방지
    return { ok: false, error: '이미 서명이 완료된 계약입니다. 다시 보내려면 강제 단계 변경으로 초기화 후 진행해 주세요.' };
  }
  if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') {   // 스냅: 예약 미승인(신청·시간선택·변경제안)이면 차단 — 현재단계가 최고수위로만 남은 경우 조기 발송 방지
    var _bk = findRowByPersonalCode(code), _bs = _bk ? String(_bk.get('상태') || '').trim() : '';
    if (_bs === ST.APPLIED || _bs === ST.PICKED || _bs === ST.PROPOSED) {
      return { ok: false, error: '촬영 예약을 먼저 승인/확정한 뒤에 계약서를 보낼 수 있어요. (예약 상태: ' + _bs + ')' };
    }
  } else {   // 시그니처: 고객이 계약 정보(예식일·생년월일·주소)를 입력/요청해야 발송 — 빈 계약서·예식일 미설정(중도금·잔금 D-day 깨짐) 방지
    var _rec = _parseJsonSafe(cust.get('동의기록'));
    if (!_rec.계약정보 && !/^\d{4}-\d{2}-\d{2}$/.test(String(cust.get('예식일') || '').trim())) {
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
  var wed = String(weddingYmd || '').trim();                  // 계약 시점에 예식일 확정 → 돈 계산(중도금·잔금 D-day) 단일 기준
  var wT = String(weddingTime || '').trim();                  // 예식 슬롯(관리자 픽스) — 예식일과 함께 잠금
  if (wT && WEDDING_SLOT.SLOTS.indexOf(wT) !== -1 && /^\d{4}-\d{2}-\d{2}$/.test(wed) && _weddingSlotTaken(sheet, colOf, wed, wT, code)) {   // 발송 시점에 슬롯 충돌 차단(서명 때 늦은 거절 방지)
    return { ok: false, error: '그 예식 시간(' + wed + ' ' + wT + ')은 이미 다른 예약으로 마감됐어요. 다른 슬롯으로 보내 주세요.' };
  }
  var upd = { '계약상태': '발송', '계약서발송일시': now, '계약서링크': linkStr };
  if (amt > 0) upd['계약총액'] = amt;
  if (/^\d{4}-\d{2}-\d{2}$/.test(wed)) upd['예식일'] = wed;    // 톱레벨 예식일 = 잔금 D-7·중도금 D-30 산출 기준(계약에서 잠금)
  if (wT && WEDDING_SLOT.SLOTS.indexOf(wT) !== -1) {          // 예식 슬롯 반영(고객 요청분 확정 또는 관리자 변경)
    var _rec = _parseJsonSafe(cust.get('동의기록')); _rec.계약정보 = _rec.계약정보 || {};
    _rec.계약정보.weddingTime = wT; if (/^\d{4}-\d{2}-\d{2}$/.test(wed)) _rec.계약정보.weddingDate = wed;
    upd['동의기록'] = JSON.stringify(_rec);
  }
  touchCustomer(sheet, colOf, cust.num, upd);
  _recordHandler(code, '계약서 발송' + (amt > 0 ? (' · 총액 ' + amt + '원') : '') + (wed ? (' · 예식일 ' + wed + (wT ? (' ' + wT) : '')) : '') + ' (링크)');
  notifyKakao('cust.contractArrived', code);   // 고객: 계약서 도착 — 72시간 내 서명(카톡)
  try {   // 고객 알림 — 계약서 도착(72h 서명). 메일 실패해도 발송 자체는 성공(베스트에포트).
    var _cem = String(cust.get('이메일') || '').trim();
    if (CONFIG.SEND_CONTRACT_MAIL && _cem) {   // OFF 기본 — 마이페이지+카톡 대체. (복구: SEND_CONTRACT_MAIL=true)
      GmailApp.sendEmail(_cem, '[Moment Edit] 계약서가 도착했어요 · 72시간 내 서명', '', {
        name: 'Moment Edit',
        htmlBody: '<div style="font-family:sans-serif;line-height:1.7;color:#3a2f25">'
          + '<p>안녕하세요, 모먼트에디트입니다.</p>'
          + '<p>요청하신 <b>계약서가 마이페이지에 도착</b>했어요. 내용을 확인하시고 <b>72시간 안에</b> 서명해 주세요.</p>'
          + '<p style="margin:18px 0"><a href="https://momentedit.kr/mypage.html" style="background:#6B2A24;color:#fff;padding:11px 20px;border-radius:6px;text-decoration:none">마이페이지에서 계약서 보기</a></p>'
          + '<p style="color:#8a7f70;font-size:13px">기한이 지나면 계약서는 자동 파기되며, 디렉터에게 재발송을 요청하실 수 있어요.</p></div>'
      });
    }
  } catch (e) { Logger.log('계약서 발송 메일 실패: ' + (e && e.message)); }
  return { ok: true, sentAt: now };
}

// [02-4] 계약금 입금 확인(통장 대조 후) → 입금상태=확인 + 현재단계=입금완료. 자동 진행 아님(이 승인이 트리거).
function adminConfirmPayment(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (String(cust.get('계약상태') || '').trim() !== '서명완료') {
    return { ok: false, error: '계약 서명 완료 후 입금 확인이 가능합니다.' };
  }
  if (String(cust.get('입금상태') || '').trim() === '확인') {
    _recordHandler(code, '입금 확인(중복)'); return { ok: true, already: true };
  }
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  touchCustomer(sheet, colOf, cust.num, { '입금상태': '확인' });
  setCustomerStage(code, 'paid');                            // 현재단계 → 입금완료
  _recordHandler(code, '입금 확인 → 입금완료');
  notifyKakao('cust.paymentConfirmed', code, { kind: '계약금' });   // 고객 안심 알림(카톡)
  return { ok: true };
}

// [02-7] 현금영수증 발행 기록 — 입금 확인된 마일스톤(예약금/계약금·중도금·잔금)을 홈택스에서 발급한 뒤, 승인번호(발행번호)를 여기 기록.
//   기록되면 발행 큐에서 사라지고 고객 '내 내역'에 발행완료로 표시. 금액은 원장에서 자동 산출(관리자는 번호만 입력).
function adminIssueCashReceipt(code, kind, num) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  kind = String(kind || '').trim();
  num = String(num || '').replace(/[^0-9\-]/g, '').trim();   // 승인번호(숫자·하이픈)
  if (['예약금', '중도금', '잔금'].indexOf(kind) === -1) return { ok: false, error: '발행 항목이 올바르지 않습니다.' };
  if (!num) return { ok: false, error: '발행번호(홈택스 승인번호)를 입력해 주세요.' };
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stCol = (kind === '예약금') ? '입금상태' : (kind === '중도금' ? '중도금상태' : '잔금상태');
  if (String(cust.get(stCol) || '').trim() !== '확인') return { ok: false, error: '입금 확인 후에 현금영수증을 발행할 수 있어요. (' + kind + ')' };
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
  if (['예약금', '중도금', '잔금'].indexOf(kind) === -1) return { ok: false, error: '발행 항목이 올바르지 않습니다.' };
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
  try { lock.waitLock(15000); return lock; } catch (e) { return null; }
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
    setCustomerStage(code, 'complete');
    _recordHandler(code, '상담완료 처리');
    return { ok: true, stage: '상담완료' };
  } finally { try { lock.releaseLock(); } catch (e) {} }
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
    if (['제작중', '예식완료', '촬영완료', '결과물전달'].indexOf(stage) === -1) {
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
    var upd = { '원본링크': 원본, '보정본폴더': 보정본 };
    if (!isSnap) upd['영상링크'] = 영상;
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
    return { ok: true, links: { 원본: 원본, 보정본: 보정본, 영상: 영상 }, 결과물상태: upd['결과물상태'] || cur결과물 };
  } finally { try { lock.releaseLock(); } catch (e) {} }
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
    var fromStage = isSnap ? '입금완료' : '제작중';
    if (stage === target) return { ok: true, already: true, stage: stage };
    if (stage !== fromStage) return { ok: false, error: target + ' 처리는 ' + fromStage + ' 상태에서만 가능합니다. (현재: ' + (stage || '없음') + ')' };
    setCustomerStage(code, 'event');
    _recordHandler(code, target + ' 처리');
    return { ok: true, stage: target };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 4. 결과물 전달 완료 — 예식완료/촬영완료 + 원본 필수 → 결과물전달(후기 대기, 아카이브는 후기 마감 후)
function adminMarkDelivered(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    if (stage === '결과물전달') return { ok: true, already: true, stage: stage };
    if (['예식완료', '촬영완료'].indexOf(stage) === -1) return { ok: false, error: '예식완료/촬영완료 상태에서만 전달할 수 있습니다. (현재: ' + (stage || '없음') + ')' };
    if (!String(cust.get('원본링크') || '').trim()) return { ok: false, error: '결과물(원본)을 먼저 등록해 주세요.' };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    touchCustomer(sheet, colOf, cust.num, { '결과물상태': '전달완료' });
    setCustomerStage(code, 'deliver');
    _recordHandler(code, '결과물 전달 완료');
    notifyKakao('cust.resultDelivered', code);                  // 고객: 결과물 준비 완료 — 다운로드 안내(가장 중요)
    return { ok: true, stage: '결과물전달', survey: '대기' };   // 후기 대기 — 고객 후기 제출/운영자 넘기기 시 아카이브
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 4-1. 후기 넘기기 — 후기 미작성 고객을 수동 마감 → 설문상태=건너뜀 → 아카이브
function adminSkipSurvey(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var lock = _adminLock(); if (!lock) return { ok: false, error: _LOCK_BUSY };
  try {
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
    if (String(cust.get('현재단계') || '').trim() !== '결과물전달') return { ok: false, error: '결과물 전달 완료 고객만 후기를 넘길 수 있습니다.' };
    var cur = String(cust.get('설문상태') || '').trim();
    if (cur === '완료' || cur === '건너뜀') return { ok: true, already: true, archived: true };
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    touchCustomer(sheet, colOf, cust.num, { '설문상태': '건너뜀' });
    _recordHandler(code, '후기 넘기기(설문 생략)');
    return { ok: true, archived: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 5. ★강제 단계 변경 (복구/초기화용) — 현재단계 변경 + '이후 단계 진행 데이터 초기화'(완전 초기화) · 제품 유효성 검증
//   ※ 상담 예약(상담예약 시트·캘린더)은 별개라 건드리지 않음.
function _clearForwardData(colOf, cust, product, targetStage, fromException) {
  var flow = stageFlowFor(product);
  var ti = flow.indexOf(targetStage);
  if (ti < 0) return {};
  var isSnap = (product === P.PRODUCT_SNAP);
  // [컬럼들, 이 데이터가 생기는 단계(상품 기준), 동의기록 키] — 목표가 그 단계보다 앞이면 비움
  var groups = [
    { cols: [], at: isSnap ? '촬영확정' : '상담확정', consent: '가예약' },   // 예식일 임시고정 — 신청접수로 내리면(예약 자체 리셋) 요청/승인·슬롯 점유까지 제거. 상담확정 이상 복귀는 보존
    { cols: ['시착동의상태', '시착동의일시'], at: '시착', consent: '시착' },
    { cols: ['계약상태', '계약서발송일시', '계약서명일시', '계약서링크', '계약총액', '예식일'], at: '계약완료', consent: ['계약', '계약정보'] },  // 계약정보=고객이 입력한 계약서 요청 정보(상담완료 단계 산출물) → 함께 비워야 '요청 완료' 카드도 초기화. 예식일(톱레벨 복사본)도 함께 — 남으면 계약발송 큐·'계약서 준비 중' 안내가 잘못 살아남
    { cols: ['입금상태', '입금완료신호', '입금자명'], at: '입금완료', consent: '현금영수증' },
    { cols: ['중도금상태', '중도금입금자명', '중도금입금신호', '중도금확인일시', '중도금리마인드'], at: '제작중' },        // 중도금(시그 3단계 마일스톤)
    { cols: ['잔금상태', '잔금입금자명', '잔금입금신호', '잔금확인일시', '잔금리마인드'], at: isSnap ? '촬영완료' : '제작중' }, // 잔금(제작/촬영 단계 마일스톤)
    { cols: ['제작임시저장', 'eventId', '제작상태'], at: '제작중' },
    { cols: ['원본링크', '영상링크', '보정본폴더', '결과물상태', '선택사진', '선택수', '선택확정일시', '컨펌일시', '추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명'], at: isSnap ? '촬영완료' : '예식완료' },
    { cols: ['설문상태', '설문응답', '설문일시'], at: '결과물전달' }
  ];
  var upd = {}, consentKeys = [];
  groups.forEach(function (g) {
    var gi = flow.indexOf(g.at);
    if (gi < 0 || ti >= gi) return;                 // 이 상품에 없거나, 목표가 이 데이터 단계 이상이면 보존
    g.cols.forEach(function (c) { if (colOf[c]) upd[c] = ''; });
    if (g.consent) consentKeys = consentKeys.concat(g.consent);   // string·array 모두 허용(한 그룹에서 여러 동의기록 키 제거)
  });
  // 예외(취소·노쇼·미계약)→정상 복구 — 환불완료 흔적 제거(남으면 이후 재취소 때 환불송금 큐가 영영 안 뜸). 실제 송금 이력은 처리이력에 보존.
  if (fromException) consentKeys.push('환불완료');
  // ※ 동의기록.영수증발행(홈택스 발행 기록)은 의도적 보존 — 세무 증빙. 취소는 adminUndoCashReceipt로만.
  if (consentKeys.length) {                          // 동의기록 JSON에서 해당 키 제거
    var rec = _parseJsonSafe(cust.get('동의기록'));
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
function adminForceStage(code, targetStage, reason) {
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
    var cleared = _clearForwardData(colOf, cust, product, targetStage, STAGE_EXCEPTIONS.indexOf(cur) !== -1);   // 이후 단계 진행 데이터 초기화(완전 초기화) + 예외 복구 시 환불 흔적 제거
    // 상담확정 이전(신청접수)까지 내릴 땐 상담 예약도 초기화 + 캘린더 슬롯 해제
    var bookConfirm = flow.indexOf(isSnap ? '촬영확정' : '상담확정');
    var needBookingReset = (ti >= 0 && bookConfirm >= 0 && ti < bookConfirm);
    if (cur === targetStage && !Object.keys(cleared).length && !needBookingReset) return { ok: true, noop: true, from: cur, to: targetStage };
    var upd = { '현재단계': targetStage };
    Object.keys(cleared).forEach(function (k) { upd[k] = cleared[k]; });
    touchCustomer(sheet, colOf, cust.num, upd);
    var bookingReset = needBookingReset ? _resetConsultBooking(code) : false;   // 예약 취소 + 캘린더 슬롯 해제
    var clearedCols = Object.keys(cleared).filter(function (k) { return k !== '동의기록'; });
    _recordHandler(code, '★강제변경 ' + (cur || '없음') + '→' + targetStage
      + (clearedCols.length ? (' · 이후 데이터 초기화(' + clearedCols.join('·') + ')') : '')
      + (bookingReset ? ' · 상담예약 초기화(캘린더 해제)' : '') + ' · 사유: ' + reason);
    return { ok: true, from: cur, to: targetStage, cleared: clearedCols, bookingReset: bookingReset, warning: '이후 단계 진행 데이터' + (bookingReset ? '와 상담 예약(캘린더 포함)' : '') + '을 초기화했습니다.' };
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
  touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
  _recordHandler(code, '예식일 임시고정 승인 · ' + hold.date + ' ' + hold.slot);
  notifyKakao('cust.holdGranted', code, { date: hold.date, slot: hold.slot });
  return { ok: true };
}
// [임시고정] 예식일 가예약 거절/해제 — 동의기록.가예약 제거 + 고객 안내.
function adminDeclineWeddingHold(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var rec = _parseJsonSafe(cust.get('동의기록'));
  if (!rec.가예약) return { ok: true, already: true };
  var _d = rec.가예약.date, _s = rec.가예약.slot;
  delete rec.가예약;
  touchCustomer(sheet, colOf, cust.num, { '동의기록': Object.keys(rec).length ? JSON.stringify(rec) : '' });
  _recordHandler(code, '예식일 임시고정 거절/해제 · ' + (_d || '') + ' ' + (_s || ''));
  notifyKakao('cust.holdReleased', code, { date: _d, slot: _s });
  return { ok: true };
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
    touchCustomer(sheet, colOf, cust.num, { '현재단계': '노쇼' });
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
    touchCustomer(sheet, colOf, cust.num, { '현재단계': '미계약' });
    _recordHandler(code, '미계약 처리');
    return { ok: true, stage: '미계약', archived: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// 취소 환불 송금 완료 처리 — 동의기록.환불완료=시각 기록 → 환불 송금 큐에서 사라짐. (멱등)
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
