// [VID_SMOOTH 2026-10-09 사장님 «각각 넘기면서 나오는 영상 · 그 외 영상 전부 점검했지? 프레임이 뚝뚝 끊어 보이는 현상»]
// 받은 영상의 그림을 «움직임이 고르게» 다시 놓고, 그 사이를 움직임을 따라 새로 그려 30fps 를 채운다 — 프레임 수 · 길이 그대로.
//   node scripts/video/smooth-dups.mjs 받은.mp4 시작초 나갈.mkv      (encode-moment.sh 가 부른다 · 한 편 1~2분)
//
// 왜 (받은 v8 묶음 17편 실측 · 숫자는 docs/plans/식순연구/순간영상_장면대본_0927.md 의 [VID_SMOOTH])
//   ① 같은 그림 되풀이 — 움직이는 구간에서 앞 프레임과 같은 그림이 많았다(하객 맞이는 새 그림이 초당 9.6장뿐) → 걸음 · 손이 «툭 · 툭».
//   ② [VID_RETIME] 걸음이 고르지 않았다 — 그림이 고르지 않은 시각에 놓였거나(촛불 «1 · 1 · 3프레임» 되풀이) 5프레임마다 큰 걸음 하나가 왔다(서로 바라보기 · 첫인사).
//      같은 그림 자리만 채우면 «느림 · 느림 · 빠름»이 남는다 — 그래서 각 그림의 시각을 «실제로 움직인 양»에 맞춰 고르게 다시 놓는다.
//   ③ [VID_CUT] 컷(장면이 바뀌는 자리) 앞뒤를 사이 그림으로 채우면 두 장면이 겹친 유령 그림이 생긴다(덕담 1장 · 닫는 인사 2장) — 컷에서 끊는다.
// 어떻게
//   ① 새 그림 — 320×180 으로 «평균 낸» 회색 그림에서, 마지막 새 그림 대비 밝기 차 > 3 인 칸이 0.4% 넘으면 새 그림. 같은 그림은 넣지 않는다.
//      ★한 점씩 뽑아 보면 미세한 결 흔들림이 0.3~1.1% 로 잡혀 거의 같은 그림까지 새 그림으로 센다(하객 맞이 실측) — 평균 낸 그림으로 본다.
//   ② 컷 — 앞 프레임 대비 바뀐 칸 > 35% 이고 평균 밝기 차 > 8 (17편의 컷 11.8~45.3 · 컷이 아닌 가장 큰 걸음 5.7).
//   ③ 줄 — 컷과 7프레임(0.23초) 넘는 멈춤에서 끊는다. 긴 멈춤 · 끝 정지는 원래 프레임 그대로. 줄의 처음 · 끝 그림은 제자리(첫 장면 = 표지 그대로).
//      첫 8프레임(0.27초) 안의 그림은 늦추지 않는다 — 열자마자 움직이게([VID_MOVE_NOW] · 움직임 시작 ≤ 0.2초).
//   ④ 걸음 — 8×8 칸마다 ±12칸을 찾아 프레임마다 움직인 양을 잰다(질감 있는 칸의 평균). 느린 곳이 잡음에 끌려가지 않게 줄 평균 걸음의 1/4 을 늘 더한다.
//      걸음을 앞뒤 5칸 · 6칸에 나눠 뿌려(합은 그대로 · 5 · 6프레임 주기가 지워진다) 고른 누적을 만들고, 각 그림은 고른 누적이 그 그림의 누적에 닿는 시각에 놓는다.
//   ⑤ ffmpeg minterpolate(mci · aobmc · bidir)로 30fps. 그림 시각과 겹치는 프레임은 그 그림 그대로 나간다.
//      두 그림을 섞는 방법(blend)은 큰 움직임에 두 겹 잔상이 생겨 버렸다 · «새 그림 장수»로만 고르게 놓는 방법은 ② 의 5프레임 큰 걸음을 못 지웠다(같은 편 비교).
import { execFileSync, spawn } from 'node:child_process';
const [IN, START, OUT] = process.argv.slice(2);
if (!IN || !OUT) { console.error('쓰는 법: node scripts/video/smooth-dups.mjs 받은.mp4 시작초 나갈.mkv'); process.exit(2); }
const W = 1280, H = 720, FS = W * H * 3 / 2;
const DUP = 0.004, MAXGAP = 7, CUT_CH = 0.35, CUT_MAD = 8, EPS = 0.25, SPREAD = [5, 6], START_KEEP = 8;   // ★DUP · MAXGAP 은 새 그림 · 긴 멈춤의 셈 · START_KEEP = 첫 8프레임(0.27초)
const VF = `scale=${W}:${H}:force_original_aspect_ratio=decrease,pad=${W}:${H}:(ow-iw)/2:(oh-ih)/2,format=yuv420p`;
const dec = (vf) => execFileSync('ffmpeg', ['-nostdin', '-loglevel', 'error', '-ss', String(START || 0), '-i', IN, '-an', '-vf', vf, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 30 });
const raw = dec(VF), n = Math.floor(raw.length / FS);
const SW = 320, SH = 180, SN = SW * SH;
const sm = dec(`${VF},scale=${SW}:${SH},format=gray`);              // 새 그림 · 컷 판별
const sa = dec(`${VF},scale=${SW}:${SH}:flags=area,format=gray`);   // 걸음 재기(넓게 평균 낸 판 · 결이 덜 떨린다)
const changed = (a, b) => { let c = 0; const oa = a * SN, ob = b * SN; for (let j = 0; j < SN; j++) if (Math.abs(sm[oa + j] - sm[ob + j]) > 3) c++; return c / SN; };
const mad = (a, b) => { let s = 0; const oa = a * SN, ob = b * SN; for (let j = 0; j < SN; j++) s += Math.abs(sm[oa + j] - sm[ob + j]); return s / SN; };
const BS = 8, R = 12;
function step(i) {   // 프레임 i-1 → i 에서 질감 있는 칸이 움직인 양의 평균(320 기준 칸 · 소수점은 포물선으로)
  const A = (i - 1) * SN, C = i * SN; let tot = 0, nb = 0;
  for (let by = R; by + BS + R <= SH; by += BS) for (let bx = R; bx + BS + R <= SW; bx += BS) {
    let s1 = 0, s2 = 0; for (let y = 0; y < BS; y++) for (let x = 0; x < BS; x++) { const v = sa[A + (by + y) * SW + bx + x]; s1 += v; s2 += v * v; }
    if (s2 / 64 - (s1 / 64) ** 2 <= 20) continue; nb++;
    const sad = (dx, dy) => { let s = 0; for (let y = 0; y < BS; y++) { const ra = A + (by + y) * SW + bx, rc = C + (by + y + dy) * SW + bx + dx; for (let x = 0; x < BS; x++) s += Math.abs(sa[ra + x] - sa[rc + x]); } return s; };
    const s0 = sad(0, 0); if (s0 < 64 * 1.5) continue;
    let best = s0, bdx = 0, bdy = 0;
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) { const s = sad(dx, dy); if (s < best) { best = s; bdx = dx; bdy = dy; } }
    let fx = bdx, fy = bdy;
    if (Math.abs(bdx) < R) { const l = sad(bdx - 1, bdy), r = sad(bdx + 1, bdy), d = l - 2 * best + r; if (d > 0) fx += (l - r) / (2 * d); }
    if (Math.abs(bdy) < R) { const u = sad(bdx, bdy - 1), w = sad(bdx, bdy + 1), d = u - 2 * best + w; if (d > 0) fy += (u - w) / (2 * d); }
    tot += Math.hypot(fx, fy);
  }
  return nb ? tot / nb : 0;
}
// ①② 새 그림 · 컷
const pic = new Uint8Array(n), cut = new Uint8Array(n); pic[0] = 1; let last = 0;
for (let i = 1; i < n; i++) {
  if (changed(i, i - 1) > CUT_CH && mad(i, i - 1) > CUT_MAD) { cut[i] = 1; pic[i] = 1; last = i; continue; }   // [VID_CUT]
  if (changed(i, last) >= DUP) { pic[i] = 1; last = i; }
}
const keep = []; for (let i = 0; i < n; i++) if (pic[i]) keep.push(i);
// 한 걸음을 앞뒤 L칸에 나눠 뿌린다 — 줄 끝에서는 남은 칸에만(합이 그대로라 누적이 줄 끝에서 맞는다)
const spread = (v, L) => { const o = new Array(v.length).fill(0), lo = Math.floor((L - 1) / 2), hi = L - 1 - lo; for (let j = 0; j < v.length; j++) { const t0 = Math.max(0, j - lo), t1 = Math.min(v.length - 1, j + hi), w = v[j] / (t1 - t0 + 1); for (let t = t0; t <= t1; t++) o[t] += w; } return o; };
const sel = [], at = [];   // 넣을 원래 프레임 번호 · 그 프레임을 놓을 시각(프레임 단위 · 100분의 1까지)
const put = (i, q) => { q = Math.round(q * 100) / 100; if (at.length && q <= at[at.length - 1] + 0.05) return; sel.push(i); at.push(q); };
let moved = 0, cuts = 0, runs = 0;
for (let k = 0; k < keep.length;) {
  let e = k; while (e + 1 < keep.length && keep[e + 1] - keep[e] <= MAXGAP && !cut[keep[e + 1]]) e++;   // ③ 줄
  const a = keep[k], b = keep[e], pics = keep.slice(k, e + 1);
  let T = pics.slice();
  if (pics.length > 2) {   // ④ [VID_RETIME] 움직임이 고르게 다시 놓기
    const s = []; for (let i = a + 1; i <= b; i++) s.push(pic[i] ? step(i) : 0);
    const tot = s.reduce((x, y) => x + y, 0);
    if (tot > 0.05) {
      const eps = EPS * tot / s.length; for (let j = 0; j < s.length; j++) s[j] += eps;
      const c = [0]; for (const v of s) c.push(c[c.length - 1] + v);
      let g = s; for (const L of SPREAD) g = spread(g, L);
      const cp = [0]; for (const v of g) cp.push(cp[cp.length - 1] + v);
      T = pics.map((i) => {
        if (i === a || i === b) return i;
        const ci = c[i - a]; let j = 1; while (j < cp.length - 1 && cp[j] < ci) j++;
        const t = a + j - 1 + (cp[j] > cp[j - 1] ? (ci - cp[j - 1]) / (cp[j] - cp[j - 1]) : 0);
        return a === 0 && i <= START_KEEP ? Math.min(t, i) : t;   // [VID_MOVE_NOW] 첫 움직임은 늦추지 않는다 — 고르게 놓다 앞 그림이 밀려 성혼 선언 시작이 0.20 → 0.23초가 됐다
      });
      runs++;
    }
  }
  pics.forEach((i, j) => { put(i, T[j]); moved = Math.max(moved, Math.abs(T[j] - i)); });
  if (cut[a]) cuts++;
  const end = e + 1 < keep.length ? keep[e + 1] : n;   // 긴 멈춤 · 끝 정지 = 원래 프레임 그대로
  for (let i = b + 1; i < end; i++) put(i, i);
  k = e + 1;
}
for (let i = 1; i < at.length; i++) if (!(at[i] > at[i - 1])) { console.error(`[VID_RETIME] 시각 순서가 꼬였다 — ${sel[i - 1]}→${at[i - 1]} · ${sel[i]}→${at[i]}`); process.exit(1); }
const sx = sel.map((i) => `eq(n\\,${i})`).join('+');                         // 넣을 프레임만(원래 순서)
const px = at.map((q, i) => `eq(N\\,${i})*${Math.round(q * 100)}`).join('+');   // 시각 = 1/3000초 단위
const enc = spawn('ffmpeg', ['-nostdin', '-loglevel', 'error', '-y', '-f', 'rawvideo', '-pix_fmt', 'yuv420p', '-s', `${W}x${H}`, '-r', '30', '-i', '-',
  '-vf', `select='${sx}',settb=1/3000,setpts='${px}',minterpolate=fps=30:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1`, '-c:v', 'ffv1', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
enc.stdin.end(raw.subarray(0, n * FS));
enc.on('close', (code) => {
  console.log(`[VID_SMOOTH] 프레임 ${n} · 새 그림 ${keep.length} · 넣은 프레임 ${sel.length} · 컷 ${cuts} [VID_CUT] · 다시 놓은 줄 ${runs} · 옮긴 폭 최대 ${moved.toFixed(2)}프레임 [VID_RETIME]`);
  process.exit(code || 0);
});
