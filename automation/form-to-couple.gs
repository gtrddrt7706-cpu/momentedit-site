/**
 * Moment Edit · 자동화 1단계 — 구글폼 → Couples 시트 자동 등록 + URL 자동 조립
 * ──────────────────────────────────────────────────────────────────────────
 * 목적: 부부(또는 미쿠 감독)가 구글폼을 한 번 작성하면, 이 스크립트가
 *       Couples 시트에 행을 자동으로 채우고, 디지털 참석(온라인)·가족 청첩장
 *       URL을 만들어 돌려준다. (수기 입력 제거 — 매뉴얼 P02+P04 자동화)
 *
 * ※ 2단계(솔라피 알림톡 자동 발송)는 huijun의 솔라피/카카오 채널 준비 후
 *   sendKakaoLinks() 자리(맨 아래)에 붙인다. 지금은 URL을 로그에 남기기만 한다.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * [v4 개정 — 고객 입장 2차 정비 · 2026.05.25]
 *  · 용어 통일: 고객 노출은 "디지털 참석 청첩장"(=온라인 하객용)으로 통일.
 *  · 디지털 참석 청첩장 게이트: "만드시겠어요? 네/아니요" → 아니요면 디자인 질문 건너뜀.
 *    (아니요 = 온라인 청첩장 자체 미발행. 가족 청첩장만 진행.)
 *  · 부모(혼주) 정보 게이트(중첩 분기): 넣을지 먼저 묻고, 넣을 때만 성함 입력 →
 *    계좌도 넣을지 묻고, 넣을 때만 부모 계좌 입력. → greeting/envelopeShowParents 자동 산출.
 *  · 02 대표문구·08 자기소개는 디자인 선택 분기로 해당 디자인일 때만 노출.
 *  · 마지막 "확인 후 제출" 페이지 + 응답 수정 허용(구글폼은 입력값 요약 미리보기 미지원).
 *  · 예식ID는 영문이름 첫 글자+날짜(MMDD)로 자동 생성(고객 미입력). 충돌 시 -2,-3.
 *  · 계좌: 본인=은행/계좌번호 분리 칸(J~M), 부모=‘은행 번호’ 한 칸(P~S) — 실제 시트 그대로.
 *  · 캐시 무효화: 편지 시스템 v3.4가 getCouple을 CacheService(TTL 600s)로 캐시 →
 *    시트 기록 후 해당 eventId 캐시를 비워 재제출이 즉시 반영되게 함.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * [설치] 이 파일을 Apps Script 새 .gs로 붙여넣고 createCoupleForm()를 1회 실행 →
 *   폼 자동 생성 + 응답 시트 연결 + 제출 트리거 등록. 실행 로그의 '작성 URL'을 전달.
 *   ⚠️ 구 폼이 있으면 삭제(한 시트에 폼 여러 개 연결 시 구 폼 제출이 오류 로그를 남김).
 *   ⚠️ 분기(부모·온라인·02/08)는 라이브 폼에서 직접 한 번씩 눌러 확인할 것.
 */

// ─────────────────────── 배포 기록 (Deployment) ───────────────────────
// 2026-05-25 · 1차: 구 18문항 폼(폼ID 1QOSFZ7...) — 폐기.
// 2026-05-25 · 2차(v3): 전 필드 폼(폼ID 1QXColZhh4Vz87dfiUXR6XnflcP-WQWPpGNHgDjhSBXc).
// 2026-05-25 · 3차(v4·본 개정): createCoupleForm() 재실행 → 새 폼 생성 후 이전 폼들 삭제.
//             작성(viewform) 링크는 공개 저장소에 적지 않음(스팸 방지) — 비공개 보관.

// ============================ CONFIG ============================
var CFG = {
  SHEET_NAME: 'Couples',
  HEADER_ROW: 3,           // 1행 버튼/안내, 2행 한글 라벨, 3행 영문 헤더 — getCouple과 동일
  DATA_START_ROW: 4,
  SITE_BASE: 'https://momentedit.kr',
  CACHE_KEY_PREFIX: 'couple_',  // 편지 시스템 v3.4 getCouple 캐시 키와 동일

  // 폼 질문 제목 → Couples 영문 헤더(3행) 매핑 (단순 텍스트 필드만)
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
    '대표 문구 (02 Editorial 전용)': 'pullQuote',
    '신랑 자기소개 (08 Noir 전용)': 'groomBio',
    '신부 자기소개 (08 Noir 전용)': 'brideBio'
  },

  // 시트 기록용 헤더 (없으면 조용히 건너뜀)
  COL_DESIGN_ONLINE: 'designOnline',     // Y열 liveUrl 수식이 읽음
  COL_DESIGN_FAMILY: 'designFamily',     // Z열 familyUrl 수식이 읽음
  COL_DIGITAL: 'digitalAttendance',      // Y/N
  COL_GREETING: 'greetingShowParents',   // Y/N
  COL_ENVELOPE: 'envelopeShowParents',   // Y/N

  // 변환·게이트 질문 제목
  Q_DESIGN_ONLINE: '디지털 참석 청첩장 디자인 번호',
  Q_DESIGN_FAMILY: '가족 청첩장 디자인 번호',
  Q_ONLINE_GATE: '디지털 참석 청첩장을 만드시겠어요?',
  Q_PARENT_GATE: '부모님(혼주) 정보를 청첩장에 넣으시겠어요?',
  Q_PARENT_ACCT: '부모님 계좌도 함께 넣으시겠어요?'
};

// ====================== 폼 제출 트리거 진입점 ======================
function onCoupleFormSubmit(e) {
  try {
    if (!e || !e.namedValues) throw new Error('폼 제출 이벤트가 아닙니다(트리거 설정 확인).');
    var v = e.namedValues;
    var get = function (title) {
      var a = v[title];
      return (a && a[0] != null) ? String(a[0]).trim() : '';
    };

    var sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SHEET_NAME);
    if (!sheet) throw new Error('시트 없음: ' + CFG.SHEET_NAME);
    var colOf = buildHeaderIndex(sheet);

    // 0) 예식ID 자동 생성
    var base = makeEventId(get('신랑 영문 이름'), get('신부 영문 이름'), get('결혼식 날짜'));
    if (!/^[a-z0-9-]{3,}$/.test(base)) {
      throw new Error('예식ID 자동생성 실패 — 영문 이름/날짜를 확인하세요. (생성값: "' + base + '")');
    }
    var resolved = resolveEventId(sheet, colOf, base, get('신랑 한글 이름'), get('신부 한글 이름'));
    var eventId = resolved.eventId, rowNum = resolved.rowNum;
    writeCell(sheet, colOf, rowNum, 'eventId', eventId);

    // 1) 단순 텍스트 필드 (분기로 건너뛴 항목은 빈 값 → 기록 안 함)
    Object.keys(CFG.MAP).forEach(function (title) {
      writeCell(sheet, colOf, rowNum, CFG.MAP[title], get(title));
    });

    // 2) 디지털 참석 청첩장 게이트(#7) → 만들 때만 디자인·디지털 기록
    var makeOnline = ynShow(get(CFG.Q_ONLINE_GATE));               // 네→Y, 아니요→N
    var designOnline = (makeOnline === 'Y') ? pad2(get(CFG.Q_DESIGN_ONLINE)) : '';
    var designFamily = pad2(get(CFG.Q_DESIGN_FAMILY));
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline);
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily);
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, makeOnline);

    // 3) 부모(혼주) 표기 게이트(#3) → greeting/envelope 토글 자동 산출
    var showNames = ynShow(get(CFG.Q_PARENT_GATE));                // 넣기→Y
    var showAcct = (showNames === 'Y' && ynShow(get(CFG.Q_PARENT_ACCT)) === 'Y') ? 'Y' : 'N';
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, showNames);
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, showAcct);

    // 4) 캐시 무효화 (재제출 즉시 반영)
    try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

    // 5) URL(로그용) — liveUrl·familyUrl 열은 시트 ARRAYFORMULA가 소유
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';
    Logger.log('[OK] %s · row %s\n  digital(online): %s\n  family: %s',
      eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)');

    // 6) (2단계) 알림톡 — 솔라피 준비되면 주석 해제
    // sendKakaoLinks(get('신랑 이메일'), get('신부 이메일'), liveUrl, familyUrl, eventId);

  } catch (err) {
    Logger.log('[ERROR] ' + err.message);
    throw err;
  }
}

// =========================== 헬퍼들 ===========================

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

// 영문 이름(띄어쓰기) 첫 글자 + 날짜(MMDD) → eventId 베이스
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

// base eventId로 행 찾기(같은 부부면 갱신), 다른 부부가 쓰면 -2,-3 접미사로 새 행
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
        return { eventId: candidate, rowNum: CFG.DATA_START_ROW + i };
      }
      taken = true;
      break;
    }
    if (!taken) return { eventId: candidate, rowNum: lastRow + 1 };
    suffix++;
    candidate = base + '-' + suffix;
  }
}

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
  return n ? ('0' + n).slice(-2) : '';
}

// 토글 해석: "안 함/미표시/숨김/아니/no/n/off"류 → 'N', 그 외(네/표시/기본/빈값) → 'Y'
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
  form.setAllowResponseEdits(true);  // 제출 후에도 응답 수정 가능 (미리보기 대체)
  form.setConfirmationMessage('감사합니다! 입력하신 내용으로 청첩장을 준비해 드릴게요. 수정하실 내용이 있으면 제출 후 받은 링크에서 언제든 고치실 수 있습니다.');

  var designs = ['01', '02', '03', '04', '05', '06', '07', '08'];
  var SUBMIT = FormApp.PageNavigationType.SUBMIT;
  var GALLERY = '갤러리에서 마음에 드신 번호를 골라주세요. → momentedit.kr/invitation-gallery.html';

  var req = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(true); if (help) it.setHelpText(help); return it; };
  var opt = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var optPara = function (title, help) { var it = form.addParagraphTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var nameVal = FormApp.createTextValidation()
    .setHelpText('성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Min Ho')
    .requireTextMatchesPattern('^\\S+(\\s+\\S+)+$').build();

  // ── 페이지 1 · 두 분 정보 ──────────────────────────────────
  form.addSectionHeaderItem().setTitle('두 분 정보')
    .setHelpText('두 분의 성함과, 연락받으실 이메일을 적어주세요.');
  req('신랑 한글 이름', '예) 이민호');
  req('신부 한글 이름', '예) 최유진');
  req('신랑 영문 이름', '성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Min Ho').setValidation(nameVal);
  req('신부 영문 이름', '성과 이름을 한 칸씩 띄어 적어주세요. 예) Choi Yu Jin').setValidation(nameVal);
  req('신랑 이메일', '하객 편지가 도착할 주소예요.');
  req('신부 이메일', '하객 편지가 도착할 주소예요.');

  // ── 페이지 2 · 예식 일정 ──────────────────────────────────
  form.addPageBreakItem().setTitle('예식 일정');
  req('결혼식 날짜', '예) 2026-08-23 (연-월-일)')
    .setValidation(FormApp.createTextValidation().setHelpText('예: 2026-08-23')
      .requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식으로 적어주세요. 예) 14:00');

  // ── 페이지 3 · 본인 계좌 ───────────────────────────────────
  form.addPageBreakItem().setTitle('마음 전하실 곳 · 계좌')
    .setHelpText('두 분 계좌는 은행과 번호를 나눠 적어주세요.');
  req('신랑 은행', '예) 하나은행');
  req('신랑 계좌번호', '예) 222-456-789012');
  req('신부 은행', '예) 우리은행');
  req('신부 계좌번호', '예) 333-456-789012');

  // ── 페이지 4 · 부모(혼주) 게이트 ──────────────────────────
  var pbParentGate = form.addPageBreakItem().setTitle('부모님(혼주) 정보');
  var gateParents = form.addMultipleChoiceItem().setTitle(CFG.Q_PARENT_GATE).setRequired(true)
    .setHelpText('청첩장 인사말·계좌 안내에 부모님(혼주) 정보를 넣을지 정해주세요.');

  // ── 페이지 4a · 혼주 성함 + 계좌 게이트 ───────────────────
  var pbNames = form.addPageBreakItem().setTitle('혼주(부모님) 성함');
  opt('신랑 혼주(부모님)', '아버지 · 어머니 순. 예) 이정환 · 김선미');
  opt('신부 혼주(부모님)', '예) 최영수 · 박미경');
  var gateAcct = form.addMultipleChoiceItem().setTitle(CFG.Q_PARENT_ACCT).setRequired(true)
    .setHelpText('"마음 전하실 곳"에 부모님 계좌까지 넣으실지 정해주세요.');

  // ── 페이지 4b · 부모 계좌 ─────────────────────────────────
  var pbAccounts = form.addPageBreakItem().setTitle('부모님 계좌')
    .setHelpText('은행과 번호를 한 칸에 적어주세요.');
  opt('신랑 아버지 계좌 (은행 번호)', '예) 국민 110-123-456789');
  opt('신랑 어머니 계좌 (은행 번호)', '예) 신한 220-456-123789');
  opt('신부 아버지 계좌 (은행 번호)', '예) 농협 351-234-567890');
  opt('신부 어머니 계좌 (은행 번호)', '예) 카카오뱅크 3333-12-3456789');

  // ── 페이지 5 · 인사말 ──────────────────────────────────────
  var pbInvite = form.addPageBreakItem().setTitle('인사말 · 선택');
  optPara('인사말 (직접 작성)', '직접 쓰신 인사말이 청첩장에 그대로 들어갑니다. 비우면 고르신 디자인에 어울리는 기본 인사말이 자동으로 담깁니다.');

  // ── 페이지 6 · 가족 청첩장 ────────────────────────────────
  var pbFamily = form.addPageBreakItem().setTitle('가족 청첩장')
    .setHelpText('가족·가까운 분들께 따로 보내는 청첩장이에요. 식장 약도가 자동 포함됩니다(모먼트 스튜디오 고정).');
  form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_FAMILY).setRequired(false)
    .setChoiceValues(designs.concat(['발행 안 함']))
    .setHelpText(GALLERY + ' 디지털 참석 청첩장과 같은 번호여도, 달라도 됩니다. 안 만드시면 "발행 안 함".');

  // ── 페이지 7 · 디지털 참석 청첩장 게이트(#7) ──────────────
  var pbOnlineGate = form.addPageBreakItem().setTitle('디지털 참석 청첩장 (온라인 하객용)');
  var gateOnline = form.addMultipleChoiceItem().setTitle(CFG.Q_ONLINE_GATE).setRequired(true)
    .setHelpText('멀리 못 오시는 분들도 온라인으로 함께하고, 하객 편지·마음 전하실 곳이 담기는 일반 하객용 청첩장이에요.');

  // ── 페이지 8 · 디지털 참석 청첩장 디자인 (분기 기준) ──────
  var pbOnlineDesign = form.addPageBreakItem().setTitle('디지털 참석 청첩장 디자인')
    .setHelpText(GALLERY);
  var designItem = form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_ONLINE).setRequired(true);

  // ── 페이지 9 · 대표 문구 (02) ─────────────────────────────
  var pbQuote = form.addPageBreakItem().setTitle('대표 문구 (Editorial · 02)')
    .setHelpText('02 Editorial 디자인 표지의 대표 문구예요.');
  optPara('대표 문구 (02 Editorial 전용)', '비우면 기본 문구가 들어갑니다.');

  // ── 페이지 10 · 두 사람 소개 (08) ─────────────────────────
  var pbBio = form.addPageBreakItem().setTitle('두 사람 소개 (Noir · 08)')
    .setHelpText('08 Noir 디자인의 "두 사람" 소개 카드예요.');
  optPara('신랑 자기소개 (08 Noir 전용)', '비우면 숨겨집니다.');
  optPara('신부 자기소개 (08 Noir 전용)', '비우면 숨겨집니다.');

  // ── 페이지 11 · 마지막 확인 (모든 경로 합류 → 제출) ───────
  var pbFinal = form.addPageBreakItem().setTitle('마지막으로 — 확인 후 제출')
    .setHelpText('수고하셨어요! 위 내용으로 청첩장을 준비해 드립니다.\n' +
      '잘못 적은 곳이 있으면 "뒤로"로 돌아가 고치실 수 있어요.\n' +
      '다 확인하셨으면 아래 "제출"을 눌러주세요. (제출 후에도 받은 링크에서 수정 가능)');

  // ── 분기 배선 ──────────────────────────────────────────────
  gateParents.setChoices([
    gateParents.createChoice('네 — 넣을게요', pbNames),
    gateParents.createChoice('아니요 — 넣지 않을게요', pbInvite)
  ]);
  gateAcct.setChoices([
    gateAcct.createChoice('네 — 계좌도 넣을게요', pbAccounts),
    gateAcct.createChoice('아니요 — 성함만 넣을게요', pbInvite)
  ]);
  pbAccounts.setGoToPage(pbInvite);

  gateOnline.setChoices([
    gateOnline.createChoice('네 — 만들게요', pbOnlineDesign),
    gateOnline.createChoice('아니요 — 만들지 않을게요 (가족 청첩장만)', pbFinal)
  ]);
  designItem.setChoices([
    designItem.createChoice('01', pbFinal),
    designItem.createChoice('02', pbQuote),
    designItem.createChoice('03', pbFinal),
    designItem.createChoice('04', pbFinal),
    designItem.createChoice('05', pbFinal),
    designItem.createChoice('06', pbFinal),
    designItem.createChoice('07', pbFinal),
    designItem.createChoice('08', pbBio)
  ]);
  pbQuote.setGoToPage(pbFinal);
  pbBio.setGoToPage(pbFinal);

  // 응답 연결 + 트리거
  var ss = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onCoupleFormSubmit';
  });
  if (!exists) ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();

  Logger.log('폼 생성 완료\n  작성(응답) URL: %s\n  편집 URL: %s\n  제출 트리거: %s\n  ⚠️ 구 폼이 있으면 삭제하세요. 분기(부모·온라인·02/08)는 라이브에서 직접 확인하세요.',
    form.getPublishedUrl(), form.getEditUrl(), exists ? '이미 있음' : '새로 등록');
}

// ===================== 2단계 자리(솔라피 알림톡) =====================
// huijun이 솔라피 가입 + 알림톡 템플릿 승인 후 채운다. API 키는 Apps Script Properties에 보관:
//   SOLAPI_KEY / SOLAPI_SECRET / SOLAPI_PFID(채널) / SOLAPI_TEMPLATE_ID
// function sendKakaoLinks(groomEmail, brideEmail, liveUrl, familyUrl, eventId) {
//   var p = PropertiesService.getScriptProperties();
//   // UrlFetchApp.fetch('https://api.solapi.com/messages/v4/send', { ...알림톡 payload... });
// }
