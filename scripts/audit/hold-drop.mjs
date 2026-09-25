// 되돌리기가 «그 고객의 대기 알림»만 내리는지 재는 검사.
//
// ★[HOLD_DROP_ON_ROLLBACK 2026-09-25 사장님 「전에 진행중이던 계정은 취소처리했는데
//                                        이 부분에서 누락됐나? 확인해볼래?」]
//   맞았다. 종전엔 NOTIFY_HOLD 를 «적재»와 «발송» 두 곳에서만 건드렸고,
//   취소·되돌리기는 이 큐를 전혀 몰랐다. 그래서 2026-09-24 에 이런 메일이 왔다:
//     「밤사이 보류 알림 5건이 세 번 시도해도 실패해 큐에서 내렸습니다 · TD7CGH/cust.fittingRequest …」
//   사장님이 그 고객을 취소했는데, 보낼 예정이던 알림 5건은 큐에 그대로 남아
//   매일 아침 재시도되다 사흘째 버려지며 영문 모를 메일이 된 것이다.
//
//   ★이 검사가 보는 것 — 세 가지다.
//     ① _nfHoldDrop 이 «그 고객 것만» 내리는가 (남의 알림을 같이 지우면 그게 더 큰 사고다)
//     ② adminForceStage 가 실제로 그것을 부르는가 (함수만 있고 안 부르면 있으나 마나다)
//     ③ 비운 사실이 처리이력에 남는가 (이 저장소는 «지운 사실이 어디에도 안 남았다»를
//        이미 [REFUND_MARK_TRACE] 에서 결함으로 적었다 — 같은 실수를 되풀이하지 않는다)
//
//   ★[SERVED_OURS] 파일이나 함수를 못 찾으면 «틀렸다(1)»가 아니라 «못 쟀다(2)»로 빠진다.
//     환경 탓으로 붉는 검사는 사람이 곧 무시한다.
//
//   종료 코드: 0 통과 · 1 재서 틀렸다 · 2 재지 못했다
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const NOTIFY = path.join(ROOT, 'automation/platform/95_notify.gs');
const ADMIN = path.join(ROOT, 'automation/admin/admin.gs');

for (const f of [NOTIFY, ADMIN]) {
  if (!fs.existsSync(f)) {
    console.log(`━━ hold-drop — ${path.relative(ROOT, f)} 가 없습니다 · 재지 못한 것이지 결함이 아닙니다`);
    process.exit(2);
  }
}
const src = fs.readFileSync(NOTIFY, 'utf8');
const adm = fs.readFileSync(ADMIN, 'utf8');

const m = src.match(/function _nfHoldDrop\(code\)[\s\S]*?\n}\n/);
if (!m) {
  console.log('━━ hold-drop — 95_notify 에서 _nfHoldDrop 을 찾지 못했습니다 · 재지 못했습니다');
  process.exit(2);
}

let bad = 0;
const ok = (t) => console.log('   ✓ ' + t);
const no = (t) => { bad++; console.log('   ✗ ' + t); };

/* GAS 전역을 최소한으로 세워 함수만 떼어 돌린다 — 시트도 메일도 건드리지 않는다. */
let store = {};
const PropertiesService = { getScriptProperties: () => ({
  getProperty: (k) => (k in store ? store[k] : null),
  setProperty: (k, v) => { store[k] = v; },
}) };
const LockService = { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) };
const Logger = { log() {} };
const _nfHoldDrop = new Function('PropertiesService', 'LockService', 'Logger',
  m[0] + '\nreturn _nfHoldDrop;')(PropertiesService, LockService, Logger);

const seed = () => { store.NOTIFY_HOLD = JSON.stringify([
  { c: 'TD7CGH', e: 'cust.fittingRequest' }, { c: 'TD7CGH', e: 'cust.fittingRequest' },
  { c: 'TD7CGH', e: 'cust.consultDone' }, { c: 'TD7CGH', e: 'cust.contractArrived' },
  { c: 'TD7CGH', e: 'cust.depositToProduction' },
  { c: 'OTHER1', e: 'cust.consultDone' }, { c: 'OTHER2', e: 'cust.balanceDue' },
]); };
const left = () => JSON.parse(store.NOTIFY_HOLD || '[]');

console.log('━━ hold-drop — 되돌리기가 대기 알림을 내리는가');

seed();
let n = _nfHoldDrop('TD7CGH');
n === 5 ? ok(`되돌린 고객 5건을 내렸다 (실사고와 같은 5건)`) : no(`5건이어야 하는데 ${n}`);
left().length === 2 ? ok('남의 알림 2건은 큐에 남았다') : no('남의 것까지 건드렸다 — 이쪽이 더 큰 사고다');
left().every((x) => x.c !== 'TD7CGH') ? ok('그 고객 것은 하나도 안 남았다') : no('그 고객 것이 남았다');
_nfHoldDrop('TD7CGH') === 0 ? ok('두 번 불러도 0건 (멱등)') : no('멱등이 아니다');

seed();
_nfHoldDrop('') === 0 && left().length === 7 ? ok('빈 코드는 큐를 안 건드린다') : no('빈 코드가 큐를 건드렸다');
_nfHoldDrop('NOSUCH') === 0 ? ok('없는 코드는 0건') : no('없는 코드에 반응한다');
store = {};
_nfHoldDrop('TD7CGH') === 0 ? ok('큐 자체가 없어도 안전하다') : no('큐가 없을 때 터진다');

/* ② 함수가 있어도 «안 부르면» 있으나 마나다 */
const fs2 = adm.match(/function adminForceStage\([\s\S]*?\n}\n/);
if (!fs2) no('admin 에서 adminForceStage 를 찾지 못했다');
else {
  /_nfHoldDrop\(code\)/.test(fs2[0])
    ? ok('adminForceStage 가 _nfHoldDrop(code) 를 부른다')
    : no('되돌리기가 큐 정리를 «부르지 않는다» — 함수만 있고 배선이 없다');
  /대기 중이던 고객 알림/.test(fs2[0])
    ? ok('비운 건수가 처리이력에 남는다')
    : no('비운 사실이 기록에 안 남는다 — REFUND_MARK_TRACE 와 같은 실수');
}

console.log(bad ? `\n✗ 되돌리기가 대기 알림을 제대로 못 내립니다 — ${bad}건` : '\n✓ 되돌리기가 그 고객의 대기 알림만 내립니다');
process.exit(bad ? 1 : 0);
