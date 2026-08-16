// 소리 안에 **대본만큼의 문장이 실제로 들어 있는가** [AUDIO_SENTS]
//
//   node scripts/check-audio-sents.mjs           재기만
//   node scripts/check-audio-sents.mjs --redub   빠진 문장의 재더빙 대본을 뽑는다
//
// ★왜 만들었나 — 2026-08-16 사용자가 귀로 잡았다
//   *"아래쪽 대사는 나레이션이 안 입혀졌나 오디오가 안 들리는데?"*
//   `11_narr-welcome-in` 은 대본이 두 문장인데 **소리에는 한 문장만 있다.**
//   두 번째 문장(「마이크가 전해지면, 편하게 시작하시면 됩니다」)이 통째로 빠져 있었다.
//
// ★왜 지금까지 아무도 못 잡았나 — 검사들이 **글끼리만** 대조했다
//   `check-text-audio` 는 manifest(화면 글) ↔ `_recorded.json`(녹음한 글)을 본다. 둘 다 두 문장이다.
//   그러니 초록이다. **소리 자체를 센 검사가 없었다.**
//   ★교훈: 「A 와 B 가 같다」를 아무리 촘촘히 검사해도, 둘 다 C(실물)와 다르면 소용이 없다.
//
// ★어떻게 세나 — 조립기가 **넣은** 무음을 센다
//   assemble-narration 은 문장 사이에 manifest 가 정한 값(after+before)만큼 무음을 넣는다.
//   그러니 「설계 쉼의 70% 이상인 안쪽 무음」의 개수 + 1 = 소리에 들어 있는 문장 수다.
//   말속도로도 받친다 — 전 문장을 그 시간에 읽으면 초당 몇 음절이 되는지(한국어 한계 8~9).
//
// ★★[CANT_HEAR] 나는 소리를 못 듣는다. 그래서 「무슨 말이 빠졌다」가 아니라
//   **「문장 수가 모자란다」**만 말한다. 어느 문장인지는 순서로 추정하고, 확인은 사람 귀가 한다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함(ffmpeg 없음)
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { blockFit, RATE_LO, RATE_HI, RATE_MID } from './lib/sent-bounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const REDUB = process.argv.includes('--redub');
if (spawnSync('ffprobe', ['-version']).error) { console.error('✗ ffprobe 가 없다 — 소리를 못 재면 통과시키지 않는다'); process.exit(2); }

const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const syl = (s) => (String(s).match(/[가-힣]/g) || []).length;
const srcOf = (c) => ['narration', 'cast']
  .map((d) => path.join(ROOT, 'assets/audio', d, `${c.no}_${c.file}.mp3`)).find((p) => fs.existsSync(p)) || '';

const RATE_MAX = 9.5;      // 한국어 말속도 상한(이 저장소 실측 중앙값 6.8)
/* ★★[BLOCK_FIT 2026-08-16] 「덩어리마다」 말속도를 본다 — 클립 전체 평균으로는 못 잡는다.
   ─ 사용자가 또 귀로 잡았다: *"근데 나레이션 멘트랑 문구가 다른데 왜 그래?"* (13_narr-vow-in)
   ─ 옛 잣대가 왜 놓쳤나: 그 클립은 대본 3문장인데 소리 덩어리가 2개다. 그런데 **전체** 말속도가
     초당 7.7음절이라 상한 9.5 밑이다 → "경계는 안 보여도 시간은 충분하다"로 통과했다.
     시간이 충분한 것은 **문장 하나가 빠졌기 때문**이었다. 평균은 그 사실을 지운다.
   ─ 새 잣대: 대본 n문장을 소리 덩어리 B개에 **차례대로** 나누는 모든 방법을 훑어,
     덩어리마다 초당 음절이 사람 범위(3.5~9.0)에 드는 배분이 **하나라도** 있는지 본다.
       하나라도 있으면 → 붙여 읽은 것일 수 있다. 통과시킨다(못 잡는 쪽으로 틀린다).
       하나도 없으면  → 그 소리로는 대본을 다 읽을 수 없다 = 문장이 빠진 것이다.
   ─ ★어느 문장이 빠졌는지도 이 자로 고른다. 옛 판은 **꼬리부터 빠진다고 단정**했는데
     13_narr-vow-in 은 **가운데**(「두 분, 서로를 마주 보아 주세요.」)가 빠졌다.
     그대로 뒀으면 3번 문장을 다시 받아 끝에 붙여 「1 · 3 · 3」이 되는 소리를 만들 뻔했다.
   ★[CANT_HEAR] 는 그대로다 — 「이 배분이 가장 그럴듯하다」까지가 기계의 말이다. 확인은 귀가 한다. */
const bad = [];
let seen = 0;

for (const c of man.clips) {
  const id = `${c.no}_${c.file}`;
  if (c.mix) continue;                       // 합성 클립은 재료에서 만든다
  const f = srcOf(c); if (!f) continue;
  const n = (c.sents || []).length; if (n < 2) continue;
  seen++;

  /* ★[BLOCK_FIT] 재는 자는 lib/sent-bounds.mjs 한 곳에 있다 — 실청 화면도 같은 자를 쓴다.
     자를 두 벌 만들면 언젠가 둘이 다른 말을 하고, 그때 어느 쪽을 믿을지 아무도 모른다 [ONE_SPEC]. */
  const r = blockFit(f, c.sents);
  if (!r || r.ok) continue;                  // 못 쟀거나 · 사람 속도로 설명되는 배분이 있다

  const g = r.guess;
  const all = c.sents.reduce((a, x) => a + syl(x.text), 0);
  bad.push({ id, n, heard: r.blocks.length, role: c.role || '진행',
    rate: +(all / r.blocks.reduce((a, b) => a + b, 0)).toFixed(1),
    blocks: r.blocks.map((x) => +x.toFixed(2)), sy: r.sy,
    /* g 가 없거나 tie 면 «어느 것인지»를 못 정한 것이다 — 그때는 아무것도 지목하지 않는다.
       모르는 것을 아는 척하면, 엉뚱한 문장을 다시 받아 엉뚱한 자리에 붙인다. */
    fitRates: (g && g.rates) ? g.rates : null,
    tie: (g && g.tie) ? g.tie.map((x) => x.map((k) => k + 1)) : null,
    missing: (g && g.drop) ? g.drop.map((k) => String(c.sents[k].text).trim()) : [],
    missingAt: (g && g.drop) ? g.drop.map((k) => k + 1) : [] });
}

console.log(`잰 클립 ${seen}개 (문장 2개 이상 · 합성 제외)`);
if (!bad.length) { console.log('\n✓ 소리에 대본만큼의 문장이 다 들어 있습니다.'); process.exit(0); }

console.log(`\n✗ 소리에 문장이 모자란 클립 ${bad.length}개`);
bad.forEach((b) => {
  console.log(`\n  [${b.id}] 대본 ${b.n}문장 · 소리 덩어리 ${b.heard}개`);
  console.log(`    덩어리 길이 ${b.blocks.join('s · ')}s · 문장 음절 ${b.sy.join(' · ')}`);
  console.log(`    ${b.n}문장을 ${b.heard}덩어리에 나누는 어떤 방법도 사람 속도(초당 ${RATE_LO}~${RATE_HI})가 안 된다 [BLOCK_FIT]`);
  if (b.missing.length) {
    console.log(`    빼고 맞춰 보면 → 남는 문장이 초당 ${b.fitRates.join(' · ')}음절 (또래 ${RATE_MID})`);
    b.missing.forEach((t, i) => console.log(`    ★빠진 것으로 보임: ${b.missingAt[i]}번째 "${t}"`));
  } else if (b.tie) {
    console.log(`    ★어느 문장인지는 못 정했다 [GUESS_TIE] — ${b.tie.map((x) => x.join('·') + '번째').join(' 와 ')} 가 거의 같은 점수다`);
    console.log('       지목하지 않는다. 형제 클립이 같은 문장을 빼먹었는지 보고, 확인은 귀로 해 주세요.');
  } else console.log('    ★어느 문장인지는 못 정했다 — 지목하지 않는다(모르는 것을 아는 척하면 엉뚱한 자리에 붙인다)');
});
console.log('\n★[CANT_HEAR] 나는 소리를 못 듣는다 — 「이 배분이 가장 그럴듯하다」까지가 기계가 말할 수 있는 것이다.');
console.log('   확인은 귀로 해 주세요. ★빠진 자리가 꼬리가 아니면 이어 붙이기(patch-clip-sent)로는 못 고칩니다.');

if (REDUB) {
  const VOICE = man.voice || {};
  /* ★같은 문장이 두 클립에서 빠졌으면 **한 번만** 받는다(22·23 이 그렇다).
     두 번 받으면 같은 말이 두 소리가 되고, 어느 것을 어디 붙였는지 나중에 아무도 모른다.
     ★대신 「어느 클립에 쓰는지」를 옆 명단에 적는다 — 조용히 접으면 그것도 유실이다. */
  const out = [], seenT = new Map();
  bad.forEach((b) => { const v = VOICE[b.role]; if (!v) { console.error(`  · 화자를 못 정해 뺐다: ${b.id} (${b.role})`); return; }
    b.missing.forEach((t) => { const k = v + ': ' + t;
      if (seenT.has(k)) { seenT.get(k).push(b.id); return; }
      seenT.set(k, [b.id]); out.push(k); }); });
  const p = path.join(DIR, '재더빙_빠진문장.txt');
  fs.writeFileSync(p, out.join('\n') + '\n');
  const lp = path.join(DIR, '재더빙_빠진문장_명단.txt');
  fs.writeFileSync(lp, ['# [AUDIO_SENTS] 소리에서 빠진 문장 — 어느 클립에 붙일 것인지',
    `# 붙여넣을 파일은 옆 「재더빙_빠진문장.txt」 (${out.length}문장 · 머리말 없음)`,
    '# 같은 문장이 여러 클립에 쓰이면 한 번만 받아 나눠 붙입니다.', '',
    ...out.map((k, i) => `[${i + 1}] ${k}\n     → ${seenT.get(k).join(' · ')}`)].join('\n') + '\n');
  console.log(`\n→ 뽑았다: ${path.relative(ROOT, p)} (${out.length}문장) + 명단`);
  console.log('   타입캐스트에 통째로 붙여넣고, 받은 wav 는 폴더째 주세요.');
  out.forEach((k, i) => console.log(`   [${i + 1}] ${k}  → ${seenT.get(k).join(' · ')}`));
}
process.exit(1);
