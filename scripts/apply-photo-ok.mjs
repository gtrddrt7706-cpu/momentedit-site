// 「사진 찍어도 되나」에 답이 없었다 [PHOTO_OK]
//
//   node scripts/apply-photo-ok.mjs [--write]
//
// ★왜 — 2026-09-12 사장님: *"듣는 청중 하객입장에서 좀더 디테일하게 점검"*
//   하객 귀로만 대본을 따라가는 검사를 만들었더니(scripts/audit/guest-ear.js) 이게 나왔다.
//   기본 예식에서 하객이 사진에 대해 듣는 말은 «이것뿐»이다:
//     「휴대폰 소리는 잠시만 꺼 주시면 감사하겠습니다.」
//   찍어도 되는지에 대한 답이 «없다». 25명은 그 말을 「찍지 말라」로 읽는다.
//   결혼식에서 하객이 가장 많이 하는 행동인데 그 자리가 비어 있었다.
//
// ★★[왜 지금까지 안 보였나 — 답이 «조건부 클립»에 들어 있었다]
//   「오늘은 마음껏 찍으셔도 좋습니다」는 narr-photo-ask 에 있는데, 그 클립은
//   S.photoShare(사진 링크를 넣은 두 분)일 때만 나간다. 링크를 안 넣은 예식에서는
//   그 문장이 통째로 빠지고, 하객에게 남는 것은 「소리를 꺼 달라」뿐이다.
//   ★게다가 앞 커밋에서 그 클립의 첫 문장을 「소리만 줄여 주시면」으로 완화했는데,
//     그 완화도 조건부라 정작 필요한 예식에는 안 간다. 조건부 클립을 고쳐서는 이 구멍이 안 메워진다.
//
// ★★[고친 방법 — 답을 «조건 없는 자리»로 옮긴다]
//   guest-4(예식 1분 전)는 모든 예식에서 나간다. 거기에 답을 둔다:
//     휴대폰은 소리만 줄여 주시면 됩니다. 사진은 편히 남기셔도 좋습니다.
//   한 문장이 «범위»를 한정하고(소리만) 다음 문장이 «허락»을 준다. 순서가 중요하다 —
//   허락을 먼저 주면 소리를 꺼야 한다는 말이 뒤늦은 단서처럼 붙는다.
//   ★그러면 narr-photo-ask 는 제 일만 하면 된다 — 「나중에 보내 주실 수 있습니다」.
//     그게 원래 이 클립의 목적이고(배웅의 narr-photo-send 와 짝이다), 미리 알면 더 찍는다.
//   ★[D-폰모순] 도 이걸로 함께 풀린다. guest-4 가 이미 범위를 한정했으므로,
//     바로 뒤 chain 으로 붙는 narr-photo-ask 가 앞말을 뒤집지 않는다.
//
// ★★[TEXT_AUDIO] guest-4 는 화면 글과 소리가 «한 글자도» 달라선 안 되는 클립이다.
//   원천은 ritual-data.js 의 GUEST[3] 이고, 배역_예시_대사.txt 가 그것을 옮겨 적는다.
//   둘을 같은 커밋에서 고친다 — 한쪽만 고치면 check-text-audio 가 잡는다(그러라고 있는 검사다).
//   ★두 분 목소리판은 「진동으로 바꿔」다. 나레이션판(「소리만 줄여」)과 «일부러» 다르다 —
//     초대한 사람이 하는 말이라 더 부드럽다. 그 결은 지키고 사진 허락만 같이 붙인다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const F = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html',
  'docs/plans/식순연구/배역_예시_대사.txt'];

const EDIT = [
  ['모든 예식에 답을 준다 (나레이션판)',
   '휴대폰 소리는 잠시만 꺼 주시면 감사하겠습니다.',
   '휴대폰은 소리만 줄여 주시면 됩니다. 사진은 편히 남기셔도 좋습니다.'],
  ['모든 예식에 답을 준다 (두 분 목소리판)',
   '휴대폰은 진동으로 바꿔 주시면 감사하겠습니다.',
   '휴대폰은 진동으로 바꿔 주시면 됩니다. 사진은 편히 남기셔도 좋아요.'],
  ['사진 클립은 제 일만 한다',
   '휴대폰은 소리만 줄여 주시면 됩니다. 사진은 편히 남기셔도 좋습니다. 같은 순간도, 앉으신 자리마다 다르게 보입니다.',
   '오늘 찍으신 사진은 나중에 두 사람에게 보내 주실 수 있습니다. 같은 순간도, 앉으신 자리마다 다르게 보입니다.'],
];

const src = new Map(F.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
let bad = 0;
for (const [why, from] of EDIT) {
  const per = F.map((f) => [f, src.get(f).split(from).length - 1]);
  const tot = per.reduce((a, [, n]) => a + n, 0);
  console.log(`  ${tot ? '·' : '✗'} ${why.padEnd(30)} ${per.filter(([, n]) => n).map(([f, n]) => `${f.split('/').pop()} ${n}`).join(' · ') || '못 찾음'}`);
  if (!tot) bad++;
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
for (const f of F) {
  let s = src.get(f);
  for (const [, from, to] of EDIT) s = s.split(from).join(to);
  fs.writeFileSync(path.join(ROOT, f), s);
}
console.log(`\n반영함 · ${EDIT.length}자리 (원천 · 큐 · 빌더 사본 · 배역 대본)`);
