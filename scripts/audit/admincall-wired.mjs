/* ★★[ADMINCALL_WIRED 2026-09-21] 관리자 화면이 부르는 서버 함수가 adminCall 화이트리스트(FNS)에 있나.
   왜 — FNS 에 없으면 adminCall 이 `{ok:false, error:'알 수 없는 요청: …'}` 를 돌려준다.
   화면은 멀쩡히 그려지고 모달도 뜨는데 **누르는 순간에만** 죽는다. 사람 눈으로는 안 보인다.
   실사고(2026-09-21): [CONTACT_FIX] 연락처 정정 화면을 만들고 FNS 등록을 빠뜨렸다.
   화면·서버·게이트를 다 만들고 «완료»라고 보고했는데 버튼은 처음부터 죽어 있었다.
   내 하네스가 script.google.com 을 가로채 가짜 응답을 줘서 이 관문을 한 번도 안 지났다.
   ★같은 함정이 이미 주석으로 적혀 있었다(admin.gs 의 aiDraftAnswer 옆). 사람이 읽어야 작동하는
     주석은 사람이 7,000줄을 매번 읽지 않으므로 작동하지 않는다. 그래서 기계에 건다.
   [CANT_LOOK] 종료 0 통과 · 1 재서 틀림 · 2 재지 못함. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const GS = path.join(ROOT, 'automation/admin/admin.gs');
const SCREENS = ['admin.html', 'automation/admin/Admin.html'];

const gs = fs.readFileSync(GS, 'utf8');
/* FNS 블록만 떼어 낸다 — `var FNS = {` 부터 짝 맞는 `}` 까지. */
const at = gs.indexOf('var FNS = {');
if (at < 0) { console.log('❌ [ADMINCALL_WIRED] admin.gs 에서 `var FNS = {` 를 못 찾았다 — 이름이 바뀌었으면 이 검사를 고칠 것'); process.exit(2); }
let depth = 0, end = -1;
for (let i = gs.indexOf('{', at); i < gs.length; i++) {
  if (gs[i] === '{') depth++;
  else if (gs[i] === '}') { depth--; if (depth === 0) { end = i; break; } }
}
if (end < 0) { console.log('❌ [ADMINCALL_WIRED] FNS 블록의 닫는 괄호를 못 찾았다'); process.exit(2); }
const fnsSrc = gs.slice(at, end + 1);
const listed = new Set([...fnsSrc.matchAll(/(^|[{,\s])([A-Za-z_$][\w$]*)\s*:/g)].map((m) => m[2]));
if (listed.size < 20) { console.log(`❌ [ADMINCALL_WIRED] FNS 에서 ${listed.size}개만 읽혔다 — 파싱이 깨졌다(0건 통과를 막는다)`); process.exit(2); }

let rc = 0, checked = 0;
const missing = [];
for (const rel of SCREENS) {
  const p = path.join(ROOT, rel);
  if (!fs.existsSync(p)) { console.log(`❌ [ADMINCALL_WIRED] ${rel} 이 없다`); process.exit(2); }
  const src = fs.readFileSync(p, 'utf8');
  /* gas('이름'  ·  gas("이름") — 변수로 부르는 자리는 정적으로 못 읽으니 세지 않는다(그건 따로 봐야 한다). */
  const names = new Set([...src.matchAll(/\bgas\(\s*['"]([A-Za-z_$][\w$]*)['"]/g)].map((m) => m[1]));
  if (!names.size) { console.log(`❌ [ADMINCALL_WIRED] ${rel} 에서 gas('…') 호출을 하나도 못 읽었다 — 파싱이 깨졌다`); process.exit(2); }
  checked += names.size;
  const bad = [...names].filter((n) => !listed.has(n)).sort();
  console.log(`   ${rel.padEnd(28)} 호출 ${String(names.size).padStart(3)}종 · 화이트리스트 밖 ${bad.length}종`);
  bad.forEach((n) => missing.push(`${rel}  gas('${n}')`));
}
console.log(`\nFNS 등록 ${listed.size}종 · 화면 호출 ${checked}종(중복 포함)`);
if (missing.length) {
  rc = 1;
  console.log(`\n❌ [ADMINCALL_WIRED] 화이트리스트에 없는 호출 ${missing.length}건 — 그 버튼은 누르면 «알 수 없는 요청»으로 죽습니다:`);
  missing.forEach((m) => console.log('   ' + m));
  console.log('\n고치는 법 — automation/admin/admin.gs 의 `var FNS = {` 안에 `이름: 이름,` 한 줄을 넣는다.');
  console.log('   ★화면·서버를 다 만들고도 이 한 줄이 없으면 기능이 통째로 죽는다. 눈으로는 안 보인다.');
} else {
  console.log('\n✅ [ADMINCALL_WIRED] 화면이 부르는 서버 함수가 전부 adminCall 화이트리스트에 있다.');
}
process.exit(rc);
