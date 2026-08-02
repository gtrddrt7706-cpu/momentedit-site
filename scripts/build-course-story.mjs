#!/usr/bin/env node
// 모먼트에디트 · 코스별 장면 대본 생성 + 장면 레이어 커버리지 검사   [STORY_COVER]
// 기획서 §1 트랙 1 · §5 순서표 「지금」 행.
//
// 두 가지를 한다.
//   ①검사 — 전 코스·전 축을 돌려 나오는 모든 블록(blockN)과 모든 사람 구간(live.t)이
//     장면 레이어(assets/ritual-story.js)에서 해석되는지 본다. 하나라도 빠지면 EXIT=1.
//     반대로 아무 조합에서도 안 나오는 죽은 문안도 EXIT=1로 잡는다(자산이 아니라 함정이다).
//   ②생성 — 코스 5종의 장면 대본 md를 docs/plans/식순연구/에 쓴다.
//     이 md가 곧 미리듣기(쓰임 B) 화면에 나갈 텍스트이자, 미작성 런북 B·C의 초안이다.
//
// ★검사가 성립하는 근거 — BUILD[k](S)는 서로를 참조하지 않는다(ritual-cue.js 블록 독립).
//   그래서 축을 하나씩 흔든 합집합이 전조합의 합집합과 같다. 41만 조합을 다 돌 필요가 없다.
//   ※블록이 서로를 참조하기 시작하면 이 전제가 깨진다 — 그때는 여기 SWEEP을 곱집합으로 바꿀 것.
//
// ★왜 개수가 아니라 원문을 대조하는가 — v0.6.6 교훈("개수를 세는 검사는 엉뚱한 내용이
//   들어온 것을 못 잡는다"). 장면 레이어의 키는 live.t 원문 그 자체라, 진행 지문을
//   ritual-cue.js에서 한 글자만 고쳐도 여기서 미커버로 떨어진다. 한쪽만 고치고 화면이
//   조용히 낡아 가는 사고를 구조로 막는다.
//
// 실행: node scripts/build-course-story.mjs            (검사 + md 생성)
//       node scripts/build-course-story.mjs --check    (검사만 · merge-guard가 쓰는 모드)
import { createRequire } from 'module';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const require = createRequire(path.join(ROOT, 'package.json'));
const D  = require(path.join(ROOT, 'assets/ritual-data.js'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));
const ST = require(path.join(ROOT, 'assets/ritual-story.js'));

const CHECK_ONLY = process.argv.includes('--check');
const OUT_DIR = path.join(ROOT, 'docs/plans/식순연구');
// 코스 문자는 docs/plans/식순연구/코스설계_v1.md가 원천 (A·B·C만 부여됨)
const LETTER = { damback: 'A', gamdong: 'B', family: 'C', minimal: '', festive: '' };

let fail = 0, warn = 0;
const bad  = (m) => { console.log('  FAIL ' + m); fail = 1; };
const soft = (m) => { console.log('  warn ' + m); warn++; };

// ── 1. 전 축 스윕 — 나오는 blockN·live.t를 전부 모은다
const SWEEP = {
  declareWho: ['narr', 'chorus', 'ask', 'family'], declare: ['1', '2'],
  valley: ['none', 'wine', 'cake'], letter: ['parent', 'each', 'both'],
  bless: ['on', 'off'], veil: ['mother', 'father', 'close', 'skip'],
  ringwarm: ['family', 'all'], tribute: ['flower', 'bow', 'hug'],
  toast: ['toast', 'cake', 'both'], song: ['family', 'live'],
  blessProxy: [false, true], ring: ['on', 'off'], digital: [false, true],
  entry: Object.keys(D.ENTRY), guestVoice: ['nar', 'couple'], entryVoice: ['nar', 'couple'],
  welcome: ['self'], vow: ['ok']
};
const GADD_KEYS = ['veil', 'welcome', 'bless', 'ringwarm', 'valley', 'letter', 'tribute', 'toast', 'song'];
const ALL_ON = Object.fromEntries(GADD_KEYS.map(g => [g, true]));

const seenBlock = new Map();          // blockN -> Set(k)
const seenLive  = new Map();          // live.t -> {blockN,k,doing,self,fb:Set,slugs:Set,modes:Set}
// ★CAST_COVER — 배역 예시가 붙는 자리를 같은 스윕으로 함께 훑는다
const hitKey  = new Set();            // 실제로 이긴 CAST_AT 키 (배열 참조로 판정 — 규칙을 다시 쓰지 않는다)
const hitId   = new Set();            // 실제로 재생 대상이 된 클립 id
const seenBadge = new Map();          // 배지 문구 -> {roles:Set, where:'…'}
const ownDead = new Map();            // own:true 인데 배역이 안 붙는 큐
let builds = 0;

function absorb(S, mode) {
  builds++;
  for (const c of RC.build(S, { mode }).cues) {
    if (!seenBlock.has(c.blockN)) seenBlock.set(c.blockN, new Set());
    seenBlock.get(c.blockN).add(c.k);
    absorbCast(c);                     // ★live 가 없는 큐(하객 맞이 4개)도 own: 으로 배역이 붙는다
    if (!c.live) continue;
    const t = c.live.t;
    if (!seenLive.has(t)) seenLive.set(t, { blockN: c.blockN, k: c.k, doing: c.live.doing || '', self: !!c.live.self, fb: new Set(), slugs: new Set(), modes: new Set() });
    const e = seenLive.get(t);
    e.modes.add(mode); e.slugs.add(c.slug || '(무클립)');
    if (c.live.fallback) e.fb.add(c.live.fallback);
  }
}

/* 큐 하나에서 배역이 어떻게 풀리는지 기록한다.
   ★어떤 CAST_AT 키가 이겼는지는 '배열 참조'로 판정한다 — castIds 의 우선순위 규칙(slug → live,
   own 은 slug → k)을 여기에 다시 적으면, 규칙이 바뀌는 날 검사만 낡은 규칙을 지키게 된다. */
function absorbCast(c) {
  const ids = ST.castIds(c);
  for (const [kind, arr] of [['main', ids.main], ['live', ids.live]]) {
    if (!arr) continue;
    for (const [k, v] of Object.entries(ST.CAST_AT)) if (v === arr) hitKey.add(k);
    arr.forEach(id => hitId.add(id));
    const list = kind === 'main' ? ST.castMainOf(c) : ST.castLiveOf(c);
    const badge = ST.castBadgeOf(list);
    if (!seenBadge.has(badge)) seenBadge.set(badge, { roles: new Set(), where: `${c.blockN} · ${kind}` });
    list.forEach(o => seenBadge.get(badge).roles.add(o.role));
  }
  if (ids.main && ids.live) bad(`큐 '${c.name}' — main·live 양쪽에 배역이 걸린다. 한쪽이 다른 쪽을 조용히 먹는다(CAST_TWO_SLOTS)`);
  if (c.own && !ids.main) ownDead.set(c.slug || c.k, c.name);
}
for (const course of Object.keys(D.COURSES)) {
  // ①확장 옵션 전조합(2^9) — seq에 들어올 수 있는 블록 전수
  for (let m = 0; m < (1 << GADD_KEYS.length); m++) {
    const extra = {}; GADD_KEYS.forEach((g, i) => { if (m & (1 << i)) extra[g] = true; });
    absorb({ course, extra }, 'console');
  }
  // ②축 스윕 × (확장 전부 on / 전부 off) × (콘솔 / 미리듣기)
  for (const [ax, vals] of Object.entries(SWEEP)) for (const v of vals) for (const ex of [ALL_ON, {}]) for (const mode of ['console', 'preview']) {
    absorb({ course, extra: { ...ex }, [ax]: v }, mode);
  }
}

// ── 2. 커버리지 판정
console.log(`[STORY_COVER] 빌드 ${builds}회 · 블록 ${seenBlock.size}종 · 사람 구간 ${seenLive.size}종`);

// 2-a. detail[]이 이미 설명하는 블록 목록 (원천) — ALIAS로 표기 흔들림을 명시적으로 잇는다
const detailN = new Map();            // 큐의 blockN -> [코스…]
for (const [ck, cv] of Object.entries(D.COURSES)) for (const d of (cv.detail || [])) {
  const b = ST.aliasOf(d.n);
  if (!detailN.has(b)) detailN.set(b, []);
  detailN.get(b).push(ck);
}
for (const [n, b] of Object.entries(ST.ALIAS)) {
  const anyN = Object.values(D.COURSES).some(c => (c.detail || []).some(d => d.n === n));
  if (!anyN) bad(`ALIAS 키 '${n}' — detail[].n에 그런 이름이 없다(별칭이 낡았다)`);
  if (!seenBlock.has(b)) bad(`ALIAS 값 '${b}' — 큐가 내는 blockN이 아니다`);
}

// 2-b. 모든 blockN이 detail 또는 STORY.BLOCK 중 정확히 한 곳에서만 설명되는가
for (const [b, ks] of [...seenBlock].sort()) {
  const inDetail = detailN.has(b), inStory = !!ST.BLOCK[b];
  if (inDetail && inStory) bad(`블록 '${b}' — detail[]과 STORY.BLOCK 양쪽에 설명이 있다(두 군데가 되면 한쪽만 고치는 날이 온다)`);
  else if (!inDetail && !inStory) bad(`블록 '${b}' [k:${[...ks].join(',')}] — 설명이 없다. assets/ritual-story.js의 BLOCK에 추가할 것`);
}
for (const b of Object.keys(ST.BLOCK)) if (!seenBlock.has(b)) bad(`STORY.BLOCK '${b}' — 어떤 조합에서도 안 나오는 죽은 블록`);

// 2-c. 모든 사람 구간이 장면 지문을 갖는가 + 원문 대조
for (const [t, e] of seenLive) {
  const s = ST.LIVE[t];
  if (!s) { bad(`사람 구간 미커버 [${e.blockN} · k=${e.k} · ${e.doing}] — assets/ritual-story.js의 LIVE에 이 키를 추가할 것\n         키: '${t}'`); continue; }
  if (!s.scene) bad(`장면 지문 없음 — '${t.slice(0, 30)}…'`);
  if (!s.who)   bad(`who 없음 — '${t.slice(0, 30)}…'`);
  if (e.self && !e.doing) bad(`self인데 doing이 없다(LIVE_DOING) — '${t.slice(0, 30)}…'`);
  // 디렉터 용어가 고객판에 새어 들어왔는가
  for (const w of ['디렉터', '나레이션이 흐르는 동안 →', 'BGM', '클립']) {
    if ((s.scene || '').includes(w)) bad(`고객 지문에 내부 용어 '${w}' — '${t.slice(0, 24)}…'`);
  }
  // 안전망(fallback)이 있는 자리는 고객에게 반드시 알려 준다 + 원문 대조
  const fbs = [...e.fb];
  if (fbs.length && !s.safe) bad(`안전망 안내 없음 — 이 자리는 실패 시 동작이 정의돼 있는데 고객에게 안 알려 준다\n         키: '${t.slice(0, 40)}…' / fallback: '${fbs[0]}'`);
  if (fbs.length && s.safe && !fbs.includes(s.fbSrc)) bad(`fbSrc 원문 불일치 — ritual-cue.js의 fallback이 바뀌었다\n         STORY.fbSrc : '${s.fbSrc}'\n         실제 fallback: ${fbs.map(x => `'${x}'`).join(' / ')}`);
  if (!fbs.length && s.safe) bad(`safe가 남아 있는데 fallback이 사라졌다 — '${t.slice(0, 30)}…'`);
  // 콘솔 전용 표시가 실제 도달 범위와 맞는가
  const inPreview = e.modes.has('preview');
  if (inPreview && s.only === 'console') bad(`only:'console'인데 미리듣기에도 나온다 — '${t.slice(0, 30)}…'`);
  if (!inPreview && s.only !== 'console') bad(`미리듣기에 안 나오는 자리인데 only:'console' 표시가 없다 — '${t.slice(0, 30)}…'`);
}
for (const t of Object.keys(ST.LIVE)) if (!seenLive.has(t)) bad(`STORY.LIVE 죽은 문안 — 어떤 조합에서도 안 나오는 키\n         '${t}'`);

// ── 2-d. 배역 예시 커버리지 [CAST_COVER]
//   배역 클립은 '고객 화면에서만' 쓰인다. 디렉터 화면은 이 표를 한 번도 읽지 않으므로,
//   여기서 안 잡으면 틀린 채로 고객에게만 보인다 — 우리 눈에는 끝까지 안 띈다.
{
  const MF = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json');
  const man = JSON.parse(fs.readFileSync(MF, 'utf8'));
  const mCast = new Map(man.clips.filter(c => c.dir === 'assets/audio/cast').map(c => [`${c.no}_${c.file}`, c.role]));

  // ①표와 대본이 같은 자를 쓰는가 — CAST 는 재생이, manifest 는 녹음이 읽는다. 갈리면 엉뚱한 목소리가 나간다
  for (const [id, c] of Object.entries(ST.CAST)) {
    if (!mCast.has(id)) bad(`CAST '${id}' — manifest 의 배역 클립에 없다(대본에 없는 음원을 재생하려 한다)`);
    else if (mCast.get(id) !== c.role) bad(`CAST '${id}' 역할 불일치 — 표 '${c.role}' vs 대본 '${mCast.get(id)}'`);
  }
  for (const id of mCast.keys()) if (!ST.CAST[id]) bad(`manifest 배역 '${id}' — CAST 표에 없다(녹음해 놓고 어디서도 안 쓴다)`);

  // ②죽은 키·죽은 클립 — 자산이 아니라 함정이다(2-b·2-c와 같은 기준)
  for (const k of Object.keys(ST.CAST_AT)) if (!hitKey.has(k)) bad(`CAST_AT '${k}' — 어떤 조합에서도 안 걸리는 죽은 키`);
  for (const arr of Object.values(ST.CAST_AT)) for (const id of arr) if (!ST.CAST[id]) bad(`CAST_AT 가 없는 클립 '${id}' 을 가리킨다`);
  for (const id of Object.keys(ST.CAST)) if (!hitId.has(id)) bad(`CAST '${id}' — 어떤 조합에서도 재생되지 않는다`);

  // ③두 분 목소리를 골랐는데 그 자리에 예시가 없다 — 고객이 기대한 것과 화면이 어긋난다
  for (const [k, name] of ownDead) bad(`own 자리 '${name}'(${k}) — 두 분 목소리를 골랐는데 배역 예시가 안 붙는다. CAST_AT 에 'own:${k}' 를 추가할 것`);

  // ④배지 문구 — 두 사람 이상이 말하는 자리에서 한 사람 문구가 남으면 화면이 나머지를 지운다
  const solo = new Set(Object.values(ST.CAST_SAY));
  for (const [badge, e] of seenBadge) {
    if (!badge) { bad(`배역이 붙는데 배지 문구가 빈다 [${e.where}] — 고객이 '왜 남의 목소리가 나오지' 하게 된다`); continue; }
    if (e.roles.size > 1 && solo.has(badge)) {
      bad(`배지가 한 사람만 말한다 [${e.where}] — 자리에는 ${[...e.roles].join('·')} 가 있는데 문구는 '${badge}'`);
    }
  }
  console.log(`[CAST_COVER] 클립 ${Object.keys(ST.CAST).length}종 · 자리 ${hitKey.size}/${Object.keys(ST.CAST_AT).length} · 배지 ${seenBadge.size}종`);
  for (const [b2, e] of [...seenBadge].sort()) console.log(`             · ${b2}  [${[...e.roles].join('·')}]`);
}

console.log(fail ? '[STORY_COVER] FAIL' : `[STORY_COVER] ok — 블록 ${seenBlock.size}/${seenBlock.size} · 사람 구간 ${seenLive.size}/${seenLive.size} 커버${warn ? ` (경고 ${warn})` : ''}`);
if (fail) process.exit(1);
if (CHECK_ONLY) process.exit(0);

// ── 3. 코스별 장면 대본 md 생성
const mmss = (s) => `${Math.floor(s / 60)}:${String(Math.round(s % 60)).padStart(2, '0')}`;
const DOING = { say: '직접 말하는 시간', move: '움직이는 시간', sing: '노래가 흐르는 시간' };

function blockIntro(blockN, course) {
  if (ST.BLOCK[blockN]) return ST.BLOCK[blockN];
  const d = (D.COURSES[course].detail || []).find(x => ST.aliasOf(x.n) === blockN);
  return d ? { how: d.how, fx: d.fx, pick: d.pick } : null;
}

const written = [];
for (const [course, cv] of Object.entries(D.COURSES)) {
  const built = RC.build({ course }, { mode: 'preview' });
  const { cues, S, meta } = built;
  // ★FIRE_FROM_CONSOLE — 큐가 어떻게 넘어가는지는 '당일 진행' 기준이 진실이다.
  //   preview 빌드는 모든 fire를 chain으로 눕히고(첫 큐만 manual) clock 시각까지 지운다.
  //   그 상태의 meta.manual(=1)을 머리글에 쓰면서 칸 배지는 manualInConsole로 찍으면
  //   같은 문서가 "손으로 1번"이라 써 놓고 손 표시를 열 번 하는 거짓말을 한다.
  const conCues = RC.build({ course }, { mode: 'console' }).cues;
  const fireBy = new Map();
  for (const c of conCues) {
    if (fireBy.has(c.slug)) { bad(`slug 중복 '${c.slug}' (${course}) — 진행 방식 대조가 어긋난다`); continue; }
    fireBy.set(c.slug, { fire: c.fire, atMin: c.atMin });
  }
  const fireOf = (c) => fireBy.get(c.slug) || { fire: c.manualInConsole ? 'manual' : 'chain' };
  const nFire = (k) => cues.filter(c => fireOf(c).fire === k).length;
  const L = LETTER[course];
  const title = L ? `코스 ${L} "${cv.nm}"` : `코스 "${cv.nm}"`;
  const o = [];
  o.push(`# 장면 대본 · ${title}`, '');
  o.push('> ★자동 생성 — 손으로 고치지 말 것. `node scripts/build-course-story.mjs`가 다시 쓴다.');
  o.push('> 원천: `assets/ritual-data.js`(문안·순서) + `assets/ritual-cue.js`(큐·사람 구간) + `assets/ritual-story.js`(장면 지문)');
  o.push(`> 고칠 곳 — 나레이션 문안은 \`ritual-data.js\`, 진행 지문은 \`ritual-cue.js\`, 고객이 읽는 장면은 \`ritual-story.js\`.`);
  o.push('>');
  o.push(`> 이 문서는 **고객 미리듣기(쓰임 B) 화면에 나갈 텍스트 그대로**이고, ${L ? `**런북 코스 ${L}**의 초안` : '내부 리허설 대본'}을 겸한다.`, '');
  o.push(`**${cv.badge} · ${cv.min}** — ${cv.one}`, '');
  o.push(cv.feel, '');
  o.push(`기본 설정 — 입장 \`${S.entry}\` · 성혼 선언 \`${S.declareWho}\` · 편지 \`${S.letter}\` · 반지 \`${S.ring}\` · 덕담 \`${S.bless}\``);
  o.push('');
  o.push(`큐 ${meta.total}개 — 당일 진행 기준 · 손으로 넘기는 자리 ${nFire('manual')}번 · 시각에 맞춰 나가는 자리 ${nFire('clock')}번 · 저절로 넘어가는 자리 ${nFire('chain')}번`);
  o.push('');
  o.push('> 미리듣기에서는 사람을 기다리지 않고 전부 저절로 흘러가요. `손으로` 표시는 예식 당일에 저희가 옆에서 넘겨 드리는 자리예요.');
  o.push('');
  o.push(`들리는 말 ${mmss(meta.clipSec)} · 사람의 시간(실제) ${mmss(cues.reduce((a, c) => a + (c.live ? (c.live.fullEst || c.live.est) : 0), 0))} · 기준 ${cv.min}`);
  if (meta.noClip) o.push(`> ⚠️ 녹음 클립이 없는 큐 ${meta.noClip}개 — 화면에 글로만 지나간다.`);
  o.push('');

  let curBlock = null, n = 0;
  for (const c of cues) {
    if (c.blockN !== curBlock) {
      curBlock = c.blockN; n++;
      const bi = blockIntro(curBlock, course);
      o.push('', `## ${n}. ${curBlock}`, '');
      if (bi) {
        o.push(bi.how);
        if (bi.fx) o.push('', `*${bi.fx}*`);
        if (bi.pick) o.push('', `**고를 수 있어요** — ${bi.pick}`);
      }
      o.push('');
    }
    const f = fireOf(c);
    const fireK = f.fire === 'clock'
      ? (f.atMin < 0 ? `시작 ${-f.atMin}분 전` : `시작 후 ${f.atMin}분`)
      : (f.fire === 'manual' ? '손으로' : '자동');
    o.push(`### ${c.no ? c.no + ' · ' : ''}${c.name}  \`${fireK}\``);
    if (c.pick) o.push(`선택: **${c.pick}**`);
    o.push('');
    if (c.text) o.push(`🔊 ${c.own ? '두 분 목소리' : '안내 음성'} (${mmss(c.est)})`, '', `> ${c.text}`, '');
    else o.push('*(소리 없음 · 글로만 지나가는 자리)*', '');
    if (c.alt) o.push(`↩︎ 앞 사람 구간이 ${Math.round(c.alt.overSec / 60)}분을 넘기면 이 문안 대신 **${c.alt.name}**이 나간다 — ${c.alt.why}`, '', `> ${c.alt.text}`, '');
    if (c.live) {
      const s = ST.LIVE[c.live.t];
      const full = c.live.fullEst || c.live.est;
      o.push(`### 🎬 ${c.live.self ? (DOING[c.live.doing] || '사람의 시간') : '기다리는 시간'} — ${s.who} · 약 ${mmss(full)}`, '');
      o.push(s.scene);
      if (s.tip)  o.push('', `💡 ${s.tip}`);
      if (s.safe) o.push('', `🛟 ${s.safe}`);
      o.push('');
    }
  }
  o.push('', '---', '', `*생성: \`node scripts/build-course-story.mjs\` · 장면 지문 ${Object.keys(ST.LIVE).length}종 중 이 코스가 쓰는 것 ${cues.filter(c => c.live).length}종*`, '');

  const fn = path.join(OUT_DIR, `장면대본_${L ? '코스' + L + '_' : ''}${cv.nm}.md`);
  fs.writeFileSync(fn, o.join('\n'), 'utf8');
  written.push(`${path.basename(fn)}  (${o.join('\n').length.toLocaleString()}자 · 큐 ${meta.total})`);
}
console.log('[STORY_COVER] 생성:\n  ' + written.join('\n  '));
