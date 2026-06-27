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
