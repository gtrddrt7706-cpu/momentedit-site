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
 * [v3 개정 — 고객 친화 폼 · 2026.05.25]
 *  · 예식ID 자동 생성: 고객이 직접 안 적는다. 영문 이름 첫 글자 + 결혼식 날짜(MMDD)로
 *    onCoupleFormSubmit이 자동 조립("Lee Min Ho","Choi Yu Jin",2026-08-23 → lmh-cyj-0823).
 *    충돌(다른 부부·같은 ID)이면 -2,-3 접미사. 같은 부부 재제출은 같은 행 갱신.
 *  · 영문 이름은 "여권" 문구 제거 + "성과 이름을 모두 띄어쓰기"로 안내·검증(^\S+(\s+\S+)+$).
 *    띄어써야 ① 예식ID 첫 글자 추출 ② hydrate의 띄어쓰기 변형(Min Ho)이 정확.
 *  · 인사말(invitationText)은 8종 전부에 영역이 있음(04 "초대의 글" 포함) → 디자인 제한 문구 제거.
 *  · 02 대표문구·08 자기소개는 구글폼 섹션 분기로 "해당 디자인 선택 시에만" 노출.
 *  · 가족 청첩장 = 식장 약도 자동 포함(venue.js 고정) · 디지털 참석은 온라인 전용임을 폼에 안내.
 *  · 계좌: 본인=은행/계좌번호 분리 칸(J~M), 부모=‘은행 번호’ 한 칸(P~S) — 실제 시트 그대로.
 *  · 캐시 무효화: 편지 시스템 v3.4가 getCouple을 CacheService(TTL 600s)로 캐시하므로,
 *    시트 기록 후 해당 eventId 캐시를 비워 재제출이 즉시 반영되게 함.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * [설치 방법]
 *  ★ 이 파일을 Apps Script 편집기에 새 .gs로 붙여넣고 createCoupleForm() 함수를 한 번
 *    실행 → 폼 자동 생성 + 응답 시트 연결 + 제출 트리거 자동 등록. 실행 로그의 '작성 URL'을
 *    부부/미쿠 감독에게 전달.
 *    ⚠️ 이전에 만든 구 폼이 있으면 삭제할 것. 한 스프레드시트에 여러 폼이 연결되면 구 폼
 *       제출이 새 핸들러에서 오류 로그를 남긴다(질문 제목 불일치).
 *
 * [구글폼 항목] — 질문 제목을 아래와 "정확히" 똑같이 만든다(매핑 키로 씀).
 *  ※ 예식ID는 폼에서 안 받음(자동 생성). 식장 정보도 안 받음(venue.js 고정).
 *  필수:
 *   - "신랑 한글 이름" / "신부 한글 이름"
 *   - "신랑 영문 이름" / "신부 영문 이름"   (성·이름 모두 띄어쓰기. 예) Lee Min Ho)
 *   - "신랑 이메일" / "신부 이메일"
 *   - "결혼식 날짜"  예) 2026-08-23   - "결혼식 시간" 예) 14:00
 *   - "신랑 은행" / "신랑 계좌번호" / "신부 은행" / "신부 계좌번호"  (분리 칸)
 *   - "온라인 청첩장 디자인 번호"  객관식 01~08 (분기 기준)
 *  선택:
 *   - "신랑 혼주(부모님)" / "신부 혼주(부모님)"
 *   - "신랑 아버지 계좌 (은행 번호)" / "신랑 어머니 계좌 (은행 번호)"
 *   - "신부 아버지 계좌 (은행 번호)" / "신부 어머니 계좌 (은행 번호)"
 *   - "인사말에 부모님 성함 표시" / "마음 전하실 곳에 부모님 계좌 표시"  객관식 표시/표시 안 함
 *   - "인사말 (직접 작성)"   장문 (8종 공통 · 비우면 디자인 기본)
 *   - "대표 문구 (02 Editorial 전용)"   장문 (02 선택 시에만 페이지 노출)
 *   - "신랑 자기소개 (08 Noir 전용)" / "신부 자기소개 (08 Noir 전용)"  장문 (08 선택 시에만)
 *   - "가족 청첩장 디자인 번호"  객관식 01~08 또는 "발행 안 함" (약도 자동 포함)
 *   - "디지털 참석"  객관식 ["함께 진행합니다 (기본)", "이번엔 빼주세요"] (온라인 전용)
 */

// ─────────────────────── 배포 기록 (Deployment) ───────────────────────
// 2026-05-25 · 1차: createCoupleForm() 구 18문항 폼 생성 (폼ID 1QOSFZ7...) — 폐기 대상.
// 2026-05-25 · 2차(v3 개정 적용): createCoupleForm() 재실행 → 새 폼 생성.
//             현행 폼ID: 1QXColZhh4Vz87dfiUXR6XnflcP-WQWPpGNHgDjhSBXc (편집 URL은 권한 필요라 안전)
//             ⚠️ 1차 구 폼(1QOSFZ7...)은 삭제할 것 — 같은 시트에 두 폼이 연결되면 구 폼 제출이
//                새 핸들러에서 "예식ID 자동생성 실패" 오류 로그를 남긴다.
//             작성(viewform) 링크는 공개 저장소에 적지 않음(스팸 방지) — 비공개 보관.

// ============================ CONFIG ============================
var CFG = {
  SHEET_NAME: 'Couples',   // 부부 데이터 탭 이름
  HEADER_ROW: 3,           // 영문 헤더 행 (1행 버튼/안내, 2행 한글 라벨, 3행 영문 헤더) — getCouple과 동일
  DATA_START_ROW: 4,       // 실제 데이터 시작 행 (4행~)
  SITE_BASE: 'https://momentedit.kr',

  // 캐시 무효화 — 편지 시스템 v3.4(Code.gs)의 getCouple 캐시 키와 동일해야 함.
  CACHE_KEY_PREFIX: 'couple_',

  // 폼 질문 제목 → Couples 영문 헤더(3행) 매핑. 단순 텍스트 필드만 여기 둔다.
  // (예식ID는 자동 생성이라 MAP에 없음. 디자인/토글은 아래 Q_*/COL_* 로 별도 처리)
  MAP: {
    '신랑 한글 이름': 'groomName',
    '신부 한글 이름': 'brideName',
    '신랑 이메일': 'groomEmail',
    '신부 이메일': 'brideEmail',
    '결혼식 날짜': 'weddingDate',
    '결혼식 시간': 'weddingTime',
    '신랑 영문 이름': 'groomNameEn',
    '신부 영문 이름': 'brideNameEn',
    // 본인 계좌 — 은행/계좌번호 분리 칸 (시트 J~M)
    '신랑 은행': 'groomBank',
    '신랑 계좌번호': 'groomAccount',
    '신부 은행': 'brideBank',
    '신부 계좌번호': 'brideAccount',
    // 혼주(부모님) 성함
    '신랑 혼주(부모님)': 'groomParents',
    '신부 혼주(부모님)': 'brideParents',
    // 부모 계좌 — "은행 번호" 한 칸 (시트 P~S)
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
  COL_DESIGN_ONLINE: 'designOnline',     // 온라인 디자인 번호 — Y열 liveUrl 수식이 이걸 읽음(필수 기록)
  COL_DESIGN_FAMILY: 'designFamily',     // 가족 디자인 번호 — Z열 familyUrl 수식이 이걸 읽음
  COL_DIGITAL: 'digitalAttendance',      // Y/N (N일 때만 디지털 참석 섹션 숨김)
  COL_GREETING: 'greetingShowParents',   // Y/N (인사말 부모 성함 표기)
  COL_ENVELOPE: 'envelopeShowParents',   // Y/N (계좌 안내 부모 표기)

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
    var get = function (title) {
      var a = v[title];
      return (a && a[0] != null) ? String(a[0]).trim() : '';
    };

    var sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SHEET_NAME);
    if (!sheet) throw new Error('시트 없음: ' + CFG.SHEET_NAME);
    var colOf = buildHeaderIndex(sheet);         // {헤더명: 1-based 열번호}

    // 0) 예식ID 자동 생성 (영문 이름 첫 글자 + MMDD) → 충돌 시 -2,-3
    var base = makeEventId(get('신랑 영문 이름'), get('신부 영문 이름'), get('결혼식 날짜'));
    if (!/^[a-z0-9-]{3,}$/.test(base)) {
      throw new Error('예식ID 자동생성 실패 — 영문 이름/날짜를 확인하세요. (생성값: "' + base + '")');
    }
    var resolved = resolveEventId(sheet, colOf, base, get('신랑 한글 이름'), get('신부 한글 이름'));
    var eventId = resolved.eventId, rowNum = resolved.rowNum;
    writeCell(sheet, colOf, rowNum, 'eventId', eventId);

    // 1) 폼 → Couples 단순 텍스트 필드 기록
    Object.keys(CFG.MAP).forEach(function (title) {
      writeCell(sheet, colOf, rowNum, CFG.MAP[title], get(title));
    });

    // 2) 디자인 번호 (Y/Z URL 자동수식이 T·U열을 읽으므로 반드시 기록)
    var designOnline = pad2(get(CFG.Q_DESIGN_ONLINE));
    var designFamily = pad2(get(CFG.Q_DESIGN_FAMILY));
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline);
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily);

    // 3) 토글 3종 (Y/N) — 명시적 "안 함/빼주세요"류만 N, 그 외 Y(기본 노출)
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, ynShow(get(CFG.Q_DIGITAL)));
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ynShow(get(CFG.Q_GREETING)));
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ynShow(get(CFG.Q_ENVELOPE)));

    // 4) 캐시 무효화 — 재제출이 즉시 반영되도록 이 eventId 캐시를 비운다(신규는 무해).
    try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

    // 5) URL — liveUrl·familyUrl(Y·Z)은 시트 ARRAYFORMULA가 소유 → 스크립트는 기록하지 않음.
    //    아래는 로그/알림톡용으로만 계산.
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';

    Logger.log('[OK] %s · row %s\n  online: %s\n  family: %s',
      eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)');

    // 6) (2단계) 알림톡 자동 발송 — 솔라피 준비되면 주석 해제
    // sendKakaoLinks(get('신랑 이메일'), get('신부 이메일'), liveUrl, familyUrl, eventId);

  } catch (err) {
    Logger.log('[ERROR] ' + err.message);
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

// 영문 이름(띄어쓰기) 첫 글자 + 결혼식 날짜(MMDD) → eventId 베이스
//  "Lee Min Ho","Choi Yu Jin","2026-08-23" → "lmh-cyj-0823"
function makeEventId(groomNameEn, brideNameEn, weddingDate) {
  var ini = function (en) {
    return String(en || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
      .map(function (w) { return w.charAt(0); }).join('').replace(/[^a-z]/g, '');
  };
  var g = ini(groomNameEn), b = ini(brideNameEn);
  var mmdd = '';
  var m = String(weddingDate || '').match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
  if (m) mmdd = ('0' + m[2]).slice(-2) + ('0' + m[3]).slice(-2);
  return [g, b, mmdd].filter(Boolean).join('-');
}

// base eventId로 행을 찾고(같은 부부면 갱신), 다른 부부가 이미 쓰면 -2,-3 접미사로 새 행.
function resolveEventId(sheet, colOf, base, groomName, brideName) {
  var idCol = colOf['eventId'];
  if (!idCol) throw new Error("'eventId' 헤더를 시트 " + CFG.HEADER_ROW + "행에서 못 찾음");
  var gCol = colOf['groomName'], bCol = colOf['brideName'];
  var lastRow = Math.max(sheet.getLastRow(), CFG.DATA_START_ROW - 1);
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
      var rowG = (gNames[i] ? String(gNames[i][0]).trim() : '');
      var rowB = (bNames[i] ? String(bNames[i][0]).trim() : '');
      if ((!rowG && !rowB) || (rowG === groomName && rowB === brideName)) {
        return { eventId: candidate, rowNum: CFG.DATA_START_ROW + i }; // 같은 부부 → 갱신
      }
      taken = true;   // 다른 부부가 이미 쓰는 ID → 다음 후보로
      break;
    }
    if (!taken) return { eventId: candidate, rowNum: lastRow + 1 }; // 빈 ID → 새 행
    suffix++;
    candidate = base + '-' + suffix;
  }
}

// 헤더명이 존재할 때만 셀에 기록(없으면 조용히 건너뜀). 빈 값은 덮어쓰지 않음(선택 항목 보존).
function writeCell(sheet, colOf, rowNum, header, value) {
  var c = colOf[header];
  if (!c) { Logger.log('  (헤더 없음, 건너뜀: ' + header + ')'); return; }
  if (value === '') return;
  sheet.getRange(rowNum, c).setValue(value);
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
function createCoupleForm() {
  var form = FormApp.create('Moment Edit · 청첩장 정보');
  form.setDescription(
    '두 분의 결혼을 진심으로 축하드립니다.\n' +
    '청첩장에 담길 내용을 받습니다 — 적어주신 그대로 청첩장에 들어갑니다.\n' +
    '필요한 항목만 채우셔도 돼요. 선택 항목을 비우면 가장 어울리는 기본값으로 들어갑니다.\n' +
    '※ 식장 정보는 따로 받지 않습니다(예식은 모먼트 에디트 스튜디오에서 진행됩니다).'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);

  var designs = ['01', '02', '03', '04', '05', '06', '07', '08'];
  var SUBMIT = FormApp.PageNavigationType.SUBMIT;

  var req = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(true); if (help) it.setHelpText(help); return it; };
  var opt = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var optPara = function (title, help) { var it = form.addParagraphTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var nameVal = FormApp.createTextValidation()
    .setHelpText('성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Min Ho')
    .requireTextMatchesPattern('^\\S+(\\s+\\S+)+$').build();

  // ── 페이지 1 · 두 분 정보 ──────────────────────────────────
  form.addSectionHeaderItem().setTitle('두 분 정보')
    .setHelpText('예식 고유번호는 영문 이름과 날짜로 자동으로 만들어지니 따로 적지 않으셔도 됩니다.');
  req('신랑 한글 이름', '예) 이민호');
  req('신부 한글 이름', '예) 최유진');
  req('신랑 영문 이름', '성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Min Ho').setValidation(nameVal);
  req('신부 영문 이름', '성과 이름을 한 칸씩 띄어 적어주세요. 예) Choi Yu Jin').setValidation(nameVal);
  req('신랑 이메일', '하객 편지가 도착할 주소예요.');
  req('신부 이메일');

  // ── 페이지 2 · 예식 일정 ──────────────────────────────────
  form.addPageBreakItem().setTitle('예식 일정');
  req('결혼식 날짜', '예) 2026-08-23 (연-월-일)')
    .setValidation(FormApp.createTextValidation().setHelpText('예: 2026-08-23')
      .requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식으로 적어주세요. 예) 14:00');

  // ── 페이지 3 · 마음 전하실 곳 ──────────────────────────────
  form.addPageBreakItem().setTitle('마음 전하실 곳 · 계좌')
    .setHelpText('본인 계좌는 은행과 번호를 나눠 적어주세요.');
  req('신랑 은행', '예) 하나은행');
  req('신랑 계좌번호', '예) 222-456-789012');
  req('신부 은행', '예) 우리은행');
  req('신부 계좌번호', '예) 333-456-789012');

  form.addSectionHeaderItem().setTitle('혼주(부모님) · 선택')
    .setHelpText('원치 않으시면 비워두세요 — 비우면 청첩장에 표시되지 않습니다.');
  opt('신랑 혼주(부모님)', '아버지 · 어머니 순. 예) 이정환 · 김선미');
  opt('신부 혼주(부모님)', '예) 최영수 · 박미경');
  opt('신랑 아버지 계좌 (은행 번호)', '은행과 번호를 한 칸에. 예) 국민 110-123-456789');
  opt('신랑 어머니 계좌 (은행 번호)', '예) 신한 220-456-123789');
  opt('신부 아버지 계좌 (은행 번호)', '예) 농협 351-234-567890');
  opt('신부 어머니 계좌 (은행 번호)', '예) 카카오뱅크 3333-12-3456789');
  form.addMultipleChoiceItem().setTitle('인사말에 부모님 성함 표시').setRequired(false)
    .setChoiceValues(['표시 (기본)', '표시 안 함'])
    .setHelpText('인사말 끝 소개 글에 부모님 성함을 넣을지 정해주세요. 비우면 표시(기본)이고, 혼주를 안 적으시면 자동으로 빠집니다.');
  form.addMultipleChoiceItem().setTitle('마음 전하실 곳에 부모님 계좌 표시').setRequired(false)
    .setChoiceValues(['표시 (기본)', '표시 안 함'])
    .setHelpText('계좌 안내에 부모님 계좌까지 넣을지 정해주세요. 비우면 표시(기본)이고, 부모 계좌를 안 적으시면 자동으로 빠집니다.');

  // ── 페이지 4 · 인사말 ──────────────────────────────────────
  form.addPageBreakItem().setTitle('인사말 · 선택');
  optPara('인사말 (직접 작성)',
    '직접 쓰신 인사말이 청첩장에 그대로 들어갑니다. 비우면 고르신 디자인에 어울리는 기본 인사말이 자동으로 담깁니다. (8종 모두 인사말 영역이 있어요.)');

  // ── 페이지 5 · 온라인 / 가족 청첩장 ───────────────────────
  form.addPageBreakItem().setTitle('온라인 / 가족 청첩장')
    .setHelpText('일반 하객용(온라인)에는 디지털 참석이, 가족용에는 식장 약도가 자동으로 들어갑니다.');
  form.addMultipleChoiceItem().setTitle('디지털 참석').setRequired(false)
    .setChoiceValues(['함께 진행합니다 (기본)', '이번엔 빼주세요'])
    .setHelpText('멀리 못 오시는 분들이 온라인으로 함께하는 기능이에요(일반 하객용 청첩장에만 들어갑니다). 부담되시면 "이번엔 빼주세요" — 그래도 편지·계좌는 그대로 유지됩니다.');
  form.addMultipleChoiceItem().setTitle('가족 청첩장 디자인 번호').setRequired(false)
    .setChoiceValues(designs.concat(['발행 안 함']))
    .setHelpText('가족·가까운 분들께 따로 보내는 청첩장이에요. 식장 약도가 자동으로 포함됩니다(모먼트 스튜디오 고정). 온라인과 같은 번호여도, 달라도 됩니다. 안 만드시면 "발행 안 함".');

  // ── 페이지 6 · 온라인 디자인 선택 (분기 기준 · 이 페이지의 마지막 질문이어야 함) ──
  form.addPageBreakItem().setTitle('온라인 청첩장 디자인')
    .setHelpText('갤러리에서 마음에 드신 번호를 골라주세요. → momentedit.kr/invitation-gallery.html');
  var designItem = form.addMultipleChoiceItem().setTitle('온라인 청첩장 디자인 번호').setRequired(true);

  // ── 분기 페이지: 02 대표문구 / 08 자기소개 (해당 디자인 선택 시에만 노출) ──
  var pbQuote = form.addPageBreakItem().setTitle('대표 문구 (Editorial · 02)')
    .setHelpText('02 Editorial 디자인 표지의 대표 문구예요.');
  optPara('대표 문구 (02 Editorial 전용)', '비우면 기본 문구가 들어갑니다.');
  pbQuote.setGoToPage(SUBMIT);

  var pbBio = form.addPageBreakItem().setTitle('두 사람 소개 (Noir · 08)')
    .setHelpText('08 Noir 디자인의 "두 사람" 소개 카드예요.');
  optPara('신랑 자기소개 (08 Noir 전용)', '비우면 숨겨집니다.');
  optPara('신부 자기소개 (08 Noir 전용)', '비우면 숨겨집니다.');
  pbBio.setGoToPage(SUBMIT);

  // 디자인 선택지 분기: 02→대표문구, 08→자기소개, 그 외/발행 안 함→바로 제출
  designItem.setChoices([
    designItem.createChoice('01', SUBMIT),
    designItem.createChoice('02', pbQuote),
    designItem.createChoice('03', SUBMIT),
    designItem.createChoice('04', SUBMIT),
    designItem.createChoice('05', SUBMIT),
    designItem.createChoice('06', SUBMIT),
    designItem.createChoice('07', SUBMIT),
    designItem.createChoice('08', pbBio),
    designItem.createChoice('발행 안 함', SUBMIT)
  ]);

  // 응답을 현재 스프레드시트로 연결
  var ss = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());

  // onFormSubmit 트리거 자동 등록(중복 방지)
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onCoupleFormSubmit';
  });
  if (!exists) ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();

  Logger.log('폼 생성 완료\n  작성(응답) URL: %s\n  편집 URL: %s\n  제출 트리거: %s\n  ⚠️ 이전에 만든 구 폼이 있으면 삭제하세요(두 폼이 같은 시트에 연결되면 구 폼 제출이 오류 로그를 남깁니다).',
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
