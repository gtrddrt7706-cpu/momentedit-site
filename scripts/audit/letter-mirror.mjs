/* ★★[LETTER_MIRROR 2026-09-13] 어른께 드리는 편지는 «두 벌»이다 — 화면(parents.html)과 소리(대본).
 *
 * ── 왜 만드나 (오늘 실제로 갈려 있었다)
 *   [TONE_POLISH] 가 소리 쪽을 「그 시간의 무게를 짐작하기에」로 고쳤는데 화면은 「알기에」로 남았다.
 *   앞 문장이 「저희가 다 알 수는 없습니다」라서 화면만 읽으면 바로 부딪힌다 — 못 안다고 해 놓고 안다고 한다.
 *   두 벌인데 한쪽만 고쳐도 아무 검사가 안 물었다. 어른이 글을 읽으며 소리를 같이 들으시면 그 자리가 어긋난다.
 *
 * ── 무엇을 재나
 *   소리 대본(manifest 의 parents-letter)의 문장이 전부 화면에 «글자 그대로» 있는지.
 *   ★태그는 «공백 없이» 지운다. 공백을 넣으면 <strong> 하나에 없던 띄어쓰기가 생겨 전부 다르게 보인다
 *     (첫 판이 그래서 11건을 일렀는데 진짜는 1건이었다 — 검사가 거짓말을 하면 없는 것만 못하다).
 *
 * ── 낭독 전용 줄은 화면에 없는 것이 «맞다»
 *   장 번호 읽기(하나,∼넷,)·여는 말·맺음은 소리에만 있다. 화면은 一二三四 와 제목으로 그 자리를 대신한다.
 *   ★그래서 빼되, 빼는 규칙을 «모양»으로 적는다. 문장을 통째로 적어 두면 문안을 고칠 때마다 여기도 고쳐야 하고,
 *     그러면 이 검사가 또 하나의 «두 벌»이 된다.
 *
 * ── 종료코드 [CANT_LOOK]  0 통과 · 1 갈렸다 · 2 재지 못함
 * 쓰기: node scripts/audit/letter-mirror.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);

let man, html;
try {
  man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  html = fs.readFileSync(P('parents.html'), 'utf8');
} catch (e) { console.log(`[LETTER_MIRROR] ? 원천을 못 읽었다 — ${e.message}`); process.exit(2); }

const clip = (man.clips || []).find((c) => c.file === 'parents-letter');
if (!clip) { console.log('[LETTER_MIRROR] ? 대장에 parents-letter 가 없다'); process.exit(2); }

const flat = html.replace(/<[^>]+>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/\s+/g, ' ');

/* 낭독에만 있는 줄 — 모양으로 가른다(문장을 베껴 적지 않는다) */
const READ_ONLY = [
  /^(하나|둘|셋|넷|다섯|여섯),\s/,          // 장 번호 읽기 — 화면은 一二三四 로 대신한다
  /^두 분 어른께,/,                          // 낭독 여는 말
  /올림\.$/,                                 // 낭독 맺음
];
const isReadOnly = (t) => READ_ONLY.some((re) => re.test(t));

const drift = [];
let skipped = 0;
for (const s of clip.sents) {
  if (isReadOnly(s.text)) { skipped++; continue; }
  if (!flat.includes(s.text)) drift.push(s.text);
}

console.log(`[LETTER_MIRROR] 소리 ${clip.sents.length}문장 · 낭독 전용 ${skipped}문장 제외 · 화면과 맞댄 ${clip.sents.length - skipped}문장`);
if (drift.length) {
  console.log(`\n✗ 화면(parents.html)에 «글자 그대로» 없는 문장 ${drift.length}개 — 두 벌이 갈렸다:`);
  for (const t of drift) console.log(`    ${t}`);
  console.log('\n  ★어른이 글을 읽으며 소리를 같이 들으시면 그 자리가 어긋납니다.');
  console.log('  → parents.html 과 scripts/build-dubbing-script.mjs 를 «같은 커밋»에서 함께 고치세요.');
  process.exit(1);
}
console.log('[LETTER_MIRROR] ok — 화면과 소리가 한 글자까지 같다');
