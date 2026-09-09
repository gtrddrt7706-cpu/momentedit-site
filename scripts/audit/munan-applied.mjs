// 문안개정 문서의 «바꿈»이 실제 원천에 들어갔는지 전수 대조한다 [MUNAN_APPLIED]
//
//   node scripts/audit/munan-applied.mjs
//
// ★왜 — 2026-09-09 사장님 지적:
//   *"먼 길 와 주신 분들이 많다고 들었습니다. 이거 분명 개선해달라고 적은거같은데
//     지금 반영이 누락된건지? 다른것들도 전수점검"*
//   맞았다. E-2(신부 첫인사)는 문서에 「바꿈」이 적혀 있는데 원천이 옛 문장 그대로였다.
//   E-1(신랑 첫인사)도 같았고, 그 대본으로 이미 녹음까지 받았다.
//
// ★왜 놓쳤나 — 개정을 apply-copy-0906.mjs 로 «한 번에» 넣었는데, 그 스크립트에 28줄만 적었다.
//   문서에는 33개가 있다. 다섯이 그냥 안 적혔고, 개수를 세어 본 적이 없어 조용히 지나갔다.
//   ★교훈: 「일괄 적용 스크립트를 돌렸다」는 «전부 넣었다»가 아니다. 문서와 원천을 직접 맞대야 한다.
//
// 하는 일 — 문서의 `| **바꿈** | … |` 줄을 전부 뽑아 `/` 로 문장을 가르고,
//   그 문장이 원천 어딘가에 있는지 본다. 원천은 나레이션·배역·어조표 셋 다.
//
// ★찾는 자리를 넓게 둔다 — 한 곳만 보면 「배역에 넣었는데 나레이션에 없다」로 헛되이 붉는다.
// ★문서가 이긴다고 단정하지 않는다 — 나중 대화에서 다시 바뀐 문장이 있다(케이크·음료).
//   그래서 «없음»은 «틀림»이 아니라 «사람이 봐야 할 자리»로 낸다. 판단은 사람 몫이다.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const DOC = path.join(ROOT, 'docs/plans/식순연구/문안개정_20260906.md');
const SRC = ['assets/ritual-data.js', 'docs/plans/식순연구/배역_예시_대사.txt',
  'docs/plans/식순연구/타입캐스트/manifest.json'];

const hay = SRC.map((f) => { try { return fs.readFileSync(path.join(ROOT, f), 'utf8'); } catch { return ''; } })
  .join('\n').replace(/\\"/g, '"');
const doc = fs.readFileSync(DOC, 'utf8').split('\n');

const strip = (s) => s.replace(/\*\*/g, '').replace(/`/g, '').trim();
let head = '', total = 0, missing = [];
for (const [i, l] of doc.entries()) {
  /* ★머리는 #·##·### 셋 다 쓴다 — ## 만 보면 A~C절의 ### 항목이 전부 앞 ## 로 뭉쳐
     「이름 통일」 밑에 하객 안내 문장이 달리는 엉뚱한 보고가 나온다(실제로 그랬다). */
  if (/^#{1,3} /.test(l)) head = l.replace(/^#{1,3}\s*/, '').trim();
  const m = /^\|\s*\*\*바꿈\*\*\s*\|(.*)\|\s*$/.exec(l);
  if (!m) continue;
  const sents = m[1].split('/').map(strip).filter((s) => s && !/^\(|^삭제|^없음/.test(s));
  for (const s of sents) {
    total++;
    if (!hay.includes(s)) missing.push({ head, line: i + 1, s });
  }
}
console.log(`문서 «바꿈» 문장 ${total}개를 원천 3곳과 맞댔다.`);
if (!missing.length) { console.log('MUNAN APPLIED OK — 전부 원천에 있다'); process.exit(0); }
const byHead = new Map();
for (const x of missing) { if (!byHead.has(x.head)) byHead.set(x.head, []); byHead.get(x.head).push(x); }
console.log(`\n원천에서 못 찾은 문장 ${missing.length}개 · ${byHead.size}자리 — 사람이 봐야 한다:`);
for (const [h, xs] of byHead) {
  console.log(`\n  [${h}]  (문서 ${xs[0].line}행)`);
  for (const x of xs) console.log(`    · ${x.s}`);
}
console.log('\n★«없음»이 곧 «틀림»은 아니다 — 뒤 대화에서 다시 바꾼 문장이 있다(케이크·음료).');
console.log('  문서를 고칠 자리인지, 원천에 넣을 자리인지 하나씩 판정할 것.');
process.exit(1);
