/* 다이닝 AI enum ↔ 식당DB(DINE_DB) 음식 태그 동기화 가드 (무료 오프라인).
 * AI는 enum 밖 음식을 못 내고, 프런트는 DB 태그로 필터하므로, 둘이 어긋나면(드리프트)
 * AI가 매칭한 음식이 DB에 없거나(빈 결과) DB 음식을 AI가 못 닿는 사각이 생긴다. 둘의 집합 일치를 강제.
 */
const fs = require('fs'), path = require('path');
const ROOT = path.join(__dirname, '..', '..');
let pass = 0, fail = 0; const fails = [];
function check(n, ok, d) { if (ok) { pass++; } else { fail++; fails.push(n + (d ? " → " + d : "")); console.log("  FAIL " + n + (d ? " → " + d : "")); } }

// ① AI enum 추출 (애프터 웨딩 컨시어지는 after-concierge.js 단일 출처 · 2026-06-16 dining-match·GAS handleDiningMatch 폐기)
const srcs = [
  ['after-concierge.js', 'api/after-concierge.js', /FOODS\s*=\s*\[([^\]]*)\]/],
];
let aiFoods = null;
srcs.forEach(([nm, p, re]) => {
  const src = fs.readFileSync(path.join(ROOT, p), 'utf8');
  const mm = src.match(re);
  const foods = mm ? mm[1].match(/'([^']+)'/g).map(s => s.slice(1, -1)) : [];
  if (aiFoods === null) aiFoods = foods;
  check(nm + ' FOODS 일치(' + foods.length + '종)', JSON.stringify(foods) === JSON.stringify(aiFoods));
});

// ② DINE_DB 음식 태그 추출 (mypage.html · f:[...])
const mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const dbFoods = new Set();
(mp.match(/f:\s*\[[^\]]*\]/g) || []).forEach(blk => {
  (blk.match(/'([^']+)'/g) || []).forEach(q => dbFoods.add(q.slice(1, -1)));
});

console.log('[다이닝 동기화] AI enum ' + aiFoods.length + '종 · DB 태그 ' + dbFoods.size + '종');
// AI가 내는 모든 음식은 DB에 존재해야 함(빈 결과 방지)
aiFoods.forEach(f => check('AI 음식 "' + f + '" DB에 존재', dbFoods.has(f)));
// DB의 모든 음식은 AI도 닿을 수 있어야 함(사각 없음)
[...dbFoods].forEach(f => check('DB 음식 "' + f + '" AI enum에 존재', aiFoods.indexOf(f) >= 0));

console.log('\nPASS ' + pass + ' · FAIL ' + fail);
if (fail) { console.log('실패:\n  - ' + fails.join('\n  - ')); process.exit(1); }
console.log('다이닝 enum↔DB 동기화 정상');
