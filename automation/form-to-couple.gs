/**
 * Moment Edit · 구글폼 → Couples 시트 자동 등록 + URL 자동 조립 + 부부 자동 메일
 * ──────────────────────────────────────────────────────────────────────────
 * [v18 · 2026.05.26] 폼 구조 v2 — 6단계로 단순화
 *  · ① 두 분 정보 → ② 예식 일정 → ③ 혼주·계좌(공통 1페이지) → ④ 오프라인(디자인+1페이지묶음)
 *    → ⑤ 온라인(디자인+1페이지묶음, "오프라인과 동일하게" 옵션) → ⑥ 제출
 *  · 혼주·계좌를 디자인 묶음 밖 공통 페이지로 이동. 디자인 묶음은 1페이지(미리보기+제목·부제·인사말).
 *  · "오프라인과 동일하게" 선택 시 핸들러가 designOnline=designFamily + 제목·부제 미러(인사말은 상속).
 *  · "입장 QR만" 선택지 제거. MAP·시트열 동일(33열).
 *  · 날짜 도움말에 "월·일 두 자리" 안내 추가(정규식 ^\d{4}-\d{2}-\d{2}$ 와 일치하도록).
 *  · ⑤ 온라인 디자인 선택 페이지에 "대표문구(02)·한마디(08)는 오프/온 동일 적용" 안내 추가
 *    (단일 열 상속 구조 — 오프와 다른 디자인 선택 시 기본 문구 표시).
 *  · addFormImage 개선: 너비 740·중앙정렬, fetch 실패 시 텍스트 대체(섹션헤더) + 1회 재시도.
 *  · 도움말 압축: 인사말/대표문구/한마디/미리보기/⑤헤더를 1~2줄로. GREET_EG·EMPH_ONLY 제거.
 *  · 정밀점검 16건 반영: 이메일·시간 형식 검증, 08 한마디 길이검증(60자), 디자인별 강조예시 복구,
 *    영문·이메일 도움말 통일, 혼주/계좌 입력 가이드, 톤 정리(설명·확인메시지), 소요시간·장소·스팸·
 *    개인정보·재제출 안내 추가. (질문 제목 BASE 불변 → MAP·시트열 33열 그대로)
 *  · 톤 다듬기 13건: 섹션/페이지 헤더·게이트·갤러리·이미지·이름/시간 도움말의 캐주얼 어미를
 *    정중형으로 통일(~이에요/정해주세요 → ~입니다/선택해 주세요 등). 텍스트만 변경.
 *  · 온라인 02 대표문구 / 08 한마디 입력칸 신설(오프와 다른 디자인을 온라인에 고를 때 따로 작성).
 *    시트 3열 추가(digPullQuote·digGroomBio·digBrideBio → 36열). MAP에 "전체 제목(꼬리표 포함)"
 *    키로 등록하고, 핸들러는 mergedFull(전체 제목)로 오프/온 같은 BASE를 구분 기록.
 *    "오프라인과 동일하게"는 이 3개도 오프 값으로 미러. hydrate는 온라인에서 dig*||기존||기본 폴백.
 *
 * [v17 · 2026.05.26] 인사말 제목 편집 — 큰 제목 + 부제(03=영문·04/07/08=한글)를 디자인별·가족/디지털 따로 편집
 *  (텍스트만·언어 고정·측정한 한 줄 글자수 제한). hydrate가 렌더 후 제목 텍스트만 교체(커스텀 있을 때).
 *  작은제목(eyebrow) 편집은 제거됨 — 점선=편집가능 원칙에 맞춰 디자인 고정값으로.
 *  ⚠️ 시트 4열: famInvTitle·famInvSubKo·digInvTitle·digInvSubKo (작은제목 2열 제거).
 *
 * [v15 · 2026.05.26] 디자인-우선(Design-first) 구조 전면 개편 (Bβ)
 *  · 흐름: 공통기본 → 가족 디자인 선택 → (그 디자인) 전체 미리보기(선표기)+섹션 이미지 + 디테일
 *          → 디지털 디자인 선택 → (그 디자인) 미리보기 + (02/08) 문구 → 제출
 *  · 디자인을 고르면 그 디자인 맞춤 이미지가 질문마다 함께 나옴(가족 8 / 디지털 8 브랜치).
 *  · 질문 제목엔 브랜치 구분자(" · 가족 01번")가 붙음 → 제목 중복 방지. 핸들러가 구분자 떼고
 *    공통 필드로 병합(collect). 그래서 같은 정보를 어느 브랜치에서 적든 한 칸에 기록됨.
 *  · 02 대표문구·08 한마디: 가족/디지털 중 02·08을 고른 브랜치에서만 등장(맞춤이미지),
 *    가족·디지털 둘 다 같은 번호면 collect가 먼저 적은 값 1개만 사용(중복 0).
 *  · 인사말·혼주·계좌는 공통 데이터(가족·디지털 동일 적용). 가족=발행안함이면 "공통" 폴백에서 입력.
 *  · 이미지 호스팅: GitHub raw (momentedit.kr은 서버 fetch 403). createCoupleForm 시 UrlFetch로 첨부.
 *  · 자동 메일·예식ID·캐시무효화·hydrate 기본문구(*별표* 강조)는 기존과 동일.
 *
 * [설치] Apps Script에 붙여넣고 createCoupleForm() 1회 실행 → 폼 생성+트리거+폼URL 저장.
 *   ⚠️ 구 폼 삭제. 이미지 36장 fetch라 생성에 1~2분 걸릴 수 있음. 자동메일=contact@(별칭).
 */

// ============================ CONFIG ============================
var CFG = {
  SHEET_NAME: 'Couples',
  HEADER_ROW: 3,
  DATA_START_ROW: 4,
  SITE_BASE: 'https://momentedit.kr',
  CACHE_KEY_PREFIX: 'couple_',
  STUDIO_EMAIL: 'contact@momentedit.kr',
  RAW: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/preview/',

  // 브랜치 구분자(" · 가족 01번" 등) 앞의 "베이스 제목" → 시트 필드
  MAP: {
    '신랑 한글 이름': 'groomName',
    '신부 한글 이름': 'brideName',
    '신랑 이메일': 'groomEmail',
    '신부 이메일': 'brideEmail',
    '결혼식 날짜': 'weddingDate',
    '결혼식 시간': 'weddingTime',
    '신랑 영문 이름': 'groomNameEn',
    '신부 영문 이름': 'brideNameEn',
    '신랑 은행': 'groomBank',
    '신랑 계좌번호': 'groomAccount',
    '신부 은행': 'brideBank',
    '신부 계좌번호': 'brideAccount',
    '신랑 혼주(부모님)': 'groomParents',
    '신부 혼주(부모님)': 'brideParents',
    '신랑 아버지 계좌 (은행 번호)': 'groomFatherAccount',
    '신랑 어머니 계좌 (은행 번호)': 'groomMotherAccount',
    '신부 아버지 계좌 (은행 번호)': 'brideFatherAccount',
    '신부 어머니 계좌 (은행 번호)': 'brideMotherAccount',
    '인사말 (직접 작성)': 'invitationText',
    // 02 대표문구 / 08 한마디 — 오프/온이 같은 BASE라 "전체 제목(꼬리표 포함)"으로 정확 분리(병합 순서 무관)
    '대표 문구 (2번 디자인 전용) · 오프라인 청첩장 2번': 'pullQuote',
    '신랑 한마디 (8번 디자인 전용) · 오프라인 청첩장 8번': 'groomBio',
    '신부 한마디 (8번 디자인 전용) · 오프라인 청첩장 8번': 'brideBio',
    '오프라인 청첩장 인사말 큰 제목': 'famInvTitle',
    '오프라인 청첩장 인사말 부제': 'famInvSubKo',
    '온라인 청첩장 인사말 큰 제목': 'digInvTitle',
    '온라인 청첩장 인사말 부제': 'digInvSubKo',
    '온라인 청첩장 인사말 (직접 작성)': 'digInvitationText',
    // 온라인 전용 02 대표문구 / 08 한마디 — 오프와 같은 BASE라 "전체 제목(꼬리표 포함)"을 키로 사용(핸들러가 구분)
    '대표 문구 (2번 디자인 전용) · 온라인 청첩장 2번': 'digPullQuote',
    '신랑 한마디 (8번 디자인 전용) · 온라인 청첩장 8번': 'digGroomBio',
    '신부 한마디 (8번 디자인 전용) · 온라인 청첩장 8번': 'digBrideBio'
  },

  COL_DESIGN_ONLINE: 'designOnline',
  COL_DESIGN_FAMILY: 'designFamily',
  COL_DIGITAL: 'digitalAttendance',
  COL_GREETING: 'greetingShowParents',
  COL_ENVELOPE: 'envelopeShowParents',
  COL_ACCT_ONLINE: 'accountOnline',
  COL_ACCT_LIVE: 'accountLive',
  COL_ACCT_FAMILY: 'accountFamily',

  Q_DESIGN_FAMILY: '오프라인 청첩장 디자인 번호',
  Q_DESIGN_ONLINE: '온라인 청첩장 디자인 번호',
  Q_GREET_GATE: '인사말에 혼주(부모님) 성함을 넣으시겠어요?',
  Q_ENVELOPE_GATE: '마음 전하실 곳에 부모님 계좌도 함께 넣으시겠어요?',
  Q_ACCT_DISPLAY: '계좌를 어디에 표시할까요?',

  ACCT_CHOICE_ONLINE: '온라인 청첩장',
  ACCT_CHOICE_LIVE: '라이브 화면',
  ACCT_CHOICE_FAMILY: '오프라인 청첩장',

  TAG: ' · ',   // 베이스 제목과 브랜치 구분자 사이 구분자(베이스 제목엔 없는 문자열)
  PROP_FORM_URL: 'FORM_PUBLISHED_URL'
};

// ====================== 폼 제출 트리거 진입점 ======================
function onCoupleFormSubmit(e) {
  try {
    if (!e || !e.namedValues) throw new Error('폼 제출 이벤트가 아닙니다(트리거 설정 확인).');

    // merged = 베이스 제목(꼬리표 뗌)으로 병합 — 먼저 적힌 비어있지 않은 값 채택(공통 필드용).
    // mergedFull = 전체 제목(꼬리표 포함) 그대로 — 오프/온 같은 BASE를 구분해야 하는 dig* 전용.
    var merged = {}, mergedFull = {};
    Object.keys(e.namedValues).forEach(function (title) {
      var arr = e.namedValues[title];
      var val = (arr && arr[0] != null) ? String(arr[0]).trim() : '';
      if (val === '') return;
      var base = title.split(CFG.TAG)[0].trim();
      if (merged[base] === undefined || merged[base] === '') merged[base] = val;
      if (mergedFull[title] === undefined || mergedFull[title] === '') mergedFull[title] = val;
    });
    var g = function (base) { return merged[base] || ''; };

    var sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SHEET_NAME);
    if (!sheet) throw new Error('시트 없음: ' + CFG.SHEET_NAME);
    var colOf = buildHeaderIndex(sheet);
    // 필수 헤더(시트 3행 영문키) 누락 감지 — 실수로 지우면 데이터 침묵 손실 → 24h 1회 관리자 알림
    var REQUIRED_HEADERS = ['eventId', 'groomName', 'brideName', 'groomNameEn', 'brideNameEn',
      'groomEmail', 'brideEmail', 'weddingDate', 'weddingTime', 'designFamily', 'designOnline',
      'digitalAttendance', 'invitationText', 'digPullQuote', 'digGroomBio', 'digBrideBio',
      'accountOnline', 'accountLive', 'accountFamily'];
    var _missing = REQUIRED_HEADERS.filter(function (h) { return !colOf[h]; });
    if (_missing.length) {
      notifyStudio('[Moment Edit] ⚠️ Couples 시트 헤더 누락',
        'Couples 시트 ' + CFG.HEADER_ROW + '행에서 다음 영문 헤더를 찾을 수 없습니다:\n  ' + _missing.join(', ') +
        '\n\n해당 열은 기록되지 않습니다(데이터 침묵 손실). 헤더를 복구해 주세요.',
        'hdr_missing_' + _missing.join('_'));
    }

    // 0-1) 날짜 실유효성 검증 — 형식만 맞고 실제 없는 날짜(예: 2026-09-36) 차단.
    //      형식 통과해도 new Date 롤오버로 다른 달로 옮겨가는 입력은 거부.
    var weddingDateRaw = g('결혼식 날짜');
    if (!isValidYmd(weddingDateRaw)) {
      try {
        var to = [g('신랑 이메일'), g('신부 이메일')]
          .map(function (x) { return String(x || '').trim(); })
          .filter(Boolean)
          .filter(function (x, i, arr) { return arr.map(function (s) { return s.toLowerCase(); }).indexOf(x.toLowerCase()) === i; })
          .join(',');
        if (to) {
          GmailApp.sendEmail(to,
            '[Moment Edit] 예식 날짜 재확인 부탁드립니다',
            '안녕하세요, 모먼트 에디트입니다.\n\n' +
            '제출해 주신 예식 날짜 "' + weddingDateRaw + '" 가 실제 달력에 존재하지 않는 날짜로 확인되었습니다.\n' +
            '번거로우시겠지만 두 분의 예식 날짜를 다시 한 번 확인해 주신 뒤, 폼을 다시 작성해 주시면 감사하겠습니다.\n\n' +
            '다시 작성하실 곳: ' + CFG.SITE_BASE + '/form\n' +
            '(같은 성함으로 제출해 주시면 이전 정보가 자동으로 갱신됩니다.)\n\n' +
            '— Moment Edit\ncontact@momentedit.kr',
            {
              from: CFG.STUDIO_EMAIL, name: 'Moment Edit',
              htmlBody: buildDateRetryEmailHtml(g('신랑 한글 이름'), g('신부 한글 이름'), weddingDateRaw)
            });
        }
      } catch (e) { Logger.log('  (재제출 안내 메일 실패: ' + e.message + ')'); }
      notifyStudio(
        '[Moment Edit] ⚠️ 날짜 검증 실패 — 폼 제출 차단',
        '신랑: ' + g('신랑 한글 이름') + ' / 신부: ' + g('신부 한글 이름') + '\n' +
        '입력값: "' + weddingDateRaw + '"\n' +
        '신랑 이메일: ' + g('신랑 이메일') + '\n신부 이메일: ' + g('신부 이메일') + '\n\n' +
        '양쪽에 재제출 안내 메일 발송 완료.',
        'invalid_date_' + weddingDateRaw
      );
      throw new Error('날짜 검증 실패 — 처리 중단: "' + weddingDateRaw + '"');
    }

    // 0) 예식ID
    var base = makeEventId(g('신랑 영문 이름'), g('신부 영문 이름'), weddingDateRaw);
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(base)) {
      throw new Error('예식ID 자동생성 실패 — 영문 이름/날짜 확인. (생성값: "' + base + '")');
    }
    var resolved = resolveEventId(sheet, colOf, base, g('신랑 한글 이름'), g('신부 한글 이름'));
    var eventId = resolved.eventId, rowNum = resolved.rowNum;
    writeCell(sheet, colOf, rowNum, 'eventId', eventId);

    // 1) 단순 텍스트 필드(MAP) — 꼬리표 포함 키(dig*)는 전체 제목으로 정확 매칭, 그 외는 BASE 병합값
    Object.keys(CFG.MAP).forEach(function (key) {
      var val = (key.indexOf(CFG.TAG) >= 0) ? (mergedFull[key] || '') : (merged[key] || '');
      writeCell(sheet, colOf, rowNum, CFG.MAP[key], val);
    });

    // 2) 디자인 번호 / 디지털 상태
    var famVal = g(CFG.Q_DESIGN_FAMILY);   // "01번" / "발행 안 함"
    var digVal = g(CFG.Q_DESIGN_ONLINE);   // "01번" / "만들지 않음" / "오프라인과 동일하게…"
    var designFamily = pad2(famVal);
    var sameAsFamily = /동일/.test(digVal) && !!designFamily;   // "오프라인과 동일하게" (오프라인 발행 시에만 유효)
    var designOnline = sameAsFamily ? designFamily : pad2(digVal);
    var makeOnline = designOnline ? 'Y' : 'N';
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily, true);   // force: 발행 취소(빈 값)도 반영
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline, true);   // force: 온라인 미발행(빈 값)도 반영
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, makeOnline, true);           // force: designOnline 기반 일관성(항상 Y/N)
    Logger.log('  (디자인 결정 — designFamily="%s" / designOnline="%s" / digitalAttendance="%s" / sameAsFamily=%s)',
      designFamily, designOnline, makeOnline, sameAsFamily);
    // "오프라인과 동일하게" → 온라인 제목·부제·대표문구·한마디를 오프라인 값으로 미러
    // (인사말은 hydrate가 invitationText 자동 상속). 온라인 디자인 페이지는 안 거치므로 dig*는 여기서 채움.
    if (sameAsFamily) {
      var _ft = g('오프라인 청첩장 인사말 큰 제목'); if (_ft) writeCell(sheet, colOf, rowNum, 'digInvTitle', _ft);
      var _fs = g('오프라인 청첩장 인사말 부제'); if (_fs) writeCell(sheet, colOf, rowNum, 'digInvSubKo', _fs);
      var _pq = mergedFull['대표 문구 (2번 디자인 전용) · 오프라인 청첩장 2번']; if (_pq) writeCell(sheet, colOf, rowNum, 'digPullQuote', _pq);
      var _gb = mergedFull['신랑 한마디 (8번 디자인 전용) · 오프라인 청첩장 8번']; if (_gb) writeCell(sheet, colOf, rowNum, 'digGroomBio', _gb);
      var _bb = mergedFull['신부 한마디 (8번 디자인 전용) · 오프라인 청첩장 8번']; if (_bb) writeCell(sheet, colOf, rowNum, 'digBrideBio', _bb);
    }

    // 3) 혼주 표시 토글(인사말 성함 / 계좌 부모)
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ynShow(g(CFG.Q_GREET_GATE)), true);   // force: 게이트 답(혼주 표시↔숨김) 변경 반영
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ynShow(g(CFG.Q_ENVELOPE_GATE)), true); // force: 게이트 답(부모계좌 표시↔숨김) 변경 반영

    // 3-1) 계좌 표시 위치 (체크박스 — 콤마 구분, raw 파싱)
    //   체크박스는 e.namedValues에서 "온라인 청첩장, 라이브 화면" 같은 단일 문자열로 옴.
    //   merged[base]는 첫 값만 잡으므로 namedValues에서 직접 읽음.
    //   indexOf('온라인 청첩장')는 '오프라인 청첩장'엔 매칭 안 됨(온/오프 첫 글자 다름) → 안전.
    var acctRaw = (e.namedValues[CFG.Q_ACCT_DISPLAY] && e.namedValues[CFG.Q_ACCT_DISPLAY][0]) || '';
    var acctOnline = acctRaw.indexOf(CFG.ACCT_CHOICE_ONLINE) !== -1 ? 'Y' : 'N';
    var acctLive   = acctRaw.indexOf(CFG.ACCT_CHOICE_LIVE)   !== -1 ? 'Y' : 'N';
    var acctFamily = acctRaw.indexOf(CFG.ACCT_CHOICE_FAMILY) !== -1 ? 'Y' : 'N';
    writeCell(sheet, colOf, rowNum, CFG.COL_ACCT_ONLINE, acctOnline, true);
    writeCell(sheet, colOf, rowNum, CFG.COL_ACCT_LIVE,   acctLive,   true);
    writeCell(sheet, colOf, rowNum, CFG.COL_ACCT_FAMILY, acctFamily, true);

    // 4) 캐시 무효화 — webhook 측 getCouple 캐시(같은 키)를 즉시 삭제 → 재제출 즉시 반영.
    //    ⚠️ 두 .gs가 같은 Apps Script 프로젝트에 있어야 ScriptCache 공유됨.
    try {
      CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId);
      Logger.log('  (캐시 무효화 OK: ' + CFG.CACHE_KEY_PREFIX + eventId + ')');
    } catch (_c) {
      Logger.log('  (캐시 무효화 실패: ' + _c.message + ')');
    }

    // 5) URL
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';
    // 라이브(입장) 페이지 — QR 대상. 디지털 참석/입장QR 선택 시에만(종이 청첩장에 넣어 공유용)
    var enterUrl = (makeOnline === 'Y') ? (CFG.SITE_BASE + '/live.html?e=' + encodeURIComponent(eventId)) : '';
    Logger.log('[OK] %s · row %s\n  digital: %s\n  family: %s\n  live(QR): %s', eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)', enterUrl || '(없음)');

    // 6) 부부 자동 메일
    try {
      sendCoupleEmail(g('신랑 이메일'), g('신부 이메일'), g('신랑 한글 이름'), g('신부 한글 이름'), liveUrl, familyUrl, enterUrl, g('결혼식 날짜'), g('결혼식 시간'));
    } catch (mailErr) {
      Logger.log('  (이메일 발송 실패: ' + mailErr.message + ')');
      // silent 사고 차단 — 시트엔 정상인데 부부가 못 받는 경우를 즉시 인지
      notifyStudio('[Moment Edit] ⚠️ 부부 청첩장 메일 발송 실패',
        '예식ID: ' + eventId + '\n수신: ' + g('신랑 이메일') + ', ' + g('신부 이메일') +
        '\n오류: ' + mailErr.message + '\n\n시트엔 정상 기록됨 — 수동 발송이 필요합니다.');
    }

  } catch (err) {
    Logger.log('[ERROR] ' + err.message);
    throw err;
  }
}

// =========================== 헬퍼 ===========================
function buildHeaderIndex(sheet) {
  var headers = sheet.getRange(CFG.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) { var h = String(headers[i]).trim(); if (h) map[h] = i + 1; }
  return map;
}
function makeEventId(groomEn, brideEn, weddingDate) {
  var ini = function (en) {
    return String(en || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
      .map(function (w) { return w.charAt(0); }).join('').replace(/[^a-z]/g, '');
  };
  var g = ini(groomEn), b = ini(brideEn), mmdd = '';
  var m = String(weddingDate || '').match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
  if (m) mmdd = ('0' + m[2]).slice(-2) + ('0' + m[3]).slice(-2);
  return [g, b, mmdd].filter(Boolean).join('-');
}
function resolveEventId(sheet, colOf, base, groomName, brideName) {
  var idCol = colOf['eventId'];
  if (!idCol) throw new Error("'eventId' 헤더를 시트 " + CFG.HEADER_ROW + "행에서 못 찾음");
  var gCol = colOf['groomName'], bCol = colOf['brideName'];
  // getLastRow()는 "content 있는 마지막 행"이라 다른 컬럼의 보이지 않는 잔여(공백·서식)에
  // 영향받아 새 행이 시트 아래쪽으로 흩어질 수 있음. eventId 컬럼만 실제 스캔해 마지막
  // 실 데이터 행을 찾음 → 잔여 셀과 무관하게 항상 데이터 끝에 정렬되어 쌓임.
  var lastRow = findLastEventIdRow(sheet, idCol);
  var ids = [], gNames = [], bNames = [];
  if (lastRow >= CFG.DATA_START_ROW) {
    var n = lastRow - CFG.DATA_START_ROW + 1;
    ids = sheet.getRange(CFG.DATA_START_ROW, idCol, n, 1).getValues();
    if (gCol) gNames = sheet.getRange(CFG.DATA_START_ROW, gCol, n, 1).getValues();
    if (bCol) bNames = sheet.getRange(CFG.DATA_START_ROW, bCol, n, 1).getValues();
  }
  var candidate = base, suffix = 1;
  while (true) {
    var taken = false;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() !== candidate) continue;
      var rg = gNames[i] ? String(gNames[i][0]).trim() : '', rb = bNames[i] ? String(bNames[i][0]).trim() : '';
      if ((!rg && !rb) || (rg === groomName && rb === brideName)) return { eventId: candidate, rowNum: CFG.DATA_START_ROW + i };
      taken = true; break;
    }
    if (!taken) {
      if (candidate !== base) {   // 다른 부부와 충돌해 접미사(-2 이상) 부여된 새 ID → 청첩장 URL이 바뀜
        notifyStudio('[Moment Edit] ⚠️ 예식ID 충돌 — 접미사 부여',
          '기존 base ID와 충돌해 새 ID에 접미사가 붙었습니다.\n  base: ' + base + '\n  새 ID: ' + candidate +
          '\n  부부: ' + groomName + ' · ' + brideName + '\n\n청첩장 URL이 이 새 ID 기준입니다.');
      }
      return { eventId: candidate, rowNum: lastRow + 1 };
    }
    suffix++; candidate = base + '-' + suffix;
  }
}
// eventId 컬럼을 아래에서 위로 스캔해 마지막 실 데이터 행 위치 반환.
// 빈 셀(공백·trim 후 빈 문자열) 무시 → 빈 행 다음에 쌓이는 문제 차단.
// 모든 데이터 행이 비면 DATA_START_ROW - 1 반환 → 다음 행이 DATA_START_ROW부터 정상 시작.
function findLastEventIdRow(sheet, idCol) {
  var rawLast = sheet.getLastRow();
  if (rawLast < CFG.DATA_START_ROW) return CFG.DATA_START_ROW - 1;
  var n = rawLast - CFG.DATA_START_ROW + 1;
  var values = sheet.getRange(CFG.DATA_START_ROW, idCol, n, 1).getValues();
  for (var i = values.length - 1; i >= 0; i--) {
    if (String(values[i][0]).trim() !== '') return CFG.DATA_START_ROW + i;
  }
  return CFG.DATA_START_ROW - 1;
}
function writeCell(sheet, colOf, rowNum, header, value, force) {
  var c = colOf[header];
  if (!c) { Logger.log('  (헤더 없음, 건너뜀: ' + header + ')'); return; }
  if (value === '' && !force) return;   // 기본: 빈 값 스킵(점진적 입력 보존) · force=true면 빈 값도 기록(디자인·토글은 매 제출의 현재 의도 반영)
  sheet.getRange(rowNum, c).setValue(value);
}
function pad2(s) {
  var n = parseInt(String(s || '').replace(/[^0-9]/g, ''), 10);
  return (n >= 1 && n <= 99) ? ('0' + n).slice(-2) : '';   // 01~08만 유효 · 100번 등 방어
}
// 실제 존재하는 YYYY-MM-DD 인지 검증(윤년·월별 일수 자동 처리).
// 형식만 맞고 실제 없는 날짜(예: 2026-09-36, 2026-02-29) 차단.
function isValidYmd(s) {
  var m = String(s || '').trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return false;
  var y = +m[1], mn = +m[2], d = +m[3];
  if (mn < 1 || mn > 12 || d < 1 || d > 31) return false;
  var dt = new Date(y, mn - 1, d);
  return dt.getFullYear() === y && (dt.getMonth() + 1) === mn && dt.getDate() === d;
}
function ynShow(answer) {
  return /(안\s*함|미표시|숨김|제외|빼|아니|off|^\s*no\s*$|^\s*n\s*$)/i.test(String(answer || '').trim()) ? 'N' : 'Y';
}
// 관리자(스튜디오) 알림 — 본 흐름 비차단(try/catch). dedupKey 주면 24h 내 동일 알림 1회만(스팸 방지).
function notifyStudio(subject, body, dedupKey) {
  try {
    if (dedupKey) {
      var _c = CacheService.getScriptCache();
      if (_c.get(dedupKey)) return;
      _c.put(dedupKey, '1', 86400);
    }
    GmailApp.sendEmail(CFG.STUDIO_EMAIL, subject, body, { from: CFG.STUDIO_EMAIL, name: 'Moment Edit' });
  } catch (_n) {}
}

// ===================== 부부 URL 자동 이메일 =====================
function sendCoupleEmail(groomEmail, brideEmail, groomName, brideName, liveUrl, familyUrl, enterUrl, weddingDate, weddingTime) {
  var _seen = {};
  var to = [groomEmail, brideEmail]
    .map(function (em) { return String(em || '').trim(); })
    .filter(function (em) { return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(em); })
    .filter(function (em) { var k = em.toLowerCase(); if (_seen[k]) return false; _seen[k] = 1; return true; })
    .join(',');
  if (!to) { Logger.log('  (수신 이메일 없음 — 메일 건너뜀)'); return; }
  if (!liveUrl && !familyUrl && !enterUrl) { Logger.log('  (URL 없음 — 메일 건너뜀)'); return; }

  // 라이브(입장) 페이지 링크 → QR 변환(있을 때만 · 실패해도 메일은 정상 발송)
  var qrBlob = null;
  if (enterUrl) {
    try {
      var qrApi = 'https://api.qrserver.com/v1/create-qr-code/?size=600x600&margin=12&data=' + encodeURIComponent(enterUrl);
      var resp = UrlFetchApp.fetch(qrApi, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) qrBlob = resp.getBlob().setName('moment-edit-live-qr.png');
    } catch (qe) { Logger.log('  (QR 생성 실패: ' + qe.message + ')'); }
  }

  var opts = {
    htmlBody: buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, !!qrBlob, weddingDate, weddingTime),
    name: 'Moment Edit', from: CFG.STUDIO_EMAIL
  };
  if (qrBlob) {
    opts.inlineImages = { qrDigital: qrBlob };
  }
  try { var _quota = MailApp.getRemainingDailyQuota(); if (_quota <= 3) Logger.log('  ⚠️ Gmail 잔여 발송 한도 ' + _quota + '건 — 곧 소진(부부 증가 시 모니터링)'); } catch (_q) {}
  GmailApp.sendEmail(to, '[Moment Edit] 두 분의 청첩장이 준비되었습니다', '', opts);
  Logger.log('  (이메일 발송 → ' + to + (qrBlob ? ' · QR 포함' : '') + ')');
}
function buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, hasQr, weddingDate, weddingTime) {
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var who = (groomName && brideName) ? (esc(groomName) + ' · ' + esc(brideName)) : '두 분';
  var when = String(weddingDate || '').trim();
  if (when && String(weddingTime || '').trim()) when += ' · ' + String(weddingTime).trim();
  var whenLine = when ? '<p style="font-size:12px;line-height:1.6;color:#9C9080;text-align:center;margin:6px 0 0;">' + esc(when) + ' 예식</p>' : '';
  var row = function (label, sub, url) {
    var escUrl = esc(url);   // 방어적 — url은 서버 구성·eventId 인코딩됨이나 이중 안전
    return '<div style="margin:14px 0;"><div style="font-size:13px;color:#CFC6B8;margin-bottom:6px;">' + label +
      '<span style="color:#9C9080;font-size:12px;"> · ' + sub + '</span></div>' +
      '<a href="' + escUrl + '" style="display:inline-block;word-break:break-all;font-size:13px;color:#D8B48C;">' + escUrl + '</a></div>';
  };
  var links = '';
  if (liveUrl) links += row('온라인 청첩장', '멀리 계신 하객용', liveUrl);
  if (familyUrl) links += row('오프라인 청첩장', '가족·가까운 분들께', familyUrl);
  var editNote = '내용을 고치고 싶으시면 <a href="' + CFG.SITE_BASE + '/form" style="color:#D8B48C;">momentedit.kr/form</a>에서 다시 작성해 주세요.<br>같은 성함·날짜로 제출하시면 자동으로 갱신됩니다.';
  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:dark}body{margin:0;padding:0;background:#1E1A17}</style></head>' +
    '<body style="margin:0;padding:0;background:#1E1A17;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1E1A17;width:100%;"><tr><td align="center" bgcolor="#1E1A17" style="background:#1E1A17;">' +
    '<div style="color-scheme:dark;font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:44px 30px;background:#1E1A17;color:#E8E1D6;">' +
      '<div style="text-align:center;margin-bottom:28px;"><img src="' + CFG.RAW + 'email-logo-gold.png" alt="MOMENT EDIT — Private Wedding Studio" width="210" style="display:block;width:210px;max-width:62%;height:auto;margin:0 auto;border:0;"></div>' +
      '<div style="width:40px;height:1px;background:#C9A977;margin:24px auto;"></div>' +
      '<p style="font-size:15px;line-height:1.85;font-weight:300;text-align:center;color:#E8E1D6;">' + who + ' 님,<br>두 분의 청첩장이 준비되었습니다.</p>' +
      whenLine +
      '<p style="font-size:13px;line-height:1.8;color:#B8AE9F;text-align:center;margin:14px 0 0;">아래 링크가 <span style="color:#D8B48C;font-weight:600;">그대로 완성된 청첩장</span>입니다.<br>따로 만드실 것 없이 이 링크를 그대로 공유하시면 됩니다.</p>' +
      '<div style="background:#2A241F;padding:22px 20px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;margin:24px 0;">' + links + '</div>' +
      (hasQr ? '<div style="text-align:center;margin:4px 0 24px;"><img src="cid:qrDigital" alt="라이브(입장) 페이지 QR" width="150" height="150" style="width:150px !important;height:150px !important;max-width:150px !important;display:block;margin:0 auto;border:0;border-radius:2px;"><div style="font-size:12px;color:#B8AE9F;margin-top:12px;line-height:1.7;"><span style="color:#D8B48C;font-weight:600;">라이브(입장) 페이지 QR</span><br>종이 청첩장·인쇄물에 넣으시면, 하객이 스캔해 바로 입장할 수 있습니다.<br>QR을 길게(꾹) 누르면 이미지로 저장하실 수 있습니다.</div></div>' : '') +
      '<p style="font-size:13px;line-height:1.9;color:#B8AE9F;">한 번 열어보시고 이름·날짜·계좌에 오타가 없는지 확인해 주세요.<br>' + editNote + '</p>' +
      '<div style="text-align:center;margin-top:32px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#C9A977;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:14px;font-size:10px;color:#7A7165;">Moment Edit · contact@momentedit.kr</div></div>' +
    '</td></tr></table></body></html>';
}
// 날짜 검증 실패 시 두 분께 정중히 재제출 안내 — 본 안내 메일과 동일 브랜드 톤(dark/serif/gold).
function buildDateRetryEmailHtml(groomName, brideName, weddingDateRaw) {
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var who = (groomName && brideName) ? (esc(groomName) + ' · ' + esc(brideName)) : '두 분';
  var formLink = '<a href="' + CFG.SITE_BASE + '/form" style="color:#D8B48C;text-decoration:none;border-bottom:1px solid rgba(216,180,140,0.4);">momentedit.kr/form</a>';
  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:dark}body{margin:0;padding:0;background:#1E1A17}</style></head>' +
    '<body style="margin:0;padding:0;background:#1E1A17;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1E1A17;width:100%;"><tr><td align="center" bgcolor="#1E1A17" style="background:#1E1A17;">' +
    '<div style="color-scheme:dark;font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:44px 30px;background:#1E1A17;color:#E8E1D6;">' +
      '<div style="text-align:center;margin-bottom:28px;"><img src="' + CFG.RAW + 'email-logo-gold.png" alt="MOMENT EDIT — Private Wedding Studio" width="210" style="display:block;width:210px;max-width:62%;height:auto;margin:0 auto;border:0;"></div>' +
      '<div style="width:40px;height:1px;background:#C9A977;margin:24px auto;"></div>' +
      '<p style="font-size:15px;line-height:1.85;font-weight:300;text-align:center;color:#E8E1D6;">안녕하세요, 모먼트 에디트입니다.</p>' +
      '<p style="font-size:14px;line-height:1.9;font-weight:300;text-align:center;color:#E8E1D6;margin-top:18px;">' + who + ' 님,<br>제출해 주신 예식 날짜를 다시 한 번 확인 부탁드립니다.</p>' +
      '<div style="background:#2A241F;padding:20px 22px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;margin:24px 0;text-align:center;">' +
        '<div style="font-size:11px;letter-spacing:0.18em;color:#9C9080;margin-bottom:8px;">제출하신 날짜</div>' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:20px;color:#D8B48C;letter-spacing:0.06em;">' + esc(weddingDateRaw || '(공란)') + '</div>' +
      '</div>' +
      '<p style="font-size:13px;line-height:1.95;color:#B8AE9F;">제출해 주신 날짜가 실제 달력에 존재하지 않는 날짜로 확인되었습니다.<br>' +
      '번거로우시겠지만 두 분의 예식 날짜를 다시 한 번 확인해 주신 뒤, 폼을 다시 작성해 주시면 감사하겠습니다.</p>' +
      '<div style="text-align:center;margin:28px 0 8px;">' +
        '<div style="font-size:11px;letter-spacing:0.2em;color:#9C9080;margin-bottom:10px;">다시 작성하실 곳</div>' +
        '<div style="font-size:15px;font-family:\'Cormorant Garamond\',serif;letter-spacing:0.04em;">' + formLink + '</div>' +
      '</div>' +
      '<p style="font-size:12px;line-height:1.85;color:#9C9080;text-align:center;margin-top:22px;">같은 성함으로 제출해 주시면 이전 정보가 자동으로 갱신됩니다.<br>혹시 문의 사항이 있으시면 contact@momentedit.kr 으로 회신해 주세요.</p>' +
      '<div style="text-align:center;margin-top:32px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#C9A977;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:14px;font-size:10px;color:#7A7165;">Moment Edit · contact@momentedit.kr</div></div>' +
    '</td></tr></table></body></html>';
}

// ============== 구글폼 자동 생성기 (최초 1회 실행) ==============
function addFormImage(form, url, title, help) {
  var blob = null;
  for (var attempt = 0; attempt < 3 && !blob; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) { blob = resp.getBlob(); break; }
      Logger.log('  (이미지 응답 ' + resp.getResponseCode() + ': ' + (title || '') + ')');
    } catch (e) {
      Logger.log('  (이미지 fetch 오류: ' + (title || '') + ' — ' + e.message + ')');
    }
    if (attempt < 2) Utilities.sleep(800 * (attempt + 1)); // GitHub raw 일시 장애 대비 2회 재시도(0.8s·1.6s)
  }
  if (blob) {
    var it = form.addImageItem().setTitle(title || '미리보기').setImage(blob);
    try { it.setWidth(740); } catch (_w) {}
    try { it.setAlignment(FormApp.Alignment.CENTER); } catch (_a) {}
    if (help) it.setHelpText(help);
  } else {
    Logger.log('  (이미지 첨부 실패 → 텍스트 대체: ' + (title || '') + ')');
    form.addSectionHeaderItem()
      .setTitle('⚠️ 미리보기 이미지를 불러올 수 없습니다 — 갤러리에서 확인')
      .setHelpText('momentedit.kr/invitation-gallery.html' + (help ? '\n' + help : ''));
  }
}

function createCoupleForm() {
  var form = FormApp.create('Moment Edit · 청첩장 정보');
  form.setDescription(
    '두 분의 결혼을 진심으로 축하드립니다. 청첩장에 담길 내용을 정중히 여쭤보겠습니다.\n' +
    '약 7~10분 정도 소요됩니다.\n\n' +
    '· 첨부 이미지는 기본 문구가 들어간 완성 모습입니다. 보시며 작성하시면 됩니다.\n' +
    '· 필수 입력: 이름(한글·영문) · 이메일 · 날짜 · 시간. 나머지는 모두 선택이며, 비우면 기본 문구가 들어갑니다.\n' +
    '· 이름·날짜·시간은 청첩장 곳곳(표지·예식 안내·캘린더)에 자동 반영됩니다.\n' +
    '· 인사말에서 강조할 부분은 양옆에 *별표*를 붙이면 골드로 강조됩니다. (별표 강조는 인사말에서만 작동)\n' +
    '· 온라인 청첩장은 오프라인과 다르게 쓰실 때만 입력해 주세요. 비우면 오프라인 내용이 그대로 쓰입니다.\n' +
    '· 완성된 청첩장은 입력하신 이메일로 발송됩니다.\n' +
    '· 한 번에 다 채우지 않으셔도 됩니다. 같은 성함·날짜로 다시 제출하시면 자동 갱신됩니다.\n' +
    '· 입력하신 정보는 청첩장 발행에만 사용되며, 외부에 공유되지 않습니다.'
  );
  form.setCollectEmail(false);
  try { form.setRequireLogin(false); } catch (_r) {}
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage('두 분의 정성, 잘 받았습니다.\n완성된 청첩장은 입력하신 이메일로 곧 전해드리겠습니다.\n내용을 고치고 싶으시면 같은 성함·날짜로 다시 제출하시면 자동으로 갱신됩니다.');

  var designs = ['01', '02', '03', '04', '05', '06', '07', '08'];
  var R = CFG.RAW, T = CFG.TAG;
  var req = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(true); if (help) it.setHelpText(help); return it; };
  var opt = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var optPara = function (title, help) { var it = form.addParagraphTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var gate = function (title, help) { return form.addMultipleChoiceItem().setTitle(title).setRequired(true).setChoiceValues(['네 — 넣을게요', '아니요 — 넣지 않을게요']).setHelpText(help); };
  var nameVal = FormApp.createTextValidation().setHelpText('성을 먼저, 띄어쓰기로. 예) Lee Seo Jun').requireTextMatchesPattern('^\\S+(\\s+\\S+)+$').build();
  var emailVal = FormApp.createTextValidation().setHelpText('올바른 이메일 주소를 적어주세요. 예) name@gmail.com').requireTextIsEmail().build();
  var timeVal = FormApp.createTextValidation().setHelpText('24시간 형식으로, 콜론(:)을 넣어주세요. 예) 10:00').requireTextMatchesPattern('^([01]?\\d|2[0-3]):[0-5]\\d$').build();
  var GALLERY = '갤러리에서 미리 둘러보실 수 있습니다 → momentedit.kr/invitation-gallery.html';

  // 디자인별 인사말 제목 — 한줄 글자수 한도(측정값)/기본문구. subko(부제)는 있는 디자인만.
  var TITLECFG = {
    '01': { title: { max: 19, def: 'We Invite You' } },
    '02': { title: { max: 17, def: 'Save the Day' } },
    '03': { title: { max: 13, def: 'Invitation', caps: true }, subko: { max: 22, def: 'Cordially Invited', caps: true } },
    '04': { title: { max: 24, def: 'a quiet invitation.' }, subko: { max: 12, def: '초대의 글' } },
    '05': { title: { max: 16, def: 'Invitation' } },
    '06': { title: { max: 7, def: '모시는 글' } },
    '07': { title: { max: 18, def: 'Save the Day' }, subko: { max: 11, def: '초대의 글' } },
    '08': { title: { max: 20, def: 'The Invitation' }, subko: { max: 11, def: '초대의 글' } }
  };
  // 제목·부제 편집칸 — prefix='오프라인 청첩장'/'온라인 청첩장', 꼬리표 '1번' → BASE는 fam*/dig* 매핑
  function addTitleFields(prefix, nn) {
    var cfg = TITLECFG[nn]; if (!cfg) return;
    var tag = (+nn) + '번';
    var mk = function (label, spec) {
      form.addTextItem().setTitle(prefix + label + T + tag).setRequired(false)
        .setHelpText('적정 길이 ' + spec.max + '자 이내' + (spec.caps ? ' · 대문자로 표시돼요' : '') + ' · 비우면 기본 "' + spec.def + '" 유지')
        .setValidation(FormApp.createTextValidation().setHelpText('적정 길이 ' + spec.max + '자 이내').requireTextLengthLessThanOrEqualTo(spec.max).build());
    };
    mk(' 인사말 큰 제목', cfg.title);
    if (cfg.subko) mk(' 인사말 부제', cfg.subko);
  }
  // 디자인별 강조 예시(짧은 버전 · 그 디자인의 실제 강조 위치). 05·08은 강조 없는 디자인 — 생략.
  var GREET_EG_SHORT = {
    '01': '*평생의 약속*',
    '02': '*오늘에 이르기까지*',
    '03': '*오늘에 이르기까지*',
    '04': '*그 한 장면을 함께 지켜봐 주신다면 오래도록 간직하겠습니다.*',
    '06': '*계절은 여러 번 바뀌었습니다.*',
    '07': '*오늘에 이르기까지*'
  };
  // 인사말 도움말 — 1~2줄 압축. (온라인)상속 / (05)날짜 자동 / (강조 디자인)별표 예시
  function greetHelp(nn, dig) {
    var eg = GREET_EG_SHORT[nn];
    if (dig) return '비우면 오프라인 인사말이 그대로 담깁니다 (다르게 쓰실 때만 입력).' + (eg ? '\n강조할 부분은 *별표*로 감싸기.' : '');
    if (nn === '05') return '비우면 디자인 기본 인사말 + 결혼식 날짜 자동 삽입.\n직접 쓰시면 자동 날짜는 사라집니다.';
    return '비우면 디자인 기본 인사말이 들어갑니다.' + (eg ? '\n강조할 부분은 *별표*로 감싸기 · 예) ' + eg : '');
  }

  // ── ① 두 분 정보 ──
  form.addSectionHeaderItem().setTitle('두 분 정보').setHelpText('성함과 이메일을 알려주세요.');
  req('신랑 한글 이름', '예) 이서준');
  req('신부 한글 이름', '예) 정하윤');
  req('신랑 영문 이름', '성·이름 사이에 띄어쓰기로 적어주세요. 대소문자는 자동으로 맞춰드립니다. 예) Lee Seo Jun').setValidation(nameVal);
  req('신부 영문 이름', '성·이름 사이에 띄어쓰기로 적어주세요. 대소문자는 자동으로 맞춰드립니다. 예) Jeong Ha Yoon').setValidation(nameVal);
  req('신랑 이메일', '완성된 청첩장 링크가 도착할 주소입니다. (두 분 모두에게 발송)').setValidation(emailVal);
  req('신부 이메일', '완성된 청첩장 링크가 도착할 주소입니다. (두 분 모두에게 발송)').setValidation(emailVal);

  // ── ② 예식 일정 ──
  form.addPageBreakItem().setTitle('예식 일정')
    .setHelpText('날짜·시간은 청첩장 곳곳에 자동으로 담깁니다.\n※ 예식 장소는 Moment Edit 스튜디오입니다 (경기 고양 향동).');
  req('결혼식 날짜', '예) 2027-12-17 (연-월-일, 월·일은 두 자리)').setValidation(FormApp.createTextValidation().setHelpText('예: 2027-12-17 (월·일을 두 자리로 적어주세요)').requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식으로 콜론(:)을 넣어주세요. 예) 10:00').setValidation(timeVal);

  // ── ③ 혼주(부모님 성함) · 마음 전하실 곳 (공통, 한 번만) ──
  form.addPageBreakItem().setTitle('혼주(부모님 성함) · 마음 전하실 곳')
    .setHelpText('모두 선택 입력입니다. 청첩장에 넣으실 때만 적어주세요.\n본인 계좌는 은행·번호를 따로, 부모님 계좌는 함께 적어주세요.');
  gate(CFG.Q_GREET_GATE, '인사말 아래에 부모님 성함을 넣으실지 선택해 주세요.');
  opt('신랑 혼주(부모님)', '두 분 성함을 함께 적어주세요. 예) 이재환·최미경\n(·가 어려우면 쉼표나 띄어쓰기로 구분해도 됩니다)');
  opt('신부 혼주(부모님)', '두 분 성함을 함께 적어주세요. 예) 정영석·박윤희');
  opt('신랑 은행', '예) 하나은행');
  opt('신랑 계좌번호', '예) 222-456-789012');
  opt('신부 은행', '예) 우리은행');
  opt('신부 계좌번호', '예) 333-456-789012');
  gate(CFG.Q_ENVELOPE_GATE, '부모님 계좌를 함께 넣으실지 선택해 주세요.');
  opt('신랑 아버지 계좌 (은행 번호)', '예) 국민 110-123-456789');
  opt('신랑 어머니 계좌 (은행 번호)', '예) 신한 220-456-123789');
  opt('신부 아버지 계좌 (은행 번호)', '예) 농협 351-234-567890');
  opt('신부 어머니 계좌 (은행 번호)', '예) 카카오뱅크 3333-12-3456789');

  // 계좌 표시 위치 — 체크박스(다중선택). 한 곳도 선택 안 하면 어디에도 미표시.
  form.addCheckboxItem()
    .setTitle(CFG.Q_ACCT_DISPLAY)
    .setRequired(false)
    .setChoiceValues([
      CFG.ACCT_CHOICE_ONLINE,
      CFG.ACCT_CHOICE_LIVE,
      CFG.ACCT_CHOICE_FAMILY
    ])
    .setHelpText(
      '· 라이브 화면 = 온라인 청첩장 안에서 예식을 실시간으로 보는 페이지입니다.\n' +
      '※ 입력하신 계좌(신랑·신부, 부모님 포함)가 체크하신 곳에 표시됩니다.\n' +
      '※ 한 곳도 선택하지 않으시면 어디에도 표시되지 않습니다.\n' +
      '※ 계좌를 비워두셔도 표시되지 않습니다.'
    );

  // ── ④ 오프라인 청첩장 (디자인 선택 → 1페이지 묶음) ──
  var pbFamDesign = form.addPageBreakItem().setTitle('오프라인 청첩장')
    .setHelpText('가족·가까운 분들께 드리는 청첩장입니다. 식장 약도는 Moment Edit 스튜디오로 자동 포함됩니다.');
  var famDesignQ = form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_FAMILY).setRequired(true).setHelpText(GALLERY);

  var famFirst = {};
  designs.forEach(function (nn) {
    var pb = form.addPageBreakItem().setTitle('오프라인 청첩장 ' + (+nn) + '번');
    addFormImage(form, R + 'prev-family-' + nn + '.png', '오프라인 청첩장 ' + (+nn) + '번 미리보기',
      '✎ 점선 = 직접 정하는 부분(비우면 기본값) · 실제 화면 → momentedit.kr/i-family/family-' + nn + '.html');
    addTitleFields('오프라인 청첩장', nn);
    optPara('인사말 (직접 작성)' + T + '오프라인 청첩장 ' + (+nn) + '번', greetHelp(nn, false));
    if (nn === '02') optPara('대표 문구 (2번 디자인 전용)' + T + '오프라인 청첩장 2번', '1~3줄 권장. 줄바꿈은 Enter. 비우면 기본 문구 (별표 강조 안 됨).');
    if (nn === '08') {
      var bioVal = FormApp.createParagraphTextValidation().setHelpText('약 60자 이내로 적어주세요.').requireTextLengthLessThanOrEqualTo(60).build();
      optPara('신랑 한마디 (8번 디자인 전용)' + T + '오프라인 청첩장 8번', '약 30자 이내 한두 문장. 비우면 기본 문구 (별표 강조 안 됨).').setValidation(bioVal);
      optPara('신부 한마디 (8번 디자인 전용)' + T + '오프라인 청첩장 8번', '약 30자 이내 한두 문장. 비우면 기본 문구 (별표 강조 안 됨).').setValidation(bioVal);
    }
    famFirst[nn] = pb;
  });

  // ── ⑤ 온라인 청첩장 (디자인 선택 → 1페이지 묶음) ──
  var pbDigDesign = form.addPageBreakItem().setTitle('온라인 청첩장 (멀리 계신 하객용)')
    .setHelpText('멀리 계신 분들도 함께하는 청첩장입니다. 혼주·계좌·문구는 오프라인 내용이 그대로 담깁니다.\n'
      + '※ 대표문구(02)·한마디(08)는 오프/온 동일 — 오프와 다른 디자인 선택 시 그 디자인 기본 문구가 표시됩니다.');
  var digDesignQ = form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_ONLINE).setRequired(true).setHelpText(GALLERY);

  var digFirst = {};
  designs.forEach(function (nn) {
    var pb = form.addPageBreakItem().setTitle('온라인 청첩장 ' + (+nn) + '번');
    addFormImage(form, R + 'prev-digital-' + nn + '.png', '온라인 청첩장 ' + (+nn) + '번 미리보기',
      '✎ 점선 = 직접 정하는 부분(비우면 오프라인 내용) · 실제 화면 → momentedit.kr/i/cover-' + nn + '.html');
    addTitleFields('온라인 청첩장', nn);
    optPara('온라인 청첩장 인사말 (직접 작성)' + T + '온라인 청첩장 ' + (+nn) + '번', greetHelp(nn, true));
    if (nn === '02') optPara('대표 문구 (2번 디자인 전용)' + T + '온라인 청첩장 2번', '비우면 오프라인 대표 문구가 그대로 담깁니다. 줄바꿈은 Enter.');
    if (nn === '08') {
      var digBioVal = FormApp.createParagraphTextValidation().setHelpText('약 60자 이내로 적어주세요.').requireTextLengthLessThanOrEqualTo(60).build();
      optPara('신랑 한마디 (8번 디자인 전용)' + T + '온라인 청첩장 8번', '비우면 오프라인 한마디가 그대로 담깁니다. 약 30자 이내.').setValidation(digBioVal);
      optPara('신부 한마디 (8번 디자인 전용)' + T + '온라인 청첩장 8번', '비우면 오프라인 한마디가 그대로 담깁니다. 약 30자 이내.').setValidation(digBioVal);
    }
    digFirst[nn] = pb;
  });

  // ── ⑥ 제출 ──
  var pbFinal = form.addPageBreakItem().setTitle('마지막으로 — 확인 후 제출')
    .setHelpText('마지막으로, 입력하신 내용을 한 번 살펴보시고 제출해 주세요.\n완성된 청첩장은 입력하신 이메일로 곧 전해드리겠습니다.\n보통 1~2분 이내 도착하며, 늦거나 못 받으신 경우 스팸함을 확인해 주세요.');

  // ── 분기 배선 ──
  // ④ 오프라인 디자인 선택 → 해당 페이지 / "발행 안 함" → ⑤로
  var famChoices = designs.map(function (nn) { return famDesignQ.createChoice(nn + '번', famFirst[nn]); });
  famChoices.push(famDesignQ.createChoice('발행 안 함', pbDigDesign));
  famDesignQ.setChoices(famChoices);
  designs.forEach(function (nn) { famFirst[nn].setGoToPage(pbDigDesign); }); // 오프 디자인 페이지 → ⑤로 수렴

  // ⑤ 온라인: "오프라인과 동일하게" → 제출(핸들러가 디자인·제목·인사말 미러) / 디자인 → 해당 페이지 / "만들지 않음" → 제출
  var SAME_AS_FAMILY = '오프라인과 동일하게 (오프라인을 발행하시는 경우에만 선택)';
  var digChoices = [];
  digChoices.push(digDesignQ.createChoice(SAME_AS_FAMILY, pbFinal));
  designs.forEach(function (nn) { digChoices.push(digDesignQ.createChoice(nn + '번', digFirst[nn])); });
  digChoices.push(digDesignQ.createChoice('만들지 않음 (오프라인 청첩장만)', pbFinal));
  digDesignQ.setChoices(digChoices);
  designs.forEach(function (nn) { digFirst[nn].setGoToPage(pbFinal); }); // 온 디자인 페이지 → ⑥ 제출로

  // 응답 연결 + 트리거 + 폼 URL 저장
  var ss = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  var _trigs = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'onCoupleFormSubmit'; });
  for (var _ti = 1; _ti < _trigs.length; _ti++) ScriptApp.deleteTrigger(_trigs[_ti]); // 중복 제거 — 정확히 1개만 유지
  if (_trigs.length === 0) ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  var exists = _trigs.length > 0;
  try { PropertiesService.getScriptProperties().setProperty(CFG.PROP_FORM_URL, form.getPublishedUrl()); } catch (_p) {}

  Logger.log('폼 v2 생성 완료 (6단계)\n  작성 URL: %s\n  편집 URL: %s\n  트리거: %s\n  ⚠️ 구 폼 삭제 + momentedit.kr/form 단축주소 갱신 필요.',
    form.getPublishedUrl(), form.getEditUrl(), exists ? '이미 있음' : '새로 등록');
}

// ============== 트리거·폼 연결 진단/복구 (createCoupleForm 재실행 없이) ==============
// 폼 정리 과정에서 트리거나 시트 응답 연결이 끊긴 경우를 위한 진단·복구.
// huijun이 GAS 편집기에서 함수 선택 후 ▶ 실행.

/** 진단 — 현재 폼·트리거·시트 연결 상태를 로그로 출력 (변경 없음, 읽기만). */
function diagnoseFormSetup() {
  var ss = SpreadsheetApp.getActive();
  Logger.log('═══ Moment Edit · 폼 연결 진단 ═══');
  Logger.log('현재 스프레드시트: ' + ss.getName() + ' (id: ' + ss.getId() + ')');

  // 1) 시트에 연결된 폼
  var linkedFormUrl = null;
  try { linkedFormUrl = ss.getFormUrl(); } catch (_) {}
  Logger.log('[시트→폼 연결]');
  if (linkedFormUrl) {
    Logger.log('  ✅ 시트에 연결된 폼 URL: ' + linkedFormUrl);
  } else {
    Logger.log('  ❌ 시트에 연결된 폼 없음 — 폼이 이 시트에 응답을 보내지 않습니다.');
  }

  // 2) PROP_FORM_URL (생성 시 저장된 정본 폼 URL)
  var propUrl = '';
  try { propUrl = PropertiesService.getScriptProperties().getProperty(CFG.PROP_FORM_URL) || ''; } catch (_) {}
  Logger.log('[저장된 정본 폼 URL]');
  if (propUrl) {
    Logger.log('  저장값: ' + propUrl);
    if (linkedFormUrl && linkedFormUrl.indexOf(extractFormId_(propUrl)) === -1) {
      Logger.log('  ⚠️ 시트 연결 폼과 저장된 정본 폼이 다름!');
    }
  } else {
    Logger.log('  ❌ PROP_FORM_URL 저장값 없음 (createCoupleForm 미실행 또는 초기화됨)');
  }

  // 3) onCoupleFormSubmit 트리거
  var trigs = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'onCoupleFormSubmit'; });
  Logger.log('[트리거 (onCoupleFormSubmit)]');
  Logger.log('  개수: ' + trigs.length);
  trigs.forEach(function (t, i) {
    Logger.log('  [' + i + '] eventType=' + t.getEventType() + ', sourceId=' + t.getTriggerSourceId());
    if (t.getTriggerSourceId() !== ss.getId()) {
      Logger.log('       ⚠️ 트리거가 다른 시트에 묶여있음 (현재 시트 아님)');
    }
  });
  if (trigs.length === 0) {
    Logger.log('  ❌ 트리거 없음 — 폼이 제출돼도 핸들러가 실행되지 않습니다.');
    Logger.log('  → ensureTrigger() 실행으로 복구 가능.');
  } else if (trigs.length > 1) {
    Logger.log('  ⚠️ 트리거 중복 ' + trigs.length + '개 — ensureTrigger() 실행으로 정리 가능.');
  } else if (trigs[0].getTriggerSourceId() !== ss.getId()) {
    Logger.log('  ⚠️ 트리거가 다른 시트에 묶여있음 — ensureTrigger() 실행으로 현재 시트로 재등록.');
  } else if (trigs[0].getEventType() !== ScriptApp.EventType.ON_FORM_SUBMIT) {
    Logger.log('  ⚠️ 트리거 이벤트 타입이 onFormSubmit 아님 — ensureTrigger() 실행으로 재등록.');
  } else {
    Logger.log('  ✅ 트리거 정상 (1개, 현재 시트, onFormSubmit).');
  }

  // 4) Couples 시트 헤더 존재 여부
  var sheet = ss.getSheetByName(CFG.SHEET_NAME);
  Logger.log('[Couples 시트]');
  if (!sheet) {
    Logger.log('  ❌ "' + CFG.SHEET_NAME + '" 시트 없음.');
  } else {
    var headers = sheet.getRange(CFG.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
    var hasEventId = headers.indexOf('eventId') !== -1;
    Logger.log('  헤더 행(' + CFG.HEADER_ROW + ') 컬럼 수: ' + headers.length + ', eventId 헤더: ' + (hasEventId ? '✅' : '❌'));
  }
  Logger.log('═══ 진단 종료 ═══');
}

/** 복구 — 현재 시트에 onCoupleFormSubmit 트리거를 정확히 1개 보장.
 *  · createCoupleForm을 재실행하지 않음(새 폼 안 만듦).
 *  · 시트에 폼이 연결되어 있어야 폼 제출 시 트리거가 발동함(시트 측 연결 별도 확인 필요).
 */
function ensureTrigger() {
  var ss = SpreadsheetApp.getActive();
  var trigs = ScriptApp.getProjectTriggers().filter(function (t) { return t.getHandlerFunction() === 'onCoupleFormSubmit'; });
  // 모두 일단 삭제하고 새로 1개 등록 → 다른 시트 바인딩·중복·잘못된 이벤트타입 동시 해결.
  trigs.forEach(function (t) { ScriptApp.deleteTrigger(t); });
  ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  Logger.log('트리거 정리·재등록 완료 — 현재 시트(' + ss.getName() + ')에 onFormSubmit 1개.');
  Logger.log('  (이전 트리거 ' + trigs.length + '개 삭제 → 새 트리거 1개 등록)');
  Logger.log('  다음 단계: diagnoseFormSetup() 실행해 "시트→폼 연결" 확인. 비었으면 폼에서 시트로 응답 연결 필요.');
}

// 내부 유틸 — URL에서 폼 ID(/d/e/{ID}/) 추출.
function extractFormId_(url) {
  var m = String(url || '').match(/\/forms\/d\/e?\/?([a-zA-Z0-9_-]+)/);
  return m ? m[1] : '';
}

// ============== 기존 폼에 "계좌 표시 위치" 체크박스만 추가 ==============
// createCoupleForm 재실행(새 폼) 없이 정본 폼에 1개 질문만 삽입.
// PROP_FORM_URL에서 폼 URL 가져옴 → 거기에 항목 추가 → ③ 페이지의
// "신부 어머니 계좌 (은행 번호)" 바로 다음 위치로 이동.
// 같은 제목 항목이 이미 있으면 중복 추가 안 함(멱등).
//
// 사용: GAS 편집기 함수 드롭다운 → addAccountDisplayCheckbox ▶ 실행
function addAccountDisplayCheckbox() {
  Logger.log('═══ Moment Edit · "계좌 표시 위치" 체크박스 추가 ═══');

  // 1) 폼 URL 확보 — PROP_FORM_URL에 저장된 정본 폼
  var url = '';
  try { url = PropertiesService.getScriptProperties().getProperty(CFG.PROP_FORM_URL) || ''; } catch (_) {}
  if (!url) {
    throw new Error('PROP_FORM_URL 저장값 없음 — createCoupleForm 한 번도 실행 안 됐거나 속성이 비었음.\n' +
      'GAS 편집기에서 Project Settings → Script Properties에서 FORM_PUBLISHED_URL 값을 확인하거나, ' +
      'createCoupleForm을 한 번 실행한 적이 있는 폼이어야 합니다.');
  }
  var form = FormApp.openByUrl(url);
  Logger.log('대상 폼: ' + form.getTitle() + ' (id: ' + form.getId() + ')');

  // 2) 멱등 — 이미 같은 제목 항목 있으면 추가 안 함
  var existing = form.getItems().filter(function (it) { return it.getTitle() === CFG.Q_ACCT_DISPLAY; });
  if (existing.length > 0) {
    Logger.log('"' + CFG.Q_ACCT_DISPLAY + '" 항목이 이미 ' + existing.length + '개 있음 — 추가 안 함');
    if (existing.length > 1) {
      Logger.log('⚠️ 중복 ' + existing.length + '개 — 폼 편집기에서 수동 정리 권장');
    }
    return;
  }

  // 3) 체크박스 추가 (폼 끝에 추가됨)
  var checkbox = form.addCheckboxItem()
    .setTitle(CFG.Q_ACCT_DISPLAY)
    .setRequired(false)
    .setChoiceValues([
      CFG.ACCT_CHOICE_ONLINE,
      CFG.ACCT_CHOICE_LIVE,
      CFG.ACCT_CHOICE_FAMILY
    ])
    .setHelpText(
      '· 라이브 화면 = 온라인 청첩장 안에서 예식을 실시간으로 보는 페이지입니다.\n' +
      '※ 입력하신 계좌(신랑·신부, 부모님 포함)가 체크하신 곳에 표시됩니다.\n' +
      '※ 한 곳도 선택하지 않으시면 어디에도 표시되지 않습니다.\n' +
      '※ 계좌를 비워두셔도 표시되지 않습니다.'
    );

  // 4) ③ 페이지의 "신부 어머니 계좌" 바로 다음으로 이동
  var items = form.getItems();
  var targetTitle = '신부 어머니 계좌 (은행 번호)';
  var targetIdx = -1;
  for (var i = 0; i < items.length; i++) {
    if (items[i].getTitle() === targetTitle) { targetIdx = i; break; }
  }
  if (targetIdx !== -1) {
    form.moveItem(checkbox, targetIdx + 1);
    Logger.log('✅ 추가 완료 — "' + targetTitle + '" 다음(index ' + (targetIdx + 1) + ')에 위치');
  } else {
    Logger.log('⚠️ "' + targetTitle + '" 항목을 못 찾음 — 체크박스가 폼 마지막에 추가됨. 폼 편집기에서 수동으로 ③ 페이지 끝으로 옮기세요.');
  }
  Logger.log('폼 URL: ' + form.getPublishedUrl());
}
