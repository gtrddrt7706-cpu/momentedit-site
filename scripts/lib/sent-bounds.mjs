// 조립된 클립 안에서 **문장 경계**를 찾는다 [GAP_MATCH] — 단일 구현
//
// ★왜 따로 뺐나 [ONE_SPEC]
//   `extract-existing-sent.mjs`(잘라내기)와 `build-listen-all.mjs`(문장별 재생 구간)가
//   같은 경계를 필요로 한다. 두 곳에 각각 적으면 언젠가 갈라지고,
//   갈라지면 «자른 소리»와 «화면이 가리키는 자리»가 어긋난다 — 그게 가장 찾기 어려운 병이다.
//
// ★[GAP_MATCH] 경계는 «긴 무음»이 아니라 **설계된 쉼 값에 가까운 무음**이다
//   조립기는 문장 사이에 manifest 가 정한 값(after+before)만큼 무음을 «넣는다».
//   그래서 경계 쉼들은 서로 비슷하고, 사람이 말하다 쉰 것은 그 값에서 멀다.
//   실사고: 05_entry-A 의 「신랑 신부,」 뒤 극적인 쉼 0.76초가 문장 사이 0.5초보다 길어
//   길이순 1등으로 뽑혔고 「입장!」만 잘려 나왔다(사용자가 귀로 잡았다).
//
// ★못 정하겠으면 **null 을 돌려준다.** 헷갈린 채 자리를 찍지 않는다.
import { spawnSync } from 'node:child_process';

export function durOf(file) {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', file], { encoding: 'utf8' });
  if (r.error) return NaN;
  const v = parseFloat(String(r.stdout || '').trim());
  return (isFinite(v) && v > 0) ? v : NaN;
}

export function silences(file, d) {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', file, '-af', 'silencedetect=n=-50dB:d=0.05', '-f', 'null', '-'], { encoding: 'utf8' });
  const seg = []; let cur = null;
  for (const m of (r.stderr || '').matchAll(/silence_(start|end): ([-\d.]+)/g)) {
    if (m[1] === 'start') cur = parseFloat(m[2]);
    else if (cur !== null) { seg.push([cur, parseFloat(m[2])]); cur = null; }
  }
  if (cur !== null) seg.push([cur, d]);
  return seg;
}

/** 클립 파일 + manifest 의 sents → [[시작, 끝], …] · 못 정하면 null */
export function sentBounds(file, sents) {
  const n = (sents || []).length;
  if (!n) return null;
  const d = durOf(file); if (!isFinite(d)) return null;
  if (n === 1) {
    const seg1 = silences(file, d);
    const h1 = (seg1.length && seg1[0][0] <= 0.05) ? seg1[0][1] : 0;
    const t1 = (seg1.length && seg1[seg1.length - 1][1] >= d - 0.06) ? seg1[seg1.length - 1][0] : d;
    return [[h1, t1]];
  }
  const seg = silences(file, d);
  const headEnd = (seg.length && seg[0][0] <= 0.05) ? seg[0][1] : 0;
  const tailStart = (seg.length && seg[seg.length - 1][1] >= d - 0.06) ? seg[seg.length - 1][0] : d;
  const inner = seg.filter(([s, e]) => s > headEnd + 0.01 && e < tailStart - 0.01);
  const need = n - 1;
  if (inner.length < need) return null;

  const designed = sents.slice(0, -1).map((x, k) => (x.after || 0) + (sents[k + 1].before || 0));
  const target = designed.reduce((a, b) => a + b, 0) / designed.length;
  const scored = inner.map((g) => ({ g, d: Math.abs((g[1] - g[0]) - target) })).sort((a, b) => a.d - b.d);
  /* 뽑힌 것과 안 뽑힌 것의 거리 차가 붙어 있으면 헷갈린 것이다 — 찍지 않는다 */
  if (scored.length > need && scored[need].d - scored[need - 1].d < 0.05) return null;

  const bound = scored.slice(0, need).map((x) => x.g).sort((a, b) => a[0] - b[0]);
  const mids = bound.map(([s, e]) => (s + e) / 2);
  const starts = [headEnd, ...mids], ends = [...mids, tailStart];
  const out = starts.map((s, i) => [+s.toFixed(3), +ends[i].toFixed(3)]);
  /* 뒤집힌 자리가 하나라도 있으면 못 정한 것이다 */
  if (out.some(([a, b]) => !(b > a))) return null;
  /* ★[RATE_VETO 2026-08-16] GAP_MATCH 가 골라도 **사람이 못 내는 속도**가 나오면 틀린 것이다.
     실사고: 11_narr-welcome-in 에서 「먼저,」 뒤의 짧은 쉼(0.16초)이 유일한 안쪽 무음이라
     그게 경계로 뽑혔고, 첫 문장 17음절에 0.69초(초당 25음절)가 배정됐다.
     한국어 말속도는 빨라야 초당 8~9음절이다(이 저장소 실측 중앙값 6.8). 10을 넘으면 물리적으로 불가능.
     ★고르는 자(GAP_MATCH)와 **거부하는 자**(여기)를 나눈다 — 고르는 자를 아무리 다듬어도
       입력이 모자란 클립은 있고, 그때는 «모르겠다»가 정답이다. */
  const sylOf = (t) => (String(t).match(/[가-힣]/g) || []).length;
  for (let i = 0; i < out.length; i++) {
    const sy = sylOf(sents[i].text); if (sy < 3) continue;
    const sec = out[i][1] - out[i][0];
    if (sy / sec > 10) return null;
  }
  return out;
}

/* ★★[BLOCK_FIT 2026-08-16] 「소리 덩어리」에 대본 문장이 다 들어갈 수 있는가
   ─ 왜 여기 두나: 이 판단이 두 곳에서 쓰인다(check-audio-sents 가 붉히고, 실청 화면이 표시한다).
     자를 두 벌 만들면 언젠가 둘이 다른 말을 한다 — 문장 경계를 여기 하나로 모은 것과 같은 이유다.
   ─ 무엇을 재나: 무음으로 잘린 덩어리마다 «초당 음절»을 따로 낸다. 클립 전체 평균이 아니다.
     평균은 「문장 하나가 통째로 빠져 시간이 남는 것」을 «여유 있게 읽었다»로 덮는다 — 실제로 덮었다
     (13_narr-vow-in · 전체 초당 7.7 로 상한 9.5 밑이라 통과했는데 3문장 중 2문장만 들어 있었다).
   ─ 무엇을 돌려주나: { ok, blocks, sy, guess }
       ok=true  → 사람 속도로 설명되는 배분이 하나라도 있다(붙여 읽은 것일 수 있다 · 통과)
       ok=false → 그 소리로는 대본을 다 읽을 수 없다 = 문장이 빠진 것이다
       guess    → {drop:[0-based], rates} 가장 그럴듯한 «빠진 자리». 1·2등이 붙으면 {tie:[...]} 만 준다.
   ★[CANT_HEAR] 어느 말인지는 여전히 모른다 — 자리와 개수까지가 기계의 말이다. */
export const RATE_LO = 3.5, RATE_HI = 9.0, RATE_MID = 6.8, GUESS_TIE = 0.5;

export function blockFit(file, sents) {
  const n = (sents || []).length;
  const d = durOf(file);
  if (n < 2 || !isFinite(d)) return null;
  const seg = silences(file, d);
  const head = (seg.length && seg[0][0] <= 0.05) ? seg[0][1] : 0;
  const tail = (seg.length && seg[seg.length - 1][1] >= d - 0.06) ? seg[seg.length - 1][0] : d;
  const inner = seg.filter(([s, e]) => s > head + 0.01 && e < tail - 0.01);
  const designed = sents.slice(0, -1).map((x, k) => (x.after || 0) + (sents[k + 1].before || 0));
  const minGap = Math.min(...designed);
  if (!(minGap > 0)) return null;                       // 붙여 읽는 클립은 셀 수 없다
  const cuts = inner.filter(([s, e]) => (e - s) >= minGap * 0.7);
  const blocks = []; { let at = head;
    for (const [s, e] of cuts) { blocks.push([at, s]); at = e; } blocks.push([at, tail]); }
  const spoken = blocks.map(([a, b]) => (b - a) - inner
    .filter(([s, e]) => s >= a && e <= b).reduce((x, [s, e]) => x + (e - s), 0));
  if (spoken.some((x) => !(x > 0))) return null;
  const sylOf = (t) => (String(t).match(/[가-힣]/g) || []).length;
  const sy = sents.map((x) => sylOf(x.text));
  const B = spoken.length;
  if (B >= n) return { ok: true, blocks: spoken, sy, guess: null };

  /* n문장을 B덩어리에 차례대로 나누는 배분 중 «전부 사람 속도»인 것이 하나라도 있나 */
  let any = false;
  (function walk(i, k) {
    if (any) return;
    if (k === B) { if (i === n) any = true; return; }
    for (let take = 1; take <= n - i - (B - k - 1); take++) {
      const r = sy.slice(i, i + take).reduce((a, b) => a + b, 0) / spoken[k];
      if (r >= RATE_LO && r <= RATE_HI) walk(i + take, k + 1);
    }
  })(0, 0);
  if (any) return { ok: true, blocks: spoken, sy, guess: null };

  /* 어느 자리가 빠졌나 — n-B 개를 빼고 나머지를 1:1 로 놓아 또래 속도(6.8)에 가장 가까운 것 */
  const cand = guessTop2(sy, spoken);   // [GUESS_DP] 1 · 2등만(아래 GUESS_TIE 가 둘만 본다)
  /* ★[GUESS_TIE] 1등과 2등이 이만큼도 안 벌어지면 지목하지 않는다 — [GAP_MATCH] 와 같은 처방.
     실측 27_letter-parent: 3번째를 빼면 1.90 · 4번째를 빼면 1.94 (차이 0.04). 기계는 못 가린다.
     형제 클립 28·29 는 둘 다 「편지를 펼치고, 천천히 읽으시면 됩니다.」를 가리킨다 — 그 판단은 사람 몫이다. */
  const guess = !cand.length ? null
    : (cand.length > 1 && cand[1].cost - cand[0].cost < GUESS_TIE)
      ? { tie: cand.slice(0, 2).map((x) => x.drop.slice()) }
      : cand[0];
  return { ok: false, blocks: spoken, sy, guess };
}

/* ★★[GUESS_DP 2026-10-11] «빠진 자리» 1 · 2등을 DP 로 — 종전엔 뺄 자리 조합을 전부 훑었다(C(n, n−B) 가지).
   ─ 왜: 43_parents-letter(혼주 편지 · 49문장 · 덩어리 34)는 1.6조 가지라 실청판 생성(build-listen-all)이 끝나지 않았다
     (10/11 · 16분 넘게 CPU 를 쓰다 끊었다). 문장이 긴 배역 클립이 생기면 check-audio-sents 도 같은 자리에서 멈춘다.
   ─ 같은 답인가: 칸(i, j) = 앞 i 문장으로 앞 j 덩어리를 1:1 로 채운 배분(나머지는 뺌) 중 (비용, 뺀 자리 사전순)으로 앞선 둘만 남긴다.
     같은 꼬리를 붙이면 두 배분의 앞뒤가 안 바뀌므로 끝 칸의 둘이 전체 1 · 2등이다. 비용은 종전과 같은 차례(덩어리 0 → B−1)로 더해
     부동소수까지 같고, 같은 비용이면 종전 차례(조합을 사전순으로 훑고 비용으로 안정 정렬)대로 뺀 자리 사전순이 앞선다.
     scripts/audit/guess-dp.mjs 가 무작위 판 수백 개에서 옛 전수 훑기와 한 글자까지 같은지 잰다.
   ─ 돌려주는 것: [{ drop, cost, rates }] 비용 순 · 많아야 둘 · 없으면 [] */
export function guessTop2(sy, spoken) {
  const n = sy.length, B = spoken.length, D = n - B;
  if (D < 0) return [];
  const lexLess = (a, b) => { for (let t = 0; t < a.length; t++) if (a[t] !== b[t]) return a[t] < b[t]; return false; };
  const before = (x, y) => x.cost < y.cost || (x.cost === y.cost && lexLess(x.drop, y.drop));
  const keep2 = (L) => L.sort((x, y) => (before(x, y) ? -1 : before(y, x) ? 1 : 0)).slice(0, 2);
  let F = []; for (let j = 0; j <= B; j++) F.push([]);
  F[0] = [{ cost: 0, drop: [] }];
  for (let i = 0; i < n; i++) {
    const G = []; for (let j = 0; j <= B; j++) G.push([]);
    for (let j = 0; j <= B; j++) {
      if (F[j].length && i + 1 - j <= D) for (const p of F[j]) G[j].push({ cost: p.cost, drop: p.drop.concat(i) });   // 문장 i 를 뺀다
      if (j > 0 && F[j - 1].length) { const r = sy[i] / spoken[j - 1];                                               // 문장 i 를 덩어리 j−1 에
        if (r >= RATE_LO && r <= RATE_HI) for (const p of F[j - 1]) G[j].push({ cost: p.cost + Math.abs(r - RATE_MID), drop: p.drop }); }
      G[j] = keep2(G[j]);
    }
    F = G;
  }
  return F[B].filter((p) => p.drop.length === D).map((p) => { const keep = []; for (let k = 0; k < n; k++) if (p.drop.indexOf(k) < 0) keep.push(k);
    return { drop: p.drop.slice(), cost: p.cost, rates: keep.map((k, j) => +(sy[k] / spoken[j]).toFixed(1)) }; });
}
