/* [RETIRED_SCENE] 0=통과 1=어긋남 — 폐지한 순서의 이름이 고객 화면에 남아 있나.
 *
 * ■ 왜 이 검사가 새로 필요한가 — 옆의 check-photo-scene 이 못 보는 자리다
 *   check-photo-scene 은 mypage 의 이름이 order-preview 에 **있나**를 본다.
 *   그런데 폐지한 순서는 파일에서 지우지 않는다 — 클립 번호가 밀리기 때문이다
 *   (SONG_RETIRED · RINGWARM_RETIRED · WINE_RETIRED 가 전부 같은 처방).
 *   그래서 폐지된 이름도 «있긴 있다». 대조는 초록인데 고객은 없어진 순서를 약속받는다.
 *   실제로 두 번 새어 나갔다(2026-08-16 코드 세션 실측):
 *     mypage `PHOTO_SCENE` 에 「와인 세리머니」·「케이크 커팅」·「축가」가 남아 있었다.
 *     바로 위에 RINGWARM_RETIRED 를 조심하라는 주석이 붙어 있는 채로.
 *   ★그래서 왼쪽을 「파일에 있나」가 아니라 **「고를 수 있나」**로 옮긴다.
 *
 * ■ 고를 수 있다 = 셋 중 하나
 *   ① 코스 기본 순서(COURSES[c].seq)  ② 코스 옵션(COURSES[c].opt)  ③ 팔레트(GADD)
 *   셋 어디에도 없는 키는 **새로 넣을 길이 없다** — 그게 이 저장소가 말하는 '폐지'다.
 *
 * ■ 무엇을 실패로 보나
 *   폐지된 키의 블록 함수가 만드는 이름이 고객 화면(mypage.html)에 나오면 실패.
 *   ★관리자 화면·콘솔의 «옛 값 읽어 주기»는 실패가 아니다 — 이미 저장된 초안을 사람이
 *     읽으려면 라벨이 있어야 한다(order-preview 의 LEGACY_LABEL 과 같은 이유).
 *     고객에게 «앞으로 있을 일»로 보이는 자리만 본다.
 */
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import vm from 'node:vm';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const rd = (f) => readFileSync(join(ROOT, f), 'utf8');
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

// ── ① 코스가 무엇을 쓰나 — 원천(ritual-data.js)에서 실제로 읽는다
const ctx = { console }; ctx.window = ctx; ctx.self = ctx; vm.createContext(ctx);
vm.runInContext(rd('assets/ritual-data.js') + '\nthis.__C = COURSES;', ctx, { filename: 'ritual-data.js' });
const COURSES = ctx.__C;
if (!COURSES || !Object.keys(COURSES).length) { no('ritual-data.js 에서 COURSES 를 못 읽었다'); process.exit(1); }

const reach = new Set();
for (const c of Object.values(COURSES)) {
  for (const k of (c.seq || [])) reach.add(k);
  for (const o of (c.opt || [])) reach.add(o.k || o);
}

// ── ② 팔레트 — 빌더의 GADD 리터럴
const builder = rd('order-preview.html');
const gadd = builder.match(/var GADD=\{([^}]*)\}/);
if (!gadd) { no('order-preview.html 에서 GADD 를 못 찾았다 — 리터럴 모양이 바뀌었다면 이 검사도 같은 커밋에서 고칠 것'); process.exit(1); }
for (const m of gadd[1].matchAll(/([a-zA-Z]+)\s*:/g)) reach.add(m[1]);

// ── ③ 블록 함수가 있는 키 전부 · 그중 못 닿는 키가 폐지된 키다
const blockObj = builder.slice(builder.indexOf('var BLOCK={'));
/* ★식순 키의 «전체 목록»은 RANK 다 — 순서를 매기려면 모든 키가 거기 있어야 하기 때문이다.
   BLOCK 안의 `키:function(){` 만 긁으면 식순과 무관한 함수(chips·onOpen…)까지 딸려 와
   「폐지된 키」 목록이 잡음으로 불어난다. 잡음이 섞인 목록은 진짜 하나를 가린다. */
const rank = builder.match(/var RANK=\{([^}]*)\}/);
if (!rank) { no('order-preview.html 에서 RANK 를 못 찾았다 — 리터럴 모양이 바뀌었다면 이 검사도 같은 커밋에서 고칠 것'); process.exit(1); }
const keys = [...rank[1].matchAll(/([a-zA-Z]+)\s*:/g)].map((m) => m[1]);
if (keys.length < 8) { no(`RANK 에서 키를 ${keys.length}개밖에 못 읽었다 — 모양이 바뀐 듯하다`); process.exit(1); }
const retired = keys.filter((k) => !reach.has(k));

// ── ④ 폐지된 키의 블록 함수가 만드는 이름 — 그 함수 몸통 안의 {n:'…'} 만 본다
const nameOf = (k) => {
  const at = blockObj.indexOf(`\n  ${k}:function(){`);
  if (at < 0) return [];
  const next = keys.map((x) => blockObj.indexOf(`\n  ${x}:function(){`)).filter((i) => i > at).sort((a, b) => a - b)[0];
  const body = blockObj.slice(at, next > 0 ? next : at + 4000);
  return [...body.matchAll(/\{n:'([^']+)'/g)].map((m) => m[1]);
};

// ── ⑤ 고객 화면에 그 이름이 «앞으로 있을 일»로 남아 있나
const mypage = rd('mypage.html');
const sceneBlock = mypage.match(/var PHOTO_SCENE=\[([\s\S]*?)\n\];/);
if (!sceneBlock) { no('mypage.html 에서 PHOTO_SCENE 을 못 찾았다'); process.exit(1); }
const scenes = [...sceneBlock[1].matchAll(/\{n:'([^']+)'/g)].map((m) => m[1]);
const whens = [...mypage.matchAll(/link:\{when:'([^']+)'/g)].map((m) => m[1]);

console.log(`고를 수 있는 순간 ${reach.size}개 · 폐지된 키 ${retired.length}개 — ${retired.join(' · ') || '없음'}`);
for (const k of retired) {
  const names = nameOf(k);
  if (!names.length) { console.log(`  ${k.padEnd(10)} (이름 리터럴 없음 — 볼 것이 없다)`); continue; }
  console.log(`  ${k.padEnd(10)} ${names.join(' · ')}`);
  for (const n of names) {
    if (scenes.includes(n)) no(`mypage PHOTO_SCENE 에 「${n}」 이 남아 있다 — '${k}' 는 폐지돼 고를 길이 없다. 두 분에게 없어질 순서의 사진 장면을 약속하는 셈이다`);
    if (whens.includes(n)) no(`mypage 연출 연동(link.when)이 「${n}」 을 가리킨다 — '${k}' 는 폐지돼 그 자리가 영영 안 온다`);
  }
}

/* ── ⑥ AI 상담사 지식(고객이 그대로 읽는다)에 «권하지 말 것»이 적혀 있나
   이름이 나오는 것 자체는 괜찮다 — 옛 초안을 쥔 두 분이 물으면 답해야 한다(링 워밍과 같은 처리).
   봐야 하는 것은 **그 줄이 폐지라고 말하는가**다.
   ★[SELF_FIRST_ONLY] 처음 쓴 판은 ①`indexOf` 로 «첫 등장»만 보고 ②앞뒤 400자 «창»을 봤다.
     자가검사에서 축가의 폐지 표시를 떼어 봤더니 **안 붉어졌다** — 창이 바로 윗줄
     「(폐지) 와인 세리머니…」의 '폐지'를 제 것으로 셌기 때문이다.
     그래서 줄 단위로, 모든 등장을 본다. 창으로 보면 옆 줄이 알리바이를 대 준다. */
const kb = rd('api/_ritual-kb.js');
/* ★[COMMENT_BLANK] 주석을 «줄 첫 글자»로 가리려 했더니 블록 주석의 **이어지는 줄**을 놓쳤다
   (`   ★문안 자체는 남긴다 …` 처럼 별표로 시작하는 줄). 실측으로 붉어져서 알았다.
   그러니 짐작하지 말고 주석 구간을 통째로 비운다 — 줄 번호는 살려 둬야 안내가 쓸모 있다. */
const kbScan = kb
  .replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' '))
  .replace(/^[ \t]*\/\/.*$/gm, (m) => m.replace(/[^\n]/g, ' '));
const kbLines = kbScan.split('\n');
for (const k of retired) {
  for (const n of nameOf(k)) {
    for (let i = 0; i < kbLines.length; i++) {
      const ln = kbLines[i];
      if (!ln.includes(n)) continue;                      // (주석은 위에서 이미 비웠다)
      if (/폐지|RETIRED/.test(ln)) continue;               // 그 줄이 스스로 폐지라고 말한다
      no(`api/_ritual-kb.js:${i + 1} 가 「${n}」 을 말하는데 그 줄에 '폐지' 표시가 없다 — AI 가 고를 수 있는 순간으로 읽고 권한다\n     ${ln.trim().slice(0, 90)}`);
    }
  }
}

if (bad) { console.error(`\n폐지한 순서가 ${bad}자리에서 살아 있습니다. 되살리지 말고 그 자리를 지우세요.`); process.exit(1); }
console.log('RETIRED_SCENE OK — 폐지한 순서가 고객 화면·AI 지식에 남아 있지 않다');
