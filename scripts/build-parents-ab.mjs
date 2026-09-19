/* 「어른께 드리는 안내」 낭독 두 판을 «귀로 견주려고» 뽑는다  [PARENTS_AB]
 *
 *   node scripts/build-parents-ab.mjs [--write]
 *
 * ★왜 — 2026-09-19 사장님 *"2개 다 녹음 파일 만들어봐 내가 직접들어볼게"* · *"이 시스템으로"*(타입캐스트)
 *   화면 글과 낭독이 갈렸다(지시문_어른께드리는안내_화면대소리_20260919.md).
 *   어느 쪽이 나은지는 «읽어서»가 아니라 «들어서» 정할 일이라, 두 판을 같은 자리에서 받아 견준다.
 *
 * ★두 판을 «같은 판에서» 받는 것이 요점이다
 *   A판은 이미 mp3 가 있지만 그것과 견주면 안 된다 — 몇 주 전 다른 설정으로 받은 소리다.
 *   같은 날 같은 보이스로 둘 다 받아야 «차례와 문단»만 다른 비교가 된다.
 *
 * ★붙여넣기 판은 머리말이 한 줄도 없어야 한다  [PICK_PASTE]
 *   전에 양식을 그대로 타입캐스트에 넣어 화자가 76명으로 잡힌 적이 있다.
 *   이 파일은 «우성: 대사»만 있고 그 밖에 아무것도 없다.
 *
 * ★B판의 차례는 parents.html 이 정한다 — 여기 베껴 적지 않는다
 *   새 7문장이 화면에 «글자 그대로» 있는지 매번 대조하고, 없으면 안 쓴다.
 *   베껴 적으면 이 파일이 또 하나의 «두 벌»이 된다(LETTER_MIRROR 가 생긴 이유).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (r) => path.join(ROOT, r);
const WRITE = process.argv.includes('--write');
const VOICE = '우성';

const man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const clip = man.clips.find((c) => c.file === 'parents-letter');
if (!clip) { console.log('✗ 대장에 parents-letter 가 없다'); process.exit(2); }
const S = clip.sents.map((s) => s.text);

/* 새로 받는 9문장 — 장 번호 두 줄은 차례가 바뀌어 새로 필요하고, 일곱 줄은 화면에만 있던 것이다 */
const NEW_LABEL_1 = '하나, 갖출 것은 갖춘 예식.';
const NEW_LABEL_2 = '둘, 인원을 절제하는 이유.';
const NEW_BODY = [
  '예식의 순서는 두 분이 직접 정하십니다.',
  '그 가운데 부모님께 감사를 전하는 자리가 있어, 큰절을 올리거나 꽃을 전하고 포옹하는 방식 가운데 하나를 고르십니다.',
  '별도의 폐백 순서는 두지 않습니다.',
  '오신 분들의 식사 자리도 함께 준비해 드립니다.',
  '맛과 주차, 자리의 조용함까지 저희가 확인한 인근 식당을 안내해 드리고, 예약이 어려운 곳은 디렉터가 대신 움직입니다.',
  '웨딩홀처럼 인원을 미리 보증하지 않습니다.',
  '오지 않으신 분의 몫까지 치르는 일이 없습니다.',
];

/* ★새 본문 7문장이 화면에 정말 있는지 — 태그는 «공백 없이» 지운다(LETTER_MIRROR 와 같은 함정) */
const flat = fs.readFileSync(P('parents.html'), 'utf8')
  .replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
const miss = NEW_BODY.filter((t) => !flat.includes(t));
if (miss.length) { console.log('✗ 화면에 없는 문장을 새로 넣으려 한다 — 화면을 먼저 보라:'); miss.forEach((m) => console.log('   ' + m)); process.exit(1); }

/* A판 = 지금 소리 그대로 */
const A = S.slice();

/* B판 = 화면 차례. 숫자는 «대장의 문장 자리»다 */
const B = [
  ...[0, 1, 2, 3, 4, 5, 6].map((i) => S[i]),
  NEW_LABEL_1,
  ...[14, 15].map((i) => S[i]),
  ...NEW_BODY,
  ...[16, 17, 18, 19].map((i) => S[i]),
  NEW_LABEL_2,
  ...[8, 9, 10, 11, 12].map((i) => S[i]),
  ...[20, 21, 22, 23].map((i) => S[i]),
  ...[24, 25, 26, 27, 28].map((i) => S[i]),
  ...[29, 30, 31, 32, 33, 34, 35, 36, 37, 38].map((i) => S[i]),
];

/* ★자리를 빠뜨리지 않았나 — 7·13(옛 장 번호)만 빠지고 나머지는 «한 번씩» 들어가야 한다 */
const used = new Set();
[[0, 1, 2, 3, 4, 5, 6], [14, 15], [16, 17, 18, 19], [8, 9, 10, 11, 12],
 [20, 21, 22, 23], [24, 25, 26, 27, 28], [29, 30, 31, 32, 33, 34, 35, 36, 37, 38]]
  .flat().forEach((i) => { if (used.has(i)) { console.log('✗ 자리 ' + i + ' 를 두 번 썼다'); process.exit(1); } used.add(i); });
const dropped = S.map((_, i) => i).filter((i) => !used.has(i));
if (dropped.join(',') !== '7,13') { console.log('✗ 빠진 자리가 7,13 이 아니다 — ' + dropped.join(',')); process.exit(1); }
if (B.length !== S.length - 2 + 9) { console.log('✗ B판 문장 수가 안 맞는다 — ' + B.length); process.exit(1); }

const body = (arr) => arr.map((t) => `${VOICE}: ${t}`).join('\n') + '\n';
const outA = P('docs/plans/식순연구/타입캐스트/어른께_A_지금차례.txt');
const outB = P('docs/plans/식순연구/타입캐스트/어른께_B_화면차례.txt');

console.log(`[PARENTS_AB] A판 ${A.length}문장 · B판 ${B.length}문장 (새로 받는 것 9 · 빠지는 옛 장 번호 2)`);
console.log(`  A 하나 → ${S[7]}`);
console.log(`  B 하나 → ${NEW_LABEL_1}`);
if (!WRITE) { console.log('  (안 씀 · --write 로 실제 반영)'); process.exit(0); }
fs.writeFileSync(outA, body(A));
fs.writeFileSync(outB, body(B));
console.log('  썼다: ' + path.relative(ROOT, outA));
console.log('  썼다: ' + path.relative(ROOT, outB));
