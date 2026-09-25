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
import { recClips } from './recorded-read.mjs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { engineCalls } from './lib/engine-calls.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const FILE = arg('--file', '');
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };
if (!FILE) die('--file <실청 html> 이 필요하다', 2);
if (!fs.existsSync(FILE)) die(`${FILE} 이 없다`, 2);

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

/* ── 왼쪽: 엔진이 부르는 것 전부 ──────────────────────────────────────────── */
/* ★[ENGINE_CALLS 2026-08-17] 이 계산은 scripts/lib/engine-calls.mjs 로 옮겼다 — 쓰는 곳이 셋이 됐다.
   여기서 한 번 더 세면 언젠가 셋이 서로 다르게 세고, 그날 «비워도 되는 자리»의 답이 갈린다.
   축(AX)을 늘릴 일이 있으면 lib 를 고친다. 여기에 다시 적지 말 것. */
const { want, retired } = engineCalls();
const pad2 = (n) => String(n).padStart(2, '0');   // [PAD3] 100 넘는 번호를 자르지 않는다

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
/* ★★[LISTEN_COVER_WEB 2026-09-14] 판에는 «소리를 싣는 길»이 둘이다 — 이 검사는 하나만 알았다.
   ★실사고: --web 로 뽑은 판(지금 폰에 주는 그 판)에 이 검사를 대니
     「소리가 안 실린 자리 86개」·「어조 심긴 소리 0」이라고 답했다. 전부 거짓이다.
     그 판은 소리를 base64 로 «심지» 않고 SRCMAP 의 **주소로 부른다**(LISTEN_WEB · 2026-08-26).
     AO/AN 만 세면 --web 판은 언제나 「전부 빠짐」으로 나온다.
   ★이 검사의 이름은 「빠진 게 있는가」다. 그런데 안 빠진 것을 빠졌다고 말했다 —
     그런 검사는 없는 것만 못하다. 한 번 거짓말한 검사는 다음부터 아무도 안 읽는다.
   ★그래서 주소 쪽이 **더 센 증거**가 되게 짠다: 주소만 있는 것으로는 안 치고,
     그 주소가 가리키는 파일이 저장소에 **실제로 있을 때만** «소리 있음»으로 센다.
     심긴 판은 종전대로 AO/AN 으로 센다. 두 길 다 통과해야 한다. */
const SRCMAP = grab('SRCMAP') || {};
const urlReal = (u) => {
  if (!u || typeof u !== 'string' || u.startsWith('data:')) return false;
  return fs.existsSync(path.join(ROOT, u.replace(/^\//, '')));
};
const WEB = Object.values(SRCMAP).some((u) => typeof u === 'string' && !u.startsWith('data:'));
/* 주소가 깨진 자리 — 판은 그 줄을 그리지만 눌러도 아무 소리가 안 난다. 가장 조용한 실패다. */
const brokenUrl = Object.entries(SRCMAP)
  .filter(([, u]) => typeof u === 'string' && !u.startsWith('data:') && !urlReal(u));
/* ★[SOUND_OUT_OF_JS] 심는 판은 소리를 JS 지도가 아니라 «파싱 안 되는 <script id="snd_…">» 에 둔다.
   AO/AN 은 그 구조로 바뀐 뒤부터 «항상 빈 {}» 였다 — 그래서 이 검사는 --web 만이 아니라
   **심긴 판에도** 「소리 0」이라고 답해 왔다. 두 길을 다 보게 고친다. */
const embedded = new Set([...html.matchAll(/id="snd_([^"]+)"/g)].map((m) => m[1]));
const hasSnd = (id) => !!AO[id] || embedded.has(id) || urlReal(SRCMAP[id]);
const toneKeys = () => {
  const ks = new Set([...Object.keys(AN), ...[...embedded].filter((k) => /^n\d+$/.test(k)),
    ...Object.keys(SRCMAP).filter((k) => /^n\d+$/.test(k) && urlReal(SRCMAP[k]))]);
  return ks.size;
};
const toneN = toneKeys;
const rows = new Map((DATA.old || []).map((c) => [c.id, c]));
const newSent = (DATA.neu || []).reduce((a, c) => a + (c.n || []).length, 0);

console.log(`실청 화면 — 기존 ${rows.size}줄 · 어조 ${(DATA.neu || []).length}클립(문장 ${newSent})`);
console.log(embedded.size ? `소리 — **화면 안에 심긴 판**(--embed) · 심긴 자리 ${embedded.size}개`
  : WEB
  ? `소리 — **주소로 부르는 판**(--web) · SRCMAP ${Object.keys(SRCMAP).length}자리 · 그중 파일이 실제로 있는 것 ${Object.values(SRCMAP).filter(urlReal).length}개`
  : `심긴 소리 — 기존 ${Object.keys(AO).length}개 · 어조 ${Object.keys(AN).length}개`);
if (brokenUrl.length) no(`주소는 있는데 **그 파일이 없다** ${brokenUrl.length}개 — 눌러도 소리가 안 난다:\n    `
  + brokenUrl.map(([k, u]) => `${k} → ${u}`).join('\n    '));
console.log(`엔진이 부르는 자리 ${want.size}개 (폐지 ${retired.length}개 뺌: ${retired.join(' · ') || '없음'})`);

/* ① 목록에 있는가 */
const noRow = [...want.entries()].filter(([id]) => !rows.has(id));
/* ② 소리가 실려 있는가 — 합성 클립(mix)은 재료에서 만드는 것이라 소리가 없을 수 있다 */
const noSnd = [...want.entries()].filter(([id]) => rows.has(id) && !hasSnd(id))
  .filter(([id]) => !(rows.get(id) || {}).mix);
/* ③ 화면에만 있고 엔진이 안 부르는 줄 */
const dead = [...rows.keys()].filter((id) => !want.has(id));

const kindTally = {};
for (const [, v] of want) kindTally[v.kind] = (kindTally[v.kind] || 0) + 1;
console.log('  종류별 —', Object.entries(kindTally).map(([k, v]) => `${k} ${v}`).join(' · '));

if (noRow.length) no(`엔진이 부르는데 실청 화면에 **줄이 없는** 자리 ${noRow.length}개:\n    `
  + noRow.map(([id, v]) => `${id} (${v.kind})`).join('\n    '));
/* ★★[NEW_CLIP_NOSOUND 2026-09-20] «아직 한 번도 안 받은» 클립은 당연히 소리가 없다.
   87_narr-toast-none 이 그랬다 — 새로 만든 자리라 mp3 가 있을 수가 없는데 빨강이 됐다.
   ★그렇다고 전부 봐주면 «모르고 빠진 것»까지 통과한다. [REDUB_PENDING] 과 **같은 자로** 가른다:
     다시받기 목록에 등록됨 = 사람이 알고 받기로 한 것 · 등록 안 됨 = 아무도 모르는 빈자리(빨강)
   ★목록을 못 읽으면 봐주기를 끄고 그 사실을 찍는다(아래 catch) — 조용히 넓어지지 않는다. */
let NEWPEND = new Set();
try {
  const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/다시받기/_순서.json'), 'utf8'));
  for (const arr of Object.values(J)) for (const r of arr) NEWPEND.add(r.clip);
} catch (e) { console.log(`· [NEW_CLIP_NOSOUND] 다시받기 목록을 못 읽어 봐주기를 끕니다: ${e.message}`); }
const noSndKnown = noSnd.filter(([id]) => NEWPEND.has(id));
const noSndReal = noSnd.filter(([id]) => !NEWPEND.has(id));
if (noSndKnown.length) console.log(`· 아직 안 받은 자리 ${noSndKnown.length}개는 봐줍니다 [NEW_CLIP_NOSOUND]: `
  + noSndKnown.map(([id]) => id).join(' · '));
if (noSndReal.length) no(`줄은 있는데 **소리가 안 실린** 자리 ${noSndReal.length}개:\n    `
  + noSndReal.map(([id, v]) => `${id} (${v.kind})`).join('\n    '));
if (dead.length) console.log(`· 화면에만 있고 엔진이 안 부르는 줄 ${dead.length}개(폐지·예비): ${dead.join(' · ')}`);

/* ④ 어조 63클립 — 붙여넣기 대본의 문장 수와 화면의 문장 수가 같은가 */
{
  const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
  const src = path.join(DIR, '더빙_한번에.txt');
  if (fs.existsSync(src)) {
    const n = fs.readFileSync(src, 'utf8').split('\n').filter((l) => l.trim()).length;
    if (n !== newSent) no(`어조 문장 수가 다르다 — 대본 ${n}줄 · 화면 ${newSent}문장`);
    else if (toneN() !== n) no(`어조 소리 수가 다르다 — 문장 ${n} · 소리 ${toneN()}`);
    else console.log(`ok 어조 — 대본 ${n}줄 = 화면 ${newSent}문장 = 소리 ${toneN()}개`);
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
    if (fs.existsSync(f)) Object.assign(REC, recClips(path.dirname(f)));   // [REC_READ]
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
    /* ★★[REDUB_PENDING 2026-09-20] 단, «다시받기 파일에 등록해 둔» 클립은 봐준다.
       문안을 고치면 소리는 반드시 한동안 뒤처진다(성우 녹음은 사람이 하는 일이다).
       그 창을 빨강으로 두면 «재녹음이 끝날 때까지 main 에 못 올리는» 구조가 되고,
       그러면 고친 것이 브랜치에 쌓인다 — 2026-09-19 에 열흘치가 그렇게 묵어 사고가 났다([SHIP_NOW]).
       ★그렇다고 전부 봐주면 «모르고 어긋난 것»까지 통과한다. 그래서 «등록했나»로 가른다:
         등록됨 = 사람이 알고 다시 받기로 한 것 · 등록 안 됨 = 아무도 모르는 어긋남(빨강)
       등록 자체는 redub-covers 가 따로 지킨다 — 어긋난 클립이 목록에 «전부» 있어야 초록이다.
       즉 두 검사가 사슬이다: 여기서 봐준 것은 저기서 «목록에 있나»로 다시 확인된다. */
    let PEND = new Set();
    try {
      const J = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/다시받기/_순서.json'), 'utf8'));
      for (const arr of Object.values(J)) for (const r of arr) PEND.add(r.clip);
    } catch (e) {
      /* ★목록을 못 읽으면 «조용히» 넘어가지 않는다 — 봐주기가 통째로 꺼진 채로
         「빨강이네」만 보면 원인을 못 찾는다(실제로 이 줄을 넣을 때 한 번 그랬다). */
      console.log(`· [REDUB_PENDING] 다시받기 목록을 못 읽어 봐주기를 끕니다: ${e.message}`);
    }
    const live = drift.filter((x) => x.live);
    const unknown = live.filter((x) => !PEND.has(x.id));
    const pending = live.filter((x) => PEND.has(x.id));
    if (pending.length) console.log(`· 재녹음 대기 ${pending.length}개는 봐줍니다 [REDUB_PENDING]: ${pending.map((x) => x.id).join(' · ')}`);
    if (unknown.length) no(`엔진이 부르는 자리에서 글과 소리가 다릅니다 — check-text-audio 가 놓친 자리입니다: ${unknown.map((x) => x.id).join(' · ')}`);
  }
}

if (bad) { console.error('\n✗ 실청 화면에 빠진 자리가 있습니다.'); process.exit(1); }
console.log('\n✓ 식장에서 날 소리가 전부 실청 화면에 있습니다 (상황극·촬영 신호 포함).');
process.exit(0);
