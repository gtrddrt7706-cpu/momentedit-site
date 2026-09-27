// ★[REF_TABLE 2026-09-27 코워크 «말하는 자리 참고 예시 대본» · 사장님 지시] 참고 예시 표(TSV)를 화면이 읽는 자료(assets/ritual-ref.js)로 옮긴다.
//
//   node scripts/build-ref-examples.mjs          # 다시 쓴다
//   node scripts/build-ref-examples.mjs --check  # 낡았으면 종료코드 1 (merge-guard)
//
// 원천: docs/plans/식순연구/참고예시_글예시_말하는자리_0927.tsv (코워크가 준 표 그대로 · # 줄은 머리글)
//   열: 자리 · 판 · 예시번호 · 결 · 말하는 사람 · 글 · 글자수 · 소리내어읽으면초 · 아이디 · 키
// ★★[CAST_TEXT_ONLY 2026-09-27 사장님 결정] 말하는 자리 예시는 **글로만** — 소리 파일 · 성우 칸이 없다(아이디 = 옛 파일 이름에서 .mp3 를 뗀 것 · 글 한 줄을 가리키는 이름)
//   키 = 자리[:판[:길이]] — 화면은 이 열로 고른다(welcome · letter:parent · tribute:cross · toast:toast|both · free:speech:2|3 · declare:family)
// ★assets/ritual-ref.js 는 자동 생성 파일이다 — 손으로 고치지 말 것. 글을 고치려면 TSV 를 고치고 이 스크립트를 돌린다.
// ★소리는 없다 [CAST_TEXT_ONLY] — 화면은 이 글을 소리 없이 글 + 막대로만 보여 준다(연습에서도 대역 목소리를 틀지 않는다).
import fs from 'node:fs'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'docs/plans/식순연구/참고예시_글예시_말하는자리_0927.tsv');
const OUT = path.join(ROOT, 'assets/ritual-ref.js');
const lines = fs.readFileSync(SRC, 'utf8').replace(/\r/g, '').split('\n').filter((l) => l && !l.startsWith('#'));
const head = lines.shift().split('\t');
const col = (n) => { const i = head.indexOf(n); if (i < 0) throw new Error('열이 없다: ' + n); return i; };
const C = { key: col('키'), n: col('예시번호'), kyeol: col('결'), who: col('말하는 사람'), id: col('아이디'), text: col('글'), pan: col('판') };
const rows = lines.map((l) => l.split('\t')).map((f) => {
  if (f.length !== head.length) throw new Error('열 수가 다르다: ' + f.slice(0, 3).join(' '));
  const who = f[C.who].split(' · ')[0];   // «신부 오빠 · 1 · 2 · 3분(여는 말)» → 신부 오빠
  return { key: f[C.key], n: +f[C.n], kyeol: f[C.kyeol], who, id: f[C.id], text: f[C.text] };
});
const ids = new Set(); rows.forEach((r) => { if (ids.has(r.id)) throw new Error('아이디가 겹친다: ' + r.id); ids.add(r.id); });
const body = '/* 자동 생성 — scripts/build-ref-examples.mjs · 원천 docs/plans/식순연구/참고예시_글예시_말하는자리_0927.tsv · 손으로 고치지 말 것 [REF_TABLE] */\n'
  + 'window.RITUAL_REF=' + JSON.stringify({ v: '0927', rows }, null, 0).replace(/\},\{/g, '},\n{') + ';\n';
if (process.argv.includes('--check')) {
  const cur = fs.existsSync(OUT) ? fs.readFileSync(OUT, 'utf8') : '';
  if (cur !== body) { console.log('FAIL [REF_TABLE] assets/ritual-ref.js 가 표보다 낡았다 — node scripts/build-ref-examples.mjs'); process.exit(1); }
  console.log(`ok [REF_TABLE] 참고 예시 ${rows.length}줄 · 표와 같다`); process.exit(0);
}
fs.writeFileSync(OUT, body); console.log(`[REF_TABLE] ${rows.length}줄 → assets/ritual-ref.js`);
