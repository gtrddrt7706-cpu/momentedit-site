// 여백 실측 프로파일러 — 「편지가 자연스럽다」를 다른 파일에 옮겨 적을 수 있는 숫자로 바꾼다
//
//   node scripts/audit/gap-profile.mjs            요약만
//   node scripts/audit/gap-profile.mjs --all      클립별 전체 목록
//
// 왜 필요한가 (2026-08-04 사용자 판정)
//   *"편지 여백이 자연스러우니깐 참조해서 진행"* — 편지가 기준자가 됐다.
//   그런데 기준자는 감이 아니라 초여야 다른 파일에 옮겨 적을 수 있다.
//   ★나는 소리를 못 듣는다. 그래서 「자연스럽다」를 분포로 바꿔 두고, 나머지를 그 분포에 맞춘다.
//
// 재는 자와 자르는 자를 같게 둔다 — 조립기와 같은 -50dB · 같은 EOF 임계(0.10)를 쓴다.
//   ★mp3는 컨테이너 duration과 디코드 길이가 ~0.04초 어긋난다. 임계가 파일 형식보다 빡빡하면
//     있는 무음도 0으로 읽힌다.

import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import fs from 'node:fs';
import path from 'node:path';

const run = promisify(execFile);
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const NOISE = '-50dB';
const MIN_SIL = 0.10;    // 이보다 짧은 무음은 쉼이 아니라 자음 사이 틈이다
const EOF_TOL = 0.10;
const ALL = process.argv.includes('--all');

async function dur(f) {
  const { stdout } = await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration',
    '-of', 'default=nw=1:nk=1', f]);
  return Number(stdout.trim());
}

// ★silencedetect는 info 레벨로 나온다 — -v error를 쓰면 한 줄도 안 나오고 「무음 0곳」이 된다
async function silences(f) {
  const { stderr } = await run('ffmpeg', ['-hide_banner', '-i', f,
    '-af', `silencedetect=noise=${NOISE}:d=${MIN_SIL}`, '-f', 'null', '-'], { maxBuffer: 1 << 24 });
  const segs = [];
  let start = null;
  for (const line of stderr.split('\n')) {
    let m = line.match(/silence_start:\s*(-?[\d.]+)/);
    if (m) { start = Math.max(0, Number(m[1])); continue; }
    m = line.match(/silence_end:\s*([\d.]+)/);
    if (m && start !== null) { segs.push([start, Number(m[1])]); start = null; }
  }
  return segs;
}

// 한 파일을 앞무음 / 뒤무음 / 안쪽 쉼으로 가른다
async function profile(f) {
  const d = await dur(f);
  const segs = await silences(f);
  let head = 0, tail = 0;
  const inner = [];
  for (const [a, b] of segs) {
    if (a <= 0.02) { head = b - a; continue; }
    if (b >= d - EOF_TOL) { tail = b - a; continue; }
    inner.push(Number((b - a).toFixed(3)));
  }
  return { file: path.basename(f), dur: d, head, tail, inner };
}

const stat = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const q = (p) => s[Math.min(s.length - 1, Math.floor(p * (s.length - 1)))];
  return { n: s.length, min: s[0], p25: q(0.25), med: q(0.5), p75: q(0.75), max: s[s.length - 1],
    sum: s.reduce((a, b) => a + b, 0) };
};
const f2 = (x) => (x === null || x === undefined ? '  —  ' : x.toFixed(2));
const line = (name, st) => st
  ? `  ${name.padEnd(16)} n=${String(st.n).padStart(3)}   최소 ${f2(st.min)}   4분위 ${f2(st.p25)}   중앙 ${f2(st.med)}   3분위 ${f2(st.p75)}   최대 ${f2(st.max)}   합 ${f2(st.sum)}초`
  : `  ${name.padEnd(16)} (없음)`;

const listMp3 = (d) => fs.existsSync(path.join(root, d))
  ? fs.readdirSync(path.join(root, d)).filter((x) => x.endsWith('.mp3')).sort()
    .map((x) => path.join(root, d, x))
  : [];

const LETTER = path.join(root, 'assets/audio/parents-letter.mp3');
const NARR = listMp3('assets/audio/narration');
const CAST = listMp3('assets/audio/cast');

const batch = async (files) => {
  const out = [];
  for (let i = 0; i < files.length; i += 6) {
    out.push(...await Promise.all(files.slice(i, i + 6).map(profile)));
  }
  return out;
};

const letter = await profile(LETTER);
const narr = await batch(NARR);
const cast = await batch(CAST);

/* ── 기준자: 편지 ────────────────────────────────────────────── */
console.log('\n══ 기준자 — 혼주 편지 (사용자 판정: 자연스럽다) ══');
console.log(`  파일 길이        ${letter.dur.toFixed(2)}초 (${Math.floor(letter.dur / 60)}분 ${(letter.dur % 60).toFixed(0)}초)`);
console.log(`  앞 / 뒤 무음     ${f2(letter.head)} / ${f2(letter.tail)}`);
const li = stat(letter.inner);
console.log(line('안쪽 쉼 전체', li));
console.log(`  무음 비율        ${((li.sum + letter.head + letter.tail) / letter.dur * 100).toFixed(1)}%`);
// 문단 경계는 안쪽 쉼 중 위쪽 무리다 — 큰 것 9개를 따로 본다(문단 10개 → 경계 9개)
const big = [...letter.inner].sort((a, b) => b - a).slice(0, 9).sort((a, b) => a - b);
const small = [...letter.inner].sort((a, b) => b - a).slice(9);
console.log(`  문단 경계 9곳    ${big.map((x) => x.toFixed(2)).join(' / ')}`);
console.log(line('문단 안 문장쉼', stat(small)));

/* ── 대조: 나레이션 · 배역 ───────────────────────────────────── */
for (const [name, set] of [['나레이션', narr], ['배역', cast]]) {
  const inner = set.flatMap((c) => c.inner);
  const heads = set.map((c) => c.head), tails = set.map((c) => c.tail);
  const total = set.reduce((a, c) => a + c.dur, 0);
  const sil = set.reduce((a, c) => a + c.head + c.tail + c.inner.reduce((x, y) => x + y, 0), 0);
  console.log(`\n══ ${name} — ${set.length}클립 · ${(total / 60).toFixed(1)}분 ══`);
  console.log(line('클립 앞 무음', stat(heads)));
  console.log(line('클립 뒤 무음', stat(tails)));
  console.log(line('클립 안 문장쉼', stat(inner)));
  console.log(`  무음 비율        ${(sil / total * 100).toFixed(1)}%`);
  const long = set.flatMap((c) => c.inner.filter((x) => x > li.max).map((x) => [c.file, x]));
  if (long.length) {
    console.log(`  ★편지 최대(${f2(li.max)})보다 긴 안쪽 쉼 ${long.length}곳`);
    long.sort((a, b) => b[1] - a[1]).slice(0, ALL ? 99 : 8)
      .forEach(([f, x]) => console.log(`      ${f.padEnd(34)} ${x.toFixed(2)}초`));
  } else {
    console.log(`  ✓ 편지 최대(${f2(li.max)})보다 긴 안쪽 쉼 없음`);
  }
  const longTail = set.filter((c) => c.tail > li.max).sort((a, b) => b.tail - a.tail);
  if (longTail.length) {
    console.log(`  ★편지 최대보다 긴 클립 뒤 무음 ${longTail.length}곳`);
    longTail.slice(0, ALL ? 99 : 8).forEach((c) => console.log(`      ${c.file.padEnd(34)} ${c.tail.toFixed(2)}초`));
  }
}

if (ALL) {
  console.log('\n══ 클립별 전체 ══');
  for (const [name, set] of [['나레이션', narr], ['배역', cast]]) {
    console.log(`\n── ${name}`);
    set.forEach((c) => console.log(`  ${c.file.padEnd(34)} ${c.dur.toFixed(2)}초  앞 ${f2(c.head)}  뒤 ${f2(c.tail)}  안쪽 [${c.inner.map((x) => x.toFixed(2)).join(' ')}]`));
  }
}
console.log('');
