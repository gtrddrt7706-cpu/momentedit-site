/* ★★[GEN_FRESH 2026-09-13 점검] 녹음 대본 폴더가 «원천과 같은지» 대조한다.
 *
 * ── 왜 만드나 (오늘 실제로 당했다)
 *   build-voice-parts.mjs 가 [27] 시어머님이 생긴 날부터 `process.exit(2)` 로 멎어 있었다.
 *   멎은 생성기는 파일을 «지우지 않는다». 그래서 성우별/ 폴더는 9/12 판 그대로 남았고,
 *   그 사이 아버님 덕담 15줄 전면 개작·축배 마무리·혼주 편지가 하나도 안 들어갔다.
 *   그대로 붙여넣어 녹음하셨으면 옛 대본을 녹음하시게 된다.
 *   ★그런데 게이트는 «초록»이었다. 파일이 있는지·마커가 있는지는 보지만
 *     「언제 뽑혔는지」는 아무도 안 봤기 때문이다. 낡았는데 조용한 것이 제일 나쁘다.
 *
 *   같은 구멍을 장면 대본 6편에서는 어제 메웠다([STORY_STALE] · build-course-story.mjs --check).
 *   그쪽만 메우고 «녹음 대본 네 폴더»를 안 본 것이 이 사고다. 그래서 여기서 넷을 한꺼번에 건다.
 *
 * ── 어떻게 재나
 *   생성기는 결정적(같은 원천 → 같은 결과)이다. 그래서 실제로 돌려 보고 «파일이 달라지는지»를 본다.
 *   ★두 가지를 «둘 다» 실패로 센다 — 오늘 사고가 둘째 줄에서 났다.
 *     ① 다시 뽑았더니 내용이 달라졌다      = 커밋된 것이 낡았다
 *     ② 생성기가 0 이 아닌 값으로 끝났다   = 아예 안 뽑히고 있다(낡은 파일이 그대로 남는다)
 *   ★고쳐 놓지 않는다 — 재고 나서 원래대로 되돌린다. 「구멍은 보고만, 메움은 합의 후」.
 *     자동으로 덮어쓰면 사람이 «무엇이 언제 바뀌었는지» 모르는 채 커밋하게 된다.
 *
 * ── 종료코드 [CANT_LOOK]
 *   0 통과 · 1 낡았다/생성기가 죽었다 · 2 재지 못했다(폴더가 아예 없다·node 문제)
 *
 * 쓰기: node scripts/audit/gen-fresh.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);

/* 생성기 → 그것이 «쓰는» 폴더.
   ★★[LIST_SELF_CHECK] 이 목록은 손으로 적은 것이다 — 그러니 손 목록이 벌어지는 것까지 «검사»한다.
     첫 판을 만들자마자 타입캐스트/보이스찾기 를 빠뜨렸다(2026-09-13 실측). 손 목록은 반드시 벌어진다.
     그래서 아래 COVER_CHECK 가 scripts/build-*.mjs 가 실제로 쓰는 경로를 «스스로 긁어» 이 표와 맞댄다.
     빠진 것이 있으면 여기서 걸린다 — [AUDIT_RUN_ALL] 이 감사 목록에 한 것과 같은 수법이다.
   ★빼려면 KNOWN_OUT 에 «왜»와 함께 적는다. 조용히 빠지는 길은 없다. */
const GENS = [
  { gen: 'scripts/build-dubbing-script.mjs',  args: [],          dirs: ['docs/plans/식순연구/더빙_녹음_대본_최종.txt',
                                                                        'docs/plans/식순연구/더빙_녹음_대본_최종.md'] },
  { gen: 'scripts/build-typecast-import.mjs', args: ['--write'], dirs: ['docs/plans/식순연구/타입캐스트'] },
  { gen: 'scripts/build-voice-parts.mjs',     args: ['--write'], dirs: ['docs/plans/식순연구/타입캐스트/성우별'] },
  { gen: 'scripts/build-redub-byvoice.mjs',   args: ['--write'], dirs: ['docs/plans/식순연구/타입캐스트/다시받기'] },
  { gen: 'scripts/build-emotion-check.mjs',   args: [],          dirs: ['docs/plans/식순연구/감동구간_성우별',
                                                                        'docs/plans/식순연구/감동구간_확인판.txt'] },
];

/* 이 검사가 «일부러» 안 보는 경로 — 반드시 왜를 적는다. */
const KNOWN_OUT = {
  'docs/plans/식순연구': '장면 대본 6편은 [STORY_STALE](build-course-story.mjs --check)이 이미 대조한다. 두 번 재지 않는다',
  'docs/plans/식순연구/배역_예시_대사.txt': '생성물이 아니라 «사람이 쓰는 원천»이다. 다시 뽑을 것이 아니다',
  'docs/plans/식순연구/타입캐스트/manifest.json': '타입캐스트 폴더 안에 있어 이미 대조된다(같은 것을 두 번 적은 자리)',
  'docs/plans/식순연구/큐순서읽기_반영_20260920.tsv': '생성물이 아니라 «결정을 적은 표»다. build-pick-back 이 읽기만 한다 — 다시 뽑을 것이 없다',
  'docs/plans/식순연구/어조표_문면_대조.tsv': '위와 같다. 코워크가 보내 온 «그때의 결정»이라 사람만 고친다',
  'docs/plans/식순연구/타입캐스트/보이스찾기': '성우를 «고르던» 과정의 기록이다. 여덟 자리가 이미 정해져 다시 뽑을 일이 없고, 다시 뽑으면 그때의 후보 비교가 사라진다',
};

/* ★★[COVER_CHECK] 생성기들이 실제로 쓰는 경로를 스스로 긁어 위 표와 맞댄다. */
const listed = new Set(GENS.flatMap((g) => g.dirs));
const missed = [];
for (const f of fs.readdirSync(P('scripts')).filter((x) => /^build-.*\.mjs$/.test(x))) {
  const src = fs.readFileSync(P(path.join('scripts', f)), 'utf8');
  for (const m of src.matchAll(/'(docs\/plans\/식순연구[^']*)'/g)) {
    const rel = m[1];
    if (listed.has(rel) || KNOWN_OUT[rel]) continue;
    if (!missed.includes(rel)) missed.push(rel);
  }
}
if (missed.length) {
  console.log('[GEN_FRESH] ✗ 생성기가 쓰는데 이 검사가 «안 보는» 경로가 있다:');
  for (const r of missed) console.log(`    ${r}`);
  console.log('  → GENS 에 넣거나, 안 볼 것이면 KNOWN_OUT 에 «왜»를 적으세요. 조용히 빠지는 길은 없습니다.');
  process.exit(1);
}

/* 한 경로(파일이든 폴더든) 아래 모든 파일을 상대경로 → 내용으로 읽는다. */
function snap(rel) {
  const abs = P(rel);
  const out = new Map();
  if (!fs.existsSync(abs)) return out;
  const st = fs.statSync(abs);
  if (st.isFile()) { out.set(rel, fs.readFileSync(abs)); return out; }
  for (const name of fs.readdirSync(abs)) {
    const child = path.join(rel, name);
    if (fs.statSync(P(child)).isDirectory()) continue;   // 하위 폴더는 그 폴더의 생성기가 따로 본다
    out.set(child, fs.readFileSync(P(child)));
  }
  return out;
}
const restore = (m) => { for (const [rel, buf] of m) fs.writeFileSync(P(rel), buf); };

let fail = 0, cant = 0;
console.log('[GEN_FRESH] 녹음 대본 생성물이 원천과 같은지 — 다시 뽑아서 대조한다\n');

for (const { gen, args, dirs } of GENS) {
  const name = path.basename(gen);
  if (!fs.existsSync(P(gen))) { console.log(`  ?  ${name} — 생성기가 없다`); cant++; continue; }
  const before = new Map();
  for (const d of dirs) for (const [k, v] of snap(d)) before.set(k, v);
  if (!before.size) { console.log(`  ?  ${name} — 생성물이 하나도 없다 (${dirs.join(' · ')})`); cant++; continue; }

  let rc = 0, err = '';
  try { execFileSync(process.execPath, [P(gen), ...args], { cwd: ROOT, stdio: 'pipe' }); }
  catch (e) { rc = e.status ?? 1; err = String(e.stderr || e.stdout || '').trim().split('\n').slice(-2).join(' / '); }

  const after = new Map();
  for (const d of dirs) for (const [k, v] of snap(d)) after.set(k, v);

  /* 되돌린다 — 새로 생긴 파일은 지우고, 바뀐/사라진 파일은 원래 내용으로. */
  for (const k of after.keys()) if (!before.has(k)) fs.unlinkSync(P(k));
  restore(before);

  if (rc !== 0) {
    console.log(`  ✗  ${name} — 생성기가 ${rc} 로 끝났다. 그 폴더는 «옛 판이 그대로 남아 있다».`);
    if (err) console.log(`       ${err}`);
    console.log('       ★파일이 있다고 최신인 것이 아니다. 멎은 생성기는 낡은 파일을 지우지 않는다.');
    fail++; continue;
  }
  const changed = [...after.keys()].filter((k) => !before.has(k) || !before.get(k).equals(after.get(k)));
  const gone = [...before.keys()].filter((k) => !after.has(k));
  if (changed.length || gone.length) {
    console.log(`  ✗  ${name} — 커밋된 생성물이 낡았다 (${changed.length + gone.length}개)`);
    for (const k of [...changed, ...gone].slice(0, 8)) console.log(`       ${k}`);
    console.log(`       → node ${gen} ${args.join(' ')} 로 다시 뽑고 그 커밋에 함께 넣으세요.`);
    fail++; continue;
  }
  console.log(`  ok ${name.padEnd(28)} ${before.size}개 파일이 원천과 같다`);
}

console.log();
if (fail) { console.log(`[GEN_FRESH] ✗ ${fail}개 생성물이 낡았거나 안 뽑히고 있다`); process.exit(1); }
if (cant) { console.log(`[GEN_FRESH] ? ${cant}개를 재지 못했다 — «통과»가 아니다`); process.exit(2); }
console.log('[GEN_FRESH] ok — 녹음 대본 생성물 전부가 원천과 같다');
