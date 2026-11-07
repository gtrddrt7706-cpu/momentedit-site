/* ★★[TEMPO_1107 2026-11-07 사장님 확정] 나레이션 말빠르기 — 조립 단계의 규칙.
 *
 * 표 한 곳: assets/audio/_src/tempo.json (목소리 기본 단계 · 우성 순간 키별 단계 · 단계 → 배속 공식 · 쉼 자).
 * 원본(_src 문장 flac)은 손대지 않는다. assemble-narration 이 문장을 이어 붙인 «바로 다음»(loudnorm · mp3 인코딩 전)에
 * 이 표의 배속으로 «말소리만» 늦춘다. 쉼(−34 dBFS · 0.25초 이상 무음)은 샘플 그대로 둔다 · 음높이 그대로(atempo).
 * 늘 원본에서 다시 만드니 두 번 입히는 일이 없다. 바꾸려면 표의 숫자만 고치고 그 클립들을 다시 조립한다.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const TEMPO_FILE = 'assets/audio/_src/tempo.json';

export function loadTempo(root) {
  return JSON.parse(fs.readFileSync(path.join(root, TEMPO_FILE), 'utf8'));
}

/* 단계 → 배속 (0 이하 = 안 입힘 → 1) */
export function speedOfStep(T, step) {
  if (!(+step > 0)) return 1;
  const F = T.formula; const v = F.a - F.b * (step - 1) / F.c;
  return +v.toFixed(F.round);
}

/* 클립 열쇠(«번호_파일») · 목소리 → 배속. 우성인데 표에 없으면 null(조립이 멈춘다 — 순간 키를 표에 적게) */
export function tempoOf(T, key, voice) {
  const V = (T.voice || {})[voice];
  if (!V) return 1;                                   // 배역 · 그 밖 목소리는 그대로
  if (V.step != null) return speedOfStep(T, V.step);
  if (V.by === 'moment') {
    const m = (T.woosung || {})[key];
    if (!m) return null;
    const st = (T.moments || {})[m];
    if (st == null) return null;
    return speedOfStep(T, st);
  }
  return 1;
}

/* 말소리만 늦추기 — in(wav) → out(wav · 48k mono 24bit). 쉼 구간은 샘플 그대로. */
export function applyTempo(inWav, outWav, factor, T) {
  const SR = 48000;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', inWav, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'],
    { maxBuffer: 1 << 30 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const win = Math.round((T.silence.win_sec || 0.01) * SR);
  const thr = Math.pow(10, (T.silence.db ?? -34) / 20);
  const minWin = Math.round((T.silence.min_sec || 0.25) / (T.silence.win_sec || 0.01));
  const nw = Math.floor(x.length / win);
  const quiet = new Uint8Array(nw);
  for (let i = 0; i < nw; i++) { let s = 0; for (let j = i * win; j < (i + 1) * win; j++) s += x[j] * x[j]; quiet[i] = Math.sqrt(s / win) < thr ? 1 : 0; }
  /* 쉼 = 조용한 창이 minWin 이상 이어진 곳(끝 쪽 자투리 샘플은 마지막 구간에 붙인다) */
  const segs = []; let cur = 0; let i = 0;
  while (i < nw) {
    if (!quiet[i]) { i++; continue; }
    let j = i; while (j < nw && quiet[j]) j++;
    if (j - i >= minWin) {
      const a = i * win, b = (j >= nw) ? x.length : j * win;
      if (a > cur) segs.push({ s: cur, e: a, talk: true });
      segs.push({ s: a, e: b, talk: false }); cur = b;
    }
    i = j;
  }
  if (cur < x.length) segs.push({ s: cur, e: x.length, talk: true });
  const n = segs.length;
  const fc = `[0:a]aresample=${SR},asplit=${n}${segs.map((_, k) => `[s${k}]`).join('')};`
    + segs.map((g, k) => `[s${k}]atrim=start_sample=${g.s}:end_sample=${g.e},asetpts=N/SR/TB${g.talk && Math.abs(factor - 1) > 1e-6 ? `,atempo=${factor}` : ''}[k${k}]`).join(';')
    + `;${segs.map((_, k) => `[k${k}]`).join('')}concat=n=${n}:v=0:a=1[o]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', inWav, '-filter_complex', fc, '-map', '[o]',
    '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s24le', outWav]);
  return { segs: n, quiet: segs.filter((g) => !g.talk).length };
}
