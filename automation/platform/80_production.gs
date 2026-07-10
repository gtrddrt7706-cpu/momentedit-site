/**
 * Moment Edit · 통합 플랫폼 — 03 제작 (공통 기초정보 + 3트랙)
 * ──────────────────────────────────────────────────────────────────────────
 * 입금완료 후 진입. 공통 기초정보(이름 한/영·예식일시)를 제작임시저장(16열 JSON)에 저장.
 *   이메일은 입력받지 않고 계정 이메일(Customers '이메일')을 자동 재사용 — 청첩장 Couples 시드용.
 * 4트랙(청첩장·다이닝·식순·최종확정) 상태 대시보드 — 청첩장 상세=04. 최종확정=인원(초과 스탠딩 요금)·음료·특이사항.
 *
 * [두 층위] 제작상태(Customers 13)·현재단계=제작중(여정). 단계 전이는 setCustomerStage('produce') 단일점.
 * [저장] 제작임시저장 JSON = { base:{...}, tracks:{invitation,dining,ritual,final}, invitationDraft:{...}(04), diningDraft, ritualDraft, finalDraft }.
 *        04 발행 때 base/invitationDraft → Couples 로 promote.
 * [재사용] resolveSession(30) · getCustomersSheet/buildHeaderIndex · findCustomerByCode/touchCustomer(20)
 *          · _parseJsonSafe(70) · fmtKST · setCustomerStage(consultation)
 */

var PRODUCTION_STAGES = ['입금완료', '제작중'];   // 제작 UI 노출 단계

// [03-1] 공통 기초정보 저장(고객) → 제작임시저장.base + 제작상태=작성중 + 현재단계→제작중.
//   가드: 입금완료/제작중 단계만. 이름(한)은 Customers 마스터에도 반영(확인·보완 결과).
function handleSaveProductionBase(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };

  var base = (body && body.base) || {};
  var groomKo = String(base.groomKo || '').trim();
  var brideKo = String(base.brideKo || '').trim();
  if (!groomKo || !brideKo) return { ok: false, error: '신랑·신부 이름을 입력해 주세요.' };

  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 제작 단계가 없습니다.' };   // 스냅이 '제작중'으로 잘못 전이되어 관리자 화면에서 사라지는 것 방지
    var stage = String(cust.get('현재단계') || '').trim();
    if (PRODUCTION_STAGES.indexOf(stage) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };

    var draft = _parseJsonSafe(cust.get('제작임시저장'));
    // 이메일은 폼에서 받지 않는다 — 계정 이메일 우선, 없으면 기존 저장값 유지(85 청첩장 Couples 시드가 계속 차도록)
    var email = String((cust.get('이메일') || (draft.base && draft.base.email) || '')).trim();
    // 예식 일시도 폼에서 받지 않는다 — 계약 확정값(예식일 톱레벨 + 계약 슬롯→본예식 +1h)을 서버가 채움(청첩장·식순 단일 기준)
    var wDate = _ymdOf(cust.get('예식일')) || String((draft.base && draft.base.weddingDate) || base.weddingDate || '').trim();
    var wTime = String((draft.base && draft.base.weddingTime) || base.weddingTime || '').trim();
    if (!wTime) {
      var _ci0 = _parseJsonSafe(cust.get('동의기록')).계약정보 || {};
      wTime = ({ '09:00': '10:00', '12:20': '13:20', '15:40': '16:40' })[String(_ci0.weddingTime || '').trim()] || '';
    }
    draft.base = {
      groomKo: groomKo,
      brideKo: brideKo,
      groomEn: String(base.groomEn || '').trim(),
      brideEn: String(base.brideEn || '').trim(),
      email: email,
      weddingDate: wDate,
      weddingTime: wTime,
      savedAt: fmtKST(new Date())
    };
    var upd = { '제작임시저장': JSON.stringify(draft), '제작상태': '작성중' };
    if (wDate) upd['예식일'] = wDate;   // 잔금 D-7 산출용 톱레벨 컬럼(계약 확정값 재기록 · 무해)
    upd['신랑이름'] = groomKo;            // 확인·보완 결과를 마스터에 반영
    upd['신부이름'] = brideKo;
    touchCustomer(sheet, colOf, cust.num, upd);
    setCustomerStage(code, 'produce');    // 입금완료 → 제작중 (단일 전이점)
    return { ok: true };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
  }
}

// [03-1b] 기초정보 서버 구성 — 입력 화면 없이: 이름=청첩장 위저드 draft(없으면 기존 base→마스터), 이메일=계정, 일시=계약 확정(예식일+슬롯→본예식 +1h).
//   발행(85 handlePublishInvitation) 등에서 호출해 prodDraft.base를 채워 돌려준다(저장은 호출자가).
function _ensureProductionBase(cust, prodDraft, invDraft) {
  var b = (prodDraft && prodDraft.base) || {};
  var iv = invDraft || {};
  var gKo = String(iv.groomKo || b.groomKo || cust.get('신랑이름') || '').trim();
  var bKo = String(iv.brideKo || b.brideKo || cust.get('신부이름') || '').trim();
  var gEn = String(iv.groomEn || b.groomEn || '').trim();
  var bEn = String(iv.brideEn || b.brideEn || '').trim();
  var email = String((cust.get('이메일') || b.email || '')).trim();
  var wDate = _ymdOf(cust.get('예식일')) || String(b.weddingDate || '').trim();
  var wTime = String(b.weddingTime || '').trim();
  if (!wTime) {
    var _ci = _parseJsonSafe(cust.get('동의기록')).계약정보 || {};
    wTime = ({ '09:00': '10:00', '12:20': '13:20', '15:40': '16:40' })[String(_ci.weddingTime || '').trim()] || '';
  }
  prodDraft.base = { groomKo: gKo, brideKo: bKo, groomEn: gEn, brideEn: bEn, email: email, weddingDate: wDate, weddingTime: wTime, savedAt: fmtKST(new Date()) };
  return prodDraft.base;
}

// [03-F] 최종 확정 인원 정책 = 계약서 단일 기준(착석 25 · 초과는 스탠딩 1인 50,000원 · 최대 30명)
var FINAL_CONFIRM = { 착석: 25, 최대: 30, 초과단가: 50000 };

// [03] 다이닝·식순·최종확정 트랙 입력 저장(점진적) → 제작임시저장.{track}Draft + tracks.{track} 갱신.
//   handleSaveInvitationDraft 와 같은 패턴. done=true 면 완료, 아니면 진행중(이미 완료면 완료 유지).
function handleSaveProductionTrack(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var track = String((body && body.track) || '').trim();
  if (track !== 'dining' && track !== 'ritual' && track !== 'final') return { ok: false, error: '알 수 없는 항목입니다.' };
  // 최종 확정: 서버가 인원 정규화 + 스탠딩·추가요금 계산(단일 출처 — 프런트 표시·관리자 메일이 이 값을 씀)
  if (track === 'final') {
    var fdr = (body && body.draft) || {};
    var _h = parseInt(String(fdr.headcount || '').replace(/[^0-9]/g, ''), 10) || 0;
    if (body && body.done) {
      if (_h < 1) return { ok: false, error: '총 하객 수를 입력해 주세요.' };
      if (_h > FINAL_CONFIRM.최대) return { ok: false, error: '하객은 최대 ' + FINAL_CONFIRM.최대 + '명까지 모실 수 있어요. 조정이 어려우시면 디렉터에게 문의해 주세요.' };
      if (!String(fdr.drink || '').trim()) return { ok: false, error: '건배·웰컴 음료를 골라 주세요.' };
    }
    fdr.headcount = _h ? String(_h) : '';
    fdr.standing = Math.max(0, Math.min(_h, FINAL_CONFIRM.최대) - FINAL_CONFIRM.착석);
    fdr.extraFee = fdr.standing * FINAL_CONFIRM.초과단가;
    if (String(fdr.drink || '').indexOf('논알콜') === 0) fdr.softCount = '';   // 전원 논알콜이면 잔 수 구분 무의미
    body.draft = fdr;
  }
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 제작 단계가 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    var d = _parseJsonSafe(cust.get('제작임시저장'));
    var _wasDone = (d.tracks && d.tracks[track]) === '완료';   // 완료 전이 1회 감지용(재저장 반복 알림 방지)
    var _prevFinal = (track === 'final') ? (d.finalDraft || {}) : null;   // 재확정 변경 감지(인원·음료·잔수 바뀌면 요금·준비가 달라져 관리자 재통지)
    d[track + 'Draft'] = (body && body.draft) || {};
    d.tracks = d.tracks || {};
    if (body && body.done) d.tracks[track] = '완료';
    else if (d.tracks[track] !== '완료') d.tracks[track] = '진행중';
    touchCustomer(sheet, colOf, cust.num, { '제작임시저장': JSON.stringify(d) });
    // [재배선 2026-06-16] 다이닝 '장소 미정'으로 완료 → 디렉터가 추천·예약 도와줄 신호(1회).
    //   옛 트리거('상담 때 함께 정할게요' 선택)는 그 선택지가 UI에서 제거돼 죽은 조건이었음 → 신규 흐름(식당 카드만)에 맞춰
    //   '특정 식당을 못 정한 채 마무리'를 신호로. 식당을 골랐거나 다이닝 안 함(N)이면 발사 안 함.
    if (track === 'dining' && body && body.done && !_wasDone) {
      var _ddr = (body && body.draft) || {};
      var _vp = String(_ddr.venuePick || '').trim();
      if (_ddr.dining_on !== 'N' && (!_vp || _vp === '장소 미정' || _vp === '상담 때 함께 정할게요')) {
        notifyKakao('admin.diningConsult', code);
      }
    }
    // 최종 확정 완료 → 관리자 메일(인원·스탠딩 추가요금·음료·논알콜·특이사항). 잔금 합산·당일 준비 반영 신호.
    //   최초 완료 + 완료 후 재수정(인원·음료·잔수 변경) 모두 통지 — 요금·준비가 달라지므로.
    if (track === 'final' && body && body.done) {
      var _f = (body && body.draft) || {};
      var _changed = !!_prevFinal && (
        String(_prevFinal.headcount || '') !== String(_f.headcount || '') ||
        String(_prevFinal.drink || '') !== String(_f.drink || '') ||
        (Number(_prevFinal.softCount) || 0) !== (Number(_f.softCount) || 0) ||
        String(_prevFinal.allergy || '').trim() !== String(_f.allergy || '').trim()   // 알레르기=식음 안전(계약 ⑧ 고지의무) 변경도 재통지
      );
      if (!_wasDone || _changed) {
        // [차액 경보] 잔금이 이미 확인된 뒤 인원 추가요금이 달라지면 — 자동 합산 동결 상태라 수동 정산 필요(관리자 메일)
        var _balPaid5 = String(cust.get('잔금상태') || '').trim() === '확인';
        var _feePrev5 = Number((_prevFinal || {}).extraFee) || 0, _feeNow5 = Number(_f.extraFee) || 0;
        if (_balPaid5 && _feeNow5 !== _feePrev5) {
          try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('최종확정 변경 · 잔금 기결제 · 인원 추가요금 ' + _feePrev5.toLocaleString() + '원 → ' + _feeNow5.toLocaleString() + '원 · 차액 정산 필요 · ' + code); } catch (e) {}
        }
        notifyKakao('admin.finalConfirm', code, {
          head: _f.headcount || '-',
          standing: Number(_f.standing) || 0,
          fee: Number(_f.extraFee) || 0,
          drink: String(_f.drink || ''),
          soft: parseInt(String(_f.softCount || '').replace(/[^0-9]/g, ''), 10) || 0,
          note: (String(_f.allergy || '').trim() || String(_f.cake || '').trim() || String(_f.videoLink || '').trim()) ? '특이사항 있음(관리자 페이지 확인)' : '',
          changed: (_wasDone && _changed)   // 완료 후 변경분(요금·준비 재확인 필요)
        });
      }
    }
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [03] 마이페이지 제작 화면 상태 — 입금완료/제작중일 때. 기초정보(없으면 Customers 프리필) + 3트랙 상태.
//   내부 draft 원본은 노출하지 않고 표시에 필요한 base·tracks만.
function buildProductionState(r) {
  if (!r) return null;
  if (String(r.get('상품타입') || '').trim() === '웨딩스냅') return null;   // 스냅은 제작/청첩장 단계 없음 · 시그 전용 카드 노출·잘못된 '제작중' 전이 방지
  var stage = String(r.get('현재단계') || '').trim();
  if (PRODUCTION_STAGES.indexOf(stage) === -1) return null;
  var draft = _parseJsonSafe(r.get('제작임시저장'));
  var entered = !!draft.base;
  var b = draft.base || {};
  var lockedWed = _ymdOf(r.get('예식일'));                    // 계약 시점에 확정된 예식일(톱레벨) = 돈 계산 단일 기준
  var base = {
    groomKo: entered ? (b.groomKo || '') : String(r.get('신랑이름') || ''),
    brideKo: entered ? (b.brideKo || '') : String(r.get('신부이름') || ''),
    groomEn: b.groomEn || '',
    brideEn: b.brideEn || '',
    email: entered ? (b.email || '') : String(r.get('이메일') || ''),
    weddingDate: lockedWed || b.weddingDate || '',          // 계약 확정일 우선(없으면 제작폼 입력값)
    weddingTime: b.weddingTime || '',
    weddingLocked: !!lockedWed,                             // true면 제작폼에서 날짜 읽기전용(계약서 기준)
    // 문의 때 적은 예상 하객 수 — 최종확정 위저드 프리필용(수정 가능 · 1~99만 유효)
    expectedGuests: (function () { try { if (typeof findRowByPersonalCode !== 'function') return ''; var bk = findRowByPersonalCode(String(r.get('개인코드') || '').trim()); var g = bk ? String(bk.get('하객') || '').replace(/[^0-9]/g, '') : ''; return (Number(g) > 0 && Number(g) < 100) ? g : ''; } catch (e) { return ''; } })()
  };
  var t = draft.tracks || {};
  return {
    entered: entered,                          // 기초정보 저장 여부(false면 입력 화면)
    base: base,
    tracks: {
      invitation: t.invitation || '시작전',    // 04 청첩장에서 갱신
      dining: t.dining || '시작전',            // 다이닝 위저드에서 갱신
      ritual: t.ritual || '시작전',            // 식순 위저드에서 갱신
      final: t.final || '시작전'               // 최종 확정 위저드에서 갱신(인원·음료·특이사항)
    },
    diningDraft: draft.diningDraft || null,    // 다이닝 입력 이어하기용
    ritualDraft: draft.ritualDraft || null,    // 식순 입력 이어하기용
    finalDraft: draft.finalDraft || null,      // 최종 확정 입력 이어하기·요약 표시용
    finalPolicy: { seats: FINAL_CONFIRM.착석, max: FINAL_CONFIRM.최대, unit: FINAL_CONFIRM.초과단가 }   // 프런트 계산·문구 단일 기준
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
    notifyKakao('admin.resultPicked', code, { count: n });   // 관리자: 결과물(보정본) 선택됨 · 작업 착수(카톡)
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
    notifyKakao('admin.extraSignal', code, { payer: payer });   // 관리자: 추가보정 입금신호 · 확인 필요(카톡)
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
    // 관리자 메일 — 핵심 신호 한글화 + 개선 신호(안전망) 부각 + 커피쿠폰 발송 리마인드
    var _L = {
      overall: { very: '매우만족', satisfied: '만족', neutral: '보통', low: '아쉬움' },
      recommend: { definitely: '꼭추천', maybe: '추천할만', unsure: '모르겠음' },
      gap: { none: '없음', minor: '사소하게 있음', some: '있음' },
      source: { insta: '인스타그램', friend: '지인소개', search: '검색', sns: '유튜브·블로그', etc: '그외' },
      reason: { mood: '감성·분위기', allinone: '올인원', price: '가격·투명성', review: '후기·평판', etc: '그외' }
    };
    var _lab = function (kk, vv) { return (_L[kk] && _L[kk][vv]) || vv || '-'; };
    var gapFlag = (clean.gap && clean.gap !== 'none') ? ('\n[개선 신호] 놓친 부분: ' + _lab('gap', clean.gap) + (review ? ' (후기 확인)' : '')) : '';
    var headLine = '만족 ' + _lab('overall', clean.overall) + ' · 추천 ' + _lab('recommend', clean.recommend)
      + '\n유입 ' + _lab('source', clean.source) + ' · 결정 ' + _lab('reason', clean.reason);
    var sum = ''; for (k in clean) { if (clean.hasOwnProperty(k)) sum += k + '=' + clean[k] + '  '; }
    try {
      notifyStudio('[플랫폼] 만족도 설문 (' + code + ')',
        code + ' · ' + product + '\n' + headLine + gapFlag
        + '\n커피쿠폰 발송 대상 (완주 감사 · 카톡 기프티콘)'
        + (review ? ('\n후기' + (reviewPublic ? '(공개동의)' : '') + ': ' + review) : '')
        + '\n\n(전체) ' + sum);
    } catch (e) {}
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
  var rec0 = _parseJsonSafe(cust.get('동의기록'));
  rec0.영수증기준일 = rec0.영수증기준일 || {};
  rec0.영수증기준일.추가보정 = fmtKST(new Date());   // 받은 날 기준(현금영수증 의무발급 5일 기한 계산용)
  touchCustomer(sheet, colOf, cust.num, { '추가보정상태': '완료', '동의기록': JSON.stringify(rec0) });
  notifyKakao('cust.paymentConfirmed', code, { kind: '추가보정' });   // 고객 안심 알림(카톡) · 다른 입금확인과 일관
  return { ok: true };
}

// [관리자] 보정 착수 — 선택완료 → 보정중. 고객 화면에 "보정 중"을 표시(선택완료=보정 대기와 구분). 결과물상태 전이만.
function adminStartRetouch(code) {
  code = String(code || '').trim().toUpperCase();
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var cust = findCustomerByCode(code);
  if (!cust) return { ok: false, error: '고객을 찾을 수 없습니다.' };
  var rs = String(cust.get('결과물상태') || '').trim();
  if (rs === '보정중') return { ok: true, already: true };
  if (rs !== '선택완료') return { ok: false, error: '고객이 컷을 선택한 뒤(선택완료)에 보정 착수할 수 있어요. (현재: ' + (rs || '대기') + ')' };
  touchCustomer(sheet, colOf, cust.num, { '결과물상태': '보정중' });
  return { ok: true };
}

// [1회 실행] Customers에 결과물 셀렉트·추가 보정 컬럼 추가(멱등) + 레거시 결과물상태 '업로드'→'원본전달'.
function addResultSelectionColumns() {
  var sheet = getCustomersSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var need = ['선택사진', '선택수', '선택확정일시', '추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명', '컨펌일시', '설문상태', '설문응답', '설문일시', '중도금상태', '중도금입금자명', '중도금입금신호', '중도금확인일시', '중도금리마인드'], added = [];
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
