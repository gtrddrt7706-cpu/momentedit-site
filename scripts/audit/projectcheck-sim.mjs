/* 99_projectCheck.gs 가 «별도 GAS 프로젝트» 세 곳에서 제대로 도는지, GAS 없이 실제로 돌려 확인한다.
 *
 *   node scripts/audit/projectcheck-sim.mjs
 *
 * [PROJECT_CHECK_SIM]
 * 왜 — deployCheck 는 본 프로젝트만 본다. 나머지 셋(부부폼·하객편지·가족청첩장)은 통째로 점검 밖이었고,
 *   그 셋 안에도 트리거가 돈다(vimeoGuardDaily). 그래서 각자 스스로 세게 만들었는데,
 *   그 «스스로 세는 파일» 자체는 또 점검받지 않은 코드다 — 그래서 여기서 일부러 망가뜨려 본다.
 *
 * 어떻게 — node vm 에 그 프로젝트의 .gs + 99_projectCheck.gs 를 올리고 projectCheck() 를 진짜로 부른다.
 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { makeSandbox } from './gas-lint.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const CHECK = path.join(ROOT, 'automation/99_projectCheck.gs');
const AT = {
  'form-to-couple': 'automation/form-to-couple.gs',
  'guest-letter-webhook': 'automation/guest-letter-webhook.gs',
  '가족청첩장빌드': 'automation/가족청첩장빌드.gs',
};
const marks = () => fs.readFileSync(path.join(ROOT, 'deploy-marks.json'), 'utf8');

/* 한 «붙여넣기 상태»를 만들어 projectCheck() 를 돌린다.
   proj: 어느 프로젝트에 붙였나(null = 아무 데도 아닌 곳) · dropFn: 그 함수만 빼고 올린다 · noMarks: 목록을 못 읽는다 */
function run({ proj = null, dropFn = null, noMarks = false } = {}) {
  const sb = makeSandbox();
  const lines = [];
  sb.Logger = { log: (m) => lines.push(String(m)) };
  sb.UrlFetchApp = {
    fetch: () => (noMarks
      ? { getResponseCode: () => 500, getContentText: () => '' }
      : { getResponseCode: () => 200, getContentText: () => marks() }),
  };
  vm.createContext(sb);
  if (proj) {
    let src = fs.readFileSync(path.join(ROOT, AT[proj]), 'utf8');
    if (dropFn) {
      /* 함수 하나만 지운다 — 이름을 바꿔 «없는 것»으로 만든다(구문은 그대로 살려 둔다). */
      const re = new RegExp('^function\\s+' + dropFn + '\\s*\\(', 'm');
      if (!re.test(src)) throw new Error(`${proj} 에 ${dropFn} 이 없습니다`);
      src = src.replace(re, 'function __removed_' + dropFn + '(');
    }
    try { vm.runInContext(src, sb, { filename: AT[proj] }); }
    catch (e) { lines.push(`(로드실패 ${proj}: ${e.message})`); }
  }
  vm.runInContext(fs.readFileSync(CHECK, 'utf8'), sb, { filename: '99_projectCheck.gs' });
  sb.projectCheck();
  const out = lines.join('\n');
  return { out, miss: (out.match(/^ *MISS .*$/gm) || []).map((s) => s.trim()) };
}

let fail = 0;
const ng = (m) => { console.log(`  ✗ ${m}`); fail++; };

console.log('별도 GAS 프로젝트 3곳 · 각자 스스로 세는가\n');

/* ── 1 ── 온전한 상태: 자기를 알아보고 0건이어야 한다 */
for (const proj of Object.keys(AT)) {
  const r = run({ proj });
  const knows = r.out.includes('여기는 ' + proj);
  const clean = r.miss.length === 0 && r.out.includes('누락 0건');
  console.log(`   ${proj.padEnd(22)} 자기 인식=${knows} · 누락 ${r.miss.length}건 ${clean ? '' : '←'}`);
  if (!knows) ng(`${proj} 에 붙였는데 «여기는 ${proj}» 라고 말하지 않습니다`);
  if (!clean) { ng(`${proj} 가 온전한데 붉습니다`); r.miss.slice(0, 3).forEach((x) => console.log('     ' + x)); }
}

/* ── 2 ── 함수 하나가 없으면 그 이름을 짚는가 (전 함수를 하나씩 빼 본다) */
console.log('\n── 함수 하나씩 빼 보기');
const P = JSON.parse(marks()).projects;
for (const p of P) {
  let miss = 0, named = 0;
  for (const fn of p.fns) {
    const r = run({ proj: p.name, dropFn: fn });
    if (r.miss.length) miss++;
    if (r.miss.some((l) => l.includes(fn))) named++;
  }
  console.log(`   ${p.name.padEnd(22)} ${p.fns.length}개 중 잡힘 ${miss} · 이름까지 짚음 ${named}`);
  if (miss !== p.fns.length) ng(`${p.name}: ${p.fns.length - miss}개는 빼도 «누락 0건»이 나옵니다`);
  if (named !== p.fns.length) ng(`${p.name}: ${p.fns.length - named}개는 붉지만 어느 함수인지 안 알려 줍니다`);
}

/* ── 3 ── 엉뚱한 곳에 붙였을 때 — «통과»가 아니라 «못 알아봤다»라고 해야 한다 */
{
  console.log('\n── 엉뚱한 곳·목록 없음');
  const r = run({ proj: null });
  const said = r.out.includes('못 알아봤습니다');
  const notGreen = !r.out.includes('누락 0건');
  console.log(`   아무 프로젝트도 아닌 곳    말해 주는가=${said} · «0건»이라 안 하는가=${notGreen}`);
  if (!said) ng('어느 프로젝트인지 못 알아봤는데 그 사실을 말하지 않습니다');
  if (!notGreen) ng('★알아보지도 못했는데 «누락 0건»이라고 답합니다 — 가장 위험한 거짓 초록입니다');

  const r2 = run({ proj: 'form-to-couple', noMarks: true });
  const said2 = r2.out.includes('확인하지 못했다');
  const notGreen2 = !r2.out.includes('누락 0건');
  console.log(`   목록을 못 읽음             말해 주는가=${said2} · «0건»이라 안 하는가=${notGreen2}`);
  if (!said2 || !notGreen2) ng('목록을 못 읽었는데 그것을 «통과»로 넘깁니다');
}

console.log(fail === 0
  ? '\n✓ 전부 통과 — 세 프로젝트가 자기를 알아보고, 함수 하나가 빠져도 이름까지 짚습니다'
  : `\n✗ ${fail}건 실패`);
process.exit(fail ? 1 : 0);
