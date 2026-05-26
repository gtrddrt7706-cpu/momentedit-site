/**
 * Moment Edit · 구글폼 → Couples 시트 자동 등록 + URL 자동 조립 + 부부 자동 메일
 * ──────────────────────────────────────────────────────────────────────────
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
    '대표 문구 (02 Editorial 전용)': 'pullQuote',
    '신랑 한마디 (08 Noir 전용)': 'groomBio',
    '신부 한마디 (08 Noir 전용)': 'brideBio'
  },

  COL_DESIGN_ONLINE: 'designOnline',
  COL_DESIGN_FAMILY: 'designFamily',
  COL_DIGITAL: 'digitalAttendance',
  COL_GREETING: 'greetingShowParents',
  COL_ENVELOPE: 'envelopeShowParents',

  Q_DESIGN_FAMILY: '가족 청첩장 디자인 번호',
  Q_DESIGN_ONLINE: '디지털 참석 청첩장 디자인 번호',
  Q_GREET_GATE: '인사말에 혼주(부모님) 성함을 넣으시겠어요?',
  Q_ENVELOPE_GATE: '마음 전하실 곳에 부모님 계좌도 함께 넣으시겠어요?',

  TAG: ' · ',   // 베이스 제목과 브랜치 구분자 사이 구분자(베이스 제목엔 없는 문자열)
  PROP_FORM_URL: 'FORM_PUBLISHED_URL'
};

// ====================== 폼 제출 트리거 진입점 ======================
function onCoupleFormSubmit(e) {
  try {
    if (!e || !e.namedValues) throw new Error('폼 제출 이벤트가 아닙니다(트리거 설정 확인).');

    // 브랜치 구분자(" · 가족 01번")를 떼어 베이스 제목으로 병합 — 먼저 적힌 비어있지 않은 값 채택
    var merged = {};
    Object.keys(e.namedValues).forEach(function (title) {
      var base = title.split(CFG.TAG)[0].trim();
      var arr = e.namedValues[title];
      var val = (arr && arr[0] != null) ? String(arr[0]).trim() : '';
      if (val !== '' && (merged[base] === undefined || merged[base] === '')) merged[base] = val;
    });
    var g = function (base) { return merged[base] || ''; };

    var sheet = SpreadsheetApp.getActive().getSheetByName(CFG.SHEET_NAME);
    if (!sheet) throw new Error('시트 없음: ' + CFG.SHEET_NAME);
    var colOf = buildHeaderIndex(sheet);

    // 0) 예식ID
    var base = makeEventId(g('신랑 영문 이름'), g('신부 영문 이름'), g('결혼식 날짜'));
    if (!/^[a-z0-9-]{3,}$/.test(base)) {
      throw new Error('예식ID 자동생성 실패 — 영문 이름/날짜 확인. (생성값: "' + base + '")');
    }
    var resolved = resolveEventId(sheet, colOf, base, g('신랑 한글 이름'), g('신부 한글 이름'));
    var eventId = resolved.eventId, rowNum = resolved.rowNum;
    writeCell(sheet, colOf, rowNum, 'eventId', eventId);

    // 1) 단순 텍스트 필드(MAP)
    Object.keys(CFG.MAP).forEach(function (title) {
      writeCell(sheet, colOf, rowNum, CFG.MAP[title], g(title));
    });

    // 2) 디자인 번호 / 디지털 상태
    var famVal = g(CFG.Q_DESIGN_FAMILY);   // "01번" / "발행 안 함"
    var digVal = g(CFG.Q_DESIGN_ONLINE);   // "01번" / "만들지 않음" / "입장 QR만"
    var designFamily = pad2(famVal);
    var designOnline = pad2(digVal);
    var makeOnline = /QR/i.test(digVal) ? 'QR' : (designOnline ? 'Y' : 'N');
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily);
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline);
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, makeOnline);

    // 3) 혼주 표시 토글(인사말 성함 / 계좌 부모)
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ynShow(g(CFG.Q_GREET_GATE)));
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ynShow(g(CFG.Q_ENVELOPE_GATE)));

    // 4) 캐시 무효화
    try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

    // 5) URL
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';
    Logger.log('[OK] %s · row %s\n  digital: %s\n  family: %s', eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)');

    // 6) 부부 자동 메일
    try {
      sendCoupleEmail(g('신랑 이메일'), g('신부 이메일'), g('신랑 한글 이름'), g('신부 한글 이름'), liveUrl, familyUrl);
    } catch (mailErr) { Logger.log('  (이메일 발송 실패: ' + mailErr.message + ')'); }

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
      var rg = gNames[i] ? String(gNames[i][0]).trim() : '', rb = bNames[i] ? String(bNames[i][0]).trim() : '';
      if ((!rg && !rb) || (rg === groomName && rb === brideName)) return { eventId: candidate, rowNum: CFG.DATA_START_ROW + i };
      taken = true; break;
    }
    if (!taken) return { eventId: candidate, rowNum: lastRow + 1 };
    suffix++; candidate = base + '-' + suffix;
  }
}
function writeCell(sheet, colOf, rowNum, header, value) {
  var c = colOf[header];
  if (!c) { Logger.log('  (헤더 없음, 건너뜀: ' + header + ')'); return; }
  if (value === '') return;
  sheet.getRange(rowNum, c).setValue(value);
}
function pad2(s) {
  s = String(s || '').trim(); if (!s) return '';
  var n = s.replace(/[^0-9]/g, ''); return n ? ('0' + n).slice(-2) : '';
}
function ynShow(answer) {
  return /(안\s*함|미표시|숨김|제외|빼|아니|off|^\s*no\s*$|^\s*n\s*$)/i.test(String(answer || '').trim()) ? 'N' : 'Y';
}

// ===================== 부부 URL 자동 이메일 =====================
function sendCoupleEmail(groomEmail, brideEmail, groomName, brideName, liveUrl, familyUrl) {
  var to = [groomEmail, brideEmail].filter(function (em) { return em && em.indexOf('@') !== -1; }).join(',');
  if (!to) { Logger.log('  (수신 이메일 없음 — 메일 건너뜀)'); return; }
  if (!liveUrl && !familyUrl) { Logger.log('  (URL 없음 — 메일 건너뜀)'); return; }
  var formUrl = '';
  try { formUrl = PropertiesService.getScriptProperties().getProperty(CFG.PROP_FORM_URL) || ''; } catch (_p) {}
  GmailApp.sendEmail(to, '[Moment Edit] 두 분의 청첩장이 준비되었습니다', '', {
    htmlBody: buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, formUrl),
    name: 'Moment Edit', from: CFG.STUDIO_EMAIL
  });
  Logger.log('  (이메일 발송 → ' + to + ')');
}
function buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, formUrl) {
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var who = (groomName && brideName) ? (esc(groomName) + ' · ' + esc(brideName)) : '두 분';
  var row = function (label, sub, url) {
    return '<div style="margin:14px 0;"><div style="font-size:13px;color:#5A554C;margin-bottom:6px;">' + label +
      '<span style="color:#9a8f7f;font-size:12px;"> · ' + sub + '</span></div>' +
      '<a href="' + url + '" style="display:inline-block;word-break:break-all;font-size:13px;color:#6B2A24;">' + url + '</a></div>';
  };
  var links = '';
  if (liveUrl) links += row('디지털 참석 청첩장', '일반 하객용', liveUrl);
  if (familyUrl) links += row('가족 청첩장', '가족·가까운 분들께', familyUrl);
  var editNote = formUrl
    ? '내용을 고치고 싶으시면 <a href="' + formUrl + '" style="color:#6B2A24;">이 폼을 다시 작성</a>해 주세요. 같은 성함·날짜로 제출하시면 자동으로 갱신됩니다.'
    : '내용을 고치고 싶으시면 처음 작성하신 폼을 다시 제출해 주세요(같은 성함·날짜면 자동 갱신).';
  return '' +
    '<div style="font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:44px 30px;background:#FAFAF8;color:#3d3d3a;">' +
      '<div style="text-align:center;margin-bottom:28px;"><div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;letter-spacing:0.34em;">MOMENT&nbsp;EDIT</div>' +
      '<div style="font-family:\'Cormorant Garamond\',serif;font-size:10px;letter-spacing:0.3em;color:#B89A75;margin-top:8px;">PRIVATE WEDDING STUDIO</div></div>' +
      '<div style="width:40px;height:1px;background:#B89A75;margin:24px auto;"></div>' +
      '<p style="font-size:15px;line-height:1.85;font-weight:300;text-align:center;">' + who + ' 님,<br>두 분의 청첩장이 준비되었습니다.</p>' +
      '<div style="background:#fff;padding:22px 20px;border:1px solid rgba(0,0,0,0.06);border-radius:2px;margin:24px 0;">' + links + '</div>' +
      '<p style="font-size:13px;line-height:1.9;color:#5A554C;">한 번 열어보시고 이름·날짜·계좌에 오타가 없는지 확인해 주세요.<br>' + editNote + '</p>' +
      '<div style="text-align:center;margin-top:32px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#B89A75;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:14px;font-size:10px;color:#aaa;">Moment Edit · contact@momentedit.kr</div></div>';
}

// ============== 구글폼 자동 생성기 (최초 1회 실행) ==============
function addFormImage(form, url, title, help) {
  try {
    var it = form.addImageItem().setTitle(title || '미리보기').setImage(UrlFetchApp.fetch(url).getBlob());
    if (help) it.setHelpText(help);
  } catch (e) { Logger.log('  (이미지 첨부 실패: ' + (title || '') + ' — ' + e.message + ')'); }
}

function createCoupleForm() {
  var form = FormApp.create('Moment Edit · 청첩장 정보');
  form.setDescription(
    '두 분의 결혼을 진심으로 축하드립니다.\n\n' +
    '청첩장에 담길 내용을 받습니다. 적어주신 그대로 청첩장에 들어가요.\n' +
    '먼저 디자인을 고르시면, 그 디자인 미리보기가 함께 나옵니다.\n\n' +
    '제출하시면 완성된 청첩장 링크를 이메일로 보내드립니다.\n' +
    '※ 식장 정보는 따로 받지 않습니다(예식은 모먼트 에디트 스튜디오에서 진행됩니다).'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage('감사합니다! 입력하신 내용으로 청첩장을 준비해, 완성 링크를 이메일로 보내드릴게요. 수정은 받으신 메일의 안내대로 폼을 다시 작성하시면 됩니다.');

  var designs = ['01', '02', '03', '04', '05', '06', '07', '08'];
  var R = CFG.RAW, T = CFG.TAG;
  var req = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(true); if (help) it.setHelpText(help); return it; };
  var opt = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var optPara = function (title, help) { var it = form.addParagraphTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var nameVal = FormApp.createTextValidation().setHelpText('성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Seo Jun').requireTextMatchesPattern('^\\S+(\\s+\\S+)+$').build();
  var GALLERY = '갤러리에서 미리 둘러보실 수 있어요 → momentedit.kr/invitation-gallery.html';

  // ── PART 0 · 공통 기본정보 ──
  form.addSectionHeaderItem().setTitle('두 분 정보').setHelpText('성함과 연락받으실 이메일, 예식 일정, 본인 계좌를 적어주세요.');
  req('신랑 한글 이름', '예) 이서준');
  req('신부 한글 이름', '예) 정하윤');
  req('신랑 영문 이름', '성·이름 한 칸씩. 예) Lee Seo Jun').setValidation(nameVal);
  req('신부 영문 이름', '성·이름 한 칸씩. 예) Jeong Ha Yoon').setValidation(nameVal);
  req('신랑 이메일', '완성된 청첩장 링크가 도착할 주소예요.');
  req('신부 이메일', '완성된 청첩장 링크가 도착할 주소예요.');
  form.addPageBreakItem().setTitle('예식 일정 · 본인 계좌');
  req('결혼식 날짜', '예) 2026-10-24 (연-월-일)').setValidation(FormApp.createTextValidation().setHelpText('예: 2026-10-24').requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식. 예) 14:00');
  req('신랑 은행', '예) 하나은행');
  req('신랑 계좌번호', '예) 222-456-789012');
  req('신부 은행', '예) 우리은행');
  req('신부 계좌번호', '예) 333-456-789012');

  // 공통 디테일 페이지 묶음 생성기 (가족 브랜치 / 발행안함 폴백 공용)
  // tag: '가족 01번' 등 · secPrefix: 'sec-family-01-'(이미지) 또는 null
  // 반환: 이 묶음의 마지막 PageBreakItem (브랜치 연결용)
  function addDetailPages(tag, secPrefix) {
    var last;
    last = form.addPageBreakItem().setTitle('인사말 · ' + tag);
    if (secPrefix) addFormImage(form, R + secPrefix + 'invite.png', '인사말이 들어가는 자리', '✎ 점선 부분이 인사말이에요.');
    optPara('인사말 (직접 작성)' + T + tag,
      '직접 쓰신 인사말이 그대로 들어가요. 강조할 부분은 *별표*로 감싸면 포인트 색이 됩니다.\n예) 조용한 자리에서 *평생의 약속*을 건네기로 했습니다.\n비우면 디자인에 어울리는 기본 인사말이 자동으로 담깁니다.');

    last = form.addPageBreakItem().setTitle('혼주(부모님) 성함 · ' + tag);
    if (secPrefix) addFormImage(form, R + secPrefix + 'invite.png', '혼주 성함이 들어가는 자리', '✎ 인사말 아래 "자녀 소개" 부분이에요.');
    form.addMultipleChoiceItem().setTitle(CFG.Q_GREET_GATE + T + tag).setRequired(true)
      .setChoiceValues(['네 — 넣을게요', '아니요 — 넣지 않을게요']).setHelpText('인사말 아래에 부모님 성함을 넣을지 정해주세요.');
    opt('신랑 혼주(부모님)' + T + tag, '아버지 · 어머니 순. 예) 이재환 · 최미경');
    opt('신부 혼주(부모님)' + T + tag, '예) 정영석 · 박윤희');

    last = form.addPageBreakItem().setTitle('마음 전하실 곳 · ' + tag);
    if (secPrefix) addFormImage(form, R + secPrefix + 'env.png', '마음 전하실 곳(계좌)', '✎ 부모님 계좌를 넣으면 이렇게 함께 표시돼요.');
    form.addMultipleChoiceItem().setTitle(CFG.Q_ENVELOPE_GATE + T + tag).setRequired(true)
      .setChoiceValues(['네 — 넣을게요', '아니요 — 넣지 않을게요']).setHelpText('본인 계좌는 위에서 적으셨고, 부모님 계좌도 함께 넣을지 정해주세요.');
    opt('신랑 아버지 계좌 (은행 번호)' + T + tag, '예) 국민 110-123-456789');
    opt('신랑 어머니 계좌 (은행 번호)' + T + tag, '예) 신한 220-456-123789');
    opt('신부 아버지 계좌 (은행 번호)' + T + tag, '예) 농협 351-234-567890');
    opt('신부 어머니 계좌 (은행 번호)' + T + tag, '예) 카카오뱅크 3333-12-3456789');
    return last;
  }

  // ── PART 1 · 가족 청첩장 ──
  var pbFamDesign = form.addPageBreakItem().setTitle('가족 청첩장 디자인')
    .setHelpText('가족·가까운 분들께 따로 보내는 청첩장이에요. 식장 약도가 자동 포함됩니다(스튜디오 고정).');
  var famDesignQ = form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_FAMILY).setRequired(true).setHelpText(GALLERY);

  // 가족 브랜치 8개 + 발행안함 폴백 — 각 묶음의 (첫 페이지, 마지막 페이지) 기록
  var famFirst = {}, famLast = {};
  designs.forEach(function (nn) {
    var pb = form.addPageBreakItem().setTitle('가족 ' + nn + '번 — 미리보기');
    addFormImage(form, R + 'prev-family-' + nn + '.png', '가족 ' + nn + '번 청첩장 미리보기',
      '✎ 점선 = 직접 정하실 수 있는 부분 · 아래에서 차례로 입력해요. 실제로 열어보기 → momentedit.kr/i-family/family-' + nn + '.html');
    if (nn === '02') { addFormImage(form, R + 'sec-family-02-quote.png', '대표 문구 자리', '✎ 표지 대표 문구를 정하실 수 있어요.'); optPara('대표 문구 (02 Editorial 전용)' + T + '가족 02번', '비우면 기본 문구가 들어갑니다.  (예: 서로의 가장 진실한 / 순간을 기록하기로 합니다.)'); }
    if (nn === '08') { addFormImage(form, R + 'sec-family-08-duo.png', '두 사람 한마디 자리', '✎ 두 분의 한마디를 정하실 수 있어요.'); optPara('신랑 한마디 (08 Noir 전용)' + T + '가족 08번', '전하고 싶은 마음을 한두 문장으로. 비우면 기본 문구.'); optPara('신부 한마디 (08 Noir 전용)' + T + '가족 08번', '비우면 기본 문구.'); }
    famFirst[nn] = pb;
    famLast[nn] = addDetailPages('가족 ' + nn + '번', 'sec-family-' + nn + '-');
  });
  // 발행 안 함 폴백(이미지 없이 공통 디테일만)
  var pbFamNone = form.addPageBreakItem().setTitle('청첩장에 담길 내용')
    .setHelpText('가족 청첩장은 안 만드셔도, 아래 내용은 디지털 청첩장에 담깁니다.');
  var famNoneLast = addDetailPages('공통', null);

  // ── PART 2 · 디지털 참석 청첩장 ──
  var pbDigIntro = form.addPageBreakItem().setTitle('디지털 참석 청첩장 (온라인 하객용)')
    .setHelpText('멀리 못 오시는 분들도 온라인으로 함께하고, 하객 편지·마음 전하실 곳이 담겨요.\n앞서 적으신 인사말·혼주·계좌가 여기에도 그대로 담깁니다. 디자인만 골라주세요.');
  var digDesignQ = form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_ONLINE).setRequired(true).setHelpText(GALLERY);

  var digFirst = {}, digLast = {};
  designs.forEach(function (nn) {
    var pb = form.addPageBreakItem().setTitle('디지털 ' + nn + '번 — 미리보기');
    addFormImage(form, R + 'prev-digital-' + nn + '.png', '디지털 ' + nn + '번 청첩장 미리보기',
      '✎ 점선 = 정하실 수 있는 부분 · 실제로 열어보기 → momentedit.kr/i/cover-' + nn + '.html');
    var last = pb;
    if (nn === '02') { addFormImage(form, R + 'sec-digital-02-quote.png', '대표 문구 자리', '✎ 02 표지 대표 문구.'); optPara('대표 문구 (02 Editorial 전용)' + T + '디지털 02번', '가족 청첩장에서 이미 적으셨다면 비워두셔도 그대로 담겨요. 디지털만 02라면 여기 적어주세요. (비우면 기본 문구)'); }
    if (nn === '08') { addFormImage(form, R + 'sec-digital-08-duo.png', '두 사람 한마디 자리', '✎ 08 두 사람 한마디.'); optPara('신랑 한마디 (08 Noir 전용)' + T + '디지털 08번', '가족에서 적으셨다면 비워두세요(그대로 담겨요). 디지털만 08이면 여기 적기.'); optPara('신부 한마디 (08 Noir 전용)' + T + '디지털 08번', '가족에서 적으셨다면 비워두세요.'); }
    digFirst[nn] = pb; digLast[nn] = last;
  });

  // ── PART 3 · 마지막 확인 ──
  var pbFinal = form.addPageBreakItem().setTitle('마지막으로 — 확인 후 제출')
    .setHelpText('수고하셨어요! 위 내용으로 청첩장을 준비해, 완성 링크를 이메일로 보내드립니다.\n다 확인하셨으면 아래 "제출"을 눌러주세요.\n(제출 후에도 받으신 메일의 안내를 따라 폼을 다시 작성하시면 언제든 수정하실 수 있어요.)');

  // ── 분기 배선 ──
  // 가족 디자인 선택 → 해당 가족 브랜치 첫 페이지 / 발행안함 → 폴백
  var famChoices = designs.map(function (nn) { return famDesignQ.createChoice(nn + '번', famFirst[nn]); });
  famChoices.push(famDesignQ.createChoice('발행 안 함', pbFamNone));
  famDesignQ.setChoices(famChoices);
  // 각 가족 브랜치 마지막 → 디지털 인트로로 수렴
  designs.forEach(function (nn) { famLast[nn].setGoToPage(pbDigIntro); });
  famNoneLast.setGoToPage(pbDigIntro);

  // 디지털 디자인 선택 → 해당 디지털 브랜치 / 만들지않음·QR → 최종
  var digChoices = designs.map(function (nn) { return digDesignQ.createChoice(nn + '번', digFirst[nn]); });
  digChoices.push(digDesignQ.createChoice('만들지 않음 (가족 청첩장만)', pbFinal));
  digChoices.push(digDesignQ.createChoice('디자인은 직접 제작 · 입장 QR만 받을게요', pbFinal));
  digDesignQ.setChoices(digChoices);
  // 각 디지털 브랜치 마지막 → 최종으로 수렴
  designs.forEach(function (nn) { digLast[nn].setGoToPage(pbFinal); });

  // 응답 연결 + 트리거 + 폼 URL 저장
  var ss = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onCoupleFormSubmit'; });
  if (!exists) ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  try { PropertiesService.getScriptProperties().setProperty(CFG.PROP_FORM_URL, form.getPublishedUrl()); } catch (_p) {}

  Logger.log('폼 생성 완료\n  작성 URL: %s\n  편집 URL: %s\n  트리거: %s\n  ⚠️ 구 폼 삭제. 분기(가족8/디지털8)는 라이브에서 확인.',
    form.getPublishedUrl(), form.getEditUrl(), exists ? '이미 있음' : '새로 등록');
}
