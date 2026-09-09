// 타입캐스트가 한 문장을 둘로 쪼개 준 것을 도로 한 파일로 붙인다 [SPLIT_TAKE]
//
//   node scripts/join-typecast-splits.mjs --in <받은폴더> --script <대본.txt> --out <낼폴더> [--gap 0.2] [--dry]
//
// ★왜 — 2026-09-09 사장님이 「1_우성_전반」 51줄을 넣었는데 wav 가 57개로 왔다.
//   「신랑 신부, 입장!」 여섯 줄이 «신랑 신부,» + «입장!» 로 쪼개져 나왔다(다른 줄은 안 쪼개졌다).
//   조립기는 대본 문장 수와 파일 수가 같다고 보고 순서를 맞추므로, 여섯 칸이 밀리면
//   그 뒤 전부가 다른 자리에 붙는다 — 「입장!」이 서약 자리에서 나오는 식이다.
//
// ★왜 그냥 이어 붙이면 안 되나 — 실측: 앞 조각 꼬리 무음 0.347초 + 뒤 조각 머리 무음 0.278초.
//   그대로 붙이면 사이가 0.625초가 된다. 쉼표가 아니라 «두 문장»으로 들린다.
//   그래서 맞닿는 안쪽 무음만 깎고, 쉼표 길이(기본 0.2초)를 새로 넣는다.
//   바깥쪽(앞 조각의 머리·뒤 조각의 꼬리)은 손대지 않는다 — 조립기가 클립 앞뒤 여백을 따로 계산한다.
//
// ★대조가 먼저다 — 파일명을 대본 줄에 «탐욕적으로» 맞춰 보고, 한 줄도 못 맞추면 아무것도 쓰지 않는다.
//   붙일 자리를 사람이 지정하지 않는다(여섯 번 세는 일을 만들지 않는다 · 세다가 틀린다).
//
// ★종료 코드 0 다 맞음 · 1 대본과 파일이 안 맞음 · 2 폴더·대본을 못 읽음
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg('--in', ''), SCRIPT = arg('--script', ''), OUT = arg('--out', '');
const GAP = Number(arg('--gap', '0.2'));
const DRY = process.argv.includes('--dry');
if (!IN || !SCRIPT || !OUT) { console.log('✗ --in · --script · --out 이 필요하다'); process.exit(2); }

const norm = (s) => s.normalize('NFC').replace(/[^가-힣a-zA-Z0-9]/g, '');
let lines, files;
try {
  lines = fs.readFileSync(SCRIPT, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  files = fs.readdirSync(IN).filter((f) => /\.wav$/i.test(f.normalize('NFC')))
    .sort((a, b) => +/audio_(\d+)_/.exec(a.normalize('NFC'))[1] - +/audio_(\d+)_/.exec(b.normalize('NFC'))[1]);
} catch (e) { console.log('✗ 못 읽음: ' + e.message); process.exit(2); }

// 파일명에서 «내용» 부분만 — 타입캐스트가 긴 문장은 ~ 로 자른다
const stem = (f) => {
  const n = f.normalize('NFC'), p = n.split('_');
  const body = n.slice(('audio_' + p[1] + '_').length).replace(/\.wav$/i, '');
  return { s: norm(body).replace(/~$/, ''), cut: body.includes('~') };
};

const plan = [];
let i = 0;
for (const [li, line] of lines.entries()) {
  const a = norm(line);
  let taken = null;
  for (let k = 1; k <= 3 && i + k <= files.length; k++) {         // 한 줄에 최대 세 조각까지
    const parts = files.slice(i, i + k);
    const joined = parts.map((f) => stem(f).s).join('');
    const cut = stem(parts[parts.length - 1]).cut;
    if (cut ? a.startsWith(joined) : a === joined) { taken = parts; break; }
  }
  if (!taken) {
    console.log(`✗ ${li + 1}번 줄을 맞출 수 없다\n  대본: ${line}\n  파일: ${files[i] ?? '(없음)'}`);
    process.exit(1);
  }
  plan.push({ li, line, parts: taken });
  i += taken.length;
}
if (i !== files.length) { console.log(`✗ 남는 파일 ${files.length - i}개 — 대본이 모자라다`); process.exit(1); }

const split = plan.filter((p) => p.parts.length > 1);
console.log(`대본 ${lines.length}줄 · wav ${files.length}개 · 쪼개진 줄 ${split.length}개`);
for (const p of split) console.log(`  ${p.li + 1}  ${p.line}  → ${p.parts.length}조각`);
if (DRY) { console.log('\n(안 씀 · --dry)'); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const ff = (a) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...a]);
const TMP = fs.mkdtempSync('/tmp/splitjoin-');
// 안쪽 무음만 깎는다 — 앞 조각은 꼬리, 가운데 조각은 양쪽, 뒤 조각은 머리
const TRIM_HEAD = 'silenceremove=start_periods=1:start_threshold=-35dB:start_silence=0';
const TRIM_TAIL = `areverse,${TRIM_HEAD},areverse`;

for (const [n, p] of plan.entries()) {
  const dst = path.join(OUT, `${String(n + 1).padStart(3, '0')}_${p.line.slice(0, 24).replace(/[\/\\:*?"<>|]/g, '')}.wav`);
  if (p.parts.length === 1) { fs.copyFileSync(path.join(IN, p.parts[0]), dst); continue; }
  const cut = [];
  p.parts.forEach((f, k) => {
    const o = path.join(TMP, `p${n}_${k}.wav`);
    const af = k === 0 ? TRIM_TAIL : k === p.parts.length - 1 ? TRIM_HEAD : `${TRIM_HEAD},${TRIM_TAIL}`;
    ff(['-i', path.join(IN, f), '-af', af, o]);
    cut.push(o);
  });
  const sil = path.join(TMP, `sil${n}.wav`);
  ff(['-f', 'lavfi', '-i', `anullsrc=r=44100:cl=mono`, '-t', String(GAP), '-c:a', 'pcm_s16le', sil]);
  const list = path.join(TMP, `l${n}.txt`);
  const seq = []; cut.forEach((c, k) => { if (k) seq.push(sil); seq.push(c); });
  fs.writeFileSync(list, seq.map((s) => `file '${s}'`).join('\n') + '\n');
  ff(['-f', 'concat', '-safe', '0', '-i', list, '-c', 'copy', dst]);
}
fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n썼다: ${OUT} · ${plan.length}개 (쉼표 사이 ${GAP}초)`);
