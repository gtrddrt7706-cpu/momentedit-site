// 10분 전 안내의 「음료 한 잔」을 걷어낸다 [DRINK_TONE]
//
//   node scripts/apply-copy-0906b.mjs            무엇이 몇 개 바뀌는지만 본다(안 쓴다)
//   node scripts/apply-copy-0906b.mjs --write    실제로 쓴다
//
// ★왜 — 2026-09-06 사장님 지적:
//   *"음료 한 잔 드시면서 편히 계시다가, 자리에 앉아 주시면 됩니다. 이부분 너무 아저씨같은느낌이야 고급스럽게"*
//
// ★무엇이 그 느낌을 만들었나 (한 단어씩 짚음)
//   ①「한 잔」 — 술자리 관용구(「한 잔 하시면서」)의 그림자다. 음료에 붙는 순간 회식 어투가 된다.
//   ②「드시면서」 — 마시는 동작까지 시킨다. 안 시켜도 될 것을 시키면 참견으로 들린다.
//   ③ 한 호흡에 세 가지(마시고·있다가·앉기)를 지시한다. 지시가 겹칠수록 격이 내려간다.
//
// ★고쳐 쓴 방향 — 말을 «더하지» 않고 «지시를 덜었다».
//   음료는 있다는 사실만 알리고(제안), 청하는 것은 앉는 것 하나로 줄였다.
//   호텔 안내방송처럼 굳히지 않았다 — 이 예식의 격은 «조용함»이지 «격식»이 아니다.
//
// ★부부 목소리(저희-체)는 다르게 갔다: 음료를 준비한 사람이 말하는 자리라
//   「준비해 두었습니다」가 사실이자 환대가 된다. 중립 안내가 그 말을 하면 어색하다.
//
// ★문장이 2개 → 3개로 늘어난다. 판정 키가 문장 단위(id#j)라 이 클립 판정은 새로 받는다.
//   어차피 이 클립은 재더빙 대기라 새 소리를 받는다 — 지금이 바꿀 자리다.
//
// ★종료 코드 0 다 맞음 · 1 개수가 다름 · 2 파일을 못 읽음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');

const OLD_N = '음료 한 잔 드시면서 편히 계시다가, 자리에 앉아 주시면 됩니다.';
const NEW_N = '음료가 준비되어 있습니다. 편히 계시다 자리에 앉아 주시면 됩니다.';
const NEW_C = '음료 준비해 두었습니다. 편히 계시다 자리에 앉아 주시면 됩니다.';

// [자리, 지금 글, 새 글, 기대 개수, 왜]
const JOBS = [
  ['assets/ritual-data.js',
    '"오늘의 예식이 약 십 분 뒤 시작됩니다. ' + OLD_N + '"',
    '"오늘의 예식이 약 십 분 뒤 시작됩니다. ' + NEW_N + '"', 1, '원천 · 안내(진희)'],
  ['assets/ritual-data.js',
    '"저희 예식이 약 십 분 뒤 시작됩니다. ' + OLD_N + '"',
    '"저희 예식이 약 십 분 뒤 시작됩니다. ' + NEW_C + '"', 1, '원천 · 부부(서진)'],
  ['order-preview.html',
    '"오늘의 예식이 약 십 분 뒤 시작됩니다. ' + OLD_N + '"',
    '"오늘의 예식이 약 십 분 뒤 시작됩니다. ' + NEW_N + '"', 1, '사본 · 안내'],
  ['order-preview.html',
    '"저희 예식이 약 십 분 뒤 시작됩니다. ' + OLD_N + '"',
    '"저희 예식이 약 십 분 뒤 시작됩니다. ' + NEW_C + '"', 1, '사본 · 부부'],
  /* ★배역 파일은 «저희-체» 원천이다 — 부부가 직접 읽는 대사만 산다.
     여기에 중립 문장을 넣으면 안내 목소리 말투가 부부 입에서 나온다. 실제로 한 번 그렇게 넣었다가
     manifest 를 열어 보고 잡았다(신부 02 클립에 NEW_N 이 들어가 있었다). NEW_C 가 맞다. */
  ['docs/plans/식순연구/배역_예시_대사.txt', OLD_N, NEW_C, 1, '배역 예시(저희-체)'],
];

let bad = 0;
const plan = [];
for (const [rel, oldS, newS, want, why] of JOBS) {
  const p = path.join(ROOT, rel);
  let src;
  try { src = fs.readFileSync(p, 'utf8'); }
  catch { console.log(`못 읽음 ${rel}`); process.exit(2); }
  const got = src.split(oldS).length - 1;
  const ok = got === want;
  if (!ok) bad++;
  console.log(`${ok ? 'ok  ' : '틀림'} ${rel}  ${got}/${want}  ${why}`);
  plan.push([p, src, oldS, newS, ok]);
}
if (bad) { console.log(`\n개수가 다른 자리 ${bad}곳 — 아무것도 쓰지 않고 멈춘다.`); process.exit(1); }
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }

const byFile = new Map();
for (const [p, src, oldS, newS] of plan) {
  const cur = byFile.get(p) ?? src;
  byFile.set(p, cur.split(oldS).join(newS));
}
for (const [p, out] of byFile) fs.writeFileSync(p, out);
console.log(`\n반영함 · 파일 ${byFile.size}개`);
