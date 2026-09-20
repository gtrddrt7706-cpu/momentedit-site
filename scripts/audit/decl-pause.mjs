#!/usr/bin/env node
// 선언문 앞뒤 무음이 «실제로» 얹혔는지 manifest 를 재서 본다 [DECL_PAUSE_LIVE] (2026-09-20)
//
// ★왜 — 종전 게이트는 `chk 'DECL_PAUSE_POS' ...` 로 **마커 문자열만** 봤다. 그 문자열은
//   내내 살아 있었는데, 정작 무음을 얹는 조건(`s.text === DECL_LINE`)이 사문화돼 있었다.
//   [PERF_CANON_2] 가 호명 「신랑 신부,」를 빼면서 문면이 바뀌었는데 상수는 옛 문장 그대로였고,
//   그래서 2026-08-17 이후 선언문 앞뒤 무음이 **한 번도 안 들어갔다.**
//   manifest 실측이 증거였다 — 전 문장이 after=0.45 로 균일했다.
//   ★사장님이 실청에서 「다다다」라고 하신 것의 «소리 쪽» 원인이다(문면이 아니라 간격).
//   ★통과만 하는 게이트는 죽은 게이트다. 그래서 문자열이 아니라 **값을 잰다.**
//
// 재는 것 — 선언문(정점)과 답 시연이 이웃 문장보다 «실제로» 넓게 떨어져 있나.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const M = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8'));
const DECL = '이제 두 사람은 부부입니다.';
const DEMO = '네, 그러겠습니다.';
const BASE = 0.45;   // 보통 문장 사이(GAP.sent)

let bad = 0;
const no = (m) => { console.error('✗ ' + m); bad++; };
console.log('\n선언문·답 시연 앞뒤 무음이 실제로 얹혔나 [DECL_PAUSE_LIVE]\n');

let found = 0;
/* ★★[GAP_IS_SUM 2026-09-20] 실제로 들리는 간격은 한 값이 아니라 «앞 문장의 after + 이 문장의 before» 다.
   내가 처음에 after 만 보고 「선언문 뒤가 0.40이라 보통(0.45)보다 좁다」고 붉혔는데, 앞 간격은
   0.45+0.25 = 0.70 으로 이미 넓었다. 한 칸만 보면 틀린다 — 두 칸을 더해야 그 자리의 침묵이다.
   ★[NOT_THE_SOURCE] 내가 짠 검사 결과를 원본으로 믿지 않는다. 값 정의부터 원본을 봐야 했다. */
for (const c of M.clips) {
  if (c.mix) continue;
  const ss = c.sents || [];
  for (let i = 0; i < ss.length; i++) {
    const s = ss[i];
    if (s.text !== DECL && s.text !== DEMO) continue;
    found++;
    const id = `${c.no}_${c.file}`;
    const prevAfter = i > 0 ? (ss[i - 1].after ?? 0) : null;   // 클립 첫 문장이면 head 가 맡는다
    const gapBefore = prevAfter === null ? null : prevAfter + (s.before || 0);
    const last = i === ss.length - 1;
    const gapAfter = last ? null : (s.after ?? 0) + (ss[i + 1].before || 0);   // 마지막이면 tail 이 맡는다
    /* 지키는 것은 하나다 — «정점 앞의 침묵이 보통 문장 사이보다 넓은가». 그게 이 장치의 목적이다.
       뒤 간격은 붉히지 않고 값만 찍는다 — 넓고 좁음의 «판정»은 귀로 하는 일이라 기계가 못 한다. */
    if (gapBefore !== null && gapBefore <= BASE)
      no(`${id} — 「${s.text}」 앞 침묵이 ${gapBefore.toFixed(2)}초로 보통(${BASE}) 이하다. 정점이 앞말에 붙어 나간다`);
    else
      console.log(`  ok ${id.padEnd(26)} 앞 ${gapBefore === null ? 'head' : gapBefore.toFixed(2)}`
        + ` · 뒤 ${gapAfter === null ? 'tail' : gapAfter.toFixed(2)}   「${s.text.slice(0, 18)}」`);
  }
}

/* ★자리를 하나도 못 찾으면 «조용한 통과»다 — 그게 이 검사를 만든 이유다. */
if (!found) no('선언문·답 시연 문장을 manifest 에서 하나도 못 찾았다 — 문면이 또 바뀌었을 수 있다. '
  + `찾던 것: 「${DECL}」 · 「${DEMO}」. scripts/build-typecast-import.mjs 의 DECL_LINE/DEMO_LINE 을 대조할 것`);

console.log(`\n  찾은 자리 ${found}곳`);
if (bad) { console.error('\n✗ 선언 무음이 얹히지 않는다 — build-typecast-import.mjs 의 DECL_LINE 이 실제 문면과 같은지 볼 것.'); process.exit(1); }
console.log('✓ DECL PAUSE OK\n');
