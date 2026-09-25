/* 본 GAS 프로젝트 안에서 전역 이름이 겹치지 않는가  [GAS_NAME_CLASH]
 *   node scripts/audit/gas-name-clash.mjs
 *
 * ★왜 — GAS 는 한 프로젝트의 모든 파일이 전역 하나를 나눠 쓴다. 같은 이름이 둘이면 오류도 경고도 없이
 *   «나중에 읽힌 파일»이 이긴다(파일 순서가 승자를 정한다). 2026-09-25 옛 Letter System 을 합칠 때 실측으로
 *   6건이 겹쳤다 — doGet·doPost(진입점) · buildHeaderIndex(헤더 행 3 vs 1) · writeCell(force 인자 유무) ·
 *   notifyStudio(켜짐 vs SEND_ADMIN_MAIL=false 로 꺼짐) · _deFormula(같은 구현). 하나라도 조용히 지면
 *   시트 열이 어긋나거나 알림이 사라지는데, 배포 뒤에야 드러난다. 그래서 옮길 때 옛 파일을 통째로 들이지 않고
 *   필요한 것만 _lt 접두로 새로 썼고(87_letter), 이 검사로 «겹치는 이름 0» 을 잠근다.
 *
 * 무엇을 보나 — scripts/gas-sync.mjs 의 대응표(MAP)에 있는 .gs 파일(= GAS 에 올라가는 파일 전부)의
 *   맨 앞 칸(들여쓰기 없는) function·var·const·let 선언. HTML 은 전역에 안 들어가 제외한다.
 * 종료코드: 0 겹침 없음 · 1 겹침 있음 · 2 못 쟀다
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const src = fs.readFileSync(path.join(ROOT, 'scripts/gas-sync.mjs'), 'utf8');
const block = src.match(/const MAP = \{([\s\S]*?)\n\};/);
if (!block) { console.log('✖ gas-sync.mjs 에서 MAP 을 못 찾았다'); process.exit(2); }
const files = [...block[1].matchAll(/'([^']+\.gs)'\s*:/g)].map((m) => m[1]);
if (files.length < 20) { console.log(`✖ MAP 에서 .gs 를 ${files.length}개만 읽었다 — 파서가 낡았다(적게 읽고 통과하는 게 가장 나쁘다)`); process.exit(2); }

const seen = new Map();   // 이름 → [파일:줄]
let decl = 0;
for (const rel of files) {
  const lines = fs.readFileSync(path.join(ROOT, 'automation', rel), 'utf8').split('\n');
  lines.forEach((ln, i) => {
    const m = ln.match(/^(?:async\s+)?function\s+([A-Za-z_$][\w$]*)\s*\(/) || ln.match(/^(?:var|const|let)\s+([A-Za-z_$][\w$]*)\b/);
    if (!m) return;
    decl++;
    const at = `${rel}:${i + 1}`;
    if (!seen.has(m[1])) seen.set(m[1], []);
    seen.get(m[1]).push(at);
  });
}
if (decl < 500) { console.log(`✖ 전역 선언을 ${decl}개만 셌다 — 파서가 낡았다`); process.exit(2); }
const clash = [...seen].filter(([, at]) => at.length > 1);
if (!clash.length) { console.log(`[GAS_NAME_CLASH] 전역 이름 ${seen.size}개 · 파일 ${files.length}개 — 겹침 0`); process.exit(0); }
console.log(`[GAS_NAME_CLASH] ✖ 겹치는 전역 이름 ${clash.length}개 — GAS 에선 나중 파일이 조용히 이긴다`);
clash.forEach(([n, at]) => console.log(`  ✖ ${n}  ←  ${at.join('  ·  ')}`));
process.exit(1);
