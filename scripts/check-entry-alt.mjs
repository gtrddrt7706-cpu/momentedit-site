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

// ── [ENTRY_PASTE] 성우에게 붙여넣는 파일도 같은 화자여야 한다
//   대본·화면·표를 다 고쳐 놓아도, 붙여넣기 파일이 낡아 있으면 사용자가 그걸 붙여넣는 날
//   똑같은 사고가 그대로 재발한다(실제로 재더빙_화면글자_맞추기.txt 가 입장 17줄을 전부 신부로
//   들고 있었다 — 그 파일을 다시 붙여넣었으면 여섯 클립이 도로 한 사람 목소리가 된다).
//   ★대상은 '입장 17줄을 통째로 들고 있는 파일'만 — 나레이션 대본(재더빙_entry.txt)도 세 문장이
//     글자가 겹치지만 그건 진행 목소리가 읽는 자리라 화자가 달라야 맞다. 통째로 든 파일만 골라야
//     겹치는 문장 때문에 멀쩡한 대본을 틀렸다고 하지 않는다.
const VOICE = man.voice || {};
const entTexts = [];
man.clips.filter((c) => /^R-entry-/.test(c.id)).forEach((c) => c.sents.forEach((x) => entTexts.push([x.text, VOICE[x.role || c.role]])));
const pasteDir = R('docs/plans/식순연구/타입캐스트');
const pasteBad = [];
let pasteHit = 0;
for (const fn of fs.readdirSync(pasteDir).filter((x) => /^재더빙.*\.txt$/.test(x))) {
  const lines = fs.readFileSync(path.join(pasteDir, fn), 'utf8').split('\n').map((l) => l.trim());
  const say = new Map();
  lines.forEach((l) => { const g = l.match(/^([^:]+):\s*(.+)$/); if (g) say.set(g[2].trim(), g[1].trim()); });
  if (!entTexts.every(([t]) => say.has(t))) continue;      // 입장 전체를 든 파일이 아니다 — 대상 아님
  pasteHit++;
  entTexts.forEach(([t, who]) => { if (say.get(t) !== who) pasteBad.push(`${fn}: '${t.slice(0, 18)}…' 화자 ${say.get(t)} ≠ ${who}`); });
}
ok(`붙여넣기 파일 ${pasteHit}개의 입장 화자가 대본과 일치`, pasteBad.length === 0,
  pasteBad.join('\n') + (pasteBad.length ? '\n낡은 붙여넣기 파일입니다 — 이걸 타입캐스트에 넣으면 한 사람 목소리로 되돌아갑니다.' : ''));

// ── 배지 — 이 자리는 '두 분이 녹음한 목소리'다. 역할이 둘로 갈렸다고 '직접 말해요'로 뒤집히면 안 된다.
//    입장은 미리 받아 두는 녹음이라 당일 그 자리에서 말하는 게 아니다. 반대로 안내하면 고객이 마이크를 든다.
const badge = ST.castOne('18_entry-A') || {};
ok('입장 배지가 녹음 자리 문구 그대로(CAST_REC)', badge.badge === ST.CAST_REC, `${badge.badge}`);

process.exit(fail);
