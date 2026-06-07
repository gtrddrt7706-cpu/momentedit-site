/**
 * Moment Edit · 통합 플랫폼 — 03 제작 (공통 기초정보 + 3트랙)
 * ──────────────────────────────────────────────────────────────────────────
 * 입금완료 후 진입. 공통 기초정보(이름 한/영·이메일·예식일시)를 제작임시저장(16열 JSON)에 저장.
 * 3트랙(청첩장·다이닝·식순) 상태 대시보드 — 1차: 다이닝·식순=자리(준비중), 청첩장 상세=04.
 *
 * [두 층위] 제작상태(Customers 13)·현재단계=제작중(여정). 단계 전이는 setCustomerStage('produce') 단일점.
 * [저장] 제작임시저장 JSON = { base:{...}, tracks:{invitation,dining,ritual}, invitationDraft:{...}(04) }.
 *        04 발행 때 base/invitationDraft → Couples 로 promote.
 * [재사용] resolveSession(30) · getCustomersSheet/buildHeaderIndex · findCustomerByCode/touchCustomer(20)
 *          · _parseJsonSafe(70) · fmtKST · setCustomerStage(consultation)
 */

var PRODUCTION_STAGES = ['입금완료', '제작중'];   // 제작 UI 노출 단계

// [03-1] 공통 기초정보 저장(고객) → 제작임시저장.base + 제작상태=작성중 + 현재단계→제작중.
//   가드: 입금완료/제작중 단계만. 이름(한)·이메일은 Customers 마스터에도 반영(확인·보완 결과).
function handleSaveProductionBase(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var base = (body && body.base) || {};
  var groomKo = String(base.groomKo || '').trim();
  var brideKo = String(base.brideKo || '').trim();
  if (!groomKo || !brideKo) return { ok: false, error: '신랑·신부 이름을 입력해 주세요.' };
  var email = String(base.email || '').trim();
  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: '이메일을 정확히 입력해 주세요.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var stage = String(cust.get('현재단계') || '').trim();
    if (PRODUCTION_STAGES.indexOf(stage) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };

    var draft = _parseJsonSafe(cust.get('제작임시저장'));
    draft.base = {
      groomKo: groomKo,
      brideKo: brideKo,
      groomEn: String(base.groomEn || '').trim(),
      brideEn: String(base.brideEn || '').trim(),
      email: email,
      weddingDate: String(base.weddingDate || '').trim(),
      weddingTime: String(base.weddingTime || '').trim(),
      savedAt: fmtKST(new Date())
    };
    var upd = { '제작임시저장': JSON.stringify(draft), '제작상태': '작성중' };
    if (base.weddingDate) upd['예식일'] = String(base.weddingDate).trim();   // 잔금 D-7 산출용 톱레벨 컬럼
    upd['신랑이름'] = groomKo;            // 확인·보완 결과를 마스터에 반영
    upd['신부이름'] = brideKo;
    if (email) upd['이메일'] = email;
    touchCustomer(sheet, colOf, cust.num, upd);
    setCustomerStage(code, 'produce');    // 입금완료 → 제작중 (단일 전이점)
    return { ok: true };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [03] 다이닝·식순 트랙 입력 저장(점진적) → 제작임시저장.{track}Draft + tracks.{track} 갱신.
//   handleSaveInvitationDraft 와 같은 패턴. done=true 면 완료, 아니면 진행중(이미 완료면 완료 유지).
function handleSaveProductionTrack(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var track = String((body && body.track) || '').trim();
  if (track !== 'dining' && track !== 'ritual') return { ok: false, error: '알 수 없는 항목입니다.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    var d = _parseJsonSafe(cust.get('제작임시저장'));
    d[track + 'Draft'] = (body && body.draft) || {};
    d.tracks = d.tracks || {};
    if (body && body.done) d.tracks[track] = '완료';
    else if (d.tracks[track] !== '완료') d.tracks[track] = '진행중';
    touchCustomer(sheet, colOf, cust.num, { '제작임시저장': JSON.stringify(d) });
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [03] 마이페이지 제작 화면 상태 — 입금완료/제작중일 때. 기초정보(없으면 Customers 프리필) + 3트랙 상태.
//   내부 draft 원본은 노출하지 않고 표시에 필요한 base·tracks만.
function buildProductionState(r) {
  if (!r) return null;
  var stage = String(r.get('현재단계') || '').trim();
  if (PRODUCTION_STAGES.indexOf(stage) === -1) return null;
  var draft = _parseJsonSafe(r.get('제작임시저장'));
  var entered = !!draft.base;
  var b = draft.base || {};
  var base = {
    groomKo: entered ? (b.groomKo || '') : String(r.get('신랑이름') || ''),
    brideKo: entered ? (b.brideKo || '') : String(r.get('신부이름') || ''),
    groomEn: b.groomEn || '',
    brideEn: b.brideEn || '',
    email: entered ? (b.email || '') : String(r.get('이메일') || ''),
    weddingDate: b.weddingDate || '',
    weddingTime: b.weddingTime || ''
  };
  var t = draft.tracks || {};
  return {
    entered: entered,                          // 기초정보 저장 여부(false면 입력 화면)
    base: base,
    tracks: {
      invitation: t.invitation || '시작전',    // 04 청첩장에서 갱신
      dining: t.dining || '시작전',            // 다이닝 위저드에서 갱신
      ritual: t.ritual || '시작전'             // 식순 위저드에서 갱신
    },
    diningDraft: draft.diningDraft || null,    // 다이닝 입력 이어하기용
    ritualDraft: draft.ritualDraft || null     // 식순 입력 이어하기용
  };
}

// [05] 결과물 단계(예식완료/촬영완료/결과물전달) — 원본 전달 → 고객 선택 → 보정 → 전달.
//   사진 파일은 서버 X(드라이브 링크). 선택 = A안(번호/파일명 텍스트). 추가 보정 = 포함 10컷·추가 컷당 20,000(홈페이지 기준).
var RESULT_STAGES = ['예식완료', '촬영완료', '결과물전달'];
var RESULT = { 포함보정컷: 10, 추가보정단가: 20000 };   // ★단가·포함컷 단일 출처(momentedit.kr 가격표와 동일)
function _resAcct() {
  return {
    account: (typeof CONFIG !== 'undefined' && CONFIG.ACCOUNT && String(CONFIG.ACCOUNT).charAt(0) !== '[') ? CONFIG.ACCOUNT : '',
    holder: (typeof CONFIG !== 'undefined' && CONFIG.ACCOUNT_HOLDER && String(CONFIG.ACCOUNT_HOLDER).charAt(0) !== '[') ? CONFIG.ACCOUNT_HOLDER : ''
  };
}
function buildResultState(r) {
  if (!r) return null;
  var stage = String(r.get('현재단계') || '').trim();
  if (RESULT_STAGES.indexOf(stage) === -1) return null;
  var status = String(r.get('결과물상태') || '').trim() || '대기';
  if (status === '업로드') status = '원본전달';            // 레거시 정규화
  var acct = _resAcct();
  return {
    stage: stage,
    status: status,                                        // 대기/원본전달/선택완료/보정중/컨펌대기/컨펌완료/전달완료
    delivered: stage === '결과물전달',
    survey: { status: String(r.get('설문상태') || '').trim() || '대기' },   // 마지막 설문(전달완료 후)
    isSnap: String(r.get('상품타입') || '').trim() === '웨딩스냅',
    원본: String(r.get('원본링크') || '').trim(),
    보정본: String(r.get('보정본폴더') || '').trim(),
    영상: String(r.get('영상링크') || '').trim(),
    선택: String(r.get('선택사진') || '').trim(),           // A안: 번호/파일명 텍스트
    선택수: Number(r.get('선택수') || 0) || 0,
    선택일시: String(r.get('선택확정일시') || '').trim(),
    포함컷: RESULT.포함보정컷,
    추가단가: RESULT.추가보정단가,
    extra: {
      status: String(r.get('추가보정상태') || '').trim() || '대기',  // 대기/신청/견적/결제대기/완료
      수량: Number(r.get('추가보정수량') || 0) || 0,
      금액: Number(r.get('추가보정금액') || 0) || 0,
      payerName: String(r.get('추가보정입금자명') || '').trim(),
      account: acct.account,
      holder: acct.holder
    }
  };
}

// [05-②] 고객 사진 선택 제출(A안: 번호/파일명 텍스트). 단계 전이 없음.
function handleSubmitResultSelection(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var picks = String((body && body.picks) || '').trim();
  if (!picks) return { ok: false, error: '고르신 컷을 입력해 주세요.' };
  if (picks.length > 4000) picks = picks.slice(0, 4000);
  var n = picks.split(/[\s,\n;·]+/).filter(function (x) { return x; }).length;   // 토큰 수 = 대략 장수
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (RESULT_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 결과물 단계가 아닙니다.' };
    if (!String(cust.get('원본링크') || '').trim()) return { ok: false, error: '원본이 아직 전달되지 않았어요.' };
    var cur = String(cust.get('결과물상태') || '').trim();
    if (['보정중', '컨펌대기', '컨펌완료', '전달완료'].indexOf(cur) >= 0) return { ok: false, error: '보정이 시작되어 선택을 변경할 수 없어요. 변경은 문의해 주세요.' };
    touchCustomer(sheet, colOf, cust.num, { '선택사진': picks, '선택수': n, '선택확정일시': fmtKST(new Date()), '결과물상태': '선택완료' });
    try { notifyStudio('[플랫폼] 결과물 컷 선택 (' + code + ')', code + ' · ' + n + '컷 선택\n' + picks.slice(0, 800)); } catch (e) {}
    return { ok: true, 선택수: n };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [05-③] 추가 보정 신청(고객). 포함 10컷 외 추가 = 컷당 20,000(자동 견적).
function handleRequestExtraRetouch(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var qty = Math.floor(Number((body && body.qty) || 0));
  if (!(qty > 0)) return { ok: false, error: '추가 보정 수량을 입력해 주세요.' };
  if (qty > 500) qty = 500;
  var amount = qty * RESULT.추가보정단가;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (RESULT_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 결과물 단계가 아닙니다.' };
    if (String(cust.get('추가보정상태') || '').trim() === '완료') return { ok: false, error: '이미 결제가 완료된 추가 보정이 있어요. 문의해 주세요.' };
    touchCustomer(sheet, colOf, cust.num, { '추가보정상태': '신청', '추가보정수량': qty, '추가보정금액': amount });
    try { notifyStudio('[플랫폼] 추가 보정 신청 (' + code + ')', code + ' · ' + qty + '컷 · ' + amount.toLocaleString() + '원'); } catch (e) {}
    return { ok: true, qty: qty, amount: amount };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [05-③] 추가 보정 입금 신호(고객). 신청/견적/결제대기 → 결제대기. 입금자명도 함께 기록(통장 대조용).
function handleExtraRetouchSignal(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var payer = String((body && body.payerName) || '').trim();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var cur = String(cust.get('추가보정상태') || '').trim();
    if (cur === '완료') return { ok: true, already: true };
    if (['신청', '견적', '결제대기'].indexOf(cur) === -1) return { ok: false, error: '추가 보정 신청 후 진행할 수 있어요.' };
    var upd = { '추가보정상태': '결제대기' };
    if (payer) upd['추가보정입금자명'] = payer;
    touchCustomer(sheet, colOf, cust.num, upd);
    try { notifyStudio('[플랫폼] 추가 보정 입금 신호 (' + code + ')', code + (payer ? (' · 입금자 ' + payer) : '')); } catch (e) {}
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [05-④] 보정본 컨펌(고객). 컨펌대기 → 컨펌완료. 단계 전이 없음(아카이브는 관리자 [결과물 전달] 때만).
function handleConfirmRetouch(body) {
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
    var cur = String(cust.get('결과물상태') || '').trim();
    if (cur === '컨펌완료' || cur === '전달완료') return { ok: true, already: true };
    if (cur !== '컨펌대기' && cur !== '보정중') return { ok: false, error: '아직 보정본 확인 단계가 아니에요.' };
    if (!String(cust.get('보정본폴더') || '').trim()) return { ok: false, error: '보정본이 아직 준비되지 않았어요.' };
    touchCustomer(sheet, colOf, cust.num, { '결과물상태': '컨펌완료', '컨펌일시': fmtKST(new Date()) });
    try { notifyStudio('[플랫폼] 보정본 컨펌 완료 (' + code + ')', code + ' · 고객이 보정본을 확인했어요. 최종 전달 가능.'); } catch (e) {}
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [05-마지막] 만족도 설문 제출(고객). 전달 완료 후. answers={질문키:선택값} 객관식 + review(후기)·reviewPublic(공개동의).
function handleSubmitSurvey(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var raw = (body && body.answers && typeof body.answers === 'object') ? body.answers : {};
  var clean = {}, k;
  for (k in raw) { if (raw.hasOwnProperty(k) && String(k).length <= 40) { clean[String(k).slice(0, 40)] = String(raw[k] == null ? '' : raw[k]).slice(0, 40); } }
  if (!clean.overall || !clean.recommend) return { ok: false, error: '전체 만족도와 추천 여부는 골라 주세요.' };
  var review = String((body && body.review) || '').trim().slice(0, 2000);
  var reviewPublic = (String((body && body.reviewPublic) || '').trim() === 'Y') ? 'Y' : '';
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var product = String(cust.get('상품타입') || '').trim() || (typeof P !== 'undefined' ? P.PRODUCT_SIGNATURE : '시그니처');
    var payload = { product: product, answers: clean, review: review, reviewPublic: reviewPublic };
    touchCustomer(sheet, colOf, cust.num, { '설문상태': '완료', '설문응답': JSON.stringify(payload), '설문일시': fmtKST(new Date()) });
    var sum = ''; for (k in clean) { if (clean.hasOwnProperty(k)) sum += k + '=' + clean[k] + '  '; }
    try { notifyStudio('[플랫폼] 만족도 설문 (' + code + ')', code + ' · ' + product + '\n' + sum + (review ? ('\n후기' + (reviewPublic ? '(공개동의)' : '') + ': ' + review) : '')); } catch (e) {}
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [관리자] 추가 보정 입금 확인(통장 대조). adminCall 경유(관리자 인증은 adminCall에서).
function adminConfirmExtra(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  if (String(cust.get('추가보정상태') || '').trim() === '완료') return { ok: true, already: true };
  touchCustomer(sheet, colOf, cust.num, { '추가보정상태': '완료' });
  return { ok: true };
}

// [1회 실행] Customers에 결과물 셀렉트·추가 보정 컬럼 추가(멱등) + 레거시 결과물상태 '업로드'→'원본전달'.
function addResultSelectionColumns() {
  var sheet = getCustomersSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var need = ['선택사진', '선택수', '선택확정일시', '추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명', '컨펌일시', '설문상태', '설문응답', '설문일시'], added = [];
  need.forEach(function (h) { if (headers.indexOf(h) === -1) { sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h); added.push(h); } });
  var colOf = buildHeaderIndex(sheet), conv = 0;
  if (colOf['결과물상태']) {
    var last = sheet.getLastRow();
    if (last >= P.DATA_START_ROW) {
      var rng = sheet.getRange(P.DATA_START_ROW, colOf['결과물상태'], last - P.DATA_START_ROW + 1, 1), vals = rng.getValues();
      for (var i = 0; i < vals.length; i++) { if (String(vals[i][0]).trim() === '업로드') { vals[i][0] = '원본전달'; conv++; } }
      if (conv) rng.setValues(vals);
    }
  }
  return (added.length ? ('추가됨: ' + added.join(', ')) : '컬럼 이미 있음') + (conv ? (' · 업로드→원본전달 ' + conv + '건') : '');
}
