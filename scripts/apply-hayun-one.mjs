// 하윤이 두 사람처럼 보였다 [CHAR_ONE]
//
//   node scripts/apply-hayun-one.mjs [--write]
//
// ★왜 — 2026-09-12 사장님: *"이 두 문장의 캐릭터 성격이 상충되는거같은데 일관성있게 개선검토"*
//   신랑 서약 「너는 나한테 한 번도 힘들다는 말을 안 했어」 ↔ 신부 서약 「나는 따지는 사람이야 ·
//   삼십 분을 따진 날이 있었어」. 둘 다 «작년»이다. 한 예식에서 20분 간격으로 나간다.
//
// ★★[증거를 전수로 세면 3:2 로 갈려 있었다]
//   말 안 함 — 신랑 서약 「한 번도 힘들다는 말을 안 했어」 · 신랑 편지 「화를 내도 되는 사람이
//              화를 안 내니까」 · 어머님 「괜찮다고 했어요 / 엄마가 걱정할까 봐 그랬답니다」
//   말 함   — 신부 서약 「삼십 분을 따진 날」 · 아버님 「하윤아, 너는 앞쪽이지(말로 하는 사람)」
//   다섯 사람이 같은 사람을 말하는데 둘로 갈린다. 각 클립만 보면 다 자연스럽고,
//   이어서 들을 때만 «누구 얘기를 하는 거지» 싶어진다.
//
// ★★[한쪽을 지우지 «않는다» — 그러면 인물이 납작해진다]
//   따지는 것(상대에 대한 요구)과 아프다고 말하는 것(자기 상태의 고백)은 다른 축이다.
//   남 얘기는 삼십 분 하면서 자기 얘기는 한 줄도 안 하는 사람 — 실제로 아주 흔하고, 아주 구체적이다.
//   문제는 모순이 아니라 «연결이 없다»는 것이다. 그 축을 한 줄로 드러내면 다섯 조각이 한꺼번에 맞는다.
//   ★그래서 고친 곳은 «한 곳»이다. 신부가 자기 입으로 그 비대칭을 지목한다 —
//     본인이 가장 잘 아는 일이고, 서약은 원래 자기를 고백하는 자리다.
//
// ★★[그 한 줄이 낳는 것 넷]
//   ①신랑 서약이 «뒤늦게» 확인된다 — 「한 번도 힘들다는 말을 안 했어」가 본인 고백으로 뒷받침된다.
//   ②어머님 덕담이 세 번째로 같은 것을 말한다 — 세 사람이 상의 없이 같은 것을 본다(CROSS_ECHO 확장).
//   ③아버님의 「너는 앞쪽이지」가 «맞는 말»이 된다 — 남 얘기는 말로 하는 사람이니까. 손댈 필요가 없어졌다.
//   ④마지막 줄 「너는 나에게 먼저 말해」가 훨씬 아프게 들린다 —
//     자기가 못 하는 것을 상대에게 요구하는 말이기 때문이다.
//
// ★★[그래서 착지를 한 줄 더했다 — 「나도 해 볼게」]
//   ④의 아이러니가 «우연»이면 흠이고 «알고 한 것»이면 장치다. 신부가 그걸 알고 있어야 한다.
//   그리고 이 줄은 신랑 서약의 끝 「오늘부터 너는 혼자 참지 않아」에 답한다 —
//   신랑이 먼저 읽고(08) 신부가 뒤에 읽으므로(09), 두 서약이 비로소 «대화»가 된다.
//   ★[VOW_ECHO] 「너는 나에게 먼저 말해」는 그대로 둔다 — 신랑 「한 번은 더 물을게」의 짝이다.
//     지우지 않고 «뒤에» 붙였다. 짝은 살고, 아이러니만 의도가 된다.
//
// ★[안 건드린 것] 아버님 「하윤아, 너는 앞쪽이지」(위 ③) · 신랑 편지 「화를 내도 되는 사람이
//   화를 안 내니까」(그가 잘못한 날 얘기라 「네 편이 될게」와 이미 맞는다) · 어머님 전체(PEAK_ONE).
//
// ★비용 — 서진(신부) 1클립 재녹음. 이미 재녹음 대기 중이라 추가 비용 0.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CAST = path.join(ROOT, 'docs/plans/식순연구/배역_예시_대사.txt');

const NEW = [
  ['09', `서준아.
사랑한다는 말은 앞으로도 많이 할 테니, 오늘은 지킬 수 있는 것만 약속할게.
나는 따지는 사람이야.
작년에 내가 너한테 삼십 분을 따진 날이 있었어.
너는 다 듣고 나서, 밥 먹었냐고 물었어.
그때 좀 졌다고 생각했어.
너한테는 삼십 분을 따지면서, 내가 힘든 건 한 마디도 안 하더라.
앞으로도 나는 따질 거야. 그건 못 고쳐.
대신 다 따지고 나서, 내가 먼저 밥 먹었냐고 물을게.
네가 잘못한 날에도 남들보다 내가 먼저 네 편이 될게.
너는 나에게 먼저 말해.
나도 해 볼게.`],
];

const lines = fs.readFileSync(CAST, 'utf8').split('\n');
const at = new Map();
lines.forEach((l, i) => { const m = /^\[(\d+)\]/.exec(l); if (m) at.set(m[1], i); });
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const isCall = (s) => syl(s) < 6 && /[아야]\.$/.test(s.trim());
let bad = 0;
const plan = [];
for (const [no, text] of NEW) {
  const h = at.get(no);
  if (h === undefined) { console.log(`✗ [${no}] 머리를 못 찾았다`); bad++; continue; }
  let e = h + 1;
  while (e < lines.length && lines[e].trim()) e++;
  const neu = text.split('\n').map((s) => s.trim()).filter(Boolean);
  const old = lines.slice(h + 1, e);
  plan.push({ no, h, e, neu });
  const last = syl(neu[neu.length - 1]);
  let pi = neu.length - 2; while (pi > 0 && isCall(neu[pi])) pi--;
  const prev = syl(neu[pi] ?? '');
  const sec = (neu.reduce((a, s) => a + syl(s), 0) / 406 * 60).toFixed(0);
  console.log(`  [${no}] ${old.length}→${neu.length}문장 · 약 ${sec}초 · 끝 ${last}(앞 ${prev}) ${last < prev ? '착지 ok' : '★긺'}`);
}
/* ★자가검사 — 이 커밋의 «본론»이다. 비대칭을 지목하는 줄이 정말 들어갔는지,
   그리고 지키기로 한 VOW_ECHO 가 살아 있는지 코드가 확인한다. */
const body = plan[0]?.neu.join('\n') ?? '';
for (const [why, s] of [
  ['비대칭 지목', '내가 힘든 건 한 마디도 안 하더라'],
  ['VOW_ECHO 보존', '너는 나에게 먼저 말해'],
  ['신랑 서약에 답함', '나도 해 볼게'],
  ['따지는 성격 보존', '나는 따지는 사람이야'],
]) {
  const ok = body.includes(s);
  console.log(`  ${ok ? '·' : '✗'} ${why.padEnd(16)} 「${s}」`);
  if (!ok) bad++;
}
if (bad) { console.log('\n맞지 않는 것이 있다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
const out = [];
let i = 0;
for (const p of plan.sort((a, b) => a.h - b.h)) { out.push(...lines.slice(i, p.h + 1), ...p.neu); i = p.e; }
out.push(...lines.slice(i));
fs.writeFileSync(CAST, out.join('\n'));
console.log(`\n반영함 · ${plan.length}클립`);
