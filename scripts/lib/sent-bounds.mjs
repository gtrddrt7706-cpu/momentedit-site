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
