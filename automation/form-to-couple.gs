/**
 * Moment Edit · 자동화 1단계 — 구글폼 → Couples 시트 자동 등록 + URL 자동 조립
 * ──────────────────────────────────────────────────────────────────────────
 * 목적: 부부(또는 미쿠 감독)가 구글폼을 한 번 작성하면, 이 스크립트가
 *       Couples 시트에 행을 자동으로 채우고, 온라인·가족 청첩장 URL을 만들어
 *       돌려준다. (수기 입력 제거 — 매뉴얼 P02+P04 자동화)
 *
 * ※ 2단계(솔라피 알림톡 자동 발송)는 huijun의 솔라피/카카오 채널 준비 후
 *   sendKakaoLinks() 자리(맨 아래)에 붙인다. 지금은 URL을 로그에 남기기만 한다.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * [v2 확장 — 동적 시스템(hydrate.js) 전 필드 대응 · 2026.05.25]
 *  · 폼이 받는 필드를 동적 엔진(shared/hydrate.js)이 실제로 읽는 전 필드로 확장.
 *    - 인사말(invitationText), 부모 표기 토글 2개(greeting/envelopeShowParents),
 *      부모 계좌 4개(groom/brideFather/MotherAccount), 대표문구(pullQuote · 02),
 *      자기소개(groomBio/brideBio · 08)까지 폼 한 장으로 수집.
 *  · 계좌는 "은행 번호" 한 칸 통일(본인·부모 동일). hydrate.coupleAccount/parseAccount가
 *    한 칸을 "은행 / 번호"로 파싱. (구 분리 은행 칸 groomBank 등은 쓰지 않음 → 자동 한 칸 경로)
 *  · 캐시 무효화 추가: 배포된 편지 시스템 v3.4가 getCouple 응답을 CacheService(TTL 600s)로
 *    캐시하므로, 시트 기록 후 해당 eventId 캐시를 비워 재제출이 즉시 반영되게 함.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * [설치 방법]
 *  ★ 가장 쉬운 길: 이 파일을 Apps Script 편집기에 새 .gs로 붙여넣고 createCoupleForm()
 *    함수를 한 번 실행하면 → 폼 자동 생성 + 응답 시트 연결 + 트리거 자동 등록까지 끝.
 *    (실행 로그에 찍히는 '작성 URL'을 부부/미쿠 감독에게 보내면 됨.)
 *    ※ 같은 시트의 편지 시스템(Code.gs)과 한 프로젝트에 공존 — 식별자 충돌 없음.
 *    ※ 이미 옛 폼을 만들어 두었다면 createCoupleForm()은 "새 폼"을 또 만든다. 항상
 *      가장 최근 실행 로그의 작성 URL을 쓰고, 옛 폼은 보관/삭제.
 *
 *  수동 설치(참고용):
 *  1) 구글폼을 만든다(아래 [구글폼 항목] 그대로). 폼 편집 → 응답 → 시트 연결을
 *     "Moment Edit · Letter System" 스프레드시트로 지정.
 *  2) 그 스프레드시트의 Apps Script 편집기에 이 파일 내용을 새 .gs로 붙여넣는다.
 *  3) 트리거 추가: 함수 onCoupleFormSubmit · 소스 "스프레드시트에서" ·
 *     유형 "양식 제출 시" · 저장.
 *  4) CONFIG의 시트 이름/헤더 행이 본인 시트와 맞는지 확인.
 *  5) 폼에 테스트 1건 제출 → Couples에 행이 생기고 로그에 URL 2개가 찍히는지 확인.
 *
 * [구글폼 항목] — 질문 제목을 아래와 "정확히" 똑같이 만든다(매핑 키로 씀).
 *  필수:
 *   - "예식ID"            예) lmh-cyj-0823  (영문소문자-숫자-하이픈 · 신랑3-신부3-월일)
 *   - "신랑 한글 이름" / "신부 한글 이름"
 *   - "신랑 영문 이름" / "신부 영문 이름"   (여권 표기)
 *   - "신랑 이메일" / "신부 이메일"
 *   - "결혼식 날짜"        예) 2026-08-23  (정규식 검증 ^\d{4}-\d{2}-\d{2}$)
 *   - "결혼식 시간"        예) 14:00       (24시간)
 *   - "신랑 계좌 (은행 번호)" / "신부 계좌 (은행 번호)"  예) 신한 110-456-789012
 *   - "온라인 청첩장 디자인 번호"  객관식 01~08
 *  선택:
 *   - "신랑 혼주(부모님)" / "신부 혼주(부모님)"   예) 이정환 · 김선미
 *   - "신랑 아버지 계좌 (은행 번호)" / "신랑 어머니 계좌 (은행 번호)"
 *   - "신부 아버지 계좌 (은행 번호)" / "신부 어머니 계좌 (은행 번호)"
 *   - "인사말에 부모님 성함 표시"   객관식 ["표시 (기본)", "표시 안 함"]
 *   - "마음 전하실 곳에 부모님 계좌 표시"  객관식 ["표시 (기본)", "표시 안 함"]
 *   - "인사말 (직접 작성)"          장문 — 비우면 디자인 기본 인사말
 *   - "대표 문구 (02 Editorial 전용)"  장문 — 02 선택 시만 의미
 *   - "신랑 자기소개 (08 Noir 전용)" / "신부 자기소개 (08 Noir 전용)"  장문 — 08 선택 시만
 *   - "가족 청첩장 디자인 번호"      객관식 01~08 또는 "발행 안 함"
 *   - "디지털 참석"                객관식 ["함께 진행합니다 (기본)", "이번엔 빼주세요"]
 *
 * ※ 식장 정보는 받지 않는다(shared/venue.js 고정). Vimeo ID는 예식 당일 따로 입력.
 */

// ============================ CONFIG ============================
var CFG = {
  SHEET_NAME: 'Couples',   // 부부 데이터 탭 이름
  HEADER_ROW: 3,           // 영문 헤더 행 (1행 버튼/안내, 2행 한글 라벨, 3행 영문 헤더) — getCouple과 동일
  DATA_START_ROW: 4,       // 실제 데이터 시작 행 (4행~)
  SITE_BASE: 'https://momentedit.kr',

  // 캐시 무효화 — 편지 시스템 v3.4(Code.gs)의 getCouple 캐시 키와 동일해야 함.
  CACHE_KEY_PREFIX: 'couple_',

  // 폼 질문 제목 → Couples 영문 헤더(3행) 매핑. 단순 텍스트 필드만 여기 둔다.
  // (값이 변환 필요한 디자인/토글 필드는 아래 Q_*/COL_* 로 별도 처리)
  MAP: {
    '예식ID': 'eventId',
    '신랑 한글 이름': 'groomName',
    '신부 한글 이름': 'brideName',
    '신랑 이메일': 'groomEmail',
    '신부 이메일': 'brideEmail',
    '결혼식 날짜': 'weddingDate',
    '결혼식 시간': 'weddingTime',
    '신랑 영문 이름': 'groomNameEn',
    '신부 영문 이름': 'brideNameEn',
    // 본인 계좌 — "은행 번호" 한 칸 (hydrate.coupleAccount가 한 칸을 파싱)
    '신랑 계좌 (은행 번호)': 'groomAccount',
    '신부 계좌 (은행 번호)': 'brideAccount',
    // 혼주(부모님) 성함
    '신랑 혼주(부모님)': 'groomParents',
    '신부 혼주(부모님)': 'brideParents',
    // 부모 계좌 — "은행 번호" 한 칸 (hydrate.parseAccount가 한 칸을 파싱)
    '신랑 아버지 계좌 (은행 번호)': 'groomFatherAccount',
    '신랑 어머니 계좌 (은행 번호)': 'groomMotherAccount',
    '신부 아버지 계좌 (은행 번호)': 'brideFatherAccount',
    '신부 어머니 계좌 (은행 번호)': 'brideMotherAccount',
    // 청첩장 내용(고객 선택)
    '인사말 (직접 작성)': 'invitationText',
    '대표 문구 (02 Editorial 전용)': 'pullQuote',
    '신랑 자기소개 (08 Noir 전용)': 'groomBio',
    '신부 자기소개 (08 Noir 전용)': 'brideBio'
  },

  // 디자인/토글/URL 기록용 헤더명 (본인 시트 3행에 없으면 조용히 건너뜀)
  COL_DESIGN_ONLINE: 'designOnline',     // 온라인 디자인 번호 보관(메모용)
  COL_DESIGN_FAMILY: 'designFamily',     // 가족 디자인 번호 보관(메모용)
  COL_DIGITAL: 'digitalAttendance',      // Y/N (N일 때만 디지털 참석 섹션 숨김)
  COL_GREETING: 'greetingShowParents',   // Y/N (인사말 부모 성함 표기)
  COL_ENVELOPE: 'envelopeShowParents',   // Y/N (계좌 안내 부모 표기)
  COL_LIVE_URL: 'liveUrl',               // 자동 조립된 온라인 URL (시트 수식이 소유)
  COL_FAMILY_URL: 'familyUrl',           // 자동 조립된 가족 URL (시트 수식이 소유)

  // 변환이 필요한 폼 질문 제목
  Q_DESIGN_ONLINE: '온라인 청첩장 디자인 번호',
  Q_DESIGN_FAMILY: '가족 청첩장 디자인 번호',
  Q_DIGITAL: '디지털 참석',
  Q_GREETING: '인사말에 부모님 성함 표시',
  Q_ENVELOPE: '마음 전하실 곳에 부모님 계좌 표시'
};

// ====================== 폼 제출 트리거 진입점 ======================
function onCoupleFormSubmit(e) {
  try {
    if (!e || !e.namedValues) throw new Error('폼 제출 이벤트가 아닙니다(트리거 설정 확인).');
    var v = e.namedValues;                       // {질문제목: [답]}
    var get = function (title) {                 // 첫 답을 trim해서 반환
      var a = v[title];
      return (a && a[0] != null) ? String(a[0]).trim() : '';
    };

    var eventId = normEventId(get('예식ID'));
    if (!/^[a-z0-9-]{3,}$/.test(eventId)) {
      throw new Error('예식ID 형식 오류: "' + get('예식ID') + '" (영문소문자·숫자·하이픈)');
    }

    var sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SHEET_NAME);
    if (!sheet) throw new Error('시트 없음: ' + CFG.SHEET_NAME);
    var colOf = buildHeaderIndex(sheet);         // {헤더명: 1-based 열번호}

    var rowNum = findOrAppendRow(sheet, colOf, eventId);

    // 1) 폼 → Couples 단순 텍스트 필드 기록
    Object.keys(CFG.MAP).forEach(function (title) {
      writeCell(sheet, colOf, rowNum, CFG.MAP[title], get(title));
    });

    // 2) 디자인 번호 (메모용 — hydrate는 안 읽고, 디자인은 cover-0X URL로 결정)
    var designOnline = pad2(get(CFG.Q_DESIGN_ONLINE));
    var designFamily = pad2(get(CFG.Q_DESIGN_FAMILY));
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline);
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily);

    // 3) 토글 3종 (Y/N) — 명시적 "안 함/빼주세요"류만 N, 그 외 Y(기본 노출)
    //    hydrate.showUnlessNo: 빈 칸·Y는 노출, N만 숨김. 시트에 상태가 보이도록 Y/N 명시 기록.
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, ynShow(get(CFG.Q_DIGITAL)));
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ynShow(get(CFG.Q_GREETING)));
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ynShow(get(CFG.Q_ENVELOPE)));

    // 4) 캐시 무효화 — 편지 시스템 v3.4가 getCouple을 캐시하므로, 재제출이 즉시 반영되도록
    //    이 eventId 캐시를 비운다. (신규 부부는 캐시가 없어 무해)
    try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

    // 5) URL — liveUrl·familyUrl 열은 시트의 ARRAYFORMULA가 소유하므로 스크립트는
    //    기록하지 않음(수식 덮어쓰기 방지). 아래는 로그/알림톡용으로만 계산.
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';

    Logger.log('[OK] %s · row %s\n  online: %s\n  family: %s',
      eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)');

    // 6) (2단계) 알림톡 자동 발송 — 솔라피 준비되면 주석 해제
    // sendKakaoLinks(get('신랑 이메일'), get('신부 이메일'), liveUrl, familyUrl, eventId);

  } catch (err) {
    Logger.log('[ERROR] ' + err.message);
    // 운영 중에는 실패를 본인 메일로 받아두면 좋다(원하면 주석 해제):
    // MailApp.sendEmail('contact@momentedit.kr', '[폼 자동등록 실패]', err.message);
    throw err;
  }
}

// =========================== 헬퍼들 ===========================

// 시트 3행 헤더 → {헤더명: 열번호} (열 위치가 바뀌어도 견고)
function buildHeaderIndex(sheet) {
  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(CFG.HEADER_ROW, 1, 1, lastCol).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) {
    var h = String(headers[i]).trim();
    if (h) map[h] = i + 1;
  }
  return map;
}

// eventId로 기존 행을 찾고, 없으면 맨 아래 새 행 번호 반환
function findOrAppendRow(sheet, colOf, eventId) {
  var idCol = colOf['eventId'];
  if (!idCol) throw new Error("'eventId' 헤더를 시트 " + CFG.HEADER_ROW + "행에서 못 찾음");
  var lastRow = Math.max(sheet.getLastRow(), CFG.DATA_START_ROW - 1);
  if (lastRow >= CFG.DATA_START_ROW) {
    var ids = sheet.getRange(CFG.DATA_START_ROW, idCol, lastRow - CFG.DATA_START_ROW + 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() === eventId) return CFG.DATA_START_ROW + i; // 재제출 → 같은 행 갱신
    }
  }
  return lastRow + 1; // 신규 → 다음 빈 행
}

// 헤더명이 존재할 때만 셀에 기록(없으면 조용히 건너뜀). 빈 값은 덮어쓰지 않음(선택 항목 보존).
function writeCell(sheet, colOf, rowNum, header, value) {
  var c = colOf[header];
  if (!c) { Logger.log('  (헤더 없음, 건너뜀: ' + header + ')'); return; }
  if (value === '') return;
  sheet.getRange(rowNum, c).setValue(value);
}

function normEventId(s) {
  return String(s || '').trim().toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function pad2(s) {
  s = String(s || '').trim();
  if (!s) return '';
  var n = s.replace(/[^0-9]/g, '');
  return n ? ('0' + n).slice(-2) : '';   // "3" → "03", "08" → "08", "발행 안 함" → ""
}

// 토글 해석: 명시적 "안 함/미표시/숨김/빼주세요/아니오/no/n/off" → 'N', 그 외(표시/기본/빈값) → 'Y'
function ynShow(answer) {
  return /(안\s*함|미표시|숨김|제외|빼|아니|off|^\s*no\s*$|^\s*n\s*$)/i.test(String(answer || '').trim()) ? 'N' : 'Y';
}

// ============== 구글폼 자동 생성기 (최초 1회 실행) ==============
// Apps Script 편집기에서 이 함수를 한 번 실행하면, 위 CFG와 정확히 같은 제목의
// 질문을 가진 구글폼이 자동 생성되고, 응답이 현재 스프레드시트로 연결되며,
// onCoupleFormSubmit 트리거까지 자동 등록된다. (질문 제목 오타·매핑 불일치 원천 차단)
function createCoupleForm() {
  var form = FormApp.create('Moment Edit · 청첩장 정보 입력');
  form.setDescription(
    '두 분의 청첩장에 들어갈 정보를 입력해 주세요. 적어주신 그대로 청첩장에 반영됩니다.\n' +
    '필요한 항목만 채우셔도 됩니다(선택 항목은 비우면 기본값으로 처리).\n' +
    '※ 식장 정보는 받지 않습니다(모먼트 에디트 스튜디오 고정).'
  );
  form.setCollectEmail(false);

  var req = function (title, help) {
    var it = form.addTextItem().setTitle(title).setRequired(true);
    if (help) it.setHelpText(help);
    return it;
  };
  var opt = function (title, help) {
    var it = form.addTextItem().setTitle(title).setRequired(false);
    if (help) it.setHelpText(help);
    return it;
  };
  var optPara = function (title, help) {
    var it = form.addParagraphTextItem().setTitle(title).setRequired(false);
    if (help) it.setHelpText(help);
    return it;
  };
  var sec = function (title, help) {
    var it = form.addSectionHeaderItem().setTitle(title);
    if (help) it.setHelpText(help);
    return it;
  };

  // ── 기본 정보 ──────────────────────────────────────────────
  sec('기본 정보');
  req('예식ID', '영문 소문자·숫자·하이픈만. 규칙: 신랑이니셜3-신부이니셜3-월일. 예) lmh-cyj-0823')
    .setValidation(FormApp.createTextValidation()
      .setHelpText('예: lmh-cyj-0823 (영문 소문자·숫자·하이픈)')
      .requireTextMatchesPattern('^[a-z0-9-]{3,}$').build());
  req('신랑 한글 이름', '예) 이민호');
  req('신부 한글 이름', '예) 최유진');
  req('신랑 영문 이름', '여권 표기 · 성 이름. 예) Lee Minho');
  req('신부 영문 이름', '여권 표기 · 성 이름. 예) Choi Yujin');
  req('신랑 이메일');
  req('신부 이메일');

  // ── 예식 일정 ──────────────────────────────────────────────
  sec('예식 일정');
  req('결혼식 날짜', 'YYYY-MM-DD 형식. 예) 2026-08-23')
    .setValidation(FormApp.createTextValidation()
      .setHelpText('예: 2026-08-23')
      .requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식. 예) 14:00');

  // ── 마음 전하실 곳 · 본인 계좌 (은행 번호 한 칸) ────────────
  sec('마음 전하실 곳 · 본인 계좌', '은행과 계좌번호를 한 칸에 함께 적어주세요. 예) 신한 110-456-789012');
  req('신랑 계좌 (은행 번호)', '예) 신한 110-456-789012');
  req('신부 계좌 (은행 번호)', '예) 국민 612-345-678901');

  // ── 혼주(부모님) · 선택 ────────────────────────────────────
  sec('혼주(부모님) · 선택', '원치 않으시면 비워두세요. 비우면 청첩장에서 자동으로 표시되지 않습니다.');
  opt('신랑 혼주(부모님)', '아버지 · 어머니 순. 예) 이정환 · 김선미');
  opt('신부 혼주(부모님)', '예) 최영수 · 박미경');
  opt('신랑 아버지 계좌 (은행 번호)', '예) 국민 110-123-456789');
  opt('신랑 어머니 계좌 (은행 번호)', '예) 신한 220-456-123789');
  opt('신부 아버지 계좌 (은행 번호)', '예) 농협 351-234-567890');
  opt('신부 어머니 계좌 (은행 번호)', '예) 카카오뱅크 3333-12-3456789');
  form.addMultipleChoiceItem().setTitle('인사말에 부모님 성함 표시').setRequired(false)
    .setChoiceValues(['표시 (기본)', '표시 안 함'])
    .setHelpText('청첩장 인사말 자녀 소개에 혼주(부모님) 성함을 넣을지. 비우면 표시(기본). ※ 혼주 성함을 안 적으면 자동 미표시.');
  form.addMultipleChoiceItem().setTitle('마음 전하실 곳에 부모님 계좌 표시').setRequired(false)
    .setChoiceValues(['표시 (기본)', '표시 안 함'])
    .setHelpText('계좌 안내(마음 전하실 곳)에 부모님 계좌까지 넣을지. 비우면 표시(기본). ※ 부모 계좌를 안 적으면 자동 미표시.');

  // ── 청첩장 디자인 · 내용 ───────────────────────────────────
  sec('청첩장 디자인 · 내용');
  var designs = ['01', '02', '03', '04', '05', '06', '07', '08'];
  form.addMultipleChoiceItem().setTitle('온라인 청첩장 디자인 번호').setRequired(false)
    .setChoiceValues(designs.concat(['발행 안 함']))
    .setHelpText('갤러리에서 고른 번호. 안 만들면 "발행 안 함". momentedit.kr/invitation-gallery.html');
  form.addMultipleChoiceItem().setTitle('가족 청첩장 디자인 번호').setRequired(false)
    .setChoiceValues(designs.concat(['발행 안 함']))
    .setHelpText('가족(오프라인) 청첩장도 만들면 번호 선택. 온라인과 같아도 달라도 무관. 안 만들면 "발행 안 함".');
  optPara('인사말 (직접 작성)', '직접 쓰신 인사말로 교체됩니다. 비우면 디자인별 기본 인사말이 들어갑니다. (04 Vermilion·08 Noir는 인사말 영역이 없어 표시되지 않을 수 있음)');
  optPara('대표 문구 (02 Editorial 전용)', '02 Editorial 디자인의 대표 문구. 02를 고르지 않으셨다면 비워두세요.');
  optPara('신랑 자기소개 (08 Noir 전용)', '08 Noir 디자인의 BIO 카드. 08을 고르지 않으셨다면 비워두세요.');
  optPara('신부 자기소개 (08 Noir 전용)', '08 Noir 디자인의 BIO 카드. 비우면 숨김.');

  // ── 디지털 참석 (옵션) ─────────────────────────────────────
  sec('디지털 참석 · 선택', '멀리 못 오시는 하객을 위한 온라인 참석 기능입니다. 두 분의 선택이며 기본은 함께 진행입니다.');
  form.addMultipleChoiceItem().setTitle('디지털 참석').setRequired(false)
    .setChoiceValues(['함께 진행합니다 (기본)', '이번엔 빼주세요'])
    .setHelpText('부담되시면 "이번엔 빼주세요" — 그 경우 온라인 청첩장에서 디지털 참석 섹션만 빠지고, 편지·계좌는 그대로 유지됩니다.');

  // 응답을 현재 스프레드시트로 연결
  var ss = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // onFormSubmit 트리거 자동 등록(중복 방지)
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onCoupleFormSubmit';
  });
  if (!exists) {
    ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  }

  Logger.log('폼 생성 완료\n  작성(응답) URL: %s\n  편집 URL: %s\n  제출 트리거: %s',
    form.getPublishedUrl(), form.getEditUrl(), exists ? '이미 있음' : '새로 등록');
}

// ===================== 2단계 자리(솔라피 알림톡) =====================
// huijun이 솔라피 가입 + 알림톡 템플릿 승인 후 채운다.
// API 키는 코드에 직접 넣지 말고 Apps Script Properties에 보관:
//   파일 → 프로젝트 속성 → 스크립트 속성 → SOLAPI_KEY / SOLAPI_SECRET / SOLAPI_PFID(채널) / SOLAPI_TEMPLATE_ID
// function sendKakaoLinks(groomEmail, brideEmail, liveUrl, familyUrl, eventId) {
//   var p = PropertiesService.getScriptProperties();
//   // UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send', { ...알림톡 payload... });
// }
