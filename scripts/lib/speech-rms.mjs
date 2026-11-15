/* [LAYER_PLAN_1108 · 대본 21:55] 말소리 크기 = −30 dB 넘는 10ms 창들의 RMS(dB) · 최고(dBFS) */
import { pcm } from './cps.mjs';
export function speechRms(f) { const x = pcm(f), w = 480; let e = 0, n = 0, pk = 0;
  for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) { s += x[j] * x[j]; if (Math.abs(x[j]) > pk) pk = Math.abs(x[j]); } const r = Math.sqrt(s / w); if (20 * Math.log10(r || 1e-9) > -30) { e += s; n += w; } }
  return { rms: +(10 * Math.log10(e / Math.max(1, n) || 1e-12)).toFixed(2), peak: +(20 * Math.log10(pk || 1e-9)).toFixed(2) }; }
/* [LAYER_PLAN_1108 · 6층 · 대본 11/10 11:20] 문장 몸 크기 = 말소리 첫 창부터 0.4초 뒤(첫머리 힘은 빼고) −30 dBFS 넘는 10ms 창들의 RMS(dB) · 몸 말소리가 0.3초 못 되면 문장 전체 */
export function bodyRms(x, headSec = 0.4, sr = 48000) { const w = Math.round(0.01 * sr), thr = Math.pow(10, -30 / 20); const wins = [];
  for (let i = 0; i + w <= x.length; i += w) { let s = 0; for (let j = i; j < i + w; j++) s += x[j] * x[j]; wins.push(s); }
  const on = wins.findIndex((s) => Math.sqrt(s / w) > thr); if (on < 0) return { rms: null, all: null, body: 0 };
  const lv = (from) => { let e = 0, n = 0; for (let k = from; k < wins.length; k++) if (Math.sqrt(wins[k] / w) > thr) { e += wins[k]; n += w; } return { db: n ? +(10 * Math.log10(e / n)).toFixed(2) : null, sec: n / sr }; };
  const all = lv(on), b = lv(on + Math.round(headSec * 100)); return { rms: b.sec >= 0.3 ? b.db : all.db, all: all.db, body: +b.sec.toFixed(2) }; }
