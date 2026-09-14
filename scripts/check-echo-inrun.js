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
 * ★★[PRED_ECHO 2026-09-12] 구절만 보면 놓치는 것이 있다 — 실측으로 배웠다.
 *     narr-entry-out  「두 사람이 나란히 섰습니다」
 *     narr-welcome-in 「두 사람이 자리에 섰습니다」   ← 바로 다음 클립
 *   연속 두 클립이 같은 동사로 끝나는데, 4어절 겹침으로는 «나란히/자리에»가 달라 안 잡힌다.
 *   하객 귀에는 «구절»이 아니라 «끝음»이 남는다 — 문장의 마지막 서술어가 반복되면 알아챈다.
 *   그래서 큐 두 개 이내 거리에서 «같은 서술어 어간»이 되풀이되는지 따로 센다.
 *   ★보조용언(주다·되다·하다·있다)은 뺀다 — 「주세요」·「됩니다」는 한국어 안내문의 뼈대라
 *     반복을 셀 수 없다. 뜻을 나르는 동사만 본다.
 *
 * ★종료 코드 0 통과 · 1 블록을 건너뛴 겹침 또는 이웃 서술어 반복 발견
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
/* ── [PRED_ECHO] 이웃한 큐에서 같은 서술어가 되풀이되는가 */
/* ★[AUX_ONLY] 어간을 «길이»로 거르면 안 된다 — 실측으로 배웠다. 「섰습니다」의 어간은 「섰」
   한 글자인데, 이게 narr-entry-out → narr-welcome-in 의 진짜 반복이었다. 길이 필터가 그걸 지웠다.
   거를 것은 짧은 어간이 아니라 «보조용언»이다 — 「주세요」·「됩니다」·「합니다」는 한국어 안내문의
   뼈대라 반복을 셀 수 없다. 목록으로 명시해 거른다. 목록에 없으면 뜻을 나르는 동사로 본다. */
const AUX = new Set(['주', '되', '돼', '하', '해', '있', '없', '같', '이', '그렇', '드리', '계시', '오']);
const stemOf = (t) => {
  const m = /([가-힣]{1,6}?)(습니다|입니다|어요|에요|예요|세요|시죠|죠|겠다)[.!?]?$/.exec(t.trim());
  return m && !AUX.has(m[1]) ? m[1] : null;
};
let pred = 0;
for (const course of Object.keys(D.COURSES)) {
  const cues = RC.build({ course }, { mode: 'console' }).cues.filter((c) => c.text);
  const seq = [];
  cues.forEach((c, i) => String(c.text).split(/(?<=[.!?])\s+/).forEach((t) => {
    const v = stemOf(t);
    if (v) seq.push({ i, v, t, slug: c.slug, b: c.blockN });
  }));
  const hits = [];
  for (let a = 0; a < seq.length; a++) {
    for (let b = a + 1; b < seq.length; b++) {
      if (seq[b].i - seq[a].i > 2) break;
      if (seq[a].v === seq[b].v && seq[a].slug !== seq[b].slug) hits.push([seq[a], seq[b]]);
    }
  }
  const name = D.COURSES[course]?.n || course;
  console.log(`\n■ ${name} (${course}) — 이웃 큐(2개 이내) 서술어 반복 ${hits.length}건`);
  for (const [x, y] of hits) {
    pred++;
    console.log(`   「${x.v}…」`);
    console.log(`       ${x.b} · ${x.slug} | ${x.t}`);
    console.log(`       ${y.b} · ${y.slug} | ${y.t}`);
  }
  if (!hits.length) console.log('   없음');
}
/* ★★[PRED_REPORT_ONLY] 이 부분은 «보고만» 한다 — 게이트로 만들지 않는다.
   지금 걸리는 것이 실재하고(아래 수치), 고치면 우성 나레이션 재녹음이 따라온다.
   게이트로 걸면 둘 중 하나가 된다 — 병합이 막히거나, 내가 초록을 만들려고 문안을 손대거나.
   둘 다 안 된다(「구멍은 보고만, 메움은 합의 후」). 사장님이 정하면 그때 게이트로 올린다.
   ★대신 «알고 있는 건수»를 여기 박아 둔다. 늘어나면 다음 사람이 알아채라고. */
const PRED_KNOWN = 0;   // 2026-09-12 [TIC_CUT] 뒤 실측 — 0건. 늘면 빨개진다
if (pred > PRED_KNOWN) {
  console.log(`\n✗ 이웃 큐 서술어 반복이 ${PRED_KNOWN}건에서 ${pred}건으로 늘었습니다.`);
  process.exit(1);
}
if (pred) console.log(`\n· 이웃 큐 서술어 반복 ${pred}건 — 알려진 것(${PRED_KNOWN})과 같습니다. 결정 대기 중이라 게이트로 세지 않습니다.`);

if (bad && !ALL) {
  console.log(`\n✗ 한 예식 안에서 블록을 건너뛰어 반복되는 구절 ${bad}건 — 하객이 «아까 그 말» 하고 알아챕니다.`);
  process.exit(1);
}
console.log('\nECHO INRUN OK');
