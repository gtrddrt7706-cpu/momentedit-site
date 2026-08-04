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
for (const k of ['bless', 'valley', 'ringwarm', 'welcome', 'tribute', 'toast', 'song', 'letter']) {
  const e = {}; e[k] = true;
  states.push({ ...base, extra: e });
  states.push({ ...base, extra: e, entryVoice: 'couple', guestVoice: 'couple' });
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

const rows = [...seen.values()].sort((a, b) => (a.k + a.slug).localeCompare(b.k + b.slug));
const bad = rows.filter((r) => !r.ok && !r.noText);
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
if (bad.length) { console.log(`\n✗ ${bad.length}곳에서 화면 글과 소리가 다릅니다.`); process.exit(1); }
console.log('\n✓ 화면 글과 소리가 전부 같습니다.');
