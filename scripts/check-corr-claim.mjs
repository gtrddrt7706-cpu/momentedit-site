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
/* ★★[EXIT_TRAP 2026-08-09] 마지막 결론 **뒤에** 붙은 실패도 붉게 만든다.
   EXIT_AT_END 로 중간 exit 은 없앴지만, 주석은 "이 파일 어디에 무엇을 덧붙여도 자동으로
   결론에 닿는다"고 단정한다. 그 말이 맨 끝 줄 뒤까지 참이려면 이것이 있어야 한다 —
   실측: 트랩 없이 마지막 줄 뒤에 no() 를 붙이면 ✗ 를 찍고도 exit 0 이었다.
   ★merge-guard 의 GATE_AT_EXIT 과 같은 처방이다. 사람이 '어디에 붙일지'를 기억하게 두지 않는다. */
process.on('exit', (code) => { if (bad && code === 0) process.exitCode = 1; });

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

/* ★★[EXIT_AT_END 2026-08-09] 종료코드는 **맨 끝에서 한 번만** 정한다.
   옛 판은 여기(중간)에 `if (bad) process.exit(1)` 이 있었다. 그 뒤에 검사를 덧붙이면
   그 검사가 `no()` 를 불러도 **아무도 그걸 종료코드로 바꾸지 않는다.**
   실제로 그렇게 됐다 — CORR_PERMISSIVE 블록이 이 줄 뒤에 붙어, 일부러 깨뜨렸더니
   화면엔 `✗` 가 찍히는데 `CORR_CLAIM OK` 를 출력하고 **exit 0** 이 나왔다(실측).
   ★merge-guard 의 GUARD_FAIL_VAR·GATE_AT_EXIT 과 같은 병이다. 붉어질 수 없는 실패는
     실패가 아니다. 이 파일의 구조 자체가 덫이었으니 구조를 고친다 —
     중간 exit 을 없애고, 어디에 무엇을 덧붙이든 맨 끝 한 곳이 결론을 낸다.
   ★새 검사를 더할 때는 이 아래 어디든 좋다. exit 은 다시 만들지 말 것. */
/* ★[CORR_PERMISSIVE 2026-08-09 · 코워크] n=2 의 위험은 '정보가 없다'에서 그치지 않는다 —
   **틀린 묶음도 통과시킨다.** 순서만 맞으면 길이가 얼마나 어긋나든 r=+1 이다.
   실측: 예상 [1.0, 0.8] 에 실측 [3.0, 0.1] (세 배 길고 여덟 배 짧다) → r = +1.000 → 통과.
   그러니 n 이 작을 때 이 잣대를 '완화했다'고 말하면 안 된다 — 애초에 잡을 수 있는 것이
   순서 뒤집힘 하나뿐이었다. ONE_CANDIDATE 는 없던 보호를 없앤 게 아니다.
   ★사람 눈으로 대신 봐야 하는 구간이라는 뜻이기도 하다: 문장이 두셋뿐인 묶음은
     조립 뒤 길이를 반드시 따로 잰다(소리 쪽은 ffprobe 가 있는 세션에서). */
{
  const r = corr([3.0, 0.1], [1.0, 0.8]);
  if (!(r > 0.85)) no('n=2 에서 길이가 크게 어긋나도 통과한다는 성질이 재현되지 않는다 — 이 주석을 다시 볼 것');
  else console.log('ok n=2 는 길이가 어긋나도(3.0 vs 1.0 · 0.1 vs 0.8) 순서만 맞으면 통과 — 잡는 것은 순서뿐');
}

/* ★[CORR_NAN_SAY 2026-08-16 · 코드 적대검증] n=1 은 «약한 검사»가 아니라 «검사가 없음»이다.
   코워크가 [FLAT_AUTOSPLIT] 을 깨 봐 달라고 했다. 실제 조립기를 149번 돌려 재 보니 —
     ─ 가른 «자리»는 잘 지킨다: 파트 경계가 한 칸 밀리면 r 0.397 · -0.204 로 멎었고,
       같은 파트 안 4문장 클립 둘을 뒤바꿔도 0.579 로 멎었다.
     ─ 구멍은 **문장이 1개인 파트**였다. 6_예식뒤 의 1문장 클립 8개(54·68~74)는
       서로 아무거나 바꿔치기해도 안 멎는다. 잡음을 키워도 그대로다 — 산수라서 모형과 무관하다.
   ★그때 화면에는 `r = NaN` 이 찍혔다. 못 본 것을 **잰 것처럼** 적은 것이다.
     이 파일이 이미 ②에서 "NaN < 0.85 는 false" 를 붙들고 있었는데, 그 사실이
     «사람에게 보이는 말»로는 번역되지 않았다. 그래서 그 번역을 여기서 붙든다. */
{
  const r1 = corr([2.5], [1.0]);
  if (Number.isFinite(r1)) no(`n=1 상관이 유한합니다(${r1}) — CORR_NAN_SAY 의 전제가 바뀌었으니 조립기 주석부터 다시 쓰세요`);
  else console.log('ok n=1 상관은 미정의 — 문장이 하나면 순서 검증은 아무것도 못 본다(약한 게 아니라 없다)');
  if (!/못 봤습니다/.test(SRC))
    no("조립기가 n=1 자리를 '못 봤습니다'라고 적지 않습니다 — r 값처럼 찍으면 검증한 것으로 읽힙니다 [CORR_NAN_SAY]");
  if (!/CORR_NAN_SAY/.test(SRC))
    no('조립기에서 CORR_NAN_SAY 근거가 사라졌습니다 — 못 본 자리를 다시 잰 것처럼 적게 됩니다');
}

// ── 결론은 여기 한 곳에서만 [EXIT_AT_END]
if (bad) { console.error('\n조립기 주석과 실제 계산이 어긋납니다. 코드가 아니라 설명이 틀렸을 가능성이 높습니다.'); process.exit(1); }
console.log('CORR_CLAIM OK');
