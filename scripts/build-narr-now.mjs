#!/usr/bin/env node
/* ★★[NARR_NOW_1018 2026-10-18 사장님 «저쪽 섹션에서도 직접 식순 부분들을 확인하고 자료집 파일까지 직접 보고 검토하게 하고 · 개선할 부분들(직접 수정은 너한테)을 너한테 전달 · 더블체크»]
   «지금 나레이션 전체»를 공개 파일 하나로 뽑는다 — 다른 섹션(사장님 컴퓨터 · 인스타 섹션)이 검토할 때 읽는 판.
     ① 예시 코스 넷이 실제로 나가는 차례(narr-words --flow · 엔진 글 그대로)
     ② 순간마다 고를 수 있는 멘트(입장 여섯 · 하객 맞이 · 식전 영상 · 나레이션 멘트 예시 NAR_EX)
     ③ 빈 곳(narr-gaps · 멘트 4개 미만 · 하나뿐)
   손으로 고치지 않는다 — 엔진 글이 바뀌면 이 파일도 다시 만든다(merge-guard 가 --check 로 막는다 · 낡은 판을 검토하면 헛제안이 된다).
   node scripts/build-narr-now.mjs          docs/handoff/narr-now.md 를 쓴다
   node scripts/build-narr-now.mjs --check  파일이 지금 엔진과 같은지만 본다(다르면 종료 코드 1) */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module'; import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const OUT = path.join(ROOT, 'docs/handoff/narr-now.md');
const CHECK = process.argv.includes('--check');

const run = (rel, args = []) => execFileSync(process.execPath, [path.join(ROOT, rel), ...args], { cwd: ROOT, encoding: 'utf8', maxBuffer: 1 << 26 });
let flow, gaps;
try { flow = run('scripts/audit/narr-words.mjs', ['--flow']); gaps = run('scripts/audit/narr-gaps.mjs'); }
catch (e) { console.log('FAIL 흐름 · 빈 곳을 못 뽑았다 → ' + (e.stdout || e.message).slice(0, 300)); process.exit(1); }
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const D = require(path.join(ROOT, 'assets/ritual-data.js'));

const L = [];
L.push('# 지금 나레이션 전체 · 검토용 [NARR_NOW_1018]', '');
L.push('자동으로 만든 파일이에요(`node scripts/build-narr-now.mjs`) · 손으로 고치지 않아요 · 엔진 글이 바뀌면 같은 날 다시 만들어져요.');
L.push('검토하는 법 · 보내는 형식은 [`insta-find.md`](insta-find.md) «검토 (더블체크)»에 있어요. 고치는 건 «나래이션» 세션이 해요.', '');
L.push('## 1. 예시 코스 넷 · 실제로 나가는 차례', '');
L.push('대괄호 숫자는 소리 번호예요. 검토를 보낼 때 이 번호와 slug 를 같이 적어 주세요.', '');
L.push('```');
L.push(flow.replace(/\s+$/, ''));
L.push('```', '');
L.push('## 2. 순간마다 고를 수 있는 멘트', '');
L.push('### 입장 멘트 (여섯 · 두 분이 고른다 · 진행 목소리)', '');
for (const [k, v] of Object.entries(D.ENTRY)) L.push(`- **${k} · ${v.d}** — ${v.nar}`);
L.push('', '### 하객 맞이 (네 시점 · 지금 글 + 예시)', '');
const GT = ['입장 직후', '시작 10분 전', '시작 5분 전', '시작 1분 전'];
L.push('- 지금 글: ' + (D.GUEST || []).map((g, i) => `(${GT[i] || g[0]}) ${g[1]}`).join(' / '));
(O.NAR.guestEx || []).forEach((set, i) => L.push(`- 예시 ${i + 2}: ` + set.map((t, j) => `(${GT[j] || j + 1}) ${t}`).join(' / ')));
L.push('', '### 식전 영상 소개 (지금 글 + 예시)', '');
(O.NAR.pvEx || []).forEach((t, i) => L.push(`- 예시 ${i + 2}: ${t}`));
L.push('', '### 나레이션 멘트 예시 (순간마다 «○○ 멘트» · 예시 1 = 지금 글 · 이름은 «~하게»)', '');
for (const k of O.narExKeys()) {
  const ex = O.NAR_EX[k]; const nm = ex.names;
  const sets = typeof nm === 'function' ? [['mothers', '어머님 두 분'], ['fathers', '아버님 두 분'], ['parents', '부모님'], ['others', '다른 두 분']].map(([w, lab]) => [lab, nm({ candleWho: w })]) : [['', nm]];
  L.push(`#### ${ex.lab || k}`);
  for (const [lab, names] of sets) {
    if (lab) L.push(`- 켜는 분 «${lab}» · 이름: ${names.map((x, i) => x ? `${i + 1} ${x}` : `${i + 1} (없음)`).join(' · ')}`);
    else L.push(`- 이름: ${names.map((x, i) => `${i + 1} ${x}`).join(' · ')}`);
  }
  for (const [slug, arr] of Object.entries(ex.lines)) {
    if (typeof nm === 'function') { const who = (slug.match(/-(mothers|fathers|parents|others)$/) || [])[1]; if (who && !sets.some(([lab]) => lab)) continue; }
    arr.forEach((t, i) => L.push(`  - ${slug} 예시 ${i + 2}: ${t == null ? '(예시 1 글 그대로)' : t}`));
  }
  L.push('');
}
L.push('## 3. 빈 곳 (narr-gaps)', '');
L.push('```');
L.push(gaps.replace(/\s+$/, ''));
L.push('```', '');
const out = L.join('\n') + '\n';

if (CHECK) {
  let cur = ''; try { cur = fs.readFileSync(OUT, 'utf8'); } catch (e) { /* 없음 */ }
  if (cur === out) { console.log('ok narr-now.md = 지금 엔진 글 [NARR_NOW_1018]'); process.exit(0); }
  console.log('FAIL narr-now.md 가 지금 엔진 글과 다르다 — node scripts/build-narr-now.mjs 로 다시 만든다(다른 섹션이 낡은 판을 검토하게 된다) [NARR_NOW_1018]'); process.exit(1);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, out);
console.log(`썼다: docs/handoff/narr-now.md · ${out.length}자 · ${L.length}줄`);
