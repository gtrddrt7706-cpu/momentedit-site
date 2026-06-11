/**
 * ═══════════════════════════════════════════════════════════════
 * MOMENT EDIT · 하객 편지 시스템 v3.4
 * ═══════════════════════════════════════════════════════════════
 *
 * v3.4 업데이트 (2026.05.24):
 *  ✨ getCouple 응답을 CacheService로 캐시(TTL 600초) → 재요청 시 시트 읽기 생략(응답 빠름)
 *  ✨ URL에 &fresh=1 → 캐시 무시(편집 직후 즉시 확인용)
 *
 * v3.3 업데이트 (시트 구조 변경 · 2026.05.21):
 *  ✨ 시트 1행에 버튼/안내 영역 추가됨 → 헤더 행 인덱스 한 칸 밀려남
 *    row 1 = 버튼/안내 영역 (빈 행, 사용자가 그림 버튼 배치)
 *    row 2 = 한글 라벨
 *    row 3 = 영문 헤더 (코드용)
 *    row 4+ = 데이터
 *  ✨ HEADER_ROW_INDEX: 1 → 2 (0-indexed, row 3 = 영문 헤더)
 *  ✨ DATA_START_INDEX: 2 → 3 (0-indexed, row 4 = 첫 데이터)
 *
 * v3.2 (유지):
 *  - doGet 핸들러 확장 — getCouple 엔드포인트 추가
 *  - Couples 시트 2단 헤더(한글 라벨 + 영문 헤더) 대응
 *  - 시간(Date 객체) 자동 변환
 *  - 날짜 자동 변환
 *
 * v3.1 (유지):
 *  - 발신자(from) contact@momentedit.kr 명시
 *
 * v3 (유지):
 *  - 금지어 시트 기반 필터 (Banned 탭)
 *  - 변형 감지 (띄어쓰기/특수문자/대소문자 우회 차단)
 *  - 정규식 지원 (주민번호 등)
 *  - 차단 시 Moderation 탭에 기록
 *
 * 메일 디자인 (2026.05.26): 강제 다크모드 고정 — 기존 레이아웃 그대로,
 *  배경/카드/글자색만 다크로 전환 + color-scheme 메타로 어느 클라이언트에서도 다크 유지.
 *
 * 기본 동작:
 *  GET  ?action=getCouple&eventId=XXX → 부부 정보 JSON
 *  POST (편지 본문)                    → 금지어 검사 + 메일 발송
 * ═══════════════════════════════════════════════════════════════
 */


// ═══════════════════════════════════════════════
// CONFIG · 설정값
// ═══════════════════════════════════════════════

const SHEET_COUPLES = 'Couples';
const SHEET_MESSAGES = 'Messages';
const SHEET_MODERATION = 'Moderation';
const SHEET_BANNED = 'Banned';

const STUDIO_EMAIL = 'contact@momentedit.kr';

// 헤더 행 인덱스 (0-indexed)
// v3.3 (2026.05.21): row 1 = 버튼/안내, row 2 = 한글 라벨, row 3 = 영문 헤더 → idx 2
const HEADER_ROW_INDEX = 2;
const DATA_START_INDEX = 3;

// getCouple 응답 캐시 TTL(초) — 같은 eventId 재요청 시 시트 읽기 생략.
// 재제출 시 form-to-couple.gs가 명시적으로 무효화하지만, 무효화 실패 시 안전망으로 짧게 유지.
const COUPLE_CACHE_TTL = 60; // 1분 (재제출 즉시 반영 안전망 · 시트 읽기 부담 미미)


// ═══════════════════════════════════════════════
// ENTRY · 웹훅 엔드포인트
// ═══════════════════════════════════════════════

/**
 * GET 핸들러
 *  - action=getCouple&eventId=XXX → 부부 정보 JSON
 *  - 그 외 → 헬스체크
 */
function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || '';

    if (action === 'getCouple') {
      const eventId = String((e.parameter.eventId || '')).trim();
      if (!eventId || !/^[a-z0-9-]{3,64}$/.test(eventId)) {
        return jsonResponse({ ok: false, error: 'INVALID_EVENT_ID' });
      }

      // ── 캐시(CacheService): 같은 eventId 응답을 재사용해 시트 읽기 생략 → 응답 빨라짐 ──
      //    편집 직후 즉시 확인하려면 URL 끝에 &fresh=1 (캐시 무시).
      // view = 호출 화면(online=온라인 청첩장 /i/ · family=오프라인 /i-family/ · live=라이브). 계좌 표시 게이트를 화면별로 적용.
      const view = String((e.parameter.view || '')).trim().toLowerCase();
      const cache = CacheService.getScriptCache();
      const cacheKey = 'couple_' + eventId + '_' + (view || 'def');   // view별 계좌 노출이 다르므로 캐시 분리
      const skipCache = String((e.parameter.fresh || '')) === '1';
      if (!skipCache) {
        const hit = cache.get(cacheKey);
        if (hit) return jsonResponse(JSON.parse(hit));
      }

      const couple = getCoupleByEventIdFull(eventId, view);
      const payload = couple ? { ok: true, couple: couple } : { ok: false, error: 'COUPLE_NOT_FOUND' };
      if (couple) {
        try { cache.put(cacheKey, JSON.stringify(payload), COUPLE_CACHE_TTL); } catch (_e) {}
      }
      return jsonResponse(payload);
    }

    // 헬스체크
    return jsonResponse({
      ok: true,
      version: 'v3.4',
      message: 'Moment Edit Letter System is running.',
      endpoints: ['GET ?action=getCouple&eventId=XXX', 'POST (letter body)']
    });
  } catch (err) {
    console.error('[getCouple] ' + err.toString());
    return jsonResponse({ ok: false, error: 'INTERNAL_ERROR' });   // 외부엔 일반화 — 상세 정보 누출 방지
  }
}

/**
 * POST 핸들러 (편지 수신) — v3.1과 동일
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const eventId = String(data.eventId || '').trim().substring(0, 64);
    const guestName = String(data.guestName || '').trim().substring(0, 50);
    const relation = String(data.relation || '').trim().substring(0, 30);
    const message = String(data.message || '').trim().substring(0, 2000);
    const recipient = normalizeRecipient(data.recipient);

    if (!/^[a-z0-9-]{3,64}$/.test(eventId)) {
      return jsonResponse({ ok: false, error: 'INVALID_EVENT_ID' });
    }
    if (!guestName || !message) {
      return jsonResponse({ ok: false, error: '필수 항목이 비어 있습니다.' });
    }

    const couple = getCoupleByEventId(eventId);
    if (!couple) {
      return jsonResponse({ ok: false, error: '등록되지 않은 예식입니다.' });
    }

    // 금지어 검사
    const modResult = checkBannedWords(message);
    const needsModeration = modResult.blocked;

    appendMessage({
      eventId: eventId,
      guestName: guestName,
      relation: relation,
      message: message,
      groomName: couple.groomName,
      brideName: couple.brideName,
      moderated: needsModeration,
      recipient: recipient,
    });

    if (needsModeration) {
      appendModeration({
        eventId: eventId,
        guestName: guestName,
        message: message,
        matchedWord: modResult.word,
        category: modResult.category,
        relation: relation,
        recipient: recipient,
      });
      return jsonResponse({ ok: false, error: 'BLOCKED_CONTENT' });
    }

    sendToRecipients(couple, guestName, relation, message, recipient);
    return jsonResponse({ ok: true });

  } catch (err) {
    try {
      GmailApp.sendEmail(
        STUDIO_EMAIL,
        '[Moment Edit] 편지 시스템 오류',
        '오류: ' + err.toString() + '\n\n원본: ' + (e.postData ? e.postData.contents : 'N/A'),
        { from: STUDIO_EMAIL }
      );
    } catch (_) {}
    return jsonResponse({ ok: false, error: 'INTERNAL_ERROR' });   // 외부엔 일반화 — 상세는 위 관리자 메일/로그
  }
}


// ═══════════════════════════════════════════════
// COUPLES · 부부 정보 조회
// ═══════════════════════════════════════════════

/**
 * 편지 발송용 · 최소 정보만 조회 (v3.1 호환)
 */
function getCoupleByEventId(eventId) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_COUPLES);
  if (!sheet) throw new Error('Couples 시트를 찾을 수 없습니다.');

  const range = sheet.getDataRange().getValues();
  if (range.length <= HEADER_ROW_INDEX) return null;

  const headers = range[HEADER_ROW_INDEX].map(h => String(h).trim());
  const idxEventId = headers.indexOf('eventId');
  const idxGroomName = headers.indexOf('groomName');
  const idxBrideName = headers.indexOf('brideName');
  const idxGroomEmail = headers.indexOf('groomEmail');
  const idxBrideEmail = headers.indexOf('brideEmail');
  const idxWeddingDate = headers.indexOf('weddingDate');

  for (let i = DATA_START_INDEX; i < range.length; i++) {
    const row = range[i];
    if (String(row[idxEventId]).trim() === eventId) {
      return {
        eventId: eventId,
        groomName: String(row[idxGroomName] || '').trim(),
        brideName: String(row[idxBrideName] || '').trim(),
        groomEmail: String(row[idxGroomEmail] || '').trim(),
        brideEmail: String(row[idxBrideEmail] || '').trim(),
        weddingDate: row[idxWeddingDate] || '',
      };
    }
  }
  return null;
}

/**
 * 라이브 페이지용 · 전체 정보 조회 (17열 모두)
 *  - 시간/날짜 정규화 처리
 *  - 빈 값은 빈 문자열로 통일
 */
// 호출 화면(view)의 계좌 표시 토글이 'Y'인지 — 'N'(숨김)이면 계좌를 응답에서 비워 옵트아웃을 데이터 레벨에서도 지킨다.
//   view 미지정(레거시 직접 호출) — 어느 화면에도 표시 안 하는 계좌만 제외(하나라도 'Y'면 포함). 클라 미배포 구간 안전.
function _acctVisibleForView(c, view) {
  function yes(v) { return String(v || '').trim().toUpperCase() === 'Y'; }
  if (view === 'online') return yes(c.accountOnline);
  if (view === 'family') return yes(c.accountFamily);
  if (view === 'live')   return yes(c.accountLive);
  return yes(c.accountOnline) || yes(c.accountFamily) || yes(c.accountLive);
}

function getCoupleByEventIdFull(eventId, view) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_COUPLES);
  if (!sheet) throw new Error('Couples 시트를 찾을 수 없습니다.');

  const range = sheet.getDataRange().getValues();
  if (range.length <= HEADER_ROW_INDEX) return null;

  const headers = range[HEADER_ROW_INDEX].map(h => String(h).trim());
  const idxEventId = headers.indexOf('eventId');
  if (idxEventId === -1) {
    throw new Error('eventId 헤더를 찾을 수 없습니다. row ' + (HEADER_ROW_INDEX + 1) + '에 영문 헤더가 있는지 확인하세요.');
  }

  for (let i = DATA_START_INDEX; i < range.length; i++) {
    const row = range[i];
    if (String(row[idxEventId]).trim() !== eventId) continue;

    // 헤더별로 값 매핑 (정규화 포함)
    // 공개 getCouple 응답에서 이메일은 제외 — 청첩장 렌더에 안 쓰이는 PII이고, eventId만 알면
    // 누구나 호출 가능한 공개 엔드포인트라 불필요한 노출을 줄임. (계좌는 청첩장 표시에 필요해 유지)
    const PUBLIC_EXCLUDE = { groomEmail: true, brideEmail: true };
    const couple = {};
    headers.forEach((header, idx) => {
      if (!header) return;
      if (PUBLIC_EXCLUDE[header]) return;
      let value = row[idx];

      // 날짜 필드 정규화 → YYYY-MM-DD
      if (header === 'weddingDate') {
        value = normalizeDate(value);
      }
      // 시간 필드 정규화 → HH:MM
      else if (header === 'weddingTime') {
        value = normalizeTime(value);
      }
      // 그 외 문자열화
      else {
        value = String(value || '').trim();
      }

      couple[header] = value;
    });

    // 계좌 옵트아웃 — 이 화면(view)에서 계좌를 숨기기로 한 경우 계좌 6필드를 응답에서도 비운다(화면-데이터 일치).
    if (!_acctVisibleForView(couple, view)) {
      ['groomAccount', 'brideAccount', 'groomFatherAccount', 'groomMotherAccount', 'brideFatherAccount', 'brideMotherAccount']
        .forEach(function (k) { if (k in couple) couple[k] = ''; });
    }

    return couple;
  }

  return null;
}


// ═══════════════════════════════════════════════
// NORMALIZERS · 데이터 정규화
// ═══════════════════════════════════════════════

/**
 * 날짜 정규화 → "YYYY-MM-DD"
 *  - Date 객체     → "2026-08-23"
 *  - "2026-08-23"  → 그대로
 *  - "2026/08/23"  → "2026-08-23"
 *  - 빈 값         → ""
 */
function normalizeDate(value) {
  if (!value) return '';

  // Date 객체
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, '0');
    const d = String(value.getDate()).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // 문자열
  const s = String(value).trim();
  if (!s) return '';

  // YYYY-MM-DD 형태로 통일
  const match = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (match) {
    const y = match[1];
    const m = String(parseInt(match[2], 10)).padStart(2, '0');
    const d = String(parseInt(match[3], 10)).padStart(2, '0');
    return y + '-' + m + '-' + d;
  }

  // 파싱 실패 시 원본 반환
  return s;
}

/**
 * 시간 정규화 → "HH:MM"
 *  - "14:00"           → "14:00"
 *  - Date 객체 (시간만) → "14:00"
 *  - "오후 2:00:00"    → "14:00"  (한국어 로케일 대응)
 *  - 빈 값             → ""
 */
function normalizeTime(value) {
  if (value === '' || value === null || value === undefined) return '';

  // Date 객체 (시간 형식 자동 변환된 경우)
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    const hh = String(value.getHours()).padStart(2, '0');
    const mm = String(value.getMinutes()).padStart(2, '0');
    return hh + ':' + mm;
  }

  const s = String(value).trim();
  if (!s) return '';

  // HH:MM 또는 HH:MM:SS
  const m1 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m1) {
    const hh = String(parseInt(m1[1], 10)).padStart(2, '0');
    return hh + ':' + m1[2];
  }

  // 한국어 로케일 "오후 2:00:00"
  const m2 = s.match(/^(오전|오후)\s*(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m2) {
    let hh = parseInt(m2[2], 10);
    if (m2[1] === '오후' && hh < 12) hh += 12;
    if (m2[1] === '오전' && hh === 12) hh = 0;
    return String(hh).padStart(2, '0') + ':' + m2[3];
  }

  // 파싱 실패 시 원본 반환
  return s;
}


// ═══════════════════════════════════════════════
// HELPERS · 보조 함수들 (v3.1 그대로)
// ═══════════════════════════════════════════════

function normalizeRecipient(r) {
  const v = String(r || '').toLowerCase().trim();
  if (v === 'groom' || v === 'bride' || v === 'both') return v;
  return 'both';
}

function recipientLabelKo(recipient) {
  if (recipient === 'groom') return '신랑에게만';
  if (recipient === 'bride') return '신부에게만';
  return '두 분 함께';
}

function recipientLabelEn(recipient) {
  if (recipient === 'groom') return 'To Groom';
  if (recipient === 'bride') return 'To Bride';
  return 'Together';
}

// 동시 제출 시 appendRow 경합 방지 — 락 획득 실패해도 데이터 손실보단 비잠금 기록이 안전
function withRowLock(fn) {
  const lock = LockService.getScriptLock();
  let locked = false;
  try { lock.waitLock(5000); locked = true; } catch (e) { console.warn('[lock] 획득 실패 — 비잠금 진행'); }
  try { return fn(); } finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
}

function appendMessage(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MESSAGES);
  if (!sheet) throw new Error('Messages 시트를 찾을 수 없습니다.');
  withRowLock(function () {
    sheet.appendRow([
      new Date(),
      data.eventId,
      data.groomName + ' · ' + data.brideName,
      data.guestName,
      data.relation || '(미기재)',
      data.message,
      data.moderated ? '검수 대기' : '전송됨',
      recipientLabelKo(data.recipient),
    ]);
  });
}

function appendModeration(data) {
  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_MODERATION);
  if (!sheet) throw new Error('Moderation 시트를 찾을 수 없습니다.');
  withRowLock(function () {
    sheet.appendRow([
      new Date(),
      data.eventId || '',
      data.guestName || '',
      data.relation || '',
      data.recipient || '',
      data.message || '',
      data.matchedWord || '',
      data.category || '',
      'BLOCKED',
    ]);
  });
}

function sendToRecipients(couple, guestName, relation, message, recipient) {
  const targets = [];

  if (recipient === 'groom') {
    if (couple.groomEmail && couple.groomEmail.indexOf('@') !== -1) {
      targets.push({ email: couple.groomEmail, name: couple.groomName, role: 'groom' });
    }
  } else if (recipient === 'bride') {
    if (couple.brideEmail && couple.brideEmail.indexOf('@') !== -1) {
      targets.push({ email: couple.brideEmail, name: couple.brideName, role: 'bride' });
    }
  } else {
    if (couple.groomEmail && couple.groomEmail.indexOf('@') !== -1) {
      targets.push({ email: couple.groomEmail, name: couple.groomName, role: 'groom' });
    }
    if (couple.brideEmail && couple.brideEmail.indexOf('@') !== -1) {
      targets.push({ email: couple.brideEmail, name: couple.brideName, role: 'bride' });
    }
  }

  if (targets.length === 0) {
    GmailApp.sendEmail(
      STUDIO_EMAIL,
      '[Moment Edit] 수신자 이메일 누락',
      '예식 ID ' + couple.eventId + '의 수신자 이메일이 없습니다.\n' +
      '수신 대상: ' + recipientLabelKo(recipient) + '\n\n' +
      '하객: ' + guestName + '\n메시지: ' + message,
      { from: STUDIO_EMAIL }
    );
    return;
  }

  let subjectPrefix = '';
  if (recipient === 'groom') subjectPrefix = '[To Groom] ';
  else if (recipient === 'bride') subjectPrefix = '[To Bride] ';

  const subject = subjectPrefix + guestName + '님이 ' +
    (recipient === 'both' ? '두 분께' : recipient === 'groom' ? '신랑님께' : '신부님께') +
    ' 마음을 전했습니다';

  for (const t of targets) {
    const htmlBody = buildEmailHtml(couple, guestName, relation, message, recipient, t.role);
    GmailApp.sendEmail(t.email, subject, '', {
      htmlBody: htmlBody,
      name: 'Moment Edit',
      from: STUDIO_EMAIL,
    });
  }
}

/**
 * 편지 메일 본문 — 강제 다크모드 고정 (레이아웃은 기존 그대로)
 *  · 풀블리드 <table bgcolor> + color-scheme 메타 → 어느 클라이언트에서도 흰 배경 안 뜨고 다크 유지
 *  · 배경 #1E1A17 / 본문 #E8E1D6 / 카드 #2A241F / 골드 포인트 #C4AD8F(기존 유지)
 */
function buildEmailHtml(couple, guestName, relation, message, recipient, role) {
  const escapedMessage = escapeHtml(message);
  const escapedGuest = escapeHtml(guestName);
  const escapedRelation = relation ? escapeHtml(relation) : '';

  let privateBadge = '';
  let titleText = '두 분의 기록이 되어줄 편지가<br>새로 도착했습니다.';

  if (recipient === 'groom') {
    privateBadge = '<div style="display:inline-block;padding:6px 14px;border:1px solid #C4AD8F;border-radius:999px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:10px;letter-spacing:0.24em;color:#C4AD8F;text-transform:uppercase;margin-bottom:24px;">Private · To Groom</div>';
    titleText = '신랑님께 전해진<br>사적인 편지입니다.';
  } else if (recipient === 'bride') {
    privateBadge = '<div style="display:inline-block;padding:6px 14px;border:1px solid #C4AD8F;border-radius:999px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:10px;letter-spacing:0.24em;color:#C4AD8F;text-transform:uppercase;margin-bottom:24px;">Private · To Bride</div>';
    titleText = '신부님께 전해진<br>사적인 편지입니다.';
  }

  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:dark}body{margin:0;padding:0;background:#1E1A17}</style></head>' +
    '<body style="margin:0;padding:0;background:#1E1A17;">' +
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1E1A17;width:100%;"><tr><td align="center" bgcolor="#1E1A17" style="background:#1E1A17;">' +
    '<div style="color-scheme:dark;font-family:\'Noto Serif KR\',serif;max-width:560px;margin:0 auto;padding:48px 32px;background:#1E1A17;color:#E8E1D6;">' +
      '<div style="text-align:center;margin-bottom:32px;">' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:22px;letter-spacing:0.34em;color:#EDE6DA;font-weight:500;">MOMENT&nbsp;EDIT</div>' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:10px;letter-spacing:0.3em;color:#C4AD8F;margin-top:8px;">PRIVATE WEDDING STUDIO</div>' +
      '</div>' +
      '<div style="width:40px;height:1px;background:#C4AD8F;margin:32px auto;"></div>' +
      '<div style="text-align:center;">' + privateBadge + '</div>' +
      '<div style="text-align:center;font-family:\'Noto Serif KR\',serif;font-size:15px;line-height:1.85;font-weight:300;color:#E8E1D6;margin-bottom:40px;">' +
        titleText +
      '</div>' +
      '<div style="text-align:center;margin-bottom:28px;padding:16px 0;border-top:1px solid rgba(255,255,255,0.10);border-bottom:1px solid rgba(255,255,255,0.10);">' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;letter-spacing:0.22em;color:#C4AD8F;text-transform:uppercase;margin-bottom:6px;">From</div>' +
        '<div style="font-family:\'Noto Serif KR\',serif;font-size:17px;font-weight:500;color:#E8E1D6;">' + escapedGuest + '</div>' +
        (escapedRelation ? '<div style="font-family:\'Noto Serif KR\',serif;font-size:12px;font-weight:300;color:#9C9080;margin-top:4px;">' + escapedRelation + '</div>' : '') +
      '</div>' +
      '<div style="background:#2A241F;padding:32px 28px;border:1px solid rgba(255,255,255,0.08);border-radius:2px;font-family:\'Noto Serif KR\',serif;font-size:14.5px;line-height:2;font-weight:300;color:#E8E1D6;white-space:pre-wrap;word-break:keep-all;">' +
        escapedMessage +
      '</div>' +
      '<div style="text-align:center;margin-top:40px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:11px;letter-spacing:0.08em;color:#C4AD8F;">' +
        'Focus on the Essence, Record the Truth.' +
      '</div>' +
      '<div style="text-align:center;margin-top:24px;font-size:10px;color:#7A7165;letter-spacing:0.08em;">' +
        'Moment Edit · contact@momentedit.kr' +
      '</div>' +
    '</div>' +
    '</td></tr></table></body></html>';
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// 관리자 알림 — 동일 cacheKey는 24h 1회만(스팸 방지). 비차단(try/catch).
function notifyStudioOnce(cacheKey, subject, body) {
  try {
    const c = CacheService.getScriptCache();
    if (c.get(cacheKey)) return;
    c.put(cacheKey, '1', 86400);
    GmailApp.sendEmail(STUDIO_EMAIL, subject, body, { from: STUDIO_EMAIL, name: 'Moment Edit' });
  } catch (_) {}
}


// ═══════════════════════════════════════════════
// BANNED FILTER · 금지어 필터 (v3 그대로)
// ═══════════════════════════════════════════════

function getBannedList() {
  const cache = CacheService.getScriptCache();
  const cached = cache.get('banned_list_v1');
  if (cached) { try { return JSON.parse(cached); } catch (_) {} }   // 시트 편집은 최대 600초 후 반영

  const sheet = SpreadsheetApp.getActive().getSheetByName(SHEET_BANNED);
  if (!sheet) {
    console.warn('[BannedFilter] Banned 시트를 찾을 수 없습니다.');
    return [];
  }
  const data = sheet.getDataRange().getValues();
  const list = [];
  for (let i = 1; i < data.length; i++) {
    const word = String(data[i][0] || '').trim();
    if (!word) continue;
    list.push({
      word: word,
      category: String(data[i][1] || '기타').trim(),
      type: String(data[i][2] || 'word').trim().toLowerCase()
    });
  }
  try { cache.put('banned_list_v1', JSON.stringify(list), 600); } catch (_) {}
  return list;
}

function normalizeMessage(msg) {
  const lower = String(msg).toLowerCase();
  const compact = lower.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
  return { lower: lower, compact: compact };
}

function checkBannedWords(message) {
  if (!message) return { blocked: false };

  const normalized = normalizeMessage(message);
  const bannedList = getBannedList();

  for (let i = 0; i < bannedList.length; i++) {
    const item = bannedList[i];

    if (item.type === 'regex') {
      try {
        const re = new RegExp(item.word);
        if (re.test(message)) {
          return { blocked: true, word: item.word, category: item.category };
        }
      } catch (e) {
        console.warn('[BannedFilter] 잘못된 정규식: ' + item.word);
        notifyStudioOnce('badregex_' + item.word, '[Moment Edit] ⚠️ 금지어 정규식 오류',
          'Banned 시트의 정규식 패턴이 잘못되어 무시됩니다(필터 일부 silent 미작동):\n  ' + item.word + '\n오류: ' + e.toString());
        continue;
      }
    } else {
      const wordLower = item.word.toLowerCase();
      const wordCompact = wordLower.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');

      if (normalized.lower.indexOf(wordLower) !== -1 ||
          (wordCompact && normalized.compact.indexOf(wordCompact) !== -1)) {
        return { blocked: true, word: item.word, category: item.category };
      }
    }
  }
  return { blocked: false };
}

function checkModeration(message) {
  return checkBannedWords(message).blocked;
}


// ═══════════════════════════════════════════════
// TEST · 수동 테스트용 함수
// ═══════════════════════════════════════════════

/**
 * NEW v3.2 · getCouple 엔드포인트 단위 테스트
 *  편집기 함수 드롭다운 → testGetCouple 선택 → 실행
 *  실행 로그(Ctrl+Enter)에서 결과 확인
 */
function testGetCouple() {
  console.log('═══ getCouple 테스트 ═══');

  const testCases = [
    { eventId: 'test-couple-001', label: '더미 — 존재 시 전체 정보' },
    { eventId: 'test-couple-002', label: '더미 — 존재 시 부모 정보 없음' },
    { eventId: 'nonexistent',     label: '존재하지 않는 ID (오류 케이스)' },
    { eventId: 'INVALID ID!',     label: '잘못된 형식 (거부 케이스)' },
    { eventId: '',                label: '빈 ID (오류 케이스)' },
  ];

  testCases.forEach((tc, idx) => {
    const fakeEvent = { parameter: { action: 'getCouple', eventId: tc.eventId } };
    const result = doGet(fakeEvent);
    const content = result.getContent();
    console.log((idx + 1) + '. [' + tc.label + ']');
    console.log('   eventId: "' + tc.eventId + '"');
    console.log('   결과: ' + content);
    console.log('');
  });
}

/**
 * 진단 — webhook이 어떤 스프레드시트·시트·헤더·데이터를 보는지 확인.
 * 편집기 함수 드롭다운 → diagnoseWebhookSheet 선택 → ▶ 실행 → 실행 로그 확인.
 */
function diagnoseWebhookSheet() {
  console.log('═══ Moment Edit · webhook 시트 진단 ═══');

  // 1) getActive() — webhook이 보는 스프레드시트
  let ss = null;
  try { ss = SpreadsheetApp.getActive(); } catch (e) {
    console.log('[스프레드시트] ❌ getActive() 실패: ' + e.message);
    console.log('  → 이 스크립트가 container-bound가 아닐 가능성 (standalone 스크립트).');
    console.log('  → form-to-couple.gs와 같은 GAS 프로젝트로 합쳐야 함.');
    return;
  }
  if (!ss) {
    console.log('[스프레드시트] ❌ getActive() 반환값 없음');
    return;
  }
  console.log('[스프레드시트]');
  console.log('  ID: ' + ss.getId());
  console.log('  이름: ' + ss.getName());
  console.log('  URL: ' + ss.getUrl());

  // 2) 시트 목록
  const sheets = ss.getSheets();
  console.log('[시트 목록]');
  sheets.forEach((s, i) => {
    console.log('  [' + i + '] "' + s.getName() + '" (lastRow=' + s.getLastRow() + ', lastCol=' + s.getLastColumn() + ')');
  });

  // 3) Couples 시트 존재 여부
  const sheet = ss.getSheetByName(SHEET_COUPLES);
  if (!sheet) {
    console.log('[Couples 시트] ❌ "' + SHEET_COUPLES + '" 시트 없음');
    console.log('  → 시트 이름이 정확히 "Couples" 인지 확인 (대소문자·공백 주의)');
    return;
  }
  console.log('[Couples 시트] ✅ 발견');
  console.log('  lastRow: ' + sheet.getLastRow());
  console.log('  lastCol: ' + sheet.getLastColumn());

  // 4) 헤더 행
  const range = sheet.getDataRange().getValues();
  console.log('[헤더 행 (' + (HEADER_ROW_INDEX + 1) + '행 · 0-indexed ' + HEADER_ROW_INDEX + ')]');
  if (range.length <= HEADER_ROW_INDEX) {
    console.log('  ❌ 시트에 충분한 행 없음 (range.length=' + range.length + ')');
    return;
  }
  const headers = range[HEADER_ROW_INDEX].map(h => String(h).trim());
  console.log('  컬럼 수: ' + headers.length);
  console.log('  헤더: [' + headers.join(' | ') + ']');
  const idxEventId = headers.indexOf('eventId');
  console.log('  eventId 컬럼 위치: ' + (idxEventId === -1 ? '❌ 못 찾음' : '✅ index ' + idxEventId));

  // 5) 첫 데이터 행 (DATA_START_INDEX = 0-indexed 3 = 4행)
  console.log('[첫 데이터 행 (' + (DATA_START_INDEX + 1) + '행)]');
  if (range.length <= DATA_START_INDEX) {
    console.log('  ❌ 데이터 행 없음 (시트가 비어있음)');
  } else {
    const row = range[DATA_START_INDEX];
    console.log('  컬럼 수: ' + row.length);
    if (idxEventId !== -1) {
      const evVal = String(row[idxEventId]).trim();
      console.log('  eventId 컬럼 값: "' + evVal + '" (길이=' + evVal.length + ')');
      // 일치 검사 (예: jh-km-0625와 보이지 않는 공백 차이)
      const charCodes = [];
      for (let i = 0; i < evVal.length; i++) charCodes.push(evVal.charCodeAt(i));
      console.log('  charCodes: [' + charCodes.join(',') + ']');
    }
    // 첫 5컬럼 미리보기
    console.log('  미리보기 (앞 5컬럼): [' + row.slice(0, 5).map(v => '"' + String(v) + '"').join(' | ') + ']');
  }

  // 6) 전체 데이터 행 수
  const dataRows = Math.max(0, range.length - DATA_START_INDEX);
  console.log('[전체 데이터 행 수]: ' + dataRows);

  console.log('═══ 진단 종료 ═══');
}

/**
 * 진단 — 특정 eventId로 직접 getCouple 호출 (캐시 우회).
 * 편집기에서 EVENT_ID_TO_TEST 값 변경 후 ▶ 실행.
 */
function testGetCoupleByEventId() {
  const EVENT_ID_TO_TEST = 'jh-km-0625';   // ← 여기 바꿔서 테스트
  console.log('═══ getCouple 직접 호출 — eventId: ' + EVENT_ID_TO_TEST + ' ═══');
  const fakeEvent = { parameter: { action: 'getCouple', eventId: EVENT_ID_TO_TEST, fresh: '1' } };
  const result = doGet(fakeEvent);
  console.log('응답:');
  console.log(result.getContent());
}

/**
 * 편지 발송 테스트 (v3.1 그대로)
 */
function testSendToGroom() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        eventId: 'test-couple',
        guestName: '김민준',
        relation: '신랑의 20년지기',
        recipient: 'groom',
        message: '민준아, 오랫동안 네가 얼마나 애써온지 지켜봤어. 이제 너의 사람을 만나 새로 시작하는 모습을 보니 눈물이 난다. 앞으로의 모든 날들을 진심으로 응원할게.',
      }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

function testSendToBride() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        eventId: 'test-couple',
        guestName: '박지은',
        relation: '신부의 절친',
        recipient: 'bride',
        message: '지은아, 너의 행복한 모습을 볼 수 있어서 나도 너무 행복해. 네가 가는 길 어디든 꽃길이길.',
      }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

function testSendToBoth() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        eventId: 'test-couple',
        guestName: '이상훈',
        relation: '신랑 친구',
        recipient: 'both',
        message: '민준아 지은아, 두 사람이 함께 만들어갈 시간들이 늘 서로에게 편안한 집이 되기를.',
      }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

function testModeration() {
  const fakeEvent = {
    postData: {
      contents: JSON.stringify({
        eventId: 'test-couple',
        guestName: '이상한사람',
        relation: '',
        recipient: 'groom',
        message: '씨발 이거 테스트 메시지임',
      }),
    },
  };
  const result = doPost(fakeEvent);
  Logger.log(result.getContent());
}

function testBannedFilter() {
  const testCases = [
    { msg: '결혼 축하해! 평생 행복하길 🙏', expected: false, label: '정상 축하' },
    { msg: '너희 둘 정말 잘 어울려. 오래오래 행복해', expected: false, label: '정상 편지' },
    { msg: '와 진짜 씨발 너무 잘 어울린다', expected: true, label: '욕설 포함' },
    { msg: '축하한다 개새끼야 ㅋㅋ', expected: true, label: '친근한 욕설' },
    { msg: '에이 시 발 축하한다', expected: true, label: '띄어쓰기 우회' },
    { msg: '시*발 너무 좋아', expected: true, label: '특수문자 우회' },
    { msg: '시.발.축하해', expected: true, label: '점 우회' },
    { msg: '연락처 남긴다. 900101-1234567', expected: true, label: '주민번호' },
    { msg: '빨리 이혼해라 ㅋㅋ', expected: true, label: '이혼 저주' },
  ];

  console.log('═══ 금지어 필터 테스트 (총 ' + testCases.length + '건) ═══');
  let passCount = 0;
  testCases.forEach(function(tc, idx) {
    const result = checkBannedWords(tc.msg);
    const pass = result.blocked === tc.expected;
    if (pass) passCount++;
    console.log(
      (idx + 1) + '. ' + (pass ? '✅' : '❌') +
      ' [' + tc.label + '] "' + tc.msg + '"'
    );
    console.log(
      '   기대: ' + tc.expected + ' / 결과: ' + result.blocked +
      (result.word ? ' (걸린 단어: ' + result.word + ')' : '')
    );
  });
  console.log('═══ 테스트 완료: ' + passCount + ' / ' + testCases.length + ' 통과 ═══');
}

// ───────────────────────────────────────────────────────────────────
// 가족 청첩장 빌드 메뉴 (가족청첩장빌드.gs와 연동)
// ───────────────────────────────────────────────────────────────────
function onOpen() {
  FC_addFamilyMenu();
}
