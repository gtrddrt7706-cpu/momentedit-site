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
  SLOT_DURATION_MIN: 40,                       // 상담 길이(분) — 운영자 확정 예정
  SLOTS: ['11:30', '14:50', '18:10'],          // 1일 슬롯(평일·주말 공통) — 운영자 확정 예정
  DEPOSIT: 100000,                             // 예약금
  ACCOUNT: '[은행 000-0000-0000]',             // 입금 계좌 — 운영자 입력 예정
  ACCOUNT_HOLDER: '[예금주]',                   // 운영자 입력 예정
  URL_VALID_DAYS: 7,                           // 전용 URL 유효기간
  CONFIRM_DEADLINE_HOURS: 24,                  // 확정 메일 발송 데드라인
  STUDIO_ADDRESS: '[정확한 도로명 주소]',        // 확정 메일에만 — 운영자 입력 예정
  KAKAO_URL: '[카카오톡 채널 URL]',             // 문의 경로 — 운영자 입력 예정
  ADMIN_EMAIL: 'contact@momentedit.kr',         // 알림 받을 주소
  CALENDAR_ID: 'c_c6c2f76cd17c85e3ddfa4ded4ca3634b9fd3de774222171c0c30a850a0cfbf00@group.calendar.google.com',  // 연결됨
};

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
  '신청일시', '성함(신랑)', '성함(신부)', '연락처', '이메일', '메모', '신청상세', '토큰',
  '선택날짜', '선택시간', '그외가능시간대', '기타희망시간',
  '입금확인', '상태', '변경제안날짜', '변경제안시간', '캘린더이벤트ID', '확정일시'
];
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

// ============================ 자체 도메인 폼(fetch) → doPost ============================
// momentedit.kr/inquiry.html 이 fetch(POST · JSON)로 신청을 보냄 (iframe 아님).
// payload: { groom, bride, phone, email, memo, detail, hp }  (detail·hp 는 폼에서 조립)
// 응답: { ok:true } 또는 { ok:false, error }  (폼이 data.ok 로 성공 판정)
function doPost(e) {
  try {
    var body = {};
    try { body = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (_) { body = {}; }
    submitApplication(body);   // {groom,bride,phone,email,memo,detail,hp} — 허니팟·검증은 submitApplication 내부에서
    return jsonOut({ ok: true });
  } catch (err) {
    return jsonOut({ ok: false, error: (err && err.message) ? err.message : String(err) });
  }
}
function jsonOut(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
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
    slots: CONFIG.SLOTS,
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
    notifyStudio('[Moment Edit · 상담] ⚠️ 확정 메일 발송 실패',
      coupleNames(row) + ' 님 · ' + dateKey + ' ' + time + '\n수신: ' + row.get('이메일') + '\n오류: ' + mailErr.message + '\n승인은 처리됐으나 메일이 안 갔습니다 — 수동 안내가 필요합니다.');
  }
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
    notifyStudio('[Moment Edit · 상담] ⚠️ 변경 확정 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
  }
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
  writeCell(sheet, colOf, rowNum, '메모', memo);
  writeCell(sheet, colOf, rowNum, '신청상세', detail);
  writeCell(sheet, colOf, rowNum, '토큰', token);
  writeCell(sheet, colOf, rowNum, '상태', ST.APPLIED);

  var url = scheduleUrl(token);
  try {
    sendUrlEmail(email, groom + ' · ' + bride, url);
  } catch (mailErr) {
    notifyStudio('[Moment Edit · 상담] ⚠️ 전용 URL 메일 발송 실패',
      groom + ' · ' + bride + '\n수신: ' + email + '\n오류: ' + mailErr.message + '\nURL: ' + url);
    throw new Error('메일 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.');
  }
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

  // 셀프 변경(확정 후 재방문) 시 24시간 전까지만 허용
  var status = row.get('상태');
  if (status === ST.CONFIRMED || status === ST.APPROVED) {
    var cur = parseDateTime(row.get('선택날짜'), row.get('선택시간'));
    if (cur && (cur.getTime() - Date.now()) < CONFIG.CONFIRM_DEADLINE_HOURS * 3600 * 1000) {
      throw new Error('상담 ' + CONFIG.CONFIRM_DEADLINE_HOURS + '시간 전부터는 변경할 수 없습니다. 카카오톡으로 문의해 주세요.');
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
    notifyStudio('[Moment Edit · 상담] ⚠️ 미쿠 알림 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
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
    notifyStudio('[Moment Edit · 상담] ⚠️ 변경 제안 메일 발송 실패', coupleNames(row) + ' · ' + mailErr.message);
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
    CONFIG.SLOTS.forEach(function (time) {
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
    notifyStudio('[Moment Edit · 상담] ⚠️ 캘린더 일정 생성 실패', names + ' · ' + dateKey + ' ' + time + '\n' + e.message);
  }
}

// ============================ 메일 5종 ============================
// 메일① — 전용 URL (신청 즉시, 고객) · "신청 접수"(확정 아님)
function sendUrlEmail(to, names, url) {
  var inner =
    centerP(esc(names) + ' 님,<br>대면 상담 신청이 <b style="color:#D8B48C">접수</b>되었습니다.') +
    noteP('아직 <b style="color:#D8B48C">예약이 확정된 것은 아닙니다.</b><br>아래 버튼에서 원하시는 날짜·시간을 선택해 주세요.') +
    emailBtn(url, '일정 선택하기', '#6B2A24') +
    smallP('이 링크는 신청자 전용이며, ' + CONFIG.URL_VALID_DAYS + '일간 유효합니다.<br>버튼이 열리지 않으면 아래 주소를 복사해 주세요.<br><span style="color:#D8B48C;word-break:break-all">' + esc(url) + '</span>');
  GmailApp.sendEmail(to, '[Moment Edit] 상담 일정을 선택해 주세요 (신청 접수)', '',
    { htmlBody: emailShell('상담 신청이 접수되었습니다', inner), name: SYS.FROM_NAME });
}

// 메일② — 새 신청 알림 (시간선택완료, 미쿠) · [승인]/[변경제안] 버튼
function sendAdminNotifyEmail(row, dateKey, time, flex, etc) {
  if (!CONFIG.ADMIN_EMAIL || CONFIG.ADMIN_EMAIL.charAt(0) === '[') {
    Logger.log('  (ADMIN_EMAIL 미설정 — 미쿠 알림 건너뜀)'); return;
  }
  var token = row.get('토큰');
  var approveUrl = actionUrl('approve', token);
  var changeUrl = actionUrl('change', token);
  var rows =
    infoRow('성함', coupleNames(row)) +
    infoRow('연락처', esc(row.get('연락처'))) +
    infoRow('이메일', esc(row.get('이메일'))) +
    infoRow('선택 일정', prettyDate(dateKey) + ' · ' + esc(time)) +
    infoRow('그 외 가능 시간대', esc(flex || '—')) +
    infoRow('기타 희망시간', esc(etc || '—')) +
    (row.get('메모') ? infoRow('신청 메모', esc(row.get('메모'))) : '');
  var inner =
    centerP('새 상담 신청이 들어왔습니다.') +
    '<div style="background:#2A241F;padding:6px 18px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;margin:22px 0;">' + rows + '</div>' +
    '<p style="font-size:12px;color:#C99;text-align:center;margin:0 0 18px;">⚠️ <b>입금 확인 후</b> 승인해 주세요.</p>' +
    emailBtn(approveUrl, '✓ 승인하기', '#2E6B43') +
    emailBtn(changeUrl, '시간 변경 제안', '#6B2A24') +
    smallP('승인하면 고객에게 확정 메일이 발송되고, 캘린더에 일정이 등록됩니다.');
  GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, '[Moment Edit · 상담] 새 신청 — ' + coupleNames(row) + ' (' + prettyDate(dateKey) + ' ' + time + ')', '',
    { htmlBody: emailShell('새 상담 신청', inner), name: SYS.FROM_NAME });
}

// 메일③/⑤ — 예약 확정 (승인/수락, 고객) · ★완료 · 정확한 주소·준비안내
function sendConfirmEmail(to, names, dateKey, time, isChange) {
  var head = isChange ? '예약이 변경·확정되었습니다' : '예약이 확정되었습니다';
  var inner =
    centerP(esc(names) + ' 님,<br>대면 상담 <b style="color:#D8B48C">예약이 확정</b>되었습니다.') +
    '<div style="background:#2A241F;padding:18px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;margin:22px 0;text-align:center">' +
      '<div style="font-size:11px;letter-spacing:.16em;color:#C9A977;text-transform:uppercase;margin-bottom:8px">Confirmed</div>' +
      '<div style="font-size:17px;color:#E8E1D6">' + prettyDate(dateKey) + ' · ' + esc(time) + '</div>' +
    '</div>' +
    infoBlock([
      ['장소', esc(CONFIG.STUDIO_ADDRESS)],
      ['소요 시간', '약 ' + CONFIG.SLOT_DURATION_MIN + '분'],
      ['준비물', '특별한 준비물은 없습니다. 가능하시면 두 분이 함께 방문해 주세요.'],
      ['변경 · 취소', '상담 ' + CONFIG.CONFIRM_DEADLINE_HOURS + '시간 전까지 가능하며, 이후 예약금은 반환되지 않습니다.']
    ]) +
    smallP('일정 변경이 필요하시면 받으셨던 전용 링크에서 다시 선택하시거나, <a href="' + safeAttr(CONFIG.KAKAO_URL) + '" style="color:#D8B48C">카카오톡</a>으로 문의해 주세요.');
  GmailApp.sendEmail(to, '[Moment Edit] 상담 예약이 확정되었습니다 · ' + prettyDate(dateKey) + ' ' + time, '',
    { htmlBody: emailShell(head, inner), name: SYS.FROM_NAME });
}

// 메일④ — 시간 변경 제안 (변경제안, 고객) · [수락]/[다른 시간 보기]
function sendProposalEmail(row, newDate, newTime, memo) {
  var token = row.get('토큰');
  var acceptUrl = actionUrl('accept', token);
  var reselectUrl = actionUrl('reselect', token);
  var inner =
    centerP(coupleNames(row) + ' 님,<br>선택하신 시간이 어려워 <b style="color:#D8B48C">다른 시간을 제안</b>드립니다.') +
    '<div style="background:#2A241F;padding:18px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;margin:22px 0;text-align:center">' +
      '<div style="font-size:11px;letter-spacing:.16em;color:#C9A977;text-transform:uppercase;margin-bottom:8px">Proposed</div>' +
      '<div style="font-size:17px;color:#E8E1D6">' + prettyDate(newDate) + ' · ' + esc(newTime) + '</div>' +
    '</div>' +
    (memo ? noteP(esc(memo)) : '') +
    emailBtn(acceptUrl, '이 시간으로 수락', '#2E6B43') +
    emailBtn(reselectUrl, '다른 시간 보기', '#3A2D22') +
    smallP('수락하시면 예약이 확정되며, 확정 메일을 다시 보내드립니다.');
  GmailApp.sendEmail(row.get('이메일'), '[Moment Edit] 상담 시간 변경 제안 · ' + prettyDate(newDate) + ' ' + newTime, '',
    { htmlBody: emailShell('상담 시간 변경 제안', inner), name: SYS.FROM_NAME });
}

// ============================ 메일 HTML 헬퍼 (브랜드 톤 · 참고 .gs 재사용) ============================
function emailShell(headline, innerHtml) {
  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:dark}body{margin:0;padding:0;background:#1E1A17}</style></head>' +
    '<body style="margin:0;padding:0;background:#1E1A17;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1E1A17;width:100%;"><tr><td align="center" bgcolor="#1E1A17" style="background:#1E1A17;">' +
    '<div style="color-scheme:dark;font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:44px 30px;background:#1E1A17;color:#E8E1D6;">' +
      '<div style="text-align:center;font-family:\'Cormorant Garamond\',serif;font-size:13px;letter-spacing:.34em;color:#C9A977;text-transform:uppercase">Moment Edit</div>' +
      '<div style="width:40px;height:1px;background:#C9A977;margin:22px auto;"></div>' +
      '<p style="font-family:\'Noto Serif KR\',serif;font-size:19px;font-weight:400;text-align:center;color:#E8E1D6;margin:0 0 8px">' + esc(headline) + '</p>' +
      innerHtml +
      '<div style="text-align:center;margin-top:32px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#C9A977;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:14px;font-size:10px;color:#7A7165;">Moment Edit · Private Wedding Studio</div></div>' +
    '</td></tr></table></body></html>';
}
function emailBtn(url, label, color) {
  return '<div style="text-align:center;margin:14px 0;"><a href="' + safeAttr(url) + '" style="display:inline-block;min-width:200px;padding:15px 28px;background:' + color + ';color:#fff;font-family:\'Noto Serif KR\',serif;font-size:14px;letter-spacing:.06em;text-decoration:none;border-radius:3px;">' + esc(label) + '</a></div>';
}
function centerP(html) { return '<p style="font-size:15px;line-height:1.85;font-weight:300;text-align:center;color:#E8E1D6;margin:18px 0 0">' + html + '</p>'; }
function noteP(html) { return '<p style="font-size:13px;line-height:1.8;color:#B8AE9F;text-align:center;margin:14px 0 0">' + html + '</p>'; }
function smallP(html) { return '<p style="font-size:12px;line-height:1.8;color:#9C9080;margin:20px 0 0">' + html + '</p>'; }
function infoRow(label, valHtml) {
  return '<div style="display:block;padding:11px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><span style="font-size:12px;color:#9C9080">' + esc(label) + '</span><br><span style="font-size:14px;color:#E8E1D6">' + valHtml + '</span></div>';
}
function infoBlock(pairs) {
  var rows = pairs.map(function (p) {
    return '<div style="padding:12px 0;border-bottom:1px solid rgba(255,255,255,0.06)"><div style="font-size:12px;color:#C9A977;margin-bottom:3px">' + esc(p[0]) + '</div><div style="font-size:13px;line-height:1.7;color:#B8AE9F">' + p[1] + '</div></div>';
  }).join('');
  return '<div style="margin:6px 0 0">' + rows + '</div>';
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
  return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + wd + ')';
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
    GmailApp.sendEmail(CONFIG.ADMIN_EMAIL, subject, body, { name: SYS.FROM_NAME });
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
  ['선택날짜', '선택시간', '변경제안날짜', '변경제안시간', '그외가능시간대', '기타희망시간', '연락처'].forEach(function (h) {
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
