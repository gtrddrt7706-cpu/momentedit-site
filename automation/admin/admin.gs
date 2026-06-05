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

// 현황 줄 하위상태 1줄 (B2.2) — 단계+상품+보조상태
function _subStatusFor(stage, isSnap, x) {
  switch (stage) {
    case '신청접수': return (x.booking === ST.PICKED) ? '승인 대기' : '시간 선택 대기';
    case '상담확정': return x.consultPast ? '상담일 지남' : '상담 예정';
    case '촬영확정': return x.consultPast ? '촬영일 지남' : '촬영 예정';
    case '상담완료': return (x.시착 !== '동의완료') ? '시착 동의 대기' : ((!x.계약 || x.계약 === '미발송') ? '계약서 발송 대기' : '계약 진행 중');
    case '계약완료': return (x.계약 === '서명완료') ? '입금 대기' : '계약 서명 대기';
    case '입금완료': return isSnap ? '촬영 준비' : '제작 시작 대기';
    case '제작중': return (x.invStatus === '완료') ? '청첩장 발행됨' : (x.invStatus === '진행중' ? '청첩장 만드는 중' : '제작 시작 전');
    case '예식완료': return x.원본 ? '결과물 전달 대기' : '결과물 등록 대기';
    case '촬영완료': return x.원본 ? '결과물 전달 대기' : '결과물 등록 대기';
    default: return '';
  }
}

// ============================ 홈 — 처리할 일 큐 + 진행 중 현황 (⑧ 재구성) ============================
// v1(상담 4그룹) → Customers 주도 순회 + 상담예약 조인(개인코드). read 2번(풀폭)·인메모리 계산.
// 끝난 고객(예외 미계약·취소·노쇼 + 결과물전달) = 아카이브 → 큐·현황 제외.
function adminHome() {
  _requireAdmin();
  var name = adminNameOf(currentAdminEmail());
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

  var urgent = [], normal = [], queueCodes = {};
  var pipe = {}; pipe[P.PRODUCT_SIGNATURE] = {}; pipe[P.PRODUCT_SNAP] = {};
  function pushQ(it) { queueCodes[it.code] = true; if (it._urgent) urgent.push(it); else normal.push(it); }

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
    if (STAGE_EXCEPTIONS.indexOf(stage) !== -1 || stage === '결과물전달') return;  // 끝남 → 제외

    var 계약 = String(cget(rv, '계약상태') || '').trim();
    var 입금 = String(cget(rv, '입금상태') || '').trim();
    var 시착 = String(cget(rv, '시착동의상태') || '').trim();
    var 원본 = String(cget(rv, '원본링크') || '').trim();
    var bk = bookMap[code];
    var draft = _parseJsonSafe(cget(rv, '제작임시저장'));
    var invStatus = (draft.tracks && draft.tracks.invitation) || '시작전';
    var wedYmd = _ymdOf(draft.base && draft.base.weddingDate) || _ymdOf(bk ? bget(bk, '예식일자') : '');
    var consultYmd = _ymdOf(bk ? bget(bk, '선택날짜') : '');
    var bookingStatus = bk ? String(bget(bk, '상태') || '').trim() : '';
    var consultPast = consultYmd ? (_dayDiff(today, consultYmd) > 0) : false;

    // 상담완료 처리(시그 전용)
    if (!isSnap && stage === '상담확정' && consultPast) {
      pushQ({ code: code, names: names, product: product, kind: '상담완료', sub: '상담 끝남 · 처리 대기',
        badge: { level: 'yellow', text: '상담 끝남' }, _urgent: false, _stage: 2, _wait: createdYmd });
    }
    // 계약서 발송 — 시그(상담완료&시착동의완료) / 스냅(촬영확정) — & 계약 미발송
    var canSend = isSnap ? (stage === '촬영확정') : (stage === '상담완료' && 시착 === '동의완료');
    if (canSend && (!계약 || 계약 === '미발송')) {
      pushQ({ code: code, names: names, product: product, kind: '계약발송', sub: '계약서 발송 대기',
        badge: null, _urgent: false, _stage: 3, _wait: createdYmd });
    }
    // 계약 만료 임박/만료됨 — 계약상태=발송 & 발송+72h 잔여<24h (고객대기 예외 큐)
    if (계약 === '발송') {
      var sent = _parseKstStr(cget(rv, '계약서발송일시'));
      if (sent) {
        var leftMs = sent.getTime() + CONTRACT.서명기한시간 * 3600 * 1000 - nowMs;
        if (leftMs < 24 * 3600 * 1000) {
          var btxt = (leftMs <= 0) ? '계약 만료됨 · 재발송' : (leftMs < 12 * 3600 * 1000 ? ('서명 만료 ' + Math.max(1, Math.round(leftMs / 3600000)) + '시간') : '서명 만료 D-1');
          pushQ({ code: code, names: names, product: product, kind: '계약만료', sub: btxt,
            badge: { level: 'red', text: btxt }, _urgent: true, _loss: 1, _wait: createdYmd });
        }
      }
    }
    // 입금 확인 — 입금상태=완료신호
    if (입금 === '완료신호') {
      var sigDays = _dayDiff(today, _ymdOf(cget(rv, '입금완료신호')));
      pushQ({ code: code, names: names, product: product, kind: '입금확인', sub: '입금 확인',
        badge: (sigDays != null && sigDays >= 1) ? { level: 'yellow', text: '입금 신호 ' + sigDays + '일째' } : null,
        _urgent: false, _stage: 4, _wait: createdYmd });
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
    // 결과물 2단계 — 예식완료/촬영완료: 원본없음→등록 / 원본있음→전달
    if (stage === '예식완료' || stage === '촬영완료') {
      if (!원본) pushQ({ code: code, names: names, product: product, kind: '결과물등록', sub: '결과물 링크 등록', badge: null, _urgent: false, _stage: 6, _wait: createdYmd });
      else pushQ({ code: code, names: names, product: product, kind: '결과물전달', sub: '결과물 전달', badge: null, _urgent: false, _stage: 7, _wait: createdYmd });
    }

    // 현황 그룹
    var g = pipe[isSnap ? P.PRODUCT_SNAP : P.PRODUCT_SIGNATURE];
    (g[stage] = g[stage] || []).push({
      code: code, names: names,
      sub: _subStatusFor(stage, isSnap, { booking: bookingStatus, consultPast: consultPast, 시착: 시착, 계약: 계약, 입금: 입금, 원본: 원본, invStatus: invStatus }),
      dday: (wedYmd ? _dayDiff(wedYmd, today) : null), _created: createdYmd
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
      list.sort(function (a, b) {
        var an = (a.dday == null), bn = (b.dday == null);
        if (an !== bn) return an ? 1 : -1;                 // 예식일 미정 뒤로
        if (!an && a.dday !== b.dday) return a.dday - b.dday; // 가까운 먼저
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
    pipeline: { 시그니처: buildPipe(P.PRODUCT_SIGNATURE), 웨딩스냅: buildPipe(P.PRODUCT_SNAP) },
    pipeCounts: { 시그니처: countPipe(pipe[P.PRODUCT_SIGNATURE]), 웨딩스냅: countPipe(pipe[P.PRODUCT_SNAP]) }
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

  // 헤더 핀 — 예식일(제작 base 우선·없으면 상담 예식일자)·하객·상품
  var draft = _parseJsonSafe(cust.get('제작임시저장'));
  d.pin = {
    예식일: _ymdOf(draft.base && draft.base.weddingDate) || _ymdOf(cr ? cr.get('예식일자') : ''),
    하객: String(cr ? (cr.get('하객') || '') : ''),
    상품: product
  };

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
    계약총액: String(cust.get('계약총액') || ''),
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
      out.push({ code: code, names: _names(g, b), product: get(rv, '상품타입'), stage: get(rv, '현재단계') });
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

// ============================ 계약·입금 동작 (02) — Customers 측 ============================
// [02-3] 계약서 발송 — 계약상태=발송 + 계약서발송일시(now, +72h 기한 기준) + 계약서링크.
//   서명은 고객 측(signContract). 발송 시각을 정확히 찍어야 기한 계산이 맞으므로 이 핸들러로 발송(시트 직접 입력 X).
// total = 계약총액(주말 2800000 / 평일 2100000 등, 공휴일=주말단가). 입금화면의 계약금·잔금 산출 기준.
function adminSendContract(code, link, total) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stage = String(cust.get('현재단계') || '').trim();
  if (['취소', '노쇼', '미계약'].indexOf(stage) !== -1) {
    return { ok: false, error: '진행할 수 없는 상태입니다. (현재단계: ' + stage + ')' };
  }
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var now = fmtKST(new Date());
  var amt = Math.round(Number(total) || 0);                   // 0이면 미설정(입금화면이 "확인 후 안내")
  var upd = { '계약상태': '발송', '계약서발송일시': now, '계약서링크': String(link || '').trim() };
  if (amt > 0) upd['계약총액'] = amt;
  touchCustomer(sheet, colOf, cust.num, upd);
  _recordHandler(code, '계약서 발송' + (amt > 0 ? (' · 총액 ' + amt + '원') : '') + (link ? ' (링크)' : ''));
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
  return { ok: true };
}

// [02-0] 시착 동의 게이트 열기 → 시착동의상태=동의요청 (고객 마이페이지에 동의서 노출). 상담완료 단계에서만.
function adminOpenFittingConsent(code) {
  _requireAdmin();
  code = String(code || '').trim().toUpperCase();
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var stage = String(cust.get('현재단계') || '').trim();
  if (stage !== '상담완료') return { ok: false, error: '상담완료 단계에서만 시착 동의를 열 수 있습니다. (현재: ' + (stage || '없음') + ')' };
  if (String(cust.get('시착동의상태') || '').trim() === '동의완료') return { ok: true, already: true };
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  touchCustomer(sheet, colOf, cust.num, { '시착동의상태': '동의요청' });
  _recordHandler(code, '시착 동의 요청(게이트 열기)');
  return { ok: true };
}
