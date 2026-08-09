// ★[NARR_LEN] 클립 길이 표 — 문안을 고칠 때 '합'을 보게 한다 [2026-08-09]
//
//   node scripts/check-narr-len.mjs          # 표를 찍고, 주석의 수치와 대조한다
//   node scripts/check-narr-len.mjs --table  # 표만 (판정 없음)
//
// ★★이 파일이 내는 초 수는 전부 **예상**이다. 실측(mp3·ffprobe)이 아니다.
//   실측은 scripts/check-syl-rate.mjs 가 본다. 예상은 실제보다 약 35% 길다(상수 300 대 실제 406음절/분).
//   ★이 구분을 안 밝혀서 두 세션이 한 번 헛돌았다 — 같은 '23.3초'가 한쪽은 narr-close 실측,
//     한쪽은 toast-toast 예상이었고 둘 다 맞았다. 길이를 말할 땐 실측인지 예상인지 먼저 밝힌다.
//
// 왜 — 「하객과 함께」를 다시 쓰면서 필요한 문장을 하나씩 더했는데, 각각은 정당한데
//   합이 31.5초(예상)가 됐다. 지금 있는 어떤 나레이션보다 길었다(편지 제외).
//   ★한 번에 하나씩 옳은 문장을 더하면, 각각은 옳고 합은 틀린다. 더할 때마다 합을 봐야 한다.
//   눈으로 세면 틀린다 — 그래서 사람이 세지 않게 여기서 센다.
//
// 재는 식은 조립기(assemble-narration.mjs)와 같다 — 자가 둘이면 둘이 다른 말을 하는 날이 온다.
//   예상 길이 = head + tail + Σ(before + after + 음절/300*60)
import fs from 'node:fs';
import path from 'node:path';

const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const MAN = path.join(root, 'docs/plans/식순연구/타입캐스트/manifest.json');
const SRC = path.join(root, 'assets/ritual-data.js');

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
/* [EXIT_TRAP] 맨 끝 뒤에 붙인 실패도 붉게 — 다른 검사들과 같은 구조 */
process.on('exit', (code) => { if (bad && code === 0) process.exitCode = 1; });

const man = JSON.parse(fs.readFileSync(MAN, 'utf8'));
const syl = (s) => (s.match(/[가-힣]/g) || []).length;
const est = (s) => syl(s) / 300 * 60;
const len = (c) => c.head + c.tail + c.sents.reduce((a, s) => a + s.before + s.after + est(s.text), 0);

const rows = man.clips.filter((c) => !c.mix)
  .map((c) => ({ no: c.no, f: c.file, sec: len(c), n: c.sents.length,
    longest: Math.max(...c.sents.map((s) => est(s.text))) }))
  .sort((a, b) => b.sec - a.sec);

/* ★편지는 성격이 다르다(3분 통낭독) — 천장 계산에서 뺀다. 빼는 이유를 여기 적어 둔다.  */
const LETTER = /parents-letter/;
const noLetter = rows.filter((r) => !LETTER.test(r.f));
const sorted = [...rows].sort((a, b) => a.sec - b.sec);
const median = sorted[Math.floor(sorted.length / 2)].sec;

console.log(`[예상 · 실측 아님] 클립 ${rows.length}개 · 중앙값 ${median.toFixed(1)}초 · 편지 제외 최장 ${noLetter[0].f} ${noLetter[0].sec.toFixed(1)}초\n`);
console.log('긴 순 상위 8 (예상)');
for (const r of rows.slice(0, 8)) {
  console.log(`  ${r.no} ${r.f.padEnd(22)} ${r.sec.toFixed(1).padStart(5)}초 · ${r.n}문장 · 한 문장 최장 ${r.longest.toFixed(1)}초`);
}

if (process.argv.includes('--table')) process.exit(0);

/* 주석이 적어 둔 수치를 실측과 대조한다 — CORR_CLAIM 과 같은 처방이다.
   ★코드는 멀쩡한데 설명이 틀리는 일을 이 저장소에서 세 번 겪었다(DONE_UNDO · CORR_CLAIM · 이번). */
const src = fs.readFileSync(SRC, 'utf8');
const ro = rows.find((r) => r.f === 'narr-round-open');
if (!ro) no('narr-round-open 을 manifest 에서 못 찾았습니다 — 이 검사도 같은 커밋에서 고치세요');
else {
  const rank = rows.indexOf(ro) + 1;
  const said = /→ (\d+(?:\.\d+)?)초\(5문장\)|→ ([\d.]+)초\(5문장\)/.exec(src);
  const num = (re) => { const m = re.exec(src); return m ? Number(m[1]) : null; };
  const claimed = num(/31\.5초\(8문장\) → ([\d.]+)초\(5문장\)/);
  if (claimed === null) no("ritual-data 주석에서 '31.5초(8문장) → N초(5문장)' 를 못 찾았습니다 — 수치를 지우지 말고 갱신하세요");
  else if (Math.abs(claimed - ro.sec) > 0.15) no(`주석은 ${claimed}초라는데 실측은 ${ro.sec.toFixed(1)}초입니다 — 문안을 고쳤으면 주석도 같은 커밋에서 고치세요`);
  else console.log(`\nok narr-round-open 예상 ${ro.sec.toFixed(1)}초 · 전체 ${rank}위/${rows.length} · 주석 수치와 일치`);

  const cap = num(/declare-1-solemn ([\d.]+)초/);
  if (cap === null) no("주석에서 '편지 제외 최장 = declare-1-solemn N초' 를 못 찾았습니다");
  else if (noLetter[0].f !== 'declare-1-solemn') no(`편지 제외 최장이 declare-1-solemn 이 아니라 ${noLetter[0].f}(${noLetter[0].sec.toFixed(1)}초)로 바뀌었습니다 — 주석을 갱신하세요`);
  else if (Math.abs(cap - noLetter[0].sec) > 0.15) no(`주석은 최장 ${cap}초라는데 실측은 ${noLetter[0].sec.toFixed(1)}초입니다`);
  else console.log(`ok 편지 제외 최장(예상) declare-1-solemn ${noLetter[0].sec.toFixed(1)}초 — 주석과 일치`);

  /* 안내 클립이 천장을 넘으면 그때 사람이 판단하게 한다(자동으로 막지 않는다 — 정당한 경우가 있다) */
  if (ro.sec > noLetter[0].sec) no(`안내(narr-round-open ${ro.sec.toFixed(1)}초)가 편지 제외 최장(${noLetter[0].sec.toFixed(1)}초)을 넘었습니다 — 안내가 감정 정점보다 길면 안 됩니다`);
}

// ── 결론은 여기 한 곳에서만 [EXIT_AT_END]
if (bad) { console.error('\n문안을 고쳤으면 주석의 수치도 같은 커밋에서 고치세요. node scripts/check-narr-len.mjs --table 로 실측 표를 볼 수 있습니다.'); process.exitCode = 1; }
else console.log('NARR LEN OK (전부 예상값 · 실측은 check-syl-rate.mjs)');
