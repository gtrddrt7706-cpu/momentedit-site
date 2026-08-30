// 99_deployCheck.gs 가 «최근 GAS 변경»을 실제로 덮고 있는지 대조한다.
//   $ node scripts/audit/deploycheck-coverage.mjs
//
// 왜 필요한가 (2026-08-29)
//   99_deployCheck.gs 는 GAS 에 파일을 붙여넣을 때 «빠뜨렸는지»를 잡아 주는 유일한 그물이다.
//   그런데 그물코는 사람이 하나씩 짠다 — 새 변경에 표식을 안 넣어 두면 그 변경은 **옛 코드인 채로도 통과**한다.
//   실제로 8/26 판이 8/29 확정 변경(CF_CORE_TRUTH 등)을 못 잡았다.
//   그래서 «최근에 GAS 로 들어간 표식»과 «점검 목록»을 기계가 대조한다. 빠지면 여기서 붉어진다.
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const CHECK = path.join(REPO, 'automation/platform/99_deployCheck.gs');
const DAYS = Number(process.env.DC_DAYS || 30);

/* 메인 GAS 프로젝트 파일만 본다(부부폼·하객편지·가족청첩장은 다른 프로젝트라 제외) */
const GAS = ['automation/platform', 'automation/admin/admin.gs', 'automation/consultation/consultation-booking.gs'];

/* ★표식이 아닌 것 — 점검 목록에 넣을 성격이 아니다.
   ①한 번 쓰고 마는 일회성 백필 ②주석 안에서만 사는 설명용 약어 ③파일 이름표 */
/* ★DEPLOY_LIVE 도 여기 — 점검 파일이 «자기 안»에 단 이름표다(배포본을 찌르는 절).
   제품 변경이 아니므로 「목록에 넣어라」가 성립하지 않는다. DEPLOY_CHECK 와 같은 성격이다. */
const SKIP = new Set(['DEPLOY_CHECK', 'DEPLOY_LIVE', 'PROD_ACCESSOR', 'GUARD_MIRROR', 'HEADER_ORDER_GUARD']);

if (!fs.existsSync(CHECK)) {
  console.log('건너뜀 — automation/platform/99_deployCheck.gs 가 없다(점검 파일 자체가 사라졌다면 그게 더 큰 문제다).');
  process.exit(1);
}
const checkSrc = fs.readFileSync(CHECK, 'utf8');

/* ★★[NEED_HISTORY 2026-08-30] 이력이 얕으면 «재지 않는다». 얕은 채로 재면 반드시 틀린다.
   커밋이 하나뿐이면 부모가 없어 git 이 그것을 «모든 파일을 새로 추가한 커밋»으로 본다 —
   그러면 저장소의 모든 표식이 「최근에 들어온 것」이 되어 늘 붉어진다.
   실측: 로컬(전체 이력) 5개 vs CI(depth 1) 56개. 이 한 가지로 main 이 계속 붉었다.
   ★워크플로에 fetch-depth: 0 을 넣어 고쳤지만, 여기서도 스스로 알아채고 «안 쟀다»고 말한다 —
     다른 자리에서 얕게 부르더라도 조용히 거짓 실패를 내지 않게. */
let depth = 0;
try { depth = Number(execSync('git rev-list --count HEAD', { cwd: REPO }).toString().trim()) || 0; } catch (e) { depth = 0; }
if (depth <= 1) {
  console.log(`건너뜀 — 이력이 ${depth}커밋뿐이라 «최근 변경»을 가릴 수 없다(얕은 체크아웃).`);
  console.log('  고치는 법: 체크아웃에 fetch-depth: 0 을 준다. 얕은 채로 재면 모든 표식이 「새것」이 된다.');
  process.exit(0);
}

let log = '';
try { log = execSync(`git log --since="${DAYS} days ago" -p -- ${GAS.join(' ')}`, { cwd: REPO, maxBuffer: 1 << 28 }).toString(); }
catch (e) { console.log('건너뜀 — git 로그를 못 읽었다:', e.message); process.exit(0); }

/* 추가된 줄(+)에서만 표식을 줍는다 — 지워진 표식까지 요구하면 정리를 막는다.
 *
 * ★★[MARK_ON_FN 2026-08-30] «새 함수와 함께 들어온» 표식만 센다. 되돌리지 말 것.
 *   왜 — 99_deployCheck 가 검사할 수 있는 것은 «함수»다(typeof 로 있는지 보고, 그 본문에서 표식을 찾는다).
 *   그런데 이 게이트는 처음에 «GAS 파일에 들어온 모든 대괄호 표식»을 요구했다. 그 대부분은
 *   기존 함수 «안»의 설명 주석이라 점검이 손댈 수 없는 것들이다 — 목록에 적어도 확인할 방법이 없다.
 *   그래서 여러 세션이 나란히 일하는 이 저장소에서는 한 주에 수십 개가 쌓여 «영영 못 맞추는» 요구가 됐다.
 *   실측: 도입 커밋(#602)부터 main 이 계속 붉었고(#603 까지), 그동안 모든 PR 이 이 한 줄로 막혔다.
 *   ★게이트의 값은 그대로다 — «새 기능(함수)이 점검 목록 밖에 있는 것»은 여전히 잡는다.
 *     그건 실제로 «옛 코드인 채로도 통과»가 일어나는 유일한 자리다.
 */
const found = new Map();   // 표식 → 처음 본 줄(맥락)
let nearFn = 0;            // 새 함수 선언 직후 몇 줄인가
for (const line of log.split('\n')) {
  if (!line.startsWith('+') || line.startsWith('+++')) { if (nearFn > 0) nearFn--; continue; }
  const body = line.slice(1);
  if (/^\s*function\s+[A-Za-z_]/.test(body)) nearFn = 6;   // 선언 줄과 바로 아래 몇 줄까지가 «그 함수의 표식»
  if (nearFn > 0) {
    for (const m of body.matchAll(/\[([A-Z][A-Z0-9_]{5,})\]/g)) {
      const k = m[1];
      if (SKIP.has(k) || found.has(k)) continue;
      found.set(k, body.trim().slice(0, 78));
    }
  }
  if (nearFn > 0) nearFn--;
}

/* 지금 코드에 살아 있는 표식만 대상 — 옛 커밋에 있었다 사라진 것은 요구하지 않는다 */
const alive = [];
for (const [mk, ctx] of found) {
  let hit = false;
  for (const g of GAS) {
    const p = path.join(REPO, g);
    const files = fs.statSync(p).isDirectory()
      ? fs.readdirSync(p).filter((f) => f.endsWith('.gs')).map((f) => path.join(p, f)) : [p];
    for (const f of files) {
      if (path.basename(f) === '99_deployCheck.gs') continue;
      if (fs.readFileSync(f, 'utf8').includes('[' + mk + ']')) { hit = true; break; }
    }
    if (hit) break;
  }
  if (hit) alive.push([mk, ctx]);
}

const missing = alive.filter(([mk]) => !checkSrc.includes(mk));
console.log(`최근 ${DAYS}일 GAS 표식 ${alive.length}개 · 점검 목록에 있는 것 ${alive.length - missing.length}개`);
if (!missing.length) { console.log('✅ 빠진 표식 없음 — 99_deployCheck 가 최근 변경을 전부 덮는다.'); process.exit(0); }
console.log(`❌ 점검 목록에 없는 표식 ${missing.length}개 — 이 변경들은 «옛 코드인 채로도» 통과한다:`);
missing.forEach(([mk, ctx]) => console.log(`   [${mk}]  ${ctx}`));
console.log('\n고치는 법 — automation/platform/99_deployCheck.gs 의 MARKS 배열에');
console.log("   ['파일', '함수', '표식', '한 줄 설명'] 을 추가하고, 그 파일을 GAS 에도 다시 붙여넣는다.");
process.exit(1);
