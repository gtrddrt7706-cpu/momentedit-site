/* ★★[PAR_RERECORD 2026-09-19 사장님 결정 — 갈래 1 「소리를 화면에 맞춘다」]
 *
 * 어른께 드리는 편지의 «다시 받을 문장»과 «새 차례»를 화면에서 뽑아 타입캐스트 붙여넣기 파일로 낸다.
 *
 * ── 왜 생성기인가 (손으로 적으면 안 되는 이유)
 *   문장을 손으로 옮겨 적는 순간 화면·소리에 이어 «세 번째 벌»이 생긴다. 이 저장소가 계속 싸워 온 병이다.
 *   실제로 이 건의 지시문 두 벌이 재녹음 수를 7과 9로 다르게 적고 있었다(2026-09-19).
 *   ★7이 틀렸다 — 장 번호는 「하나, 인원을 절제하는 이유.」처럼 **번호와 제목이 한 문장**이라,
 *     차례를 바꾸면 그 두 자리의 «글»이 바뀐다. 창고 규칙 [SRC_STALE] 이 「글이 바뀌면 다시 받아야 한다」이므로
 *     재조립만으로는 안 된다. 창고 39자리를 전수로 뒤져 새 두 문장이 없음을 확인했다.
 *     ★글자 수는 31 → 31 로 같아 **길이는 안 변한다** — 늘어나는 36초는 온전히 새 7문장 몫이다.
 *
 * ── 새 차례는 화면이 정한다
 *   [PAR_ORDER 2026-09-12] 「갖출 것은 갖춘 예식」이 먼저다. 장 번호 낭독은 화면 <h2> 순서에 번호를 붙여 짓는다.
 *
 * ── 내는 것
 *   재더빙_혼주편지_<날짜>.txt        타입캐스트에 통째로 붙여넣을 것(머리말 한 줄도 없다 · PASTE_NO_COMMENT)
 *   재더빙_혼주편지_<날짜>_명단.txt   사람이 읽을 것 — 새 46문장 차례에서 어디에 들어가는지
 *
 * ── 종료코드 [CANT_LOOK]  0 냈다 · 1 원천이 어긋났다 · 2 재지 못함
 * 쓰기: node scripts/make-parents-rerecord.mjs [--date 20260919]
 *       node scripts/make-parents-rerecord.mjs --check   ← 아무것도 쓰지 않고 원천만 대조(게이트용)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const P = (r) => path.join(ROOT, r);
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d; };
const DATE = arg('--date', '20260919');
const VOICE = '우성';
const ORD = ['하나', '둘', '셋', '넷'];

let man, html, wait;
try {
  man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  html = fs.readFileSync(P('parents.html'), 'utf8');
  wait = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/parents-letter-대기.json'), 'utf8'));
} catch (e) { console.log(`[PAR_RERECORD] ? 원천을 못 읽었다 — ${e.message}`); process.exit(2); }

const clip = (man.clips || []).find((c) => c.file === 'parents-letter');
if (!clip) { console.log('[PAR_RERECORD] ? 대장에 parents-letter 가 없다'); process.exit(2); }
const soundSet = new Set(clip.sents.map((s) => s.text));

/* ── 화면을 장별로 가른다 ─────────────────────────────────────────────────── */
const OPEN = '<div class="letter" id="letter">';
const at = html.indexOf(OPEN);
if (at < 0) { console.log('[PAR_RERECORD] ? 편지 본문을 못 찾았다'); process.exit(2); }
let depth = 0, cur = at;
for (;;) {
  const m = /<\/?div\b/.exec(html.slice(cur));
  if (!m) break;
  const abs = cur + m.index;
  depth += html.startsWith('</div', abs) ? -1 : 1;
  cur = abs + m[0].length;
  if (depth === 0) break;
}
const body = html.slice(at, cur);
const strip = (x) => x.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·')
  .replace(/&amp;/g, '&').replace(/\s+/g, ' ').trim();
const sentsOf = (chunk) => {
  const out = [];
  for (const m of chunk.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
    const t = strip(m[1]);
    if (!t) continue;
    for (const s of t.split(/(?<=\.)\s+/)) if (s.trim()) out.push(s.trim());
  }
  return out;
};
/* <h2> 가 장을 가른다 — 앞은 머리말, 뒤는 그 장의 본문 */
const parts = body.split(/<h2[^>]*>[\s\S]*?<\/h2>/);
const titles = [...body.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1]));
if (titles.length !== 4 || parts.length !== 5) {
  console.log(`[PAR_RERECORD] ? 장을 못 갈랐다 — 제목 ${titles.length} · 덩이 ${parts.length}`); process.exit(2);
}

/* ── 새 대본 46문장을 짓는다 ─────────────────────────────────────────────── */
const target = [];
for (const t of sentsOf(parts[0])) target.push(t);                 // 머리말 7
titles.forEach((title, i) => {
  target.push(`${ORD[i]}, ${title}.`);                             // 장 번호 낭독 — 화면 차례가 정한다
  for (const t of sentsOf(parts[i + 1])) target.push(t);
});
/* 낭독 맺음 — 화면엔 없다. 지금 소리에 있는 것을 그대로 쓴다(모양으로 짚는다) */
for (const s of clip.sents) if (/^두 분 어른께,|올림\.$/.test(s.text)) target.push(s.text);

/* ── 다시 받을 것 = 지금 소리에 없는 것 ───────────────────────────────────── */
const need = target.filter((t) => !soundSet.has(t));
const pend = new Set(wait.pending_sents || []);
const unexpected = need.filter((t) => !pend.has(t) && !/^(하나|둘|셋|넷),\s/.test(t));
if (unexpected.length) {
  console.log(`[PAR_RERECORD] ✗ 대기함에 없는 새 문장 ${unexpected.length}개 — 대기 파일이 안 따라왔다:`);
  for (const t of unexpected) console.log(`    ${t}`);
  process.exit(1);
}

const CHECK = process.argv.includes('--check');
if (CHECK) {
  console.log(`[PAR_RERECORD] ok — 새 대본 ${target.length}문장 · 다시 받을 것 ${need.length}문장 (아무것도 쓰지 않았다)`);
  process.exit(0);
}
const DIR = 'docs/plans/식순연구/타입캐스트';
const pasteF = `${DIR}/재더빙_혼주편지_${DATE}.txt`;
const listF = `${DIR}/재더빙_혼주편지_${DATE}_명단.txt`;
fs.writeFileSync(P(pasteF), need.map((t) => `${VOICE}: ${t}`).join('\n') + '\n', 'utf8');

const L = [];
L.push(`# [PAR_RERECORD] 어른께 드리는 안내 — 다시 받을 ${need.length}문장 (${DATE})`);
L.push(`# 붙여넣을 파일은 옆 「재더빙_혼주편지_${DATE}.txt」 — 머리말 한 줄도 없습니다.`);
L.push(`# 타입캐스트 「대본 가져오기 → 텍스트 붙여넣기」에 통째로 넣고, 다운로드는 반드시 «문장별 분리»로.`);
L.push(`# 화자 1인 — ${VOICE}. 지금 39문장을 읽은 그 성우입니다.`);
L.push('#');
L.push(`# 새 대본은 ${target.length}문장입니다(지금 ${clip.sents.length}문장). 아래 [N] 은 새 차례에서의 자리입니다.`);
L.push(`# ★장 번호 두 줄은 번호와 제목이 한 문장이라 재조립으로는 안 됩니다 — 글이 바뀌므로 다시 받습니다.`);
L.push('');
need.forEach((t, k) => {
  const at2 = target.indexOf(t);
  const why = /^(하나|둘|셋|넷),\s/.test(t) ? '장 번호 — 차례가 바뀌어 글이 달라졌다'
    : (wait.pending_sents || []).includes(t) ? '화면에만 있던 문장' : '새 문장';
  L.push(`[${k + 1}] ${VOICE}: ${t}`);
  L.push(`     → 새 대본 ${at2 + 1}번째 자리 · ${why}`);
});
L.push('');
L.push('# ── 새 대본 전문 (받은 뒤 이 차례로 다시 붙입니다) ──');
target.forEach((t, i) => L.push(`${String(i + 1).padStart(2, ' ')}  ${soundSet.has(t) ? '   ' : '★새'} ${t}`));
fs.writeFileSync(P(listF), L.join('\n') + '\n', 'utf8');

console.log(`[PAR_RERECORD] 새 대본 ${target.length}문장 · 다시 받을 것 ${need.length}문장`);
console.log(`  장 차례: ${titles.join(' → ')}`);
for (const t of need) console.log(`   ★ ${t}`);
console.log(`  → ${pasteF}`);
console.log(`  → ${listF}`);
