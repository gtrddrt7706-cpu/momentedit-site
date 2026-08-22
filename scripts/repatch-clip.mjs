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
import { selectClips, selectSents } from './clip-select.mjs';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const DIR = path.join(root, 'docs/plans/식순연구/타입캐스트');
const MAN = path.join(DIR, 'manifest.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const CLIPS = arg('--clip', '');
const SENTS = arg('--sent', '');
const NAME = arg('--name', '');

if (!fs.existsSync(MAN)) { console.error('✗ manifest.json이 없습니다. node scripts/build-typecast-import.mjs 먼저 돌리세요.'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));

// ★★[PASTE_ROLE_SENT 2026-08-21] 화자는 «문장»의 역할에서 찾는다 — 클립의 역할이 아니다.
//   사용자 화면 실물: 타입캐스트가 「신랑|신부 · 대사 9개 · 줄 5, 6, 7 …」 묶음에
//   «보이스를 선택하세요» 만 띄우고 붉게 표시했다. 배정할 캐릭터가 없기 때문이다.
//   왜 — 입장 클립(entry-A·E·F)은 clip.role 이 '신랑|신부' 다. 그건 캐릭터 이름이 아니라
//   «이 클립은 두 사람이 번갈아 읽는다»는 표시이고, 진짜 화자는 sents[i].role 에 신랑/신부로 갈려 있다.
//   그 표시를 그대로 화자로 찍으면 타입캐스트가 배정할 수 없는 이름이 되고, 사람이 손으로 고르는
//   순간 아홉 줄이 통째로 한 사람 목소리가 된다 — 번갈아 읽기가 통째로 사라진다.
//   ★대장 생성기(build-typecast-import.mjs)는 처음부터 문장 역할을 썼다. 이 스크립트만 달랐다.
//     같은 대장을 읽는 두 도구가 서로 다른 답을 내면, 둘 중 하나는 반드시 틀린 파일을 만든다.
//   ★check-entry-alt.mjs 의 ENTRY_PASTE 검사가 이 꼴을 잡는다 — 「입장 17줄을 통째로 든 파일」의
//     화자를 대장과 대조한다. 이 함수를 되돌리면 그 검사가 즉시 붉어진다.
const voiceOf = (c, s) => man.voice?.[s?.role || c.role] || s?.role || c.role;

if (!CLIPS && !SENTS) {
  console.log('한 대목만 다시 더빙할 때 쓰는 도구입니다. --clip 으로 대목을, --sent 로 문장 하나를 짚습니다.\n');
  const byPart = {};
  for (const c of man.clips) (byPart[c.part] ||= []).push(c);
  for (const [p, cs] of Object.entries(byPart)) {
    console.log(`  ${p}`);
    for (const c of cs) console.log(`    ${c.file.padEnd(26)} ${c.no}_${c.file}.mp3  ${String(c.sents.length).padStart(2)}문장  ${c.label || ''}`);
  }
  console.log('\n  예) 입장 나레이션 6개 → node scripts/repatch-clip.mjs --clip entry-');
  console.log('      "신랑 신부, 입장!" 한 마디만 → node scripts/repatch-clip.mjs --sent "신랑 신부, 입장!"');
  process.exit(0);
}

// ── ★★★[SENT_PATCH 2026-08-04] 문장 한 자리만 다시 뽑는다
//   왜 — 사용자 질문: *"문장중 신랑신부 입장 이 문장만 할수는 없는거야?"*
//   같은 문장이 여러 클립에 나오면(입장은 6곳) **한 개만 받아 여섯 자리에 전부 넣는다**.
//   그래서 붙여넣기 파일에는 자리 수(6줄)가 아니라 **서로 다른 문장 수**만 적는다.
//   ★한 번 말한 것을 여섯 번 다시 말하게 하지 않는다 — 여섯 번 뽑으면 억양이 여섯 가지가 된다.
if (SENTS) {
  const pool = CLIPS ? selectClips(man.clips, CLIPS) : man.clips;
  const hits = selectSents(pool, SENTS);
  if (!hits.length) {
    console.error(`✗ --sent "${SENTS}" 에 맞는 문장이 없습니다. 대본과 글자가 같은지 보세요(쉼표·느낌표 포함).`);
    console.error(`  여럿을 고를 땐 쉼표가 아니라 | 로 나눕니다 — 대사 안에 쉼표가 들어 있기 때문입니다.`);
    process.exit(1);
  }
  const uniq = [...new Set(hits.map((x) => x.text))];
  const slug = NAME || SENTS.replace(/[^0-9A-Za-z가-힣]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 24) || 'sent';
  const fn = `재더빙문장_${slug}.txt`;
  const spk = (t) => {
    const h = hits.find((x) => x.text === t);
    return voiceOf(h.clip, h.clip.sents[h.i]);
  };
  fs.writeFileSync(path.join(DIR, fn), uniq.map((t) => `${spk(t)}: ${t}`).join('\n') + '\n', 'utf8');

  const clips = [...new Set(hits.map((x) => x.clip))];
  const partOf = [...new Set(clips.map((c) => c.part))];
  console.log(`✓ ${fn} — docs/plans/식순연구/타입캐스트/\n`);
  console.log(`  서로 다른 문장  ${uniq.length}개 = 받을 파일 개수`);
  console.log(`  들어갈 자리     ${hits.length}곳`);
  for (const x of hits) console.log(`    ${x.clip.no}_${x.clip.file}  ${x.i + 1}/${x.clip.sents.length}번째  "${x.text}"`);
  console.log(`  다시 붙일 클립  ${clips.length}개 (${partOf.join(' · ')})`);
  console.log(`
  ── 그다음 ──
  ① 타입캐스트에 위 파일을 붙여넣고 ${uniq.length}개만 받습니다 (${uniq.length === 1 ? '한 개' : uniq.length + '개'}라 분리·통합 아무거나 상관없습니다)
  ② 받은 파일을 아무 폴더에나 두고:
       node scripts/assemble-narration.mjs --in <처음 받은 ${partOf[0].replace(/\.txt$/, '')} 원본 폴더> --sent "${SENTS}" --patch <새로 받은 폴더>
  ③ 위 ${clips.length}개 클립만 다시 붙여 덮어씁니다. 나머지 문장은 원본 그대로입니다.

  ★--in 은 **처음 받은 그 파트 전체 원본**입니다(부분집합 아님). 나머지 문장을 거기서 가져오기 때문입니다.
  ★원본을 잃어버렸다면 문장 단위 교체가 안 됩니다 — 그땐 --clip 으로 대목 전체를 다시 받아야 합니다.`);
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
  const spk = [...new Set(cs.flatMap((c) => c.sents.map((s) => voiceOf(c, s))))];
  const lines = [];
  for (const c of cs) for (const s of c.sents) lines.push(`${voiceOf(c, s)}: ${s.text}`);
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
