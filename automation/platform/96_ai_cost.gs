/** AI 비용 로그·집계 (2026-06-27)
 *  접점별 토큰을 적재하고, 관리자 페이지에서 최근 24시간·이번 달 비용을 원화(₩)로 집계한다.
 *   - 쓰기: doPost action='aiCostLog' → handleAiCostLog (Vercel 4개 엔드포인트가 호출)
 *   - 읽기: adminCall fn='aiCostSummary24h' (관리자 인증 경유 · 💰 버튼 클릭 시에만)
 *   - 시트: 'AI_비용로그' [시각, 접점, 모델, 입력, 출력, 캐시쓰기, 캐시읽기, 비용USD]
 *  ※ 금액은 추정치(단가×토큰). Anthropic 콘솔 청구액과 약간 차이날 수 있음. 환율·단가는 아래 CONFIG.
 */
var AI_COST_CFG = {
  USD_KRW: 1400,    // 원/달러 (추정 — 변동 시 이 값만 수정)
  RETAIN_DAYS: 35,  // 로그 보관일(이번 달 집계 커버 · 그 이후 자동 삭제)
  // 모델별 1M토큰당 USD [입력, 출력]. 캐시쓰기=입력×1.25, 캐시읽기=입력×0.1.
  PRICE: {
    'claude-opus-4-8':   { input: 5, output: 25 },
    'claude-sonnet-4-6': { input: 3, output: 15 },
    'claude-haiku-4-5':  { input: 1, output: 5 }
  }
};

function _aiCostUSD_(model, inn, out, cw, cr) {
  var p = AI_COST_CFG.PRICE[model] || AI_COST_CFG.PRICE['claude-sonnet-4-6'];
  return (inn * p.input + out * p.output + cw * p.input * 1.25 + cr * p.input * 0.1) / 1e6;
}

function _aiCostSheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('AI_비용로그');
  if (!sh) { sh = SpreadsheetApp.getActive().insertSheet('AI_비용로그'); sh.appendRow(['시각', '접점', '모델', '입력', '출력', '캐시쓰기', '캐시읽기', '비용USD']); }
  return sh;
}

/** Vercel 챗봇 → 토큰 1건 적재 (doPost action='aiCostLog') */
function handleAiCostLog(body) {
  try {
    var surface = String((body && body.surface) || '').slice(0, 16) || '기타';
    var model = String((body && body.model) || '').slice(0, 40);
    var inn = Math.max(0, Number(body && body.in) || 0);
    var out = Math.max(0, Number(body && body.out) || 0);
    var cw = Math.max(0, Number(body && body.cw) || 0);
    var cr = Math.max(0, Number(body && body.cr) || 0);
    if (!model || (inn + out + cw + cr) === 0) return { ok: true };
    var sh = _aiCostSheet_();
    if (sh.getLastRow() > 20000) return { ok: true };   // 폭주 가드(정리 전 상한)
    sh.appendRow([new Date(), surface, model, inn, out, cw, cr, _aiCostUSD_(model, inn, out, cw, cr)]);
  } catch (e) { try { Logger.log('aiCostLog 실패: ' + (e && e.message)); } catch (_) {} }
  return { ok: true };
}

/** 관리자: 최근 24시간 + 이번 달 비용을 접점별로 집계해 원화로 반환 (adminCall fn='aiCostSummary24h') */
function aiCostSummary24h() {
  var rate = AI_COST_CFG.USD_KRW, tz = 'Asia/Seoul';
  var base = { ok: true, rate: rate, day: { total: 0, calls: 0, bySurface: [] }, month: { total: 0, calls: 0 }, updatedAt: fmtKST(new Date()) };
  var sh = SpreadsheetApp.getActive().getSheetByName('AI_비용로그');
  if (!sh || sh.getLastRow() < 2) return base;
  var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 8).getValues();   // [시각,접점,모델,in,out,cw,cr,usd]
  var now = new Date(), dayCut = new Date(now.getTime() - 24 * 3600 * 1000);
  var thisMonth = Utilities.formatDate(now, tz, 'yyyy-MM');
  var day = {}, dayTotal = 0, dayCalls = 0, monTotal = 0, monCalls = 0;
  for (var i = 0; i < vals.length; i++) {
    var t = vals[i][0]; if (!(t instanceof Date)) t = new Date(t);
    if (isNaN(t.getTime())) continue;
    var surface = String(vals[i][1] || '기타'), usd = Number(vals[i][7]) || 0;
    if (Utilities.formatDate(t, tz, 'yyyy-MM') === thisMonth) { monTotal += usd; monCalls++; }
    if (t >= dayCut) {
      if (!day[surface]) day[surface] = { surface: surface, usd: 0, calls: 0 };
      day[surface].usd += usd; day[surface].calls++; dayTotal += usd; dayCalls++;
    }
  }
  var order = ['메인', '마이페이지', '예약', '애프터', '핸드오프'];
  var bySurface = Object.keys(day).map(function (k) { return day[k]; })
    .sort(function (a, b) { var ia = order.indexOf(a.surface), ib = order.indexOf(b.surface); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib); })
    .map(function (s) { return { surface: s.surface, krw: Math.round(s.usd * rate), calls: s.calls }; });
  return {
    ok: true, rate: rate,
    day: { total: Math.round(dayTotal * rate), calls: dayCalls, bySurface: bySurface },
    month: { total: Math.round(monTotal * rate), calls: monCalls },
    updatedAt: fmtKST(new Date())
  };
}

/** [정리] RETAIN_DAYS 지난 로그 삭제 — purgeAdvisorLog에서 함께 호출(별도 트리거 불필요) */
function purgeAiCostLog() {
  try {
    var sh = SpreadsheetApp.getActive().getSheetByName('AI_비용로그');
    if (!sh || sh.getLastRow() < 2) return;
    var cutoff = new Date(); cutoff.setDate(cutoff.getDate() - AI_COST_CFG.RETAIN_DAYS);
    var vals = sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues();   // append 순 → 위쪽이 오래된 것
    var del = 0;
    for (var i = 0; i < vals.length; i++) { var t = vals[i][0]; if (!(t instanceof Date)) t = new Date(t); if (!isNaN(t.getTime()) && t < cutoff) del++; else break; }
    if (del > 0) { sh.deleteRows(2, del); Logger.log('purgeAiCostLog: ' + del + '건 삭제'); }
  } catch (e) { try { Logger.log('purgeAiCostLog 실패: ' + (e && e.message)); } catch (_) {} }
}

// ============================ AI 테스트 시나리오 (관리자 편집·영구) ============================
//  관리자 페이지 🧪 버튼이 쓰는 커스텀 테스트 질문. 한 줄에 하나: "접점|질문"
//  (접점 = 메인 / 마이 / 예약 / 애프터 / 핸드오프). 내장 4축 시나리오에 더해 함께 실행됨.
function _aiTestSheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('AI_테스트시나리오');
  if (!sh) { sh = SpreadsheetApp.getActive().insertSheet('AI_테스트시나리오'); sh.appendRow(['접점|질문  (접점=메인/마이/예약/애프터/핸드오프 · 한 줄에 하나)']); }
  return sh;
}
function aiTestScenarios() {   // adminCall — 저장된 커스텀 시나리오 텍스트 반환
  var sh = _aiTestSheet_(); var n = sh.getLastRow() - 1, lines = [];
  if (n > 0) { var v = sh.getRange(2, 1, n, 1).getValues(); for (var i = 0; i < v.length; i++) { var s = String(v[i][0] || '').trim(); if (s) lines.push(s); } }
  return { ok: true, text: lines.join('\n') };
}
function aiTestScenariosSave(text) {   // adminCall — 커스텀 시나리오 저장(최대 50줄 · "접점|질문" 형식만)
  var sh = _aiTestSheet_();
  if (sh.getLastRow() > 1) sh.deleteRows(2, sh.getLastRow() - 1);
  var lines = String(text || '').split('\n').map(function (s) { return s.trim(); })
    .filter(function (s) { return s && s.indexOf('|') > 0; }).slice(0, 50);
  if (lines.length) sh.getRange(2, 1, lines.length, 1).setValues(lines.map(function (s) { return [s]; }));
  return { ok: true, count: lines.length };
}

// ============================ AI 교육 (운영자 보충지식) ============================
//  관리자가 알려주는 보충 지식. 챗봇이 핵심 KB '뒤에' 덧붙여 읽는다(핵심 가격·계약은 절대 못 덮음).
//  시트 'AI_보충지식' [id, 시각, 대상, 내용, 활성]. 대상 = 전체/메인/마이/예약/애프터.
//  안전장치: 가격·계약·환불 등 핵심으로 보이는 내용은 추가 차단(잘못 나가면 위험 → 개발자 경유).
var AI_KB_PROTECT = /(\d{1,4}\s*만\s*원|[0-9][0-9,]{3,}\s*원|\d{1,3}\s*%|\b(280|210|149|150)\b)/;   // 실제 금액·비율·핵심 수치만 차단(단어만으론 막지 않음)
function _aiKbSheet_() {
  var sh = SpreadsheetApp.getActive().getSheetByName('AI_보충지식');
  if (!sh) { sh = SpreadsheetApp.getActive().insertSheet('AI_보충지식'); sh.appendRow(['id', '시각', '대상', '내용', '활성']); }
  return sh;
}
function _aiKbRows_() { var sh = _aiKbSheet_(); var n = sh.getLastRow() - 1; return n > 0 ? sh.getRange(2, 1, n, 5).getValues() : []; }
function aiKbNoteList() {   // adminCall — 보충지식 전체 목록
  return { ok: true, notes: _aiKbRows_().map(function (r) { return { id: String(r[0]), at: String(r[1]), target: String(r[2] || '전체'), text: String(r[3] || ''), active: String(r[4]) === 'Y' }; }) };
}
function aiKbNoteAdd(target, text) {   // adminCall — 추가(핵심정보 차단)
  text = String(text || '').replace(/[\r\n\t]/g, ' ').trim().slice(0, 300);
  target = String(target || '전체').trim() || '전체';
  if (!text) return { ok: false, error: '내용이 비었어요.' };
  if (AI_KB_PROTECT.test(text)) return { ok: false, error: '가격·계약·환불 등 핵심 정보로 보이는 내용은 교육으로 추가할 수 없어요(잘못 나가면 위험). 핵심 변경은 개발자에게 요청해 주세요.' };
  if (_aiKbRows_().length >= 100) return { ok: false, error: '보충지식이 너무 많아요(100개 상한). 오래된 것 정리 후 추가하세요.' };
  _aiKbSheet_().appendRow(['K' + (new Date()).getTime().toString(36), fmtKST(new Date()), target, text, 'Y']);
  return { ok: true };
}
function aiKbNoteSetActive(id, on) {   // adminCall — 켜기/끄기(즉시 무효화)
  var sh = _aiKbSheet_(), rows = _aiKbRows_();
  for (var i = 0; i < rows.length; i++) { if (String(rows[i][0]) === String(id)) { sh.getRange(i + 2, 5).setValue(on ? 'Y' : ''); return { ok: true }; } }
  return { ok: false, error: '항목을 찾을 수 없어요.' };
}
function aiKbNoteDelete(id) {   // adminCall — 삭제
  var sh = _aiKbSheet_(), rows = _aiKbRows_();
  for (var i = 0; i < rows.length; i++) { if (String(rows[i][0]) === String(id)) { sh.deleteRows(i + 2, 1); return { ok: true }; } }
  return { ok: false, error: '항목을 찾을 수 없어요.' };
}
// 챗봇용 — 특정 접점의 활성 보충지식을 한 덩어리로 (doPost action='aiKbNotes' · Vercel 챗봇이 호출)
function handleAiKbNotes(body) {
  try {
    var surface = String((body && body.surface) || '').trim();
    var rows = _aiKbRows_(), out = [];
    for (var i = 0; i < rows.length; i++) { if (String(rows[i][4]) !== 'Y') continue; var tg = String(rows[i][2] || '전체'); if (tg === '전체' || tg === surface) out.push('- ' + String(rows[i][3] || '')); }
    return { ok: true, notes: out.join('\n') };
  } catch (e) { return { ok: true, notes: '' }; }
}

// ============================ AI 테스트 이력 + 관리자 알림 ============================
// ③ 테스트 결과 이력 — 매 실행 요약 저장, 직전 대비 비교용. 시트 'AI_테스트이력' [시각, 통과, 전체]
function _aiTestHistSheet_() { var sh = SpreadsheetApp.getActive().getSheetByName('AI_테스트이력'); if (!sh) { sh = SpreadsheetApp.getActive().insertSheet('AI_테스트이력'); sh.appendRow(['시각', '통과', '전체']); } return sh; }
function aiTestRunSave(pass, total) {   // adminCall — 이번 결과 저장 + 직전 결과 반환
  var sh = _aiTestHistSheet_(), prev = null;
  if (sh.getLastRow() > 1) { var last = sh.getRange(sh.getLastRow(), 1, 1, 3).getValues()[0]; prev = { at: String(last[0]), pass: Number(last[1]) || 0, total: Number(last[2]) || 0 }; }
  sh.appendRow([fmtKST(new Date()), Number(pass) || 0, Number(total) || 0]);
  if (sh.getLastRow() > 201) sh.deleteRows(2, sh.getLastRow() - 201);   // 최근 200건 유지
  return { ok: true, prev: prev };
}
// ⑥ 월 예산 한도(원) — 인건비 탭에서 설정. ScriptProperties 저장.
function aiBudgetGet() { return { ok: true, krw: Number(PropertiesService.getScriptProperties().getProperty('AI_MONTH_BUDGET_KRW') || 0) }; }
function aiBudgetSet(krw) { PropertiesService.getScriptProperties().setProperty('AI_MONTH_BUDGET_KRW', String(Math.max(0, Math.round(Number(krw) || 0)))); return { ok: true }; }

// ④ 문제 시 관리자 문자 알림 — 기존 SOLAPI 발송(_solapiSend·_nfProps) 재사용. ADMIN_PHONE으로.
function aiAlertAdmin(text) {   // adminCall — 실문자 발송(요금 발생)
  try {
    var cfg = _nfProps();
    if (!cfg.key || !cfg.secret || !cfg.sender || !cfg.adminPhone) return { ok: false, error: '알림 설정 누락(SOLAPI/ADMIN_PHONE)' };
    _solapiSend(cfg, { to: cfg.adminPhone, from: cfg.sender, text: ('[AI 직원실] ' + String(text || '')).slice(0, 300) });
    return { ok: true };
  } catch (e) { return { ok: false, error: String(e && e.message) }; }
}
