// ★[PASTE_VOICE] 붙여넣기 파일이 「이미 잘 돌아간 파일」과 같은 모양인지 [2026-08-09]
//
//   node scripts/check-paste-format.mjs
//
// 왜 — 이 파일은 사용자가 타입캐스트에 **그대로 붙여넣는** 것이라, 한 줄만 달라도
//   그 줄이 소리로 읽힌다(실제로 머리말·클립 머리가 읽혀 나왔다). 그리고 화자 이름이 빠지면
//   목소리를 매번 손으로 고르게 된다(그것도 실제로 그렇게 만들었다).
// ★기준을 새로 정하지 않는다 — 이미 잘 돌아간 파트 파일(3_진행_후반.txt)의 모양을 그대로 쓴다.
//   "무엇이 옳은가"를 여기서 다시 정의하면 그 정의가 또 틀린다. 작동하는 실물이 기준이다.
import fs from 'node:fs';
import path from 'node:path';
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(root, 'docs/plans/식순연구/타입캐스트');
const PASTE = path.join(DIR, '재더빙_붙여넣기.txt');
const REF = path.join(DIR, '3_진행_후반.txt');
if (!fs.existsSync(PASTE)) { console.log('· 재더빙_붙여넣기.txt 없음(대기 0클립) — 검사 생략'); process.exit(0); }
const line = /^[가-힣A-Za-z0-9]{1,10}: \S/;              // 「화자: 대사」 — 기준 파일의 모든 줄이 이 꼴이다
const refBad = fs.readFileSync(REF, 'utf8').split('\n').filter((l) => l.trim()).filter((l) => !line.test(l));
if (refBad.length) { console.error(`✗ 기준 파일(3_진행_후반.txt)이 예상 형식과 다릅니다 — 기준을 다시 보세요: ${refBad[0].slice(0, 40)}`); process.exit(1); }
const raw = fs.readFileSync(PASTE, 'utf8').split('\n');
const bad = [];
raw.forEach((l, i) => {
  if (l === '' && i === raw.length - 1) return;          // 끝 줄바꿈은 허용
  if (!l.trim()) { bad.push(`${i + 1}행 빈 줄 — 기준 파일엔 빈 줄이 없습니다`); return; }
  if (l.startsWith('#') || /^\[\d+\]/.test(l)) { bad.push(`${i + 1}행 사람이 읽는 줄이 섞였습니다(타입캐스트가 이것도 읽습니다): ${l.slice(0, 34)}`); return; }
  if (!line.test(l)) bad.push(`${i + 1}행 「화자: 대사」 꼴이 아닙니다 — 화자가 없으면 목소리를 손으로 골라야 합니다: ${l.slice(0, 34)}`);
});
if (bad.length) { bad.slice(0, 6).forEach((b) => console.error('✗ ' + b)); console.error('\nnode scripts/check-text-audio.mjs --redub 로 다시 뽑으세요.'); process.exit(1); }
console.log(`ok 재더빙_붙여넣기.txt — ${raw.filter((l) => l.trim()).length}줄 전부 「화자: 대사」 (기준 파일과 같은 꼴)`);
