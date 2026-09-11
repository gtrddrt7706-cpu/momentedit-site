// 편지·헌정도 이야기로 펼친다 [LETTER_SCENE]
//
//   node scripts/apply-letter-scene.mjs [--write]
//
// ★왜 — 2026-09-11 사장님: *"이런식으로 스토리를 만들어서 각각 한번 꾸며봐 조금길어도괜찮아"*
//   덕담에 한 것(LETTER_STORY)을 편지에도 한다. 편지는 아직 «요약»이었다:
//     신랑  「너를 만나고 나서 나는 화를 덜 내」 — 결론만 있고 그렇게 된 날이 없다.
//     신부  「하고 싶은 거 하겠다고 할 때마다」 — «때마다»는 장면이 아니라 습관의 요약이다.
//     헌정  6줄 11초. 예식에서 눈 깜짝할 사이다.
//
// ★★[펼치는 방법] 결론을 남기되 그 앞에 «그 결론을 얻은 하루»를 놓는다.
//   요약은 듣는 사람이 믿어 줘야 성립하고, 장면은 듣는 사람이 스스로 본다.
//   조사에서 울린 덕담의 공통점이 그것이었다 — 평가는 안 울리고 사실이 운다.
//
//   신랑 편지  이사하던 날. 자기가 잘못해 놓고 종일 짜증을 냈고, 그녀는 말없이 박스를 날랐다.
//     ★심장은 「화를 내도 되는 사람이 화를 안 내니까, 내가 부끄러워지더라고」다.
//       자기가 못났던 순간을 하객 앞에서 말한다 — 값이 든다(LETTER_COST).
//   신부 편지  스물넷에 회사를 그만두겠다고 한 날. 거실에서 밤늦게 나던 목소리와,
//     다음 날 아침의 「해 봐라」. 무슨 얘기가 오갔는지는 끝까지 말하지 않는다.
//     ★「저는 그때 허락받았다고만 생각했어요」가 고백이다. 스물아홉이 되어서야 그게 아니었음을 안다.
//   헌정  오래된 사진 뒤의 날짜를 세어 보는 장면. 계산이 눈앞에서 일어난다.
//
// ★[음식을 두 번 쓰지 않는다] 신부 서약에 이미 「밥 먹었냐고 물었어」가 있다.
//   그래서 신랑 편지의 장면에서는 음식을 뺐다(박스를 같이 날랐다).
//   신부 편지의 「국그릇에 고기를 덜어 주셨어요」는 남긴다 — 어머님 덕담에서 국을 뺐으므로
//   예식 전체에서 음식 장면은 두 번뿐이고, 둘은 다른 사람이 다른 뜻으로 쓴다.
//
// ★[지킨 것] 착지(LETTER_LAND)·격식(LETTER_FORMAL)·「낳아주셔서」 위치(THREE_BEAT)·
//   「늙고 싶어」가 끝에서 한 줄 위인 것 — 전부 그대로다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CAST = path.join(ROOT, 'docs/plans/식순연구/배역_예시_대사.txt');

const NEW = [
  ['11', `하윤아.
이 편지를 삼 주 전에 써 놓고 계속 고쳤어.
멋있는 말을 잔뜩 적었다가 다 지웠어.
네가 읽으면 웃을 것 같아서.
우리 두 번째 이사하던 날 기억나?
내가 짐을 잘못 실어서 트럭이 두 번 왔다 갔다 했잖아.
나는 그날 종일 짜증이 나 있었어.
너는 아무 말도 안 하고 박스만 같이 날랐어.
다 끝나고 나서, 오늘 고생했다고 그러더라.
화를 내도 되는 사람이 화를 안 내니까, 내가 부끄러워지더라고.
너를 만나고 나서 나는 화를 덜 내.
급하게 굴지 않게 되고, 한 번 더 생각하게 되고.
애써서 그런 게 아니라 그냥 그렇게 되더라.
나는 이 사람과 함께 늙고 싶어.
그래서 오늘 여기 서 있어.`],
  ['10', `엄마, 아빠.
스물아홉 해 동안 고맙다는 말을 제대로 한 적이 없어요.
스물넷에 회사를 그만두겠다고 했던 날 기억하세요?
저녁을 먹고 제 방에 들어갔는데, 거실에서 두 분 목소리가 늦게까지 났어요.
무슨 말씀을 하시는지는 안 들렸어요.
다음 날 아침에 아빠가 밥 먹다가, 해 보라고 하셨어요.
엄마는 아무 말씀도 없이 제 국그릇에 고기를 덜어 주셨고요.
저는 그때 허락받았다고만 생각했어요.
그 밤에 두 분이 무슨 얘기를 하셨는지는 아직도 모릅니다.
이제 조금 알 것 같습니다.
낳아주셔서, 키워주셔서, 참아주셔서 고맙습니다.
오늘부터 제 이름 옆에 한 사람이 더 생기지만, 두 분 딸인 것은 그대로입니다.
다음에 갈 때도 빈손으로 가겠습니다.`],
  ['14', `어머니, 아버지.
얼마 전에 집에서 오래된 사진을 봤습니다.
아버지가 저를 업고 계셨고, 뒤에서 어머니가 웃고 계셨어요.
사진 뒤에 날짜가 적혀 있길래 세어 봤습니다.
그때 아버지가 지금 제 나이였습니다.
저는 아직 저 하나도 버거운데.
그 나이에 두 분은 저를 업고 다니셨더군요.
앞으로는 자주 찾아뵙겠습니다.
오늘부터 둘이 갑니다.`],
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
  const old = lines.slice(h + 1, e);
  plan.push({ no, h, e, neu });
  const last = syl(neu[neu.length - 1]), prev = syl(neu[neu.length - 2] ?? '');
  const sec = (neu.reduce((a, s) => a + syl(s), 0) / 406 * 60).toFixed(0);
  const who = lines[h].split('·')[1]?.trim() ?? '';
  console.log(`  [${no}] ${who.padEnd(5)} ${old.length}→${neu.length}문장 · 약 ${String(sec).padStart(2)}초 · 끝 ${String(last).padStart(2)}(앞 ${String(prev).padStart(2)})  ${last < prev ? '착지 ok' : '★앞줄보다 길다'}`);
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
const out = [];
let i = 0;
for (const p of plan.sort((a, b) => a.h - b.h)) { out.push(...lines.slice(i, p.h + 1), ...p.neu); i = p.e; }
out.push(...lines.slice(i));
fs.writeFileSync(CAST, out.join('\n'));
console.log(`\n반영함 · ${plan.length}클립`);
