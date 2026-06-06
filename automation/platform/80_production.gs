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

// [05] 결과물 단계(예식완료/촬영완료/결과물전달) — 이미 있는 결과물 링크 컬럼 읽기 표시.
//   1차: ①원본·④보정본·⑤영상 링크 표시 / ②③(번호 선택·추가 결제)은 2차 자리. 사진은 서버 X(드라이브 링크).
var RESULT_STAGES = ['예식완료', '촬영완료', '결과물전달'];
function buildResultState(r) {
  if (!r) return null;
  var stage = String(r.get('현재단계') || '').trim();
  if (RESULT_STAGES.indexOf(stage) === -1) return null;
  return {
    stage: stage,
    delivered: stage === '결과물전달',
    isSnap: String(r.get('상품타입') || '').trim() === '웨딩스냅',
    원본: String(r.get('원본링크') || '').trim(),
    보정본: String(r.get('보정본폴더') || '').trim(),
    영상: String(r.get('영상링크') || '').trim()
  };
}
