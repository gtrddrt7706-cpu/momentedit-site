/* ★★[SENT_LIB_CHECK 2026-09-13] 문장 창고가 «대장과 어긋나지 않는지» 잰다.
 *
 * 창고(assets/audio/_src)는 「받은 그대로」의 소리를 자리별로 들고 있다. 여기가 어긋나면
 * 옛 소리가 새 글의 자리에 조용히 끼워진다 — 이 저장소에서 가장 나쁜 실패의 모양이다.
 *
 * 재는 것 셋
 *   ① 대장에 없는 자리가 창고에 있나      (문안이 줄었는데 창고가 안 따라온 것)
 *   ② 창고 대장(_index.json)이 가리키는 파일이 실제로 있나
 *   ③ 창고의 «그때 글»이 지금 대장과 같나 (다르면 낡은 것 — 세어서 알린다)
 *
 * ★③ 은 «빨강»이 아니다. 문안을 고치면 그 자리는 당연히 낡고, 다시 받기 전까지 낡은 채로 산다.
 *   빨강으로 만들면 문안을 고칠 때마다 게이트가 붉어져 아무도 안 보게 된다. 세어서 보이기만 한다.
 *   ①②는 빨강이다 — 그건 창고가 «틀린» 것이지 «덜 찬» 것이 아니다.
 *
 * 종료코드 [CANT_LOOK]  0 통과 · 1 창고가 틀렸다 · 2 재지 못함
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);
const LIB = P('assets/audio/_src');
const pad2 = (n) => String(n).padStart(2, '0');

if (!fs.existsSync(LIB)) { console.log('[SENT_LIB_CHECK] 창고가 아직 없다 — 건너뜀'); process.exit(0); }
let man, idx;
try {
  man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  idx = JSON.parse(fs.readFileSync(path.join(LIB, '_index.json'), 'utf8'));
} catch (e) { console.log('[SENT_LIB_CHECK] ? 못 읽었다 — ' + e.message); process.exit(2); }

const slot = new Map();
for (const c of man.clips) { if (c.mix) continue; const k = pad2(c.no) + '_' + c.file;
  for (const s of c.sents) slot.set(k + '#' + s.i, s.text); }

/* ★★[RETIRED_SLOT 2026-09-20] 폐지한 클립의 «창고 자리»는 빨강이 아니다.
   폐지해도 파일·번호는 그대로 둔다는 것이 이 저장소의 관례다([SONG_RETIRED]·[SENT_RETIRED]).
   그러면 대장(manifest)에서는 빠지는데 창고에는 남아 「대장에 없는 자리」로 붉어진다.
   ★폐지 원천이 **두 곳**이다 — 한 곳만 보면 절반이 샌다:
     ① assets/ritual-cue.js 의 RETIRED   (나레이션 · 예: 79_narr-entry-out-B)
     ② build-typecast-import.mjs 의 CAST_HOLD (배역 · 예: 15_toast · R-declare-*)
   ★그래도 **세어 찍는다.** 이 자루가 소리 없이 커지면 「빨강 0이라 안전하다」가 거짓이 된다. */
const RETIRED_SLOT = (() => {
  const out = new Set();
  try {
    const cue = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
    const b = /var RETIRED = \{([\s\S]*?)\};/.exec(cue);
    if (b) for (const m of b[1].matchAll(/'([^']+)'\s*:\s*1/g)) out.add(m[1]);
  } catch (e) { /* 못 읽으면 아무것도 봐주지 않는다 — 조용히 넓어지는 쪽으로 틀리지 않는다 */ }
  try {
    const ti = fs.readFileSync(path.join(ROOT, 'scripts/build-typecast-import.mjs'), 'utf8');
    if (/\/\^R-toast\$\/\.test\(id\)/.test(ti)) out.add('toast');
  } catch (e) { /* 같음 */ }
  return out;
})();

const ghost = [], gone = [], stale = [], retired = [];
for (const [id, e] of Object.entries(idx.slots || {})) {
  if (!slot.has(id)) {
    const f = id.split('#')[0].replace(/^\d+_/, '');
    if (RETIRED_SLOT.has(f)) { retired.push(id); continue; }   // [RETIRED_SLOT]
    ghost.push(id); continue;
  }
  const f = path.join(LIB, id.split('#')[0], id.split('#')[1] + '.flac');
  if (!fs.existsSync(f)) { gone.push(id); continue; }
  if (slot.get(id) !== e.text) stale.push(id);
}
const have = Object.keys(idx.slots || {}).length - ghost.length - gone.length;
console.log(`[SENT_LIB_CHECK] 대장 ${slot.size}자리 · 창고 ${Object.keys(idx.slots || {}).length}자리 · 쓸 수 있는 것 ${have - stale.length}`);
if (stale.length) console.log(`   · 글이 바뀌어 낡은 자리 ${stale.length}개 — 다시 받으면 됩니다(빨강 아님)`);
if (retired.length) console.log(`   · 폐지한 클립의 자리 ${retired.length}개 — 봐줍니다 [RETIRED_SLOT]: ${[...new Set(retired.map((x) => x.split('#')[0]))].join(' · ')}`);
if (ghost.length || gone.length) {
  if (ghost.length) { console.log(`\n✗ 대장에 «없는» 자리가 창고에 ${ghost.length}개 — 문안이 줄었는데 창고가 안 따라왔습니다:`); ghost.slice(0, 8).forEach((x) => console.log('    ' + x)); }
  if (gone.length) { console.log(`\n✗ 창고 대장이 가리키는 «파일이 없는» 자리 ${gone.length}개:`); gone.slice(0, 8).forEach((x) => console.log('    ' + x)); }
  console.log('\n  → node scripts/sent-lib.mjs 로 상태를 보고, 지워진 자리는 _index.json 에서도 빼세요.');
  process.exit(1);
}
console.log('[SENT_LIB_CHECK] ok — 창고가 대장과 어긋난 곳 없다');
