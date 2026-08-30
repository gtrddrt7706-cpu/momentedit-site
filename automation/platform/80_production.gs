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
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요. (서버 혼잡)' }; }
  try {
    var sheet = getCustomersSheet();
    var colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 제작 단계가 없습니다.' };   // 스냅이 '제작중'으로 잘못 전이되어 관리자 화면에서 사라지는 것 방지
    var stage = String(cust.get('현재단계') || '').trim();
    if (PRODUCTION_STAGES.indexOf(stage) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };

    var _cm0 = _prodColsMissingError(colOf, code, _nqB); if (_cm0) return _cm0;   // [A-1] 컬럼 미생성 상태에서의 무증상 유실 차단
    var _dl0 = _prodDraftLoadSafe(cust, code, _nqB); if (!_dl0.ok) return _dl0.res;   // 손상 컬럼 위 저장 금지(메타만 갱신 · PROD_COL_SPLIT)
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
    var _szB = _prodSizeError(draft, { cust: cust });   // [A급2·B급1] err를 삼키지 않게 사전 검사 + 행 전체 합산
    if (_szB) return { ok: false, error: _szB };
    var upd = _prodStoreCols(draft, { '제작상태': '작성중' }, { cust: cust });   // PROD_ACCESSOR
    if (wDate) upd['예식일'] = wDate;   // 잔금 D-day 산출용 톱레벨 컬럼(시그 D-9 · 스냅 D-7 — PAYMENT 단일 출처 · 계약 확정값 재기록 · 무해)
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

// ══ [PROD_COL_SPLIT 2026-07-25 · Wave 4 PR-B] 제작 데이터 = 트랙별 컬럼 + 메타 컬럼 ══
//   왜: 단일 셀(제작임시저장) 시절엔 한 트랙이 셀 한도(5만)를 밀어올리면 그 고객의 '모든' 트랙 저장이 마비됐다.
//   트랙마다 컬럼을 주면 폭주 반경이 그 트랙 안에서 끝난다(캡·손상 방어 모두 컬럼 단위로 격리).
//
//   [크로스트랙 키의 거처] base·tracks·confirm·confirmStale·eventId·invitationUrls는 어느 트랙에도 안 묶인다 → 제작_meta 전용 컬럼.
//     (특정 트랙 컬럼에 얹으면 그 트랙의 캡이 예식 확인서 스냅샷까지 게이트하게 됨 — 분리의 목적과 정반대)
//     예외 _prev(force 덮어쓰기 직전 1세대 백업)는 그 트랙의 데이터이므로 해당 트랙 컬럼에 함께 넣는다(메타 캡을 백업이 잡아먹지 않게).
//
//   [두 세대 공존] 구셀(제작임시저장)은 이 PR에서 절대 지우지 않는다.
//     · 읽기: 신 컬럼 우선 → 비어 있으면 구셀 폴백
//     · 쓰기: 구셀 미갱신·미삭제(동결). 구세대 행의 첫 저장은 '전 트랙을 한꺼번에' 이전해 반쪽 상태를 만들지 않는다.
//       (트랙 A만 저장하는 락 안에서 구셀을 비우면, 아직 안 옮긴 B·C가 그 순간 증발한다 — 지연 마이그레이션의 전형적 사고)
//     · 구셀 정리(비우기)는 운영 안정 후 별도 결정 — 라이브 문제 시 되돌아갈 창구를 1세대 남겨 둔다.
var PROD_LEGACY_COL = '제작임시저장';                 // 구세대 단일 셀(동결 · 읽기 폴백 전용)
var PROD_META_COL = '제작_meta';                      // 크로스트랙 키 전용
var PROD_TRACK_COL = { ritual: '제작_ritual', dining: '제작_dining', seat: '제작_seat', guideinfo: '제작_guideinfo', snap: '제작_snap', final: '제작_final', invitation: '제작_invitation' };
var PROD_META_KEYS = ['base', 'tracks', 'confirm', 'confirmStale', 'eventId', 'invitationUrls'];
//   컬럼별 캡 — ritual·dining은 종전 12k 유지(고객 글이 실제로 들어가는 트랙) · 나머지 20k · meta 20k.
//   합산 상한: 셀당 5만은 컬럼 분리로 풀리지만 시트 '행' 전체 한도는 그대로라 느슨한 총량 상한을 남긴다.
var PROD_CAP = { ritual: 12000, dining: 12000, meta: 20000, other: 20000, total: 120000, cellHard: 45000 };   // cellHard = 이전(마이그레이션) 중에만 적용하는 셀 하드 한도(시트 셀 5만 미만) — 기존 합법 데이터가 이전에서 막히지 않게

function _prodCols() {   // 제작 데이터가 실제로 들어있는 컬럼 전체 — 롤백 초기화·PII 파기·좌석 캐시·시트 서식이 참조하는 스키마 단일 출처
  var out = [PROD_LEGACY_COL, PROD_META_COL];
  for (var t in PROD_TRACK_COL) { if (PROD_TRACK_COL.hasOwnProperty(t)) out.push(PROD_TRACK_COL[t]); }
  return out;
}
function _prodNewCols() { return _prodCols().slice(1); }   // 구셀을 뺀 신설 컬럼만(합산 캡 대상)
// 컬럼 생성 순서 — ★제작_meta를 '마지막'에. meta가 있으면 그 행은 migrated로 판정되는데,
//   6분 타임아웃·수동 중단으로 meta만 생기면 아직 없는 트랙 컬럼 쓰기가 조용히 사라진다(writeCell이 헤더 없으면 skip).
//   meta를 끝에 두면 '전부 있거나 전부 없거나'가 되어 어중간한 상태가 생기지 않는다.
function _prodCreateOrder() { var o = []; for (var t in PROD_TRACK_COL) { if (PROD_TRACK_COL.hasOwnProperty(t)) o.push(PROD_TRACK_COL[t]); } o.push(PROD_META_COL); return o; }
// [A-1 가드] 신 컬럼이 시트에 없으면 저장을 '조용히 잃는' 대신 '시끄럽게 거부'한다.
//   writeCell은 헤더가 없으면 로그만 남기고 건너뛰는데, PR-B는 구셀에 안 쓰므로 그 저장은 어디에도 남지 않는다
//   (고객 화면엔 '저장됐어요' · 다음 로드에서 구셀 폴백으로 되돌아감 · 새 rev를 받았으니 다음 저장은 409로 굴러떨어짐).
//   배포 순서(컬럼 추가 → 배포)를 지키면 이 창은 없지만, 백업 복원·시트 재생성·부분 실행 대비로 코드에도 둔다.
function _prodColsMissing(colOf) { return _prodNewCols().filter(function (h) { return !colOf[h]; }); }
function _prodColsMissingError(colOf, code, notifyQ) {
  var miss = _prodColsMissing(colOf);
  if (!miss.length) return null;
  try {
    var c = CacheService.getScriptCache(), ck = 'prodColMiss_' + (code || '-');
    if (!c.get(ck)) {
      c.put(ck, '1', 3600);
      var _send = function () { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('[제작] 트랙 컬럼 누락으로 저장 차단 · ' + (code || '-') + ' · 없는 컬럼: ' + miss.join(', ') + ' · 80_production의 addProdTrackColumns 1회 실행 필요'); } catch (e2) {} };
      if (notifyQ && notifyQ.push) notifyQ.push(_send); else _send();
    }
  } catch (e) {}
  return { ok: false, error: '저장 준비가 아직 끝나지 않았어요. 잠시 후 다시 시도해 주세요.' };
}

// 트랙 컬럼 값 포장 — 평상시엔 draft 그대로(구조 단순). _prev가 있을 때만 {_d,_p} 래퍼(백업을 메타로 밀어내지 않기 위함).
function _prodTrackPack(draft, prev) {
  if (prev === undefined || prev === null) return (draft === undefined || draft === null) ? '' : JSON.stringify(draft);
  return JSON.stringify({ _d: (draft === undefined ? null : draft), _p: prev });
}
function _prodTrackUnpack(raw) {
  var o = _parseJsonSafe(raw);
  if (o && typeof o === 'object' && Object.prototype.toString.call(o) !== '[object Array]' && o._d !== undefined) return { draft: o._d, prev: o._p };
  return { draft: o, prev: undefined };
}

// 재조립 — get(헤더)만 받으면 행 객체(.get)든 목록 스캔(getter(rv,h))이든 같은 논리 객체를 만든다.
//   ★키 집합·값이 구세대와 동일해야 rev 지문(_prodStateRev·_prodTrackRev)이 흔들리지 않는다 →
//    없는 트랙은 {}로 채우지 않고 undefined 그대로 둔다(구셀 시절과 동일. {}로 채우면 '초안 있음'으로 오독돼 안내·표시가 달라짐).
function _prodAssemble(get) {
  var metaRaw = String(get(PROD_META_COL) || '').trim();
  var migrated = !!metaRaw;
  var legacy = null, legacyRead = false;
  function lg() { if (!legacyRead) { legacy = _parseJsonSafe(get(PROD_LEGACY_COL)); legacyRead = true; } return legacy; }   // 지연 파싱 — 신 컬럼으로 다 채워지면 구셀은 아예 안 읽는다
  var d = migrated ? _parseJsonSafe(metaRaw) : _parseJsonSafe(get(PROD_LEGACY_COL));
  for (var t in PROD_TRACK_COL) {
    if (!PROD_TRACK_COL.hasOwnProperty(t)) continue;
    var raw = String(get(PROD_TRACK_COL[t]) || '').trim();
    if (raw) {
      var up = _prodTrackUnpack(raw);
      d[t + 'Draft'] = up.draft;
      if (up.prev !== undefined) d._prev = up.prev;
    } else if (migrated) {
      var L = lg();   // 신세대인데 그 트랙만 비어 있음 → 구셀 폴백(혼재 행 · 아직 안 옮긴 트랙)
      if (L && L[t + 'Draft'] !== undefined) d[t + 'Draft'] = L[t + 'Draft'];
    }
  }
  if (!migrated) d._mig = true;   // 구셀 세대 표시 — 다음 저장에서 전 트랙 이전(저장 직전 제거되어 영속되지 않음)
  return d;
}
function _prodLoad(cust) { return cust ? _prodAssemble(function (h) { return cust.get(h); }) : {}; }
function _prodLoadRaw(getter, rv) { return _prodAssemble(function (h) { return getter(rv, h); }); }

// 직렬화 + 캡 검사 한 번에 — 같은 초안을 두 번 stringify하지 않게(호출부는 pack을 그대로 _prodStoreCols에 넘김).
//   opts.track: 그 트랙만 기록(락 시간 단축) · opts.full 또는 d._mig: 전 트랙 기록(구세대 첫 저장 = 통째 이전)
//   반환 { cols, err } — err이 있으면 저장 금지. ★stringify 실패를 ''로 삼키지 않는다(삼키면 다음 단계가 그대로 던져 '처리된 것처럼' 읽힘).
function _prodPack(d, opts) {
  opts = opts || {};
  var full = !!(d && d._mig) || opts.full === true;
  var track = opts.track || '';
  // ★[A급2] 마이그레이션은 절대 실패하면 안 된다 —
  //   구셀 시절 캡은 '전체 45,000'이라 한 트랙이 22,000자여도 합법이었다. 그 행을 옮길 때 새 트랙 캡(20,000)으로 막으면
  //   meta가 안 써져 migrated=false로 남고 → 다음 저장도 또 full → 또 초과 → 그 행은 무엇을 저장해도 영구히 무시된다.
  //   그래서 이전 중에는 셀 하드 한도(50,000 미만)만 본다. 이미 존재하는 합법 데이터는 통과시키고,
  //   캡은 '앞으로의 입력'을 막는 용도로만 쓴다(이전 후 그 트랙을 더 키우려 하면 그때 정상 거부).
  var migrating = !!(d && d._mig);
  var cols = {}, total = 0;
  function put(header, val, cap, label) {
    if (migrating) cap = Math.max(cap, PROD_CAP.cellHard);
    if (val.length > cap) return '저장할 내용이 너무 길어요(' + label + ' 현재 약 ' + val.length + '자 · 최대 ' + cap.toLocaleString() + '자). 글 길이를 조금 줄여 주세요.';
    cols[header] = val; total += val.length; return '';
  }
  var meta = {};
  for (var i = 0; i < PROD_META_KEYS.length; i++) { var k = PROD_META_KEYS[i]; if (d[k] !== undefined) meta[k] = d[k]; }
  var metaJ; try { metaJ = JSON.stringify(meta); } catch (e) { return { cols: {}, err: '저장할 내용을 정리하지 못했어요. 새로고침 후 다시 시도해 주세요.' }; }
  var err = put(PROD_META_COL, metaJ, PROD_CAP.meta, '기본·확인 정보');
  if (err) return { cols: {}, err: err };
  for (var t in PROD_TRACK_COL) {
    if (!PROD_TRACK_COL.hasOwnProperty(t)) continue;
    if (!full && t !== track) continue;   // 변경 트랙만(track이 비면 메타만 갱신 — 예: 확인서·예식일 동기화)
    var prevForT = (d._prev && String(d._prev.track || '') === t) ? d._prev : undefined;
    var val; try { val = _prodTrackPack(d[t + 'Draft'], prevForT); } catch (e2) { return { cols: {}, err: '저장할 내용을 정리하지 못했어요. 새로고침 후 다시 시도해 주세요.' }; }
    var cap = (PROD_CAP[t] !== undefined) ? PROD_CAP[t] : PROD_CAP.other;
    // [B급2] 직전본 백업(_prev)이 캡을 밀어내면 백업을 포기한다 — 고객이 쓴 글은 7,000자인데 화면이 14,000자라고 말하며
    //   거부하면 안내대로 줄여도 원인을 못 찾는다. 우선순위는 '고객 데이터 저장' > '복구용 백업 1세대'.
    if (prevForT && val.length > cap && !migrating) {
      try { val = _prodTrackPack(d[t + 'Draft'], undefined); } catch (e4) {}
    }
    err = put(PROD_TRACK_COL[t], val, cap, TRACK_LABEL_KO[t] || t);
    if (err) return { cols: {}, err: err };
  }
  // [B-6] 합산 상한은 '행 전체'를 묶어야 의미가 있다 — 이번에 쓰지 않는 컬럼의 현재 길이도 더한다.
  //   (이번 쓰기분만 더하면 트랙을 하나씩 채워 상한을 우회할 수 있어 '있는데 안 도는 가드'가 된다)
  if (opts.cust) {
    _prodNewCols().forEach(function (h) { if (cols[h] === undefined) { try { total += String(opts.cust.get(h) || '').length; } catch (e3) {} } });
  }
  var totalCap = migrating ? Math.max(PROD_CAP.total, 200000) : PROD_CAP.total;   // 이전 중에는 합산도 막지 않는다(구셀 45k 상한이라 실제로 넘을 수 없음 · 이론적 방어만)
  if (total > totalCap) return { cols: {}, err: '제작 내용 전체가 저장 한도에 가까워요(현재 약 ' + total + '자 · 최대 ' + PROD_CAP.total.toLocaleString() + '자). 긴 글을 조금 줄여 주시면 저장돼요.' };
  return { cols: cols, err: '' };
}
var TRACK_LABEL_KO = { ritual: '식순', dining: '애프터 웨딩', seat: '좌석 배치', guideinfo: '하객 안내', snap: '스냅 기획', final: '최종 확정', invitation: '청첩장' };

// 쓰기 — 시트 업데이트 맵에 병합해 반환(touchCustomer 호출은 호출부가 1회 · 락 보유시간 단축).
//   ★구셀(PROD_LEGACY_COL)은 여기서 절대 건드리지 않는다(갱신·삭제 금지 · 위 '두 세대 공존' 참조).
function _prodStoreCols(d, upd, opts) {
  opts = opts || {};
  var pk = opts.pack || _prodPack(d, opts);
  // ★[A급2] err를 삼키면 cols가 빈 {}인 채로 진행돼 '아무것도 안 쓰고 ok:true'가 된다(화면엔 저장됐어요·시트엔 없음).
  //   호출부가 pack을 미리 검사했으면 여기 도달하지 않고, 안 했으면 던져서 조용한 성공 대신 실패로 드러낸다.
  if (pk.err) throw new Error(pk.err);
  upd = upd || {};
  if (d && d._mig !== undefined) { try { delete d._mig; } catch (e) {} }   // 내부 표시는 영속 금지
  for (var h in pk.cols) { if (pk.cols.hasOwnProperty(h)) upd[h] = pk.cols[h]; }
  return upd;
}
// [DRAFT_SIZE_CAP] 저장 전 용량 검사 — 컬럼별 캡 + 신설 컬럼 합산 상한. 초과면 고객 안내 문구, 통과면 ''.
function _prodSizeError(d, opts) { return _prodPack(d, opts).err; }

// [진단 · 읽기 전용] 배포 전 점검 — 구셀 세대 행 중 '신 컬럼 캡을 넘길 트랙'이 있는지 미리 본다.
//   이전(마이그레이션) 자체는 캡을 안 보므로 막히지 않지만, 이전 후 그 트랙을 '더 수정'하려 하면 거부된다.
//   그 고객이 누구인지 배포 전에 알고 들어가려고 만든 목록(아무것도 쓰지 않음).
function checkProdCapOverflow() {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < P.DATA_START_ROW) return '대상 행 없음';
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var get = function (h) { var c = colOf[h]; return c ? vals[i][c - 1] : ''; };
    var code = String(get('개인코드') || '').trim();
    if (!code) continue;
    var d = _prodAssemble(get);
    var over = [];
    // ★메타를 먼저 본다 — meta는 모든 저장 경로에서 매번 다시 pack되므로, 초과하면 그 트랙 하나가 아니라
    //   그 행의 '전 트랙' 저장이 막힌다(실패면이 제일 넓은데 진단에서 빠지면 안 됨).
    try {
      var _mo = {}; for (var _mk = 0; _mk < PROD_META_KEYS.length; _mk++) { var _k2 = PROD_META_KEYS[_mk]; if (d[_k2] !== undefined) _mo[_k2] = d[_k2]; }
      var _ml = JSON.stringify(_mo).length;
      if (_ml > PROD_CAP.meta) over.push('meta ' + _ml + '자(캡 ' + PROD_CAP.meta + ' · 전 트랙 저장 차단)');
    } catch (eM) {}
    for (var t in PROD_TRACK_COL) {
      if (!PROD_TRACK_COL.hasOwnProperty(t)) continue;
      var v = d[t + 'Draft'];
      if (v === undefined || v === null) continue;
      var len = 0; try { len = JSON.stringify(v).length; } catch (e) { continue; }
      var cap = (PROD_CAP[t] !== undefined) ? PROD_CAP[t] : PROD_CAP.other;
      if (len > cap) over.push(t + ' ' + len + '자(캡 ' + cap + ')');
    }
    if (over.length) out.push(code + ' · ' + over.join(' · '));
  }
  var msg = out.length ? ('신 캡 초과 트랙 보유 고객 ' + out.length + '건\n' + out.join('\n')) : '초과 고객 없음 — 전 행이 신 캡 안에 들어옴';
  try { Logger.log(msg); } catch (e) {}
  return msg;
}

// [1회 실행 · 멱등] Customers에 제작 트랙 컬럼 8개 추가. addGuideTokenColumn과 같은 패턴 — ★반드시 끝에 append(열 인덱스 밀림 금지).
//   PR-B 배포 후 1회 실행. 안 하면 신 컬럼이 없어 저장이 구셀에만 남는데(읽기·쓰기 모두 폴백 동작) 기능은 계속 정상 — 조용한 미완 상태.
function addProdTrackColumns() {
  var sheet = getCustomersSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var added = [];
  _prodCreateOrder().forEach(function (h) {   // ★meta 마지막(위 주석)
    if (headers.indexOf(h) !== -1) return;
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
    headers.push(h); added.push(h);
  });
  return added.length ? ('추가됨: ' + added.join(', ')) : '제작 트랙 컬럼 이미 전부 있음';
}

// [손상 방어 · 컬럼별 격리] 제작 데이터 컬럼이 깨졌으면(수동 편집·붙여넣기 사고 등) 그 위에 저장하지 않는다.
//   _parseJsonSafe의 {} 폴백 위에 저장하면 그 컬럼의 초안이 통째로 덮여 영구 유실되기 때문.
//   ★PR-B 격리 규칙 — 분리의 존재 이유가 여기 걸린다:
//     · 메타 컬럼 손상 = 전면 차단(tracks·confirm이 거기 있어 어느 트랙도 정합하게 못 쓴다)
//     · 구세대 행(메타 없음)에서 구셀 손상 = 전면 차단(구셀이 그 행의 전부)
//     · 다른 트랙 컬럼 손상 = 그 트랙만 차단하고 나머지는 정상 저장(다이닝 1칸 깨졌다고 식순까지 막히면 분리 전보다 나쁘다)
//     · 반대 방향도 고정: 깨진 컬럼 '그 자체' 위에는 여전히 못 쓴다.
//   반환: { ok:true, d } 또는 { ok:false, res }(고객 안내 + 관리자 메일 1시간 1회 · 셀 복구 유도).
//   track(선택): 이번에 저장할 트랙. 없으면 메타만 쓰는 경로(확인서·예식일 동기화)로 보고 트랙 손상은 차단하지 않는다.
//   notifyQ(선택): 넘기면 경고 메일을 큐에 담아 호출부가 락 해제 후 발송(락 안 외부 I/O 방지) · 없으면 즉시 발송.
function _prodDraftLoadSafe(cust, code, notifyQ, track) {
  var get = function (h) { return cust.get(h); };
  var okJson = function (h) {
    var raw = String(get(h) || '').trim();
    if (!raw) return true;
    try { var o = JSON.parse(raw); return !!(o && typeof o === 'object' && Object.prototype.toString.call(o) !== '[object Array]'); } catch (e) { return false; }
  };
  var migrated = !!String(get(PROD_META_COL) || '').trim();
  var bad = [];
  if (migrated) { if (!okJson(PROD_META_COL)) bad.push(PROD_META_COL); }
  else if (!okJson(PROD_LEGACY_COL)) bad.push(PROD_LEGACY_COL);   // 이미 이전된 행의 구셀 손상은 무해(동결·폴백 대상일 뿐) → 차단하지 않음
  for (var t in PROD_TRACK_COL) { if (PROD_TRACK_COL.hasOwnProperty(t) && !okJson(PROD_TRACK_COL[t])) bad.push(PROD_TRACK_COL[t]); }
  if (bad.length) {
    try {
      var c = CacheService.getScriptCache(), ck = 'draftCorrupt_' + code;
      if (!c.get(ck)) {
        c.put(ck, '1', 3600);
        var _send = function () { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('[제작] 저장 데이터 손상 · ' + code + ' · 컬럼: ' + bad.join(', ') + ' · 해당 컬럼 저장 차단 중 · Customers 시트에서 복구 필요'); } catch (e3) {} };
        if (notifyQ && notifyQ.push) notifyQ.push(_send); else _send();
      }
    } catch (e2) {}
  }
  var blocking = bad.filter(function (h) {
    if (h === PROD_META_COL || h === PROD_LEGACY_COL) return true;              // 전면 차단
    return !!(track && PROD_TRACK_COL[track] === h);                            // 이번에 쓸 트랙만 차단
  });
  if (blocking.length) return { ok: false, res: { ok: false, error: '저장 데이터 점검이 필요해 잠시 저장을 멈췄어요. 스튜디오가 확인해 도와드릴게요.' } };
  return { ok: true, d: _prodLoad(cust) };
}

// 다이닝 위저드 내부 선택지 문구(식당명 아님) — 하객·요약 노출에서 걸러냄. 선택지 추가·수정 시 여기 한 곳만(mypage.html DN_PLACEHOLDER와 쌍)
var DN_PLACEHOLDER = ['직접 섭외할게요', '상담 때 함께 정할게요', '장소 미정', '다이닝 없이 진행할게요'];

// [예식 확인서] 확인 해제 — 제작 내용이 '실제로' 바뀐 쓰기 경로가 호출(80·85 공용). 해제되면 고객·관리자 모두 '재확인 필요'.
function _prodConfirmVoid(d) {
  if (d && d.confirm) { delete d.confirm; d.confirmStale = true; }
}
// [예식 확인서] 상태 지문(rev) — 제작 내용 전체의 결정적 해시. buildProductionState가 내려주고, 확인 요청이 되돌려 보내면
//   대조해서 '배우자의 다른 탭이 이미 바꾼 옛 화면'의 확인을 거부한다(스냅샷=화면 텍스트라 내용 검증이 안 되는 빈틈을 버전 대조로 방어).
//   상태 저장 없이 매번 계산 — 별도 카운터 관리·마이그레이션 불필요.
function _prodStateRev(d) {
  d = d || {};
  var s = '';
  try { s = JSON.stringify([d.base || {}, d.invitationDraft || {}, d.ritualDraft || {}, d.diningDraft || {}, d.finalDraft || {}, d.seatDraft || {}, d.guideinfoDraft || {}, d.tracks || {}, d.eventId || '', d.invitationUrls || null]); } catch (e) { return ''; }
  var h = 5381;
  for (var i = 0; i < s.length; i++) { h = ((h * 33) ^ s.charCodeAt(i)) >>> 0; }
  return String(h);
}
// [TRACK_REV_GUARD 2026-07-25] 트랙별 초안 지문 — 그 트랙 초안만의 해시(전체 지문 _prodStateRev와 달리 다른 트랙 저장에 안 흔들림).
//   UI 키(_step 등)는 _prodUiStrip으로 제외 — 화면 위치만 달라도 충돌로 오탐하지 않게. 두 기기 동시 편집의 조용한 덮어쓰기를 잡는다(회의 R-7).
function _prodTrackRev(d, track) {
  var j = '';
  try { j = _prodUiStrip(JSON.stringify((d || {})[track + 'Draft'] || {}), track); } catch (e) { return ''; }
  var h = 5381;
  for (var i = 0; i < j.length; i++) { h = ((h * 33) ^ j.charCodeAt(i)) >>> 0; }
  return String(h);
}
// 확인 해제 판정용 비교 문자열 — UI 상태 키(_step·_chat 등 '_' 시작)는 스냅샷과 무관하므로 제외.
//   guideinfo의 showSeat(자리 찾기 노출 토글)도 스냅샷 비노출이라 제외 → 토글만 눌러도 확인이 풀리는 재확인 피로 방지.
function _prodUiStrip(json, track) {
  try {
    var o = JSON.parse(json);
    for (var k in o) { if (k.charAt(0) === '_') delete o[k]; }
    if (track === 'guideinfo') delete o.showSeat;
    // [UISTRIP_FAVS_EXEMPT 2026-07-25 · R-9] 담은 곳(_favs)·하객 공개 토글(_favs[].show)은 확인서 해제 대상이 아니다 —
    //   확인서 다이닝 줄은 '최종 선택 장소(venue·venuePick)'만 기록하고 담은 곳 목록은 담지 않으므로(prodConfirmHtml),
    //   별을 담거나 공개를 켜고 끄는 것만으로 재확인을 요구하면 근거 없는 재확인 피로만 남는다.
    //   ※ 위 언더바 규칙이 이미 지우지만, 그 규칙을 미래에 손대도 이 의도가 조용히 깨지지 않게 명시적으로 고정(회귀 방지).
    delete o._favs;
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
  if (track !== 'dining' && track !== 'ritual' && track !== 'final' && track !== 'seat' && track !== 'guideinfo' && track !== 'snap' && track !== 'confirm') return { ok: false, error: '알 수 없는 항목입니다.' };
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
        /* ★★[SEAT_DRINK_SAVE 2026-08-16] 화이트리스트가 옛 코드(N·A·J)에 멈춰 있어 **샴페인(C)·레드와인(R)이 저장 때마다 통째로 지워졌다.**
             2026-07-19에 자리별 음료가 C·R·N 로 바뀌었는데(mypage SEAT_DRINK_LABEL) 이 줄만 따라오지 않았다.
             증상이 조용하다 — 프런트는 '저장됐어요'를 띄우고(에코 검사는 빈 값을 '정규화'로 보고 넘어간다),
             다시 열면 색점만 사라져 있다. 읽는 쪽(_seatDrinkSrv 819줄 주석)은 진작부터 'C|R|N'을 전제한다.
           A(구 알콜)·J(구 주스)는 프런트 _seatNormDrinks 가 이미 빈 값으로 정리해 보내므로 여기서 되살리지 않는다.
           ★이 목록은 mypage.html SEAT_DRINK_LABEL 과 한 벌 — 음료 코드를 늘리면 두 곳을 함께 고칠 것. */
        var _dv = String(_drk[si] || '');   // 자리별 음료: '' 미정 · C 샴페인 · R 레드와인 · N 논알콜 스파클링 · K 유아(물+의자) · Y 어린이(물)
        _od.push((_dv === 'C' || _dv === 'R' || _dv === 'N' || _dv === 'K' || _dv === 'Y') ? _dv : '');   // [KID_SEAT][KID_CHAIR 2026-08-16] K·Y 추가 — 빠뜨리면 아이 표시가 저장 때마다 조용히 지워진다(SEAT_DRINK_SAVE와 같은 사고)
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
      // ★'자리 찾기 허용(showSeat)' 토글 복원 금지 — 2026-07-17 사용자 지시로 폐지(좌석 공개는 seatMode 2안 단일 체크만). 저장도 안 함(레거시 값은 _prodUiStrip이 비교에서 제외)
      seatMode: (String(gir.seatMode || '') === 'mine') ? 'mine' : 'all',   // 좌석 공개 범위 — 기본 '전체 배치도 공개' · 체크하면 '내 자리만 검색'(2안 단일 체크 · 2026-07-17 사용자 지시)
      reserveTime: String(gir.reserveTime || '').slice(0, 40),   // 식사 예약 시간 — 하객 안내 식사 섹션에 표기(종료 후 집결 혼란 방지)
      reserveName: String(gir.reserveName || '').slice(0, 30)    // 예약자 이름
    };   // 라이브 노출은 청첩장 파트 결정(디지털 참석)에서 자동 파생 — 이중 토글 폐지(2026-07-17 사용자 지시)
    // 단체 사진 구도(예식 준비 · 본식 뒤 단체 기록) — 라벨 배열·고른 순서=촬영 순서. 전체 하객은 늘 포함이라 미저장. 최대 11개(총 12컷)·각 24자.
    //   ★비어 있으면 키 자체를 안 넣는다 — 구 드래프트(photo 없음)와 동일하게 유지해 '무변경 재저장'이 가짜 재확인을 만들지 않게(2026-07-19). 구도가 생기면 그때만 변경으로 감지돼 확인 해제
    var _photo = (Object.prototype.toString.call(gir.photo) === '[object Array]') ? gir.photo.map(function (x) { return String(x).slice(0, 24); }).filter(function (x) { return x; }).slice(0, 11) : [];
    if (_photo.length) body.draft.photo = _photo;
    // 단체 사진 연출/이벤트(예: 폰 플래시 흔들기·플라워 샤워) — 사진작가·디렉터 전달용. 다중 선택+직접 추가. 최대 8개·각 24자. 비면 키 미포함(무변경 재저장 가짜 재확인 방지 · 2026-07-19)
    //   ★[PHOTO_WISH 2026-08-16] 고객 화면에서 '고르는 카드'는 폐지됐다(아래 photoWish 로 대체). 여기 정규화는 **지우지 말 것** —
    //     새 화면을 아직 안 연 부부의 저장분이 이 키에 남아 있고, 관리자 화면·확인서가 그것을 읽는다.
    var _pfx = (Object.prototype.toString.call(gir.photoFx) === '[object Array]') ? gir.photoFx.map(function (x) { return String(x).slice(0, 24); }).filter(function (x) { return x; }).slice(0, 8) : [];
    if (_pfx.length) body.draft.photoFx = _pfx;
    /* ★★[PHOTO_WISH 2026-08-16 사용자 지시] 꼭 담고 싶은 사진 — 요청 목록. 카드 고르기를 대신한다.
       요청 하나 = { what 어떤 사진(80자) · who 누구와(40자) · ref 참고 링크(http(s)·300자) } · 최대 2개.
       ★what 이 비면 요청이 아니다 — 링크만 남은 줄은 작가가 무엇을 하라는 건지 알 수 없어 통째로 버린다.
       ★ref 는 반드시 http(s) 검사를 통과한 것만 싣는다(하객 사진 링크와 같은 규칙) — 관리자 화면이
         이 값을 그대로 <a href> 로 여는 자리라, javascript: 같은 것이 들어오면 안 된다.
       ★이 블록이 없으면 화이트리스트가 photoWish 를 통째로 버린다 — 화면엔 '저장됐어요'인데 요청이 사라진다.
         (마이페이지의 에코 검사가 그 상태를 '일부 미저장'으로 잡아 주지만, 애초에 막는 것이 맞다) */
    var _pw = [];
    if (Object.prototype.toString.call(gir.photoWish) === '[object Array]') {
      gir.photoWish.slice(0, 2).forEach(function (w) {
        if (!w || typeof w !== 'object') return;
        var what = String(w.what || '').slice(0, 80).trim();
        if (!what) return;
        var one = { what: what, who: String(w.who || '').slice(0, 40).trim() };
        var ref = String(w.ref || '').trim().slice(0, 300);
        if (/^https?:\/\//i.test(ref)) one.ref = ref;
        _pw.push(one);
      });
    }
    if (_pw.length) body.draft.photoWish = _pw;   // 비면 키 미포함(무변경 재저장 가짜 재확인 방지 · 위 photo·photoFx 와 같은 규칙)
    // 하객 사진 모으기 링크(선택) — 부부가 만든 외부 공유 앨범/오픈채팅. http(s)만·최대 300자. 하객 안내 페이지에 '사진 올리기' 버튼으로 노출. 비면 키 미포함(무변경 재저장 가짜 재확인 방지 · 2026-07-19)
    var _psu = String(gir.photoShareUrl || '').trim().slice(0, 300);
    if (/^https?:\/\//i.test(_psu)) body.draft.photoShareUrl = _psu;
  }
  // 스냅 사전기획(촬영 전 · 예식준비 전 여정 스텝) — 무드(두 공간별)·영감보드(링크)·꼭 담고 싶은 것·톤·편안함·소품·디렉터 메모. Private Snap(부부 단독) 중심.
  //   전 항목 선택 · 배열 상한·문자열 길이 esc · refs는 http/https 링크만. (2026-07-19 스냅사진 파트 · marker: SNAP_PREP_NORMALIZE)
  if (track === 'snap') {
    var snr = (body && body.draft) || {};
    var _snArr = function (v, max, len) { return (Object.prototype.toString.call(v) === '[object Array]') ? v.map(function (x) { return String(x).slice(0, len); }).filter(function (x) { return x; }).slice(0, max) : []; };
    body.draft = {
      people: _snArr(snr.people, 4, 40),          // 누가 함께 담기나요(인물·관계) — 2026-07-20 정보중심 개편
      mustPeople: String(snr.mustPeople || '').slice(0, 120),   // 꼭 챙겨 담고 싶은 분
      aboutNote: String(snr.aboutNote || '').slice(0, 200),     // 잘 나오는 각도·신경 쓰이는 점
      moodCandle: _snArr(snr.moodCandle, 6, 40),  // 옛 무드 색 타일(신규 폼엔 없음) — 하위호환 보존
      moodWhite: _snArr(snr.moodWhite, 6, 40),
      moodNote: String(snr.moodNote || '').slice(0, 300),
      refs: _snArr(snr.refs, 5, 300).filter(function (u) { return /^https?:\/\//i.test(u); }),   // 링크만(http/https) · 최대 5
      mustHaves: _snArr(snr.mustHaves, 3, 40),   // '강제 컷 목록' 아님 — 특별히 원하는 소수만(딥리서치 근거)
      toneStyle: String(snr.toneStyle || '').slice(0, 40),
      comfort: String(snr.comfort || '').slice(0, 40),
      propsNote: String(snr.propsNote || '').slice(0, 300),
      directorNote: String(snr.directorNote || '').slice(0, 500)
    };
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
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('상품타입') || '').trim() === '웨딩스냅') return { ok: false, error: '웨딩스냅은 제작 단계가 없습니다.' };
    if (PRODUCTION_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 제작 단계가 아닙니다.' };
    var _cm = _prodColsMissingError(colOf, code, _notifyQ); if (_cm) return _cm;   // [A-1] 컬럼 미생성 상태에서의 무증상 유실 차단
    /* ★[CF_CORE_TRUTH] confirm 에 `''`(격리 없음)를 넘기던 것을 `'final'` 로 바꾼다.
       confirm 은 메타만 **쓰지만** 모든 트랙을 **읽어** core 를 만든다 — 읽는 값이 손상이면 빈 도장이 찍힌다.
       그중 돈이 걸린 final 을 판정 대상으로 삼는다(다른 트랙 손상은 그 트랙 저장에서 이미 막힌다). */
    var _dl = _prodDraftLoadSafe(cust, code, _notifyQ, (track === 'confirm' ? 'final' : track)); if (!_dl.ok) return _dl.res;   // 손상 컬럼 위 저장 금지 · 경고 메일은 큐로(락 밖 발송)
    var d = _dl.d;
    // [예식 확인서] 전 파트 스냅샷+시각 저장(면책) — 식순·최종 확정 완료 후에만 · 이후 트랙 수정 시 자동 해제(아래 invalidation)
    if (track === 'confirm') {
      /* ★★[CF_CORE_TRUTH 2026-08-17 · 샌드박스 적대검증이 잡음] 확정은 **트랙 딱지가 아니라 실값**을 본다.
         옛 판은 `tracks.final === '완료'` 만 보고 통과시켰다. 그런데 그 딱지는 메타 컬럼에 있고,
         인원·요금은 `제작_final` 컬럼에 있다 — 그 컬럼이 손상되면 딱지는 '완료'로 살아 있는데 초안은 `{}` 다.
         실측: 그 상태에서 확정이 통과하고 core 가 `heads:"" extraFee:0` 으로 남았다.
         화면은 좌석에서 파생해 「하객 28명 · 추가 150,000원」을 그리고 있었으니
         **확정서·잔금·관리자 화면이 한꺼번에 비면서 15만 원이 조용히 사라진다.**
         ★확정은 되돌리기 어려운 기록이다 — 근거가 비어 있으면 찍지 않는다.
         ★같은 이유로 confirm 은 트랙 컬럼 손상도 통과시키면 안 된다(아래 `_prodDraftLoadSafe` 인자 참고). */
      if (((d.tracks || {}).ritual) !== '완료' || ((d.tracks || {}).final) !== '완료') return { ok: false, error: '식순과 최종 확정을 완료한 뒤 확인할 수 있어요.' };
      var _fdChk = d.finalDraft || {}, _hChk = parseInt(String(_fdChk.headcount || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (_hChk < 1) return { ok: false, error: '하객 인원이 저장되어 있지 않아요. 「좌석 · 음료」를 한 번 열었다 저장한 뒤 확정해 주세요.' };
      if (_hChk > FINAL_CONFIRM.최대) return { ok: false, error: '하객이 최대 ' + FINAL_CONFIRM.최대 + '명을 넘어요. 디렉터와 조정한 뒤 확정할 수 있어요.' };
      // 상태 지문 대조 — 배우자의 다른 탭이 먼저 수정했으면 옛 화면의 확인을 거부(새로고침 유도). 구버전 프런트(rev 미전송)는 검사 생략
      if (body && body.rev != null && String(body.rev) !== _prodStateRev(d)) return { ok: false, error: '내용이 갱신됐어요. 화면을 새로고침한 뒤 다시 확인해 주세요.' };
      /* ★★[CF_ONCE 2026-08-17 · 샌드박스 적대검증이 잡음] 이미 확정돼 있고 그 뒤로 바뀐 것이 없으면 **다시 찍지 않는다.**
         `_prodStateRev` 해시에 confirm 이 안 들어 있어 확정해도 지문이 그대로다 — 그래서 배우자의 두 탭이
         각자 확정을 눌러도 둘 다 통과했고(실측), 관리자 메일이 두 통 가고 시각만 나중 것으로 덮였다.
         ★멱등으로 만든다: 같은 상태의 두 번째 확정은 **첫 기록을 그대로 돌려준다**(시각을 밀지 않는다).
           고객 화면은 어느 쪽이든 '확정됨'을 보므로 달라지는 것이 없고, 기록과 메일만 한 번이 된다.
         ★내용이 바뀐 뒤의 재확정은 `confirmStale` 이 서므로 이 분기를 지나간다(정상 경로). */
      if (d.confirm && d.confirm.at && !d.confirmStale) return { ok: true, confirm: d.confirm, already: true };
      // core = 서버가 저장된 초안에서 직접 뽑은 핵심 수치 — 화면 텍스트(snap)만 믿지 않는 확인 기록(구버전 탭·변조 대비 · 관리자 대조용)
      var _fd = d.finalDraft || {}, _rd = d.ritualDraft || {}, _dd = d.diningDraft || {}, _sd = d.seatDraft || {}, _tr = d.tracks || {};
      var _tc = 0, _pn = 0;
      if (Object.prototype.toString.call(_sd.tables) === '[object Array]') { _tc = _sd.tables.length; _sd.tables.forEach(function (t) { (((t || {}).seats) || []).forEach(function (v) { if (String(v || '').trim()) _pn++; }); }); }
      d.confirm = { at: Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'), snap: _cs,
        core: { heads: String(_fd.headcount || ''), standing: Number(_fd.standing) || 0, extraFee: Number(_fd.extraFee) || 0, drink: String(_fd.drink || ''),
          course: String((_rd.summary || {}).course || ''), venue: String(_dd.venue || _dd.venuePick || ''), seatTables: _tc, seatNames: _pn,
          tracks: { invitation: _tr.invitation || '', dining: _tr.dining || '', ritual: _tr.ritual || '', final: _tr.final || '', seat: _tr.seat || '' } } };
      delete d.confirmStale;
      var _szC = _prodSizeError(d, { cust: cust });   // [A급2·B급1] 확인서 경로도 err 사전 검사 + 행 전체 합산
      if (_szC) return { ok: false, error: _szC };
      touchCustomer(sheet, colOf, cust.num, _prodStoreCols(d, {}, { cust: cust }));   // PROD_ACCESSOR — confirm은 메타 컬럼만 갱신(트랙 미지정)
      setCustomerStage(code, 'produce');   // PRODUCE_ENTRY_FIX — 확인서 경로도 조기 return이라 별도 전이(멱등)
      /* ★[CF_LOG 2026-08-17] 확정은 면책 문서인데 **되짚을 근거가 하나도 없었다** — 재확정하면 앞의 기록이
         덮이고, 처리이력도 남지 않고, 관리자 메일은 매번 같은 한 줄이라 '무엇을 언제'가 어디에도 없었다(실측).
         ①처리이력에 한 줄 남기고 ②메일에 핵심 수치를 실어, 메일함만 봐도 그날 무엇을 확정했는지 알게 한다.
         ★시트에 이력 배열을 새로 만들지는 않는다 — 제작 메타는 셀 한도가 걸려 있어(_prodSizeError) 커지면
           저장 자체가 막힌다. 되짚을 곳은 처리이력·메일 둘로 충분하다. */
      var _cLine = '예식 확인서 확정 · ' + code + ' · 하객 ' + (String(_fd.headcount || '-')) + '명'
        + ((Number(_fd.standing) || 0) > 0 ? (' · 스탠딩 ' + _fd.standing + '명 · 추가 ' + (Number(_fd.extraFee) || 0).toLocaleString() + '원') : '')
        + (_fd.drink ? (' · ' + _fd.drink) : '') + ' · 식순 ' + (String((_rd.summary || {}).course || '-')) + ' 코스'
        + ' · 좌석 ' + _tc + '테이블 ' + _pn + '명 · ' + d.confirm.at;
      try { if (typeof _recordHandler === 'function') _recordHandler(code, '예식 확인서 확정(하객 ' + (String(_fd.headcount || '-')) + '명)'); } catch (e) {}
      _notifyQ.push(function () { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail(_cLine + ' · 상세는 관리자 페이지 고객 카드 참조'); } catch (e) {} });
      return { ok: true, confirm: d.confirm };
    }
    var _wasDone = (d.tracks && d.tracks[track]) === '완료';   // 완료 전이 1회 감지용(재저장 반복 알림 방지)
    var _prevFinal = (track === 'final') ? (d.finalDraft || {}) : null;   // 재확정 변경 감지(인원·음료·잔수 바뀌면 요금·준비가 달라져 관리자 재통지)
    var _oldDraftJ = JSON.stringify(d[track + 'Draft'] || {});   // 확인서 해제 판정용(실변경만 해제)
    // [TRACK_REV_GUARD 2026-07-25] 트랙 rev 대조(락 안 · TOCTOU 없음) — 다른 기기·탭이 먼저 저장했으면 조용한 덮어쓰기 대신 충돌 반환.
    //   프론트는 code:'rev'를 받아 '최신 불러오기(권장) / 내가 쓴 내용으로 저장(force)' 2버튼. 구클라(rev 미전송)는 검사 생략(종전 동작).
    if (body && body.rev != null && !body.force && String(body.rev) !== _prodTrackRev(d, track)) {
      return { ok: false, code: 'rev', error: '다른 기기(또는 탭)에서 이 항목이 먼저 저장됐어요. 최신 내용을 확인해 주세요.',
        latest: { rev: _prodTrackRev(d, track), draft: d[track + 'Draft'] || null, tracks: d.tracks || {} } };
    }
    if (body && body.force) d._prev = { track: track, at: fmtKST(new Date()), draft: d[track + 'Draft'] || null };   // force 덮어쓰기 직전본 1세대 백업(복구 문의 대비 · 다음 force가 대체)
    // [DRAFT_SIZE_CAP 2026-07-25] ritual·dining만 정규화 없이 원문 저장돼 셀 한도(50k)를 위협 — 조기 거부(truncate 절대 금지 · 회의 W1-4).
    if (track === 'ritual' || track === 'dining') {
      var _dcJ = ''; try { _dcJ = JSON.stringify((body && body.draft) || {}); } catch (eDc) { _dcJ = ''; }
      if (_dcJ.length > 12000) return { ok: false, error: '저장할 내용이 너무 길어요(현재 약 ' + _dcJ.length + '자 · 최대 12,000자). 글 길이를 조금 줄여 주세요.' };
    }
    d[track + 'Draft'] = (body && body.draft) || {};
    // [예식 확인서] 확인 후 '내용 실변경'만 자동 해제(재확인 필요 · 면책 무결성) — 위저드 열고 그대로 나가기·_step 이동·자리찾기 토글은 확인 유지(재확인 피로 방지)
    if (track !== 'snap' && d.confirm && _prodUiStrip(_oldDraftJ, track) !== _prodUiStrip(JSON.stringify(d[track + 'Draft'] || {}), track)) _prodConfirmVoid(d);   // 스냅 사전기획은 예식 확인서 대상이 아니라 확인 해제 트리거에서 제외(2026-07-19)
    d.tracks = d.tracks || {};
    /* ★★[DONE_UNDO 2026-08-09] 아래 한 줄이 「처음부터 다시 만들기」를 무력화하고 있었다.
       옛 판: `else if (d.tracks[track] !== '완료') …` — 한 번 '완료'가 되면 **영영 안 내려간다.**
       그래서 빌더가 '비우기'로 보내는 `{S:{}, done:false}` 를 받고도 트랙은 '완료'로 남았고,
         ① 마이페이지 식순 행이 계속 ✓ 로 보이고
         ② 다시 들어갈 때 orderFill 이 done:true 로 나가 빌더가 **완성 화면**으로 열렸다.
       사용자 재현: 완료 → 처음부터 다시 → 중간에 저장 후 나가기 → 다시 들어가면 완성 화면.
       (한 번 '완료'가 된 뒤엔 그 뒤의 중간 저장도 전부 이 줄에 막혀 '완료'로 남는다)

       ★고칠 때 조심한 것 — 이 가드는 이유가 있다. 스쳐 지나가는 저장 한 번이 끝낸 항목을
         '진행중'으로 되돌리면 그것도 사고다. 그래서 **아무 done:false 나 받아 주지 않는다.**
         **초안이 비어 있을 때만** 내려 준다. 빈 초안이 '완료'인 상태는 어떤 경우에도 옳지 않다.
         비우기가 '진행중'으로 내려가면 그다음 중간 저장은 위 가드에 안 걸리므로 체인이 풀린다.
       ★어느 트랙에 실제로 닿는지 — 이 목록을 **두 번 틀렸다.** 세 번째는 코드 세션이 전 트랙을
         이 판정식에 그대로 통과시켜 뽑은 값이다(짐작으로 적지 말 것. 정규화가 앞에서 draft 를
         통째로 다시 쓰기 때문에, 트랙 코드만 읽어서는 무엇이 남는지 알 수 없다).

           닿는다   : ritual · dining · invitation · snap
           안 닿는다 : guideinfo(seatMode:'all') · seat(_step:0) · final(standing:0, extraFee:0)

         빈 문자열·빈 배열·빈 객체는 위 loop 이 건너뛰지만, **숫자 0 과 비어 있지 않은 문자열은
         안 걸린다.** 그래서 정규화가 그런 값을 심는 세 트랙은 '안 비었다'가 되어
         종전대로 완료가 안 내려간다. 안전한 쪽(안 내림)이라 버그는 아니다.
         ★첫 주석은 "전 트랙에 적용된다", 두 번째는 "guideinfo 도 닿는다"고 적었다. 둘 다 틀렸다 —
           guideinfo 는 seatMode 가 늘 'all' 로 채워져 절대 비지 않고, 대신 빠뜨린 invitation 이 닿는다.
         지금 필요한 것은 ritual 하나뿐이라 세 트랙을 억지로 맞추지 않는다 —
         맞추려면 '무엇이 빈 것인가'를 트랙마다 따로 정의해야 하고, 그건 이 버그의 몫이 아니다. */
    var _emptyDraft = (function () {
      try {
        var dd = (body && body.draft) || {};
        var ks = Object.keys(dd);
        for (var i = 0; i < ks.length; i++) {
          if (ks[i] === '_v') continue;                              // 판 번호는 내용이 아니다
          var v = dd[ks[i]];
          if (v === null || v === undefined) continue;
          if (typeof v === 'string' && !v) continue;
          if (typeof v === 'object' && !Object.keys(v).length) continue;
          return false;
        }
        return true;
      } catch (e) { return false; }                                  // 판단이 안 서면 종전대로(안 내림)
    })();
    if (body && body.done) d.tracks[track] = '완료';
    else if (d.tracks[track] !== '완료' || _emptyDraft) d.tracks[track] = '진행중';
    // [DRAFT_SIZE_CAP · PROD_COL_SPLIT] 컬럼별 캡 + 합산 상한 — 직렬화 결과(pack)를 그대로 쓰기에 넘겨 같은 초안을 두 번 stringify하지 않는다.
    var _pk = _prodPack(d, { track: track, cust: cust });   // cust = 이번에 안 쓰는 컬럼의 현재 길이까지 합산(B-6)
    if (_pk.err) return { ok: false, error: _pk.err };
    var _upd = _prodStoreCols(d, {}, { pack: _pk });   // 시트 쓰기 병합용 — 토큰 발급분까지 담아 touchCustomer 1회로(락 보유시간 단축)
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
          && ((((_gd._favs) || []).length > 0) || (_gvp && DN_PLACEHOLDER.indexOf(_gvp) === -1));
      } else if (track === 'seat') {
        _gHas = ((_gd.tables) || []).some(function (t) { return ((t && t.seats) || []).some(function (s) { return String(s || '').trim(); }); });   // 이름 하나라도 있어야
      }
      if (_gHas) {
        _guideToken = 'G' + Utilities.getUuid().replace(/-/g, '').slice(0, 15);   // 16자 · 공개 링크 키(개인코드와 분리)
        _upd['안내공유토큰'] = _guideToken;
      }
    }
    touchCustomer(sheet, colOf, cust.num, _upd);
    // ★PRODUCE_ENTRY_FIX(2026-07-25 사용자 발견 "이미 고객은 제작단계인데 관리자 페이지 단계랑 매치가 안 됨"):
    //   입금완료→제작중 전이가 handleSaveProductionBase 한 곳에만 있었는데, 기초정보 입력 화면이 폐지돼(03-1b 서버 구성)
    //   프런트가 saveProductionBase를 더는 호출하지 않음 → 전이가 영영 안 걸려 관리자 파이프라인이 '입금완료 · 제작 시작 대기'에 멈췄다.
    //   실제 제작 착수 지점(트랙 저장)에서도 전이시킨다. setCustomerStage는 멱등·역행금지라 중복 호출 안전. 제거 금지.
    setCustomerStage(code, 'produce');
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
    var _res = { ok: true, rev: _prodTrackRev(d, track) };   // [TRACK_REV_GUARD] 저장 직후의 새 트랙 지문 — 프론트가 갱신해 자기 연속 저장이 충돌로 오탐되지 않게
    if (d.confirmStale) _res.confirmStale = true;   // [예식 확인서] 이번 저장으로(또는 이미) 확인이 해제된 상태 — 프론트가 확인 완료 화면을 '재확인 필요'로 즉시 갱신
    if (track === 'seat') _res.seatToken = _seatToken;
    if (_guideToken) _res.guideToken = _guideToken;   // 하객 안내 허브 링크(guide.html?g=…) 준비됨 → 마이페이지가 공유 UI 구성
    // ★배포 시차 감지용 에코백 — 실제 저장된 객체(d[track+'Draft'])를 돌려줘 프론트가 필드 소실을 즉시 감지(2026-07 음료 소실 사고 재발 방지).
    //   서버 정규화가 있는 트랙(seat·final·guideinfo)만 상시 에코 — dining·ritual은 정규화 없이 원본 그대로 저장돼 소실 여지가 없고,
    //   에코하면 자동저장(별 담기 등)마다 응답이 배로 커지므로 완료 저장 때만 에코(미래에 정규화가 생기면 그때도 감지됨).
    if (track === 'seat' || track === 'final' || track === 'guideinfo' || track === 'snap' || (body && body.done)) _res.draft = d[track + 'Draft'] || {};
    return _res;
  } finally {
    try { lock.releaseLock(); } catch (e) {}
    _notifyQ.forEach(function (f) { try { f(); } catch (e) {} });   // 락 해제 직후 발송(early return 포함 모든 경로) — 실패해도 저장 결과에는 영향 없음
  }
}

// 하객 공개 링크 자동 만료 — 예식 후 이 일수가 지나면 좌석·안내 링크를 닫는다(개인정보: 하객 이름이 무기한 노출되지 않게).
//   예식일 미정이면 만료하지 않음(날짜가 없으면 기준이 없음). 서버 시각(KST) 기준.
var GUIDE_EXPIRE_DAYS = 30;
/* ★★[GUIDE_EXPIRE_REASON 2026-08-21 하객 경로 점검에서 잡음] 닫는 «이유»를 구분해 말한다.
   _guideExpired 는 두 경우에 닫는다: ①예식이 실제로 +30일 지났다 ②예식일을 모른다(되돌림·미기입).
   그런데 네 곳 전부 «예식이 끝나 …»라는 **한 문구**를 썼다. ②에 걸린 하객은 아직 하지도 않은 예식을
   «끝났다»고 듣고, 그 화면엔 문의처도 없다(만료 화면은 «정상 종료»라 출구를 일부러 안 붙인다).
   ★닫는 판정 자체는 그대로다 — 날짜를 모르면 개인정보는 닫는 것이 옳다(FAILCLOSED).
     바꾸는 것은 **문구와 출구**뿐이다. 판정을 열지 말 것.
   ★automation/tests/guide.test.js 12b 가 오래 붉어 있던 것이 이 자리다(main 에서도 실패). */
function _guideCloseInfo(weddingYmd) {
  var v = _guideExpired(weddingYmd);
  if (v === 'unknown') return { closed: true, reason: 'unknown', error: '안내를 준비하고 있어요. 예식 정보가 확정되면 다시 열려요.', help: true };
  if (v) return { closed: true, reason: 'past', error: '예식이 끝나 안내가 닫혔어요.', help: false };
  return { closed: false };
}
function _guideExpired(weddingYmd) {
  var m = String(weddingYmd || '').trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  /* ★★[GUIDE_EXPIRE_FAILCLOSED 2026-08-18] 예식일이 없으면 «만료»로 본다(닫는 쪽으로).
     종전엔 false(=열어 둠)였다. 그런데 되돌림으로 예식일이 지워지는 판이 있어
     (미수납 되돌림 · KEEP_MONEY_BASIS 는 수납이 있을 때만 남긴다) 그 경우 이 링크가
     **영영 만료되지 않은 채 두 분의 실명을 계속 보여 줬다**(실측 확인).
     날짜를 모르면 «아직 유효하다»고 말할 근거가 없다 — 개인정보는 모를 때 닫는다.
     ★정상 고객은 계약 시점에 예식일이 잠기므로(adminSendContract) 이 분기에 오지 않는다. */
  if (!m) return 'unknown';   // [GUIDE_EXPIRE_REASON] 닫되 «끝나서»가 아니라 «날짜를 모른다»는 사실을 구분해 돌려준다
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
  var _ci = _guideCloseInfo(_ymdOf(cust.get('예식일'))); if (_ci.closed) return { ok: false, expired: true, reason: _ci.reason, help: !!_ci.help, error: _ci.error };   // 예식 후 자동 만료(개인정보)
  var d = _prodLoad(cust);   // PROD_ACCESSOR
  // (구)showSeat 허용 토글 게이트 제거 — 2026-07-17 2안 폐지. 레거시 false 저장분이 좌석 안내를 UI 없이 영구 차단하던 막다른길 해소. ★접근 게이트 추가 시 _seatFindByToken과 쌍으로
  // [좌석 공개 범위] 부부가 '내 자리만 검색'을 켠 경우에만 전체 배치도(명단) 차단 — 기본은 전체 공개(2026-07-17 사용자 지시).
  //   이미 배포된 seat 링크·QR에도 즉시 적용: 프론트(seat.html)가 mineOnly를 받으면 검색 전용 화면으로 전환(죽은 링크 없음).
  if (String((d.guideinfoDraft || {}).seatMode || '') === 'mine') {
    var _mo = { ok: false, mineOnly: true, seat: { groom: String(cust.get('신랑이름') || ''), bride: String(cust.get('신부이름') || ''), date: _ymdOf(cust.get('예식일')) || '' } };
    if (_svc && !_fresh) { try {
      _svc.put('seatv_' + token, JSON.stringify(_mo), 300);   // 정상 상태 응답이라 캐시 — 모드 변경 시 저장 측 톰스톤이 즉시 무효화
      var _sdM = d.seatDraft || {}, _rawM = (Object.prototype.toString.call(_sdM.tables) === '[object Array]') ? _sdM.tables : [];
      if (_rawM.length) _svc.put('seatf_' + token, JSON.stringify(_rawM.map(_seatFindSlim)), 300);   // 부팅이 읽은 데이터로 검색 캐시도 채움 — 첫 이름 검색이 시트 재조회 없이 히트
    } catch (e) {} }
    return _mo;
  }
  var sd = d.seatDraft || {};
  var tables = (Object.prototype.toString.call(sd.tables) === '[object Array]') ? sd.tables : [];
  if (!tables.length) return { ok: false, error: '아직 배치가 없어요.' };
  var out = tables.map(function (t) {
    t = t || {};
    var seats = (Object.prototype.toString.call(t.seats) === '[object Array]') ? t.seats : [];
    var row = { name: String(t.name || ''), side: (String(t.side || 'L') === 'R') ? 'R' : 'L', seats: seats.map(function (s) { return String(s || ''); }) };
    /* ★★[SEAT_DRINK_NOSEND 2026-08-16 노출 점검] 전체 배치도 응답에서 **자리별 음료를 빼 둔다.**
       종전엔 하객 전원의 음료 코드를 함께 실어 보냈다. 그런데 그 값을 그리는 화면이 없다 —
       seat.html 에는 drink 라는 낱말이 아예 없고, guide.html 의 drinkHtml 을 부르는 findSeat 는
       **홍보용 데모 블록에서만** 불린다(실사용 전체 배치도는 renderFullMap 이고 이름만 쓴다).
       즉 아무도 안 쓰는데 서버만 보내고 있었고, 개발자도구 Network 에는 그대로 보였다.
       ★이건 취향이 아니라 건강·종교를 추론하게 하는 값이다 — 논알콜(N)·유아(K)·어린이(Y)가
         실명과 나란히 내려갔다. guide.html [GUIDE_DRINK] 주석은 «남의 음료는 절대 노출하지 않는다»
         라고 적어 두었는데 이 줄이 그 약속을 깨고 있었다(주석과 코드가 반대였다).
       ★본인 음료는 '내 자리만' 검색 응답(_seatFindByToken 의 완전일치 1자리)이 그대로 전달한다 —
         필요한 사람에게만 자기 것 하나가 간다. 그 경로는 손대지 않았다.
       ★전체 배치도에 음료를 다시 실으려면, 먼저 «누가 그것을 화면에 그리는가»를 정하고
         본인 자리만 보내는 방법부터 만들 것. 통째로 보내는 것은 되돌리지 말 것. */
    return row;
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
// [좌석 공용 헬퍼] 이름 정규화·행순서 번호·검색용 슬림 테이블 — seat.html·guide.html 프런트와 동일 규칙(수정 시 3면 함께)
function _seatNorm(s) { return String(s || '').replace(/[\s　]+/g, '').toLowerCase(); }   // 공백(전각 포함) 제거 — 입력·저장 어느 쪽이든 매칭
function _seatRowNum(tables) {   // 행순서 번호 = seat.html·guide.html·좌석표 프린트와 동일(위→아래 · 좌 1·3·5 / 우 2·4·6)
  var Ls = [], Rs = [];
  tables.forEach(function (t, i) { (String((t || {}).side || 'L') === 'R' ? Rs : Ls).push(i); });
  var num = {}, nn = 1, mr = Math.max(Ls.length, Rs.length);
  for (var rr = 0; rr < mr; rr++) { if (rr < Ls.length) num[Ls[rr]] = nn++; if (rr < Rs.length) num[Rs[rr]] = nn++; }
  return num;
}
function _seatFindSlim(t) {   // 검색에 필요한 최소만 — 이 객체는 서버 안에서만 돈다(응답엔 hits/room만 나감)
  t = t || {};
  var seats = (Object.prototype.toString.call(t.seats) === '[object Array]') ? t.seats : [];
  var _dk = (Object.prototype.toString.call(t.drinks) === '[object Array]') ? t.drinks : [];
  var o = { name: String(t.name || ''), side: (String(t.side || 'L') === 'R') ? 'R' : 'L', seats: seats.map(function (s) { return String(s || ''); }) };
  /* [SEAT_DRINK_SRV] 음료를 여기서 버리면 '내 자리만' 모드(기본값)에선 본인 음료조차 못 찾는다 —
     guide.html 573행이 hits[0].drink를 이미 기다리고 있었다(2026-08-02 재배포 검증에서 확정).
     ★이 슬림 객체는 클라이언트로 나가지 않는다(seatf_ 서버 캐시 + 검색용). 응답에 실리는 건
       아래 _seatFindByToken이 '정확히 일치한 본인 자리 하나'에 대해서만 꺼내는 코드 1자다. */
  if (_dk.length) o.drinks = seats.map(function (s, i) { return String(_dk[i] || '').trim().slice(0, 2); });
  return o;
}
function _seatFindByToken(token, q) {
  q = _seatNorm(q);   // seat.html·guide.html과 동일 정규화(_seatNorm 단일 출처)
  /* ★★[SEAT_Q_MIN 2026-08-16 노출 점검] 두 글자 미만은 서버에서 거절한다.
     «두 글자부터» 규칙이 seat.html·guide.html 클라이언트에만 있어, 요청을 직접 보내면
     한 글자('김')로도 검색이 돌았다 — 한 글자는 명단을 성씨 단위로 훑는 열쇠가 된다.
     ★프런트에만 있는 규칙은 규칙이 아니다. 화면과 같은 값(2)을 서버에도 둔다.
     ★상한 30자는 종전대로. */
  if (!q || q.length < 2 || q.length > 30) return { ok: false, error: '성함을 두 글자 이상 입력해 주세요.' };
  var _svc = null, _fresh = false, tables = null;
  try { _svc = CacheService.getScriptCache(); } catch (e) {}
  if (_svc) {
    try { _fresh = !!_svc.get('seatv_inv_' + token); } catch (e) {}
    if (!_fresh) { var _hit = _svc.get('seatf_' + token); if (_hit) { try { tables = JSON.parse(_hit); } catch (e) {} } }
  }
  if (!tables) {
    // ★접근 게이트(토큰 조회·만료·자리찾기 OFF)는 handleSeatView 본문과 쌍 — 게이트를 추가하면 반드시 양쪽 모두에
    var cust = _findCustomerBy('좌석공유토큰', token, false);
    if (!cust) return { ok: false, error: '배치를 찾을 수 없어요.' };
    var _ci = _guideCloseInfo(_ymdOf(cust.get('예식일'))); if (_ci.closed) return { ok: false, expired: true, reason: _ci.reason, help: !!_ci.help, error: _ci.error };
    var d = _prodLoad(cust);   // PROD_ACCESSOR
    var sd = d.seatDraft || {};   // (구)showSeat 게이트 제거 — handleSeatView와 동일(2026-07-17 2안 폐지)
    var raw = (Object.prototype.toString.call(sd.tables) === '[object Array]') ? sd.tables : [];
    tables = raw.map(_seatFindSlim);
    if (_svc && !_fresh) { try { _svc.put('seatf_' + token, JSON.stringify(tables), 300); } catch (e) {} }
  }
  if (!tables.length) return { ok: false, error: '아직 배치가 없어요.' };
  var num = _seatRowNum(tables);
  var hits = [], hitIdx = [];
  tables.forEach(function (t, i) {
    var got = ((t && t.seats) || []).some(function (s) { var nm = _seatNorm(s); return nm && nm.indexOf(q) >= 0; });
    if (!got) return;
    var _no = num[i] || (i + 1), _c = String((t && t.name) || '').trim();
    hits.push({ no: _no, label: (_c && !/^테이블\s*\d+$/.test(_c)) ? _c : ('테이블 ' + _no) });
    hitIdx.push(i);
  });
  // 단일 일치 → 홀 전체 배치(익명)+본인 자리·이름만 — 어느 테이블이 어디인지 보여 현장에서 넘버·명패 없이 바로 찾아가게(2026-07-17 사용자 지시).
  //   이름은 검색한 본인 것 하나만 응답에 담고, 나머지 자리는 점유 여부(occ)만 — 타인 명단은 어떤 형태로도 비전송.
  if (hits.length === 1) {
    var _hi = hitIdx[0], _ht = tables[_hi] || {}, _mi = [];
    (_ht.seats || []).forEach(function (s, si) { var nm = _seatNorm(s); if (nm && nm.indexOf(q) >= 0) _mi.push(si); });
    hits[0].mi = _mi;
    // 이름은 '전체 성함을 정확히 입력'한 단일 자리에만 — 부분 검색('김'·'김민')으로 타인 실명이 응답에 실리는 수집 통로 차단.
    //   같은 테이블에 부분 일치가 여럿이면(mi 2+) 이름 없이 자리들만 강조(프런트가 전체 성함 재입력 유도).
    var _exact = (_mi.length === 1) && (_seatNorm((_ht.seats || [])[_mi[0]]) === q);
    hits[0].nm = _exact ? String((_ht.seats || [])[_mi[0]] || '') : '';
    /* [SEAT_DRINK_SRV] 본인 음료 — 이름과 똑같은 게이트(정확 일치 단일 자리)를 쓴다.
       부분 검색으로는 남의 자리 정보가 한 톨도 안 나가야 하므로 코드 1자도 예외를 두지 않는다.
       내려보내는 건 'C'|'R'|'N' 한 글자뿐 — 라벨 해석은 guide.html DRINK_LABEL이 한다. */
    hits[0].drink = (_exact && Object.prototype.toString.call(_ht.drinks) === '[object Array]')
      ? String(_ht.drinks[_mi[0]] || '') : '';
    hits[0].hti = _hi;                                      // room 배열에서 본인 테이블 위치
    // ★room 형태({no,label,side,occ}) 변경 시 guide.html _roomLocal(구버전 GAS 폴백)도 함께 — 두 런타임이 같은 계약을 씀
    hits[0].room = tables.map(function (t, i) {
      var _c = String((t && t.name) || '').trim();
      return { no: num[i] || (i + 1), label: (_c && !/^테이블\s*\d+$/.test(_c)) ? _c : '', side: (String((t || {}).side || 'L') === 'R') ? 'R' : 'L',
        occ: ((t && t.seats) || []).map(function (s) { return String(s || '').trim() ? 1 : 0; }) };   // 자리 점유만(이름 없음)
    });
  }
  return { ok: true, hits: hits.slice(0, 4) };   // 상한 4 — 프런트 규약: 1=단정+홀 배치 · 2~3=후보 나열 · 4(=3 초과)=성함 더 입력 요청
}

// [하객 안내 허브] 공개 조회 — guide.html이 토큰으로 호출(무인증·읽기 전용). 하객에게 보여줄 안내만 반환.
//   토큰은 안내공유토큰 열 역조회. 다이닝(담은 곳·대표)·좌석 유무 · 부부 이름·예식일. (라이브 필드는 2026-07-18 폐지 — ★재추가 금지)
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
  var _ci = _guideCloseInfo(_ymdOf(cust.get('예식일'))); if (_ci.closed) return { ok: false, expired: true, reason: _ci.reason, help: !!_ci.help, error: _ci.error };   // 예식 후 자동 만료(개인정보)
  var d = _prodLoad(cust);   // PROD_ACCESSOR
  var gi = d.guideinfoDraft || {};
  // (구)showSeat 허용 토글 폐지(2026-07-17 2안) — 좌석 노출은 배치 유무 + seatMode만으로 결정
  // ★라이브 파생·노출 복원 금지 — 2026-07-17 사용자 지시로 하객 안내에서 라이브 섹션 삭제(오프라인 하객용 페이지 · 라이브는 온라인 청첩장이 단일 창구)
  var dd = d.diningDraft || {};
  var _favs = (Object.prototype.toString.call(dd._favs) === '[object Array]') ? dd._favs : [];
  var _mapItem = function (v) {   // 하객 노출용 — 이름·메뉴·전화·지도만(내부 필드 제거)
    v = v || {};
    return { n: String(v.n || ''), m: String(v.m || ''), tel: String(v.tel || ''), url: (/^https?:/i.test(String(v.url || '')) ? String(v.url) : '') };
  };
  var _pick = String(dd.venuePick || '').trim();   // 위저드 내부 선택지 문구는 하객에게 식당명이 아님 — 걸러냄('여기로 모여요 · 직접 섭외할게요' 노출 방지)
  if (DN_PLACEHOLDER.indexOf(_pick) !== -1) _pick = '';
  // 하객 노출 = '최종 선택(show:true)'한 곳 + 대표(여기로 예약)만 — 그냥 비교하려 담아둔 후보는 하객에 안 보임(2026-07-19 사용자 지시). 담기(_favs)와 하객 노출 분리.
  var _nnDn = function (s) { return String(s || '').replace(/[\s　]+/g, '').toLowerCase(); };
  var _pk = _nnDn(_pick);
  var restos = _favs.filter(function (v) { return v && v.src !== 'attr' && (v.show === true || (_pk && _nnDn(v.n) === _pk)); }).map(_mapItem);
  var spots = _favs.filter(function (v) { return v && v.src === 'attr' && v.show === true; }).map(_mapItem);
  var diningOn = String(dd.dining_on || '').trim() !== 'N' && (restos.length > 0 || spots.length > 0 || _pick !== '');
  var seatTables = (Object.prototype.toString.call((d.seatDraft || {}).tables) === '[object Array]') ? d.seatDraft.tables : [];
  return {
    ok: true,
    guide: {
      groom: String(cust.get('신랑이름') || ''),
      bride: String(cust.get('신부이름') || ''),
      date: _ymdOf(cust.get('예식일')) || '',
      dining: { on: diningOn, pick: _pick, restos: restos, spots: spots,
        rtime: String((dd.reserveTime != null) ? dd.reserveTime : (gi.reserveTime || '')).slice(0, 40),   // 예약 시간·예약자 — 다이닝 위저드 입력(2026-07-17 이동) · 키 자체가 없을 때만 구 guideinfo 폴백(빈 문자열='지움'은 존중 · 유령값 방지)
        rname: String((dd.reserveName != null) ? dd.reserveName : (gi.reserveName || '')).slice(0, 30) },
      seatToken: (seatTables.length ? String(cust.get('좌석공유토큰') || '').trim() : ''),   // 배치 있으면 guide가 '내 자리 찾기'로 seatView 재사용
      seatFull: (String(gi.seatMode || '') !== 'mine'),   // 좌석 공개 범위 — 기본 true(전체 배치도) · '내 자리만 검색' 체크 시 false. (eventId·live 필드 제거 2026-07-17 — 라이브 미전송)
      photoShare: (/^https?:\/\//i.test(String(gi.photoShareUrl || ''))) ? String(gi.photoShareUrl) : ''   // 하객 사진 모으기 링크 — guide가 '사진 올리기' 버튼으로 노출(부부 외부 앨범/오픈채팅 · http(s)만)
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

// ==============================================================================
// [GUEST_PHOTO_IN 2026-08-17 사용자 지시] 하객 사진을 **우리 페이지에서 바로 받는다**
//   사용자 원문: "오프라인 청첩장 하객안내 페이지에서 사진올리기 누르면 자동으로 구글 드라이브에
//   업로드되는 시스템말이야" · "문제없이 꼼꼼하게 구현해보자"
//
//   ■ 왜 외부 서비스를 안 쓰나 (3라운드 리서치를 뒤집는 것이 아니라 넘어서는 것)
//     외부 후보는 전부 대가가 있었다 — 카톡 1:1(방이 하객 수만큼 쪼개짐) · 드롭박스(하객에게
//     이름·이메일 강제 + 부부에게 알림 폭탄) · 스냅웨딩(개업 5개월 업체 서버에 3개월 보관) ·
//     WedUploader(무료·부부 드라이브 직송이지만 화면이 영어라 낯설다).
//     ★우리는 이미 하객 페이지(guide.html)와 토큰(안내공유토큰)과 드라이브 접근(DriveApp)을
//       전부 갖고 있다 — 남의 투입구를 빌릴 이유가 없었다. 여기서 받으면 화면이 한국어이고
//       우리 디자인이고, 하객은 사이트를 떠나지 않는다.
//
//   ■ 어디에 쌓나 — **스튜디오 드라이브**(부부 드라이브 아님)
//     부부 드라이브에 직접 넣으려면 부부 구글 로그인 + 구글 앱 심사 + 우리가 부부 계정 접근권을
//     보관해야 한다. 털리면 부부 드라이브가 통째로 노출되는 책임이라 값이 너무 비싸다.
//     ★대신 우리 드라이브에 받고 부부에게는 폴더 링크를 드린다. 결과물 전달(원본폴더ID)이
//       이미 우리 드라이브라 자리가 같고, 관리자 화면에서 '잘 들어왔나'를 우리가 볼 수 있다.
//     ★[PHOTOSHARE_DIRECT] 와의 관계: 그때 사용자가 거부한 것은 **우리가 받아서 손으로 옮겨 주는
//       심부름**이었다. 이건 사람 손이 없는 자동 경로라 취지에 어긋나지 않고, 사용자가 이 시스템을
//       직접 지시했다. 되돌리지 말 것.
//
//   ■ 안전 장치 (전부 이유가 있다)
//     · 토큰 게이트 — 안내공유토큰이 있어야만 받는다. 아무나 우리 드라이브에 못 쓴다.
//     · 만료 — 안내 페이지가 예식+30일에 닫히는 것과 **같은 기준**(_guideExpired)으로 막는다.
//       화면은 닫혔는데 업로드 구멍만 열려 있는 상태가 생기지 않게.
//     · 형식·크기 — 사진·영상만 · 1개 20MB. base64 는 원본의 4/3 이라 doPost 한도 안쪽이다.
//     · 총량 — 한 예식 400장·4GB. 오작동으로 같은 파일이 폭주해도 우리 드라이브가 안 터진다.
//     · 잠금 — **폴더 만들 때와 숫자 셀 때만** 짧게 건다. 파일 쓰기(느린 구간)는 잠금 밖이라
//       하객 여럿이 동시에 올려도 서로 기다리지 않는다. 잠그고 파일까지 쓰면 줄이 밀려 당일 실패한다.
//     · 열 가드 — 컬럼이 없으면 **저장을 거부한다.** writeCell 은 헤더 없는 컬럼을 조용히 건너뛰므로
//       (addProdTrackColumns 주석의 그 사고와 같은 형태) 열 없이 받으면 사진이 소리 없이 사라진다.
//
//   ■ 하객은 아무것도 안 남긴다 — 이름·연락처를 묻지 않는다(개인정보 최소). 목록도 안 보여준다
//     (하객끼리 서로의 사진이 보이면 안 된다는 조건이 이 기능의 출발점이었다).
// ==============================================================================
var GP_ROOT_FOLDER  = 'ME_하객사진';   // 스튜디오 드라이브 최상위 보관함(없으면 자동 생성)
var GP_MAX_FILE_MB  = 20;              // 파일 1개 원본 최대 — 폰 사진 8MB·짧은 영상까지 커버
var GP_MAX_FILES    = 400;             // 한 예식 총 장수 상한(남용·폭주 차단)
var GP_MAX_TOTAL_MB = 4000;            // 한 예식 총 용량 상한
var GP_KEEP_DAYS    = 180;             // 예식 후 보관일수 — 결과물 인도 6개월(계약서 12조3)과 같은 기준

function _gpRootFolder() {
  var it = DriveApp.getFoldersByName(GP_ROOT_FOLDER);
  return it.hasNext() ? it.next() : DriveApp.createFolder(GP_ROOT_FOLDER);
}

// 파일명 — 하객 폰이 준 이름을 그대로 믿지 않는다(경로·제어문자 제거). 앞에 시각을 붙여 같은 이름끼리 안 덮이게.
function _gpSafeName(raw, mime) {
  var s = String(raw || '').replace(/[\\\/:*?"<>|]/g, '').replace(/[\x00-\x1f]/g, '').replace(/^\.+/, '').trim().slice(0, 80);
  if (!s) s = 'photo';
  if (s.indexOf('.') < 0) s += '.' + (String(mime || '').split('/')[1] || 'jpg').replace(/[^a-z0-9]/gi, '');
  return Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd-HHmmss') + '_' + s;
}

// 이 부부의 하객사진 폴더 — 없으면 만들고 열에 기록. ★호출자가 잠근 상태에서 부를 것(폴더 중복 생성 방지).
function _gpFolderFor(cust, sheet, colOf) {
  if (!colOf['하객사진폴더ID']) return '';
  var fid = String(cust.get('하객사진폴더ID') || '').trim();
  if (fid) { try { DriveApp.getFolderById(fid); return fid; } catch (e) { fid = ''; } }   // 지워졌으면 새로 만든다
  var name = (String(cust.get('개인코드') || '').trim() || 'unknown') + '_' + (_ymdOf(cust.get('예식일')) || 'nodate');
  fid = _gpRootFolder().createFolder(name).getId();
  touchCustomer(sheet, colOf, cust.num, { '하객사진폴더ID': fid });
  return fid;
}

// 하객 업로드 1건 — guide.html 이 파일 하나씩 순차로 부른다(한 번에 몰아 보내지 않는 이유는 프런트 주석 참고).
function handleGuestPhoto(body) {
  body = body || {};
  var token = String(body.g || '').trim();
  if (!token || token.length < 8 || token.length > 40) return { ok: false, error: '잘못된 주소예요.' };

  var mime = String(body.mime || '').trim().toLowerCase();
  if (!/^(image|video)\/[a-z0-9.+-]+$/.test(mime)) return { ok: false, error: '사진과 영상만 올릴 수 있어요.' };

  var b64 = String(body.data || '').replace(/^data:[^,]*,/, '').replace(/\s+/g, '');
  if (!b64) return { ok: false, error: '파일이 비어 있어요.' };
  var bytes = Math.floor(b64.length * 3 / 4);
  if (bytes > GP_MAX_FILE_MB * 1048576) return { ok: false, error: '한 개에 ' + GP_MAX_FILE_MB + 'MB 까지 올릴 수 있어요.' };

  var cust = _findCustomerBy('안내공유토큰', token, false);
  if (!cust) return { ok: false, error: '안내를 찾을 수 없어요.' };
  var _ci = _guideCloseInfo(_ymdOf(cust.get('예식일'))); if (_ci.closed) return { ok: false, expired: true, reason: _ci.reason, help: !!_ci.help, error: _ci.error };

  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  // ★열 가드 — 없으면 저장하지 않는다. writeCell 이 조용히 건너뛰어 '올렸는데 없다'가 되는 것을 막는다.
  if (!colOf['하객사진폴더ID']) return { ok: false, error: '아직 준비 중이에요. 두 분께 알려 주세요.' };

  if ((Number(cust.get('하객사진수') || 0) || 0) >= GP_MAX_FILES) return { ok: false, full: true, error: '사진이 충분히 모였어요. 고맙습니다.' };
  if ((Number(cust.get('하객사진MB') || 0) || 0) * 1048576 + bytes > GP_MAX_TOTAL_MB * 1048576) return { ok: false, full: true, error: '사진이 충분히 모였어요. 고맙습니다.' };

  // (1) 폴더 확보 — 첫 하객 여럿이 동시에 눌러도 폴더가 둘 생기지 않게 짧게 잠근다.
  var lock = LockService.getScriptLock(), fid = '';
  try {
    lock.waitLock(20000);
    fid = _gpFolderFor(_findCustomerBy('안내공유토큰', token, false) || cust, sheet, colOf);
  } catch (e) {
    return { ok: false, error: '지금은 붐벼요. 잠시 뒤 다시 눌러 주세요.' };
  } finally { try { lock.releaseLock(); } catch (e2) {} }
  if (!fid) return { ok: false, error: '저장할 곳을 열지 못했어요.' };

  // (2) 파일 쓰기 — ★잠금 밖. 여기가 느린 구간이라 잠그면 하객들이 줄을 서다 당일에 실패한다.
  try {
    DriveApp.getFolderById(fid).createFile(Utilities.newBlob(Utilities.base64Decode(b64), mime, _gpSafeName(body.name, mime)));
  } catch (e) {
    return { ok: false, error: '올리다 끊겼어요. 다시 눌러 주세요.' };
  }

  // (3) 집계 — 다시 짧게 잠그고 **그때 읽은 값**에 더한다(동시 업로드로 숫자가 덮이지 않게).
  //     ★여기가 실패해도 사진은 이미 저장됐다 → 하객에게는 성공으로 답한다. 숫자는 부부 화면 표시용일 뿐이다.
  var n = (Number(cust.get('하객사진수') || 0) || 0) + 1;
  try {
    lock.waitLock(20000);
    var f2 = _findCustomerBy('안내공유토큰', token, false) || cust;
    n = (Number(f2.get('하객사진수') || 0) || 0) + 1;
    touchCustomer(sheet, colOf, f2.num, {
      '하객사진수': n,
      '하객사진MB': Math.round(((Number(f2.get('하객사진MB') || 0) || 0) + bytes / 1048576) * 10) / 10,
      '하객사진최근': fmtKST(new Date())
    });
  } catch (e) { /* 집계 실패는 사진 유실이 아니다 */ }
  finally { try { lock.releaseLock(); } catch (e3) {} }

  return { ok: true, n: n };
}

// [1회 실행] Customers 에 하객사진 열 4개 추가(멱등). ★'새 버전' 배포 _전에_ 실행할 것.
//   ★폴더ID를 **마지막**에 넣는다 — handleGuestPhoto 가 그 열 하나로 '전부 있음'을 판정하므로,
//     중간에 실패해도 '열은 반쪽인데 저장은 받는' 상태가 생기지 않는다(addProdTrackColumns 와 같은 규칙).
function addGuestPhotoColumns() {
  var sheet = getCustomersSheet(), added = [];
  ['하객사진수', '하객사진MB', '하객사진최근', '하객사진폴더ID'].forEach(function (h) {
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (v) { return String(v).trim(); });
    if (headers.indexOf(h) !== -1) return;
    sheet.getRange(1, sheet.getLastColumn() + 1).setValue(h);
    added.push(h);
  });
  return added.length ? ('추가됨: ' + added.join(', ')) : '이미 다 있음';
}

// [정리] 예식 후 GP_KEEP_DAYS(180일) 지난 하객사진 폴더를 휴지통으로 — 개인정보 보관 최소화.
//   ★기본 드라이런(로그만) · 실제 삭제는 purgeGuestPhotos(false). 결과물 인도 6개월과 같은 기준이라
//     부부가 받아 갈 시간을 충분히 준 뒤에만 지운다.
function purgeGuestPhotos(dryRun) {
  if (dryRun !== false) dryRun = true;
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  if (!colOf['하객사진폴더ID']) return '하객사진 열 없음(할 일 없음)';
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return '대상 없음';
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  var done = [];
  for (var i = 0; i < vals.length; i++) {
    var r = rowFromValues(colOf, vals[i], P.DATA_START_ROW + i);
    var fid = String(r.get('하객사진폴더ID') || '').trim(); if (!fid) continue;
    var wed = _ymdOf(r.get('예식일')); if (!wed) continue;
    var dd = (typeof _dayDiff === 'function' && typeof _kstYmd === 'function') ? _dayDiff(wed, _kstYmd(new Date())) : null;
    if (dd == null || dd >= -GP_KEEP_DAYS) continue;   // 아직 보관 기간 안
    done.push(String(r.get('개인코드') || '') + '(' + wed + ')');
    if (!dryRun) {
      try { DriveApp.getFolderById(fid).setTrashed(true); } catch (e) {}
      touchCustomer(sheet, colOf, r.num, { '하객사진폴더ID': '' });   // 링크만 끊는다 · 장수 기록은 남겨 둔다
    }
  }
  var msg = (dryRun ? '[드라이런] ' : '[실행] ') + '정리 대상 ' + done.length + '건' + (done.length ? ' - ' + done.join(', ') : '');
  Logger.log(msg); return msg;
}
function purgeGuestPhotosApply() { return purgeGuestPhotos(false); }   // GAS 편집기는 인자를 못 넘긴다 - 실행용 래퍼

// [03] 마이페이지 제작 화면 상태 — 입금완료/제작중일 때. 기초정보(없으면 Customers 프리필) + 3트랙 상태.
//   내부 draft 원본은 노출하지 않고 표시에 필요한 base·tracks만.
function buildProductionState(r) {
  if (!r) return null;
  if (String(r.get('상품타입') || '').trim() === '웨딩스냅') return null;   // 스냅은 제작/청첩장 단계 없음 · 시그 전용 카드 노출·잘못된 '제작중' 전이 방지
  var stage = String(r.get('현재단계') || '').trim();
  if (PRODUCTION_STAGES.indexOf(stage) === -1) return null;
  var draft = _prodLoad(r);   // PROD_ACCESSOR
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
      seat: t.seat || '시작전',                // 좌석 배치도(최종 확정 완료 후 열림)
      snap: t.snap || '시작전'                 // 스냅 사전기획(촬영 전 · 예식준비 전 여정 스텝)
    },
    snapDraft: draft.snapDraft || null,        // 스냅 사전기획 이어하기·요약·진행바 스텝 상태용
    diningDraft: draft.diningDraft || null,    // 다이닝 입력 이어하기용
    ritualDraft: draft.ritualDraft || null,    // 식순 입력 이어하기용
    confirm: draft.confirm || null,            // [예식 확인서] 확인 스냅샷·일시(없으면 확인 전)
    confirmStale: !!draft.confirmStale,        // 확인 후 수정됨 → 재확인 필요 표시
    rev: _prodStateRev(draft),                 // 상태 지문 — 확인 요청이 되돌려 보내 옛 화면 확인을 서버가 거부(다중 탭 안전)
    trackRevs: (function () {   // [TRACK_REV_GUARD] 트랙별 초안 지문 — 저장 요청이 되돌려 보내면 다른 기기의 선저장을 감지(조용한 덮어쓰기 방지)
      var o = {}; ['dining', 'ritual', 'final', 'seat', 'guideinfo', 'snap'].forEach(function (t) { o[t] = _prodTrackRev(draft, t); }); return o;
    })(),
    finalDraft: draft.finalDraft || null,      // 최종 확정 입력 이어하기·요약 표시용
    seatDraft: draft.seatDraft || null,        // 좌석 배치도 이어하기·표시용(tables[])
    seatToken: String(r.get('좌석공유토큰') || ''),   // 공개 링크·QR 키(발급됐으면)
    guideToken: String(r.get('안내공유토큰') || ''),   // 하객 안내 허브 공개 링크·QR 키(다이닝/좌석 완료 시 발급)
    guideinfoDraft: draft.guideinfoDraft || null,      // 하객 안내 정보(오시는 길·드레스코드) 이어하기·편집용
    guestPhoto: {   // [GUEST_PHOTO_IN] 하객이 우리 안내 페이지에서 올린 사진 - 부부 화면 표시용(장수·폴더·최근)
      n: Number(r.get('하객사진수') || 0) || 0,
      url: (function () { var f = String(r.get('하객사진폴더ID') || '').trim(); return f ? 'https://drive.google.com/drive/folders/' + f : ''; })(),
      at: String(r.get('하객사진최근') || '').trim()
    },
    finalPolicy: { seats: FINAL_CONFIRM.착석, max: FINAL_CONFIRM.최대, unit: FINAL_CONFIRM.초과단가 }   // 프런트 계산·문구 단일 기준
  };
}

// [05] 결과물 단계(예식완료/촬영완료/결과물전달) — 원본 전달 → 고객 선택 → 보정 → 전달.
//   사진 파일은 서버 X(드라이브 링크). 선택 = A안(번호/파일명 텍스트). 추가 보정 = 포함 10컷·추가 컷당 20,000(홈페이지 기준).
var RESULT_STAGES = ['예식완료', '촬영완료', '결과물전달', '후기'];   // ★STAGE_REVIEW 최고위험 지점 — '후기' 빼면 후기 단계 고객의 결과물 카드·갤러리·설문 카드가 통째로 사라진다. 제거 금지
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
    전달일: (function () { try { return String((_parseJsonSafe(r.get('동의기록')) || {}).결과물전달일 || '').slice(0, 10); } catch (e) { return ''; } })(),
    갤러리: !!String(r.get('원본폴더ID') || '').trim(),   // MPD3_GAL 썸네일 갤러리 가능(원본폴더ID 있음) — 프론트는 true일 때만 getResultGallery 시도(구 GAS·미추출이면 번호 입력 폴백)   // MPD3_G5 만료 임박 배너용 — adminMarkDelivered가 기록한 인도 완료일(계약서 12조③ 6개월 기산). 구 프론트는 이 필드를 안 읽으므로 무해
    포함컷: RESULT.포함보정컷,
    추가단가: RESULT.추가보정단가,
    revision: (function () {   // [REVISION_LOOP] 무료 재보정 수정 요청 상태 — pending이면 프론트가 접수 확인 카드(재요청 숨김·1건만)
      try {
        var a = (_parseJsonSafe(r.get('동의기록')).수정요청이력) || [];
        if (!a.length) return null;
        var L = a[a.length - 1];
        return { pending: String(L.status || '') === '대기', at: String(L.at || ''), round: a.length };
      } catch (e) { return null; }
    })(),
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

// [MPD3_GAL 05-②B] 썸네일 갤러리 목록 — 고객 토큰 인증 → 원본폴더ID의 이미지 파일만 이름순 열거.
//   60장/페이지 · 전체 목록(id·이름)은 CacheService 10분 캐시(수백 장에서 6분 한도·쿼터 회피 · 캐시 실패해도 동작).
//   썸네일 URL은 drive.google.com/thumbnail — 원본 폴더가 링크 공유(하위 상속)라 고객 브라우저가 직접 로드(GAS 프록시 없음).
function handleGetResultGallery(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var r = s.row;
  if (RESULT_STAGES.indexOf(String(r.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 결과물 단계가 아니에요.' };
  var fid = String(r.get('원본폴더ID') || '').trim();
  if (!fid) return { ok: false, noGallery: true, error: '갤러리를 준비 중이에요. 원본 링크로 봐 주세요.' };
  var page = Math.max(1, Math.floor(Number((body && body.page) || 1)) || 1);
  var PAGE = 60;
  var cache = null, listJson = null, list = null, cacheKey = 'rg1_' + fid;
  try { cache = CacheService.getScriptCache(); listJson = cache.get(cacheKey); } catch (e) {}
  if (listJson) { try { list = JSON.parse(listJson); } catch (e) { list = null; } }
  if (!list) {
    var folder;
    try { folder = DriveApp.getFolderById(fid); } catch (e) { return { ok: false, noGallery: true, error: '갤러리를 열 수 없어요. 원본 링크로 봐 주세요.' }; }
    list = [];
    try {
      var it = folder.getFiles();
      while (it.hasNext()) {
        var f = it.next();
        if (String(f.getMimeType() || '').indexOf('image/') !== 0) continue;   // 이미지 파일만(영상·기타 제외)
        list.push({ id: f.getId(), name: f.getName() });
        if (list.length >= 1500) break;   // 안전 상한 — 폭주 폴더에서 실행 한도 보호
      }
    } catch (e2) { return { ok: false, noGallery: true, error: '갤러리를 열 수 없어요. 원본 링크로 봐 주세요.' }; }
    list.sort(function (a, b) { return a.name < b.name ? -1 : (a.name > b.name ? 1 : 0); });
    try { if (cache) cache.put(cacheKey, JSON.stringify(list), 600); } catch (e3) {}   // 100KB 초과 등 캐시 실패 무시
  }
  var total = list.length, pages = Math.max(1, Math.ceil(total / PAGE));
  var slice = list.slice((page - 1) * PAGE, (page - 1) * PAGE + PAGE).map(function (x) {
    return { id: x.id, name: x.name, thumb: 'https://drive.google.com/thumbnail?id=' + x.id + '&sz=w400' };
  });
  return { ok: true, files: slice, page: page, pages: pages, total: total, included: RESULT.포함보정컷 };
}

/* ★[PICK_CAP_PAIR 2026-08-15 적대검증 3바퀴 9-3] 컷 제출 상한 셋을 **곱셈 하나로 묶는다.**
   2바퀴 수리 때 「400개 ↔ 20,000자」를 손으로 맞춰 놨는데, 그 계산은 파일명이 12자일 때만
   성립했다(코드가 허용하는 이름은 80자). 실측 — 12자:400장 · 28자:300장 · 45자:200장 · 80자:170장.
   유실은 아니지만(거부로 막힌다) 프런트는 「400까지」라고 미리 말하는데 300장에서 막히는
   **막다른 길**이었고, 평범한 내보내기 이름(28자)에서 반드시 재현된다.
   ↓ 이제 글자 상한이 개수×항목크기로 **계산되므로** 셋이 다시 어긋날 수 없다.
   ID 는 드라이브 최대치(44자)를 잡아 두었다 — 저장할 것은 ID지 이름이 아니다(이름은 사람이 볼 힌트).
   36,000자는 시트 셀 한도(50,000)에도 여유가 있다. ★셋 중 하나만 손으로 고치지 말 것. */
var PICK_MAX = 400;                                  // 한 번에 고를 수 있는 컷
var PICK_NAME_CAP = 40;                              // 파일명 표시 상한(진짜 신원은 ID)
var PICK_TEXT_CAP = PICK_MAX * (PICK_NAME_CAP + 50); // = 36,000 · 항목 = 이름 + '(' + ID 44 + ')' + ', '
/* ★[PICK_SEP_ONE 2026-08-15 적대검증 4바퀴 11-2] 쪼개는 문자와 씻는 문자를 **한 곳에서** 낸다.
   전엔 이름에서 `( ) ,` 만 지우고(_gnm) 서버는 `[\s,;·，、]+` 로 다시 쪼갰다 — 집합이 달라
   이름에 공백·중점·전각쉼표가 있으면 한 항목이 여러 토큰으로 갈렸다.
   실측(100장 제출): `DSC 0123.jpg` → 101 · `김희준 이미쿠 본식3 0123.jpg` → 103.
   ★유실이 아니라 **수와 돈이 틀리는** 버그다 — 선택수가 추가보정 견적 기본값을 만든다
   (over = 선택수 − 포함컷 · 컷당 20,000원). 100장 골랐는데 103이면 6만원어치가 기본으로 붙는다.
   게다가 ID 없는 조각(`김희준`)이 고른 컷인 양 남아 보정 담당이 파일을 못 찾는다.
   ↓ 이름에서 지우는 집합 = 쪼개는 집합 ∪ 괄호. 두 곳이 다른 것을 보면 또 갈린다. */
var PICK_SEP = /[\s,;·，、]+/;             // 토큰을 쪼개는 문자
var PICK_NAME_BAD = /[()\s,;·，、]+/g;      // 이름에서 지울 문자 = 쪼개는 문자 + 괄호

// [05-②] 고객 사진 선택 제출(A안: 번호/파일명 텍스트). 단계 전이 없음.
function handleSubmitResultSelection(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var picksRaw = (body && body.picks);
  // [MPD3_GAL] B안 썸네일 제출 — 파일ID 배열([{id,name}])도 수용 · 선택사진엔 "파일명(ID)" CSV로 저장(관리자 썸네일 확인·A안 하위 호환)
  if (Object.prototype.toString.call(picksRaw) === '[object Array]') {
    var _gOut = [], _gSeen = {};
    for (var _gi = 0; _gi < picksRaw.length; _gi++) {
      var _gp = picksRaw[_gi] || {};
      var _gid = String(_gp.id || '').replace(/[^A-Za-z0-9_-]/g, ''); if (!_gid || _gSeen[_gid]) continue; _gSeen[_gid] = 1;
      // [PICK_SEP_ONE] 구분자를 '_' 로 바꾼다 — 지우면 낱말이 붙고, 공백으로 두면 다시 쪼개진다
      var _gnm = String(_gp.name || '').replace(PICK_NAME_BAD, '_').replace(/_+/g, '_').replace(/^_|_$/g, '').slice(0, PICK_NAME_CAP);
      _gOut.push((_gnm || '파일') + '(' + _gid + ')');
      // [PICK_NO_SILENT 2026-08-15 적대검증 2바퀴 7-1] 상한 초과 = 거부. 종전엔 루프가 400에서
      //   말없이 멈춰 401번째부터 버려졌다(ok:true · 고객은 모름). 자를 바에 거부가 정직하다.
      if (_gOut.length > PICK_MAX) return { ok: false, error: '한 번에 ' + PICK_MAX + '컷까지 제출할 수 있어요. 선택을 ' + PICK_MAX + '컷 안으로 줄여 주시거나, 디렉터에게 문의해 주세요.' };
    }
    if (!_gOut.length) return { ok: false, error: '고르신 컷을 선택해 주세요.' };
    picksRaw = _gOut.join(', ');
  }
  var picks = String(picksRaw || '').trim();
  if (!picks) return { ok: false, error: '고르신 컷을 입력해 주세요.' };
  // [PICK_NO_SILENT] 글자 상한도 거부로 — 종전 「8000자에서 자르기」는 한 항목 약 49자라 164개부터
  //   무증상 유실이었다(선택수는 자른 뒤 계산 · 꼬리 ID 반토막 · 관리자 알림도 잘린 수).
  if (picks.length > PICK_TEXT_CAP) return { ok: false, error: '선택 목록이 너무 길어요. 목록을 나눠 제출하시거나 디렉터에게 문의해 주세요.' };
  // [PICK_NORMALIZE 2026-07-25] 서버 방어층 — 프론트 캐논과 동일 최소 파이프(분리·trim·빈 제거·중복 제거(순서 유지)) · 선택수=고유 토큰 수.
  //   범위 전개("12-15")·프리픽스/확장자 제거·제로패딩은 프론트 전용(이중 구현 드리프트 방지 · 회의 A-1 명확화 1).
  var _pkT = picks.split(PICK_SEP), _pkOut = [], _pkSeen = {};   // [PICK_SEP_ONE] 이름을 씻은 그 집합
  for (var _pi = 0; _pi < _pkT.length; _pi++) {
    var _pt = String(_pkT[_pi] || '').trim(); if (!_pt) continue;
    var _pk = _pt.toLowerCase(); if (_pkSeen[_pk]) continue;
    _pkSeen[_pk] = 1; _pkOut.push(_pt);
  }
  picks = _pkOut.join(', ');
  var n = _pkOut.length;   // 고유 토큰 수 = 장수(프론트 카운터와 동일 기준)
  /* ★[PICK_MAX_MANUAL 2026-08-29 시뮬레이션 점검] 수동 입력 분기도 컷 수 상한을 센다.
     종전엔 갤러리 분기만 PICK_MAX 를 봤고 여기는 글자 상한(36,000자)뿐이라
     «1, 2, 3»처럼 짧은 토큰이면 수천 컷이 통과했다 — 초과분은 컷당 2만원 자동 과금 견적으로 이어진다. */
  if (n > PICK_MAX) return { ok: false, error: '한 번에 ' + PICK_MAX + '컷까지 제출할 수 있어요. 선택을 ' + PICK_MAX + '컷 안으로 줄여 주시거나, 디렉터에게 문의해 주세요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
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
  // [PICK_NO_SILENT] 수량도 자르지 않는다 — 종전 「500 초과면 500으로」는 고객이 적어 낸 수량과
  //   다른 견적이 말없이 기록됐다. 컷 제출 상한과 같은 원칙: 자를 바에 거부하고 이유를 말한다.
  if (qty > 500) return { ok: false, error: '추가 보정은 한 번에 500컷까지 신청할 수 있어요. 더 필요하시면 디렉터에게 문의해 주세요.' };
  var amount = qty * RESULT.추가보정단가;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (RESULT_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 결과물 단계가 아닙니다.' };
    var _xrCur = String(cust.get('추가보정상태') || '').trim();
    if (_xrCur === '완료') return { ok: false, error: '이미 결제가 완료된 추가 보정이 있어요. 문의해 주세요.' };
    /* ★[XR_SIGNAL_KEEP 2026-08-29 시뮬레이션 점검] 입금 신호(결제대기)가 살아있는데 재신청하면
       상태가 «신청»으로 되돌아가 입금 신호가 증발했다 — 고객은 이미 보냈는데 관리자 화면에선
       입금 신호가 사라져 확인이 늦어진다. 확인 중엔 재신청을 거부한다. */
    if (_xrCur === '결제대기') return { ok: false, error: '입금 확인 중인 신청이 있어요. 확인이 끝난 뒤 다시 신청하실 수 있어요.' };
    /* 새 견적이므로 이전 신청의 입금자명은 지운다(낡은 이름이 새 견적 대조를 오도) */
    touchCustomer(sheet, colOf, cust.num, { '추가보정상태': '신청', '추가보정수량': qty, '추가보정금액': amount, '추가보정입금자명': '' });
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
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    /* ★[XR_STAGE_GUARD 2026-08-29] 강제 단계 이동 뒤 옛 화면의 유령 입금신호 차단(STAGE_REVIEW 와 동일 원칙) */
    if (RESULT_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 결과물 단계가 아닙니다.' };
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
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    var cur = String(cust.get('결과물상태') || '').trim();
    if (cur === '컨펌완료' || cur === '전달완료') return { ok: true, already: true };
    if (cur !== '컨펌대기' && cur !== '보정중') return { ok: false, error: '아직 보정본 확인 단계가 아니에요.' };
    if (!String(cust.get('보정본폴더') || '').trim()) return { ok: false, error: '보정본이 아직 준비되지 않았어요.' };
    // [REVISION_LOOP] 수정 요청 반영 중엔 확정 보류 — 구 화면(캐시)의 확인 버튼 대비. 새 보정본 재등록 시 자동으로 다시 열림.
    try { var _cra = (_parseJsonSafe(cust.get('동의기록')).수정요청이력) || []; if (_cra.length && String(_cra[_cra.length - 1].status || '') === '대기') return { ok: false, error: '수정 요청을 반영하고 있어요. 새 보정본을 안내드린 뒤 확인하실 수 있어요.' }; } catch (e) {}
    touchCustomer(sheet, colOf, cust.num, { '결과물상태': '컨펌완료', '컨펌일시': fmtKST(new Date()) });
    try { notifyStudio('[플랫폼] 보정본 컨펌 완료 (' + code + ')', code + ' · 고객이 보정본을 확인했어요. 최종 전달 가능.'); } catch (e) {}
    return { ok: true };
  } finally { try { lock.releaseLock(); } catch (e) {} }
}

// [REVISION_LOOP 2026-07-25] 보정본 수정 요청(무료 재보정 1회의 공식 경로 · 회의 A-2) — 상태는 컨펌대기 유지.
//   동의기록.수정요청이력에 {at, cats, note, status:'대기'} 적재(대기 1건만·멱등) + 관리자 메일 통지.
//   반영 경로: 관리자가 보정본을 재등록(adminSetResultLinks)하면 '반영' 처리 + 고객에게 보정본 재안내(기존 컨펌대기 흐름 재사용).
var REVISION_CATS = ['피부 보정', '밝기/색감', '몸/라인', '배경 정리', '기타'];
function handleRequestRevision(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { ok: false, reason: s.reason, error: _sessionMsg(s.reason) };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
  var catsIn = (Object.prototype.toString.call(body && body.cats) === '[object Array]') ? body.cats : [];
  var cats = catsIn.map(function (c) { return String(c || '').trim(); }).filter(function (c) { return REVISION_CATS.indexOf(c) >= 0; }).slice(0, REVISION_CATS.length);
  var note = String((body && body.note) || '').replace(/[\u0000-\u0008\u000b-\u001f]/g, '').trim().slice(0, 1000);   // 줄바꿈은 보존(여러 건 모아 쓰기) · 제어문자만 제거
  if (!cats.length && !note) return { ok: false, error: '다듬고 싶은 부분을 골라 주시거나 적어 주세요.' };
  var round = 0, sent = false;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    if (String(cust.get('결과물상태') || '').trim() !== '컨펌대기') return { ok: false, error: '지금은 보정본 확인 단계가 아니에요.' };
    if (!String(cust.get('보정본폴더') || '').trim()) return { ok: false, error: '보정본이 아직 준비되지 않았어요.' };
    var rec = _parseJsonSafe(cust.get('동의기록'));
    var arr = rec.수정요청이력 || [];
    if (arr.length && String(arr[arr.length - 1].status || '') === '대기') return { ok: true, already: true };   // 대기 1건만(멱등 · 재요청 방지)
    arr.push({ at: fmtKST(new Date()), cats: cats, note: note, status: '대기' });
    rec.수정요청이력 = arr;
    round = arr.length;
    touchCustomer(sheet, colOf, cust.num, { '동의기록': JSON.stringify(rec) });
    sent = true;
  } finally { try { lock.releaseLock(); } catch (e) {} }
  if (sent) {
    try {
      notifyStudio('[플랫폼] 보정 수정 요청 (' + code + ')',
        code + ' · ' + round + '회차 수정 요청'
        + (cats.length ? ('\n부위: ' + cats.join(' · ')) : '')
        + (note ? ('\n사유: ' + note) : '')
        + '\n반영 후 관리자 페이지에서 보정본 등록(같은 링크여도 저장)을 누르면 자동으로 반영 처리되고 고객에게 다시 안내돼요.');
    } catch (e) {}
  }
  return { ok: true };
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
  try { lock.waitLock(15000); } catch (e) { try { lockBusySignal(); } catch (_e) {} return { ok: false, error: '잠시 후 다시 시도해 주세요.' }; }
  try {
    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var cust = findCustomerByCode(code);
    if (!cust) return { ok: false, error: '고객 정보를 찾을 수 없습니다.' };
    // ★STAGE_REVIEW 안전장치(기획 §3-2 #22): 종전엔 단계 검사가 아예 없어 강제이동 뒤 옛 화면에서 유령 제출이 가능했다.
    //   결과물·후기 구간(RESULT_STAGES) 밖이면 거부. 제거 금지.
    if (RESULT_STAGES.indexOf(String(cust.get('현재단계') || '').trim()) === -1) return { ok: false, error: '아직 후기를 남길 수 있는 단계가 아니에요.' };
    /* ★[SURVEY_ONCE 2026-08-29 시뮬레이션 점검] 설문은 한 번만 받는다 — 종전엔 재제출이 응답을
       덮어쓰고 «스타벅스 2잔 발송 대상» 관리자 메일을 또 보냈다(쿠폰 이중 발급 유도).
       탭 두 개·뒤로가기 재제출 전부 여기서 멱등 처리. */
    if (String(cust.get('설문상태') || '').trim() === '완료') return { ok: true, already: true };
    var product = String(cust.get('상품타입') || '').trim() || (typeof P !== 'undefined' ? P.PRODUCT_SIGNATURE : '시그니처');
    var payload = { product: product, answers: clean, review: review, reviewPublic: reviewPublic };
    touchCustomer(sheet, colOf, cust.num, { '설문상태': '완료', '설문응답': JSON.stringify(payload), '설문일시': fmtKST(new Date()) });
    /* [STAGE_REVIEW_DOOR] 후기를 받으면 마지막 칸('후기')으로 올린다 — 여정이 끝난 자리.
       ★'결과물전달'에서만 올린다. RESULT_STAGES 는 예식완료까지 넓어서, 조건 없이 올리면
         결과물을 아직 못 받은 고객이 결과물전달을 건너뛰고 끝으로 튄다. */
    if (String(cust.get('현재단계') || '').trim() === '결과물전달') setCustomerStage(code, 'review');
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
        + '\n스타벅스 2잔 발송 대상 (후기 감사 · 제출=지급) · 관리자 상세에서 커피쿠폰 발급 버튼으로 바코드 등록 → 고객 마이페이지 표시 · 연락처 ' + String(cust.get('연락처') || '')
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
  /* ★[ADM_TRACE_MONEY 2026-08-16 시뮬레이션 점검] 돈·작업 상태를 바꾸는 동작인데 처리이력에 흔적이 없었다.
     누가 언제 했는지 남지 않으면 오처리를 되짚을 근거가 사라진다. */
  try { _recordHandler(code, '추가보정 확인'); } catch (e) {}
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
  /* ★[ADM_TRACE_MONEY 2026-08-16 시뮬레이션 점검] 돈·작업 상태를 바꾸는 동작인데 처리이력에 흔적이 없었다.
     누가 언제 했는지 남지 않으면 오처리를 되짚을 근거가 사라진다. */
  try { _recordHandler(code, '보정 시작'); } catch (e) {}
  return { ok: true };
}

// [1회 실행] Customers에 결과물 셀렉트·추가 보정 컬럼 추가(멱등) + 레거시 결과물상태 '업로드'→'원본전달'.
function addResultSelectionColumns() {
  var sheet = getCustomersSheet();
  var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
  var need = ['선택사진', '선택수', '선택확정일시', '추가보정상태', '추가보정수량', '추가보정금액', '추가보정입금자명', '컨펌일시', '설문상태', '설문응답', '설문일시', '중도금상태', '중도금입금자명', '중도금입금신호', '중도금확인일시', '중도금리마인드', '원본폴더ID'], added = [];   // MPD3_GAL 원본폴더ID(B안 썸네일 갤러리)
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

// ============================ [백필] 제작 착수했는데 입금완료에 고착된 고객 단계 정정 ============================
// 배경: PRODUCE_ENTRY_FIX 이전에는 입금완료→제작중 전이가 실질적으로 한 번도 걸리지 않았다
//   (전이 호출이 handleSaveProductionBase 한 곳뿐이었는데 그 화면이 폐지돼 호출부가 0건이 됨).
//   그래서 제작을 이미 진행한 고객들이 관리자 화면에서 '입금완료 · 제작 시작 대기'로 남아 있다.
//   신규 전이는 '다음 저장'부터 걸리므로, 더 저장하지 않을 고객은 이 백필로만 정정된다.
// 안전장치:
//   · 기본은 드라이런(로그만). 실제 반영은 backfillProduceStage(false).
//   · 웨딩스냅 제외(스냅 흐름엔 '제작중'이 없음 · SNAP_PRODUCE_GUARD와 동일 원칙).
//   · 대상은 '현재단계=입금완료' + '제작임시저장에 실제 작업 흔적(tracks 진행중·완료 또는 청첩장 초안)'.
//     관리자가 의도적으로 롤백한 고객은 _clearForwardData가 제작임시저장을 비우므로 흔적이 없어 자동 제외된다.
//   · 처리이력에 백필 사실을 남긴다(사후 추적용).
// 실행: 80_production 파일을 열고 → backfillProduceStage (드라이런) → 목록 확인 후 → backfillProduceStage(false)
// ★[PROD_COL_SPLIT · A-3] 이 백필은 '구셀(제작임시저장) 기준 · Wave 4 PR-B 이전 세대 전용 · 1회성'이다.
//   PR-B 이후 신규 고객은 구셀이 백지라 애초에 대상이 아니고(전이는 PRODUCE_ENTRY_FIX가 정상 처리),
//   이전된 고객의 구셀은 동결된 이전 시점 스냅샷이라 시간이 갈수록 낡는다. → PR-B 배포 '전에' 1회 돌리고 끝낼 것.
//   (신 컬럼을 보도록 고치는 대신 이대로 두는 이유: 목적이 '과거 고착 고객 정리'라 과거 데이터를 봐야 맞다)
function backfillProduceStage(dry) {
  var dryRun = (dry !== false);   // 기본 드라이런
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow();
  if (last < 2) { Logger.log('대상 없음(고객 없음)'); return { ok: true, hit: 0, dry: dryRun }; }
  var vals = sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues();
  var cCode = colOf['개인코드'], cStage = colOf['현재단계'], cProd = colOf['상품타입'], cDraft = colOf['제작임시저장'];
  var hits = [], skipped = 0;
  for (var i = 0; i < vals.length; i++) {
    var stage = String(vals[i][cStage - 1] || '').trim();
    if (stage !== '입금완료') continue;
    if (String(vals[i][cProd - 1] || '').trim() === '웨딩스냅') { skipped++; continue; }
    var d = _parseJsonSafe(vals[i][cDraft - 1]);
    var tr = d.tracks || {};
    var touched = ['invitation', 'ritual', 'dining', 'final', 'seat', 'snap', 'guideinfo'].some(function (k) { return String(tr[k] || '').trim() !== ''; });
    if (!touched && !(d.invitationDraft && Object.keys(d.invitationDraft).length)) continue;
    var mark = Object.keys(tr).filter(function (k) { return String(tr[k] || '').trim(); }).map(function (k) { return k + '=' + tr[k]; }).join(', ');
    hits.push({ row: i + 2, code: String(vals[i][cCode - 1] || '').trim(), tracks: mark || '청첩장 초안만' });
  }
  Logger.log('[backfillProduceStage] ' + (dryRun ? '드라이런(반영 없음)' : '실제 반영') + ' · 대상 ' + hits.length + '건 (스냅 제외 ' + skipped + '건)');
  hits.forEach(function (h) { Logger.log('  · ' + h.code + ' (행 ' + h.row + ') · ' + h.tracks); });
  if (dryRun) { Logger.log('실제 반영하려면 backfillProduceStage(false) 실행'); return { ok: true, hit: hits.length, dry: true, items: hits }; }
  hits.forEach(function (h) {
    try {
      touchCustomer(sheet, colOf, h.row, { '현재단계': '제작중' });
      if (typeof _recordHandler === 'function') _recordHandler(h.code, '단계 백필: 입금완료 → 제작중 (제작 착수 흔적 확인 · ' + h.tracks + ')');
    } catch (e) { Logger.log('  ! 실패 ' + h.code + ': ' + (e && e.message)); }
  });
  Logger.log('[backfillProduceStage] 반영 완료 · ' + hits.length + '건');
  return { ok: true, hit: hits.length, dry: false, items: hits };
}
// [백필 실행 래퍼] GAS 편집기는 인자를 넘겨 실행할 수 없어, 드롭다운에서 바로 고를 수 있는 실행용 함수를 둔다.
//   backfillProduceStage      = 드라이런(로그만 · 안전)
//   backfillProduceStageApply = 실제 반영
//   ★이 래퍼 삭제 금지 — 없으면 운영자가 매번 편집기에 임시 함수를 붙여야 하고, 파일 교체 때 그게 사라진다(2026-07-25 실제 겪음).
function backfillProduceStageApply() { return backfillProduceStage(false); }
