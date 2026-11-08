/* ★★[TEMPO_1107 2026-11-07 사장님 확정] 나레이션 말빠르기 — 조립 단계의 규칙.
 *
 * 표 한 곳: assets/audio/_src/tempo.json (전체 공통 global[GLOBAL_SLOW_1107] · 목소리 기본 단계 · 우성 순간 키별 단계 · 단계 → 배속 공식 · 쉼 자).
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

/* ★[GLOBAL_SLOW_1107 사장님 11/07 «4%로 하자»] 단계 배속 위에 전체 공통 global 을 곱한다(단계 0 = 안 입힘이면 그대로 1) */
export function withGlobal(T, v) {
  if (v == null || v === 1) return v;
  const g = +T.global > 0 ? +T.global : 1;
  return +(v * g).toFixed(4);
}

/* 클립 열쇠(«번호_파일») · 목소리 → 배속(단계 배속 × global). 우성인데 표에 없으면 null(조립이 멈춘다 — 순간 키를 표에 적게) */
/* ★★[SPEED97_1108 사장님 11/08 «97%는 표준»] 표준 방식 — 순간(단계) 차이 없이 한 값(base 0.970) · 문장 역할로만 바꾼다(안내 0.985 · 구호 · 기본 0.970 · 감정은 사장님 선택 뒤)
   진희 = 클립 전체 안내(voiceRole) · 우성 = 문장마다 rules(구호 → 안내 → 감정 → 기본 차례 · 첫 일치) */
export function stdOn(T) { return !!(T.standard && T.standard.on); }
export function sentRole(T, text, voice) {
  const S = T.standard || {}; if (!stdOn(T)) return null;
  if ((S.voiceRole || {})[voice]) return S.voiceRole[voice];
  const t = String(text || '').trim(), R = S.rules || {};
  for (const r of ['cheer', 'guide', 'emotion']) if (R[r] && new RegExp(R[r]).test(t)) return r;
  return 'base';
}
/* 문장 배속(표준 방식) — 클립 배속(tempoOf) 위에 곱할 비율 = 역할 배속 ÷ 클립 배속 */
export function sentSpeed(T, text, voice) { const r = sentRole(T, text, voice); return r ? +(+T.standard.roles[r]).toFixed(4) : null; }

export function tempoOf(T, key, voice) {
  const V = (T.voice || {})[voice];
  if (!V) return 1;                                   // 배역 · 그 밖 목소리는 그대로
  if (stdOn(T)) { const r = (T.standard.voiceRole || {})[voice] || 'base'; return +(+T.standard.roles[r]).toFixed(4); }   // [SPEED97_1108] 클립 바탕 = 그 목소리의 역할(진희 안내) · 우성 기본
  if (V.step != null) return withGlobal(T, speedOfStep(T, V.step));
  if (V.by === 'moment') {
    const m = (T.woosung || {})[key];
    if (!m) return null;
    const st = (T.moments || {})[m];
    if (st == null) return null;
    return withGlobal(T, speedOfStep(T, st));
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
