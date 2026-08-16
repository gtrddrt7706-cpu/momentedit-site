// 소리를 **받아 적은 글** ↔ 대장 — 이 저장소에서 소리 쪽의 첫 실물 증거 [ASR_TRUTH]
//
//   node scripts/check-audio-text.mjs            재기만
//   node scripts/check-audio-text.mjs --redub    다시 받아야 할 클립의 붙여넣기 대본을 뽑는다
//
//   받아쓰기 자체는 python 이 만든다 →  python3 scripts/audit/asr-transcribe.py
//
// ★왜 만들었나 — 2026-08-16 사용자
//   *"지금 실제 멘트랑 적혀있는 나레이션 문구랑 안 맞는게 많아 점검해봐"*
//   그 시점 이 저장소의 모든 검사가 초록이었다. check-text-audio 「70곳 어긋남 0」,
//   check-audio-sents 「91클립 문장 수 맞음」. 그런데 스피커에서는 다른 말이 났다.
//
// ★★왜 여태 못 잡았나 — **글끼리만 맞대고 있었다**
//   RECORDED_TRUTH 는 「실제로 녹음된 글」을 따로 두자는 처방이었다. 그런데 _recorded.json 의
//   **첫 값이 그 시점의 manifest 복사본**이다. 그러니 옛 클립에 대해서는 A=A 다.
//   대조는 늘 초록이고, mp3 만 옛말을 한다.
//   ★이 저장소가 같은 병을 네 번째 앓은 것이다(RECORDED_TRUTH · NOAUDIO_REAL · CONSOLE_TEXT · 여기).
//     앞의 셋은 「대조 대상을 넓혀」 고쳤다. 넓히는 것으로는 이 병이 안 낫는다 —
//     **한쪽 끝이 실물에 닿아 있지 않으면**, 아무리 넓혀도 글의 세계 안에서만 맴돈다.
//
// ★받아쓰기는 틀린다 — 그래서 이 검사는 «판정»이 아니라 «들어 볼 순서»를 낸다
//   실측(모델 small · 105클립): 닮음 1.00 이 대부분이고, 틀리는 자리는 숫자·고유명사다
//   («스물아홉 해»→«29회» · «하객»→«학행» · «낳아»→«나아»). 그래서 닮음만으로 붉히지 않고
//   **어느 문장이 통째로 없거나 통째로 남는지**를 함께 본다. 최종 판정은 귀가 한다 [CANT_HEAR].
//
// ★종료 코드 [CANT_LOOK] 0 통과 · 1 재서 틀림 · 2 재지 못함(받아쓰기 파일 없음)
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const DIR = path.join(ROOT, 'docs/plans/식순연구/타입캐스트');
const HEARD = path.join(ROOT, '_asr/heard.json');
const REDUB = process.argv.includes('--redub');
if (!fs.existsSync(HEARD)) {
  console.error('✗ _asr/heard.json 이 없다 — 먼저 받아 적어야 한다:');
  console.error('   pip install faster-whisper --break-system-packages');
  console.error('   python3 scripts/audit/asr-transcribe.py --model small');
  process.exit(2);
}
const man = JSON.parse(fs.readFileSync(path.join(DIR, 'manifest.json'), 'utf8'));
const heard = JSON.parse(fs.readFileSync(HEARD, 'utf8')).clips || {};

/* ★[IN_ORDER_COVER] 문장이 «차례대로» 얼마나 들어 있나 — 점수는 python 쪽에서 낸다.
   자를 두 벌 만들지 않는다 [ONE_SPEC]. 여기서 다시 세면 difflib 을 손으로 흉내 내게 되고,
   실제로 한 번 그렇게 했다가 헛경보를 냈다(글자 주머니로 세니 105 중 91개가 「빠짐」으로 떴다).
   점수를 다시 내려면 →  python3 scripts/audit/asr-transcribe.py --score
   ★0.72 는 실측에서 고른 선이다: 들어 있는 문장 0.82~1.00 · 통째로 빠진 문장 0.12~0.62. */
const SENT_IN = 0.72, REV_IN = 0.80;

const rows = [];
for (const c of man.clips) {
  const id = `${c.no}_${c.file}`;
  const h = heard[id]; if (!h) continue;
  const sents = (c.sents || []).map((s) => String(s.text).trim()).filter(Boolean);
  if (!sents.length) continue;
  if (!h.sent) { console.error(`✗ ${id} 에 문장 점수가 없다 — python3 scripts/audit/asr-transcribe.py --score`); process.exit(2); }
  const missing = h.sent.filter((x) => x.cov < SENT_IN).map((x) => String(x.t).trim());
  /* ★뒤집어서도 본다 — 대본에 «없는 말»이 소리에 붙어 있는 자리.
     실측 12_narr-welcome-out: 대본 1문장은 그대로 들리는데, 소리 뒤에
     「이제 두 사람이 준비한 약속의 시간으로 들어갑니다」가 더 붙어 있다. 빠진 것만 보면 못 잡는다. */
  const extra = (h.rev != null && h.rev < REV_IN);
  if (!missing.length && !extra) continue;
  rows.push({ id, ratio: h.ratio, rev: h.rev, n: sents.length, missing, extra, role: c.role || '진행',
    want: h.want, heard: h.heard, sents });
}

const badOnes = rows;
console.log(`받아 적은 클립 ${Object.keys(heard).length}개 · 글과 소리가 어긋난 클립 ${badOnes.length}개`);
if (!badOnes.length) { console.log('\n✓ 대본의 모든 문장이 소리에서 들립니다.'); process.exit(0); }

console.log('\n✗ 적힌 글이 소리에 없는 자리');
badOnes.sort((a, b) => a.ratio - b.ratio).forEach((r) => {
  const kind = r.missing.length === r.n ? '★대본이 통째로 다르다(옛 녹음)'
    : r.missing.length ? `★문장 ${r.missing.length}개가 안 들린다`
    : '★대본에 없는 말이 소리에 더 붙어 있다';
  console.log(`\n  [${r.id}] 닮음 ${r.ratio} · 뒤집어 ${r.rev}  ${kind}`);
  r.missing.forEach((t) => console.log(`    · 안 들림: "${t}"`));
  console.log(`    적힌 글: ${r.want}`);
  console.log(`    들린 말: ${r.heard}`);
});
console.log('\n★[CANT_HEAR] 받아쓰기는 틀릴 수 있습니다 — 다시 받기 전에 그 클립을 «귀로» 확인해 주세요.');
console.log('   특히 숫자·고유명사는 받아쓰기가 자주 틀립니다(실측: 「스물아홉 해」→「29회」).');

if (REDUB) {
  const V = man.voice || {};
  const out = [];
  /* ★[PASTE_MAN_ORDER] 차례는 대장 배열 차례다 — 조립기가 그 차례로 자리를 매긴다 */
  const idx = new Map(man.clips.map((c, i) => [`${c.no}_${c.file}`, i]));
  badOnes.slice().sort((a, b) => idx.get(a.id) - idx.get(b.id)).forEach((r) => {
    const v = V[r.role]; if (!v) { console.error(`  · 화자를 못 정해 뺐다: ${r.id} (${r.role})`); return; }
    /* 클립을 **통째로** 다시 받는다 — 한 문장만 갈아 끼우려면 그 클립의 문장 wav 원본이 있어야 하는데
       옛 105클립에는 없다. 통째로 받으면 조립기가 정본대로 다시 만든다 [ONE_SPEC]. */
    r.sents.forEach((t) => out.push(v + ': ' + t));
  });
  const p = path.join(DIR, '재더빙_소리가다른클립.txt');
  fs.writeFileSync(p, out.join('\n') + '\n');
  console.log(`\n→ 뽑았다: ${path.relative(ROOT, p)} (${badOnes.length}클립 · ${out.length}문장 · 대장 배열 차례)`);
  console.log('   클립을 통째로 다시 받습니다 — 옛 클립에는 문장 wav 원본이 없어 한 문장만 갈아 끼울 수 없습니다.');
  badOnes.slice().sort((a, b) => idx.get(a.id) - idx.get(b.id))
    .forEach((r) => console.log(`   · ${r.id} (${r.n}문장)`));
}
process.exit(1);
