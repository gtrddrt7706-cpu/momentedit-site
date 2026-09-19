// 결정을 적어 놓고 «지키는 검사»를 안 만든 자리를 찾는다 [DECISION_GUARD]
//
// 사장님 「누락이 있으면 지금것 준비한 이유가없어 누락이발생한이유를 찾아네고
//         그거를 예방할수있는장치를만들어」 · 「누락된게없는지 하나씩복귀하면서 찾아내」
//
// ═══ 이번 세션에 난 누락들의 «공통 모양» ═══
//   [PHOTO_FREE]   사장님이 6일 전에 「사진 호명·동선 빼라」 하셨는데 문서에만 있고 코드엔 안 내려왔다.
//   [TERM_DIGITAL] 「고객 글에서 온라인 빼라」 결정이 게이트 주석에 적혀만 있고 실행이 안 됐다.
//   「다 지웠어」    apply-letter-cost 가 「편지에만 남긴다」고 정하고 걷어냈는데, 다음 판이 조용히 되살렸다.
//   [ENTRY_OUT_DRIFT] 주석이 「다섯 다 이 문장으로 닫는다」고 적었는데 실제로는 한 갈래에만 있었다.
//   [FRAME_OUT]    내가 [27]의 전제를 「어머니는 프레임 밖」으로 적어 놓고, [14]가 그 전제를 깨는지 안 봤다.
//
//   다섯 다 «결정이 틀려서»가 아니다. 전부 **결정을 적은 사람이 그 결정을 지키는 검사를 안 만들어서**다.
//   주석은 사람이 읽어야 작동하고, 사람은 7,000줄을 매번 읽지 않는다.
//
// ═══ 그래서 이 검사가 하는 일 ═══
//   merge-guard 안에서 «결정»이라고 선언한 주석 덩어리를 전부 찾아, 그 덩어리 «바로 뒤»에
//   그 결정을 지키는 검사(chk·nochk·fail=1 분기)가 하나라도 있는지 본다. 없으면 이름을 댄다.
//   ★이건 결정이 옳은지 보는 검사가 아니다. «결정이 기계에 걸려 있는지»만 본다.
//     옳고 그름은 사람이 정하고, 살아 있는지는 기계가 지킨다 — 그 역할을 섞지 않는다.
//
// ★왜 merge-guard 만 보나 — 결정이 여기 안 적혔으면 애초에 지킬 자리가 없다.
//   apply-*.mjs 주석은 «그때 왜 그랬나»의 기록이고, 게이트가 «지금도 그런가»를 본다. 층이 다르다.

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '../..');
const GATE = path.join(ROOT, 'automation/tests/merge-guard.sh');
const L = fs.readFileSync(GATE, 'utf8').split('\n');

/* 결정을 선언하는 말 — 이 말이 들어간 주석은 «사람이 정한 것»이라는 뜻이다. */
const DECLARE = /(사장님 결정|사장님 지시|사용자 지시|사장님 지적|사용자 지적|사장님 원문|사용자 원문)/;
/* 지키는 장치 — chk·nochk 는 마커 검사, fail=1 은 직접 판정, node 실행은 하위 검사 호출이다.
   ★처음엔 앞의 셋만 봤다가 다섯 건을 오탐했다 — 전부 `if command -v node …` 로 지키고 있었다.
     «검사가 있는데 없다»고 말하는 검사는 없는 것만 못하다. 실제 게이트의 네 가지 모양을 다 담는다. */
const GUARD = /^\s*(chk |nochk |_[a-z]+=\$\(|if .*fail=1|case .*in$|if command -v node|node scripts\/)|fail=1/;
/* 지킬 수 없다고 «명시»한 것은 통과시킨다 — 사장님 결정 대기·폐지 기록은 지킬 대상이 아니다. */
const EXEMPT = /(결정 대기|사장님 결정으로 넘|폐지|되살리지 말 것은 아래|안 함\]|보고만)/;

const blocks = [];
let cur = null;
for (let i = 0; i < L.length; i++) {
  const isComment = /^\s*#/.test(L[i]);
  if (isComment) {
    if (!cur) cur = { from: i, lines: [] };
    cur.lines.push(L[i]);
    continue;
  }
  if (cur) { cur.to = i; blocks.push(cur); cur = null; }
}
if (cur) { cur.to = L.length; blocks.push(cur); }

const WINDOW = 14;   // 주석 덩어리 뒤 몇 줄 안에 검사가 있어야 하는가
const naked = [];
let decided = 0;
for (const b of blocks) {
  const text = b.lines.join('\n');
  if (!DECLARE.test(text)) continue;
  decided++;
  if (EXEMPT.test(text)) continue;
  let guarded = false;
  for (let i = b.to; i < Math.min(b.to + WINDOW, L.length); i++) {
    if (/^\s*#/.test(L[i]) || !L[i].trim()) continue;
    if (GUARD.test(L[i])) { guarded = true; break; }
    break;                       // 주석도 검사도 아닌 줄이 먼저 나오면 그 덩어리는 끝난 것이다
  }
  if (!guarded) {
    const name = (text.match(/\[([A-Z][A-Z0-9_]{2,})/) || [])[1] || '(이름 없음)';
    const said = (text.match(/「([^」]{6,60})」/) || [])[1] || text.replace(/^\s*#\s?/gm, '').trim().slice(0, 60);
    naked.push({ line: b.from + 1, name, said });
  }
}

/* ═══ 두 번째 층 — apply 스크립트에 적힌 결정이 게이트까지 왔는가 [APPLY_TO_GATE] ═══
   ★이번 세션의 진짜 구멍이 여기였다. 「다 지웠어」 중복 제거는 apply-letter-cost.mjs 주석에만 있었고
     게이트에 안 걸려서, 다음 판(apply-letter-formal.mjs)이 조용히 되살렸다. 아무도 못 잡았다.
     [FRAME_OUT] 도 같다 — [27]의 전제를 apply-groom-parent.mjs 주석에 적어 놓고 게이트에 안 걸었다.
   ★규칙: apply·audit 스크립트가 ★[이름] 으로 결정을 선언했으면, 그 이름이 merge-guard 에 있어야 한다.
     게이트에 이름이 없으면 그 결정은 «다음 판이 지워도 되는 것»이 된다.
   ★이름이 한글이면 게이트에 걸 수가 없다(문자열 검사의 열쇠가 못 된다) — 그것도 알려 준다.
     「다 지웠어」 사고의 그 주석이 정확히 「★[중복 제거]」였다. 이름을 안 지은 결정은 지킬 수 없다. */
const gateText = fs.readFileSync(GATE, 'utf8');
const SCRIPTS = fs.readdirSync(path.join(ROOT, 'scripts'))
  .filter((f) => /^apply-.*\.mjs$/.test(f)).map((f) => 'scripts/' + f)
  .concat(fs.readdirSync(path.join(ROOT, 'scripts/audit')).filter((f) => /\.mjs$/.test(f)).map((f) => 'scripts/audit/' + f));
const orphan = [];
for (const rel of SCRIPTS) {
  const src = fs.readFileSync(path.join(ROOT, rel), 'utf8');
  const seen = new Set();
  for (const m of src.matchAll(/★+\[([^\]\s]+)/g)) {
    const id = m[1];
    if (seen.has(id)) continue; seen.add(id);
    /* ★한글 괄호는 세지 않는다. 이 저장소는 «★[...]» 를 이름으로도 쓰고 문장 괄호로도 쓴다
         (★[중복 제거] 는 이름이고 ★[증거를 전수로 세니 …] 는 글이다). 둘을 길이·조사로 가르려다
         68건을 쏟아 냈다 — 그중 대부분이 문장이었다.
       ★거짓말하는 검사는 없는 것만 못하다. 가를 수 없으면 세지 않는다.
         대신 규칙을 사람 쪽에 둔다 — «지켜야 할 결정에는 영문 대문자 이름을 짓는다».
         이름을 지으면 아래 검사가 게이트까지 따라왔는지 봐 준다. */
    if (!/^[A-Z][A-Z0-9_]{2,}$/.test(id)) continue;
    if (!gateText.includes(id)) orphan.push({ rel, id });
  }
}

console.log(`[DECISION_GUARD] 결정이라고 선언한 주석 ${decided}덩어리 · 지키는 검사가 없는 것 ${naked.length}건`);
for (const n of naked) console.log(`   merge-guard.sh:${String(n.line).padStart(4)}  [${n.name}]  ${n.said}`);
if (naked.length) {
  console.log('');
  console.log('   ★결정을 적었으면 그 아래에 그것을 지키는 검사를 «같은 커밋에» 넣는다.');
  console.log('     검사가 없으면 다음 판이 조용히 되돌려도 아무도 모른다 — 이번 세션에 다섯 번 그랬다.');
  console.log('     지킬 수 없는 결정(사장님 대기·폐지 기록)이면 주석에 그렇게 적으면 통과한다.');
}

console.log(`[APPLY_TO_GATE] apply·audit 스크립트의 결정 이름 중 게이트에 없는 것 ${orphan.length}건`);
for (const o of orphan) console.log(`   ${o.rel}  [${o.id}]  — 게이트에 이 이름이 없다`);
if (orphan.length) {
  console.log('');
  console.log('   ★결정에 영문 대문자 이름을 지어 게이트에 그 이름을 건다. 그래야 다음 판이 지우면 빨개진다.');
  console.log('     이름 없는 결정은 «그때 그렇게 생각했다»는 일기이지, 지켜지는 결정이 아니다.');
}
process.exit((naked.length + orphan.length) ? 1 : 0);
