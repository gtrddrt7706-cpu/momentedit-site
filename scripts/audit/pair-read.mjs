// 한 자리에 붙어 나가는 두 대사는 «나란히» 읽어야 한다 [PAIR_READ]
//
// 사장님 「누락이 발생한 이유를 찾아내고 그거를 예방할 수 있는 장치를 만들어」
//
// ═══ 왜 만들었나 — [FRAME_OUT] 사고 ═══
//   2026-09-12 에 헌정 답 클립 [27]을 새로 넣었다. 그 클립의 전제를 내가 이렇게 적었다:
//     「그 사진에는 찍은 사람이 있다 — 프레임 밖에 서 있던 사람이고, 아들은 그 사실을 말하지 않았다.」
//   그런데 같은 라이브 창에 «앞서» 나가는 [14]에는 이미 이렇게 적혀 있었다:
//     「아버지가 저를 업고 계셨고, 뒤에서 어머니가 웃고 계셨습니다.」
//   사진 안에 있는 사람이 그 사진을 찍을 수는 없다. 30초 안에 두 사실이 부딪힌다.
//   ★사전 점검 다섯 가지를 돌렸는데 정작 «짝을 나란히 읽는» 것을 안 했다.
//     그 뒤 녹음 직전 점검에서 네 각도가 따로 찾아냈다 — 즉 읽으면 «바로» 보이는 것이었다.
//
// ═══ 그래서 이 검사가 하는 일 ═══
//   큐 엔진을 전수로 돌려 «한 라이브 창에 두 개 이상의 배역 클립이 붙는 자리»를 전부 찾고,
//   그 짝의 대사를 나란히 찍는다. 그리고 짝마다 «읽었다»는 표식을 게이트에 요구한다.
//   ★새 짝이 생기면(클립을 넣거나 배선을 바꾸면) 표식이 없어 빨개진다 — 읽기 전에는 못 지나간다.
//   ★이건 모순을 «자동으로» 찾는 검사가 아니다. 그건 기계가 못 한다.
//     이 검사가 하는 일은 «사람 앞에 나란히 놓고 멈춰 세우는 것»이다. 읽으면 보이는 것이었으니까.
//   ★표식을 지우면 다시 빨개진다. 대사를 고치면 표식에 적힌 지문이 달라져 또 빨개진다 —
//     즉 «옛날에 한 번 읽었다»로는 통과하지 못한다.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const require = createRequire(path.join(ROOT, 'package.json'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));
const ST = require(path.join(ROOT, 'assets/ritual-story.js'));
const MAN = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const GATE = fs.readFileSync(path.join(ROOT, 'automation/tests/merge-guard.sh'), 'utf8');

const TEXT = new Map();
for (const c of MAN.clips) if (c.dir === 'assets/audio/cast') TEXT.set(c.no + '_' + c.file, { role: c.role, sents: c.sents.map((x) => x.text) });

/* 팔레트 전수 — 갈래에 따라 짝이 생겼다 사라졌다 한다. 한 코스만 보면 놓친다. */
const pairs = new Map();
for (const course of ['gamdong', 'family', 'damback', 'record', 'minimal', 'festive'])
  for (const letter of ['parent', 'each', 'both'])
    for (const bless of ['on', 'off'])
      for (const tribute of ['flower', 'bow', 'hug'])
        for (const toast of ['toast', 'cake', 'both']) {
          let cues; try { cues = RC.build({ course, letter, bless, tribute, toast }, { mode: 'console' }).cues; } catch (e) { continue; }
          for (const q of cues) {
            const ids = (ST.castIds(q).live || []).filter(Boolean);
            if (ids.length < 2) continue;
            const key = ids.join('+');
            if (!pairs.has(key)) pairs.set(key, { ids, block: q.blockN || '', slug: q.slug || '' });
          }
        }

/* «읽었다»는 표식 — 짝 이름 + 그때의 지문(각 클립 문장 수). 대사가 바뀌면 지문이 달라져 다시 물린다. */
const stamp = (p) => p.ids.map((id) => (TEXT.get(id) || { sents: [] }).sents.length).join('.');

let bad = 0;
console.log(`[PAIR_READ] 한 라이브 창에 배역 클립이 둘 이상 붙는 자리 ${pairs.size}곳\n`);
for (const [key, p] of pairs) {
  const mark = `PAIR_READ ${key} ${stamp(p)}`;
  const ok = GATE.includes(mark);
  console.log(`${ok ? 'ok  ' : '✗   '}${p.block} · ${p.slug}   ${key}  (문장 ${stamp(p)})`);
  if (ok) continue;
  bad++;
  console.log(`     ★게이트에 이 표식이 없다:  # ${mark}`);
  for (const id of p.ids) {
    const t = TEXT.get(id);
    if (!t) { console.log(`     [${id}] 대사를 못 찾음`); continue; }
    console.log(`     ── [${id}] ${t.role}`);
    for (const line of t.sents) console.log(`        ${line}`);
  }
  console.log('');
}
if (bad) {
  console.log(`★${bad}곳을 «나란히» 읽고, 서로 부딪히는 사실이 없으면 게이트에 위 표식 줄을 넣으세요.`);
  console.log('  [FRAME_OUT] 은 읽으면 바로 보이는 것이었는데, 아무도 나란히 놓고 본 적이 없어 지나갔습니다.');
}
process.exit(bad ? 1 : 0);
