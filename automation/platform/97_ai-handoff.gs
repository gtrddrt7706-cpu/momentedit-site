/** ============================ 97 · AI 상담 인계 (Vercel /api/handoff → 관리자) ============================
 * 홈페이지 AI 상담 도우미가 못 푼 대화를 Vercel(/api/handoff)이 브리핑으로 만들어 이 웹앱(doPost action='aiHandoff')으로 보낸다.
 * 여기서 'AI상담인계' 시트에 적재 → 관리자 화면(Admin.html) 홈 상단 'AI 상담 인계' 카드로 노출.
 * 브리핑 = { category 분류, summary 요약, suggestedReply 제안답변, rationale 근거·확인사항, confidence 확신도 } — 관리자 전용.
 *
 * 보안: 스크립트 속성 AI_HANDOFF_SECRET 설정 시 body.secret 일치 필수(미설정이면 공개 수신·길이 가드만).
 * 의존: 없음(독립 모듈). adminList/Resolve는 admin.gs FNS에 등록되어 adminCall 게이트(_requireAdmin) 안에서 호출됨.
 */

var AIH_SHEET = 'AI상담인계';
var AIH_HEADERS = ['ID', '접수일시', '상태', '페이지', '분류', '확신도', '고객', '요약', '제안답변', '근거', '대화', '처리일시'];

function _aihSheet() {
  var ss = SpreadsheetApp.getActive();
  var sh = ss.getSheetByName(AIH_SHEET);
  if (!sh) {
    sh = ss.insertSheet(AIH_SHEET);
    sh.getRange(1, 1, 1, AIH_HEADERS.length).setValues([AIH_HEADERS]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}
function _aihNow() { return Utilities.formatDate(new Date(), 'Asia/Seoul', 'yyyy-MM-dd HH:mm'); }
function _aihStr(v, max) { return String(v == null ? '' : v).replace(/\s+$/, '').slice(0, max || 4000); }

/** 수신 (공개 엔드포인트 · doPost 라우터에서 호출) */
function handleAiHandoff(body) {
  try {
    var secret = '';
    try { secret = PropertiesService.getScriptProperties().getProperty('AI_HANDOFF_SECRET') || ''; } catch (e) {}
    if (secret && _aihStr((body && body.secret), 80) !== secret) return { ok: false, error: 'unauthorized' };

    var brief = (body && body.brief && typeof body.brief === 'object') ? body.brief : {};
    var convo = Array.isArray(body && body.conversation) ? body.conversation : [];
    if (!brief.summary && !convo.length) return { ok: false, error: 'empty' };

    var cust = (body && body.customer && typeof body.customer === 'object') ? body.customer : null;
    var custTxt = cust
      ? [cust.name, cust.code, cust.stage, cust.phone].filter(function (x) { return x; }).map(String).join(' · ')
      : '비로그인 방문자';

    var id = 'H' + new Date().getTime().toString(36).toUpperCase() + Math.floor(Math.random() * 36 * 36).toString(36).toUpperCase();
    var row = [
      id, _aihNow(), '대기',
      _aihStr(body.page, 20) || '메인',
      _aihStr(brief.category, 60) || '미분류',
      _aihStr(brief.confidence, 10) || '',
      _aihStr(custTxt, 160),
      _aihStr(brief.summary, 1200),
      _aihStr(brief.suggestedReply, 2400),
      _aihStr(brief.rationale, 2400),
      _aihStr(convo.slice(-16).join('\n'), 6000),
      ''
    ];
    var lock = LockService.getScriptLock();
    try { lock.waitLock(10000); } catch (e) { return { ok: false, error: 'busy' }; }
    try { _aihSheet().appendRow(row); } finally { try { lock.releaseLock(); } catch (e) {} }
    try { _aihNotifyNew(row[4], brief.summary || '', custTxt); } catch (e) {}   // 🔴 새 인계 즉시 관리자 알림
    return { ok: true, id: id };
  } catch (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  }
}

/** 🔴 새 인계 관리자 SMS — 주간(08~22시)은 즉시(60초 버스트 가드), 야간(22~08시)은 보류 → 아침 9시 aiDaily가 모아 알림(새벽 문자 방지). */
function _aihNotifyNew(category, summary, customer) {
  try {
    var p = PropertiesService.getScriptProperties();
    var hour = Number(Utilities.formatDate(new Date(), 'Asia/Seoul', 'H'));
    if (hour >= 22 || hour < 8) {   // 야간 보류 — 카운트만 누적, 발송은 아침에
      p.setProperty('AI_HANDOFF_NIGHT_PENDING', String((Number(p.getProperty('AI_HANDOFF_NIGHT_PENDING') || 0)) + 1));
      return;
    }
    var now = new Date().getTime(), last = Number(p.getProperty('AI_LAST_HANDOFF_ALERT') || 0);
    if (now - last < 60000) return;   // 1분 내 중복 발송 억제
    p.setProperty('AI_LAST_HANDOFF_ALERT', String(now));
    if (typeof aiAlertAdmin === 'function') aiAlertAdmin('📋 새 인계: ' + (category || '문의') + ' · ' + String(summary || '').slice(0, 60) + ' (' + String(customer || '').slice(0, 30) + ')');
  } catch (e) {}
}

/** 🌙 야간 보류 인계 아침 발송 — aiDaily(9시)가 호출. 밤사이 들어온 새 인계 건수를 한 통으로. */
function aiHandoffNightFlush() {
  try {
    var p = PropertiesService.getScriptProperties();
    var n = Number(p.getProperty('AI_HANDOFF_NIGHT_PENDING') || 0);
    if (n > 0) { p.setProperty('AI_HANDOFF_NIGHT_PENDING', '0'); if (typeof aiAlertAdmin === 'function') aiAlertAdmin('🌙 밤사이 새 인계 ' + n + '건이 들어왔어요. 관리자 페이지 📋에서 확인해 주세요.'); }
    return { ok: true, flushed: n };
  } catch (e) { return { ok: false }; }
}

/** 🔴 미처리 인계 24h 리마인드 — 트리거(aiDaily)에서 호출. 대기 상태로 24시간 넘긴 건이 있으면 1통. */
function aiHandoffReminder() {
  var sh = SpreadsheetApp.getActive().getSheetByName(AIH_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, old: 0 };
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 3).getValues();
  var cutoff = new Date(new Date().getTime() - 24 * 3600 * 1000), old = 0;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][2]).trim() !== '대기') continue;
    var d = new Date(vals[i][1]);
    if (!isNaN(d.getTime()) && d < cutoff) old++;
  }
  if (old > 0) { try { if (typeof aiAlertAdmin === 'function') aiAlertAdmin('⏰ 미처리 인계 ' + old + '건(24시간 경과). 관리자 페이지 📋에서 확인해 주세요.'); } catch (e) {} }
  return { ok: true, old: old };
}

/** [점검·읽기 전용] 현재 '대기' 인계 전체를 읽기 좋은 텍스트로 로그/반환 — 80건이 진짜 질문인지 테스트인지
 *  한눈에 보고 답변 검토용. 각 건: 번호·접수일시·페이지/분류·고객·질문요약·AI 제안답변(앞부분). 발송·변경 없음.
 *  실행 후 로그(Ctrl+Enter) 복사 → 진짜 건은 답변 작성, 테스트면 clearAllPendingAiHandoff로 정리.
 */
function dumpPendingAiHandoff() {
  var sh = SpreadsheetApp.getActive().getSheetByName(AIH_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, pending: 0, text: '대기 인계 없음' };
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, AIH_HEADERS.length).getValues();
  var lines = [], n = 0;
  for (var i = 0; i < vals.length; i++) {
    if (String(vals[i][2]).trim() !== '대기') continue;
    n++;
    lines.push(n + '. [' + vals[i][1] + '] ' + (vals[i][3] || '') + '/' + (vals[i][4] || '') + ' · 고객: ' + (vals[i][6] || '-')
      + '\n   Q: ' + String(vals[i][7] || '').slice(0, 240)
      + '\n   A(제안): ' + String(vals[i][8] || '').slice(0, 240));
  }
  var text = '대기 인계 ' + n + '건\n\n' + lines.join('\n\n');
  Logger.log(text.slice(0, 45000));
  return { ok: true, pending: n, text: text };
}

/** [일괄 정리 · 수동 1회] 현재 '대기' 인계 전부를 '일괄정리'로 표시 — 행은 보존하되 미처리 카운트에서 제거.
 *  쌓인 테스트/오래된 대기 건을 한 번에 비울 때 사용(예: 80건). 처리일시 기록.
 *  ※ 실제 응대가 필요한 건은 관리자 페이지 📋에서 개별 '완료'를 권장(이 함수는 전부 일괄 처리).
 */
function clearAllPendingAiHandoff() {
  var sh = SpreadsheetApp.getActive().getSheetByName(AIH_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, cleared: 0 };
  var n = sh.getLastRow() - 1;
  var st = sh.getRange(2, 3, n, 1).getValues();   // 상태 열
  var now = _aihNow(), cleared = 0;
  for (var i = 0; i < n; i++) {
    if (String(st[i][0]).trim() === '대기') {
      sh.getRange(i + 2, 3).setValue('일괄정리');
      sh.getRange(i + 2, 12).setValue(now);
      cleared++;
    }
  }
  Logger.log('clearAllPendingAiHandoff: ' + cleared + '건 정리(일괄정리)');
  return { ok: true, cleared: cleared };
}

/** [자동 정리 · 주간] '대기'로 N일(기본 30 · 스크립트 속성 AIH_EXPIRE_DAYS로 조정) 넘긴 인계를 '만료'로 표시.
 *  → 미처리 카운트에서 빠져 aiHandoffReminder가 오래된 건으로 매일 알림 보내는 누적을 막음. 행은 보존(감사용).
 *  purgeAdvisorLog(주간 트리거)가 함께 호출 — 별도 트리거 불필요.
 */
function purgeAiHandoff() {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName(AIH_SHEET);
    if (!sh || sh.getLastRow() < 2) return { ok: true, expired: 0 };
    var days = Number(PropertiesService.getScriptProperties().getProperty('AIH_EXPIRE_DAYS')) || 30;
    var cutoff = new Date(new Date().getTime() - days * 24 * 3600 * 1000);
    var n = sh.getLastRow() - 1;
    var rows = sh.getRange(2, 1, n, 3).getValues();   // ID, 접수일시, 상태
    var now = _aihNow(), expired = 0;
    for (var i = 0; i < n; i++) {
      if (String(rows[i][2]).trim() !== '대기') continue;
      var d = new Date(rows[i][1]);
      if (!isNaN(d.getTime()) && d < cutoff) {
        sh.getRange(i + 2, 3).setValue('만료');
        sh.getRange(i + 2, 12).setValue(now);
        expired++;
      }
    }
    if (expired) Logger.log('purgeAiHandoff: ' + expired + '건 만료(' + days + '일 경과)');
    return { ok: true, expired: expired };
  } catch (e) { Logger.log('purgeAiHandoff 실패: ' + (e && e.message)); return { ok: false }; }
}

/** 관리자 — 대기 목록 (adminCall 경유 · 최신순 최대 30건) */
function adminListAiHandoffs() {
  var sh = SpreadsheetApp.getActive().getSheetByName(AIH_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: true, items: [], pending: 0 };
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, AIH_HEADERS.length).getValues();
  var items = [], pending = 0;
  for (var i = vals.length - 1; i >= 0; i--) {           // 최신이 아래 → 역순
    var v = vals[i];
    if (String(v[2]).trim() !== '대기') continue;
    pending++;
    if (items.length < 30) {
      items.push({ id: String(v[0]), at: String(v[1]), page: String(v[3]), category: String(v[4]), confidence: String(v[5]), customer: String(v[6]), summary: String(v[7]), suggestedReply: String(v[8]), rationale: String(v[9]), conversation: String(v[10]) });
    }
  }
  return { ok: true, items: items, pending: pending };
}

/** 관리자 — 처리 완료 (adminCall 경유 · 멱등) */
function adminResolveAiHandoff(id) {
  id = String(id || '').trim();
  if (!id) return { ok: false, error: 'ID가 없습니다.' };
  var sh = SpreadsheetApp.getActive().getSheetByName(AIH_SHEET);
  if (!sh || sh.getLastRow() < 2) return { ok: false, error: '인계 기록이 없습니다.' };
  var ids = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();
  for (var i = 0; i < ids.length; i++) {
    if (String(ids[i][0]).trim() === id) {
      if (String(sh.getRange(i + 2, 3).getValue()).trim() === '완료') return { ok: true, already: true };
      sh.getRange(i + 2, 3).setValue('완료');
      sh.getRange(i + 2, 12).setValue(_aihNow());
      return { ok: true };
    }
  }
  return { ok: false, error: '해당 인계를 찾을 수 없습니다.' };
}

/** 스케줄 AI 서버측 점유 맵 조회 (공개 엔드포인트 · doPost action='aiAvailability')
 * Vercel /api/schedule-advisor 가 비로그인(예약 페이지) 요청을 받을 때 호출한다.
 * 응답은 날짜·마감 슬롯만(이름 등 개인정보 없음). 점유 판정은 70_journey의 _weddingOccupancy와 동일 기준.
 * 보안: AI_HANDOFF_SECRET 설정 시 body.secret 일치 필수(aiHandoff와 같은 키 공유).
 */
function handleAiAvailability(body) {
  try {
    var secret = '';
    try { secret = PropertiesService.getScriptProperties().getProperty('AI_HANDOFF_SECRET') || ''; } catch (e) {}
    if (secret && _aihStr((body && body.secret), 80) !== secret) return { ok: false, error: 'unauthorized' };

    var sheet = getCustomersSheet(), colOf = buildHeaderIndex(sheet);
    var last = sheet.getLastRow(), taken = {};
    if (last >= P.DATA_START_ROW) {
      var wCol = colOf['예식일'], cCol = colOf['계약상태'], stCol = colOf['현재단계'], recCol = colOf['동의기록'];
      var vals = sheet.getRange(P.DATA_START_ROW, 1, last - P.DATA_START_ROW + 1, sheet.getLastColumn()).getValues();
      vals.forEach(function (row) {
        var occ = _weddingOccupancy(row[wCol - 1], row[cCol - 1], String(row[stCol - 1] || '').trim(), row[recCol - 1]);
        if (!occ) return;
        (taken[occ.date] = taken[occ.date] || []); if (taken[occ.date].indexOf(occ.slot) === -1) taken[occ.date].push(occ.slot);
      });
    }
    return { ok: true, taken: taken };
  } catch (err) {
    return { ok: false, error: 'unavailable' };   // 조회 실패 = 불명 — 빈 맵(전부 가능)으로 가장하지 않는다(더블부킹 방지 · Vercel이 안전 안내로 처리)
  }
}
