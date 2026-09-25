/**
 * Moment Edit · 통합 플랫폼 — 87 청첩장 조회 · 하객 편지 (옛 「Moment Edit Letter System」에서 옮김)
 * ──────────────────────────────────────────────────────────────────────────
 * ★[LETTER_MERGED 2026-09-25 대표 지시] 「한쪽에서 관리하고 싶은데」 「필요 없는 거 전부 끌고 오지 말고」
 *   「정상작동이 최우선이야」 — 옛 프로젝트(파일 3개 · 시트 6개)에서 지금 사이트가 실제로 부르는 것만 가져왔다.
 *
 *   가져옴  ① getCouple — 청첩장 16종(shared/hydrate.js) · 라이브(live.html) · 공유 미리보기(api/og-inv.js)
 *          ② 하객 편지 — 라이브 편지 폼(live.html) · 금지어 검수(Banned) · 기록(Messages·Moderation)
 *          ③ 영상 미등록 D-3 점검 + 예식 6개월 뒤 개인정보 파기 — 매일 07시(setupAllTriggers 가 건다)
 *          ④ 시트 옮기기 1회(letterMigrate)
 *   안 가져옴  구글폼 부부폼(마이페이지 청첩장 85_invitation 이 대체 · 사이트 어디도 /form 을 안 가리킨다 ·
 *             폼 응답은 2026-05-29 테스트뿐) · 가족청첩장 정적 빌드(2026-05-24 레거시로 정리 · BuildLogs 0건 ·
 *             가족 청첩장도 hydrate 로 그린다) · 폼 생성·진단·테스트 함수 · 시트 「설문지 응답 시트」「BuildLogs」
 *   ★되살리지 말 것 — 필요해 보이면 git 기록(automation/form-to-couple.gs 등)에서 근거와 함께 꺼낸다.
 *
 * 응답 모양은 옛 웹훅과 같다(hydrate·live·og-inv 가 그대로 읽는다) — scripts/audit/letter-sim.mjs 가 대조한다.
 * 옮기며 달라진 것(의도)
 *   · 관리자 알림은 본 프로젝트 규칙대로 _nfAdminEmail(메일 · 이모지 제거 · cc).
 *     ★notifyStudio 를 쓰지 않는다 — 본 프로젝트에선 CONFIG.SEND_ADMIN_MAIL=false 라 조용히 아무것도 안 보낸다.
 *   · 영상 점검이 Customers 를 본다 — 관리자 페이지에서 미계약·취소·노쇼로 닫은 예식은 경고가 멈춘다.
 *   · 편지 메일 텍스트본 끝의 전각 줄표(—) 제거(고객 문구 규칙).
 *   · 마이페이지 청첩장 발행이 캐시를 바로 지운다(같은 프로젝트라 가능 · 종전엔 최대 60초 옛 내용).
 */

var LT = {
  COUPLES: 'Couples', MESSAGES: 'Messages', MODERATION: 'Moderation', BANNED: 'Banned',
  HEADER_ROW: 3, DATA_START_ROW: 4,   // Couples: 1행 묶음 · 2행 한글 · 3행 영문키 · 4행부터 데이터
  CACHE_TTL: 60,                      // getCouple 응답 캐시(초) — 발행이 바로 지우고, 이건 안전망
  STUDIO_EMAIL: 'contact@momentedit.kr',
  MIGRATED_KEY: 'LETTER_MIGRATED'     // letterMigrate 가 'Y' 로 둔다
};

// 옛 Letter System 스프레드시트 — 옮기기 원본이자, 옮기기 전 임시로 읽는 곳. 주소는 INV 한 곳에만 둔다.
function _ltSrcId() { return INV.LETTER_SYSTEM_ID; }

/* [LETTER_FALLBACK] 시트는 본 스프레드시트에서 먼저 찾는다. 옮기기(letterMigrate) 전에는 옛 Letter System 을
   그대로 읽고 써서, 붙여넣기·재배포·옮기기의 순서가 어떻든 사이트가 멈추지 않는다.
   ★옮긴 뒤(LETTER_MIGRATED=Y)에 시트가 없으면 옛 데이터로 조용히 새지 않고 멈춘다 — 그게 더 빨리 드러난다. */
function _ltSheet(name) {
  // [LETTER_FALLBACK] 본 시트 먼저 · 옮기기 전에만 옛 Letter System
  var own = SpreadsheetApp.getActive().getSheetByName(name);
  if (own) return own;
  if (PropertiesService.getScriptProperties().getProperty(LT.MIGRATED_KEY) === 'Y')
    throw new Error("'" + name + "' 시트가 본 스프레드시트에 없습니다(옮기기 완료 상태) — 탭 이름을 확인하세요.");
  var sh = SpreadsheetApp.openById(_ltSrcId()).getSheetByName(name);
  if (!sh) throw new Error("'" + name + "' 시트를 찾을 수 없습니다.");
  return sh;
}

// 마이페이지 발행이 부른다 — getCouple 캐시를 바로 지워 고친 내용이 다음 열람에 보이게.
function _ltBustCouple(eventId) {
  try {
    var id = String(eventId || '').trim();
    if (!id) return;
    var keys = ['def', 'online', 'family', 'live'].map(function (v) { return 'couple_' + id + '_' + v; });
    keys.push('couple_' + id);   // 옛 키(접미 없음)
    CacheService.getScriptCache().removeAll(keys);
  } catch (e) {}
}

// 관리자 알림 — 본 프로젝트 규칙(_nfAdminEmail). dedupKey 가 있으면 24시간에 한 번.
function _ltAdminMail(subject, text, dedupKey) {
  try {
    if (dedupKey) {
      var c = CacheService.getScriptCache();
      if (c.get(dedupKey)) return;
      c.put(dedupKey, '1', 86400);
    }
    _nfAdminEmail(subject, _ltEsc(text).replace(/\n/g, '<br>'));
  } catch (e) {}
}

// ═══════════════ ① 청첩장 조회 (doGet ?action=getCouple) ═══════════════

function ltGetCouple(p) {
  // [LETTER_MERGED] 옛 웹훅 doGet 의 getCouple 갈래 그대로 — 응답 모양 불변(hydrate·live·og-inv 가 읽는다)
  try {
    var eventId = String((p && p.eventId) || '').trim();
    if (!eventId || !/^[a-z0-9-]{3,64}$/.test(eventId)) return { ok: false, error: 'INVALID_EVENT_ID' };
    // view = 호출 화면(online=온라인 /i/ · family=오프라인 /i-family/ · live=라이브). 계좌 표시 게이트를 화면별로 적용.
    var view = String((p && p.view) || '').trim().toLowerCase();
    var cache = CacheService.getScriptCache();
    var key = 'couple_' + eventId + '_' + (view || 'def');   // view 별 계좌 노출이 달라 캐시를 나눈다
    if (String((p && p.fresh) || '') !== '1') {                // &fresh=1 → 캐시 무시(편집 직후 확인용)
      var hit = cache.get(key);
      if (hit) return JSON.parse(hit);
    }
    var couple = _ltCoupleFull(eventId, view);
    var payload = couple ? { ok: true, couple: couple } : { ok: false, error: 'COUPLE_NOT_FOUND' };
    if (couple) { try { cache.put(key, JSON.stringify(payload), LT.CACHE_TTL); } catch (_e) {} }
    return payload;
  } catch (err) {
    try { console.error('[getCouple] ' + err); } catch (_) {}
    return { ok: false, error: 'INTERNAL_ERROR' };   // 외부엔 일반화 — 상세 정보 누출 방지
  }
}

// 계좌 옵트아웃 — 호출 화면(view)의 계좌 표시 토글이 'Y'일 때만 계좌를 준다.
//   ★view 미지정 호출(og-inv 등 봇·미리보기)에는 계좌를 절대 안 준다 → eventId 만 알면 계좌를 긁는 대량 수집 방지.
function _ltAcctVisible(c, view) {
  function yes(v) { return String(v || '').trim().toUpperCase() === 'Y'; }
  if (view === 'online') return yes(c.accountOnline);
  if (view === 'family') return yes(c.accountFamily);
  if (view === 'live')   return yes(c.accountLive);
  return false;
}

function _ltCoupleFull(eventId, view) {
  var sheet = _ltSheet(LT.COUPLES);
  var range = sheet.getDataRange().getValues();
  var hi = LT.HEADER_ROW - 1;
  if (range.length <= hi) return null;
  var headers = range[hi].map(function (h) { return String(h).trim(); });
  var idxEventId = headers.indexOf('eventId');
  if (idxEventId === -1) throw new Error('eventId 헤더를 찾을 수 없습니다. row ' + LT.HEADER_ROW + '에 영문 헤더가 있는지 확인하세요.');
  var tz = null;
  var tzOf = function () { return tz || (tz = sheet.getParent().getSpreadsheetTimeZone()); };

  for (var i = LT.DATA_START_ROW - 1; i < range.length; i++) {
    var row = range[i];
    if (String(row[idxEventId]).trim() !== eventId) continue;
    // 공개 응답에서 이메일은 뺀다 — 렌더에 안 쓰이는 PII 이고 eventId 만 알면 누구나 부를 수 있다.
    var PUBLIC_EXCLUDE = { groomEmail: true, brideEmail: true };
    var couple = {};
    headers.forEach(function (header, idx) {
      if (!header || PUBLIC_EXCLUDE[header]) return;
      var value = row[idx];
      if (header === 'weddingDate') value = _ltYmd(value, tzOf);
      else if (header === 'weddingTime') value = _ltHm(value, tzOf);
      else value = String(value || '').trim();
      couple[header] = value;
    });
    // [LETTER_TARGET] 주소는 숨기되 '받을 곳이 있는가'만 참/거짓으로 — 라이브 편지 폼이 받을 주소 없는 쪽을 못 고르게.
    var _gi = headers.indexOf('groomEmail'), _bi = headers.indexOf('brideEmail');
    couple.hasGroomEmail = _gi !== -1 && String(row[_gi] || '').indexOf('@') !== -1;
    couple.hasBrideEmail = _bi !== -1 && String(row[_bi] || '').indexOf('@') !== -1;
    if (!_ltAcctVisible(couple, view)) {
      ['groomAccount', 'brideAccount', 'groomFatherAccount', 'groomMotherAccount', 'brideFatherAccount', 'brideMotherAccount']
        .forEach(function (k) { if (k in couple) couple[k] = ''; });
    }
    // 라이브 영상 해시 — 라이브 화면에서만. 다른 호출(og봇·추측)에는 비워 무단 시청 차단.
    if (view !== 'live') ['vimeoId', 'vimeoHash'].forEach(function (k) { if (k in couple) couple[k] = ''; });
    return couple;
  }
  return null;
}

// 날짜 → "YYYY-MM-DD". Date 는 그 시트의 시간대로 읽는다(스크립트 시간대가 달라도 하루가 밀리지 않게).
function _ltYmd(value, tzOf) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, tzOf(), 'yyyy-MM-dd');
  }
  var s = String(value).trim();
  if (!s) return '';
  var m = s.match(/^(\d{4})[\/\-\.](\d{1,2})[\/\-\.](\d{1,2})$/);
  if (m) return m[1] + '-' + ('0' + parseInt(m[2], 10)).slice(-2) + '-' + ('0' + parseInt(m[3], 10)).slice(-2);
  return s;   // 못 읽으면 원본 그대로
}

// 시간 → "HH:MM". "오후 2:00:00" 같은 한국어 표기도 읽는다.
function _ltHm(value, tzOf) {
  if (value === '' || value === null || value === undefined) return '';
  if (Object.prototype.toString.call(value) === '[object Date]') {
    if (isNaN(value.getTime())) return '';
    return Utilities.formatDate(value, tzOf(), 'HH:mm');
  }
  var s = String(value).trim();
  if (!s) return '';
  var m1 = s.match(/^(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m1) return ('0' + parseInt(m1[1], 10)).slice(-2) + ':' + m1[2];
  var m2 = s.match(/^(오전|오후)\s*(\d{1,2}):(\d{2})(?::\d{2})?$/);
  if (m2) {
    var hh = parseInt(m2[2], 10);
    if (m2[1] === '오후' && hh < 12) hh += 12;
    if (m2[1] === '오전' && hh === 12) hh = 0;
    return ('0' + hh).slice(-2) + ':' + m2[3];
  }
  return s;
}

// ═══════════════ ② 하객 편지 (doPost action='guestLetter') ═══════════════

function ltGuestLetter(body) {
  // [LETTER_MERGED] 옛 웹훅 doPost 그대로 — 응답 문구·시트 기록·메일이 같다(scripts/audit/letter-sim.mjs 가 대조)
  try {
    var data = body || {};
    var eventId = String(data.eventId || '').trim().substring(0, 64);
    var guestName = String(data.guestName || '').trim().substring(0, 50);
    var relation = String(data.relation || '').trim().substring(0, 30);
    var message = String(data.message || '').trim().substring(0, 2000);
    var recipient = _ltRecipient(data.recipient);

    if (!/^[a-z0-9-]{3,64}$/.test(eventId)) return { ok: false, error: 'INVALID_EVENT_ID' };
    if (!guestName || !message) return { ok: false, error: '필수 항목이 비어 있습니다.' };

    var couple = _ltCoupleMin(eventId);
    if (!couple) return { ok: false, error: '등록되지 않은 예식입니다.' };

    // [LETTER_RATE] 한 예식으로 편지가 쏟아지는 것을 막는다 — 할당량과 두 분의 받은편지함을 함께 지킨다.
    var rl = _ltRateCheck(eventId);
    if (!rl.ok) return { ok: false, error: rl.error };

    // 금지어 검사 — ★본문만 보면 이름·관계 칸으로 그대로 새어 나간다(둘 다 메일에 그대로 찍힌다).
    var mod = _ltCheckBanned([guestName, relation, message].filter(Boolean).join(' \n '));

    _ltAppendMessage({
      eventId: eventId, guestName: guestName, relation: relation, message: message,
      groomName: couple.groomName, brideName: couple.brideName, moderated: mod.blocked, recipient: recipient
    });

    if (mod.blocked) {
      _ltAppendModeration({
        eventId: eventId, guestName: guestName, message: message, matchedWord: mod.word,
        category: mod.category, relation: relation, recipient: recipient
      });
      return { ok: false, error: 'BLOCKED_CONTENT' };
    }

    // [LETTER_DELIVERED] 받을 주소가 하나도 없으면 메일은 못 나간다(편지는 시트에 남고 관리자에게 알림).
    //  ok:true 만 돌려주면 하객은 '전해졌습니다'를 보고 두 분은 못 받는 상태가 된다 — delivered 로 구분한다.
    var sent = _ltSendToRecipients(couple, guestName, relation, message, recipient);
    return { ok: true, delivered: sent > 0 };
  } catch (err) {
    _ltAdminMail('[Moment Edit] 편지 시스템 오류', '오류: ' + err + '\n\n원본: ' + JSON.stringify(body || {}));
    return { ok: false, error: 'INTERNAL_ERROR' };   // 외부엔 일반화 — 상세는 관리자 메일
  }
}

// 편지 발송용 최소 정보(이메일 포함 — 이 값은 밖으로 안 나간다)
function _ltCoupleMin(eventId) {
  var range = _ltSheet(LT.COUPLES).getDataRange().getValues();
  var hi = LT.HEADER_ROW - 1;
  if (range.length <= hi) return null;
  var headers = range[hi].map(function (h) { return String(h).trim(); });
  var ix = function (h) { return headers.indexOf(h); };
  var iE = ix('eventId'), iGN = ix('groomName'), iBN = ix('brideName'), iGE = ix('groomEmail'), iBE = ix('brideEmail'), iWD = ix('weddingDate');
  for (var i = LT.DATA_START_ROW - 1; i < range.length; i++) {
    var row = range[i];
    if (String(row[iE]).trim() === eventId) {
      return {
        eventId: eventId,
        groomName: String(row[iGN] || '').trim(), brideName: String(row[iBN] || '').trim(),
        groomEmail: String(row[iGE] || '').trim(), brideEmail: String(row[iBE] || '').trim(),
        weddingDate: row[iWD] || ''
      };
    }
  }
  return null;
}

function _ltRecipient(r) {
  var v = String(r || '').toLowerCase().trim();
  return (v === 'groom' || v === 'bride' || v === 'both') ? v : 'both';
}
function _ltRecipientKo(recipient) {
  if (recipient === 'groom') return '신랑에게만';
  if (recipient === 'bride') return '신부에게만';
  return '두 분 함께';
}

// [LETTER_RATE] 예식별 짧은 창(분) + 긴 창(시간) 두 겹. 차단된 시도도 함께 센다(스팸이 무료로 재시도하지 못하게).
function _ltRateCheck(eventId) {
  try {
    var cache = CacheService.getScriptCache();
    var kMin = 'lr_m_' + eventId, kHr = 'lr_h_' + eventId;
    var m = Number(cache.get(kMin) || 0), h = Number(cache.get(kHr) || 0);
    if (m >= 3)  return { ok: false, error: '편지가 연달아 도착하고 있어요. 잠시 뒤에 다시 보내 주세요.' };
    if (h >= 40) return { ok: false, error: '지금은 편지가 많이 몰렸어요. 잠시 뒤에 다시 시도해 주세요.' };
    cache.put(kMin, String(m + 1), 60);
    cache.put(kHr, String(h + 1), 3600);
  } catch (_e) {}   // 캐시가 막히면 제한 없이 통과 — 편지를 막는 것보다 낫다
  return { ok: true };
}

// 동시 제출 시 appendRow 경합 방지 — 락을 못 잡아도 기록은 한다(데이터 손실보다 비잠금 기록이 안전).
function _ltWithLock(fn) {
  var lock = LockService.getScriptLock(), locked = false;
  try { lock.waitLock(5000); locked = true; } catch (e) {}
  try { return fn(); } finally { if (locked) { try { lock.releaseLock(); } catch (_) {} } }
}

function _ltAppendMessage(d) {
  var sheet = _ltSheet(LT.MESSAGES);
  _ltWithLock(function () {
    sheet.appendRow([
      new Date(),
      _deFormula(d.eventId),
      _deFormula(d.groomName + ' · ' + d.brideName),
      _deFormula(d.guestName),
      _deFormula(d.relation || '(미기재)'),
      _deFormula(d.message),
      d.moderated ? '검수 대기' : '전송됨',
      _ltRecipientKo(d.recipient)
    ]);
  });
}

function _ltAppendModeration(d) {
  var sheet = _ltSheet(LT.MODERATION);
  _ltWithLock(function () {
    sheet.appendRow([
      new Date(),
      _deFormula(d.eventId || ''),
      _deFormula(d.guestName || ''),
      _deFormula(d.relation || ''),
      _deFormula(d.recipient || ''),
      _deFormula(d.message || ''),
      _deFormula(d.matchedWord || ''),
      _deFormula(d.category || ''),
      'BLOCKED'
    ]);
  });
}

function _ltSendToRecipients(couple, guestName, relation, message, recipient) {
  var targets = [];
  var add = function (email, name, role) { if (email && email.indexOf('@') !== -1) targets.push({ email: email, name: name, role: role }); };
  if (recipient === 'groom') add(couple.groomEmail, couple.groomName, 'groom');
  else if (recipient === 'bride') add(couple.brideEmail, couple.brideName, 'bride');
  else { add(couple.groomEmail, couple.groomName, 'groom'); add(couple.brideEmail, couple.brideName, 'bride'); }

  if (targets.length === 0) {
    _ltAdminMail('[Moment Edit] 편지 미전달 · 수신자 이메일 없음 (직접 전달 필요)',
      '예식 ID ' + couple.eventId + '의 수신자 이메일이 없습니다.\n' +
      '수신 대상: ' + _ltRecipientKo(recipient) + '\n\n' +
      '하객: ' + guestName + '\n메시지: ' + message);
    return 0;   // [LETTER_DELIVERED] 편지는 시트에 남아 있다 — 스튜디오가 직접 전달한다
  }

  var subjectPrefix = recipient === 'groom' ? '[To Groom] ' : recipient === 'bride' ? '[To Bride] ' : '';
  var subject = subjectPrefix + guestName + '님이 ' +
    (recipient === 'both' ? '두 분께' : recipient === 'groom' ? '신랑님께' : '신부님께') + ' 마음을 전했습니다';

  // [LETTER_PLAIN] 텍스트 대체본 — 빈 문자열이면 HTML 을 못 그리는 클라이언트·화면낭독기에서 편지가 통째로 사라진다.
  //  (옮기며 끝줄의 전각 줄표를 뺐다 — 고객 문구 규칙)
  var plainBody = guestName + '님' + (relation ? ' (' + relation + ')' : '') + '이 남긴 편지입니다.\n\n'
    + message + '\n\nMoment Edit\nFocus on the Essence, Record the Truth.';

  for (var i = 0; i < targets.length; i++) {
    GmailApp.sendEmail(targets[i].email, subject, plainBody, {
      htmlBody: _ltLetterHtml(guestName, relation, message, recipient),
      name: 'Moment Edit',
      from: LT.STUDIO_EMAIL
    });
  }
  return targets.length;
}

// 편지 메일 본문 — 강제 다크 고정(풀블리드 table bgcolor + color-scheme 메타 → 어느 클라이언트에서도 흰 배경 안 뜸)
function _ltLetterHtml(guestName, relation, message, recipient) {
  var escapedMessage = _ltEsc(message), escapedGuest = _ltEsc(guestName), escapedRelation = relation ? _ltEsc(relation) : '';
  var badge = function (who) {
    return '<div style="display:inline-block;padding:6px 14px;border:1px solid #C4AD8F;border-radius:999px;font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:10px;letter-spacing:0.24em;color:#C4AD8F;text-transform:uppercase;margin-bottom:24px;">Private · To ' + who + '</div>';
  };
  var privateBadge = '', titleText = '두 분의 기록이 되어줄 편지가<br>새로 도착했습니다.';
  if (recipient === 'groom') { privateBadge = badge('Groom'); titleText = '신랑님께 전해진<br>사적인 편지입니다.'; }
  else if (recipient === 'bride') { privateBadge = badge('Bride'); titleText = '신부님께 전해진<br>사적인 편지입니다.'; }

  return '' +
    '<!DOCTYPE html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"><meta name="supported-color-schemes" content="dark"><style>:root{color-scheme:dark}body{margin:0;padding:0;background:#1E1A17}</style></head>' +
    '<body style="margin:0;padding:0;background:#1E1A17;">' +
    // [LETTER_PREHEADER] 받은편지함 미리보기 줄 — 없으면 누가 보낸 편지인지 열어야만 안다. 뒤의 공백은 본문이 딸려 들어오는 것을 막는다.
    '<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">' +
      escapedGuest + '님' + (escapedRelation ? ' (' + escapedRelation + ')' : '') + '이 남긴 편지입니다.' +
      '&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;&#8203;&nbsp;' +
    '</div>' +
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
      // [DM_FOOT_SIGN] 편지 맺음 — 이름 먼저, 문장 뒤, 메일 없음(2026-08-03 사용자 지시). 이 메일은 '받은 편지'지 연락처 안내가 아니다.
      //  ★#7A7165 는 이 어두운 지면에서 대비 3.6 — #A99E8E(6.56)로 올린 값이다.
      '<div style="margin-top:40px;padding-top:22px;border-top:1px solid rgba(255,255,255,0.10);text-align:center;">' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-size:16px;letter-spacing:0.03em;color:#E8E1D6;">Moment Edit</div>' +
        '<div style="font-family:\'Cormorant Garamond\',serif;font-style:italic;font-size:12.5px;letter-spacing:0.075em;color:#A99E8E;margin-top:9px;">Focus on the Essence, Record the Truth.</div>' +
      '</div>' +
    '</div>' +
    '</td></tr></table></body></html>';
}

function _ltEsc(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, function (m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[m];
  });
}

// ── 금지어 필터 (Banned 시트: 단어 · 카테고리 · 타입(word|regex)) ──
function _ltBannedList() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('banned_list_v1');
  if (cached) { try { return JSON.parse(cached); } catch (_) {} }   // 시트 편집은 최대 600초 뒤 반영
  var sheet;
  try { sheet = _ltSheet(LT.BANNED); } catch (e) { return []; }
  var data = sheet.getDataRange().getValues(), list = [];
  for (var i = 1; i < data.length; i++) {
    var word = String(data[i][0] || '').trim();
    if (!word) continue;
    list.push({ word: word, category: String(data[i][1] || '기타').trim(), type: String(data[i][2] || 'word').trim().toLowerCase() });
  }
  try { cache.put('banned_list_v1', JSON.stringify(list), 600); } catch (_) {}
  return list;
}

// 변형 감지(띄어쓰기·특수문자·대소문자 우회 차단) + 정규식(주민번호 등)
function _ltCheckBanned(message) {
  if (!message) return { blocked: false };
  var lower = String(message).toLowerCase();
  var compact = lower.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
  var list = _ltBannedList();
  for (var i = 0; i < list.length; i++) {
    var item = list[i];
    if (item.type === 'regex') {
      try {
        if (new RegExp(item.word).test(message)) return { blocked: true, word: item.word, category: item.category };
      } catch (e) {
        _ltAdminMail('[Moment Edit] 금지어 정규식 오류',
          'Banned 시트의 정규식 패턴이 잘못되어 무시됩니다(필터 일부 silent 미작동):\n  ' + item.word + '\n오류: ' + e, 'badregex_' + item.word);
        continue;
      }
    } else {
      var w = item.word.toLowerCase(), wc = w.replace(/[^\w가-힣ㄱ-ㅎㅏ-ㅣ]/g, '');
      if (lower.indexOf(w) !== -1 || (wc && compact.indexOf(wc) !== -1)) return { blocked: true, word: item.word, category: item.category };
    }
  }
  return { blocked: false };
}

// ═══════════════ ③ 영상 미등록 D-3 점검 + 개인정보 파기 (매일 07시) ═══════════════
// 디지털 참석(digitalAttendance=Y) 예식이 3일 안(오늘 포함)인데 vimeoId 가 비어 있으면 관리자에게 메일
//   → D-3 사전등록 SOP(docs/plans/PLAN_영상운영_기획안.md) 누락을 시스템이 잡는다. 수동 점검: 이 함수를 직접 실행.
function vimeoGuardDaily() {
  try { purgeCoupleData(); } catch (e) { Logger.log('[purgeCoupleData] 실패: ' + (e && e.message)); }   // 예식 후 6개월 PII 파기(같은 매일 트리거에 얹음)
  var sheet;
  try { sheet = _ltSheet(LT.COUPLES); } catch (e) { Logger.log('[vimeoGuard] ' + e.message); return; }
  var colOf = _couplesColOf(sheet);   // 3행 영문키(85_invitation)
  var need = ['eventId', 'weddingDate', 'vimeoId'];
  for (var i = 0; i < need.length; i++) {
    if (!colOf[need[i]]) { Logger.log('[vimeoGuard] 헤더 없음: ' + need[i] + ' (점검 불가)'); return; }
  }
  var last = sheet.getLastRow();
  if (last < LT.DATA_START_ROW) { Logger.log('[vimeoGuard] 데이터 없음'); return; }
  var rows = sheet.getRange(LT.DATA_START_ROW, 1, last - LT.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var tz = 'Asia/Seoul';
  var today = Utilities.formatDate(new Date(), tz, 'yyyy-MM-dd');
  var limit = Utilities.formatDate(new Date(Date.now() + 3 * 86400000), tz, 'yyyy-MM-dd');
  var g = function (row, h) { var c = colOf[h]; return c ? row[c - 1] : ''; };
  /* ★[VIMEO_GUARD_OFF 2026-09-20 사장님 「이게 왜 계속 날라오지? 관리자페이지 진행중이던거 취소처리 전부했는데」]
     옛 부부폼 프로젝트는 Customers 를 못 봐서, 관리자에서 취소해도 경고가 계속 나갔다.
     ★[VIMEO_GUARD_XPROJ] 본 프로젝트로 옮겨 온 지금은 Customers 를 직접 본다 — 미계약·취소·노쇼로 닫힌 예식은
       건너뛴다(2026-09-25 · 연락처 세션이 같은 결론으로 옛 파일에 심어 둔 판단을 이어받았다).
       ★«모르면 보낸다» — 조회가 실패하면 아무것도 건너뛰지 않는다. 예식 3일 전 영상 미등록을 놓치는 쪽이 훨씬 비싸다.
     Couples 의 'cancelled' 열(있으면)도 계속 존중한다. */
  var closed = _ltClosedEvents();
  var missing = [];
  rows.forEach(function (row) {
    var id = String(g(row, 'eventId')).trim();
    if (!id || id === 'test-couple') return;
    if (closed[id]) return;
    var da = String(g(row, 'digitalAttendance') || '').trim().toUpperCase();
    if (colOf['digitalAttendance'] && da === 'N') return;   // 디지털 참석 안 하는 예식은 제외
    if (colOf['cancelled'] && String(g(row, 'cancelled') || '').trim()) return;
    var d = g(row, 'weddingDate');
    var ds = (d instanceof Date) ? Utilities.formatDate(d, tz, 'yyyy-MM-dd') : String(d || '').trim().slice(0, 10).replace(/[./]/g, '-');
    if (!/^\d{4}-\d{2}-\d{2}$/.test(ds)) return;
    if (ds < today || ds > limit) return;                   // 오늘~3일 안 예식만
    if (String(g(row, 'vimeoId')).trim()) return;           // 이미 등록됨
    missing.push(ds + ' · ' + id);
  });
  if (!missing.length) { Logger.log('[vimeoGuard] 이상 없음(3일 안 미등록 0건)'); return; }
  _ltAdminMail('[Moment Edit] 예식 임박 영상 미등록 ' + missing.length + '건',
    '3일 안 예식인데 Couples 시트에 vimeoId가 비어 있습니다. D-3 사전등록 확인이 필요합니다.\n\n' +
    missing.join('\n') +
    '\n\n등록 순서: Vimeo 라이브 이벤트 생성 → Couples 시트 vimeoId·vimeoHash 열 입력 → live.html?e=예식ID&fresh=1 열어 확인' +
    '\n\n취소·연기된 예식이라면: 관리자 페이지에서 취소로 처리하면 다음 날부터 멈춥니다.',
    'vimeo_guard_' + today);
  Logger.log('[vimeoGuard] 경고 메일 발송: ' + missing.join(' / '));
}

// [VIMEO_GUARD_XPROJ] 관리자 페이지에서 닫은(미계약·취소·노쇼) 고객의 eventId. 읽다 실패하면 빈 목록 = 모르면 보낸다.
function _ltClosedEvents() {
  var out = {};
  try {
    var v = getCustomersSheet().getDataRange().getValues();
    var h = (v[0] || []).map(function (x) { return String(x).trim(); });
    var cE = h.indexOf('eventId'), cS = h.indexOf('현재단계');
    if (cE < 0 || cS < 0) return out;
    for (var i = 1; i < v.length; i++) {
      var id = String(v[i][cE] || '').trim();
      if (id && STAGE_EXCEPTIONS.indexOf(String(v[i][cS] || '').trim()) !== -1) out[id] = true;
    }
  } catch (e) {}
  return out;
}

// 예식일 + 6개월(기본 183일 · 스크립트 속성 COUPLE_PURGE_DAYS 로 조정) 지난 예식의 제3자 개인정보를 비운다(행은 남긴다).
//   대상: Couples(부모 성함·계좌·인사말·이메일·영상) · Messages(하객 이름·관계·편지) · Moderation(하객 이름·차단문).
//   COUPLE_PURGE_OFF='Y' 면 멈춘다. previewCoupleData() 로 미리 확인(아무것도 안 바꾼다).
function purgeCoupleData(dryRun) {
  var props = PropertiesService.getScriptProperties();
  if (props.getProperty('COUPLE_PURGE_OFF') === 'Y') return { ok: true, skipped: 'off' };
  var _lock = null;   // 동시 실행 방지(매일 트리거 + 수동 겹침) — 미리보기는 읽기 전용이라 안 잠근다
  if (!dryRun) {
    _lock = LockService.getScriptLock();
    try { _lock.waitLock(10000); } catch (e) { Logger.log('purgeCoupleData: 락 획득 실패 — 건너뜀'); return { ok: false, error: 'busy' }; }
  }
  try {
    var days = 183;
    var dprop = parseInt(props.getProperty('COUPLE_PURGE_DAYS'), 10);
    if (dprop >= 30) days = dprop;
    var tz = 'Asia/Seoul';
    var cutoff = Utilities.formatDate(new Date(Date.now() - days * 86400000), tz, 'yyyy-MM-dd');   // 이 날짜 이전 예식 = 파기 대상
    var toYmd = function (v) { return (v instanceof Date) ? Utilities.formatDate(v, tz, 'yyyy-MM-dd') : String(v || '').trim().slice(0, 10).replace(/[./]/g, '-'); };
    var expired = {}, cN = 0;

    var cs = null;
    try { cs = _ltSheet(LT.COUPLES); } catch (e) {}
    if (cs && cs.getLastRow() >= LT.DATA_START_ROW) {
      var colOf = _couplesColOf(cs), cWed = colOf['weddingDate'], cEid = colOf['eventId'];
      if (cWed && cEid) {
        var lastCol = cs.getLastColumn();
        var rows = cs.getRange(LT.DATA_START_ROW, 1, cs.getLastRow() - LT.DATA_START_ROW + 1, lastCol).getValues();
        var wipe = ['groomParents', 'brideParents', 'groomAccount', 'brideAccount', 'groomFatherAccount', 'groomMotherAccount', 'brideFatherAccount', 'brideMotherAccount', 'invitationText', 'groomEmail', 'brideEmail', 'vimeoId', 'vimeoHash'];
        for (var r = 0; r < rows.length; r++) {
          var ds = toYmd(rows[r][cWed - 1]);
          if (!/^\d{4}-\d{2}-\d{2}$/.test(ds) || ds >= cutoff) continue;   // 아직 6개월 안 지남 · 날짜 불명 → 유지
          var eid = String(rows[r][cEid - 1] || '').trim();
          if (eid) expired[eid] = true;
          if (dryRun) { cN++; continue; }
          var changed = false;
          for (var w = 0; w < wipe.length; w++) { var wc = colOf[wipe[w]]; if (wc && String(rows[r][wc - 1] || '') !== '') { rows[r][wc - 1] = ''; changed = true; } }
          if (changed) { cs.getRange(LT.DATA_START_ROW + r, 1, 1, lastCol).setValues([rows[r].map(_deFormula)]); cN++; }   // 재기록 시 수식 재무장 방지
        }
      }
    }
    var mN = dryRun ? 0 : _ltPurgeGuestSheet(LT.MESSAGES, expired, cutoff, toYmd, [3, 4, 5]);        // 하객 이름·관계·편지
    var modN = dryRun ? 0 : _ltPurgeGuestSheet(LT.MODERATION, expired, cutoff, toYmd, [2, 3, 5, 6]); // 하객 이름·관계·편지·걸린 단어
    Logger.log((dryRun ? '[DRY] ' : '') + 'purgeCoupleData: Couples ' + cN + ' · Messages ' + mN + ' · Moderation ' + modN + ' (예식+' + days + '일 경과)');
    return { ok: true, couples: cN, messages: mN, moderation: modN, dryRun: !!dryRun };
  } finally { if (_lock) { try { _lock.releaseLock(); } catch (e) {} } }
}
function previewCoupleData() { return purgeCoupleData(true); }

// Messages·Moderation — eventId 가 만료셋이거나 자체 시각(1열)+N일 지났으면 지정 칸(0부터)만 비운다. 반환 = 행 수.
function _ltPurgeGuestSheet(name, expired, cutoff, toYmd, idxCols) {
  var sh = null;
  try { sh = _ltSheet(name); } catch (e) { return 0; }
  if (!sh || sh.getLastRow() < 2) return 0;
  var lastCol = sh.getLastColumn();
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, lastCol).getValues(), n = 0;
  for (var r = 0; r < vals.length; r++) {
    var eid = String(vals[r][1] || '').trim();                 // 2열 = eventId
    var hit = !!(eid && expired[eid]);
    if (!hit) { var ts = toYmd(vals[r][0]); if (/^\d{4}-\d{2}-\d{2}$/.test(ts) && ts < cutoff) hit = true; }
    if (!hit) continue;
    var changed = false;
    for (var k = 0; k < idxCols.length; k++) { var ci = idxCols[k]; if (ci < lastCol && String(vals[r][ci] || '') !== '') { vals[r][ci] = ''; changed = true; } }
    if (changed) { sh.getRange(2 + r, 1, 1, lastCol).setValues([vals[r].map(_deFormula)]); n++; }
  }
  return n;
}

// ═══════════════ ④ 시트 옮기기 — 1회 실행 (다시 돌려도 안전) ═══════════════
// 원본·사본 대조용 값 — 날짜는 «그 시트의 시간대로 본 벽시계 값»으로 적는다.
//  ★화면 표기(getDisplayValues)로 비교하지 않는다 — 두 스프레드시트의 지역 설정이 다르면 같은 날짜가
//   「2026. 5. 26」과 「5/26/2026」으로 달리 보여 멀쩡한 사본을 «다르다»로 멈춘다. 값은 같고 표기만 다른 경우다.
function _ltSnap(sh) {
  var tz = sh.getParent().getSpreadsheetTimeZone();
  return sh.getDataRange().getValues().map(function (r) {
    return r.map(function (v) {
      return (Object.prototype.toString.call(v) === '[object Date]') ? 'D:' + Utilities.formatDate(v, tz, "yyyy-MM-dd'T'HH:mm:ss") : v;
    });
  });
}
// 옛 Letter System 의 시트 4개(Couples·Messages·Moderation·Banned)를 본 스프레드시트로 복사하고,
// 화면에 보이는 값이 원본과 한 칸도 다르지 않은지 확인한 뒤, 매일 07시 점검 트리거까지 건다(setupAllTriggers).
// 이미 옮긴 시트는 건너뛴다. 옛 스프레드시트는 건드리지 않는다(백업으로 남는다).
function letterMigrate() {
  // [LETTER_MIGRATE] 복사 → 원본 대조 → 어긋나면 사본 지우고 멈춤 → LETTER_MIGRATED=Y → 트리거
  var L = ['══ 청첩장·편지 시트 옮기기 ══'];
  var dst = SpreadsheetApp.getActive();
  var src = SpreadsheetApp.openById(_ltSrcId());
  // 같은 이름의 «다른» 시트를 덮지 않으려고, 그 시트다운 머리글이 있는지 본다 [행, 있어야 할 칸]
  var probe = { Couples: [LT.HEADER_ROW, 'eventId'], Messages: [1, 'eventId'], Moderation: [1, '예식ID'], Banned: [1, '단어'] };
  var looks = function (sh, pr) {
    if (sh.getLastRow() < pr[0]) return false;
    return sh.getRange(pr[0], 1, 1, Math.max(1, sh.getLastColumn())).getDisplayValues()[0]
      .map(function (x) { return String(x).trim(); }).indexOf(pr[1]) !== -1;
  };
  [LT.COUPLES, LT.MESSAGES, LT.MODERATION, LT.BANNED].forEach(function (name) {
    var have = dst.getSheetByName(name);
    if (have) {
      if (!looks(have, probe[name])) throw new Error("본 스프레드시트에 이미 '" + name + "' 탭이 있는데 청첩장 시트 모양이 아닙니다 — 덮지 않고 멈춥니다. 그 탭 이름을 바꾼 뒤 다시 실행하세요.");
      L.push('  있음  ' + name + ' — 이미 옮겨져 있어 건너뜀 (' + have.getLastRow() + '행)');
      return;
    }
    var s = src.getSheetByName(name);
    if (!s) throw new Error("옛 Letter System 에 '" + name + "' 시트가 없습니다 — 멈춥니다.");
    var c = s.copyTo(dst).setName(name);
    try { c.getDrawings().forEach(function (d) { d.remove(); }); } catch (_) {}   // 옛 가족청첩장 빌드 버튼(안 가져온 기능)
    var a = _ltSnap(s), b = _ltSnap(c);
    if (JSON.stringify(a) !== JSON.stringify(b)) {
      dst.deleteSheet(c);   // 어긋난 사본을 남기면 다음 실행이 «이미 있음»으로 건너뛴다 — 지우고 멈춘다
      throw new Error("'" + name + "' 복사본이 원본과 다릅니다 — 사본을 지우고 멈췄습니다.");
    }
    L.push('  OK    ' + name + ' — ' + a.length + '행 옮김 (원본과 한 칸도 다르지 않음)');
  });
  PropertiesService.getScriptProperties().setProperty(LT.MIGRATED_KEY, 'Y');
  L.push('');
  L.push(setupAllTriggers());   // vimeoGuardDaily(매일 07시) 포함 — 이미 있는 것은 지우고 다시 건다
  L.push('');
  L.push('끝. 이제 청첩장·편지는 본 스프레드시트의 탭 4개를 씁니다. 옛 Letter System 스프레드시트는 백업으로 남습니다.');
  var out = L.join('\n');
  Logger.log(out);
  return out;
}
