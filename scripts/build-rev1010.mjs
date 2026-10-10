// [NARR_REV_1010] 나레이션 전체 개선안(2026-10-10) 검토용 소리 — 사장님 녹음(우성 · 진희) + 옛 문장 원천(_src)을 이어 붙인다.
// 엔진은 이 파일을 모른다. 38코스 청취용이며, 확정되면 원천 · manifest 로 옮기고 이 폴더는 지운다.
// node scripts/build-rev1010.mjs <녹음 폴더(audio_N_*.wav)>
import fs from 'fs'; import path from 'path'; import { execFileSync } from 'child_process';
const IN = process.argv[2]; const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const SRC = path.join(ROOT, 'assets/audio/_src'), OUT = path.join(ROOT, 'assets/audio/narration-draft/rev1010');
const GAP = 1.25, HEAD = 0.4, TAIL = 0.45; // PACE_D
const wav = n => path.join(IN, fs.readdirSync(IN).find(f => f.startsWith(`audio_${n}_`)));
const EX = n => path.join(process.env.EXSRC || '', n + '.wav'); // 옛 예시 클립에서 잘라 낸 문장(_src 없음)
const src = (d, i) => path.join(SRC, d, `${i}.flac`);
// 이름: [문장 파일들]
export const CLIPS = {
  'guest-1-arrival': [src('01_guest-1-arrival', 0), src('01_guest-1-arrival', 1)],
  'guest-2-10min': [27, 28],
  'guest-3-5min': [src('03_guest-3-5min', 0)],   // [NO_POSTURE 2026-10-10 사장님] 자세 이야기 안 함
  'guest-4-1min-pre': [0, 1, 2, 4, 5].map(i => src('89_guest-4-1min-pre', i)),   // [NO_POSTURE] «입장 때 따로 일어서실 것 없습니다» 뺌
  'narr-photo-ask': [37, 38],
  'narr-prevideo-in': [39],
  'candle-out-2': [0], 'candle-out-3': [1], 'candle-out-4': [2],
  'candle-after': [3],
  'entry-call-2': [4], 'entry-call-3': [5], 'entry-call-4': [6],
  'entry-arrive': [7],
  'narr-bless-end': [8],
  'narr-ring-in': [9, 10],
  'declare-clap-a-novow': [11],
  'bridge-b3-clap-thanks': [12],
  'tribute-in': [src('38_tribute-in', 0), src('38_tribute-in', 1)],
  'tribute-out': [src('39_tribute-out', 0), 13],
  'narr-free-in': [14],
  'bridge-b5-video-out': [15],
  'narr-letter-end': [16],
  'narr-cake-out': [17, 18],
  'narr-toast-out': [19],
  'close-bow-2': [20, 21, 22], 'close-bow-3': [23, 24, 22],
  'end-0-photo': [25],
  'narr-photo-split': [src('60_narr-photo-split', 0), src('60_narr-photo-split', 1), 26],
  'ex2-2-10min': [27, 30], 'ex2-3-5min': [31],
  'ex3-2-10min': [27, EX('ex3-2_1'), 33], 'ex3-3-5min': [31, EX('ex3-3_1')],
  'ex4-2-10min': [34, 35], 'ex4-3-5min': [src('03_guest-3-5min', 0)],
  'bridge-5-wait-setup': [40, 41],
  'end-2-goodbye': [42, 43, 44]
};
if (IN) {
  fs.mkdirSync(OUT, { recursive: true });
  const trim = 'silenceremove=start_periods=1:start_threshold=-45dB,areverse,silenceremove=start_periods=1:start_threshold=-45dB,areverse';
  for (const [name, list] of Object.entries(CLIPS)) {
    const files = list.map(x => typeof x === 'number' ? wav(x) : x);
    for (const f of files) if (!fs.existsSync(f)) throw new Error(`${name}: 없음 ${f}`);
    const args = ['-v', 'error', '-y']; let fc = '', parts = [];
    files.forEach((f, i) => { args.push('-i', f); fc += `[${i}:a]aresample=48000,aformat=channel_layouts=mono,${trim}[s${i}];`; });
    let k = files.length; const sil = (d) => { args.push('-f', 'lavfi', '-t', String(d), '-i', 'anullsrc=r=48000:cl=mono'); fc += `[${k}:a]aformat=channel_layouts=mono[z${k}];`; return `[z${k++}]`; };
    parts.push(sil(HEAD)); files.forEach((_, i) => { if (i) parts.push(sil(GAP)); parts.push(`[s${i}]`); }); parts.push(sil(TAIL));
    fc += parts.join('') + `concat=n=${parts.length}:v=0:a=1,loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000[o]`;
    args.push('-filter_complex', fc, '-map', '[o]', '-ac', '1', '-b:a', '128k', path.join(OUT, name + '.mp3'));
    execFileSync('ffmpeg', args);
  }
  console.log('rev1010', Object.keys(CLIPS).length, '클립');
}
