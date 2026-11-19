#!/usr/bin/env node
/* ★[MEAL_GUIDE_WORD_N06 2026-11-19 NIGHT20 #06 R3] 도와주실 분 «식사 자리로 안내할 분» — 식사가 확인된 날만 «식사 자리» · 카페 · 미확인 날은 «카페로 안내할 분».
   ritual-open.js helpersOf 를 실제로 돌려 세 판(식사 · 카페 · 애프터 없음)을 재고, order-preview 세 곳 · mypage 한 곳이 같은 기준을 넘기는지 본다.
   --selftest : 갈래를 지운 판이 빨강이 되는지 깨 본다 */
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..');
const RO = fs.readFileSync(path.join(ROOT, 'assets/ritual-open.js'), 'utf8');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const MP = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const ALT = '카페로 안내할 분', MEAL = '식사 자리로 안내할 분';
const load = (src) => { const ctx = { console }; ctx.window = ctx; vm.createContext(ctx); try { const d = fs.readFileSync(path.join(ROOT, 'assets/ritual-data.js'), 'utf8'); vm.runInContext(d, ctx); } catch (e) {} vm.runInContext(src, ctx); return ctx.RitualOpen; };
const judge = (ro, op, mp) => { let R; try { R = load(ro); } catch (e) { return ['load ' + e.message]; }
  const S = { course: 'open', on: {} }, row = (o) => (R.helpersOf(S, o) || []).map((x) => x[0]).filter((n) => /안내할 분$/.test(n)).join();
  const bad = [];
  if (row({ mealGuide: true, mealFull: true }) !== MEAL) bad.push('식사 날 ' + row({ mealGuide: true, mealFull: true }));
  if (row({ mealGuide: true, mealFull: false }) !== ALT) bad.push('카페 날 ' + row({ mealGuide: true, mealFull: false }));
  if (row({ mealGuide: true }) !== MEAL) bad.push('옛 호출(mealFull 없음) ' + row({ mealGuide: true }));
  if (row({}) !== '') bad.push('애프터 없음 ' + row({}));
  if ((op.match(/mealFull:\(typeof CUSTMEALF!=='undefined'&&!!CUSTMEALF\)\}\)/g) || []).length !== 3) bad.push('order-preview 세 곳');
  if (!mp.includes("_mgFull=!!RitualPreviewLink.mealFullOf(dd, DN_PLACEHOLDER)") || !mp.includes("[_mgFull?'" + MEAL + "':'" + ALT + "','애프터 웨딩을 고른 날']")) bad.push('mypage');
  return bad; };
if (process.argv.includes('--selftest')) {
  const b1 = judge(RO.replace("opt.mealFull === false ? '" + ALT + "' : ", ''), OP, MP).length > 0;
  const b2 = judge(RO, OP.replace(", mealFull:(typeof CUSTMEALF!=='undefined'&&!!CUSTMEALF)", ''), MP).length > 0;
  console.log((b1 && b2 ? 'ok   ' : 'FAIL ') + 'selftest 갈래를 지우면 빨강 ' + b1 + '/' + b2); process.exit(b1 && b2 ? 0 : 1);
}
const bad = judge(RO, OP, MP);
console.log((bad.length ? 'FAIL ' : 'ok   ') + '[MEAL_GUIDE_WORD_N06] 식사 날 «식사 자리» · 카페 · 미확인 날 «' + ALT + '»' + (bad.length ? ' → ' + bad.join(' / ') : ''));
process.exit(bad.length ? 1 : 0);

