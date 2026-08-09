// 화면에 쓰인 글 = 그 자리에서 나는 소리 — 전수 대조 (TEXT_AUDIO · 2026-08-04)
//
//   node scripts/check-text-audio.mjs          # 어긋난 자리만
//   node scripts/check-text-audio.mjs --all    # 맞는 자리까지 전부
//
// 왜 만드나 — 사용자 제보: *"근데왜 이부분이 나래이션이랑 다르지?"* → *"전부다 똑같이 나오게해야지"*
//   입장 「두 분 목소리」에서 화면은 ENTRY[v].self 6종을 보여 주는데, 들어보기는 6종이 공유하는
//   05_entry 한 클립을 냈다. 글자와 소리가 아예 다른 말이었고, 어느 느낌을 골라도 같은 소리였다.
//   ★한 자리가 그랬다면 다른 자리도 그럴 수 있다. 눈으로 훑지 않고 전 조합을 기계로 돌린다.
//
// 무엇을 대조하나
//   왼쪽 — 엔진이 화면에 쓰라고 내주는 글 (cue.text · order-preview·console이 그대로 그린다)
//   오른쪽 — 그 큐에서 실제로 재생되는 mp3의 대본 (manifest.json 문장을 이어 붙인 것)
//   ★둘 다 「이미 있는 원천」에서 읽는다. 여기에 표를 다시 적지 않는다 —
//     표를 또 적으면 문안이 바뀌는 날 검사만 낡은 문안을 지킨다.
//
// 재생 규칙은 order-preview.html `_srcs()`와 같다:
//   castMain 이 있으면 그것이 나레이션 클립을 **대신**한다 → 대조 대상은 배역 클립
//   없으면 cue.file 나레이션 클립
//   castLive 는 사람 구간 안에서 따로 흐르는 예시라 이 대조에서 뺀다(화면 글과 짝이 아니다)

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const Cue = require_(path.join(root, 'assets/ritual-cue.js'));
const Story = require_(path.join(root, 'assets/ritual-story.js'));
const D = require_(path.join(root, 'assets/ritual-data.js'));
const man = JSON.parse(fs.readFileSync(path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

const ALL = process.argv.includes('--all');

// ── 소리 대장 — 「폴더|NN_슬러그」 → {대본, 화자}
//   ★번호를 붙여서 센다. 슬러그만 쓰면 letter-parent·letter-each 가 나레이션(27·28)과 배역(10·11)에
//     같은 이름으로 두 번 있어 뒤엣것이 앞엣것을 덮는다. 그러면 나레이션 자리에 편지 낭독 대본이
//     들어가 「멀쩡한 자리가 어긋난 것처럼」 보인다. 재생이 부르는 이름과 같은 이름으로 세야 한다.
//   ★폴더까지 붙여서 센다. 번호+슬러그도 폴더가 다르면 겹칠 수 있다(나레이션 05_entry-A ↔ 배역).
//     지금은 이름을 겹치지 않게 지어 두었지만, 그 약속을 지키는 건 사람이다. 세는 쪽이 폴더를 보면
//     약속이 깨지는 날에도 검사기는 틀린 자리를 짚는다 — 조용히 한쪽을 덮지 않는다.
const NAR = 'assets/audio/narration', CST = 'assets/audio/cast';
const pad2 = (n) => ('0' + n).slice(-2);
const SAY = new Map();
for (const c of man.clips) SAY.set((c.dir || NAR) + '|' + pad2(c.no) + '_' + c.file, { text: c.sents.map((s) => s.text).join(' '), role: c.role, dir: c.dir });

/* ★★[RECORDED_TRUTH 2026-08-09] 이 검사에 큰 구멍이 있었다 — 실측으로 드러났다.
   오른쪽(소리)을 manifest.json 에서 읽는데, manifest 는 **「녹음하기로 한 글」**이지
   「실제로 녹음된 글」이 아니다. 문안을 고치면 build-typecast-import.mjs 가 manifest 를
   다시 쓰고, merge-guard 는 그 생성기를 매번 돌린다. 그래서 양쪽이 **함께** 새 문안이 되고
   검사는 늘 '맞음'이라고 말한다. 그 사이 mp3 는 옛말을 그대로 하고 있다.
     실제로 그랬다: 축배 4클립(40·41·42·56)을 다시 썼는데 어긋남 0으로 통과했다.
     당일 화면엔 새 문안이, 스피커에선 옛 문안이 나갔을 자리다.
   ★그래서 실제로 녹음된 글을 따로 못박아 둔다 — assets/audio/narration/_recorded.json.
     mp3 를 만드는 순간(assemble-narration.mjs)에만 갱신되는 것이 원칙이다.
     여기 있으면 그쪽을 먼저 믿는다. 없는 클립은 종전대로 manifest 로 떨어진다(새 클립). */
try {
  const RECF = path.join(root, NAR, '_recorded.json');
  if (fs.existsSync(RECF)) {
    const rec = JSON.parse(fs.readFileSync(RECF, 'utf8')).clips || {};
    for (const [key, e] of SAY) {
      if (!key.startsWith(NAR + '|')) continue;                // 배역(cast)은 이번 범위 밖 — 종전대로 대장을 본다
      const k = key.slice(NAR.length + 1);
      /* ★없으면 '없음'이다. 대장에 있다고 녹음된 것이 아니다 —
         새 클립은 대장에 먼저 생기고 소리는 나중에 온다. 그 창을 '맞음'으로 세면
         소리가 영영 안 와도 아무도 모른다. 여기 없으면 재더빙 대기로 잡힌다. */
      e.text = Object.prototype.hasOwnProperty.call(rec, k) ? rec[k] : '';
    }
  }
} catch (e) { console.error('✗ _recorded.json 을 읽지 못했습니다 — ' + e.message); process.exit(1); }

// ── 비교용 정규화. 문장부호·따옴표·공백은 소리로 구분되지 않으므로 지운다.
//   ★말이 되는 글자만 남긴다 — 여기서 너무 관대하면 다른 문장이 같아 보이고, 너무 빡빡하면
//     쉼표 하나로 전부 빨갛게 뜬다. 한글·숫자·영문만 남기는 선이 그 사이다.
const norm = (s) => String(s || '').replace(/[^0-9A-Za-z가-힣]+/g, '');

// ── 훑을 축. 화면에서 고를 수 있는 값 전부 (order-preview.html의 선택지와 같아야 한다)
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
  digital: [false, true]
};

// 축 **두 개씩** 흔든다(전 조합이 아니라 쌍). 한 축씩만 흔들면 「두 분 목소리 × 느낌 C」처럼
// 두 값이 만나야 생기는 자리가 통째로 빠진다 — 실제로 entry-C 가 그렇게 빠져 있었다.
// (어느 코스의 기본값도 C가 아니라, 한 축 훑기로는 C와 couple 이 한 번도 같이 서지 않는다.)
const states = [];
const base = { course: 'damback' };
const keys = Object.keys(AX);
states.push({ ...base });
for (const k of keys) for (const v of AX[k]) states.push({ ...base, [k]: v });
for (let i = 0; i < keys.length; i++) for (let j = i + 1; j < keys.length; j++)
  for (const a of AX[keys[i]]) for (const b of AX[keys[j]]) states.push({ ...base, [keys[i]]: a, [keys[j]]: b });
// 확장 순간(팔레트로 넣는 자리)도 켜 본다 — 안 켜면 그 큐가 아예 안 나와 검사에서 조용히 빠진다.
// ★'free'(자유 한 칸)를 빼면 그 두 클립이 검사에서 조용히 사라진다 — 추가 순간은 켜 봐야 나온다.
// ★[EXTRA_ENABLE] 팔레트로 켜는 것만으로는 부족한 자리가 있다 — seq 에는 들어가지만
//   빌더가 자기 S 키를 다시 보기 때문이다(bless 는 S.bless==='on', valley 는 S.valley!=='none').
//   2026-08-07 실사고: [THREE_COURSES]로 담백 seq 에서 덕담·와인케이크가 빠지자
//   이 두 자리가 검사에서 통째로 사라졌고, 검사는 "이제 글과 소리가 맞는다"고 보고했다.
//   ★화면 쪽 같은 표는 order-preview.html 의 EXTRA_ON 이다. 늘어나면 둘 다 고칠 것.
const EXTRA_ON = { bless: { bless: 'on' }, valley: { valley: 'wine' } };
for (const k of ['bless', 'valley', 'ringwarm', 'welcome', 'tribute', 'toast', 'song', 'letter', 'free']) {
  const e = {}; e[k] = true;
  const on = EXTRA_ON[k] || {};
  states.push({ ...base, ...on, extra: e });
  states.push({ ...base, ...on, extra: e, entryVoice: 'couple', guestVoice: 'couple' });
}

const seen = new Map();   // 자리키 → {ok, screen, heard, why}
for (const S of states) {
  let r; try { r = Cue.build(S, { mode: 'preview' }); } catch (e) { continue; }
  for (const c of r.cues) {
    const main = Story.castMainOf(c);
    // 배역 클립이 있으면 그것이 나레이션 클립을 대신한다(order-preview `_srcs()` 와 같은 규칙).
    // 어느 폴더에서 나는 소리인지도 같이 들고 다닌다 — 대장을 폴더째로 찾기 때문이다.
    const dir = main.length ? CST : NAR;
    const ids = main.length ? main.map((x) => x.id) : (c.file ? [c.file] : []);
    if (!ids.length) continue;                       // 소리가 없는 큐(사람 구간만) — 대조 대상 아님
    const key = c.k + '|' + (c.slug || '') + '|' + ids.join('+');
    if (seen.has(key)) continue;
    // 배역 id도 cue.file 도 이미 'NN_슬러그' — 재생이 부르는 이름 그대로 대장을 찾는다
    const heard = ids.map((x) => SAY.get(dir + '|' + x));
    const missing = ids.filter((s, i) => !heard[i]);
    const screen = c.text || '';
    const said = heard.filter(Boolean).map((x) => x.text).join(' ');
    seen.set(key, {
      k: c.k, name: c.name || c.blockN || c.k, slug: c.slug || "", ids,
      screen, said, missing,
      ok: !missing.length && !!screen && norm(screen) === norm(said),
      noText: !screen
    });
  }
}

// ── ★[VOW_CHORUS 2026-08-04] 서약 마지막 합창은 위 대조에 안 걸린다 — 그래서 여기서 따로 본다.
//   왜 안 걸리나: 합창 클립은 castLive 다(사람이 말하는 구간 안의 예시). 위 대조는 castLive 를 뺀다.
//   그런데 이 자리만은 화면에 **문장 자체**가 뜬다(order-preview 가 live.both 를 그대로 그린다).
//   글자가 뜨는 자리는 소리와 같아야 한다는 규칙이 여기에도 걸린다 — 규칙은 같고 통로만 다르다.
//   ★재료 24·25 까지 함께 본다. 셋 중 하나만 딴 문장이면 겹친 소리가 웅얼거림이 된다.
//   ★표를 다시 적지 않는다. 왼쪽은 D.VOWBOTH(원천), 오른쪽은 manifest — 둘 다 이미 있는 값이다.
const chorus = [];
{
  const want = (D.VOWBOTH || []).join(' ');
  const ids = ['24_vow-both-1', '25_vow-both-2', '26_vow-both'];
  if (!want) chorus.push(`ritual-data.js 의 VOWBOTH 가 비어 있습니다`);
  else for (const id of ids) {
    const got = SAY.get(CST + '|' + id);
    if (!got) chorus.push(`대본에 ${id} 이 없습니다 — node scripts/build-typecast-import.mjs 를 다시 도세요`);
    else if (norm(got.text) !== norm(want)) chorus.push(`${id} 의 대본이 VOWBOTH 와 다릅니다\n    화면 "${want}"\n    소리 "${got.text}"`);
  }
}

const rows = [...seen.values()].sort((a, b) => (a.k + a.slug).localeCompare(b.k + b.slug));
const bad = rows.filter((r) => !r.ok && !r.noText);

/* ★★[NO_AUDIO 2026-08-08] 위 대조는 **미리듣기에 나오는 자리**만 훑는다.
   콘솔 전용 구간(예식 뒤 30분)과 '골라 트는 판'(D.PHOTOCUE)은 미리듣기에 안 나오므로
   글이 아무리 새로워도 여기 안 잡힌다 — 실제로 클립 16개가 어느 목록에도 없이 떠 있었다.
   그래서 **FILES ↔ manifest 를 통째로 대조**한다. 슬러그가 대본에 없으면 소리가 아직 없는 것이다.
   ★이 방식은 모드와 무관해서, 앞으로 어떤 클립이 늘어도 저절로 잡힌다. */
const manFiles = new Set(man.clips.map((c) => c.file));
const SLUGTEXT = new Map();
for (const S of states) { let r; try { r = Cue.build(S, { mode: 'console' }); } catch (e) { continue; }
  for (const c of r.cues) if (c.slug && c.text) SLUGTEXT.set(c.slug, c.text); }
for (const g of [].concat(D.PHOTOCUE.call, D.PHOTOCUE.fx)) SLUGTEXT.set(g.slug, g.t);
const noAudio = Cue.FILES.map((f, i) => ({ slug: f, no: String(i + 1).padStart(2, '0'), screen: SLUGTEXT.get(f) || '' }))
  .filter((x) => !manFiles.has(x.slug) && !(Cue.RETIRED || {})[x.slug]);   // [RETIRED_SLUG] 폐지한 자리는 녹음하지 않는다
// 녹음이 필요한 전체 = 글이 바뀐 것 ∪ 소리가 아예 없는 것 (선언 위치 주의 — --redub 블록이 먼저 쓴다)
const badSlugs = [...new Set(bad.map((r) => r.slug).concat(noAudio.map((r) => r.slug)))].filter(Boolean).sort();

const cut = (s, n = 76) => (s.length > n ? s.slice(0, n) + '…' : s);

console.log(`대조한 자리 ${rows.length}곳 — 맞음 ${rows.filter((r) => r.ok).length} · 어긋남 ${bad.length} · 화면 글 없음 ${rows.filter((r) => r.noText).length}\n`);
for (const r of (ALL ? rows : bad)) {
  const mark = r.noText ? '·' : r.ok ? '✓' : '✗';
  console.log(`${mark} ${r.k}${r.slug && r.slug !== r.k ? ' / ' + r.slug : ''}  ← ${r.ids.join(' + ')}`);
  if (r.ok || r.noText) continue;
  if (r.missing.length) console.log(`    ★대본에 없는 클립: ${r.missing.join(' · ')}`);
  console.log(`    화면 "${cut(r.screen)}"`);
  console.log(`    소리 "${cut(r.said) || '(없음)'}"`);
}
if (chorus.length) { console.log(`\n[VOW_CHORUS] 서약 마지막 합창`); for (const m of chorus) console.log(`  ✗ ${m}`); }
else if (ALL) console.log(`\n[VOW_CHORUS] ✓ 서약 마지막 합창 3클립이 VOWBOTH 와 같습니다.`);

// ── ★[REDUB_PENDING 2026-08-07] 문안을 고치면 소리는 **당장은** 옛 것이다.
//   그 창을 그냥 빨갛게 두면 재더빙이 끝날 때까지 모든 검사가 빨개서, 사람이 검사를 안 보게 된다.
//   그렇다고 조용히 넘기면 "고쳤는데 소리는 안 바뀐" 상태가 배포된다 — 이 프로젝트가 실제로 겪은 사고다.
//   ★그래서 **붙여넣기 파일이 곧 대기 명단**이다. 어긋난 자리는 반드시 그 파일에 있어야 하고,
//     그 파일에 있는데 이제 안 어긋나면 파일이 낡은 것이다. 양방향으로 강제한다.
//     명단을 코드에 따로 적지 않는다 — 사용자가 실제로 쓰는 파일 하나가 명단 노릇을 한다.
//   ★쓰기: node scripts/check-text-audio.mjs --redub   (어긋난 자리로 붙여넣기 파일을 다시 뽑는다)
const REDUB = path.join(root, 'docs/plans/식순연구/타입캐스트/재더빙_리드보강.txt');
const sentsOf = (t) => String(t).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
const VOICE = (man.voice || {})['진행'] || '진행';

if (process.argv.includes('--redub')) {
  const lines = [
    '# 재더빙 · 나레이션 리드 보강 (2026-08-07)',
    '# 아래를 타입캐스트에 그대로 붙여넣고, 나온 wav 를 한 폴더에 모아 주세요.',
    '# 목소리는 전부 진행 = ' + VOICE + ' 입니다.',
    '# ★이 파일은 「재더빙 대기 명단」이기도 합니다 — scripts/check-text-audio.mjs 가',
    '#   어긋난 자리와 이 파일을 양방향으로 대조합니다. 손으로 고치지 말고 --redub 로 다시 뽑으세요.',
    '# 대기 ' + badSlugs.length + '클립', ''
  ];
  for (const r of bad) {
    lines.push('[' + (r.ids[0] || '').split('_')[0] + '] ' + r.slug + (r.missing.length ? '   (신규)' : '   (수정)'));
    for (const t of sentsOf(r.screen)) lines.push(VOICE + ': ' + t);
    lines.push('');
  }
  // [NO_AUDIO] 소리가 아예 없는 클립 — 미리듣기에 안 나와도 녹음은 필요하다
  for (const r of noAudio) {
    if (bad.some((b) => b.slug === r.slug)) continue;
    lines.push('[' + r.no + '] ' + r.slug + '   (신규)');
    for (const t of sentsOf(r.screen)) lines.push(VOICE + ': ' + t);
    lines.push('');
  }
  fs.writeFileSync(REDUB, lines.join('\n'));
  console.log('\n→ 붙여넣기 파일을 다시 뽑았습니다: ' + path.relative(root, REDUB) + ' (' + bad.length + '클립)');
  process.exit(0);
}

// 대기 명단과 대조
let pend = [];
if (fs.existsSync(REDUB)) pend = [...fs.readFileSync(REDUB, 'utf8').matchAll(/^\[\d+\]\s+(\S+)/gm)].map((m) => m[1]);
const pendSorted = pend.slice().sort();
const onlyBad = badSlugs.filter((x) => !pendSorted.includes(x));
const onlyPend = pendSorted.filter((x) => !badSlugs.includes(x));

if (chorus.length) { console.log(`\n✗ 서약 합창이 어긋납니다.`); process.exit(1); }
if (!badSlugs.length && !pend.length) { console.log('\n✓ 화면 글과 소리가 전부 같습니다.'); process.exit(0); }
if (onlyBad.length || onlyPend.length) {
  console.log(`\n✗ 대기 명단(재더빙_리드보강.txt)이 실제와 다릅니다.`);
  onlyBad.forEach((x) => console.log(`   명단에 없는데 어긋남: ${x}  → node scripts/check-text-audio.mjs --redub`));
  onlyPend.forEach((x) => console.log(`   명단에 있는데 이제 맞음: ${x}  → 소리가 들어왔으면 명단에서 빼세요(--redub)`));
  process.exit(1);
}
console.log(`\n⏳ 녹음 대기 ${badSlugs.length}클립 — 전부 명단에 있습니다(재더빙_리드보강.txt).`);
console.log(`   글이 바뀐 것 ${bad.length} · 소리가 아직 없는 것 ${noAudio.filter((r) => !bad.some((b) => b.slug === r.slug)).length}`);
console.log('   글은 새 것 · 소리는 아직 옛 것입니다. 붙여넣기 → wav 수급 → 조립 후 이 줄이 사라집니다.');
