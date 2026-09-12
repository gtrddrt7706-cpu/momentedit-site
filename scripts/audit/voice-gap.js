#!/usr/bin/env node
/* 성우 목소리가 서로 겹치는지 «실측»한다 [VOICE_GAP] (2026-09-12)
 *
 *   node scripts/audit/voice-gap.js [--table]
 *
 * ★왜 — 사장님: *"성우 목소리겹치는거 다르게"*
 *   귀로는 「비슷하다」까지만 말할 수 있다. 무엇을 얼마나 바꿔야 하는지는 재야 안다.
 *   이 저장소에 이미 그 선례가 있다 — [VOICE_GROOM_2] 「이준 116.8Hz → 이겸 133.3Hz(+16.5Hz).
 *   바뀐 것이 소리에서 재진다」. 같은 방법을 여덟 자리 전체로 넓힌다.
 *
 * ★어떻게 — 녹음된 mp3 를 8kHz 모노로 내려 자기상관으로 기본주파수(F0)를 잡고 중앙값을 쓴다.
 *   ★[OCTAVE_FIX] 자기상관은 «반 랙»에도 강하게 물려 한 옥타브 아래로 잘못 잡는 일이 흔하다.
 *     그래서 반 랙의 상관이 0.85 배를 넘으면 그쪽을 택한다. 이 보정이 없으면 여성 성우가
 *     남성대로 내려앉아 «겹친다»는 가짜 경보가 난다(실제로 한 번 그렇게 나왔다).
 *   ★무음 구간은 에너지로 걸러낸다. 숨소리에서 F0 를 잡으면 값이 흩어진다.
 *
 * ★★[당일 예식이 아니라 «미리듣기»가 문제다]
 *   당일에는 나레이션이 우성 하나뿐이고 나머지는 실제 사람이 말한다 — 겹칠 일이 없다.
 *   그런데 미리듣기(배역 예시)는 여덟 목소리를 «이어서» 듣는다. 거기서 두 사람이 같은 높이면
 *   고객은 누가 말하는지 놓친다. 특히 진행 나레이션이 배역 앞뒤에 붙으므로,
 *   배역이 진행과 가까우면 「진행자가 계속 말하네」로 들린다.
 *
 * ★판정하지 않는다 — 숫자와 «누구를 바꾸면 값이 싼지»만 찍는다. 성우는 사장님이 고른다.
 *
 * ★종료 코드 0 통과 · 1 15Hz 미만으로 붙은 쌍이 알려진 수보다 늘었을 때
 */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ROOT = path.join(__dirname, '..', '..');
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const REC = {
  cast: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/cast/_recorded.json'), 'utf8')).clips,
  narr: JSON.parse(fs.readFileSync(path.join(ROOT, 'assets/audio/narration/_recorded.json'), 'utf8')).clips,
};
const V = { 진행: '우성', 안내: '진희', 편지: '김호인', 신랑: '이겸', 신부: '서진', 아버님: '권일', 어머님: '주하', 하객대표: '규민' };
/* 몇 클립을 녹음했는가 — 바꿀 때 드는 값이다. 적을수록 갈아 끼우기 싸다. */
const files = {};
for (const c of M.clips) {
  if (c.mix) continue;
  const k = `${c.no}_${c.file}`, d = /cast/.test(c.dir) ? 'cast' : 'narr';
  if (!REC[d][k]) continue;
  const v = V[c.role] || c.role;
  (files[v] ||= []).push(path.join(ROOT, c.dir, `${k}.mp3`));
}

const f0 = (p, want) => {
  let buf;
  try { buf = execFileSync('ffmpeg', ['-v', 'quiet', '-i', p, '-ac', '1', '-ar', '8000', '-f', 's16le', '-'], { maxBuffer: 1 << 28 }); } catch { return []; }
  const n = buf.length >> 1; if (n < 8000) return [];
  const x = new Int16Array(n);
  for (let i = 0; i < n; i++) x[i] = buf.readInt16LE(i * 2);
  const SR = 8000, W = 1024, LO = Math.floor(SR / 320), HI = Math.floor(SR / 65);
  const out = []; const step = Math.max(1, Math.floor((n - W) / (want * 2)));
  for (let s = 0; s + W < n && out.length < want; s += step) {
    let e = 0; for (let i = 0; i < W; i++) e += x[s + i] * x[s + i]; e /= W;
    if (e < 3e5) continue;
    let best = 0, bl = 0;
    for (let lag = LO; lag < HI; lag++) {
      let a = 0; for (let i = 0; i + lag < W; i += 2) a += x[s + i] * x[s + i + lag];
      if (a > best) { best = a; bl = lag; }
    }
    if (!bl || best < 0.35 * e * W / 2) continue;
    /* [OCTAVE_FIX] 반 랙이 0.85배 넘게 물리면 그쪽이 진짜 주기다 */
    const h = bl >> 1; let f = SR / bl;
    if (h >= LO) { let a = 0; for (let i = 0; i + h < W; i += 2) a += x[s + i] * x[s + i + h]; if (a > 0.85 * best) f = SR / h; }
    out.push(f);
  }
  return out;
};

const res = {};
for (const [v, fs_] of Object.entries(files)) {
  const vals = [];
  for (const p of fs_.slice(0, 3)) vals.push(...f0(p, fs_.length < 3 ? 40 : 20));
  if (vals.length < 10) continue;
  vals.sort((a, b) => a - b);
  res[v] = { med: vals[vals.length >> 1], n: vals.length, clips: fs_.length };
}
console.log(`${'성우'.padEnd(7)}${'F0'.padStart(8)}  ${'표본'.padStart(4)}  ${'녹음'.padStart(4)}  바꿀 때 드는 값`);
const ks = Object.keys(res).sort((a, b) => res[a].med - res[b].med);
for (const v of ks) {
  const r = res[v];
  console.log(`${v.padEnd(8)}${r.med.toFixed(1).padStart(7)}Hz ${String(r.n).padStart(5)} ${String(r.clips).padStart(6)}클립  ${r.clips <= 2 ? '싸다' : r.clips <= 8 ? '보통' : '비싸다'}`);
}
console.log('\n이어 들을 때 헷갈리는 쌍 (15Hz 미만)');
let near = 0;
for (let i = 1; i < ks.length; i++) {
  const a = ks[i - 1], b = ks[i], d = res[b].med - res[a].med;
  if (d >= 15) continue;
  near++;
  const cheap = res[a].clips <= res[b].clips ? a : b;
  console.log(`   ★ ${a} ${res[a].med.toFixed(0)} ↔ ${b} ${res[b].med.toFixed(0)}  차이 ${d.toFixed(1)}Hz   → 갈아 끼우면 싼 쪽: ${cheap}(${res[cheap].clips}클립)`);
}
/* ★[GAP_KNOWN] 알고 있는 건수를 박아 둔다. 늘면 빨개지고, 성우를 갈아 끼워 줄면 이 수를 내려 적는다.
   ★0 으로 내리려고 성우를 바꾸는 것은 사장님 결정이다. 검사가 강요하지 않는다. */
const GAP_KNOWN = 6;
if (near > GAP_KNOWN) { console.log(`\n✗ 붙은 쌍이 ${GAP_KNOWN} → ${near} 로 늘었습니다.`); process.exit(1); }
console.log(`\n· 붙은 쌍 ${near}건 — 알려진 것(${GAP_KNOWN}) 이하입니다.`);
