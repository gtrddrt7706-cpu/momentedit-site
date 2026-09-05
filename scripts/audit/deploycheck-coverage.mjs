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
/* ★[MARKS_REMOTE 2026-08-30] 목록이 .gs 에서 deploy-marks.json 으로 옮겨 갔다.
   그래야 99_deployCheck.gs 를 매번 다시 붙여넣지 않는다(사용자 질문: "매번 같이 업로드해야하는거야?").
   ★그래서 이 게이트도 그 JSON 을 본다. .gs 를 계속 보면 목록이 옮겨 간 줄 모르고 늘 초록이 난다. */
const CHECK = path.join(REPO, 'deploy-marks.json');
const DAYS = Number(process.env.DC_DAYS || 30);

/* 메인 GAS 프로젝트 파일만 본다(부부폼·하객편지·가족청첩장은 다른 프로젝트라 제외) */
const GAS = ['automation/platform', 'automation/admin/admin.gs', 'automation/consultation/consultation-booking.gs'];

/* ★표식이 아닌 것 — 점검 목록에 넣을 성격이 아니다.
   ①한 번 쓰고 마는 일회성 백필 ②주석 안에서만 사는 설명용 약어 ③파일 이름표 */
/* ★DEPLOY_LIVE 도 여기 — 점검 파일이 «자기 안»에 단 이름표다(배포본을 찌르는 절).
   제품 변경이 아니므로 「목록에 넣어라」가 성립하지 않는다. DEPLOY_CHECK 와 같은 성격이다. */
const SKIP = new Set(['DEPLOY_CHECK', 'DEPLOY_LIVE', 'PROD_ACCESSOR', 'GUARD_MIRROR', 'HEADER_ORDER_GUARD']);

if (!fs.existsSync(CHECK)) {
  console.log('건너뜀 — deploy-marks.json 이 없다(점검 목록 자체가 사라졌다면 그게 더 큰 문제다).');
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
 *
 * ★★[COVER_SCOPE 2026-08-30] 이 게이트가 «무엇을 안 잡는지»를 분명히 적어 둔다 — 내가 사용자에게
 *   "앞으로 GAS 변경은 목록에 안 넣으면 푸시가 막힌다"고 말했는데, 그건 과장이었다.
 *   실제 범위: **새 function 선언 줄과 그 아래 6줄 안**에 나타난 표식만 본다(nearFn).
 *   그래서 «기존 함수 본문 깊숙이» 넣은 표식은 목록에 없어도 그냥 통과한다.
 *     실측: LIVETEST_0830 은 purgeStaleCustomers 본문 안에 심었는데 이 게이트가 안 셌다.
 *   ★그런 표식도 99_deployCheck 는 «검사할 수 있다»(mark() 가 함수 본문을 읽는다). 못 하는 게 아니라
 *     이 게이트가 «요구»를 안 할 뿐이다. 좁힌 이유는 능력이 아니라 물량이었다(#602~#603 에서
 *     수십 개가 쌓여 main 이 사흘 붉었다).
 *   ★넓히려면 «표식 하나하나»가 아니라 «창 안에 바뀐 .gs 파일마다 표식 하나»를 요구하는 편이 낫다 —
 *     물량이 파일 수(≤20)로 묶여 다시 사흘 붉는 사고가 안 난다. 다만 그건 모든 세션의 작업 방식을
 *     바꾸는 일이라 사용자 결정이 필요하다. 나중에할일_체크리스트.md 결정 대기함에 올려 뒀다.
 */
const found = new Map();   // 표식 → 처음 본 줄(맥락)
let nearFn = 0;            // 새 함수 선언 직후 몇 줄인가
for (const line of log.split('\n')) {
  if (!line.startsWith('+') || line.startsWith('+++')) { if (nearFn > 0) nearFn--; continue; }
  const body = line.slice(1);
  if (/^\s*function\s+[A-Za-z_]/.test(body)) nearFn = 6;   // 선언 줄과 바로 아래 몇 줄까지가 «그 함수의 표식»
  if (nearFn > 0) {
    /* ★[COVER_COMMENT_ONLY 2026-09-05] 표식은 «주석»에 산다. 종전엔 줄 전체를 훑어
       setValues([ADMIN_HEADERS]) 같은 **배열 리터럴**을 표식으로 셌다 —
       ADMIN_HEADERS·HEADERS·AIH_HEADERS 셋이 그렇게 잡혀 30일 창이 영구히 붉었다.
       붉은 채로 사는 게이트는 곧 «무시하는 게이트»가 된다(merge-guard 는 7일 창이라 초록이었다).
       그래서 첫 주석 기호(// /* 줄머리 * ★) 뒤만 훑는다. 되돌리지 말 것. */
    const _cm = body.match(/(?:\/\/|\/\*|^\s*\*|★).*$/);
    const _scan = _cm ? _cm[0] : "";
    for (const m of _scan.matchAll(/\[([A-Z][A-Z0-9_]{5,})\]/g)) {
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

/* ★★[COVER_PAIR 2026-08-30 사용자 지시 "왜못잡앗는지 추적해서 확실하게 개선해"]
   여기가 못 잡은 «진짜 자리»다. 종전엔 목록 전체를 한 덩어리 문자열로 놓고 «표식 이름»만 찾았다.
     const missing = alive.filter(([mk]) => !checkSrc.includes(mk));
   그러면 같은 표식이 여러 파일에 있을 때, 어느 «한 파일»만 목록에 있어도 나머지가 전부 통과한다.
   실사고: PAY_LOCK_REENTRANT 가 70_journey·admin·98_pay_card 셋에 있는데 목록엔 70_journey 한 줄뿐이라
           98_pay_card 를 안 붙여도 「누락 0건」이 나왔다(옛 판으로 되돌려 재현 확인).
   ★그래서 «파일과 표식의 짝»으로 본다. 표식이 그 파일에 있으면 그 파일 이름으로 목록에 있어야 한다. */
const listedPairs = new Set((JSON.parse(checkSrc).marks || []).map((m) => m.file + '|' + m.mark));
const missing = alive.filter(([mk]) => {
  for (const g of GAS) {
    const p2 = path.join(REPO, g);
    const fl = fs.statSync(p2).isDirectory()
      ? fs.readdirSync(p2).filter((f) => f.endsWith('.gs')).map((f) => path.join(p2, f)) : [p2];
    for (const f of fl) {
      const name = path.basename(f, '.gs');
      if (name === '99_deployCheck') continue;
      if (!fs.readFileSync(f, 'utf8').includes('[' + mk)) continue;
      if (!listedPairs.has(name + '|' + mk)) return true;      // 그 파일 몫이 목록에 없다
    }
  }
  return false;
});
/* ★★[FILE_COVER 2026-09-05 사용자 지시 "제안대로 진행해 좀더 완벽한 체크 테스트가될수있게"]
   위(MARK_ON_FN)까지는 «새 함수»만 요구한다. 그래서 **기존 함수 본문을 고친 변경은 목록에
   안 들어가고, 그 파일을 GAS 에 안 붙여도 점검이 「누락 0건」이라고 답한다.**
   실사고(2026-09-05): 사용자의 99_deployCheck.gs 가 한 판 뒤처져 있었는데 점검은 초록이었다.
   사용자 질문 그대로다 — "메인에 있는 파일이 전부 올라가 있다는 거지?" 그때 답은 «아니오»였다.

   ★규칙: **그 파일을 마지막으로 바꾼 커밋**이 새로 넣은 줄에 있는 표식이, 목록에 최소 하나.
     - «창 전체»로 보면 한 파일이 두 번 바뀔 때 첫 변경 표식만으로 통과한다(반증으로 재현).
       그 사이에 붙여넣은 사람은 뒤 변경을 빠뜨린 채 «누락 0건»을 본다. 그래서 마지막 커밋이다.
     - 옛 파일에는 그 표식이 없으니 99_deployCheck 가 곧바로 «옛 버전»으로 잡는다.
   ★물량은 «파일 수»로 묶인다 — 표식 하나하나를 요구하다 main 이 사흘 붉었던 사고(#602~#603)의
     재발을 막는 것이 범위를 좁혔던 이유였고, 파일 단위는 그 이유를 건드리지 않는다.
   ★고르는 표식은 «그 함수 본문 안»에 있어야 한다 — mark() 가 함수 소스를 읽기 때문이다.
     함수 밖 주석에 단 표식은 목록에 넣어도 영영 «누락»으로만 뜬다(실측 이력 있음).
   ★.gs 를 고치는 세션은 이제 표식 한 줄 + 목록 한 줄을 함께 남긴다. 그것이 «전부 올라갔다»를
     점검이 진짜로 보증하게 만드는 값이다. */
function _fnBody(src, name) {
  const i = src.indexOf('function ' + name + '(');
  if (i < 0) return '';
  let d = 0, j = src.indexOf('{', i);
  for (let k = j; k < src.length; k++) {
    if (src[k] === '{') d++;
    else if (src[k] === '}') { d--; if (!d) return src.slice(i, k + 1); }
  }
  return '';
}
const marksAll = (JSON.parse(checkSrc).marks || []);
/* ★규칙 시작일 이전 커밋은 묻지 않는다 — 그때는 «표식을 남긴다»는 약속 자체가 없었다.
   이것이 없으면 DC_DAYS 를 30 으로 돌릴 때 옛 커밋까지 소급 요구해 늘 붉는다(사람이 곧 무시한다).
   ★날짜를 앞당기지 말 것 — 소급은 «고칠 수 없는 빨강»을 만든다. */
const FILE_COVER_SINCE = '2026-09-05';
const _winMs = Date.now() - DAYS * 86400e3;
/* ★날짜만 넘기면(«2026-09-05») git 이 그 날 00:00 을 «오늘 이후»로 보고 아무것도 안 잡는다 —
   그러면 이 규칙이 조용히 꺼진다(반증에서 실제로 통과해 버려 발견). 시각까지 붙여 넘긴다. */
const _since = new Date(Math.max(_winMs, Date.parse(FILE_COVER_SINCE))).toISOString();
const changedFiles = execSync(`git log --since="${_since}" --name-only --pretty=format: -- ${GAS.join(' ')}`,
  { cwd: REPO }).toString().split('\n').map((x) => x.trim()).filter((x) => x.endsWith('.gs'));
const uncovered = [];
for (const rel of [...new Set(changedFiles)]) {
  const base = path.basename(rel, '.gs');
  if (base === '99_deployCheck') continue;                    // 점검 파일 자신은 스스로를 못 본다
  const abs = path.join(REPO, rel);
  if (!fs.existsSync(abs)) continue;                           // 지워진 파일
  const lastSha = execSync(`git log -1 --format=%H -- ${rel}`, { cwd: REPO }).toString().trim();
  if (!lastSha) continue;
  const diff = execSync(`git show ${lastSha} -- ${rel}`, { cwd: REPO, maxBuffer: 1 << 28 }).toString();
  const added = diff.split('\n').filter((l) => l.startsWith('+') && !l.startsWith('+++')).join('\n');
  if (!added.trim()) continue;                                 // 지우기만 한 변경 — 요구할 것이 없다
  const now = fs.readFileSync(abs, 'utf8');
  const ok = marksAll.some((m) => m.file === base
    && added.includes(m.mark)                                  // 그 커밋이 넣은 것이라야 옛 파일과 갈린다
    && _fnBody(now, m.fn).includes(m.mark));                   // 그리고 그 함수 «본문 안»에 살아 있어야 한다
  if (!ok) uncovered.push(rel + '  (마지막 커밋 ' + lastSha.slice(0, 8) + ')');
}
if (uncovered.length) {
  console.log(`❌ [FILE_COVER] 바뀌었는데 «그 변경을 가리키는» 목록 항목이 없는 파일 ${uncovered.length}개:`);
  uncovered.forEach((f) => console.log('   ' + f));
  console.log('\n  이 파일들은 GAS 에 안 붙여넣어도 점검이 «누락 0건»이라고 답한다.');
  console.log('  고치는 법 — 이번에 바꾼 자리(함수 «본문 안»)에 [표식] 주석을 하나 남기고,');
  console.log('    deploy-marks.json 에 { "file","fn","mark","why" } 한 줄을 추가한다.');
  process.exit(1);
}

console.log(`최근 ${DAYS}일 GAS 표식 ${alive.length}개 · 점검 목록에 있는 것 ${alive.length - missing.length}개`);
if (!missing.length) { console.log('✅ 빠진 표식 없음 — deploy-marks.json 이 최근 변경을 전부 덮는다.'); process.exit(0); }
console.log(`❌ 점검 목록에 없는 표식 ${missing.length}개 — 이 변경들은 «옛 코드인 채로도» 통과한다:`);
missing.forEach(([mk, ctx]) => console.log(`   [${mk}]  ${ctx}`));
console.log('\n고치는 법 — 저장소 루트 deploy-marks.json 의 marks 배열에');
console.log('   { "file": "파일", "fn": "함수", "mark": "표식", "why": "한 줄 설명" } 을 추가한다.');
console.log('   ★GAS 에 다시 붙여넣을 것은 «그 .gs 파일 하나»뿐이다 — 99_deployCheck 는 이 JSON 을 실행할 때 읽어 간다.');
console.log('   ★표식은 반드시 그 함수 «본문 안»에 둘 것. 닫는 } 뒤 꼬리 주석은 영영 안 잡힌다.');
process.exit(1);
