#!/usr/bin/env node
/* ★[PHOTO_SCENE_1031 검토 173] «이 순간에 담을 수 있는 장면» 대표 그림 — 판 · 파일 점검.
   ★★[SCENE_PHOTO_1101 검토 181 · 사장님 «영상 캡처 말고 GPT 실사 · 무드 맞춰 · 1장»] 그림은 이제 영상에서 뽑지 않는다.
   원천 = assets/ritual-open.js PSCENE[*].img(사진 파일 이름 · 장면 id 꼴) · 사진은 assets/video/moments/scene/<이름>.webp(1280×720) · <이름>-640.webp(640×360).
   사진을 바꿀 때(오픈 전 실제 스튜디오 촬영본 등) = 같은 이름에 덮어쓰기 → SCENE_V(필요하면 SCENE_SRC_V) 올리기 → node scripts/build-scene-frames.mjs
   영상 VIDEO_V 가 바뀌어도 사진은 다시 뽑지 않는다(옛 판의 «영상 판 = 그림 판» 묶음은 걷었다).
   node scripts/build-scene-frames.mjs          # assets/video/moments/scene/_frames.json(사진 목록 · 판) 다시 쓰기 — 사진 파일은 건드리지 않는다
   node scripts/build-scene-frames.mjs --check  # 판 · 파일 2벌 · 크기 · 보류 0 · 남는 파일 없음(merge-guard)
   종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const OUT = path.join(ROOT, 'assets/video/moments/scene'), META = path.join(OUT, '_frames.json');
const SIZE = { '': [1280, 720], '-640': [640, 360] };
const want = {}; for (const [id, x] of Object.entries(O.PSCENE)) want[id] = x.img || null;
const base = [...new Set(Object.values(want).filter(Boolean))].sort();
/* ★[SCENE_EXTRA_195 검토 195] 여러 장(SCENE_N) — 2장째부터 <이름>-2 · <이름>-3 … 도 원천 사진이다 */
const files = base.flatMap((n) => { const c = Math.max(1, +(O.SCENE_N || {})[n] || 1), o = [n]; for (let i = 2; i <= c; i++) o.push(n + '-' + i); return o; });
/* webp 머리에서 가로 · 세로(VP8 · VP8L · VP8X) */
export function webpSize(f) { const b = fs.readFileSync(f).subarray(0, 40); if (b.toString('latin1', 0, 4) !== 'RIFF' || b.toString('latin1', 8, 12) !== 'WEBP') return null;
  const t = b.toString('latin1', 12, 16);
  if (t === 'VP8 ') return [b.readUInt16LE(26) & 0x3fff, b.readUInt16LE(28) & 0x3fff];
  if (t === 'VP8L') { const v = b.readUInt32LE(21); return [(v & 0x3fff) + 1, ((v >>> 14) & 0x3fff) + 1]; }
  if (t === 'VP8X') return [b.readUIntLE(24, 3) + 1, b.readUIntLE(27, 3) + 1];
  return null; }
const meta0 = () => ({ about: '[PHOTO_SCENE_1031 · SCENE_PHOTO_1101] 자동 생성 — node scripts/build-scene-frames.mjs · 손으로 고치지 않는다 · 그림 = 실사 사진(영상 프레임 아님)', v: O.SCENE_V, src: O.SCENE_SRC_V, photos: want, n: O.SCENE_N || {} });
if (process.argv.includes('--check')) {
  const bad = [];
  if (!/^photo/.test(O.SCENE_SRC_V)) bad.push(`SCENE_SRC_V 가 ${O.SCENE_SRC_V} — 그림 원천은 사진 판(photo…)이다 [SCENE_PHOTO_1101]`);
  const hold = Object.keys(want).filter((id) => !want[id]); if (hold.length) bad.push(`그림 보류(img null) ${hold.join(' · ')} — 지금은 19장 모두 사진이 있다`);
  for (const [id, n] of Object.entries(want)) if (n && n !== (id === 'letter:each' ? 'letter' : id.replace(/^_/, '').replace(':', '-'))) bad.push(`${id} — 파일 이름 ${n} 이 장면 id 꼴이 아니다(콜론 → 하이픈 · _close → close · letter:each 는 letter)`);
  for (const n of files) for (const [suf, [w, h]] of Object.entries(SIZE)) { const f = path.join(OUT, n + suf + '.webp');
    if (!fs.existsSync(f)) { bad.push(`scene/${n}${suf}.webp 없음`); continue; }
    const d = webpSize(f); if (!d || d[0] !== w || d[1] !== h) bad.push(`scene/${n}${suf}.webp 크기 ${d ? d.join('×') : '읽지 못함'} ≠ ${w}×${h}`); }
  const extra = fs.readdirSync(OUT).filter((f) => f.endsWith('.webp') && !files.includes(f.replace(/(-640)?\.webp$/, ''))); if (extra.length) bad.push(`원천에 없는 사진이 남아 있다: ${extra.join(' · ')}`);
  let meta = null; try { meta = JSON.parse(fs.readFileSync(META, 'utf8')); } catch { bad.push('scene/_frames.json 이 없다 — node scripts/build-scene-frames.mjs'); }
  if (meta && JSON.stringify(meta) !== JSON.stringify(meta0())) bad.push('_frames.json 이 원천(SCENE_V · SCENE_SRC_V · PSCENE.img)과 다르다 — node scripts/build-scene-frames.mjs');
  for (const b of bad) console.log('FAIL ' + b);
  if (bad.length) { console.log(`✗ PHOTO_SCENE 그림 ${bad.length}건`); process.exit(1); }
  console.log(`ok scene-frames — 사진 ${files.length}장(장면 ${Object.keys(want).length} · 보류 0) · 2벌(1280×720 · 640×360) · 판 ${O.SCENE_V} · 원천 ${O.SCENE_SRC_V}`); process.exit(0);
}
fs.writeFileSync(META, JSON.stringify(meta0(), null, 1) + '\n');
console.log(`썼다 — scene/_frames.json · 사진 ${files.length}장 · 판 ${O.SCENE_V}`);
