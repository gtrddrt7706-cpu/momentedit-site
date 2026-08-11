// 실청 페이지가 낸 대본이 **진짜 관문을 통과하는가** [LISTEN_EXPORT_REAL]
//
//   node scripts/check-listen-export.mjs
//
// ★왜 만들었나 (2026-08-11 · 내가 증명하지 않고 말한 것을 증명한다)
//   audio-review.html 을 만들면서 "내보낸 대본은 기존 조립 파이프라인에 그대로 물린다"고
//   말했다. **그 말을 확인하지 않고 했다.** 실제로 넣어 보니 exit 1 이었다 —
//   복수 화자 클립이 `신랑|신부: …` 로 나갔고, 타입캐스트에는 그런 사람이 없다.
//   꼴만 보면 「이름: 대사」라 멀쩡해 보였고, 화면으로도 멀쩡해 보였다.
//   ★교훈: 「물려 돌아간다」는 주장은 **실제로 물려 봐야** 참이 된다. 눈으로 본 것은 근거가 아니다.
//
// ★이 검사가 하는 일 — 두 벌을 만들지 않는다.
//   붙여넣기 규격을 여기서 다시 정의하지 않는다. 그러면 규격이 둘이 되고, 언젠가 갈라진다.
//   진짜 검사(check-paste-format.mjs)를 **그대로 자식 프로세스로 돌린다.**
//   그 검사가 붉으면 여기도 붉다. 규격이 바뀌면 자동으로 따라간다.
//
// ★상태를 주입하지 않는다 [NO_INJECT]
//   localStorage 에 판정을 심으면 빠르지만, 그러면 판정 화면이 거르던 것도 함께 건너뛴다
//   (이 저장소가 「6코스」 오보로 이미 겪은 병 — S.course 를 직접 넣어 hidden 을 건너뛰었다).
//   그래서 목록 줄과 「다시 필요」 단추를 **실제로 누른다.** 느려도 그것이 사람이 하는 일이다.
//
// ★종료 코드 [CANT_LOOK]  0 통과 · 1 재서 틀림 · 2 재지 못함(브라우저·서버 없음)
// ★[NO_GATE] merge-guard 는 이 검사를 돌리지 않는다 — 브라우저와 로컬 서버가 필요하다.
//   야간 잡(nightly-screen.yml)이 하루 한 번 돌린다.

import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { openProbe } from './audit/page-probe.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PASTE = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/재더빙_붙여넣기.txt');

/* ★남의 파일을 잠깐 빌린다 — 반드시 돌려놓는다.
   진짜 검사는 이 경로 하나만 읽으므로 여기 써야 진짜로 물려 볼 수 있다.
   중간에 죽어도 원상복구되게 exit 훅까지 건다(죽은 자리에 남은 파일이 다음 사람을 속인다). */
const had = fs.existsSync(PASTE);
const backup = had ? fs.readFileSync(PASTE, 'utf8') : null;
let borrowed = false;
const restore = () => {
  if (!borrowed) return;
  borrowed = false;
  if (had) fs.writeFileSync(PASTE, backup);
  else fs.rmSync(PASTE, { force: true });
};
process.on('exit', restore);
process.on('SIGINT', () => { restore(); process.exit(130); });

let h;
try {
  h = await openProbe('audio-review.html', { width: 390, settle: 2500 });
} catch (e) {
  console.log(`· 실청 페이지를 못 열었습니다 — ${e.message}`);
  console.log('  ※ 종료 코드 2 = 재지 못했다(화면 결함 아님) · 1 = 재서 틀렸다');
  process.exit(2);
}

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };

try {
  /* ── ① 목록이 실제로 실렸는가 ── */
  const n = await h.page.evaluate(() => document.querySelectorAll('#list .row[data-i]').length);
  if (!n) {
    console.log('· 클립 목록이 비어 있습니다 — manifest·_recorded 를 못 읽었을 수 있습니다');
    console.log('  ※ 종료 코드 2 = 재지 못했다');
    process.exit(2);
  }

  /* ── ② 전부 「다시 필요」로 누른다 — 화면을 실제로 거쳐서 ── */
  const marked = await h.page.evaluate(() => {
    let k = 0;
    const total = document.querySelectorAll('#list .row[data-i]').length;
    for (let i = 0; i < total; i++) {
      const row = document.querySelector(`#list .row[data-i="${i}"]`);
      if (!row) continue;
      row.click();                                   // go(i) — 무대 다시 그림
      const ng = document.getElementById('ngb');
      if (!ng) continue;
      ng.click();                                    // mark('ng') — 사유 칸 열림
      k++;
    }
    return k;
  });
  if (marked !== n) no(`${n}개 중 ${marked}개만 눌렸습니다 — 판정 단추가 없는 줄이 있습니다`);

  /* ── ③ 대본을 낸다 ── */
  const out = await h.page.evaluate(() => {
    document.getElementById('mkScript').click();
    return {
      script: document.getElementById('out').textContent,
      skipShown: getComputedStyle(document.getElementById('skipNote')).display !== 'none',
      skipText: document.getElementById('skipNote').textContent,
      raw: window.__skipNote || ''
    };
  });

  /* ★[PASTE_NO_COMMENT] 못 넣은 것이 있으면 **상자 밖**에 보여야 한다.
     조용히 빼면 「다시 100개」인데 대본은 99개가 되고, 그 하나를 아무도 안 찾는다.
     값만 세팅하고 화면에 안 띄운 판이 실제로 있었다(이 검사가 그것을 잡으려고 있다). */
  if (out.raw && !out.skipShown) no('빠진 클립이 있는데 화면에 안 보입니다 — window.__skipNote 만 세팅하고 안 띄웠습니다');
  if (out.raw && out.skipShown && !/합성/.test(out.skipText)) no(`빠진 이유가 화면 문구에 안 담겼습니다: ${out.skipText.slice(0, 40)}`);
  if (!out.raw && out.skipShown) no('빠진 것이 없는데 안내가 떠 있습니다');

  /* ★상자 안에는 붙여넣을 것만 — 안내 한 줄도 섞이면 타입캐스트가 읽는다 */
  if (/^#|^\[\d+\]/m.test(out.script)) no('대본 상자에 사람이 읽는 줄이 섞였습니다 — 타입캐스트가 그것도 읽습니다');

  /* ── ④ 진짜 관문에 그대로 넣는다 ── */
  fs.writeFileSync(PASTE, out.script.replace(/\s*$/, '') + '\n');
  borrowed = true;
  /* ★execFileSync 가 아니라 spawnSync — 비정상 종료 시 먼저 던져 버리면
     아래 안내문에 못 닿는다(DUR_SAY_WHY 와 같은 처방). */
  const r = spawnSync(process.execPath, ['scripts/check-paste-format.mjs'], { cwd: ROOT, encoding: 'utf8' });
  restore();

  const lines = out.script.split('\n').filter((l) => l.trim()).length;
  console.log(`━━ audio-review.html @390  클립 ${n}개 전부 「다시」로 눌러 대본 ${lines}줄을 냈습니다`);
  if (out.raw) console.log(`   ☐ 대본에서 빠진 것: ${out.raw}`);
  console.log('   ── 진짜 검사(check-paste-format.mjs)에 그대로 넣은 결과 ──');
  (r.stdout || '').split('\n').filter(Boolean).forEach((l) => console.log('   │ ' + l));
  (r.stderr || '').split('\n').filter(Boolean).forEach((l) => console.log('   │ ' + l));

  if (r.error) no(`진짜 검사를 돌리지 못했습니다 — ${r.error.message}`);
  else if (r.status !== 0) no(`실청 페이지가 낸 대본이 붙여넣기 규격을 통과하지 못했습니다 (종료 ${r.status})`);
  else console.log('   ✓ 통과 — 내보낸 대본이 기존 조립 규격 그대로입니다');
} finally {
  restore();
  await h.close();
}

if (bad) {
  console.error('\n✗ 실청 페이지의 대본 내보내기에 문제가 있습니다');
  process.exit(1);
}
console.log('\n✓ LISTEN EXPORT OK — 「물려 돌아간다」를 말이 아니라 실행으로 확인했습니다');
