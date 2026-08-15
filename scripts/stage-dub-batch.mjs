// 나눠 올라오는 더빙 wav 를 모아 **이름으로** 대조한다 [DUB_STAGE]
//
//   node scripts/stage-dub-batch.mjs --from <올라온폴더> [--dry]
//
// ★왜 이름으로 재나 — 2026-08-15 실물 확인
//   타입캐스트가 파일명에 **문장을 박아** 준다: `audio_2_신랑_신부__입장_.wav`.
//   그러면 순서(길이 상관)보다 훨씬 센 자가 생긴다 — 몇 번째 문장인지 이름이 직접 말한다.
//   파일이 커서 사람이 나눠 올리는 상황(사용자: "파일이커서 나눠서 올릴게")에서
//   순서만으로 재면 배치 경계마다 밀릴 창이 열린다. 이름은 배치를 가로질러도 안 밀린다.
//
// ★이름은 **잘린다**
//   실측: `audio_30_부모님께는_여전히_아이_같은_두_사람이__오늘_어른의_약속을.wav`
//   원문은 더 길다. 그래서 **앞자락 일치**로 본다(자른 길이만큼만 대조).
//   특수문자(공백·쉼표·마침표·느낌표)는 전부 `_` 로 바뀌므로, 기대 문장도 같은 규칙으로 접어 비교한다.
//
// ★[USE_EXISTING] 「신랑 신부, 입장!」은 새로 받은 것을 쓰지 않는다 (2026-08-15 사용자 지시)
//   원문: *"신랑 신부, 입장! 이멘트는 기존에있는걸 사용 하고 나머지는 적용"*
//   그 자리는 이미 녹음돼 있고 쉼까지 맞춰 둔 take 다. 더빙본이 올라와도 **표시만 하고 안 쓴다.**
//   지우지는 않는다 — 올라온 것을 조용히 버리면 "왜 안 들어갔지"를 나중에 아무도 못 찾는다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const STAGE = path.join(ROOT, '_dub_stage');

const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const FROM = arg('--from', '');
const DRY = process.argv.includes('--dry');
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };

/* ── 대본(순서의 정본) ─────────────────────────────────────────────────────── */
const PASTE = path.join(DIR, '더빙_한번에.txt');
if (!fs.existsSync(PASTE)) die('더빙_한번에.txt 가 없다 — build-dub-onefile.mjs --write 먼저', 2);
const sents = fs.readFileSync(PASTE, 'utf8').split('\n').filter((l) => l.trim())
  .map((l) => l.replace(/^[^:]*:\s*/, '').trim());

const ORDER = JSON.parse(fs.readFileSync(path.join(DIR, '더빙_한번에_순서.json'), 'utf8'));
/* 몇 번째 문장이 어느 클립인지 */
const clipAt = [];
ORDER.클립.forEach((c) => { for (let k = 0; k < c.문장수; k++) clipAt[c.시작줄 - 1 + k] = { slug: c.slug, k: k + 1, of: c.문장수, 묶음: c.묶음 }; });

/* ★★[NAME_IS_UNDERSCORES 2026-08-15 실측] 이름의 한글은 **디스크에서 밑줄로 바뀐다**
   대화에 보이는 원래 이름은 `audio_2_신랑_신부__입장_.wav` 인데,
   실제 파일은 `ad03a268-audio_9___________.wav` 다 — 한글이 한 글자당 밑줄 하나로 치환된다.
   그래서 「이름으로 글자 대조」는 못 한다. 대신 남은 것 둘로 잰다:
     ① `audio_N` 의 **N** — 이게 곧 대본 N+1번째 줄이다(타입캐스트가 대본 순서로 번호를 매긴다)
     ② **밑줄 개수 ≈ 원문 글자수** (실측: 대본 30자 → 밑줄 31 · 18자 → 19 · 39자 → 40 · 오차 +1)
   ②는 값이 싸고 배치를 가로질러도 안 밀린다. 다만 이름이 잘린 파일이 있으니 **초과는 봐주고
   모자란 쪽만** 본다(잘림). 그리고 소리 길이 ↔ 음절수 상관으로 한 번 더 받친다. */
const USE_EXISTING = '신랑 신부, 입장!';   // [USE_EXISTING] 이 문장은 기존 녹음을 쓴다

/* ── 들어온 것 모으기 ──────────────────────────────────────────────────────── */
fs.mkdirSync(STAGE, { recursive: true });
if (FROM) {
  if (!fs.existsSync(FROM)) die(`${FROM} 이 없다`, 2);
  let n = 0;
  for (const f of fs.readdirSync(FROM)) {
    if (!/\.(wav|mp3|m4a|flac)$/i.test(f)) continue;
    const m = /audio_(\d+)_/.exec(f);
    if (!m) { console.log(`  · 건너뜀(이름에 audio_N 이 없다): ${f}`); continue; }
    if (!DRY) fs.copyFileSync(path.join(FROM, f), path.join(STAGE, f.replace(/^[0-9a-f-]{8,}-/, '')));
    n++;
  }
  console.log(`받은 ${n}개 → ${path.relative(ROOT, STAGE)}/`);
}

/* ── 자리 배정 + 이름 대조 ─────────────────────────────────────────────────── */
let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

/* 밑줄 개수로 후보를 고른다 — 같은 번호가 둘일 때 대본에 맞는 쪽을 집는다 */
const uCount = (f) => (f.replace(/^audio_\d+/, '').replace(/\.[^.]+$/, '').match(/_/g) || []).length;
const cand = new Map();          // index → [파일명…]
for (const f of fs.readdirSync(STAGE)) {
  const m = /^audio_(\d+)_/.exec(f); if (!m) continue;
  const i = parseInt(m[1], 10);
  if (!cand.has(i)) cand.set(i, []);
  cand.get(i).push(f);
}

const have = new Map();
for (const [i, fs_] of cand) {
  if (i >= sents.length) { no(`audio_${i} — 대본은 ${sents.length}문장뿐이다(0~${sents.length - 1})`); continue; }
  if (fs_.length === 1) { have.set(i, fs_[0]); continue; }
  /* ★같은 번호가 둘 — 밑줄 개수가 대본 글자수에 가장 가까운 쪽을 쓰고, 나머지는 이름을 밝힌다.
     조용히 하나를 고르지 않는다. 세션 안에 다른 더빙이 섞여 들어온 적이 실제로 있었다. */
  const want = sents[i].length;
  const scored = fs_.map((f) => ({ f, d: Math.abs(uCount(f) - want) })).sort((a, b) => a.d - b.d);
  have.set(i, scored[0].f);
  console.log(`  ※ audio_${i} 후보 ${fs_.length}개 → 대본 ${want}자에 가장 가까운 「밑줄 ${uCount(scored[0].f)}」 채택` +
    ` (버림: ${scored.slice(1).map((x) => '밑줄 ' + uCount(x.f)).join(' · ')})`);
  if (scored[0].d > 2) no(`audio_${i} 후보 어느 것도 대본 ${want}자와 안 맞는다(가장 가까운 것도 ${scored[0].d} 차이)`);
}

/* ── 이름 길이 대조 [NAME_IS_UNDERSCORES] — 잘린 쪽은 봐주고, 넘치는 쪽만 붉힌다 ── */
const okList = [], nameBad = [];
for (const [i, f] of [...have.entries()].sort((a, b) => a[0] - b[0])) {
  const want = sents[i].length, got = uCount(f);
  if (got > want + 2) { nameBad.push(i); no(`audio_${i} 이름이 대본보다 길다 — 밑줄 ${got} · 대본 ${want}자\n    대본 ${i + 1}번째: ${sents[i].slice(0, 44)}`); }
  else okList.push(i);   // 짧은 것은 이름 잘림(타입캐스트가 자른다) — 길이 상관으로 따로 받친다
}

/* ── 길이 ↔ 음절수 [ORDER_CORR] — 이름이 잘려 못 본 것을 소리로 받친다 ──────── */
{
  const syl = (s) => (s.match(/[가-힣]/g) || []).length;
  const idx = [...have.keys()].sort((a, b) => a - b);
  const dur = (f) => {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', path.join(STAGE, f)], { encoding: 'utf8' });
    if (r.error) die(`ffprobe 를 실행하지 못했다 (${r.error.message}) — 소리를 못 재면 통과시키지 않는다`, 2);
    const v = parseFloat(String(r.stdout || '').trim());
    if (!isFinite(v) || v <= 0) die(`길이를 못 잰 파일: ${f}`, 2);
    return v;
  };
  const real = idx.map((i) => dur(have.get(i)));
  const est = idx.map((i) => syl(sents[i]));
  const n = real.length, ma = real.reduce((a, b) => a + b, 0) / n, mb = est.reduce((a, b) => a + b, 0) / n;
  let num = 0, da = 0, db = 0;
  for (let k = 0; k < n; k++) { const u = real[k] - ma, v = est[k] - mb; num += u * v; da += u * u; db += v * v; }
  const R = (da && db) ? num / Math.sqrt(da * db) : 0;
  console.log(`\n길이 상관 r = ${R.toFixed(3)}  (소리 길이 ↔ 대본 음절수 · ${n}개)`);
  if (R < 0.85) no(`순서가 어긋난다 (r ${R.toFixed(3)} < 0.85) — 번호와 대본이 안 맞는다`);
  /* ★한 개씩도 본다 — 상관은 전체가 맞으면 하나쯤 어긋나도 안 무너진다.
     실측 낭독 속도 402음절/분(= 0.149초/음절). 3배 넘게 벗어나면 그 자리만 짚어 준다. */
  const SPS = 60 / 402;
  const out = idx.map((i, k) => ({ i, real: real[k], want: est[k] * SPS }))
    .filter((x) => x.want > 0.3 && (x.real > x.want * 3 + 1 || x.real < x.want / 3));
  out.slice(0, 6).forEach((x) => no(`audio_${x.i} 길이가 대본과 크게 다르다 — 실측 ${x.real.toFixed(2)}s · 예상 ${x.want.toFixed(2)}s\n    대본 ${x.i + 1}번째: ${sents[x.i].slice(0, 44)}`));
  if (out.length > 6) no(`… 길이 어긋남 ${out.length - 6}건 더`);
}

/* ── 진행 상황 ─────────────────────────────────────────────────────────────── */
const missing = [];
for (let i = 0; i < sents.length; i++) if (!have.has(i)) missing.push(i);
const skip = [...have.keys()].filter((i) => sents[i] === USE_EXISTING);
const skipAll = sents.map((s, i) => (s === USE_EXISTING ? i : -1)).filter((i) => i >= 0);

console.log(`\n대조 ok ${okList.length} · 이름 어긋남 ${nameBad.length} · 아직 안 온 것 ${missing.length}`);
console.log(`받은 ${have.size} / 대본 ${sents.length}문장`);
if (skip.length) console.log(`[USE_EXISTING] 「${USE_EXISTING}」 ${skip.length}개 받았지만 **안 쓴다** — 기존 녹음 사용(전체 ${skipAll.length}자리)`);

/* 클립 단위로 어디까지 찼나 */
const byClip = new Map();
ORDER.클립.forEach((c) => byClip.set(c.slug, { need: c.문장수, got: 0, 묶음: c.묶음 }));
have.forEach((_f, i) => { const c = clipAt[i]; if (c) byClip.get(c.slug).got++; });
const doneC = [...byClip.values()].filter((v) => v.got === v.need).length;
console.log(`클립 ${doneC} / ${ORDER.총클립} 완성`);

if (missing.length) {
  const runs = [];
  let s = missing[0], p = missing[0];
  for (const i of missing.slice(1)) { if (i === p + 1) { p = i; continue; } runs.push([s, p]); s = p = i; }
  runs.push([s, p]);
  console.log('아직 안 온 자리: ' + runs.map(([a, b]) => (a === b ? `audio_${a}` : `audio_${a}~${b}`)).join(' · '));
}

console.log(bad ? `\n틀림 ${bad}건 — 고치기 전엔 조립하지 않는다` : (missing.length ? '\n여기까지 전부 제자리 (다음 묶음 기다림)' : '\n186문장 전부 도착 · 전부 제자리'));
process.exit(bad ? 1 : 0);
