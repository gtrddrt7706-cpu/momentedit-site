// 덕담에서 조언을 «상대에 대한 관찰»로 돌린다 [BLESS_TURN]
//
//   node scripts/apply-bless-turn.mjs [--write]
//
// ★왜 — 2026-09-11 사장님: *"부모님이 신랑신부에게 하는말 부분말이야"*
//   둘 다 이야기가 되긴 했는데(LETTER_STORY), 각각 하나씩 빠져 있었다.
//
// ★★[아버님 — 조언 덩어리가 이야기를 끊는다]
//   보일러 이야기 → 사람됨 정리 → «갑자기» 「살다 보면 서로 미운 날이 옵니다」 → 손 → 착지.
//   가운데 세 줄이 앞뒤 어디와도 안 이어진다. 다른 덕담에서 떼어 온 조언 덩어리였다.
//   ★그리고 더 큰 것 — 딸 결혼식인데 «사위 이야기»만 있었다. 딸을 본 장면이 없다.
//   고친 방법: 대구를 딸에게 돌린다. 「서준이는 뒤쪽입니다」 뒤에 「하윤아, 너는 앞쪽이지」.
//     그러면 「먼저 말을 거는 것」이 훈계가 아니라 «딸의 강점»이 되고, 보일러 장면과 한 줄로 이어진다.
//     조언이 관찰로 바뀐다. 나태주 「풀꽃」이 「너도 그렇다」로 화살을 돌리는 그 자리다.
//
// ★★[어머님 — 사위에게 직접 하는 말이 없다]
//   서준이가 11번에 나오지만 전부 하객에게 하는 3인칭 보고였다.
//   아버님은 「서준아, 하윤아」로 시작해 딸에게 「잘 살아라」로 끝나는데,
//   어머님은 시작만 부르고 끝은 딸에게만 간다 — 사위가 호명 없이 끝난다.
//   고친 방법: 「서준아」로 호명하고 그 목격담을 사위에게 «직접» 말한다.
//   ★호칭은 이름 + 존대다 — 「서준아 … 물었지요」. 장모가 사위를 부르는 실제 방식이고,
//     하게체(「물었는가」)는 낭독 대본에 위험하다.
//   ★35음절짜리 한 줄을 셋으로 쪼갰다. 이 대본에서 제일 중요한 문장인데 한 호흡에 안 들어갔다.
//
// ★[지킨 것] CROSS_ECHO(신랑 「한 번은 더 물을게」 → 어머님 「한 번 더 물었지요」)의
//   «약속 → 증언» 순서, 착지, 「잘 살아라」 4음절, 보일러·양호실 장면 전부 그대로다.
//
// ★★[남는 설계 질문 — 두 분 다 신부 쪽 부모다]
//   아버님이 「하윤이 손을 스물아홉 해」라 하고 어머님이 「하윤이가 고3 때」라 하니 둘 다 신부 부모다.
//   양가 한 분씩이 아니다. 다만 신랑 부모는 14_tribute 에서 아들의 헌정을 «받는» 쪽이라
//   자리가 없지는 않다. 바꾸려면 어머님을 신랑 어머니로 옮겨야 하는데,
//   그러면 양호실 이야기(친정 엄마만 아는 것)와 CROSS_ECHO 를 잃는다. 사장님 결정 사항이다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const CAST = path.join(ROOT, 'docs/plans/식순연구/배역_예시_대사.txt');

const NEW = [
  ['12', `서준아, 하윤아.
이거 쓰는 데 한 달 걸렸습니다.
그래도 길게는 하지 않겠습니다.
작년 겨울에 우리 집 보일러가 고장 났습니다.
날이 추워서 하윤이한테만 말했는데, 그 주 토요일에 서준이가 왔습니다.
두 시간을 만지더니 고쳐 놓고, 밥도 안 먹고 갔습니다.
저는 그날 저 사람이 어떤 사람인지 알았습니다.
말로 하는 사람이 있고, 그냥 하는 사람이 있습니다.
서준이는 뒤쪽입니다.
하윤아, 너는 앞쪽이지.
살다 보면 서로 미운 날이 온다.
그때 먼저 말을 거는 건 아마 네가 할 거다.
지는 게 아니다. 아버지는 그걸 알기까지 오래 걸렸다.
하윤이 손을 스물아홉 해 잡고 걸었습니다.
그게 참 좋았습니다.
오늘부터 이 손은 셋이 잡습니다.
잘 살아라.`],
  ['13', `하윤아, 서준아.
오늘 할 말을 적어 왔습니다.
그러지 않으면 못 할 것 같아서요.
하윤이가 고등학교 삼학년 때 일입니다.
아침에 얼굴이 하얘서 왜 그러느냐고 물었더니 괜찮다고 했어요.
학교에 보내 놓고 마음이 놓이지 않아, 점심때 찾아갔습니다.
하윤이는 이미 양호실에 누워 있었어요.
왜 말을 하지 않았느냐고 하니, 엄마가 걱정할까 봐 그랬답니다.
그때 저는 좀 무서웠습니다.
이 아이는 평생 이러겠구나 싶어서요.
서준아.
지난여름에 둘이 우리 집에 왔을 때요.
하윤이가 괜찮다고 하는데, 한 번 더 물었지요.
저는 그날 이 걱정을 내려놓았습니다.
하윤아.
엄마는 이제 네 걱정을 안 한다.
네 옆에 사람이 생겼으니까.`],
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
  const long = neu.filter((s) => syl(s) > 32).length;
  const sec = (neu.reduce((a, s) => a + syl(s), 0) / 406 * 60).toFixed(0);
  const who = lines[h].split('·')[1]?.trim() ?? '';
  console.log(`  [${no}] ${who.padEnd(5)} ${old.length}→${neu.length}문장 · 약 ${sec}초 · 끝 ${String(last).padStart(2)}(앞 ${String(prev).padStart(2)}) ${last < prev ? '착지 ok' : '★긺'} · 32음절 넘는 줄 ${long}`);
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
const out = [];
let i = 0;
for (const p of plan.sort((a, b) => a.h - b.h)) { out.push(...lines.slice(i, p.h + 1), ...p.neu); i = p.e; }
out.push(...lines.slice(i));
fs.writeFileSync(CAST, out.join('\n'));
console.log(`\n반영함 · ${plan.length}클립`);
