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
    '대표 문구 (2번 디자인 전용)': 'pullQuote',
    '신랑 한마디 (8번 디자인 전용)': 'groomBio',
    '신부 한마디 (8번 디자인 전용)': 'brideBio',
    '오프라인 청첩장 인사말 큰 제목': 'famInvTitle',
    '오프라인 청첩장 인사말 부제': 'famInvSubKo',
    '온라인 청첩장 인사말 큰 제목': 'digInvTitle',
    '온라인 청첩장 인사말 부제': 'digInvSubKo',
    '온라인 청첩장 인사말 (직접 작성)': 'digInvitationText'
  },

  COL_DESIGN_ONLINE: 'designOnline',
  COL_DESIGN_FAMILY: 'designFamily',
  COL_DIGITAL: 'digitalAttendance',
  COL_GREETING: 'greetingShowParents',
  COL_ENVELOPE: 'envelopeShowParents',

  Q_DESIGN_FAMILY: '오프라인 청첩장 디자인 번호',
  Q_DESIGN_ONLINE: '온라인 청첩장 디자인 번호',
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
    var digVal = g(CFG.Q_DESIGN_ONLINE);   // "01번" / "만들지 않음" / "오프라인과 동일하게…"
    var designFamily = pad2(famVal);
    var sameAsFamily = /동일/.test(digVal) && !!designFamily;   // "오프라인과 동일하게" (오프라인 발행 시에만 유효)
    var designOnline = sameAsFamily ? designFamily : pad2(digVal);
    var makeOnline = designOnline ? 'Y' : 'N';
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily);
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline);
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, makeOnline);
    // "오프라인과 동일하게" → 온라인 제목·부제를 오프라인 값으로 미러(인사말은 hydrate가 invitationText 자동 상속)
    if (sameAsFamily) {
      var _ft = g('오프라인 청첩장 인사말 큰 제목'); if (_ft) writeCell(sheet, colOf, rowNum, 'digInvTitle', _ft);
      var _fs = g('오프라인 청첩장 인사말 부제'); if (_fs) writeCell(sheet, colOf, rowNum, 'digInvSubKo', _fs);
    }

    // 3) 혼주 표시 토글(인사말 성함 / 계좌 부모)
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ynShow(g(CFG.Q_GREET_GATE)));
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ynShow(g(CFG.Q_ENVELOPE_GATE)));

    // 4) 캐시 무효화
    try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

    // 5) URL
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';
    // 라이브(입장) 페이지 — QR 대상. 디지털 참석/입장QR 선택 시에만(종이 청첩장에 넣어 공유용)
    var enterUrl = (makeOnline === 'Y' || makeOnline === 'QR') ? (CFG.SITE_BASE + '/live.html?e=' + encodeURIComponent(eventId)) : '';
    Logger.log('[OK] %s · row %s\n  digital: %s\n  family: %s\n  live(QR): %s', eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)', enterUrl || '(없음)');

    // 6) 부부 자동 메일
    try {
      sendCoupleEmail(g('신랑 이메일'), g('신부 이메일'), g('신랑 한글 이름'), g('신부 한글 이름'), liveUrl, familyUrl, enterUrl);
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
function sendCoupleEmail(groomEmail, brideEmail, groomName, brideName, liveUrl, familyUrl, enterUrl) {
  var to = [groomEmail, brideEmail].filter(function (em) { return em && em.indexOf('@') !== -1; }).join(',');
  if (!to) { Logger.log('  (수신 이메일 없음 — 메일 건너뜀)'); return; }
  if (!liveUrl && !familyUrl && !enterUrl) { Logger.log('  (URL 없음 — 메일 건너뜀)'); return; }
  var formUrl = '';
  try { formUrl = PropertiesService.getScriptProperties().getProperty(CFG.PROP_FORM_URL) || ''; } catch (_p) {}

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
    htmlBody: buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, formUrl, !!qrBlob),
    name: 'Moment Edit', from: CFG.STUDIO_EMAIL
  };
  if (qrBlob) {
    opts.inlineImages = { qrDigital: qrBlob };
  }
  GmailApp.sendEmail(to, '[Moment Edit] 두 분의 청첩장이 준비되었습니다', '', opts);
  Logger.log('  (이메일 발송 → ' + to + (qrBlob ? ' · QR 포함' : '') + ')');
}
function buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, formUrl, hasQr) {
  var esc = function (s) { return String(s || '').replace(/[&<>"']/g, function (m) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m]; }); };
  var who = (groomName && brideName) ? (esc(groomName) + ' · ' + esc(brideName)) : '두 분';
  var row = function (label, sub, url) {
    return '<div style="margin:14px 0;"><div style="font-size:13px;color:#CFC6B8;margin-bottom:6px;">' + label +
      '<span style="color:#9C9080;font-size:12px;"> · ' + sub + '</span></div>' +
      '<a href="' + url + '" style="display:inline-block;word-break:break-all;font-size:13px;color:#D8B48C;">' + url + '</a></div>';
  };
  var links = '';
  if (liveUrl) links += row('온라인 청첩장', '멀리 계신 하객용', liveUrl);
  if (familyUrl) links += row('오프라인 청첩장', '가족·가까운 분들께', familyUrl);
  var editNote = formUrl
    ? '내용을 고치고 싶으시면 <a href="' + formUrl + '" style="color:#D8B48C;">이 폼을 다시 작성</a>해 주세요.<br>같은 성함·날짜로 제출하시면 자동으로 갱신됩니다.'
    : '내용을 고치고 싶으시면 처음 작성하신 폼을 다시 제출해 주세요(같은 성함·날짜면 자동 갱신).';
  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:dark}body{margin:0;padding:0;background:#1E1A17}</style></head>' +
    '<body style="margin:0;padding:0;background:#1E1A17;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1E1A17;width:100%;"><tr><td align="center" bgcolor="#1E1A17" style="background:#1E1A17;">' +
    '<div style="color-scheme:dark;font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:44px 30px;background:#1E1A17;color:#E8E1D6;">' +
      '<div style="text-align:center;margin-bottom:28px;"><img src="' + CFG.RAW + 'email-logo-gold.png" alt="MOMENT EDIT — Private Wedding Studio" width="210" style="display:block;width:210px;max-width:62%;height:auto;margin:0 auto;border:0;"></div>' +
      '<div style="width:40px;height:1px;background:#C9A977;margin:24px auto;"></div>' +
      '<p style="font-size:15px;line-height:1.85;font-weight:300;text-align:center;color:#E8E1D6;">' + who + ' 님,<br>두 분의 청첩장이 준비되었습니다.</p>' +
      '<p style="font-size:13px;line-height:1.8;color:#B8AE9F;text-align:center;margin:-2px 0 0;">아래 링크가 <span style="color:#D8B48C;font-weight:600;">그대로 완성된 청첩장</span>이에요.<br>따로 만드실 것 없이 이 링크를 그대로 공유하시면 됩니다.</p>' +
      '<div style="background:#2A241F;padding:22px 20px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;margin:24px 0;">' + links + '</div>' +
      (hasQr ? '<div style="text-align:center;margin:4px 0 24px;"><img src="cid:qrDigital" alt="라이브(입장) 페이지 QR" width="150" style="width:150px;height:150px;display:block;margin:0 auto;border:0;border-radius:2px;"><div style="font-size:12px;color:#B8AE9F;margin-top:12px;line-height:1.7;"><span style="color:#D8B48C;font-weight:600;">라이브(입장) 페이지 QR</span><br>종이 청첩장·인쇄물에 넣으면, 하객이 스캔해 바로 입장할 수 있어요.<br>QR을 길게(꾹) 누르면 이미지로 저장할 수 있어요.</div></div>' : '') +
      '<p style="font-size:13px;line-height:1.9;color:#B8AE9F;">한 번 열어보시고 이름·날짜·계좌에 오타가 없는지 확인해 주세요.<br>' + editNote + '</p>' +
      '<div style="text-align:center;margin-top:32px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#C9A977;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:14px;font-size:10px;color:#7A7165;">Moment Edit · contact@momentedit.kr</div></div>' +
    '</td></tr></table></body></html>';
}

// ============== 구글폼 자동 생성기 (최초 1회 실행) ==============
function addFormImage(form, url, title, help) {
  var blob = null;
  for (var attempt = 0; attempt < 2 && !blob; attempt++) {
    try {
      var resp = UrlFetchApp.fetch(url, { muteHttpExceptions: true });
      if (resp.getResponseCode() === 200) { blob = resp.getBlob(); break; }
      Logger.log('  (이미지 응답 ' + resp.getResponseCode() + ': ' + (title || '') + ')');
    } catch (e) {
      Logger.log('  (이미지 fetch 오류: ' + (title || '') + ' — ' + e.message + ')');
    }
    if (attempt === 0) Utilities.sleep(800); // GitHub raw 일시 장애 대비 1회 재시도
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
    '· 첨부 이미지는 기본 문구가 들어간 완성 모습이에요. 보시며 작성하시면 됩니다.\n' +
    '· 꼭 채울 것: 이름(한글·영문) · 이메일 · 날짜 · 시간. 나머지는 모두 선택이며, 비우면 기본 문구가 들어갑니다.\n' +
    '· 이름·날짜·시간은 청첩장 곳곳(표지·예식 안내·캘린더)에 자동 반영됩니다.\n' +
    '· 인사말에서 강조할 부분은 양옆에 *별표*를 붙이면 골드로 강조됩니다. (별표 강조는 인사말에서만 작동)\n' +
    '· 온라인 청첩장은 오프라인과 다르게 쓰실 때만 입력하세요. 비우면 오프라인 내용이 그대로 쓰입니다.\n' +
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
  var timeVal = FormApp.createTextValidation().setHelpText('24시간 형식으로, 콜론(:)을 넣어주세요. 예) 14:00').requireTextMatchesPattern('^([01]?\\d|2[0-3]):[0-5]\\d$').build();
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
  req('결혼식 날짜', '예) 2026-10-24 (연-월-일, 월·일은 두 자리)').setValidation(FormApp.createTextValidation().setHelpText('예: 2026-10-24 (월·일을 두 자리로 적어주세요)').requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식으로 콜론(:)을 넣어주세요. 예) 14:00').setValidation(timeVal);

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
  var exists = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'onCoupleFormSubmit'; });
  if (!exists) ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  try { PropertiesService.getScriptProperties().setProperty(CFG.PROP_FORM_URL, form.getPublishedUrl()); } catch (_p) {}

  Logger.log('폼 v2 생성 완료 (6단계)\n  작성 URL: %s\n  편집 URL: %s\n  트리거: %s\n  ⚠️ 구 폼 삭제 + momentedit.kr/form 단축주소 갱신 필요.',
    form.getPublishedUrl(), form.getEditUrl(), exists ? '이미 있음' : '새로 등록');
}
