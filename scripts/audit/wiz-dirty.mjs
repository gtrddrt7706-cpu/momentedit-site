// 위저드 «바뀐 게 있나» 판정이 안쪽 내용까지 보는지 [WIZ_JSON_DEEP 2026-09-26]
//
//   mypage 의 _wizJson 은 «저장» 손잡이(저장/저장됨)와 «나가기» 때 «저장하지 않은 변경이 있어요» 판을 가르는 유일한 자다.
//   종전 판은 JSON.stringify(c, Object.keys(c).sort()) 였다 — 둘째 인자(키 목록)는 «정렬»이 아니라 «모든 깊이의 허용 키»라서
//   안쪽 객체의 키가 전부 걸러졌다(실측: 좌석 {t:[{name,seats}]} → {"t":[{}]}). 좌석 이름·단체 사진 요청·불러 모아 주실 분·
//   스냅 기획 공간별 장면을 고치고 «나가기»를 누르면 묻지 않고 나가 그대로 사라졌다. 스냅 기획 구현 중 발견.
//   ★이 검사는 진짜 함수를 mypage.html 에서 꺼내 돌린다 — 사본을 재지 않는다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let my = '';
try { my = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8'); } catch (e) { console.log('━━ wiz-dirty — mypage.html 이 없습니다 · 재지 못했습니다'); process.exit(2); }
const a = my.indexOf('function _wizJson(');
if (a < 0) { console.log('━━ wiz-dirty — _wizJson 을 못 찾았습니다 · 재지 못했습니다'); process.exit(2); }
let depth = 0, b = my.indexOf('{', a);
for (let i = b; i < my.length; i++) { if (my[i] === '{') depth++; else if (my[i] === '}') { depth--; if (depth === 0) { b = i + 1; break; } } }
const ctx = {}; vm.createContext(ctx);
try { vm.runInContext(my.slice(a, b) + '\nthis._wizJson=_wizJson;', ctx); } catch (e) { console.log('━━ wiz-dirty — _wizJson 을 실행하지 못했습니다: ' + e.message); process.exit(1); }
const J = ctx._wizJson, bad = [];
const differ = (x, y, msg) => { if (J(x) === J(y)) bad.push(msg + ' — 바뀌었는데 같다고 읽는다'); };
const same = (x, y, msg) => { if (J(x) !== J(y)) bad.push(msg + ' — 안 바뀌었는데 다르다고 읽는다'); };
differ({ t: [{ name: '테이블 1', seats: ['김하객'] }] }, { t: [{ name: '테이블 1', seats: [''] }] }, '좌석 이름');
differ({ s: ['a'], w: [{ what: '꽃길' }], u: '', c: { groom: '삼촌' } }, { s: ['a'], w: [{ what: '꽃길' }], u: '', c: { groom: '' } }, '단체 사진 불러 모아 주실 분');
differ({ s: ['a'], w: [{ what: '꽃길' }] }, { s: ['a'], w: [{ what: '하트' }] }, '단체 사진 요청');
differ({ v: 2, zones: { candle: { picks: ['c05'] } }, note: '' }, { v: 2, zones: { candle: { picks: [] } }, note: '' }, '스냅 기획 공간별 장면');
same({ b: 1, a: { y: 2, x: 1 } }, { a: { x: 1, y: 2 }, b: 1 }, '키 순서만 다름');
same({ a: 1, _step: 2 }, { a: 1, _step: 5 }, '맨 위 UI 키(_step)');
same({ a: { x: 1, _open: true } }, { a: { x: 1, _open: false } }, '안쪽 UI 키(_open)');
if (J(null) === '' || J(undefined) === '') bad.push('빈 값에서 빈 문자열을 낸다(기준선이 사라진다)');
if (bad.length) { console.log('━━ wiz-dirty — 빨강 ' + bad.length + '건'); bad.forEach((x) => console.log('   · ' + x)); process.exit(1); }
console.log('━━ wiz-dirty OK — 안쪽 내용(좌석 이름·단체 사진·스냅 장면)의 변경을 읽는다 · 키 순서·UI 키(_)는 변경으로 치지 않는다');
process.exit(0);
