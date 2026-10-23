#!/usr/bin/env node
/* ★★[FLOW_GAPS_1023 2026-10-23 사장님 «편지를 잘 맞추고, 다른 것도 이 기준으로 흐름 쉼을 전부 맞추자»]
   문장 사이 «흐름 쉼» 표(docs/plans/식순연구/흐름쉼_1023.json)가 조립기 대장(타입캐스트/manifest.json)에 들어가 있는지 잰다.
   - 표의 자리 가운데 글(그 문장 · 다음 문장)이 대장과 같은 곳은 after 가 표 값이어야 한다 — 1.25 로 돌아가 있으면 빨강
   - 글이 바뀐 자리는 표를 쓰지 않는다(새 글은 다시 읽어야 한다) — 몇 곳인지만 알린다
   - 생성기(build-typecast-import.mjs)에 덮는 단계가 있어야 한다
   종료 코드 0 통과 · 1 실패 · 스스로 깨 보기(표 값을 1.25 로 되돌린 대장은 빨강)가 어긋나도 1 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const TABLE = 'docs/plans/식순연구/흐름쉼_1023.json';
const MANI = 'docs/plans/식순연구/타입캐스트/manifest.json';
const BUILDER = 'scripts/build-typecast-import.mjs';

export function scan(table, mani) {
  const by = new Map(mani.clips.map((c) => [`${c.no}_${c.file}`, c]));
  const bad = [], stale = [];
  let hit = 0;
  for (const x of table.changes) {
    const c = by.get(x.key);
    const s = c && c.sents[x.i], n = c && c.sents[x.i + 1];
    if (!s || !n || s.text !== x.text || n.text !== x.next) { stale.push(x); continue; }
    if (s.after !== x.after_new) bad.push(`${x.key}#${x.i} «${x.text.slice(0, 24)}…» 뒤 ${s.after}초 — 표 값 ${x.after_new}초(${x.kind})가 안 들어갔다`);
    else hit++;
  }
  return { bad, stale, hit };
}

const direct = !!process.argv[1] && /flow-gaps\.mjs$/.test(process.argv[1]);
if (direct) {
  let table, mani, src;
  try {
    table = JSON.parse(fs.readFileSync(path.join(ROOT, TABLE), 'utf8'));
    mani = JSON.parse(fs.readFileSync(path.join(ROOT, MANI), 'utf8'));
    src = fs.readFileSync(path.join(ROOT, BUILDER), 'utf8');
  } catch (e) { console.log('FAIL 못 읽었다 — ' + e.message); process.exit(1); }
  const { bad, stale, hit } = scan(table, mani);
  for (const b of bad) console.log('FAIL ' + b);
  const hook = /FLOW_GAP_SRC\s*=\s*'docs\/plans\/식순연구\/흐름쉼_1023\.json'/.test(src) && /after === GAP\.sent/.test(src);
  if (!hook) console.log(`FAIL ${BUILDER} 에 흐름 쉼 표를 덮는 단계가 없다`);
  /* 스스로 깨 보기 — 표 값 하나를 1.25 로 되돌린 대장은 빨강 · 글을 바꾼 자리는 «글 바뀜»으로만 센다 */
  let dead = 0;
  const probe = JSON.parse(JSON.stringify(mani));
  const x0 = table.changes.find((x) => stale.indexOf(x) < 0) || table.changes[0];   // [REVIEW31_1023] 표 첫 자리의 글이 바뀌면(01 · 157-1) 깨 보기가 죽은 자리를 잡았다 — 대장과 맞는 첫 자리로
  const c0 = probe.clips.find((c) => `${c.no}_${c.file}` === x0.key);
  if (c0) {
    c0.sents[x0.i].after = 1.25;
    if (!scan(table, probe).bad.length) { dead++; console.log('FAIL 깨 보기 «1.25 로 되돌림» — 빨강이 안 됐다'); }
    c0.sents[x0.i].text += ' (바뀐 글)';
    const r = scan(table, probe);
    if (r.bad.length || r.stale.length !== stale.length + 1) { dead++; console.log('FAIL 깨 보기 «글 바뀜» — 덮지 않는 자리로 세지 않았다'); }
  } else { dead++; console.log('FAIL 깨 보기 — 표 첫 자리가 대장에 없다'); }
  const n = table.changes.length;
  if (bad.length || !hook || dead) { console.log(`✗ FLOW_GAPS_1023 실패 ${bad.length + (hook ? 0 : 1) + dead}건`); process.exit(1); }
  console.log(`ok flow-gaps — 흐름 쉼 표 ${hit}/${n}곳 대장에 들어감` + (stale.length ? ` · 글이 바뀐 ${stale.length}곳은 계산값 그대로(다시 읽을 자리)` : '') + ' · 깨 보기 2개 맞음');
  process.exit(0);
}
