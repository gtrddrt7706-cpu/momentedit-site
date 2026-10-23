#!/usr/bin/env node
/* ★★[KEEPGAP_CARRY_1023 2026-10-23 음성 섹션 «09 입장 구호 쉼 다시 지킴»]
   입장 구호 «신랑 신부, 입장!»은 안쪽 쉼(«신랑 신부, [쉼] 입장!»)이 소리의 일부라 창고 자리에 keepGap 이 붙어 있어야 한다([ENTRY_GAP_KEEP]).
   0c999ce 에서 09_entry-E 문장 하나가 빠져 구호 자리가 #7 → #6 으로 옮겨질 때 sent-lib --rebind 가 그 표시를 버렸고,
   조립기가 구호 안 쉼을 깎아 09 만 구호가 2.2초(다른 다섯은 3.35초)가 됐다. 어느 검사도 이것을 몰랐다.
   그래서 잰다:
     ① 창고(assets/audio/_src/_index.json)에서 구호 글을 가진 자리는 전부 keepGap
     ② sent-lib.mjs 의 자리 옮기기(--rebind) · 빌려 오기(--borrow)가 keepGap 을 함께 옮긴다
   종료 코드 0 통과 · 1 실패 · 스스로 깨 보기(표시를 뗀 창고 · 옮기기를 뺀 코드는 빨강)가 어긋나도 1 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const IDX = 'assets/audio/_src/_index.json';
const LIB = 'scripts/sent-lib.mjs';
const CALL = '신랑 신부, 입장!';

export function scanIdx(idx) {
  const bad = [], seen = [];
  for (const [id, e] of Object.entries(idx.slots || {})) {
    if (!e || e.text !== CALL) continue;
    seen.push(id);
    if (!e.keepGap) bad.push(`${id} «${CALL}» 에 keepGap 이 없다 — 조립기가 구호 안 쉼을 깎는다(node scripts/sent-lib.mjs --patch --sent "${CALL}" --wav <구호 판> --keep-gap)`);
  }
  return { bad, seen };
}

const body = (src, name) => { const a = src.indexOf(`function ${name}(`); if (a < 0) return ''; const b = src.indexOf('\nfunction ', a + 10); return src.slice(a, b < 0 ? src.length : b); };
export function scanLib(src) {
  const bad = [];
  const rb = body(src, 'rebind'), bo = body(src, 'borrow');
  if (!/keepGap:\s*!!e\.keepGap/.test(rb) || !/if \(v\.keepGap\) j\.slots\[id\]\.keepGap = true/.test(rb)) bad.push(`${LIB} rebind() 가 자리를 옮길 때 keepGap 을 함께 옮기지 않는다`);
  if (!/if \(e\.keepGap\) j\.slots\[to\]\.keepGap = true/.test(bo)) bad.push(`${LIB} borrow() 가 빌려 온 소리의 keepGap 을 함께 옮기지 않는다`);
  return bad;
}

const direct = !!process.argv[1] && /keepgap-carry\.mjs$/.test(process.argv[1]);
if (direct) {
  let idx, src;
  try { idx = JSON.parse(fs.readFileSync(path.join(ROOT, IDX), 'utf8')); src = fs.readFileSync(path.join(ROOT, LIB), 'utf8'); }
  catch (e) { console.log('FAIL 못 읽었다 — ' + e.message); process.exit(1); }
  const { bad, seen } = scanIdx(idx);
  const lib = scanLib(src);
  for (const b of [...bad, ...lib]) console.log('FAIL ' + b);
  if (!seen.length) console.log(`FAIL 창고에 «${CALL}» 자리가 하나도 없다 — 이 검사가 볼 것이 없다(글이 바뀌었으면 CALL 도 같은 커밋에서)`);
  /* 스스로 깨 보기 */
  let dead = 0;
  const probe = JSON.parse(JSON.stringify(idx));
  const first = seen[0] && probe.slots[seen[0]];
  if (first) { delete first.keepGap; if (!scanIdx(probe).bad.length) { dead++; console.log('FAIL 깨 보기 «구호 자리 표시 떼기» — 빨강이 안 됐다'); } }
  if (!scanLib(src.replace(/if \(v\.keepGap\) j\.slots\[id\]\.keepGap = true;/, '')).length) { dead++; console.log('FAIL 깨 보기 «rebind 옮기기 빼기» — 빨강이 안 됐다'); }
  if (!scanLib(src.replace(/if \(e\.keepGap\) j\.slots\[to\]\.keepGap = true;/, '')).length) { dead++; console.log('FAIL 깨 보기 «borrow 옮기기 빼기» — 빨강이 안 됐다'); }
  const n = bad.length + lib.length + (seen.length ? 0 : 1) + dead;
  if (n) { console.log(`✗ KEEPGAP_CARRY_1023 실패 ${n}건`); process.exit(1); }
  console.log(`ok keepgap-carry — 구호 자리 ${seen.length}곳 모두 keepGap · 옮기기 · 빌려 오기가 표시를 함께 옮김 · 깨 보기 3개 맞음`);
  process.exit(0);
}
