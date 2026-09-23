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

/* ★★[EAR_DECIDED 2026-09-19] «아직 답을 못 넣었다»와 «답하지 않기로 정했다»를 가른다.
   ROUND_FREE(사장님 지시) 로 인사 돌기의 시간·이탈 안내를 뺐다. 그 둘이 답하던 칸이 이 둘이다.
   ★검사를 초록으로 만들려고 끄는 것이 아니다 — 아래 EAR_DECIDED 가 «도로 생기는 것»도 잡는다.
   ★되살리려면 ROUND_FREE 지시부터 뒤집어야 한다. 여기만 지우면 안 된다. */
const ROUND_FREE = 'ROUND_FREE 2026-09-19 사장님 지시 「처음 여는 멘트만 · 중간 20 남았다 이런 거 빼고」';

console.log('\n③ 하객이 궁금할 것에 답이 있는가');
const ALL = cues.map((c) => c.text).join(' ');
for (const [q, re, why] of [
  /* ★★[SEAT_HELP 2026-09-21] 「찾기 어려우시면」을 더한다 — «자리를 못 찾다»만 보던 자였다.
     코워크가 일부러 바꾼 말이다: 「못 찾으시면」은 손님 탓으로 들리고 「찾기 어려우시면」은 아니다.
     ★[TIME_STAIR] 와 같은 종류다 — 검사가 낱말을 붙들면 «더 나은 말»로 못 간다.
       재는 것은 «자리를 못 찾은 사람이 어디로 가면 되는지 아는가» 하나다. */
  ['자리를 못 찾으면', /자리를 못 찾|자리 찾기가 어려|찾기 어려우시면|입구 쪽에서 안내|입구에서 도와/],
  ['먹을 것이 있나', /핑거 푸드|음료/],
  /* ★★[EAR_WHAT_NOT_HOW 2026-09-20] 이 줄은 «어형»을 지키고 있었다 — 「분 뒤 시작」·「분 전입니다」.
     하객이 같은 정보를 세 번 듣는데 세 번 다 다른 꼴이라 코워크가 문형을 맞췄고, 그 순간 이 검사가 빨개졌다.
     ★[G8_OUT_SPLIT] 이 이미 답을 내놓은 자리다 — «형태»를 지키던 검사가 틀렸던 것이지 글이 틀린 게 아니다.
     재는 것은 «언제 시작하는지 하객이 아는가» 하나다. 「십 분쯤 뒤에 시작합니다」든 「곧 시작하겠습니다」든
     그 말을 하면 통과하고, 시작 시점을 아예 안 알려 주면 그때 붉어진다. */
  /* ★★[TIME_STAIR 2026-09-21] 「남았」을 더한다 — «얼마 남았다»도 «언제 시작하나»의 답이다.
     실측으로 잡았다: 03c 「저희 예식까지 오 분 남았어요」가 이 자에 **안 걸렸다.**
     전체 검사는 02c·04c 가 덮어 초록이었다 — «어딘가 답이 있다»와 «이 줄이 답을 한다»는 다른 문장이다.
     ★규칙이 아니라 **어휘**를 넓힌 것이다. 여전히 시각을 아예 안 알리면 붉어진다(반증 확인함). */
  ['언제 시작하나', /(분|곧)[^.!?]{0,8}시작|시작[^.!?]{0,8}분 (전|뒤)|분[^.!?]{0,4}남았/],
  /* ★[PHOTO_OK 2026-09-23] 「마음껏 남겨 주셔도」를 더한다 — 「사진은 편히」만 보던 자였다.
     [TIME_STAIR]·[SEAT_HELP] 와 같은 종류다. 재는 것은 «사진을 찍어도 되는지 아는가» 하나다. */
  ['사진 찍어도 되나', /찍으셔도|마음껏 찍|사진은 편히|사진은 마음껏|남겨 주셔도/],
  ['휴대폰은', /휴대폰/],
  ['얼마나 걸리나', /이십 분쯤|분쯤 걸리니/, ROUND_FREE],
  ['자리를 떠도 되나', /자리를 비우|돌아가셔도|편히 계시면/, ROUND_FREE],
  ['언제 끝나나', /마지막|배웅|돌아가시는 길/],
  ['내가 뭘 해야 하나(응답형)', /답해 주시는 순서|하고 답해/],
]) {
  const got = re.test(ALL);
  /* ★★[EAR_DECIDED] 세 번째 상태 — «답이 없다»와 «답을 안 하기로 정했다»는 다른 것이다.
     ★검사를 끄는 것이 아니다. 뒤집어서도 잡는다 — 결정해 비운 칸에 «답이 도로 생기면» 그때 붉어진다.
       폐지한 문장이 슬그머니 되살아나는 것이 이 저장소가 반복해 겪은 사고다(제거 지시 보존 규칙). */
  if (why) console.log(`   ${got ? '✗' : '◦'} ${q} — ${got ? '결정으로 비운 칸인데 답이 도로 생겼다: ' : '결정으로 비움 · '}${why}`);
  else console.log(`   ${got ? '·' : '✗'} ${q}`);
}

console.log('\n④ 하객을 부르는 호칭');
const CALL = { '여러분': 0, '하객 여러분': 0, '하객분들': 0, '모두': 0, '두 분': 0 };
for (const k of Object.keys(CALL)) CALL[k] = ALL.split(k).length - 1;
for (const [k, v] of Object.entries(CALL)) if (v) console.log(`   ${String(v).padStart(2)}회  ${k}`);

console.log('\n⑤ 조건이 맞아야만 나가는 안내 (아니면 그 답이 아예 없다)');
const base = new Set(cues.map((c) => c.slug));
for (const [why, opt] of [['사진 부탁', { photoShare: true }], ['온라인 인사', { digital: true }], ['식사 안내', { meal: true }]]) {   // [MEAL_GUIDE]
  const more = RC.build({ course, ...opt }, { mode: 'console' }).cues.filter((c) => c.text && !base.has(c.slug));
  for (const c of more) console.log(`   ★ ${why} · ${c.slug} — ${sents(c.text)[0].slice(0, 50)}`);
}
