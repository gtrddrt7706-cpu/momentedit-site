// 조립된 클립에서 **문장 하나**를 잘라낸다 [EXTRACT_SENT]
//
//   node scripts/extract-existing-sent.mjs --clip 05_entry-A --sent "신랑 신부, 입장!" [--out <파일>]
//
// ★왜 필요한가 — 2026-08-15 사용자 지시
//   *"신랑신부 입장 이멘트만 기존꺼 쓰는건데 이해한거야 근데 아직도 그대로인데?"*
//   「그 자리는 기존 녹음을 쓴다」고 화면에 적어 두고, 정작 «듣기»를 누르면 새 더빙이 났다.
//   말과 소리가 달랐다 — 그러니 사용자가 보기엔 아무것도 안 바뀐 것이 맞다.
//   문장 단위 wav 는 저장소에 없다(조립된 mp3 만 있다). 그래서 **잘라낸다.**
//
// ★자르는 자리를 손으로 찍지 않는다
//   manifest 가 그 클립의 문장 수를 안다. 조립기는 문장 사이에만 **긴 무음**을 넣는다
//   (문장 안의 쉼은 그보다 짧다). 그러니 「안쪽 무음을 길이순으로 정렬해 위에서 (문장수-1)개」가
//   곧 문장 경계다. 경계를 고르고 나서 **시간순으로 되정렬**해야 자리가 안 섞인다.
//   ★자른 뒤 음절수로 검산한다 — 실측 낭독 속도 402음절/분. 크게 벗어나면 자르지 않고 멎는다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAN = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };

const CLIP = arg('--clip', ''), SENT = arg('--sent', ''), OUT = arg('--out', '');
if (!CLIP || !SENT) die('--clip <NN_file> --sent "<문장>" 이 필요하다', 2);

const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const c = man.clips.find((x) => `${x.no}_${x.file}` === CLIP);
if (!c) die(`manifest 에 ${CLIP} 이 없다`, 2);
const si = (c.sents || []).findIndex((s) => String(s.text).trim() === SENT.trim());
if (si < 0) die(`${CLIP} 에 그 문장이 없다`, 2);

const src = ['narration', 'cast'].map((d) => path.join(ROOT, 'assets/audio', d, CLIP + '.mp3')).find((p) => fs.existsSync(p));
if (!src) die(`${CLIP}.mp3 를 못 찾았다`, 2);

/* ── 무음 지도 ────────────────────────────────────────────────────────────── */
const dur = (f) => {
  const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', f], { encoding: 'utf8' });
  if (r.error) die('ffprobe 를 실행하지 못했다 — 소리를 못 재면 자르지 않는다', 2);
  const v = parseFloat(String(r.stdout || '').trim());
  if (!isFinite(v) || v <= 0) die('길이를 못 쟀다', 2);
  return v;
};
const D = dur(src);
const r = spawnSync('ffmpeg', ['-hide_banner', '-i', src, '-af', 'silencedetect=n=-50dB:d=0.05', '-f', 'null', '-'], { encoding: 'utf8' });
const seg = []; let cur = null;
for (const m of (r.stderr || '').matchAll(/silence_(start|end): ([-\d.]+)/g)) {
  if (m[1] === 'start') cur = parseFloat(m[2]); else if (cur !== null) { seg.push([cur, parseFloat(m[2])]); cur = null; } }
if (cur !== null) seg.push([cur, D]);

const headEnd = (seg.length && seg[0][0] <= 0.05) ? seg[0][1] : 0;
const tailStart = (seg.length && seg[seg.length - 1][1] >= D - 0.06) ? seg[seg.length - 1][0] : D;
const inner = seg.filter(([s, e]) => s > headEnd + 0.01 && e < tailStart - 0.01);

const need = c.sents.length - 1;
if (inner.length < need) die(`문장 경계를 못 찾았다 — 안쪽 무음 ${inner.length}개인데 경계는 ${need}개가 필요하다`, 2);
/* 길이순 상위 need 개를 고르고 → 시간순으로 되정렬 (섞이면 자리가 어긋난다) */
const bound = inner.slice().sort((a, b) => (b[1] - b[0]) - (a[1] - a[0])).slice(0, need)
  .sort((a, b) => a[0] - b[0]);

const starts = [headEnd, ...bound.map(([s, e]) => (s + e) / 2)];
const ends = [...bound.map(([s, e]) => (s + e) / 2), tailStart];
const a = starts[si], b = ends[si];

/* ── 검산 — 음절수로 그럴듯한가 ───────────────────────────────────────────── */
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const want = syl(SENT) * (60 / 402), got = b - a;
console.log(`${CLIP} · ${D.toFixed(2)}s · 문장 ${c.sents.length}개 · 경계 ${bound.length}개`);
console.log(`  [${si}] "${SENT}" → ${a.toFixed(3)}s ~ ${b.toFixed(3)}s (${got.toFixed(2)}s · 음절 ${syl(SENT)} → 또래 ${want.toFixed(2)}s)`);
if (got < want * 0.5 || got > want * 4 + 1.5) die(`자른 길이가 대본과 너무 다르다 — 경계를 잘못 짚었다`, 1);

if (!OUT) { console.log('  (--out 없음 · 자르지 않았다)'); process.exit(0); }
const rr = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-ss', String(a.toFixed(3)), '-to', String(b.toFixed(3)),
  '-c:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', '-ar', '32000', OUT]);
if (rr.status !== 0) die('잘라내기 실패', 2);
console.log(`  썼다: ${OUT} (${dur(OUT).toFixed(2)}s)`);
process.exit(0);
