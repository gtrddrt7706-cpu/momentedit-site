// 한 대목만 다시 더빙하기 — 붙여넣기 파일 만들기 (CLIP_SUBSET · 2026-08-04)
//
//   node scripts/repatch-clip.mjs --clip entry-            # 입장 나레이션 6클립
//   node scripts/repatch-clip.mjs --clip entry-D           # 「감성·시적」 한 클립만
//   node scripts/repatch-clip.mjs --clip entry-,narr-song  # 여럿
//
// 왜 build-typecast-import.mjs 에 붙이지 않았나
//   그 스크립트는 대본 전체를 읽어 manifest.json을 **통째로 다시 쓴다**. 거기에 「부분만」 옵션을
//   붙이면 부분만 담긴 대장이 전체 대장을 덮어쓰는 날이 온다. 대장이 부서지면 이미 만들어 둔
//   66클립이 전부 자기 자리를 잃는다. 그래서 이 스크립트는 manifest를 **읽기만 한다**.
//   ★고치는 도구와 다시 쓰는 도구를 한 손잡이에 두지 않는다.
//
// 하는 일
//   ① manifest에서 --clip 에 해당하는 클립만 골라
//   ② 파트별로 `화자: 문장` 한 줄씩 붙여넣기 txt를 쓰고 (주석 한 줄 없음 · PASTE_NO_COMMENT)
//   ③ 받아 온 뒤 무엇을 치면 되는지 알려 준다.
// 고르는 규칙은 assemble-narration.mjs 와 같은 파일(clip-select.mjs)을 쓴다.

import fs from 'node:fs';
import path from 'node:path';
import { selectClips } from './clip-select.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(root, 'docs/plans/식순연구/타입캐스트');
const MAN = path.join(DIR, 'manifest.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const CLIPS = arg('--clip', '');
const NAME = arg('--name', '');

if (!fs.existsSync(MAN)) { console.error('✗ manifest.json이 없습니다. node scripts/build-typecast-import.mjs 먼저 돌리세요.'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));

if (!CLIPS) {
  console.log('한 대목만 다시 더빙할 때 쓰는 도구입니다. --clip 으로 어느 대목인지 알려 주세요.\n');
  const byPart = {};
  for (const c of man.clips) (byPart[c.part] ||= []).push(c);
  for (const [p, cs] of Object.entries(byPart)) {
    console.log(`  ${p}`);
    for (const c of cs) console.log(`    ${c.file.padEnd(26)} ${c.no}_${c.file}.mp3  ${String(c.sents.length).padStart(2)}문장  ${c.label || ''}`);
  }
  console.log('\n  예) 입장 나레이션 6개 → node scripts/repatch-clip.mjs --clip entry-');
  process.exit(0);
}

const sel = selectClips(man.clips, CLIPS);
if (!sel.length) {
  console.error(`✗ --clip ${CLIPS} 에 맞는 클립이 없습니다. 인자 없이 돌리면 있는 클립을 전부 보여 줍니다.`);
  process.exit(1);
}

const slug = NAME || CLIPS.replace(/[^0-9A-Za-z가-힣_-]+/g, '_').replace(/^[_-]+|[_-]+$/g, '') || 'clip';
const parts = [...new Set(sel.map((c) => c.part))];
const made = [];

for (const pf of parts) {
  const cs = sel.filter((c) => c.part === pf);
  const spk = [...new Set(cs.map((c) => man.voice?.[c.role] || c.role))];
  const lines = [];
  for (const c of cs) for (const s of c.sents) lines.push(`${man.voice?.[c.role] || c.role}: ${s.text}`);
  const fn = `재더빙_${slug}${parts.length > 1 ? '_' + pf.replace(/\.txt$/, '') : ''}.txt`;
  fs.writeFileSync(path.join(DIR, fn), lines.join('\n') + '\n', 'utf8');
  made.push({ fn, pf, cs, spk, n: lines.length });
}

console.log(`✓ 붙여넣기 파일 ${made.length}개를 만들었습니다 — docs/plans/식순연구/타입캐스트/\n`);
for (const m of made) {
  console.log(`  ${m.fn}`);
  console.log(`    원래 파트  ${m.pf}  (전체 중 이 ${m.cs.length}클립만 다시 만듭니다)`);
  console.log(`    화자       ${m.spk.join(' · ')}`);
  console.log(`    줄 수      ${m.n}줄 = 문장별 분리로 받을 파일 개수`);
  for (const c of m.cs) console.log(`      ${c.no}_${c.file}.mp3  ${String(c.sents.length)}문장  ${c.label || ''}  → ${c.dir || 'assets/audio/narration'}/`);
}

console.log(`
  ── 그다음 ──
  ① 타입캐스트에서 새 프로젝트 → 「대본 가져오기 → 텍스트 붙여넣기」에 위 파일을 통째로 붙여넣기
  ② 화자 이름이 줄마다 적혀 있어 자동 배정됩니다 — 손으로 고를 것 없습니다
  ③ 다운로드는 반드시 **문장별 분리** (${made.map((m) => m.n).join(' + ')}개 파일이 나옵니다)
  ④ 받은 zip이나 폴더를 아무 이름으로든 한 곳에 모아 두고:
       node scripts/assemble-narration.mjs --in <그 폴더> --clip ${CLIPS}
  ⑤ 위에 적힌 mp3만 덮어씁니다. 같은 파트의 나머지 클립은 손대지 않습니다.

  ★--clip 을 빠뜨리면 파트 전체 문장 개수를 기대하다 멈춥니다(조용히 틀리지는 않습니다).`);
