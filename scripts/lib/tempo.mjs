/* ★★[SPEED3_1108 사장님 11/08 16:12 «3%가 적절» · 16:53 승인] 나레이션 말빠르기 — 조립 단계 규칙 한 곳
 * 표: assets/audio/_src/tempo.json(flat) — 우성 · 진희 나레이션 클립 전부 말소리만 ×speed(0.97) · skip(편지 통낭독 43) · 배역 · 그 밖 목소리는 1
 * 원본(_src)에서 조립할 때 한 번만 입힌다(이미 늦춘 판을 또 늦추지 않는다) · 쉼(−34 dBFS · 0.25초 이상) · 높낮이 그대로
 * TEMPO_FLAT_SPEED(환경 변수)는 검사가 «지금(1.0) 판»을 같은 조립으로 다시 만들 때만 쓴다 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

export const TEMPO_FILE = 'assets/audio/_src/tempo.json';
export function loadTempo(root) { return JSON.parse(fs.readFileSync(path.join(root, TEMPO_FILE), 'utf8')); }
export function flatOn(T) { return !!(T.flat && T.flat.on); }
export function flatSpeed(T) { const e = process.env.TEMPO_FLAT_SPEED; return e ? +e : +T.flat.speed; }
/* 클립 열쇠(«번호_파일») · 목소리 → 배속 [SPEED3_1108] */
export function tempoOf(T, key, voice) {
  if (!flatOn(T)) return 1;
  return (T.flat.voices || []).includes(voice) && !(T.flat.skip || []).includes(key) ? flatSpeed(T) : 1;
}

/* 말소리만 늦추기 — in(wav) → out(wav · 48k mono 24bit). 쉼 구간은 샘플 그대로. */
export function applyTempo(inWav, outWav, factor, T) {
  const SR = 48000;
  const raw = execFileSync('ffmpeg', ['-v', 'error', '-i', inWav, '-f', 'f32le', '-ac', '1', '-ar', String(SR), '-'], { maxBuffer: 1 << 30 });
  const x = new Float32Array(raw.buffer, raw.byteOffset, Math.floor(raw.length / 4));
  const win = Math.round((T.silence.win_sec || 0.01) * SR);
  const thr = Math.pow(10, (T.silence.db ?? -34) / 20);
  const minWin = Math.round((T.silence.min_sec || 0.25) / (T.silence.win_sec || 0.01));
  const nw = Math.floor(x.length / win);
  const quiet = new Uint8Array(nw);
  for (let i = 0; i < nw; i++) { let s = 0; for (let j = i * win; j < (i + 1) * win; j++) s += x[j] * x[j]; quiet[i] = Math.sqrt(s / win) < thr ? 1 : 0; }
  const segs = []; let cur = 0; let i = 0;
  while (i < nw) {
    if (!quiet[i]) { i++; continue; }
    let j = i; while (j < nw && quiet[j]) j++;
    if (j - i >= minWin) { const a = i * win, b = (j >= nw) ? x.length : j * win; if (a > cur) segs.push({ s: cur, e: a, talk: true }); segs.push({ s: a, e: b, talk: false }); cur = b; }
    i = j;
  }
  if (cur < x.length) segs.push({ s: cur, e: x.length, talk: true });
  const n = segs.length;
  /* ★[SPEED3_1108 검사에서 드러남] atempo 는 구간 끝 몇 ms 를 흘린다(실제 배속이 0.973 ~ 0.99 로 밀렸다) — 말 구간 뒤에 0.2초 무음을 덧대 늘린 뒤 정확한 샘플 길이로 자른다 · atempo 는 한 번 */
  const fc = `[0:a]aresample=${SR},asplit=${n}${segs.map((_, k) => `[s${k}]`).join('')};`
    + segs.map((g, k) => `[s${k}]atrim=start_sample=${g.s}:end_sample=${g.e},asetpts=N/SR/TB${g.talk && Math.abs(factor - 1) > 1e-6 ? `,apad=pad_dur=0.2,atempo=${factor},atrim=end_sample=${Math.round((g.e - g.s) / factor)},asetpts=N/SR/TB` : ''}[k${k}]`).join(';')
    + `;${segs.map((_, k) => `[k${k}]`).join('')}concat=n=${n}:v=0:a=1[o]`;
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', inWav, '-filter_complex', fc, '-map', '[o]', '-ar', String(SR), '-ac', '1', '-c:a', 'pcm_s24le', outWav]);
  const talkIn = segs.filter((g) => g.talk).reduce((a, g) => a + (g.e - g.s), 0) / SR, quietIn = segs.filter((g) => !g.talk).reduce((a, g) => a + (g.e - g.s), 0) / SR;
  return { segs: n, quiet: segs.filter((g) => !g.talk).length, talkIn, quietIn };
}
