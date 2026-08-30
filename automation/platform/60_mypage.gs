/**
 * Moment Edit · 통합 플랫폼 (Phase 1) — T6 마이페이지 상태 조회
 * ──────────────────────────────────────────────────────────────────────────
 * getMyState(token) → 마이페이지가 그릴 표시용 필드만 반환.
 *   { ok, name, product, stage, stageList, stageIndex, isException, nextAction, code }
 * 민감정보(비번해시·토큰·타인 데이터)는 절대 포함하지 않는다(DoD).
 */

function handleGetMyState(body) {
  var token = String((body && body.token) || '').trim();
  var s = resolveSession(token);
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };

  var r = s.row;
  var product = String(r.get('상품타입') || '').trim() || P.PRODUCT_SIGNATURE;
  var stage = String(r.get('현재단계') || '').trim() || '신청접수';

  var flow = stageFlowFor(product);
  var idx = flow.indexOf(stage);
  var isException = (STAGE_EXCEPTIONS.indexOf(stage) !== -1);

  var nextAction = nextActionFor(product, stage);
  if (stage === '시착' && String(r.get('시착동의상태') || '').trim() === '동의완료') nextAction = '시착 동의가 완료됐어요. 디렉터 확인 후 계약서를 안내드릴게요.';   // 서명 후에도 '서명하세요'로 남던 문구 보정
  /* ★★[NOW_CONTRACT_EXPIRED 2026-08-18 journey-sim 이 잡음] 서명 기한이 지나면 «지금 할 일»도 바뀐다.
     계약완료 단계의 기본 문구는 «계약금을 입금해 주세요»다. 그런데 72시간이 지나 계약서가 만료되면
     화면에서 결제 칸이 사라지고 «계약서 재요청» 버튼만 남는다 —
     **낼 곳이 없는데 내라고 말하는 화면**이 된다(실렌더로 확인).
     그 자리에서 두 분이 할 수 있는 일은 하나뿐이니, 그 하나를 말한다.
     ★위 시착 보정과 같은 모양이다 — 단계는 그대로 두고 «지금 할 일»만 상태에 맞춘다. */
  if (stage === '계약완료' && String(r.get('계약상태') || '').trim() === '발송') {
    var _sentAt = _parseKstStr(r.get('계약서발송일시'));
    if (_sentAt && Date.now() > _sentAt.getTime() + CONTRACT.서명기한시간 * 3600 * 1000) {
      nextAction = '계약서 서명 기한이 지났어요. 아래에서 다시 요청하시면 새 계약서를 보내드릴게요.';
    }
  }

  return {
    ok: true,
    name: customerNames(r),                 // 표시명 (신랑 · 신부)
    groom: String(r.get('신랑이름') || ''),
    bride: String(r.get('신부이름') || ''),
    product: product,                        // '시그니처' / '웨딩스냅'
    stage: stage,                            // 현재단계 라벨
    stageList: flow,                         // 진행바 라벨 세트(상품별)
    stageIndex: idx,                         // 진행바 내 현재 위치(-1=정상경로 밖)
    isException: isException,                // 취소·노쇼·미계약 여부
    nextAction: nextAction, // "지금 할 일" 한 문장
    code: String(r.get('개인코드') || ''),    // 코드 복사용
    kakao: (CONFIG.KAKAO_URL && String(CONFIG.KAKAO_URL).charAt(0) !== '[') ? CONFIG.KAKAO_URL : '', // 카톡 문의(미설정 시 빈값)
    consult: buildConsultState(String(r.get('개인코드') || '')),  // [P1.5 작업3] 상담/촬영 행 조인(없으면 null)
    fitting: buildFittingState(r),  // [02-2] 시착 동의 카드용(게이트·서명·약관). 동의기록 JSON은 비노출
    contractInfo: buildContractInfoState(r),  // [02-2.5] 상담완료 · 계약 정보 입력/요청 카드(예식일·생년월일·주소)
    contract: buildContractState(r),  // [02-3] 계약서 카드용(발송·기한·서명). 동의기록 JSON은 비노출
    payment: buildPaymentState(r),  // [02-4] 계약금 입금 카드용(납부액·잔금 안내·입금상태). 계약 서명 후 노출
    midpayment: buildMidState(r),   // [02-4b] 중도금 카드용(결제 마일스톤·D-30). 계약 후 첫 실결제
    balance: buildBalanceState(r),  // [02-5] 잔금 카드용(결제 마일스톤·단계 아님). 제작 단계에서 노출
    production: buildProductionState(r),  // [03] 제작 화면(기초정보·3트랙). 입금완료/제작중에 노출
    invitation: buildInvitationState(r),  // [04] 청첩장 트랙(draft·발행 결과). 제작 단계에 노출
    result: buildResultState(r),  // [05] 결과물 단계(예식완료/결과물전달). 링크 표시(읽기). 없으면 null
    coupon: buildCouponState(r),  // [보상] 커피쿠폰 — 관리자가 발급하면 마이페이지에 바코드 표시(없으면 null)
    ledger: buildLedgerState(r),  // [02-6] '내 내역' · 결제·현금영수증·서류를 단계와 무관하게 한곳에(없으면 null)
    refund: buildRefundQuote(r),  // [02-8] 지금 취소 시 환불 예상(계약서 7조·9조·4조⑧ · 70_journey). 서명완료 또는 예약금 입금 후에만 · 취소·노쇼·미계약은 null
    change: buildChangeState(r),  // [02-9] 예식일 변경(계약서 8조① · 70_journey). 서명완료·시그니처만 · {request,used,history,eligible}(없으면 null)
    hold: buildHoldState(r),  // [①] 예식일 임시 고정(가예약) 상태 · 검토 중/승인. 계약 서명 전까지만(없으면 null)
    refundBank: buildRefundBankState(r),  // [환불 안전망] 종료(취소·노쇼·미계약) 고객 환불 계좌 셀프 제출 카드(없으면 null)
    payPolicy: (typeof PAYMENT !== 'undefined') ? { balanceDays: (typeof _balanceDaysFor === 'function' ? _balanceDaysFor(r) : PAYMENT.잔금일수전), midDays: PAYMENT.중도금일수전 } : null,  // [정책 서빙][SNAP_BALANCE_D7] 프론트 D-day 판정 기준 — 잔금은 상품별(시그 9 · 스냅 7)
    rollbackNotice: buildRollbackNotice(r),   // [ROLLBACK_NOTICE] 관리자가 단계를 되돌린 사실 안내(해소되면 자동으로 null)
    waiting: _journeyWaiting(r),  // [02-1] 관리자 대기 구간 한 줄(카드 없는 갭). 없으면 ''
    aiToken: _aiWidgetToken_(String(r.get('개인코드') || ''))  // [AI_WIDGET_HMAC] 식순 AI 위젯 embed 신원 증명(시크릿 미설정이면 빈값 · 프론트는 그냥 안 보냄)
  };
}

// [AI_WIDGET_HMAC 2026-07-25] 식순 AI 위젯 embed 신원 토큰 — "code.exp.sig(base64url)".
//   시크릿 = ScriptProperty 'AI_WIDGET_SECRET'(Vercel env 동일 값과 쌍). 미설정이면 빈값 반환(전환기 종전 동작).
//   getMyState마다 재발급(유효 24h)이라 사실상 상시 유효 · 회수는 시크릿 교체로. Vercel(/api/ritual-advisor)이 재계산 대조.
function _aiWidgetToken_(code) {
  try {
    if (!code) return '';
    var secret = PropertiesService.getScriptProperties().getProperty('AI_WIDGET_SECRET') || '';
    if (!secret) return '';
    var exp = Math.floor(Date.now() / 1000) + 24 * 3600;
    var payload = code + '.' + exp;
    var sig = Utilities.computeHmacSha256Signature(payload, secret);
    return payload + '.' + Utilities.base64EncodeWebSafe(sig).replace(/=+$/, '');
  } catch (e) { return ''; }
}

// [환불 안전망] 종료 고객 환불 계좌 제출 상태 — 수령분이 있고 환불 미완료면 노출.
//   계좌는 Bookings.환불계좌에 저장(셀프 취소·관리자 환불송금 큐와 단일 소스).
function buildRefundBankState(r) {
  if (!r) return null;
  var stage = String(r.get('현재단계') || '').trim();
  if (STAGE_EXCEPTIONS.indexOf(stage) === -1) return null;
  if (_parseJsonSafe(r.get('동의기록')).환불완료) return null;          // 이미 송금 완료
  var bk = null; try { bk = findRowByPersonalCode(String(r.get('개인코드') || '').trim()); } catch (e) {}
  var paid = String(r.get('입금상태') || '').trim() === '확인' || (bk && String(bk.get('입금확인') || '').trim() === '확인');
  if (!paid) return null;                                               // 수령분 없음 — 환불 카드 불요
  // [환불 기준일 정합] 관리자 송금 큐(admin.gs)와 동일하게 '취소일' 기준으로 고정 — 오늘 기준이면 위약 구간이 넘어갈 때마다 고객 표시액이 실제 송금액과 벌어짐
  var _cxYmd = ''; try { _cxYmd = _ymdOf(bk && bk.get('취소일시')); } catch (e) {}
  var q = null; try { q = _refundQuote(r, _cxYmd || _kstYmd(new Date())); } catch (e) {}
  var refund = (q && !q.pending && q.refund != null) ? Math.round(Number(q.refund)) : null;
  if (refund != null && refund <= 0 && !(q && q.needCount)) return null;   // 공제로 환불액 0원
  // [REFUND_CARD_NOTE 2026-07-25] 카드 수령분 여부 — 동의기록.결제수단에 '카드' 마커가 하나라도 있으면 true(카드결제 OFF면 항상 false·휴면). 마이페이지 환불카드가 '카드분은 카드로 취소' 안내를 띄우는 근거.
  var _pmR = {}; try { _pmR = _parseJsonSafe(r.get('동의기록')).결제수단 || {}; } catch (e) {}
  var _hasCard = false; for (var _pk in _pmR) { if (_pmR.hasOwnProperty(_pk) && _pmR[_pk] === '카드') { _hasCard = true; break; } }
  return {
    acct: bk ? String(bk.get('환불계좌') || '').trim() : '',
    refund: refund,
    needCount: !!(q && q.needCount),
    fitCount: q ? Math.round(Number(q.fitCount) || 0) : 0,
    card: _hasCard   // [REFUND_CARD_NOTE] 카드 수령분 있음
  };
}

// [①] 예식일 임시 고정(가예약) — 고객에게 검토 중/승인 상태를 보여줌. 계약 서명 후엔 예식일이 계약에 확정되므로 숨김.
function buildHoldState(r) {
  if (!r) return null;
  if (STAGE_EXCEPTIONS.indexOf(String(r.get('현재단계') || '').trim()) !== -1) return null;   // 취소·노쇼·미계약 → 가예약 배너 숨김(셀프취소 경로가 가예약 키를 안 지워도 화면 정합)
  if (String(r.get('계약상태') || '').trim() === '서명완료') return null;
  var h = _parseJsonSafe(r.get('동의기록')).가예약;
  if (!h || !h.date) return null;
  var st = String(h.status || '').trim();
  if (st !== '요청' && st !== '승인') return null;   // 반려=기록 삭제 → null
  if (st === '승인' && h.expires && _ymdNum(_kstYmd(new Date())) > _ymdNum(h.expires)) return null;   // 14일 만료 · 점유 자동해제(_weddingOccupancy)와 화면 일치(배너 숨김)
  return { date: String(h.date || ''), slot: String(h.slot || ''), status: st, expires: String(h.expires || '') };
}

// [보상] 커피쿠폰 — 관리자가 발급한 바코드 이미지(base64)·기한을 마이페이지에 표시. 상태 '발급'일 때만 노출.
function buildCouponState(r) {
  if (!r) return null;
  if (String(r.get('쿠폰상태') || '').trim() !== '발급') return null;
  var data; try { data = JSON.parse(String(r.get('쿠폰데이터') || '') || '{}'); } catch (e) { data = {}; }
  var imgs = (data.images && data.images.length) ? data.images : [];
  if (!imgs.length) return null;
  return {
    title: String(data.title || '스타벅스 커피 2잔'),
    images: imgs,                          // data:image/... base64 배열(바코드)
    expiry: String(data.expiry || ''),     // YYYY-MM-DD 사용기한
    issuedAt: String(data.issuedAt || ''),
    note: String(data.note || '')
  };
}
// [02-6] '내 내역' 패널 — 결제(예약금/계약금·중도금·잔금)·현금영수증(발행된 것)·서류(시착동의서·계약서)를 진행 단계와 무관하게 한곳에 모아 노출.
//   시착 동의·계약 서명·입금 중 하나라도 있으면 노출(그 전엔 내역이 없어 null). 결제 금액은 계약총액 기반(_journeyAmounts), 영수증은 _cashReceiptLedger 공통.
function buildLedgerState(r) {
  if (!r) return null;
  var isSnap = (String(r.get('상품타입') || '').trim() === '웨딩스냅');
  // 노출 시점 — 단계 게이트 없음. 예약금 입금 확인(=현금영수증 대상) 시점부터 내역이 생기므로,
  //   아래 '내용 있음' 검사(서명·시착·입금·영수증)만으로 충분. 빈 내역이면 카드 자체가 안 뜬다. (2026-06-11 사용자 지시: 첫 접속부터 영수증 확인 가능하게)
  var signed = String(r.get('계약상태') || '').trim() === '서명완료';
  var fitDone = String(r.get('시착동의상태') || '').trim() === '동의완료';
  var fitAt = String(r.get('시착동의일시') || '').trim();
  var depConfirmed = String(r.get('입금상태') || '').trim() === '확인';
  var amounts = _journeyAmounts(r.get('계약총액'), r.get('상품타입'));
  function st(v) { v = String(v || '').trim(); return v === '확인' ? '결제 완료' : (v === '완료신호' ? '확인 중' : '대기'); }   // 예약금 행('결제 완료')과 동사 통일 — 한 표 한 어휘
  // 결제 마일스톤 — 계약총액이 정해진 뒤(계약 발송~)에만 표기. 그 전엔 금액이 미정이라 결제 표를 만들지 않음(0원 행 방지).
  var payments = [];
  if (amounts) {
    // 시그: 예약금은 상담 예약 시 이미 결제됨 → 항상 '결제 완료'(입금상태는 계약금 충당 확인용 내부값이라, 그대로 '대기'로 보이면 또 내야 하는 줄 오해). 스냅: 계약금은 계약 시 결제 → 입금상태 그대로.
    if (isSnap) payments.push({ key: '예약금', label: '계약금', amount: amounts['계약금'], status: st(r.get('입금상태')), done: depConfirmed });
    else payments.push({ key: '예약금', label: '예약금', amount: PAYMENT.예약금, status: '결제 완료', done: true });
    // [정합] 시그 '계약금 잔액'(계약금 - 예약금 충당분 · 계약 시 실입금) 행 — 이게 빠져 행 합계가 총액과 어긋나고 진행률이 과소였음. 입금상태가 이 금액의 확인 상태.
    if (!isSnap) {
      var _ctrRemain = Math.max(0, Number(amounts['계약금'] || 0) - Number(PAYMENT.예약금 || 0));
      if (_ctrRemain > 0) payments.push({ key: '계약금', label: '계약금 잔액', amount: _ctrRemain, status: st(r.get('입금상태')), done: depConfirmed });
    }
    if (!isSnap) payments.push({ key: '중도금', label: '중도금', amount: amounts['중도금'], status: st(r.get('중도금상태')), done: String(r.get('중도금상태') || '').trim() === '확인',
      dueLabel: _midDueLabelFor(r), dueDate: _midDueDateFor(r) });   // 납부 기한 인지용(미납 행에만 표시) · 임박 계약(기한 과거)이면 '계약 시 함께 납부'
    var _bx = (typeof _balanceExtraInfo === 'function') ? _balanceExtraInfo(r) : { amount: 0 };   // 최종확정 인원 추가 요금 — 잔금과 단일 출처
    var _bConf = String(r.get('잔금상태') || '').trim() === '확인';
    // 확인 후에는 확정 스냅샷(기본+인원 추가)을 표시 — 현금영수증 원장(_cashReceiptLedger)과 같은 금액. 미확인은 기본+현재 추가금
    var _balSnap2 = 0; try { _balSnap2 = Math.round(Number(_parseJsonSafe(r.get('동의기록')).잔금확정금액) || 0); } catch (e) {}
    var _balShown = _bConf ? (_balSnap2 || (Number(amounts['잔금']) || 0)) : ((Number(amounts['잔금']) || 0) + (_bx.amount || 0));
    payments.push({ key: '잔금', label: '잔금', amount: _balShown, status: st(r.get('잔금상태')), done: _bConf,
      extra: (!_bConf && _bx.amount > 0) ? { standing: _bx.standing, amount: _bx.amount } : null,
      dueLabel: (typeof _balanceDueLabelFor === 'function') ? _balanceDueLabelFor(r) : _balanceDueLabel(),   // 스냅은 '촬영 N일 전' 어휘
      dueDate: _shiftYmd((typeof _payWeddingYmd === 'function') ? _payWeddingYmd(r) : r.get('예식일'), -(typeof _balanceDaysFor === 'function' ? _balanceDaysFor(r) : PAYMENT.잔금일수전)) });   // [SNAP_BALANCE_D7] 상품별 잔금 D-day · 예식일 셀 빈값이면 동의기록 폴백
  }
  // 결제 진행률 — 완료된 마일스톤 금액 합 / 총액. (작은 계약서 등 예약금이 계약금을 초과해 100%를 넘는 경우 방지)
  var paid = 0; payments.forEach(function (p) { if (p.done) paid += Number(p.amount) || 0; });
  var ledgerTotal = amounts ? amounts['총액'] : 0;
  if (ledgerTotal > 0) paid = Math.min(paid, ledgerTotal);
  // 현금영수증 — 입금 확인된 마일스톤별 상태(발행 완료 / 발급 예정) + 등록된 소득공제 번호(끝 4자리만, 안심용)
  var receipts = [], crTarget = '';
  _cashReceiptLedger(r).forEach(function (it) {
    if (it.target && !crTarget) crTarget = it.target;
    if (it.issued) receipts.push({ label: it.label, amount: it.issued.금액 || it.amount, num: it.issued.번호, state: '발행 완료', at: it.issued.at });
    else if (it.confirmed) receipts.push({ label: it.label, amount: it.amount, num: '', state: '발급 예정', at: '' });
  });
  var crTail = crTarget ? String(crTarget).replace(/[^0-9]/g, '').slice(-4) : '';
  // 서류 — 시착 동의서·계약서
  var documents = [];
  if (fitDone || fitAt) {
    var _fitRec = _parseJsonSafe(r.get('동의기록')).시착 || {};
    var _fitVer = String(_fitRec.version || (typeof FITTING_CONSENT !== 'undefined' ? FITTING_CONSENT.version : ''));
    var _fitTerms = (typeof FITTING_TERMS_BY_VERSION !== 'undefined' && FITTING_TERMS_BY_VERSION[_fitVer])
      || ((typeof FITTING_CONSENT !== 'undefined' && FITTING_CONSENT.terms) ? FITTING_CONSENT.terms : []);
    documents.push({ label: '시착 동의서', status: fitDone ? '동의 완료' : '진행 중', at: _ymdOf(fitAt), url: '',
      version: _fitVer, signedAt: fitAt,
      groom: String(r.get('신랑이름') || ''), bride: String(r.get('신부이름') || ''),
      count: (_fitRec.벌수 != null ? Number(_fitRec.벌수) : null),   // 기록된 시착 벌수(공제 산정 근거)
      terms: _fitTerms, sig: getSignatureDataUrl(String(r.get('개인코드') || ''), '시착') });   // 문서 뷰어(fitting.html)용 메타 포함
  }   // [③] 내 내역에서 동의 내용 재열람용 · sig=손글씨 서명 dataUrl 동봉(팝업에서 로딩 없이 즉시 표시)
  var clink = String(r.get('계약서링크') || '').trim();
  var _cStat = String(r.get('계약상태') || '').trim();
  if (signed || clink) documents.push({ label: '계약서', status: signed ? '서명 완료' : (_cStat === '발송' ? '서명 대기' : (_cStat || '—')), at: _ymdOf(r.get('계약서명일시')), url: clink });   // 내부값 '발송'을 고객어로
  // 보여줄 내역이 하나도 없으면(계약·시착·입금 전) 패널 자체를 숨김
  if (!(signed || fitDone || fitAt || depConfirmed || receipts.length)) return null;
  return { total: ledgerTotal, paid: paid, productLabel: isSnap ? '웨딩스냅' : '시그니처', payments: payments, receipts: receipts, cashTail: crTail, documents: documents };
}

// [02-1] 카드가 안 뜨는 "관리자 대기" 갭을 한 줄로(답답함 방지). 카드(상담·입금)가 이미 표시하는 구간은 빈값.
//   현재 핵심 갭 = 시착 동의 완료 후 ~ 계약서 발송 전(상담완료 단계).
function _journeyWaiting(r) {
  var stage = String(r.get('현재단계') || '').trim();
  var fit = String(r.get('시착동의상태') || '').trim();
  var con = String(r.get('계약상태') || '').trim();
  if (stage === '상담완료' && fit === '동의완료' && (con === '' || con === '미발송')) return _ymdOf(r.get('예식일')) ? '계약서를 준비하고 있어요' : '';   // 요청(예식일 입력) 후에만 '준비 중'
  return '';
}

// [P1.5 작업3] 개인코드로 상담예약 행을 조인해 마이페이지 "상담/촬영" 카드용 상태 구성.
// 상담행 없으면 null(원자성 실패 케이스 — 마이페이지는 에러 없이 렌더). 상담토큰·비번 등 민감필드는 내보내지 않음.
function buildConsultState(code) {
  code = String(code || '').trim();
  if (!code) return null;
  var cr = findRowByPersonalCode(code);     // consultation-booking 전역
  if (!cr) return null;

  var status = String(cr.get('상태') || '').trim();
  var dateKey = cr.get('선택날짜');
  var time = String(cr.get('선택시간') || '').trim();
  var consultToken = String(cr.get('토큰') || '');
  var locked = (status === ST.APPROVED || status === ST.CONFIRMED);  // LOCKED_STATES
  var within = locked ? withinCancelDeadline(dateKey, time) : false; // 변경/취소 = 확정 + 24h 전(KST)
  var picked = (status === ST.PICKED);                               // 시간선택완료(디렉터 확인 대기) · 확정 전이라 자유 변경/취소

  return {
    status: status,                                  // 신청접수·시간선택완료·승인완료·확정·변경제안·취소
    date: dateKey ? prettyDate(dateKey) : '',        // 표시용
    time: time,
    canChange: within || picked,
    canCancel: within || picked,
    scheduleUrl: consultToken ? (scheduleUrl(consultToken) + '&me=1') : '',  // ?page=schedule&token=&me=1 (마이페이지 진입 → 완료 후 마이페이지 복귀)
    cancelUrl: (within && consultToken) ? cancelPageUrl(consultToken) : '',  // [③-1] 예약취소 → 자사몰 momentedit.kr/cancel(이메일 취소와 동일 경로 · GAS HtmlService Drive오류 우회). 확정+24h前에만.
    proposedDate: cr.get('변경제안날짜') ? prettyDate(cr.get('변경제안날짜')) : '',
    proposedTime: String(cr.get('변경제안시간') || '').trim(),
    proposedNote: String(cr.get('변경제안메모') || '').trim()
  };
}


/* ★★[ROLLBACK_NOTICE 2026-08-17 사용자 지시 "관리자에의해 되돌라갔다 … 고객마이페이지 화면에
   팝업 안내가 적절하게 나왔으면좋겠어"] 되돌림 안내 — **아직 사실일 때만** 내려준다.

   왜 «아직 사실일 때만»인가:
     관리자가 되돌렸다가 곧바로 되살리는 일이 잦다(테스트·오처리 복구). 그때도 안내가 남아 있으면
     두 분은 «아직 뒤로 가 있나?» 하고 없는 문제를 걱정하게 된다. 지난 일을 말하는 안내는 소음이다.
   그래서 «지금 단계가 그때 되돌린 자리보다 앞서 있으면» 스스로 사라진다 — 지우는 사람이 없어도 된다.
   ★예외 단계(취소·노쇼·미계약)는 흐름 밖이라 위치 비교가 성립하지 않는다. 그 화면은 이미
     제 사정을 따로 말하고 있으므로(환불 안내) 여기서 또 말하지 않는다.
   ★관리자 사유는 담지 않는다 — 내부 기록이다. 고객에게 필요한 것은 «무엇이 그대로고 무엇을 다시 하나»뿐. */
function buildRollbackNotice(r) {
  var rec = _parseJsonSafe(r.get('동의기록'));
  var rb = rec && rec.단계되돌림;
  if (!rb || !rb.at) return null;
  var stage = String(r.get('현재단계') || '').trim();
  if (STAGE_EXCEPTIONS.indexOf(stage) !== -1) return null;          // 종료 고객은 환불 안내가 따로 말한다
  var flow = stageFlowFor(String(r.get('상품타입') || '').trim());
  var now = flow.indexOf(stage), was = flow.indexOf(String(rb.to || ''));
  if (now === -1 || was === -1) return null;
  if (now > was) return null;                                        // 이미 앞으로 갔다 = 해소됨 → 조용히 사라진다
  return {
    at: String(rb.at || ''),
    stage: stage,
    redo: (rb.redo || []).slice(0, 5),                               // 다시 하게 되는 것(고객이 읽을 말로 이미 바뀌어 있다)
    keep: (rb.keep || []).slice(0, 3)                                // 그대로인 것 — 안심 문구의 «근거»
  };
}
