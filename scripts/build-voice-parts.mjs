// 성우 한 명이 «자기 대사만» 한 번에 받는 대본을 만든다 [BY_VOICE]
//
//   node scripts/build-voice-parts.mjs           무엇이 몇 줄인지만 본다
//   node scripts/build-voice-parts.mjs --write   docs/plans/식순연구/타입캐스트/성우별/ 에 쓴다
//
// ★왜 파트가 아니라 성우인가 — 2026-09-06 사장님 지시
//   *"성우별로 전부 다시 정리된 내용으로 더빙 해보는게 좋을거같아"*
//   종전 파트 파일(1_안내·2_진행_전반…)은 «식 순서»로 잘려 있어 한 파일에 여러 목소리가 섞인다.
//   타입캐스트는 붙여넣은 덩어리에 화자를 하나씩 배정하므로, 섞인 파일은 사장님이
//   줄마다 목소리를 바꿔 줘야 한다. 성우로 자르면 파일 하나 = 화자 하나 = 클릭 한 번이다.
//
// ★[MIXED_BY_SENT] 신랑·신부가 번갈아 읽는 클립은 문장마다 role 이 따로 있다.
//   클립 role('신랑|신부')이 아니라 «문장 role»로 가른다. 클립으로 가르면
//   한 사람이 상대 대사까지 읽게 된다.
//
// ★[RETIRED_OUT] 폐지한 클립은 넣지 않는다. 정본은 assets/ritual-cue.js 의 RETIRED 다.
//   안 나갈 소리를 받으면 그만큼 사장님 시간과 타입캐스트 글자수가 사라진다.
//
// ★[ORDER_BACK] 받은 wav 를 제자리에 돌려놓으려면 «몇 번째 줄이 어느 클립 몇 번째 문장인가»가
//   있어야 한다. 사람이 기억할 수 없으므로 같은 실행에서 _성우별_순서.json 에 적어 둔다.
//   타입캐스트는 파일명을 내용으로 짓지만 순번을 앞에 붙여 준다 — 그 순번이 이 표의 줄번호다.
//
// ★종료 코드 0 정상 · 2 원천을 못 읽음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const MAN = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json');
const CUE = path.join(ROOT, 'assets/ritual-cue.js');
const OUT = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/성우별');

let man, cue;
try { man = JSON.parse(fs.readFileSync(MAN, 'utf8')); cue = fs.readFileSync(CUE, 'utf8'); }
catch { console.log('원천을 못 읽었다 (manifest.json · ritual-cue.js)'); process.exit(2); }

// 폐지 명단 — ritual-cue.js 의 RETIRED 블록에서 그대로 읽는다(여기 다시 적지 않는다)
const blk = /RETIRED\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(cue);
const RETIRED = new Set(blk ? [...blk[1].matchAll(/'([^']+)'\s*:\s*1/g)].map((m) => m[1]) : []);

// 배역 이름 → 성우 이름 (build-typecast-import.mjs 의 DEFAULT_VOICE 가 원천)
const imp = fs.readFileSync(path.join(ROOT, 'scripts/build-typecast-import.mjs'), 'utf8');
const vblk = /const DEFAULT_VOICE = \{([\s\S]*?)\n\};/.exec(imp);
const VOICE = Object.fromEntries(
  [...(vblk ? vblk[1] : '').matchAll(/^\s*([가-힣|]+):\s*'([^']+)'/gm)].map((m) => [m[1], m[2]]),
);

const byVoice = new Map();
for (const c of man.clips) {
  if (RETIRED.has(c.file)) continue;
  /* ★[MIX_MADE 2026-09-06] 합성 클립은 받지 않는다 — 26_vow-both 는 24·25 를 겹쳐 만든다.
     여기 넣으면 같은 두 문장을 한 번 더 받게 되고, 그 소리는 어디에도 안 쓰인다.
     (그래서 이 클립만 문장 role 이 없다 — 재료 쪽에 있다.) */
  if (c.mix) continue;
  for (const s of c.sents) {
    const role = s.role || c.role;          // [MIXED_BY_SENT] 문장 role 이 먼저다
    const v = VOICE[role];
    if (!v) { console.log(`★배역 '${role}' 의 성우를 모른다 (${c.no}_${c.file})`); process.exit(2); }
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v).push({ voice: v, role, clip: `${c.no}_${c.file}`, i: s.i, text: s.text });
  }
}

const order = {};
const rows = [...byVoice.entries()].sort((a, b) => b[1].length - a[1].length);
for (const [v, list] of rows) {
  order[v] = list.map((x, n) => ({ n: n + 1, clip: x.clip, i: x.i, role: x.role, text: x.text }));
  const clips = new Set(list.map((x) => x.clip)).size;
  console.log(`  ${v.padEnd(6)} ${String(list.length).padStart(4)}줄  ${String(clips).padStart(3)}클립  (${[...new Set(list.map((x) => x.role))].join('·')})`);
}
console.log(`  ${'합계'.padEnd(6)} ${String(Object.values(order).reduce((a, b) => a + b.length, 0)).padStart(4)}줄  · 폐지 ${RETIRED.size}클립 제외`);

if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }
fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));   // 옛 판이 남아 헷갈리지 않게
for (const [v, list] of rows) {
  fs.writeFileSync(path.join(OUT, `${v}.txt`), list.map((x) => x.text).join('\n') + '\n');
}
fs.writeFileSync(path.join(OUT, '_성우별_순서.json'), JSON.stringify(order, null, 1));
fs.writeFileSync(path.join(OUT, 'README.md'),
  ['# 성우별 대본 (자동 생성 · 손으로 고치지 마세요)', '',
   '`node scripts/build-voice-parts.mjs --write` 가 만듭니다. 문안을 고치려면',
   '`assets/ritual-data.js`(나레이션) · `docs/plans/식순연구/배역_예시_대사.txt`(배역)부터 고치고',
   '`build-dubbing-script` → `build-typecast-import --write` → 이 스크립트 순으로 다시 뽑으세요.', '',
   '## 쓰는 법',
   '파일 하나 = 화자 하나입니다. 타입캐스트에서 그 성우를 고르고 파일을 통째로 붙여넣으면 됩니다.',
   '주석도 제목도 없이 대사만 들어 있습니다.', '',
   '## 받은 wav 를 되돌리는 표',
   '`_성우별_순서.json` 이 줄번호 → 클립·문장 자리를 들고 있습니다.',
   '타입캐스트가 파일명 앞에 붙이는 순번이 그 줄번호입니다.', '',
   '| 성우 | 배역 | 줄 |', '|---|---|---|',
   ...rows.map(([v, l]) => `| ${v} | ${[...new Set(l.map((x) => x.role))].join(' · ')} | ${l.length} |`),
  ].join('\n') + '\n');
console.log(`\n썼다: ${path.relative(ROOT, OUT)}/ · 파일 ${rows.length + 2}개`);
