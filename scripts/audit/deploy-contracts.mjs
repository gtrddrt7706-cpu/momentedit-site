/* ★[DEPLOY_CONTRACT 2026-09-19] 값 계약을 «저장소 쪽»에서 검사한다 — GAS 의 contractCheck 와 짝이다.
 *
 * 왜 둘인가 — contractCheck 는 «배포된 것»을 보고, 이것은 «커밋되는 것»을 본다.
 *   계약만 적어 두고 코드를 바꾸면 둘이 갈라진다. 그러면 계약은 거짓말이 되고,
 *   거짓말하는 계약은 «검사가 있다»는 착각만 남겨 없느니만 못하다.
 *   그래서 merge-guard 가 매번 이것을 돌려, 갈라지는 순간 푸시를 막는다.
 *
 * 사용: node scripts/audit/deploy-contracts.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { loadGas } from './gas-lint.mjs';

const ROOT = path.resolve(new URL('../..', import.meta.url).pathname);
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const strip = (t) => t.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
/* 사이트 경로 → 저장소 파일. 배포가 정적이라 1:1 이다. */
const WEBMAP = { '/': 'index.html' };
const toFile = (p) => WEBMAP[p] || p.replace(/^\//, '');

let fail = 0;
const ok = (m) => console.log('  ✅ ' + m);
const bad = (m, d) => { fail++; console.log('  ❌ ' + m + (d ? ('\n       ' + d) : '')); };

const marks = JSON.parse(rd('deploy-marks.json'));
const CT = marks.contracts || [];
if (!CT.length) { console.log('❌ deploy-marks.json 에 contracts 가 없습니다'); process.exit(1); }

const { sandbox, errors } = loadGas();
if (errors.length) { console.log('❌ GAS 로드 실패', errors.slice(0, 2)); process.exit(1); }

console.log(`── 값 계약 ${CT.length}건 (GAS ${CT.filter(c=>c.kind==='gas').length} · 사이트 ${CT.filter(c=>c.kind==='web').length}) ──`);

for (const c of CT) {
  if (c.kind === 'gas') {
    let got;
    try {
      got = new Function('S', `with(S){ return (${c.expr}); }`)(sandbox);
    } catch (e) {
      bad(`${c.expr} 평가 실패 — ${e.message.slice(0, 70)}`, c.file ? `(${c.file})` : '');
      continue;
    }
    if (got === c.eq) ok(`${c.expr} = ${JSON.stringify(got)}`);
    else bad(`${c.expr} = ${JSON.stringify(got)} (계약은 ${JSON.stringify(c.eq)})`, c.why || '');
  } else if (c.kind === 'web') {
    const f = toFile(c.path);
    let body;
    try { body = strip(rd(f)); } catch { bad(`${f} 를 읽지 못했습니다`); continue; }
    if (c.present !== undefined) {
      if (body.includes(c.present)) ok(`${f} 에 「${c.present}」 있음`);
      else bad(`${f} 에 「${c.present}」 가 없습니다`, c.why || '');
    }
    if (c.absent !== undefined) {
      if (!body.includes(c.absent)) ok(`${f} 에 「${c.absent}」 없음`);
      else bad(`${f} 에 「${c.absent}」 가 남아 있습니다`, c.why || '');
    }
  } else bad(`알 수 없는 kind: ${c.kind}`);
}
/* ★계약이 0건이 되는 것도 실패다 — 「검사가 있다」는 착각이 가장 나쁘다. */
console.log(`\n결과 — ${fail === 0 ? '계약 전부 일치' : '★어긋남 ' + fail + '건'}`);
process.exit(fail === 0 ? 0 : 1);
