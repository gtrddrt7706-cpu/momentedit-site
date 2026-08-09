// ★[CORR_CLAIM] 조립기의 '길이 상관' 주석이 실제 계산과 맞는지 [2026-08-09]
//
//   node scripts/check-corr-claim.mjs
//
// 왜 — ONE_CANDIDATE 완화의 근거로 "예상 길이가 같아 분산이 0 이라 상관계수가 미정의"라고
//   적혀 있었는데 **둘 다 사실이 아니었다**(코드 세션 실측):
//     ① 두 문장의 estSec 은 1.000 / 0.800 — 분산은 0 이 아니다.
//     ② 설령 0 이어도 r 은 NaN 이 되고 `NaN < 0.85` 는 false 라 애초에 안 막힌다.
//   진짜 이유는 n=2 라서 피어슨 상관이 늘 ±1 이 되는 것이다(순서 한 문항으로 줄어든다).
//   ★DONE_UNDO 주석과 같은 병이다 — 코드는 멀쩡한데 설명이 틀렸고, 다음 사람은 설명을 읽는다.
//   그래서 주석이 기대는 성질을 **계산으로 붙들어 둔다.** 성질이 바뀌면 여기서 먼저 붉어진다.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = fs.readFileSync(path.join(root, 'scripts/assemble-narration.mjs'), 'utf8');
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

// 조립기에서 실제 함수를 그대로 떼어 온다 — 옮겨 적으면 그 사본이 또 갈린다
const grab = (re, what) => { const m = SRC.match(re); if (!m) { no(`${what} 를 assemble-narration.mjs 에서 못 찾았습니다 — 이름이 바뀌었다면 이 검사도 같은 커밋에서 고치세요`); return null; } return m[0]; };
const sylSrc = grab(/const syl = [^\n]*/, 'syl');
const estSrc = grab(/const estSec = [^;]*;/, 'estSec');
const corrSrc = grab(/const corr = \([\s\S]*?\n\};/, 'corr');
if (bad) process.exit(1);

const mk = new Function(`${sylSrc}\n${estSrc}\n${corrSrc}\nreturn {syl, estSec, corr};`);
const { syl, estSec, corr } = mk();

// ① 셔터 신호 두 문장은 예상 길이가 **다르다**(분산 0 이 아니다)
const A = '찍겠습니다.', B = '하나, 둘, 셋.';
const eA = estSec(A), eB = estSec(B);
if (eA === eB) no(`주석 전제가 깨졌습니다 — "${A}" 와 "${B}" 의 예상 길이가 같아졌습니다(${eA}). 주석의 '분산은 0 이 아니다'를 다시 쓰세요`);
else console.log(`ok 예상 길이가 서로 다르다 — "${A}" ${eA.toFixed(3)}s · "${B}" ${eB.toFixed(3)}s (음절 ${syl(A)}·${syl(B)})`);

// ② NaN 은 0.85 미만이 아니다 — '미정의라 막힌다'는 설명이 성립하지 않는 근거
if (NaN < 0.85) no('NaN < 0.85 가 true 입니다 — 주석의 근거가 뒤집혔습니다');
else console.log('ok NaN < 0.85 = false — 상관이 미정의면 이 필터는 막지 못한다');

// ③ n=2 에서 상관은 늘 ±1 — 이 완화의 진짜 근거
const two = [[[1.0, 0.8], 1], [[1.2, 0.9], 1], [[1.0, 2.8], -1], [[0.9, 1.1], -1]];
for (const [real, want] of two) {
  const r = corr(real, [eA, eB]);
  if (Math.abs(r - want) > 1e-9) no(`n=2 상관이 ±1 이 아닙니다 — 실측 ${JSON.stringify(real)} → r=${r} (기대 ${want})`);
}
if (!bad) console.log('ok n=2 에서 상관은 늘 ±1 — 순서 한 문항으로 줄어든다(그래서 정보가 거의 없다)');

// ④ 주석이 이 사실들을 담고 있는지 — 옛 설명으로 되돌아가면 잡는다
if (/분산이 0 이 되고, 상관계수가\s*\n?\s*정의되지 않아/.test(SRC)) no("옛 진단('분산 0 이라 미정의')이 주석에 되살아났습니다 — 실측으로 틀린 설명입니다");
if (!/n=2/.test(SRC)) no("주석에서 'n=2' 근거가 사라졌습니다 — 이 완화의 진짜 이유입니다");

if (bad) { console.error('\n조립기 주석과 실제 계산이 어긋납니다. 코드가 아니라 설명이 틀렸을 가능성이 높습니다.'); process.exit(1); }
console.log('CORR_CLAIM OK');
