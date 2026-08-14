/* [CANT_LOOK] 0=통과 1=재서 틀림 2=못 잼 — 제안 문안이 문구 규칙을 지키는가 [MUNAN_COPY]
 *
 * ★왜 따로 만드나 (2026-08-14)
 *   문서 전체를 훑으면 **설명 산문까지 함께 잡힌다.** 실제로 첫 판이 그랬다 —
 *   내 리서치 문서의 `—`(줄표)와 `★` 를 위반으로 세고 붉어졌다.
 *   그런데 문구 규칙(CLAUDE.md)이 금지하는 것은 **고객에게 노출되는 문구**다.
 *   저장소 안 문서·주석·가드는 `—`·`★` 를 쓴다(merge-guard.sh·CLAUDE.md 자신이 그렇다).
 *   ★그물이 넓으면 사람이 문서를 이상하게 쓰게 된다. 겨눌 것만 겨눈다.
 *
 * ★무엇을 제안 문안으로 보나 (docs/plans/대본개정/*.md 안에서)
 *   ① `**숫자.** 본문`  — 고객 예시(서약·편지·첫인사) 제안
 *   ② `**담백**` / `**서정**` / `**다정**` 줄 **바로 아래**의 `> 본문` — 나레이션 제안
 *      (해설도 인용 블록을 쓰므로 '> 로 시작한다'만으로는 못 가른다. 결 이름이 표식이다)
 *   그 밖의 줄(표·소제목·근거 설명)은 안 본다.
 *
 * 쓰기: node scripts/check-munan-copy.mjs [파일…]   (없으면 docs/plans/대본개정/*.md 전부)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/대본개정');
let files = process.argv.slice(2);
if (!files.length) {
  if (!fs.existsSync(DIR)) { console.log('못 잼: ' + DIR + ' 가 없다'); process.exit(2); }
  files = fs.readdirSync(DIR).filter((f) => f.endsWith('.md')).map((f) => path.join(DIR, f));
}

/* ★[STAR_OK 2026-08-14] ★(U+2605)·☆(U+2606)은 **관례 마커**라 CLAUDE.md 가 명시로 허용한다
   (「상태 신호·경고·관례 마커(★)만 허용」). 그런데 U+2600-27BF 범위가 그걸 삼킨다 —
   코워크 B가 이 그물에 걸려 **자기 문서의 ★를 ※로 바꿨다.** 규칙이 허용하는 것을
   검사가 막아 사람이 문서를 이상하게 쓰게 된 것이다. 범위에서 빼 둔다. */
const EMOJI = /(?![\u2605\u2606])[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}]/u;
const bad = [];
let lines = 0;

for (const f of files) {
  let src; try { src = fs.readFileSync(f, 'utf8'); } catch { bad.push(`${f}: 못 읽음`); continue; }
  let tone = false;   // 바로 앞에서 결 이름을 봤나
  src.split('\n').forEach((raw, i) => {
    const l = raw.trim();
    if (/^\*\*(담백|서정|다정)\*\*$/.test(l)) { tone = true; return; }
    if (l && !/^>/.test(l) && !/^\*\*\d+\.\*\*/.test(l)) tone = false;   // 결 블록이 끝났다
    let body = null;
    const m1 = l.match(/^\*\*\d+\.\*\*\s+(.+)$/);            // **1.** 문안  (고객 예시)
    if (m1) body = m1[1];
    /* ★나레이션 제안은 '> 로 시작한다'만으로는 못 가른다 — 해설도 인용 블록을 쓰기 때문이다.
       실제로 첫 판이 내 해설 줄을 문안으로 세고 붉었다. **결 이름 바로 아래의 인용줄**만 문안으로 본다.
       형식: 한 줄에 `**담백**` / `**서정**` / `**다정**` 을 두고, 그 다음 줄부터 `> 문안`. */
    else if (/^>\s/.test(l) && tone) body = l.replace(/^>\s*/, '');
    if (!body) return;
    // 근거 줄(기준 번호로 시작)·빈 줄은 제외
    if (!body || /^\s*$/.test(body)) return;
    lines++;
    const where = `${path.basename(f)}:${i + 1}`;
    if (body.indexOf('—') >= 0) bad.push(`${where} 전각 줄표 | ${body.slice(0, 50)}`);
    if (EMOJI.test(body)) bad.push(`${where} 이모지 | ${body.slice(0, 50)}`);
    if (body.length > 300) bad.push(`${where} ${body.length}자 (C5: 300자 안팎) | ${body.slice(0, 40)}`);
  });
}

console.log(`  · 제안 문안 ${lines}줄을 봤다 (파일 ${files.length}개)`);
bad.forEach((b) => console.log('  ✖ ' + b));
if (!lines) { console.log('못 잼: 제안 문안으로 인식된 줄이 0이다 — 형식이 바뀌었는지 볼 것'); process.exit(2); }
console.log(bad.length ? `틀림 ${bad.length}건` : '제안 문안 문구 규칙 통과');
process.exit(bad.length ? 1 : 0);
