#!/usr/bin/env node
// 멘트를 추릴 때 «무엇을 뺄 수 있나»를 기계가 뽑는다 [PICK_BASIS] (2026-09-20 사장님 지시)
//
// 사장님 원문 — 「너무 많아도 고객 입장에서 혼란스러워. 각 이벤트당 3~8개 정도 베스트로」
//
// ★이 검사를 만들면서 전제가 뒤집혔다. 처음엔 「54개니까 중복을 걷어내 줄이자」였는데,
//   같은 갈래 «안»에서 실제로 겹치는 칸은 **하나뿐**이었다(entry.D). 나머지 17칸은
//   앞머리가 0자 겹침으로 서로 다르게 쓰여 있다. 즉 «버릴 것이 쌓여 있어서» 많은 게 아니다.
//
// ★그리고 기계가 잡은 겹침 하나는 «가짜»였다 — 축배 both 는 cake 문장을 통째로 품고
//   뒤에 축배를 이어 붙이는 **포함 관계**다. 겹치는 것이 설계다. [NOT_THE_SOURCE]
//   그래서 이 검사는 **같은 갈래 안에서만** 잰다. 갈래끼리 비슷한 것은 세지 않는다 —
//   고객은 갈래를 «행동·이야기»로 고르지 문안으로 고르지 않는다.
//
// 재는 것 셋
//   ①같은 갈래 안에서 두 벌의 앞머리가 얼마나 겹치나 (15자 이상이면 고를 이유가 없다)
//   ②빈 칸 — 어조가 선언돼 있는데 문안이 없는 자리
//   ③선택지가 하나뿐인 갈래 — 마음에 안 들어도 대안이 없다. ★사장님이 「다시」를 누른 곳이 여기였다
//
// 기본은 보고만(종료 0). PICK_STRICT=1 이면 ①②가 남아 있을 때 1.
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const D = require('../../assets/ritual-data.js');

const STRICT = process.env.PICK_STRICT === '1';
const cut = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const pre = (a, b) => { let i = 0; while (i < a.length && i < b.length && a[i] === b[i]) i++; return i; };
const OVERLAP = 15;

const CUR = {
  entry: (k) => cut((D.ENTRY[k] || {}).nar || D.ENTRY[k]),
  declare: (k) => cut((D.DECLARE[k] || {}).nar || ''),
  letter: (k) => cut((D.LETTER[k] || {}).nar || ''),
  toast: (k) => cut((D.TOAST[k] || {}).nar || ''),
  tribute: (k) => cut((((D.TRIBUTE || {}).modes || {})[k] || {}).nar || ''),
};

const dup = [], empty = [], rows = [];
for (const [tk, g] of Object.entries(D.TONE)) {
  for (const [b, tones] of Object.entries(g)) {
    const cur = CUR[tk] ? CUR[tk](b) : '';
    const names = Object.keys(tones);
    const vals = names.map((n) => [n, cut(tones[n])]);
    for (const [n, v] of vals) if (!v) empty.push(`${tk}.${b}.${n}`);
    // 현행 ↔ 각 어조
    for (const [n, v] of vals) {
      if (!cur || !v) continue;
      const p = pre(cur, v);
      if (p >= OVERLAP) dup.push({ where: `${tk}.${b}`, pair: `현행 ↔ ${n}`, n: p, a: cur, b: v });
    }
    // 어조끼리
    for (let i = 0; i < vals.length; i++) for (let j = i + 1; j < vals.length; j++) {
      const [na, va] = vals[i], [nb, vb] = vals[j];
      if (!va || !vb) continue;
      const p = pre(va, vb);
      if (p >= OVERLAP) dup.push({ where: `${tk}.${b}`, pair: `${na} ↔ ${nb}`, n: p, a: va, b: vb });
    }
    rows.push({ tk, b, count: (cur ? 1 : 0) + vals.filter(([, v]) => v).length });
  }
}

// 선택지가 하나뿐인 갈래 (어조 칸이 아예 없는 곳)
const lone = [];
for (const k of Object.keys(D.NARV || {})) lone.push(`NARV.${k}`);
for (const k of Object.keys(D.RINGWARM || {})) lone.push(`RINGWARM.${k}`);

console.log('\n멘트 추리기 — 무엇을 뺄 수 있나 [PICK_BASIS]\n');
const byEv = {};
for (const r of rows) byEv[r.tk] = (byEv[r.tk] || 0) + r.count;
console.log('  이벤트별 «고를 수 있는 벌» 수');
for (const [ev, n] of Object.entries(byEv)) {
  const mark = n > 8 ? `← 첫 화면에 ${n}개면 많다` : n < 3 ? '← 적다' : '';
  console.log(`    ${ev.padEnd(9)} ${String(n).padStart(3)}벌  ${mark}`);
}

console.log(`\n  ① 같은 갈래 안에서 앞머리 ${OVERLAP}자 이상 겹침 — ${dup.length}건`);
for (const d of dup) {
  console.log(`     ${d.where}  ${d.pair}  (앞 ${d.n}자)`);
  console.log(`       A: ${d.a.slice(0, 64)}`);
  console.log(`       B: ${d.b.slice(0, 64)}`);
}
if (!dup.length) console.log('     없음 — 벌마다 다르게 쓰여 있다');

console.log(`\n  ② 선언돼 있는데 문안이 빈 칸 — ${empty.length}건`);
empty.forEach((e) => console.log(`     ${e}`));
if (!empty.length) console.log('     없음');

console.log(`\n  ③ 선택지가 하나뿐인 갈래 — ${lone.length}곳 (★사장님이 「다시」를 누른 곳이 여기다)`);
console.log(`     ${lone.join(' · ')}`);
console.log('     → 여기는 «추릴» 곳이 아니라 «채울» 곳이다.\n');

const bad = dup.length + empty.length;
if (!bad) { console.log('  → 뺄 후보가 없다. 개수를 줄이려면 화면에서 접는 쪽으로 간다.\n'); process.exit(0); }
if (STRICT) { console.log(`  ✗ 아직 ${bad}건 남았다.\n`); process.exit(1); }
console.log(`  · 지금은 보고만 한다(${bad}건). 정리한 뒤 PICK_STRICT=1 로 조인다.\n`);
process.exit(0);
