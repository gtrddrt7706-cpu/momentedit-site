// 배역 대사와 «실제로 녹음된 글»을 전수 대조한다 [CAST_SAID]
//
//   node scripts/audit/cast-text-audio.mjs
//
// ★왜 — 2026-09-09. 배역 문안 13클립을 고쳤는데 check-text-audio 는 어긋남 1건만 냈다.
//   그 검사는 «화면 글 ↔ 소리»를 본다. 그런데 편지·덕담·서약 같은 배역 클립은 castLive 라
//   화면 글과 짝이 아니어서 «일부러» 대조에서 빠져 있다(그 판단 자체는 옳다).
//   그 결과 배역 대사만 바꾸면 소리가 옛말인 채로 아무도 안 보는 구간이 생긴다.
//   실제로 이겸(신랑) mp3 5개가 그 상태였다 — 붉은 데가 없어 «다 됐다»로 보였다.
//
// ★여기서는 화면을 끼우지 않는다. manifest(녹음하기로 한 글) ↔ _recorded.json(실제로 녹음된 글)
//   둘만 맞댄다. 짝이 확실해 castLive 여부와 무관하게 볼 수 있다.
//
// ★소리가 «아직 없는» 것은 어긋남이 아니다 — 아직 안 받은 것뿐이다. 따로 센다.
//
// ★종료 코드 0 다 맞음 · 1 어긋남 · 2 파일을 못 읽음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const pad2 = (n) => String(n).padStart(2, '0');
let man, rec = {};
try {
  man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
} catch { console.log('✗ manifest.json 을 못 읽었다'); process.exit(2); }
for (const d of ['assets/audio/cast', 'assets/audio/narration']) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, d, '_recorded.json'), 'utf8'));
    for (const [k, v] of Object.entries(j.clips || {})) rec[d + '|' + k] = typeof v === 'string' ? v : v.text;
  } catch { /* 없으면 «아직 안 받음»으로 떨어진다 */ }
}
const NAR = 'assets/audio/narration';
/* ★폐지한 클립은 세지 않는다 — 식장에서 안 나가는 소리다. 정본은 ritual-cue.js 의 RETIRED.
   넣어 두면 영영 못 고치는 빨강이 되어, 진짜 어긋남이 그 속에 묻힌다. */
const cue = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
const rb = /RETIRED\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(cue);
const RETIRED = new Set(rb ? [...rb[1].matchAll(/'([^']+)'\s*:\s*1/g)].map((m) => m[1]) : []);
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

let ok = 0, none = 0;
const bad = [];
for (const c of man.clips) {
  if (c.mix) continue;                                   // 합성은 재료로 판정한다
  if (RETIRED.has(c.file)) continue;                     // 폐지한 자리는 안 나간다
  const dir = c.dir || NAR;
  const key = pad2(c.no) + '_' + c.file;
  const said = rec[dir + '|' + key];
  const want = norm(c.sents.map((s) => s.text).join(' '));
  if (said === undefined) { none++; continue; }
  if (norm(said) === want) { ok++; continue; }
  bad.push({ key, role: c.role, want, said: norm(said) });
}
console.log(`대장 ${man.clips.length}클립 — 맞음 ${ok} · 어긋남 ${bad.length} · 아직 소리 없음 ${none}`);
if (!bad.length) { console.log('CAST SAID OK — 받은 소리는 전부 지금 글과 같다'); process.exit(0); }
console.log('\n소리가 옛 글인 클립 — 그 자리는 다시 받아야 합니다:');
for (const b of bad) {
  console.log(`\n  ✗ ${b.key}  (${b.role})`);
  console.log(`    지금 글 «${b.want.slice(0, 70)}${b.want.length > 70 ? '…' : ''}»`);
  console.log(`    녹음된 글 «${b.said.slice(0, 70)}${b.said.length > 70 ? '…' : ''}»`);
}
process.exit(1);
