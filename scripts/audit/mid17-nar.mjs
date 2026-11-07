#!/usr/bin/env node
/* ★[MID17_NAR_1107 2026-11-07 대본 정정 · 사장님 «129 는 식전 영상 문장»] 식중 영상 전용 대본(MID17-3 · 6 · 10) 검사
   a 여는 말 예시 셋 · 기본 ① — ① 58 + midvideo-in-thanks · ② midvideo-in-story · ③ midvideo-in-plain → 영상(live)
   b 받는 말 — ① midvideo-out-thanks + 104 · ②③ midvideo-out-story + 104 · 104 뒤 박수 → 다음 순간은 디렉터 GO
   c 129 는 식중 영상에 나오지 않는다(반려) · 축사 갈래는 그대로
   d 식순 화면 «소개 멘트» 줄 · 글 판(nar · end)은 엔진 줄 · 미리듣기 KEYS 에 mvEx · 콘솔 재생 순서 기록
   MID17_CUE · MID17_OP · MID17_CON = 깨 보기용 다른 판 · 종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
const P = (e, f) => process.env[e] || path.join(ROOT, f);
const C = require(P('MID17_CUE', 'assets/ritual-cue.js')); const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const seq = (S) => C.build(Object.assign({ course: 'open', on: { prevideo: 1, declare: 1, free: 1, song: 1 }, freeWhat: 'video', freeLen: '4' }, S), { mode: 'console' }).cues
  .filter((c) => c.k === 'free').map((c) => c.slug + (c.live ? '+live' : ''));
const J = (x) => JSON.stringify(x);
ok('a ① 감사 영상(기본) = 58 + 감사 → 영상 → 감사 받는 말 + 104 박수', J(seq({})) === J(['narr-free-in', 'midvideo-in-thanks+live', 'midvideo-out-thanks', 'narr-free-out-clap+live']), seq({}));
ok('a ② 두 사람 이야기', J(seq({ mvEx: 1 })) === J(['midvideo-in-story+live', 'midvideo-out-story', 'narr-free-out-clap+live']), seq({ mvEx: 1 }));
ok('a ③ 어떤 영상이든', J(seq({ mvEx: 2 })) === J(['midvideo-in-plain+live', 'midvideo-out-story', 'narr-free-out-clap+live']), seq({ mvEx: 2 }));
ok('a 모르는 값은 기본 ①', J(seq({ mvEx: 9 })) === J(seq({})), seq({ mvEx: 9 }));
ok('c 129(식전 영상 문장)는 식중 영상에 없다 · 식전 영상 129 와 상관없이 같은 줄', ![0, 1, 2].some((n) => seq({ mvEx: n }).some((s) => /prevideo-in-ex3/.test(s))) && J(seq({ pvEx: 2 })) === J(seq({})));
ok('c 축사 갈래는 그대로(103 + 박수)', seq({ freeWhat: 'speech' })[0] === 'narr-free-in-speech+live', seq({ freeWhat: 'speech' }));
const bl = C.build({ course: 'open', on: { free: 1, song: 1 }, freeWhat: 'video' }, { mode: 'console' }).cues;
const i104 = bl.findIndex((c) => c.k === 'free' && c.slug === 'narr-free-out-clap');
ok('b 104 박수 뒤 다음 순간은 디렉터 GO', i104 > 0 && bl[i104].live && bl[i104].live.applause && bl[i104 + 1] && bl[i104 + 1].fire === 'manual', bl[i104 + 1] && bl[i104 + 1].fire);
ok('a 이름 셋 · 기본 ①', J(O.MV_EX_NAMES) === J(['감사 영상', '두 사람 이야기', '어떤 영상이든']) && O.midPlan({}).n === 0);
const op = fs.readFileSync(P('MID17_OP', 'order-preview.html'), 'utf8'), con = fs.readFileSync(P('MID17_CON', 'console.html'), 'utf8'), lk = fs.readFileSync(path.join(ROOT, 'assets/ritual-preview-link.js'), 'utf8');
ok('d 식순 화면 «소개 멘트» 줄(식전 영상 소개 멘트와 같은 모양)', /_exRowG\('exMvNar','소개 멘트',R\.MV_EX_NAMES,R\.midPlan\(S\)\.n,'mkMvNarEx'/.test(op) && /window\.mkMvNarEx=function/.test(op));
ok('d 글 판 = 엔진 줄(여는 말 · 받는 말 · 손 사본 없음)', /_k==='video'\?_midNar\(\):FREE_IN/.test(op) && /end:\(_k==='video'\?_midNar\(1\)/.test(op));
ok('d 미리듣기 주소에 mvEx', /'mvEx',/.test(lk));
ok('d 콘솔 재생 순서 기록(낸 줄 · 사람 순간)', (con.match(/plogPush\(/g) || []).length >= 3 && /var PLAY_LOG = window\.PLAY_LOG = \[\]/.test(con));
console.log(fail ? `MID17 NAR FAIL ${fail}` : 'MID17 NAR OK'); process.exit(fail ? 1 : 0);
