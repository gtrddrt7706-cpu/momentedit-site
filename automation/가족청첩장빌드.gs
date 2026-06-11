/**
 * ⚠️ 중요: 메뉴 활성화를 위해 Code.gs의 onOpen() 함수에 다음 한 줄 추가하세요:
 *   FC_addFamilyMenu();
 *
 * 예시:
 *   function onOpen() {
 *     // 기존 코드 ...
 *     FC_addFamilyMenu();   // ← 이 줄 추가
 *   }
 */

/**
 * ═══════════════════════════════════════════════════════════════════
 * Moment Edit · 가족 청첩장 빌드 시스템 (v4.1 · 시트 구조 v5.0 대응)
 * ═══════════════════════════════════════════════════════════════════
 *
 * v4.1 업데이트 (2026.05.21):
 *  ✨ 시트 1행 버튼/안내 영역 추가됨 → 데이터 행 인덱스 +1
 *    row 1 = 버튼/안내 영역 (빈 행)
 *    row 2 = 한글 라벨
 *    row 3 = 영문 헤더
 *    row 4+ = 데이터
 *  ✨ for (let i = 2; ...) → for (let i = 3; ...) (2곳)
 *  ✨ row < 3 → row < 4 (선택 행 검증)
 *
 * v4.0 (유지):
 *  - 가족 청첩장 자동 빌드 (시트 R~Z 입력 → 메뉴 클릭 → GitHub push)
 *
 * 흐름:
 *   1. 시트 메뉴 "Moment Edit → 가족 청첩장 빌드"
 *   2. Couples 시트에서 부부 정보 + 식장 정보 조회
 *   3. GitHub에서 디자인별 마스터 HTML fetch
 *   4. 47종 placeholder 치환
 *   5. 결과를 GitHub에 push → Vercel 자동 배포
 *   6. BuildLogs 시트에 결과 기록
 *
 * 트리거: 수동 클릭만 (onEdit 자동 빌드 안 함 - 실수 방지)
 *
 * Properties 필수 항목:
 *   - GITHUB_TOKEN: Personal Access Token (repo 권한)
 *   - GITHUB_OWNER: gtrddrt7706-cpu
 *   - GITHUB_REPO: momentedit-site
 *   - GITHUB_BRANCH: main
 * ═══════════════════════════════════════════════════════════════════
 */

// ───────────────────────────────────────────────────────────────────
// 상수
// ───────────────────────────────────────────────────────────────────
const FC_SHEET_COUPLES = 'Couples';
const FC_SHEET_BUILD_LOGS = 'BuildLogs';

const FC_MASTER_URL_BASE = 'https://raw.githubusercontent.com/{owner}/{repo}/{branch}/i-family-masters/';
const FC_OUTPUT_PATH_BASE = 'i-family/';

const FC_DESIGN_CODES = ['01-classic', '02-editorial', '03-letterpress', '04-vermilion',
                       '05-botanical', '06-hangeul', '07-architect', '08-noir'];

// 시트 컬럼 인덱스 (1-based, A=1)
const FC_COL = {
  eventId: 1, groomName: 2, brideName: 3, groomEmail: 4, brideEmail: 5,
  weddingDate: 6, groomNameEn: 7, brideNameEn: 8, weddingTime: 9,
  groomBank: 10, groomAccount: 11, brideBank: 12, brideAccount: 13,
  vimeoId: 14, vimeoHash: 15, groomParents: 16, brideParents: 17,
  // 가족 카드 컬럼 (R~Z)
  familyActive: 18, familyDesign: 19, venueNameKo: 20, venueNameEn: 21,
  venueAddress: 22, venueTel: 23, venueTransport: 24, venueParking: 25,
  venueMapIframe: 26
};

// ───────────────────────────────────────────────────────────────────
// 시트 메뉴 추가 (Code.gs의 onOpen이 이 함수를 호출함)
// ───────────────────────────────────────────────────────────────────
function FC_addFamilyMenu() {
  SpreadsheetApp.getUi()
    .createMenu('Moment Edit')
    .addItem('가족 청첩장 빌드 (선택한 행)', 'FC_buildFromSelectedRow')
    .addItem('가족 청첩장 빌드 (eventId 입력)', 'FC_buildFromEventIdPrompt')
    .addSeparator()
    .addItem('전체 활성 부부 빌드 (familyActive=Y)', 'FC_buildAllActive')
    .addSeparator()
    .addItem('연결 테스트 (GitHub)', 'FC_testGithubConnection')
    .addToUi();
}

// ───────────────────────────────────────────────────────────────────
// 진입점들
// ───────────────────────────────────────────────────────────────────
function FC_buildFromSelectedRow() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FC_SHEET_COUPLES);
  const row = SpreadsheetApp.getActiveRange().getRow();
  if (row < 4) {
    SpreadsheetApp.getUi().alert('데이터 행을 선택해주세요 (4행 이상).\n\nv5.0 시트 구조:\n  row 1 = 버튼/안내\n  row 2 = 한글 라벨\n  row 3 = 영문 헤더\n  row 4+ = 데이터');
    return;
  }
  const eventId = sheet.getRange(row, FC_COL.eventId).getValue();
  if (!eventId) {
    SpreadsheetApp.getUi().alert('선택한 행에 eventId가 없습니다.');
    return;
  }
  FC_buildFamilyCard(eventId);
}

function FC_buildFromEventIdPrompt() {
  const ui = SpreadsheetApp.getUi();
  const response = ui.prompt('가족 청첩장 빌드', 'eventId를 입력하세요 (예: kmj-lsy-0823)', ui.ButtonSet.OK_CANCEL);
  if (response.getSelectedButton() !== ui.Button.OK) return;
  const eventId = response.getResponseText().trim();
  if (eventId) FC_buildFamilyCard(eventId);
}

function FC_buildAllActive() {
  const ui = SpreadsheetApp.getUi();
  const confirm = ui.alert('전체 빌드', 'familyActive=Y 인 모든 부부의 가족 청첩장을 빌드합니다. 계속하시겠습니까?', ui.ButtonSet.YES_NO);
  if (confirm !== ui.Button.YES) return;

  const couples = FC_loadAllActiveCouples();
  ui.alert(`총 ${couples.length}개 빌드 시작.`);

  let success = 0, fail = 0;
  couples.forEach(c => {
    try {
      FC_buildFamilyCard(c.eventId, /*silent=*/ true);
      success++;
    } catch (e) {
      fail++;
      FC_logBuild(c.eventId, c.familyDesign, 'ERROR', '', e.message);
    }
  });

  ui.alert(`완료: 성공 ${success} · 실패 ${fail}\nBuildLogs 시트에서 상세 확인하세요.`);
}

// ───────────────────────────────────────────────────────────────────
// 메인: 가족 청첩장 빌드
// ───────────────────────────────────────────────────────────────────
function FC_buildFamilyCard(eventId, silent) {
  const ui = SpreadsheetApp.getUi();

  try {
    // 1. 데이터 로드
    const data = FC_loadCoupleData(eventId);
    if (!data) {
      const msg = `eventId "${eventId}"를 찾을 수 없습니다.`;
      if (!silent) ui.alert(msg);
      FC_logBuild(eventId, '', 'ERROR', '', msg);
      return;
    }

    // 2. familyActive 체크
    if (String(data.familyActive).toUpperCase() !== 'Y') {
      const msg = `familyActive가 Y가 아닙니다. (현재: ${data.familyActive})`;
      if (!silent) ui.alert(msg);
      FC_logBuild(eventId, data.familyDesign, 'SKIP', '', msg);
      return;
    }

    // 3. 필수 필드 검증
    const missing = FC_validateRequiredFields(data);
    if (missing.length > 0) {
      const msg = `필수 필드 누락: ${missing.join(', ')}`;
      if (!silent) ui.alert(msg);
      FC_logBuild(eventId, data.familyDesign, 'ERROR', '', msg);
      return;
    }

    // 4. 디자인 코드 검증
    const designCode = String(data.familyDesign).trim();
    const fullDesignCode = FC_findFullDesignCode(designCode);
    if (!fullDesignCode) {
      const msg = `잘못된 디자인 코드: "${designCode}" (01~08 또는 01-classic 형식)`;
      if (!silent) ui.alert(msg);
      FC_logBuild(eventId, designCode, 'ERROR', '', msg);
      return;
    }

    // 5. 마스터 HTML 로드 (GitHub)
    const masterHtml = FC_loadMasterHtml(fullDesignCode);

    // 6. placeholder 치환
    const finalHtml = FC_transformPlaceholders(masterHtml, data);

    // 7. GitHub에 push
    const filename = `${eventId}.html`;
    const githubPath = `${FC_OUTPUT_PATH_BASE}${filename}`;
    FC_pushToGithub(finalHtml, githubPath, `Build family card: ${eventId} (${fullDesignCode})`);

    // 8. 결과 URL
    const url = `https://momentedit.kr/${githubPath}`;

    // 9. 로그 기록
    FC_logBuild(eventId, fullDesignCode, 'OK', url, '');

    if (!silent) {
      ui.alert(`✅ 빌드 완료\n\neventId: ${eventId}\n디자인: ${fullDesignCode}\nURL: ${url}\n\n배포까지 1~2분 소요됩니다.`);
    }

  } catch (e) {
    const msg = `빌드 실패: ${e.message}\n${e.stack || ''}`;
    if (!silent) ui.alert(msg);
    FC_logBuild(eventId, '', 'ERROR', '', e.message);
  }
}

// ───────────────────────────────────────────────────────────────────
// 시트 데이터 로드
// ───────────────────────────────────────────────────────────────────
function FC_loadCoupleData(eventId) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FC_SHEET_COUPLES);
  const values = sheet.getDataRange().getValues();

  for (let i = 3; i < values.length; i++) {  // v4.1: 4행부터 데이터 (row 1=버튼, row 2=한글, row 3=영문헤더)
    if (String(values[i][FC_COL.eventId - 1]).trim() === String(eventId).trim()) {
      const row = values[i];
      return {
        eventId: row[FC_COL.eventId - 1],
        groomName: row[FC_COL.groomName - 1],
        brideName: row[FC_COL.brideName - 1],
        weddingDate: row[FC_COL.weddingDate - 1],
        groomNameEn: row[FC_COL.groomNameEn - 1],
        brideNameEn: row[FC_COL.brideNameEn - 1],
        weddingTime: row[FC_COL.weddingTime - 1],
        groomBank: row[FC_COL.groomBank - 1],
        groomAccount: row[FC_COL.groomAccount - 1],
        brideBank: row[FC_COL.brideBank - 1],
        brideAccount: row[FC_COL.brideAccount - 1],
        groomParents: row[FC_COL.groomParents - 1],
        brideParents: row[FC_COL.brideParents - 1],
        familyActive: row[FC_COL.familyActive - 1],
        familyDesign: row[FC_COL.familyDesign - 1],
        venueNameKo: row[FC_COL.venueNameKo - 1],
        venueNameEn: row[FC_COL.venueNameEn - 1],
        venueAddress: row[FC_COL.venueAddress - 1],
        venueTel: row[FC_COL.venueTel - 1],
        venueTransport: row[FC_COL.venueTransport - 1],
        venueParking: row[FC_COL.venueParking - 1],
        venueMapIframe: row[FC_COL.venueMapIframe - 1]
      };
    }
  }
  return null;
}

function FC_loadAllActiveCouples() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FC_SHEET_COUPLES);
  const values = sheet.getDataRange().getValues();
  const couples = [];
  for (let i = 3; i < values.length; i++) {  // v4.1: 4행부터 데이터
    const eventId = String(values[i][FC_COL.eventId - 1]).trim();
    const active = String(values[i][FC_COL.familyActive - 1]).trim().toUpperCase();
    if (eventId && active === 'Y') {
      couples.push({ eventId: eventId, familyDesign: values[i][FC_COL.familyDesign - 1] });
    }
  }
  return couples;
}

function FC_validateRequiredFields(data) {
  const missing = [];
  const required = {
    'eventId': data.eventId, 'groomName': data.groomName, 'brideName': data.brideName,
    'weddingDate': data.weddingDate, 'weddingTime': data.weddingTime,
    'groomNameEn': data.groomNameEn, 'brideNameEn': data.brideNameEn,
    'groomBank': data.groomBank, 'groomAccount': data.groomAccount,
    'brideBank': data.brideBank, 'brideAccount': data.brideAccount,
    'familyDesign': data.familyDesign,
    'venueNameKo': data.venueNameKo, 'venueAddress': data.venueAddress,
    'venueTransport': data.venueTransport,
    'venueParking': data.venueParking, 'venueMapIframe': data.venueMapIframe
  };
  for (const key in required) {
    if (!required[key] || String(required[key]).trim() === '') missing.push(key);
  }
  return missing;
}

function FC_findFullDesignCode(input) {
  // "01" → "01-classic", "01-classic" → "01-classic"
  const s = String(input).trim().toLowerCase();
  for (const code of FC_DESIGN_CODES) {
    if (code === s || code.startsWith(s + '-') || code.split('-')[0] === s) {
      return code;
    }
  }
  return null;
}

// ───────────────────────────────────────────────────────────────────
// 마스터 HTML 로드 (GitHub raw)
// ───────────────────────────────────────────────────────────────────
function FC_loadMasterHtml(designCode) {
  const props = PropertiesService.getScriptProperties();
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';
  const filename = `invitation-${designCode}-family.html`;
  const url = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/i-family-masters/${filename}`;

  const response = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
  if (response.getResponseCode() !== 200) {
    throw new Error(`마스터 fetch 실패 (${response.getResponseCode()}): ${url}`);
  }
  return response.getContentText();
}

// ───────────────────────────────────────────────────────────────────
// 47종 placeholder 치환
// ───────────────────────────────────────────────────────────────────
function FC_transformPlaceholders(masterHtml, data) {
  let html = masterHtml;

  // 디자인 코드에서 번호 추출 (01, 02, ...)
  const designNum = String(data.familyDesign).trim().split('-')[0].padStart(2, '0');

  // 1. 시트 직접 매핑 (10종)
  html = FC_replaceAll(html, '{{GROOM_NAME}}', FC_escapeHtml(data.groomName));
  html = FC_replaceAll(html, '{{BRIDE_NAME}}', FC_escapeHtml(data.brideName));
  html = FC_replaceAll(html, '{{GROOM_BANK}}', FC_escapeHtml(data.groomBank + (data.groomBank.endsWith('은행') ? '' : '은행')));
  html = FC_replaceAll(html, '{{BRIDE_BANK}}', FC_escapeHtml(data.brideBank + (data.brideBank.endsWith('은행') ? '' : '은행')));
  html = FC_replaceAll(html, '{{GROOM_ACCOUNT}}', FC_escapeHtml(String(data.groomAccount)));
  html = FC_replaceAll(html, '{{BRIDE_ACCOUNT}}', FC_escapeHtml(String(data.brideAccount)));
  html = FC_replaceAll(html, '{{GROOM_ACCOUNT_RAW}}', String(data.groomAccount).replace(/-/g, ''));
  html = FC_replaceAll(html, '{{BRIDE_ACCOUNT_RAW}}', String(data.brideAccount).replace(/-/g, ''));
  html = FC_replaceAll(html, '{{GROOM_PARENTS}}', FC_escapeHtml(data.groomParents || ''));
  html = FC_replaceAll(html, '{{BRIDE_PARENTS}}', FC_escapeHtml(data.brideParents || ''));

  // 2. 영문 이름 변환 (8종)
  const groomEnForms = FC_transformEnName(data.groomNameEn);
  const brideEnForms = FC_transformEnName(data.brideNameEn);
  html = FC_replaceAll(html, '{{GROOM_FIRST_EN_UPPER}}', groomEnForms.upper);
  html = FC_replaceAll(html, '{{BRIDE_FIRST_EN_UPPER}}', brideEnForms.upper);
  html = FC_replaceAll(html, '{{GROOM_FIRST_EN}}', groomEnForms.first);
  html = FC_replaceAll(html, '{{BRIDE_FIRST_EN}}', brideEnForms.first);
  html = FC_replaceAll(html, '{{GROOM_FIRST_EN_SPACED}}', groomEnForms.spaced);
  html = FC_replaceAll(html, '{{BRIDE_FIRST_EN_SPACED}}', brideEnForms.spaced);
  html = FC_replaceAll(html, '{{GROOM_FULL_EN}}', groomEnForms.full);
  html = FC_replaceAll(html, '{{BRIDE_FULL_EN}}', brideEnForms.full);

  // 3. 날짜 변환 (8종)
  const dateForms = FC_transformDate(data.weddingDate);
  html = FC_replaceAll(html, '{{WEDDING_DATE_DISPLAY}}', dateForms.display);          // 2026. 08. 23
  html = FC_replaceAll(html, '{{WEDDING_MONTH_DAY_DISPLAY}}', dateForms.monthDay);    // 08 · 23
  html = FC_replaceAll(html, '{{WEDDING_MONTH_EN}}', dateForms.monthEn);              // August 2026
  html = FC_replaceAll(html, '{{WEDDING_YEAR_EN}}', dateForms.yearEn);                // Two Thousand Twenty-Six
  html = FC_replaceAll(html, '{{WEDDING_FULL_DATE_DOT}}', dateForms.fullDot);         // 2026 · 08 · 23
  html = FC_replaceAll(html, '{{WEDDING_MONTH_SLASH}}', dateForms.monthSlash);        // 08 / 2026
  html = FC_replaceAll(html, '{{WEDDING_MONTH_KOR}}', dateForms.monthKor);            // 8월
  html = FC_replaceAll(html, '{{WEDDING_MONTH_DAY_PERIOD}}', dateForms.monthDayPeriod); // 08.23

  // 4. 요일/시간 변환 (5종)
  html = FC_replaceAll(html, '{{WEDDING_DAY_EN}}', dateForms.dayEn);          // Sunday
  html = FC_replaceAll(html, '{{WEDDING_DAY_EN_SHORT}}', dateForms.dayEnShort); // Sun
  html = FC_replaceAll(html, '{{WEDDING_DAY_KOR}}', dateForms.dayKor);        // 일요일

  const timeForms = FC_transformTime(data.weddingTime);
  html = FC_replaceAll(html, '{{WEDDING_TIME_DISPLAY}}', timeForms.display);  // 오후 2:00
  html = FC_replaceAll(html, '{{WEDDING_TIME_KOR}}', timeForms.kor);          // 오후 두 시

  // 5. 캘린더 셀 HTML 생성
  const calHtml = FC_generateCalendarCells(data.weddingDate, designNum);
  html = FC_replaceAll(html, '{{CALENDAR_CELLS_HTML}}', calHtml);

  // 6. 식장 정보 (7종)
  html = FC_replaceAll(html, '{{VENUE_NAME_KO}}', FC_escapeHtml(data.venueNameKo));
  html = FC_replaceAll(html, '{{VENUE_NAME_KO_URI}}', encodeURIComponent(data.venueNameKo));
  html = FC_replaceAll(html, '{{VENUE_ADDRESS}}', FC_escapeHtml(data.venueAddress));
  html = FC_replaceAll(html, '{{VENUE_TRANSPORT}}', data.venueTransport);  // HTML 허용 (br 등)
  html = FC_replaceAll(html, '{{VENUE_PARKING}}', FC_escapeHtml(data.venueParking));
  html = FC_replaceAll(html, '{{VENUE_MAP_IFRAME}}', data.venueMapIframe);  // URL 그대로

  // 7. 메타
  html = FC_replaceAll(html, '{{EVENT_ID}}', data.eventId);

  // 8. OPTIONAL 마커 처리
  html = FC_processOptionalMarkers(html, data);

  return html;
}

// ───────────────────────────────────────────────────────────────────
// 영문 이름 변환 (시트에 "Kim Minjun" 입력 → 4종 변형 생성)
// ───────────────────────────────────────────────────────────────────
function FC_transformEnName(fullName) {
  // 입력: "Kim Minjun" 또는 "Lee Seoyeon"
  // 출력: { upper, first, spaced, full }
  const trimmed = String(fullName || '').trim();
  const parts = trimmed.split(/\s+/);
  let first = '';   // "Minjun"
  if (parts.length >= 2) first = parts.slice(1).join('');
  else first = trimmed;

  return {
    full: trimmed,                              // "Kim Minjun"
    first: first,                               // "Minjun"
    upper: first.toUpperCase(),                 // "MINJUN"
    spaced: FC_splitCamelCase(first)               // "Min Jun" (대문자 단위로 분리)
  };
}

function FC_splitCamelCase(s) {
  // "Minjun" → "Min Jun" (한국식 두 음절 가정: 첫 글자 + 나머지 절반)
  if (s.length <= 1) return s;
  // 간단한 규칙: 단어 길이의 절반 지점에서 공백 삽입
  const mid = Math.ceil(s.length / 2);
  return s.slice(0, mid) + ' ' + s.slice(mid);
}

// ───────────────────────────────────────────────────────────────────
// 날짜 변환
// ───────────────────────────────────────────────────────────────────
function FC_transformDate(weddingDate) {
  const date = weddingDate instanceof Date ? weddingDate : new Date(weddingDate);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const dayIdx = date.getDay();  // 0=Sun

  const monthNamesEn = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  const dayNamesEn = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const dayNamesEnShort = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const dayNamesKor = ['일요일','월요일','화요일','수요일','목요일','금요일','토요일'];

  return {
    display: `${y}. ${m}. ${d}`,                            // 2026. 08. 23
    monthDay: `${m} · ${d}`,                                // 08 · 23
    monthEn: `${monthNamesEn[date.getMonth()]} ${y}`,       // August 2026
    yearEn: FC_yearToEnglish(y),                               // Two Thousand Twenty-Six
    fullDot: `${y} · ${m} · ${d}`,                          // 2026 · 08 · 23
    monthSlash: `${m} / ${y}`,                              // 08 / 2026
    monthKor: `${parseInt(m)}월`,                           // 8월
    monthDayPeriod: `${m}.${d}`,                            // 08.23
    dayEn: dayNamesEn[dayIdx],                              // Sunday
    dayEnShort: dayNamesEnShort[dayIdx],                    // Sun
    dayKor: dayNamesKor[dayIdx]                             // 일요일
  };
}

function FC_yearToEnglish(year) {
  // 2026 → "Two Thousand Twenty-Six"
  const ones = ['','One','Two','Three','Four','Five','Six','Seven','Eight','Nine'];
  const teens = ['Ten','Eleven','Twelve','Thirteen','Fourteen','Fifteen','Sixteen','Seventeen','Eighteen','Nineteen'];
  const tens = ['','','Twenty','Thirty','Forty','Fifty','Sixty','Seventy','Eighty','Ninety'];

  const thousand = Math.floor(year / 1000);
  const remainder = year % 1000;
  const hundred = Math.floor(remainder / 100);
  const last2 = remainder % 100;

  let result = '';
  if (thousand > 0) result += ones[thousand] + ' Thousand';
  if (hundred > 0) result += (result ? ' ' : '') + ones[hundred] + ' Hundred';
  if (last2 > 0) {
    if (result) result += ' ';
    if (last2 < 10) result += ones[last2];
    else if (last2 < 20) result += teens[last2 - 10];
    else {
      const t = Math.floor(last2 / 10);
      const o = last2 % 10;
      result += tens[t] + (o > 0 ? '-' + ones[o] : '');
    }
  }
  return result;
}

// ───────────────────────────────────────────────────────────────────
// 시간 변환 (14:00 → "오후 2:00" / "오후 두 시")
// ───────────────────────────────────────────────────────────────────
function FC_transformTime(weddingTime) {
  const s = String(weddingTime || '14:00').trim();
  const match = s.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) return { display: s, kor: s };

  const hour24 = parseInt(match[1]);
  const min = match[2];
  const isPm = hour24 >= 12;
  const hour12 = hour24 > 12 ? hour24 - 12 : (hour24 === 0 ? 12 : hour24);
  const period = isPm ? '오후' : '오전';

  // "오후 2:00"
  const display = `${period} ${hour12}:${min}`;

  // "오후 두 시" (한국어 정시 표현, 30분 단위까지)
  const hourKor = ['','한','두','세','네','다섯','여섯','일곱','여덟','아홉','열','열한','열두'];
  let kor;
  if (min === '00') kor = `${period} ${hourKor[hour12]} 시`;
  else if (min === '30') kor = `${period} ${hourKor[hour12]} 시 반`;
  else kor = `${period} ${hourKor[hour12]} 시 ${parseInt(min)}분`;

  return { display: display, kor: kor };
}

// ───────────────────────────────────────────────────────────────────
// 캘린더 셀 HTML 생성 (디자인별로 클래스명 다름)
// ───────────────────────────────────────────────────────────────────
function FC_generateCalendarCells(weddingDate, designNum) {
  const date = weddingDate instanceof Date ? weddingDate : new Date(weddingDate);
  const year = date.getFullYear();
  const month = date.getMonth();
  const weddingDay = date.getDate();

  const firstDay = new Date(year, month, 1).getDay();  // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // 디자인별 클래스명
  let cellCls, sunCls, highlightAttr;
  if (designNum === '01') {
    cellCls = 'when-cal-cell';
    sunCls = 'when-cal-cell when-cal-cell-sun';
    highlightAttr = ' when-cal-cell-today';
  } else {
    cellCls = 'date-cal-cell';
    sunCls = 'date-cal-cell sun';
    highlightAttr = ' today';
  }

  let html = '';
  // 빈 셀 (월초 이전)
  for (let i = 0; i < firstDay; i++) {
    html += `<div class="${cellCls} empty" aria-hidden="true"></div>\n          `;
  }
  // 날짜 셀
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = (firstDay + d - 1) % 7;
    const isSun = dayOfWeek === 0;
    const isWedding = d === weddingDay;
    let cls = isSun ? sunCls : cellCls;
    if (isWedding) cls += highlightAttr;
    html += `<div class="${cls}">${d}</div>\n          `;
  }

  return html.trim();
}

// ───────────────────────────────────────────────────────────────────
// OPTIONAL 마커 처리
// 부모 정보가 비어있으면 <!-- OPTIONAL:groomParents --> ~ <!-- /OPTIONAL:... --> 영역 삭제
// 채워져있으면 마커만 제거
// ───────────────────────────────────────────────────────────────────
function FC_processOptionalMarkers(html, data) {
  // groomParents
  if (!data.groomParents || String(data.groomParents).trim() === '') {
    html = html.replace(/[ \t]*<!-- OPTIONAL:groomParents -->[\s\S]*?<!-- \/OPTIONAL:groomParents -->\n?/g, '');
  } else {
    html = html.replace(/<!-- OPTIONAL:groomParents -->/g, '');
    html = html.replace(/<!-- \/OPTIONAL:groomParents -->/g, '');
  }
  // brideParents
  if (!data.brideParents || String(data.brideParents).trim() === '') {
    html = html.replace(/[ \t]*<!-- OPTIONAL:brideParents -->[\s\S]*?<!-- \/OPTIONAL:brideParents -->\n?/g, '');
  } else {
    html = html.replace(/<!-- OPTIONAL:brideParents -->/g, '');
    html = html.replace(/<!-- \/OPTIONAL:brideParents -->/g, '');
  }
  return html;
}

// ───────────────────────────────────────────────────────────────────
// GitHub API: push
// ───────────────────────────────────────────────────────────────────
function FC_pushToGithub(content, path, commitMessage) {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const branch = props.getProperty('GITHUB_BRANCH') || 'main';

  if (!token) throw new Error('GITHUB_TOKEN이 설정되지 않았습니다. (스크립트 속성)');

  const apiUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${path}`;

  // 기존 파일 sha 조회 (없으면 신규)
  let sha = null;
  const getResp = UrlFetchApp.fetch(apiUrl + `?ref=${branch}`, {
    headers: { Authorization: `token ${token}` },
    muteHttpExceptions: true
  });
  if (getResp.getResponseCode() === 200) {
    sha = JSON.parse(getResp.getContentText()).sha;
  }

  // base64 인코딩
  const base64 = Utilities.base64Encode(content, Utilities.Charset.UTF_8);

  // PUT 요청
  const payload = {
    message: commitMessage,
    content: base64,
    branch: branch
  };
  if (sha) payload.sha = sha;

  const putResp = UrlFetchApp.fetch(apiUrl, {
    method: 'put',
    headers: {
      Authorization: `token ${token}`,
      'Content-Type': 'application/json'
    },
    payload: JSON.stringify(payload),
    muteHttpExceptions: true
  });

  const code = putResp.getResponseCode();
  if (code !== 200 && code !== 201) {
    throw new Error(`GitHub push 실패 (${code}): ${putResp.getContentText().slice(0, 500)}`);
  }
}

// ───────────────────────────────────────────────────────────────────
// BuildLogs 기록
// ───────────────────────────────────────────────────────────────────
function FC_logBuild(eventId, design, status, url, errorMsg) {
  let sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(FC_SHEET_BUILD_LOGS);
  if (!sheet) {
    sheet = SpreadsheetApp.getActiveSpreadsheet().insertSheet(FC_SHEET_BUILD_LOGS);
    sheet.appendRow(['timestamp', 'eventId', 'design', 'status', 'url', 'error']);
  }
  sheet.appendRow([new Date(), eventId, design, status, url, errorMsg]);
}

// ───────────────────────────────────────────────────────────────────
// GitHub 연결 테스트
// ───────────────────────────────────────────────────────────────────
function FC_testGithubConnection() {
  const props = PropertiesService.getScriptProperties();
  const token = props.getProperty('GITHUB_TOKEN');
  const owner = props.getProperty('GITHUB_OWNER');
  const repo = props.getProperty('GITHUB_REPO');
  const ui = SpreadsheetApp.getUi();

  if (!token || !owner || !repo) {
    ui.alert('Properties 누락\n\nProperties Service에 다음을 설정하세요:\n- GITHUB_TOKEN\n- GITHUB_OWNER\n- GITHUB_REPO\n- GITHUB_BRANCH (선택, 기본 main)');
    return;
  }

  const url = `https://api.github.com/repos/${owner}/${repo}`;
  const resp = UrlFetchApp.fetch(url, {
    headers: { Authorization: `token ${token}` },
    muteHttpExceptions: true
  });

  if (resp.getResponseCode() === 200) {
    const info = JSON.parse(resp.getContentText());
    ui.alert(`✅ GitHub 연결 성공\n\nRepo: ${info.full_name}\nDefault branch: ${info.default_branch}\nPrivate: ${info.private}`);
  } else {
    ui.alert(`❌ GitHub 연결 실패 (${resp.getResponseCode()})\n\n${resp.getContentText().slice(0, 300)}`);
  }
}

// ───────────────────────────────────────────────────────────────────
// 유틸: 안전 치환
// ───────────────────────────────────────────────────────────────────
function FC_replaceAll(str, find, replace) {
  return str.split(find).join(replace);
}

function FC_escapeHtml(s) {
  if (s === null || s === undefined) return '';
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
