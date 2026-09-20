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

/* ★★[TONE_ARRAY 2026-09-20] TONE 값이 **문자열이 아닐 수 있다.** `toast.both.plain`·`warm` 은
   두 조각짜리 배열이다(케이크 + 축배). String() 으로 뭉개면 배열이 쉼표로 이어져
   「…한 조각입니다**.,**이어서 축배입니다」가 된다.
   ★실제로 그 출력이 코워크에게 건너가 「생성 버그다 · 급하다」는 오진을 낳았다. **저장소는 멀쩡했다.**
   내가 만든 중간 산출물을 남이 원본으로 믿은 것이 이번 주에만 두 번째다(91↔92 클립). */
const cut = (s) => (Array.isArray(s) ? s.join(' ') : String(s || '')).replace(/\s+/g, ' ').trim();
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
/* ★★[NAR2 2026-09-20] `nar` 만 읽으면 틀린다. TOAST.both 는 **두 조각**이다 —
   nar(케이크) + nar2(축배). 한 조각만 재다가 「both.현행 이 cake.현행 과 글자까지 같다」는
   거짓 양성을 만들었고, 그걸 근거로 「축배가 누락됐다」고 잘못 읽을 뻔했다.
   실제 클립으로 대조해 바로잡았다(41·42 는 같고 76 이 축배를 맡는다). */
const both = (o) => cut([(o || {}).nar, (o || {}).nar2].filter(Boolean).join(' '));
const CUR = {
  entry:   (k) => cut((D.ENTRY[k] || {}).nar || D.ENTRY[k]),
  declare: (k) => cut((D.DECLARE[k] || {}).nar || ''),
  tribute: (k) => cut((((D.TRIBUTE || {}).modes || {})[k] || {}).nar || ''),
  letter: (k) => both(D.LETTER[k]),
  toast:  (k) => both(D.TOAST[k]),
};
const NAME = { entry: '입장', declare: '성혼 선언', letter: '편지 예고', tribute: '부모님 헌정', toast: '축배·케이크' };
/* ★★[NO_QUOTA 2026-09-20 사장님 「겹치거나 별로인 거 전부 삭제해 과감하게 갯수 상관없이」]
   종전 기준은 「각 이벤트당 3~8개」였다. 그 뒤 지시가 바뀌었다 — **개수를 맞추는 일이 아니라
   «남길 이유가 있는 것만 남기는» 일**이다. 8벌을 채우려고 별로인 것을 남기지 않는다.
   그래서 「몇 벌 줄여야 함」을 안 찍는다. 그 숫자가 곧 «여기까지만 지우면 된다»로 읽히기 때문이다. */

const out = [];
out.push('# 추리기 — 다섯 이벤트 전 벌 (자동 생성 · 2026-09-20)', '',
  '★ 손으로 적지 않는다. `node scripts/audit/pick-list.mjs > 이 파일` 로 다시 뽑는다.',
  '★ 사장님 지시(2026-09-20) — **「겹치거나 별로인 거 전부 삭제해. 과감하게, 개수 상관없이」**',
  '   앞선 「각 이벤트당 3~8개」는 이 지시가 덮었다. 개수를 맞추는 일이 아니라 «남길 이유가 있는 것만» 남긴다.', '');

for (const ev of ['entry', 'declare', 'letter', 'tribute', 'toast']) {
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
  out.push(`## ${NAME[ev]} \`${ev}\` — ${rows.length}벌`, '');
  if (dup.length) {
    const after = rows.length - dup.reduce((s, a) => s + a.length - 1, 0);
    out.push(`★ **글자가 완전히 같은 벌**: ${dup.map((a) => a.join(' ≡ ')).join(' / ')} → 이 중복만 정리해도 ${after}벌`, '');
  }
  /* ★★[WORD_OVERLAP 2026-09-20 사장님 「겹치거나 별로인 거 전부 삭제해 과감하게」]
     «앞머리 몇 자»로는 안 잡힌다. 실제로 겹치는 것은 **쓰는 낱말**이다 —
     편지 plain 셋은 앞머리가 다른데 「이제, … 이제, 그 목소리가 이어집니다」 틀이 같아 75%가 겹친다.
     ★숫자만으로 «별로»라고 하지 않는다([RULE_EASY]). 표에 문면을 함께 실어 눈으로 받치게 둔다. */
  const NM = /[가-힣]{2,}/g;
  const W = rows.map((r) => new Set(r[2].match(NM) || []));
  const pair = [];
  for (let i = 0; i < rows.length; i++) for (let j = i + 1; j < rows.length; j++) {
    let n = 0; W[i].forEach((x) => { if (W[j].has(x)) n++; });
    const jac = n / (W[i].size + W[j].size - n);
    if (jac >= 0.45) pair.push([jac, `${rows[i][0]}·${rows[i][1]}`, `${rows[j][0]}·${rows[j][1]}`]);
  }
  pair.sort((a2, b2) => b2[0] - a2[0]);
  if (pair.length) {
    out.push('★ **쓰는 낱말이 45% 이상 겹치는 짝** — 고객이 나란히 보면 고를 이유가 안 보인다', '');
    for (const [j, a2, b2] of pair) out.push(`- ${(j * 100).toFixed(0)}%  \`${a2}\` ↔ \`${b2}\``);
    out.push('');
  }
  out.push('| 갈래 | 판 | 음절 | 문면 |', '|---|---|---:|---|');
  for (const [b, t, v] of rows) out.push(`| ${b} | ${t} | ${syl(v)} | ${v.replace(/\|/g, '/')} |`);
  out.push('');
}
console.log(out.join('\n'));
