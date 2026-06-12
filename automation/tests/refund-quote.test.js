/**
 * Moment Edit · _refundQuote(환불 예상액) 단위테스트 + GS/HTML 구문검증
 * ──────────────────────────────────────────────────────────────────────────
 * 실행: node automation/tests/refund-quote.test.js
 * 방식: 실제 소스(70_journey.gs · admin.gs · 00_platform-config.gs)에서 함수를 그대로 추출해
 *       vm 샌드박스(GAS 전역 스텁)에서 실행 — 계약서 v1-1 제7조·제9조·제4조⑧ 케이스 검증.
 * 기준 케이스(주말 총액 2,800,000 = 계약금 280,000(예약금 100,000 차감 → 계약 시 180,000 납부) / 중도금 1,120,000 / 잔금 1,400,000):
 *   ① 계약 전 2벌 → 60,000  ② 철회 14일째(2벌) → 60,000  ③ D-200 무상취소 paid 140만 → 1,260,000
 *   ④ D-100 위약 10%(28만) → 1,120,000  ⑤ D-5 50% paid 280만 → 1,400,000  ⑥ 당일 70%
 *   ⑦ 총액 미정 → {pending:true}  ⑧ 벌수 미기록 → needCount
 */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..', '..');
const SRC_JOURNEY = fs.readFileSync(path.join(ROOT, 'automation/platform/70_journey.gs'), 'utf8');
const SRC_ADMIN = fs.readFileSync(path.join(ROOT, 'automation/admin/admin.gs'), 'utf8');
const SRC_CONFIG = fs.readFileSync(path.join(ROOT, 'automation/platform/00_platform-config.gs'), 'utf8');

/* ── 소스 추출기 — 문자열·주석을 건너뛰며 중괄호 균형으로 선언 전체를 잘라냄 ── */
function sliceBalanced(src, openIdx) {
  let depth = 0, inStr = null, inLC = false, inBC = false;
  for (let i = openIdx; i < src.length; i++) {
    const ch = src[i];
    if (inLC) { if (ch === '\n') inLC = false; continue; }
    if (inBC) { if (ch === '/' && src[i - 1] === '*') inBC = false; continue; }
    if (inStr) { if (ch === '\\') { i++; continue; } if (ch === inStr) inStr = null; continue; }
    if (ch === '/' && src[i + 1] === '/') { inLC = true; continue; }
    if (ch === '/' && src[i + 1] === '*') { inBC = true; continue; }
    if (ch === '"' || ch === "'" || ch === '`') { inStr = ch; continue; }
    if (ch === '{') depth++;
    else if (ch === '}') { depth--; if (depth === 0) return src.slice(openIdx, i + 1); }
  }
  throw new Error('unbalanced braces at ' + openIdx);
}
function extractFunction(src, name) {
  const m = new RegExp('(^|\\n)\\s*function\\s+' + name + '\\s*\\(([^)]*)\\)').exec(src);
  if (!m) throw new Error('function not found: ' + name);
  const open = src.indexOf('{', m.index + m[0].length - 1);
  return 'function ' + name + '(' + m[2] + ') ' + sliceBalanced(src, open);
}
function extractVarObject(src, name) {
  const m = new RegExp('(^|\\n)var\\s+' + name + '\\s*=\\s*\\{').exec(src);
  if (!m) throw new Error('var not found: ' + name);
  const open = src.indexOf('{', m.index + m[0].length - 1);
  return 'var ' + name + ' = ' + sliceBalanced(src, open) + ';';
}
const stageExLine = (SRC_CONFIG.match(/var STAGE_EXCEPTIONS = \[[^\]]*\];/) || [])[0];
if (!stageExLine) throw new Error('STAGE_EXCEPTIONS not found in 00_platform-config.gs');

const code = [
  stageExLine,
  extractVarObject(SRC_JOURNEY, 'FITTING_CONSENT'),
  extractVarObject(SRC_JOURNEY, 'PAYMENT'),
  extractFunction(SRC_JOURNEY, '_parseJsonSafe'),
  extractFunction(SRC_JOURNEY, '_balanceDueLabel'),
  extractFunction(SRC_JOURNEY, '_midDueLabel'),
  extractFunction(SRC_JOURNEY, '_journeyAmounts'),
  extractFunction(SRC_JOURNEY, '_shiftYmd'),
  extractFunction(SRC_JOURNEY, '_refundQuote'),
  extractFunction(SRC_JOURNEY, 'buildRefundQuote'),
  extractFunction(SRC_ADMIN, '_kstYmd'),
  extractFunction(SRC_ADMIN, '_ymdOf'),
  extractFunction(SRC_ADMIN, '_ymdNum'),
  extractFunction(SRC_ADMIN, '_dayDiff')
].join('\n\n');

/* ── GAS 전역 스텁 샌드박스 ── */
const ctx = vm.createContext({
  console,
  Utilities: {
    formatDate(d, tz, fmt) {   // Asia/Seoul 고정 스텁
      const t = new Date(d.getTime() + 9 * 3600 * 1000);
      const p = n => ('0' + n).slice(-2);
      const ymd = t.getUTCFullYear() + '-' + p(t.getUTCMonth() + 1) + '-' + p(t.getUTCDate());
      return fmt === 'yyyy-MM-dd' ? ymd : ymd + ' ' + p(t.getUTCHours()) + ':' + p(t.getUTCMinutes());
    }
  },
  findRowByPersonalCode: () => null   // 테스트별로 교체
});
vm.runInContext(code, ctx);

/* ── 테스트 헬퍼 ── */
let pass = 0, fail = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) { pass++; console.log('  ok   ' + name); }
  else { fail++; failures.push(name + (detail ? '  →  ' + detail : '')); console.log('  FAIL ' + name + (detail ? '  →  ' + detail : '')); }
}
function row(fields) { return { get: h => (fields[h] != null ? fields[h] : '') }; }
function addDays(ymd, n) {
  const m = ymd.split('-').map(Number);
  return new Date(Date.UTC(m[0], m[1] - 1, m[2]) + n * 86400000).toISOString().slice(0, 10);
}
const ASOF = '2026-06-11';
const TOTAL = 2800000;          // 주말·공휴일 (계약서 4조①)
const MID = 1120000;            // 40% (계약금 잔액은 계약 시 별도 납부 · 4조③)
const BAL = 1400000;            // 50%
const bookingPaid = () => row({ 입금확인: '확인' });
// 서명 오래전(철회기한 경과) 시그니처 공통 필드
function signedBase(extra) {
  return Object.assign({
    상품타입: '시그니처', 현재단계: '입금완료', 계약상태: '서명완료', 입금상태: '확인',
    계약서명일시: '2026-01-05 10:00', 계약총액: TOTAL,
    시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { 벌수: 2 } }), 개인코드: 'TQ00'
  }, extra || {});
}

console.log('\n[1] _refundQuote — 계약서 v1-1 7조·9조·4조⑧ 케이스');

// ① 계약 전 · 2벌 → 예약금 10만 - 10만 = 0원 (4조⑧ 비례 공제 · Bookings 입금확인 폴백 경유)
ctx.findRowByPersonalCode = bookingPaid;
let q = ctx._refundQuote(row({ 상품타입: '시그니처', 현재단계: '시착', 계약상태: '', 입금상태: '',
  시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { 벌수: 2 } }), 개인코드: 'TQ01' }), ASOF);
check('① 계약 전 2벌: rule', q.rule === '계약 전', JSON.stringify(q));
check('① 계약 전 2벌: paid 100,000(Bookings 폴백)', q.paid === 100000, 'paid=' + q.paid);
check('① 계약 전 2벌: fitDeduct 100,000(상한)', q.fitDeduct === 100000 && q.fitCount === 2, JSON.stringify(q));
check('① 계약 전 2벌: refund 0 · penalty 0', q.refund === 0 && q.penalty === 0 && !q.needCount, 'refund=' + q.refund);

// ② 청약철회(7조①) — 서명 14일째 · D-100(위약 표 구간이어도 철회가 우선 · 4조④ 단서) · paid 28만(예약금 10만+계약금 잔액 18만) · 2벌 공제 10만
ctx.findRowByPersonalCode = () => null;
q = ctx._refundQuote(row(signedBase({ 계약서명일시: '2026-06-01 10:00', 예식일: addDays('2026-06-15', 100) })), '2026-06-15');
check('② 철회 14일째: rule 청약철회(7조)', q.rule === '청약철회(7조)', JSON.stringify(q));
check('② 철회 14일째: refund 180,000 (paid 28만 - 시착 2벌 10만)', q.paid === 280000 && q.refund === 180000 && q.penalty === 0, 'paid=' + q.paid + ' refund=' + q.refund);

// ③ 무상취소(7조②) — D-200 · paid 140만(계약금 28만+중도금 112만) · 2벌 공제 10만 → 130만
q = ctx._refundQuote(row(signedBase({ 중도금상태: '확인', 예식일: addDays(ASOF, 200) })), ASOF);
check('③ D-200 무상취소: rule', q.rule === '무상취소(7조)', JSON.stringify(q));
check('③ D-200 무상취소: paid 1,400,000', q.paid === 280000 + MID, 'paid=' + q.paid);
check('③ D-200 무상취소: refund 1,300,000', q.refund === 1300000 && q.penalty === 0, 'refund=' + q.refund);

// ④ 위약금 10%(9조②) — D-100 · 위약 28만 · paid 140만 → 112만 · 시착비 추가 차감 없음(9조⑤ 흡수)
q = ctx._refundQuote(row(signedBase({ 중도금상태: '확인', 예식일: addDays(ASOF, 100) })), ASOF);
check('④ D-100: rule 위약금 10%(9조) · rate 0.1', q.rule === '위약금 10%(9조)' && q.rate === 0.1, JSON.stringify(q));
check('④ D-100: penalty 280,000', q.penalty === 280000, 'penalty=' + q.penalty);
check('④ D-100: refund 1,120,000 (시착 2벌 공제 중복 적용 금지)', q.refund === 1120000, 'refund=' + q.refund);
check('④ D-100: fitDeduct는 표시용으로 유지', q.fitDeduct === 100000 && q.fitCount === 2, JSON.stringify(q));

// ⑤ 위약금 50% — D-5 · paid 280만(전액) → 140만
q = ctx._refundQuote(row(signedBase({ 중도금상태: '확인', 잔금상태: '확인', 예식일: addDays(ASOF, 5) })), ASOF);
check('⑤ D-5: rate 0.5 · penalty 1,400,000', q.rate === 0.5 && q.penalty === 1400000, JSON.stringify(q));
check('⑤ D-5: paid 2,800,000 → refund 1,400,000', q.paid === TOTAL && q.refund === 1400000, 'paid=' + q.paid + ' refund=' + q.refund);

// ⑥ 당일 70% — dd=0 · penalty 196만 → refund 84만
q = ctx._refundQuote(row(signedBase({ 중도금상태: '확인', 잔금상태: '확인', 예식일: ASOF })), ASOF);
check('⑥ 당일: rate 0.7 · rule 위약금 70%(9조)', q.rate === 0.7 && q.rule === '위약금 70%(9조)' && q.dd === 0, JSON.stringify(q));
check('⑥ 당일: penalty 1,960,000 · refund 840,000', q.penalty === 1960000 && q.refund === 840000, 'refund=' + q.refund);

// ⑦ 총액 미정(서명완료인데 계약총액 빈값) → {pending:true}만
q = ctx._refundQuote(row(signedBase({ 계약총액: '', 예식일: addDays(ASOF, 100) })), ASOF);
check('⑦ 총액 미정: {pending:true}', q && q.pending === true && q.refund == null, JSON.stringify(q));

// ⑧ 벌수 미기록 + 시착동의완료 → needCount · 공제 0으로 계산
ctx.findRowByPersonalCode = bookingPaid;
q = ctx._refundQuote(row({ 상품타입: '시그니처', 현재단계: '상담완료', 계약상태: '', 입금상태: '',
  시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { signedAt: '2026-06-01 11:00' } }), 개인코드: 'TQ08' }), ASOF);
check('⑧ 벌수 미기록: needCount=true', q.needCount === true, JSON.stringify(q));
check('⑧ 벌수 미기록: 공제 0 · refund 100,000', q.fitDeduct === 0 && q.fitCount === 0 && q.refund === 100000, 'refund=' + q.refund);

console.log('\n[2] 경계·게이트 검증');
ctx.findRowByPersonalCode = () => null;

// 스냅 → null (시그니처 전용)
check('스냅 → null', ctx._refundQuote(row({ 상품타입: '웨딩스냅', 계약상태: '서명완료' }), ASOF) === null);

// 철회기한 경계 — 서명일+15일까지 철회, +16일부터 위약 표(D-100 → 10%)
q = ctx._refundQuote(row(signedBase({ 계약서명일시: '2026-06-01 10:00', 예식일: addDays('2026-06-16', 100) })), '2026-06-16');
check('철회 경계 +15일: 청약철회(7조)', q.rule === '청약철회(7조)', q.rule);
q = ctx._refundQuote(row(signedBase({ 계약서명일시: '2026-06-01 10:00', 예식일: addDays('2026-06-17', 100) })), '2026-06-17');
check('철회 경계 +16일: 위약금 10%(9조)', q.rule === '위약금 10%(9조)', q.rule);
// 철회는 예식 전일(dd>=1)까지 — 서명 직후라도 예식 당일이면 철회 불가 → 당일 70%(7조① 단서)
q = ctx._refundQuote(row(signedBase({ 계약서명일시: '2026-06-10 10:00', 예식일: ASOF })), ASOF);
check('철회 불가(예식 당일): rate 0.7', q.rate === 0.7 && q.rule === '위약금 70%(9조)', q.rule);

// 9조② 표 전 구간 (dd → rate) · dd=150은 무상취소
[[150, 0, '무상취소'], [149, 0.1], [60, 0.1], [59, 0.2], [30, 0.2], [29, 0.4], [10, 0.4], [9, 0.5], [1, 0.5], [0, 0.7], [-3, 0.7]].forEach(function (c) {
  const r2 = ctx._refundQuote(row(signedBase({ 예식일: addDays(ASOF, c[0]) })), ASOF);
  const ok = c[2] ? (r2.rule === '무상취소(7조)' && r2.penalty === 0) : (r2.rate === c[1] && r2.penalty === Math.round(TOTAL * c[1]));
  check('표 구간 dd=' + c[0] + ' → ' + (c[2] || ('rate ' + c[1])), ok, JSON.stringify({ rule: r2.rule, rate: r2.rate, penalty: r2.penalty }));
});

// buildRefundQuote 게이트 — 취소·노쇼·미계약 null / 입금 전 null / 예약금 확인 후 노출 / 서명완료 노출
check('게이트: 취소 단계 → null', ctx.buildRefundQuote(row(signedBase({ 현재단계: '취소' }))) === null);
check('게이트: 노쇼 단계 → null', ctx.buildRefundQuote(row(signedBase({ 현재단계: '노쇼' }))) === null);
check('게이트: 계약 전 + 입금 미확인 → null',
  ctx.buildRefundQuote(row({ 상품타입: '시그니처', 현재단계: '시착', 계약상태: '', 입금상태: '', 개인코드: 'TQ' })) === null);
ctx.findRowByPersonalCode = bookingPaid;
q = ctx.buildRefundQuote(row({ 상품타입: '시그니처', 현재단계: '시착', 계약상태: '', 입금상태: '',
  시착동의상태: '동의완료', 동의기록: JSON.stringify({ 시착: { 벌수: 1 } }), 개인코드: 'TQ' }));
check('게이트: 계약 전 + 예약금 확인 → 견적(1벌 공제 후 50,000)', !!q && q.refund === 50000, JSON.stringify(q));
ctx.findRowByPersonalCode = () => null;
q = ctx.buildRefundQuote(row(signedBase({ 예식일: addDays(ASOF, 100) })));
check('게이트: 서명완료 → 견적', !!q && q.rule === '위약금 10%(9조)', JSON.stringify(q));
// asOf 생략 시 오늘(KST) 폴백
q = ctx._refundQuote(row(signedBase({ 예식일: addDays(ASOF, 100) })), null);
check('asOf 생략 → 오늘(YYYY-MM-DD)', /^\d{4}-\d{2}-\d{2}$/.test(q.asOf), q.asOf);

/* ── [3] 구문검증 — automation 전체 .gs + 변경 HTML 인라인 스크립트 (new Function) ── */
console.log('\n[3] 구문검증 (new Function)');
function listGs(dir) {
  let out = [];
  fs.readdirSync(dir, { withFileTypes: true }).forEach(function (e) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(listGs(p));
    else if (e.name.endsWith('.gs')) out.push(p);
  });
  return out;
}
listGs(path.join(ROOT, 'automation')).forEach(function (f) {
  try { new Function(fs.readFileSync(f, 'utf8')); check('GS  ' + path.relative(ROOT, f), true); }
  catch (e) { check('GS  ' + path.relative(ROOT, f), false, e.message); }
});
['mypage.html', 'admin.html', 'automation/admin/Admin.html'].forEach(function (rel) {
  const html = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  let m, i = 0, re = /<script\b([^>]*)>([\s\S]*?)<\/script>/gi;
  while ((m = re.exec(html))) {
    i++;
    if (/\bsrc\s*=/.test(m[1]) || /type\s*=\s*["'](?!text\/javascript)[^"']*["']/.test(m[1])) continue;
    if (!m[2].trim()) continue;
    try { new Function(m[2]); check('HTML ' + rel + ' <script #' + i + '>', true); }
    catch (e) { check('HTML ' + rel + ' <script #' + i + '>', false, e.message); }
  }
});

console.log('\n────────────────────────────────────');
console.log('PASS ' + pass + ' · FAIL ' + fail);
if (fail) { console.log('실패 목록:\n  - ' + failures.join('\n  - ')); process.exit(1); }
console.log('전부 통과');
