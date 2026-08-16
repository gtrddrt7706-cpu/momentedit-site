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
import { durOf, silences } from './lib/sent-bounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const REDUB = process.argv.includes('--redub');
if (spawnSync('ffprobe', ['-version']).error) { console.error('✗ ffprobe 가 없다 — 소리를 못 재면 통과시키지 않는다'); process.exit(2); }

const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const syl = (s) => (String(s).match(/[가-힣]/g) || []).length;
const srcOf = (c) => ['narration', 'cast']
  .map((d) => path.join(ROOT, 'assets/audio', d, `${c.no}_${c.file}.mp3`)).find((p) => fs.existsSync(p)) || '';

const RATE_MAX = 9.5;      // 한국어 말속도 상한(이 저장소 실측 중앙값 6.8)
const bad = [];
let seen = 0;

for (const c of man.clips) {
  const id = `${c.no}_${c.file}`;
  if (c.mix) continue;                       // 합성 클립은 재료에서 만든다
  const f = srcOf(c); if (!f) continue;
  const n = (c.sents || []).length; if (n < 2) continue;
  const d = durOf(f); if (!isFinite(d)) continue;
  seen++;

  const seg = silences(f, d);
  const head = (seg.length && seg[0][0] <= 0.05) ? seg[0][1] : 0;
  const tail = (seg.length && seg[seg.length - 1][1] >= d - 0.06) ? seg[seg.length - 1][0] : d;
  const inner = seg.filter(([s, e]) => s > head + 0.01 && e < tail - 0.01);
  const spoken = (tail - head) - inner.reduce((a, [s, e]) => a + (e - s), 0);
  if (spoken <= 0) continue;

  /* 설계 쉼 — 문장마다 다를 수 있으니 가장 작은 값을 기준으로 본다(가장 너그러운 잣대) */
  const designed = c.sents.slice(0, -1).map((x, k) => (x.after || 0) + (c.sents[k + 1].before || 0));
  const minGap = Math.min(...designed);
  if (!(minGap > 0)) continue;               // 붙여 읽는 클립은 셀 수 없다
  const heard = inner.filter(([s, e]) => (e - s) >= minGap * 0.7).length + 1;
  if (heard >= n) continue;                  // 문장 수가 맞다

  /* 말속도로 받친다 — 전 문장을 이 시간에 읽는 것이 가능한가 */
  const all = c.sents.reduce((a, x) => a + syl(x.text), 0);
  const rate = all / spoken;
  if (rate <= RATE_MAX) continue;            // 경계는 안 보여도 시간은 충분하다 → 붙여 읽은 것
  const firstRate = c.sents.slice(0, heard).reduce((a, x) => a + syl(x.text), 0) / spoken;
  bad.push({ id, n, heard, rate: +rate.toFixed(1), firstRate: +firstRate.toFixed(1),
    spoken: +spoken.toFixed(2), role: c.role || '진행',
    missing: c.sents.slice(heard).map((x) => String(x.text).trim()) });
}

console.log(`잰 클립 ${seen}개 (문장 2개 이상 · 합성 제외)`);
if (!bad.length) { console.log('\n✓ 소리에 대본만큼의 문장이 다 들어 있습니다.'); process.exit(0); }

console.log(`\n✗ 소리에 문장이 모자란 클립 ${bad.length}개`);
bad.forEach((b) => {
  console.log(`\n  [${b.id}] 대본 ${b.n}문장 · 소리에서 들리는 것 ${b.heard}문장`);
  console.log(`    전 문장을 이 시간에 읽으면 초당 ${b.rate}음절 — 한국어 한계 ${RATE_MAX} 를 넘는다(불가능)`);
  console.log(`    앞 ${b.heard}문장만이면 초당 ${b.firstRate}음절 — 또래 속도와 맞는다`);
  b.missing.forEach((t) => console.log(`    ★빠진 것으로 보임: "${t}"`));
});
console.log('\n★[CANT_HEAR] 나는 소리를 못 듣는다 — 「문장 수가 모자란다」까지가 기계가 말할 수 있는 것이다.');
console.log('   어느 문장인지는 순서로 추정했다. 확인은 귀로 해 주세요.');

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
