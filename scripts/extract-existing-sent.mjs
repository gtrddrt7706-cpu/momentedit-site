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
// ★★[LEN_RANK_WRONG 2026-08-15 실사고] 「긴 무음이 문장 경계」는 **틀렸다.**
//   1차는 안쪽 무음을 길이순으로 정렬해 위에서 (문장수−1)개를 경계로 삼았다.
//   그랬더니 05_entry-A 에서 「신랑 신부,」 **뒤의 극적인 쉼 0.76초**가
//   문장 사이 쉼 0.5초보다 길어서 경계로 뽑혔고, 「입장!」만 잘려 나왔다.
//   사용자가 귀로 잡았다 — *"듣기 누르면 그냥 입장만 들려"*.
//   ★음절수 검산도 이걸 못 걸렀다: 「입장!」이 0.89초라 6음절(0.90초)과 우연히 맞아떨어졌다.
//     길이만 재는 자는 «무엇을 말했는지»를 모른다.
//
// ★2차도 틀렸다 — 「자리로 짚기」(음절수 비례로 경계 위치를 추정)도 같은 자리를 골랐다.
//   문장 안의 쉼이 시간을 잡아먹어 추정이 뒤로 밀린다. 「신랑 신부, 입장!」은 외치는 말이라
//   음절당 0.26초(산문 0.15초)여서 비례 모형 자체가 안 맞는다.
//
// ★고친 자 — **설계된 쉼 값에 가까운 것**이 경계다 [GAP_MATCH]
//   조립기는 문장 사이에 manifest 가 정한 값(after+before)만큼 무음을 «넣는다».
//   그러니 문장 경계의 쉼들은 **서로 비슷하고**, 사람이 말하다 쉰 것은 그 값에서 멀다.
//   05_entry-A 실측 — 경계 0.549·0.550·0.508 (설계 0.45) / 문장 안 0.057·0.151·0.232·**0.760**.
//   길이순으로 고르면 0.760 이 1등이라 틀리고, 설계값과의 거리로 고르면 0.760 은 4등이라 안 뽑힌다.
//   ★자른 뒤 음절수 검산은 남기되, 그것만으로는 못 잡는다(「입장!」 0.89초가 6음절 0.90초와 맞았다).
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

/* ── 경계 고르기 [GAP_MATCH] — 설계된 쉼 값에 **가까운** 것 (긴 것 아님) ──────── */
const designed = c.sents.slice(0, -1).map((x, k) => (x.after || 0) + (c.sents[k + 1].before || 0));
const target = designed.reduce((a, b) => a + b, 0) / designed.length;
const scored = inner.map((g) => ({ g, len: g[1] - g[0], d: Math.abs((g[1] - g[0]) - target) }))
  .sort((a, b) => a.d - b.d);
const bound = scored.slice(0, need).map((x) => x.g).sort((a, b) => a[0] - b[0]);
console.log(`  설계 쉼 ${target.toFixed(2)}s · 뽑힌 경계 ${bound.map((g) => (g[1] - g[0]).toFixed(2)).join('·')}` +
  ` / 안 뽑힘 ${scored.slice(need).map((x) => x.len.toFixed(2)).join('·') || '없음'}`);
/* ★뽑힌 것과 안 뽑힌 것의 «거리 차»가 붙어 있으면 헷갈린 것이다 — 그때는 멎는다 */
if (scored.length > need && scored[need].d - scored[need - 1].d < 0.05) {
  die(`경계와 아닌 것이 너무 비슷하다(${scored[need - 1].d.toFixed(3)} vs ${scored[need].d.toFixed(3)}) — 헷갈린 채 자르지 않는다`, 1);
}

const starts = [headEnd, ...bound.map(([s, e]) => (s + e) / 2)];
const ends = [...bound.map(([s, e]) => (s + e) / 2), tailStart];
const a = starts[si], b = ends[si];

/* ── 검산 — 음절수로 그럴듯한가 ───────────────────────────────────────────── */
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const est = syl(SENT) * (60 / 402), got = b - a;   /* ★`want` 는 위에서 경계 자리 배열로 쓴다 — 이름을 나눈다 */
console.log(`${CLIP} · ${D.toFixed(2)}s · 문장 ${c.sents.length}개 · 경계 ${bound.length}개`);
console.log(`  [${si}] "${SENT}" → ${a.toFixed(3)}s ~ ${b.toFixed(3)}s (${got.toFixed(2)}s · 음절 ${syl(SENT)} → 또래 ${est.toFixed(2)}s)`);
if (got < est * 0.5 || got > est * 4 + 1.5) die(`자른 길이가 대본과 너무 다르다 — 경계를 잘못 짚었다`, 1);

if (!OUT) { console.log('  (--out 없음 · 자르지 않았다)'); process.exit(0); }
const rr = spawnSync('ffmpeg', ['-v', 'error', '-y', '-i', src, '-ss', String(a.toFixed(3)), '-to', String(b.toFixed(3)),
  '-c:a', 'libmp3lame', '-b:a', '64k', '-ac', '1', '-ar', '32000', OUT]);
if (rr.status !== 0) die('잘라내기 실패', 2);
console.log(`  썼다: ${OUT} (${dur(OUT).toFixed(2)}s)`);
process.exit(0);
