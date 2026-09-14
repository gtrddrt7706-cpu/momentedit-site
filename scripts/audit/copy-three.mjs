/* ★★[COPY_THREE 2026-09-14] 하객 안내 문안은 «세 벌»이다 — 한 벌만 고치면 나머지가 남는다.
 *
 *   ① assets/ritual-data.js               나레이션판 + 두 분 목소리판 (화면·엔진이 읽는다)
 *   ② docs/plans/식순연구/배역_예시_대사.txt  두 분 목소리판 (더빙 대본의 원천)
 *   ③ order-preview.html                  ①의 인라인 사본 (빌더 미리보기)
 *
 * ── 왜 만드나 (오늘 그대로 당했다)
 *   [GUEST_TONE] 으로 ①③을 고쳤는데 ②가 남아, 대장(manifest)의 «두 분 목소리판»이 옛말 그대로였다.
 *   창고는 「낡음 5」라고만 했고 — 고친 자리가 아홉인데 다섯만 떴다. 그 차이를 내가 세어 보지 않았으면
 *   신부 네 줄이 옛 소리로 남은 채 완성됐다. 「한 곳만 고치면 다른 곳으로 샌다」의 세 번째다.
 *
 * ── 무엇을 재나
 *   두 분 목소리판의 문장이 ①과 ② «양쪽에» 같은 글로 있는지.
 *   ★③은 check-ritual-mirror 가 이미 ①과 대조한다 — 두 번 재지 않는다.
 *
 * 종료코드 [CANT_LOOK]  0 통과 · 1 갈렸다 · 2 재지 못함
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const P = (r) => path.join(ROOT, r);

let man, cast;
try {
  man = JSON.parse(fs.readFileSync(P('docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
  cast = fs.readFileSync(P('docs/plans/식순연구/배역_예시_대사.txt'), 'utf8');
} catch (e) { console.log('[COPY_THREE] ? 원천을 못 읽었다 — ' + e.message); process.exit(2); }

const data = fs.readFileSync(P('assets/ritual-data.js'), 'utf8');
const flat = (s) => s.replace(/\s+/g, ' ');
const D = flat(data), C = flat(cast);

/* ★불변식을 «클립 단위»로 잡는다.
   배역 클립이라고 다 두 벌인 것이 아니다 — 서약·편지·덕담은 배역_예시_대사.txt 한 벌뿐이고
   ritual-data 에 아예 없다. 그걸 「없다」고 이르면 검사가 104건을 헛되이 문다(첫 판이 그랬다).
   ★그래서: «그 클립의 문장이 ritual-data 에 하나라도 있으면, 그 클립은 두 벌짜리다»로 가른다.
     두 벌짜리로 판정된 클립은 «모든» 문장이 양쪽에 같은 글로 있어야 한다.
     한 문장만 고치고 다른 벌을 안 고치면 바로 그 자리에서 걸린다. */
const drift = [];
let pairs = 0, looked = 0;
for (const c of man.clips) {
  if (c.mix) continue;
  if ((c.dir || '').indexOf('cast') < 0) continue;          // 나레이션은 ritual-data 한 벌뿐이다
  const sents = c.sents.filter((s) => flat(s.text).length >= 6);   // 「하윤아.」류 호명은 짚을 수 없다
  if (!sents.length) continue;
  const inD = sents.filter((s) => D.includes(flat(s.text))).length;
  /* ★«한 문장이라도 겹치면 두 벌»로 보면 우연에 걸린다 — 10_letter-parent 가 13문장 중 1문장만
     ritual-data 와 겹쳐(다른 문안과 같은 말) 두 벌로 올라갔고, 나머지 12를 「없다」고 헛되이 물었다.
     ★실측하면 두 벌짜리는 «전부» 겹친다(12클립 전부 n/n). 우연은 하나뿐이었다(1/13).
       그래서 과반으로 가른다 — 두 벌인 것은 통째로 두 벌이고, 우연은 과반을 못 넘는다. */
  if (inD * 2 <= sents.length) continue;                     // 한 벌짜리 · 또는 우연히 한두 문장 겹친 것
  pairs++;
  for (const s of sents) {
    looked++;
    const t = flat(s.text);
    if (!D.includes(t) || !C.includes(t)) drift.push({ id: `${String(c.no).padStart(2, '0')}_${c.file}#${s.i}`, t, inD: D.includes(t), inC: C.includes(t) });
  }
}
console.log(`[COPY_THREE] 두 벌짜리 클립 ${pairs}개 · ${looked}문장을 양쪽과 맞댔다`);
if (drift.length) {
  console.log(`\n✗ 한쪽에만 있는 문장 ${drift.length}개 — 벌이 갈렸다:`);
  for (const x of drift.slice(0, 10)) {
    console.log(`    ${x.id}  ${x.inD ? '' : '★ritual-data 에 없음 '}${x.inC ? '' : '★배역_예시_대사 에 없음'}`);
    console.log(`       「${x.t}」`);
  }
  console.log('\n  → 두 곳을 «같은 커밋»에서 함께 고치세요. 한쪽만 고치면 대장이 옛말을 물고 갑니다.');
  process.exit(1);
}
console.log('[COPY_THREE] ok — 두 벌이 한 글자까지 같다');
