// 시연을 정점에서 «예고»로 옮긴다 [ASK_MOVE]
//
//   node scripts/apply-ask-move.mjs [--write]
//
// ★2026-09-19 사장님 — 성혼 선언 자리에서 나레이터가 하객 대사를 읽는 것이 어색하다.
//   대안 셋을 올렸고 ㉠(자리 옮기기)을 고르셨다.
//
// ── 무엇이 문제였나 (낱말이 아니라 «자리»였다)
//   개식 직후 예고(declare-ask-a)가 「짧은 한마디면 됩니다」라고만 하고 **그 한마디가 뭔지 안 알려 준다.**
//   그래서 정점(declare-ask-b)이 시연을 떠안았다 — 예식에서 가장 무거운 자리에서 나레이터가
//   하객의 대사를 대신 읽는 모양이 된다. 예고가 제 할 일을 안 해서 생긴 구조다.
//
// ── 그리고 주석과 코드가 갈라져 있었다
//   build-dubbing-script.mjs 의 W2-b note: 「W2-b가 **질문으로 끝나고** 하객이 답한 뒤 W2-c를 재생한다
//   · 클립 경계가 곧 응답 대기 구간이다.」 그런데 실제 b 는 질문 뒤에 시연 두 문장이 더 붙어 있었다.
//   설계 의도가 이미 「질문으로 끝내라」였다. 이 커밋이 그 의도로 돌려놓는다.
//
// ── 고치는 것
//   ㉮ 예고(a)  : 시연을 여기로 옮긴다. 「짧은 한마디」가 무슨 말인지 드디어 말한다.
//   ㉯ 본자리(b): 시연 두 문장을 뺀다. 그리고 **신호를 질문 «앞»에 둔다** — 질문이 마지막에 와야
//                 그 자리가 곧 답하는 자리가 된다. 뒤에 두면 질문의 정점이 한 번 꺼진다.
//
// ── ★낱말은 안 바꾼다 (한 번 시도했다가 되돌아온 길이다)
//   2026-09-12 [ASK_RESTORE] 가 답을 「네」 한 글자로 낮추려 했다(4어절은 25명이 못 맞춘다는 근거).
//   그런데 최종 판은 4어절로 돌아왔고, 그 4어절은 **2026-07-26 사장님 확정 사항**이다
//   (나중에할일_체크리스트 ① *"하객은 「네, 그러겠습니다」 7음절만 답하면 되고"* · "추천대로 하자").
//   그러니 여기서 낱말을 건드리지 않는다. 옮기기만 한다.
//
// ── ★남는 위험과 그 위험이 작은 이유
//   예고와 선언 사이가 30~40분이다. 잊으실 수 있고, 늦게 오신 분은 예고를 못 들으셨다.
//   그래도 무너지지 않는다 — 잊은 분은 「네」, 기억한 분은 「네, 그러겠습니다」.
//   **둘 다 「네」로 시작해서 첫 박이 맞는다.** 합창이 흐트러져 들리지 않는다.
//   ★그리고 답이 작게 나와도 다음 클립은 답을 전제하지 않는다([NO_ANSWER_CLAIM] 2026-09-12).
//
// ★비용 — 우성 2클립 재녹음(declare-ask-a · declare-ask-b).
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.resolve(import.meta.dirname, '..');
const W = process.argv.includes('--write');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');

const OLD_NAR = '두 사람이 흔들리는 날, 오늘 이 자리를 기억해 주시겠습니까? 다 같이 이렇게 답해 주시면 됩니다. 네, 그러겠습니다.';
const NEW_NAR = '다 함께 답해 주시기 바랍니다. 두 사람이 흔들리는 날, 오늘 이 자리를 기억해 주시겠습니까?';

const OLD_PRE = '오늘 예식에는 여러분이 함께 답해 주시는 순서가 한 번 있습니다. 짧은 한마디면 됩니다.';
const NEW_PRE = '오늘 예식에는 여러분이 함께 답해 주시는 순서가 한 번 있습니다. 짧은 한마디면 됩니다. 다 함께 이렇게 답해 주시면 됩니다. 네, 그러겠습니다.';

const OLD_NOTE = "note: '[ASK_RESTORE] 「다 같이 이렇게 답해 주시면 됩니다. 네, 그러겠습니다.」 삭제 금지 — 나레이터가 답을 «시연»하는 구간이다. 없으면 아무도 답하지 않거나 답이 «네»·«예»·«그럽니다»로 갈린다(build-dubbing-script.mjs W2-b note).',";
const NEW_NOTE = "note: '[ASK_MOVE 2026-09-19] 시연은 개식 직후 예고(declare-ask-a)로 «옮겼다» — 지운 것이 아니다. 이 클립은 질문으로 끝난다(설계 의도대로). 예고의 「네, 그러겠습니다」를 지우면 답이 «네»·«예»·«그럽니다»로 갈린다.',";

const OLD_LIVE = "live: { t: '하객 전원 \"네, 그러겠습니다\" (앞 클립 끝에서 나레이터가 시연한다)', est: 6, self: true, doing: 'say' }";
const NEW_LIVE = "live: { t: '하객 전원 \"네, 그러겠습니다\" (개식 직후 예고에서 시연했다 · ASK_MOVE)', est: 6, self: true, doing: 'say' }";

const OLD_SCENE = "'하객 전원 \"네, 그러겠습니다\" (앞 클립 끝에서 나레이터가 시연한다)'";
const NEW_SCENE = "'하객 전원 \"네, 그러겠습니다\" (개식 직후 예고에서 시연했다 · ASK_MOVE)'";

const D = 'assets/ritual-data.js', C = 'assets/ritual-cue.js', O = 'order-preview.html', S = 'assets/ritual-story.js';

const JOBS = [
  [D, '본 자리 — 시연을 빼고 질문으로 끝낸다', OLD_NAR, NEW_NAR, 1],
  [O, '본 자리 사본(빌더)', OLD_NAR, NEW_NAR, 1],
  [C, '예고 — 시연을 여기로 옮긴다', OLD_PRE, NEW_PRE, 1],
  [C, '큐 주석 — 「삭제 금지」도 함께 옮긴다', OLD_NOTE, NEW_NOTE, 1],
  [C, '큐 지문 — 디렉터가 기다릴 것', OLD_LIVE, NEW_LIVE, 1],
  [S, '장면 대본 열쇠', OLD_SCENE, NEW_SCENE, 1],
];

let bad = 0;
const out = new Map();
for (const [f, why, from, to, n] of JOBS) {
  const src = out.get(f) ?? read(f);
  const got = src.split(from).length - 1;
  if (got === 0 && src.includes(to)) { console.log(`ok ${f} — 이미 되어 있음 · ${why}`); continue; }
  if (got !== n) { console.log(`  ✗ ${f} — ${why}: ${n}곳이어야 하는데 ${got}곳`); bad++; continue; }
  out.set(f, src.split(from).join(to));
  console.log(`ok ${f} — ${why} (${n}곳)`);
}
if (bad) { console.log(`\n✗ ${bad}건 어긋남 — 아무것도 쓰지 않았습니다.`); process.exit(1); }
if (!W) { console.log('\n(미리보기) --write 로 반영'); process.exit(0); }
for (const [f, s] of out) fs.writeFileSync(path.join(ROOT, f), s);
console.log('\n반영함 — 다음: 조립기 ASK_DEMO_GAP 을 예고 클립으로 옮기고 생성기를 다시 돌릴 것');
