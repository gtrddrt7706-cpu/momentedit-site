// 판정 화면이 낸 한 덩어리를 읽어 **무엇을 어떻게 할지**로 가른다 [REDUB_PICK_APPLY]
//
//   node scripts/apply-redub-pick.mjs --in <붙여넣은글.txt> [--plan <나올.json>]
//
// ★왜 만드나 — 2026-08-17 사용자
//   *"그 바꿈 체크하면 나중에 복사 한번에 너한테 전달되어 너가 바꿔줄 수 있게 반자동으로 만들어"*
//   판정 화면(build-redub-pick.mjs)이 낸 글을 사람이 다시 옮겨 적으면 그 자리에서 틀린다.
//   이 저장소가 붙여넣기 파일을 손으로 써서 화자를 틀린 것이 바로 그저께다(PHOTO_ASK).
//
// ★★[DROP_GUARD 2026-08-17 사용자 지시]
//   *"버림으로 체크해도 이 부분의 안내가 없으면 안 된다고 판단이 들면 너가 같이 적은 이유를 보고
//     적절한 문장으로 변경 적용하자"*
//
//   ── 무엇이 문제인가
//   「버림」은 **클립을 지운다**는 뜻이지 **식순에서 그 순서를 없앤다**는 뜻이 아니다. 둘은 다르다.
//   엔진이 부르는 자리(cue.file · 배역 · 상황극 · 촬영 신호)에서 클립만 지우면 그 큐는
//   **소리 없는 큐**가 된다 — 식장에서는 「아무 안내 없이 다음이 시작되는 자리」다.
//   글로는 아무 데도 안 걸린다. 걸리는 건 나중에 [NOAUDIO_REAL] 게이트이고, 그때는 이미
//   문안을 다시 짓고 소리를 다시 받아야 한다(되돌리기 비싼 쪽).
//
//   ── 그래서 기계가 먼저 가른다 (사람의 판단을 대신하지 않는다)
//   ① **비울 수 없는 자리** — 엔진이 부른다. 「버림」을 그대로 받으면 안 된다.
//      길은 둘뿐이다:
//        ㉮ 큐까지 폐지한다 = 식순에서 그 순서를 없앤다. 이건 별개의 결정이고 별개의 커밋이다
//           (WINE_RETIRED · SONG_RETIRED 처럼 `assets/ritual-cue.js` 의 RETIRED 에 근거를 적는다).
//        ㉯ **문안을 바꿔 남긴다.** 사용자가 적은 이유를 읽고 새 문장을 지어 「바꿈」으로 돌린다.
//      ★기본은 ㉯다. ㉮는 사용자가 「이 순서 자체를 없앤다」고 말했을 때만이다.
//   ② **비워도 되는 자리** — 엔진이 안 부른다(폐지·폴백·콘솔에서 손으로 고르는 판).
//      「버림」을 그대로 받는다. 이 검사는 여기서 아무 말도 얹지 않는다.
//
//   ★기계는 «비울 수 없다»까지만 말한다. **어떤 문장으로 바꿀지는 사람이 쓴다** — 이유를 읽고
//     내가 짓고, 사용자에게 확인을 받는다. 문안은 되돌리기 싼 변경이지만 그 뒤에 붙는
//     «소리를 다시 받는 일»은 싸지 않다.
//
// ★엔진이 부르는 자리는 scripts/lib/engine-calls.mjs 한 곳에서만 센다 [ENGINE_CALLS].
//   여기서 다시 세면 check-listen-cover 와 답이 갈리고, 갈린 날 사람은 이쪽 말을 믿는다.
//
// ★어조(N 줄)는 자리를 비우지 않는다 — 아직 조립 전 문장이라 버려도 **기존 클립이 그대로 남는다.**
//   그래서 [DROP_GUARD] 를 걸지 않는다. 대신 한 클립의 문장이 전부 버림이면 «그 재더빙이 통째로
//   없어진다»고 적는다 — 원해서 그런 것인지 사람이 보게.
//
// ★종료 코드 [CANT_LOOK] 0 읽었다 · 1 형식이 깨졌거나 모르는 자리가 있다 · 2 재지 못함
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { dropGuard } from './lib/drop-guard.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const arg = (k, d) => { const i = process.argv.indexOf(k); return i >= 0 ? process.argv[i + 1] : d; };
const IN = arg('--in', ''), PLAN = arg('--plan', '');
const die = (m, c = 2) => { console.error('✗ ' + m); process.exit(c); };
if (!IN) die('--in <붙여넣은글.txt> 가 필요하다', 2);
if (!fs.existsSync(IN)) die(`${IN} 이 없다`, 2);

const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const ORDER = JSON.parse(fs.readFileSync(path.join(DIR, '더빙_한번에_순서.json'), 'utf8'));
const lines0 = fs.readFileSync(path.join(DIR, '더빙_한번에.txt'), 'utf8').split('\n').filter((l) => l.trim());
const CLIP = new Map(man.clips.map((c) => [`${c.no}_${c.file}`, c]));
const SLUG = new Map(ORDER.클립.map((c) => [c.slug, c]));
const G = dropGuard();

/* ── 원천 찾기 — 문안은 결국 여기서 고쳐야 한다 ─────────────────────────────
   `더빙_녹음_대본_최종.txt` 도 `manifest.json` 도 자동생성물이다. 맨 위는 assets 의 두 파일이다
   (실측: 대장 343문장 중 233이 ritual-data.js · 110이 ritual-cue.js 에 있다).
   ★자동생성물을 손으로 고치면 다음 생성 때 조용히 되돌아간다 — 이 저장소의 오랜 금지 사항. */
const SRC_FILES = ['assets/ritual-data.js', 'assets/ritual-cue.js'];
const SRC = SRC_FILES.map((f) => ({ f, L: fs.readFileSync(path.join(ROOT, f), 'utf8').split('\n') }));
const findSrc = (text) => {
  const t = String(text || '').trim();
  if (!t) return [];
  const out = [];
  for (const { f, L } of SRC) L.forEach((l, i) => { if (l.includes(t)) out.push(`${f}:${i + 1}`); });
  return out;
};

/* ── 파싱 — 꼴이 조금이라도 다르면 «조용히 넘기지» 않고 붉는다 [PICK_PARSE] ──── */
const raw = fs.readFileSync(IN, 'utf8').split('\n');
const VERDICTS = ['버림', '다시', '바꿈', '그대로'];
const err = [];
let started = false, ended = false, missing = 0;
const items = [];
let cur = null;
raw.forEach((ln, i) => {
  const n = i + 1, s = ln.trim();
  if (!s) return;
  if (/^### REDUB_PICK/.test(s)) { started = true; return; }
  if (/^### END/.test(s)) { ended = true; const m = s.match(/안 정한 것\s*(\d+)/); if (m) missing = +m[1]; return; }
  if (!started) return;                      // 머리글 앞의 잡담은 버린다(메일·메신저로 오면 붙는다)
  if (ended) return;
  const mo = s.match(/^O\s+(\S+)\s*=\s*(.+)$/);
  const mn = s.match(/^N\s+(\S+)\s+#(\d+)\s*=\s*(.+)$/);
  if (mo || mn) {
    const v = (mo ? mo[2] : mn[3]).trim();
    if (v === '(안 정함)') { cur = null; items.push({ kind: mo ? 'O' : 'N', key: mo ? mo[1] : `${mn[1]} #${mn[2]}`, v: '', line: n }); return; }
    if (!VERDICTS.includes(v)) { err.push(`${n}줄: 모르는 판정 「${v}」 — ${VERDICTS.join('·')} 중 하나여야 한다`); cur = null; return; }
    cur = mo
      ? { kind: 'O', id: mo[1], v, line: n, why: '', now: [], next: [] }
      : { kind: 'N', slug: mn[1], no: +mn[2], v, line: n, why: '', now: [], next: [] };
    items.push(cur);
    return;
  }
  if (!cur) { err.push(`${n}줄: 어느 자리에 붙는 줄인지 모르겠다 — 「${s.slice(0, 30)}」`); return; }
  if (s.startsWith('#')) { cur.why = s.slice(1).trim(); return; }
  if (s.startsWith('<')) { cur.now.push(s.slice(1).trim()); return; }
  if (s.startsWith('>')) { cur.next.push(s.slice(1).trim()); return; }
  err.push(`${n}줄: 모르는 꼴 — 「${s.slice(0, 30)}」`);
});
if (!started) die('「### REDUB_PICK」 로 시작하는 덩어리가 아니다 — 판정 화면의 「결과 만들기」로 나온 글을 통째로 넣어라', 1);
if (!ended) err.push('「### END」 가 없다 — 덩어리가 잘렸다. 전부 복사했는지 보라');

/* 모르는 자리는 조용히 넘기지 않는다 — 넘기면 그 자리는 아무도 다시 안 본다 */
for (const it of items) {
  if (it.kind === 'O' && it.id && !CLIP.has(it.id)) err.push(`${it.line}줄: 대장에 없는 클립 「${it.id}」`);
  if (it.kind === 'N' && it.slug && !SLUG.has(it.slug)) err.push(`${it.line}줄: 어조 목록에 없는 슬러그 「${it.slug}」`);
  if (it.kind === 'N' && it.no && !lines0[it.no - 1]) err.push(`${it.line}줄: 더빙_한번에.txt 에 ${it.no}줄이 없다`);
}
if (err.length) { err.forEach((e) => console.error('✗ ' + e)); die(`형식이 깨졌다 — ${err.length}곳`, 1); }

const decided = items.filter((x) => x.v);
const tally = {};
decided.forEach((x) => { tally[x.v] = (tally[x.v] || 0) + 1; });
console.log(`── 판정 ${decided.length}개 읽음 (안 정한 것 ${items.length - decided.length}개`
  + (missing && missing !== items.length - decided.length ? ` · 화면은 ${missing}개라 함` : '') + ')');
console.log('   ' + VERDICTS.map((v) => `${v} ${tally[v] || 0}`).join(' · '));

/* ── ★[DROP_GUARD] 「버림」을 두 갈래로 가른다 ────────────────────────────── */
const dropOld = decided.filter((x) => x.kind === 'O' && x.v === '버림');
const cantEmpty = [], mayEmpty = [], askEmpty = [];
for (const x of dropOld) {
  const c = CLIP.get(x.id);
  const now = (c.sents || []).map((s) => String(s.text).trim());
  const g = G.of(x.id);
  const row = { id: x.id, 라벨: c.label || c.file, 화자: (man.voice || {})[c.role] || c.role,
    종류: g.kind, 까닭: g.why, 이유: x.why || '', 지금글: now, 원천: [...new Set(now.flatMap(findSrc))] };
  (g.empty === false ? cantEmpty : g.empty === true ? mayEmpty : askEmpty).push(row);
}

const showRow = (mark, r) => {
  console.log(`  ${mark} ${r.id} · ${r.라벨} (${r.종류} · ${r.화자})`);
  console.log(`     ${r.까닭}`);
  console.log(`     이유 — ${r.이유 || '(안 적음 · 새 문안을 지으려면 물어야 한다)'}`);
  r.지금글.forEach((t) => console.log(`     지금 "${t}"`));
  console.log(`     원천 ${r.원천.length ? r.원천.join(' · ') : '(못 찾음 — 손으로 찾아야 한다)'}`);
};

console.log(`\n── ★비울 수 없는 자리 ${cantEmpty.length}개 [DROP_GUARD]`);
if (!cantEmpty.length) console.log('   ✓ 없음');
cantEmpty.forEach((r) => showRow('★', r));
if (cantEmpty.length) console.log(
  '\n   ↑ 이 자리를 그냥 비우면 식장에서 **아무 안내 없이 다음이 시작된다.**\n'
  + '     길은 둘뿐 — ㉮ 식순에서 그 순서를 없앤다(별개의 결정 · RETIRED 에 근거를 적는다)\n'
  + '                ㉯ 이유를 읽고 새 문장을 지어 「바꿈」으로 돌린다  ← 기본');

/* ★null 을 «괜찮다»로 접지 않는다 — 폴백·런타임 조건은 엔진 밖에서 나간다 */
console.log(`\n── 확인이 필요한 자리 ${askEmpty.length}개 (엔진은 안 부르지만 나갈 길이 있을 수 있다)`);
if (!askEmpty.length) console.log('   ✓ 없음');
askEmpty.forEach((r) => showRow('?', r));

console.log(`\n── 비워도 되는 자리 ${mayEmpty.length}개 (이미 폐지해 식장에서 안 난다)`);
if (!mayEmpty.length) console.log('   · 없음');
for (const r of mayEmpty) console.log(`  · ${r.id} · ${r.라벨} — ${r.이유 || '(이유 없음)'}`);

/* ── 「바꿈」 — 원천을 어디서 고치나 ──────────────────────────────────────── */
const edits = decided.filter((x) => x.v === '바꿈').map((x) => {
  const c = x.kind === 'O' ? CLIP.get(x.id) : null;
  const now = x.now.length ? x.now
    : (c ? (c.sents || []).map((s) => String(s.text).trim()) : [String(lines0[x.no - 1] || '').split(':').slice(1).join(':').trim()]);
  return { 자리: x.kind === 'O' ? x.id : `${x.slug} #${x.no}`, 갈래: x.kind === 'O' ? '기존 클립' : '어조 문장',
    이유: x.why || '', 지금글: now, 바꿀글: x.next, 원천: [...new Set(now.flatMap(findSrc))],
    같은가: JSON.stringify(now) === JSON.stringify(x.next) };
});
console.log(`\n── 글 바꿈 ${edits.length}개`);
for (const e of edits) {
  console.log(`  · ${e.자리} (${e.갈래})${e.같은가 ? '  ※글이 안 바뀌었다 — 눌러만 두고 안 고친 자리' : ''}`);
  if (e.이유) console.log(`     이유 — ${e.이유}`);
  e.지금글.forEach((t) => console.log(`     지금 "${t}"`));
  e.바꿀글.forEach((t) => console.log(`     바꿈 "${t}"`));
  console.log(`     원천 ${e.원천.length ? e.원천.join(' · ') : '(못 찾음)'}`);
}

/* ── 어조 「버림」 — 자리를 비우지 않는다. 그래도 무엇을 뺐는지는 적는다 ────── */
const dropNew = decided.filter((x) => x.kind === 'N' && x.v === '버림')
  .map((x) => ({ 자리: `${x.slug} #${x.no}`, 이유: x.why || '',
    글: String(lines0[x.no - 1] || '').split(':').slice(1).join(':').trim() }));
console.log(`\n── 어조 문장 버림 ${dropNew.length}개 (자리는 안 빈다 — 지금 쓰는 소리가 그대로 남는다)`);
for (const r of dropNew) {
  console.log(`  · ${r.자리} — ${r.이유 || '(이유 없음)'}`);
  console.log(`     "${r.글}"`);
}

/* ── 「다시」 — 같은 글을 다시 받는다. 대장은 안 건드린다 ──────────────────── */
const again = decided.filter((x) => x.v === '다시');
const againOld = again.filter((x) => x.kind === 'O').map((x) => x.id);
const againNew = again.filter((x) => x.kind === 'N').map((x) => `${x.slug} #${x.no}`);
console.log(`\n── 다시 받기 ${again.length}개 — 기존 클립 ${againOld.length} · 어조 문장 ${againNew.length}`);
if (againOld.length) console.log('   기존 ' + againOld.join(' · '));
if (againNew.length) console.log('   어조 ' + againNew.join(' · '));

/* ── 어조에서 통째로 없어지는 재더빙이 있나 ───────────────────────────────── */
const bySlug = {};
decided.filter((x) => x.kind === 'N').forEach((x) => { (bySlug[x.slug] ||= []).push(x); });
const gone = Object.entries(bySlug)
  .filter(([slug, xs]) => xs.length === (SLUG.get(slug) || {}).문장수 && xs.every((x) => x.v === '버림'))
  .map(([slug]) => slug);
if (gone.length) console.log(`\n· 문장이 전부 「버림」이라 **재더빙 자체가 없어지는** 클립 ${gone.length}개: ${gone.join(' · ')}`
  + '\n  (자리가 비는 것은 아니다 — 지금 쓰는 기존 소리가 그대로 남는다)');

if (PLAN) {
  fs.writeFileSync(PLAN, JSON.stringify({
    마커: 'REDUB_PICK_PLAN', 읽은파일: path.relative(ROOT, IN),
    요약: { 판정: decided.length, 안정함: items.length - decided.length, ...tally },
    비울수없음: cantEmpty, 확인필요: askEmpty, 비워도됨: mayEmpty, 어조버림: dropNew, 글바꿈: edits,
    다시: { 기존: againOld, 어조: againNew },
    그대로: decided.filter((x) => x.v === '그대로').map((x) => x.kind === 'O' ? x.id : `${x.slug} #${x.no}`),
    재더빙없어짐: gone,
  }, null, 1) + '\n');
  console.log(`\n  썼다: ${PLAN}`);
}

if (items.length - decided.length) console.log(`\n※ 안 정한 자리가 ${items.length - decided.length}개 남았습니다 — 판정 화면에서 마저 고르시면 됩니다.`);
console.log('\n✓ 읽었습니다.');
process.exit(0);
