// Customers 헤더 순서 — 진단(checkCustomerHeaderOrder)의 '결론'이 실제 가드(setupCustomers의 HEADER_ORDER_GUARD)와
//   항상 같은 판정을 내는지 고정한다. 둘 다 목이 아니라 진짜 GAS 함수를 node vm에서 실행해 대조한다.
//
//   ★왜 필요한가(GUARD_MIRROR · 2026-07-26): 진단의 전체 나열은 가드보다 엄격해야 유용하다(리터럴 정정에 쓰이니까).
//   하지만 '결론' 한 줄은 가드와 같은 기준이어야 한다. 갈리면 가드가 통과인데 "막힌다"고 단정하고,
//   그 틀린 판정에 "리터럴을 실측에 맞춰 정정하라"는 지시가 붙어 나가 멀쩡한 라벨을 지우게 만든다.
//   특히 시트가 코드보다 짧은 경우는 '오히려 setupCustomers를 실행해야 맞는' 상태인데 정반대로 안내하게 된다.
//   사용: node scripts/audit/header-order.mjs
import { makeSandbox, loadGas } from './gas-lint.mjs';

let fail = 0;
const ok = (cond, label, detail) => {
  if (cond) console.log('  ✅ ' + label);
  else { fail++; console.log('  ❌ ' + label + (detail ? ' — ' + detail : '')); }
};

// 헤더 1행만 진짜인 가짜 시트. 모르는 메서드는 자기 자신을 돌려주는 체이너(서식·검증 호출을 전부 흡수).
function fakeSheet(header) {
  const row = header.slice();
  const self = {
    _row: row,
    getLastColumn: () => row.length,
    getMaxColumns: () => Math.max(row.length, 1),
    getMaxRows: () => 100,
    insertColumnsAfter: (_after, n) => { for (let i = 0; i < n; i++) row.push(''); },   // 그리드만 늘어남(빈 열)
    getRange: (r, c, _nr, nc) => rangeStub(row, r, c, nc == null ? 1 : nc),
    getFilter: () => null,
  };
  return new Proxy(self, { get: (t, k) => (k in t ? t[k] : () => self) });
}
function rangeStub(row, r, c, nc) {
  const stub = {
    getValues: () => [row.slice(c - 1, c - 1 + nc)],
    setValues: (v) => { for (let i = 0; i < nc; i++) row[c - 1 + i] = v[0][i]; return stub; },
    setValue: (v) => { row[c - 1] = v; return stub; },
  };
  return new Proxy(stub, { get: (t, k) => (k in t ? t[k] : () => stub) });
}

function runScenario(header) {
  const sb = makeSandbox();
  const sheet = fakeSheet(header);
  sb.SpreadsheetApp = new Proxy({
    getActive: () => new Proxy({ getSheetByName: () => sheet, insertSheet: () => sheet, toast() {} },
      { get: (t, k) => (k in t ? t[k] : () => ({})) }),
    newDataValidation: () => { const v = {}; return new Proxy(v, { get: (t, k) => (k === 'build' ? () => ({}) : () => v) }); },
    newConditionalFormatRule: () => { const v = {}; return new Proxy(v, { get: (t, k) => (k === 'build' ? () => ({}) : () => v) }); },
    flush() {},
  }, { get: (t, k) => (k in t ? t[k] : () => ({})) });

  const { errors } = loadGas(sb);
  if (errors.length) throw new Error('LOAD FAIL ' + errors[0].file + ' — ' + errors[0].message);

  // 진단이 말하는 결론
  const diag = sb.checkCustomerHeaderOrder();
  // 실제 가드가 내는 판정 — 진짜 setupCustomers를 돌려서 '헤더 순서 불일치'로 던지는지 본다
  let guardBlocked = false, guardMsg = '';
  try { sb.setupCustomers(); }
  catch (e) { guardMsg = String(e && e.message || e); guardBlocked = guardMsg.indexOf('헤더 순서 불일치') === 0; }
  return { diag, guardBlocked, guardMsg, code: sb.CUSTOMER_HEADERS };
}

const CODE = (() => { const sb = makeSandbox(); loadGas(sb); return sb.CUSTOMER_HEADERS.slice(); })();

console.log('\n[1] 진단의 결론 == 가드의 실제 판정 (코워크 샌드박스 시나리오 A~F)');
const SCEN = [
  ['A. 시트 == 코드 (정상)', CODE.slice()],
  ['B. 원본폴더ID가 제작_* 뒤 (리터럴 정정 전 위치 · 이제는 범위 안 불일치라 막혀야 함)',
    CODE.filter((h) => h !== '원본폴더ID').concat(['원본폴더ID'])],
  ['B2. 시트에 코드보다 뒤쪽 열이 더 있음 (가드 범위 밖 · 막히면 안 됨)', CODE.concat(['새열_나중에추가됨'])],
  ['C. 원본폴더ID가 리터럴에 없던 시절의 어긋난 시트 (실제로 막혀야 함)',
    (() => { const a = CODE.filter((h) => h !== '원본폴더ID'); a.splice(58, 0, '원본폴더ID'); a.splice(20, 1); return a; })()],
  ['E. 헤더 한 칸이 빈 칸 (40열)', (() => { const a = CODE.slice(); a[39] = ''; return a; })()],
  ['F. 시트가 코드보다 짧음 (열이 아직 안 늘어난 시트 · 오히려 setupCustomers를 실행해야 맞음)', CODE.slice(0, 60)],
  ['G. 진짜 순서 뒤바뀜 (잔금상태 ↔ 중도금상태)',
    (() => { const a = CODE.slice(); const i = a.indexOf('잔금상태'), j = a.indexOf('중도금상태'); [a[i], a[j]] = [a[j], a[i]]; return a; })()],
];
for (const [label, header] of SCEN) {
  const { diag, guardBlocked, guardMsg } = runScenario(header);
  ok(diag.blocked === guardBlocked, label + ' → 진단 ' + (diag.blocked ? 'BLOCK' : 'PASS') + ' / 가드 ' + (guardBlocked ? 'BLOCK' : 'PASS'),
    guardBlocked ? guardMsg.slice(0, 90) : '');
}

console.log('\n[2] 진단은 여전히 가드보다 넓게 본다 (참고 정보는 유지 · 결론만 가드 기준)');
{
  // 가드가 진짜로 통과하는데 리터럴과는 다른 상태 — 가드는 min(시트, 코드) 범위만 보므로 뒤쪽 여분 열을 못 본다.
  //   구버전 진단은 여기서 "막힌다"고 단정했다(코워크 B 시나리오의 본질).
  const { diag } = runScenario(CODE.concat(['새열_나중에추가됨']));
  ok(diag.blocked === false, 'B2: 가드 범위 밖 여분 열 → "안 막힌다"고 결론');
  ok(diag.mismatch > 0, 'B2: 그래도 리터럴과 다른 열은 참고로 보고(' + diag.mismatch + '곳)');
  ok(diag.onlyLive.indexOf('새열_나중에추가됨') >= 0, 'B2: 시트에만 있는 라벨로 지목 → 리터럴 정정 근거가 됨');
}
{
  const { diag } = runScenario(CODE.slice(0, 60));
  ok(diag.blocked === false, 'F 시나리오: "막힌다"고 하지 않는다(오지시 차단)');
  ok(diag.onlyCode.length > 0, 'F 시나리오: 코드에만 있는 라벨을 알려준다(' + diag.onlyCode.length + '개)');
}

console.log('\n[3] 시트 무변경 — 진단은 헤더 1행을 건드리지 않는다');
{
  const header = CODE.filter((h) => h !== '원본폴더ID').concat(['원본폴더ID']);
  const sb = makeSandbox();
  const sheet = fakeSheet(header);
  sb.SpreadsheetApp = new Proxy({ getActive: () => new Proxy({ getSheetByName: () => sheet }, { get: (t, k) => (k in t ? t[k] : () => ({})) }) },
    { get: (t, k) => (k in t ? t[k] : () => ({})) });
  loadGas(sb);
  const before = sheet._row.join('|');
  sb.checkCustomerHeaderOrder(); sb.checkCustomerHeaderOrder(); sb.checkCustomerHeaderOrder();
  ok(sheet._row.join('|') === before, '3회 실행해도 헤더 1행 동일(읽기 전용)');
}

console.log('\n[4] 리터럴 자체 무결성');
{
  ok(new Set(CODE).size === CODE.length, '중복 라벨 없음');
  ok(CODE.every((h) => typeof h === 'string' && h.trim() === h && h !== ''), '빈 라벨·앞뒤 공백 없음');
  ok(CODE.indexOf('원본폴더ID') === 58, '원본폴더ID = 59열(2026-07-26 운영 시트 실측)', '실제 ' + (CODE.indexOf('원본폴더ID') + 1));
  ok(CODE[CODE.length - 1] === '제작_meta', '제작_meta가 마지막(_prodCreateOrder와 동일)');
}

console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 실패 0건 (전부 통과)');
process.exit(fail ? 1 : 0);
