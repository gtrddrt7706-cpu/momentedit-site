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
 *   ■ 1차에서 뺀 것(곧 연다 · 화면도 보이지 않는다) — 짧은 영상 · 인사 영상(5초 고르기) · 큰 파일 올리기 · 문구 고치기 · 카톡 알림 · 식순과 상태 잇기
 * ==============================================================================
 */
var PV_UP = { from: '2026-10-31', root: 'ME_식전영상', sheet: '식전영상', min: 5, max: 20, first: 4, days: 10, today: 6, photoMax: 4 * 1048576, thumbMax: 320 * 1024, uploadsMax: 60, hourMax: 40, keepDays: 183, dueDays: 7, linkMax: 400 };
var PV_STYLES = ['editorial', 'cinematic', 'storybook', 'retro', 'scrapbook'];   // assets 쪽 PVC_STYLES 와 같은 순서 · 같은 열쇠
var PV_SONGS = ['mujin', 'oban', 'grizzly', 'geomjeong', 'fx', 'hyukoh', 'jake', 'day6', 'roykim', 'dks', 'wonstein', 'elijah'];
var PV_MODES = ['make', 'upload'];
var PV_SECS = ['first', 'days', 'today'];
var PV_ST_KO = { draft: '작성 중', making: '만드는 중', checking: '스튜디오 확인 중', review: '확인 필요', done: '확정', editing: '확정 · 수정 중', later: '나중에', off: '안 함' };
var PV_HEAD = ['개인코드', '상태', '방식', '초안', '메타', '갱신'];

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
  var st = String(m.st || ''), vals = [[code, PV_ST_KO[st] || '', d.mode === 'upload' ? '준비한 영상' : (d.mode === 'make' ? '사진으로 만들기' : ''), JSON.stringify(d), JSON.stringify(m), fmtKST(new Date())]];
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
function _pvNorm_(raw, m, wed) {
  raw = raw || {};
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
function _pvFolder_(m, code, cust) {
  var fid = String(m.folder || '');
  if (fid) { try { DriveApp.getFolderById(fid); return fid; } catch (e) { fid = ''; } }
  var it = DriveApp.getFoldersByName(PV_UP.root), root = it.hasNext() ? it.next() : DriveApp.createFolder(PV_UP.root);
  fid = root.createFolder(code + '_' + ((typeof _ymdOf === 'function' && _ymdOf(cust.get('예식일'))) || 'nodate')).getId();
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
function _pvPublic(code, cust) { _gsr_();
  // [PV_CAT_1031] buildProductionState 가 부른다 · 미리보기가 들어왔으면 이 조회에서 «확인 필요»로 바꿔 둔다
  if (!code || !cust) return null;
  var out = { up: _pvLive_(), st: '', d: null, consent: false, prev: null, conf: null, due: _pvDue_(cust), wed: (typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '') || '' };
  try {
    var sh = _pvSheet_(), row = _pvRow_(sh, code);
    if (!row) return out;
    var m = row.m || {};
    if (_pvSeePreview_(m)) {
      var lock = LockService.getScriptLock();
      try { lock.waitLock(8000); var r2 = _pvRow_(sh, code); if (r2) { r2.m.prev = m.prev; r2.m.st = m.st; _pvWrite_(sh, r2, code, r2.d, r2.m); } } catch (e) {} finally { try { lock.releaseLock(); } catch (e2) {} }
    }
    out.st = String(m.st || '');
    out.d = row.d || null;
    out.consent = !!(m.consent && m.consent.at);
    if (m.prev && m.prev.id) out.prev = { url: 'https://drive.google.com/file/d/' + m.prev.id + '/preview', at: String(m.prev.at || '') };
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
  if (String(s.row.get('상품타입') || '').trim() === '웨딩스냅') return { err: { ok: false, error: '웨딩스냅은 식전 영상이 없어요.' } };
  return { code: code, cust: s.row };
}
function _pvConsentGive_(m, code) {
  m.consent = { at: fmtKST(new Date()), ver: PV_UP.from };
  try { if (typeof _recordHandler === 'function') _recordHandler(code, '식전 영상 동의 · 처리방침 ' + PV_UP.from); } catch (e) {}
}
// 관리자 메일 — 코드마다 10분에 한 통(같은 사람이 여러 번 보내도 메일이 쌓이지 않게)
function _pvAdminMail_(code, line) {
  try {
    var c = CacheService.getScriptCache(), k = 'pvMail_' + code; if (c.get(k)) return; c.put(k, '1', 600);
    if (typeof _nfAdminLineEmail === 'function') _nfAdminLineEmail(line);
  } catch (e) {}
}

/* 저장 · 보내기 · 확정 · 나중에 · 사용하지 않기 — op 하나로
   op: save(초안만) · submit(사진으로 만들기 · 준비한 영상 보내기) · confirm(미리보기 확정) · later · off · reopen */
function handlePvSave(body) { _gsr_();
  // [PV_CAT_1031] 세션으로만(코드를 받지 않는다) · 시행일 전 · 기한 뒤는 받지 않는다
  body = body || {};
  var se = _pvSess_(body); if (se.err) return se.err;
  if (!_pvLive_()) return { ok: false, closed: true, error: '식전 영상은 ' + Number(PV_UP.from.slice(5, 7)) + '월 ' + Number(PV_UP.from.slice(8, 10)) + '일부터 준비하실 수 있어요.' };
  var code = se.code, cust = se.cust, op = String(body.op || 'save'), due = _pvDue_(cust), wed = (typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '') || '';
  if (['save', 'submit', 'confirm', 'later', 'off', 'reopen'].indexOf(op) < 0) return { ok: false, error: '알 수 없는 요청이에요.' };
  var lock = LockService.getScriptLock(), mail = '', jobs = [], wrote = false;
  try { lock.waitLock(15000); } catch (e) { return { ok: false, ecode: 'S1', error: '다른 처리가 진행 중이에요 · 잠시 뒤 다시 눌러 주세요' }; }
  try {
    var sh = _pvSheet_(), row = _pvRow_(sh, code), m = (row && row.m) || {}, d0 = (row && row.d) || {};
    var st = String(m.st || '');
    if (_pvPast_(due) && !(op === 'confirm' && st === 'review' && (m.submit || {}).day && String(m.submit.day) <= due)) return { ok: false, locked: true, error: '확정 기한이 지났어요 · 바꾸실 것은 디렉터에게 말씀해 주세요' };
    var d = (op === 'later' || op === 'off' || op === 'reopen' || op === 'confirm') ? (body.draft ? _pvNorm_(body.draft, m, wed) : _pvNorm_(d0, m, wed)) : _pvNorm_(body.draft, m, wed);
    if (op === 'save') {
      if (st === 'done' || st === 'editing') m.st = _pvSame_(d, m.confD || null) ? 'done' : 'editing';
      else if (st === 'making' || st === 'checking' || st === 'review') { if (!_pvSame_(d, _pvNorm_(d0, m, wed))) { m.st = 'draft'; mail = '식전 영상 · ' + code + ' · 보낸 뒤 다시 고치는 중이에요(지금 작업은 멈춰도 돼요)'; } }
      else m.st = 'draft';
    } else if (op === 'later') { if (['done', 'editing', 'making', 'checking', 'review'].indexOf(st) < 0) m.st = 'later'; }
    else if (op === 'off') { m.st = 'off'; }
    else if (op === 'reopen') { if (st === 'off' || st === 'later' || !st) m.st = 'draft'; }
    else if (op === 'submit') {
      if (!(m.consent && m.consent.at)) { if (!body.pvConsent) return { ok: false, consent: false, error: '식전 영상 동의가 필요해요.' }; _pvConsentGive_(m, code); }
      if (d.mode === 'make') {
        if (!d.style) return { ok: false, error: '분위기를 골라 주세요.' };
        if (d.photos.length < PV_UP.min) return { ok: false, error: '사진은 ' + PV_UP.min + '장부터 만들 수 있어요.' };
        if (!d.song) return { ok: false, error: '곡을 골라 주세요.' };
      } else if (d.mode === 'upload') {
        if (!d.link) return { ok: false, error: '공유 링크를 넣어 주세요.' };
        if (_pvYoutube_(d.link)) return { ok: false, error: '유튜브 주소로는 원본을 받을 수 없어요 · 구글 드라이브나 업체 공유 링크로 보내 주세요' };
      } else return { ok: false, error: '준비 방법을 골라 주세요.' };
      _pvFolder_(m, code, cust);
      var n = (Number((m.submit || {}).n) || 0) + 1;
      m.submit = { n: n, ts: Date.now(), at: fmtKST(new Date()), day: _kstYmd(new Date()), kind: d.mode };
      m.prev = null;
      m.st = d.mode === 'make' ? 'making' : 'checking';
      var fUrl = 'https://drive.google.com/drive/folders/' + m.folder;
      mail = d.mode === 'make'
        ? ('식전 영상 만들기 요청 · ' + code + ' · 예식 ' + (wed || '-') + ' · 분위기 ' + d.style + ' · 곡 ' + d.song + ' · 사진 ' + d.photos.length + '장 · 확정 기한 ' + (due || '-') + ' · 다 만들면 폴더에 «미리보기»로 시작하는 이름의 영상을 넣어 주세요 · 폴더 ' + fUrl)
        : ('준비한 식전 영상 도착 · ' + code + ' · 예식 ' + (wed || '-') + ' · 링크 ' + d.link + ' · 원본을 받아 재생을 확인한 뒤 폴더에 «미리보기»로 시작하는 이름으로 넣어 주세요 · 폴더 ' + fUrl);
    } else if (op === 'confirm') {
      if (st !== 'review' || !(m.prev && m.prev.id)) return { ok: false, error: '확정할 영상이 아직 없어요.' };
      m.conf = { at: fmtKST(new Date()), prev: m.prev.id };
      m.confD = d;
      m.st = 'done';
      mail = '식전 영상 확정 · ' + code + ' · 예식 ' + (wed || '-') + ' · 상영 파일 확보 · 재생 확인을 해 주세요';
    }
    // 기획에서 빠졌고 올린 지 10분 넘은 사진은 지운다(방금 올려 저장을 기다리는 사진은 남긴다) · 확정본에 쓰인 사진은 남긴다
    var used = {}, now = Date.now(), keep = [], gone = [];
    d.photos.forEach(function (p) { used[p.id] = 1; });
    _pvArr_((m.confD || {}).photos).forEach(function (p) { used[p.id] = 1; });
    _pvArr_(m.uploads).forEach(function (u) { if (!u || !u.id) return; if (used[u.id] || now - (Number(u.ts) || 0) < 600000) keep.push(u); else gone.push(u); });
    if (gone.length) { m.uploads = keep; jobs.push(function () { gone.forEach(function (u) { try { DriveApp.getFileById(u.id).setTrashed(true); } catch (e) {} if (u.th) { try { DriveApp.getFileById(u.th).setTrashed(true); } catch (e2) {} } }); }); }
    _pvWrite_(sh, row, code, d, m);
    wrote = true;
  } finally { try { lock.releaseLock(); } catch (e) {} }
  if (!wrote) return { ok: false, error: '저장하지 못했어요 · 다시 눌러 주세요' };
  if (mail) _pvAdminMail_(code, mail);   // 메일 · 드라이브 정리는 잠금 밖에서(느린 일)
  jobs.forEach(function (f) { try { f(); } catch (e) {} });
  return { ok: true, pv: _pvPublic(code, cust) };
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
  try { var c = CacheService.getScriptCache(), hk = 'pvUp_' + code, hn = Number(c.get(hk) || 0); if (hn >= PV_UP.hourMax) return { ok: false, ecode: 'U1', error: '사진을 많이 올리셨어요 · 잠시 뒤 다시 해 주세요' }; c.put(hk, String(hn + 1), 3600); } catch (e) {}
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
    m2.uploads = _pvArr_(m2.uploads).concat([{ id: f1.getId(), th: f2.getId(), sec: sec, ts: Date.now() }]);
    d2.photos = _pvArr_(d2.photos).concat([{ id: f1.getId(), sec: sec, n: String(body.name || '').slice(0, 60) }]);
    var st = String(m2.st || '');
    if (!st || st === 'later' || st === 'off') m2.st = 'draft';
    else if (st === 'done') m2.st = 'editing';
    else if (st === 'making' || st === 'checking' || st === 'review') m2.st = 'draft';
    var nd = _pvNorm_(d2, m2, (typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '') || '');
    if (!nd.mode) nd.mode = 'make';
    _pvWrite_(sh, r2, code, nd, m2);
  } finally { try { lock.releaseLock(); } catch (e) {} }
  return { ok: true, id: f1.getId(), th: f2.getId() };
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
  var sh = _pvSheet_(), last = sh.getLastRow(), gone = [];
  if (last < 2) return gone;
  var today = _kstYmd(new Date()), vals = sh.getRange(2, 1, last - 1, PV_HEAD.length).getValues();
  for (var i = 0; i < vals.length; i++) {
    var code = String(vals[i][0] || '').trim(); if (!code) continue;
    var cust = null; try { cust = findCustomerByCode(code); } catch (e) { continue; }
    var wed = cust && typeof _ymdOf === 'function' ? _ymdOf(cust.get('예식일')) : '';
    if (!wed || _pvYmdAdd_(wed, PV_UP.keepDays) > today) continue;
    var m = {}; try { m = JSON.parse(String(vals[i][4] || '{}')) || {}; } catch (e) { m = {}; }
    if (!m.folder && !String(vals[i][3] || '').replace(/[{}"\s]/g, '')) continue;
    gone.push(code);
    if (dry) continue;
    if (m.folder) { try { DriveApp.getFolderById(String(m.folder)).setTrashed(true); } catch (e) {} }
    sh.getRange(i + 2, 2, 1, PV_HEAD.length - 1).setValues([['지움', '', '{}', JSON.stringify({ purged: fmtKST(new Date()) }), fmtKST(new Date())]]);
  }
  return gone;
}
