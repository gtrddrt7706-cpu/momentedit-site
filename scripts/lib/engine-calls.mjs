// 식장에서 **실제로 나는 소리**의 목록 — 「엔진이 부르는 자리」 [ENGINE_CALLS]
//
//   import { engineCalls } from './lib/engine-calls.mjs';
//   const { want, retired } = engineCalls();      // want: Map<id, {kind, where:Set}>
//
// ★왜 lib 으로 뽑았나 — 2026-08-17
//   이 계산을 쓰는 곳이 셋이 됐다:
//     ① check-listen-cover.mjs   실청 화면에 전부 들어 있나
//     ② build-redub-pick.mjs     판정 화면에 「비울 수 없는 자리」 딱지를 달 때
//     ③ apply-redub-pick.mjs     「버림」을 그대로 받아도 되는지 가를 때 [DROP_GUARD]
//   ★셋이 각자 세면 **셋이 서로 다르게 센다.** 그날 ③이 «비워도 된다»고 하고 ①이 «비면 안 된다»고
//     한다 — 그런데 붉는 것은 ①뿐이라, 사람은 ③의 말을 믿고 자리를 비운 뒤 나중에 게이트에 막힌다.
//     자리를 비우는 결정은 되돌리기 비싸다(문안을 다시 짓고 소리를 다시 받아야 한다).
//     그러니 «무엇이 식장에서 나는가»는 저장소에 **한 군데**만 둔다.
//
// ★무엇을 세나 — 대장(manifest)이 아니라 **큐 엔진이 실제로 부르는 것**이다.
//   대장과 화면을 맞대면 늘 맞는다. 둘 다 같은 생성기에서 나오기 때문이다.
//   이 저장소가 그 병을 세 번 앓았다(RECORDED_TRUTH · NOAUDIO_REAL · CONSOLE_TEXT).
//     ① cue.file          나레이션 클립
//     ② castMainOf(cue)   나레이션을 **대신하는** 배역 클립
//     ③ castLiveOf(cue)   사람 구간 안에서 흐르는 **상황극(예시 대사)**
//     ④ D.PHOTOCUE        골라 트는 판(단체촬영 신호) — 미리듣기에도 콘솔에도 안 뜨는 자리
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const require_ = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

/** 엔진이 부르는 자리 전부. { want: Map<id,{kind,where:Set}>, retired: string[], states: number } */
export function engineCalls() {
  const Cue = require_(path.join(ROOT, 'assets/ritual-cue.js'));
  const Story = require_(path.join(ROOT, 'assets/ritual-story.js'));
  const D = require_(path.join(ROOT, 'assets/ritual-data.js'));
  const man = JSON.parse(fs.readFileSync(
    path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

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
    /* ★[PHOTO_ASK 2026-08-16] 사진 부탁 두 자리(84·85)는 이 축을 안 흔들면 영영 안 나온다.
       실측: 축을 넣기 전 84·85 가 «화면에만 있고 엔진이 안 부르는 줄»로 잡혔다 — 엔진은 부르는데
       검사가 부를 상태를 안 만든 것이다. 축이 늘면 여기도 같이 늘려야 한다(EXTRA_CROSS 와 같은 교훈). */
    photoShare: [false, true],
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
     실측(그때): `18_narr-valley-cake` 는 `valley:'cake'` + `extra.valley` 가 **동시에** 있어야 나왔다.
     EXTRA_ON 이 valley 를 'wine' 으로만 켜서, 두 축 흔들기로도 그 자리에 못 닿았다(80 → 81).
     ★[WINE_RETIRED 2026-08-16] 그 valley 축 자체가 그날 폐지됐다 — 위 실측 사례는 이제 «없는 자리»다.
       ★그래도 **곱하는 규칙은 남긴다.** 고친 것은 valley 하나가 아니라 「extra 를 한 값과만 곱한다」는
         버릇이기 때문이다. 다음에 축이 하나 늘면 같은 구멍이 그대로 다시 난다. */
  const EXTRA_ON = { bless: { bless: 'on' } };   // [WINE_RETIRED 2026-08-16] valley 제거 — 팔레트에서 빠져 켤 길이 없다
  for (const k of ['bless', 'ringwarm', 'welcome', 'tribute', 'toast', 'song', 'letter', 'free']) {
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

  return { want, retired, states: states.length };
}

/* ★자리 이름을 두 꼴로 다 받는다 — 엔진은 슬러그(`narr-close`)로, 대장·화면은 번호를 붙인
   꼴(`26_narr-close`)로 부른다. 이걸 각 호출부가 알아서 맞추게 두면 한 곳이 틀리고,
   그 한 곳이 «비어도 되는 자리»라고 잘못 답한다. 여기서 한 번만 맞춘다. */
export function callsLive(want, id) {
  const s = String(id || '');
  return want.has(s) || want.has(s.replace(/^\d+_/, ''));
}

/** 그 자리를 부르는 종류('나레이션'·'배역 상황극(사람 구간)'…) · 안 부르면 '' */
export function callKind(want, id) {
  const s = String(id || '');
  const v = want.get(s) || want.get(s.replace(/^\d+_/, ''));
  return v ? v.kind : '';
}
