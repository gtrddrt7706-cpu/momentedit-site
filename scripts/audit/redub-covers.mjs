/* ★★[REDUB_COVERS 2026-09-13 점검] 「다시 받아야 할 클립」이 «사장님이 받는 파일»에 전부 들어 있나.
 *
 * ── 왜 만드나
 *   두 벌이 따로 산다:
 *     ① cast-text-audio.mjs  — 대장의 «지금 글» ↔ _recorded.json 의 «녹음된 글» 을 맞대 어긋남을 센다
 *     ② 다시받기/_순서.json  — build-redub-byvoice.mjs 가 만든, 사장님이 실제로 붙여넣는 목록
 *   같은 원천을 보지만 «거르는 조건»을 각자 적어 두었다. 한쪽 조건만 고치면
 *   「글은 어긋났는데 다시받기 파일에는 없는 클립」이 생긴다.
 *   그러면 사장님은 받은 파일을 «전부» 녹음하시고도 그 자리가 옛 소리로 남는다.
 *   전부 녹음했는데 게이트가 여전히 붉는 것이 이 사고의 모양이고, 원인을 찾기가 아주 어렵다.
 *
 *   ★오늘(2026-09-13) 재 보니 54 ⊂ 55 로 맞았다. 맞은 날 거는 것이 검사다 —
 *     어긋난 뒤에 거는 것은 이미 사장님이 헛녹음을 하신 뒤다.
 *
 * ── 무엇을 재나 (한 방향만)
 *   «어긋남 ⊆ 다시받기». 반대는 안 본다 — 다시받기에는 «아직 한 번도 안 받은 클립»이 더 들어 있는 것이
 *   정상이다(오늘 86_narr-round-mid 하나가 그렇다).
 *
 * ── 종료코드 [CANT_LOOK]  0 통과 · 1 빠진 클립이 있다 · 2 재지 못함
 * 쓰기: node scripts/audit/redub-covers.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);
const MAN = 'docs/plans/식순연구/타입캐스트/manifest.json';
/* ★녹음된 글은 «음원 폴더 옆»에 있다(두 곳). build-redub-byvoice.mjs 46~52행과 같은 자리를 읽는다 —
   다른 자리를 읽으면 이 검사가 비교하는 대상이 애초에 달라진다. */
const RECDIRS = ['assets/audio/cast', 'assets/audio/narration'];
const ORD = 'docs/plans/식순연구/타입캐스트/다시받기/_순서.json';

let man, ord;
const rec = {};
try {
  man = JSON.parse(fs.readFileSync(P(MAN), 'utf8'));
  ord = JSON.parse(fs.readFileSync(P(ORD), 'utf8'));
  let got = 0;
  for (const d of RECDIRS) {
    const j = JSON.parse(fs.readFileSync(P(path.join(d, '_recorded.json')), 'utf8'));
    for (const [k, v] of Object.entries(j.clips || {})) { rec[d + '|' + k] = typeof v === 'string' ? v : v.text; got++; }
  }
  if (!got) throw new Error('_recorded.json 이 비어 있다');
} catch (e) {
  console.log(`[REDUB_COVERS] ? 원천을 못 읽었다 — ${e.message}`);
  console.log('  ★«못 잼»은 «통과»가 아니다. 다시받기 폴더가 안 뽑혀 있으면 먼저 뽑으세요.');
  process.exit(2);
}

/* ★폐지 명단을 «생성기와 같은 자리»에서 읽는다 — ritual-cue.js 의 RETIRED 블록.
   ★첫 판에서 이걸 빠뜨려 46_end-1b-farewell-online · 36_ringwarm-family · 37_ringwarm-all
     셋을 「사장님이 못 받는 클립」이라고 잘못 일렀다(2026-09-13). 셋 다 폐지된 클립이라
     다시받기에 없는 것이 «맞다». 거르는 조건을 한 곳이라도 빠뜨리면 검사가 거짓말을 한다.
   ★여기 명단을 다시 적지 말 것 — 적는 순간 또 한 벌이 생기고, 그게 이 검사가 막으려는 병이다. */
const cueSrc = fs.readFileSync(P('assets/ritual-cue.js'), 'utf8');
const rb = /RETIRED\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(cueSrc);
const RETIRED = new Set(rb ? [...rb[1].matchAll(/'([^']+)'\s*:\s*1/g)].map((m) => m[1]) : []);
if (!RETIRED.size) { console.log('[REDUB_COVERS] ? ritual-cue.js 에서 폐지 명단을 못 읽었다'); process.exit(2); }

/* 다시받기 파일에 실제로 들어간 클립 */
const covered = new Set();
for (const lines of Object.values(ord)) for (const x of lines) covered.add(x.clip);

/* 대장의 지금 글 ↔ 녹음된 글 — cast-text-audio 와 «같은» 정규화를 쓴다.
   ★여기서 정규화를 다르게 쓰면 이 검사가 스스로 거짓말을 한다. 공백만 눌러 비교한다. */
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const NAR = 'assets/audio/narration';
const pad2 = (n) => String(n).padStart(2, '0');

const missing = [];
let mismatch = 0;
for (const c of man.clips || []) {
  if (c.mix || RETIRED.has(c.file)) continue;            // 합성 클립[MIX_MADE]·폐지 클립은 받지 않는다
  /* ★★[PARENTS_OWN_LANE 2026-09-20] 43_parents-letter 만 조립기가 다르다 —
     타입캐스트가 문장이 아니라 **문단 10개**로 나눠 줘서 assemble-parents-letter.mjs 가 따로 받는다.
     그래서 다시받기/_순서.json 에 영영 안 들어오고, 여기서는 늘 «받을 길이 없다»로 붉었다.
     ★그냥 건너뛰면 구멍이 된다. 이 자리는 **다른 검사 둘이 맡는다** —
       · scripts/audit/letter-mirror.mjs        화면 글 ↔ 소리가 갈렸나
       · scripts/make-parents-rerecord.mjs --check  화면 문안 ↔ 녹음 대기함이 맞나
     둘 다 merge-guard 가 돌린다. 여기서 빼는 것은 «안 본다»가 아니라 «저쪽이 본다»는 뜻이다.
     ★저 둘을 게이트에서 빼면 이 자리는 아무도 안 보게 된다. 뺄 때 이 주석부터 읽을 것. */
  if (c.file === 'parents-letter') continue;
  const key = pad2(c.no) + '_' + c.file;
  const said = rec[(c.dir || NAR) + '|' + key];
  if (said === undefined) continue;                     // 아직 한 번도 안 받은 클립은 이 검사 밖이다
  if (norm(said) === norm((c.sents || []).map((s) => s.text).join(' '))) continue;
  mismatch++;
  if (!covered.has(key)) missing.push(key);
}

console.log(`[REDUB_COVERS] 글↔소리 어긋남 ${mismatch}클립 · 다시받기 파일이 담은 것 ${covered.size}클립`);
if (missing.length) {
  console.log(`\n✗ 어긋났는데 다시받기 파일에 «없는» 클립 ${missing.length}개 — 사장님이 받으실 길이 없다:`);
  for (const k of missing) console.log(`    ${k}`);
  console.log('\n  ★전부 녹음하셔도 이 자리는 옛 소리로 남는다. 게이트는 계속 붉고 원인은 안 보인다.');
  console.log('  → build-redub-byvoice.mjs 의 «거르는 조건»과 cast-text-audio 의 것을 맞추세요.');
  process.exit(1);
}
console.log('[REDUB_COVERS] ok — 어긋난 클립이 전부 다시받기 파일에 들어 있다');

/* ★★[ID_ONE] 클립을 «혼자» 짚을 수 있어야 한다 — 부분 재더빙의 전제다.
   2026-09-13 실측: G13-3 이 86_narr-round-mid·62_narr-online-in 둘에 붙어 있었다(9/12 복사 실수).
   그 상태로 --clip =G13-3 을 주면 둘이 딸려 와, 받은 문장 수가 안 맞아 조립이 멎는다.
   ★번호_이름(KEY_NN)은 대장이 매기니 늘 고유하지만, id 는 사람이 손으로 단다 — 그래서 여기서 센다. */
const dupId = new Map();
for (const c of man.clips || []) {
  if (!c.id) continue;
  const k = pad2(c.no) + '_' + c.file;
  if (!dupId.has(c.id)) dupId.set(c.id, []);
  dupId.get(c.id).push(k);
}
const dups = [...dupId.entries()].filter(([, v]) => v.length > 1);
if (dups.length) {
  console.log(`\n✗ 같은 id 를 쓰는 클립이 ${dups.length}건 — 한 대목만 다시 조립할 때 둘이 딸려 온다:`);
  for (const [id, ks] of dups) console.log(`    ${id}  →  ${ks.join(' · ')}`);
  console.log('  → scripts/build-dubbing-script.mjs 에서 «뒤에 온 쪽»에 새 번호를 주세요.');
  process.exit(1);
}
console.log(`[ID_ONE] ok — 클립 ${(man.clips || []).length}개의 id 가 전부 고유하다`);

/* ★★[DUP_ONCE] 한 파일 판이 «겹치는 말을 한 번만» 담게 된 뒤로, 그 판이 채우는 자리가
   낱개 판과 «정확히 같아야» 한다. 한 자리라도 비면 그날 예식에서 그 문장이 소리 없이 지나간다.
   ★합친 것 자체가 틀릴 수도 있다 — 같은 예식에 둘 다 나가는 말을 합치면 같은 소리가 두 번 난다.
     그것도 여기서 잰다(큐 엔진 324조합 전수). 사람이 눈으로 셀 수 있는 것이 아니다. */
let flatOrder = null;
try { flatOrder = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/다시받기/_전체_순서.json'), 'utf8')); }
catch { console.log('[DUP_ONCE] ? _전체_순서.json 이 없다 — 다시받기를 먼저 뽑으세요'); process.exit(2); }

const slot = (a) => a.clip + '#' + a.i;
const filled = [];
for (const r of flatOrder) for (const a of r.at || []) filled.push(slot(a));
const want = [];
for (const lines of Object.values(ord)) for (const x of lines) want.push(x.clip + '#' + x.i);

const dupFill = filled.filter((k, i) => filled.indexOf(k) !== i);
const missSlot = want.filter((k) => !filled.includes(k));
const extraSlot = filled.filter((k) => !want.includes(k));
if (dupFill.length || missSlot.length || extraSlot.length) {
  console.log('\n✗ 한 파일 판이 채우는 자리가 낱개 판과 다르다:');
  if (missSlot.length) console.log(`    비는 자리 ${missSlot.length}개 — 예식에서 소리 없이 지나간다: ${missSlot.slice(0, 5).join(' ')}`);
  if (extraSlot.length) console.log(`    없는 자리에 넣는다 ${extraSlot.length}개: ${extraSlot.slice(0, 5).join(' ')}`);
  if (dupFill.length) console.log(`    한 자리에 두 번 넣는다 ${dupFill.length}개: ${dupFill.slice(0, 5).join(' ')}`);
  process.exit(1);
}

/* 합친 것이 «한 날에 같이 나가는» 말은 아닌지 — 큐 엔진으로 잰다. */
const RCq = require(P('assets/ritual-cue.js'));
const STq = require(P('assets/ritual-story.js'));
const together = new Set();
for (const course of ['gamdong', 'family', 'damback', 'record', 'minimal', 'festive'])
  for (const letter of ['parent', 'each', 'both'])
    for (const bless of ['on', 'off'])
      for (const tribute of ['flower', 'bow', 'hug'])
        for (const toast of ['toast', 'cake', 'both']) {
          let cues; try { cues = RCq.build({ course, letter, bless, tribute, toast }, { mode: 'console' }).cues; } catch { continue; }
          const live = new Set();
          for (const q of cues) {
            if (q.file) live.add(q.file);
            for (const id of (STq.castIds(q).live || [])) if (id) live.add(String(id).replace(/^\d+_/, ''));
          }
          const f = [...live];
          for (let i = 0; i < f.length; i++) for (let j = i + 1; j < f.length; j++) together.add([f[i], f[j]].sort().join('||'));
        }
const bad = [];
for (const r of flatOrder) {
  const ks = (r.at || []).map((a) => a.clip.replace(/^\d+_/, ''));
  for (let i = 0; i < ks.length; i++) for (let j = i + 1; j < ks.length; j++)
    if (together.has([ks[i], ks[j]].sort().join('||'))) bad.push([r, ks[i], ks[j]]);
}
if (bad.length) {
  console.log(`\n✗ 같은 예식에 «둘 다» 나가는 말을 한 소리로 합쳤다 ${bad.length}건 — 같은 소리가 두 번 난다:`);
  for (const [r, a, b] of bad.slice(0, 6)) console.log(`    [${r.n}] ${r.voice} 「${r.text}」  ${a} + ${b}`);
  process.exit(1);
}
const saved = flatOrder.reduce((a, r) => a + (r.at || []).length - 1, 0);
console.log(`[DUP_ONCE] ok — 한 파일 ${flatOrder.length}줄이 ${filled.length}자리를 빠짐없이 채운다 (겹쳐서 뺀 ${saved}줄)`);
