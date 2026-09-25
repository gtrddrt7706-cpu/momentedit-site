/* GAS 자동 동기화 대응표가 저장소의 GAS 파일을 전부 덮는가  [SYNC_MAP_FULL]
 *   node scripts/audit/sync-map-full.mjs
 *
 * ★왜 — 2026-09-25 실측. scripts/gas-sync.mjs 의 MAP 이 23개였는데 GAS 프로젝트엔 25개가 있었다.
 *   99_contractCheck · 99_deployCheck 를 새로 만들면서 대응표를 안 고쳤다.
 *   gas-sync 는 «원격에 대응표에 없는 파일이 있으면 중단»하도록 설계돼 있어(모르는 파일을 안 지우려고),
 *   자동 배포 열쇠를 넣는 날 첫 실행이 그 자리에서 멈췄을 것이다. 사람 손 붙여넣기가
 *   잘리고 틀리는 문제를 없애려고 만든 장치인데, 그 장치가 조용히 낡아 있었다.
 *
 * 무엇을 보나 — automation/{platform,consultation,admin} 의 .gs/.html 이 전부 MAP 에 있는가,
 *   그리고 MAP 이 가리키는 로컬 파일이 전부 실제로 있는가. 둘 중 하나라도 어긋나면 1.
 * 종료코드: 0 통과 · 1 어긋남
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(path.join(ROOT, 'scripts/gas-sync.mjs'), 'utf8');
const block = src.match(/const MAP = \{([\s\S]*?)\n\};/);
if (!block) { console.log('❌ gas-sync.mjs 에서 MAP 을 못 찾았다 — 구조가 바뀌었으면 이 검사도 함께 고칠 것'); process.exit(1); }
const local = [...block[1].matchAll(/'([^']+)'\s*:\s*'[^']+'/g)].map((m) => m[1]);
if (local.length === 0) { console.log('❌ MAP 을 0줄 읽었다 — 파서가 낡았다(0줄 통과는 가장 나쁜 통과다)'); process.exit(1); }

const bad = [];
for (const d of ['platform', 'consultation', 'admin']) {
  for (const f of fs.readdirSync(path.join(ROOT, 'automation', d))) {
    if (!/\.(gs|html)$/.test(f)) continue;
    const rel = d + '/' + f;
    if (!local.includes(rel)) bad.push(`대응표에 없다: ${rel} — GAS 엔 붙여넣는데 자동 동기화가 모르는 파일`);
  }
}
for (const rel of local) {
  if (!fs.existsSync(path.join(ROOT, 'automation', rel))) bad.push(`대응표가 가리키는 파일이 없다: ${rel}`);
}
if (!bad.length) { console.log(`[SYNC_MAP_FULL] 대응표 ${local.length}개 — 저장소 GAS 파일 전부 덮음`); process.exit(0); }
console.log(`[SYNC_MAP_FULL] 어긋남 ${bad.length}건`);
for (const b of bad) console.log('  ❌ ' + b);
process.exit(1);
