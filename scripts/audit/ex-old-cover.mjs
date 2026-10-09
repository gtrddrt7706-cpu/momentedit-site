// ★[EX_OLD_COVER 2026-10-07 사장님 «이 작업 이후로는 이런 문제 더 이상 없게 · 확실하게»]
//   예시 글(GUEST_EX · PV_EX)을 바꾸면 그 글로 이미 소리를 만든 고객이 있다. 옛 글을 EX_OLD_1006(하객 맞이) · PV_OLD(식전 영상 소개)에 남기지 않으면
//   그 고객은 «두 분이 쓴 글»로 읽혀 칩이 꺼지고 «예시로 바꿀까요? 지금 적어 둔 글은 지워져요»를 묻고(EX_OLD_IS_EX 전 실사고) 소리는 «글을 고쳤어요»가 된다.
//   그래서 origin/main 의 예시 글과 지금 판을 대조한다 — 바뀌거나 사라진 글은 옛 글 목록(같은 번호 · 같은 줄)에 있어야 한다. 브라우저가 없어도 돈다(CI 게이트).
//   종료 코드 0 = 통과 · 1 = 빠짐 · 2 = 재지 못함(origin/main 없음)
import fs from 'node:fs'; import path from 'node:path'; import { execSync } from 'node:child_process';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const FILE = 'order-preview.html';
const cur = fs.readFileSync(path.join(process.env.EXP_ROOT || ROOT, FILE), 'utf8');   /* EXP_ROOT = 돌연변이 검사용 다른 판 */
let base = '';
const BIG = { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'], maxBuffer: 64 * 1024 * 1024 };   /* 9천 줄 파일 — 기본 1MB 버퍼면 조용히 실패한다(실측) */
try { base = execSync('git show origin/main:' + FILE, BIG).toString(); }
catch { try { execSync('git fetch origin main', { cwd: ROOT, stdio: 'ignore' }); base = execSync('git show origin/main:' + FILE, BIG).toString(); } catch {} }   /* ★--depth 를 쓰지 말 것 — 온전한 저장소에 얕은 가지가 생겨 «unrelated histories»가 됐다(2026-10-07 실사고) */
if (!base) { console.log('못 쟀다 — origin/main 을 읽을 수 없다(EX_OLD_COVER)'); process.exit(2); }
/* 글만 뽑는다 — GUEST_EX 의 담백하게(예시 0)는 GUEST[i][2] 를 가리켜 글이 없으니 넷 중 1~3만 · PV_EX 는 넷 다 */
function pick(src, name) { const i = src.indexOf(name); if (i < 0) return null; const j = src.indexOf('\n];', i); return src.slice(i, j); }
function guest(src) { const blk = pick(src, 'var GUEST_EX=['); if (!blk) return null; const out = {}; const re = /\['([^']+)',\[((?:\s*"(?:[^"\\]|\\.)*",?)+)\s*\]\]/g; let m, n = 0;
  while ((m = re.exec(blk))) { n++; const texts = [...m[2].matchAll(/"((?:[^"\\]|\\.)*)"/g)].map((x) => x[1]); out[n] = { name: m[1], texts }; } return out; }
function entry(src) { const i = src.indexOf('var ENTRY={'); if (i < 0) return null; const blk = src.slice(i, src.indexOf('\n};', i)); const out = {};   /* [EX_STALE_DEPLOY 2026-10-09] 입장 인사 self 글(A~F) — 바뀌면 옛 글이 ENTRY_OLD 같은 글자에 있어야 한다 */
  for (const m of blk.matchAll(/\b([A-F]):\{d:"[^"]*",nar:"(?:[^"\\]|\\.)*",\s*self:"((?:[^"\\]|\\.)*)"\}/g)) out[m[1]] = m[2]; return Object.keys(out).length ? out : null; }
function pv(src) { const blk = pick(src, 'var PV_MAX=200, PV_EX=['); if (!blk) return null; return [...blk.matchAll(/\['([^']+)','((?:[^'\\]|\\.)*)'\]/g)].map((m) => ({ name: m[1], text: m[2] })); }
function oldMap(src, name) { const i = src.indexOf(name); if (i < 0) return null; let k = i + name.length, d = 0, q = false; const st = k;   /* 중괄호 짝으로 끝을 찾는다(문자열 안 괄호는 건너뛴다) — '};' 를 찾으면 뒷 함수까지 딸려 왔다(실측) */
  for (; k < src.length; k++) { const ch = src[k]; if (q) { if (ch === '\\') { k++; continue; } if (ch === '"') q = false; continue; } if (ch === '"') { q = true; continue; } if (ch === '{') d++; else if (ch === '}') { d--; if (d === 0) break; } }
  try { return JSON.parse(src.slice(st, k + 1)); } catch { return null; } }
const norm = (t) => String(t || '').replace(/\s+/g, '');
const gB = guest(base), gC = guest(cur), pB = pv(base), pC = pv(cur), gOld = oldMap(cur, 'var EX_OLD_1006='), pOld = oldMap(cur, 'var PV_OLD=');
const eB = entry(base), eC = entry(cur), eOld = oldMap(cur, 'var ENTRY_OLD=');
let fail = 0; const bad = (m) => { console.log('FAIL ' + m); fail++; };
if (!gB || !gC || !pB || !pC) bad('예시 글 블록을 못 읽었다 — GUEST_EX / PV_EX 모양이 바뀌었으면 이 검사도 같이 고친다');
if (!gOld) bad('EX_OLD_1006 을 못 읽었다'); if (!pOld) bad('PV_OLD 를 못 읽었다');
if (!eB || !eC) bad('입장 인사 ENTRY 블록을 못 읽었다 — 모양이 바뀌었으면 이 검사도 같이 고친다'); if (!eOld) bad('ENTRY_OLD 를 못 읽었다');
if (!fail) {
  for (const n of Object.keys(gB)) { const b = gB[n], c = gC[n]; if (!c) { bad(`하객 맞이 예시 ${n}(${b.name})이 사라졌다 — 옛 글 넷을 EX_OLD_1006["${n}"] 에 남기고 이 검사를 손봐야 한다`); continue; }
    b.texts.forEach((t, i) => { if (norm(t) === norm(c.texts[i])) return; const olds = [].concat(((gOld[n] || {})[String(i)]) || []);
      if (!olds.some((o) => norm(o) === norm(t))) bad(`하객 맞이 예시 ${n}(${c.name}) 줄 ${i + 1} 글이 바뀌었는데 옛 글이 EX_OLD_1006["${n}"]["${i}"] 에 없다 → «${t.slice(0, 24)}…»`); }); }
  pB.forEach((b, i) => { const c = pC[i]; if (!c) { bad(`식전 영상 소개 예시 ${i}(${b.name})가 사라졌다 — 옛 글을 PV_OLD["${i}"] 에 남긴다`); return; }
    if (norm(b.text) === norm(c.text)) return; const olds = [].concat(pOld[String(i)] || []);
    if (!olds.some((o) => norm(o) === norm(b.text))) bad(`식전 영상 소개 예시 ${i}(${c.name}) 글이 바뀌었는데 옛 글이 PV_OLD["${i}"] 에 없다 → «${b.text.slice(0, 24)}…»`); });
  Object.keys(eB).forEach((v) => { const c = eC[v]; if (c == null) { bad(`입장 인사 ${v}(${v})가 사라졌다 — 옛 글을 ENTRY_OLD["${v}"] 에 남긴다`); return; }
    if (norm(eB[v]) === norm(c)) return; const olds = [].concat(eOld[v] || []);
    if (!olds.some((o) => norm(o) === norm(eB[v]))) bad(`입장 인사 ${v} self 글이 바뀌었는데 옛 글이 ENTRY_OLD["${v}"] 에 없다 → «${eB[v].slice(0, 24)}…»`); });
  console.log(`비교 — 하객 맞이 예시 ${Object.keys(gB).length}×줄 · 식전 영상 소개 ${pB.length} · 입장 인사 ${Object.keys(eB).length} · 옛 글 목록 EX_OLD_1006 ${Object.keys(gOld).length} · PV_OLD ${Object.keys(pOld).length} · ENTRY_OLD ${Object.keys(eOld).length}`);
}
console.log(fail ? `\nEX OLD COVER FAIL ${fail}` : '\nEX OLD COVER OK — 바뀐 예시 글은 전부 옛 글 목록에 있다'); process.exit(fail ? 1 : 0);
