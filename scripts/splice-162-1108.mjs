#!/usr/bin/env node
/* ★★[FULL_1108 · 사장님 17:57 승인] 맞절 162(narr-entry-bow-ex4) 첫 문장 맨 앞 «신랑 신부,»만 새 테이크 A3 로 바꿔 끼운다(대본 narration-splice-1108/README.md 그대로)
   원래 녹음의 «신랑 신부,»(앞 무음 끝 ~ 첫 쉼표 쉼 시작 · −30 dB · 0.08초)를 A3 생 소리로 · 크기 = 뒤 말(쉼표 쉼 뒤 첫 구절) RMS + 0.5 dB · 앞뒤 0.01 / 0.015초 페이드
   원래보다 짧은 만큼은 쉼표 쉼에 무음으로 더한다 · 빠르기는 이 문장이 조립에서 받는 배속 그대로(따로 늘이지 않는다 · 한 번만)
   쓰기: node scripts/splice-162-1108.mjs <원래 문장 flac> <A3 wav> <나갈 flac> */
import { execFileSync, spawnSync } from 'node:child_process'; import fs from 'node:fs'; import path from 'node:path';
const [SRC, A3, OUT] = process.argv.slice(2); if (!SRC || !A3 || !OUT) { console.error('사용: <원래 flac> <A3 wav> <나갈 flac>'); process.exit(2); }
const sil = (f) => { const e = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-30dB:d=0.08', '-f', 'null', '-'], { encoding: 'utf8' }).stderr;
  return { st: [...e.matchAll(/silence_start: ([\d.]+)/g)].map((m) => +m[1]), en: [...e.matchAll(/silence_end: ([\d.]+)/g)].map((m) => +m[1]) }; };
const S = sil(SRC); const vStart = S.en[0], vEnd = S.st.find((x) => x > vStart), nEnd = S.st.find((x) => x > vEnd + 0.05) ?? null, pEnd = S.en.find((x) => x > vEnd);
if (!(vStart >= 0 && vEnd > vStart && pEnd > vEnd)) { console.error('✗ «신랑 신부,» 자리를 못 찾음', S); process.exit(1); }
const rms = (f, a, b) => { const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', `atrim=${a}:${b},astats=metadata=1:reset=0`, '-f', 'null', '-'], { encoding: 'utf8' }).stderr; return +((r.match(/RMS level dB: (-?[\d.]+)/g) || []).pop() || '').replace(/[^\-\d.]/g, ''); };
const T = fs.mkdtempSync(path.join(path.dirname(OUT), 'sp162-'));
const a3 = path.join(T, 'a3.wav'); execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', A3, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', a3]);
const a3d = +spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', a3], { encoding: 'utf8' }).stdout;
const refDb = rms(SRC, pEnd, nEnd ? Math.min(nEnd, pEnd + 2) : pEnd + 2), a3Db = rms(a3, 0, a3d), gain = +(refDb + 0.5 - a3Db).toFixed(2);
const vLen = vEnd - vStart, padSec = Math.max(0, vLen - a3d);
const fc = `[0:a]aresample=48000,asplit=2[x][y];[x]atrim=0:${vStart.toFixed(4)},asetpts=N/SR/TB[h];[y]atrim=start=${vEnd.toFixed(4)},asetpts=N/SR/TB[t];`
  + `[1:a]aresample=48000,volume=${gain}dB,afade=t=in:st=0:d=0.01,afade=t=out:st=${Math.max(0, a3d - 0.015).toFixed(4)}:d=0.015[v];`
  + `anullsrc=r=48000:cl=mono,atrim=0:${padSec.toFixed(4)}[p];[h][v][p][t]concat=n=4:v=0:a=1[o]`;
execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', SRC, '-i', a3, '-filter_complex', fc, '-map', '[o]', '-ac', '1', '-c:a', 'flac', OUT]);
fs.rmSync(T, { recursive: true, force: true });
console.log(JSON.stringify({ vStart: +vStart.toFixed(3), vEnd: +vEnd.toFixed(3), commaEnd: +pEnd.toFixed(3), a3: +a3d.toFixed(3), padSec: +padSec.toFixed(3), refDb, a3Db, gain }));
