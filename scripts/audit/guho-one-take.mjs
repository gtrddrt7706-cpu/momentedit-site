#!/usr/bin/env node
/* ★★[GUHO_ONE_TAKE_1018 2026-10-18 음성 섹션 · 디자인 섹션 합의 «같은 구호는 한 판»]
   구호(«신랑 신부, 입장!» · «신랑 신부, 맞절.» · «신랑 신부, 하객 여러분께 인사!»)는 한 순간의 예시마다 같은 말이 들어 있다.
   예시끼리 들어 볼 때 달라지는 것은 글뿐이어야 해서, 같은 구호는 모든 자리가 «한 판»이다.
   ★왜 — 전체_1018 녹음은 클립째 받아 09_entry-E 의 입장 구호만 새 판(쉼표 쉼 0.35초)이 되고, 나머지 다섯(05 · 06 · 07 · 08 · 10)은
     쉼표 쉼 0.1초 안팎의 옛 판으로 남을 뻔했다. 맞절(132 ↔ 161 · 162 · 252) · 인사(108 ↔ 185 · 186 · 187)도 같았다.
   이 검사는 문장 창고(assets/audio/_src)에서 구호마다 «나가는 자리»(폐지 클립 · 합성 · 통낭독은 뺀다)의 flac 을 모아
     ① 자리마다 소리가 있고 창고 글 = 대장 글인가  ② 파일 내용(md5)이 모두 같은가  를 본다.
   갈라졌으면 고치는 법: node scripts/sent-lib.mjs --patch --sent "<구호>" --wav <고른 판> → 그 자리 클립을 --stage 와 assemble-narration 으로 다시 붙인다.
   ★스스로 깨 본다 — 한 자리의 내용을 바꾼 가짜 · 한 자리를 비운 가짜를 넣으면 빨강이어야 한다. */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { isWholeTake } from '../lib/whole-take.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const GUHO = ['신랑 신부, 입장!', '신랑 신부, 맞절.', '신랑 신부, 하객 여러분께 인사!'];
const MIN_SLOTS = { '신랑 신부, 입장!': 6, '신랑 신부, 맞절.': 4, '신랑 신부, 하객 여러분께 인사!': 4 };   // 10/18 실측 · 줄면 «자리를 못 읽었다»를 의심한다
const pad2 = (n) => String(n).padStart(2, '0');

function retired() {
  const out = new Set();
  try { const cue = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8'); const b = /var RETIRED = \{([\s\S]*?)\};/.exec(cue); if (b) for (const m of b[1].matchAll(/'([^']+)'\s*:\s*1/g)) out.add(m[1]); } catch { /* 못 읽으면 아무것도 빼지 않는다 */ }
  return out;
}

/* 구호마다 나가는 자리 목록 — { text: [{ id, file }] } */
export function slotsOf(man, off) {
  const by = Object.fromEntries(GUHO.map((t) => [t, []]));
  for (const c of man.clips) {
    if (c.mix || isWholeTake(c) || off.has(c.file)) continue;
    for (const s of c.sents) if (by[s.text]) by[s.text].push({ id: pad2(c.no) + '_' + c.file + '#' + s.i, file: path.join(ROOT, 'assets/audio/_src', pad2(c.no) + '_' + c.file, s.i + '.flac') });
  }
  return by;
}

/* 판정 — hashOf(id) 가 null 이면 소리 없음 · textOf(id) 가 대장 글과 다르면 낡음 */
export function judge(by, hashOf, textOf) {
  const bad = [];
  for (const [t, list] of Object.entries(by)) {
    if (list.length < (MIN_SLOTS[t] || 1)) bad.push(`«${t}» 나가는 자리 ${list.length}곳(기준 ${MIN_SLOTS[t]}) — 자리를 못 읽었다`);
    const hs = new Map();
    for (const x of list) {
      const h = hashOf(x.id);
      if (!h) { bad.push(`«${t}» ${x.id} — 창고에 소리가 없다`); continue; }
      if (textOf(x.id) !== t) { bad.push(`«${t}» ${x.id} — 창고 글이 다르다(낡은 판)`); continue; }
      if (!hs.has(h)) hs.set(h, []); hs.get(h).push(x.id);
    }
    if (hs.size > 1) bad.push(`«${t}» 판이 ${hs.size}가지 — ${[...hs.values()].map((ids) => ids.join(' · ')).join(' / ')} → node scripts/sent-lib.mjs --patch --sent "${t}" --wav <고른 판> 뒤 그 클립들을 다시 붙이세요`);
  }
  return bad;
}

const direct = !!process.argv[1] && /guho-one-take\.mjs$/.test(process.argv[1]);
if (direct) {
  let man, idx;
  try { man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8')); idx = JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/_src/_index.json'), 'utf8')); }
  catch (e) { console.log('FAIL 원천을 못 읽었다 — ' + e.message); process.exit(1); }
  const by = slotsOf(man, retired());
  const fileOf = new Map(Object.values(by).flat().map((x) => [x.id, x.file]));
  const md5 = (id) => { const f = fileOf.get(id); return f && fs.existsSync(f) ? crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex') : null; };
  const textOf = (id) => (idx.slots[id] || {}).text;
  /* ★[RETAKE_168_1030 검토 168] 구호 글을 바꾸고(«맞절!» → «맞절.») 아직 하나도 다시 받지 않았으면 «녹음 대기» — 한 판 검사는 받은 뒤에 건다.
       하나라도 받았으면 종전대로 전부 본다(일부만 새 판이면 빨강) · 자리 수 기준(MIN_SLOTS)은 대기여도 그대로 잰다 */
  for (const t of GUHO) { const L = by[t] || []; if (L.length >= (MIN_SLOTS[t] || 1) && L.every((x) => textOf(x.id) !== t)) { console.log(`대기 «${t}» ${L.length}곳 — 글을 바꿨고 아직 다시 받지 않았다(녹음 대기 · 받으면 한 판 검사)`); delete by[t]; } }
  const bad = judge(by, md5, textOf);
  for (const b of bad) console.log('FAIL ' + b);
  /* 스스로 깨 보기 — 한 자리 내용 바꿈 · 한 자리 비움 · 한 자리 낡음 */
  const _fl = Object.values(by).find((l) => l.length) || [], first = _fl[0] && _fl[0].id;
  const probes = [
    ['한 자리 내용이 다름', (id) => (id === first ? 'x' : md5(id)), textOf],
    ['한 자리 소리 없음', (id) => (id === first ? null : md5(id)), textOf],
    ['한 자리 창고 글이 다름', md5, (id) => (id === first ? '옛 글' : textOf(id))],
  ];
  let dead = 0;
  for (const [nm, h, t] of probes) { if (!first || !judge(by, h, t).length) { dead++; console.log(`FAIL 깨 보기 «${nm}» — 빨강이 안 됐다`); } }
  const n = Object.values(by).reduce((a, l) => a + l.length, 0);
  console.log(bad.length || dead ? `✗ GUHO_ONE_TAKE 실패 ${bad.length + dead}건` : `ok guho-one-take — 구호 셋 · 나가는 자리 ${n}곳(입장 ${(by[GUHO[0]] || []).length} · 맞절 ${(by[GUHO[1]] || []).length} · 인사 ${(by[GUHO[2]] || []).length}) · 구호마다 한 판 · 깨 보기 ${probes.length}개 빨강`);
  process.exit(bad.length || dead ? 1 : 0);
}
