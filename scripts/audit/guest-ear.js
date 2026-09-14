#!/usr/bin/env node
/* 하객 귀로 대본을 듣는다 [GUEST_EAR] (2026-09-12)
 *
 *   node scripts/audit/guest-ear.js [코스]
 *
 * ★왜 — 사장님: *"듣는 청중 하객입장에서 좀더 디테일하게 점검"*
 *   지금까지 잰 것은 «대본의 모양»이었다. 이건 다르다 — 25명 중 한 사람이 되어,
 *   자기가 뭘 듣고 뭘 해야 하는지만 따라간다. 그 사람은 대본을 못 보고 되물을 사람도 없다.
 *
 * 무엇을 보는가:
 *   ①하객에게 «하는 말»과 두 사람 이야기의 비율 — 3인칭만 길게 이어지면 하객은 관객이 된다
 *   ②하객에게 요구하는 «행동»의 총량과 종류 — 25명이 몇 번 움직여야 하는가
 *   ③하객이 궁금할 것에 답이 있는가 — 사진·시간·자리·화장실·끝나는 때
 *   ④하객을 부르는 «호칭»이 흔들리지 않는가
 *   ⑤조건부로만 나가는 안내 — 그 조건이 아닌 예식에서는 «아무 답이 없는» 것
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));

const course = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0] || 'damback';
const sents = (t) => String(t || '').split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);

/* 하객에게 «하는» 말인가 — 2인칭 요청·높임 명령·하객 호칭이 있으면 그렇다 */
const TO_GUEST = /(여러분|하객분들|오신|주시|주세요|드립니다|바랍니다|하셔도|계시면|살펴|앉으|서 주|나오|모여|답해|드시)/;
/* 몸을 움직여야 하는가 */
const MOVE = /(앉아|앉으신|일어|나오|나와|모여|서 주|돌려|붙어|부딪|흔들|들어 주|잔 드|살펴|답해)/;
/* 소리를 내야 하는가 */
const VOICE = /(박수|답해|위하여|네, 그러겠습니다)/;

const cues = RC.build({ course }, { mode: 'console' }).cues.filter((c) => c.text);
console.log(`■ ${D.COURSES[course]?.n || course} — 하객이 듣는 문장만\n`);

let toGuest = 0, toAll = 0;
const moves = [], voices = [];
let coldRun = 0, coldMax = 0, coldAt = null, cur = null;
for (const c of cues) {
  for (const t of sents(c.text)) {
    toAll++;
    if (TO_GUEST.test(t)) {
      toGuest++;
      if (coldRun > coldMax) { coldMax = coldRun; coldAt = cur; }
      coldRun = 0;
    } else { if (!coldRun) cur = c; coldRun++; }
    if (MOVE.test(t)) moves.push([c.blockN, t]);
    if (VOICE.test(t)) voices.push([c.blockN, t]);
  }
}
if (coldRun > coldMax) { coldMax = coldRun; coldAt = cur; }

console.log(`① 하객에게 하는 말 ${toGuest} / 전체 ${toAll}문장 (${Math.round(toGuest / toAll * 100)}%)`);
console.log(`   하객 얘기 없이 두 사람 얘기만 이어지는 최장 ${coldMax}문장 ${coldMax >= 8 ? '★' : ''}`);
if (coldAt) console.log(`     시작: ${coldAt.blockN} · ${coldAt.slug}`);

console.log(`\n② 25명이 몸을 움직여야 하는 자리 ${moves.length}번`);
for (const [b, t] of moves) console.log(`     ${b.padEnd(12)} ${t.slice(0, 56)}`);
console.log(`\n   소리를 내야 하는 자리 ${voices.length}번`);
for (const [b, t] of voices) console.log(`     ${b.padEnd(12)} ${t.slice(0, 56)}`);

console.log('\n③ 하객이 궁금할 것에 답이 있는가');
const ALL = cues.map((c) => c.text).join(' ');
for (const [q, re] of [
  ['자리를 못 찾으면', /자리를 못 찾|입구 쪽에서 안내/],
  ['먹을 것이 있나', /핑거 푸드|음료/],
  ['언제 시작하나', /분 뒤 시작|분 전입니다/],
  ['사진 찍어도 되나', /찍으셔도|마음껏 찍|사진은 편히/],
  ['휴대폰은', /휴대폰/],
  ['얼마나 걸리나', /이십 분쯤|분쯤 걸리니/],
  ['자리를 떠도 되나', /자리를 비우|돌아가셔도|편히 계시면/],
  ['언제 끝나나', /마지막|배웅|돌아가시는 길/],
  ['내가 뭘 해야 하나(응답형)', /답해 주시는 순서|하고 답해/],
]) console.log(`   ${re.test(ALL) ? '·' : '✗'} ${q}`);

console.log('\n④ 하객을 부르는 호칭');
const CALL = { '여러분': 0, '하객 여러분': 0, '하객분들': 0, '모두': 0, '두 분': 0 };
for (const k of Object.keys(CALL)) CALL[k] = ALL.split(k).length - 1;
for (const [k, v] of Object.entries(CALL)) if (v) console.log(`   ${String(v).padStart(2)}회  ${k}`);

console.log('\n⑤ 조건이 맞아야만 나가는 안내 (아니면 그 답이 아예 없다)');
const base = new Set(cues.map((c) => c.slug));
for (const [why, opt] of [['사진 부탁', { photoShare: true }], ['온라인 인사', { digital: true }]]) {
  const more = RC.build({ course, ...opt }, { mode: 'console' }).cues.filter((c) => c.text && !base.has(c.slug));
  for (const c of more) console.log(`   ★ ${why} · ${c.slug} — ${sents(c.text)[0].slice(0, 50)}`);
}
