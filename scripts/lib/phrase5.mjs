/* ★[LAYER_PLAN_1108 · 5층 · 대본 11/09 19:55] 구절 쉼 자리 찾기 — 5ms 창 크기(RMS) · 에너지 누적 비율(빠르기 · 이득이 바뀌어도 같은 낱말 경계는 같은 비율)
   build-layers(5층 만들기) · scripts/audit/layer-phrase.mjs(재기)가 같은 자를 쓴다 */
export const SR = 48000, W = 240, WS = W / SR;
export const env = (x) => { const n = Math.floor(x.length / W), e = new Float64Array(n); for (let i = 0; i < n; i++) { let s = 0; for (let j = i * W; j < (i + 1) * W; j++) s += x[j] * x[j]; e[i] = Math.sqrt(s / W); } return e; };
export const db = (v) => 20 * Math.log10(v + 1e-9);
export function runs(e, thr) { const o = []; let i = 0; while (i < e.length) { if (e[i] >= thr) { i++; continue; } let j = i; while (j < e.length && e[j] < thr) j++; o.push({ a: i * WS, b: j * WS, head: i === 0, tail: j >= e.length }); i = j; } return o; }
export const cum = (e) => { const c = new Float64Array(e.length + 1); for (let i = 0; i < e.length; i++) c[i + 1] = c[i] + e[i]; return c; };
export const fracAt = (c, t) => c[Math.max(0, Math.min(c.length - 1, Math.round(t / WS)))] / c[c.length - 1];
export const timeOf = (c, f) => { const T = f * c[c.length - 1]; let i = 0; while (i < c.length - 1 && c[i + 1] < T) i++; return i * WS; };
/* t 근처(±rad) 문턱 아래 무음(문장 머리 · 꼬리 말고) · 없으면 가장 조용한 5ms 창 */
export function dipNear(e, t, thr, rad) {
  const rs = runs(e, thr).filter((r) => !r.head && !r.tail && r.b >= t - rad && r.a <= t + rad).map((r) => ({ ...r, d: Math.max(0, r.a - t, t - r.b) })).sort((p, q) => p.d - q.d || (q.b - q.a) - (p.b - p.a));
  if (rs.length) return { a: rs[0].a, b: rs[0].b, len: +(rs[0].b - rs[0].a).toFixed(3), kind: 'run' };
  let bi = -1, bv = 1e9; for (let i = Math.max(0, Math.round((t - rad) / WS)); i <= Math.min(e.length - 1, Math.round((t + rad) / WS)); i++) if (e[i] < bv) { bv = e[i]; bi = i; }
  return { a: bi * WS, b: (bi + 1) * WS, len: 0, kind: 'min', mdb: +db(bv).toFixed(1) };
}
/* 두 소리(같은 말 · 시작이 다른)의 창 맞춤 — b = a + lag(초) · a 의 at 주변 ±1초 로그 크기 상관 */
export function lagOf(a, b, at, lo = -0.2, hi = 1.5) {
  const i0 = Math.max(0, Math.round((at - 1) / WS)), i1 = Math.min(a.length, Math.round((at + 1) / WS)); let best = -1e9, bl = 0;
  for (let l = Math.round(lo / WS); l <= Math.round(hi / WS); l++) { let s = 0, na = 0, nb = 0; for (let i = i0; i < i1; i++) { const j = i + l; if (j < 0 || j >= b.length) continue; const x = Math.log(a[i] + 1e-4), y = Math.log(b[j] + 1e-4); s += x * y; na += x * x; nb += y * y; } const r = s / Math.sqrt(na * nb + 1e-12); if (r > best) { best = r; bl = l; } }
  return { lag: bl * WS, r: best };
}
/* 자리 본(1층 문장의 그 무음 앞뒤 ±0.3초 로그 크기 · 5ms) — 빠르기 비 r(0.88 ~ 1.18) · 위치를 같이 찾아 무음 가운데를 옮긴다(짧은 무음도 5ms 안으로) */
export const HALF = 60;
export const tmpl = (e, mid) => { const c = Math.round(mid / WS), o = []; for (let k = -HALF; k <= HALF; k++) { const i = c + k; o.push(+(i >= 0 && i < e.length ? db(e[i]) : -90).toFixed(1)); } return o; };
export function matchT(e, tpl, x0, rad = 0.25) {
  const L = e.length, dbs = new Float64Array(L); for (let i = 0; i < L; i++) dbs[i] = db(e[i]);
  const tm = tpl.reduce((s, v) => s + v, 0) / tpl.length, tc = tpl.map((v) => v - tm), tn = Math.sqrt(tc.reduce((s, v) => s + v * v, 0)) || 1;
  let best = { r: -2 };
  for (let rr = 0.88; rr <= 1.1801; rr += 0.01) for (let m = Math.max(0, x0 - rad); m <= x0 + rad; m += WS) {
    const ys = tc.map((_, k) => { const t = m + (k - HALF) * WS * rr, i = Math.round(t / WS); return i >= 0 && i < L ? dbs[i] : -90; });
    const ym = ys.reduce((s, v) => s + v, 0) / ys.length; let s = 0, yn = 0; for (let k = 0; k < ys.length; k++) { const y = ys[k] - ym; s += y * tc[k]; yn += y * y; }
    const r = s / (tn * (Math.sqrt(yn) || 1)); if (r > best.r) best = { r: +r.toFixed(4), mid: +m.toFixed(4), scale: +rr.toFixed(2) }; }
  return best;
}
/* 고른 자리의 무음 — 가운데 m 을 품는 문턱 아래 무음(문장 머리 · 꼬리 말고) · 없으면 m ±0.02 의 가장 조용한 5ms */
export function dipAt(e, m, thr) { const r = runs(e, thr).find((q) => !q.head && !q.tail && q.a <= m + WS && q.b >= m - WS); if (r) return { a: r.a, b: r.b, len: +(r.b - r.a).toFixed(3), kind: 'run' };
  return dipNear(e, m, thr, 0.02); }
/* 자리 하나 찾기(만들기 · 재기 공통) — p = 층5_자리.json 한 줄 · how 'text' = 글자 비율(말소리 앞뒤 사이) 근처 ±0.25 무음 */
export function locate(e, p) { const thr = Math.pow(10, p.thrDb / 20);
  if (p.how === 'text') { const rs = runs(e, thr), h = (rs.find((r) => r.head) || { b: 0 }).b, t = (rs.find((r) => r.tail) || { a: e.length * WS }).a, x = h + p.f * (t - h), d = dipNear(e, x, thr, 0.25); return { m: +((d.a + d.b) / 2).toFixed(4), d, r: null }; }
  const mt = matchT(e, p.tpl, timeOf(cum(e), p.f)), d = dipAt(e, mt.mid, thr); return { m: +((d.a + d.b) / 2).toFixed(4), d, r: mt.r }; }
