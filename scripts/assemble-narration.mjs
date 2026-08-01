// 타입캐스트 '문장별 분리' 다운로드 → 클립 조립기
//
//   node scripts/assemble-narration.mjs --in ~/Downloads/타입캐스트 [--part 3] [--out <폴더>] [--dry]
//
// 하는 일
//   ① manifest.json의 문장 순서대로 파일을 집어
//   ② 문장 사이·클립 앞뒤에 대본 규격대로 무음을 넣고
//   ③ 한 클립으로 붙인 뒤
//   ④ -16 LUFS / True Peak -1.5 dBTP로 정규화하고 페이드를 걸어
//   ⑤ 클립마다 제 폴더에 NN_slug.mp3 로 떨군다.
//      나레이션 → assets/audio/narration/ · 배역 → assets/audio/cast/ (manifest의 clip.dir)
//      parents-letter는 parents.html이 부르는 경로에 사본도 만든다.
//
// ★순서 검증이 이 스크립트의 핵심이다
//   "신랑 신부, 입장!"이 6번, "신랑 신부, 이제 두 사람은 부부입니다."가 4번 나온다.
//   타입캐스트가 내용 기반으로 파일명을 지으면 사전순 정렬이 재생 순서와 어긋난다.
//   그래서 파일 길이를 실측해 대본 음절수로 계산한 예상 길이와 대조한다.
//   한 칸이라도 밀리면 상관이 급격히 무너지므로, 조립 전에 잡힌다.
//
// ★★파트를 폴더로 받는다 (2026-08-01 수정 · 이 스크립트의 원래 버그)
//   예전엔 --in 아래를 재귀로 평탄화한 뒤 파일명 숫자로 **전역 정렬**했다.
//   그런데 타입캐스트는 파트마다 1번부터 다시 번호를 매긴다. 파트별 폴더에 풀면
//   part1의 1, part2의 1, part1의 2 … 로 교차 정렬돼 전부 어긋난다.
//   4파트 때도 이미 틀렸고 배역(5파트)이 붙으며 확실해졌다.
//   지금은 --in 바로 아래 하위 폴더의 **앞 숫자**를 파트 번호로 읽고, 폴더 안에서만 정렬한다.
//   폴더가 없으면 --in 자체를 한 파트로 본다(그땐 --part 로 어느 파트인지 알려줘야 한다).

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MAN = path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const DRY = process.argv.includes('--dry');
const IN = arg('--in', '');
const ONLY = arg('--part', '');                   // '3' 또는 '3,5' — 이 파트만 조립
const OUT_OVERRIDE = arg('--out', '');            // 주면 clip.dir을 무시하고 전부 여기로

if (!fs.existsSync(MAN)) { console.error('✗ manifest.json이 없습니다. node scripts/build-typecast-import.mjs 먼저 돌리세요.'); process.exit(1); }
const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));

const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const estSec = (s) => syl(s) / 300 * 60;          // 대본 기준 300음절/분
const AUD = /\.(mp3|wav|m4a|flac|ogg)$/i;
const numOf = (n) => { const m = String(n).match(/\d+/); return m ? parseInt(m[0], 10) : NaN; };

// ── 파트 선택
//    manifest의 파트 파일명 앞 숫자가 곧 파트 번호다 (1_안내.txt → 1)
const parts = man.parts.map((p) => ({ ...p, n: numOf(p.file) }));
const pick = ONLY ? new Set(ONLY.split(',').map((s) => parseInt(s.trim(), 10))) : null;
const todo = pick ? parts.filter((p) => pick.has(p.n)) : parts;
if (!todo.length) {
  console.error(`✗ --part ${ONLY} 에 해당하는 파트가 없습니다. 있는 파트: ${parts.map((p) => p.n).join(', ')}`);
  process.exit(1);
}
const dirOf = (c) => path.resolve(root, OUT_OVERRIDE || c.dir || 'assets/audio/narration');

// ── 드라이런: 음원 없이 매니페스트만 점검한다
if (DRY || !IN) {
  console.log(`매니페스트 점검 · ${man.clips.length}클립\n`);
  let tot = 0, sents = 0, clips = 0;
  for (const p of parts) {
    const cs = man.clips.filter((c) => c.part === p.file);
    const sec = cs.reduce((a, c) => a + c.head + c.tail
      + c.sents.reduce((b, s) => b + s.before + s.after + estSec(s.text), 0), 0);
    tot += sec; sents += p.sents; clips += p.clips;
    const spk = (p.speakers || [p.role]).join('·');
    console.log(`  ${p.file.padEnd(18)} 클립 ${String(p.clips).padStart(2)} · 문장 ${String(p.sents).padStart(3)} · 약 ${(sec / 60).toFixed(1)}분  → ${p.dir || 'assets/audio/narration'}/  (화자 ${spk})`);
  }
  console.log(`\n  합계 ${clips}클립 · ${sents}문장 · 무음 포함 약 ${(tot / 60).toFixed(1)}분`);
  const dup = {};
  for (const c of man.clips) for (const s of c.sents) (dup[s.text] ||= []).push(`${c.part.replace(/\.txt$/, '')} ${c.no}`);
  const rep = Object.entries(dup).filter(([, v]) => v.length > 1);
  if (rep.length) {
    console.log(`\n  ★같은 문장이 ${rep.length}종 나옵니다 — 파일명이 겹칠 수 있으니 반드시 순서로 매칭하세요:`);
    for (const [t, v] of rep) console.log(`    "${t}" × ${v.length}  (${v.join(' · ')})`);
  }
  console.log('\n  받은 파일은 파트 번호로 시작하는 폴더에 각각 풀어 주세요:');
  for (const p of parts) console.log(`    <다운로드폴더>/${p.file.replace(/\.txt$/, '')}/  ← ${p.sents}개`);
  if (!IN) console.log('\n  실제 조립: --in <다운로드 폴더> 를 주세요. 한 파트만 하려면 --part 3');
  process.exit(0);
}

// ── 입력 수집
if (!fs.existsSync(IN)) { console.error(`✗ 입력 폴더가 없습니다: ${IN}`); process.exit(1); }
const dur = (f) => parseFloat(execFileSync('ffprobe',
  ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' }).trim());

const collect = (dir) => {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(collect(p));
    else if (AUD.test(e.name)) out.push(p);
  }
  return out;
};
// ★정렬은 반드시 '한 파트 안에서'만 한다. 파트를 가로질러 정렬하면 번호가 교차해 전부 밀린다.
const sortIn = (files) => {
  const allNum = files.every((f) => !isNaN(numOf(path.basename(f))));
  return files.slice().sort((a, b) => allNum
    ? numOf(path.basename(a)) - numOf(path.basename(b))
    : path.basename(a).localeCompare(path.basename(b), 'ko'));
};

// ── 하위 폴더를 파트로 읽는다
const subs = fs.readdirSync(IN, { withFileTypes: true })
  .filter((e) => e.isDirectory())
  .map((e) => ({ n: numOf(e.name), p: path.join(IN, e.name), name: e.name }))
  .filter((d) => !isNaN(d.n));

if (!subs.length) {
  if (!pick || todo.length !== 1) {
    console.error(`✗ ${IN} 아래에 파트 폴더가 없습니다.`);
    console.error(`  파트 번호로 시작하는 폴더에 각각 풀어 주세요: ${parts.map((p) => p.file.replace(/\.txt$/, '') + '/').join(' · ')}`);
    console.error(`  또는 한 파트만 조립한다면 --part <번호> 로 어느 파트인지 알려 주세요.`);
    process.exit(1);
  }
  subs.push({ n: todo[0].n, p: IN, name: path.basename(IN) });
  console.log(`폴더가 안 나뉘어 있어 --in 전체를 파트 ${todo[0].n}(${todo[0].file})로 봅니다.`);
}

// ── 파트별 수집 · 개수 대조
const work = [];      // { part, clips, files }
let missing = 0;
for (const P of todo) {
  const d = subs.find((s) => s.n === P.n);
  if (!d) { console.log(`  ${P.file.padEnd(18)} 폴더 없음 — 건너뜁니다`); missing++; continue; }
  const files = sortIn(collect(d.p));
  const clips = man.clips.filter((c) => c.part === P.file);
  const need = clips.reduce((a, c) => a + c.sents.length, 0);
  console.log(`  ${P.file.padEnd(18)} ${d.name}/ 에서 ${files.length}개 · 필요 ${need}개`);
  if (files.length !== need) {
    console.error(`\n✗ 개수가 안 맞습니다 (${P.file}). '문장별 분리'로 받았는지, 그 파트만 이 폴더에 풀었는지 확인하세요.`);
    process.exit(1);
  }
  work.push({ P, clips, files });
}
if (!work.length) { console.error('\n✗ 조립할 파트가 하나도 없습니다.'); process.exit(1); }
if (missing) console.log(`  (${missing}개 파트는 아직 안 받았습니다 — 나중에 다시 돌리면 그때 붙습니다)`);

// ── 순서 검증: 실측 길이 vs 대본 예상 길이 · ★파트별로 따로 본다
//    전체를 한 번에 보면 한 파트가 통째로 밀려도 나머지가 상관을 떠받쳐 통과할 수 있다.
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; num += u * v; da += u * u; db += v * v; }
  return num / Math.sqrt(da * db);
};
let bad = false;
for (const w of work) {
  const flat = [];
  for (const c of w.clips) for (const s of c.sents) flat.push({ c, s });
  const real = w.files.map(dur);
  const est = flat.map((x) => estSec(x.s.text));
  const r = corr(real, est);
  w.real = real;
  console.log(`순서 검증 · ${w.P.file.padEnd(18)} r = ${r.toFixed(3)}${r < 0.85 ? '   ✗' : ''}`);
  if (r < 0.85) {
    bad = true;
    const worst = flat.map((x, i) => ({ i, d: Math.abs(real[i] - est[i]), t: x.s.text, no: x.c.no }))
      .sort((a, b) => b.d - a.d).slice(0, 5);
    for (const b of worst) console.error(`    ${String(b.i + 1).padStart(3)}번째: 실측 ${real[b.i].toFixed(1)}초 / 예상 ${est[b.i].toFixed(1)}초 — [${b.no}] "${b.t.slice(0, 28)}…"`);
  }
}
if (bad) {
  console.error(`\n✗ 순서가 어긋난 것으로 보입니다 (r < 0.85). 파일 정렬을 확인하고 다시 돌리세요. 무시하려면 --force`);
  if (!process.argv.includes('--force')) process.exit(1);
}

// ── 조립
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

let made = 0;
const outDirs = new Set();
for (const w of work) {
  let k = 0;
  console.log(`\n${w.P.file} → ${w.P.dir || 'assets/audio/narration'}/`);
  for (const c of w.clips) {
    const seq = [sil(c.head)];
    for (const s of c.sents) {
      if (s.before > 0) seq.push(sil(s.before));
      seq.push(norm(w.files[k++]));
      if (s.after > 0) seq.push(sil(s.after));
    }
    seq.push(sil(c.tail));

    const tag = `${w.P.n}_${c.no}`;
    const lst = path.join(TMP, `l${tag}.txt`);
    fs.writeFileSync(lst, seq.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join('\n'));
    const joined = path.join(TMP, `j${tag}.wav`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-c', 'copy', joined]);

    const total = dur(joined);
    const outDir = dirOf(c);
    fs.mkdirSync(outDir, { recursive: true });
    outDirs.add(outDir);
    const dst = path.join(outDir, `${c.no}_${c.file}.mp3`);
    execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', joined,
      '-af', `loudnorm=I=-16:TP=-1.5:LRA=11,afade=t=in:st=0:d=0.015,afade=t=out:st=${Math.max(0, total - 0.04).toFixed(3)}:d=0.04`,
      '-ar', '48000', '-b:a', '192k', dst]);
    made++;
    console.log(`  ${c.no}_${c.file}.mp3  ${total.toFixed(1)}초  (문장 ${c.sents.length})`);

    // parents.html은 번호 없는 경로를 부른다 — 사본을 둔다 (★PARENTS_DUAL_PATH)
    if (c.file === 'parents-letter') {
      const alt = path.join(path.dirname(outDir), 'parents-letter.mp3');
      fs.copyFileSync(dst, alt);
      console.log(`  ↳ 사본 ${path.relative(root, alt)}  (parents.html 전용 경로)`);
    }
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
console.log(`\n✓ ${made}클립 → ${[...outDirs].map((d) => path.relative(root, d) + '/').join(' · ')}`);
if ([...outDirs].some((d) => /cast$/.test(d)))
  console.log(`  ★assets/audio/cast/ 는 미리듣기 전용입니다. 당일 콘솔은 이 클립을 재생하지 않습니다.`);
console.log(`  마지막으로 식장 스피커로 실청하세요. 헤드폰에서 괜찮아도 홀 울림에서 BGM에 묻힐 수 있습니다.`);
