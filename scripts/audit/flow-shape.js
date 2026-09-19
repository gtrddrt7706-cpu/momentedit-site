#!/usr/bin/env node
/* 흐름을 «시간축»으로 펼쳐서 모양을 본다 [FLOW_SHAPE] (2026-09-12)
 *
 *   node scripts/audit/flow-shape.js [코스] [--all]
 *
 * ★왜 — 사장님: *"진행 흐름을 파악하고 개선점은 없는지 … 완성도를 높여보자"*
 *   대본을 문장으로 읽으면 «한 줄씩은 다 좋은데 이어 들으면 이상한» 것을 못 잡는다.
 *   이 세션에서 값을 한 발견은 전부 «큐 엔진을 실제로 돌려» 나왔다 — 에이전트 진단은 오진이 75%였다.
 *   그래서 사람 판단을 넣지 않고, 시간축에 늘어놓고 «셀 수 있는 것»만 센다.
 *
 * 무엇을 보는가 — 전부 문장이 아니라 «모양»이다:
 *   ①한 목소리가 몇 초를 연속으로 끌고 가는가 (같은 화자가 오래 이어지면 방이 가라앉는다)
 *   ②말과 말 사이의 «침묵»이 어디에 얼마나 생기는가 (라이브 구간에 나레이션이 없는 자리)
 *   ③하객이 «움직여야 하는 지시»가 어디에 몰리는가 (연달아 오면 절반이 못 따라온다)
 *   ④감정 정점 사이의 간격 (붙어 있으면 서로를 지운다 · PEAK_ONE 에서 배운 것)
 *   ⑤블록별 시간 배분이 예산 안인가
 *
 * ★판정하지 않는다. 숫자를 찍고, 임계를 넘은 것만 ★로 표시한다.
 *   무엇을 고칠지는 사람이 정한다 — 이 검사가 「구멍은 보고만」의 도구다.
 */
const path = require('path');
const ROOT = path.join(__dirname, '..', '..');
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
const RC = require(path.join(ROOT, 'assets/ritual-cue.js'));

const ALL = process.argv.includes('--all');
const pick = process.argv.slice(2).filter((a) => !a.startsWith('--'))[0];
const COURSES = pick ? [pick] : Object.keys(D.COURSES);

/* 하객이 몸을 움직여야 하는 말인가 — 「주세요」·「주시기 바랍니다」로 끝나고 대상이 하객인 문장 */
const MOVE = /(나오|모여|서 주|앉아|일어|들어 주|부딪|흔들|돌려|붙어|살펴|답해|박수)/;
const sylOf = (t) => (String(t).match(/[가-힣]/g) || []).length;

for (const course of COURSES) {
  const cues = RC.build({ course }, { mode: 'console' }).cues;
  const name = D.COURSES[course]?.n || course;
  console.log(`\n${'='.repeat(64)}\n■ ${name} (${course})`);

  let t = 0;
  const row = [];
  for (const c of cues) {
    /* ★[POST_WAIT] post 의 대기·페이드도 «시간»이다. 빼고 재면 선언 뒤 박수 시간이 0 으로 잡혀
       「선언 직후에 바로 편지가 온다」는 가짜 지적이 나온다. 실제로 한 번 그렇게 나왔다. */
    const postSec = (c.post || []).reduce((a, p) => a + ((p.wait || 0) + (p.ms || 0)) / 1000, 0);
    const spoken = c.text ? (c.est || Math.round(sylOf(c.text) / 5)) : 0;
    row.push({ t, kind: '말', sec: spoken, blockN: c.blockN, slug: c.slug, text: c.text || '', voice: c.k === 'guest' || /guest/.test(c.slug) ? '안내' : '진행' });
    t += spoken + postSec;
    if (c.live) {
      row.push({ t, kind: '사람', sec: c.live.est || 0, blockN: c.blockN, slug: c.slug, text: c.live.t || '', voice: '라이브' });
      t += c.live.est || 0;
    }
  }
  const total = t;
  console.log(`  전체 ${Math.round(total / 60)}분 ${total % 60}초 · 큐 ${cues.length}개`);

  /* ② 침묵 — 라이브 구간이 연속으로 길게 이어지는 자리 */
  console.log('\n  ── 말 없이 흘러가는 구간 (라이브가 이어질 때)');
  let run = 0, from = null, runs = [];
  for (const r of row) {
    if (r.kind === '사람') { if (from === null) from = r; run += r.sec; }
    else { if (run) runs.push({ from, run }); run = 0; from = null; }
  }
  if (run) runs.push({ from, run });
  /* ★[LOOSE_COVER] 무음이라고 다 같은 무음이 아니다. 디렉터가 «골라 트는» 클립이 그 구간에
     준비돼 있으면, 체인상 조용해도 현장에서는 메울 수 있다. 그 둘을 구별해 표시한다.
     구별을 안 하면 이미 손쓴 자리를 계속 빨갛게 보고하게 되고, 보고가 닳는다. */
  const LOOSE = { '인사 사진': 'narr-round-mid', '단체촬영': 'PHOTOCUE 판' };
  for (const x of runs.sort((a, b) => b.run - a.run).slice(0, 5)) {
    const cover = LOOSE[x.from.blockN];
    const mark = x.run < 240 ? ' ' : cover ? '·' : '★';
    console.log(`     ${mark} ${String(Math.round(x.run)).padStart(4)}초  ${x.from.blockN} · ${x.from.slug}${cover ? `   (골라 트는 ${cover} 있음)` : ''}`);
  }

  /* ① 한 목소리 연속 */
  console.log('\n  ── 한 목소리가 연속으로 끄는 시간');
  let vrun = 0, vfrom = null, vruns = [];
  for (const r of row) {
    /* ★[GUEST_SPACED] 하객 맞이 네 클립은 «5~7분 간격으로 반복 재생»된다(큐 note).
       붙여서 재면 70초 연속으로 잡히는데 실제로는 그렇게 안 나간다. 블록째 뺀다. */
    if (r.blockN === '하객 맞이') { if (vrun) vruns.push({ vfrom, vrun }); vrun = 0; vfrom = null; continue; }
    if (r.kind !== '말') { if (vrun) vruns.push({ vfrom, vrun }); vrun = 0; vfrom = null; continue; }
    if (!vfrom) vfrom = r;
    vrun += r.sec;
  }
  if (vrun) vruns.push({ vfrom, vrun });
  for (const x of vruns.sort((a, b) => b.vrun - a.vrun).slice(0, 4)) {
    console.log(`     ${x.vrun >= 45 ? '★' : ' '} ${String(Math.round(x.vrun)).padStart(4)}초  ${x.vfrom.blockN} 부터`);
  }

  /* ③ 하객에게 가는 «동작 지시»가 몰린 자리 */
  console.log('\n  ── 하객이 몸을 움직여야 하는 지시');
  const moves = row.filter((r) => r.kind === '말' && r.blockN !== '하객 맞이' && MOVE.test(r.text));
  let near = 0;
  for (let i = 1; i < moves.length; i++) if (moves[i].t - moves[i - 1].t < 90) near++;
  console.log(`     총 ${moves.length}번 · 그중 앞 지시와 90초 안에 붙은 것 ${near}번 ${near >= 4 ? '★' : ''}`);
  for (let i = 1; i < moves.length; i++) {
    const gap = moves[i].t - moves[i - 1].t;
    if (gap < 45) console.log(`     ★ ${gap}초 간격  ${moves[i - 1].slug} → ${moves[i].slug}`);
  }

  /* ⑤ 블록별 배분 */
  console.log('\n  ── 블록별 시간');
  const by = {};
  for (const r of row) by[r.blockN] = (by[r.blockN] || 0) + r.sec;
  for (const [b, s] of Object.entries(by)) console.log(`     ${String(Math.round(s)).padStart(4)}초  ${b}`);
  if (!ALL && COURSES.length > 1 && course !== COURSES[0]) break;
}
