// 입버릇을 줄이고, 사진 동선을 작가님께 넘긴다 [TIC_CUT] [PHOTO_SPLIT_TRIM]
//
//   node scripts/apply-tic-cut.mjs [--write]
//
// ★왜 — 2026-09-12 사장님 결정 ③⑥.
//   ⑥ *"2~3회로줄이기 이미 녹음한것에 제약을 두지말고 진행 오로지 결과물에 포커싱 최선"*
//   ③ narr-photo-split 은 «추천대로» = 사진 동선을 작가님께 넘긴다.
//   그리고 *"스킬사용해서 ai느낌없이 진행"* — 새로 쓰는 문장도 같은 잣대로 건다.
//
// ★★[TIC_CUT — 「오늘 이 자리」가 한 예식에 5회였다]
//   관용구라 한 번은 좋은데 다섯 번이면 하객이 문장이 아니라 «틀»을 듣기 시작한다.
//   ★지킬 둘을 먼저 정했다. 줄이는 일은 «무엇을 남길지»를 정하는 일이지 고르게 깎는 일이 아니다:
//     narr-bless-end 「방금 그 말은, 오늘 이 자리에 있던 사람들만 들었습니다」 — 이 대본의 모범 문장
//     declare-ask-b  「두 사람이 흔들리는 날, 오늘 이 자리를 기억해 주시겠습니까?」 — 질문의 핵심
//   나머지 셋에서 뺐다. 5회 → 2회.
//
// ★★[AI 티를 함께 걷었다 — 고치는 김에 같은 자리에서]
//   ①D-5 의인화 추상 주어 — 「마음이 … 함께합니다」·「약속이 … 채웠습니다」.
//     주어를 «사람»으로 바꾸면 문장이 즉시 구체가 된다. 「마음」이 주어면 서술어는 반드시 선언이 되고,
//     「분들」이 주어면 관찰이 된다. 편지 여는 말이 그래서 「앞자리에 앉아 계십니다」가 됐다 —
//     하객의 시선을 실제로 부모님께 돌리는 기능까지 생긴다.
//   ②D-6 결말 공식 — narr-close 의 「시간이 흘러도, 두 사람은 오늘의 이 마음으로 언제든 돌아올 수
//     있을 것입니다」는 추상이고 감정 선언이다. 통째로 뺐다. 폐식의 여운은 마지막 클립
//     (narr-photo-out)이 맡으므로 여기서 미리 쓰지 않는다.
//   ③군말 — 「부디」.
//
// ★★[PHOTO_SPLIT_TRIM — 통째로 끄지 «않은» 이유]
//   사장님 결정은 「추천대로(=끈다)」였는데, 실측하니 이 클립은 240초짜리 라이브 구간의
//   «진입 신호»를 겸하고 있었다. 통째로 끄면 전체컷이 끝난 뒤 그 구간이 무음으로 시작한다.
//   그래서 문장 단위로 갈랐다:
//     「이제 나눠서 담겠습니다」          진입 신호        → 남긴다
//     「가족사진은 작가님이 순서대로 불러 드립니다」 지시자를 작가님으로 «명시» → 남긴다
//     「이름이 불린 분들만 남아 주시고, 나머지 분들은 자리로 돌아가 편히 계시면 됩니다」 동선 → 뺀다
//   결정의 «취지»(동선은 작가님께)는 그대로 지키면서 구간이 무음으로 열리는 사고를 막는다.
//   ★덤으로 「편히 계시면 됩니다」가 이웃 클립(narr-round-open)과 연달아 나가던 것도 같이 풀린다.
//
// ★[NARV_ZERO] NARR.close 는 NARV.close[0] 과 «항상 같아야» 한다 — index 0 은 따로 녹음하지 않고
//   NARR 녹음을 그대로 쓴다. 둘을 함께 고친다.
//
// ★비용 — 우성 5클립 재녹음(letter-parent · letter-both · narr-close · narr-photo-split · narr-photo-out)
//   + end-2-goodbye. 사장님이 「이미 녹음한 것에 제약을 두지 말라」고 했다.
//
// ★종료 코드 0 다 맞음 · 1 자리를 못 찾음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const FILES = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'order-preview.html'];

const EDIT = [
  ['편지 여는 말 · 의인화 → 사람',
   '세상에서 가장 먼저 두 사람을 사랑해 준 마음이, 오늘 이 자리에 함께합니다.',
   '세상에서 가장 먼저 두 사람을 사랑해 준 분들이, 오늘 앞자리에 앉아 계십니다.'],
  ['편지 여는 말(둘 다) · 같은 자리',
   '세상에서 가장 먼저 두 사람을 사랑해 준 마음, 그리고 이제 서로의 평생이 될 두 사람.',
   '세상에서 가장 먼저 두 사람을 사랑해 준 분들이 앞자리에 계시고, 이제 서로의 평생이 될 두 사람이 여기 섰습니다.'],
  ['폐식 · 의인화 + 결말 공식 제거',
   '두 사람이 나눈 약속이, 오늘 이 자리를 가득 채웠습니다. 시간이 흘러도, 두 사람은 오늘의 이 마음으로 언제든 돌아올 수 있을 것입니다. 이제 그 자리를 사진으로 남기겠습니다. 모두 앞으로 나와, 두 분 곁에 서 주세요.',
   '오늘 두 사람이 한 말은 여기까지입니다. 이제 사진으로 남기겠습니다. 모두 앞으로 나오셔서, 두 분 곁에 서 주세요.'],
  ['마지막 닫는 말 · 「이 자리」 제거',
   '오늘 이 자리에 함께 계셨던 것이, 이 한 장에 그대로 남았습니다.',
   '오늘 여기 계셨던 것이, 이 한 장에 그대로 남았습니다.'],
  ['배웅 · 「이 자리」·「채우다」 중복 + 군말',
   '오늘 이 자리를 함께 채워 주셔서 감사합니다. 여러분이 계셔서 두 사람의 처음이 외롭지 않았습니다. 돌아가시는 길, 부디 편안하시기 바랍니다.',
   '끝까지 함께해 주셔서 감사합니다. 여러분이 계셔서 두 사람의 처음이 외롭지 않았습니다. 돌아가시는 길 편안하시기 바랍니다.'],
  ['나눠 담기 · 동선을 작가님께',
   '이제 나눠서 담겠습니다. 가족사진은 작가님이 순서대로 불러 드립니다. 이름이 불린 분들만 남아 주시고, 나머지 분들은 자리로 돌아가 편히 계시면 됩니다.',
   '이제 나눠서 담겠습니다. 가족사진은 작가님이 순서대로 불러 드립니다.'],
];

const src = new Map(FILES.map((f) => [f, fs.readFileSync(path.join(ROOT, f), 'utf8')]));
let bad = 0;
for (const [why, from] of EDIT) {
  const per = FILES.map((f) => [f, src.get(f).split(from).length - 1]);
  const tot = per.reduce((a, [, n]) => a + n, 0);
  console.log(`  ${tot ? '·' : '✗'} ${why.padEnd(30)} ${per.filter(([, n]) => n).map(([f, n]) => `${f.split('/').pop()} ${n}`).join(' · ') || '못 찾음'}`);
  if (!tot) bad++;
}
if (bad) { console.log('\n자리를 못 찾았다 — 아무것도 쓰지 않는다.'); process.exit(1); }

/* ★★[COUNT_BY_CUE] 자가검사는 «파일 전체»를 세면 안 된다 — 실제로 한 번 틀렸다.
   「오늘 이 자리」를 파일에서 세면 12회가 나오는데, 그 안에는 어조(NARV) 변형과 주석과
   고객에게 보여 주는 예시 문안이 섞여 있다. 그것들은 한 예식에서 «함께 나가지 않는다».
   세야 하는 것은 «한 예식에서 실제로 스피커로 나가는 횟수»다. 그러니 큐 엔진을 돌려 센다
   (check-echo-inrun.js 가 같은 이유로 같은 방법을 쓴다). 쓰고 나서 세고, 넘치면 되돌린다. */
const after = new Map(FILES.map((f) => {
  let s = src.get(f);
  for (const [, from, to] of EDIT) s = s.split(from).join(to);
  return [f, s];
}));
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영 · 쓴 뒤 큐 엔진으로 횟수를 센다)'); process.exit(0); }
for (const [f, s] of after) fs.writeFileSync(path.join(ROOT, f), s);

/* 쓴 뒤에 센다 — 큐 엔진은 파일을 읽어야 돌아간다 */
const { createRequire } = await import('node:module');
const req = createRequire(import.meta.url);
const D = req(path.join(ROOT, 'assets/ritual-data.js'));
const RC = req(path.join(ROOT, 'assets/ritual-cue.js'));
const TIC = ['오늘 이 자리', '편히 계시면 됩니다', '채웠습니다', '가득 채'];
let over = 0;
for (const course of Object.keys(D.COURSES)) {
  const t = RC.build({ course }, { mode: 'console' }).cues.filter((c) => c.text).map((c) => c.text).join(' ');
  const row = TIC.map((k) => `${k} ${(t.split(k).length - 1)}`).join(' · ');
  const n = t.split('오늘 이 자리').length - 1;
  if (n > 2) over++;
  console.log(`  ${n > 2 ? '✗' : '·'} ${course.padEnd(9)} ${row}`);
}
if (over) { console.log('\n✗ 「오늘 이 자리」가 여전히 2회를 넘는 코스가 있다 — git checkout 으로 되돌리세요.'); process.exit(1); }
console.log(`\n반영함 · ${EDIT.length}자리 · 원천과 빌더 인라인 사본을 함께 고쳤다`);
