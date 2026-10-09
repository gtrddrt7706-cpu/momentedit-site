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
//   ③ 멈추지 않는가(ffmpeg 이 있으면) [VID_SMOOTH] — 앞이나 뒤 프레임은 움직이는데(바뀐 칸 ≥ 1%) 혼자 멈춘(< 0.15%) 프레임 ≤ 8%
//      (320×180 평균 회색 · 바뀐 칸 = 앞 프레임 대비 밝기 차 > 3) — 같은 그림 되풀이를 잡는다. 받은 판 15편 18.7~72.6%(서로 바라보기 4.7% · 테이블 인사 6.0%) · 새 판 0.0~5.3%.
//   ④ 유령 그림이 없는가 [VID_CUT] — 앞뒤 1~4프레임 사이가 크게 바뀌는데(평균 밝기 차 > 8) 가운데 프레임이 «두 끝을 섞은 그림»과 거의 같은 곳(남는 차 비 < 0.65) 0곳
//      컷 앞뒤를 사이 그림으로 채우면 생긴다(채우기만 한 판 덕담 · 반지 · 편지 · 닫는 인사 0.41~0.53 · 보통 움직임은 0.78~0.85 · 섞음 α 는 0.15~0.85 만 본다).
//   ⑤ 걸음이 고른가 [VID_RETIME] — 8×8 칸 찾기(±8)로 잰 프레임마다 속도가 앞뒤 3프레임 중앙값 L 에서 벗어난 정도(|속도−L|/L)의 평균 ≤ 0.75
//      컷 앞뒤 3프레임 · 거의 안 움직이는 곳(L < 0.05 · 잡음이 비를 키운다)은 빼고 · 가장 큰 5% 는 버린다(손이 한 번 빨라지는 것 같은 진짜 가속).
//      받은 판 0.43~1.30(7편이 0.75 넘음) · 새 판 0.14~0.65(케이크 0.65 · 손 결이 촘촘해 보간이 겹침에 가깝다) — ★거친 자다: 받은 판도 10편이 0.75 아래라 혼자로는 못 가른다 · ③ ④ 와 함께 본다.
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(ffmpeg 없음 · ① 은 통과)
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DIR = process.env.VS_DIR || path.join(ROOT, 'assets/video/moments');   // VS_DIR=사본 폴더 — 깨 보기용
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
/* ③ [VID_SMOOTH] 끊김 — 앞이나 뒤 프레임이 바뀐 칸 1% 넘게 움직이는데 혼자 0.15% 도 안 바뀐 프레임(움직이는 중의 멈춤) · 움직이는 프레임 중 비율 */
const MAX_STUTTER = 0.08;
function stutter(file) {
  const sm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const n = Math.floor(sm.length / N), c = [0];
  for (let i = 1; i < n; i++) { let k = 0; const o = i * N, p = o - N; for (let j = 0; j < N; j++) if (Math.abs(sm[o + j] - sm[p + j]) > 3) k++; c.push(k / N); }
  let mv = 0, st = 0;
  for (let i = 1; i < n - 1; i++) { if (Math.max(c[i - 1], c[i + 1]) < 0.01) continue; mv++; if (c[i] < 0.0015) st++; }
  return { mv, st };
}
/* ④ [VID_CUT] 유령 그림 — 앞뒤 k(1~4)프레임 사이 평균 밝기 차 > 8 인데, 가운데가 A + α(B−A)(최소제곱 α · 0.15~0.85)와 거의 같은 프레임
   남는 차 / min(가운데−A, 가운데−B) < 0.65 면 섞인 그림(움직임이면 테두리가 옮겨 가 남는 차가 크다) */
const GHOST_D = 8, GHOST_R = 0.65;
function ghosts(file) {
  const sm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const n = Math.floor(sm.length / N), out = [];
  const mad = (a, b) => { let s = 0; const oa = a * N, ob = b * N; for (let j = 0; j < N; j++) s += Math.abs(sm[oa + j] - sm[ob + j]); return s / N; };
  for (let i = 1; i < n - 1; i++) for (let k = 1; k <= 4; k++) {
    const a = i - k, b = i + k; if (a < 0 || b >= n) break;
    if (mad(a, b) <= GHOST_D) continue;
    let num = 0, den = 0; for (let j = 0; j < N; j++) { const A = sm[a * N + j], d = sm[b * N + j] - A; num += (sm[i * N + j] - A) * d; den += d * d; }
    const al = den ? num / den : 0; if (al < 0.15 || al > 0.85) continue;
    let r = 0; for (let j = 0; j < N; j++) { const A = sm[a * N + j]; r += Math.abs(sm[i * N + j] - (A + al * (sm[b * N + j] - A))); }
    if (r / N / Math.min(mad(i, a), mad(i, b)) < GHOST_R) { out.push(i); break; }
  }
  return out;
}
/* ⑤ [VID_RETIME] 걸음 고르기 — 320×180(넓게 평균) · 8×8 칸마다 ±8 칸 찾기(SAD · 포물선 소수점) · 질감 있는 칸의 이동량 평균 = 그 프레임의 속도
   앞뒤 3프레임 중앙값 L ≥ 0.05 · 컷(바뀐 칸 > 35% · 평균 밝기 차 > 8) 앞뒤 3프레임 제외 · |속도 − L| / L 중 가장 큰 5% 를 버린 평균 */
const EVEN_MAX = 0.75, EVEN_FLOOR = 0.05, EVEN_TRIM = 0.05;
function evenness(file) {
  const sa = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', `scale=${W}:${H}:flags=area,format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const sm = execFileSync('ffmpeg', ['-loglevel', 'error', '-i', file, '-vf', `scale=${W}:${H},format=gray`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
  const n = Math.floor(sa.length / N), B = 8, R = 8, sp = [0], cut = [0];
  for (let i = 1; i < n; i++) {
    let ch = 0, md = 0; const o = i * N, p = o - N; for (let j = 0; j < N; j++) { const d = Math.abs(sm[o + j] - sm[p + j]); md += d; if (d > 3) ch++; }
    cut.push(ch / N > 0.35 && md / N > 8 ? 1 : 0);
    const A = (i - 1) * N, C = i * N; let tot = 0, nb = 0;
    for (let by = R; by + B + R <= H; by += B) for (let bx = R; bx + B + R <= W; bx += B) {
      let s1 = 0, s2 = 0; for (let y = 0; y < B; y++) for (let x = 0; x < B; x++) { const v = sa[A + (by + y) * W + bx + x]; s1 += v; s2 += v * v; }
      if (s2 / 64 - (s1 / 64) ** 2 <= 20) continue; nb++;
      const sad = (dx, dy) => { let s = 0; for (let y = 0; y < B; y++) { const ra = A + (by + y) * W + bx, rc = C + (by + y + dy) * W + bx + dx; for (let x = 0; x < B; x++) s += Math.abs(sa[ra + x] - sa[rc + x]); } return s; };
      const s0 = sad(0, 0); if (s0 < 64 * 1.5) continue;
      let best = s0, bdx = 0, bdy = 0;
      for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const s = sad(dx, dy); if (s < best) { best = s; bdx = dx; bdy = dy; } }
      let fx = bdx, fy = bdy;
      if (Math.abs(bdx) < R) { const l = sad(bdx - 1, bdy), r = sad(bdx + 1, bdy), d = l - 2 * best + r; if (d > 0) fx += (l - r) / (2 * d); }
      if (Math.abs(bdy) < R) { const u = sad(bdx, bdy - 1), w = sad(bdx, bdy + 1), d = u - 2 * best + w; if (d > 0) fy += (u - w) / (2 * d); }
      tot += Math.hypot(fx, fy);
    }
    sp.push(nb ? tot / nb : 0);
  }
  const ds = [];
  for (let i = 4; i < n - 3; i++) {
    let near = false; for (let t = i - 3; t <= i + 3; t++) if (cut[t]) near = true; if (near) continue;
    const w = sp.slice(i - 3, i + 4).sort((a, b) => a - b), L = w[3]; if (L < EVEN_FLOOR) continue;
    ds.push(Math.abs(sp[i] - L) / L);
  }
  if (!ds.length) return 0;
  ds.sort((a, b) => a - b); const kept = ds.slice(0, Math.ceil(ds.length * (1 - EVEN_TRIM)));
  return kept.reduce((a, b) => a + b, 0) / kept.length;
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
  console.log('못 쟀다 — ffmpeg 없음: ② 첫 장면에서 바로 움직이는가 · ③~⑤ 끊김 · 유령 그림 · 걸음은 야간(nightly-screen) · 로컬에서 잰다');
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
const choppy = [], hs = [];
for (const n of names) {
  const f = path.join(DIR, n + '.mp4'); if (!fs.existsSync(f)) continue;
  const t = stutter(f), r = t.st / Math.max(1, t.mv); hs.push(`${n} ${(r * 100).toFixed(1)}%`);
  if (!(r <= MAX_STUTTER)) choppy.push(`${n}:${(r * 100).toFixed(1)}%(${t.st}/${t.mv})`);
}
console.log('     움직이는 중 멈춘 프레임 ' + hs.join(' · '));
ok(`③ 멈추지 않는다 — 움직이는 중 혼자 멈춘 프레임 ≤ ${MAX_STUTTER * 100}% [VID_SMOOTH]`, choppy.length === 0, choppy.join(' | '));
const gh = [], ghs = [];
for (const n of names) {
  const f = path.join(DIR, n + '.mp4'); if (!fs.existsSync(f)) continue;
  const g = ghosts(f); ghs.push(`${n} ${g.length}`); if (g.length) gh.push(`${n}:${g.join(',')}`);
}
console.log('     유령 그림 ' + ghs.join(' · '));
ok(`④ 컷에 유령 그림이 없다 — 두 장면을 섞은 프레임 0곳 [VID_CUT]`, gh.length === 0, gh.join(' | '));
const uneven = [], evs = [];
for (const n of names) {
  const f = path.join(DIR, n + '.mp4'); if (!fs.existsSync(f)) continue;
  const v = evenness(f); evs.push(`${n} ${v.toFixed(2)}`); if (!(v <= EVEN_MAX)) uneven.push(`${n}:${v.toFixed(2)}`);
}
console.log('     걸음 고르기 ' + evs.join(' · '));
ok(`⑤ 걸음이 고르다 — 프레임 속도가 앞뒤 중앙값에서 벗어난 정도 평균(컷 · 멈춤 · 가장 큰 5% 빼고) ≤ ${EVEN_MAX} [VID_RETIME]`, uneven.length === 0, uneven.join(' | '));
console.log(fail ? `\n★ 실패 ${fail}건` : `\nVIDEO START OK — ${names.length}편`);
process.exit(fail ? 1 : 0);
