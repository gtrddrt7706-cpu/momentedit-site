#!/usr/bin/env node
/* 한 예식 안에서 같은 말이 두 번 나가는지 본다 [ECHO_INRUN] (2026-09-12)
 *
 *   node scripts/check-echo-inrun.mjs [--n 4] [--all]
 *
 * ★왜 — 사장님: *"대본 전수점검 흐름별로 파악하고 스탭바이스탭으로"*
 *   대본을 파일로 읽으면 «대안 클립»이 잔뜩 섞여 있어 겹쳐 보인다. declare-1 과 declare-2 가
 *   같은 말을 해도 고객이 하나만 고르니 문제가 아니다. 문제는 **실제로 한 예식에서 둘 다 나가는**
 *   클립끼리 겹칠 때다. 그건 하객이 «아까 그 말 또 하네» 하고 알아채는 자리다.
 *   눈으로는 절대 못 찾는다 — 두 클립이 대본에서 30줄 떨어져 있고, 코스마다 조합이 다르다.
 *
 * ★어떻게 — ritual-cue.js 의 build(S) 를 코스별로 실제로 돌려 «그 예식에서 나가는 큐 목록»을
 *   받는다. 대안 클립 판정을 손으로 적지 않는다 — 큐 엔진이 고른 것만 본다. 그래서 순서를
 *   바꾸거나 코스를 늘려도 이 검사는 저절로 따라온다.
 *
 * ★[BOOKEND] 같은 블록의 여는 말·닫는 말이 한 낱말을 주고받는 것은 «수미상관»이라 설계다
 *   (「오늘의 첫 순간을 함께 나눕니다」 → 「…함께 나눴습니다」). 같은 블록 안이면 통과시킨다.
 *   블록을 건너뛴 겹침만 잡는다.
 * ★[FIXED_ADDR] 「두 사람」·「여러분」·「두 분」은 고정 호칭이라 셀 수 없다. 겹침에서 뺀다.
 *
 * ★★[N4_NOT_CLEAN] 기본 문턱이 4어절인 것은 «지금 4어절에서 0건이라서»가 아니다 —
 *   3어절은 관용구(「오늘 이 자리」·「편히 계시면 됩니다」)까지 걸려 사람이 판단할 몫이고,
 *   4어절부터는 판단 없이 «겹쳤다»고 말할 수 있어서다. 문턱을 올려 초록을 만든 것이 아니다.
 *   ★3어절에서 실제로 걸리는 것이 지금 있다. 초록이라고 «없다»는 뜻이 아니다:
 *     「편히 계시면 됩니다」  인사 사진 → 단체촬영 (바로 다음 블록)
 *     「오늘 이 자리를 …」    성혼 선언 · 폐식 · 배웅 (감동 코스 3회 · 「채우다」까지 겹침)
 *   고칠지는 사장님 결정 사항이다(나레이션 재녹음이 따라온다). `--n 3` 으로 언제든 다시 본다.
 *
 * ★종료 코드 0 통과 · 1 블록을 건너뛴 겹침 발견
 */
const path = require('path');
const ROOT = path.join(__dirname, '..');
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));

const N = Number((process.argv.find((a, i) => process.argv[i - 1] === '--n')) || 4);
const ALL = process.argv.includes('--all');
const FIXED = ['두 사람', '두 분', '여러분', '하객분들', '신랑 신부'];

const norm = (t) => {
  let s = String(t || '');
  for (const f of FIXED) s = s.split(f).join(' ');
  return s.replace(/[^가-힣\s]/g, ' ').split(/\s+/).filter(Boolean);
};

let bad = 0;
for (const course of Object.keys(D.COURSES)) {
  const cues = RC.build({ course }, { mode: 'console' }).cues.filter((c) => c.text);
  const seen = new Map();          // 구절 → [{slug, blockN}]
  for (const c of cues) {
    const w = norm(c.text);
    const put = new Set();
    for (let i = 0; i + N <= w.length; i++) put.add(w.slice(i, i + N).join(' '));
    for (const k of put) (seen.get(k) || seen.set(k, []).get(k)).push({ slug: c.slug, blockN: c.blockN });
  }
  const rows = [];
  for (const [k, v] of seen) {
    if (v.length < 2) continue;
    if (new Set(v.map((x) => x.slug)).size < 2) continue;
    if (new Set(v.map((x) => x.blockN)).size < 2) continue;   // [BOOKEND] 같은 블록은 봐준다
    rows.push([k, v]);
  }
  // 긴 구절에 포함되는 짧은 구절은 지운다
  rows.sort((a, b) => b[0].length - a[0].length);
  const keep = [];
  for (const [k, v] of rows) {
    if (keep.some(([k2]) => k2.includes(k))) continue;
    keep.push([k, v]);
  }
  const name = D.COURSES[course]?.n || course;
  console.log(`\n■ ${name} (${course}) · 큐 ${cues.length}개 — 블록을 건너뛴 겹침 ${keep.length}건`);
  for (const [k, v] of keep) {
    bad++;
    console.log(`   「${k}」`);
    for (const x of v) console.log(`       ${x.blockN} · ${x.slug}`);
  }
  if (!keep.length) console.log('   없음');
}
if (bad && !ALL) {
  console.log(`\n✗ 한 예식 안에서 블록을 건너뛰어 반복되는 구절 ${bad}건 — 하객이 «아까 그 말» 하고 알아챕니다.`);
  process.exit(1);
}
console.log('\nECHO INRUN OK');
