// 이 자리를 **비워도 되나** [DROP_GUARD]
//
//   import { dropGuard } from './lib/drop-guard.mjs';
//   const G = dropGuard();  G.of('26_narr-close')  →  { empty:false, kind:'나레이션', why:'…' }
//
// ★왜 만드나 — 2026-08-17 사용자 지시
//   *"버림으로 체크해도 이 부분의 안내가 없으면 안 된다고 판단이 들면 너가 같이 적은 이유를 보고
//     적절한 문장으로 변경 적용하자"*
//
// ★★「엔진이 부르나」만으로는 못 가른다 — 실측으로 알았다
//   실청에서 「다시」로 찍힌 기존 클립 56개 중 엔진(Cue.build)이 부르는 것은 49개였다.
//   나머지 7개를 「비워도 된다」로 넘길 뻔했는데, 하나씩 보니 그중 **5개는 비우면 안 되는 자리**다:
//     24_vow-both-1        합창 클립 `26_vow-both` 의 **재료**다. 지우면 합성이 깨진다
//     49_bridge-4-wait-emotion · 50_bridge-5-wait-setup   콘솔에서 **진행자가 눌러** 튼다
//     32_declare-family    폴백 — 가족이 부담스러워하면 그 자리에서 바로 튼다
//     25_narr-bless-end-long  덕담이 길어질 때 런타임에 바뀌는 클립
//   진짜로 비워도 되는 것은 이미 폐지한 2개뿐이었다(46_end-1b-farewell-online · 55_narr-song-out).
//   ★즉 엔진은 «식순대로 갔을 때 나는 소리»만 안다. 식장에서 나는 소리는 그보다 넓다.
//
// ★그래서 모르는 자리는 «비워도 된다»로 넘기지 않는다 — **확인 필요**로 남긴다.
//   이 저장소의 오랜 규칙과 같다: 구멍을 발견하면 합의 전에 메우지 않는다.
//   자리를 비우는 쪽은 되돌리기 비싸다(문안을 다시 짓고 소리를 다시 받아야 한다).
//   반대로 «확인 필요»를 잘못 붙이는 값은 사람이 한 번 보는 것뿐이다. 값이 싼 쪽으로 기운다.
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { engineCalls, callsLive, callKind } from './engine-calls.mjs';

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** 자리마다 「비워도 되나」를 답하는 판정기. of(id) → {empty, kind, why} */
export function dropGuard() {
  const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
  const man = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  const { want } = engineCalls();

  /* ① 합성 클립의 재료 — 대장이 스스로 적어 둔다(mix: [...]). 짐작할 것이 없다 */
  const material = new Map();
  for (const c of man.clips) for (const m of (c.mix || [])) material.set(String(m), `${c.no}_${c.file}`);

  /* ② 콘솔에서 진행자가 눌러 트는 판 — 그 파일에 슬러그가 적혀 있다 */
  const consolePath = path.join(ROOT, 'console.html');
  const consoleTxt = fs.existsSync(consolePath) ? fs.readFileSync(consolePath, 'utf8') : '';

  /* ③ 폐지한 자리 — 이미 식장에서 안 난다. 여기만이 «비워도 된다»의 근거가 된다 */
  const RET = Cue.RETIRED || {};

  /* ★★[NO_SUCH_CLIP 2026-09-21] ④ «그런 클립이 있기는 한가» — 있는 이름만 판정한다.
     실측으로 잡았다: 내가 `43_declare-3-warm` 이라는 **없는 이름**을 물었더니 「확인 필요」라고 답했다.
     43 은 실제로 `parents-letter` 다(FILES[42]). 번호가 층마다 겹쳐 생긴 헛이름이었다([SLUG_NOT_KEY]).
     ★왜 위험한가 — 「확인 필요」는 «있는데 모르겠다»는 뜻이라 사람이 그 자리를 찾아 나선다.
       없는 이름에 그 답을 주면 **없는 자리를 찾느라** 시간을 쓰고, 더 나쁘게는 «폴백으로 난다»로 읽혀
       멀쩡한 판단이 흐려진다. 모르는 이름에는 «모르는 이름»이라고 답해야 한다.
     ★던지지 않고 kind 로 답한다 — 이 판정기는 표를 그리는 데 쓰이고, 한 줄 때문에 표가 멎으면 안 된다. */
  const KNOWN = new Set([...(Cue.FILES || []), ...Object.keys(RET)]);

  /* ★★[RUNTIME_SWAP 2026-09-21 코워크 §7-G] ⑤ «런타임에 갈아끼우는 자리» — 난다.
     코워크가 25·32 를 「난다/폐지」로 정해 달라 했다. 「확인 필요」는 안전한 답이지 **답이 아니다** —
     영영 그대로 두면 사람이 매번 같은 자리를 다시 판정한다.
     ★손으로 목록에 박지 않는다. 코드에서 끌어낸다 — 박아 두면 갈래가 늘거나 줄 때 조용히 틀린다.
       ㉮ `alt: { … slug:'X' }`  큐가 조건이 맞으면 X 로 갈아끼운다(25 = 덕담이 3분을 넘겼을 때)
       ㉯ `D.DECLWHO` 의 갈래   고객이 고르는 선언 갈래의 본 클립(32 = 가족 낭독)
     ★이 둘은 엔진 «정적» 분석에 안 잡힌다 — 조건이 그날 정해지기 때문이다. 그러나 **난다.**
       [DROP_GUARD] 가 애초에 세운 말이 이것이다: 「엔진은 식순대로 갔을 때 나는 소리만 안다.」 */
  const cueSrc = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
  const SWAP = new Map();
  for (const m of cueSrc.matchAll(/alt:\s*\{[^}]*?slug:\s*'([^']+)'/gs))
    SWAP.set(m[1], '큐가 조건이 맞으면 이 클립으로 갈아끼운다(alt)');
  const Data = require_(path.join(ROOT, 'assets/ritual-data.js'));
  for (const k of Object.keys(Data.DECLWHO || {}))
    if (KNOWN.has('declare-' + k)) SWAP.set('declare-' + k, `성혼 선언 「${k}」 갈래의 본 클립 — 고객이 그 갈래를 고르면 난다`);

  const of = (id) => {
    const s = String(id || ''), slug = s.replace(/^\d+_/, '');
    if (callsLive(want, s))
      return { empty: false, kind: callKind(want, s), why: '엔진이 식순대로 부르는 자리다' };
    if (material.has(s))
      return { empty: false, kind: '합성 재료', why: `합창 클립 ${material.get(s)} 의 재료다 — 지우면 합성이 깨진다` };
    if (consoleTxt.includes(slug))
      return { empty: false, kind: '콘솔에서 손으로 고르는 판', why: '진행자가 콘솔에서 눌러 튼다' };
    if (RET[slug])
      return { empty: true, kind: '폐지한 자리', why: 'Cue.RETIRED 에 있다 — 이미 식장에서 안 난다' };
    if (SWAP.has(slug))
      return { empty: false, kind: '런타임에 갈아끼우는 자리', why: SWAP.get(slug) };
    if (!KNOWN.has(slug))
      return { empty: null, kind: '그런 클립 없음', why: `[NO_SUCH_CLIP] 「${slug}」 은 FILES 에도 RETIRED 에도 없다 — 이름을 다시 볼 것(번호는 층마다 겹친다)` };
    return { empty: null, kind: '확인 필요', why: '엔진은 안 부르지만 폴백·런타임 조건으로 나갈 수 있다 — 사람이 봐야 한다' };
  };
  return { of, want };
}

/* ★[DROP_GUARD] 세 가지 답 — null 을 «괜찮다»로 접지 말 것
     false = 비울 수 없다   true = 비워도 된다   null = 모르겠다(사람이 본다) */
export const DROP_ANSWERS = { 못비움: false, 비워도됨: true, 확인필요: null };
