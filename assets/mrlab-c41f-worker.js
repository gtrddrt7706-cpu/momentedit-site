/* ★★[MR_LAB_1128 2026-11-28 대표님 «추천대로» · 입장곡 가사 빼기 방] 가사 빼기 시험실 일꾼(모듈 워커) — 시험실 mrlab-c41f.html 전용 · 고객 화면은 쓰지 않는다.
   방법 셋: center(가운데 소리 지우기 · AI 없음 · 모노) · m9662(UVR_MDXNET_3_9662 · 출력 = 목소리 → 반주 = 원곡 − 1.035 × 출력) · hq3(UVR-MDX-NET-Inst_HQ_3 · 출력 = 반주 × 1.022).
   숫자는 docs 저장소 operations/plans/입장곡_가사빼기_결정_1128.md 의 시험실 절 · 파이썬 정답판 SPEC(같은 날 · 섹션 방 기준 실측)을 그대로 따른다:
     44.1 kHz 스테레오 · n_fft 6144 · hop 1024 · periodic hann · center(반사 덧대기 3072) · 아래부터 dim_f 칸 · [1, 4(좌실 · 좌허 · 우실 · 우허), dim_f, 256]
     역변환 = 겹쳐 더하기 ÷ Σw² · 청크 261120 샘플 · 겹침 0.25(걸음 195840) · 앞 0 덧대기 3072 · 청크 이음 가중 = 대칭 hann(길이 261120).
   다른 웨딩 도구의 코드는 보지도 옮기지도 않았다 — 공개 모델(MIT · Politrees/UVR_resources)과 공개 설정값(UVR model_data.json)만 쓴다. FFT 는 여기서 새로 짰다. */
import * as ort from 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/ort.webgpu.min.mjs';

const ORT_DIST = 'https://cdn.jsdelivr.net/npm/onnxruntime-web@1.22.0/dist/';
const HF = 'https://huggingface.co/Politrees/UVR_resources/resolve/929e057b81aa49bc2e6490bef8671f47b2c120f6/models/MDXNet/';
const MODELS = {
  m9662: { url: HF + 'UVR_MDXNET_3_9662.onnx', bytes: 29704436, sha: 'e02220e80d8253f4c2209f8924298b2b686bbdf2868b788ff5500fb9bd94aadc', dimF: 2048, out: 'vocal', k: 1.035 },
  hq3: { url: HF + 'UVR-MDX-NET-Inst_HQ_3.onnx', bytes: 66759214, sha: '317554b07fe1ea5279a77f2b1520a41ea4b93432560c4ffd08792c30fddf9adc', dimF: 3072, out: 'inst', k: 1.022 }
};
const CACHE = 'me-mr-lab-v1';
const N = 6144, HOP = 1024, HALF = 3072, T = 256, CH = HOP * 255, STEP = 195840, PADF = 3072;

/* ── FFT 6144 = 3 × 2048(기수 2) — 한 번 만든 표를 계속 쓴다 ── */
const M = 2048, LOG = 11;
const REV = new Uint16Array(M); for (let i = 0; i < M; i++) { let r = 0, x = i; for (let b = 0; b < LOG; b++) { r = (r << 1) | (x & 1); x >>= 1; } REV[i] = r; }
const C2 = new Float64Array(M / 2), S2 = new Float64Array(M / 2); for (let i = 0; i < M / 2; i++) { C2[i] = Math.cos(-2 * Math.PI * i / M); S2[i] = Math.sin(-2 * Math.PI * i / M); }
const C6 = new Float64Array(N), S6 = new Float64Array(N); for (let i = 0; i < N; i++) { C6[i] = Math.cos(-2 * Math.PI * i / N); S6[i] = Math.sin(-2 * Math.PI * i / N); }
function fft2048(re, im) {   // 제자리 · 앞으로(지수 −)
  for (let i = 0; i < M; i++) { const j = REV[i]; if (j > i) { let t = re[i]; re[i] = re[j]; re[j] = t; t = im[i]; im[i] = im[j]; im[j] = t; } }
  for (let size = 2; size <= M; size <<= 1) { const h = size >> 1, st = M / size;
    for (let s = 0; s < M; s += size) for (let k = 0; k < h; k++) { const wr = C2[k * st], wi = S2[k * st], a = s + k, b = a + h;
      const xr = re[b] * wr - im[b] * wi, xi = re[b] * wi + im[b] * wr; re[b] = re[a] - xr; im[b] = im[a] - xi; re[a] += xr; im[a] += xi; } } }
const AR = [new Float64Array(M), new Float64Array(M), new Float64Array(M)], AI = [new Float64Array(M), new Float64Array(M), new Float64Array(M)];
function fft6144(xr, xi, outR, outI) {   // xr · xi 길이 6144 → outR · outI 길이 6144
  for (let r = 0; r < 3; r++) { const ar = AR[r], ai = AI[r]; for (let m = 0; m < M; m++) { ar[m] = xr[3 * m + r]; ai[m] = xi[3 * m + r]; } fft2048(ar, ai); }
  for (let k = 0; k < N; k++) { const q = k & (M - 1); let sr = AR[0][q], si = AI[0][q];
    const k1 = k % N, k2 = (2 * k) % N; let wr = C6[k1], wi = S6[k1]; sr += AR[1][q] * wr - AI[1][q] * wi; si += AR[1][q] * wi + AI[1][q] * wr;
    wr = C6[k2]; wi = S6[k2]; sr += AR[2][q] * wr - AI[2][q] * wi; si += AR[2][q] * wi + AI[2][q] * wr; outR[k] = sr; outI[k] = si; } }
const WIN = new Float64Array(N); for (let n = 0; n < N; n++) WIN[n] = 0.5 - 0.5 * Math.cos(2 * Math.PI * n / N);   // periodic hann
const VW = new Float32Array(CH); for (let i = 0; i < CH; i++) VW[i] = 0.5 - 0.5 * Math.cos(2 * Math.PI * i / (CH - 1));   // 대칭 hann(청크 이음)
const fr = new Float64Array(N), fi = new Float64Array(N), Fr = new Float64Array(N), Fi = new Float64Array(N);

/* 청크 하나(좌 · 우 각 CH 샘플) → 모델 입력 [4, dimF, 256] */
function stftChunk(L, R, dimF) {
  const out = new Float32Array(4 * dimF * T), P = CH + 2 * HALF, pad = new Float64Array(P);
  [L, R].forEach((x, c) => {
    for (let i = 0; i < CH; i++) pad[HALF + i] = x[i];
    for (let i = 1; i <= HALF; i++) { pad[HALF - i] = x[i]; pad[HALF + CH - 1 + i] = x[CH - 1 - i]; }   // 반사(가장자리 되풀이 없음)
    for (let t = 0; t < T; t++) { const o = t * HOP; for (let n = 0; n < N; n++) { fr[n] = pad[o + n] * WIN[n]; fi[n] = 0; } fft6144(fr, fi, Fr, Fi);
      const bR = (2 * c) * dimF * T, bI = (2 * c + 1) * dimF * T; for (let f = 0; f < dimF; f++) { out[bR + f * T + t] = Fr[f]; out[bI + f * T + t] = Fi[f]; } } });
  return out; }
/* 모델 출력 [4, dimF, 256] → 좌 · 우 각 CH 샘플 */
function istftChunk(Y, dimF) {
  const P = CH + 2 * HALF, res = [];
  for (let c = 0; c < 2; c++) { const acc = new Float64Array(P), wsum = new Float64Array(P), bR = (2 * c) * dimF * T, bI = (2 * c + 1) * dimF * T;
    for (let t = 0; t < T; t++) {
      for (let k = 0; k < N; k++) { fr[k] = 0; fi[k] = 0; }
      for (let f = 0; f < dimF; f++) { const re = Y[bR + f * T + t], im = Y[bI + f * T + t]; fr[f] = re; fi[f] = -im; if (f > 0 && f < HALF) { fr[N - f] = re; fi[N - f] = im; } }   // 켤레 대칭 스펙트럼의 켤레(역변환 = 켤레 · 앞으로 · 켤레)
      fft6144(fr, fi, Fr, Fi); const o = t * HOP;
      for (let n = 0; n < N; n++) { const w = WIN[n]; acc[o + n] += (Fr[n] / N) * w; wsum[o + n] += w * w; } }
    const y = new Float32Array(CH); for (let i = 0; i < CH; i++) { const j = HALF + i, d = wsum[j]; y[i] = d > 1e-11 ? acc[j] / d : acc[j]; } res.push(y); }
  return res; }

/* ① 가운데 소리 지우기 — 4차 버터워스 120 Hz(44.1 kHz · 한 방향) · m = HPF(L − R) + LPF((L + R)/2) · 모노 */
const LPF = [[5.222889454946038e-09, 1.0445778909892076e-08, 5.222889454946038e-09, 1, -1.968613652455648, 0.9689014111440721], [1, 2, 1, 1, -1.9867097287265165, 0.9870001325775235]];
const HPF = [[0.9779089023287132, -1.9558178046574264, 0.9779089023287132, 1, -1.968613652455648, 0.9689014111440721], [1, -2, 1, 1, -1.9867097287265165, 0.9870001325775235]];
function sos(x, S) { let y = Float64Array.from(x); for (const [b0, b1, b2, , a1, a2] of S) { let z1 = 0, z2 = 0; for (let i = 0; i < y.length; i++) { const v = y[i], o = b0 * v + z1; z1 = b1 * v - a1 * o + z2; z2 = b2 * v - a2 * o; y[i] = o; } } return y; }
function center(L, R) { const n = L.length, d = new Float64Array(n), s = new Float64Array(n); for (let i = 0; i < n; i++) { d[i] = L[i] - R[i]; s[i] = (L[i] + R[i]) / 2; }
  const h = sos(d, HPF), l = sos(s, LPF), m = new Float32Array(n); for (let i = 0; i < n; i++) m[i] = h[i] + l[i]; return [m, m.slice()]; }

/* ── 모델 받기(진행 · Cache Storage · sha256) ── */
const hex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
async function getModel(key, say) {
  const md = MODELS[key], t0 = performance.now(); let cache = null; try { cache = await caches.open(CACHE); } catch (e) {}
  if (cache) { const hit = await cache.match(md.url); if (hit) { const ab = await hit.arrayBuffer(); if (ab.byteLength === md.bytes) return { ab, cached: true, ms: performance.now() - t0 }; await cache.delete(md.url); } }
  const r = await fetch(md.url); if (!r.ok) throw new Error('모델을 받지 못했어요 (HTTP ' + r.status + ')');
  const rd = r.body.getReader(), parts = []; let got = 0, last = 0;
  for (;;) { const { done, value } = await rd.read(); if (done) break; parts.push(value); got += value.length; const now = performance.now(); if (now - last > 250) { last = now; say({ phase: 'dl', got, total: md.bytes }); } }
  const u = new Uint8Array(got); let o = 0; for (const p of parts) { u.set(p, o); o += p.length; }
  const sha = hex(await crypto.subtle.digest('SHA-256', u)); if (sha !== md.sha) throw new Error('받은 모델이 맞지 않아요(sha256 다름)');
  if (cache) { try { await cache.put(md.url, new Response(u.buffer, { headers: { 'Content-Type': 'application/octet-stream' } })); } catch (e) {} }
  return { ab: u.buffer, cached: false, ms: performance.now() - t0 }; }

let SESS = { key: '', ep: '', s: null }, STOP = false;
async function session(key, want, say) {
  if (SESS.s && SESS.key === key && SESS.ep === want) return { prep: 0, dl: null, ep: SESS.ep };
  if (SESS.s) { try { await SESS.s.release(); } catch (e) {} SESS = { key: '', ep: '', s: null }; }
  const got = await getModel(key, say); say({ phase: 'prep' }); const t0 = performance.now();
  ort.env.wasm.wasmPaths = ORT_DIST; ort.env.wasm.numThreads = self.crossOriginIsolated ? Math.min(4, navigator.hardwareConcurrency || 1) : 1;
  let s = null, ep = want, why = '';
  if (want === 'webgpu') { try { s = await ort.InferenceSession.create(got.ab, { executionProviders: ['webgpu'], graphOptimizationLevel: 'all' }); } catch (e) { why = String(e && e.message || e).slice(0, 160); ep = 'wasm'; } }
  if (!s) s = await ort.InferenceSession.create(got.ab, { executionProviders: ['wasm'], graphOptimizationLevel: 'all' });
  SESS = { key, ep, s }; return { prep: performance.now() - t0, dl: got, ep, why }; }

async function runModel(key, L, R, want, say, dbg) {
  const md = MODELS[key], n = L.length, ss = await session(key, want, say), S = SESS.s, t0 = performance.now();
  const tot = PADF + n, nCh = 1 + Math.max(0, Math.ceil((tot - CH) / STEP)), len = (nCh - 1) * STEP + CH;
  const pL = new Float32Array(len), pR = new Float32Array(len); pL.set(L, PADF); pR.set(R, PADF);
  const oL = new Float64Array(len), oR = new Float64Array(len), ws = new Float64Array(len); let mdl = 0, dsp = 0; const D = {};
  for (let c = 0; c < nCh; c++) { if (STOP) throw new Error('STOP'); const s = c * STEP, a = performance.now();
    const X = stftChunk(pL.subarray(s, s + CH), pR.subarray(s, s + CH), md.dimF), b = performance.now();
    const out = await S.run({ input: new ort.Tensor('float32', X, [1, 4, md.dimF, T]) }), Y = out.output.data, cc = performance.now();
    if (dbg && c === 0) { D.inStats = stats(X); D.outStats = stats(Y); D.in8 = slice8(X, md.dimF); D.out8 = slice8(Y, md.dimF); }
    const [yl, yr] = istftChunk(Y, md.dimF), d = performance.now();
    for (let i = 0; i < CH; i++) { const w = VW[i]; oL[s + i] += yl[i] * w; oR[s + i] += yr[i] * w; ws[s + i] += w; }
    mdl += cc - b; dsp += (b - a) + (performance.now() - cc); say({ phase: 'run', done: c + 1, total: nCh }); }
  const rL = new Float32Array(n), rR = new Float32Array(n);
  for (let i = 0; i < n; i++) { const j = PADF + i, w = ws[j] > 0 ? ws[j] : 1; const yl = oL[j] / w, yr = oR[j] / w;
    if (md.out === 'vocal') { rL[i] = L[i] - md.k * yl; rR[i] = R[i] - md.k * yr; } else { rL[i] = md.k * yl; rR[i] = md.k * yr; } }
  return { L: rL, R: rR, m: { chunks: nCh, proc: performance.now() - t0, model: mdl, dsp, prep: ss.prep, dl: ss.dl ? ss.dl.ms : 0, cached: ss.dl ? ss.dl.cached : true, ep: ss.ep, why: ss.why || '', threads: ort.env.wasm.numThreads }, dbg: D }; }
function stats(a) { let s = 0, q = 0, mx = -Infinity, mn = Infinity; for (let i = 0; i < a.length; i++) { const v = a[i]; s += v; q += v * v; if (v > mx) mx = v; if (v < mn) mn = v; } const m = s / a.length; return { mean: m, std: Math.sqrt(Math.max(0, q / a.length - m * m)), max: mx, min: mn }; }
function slice8(X, dimF) { const o = new Float32Array(4 * dimF * 8); for (let c = 0; c < 4; c++) for (let f = 0; f < dimF; f++) for (let t = 0; t < 8; t++) o[(c * dimF + f) * 8 + t] = X[(c * dimF + f) * T + t]; return o; }

self.onmessage = async (ev) => { const q = ev.data || {}; const say = (p) => self.postMessage(Object.assign({ id: q.id, type: 'prog' }, p));
  try {
    if (q.type === 'wipe') { let n = 0; try { const c = await caches.open(CACHE); for (const k of await c.keys()) { await c.delete(k); n++; } } catch (e) {} if (SESS.s) { try { await SESS.s.release(); } catch (e) {} SESS = { key: '', ep: '', s: null }; } self.postMessage({ id: q.id, type: 'wiped', n }); return; }
    if (q.type === 'cached') { const out = {}; try { const c = await caches.open(CACHE); for (const k of Object.keys(MODELS)) out[k] = !!(await c.match(MODELS[k].url)); } catch (e) {} self.postMessage({ id: q.id, type: 'cached', out }); return; }
    if (q.type === 'stop') { STOP = true; return; }
    if (q.type !== 'run') return; STOP = false;
    const L = q.L, R = q.R, t0 = performance.now(); let r;
    if (q.method === 'center') { const [a, b] = center(L, R); r = { L: a, R: b, m: { chunks: 0, proc: performance.now() - t0, model: 0, dsp: performance.now() - t0, prep: 0, dl: 0, cached: true, ep: 'js', why: '', threads: 1 }, dbg: {} }; }
    else r = await runModel(q.method, L, R, q.ep || 'webgpu', say, !!q.dbg);
    self.postMessage({ id: q.id, type: 'done', L: r.L, R: r.R, m: r.m, dbg: r.dbg }, [r.L.buffer, r.R.buffer]);
  } catch (e) { self.postMessage({ id: q.id, type: 'err', msg: String(e && e.message || e) === 'STOP' ? 'STOP' : String(e && e.message || e).slice(0, 300) }); } };
