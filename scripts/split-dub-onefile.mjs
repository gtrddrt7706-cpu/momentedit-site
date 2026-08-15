// 한 번에 더빙해 온 폴더를 **원래 묶음으로 되나눈다** [DUB_ONEFILE]
//
//   node scripts/split-dub-onefile.mjs --in <받은폴더> [--out <나눌곳>] [--dry]
//
// ★왜 있나 — 2026-08-15 사용자 지시:
//   *"4개 파일 그냥 하나로 만들고 너한테 보내면 너가알아서 분리해도돼잖아"*
//   붙여넣는 쪽은 `build-dub-onefile.mjs` 가 하나로 합쳤다(186문장). 그러니 돌아오는 wav 도
//   한 덩어리다. 그것을 **어조 177 / 재더빙 9** 로 되잘라, 각자 원래 가던 길로 보낸다.
//
// ★이 스크립트는 조립하지 않는다 [ONE_SPEC]
//   무음 넣기·정규화·클립 붙이기는 이미 `assemble-narration.mjs` 가 한다. 여기서 다시 하면
//   규격이 둘이 되고 언젠가 갈라진다. 여기가 하는 일은 **자르기와 순서 확인**뿐이다.
//   자른 뒤 무엇을 실행할지는 화면에 적어 준다.
//
// ★순서가 이 스크립트의 전부다
//   타입캐스트는 내용으로 파일명을 짓기도 해서 사전순이 재생순과 어긋날 수 있다.
//   그래서 `assemble-narration.mjs` 와 **같은 자**로 잰다 — 파일 길이(ffprobe)와 대본 음절수의
//   상관. 한 칸만 밀려도 상관이 무너지므로 자르기 전에 잡힌다. 자를 자리를 사람이 세지 않는다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const ORDER = path.join(DIR, '더빙_한번에_순서.json');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg('--in', '');
const OUT = arg('--out', path.join(DIR, '_받은wav'));
const DRY = process.argv.includes('--dry');

const die = (m, code = 2) => { console.error('✗ ' + m); process.exit(code); };

if (!IN) die('--in <받은폴더> 가 필요합니다', 2);
if (!fs.existsSync(IN)) die(`${IN} 이 없습니다`, 2);
if (!fs.existsSync(ORDER)) die('더빙_한번에_순서.json 이 없습니다 — node scripts/build-dub-onefile.mjs --write 를 먼저 돌리세요', 2);

const ord = JSON.parse(fs.readFileSync(ORDER, 'utf8'));

/* ── 파일 모으기·정렬 — assemble-narration.mjs 의 그 규칙 ─────────────────── */
const AUD = /\.(mp3|wav|m4a|flac|ogg)$/i;
const numOf = (n) => { const m = String(n).match(/\d+/); return m ? parseInt(m[0], 10) : NaN; };
const collect = (dir) => {
  let out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out = out.concat(collect(p));
    else if (AUD.test(e.name)) out.push(p);
  }
  return out;
};
const sortIn = (files) => {
  const allNum = files.every((f) => !isNaN(numOf(path.basename(f))));
  return files.slice().sort((a, b) => allNum
    ? numOf(path.basename(a)) - numOf(path.basename(b))
    : path.basename(a).localeCompare(path.basename(b), 'ko'));
};

const files = sortIn(collect(IN));
if (!files.length) die(`${IN} 안에서 음원을 못 찾았습니다 — zip 을 푼 폴더째 주세요`, 2);

/* ── 개수부터 ─────────────────────────────────────────────────────────────── */
console.log(`받은 파일 ${files.length}개 · 대본 문장 ${ord.총문장}개 (클립 ${ord.총클립}개)`);
if (files.length !== ord.총문장) {
  console.error(`✗ 개수가 다릅니다 — 받은 ${files.length} · 있어야 할 ${ord.총문장}`);
  console.error('  타입캐스트에서 「문장별 분리」로 받았는지, 빠진 파일이 없는지 봐 주세요.');
  console.error('  ★모자란 채로 자르면 그 뒤가 전부 한 칸씩 밀립니다 — 자르지 않고 멈춥니다.');
  process.exit(1);
}

/* ── 길이 상관 — 순서가 맞는지 [ORDER_CORR] ────────────────────────────────
   ffprobe 가 없으면 「못 잼」(2) 이지 「통과」(0) 가 아니다. 소리를 안 재고 자르면
   틀린 자리에서 잘라도 아무도 모른다. */
const dur = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  if (r.error) die(`ffprobe 를 실행하지 못했습니다 (${r.error.message}) — 소리를 재는 도구가 없으면 자르지 않습니다`, 2);
  const v = parseFloat(String(r.stdout || '').trim());
  if (!isFinite(v) || v <= 0) die(`길이를 못 잰 파일이 있습니다: ${path.basename(f)}`, 2);
  return v;
};
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const corr = (a, b) => {
  const n = a.length, ma = a.reduce((x, y) => x + y, 0) / n, mb = b.reduce((x, y) => x + y, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let i = 0; i < n; i++) { const u = a[i] - ma, v = b[i] - mb; num += u * v; da += u * u; db += v * v; }
  return (da && db) ? num / Math.sqrt(da * db) : 0;
};

/* 대본 문장 = 붙여넣기 파일 그대로(순서의 정본) */
const paste = fs.readFileSync(path.join(DIR, '더빙_한번에.txt'), 'utf8').split('\n').filter((l) => l.trim());
if (paste.length !== ord.총문장) die(`더빙_한번에.txt(${paste.length}줄)와 순서.json(${ord.총문장})이 어긋납니다 — build-dub-onefile.mjs 를 다시 돌리세요`, 2);
const sents = paste.map((l) => l.replace(/^[^:]*:\s*/, ''));

const real = files.map(dur);
const est = sents.map((s) => syl(s));
const r = corr(real, est);
console.log(`순서 상관 r = ${r.toFixed(3)}  (길이 실측 ↔ 대본 음절수)`);
if (r < 0.85) {
  console.error('✗ 순서가 어긋납니다 — 사전순 정렬이 재생 순서와 다릅니다.');
  console.error('  파일명을 바꾸셨거나, 일부만 다시 받아 섞였을 수 있습니다.');
  console.error('  ★어긋난 채로 자르면 소리가 통째로 다른 자리에 붙습니다 — 자르지 않고 멈춥니다.');
  process.exit(1);
}

/* ── 자르기 ───────────────────────────────────────────────────────────────── */
const BUCKET = { tone: '어조60벌', redub: '재더빙3클립' };
const plan = [];
for (const c of ord.클립) {
  for (let k = 0; k < c.문장수; k++) {
    const gi = c.시작줄 - 1 + k;
    plan.push({ bucket: BUCKET[c.묶음] || c.묶음, src: files[gi], gi,
      name: `${String(gi + 1).padStart(3, '0')}_${c.slug}_${k + 1}${path.extname(files[gi])}`, slug: c.slug });
  }
}
const byB = {}; plan.forEach((p) => { byB[p.bucket] = (byB[p.bucket] || 0) + 1; });
console.log('나눌 것:', Object.entries(byB).map(([k, v]) => `${k} ${v}문장`).join(' · '));

if (DRY) { console.log('(--dry · 아무것도 안 씁니다)'); process.exit(0); }

for (const b of Object.keys(byB)) fs.mkdirSync(path.join(OUT, b), { recursive: true });
for (const p of plan) fs.copyFileSync(p.src, path.join(OUT, p.bucket, p.name));

console.log(`\n썼다: ${path.relative(ROOT, OUT)}/  (${Object.keys(byB).join(' · ')})`);
console.log('\n다음:');
console.log(`  · 재더빙 3클립 → node scripts/assemble-narration.mjs --in ${path.relative(ROOT, path.join(OUT, BUCKET.redub))} --clip narr-final-warn,narr-entry-out-C,tribute-in`);
console.log('  · 어조 60벌  → manifest 배선이 끝난 뒤 조립(지금은 manifest 에 자리가 없다 — build-tone-dub.mjs 머리말 참고)');
console.log('  · 그 뒤 node scripts/check-text-audio.mjs 가 0 이면 대기 명단이 비워진 것');
process.exit(0);
