// 조립된 클립 **뒤에 빠진 문장을 이어 붙인다** [PATCH_TAIL]
//
//   node scripts/patch-clip-sent.mjs --clip 11_narr-welcome-in --wav <새문장.wav> [--write]
//
// ★왜 assemble-narration 을 못 쓰나
//   그 조립기는 **문장 wav 전부**를 받아 클립을 처음부터 다시 만든다(`--in` = 그 파트 전체 원본).
//   그런데 기존 105클립의 문장 wav 는 저장소에 없다 — 조립된 mp3 만 있다.
//   그래서 [AUDIO_SENTS] 로 찾은 「빠진 마지막 문장」은 **이어 붙이는 수밖에** 없다.
//   ★이건 조립기를 대신하는 것이 아니다. 원본이 있는 날에는 조립기가 정본이다 [ONE_SPEC].
//     여기는 «원본이 없는 클립을 되살리는 한 가지 경우»만 맡고, 그 사실을 이름과 이 머리말에 박아 둔다.
//
// ★규격은 manifest 가 정한다 — 여기서 숫자를 새로 정하지 않는다
//   붙일 자리의 무음 = 앞 문장 after + 이 문장 before, 끝 무음 = 클립 tail. 전부 manifest 값이다.
//
// ★음량 — 클립 전체를 다시 정규화하지 **않는다**
//   기존 부분은 이미 -16 LUFS 로 조립돼 검수까지 지난 소리다. 통째로 다시 걸면 그 부분이 바뀐다.
//   **새 문장만** 클립의 실측 음량에 맞춘다. 손대는 범위를 최소로 둔다.
//
// ★★자기 검사 — 붙인 뒤 [AUDIO_SENTS] 와 **같은 자**로 다시 세어 문장 수가 맞는지 본다.
//   맞지 않으면 원본을 덮지 않는다. 「붙였다」와 「들린다」는 다른 말이다.
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { durOf, silences } from './lib/sent-bounds.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MAN = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };
const CLIP = arg('--clip', ''), WAV = arg('--wav', ''), WRITE = process.argv.includes('--write');
if (!CLIP || !WAV) die('--clip <NN_file> --wav <새문장.wav> 가 필요하다', 2);
if (!fs.existsSync(WAV)) die(`${WAV} 이 없다`, 2);

const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const c = man.clips.find((x) => `${x.no}_${x.file}` === CLIP);
if (!c) die(`manifest 에 ${CLIP} 이 없다`, 2);
const dst = ['narration', 'cast'].map((d) => path.join(ROOT, 'assets/audio', d, CLIP + '.mp3')).find((p) => fs.existsSync(p));
if (!dst) die(`${CLIP}.mp3 를 못 찾았다`, 2);

const syl = (s) => (String(s).match(/[가-힣]/g) || []).length;
const n = (c.sents || []).length;
if (n < 2) die('문장이 하나뿐인 클립이다 — 붙일 자리가 없다', 2);

/* ── 지금 몇 문장이 들어 있나 ([AUDIO_SENTS] 와 같은 자) ───────────────────── */
const heardOf = (f) => {
  const d = durOf(f); if (!isFinite(d)) return { heard: -1 };
  const seg = silences(f, d);
  const head = (seg.length && seg[0][0] <= 0.05) ? seg[0][1] : 0;
  const tail = (seg.length && seg[seg.length - 1][1] >= d - 0.06) ? seg[seg.length - 1][0] : d;
  const inner = seg.filter(([s, e]) => s > head + 0.01 && e < tail - 0.01);
  const designed = c.sents.slice(0, -1).map((x, k) => (x.after || 0) + (c.sents[k + 1].before || 0));
  const minGap = Math.min(...designed);
  return { d, head, tail, heard: inner.filter(([s, e]) => (e - s) >= minGap * 0.7).length + 1, minGap };
};
const cur = heardOf(dst);
console.log(`${CLIP} · 대본 ${n}문장 · 지금 들리는 것 ${cur.heard}문장 · ${cur.d.toFixed(2)}s`);
if (cur.heard >= n) die('이미 문장 수가 맞다 — 붙일 것이 없다(같은 것을 두 번 붙이지 않는다)', 1);
if (cur.heard !== n - 1) die(`한 문장만 붙일 수 있다(지금 ${cur.heard}/${n}) — 여러 개가 빠진 클립은 다시 조립할 것`, 1);

const want = String(c.sents[n - 1].text || '').trim();
console.log(`  붙일 문장: "${want}"`);

/* ── 새 문장이 그럴듯한 길이인가 ───────────────────────────────────────────── */
const wd = durOf(WAV); if (!isFinite(wd)) die('새 wav 길이를 못 쟀다', 2);
const est = syl(want) * (60 / 402);
console.log(`  새 wav ${wd.toFixed(2)}s · 음절 ${syl(want)} → 또래 ${est.toFixed(2)}s`);
if (wd < est * 0.5 || wd > est * 3 + 1.5) die('새 wav 길이가 대본과 너무 다르다 — 다른 문장을 준 것은 아닌가', 1);

/* ── 음량 맞추기 — 클립 실측에 새 문장만 맞춘다 ───────────────────────────── */
const lufs = (f) => {
  const r = spawnSync('ffmpeg', ['-hide_banner', '-i', f, '-af', 'loudnorm=print_format=json', '-f', 'null', '-'], { encoding: 'utf8' });
  const m = /"input_i"\s*:\s*"(-?[\d.]+)"/.exec(r.stderr || ''); return m ? parseFloat(m[1]) : NaN;
};
const Lc = lufs(dst), Lw = lufs(WAV);
if (!isFinite(Lc) || !isFinite(Lw)) die('음량을 못 쟀다', 2);
const gain = +(Lc - Lw).toFixed(2);
console.log(`  음량 — 클립 ${Lc.toFixed(1)} LUFS · 새 wav ${Lw.toFixed(1)} → ${gain > 0 ? '+' : ''}${gain} dB 맞춤`);

/* ── 붙이기 ───────────────────────────────────────────────────────────────── */
const gapSec = +((c.sents[n - 2].after || 0) + (c.sents[n - 1].before || 0)).toFixed(3);
const tailSec = +(c.tail || 0.45).toFixed(3);
const tmp = fs.mkdtempSync('/tmp/pcs-');
const run = (a) => { const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...a], { encoding: 'utf8' });
  if (r.status !== 0) die('ffmpeg 실패: ' + String(r.stderr || '').slice(0, 120), 2); };

const head = path.join(tmp, 'head.wav');      // 기존 클립에서 **끝 무음을 뺀** 부분
run(['-i', dst, '-t', String(cur.tail.toFixed(3)), '-ar', '48000', '-ac', '1', head]);
const sil = path.join(tmp, 'gap.wav');
run(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(gapSec), sil]);
const tailW = path.join(tmp, 'tail.wav');
run(['-f', 'lavfi', '-i', 'anullsrc=r=48000:cl=mono', '-t', String(tailSec), tailW]);
/* 새 문장 — 앞뒤 무음을 깎고(0.03 남김) 음량을 맞춘다 */
const wseg = silences(WAV, wd);
const wh = (wseg.length && wseg[0][0] <= 0.05) ? Math.max(0, wseg[0][1] - 0.03) : 0;
const wt = (wseg.length && wseg[wseg.length - 1][1] >= wd - 0.06) ? Math.min(wd, wseg[wseg.length - 1][0] + 0.03) : wd;
const nw = path.join(tmp, 'new.wav');
run(['-i', WAV, '-ss', String(wh.toFixed(3)), '-to', String(wt.toFixed(3)),
  '-af', `volume=${gain}dB`, '-ar', '48000', '-ac', '1', nw]);

const lst = path.join(tmp, 'l.txt');
fs.writeFileSync(lst, [head, sil, nw, tailW].map((f) => `file '${f}'`).join('\n'));
const out = path.join(tmp, 'out.mp3');
const build = (g) => {
  run(['-i', WAV, '-ss', String(wh.toFixed(3)), '-to', String(wt.toFixed(3)),
    '-af', `volume=${g}dB`, '-ar', '48000', '-ac', '1', '-y', nw]);
  run(['-f', 'concat', '-safe', '0', '-i', lst, '-c:a', 'libmp3lame', '-b:a', '128k', '-ar', '44100', out]);
};
build(gain);
/* ★[LOUD_SETTLE] 한 번 되잰다 — 문장을 덧대면 클립 전체 음량이 내려간다(내용이 늘어서).
   그대로 두면 이 클립만 옆 클립보다 조용해진다. 결과를 재서 모자란 만큼 새 문장에만 얹는다.
   ★클립 전체를 다시 정규화하지 않는 이유는 위 머리말 그대로 — 검수 지난 부분을 안 건드린다. */
{
  const L1 = lufs(out), off = +(Lc - L1).toFixed(2);
  if (isFinite(L1) && Math.abs(off) > 0.3) {
    console.log(`  되잼 — 붙인 뒤 ${L1.toFixed(1)} LUFS · 목표 ${Lc.toFixed(1)} → 새 문장에 ${off > 0 ? '+' : ''}${off} dB 더`);
    build(+(gain + off).toFixed(2));
  }
}

/* ── ★자기 검사 — 붙인 것이 실제로 세어지는가 ─────────────────────────────── */
const after = heardOf(out);
console.log(`  붙인 뒤 ${after.d.toFixed(2)}s · 들리는 문장 ${after.heard}/${n}`);
if (after.heard !== n) {
  fs.rmSync(tmp, { recursive: true, force: true });
  die(`붙였는데 문장 수가 여전히 ${after.heard} 다 — 원본을 덮지 않는다`, 1);
}
const La = lufs(out);
console.log(`  붙인 뒤 음량 ${La.toFixed(1)} LUFS (전 ${Lc.toFixed(1)})`);

if (!WRITE) { fs.rmSync(tmp, { recursive: true, force: true }); console.log('  (--write 없음 · 원본 안 건드림)'); process.exit(0); }
fs.copyFileSync(out, dst);
fs.rmSync(tmp, { recursive: true, force: true });
console.log(`  ★썼다: ${path.relative(ROOT, dst)}`);
process.exit(0);
