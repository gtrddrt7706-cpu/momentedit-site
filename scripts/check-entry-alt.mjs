#!/usr/bin/env node
// [ENTRY_ALT] 입장 인사 — 화면에 적힌 사람과 들리는 목소리가 같은지 (2026-08-04)
//
// 왜 이 검사가 있나
//   입장은 신랑·신부가 **함께 걷는** 자리다. 그런데 예시 인사 여섯 종이 전부 신부 한 사람 목소리였다.
//   화면은 "두 분이 읽을 인사"라고 말하는데 소리는 한 사람이었다 — 사용자 지적:
//   *"남편이랑 신부랑 같이 입장하는건데 왜 신부만 나래이션이있어?"*
//   고쳐 놓고 나면 이 규칙이 **네 곳**에 흩어진다:
//     ① assets/ritual-data.js  ENTRY_ALT            ← 규칙 원천
//     ② order-preview.html     인라인 사본 + entryAlt()   ← 고객이 읽는 화면
//     ③ 배역_예시_대사.txt      줄 앞 화자              ← 성우에게 붙여넣는 대본
//     ④ manifest.json          sents[].role · role    ← 조립·재생이 읽는 표
//   하나만 고치는 날이 반드시 온다. 그날 화면엔 '신랑'이라 적혀 있는데 신부 목소리가 나온다.
//   ★그래서 넷을 전수 대조한다. 특히 ②는 문자열 비교가 아니라 **함수를 그대로 떼어 돌린다** —
//     같은 글자를 같은 자리에서 자르는지까지 봐야 "화면에 적힌 그 문장"이 성립한다.
//
// 실행: node scripts/check-entry-alt.mjs   (merge-guard.sh 가 호출)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const require_ = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const R = (p) => path.join(ROOT, p);

let fail = 0;
const ok = (name, cond, extra) => {
  console.log((cond ? 'ok ' : 'FAIL ') + name);
  if (!cond) { fail = 1; if (extra) String(extra).split('\n').forEach((l) => console.log('   ' + l)); }
};

const D = require_(R('assets/ritual-data.js'));
const ST = require_(R('assets/ritual-story.js'));
const html = fs.readFileSync(R('order-preview.html'), 'utf8');
const castTxt = fs.readFileSync(R('docs/plans/식순연구/배역_예시_대사.txt'), 'utf8');
const man = JSON.parse(fs.readFileSync(R('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));

// ── ① 규칙 원천
const ALT = D.ENTRY_ALT;
ok('ritual-data.js 에 ENTRY_ALT 가 있고 두 사람 이상 · 중복 없음',
  Array.isArray(ALT) && ALT.length >= 2 && new Set(ALT).size === ALT.length, JSON.stringify(ALT));
if (fail) process.exit(1);
const PAIR = ALT.join('|');

// ── ② 화면 인라인 사본 — 명단이 같은가
const m = html.match(/var ENTRY_ALT=\[([^\]]*)\];/);
const inline = m ? (m[1].match(/"([^"]+)"/g) || []).map((x) => x.replace(/"/g, '')) : null;
ok('order-preview.html 인라인 ENTRY_ALT 가 원천과 일치',
  !!inline && inline.join('|') === PAIR, `원천 ${PAIR} / 화면 ${inline ? inline.join('|') : '(파싱 실패)'}`);

// ── ② 화면 entryAlt() — 자르는 자리까지 같은가
//    ★손으로 다시 구현하지 않는다. 화면 코드를 그대로 떼어 돌려야 "화면이 실제로 하는 일"을 본다.
const fnAt = html.indexOf('function entryAlt(t){');
const fnEnd = html.indexOf('\nfunction narBox(', fnAt);
let entryAlt = null;
if (fnAt < 0 || fnEnd < 0) ok('order-preview.html 에서 entryAlt() 를 떼어냄', false, 'function entryAlt / narBox 경계를 못 찾았습니다');
else entryAlt = new Function('ENTRY_ALT', `${html.slice(fnAt, fnEnd)}\nreturn entryAlt;`)(ALT);

// ── ③④ 여섯 종을 전부 — 화면 분해 · 대본 줄 · manifest 문장이 한 글자까지 같은가
const keys = Object.keys(D.ENTRY);
const bad = [];
for (const v of keys) {
  const id = 'R-entry-' + v;
  const clip = man.clips.find((c) => c.id === id);
  if (!clip) { bad.push(`${id}: manifest 에 클립이 없습니다`); continue; }

  if (clip.role !== PAIR) bad.push(`${id}: manifest role '${clip.role}' ≠ '${PAIR}'`);
  const story = (ST.CAST[`${clip.no}_${clip.file}`] || {}).role;
  if (story !== PAIR) bad.push(`${id}: 재생 표(ritual-story.js) role '${story}' ≠ '${PAIR}'`);

  // 화면이 보여 주는 것
  const shown = entryAlt ? entryAlt(D.ENTRY[v].self) : [];
  // manifest 가 조립하는 것
  const made = clip.sents.map((s) => [s.role, s.text]);
  if (shown.length !== made.length) {
    bad.push(`${id}: 화면 ${shown.length}문장 ≠ 대본 ${made.length}문장`);
  } else {
    shown.forEach(([who, text], i) => {
      if (text !== made[i][1]) bad.push(`${id} ${i + 1}번째 문장 글자 다름\n     화면 ${text}\n     대본 ${made[i][1]}`);
      if (who !== made[i][0]) bad.push(`${id} ${i + 1}번째 문장 화자 다름 — 화면 ${who} / 대본 ${made[i][0]}`);
      if (who !== ALT[i % ALT.length]) bad.push(`${id} ${i + 1}번째 문장이 번갈아가지 않습니다 — ${who} (기대 ${ALT[i % ALT.length]})`);
    });
  }

  // ③ 붙여넣는 대본 원천 — manifest 가 낡았을 수도 있으니 txt 도 직접 본다
  const head = new RegExp(`^\\[${clip.no}\\] ${id} · ([^·]+) ·`, 'm').exec(castTxt);
  if (!head) bad.push(`${id}: 배역_예시_대사.txt 에서 머리글을 못 찾았습니다`);
  else {
    if (head[1].trim() !== PAIR) bad.push(`${id}: 대본 머리글 화자 '${head[1].trim()}' ≠ '${PAIR}'`);
    const body = castTxt.slice(head.index).split('\n').slice(1);
    const rows = [];
    for (const l of body) { if (!l.trim()) break; rows.push(l.trim()); }
    rows.forEach((l, i) => {
      const g = l.match(/^([^:]+):\s*(.+)$/);
      if (!g) { bad.push(`${id}: 대본 ${i + 1}번째 줄에 화자가 없습니다 — ${l}`); return; }
      if (g[1].trim() !== ALT[i % ALT.length]) bad.push(`${id}: 대본 ${i + 1}번째 줄 화자 '${g[1].trim()}' ≠ '${ALT[i % ALT.length]}'`);
      if (made[i] && g[2].trim() !== made[i][1]) bad.push(`${id}: 대본 ${i + 1}번째 줄이 manifest 와 다릅니다 — 대본을 고치고 build-typecast-import.mjs 를 다시 돌리세요`);
    });
  }
}
ok(`입장 ${keys.length}종 · 화면·대본·조립표·재생표가 문장·화자까지 일치`, bad.length === 0, bad.join('\n'));

// ── 배지 — 이 자리는 '두 분이 녹음한 목소리'다. 역할이 둘로 갈렸다고 '직접 말해요'로 뒤집히면 안 된다.
//    입장은 미리 받아 두는 녹음이라 당일 그 자리에서 말하는 게 아니다. 반대로 안내하면 고객이 마이크를 든다.
const badge = ST.castOne('18_entry-A') || {};
ok('입장 배지가 녹음 자리 문구 그대로(CAST_REC)', badge.badge === ST.CAST_REC, `${badge.badge}`);

process.exit(fail);
