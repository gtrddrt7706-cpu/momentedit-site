/**
 * Moment Edit · 통합 플랫폼 — 04 청첩장 (B 교차쓰기)
 * ──────────────────────────────────────────────────────────────────────────
 * 마이페이지 입력 → Couples 시트(Letter System 스프레드시트, openById)에 41열 기록.
 *   = onCoupleFormSubmit 의 "출력(41열 행)"을 재현 → hydrate·템플릿·webhook 이 그대로 읽음(무수정).
 *   eventId 를 Customers(15) 에 배선(개인코드 ↔ eventId).
 *
 * [⚠️ B 전제] INV.LETTER_SYSTEM_ID 운영자 입력 필요(Couples 탭이 있는 시트 ID).
 *   (2026-09-25 청첩장 조회·편지가 87_letter 로 합쳐졌다 — 옛 부부폼의 makeEventId 등을 여기서 복제해 두었던 사정은 끝났지만,
 *    부부폼은 가져오지 않았으므로 이 파일의 _inv* 가 유일한 원본이다.)
 *   Couples 는 HEADER_ROW=3 → 자체 헬퍼(_couplesColOf, 1행 헤더인 buildHeaderIndex와 안 섞음).
 * [재사용] resolveSession(30)·findCustomerByCode/touchCustomer(20)·getCustomersSheet/buildHeaderIndex·_parseJsonSafe(70)
 */

var INV = {
  LETTER_SYSTEM_ID: '1GJX2pkaxbtER1xZq7hGrMVxm9kKh4-J1d2x-T5WwSq4',   // 'Moment Edit · Letter System'(Couples 탭) — 진단 리포트에서 확인된 시트 ID
  SHEET: 'Couples', HEADER_ROW: 3, DATA_START_ROW: 4,
  SITE_BASE: 'https://momentedit.kr', CACHE_PREFIX: 'couple_'
};

function _invConfigured() { _gsr_(); /* [GSR_GATE 2026-10-09] 공개 함수의 첫 줄 문 · 서버 길 · 예약 실행 · 관리자 · 소유자 안에서만 */ return INV.LETTER_SYSTEM_ID && INV.LETTER_SYSTEM_ID.charAt(0) !== '['; }

// ── Couples 시트 접근(교차) + 3행 헤더 헬퍼 (복제, onCoupleFormSubmit과 동일 동작) ──
function _couplesSheet() { _gsr_();
  if (!_invConfigured()) throw new Error('청첩장 연동 미설정: INV.LETTER_SYSTEM_ID를 채워 주세요.');
  // [LETTER_MERGED 2026-09-25] Couples 는 본 스프레드시트로 옮겼다(87_letter letterMigrate). 옮기기 전에는 옛 Letter System 을 읽는다.
  //  ★여기서 openById 로 옛 시트를 직접 열지 말 것 — 조회(getCouple)와 발행이 서로 다른 시트를 보게 된다.
  return _ltSheet(INV.SHEET);
}
function _couplesColOf(sheet) { _gsr_();
  var headers = sheet.getRange(INV.HEADER_ROW, 1, 1, sheet.getLastColumn()).getValues()[0];
  var map = {};
  for (var i = 0; i < headers.length; i++) { var h = String(headers[i]).trim(); if (h) map[h] = i + 1; }
  return map;
}
function _couplesWrite(sheet, colOf, rowNum, header, value, force) { _gsr_();
  var c = colOf[header]; if (!c) return;
  if (value === '' && !force) return;
  sheet.getRange(rowNum, c).setValue(value);
}
function _invMakeEventId(groomEn, brideEn, weddingDate) { _gsr_();
  var ini = function (en) {
    return String(en || '').trim().toLowerCase().split(/\s+/).filter(Boolean)
      .map(function (w) { return w.charAt(0); }).join('').replace(/[^a-z]/g, '');
  };
  var g = ini(groomEn), b = ini(brideEn), mmdd = '';
  var m = String(weddingDate || '').match(/^(\d{4})[\-\/.](\d{1,2})[\-\/.](\d{1,2})$/);
  if (m) mmdd = ('0' + m[2]).slice(-2) + ('0' + m[3]).slice(-2);
  return [g, b, mmdd].filter(Boolean).join('-');
}
function _invFindLastRow(sheet, idCol) { _gsr_();
  var rawLast = sheet.getLastRow();
  if (rawLast < INV.DATA_START_ROW) return INV.DATA_START_ROW - 1;
  var n = rawLast - INV.DATA_START_ROW + 1;
  var v = sheet.getRange(INV.DATA_START_ROW, idCol, n, 1).getValues();
  for (var i = v.length - 1; i >= 0; i--) { if (String(v[i][0]).trim() !== '') return INV.DATA_START_ROW + i; }
  return INV.DATA_START_ROW - 1;
}
function _invResolveEventId(sheet, colOf, base, groomName, brideName, ownId, ownCode) { _gsr_();
  /* ★[B2_MA_11 2026-11-06 2차 B2-마11] 기존 링크를 다시 쓸지는 «이 고객에 이미 연결된 예식 ID»로 정한다 — 종전엔 이름 · 영문 머리글자 · 월일이 같으면
     다른 고객의 공개 행을 그대로 다시 썼다. ①이 고객의 eventId 행이면 그 행 ②이름이 같은 행이라도 다른 고객 몫이면 건너뛰고 새 ID · 새 행
     ③주인을 알 수 없는 이름 일치 행이면 쓰지 않는다(conflict) — 부르는 쪽이 «청첩장 연결을 확인하고 있어요. 상담으로 알려 주세요.»로 멈춘다 */
  ownId = String(ownId || '').trim(); ownCode = String(ownCode || '').trim();
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
  // 1) 기존 부부 재사용 — base가 결정적 접두인 행에서 이름 일치 시 '기존 id 그대로'(배포된 URL 불변·하위호환).
  //    부부폼(form-to-couple) 경로와 동일 규칙 → 같은 부부면 어느 경로로 들어와도 같은 행에 수렴.
  var existing = {};
  for (var i = 0; i < ids.length; i++) {
    var rid = String(ids[i][0]).trim();
    if (!rid) continue;
    existing[rid] = true;
    if (rid !== base && rid.indexOf(base + '-') !== 0) continue;
    if (ownId && rid === ownId) return { eventId: rid, rowNum: INV.DATA_START_ROW + i };   // [B2_MA_11] ①
  }
  var unknownHit = false;
  for (var i2 = 0; i2 < ids.length; i2++) {
    var rid2 = String(ids[i2][0]).trim();
    if (!rid2 || (rid2 !== base && rid2.indexOf(base + '-') !== 0)) continue;
    var rg = gN[i2] ? String(gN[i2][0]).trim() : '', rb = bN[i2] ? String(bN[i2][0]).trim() : '';
    if (!((!rg && !rb) || (rg === groomName && rb === brideName))) continue;
    var owner = null; try { owner = (typeof _findCustomerBy === 'function') ? _findCustomerBy('eventId', rid2, false) : null; } catch (e) { owner = null; }
    var oc = owner ? String(owner.get('개인코드') || '').trim() : '';
    if (oc && ownCode && oc === ownCode) return { eventId: rid2, rowNum: INV.DATA_START_ROW + i2 };   // 이 고객 몫(옛 저장에 eventId 가 비었던 경우)
    if (oc) continue;   // [B2_MA_11] ② 다른 고객 몫 — 다시 쓰지 않는다
    unknownHit = true;   // [B2_MA_11] ③ 주인을 확인하지 못한 행 — 이 고객 몫이 뒤에 없을 때만 멈춘다
  }
  if (unknownHit) return { conflict: true };
  // 2) 신규 부부 — 추측 불가 랜덤 접미(6자)로 새 id. eventId만 아는 외부인의 대량 열람 차단(시트 내 유일).
  var cand = base + '-' + _invRandEventSuffix(), guard = 0;
  while (existing[cand] && guard++ < 50) cand = base + '-' + _invRandEventSuffix();
  return { eventId: cand, rowNum: lastRow + 1 };
}
// 예식ID 랜덤 접미(6자·혼동문자 제외) — 부부폼의 _randEventSuffix 복제(별도 프로젝트라 호출 불가).
function _invRandEventSuffix() { _gsr_();
  var A = 'abcdefghijkmnpqrstuvwxyz23456789', out = '', bytes;
  try { bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, Utilities.getUuid() + ':' + new Date().getTime()); } catch (e) { bytes = null; }
  for (var i = 0; i < 6; i++) { var r = bytes ? (bytes[i] & 0xff) : Math.floor(Math.random() * 256); out += A.charAt(r % A.length); }
  return out;
}
function _invUrls(eventId, designOnline, designFamily, live) { _gsr_();
  var e = encodeURIComponent(eventId);
  return {
    online: designOnline ? (INV.SITE_BASE + '/i/cover-' + designOnline + '.html?e=' + e) : '',
    family: designFamily ? (INV.SITE_BASE + '/i-family/family-' + designFamily + '.html?e=' + e) : '',
    live: (live === 'Y') ? (INV.SITE_BASE + '/live.html?e=' + e) : ''
  };
}

/* [PREVIEW_DIGITAL 2026-08-02] 디지털 참석 여부(boolean) — 식순 미리듣기의 배웅 장면이 이 값으로 갈린다.
   (오프라인 end-1a-farewell / 온라인 end-1b-farewell-online + 온라인 하객 맞이 큐 · assets/ritual-cue.js)
   ★규칙(어떤 청첩장 방식이 디지털 참석인가)은 아래 _invCouplesFields 한 곳에만 산다.
     그 조건을 여기에도, 프론트에도 옮겨 적지 않는다 — 옮겨 적으면 규칙이 바뀌는 날 사본만 옛 규칙을 지킨다.
     그래서 그 함수를 그대로 돌려 결과 한 칸(digitalAttendance)만 읽는다. 발행 전 초안에도 그대로 통한다.
   발행 후 값과도 어긋나지 않는다 — 발행이 Couples 에 쓰는 값이 바로 이 함수의 같은 칸이다. */
function _invDigital(draft) { _gsr_();
  try { return _invCouplesFields({}, draft || {}).digitalAttendance === 'Y'; } catch (e) { return false; }
}

// [LETTER_MAIL_A] 이메일 모양만 받는다(아니면 빈 값 → 다음 후보로)
function _invMail_(v) {
  v = String(v || '').trim();
  return (v.length <= 120 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) ? v : '';
}
// 입구·디자인·인사말·계좌 draft → Couples 41열(eventId 제외 40키) 매핑.
function _invCouplesFields(base, draft) { _gsr_();
  base = base || {}; draft = draft || {};
  var method = draft.method || '';
  var dOnline = (method === 'online' || method === 'both') ? String(draft.designOnline || '') : '';
  var dFamily = (method === 'offline' || method === 'both') ? String(draft.designFamily || '') : '';
  var live = (method === 'online' || method === 'both' || (method === 'self' && draft.selfQR)) ? 'Y' : 'N';
  return {
    groomName: base.groomKo || '', brideName: base.brideKo || '',
    groomNameEn: base.groomEn || '', brideNameEn: base.brideEn || '',
    /* ★[LETTER_MAIL_A 2026-11-06 사장님 결정 2 = A (B2-K36 · L04 · L13)] 하객 편지를 신랑 · 신부 각자 주소로 —
       ① 마이페이지 청첩장 1단계 «하객 편지 받을 이메일»(선택 · 계약 때 적은 값으로 미리 채워 둔다) ② 계약서 요청 때 적은 신랑 · 신부 이메일 ③ 가입 이메일.
       종전엔 두 칸 다 가입 이메일이라 «신부에게만» 편지도 가입 이메일(신랑 것일 수 있다)로 갔다. 둘이 같거나 한쪽이 비면 하객 화면이 «두 분 모두»만 보인다(87_letter letterSplit). */
    groomEmail: _invMail_(draft.letterGroomEmail) || _invMail_(base.ciGroomEmail) || base.email || '',
    brideEmail: _invMail_(draft.letterBrideEmail) || _invMail_(base.ciBrideEmail) || base.email || '',
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
function handleSaveInvitationDraft(body) { _gsr_();
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var _nq = [];   // 손상 경고 등 외부 I/O — 락 해제 후(finally) 발송
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 청첩장 단계가 없습니다.' };   // ★SNAP_PRODUCE_GUARD(2026-07-25): 스냅 여정엔 '제작중'이 없어(STAGE_FLOW.웨딩스냅) produce 전이 시 stageIndex=-1 → 진행바 깨짐·관리자 파이프라인서 사라짐. 80_production(38·265)과 동일 가드. 제거 금지
    var _cmI = _prodColsMissingError(colOf, code, _nq); if (_cmI) return _cmI;   // [A-1] 컬럼 미생성 유실 차단
    var _dl = _prodDraftLoadSafe(cust, code, _nq, 'invitation'); if (!_dl.ok) return _dl.res;   // 손상 셀 위 저장 금지 — 자동저장이 전 트랙을 {}로 덮는 사고 방지(80_production 헬퍼 · 경고는 락 밖 발송)
    var d = _dl.d;
    var _oldInvJ = JSON.stringify(d.invitationDraft || {});
    d.invitationDraft = (body && body.draft) || {};
    if (d.confirm && _prodUiStrip(_oldInvJ) !== _prodUiStrip(JSON.stringify(d.invitationDraft || {}))) _prodConfirmVoid(d);   // [예식 확인서] 청첩장 실변경도 확인 해제(80_production 공용 헬퍼)
    d.tracks = d.tracks || {}; if (d.tracks.invitation !== '완료') d.tracks.invitation = '진행중';
    var _szI1 = _prodSizeError(d, { track: 'invitation', cust: cust });   // [A급2·B급1]
    if (_szI1) return { ok: false, error: _szI1 };
    touchCustomer(sheet, colOf, cust.num, _prodStoreCols(d, {}, { track: 'invitation', cust: cust }));   // PROD_ACCESSOR
    setCustomerStage(code, 'produce');   // PRODUCE_ENTRY_FIX(2026-07-25) — 청첩장이 첫 제작 작업일 수 있음. 80_production 트랙 저장과 동일 전이(멱등·역행금지)
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} _nq.forEach(function (f) { try { f(); } catch (e) {} }); }
}

// [04] 청첩장 발행 → Couples(교차) 41열 기록 + eventId 배선 + tracks.invitation=완료. method='none'이면 발행 없이 완료.
function handlePublishInvitation(body) { _gsr_();
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var _nq = [];   // 손상 경고 등 외부 I/O — 락 해제 후(finally) 발송
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var custSheet = getCustomersSheet(), custCol = buildHeaderIndex(custSheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 청첩장 단계가 없습니다.' };   // ★SNAP_PRODUCE_GUARD(2026-07-25): 스냅 여정엔 '제작중'이 없어(STAGE_FLOW.웨딩스냅) produce 전이 시 stageIndex=-1 → 진행바 깨짐·관리자 파이프라인서 사라짐. 80_production(38·265)과 동일 가드. 제거 금지

    var _cmP1 = _prodColsMissingError(custCol, code, _nq); if (_cmP1) return _cmP1;   // [A-1] 컬럼 미생성 유실 차단
    var _dl = _prodDraftLoadSafe(cust, code, _nq, 'invitation'); if (!_dl.ok) return _dl.res;   // 손상 셀 위 저장 금지(80_production 헬퍼 · 경고는 락 밖 발송)
    var d = _dl.d;
    var _oldInvJ2 = JSON.stringify(d.invitationDraft || {});
    var draft = (body && body.draft) || d.invitationDraft || {};
    d.invitationDraft = draft;
    if (d.confirm && _prodUiStrip(_oldInvJ2) !== _prodUiStrip(JSON.stringify(draft || {}))) _prodConfirmVoid(d);   // [예식 확인서] 청첩장 실변경도 확인 해제(80_production 공용 헬퍼)
    var method = String(draft.method || '').trim();
    // 기초정보 화면 없이 — 이름은 위저드 1단계(draft), 일시·이메일은 계약·계정값으로 서버가 base 구성
    var base = _ensureProductionBase(cust, d, draft);

    // 청첩장 없이 → 발행 없이 트랙 완료
    if (method === 'none') {
      d.tracks = d.tracks || {};
      if (d.tracks.invitation !== '완료') _prodConfirmVoid(d);   // [예식 확인서] 청첩장 상태 변화(→완료)도 확인 해제
      d.tracks.invitation = '완료';
      var _szI2 = _prodSizeError(d, { track: 'invitation', cust: cust });   // [A급2·B급1]
      if (_szI2) return { ok: false, error: _szI2 };
      touchCustomer(custSheet, custCol, cust.num, _prodStoreCols(d, {}, { track: 'invitation', cust: cust }));   // PROD_ACCESSOR
      setCustomerStage(code, 'produce');   // PRODUCE_ENTRY_FIX — 발행('안 함' 포함)만 하고 나가는 재진입 경로는 초안 저장이 없어 전이가 빠짐(코워크 교차검증 치명1)
      return { ok: true, skipped: true };
    }

    if (!_invConfigured()) return { ok: false, error: '청첩장 연동이 아직 설정되지 않았습니다. (관리자: INV.LETTER_SYSTEM_ID)' };
    if (!base.groomEn || !base.brideEn) return { ok: false, error: '신랑·신부 영문 이름을 입력해 주세요. (청첩장 1단계)' };
    if (!base.weddingDate) return { ok: false, error: '예식 날짜가 아직 확정되지 않았어요. 디렉터에게 문의해 주세요.' };

    var sheet = _couplesSheet();
    var colOf = _couplesColOf(sheet);
    var eid = _invMakeEventId(base.groomEn, base.brideEn, base.weddingDate);
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(eid)) return { ok: false, error: 'eventId 생성 실패 — 영문 이름·예식 날짜를 확인해 주세요. (' + eid + ')' };
    var rv = _invResolveEventId(sheet, colOf, eid, base.groomKo || '', base.brideKo || '', String(d.eventId || cust.get('eventId') || ''), code);
    if (rv.conflict) return { ok: false, ecode: 'S0', error: '청첩장 연결을 확인하고 있어요. 상담으로 알려 주세요.' };   // [B2_MA_11]
    var eventId = rv.eventId, rowNum = rv.rowNum;
    var fields = _invCouplesFields(base, draft);
    var urls = _invUrls(eventId, fields.designOnline, fields.designFamily, fields.digitalAttendance);

    /* ★[B2_MA_10 2026-11-06 2차 B2-마10] 공개 행(Couples)을 쓰기 «전»에 완성될 제작 데이터의 용량 · 필수값을 먼저 잰다 — 종전엔 공개 행을 한 칸씩 먼저 쓰고 뒤에서 용량 초과로 멈춰
       공개 청첩장만 바뀌고 고객 저장본은 옛것인 채로 갈렸다(기존 용량 오류 문구는 그대로). 쓰는 도중 실패하면 이전 공개본으로 되돌리고,
       되돌리기까지 실패해 반영 여부를 확정하지 못하면 «반영 결과를 아직 확인하지 못했어요. 새로고침해 청첩장을 확인해 주세요.» */
    var _pubOld = JSON.stringify([d.eventId || '', d.invitationUrls || {}, (d.tracks || {}).invitation || '']);
    d.eventId = eventId; d.invitationUrls = urls;
    d.tracks = d.tracks || {}; d.tracks.invitation = '완료';
    if (d.confirm && JSON.stringify([d.eventId, d.invitationUrls, d.tracks.invitation]) !== _pubOld) _prodConfirmVoid(d);   // [예식 확인서] 발행(상태·링크 변화)도 확인 해제 — 재발행 무변경은 유지
    var _szI3 = _prodSizeError(d, { track: 'invitation', cust: cust });   // [A급2·B급1]
    if (_szI3) return { ok: false, error: _szI3 };
    var _updPub = _prodStoreCols(d, { 'eventId': eventId }, { track: 'invitation', cust: cust });   // PROD_ACCESSOR
    if (base.groomKo) _updPub['신랑이름'] = base.groomKo;   // 확인·보완된 이름을 마스터에도 반영(기초정보 화면의 역할 승계)
    if (base.brideKo) _updPub['신부이름'] = base.brideKo;
    var _lc = sheet.getLastColumn(), _snapRow = null;
    try { _snapRow = sheet.getRange(rowNum, 1, 1, _lc).getValues(); } catch (e) { _snapRow = null; }
    try {
      _couplesWrite(sheet, colOf, rowNum, 'eventId', eventId, true);
      Object.keys(fields).forEach(function (k) { _couplesWrite(sheet, colOf, rowNum, k, fields[k], true); });
      touchCustomer(custSheet, custCol, cust.num, _updPub);
    } catch (eW) {
      var _back = false; try { if (_snapRow) { sheet.getRange(rowNum, 1, 1, _lc).setValues(_snapRow); _back = true; } } catch (eB) {}
      if (!_back) return { ok: false, ecode: 'S5', error: '반영 결과를 아직 확인하지 못했어요. 새로고침해 청첩장을 확인해 주세요.' };
      return { ok: false, ecode: 'S9', error: '발행이 안 됐어요 · 다시 눌러 주세요', _why: 'publish write ' + String(eW && eW.message || eW).slice(0, 160) };
    }
    setCustomerStage(code, 'produce');   // PRODUCE_ENTRY_FIX — 위저드 재진입(_step='confirm' 복원) 시 발행만 호출돼 전이가 빠지던 경로(코워크 교차검증 치명1)

    _ltBustCouple(eventId);   // [LETTER_MERGED] 조회가 같은 프로젝트로 와서 캐시를 바로 지울 수 있다(종전엔 최대 60초 옛 내용)
    return { ok: true, eventId: eventId, urls: urls };
  } finally { try { lock.releaseLock(); } catch (e) {} _nq.forEach(function (f) { try { f(); } catch (e) {} }); }
}

// [04] 청첩장 미리보기 — draft를 Couples 같은 eventId 행에 기록(발행 전). ★발행과 동일 _invMakeEventId → 미리보기 행=발행 행(2개 X). tracks는 '완료'로 안 올림(미완료 유지) → 발행이 같은 행 덮어쓰며 '완료'로 승격.
// ★DEAD_ACTION_NOTE(2026-07-25): 프런트 호출부 0건(mypage·assets 전수 grep) — doPost 라우트만 생존한 사실상 죽은 액션.
//   이번 사고의 근본 원인이 '단일 전이점을 믿었는데 그 호출부가 조용히 사라진 것'이었으므로, 죽은 액션은 이렇게 표기해 둔다.
//   (handleSaveProductionBase도 동일 상태 — 80_production 참조) 되살릴 때는 전이·가드가 최신인지 먼저 확인할 것.
function saveInvitationPreview(body) { _gsr_();
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var _nq = [];   // 손상 경고 등 외부 I/O — 락 해제 후(finally) 발송
  var lock = LockService.getScriptLock();
  try { lock.waitLock(20000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var custSheet = getCustomersSheet(), custCol = buildHeaderIndex(custSheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 청첩장 단계가 없습니다.' };   // ★SNAP_PRODUCE_GUARD(2026-07-25): 스냅 여정엔 '제작중'이 없어(STAGE_FLOW.웨딩스냅) produce 전이 시 stageIndex=-1 → 진행바 깨짐·관리자 파이프라인서 사라짐. 80_production(38·265)과 동일 가드. 제거 금지

    var _cmP2 = _prodColsMissingError(custCol, code, _nq); if (_cmP2) return _cmP2;   // [A-1] 컬럼 미생성 유실 차단
    var _dl = _prodDraftLoadSafe(cust, code, _nq, 'invitation'); if (!_dl.ok) return _dl.res;   // 손상 셀 위 저장 금지(80_production 헬퍼 · 경고는 락 밖 발송)
    var d = _dl.d;
    var _oldInvJ2 = JSON.stringify(d.invitationDraft || {});
    var draft = (body && body.draft) || d.invitationDraft || {};
    d.invitationDraft = draft;
    if (d.confirm && _prodUiStrip(_oldInvJ2) !== _prodUiStrip(JSON.stringify(draft || {}))) _prodConfirmVoid(d);   // [예식 확인서] 청첩장 실변경도 확인 해제(80_production 공용 헬퍼)
    var method = String(draft.method || '').trim();
    // 기초정보 화면 없이 — 이름은 위저드 1단계(draft), 일시·이메일은 계약·계정값으로 서버가 base 구성
    var base = _ensureProductionBase(cust, d, draft);

    // 미리보기는 디자인이 있는 경우만 (self/none은 미리볼 청첩장 없음)
    if (['online', 'offline', 'both'].indexOf(method) === -1) return { ok: false, error: '미리볼 디자인이 없어요.' };
    if (!_invConfigured()) return { ok: false, error: '청첩장 연동이 아직 설정되지 않았습니다. (관리자: INV.LETTER_SYSTEM_ID)' };
    if (!base.groomEn || !base.brideEn) return { ok: false, error: '신랑·신부 영문 이름을 입력해 주세요. (청첩장 1단계)' };
    if (!base.weddingDate) return { ok: false, error: '예식 날짜가 아직 확정되지 않았어요. 디렉터에게 문의해 주세요.' };

    var sheet = _couplesSheet();
    var colOf = _couplesColOf(sheet);
    var eid = _invMakeEventId(base.groomEn, base.brideEn, base.weddingDate);   // ★ 발행과 동일한 결정적 eventId
    if (!/^[a-z]+-[a-z]+-\d{4}$/.test(eid)) return { ok: false, error: 'eventId 생성 실패 — 영문 이름·예식 날짜를 확인해 주세요. (' + eid + ')' };
    var rv = _invResolveEventId(sheet, colOf, eid, base.groomKo || '', base.brideKo || '', String(d.eventId || cust.get('eventId') || ''), code);
    if (rv.conflict) return { ok: false, ecode: 'S0', error: '청첩장 연결을 확인하고 있어요. 상담으로 알려 주세요.' };   // [B2_MA_11] 미리보기도 같은 규칙
    var eventId = rv.eventId, rowNum = rv.rowNum;

    _couplesWrite(sheet, colOf, rowNum, 'eventId', eventId, true);
    var fields = _invCouplesFields(base, draft);
    Object.keys(fields).forEach(function (k) { _couplesWrite(sheet, colOf, rowNum, k, fields[k], true); });

    var urls = _invUrls(eventId, fields.designOnline, fields.designFamily, fields.digitalAttendance);

    // 배선 저장 — ★ tracks.invitation은 '완료'면 유지, 아니면 '진행중'(미완료 유지. 발행이 '완료'로 올림)
    var _wireOld = JSON.stringify([d.eventId || '', d.invitationUrls || {}]);
    d.eventId = eventId; d.invitationUrls = urls;
    if (d.confirm && JSON.stringify([d.eventId, d.invitationUrls]) !== _wireOld) _prodConfirmVoid(d);   // [예식 확인서] 배선(링크) 변화도 확인 해제 — 무변경 재배선은 유지
    d.tracks = d.tracks || {}; if (d.tracks.invitation !== '완료') d.tracks.invitation = '진행중';
    var _szI4 = _prodSizeError(d, { track: 'invitation', cust: cust });   // [A급2·B급1]
    if (_szI4) return { ok: false, error: _szI4 };
    touchCustomer(custSheet, custCol, cust.num, _prodStoreCols(d, { 'eventId': eventId }, { track: 'invitation', cust: cust }));   // PROD_ACCESSOR
    setCustomerStage(code, 'produce');   // PRODUCE_ENTRY_FIX — 죽은 액션이지만 되살아날 때를 대비해 다른 청첩장 진입점과 동일 전이 유지
    _ltBustCouple(eventId);   // [LETTER_MERGED] 발행과 같이 캐시를 지운다

    return { ok: true, eventId: eventId, urls: urls };
  } finally { try { lock.releaseLock(); } catch (e) {} _nq.forEach(function (f) { try { f(); } catch (e) {} }); }
}

// [04] 마이페이지 청첩장 트랙 상태 — draft(이어쓰기) + 발행 결과(eventId·URL). 제작 단계에만.
function buildInvitationState(r) { _gsr_();
  if (!r) return null;
  if (PRODUCTION_STAGES.indexOf(String(r.get('현재단계') || '').trim()) === -1) return null;
  var d = _prodLoad(r);   // PROD_ACCESSOR
  var eventId = d.eventId || String(r.get('eventId') || '').trim();
  return {
    configured: _invConfigured(),
    status: (d.tracks && d.tracks.invitation) || '시작전',
    draft: d.invitationDraft || null,
    digital: _invDigital(d.invitationDraft),   // [PREVIEW_DIGITAL] 식순 미리듣기가 배웅 장면을 고를 때 쓴다(프론트는 규칙을 모른 채 결과만 읽는다)
    published: eventId ? { eventId: eventId, urls: d.invitationUrls || _invUrls(eventId, '', '', 'N') } : null
  };
}
