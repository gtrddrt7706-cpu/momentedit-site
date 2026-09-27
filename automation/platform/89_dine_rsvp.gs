// ==============================================================================
// ★★[DINING_RSVP] [MEAL_ASK_FIRST] 하객 안내에서 식사 참석 답받기 (2026-09-26 사장님 결정 · 2026-09-27 구현)
//
//   사장님 결정(9/26): 식사 참석은 하객 안내 페이지(guide.html)에서 받는다. 두 분이 따로 묻거나 청첩장에서 받지 않는다.
//   사장님 결정(9/26 · 두 번째): 청첩장을 만들 때 «예식 뒤 식사 자리가 있나요?»만 먼저 묻는다. 식당은 나중에 골라도 된다.
//     → 식당을 기다리지 않고 «식사 자리가 있다»(애프터 웨딩 dining_on === 'Y')만 정해지면 하객 안내 링크와 식사 물음을 먼저 연다.
//
//   부르는 곳
//     guide.html   dineRsvp      — 하객 · 무인증 · 안내공유토큰(g) 게이트
//     mypage.html  dineRsvpList  — 두 분 · 세션
//     mypage.html  dineRsvpEdit  — 두 분 · 세션(직접 넣기 · 지우기)
//     80_production handleGuideView · buildProductionState — «받는 중» 판정(_dineRsvpState)을 함께 쓴다(한 곳에서만 판정)
//     70_journey setupAllTriggers — dineRsvpDaily(매일 19시 · 지우기 + 늦은 답 메일)
//
//   저장 — 시트 «식사답»(두 분의 제작 초안 칸과 섞지 않는다 · 두 분이 마이페이지에서 저장할 때 하객 답이 덮이면 안 된다)
//     칸: 개인코드 · 이름 · 이름키 · 답 · 인원 · 넣은 곳 · 처음 · 마지막 · 메일
//     ★시트가 없으면 «잠근 채» 만든다 — 헤더가 어긋난 시트에는 쓰지 않는다(저장했다고 답했는데 없음 방지 · [열 가드] 와 같은 뜻).
//
//   개인정보 — 연락처는 받지 않는다 · 하객끼리 서로의 답을 보지 못한다(하객에게는 자기 답만 돌려준다)
//     지우는 날 = 하객 안내가 닫히는 날(예식 + GUIDE_EXPIRE_DAYS 30일 · 80_production) · 예식일을 모르면 마지막 답 + 30일
//
//   ★기능 스위치 — DINE_RSVP.from 전에는 guideView 가 rsvp:false · dineRsvp 는 거절 · 마이페이지 물음 · 덩어리 숨김.
//     from = privacy.html 개정 시행일(사장님이 정한다). 정해지기 전에는 먼 날짜(2099-12-31)라 병합해도 라이브는 그대로다.
//     날짜는 scripts/audit/dine-rsvp.mjs 가 privacy.html · guide.html · shared/hydrate.js 와 대조한다.
//
//   ★[RESTO_DUE 2026-09-27 사장님 결정 ③] 하객 마감은 식당이 정한 «최종 인원 마감»에 맞춘다 —
//     두 분이 애프터 웨딩 2/2 에서 고른다(7 · 5 · 3 · 1일 전 · 기본 3) · 하객 마감 = 예식일 − (그 날 + guestGap 4)일.
//     7 → 11일 전 · 5 → 9 · 3 → 7 · 1 → 5. 계산은 여기 한 곳(_dineRsvpDue) — 화면은 서버 값(due · restoN · guestGap)을 쓴다.
// ==============================================================================
var DINE_RSVP = { from: '2099-12-31', restoDue: [7, 5, 3, 1], restoDueDefault: 3, guestGap: 4, maxN: 6, nameMax: 20, maxRows: 150 };   // maxN · nameMax · restoDue · guestGap 은 guide.html · mypage.html 과 같은 값(dine-rsvp.mjs 가 잰다)
var DINE_RSVP_RATE = { min: 20, hour: 120 };   // 한 예식(토큰)에 1분 20번 · 1시간 120번
var DINE_RSVP_SHEET = '식사답';
var DINE_RSVP_HEAD = ['개인코드', '이름', '이름키', '답', '인원', '넣은 곳', '처음', '마지막', '메일'];
var DINE_RSVP_MSG = {
  notOpen: '지금은 식사 답을 받지 않아요.',
  dayOf: '오늘은 두 분께 직접 알려 주세요.',
  noName: '이름을 적어 주세요.',
  longName: '이름은 20자까지 적을 수 있어요.',
  noAns: '함께하실지 골라 주세요.',
  rate: '잠시 뒤에 다시 보내 주세요.',
  full: '답이 많이 모였어요. 두 분께 직접 알려 주세요.',
  busy: '지금은 붐벼요. 잠시 뒤 다시 눌러 주세요.',
  sheet: '지금은 답을 받을 준비가 안 됐어요. 두 분께 직접 알려 주세요.'
};

// 기능 스위치 — 한국 날짜가 DINE_RSVP.from 에 닿았는가
function _dineRsvpLive() {
  // [DINE_RSVP_FROM] 처리방침 시행일(DINE_RSVP.from · 한국 날짜) 전에는 닫혀 있다 — 재배포 날짜에 기대지 않는다
  return typeof _kstYmd === 'function' && String(_kstYmd(new Date())) >= String(DINE_RSVP.from);
}

// 식사 자리가 있다고 정했나 — 애프터 웨딩 dining_on === 'Y', 또는 지금의 diningOn(담은 곳 · 고른 식당). «안 함»(N)이면 거짓.
function _dineRsvpMeal(dd) {
  dd = dd || {};
  var on = String(dd.dining_on || '').trim();
  if (on === 'N') return false;
  if (on === 'Y') return true;   // [MEAL_ASK_FIRST] 식당은 없어도 된다
  var favs = (Object.prototype.toString.call(dd._favs) === '[object Array]') ? dd._favs : [];
  var pick = String(dd.venuePick || '').trim();
  var ph = (typeof DN_PLACEHOLDER !== 'undefined') ? DN_PLACEHOLDER : [];
  return favs.some(function (v) { return v && v.show === true; }) || (!!pick && ph.indexOf(pick) === -1);
}

// 식당에 최종 인원 알릴 날 — 애프터 웨딩 초안 restoDue(7 · 5 · 3 · 1) · 없거나 잡값이면 기본 3 [RESTO_DUE]
function _dineRsvpRestoN(dd) {
  var n = Number((dd || {}).restoDue);
  return DINE_RSVP.restoDue.indexOf(n) !== -1 ? n : DINE_RSVP.restoDueDefault;
}
function _drShift(wedYmd, days) {
  var m = String(wedYmd || '').match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (!m) return '';
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3] - days)).toISOString().slice(0, 10);
}
// ★하객 마감 = 예식일 − (식당 마감 N + guestGap)일 'YYYY-MM-DD' · 예식일을 모르면 '' — 계산은 여기 한 곳 [RESTO_DUE]
function _dineRsvpDue(wedYmd, restoN) {
  // [RESTO_DUE] 7 → 11일 전 · 5 → 9 · 3 → 7 · 1 → 5 — 하객 화면 마감 줄 · 마이페이지 글 · 늦은 답 메일 · 준비 목록이 모두 이 값을 따른다
  var n = DINE_RSVP.restoDue.indexOf(Number(restoN)) !== -1 ? Number(restoN) : DINE_RSVP.restoDueDefault;
  return _drShift(wedYmd, n + DINE_RSVP.guestGap);
}

// ★«받는 중» 판정은 여기 한 곳 — guideView · dineRsvp · dineRsvpList · buildProductionState 가 함께 쓴다(4-2)
//   네 가지가 모두 맞을 때: 스위치 날짜가 됐다 · 식사 자리가 있다 · 두 분이 끄지 않았다 · 예식 전날까지다(KST)
function _dineRsvpState(cust, d) {
  var st = { live: false, meal: false, off: false, wed: '', due: '', restoN: DINE_RSVP.restoDueDefault, restoDate: '', days: null, before: false, open: false };
  if (!cust) return st;
  try { d = d || _prodLoad(cust); } catch (e) { d = {}; }
  d = d || {};
  st.live = _dineRsvpLive();
  st.meal = _dineRsvpMeal(d.diningDraft);
  st.off = String(((d.guideinfoDraft || {}).dineRsvp) || '') === 'off';
  st.wed = (typeof _ymdOf === 'function') ? (_ymdOf(cust.get('예식일')) || '') : '';
  st.restoN = _dineRsvpRestoN(d.diningDraft);
  st.due = _dineRsvpDue(st.wed, st.restoN);
  st.restoDate = _drShift(st.wed, st.restoN);
  st.days = (st.wed && typeof _dayDiff === 'function' && typeof _kstYmd === 'function') ? _dayDiff(st.wed, _kstYmd(new Date())) : null;
  st.before = st.days != null && st.days >= 1;
  st.open = st.live && st.meal && !st.off && st.before;
  return st;
}
function _dineRsvpOpen(cust, d) { return _dineRsvpState(cust, d).open; }

// 부부 화면 표시용(buildProductionState 가 싣는다) — 명단은 싣지 않는다(패널을 열 때 dineRsvpList 로)
function _dineRsvpPublic(cust, d) {
  var st = _dineRsvpState(cust, d);
  return { live: st.live, meal: st.meal, off: st.off, open: st.open, due: st.due, days: st.days, restoN: st.restoN, restoDate: st.restoDate,
    restoDue: DINE_RSVP.restoDue.slice(), restoDueDefault: DINE_RSVP.restoDueDefault, guestGap: DINE_RSVP.guestGap, maxN: DINE_RSVP.maxN, nameMax: DINE_RSVP.nameMax };
}

// 이름키 — 공백(전각 포함) · 가운뎃점을 빼고 소문자. mypage.html _drKey 와 같은 규칙(dine-rsvp.mjs 가 대조)
function _drKey(s) { return String(s == null ? '' : s).replace(/[\s　·ㆍ・･‧∙]+/g, '').toLowerCase(); }

// 이름 정리 — 앞뒤 공백 · 제어문자 · <> 를 빼고 1~20자 · 글자(한글 · 영문)가 하나는 있어야 한다
function _drCleanName(raw) {
  var s = String(raw == null ? '' : raw).replace(/[\u0000-\u001F\u007F-\u009F<>]/g, '').replace(/\s+/g, ' ').trim();
  if (!s) return { ok: false, error: DINE_RSVP_MSG.noName };
  if (s.length > DINE_RSVP.nameMax) return { ok: false, error: DINE_RSVP_MSG.longName };
  if (!/[가-힣ㄱ-ㅎㅏ-ㅣA-Za-z]/.test(s)) return { ok: false, error: DINE_RSVP_MSG.noName };
  return { ok: true, name: s };
}
// 답 · 인원 — Y 면 1~maxN 정수(아니면 1) · N 이면 0 · 그 밖의 답은 null
function _drAns(a) { a = String(a == null ? '' : a).trim(); return (a === 'Y' || a === 'N') ? a : null; }
function _drN(ans, n) {
  if (ans !== 'Y') return 0;
  var v = Number(n);
  return (isFinite(v) && Math.floor(v) === v && v >= 1 && v <= DINE_RSVP.maxN) ? v : 1;
}

// 한도 — 한 예식(토큰)에 1분 20번 · 1시간 120번 · 막힌 시도도 센다(_ltRateCheck 모양) · 캐시가 안 되면 통과
function _drRate(token) {
  try {
    var c = CacheService.getScriptCache(), kM = 'dr_m_' + token, kH = 'dr_h_' + token;
    var m = Number(c.get(kM) || 0) + 1, h = Number(c.get(kH) || 0) + 1;
    c.put(kM, String(m), 60);
    c.put(kH, String(h), 3600);
    return m <= DINE_RSVP_RATE.min && h <= DINE_RSVP_RATE.hour;
  } catch (e) { return true; }   // 캐시가 막히면 제한 없이 통과 — 답을 막는 것보다 낫다
}

function _drNowTs() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss'); }
function _drTs(v) {
  if (v instanceof Date) return Utilities.formatDate(v, 'Asia/Seoul', 'yyyy-MM-dd HH:mm:ss');
  return String(v == null ? '' : v).trim();
}

// 시트 — create=true 면 없을 때 만든다(★호출자가 잠근 상태에서만). 헤더가 어긋나면 null(그 시트에는 쓰지 않는다)
function _drSheet(create) {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(DINE_RSVP_SHEET);
  if (!sh && create) {
    sh = ss.insertSheet(DINE_RSVP_SHEET);
    sh.getRange(1, 1, 1, DINE_RSVP_HEAD.length).setValues([DINE_RSVP_HEAD]);
    try { sh.setFrozenRows(1); } catch (e) {}
    try { sh.getRange(1, 1, sh.getMaxRows(), DINE_RSVP_HEAD.length).setNumberFormat('@'); } catch (e2) {}   // 글자 그대로(시각·이름이 날짜·수식으로 바뀌지 않게)
  }
  if (!sh) return null;
  var head = sh.getRange(1, 1, 1, DINE_RSVP_HEAD.length).getValues()[0].map(function (h) { return String(h).trim(); });
  for (var i = 0; i < DINE_RSVP_HEAD.length; i++) { if (head[i] !== DINE_RSVP_HEAD[i]) return null; }
  return sh;
}
function _drRows(sh) {
  if (!sh) return [];
  var last = sh.getLastRow();
  if (last < 2) return [];
  var vals = sh.getRange(2, 1, last - 1, DINE_RSVP_HEAD.length).getValues();
  var out = [];
  for (var i = 0; i < vals.length; i++) {
    var v = vals[i];
    var code = String(v[0] || '').replace(/^'/, '').trim();
    if (!code) continue;
    out.push({ r: i + 2, code: code, name: String(v[1] || '').replace(/^'/, ''), key: String(v[2] || '').replace(/^'/, ''), ans: String(v[3] || ''),
      n: Number(v[4]) || 0, by: String(v[5] || ''), first: _drTs(v[6]), last: _drTs(v[7]), mail: _drTs(v[8]) });
  }
  return out;
}

// 한 줄 넣기(같은 이름키면 바꾼다) — ★호출자가 잠근 상태에서
function _drUpsert(code, name, ans, n, by) {
  var sh = _drSheet(true);
  if (!sh) return { ok: false, error: DINE_RSVP_MSG.sheet };
  var key = _drKey(name), now = _drNowTs();
  var mine = _drRows(sh).filter(function (x) { return x.code === code; });
  var ex = null;
  for (var i = 0; i < mine.length; i++) { if (mine[i].key === key) { ex = mine[i]; break; } }
  if (ex) {
    sh.getRange(ex.r, 2, 1, 6).setValues([[_deFormula(name), _deFormula(key), ans, n, by, ex.first || now]]);
    sh.getRange(ex.r, 8).setValue(now);
    return { ok: true, updated: true };
  }
  if (mine.length >= DINE_RSVP.maxRows) return { ok: false, full: true, error: DINE_RSVP_MSG.full };
  sh.appendRow([_deFormula(code), _deFormula(name), _deFormula(key), ans, n, by, now, now, '']);
  return { ok: true, updated: false };
}

// 그 고객 줄만 — 최근 순 · 셈(함께 인원 합 · 예식만 줄 수)
function _drListOf(code) {
  var rows = _drRows(_drSheet(false)).filter(function (x) { return x.code === code; });
  rows.sort(function (a, b) { return a.last < b.last ? 1 : (a.last > b.last ? -1 : 0); });
  var yes = 0, no = 0;
  var list = rows.map(function (x) {
    if (x.ans === 'Y') yes += (x.n || 1); else if (x.ans === 'N') no += 1;
    return { name: x.name, key: x.key, ans: x.ans, n: x.ans === 'Y' ? (x.n || 1) : 0, by: x.by === 'couple' ? 'couple' : 'guest', at: x.last };
  });
  return { rows: list, yes: yes, no: no };
}

// ── 하객 · 무인증 ─────────────────────────────────────────────
function handleDineRsvp(body) {
  // [DINE_RSVP_GUEST] 토큰 모양 → 고객 → 닫힘 → ★예식 당일부터 → 받는 중 → 한도 → 이름 · 답 · 인원 → 잠그고 저장(최종 판 7-1 순서)
  body = body || {};
  var token = String(body.g || '').trim();
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return { ok: false, error: '잘못된 주소예요.' };
  var cust = _findCustomerBy('안내공유토큰', token, false);
  if (!cust) return { ok: false, error: '안내를 찾을 수 없어요.' };
  var ci = _guideCloseInfo(_ymdOf(cust.get('예식일')));
  if (ci.closed) return { ok: false, expired: true, reason: ci.reason, help: !!ci.help, error: ci.error };
  var st = _dineRsvpState(cust);
  if (!st.before) return { ok: false, closed: true, error: DINE_RSVP_MSG.dayOf };   // 예식 당일부터는 두 분께 직접(받는 중 판정보다 먼저)
  if (!(st.live && st.meal && !st.off)) return { ok: false, closed: true, error: DINE_RSVP_MSG.notOpen };
  if (!_drRate(token)) return { ok: false, error: DINE_RSVP_MSG.rate };
  var nm = _drCleanName(body.name);
  if (!nm.ok) return { ok: false, error: nm.error };
  var ans = _drAns(body.ans);
  if (!ans) return { ok: false, error: DINE_RSVP_MSG.noAns };
  var n = _drN(ans, body.n);
  var code = String(cust.get('개인코드') || '').trim();
  if (!code) return { ok: false, error: '안내를 찾을 수 없어요.' };
  var lock = LockService.getScriptLock();
  try { lock.waitLock(10000); } catch (e) { return { ok: false, error: DINE_RSVP_MSG.busy }; }
  try {
    var res = _drUpsert(code, nm.name, ans, n, 'guest');
    if (!res.ok) return { ok: false, full: !!res.full, error: res.error };
  } finally { try { lock.releaseLock(); } catch (e2) {} }
  return { ok: true, name: nm.name, ans: ans, n: n };   // ★같은 이름이 이미 있었는지는 드러내지 않는다(처음 보낼 때와 같은 답)
}

// ── 두 분 · 세션 ──────────────────────────────────────────────
function _drSessionCust(body) {
  var s = resolveSession(String((body && body.token) || '').trim());
  if (!s.ok) return { err: { ok: false, reason: s.reason, error: _sessionMsg(s.reason) } };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { err: { ok: false, error: '고객 정보를 찾을 수 없습니다.' } };
  var cust = (typeof findCustomerByCode === 'function' ? findCustomerByCode(code) : null) || s.row;
  return { code: code, cust: cust };
}
function _drListPayload(code, cust) {
  var st = _dineRsvpState(cust);
  var l = _drListOf(code);
  return { ok: true, live: st.live, meal: st.meal, off: st.off, open: st.open, due: st.due, days: st.days, restoN: st.restoN, restoDate: st.restoDate,
    rows: l.rows, yes: l.yes, no: l.no, maxN: DINE_RSVP.maxN, nameMax: DINE_RSVP.nameMax };
}
function handleDineRsvpList(body) {
  // [DINE_RSVP_LIST] 그 고객 줄만 · 켜짐 여부 · 마감 · 받는 중인지
  var sc = _drSessionCust(body);
  if (sc.err) return sc.err;
  return _drListPayload(sc.code, sc.cust);
}
function handleDineRsvpEdit(body) {
  // [DINE_RSVP_EDIT] op:'add' 이름 · 답 · 인원(같은 이름키면 바꾼다 · by='couple') · op:'del' 이름키로 한 줄 지우기 · 한도 검사 없음(로그인한 두 분)
  var sc = _drSessionCust(body);
  if (sc.err) return sc.err;
  var op = String((body && body.op) || '').trim();
  var lock = LockService.getScriptLock();
  if (op === 'add') {
    if (!_dineRsvpLive()) return { ok: false, error: DINE_RSVP_MSG.notOpen };
    var nm = _drCleanName(body.name);
    if (!nm.ok) return { ok: false, error: nm.error };
    var ans = _drAns(body.ans);
    if (!ans) return { ok: false, error: DINE_RSVP_MSG.noAns };
    var n = _drN(ans, body.n);
    try { lock.waitLock(10000); } catch (e) { return { ok: false, error: DINE_RSVP_MSG.busy }; }
    try {
      var res = _drUpsert(sc.code, nm.name, ans, n, 'couple');
      if (!res.ok) return { ok: false, error: res.error };
    } finally { try { lock.releaseLock(); } catch (e2) {} }
    return _drListPayload(sc.code, sc.cust);
  }
  if (op === 'del') {
    var key = String((body && body.key) || '').trim() || _drKey(body && body.name);
    if (!key) return { ok: false, error: '지울 답을 찾지 못했어요.' };
    try { lock.waitLock(10000); } catch (e3) { return { ok: false, error: DINE_RSVP_MSG.busy }; }
    try {
      var sh = _drSheet(false);
      var hit = _drRows(sh).filter(function (x) { return x.code === sc.code && x.key === key; });
      for (var i = hit.length - 1; i >= 0; i--) sh.deleteRow(hit[i].r);
    } finally { try { lock.releaseLock(); } catch (e4) {} }
    return _drListPayload(sc.code, sc.cust);
  }
  return { ok: false, error: '알 수 없는 요청입니다.' };
}

// ── 매일 19시 — ① 지우기 ② 늦은 답 메일 ③ 식당 마감 전날 알림 ─────────────
//   ① 예식일 + GUIDE_EXPIRE_DAYS(30)가 지난 고객의 줄 전부(안내 페이지가 닫히는 날과 같은 기준)
//      예식일을 모르면 그 고객의 마지막 답에서 30일 뒤 · 고객이 없어진 줄도 지운다
//   ② 하객 마감(_dineRsvpDue)이 지난 뒤 하객이 새로 보내거나 바꾼 줄(마지막 > 메일)이 있으면 두 분께 그날 한 통
//      보낸 뒤 그 줄의 메일 칸에 시각 · 두 분이 넣은 줄은 알리지 않는다 · 예식 당일부터는 보내지 않는다
//   ③ [RESTO_REMIND] 식사 자리가 있는 두 분께 식당 마감 전날 19시에 한 통 — 같은 날 ② 도 있으면 한 통으로(② 의 줄을 ③ 아래에)
//   ★②·③(메일)은 기능 스위치(DINE_RSVP.from) 뒤부터 — 그 전엔 고객에게 가는 것이 하나도 없다. ① 은 늘 돈다(지울 줄이 없으면 아무 일도 없다).
//   로그에는 지운 줄 수 · 보낸 메일 수만(이름은 남기지 않는다)
function dineRsvpDaily() {
  // [DINE_RSVP_DAILY] 지우기 + 늦은 답 메일 + 식당 마감 전날 알림(RESTO_REMIND) · setupAllTriggers(70_journey)가 매일 19시로 건다
  var keep = (typeof GUIDE_EXPIRE_DAYS !== 'undefined') ? GUIDE_EXPIRE_DAYS : 30;
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (e) { Logger.log('[dineRsvpDaily] 붐벼서 건너뜀'); return '붐벼서 건너뜀'; }
  var removed = 0, mailed = 0;
  try {
    var today = _kstYmd(new Date());
    var custOf = {};
    var getCust = function (code) { if (!(code in custOf)) { try { custOf[code] = findCustomerByCode(code) || null; } catch (e) { custOf[code] = null; } } return custOf[code]; };
    var sh = _drSheet(false);
    // ① 지우기
    if (sh) {
      var gone = [];
      _drRows(sh).forEach(function (x) {
        var c = getCust(x.code);
        if (!c) { gone.push(x.r); return; }
        var wed = _ymdOf(c.get('예식일'));
        if (wed) { var dd = _dayDiff(wed, today); if (dd != null && dd < -keep) gone.push(x.r); return; }
        var d2 = _dayDiff(today, String(x.last || '').slice(0, 10));
        if (d2 == null || d2 > keep) gone.push(x.r);
      });
      gone.sort(function (a, b) { return b - a; }).forEach(function (r) { sh.deleteRow(r); });
      removed = gone.length;
    }
    if (_dineRsvpLive()) {
      // 고객별 계획 — ② 늦은 줄 · ③ 전날 알림
      var plan = {};
      var byCode = {};
      _drRows(sh).forEach(function (x) { (byCode[x.code] = byCode[x.code] || []).push(x); });
      Object.keys(byCode).forEach(function (code) {
        var c = getCust(code); if (!c) return;
        var st = _dineRsvpState(c); if (st.days == null || st.days < 1) return;   // 예식 당일부터는 보내지 않는다
        var late = byCode[code].filter(function (x) { return x.by === 'guest' && String(x.last).slice(0, 10) > st.due && x.last > x.mail; });
        if (late.length) plan[code] = { c: c, st: st, late: late };
      });
      _drEachCustomer(function (c) {   // ③ — 명단이 없어도(아무도 안 답했어도) 식당 마감은 온다
        var code = String(c.get('개인코드') || '').trim(); if (!code) return;
        if (PRODUCTION_STAGES.indexOf(String(c.get('현재단계') || '').trim()) === -1) return;
        var st = _dineRsvpState(c);
        if (!st.meal || st.days == null || st.days !== st.restoN + 1) return;   // 식당 마감 «전날»만
        var ck = 'dr_rm_' + code + '_' + today;
        try { if (CacheService.getScriptCache().get(ck)) return; } catch (e) {}
        plan[code] = plan[code] || { c: c, st: st, late: [] };
        plan[code].remind = true; plan[code].ck = ck;
      });
      Object.keys(plan).forEach(function (code) {
        var pl = plan[code], all = byCode[code] || [];
        var yes = 0, no = 0;
        all.forEach(function (x) { if (x.ans === 'Y') yes += (x.n || 1); else if (x.ans === 'N') no += 1; });
        var ok = _drMail(code, pl, yes, no);
        if (!ok) return;
        mailed++;
        if (pl.late.length) { var now = _drNowTs(); pl.late.forEach(function (x) { sh.getRange(x.r, 9).setValue(now); }); }
        if (pl.remind) { try { CacheService.getScriptCache().put(pl.ck, '1', 21600); } catch (e) {} }
      });
    }
  } finally { try { lock.releaseLock(); } catch (e2) {} }
  var msg = '[dineRsvpDaily] 지운 줄 ' + removed + ' · 보낸 메일 ' + mailed;
  Logger.log(msg);
  return msg;
}
// 제작 단계 고객 전부를 한 번씩 — ③ 식당 마감 전날 알림용(시트를 한 번만 읽는다)
function _drEachCustomer(fn) {
  var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
  var last = sheet.getLastRow(); if (last < P.DATA_START_ROW) return;
  var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
  for (var i = 0; i < vals.length; i++) { try { fn(rowFromValues(colOf, vals[i], P.DATA_START_ROW + i)); } catch (e) {} }
}
function _drMd(ymd) { var m = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})/); return m ? (Number(m[2]) + '월 ' + Number(m[3]) + '일') : ''; }
// 한 통 — ③(전날 알림)이 있으면 그 틀에 ②(늦은 답)의 줄을 아래에 · 없으면 ② 틀 · 성공하면 true
function _drMail(code, pl, yes, no) {
  var e = (typeof esc === 'function') ? esc : function (s) { return String(s == null ? '' : s); };
  var clean = (typeof _noEmoji === 'function') ? _noEmoji : function (s) { return String(s == null ? '' : s); };
  var P_ = (typeof centerP === 'function') ? centerP : function (h) { return '<p>' + h + '</p>'; };
  var st = pl.st;
  var lateHead = '하객 마감(' + _drMd(st.due) + ')이 지난 뒤 들어온 식사 답이에요';
  var lines = pl.late.map(function (x) {
    var fresh = !x.mail && String(x.first).slice(0, 10) > st.due;
    return e(clean(x.name)) + ' · ' + (x.ans === 'Y' ? ('함께할게요 ' + (x.n || 1) + '분') : '예식만 함께할게요') + ' · ' + (fresh ? '새로' : '바뀜');
  });
  var btn = (typeof emailBtn === 'function') ? emailBtn('https://momentedit.kr/mypage.html?focus=dine', '마이페이지 열기') : '';   // [DINE_FOCUS] 하객 안내 패널 «식사 답»으로 바로
  var subject, headline, inner = '';
  if (pl.remind) {
    subject = '[Moment Edit] 내일까지 식당에 최종 인원을 알려 주세요';
    headline = _drMd(st.restoDate) + '은 식당에 최종 인원을 알리는 날이에요';
    if (!st.off) inner += P_('지금까지 함께 ' + yes + '분 · 두 분까지 ' + (yes + 2) + '분이에요. 양가 가족이 함께하시면 더해 주세요.');   // 답 받기가 켜졌을 때만
    if (lines.length) inner += P_(e(lateHead) + '<br>' + lines.join('<br>'));
  } else {
    subject = '[Moment Edit] 식사 답이 새로 들어왔어요';
    headline = lateHead;
    inner += P_(lines.join('<br>'));
    inner += P_('지금까지 함께 ' + yes + '분 · 예식만 ' + no + '분<br>식당 예약 인원을 한 번 더 확인해 주세요.');
  }
  inner += btn;
  if (typeof _notifyCustomerEmail !== 'function') return false;
  return _notifyCustomerEmail(code, clean(subject), clean(headline), inner) === true;
}
