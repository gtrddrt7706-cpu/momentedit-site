// 실청 화면에 **식장에서 나는 소리가 전부** 들어 있는가 [LISTEN_COVER]
//
//   node scripts/check-listen-cover.mjs --file <실청점검_전체.html>
//
// ★왜 만드나 — 2026-08-16 사용자 지시
//   *"실청점검 확실하게 더블체크하자 모든(기존에 있던 나레이션 전부 포함 대역 상황극까지)
//     알맞게 들어가있는지"*
//
// ★무엇을 «왼쪽»에 두나 — **대장이 아니라 엔진**이다
//   대장(manifest)과 화면을 맞대면 늘 맞는다. 둘 다 같은 생성기에서 나오기 때문이다.
//   이 저장소가 그 병을 세 번 앓았다(RECORDED_TRUTH · NOAUDIO_REAL · CONSOLE_TEXT).
//   그래서 왼쪽은 **큐 엔진이 실제로 부르는 것**으로 둔다 — 식장에서 스피커가 낼 소리 그 자체다.
//     ① cue.file          나레이션 클립
//     ② castMainOf(cue)   나레이션을 **대신하는** 배역 클립
//     ③ castLiveOf(cue)   ★사람 구간 안에서 흐르는 **상황극(예시 대사)** — 여태 어느 검사도 안 봤다
//        check-text-audio 는 castLive 를 일부러 뺀다(화면 글과 짝이 아니라서). 그건 그 검사의 사정이고,
//        «들어 있나»는 별개다. 예시 대사가 실청에서 빠지면 그 자리는 아무도 못 듣고 넘어간다.
//     ④ D.PHOTOCUE        골라 트는 판(단체촬영 신호) — 미리듣기에도 콘솔에도 안 뜨는 자리
//
// ★무엇을 «오른쪽»에 두나 — 만들어진 **그 파일**이다. 생성기를 다시 돌려 비교하지 않는다.
//   사람에게 건넨 것이 그 파일이므로, 검사도 그 파일을 연다.
//
// ★세 가지를 따로 센다 — 「목록에 있다」와 「소리가 붙어 있다」는 다른 말이다
//   ① 화면에 줄이 있는가  ② 그 줄에 소리가 실려 있는가  ③ 화면에만 있고 엔진이 안 부르는 줄(죽은 줄)
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
const Story = require_(path.join(ROOT, 'assets/ritual-story.js'));
const D = require_(path.join(ROOT, 'assets/ritual-data.js'));
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const FILE = arg('--file', '');
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };
if (!FILE) die('--file <실청 html> 이 필요하다', 2);
if (!fs.existsSync(FILE)) die(`${FILE} 이 없다`, 2);

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

/* ── 왼쪽: 엔진이 부르는 것 전부 ──────────────────────────────────────────── */
const AX = {
  course: Object.keys(D.COURSES),
  entry: ['A', 'B', 'C', 'D', 'E', 'F'],
  entryVoice: ['nar', 'couple'],
  guestVoice: ['nar', 'couple'],
  declareWho: Object.keys(D.DECLWHO),
  declare: ['1', '2'],
  letter: Object.keys(D.LETTER),
  valley: ['none', 'wine', 'cake', 'both'],
  ringwarm: ['family', 'all'],
  tribute: Object.keys(D.TRIBUTE.modes),
  toast: Object.keys(D.TOAST),
  bless: ['on', 'off'],
  blessProxy: [false, true],
  ring: ['on', 'off'],
  song: ['family', 'live', 'off'],
  digital: [false, true],
};
/* ★축을 **두 개씩** 흔든다 — check-text-audio 와 같은 규칙이다.
   한 축씩만 흔들면 「두 분 목소리 × 느낌 C」처럼 두 값이 만나야 생기는 자리가 통째로 빠진다. */
const states = [];
const base = { course: 'damback' };
const keys = Object.keys(AX);
states.push({ ...base });
for (const k of keys) for (const v of AX[k]) states.push({ ...base, [k]: v });
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++)
  for (const a of AX[keys[i]]) for (const b of AX[keys[j]]) states.push({ ...base, [keys[i]]: a, [keys[j]]: b });
/* ★[EXTRA_CROSS 2026-08-16 CC 적대검증] extra 를 **켜는 값 하나**와만 곱하면 셋이 만나는 자리가 빠진다.
   실측: `18_narr-valley-cake` 는 `valley:'cake'` + `extra.valley` 가 **동시에** 있어야 나온다.
   EXTRA_ON 이 valley 를 'wine' 으로만 켜서, 두 축 흔들기로도 이 자리에 못 닿았다(80 → 81).
   ★그래서 extra 는 «그 축의 모든 값»과 곱한다. 축 이름이 extra 키와 같은 것만 곱하면 되므로 비용도 작다. */
const EXTRA_ON = { bless: { bless: 'on' }, valley: { valley: 'wine' } };
for (const k of ['bless', 'valley', 'ringwarm', 'welcome', 'tribute', 'toast', 'song', 'letter', 'free']) {
  const e = {}; e[k] = true;
  const on = EXTRA_ON[k] || {};
  states.push({ ...base, ...on, extra: e });
  states.push({ ...base, ...on, extra: e, entryVoice: 'couple', guestVoice: 'couple' });
  if (AX[k]) for (const v of AX[k]) {                       // [EXTRA_CROSS] 같은 이름 축의 모든 값과 교차
    states.push({ ...base, [k]: v, extra: e });
    for (const co of AX.course) states.push({ course: co, [k]: v, extra: e });
  }
  for (const co of AX.course) states.push({ course: co, ...on, extra: e });
}

const want = new Map();   // id → {kind, where:Set}
const add = (id, kind, where) => { if (!id) return;
  const k = String(id);
  if (!want.has(k)) want.set(k, { kind, where: new Set() });
  want.get(k).where.add(where); };

for (const S of states) for (const MODE of ['preview', 'console']) {
  let r; try { r = Cue.build(S, { mode: MODE }); } catch (e) { continue; }
  for (const c of r.cues) {
    const main = Story.castMainOf(c), live = Story.castLiveOf(c);
    if (c.file) add(c.file, '나레이션', MODE);
    for (const x of main) add(x.id, '배역(나레이션 대신)', MODE);
    for (const x of live) add(x.id, '배역 상황극(사람 구간)', MODE);   // ★여태 아무도 안 본 자리
  }
}
const pad2 = (n) => ('0' + n).slice(-2);
const NOBY = new Map(man.clips.map((c) => [c.file, pad2(c.no) + '_' + c.file]));
for (const g of [].concat(D.PHOTOCUE.call, D.PHOTOCUE.fx))
  add(NOBY.get(g.slug) || g.slug, '골라 트는 판(촬영 신호)', 'photocue');

/* 폐지한 자리는 식장에서 안 난다 — 왼쪽에서 뺀다. 대신 몇 개를 뺐는지 적는다 [RETIRED_SLUG] */
const RET = Cue.RETIRED || {};
const retired = [...want.keys()].filter((id) => RET[String(id).replace(/^\d+_/, '')]);
retired.forEach((id) => want.delete(id));

/* ── 오른쪽: 만들어진 그 파일 ─────────────────────────────────────────────── */
const html = fs.readFileSync(FILE, 'utf8');
const grab = (name) => {
  const i = html.indexOf(`var ${name} = `); if (i < 0) return null;
  const s = html.indexOf(name === 'D' ? '{' : '{', i);
  let depth = 0, j = s;
  for (; j < html.length; j++) { const ch = html[j];
    if (ch === '{') depth++; else if (ch === '}') { depth--; if (!depth) { j++; break; } } }
  try { return JSON.parse(html.slice(s, j)); } catch (e) { return null; }
};
const DATA = grab('D'); if (!DATA) die('실청 화면에서 D(화면 데이터)를 못 읽었다', 2);
const AO = grab('AO') || {}, AN = grab('AN') || {};
const rows = new Map((DATA.old || []).map((c) => [c.id, c]));
const newSent = (DATA.neu || []).reduce((a, c) => a + (c.n || []).length, 0);

console.log(`실청 화면 — 기존 ${rows.size}줄 · 어조 ${(DATA.neu || []).length}클립(문장 ${newSent})`);
console.log(`심긴 소리 — 기존 ${Object.keys(AO).length}개 · 어조 ${Object.keys(AN).length}개`);
console.log(`엔진이 부르는 자리 ${want.size}개 (폐지 ${retired.length}개 뺌: ${retired.join(' · ') || '없음'})`);

/* ① 목록에 있는가 */
const noRow = [...want.entries()].filter(([id]) => !rows.has(id));
/* ② 소리가 실려 있는가 — 합성 클립(mix)은 재료에서 만드는 것이라 소리가 없을 수 있다 */
const noSnd = [...want.entries()].filter(([id]) => rows.has(id) && !AO[id])
  .filter(([id]) => !(rows.get(id) || {}).mix);
/* ③ 화면에만 있고 엔진이 안 부르는 줄 */
const dead = [...rows.keys()].filter((id) => !want.has(id));

const kindTally = {};
for (const [, v] of want) kindTally[v.kind] = (kindTally[v.kind] || 0) + 1;
console.log('  종류별 —', Object.entries(kindTally).map(([k, v]) => `${k} ${v}`).join(' · '));

if (noRow.length) no(`엔진이 부르는데 실청 화면에 **줄이 없는** 자리 ${noRow.length}개:\n    `
  + noRow.map(([id, v]) => `${id} (${v.kind})`).join('\n    '));
if (noSnd.length) no(`줄은 있는데 **소리가 안 실린** 자리 ${noSnd.length}개:\n    `
  + noSnd.map(([id, v]) => `${id} (${v.kind})`).join('\n    '));
if (dead.length) console.log(`· 화면에만 있고 엔진이 안 부르는 줄 ${dead.length}개(폐지·예비): ${dead.join(' · ')}`);

/* ④ 어조 63클립 — 붙여넣기 대본의 문장 수와 화면의 문장 수가 같은가 */
{
  const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
  const src = path.join(DIR, '더빙_한번에.txt');
  if (fs.existsSync(src)) {
    const n = fs.readFileSync(src, 'utf8').split('\n').filter((l) => l.trim()).length;
    if (n !== newSent) no(`어조 문장 수가 다르다 — 대본 ${n}줄 · 화면 ${newSent}문장`);
    else if (Object.keys(AN).length !== n) no(`어조 소리 수가 다르다 — 문장 ${n} · 심긴 소리 ${Object.keys(AN).length}`);
    else console.log(`ok 어조 — 대본 ${n}줄 = 화면 ${newSent}문장 = 심긴 소리 ${Object.keys(AN).length}개`);
  }
}

/* ⑤ 화면 글 = 대장 글 (줄마다) — 화면이 옛 문안을 들고 있으면 여기서 걸린다 */
{
  const MS = new Map(man.clips.map((c) => [pad2(c.no) + '_' + c.file,
    (c.sents || []).map((s) => String(s.text || '').trim()).filter(Boolean)]));
  const drift = [];
  for (const [id, r] of rows) {
    const m = MS.get(id); if (!m) continue;
    if (JSON.stringify(m) !== JSON.stringify(r.s || [])) drift.push(id);
  }
  if (drift.length) no(`화면 글이 대장과 다른 줄 ${drift.length}개: ${drift.slice(0, 8).join(' · ')}`);
  else console.log(`ok 화면 글 — ${rows.size}줄 전부 대장과 같다`);
}

/* ⑥ ★★[UNREACHED_TEXT 2026-08-16] 엔진이 «안 부르는» 클립도 글↔소리를 대조한다
   ─ check-text-audio 는 엔진이 내주는 자리만 훑는다(지금 70곳). 그런데 실제로 나가는 소리는
     그것만이 아니다: 콘솔에서 손으로 고르는 판(bridge-4·5·6 · parents-letter),
     폴백 클립(32_declare-family — 가족이 부담스러워하면 즉시 재생),
     런타임 조건 클립(25_narr-bless-end-long — 덕담이 길어질 때),
     그리고 폐지했지만 파일은 남긴 것들.
   ─ 그 자리들은 **어떤 검사도 글과 소리를 맞대 본 적이 없다.** 실제로 어긋나 있었다:
       36_ringwarm-family · 37_ringwarm-all — 대장 「**다시** 두 사람에게 돌아옵니다」 / 녹음 「**곧** …」
   ─ 그래서 대장(녹음하기로 한 글) ↔ _recorded.json(실제 녹음된 글)을 **105줄 전수**로 본다.
     두 파일은 서로 다른 순간에 쓰인다(생성기 vs 조립기) — 그래서 맞대면 뜻이 있다.
   ★붉히지는 않는다 — 폐지한 자리까지 게이트를 세우면 사람이 게이트를 끈다. **적어서 눈에 들인다.** */
{
  const REC = {};
  for (const d of ['assets/audio/narration', 'assets/audio/cast']) {
    const f = path.join(ROOT, d, '_recorded.json');
    if (fs.existsSync(f)) Object.assign(REC, JSON.parse(fs.readFileSync(f, 'utf8')).clips || {});
  }
  const norm = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, '');
  const drift = [], none = [];
  for (const c of man.clips) {
    if (c.mix) continue;
    const id = pad2(c.no) + '_' + c.file;
    const wantT = (c.sents || []).map((s) => s.text).join(' ');
    if (!Object.prototype.hasOwnProperty.call(REC, id)) { none.push(id); continue; }
    if (norm(REC[id]) !== norm(wantT)) drift.push({ id, want: wantT, said: REC[id], live: want.has(id) });
  }
  console.log(`\n── 대장 글 ↔ 실제 녹음된 글 · ${man.clips.length}줄 전수 [UNREACHED_TEXT]`);
  if (none.length) console.log(`· 녹음 기록이 없는 줄 ${none.length}개: ${none.join(' · ')}`);
  if (!drift.length) console.log('✓ 어긋난 줄 없음');
  else {
    console.log(`★어긋난 줄 ${drift.length}개 — 화면엔 이 글이, 스피커에선 저 소리가 납니다`);
    drift.forEach((x) => { console.log(`  [${x.id}]${x.live ? ' ※엔진이 부르는 자리' : ' (손으로 고르는·폴백·폐지 자리)'}`);
      console.log(`     대장 "${x.want}"`); console.log(`     녹음 "${x.said}"`); });
    /* 엔진이 부르는 자리에서 어긋났으면 그건 check-text-audio 가 잡았어야 한다 — 그때는 붉힌다 */
    if (drift.some((x) => x.live)) no('엔진이 부르는 자리에서 글과 소리가 다릅니다 — check-text-audio 가 놓친 자리입니다');
  }
}

if (bad) { console.error('\n✗ 실청 화면에 빠진 자리가 있습니다.'); process.exit(1); }
console.log('\n✓ 식장에서 날 소리가 전부 실청 화면에 있습니다 (상황극·촬영 신호 포함).');
process.exit(0);
