// 「다시 받아야 할 것」을 성우별 파일로 만든다 [REDUB_BYVOICE]
//
//   node scripts/build-redub-byvoice.mjs           무엇이 몇 줄인지만 본다
//   node scripts/build-redub-byvoice.mjs --write   타입캐스트/다시받기/ 에 쓴다
//
// ★왜 — 2026-09-11 사장님: *"빼먹은게 없을때까지 반복해서 검토"*
//   5라운드에서 나왔다. 저장소의 재더빙 명단(재더빙_붙여넣기.txt)은 22줄인데
//   실제로 다시 받아야 할 것은 103줄이다. 배역 13클립이 그 명단에 «구조적으로» 안 잡힌다 —
//   그 명단은 check-text-audio(화면 글 ↔ 소리)가 만드는데, 편지·덕담·서약은 castLive 라
//   화면 글과 짝이 아니어서 그 대조에서 빠지기 때문이다(그 판단 자체는 옳다).
//   ★그대로 두면 다음 세션이 그 파일을 믿고 열세 클립을 통째로 빠뜨린다. 실제로 오늘 그럴 뻔했다.
//
// ★여기서는 «소리»를 기준으로 센다 — manifest(녹음하기로 한 글) ↔ _recorded.json(실제로 녹음된 글).
//   화면을 끼우지 않으므로 castLive 여부와 무관하다(scripts/audit/cast-text-audio.mjs 와 같은 자).
//
// ★성우로 자른다 — 파일 하나 = 화자 하나 = 타입캐스트에서 클릭 한 번.
// ★대장 차례 그대로 낸다 — 번호순이 아니다. 조립기가 그 차례로 자리를 매긴다.
// ★폐지·합성 클립은 빼고, «이미 맞는 소리가 있는» 클립도 뺀다.
//   실제로 김호인 38줄·서진 11줄이 그렇게 빠졌다 — 안 뺐으면 49줄을 헛되이 다시 받으실 뻔했다.
//
// ★종료 코드 0 정상 · 2 원천을 못 읽음
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const WRITE = process.argv.includes('--write');
const T = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const OUT = path.join(T, '다시받기');
const NAR = 'assets/audio/narration';
const pad2 = (n) => String(n).padStart(2, '0');
const norm = (s) => String(s || '').replace(/\s+/g, ' ').trim();

let man, cue, imp;
try {
  man = JSON.parse(fs.readFileSync(path.join(T, 'manifest.json'), 'utf8'));
  cue = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
  imp = fs.readFileSync(path.join(ROOT, 'scripts/build-typecast-import.mjs'), 'utf8');
} catch (e) { console.log('✗ 원천을 못 읽었다: ' + e.message); process.exit(2); }

const rb = /RETIRED\s*=\s*\{([\s\S]*?)\n\s*\};/.exec(cue);
const RETIRED = new Set(rb ? [...rb[1].matchAll(/'([^']+)'\s*:\s*1/g)].map((m) => m[1]) : []);
const vb = /const DEFAULT_VOICE = \{([\s\S]*?)\n\};/.exec(imp);
const VOICE = Object.fromEntries([...(vb ? vb[1] : '').matchAll(/^\s*([가-힣|]+):\s*'([^']+)'/gm)].map((m) => [m[1], m[2]]));

const rec = {};
for (const d of ['assets/audio/cast', NAR]) {
  try {
    const j = JSON.parse(fs.readFileSync(path.join(ROOT, d, '_recorded.json'), 'utf8'));
    for (const [k, v] of Object.entries(j.clips || {})) rec[d + '|' + k] = typeof v === 'string' ? v : v.text;
  } catch { /* 없으면 «아직 안 받음» */ }
}

const byVoice = new Map();
let clips = 0;
for (const c of man.clips) {                       // ★대장 차례 그대로 — 정렬하지 않는다
  if (c.mix || RETIRED.has(c.file)) continue;
  const key = pad2(c.no) + '_' + c.file;
  const said = rec[(c.dir || NAR) + '|' + key];
  if (said !== undefined && norm(said) === norm(c.sents.map((s) => s.text).join(' '))) continue;
  clips++;
  for (const s of c.sents) {
    const v = VOICE[s.role || c.role];
    if (!v) { console.log(`✗ 배역 '${s.role || c.role}' 의 성우를 모른다 (${key})`); process.exit(2); }
    if (!byVoice.has(v)) byVoice.set(v, []);
    byVoice.get(v).push({ clip: key, i: s.i, text: s.text });
  }
}
const rows = [...byVoice.entries()].sort((a, b) => b[1].length - a[1].length);
console.log(`다시 받아야 할 클립 ${clips}개 · 문장 ${rows.reduce((a, [, l]) => a + l.length, 0)}개`);
for (const [v, l] of rows) console.log(`  ${v.padEnd(6)} ${String(l.length).padStart(4)}줄  ${new Set(l.map((x) => x.clip)).size}클립`);
if (!clips) console.log('REDUB NONE — 다시 받을 것이 없다');
if (!WRITE) { console.log('\n(안 씀 · --write 로 실제 반영)'); process.exit(0); }

fs.mkdirSync(OUT, { recursive: true });
for (const f of fs.readdirSync(OUT)) fs.unlinkSync(path.join(OUT, f));
const order = {};
rows.forEach(([v, l], n) => {
  fs.writeFileSync(path.join(OUT, `${n + 1}_${v}.txt`), l.map((x) => x.text).join('\n') + '\n');
  order[v] = l.map((x, k) => ({ n: k + 1, clip: x.clip, i: x.i, text: x.text }));
});
fs.writeFileSync(path.join(OUT, '_순서.json'), JSON.stringify(order, null, 1));
fs.writeFileSync(path.join(OUT, 'README.md'),
  ['# 다시 받을 대본 (자동 생성 · 손으로 고치지 마세요)', '',
   '`node scripts/build-redub-byvoice.mjs --write` 가 만듭니다.', '',
   '★재더빙_붙여넣기.txt 와 다릅니다 — 그쪽은 «화면 글 ↔ 소리»만 보아 편지·덕담·서약(castLive)이',
   '  구조적으로 빠집니다. 이 폴더가 «소리 기준» 전부입니다.', '',
   '파일 하나 = 화자 하나입니다. 대장 차례 그대로이고, 되돌리는 표는 `_순서.json` 에 있습니다.', '',
   '| 파일 | 성우 | 줄 | 클립 |', '|---|---|---|---|',
   ...rows.map(([v, l], n) => `| ${n + 1}_${v}.txt | ${v} | ${l.length} | ${new Set(l.map((x) => x.clip)).size} |`),
  ].join('\n') + '\n');
console.log(`\n썼다: ${path.relative(ROOT, OUT)}/ · 파일 ${rows.length + 2}개`);
