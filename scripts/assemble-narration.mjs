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
//
// ★★그 폴더 이름을 사람이 맞추는 일도 없앴다 (2026-08-02 · PART_AUTOMATCH)
//   위 수정 이후에도 "폴더 이름을 파트 번호로 시작하게 하라"는 조건이 남아 있었다.
//   타입캐스트가 주는 zip 이름에는 우리 파트 번호가 없으므로, 그건 매번 사람이 손으로 고쳐야 했다.
//   손이 가는 자리는 결국 틀리고, 틀리면 클립이 통째로 다른 자리에 붙는다.
//   지금은 문장 개수로 파트를 짚고 길이 상관으로 확인한다. 폴더 이름은 힌트일 뿐이고,
//   이름이 틀려도 내용이 이긴다. zip은 알아서 풀어서 본다.

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';

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
  console.log('\n  ★받은 zip이나 폴더를 아무 이름으로든 한 곳에 모아 두기만 하면 됩니다 — 파트는 개수와 길이로 알아서 찾습니다(PART_AUTOMATCH):');
  for (const p of parts) console.log(`    ${p.file.padEnd(18)} 파일 ${String(p.sents).padStart(3)}개`);
  if (!IN) console.log('\n  실제 조립: --in <모아 둔 폴더> 를 주세요. 한 파트만 하려면 --part 3');
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

// ── 길이 상관 — 실측 길이가 대본 예상 길이와 같은 방향으로 움직이는지
//    파트 판별과 순서 검증이 같은 자를 쓴다. 자가 둘이면 둘이 다른 말을 하는 날이 온다.
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; num += u * v; da += u * u; db += v * v; }
  return num / Math.sqrt(da * db);
};

// ── ★★PART_AUTOMATCH (2026-08-02) — 받은 그대로 던져도 어느 파트인지 스스로 찾는다
//   예전엔 사람이 `1_안내/` `2_진행_전반/` 처럼 폴더 이름을 파트 번호에 맞춰 줘야 했다.
//   그건 우리 사정이지 받는 사람 사정이 아니다. 타입캐스트는 프로젝트 이름으로 zip을 주고
//   그 이름에는 우리 파트 번호가 없다. 이름을 손으로 맞추는 단계가 하나 더 있으면 그 단계가 틀린다.
//   지금은 **문장 개수**로 파트를 짚고 **길이 상관**으로 확인한다. 둘 다 받은 데이터 자체에서 나온다.
//   폴더 이름은 힌트로만 쓴다(점수가 같을 때의 tie-break) — 틀린 이름이 판정을 뒤집지 못한다.
//   zip이면 풀어서 본다. zip째 줘도, 푼 폴더째 줘도, 한 파트만 낱개로 줘도 같은 답이 나온다.
const needOf = (P) => man.clips.filter((c) => c.part === P.file).reduce((a, c) => a + c.sents.length, 0);
const estOf = (P) => {
  const out = [];
  for (const c of man.clips.filter((x) => x.part === P.file)) for (const s of c.sents) out.push(estSec(s.text));
  return out;
};

const TMPZ = fs.mkdtempSync('/tmp/narr-zip-');
const groups = [];
const addZip = (zip, label) => {
  const d = fs.mkdtempSync(path.join(TMPZ, 'z-'));
  try { execFileSync('unzip', ['-q', '-o', zip, '-d', d]); }
  catch { console.error(`✗ zip을 못 풀었습니다: ${label}`); process.exit(1); }
  const f = sortIn(collect(d));
  if (f.length) groups.push({ name: label, files: f, hint: numOf(label) });
};

if (fs.statSync(IN).isFile()) {
  if (!/\.zip$/i.test(IN)) { console.error(`✗ --in 은 폴더나 zip이어야 합니다: ${IN}`); process.exit(1); }
  addZip(IN, path.basename(IN));
} else {
  for (const e of fs.readdirSync(IN, { withFileTypes: true }).sort((x, y) => x.name.localeCompare(y.name, 'ko'))) {
    const p = path.join(IN, e.name);
    if (e.isDirectory()) {
      const f = sortIn(collect(p));
      if (f.length) groups.push({ name: e.name + '/', files: f, hint: numOf(e.name) });
    } else if (/\.zip$/i.test(e.name)) addZip(p, e.name);
  }
  const loose = sortIn(fs.readdirSync(IN).filter((n) => AUD.test(n)).map((n) => path.join(IN, n)));
  if (loose.length) groups.push({ name: `${path.basename(IN)}/ (낱개)`, files: loose, hint: NaN });
}
if (!groups.length) {
  console.error(`✗ ${IN} 안에서 음원을 못 찾았습니다.`);
  console.error(`  타입캐스트에서 받은 zip을 그대로 이 폴더에 넣거나, 압축을 푼 폴더째 넣어 주세요.`);
  process.exit(1);
}

const durCache = new Map();
const durOf = (f) => { if (!durCache.has(f)) durCache.set(f, dur(f)); return durCache.get(f); };

// 개수가 맞는 파트만 후보로 두고, 길이 상관으로 점수를 매겨 높은 것부터 짝을 짓는다.
const pairs = [];
for (const g of groups) {
  const cands = parts.filter((P) => needOf(P) === g.files.length);
  if (!cands.length) continue;
  g.real = g.files.map(durOf);
  for (const P of cands) pairs.push({ g, P, r: corr(g.real, estOf(P)) });
}
pairs.sort((x, y) => (y.r - x.r) || ((y.g.hint === y.P.n ? 1 : 0) - (x.g.hint === x.P.n ? 1 : 0)));
const usedP = new Set();
for (const x of pairs) {
  if (x.g.P || usedP.has(x.P.file) || x.r < 0.85) continue;
  x.g.P = x.P; x.g.r = x.r; usedP.add(x.P.file);
}

console.log(`받은 것 ${groups.length}묶음 — 폴더 이름이 아니라 개수와 길이로 파트를 찾습니다`);
const orphan = [];
for (const g of groups) {
  if (!g.P) { orphan.push(g); console.log(`  ${g.name.padEnd(26)} ${String(g.files.length).padStart(3)}개 → ✗ 못 찾음`); continue; }
  // ★파트 번호로 보이는 값일 때만 어긋남을 말한다. `typecast_export_2026-08-02` 의 2026을 두고
  //   "이름은 2026인데" 라고 하면 아무 잘못 없는 폴더에 경고를 붙이는 셈이다.
  const claims = !isNaN(g.hint) && g.hint >= 1 && g.hint <= parts.length;
  const mis = (claims && g.hint !== g.P.n) ? ` · 폴더 이름은 ${g.hint}번인데 내용은 ${g.P.n}번입니다(내용을 따릅니다)` : '';
  console.log(`  ${g.name.padEnd(26)} ${String(g.files.length).padStart(3)}개 → ${g.P.file}  r=${g.r.toFixed(3)}${mis}`);
}
if (orphan.length) {
  console.error(`\n✗ 어느 파트인지 못 정한 묶음이 ${orphan.length}개 있습니다.`);
  for (const g of orphan) {
    const taken = parts.filter((P) => needOf(P) === g.files.length && usedP.has(P.file));
    if (taken.length) console.error(`  ${g.name} — ${taken[0].file} 과 개수가 같은데 그 파트는 다른 묶음이 이미 가져갔습니다. zip과 압축 푼 폴더가 같이 들어 있지 않은지 보세요.`);
    else console.error(`  ${g.name} — ${g.files.length}개짜리 파트가 없습니다.`);
  }
  console.error(`  파트별 필요 개수 — ${parts.map((P) => `${P.file} ${needOf(P)}개`).join(' · ')}`);
  console.error(`  개수가 다르면 '문장별 분리'가 아니라 '전체 통합'으로 받았거나, 두 파트가 한 폴더에 섞인 것입니다.`);
  process.exit(1);
}

// ── 조립할 파트만 추린다
const work = [];      // { P, clips, files, real }
let missing = 0;
for (const P of todo) {
  const g = groups.find((x) => x.P && x.P.file === P.file);
  if (!g) { console.log(`  ${P.file.padEnd(18)} 아직 안 받았습니다 — 건너뜁니다`); missing++; continue; }
  work.push({ P, clips: man.clips.filter((c) => c.part === P.file), files: g.files, real: g.real });
}
if (!work.length) { console.error('\n✗ 조립할 파트가 하나도 없습니다.'); process.exit(1); }
if (missing) console.log(`  (${missing}개 파트는 나중에 다시 돌리면 그때 붙습니다)`);

// ── 순서 검증: 실측 길이 vs 대본 예상 길이 · ★파트별로 따로 본다
//    전체를 한 번에 보면 한 파트가 통째로 밀려도 나머지가 상관을 떠받쳐 통과할 수 있다.
//    ★판별에서 이미 r을 봤는데 여기서 또 본다 — 판별은 '어느 파트인가'를, 이건 '순서가 맞나'를 묻는다.
//      후보가 하나뿐이라 사실상 무사통과한 묶음도 여기서 다시 걸린다.
let bad = false;
for (const w of work) {
  const flat = [];
  for (const c of w.clips) for (const s of c.sents) flat.push({ c, s });
  const real = w.real || (w.real = w.files.map(dur));
  const est = flat.map((x) => estSec(x.s.text));
  const r = corr(real, est);
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
// ── ★★[TRIM_VENDOR_EDGE 2026-08-03] 원본 가장자리 무음을 깎는다
//   타입캐스트는 클립마다 앞 0.19~0.40초 · 뒤 0.20~0.36초 무음을 얹어서 준다.
//   그 위에 우리 여백을 그대로 더하면 설계 2.6초 자리가 3.2~3.4초로 들린다(혼주 편지 실측 ·
//   무음이 전체의 30%였다). 사용자 실청 지적 "문장이 바뀌는 곳에서 턴이 너무 길어"의 절반이 이것이다.
//   여기서 가장자리를 없애야 **manifest에 적은 초가 곧 귀에 들리는 초**가 된다.
//   말끝·숨소리를 자르지 않도록 -50dB로 재고 양쪽에 0.05초는 남긴다. 재는 자와 자르는 자가 같다.
const EDGE_KEEP = 0.05;   // 남겨 두는 여유 — 자음 끝이 뭉개지지 않게
const EDGE_MAX = 1.20;    // 이보다 길면 사고(빈 파일·통무음)로 보고 손대지 않는다

// ★★[EOF_TOL 2026-08-03] 끝을 재는 임계. 0.03으로 두면 mp3에서 뒤 무음을 통째로 놓친다 —
//   mp3는 컨테이너에 적힌 duration과 실제 디코드 길이가 ~0.04초 어긋나기 때문에
//   `마지막 silence_end >= dur - 0.03`이 영영 거짓이 되고, 있는 무음이 0으로 읽힌다.
//   **끝을 재는 임계가 파일 형식보다 빡빡하면, 있는 무음도 0으로 읽힌다.**
const EOF_TOL = 0.10;

// ★★[SENT_CAP 2026-08-03] 클립 **안쪽** 쉼의 상한.
//   가장자리(TRIM_VENDOR_EDGE)만 깎아서는 혼주 편지가 한 초도 줄지 않는다. 편지는 문단 10개로
//   받아서 문장 사이 여백을 우리가 넣지 않기 때문이다 — 거기서 들리는 쉼은 전부 타입캐스트가
//   문장 사이에 넣어 둔 자연 쉼이고, 그건 manifest에 없는 무음이라 GAP을 아무리 줄여도 남는다.
//   그래서 안쪽 무음이 상한을 넘으면 **넘은 만큼만** 도려낸다.
//   상한은 manifest의 `gap.sent`를 그대로 읽는다 — 문장 사이 여백을 바꾸는 날 이 상한도 따라오도록.
//   (지우지 않고 상한까지만 줄인다. 쉼을 없애면 문장이 서로 달라붙는다.)
const SENT_CAP = Math.max(0.20, Number(man.gap?.sent) || 0.45);

// ★★★[GAP_NET 2026-08-04 · 같은 날 기본 꺼짐으로 되돌림] 문장 사이 여백에서 **남이 넣어 둔 여백**을 뺀다.
//   왜 — 2026-08-04 사용자 판정: *"편지 여백이 자연스러우니깐 참조해서 진행"*. 편지가 기준자가 됐다.
//   그래서 편지와 나레이션을 같은 자로 실측했더니(scripts/audit/gap-profile.mjs) 딱 한 자리가 어긋났다.
//
//     편지 문장 사이 0.43~0.45  ←  문단 wav **안쪽**이라 SENT_CAP 0.45가 상한으로 걸린다
//     나레이션 문장 사이 0.52~0.55  ←  문장 wav **사이**라 상한이 안 걸리고, 내가 넣은 0.45에
//                                    TRIM_VENDOR_EDGE가 남긴 EDGE_KEEP 0.05가 양쪽에서 더해진다
//
//   같은 「문장 사이」인데 한쪽만 0.10초 길었다. 사용자가 자연스럽다고 한 쪽은 0.45다.
//   ★내가 넣은 여백에 남이 넣어 둔 여백이 더해진다 — 그러니 남은 몫을 빼고 넣어야
//     manifest에 적은 초가 곧 귀에 들리는 초가 된다(TRIM_VENDOR_EDGE 주석의 약속을 여기서 지킨다).
//
//   ★차감 대상은 「문장 사이」뿐이다. SENT_CAP을 넘는 경계(0.70 문단 · 1.00 큰 전환)는 손대지 않는다 —
//     그 자리는 편지에서 이미 0.79/0.80 · 1.09/1.10으로 들렸고 사용자가 자연스럽다고 한 값이다.
//     판별 기준을 SENT_CAP으로 두는 이유도 같다. 문장 사이의 상한과 문장 사이의 판별이 같은 자여야
//     gap.sent를 바꾸는 날 둘이 같이 움직인다.
//   ★클립 앞(head)·뒤(tail)도 대상이 아니다. 편지의 앞 0.23 · 뒤 0.49가 이미 이 값들에서 나왔다.
//
// ★★★그런데 사용자 실청 판정이 뒤집었다 (2026-08-04 · 같은 날):
//     "너무 여백이없는데"
//   측정은 맞았는데 결론이 틀렸다. **편지가 자연스러웠다는 판정은 「문장 사이가 0.45」라는 뜻이 아니었다.**
//   편지는 한 사람이 이어서 읽는 낭독이라 문장이 붙어도 흐름이 끊기지 않는다. 나레이션은 사회자가
//   하객에게 주는 **독립된 지시**라 문장마다 받아들일 틈이 필요하다. 소리의 성격이 다르면 같은 초가
//   다른 길이로 들린다.
//   ★기준자를 옮겨 적을 때는 **어느 자리를 기준으로 삼았는지**까지 물어야 한다.
//     편지에서 귀에 띄는 여백은 문장 사이(0.45)가 아니라 문단 경계(0.79~1.10)였다.
//   그래서 GAP_NET은 **기본 꺼짐**으로 둔다. 발견 자체(같은 이름의 여백이 소스 형태에 따라
//   두 값으로 들린다)는 사실이므로 지우지 않고 남기되, 켜는 것은 --gap-net 을 준 사람의 결정이다.
//
// --gap-add <초> : 문장 사이에 더한다(문단·큰 전환은 제외). 사용자 실청으로 값을 고르기 위한 손잡이.
const GAP_NET_ON = process.argv.includes('--gap-net');
const GAP_ADD = Number(arg('--gap-add', '0')) || 0;
const GAP_NET = (sec) => {
  const v = +Number(sec).toFixed(3);
  if (v > SENT_CAP + 0.02) return v;                       // 문단 0.70 · 큰 전환 1.00은 손대지 않는다
  const net = GAP_NET_ON ? Math.max(0, v - EDGE_KEEP * 2) : v;
  return +(net + GAP_ADD).toFixed(3);
};
const trimStat = { n: 0, sec: 0, inner: 0, net: 0 };

const silSegs = (f, d) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'silencedetect=n=-50dB:d=0.05', '-f', 'null', '-'],
    { encoding: 'utf8' });
  // ★silencedetect는 info 레벨로 나온다 — `-v error`를 붙이면 한 줄도 안 나오고 '무음 0곳'이 된다
  const seg = []; let cur = null;
  for (const m of (r.stderr || '').matchAll(/silence_(start|end): ([-\d.]+)/g)) {
    if (m[1] === 'start') cur = parseFloat(m[2]);
    else if (cur !== null) { seg.push([cur, parseFloat(m[2])]); cur = null; }
  }
  if (cur !== null) seg.push([cur, d]);
  return seg;
};

// 남길 구간 목록을 돌려준다 — 가장자리는 깎고, 안쪽 긴 쉼은 SENT_CAP까지 줄인다.
const keepOf = (f) => {
  const d = durOf(f);
  const seg = silSegs(f, d);
  const head = (seg.length && seg[0][0] <= 0.03) ? seg[0][1] : 0;
  const tail = (seg.length && seg[seg.length - 1][1] >= d - EOF_TOL) ? d - seg[seg.length - 1][0] : 0;
  let c0 = Math.min(Math.max(head - EDGE_KEEP, 0), EDGE_MAX);
  let c1 = Math.min(Math.max(tail - EDGE_KEEP, 0), EDGE_MAX);
  if (d - c0 - c1 < 0.30) { c0 = 0; c1 = 0; }   // 거의 통째로 무음인 파일은 건드리지 않는다
  const a = c0, b = d - c1;

  // 안쪽 무음은 가운데를 도려낸다 — 양끝 절반씩은 남겨 말끝과 들숨을 살린다
  const cut = [];
  for (const [s0, e0] of seg) {
    const s1 = Math.max(s0, a), e1 = Math.min(e0, b);
    if (e1 - s1 <= SENT_CAP + 0.02) continue;
    cut.push([s1 + SENT_CAP / 2, e1 - SENT_CAP / 2]);
    trimStat.inner += (e1 - s1) - SENT_CAP;
  }
  const keep = []; let p = a;
  for (const [cs, ce] of cut) { if (cs > p) keep.push([p, cs]); p = Math.max(p, ce); }
  if (b > p) keep.push([p, b]);
  return keep.length ? keep : [[a, b]];
};

// 남길 구간이 여럿이면 asplit→atrim→concat으로 이어 붙인다.
//   ★같은 입력 패드([0:a])를 두 번 쓸 수는 없다 — 반드시 asplit으로 갈라야 한다.
const trimArgs = (keep, d) => {
  const kept = keep.reduce((x, [s0, e0]) => x + (e0 - s0), 0);
  if (keep.length === 1 && Math.abs(kept - d) < 0.005) return [];
  if (keep.length === 1)
    return ['-af', `atrim=start=${keep[0][0].toFixed(3)}:end=${keep[0][1].toFixed(3)},asetpts=N/SR/TB`];
  const n = keep.length;
  const fc = `[0:a]asplit=${n}${keep.map((_, i) => `[s${i}]`).join('')};`
    + keep.map(([s0, e0], i) => `[s${i}]atrim=start=${s0.toFixed(3)}:end=${e0.toFixed(3)},asetpts=N/SR/TB[k${i}]`).join(';')
    + `;${keep.map((_, i) => `[k${i}]`).join('')}concat=n=${n}:v=0:a=1[o]`;
  return ['-filter_complex', fc, '-map', '[o]'];
};

const norm = (f) => {                       // 48k/24bit mono로 통일해 concat 안전하게 + 무음 정리
  const o = path.join(TMP, 'n' + path.basename(f).replace(/\W/g, '_') + '.wav');
  const d = durOf(f);
  const keep = keepOf(f);
  const kept = keep.reduce((x, [s0, e0]) => x + (e0 - s0), 0);
  execFileSync('ffmpeg', ['-y', '-v', 'error', '-i', f, ...trimArgs(keep, d),
    '-ar', '48000', '-ac', '1', '-c:a', 'pcm_s24le', o]);
  trimStat.n++; trimStat.sec += d - kept;
  return o;
};

let made = 0;
const outDirs = new Set();
for (const w of work) {
  let k = 0;
  console.log(`\n${w.P.file} → ${w.P.dir || 'assets/audio/narration'}/`);
  for (const c of w.clips) {
    // 문장 wav를 먼저 다 만든다 — 사이 여백은 「앞 문장 after + 뒤 문장 before」가 한 자리이므로
    //   따로따로 넣으면 GAP_NET이 한 자리를 두 번 깎는다. 합쳐 놓고 한 번만 판단한다.
    const norms = c.sents.map(() => norm(w.files[k++]));
    const headSec = +(c.head + (c.sents[0]?.before || 0)).toFixed(3);          // 클립 가장자리 — 차감 없음
    const tailSec = +(c.tail + (c.sents[c.sents.length - 1]?.after || 0)).toFixed(3);
    const seq = [sil(headSec)];
    for (let i = 0; i < norms.length; i++) {
      seq.push(norms[i]);
      if (i + 1 >= norms.length) continue;
      const raw = c.sents[i].after + c.sents[i + 1].before;
      const g = GAP_NET(raw);
      trimStat.net += raw - g;
      if (g > 0) seq.push(sil(g));
    }
    seq.push(sil(tailSec));

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
fs.rmSync(TMPZ, { recursive: true, force: true });
console.log(`\n✓ ${made}클립 → ${[...outDirs].map((d) => path.relative(root, d) + '/').join(' · ')}`);
if (trimStat.n) console.log(`  원본 무음 정리 ${trimStat.sec.toFixed(1)}초 (${trimStat.n}개 · 평균 ${(trimStat.sec / trimStat.n).toFixed(2)}초)`
  + ` — 가장자리 ${(trimStat.sec - trimStat.inner).toFixed(1)}초 TRIM_VENDOR_EDGE · 안쪽 ${trimStat.inner.toFixed(1)}초 SENT_CAP(${SENT_CAP}초 상한)`);
if (Math.abs(trimStat.net) > 0.05) console.log(`  문장 사이 여백 조정 ${(-trimStat.net).toFixed(1)}초`
  + `${GAP_NET_ON ? ' · GAP_NET 켜짐(양옆 wav가 가진 ' + EDGE_KEEP + '초씩 차감)' : ''}`
  + `${GAP_ADD ? ' · --gap-add ' + GAP_ADD + '초' : ''}`
  + ` — 귀에 들리는 문장 사이 ≈ ${(SENT_CAP + EDGE_KEEP * 2 + GAP_ADD - (GAP_NET_ON ? EDGE_KEEP * 2 : 0)).toFixed(2)}초`);
if ([...outDirs].some((d) => /cast$/.test(d)))
  console.log(`  ★assets/audio/cast/ 는 미리듣기 전용입니다. 당일 콘솔은 이 클립을 재생하지 않습니다.`);
console.log(`  마지막으로 식장 스피커로 실청하세요. 헤드폰에서 괜찮아도 홀 울림에서 BGM에 묻힐 수 있습니다.`);
