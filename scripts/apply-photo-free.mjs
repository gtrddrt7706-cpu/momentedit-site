// 사진 순서를 작가님께 넘기기로 한 결정이 원천에 반영되지 않았다 [PHOTO_FREE_DO]
//
//   node scripts/apply-photo-free.mjs [--write]
//
// ★왜 — 2026-09-06 사장님 지시가 «문서에만» 있고 코드에 안 들어왔다.
//   docs/plans/식순연구/문안개정_20260906.md:115 [PHOTO_FREE]
//     사장님 원문: *"작가님이 알아서 하니깐 사진촬영부분은 자유롭게 놔두자"*
//     그래서 아래도 전부 삭제한다:
//       양가 가족분들은 잠시 그대로 계시면 됩니다 / 이번에는 양가 부모님만 남습니다 /
//       형제자매분들은 자리로 돌아가셔도 됩니다 / 나머지 분들은 그대로 계셔도 좋습니다
//       앞줄은 의자에 앉아 주시고, 뒷줄은 그대로 서 주세요 / 하나, 둘, 셋
//     남는 것은 여는 말 한 줄뿐이다 — 「이제 다 같이 사진을 남깁니다. 여기서부터는 작가님이 안내해 드릴게요.」
//   여섯 중 「하나, 둘, 셋」(fx-count)만 실행됐고 나머지 다섯은 6일째 살아 있었다.
//
// ★★[어떻게 찾았나 — 다른 것을 고치려다 걸렸다]
//   후반부 점검에서 「이번에는 양가 부모님만 남습니다」에 주체높임 -시- 가 빠졌다는 지적이 3/3 으로
//   확인됐다. 실제로 같은 문장 앞 절은 형제자매분들에게 「돌아가셔도」로 높이면서 정작 어른께만 안 높인다.
//   그런데 고치려고 이력을 뒤지니, 그 문장은 «고칠 것»이 아니라 «지워졌어야 할 것»이었다.
//   ★높임을 고쳤으면 사장님이 지우라고 한 문장을 더 다듬어 놓고 재녹음까지 시킬 뻔했다.
//     문안을 고치기 전에 「이 문장이 아직 살아 있어야 하는가」를 먼저 묻는다 — 그 순서가 이번에 값을 했다.
//
// ★★[지우지 않고 off:1 로 끈다 — 저장소가 이미 비싸게 배운 규칙이다]
//   PHOTOCUE 주석(PHOTO_POSE_RETIRED)이 그 이유를 적어 뒀다:
//     「지우면 뒤 클립 번호가 두 칸씩 밀리고, 이미 녹음된 mp3 가 남의 자리에 앉는다
//      (2026-08-08 에 fx-count 가 78→83 으로 밀린 그 사고다)」
//   console.html 의 판(PHOTOCUE_BOARD)이 off 를 건너뛰므로 디렉터 화면에서 사라진다.
//   그리고 생성기들이 거르도록 ritual-cue.js 의 RETIRED 에도 같이 올린다 — fx-surround·fx-count 가 그 짝이다.
//
// ★[fx-selfie 는 끄지 않는다] 사장님 목록의 「나머지 분들은 그대로 계셔도 좋습니다」는 이 클립의 «앞 절»이다.
//   뒤 절 「두 분, 폰을 들어 주세요」는 두 사람에게 하는 연출 지시라 살아야 한다(하객 동선이 아니다).
//   그래서 클립을 끄지 않고 앞 절만 뺀다. 번호가 안 밀리므로 재녹음 1개로 끝난다.
//
// ★[안 건드린 것 — 물어야 할 것] narr-photo-split 「이름이 불린 분들만 남아 주시고, 나머지 분들은
//   자리로 돌아가 편히 계시면 됩니다」도 하객 동선 지시라 같은 논리로는 지워야 한다.
//   그런데 사장님 목록에 «명시되지 않았고» 이건 PHOTOCUE 판이 아니라 큐 체인이라, 끄면 흐름이 바뀐다.
//   문서의 「남는 것은 여는 말 한 줄뿐이다」는 지우라는 쪽을 가리키지만, 내가 넘겨짚지 않는다. 사장님께 묻는다.
//
// ★비용 — 재녹음 1개(75_fx-selfie). 끄는 셋은 녹음이 있어도 안 나가므로 다시 받을 것이 없다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const DATA = path.join(ROOT, 'assets/ritual-data.js');
const CUE = path.join(ROOT, 'assets/ritual-cue.js');

const OFF = [
  ["  {k:'양가 가족 전체', slug:'call-family-all', t:",
   "  {k:'양가 가족 전체', slug:'call-family-all', off:1, t:"],
  ["  {k:'양가 부모님과',  slug:'call-parents',    t:",
   "  {k:'양가 부모님과',  slug:'call-parents',    off:1, t:"],
  ["  {k:'앉은 줄 + 선 줄',     slug:'fx-seatrow',  t:",
   "  {k:'앉은 줄 + 선 줄',     slug:'fx-seatrow',  off:1, t:"],
  ['t:"나머지 분들은 그대로 계셔도 좋습니다. 두 분, 폰을 들어 주세요."',
   't:"두 분, 폰을 들어 주세요."'],
];
const MARK = `  /* ★★[PHOTO_FREE_DO 2026-09-12] 2026-09-06 사장님 지시 [PHOTO_FREE] 를 뒤늦게 실행한다.
     *"작가님이 알아서 하니깐 사진촬영부분은 자유롭게 놔두자"* — 호명·동선을 통째로 작가님께 넘겼다.
     지시자가 둘이 되면(스피커가 부르는 순서 ≠ 작가님 손의 순번표) 하객이 무엇을 따를지 모른다.
     구도 순번은 이미 마이페이지에서 두 분이 짜서 작가님께 전달된다(mypage.html PHOTOFLOW).
     ★지우지 않고 off:1 로 끈다 — 지우면 뒤 클립 번호가 밀려 녹음된 mp3 가 남의 자리에 앉는다.
     ★되살리지 말 것. 「작가는 이 집안의 누가 누군지 모른다」는 조사 근거로 되살리고 싶어지는데,
       그 근거는 문안개정 문서에서 이미 «틀렸다»고 스스로 철회했다. */
`;

let d = fs.readFileSync(DATA, 'utf8');
let c = fs.readFileSync(CUE, 'utf8');
let bad = 0;
for (const [from, to] of OFF) {
  const n = d.split(from).length - 1;
  console.log(`  ${n === 1 ? '·' : '✗'} ${n}곳 | ${from.slice(0, 52)}`);
  if (n !== 1) bad++;
}
const RET = ['call-family-all', 'call-parents', 'fx-seatrow'];
const already = RET.filter((s) => c.includes(`'${s}': 1`) || c.includes(`'${s}':1`));
console.log(`  · RETIRED 에 이미 있는 것 ${already.length}개 ${already.join(' ')}`);
const anchor = "'fx-surround': 1, 'fx-count': 1,";
if (!c.includes(anchor)) { console.log(`  ✗ RETIRED 자리표를 못 찾았다: ${anchor}`); bad++; }
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
for (const [from, to] of OFF) d = d.split(from).join(to);
d = d.split(' call:[').join(`\n${MARK} call:[`);
c = c.split(anchor).join(`${anchor}\n    /* ★[PHOTO_FREE_DO 2026-09-12] 사진 호명·동선을 작가님께 넘겼다 — 2026-09-06 사장님 지시를
       뒤늦게 실행한 것이다(문안개정_20260906.md:115). PHOTOCUE 의 off:1 과 짝으로 움직인다.
       ★파일·문안은 그대로 둔다(번호 보존). 되살리지 말 것. */
    'call-family-all': 1, 'call-parents': 1, 'fx-seatrow': 1,`);
fs.writeFileSync(DATA, d);
fs.writeFileSync(CUE, c);
console.log(`\n반영함 · 끈 클립 3개 · 문안 손질 1개(fx-selfie)`);
