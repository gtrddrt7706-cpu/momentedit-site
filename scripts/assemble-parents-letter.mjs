// 혼주 편지(43_parents-letter) 전용 조립기 — 이 한 클립만 소스 단위가 다르다
//
//   node scripts/assemble-parents-letter.mjs --in <문단 음원 폴더> [--sign <서명 음원>] [--dry]
//
// 왜 전용 스크립트가 따로 있나
//   assemble-narration.mjs는 manifest의 **문장 38개**에 대응하는 음원 38개를 찾는다.
//   그런데 타입캐스트가 이 파트만 문장이 아니라 **문단 10개**로 잘라서 줬다(다른 파트는 문장 단위).
//   왜 그렇게 갈렸는지는 규명했다 — 붙여넣기를 `타입캐스트/4_혼주편지.txt`(한 줄 = 한 문장)가 아니라
//   `더빙_녹음_대본_최종.txt`(한 줄 = 한 문단)에서 했기 때문이다.
//   같은 글이라도 어느 파일에서 복사했는지가 결과를 바꾼다.
//
//   재수급하면 38개로 받을 수 있지만 그러려면 크레딧 1,538을 다시 쓴다. 문단 경계가 이 편지의
//   큰 무음 자리와 정확히 겹쳐 손해가 거의 없으므로, 받은 10개를 그대로 쓰는 쪽을 택했다.
//   대신 **여백은 손으로 정하지 않는다** — manifest.json의 문장별 before/after를 읽어
//   문단 경계에 해당하는 값을 그대로 더한다. 규격이 바뀌면 이 스크립트도 자동으로 따라온다.
//
// ★가장자리 무음 제거(TRIM_VENDOR_EDGE)는 assemble-narration.mjs와 같은 규칙을 쓴다.
//   타입캐스트가 이 파트에 붙여 준 무음이 앞 0.40초·뒤 0.36초로 가장 두꺼웠다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MAN = path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json');
const SRC = path.join(root, 'docs/plans/식순연구/더빙_녹음_대본_최종.txt');
const CLIP_FILE = 'parents-letter';

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg('--in', '');
const SIGN = arg('--sign', '');
const DRY = process.argv.includes('--dry');
const AUD = /\.(wav|mp3|m4a|flac|ogg)$/i;

for (const f of [MAN, SRC]) if (!fs.existsSync(f)) { console.error(`✗ 없습니다: ${path.relative(root, f)}`); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const clip = man.clips.find((c) => c.file === CLIP_FILE);
if (!clip) { console.error(`✗ manifest에 ${CLIP_FILE} 클립이 없습니다.`); process.exit(1); }

// ── 문단 경계를 대본에서 되읽는다 (손으로 세지 않는다)
//    `[43] …` 헤더 다음 빈 줄까지가 본문이고, 그 한 줄이 곧 한 문단이다.
const lines = fs.readFileSync(SRC, 'utf8').split('\n');
// ★헤더는 `[43] G10 · …  →  43_parents-letter.mp3` — 화살표 앞뒤 공백이 두 칸이다.
//   `\s` 한 개로 적으면 못 찾는다. 눈에 안 보이는 공백 개수에 기대지 않도록 `\s+`로 둔다.
const hi = lines.findIndex((l) => new RegExp(`^\\[\\d+\\]\\s.*→\\s*\\d+_${CLIP_FILE}\\.mp3\\s*$`).test(l));
if (hi < 0) { console.error(`✗ 대본에서 ${CLIP_FILE} 클립을 못 찾았습니다.`); process.exit(1); }
const paras = [];
for (let j = hi + 1; j < lines.length && lines[j].trim() !== ''; j++) paras.push(lines[j].trim());

// manifest와 같은 규칙으로 문장을 나눠, 문단마다 문장 몇 개를 먹는지 센다
const splitSents = (p) => p.split(/(?<=[.!?])\s+/).map((s) => s.trim()).filter(Boolean);
const blocks = []; let cur = 0;
for (const p of paras) { const n = splitSents(p).length; blocks.push([cur, cur + n - 1]); cur += n; }
if (cur !== clip.sents.length) {
  console.error(`✗ 문장 수가 안 맞습니다: 대본 ${cur} vs manifest ${clip.sents.length}`);
  console.error('  대본과 manifest 중 한쪽만 다시 생성한 상태입니다. build-typecast-import.mjs를 다시 돌리세요.');
  process.exit(1);
}

// 문단 사이 여백 = 앞 문단 끝 문장의 after + 뒤 문단 첫 문장의 before
const gaps = [];
for (let i = 0; i + 1 < blocks.length; i++)
  gaps.push(+(clip.sents[blocks[i][1]].after + clip.sents[blocks[i + 1][0]].before).toFixed(3));

const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const estOf = blocks.map(([a, b]) => clip.sents.slice(a, b + 1).reduce((x, s) => x + syl(s.text), 0) / 300 * 60);

console.log(`혼주 편지 · 문단 ${paras.length}개 · 문장 ${cur}개`);
console.log(`  앞 ${clip.head}초 · 문단 사이 ${gaps.join(' / ')} · 뒤 ${clip.tail}초`);
console.log(`  여백 합 ${(clip.head + clip.tail + gaps.reduce((a, b) => a + b, 0)).toFixed(1)}초`);
if (DRY || !IN) {
  if (!IN) console.log(`\n  실제 조립: --in <문단 음원 폴더> [--sign <서명 음원>]`);
  process.exit(0);
}

// ── 입력 — 폴더 안 음원을 파일명 숫자로 정렬하고, 따로 받은 서명은 --sign 으로 맨 뒤에 붙인다
const numOf = (n) => { const m = String(n).match(/\d+/); return m ? parseInt(m[0], 10) : NaN; };
if (!fs.existsSync(IN)) { console.error(`✗ 입력 폴더가 없습니다: ${IN}`); process.exit(1); }
let files = fs.readdirSync(IN).filter((n) => AUD.test(n)).map((n) => path.join(IN, n));
files.sort((a, b) => {
  const x = numOf(path.basename(a)), y = numOf(path.basename(b));
  return (!isNaN(x) && !isNaN(y) && x !== y) ? x - y : path.basename(a).localeCompare(path.basename(b), 'ko');
});
if (SIGN) {
  if (!fs.existsSync(SIGN)) { console.error(`✗ 서명 음원이 없습니다: ${SIGN}`); process.exit(1); }
  files.push(path.resolve(SIGN));
}
if (files.length !== paras.length) {
  console.error(`✗ 음원 ${files.length}개 · 문단 ${paras.length}개 — 개수가 다릅니다.`);
  console.error('  서명 한 줄을 따로 받았다면 --sign 으로 넘겨 주세요.');
  process.exit(1);
}

const dur = (f) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());
const real = files.map(dur);

// ── 순서 검증 — 문단 길이가 대본 음절수와 같은 방향으로 움직이는지
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; num += u * v; da += u * u; db += v * v; }
  return num / Math.sqrt(da * db);
};
const r = corr(real, estOf);
console.log(`\n순서 검증 r = ${r.toFixed(3)}`);
files.forEach((f, i) => console.log(`  ${String(i + 1).padStart(2)}  ${real[i].toFixed(1)}초 / 예상 ${estOf[i].toFixed(1)}초  ${path.basename(f).slice(0, 46)}`));
if (r < 0.85 && !process.argv.includes('--force')) {
  console.error('\n✗ 순서가 어긋난 것으로 보입니다 (r < 0.85). 정렬을 확인하세요. 무시하려면 --force');
  process.exit(1);
}

// ── 가장자리 무음 제거 (TRIM_VENDOR_EDGE · assemble-narration.mjs와 같은 규칙)
const EDGE_KEEP = 0.05, EDGE_MAX = 1.20;
const TMP = fs.mkdtempSync('/tmp/letter-');
let trimmed = 0;
const norm = (f) => {
  const d = dur(f);
  const res = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-50dB:d=0.05', '-f', 'null', '-'],
    { encoding: 'utf8' });   // ★silencedetect는 info 레벨 — `-v error`면 한 줄도 안 나온다
  const seg = []; let c = null;
  for (const m of (res.stderr || '').matchAll(/silence_(start|end): ([-\d.]+)/g)) {
    if (m[1] === 'start') c = parseFloat(m[2]);
    else if (c !== null) { seg.push([c, parseFloat(m[2])]); c = null; }
  }
  if (c !== null) seg.push([c, d]);
  const head = (seg.length && seg[0][0] <= 0.03) ? seg[0][1] : 0;
  const tail = (seg.length && seg[seg.length - 1][1] >= d - 0.03) ? d - seg[seg.length - 1][0] : 0;
  let c0 = Math.min(Math.max(head - EDGE_KEEP, 0), EDGE_MAX);
  let c1 = Math.min(Math.max(tail - EDGE_KEEP, 0), EDGE_MAX);
  if (d - c0 - c1 < 0.30) { c0 = 0; c1 = 0; }
  trimmed += c0 + c1;
  const o = path.join(TMP, 'n' + path.basename(f).replace(/\W/g, '_') + '.wav');
  const af = (c0 || c1) ? ['-af', `atrim=start=${c0.toFixed(3)}:end=${(d - c1).toFixed(3)},asetpts=N/SR/TB`] : [];
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, ...af, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', o]);
  return o;
};
const sil = (sec) => {
  const f = path.join(TMP, `sil_${sec.toFixed(2)}.wav`);
  if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', 'anullsrc=r=48000:cl=mono', '-t', String(sec), '-c:a', 'pcm_s24le', f]);
  return f;
};

const seq = [sil(clip.head)];
files.forEach((f, i) => { seq.push(norm(f)); if (i < gaps.length) seq.push(sil(gaps[i])); });
seq.push(sil(clip.tail));

const lst = path.join(TMP, 'list.txt');
fs.writeFileSync(lst, seq.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
const joined = path.join(TMP, 'joined.wav');
execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined]);
const total = dur(joined);

const outDir = path.resolve(root, clip.dir || 'assets/audio/narration');
fs.mkdirSync(outDir, { recursive: true });
const dst = path.join(outDir, `${clip.no}_${clip.file}.mp3`);
execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', joined,
  '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.015,afade=t=out:st=${Math.max(0, total - 0.04).toFixed(3)}:d=0.04`,
  '-ar', '48000', '-b:a', '192k', dst]);

// parents.html은 번호 없는 경로를 부른다 — 사본을 둔다 (★PARENTS_DUAL_PATH)
const alt = path.join(path.dirname(outDir), 'parents-letter.mp3');
fs.copyFileSync(dst, alt);

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n✓ ${path.relative(root, dst)}  ${total.toFixed(1)}초 (${Math.floor(total / 60)}분 ${(total % 60).toFixed(0)}초)`);
console.log(`  ↳ 사본 ${path.relative(root, alt)}  (parents.html 전용 경로)`);
console.log(`  가장자리 무음 제거 ${trimmed.toFixed(1)}초 — TRIM_VENDOR_EDGE`);
