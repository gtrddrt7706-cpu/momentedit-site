// 값을 치르는 문장을 넣는다 — 관찰만으로는 목이 안 멘다 [LETTER_COST]
//
//   node scripts/apply-letter-cost.mjs [--write]
//
// ★왜 — 2026-09-11 사장님: *"너가봤을때 젊은예비부부들이 뭉클하게 만들어죠"*
//   앞 판을 내 눈으로 다시 읽었다. 틀리진 않았는데 «안전»했다.
//   클리셰를 지우고(LETTER_REAL) 끝을 착지시켰는데(LETTER_LAND), 그 둘은 «감점을 없애는» 일이다.
//   가점이 없었다. 목이 메는 자리가 하나도 없었다.
//
// ★★[무엇이 빠졌나] «말하는 데 값을 치르는 문장»이다.
//   앞 판은 전부 «관찰»이었다 — 「너는 힘든 걸 말 안 해」, 「보일러를 고쳐 놨습니다」.
//   관찰은 안전하다. 틀릴 일도, 부끄러울 일도 없다. 그래서 안 운다.
//   뭉클은 «화자가 손해를 감수하고 말할 때» 온다 — 못난 것을 인정하거나, 늦었다고 고백하거나,
//   아직 감당이 안 된다고 털어놓을 때. 그 문장은 말한 사람에게 값을 물린다.
//
// ★★[장치 — 문장을 끝내지 않는다]
//   넣은 고백들은 감정어로 닫지 않는다. 「미안해」·「사랑해」로 끝내면 도로 선언이 된다.
//   대신 말끝을 흐린다: 「…아직도 좀 그래」, 「…저 하나도 버거운데」.
//   못 끝낸 문장이 듣는 사람 안에서 끝난다. 여운은 우리가 넣는 게 아니라 «비워 둔 자리»다.
//
// ★★[CROSS_ECHO] 이 대본에서 가장 센 것은 한 문장이 아니라 «두 사람이 같은 것을 따로 알아본 것»이다.
//     신랑 서약  「너는 힘든 걸 말 안 해.」
//     어머님 덕담 「하윤이는 어릴 때부터 아프다는 말을 안 했어요.」
//   신랑이 삼 년 걸려 알아낸 것을, 어머니는 스물아홉 해째 알고 있었다.
//   두 사람이 서로 상의한 적 없이 같은 말을 한다 — 하객은 그 겹침에서 운다.
//   ★한쪽만 고치면 이 장치가 죽는다. 둘을 함께 보라.
//   같은 이유로 신랑 「괜찮다고 해도 한 번은 더 물어볼게」 ↔ 어머님 「괜찮다고 하면 한 번만 더 물어봐 줘요」도
//   짝이다. 사위에게 부탁한 것을 사위가 이미 하고 있다.
//
// ★[TIME_GAP] 혼주 헌정에 «부모가 지금 내 나이였을 때»를 넣었다.
//   젊은 사람이 결혼할 즈음 처음으로 하게 되는 계산이고, 하고 나면 부모가 달리 보인다.
//   「저는 아직 저 하나도 버거운데」가 그 계산의 결과다 — 자랑이 아니라 모자람의 고백이라 안 오글거린다.
//
// ★[선언은 가운데] 신랑 편지에 「이 사람이랑 늙고 싶어」를 넣되 끝에서 한 줄 위에 둔다.
//   마지막에 있으면 서약이지만 중간에 있으면 그냥 한 말이다(윤동주 「서시」 배치법).
//   ★「평생 살고 싶어」가 아니라 「늙고 싶어」다 — 평생은 추상이고 늙음은 몸에 일어나는 일이다.
//
// ★[중복 제거] 「잔뜩 적었다가 다 지웠어」가 서약과 편지 양쪽에 있었다.
//   편지에만 남긴다 — 지우고 다시 쓰는 것은 편지의 일이다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CAST = path.join(ROOT, 'docs/plans/식순연구/배역_예시_대사.txt');

const NEW = [
  ['08', `하윤아.
뭐라고 써야 되는지 몰라서, 그냥 아는 것만 쓸게.
너는 힘든 걸 말 안 해.
말수가 줄고, 설거지를 오래 해.
그거 아는 데 삼 년 걸렸어.
그동안 네가 몇 번을 혼자 참았을까 생각하면, 아직도 좀 그래.
괜찮다고 해도 한 번은 더 물어볼게.
오늘부터 너는 혼자 안 참아.`],
  ['09', `서준아.
사랑한다는 말은 앞으로도 많이 할 테니까, 오늘은 지킬 수 있는 것만 약속할게.
나는 좀 따지는 편이고, 너는 그걸 다 들어줘.
그게 쉬운 일이 아니라는 거 알아.
혼자서도 잘 사는 줄 알았는데, 너 만나고 아니었어.
네가 잘못한 날에도 남들보다 내가 먼저 네 편이 될게.
너는 나한테만 먼저 말해.`],
  ['11', `하윤아.
이 편지 삼 주 전에 써 놓고 계속 고쳤어.
멋있는 말을 잔뜩 적었다가 다 지웠어.
네가 읽으면 웃을 것 같아서.
너 만나고 나서 나는 화를 덜 내.
급하게 굴지 않게 되고, 한 번 더 생각하게 되고.
노력해서 그런 게 아니라 그냥 그렇게 되더라.
나는 이 사람이랑 늙고 싶어.
그래서 오늘 여기 서 있어.`],
  ['14', `어머니, 아버지.
아버지가 지금 제 나이였을 때, 저를 업고 다니셨더라고요.
저는 아직 저 하나도 버거운데.
전화 자주 하겠습니다. 진짜로요.
오늘부터는 둘이 갑니다.`],
];

const lines = fs.readFileSync(CAST, 'utf8').split('\n');
const at = new Map();
lines.forEach((l, i) => { const m = /^\[(\d+)\]/.exec(l); if (m) at.set(m[1], i); });
const syl = (s) => (s.match(/[가-힣]/g) || []).length;

let bad = 0;
const plan = [];
for (const [no, text] of NEW) {
  const h = at.get(no);
  if (h === undefined) { console.log(`✗ [${no}] 머리를 못 찾았다`); bad++; continue; }
  let e = h + 1;
  while (e < lines.length && lines[e].trim()) e++;
  const neu = text.split('\n').map((s) => s.trim()).filter(Boolean);
  plan.push({ no, h, e, neu });
  const last = syl(neu[neu.length - 1]), prev = syl(neu[neu.length - 2] ?? '');
  const who = lines[h].split('·')[1]?.trim() ?? '';
  console.log(`  [${no}] ${who.padEnd(5)} ${String(neu.length).padStart(2)}문장 · 끝 ${String(last).padStart(2)}음절(앞 ${String(prev).padStart(2)})  ${last < prev ? '착지 ok' : '★앞줄보다 길다'}`);
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
const out = [];
let i = 0;
for (const p of plan.sort((a, b) => a.h - b.h)) { out.push(...lines.slice(i, p.h + 1), ...p.neu); i = p.e; }
out.push(...lines.slice(i));
fs.writeFileSync(CAST, out.join('\n'));
console.log(`\n반영함 · ${plan.length}클립`);
