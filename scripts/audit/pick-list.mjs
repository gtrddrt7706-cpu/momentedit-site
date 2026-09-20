// 추리기 — 넘치는 이벤트의 «전 벌»을 문면과 함께 세운다 [PICK_LIST] (2026-09-20)
//
// 왜 — 사장님 「각 이벤트당 3~8개 정도 베스트로 고를 수 있게」 / 「넘치는 거만」.
//   무엇을 뺄지 고르려면 무엇이 있는지부터 한자리에 있어야 하는데, 벌이 TONE·ENTRY·LETTER·TOAST 로
//   흩어져 있어 손으로 모으면 반드시 빠진다(이번에 17클립을 그렇게 빠뜨렸다).
// ★[PICK_BASIS] 는 «뺄 수 있나»를 재고, 이쪽은 «무엇이 있나»를 편다. 판단은 사람이 한다.
//
//   node scripts/audit/pick-list.mjs > docs/plans/식순연구/추리기_전벌_20260920.md
import { createRequire } from 'node:module';
const D = createRequire(import.meta.url)('../../assets/ritual-data.js');

const cut = (s) => String(s || '').replace(/\s+/g, ' ').trim();
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const CUR = {
  entry:  (k) => cut((D.ENTRY[k] || {}).nar || D.ENTRY[k]),
  letter: (k) => cut((D.LETTER[k] || {}).nar || ''),
  toast:  (k) => cut((D.TOAST[k] || {}).nar || ''),
};
const NAME = { entry: '입장', letter: '편지 예고', toast: '축배·케이크' };
const GOAL = 8;   // 사장님 「3~8」의 위 끝

const out = [];
out.push('# 추리기 — 넘치는 셋의 전 벌 (자동 생성 · 2026-09-20)', '',
  '★ 손으로 적지 않는다. `node scripts/audit/pick-list.mjs > 이 파일` 로 다시 뽑는다.',
  '★ 사장님 지시 — 「각 이벤트당 3~8개 정도 베스트로 고를 수 있게」 / 「넘치는 거만」', '');

for (const ev of ['entry', 'letter', 'toast']) {
  const g = D.TONE[ev] || {};
  const rows = [];
  for (const [b, tones] of Object.entries(g)) {
    const c = CUR[ev] ? CUR[ev](b) : '';
    if (c) rows.push([b, '현행', c]);
    for (const [t, v] of Object.entries(tones)) rows.push([b, t, cut(v)]);
  }
  /* ★글자가 «완전히» 같은 벌 — 고객 화면에 둘이 나란히 서면 고를 수가 없다.
     [PICK_BASIS] 의 ①은 «같은 갈래 안»만 보기 때문에 이것을 못 잡았다(cake 와 both 는 다른 갈래다). */
  const seen = {};
  rows.forEach((r) => { (seen[r[2]] = seen[r[2]] || []).push(`${r[0]}.${r[1]}`); });
  const dup = Object.values(seen).filter((a) => a.length > 1);
  const over = Math.max(0, rows.length - GOAL);
  out.push(`## ${NAME[ev]} \`${ev}\` — ${rows.length}벌 → 목표 ${GOAL}벌 (**${over}벌 줄여야 함**)`, '');
  if (dup.length) {
    const after = rows.length - dup.reduce((s, a) => s + a.length - 1, 0);
    out.push(`★ **글자가 완전히 같은 벌**: ${dup.map((a) => a.join(' ≡ ')).join(' / ')} → 이 중복만 정리해도 ${after}벌`, '');
  }
  out.push('| 갈래 | 판 | 음절 | 문면 |', '|---|---|---:|---|');
  for (const [b, t, v] of rows) out.push(`| ${b} | ${t} | ${syl(v)} | ${v.replace(/\|/g, '/')} |`);
  out.push('');
}
console.log(out.join('\n'));
