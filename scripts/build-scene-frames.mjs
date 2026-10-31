#!/usr/bin/env node
/* ★[PHOTO_SCENE_1031 검토 173] «이 순간에 담을 수 있는 장면» 대표 그림 — 장면 영상(assets/video/moments/*.mp4 · 1025e)의 한 장면을 webp 로 뽑는다.
   원천 = assets/ritual-open.js PSCENE[*].img([영상 이름, 초]) · 제목 글씨가 사라진 초(눈으로 골랐다 · 대부분 6초 근처).
   node scripts/build-scene-frames.mjs          # 뽑기(1280 · 640) + assets/video/moments/scene/_frames.json
   node scripts/build-scene-frames.mjs --check  # 파일 · 판(SCENE_V) · 영상 판(VIDEO_V ↔ SCENE_SRC_V) · 초가 원천과 같은가(merge-guard)
   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { execFileSync } from 'node:child_process'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const DIR = path.join(ROOT, 'assets/video/moments'), OUT = path.join(DIR, 'scene'), META = path.join(OUT, '_frames.json');
const want = {}; for (const [id, x] of Object.entries(O.PSCENE)) { if (!x.img) continue; const n = id.replace(/:.*/, ''); want[n] = { from: x.img[0], at: x.img[1] }; }
const vv = ((fs.readFileSync(path.join(ROOT, 'assets/ritual-open.js'), 'utf8').match(/var VIDEO_V = '\?v=([^']+)'/) || [])[1] || '');   // 장면 영상 판(ritual-open VIDEO_V)
if (process.argv.includes('--check')) {
  const bad = [];
  if (vv !== O.SCENE_SRC_V) bad.push(`장면 영상 판이 ${vv} 인데 그림은 ${O.SCENE_SRC_V} 에서 뽑았다 — 다시 뽑고(node scripts/build-scene-frames.mjs) SCENE_SRC_V · SCENE_V 를 올린다`);
  let meta = null; try { meta = JSON.parse(fs.readFileSync(META, 'utf8')); } catch { bad.push('scene/_frames.json 이 없다 — node scripts/build-scene-frames.mjs'); }
  if (meta) {
    if (meta.v !== O.SCENE_V || meta.src !== O.SCENE_SRC_V) bad.push(`_frames.json 판 ${meta.v}/${meta.src} ≠ 원천 ${O.SCENE_V}/${O.SCENE_SRC_V}`);
    for (const [n, w] of Object.entries(want)) {
      const m = meta.frames && meta.frames[n];
      if (!m || m.from !== w.from || m.at !== w.at) bad.push(`${n} — 원천 ${w.from} ${w.at}초 ≠ 뽑은 ${m ? m.from + ' ' + m.at + '초' : '없음'}`);
      for (const f of [n + '.webp', n + '-640.webp']) if (!fs.existsSync(path.join(OUT, f))) bad.push(`scene/${f} 없음`);
    }
    for (const n of Object.keys(meta.frames || {})) if (!want[n]) bad.push(`${n} — 원천에 없는 그림이 남아 있다(지우고 다시 뽑기)`);
  }
  for (const b of bad) console.log('FAIL ' + b);
  if (bad.length) { console.log(`✗ PHOTO_SCENE_1031 그림 ${bad.length}건`); process.exit(1); }
  console.log(`ok scene-frames — 그림 ${Object.keys(want).length}장 · 판 ${O.SCENE_V} · 영상 ${O.SCENE_SRC_V}`); process.exit(0);
}
fs.mkdirSync(OUT, { recursive: true });
const frames = {};
for (const [n, w] of Object.entries(want)) {
  const src = path.join(DIR, w.from + '.mp4');
  for (const [suf, wpx, q] of [['', 1280, 80], ['-640', 640, 78]]) {
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(w.at), '-i', src, '-frames:v', '1', '-vf', `scale=${wpx}:-2`, '-c:v', 'libwebp', '-quality', String(q), path.join(OUT, n + suf + '.webp')]);
  }
  frames[n] = { from: w.from, at: w.at };
}
fs.writeFileSync(META, JSON.stringify({ about: '[PHOTO_SCENE_1031] 자동 생성 — node scripts/build-scene-frames.mjs · 손으로 고치지 않는다', v: O.SCENE_V, src: O.SCENE_SRC_V, frames }, null, 1) + '\n');
console.log(`뽑음 — ${Object.keys(frames).length}장 → assets/video/moments/scene/`);
