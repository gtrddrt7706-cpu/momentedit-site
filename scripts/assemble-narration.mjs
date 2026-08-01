// 타입캐스트 '문장별 분리' 다운로드 → 54클립 조립기
//
//   node scripts/assemble-narration.mjs --in ~/Downloads/타입캐스트 [--out assets/audio/narration] [--dry]
//
// 하는 일
//   ① manifest.json의 문장 순서대로 파일을 집어
//   ② 문장 사이·클립 앞뒤에 대본 규격대로 무음을 넣고
//   ③ 한 클립으로 붙인 뒤
//   ④ -16 LUFS / True Peak -1.5 dBTP로 정규화하고 페이드를 걸어
//   ⑤ NN_slug.mp3 로 떨군다. parents-letter는 parents.html이 부르는 경로에 사본도 만든다.
//
// ★순서 검증이 이 스크립트의 핵심이다
//   "신랑 신부, 입장!"이 6번, "신랑 신부, 이제 두 사람은 부부입니다."가 4번 나온다.
//   타입캐스트가 내용 기반으로 파일명을 지으면 사전순 정렬이 재생 순서와 어긋난다.
//   그래서 파일 길이를 실측해 대본 음절수로 계산한 예상 길이와 대조한다.
//   한 칸이라도 밀리면 상관이 급격히 무너지므로, 조립 전에 잡힌다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MAN = path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const IN = arg('--in', '');
const OUT = path.resolve(root, arg('--out', 'assets/audio/narration'));

if (!fs.existsSync(MAN)) { console.error('✗ manifest.json이 없습니다. node scripts/build-typecast-import.mjs 먼저 돌리세요.'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));

const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const estSec = (s) => syl(s) / 300 * 60;          // 대본 기준 300음절/분
const AUD = /\.(mp3|wav|m4a|flac|ogg)$/i;

// ── 드라이런: 음원 없이 매니페스트만 점검한다
if (DRY || !IN) {
  console.log(`매니페스트 점검 · ${man.clips.length}클립\n`);
  let tot = 0, sents = 0;
  for (const p of man.parts) {
    const cs = man.clips.filter((c) => c.part === p.file);
    const sec = cs.reduce((a, c) => a + c.head + c.tail
      + c.sents.reduce((b, s) => b + s.before + s.after + estSec(s.text), 0), 0);
    tot += sec; sents += p.sents;
    console.log(`  ${p.file.padEnd(18)} 클립 ${String(p.clips).padStart(2)} · 문장 ${String(p.sents).padStart(3)} · 약 ${(sec / 60).toFixed(1)}분  (화자 ${p.role})`);
  }
  console.log(`\n  합계 ${man.clips.length}클립 · ${sents}문장 · 무음 포함 약 ${(tot / 60).toFixed(1)}분`);
  const dup = {};
  for (const c of man.clips) for (const s of c.sents) (dup[s.text] ||= []).push(c.no);
  const rep = Object.entries(dup).filter(([, v]) => v.length > 1);
  if (rep.length) {
    console.log(`\n  ★같은 문장이 여러 번 나옵니다 — 파일명이 겹칠 수 있으니 반드시 순서로 매칭하세요:`);
    for (const [t, v] of rep) console.log(`    "${t}" × ${v.length}  (클립 ${v.join(', ')})`);
  }
  if (!IN) console.log('\n  실제 조립: --in <다운로드 폴더> 를 주세요.');
  process.exit(0);
}

// ── 입력 수집
if (!fs.existsSync(IN)) { console.error(`✗ 입력 폴더가 없습니다: ${IN}`); process.exit(1); }
const dur = (f) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());

// 파일명 안의 첫 숫자열을 순번으로 본다. 없으면 이름순.
const numOf = (n) => { const m = n.match(/\d+/); return m ? parseInt(m[0], 10) : NaN; };
const collect = (dir) => {
  const fs_ = fs.readdirSync(dir, { withFileTypes: true });
  let out = [];
  for (const e of fs_) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(collect(p));
    else if (AUD.test(e.name)) out.push(p);
  }
  return out;
};
const files = collect(IN);
const allNum = files.every((f) => !isNaN(numOf(path.basename(f))));
files.sort((a, b) => allNum
  ? numOf(path.basename(a)) - numOf(path.basename(b))
  : path.basename(a).localeCompare(path.basename(b), 'ko'));

const need = man.clips.reduce((a, c) => a + c.sents.length, 0);
console.log(`입력 ${files.length}개 · 필요 ${need}개 (정렬: ${allNum ? '파일명 숫자순' : '이름순'})`);
if (files.length !== need) {
  console.error(`\n✗ 개수가 안 맞습니다. '문장별 분리'로 받았는지, 파트를 전부 넣었는지 확인하세요.`);
  console.error(`  파트별 필요 개수: ${man.parts.map((p) => `${p.file} ${p.sents}`).join(' · ')}`);
  process.exit(1);
}

// ── 순서 검증: 실측 길이 vs 대본 예상 길이
const flat = [];
for (const c of man.clips) for (const s of c.sents) flat.push({ c, s });
const real = files.map(dur);
const est = flat.map((x) => estSec(x.s.text));
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; num += u * v; da += u * u; db += v * v; }
  return num / Math.sqrt(da * db);
};
const r = corr(real, est);
console.log(`순서 검증 · 길이 상관 r = ${r.toFixed(3)}`);
if (r < 0.85) {
  console.error(`\n✗ 순서가 어긋난 것으로 보입니다 (r < 0.85).`);
  const bad = flat.map((x, i) => ({ i, d: Math.abs(real[i] - est[i]), t: x.s.text, no: x.c.no }))
    .sort((a, b) => b.d - a.d).slice(0, 5);
  for (const b of bad) console.error(`  ${String(b.i + 1).padStart(3)}번째: 실측 ${real[b.i].toFixed(1)}초 / 예상 ${est[b.i].toFixed(1)}초 — [${b.no}] "${b.t.slice(0, 28)}…"`);
  console.error(`  파일 정렬을 확인하고 다시 돌리세요. 무시하려면 --force`);
  if (!process.argv.includes('--force')) process.exit(1);
}

// ── 조립
fs.mkdirSync(OUT, { recursive: true });
const TMP = fs.mkdtempSync('/tmp/narr-');
const sil = (sec) => {
  const f = path.join(TMP, `sil_${sec.toFixed(2)}.wav`);
  if (!fs.existsSync(f)) execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'lavfi',
    '-i', `anullsrc=r=48000:cl=mono`, '-t', String(sec), '-c:a', 'pcm_s24le', f]);
  return f;
};
const norm = (f) => {                       // 48k/24bit mono로 통일해 concat 안전하게
  const o = path.join(TMP, 'n' + path.basename(f).replace(/\W/g, '_') + '.wav');
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', o]);
  return o;
};

let k = 0, made = 0;
for (const c of man.clips) {
  const seq = [sil(c.head)];
  for (const s of c.sents) {
    if (s.before > 0) seq.push(sil(s.before));
    seq.push(norm(files[k++]));
    if (s.after > 0) seq.push(sil(s.after));
  }
  seq.push(sil(c.tail));

  const lst = path.join(TMP, `l${c.no}.txt`);
  fs.writeFileSync(lst, seq.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
  const joined = path.join(TMP, `j${c.no}.wav`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined]);

  const total = dur(joined);
  const dst = path.join(OUT, `${c.no}_${c.file}.mp3`);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', joined,
    '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.015,afade=t=out:st=${Math.max(0, total - 0.04).toFixed(3)}:d=0.04`,
    '-ar', '48000', '-b:a', '192k', dst]);
  made++;
  console.log(`  ${c.no}_${c.file}.mp3  ${total.toFixed(1)}초  (문장 ${c.sents.length})`);

  // parents.html은 번호 없는 경로를 부른다 — 사본을 둔다
  if (c.file === 'parents-letter') {
    const alt = path.join(path.dirname(OUT), 'parents-letter.mp3');
    fs.copyFileSync(dst, alt);
    console.log(`  ↳ 사본 ${path.relative(root, alt)}  (parents.html 전용 경로)`);
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n✓ ${made}클립 → ${path.relative(root, OUT)}/`);
console.log(`  마지막으로 식장 스피커로 실청하세요. 헤드폰에서 괜찮아도 홀 울림에서 BGM에 묻힐 수 있습니다.`);
