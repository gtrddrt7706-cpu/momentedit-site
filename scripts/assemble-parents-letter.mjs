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

/* ★[NAN_NOT_ZERO 2026-08-10] 못 읽은 길이를 값으로 삼키지 않는다.
   ffprobe 는 못 재면 'N/A' 를 내놓기도 한다. parseFloat('N/A') = NaN 이고,
   NaN 은 조용히 아래 상관계수까지 흘러가 **비교 자체를 무력화한다** —
   `NaN < 0.85` 는 false 라, 아래 정렬 게이트가 통과로 넘어간다.
   실측: 정상 r=1.000(통과) · 완전 역순 r=-1.000(막힘) · **역순 + 한 파일 NaN → 통과**.
   즉 못 읽은 파일 하나가 정렬 안전망을 통째로 끈다.
   ★build-chorus 의 `|| 0` 과 같은 병이고 꼴만 다르다(0 대신 NaN).
     읽지 못한 것을 값으로 바꾸면, 없는 사실이 데이터가 되어 오래 산다. */
/* ★★[DUR_SAY_WHY 2026-08-10] assemble-narration 과 같은 몸으로 맞춘다 — 두 조립기가 같은 자를 쓴다.
   실측: execFileSync 는 ffprobe 가 0 이 아닌 코드로 끝나면 **먼저 던져** 아래 안내문에 닿지 못하고
   Node 스택 덤프가 뿌려졌다(깨진 wav 로 재현). 막는 것과 왜 막혔는지 말하는 것은 다른 일이다. */
const dur = (f) => {
  const r = spawnSync('ffprobe',
    ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  if (r.error) throw new Error(`ffprobe 를 실행하지 못했습니다 (${r.error.message}) — 소리를 재는 도구가 없으면 조립하지 않습니다.`);
  const raw = String(r.stdout || '').trim();
  const n = parseFloat(raw);
  if (!Number.isFinite(n) || n <= 0) {
    const why = String(r.stderr || '').trim().split('\n')[0] || '(ffprobe 가 아무 말도 하지 않음)';
    throw new Error(`길이를 못 읽었습니다: ${path.basename(f)} — ${why} · 못 읽은 것을 0 이나 NaN 으로 바꾸지 않습니다.`);
  }
  return n;
};
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
/* ★[NAN_NOT_ZERO] `r < 0.85` 이 아니라 `!(r >= 0.85)` 로 쓴다.
   두 식은 r 이 수일 때만 같다. r 이 NaN 이면 앞엣것은 false(통과), 뒤엣것은 true(막힘)다.
   위 dur() 가 이미 던지므로 여기까지 NaN 이 올 길은 막혔지만, 게이트는 게이트대로 닫아 둔다 —
   재는 곳이 하나 늘 때마다 이 자리가 다시 열리는 것을 막는 값싼 자물쇠다. */
if (!(r >= 0.85) && !process.argv.includes('--force')) {
  console.error(`\n✗ 순서가 어긋난 것으로 보입니다 (r = ${Number.isFinite(r) ? r.toFixed(3) : '못 구함'} · 기준 0.85). 정렬을 확인하세요. 무시하려면 --force`);
  process.exit(1);
}

// ── 무음 정리 (assemble-narration.mjs와 같은 규칙 · 두 조립기가 같은 자를 쓴다)
//    가장자리는 깎고(TRIM_VENDOR_EDGE), 안쪽 긴 쉼은 상한까지 줄인다(SENT_CAP).
//    ★이 클립에서는 SENT_CAP이 특히 중요하다. 편지는 문단 10개로 받아서 문장 사이 여백을
//      우리가 넣지 않는다 — 여기서 들리는 문장 사이 쉼은 전부 타입캐스트가 넣어 둔 자연 쉼이라
//      manifest의 GAP을 아무리 줄여도 그대로 남는다. 상한을 걸어야 비로소 줄어든다.
const EDGE_KEEP = 0.05, EDGE_MAX = 1.20;
// ★mp3는 컨테이너 duration과 디코드 길이가 ~0.04초 어긋난다. 0.03으로 재면 뒤 무음을 통째로 놓친다.
const EOF_TOL = 0.10;
const SENT_CAP = Math.max(0.20, Number(man.gap?.sent) || 0.45);
const TMP = fs.mkdtempSync('/tmp/letter-');
let trimmed = 0, trimmedInner = 0;
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
  const tail = (seg.length && seg[seg.length - 1][1] >= d - EOF_TOL) ? d - seg[seg.length - 1][0] : 0;
  let c0 = Math.min(Math.max(head - EDGE_KEEP, 0), EDGE_MAX);
  let c1 = Math.min(Math.max(tail - EDGE_KEEP, 0), EDGE_MAX);
  if (d - c0 - c1 < 0.30) { c0 = 0; c1 = 0; }
  const lo = c0, hi = d - c1;

  // 안쪽 무음은 가운데를 도려낸다 — 양끝 절반씩은 남겨 말끝과 들숨을 살린다
  const cut = [];
  for (const [s0, e0] of seg) {
    const s1 = Math.max(s0, lo), e1 = Math.min(e0, hi);
    if (e1 - s1 <= SENT_CAP + 0.02) continue;
    cut.push([s1 + SENT_CAP / 2, e1 - SENT_CAP / 2]);
    trimmedInner += (e1 - s1) - SENT_CAP;
  }
  const keep = []; let p = lo;
  for (const [cs, ce] of cut) { if (cs > p) keep.push([p, cs]); p = Math.max(p, ce); }
  if (hi > p) keep.push([p, hi]);
  if (!keep.length) keep.push([lo, hi]);

  const kept = keep.reduce((x, [s0, e0]) => x + (e0 - s0), 0);
  trimmed += d - kept;

  // ★같은 입력 패드([0:a])를 두 번 쓸 수 없다 — 여럿이면 asplit으로 갈라 놓고 다시 concat한다
  let af = [];
  if (keep.length === 1 && Math.abs(kept - d) >= 0.005)
    af = ['-af', `atrim=start=${keep[0][0].toFixed(3)}:end=${keep[0][1].toFixed(3)},asetpts=N/SR/TB`];
  else if (keep.length > 1) {
    const n = keep.length;
    af = ['-filter_complex',
      `[0:a]asplit=${n}${keep.map((_, i) => `[s${i}]`).join('')};`
      + keep.map(([s0, e0], i) => `[s${i}]atrim=start=${s0.toFixed(3)}:end=${e0.toFixed(3)},asetpts=N/SR/TB[k${i}]`).join(';')
      + `;${keep.map((_, i) => `[k${i}]`).join('')}concat=n=${n}:v=0:a=1[o]`, '-map', '[o]'];
  }
  const o = path.join(TMP, 'n' + path.basename(f).replace(/\W/g, '_') + '.wav');
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
console.log(`  원본 무음 정리 ${trimmed.toFixed(1)}초 — 가장자리 ${(trimmed - trimmedInner).toFixed(1)}초 TRIM_VENDOR_EDGE`
  + ` · 안쪽 ${trimmedInner.toFixed(1)}초 SENT_CAP(${SENT_CAP}초 상한)`);
