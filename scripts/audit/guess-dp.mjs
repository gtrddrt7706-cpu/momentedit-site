// ★★[GUESS_DP 2026-10-11] «빠진 자리» 1 · 2등 DP(lib/sent-bounds guessTop2)가 옛 전수 훑기와 같은 답을 내는가 · 큰 판이 금방 끝나는가.
//
//   node scripts/audit/guess-dp.mjs
//
// 왜 — 옛 훑기는 뺄 자리 조합 C(n, n−B) 를 전부 돌았다. 43_parents-letter(49문장 · 덩어리 34)는 1.6조 가지라
//   실청판 생성(build-listen-all)이 끝나지 않았다. DP 로 바꾸면서 «답이 같다»를 말로만 하지 않고 여기서 잰다.
// 무엇을 보나
//   ① 무작위 판 600개(문장 2~12 · 덩어리 1~문장 수 · 같은 비용이 나오게 일부러 정수 길이도 섞음) — 옛 훑기의 1 · 2등과 한 글자까지 같다
//   ② 같은 비용 둘(사전순이 가르는 판)을 손으로 만든 것 — 옛 차례(뺀 자리 사전순)대로
//   ③ 49문장 · 덩어리 34 — 1초 안에 끝난다(옛 훑기는 끝나지 않는다)
//   ④ 깨 보기 — 사전순을 거꾸로 하거나 둘째를 버리면 ① · ② 가 빨강이다
// 종료 코드 0 통과 · 1 실패
import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const L = await import(path.join(ROOT, 'scripts/lib/sent-bounds.mjs'));
const { guessTop2, RATE_LO, RATE_HI, RATE_MID } = L;
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) fail++; };

/* 옛 전수 훑기 그대로(2026-08-16 BLOCK_FIT 판) — 비교의 기준 */
function brute(sy, spoken) {
  const n = sy.length, B = spoken.length, cand = [];
  if (n - B < 0) return [];
  (function walk(i, picked) {
    if (picked.length === n - B) {
      const keep = []; for (let k = 0; k < n; k++) if (!picked.includes(k)) keep.push(k);
      let cost = 0, all = true;
      keep.forEach((k, j) => { const r = sy[k] / spoken[j]; if (r < RATE_LO || r > RATE_HI) all = false; cost += Math.abs(r - RATE_MID); });
      if (all) cand.push({ drop: picked.slice(), cost, rates: keep.map((k, j) => +(sy[k] / spoken[j]).toFixed(1)) });
      return;
    }
    for (let k = i; k < n; k++) { picked.push(k); walk(k + 1, picked); picked.pop(); }
  })(0, []);
  cand.sort((a, b) => a.cost - b.cost);
  return cand.slice(0, 2);
}
let seed = 20261011; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
function cases(N) { const out = [];
  for (let t = 0; t < N; t++) { const n = 2 + Math.floor(rnd() * 11), B = 1 + Math.floor(rnd() * n), whole = rnd() < 0.3;
    const sy = Array.from({ length: n }, () => 4 + Math.floor(rnd() * 30));
    const spoken = Array.from({ length: B }, () => whole ? 1 + Math.floor(rnd() * 6) : +(0.6 + rnd() * 6).toFixed(2));
    out.push({ sy, spoken }); }
  return out; }
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
function check(fn, N) { let bad = 0, nonEmpty = 0, two = 0, first = null;
  for (const c of cases(N)) { const x = fn(c.sy, c.spoken), y = brute(c.sy, c.spoken); if (y.length) nonEmpty++; if (y.length > 1) two++; if (!same(x, y)) { bad++; if (!first) first = { c, x, y }; } }
  return { bad, nonEmpty, two, first }; }

seed = 20261011; const r1 = check(guessTop2, 600);
ok(`① 무작위 600판 — 옛 전수 훑기와 1 · 2등이 한 글자까지 같다(답이 있는 판 ${r1.nonEmpty} · 둘 다 있는 판 ${r1.two})`, r1.bad === 0 && r1.nonEmpty > 100 && r1.two > 50, r1.first && JSON.stringify(r1.first).slice(0, 300));
/* ② 같은 비용 — 문장 셋 · 덩어리 둘 · 첫째와 둘째가 같은 음절이면 «0 을 뺀다»와 «1 을 뺀다»가 같은 비용이다 → 옛 차례는 [0] 이 먼저 */
{ const sy = [20, 20, 20], spoken = [3, 3]; const x = guessTop2(sy, spoken), y = brute(sy, spoken);
  ok('② 같은 비용이면 옛 차례(뺀 자리 사전순) — [0] · [1] 순', same(x, y) && same(x.map((p) => p.drop), [[0], [1]]), JSON.stringify(x)); }
/* ③ 큰 판 — 49문장 · 덩어리 34(43_parents-letter 모양) */
{ seed = 43; const sy = Array.from({ length: 49 }, () => 6 + Math.floor(rnd() * 26)), spoken = Array.from({ length: 34 }, () => +(1 + rnd() * 5).toFixed(2));
  const t0 = Date.now(); const x = guessTop2(sy, spoken); const ms = Date.now() - t0;
  ok(`③ 49문장 · 덩어리 34 가 ${ms}ms 에 끝난다(옛 훑기 1.6조 가지) · 많아야 둘`, ms < 1000 && x.length <= 2, ms + 'ms'); }
/* ④ 깨 보기 — 사전순을 거꾸로(같은 비용이면 뒤 조합이 앞) · 둘째를 버림 */
{ const flipTie = (sy, sp) => { const a = guessTop2(sy, sp); return a.length > 1 && a[0].cost === a[1].cost ? [a[1], a[0]] : a; };
  const oneOnly = (sy, sp) => guessTop2(sy, sp).slice(0, 1);
  seed = 20261011; const b1 = check(oneOnly, 600);
  const b2 = same(flipTie([20, 20, 20], [3, 3]), brute([20, 20, 20], [3, 3]));
  ok('④ 깨 보기 — 둘째를 버리면 ① 이 빨강 · 사전순을 뒤집으면 ② 가 빨강', b1.bad > 0 && !b2, `둘째 버림 어긋남 ${b1.bad} · 뒤집힘 같음 ${b2}`); }
console.log(fail ? `\nGUESS_DP FAIL ${fail}` : '\nGUESS_DP OK'); process.exit(fail ? 1 : 0);
