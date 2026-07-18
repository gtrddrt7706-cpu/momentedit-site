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

  var _nqB = [];   // 손상 경고 메일 등 외부 I/O — 락 해제 후(finally) 발송
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

    var _dl0 = _prodDraftLoadSafe(cust, code, _nqB); if (!_dl0.ok) return _dl0.res;   // 손상 셀 위 저장 금지(전 트랙 보호)
    var draft = _dl0.d;
    // 이메일은 폼에서 받지 않는다 — 계정 이메일 우선, 없으면 기존 저장값 유지(85 청첩장 Couples 시드가 계속 차도록)
    var email = String((cust.get('이메일') || (draft.base && draft.base.email) || '')).trim();
    // 예식 일시도 폼에서 받지 않는다 — 계약 확정값(예식일 톱레벨 + 계약 슬롯→본예식 +1h)을 서버가 채움(청첩장·식순 단일 기준)
    var wDate = _ymdOf(cust.get('예식일')) || String((draft.base && draft.base.weddingDate) || base.weddingDate || '').trim();
    // [승자 통일] 예식시간 = 계약 슬롯 매핑 우선(마이페이지 표시와 동일 기준) · 저장된 base는 폴백 — 구버전 폼 잔존값이 청첩장·식순에 옛 시간을 찍던 문제 방지
    var _ci0 = _parseJsonSafe(cust.get('동의기록')).계약정보 || {};
    var _ctrT0 = ({ '09:00': '10:00', '12:20': '13:20', '15:40': '16:40' })[String(_ci0.weddingTime || '').trim()] || '';
    var wTime = _ctrT0 || String((draft.base && draft.base.weddingTime) || base.weddingTime || '').trim();
    var _obJ = JSON.stringify((function () { var o = draft.base ? JSON.parse(JSON.stringify(draft.base)) : {}; delete o.savedAt; return o; })());   // 확인서 해제 판정용(savedAt 제외 실변경만)
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
    var _nbJ = JSON.stringify((function () { var o = JSON.parse(JSON.stringify(draft.base)); delete o.savedAt; return o; })());
    if (draft.confirm && _obJ !== _nbJ) _prodConfirmVoid(draft);   // [예식 확인서] 기초정보(이름·일시) 실변경도 확인 해제
    var upd = { '제작임시저장': JSON.stringify(draft), '제작상태': '작성중' };
    if (wDate) upd['예식일'] = wDate;   // 잔금 D-7 산출용 톱레벨 컬럼(계약 확정값 재기록 · 무해)
    upd['신랑이름'] = groomKo;            // 확인·보완 결과를 마스터에 반영
    upd['신부이름'] = brideKo;
    touchCustomer(sheet, colOf, cust.num, upd);
    setCustomerStage(code, 'produce');    // 입금완료 → 제작중 (단일 전이점)
    return { ok: true };
  } finally {
    try { lock.releaseLock(); } catch (e) {}
    _nqB.forEach(function (f) { try { f(); } catch (e) {} });   // 손상 경고 등 외부 I/O는 락 해제 후
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
  // [승자 통일] 예식시간 = 계약 슬롯 매핑 우선 · 저장값 폴백(위 handleSaveProductionBase와 동일 기준)
  var _ci = _parseJsonSafe(cust.get('동의기록')).계약정보 || {};
  var _ctrT = ({ '09:00': '10:00', '12:20': '13:20', '15:40': '16:40' })[String(_ci.weddingTime || '').trim()] || '';
  var wTime = _ctrT || String(b.weddingTime || '').trim();
  prodDraft.base = { groomKo: gKo, brideKo: bKo, groomEn: gEn, brideEn: bEn, email: email, weddingDate: wDate, weddingTime: wTime, savedAt: fmtKST(new Date()) };
  return prodDraft.base;
}

// [03-F] 최종 확정 인원 정책 = 계약서 단일 기준(착석 25 · 초과는 스탠딩 1인 50,000원 · 최대 30명)
// ★단일 출처는 여기(실청구·검증). 값 변경 시 아래 5곳의 문구·상수도 반드시 함께 동기화(놓치면 계약서·안내와 청구액이 충돌):
//   ① mypage.html MP_FINAL_POLICY(표시 기본값 · 서버 finalPolicy가 덮음) ② contract/v1-1.html 8조 법문구(고객이 서명하는 문서)
//   ③ inquiry.html 안내문+인원 검증(30명) ④ api/_kb.js AI 챗봇 KB ⑤ assets/advisor-kb.js
var FINAL_CONFIRM = { 착석: 25, 최대: 30, 초과단가: 50000 };

// [손상 방어] 제작임시저장 셀이 깨졌으면(수동 편집·붙여넣기 사고 등) 그 위에 저장하지 않는다.
//   _parseJsonSafe의 {} 폴백 위에 저장하면 좌석·청첩장·다이닝 전 트랙이 통째로 덮여 영구 유실되기 때문.
//   반환: { ok:true, d } 또는 { ok:false, res }(고객 안내 + 관리자 메일 1시간 1회 · 셀 복구 유도).
//   notifyQ(선택): 넘기면 경고 메일을 큐에 담아 호출부가 락 해제 후 발송(락 안 외부 I/O 방지) · 없으면 즉시 발송.
function _prodDraftLoadSafe(cust, code, notifyQ) {
  var raw = String(cust.get('제작임시저장') || '').trim();
  if (!raw) return { ok: true, d: {} };
  try {
    var d = JSON.parse(raw);
    if (d && typeof d === 'object' && Object.prototype.toString.call(d) !== '[object Array]') return { ok: true, d: d };
  } catch (e) {}
  try {
    var c = CacheService.getScriptCache(), ck = 'draftCorrupt_' + code;
    if (!c.get(ck)) {
      c.put(ck, '1', 3600);
      var _send = function () { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('[제작] 임시저장 JSON 손상 · ' + code + ' · 저장 차단 중(전 트랙 보호) · Customers 시트에서 해당 셀 복구 필요'); } catch (e3) {} };
      if (notifyQ && notifyQ.push) notifyQ.push(_send); else _send();
    }
  } catch (e2) {}
  return { ok: false, res: { ok: false, error: '저장 데이터 점검이 필요해 잠시 저장을 멈췄어요. 스튜디오가 확인해 도와드릴게요.' } };
}

// [예식 확인서] 확인 해제 — 제작 내용이 '실제로' 바뀐 쓰기 경로가 호출(80·85 공용). 해제되면 고객·관리자 모두 '재확인 필요'.
function _prodConfirmVoid(d) {
  if (d && d.confirm) { delete d.confirm; d.confirmStale = true; }
}
// 확인 해제 판정용 비교 문자열 — UI 상태 키(_step·_chat 등 '_' 시작)는 스냅샷과 무관하므로 제외.
//   guideinfo의 showSeat(자리 찾기 노출 토글)도 스냅샷 비노출이라 제외 → 토글만 눌러도 확인이 풀리는 재확인 피로 방지.
function _prodUiStrip(json, track) {
  try {
    var o = JSON.parse(json);
    for (var k in o) { if (k.charAt(0) === '_') delete o[k]; }
    if (track === 'guideinfo') delete o.showSeat;
    return JSON.stringify(o);
  } catch (e) { return String(json); }
}

// [03] 다이닝·식순·최종확정 트랙 입력 저장(점진적) → 제작임시저장.{track}Draft + tracks.{track} 갱신.
//   handleSaveInvitationDraft 와 같은 패턴. done=true 면 완료, 아니면 진행중(이미 완료면 완료 유지).
function handleSaveProductionTrack(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var track = String((body && body.track) || '').trim();
  if (track !== 'dining' && track !== 'ritual' && track !== 'final' && track !== 'seat' && track !== 'guideinfo' && track !== 'confirm') return { ok: false, error: '알 수 없는 항목입니다.' };
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
  // 좌석 배치도: 저장 전 정규화(테이블·좌석 수·문자열 길이 상한 → 시트 셀·표시 안전). 개인정보 최소화(이름만).
  if (track === 'seat') {
    var sdr = (body && body.draft) || {};
    var _tbls = (Object.prototype.toString.call(sdr.tables) === '[object Array]') ? sdr.tables : [];
    var outT = [];
    for (var ti = 0; ti < _tbls.length && outT.length < 20; ti++) {
      var _t = _tbls[ti] || {};
      var _seats = (Object.prototype.toString.call(_t.seats) === '[object Array]') ? _t.seats : [];
      var _drk = (Object.prototype.toString.call(_t.drinks) === '[object Array]') ? _t.drinks : [];
      var _os = [], _od = [];
      for (var si = 0; si < _seats.length && _os.length < 12; si++) {
        _os.push(String(_seats[si] || '').slice(0, 24));
        var _dv = String(_drk[si] || '');   // 자리별 음료: '' · N(논알콜) · A(알콜) · J(주스)
        _od.push((_dv === 'N' || _dv === 'A' || _dv === 'J') ? _dv : '');
      }
      outT.push({
        name: String(_t.name || '').slice(0, 24),
        side: (String(_t.side || 'L') === 'R') ? 'R' : 'L',
        seats: _os,
        drinks: _od
      });
    }
    body.draft = { tables: outT, note: String(sdr.note || '').slice(0, 200), _step: sdr._step || 0 };
  }
  // 하객 안내 설정: 자리 찾기·라이브 토글만 — 오시는 길·드레스코드 입력 폐지(2026-07-17 사용자 지시 · 자체 홀 고정, 어른 하객 예우)
  if (track === 'guideinfo') {
    var gir = (body && body.draft) || {};
    body.draft = {
      showSeat: gir.showSeat !== false,                 // 자리 찾기 노출(기본 ON)
      seatMode: (String(gir.seatMode || '') === 'all') ? 'all' : 'mine',   // 좌석 공개 범위 — 기본 '내 자리만'(프라이빗 웨딩 심리 · 전체 배치도는 부부가 명시적으로 켤 때만)
      reserveTime: String(gir.reserveTime || '').slice(0, 40),   // 식사 예약 시간 — 하객 안내 식사 섹션에 표기(종료 후 집결 혼란 방지)
      reserveName: String(gir.reserveName || '').slice(0, 30)    // 예약자 이름
    };   // 라이브 노출은 청첩장 파트 결정(디지털 참석)에서 자동 파생 — 이중 토글 폐지(2026-07-17 사용자 지시)
  }
  // [예식 확인서] 페이로드 검증·정규화는 락 밖 — 불량 요청(빈 스냅샷·형식 오류)이 락과 시트 읽기를 소모하지 않게. 완료 게이트만 락 안(d 필요)
  var _cs = null;
  if (track === 'confirm') {
    _cs = ((body && body.draft) || {}).snap;
    if (Object.prototype.toString.call(_cs) !== '[object Array]' || !_cs.length) return { ok: false, error: '확인할 내용이 없어요.' };
    _cs = _cs.slice(0, 30).map(function (x) { return { k: String((x && x.k) || '').slice(0, 24), v: String((x && x.v) || '').slice(0, 300) }; });
  }
  var _notifyQ = [];   // 알림(메일·알림톡)은 외부 I/O — 락 안에서 보내면 다른 고객 저장이 waitLock 15초를 소진할 수 있어, 결정만 락 안에서 하고 발송은 finally(락 해제 직후)에서. finally 안 flush라 early return에도 유실 없음
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 제작 단계가 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    var _dl = _prodDraftLoadSafe(cust, code, _notifyQ); if (!_dl.ok) return _dl.res;   // 손상 셀 위 저장 금지(전 트랙 보호) · 경고 메일은 큐로(락 밖 발송)
    var d = _dl.d;
    // [예식 확인서] 전 파트 스냅샷+시각 저장(면책) — 식순·최종 확정 완료 후에만 · 이후 트랙 수정 시 자동 해제(아래 invalidation)
    if (track === 'confirm') {
      if (((d.tracks || {}).ritual) !== '완료' || ((d.tracks || {}).final) !== '완료') return { ok: false, error: '식순과 최종 확정을 완료한 뒤 확인할 수 있어요.' };
      // core = 서버가 저장된 초안에서 직접 뽑은 핵심 수치 — 화면 텍스트(snap)만 믿지 않는 확인 기록(구버전 탭·변조 대비 · 관리자 대조용)
      var _fd = d.finalDraft || {}, _rd = d.ritualDraft || {}, _dd = d.diningDraft || {}, _sd = d.seatDraft || {}, _tr = d.tracks || {};
      var _tc = 0, _pn = 0;
      if (Object.prototype.toString.call(_sd.tables) === '[object Array]') { _tc = _sd.tables.length; _sd.tables.forEach(function (t) { (((t || {}).seats) || []).forEach(function (v) { if (String(v || '').trim()) _pn++; }); }); }
      d.confirm = { at: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'), snap: _cs,
        core: { heads: String(_fd.headcount || ''), standing: Number(_fd.standing) || 0, extraFee: Number(_fd.extraFee) || 0, drink: String(_fd.drink || ''),
          course: String((_rd.summary || {}).course || ''), venue: String(_dd.venue || _dd.venuePick || ''), seatTables: _tc, seatNames: _pn,
          tracks: { invitation: _tr.invitation || '', dining: _tr.dining || '', ritual: _tr.ritual || '', final: _tr.final || '', seat: _tr.seat || '' } } };
      delete d.confirmStale;
      touchCustomer(sheet, colOf, cust.num, { '제작임시저장': JSON.stringify(d) });
      _notifyQ.push(function () { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('예식 확인서 확인 완료 · ' + code + ' · 확인 내용은 관리자 페이지 고객 카드 참조'); } catch (e) {} });
      return { ok: true, confirm: d.confirm };
    }
    var _wasDone = (d.tracks && d.tracks[track]) === '완료';   // 완료 전이 1회 감지용(재저장 반복 알림 방지)
    var _prevFinal = (track === 'final') ? (d.finalDraft || {}) : null;   // 재확정 변경 감지(인원·음료·잔수 바뀌면 요금·준비가 달라져 관리자 재통지)
    var _oldDraftJ = JSON.stringify(d[track + 'Draft'] || {});   // 확인서 해제 판정용(실변경만 해제)
    d[track + 'Draft'] = (body && body.draft) || {};
    // [예식 확인서] 확인 후 '내용 실변경'만 자동 해제(재확인 필요 · 면책 무결성) — 위저드 열고 그대로 나가기·_step 이동·자리찾기 토글은 확인 유지(재확인 피로 방지)
    if (d.confirm && _prodUiStrip(_oldDraftJ, track) !== _prodUiStrip(JSON.stringify(d[track + 'Draft'] || {}), track)) _prodConfirmVoid(d);
    d.tracks = d.tracks || {};
    if (body && body.done) d.tracks[track] = '완료';
    else if (d.tracks[track] !== '완료') d.tracks[track] = '진행중';
    var _upd = { '제작임시저장': JSON.stringify(d) };   // 시트 쓰기 병합용 — 토큰 발급분까지 담아 touchCustomer 1회로(락 보유시간 단축)
    // 좌석 배치 완료 → 공개 조회 토큰 1회 발급(seat.html?t=…). 이미 있으면 유지(링크·QR 안정). 미완료로 되돌려도 토큰은 보존(재공유 안정).
    var _seatToken = '';
    if (track === 'seat') {
      _seatToken = String(cust.get('좌석공유토큰') || '').trim();
      if (body && body.done && !_seatToken) {
        _seatToken = 'S' + Utilities.getUuid().replace(/-/g, '').slice(0, 15);   // 16자 · 공개 링크 키(개인코드와 분리)
        _upd['좌석공유토큰'] = _seatToken;
      }
    }
    // 하객 안내 허브 공개 토큰 — 다이닝/좌석/안내정보 중 '하객에게 보여줄 내용이 실제로 있는' 완료에만 1회 발급(guide.html?g=…). 이미 있으면 유지(링크·QR 안정).
    //   내용 검사: 다이닝 없이(N)·미정 문구만, 빈 좌석, 전부 빈 안내정보로는 발급 안 함 — 이름·날짜만 있는 빈 안내 링크가 배포되는 것 방지(final 제외와 같은 취지).
    var _guideToken = colOf['안내공유토큰'] ? String(cust.get('안내공유토큰') || '').trim() : '';   // 마이그레이션 전(열 없음)이면 발급 생략(에러 방지)
    if (colOf['안내공유토큰'] && ['dining', 'seat'].indexOf(track) !== -1 && body && body.done && !_guideToken) {
      var _gHas = false, _gd = (body && body.draft) || {};
      if (track === 'dining') {
        var _gvp = String(_gd.venuePick || '').trim();
        _gHas = String(_gd.dining_on || '') !== 'N'
          && ((((_gd._favs) || []).length > 0) || (_gvp && ['직접 섭외할게요', '상담 때 함께 정할게요', '장소 미정', '다이닝 없이 진행할게요'].indexOf(_gvp) === -1));
      } else if (track === 'seat') {
        _gHas = ((_gd.tables) || []).some(function (t) { return ((t && t.seats) || []).some(function (s) { return String(s || '').trim(); }); });   // 이름 하나라도 있어야
      }
      if (_gHas) {
        _guideToken = 'G' + Utilities.getUuid().replace(/-/g, '').slice(0, 15);   // 16자 · 공개 링크 키(개인코드와 분리)
        _upd['안내공유토큰'] = _guideToken;
      }
    }
    touchCustomer(sheet, colOf, cust.num, _upd);
    // [재배선 2026-06-16] 다이닝 '장소 미정'으로 완료 → 디렉터가 추천·예약 도와줄 신호(1회).
    //   옛 트리거('상담 때 함께 정할게요' 선택)는 그 선택지가 UI에서 제거돼 죽은 조건이었음 → 신규 흐름(식당 카드만)에 맞춰
    //   '특정 식당을 못 정한 채 마무리'를 신호로. 식당을 골랐거나 다이닝 안 함(N)이면 발사 안 함.
    if (track === 'dining' && body && body.done && !_wasDone) {
      var _ddr = (body && body.draft) || {};
      var _vp = String(_ddr.venuePick || '').trim();
      if (_ddr.dining_on !== 'N' && (!_vp || _vp === '장소 미정' || _vp === '상담 때 함께 정할게요')) {
        _notifyQ.push(function () { notifyKakao('admin.diningConsult', code); });   // 락 해제 후 발송
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
          _notifyQ.push(function () { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('최종확정 변경 · 잔금 기결제 · 인원 추가요금 ' + _feePrev5.toLocaleString() + '원 → ' + _feeNow5.toLocaleString() + '원 · 차액 정산 필요 · ' + code); } catch (e) {} });
        }
        _notifyQ.push(function () { notifyKakao('admin.finalConfirm', code, {
          head: _f.headcount || '-',
          standing: Number(_f.standing) || 0,
          fee: Number(_f.extraFee) || 0,
          drink: String(_f.drink || ''),
          soft: parseInt(String(_f.softCount || '').replace(/[^0-9]/g, ''), 10) || 0,
          note: (String(_f.allergy || '').trim() || String(_f.cake || '').trim() || String(_f.videoLink || '').trim()) ? '특이사항 있음(관리자 페이지 확인)' : '',
          changed: (_wasDone && _changed)   // 완료 후 변경분(요금·준비 재확인 필요)
        }); });
      }
    }
    // 좌석 공개 조회 캐시 무효화 — 좌석 저장·자리찾기 토글(guideinfo) 변경이 하객 화면에 즉시 반영되게(캐시 5분을 기다리지 않음).
    //   remove만으론 '저장 전에 시트를 읽기 시작한 하객 요청'이 뒤늦게 put해 옛 데이터를 되살릴 수 있어(put-after-remove 레이스),
    //   6분 톰스톤(seatv_inv_)을 함께 심는다 — handleSeatView가 톰스톤을 보면 캐시를 읽지도, 새로 넣지도 않음(TTL 300보다 길게).
    if (track === 'seat' || track === 'guideinfo') {
      try {
        var _svTok = (track === 'seat') ? _seatToken : String(cust.get('좌석공유토큰') || '').trim();
        if (_svTok) { var _svc2 = CacheService.getScriptCache(); _svc2.put('seatv_inv_' + _svTok, '1', 360); _svc2.remove('seatv_' + _svTok); _svc2.remove('seatf_' + _svTok); }   // seatf_=이름 검색용 원본 캐시도 함께
      } catch (e) {}
    }
    var _res = { ok: true };
    if (d.confirmStale) _res.confirmStale = true;   // [예식 확인서] 이번 저장으로(또는 이미) 확인이 해제된 상태 — 프론트가 확인 완료 화면을 '재확인 필요'로 즉시 갱신
    if (track === 'seat') _res.seatToken = _seatToken;
    if (_guideToken) _res.guideToken = _guideToken;   // 하객 안내 허브 링크(guide.html?g=…) 준비됨 → 마이페이지가 공유 UI 구성
    // ★배포 시차 감지용 에코백 — 실제 저장된 객체(d[track+'Draft'])를 돌려줘 프론트가 필드 소실을 즉시 감지(2026-07 음료 소실 사고 재발 방지).
    //   서버 정규화가 있는 트랙(seat·final·guideinfo)만 상시 에코 — dining·ritual은 정규화 없이 원본 그대로 저장돼 소실 여지가 없고,
    //   에코하면 자동저장(별 담기 등)마다 응답이 배로 커지므로 완료 저장 때만 에코(미래에 정규화가 생기면 그때도 감지됨).
    if (track === 'seat' || track === 'final' || track === 'guideinfo' || (body && body.done)) _res.draft = d[track + 'Draft'] || {};
    return _res;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
    _notifyQ.forEach(function (f) { try { f(); } catch (e) {} });   // 락 해제 직후 발송(early return 포함 모든 경로) — 실패해도 저장 결과에는 영향 없음
  }
}

// 하객 공개 링크 자동 만료 — 예식 후 이 일수가 지나면 좌석·안내 링크를 닫는다(개인정보: 하객 이름이 무기한 노출되지 않게).
//   예식일 미정이면 만료하지 않음(날짜가 없으면 기준이 없음). 서버 시각(KST) 기준.
var GUIDE_EXPIRE_DAYS = 30;
function _guideExpired(weddingYmd) {
  var m = String(weddingYmd || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return false;
  if (typeof _dayDiff === 'function' && typeof _kstYmd === 'function') {   // 코드베이스 표준 KST 판정(admin.gs 헬퍼) — 프로젝트 타임존 설정과 무관하게 정확
    var _dd = _dayDiff(String(weddingYmd).trim(), _kstYmd(new Date()));   // 예식까지 남은 일수(음수=지남)
    return _dd != null && _dd < -GUIDE_EXPIRE_DAYS;
  }
  var wed = new Date(+m[1], +m[2] - 1, +m[3]); wed.setHours(0, 0, 0, 0);   // 폴백(헬퍼 부재) — 서버 타임존 기준
  var today = new Date(); today.setHours(0, 0, 0, 0);
  return (today - wed) > GUIDE_EXPIRE_DAYS * 86400000;
}

// [좌석 배치도] 공개 조회 — seat.html이 토큰으로 호출(무인증·읽기 전용). 이름·측·좌석만 반환(연락처·금액 등 비노출).
//   토큰은 좌석공유토큰 열 역조회. 없거나 배치 비었으면 not found. 개인정보 최소(하객 이름·부부 이름·예식일).
function handleSeatView(body) {
  var token = String((body && body.t) || '').trim();
  if (!token || token.length < 8 || token.length > 40) return { ok: false, error: '잘못된 주소예요.' };
  if (body && String(body.q || '').trim()) return _seatFindByToken(token, String(body.q));   // q 있으면 이름 검색 모드(명단 비전송) — 디스패처 추가 없이 같은 액션 재사용
  // 예식 당일 하객 수십 명이 QR을 동시 스캔하는 버스트 대비 — ok 응답만 5분 캐시(GAS 동시실행 한도·시트 I/O 보호).
  //   좌석 저장·자리찾기 토글 변경은 handleSaveProductionTrack이 즉시 무효화(토글 약속 유지).
  //   톰스톤(seatv_inv_) 있으면 캐시를 읽지도 넣지도 않음 — 저장 직전 시작된 요청이 옛 데이터를 되넣는 레이스 차단.
  var _svc = null, _fresh = false; try { _svc = CacheService.getScriptCache(); } catch (e) {}
  if (_svc) {
    try { _fresh = !!_svc.get('seatv_inv_' + token); } catch (e) {}
    if (!_fresh) { var _hit = _svc.get('seatv_' + token); if (_hit) { try { return JSON.parse(_hit); } catch (e) {} } }
  }
  var cust = _findCustomerBy('좌석공유토큰', token, false);
  if (!cust) return { ok: false, error: '배치를 찾을 수 없어요.' };
  if (_guideExpired(_ymdOf(cust.get('예식일')))) return { ok: false, expired: true, error: '예식이 끝나 좌석 안내가 닫혔어요.' };   // 예식 후 자동 만료(개인정보)
  var d = _parseJsonSafe(cust.get('제작임시저장'));
  if ((d.guideinfoDraft || {}).showSeat === false) return { ok: false, error: '좌석 안내가 비공개로 설정됐어요.' };   // 부부의 '자리 찾기 허용' OFF — 이미 배포된 seat 링크·QR에도 즉시 적용(토글 약속 이행)
  // [좌석 공개 범위] 기본 '내 자리만' — 전체 배치도(명단)는 부부가 '전체 공개'를 켠 경우에만 내려준다.
  //   이미 배포된 seat 링크·QR에도 즉시 적용: 프론트(seat.html)가 mineOnly를 받으면 검색 전용 화면으로 전환(죽은 링크 없음).
  if (String((d.guideinfoDraft || {}).seatMode || 'mine') !== 'all') {
    var _mo = { ok: false, mineOnly: true, seat: { groom: String(cust.get('신랑이름') || ''), bride: String(cust.get('신부이름') || ''), date: _ymdOf(cust.get('예식일')) || '' } };
    if (_svc && !_fresh) { try { _svc.put('seatv_' + token, JSON.stringify(_mo), 300); } catch (e) {} }   // 정상 상태 응답이라 캐시 — 모드 변경 시 저장 측 톰스톤이 즉시 무효화
    return _mo;
  }
  var sd = d.seatDraft || {};
  var tables = (Object.prototype.toString.call(sd.tables) === '[object Array]') ? sd.tables : [];
  if (!tables.length) return { ok: false, error: '아직 배치가 없어요.' };
  var out = tables.map(function (t) {
    t = t || {};
    var seats = (Object.prototype.toString.call(t.seats) === '[object Array]') ? t.seats : [];
    return { name: String(t.name || ''), side: (String(t.side || 'L') === 'R') ? 'R' : 'L', seats: seats.map(function (s) { return String(s || ''); }) };
  });
  var _resp = {
    ok: true,
    seat: {
      groom: String(cust.get('신랑이름') || ''),
      bride: String(cust.get('신부이름') || ''),
      date: _ymdOf(cust.get('예식일')) || '',
      tables: out
    }
  };
  if (_svc && !_fresh) { try { _svc.put('seatv_' + token, JSON.stringify(_resp), 300); } catch (e) {} }   // 오류 응답은 캐시하지 않음 · 톰스톤 중엔 put도 금지(레이스 차단)
  return _resp;
}

// [좌석 이름 검색] '내 자리만' 모드의 서버 검색 — 하객 명단을 기기로 보내지 않고, 일치한 테이블 번호·이름만 답한다.
//   seatView 액션에 q가 실려 오면 여기로(디스패처 무변경). 응답에 하객 이름은 절대 담지 않음(테이블 라벨만).
//   원본 테이블은 seatf_ 키로 5분 캐시(예식 당일 검색 버스트 대비) · 저장 측 톰스톤(seatv_inv_)을 똑같이 존중.
function _seatFindByToken(token, q) {
  q = String(q || '').replace(/[\s　]+/g, '').toLowerCase();   // 공백(전각 포함) 제거 — 편집기 저장·하객 입력 어느 쪽이든 매칭(seat.html·guide.html과 동일 규칙)
  if (!q || q.length > 30) return { ok: false, error: '성함을 입력해 주세요.' };
  var _svc = null, _fresh = false, tables = null;
  try { _svc = CacheService.getScriptCache(); } catch (e) {}
  if (_svc) {
    try { _fresh = !!_svc.get('seatv_inv_' + token); } catch (e) {}
    if (!_fresh) { var _hit = _svc.get('seatf_' + token); if (_hit) { try { tables = JSON.parse(_hit); } catch (e) {} } }
  }
  if (!tables) {
    var cust = _findCustomerBy('좌석공유토큰', token, false);
    if (!cust) return { ok: false, error: '배치를 찾을 수 없어요.' };
    if (_guideExpired(_ymdOf(cust.get('예식일')))) return { ok: false, expired: true, error: '예식이 끝나 좌석 안내가 닫혔어요.' };
    var d = _parseJsonSafe(cust.get('제작임시저장'));
    if ((d.guideinfoDraft || {}).showSeat === false) return { ok: false, error: '좌석 안내가 비공개로 설정됐어요.' };
    var sd = d.seatDraft || {};
    var raw = (Object.prototype.toString.call(sd.tables) === '[object Array]') ? sd.tables : [];
    tables = raw.map(function (t) {   // 검색에 필요한 최소만 캐시(음료 등 내부 필드 제외)
      t = t || {};
      var seats = (Object.prototype.toString.call(t.seats) === '[object Array]') ? t.seats : [];
      return { name: String(t.name || ''), side: (String(t.side || 'L') === 'R') ? 'R' : 'L', seats: seats.map(function (s) { return String(s || ''); }) };
    });
    if (_svc && !_fresh) { try { _svc.put('seatf_' + token, JSON.stringify(tables), 300); } catch (e) {} }
  }
  if (!tables.length) return { ok: false, error: '아직 배치가 없어요.' };
  // 행순서 번호 = seat.html·guide.html·좌석표 프린트와 동일(위→아래 · 좌 1·3·5 / 우 2·4·6)
  var Ls = [], Rs = [];
  tables.forEach(function (t, i) { (String((t || {}).side || 'L') === 'R' ? Rs : Ls).push(i); });
  var num = {}, nn = 1, mr = Math.max(Ls.length, Rs.length);
  for (var rr = 0; rr < mr; rr++) { if (rr < Ls.length) num[Ls[rr]] = nn++; if (rr < Rs.length) num[Rs[rr]] = nn++; }
  var hits = [];
  tables.forEach(function (t, i) {
    var got = ((t && t.seats) || []).some(function (s) { var nm = String(s || '').replace(/[\s　]+/g, '').toLowerCase(); return nm && nm.indexOf(q) >= 0; });
    if (!got) return;
    var _no = num[i] || (i + 1), _c = String((t && t.name) || '').trim();
    hits.push({ no: _no, label: (_c && !/^테이블\s*\d+$/.test(_c)) ? _c : ('테이블 ' + _no) });
  });
  return { ok: true, hits: hits.slice(0, 5) };   // 상한 — 흔한 성 광범위 매칭이어도 응답 최소(이름은 원래 미포함)
}

// [하객 안내 허브] 공개 조회 — guide.html이 토큰으로 호출(무인증·읽기 전용). 하객에게 보여줄 안내만 반환.
//   토큰은 안내공유토큰 열 역조회. 다이닝(담은 곳·대표)·좌석 유무·라이브(eventId) 링크 재료 · 부부 이름·예식일.
//   개인정보 최소: 부부 이름·예식일·식당 공개정보(이름·메뉴·전화·지도)만. 좌석 명단은 여기서 안 내려주고 seat 토큰으로 이름 조회(seat.html·handleSeatView 재사용).
function handleGuideView(body) {
  // [가족 청첩장 연동 · 2026-07-17] eventId 프로브 — 직접 모시는 청첩장(i-family)이 열릴 때 '하객 안내 버튼을 보여줄지'만 조회.
  //   안내 토큰이 이미 발급됐고(애프터 웨딩·좌석 완료로 보여줄 내용 있음) 만료 전일 때만 g 반환 · 그 외 {ok:false}=버튼 미노출.
  //   본문 데이터는 안 내려줌(그건 g 토큰 경로) · 디스패처 무변경(action=guideView 재사용) · 5분 캐시(하객 다수 열람 대비).
  if (body && body.byEvent && !body.g) {
    var _ev = String(body.byEvent || '').trim();
    if (!/^[a-z0-9-]{5,40}$/i.test(_ev)) return { ok: false };
    var _gc = CacheService.getScriptCache(), _gk = 'gbe_' + _ev, _gv = _gc.get(_gk);
    if (_gv) return _gv === '-' ? { ok: false } : { ok: true, g: _gv };
    var _c2 = _findCustomerBy('eventId', _ev, false);
    var _g2 = '';
    if (_c2 && !_guideExpired(_ymdOf(_c2.get('예식일')))) _g2 = String(_c2.get('안내공유토큰') || '').trim();
    try { _gc.put(_gk, _g2 || '-', 300); } catch (e) {}
    return _g2 ? { ok: true, g: _g2 } : { ok: false };
  }
  var token = String((body && body.g) || '').trim();
  if (!token || token.length < 8 || token.length > 40) return { ok: false, error: '잘못된 주소예요.' };
  var cust = _findCustomerBy('안내공유토큰', token, false);
  if (!cust) return { ok: false, error: '안내를 찾을 수 없어요.' };
  if (_guideExpired(_ymdOf(cust.get('예식일')))) return { ok: false, expired: true, error: '예식이 끝나 안내가 닫혔어요.' };   // 예식 후 자동 만료(개인정보)
  var d = _parseJsonSafe(cust.get('제작임시저장'));
  var gi = d.guideinfoDraft || {};
  var _showSeat = gi.showSeat !== false;   // 자리 찾기 노출 — 기본 ON(끄면 하객이 이름으로 자리 조회 불가)
  var _ivm = String((d.invitationDraft || {}).method || '');   // 라이브 = 청첩장 파트 결정에서 자동 파생(별도 토글 폐지 2026-07-17) — 온라인 포함(online·both) 또는 직접+QR이면 디지털 참석 준비
  var _showLive = (_ivm === 'online' || _ivm === 'both' || (_ivm === 'self' && (d.invitationDraft || {}).selfQR)) ? true : false;
  var dd = d.diningDraft || {};
  var _favs = (Object.prototype.toString.call(dd._favs) === '[object Array]') ? dd._favs : [];
  var _mapItem = function (v) {   // 하객 노출용 — 이름·메뉴·전화·지도만(내부 필드 제거)
    v = v || {};
    return { n: String(v.n || ''), m: String(v.m || ''), tel: String(v.tel || ''), url: (/^https?:/i.test(String(v.url || '')) ? String(v.url) : '') };
  };
  var restos = _favs.filter(function (v) { return v && v.src !== 'attr'; }).map(_mapItem);
  var spots = _favs.filter(function (v) { return v && v.src === 'attr'; }).map(_mapItem);
  var _pick = String(dd.venuePick || '').trim();   // 위저드 내부 선택지 문구는 하객에게 식당명이 아님 — 걸러냄('여기로 모여요 · 직접 섭외할게요' 노출 방지)
  if (['직접 섭외할게요', '상담 때 함께 정할게요', '장소 미정', '다이닝 없이 진행할게요'].indexOf(_pick) !== -1) _pick = '';
  var diningOn = String(dd.dining_on || '').trim() !== 'N' && (restos.length > 0 || spots.length > 0 || _pick !== '');
  var seatTables = (Object.prototype.toString.call((d.seatDraft || {}).tables) === '[object Array]') ? d.seatDraft.tables : [];
  return {
    ok: true,
    guide: {
      groom: String(cust.get('신랑이름') || ''),
      bride: String(cust.get('신부이름') || ''),
      date: _ymdOf(cust.get('예식일')) || '',
      dining: { on: diningOn, pick: _pick, restos: restos, spots: spots, rtime: String(gi.reserveTime || ''), rname: String(gi.reserveName || '') },   // 예약 시간·예약자 — 종료 후 별도 안내 없이 집결(오시는 길·드레스코드 섹션은 폐지 2026-07-17)
      seatToken: ((_showSeat && seatTables.length) ? String(cust.get('좌석공유토큰') || '').trim() : ''),   // 토글 ON + 배치 있으면 guide가 '내 자리 찾기'로 seatView 재사용
      seatFull: (_showSeat && String(gi.seatMode || 'mine') === 'all'),   // 좌석 공개 범위 — true면 전체 배치도 링크 노출, false(기본)면 이름 검색만(서버 검색 · 명단 비전송)
      eventId: (_showLive ? String(cust.get('eventId') || '').trim() : ''),                    // 라이브 켠 경우에만 링크 재료 전달
      live: (_showLive && String(cust.get('eventId') || '').trim()) ? true : false             // 부부가 라이브 사용 ON + eventId 있을 때만(죽은 링크 방지)
    }
  };
}
// [1회 실행] Customers에 안내공유토큰 열 추가(멱등). setupCustomers 재실행 없이 안전하게 열만 append.
function addGuideTokenColumn() {
  var sheet = getCustomersSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  if (headers.indexOf('안내공유토큰') !== -1) return '안내공유토큰 열 이미 있음';
  sheet.getRange(1, sheet.getLastColumn() + 1).setValue('안내공유토큰');
  return '안내공유토큰 열 추가됨';
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
    // 문의 때 적은 예상 하객 수 — 최종확정 위저드 프리필용(수정 가능 · 1~99만 유효).
    //   프리필이 쓰일 때만 예약시트 교차 조회(최종확정 인원이 있거나 완료면 생략 — 매 로드 불필요 조회 제거)
    expectedGuests: (function () { try { if (((draft.finalDraft || {}).headcount) || (draft.tracks || {}).final === '완료') return ''; if (typeof findRowByPersonalCode !== 'function') return ''; var bk = findRowByPersonalCode(String(r.get('개인코드') || '').trim()); var g = bk ? String(bk.get('하객') || '').replace(/[^0-9]/g, '') : ''; return (Number(g) > 0 && Number(g) < 100) ? g : ''; } catch (e) { return ''; } })()
  };
  var t = draft.tracks || {};
  return {
    entered: entered,                          // 기초정보 저장 여부(false면 입력 화면)
    base: base,
    tracks: {
      invitation: t.invitation || '시작전',    // 04 청첩장에서 갱신
      dining: t.dining || '시작전',            // 다이닝 위저드에서 갱신
      ritual: t.ritual || '시작전',            // 식순 위저드에서 갱신
      final: t.final || '시작전',              // 최종 확정 위저드에서 갱신(인원·음료·특이사항)
      seat: t.seat || '시작전'                 // 좌석 배치도(최종 확정 완료 후 열림)
    },
    diningDraft: draft.diningDraft || null,    // 다이닝 입력 이어하기용
    ritualDraft: draft.ritualDraft || null,    // 식순 입력 이어하기용
    confirm: draft.confirm || null,            // [예식 확인서] 확인 스냅샷·일시(없으면 확인 전)
    confirmStale: !!draft.confirmStale,        // 확인 후 수정됨 → 재확인 필요 표시
    finalDraft: draft.finalDraft || null,      // 최종 확정 입력 이어하기·요약 표시용
    seatDraft: draft.seatDraft || null,        // 좌석 배치도 이어하기·표시용(tables[])
    seatToken: String(r.get('좌석공유토큰') || ''),   // 공개 링크·QR 키(발급됐으면)
    guideToken: String(r.get('안내공유토큰') || ''),   // 하객 안내 허브 공개 링크·QR 키(다이닝/좌석 완료 시 발급)
    guideinfoDraft: draft.guideinfoDraft || null,      // 하객 안내 정보(오시는 길·드레스코드) 이어하기·편집용
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
        + '\n스타벅스 2잔 발송 대상 (완주 감사) · 관리자 상세에서 커피쿠폰 발급 버튼으로 바코드 등록 → 고객 마이페이지 표시 · 연락처 ' + String(cust.get('연락처') || '')
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
  if (typeof STAGE_EXCEPTIONS !== 'undefined' && STAGE_EXCEPTIONS.indexOf(String(cust.get('현재단계') || '').trim()) !== -1) return { ok: false, error: '진행이 종료된 고객이에요. (취소·노쇼·미계약)' };   // 종료 고객 입금확인 차단(영수증 큐 오생성 방지 · adminConfirmMid/Balance·_confirmDepositCore와 동일 가드)
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
