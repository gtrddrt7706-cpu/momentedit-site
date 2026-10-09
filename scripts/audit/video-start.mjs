// [VID_MOVE_NOW 2026-10-09 사장님 «영상들이 시작을 바로 안 하고 처음에 멈춰 있는 시간이 너무 긴 거 같아 · 직접 보고 확인해서 열자마자 움직일 수 있게»]
// 장면 영상(assets/video/moments/*.mp4)이 «열자마자 움직이는가»를 잰다.
//
//   node scripts/audit/video-start.mjs                 # 검사(VIDEO_READY 의 모든 편)
//   node scripts/audit/video-start.mjs --start X.mp4   # 앞을 자를 초 한 줄(encode-moment.sh 가 쓴다 · 한 원천) — 실제로 움직이기 시작하는 프레임의 2프레임 앞
//   node scripts/audit/video-start.mjs --onset X.mp4   # 첫 장면에서 그림이 눈에 띄게 바뀌는 초 한 줄(아래 ② 와 같은 셈)
//
// 보는 것
//   ① 가벼운가(ffmpeg 없이 · PR 잡에서도 돈다) — moov 가 mdat 앞(faststart) · 소리 트랙 없음 · 평균 ≤ 2.0Mbps · 파일 ≤ 2.5MB
//      받은 v8 묶음은 편마다 1.59~4.20Mbps(1.99~5.25MB)였다 — 폰은 첫 1초 분량(272~668KB)을 받아야 움직이기 시작한다.
//   ② 첫 장면에서 바로 움직이는가(ffmpeg 이 있으면) — 첫 장면 대비 밝기 차 > 10 인 칸이 0.3% 를 넘는 첫 프레임 ≤ 0.2초
//      받은 판은 실제로 움직이기까지 0.17~3.17초 동안 그림이 그대로였다 — 0.2초 사이 바뀐 칸 0.00%(식전 영상 3.17 · 서로 바라보기 2.13 · 서약 1.50 · 준비한 순서 1.30초).
//      ★«첫 장면 대비»만 보면 느린 밝기 변화(0.2초 사이 0.00%)를 움직임으로 잘못 센다 — 앞을 자를 자리는 «4프레임 안에 바뀌기 시작하는 첫 프레임»으로 잡는다(startPoint).
//
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(ffmpeg 없음 · ① 은 통과)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DIR = path.join(ROOT, 'assets/video/moments');
const MAX_BPS = 2.0e6, MAX_BYTES = 2.5e6, MAX_ONSET = 0.2;
const W = 320, H = 180, N = W * H, FPS = 30;

/* 움직임이 처음 생기는 초 — 첫 장면 대비 밝기 차 > 10 인 칸이 0.3% 를 넘는 첫 프레임(320×180 회색 · 30fps 로 맞춰 본다) */
function onset(file, sec) {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-t', String(sec || 4), '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const n = Math.floor(raw.length / N);
  for (let i = 1; i < n; i++) {
    let c = 0; const o = i * N;
    for (let j = 0; j < N; j++) if (Math.abs(raw[o + j] - raw[j]) > 10) c++;
    if (c / N > 0.003) return i / FPS;
  }
  return -1;   // 그 안에서는 움직이지 않았다
}
/* 앞을 자를 자리 — 그 프레임에서 4프레임(0.133초) 안에 눈에 띄게 바뀌는(위 onset 과 같은 기준) 가장 이른 프레임의 2프레임 앞 · 0 아래로 안 간다 · 안 움직이면 0 */
function startPoint(file) {
  const raw = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', `fps=${FPS},scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 29 });
  const n = Math.floor(raw.length / N);
  const moved = (a, b) => { let c = 0; const oa = a * N, ob = b * N; for (let j = 0; j < N; j++) if (Math.abs(raw[oa + j] - raw[ob + j]) > 10) c++; return c / N > 0.003; };
  for (let i = 0; i + 4 < n; i++) for (let d = 1; d <= 4; d++) if (moved(i + d, i)) return Math.max(0, i - 2) / FPS;
  return 0;
}
const hasFfmpeg = (() => { try { execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' }); return true; } catch { return false; } })();

if (process.argv[2] === '--start') {
  if (!hasFfmpeg) { console.error('ffmpeg 없음'); process.exit(2); }
  console.log(startPoint(process.argv[3]).toFixed(3)); process.exit(0);
}
if (process.argv[2] === '--onset') {
  if (!hasFfmpeg) { console.error('ffmpeg 없음'); process.exit(2); }
  const t = onset(process.argv[3], 12); console.log(t.toFixed(3)); process.exit(0);
}

/* mp4 상자 읽기 — 맨 위 상자 차례 · moov 안 mvhd(길이) · trak 의 hdlr(vide · soun) */
function boxes(b, s, e) { const out = []; let o = s; while (o + 8 <= e) { let sz = b.readUInt32BE(o); const ty = b.toString('latin1', o + 4, o + 8); let h = 8; if (sz === 1) { sz = Number(b.readBigUInt64BE(o + 8)); h = 16; } else if (sz === 0) sz = e - o; if (sz < h) break; out.push({ ty, s: o, h, e: o + sz }); o += sz; } return out; }
function info(file) {
  const b = fs.readFileSync(file), top = boxes(b, 0, b.length);
  const moov = top.find((x) => x.ty === 'moov'), mdat = top.find((x) => x.ty === 'mdat');
  let dur = 0, kinds = [];
  if (moov) {
    const inner = boxes(b, moov.s + moov.h, moov.e);
    const mv = inner.find((x) => x.ty === 'mvhd');
    if (mv) { const p = mv.s + mv.h, v = b[p]; const ts = v === 1 ? b.readUInt32BE(p + 20) : b.readUInt32BE(p + 12); const d = v === 1 ? Number(b.readBigUInt64BE(p + 24)) : b.readUInt32BE(p + 16); dur = d / ts; }
    inner.filter((x) => x.ty === 'trak').forEach((t) => { const md = boxes(b, t.s + t.h, t.e).find((x) => x.ty === 'mdia'); if (!md) return; const hd = boxes(b, md.s + md.h, md.e).find((x) => x.ty === 'hdlr'); if (hd) kinds.push(b.toString('latin1', hd.s + hd.h + 8, hd.s + hd.h + 12)); });
  }
  return { bytes: b.length, fast: !!(moov && mdat && moov.s < mdat.s), dur, kinds };
}

const src = fs.readFileSync(path.join(ROOT, 'assets/ritual-open.js'), 'utf8');
const m = src.match(/var VIDEO_READY = \[([^\]]*)\]/);
const names = m ? [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]) : [];
let fail = 0;
const ok = (msg, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${msg}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
ok(`VIDEO_READY 를 읽었다(${names.length}편)`, names.length > 0);

const heavy = [], rows = [];
for (const n of names) {
  const f = path.join(DIR, n + '.mp4');
  if (!fs.existsSync(f)) { heavy.push(n + ':파일 없음'); continue; }
  const i = info(f), bps = i.dur ? i.bytes * 8 / i.dur : Infinity;
  rows.push(`${n} ${(i.bytes / 1e6).toFixed(2)}MB · ${(bps / 1e6).toFixed(2)}Mbps · ${i.dur.toFixed(2)}초`);
  if (!i.fast) heavy.push(n + ':faststart 아님');
  if (i.kinds.includes('soun')) heavy.push(n + ':소리 트랙');
  if (!(bps <= MAX_BPS)) heavy.push(`${n}:${(bps / 1e6).toFixed(2)}Mbps`);
  if (!(i.bytes <= MAX_BYTES)) heavy.push(`${n}:${(i.bytes / 1e6).toFixed(2)}MB`);
}
console.log('     ' + rows.join(' | '));
ok(`① 가벼운 영상 — faststart · 소리 없음 · 평균 ≤ ${MAX_BPS / 1e6}Mbps · 파일 ≤ ${MAX_BYTES / 1e6}MB [VID_MOVE_NOW]`, heavy.length === 0, heavy.join(' | '));

if (!hasFfmpeg) {
  console.log('못 쟀다 — ffmpeg 없음: ② 첫 장면에서 바로 움직이는가는 야간(nightly-screen) · 로컬에서 잰다');
  process.exit(fail ? 1 : 2);
}
const slow = [], on = [];
for (const n of names) {
  const f = path.join(DIR, n + '.mp4'); if (!fs.existsSync(f)) continue;
  const t = onset(f, 4); on.push(`${n} ${t.toFixed(2)}`);
  if (!(t >= 0 && t <= MAX_ONSET)) slow.push(`${n}:${t < 0 ? '4초 안에 안 움직임' : t.toFixed(2) + '초'}`);
}
console.log('     움직임 시작(초) ' + on.join(' · '));
ok(`② 첫 장면에서 바로 움직인다 — 움직임 시작 ≤ ${MAX_ONSET}초(앞의 멈춘 구간 없음) [VID_MOVE_NOW]`, slow.length === 0, slow.join(' | '));
console.log(fail ? `\n★ 실패 ${fail}건` : `\nVIDEO START OK — ${names.length}편`);
process.exit(fail ? 1 : 0);
