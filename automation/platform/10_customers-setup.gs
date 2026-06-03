/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T1 Customers 마스터 시트 세팅
 * ──────────────────────────────────────────────────────────────────────────
 * setupCustomers()  : 헤더 28컬럼 + 데이터 검증(드롭다운) + 서식. 멱등(재실행 안전).
 *                     (Phase1 23 + 계약·입금 5칸: 시착동의일시·계약서명일시·계약서링크·동의기록·입금자명)
 * getCustomersSheet(): Customers 탭 핸들 (없으면 명확한 오류).
 *
 * 헬퍼는 consultation-booking.gs 의 것을 재사용: buildHeaderIndex · writeCell.
 * (Customers 도 HEADER_ROW=1 이라 그대로 호환됩니다.)
 */

// Customers 탭 핸들. 없으면 setupCustomers() 안내.
function getCustomersSheet() {
  var sh = SpreadsheetApp.getActive().getSheetByName(P.CUSTOMERS_SHEET);
  if (!sh) throw new Error("시트 없음: '" + P.CUSTOMERS_SHEET + "' — setupCustomers()를 먼저 실행하세요.");
  return sh;
}

// ============================ 설치(최초 1회 + 언제든 재실행 가능) ============================
// 통합 스프레드시트에 Customers 탭을 만들고 헤더·검증·서식을 코드로 재생성한다.
// setupConsultation() 패턴과 동일한 멱등 구조 — 여러 번 실행해도 깨지지 않는다.
function setupCustomers() {
  var ss = SpreadsheetApp.getActive();
  var sheet = ss.getSheetByName(P.CUSTOMERS_SHEET) || ss.insertSheet(P.CUSTOMERS_SHEET, 0); // 첫 탭으로

  // 0) 컬럼 수 보장 — 헤더가 늘어나면(예: 23→28) 부족한 만큼 열을 먼저 추가한다.
  //    (안 하면 아래 setValues(1,1,1,헤더수)가 기존 그리드 열수를 초과해 실패한다)
  if (sheet.getMaxColumns() < CUSTOMER_HEADERS.length) {
    sheet.insertColumnsAfter(sheet.getMaxColumns(), CUSTOMER_HEADERS.length - sheet.getMaxColumns());
  }

  // 1) 헤더 (1행) — 항상 설계서 순서로 덮어써서 헤더 드리프트 방지
  sheet.getRange(P.HEADER_ROW, 1, 1, CUSTOMER_HEADERS.length).setValues([CUSTOMER_HEADERS]);
  sheet.getRange(P.HEADER_ROW, 1, 1, CUSTOMER_HEADERS.length)
    .setFontWeight('bold').setBackground('#F3ECDF').setFontColor('#3A2D22')
    .setVerticalAlignment('middle').setWrap(true).setFontSize(10);
  sheet.setRowHeight(P.HEADER_ROW, 34);
  sheet.setFrozenRows(P.HEADER_ROW);

  var colOf = buildHeaderIndex(sheet); // 재사용
  var maxRows = sheet.getMaxRows();
  var bodyRows = Math.max(maxRows - P.HEADER_ROW, 1);

  // 2) 텍스트 고정 — 시트가 코드/날짜/연락처를 멋대로 숫자·날짜로 바꾸지 않게 '@' 서식
  //    (개인코드 'A7K2QX'가 날짜로 둔갑하거나, 토큰 앞 0이 사라지는 사고 방지)
  //    신규: 시착동의일시·계약서명일시(KST 문자열)·동의기록(JSON)도 텍스트 고정
  ['개인코드', '비번해시', '로그인토큰', '토큰만료', '연락처', '생성일시', '최종수정', 'eventId', '입금완료신호', '시착동의일시', '계약서발송일시', '계약서명일시', '동의기록']
    .forEach(function (h) {
      if (colOf[h]) sheet.getRange(P.DATA_START_ROW, colOf[h], bodyRows, 1).setNumberFormat('@');
    });

  // 3) 데이터 검증(드롭다운) — 6종. 값 목록은 설계서 그대로.
  Object.keys(CUSTOMER_VALS).forEach(function (h) {
    var c = colOf[h];
    if (!c) return;
    var rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(CUSTOMER_VALS[h], true)
      .setAllowInvalid(false)   // 목록 밖 값 차단
      .build();
    sheet.getRange(P.DATA_START_ROW, c, bodyRows, 1).setDataValidation(rule);
  });

  // 4) 서식 한 번에 정리
  formatCustomersSheet();

  Logger.log('✅ setupCustomers 완료 — %s 탭 · %s열 · 드롭다운 %s종',
    P.CUSTOMERS_SHEET, CUSTOMER_HEADERS.length, Object.keys(CUSTOMER_VALS).length);
  return 'Customers 설치 완료 (' + CUSTOMER_HEADERS.length + '열).';
}

// ============================ 시트 서식 (열폭·정렬·상태 색상·민감열 흐리게) ============================
function formatCustomersSheet() {
  var sheet = getCustomersSheet();
  var colOf = buildHeaderIndex(sheet);
  var lastCol = sheet.getLastColumn();
  var maxRows = sheet.getMaxRows();
  var bodyRows = Math.max(maxRows - P.HEADER_ROW, 1);

  // 본문 기본 정렬
  sheet.getRange(P.DATA_START_ROW, 1, bodyRows, lastCol)
    .setVerticalAlignment('top').setFontSize(10).setFontColor('#1C1B19');

  // 열폭
  var W = {
    '개인코드': 90, '비번해시': 120, '로그인토큰': 90, '토큰만료': 140,
    '신랑이름': 90, '신부이름': 110, '연락처': 120, '이메일': 190,
    '상품타입': 90, '현재단계': 100,
    '계약상태': 90, '입금상태': 90, '제작상태': 90, '결과물상태': 90,
    'eventId': 110,
    '제작임시저장': 140, '입금완료신호': 140,
    '원본링크': 160, '영상링크': 160, '보정본폴더': 160,
    '관리자메모': 180, '생성일시': 150, '최종수정': 150,
    '시착동의상태': 100, '시착동의일시': 140, '계약서발송일시': 140, '계약서명일시': 140, '계약서링크': 160, '동의기록': 200, '입금자명': 110
  };
  Object.keys(W).forEach(function (h) { if (colOf[h]) sheet.setColumnWidth(colOf[h], W[h]); });

  // 가운데 정렬 컬럼
  ['개인코드', '상품타입', '현재단계', '시착동의상태', '계약상태', '입금상태', '제작상태', '결과물상태'].forEach(function (h) {
    if (colOf[h]) sheet.getRange(P.DATA_START_ROW, colOf[h], bodyRows, 1).setHorizontalAlignment('center');
  });

  // 개인코드 강조 (마스터키)
  if (colOf['개인코드']) {
    sheet.getRange(P.DATA_START_ROW, colOf['개인코드'], bodyRows, 1)
      .setFontWeight('bold').setFontColor('#8A5A2B').setFontFamily('Roboto Mono');
  }

  // 민감/내부 열 흐리게 — 비번해시·토큰·동의기록(JSON)은 눈에 잘 안 띄게(원문/내부 데이터)
  ['비번해시', '로그인토큰', '토큰만료', '제작임시저장', '동의기록'].forEach(function (h) {
    if (colOf[h]) sheet.getRange(P.HEADER_ROW, colOf[h], maxRows, 1).setFontColor('#B0AAA0').setFontSize(8);
  });

  // 틀 고정: 개인코드~신부이름까지 보이게
  sheet.setFrozenColumns(colOf['신부이름'] || 6);

  // 현재단계 색상 (정상 경로 = 차분, 예외 = 경고)
  var stCol = colOf['현재단계'];
  if (stCol) {
    var rng = sheet.getRange(P.DATA_START_ROW, stCol, bodyRows, 1);
    function R(t, bg, fg) {
      return SpreadsheetApp.newConditionalFormatRule()
        .whenTextEqualTo(t).setBackground(bg).setFontColor(fg).setBold(true).setRanges([rng]).build();
    }
    var rules = [
      R('신청접수', '#FBF1E6', '#8A5A2B'),
      R('상담확정', '#EAF0F6', '#2B5A8A'), R('촬영확정', '#EAF0F6', '#2B5A8A'),
      R('상담완료', '#EAF0F6', '#2B5A8A'),
      R('계약완료', '#E7F1EA', '#2E6B43'), R('입금완료', '#E3EFE6', '#1F6B3A'),
      R('제작중', '#F1EEF6', '#5A4B8A'), R('청첩장발행', '#F1EEF6', '#5A4B8A'),
      R('예식완료', '#E3EFE6', '#1F6B3A'), R('촬영완료', '#E3EFE6', '#1F6B3A'),
      R('결과물전달', '#E3EFE6', '#1F6B3A'),
      R('미계약', '#F2EDED', '#9A4A45'), R('취소', '#F2EDED', '#9A4A45'), R('노쇼', '#F2EDED', '#9A4A45')
    ];
    // 기존 규칙은 두고 새로 덮기(이 시트 전용이므로 set 으로 정리)
    sheet.setConditionalFormatRules(rules);
  }

  // 자동 필터
  try { if (sheet.getFilter()) sheet.getFilter().remove(); } catch (e) {}
  try { sheet.getRange(1, 1, Math.max(sheet.getLastRow(), 1), lastCol).createFilter(); } catch (e) {}

  try { SpreadsheetApp.getActive().toast('Customers 서식 정리 완료', 'Moment Edit', 4); } catch (e) {}
  return 'Customers 서식 정리 완료';
}
