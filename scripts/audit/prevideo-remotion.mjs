#!/usr/bin/env node
// [PV_REMOTION_1101] 식전 영상 뼈대(automation/prevideo) — 사장님 «뼈대를 만들어 무료로 계속 쓸 수 있게» · «웃기게 하지 말고»
//  ① Remotion · 글꼴 버전 고정(^ ~ 없음 · Remotion 패키지끼리 같은 판) — 5.0 에서 라이선스가 바뀐다고 적혀 있다
//  ② 유료 렌더(Lambda · Cloud Run) 패키지를 넣지 않는다 — 렌더는 우리 컴퓨터
//  ③ 영상 길이 = 마이페이지 약속(_pvcSecs)과 같은 식(5장 · 12장 · 20장 · 13장으로 대조)
//  ④ 크레딧 · 장 제목에 개그 · 패러디 갈래가 없다(무드 규칙)
// 종료: 0 통과 · 1 어긋남 · 2 원천 없음
import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const P = (f) => resolve(root, f);
const need = ['automation/prevideo/package.json', 'automation/prevideo/src/plan.ts', 'automation/prevideo/src/Editorial.tsx', 'mypage.html'];
if (need.some((f) => !existsSync(P(f)))) { console.log('SKIP 원천 없음'); process.exit(2); }
let bad = 0;
const fail = (m) => { console.log('FAIL ' + m); bad++; };
const ok = (m) => console.log('ok ' + m);

// ① ②
const pkg = JSON.parse(readFileSync(P('automation/prevideo/package.json'), 'utf8'));
const deps = { ...(pkg.dependencies || {}), ...(pkg.devDependencies || {}) };
const loose = Object.entries(deps).filter(([, v]) => !/^\d+\.\d+\.\d+$/.test(v));
loose.length ? fail('버전이 고정되지 않았다: ' + loose.map(([k, v]) => k + '@' + v).join(' · ')) : ok('의존성 버전 고정 ' + Object.keys(deps).length + '개');
const rv = [...new Set(Object.entries(deps).filter(([k]) => k === 'remotion' || k.startsWith('@remotion/')).map(([, v]) => v))];
rv.length === 1 ? ok('Remotion 패키지 같은 판 ' + rv[0]) : fail('Remotion 패키지 판이 갈렸다: ' + rv.join(' · '));
const paid = Object.keys(deps).filter((k) => /@remotion\/(lambda|cloudrun)/.test(k));
paid.length ? fail('유료 렌더 패키지: ' + paid.join(' · ')) : ok('유료 렌더 패키지 없음');
const lock = P('automation/prevideo/package-lock.json');
existsSync(lock) ? ok('package-lock.json 커밋됨') : fail('package-lock.json 이 없다(.gitignore 예외 확인)');

// ③
const plan = readFileSync(P('automation/prevideo/src/plan.ts'), 'utf8');
const mp = readFileSync(P('mypage.html'), 'utf8');
const mT = plan.match(/export function totalSecs\(n: number\) \{\s*return ([^;]+);/);
const mM = mp.match(/function _pvcSecs\(n\)\{ return ([^;]+); \}/);
if (!mT || !mM) fail('길이 식을 찾지 못했다(plan.ts totalSecs · mypage _pvcSecs)');
else {
  const fT = new Function('n', 'return ' + mT[1]);
  const fM = new Function('n', 'return ' + mM[1]);
  const diff = [5, 8, 12, 13, 20].filter((n) => fT(n) !== fM(n));
  diff.length ? fail('영상 길이가 마이페이지 약속과 다르다: ' + diff.map((n) => n + '장 ' + fT(n) + '초 / ' + fM(n) + '초').join(' · ')) : ok('길이 = 마이페이지 약속(5장 70초 · 20장 117초)');
}

// ④
const ed = readFileSync(P('automation/prevideo/src/Editorial.tsx'), 'utf8');
const gag = ed.match(/개그|패러디|ㅋㅋ|웃음 폭탄|빵빵/g);
gag ? fail('개그 · 패러디 갈래가 들어왔다: ' + [...new Set(gag)].join(' · ')) : ok('개그 · 패러디 갈래 없음');

process.exit(bad ? 1 : 0);
