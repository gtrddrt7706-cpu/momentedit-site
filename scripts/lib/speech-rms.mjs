/* [LAYER_PLAN_1108 · 대본 21:55] 말소리 크기 = −30 dB 넘는 10ms 창들의 RMS(dB) · 최고(dBFS) */
import { pcm } from './cps.mjs';
export function speechRms(f) { const x = pcm(f), w = 480; let e = 0, n = 0, pk = 0;
  for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) { s += x[j] * x[j]; if (Math.abs(x[j]) > pk) pk = Math.abs(x[j]); } const r = Math.sqrt(s / w); if (20 * Math.log10(r || 1e-9) > -30) { e += s; n += w; } }
  return { rms: +(10 * Math.log10(e / Math.max(1, n) || 1e-12)).toFixed(2), peak: +(20 * Math.log10(pk || 1e-9)).toFixed(2) }; }
