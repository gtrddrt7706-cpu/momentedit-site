/**
 * Moment Edit · 대면 상담 예약 시스템 (구글 캘린더 + 시트 + Apps Script)
 * ──────────────────────────────────────────────────────────────────────────
 * 청첩장 시스템(form-to-couple.gs)과 동일한 구글 스택입니다.
 * 메일·토큰·notifyStudio·writeCell·onEdit·트리거 패턴을 그 코드에서 그대로 가져왔습니다.
 *
 * [핵심 흐름]
 *   화면 A(신청) → 메일①(전용 URL) → 화면 B(날짜·시간 선택 + 입금) → 메일②(미쿠 알림+버튼)
 *     ├─ [✓ 승인하기]   → 메일③(예약 확정) + 캘린더 일정 생성 = ★예약 완료
 *     └─ [시간 변경 제안] → 화면 C(미쿠 변경입력) → 메일④(제안)
 *            ├─ [수락]        → 메일⑤(변경 확정) + 캘린더 갱신 = ★예약 완료
 *            └─ [다른 시간 보기] → 화면 B 재오픈 → 다시 선택
 *
 * [절대 원칙]
 *   1) 스케줄 비공개 — 전용 토큰 URL로만 접근(공개 시간표 없음)
 *   2) 확정 메일 = 완료 — 신청 ≠ 확정 (화면·메일 문구에 명시)
 *   3) 미쿠는 시트 직접편집 X — 메일 버튼 / 미니페이지로 처리(모바일)
 *   4) 화면 B 디자인 확정본 그대로 — 데이터 연동만
 *
 * [설치] 02_운영자 가이드 / SETUP 문서 참고.
 *   1. 새 구글 시트 → 확장프로그램 > Apps Script 에 이 파일들 붙여넣기
 *   2. CONFIG 의 [...] 값을 채운다 (계좌·주소·캘린더ID·미쿠 이메일·카톡)
 *   3. setupConsultation() 1회 실행 (시트 헤더 + 비밀키 + onEdit 트리거 생성)
 *   4. 배포 > 새 배포 > 웹 앱 (실행: 나 / 액세스: 모든 사용자) → 웹앱 URL 확보
 */

// ============================ STEP 1 · CONFIG 상수 ============================
// ⚠️ [...] placeholder 는 운영자가 직접 채웁니다. (임의 값 넣지 말 것)
const CONFIG = {
  // [P1.5 작업5] 고객 상태메일 토글 — 기본 OFF(마이페이지가 상태를 대체). 켜려면 true.
  SEND_CONFIRM_MAIL: true,                     // [고객 ON] 상담 확정 안내 (sendConfirmEmail) — 대면상담 확정 시 발송
  SEND_CHANGE_MAIL: false,                     // [고객 OFF·카톡] 변경제안 안내 (sendProposalEmail)
  SEND_CANCEL_MAIL: false,                     // [고객 OFF·카톡] 취소 안내 (sendCancelEmail)
  SEND_REMIND_MAIL: false,                     // [고객 OFF·카톡] 상담 D-1 리마인더 (sendReminderCustomer)
  SEND_CONTRACT_MAIL: false,                   // [고객 OFF·마이페이지+카톡] 계약서 도착 안내 (adminSendContract→고객)
  SEND_BALANCE_MAIL: false,                    // [고객 OFF·마이페이지+카톡] 잔금 안내 (70_journey 자동)
  SEND_ADMIN_MAIL: false,                      // [관리자 전부 OFF·카톡] 신규신청·승인요청·확정·D-1브리핑·환불요청 + 오류알림(notifyStudio)까지 전부. true로 바꾸면 관리자 메일 전부 복구.
  // 참고 — 항상 발송(고객 ON): 신청 접수(sendSignupEmail) · 코드찾기/비번재설정(개인코드 안내). 둘은 토글 없이 상시 ON.
  SLOT_DURATION_MIN: 40,                       // 상담 길이(분)
  SLOTS_WEEKDAY: ['11:30', '14:50', '18:10', '19:30'],  // 평일 슬롯 (19:30 = 직장인 야간 상담)
  SLOTS_WEEKEND: ['18:20'],                    // 주말 슬롯 (저녁 1타임)
  DEPOSIT: 200000,                             // 예약금
  ACCOUNT: '기업 000-000-00000',                // 입금 계좌 — ⚠️ 임시값(기업은행), 실제 계좌번호로 교체 필요
  ACCOUNT_HOLDER: '모먼트에디트',                // ⚠️ 임시값(예금주)
  EXEC_URL: 'https://script.google.com/macros/s/AKfycbyR3n9MrPJNQfBDPDocq4VeUd8y78TtyrMTZ3a3g_eOmYwOIc6im5yXo3z1pJv7QgSBEQ/exec',  // 웹앱 /exec (mypage.html의 EXEC_URL과 동일) — webAppUrl()이 사용
  URL_VALID_DAYS: 7,                           // 전용 URL 유효기간
  CONFIRM_DEADLINE_HOURS: 24,                  // 변경·취소 기한 (상담 24시간 전까지)
  STUDIO_ADDRESS: '[정확한 도로명 주소]',        // 확정 메일에만 — 운영자 입력 예정
  KAKAO_URL: '[카카오톡 채널 URL]',             // 문의 경로 — 운영자 입력 예정
  ADMIN_EMAIL: 'contact@momentedit.kr',         // 알림 받을 주소(정본)
  ADMIN_CC: [                                   // 운영자 알림 함께 받을 주소(미쿠·희준 개인메일 등) — 구글 전달 대신 코드가 직접 발송
    'side.minds.1616@gmail.com',                //   미쿠
    'gtrddrt7706@gmail.com',                    //   희준
  ],
  CALENDAR_ID: 'c_c6c2f76cd17c85e3ddfa4ded4ca3634b9fd3de774222171c0c30a850a0cfbf00@group.calendar.google.com',
};

// 날짜키('YYYY-M-D' 또는 Date)의 요일에 맞는 슬롯 배열 반환 (주말=토·일)
function slotsForDate(dateKeyOrDate) {
  var d = (dateKeyOrDate instanceof Date) ? dateKeyOrDate : parseDateTime(normalizeDateKey(dateKeyOrDate), '00:00');
  if (!d) return CONFIG.SLOTS_WEEKDAY;
  var wd = d.getDay(); // 0=일, 6=토
  return (wd === 0 || wd === 6) ? CONFIG.SLOTS_WEEKEND : CONFIG.SLOTS_WEEKDAY;
}

// 운영자 알림 CC 문자열 생성 — ADMIN_CC 중 유효한 주소만 콤마로 연결.
// placeholder([…])·빈값·정본(ADMIN_EMAIL)과 중복되는 주소는 제외.
function adminCc() {
  var list = CONFIG.ADMIN_CC;
  if (!list || !list.length) return '';
  var primary = String(CONFIG.ADMIN_EMAIL || '').trim().toLowerCase();
  var out = [];
  for (var i = 0; i < list.length; i++) {
    var a = String(list[i] || '').trim();
    if (!a || a.charAt(0) === '[') continue;        // 빈값/placeholder 제외
    if (a.indexOf('@') === -1) continue;            // 형식 안 맞으면 제외
    if (a.toLowerCase() === primary) continue;      // 정본과 중복 제외
    if (out.indexOf(a) === -1) out.push(a);         // 중복 제거
  }
  return out.join(',');
}

// 시스템 상수 (운영자가 건드릴 필요 없음)
const SYS = {
  SHEET_NAME: '상담예약',
  HEADER_ROW: 1,
  DATA_START_ROW: 2,
  SEARCH_DAYS: 120,                            // 달력 가능일 탐색 범위(앞으로 N일)
  AVAIL_KEYWORD: /상담\s*가능|consult|available/i, // 캘린더에서 '상담가능' 일정을 식별하는 키워드
  FROM_NAME: 'Moment Edit',
  EVENT_PREFIX: 'Moment Edit 상담 · ',
  PROP_SECRET: 'CONSULT_ACTION_SECRET',        // 관리자 버튼 서명용 비밀키 (setup 시 생성)
  // HTML 템플릿 파일명 (Apps Script 안의 HTML 파일 이름과 일치해야 함)
  HTML_A: 'ScreenA_apply',
  HTML_B: 'ScreenB_schedule',
  HTML_C: 'ScreenC_change',
};

// 시트 헤더 (STEP 2)
const HEADERS = [
  // 접수
  '신청일시', '상태', '입금확인',
  // 신청인
  '성함(신랑)', '성함(신부)', '연락처', '이메일',
  // 예식 희망 (신청상세 분리)
  '경로', '예식일자', '요일', '시간대', '하객', '디지털참석', '의상',
  // 상담 준비 (신청상세 분리)
  '분위기·스냅', '중요하게여김', '망설이는점', '준비상황', '참고링크', '자유메모',
  // 상담 일정
  '선택날짜', '선택시간', '그외가능시간대', '기타희망시간',
  // 확정
  '변경제안날짜', '변경제안시간', '변경제안메모', '확정일시', '취소일시', '환불계좌',
  // 동의
  '개인정보동의', '제출시각',
  // 식별
  '토큰', '캘린더이벤트ID', '개인코드'
];
// 신청상세(detail 문자열)의 '라벨' → 시트 컬럼 매핑 (폼 출력 라벨과 정확히 일치해야 함)
var DETAIL_MAP = {
  '알게 된 경로': '경로',
  '희망 예식 일자': '예식일자',
  '희망 요일': '요일',
  '희망 예식 시간대': '시간대',
  '예상 하객 인원': '하객',
  '디지털 참석': '디지털참석',
  '의상': '의상',
  '원하는 분위기 · 스냅 스타일': '분위기·스냅',
  '중요하게 생각하는 것': '중요하게여김',
  '망설여지는 점': '망설이는점',
  '현재 준비 상황': '준비상황',
  '참고 링크': '참고링크',
  '개인정보 동의': '개인정보동의',
  '신청 제출 시각': '제출시각'
};
// detail 문자열을 라벨별로 파싱해 { 컬럼명: 값 } 반환
function parseDetail(detail) {
  var out = {};
  String(detail || '').split('\n').forEach(function (line) {
    var i = line.indexOf(': ');
    if (i < 0) return;
    var label = line.slice(0, i).trim();
    var val = line.slice(i + 2).trim();
    if (DETAIL_MAP[label]) out[DETAIL_MAP[label]] = val;
  });
  return out;
}
// 상태값: 신청접수 / 시간선택완료 / 승인완료 / 변경제안 / 확정 / 취소
const ST = {
  APPLIED: '신청접수', PICKED: '시간선택완료', APPROVED: '승인완료',
  PROPOSED: '변경제안', CONFIRMED: '확정', CANCELLED: '취소'
};
// 슬롯이 "마감"으로 잠기는 상태(확정 흐름)
const LOCKED_STATES = [ST.APPROVED, ST.CONFIRMED];

// ============================ 웹앱 라우팅 (doGet) ============================
function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.admin === '1') return serveAdmin(e);       // [관리자 v1] 구글 로그인 + Admins 화이트리스트
    if (p.action) return handleAction(p);            // 메일 버튼(승인/변경/수락/재선택)
    if (p.page === 'schedule' && p.token) return serveScheduleB(p.token, p.me === '1'); // 화면 B (me=1: 마이페이지 진입)
    return serveApplyA();                             // 기본: 화면 A (신청 폼, 공개)
  } catch (err) {
    return infoPage('문제가 발생했습니다', String(err && err.message || err), false);
  }
}

// ───────────── 화면 A · 상담 신청 폼 (공개) ─────────────
function serveApplyA() {
  var t = HtmlService.createTemplateFromFile(SYS.HTML_A);
  t.kakao = safeAttr(CONFIG.KAKAO_URL);
  return t.evaluate()
    .setTitle('대면 상담 신청 · Moment Edit')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ───────────── 화면 B · 스케줄 선택 (비공개 / 토큰) ★핵심 ─────────────
function serveScheduleB(token, fromMypage) {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);

  // STEP 4-1) 토큰 검증 — 없거나 만료(URL_VALID_DAYS 초과)면 안내
  if (!row) return infoPage('유효하지 않은 링크입니다', '링크가 올바르지 않거나 신청 정보를 찾을 수 없습니다. 다시 신청해 주시거나 카카오톡으로 문의해 주세요.', false);
  if (isExpired(row.get('신청일시'))) {
    return infoPage('링크 유효기간이 지났습니다', '전용 링크는 신청 후 ' + CONFIG.URL_VALID_DAYS + '일간만 유효합니다. 번거로우시겠지만 상담을 다시 신청해 주세요.', false);
  }

  var data = getAvailability();
  var server = {
    slotsWeekday: CONFIG.SLOTS_WEEKDAY,
    slotsWeekend: CONFIG.SLOTS_WEEKEND,
    duration: CONFIG.SLOT_DURATION_MIN,
    avail: data.avail,
    full: data.full,
    names: coupleNames(row),
    token: token,
    me: !!fromMypage            // 마이페이지에서 진입했으면 완료 후 마이페이지로 복귀(세션 유지)
  };

  var t = HtmlService.createTemplateFromFile(SYS.HTML_B);
  t.names = coupleNames(row);
  t.account = CONFIG.ACCOUNT;
  t.holder = CONFIG.ACCOUNT_HOLDER;
  t.depositStr = formatWon(CONFIG.DEPOSIT);
  t.kakao = safeAttr(CONFIG.KAKAO_URL);
  t.serverJson = JSON.stringify(server).replace(/</g, '\\u003c'); // </script> 방어
  return t.evaluate()
    .setTitle('상담 일정 선택 · Moment Edit')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ───────────── 화면 C · 미쿠 변경입력 (토큰 + 서명) ─────────────
function serveChangeC(token, p) {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) return infoPage('예약을 찾을 수 없습니다', '토큰이 올바르지 않습니다.', false);

  var t = HtmlService.createTemplateFromFile(SYS.HTML_C);
  t.names = coupleNames(row);
  t.token = token;
  t.sig = p.sig || '';
  t.curDate = row.get('선택날짜') || '';
  t.curTime = row.get('선택시간') || '';
  t.flex = row.get('그외가능시간대') || '';
  t.etc = row.get('기타희망시간') || '';
  return t.evaluate()
    .setTitle('시간 변경 제안 · Moment Edit')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover, maximum-scale=1.0, user-scalable=no')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================ 메일 버튼 액션 처리 ============================
function handleAction(p) {
  var token = p.token, action = p.action, sig = p.sig;
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) return infoPage('예약을 찾을 수 없습니다', '링크가 올바르지 않습니다.', false);

  // 관리자(미쿠) 전용 액션은 서명 검증 — 고객 토큰만으로는 승인/변경 불가
  var adminActions = { approve: 1, change: 1, admincancelreq: 1, admindocancel: 1 };
  if (adminActions[action] && !verifySig(token, action, sig)) {
    return infoPage('권한이 없습니다', '관리자 전용 링크입니다. 알림 메일의 버튼으로 다시 시도해 주세요.', false);
  }
  // 고객 액션도 가볍게 서명 검증
  var custActions = { accept: 1, reselect: 1, cancelreq: 1, docancel: 1 };
  if (custActions[action] && !verifySig(token, action, sig)) {
    return infoPage('링크가 올바르지 않습니다', '메일의 버튼으로 다시 시도해 주세요.', false);
  }

  switch (action) {
    case 'approve':  return actApprove(sheet, colOf, row);
    case 'change':   return serveChangeC(token, p);
    case 'accept':   return actAccept(sheet, colOf, row);
    case 'reselect': return serveScheduleB(token); // [다른 시간 보기] → 화면 B 재오픈
    case 'cancelreq': return serveCancelD(token, row);       // 고객 [예약 취소] → 취소 신청 화면 D
    case 'docancel':  return doCustomerCancel(sheet, colOf, row, p); // 취소 확정(계좌 제출)
    case 'admincancelreq': return serveAdminCancelD(token, row);     // 관리자 [예약 취소] → 확인 화면
    case 'admindocancel':  return doAdminCancel(sheet, colOf, row);  // 관리자 취소 확정
    default:         return infoPage('알 수 없는 요청', '', false);
  }
}

// [✓ 승인하기] / 시트에서 상태를 '승인완료' 또는 '확정'으로 변경 시
// → 캘린더 일정 생성 + 고객 확정 메일 + 운영자 브리프.
// enteredStatus: 시트에서 직접 입력한 상태값(있으면 그 라벨 유지). 버튼/메일 경로면 생략→'승인완료'.
// [P1.5 ★③] 단일 전이 함수 — 상담행 상태 변화 → Customers 현재단계(10) 갱신을 이 함수 한 곳으로(산재 금지).
// transition: 'confirm'(상담/촬영확정) · 'complete'(상담완료) · 'contract'(계약완료) · 'paid'(입금완료) · 'produce'(제작중) · 'cancel'(취소). 상품타입 보고 라벨 매핑.
// 예외상태(취소·노쇼·미계약)는 정상 자동전이가 덮지 않음(가드). P1.5=수동/래퍼 호출, P2=자동배치가 같은 함수 호출.
function setCustomerStage(code, transition) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return false;
  var rowObj = findCustomerByCode(code);    // platform/20 — Customers 행
  if (!rowObj) return false;
  var sheet = getCustomersSheet();           // platform/10
  var colOf = buildHeaderIndex(sheet);
  var isSnap = (String(rowObj.get('상품타입') || '').trim() === '웨딩스냅');
  var MAP = {
    confirm:  isSnap ? '촬영확정' : '상담확정',
    fitting:  '시착',                        // [⑧] 시착 동의서 발송 → 상담확정→시착 (시그 전용)
    complete: '상담완료',                    // 시그 전용(스냅 '촬영완료'는 event 전이로 — 아래)
    contract: '계약완료',                    // [02-3] 계약서 서명 완료 → 계약완료
    paid:     '입금완료',                    // [02-4] 계약금 입금 확인 → 입금완료
    produce:  '제작중',                      // [03] 제작 기초정보 시작 → 제작중
    event:    isSnap ? '촬영완료' : '예식완료',  // [⑧관리자] 예식/촬영 완료 처리(제품 분기) — adminMarkEventDone
    deliver:  '결과물전달',                  // [⑧관리자] 결과물 전달 완료 — adminMarkDelivered
    cancel:   '취소'
  };
  var newStage = MAP[transition] || transition;
  var cur = String(rowObj.get('현재단계') || '').trim();
  var EX = ['취소', '노쇼', '미계약'];
  if (EX.indexOf(cur) !== -1 && transition !== 'cancel') return false;  // 예외→정상 자동전이 금지
  if (cur === newStage) return true;          // 멱등
  // [최고수위 보호] 정상 경로에서 이미 더 진행된 단계면 역행 금지 — 예약 재승인·변경수락(confirm 전이)이 시착/상담완료/계약완료 등을 상담확정으로 되돌리지 않게.
  if (transition !== 'cancel') {
    var _flow = stageFlowFor(String(rowObj.get('상품타입') || '').trim());
    var _ci = _flow.indexOf(cur), _ni = _flow.indexOf(newStage);
    if (_ci !== -1 && _ni !== -1 && _ni < _ci) return true;   // 역행 무시 — 현재(더 진행된) 단계 유지
  }
  touchCustomer(sheet, colOf, rowObj.num, { '현재단계': newStage });    // platform/20
  return true;
}

// 운영자 수동 '상담완료' 처리 호출구(④ 수동 우선). 편집기에서 개인코드 넣고 실행 / P6 UI가 호출. (자동배치는 P2)
function markConsultDone(personalCode) {
  var ok = setCustomerStage(personalCode, 'complete');
  Logger.log(ok ? ('상담완료 전이 OK: ' + personalCode) : ('전이 실패(코드없음/예외상태): ' + personalCode));
  return ok;
}

function actApprove(sheet, colOf, row, enteredStatus) {
  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  if (!dateKey || !time) return infoPage('선택된 시간이 없습니다', '고객이 아직 시간을 선택하지 않았습니다.', false);

  // [P1.5 작업6] Lock + 점유 재확인으로 더블 확정 0. 점유확인~쓰기를 원자적으로.
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return infoPage('잠시 후 다시 시도해 주세요', '서버가 혼잡합니다. 잠시 후 다시 시도해 주세요.', false); }
  try {
    // 중복 처리 차단은 "상태가 이미 승인완료/확정"인 경우에만.
    // (고객이 시간을 다시 골라 재승인 대기 중이면 상태는 '시간선택완료' → 아래로 진행해 갱신)
    var curStatus = String(row.get('상태') || '').trim();
    var targetStatus = (enteredStatus === ST.CONFIRMED) ? ST.CONFIRMED : ST.APPROVED;

    if (curStatus === ST.APPROVED || curStatus === ST.CONFIRMED) {
      writeCell(sheet, colOf, row.num, '상태', targetStatus);
      return infoPage('이미 확정된 예약입니다', coupleNames(row) + ' 님 · ' + prettyDate(dateKey) + ' · ' + time + '<br>(메일·캘린더는 이미 처리되어 다시 보내지 않았습니다.)', true);
    }
    if (curStatus === ST.CANCELLED) {  // [관리자 v1 · 개선 K] 취소건 승인 차단 — 메일버튼·관리자 양쪽 보호(되살아남 방지)
      return infoPage('취소된 예약입니다', '취소된 예약은 승인할 수 없습니다. 다시 진행하려면 고객이 새로 신청해야 합니다.', false);
    }

    // ★ (가)의 완성 — 승인 직전, 같은 슬롯에 이미 LOCKED(승인완료·확정)인 '다른' 행이 있으면 차단.
    //   PICKED 둘이 통과해도 여기서 두 번째 승인을 막아 더블 확정 0.
    if (_slotTaken(dateKey, time, row.num)) {
      return infoPage('이미 마감된 슬롯입니다',
        coupleNames(row) + ' 님 · ' + prettyDate(dateKey) + ' · ' + time + '<br>같은 시간이 다른 예약으로 이미 확정되어 있습니다. 이 고객에게는 <b>변경 제안</b>을 보내 주세요.', false);
    }

    writeCell(sheet, colOf, row.num, '입금확인', '확인');
    writeCell(sheet, colOf, row.num, '상태', targetStatus);
    writeCell(sheet, colOf, row.num, '확정일시', new Date());
    // syncCalendarEvent: 기존 이벤트ID가 있으면 그 일정을 새 날짜·시간으로 갱신, 없으면 새로 생성
    syncCalendarEvent(sheet, colOf, row.num, dateKey, time, coupleNames(row), row.get('연락처'));
    _bustAvailCache();   // 슬롯 마감 → 가능일 캐시 무효화

    try {
      sendConfirmEmail(row.get('이메일'), coupleNames(row), dateKey, time, false, row.get('토큰'));
    } catch (mailErr) {
      notifyStudio('[상담] ⚠️오류 · 확정 메일 발송 실패',
        coupleNames(row) + ' 님 · ' + dateKey + ' ' + time + '\n수신: ' + row.get('이메일') + '\n오류: ' + mailErr.message + '\n승인은 처리됐으나 메일이 안 갔습니다 — 수동 안내가 필요합니다.');
    }
    try { sendStudioBriefEmail(row, dateKey, time); } catch (e3) { Logger.log('운영자 상담준비 메일 실패: ' + e3.message); }
    setCustomerStage(String(row.get('개인코드') || '').trim(), 'confirm');  // ★③ Customers 현재단계 → 상담/촬영확정
    notifyKakao('cust.consultConfirmed', String(row.get('개인코드') || '').trim(), { date: dateKey, time: time });  // 고객: 상담/촬영 확정(카톡 — 메일과 동시 구간)
    return infoPage('승인 완료', coupleNames(row) + ' 님께 예약 확정 메일을 보냈습니다.<br>' + prettyDate(dateKey) + ' · ' + time + '<br>캘린더에도 일정이 등록되었습니다.', true);
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [수락] (변경 제안에 대한 고객 수락) → 상태=확정 + 캘린더 갱신 + 변경 확정 메일⑤
function actAccept(sheet, colOf, row) {
  var curStatus = String(row.get('상태') || '').trim();
  // 이미 확정/취소된 건 재처리 안 함 (버튼 2번 클릭·새로고침 시 메일 중복 방지)
  if (curStatus === ST.CONFIRMED) {
    return infoPage('이미 확정된 예약입니다', coupleNames(row) + ' 님 · ' + prettyDate(row.get('선택날짜')) + ' · ' + row.get('선택시간'), true);
  }
  if (curStatus === ST.CANCELLED) {
    return infoPage('취소된 예약입니다', '이 예약은 취소되었습니다. 다시 예약을 원하시면 새로 신청해 주세요.', false);
  }
  var nd = row.get('변경제안날짜'), nt = row.get('변경제안시간');
  if (!nd || !nt) return infoPage('제안된 시간이 없습니다', '변경 제안 정보를 찾을 수 없습니다.', false);

  writeCell(sheet, colOf, row.num, '선택날짜', nd);
  writeCell(sheet, colOf, row.num, '선택시간', nt);
  writeCell(sheet, colOf, row.num, '상태', ST.CONFIRMED);
  writeCell(sheet, colOf, row.num, '확정일시', new Date());
  syncCalendarEvent(sheet, colOf, row.num, nd, nt, coupleNames(row), row.get('연락처'));
  _bustAvailCache();   // 변경 확정 → 가능일 캐시 무효화

  try {
    sendConfirmEmail(row.get('이메일'), coupleNames(row), nd, nt, true, row.get('토큰'));
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 변경 확정 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
  }
  try { sendStudioBriefEmail(row, nd, nt); } catch (e3) { Logger.log('운영자 상담준비 메일 실패: ' + e3.message); }
  setCustomerStage(String(row.get('개인코드') || '').trim(), 'confirm');  // ★③ 변경수락→확정도 동일 전이
  return infoPage('변경 확정', '변경된 일정으로 예약이 확정되었습니다.<br>' + prettyDate(nd) + ' · ' + nt, true);
}

// 취소 처리 (공통) — 캘린더 일정 삭제 + 고객 취소 안내 메일 + 취소일시 기록.
// onConsultEdit(상태를 '취소'로 변경)와 수동 함수(cancelByRow) 양쪽에서 호출.
// [임시고정 연동] 상담 취소 공통 — 가예약(요청/승인) 자동 해제(슬롯 반환). 모든 취소 경로(셀프·관리자·이메일)가 actCancel 또는 handleEmailCancel에서 호출.
function _releaseWeddingHoldOnCancel(code) {
  try {
    code = String(code || '').trim().toUpperCase();
    if (!code) return;
    var cust = findCustomerByCode(code);
    if (!cust) return;
    var rec = _parseJsonSafe(cust.get('동의기록'));
    if (!rec.가예약) return;
    var _hd = rec.가예약.date, _hs = rec.가예약.slot;
    delete rec.가예약;
    var cs = getCustomersSheet(), cc = buildHeaderIndex(cs);
    touchCustomer(cs, cc, cust.num, { '동의기록': Object.keys(rec).length ? JSON.stringify(rec) : '' });
    _recordHandler(code, '상담 취소 → 예식일 임시고정 자동 해제 · ' + (_hd || '') + ' ' + (_hs || ''));
  } catch (e) {}
}

function actCancel(sheet, colOf, r) {
  var names = coupleNames(r);
  var dateKey = r.get('선택날짜'), time = r.get('선택시간');

  // 1) 캘린더 일정 삭제
  deleteCalendarEvent(sheet, colOf, r.num, names);

  // 2) 상태/취소일시 기록 (이미 '취소'면 상태는 그대로, 일시만 갱신)
  if (String(r.get('상태') || '').trim() !== ST.CANCELLED) {
    writeCell(sheet, colOf, r.num, '상태', ST.CANCELLED);
  }
  writeCell(sheet, colOf, r.num, '취소일시', new Date());
  _bustAvailCache();   // 슬롯 해제 → 가능일 캐시 무효화

  // 3) 고객 취소 안내 메일 (이메일 있을 때만)
  var to = r.get('이메일');
  if (to) {
    try { sendCancelEmail(to, names, dateKey, time); }
    catch (mailErr) { notifyStudio('[상담] ⚠️오류 · 취소 안내 메일 발송 실패', names + ' · ' + mailErr.message); }
  }
  setCustomerStage(String(r.get('개인코드') || '').trim(), 'cancel');  // ★③ Customers 현재단계 → 취소(예외)
  _releaseWeddingHoldOnCancel(String(r.get('개인코드') || '').trim()); // 가예약(요청/승인) 자동 해제 — 모든 actCancel 경유 취소 공통
}

// ── 고객 셀프 취소 ──────────────────────────────────────────
// [예약 취소] 클릭 → 취소 신청 화면. 상담 24시간 전(기한) 이내만 취소 가능, 지나면 안내만.
function serveCancelD(token, row) {
  var status = String(row.get('상태') || '').trim();
  // 확정/승인 상태가 아니면 취소할 게 없음
  if (status === ST.CANCELLED) {
    return infoPage('이미 취소된 예약입니다', '이 예약은 이미 취소되었습니다. 다시 예약을 원하시면 새로 신청해 주세요.', false);
  }
  if (LOCKED_STATES.indexOf(status) === -1) {
    return infoPage('취소할 예약이 없습니다', '확정된 예약이 없습니다. 문의가 필요하시면 카카오톡으로 연락 주세요.', false);
  }

  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  var names = coupleNames(row);

  // 기한 경과 → 취소 불가 안내
  if (!withinCancelDeadline(dateKey, time)) {
    var kakao = (CONFIG.KAKAO_URL && CONFIG.KAKAO_URL.charAt(0) !== '[')
      ? '<a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#B89A75;font-weight:600;text-decoration:none">카카오톡</a>' : '카카오톡';
    return infoPage('온라인 취소 기한이 지났습니다',
      '상담 <b>' + deadlineLabel() + ' 전</b>까지만 온라인 취소가 가능합니다.<br><br>' +
      '예약하신 일정: <b style="color:#3A2D22">' + prettyDate(dateKey) + ' · ' + esc(time) + '</b><br><br>' +
      '부득이하게 취소가 필요하시면 ' + kakao + '으로 문의해 주세요.', false);
  }

  // 기한 이내 → 취소 확인 + 환불 계좌 입력 화면
  var docancelUrl = actionUrl('docancel', token);
  var depositTxt = (CONFIG.DEPOSIT ? (Number(CONFIG.DEPOSIT).toLocaleString() + '원') : '예약금');
  var html =
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1.0,user-scalable=no">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400&family=Noto+Serif+KR:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&display=swap" rel="stylesheet">' +
    '<style>body{margin:0;background:#FAFAF8;color:#1C1B19;font-family:"Noto Sans KR",sans-serif;font-weight:300;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;word-break:keep-all}' +
    '.box{max-width:440px;width:100%;background:#fff;border:1px solid #DDD8D1;border-radius:12px;padding:42px 32px 34px;box-shadow:0 8px 30px rgba(28,27,25,.06)}' +
    '.brand{font-family:"Cormorant Garamond",serif;font-size:12px;letter-spacing:.34em;color:#3A2D22;text-transform:uppercase;text-align:center;margin-bottom:16px}' +
    '.bar{width:40px;height:3px;background:#6B2A24;border-radius:3px;margin:0 auto 22px}' +
    '.t{font-family:"Noto Serif KR",serif;font-size:20px;font-weight:500;color:#3A2D22;text-align:center;margin-bottom:18px}' +
    '.card{background:#F7F5F1;border:1px solid #E6E1D8;border-radius:8px;padding:18px 18px;text-align:center;margin-bottom:22px}' +
    '.card .ey{font-family:"Cormorant Garamond",serif;font-size:10px;letter-spacing:.22em;color:#B89A75;text-transform:uppercase;margin-bottom:8px}' +
    '.card .dt{font-family:"Noto Serif KR",serif;font-size:18px;font-weight:600;color:#3A2D22}' +
    '.notice{font-size:12.5px;line-height:1.8;color:#6B2A24;background:rgba(107,42,36,.05);border:1px solid rgba(107,42,36,.18);border-radius:6px;padding:13px 15px;margin-bottom:22px}' +
    '.lbl{display:block;font-size:11px;letter-spacing:.06em;color:#8A7A5E;text-transform:uppercase;margin-bottom:8px;font-family:"Cormorant Garamond",serif}' +
    '.fld{margin-bottom:16px}' +
    'input{width:100%;box-sizing:border-box;border:1px solid #DDD8D1;border-radius:6px;padding:13px 14px;font-family:"Noto Sans KR",sans-serif;font-size:14px;color:#3A2D22;background:#fff;outline:none}' +
    'input:focus{border-color:#B89A75}' +
    '.btns{display:flex;gap:10px;margin-top:24px}' +
    '.btn{flex:1;text-align:center;padding:14px 0;border-radius:6px;font-family:"Noto Serif KR",serif;font-size:14px;font-weight:500;cursor:pointer;border:none}' +
    '.btn-keep{background:#fff;color:#5A554C;border:1px solid #DDD8D1;text-decoration:none;display:block}' +
    '.btn-cancel{background:#6B2A24;color:#fff}' +
    '.btn-cancel:disabled{opacity:.5;cursor:not-allowed}' +
    '.err{color:#B53A3A;font-size:12px;margin-top:8px;min-height:14px;text-align:center}' +
    '.hint{font-size:11px;color:#A39C8E;margin-top:6px;line-height:1.6}</style></head>' +
    '<body><div class="box"><div class="brand">Moment Edit</div><div class="bar"></div>' +
    '<div class="t">예약을 취소하시겠어요?</div>' +
    '<div class="card"><div class="ey">Reservation</div><div class="dt">' + prettyDate(dateKey) + ' · ' + esc(time) + '</div></div>' +
    '<div class="notice">취소 시 예약금 ' + depositTxt + '은 입력하신 계좌로 환불해 드립니다.<br>환불은 영업일 기준 수일이 소요될 수 있습니다.</div>' +
    '<div class="fld"><span class="lbl">환불 계좌</span>' +
    '<input id="acct" type="text" placeholder="은행 · 계좌번호 · 예금주" autocomplete="off">' +
    '<div class="hint">예: 국민 123456-78-901234 정희준</div></div>' +
    '<div class="err" id="err"></div>' +
    '<div class="btns">' +
    '<a class="btn btn-keep" href="javascript:history.back()">예약 유지</a>' +
    '<button class="btn btn-cancel" id="go">취소 확정</button>' +
    '</div></div>' +
    '<script>' +
    '(function(){' +
    'var go=document.getElementById("go"),acct=document.getElementById("acct"),err=document.getElementById("err");' +
    'var base=' + JSON.stringify(actionUrl('docancel', token)) + ';' +
    'go.addEventListener("click",function(){' +
    'var v=acct.value.trim();' +
    'if(v.length<5){err.textContent="환불 계좌를 입력해 주세요.";acct.focus();return;}' +
    'go.disabled=true;go.textContent="취소 처리 중…";' +
    'var url=base+"&acct="+encodeURIComponent(v);' +
    'try{window.top.location.href=url;}catch(e){window.location.href=url;}' +
    '});' +
    'acct.addEventListener("input",function(){err.textContent="";});' +
    '})();' +
    '</script></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('예약 취소 · Moment Edit')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 취소 확정 처리 (계좌 제출됨) → 기한 재확인 → 캘린더 삭제·상태=취소·운영자 송금요청 메일·고객 취소완료 메일
function doCustomerCancel(sheet, colOf, row, p) {
  var status = String(row.get('상태') || '').trim();
  if (status === ST.CANCELLED) {
    return infoPage('이미 취소되었습니다', '이 예약은 이미 취소 처리되었습니다.', true);
  }
  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  var names = coupleNames(row);

  // 기한 재확인 (화면 우회 방지)
  if (!withinCancelDeadline(dateKey, time)) {
    return infoPage('온라인 취소 기한이 지났습니다', '카카오톡으로 문의해 주세요.', false);
  }

  var acct = String((p && p.acct) || '').trim();

  // 1) 캘린더 삭제 + 상태=취소 + 취소일시 (actCancel 재사용하되, 고객 취소 메일은 별도라 여기선 캘린더+상태만)
  deleteCalendarEvent(sheet, colOf, row.num, names);
  writeCell(sheet, colOf, row.num, '상태', ST.CANCELLED);
  writeCell(sheet, colOf, row.num, '취소일시', new Date());
  if (acct) writeCell(sheet, colOf, row.num, '환불계좌', acct);

  // 2) 운영자에게 송금 요청 메일 (계좌 포함)
  try { sendRefundRequestEmail(row, dateKey, time, acct); }
  catch (e) { notifyStudio('[상담] ⚠️오류 · 환불요청 메일 실패', names + ' · ' + e.message); }
  notifyKakao('admin.cancelRefund', String(row.get('개인코드') || '').trim(), { names: names, acct: acct });   // 관리자: 취소 — 환불 송금 필요(카톡)

  // 3) 고객에게 취소 완료 메일
  var to = row.get('이메일');
  if (to) { try { sendCancelEmail(to, names, dateKey, time); } catch (e2) {} }

  setCustomerStage(String(row.get('개인코드') || '').trim(), 'cancel');  // ★③ 고객 셀프취소도 동일 전이
  return infoPage('예약이 취소되었습니다',
    '취소가 정상 처리되었습니다.<br><br>입력해 주신 계좌로 예약금을 환불해 드리겠습니다.<br>(영업일 기준 수일 소요)<br><br>다시 찾아주실 때 언제든 편하게 모시겠습니다.', true);
}

// [자사몰 취소] 이메일 '여기' → momentedit.kr/cancel 가 token·sig로 호출(GAS HTML/구글 Drive 오류 우회). 정보조회 + 취소 처리 2종.
function handleEmailCancelInfo(body) {
  var token = String((body && body.token) || '').trim(), sig = String((body && body.sig) || '').trim();
  if (!verifySig(token, 'cancelreq', sig)) return { ok: false, error: '유효하지 않은 링크예요.' };
  var sheet = getSheet(), colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) return { ok: false, error: '예약 정보를 찾을 수 없어요.' };
  var status = String(row.get('상태') || '').trim();
  if (status === ST.CANCELLED) return { ok: true, state: 'cancelled', names: coupleNames(row) };
  if (LOCKED_STATES.indexOf(status) === -1) return { ok: true, state: 'none', names: coupleNames(row) };
  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  return { ok: true, state: withinCancelDeadline(dateKey, time) ? 'ok' : 'expired',
    names: coupleNames(row), date: prettyDate(dateKey), time: String(time || ''), deadlineLabel: deadlineLabel(),
    kakao: (CONFIG.KAKAO_URL && CONFIG.KAKAO_URL.charAt(0) !== '[') ? CONFIG.KAKAO_URL : '' };
}
function handleEmailCancel(body) {
  var token = String((body && body.token) || '').trim(), sig = String((body && body.sig) || '').trim();
  if (!verifySig(token, 'cancelreq', sig)) return { ok: false, error: '유효하지 않은 링크예요.' };
  var sheet = getSheet(), colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) return { ok: false, error: '예약 정보를 찾을 수 없어요.' };
  var status = String(row.get('상태') || '').trim();
  if (status === ST.CANCELLED) return { ok: true, already: true };
  if (LOCKED_STATES.indexOf(status) === -1) return { ok: false, error: '취소할 확정 예약이 없어요.' };
  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  if (!withinCancelDeadline(dateKey, time)) return { ok: false, error: '온라인 취소 기한(상담 ' + deadlineLabel() + ' 전)이 지났어요. 카카오톡으로 문의해 주세요.' };
  var acct = String((body && body.acct) || '').trim(), names = coupleNames(row);
  deleteCalendarEvent(sheet, colOf, row.num, names);
  writeCell(sheet, colOf, row.num, '상태', ST.CANCELLED);
  writeCell(sheet, colOf, row.num, '취소일시', new Date());
  if (acct) writeCell(sheet, colOf, row.num, '환불계좌', acct);
  try { sendRefundRequestEmail(row, dateKey, time, acct); } catch (e) { notifyStudio('[상담] ⚠️오류 · 환불요청 메일 실패', names + ' · ' + e.message); }
  notifyKakao('admin.cancelRefund', String(row.get('개인코드') || '').trim(), { names: names, acct: acct });
  var to = row.get('이메일'); if (to) { try { sendCancelEmail(to, names, dateKey, time); } catch (e2) {} }
  setCustomerStage(String(row.get('개인코드') || '').trim(), 'cancel');
  _releaseWeddingHoldOnCancel(String(row.get('개인코드') || '').trim());   // 이메일 취소도 가예약 해제(actCancel 미경유 경로)
  return { ok: true };
}

// ── 관리자 셀프 취소 (확정 메일의 [예약 취소] 버튼) ──────────────
// 관리자는 기한 제약 없이 언제든 취소 가능. 확인 화면 거친 뒤 실행.
function serveAdminCancelD(token, row) {
  var status = String(row.get('상태') || '').trim();
  if (status === ST.CANCELLED) {
    return infoPage('이미 취소된 예약입니다', coupleNames(row) + ' · 이미 취소 처리되었습니다.', true);
  }
  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  var names = coupleNames(row);
  var doUrl = actionUrl('admindocancel', token);
  var html =
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1.0,user-scalable=no">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400&family=Noto+Serif+KR:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&display=swap" rel="stylesheet">' +
    '<style>body{margin:0;background:#FAFAF8;color:#1C1B19;font-family:"Noto Sans KR",sans-serif;font-weight:300;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;word-break:keep-all}' +
    '.box{max-width:420px;width:100%;background:#fff;border:1px solid #DDD8D1;border-radius:12px;padding:42px 32px 30px;box-shadow:0 8px 30px rgba(28,27,25,.06)}' +
    '.brand{font-family:"Cormorant Garamond",serif;font-size:12px;letter-spacing:.34em;color:#3A2D22;text-transform:uppercase;text-align:center;margin-bottom:8px}' +
    '.admin-tag{text-align:center;font-family:"Cormorant Garamond",serif;font-style:italic;font-size:11px;color:#B89A75;letter-spacing:.1em;margin-bottom:16px}' +
    '.bar{width:40px;height:3px;background:#6B2A24;border-radius:3px;margin:0 auto 22px}' +
    '.t{font-family:"Noto Serif KR",serif;font-size:20px;font-weight:500;color:#3A2D22;text-align:center;margin-bottom:18px}' +
    '.card{background:#F7F5F1;border:1px solid #E6E1D8;border-radius:8px;padding:18px;text-align:center;margin-bottom:22px}' +
    '.card .ey{font-family:"Cormorant Garamond",serif;font-size:10px;letter-spacing:.22em;color:#B89A75;text-transform:uppercase;margin-bottom:8px}' +
    '.card .nm{font-family:"Noto Serif KR",serif;font-size:15px;font-weight:500;color:#3A2D22;margin-bottom:6px}' +
    '.card .dt{font-family:"Noto Serif KR",serif;font-size:16px;font-weight:600;color:#3A2D22}' +
    '.notice{font-size:12.5px;line-height:1.8;color:#5A554C;text-align:center;margin-bottom:24px}' +
    '.btns{display:flex;gap:10px}' +
    '.btn{flex:1;text-align:center;padding:14px 0;border-radius:6px;font-family:"Noto Serif KR",serif;font-size:14px;font-weight:500;cursor:pointer;text-decoration:none;display:block}' +
    '.btn-keep{background:#fff;color:#5A554C;border:1px solid #DDD8D1}' +
    '.btn-cancel{background:#6B2A24;color:#fff;border:none}</style></head>' +
    '<body><div class="box"><div class="brand">Moment Edit</div><div class="admin-tag">Admin</div><div class="bar"></div>' +
    '<div class="t">이 예약을 취소할까요?</div>' +
    '<div class="card"><div class="ey">Reservation</div><div class="nm">' + esc(names) + '</div><div class="dt">' + (dateKey ? prettyDate(dateKey) + ' · ' + esc(time) : '일정 미정') + '</div></div>' +
    '<div class="notice">취소하면 캘린더 일정이 삭제되고,<br>고객에게 취소 안내 메일이 발송됩니다.</div>' +
    '<div class="btns">' +
    '<a class="btn btn-keep" href="javascript:history.back()">유지</a>' +
    '<a class="btn btn-cancel" href="' + safeAttr(doUrl) + '" target="_top">취소 확정</a>' +
    '</div></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle('예약 취소 (관리자) · Moment Edit')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// 관리자 취소 확정 — 캘린더 삭제 + 상태=취소 + 고객 취소 안내 메일 (계좌 입력 없음)
function doAdminCancel(sheet, colOf, row) {
  var status = String(row.get('상태') || '').trim();
  if (status === ST.CANCELLED) {
    return infoPage('이미 취소되었습니다', '이 예약은 이미 취소 처리되었습니다.', true);
  }
  actCancel(sheet, colOf, row); // 캘린더삭제 + 상태=취소 + 취소일시 + 고객 취소안내 메일
  return infoPage('예약이 취소되었습니다',
    coupleNames(row) + ' 님의 예약이 취소되었습니다.<br>캘린더 일정이 삭제되고 고객에게 안내 메일이 발송되었습니다.', true);
}

// ============================ google.script.run 핸들러 ============================
// 화면 A 제출 → 행 추가(상태=신청접수) + 토큰 + 메일①(전용 URL)
// [P1.5] 인자 personalCode 추가 — handleSignup이 발급한 개인코드로 Customers·상담예약 두 행을 묶는다(★4 FK).
// 고객 일정링크 메일(sendUrlEmail)은 제거 — 접수 고객메일은 handleSignup의 sendSignupEmail 1통으로 통일(★5-a).
function submitApplication(form, personalCode) {
  var groom = String(form.groom || '').trim();
  var bride = String(form.bride || '').trim();
  var phone = String(form.phone || '').trim();
  var email = String(form.email || '').trim();
  var memo = String(form.memo || '').trim();
  var detail = String(form.detail || '').trim();   // 화면 A(문의폼)의 상세 신청내용

  // 허니팟(봇 차단): 숨김 필드(_gotcha)에 값이 차 있으면 자동입력 봇 → 조용히 무시(성공인 척)
  if (String(form.hp || '').trim()) { Logger.log('  (honeypot 걸림 — 봇 의심, 기록 생략)'); return { ok: true }; }

  if (!groom || !bride) throw new Error('성함을 입력해 주세요.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('이메일 주소를 정확히 입력해 주세요.');
  if (!phone) throw new Error('연락처를 입력해 주세요.');

  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var token = makeToken();
  var rowNum = sheet.getLastRow() + 1;
  if (rowNum < SYS.DATA_START_ROW) rowNum = SYS.DATA_START_ROW;

  writeCell(sheet, colOf, rowNum, '신청일시', new Date());
  writeCell(sheet, colOf, rowNum, '성함(신랑)', groom);
  writeCell(sheet, colOf, rowNum, '성함(신부)', bride);
  writeCell(sheet, colOf, rowNum, '연락처', phone);
  writeCell(sheet, colOf, rowNum, '이메일', email);
  writeCell(sheet, colOf, rowNum, '자유메모', memo);
  writeCell(sheet, colOf, rowNum, '토큰', token);
  writeCell(sheet, colOf, rowNum, '상태', ST.APPLIED);
  // ★4 FK — 개인코드(34열). Customers 행과 같은 코드로 묶는다.
  if (personalCode) writeCell(sheet, colOf, rowNum, '개인코드', String(personalCode).trim().toUpperCase());

  // 신청상세(detail)를 라벨별로 분리해 각 컬럼에 기록
  var parsed = parseDetail(detail);
  Object.keys(parsed).forEach(function (col) {
    writeCell(sheet, colOf, rowNum, col, parsed[col]);
  });

  // [P1.5 다이어트] 고객 일정링크 메일(sendUrlEmail) 제거 — 접수메일은 sendSignupEmail 1통(중복 방지).
  //   토큰은 위에서 기록됨(메일링크·ScreenB 진입·내부 보안축으로 계속 사용. getMyState가 scheduleUrl 조립).
  // ② 운영자 신규알림(sendNewInquiryEmail)은 비활성 유지 — 시간선택 시 sendAdminNotifyEmail이 최초 알림.
  return { ok: true, token: token };
}

// [P1.5 작업6] 슬롯 점유 재확인 — 같은 (선택날짜·선택시간)에 LOCKED(승인완료·확정)인 '다른' 행이 있나.
//   점유 기준 = (가) 좁게: LOCKED 만 차단. PICKED 중복은 허용(운영자 승인 게이트가 거름).
function _slotTaken(dateKey, time, exceptRowNum) {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < SYS.DATA_START_ROW) return false;
  var dCol = colOf['선택날짜'], tCol = colOf['선택시간'], sCol = colOf['상태'];
  var dk = normalizeDateKey(dateKey), tm = String(time || '').trim();
  if (!dk || !tm) return false;
  var vals = sheet.getRange(SYS.DATA_START_ROW, 1, last - SYS.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    var rn = SYS.DATA_START_ROW + i;
    if (rn === exceptRowNum) continue;                                   // 자기 행 제외
    if (LOCKED_STATES.indexOf(String(vals[i][sCol - 1]).trim()) === -1) continue;  // LOCKED 만
    if (normalizeDateKey(vals[i][dCol - 1]) === dk && String(vals[i][tCol - 1]).trim() === tm) return true;
  }
  return false;
}

// 화면 B 제출 → 선택 기록(상태=시간선택완료) + 미쿠 알림 메일②
function submitSchedule(token, dateKey, time, flexArr, etc, hold) {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) throw new Error('신청 정보를 찾을 수 없습니다.');
  if (String(row.get('상태') || '').trim() === ST.CANCELLED) throw new Error('취소된 예약입니다. 다시 진행을 원하시면 카카오톡으로 문의해 주세요.');
  if (isExpired(row.get('신청일시'))) throw new Error('전용 링크 유효기간이 지났습니다.');
  if (!dateKey || !time) throw new Error('날짜와 시간을 선택해 주세요.');

  // 제출된 시간이 그 날짜(요일)의 유효 슬롯인지 검증 — 잘못된 값 차단
  if (slotsForDate(dateKey).indexOf(time) === -1) {
    throw new Error('선택하신 시간은 예약 가능한 시간이 아닙니다. 다시 선택해 주세요.');
  }

  // 셀프 변경(확정 후 재방문) 시 24시간 전까지만 허용
  var status = row.get('상태');
  if (status === ST.CONFIRMED || status === ST.APPROVED) {
    var cur = parseDateTime(row.get('선택날짜'), row.get('선택시간'));
    if (cur && (cur.getTime() - Date.now()) < CONFIG.CONFIRM_DEADLINE_HOURS * 3600 * 1000) {
      throw new Error('상담 ' + deadlineLabel() + ' 전부터는 변경할 수 없습니다. 카카오톡으로 문의해 주세요.');
    }
  }

  // [임시고정 연동] 활성 가예약(요청/승인) 보유 시 상담일은 당기기만 허용 — '상담 7일 내 진행' 전제가 뒤로 밀리지 않게
  if (row.get('선택날짜')) {
    var _hc2 = findCustomerByCode(String(row.get('개인코드') || '').trim());
    var _hr2 = _hc2 ? _parseJsonSafe(_hc2.get('동의기록')).가예약 : null;
    var _newN = _dayNum(dateKey), _oldN = _dayNum(row.get('선택날짜'));
    if (_hr2 && (_hr2.status === '요청' || _hr2.status === '승인')
        && _newN != null && _oldN != null && _newN > _oldN) {
      throw new Error('예식일 임시 고정 중에는 상담일을 지금보다 뒤로 옮길 수 없어요. 더 이른 날짜를 선택하시거나, 마이페이지에서 임시 고정을 취소한 뒤 변경해 주세요.');
    }
  }

  var flex = Array.isArray(flexArr) ? flexArr.join(', ') : String(flexArr || '');

  // [P1.5 작업6] Lock + 점유 재확인 — 동시 제출 직렬화 + 이미 확정된 슬롯 차단(더블 확정 0)
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    if (_slotTaken(dateKey, time, row.num)) {
      return { ok: false, slotTaken: true, error: '방금 마감되었어요. 다른 시간을 선택해 주세요.' };
    }
    writeCell(sheet, colOf, row.num, '선택날짜', dateKey);
    writeCell(sheet, colOf, row.num, '선택시간', time);
    writeCell(sheet, colOf, row.num, '그외가능시간대', flex);
    writeCell(sheet, colOf, row.num, '기타희망시간', String(etc || '').slice(0, 60));
    writeCell(sheet, colOf, row.num, '상태', ST.PICKED);
    notifyKakao('admin.slotPicked', String(row.get('개인코드') || '').trim(), { names: coupleNames(row), date: dateKey, time: time });   // 관리자: 슬롯 선택됨 — 승인 필요(카톡)

    var mailOk = false, mailErrMsg = '';
    try {
      sendAdminNotifyEmail(row, dateKey, time, flex, String(etc || ''));
      mailOk = true;
    } catch (mailErr) {
      mailErrMsg = (mailErr && mailErr.message) || String(mailErr);
      Logger.log('❌ 관리자 알림 메일 실패: ' + mailErrMsg);
      // 남은 메일 할당량 함께 기록 (한도 초과 진단용)
      try { Logger.log('   남은 Gmail 할당량: ' + MailApp.getRemainingDailyQuota()); } catch (q) {}
      notifyStudio('[상담] ⚠️오류 · 관리자 알림 메일 발송 실패', coupleNames(row) + ' · ' + dateKey + ' ' + time + '\n' + mailErrMsg);
    }
    // [임시고정] 예식일 가예약 '요청' 저장(체크 시) — 슬롯 유효 + 미점유 + 상담일이 7일 이내일 때만. 관리자 승인 시 점유 확정. best-effort(본 예약은 영향 X).
    if (hold && hold.date && hold.slot) {
      try {
        // [7일 규칙 백스톱] 상담일이 오늘(KST)+7일 이후면 임시고정 미적용(클라이언트가 먼저 안내·차단 — 우회 대비)
        //   ※ dateKey는 'Y-M-D' 비패딩 — _dayNum으로 패딩 무관 비교(패딩 정규식을 쓰면 저장이 전부 스킵되는 버그)
        var _ckN = _dayNum(dateKey);
        var _t7 = String(_kstYmd(new Date())).match(/^(\d{4})-(\d{2})-(\d{2})$/);
        var _lim7 = new Date(+_t7[1], +_t7[2] - 1, +_t7[3] + 7);
        var _limN = _lim7.getFullYear() * 10000 + (_lim7.getMonth() + 1) * 100 + _lim7.getDate();
        if (_ckN == null || _ckN > _limN) throw new Error('hold-skip');
        var _hc = String(row.get('개인코드') || '').trim(), _hd = String(hold.date).trim(), _hs = String(hold.slot).trim();
        if (_hc && WEDDING_SLOT.SLOTS.indexOf(_hs) !== -1 && /^\d{4}-\d{2}-\d{2}$/.test(_hd)) {
          var _cs = getCustomersSheet(), _cco = buildHeaderIndex(_cs), _cust = findCustomerByCode(_hc);
          if (_cust && !_weddingSlotTaken(_cs, _cco, _hd, _hs, _hc)) {
            var _rec = _parseJsonSafe(_cust.get('동의기록')), _ex = _rec.가예약;
            if (!(_ex && _ex.status === '승인' && _ex.date === _hd && _ex.slot === _hs)) {   // 이미 승인된 동일 홀드면 보존(재제출이 승인→요청으로 되돌리지 않게)
              _rec.가예약 = { date: _hd, slot: _hs, status: '요청', at: fmtKST(new Date()) };
              touchCustomer(_cs, _cco, _cust.num, { '동의기록': JSON.stringify(_rec) });
              notifyKakao('admin.holdRequest', _hc, { date: _hd, slot: _hs });
            }
          }
        }
      } catch (e) {}
    }
    return { ok: true, mailOk: mailOk, mailErr: mailErrMsg };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// 화면 C 제출(미쿠) → 상태=변경제안 + 고객에게 제안 메일④
function submitProposal(token, sig, newDate, newTime, memo) {
  if (!verifySig(token, 'change', sig)) throw new Error('권한이 없습니다.');
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) throw new Error('예약을 찾을 수 없습니다.');
  newDate = String(newDate || '').trim();
  newTime = String(newTime || '').trim();
  if (!newDate || !newTime) throw new Error('새 날짜와 시간을 입력해 주세요.');

  writeCell(sheet, colOf, row.num, '변경제안날짜', newDate);
  writeCell(sheet, colOf, row.num, '변경제안시간', newTime);
  if (colOf['변경제안메모'] != null) writeCell(sheet, colOf, row.num, '변경제안메모', String(memo || ''));   // [Task12] 마이페이지 노출용(칼럼 있을 때만 — 없으면 무시)
  writeCell(sheet, colOf, row.num, '상태', ST.PROPOSED);

  try {
    sendProposalEmail(row, newDate, newTime, String(memo || ''));
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 변경 제안 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
  }
  return { ok: true };
}

// ─────────────────────────────────────────────────────────────────────────────
// [Task12] 변경제안메모 칼럼 자동 추가 — GAS 편집기에서 "한 번" 실행.
//   동작: '변경제안시간' 다음에 '변경제안메모' 칼럼 1개 삽입 + 텍스트 서식(@) + 너비 설정.
//   멱등: 이미 칼럼이 있으면 아무 일도 하지 않음 (재실행해도 안전).
//   ※ 직접 setupConsultation()을 다시 돌리는 것보다 안전(다른 칼럼·서식·필터에 영향 X).
// ─────────────────────────────────────────────────────────────────────────────
function addProposalMemoColumn() {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  if (colOf['변경제안메모'] != null) {
    Logger.log('이미 있음 — 작업 없음. (열 ' + colOf['변경제안메모'] + ')');
    return '이미 추가됨 (열 ' + colOf['변경제안메모'] + ')';
  }
  var afterCol = colOf['변경제안시간'];
  if (afterCol == null) throw new Error('"변경제안시간" 칼럼을 찾을 수 없습니다. setupConsultation()으로 시트 초기화가 되었는지 확인해 주세요.');
  sheet.insertColumnAfter(afterCol);                                            // '변경제안시간' 다음에 1칸 삽입
  var newCol = afterCol + 1;
  sheet.getRange(1, newCol).setValue('변경제안메모');                            // 헤더
  var lastRow = Math.max(1, sheet.getMaxRows() - 1);
  sheet.getRange(2, newCol, lastRow, 1).setNumberFormat('@');                   // 텍스트 서식 고정
  sheet.setColumnWidth(newCol, 240);
  Logger.log('"변경제안메모" 칼럼 추가 완료 (열 ' + newCol + ')');
  return 'OK · 추가됨 (열 ' + newCol + ')';
}

// ============================ STEP 9 · 캘린더 연동 ============================
// 가능일/마감 슬롯 계산 — 데모 isAvail()/FULL 대체
function getAvailability() {
  var avail = {}, full = {}, blockers = [];
  var cal = getCalendar();
  var now = new Date(); now.setHours(0, 0, 0, 0);
  var end = new Date(now); end.setDate(end.getDate() + SYS.SEARCH_DAYS);

  if (cal) {
    cal.getEvents(now, end).forEach(function (ev) {
      var title = ev.getTitle() || '';
      if (SYS.AVAIL_KEYWORD.test(title)) {
        // '상담가능' 일정이 걸친 날짜를 가능일로
        eachDate(ev.getStartTime(), ev.getEndTime(), ev.isAllDayEvent(), function (d) { avail[dkey(d)] = true; });
      } else {
        blockers.push(ev); // 예식 등 다른 일정 = 막는 일정
      }
    });
  }

  // 1) 이미 확정/승인된 예약 슬롯 → 마감
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last >= SYS.DATA_START_ROW) {
    var dCol = colOf['선택날짜'], tCol = colOf['선택시간'], sCol = colOf['상태'];
    var vals = sheet.getRange(SYS.DATA_START_ROW, 1, last - SYS.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
    vals.forEach(function (r) {
      var st = String(r[sCol - 1]).trim();   // 수기 입력 공백 방지 — 마감 슬롯이 빈 슬롯으로 새는 것 차단(다른 비교부와 일관)
      if (LOCKED_STATES.indexOf(st) === -1) return;
      var dk = normalizeDateKey(r[dCol - 1]);
      var tm = String(r[tCol - 1]).trim();
      if (dk && tm) addFull(full, dk, tm);
    });
  }

  // 2) 예식 등 캘린더 일정으로 막힌 슬롯 → 마감 / 종일 일정이면 그 날 제외
  blockers.forEach(function (ev) {
    if (ev.isAllDayEvent()) {
      eachDate(ev.getStartTime(), ev.getEndTime(), true, function (d) { delete avail[dkey(d)]; });
    }
  });
  Object.keys(avail).forEach(function (dk) {
    slotsForDate(dk).forEach(function (time) {
      var s = parseDateTime(dk, time);
      if (!s) return;
      var e2 = new Date(s.getTime() + CONFIG.SLOT_DURATION_MIN * 60000);
      for (var i = 0; i < blockers.length; i++) {
        if (blockers[i].isAllDayEvent()) continue;
        if (blockers[i].getStartTime() < e2 && blockers[i].getEndTime() > s) { addFull(full, dk, time); break; }
      }
    });
  });

  return { avail: Object.keys(avail), full: full };
}

// 가능일 조회는 캘린더 120일 쿼리(느림)이고 결과가 '전 사용자 공통'이라, 스크립트 캐시로 공유(짧은 TTL).
//   예약 확정/취소 등 슬롯 변동 시 _bustAvailCache()로 즉시 무효화. 캘린더 직접 편집은 TTL(90초)로 반영.
var AVAIL_CACHE_KEY = 'avail_v2';
function _cachedAvailability() {
  var c = null;
  try { c = CacheService.getScriptCache(); } catch (e) { c = null; }
  if (c) { try { var hit = c.get(AVAIL_CACHE_KEY); if (hit) return JSON.parse(hit); } catch (e) {} }
  var data = getAvailability();
  if (c) { try { c.put(AVAIL_CACHE_KEY, JSON.stringify(data), 90); } catch (e) {} }
  return data;
}
function _bustAvailCache() { try { CacheService.getScriptCache().remove(AVAIL_CACHE_KEY); } catch (e) {} }
// (선택·권장) 가능일 캐시 워밍 — 1분 트리거로 항상 데워두면 '첫 방문'도 즉시. setupAvailWarmTrigger() 1회 실행.
function warmAvailCache() { try { var d = getAvailability(); CacheService.getScriptCache().put(AVAIL_CACHE_KEY, JSON.stringify(d), 90); } catch (e) {} }
function setupAvailWarmTrigger() {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'warmAvailCache') ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('warmAvailCache').timeBased().everyMinutes(1).create();
  return '가능일 캐시 워밍 트리거(1분) 등록 완료 — 콜드 로딩 제거';
}

// 확정 예약을 캘린더 일정으로 생성/갱신 (미쿠가 한눈에 봄)
function syncCalendarEvent(sheet, colOf, rowNum, dateKey, time, names, phone) {
  var cal = getCalendar();
  if (!cal) return;
  var start = parseDateTime(dateKey, time);
  if (!start) return;
  var endT = new Date(start.getTime() + CONFIG.SLOT_DURATION_MIN * 60000);
  var title = SYS.EVENT_PREFIX + names;
  var desc = '상담 예약 (확정)\n' + names + '\n연락처: ' + (phone || '-');
  var existingId = row(sheet, colOf, rowNum).get('캘린더이벤트ID');
  try {
    if (existingId) {
      var ev = cal.getEventById(existingId);
      if (ev) { ev.setTime(start, endT); ev.setTitle(title); ev.setDescription(desc); return; }
    }
    var created = cal.createEvent(title, start, endT, { description: desc });
    writeCell(sheet, colOf, rowNum, '캘린더이벤트ID', created.getId());
  } catch (e) {
    notifyStudio('[상담] ⚠️오류 · 캘린더 일정 생성 실패', names + ' · ' + dateKey + ' ' + time + '\n' + e.message);
  }
}

// 캘린더 일정 삭제 (취소 시) — 저장된 이벤트ID로 그 일정만 정확히 제거. 성공하면 시트의 ID도 비움.
function deleteCalendarEvent(sheet, colOf, rowNum, names) {
  var existingId = row(sheet, colOf, rowNum).get('캘린더이벤트ID');
  if (!existingId) return false; // 지울 일정 없음
  var cal = getCalendar();
  if (!cal) return false;
  try {
    var ev = cal.getEventById(existingId);
    if (ev) ev.deleteEvent();
    writeCell(sheet, colOf, rowNum, '캘린더이벤트ID', ''); // ID 비움 (재삭제·오작동 방지)
    return true;
  } catch (e) {
    notifyStudio('[상담] ⚠️오류 · 캘린더 일정 삭제 실패', (names || '') + '\n' + e.message);
    return false;
  }
}
// 메일① — 전용 URL (신청 즉시, 고객) · "신청 접수"(확정 아님)
function sendUrlEmail(to, names, url, summary) {
  var summaryBlock = (summary && String(summary).trim())
    ? '<div style="margin:14px auto 0;max-width:380px;text-align:center;font-family:\'Noto Sans KR\',sans-serif;font-size:12px;color:#8A8475;line-height:1.7">신청 내용 · ' + esc(summary) + '</div>'
    : '';
  var inner =
    '<p style="font-family:\'Noto Serif KR\',serif;font-size:15px;line-height:1.9;font-weight:400;text-align:center;color:#3A2D22;margin:20px 0 0">' +
      esc(names) + ' 님,<br>대면 상담 신청이 <span style="color:#B89A75;font-weight:500">접수</span>되었습니다.' +
    '</p>' +
    summaryBlock +
    '<div style="margin:16px auto 0;max-width:300px;padding:10px 0;border-top:1px solid rgba(184,154,117,0.4);border-bottom:1px solid rgba(184,154,117,0.4);text-align:center;font-family:\'Noto Serif KR\',serif;font-size:12px;font-weight:400;color:#8A7A5E;letter-spacing:0.02em">' +
      '아직 예약이 확정된 것은 아닙니다' +
    '</div>' +
    '<p style="font-family:\'Noto Serif KR\',serif;font-size:13.5px;line-height:1.85;font-weight:400;text-align:center;color:#5A554C;margin:18px 0 0">' +
      '아래에서 원하시는 날짜와 시간을<br>선택해 주세요.' +
    '</p>' +
    '<div style="text-align:center;margin:28px 0 0;">' +
      '<a href="' + safeAttr(url) + '" style="display:inline-block;min-width:220px;padding:17px 40px;background:#B89A75;color:#FFFFFF;font-family:\'Noto Serif KR\',serif;font-size:14px;font-weight:500;letter-spacing:0.08em;text-decoration:none;border-radius:4px;box-shadow:0 4px 14px rgba(184,154,117,0.32)">일정 선택하기</a>' +
    '</div>' +
    '<p style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;letter-spacing:0.08em;text-align:center;color:#A39C8E;margin:16px 0 0">신청자 전용 링크 · ' + CONFIG.URL_VALID_DAYS + ' days valid</p>' +
    '<div style="margin:26px auto 0;max-width:440px;text-align:center">' +
      '<details style="text-align:center">' +
        '<summary style="cursor:pointer;list-style:none;font-family:\'Noto Serif KR\',serif;font-size:11px;font-weight:400;color:#A39C8E;letter-spacing:0.02em;outline:none">버튼이 열리지 않나요?</summary>' +
        '<div style="margin-top:10px;padding:12px 14px;background:#F5F3EF;border:1px solid #E2DCD2;border-radius:4px">' +
          '<div style="font-size:10px;color:#8A8475;margin-bottom:6px;font-family:\'Noto Sans KR\',sans-serif">아래 주소를 복사해 브라우저에 붙여넣어 주세요</div>' +
          '<a href="' + safeAttr(url) + '" style="font-size:10px;color:#6E6557;word-break:break-all;text-decoration:none;line-height:1.6;font-family:monospace">' + esc(url) + '</a>' +
        '</div>' +
      '</details>' +
    '</div>';
  GmailApp.sendEmail(to, '[Moment Edit] 상담 일정을 선택해 주세요 (신청 접수)', '',
    { htmlBody: emailShell('상담 신청이 접수되었습니다', inner), name: SYS.FROM_NAME });
}

// ② 신규 신청 즉시 — 관리자(미쿠)에게 정리된 요약 메일 (한눈에)
// 값 있을 때만 infoRow (빈 항목·'—' 자동 숨김)
function infoRowIf(label, val) {
  var v = (val == null) ? '' : String(val).trim();
  if (!v || v === '—') return '';
  return infoRow(label, esc(v));
}
// 연락처 → tel 링크 (모바일에서 탭하면 전화)
function telLink(phone) {
  var p = String(phone || '').trim();
  if (!p) return '—';
  var num = p.replace(/[^0-9+]/g, '');
  return '<a href="tel:' + num + '" style="color:#3A2D22;text-decoration:none;border-bottom:1px solid #DDD3C2">' + esc(p) + '</a>';
}
// 이메일 → mailto 링크
function mailLink(email) {
  var e = String(email || '').trim();
  if (!e) return '—';
  return '<a href="mailto:' + esc(e) + '" style="color:#3A2D22;text-decoration:none;border-bottom:1px solid #DDD3C2">' + esc(e) + '</a>';
}
// 하객 값 — '초과' 포함 시 빨간 강조
function guestValue(v) {
  var s = String(v || '').trim();
  if (!s || s === '—') return '';
  if (/초과/.test(s)) {
    return '<span style="color:#8C3F38;font-weight:600">' + esc(s) + '</span>';
  }
  return esc(s);
}

// 고객 노출용 — '(⚠ 권장 정원 초과)' 류 운영자 경고 꼬리표를 떼고 인원 숫자만 남김
function stripGuestFlag(v) {
  return String(v || '')
    .replace(/\s*\(?[⚠️!\s]*권장\s*정원\s*초과\)?/g, '')
    .trim();
}

// 운영자 메일용 — 시트 row에서 신청상세 전체를 읽어 정리 블록 생성 (상담 준비용)
function applicantDetailRows(row) {
  var out = '';
  out += infoRowIf('알게된 경로', row.get('경로'));
  out += infoRowIf('예식 일자', row.get('예식일자'));
  out += infoRowIf('요일', row.get('요일'));
  out += infoRowIf('시간대', row.get('시간대'));
  // 하객 — 초과 시 빨간 강조
  var guest = guestValue(row.get('하객'));
  if (guest) out += infoRow('하객', guest);
  out += infoRowIf('디지털 참석', row.get('디지털참석'));
  out += infoRowIf('의상', row.get('의상'));
  out += infoRowIf('분위기·스냅', row.get('분위기·스냅'));
  out += infoRowIf('중요하게 여김', row.get('중요하게여김'));
  out += infoRowIf('망설이는 점', row.get('망설이는점'));
  out += infoRowIf('준비 상황', row.get('준비상황'));
  out += infoRowIf('참고 링크', row.get('참고링크'));
  var memo = row.get('자유메모');
  if (memo && String(memo).trim()) out += infoRow('자유 메모', esc(memo).replace(/\n/g, '<br>'));
  return out;
}
// 섹션 소제목 (운영자 메일 구획)
function sectionLabel(txt) {
  return '<div style="font-family:\'Cormorant Garamond\',serif;font-size:11px;letter-spacing:.18em;text-transform:uppercase;color:#B89A75;text-align:center;margin:26px 0 4px">' + esc(txt) + '</div>';
}

function sendNewInquiryEmail(groom, bride, phone, email, memo, parsed) {
  if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') {
    Logger.log('  (ADMIN_EMAIL 미설정 — 신규 신청 알림 건너뜀)'); return;
  }
  var names = groom + ' · ' + bride;
  var rows = infoRow('성함', esc(names)) + infoRow('연락처', telLink(phone)) + infoRow('이메일', mailLink(email));
  // 신청상세 항목들을 보기 좋은 순서로
  var order = ['경로','예식일자','요일','시간대','하객','디지털참석','의상','분위기·스냅','중요하게여김','망설이는점','준비상황','참고링크'];
  order.forEach(function (k) {
    if (parsed[k] && parsed[k] !== '—') rows += infoRow(k, esc(parsed[k]));
  });
  if (memo) rows += infoRow('자유 메모', esc(memo).replace(/\n/g, '<br>'));
  var inner =
    centerP('새 상담 신청이 접수되었습니다.') +
    '<div style="background:#F7F5F1;padding:6px 20px;border:1px solid #E6E1D8;border-radius:6px;margin:22px 0;">' + rows + '</div>' +
    smallP('고객에게는 일정 선택 링크가 자동 발송되었습니다. 고객이 날짜·시간을 선택하면 [승인] 메일을 다시 받으십니다.');
  CONFIG.SEND_ADMIN_MAIL && GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('①신규', names), '',
    { htmlBody: emailShell('새 상담 신청', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// 메일② — 새 신청 알림 (시간선택완료, 미쿠) · [승인]/[변경제안] 버튼
function sendAdminNotifyEmail(row, dateKey, time, flex, etc) {
  if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') {
    Logger.log('  (ADMIN_EMAIL 미설정 — 미쿠 알림 건너뜀)'); return;
  }
  var token = row.get('토큰');
  var approveUrl = actionUrl('approve', token);
  var changeUrl = actionUrl('change', token);
  // 하객 초과 등 상단 플래그
  var guestRaw = String(row.get('하객') || '');
  var flag = /초과/.test(guestRaw)
    ? '<div style="text-align:center;margin:18px 0 0"><span style="display:inline-block;padding:5px 14px;background:#F7ECEA;border:1px solid #E4C9C5;border-radius:16px;font-family:\'Noto Sans KR\',sans-serif;font-size:11px;color:#8C3F38;font-weight:600">⚠ 하객 권장 정원 초과 — ' + esc(guestRaw) + '</span></div>'
    : '';
  var scheduleRows =
    infoRow('성함', coupleNames(row)) +
    infoRow('연락처', telLink(row.get('연락처'))) +
    infoRow('이메일', mailLink(row.get('이메일'))) +
    infoRowIf('그 외 가능 시간대', flex) +
    infoRowIf('기타 희망시간', etc);
  var detailRows = applicantDetailRows(row);
  var inner =
    centerP('새 상담 신청이 들어왔습니다.') +
    // ① 핵심: 일정 카드 + 결정 버튼을 위로
    dateCard('Requested', prettyDate(dateKey), esc(time)) +
    flag +
    '<p style="font-family:\'Noto Sans KR\',sans-serif;font-size:12px;color:#A4564E;text-align:center;margin:18px 0 12px;">⚠️ <b style="color:#8C3F38">입금 확인 후</b> 승인해 주세요.</p>' +
    emailBtn(approveUrl, '✓ 승인하기') +
    emailBtnOutline(changeUrl, '시간 변경 제안') +
    // ② 상세는 아래로
    sectionLabel('Contact · 고객') +
    '<div style="background:#F7F5F1;padding:6px 20px;border:1px solid #E6E1D8;border-radius:6px;margin:6px 0 0;">' + scheduleRows + '</div>' +
    sectionLabel('Application · 신청 내용') +
    '<div style="background:#FCFBF9;padding:6px 20px;border:1px solid #ECE8E1;border-radius:6px;margin:6px 0 0;">' + (detailRows || infoRow('내용', '—')) + '</div>' +
    smallP('승인하면 고객에게 확정 메일이 발송되고, 캘린더에 일정이 등록됩니다.');
  CONFIG.SEND_ADMIN_MAIL && GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('②승인요청', row, dateKey, time), '',
    { htmlBody: emailShell('새 상담 신청', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// 메일③/⑤ — 예약 확정 (승인/수락, 고객) · ★완료 · 정확한 주소·준비안내
function sendConfirmEmail(to, names, dateKey, time, isChange, token) {
  if (!CONFIG.SEND_CONFIRM_MAIL) return;  // [P1.5] 기본 OFF — 마이페이지가 확정 상태를 대체
  var head = isChange ? '예약이 변경·확정되었습니다' : '예약이 확정되었습니다';
  var cancelLine = token
    ? smallP('예약 취소가 필요하시면 <a href="' + safeAttr(cancelPageUrl(token)) + '" style="color:#6B2A24;font-weight:500">여기</a>에서 진행하실 수 있습니다. (상담 ' + deadlineLabel() + ' 전까지)')
    : '';
  var inner =
    centerP(esc(names) + ' 님,<br>대면 상담 <b style="color:#B89A75;font-weight:600">예약이 확정</b>되었습니다.') +
    dateCard('Confirmed', prettyDate(dateKey), esc(time)) +
    infoBlock([
      ['장소', placeValue()],
      ['소요 시간', '약 ' + CONFIG.SLOT_DURATION_MIN + '분 · 두 분 함께 방문 권장'],
      ['준비물', '특별한 준비물은 없습니다. 편하게 와 주세요.'],
      ['변경 · 취소', '상담 ' + deadlineLabel() + ' 전까지 가능하며, 이후 예약금은 반환되지 않습니다.']
    ]) +
    emailBtnOutline(gcalUrl('Moment Edit 상담 · ' + names, dateKey, time, CONFIG.SLOT_DURATION_MIN), '내 캘린더에 추가') +
    smallP('일정 변경이 필요하시면 받으셨던 전용 링크에서 다시 선택하시거나, <a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#B89A75;font-weight:500">카카오톡</a>으로 문의해 주세요.') +
    cancelLine;
  GmailApp.sendEmail(to, '[Moment Edit] 상담 예약이 확정되었습니다 · ' + prettyDate(dateKey) + ' ' + time, '',
    { htmlBody: emailShell(head, inner), name: SYS.FROM_NAME });
}

// 취소 안내 (고객) — 예약 취소 시 발송. 차분한 안내 + 재예약/문의 경로.
function sendCancelEmail(to, names, dateKey, time) {
  if (!CONFIG.SEND_CANCEL_MAIL) return;  // [P1.5] 기본 OFF — 마이페이지가 취소 상태를 대체
  var when = dateKey ? (prettyDate(dateKey) + (time ? ' · ' + esc(time) : '')) : '';
  var inner =
    centerP(esc(names) + ' 님,<br>아래 상담 예약이 <b style="color:#6B2A24;font-weight:600">취소</b>되었습니다.') +
    (when ? dateCard('Cancelled', prettyDate(dateKey), esc(time)) : '') +
    noteP('다시 찾아주실 때 언제든 편하게 일정을 잡아드리겠습니다.') +
    emailBtnOutline((CONFIG.FORM_URL && CONFIG.FORM_URL.charAt(0) !== '[') ? CONFIG.FORM_URL : webAppUrl(), '다시 예약하기') +
    smallP('문의 사항이 있으시면 <a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#B89A75;font-weight:500">카카오톡</a>으로 연락 주세요.');
  GmailApp.sendEmail(to, '[Moment Edit] 상담 예약이 취소되었습니다' + (when ? ' · ' + prettyDate(dateKey) : ''), '',
    { htmlBody: emailShell('예약 취소 안내', inner), name: SYS.FROM_NAME });
}

// 운영자 송금 요청 (고객 셀프 취소 시) — 환불 계좌·금액 포함. contact@ + cc(미쿠·희준).
function sendRefundRequestEmail(row, dateKey, time, acct) {
  if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') return;
  var names = coupleNames(row);
  var depositTxt = (CONFIG.DEPOSIT ? (Number(CONFIG.DEPOSIT).toLocaleString() + '원') : '예약금');
  var rows =
    infoRow('성함', names) +
    infoRow('연락처', telLink(row.get('연락처'))) +
    infoRow('취소된 일정', '<b style="color:#3A2D22">' + (dateKey ? prettyDate(dateKey) + ' · ' + esc(time) : '—') + '</b>') +
    infoRow('환불 금액', '<b style="color:#6B2A24">' + depositTxt + '</b>') +
    infoRow('환불 계좌', '<b style="color:#3A2D22;font-size:15px">' + (acct ? esc(acct) : '— (미입력)') + '</b>');
  var inner =
    centerP('고객이 예약을 취소했습니다.<br>아래 계좌로 <b style="color:#6B2A24;font-weight:600">예약금 환불</b>을 진행해 주세요.') +
    '<div style="background:#FBF7F2;padding:6px 20px;border:1px solid #E8DCCB;border-radius:6px;margin:18px 0 0;">' + rows + '</div>' +
    smallP('캘린더 일정은 자동 삭제되었고, 고객에게는 취소 완료 안내가 발송되었습니다.');
  CONFIG.SEND_ADMIN_MAIL && GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('⚠️환불요청', row, dateKey, time), '',
    { htmlBody: emailShell('예약 취소 · 환불 요청', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// 메일③(운영자) — 예약 확정 시 contact@ 로 "상담 준비 브리프" (이 메일 1장 = 상담 준비 끝)
function sendStudioBriefEmail(row, dateKey, time) {
  if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') return;
  var scheduleRows =
    infoRow('성함', coupleNames(row)) +
    infoRow('연락처', telLink(row.get('연락처'))) +
    infoRow('이메일', mailLink(row.get('이메일'))) +
    infoRow('확정 일정', '<b style="color:#3A2D22">' + prettyDate(dateKey) + ' · ' + esc(time) + '</b>');
  var detailRows = applicantDetailRows(row);
  var token = row.get('토큰');
  var adminCancelBtn = token
    ? emailBtnOutline(actionUrl('admincancelreq', token), '이 예약 취소하기')
    : '';
  var inner =
    centerP('상담 예약이 확정되었습니다.<br>이 메일 하나로 준비를 마치실 수 있습니다.') +
    dateCard('Confirmed', prettyDate(dateKey), esc(time)) +
    sectionLabel('Contact · 고객') +
    '<div style="background:#F7F5F1;padding:6px 20px;border:1px solid #E6E1D8;border-radius:6px;margin:6px 0 0;">' + scheduleRows + '</div>' +
    sectionLabel('Application · 신청 내용') +
    '<div style="background:#FCFBF9;padding:6px 20px;border:1px solid #ECE8E1;border-radius:6px;margin:6px 0 0;">' + (detailRows || infoRow('내용', '—')) + '</div>' +
    smallP('고객에게 확정 메일이 발송되고 캘린더에 일정이 등록되었습니다.') +
    adminCancelBtn;
  CONFIG.SEND_ADMIN_MAIL && GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('③확정', row, dateKey, time), '',
    { htmlBody: emailShell('상담 준비 브리프', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// 메일④ — 시간 변경 제안 (변경제안, 고객) · [수락]/[다른 시간 보기]
function sendProposalEmail(row, newDate, newTime, memo) {
  if (!CONFIG.SEND_CHANGE_MAIL) return;  // [P1.5] 기본 OFF — 마이페이지가 변경제안을 대체
  var token = row.get('토큰');
  var acceptUrl = actionUrl('accept', token);
  var reselectUrl = actionUrl('reselect', token);
  var inner =
    centerP(coupleNames(row) + ' 님,<br>선택하신 시간이 어려워 <b style="color:#B89A75;font-weight:600">다른 시간을 제안</b>드립니다.') +
    (function(){
      var od = row.get('선택날짜'), ot = row.get('선택시간');
      if (!od || !ot) return '';
      return '<p style="font-family:\'Noto Sans KR\',sans-serif;font-size:12px;color:#A39C8E;text-align:center;margin:16px 0 0">기존 선택 <span style="text-decoration:line-through">' + prettyDate(od) + ' · ' + esc(ot) + '</span></p>';
    })() +
    dateCard('Proposed', prettyDate(newDate), esc(newTime)) +
    (memo ? noteP(esc(memo)) : '') +
    emailBtn(acceptUrl, '이 시간으로 수락') +
    emailBtnOutline(reselectUrl, '다른 시간 보기') +
    smallP('수락하시면 예약이 확정되며, 확정 메일을 다시 보내드립니다.');
  GmailApp.sendEmail(row.get('이메일'), '[Moment Edit] 상담 시간 변경 제안 · ' + prettyDate(newDate) + ' ' + newTime, '',
    { htmlBody: emailShell('상담 시간 변경 제안', inner), name: SYS.FROM_NAME });
}

// ============================ 메일 HTML 헬퍼 (브랜드 톤 · 참고 .gs 재사용) ============================
// [최초 라이트 디자인] 베이지 배경 + 흰 카드(로고·본문·푸터 포함) + 다크모드 방어(color-scheme:only light·prefers-dark 고정·data-ogs 복원).
//   아이폰 기본 메일·Outlook은 라이트 고정. Gmail 등 강제 변환 앱은 발신자가 못 막는 영역 — 버튼은 변환에 강한 골드 톤 유지.
function emailShell(headline, innerHtml) {
  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Noto+Serif+KR:wght@300;400;500;600&display=swap" rel="stylesheet"><style>@import url(\'https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,500&family=Noto+Serif+KR:wght@300;400;500;600&display=swap\');:root{color-scheme:only light;supported-color-schemes:only light}html,body{color-scheme:only light}body{margin:0;padding:0;background:#FAFAF8 !important}.me-card{padding:46px 38px}@media only screen and (max-width:600px){.me-card{padding:36px 22px !important}}@media (prefers-color-scheme:dark){body,.me-bg{background:#FAFAF8 !important}.me-card{background:#FFFFFF !important;color:#3A2D22 !important}}[data-ogsb] body,[data-ogsb] .me-bg{background:#FAFAF8 !important}[data-ogsb] .me-card{background:#FFFFFF !important}[data-ogsc] .me-card{color:#3A2D22 !important}</style></head>' +
    '<body bgcolor="#FAFAF8" style="margin:0;padding:0;background:#FAFAF8;color-scheme:only light;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8;width:100%;"><tr><td align="center" bgcolor="#FAFAF8" class="me-bg" style="background:#FAFAF8;padding:32px 16px;">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid #DDD8D1;border-radius:10px;"><tr><td bgcolor="#FFFFFF" class="me-card" style="background:#FFFFFF;border-radius:10px;padding:46px 38px;font-family:\'Noto Serif KR\',serif;color:#3A2D22;">' +
      '<div style="text-align:center;margin-bottom:24px;"><img src="https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/logogold.png" alt="Moment Edit" width="210" style="width:210px;max-width:66%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;"></div>' +
      '<p style="font-family:\'Noto Serif KR\',serif;font-size:20px;font-weight:500;text-align:center;color:#3A2D22;margin:0 0 8px">' + esc(headline) + '</p>' +
      innerHtml +
      '<div style="border-top:1px solid #ECE8E1;margin-top:32px;padding-top:20px;text-align:center;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#B89A75;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:10px;font-size:10px;letter-spacing:.04em;color:#A39C8E;">Moment Edit · Private Wedding Studio</div>' +
    '</td></tr></table>' +
    '</td></tr></table></body></html>';
}
function emailBtn(url, label, color) {
  // 기본 베이지(#B89A75 — 브랜드 공용 톤) — 중간 톤이라 강제 다크 변환에도 거의 그대로 유지됨(버건디·딥브라운은 다크에서 깨짐)
  var bg = color || '#B89A75';
  return '<div style="text-align:center;margin:16px 0;"><a href="' + safeAttr(url) + '" style="display:inline-block;min-width:210px;padding:16px 34px;background:' + bg + ';color:#FFFFFF;font-family:\'Noto Serif KR\',serif;font-size:14px;font-weight:500;letter-spacing:.06em;text-decoration:none;border-radius:4px;box-shadow:0 3px 10px rgba(184,154,117,0.30);">' + esc(label) + '</a></div>';
}
function emailBtnOutline(url, label) {
  return '<div style="text-align:center;margin:10px 0 0;"><a href="' + safeAttr(url) + '" style="display:inline-block;min-width:210px;padding:14px 34px;background:#FFFFFF;color:#8A7A5E;font-family:\'Noto Serif KR\',serif;font-size:13.5px;font-weight:500;letter-spacing:.06em;text-decoration:none;border:1px solid #CDBFA6;border-radius:4px;">' + esc(label) + '</a></div>';
}
function centerP(html) { return '<p style="font-family:\'Noto Serif KR\',serif;font-size:15px;line-height:1.9;font-weight:400;text-align:center;color:#3A2D22;margin:18px 0 0;word-break:keep-all">' + html + '</p>'; }
function noteP(html) { return '<p style="font-family:\'Noto Serif KR\',serif;font-size:13px;line-height:1.8;color:#5A554C;text-align:center;margin:14px 0 0;word-break:keep-all">' + html + '</p>'; }
function smallP(html) { return '<p style="font-family:\'Noto Sans KR\',sans-serif;font-size:12px;line-height:1.8;color:#75705F;text-align:center;margin:20px 0 0;word-break:keep-all">' + html + '</p>'; }
function infoRow(label, valHtml) {
  return '<div style="display:block;padding:11px 0;border-bottom:1px solid #ECE8E1"><span style="font-family:\'Noto Sans KR\',sans-serif;font-size:11px;letter-spacing:.02em;color:#A39C8E">' + esc(label) + '</span><br><span style="font-family:\'Noto Serif KR\',serif;font-size:14px;color:#3A2D22;line-height:1.6">' + valHtml + '</span></div>';
}
function infoBlock(pairs) {
  var rows = pairs.map(function (p) {
    return '<div style="padding:12px 0;border-bottom:1px solid #ECE8E1"><div style="font-family:\'Noto Sans KR\',sans-serif;font-size:11px;letter-spacing:.04em;color:#B89A75;margin-bottom:3px">' + esc(p[0]) + '</div><div style="font-family:\'Noto Serif KR\',serif;font-size:13px;line-height:1.75;color:#5A554C">' + p[1] + '</div></div>';
  }).join('');
  return '<div style="margin:6px 0 0">' + rows + '</div>';
}

// 날짜·시간 카드 (메일 주인공 정보 — 날짜 크게, 시간 pill)
function dateCard(eyebrow, dateStr, timeStr) {
  return '<div style="background:#F7F5F1;padding:24px 20px;border:1px solid #E6E1D8;border-radius:8px;margin:24px 0;text-align:center">' +
    '<div style="font-family:\'Cormorant Garamond\',serif;font-size:11px;letter-spacing:.22em;color:#B89A75;text-transform:uppercase;margin-bottom:12px">' + esc(eyebrow) + '</div>' +
    '<div style="font-family:\'Noto Serif KR\',serif;font-size:23px;font-weight:600;color:#3A2D22;line-height:1.3;letter-spacing:.01em">' + esc(dateStr) + '</div>' +
    '<div style="display:inline-block;margin-top:12px;padding:6px 18px;background:#FFFFFF;border:1px solid #DDD3C2;border-radius:20px;font-family:\'Noto Serif KR\',serif;font-size:14px;font-weight:500;color:#8A7A5E;letter-spacing:.06em">' + esc(timeStr) + '</div>' +
  '</div>';
}

// 구글 캘린더 "일정 추가" 링크 (고객이 본인 캘린더에 추가)
function gcalUrl(title, dateKey, time, durationMin) {
  var st = parseDateTime(dateKey, time);
  if (!st) return '';
  var en = new Date(st.getTime() + (durationMin || 40) * 60000);
  function fmt(d) {
    function p(n){ return (n<10?'0':'') + n; }
    return d.getFullYear() + p(d.getMonth()+1) + p(d.getDate()) + 'T' + p(d.getHours()) + p(d.getMinutes()) + '00';
  }
  var loc = (CONFIG.STUDIO_ADDRESS && String(CONFIG.STUDIO_ADDRESS).charAt(0) !== '[') ? CONFIG.STUDIO_ADDRESS : 'Moment Edit';
  return 'https://calendar.google.com/calendar/render?action=TEMPLATE'
    + '&text=' + encodeURIComponent(title)
    + '&dates=' + fmt(st) + '/' + fmt(en)
    + '&location=' + encodeURIComponent(loc)
    + '&ctz=Asia/Seoul';
}
// 장소 표시값 — 주소 설정 전엔 안내형, 설정되면 주소 + 길찾기
function placeValue() {
  var addr = CONFIG.STUDIO_ADDRESS;
  if (!addr || String(addr).charAt(0) === '[') {
    return '확정 후 별도 안내드립니다. 방문 시 카카오톡으로 연락 주시면 바로 안내해 드려요.';
  }
  var mapUrl = 'https://map.kakao.com/?q=' + encodeURIComponent(addr);
  return esc(addr) + '<br><a href="' + safeAttr(mapUrl) + '" style="color:#B89A75;font-weight:500;text-decoration:none;font-size:12px">지도에서 보기 →</a>';
}

// ============================ 헬퍼 (참고 .gs 패턴) ============================
function getSheet() {
  var sh = SpreadsheetApp.getActive().getSheetByName(SYS.SHEET_NAME);
  if (!sh) throw new Error("시트 없음: '" + SYS.SHEET_NAME + "' — setupConsultation()을 먼저 실행하세요.");
  return sh;
}
function getCalendar() {
  if (!CONFIG.CALENDAR_ID || CONFIG.CALENDAR_ID.charAt(0) === '[') {
    Logger.log('  (CALENDAR_ID 미설정 — 캘린더 연동 생략)'); return null;
  }
  try { return CalendarApp.getCalendarById(CONFIG.CALENDAR_ID); }
  catch (e) { Logger.log('  (캘린더 열기 실패: ' + e.message + ')'); return null; }
}

// ── 메일 진단 (편집기에서 직접 실행) ───────────────────────────
// 메일이 안 올 때 원인 파악용. ▶실행 후 실행 로그 확인.
function diagnoseEmail() {
  Logger.log('=== 메일 진단 ===');
  // 1) 남은 일일 할당량 (0이면 한도 초과 → 메일 안 감)
  var quota = '?';
  try { quota = MailApp.getRemainingDailyQuota(); } catch (e) { quota = '확인 실패: ' + e.message; }
  Logger.log('남은 Gmail 일일 할당량: ' + quota + '  (0이면 오늘 더 못 보냄 — 내일 리셋)');

  // 2) ADMIN_EMAIL 설정 확인
  Logger.log('ADMIN_EMAIL: ' + CONFIG.ADMIN_EMAIL);
  Logger.log('cc 대상: ' + (adminCc() || '(없음)'));

  // 3) 실제 테스트 메일 1통 발송 시도
  try {
    GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, '[Moment Edit] 메일 진단 테스트',
      '이 메일이 보이면 발송 자체는 정상입니다. (' + new Date() + ')',
      { name: SYS.FROM_NAME, cc: adminCc() });
    Logger.log('✅ 테스트 메일 발송 성공 → ' + CONFIG.ADMIN_EMAIL + ' 확인하세요.');
  } catch (sendErr) {
    Logger.log('❌ 테스트 메일 발송 실패: ' + ((sendErr && sendErr.message) || sendErr));
    Logger.log('   → 할당량이 0이거나 권한 문제일 수 있습니다.');
  }
  return '진단 완료 — 실행 로그를 확인하세요.';
}


// ────────────────────────────────────────────────────────────
// 수동 취소 (편집기에서 실행) — 시트 행 번호를 넣고 ▶실행.
// 캘린더 일정 삭제 + 고객 취소 메일 + 상태=취소 기록.
// 사용법: 아래 TARGET_ROW 를 취소할 시트 행 번호(예: 5)로 바꾸고 cancelByRow 실행.
// ────────────────────────────────────────────────────────────
function cancelByRow() {
  var TARGET_ROW = 0; // ← 여기에 취소할 시트 행 번호를 입력 후 실행 (예: 5)

  if (!TARGET_ROW || TARGET_ROW < SYS.DATA_START_ROW) {
    Logger.log('⚠️ TARGET_ROW에 올바른 행 번호를 입력하세요 (데이터는 ' + SYS.DATA_START_ROW + '행부터).');
    return;
  }
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  if (TARGET_ROW > sheet.getLastRow()) {
    Logger.log('⚠️ 그런 행이 없습니다. 마지막 행: ' + sheet.getLastRow());
    return;
  }
  var r = row(sheet, colOf, TARGET_ROW);
  var names = coupleNames(r);
  var when = (r.get('선택날짜') ? prettyDate(r.get('선택날짜')) : '날짜미정') + ' ' + (r.get('선택시간') || '');
  Logger.log('취소 진행: ' + TARGET_ROW + '행 · ' + names + ' · ' + when);
  actCancel(sheet, colOf, r);
  Logger.log('✅ 취소 완료 — 캘린더 일정 삭제 + 취소 메일 발송(이메일 있을 시) + 상태=취소');
}

// ============================================================
// 상담가능일 자동 생성 — 캘린더에 '상담가능' 종일 일정을 깔아둠
//   · 슬롯 시간은 요일에 따라 자동 적용 (평일 4타임 / 주말 1타임 = CONFIG)
//   · 이미 그 날 '상담가능' 일정이 있으면 건너뜀 → 여러 번 실행해도 중복 안 생김
//
// [실행법] Apps Script 편집기 상단 함수 선택창에서 함수 고르고 ▶ 실행
//   · seedWeekdaySlots()          → 오늘부터 8주치 평일 생성
//   · seedWeekendSlots()          → 오늘부터 8주치 주말 생성
//   · seedAllDaysUntil2027()      → 2027-12-31 까지 평일+주말 전부 생성 ★
//   · seedWeekdaySlotsUntil2027() → 2027-12-31 까지 평일만
//   · seedWeekendSlotsUntil2027() → 2027-12-31 까지 주말만
// ============================================================

// 핵심: start~end 사이, dayFilter(d)가 true인 날에 '상담가능' 종일 일정 생성.
function seedAvailabilityRange(startDate, endDate, dayFilter) {
  var cal = getCalendar();
  if (!cal) throw new Error('캘린더를 열 수 없습니다. CONFIG.CALENDAR_ID 확인 필요.');
  var ok = dayFilter || function () { return true; };

  // 기존 '상담가능' 일정이 있는 날짜 집합 (중복 방지용)
  var existing = {};
  cal.getEvents(startDate, new Date(endDate.getTime() + 86400000)).forEach(function (ev) {
    if (SYS.AVAIL_KEYWORD.test(ev.getTitle() || '')) {
      existing[dkey(ev.getStartTime())] = true;
    }
  });

  var made = 0, skipped = 0;
  var d = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
  var stop = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
  while (d <= stop) {
    if (ok(d)) {
      if (existing[dkey(d)]) {
        skipped++;
      } else {
        cal.createAllDayEvent('상담가능', new Date(d.getFullYear(), d.getMonth(), d.getDate()));
        made++;
        Utilities.sleep(120); // API 호출 간격 (대량 생성 시 안정)
      }
    }
    d.setDate(d.getDate() + 1);
  }
  var msg = '상담가능일 생성 완료 — 새로 ' + made + '일, 이미 있어 건너뜀 ' + skipped + '일';
  Logger.log(msg);
  return msg;
}

// 요일 판별 헬퍼
function isWeekdayDay(d) { var x = d.getDay(); return x >= 1 && x <= 5; }
function isWeekendDay(d) { var x = d.getDay(); return x === 0 || x === 6; }

// --- 오늘부터 N주치 (기본 8주) ---
function seedWeekdaySlots(weeks) {
  var start = new Date(); start.setHours(0, 0, 0, 0);
  var end = new Date(start); end.setDate(end.getDate() + (weeks || 8) * 7);
  return seedAvailabilityRange(start, end, isWeekdayDay);
}
function seedWeekendSlots(weeks) {
  var start = new Date(); start.setHours(0, 0, 0, 0);
  var end = new Date(start); end.setDate(end.getDate() + (weeks || 8) * 7);
  return seedAvailabilityRange(start, end, isWeekendDay);
}

// --- 오늘부터 2027-12-31 까지 ---
function seedAllDaysUntil2027() {       // 평일+주말 전부 ★
  var start = new Date(); start.setHours(0, 0, 0, 0);
  return seedAvailabilityRange(start, new Date(2027, 11, 31), null);
}
function seedWeekdaySlotsUntil2027() {  // 평일만
  var start = new Date(); start.setHours(0, 0, 0, 0);
  return seedAvailabilityRange(start, new Date(2027, 11, 31), isWeekdayDay);
}
function seedWeekendSlotsUntil2027() {  // 주말만
  var start = new Date(); start.setHours(0, 0, 0, 0);
  return seedAvailabilityRange(start, new Date(2027, 11, 31), isWeekendDay);
}

function buildHeaderIndex(sheet) {
  var headers = sheet.getRange(SYS.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) { var h = String(headers[i]).trim(); if (h) map[h] = i + 1; }
  return map;
}
function writeCell(sheet, colOf, rowNum, header, value) {
  var c = colOf[header];
  if (!c) { Logger.log('  (헤더 없음, 건너뜀: ' + header + ')'); return; }
  sheet.getRange(rowNum, c).setValue(value);
}
// 토큰으로 행을 찾아 접근자 객체로 반환
function findRowByToken(sheet, colOf, token) {
  token = String(token || '').trim();
  if (!token) return null;
  var tCol = colOf['토큰'];
  var last = sheet.getLastRow();
  if (!tCol || last < SYS.DATA_START_ROW) return null;
  var vals = sheet.getRange(SYS.DATA_START_ROW, 1, last - SYS.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][tCol - 1]).trim() === token) {
      return rowFromValues(colOf, vals[i], SYS.DATA_START_ROW + i);
    }
  }
  return null;
}
// [P1.5 ★4] 개인코드(34열·FK)로 상담예약 행 조회 — 마이페이지(getMyState)·작업3/4 조인 기반.
// findRowByToken 과 같은 패턴(buildHeaderIndex 안전). 1:N 대비 가장 최근(마지막) 행 반환.
function findRowByPersonalCode(code) {
  code = String(code || '').trim().toUpperCase();
  if (!code) return null;
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var c = colOf['개인코드'];
  var last = sheet.getLastRow();
  if (!c || last < SYS.DATA_START_ROW) return null;
  // 빠른 경로: TextFinder로 일치 셀만 서버에서 찾아 '마지막(최신)' 행 1개만 읽음. 예외 시 전체스캔 폴백.
  try {
    var hits = sheet.getRange(SYS.DATA_START_ROW, c, last - SYS.DATA_START_ROW + 1, 1)
      .createTextFinder(code).matchEntireCell(true).matchCase(false).findAll();
    if (hits && hits.length) {
      var rn = hits[hits.length - 1].getRow();   // 마지막 일치(최신)
      return rowFromValues(colOf, sheet.getRange(rn, 1, 1, sheet.getLastColumn()).getValues()[0], rn);
    }
  } catch (e) { /* 폴백 진행 */ }
  var vals = sheet.getRange(SYS.DATA_START_ROW, 1, last - SYS.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var found = null;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][c - 1]).trim().toUpperCase() === code) {
      found = rowFromValues(colOf, vals[i], SYS.DATA_START_ROW + i); // 마지막 일치 행(최신)
    }
  }
  return found;
}
function rowFromValues(colOf, arr, rowNum) {
  return { num: rowNum, get: function (h) { var c = colOf[h]; return c ? arr[c - 1] : ''; } };
}
function row(sheet, colOf, rowNum) {
  var arr = sheet.getRange(rowNum, 1, 1, sheet.getLastColumn()).getValues()[0];
  return rowFromValues(colOf, arr, rowNum);
}
function coupleNames(rowObj) {
  var g = String(rowObj.get('성함(신랑)') || '').trim();
  var b = String(rowObj.get('성함(신부)') || '').trim();
  return (g && b) ? (g + ' · ' + b) : (g || b || '고객');
}
function isExpired(applied) {
  if (!applied) return false;
  var t = (applied instanceof Date) ? applied.getTime() : new Date(applied).getTime();
  if (isNaN(t)) return false;
  return (Date.now() - t) > CONFIG.URL_VALID_DAYS * 86400 * 1000;
}

// 셀프 취소 가능 여부 — 상담 시작까지 (기한시간) 이상 남아 있어야 true.
// dateKey/time = 확정된 상담 일시. 남은 시간이 CONFIRM_DEADLINE_HOURS 미만이면 기한 경과(false).
// [P1.5 ⚠️ KST 전제] parseDateTime은 스크립트 타임존 기준 Date를 만든다 → appsscript.json "timeZone":"Asia/Seoul" 고정 필요.
//   서울이면 이 "24h 전" 비교는 KST로 정확하고, 캘린더 일정 생성도 같은 전제로 맞는다.
//   타임존이 서울이 아니면(UTC 등) 24h 판정과 캘린더 일정이 최대 9h 어긋남 → 반드시 Asia/Seoul로 둘 것.
function withinCancelDeadline(dateKey, time) {
  var start = parseDateTime(dateKey, time || '00:00');
  if (!start) return false;
  var msLeft = start.getTime() - Date.now();
  return msLeft >= CONFIG.CONFIRM_DEADLINE_HOURS * 3600 * 1000;
}
function makeToken() { return Utilities.getUuid().replace(/-/g, ''); }

// 관리자 버튼 서명 (고객 토큰만으로 승인 못 하게)
function getSecret() {
  var props = PropertiesService.getScriptProperties();
  var s = props.getProperty(SYS.PROP_SECRET);
  if (!s) { s = makeToken() + makeToken(); props.setProperty(SYS.PROP_SECRET, s); }
  return s;
}
function sign(token, action) {
  var raw = Utilities.computeHmacSha256Signature(action + ':' + token, getSecret());
  return Utilities.base64EncodeWebSafe(raw).replace(/=+$/, '').slice(0, 20);
}
function verifySig(token, action, sig) { return !!sig && sig === sign(token, action); }

// URL 빌더
function webAppUrl() { return CONFIG.EXEC_URL; }   // getUrl()이 비공개 /dev·구버전 URL을 반환 → Google Drive "현재 파일을 열 수 없습니다" 오류. 고정 /exec 사용.
function scheduleUrl(token) { return webAppUrl() + '?page=schedule&token=' + encodeURIComponent(token); }
function actionUrl(action, token) {
  return webAppUrl() + '?action=' + action + '&token=' + encodeURIComponent(token) + '&sig=' + sign(token, action);
}
// 자사몰 취소 페이지 URL — 이메일 '여기' 링크용(GAS HTML 우회). cancel.html이 token·sig로 emailCancel* api 호출.
function cancelPageUrl(token) {
  return 'https://momentedit.kr/cancel?token=' + encodeURIComponent(token) + '&sig=' + sign(token, 'cancelreq');
}

// 날짜/시간 유틸 — 화면 B의 key() 와 동일 포맷 'YYYY-M-D'
function dkey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function normalizeDateKey(v) {
  if (v instanceof Date) return dkey(v);
  var s = String(v || '').trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? (parseInt(m[1], 10) + '-' + parseInt(m[2], 10) + '-' + parseInt(m[3], 10)) : '';
}
// ⚠️ normalizeDateKey는 '2026-6-7'처럼 비패딩 반환 — 정규식(\d{2}) 매칭·문자열 비교에 그대로 쓰면 안 됨. 아래 헬퍼 사용.
// 'Y-M-D'(패딩 무관) → 비교용 정수 yyyymmdd. 실패 시 null.
function _dayNum(v) { var m = String(normalizeDateKey(v) || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); return m ? (+m[1]) * 10000 + (+m[2]) * 100 + (+m[3]) : null; }
// 'Y-M-D'(패딩 무관) → 'YYYY-MM-DD'. 실패 시 ''.
function _padYmd(v) { var m = String(normalizeDateKey(v) || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/); if (!m) return ''; function p(x) { return (String(x).length < 2 ? '0' : '') + x; } return m[1] + '-' + p(m[2]) + '-' + p(m[3]); }
// [P1.5 ⚠️] new Date(y,mo,da,hh,mi)는 스크립트 타임존(appsscript.json "timeZone") 기준.
//   P1.5 전제 = "Asia/Seoul"(KST). 변경/취소 24h 판정·캘린더 일정이 이 전제에 의존.
function parseDateTime(dateKey, time) {
  // 시트가 텍스트를 Date 로 자동 변환한 경우까지 방어
  var y, mo, da;
  if (dateKey instanceof Date) { y = dateKey.getFullYear(); mo = dateKey.getMonth() + 1; da = dateKey.getDate(); }
  else {
    var dm = String(dateKey || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (!dm) return null;
    y = parseInt(dm[1], 10); mo = parseInt(dm[2], 10); da = parseInt(dm[3], 10);
  }
  var hh = 0, mi = 0;
  if (time instanceof Date) { hh = time.getHours(); mi = time.getMinutes(); }
  else { var tm = String(time || '').match(/(\d{1,2}):(\d{2})/); if (tm) { hh = parseInt(tm[1], 10); mi = parseInt(tm[2], 10); } }
  return new Date(y, mo - 1, da, hh, mi, 0);
}
function eachDate(start, end, allDay, cb) {
  var d = new Date(start); d.setHours(0, 0, 0, 0);
  var stop = new Date(end);
  if (allDay) stop = new Date(stop.getTime() - 1); // 종일 일정 end는 다음날 0시
  for (var guard = 0; d <= stop && guard < 400; guard++) { cb(new Date(d)); d.setDate(d.getDate() + 1); }
}
function addFull(full, dk, time) { (full[dk] = full[dk] || []).push(time); }
function formatWon(n) { return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, ','); }
function prettyDate(dateKey) {
  var d = parseDateTime(dateKey, '00:00');
  if (!d) return esc(dateKey);
  var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  return d.getFullYear() + '년 ' + (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + wd + ')';
}

// 제목용 짧은 날짜: '26/6/4(목)' — 메일 제목은 짧게, 연도는 2자리
function shortDate(dateKey) {
  var d = parseDateTime(dateKey, '00:00');
  if (!d) return String(dateKey || '');
  var wd = ['일', '월', '화', '수', '목', '금', '토'][d.getDay()];
  var yy = String(d.getFullYear()).slice(2);
  return yy + '/' + (d.getMonth() + 1) + '/' + d.getDate() + '(' + wd + ')';
}

// 운영자 메일 제목 조립 — 안 열어도 [단계·이름·일시]가 한눈에.
//   예) '[상담] ②승인요청 · 정희준·카와나미쿠 · 6/4(목) 11:30'
// stage: '①신규' '②승인요청' '③확정' '④내일' 등. dateKey/time 없으면 생략.
function adminSubject(stage, rowOrNames, dateKey, time) {
  var names = (typeof rowOrNames === 'string') ? rowOrNames : coupleNames(rowOrNames);
  names = names.replace(/\s*·\s*/g, '·');   // 제목에선 이름 사이 공백 줄여 간결하게
  var parts = ['[상담] ' + stage, names];
  if (dateKey) parts.push(shortDate(dateKey) + (time ? ' ' + time : ''));
  return parts.join(' · ');
}
function deadlineLabel() {
  var h = CONFIG.CONFIRM_DEADLINE_HOURS;
  return (h % 24 === 0) ? (h / 24) + '일' : h + '시간';
}
function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}
function safeAttr(url) {
  var s = String(url || '');
  return /^https?:|^mailto:/i.test(s) ? s.replace(/"/g, '%22') : '#';
}

// 관리자 알림 (참고 .gs notifyStudio · 24h dedup)
function notifyStudio(subject, body, dedupKey) {
  try {
    if (!CONFIG.SEND_ADMIN_MAIL) return;   // 관리자 메일 전부 OFF — 신규신청·오류알림 포함 카톡으로만. (복구: SEND_ADMIN_MAIL=true)
    if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') return;
    if (dedupKey) {
      var c = CacheService.getScriptCache();
      if (c.get(dedupKey)) return;
      c.put(dedupKey, '1', 86400);
    }
    GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body, { name: SYS.FROM_NAME, cc: adminCc() });
  } catch (_n) {}
}

// 액션 결과/안내 페이지 (브랜드 톤 · 모바일)
function infoPage(title, bodyHtml, ok) {
  var color = ok ? '#2E6B43' : '#6B2A24';
  var html =
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1.0,user-scalable=no">' +
    '<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,500;1,400&family=Noto+Serif+KR:wght@300;400;500&family=Noto+Sans+KR:wght@300;400&display=swap" rel="stylesheet">' +
    '<style>body{margin:0;background:#FAFAF8;color:#1C1B19;font-family:"Noto Sans KR",sans-serif;font-weight:300;display:flex;min-height:100vh;align-items:center;justify-content:center;padding:24px;word-break:keep-all}' +
    '.box{max-width:420px;text-align:center;background:#fff;border:1px solid #DDD8D1;border-radius:12px;padding:44px 32px;box-shadow:0 8px 30px rgba(28,27,25,.06)}' +
    '.bar{width:40px;height:3px;background:' + color + ';border-radius:3px;margin:0 auto 22px}' +
    '.brand{font-family:"Cormorant Garamond",serif;font-size:12px;letter-spacing:.34em;color:#3A2D22;text-transform:uppercase;margin-bottom:18px}' +
    '.t{font-family:"Noto Serif KR",serif;font-size:21px;font-weight:500;color:#3A2D22;margin-bottom:14px}' +
    '.d{font-size:14px;line-height:1.85;color:#5A554C}</style></head>' +
    '<body><div class="box"><div class="brand">Moment Edit</div><div class="bar"></div>' +
    '<div class="t">' + esc(title) + '</div><div class="d">' + bodyHtml + '</div></div></body></html>';
  return HtmlService.createHtmlOutput(html).setTitle(title + ' · Moment Edit')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ============================ STEP 2 · 설치(최초 1회 실행) ============================
function setupConsultation() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(SYS.SHEET_NAME) || ss.insertSheet(SYS.SHEET_NAME);
  // 헤더
  sheet.getRange(SYS.HEADER_ROW, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.getRange(SYS.HEADER_ROW, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#F5F3EF');
  sheet.setFrozenRows(SYS.HEADER_ROW);
  // 날짜·시간·연락처 컬럼을 '텍스트'로 고정 — 시트 자동 변환(2026-6-3, 11:30) 방지
  var colOf0 = buildHeaderIndex(sheet);
  ['선택날짜', '선택시간', '변경제안날짜', '변경제안시간', '그외가능시간대', '기타희망시간', '연락처', '예식일자', '제출시각', '개인코드'].forEach(function (h) {
    var c = colOf0[h];
    if (c) sheet.getRange(SYS.DATA_START_ROW, c, sheet.getMaxRows() - SYS.HEADER_ROW, 1).setNumberFormat('@');
  });
  // 비밀키 생성
  getSecret();
  // onEdit 설치형 트리거 (미쿠가 시트에서 상태를 직접 바꾸는 보조 경로용 · 중복 방지)
  var trigs = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'onConsultEdit'; });
  for (var i = 1; i < trigs.length; i++) ScriptApp.deleteTrigger(trigs[i]);
  if (trigs.length === 0) ScriptApp.newTrigger('onConsultEdit').forSpreadsheet(ss).onEdit().create();

  Logger.log('✅ setup 완료\n  시트: %s\n  헤더 %s열\n  배포 > 새 배포 > 웹 앱(실행: 나 / 액세스: 모든 사용자) 후 웹앱 URL 을 화면 A 링크로 사용하세요.',
    SYS.SHEET_NAME, HEADERS.length);
  return '설치 완료. 이제 [배포 > 새 배포 > 웹 앱]을 진행하세요.';
}

// onEdit (보조) — 미쿠가 시트에서 상태=승인완료 로 직접 바꾸면 승인 흐름 실행
function onConsultEdit(e) {
  try {
    if (!e || !e.range) return;
    var sheet = e.range.getSheet();
    if (sheet.getName() !== SYS.SHEET_NAME) return;
    if (e.range.getRow() < SYS.DATA_START_ROW) return;
    var colOf = buildHeaderIndex(sheet);
    if (e.range.getColumn() !== colOf['상태']) return;
    var v = String(e.value || '').trim();
    var r = row(sheet, colOf, e.range.getRow());
    if (v === ST.APPROVED || v === ST.CONFIRMED) actApprove(sheet, colOf, r, v);
    else if (v === ST.CANCELLED) actCancel(sheet, colOf, r);
  } catch (err) {
    Logger.log('onConsultEdit 오류: ' + err.message);
  }
}



// ============================ 상담 1일 전 리마인더 (시간 트리거) ============================
// 매일 1회 자동 실행. "내일" 상담(확정/승인완료) 건을 찾아 고객+운영자에게 리마인더 발송.
// 중복 방지: 발송 기록을 Script Properties에 (토큰+날짜) 키로 저장.
function sendDailyReminders() {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < SYS.DATA_START_ROW) return;

  // "내일" 날짜 범위
  var now = new Date();
  var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  var tKey = dkey(tomorrow); // 'YYYY-M-D'

  var props = PropertiesService.getScriptProperties();
  var vals = sheet.getRange(SYS.DATA_START_ROW, 1, last - SYS.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();

  // 1) 내일 건 먼저 수집 (총 건수 파악)
  var todays = [];
  for (var i = 0; i < vals.length; i++) {
    var r = rowFromValues(colOf, vals[i], SYS.DATA_START_ROW + i);
    var status = String(r.get('상태') || '').trim();
    if (LOCKED_STATES.indexOf(status) === -1) continue;
    var dk = normalizeDateKey(r.get('선택날짜'));
    if (dk !== tKey) continue;
    var time = String(r.get('선택시간') || '').trim();
    var token = String(r.get('토큰') || '').trim();
    if (!time || !token) continue;
    todays.push({ r: r, dk: dk, time: time, token: token });
  }
  var total = todays.length;
  var sent = 0;

  // 2) 발송 (운영자 메일엔 N건 중 순번 표시)
  for (var j = 0; j < todays.length; j++) {
    var it = todays[j];
    var dedupKey = 'REMIND_' + it.token + '_' + it.dk;
    if (props.getProperty(dedupKey)) continue;
    try {
      sendReminderCustomer(it.r, it.dk, it.time);
      sendReminderStudio(it.r, it.dk, it.time, j + 1, total);
      props.setProperty(dedupKey, '1');
      sent++;
    } catch (e) {
      Logger.log('리마인더 발송 실패(' + coupleNames(it.r) + '): ' + e.message);
    }
  }
  Logger.log('리마인더 ' + sent + '건 발송 (대상일 ' + tKey + ')');
  return '리마인더 ' + sent + '건';
}

// 고객용 리마인더
function sendReminderCustomer(row, dateKey, time) {
  notifyKakao('cust.consultDayBefore', String(row.get('개인코드') || '').trim(), { date: dateKey, time: time });   // 상담 D-1 — 카톡(메일 OFF여도 발송)
  if (!CONFIG.SEND_REMIND_MAIL) return;   // 메일은 토글 ON일 때만(기본 OFF)
  var to = row.get('이메일');
  if (!to) return;
  var inner =
    centerP(coupleNames(row) + ' 님,<br>내일 <b style="color:#B89A75;font-weight:600">대면 상담</b>이 예정되어 있습니다.') +
    dateCard('Tomorrow', prettyDate(dateKey), esc(time)) +
    infoBlock([
      ['장소', placeValue()],
      ['소요 시간', '약 ' + CONFIG.SLOT_DURATION_MIN + '분 · 두 분 함께 방문 권장']
    ]) +
    smallP('부득이하게 변경이 필요하시면 <a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#B89A75;font-weight:500">카카오톡</a>으로 미리 알려 주세요. 내일 뵙겠습니다.');
  GmailApp.sendEmail(to, '[Moment Edit] 내일 상담 안내 · ' + prettyDate(dateKey) + ' ' + time, '',
    { htmlBody: emailShell('내일 상담이 예정되어 있습니다', inner), name: SYS.FROM_NAME });
}

// 운영자용 리마인더 (내일 일정 브리핑)
function sendReminderStudio(row, dateKey, time, idx, total) {
  if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') return;
  var countTxt = (total && total > 1) ? ('내일 상담 ' + total + '건 중 ' + idx + '번째') : '내일 상담 일정입니다.';
  var scheduleRows =
    infoRow('성함', coupleNames(row)) +
    infoRow('연락처', telLink(row.get('연락처'))) +
    infoRow('일정', '<b style="color:#3A2D22">' + prettyDate(dateKey) + ' · ' + esc(time) + '</b>');
  var detailRows = applicantDetailRows(row);
  var inner =
    centerP(countTxt) +
    dateCard('Tomorrow', prettyDate(dateKey), esc(time)) +
    sectionLabel('Contact · 고객') +
    '<div style="background:#F7F5F1;padding:6px 20px;border:1px solid #E6E1D8;border-radius:6px;margin:6px 0 0;">' + scheduleRows + '</div>' +
    sectionLabel('Application · 신청 내용') +
    '<div style="background:#FCFBF9;padding:6px 20px;border:1px solid #ECE8E1;border-radius:6px;margin:6px 0 0;">' + (detailRows || infoRow('내용', '—')) + '</div>';
  CONFIG.SEND_ADMIN_MAIL && GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('④내일', row, dateKey, time), '',
    { htmlBody: emailShell('내일 상담 브리핑', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// ============================ 시트 서식 정리 (setup 후 1회 실행) ============================
// setupConsultation() 으로 헤더를 만든 뒤 실행하면: 그룹 색상·열폭·틀고정·상태색상·드롭다운 적용
function formatConsultationSheet() {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var lastCol = sheet.getLastColumn();
  var maxRows = sheet.getMaxRows();

  // 그룹별 헤더 배경색
  var GROUP = {
    '접수':   ['신청일시','상태','입금확인'],
    '신청인': ['성함(신랑)','성함(신부)','연락처','이메일'],
    '예식희망':['경로','예식일자','요일','시간대','하객','디지털참석','의상'],
    '상담준비':['분위기·스냅','중요하게여김','망설이는점','준비상황','참고링크','자유메모'],
    '상담일정':['선택날짜','선택시간','그외가능시간대','기타희망시간'],
    '확정':   ['변경제안날짜','변경제안시간','확정일시'],
    '동의':   ['개인정보동의','제출시각'],
    '식별':   ['토큰','캘린더이벤트ID']
  };
  var GROUP_BG = {'접수':'#EFE7DA','신청인':'#E7EAE4','예식희망':'#EAE4DA','상담준비':'#E6E2DC','상담일정':'#E4EAEC','확정':'#E3EBE5','동의':'#EDEAE4','식별':'#EEEDEA'};
  Object.keys(GROUP).forEach(function (g) {
    GROUP[g].forEach(function (h) {
      var c = colOf[h]; if (!c) return;
      sheet.getRange(1, c).setBackground(GROUP_BG[g]).setFontColor('#3A2D22').setFontWeight('bold')
        .setHorizontalAlignment('center').setVerticalAlignment('middle').setWrap(true).setFontSize(10);
    });
  });
  sheet.setRowHeight(1, 38);
  sheet.setFrozenRows(1);
  sheet.setFrozenColumns(colOf['성함(신부)'] || 5);

  // 본문 정렬
  if (maxRows > 1) sheet.getRange(2, 1, maxRows - 1, lastCol).setVerticalAlignment('top').setFontSize(10).setFontColor('#1C1B19');

  // 열폭
  var W = {'신청일시':150,'상태':100,'입금확인':80,'성함(신랑)':80,'성함(신부)':80,'연락처':120,'이메일':190,'경로':90,'예식일자':180,'요일':90,'시간대':90,'하객':150,'디지털참석':100,'의상':150,'분위기·스냅':140,'중요하게여김':200,'망설이는점':140,'준비상황':200,'참고링크':160,'자유메모':220,'선택날짜':100,'선택시간':80,'그외가능시간대':100,'기타희망시간':110,'변경제안날짜':100,'변경제안시간':100,'확정일시':150,'취소일시':150,'환불계좌':200,'개인정보동의':90,'제출시각':160,'토큰':70,'캘린더이벤트ID':70};
  Object.keys(W).forEach(function (h) { if (colOf[h]) sheet.setColumnWidth(colOf[h], W[h]); });

  // 줄바꿈(긴 텍스트)
  ['하객','의상','분위기·스냅','중요하게여김','망설이는점','준비상황','참고링크','자유메모'].forEach(function (h) {
    if (colOf[h] && maxRows > 1) sheet.getRange(2, colOf[h], maxRows - 1, 1).setWrap(true);
  });
  // 가운데 정렬
  ['상태','입금확인','요일','시간대','선택시간','디지털참석','개인정보동의'].forEach(function (h) {
    if (colOf[h] && maxRows > 1) sheet.getRange(2, colOf[h], maxRows - 1, 1).setHorizontalAlignment('center');
  });
  // 식별 열 흐리게
  ['토큰','캘린더이벤트ID'].forEach(function (h) {
    if (colOf[h]) sheet.getRange(1, colOf[h], maxRows, 1).setFontColor('#B0AAA0').setFontSize(8);
  });

  // 상태 드롭다운 + 색상
  var stCol = colOf['상태'];
  if (stCol) {
    var rng = sheet.getRange(2, stCol, maxRows - 1, 1);
    rng.setDataValidation(SpreadsheetApp.newDataValidation()
      .requireValueInList(['신청접수','시간선택완료','승인완료','변경제안','확정','취소'], true).build());
    function R(t, bg, fg) { return SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo(t).setBackground(bg).setFontColor(fg).setBold(true).setRanges([rng]).build(); }
    sheet.setConditionalFormatRules([
      R('신청접수','#FBF1E6','#8A5A2B'), R('시간선택완료','#EAF0F6','#2B5A8A'),
      R('승인완료','#E7F1EA','#2E6B43'), R('변경제안','#F6EFEA','#8A4B2B'),
      R('확정','#E3EFE6','#1F6B3A'), R('취소','#F2EDED','#9A4A45')
    ]);
  }
  // 입금확인 드롭다운
  if (colOf['입금확인']) sheet.getRange(2, colOf['입금확인'], maxRows - 1, 1)
    .setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(['확인','미확인'], true).build());

  // 자동 필터
  try { if (sheet.getFilter()) sheet.getFilter().remove(); } catch (e) {}
  try { sheet.getRange(1, 1, Math.max(sheet.getLastRow(),1), lastCol).createFilter(); } catch (e) {}

  SpreadsheetApp.getActive().toast('시트 서식 정리 완료', 'Moment Edit', 4);
  return '서식 정리 완료';
}

// ============================ 자체 도메인 폼(fetch) → doPost ============================
// 통합 라우터 — action 으로 분기한다(프로젝트당 doPost 1개 원칙).
//   · 기존 상담 신청: action 없음 → submitApplication (하위호환 유지)
//   · 통합 플랫폼(Phase 1): signup·login·autologin·verify·getMyState·findCode·resetPw·doResetPw
//     (핸들러는 automation/platform/*.gs 에 정의 — 같은 GAS 프로젝트라 그대로 호출)
// ============================ P1.5 · 마이페이지 일정 라우터 (세션→상담 어댑터) ============================
// 마이페이지는 로그인 '세션토큰'(Customers 3열)을 보낸다. 상담 함수들은 '상담토큰'(상담예약 32열)을 기대한다.
// 세션 → 개인코드 → 상담행 → 상담토큰 으로 잇는 어댑터(★4 두 축 공존의 실제 코드).
function _sessionToConsult(token) {
  var s = resolveSession(token);                 // platform/30 — Customers 세션 검증
  if (!s.ok) return { ok: false, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  var consult = code ? findRowByPersonalCode(code) : null;  // 상담예약 행(없으면 null·원자성 케이스)
  return { ok: true, code: code, cust: s.row, consult: consult };
}

// getAvailability — 세션 확인 후 슬롯 가능/마감 반환(재사용)
function handleGetAvailability(body) {
  var a = _sessionToConsult(body && body.token);
  if (!a.ok) return { ok: false, error: a.error };
  // [취소 동기화] 관리자/고객이 취소한 예약(또는 예외 단계 고객) — 새로고침해도 선택 화면 대신 취소 상태로 전환되게 플래그
  var _bst = a.consult ? String(a.consult.get('상태') || '').trim() : '';
  var _cst = a.cust ? String(a.cust.get('현재단계') || '').trim() : '';
  if (_bst === ST.CANCELLED || STAGE_EXCEPTIONS.indexOf(_cst) !== -1) {
    return { ok: false, cancelled: true, error: '취소된 예약입니다.' };
  }
  var data = _cachedAvailability();   // 전역 캐시(캘린더 쿼리 생략) → 일정선택 페이지 로딩 가속
  var names = a.consult ? coupleNames(a.consult) : (a.cust ? customerNames(a.cust) : '');
  var _hRec = a.cust ? _parseJsonSafe(a.cust.get('동의기록')).가예약 : null;   // [임시고정 연동] 재선택 방향 제한용
  return { ok: true, avail: data.avail, full: data.full,
    currentDate: a.consult ? _padYmd(a.consult.get('선택날짜')) : '',
    holdActive: !!(_hRec && (_hRec.status === '요청' || _hRec.status === '승인')),
    slotsWeekday: CONFIG.SLOTS_WEEKDAY, slotsWeekend: CONFIG.SLOTS_WEEKEND, duration: CONFIG.SLOT_DURATION_MIN,
    names: names, depositStr: formatWon(CONFIG.DEPOSIT),
    account: (CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : '',
    kakao: (CONFIG.KAKAO_URL && String(CONFIG.KAKAO_URL).charAt(0) !== '[') ? CONFIG.KAKAO_URL : '' };
}

// submitSchedule — 세션→상담토큰 변환 후 기존 함수 호출(재사용)
function handleSubmitSchedule(body) {
  var a = _sessionToConsult(body && body.token);
  if (!a.ok) return { ok: false, error: a.error };
  if (!a.consult) return { ok: false, error: '상담 신청 정보를 찾을 수 없습니다.' };
  // [취소 동기화] 페이지를 열어둔 사이 취소된 경우 — 제출 시점에도 차단(프런트가 cancelled로 마이페이지 전환)
  var _bst2 = String(a.consult.get('상태') || '').trim();
  var _cst2 = a.cust ? String(a.cust.get('현재단계') || '').trim() : '';
  if (_bst2 === ST.CANCELLED || STAGE_EXCEPTIONS.indexOf(_cst2) !== -1) {
    return { ok: false, cancelled: true, error: '취소된 예약이라 일정을 선택할 수 없어요.' };
  }
  var consultToken = String(a.consult.get('토큰') || '');
  return submitSchedule(consultToken, body.dateKey, body.time, body.flex || [], body.etc || '', body.hold || null);
}

// cancelReservation — 상담/촬영 취소(환불 없음: 입금 전). 확정상태면 24h 기한 KST 재확인.
function handleCancelReservation(body) {
  var a = _sessionToConsult(body && body.token);
  if (!a.ok) return { ok: false, error: a.error };
  if (!a.consult) return { ok: false, error: '예약 정보를 찾을 수 없습니다.' };
  var sheet = getSheet(); var colOf = buildHeaderIndex(sheet);
  var r = row(sheet, colOf, a.consult.num);
  var status = String(r.get('상태') || '').trim();
  if (status === ST.CANCELLED) return { ok: true };  // 멱등
  if (LOCKED_STATES.indexOf(status) !== -1 && !withinCancelDeadline(r.get('선택날짜'), r.get('선택시간'))) {
    return { ok: false, error: '상담 ' + deadlineLabel() + ' 전까지만 취소할 수 있습니다. 카카오톡으로 문의해 주세요.' };
  }
  var acct = String((body && body.acct) || '').trim();
  var dateKey = r.get('선택날짜'), time = r.get('선택시간');
  if (acct) writeCell(sheet, colOf, r.num, '환불계좌', acct);   // 환불 계좌 기록(취소 처리 전)
  actCancel(sheet, colOf, r);  // 캘린더 삭제 + 상태='취소' + 고객 취소메일 + setCustomerStage + 가예약 해제(공통)
  if (acct) {                  // 운영자에게 환불 송금 요청(계좌 포함)
    try { sendRefundRequestEmail(r, dateKey, time, acct); }
    catch (e) { notifyStudio('[상담] ⚠️오류 · 환불요청 메일 실패', coupleNames(r) + ' · ' + e.message); }
  }
  return { ok: true };
}

// acceptProposal — 변경제안 수락 → 확정(재사용). 반환 HTML(infoPage)은 버리고 JSON만 응답.
function handleAcceptProposal(body) {
  var a = _sessionToConsult(body && body.token);
  if (!a.ok) return { ok: false, error: a.error };
  if (!a.consult) return { ok: false, error: '예약 정보를 찾을 수 없습니다.' };
  var sheet = getSheet(); var colOf = buildHeaderIndex(sheet);
  var r = row(sheet, colOf, a.consult.num);
  actAccept(sheet, colOf, r);  // 변경제안→확정 + 캘린더 sync + (토글)메일 [+ setCustomerStage: 작업3]
  return { ok: true };
}

function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (_) { body = {}; }
    var action = String((body && body.action) || '').trim();
    switch (action) {
      // ── 통합 플랫폼 ──
      case 'signup':     return jsonOut(handleSignup(body));
      case 'login':      return jsonOut(handleLogin(body));
      case 'autologin':  return jsonOut(handleAutologin(body));
      case 'verify':     return jsonOut(handleVerify(body));
      case 'getMyState': return jsonOut(handleGetMyState(body));
      case 'findCode':   return jsonOut(handleFindCode(body));
      case 'resetPw':    return jsonOut(handleResetPw(body));
      case 'doResetPw':  return jsonOut(handleDoResetPw(body));
      // ── P1.5 일정(상담/촬영) — 세션→상담토큰 어댑터 경유 ──
      case 'getAvailability':   return jsonOut(handleGetAvailability(body));
      case 'submitSchedule':    return jsonOut(handleSubmitSchedule(body));
      case 'cancelReservation': return jsonOut(handleCancelReservation(body));
      case 'emailCancelInfo':   return jsonOut(handleEmailCancelInfo(body));
      case 'emailCancel':       return jsonOut(handleEmailCancel(body));
      case 'acceptProposal':    return jsonOut(handleAcceptProposal(body));
      // ── 02 여정(계약·입금) — 세션→Customers ──
      case 'weddingAvailability': return jsonOut(handleWeddingAvailability(body));
      case 'changeWeddingHold':   return jsonOut(handleChangeWeddingHold(body));
      case 'cancelWeddingHold':   return jsonOut(handleCancelWeddingHold(body));
      case 'requestContract':    return jsonOut(handleRequestContract(body));
      case 'signFittingConsent': return jsonOut(handleSignFittingConsent(body));
      case 'signContract':       return jsonOut(handleSignContract(body));
      case 'getSignature':       return jsonOut(handleGetSignature(body));
      case 'paymentSignal':      return jsonOut(handlePaymentSignal(body));
      case 'midSignal':          return jsonOut(handleMidSignal(body));
      case 'balanceSignal':      return jsonOut(handleBalanceSignal(body));
      case 'saveCashReceipt':    return jsonOut(handleSaveCashReceipt(body));
      case 'submitResultSelection': return jsonOut(handleSubmitResultSelection(body));
      case 'requestExtraRetouch':   return jsonOut(handleRequestExtraRetouch(body));
      case 'extraRetouchSignal':    return jsonOut(handleExtraRetouchSignal(body));
      case 'confirmRetouch':        return jsonOut(handleConfirmRetouch(body));
      case 'submitSurvey':          return jsonOut(handleSubmitSurvey(body));
      case 'saveProductionBase': return jsonOut(handleSaveProductionBase(body));
      case 'saveProductionTrack':return jsonOut(handleSaveProductionTrack(body));
      case 'saveInvitationDraft':return jsonOut(handleSaveInvitationDraft(body));
      case 'saveInvitationPreview':return jsonOut(saveInvitationPreview(body));
      case 'publishInvitation':  return jsonOut(handlePublishInvitation(body));
      // ── ⑧ 관리자 (momentedit.kr/admin → fetch). 인증=토큰. adminCall이 게이트웨이 ──
      case 'adminLogin':  return jsonOut(adminLogin(body.id, body.pw));
      case 'adminLogout': return jsonOut(adminLogout(body.token));
      case 'adminCall':   return jsonOut(adminCall(body.token, body.fn, body.args));
      // ── 기존 상담 신청 (action 없음) ──
      case '':
        submitApplication(body);
        return jsonOut({ ok: true });
      default:
        return jsonOut({ ok: false, error: '알 수 없는 요청입니다.' });
    }
  } catch (err) {
    return jsonOut({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
}
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
