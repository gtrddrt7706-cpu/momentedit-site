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
  SLOT_DURATION_MIN: 40,                       // 상담 길이(분)
  SLOTS_WEEKDAY: ['11:30', '14:50', '18:10', '19:30'],  // 평일 슬롯 (19:30 = 직장인 야간 상담)
  SLOTS_WEEKEND: ['18:20'],                    // 주말 슬롯 (저녁 1타임)
  DEPOSIT: 100000,                             // 예약금
  ACCOUNT: '[은행 000-0000-0000]',             // 입금 계좌 — 운영자 입력 예정
  ACCOUNT_HOLDER: '[예금주]',                   // 운영자 입력 예정
  URL_VALID_DAYS: 7,                           // 전용 URL 유효기간
  CONFIRM_DEADLINE_HOURS: 72,                  // 확정 메일 발송 데드라인
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
  '변경제안날짜', '변경제안시간', '확정일시',
  // 동의
  '개인정보동의', '제출시각',
  // 식별
  '토큰', '캘린더이벤트ID'
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
    if (p.action) return handleAction(p);            // 메일 버튼(승인/변경/수락/재선택)
    if (p.page === 'schedule' && p.token) return serveScheduleB(p.token); // 화면 B
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
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

// ───────────── 화면 B · 스케줄 선택 (비공개 / 토큰) ★핵심 ─────────────
function serveScheduleB(token) {
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
    token: token
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
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
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
    .addMetaTag('viewport', 'width=device-width, initial-scale=1, viewport-fit=cover')
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
  var adminActions = { approve: 1, change: 1 };
  if (adminActions[action] && !verifySig(token, action, sig)) {
    return infoPage('권한이 없습니다', '관리자 전용 링크입니다. 알림 메일의 버튼으로 다시 시도해 주세요.', false);
  }
  // 고객 액션도 가볍게 서명 검증
  var custActions = { accept: 1, reselect: 1 };
  if (custActions[action] && !verifySig(token, action, sig)) {
    return infoPage('링크가 올바르지 않습니다', '메일의 버튼으로 다시 시도해 주세요.', false);
  }

  switch (action) {
    case 'approve':  return actApprove(sheet, colOf, row);
    case 'change':   return serveChangeC(token, p);
    case 'accept':   return actAccept(sheet, colOf, row);
    case 'reselect': return serveScheduleB(token); // [다른 시간 보기] → 화면 B 재오픈
    default:         return infoPage('알 수 없는 요청', '', false);
  }
}

// [✓ 승인하기] → 상태=승인완료 + 캘린더 일정 + 고객 확정 메일③
function actApprove(sheet, colOf, row) {
  var status = row.get('상태');
  if (status === ST.APPROVED || status === ST.CONFIRMED) {
    return infoPage('이미 승인된 예약입니다', coupleNames(row) + ' 님 · ' + row.get('선택날짜') + ' ' + row.get('선택시간'), true);
  }
  var dateKey = row.get('선택날짜'), time = row.get('선택시간');
  if (!dateKey || !time) return infoPage('선택된 시간이 없습니다', '고객이 아직 시간을 선택하지 않았습니다.', false);

  writeCell(sheet, colOf, row.num, '입금확인', '확인');
  writeCell(sheet, colOf, row.num, '상태', ST.APPROVED);
  writeCell(sheet, colOf, row.num, '확정일시', new Date());
  syncCalendarEvent(sheet, colOf, row.num, dateKey, time, coupleNames(row), row.get('연락처'));

  try {
    sendConfirmEmail(row.get('이메일'), coupleNames(row), dateKey, time, false);
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 확정 메일 발송 실패',
      coupleNames(row) + ' 님 · ' + dateKey + ' ' + time + '\n수신: ' + row.get('이메일') + '\n오류: ' + mailErr.message + '\n승인은 처리됐으나 메일이 안 갔습니다 — 수동 안내가 필요합니다.');
  }
  try { sendStudioBriefEmail(row, dateKey, time); } catch (e3) { Logger.log('운영자 상담준비 메일 실패: ' + e3.message); }
  return infoPage('승인 완료', coupleNames(row) + ' 님께 예약 확정 메일을 보냈습니다.<br>' + prettyDate(dateKey) + ' · ' + time + '<br>캘린더에도 일정이 등록되었습니다.', true);
}

// [수락] (변경 제안에 대한 고객 수락) → 상태=확정 + 캘린더 갱신 + 변경 확정 메일⑤
function actAccept(sheet, colOf, row) {
  var nd = row.get('변경제안날짜'), nt = row.get('변경제안시간');
  if (!nd || !nt) return infoPage('제안된 시간이 없습니다', '변경 제안 정보를 찾을 수 없습니다.', false);

  writeCell(sheet, colOf, row.num, '선택날짜', nd);
  writeCell(sheet, colOf, row.num, '선택시간', nt);
  writeCell(sheet, colOf, row.num, '상태', ST.CONFIRMED);
  writeCell(sheet, colOf, row.num, '확정일시', new Date());
  syncCalendarEvent(sheet, colOf, row.num, nd, nt, coupleNames(row), row.get('연락처'));

  try {
    sendConfirmEmail(row.get('이메일'), coupleNames(row), nd, nt, true);
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 변경 확정 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
  }
  try { sendStudioBriefEmail(row, nd, nt); } catch (e3) { Logger.log('운영자 상담준비 메일 실패: ' + e3.message); }
  return infoPage('변경 확정', '변경된 일정으로 예약이 확정되었습니다.<br>' + prettyDate(nd) + ' · ' + nt, true);
}

// ============================ google.script.run 핸들러 ============================
// 화면 A 제출 → 행 추가(상태=신청접수) + 토큰 + 메일①(전용 URL)
function submitApplication(form) {
  var groom = String(form.groom || '').trim();
  var bride = String(form.bride || '').trim();
  var phone = String(form.phone || '').trim();
  var email = String(form.email || '').trim();
  var memo = String(form.memo || '').trim();
  var detail = String(form.detail || '').trim();   // 화면 A(문의폼)의 상세 신청내용

  // 허니팟(봇 차단): 숨김 필드(_gotcha)에 값이 차 있으면 자동입력 봇 → 조용히 무시(성공인 척)
  if (String(form.hp || '').trim()) { Logger.log('  (honeypot 걸림 — 봇 의심, 기록·메일 생략)'); return { ok: true }; }

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

  // 신청상세(detail)를 라벨별로 분리해 각 컬럼에 기록
  var parsed = parseDetail(detail);
  Object.keys(parsed).forEach(function (col) {
    writeCell(sheet, colOf, rowNum, col, parsed[col]);
  });

  var url = scheduleUrl(token);
  // 메일① 고객 확인용 신청 요약 한 줄 (예식일 · 인원)
  // 고객 메일에서는 '(⚠ 권장 정원 초과)' 같은 운영자용 경고 문구는 제거 — 시트·운영자 메일엔 그대로 유지
  var sumParts = [];
  if (parsed['예식일자']) sumParts.push(String(parsed['예식일자']));
  if (parsed['하객']) sumParts.push(stripGuestFlag(parsed['하객']));
  var applySummary = sumParts.join(' · ');
  try {
    sendUrlEmail(email, groom + ' · ' + bride, url, applySummary);
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 전용 URL 메일 발송 실패',
      groom + ' · ' + bride + '\n수신: ' + email + '\n오류: ' + mailErr.message + '\nURL: ' + url);
    throw new Error('메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }

  // ② 관리자 신규 신청 알림 — [비활성화] 고객이 시간까지 선택한 뒤(sendPickedEmail)
  //    오는 알림을 '최초 알림'으로 운영. 신청 즉시 알림은 보내지 않음.
  //    (되살리려면 아래 try 블록 주석 해제)
  // try {
  //   sendNewInquiryEmail(groom, bride, phone, email, memo, parsed);
  // } catch (e2) {
  //   Logger.log('신규 신청 관리자 메일 실패: ' + e2.message);
  // }
  return { ok: true };
}

// 화면 B 제출 → 선택 기록(상태=시간선택완료) + 미쿠 알림 메일②
function submitSchedule(token, dateKey, time, flexArr, etc) {
  var sheet = getSheet();
  var colOf = buildHeaderIndex(sheet);
  var row = findRowByToken(sheet, colOf, token);
  if (!row) throw new Error('신청 정보를 찾을 수 없습니다.');
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

  var flex = Array.isArray(flexArr) ? flexArr.join(', ') : String(flexArr || '');
  writeCell(sheet, colOf, row.num, '선택날짜', dateKey);
  writeCell(sheet, colOf, row.num, '선택시간', time);
  writeCell(sheet, colOf, row.num, '그외가능시간대', flex);
  writeCell(sheet, colOf, row.num, '기타희망시간', String(etc || '').slice(0, 60));
  writeCell(sheet, colOf, row.num, '상태', ST.PICKED);

  try {
    sendAdminNotifyEmail(row, dateKey, time, flex, String(etc || ''));
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 미쿠 알림 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
  }
  return { ok: true };
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
  writeCell(sheet, colOf, row.num, '상태', ST.PROPOSED);

  try {
    sendProposalEmail(row, newDate, newTime, String(memo || ''));
  } catch (mailErr) {
    notifyStudio('[상담] ⚠️오류 · 변경 제안 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
  }
  return { ok: true };
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
      var st = String(r[sCol - 1]);
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

// ============================ 메일 5종 ============================
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
  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('①신규', names), '',
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
    emailBtn(approveUrl, '✓ 승인하기', '#B89A75') +
    emailBtnOutline(changeUrl, '시간 변경 제안') +
    // ② 상세는 아래로
    sectionLabel('Contact · 고객') +
    '<div style="background:#F7F5F1;padding:6px 20px;border:1px solid #E6E1D8;border-radius:6px;margin:6px 0 0;">' + scheduleRows + '</div>' +
    sectionLabel('Application · 신청 내용') +
    '<div style="background:#FCFBF9;padding:6px 20px;border:1px solid #ECE8E1;border-radius:6px;margin:6px 0 0;">' + (detailRows || infoRow('내용', '—')) + '</div>' +
    smallP('승인하면 고객에게 확정 메일이 발송되고, 캘린더에 일정이 등록됩니다.');
  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('②승인요청', row, dateKey, time), '',
    { htmlBody: emailShell('새 상담 신청', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// 메일③/⑤ — 예약 확정 (승인/수락, 고객) · ★완료 · 정확한 주소·준비안내
function sendConfirmEmail(to, names, dateKey, time, isChange) {
  var head = isChange ? '예약이 변경·확정되었습니다' : '예약이 확정되었습니다';
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
    smallP('일정 변경이 필요하시면 받으셨던 전용 링크에서 다시 선택하시거나, <a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#B89A75;font-weight:500">카카오톡</a>으로 문의해 주세요.');
  GmailApp.sendEmail(to, '[Moment Edit] 상담 예약이 확정되었습니다 · ' + prettyDate(dateKey) + ' ' + time, '',
    { htmlBody: emailShell(head, inner), name: SYS.FROM_NAME });
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
  var inner =
    centerP('상담 예약이 확정되었습니다.<br>이 메일 하나로 준비를 마치실 수 있습니다.') +
    dateCard('Confirmed', prettyDate(dateKey), esc(time)) +
    sectionLabel('Contact · 고객') +
    '<div style="background:#F7F5F1;padding:6px 20px;border:1px solid #E6E1D8;border-radius:6px;margin:6px 0 0;">' + scheduleRows + '</div>' +
    sectionLabel('Application · 신청 내용') +
    '<div style="background:#FCFBF9;padding:6px 20px;border:1px solid #ECE8E1;border-radius:6px;margin:6px 0 0;">' + (detailRows || infoRow('내용', '—')) + '</div>' +
    smallP('고객에게 확정 메일이 발송되고 캘린더에 일정이 등록되었습니다.');
  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('③확정', row, dateKey, time), '',
    { htmlBody: emailShell('상담 준비 브리프', inner), name: SYS.FROM_NAME, cc: adminCc() });
}

// 메일④ — 시간 변경 제안 (변경제안, 고객) · [수락]/[다른 시간 보기]
function sendProposalEmail(row, newDate, newTime, memo) {
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
    emailBtn(acceptUrl, '이 시간으로 수락', '#B89A75') +
    emailBtnOutline(reselectUrl, '다른 시간 보기') +
    smallP('수락하시면 예약이 확정되며, 확정 메일을 다시 보내드립니다.');
  GmailApp.sendEmail(row.get('이메일'), '[Moment Edit] 상담 시간 변경 제안 · ' + prettyDate(newDate) + ' ' + newTime, '',
    { htmlBody: emailShell('상담 시간 변경 제안', inner), name: SYS.FROM_NAME });
}

// ============================ 메일 HTML 헬퍼 (브랜드 톤 · 참고 .gs 재사용) ============================
function emailShell(headline, innerHtml) {
  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"><meta name="supported-color-schemes" content="light"><style>:root{color-scheme:light}body{margin:0;padding:0;background:#FAFAF8}.me-card{padding:46px 38px}@media only screen and (max-width:600px){.me-card{padding:36px 22px !important}}</style></head>' +
    '<body style="margin:0;padding:0;background:#FAFAF8;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#FAFAF8;width:100%;"><tr><td align="center" bgcolor="#FAFAF8" style="background:#FAFAF8;padding:32px 16px;">' +
    '<table role="presentation" width="560" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;width:100%;background:#FFFFFF;border:1px solid #DDD8D1;border-radius:10px;"><tr><td bgcolor="#FFFFFF" class="me-card" style="background:#FFFFFF;border-radius:10px;padding:46px 38px;font-family:\'Noto Serif KR\',serif;color:#3A2D22;">' +
      '<div style="text-align:center;"><img src="https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/logogold.png" alt="Moment Edit" width="210" style="width:210px;max-width:66%;height:auto;display:inline-block;border:0;outline:none;text-decoration:none;"></div>' +
      '<table role="presentation" cellpadding="0" cellspacing="0" border="0" align="center" style="margin:20px auto 22px;"><tr>' +
        '<td style="width:40px;height:1px;background:#B89A75;line-height:1px;font-size:0;">&nbsp;</td>' +
        '<td style="padding:0 8px;line-height:0;font-size:0;"><span style="display:inline-block;width:5px;height:5px;background:#6B2A24;border-radius:50%;"></span></td>' +
        '<td style="width:40px;height:1px;background:#B89A75;line-height:1px;font-size:0;">&nbsp;</td>' +
      '</tr></table>' +
      '<p style="font-family:\'Noto Serif KR\',serif;font-size:20px;font-weight:500;text-align:center;color:#3A2D22;margin:0 0 8px">' + esc(headline) + '</p>' +
      innerHtml +
      '<div style="border-top:1px solid #ECE8E1;margin-top:32px;padding-top:20px;text-align:center;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#B89A75;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:10px;font-size:10px;letter-spacing:.04em;color:#A39C8E;">Moment Edit · Private Wedding Studio</div>' +
    '</td></tr></table>' +
    '</td></tr></table></body></html>';
}
function emailBtn(url, label, color) {
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
function webAppUrl() { return ScriptApp.getService().getUrl(); }
function scheduleUrl(token) { return webAppUrl() + '?page=schedule&token=' + encodeURIComponent(token); }
function actionUrl(action, token) {
  return webAppUrl() + '?action=' + action + '&token=' + encodeURIComponent(token) + '&sig=' + sign(token, action);
}

// 날짜/시간 유틸 — 화면 B의 key() 와 동일 포맷 'YYYY-M-D'
function dkey(d) { return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); }
function normalizeDateKey(v) {
  if (v instanceof Date) return dkey(v);
  var s = String(v || '').trim();
  var m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  return m ? (parseInt(m[1], 10) + '-' + parseInt(m[2], 10) + '-' + parseInt(m[3], 10)) : '';
}
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
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">' +
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
  ['선택날짜', '선택시간', '변경제안날짜', '변경제안시간', '그외가능시간대', '기타희망시간', '연락처', '예식일자', '제출시각'].forEach(function (h) {
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
    if (v === ST.APPROVED) actApprove(sheet, colOf, r);
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
  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, adminSubject('④내일', row, dateKey, time), '',
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
  var W = {'신청일시':150,'상태':100,'입금확인':80,'성함(신랑)':80,'성함(신부)':80,'연락처':120,'이메일':190,'경로':90,'예식일자':180,'요일':90,'시간대':90,'하객':150,'디지털참석':100,'의상':150,'분위기·스냅':140,'중요하게여김':200,'망설이는점':140,'준비상황':200,'참고링크':160,'자유메모':220,'선택날짜':100,'선택시간':80,'그외가능시간대':100,'기타희망시간':110,'변경제안날짜':100,'변경제안시간':100,'확정일시':150,'개인정보동의':90,'제출시각':160,'토큰':70,'캘린더이벤트ID':70};
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
// momentedit.kr/inquiry.html 이 fetch(POST·JSON)로 신청을 보냄. payload {groom,bride,phone,email,memo,detail,hp}
function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (_) { body = {}; }
    submitApplication(body);
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
}
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
