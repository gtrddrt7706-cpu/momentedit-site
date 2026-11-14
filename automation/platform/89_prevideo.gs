/**
 * ==============================================================================
 * 89_prevideo.gs — 마이페이지 «식전 영상» [PV_CAT_1031]
 * ==============================================================================
 * ★★[PV_CAT_1031 2026-10-31 사장님 «추천대로진행» · «켜도상관없어» · «지금은 실고객이없어»]
 *   식전 영상 준비를 마이페이지 한 곳에서 — 사진으로 만들기 · 준비한 영상 올리기 · 나중에 · 사용하지 않기.
 *   기획 = 비공개 문서 «모먼트에디트 식전영상 기획서» 11 · 11-1 · 11-2장(고객 입장 검토 4라운드 · 개선점 없음).
 *
 *   ■ 어디에 두나 — Customers 열을 늘리지 않는다(스키마 변경 없음)
 *     · 초안 · 상태 = 시트 «식전영상»(없으면 만든다) · 개인코드 한 줄
 *     · 사진 = 드라이브 «ME_식전영상/<개인코드>_<예식일>» · 공개 주소를 만들지 않는다(작은 그림은 이 고객만 받는다)
 *     · 스튜디오가 만든 미리보기 = 같은 폴더에 이름이 «미리보기»로 시작하는 영상 파일 → 다음 조회 때 «확인 필요»로 바꾸고 보기 주소를 연다
 *
 *   ■ 처리방침 — «식전 영상» 항목 시행일(PV_UP.from) 전에는 받지 않는다 · 동의는 첫 사진 · 첫 보내기 때 그 자리에서(pvConsent)
 *     보관 = 예식 6개월 뒤 지운다(purgePrevideo_ · purgeRitualFiles 가 함께 부른다)
 *
 *   ■ ★★[MID_VIDEO_1106 2026-11-06 사장님 «식중 영상은 선택으로» · 대본 체크리스트 7 · 8 · 9 · 12 · 13] 식중 영상도 이 파일 하나가 받는다
 *     · 켜고 끄는 원천 = 식순 초안의 «준비한 순서 · 영상»(S.on.free + S.freeWhat 'video') — 여기는 링크 · 상태만(kind 'mid')
 *     · 같은 시트 «식전영상»에 «개인코드#mid» 줄 하나 · 폴더 «ME_식전영상/<개인코드>_<예식일>_식중» · 방식은 «준비한 영상»(링크)뿐 · 기한 · 확인 · 확정 · 보관은 식전 영상과 같다
 *     · 기한 안내(예식 14일 · 7일 전)와 기한날 미제출 관리자 메일 = sendVideoDueNotices(식전 · 식중 함께)
 *   ■ 1차에서 뺀 것(곧 연다 · 화면도 보이지 않는다) — 짧은 영상 · 인사 영상(5초 고르기) · 큰 파일 올리기 · 문구 고치기 · 카톡 알림 · 식순과 상태 잇기
 * ==============================================================================
 */
var PV_UP = { midFrom: '', from: '2026-10-31', root: 'ME_식전영상', sheet: '식전영상', min: 5, max: 20, first: 4, days: 10, today: 6, photoMax: 4 * 1048576, thumbMax: 320 * 1024, uploadsMax: 60, hourMax: 40, keepDays: 183, dueDays: 7, linkMax: 400 };
var PV_STYLES = ['editorial', 'cinematic', 'storybook', 'retro', 'scrapbook'];   // assets 쪽 PVC_STYLES 와 같은 순서 · 같은 열쇠
var PV_SONGS = ['mujin', 'oban', 'grizzly', 'geomjeong', 'fx', 'hyukoh', 'jake', 'day6', 'roykim', 'dks', 'wonstein', 'elijah'];
var PV_MODES = ['make', 'upload'];
var PV_SECS = ['first', 'days', 'today'];
var PV_ST_KO = { draft: '작성 중', making: '만드는 중', checking: '스튜디오 확인 중', review: '확인 필요', done: '확정', editing: '확정 · 수정 중', later: '나중에', off: '안 함' };
var PV_HEAD = ['개인코드', '상태', '방식', '초안', '메타', '갱신'];

// [MID_VIDEO_1106] 식전(pre) · 식중(mid) — 줄 열쇠 · 이름 · 폴더 꼬리
function _pvKind_(k) { return String(k || '') === 'mid' ? 'mid' : 'pre'; }
function _pvKey_(code, kind) { return _pvKind_(kind) === 'mid' ? code + '#mid' : code; }
function _pvName_(kind) { return _pvKind_(kind) === 'mid' ? '식중 영상' : '식전 영상'; }
// 식순 초안이 «준비한 순서 · 영상»을 담았나 — 식중 영상을 켜고 끄는 원천 · 길이(분)도 함께
function _mvOn_(cust) {
  var S = null; try { S = ((_prodLoad(cust) || {}).ritualDraft || {}).S || null; } catch (e) { S = null; }
  if (!S) return { on: null, len: 0 };
  var on = !!(S.on && S.on.free) && String(S.freeWhat || '') === 'video', n = parseInt(S.freeLen, 10);
  return { on: on, len: (n >= 1 && n <= 10) ? n : 3 };
}
// [MID_VIDEO_1106 · 검토 1604-5] 식중 영상은 처리방침에 «식중 영상»이 들어간 날(midFrom)부터 받는다 — 비어 있으면 꺼짐(줄 · 화면 · 받기 · 안내 모두)
function _pvLiveK_(kind) { if (_pvKind_(kind) !== 'mid') return _pvLive_(); var f = String(PV_UP.midFrom || ''); return !!f && typeof _kstYmd === 'function' && String(_kstYmd(new Date())) >= f; }
function _pvLive_() {
  // [PV_CAT_1031] 처리방침 «식전 영상» 시행일(한국 날짜)부터 받는다
  return typeof _kstYmd === 'function' && String(_kstYmd(new Date())) >= PV_UP.from;
}
function _pvSheet_() {
  var ss = SpreadsheetApp.getActive(), sh = ss.getSheetByName(PV_UP.sheet);
  if (!sh) { sh = ss.insertSheet(PV_UP.sheet); sh.appendRow(PV_HEAD); sh.setFrozenRows(1); }
  return sh;
}
function _pvRow_(sh, code) {
  var last = sh.getLastRow(); if (last < 2) return null;
  var vals = sh.getRange(2, 1, last - 1, PV_HEAD.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][0] || '').trim() !== code) continue;
    var d = {}, m = {};
    try { d = JSON.parse(String(vals[i][3] || '{}')) || {}; } catch (e) { d = {}; }
    try { m = JSON.parse(String(vals[i][4] || '{}')) || {}; } catch (e) { m = {}; }
    return { num: i + 2, d: d, m: m };
  }
  return null;
}
function _pvWrite_(sh, row, code, d, m) {
  m.rev = (Number(m.rev) || 0) + 1;   // [B2_MA_07] 쓸 때마다 판 번호 — 늦게 온 옛 저장이 더 나중의 보내기 · 확정을 되돌리지 못하게 견준다
  var st = String(m.st || ''), mid = /#mid$/.test(String(code)), vals = [[code, PV_ST_KO[st] || '', mid ? '식중 · 준비한 영상' : (d.mode === 'upload' ? '준비한 영상' : (d.mode === 'make' ? '사진으로 만들기' : '')), JSON.stringify(d), JSON.stringify(m), fmtKST(new Date())]];   // [MID_VIDEO_1106] 식중 줄은 «개인코드#mid»
  if (row && row.num) sh.getRange(row.num, 1, 1, PV_HEAD.length).setValues(vals);
  else sh.appendRow(vals[0]);
}
function _pvArr_(v) { return Object.prototype.toString.call(v) === '[object Array]' ? v : []; }
function _pvYmdAdd_(ymd, n) {
  var mm = String(ymd || '').match(/^(\d{4})-(\d{2})-(\d{2})$/); if (!mm) return '';
  var t = new Date(Date.UTC(+mm[1], +mm[2] - 1, +mm[3]) + n * 864e5);
  return t.getUTCFullYear() + '-' + ('0' + (t.getUTCMonth() + 1)).slice(-2) + '-' + ('0' + t.getUTCDate()).slice(-2);
}
// 확정 기한 = 예식 7일 전 23:59(한국 시각) · 예식일이 없으면 기한 없음
function _pvDue_(cust) { var w = (typeof _ymdOf === 'function') ? _ymdOf(cust.get('예식일')) : ''; return w ? _pvYmdAdd_(w, -PV_UP.dueDays) : ''; }
function _pvPast_(due) { return !!due && typeof _kstYmd === 'function' && String(_kstYmd(new Date())) > due; }

// 두 분이 보낸 초안을 정리 — 모르는 값은 버리고, 올린 적 없는 사진 id 는 받지 않는다
function _pvNorm_(raw, m, wed, kind) {
  raw = raw || {};
  if (_pvKind_(kind) === 'mid') raw = { mode: 'upload', link: raw.link };   // [MID_VIDEO_1106] 식중은 «준비한 영상»(링크)뿐 · 사진 · 곡 · 분위기를 받지 않는다
  var own = {}; _pvArr_(m.uploads).forEach(function (u) { if (u && u.id) own[String(u.id)] = String(u.th || ''); });
  var out = { v: 1 };
  out.mode = PV_MODES.indexOf(String(raw.mode || '')) > -1 ? String(raw.mode) : '';
  var st = Math.floor(Number(raw.step)); out.step = (st >= 0 && st <= 3) ? st : 0;
  out.style = PV_STYLES.indexOf(String(raw.style || '')) > -1 ? String(raw.style) : '';
  out.song = PV_SONGS.indexOf(String(raw.song || '')) > -1 ? String(raw.song) : '';
  var cap = { first: PV_UP.first, days: PV_UP.days, today: PV_UP.today }, cnt = { first: 0, days: 0, today: 0 }, seen = {}, ph = [];
  _pvArr_(raw.photos).forEach(function (p) {
    if (!p || ph.length >= PV_UP.max) return;
    var id = String(p.id || ''), sec = String(p.sec || '');
    if (!own.hasOwnProperty(id) || seen[id] || PV_SECS.indexOf(sec) < 0 || cnt[sec] >= cap[sec]) return;
    seen[id] = 1; cnt[sec]++; ph.push({ id: id, th: own[id], sec: sec, n: String(p.n || '').replace(/[<>]/g, '').slice(0, 60) });
  });
  out.photos = ph;
  var met = String(raw.met || ''); out.met = (/^\d{4}-\d{2}-\d{2}$/.test(met) && (!wed || met < wed)) ? met : '';
  var link = String(raw.link || '').trim().slice(0, PV_UP.linkMax); out.link = /^https?:\/\/\S+$/i.test(link) ? link : '';
  return out;
}
// 걸음(step)은 «어느 화면을 보고 있었나»일 뿐 내용이 아니다 — 확정본 · 보낸 내용과 같은지 볼 때는 뺀다(둘러보기만 하고 «수정 중» · «작성 중»으로 바뀌지 않게)
function _pvSame_(a, b) { /* [PV_SAME] */ var f = function (o) { var c = {}; for (var k in (o || {})) { if (k !== 'step' && Object.prototype.hasOwnProperty.call(o, k)) c[k] = o[k]; } return JSON.stringify(c); }; return f(a) === f(b); }
function _pvYoutube_(u) { return /^https?:\/\/([a-z0-9-]+\.)*(youtube\.com|youtu\.be)\//i.test(String(u || '')); }

// 폴더 — 없으면 만들고 메타에 적는다(호출자가 잠근 채로)
function _pvFolder_(m, code, cust, kind) {
  var fid = String(m.folder || '');
  if (fid) { try { DriveApp.getFolderById(fid); return fid; } catch (e) { fid = ''; } }
  var it = DriveApp.getFoldersByName(PV_UP.root), root = it.hasNext() ? it.next() : DriveApp.createFolder(PV_UP.root);
  fid = root.createFolder(code + '_' + ((typeof _ymdOf === 'function' && _ymdOf(cust.get('예식일'))) || 'nodate') + (_pvKind_(kind) === 'mid' ? '_식중' : '')).getId();   // [MID_VIDEO_1106] 식중은 따로
  m.folder = fid;
  return fid;
}

// 스튜디오가 폴더에 «미리보기…» 영상을 넣었나 — 만드는 중 · 스튜디오 확인 중일 때만 본다(그 밖엔 드라이브를 열지 않는다)
function _pvSeePreview_(m) {
  if (['making', 'checking'].indexOf(String(m.st || '')) < 0 || !m.folder) return false;
  var since = Number((m.submit || {}).ts) || 0, best = null;
  try {
    var it = DriveApp.getFolderById(String(m.folder)).searchFiles('title contains "미리보기" and trashed = false');
    while (it.hasNext()) {
      var f = it.next(), mt = String(f.getMimeType() || ''), t = f.getLastUpdated().getTime();
      if (mt.indexOf('video/') !== 0 && mt !== 'application/octet-stream') continue;
      if (t < since) continue;
      if (!best || t > best.t) best = { f: f, t: t };
    }
  } catch (e) { return false; }
  if (!best) return false;
  try { best.f.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}   // 보기 주소(드라이브 미리보기 창)로 두 분이 보도록 · 결과물 원본 폴더 링크와 같은 결
  m.prev = { id: best.f.getId(), at: fmtKST(new Date()) };
  m.st = 'review';
  return true;
}

// 마이페이지에 보내는 모양 — 폴더 id · 올린 목록은 보내지 않는다(작은 그림 id 는 초안 사진에 붙어 간다)
function _pvPublic(code, cust, kind) { _gsr_();
  // [PV_CAT_1031] buildProductionState 가 부른다 · 미리보기가 들어왔으면 이 조회에서 «확인 필요»로 바꿔 둔다
  if (!code || !cust) return null;
  kind = _pvKind_(kind); var key = _pvKey_(code, kind);
  var out = { up: _pvLiveK_(kind), kind: kind, st: '', d: null, consent: false, prev: null, conf: null, due: _pvDue_(cust), wed: (typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '') || '' };
  try {
    if (kind === 'mid') { var mo = _mvOn_(cust); out.on = mo.on; out.len = mo.len; }   // [MID_VIDEO_1106] 식순이 켜고 끈다
    var sh = _pvSheet_(), row = _pvRow_(sh, key);
    if (!row) return out;
    var m = row.m || {};
    if (_pvSeePreview_(m)) {
      var lock = LockService.getScriptLock();
      /* [B2_MA_08] 잠금 안에서 요청 판(submit.n) · 상태를 다시 본다 — 그 사이 «안 함» · 새 요청이 들어왔으면 옛 미리보기로 덮지 않는다 */
      try { lock.waitLock(8000); var r2 = _pvRow_(sh, key); if (r2 && ['making', 'checking'].indexOf(String(r2.m.st || '')) > -1 && Number((r2.m.submit || {}).n) === Number((m.submit || {}).n)) { r2.m.prev = m.prev; r2.m.st = m.st; _pvWrite_(sh, r2, key, r2.d, r2.m); m = r2.m; } else if (r2) m = r2.m || {}; } catch (e) {} finally { try { lock.releaseLock(); } catch (e2) {} }
    }
    out.st = String(m.st || '');
    out.d = row.d || null;
    out.consent = !!(m.consent && m.consent.at);
    if (m.prev && m.prev.id) out.prev = { url: 'https://drive.google.com/file/d/' + m.prev.id + '/preview', at: String(m.prev.at || ''), id: String(m.prev.id), ver: Number((m.submit || {}).n) || 0 };   // [B2_MA_08] 확정할 때 «본 것»을 함께 보내게
    out.rev = Number(m.rev) || 0;   // [B2_MA_07]
    if (m.conf && m.conf.at) out.conf = { at: String(m.conf.at), same: !!(m.prev && m.conf.prev === m.prev.id), url: m.conf.prev ? 'https://drive.google.com/file/d/' + m.conf.prev + '/preview' : '' };   // url = 지금 상영할 확정본(다시 보내는 동안에도 볼 수 있게)
  } catch (e) {}
  return out;
}

function _pvSess_(body) {
  var s = resolveSession(String((body || {}).token || '').trim());
  if (!s.ok) return { err: { ok: false, reason: s.reason, error: _sessionMsg(s.reason) } };
  var code = String(s.row.get('개인코드') || '').trim();
  if (!code) return { err: { ok: false, error: '고객 정보를 찾을 수 없습니다.' } };
  if (PRODUCTION_STAGES.indexOf(String(s.row.get('현재단계') || '').trim()) === -1) return { err: { ok: false, error: '아직 준비 단계가 아니에요.' } };
  if (String(s.row.get('상품타입') || '').trim() === '웨딩스냅') return { err: { ok: false, error: '웨딩스냅은 ' + _pvName_((body || {}).kind) + '이 없어요.' } };   // [MID_VIDEO_1106]
  return { code: code, cust: s.row };
}
function _pvConsentGive_(m, code, kind) {
  m.consent = { at: fmtKST(new Date()), ver: (_pvKind_(kind) === 'mid' && PV_UP.midFrom) ? PV_UP.midFrom : PV_UP.from };   // [MID_VIDEO_1106 · 재검토 1604] 식중은 처리방침 «식중 영상» 날짜
  try { if (typeof _recordHandler === 'function') _recordHandler(code, _pvName_(kind) + ' 동의 · 처리방침 ' + PV_UP.from); } catch (e) {}   // [MID_VIDEO_1106]
}
// 관리자 메일 — 코드마다 10분에 한 통(같은 사람이 여러 번 보내도 메일이 쌓이지 않게)
function _pvAdminMail_(code, line) {
  try {
    var c = CacheService.getScriptCache(), k = 'pvMail_' + code + (/^식중/.test(String(line || '')) ? '#mid' : ''); if (c.get(k)) return; c.put(k, '1', 600);   // [MID_VIDEO_1106] 식전 · 식중 메일이 서로를 막지 않게 · ★10분 한 통 제한은 그대로(검토 1604-1 · 주석에 묻혔던 것)
    if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail(line);
  } catch (e) {}
}

/* 저장 · 보내기 · 확정 · 나중에 · 사용하지 않기 — op 하나로
   op: save(초안만) · submit(사진으로 만들기 · 준비한 영상 보내기) · confirm(미리보기 확정) · later · off · reopen */
function handlePvSave(body) { _gsr_();
  // [PV_CAT_1031] 세션으로만(코드를 받지 않는다) · 시행일 전 · 기한 뒤는 받지 않는다
  body = body || {};
  var se = _pvSess_(body); if (se.err) return se.err;
  if (!_pvLiveK_(body.kind)) return { ok: false, closed: true, error: _pvKind_(body.kind) === 'mid' ? '식중 영상은 아직 준비하실 수 없어요.' : ('식전 영상은 ' + Number(PV_UP.from.slice(5, 7)) + '월 ' + Number(PV_UP.from.slice(8, 10)) + '일부터 준비하실 수 있어요.') };   // [MID_VIDEO_1106] 식중은 midFrom
  var code = se.code, cust = se.cust, op = String(body.op || 'save'), due = _pvDue_(cust), wed = (typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '') || '';
  var kind = _pvKind_(body.kind), key = _pvKey_(code, kind), nm = _pvName_(kind);   // [MID_VIDEO_1106] 식중 영상 = «개인코드#mid» 줄
  if (['save', 'submit', 'confirm', 'later', 'off', 'reopen'].indexOf(op) < 0) return { ok: false, error: '알 수 없는 요청이에요.' };
  var lock = LockService.getScriptLock(), mail = '', jobs = [], wrote = false;
  try { lock.waitLock(15000); } catch (e) { return { ok: false, ecode: 'S1', error: '다른 처리가 진행 중이에요 · 잠시 뒤 다시 눌러 주세요' }; }
  try {
    var sh = _pvSheet_(), row = _pvRow_(sh, key), m = (row && row.m) || {}, d0 = (row && row.d) || {};
    var st = String(m.st || '');
    /* ★[B2_MA_07 2026-11-06 2차 B2-마07] 보내기 · 확정보다 먼저 낸 «옛 저장»(판 번호가 그 보내기 · 확정 판보다 앞)이 늦게 도착하면 아무것도 바꾸지 않는다 — 만드는 중 · 확정 상태를 초안으로 되돌리던 것 */
    if (op === 'save' && body.rev != null && isFinite(+body.rev) && Number(body.rev) < (Number(m.subRev) || 0)) return { ok: true, stale: true, pv: _pvPublic(code, cust, kind) };
    if (_pvPast_(due) && !(op === 'confirm' && st === 'review' && (m.submit || {}).day && String(m.submit.day) <= due)) return { ok: false, locked: true, error: '확정 기한이 지났어요 · 바꾸실 것은 디렉터에게 말씀해 주세요' };
    var d = (op === 'later' || op === 'off' || op === 'reopen' || op === 'confirm') ? (body.draft ? _pvNorm_(body.draft, m, wed, kind) : _pvNorm_(d0, m, wed, kind)) : _pvNorm_(body.draft, m, wed, kind);
    /* ★[B2_FIX_MA_59 2026-11-06 재검증 재수정] 이 기기가 아는 판(body.rev) 뒤에 다른 기기가 올린 사진은 이 초안에 없어도 빼지 않는다 —
       종전엔 뒤이은 자동 저장이 옛 목록으로 통째로 덮어 다른 기기 사진이 말없이 빠졌다(10분 뒤 휴지통). 사진마다 올린 판(uploads.rv)을 견준다:
       rv > body.rev = 이 기기가 본 적 없는 사진 → 남긴다 · rv ≤ body.rev = 보고 뺀 사진 → 뺀다. 남긴 것은 added 로 돌려줘 화면이 받아 그린다(다음 저장이 다시 빼지 않게) */
    var added = [];
    if (body.draft && body.rev != null && isFinite(+body.rev)) {
      var _rv = {}, _in = {}; _pvArr_(m.uploads).forEach(function (u) { if (u && u.id) _rv[String(u.id)] = Number(u.rv) || 0; });
      d.photos.forEach(function (p) { _in[p.id] = 1; });
      var _miss = _pvArr_(d0.photos).filter(function (p) { return p && p.id && !_in[String(p.id)] && (_rv[String(p.id)] || 0) > Number(body.rev); });
      if (_miss.length) {
        var _dm = {}; for (var _k in d) { if (Object.prototype.hasOwnProperty.call(d, _k)) _dm[_k] = d[_k]; }
        _dm.photos = d.photos.concat(_miss);
        d = _pvNorm_(_dm, m, wed, kind);   // 칸 · 전체 장수는 _pvNorm_ 이 다시 지킨다 · [PVNORM_KIND_1107] kind 를 넘겨 식중 줄은 링크만(사진 갈래를 타지 않게 · midvideo.mjs 가 잰다)
        var _now = {}; d.photos.forEach(function (p) { _now[p.id] = p; });
        _miss.forEach(function (p) { var q = _now[String(p.id)]; if (q) added.push({ id: q.id, th: q.th, sec: q.sec, n: q.n }); });
      }
    }
    if (op === 'save') {
      if (st === 'done' || st === 'editing') m.st = _pvSame_(d, m.confD || null) ? 'done' : 'editing';
      else if (st === 'making' || st === 'checking' || st === 'review') { if (!_pvSame_(d, _pvNorm_(d0, m, wed, kind))) { m.st = 'draft'; mail = nm + ' · ' + code + ' · 보낸 뒤 다시 고치는 중이에요(지금 작업은 멈춰도 돼요)'; } }
      else m.st = 'draft';
    } else if (op === 'later') { if (['done', 'editing', 'making', 'checking', 'review'].indexOf(st) < 0) m.st = 'later'; }
    else if (op === 'off') { m.st = 'off'; }
    else if (op === 'reopen') { if (st === 'off' || st === 'later' || !st) m.st = 'draft'; }
    else if (op === 'submit') {
      if (!(m.consent && m.consent.at)) { if (!body.pvConsent) return { ok: false, consent: false, error: nm + ' 동의가 필요해요.' }; _pvConsentGive_(m, code, kind); }
      if (d.mode === 'make') {
        if (!d.style) return { ok: false, error: '분위기를 골라 주세요.' };
        if (d.photos.length < PV_UP.min) return { ok: false, error: '사진은 ' + PV_UP.min + '장부터 만들 수 있어요.' };
        if (!d.song) return { ok: false, error: '곡을 골라 주세요.' };
      } else if (d.mode === 'upload') {
        if (kind === 'mid' && _mvOn_(cust).on !== true) return { ok: false, error: '식순에서 «식중 영상»을 먼저 담아 주세요.' };   // [VIDEO_NAME_1114] 이름 = 빌더 «식중 영상» 칸 · [MID_VIDEO_1106 · 검토 1604] 화면이 막아도 서버가 한 번 더
        if (!d.link) return { ok: false, error: '공유 링크를 넣어 주세요.' };
        if (_pvYoutube_(d.link)) return { ok: false, error: '유튜브 주소로는 원본을 받을 수 없어요 · 구글 드라이브나 업체 공유 링크로 보내 주세요' };
      } else return { ok: false, error: '준비 방법을 골라 주세요.' };
      _pvFolder_(m, code, cust, kind);
      var n = (Number((m.submit || {}).n) || 0) + 1;
      m.submit = { n: n, ts: Date.now(), at: fmtKST(new Date()), day: _kstYmd(new Date()), kind: d.mode };
      m.prev = null;
      m.st = d.mode === 'make' ? 'making' : 'checking';
      m.subRev = (Number(m.rev) || 0) + 1;   // [B2_MA_07] 이번 쓰기의 판 — 이보다 앞선 저장은 늦게 와도 버린다
      var fUrl = 'https://drive.google.com/drive/folders/' + m.folder;
      mail = d.mode === 'make'
        ? ('식전 영상 만들기 요청 · ' + code + ' · 예식 ' + (wed || '-') + ' · 분위기 ' + d.style + ' · 곡 ' + d.song + ' · 사진 ' + d.photos.length + '장 · 확정 기한 ' + (due || '-') + ' · 다 만들면 폴더에 «미리보기»로 시작하는 이름의 영상을 넣어 주세요 · 폴더 ' + fUrl)
        : ((kind === 'mid' ? '식중 영상 도착(덕담 뒤 · 축가 앞) · ' : '준비한 식전 영상 도착 · ') + code + ' · 예식 ' + (wed || '-') + ' · 링크 ' + d.link + ' · 원본을 받아 재생을 확인한 뒤 폴더에 «미리보기»로 시작하는 이름으로 넣어 주세요 · 폴더 ' + fUrl);   // [MID_VIDEO_1106]
    } else if (op === 'confirm') {
      if (st !== 'review' || !(m.prev && m.prev.id)) return { ok: false, error: '확정할 영상이 아직 없어요.' };
      if (kind === 'mid' && _mvOn_(cust).on !== true) return { ok: false, error: '식순에서 «식중 영상»을 먼저 담아 주세요.' };   // [MID_VIDEO_1106 · 재검토 1604] 식순에서 뺀 식중 영상은 확정하지 않는다
      /* ★[B2_MA_08 2026-11-06 2차 B2-마08] 고객이 본 미리보기(id · 요청 판)와 지금 서버의 미리보기가 다르면 확정하지 않는다 — 종전엔 지금 m.prev 를 그대로 확정했다 */
      if ((body.prevId != null && String(body.prevId) !== String(m.prev.id)) || (body.ver != null && Number(body.ver) !== (Number((m.submit || {}).n) || 0))) return { ok: false, newer: true, error: '새 영상이 준비됐어요. 확인한 뒤 확정해 주세요.', pv: _pvPublic(code, cust, kind) };
      m.subRev = (Number(m.rev) || 0) + 1;
      m.conf = { at: fmtKST(new Date()), prev: m.prev.id };
      m.confD = d;
      m.st = 'done';
      mail = nm + ' 확정 · ' + code + ' · 예식 ' + (wed || '-') + ' · 상영 파일 확보 · 재생 확인을 해 주세요';
    }
    // 기획에서 빠졌고 올린 지 10분 넘은 사진은 지운다(방금 올려 저장을 기다리는 사진은 남긴다) · 확정본에 쓰인 사진은 남긴다
    var used = {}, now = Date.now(), keep = [], gone = [];
    d.photos.forEach(function (p) { used[p.id] = 1; });
    _pvArr_((m.confD || {}).photos).forEach(function (p) { used[p.id] = 1; });
    _pvArr_(m.uploads).forEach(function (u) { if (!u || !u.id) return; if (used[u.id] || now - (Number(u.ts) || 0) < 600000) keep.push(u); else gone.push(u); });
    if (gone.length) { m.uploads = keep; jobs.push(function () { gone.forEach(function (u) { try { DriveApp.getFileById(u.id).setTrashed(true); } catch (e) {} if (u.th) { try { DriveApp.getFileById(u.th).setTrashed(true); } catch (e2) {} } }); }); }
    _pvWrite_(sh, row, key, d, m);
    wrote = true;
  } finally { try { lock.releaseLock(); } catch (e) {} }
  if (!wrote) return { ok: false, error: '저장하지 못했어요 · 다시 눌러 주세요' };
  if (mail) _pvAdminMail_(code, mail);   // 메일 · 드라이브 정리는 잠금 밖에서(느린 일)
  jobs.forEach(function (f) { try { f(); } catch (e) {} });
  return { ok: true, pv: _pvPublic(code, cust, kind), added: added };   // [B2_FIX_MA_59] 남긴 다른 기기 사진 · [MID17] kind
}

// 사진 1장 — 폰에서 줄여 온 것(긴 변 2560 · 작은 그림 400) · 원본은 받지 않는다 · 올리는 즉시 초안에 붙인다(떠돌이 사진이 생기지 않게)
function handlePvPhoto(body) { _gsr_();
  // [PV_CAT_1031] 이 고객 · 이 칸 · 칸별 장수 · 동의 · 시간당 상한
  body = body || {};
  var se = _pvSess_(body); if (se.err) return se.err;
  if (!_pvLive_()) return { ok: false, closed: true, error: '식전 영상은 ' + Number(PV_UP.from.slice(5, 7)) + '월 ' + Number(PV_UP.from.slice(8, 10)) + '일부터 준비하실 수 있어요.' };
  var code = se.code, cust = se.cust, sec = String(body.sec || '');
  if (PV_SECS.indexOf(sec) < 0) return { ok: false, error: '어느 칸의 사진인지 알 수 없어요.' };
  var b64of = function (v, max) {
    v = String(v || ''); var mm = v.match(/^data:(image\/(?:jpeg|png|webp));base64,/); if (!mm) return null;
    var b = v.slice(mm[0].length).replace(/\s+/g, ''); if (!b || Math.floor(b.length * 3 / 4) > max) return null;
    return { mime: mm[1], b64: b };
  };
  var full = b64of(body.data, PV_UP.photoMax), thumb = b64of(body.thumb, PV_UP.thumbMax);
  if (!full || !thumb) return { ok: false, error: '사진을 읽지 못했어요 · 다른 사진으로 다시 해 주세요' };
  try { var c = CacheService.getScriptCache(), hk = (typeof _hourKey_ === 'function' ? _hourKey_('pvUp_' + code) : 'pvUp_' + code),   /* [HOUR_BUCKET_1107] */ hn = Number(c.get(hk) || 0); if (hn >= PV_UP.hourMax) return { ok: false, ecode: 'U1', error: '사진을 많이 올리셨어요 · 잠시 뒤 다시 해 주세요' }; c.put(hk, String(hn + 1), 3600); } catch (e) {}
  var due = _pvDue_(cust); if (_pvPast_(due)) return { ok: false, locked: true, error: '확정 기한이 지났어요 · 바꾸실 것은 디렉터에게 말씀해 주세요' };
  var lock = LockService.getScriptLock(), fid = '', sh;
  try { lock.waitLock(15000); } catch (e) { return { ok: false, ecode: 'U1', error: '다른 처리가 진행 중이에요 · 잠시 뒤 다시 눌러 주세요' }; }
  try {
    sh = _pvSheet_();
    var row = _pvRow_(sh, code), m = (row && row.m) || {}, d = (row && row.d) || {};
    if (!(m.consent && m.consent.at)) { if (!body.pvConsent) return { ok: false, consent: false, error: '식전 영상 동의가 필요해요.' }; _pvConsentGive_(m, code); }
    var cap = { first: PV_UP.first, days: PV_UP.days, today: PV_UP.today }, ph = _pvArr_(d.photos);
    if (ph.length >= PV_UP.max) return { ok: false, error: '사진은 ' + PV_UP.max + '장까지 넣을 수 있어요.' };
    if (ph.filter(function (p) { return p && p.sec === sec; }).length >= cap[sec]) return { ok: false, error: '이 칸은 ' + cap[sec] + '장까지예요.' };
    if (_pvArr_(m.uploads).length >= PV_UP.uploadsMax) return { ok: false, error: '사진을 많이 올리셨어요 · 빼신 사진을 정리한 뒤 다시 해 주세요' };
    fid = _pvFolder_(m, code, cust);
    _pvWrite_(sh, row, code, _pvNorm_(d, m, ''), m);   // 폴더 · 첫 동의를 먼저 적는다
  } finally { try { lock.releaseLock(); } catch (e) {} }
  var ext = function (mime) { return mime === 'image/png' ? 'png' : (mime === 'image/webp' ? 'webp' : 'jpg'); };
  var stamp = Utilities.formatDate(new Date(), 'Asia/Seoul', 'MMdd-HHmmss'), f1 = null, f2 = null;
  var trash = function () { try { if (f1) f1.setTrashed(true); } catch (e) {} try { if (f2) f2.setTrashed(true); } catch (e2) {} };
  try {
    var folder = DriveApp.getFolderById(fid);
    f1 = folder.createFile(Utilities.newBlob(Utilities.base64Decode(full.b64), full.mime, sec + '_' + stamp + '.' + ext(full.mime)));
    f2 = folder.createFile(Utilities.newBlob(Utilities.base64Decode(thumb.b64), thumb.mime, sec + '_' + stamp + '_th.' + ext(thumb.mime)));
  } catch (e) { trash(); return { ok: false, ecode: 'U4', _why: 'drive ' + String(e && e.message || e).slice(0, 180), error: '사진을 저장하지 못했어요 · 다시 해 주세요' }; }
  try { lock.waitLock(15000); } catch (e) { trash(); return { ok: false, ecode: 'U1', error: '다른 처리가 진행 중이에요 · 잠시 뒤 다시 눌러 주세요' }; }
  try {
    var r2 = _pvRow_(sh, code); if (!r2) { trash(); return { ok: false, error: '고객 정보를 찾을 수 없습니다.' }; }
    var m2 = r2.m || {}, d2 = r2.d || {};
    /* ★[B2_MA_59 2026-11-06 2차 B2-마59] 파일을 만든 뒤 최종 기록 잠금 안에서 칸 · 전체 장수를 다시 본다 — 마지막 한 자리에 두 기기가 함께 올리면 둘 다 들어가던 것.
       못 들어간 사진은 지우고 «자리가 찼다»고 답한다(초안에 붙은 사진만 성공) */
    var _ph2 = _pvArr_(d2.photos), _cap2 = { first: PV_UP.first, days: PV_UP.days, today: PV_UP.today };
    if (_ph2.length >= PV_UP.max || _ph2.filter(function (p) { return p && p.sec === sec; }).length >= _cap2[sec]) { trash(); return { ok: false, full: true, error: '다른 기기에서 사진이 추가돼 자리가 찼어요. 현재 사진을 확인해 주세요.', pv: _pvPublic(code, cust) }; }
    /* [B2_FIX_MA_59 2026-11-06 재검증 재수정] 요청 판(body.rev)을 다시 본다 — 이 기기가 모르는 사이 다른 기기가 넣은 사진을 added 로 함께 돌려준다
       (화면이 받아 그린다 · 이 응답의 판으로 건너뛰어도 그 사진을 뺀 적 없는 사진으로 남긴다) · 사진마다 올린 판(rv)을 적어 저장이 견주게 한다 */
    var _rvNew = (Number(m2.rev) || 0) + 1, _rvOf = {}, _brv = (body.rev != null && isFinite(+body.rev)) ? Number(body.rev) : null, _added = [];
    _pvArr_(m2.uploads).forEach(function (u) { if (u && u.id) _rvOf[String(u.id)] = u; });
    if (_brv != null) _ph2.forEach(function (p) { var u = p && _rvOf[String(p.id)]; if (u && (Number(u.rv) || 0) > _brv) _added.push({ id: String(p.id), th: String(u.th || ''), sec: String(p.sec || ''), n: String(p.n || '') }); });
    m2.uploads = _pvArr_(m2.uploads).concat([{ id: f1.getId(), th: f2.getId(), sec: sec, ts: Date.now(), rv: _rvNew }]);
    d2.photos = _pvArr_(d2.photos).concat([{ id: f1.getId(), sec: sec, n: String(body.name || '').slice(0, 60) }]);
    var st = String(m2.st || '');
    if (!st || st === 'later' || st === 'off') m2.st = 'draft';
    else if (st === 'done') m2.st = 'editing';
    else if (st === 'making' || st === 'checking' || st === 'review') m2.st = 'draft';
    var nd = _pvNorm_(d2, m2, (typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '') || '');
    if (!nd.mode) nd.mode = 'make';
    _pvWrite_(sh, r2, code, nd, m2);
  } finally { try { lock.releaseLock(); } catch (e) {} }
  return { ok: true, id: f1.getId(), th: f2.getId(), rev: Number(m2.rev) || 0, added: _added };   // [B2_MA_07] 이 기기가 아는 판을 맞춘다 · [B2_FIX_MA_59] 모르던 사진
}

// 올린 사진의 작은 그림 — 이 고객이 올린 것만 · 한 번에 24장까지
function handlePvThumbs(body) { _gsr_();
  // [PV_CAT_1031] 공개 주소를 만들지 않고 이 고객 세션으로만 돌려준다
  body = body || {};
  var se = _pvSess_(body); if (se.err) return se.err;
  var row = _pvRow_(_pvSheet_(), se.code), own = {};
  _pvArr_(((row && row.m) || {}).uploads).forEach(function (u) { if (u && u.th) own[String(u.th)] = 1; });
  var out = {};
  _pvArr_(body.ids).map(String).filter(function (x) { return own[x]; }).slice(0, 24).forEach(function (id) {
    try { var b = DriveApp.getFileById(id).getBlob(); out[id] = 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()); } catch (e) {}
  });
  return { ok: true, thumbs: out };
}

// 예식 6개월 뒤 — 폴더째 휴지통 · 시트 줄의 초안 · 메타를 비운다(처리방침 «식전 영상» 보관 약속)
function purgePrevideo_(dry) {
  /* ★[PURGE_POLICY_1106 2026-11-06] 본문은 70_journey _pgPrevideo_ — 예식 후 6개월(달력) · 폴더 영구 삭제 · 지웠을 때만 «지움» */
  var o = _pgPrevideo_(!dry && _pgLive_(), _kstYmd(new Date()));
  return o.codes;
}

/* ★★[MID_VIDEO_1106 체크리스트 12 · 13] 식전 · 식중 영상 기한 안내 — 매일 10시(setupAllTriggers)
   · 고객: 예식 14일 전 · 7일 전(= 확정 기한날) 한 번씩 · 아직 확정하지 않은 영상만(식전 = 식순에 담았거나 준비를 시작한 것 · 식중 = 식순 «준비한 순서 · 영상»)
     보낸 날은 그 영상 줄 메타 rem 에 적는다 — 못 보냈으면 다음 날 다시(14일 안내를 놓쳐도 7일 전까지는 한 번 간다)
   · 관리자: 기한날(7일 전) 아직 안 보낸 영상이 있으면 메일 한 줄(코드 · 무엇 · 상태) */
function sendVideoDueNotices() { _trigIn_(arguments[0]);   // [MID_VIDEO_1106] 식전 · 식중 영상 기한 안내 · 기한날 관리자 한 줄
  if (!_pvLive_()) return { ok: true, skipped: 'notLive' };
  var sh = getCustomersSheet(), colOf = buildHeaderIndex(sh), last = sh.getLastRow(), sent = 0, adm = [];
  if (!colOf['개인코드'] || !colOf['예식일'] || last < P.DATA_START_ROW) return { ok: true, sent: 0 };
  var vals = sh.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sh.getLastColumn()).getValues();
  var c = function (row, h) { var k = colOf[h]; return k ? row[k - 1] : ''; }, today = _kstYmd(new Date()), pvSh = _pvSheet_();
  for (var i = 0; i < vals.length; i++) {
    var row = vals[i], code = String(c(row, '개인코드') || '').trim(); if (!code) continue;
    if (String(c(row, '계약상태') || '').trim() !== '서명완료') continue;
    if (PRODUCTION_STAGES.indexOf(String(c(row, '현재단계') || '').trim()) === -1) continue;
    if (String(c(row, '상품타입') || '').trim() === '웨딩스냅') continue;
    var wed = (typeof _ymdOf === 'function') ? _ymdOf(c(row, '예식일')) : ''; if (!wed) continue;
    var left = Math.round((Date.UTC(+wed.slice(0, 4), +wed.slice(5, 7) - 1, +wed.slice(8, 10)) - Date.UTC(+today.slice(0, 4), +today.slice(5, 7) - 1, +today.slice(8, 10))) / 864e5);
    if (left > 14 || left < PV_UP.dueDays) continue;
    var cust = null; try { cust = findCustomerByCode(code); } catch (e) { cust = null; } if (!cust) continue;
    var stage = left <= PV_UP.dueDays ? 'd7' : 'd14', due = _pvDue_(cust), names = [];
    ['pre', 'mid'].forEach(function (kind) {
      var key = _pvKey_(code, kind), r = _pvRow_(pvSh, key), m = (r && r.m) || {}, st = String(m.st || '');
      if (['', 'draft', 'later'].indexOf(st) < 0) return;   // [MID_VIDEO_1106 · 검토 1604-4] 아직 안 보낸 것만 — 만드는 중 · 확인 중(스튜디오 차례) · 확인 필요(첫 화면이 알린다) · 수정 중(확정본이 있다) · 확정 · 안 함은 «영상 없이»가 사실이 아니다
      if (kind === 'mid') { if (!_pvLiveK_('mid') || _mvOn_(cust).on !== true) return; }
      else { var S = null; try { S = ((_prodLoad(cust) || {}).ritualDraft || {}).S || null; } catch (e) { S = null; } var pon = !!(S && S.on && S.on.prevideo); if (!pon && ['draft', 'later', 'making', 'checking', 'review', 'editing'].indexOf(st) < 0) return; }
      if (stage === 'd7' && ['', 'draft', 'later'].indexOf(st) > -1) adm.push(code + ' · ' + _pvName_(kind) + ' · ' + (PV_ST_KO[st] || '시작 전'));
      var rem = m.rem || {}; if (rem[stage]) return;
      names.push({ kind: kind, key: key, r: r, m: m });
    });
    if (!names.length) continue;
    var what = names.map(function (x) { return _pvName_(x.kind); }).join(' · ');
    var ok = false; try { var _ret = notifyKakao('cust.videoDue', code, { what: what, due: due, dday: left }); ok = (_ret === true || _ret === 'held' || _ret === 'mail'); } catch (e) { ok = false; }   // 'off'(발송 꺼짐)는 보낸 것으로 치지 않는다 — 켜지면 그때 간다 · ★'mail'(템플릿 없어 메일로 대신)은 보낸 것(검토 1604-2 · 안 세면 매일 다시 나갔다)
    if (!ok) continue;   // 못 보냈으면 적지 않는다 — 다음 날 다시
    sent++;
    var lock = LockService.getScriptLock(); try { lock.waitLock(8000);
      names.forEach(function (x) { var r2 = _pvRow_(pvSh, x.key), m2 = (r2 && r2.m) || {}, d2 = (r2 && r2.d) || {}; m2.rem = m2.rem || {}; m2.rem[stage] = fmtKST(new Date()); _pvWrite_(pvSh, r2, x.key, d2, m2); });
    } catch (e) {} finally { try { lock.releaseLock(); } catch (e2) {} }
  }
  if (adm.length) { try { if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail('오늘이 영상 확정 기한이에요(23:59) · 아직 안 보냄 ' + adm.length + '건 · ' + adm.join(' / ')); } catch (e) {} }
  return { ok: true, sent: sent, admin: adm.length };
}
