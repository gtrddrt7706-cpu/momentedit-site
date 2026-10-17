/* [PHOTO_SCENE_GUARD] 0=통과 1=어긋남 — 단체 사진 화면의 '식순 연동'이 실제 식순 이름과 맞는가.
 *
 * ■ 무엇을 지키나
 *   mypage.html 의 `PHOTO_SCENE`(식순에서 이어지는 장면)과 `PHOTO_FX_CARDS[].link.when`(연출 연동)은
 *   식순 초안의 `summary.flow` 에 실린 **블록 이름 문자열**로 맞춰 본다. 그 이름을 만드는 곳은
 *   order-preview.html 의 `BLOCK`(과 fullBlocks 가 뒤에 붙이는 '폐식·단체촬영') — 옛 코스 · 옛 초안.
 *   ★[FLOW_FROM_TWO_1017] 새 코스 흐름은 ② 줄 이름이다(_flowOpen → _lName → ritual-open.js CARDS[k].n · «준비한 순서» · «감사문»).
 *   그래서 link.when 은 **새 코스 이름**이어야 하고(새 초안과 맞아야 한다), 옛 이름은 link.old 로 함께 받는다.
 *
 * ■ 왜 검사가 필요한가 — 어긋나도 화면이 안 깨진다
 *   빌더가 '축배 · 케이크' 를 '축배' 로 줄이면, mypage 의 대조는 그냥 **거짓이 된다.**
 *   그러면 축배를 고른 고객에게 「식순에 축배가 없어요 · 잔을 따로 챙겨 드려요」가 뜨고,
 *   장면 목록에서는 그 줄이 조용히 사라진다. 오류도 없고 빈 화면도 아니라 아무도 모른다.
 *   그래서 이름 리터럴을 **양쪽에서 실제로 읽어** 대조한다.
 *
 * ■ 반대 방향(빌더에만 있는 이름)은 왜 실패로 안 보나
 *   '하객 맞이 안내'처럼 사진으로 남길 장면이 아닌 순서가 있고, 새 순서가 생겼는데
 *   장면을 아직 안 정했을 수도 있다. 그건 판단이지 결함이 아니라서 **경고로만** 알린다.
 *   반대로 mypage 에만 있는 이름은 항상 결함이다 — 영영 맞지 않는 대조이기 때문.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const mypage = readFileSync(join(ROOT, 'mypage.html'), 'utf8');
const builder = readFileSync(join(ROOT, 'order-preview.html'), 'utf8');

// 빌더가 실제로 만들 수 있는 블록 이름 전부 — {n:'…'} 리터럴을 그대로 긁는다
// [OPEN_COURSE 2026-09-25] 새 코스는 이름이 갈린다 — `{n:isOpen()?'부모님께 인사':'부모님 헌정'` 의 두 이름을 다 긁는다
// [SPEECH_TILE_1012 2026-10-12] 축사 칸은 판으로 이름이 갈린다 — `{n:(_k==='speech'?'축사':'준비한 순서')` 의 두 이름도 긁는다
const made = new Set([...builder.matchAll(/\{n:(?:isOpen\(\)\?)?'([^']+)'(?::'([^']+)')?/g), ...builder.matchAll(/\{n:\([^?()]*\?'([^']+)':'([^']+)'\)/g)].flatMap((m) => [m[1], m[2]]).filter(Boolean));
// [FLOW_FROM_TWO_1017] 새 코스 흐름 이름 — ritual-open.js CARDS 의 n 리터럴(4칸 들여쓴 «key: { n: '…'» 줄)
const openSrc = readFileSync(join(ROOT, 'assets', 'ritual-open.js'), 'utf8');
const cardNames = [...openSrc.matchAll(/^\s{4}\w+: \{ n: '([^']+)'/gm)].map((m) => m[1]);
if (cardNames.length < 12) { console.log(`✖ ritual-open.js CARDS 이름을 ${cardNames.length}개밖에 못 읽었다 — 리터럴 형태가 바뀐 듯하다`); process.exit(1); }
const openNames = new Set([...cardNames, '준비한 순서', '감사문']);
for (const n of openNames) made.add(n);
if (made.size < 10) {
  console.log(`✖ order-preview.html 에서 블록 이름을 ${made.size}개밖에 못 읽었다 — 리터럴 형태가 바뀐 듯하다`);
  process.exit(1);
}

// mypage 쪽 — PHOTO_SCENE 배열의 n, 그리고 PHOTO_FX_CARDS 의 link.when
const sceneBlock = mypage.match(/var PHOTO_SCENE=\[([\s\S]*?)\n\];/);
if (!sceneBlock) { console.log('✖ mypage.html 에서 PHOTO_SCENE 배열을 못 찾았다'); process.exit(1); }
const scenes = [...sceneBlock[1].matchAll(/\{n:'([^']+)'/g)].map((m) => m[1]);
const whens = [...mypage.matchAll(/link:\{when:'([^']+)'/g)].map((m) => m[1]);
const olds = [...mypage.matchAll(/link:\{when:'[^']+',\s*old:'([^']+)'/g)].map((m) => m[1]);   // [FLOW_FROM_TWO_1017] 옛 초안 이름

if (!scenes.length) { console.log('✖ PHOTO_SCENE 이 비어 있다'); process.exit(1); }
if (!whens.length) { console.log('✖ PHOTO_FX_CARDS 에 link.when 이 하나도 없다 — 연동이 통째로 빠졌다'); process.exit(1); }

let bad = 0;
for (const [label, list] of [['PHOTO_SCENE', scenes], ['link.when', whens], ['link.old', olds]]) {
  for (const n of list) {
    const ok = made.has(n);
    if (!ok) bad++;
    console.log(`  ${ok ? '·' : '✖'} ${label}: ${n}${ok ? '' : '  ← 빌더에 이 이름의 블록이 없다'}`);
  }
}

// [FLOW_FROM_TWO_1017] link.when 은 새 코스 이름이어야 한다 — 옛 이름(«축배 · 케이크»)만 적으면 새 초안과 영영 안 맞아,
//   축배를 담은 두 분에게 «식순에 축배가 없어요 · 잔을 따로 챙겨 드려요»가 뜬다. 옛 이름은 link.old 로.
for (const w of whens) if (!openNames.has(w)) { bad++; console.log(`  ✖ link.when: ${w}  ← 새 코스 흐름(② 이름)에 없는 이름 — 옛 이름은 link.old 로 [FLOW_FROM_TWO_1017]`); }

// 경고만 — 빌더에는 있는데 장면을 안 정한 순서(사진으로 남길 것이 아닐 수 있다)
const known = new Set([...scenes, ...whens, '하객 맞이 안내', '입장 멘트', '첫인사 진행', '사이 순서']);
const unmapped = [...made].filter((n) => !known.has(n));
if (unmapped.length) console.log(`  · (경고) 장면을 안 정한 순서: ${unmapped.join(' · ')}`);

console.log(bad ? `틀림 ${bad}건 — mypage PHOTO_SCENE/link.when 이 식순 블록 이름과 어긋난다` : '식순 연동 이름 통과');
process.exit(bad ? 1 : 0);
