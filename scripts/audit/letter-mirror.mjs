/* ★★[LETTER_MIRROR 2026-09-13] 어른께 드리는 편지는 «두 벌»이다 — 화면(parents.html)과 소리(대본).
 *
 * ── 왜 만들었나 (그날 실제로 갈려 있었다)
 *   [TONE_POLISH] 가 소리 쪽을 「그 시간의 무게를 짐작하기에」로 고쳤는데 화면은 「알기에」로 남았다.
 *   앞 문장이 「저희가 다 알 수는 없습니다」라서 화면만 읽으면 바로 부딪힌다 — 못 안다고 해 놓고 안다고 한다.
 *   두 벌인데 한쪽만 고쳐도 아무 검사가 안 물었다.
 *
 * ★★[LETTER_BOTH 2026-09-19 사장님 결정 — 갈래 1 「소리를 화면에 맞춘다」]
 *   ── 이 검사가 초록인 채로 편지가 갈려 있었다. 그게 이 확장의 이유다.
 *   첫 판은 «소리 → 화면» 한 방향만 봤다. 「소리의 문장이 화면에 있는가」다.
 *   그래서 ⓐ화면에만 있는 문장과 ⓑ장 차례는 **애초에 보는 대상이 아니었다.**
 *   실제로 그 두 구멍으로 둘 다 새어 있었다(2026-09-19 실측):
 *     ⓐ 폐백 3문장·손님 식사 4문장이 화면에만 있었다. 둘 다 2026-09-12 사장님 지시로 들어온 것이고,
 *        하필 첫 장 一 의 둘째·셋째 문단이라 **듣기를 누르면 시작하자마자 통째로 건너뛰어졌다.**
 *     ⓑ 화면은 「갖출 것은 갖춘 예식」이 먼저인데(PAR_ORDER) 소리는 「인원을 절제하는 이유」가 먼저였다.
 *        글은 눈이 건너뛸 수 있지만 소리는 순서대로만 온다 — 차례는 소리에서 더 무겁다.
 *   ★재생바가 이미 「편지를 읽어 드려요」라고 약속한다(SAY_ON). 「주요 내용만」이 아니다.
 *     그러니 «소리가 화면의 부분집합이어도 된다»는 길은 이 페이지에 없다. 양방향으로 잰다.
 *
 * ── 무엇을 재나 (셋)
 *   ① 소리 → 화면   소리 대본의 문장이 전부 화면에 «글자 그대로» 있는가
 *   ② 화면 → 소리   화면 본문의 문장이 전부 소리에 있는가   ← [LETTER_BOTH] 로 새로 봄
 *   ③ 장 차례       화면 <h2> 넷의 순서와 소리 「하나,∼넷,」 의 순서가 같은가  ← 새로 봄
 *
 * ── 대기함  [LETTER_PENDING]
 *   녹음은 사람이 밖에서 받아 온다. 결정과 소리 사이에 늘 시차가 있다.
 *   그 시차를 «빨강»으로 두면 사람이 곧 검사를 무시하게 되고, «초록»으로 두면 그대로 잊힌다.
 *   그래서 셋째 자리를 둔다 — docs/plans/식순연구/parents-letter-대기.json 에 적힌 것만 «대기»로 통과시킨다.
 *   ★대기함은 스스로 청소된다. 적어 둔 것이 **이미 소리에 있으면 «목록이 낡았다»고 막는다.**
 *     안 그러면 녹음이 들어온 뒤에도 목록이 남아, 다음에 진짜로 갈렸을 때 그 자리를 덮어 준다.
 *   ★대기 파일이 없으면 «대기 없음»으로 친다 — 지우면 느슨해지는 게 아니라 엄격해진다.
 *
 * ── 화면은 원천이다, 베껴 적지 않는다
 *   장 차례도 대기 문장도 parents.html 에서 그때그때 뽑는다. 문안을 고치면 여기도 따라 고쳐야 하는 구조면
 *   이 검사가 또 하나의 «두 벌»이 된다 — 막으려던 병에 검사가 걸리는 꼴이다.
 *
 * ── 태그는 «공백 없이» 지운다
 *   공백을 넣으면 <strong> 하나에 없던 띄어쓰기가 생겨 전부 다르게 보인다
 *   (첫 판이 그래서 11건을 일렀는데 진짜는 1건이었다 — 검사가 거짓말을 하면 없는 것만 못하다).
 *
 * ── 종료코드 [CANT_LOOK]  0 통과 · 1 갈렸다 · 2 재지 못함
 * 쓰기: node scripts/audit/letter-mirror.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);
const WAIT_FILE = 'docs/plans/식순연구/parents-letter-대기.json';

let man, html;
try {
  man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  html = fs.readFileSync(P('parents.html'), 'utf8');
} catch (e) { console.log(`[LETTER_MIRROR] ? 원천을 못 읽었다 — ${e.message}`); process.exit(2); }

const clip = (man.clips || []).find((c) => c.file === 'parents-letter');
if (!clip) { console.log('[LETTER_MIRROR] ? 대장에 parents-letter 가 없다'); process.exit(2); }

/* 대기함 — 없으면 «대기 없음»(= 엄격) */
let wait = { pending_sents: [], pending_order: false };
try { wait = { ...wait, ...JSON.parse(fs.readFileSync(P(WAIT_FILE), 'utf8')) }; } catch (e) { /* 없어도 된다 */ }
const pendSents = new Set(wait.pending_sents || []);

/* ── 화면에서 뽑기 ─────────────────────────────────────────────────────────── */
const OPEN = '<div class="letter" id="letter">';
const at = html.indexOf(OPEN);
if (at < 0) { console.log(`[LETTER_MIRROR] ? parents.html 에서 ${OPEN} 를 못 찾았다`); process.exit(2); }
let depth = 0, cur = at;
for (;;) {
  const m = /<\/?div\b/.exec(html.slice(cur));
  if (!m) break;
  const abs = cur + m.index;
  depth += html.startsWith('</div', abs) ? -1 : 1;
  cur = abs + m[0].length;
  if (depth === 0) break;
}
const bodyHtml = html.slice(at, cur);

const strip = (x) => x.replace(/<[^>]+>/g, '')          /* ★공백 없이 */
  .replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&')
  .replace(/\s+/g, ' ').trim();

const screenSents = [];
for (const m of bodyHtml.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/g)) {
  const t = strip(m[1]);
  if (!t) continue;
  for (const s of t.split(/(?<=\.)\s+/)) if (s.trim()) screenSents.push(s.trim());
}
const screenChaps = [...bodyHtml.matchAll(/<h2[^>]*>([\s\S]*?)<\/h2>/g)].map((m) => strip(m[1])).filter(Boolean);

if (!screenSents.length || screenChaps.length !== 4) {
  console.log(`[LETTER_MIRROR] ? 화면을 못 뽑았다 — 문장 ${screenSents.length} · 장 ${screenChaps.length}(4 여야 한다)`);
  process.exit(2);
}

/* ── 소리에서 뽑기 ─────────────────────────────────────────────────────────── */
const ORD = ['하나', '둘', '셋', '넷', '다섯', '여섯'];
/* 낭독에만 있는 줄 — 모양으로 가른다(문장을 베껴 적지 않는다) */
const READ_ONLY = [
  new RegExp(`^(${ORD.join('|')}),\\s`),   // 장 번호 읽기 — 화면은 一二三四 로 대신한다
  /^두 분 어른께,/,                          // 낭독 여는 말
  /올림\.$/,                                 // 낭독 맺음
];
const isReadOnly = (t) => READ_ONLY.some((re) => re.test(t));
const soundSents = clip.sents.map((s) => s.text);
const soundSet = new Set(soundSents);
const soundChaps = soundSents.filter((t) => new RegExp(`^(${ORD.join('|')}),\\s`).test(t))
  .map((t) => t.replace(new RegExp(`^(${ORD.join('|')}),\\s*`), '').replace(/\.$/, '').trim());

const flat = strip(html);
let bad = 0;
const fail = (m) => { console.log(`\n✗ ${m}`); bad++; };
console.log(`[LETTER_MIRROR] 화면 본문 ${screenSents.length}문장 · 장 ${screenChaps.length} │ 소리 ${soundSents.length}문장 · 장 ${soundChaps.length}`);

/* ── ① 소리 → 화면 (엄격 · 대기 면제 없음) ────────────────────────────────── */
const d1 = [];
let skipped = 0;
for (const t of soundSents) {
  if (isReadOnly(t)) { skipped++; continue; }
  if (!flat.includes(t)) d1.push(t);
}
if (d1.length) {
  fail(`① 소리에는 있는데 화면에 «글자 그대로» 없는 문장 ${d1.length}개:`);
  for (const t of d1) console.log(`    ${t}`);
  console.log('  ★어른이 글을 읽으며 소리를 같이 들으시면 그 자리가 어긋납니다.');
} else console.log(`  ① 소리 → 화면  ok (낭독 전용 ${skipped}문장 제외)`);

/* ── ② 화면 → 소리 (대기함이 면제한다) ────────────────────────────────────── */
const d2 = [], waited = [];
for (const t of screenSents) {
  if (soundSet.has(t)) continue;
  (pendSents.has(t) ? waited : d2).push(t);
}
if (d2.length) {
  fail(`② 화면에는 있는데 소리가 말하지 않는 문장 ${d2.length}개 — 대기함에도 없다:`);
  for (const t of d2) console.log(`    ${t}`);
  console.log(`  ★듣기만 하시는 어른께는 이 문장이 영영 안 갑니다. 재생바는 「편지를 읽어 드려요」라고 약속합니다.`);
  console.log(`  → 녹음을 받거나, 받을 때까지 ${WAIT_FILE} 의 pending_sents 에 적으세요.`);
} else console.log(`  ② 화면 → 소리  ok${waited.length ? ` (녹음 대기 ${waited.length}문장)` : ''}`);

/* ── ③ 장 차례 ────────────────────────────────────────────────────────────── */
const sameOrder = screenChaps.length === soundChaps.length && screenChaps.every((t, i) => t === soundChaps[i]);
if (!sameOrder && !wait.pending_order) {
  fail('③ 장 차례가 화면과 소리에서 다르다:');
  screenChaps.forEach((t, i) => console.log(`    ${i + 1}장  화면 ${t}   │ 소리 ${soundChaps[i] ?? '(없음)'}`));
  console.log('  ★글은 눈이 건너뛰지만 소리는 순서대로만 옵니다 — 차례는 소리에서 더 무겁습니다.');
} else console.log(`  ③ 장 차례  ${sameOrder ? 'ok' : '대기 (재녹음 기다림)'}`);

/* ── 대기함 청소 — 적어 둔 것이 이미 소리에 있으면 목록이 낡았다 ─────────── */
const stale = [...pendSents].filter((t) => soundSet.has(t));
if (stale.length) {
  fail(`대기함이 낡았다 — 아래 ${stale.length}문장은 이미 소리에 있다. ${WAIT_FILE} 의 pending_sents 에서 빼세요:`);
  for (const t of stale) console.log(`    ${t}`);
  console.log('  ★남겨 두면 다음에 진짜로 갈렸을 때 그 자리를 덮어 줍니다.');
}
if (wait.pending_order && sameOrder) {
  fail(`대기함이 낡았다 — 장 차례는 이미 같다. ${WAIT_FILE} 의 pending_order 를 false 로 바꾸세요.`);
}
const ghost = [...pendSents].filter((t) => !screenSents.includes(t));
if (ghost.length) {
  fail(`대기함에 «화면에 없는» 문장 ${ghost.length}개가 있다 — 문안이 바뀌었는데 목록이 안 따라왔다:`);
  for (const t of ghost) console.log(`    ${t}`);
}

if (bad) { console.log(`\n[LETTER_MIRROR] ✗ ${bad}곳에서 갈렸다`); process.exit(1); }
const tail = waited.length || !sameOrder ? ` · 녹음 대기 ${waited.length + (sameOrder ? 0 : 2)}문장(본문 ${waited.length} + 장 번호 ${sameOrder ? 0 : 2})` : '';
console.log(`\n[LETTER_MIRROR] ok — 화면과 소리가 한 글자까지 같다${tail}`);
