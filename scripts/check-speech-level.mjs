// 한 화자 안에서 말단계가 오락가락하는지 본다 [SPEECH_LEVEL_CHECK]
//
//   node scripts/check-speech-level.mjs [--table]
//
// ★왜 — 2026-09-12 사장님: *"아버지 존대하는거 조금 어색해"*
//   아버님 덕담이 습니다 → 반말 → 습니다 → 반말로 네 번 갈아타고 있었다. 눈으로는 안 보인다 —
//   한 줄씩 읽으면 다 자연스럽고, 이어서 «소리 내어» 읽을 때만 누구에게 말하는지가 흔들린다.
//   그래서 사람 눈이 아니라 코드가 센다.
//
// ★★[의도된 전환은 «한 번»까지 봐준다]
//   어머님은 존대로 하객에게 이야기하다 마지막 한 줄만 딸에게 반말로 돈다. 그건 설계다.
//   흔들림은 «왕복»이다 — 존대→평대→존대. 그래서 전환 «횟수»를 세고, 2회 이상일 때만 잡는다.
//   ★한 번의 전환이 어디서 일어나는지도 찍는다. 그 자리가 옮겨 가면 사람이 봐야 한다.
//
// ★[POLITE_NIDA] 한글은 미리 합쳐진 글자라 「ㅂ니다」로는 「압니다·갑니다·모릅니다」가 안 잡힌다.
//   어미를 열거하지 않고 「니다」·「요」·「십시오」로 끝나는지만 본다 — 열거는 늘 빠뜨린다.
//
// ★[제외] 호명(「하윤아.」·「서준아, 하윤아.」)은 문장이 아니라 부름이라 말단계가 없다.
//   말줄임(「…버거운데.」)도 판정 불가로 두고 센다 — 어느 쪽으로도 억지로 넣지 않는다.
//
// ★종료 코드 0 통과 · 1 왕복 발견
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CAST = path.join(ROOT, 'docs/plans/식순연구/배역_예시_대사.txt');
const TABLE = process.argv.includes('--table');

/* ★[TRAIL_OFF] 말끝을 흐린 줄은 말단계가 «없다» — 종결어미가 아니라 연결어미로 끝난다.
   「저는 아직 저 하나도 버거운데.」가 그것이고, 못 끝낸 문장이 듣는 사람 안에서 끝나라고
   일부러 그렇게 쓴 것이다(LETTER_COST). 이걸 평대로 세면 존대 클립마다 가짜 전환이 잡힌다. */
const TRAIL = /(데|지만|니까)[.…]?$/;
/* ★[ANIDA_TRAP] 「니다」로만 보면 「아니다」가 존대로 잡힌다 — 실제로 아버님 「지는 게 아니다」가
   존대로 세어져 가짜 전환이 났다. 합쇼체의 「-ㅂ니다/-습니다」는 «니» 앞 글자에 ㅂ 받침이 있다
   (압니다·갑니다·습니다). 「아니다」의 «아»에는 받침이 없다. 받침으로 가른다. */
const hasBieup = (c) => { const i = c.charCodeAt(0) - 0xac00; return i >= 0 && i < 11172 && i % 28 === 17; };
const POLITE = (s) => {
  const t = s.replace(/[.?!…]+$/, '');
  if (/(요|십시오)$/.test(t)) return true;
  return /니다$/.test(t) && hasBieup(t[t.length - 3] || '');
};
/* ★평대는 어미를 «열거하지 않는다» — 열거는 늘 빠뜨린다(게·래·해·워·자·마…).
   존대도 흐림도 아닌 채로 한글로 끝나면 평대다. 한국어에서 그 셋이면 남는 게 없다. */
const PLAIN = /[가-힣][.?!…]?$/;
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const isCall = (s) => (syl(s) < 6 && /[아야]\.$/.test(s)) || /^[가-힣]{1,4}(, ?[가-힣]{1,4})+\.$/.test(s);
/* ★[EXCLAIM_SELF] 감탄형 종결(-구나·-군·-네)은 «상대에게 하는 말이 아니다» — 혼잣말이라
   말단계 밖이다. 하객대표 「그때 알았습니다. 아, 이건 다르구나.」가 그 경우다.
   그때 속으로 한 말을 그대로 옮긴 것이라, 이걸 평대로 세면 존대 축사에 가짜 전환이 잡힌다. */
const EXCLAIM = /(구나|군|네)[.?!…]?$/;
const levelOf = (s) => (TRAIL.test(s) || EXCLAIM.test(s) ? '?' : POLITE(s) ? '존대' : PLAIN.test(s) ? '평대' : '?');
/* ★한 줄에 문장이 둘일 수 있다(「지는 게 아니다. 아버지는 … 걸렸다.」). 줄이 아니라 문장으로 센다. */
const sents = (l) => l.split(/(?<=[.?!])\s+/).map((x) => x.trim()).filter(Boolean);

/* ★말단계가 «둘 다» 있어야 의미 있는 클립만 본다 — 낭독이 긴 것들이다.
   짧은 안내 클립은 한 문장뿐이라 전환이 있을 수 없고, 목록에 넣으면 소음만 는다. */
const LONG = /^\[(08|09|10|11|12|13|14|15)\]/;

const lines = fs.readFileSync(CAST, 'utf8').split('\n');
const blocks = [];
for (let i = 0; i < lines.length; i++) {
  if (!LONG.test(lines[i])) continue;
  const head = lines[i];
  const body = [];
  for (let j = i + 1; j < lines.length && lines[j].trim(); j++) body.push(lines[j].trim());
  blocks.push({ head, body });
}

let bad = 0;
console.log(`낭독 클립 ${blocks.length}개 · 한 화자 안의 말단계 왕복을 본다\n`);
for (const b of blocks) {
  const who = b.head.split('·')[1]?.trim() ?? '';
  const no = /^\[(\d+)\]/.exec(b.head)[1];
  const flat = b.body.flatMap(sents);
  const seq = flat.filter((s) => !isCall(s)).map((s) => ({ s, lv: levelOf(s) })).filter((x) => x.lv !== '?');
  let turns = [];
  for (let i = 1; i < seq.length; i++) if (seq[i].lv !== seq[i - 1].lv) turns.push(seq[i]);
  const unk = flat.filter((s) => !isCall(s) && levelOf(s) === '?').length;
  const mark = turns.length === 0 ? 'ok  ' : turns.length === 1 ? 'ok  ' : '✗   ';
  if (turns.length >= 2) bad++;
  console.log(`${mark}[${no}] ${who.padEnd(5)} ${seq.length}문장 · 전환 ${turns.length}회${unk ? ` · 판정불가 ${unk}` : ''}`);
  for (const t of turns) console.log(`       → ${t.lv} 「${t.s}」`);
  if (TABLE) for (const x of seq) console.log(`         ${x.lv} ${x.s}`);
}
if (bad) {
  console.log(`\n✗ 말단계가 왕복하는 클립 ${bad}개 — 누구에게 말하는지가 줄마다 바뀝니다.`);
  console.log('  전환 1회는 설계입니다(어머님: 하객에게 이야기하다 끝에 딸에게). 2회부터가 흔들림입니다.');
  process.exit(1);
}
console.log('\nSPEECH LEVEL OK — 왕복 0건');
