// ★[PASTE_VOICE] 붙여넣기 파일이 「이미 잘 돌아간 파일」과 같은 모양인지 [2026-08-09]
//
//   node scripts/check-paste-format.mjs
//
// 왜 — 이 파일은 사용자가 타입캐스트에 **그대로 붙여넣는** 것이라, 한 줄만 달라도
//   그 줄이 소리로 읽힌다(실제로 머리말·클립 머리가 읽혀 나왔다). 그리고 화자 이름이 빠지면
//   목소리를 매번 손으로 고르게 된다(그것도 실제로 그렇게 만들었다).
// ★기준을 새로 정하지 않는다 — 이미 잘 돌아간 파트 파일(3_진행_후반.txt)의 모양을 그대로 쓴다.
//   "무엇이 옳은가"를 여기서 다시 정의하면 그 정의가 또 틀린다. 작동하는 실물이 기준이다.
//
// ★★[EXIT_AT_END 2026-08-09 · 코드 세션 처방] 결론은 **맨 끝 한 곳**에서만 낸다.
//   중간에 exit 하면, 그 뒤에 검사를 덧붙인 사람의 블록이 종료코드에 못 닿는다.
//   실제로 그 일이 났다 — check-corr-claim.mjs 에서 내가 붙인 블록이 중간 exit 뒤라
//   화면엔 ✗ 를 찍고도 exit 0 이었다. 사람이 "여기 뒤에 붙이면 안 된다"를 기억해야 하는
//   구조를 남기지 않는다. 이 파일 어디에 무엇을 덧붙여도 자동으로 결론에 닿는다.
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(root, 'docs/plans/식순연구/타입캐스트');
const PASTE = path.join(DIR, '재더빙_붙여넣기.txt');
const REF = path.join(DIR, '3_진행_후반.txt');
const LIST = path.join(DIR, '재더빙_리드보강.txt');

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
const line = /^[가-힣A-Za-z0-9]{1,10}: \S/;              // 「화자: 대사」 — 기준 파일의 모든 줄이 이 꼴이다

/* 1) 기준 파일이 예상 형식인가 — 기준이 무너졌으면 그것부터 말한다 */
{
  const refBad = fs.readFileSync(REF, 'utf8').split('\n').filter((l) => l.trim()).filter((l) => !line.test(l));
  if (refBad.length) no(`기준 파일(3_진행_후반.txt)이 예상 형식과 다릅니다 — 기준을 다시 보세요: ${refBad[0].slice(0, 40)}`);
}

/* 2) 붙여넣기 파일 [PASTE_MISSING]
   ★파일이 없을 때 그냥 통과시키면 안 된다. 옛 판은 '없음 — 검사 생략' 으로 exit 0 이었고,
     대기 명단이 「대기 1클립」이라고 말하는데도 초록이 났다(코드 세션 실측).
     세지도 않고 '대기 0클립'이라 단정한 것도 틀린 안심 문구였다.
   ★'없으면 통과'는 늘 조용한 거짓말이 된다 — 유령 기록·대장을 믿던 판정과 같은 병이다. */
const waiting = (() => {
  if (!fs.existsSync(LIST)) return null;                 // 명단조차 없으면 셀 수가 없다
  const m = /^#\s*대기\s*(\d+)\s*클립/m.exec(fs.readFileSync(LIST, 'utf8'));
  return m ? Number(m[1]) : null;
})();

if (!fs.existsSync(PASTE)) {
  if (waiting === null) no('재더빙_붙여넣기.txt 도 재더빙_리드보강.txt 도 없습니다 — 대기 수를 셀 수 없어 통과시키지 않습니다');
  else if (waiting > 0) no(`대기 명단은 ${waiting}클립이라는데 재더빙_붙여넣기.txt 가 없습니다 — node scripts/check-text-audio.mjs --redub 로 다시 뽑으세요`);
  else console.log('· 재더빙_붙여넣기.txt 없음 · 대기 명단도 0클립 — 붙여넣을 것이 없습니다');
} else {
  const raw = fs.readFileSync(PASTE, 'utf8').split('\n');
  const hits = [];
  raw.forEach((l, i) => {
    if (l === '' && i === raw.length - 1) return;         // 끝 줄바꿈은 허용
    if (!l.trim()) { hits.push(`${i + 1}행 빈 줄 — 기준 파일엔 빈 줄이 없습니다`); return; }
    if (l.startsWith('#') || /^\[\d+\]/.test(l)) { hits.push(`${i + 1}행 사람이 읽는 줄이 섞였습니다(타입캐스트가 이것도 읽습니다): ${l.slice(0, 34)}`); return; }
    if (!line.test(l)) hits.push(`${i + 1}행 「화자: 대사」 꼴이 아닙니다 — 화자가 없으면 목소리를 손으로 골라야 합니다: ${l.slice(0, 34)}`);
  });
  hits.slice(0, 6).forEach(no);
  if (!hits.length) console.log(`ok 재더빙_붙여넣기.txt — ${raw.filter((l) => l.trim()).length}줄 전부 「화자: 대사」 (기준 파일과 같은 꼴)`);
}

/* ── 결론은 여기 한 곳에서만 [EXIT_AT_END] ── */
if (bad) { console.error('\nnode scripts/check-text-audio.mjs --redub 로 다시 뽑으세요.'); process.exit(1); }
console.log('PASTE FORMAT OK');
