/**
 * Moment Edit · 자동화 1단계 — 구글폼 → Couples 시트 자동 등록 + URL 자동 조립 + 부부 자동 메일
 * ──────────────────────────────────────────────────────────────────────────
 * 목적: 부부(또는 미쿠 감독)가 구글폼을 한 번 작성하면, 이 스크립트가
 *       Couples 시트에 행을 자동으로 채우고, 디지털 참석(온라인)·가족 청첩장 URL을 만들고,
 *       제출 즉시 부부 이메일로 그 URL을 자동 발송한다.
 *       → 청첩장 운영은 "폼 하나"로 자동화. 사람이 신경 쓸 건 예식 당일 영상(Vimeo)뿐.
 *
 * ──────────────────────────────────────────────────────────────────────────
 * [v14 개정 · 2026.05.25]
 *  · 08 기본 한마디를 담백·문학적 톤으로 교체(신랑 "특별하지 않은 하루도, 함께라 충분합니다." /
 *    신부 "사랑한다는 말보다, 더 오래 곁에 있겠습니다.") — hydrate 기본값·폼 예시·갤러리 DATA 공통.
 *  · 안내 이미지 setWidth(300) 제거 — 원래 크기로 복귀.
 *
 * [v13 개정 · 2026.05.25]
 *  · 디자인 선택지 라벨 "01번 청첩장" → "01번"로 단축(#4).
 *  · 02·08 전용 질문을 "디지털 디자인" 선택에 따라서만 노출(항상 노출 → 조건부, #5).
 *    ※ 가족만 02·08인 경우엔 기본 문구가 들어감(폼은 EITHER-OR 조건 표시 불가).
 *  · 계좌 게이트 중복 안내 제거(#1) · 08 안내 자연스럽게(#6) · 마지막 페이지 줄바꿈/문구 정리(#8).
 *  · 폼 안내 이미지 표시 폭 축소(setWidth 300, #2).
 *
 * [v12 개정 · 2026.05.25]
 *  · 디자인 선택지 라벨을 "01번 청첩장" 형식으로(가족·온라인 공통). 제출값은 숫자만 추출해 동일.
 *  · 08을 "자기소개" → "전하는 한마디(다짐·마음·소감)" 컨셉으로 변경(질문/안내/MAP 키).
 *    프리뷰 더미 bio를 비워 폼 기본 문구(DEFAULT_*_BIO)와 일치시킴(라이프스타일 문구 제거).
 *
 * [v11 개정 · 2026.05.25]
 *  · 직접 작성 인사말에서 *별표*로 감싼 부분을 강조(.em)로 표시 — 전 16개 디자인 공통(shared/hydrate.js).
 *    폼 인사말 안내에 마커 사용법·예시 추가. (모든 디자인이 .em 정의 확인됨)
 *
 * [v10 개정 · 2026.05.25]
 *  · 폼 안내 이미지 슬롯 도입(addFormImage 헬퍼). 각 위치에 CFG 값(URL/드라이브 파일ID) 넣으면 표시:
 *    IMG_PARENT_HELP(혼주위치)·IMG_INVITE(인사말)·IMG_QUOTE_02·IMG_BIO_08·IMG_ENVELOPE·IMG_QR_LIVE.
 *    비우면 미표시. 드라이브 파일ID로 넣으면 폼 재생성해도 유지.
 *  · 프리뷰 더미 보강: 부모님(이재환·최미경/정영석·박윤희), 08 자기소개 라이프스타일 문구.
 *
 * [v9 개정 · 2026.05.25]
 *  · 프리뷰 더미를 이서준·정하윤으로 통일(shared/hydrate.js SAMPLE — 전 디자인 공통).
 *  · 안내 문구 줄내림 정리(02·08 예시, 가족·계좌·인사말 등 긴 안내문).
 *
 * [v8 개정 · 2026.05.25]
 *  · 'QR만 받을게요' 선택지를 가족 디자인 → 디지털 게이트로 이동(라이브 입장 QR 의미에 맞게).
 *    선택 시 designOnline 공백 + digitalAttendance='QR'로 기록.
 *  · (버그수정) 가족에서 02·08을 골라도 대표문구·자기소개를 받도록 두 전용 질문을 항상 노출(선택).
 *    온라인 디자인의 02→문구·08→소개 분기를 제거하고 pbOnlineDesign→pbQuote→pbBio→pbFinal 순서로.
 *  · 02·08 전용 질문에 기본 문구 예시 표기(이미지 대신). 폼 인트로 줄바꿈 정리.
 *
 * [v7 개정 · 2026.05.25]
 *  · 08 자기소개(BIO): 비우면 숨김 → 디자인 기본 소개 문구 표시로 변경(shared/hydrate.js).
 *    02 대표문구와 동일 정책. cover-08·family-08 공통 적용. 폼 안내도 "기본 문구"로 수정.
 *  · 혼주 안내 이미지 소스를 URL 또는 구글 드라이브 파일 ID 모두 지원(CFG.IMG_PARENT_HELP).
 *
 * [v6 개정 · 2026.05.25]
 *  · 폼 인트로에 갤러리 링크 추가. 02/08 질문 본문의 미리보기 URL 제거(페이지 머리말에 이미 있음).
 *  · 혼주 게이트에 안내 이미지 자동 첨부(CFG.IMG_PARENT_HELP에 URL 넣으면 ImageItem로 삽입).
 *  · 가족 "QR만" 선택지를 "디지털 참석 입장 QR만 받을게요 (직접 제작용)"으로 명확화(라이브 페이지 QR).
 *  · 08 자기소개=비우면 숨김(hydrate.js 확인), 02 대표문구=비우면 기본 — 문구 그대로 유지.
 *  · 마지막 페이지에서 불필요한 "뒤로 안내" 문장 제거.
 *
 * [v5 개정 · 2026.05.25]
 *  · 부부 자동 메일: 제출 즉시 부부 이메일로 청첩장 URL 발송(sendCoupleEmail).
 *    "수정하려면 폼 다시 작성" 안내 포함 → 고객이 직접 수정(같은 이름·날짜면 같은 행 갱신).
 *  · 혼주(부모) 질문 분리: "인사말 성함 표시" / "계좌 표시"를 각각 독립 질문+분기로.
 *    → greeting/envelopeShowParents를 따로 산출(시트의 두 표시 영역과 1:1).
 *  · 가족 디자인에 "디지털 참석 QR만 제공 희망" 선택지 추가(가족 카드 미발행 의사).
 *  · 02 대표문구·08 자기소개 질문에 해당 디자인 미리보기 URL 안내.
 *  · (v4) 용어 "디지털 참석 청첩장" 통일 · 디지털 게이트로 온라인 미발행 시 디자인 건너뜀.
 *  · 예식ID 자동 생성(영문이름 첫 글자+MMDD, 충돌 시 -2,-3). 계좌: 본인 분리(J~M)/부모 한 칸(P~S).
 *  · 캐시 무효화: 편지 시스템 v3.4 getCouple 캐시(TTL 600s)를 제출 후 비워 즉시 반영.
 *
 * [설치] 이 파일을 Apps Script 새 .gs로 붙여넣고 createCoupleForm() 1회 실행 →
 *   폼 생성 + 응답 시트 연결 + 제출 트리거 등록 + 폼 URL 저장(자동메일 안내용).
 *   ⚠️ 구 폼이 있으면 삭제. 분기(혼주 성함/계좌, 디지털 게이트, 02/08)는 라이브에서 직접 확인.
 *   ⚠️ 자동 메일은 contact@(huijun 별칭)로 발송 — Gmail 권한은 편지 시스템에서 이미 승인됨.
 */

// ─────────────────────── 배포 기록 (Deployment) ───────────────────────
// 2026-05-25 · 폼 v3(폼ID 1QXColZhh4Vz87dfiUXR6XnflcP-WQWPpGNHgDjhSBXc) → v4 → v5.
//             createCoupleForm() 재실행 시마다 새 폼 생성 → 이전 폼은 삭제.
//             작성(viewform) 링크는 공개 저장소에 적지 않음(스팸 방지) — 비공개 보관.

// ============================ CONFIG ============================
var CFG = {
  SHEET_NAME: 'Couples',
  HEADER_ROW: 3,
  DATA_START_ROW: 4,
  SITE_BASE: 'https://momentedit.kr',
  CACHE_KEY_PREFIX: 'couple_',                 // 편지 시스템 v3.4 getCouple 캐시 키와 동일
  STUDIO_EMAIL: 'contact@momentedit.kr',       // 자동 메일 발신자(huijun 별칭) — 편지 시스템과 동일

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
    '신랑이 전하는 한마디 (08 Noir 전용)': 'groomBio',
    '신부가 전하는 한마디 (08 Noir 전용)': 'brideBio'
  },

  COL_DESIGN_ONLINE: 'designOnline',
  COL_DESIGN_FAMILY: 'designFamily',
  COL_DIGITAL: 'digitalAttendance',
  COL_GREETING: 'greetingShowParents',
  COL_ENVELOPE: 'envelopeShowParents',

  Q_DESIGN_ONLINE: '디지털 참석 청첩장 디자인 번호',
  Q_DESIGN_FAMILY: '가족 청첩장 디자인 번호',
  Q_ONLINE_GATE: '디지털 참석 청첩장을 만드시겠어요?',
  Q_GREET_GATE: '인사말에 혼주(부모님) 성함을 넣으시겠어요?',
  Q_ENVELOPE_GATE: '마음 전하실 곳(계좌)에 부모님 계좌를 넣으시겠어요?',

  PROP_FORM_URL: 'FORM_PUBLISHED_URL',         // 자동 메일의 "다시 작성" 안내에 쓰는 폼 URL

  // 폼 안내 이미지(선택) — 비우면 해당 위치에 이미지 없음.
  // ※ momentedit.kr은 서버측 fetch(403 차단)라, 차단 없는 GitHub raw 주소(공개 저장소)를 사용.
  //    이미지 갱신 시 assets/* 를 main에 머지하면 raw가 자동 반영(최대 몇 분 캐시).
  IMG_PARENT_HELP: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/form-parents.png',   // 혼주 "자녀 소개" 위치
  IMG_INVITE: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/form-invite.png',         // 인사말 — 01 기본 예시
  IMG_QUOTE_02: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/form-quote-02.png',     // 02 대표문구 예시
  IMG_BIO_08: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/form-bio-08.png',         // 08 한마디 예시
  IMG_ENVELOPE: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/form-envelope.png',     // 마음 전하실 곳 예시
  IMG_QR_LIVE: 'https://raw.githubusercontent.com/gtrddrt7706-cpu/momentedit-site/main/assets/form-live.png'           // 디지털 입장 QR/라이브 예시
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

    // 2) 디지털 참석 청첩장 게이트 → 만들 때만 디자인·디지털 기록
    //    'QR만 받을게요' 선택 시: 온라인 청첩장 미발행(designOnline 공백) + digitalAttendance='QR'로 표기
    var onlineAns = get(CFG.Q_ONLINE_GATE);
    var makeOnline = /QR/i.test(onlineAns) ? 'QR' : ynShow(onlineAns);
    var designOnline = (makeOnline === 'Y') ? pad2(get(CFG.Q_DESIGN_ONLINE)) : '';
    var designFamily = pad2(get(CFG.Q_DESIGN_FAMILY));    // "발행 안 함" → 숫자 없음 → ''
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_ONLINE, designOnline);
    writeCell(sheet, colOf, rowNum, CFG.COL_DESIGN_FAMILY, designFamily);
    writeCell(sheet, colOf, rowNum, CFG.COL_DIGITAL, makeOnline);

    // 3) 혼주 표기 — 인사말 성함 / 계좌 표시를 각각 독립 산출
    writeCell(sheet, colOf, rowNum, CFG.COL_GREETING, ynShow(get(CFG.Q_GREET_GATE)));
    writeCell(sheet, colOf, rowNum, CFG.COL_ENVELOPE, ynShow(get(CFG.Q_ENVELOPE_GATE)));

    // 4) 캐시 무효화 (재제출 즉시 반영)
    try { CacheService.getScriptCache().remove(CFG.CACHE_KEY_PREFIX + eventId); } catch (_c) {}

    // 5) URL 계산 — liveUrl·familyUrl 열은 시트 ARRAYFORMULA가 소유(스크립트 미기록)
    var liveUrl = designOnline ? (CFG.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + encodeURIComponent(eventId)) : '';
    var familyUrl = designFamily ? (CFG.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + encodeURIComponent(eventId)) : '';
    Logger.log('[OK] %s · row %s\n  digital: %s\n  family: %s',
      eventId, rowNum, liveUrl || '(미발행)', familyUrl || '(미발행)');

    // 6) 부부에게 URL 자동 이메일 (메일 실패가 시트 기록을 막지 않도록 try/catch)
    try {
      sendCoupleEmail(get('신랑 이메일'), get('신부 이메일'),
        get('신랑 한글 이름'), get('신부 한글 이름'), liveUrl, familyUrl);
    } catch (mailErr) {
      Logger.log('  (이메일 발송 실패: ' + mailErr.message + ')');
    }

    // (선택·2단계) 솔라피 알림톡 — 카카오 채널 준비 후 sendKakaoLinks 구현·호출
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

// "Lee Min Ho","Choi Yu Jin","2026-08-23" → "lmh-cyj-0823"
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

// 토글: "안 함/미표시/숨김/아니/no/n/off"류 → 'N', 그 외(네/표시/기본/빈값) → 'Y'
function ynShow(answer) {
  return /(안\s*함|미표시|숨김|제외|빼|아니|off|^\s*no\s*$|^\s*n\s*$)/i.test(String(answer || '').trim()) ? 'N' : 'Y';
}

// ===================== 부부 URL 자동 이메일 =====================
function sendCoupleEmail(groomEmail, brideEmail, groomName, brideName, liveUrl, familyUrl) {
  var to = [groomEmail, brideEmail]
    .filter(function (em) { return em && em.indexOf('@') !== -1; })
    .join(',');
  if (!to) { Logger.log('  (수신 이메일 없음 — 메일 건너뜀)'); return; }
  if (!liveUrl && !familyUrl) { Logger.log('  (URL 없음 — 메일 건너뜀)'); return; }

  var formUrl = '';
  try { formUrl = PropertiesService.getScriptProperties().getProperty(CFG.PROP_FORM_URL) || ''; } catch (_p) {}

  GmailApp.sendEmail(to, '[Moment Edit] 두 분의 청첩장이 준비되었습니다', '', {
    htmlBody: buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, formUrl),
    name: 'Moment Edit',
    from: CFG.STUDIO_EMAIL
  });
  Logger.log('  (이메일 발송 → ' + to + ')');
}

function buildCoupleEmailHtml(groomName, brideName, liveUrl, familyUrl, formUrl) {
  var esc = function (s) {
    return String(s || '').replace(/[&<>"']/g, function (m) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
    });
  };
  var who = (groomName && brideName) ? (esc(groomName) + ' · ' + esc(brideName)) : '두 분';
  var row = function (label, sub, url) {
    return '<div style="margin:14px 0;">' +
      '<div style="font-size:13px;color:#5A554C;margin-bottom:6px;">' + label +
      '<span style="color:#9a8f7f;font-size:12px;"> · ' + sub + '</span></div>' +
      '<a href="' + url + '" style="display:inline-block;word-break:break-all;font-size:13px;color:#6B2A24;">' + url + '</a>' +
      '</div>';
  };
  var links = '';
  if (liveUrl) links += row('디지털 참석 청첩장', '일반 하객용', liveUrl);
  if (familyUrl) links += row('가족 청첩장', '가족·가까운 분들께', familyUrl);

  var editNote = formUrl
    ? '내용을 고치고 싶으시면 <a href="' + formUrl + '" style="color:#6B2A24;">이 폼을 다시 작성</a>해 주세요. 같은 성함·날짜로 제출하시면 자동으로 갱신됩니다.'
    : '내용을 고치고 싶으시면 처음 작성하신 폼을 다시 제출해 주세요(같은 성함·날짜면 자동 갱신).';

  return '' +
    '<div style="font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:44px 30px;background:#FAFAF8;color:#3d3d3a;">' +
      '<div style="text-align:center;margin-bottom:28px;">' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;letter-spacing:0.34em;">MOMENT&nbsp;EDIT</div>' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:10px;letter-spacing:0.3em;color:#B89A75;margin-top:8px;">PRIVATE WEDDING STUDIO</div>' +
      '</div>' +
      '<div style="width:40px;height:1px;background:#B89A75;margin:24px auto;"></div>' +
      '<p style="font-size:15px;line-height:1.85;font-weight:300;text-align:center;">' + who + ' 님,<br>두 분의 청첩장이 준비되었습니다.</p>' +
      '<div style="background:#fff;padding:22px 20px;border:1px solid rgba(0,0,0,0.06);border-radius:2px;margin:24px 0;">' + links + '</div>' +
      '<p style="font-size:13px;line-height:1.9;color:#5A554C;">한 번 열어보시고 이름·날짜·계좌에 오타가 없는지 확인해 주세요.<br>' + editNote + '</p>' +
      '<div style="text-align:center;margin-top:32px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;color:#B89A75;">Focus on the Essence, Record the Truth.</div>' +
      '<div style="text-align:center;margin-top:14px;font-size:10px;color:#aaa;">Moment Edit · contact@momentedit.kr</div>' +
    '</div>';
}

// 폼 안내 이미지 1장 삽입(선택) — src는 사이트 공개 URL 또는 구글 드라이브 파일 ID.
// addImageItem은 폼 끝에 추가되므로, 원하는 위치(페이지/질문) 바로 옆에서 호출한다. 비우면 아무것도 안 함.
function addFormImage(form, src, title, help) {
  if (!src) return;
  try {
    var blob = /^https?:\/\//i.test(src)
      ? UrlFetchApp.fetch(src).getBlob()
      : DriveApp.getFileById(src).getBlob();
    var it = form.addImageItem().setTitle(title || '예시 이미지').setImage(blob);
    if (help) it.setHelpText(help);
  } catch (e) { Logger.log('  (이미지 첨부 실패: ' + (title || '') + ' — ' + e.message + ')'); }
}

// ============== 구글폼 자동 생성기 (최초 1회 실행) ==============
function createCoupleForm() {
  var form = FormApp.create('Moment Edit · 청첩장 정보');
  form.setDescription(
    '두 분의 결혼을 진심으로 축하드립니다.\n\n' +
    '먼저 어떤 청첩장인지 둘러보고 싶으시면\n' +
    '→ momentedit.kr/invitation-gallery.html\n\n' +
    '청첩장에 담길 내용을 받습니다.\n' +
    '적어주신 그대로 청첩장에 들어갑니다.\n\n' +
    '필요한 항목만 채우셔도 돼요.\n' +
    '선택 항목을 비우면 가장 어울리는 기본값으로 들어갑니다.\n\n' +
    '제출하시면 완성된 청첩장 링크를 이메일로 보내드립니다.\n\n' +
    '※ 식장 정보는 따로 받지 않습니다.\n' +
    '   (예식은 모먼트 에디트 스튜디오에서 진행됩니다.)'
  );
  form.setCollectEmail(false);
  form.setProgressBar(true);
  form.setAllowResponseEdits(true);
  form.setConfirmationMessage('감사합니다! 입력하신 내용으로 청첩장을 준비해, 완성 링크를 이메일로 보내드릴게요. 수정하실 내용이 있으면 받으신 메일의 안내대로 폼을 다시 작성해 주세요.');

  var designs = ['01', '02', '03', '04', '05', '06', '07', '08'];
  var designLabels = designs.map(function (n) { return n + '번'; });  // "01번" … (제출값에서 숫자만 추출)
  var GALLERY = '갤러리에서 마음에 드신 번호를 골라주세요. → momentedit.kr/invitation-gallery.html';

  var req = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(true); if (help) it.setHelpText(help); return it; };
  var opt = function (title, help) { var it = form.addTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var optPara = function (title, help) { var it = form.addParagraphTextItem().setTitle(title).setRequired(false); if (help) it.setHelpText(help); return it; };
  var nameVal = FormApp.createTextValidation()
    .setHelpText('성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Min Ho')
    .requireTextMatchesPattern('^\\S+(\\s+\\S+)+$').build();

  // ── 페이지 1 · 두 분 정보 ──
  form.addSectionHeaderItem().setTitle('두 분 정보').setHelpText('두 분의 성함과, 연락받으실 이메일을 적어주세요.');
  req('신랑 한글 이름', '예) 이민호');
  req('신부 한글 이름', '예) 최유진');
  req('신랑 영문 이름', '성과 이름을 한 칸씩 띄어 적어주세요. 예) Lee Min Ho').setValidation(nameVal);
  req('신부 영문 이름', '성과 이름을 한 칸씩 띄어 적어주세요. 예) Choi Yu Jin').setValidation(nameVal);
  req('신랑 이메일', '완성된 청첩장 링크와 하객 편지가 도착할 주소예요.');
  req('신부 이메일', '완성된 청첩장 링크와 하객 편지가 도착할 주소예요.');

  // ── 페이지 2 · 예식 일정 ──
  form.addPageBreakItem().setTitle('예식 일정');
  req('결혼식 날짜', '예) 2026-08-23 (연-월-일)')
    .setValidation(FormApp.createTextValidation().setHelpText('예: 2026-08-23')
      .requireTextMatchesPattern('^\\d{4}-\\d{2}-\\d{2}$').build());
  req('결혼식 시간', '24시간 형식으로 적어주세요. 예) 14:00');

  // ── 페이지 3 · 본인 계좌 ──
  form.addPageBreakItem().setTitle('마음 전하실 곳 · 계좌').setHelpText('두 분 계좌는 은행과 번호를 나눠 적어주세요.');
  req('신랑 은행', '예) 하나은행');
  req('신랑 계좌번호', '예) 222-456-789012');
  req('신부 은행', '예) 우리은행');
  req('신부 계좌번호', '예) 333-456-789012');

  // ── 페이지 4 · 인사말 혼주 성함 게이트(독립) ──
  var pbGreetGate = form.addPageBreakItem().setTitle('인사말 · 혼주 성함');
  var gateGreet = form.addMultipleChoiceItem().setTitle(CFG.Q_GREET_GATE).setRequired(true)
    .setHelpText('청첩장 인사말 아래 "자녀 소개" 부분에 혼주(부모님) 성함을 넣을지 정해주세요.');
  addFormImage(form, CFG.IMG_PARENT_HELP, '표시 위치 예시', '인사말 아래 "자녀 소개" 부분에 이렇게 들어갑니다.');

  // ── 페이지 4a · 혼주 성함 입력 ──
  var pbNames = form.addPageBreakItem().setTitle('혼주(부모님) 성함');
  opt('신랑 혼주(부모님)', '아버지 · 어머니 순. 예) 이정환 · 김선미');
  opt('신부 혼주(부모님)', '예) 최영수 · 박미경');

  // ── 페이지 5 · 계좌 부모 표시 게이트(독립) ──
  var pbEnvGate = form.addPageBreakItem().setTitle('마음 전하실 곳 · 부모님 계좌');
  var gateEnv = form.addMultipleChoiceItem().setTitle(CFG.Q_ENVELOPE_GATE).setRequired(true)
    .setHelpText('위 인사말 단계의 성함 표시와 별개로 선택하실 수 있어요.');
  addFormImage(form, CFG.IMG_ENVELOPE, '예시 — 마음 전하실 곳', '부모님 계좌를 넣으면 청첩장에 이렇게 표시됩니다.');

  // ── 페이지 5a · 부모 계좌 입력 ──
  var pbAccounts = form.addPageBreakItem().setTitle('부모님 계좌')
    .setHelpText('은행과 번호를 한 칸에 적어주세요. 예금주명은 위에서 적으신 혼주 성함을 사용합니다.');
  opt('신랑 아버지 계좌 (은행 번호)', '예) 국민 110-123-456789');
  opt('신랑 어머니 계좌 (은행 번호)', '예) 신한 220-456-123789');
  opt('신부 아버지 계좌 (은행 번호)', '예) 농협 351-234-567890');
  opt('신부 어머니 계좌 (은행 번호)', '예) 카카오뱅크 3333-12-3456789');

  // ── 페이지 6 · 인사말 ──
  var pbInvite = form.addPageBreakItem().setTitle('인사말 · 선택');
  addFormImage(form, CFG.IMG_INVITE, '예시 — 기본 인사말 (디자인 01)', '비워두시면 이런 느낌의 기본 인사말이 자동으로 들어갑니다.');
  optPara('인사말 (직접 작성)', '직접 쓰신 인사말이 청첩장에 그대로 들어갑니다.\n강조하고 싶은 부분을 *별표*로 감싸면 포인트 색으로 표시돼요.  예) 조용한 자리에서 *평생의 약속*을 건네기로 했습니다.\n비우면 고르신 디자인에 어울리는 기본 인사말이 자동으로 담깁니다.');

  // ── 페이지 7 · 가족 청첩장 ──
  var pbFamily = form.addPageBreakItem().setTitle('가족 청첩장')
    .setHelpText('가족·가까운 분들께 따로 보내는 청첩장이에요. 식장 약도가 자동 포함됩니다(모먼트 스튜디오 고정).');
  form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_FAMILY).setRequired(false)
    .setChoiceValues(designLabels.concat(['발행 안 함']))
    .setHelpText(GALLERY + '\n(디지털 참석 청첩장과 같은 번호여도, 달라도 됩니다.)\n' +
      '가족 청첩장이 필요 없으시면 "발행 안 함"을 골라주세요.');

  // ── 페이지 8 · 디지털 참석 청첩장 게이트 ──
  var pbOnlineGate = form.addPageBreakItem().setTitle('디지털 참석 청첩장 (온라인 하객용)');
  var gateOnline = form.addMultipleChoiceItem().setTitle(CFG.Q_ONLINE_GATE).setRequired(true)
    .setHelpText('멀리 못 오시는 분들도 온라인으로 함께하고, 하객 편지·마음 전하실 곳이 담기는 일반 하객용 청첩장이에요.\n' +
      '청첩장을 직접 제작하셔서 "디지털 참석 입장 QR"(라이브 페이지로 연결되는 QR)만 필요하시면 세 번째를 골라주세요.');
  addFormImage(form, CFG.IMG_QR_LIVE, '예시 — 디지털 참석 · 입장 QR', '디지털 참석 청첩장과 입장 QR(라이브 페이지)은 이런 모습이에요.');

  // ── 페이지 9 · 디지털 참석 청첩장 디자인 (분기) ──
  var pbOnlineDesign = form.addPageBreakItem().setTitle('디지털 참석 청첩장 디자인').setHelpText(GALLERY);
  var designItem = form.addMultipleChoiceItem().setTitle(CFG.Q_DESIGN_ONLINE).setRequired(true);

  // ── 페이지 10 · 대표 문구 (02) ── (온라인/가족 어느 쪽이든 02를 고른 분을 위해 항상 노출·선택)
  var pbQuote = form.addPageBreakItem().setTitle('대표 문구 (Editorial · 02)')
    .setHelpText('02 Editorial 디자인 표지의 대표 문구예요. 미리보기 → momentedit.kr/i/cover-02.html\n' +
      '※ 디지털 참석 청첩장을 02 디자인으로 고르신 경우에만 나오는 항목이에요.');
  addFormImage(form, CFG.IMG_QUOTE_02, '예시 — 02 대표 문구', '02 디자인 표지의 대표 문구가 들어가는 자리예요.');
  optPara('대표 문구 (02 Editorial 전용)',
    '비우면 기본 문구가 들어갑니다.\n(기본 문구 예시 — “서로의 가장 진실한 / 순간을 기록하기로 합니다.”)');

  // ── 페이지 11 · 두 사람의 한마디 (08) ── (온라인/가족 어느 쪽이든 08을 고른 분을 위해 항상 노출·선택)
  var pbBio = form.addPageBreakItem().setTitle('두 사람의 한마디 (Noir · 08)')
    .setHelpText('08 Noir 디자인의 "두 사람" 카드에 들어가는 짧은 글이에요. 미리보기 → momentedit.kr/i/cover-08.html\n' +
      '딱딱한 자기소개보다, 서로에게 또는 와주실 분들께 전하고 싶은 따뜻한 한마디가 잘 어울려요.\n' +
      '※ 디지털 참석 청첩장을 08 디자인으로 고르신 경우에만 나오는 항목이에요.');
  addFormImage(form, CFG.IMG_BIO_08, '예시 — 08 두 사람의 한마디', '08 디자인의 "두 사람" 카드 자리예요.');
  optPara('신랑이 전하는 한마디 (08 Noir 전용)',
    '전하고 싶은 마음을 한두 문장으로 자유롭게 적어주세요.\n비우면 기본 문구가 들어갑니다.\n(기본 문구 예시 — “특별하지 않은 하루도, 함께라 충분합니다.”)');
  optPara('신부가 전하는 한마디 (08 Noir 전용)',
    '전하고 싶은 마음을 한두 문장으로 자유롭게 적어주세요.\n비우면 기본 문구가 들어갑니다.\n(기본 문구 예시 — “사랑한다는 말보다, 더 오래 곁에 있겠습니다.”)');

  // ── 페이지 12 · 마지막 확인 ──
  var pbFinal = form.addPageBreakItem().setTitle('마지막으로 — 확인 후 제출')
    .setHelpText('수고하셨어요! 위 내용으로 청첩장을 준비해, 완성 링크를 이메일로 보내드립니다.\n' +
      '다 확인하셨으면 아래 "제출"을 눌러주세요.\n' +
      '(제출 후에도 받으신 메일의 안내를 따라 폼을 다시 작성하시면 언제든 수정하실 수 있어요.)');

  // ── 분기 배선 ──
  gateGreet.setChoices([
    gateGreet.createChoice('네 — 넣을게요', pbNames),
    gateGreet.createChoice('아니요 — 넣지 않을게요', pbEnvGate)
  ]);
  // pbNames → 기본 다음(pbEnvGate)

  gateEnv.setChoices([
    gateEnv.createChoice('네 — 넣을게요', pbAccounts),
    gateEnv.createChoice('아니요 — 넣지 않을게요', pbInvite)
  ]);
  pbAccounts.setGoToPage(pbInvite);
  // pbInvite → pbFamily → pbOnlineGate (기본 다음)

  // 디지털 게이트: 만들기 / 안 만들기 / QR만. 디지털 청첩장을 안 만들면 02·08 전용 질문도 건너뜀.
  gateOnline.setChoices([
    gateOnline.createChoice('네 — 만들게요', pbOnlineDesign),
    gateOnline.createChoice('아니요 — 만들지 않을게요 (가족 청첩장만)', pbFinal),
    gateOnline.createChoice('디자인은 직접 제작할게요 · 디지털 참석 입장 QR만 받을게요', pbFinal)
  ]);
  // 02·08 전용 질문은 "디지털 디자인" 선택에 따라서만 등장(02→대표문구, 08→한마디, 그 외→건너뜀).
  // (구글폼은 "온라인 OR 가족" 동시 조건 표시가 불가 → 가족만 02·08이면 기본 문구가 들어감)
  designItem.setChoices(designLabels.map(function (lbl) {
    var n = lbl.replace(/[^0-9]/g, '');
    return designItem.createChoice(lbl, n === '02' ? pbQuote : n === '08' ? pbBio : pbFinal);
  }));
  pbQuote.setGoToPage(pbFinal);
  pbBio.setGoToPage(pbFinal);

  // 응답 연결 + 트리거 + 폼 URL 저장
  var ss = SpreadsheetApp.getActive();
  form.setDestination(FormApp.DestinationType.SPREADSHEET, ss.getId());
  var exists = ScriptApp.getProjectTriggers().some(function (t) {
    return t.getHandlerFunction() === 'onCoupleFormSubmit';
  });
  if (!exists) ScriptApp.newTrigger('onCoupleFormSubmit').forSpreadsheet(ss).onFormSubmit().create();
  try { PropertiesService.getScriptProperties().setProperty(CFG.PROP_FORM_URL, form.getPublishedUrl()); } catch (_p) {}

  Logger.log('폼 생성 완료\n  작성(응답) URL: %s\n  편집 URL: %s\n  제출 트리거: %s\n  ⚠️ 구 폼이 있으면 삭제. 분기(혼주 성함/계좌·디지털 게이트·02/08)는 라이브에서 확인.',
    form.getPublishedUrl(), form.getEditUrl(), exists ? '이미 있음' : '새로 등록');
}

// ===================== (선택) 2단계 솔라피 알림톡 =====================
// 카카오 채널 준비 후 구현. API 키는 Script Properties(SOLAPI_KEY 등)에 보관.
// function sendKakaoLinks(groomEmail, brideEmail, liveUrl, familyUrl, eventId) { ... }
