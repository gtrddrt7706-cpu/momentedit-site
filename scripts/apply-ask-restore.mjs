// 「짧은 한마디」를 예고해 놓고 아무도 묻지 않았다 [ASK_RESTORE]
//
//   node scripts/apply-ask-restore.mjs [--write]
//
// ★왜 — 2026-09-12 사장님: *"특히 흐름상 감동을 주는부분들 신경써서"*
//   흐름을 처음부터 끝까지 세워 놓고 보니 응답형 선언에 구멍이 있었다. 25분 간격이라 안 보였다.
//
// ★★[무슨 일이 있었나 — 코드가 「삭제 금지」라고 적어 둔 문장이 삭제돼 있었다]
//   ritual-cue.js 의 declare-ask-b 큐에 이렇게 적혀 있다:
//     note: '"네, 그러겠습니다" 시연 문장 삭제 금지 — 없으면 답이 갈린다'
//     live: { t: '하객 전원 "네, 그러겠습니다"', est: 6 }
//   그런데 정작 나레이션(DECLWHO.ask.nar)에는 그 시연 문장이 없고 「박수로 보여 주시면 좋겠습니다」다.
//   merge-guard 에 마커가 없어서, 문안을 고치던 어느 판에서 조용히 빠진 것이 아무에게도 안 걸렸다.
//   ★이건 「제거 지시 보존 규칙」의 거울상이다 — «보존하라»고 적힌 것이 소리 없이 사라졌다.
//     그래서 이번에는 마커를 건다. 같은 일이 다시 일어나면 게이트가 잡는다.
//
// ★★[증상 — 세 자리가 서로 다른 말을 한다]
//   식전 예고 declare-ask-a  「함께 답해 주시는 순서가 한 번 있습니다. 짧은 한마디면 됩니다.」
//   본 자리   DECLWHO.ask.nar「그 마음을, 박수로 보여 주시면 좋겠습니다.」        ← 한마디가 없다
//   큐 데이터 live.t          「하객 전원 "네, 그러겠습니다"」                      ← 콘솔에만 있다
//   설명문   prep            「하객분들은 박수만 보내 주시면 돼요」                 ← 또 박수
//   하객은 25분 동안 «내가 뭘 말해야 하나»를 안고 있다가, 아무도 묻지 않은 채 예식이 끝난다.
//   그리고 그 6초는 진행자가 없으니 그냥 침묵이 된다. 예식 정점에 빈 자리가 생긴다.
//
// ★★[고치면서 바꾼 것 하나 — 「네, 그러겠습니다」가 아니라 「네」다]
//   주석이 걱정한 「답이 갈린다」가 바로 4어절이라서 생긴다. 리허설이 없는 25명이 4어절을 맞출 수 없다.
//   먼저 답한 사람과 늦게 답한 사람이 어긋나면, 정점이 웅성거림으로 끝난다.
//   ★한 글자는 맞출 필요가 없다. 「네」는 동시에 나오거나 안 나오거나 둘뿐이고, 어긋날 여지가 없다.
//   ★심리 조사도 같은 쪽을 가리켰다 — 25명 규모에서 «동기화(합창)»에 기대지 말 것.
//
// ★★[실패해도 성립하게 했다]
//   대답이 작게 나올 수 있다. 그래서 다음 클립 첫 줄을 「방금 그 대답까지가, 오늘의 약속입니다」로 열었다.
//   컸든 작았든 그 줄이 받아낸다. 그리고 하객의 대답을 «예식의 일부»로 올린다 —
//   조사에서 「공유된 주의」가 이 방 크기에서 가장 강한 장치라고 나온 그 자리다.
//
// ★[함께 고침] 박수 요청이 두 클립 연속이었다(「박수로 보여 주시면」 → 「큰 박수로 축하해」).
//   앞쪽을 질문으로 돌리면서 자연히 하나가 됐다. prep 설명문도 박수 → 한마디로 맞췄다.
//   live.t 도 「네」로 맞춘다 — 콘솔 지문과 스피커 안내가 다르면 디렉터가 다른 것을 기다린다.
//
// ★비용 — 우성 2클립 재녹음(declare-ask-b · declare-ask-c).
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const EDIT = [
  ['assets/ritual-data.js', '선언 · 하객께 질문 (nar)',
   '두 사람이 흔들리는 날, 오늘 이 자리를 기억해 주시면 그것으로 충분합니다. 그 마음을, 박수로 보여 주시면 좋겠습니다.',
   '두 사람이 흔들리는 날, 오늘 이 자리를 기억해 주시겠습니까? 기억하겠다는 뜻으로, 네 하고 답해 주시면 됩니다.'],
  ['assets/ritual-data.js', '선언 · 선언과 박수 (end)',
   '"이제 두 사람은 부부입니다. 큰 박수로 두 사람을 축하해 주시기 바랍니다."',
   '"방금 그 대답까지가, 오늘의 약속입니다. 이제 두 사람은 부부입니다. 큰 박수로 두 사람을 축하해 주시기 바랍니다."'],
  ['assets/ritual-data.js', '선언 · 설명문 (prep)',
   '하객분들은 박수만 보내 주시면 돼요',
   '하객분들은 「네」 한마디와 박수만 보내 주시면 돼요'],
  ['assets/ritual-data.js', '선언 · 고객 설명 (desc)',
   '나레이션이 하객분들께 두 사람을 부탁드리고, 그 박수로 성혼이 선언돼요.',
   '나레이션이 하객분들께 두 사람을 부탁드리고, 하객분들의 「네」 한마디로 성혼이 선언돼요.'],
  ['assets/ritual-cue.js', '큐 · 하객 응답 지문',
   "live: { t: '하객 전원 \"네, 그러겠습니다\"', est: 6, self: true, doing: 'say' }",
   "live: { t: '하객 전원 \"네\" (한 글자 · 4어절은 25명이 못 맞춘다)', est: 6, self: true, doing: 'say' }"],
  ['assets/ritual-cue.js', '큐 · 삭제 금지 주석',
   "note: '\"네, 그러겠습니다\" 시연 문장 삭제 금지 — 없으면 답이 갈린다',",
   "note: '[ASK_RESTORE] 「네 하고 답해 주시면 됩니다」 시연 문장 삭제 금지 — 없으면 아무도 답하지 않는다',"],
  ['assets/ritual-cue.js', '큐 · 응답형 마무리 사본',
   "'declare-ask-c': '이제 두 사람은 부부입니다. 큰 박수로 두 사람을 축하해 주시기 바랍니다.',",
   "'declare-ask-c': '방금 그 대답까지가, 오늘의 약속입니다. 이제 두 사람은 부부입니다. 큰 박수로 두 사람을 축하해 주시기 바랍니다.',"],
];

let bad = 0;
const cache = new Map();
const read = (f) => (cache.has(f) ? cache.get(f) : (cache.set(f, fs.readFileSync(path.join(ROOT, f), 'utf8')), cache.get(f)));
for (const [f, why, from] of EDIT) {
  const n = read(f).split(from).length - 1;
  console.log(`  ${n === 1 ? '·' : '✗'} ${why.padEnd(26)} ${f.split('/').pop()} ${n}곳`);
  if (n !== 1) bad++;
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
for (const [f, , from, to] of EDIT) cache.set(f, read(f).split(from).join(to));
for (const [f, s] of cache) fs.writeFileSync(path.join(ROOT, f), s);
console.log(`\n반영함 · ${EDIT.length}곳 (${[...cache.keys()].length}파일)`);
