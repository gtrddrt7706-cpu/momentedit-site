/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T1 Customers 마스터 시트 세팅
 * ──────────────────────────────────────────────────────────────────────────
 * setupCustomers()  : 헤더 32컬럼 + 데이터 검증(드롭다운) + 서식. 멱등(재실행 안전·기존 데이터 보존).
 *                     단, 재실행 안전은 '시트 헤더 순서 == CUSTOMER_HEADERS'일 때만 성립 → HEADER_ORDER_GUARD가 먼저 대조하고
 *                     다르면 아무것도 바꾸지 않고 중단한다(라벨만 밀려 쓰이는 열 오정렬 방지).
 *                     (Phase1 23 + 계약·입금 8칸 + ⑧관리자 처리이력 1칸 = 32. 새 칸은 끝에 append)
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

  // ★HEADER_ORDER_GUARD(2026-07-25) — '멱등·재실행 안전'은 기존 헤더 순서가 CUSTOMER_HEADERS와 같을 때만 참이다.
  //   운영 중 열이 append로 늘어난 뒤(addProdTrackColumns·addGuideTokenColumn 등) 코드 리터럴의 순서가 어긋나 있으면,
  //   아래 setValues는 데이터는 그대로 둔 채 '라벨만' 밀어 써서 열 전체를 조용히 오정렬시킨다(복구 난이도 최상).
  //   그래서 덮어쓰기 전에 대조하고, 다르면 아무것도 하지 않고 멈춘다. 시트를 고치는 게 아니라 코드 순서를 시트에 맞춰야 한다.
  var _exCols = Math.min(sheet.getLastColumn(), CUSTOMER_HEADERS.length);
  if (_exCols > 0) {
    var _ex = sheet.getRange(P.HEADER_ROW, 1, 1, _exCols).getValues()[0];
    var _bad = [];
    for (var _i = 0; _i < _exCols; _i++) {
      var _h = String(_ex[_i] || '').trim();
      if (_h && _h !== CUSTOMER_HEADERS[_i]) _bad.push((_i + 1) + '열: 시트 "' + _h + '" ≠ 코드 "' + CUSTOMER_HEADERS[_i] + '"');
    }
    if (_bad.length) {
      // ★문구 정확성(2026-07-26): 바로 위 insertColumnsAfter가 이미 빈 열을 늘렸을 수 있으므로 '아무것도 바꾸지 않음'은 거짓이 될 수 있다.
      //   보증할 수 있는 범위(헤더 라벨·데이터 무변경)만 적는다. 근거 없는 포괄 안심 문구 금지 원칙.
      throw new Error('헤더 순서 불일치로 중단 — ' + _bad.length + '곳: ' + _bad.slice(0, 8).join(' · ') +
        (_bad.length > 8 ? ' 외 ' + (_bad.length - 8) + '곳' : '') +
        ' | 헤더 라벨과 데이터는 건드리지 않았습니다(그리드 열 수를 맞추는 빈 열 추가는 이 검사 전에 이미 수행됨 · 빈 열이라 무해).' +
        ' 그대로 실행했다면 데이터는 남고 라벨만 밀려 열이 오정렬됩니다.' +
        ' 먼저 10_customers-setup의 checkCustomerHeaderOrder를 실행해 실측 순서를 확인하고, 00_platform-config의 CUSTOMER_HEADERS를 거기에 맞춘 뒤 다시 실행하세요.');
    }
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
  //    신규: 시착동의일시·계약서명일시(KST 문자열)·동의기록(JSON)·처리이력(시간순 로그)도 텍스트 고정
  ['개인코드', '비번해시', '로그인토큰', '토큰만료', '연락처', '생성일시', '최종수정', 'eventId', '입금완료신호', '시착동의일시', '계약서발송일시', '계약서명일시', '동의기록', '처리이력']
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
    '시착동의상태': 100, '시착동의일시': 140, '계약서발송일시': 140, '계약서명일시': 140, '계약서링크': 160, '동의기록': 200, '계약총액': 110, '입금자명': 110, '처리이력': 220
  };
  // [PROD_ACCESSOR · B-4] 제작 데이터 컬럼은 폭을 좁게 — 하객 이름·좌석 JSON이 시트에서 기본 폭으로 펼쳐 보이지 않게(PII 노출면 축소).
  //   목록을 리터럴로 박으면 PR-B 신 컬럼이 누락되므로 _prodCols() 단일 출처를 쓴다(런타임 호출이라 파일 평가 순서와 무관).
  try { _prodCols().forEach(function (h) { W[h] = 140; }); } catch (e) {}
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
  // [PROD_ACCESSOR · B-4] 제작 데이터 컬럼도 흐리게 — PII 목록과 같은 부류라 _prodCols()로 합류(신 컬럼 누락 방지)
  ['비번해시', '로그인토큰', '토큰만료', '동의기록'].concat((function () { try { return _prodCols(); } catch (e) { return ['제작임시저장']; } })()).forEach(function (h) {
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
      R('시착', '#EAF0F6', '#2B5A8A'), R('상담완료', '#EAF0F6', '#2B5A8A'),
      R('계약완료', '#E7F1EA', '#2E6B43'), R('입금완료', '#E3EFE6', '#1F6B3A'),
      R('제작중', '#F1EEF6', '#5A4B8A'),
      R('예식완료', '#E3EFE6', '#1F6B3A'), R('촬영완료', '#E3EFE6', '#1F6B3A'),
      R('결과물전달', '#E3EFE6', '#1F6B3A'),
      R('후기', '#EDF7F0', '#2E7D52'),   // STAGE_REVIEW — 결과물전달과 같은 초록 계열에서 한 단계 밝게(기획 §6 결정4)
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

// ============================ [진단 · 읽기 전용] 시트 헤더 순서 실측 ============================
// ★HEADER_ORDER_AUDIT(2026-07-26) — HEADER_ORDER_GUARD가 걸렸을 때 '무엇이 어떻게 어긋났는지'를 실측한다.
//   아무것도 쓰지 않는다(setValue·setValues·insertColumns 호출 0건). 몇 번을 실행해도 시트는 그대로다.
//   checkProdCapOverflow와 같은 패턴 · GAS 편집기 드롭다운에서 바로 고를 수 있게 인자 없는 함수.
//
//   왜 필요한가: CUSTOMER_HEADERS(코드 리터럴)와 실제 운영 시트의 열 순서는 서로 다를 수 있다.
//   운영 중 열이 늘어나는 경로가 setupCustomers 말고도 여러 개이고, 그것들끼리도 순서가 다르기 때문이다.
//     · addProdTrackColumns(80_production) — 제작 트랙 7 → 제작_meta 마지막
//     · addGuideTokenColumn(80_production) — 안내공유토큰
//     · addResultSelectionColumns(80_production) — 선택사진…설문일시 → 중도금 5개 → 원본폴더ID
//     · adminMarkDelivered(admin.gs) — 원본폴더ID가 없으면 그 시점에 시트 끝에 자가 추가
//   특히 '원본폴더ID'는 CUSTOMER_HEADERS에 아예 없어서, 시트에는 있는데 코드에는 없는 상태가 정상적으로 발생한다.
//   그래서 리터럴을 고칠 때는 추측하지 말고 이 진단의 출력을 그대로 기준으로 삼는다.
function checkCustomerHeaderOrder() {
  var sheet = SpreadsheetApp.getActive().getSheetByName(P.CUSTOMERS_SHEET);
  if (!sheet) { Logger.log('시트 없음: ' + P.CUSTOMERS_SHEET); return { ok: false, error: '시트 없음' }; }

  var lastCol = sheet.getLastColumn();
  if (lastCol < 1) { Logger.log('헤더 행이 비어 있음 — 신규 시트로 보임(대조 대상 없음)'); return { ok: true, empty: true }; }

  var live = sheet.getRange(P.HEADER_ROW, 1, 1, lastCol).getValues()[0].map(function (h) { return String(h == null ? '' : h).trim(); });
  var code = CUSTOMER_HEADERS;
  var n = Math.max(live.length, code.length);

  // 1) 전체 열 나열 — 시트가 코드보다 길면 그 뒤 열도 전부 표시한다.
  var lines = [], bad = [];
  for (var i = 0; i < n; i++) {
    var l = (i < live.length) ? live[i] : '(시트 열 없음)';
    var c = (i < code.length) ? code[i] : '(코드 없음)';
    var same = (i < live.length && i < code.length && l === c);
    if (!same) bad.push((i + 1) + '열: 시트 "' + l + '" / 코드 "' + c + '"');
    lines.push((same ? '   ' : ' ✗ ') + (i + 1) + ': ' + l + ' | ' + c);
  }

  // 2) 집합 차이 — 순서와 별개로 '어느 쪽에만 있는 라벨'인지. 리터럴에 넣을 위치를 정할 때 필요하다.
  var liveSet = {}, codeSet = {};
  live.forEach(function (h) { if (h) liveSet[h] = 1; });
  code.forEach(function (h) { codeSet[h] = 1; });
  var onlyLive = live.filter(function (h, i) { return h && !codeSet[h] && live.indexOf(h) === i; });
  var onlyCode = code.filter(function (h) { return !liveSet[h]; });

  Logger.log('[헤더 실측] 시트 ' + live.length + '열 / 코드 CUSTOMER_HEADERS ' + code.length + '개');
  Logger.log('── 전체 (열번호: 시트라벨 | 코드라벨 · ✗=불일치) ──');
  Logger.log(lines.join('\n'));

  if (onlyLive.length) Logger.log('── 시트에만 있는 라벨(코드에 없음) ' + onlyLive.length + '개: ' + onlyLive.join(', '));
  if (onlyCode.length) Logger.log('── 코드에만 있는 라벨(시트에 없음) ' + onlyCode.length + '개: ' + onlyCode.join(', '));

  if (!bad.length) {
    Logger.log('── 결론: 불일치 없음 · setupCustomers 실행 가능(HEADER_ORDER_GUARD 통과)');
  } else {
    Logger.log('── 불일치 ' + bad.length + '곳 ──');
    Logger.log(bad.join('\n'));
    Logger.log('── 결론: setupCustomers는 HEADER_ORDER_GUARD에 막힌다. 시트를 고치지 말고 위 실측 순서에 맞춰 ' +
      '00_platform-config의 CUSTOMER_HEADERS를 정정할 것(merge-guard의 순서 검사도 같은 커밋에서 갱신).');
  }
  Logger.log('(이 함수는 아무것도 쓰지 않았습니다 · 몇 번이든 재실행 안전)');

  return { ok: true, liveCount: live.length, codeCount: code.length, mismatch: bad.length, bad: bad, onlyLive: onlyLive, onlyCode: onlyCode, live: live };
}
