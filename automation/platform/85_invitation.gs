/**
 * Moment Edit · 통합 플랫폼 — 04 청첩장 (B 교차쓰기)
 * ──────────────────────────────────────────────────────────────────────────
 * 마이페이지 입력 → Couples 시트(Letter System 스프레드시트, openById)에 41열 기록.
 *   = onCoupleFormSubmit 의 "출력(41열 행)"을 재현 → hydrate·템플릿·webhook 이 그대로 읽음(무수정).
 *   eventId 를 Customers(15) 에 배선(개인코드 ↔ eventId).
 *
 * [⚠️ B 전제] INV.LETTER_SYSTEM_ID 운영자 입력 필요(Couples 탭이 있는 시트 ID).
 *   plat 프로젝트와 청첩장 프로젝트는 별도라 makeEventId 등은 여기서 '복제'(호출 불가).
 *   Couples 는 HEADER_ROW=3 → 자체 헬퍼(_couplesColOf, 1행 헤더인 buildHeaderIndex와 안 섞음).
 * [재사용] resolveSession(30)·findCustomerByCode/touchCustomer(20)·getCustomersSheet/buildHeaderIndex·_parseJsonSafe(70)
 */

var INV = {
  LETTER_SYSTEM_ID: '1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4',   // 'Moment Edit · Letter System'(Couples 탭) — 진단 리포트에서 확인된 시트 ID
  SHEET: 'Couples', HEADER_ROW: 3, DATA_START_ROW: 4,
  SITE_BASE: 'https://momentedit.kr', CACHE_PREFIX: 'couple_'
};

function _invConfigured() { return INV.LETTER_SYSTEM_ID && INV.LETTER_SYSTEM_ID.charAt(0) !== '['; }

// ── Couples 시트 접근(교차) + 3행 헤더 헬퍼 (복제, onCoupleFormSubmit과 동일 동작) ──
function _couplesSheet() {
  if (!_invConfigured()) throw new Error('청첩장 연동 미설정: INV.LETTER_SYSTEM_ID를 채워 주세요.');
  var ss = SpreadsheetApp.openById(INV.LETTER_SYSTEM_ID);
  var sh = ss.getSheetByName(INV.SHEET);
  if (!sh) throw new Error("Couples 시트('" + INV.SHEET + "')를 찾을 수 없습니다.");
  return sh;
}
function _couplesColOf(sheet) {
  var headers = sheet.getRange(INV.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) { var h = String(headers[i]).trim(); if (h) map[h] = i + 1; }
  return map;
}
function _couplesWrite(sheet, colOf, rowNum, header, value, force) {
  var c = colOf[header]; if (!c) return;
  if (value === '' && !force) return;
  sheet.getRange(rowNum, c).setValue(value);
}
function _invMakeEventId(groomEn, brideEn, weddingDate) {
  var ini = function (en) {
    return String(en || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
      .map(function (w) { return w.charAt(0); }).join('').replace(/[^a-z]/g, '');
  };
  var g = ini(groomEn), b = ini(brideEn), mmdd = '';
  var m = String(weddingDate || '').match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
  if (m) mmdd = ('0' + m[2]).slice(-2) + ('0' + m[3]).slice(-2);
  return [g, b, mmdd].filter(Boolean).join('-');
}
function _invFindLastRow(sheet, idCol) {
  var rawLast = sheet.getLastRow();
  if (rawLast < INV.DATA_START_ROW) return INV.DATA_START_ROW - 1;
  var n = rawLast - INV.DATA_START_ROW + 1;
  var v = sheet.getRange(INV.DATA_START_ROW, idCol, n, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) { if (String(v[i][0]).trim() !== '') return INV.DATA_START_ROW + i; }
  return INV.DATA_START_ROW - 1;
}
function _invResolveEventId(sheet, colOf, base, groomName, brideName) {
  var idCol = colOf['eventId']; if (!idCol) throw new Error("Couples 'eventId' 헤더(3행)를 찾을 수 없음");
  var gCol = colOf['groomName'], bCol = colOf['brideName'];
  var lastRow = _invFindLastRow(sheet, idCol);
  var ids = [], gN = [], bN = [];
  if (lastRow >= INV.DATA_START_ROW) {
    var n = lastRow - INV.DATA_START_ROW + 1;
    ids = sheet.getRange(INV.DATA_START_ROW, idCol, n, 1).getValues();
    if (gCol) gN = sheet.getRange(INV.DATA_START_ROW, gCol, n, 1).getValues();
    if (bCol) bN = sheet.getRange(INV.DATA_START_ROW, bCol, n, 1).getValues();
  }
  var cand = base, suffix = 1;
  while (true) {
    var taken = false;
    for (var i = 0; i < ids.length; i++) {
      if (String(ids[i][0]).trim() !== cand) continue;
      var rg = gN[i] ? String(gN[i][0]).trim() : '', rb = bN[i] ? String(bN[i][0]).trim() : '';
      if ((!rg && !rb) || (rg === groomName && rb === brideName)) return { eventId: cand, rowNum: INV.DATA_START_ROW + i };
      taken = true; break;
    }
    if (!taken) return { eventId: cand, rowNum: lastRow + 1 };
    suffix++; cand = base + '-' + suffix;
  }
}
function _invUrls(eventId, designOnline, designFamily, live) {
  var e = encodeURIComponent(eventId);
  return {
    online: designOnline ? (INV.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + e) : '',
    family: designFamily ? (INV.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + e) : '',
    live: (live === 'Y') ? (INV.SITE_BASE + '/live.html?e=' + e) : ''
  };
}

// 입구·디자인·인사말·계좌 draft → Couples 41열(eventId 제외 40키) 매핑.
function _invCouplesFields(base, draft) {
  base = base || {}; draft = draft || {};
  var method = draft.method || '';
  var dOnline = (method === 'online' || method === 'both') ? String(draft.designOnline || '') : '';
  var dFamily = (method === 'offline' || method === 'both') ? String(draft.designFamily || '') : '';
  var live = (method === 'online' || method === 'both' || (method === 'self' && draft.selfQR)) ? 'Y' : 'N';
  return {
    groomName: base.groomKo || '', brideName: base.brideKo || '',
    groomNameEn: base.groomEn || '', brideNameEn: base.brideEn || '',
    groomEmail: base.email || '', brideEmail: base.email || '',
    weddingDate: base.weddingDate || '', weddingTime: base.weddingTime || '',
    designFamily: dFamily, designOnline: dOnline, digitalAttendance: live,
    greetingShowParents: draft.greetingShowParents || 'N',
    envelopeShowParents: draft.envelopeShowParents || 'N',
    groomParents: draft.groomParents || '', brideParents: draft.brideParents || '',
    groomChildTitle: draft.groomChildTitle || '', brideChildTitle: draft.brideChildTitle || '',
    groomBank: draft.groomBank || '', groomAccount: draft.groomAccount || '',
    brideBank: draft.brideBank || '', brideAccount: draft.brideAccount || '',
    groomFatherAccount: draft.groomFatherAccount || '', groomMotherAccount: draft.groomMotherAccount || '',
    brideFatherAccount: draft.brideFatherAccount || '', brideMotherAccount: draft.brideMotherAccount || '',
    accountOnline: draft.accountOnline || 'N', accountLive: draft.accountLive || 'N', accountFamily: draft.accountFamily || 'N',
    invitationText: draft.invitationText || '', famInvTitle: draft.famInvTitle || '', famInvSubKo: draft.famInvSubKo || '',
    pullQuote: draft.pullQuote || '', groomBio: draft.groomBio || '', brideBio: draft.brideBio || '',
    digInvitationText: draft.digInvitationText || '', digInvTitle: draft.digInvTitle || '', digInvSubKo: draft.digInvSubKo || '',
    digPullQuote: draft.digPullQuote || '', digGroomBio: draft.digGroomBio || '', digBrideBio: draft.digBrideBio || ''
  };
}

// [04] 청첩장 입력 draft 저장(점진적) → 제작임시저장.invitationDraft + tracks.invitation=진행중.
function handleSaveInvitationDraft(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    var d = _parseJsonSafe(cust.get('제작임시저장'));
    d.invitationDraft = (body && body.draft) || {};
    d.tracks = d.tracks || {}; if (d.tracks.invitation !== '완료') d.tracks.invitation = '진행중';
    touchCustomer(sheet, colOf, cust.num, { '제작임시저장': JSON.stringify(d) });
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [04] 청첩장 발행 → Couples(교차) 41열 기록 + eventId 배선 + tracks.invitation=완료. method='none'이면 발행 없이 완료.
function handlePublishInvitation(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var custSheet = getCustomersSheet(), custCol = buildHeaderIndex(custSheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };

    var d = _parseJsonSafe(cust.get('제작임시저장'));
    var base = d.base || {};
    var draft = (body && body.draft) || d.invitationDraft || {};
    d.invitationDraft = draft;
    var method = String(draft.method || '').trim();

    // 청첩장 없이 → 발행 없이 트랙 완료
    if (method === 'none') {
      d.tracks = d.tracks || {}; d.tracks.invitation = '완료';
      touchCustomer(custSheet, custCol, cust.num, { '제작임시저장': JSON.stringify(d) });
      return { ok: true, skipped: true };
    }

    if (!_invConfigured()) return { ok: false, error: '청첩장 연동이 아직 설정되지 않았습니다. (관리자: INV.LETTER_SYSTEM_ID)' };
    if (!base.groomEn || !base.brideEn) return { ok: false, error: '기초정보의 영문 이름을 먼저 입력해 주세요.' };
    if (!base.weddingDate) return { ok: false, error: '기초정보의 예식 날짜를 먼저 입력해 주세요.' };

    var sheet = _couplesSheet();
    var colOf = _couplesColOf(sheet);
    var eid = _invMakeEventId(base.groomEn, base.brideEn, base.weddingDate);
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(eid)) return { ok: false, error: 'eventId 생성 실패 — 영문 이름·예식 날짜를 확인해 주세요. (' + eid + ')' };
    var rv = _invResolveEventId(sheet, colOf, eid, base.groomKo || '', base.brideKo || '');
    var eventId = rv.eventId, rowNum = rv.rowNum;

    _couplesWrite(sheet, colOf, rowNum, 'eventId', eventId, true);
    var fields = _invCouplesFields(base, draft);
    Object.keys(fields).forEach(function (k) { _couplesWrite(sheet, colOf, rowNum, k, fields[k], true); });

    var urls = _invUrls(eventId, fields.designOnline, fields.designFamily, fields.digitalAttendance);

    // 배선 + draft/상태 저장 (Customers)
    d.eventId = eventId; d.invitationUrls = urls;
    d.tracks = d.tracks || {}; d.tracks.invitation = '완료';
    touchCustomer(custSheet, custCol, cust.num, { '제작임시저장': JSON.stringify(d), 'eventId': eventId });

    // 캐시 무효화: webhook(별 프로젝트)의 ScriptCache는 여기서 못 지움 → 재발행 시 TTL만큼 지연 가능(신규는 무관).
    return { ok: true, eventId: eventId, urls: urls };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [04] 청첩장 미리보기 — draft를 Couples 같은 eventId 행에 기록(발행 전). ★발행과 동일 _invMakeEventId → 미리보기 행=발행 행(2개 X). tracks는 '완료'로 안 올림(미완료 유지) → 발행이 같은 행 덮어쓰며 '완료'로 승격.
function saveInvitationPreview(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var custSheet = getCustomersSheet(), custCol = buildHeaderIndex(custSheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };

    var d = _parseJsonSafe(cust.get('제작임시저장'));
    var base = d.base || {};
    var draft = (body && body.draft) || d.invitationDraft || {};
    d.invitationDraft = draft;
    var method = String(draft.method || '').trim();

    // 미리보기는 디자인이 있는 경우만 (self/none은 미리볼 청첩장 없음)
    if (['online', 'offline', 'both'].indexOf(method) === -1) return { ok: false, error: '미리볼 디자인이 없어요.' };
    if (!_invConfigured()) return { ok: false, error: '청첩장 연동이 아직 설정되지 않았습니다. (관리자: INV.LETTER_SYSTEM_ID)' };
    if (!base.groomEn || !base.brideEn) return { ok: false, error: '기초정보의 영문 이름을 먼저 입력해 주세요.' };
    if (!base.weddingDate) return { ok: false, error: '기초정보의 예식 날짜를 먼저 입력해 주세요.' };

    var sheet = _couplesSheet();
    var colOf = _couplesColOf(sheet);
    var eid = _invMakeEventId(base.groomEn, base.brideEn, base.weddingDate);   // ★ 발행과 동일한 결정적 eventId
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(eid)) return { ok: false, error: 'eventId 생성 실패 — 영문 이름·예식 날짜를 확인해 주세요. (' + eid + ')' };
    var rv = _invResolveEventId(sheet, colOf, eid, base.groomKo || '', base.brideKo || '');
    var eventId = rv.eventId, rowNum = rv.rowNum;

    _couplesWrite(sheet, colOf, rowNum, 'eventId', eventId, true);
    var fields = _invCouplesFields(base, draft);
    Object.keys(fields).forEach(function (k) { _couplesWrite(sheet, colOf, rowNum, k, fields[k], true); });

    var urls = _invUrls(eventId, fields.designOnline, fields.designFamily, fields.digitalAttendance);

    // 배선 저장 — ★ tracks.invitation은 '완료'면 유지, 아니면 '진행중'(미완료 유지. 발행이 '완료'로 올림)
    d.eventId = eventId; d.invitationUrls = urls;
    d.tracks = d.tracks || {}; if (d.tracks.invitation !== '완료') d.tracks.invitation = '진행중';
    touchCustomer(custSheet, custCol, cust.num, { '제작임시저장': JSON.stringify(d), 'eventId': eventId });

    return { ok: true, eventId: eventId, urls: urls };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [04] 마이페이지 청첩장 트랙 상태 — draft(이어쓰기) + 발행 결과(eventId·URL). 제작 단계에만.
function buildInvitationState(r) {
  if (!r) return null;
  if (PRODUCTION_STAGES.indexOf(String(r.get('현재단계') || '').trim()) === -1) return null;
  var d = _parseJsonSafe(r.get('제작임시저장'));
  var eventId = d.eventId || String(r.get('eventId') || '').trim();
  return {
    configured: _invConfigured(),
    status: (d.tracks && d.tracks.invitation) || '시작전',
    draft: d.invitationDraft || null,
    published: eventId ? { eventId: eventId, urls: d.invitationUrls || _invUrls(eventId, '', '', 'N') } : null
  };
}
