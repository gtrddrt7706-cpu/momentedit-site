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
    return { ok: true, id: id };
  } catch (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  }
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
