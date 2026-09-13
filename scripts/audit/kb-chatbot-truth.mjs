// 챗봇이 «없는 기능을 있다»고 말하지 않는지 본다  [KB_CHATBOT_TRUTH]
//   node scripts/audit/kb-chatbot-truth.mjs
//
// ★왜 — 2026-09-12 실측에서 챗봇 답변 6곳이 단일 진실원(api/_kb.js)과 어긋났다.
//   가장 큰 것: 질문이 「사진 · 문구를 직접 넣나요?」인데 답이 「네, 사진·문구·구성을
//   자유롭게 커스텀하실 수 있습니다」였다. 그런데 _kb.js §15 는 이렇게 적어 두었다 —
//     ★[INV_NO_PHOTO] 사진은 넣지 않는다 … 업로드 칸도 없다
//     ★"가능합니다"라고 답하지 말 것 — 없는 기능을 있다고 하면 두 분이 편집 화면에서
//        그 칸을 찾다가 상담으로 온다.
//   KB 가 글로 금지한 답을 챗봇이 그대로 하고 있었다. 나머지 5건(주례·다국어·수정 마감·
//   녹화본·한복 대여)도 같은 종류다 — 전부 「상담에서 안내드립니다」로 써서 «된다»는
//   전제를 깔았다.
//
// ★이 검사가 막는 것 — 답변을 새로 쓰거나 고칠 때 KB 가 «없다»고 한 것을 다시 «있다»로
//   되돌리는 것. 문체 검사가 아니라 사실 검사다.
import fs from 'node:fs';
import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const kb = fs.readFileSync(path.join(ROOT, 'api/_kb.js'), 'utf8');
const bot = fs.readFileSync(path.join(ROOT, 'assets/advisor-kb.js'), 'utf8');

// 답변 본문만 (라벨·주석 제외)
const answers = [...bot.matchAll(/answer: '((?:[^'\\]|\\.)*)'/g)].map((m) => m[1]);
const joined = answers.join('\n');

// [원천이 «없다»고 한 것, 챗봇이 그것을 «있다»로 되돌린 신호, 설명]
const RULES = [
  ['사진은 넣지 않는다', /사진[^.]{0,20}(커스텀|넣으실|삽입|업로드)/, '청첩장 사진 — _kb.js §15 는 사진 칸이 없다고 못 박았다'],
  ['한국어 청첩장만 제공', /(영문|일문)[^.]{0,30}(상담에서|도와드립니다|가능)/, '다국어 청첩장 — 미제공인데 「상담에서」로 열어 두었다'],
  ['수정 마감 없음', /청첩장[^.]{0,40}마감[^.]{0,20}(상담|안내)/, '청첩장 수정 마감 — 마감이 없는데 있는 것처럼 말한다'],
  ['별도 녹화본은 제공하지 않으며', /녹화본[^.]{0,20}제공[^.]{0,10}(방식|여부)/, '디지털 참석 녹화본 — 「제공 방식」이라 쓰면 제공된다는 전제가 선다'],
  ['스튜디오 대여는 없지만', /(한복|전통 의상)[^.]{0,20}대여[^.]{0,20}(상담에서|도와드립니다)/, '한복 대여 — 대여는 확정적으로 없다'],
];
const bad = [];
const ok = [];
for (const [anchor, wrong, why] of RULES) {
  if (!kb.includes(anchor)) { bad.push(`원천에서 「${anchor}」를 못 찾았다 — api/_kb.js 가 바뀌었으면 이 검사도 함께 고칠 것`); continue; }
  const hit = joined.match(wrong);
  if (hit) bad.push(`${why}\n        챗봇: 「…${hit[0]}…」`);
  else ok.push(why.split(' — ')[0]);
}

// 주례: 식순 순간 목록에 없는 것을 «식순에서 넣고 뺀다»고 말하지 않는지
const moments = (fs.readFileSync(path.join(ROOT, 'api/_ritual-kb.js'), 'utf8').match(/순간들:([^)]*)\)/) || [, ''])[1];
if (/주례/.test(moments)) ok.push('주례가 식순 순간 목록에 있다(원천 변경)');
else if (/주례[^.]{0,30}식순 설계에서[^.]{0,20}(넣고 뺄|고르)/.test(joined)) bad.push('주례 — 식순 순간 목록에 없는데 「식순 설계에서 넣고 뺄 수 있다」고 말한다');
else ok.push('주례를 화면에서 고르는 순서로 말하지 않는다');

// 자기반증 — 옛 답을 되돌리면 반드시 걸려야 한다
{
  const probe = joined + "\n네, 마이페이지에서 사진·문구·구성을 자유롭게 커스텀하실 수 있습니다.";
  if (!/사진[^.]{0,20}(커스텀|넣으실|삽입|업로드)/.test(probe)) bad.push('자기반증 실패 — 옛 답을 넣어도 안 걸린다(검사가 헛것이다)');
}
if (!answers.length) bad.push('답변을 하나도 못 읽었다 — 파서가 깨졌다(안 쟀는데 초록이 되는 것을 막는다)');

for (const o of ok) console.log(`ok ${o}`);
for (const b of bad) console.error(`FAIL ${b}`);
console.log(`결과 — 답변 ${answers.length}개 검사 · 어긋남 ${bad.length}건`);
process.exit(bad.length ? 1 : 0);
