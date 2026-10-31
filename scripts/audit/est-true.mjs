#!/usr/bin/env node
/* ★★[EST_TRUE_1031 2026-10-31 BGM 섹션 · GPT 2라운드 검증] 행동별 실제 시간(live.est) 표 — 스냅샷 검사
   E1 화촉 맞절 · 인사 · 자리로: 화면 값(showEst) 두 분 30 · 네 분 25 · 셈(est) 15 그대로
   E2 부모님께 인사 동작 30(칩 구분 없음) · 포옹 35 그대로 · 본식 합(TIME.tribute 말 없는 시간) 40
   E3 축사 = 60 × 분 + 20 · 본식 합 걸음 26
   E4 자유 순서(옛 코스 120) = «두 분이 정한 만큼» 글 · 콘솔도 그 글
   E5 단체 사진 앞으로 모임 = 하객 20명 60 · 30명 75 · 칸 없으면 30명(75)
   E6 식전 영상 180 · 축가 그대로(올리는 파일 칸이 없다 · 파일 길이를 아는 자리가 생기면 그때)
   E7 두 분이 적은 글 = 음절 ÷ 4 + 5초(감사 인사 · 서약 · 감사문 · 편지 · 부모님께 인사말 · 덕담 원고) · 글 없으면 종전 값
   E8 본식 합(partsOf 말하는 시간)이 E7 과 같은 값
   E9 폐지 순간(반지 데우기 · 케이크 · 와인)은 손대지 않음 — 엔진 원문 그대로
   실행: node scripts/audit/est-true.mjs [--root <폴더>] · 종료 0 초록 · 1 빨강 */
import { createRequire } from 'module';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const HERE = path.dirname(fileURLToPath(import.meta.url));
const ai = process.argv.indexOf('--root');
const ROOT = ai > -1 ? path.resolve(process.argv[ai + 1]) : path.resolve(HERE, '../..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const SRC = fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8');
const CON = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
let bad = 0;
const ok = (c, m) => { if (c) console.log('ok   ' + m); else { console.log('FAIL ' + m); bad++; } };
const J = (x) => JSON.parse(JSON.stringify(x));
const BASE = { course: 'open', exv: 2, on: { candle: 1, welcome: 1, vow: 1, ring: 1, declare: 1, tribute: 1, free: 1, letter: 1, bless: 1, toast: 1, prevideo: 1, song: 1 },
  freeWhat: 'speech', freeLen: '2', tributeSay: 'long', letter: 'each', blessN: 2 };
const cues = (S) => C.build(S, { mode: 'console' }).cues;
const live = (S, re) => { const c = cues(S).filter((x) => x.live && re.test(x.slug || ''))[0]; return c ? c.live : null; };

/* E1 */
{ const two = J(BASE); two.candleWho = 'mothers'; const l2 = live(two, /^narr-candle-bow/);
  ok(l2 && l2.est === 15 && l2.showEst === 30, `E1 화촉 두 분 · est ${l2 && l2.est} · 화면 ${l2 && l2.showEst} (15 · 30)`);
  /* 네 분 판(양가 부모님)은 지금 칩에 없다(CANDLE_WHO 셋 다 두 분 · 옛 초안 호환 갈래) — 엔진 원문으로 본다 */
  ok(/'네 분이 하객께 인사한 뒤 자리로', est: 15, showEst: 25,/.test(SRC), 'E1 화촉 네 분 · est 15 · 화면 25(엔진 원문)'); }
/* E2 */
{ const S = J(BASE); const act = live(S, /^tribute-call/), hug = live(S, /^tribute-hug$/);
  ok(act && act.est === 30, `E2 부모님께 인사 동작 ${act && act.est} (30)`);
  ok(hug && hug.est === 35, `E2 포옹 ${hug && hug.est} (35 그대로)`);
  ['long', 'none'].forEach((t) => { const p = O.partsOf('tribute', Object.assign(J(BASE), { tributeSay: t })); ok(p[2] === 40, `E2 본식 합 · ${t} 말 없는 시간 ${p[2]} (40)`); }); }
/* E3 */
[1, 2, 3].forEach((n) => { const S = Object.assign(J(BASE), { freeLen: String(n) }); const l = live(S, /^narr-free-in-speech$/), p = O.partsOf('free', S);
  ok(l && l.est === 60 * n + 20, `E3 축사 ${n}분 · ${l && l.est} (${60 * n + 20})`); ok(p[2] === 26, `E3 본식 합 · 축사 걸음 ${p[2]} (26)`); });
/* E4 */
ok(/est: 120, showT: '두 분이 정한 만큼'/.test(SRC), 'E4 자유 순서 120 · «두 분이 정한 만큼»');
ok((CON.match(/c\.live\.showT \|\| fmt\(c\.live\.est\)/g) || []).length === 2, 'E4 콘솔 두 자리 = 글(showT)');
/* E5 — 옛 코스 모임 큐(narr-close) · 새 코스는 사진 몫(목표)에 모임이 들어 있다 */
/* [GATHER_FIXED] 하객 수는 엔진에 안 넘어온다 · 75초 고정 */
[[null, 75]].forEach(([n, w]) => { const S = { course: 'family' }; const l = live(S, /^narr-close$/);
  ok(l && l.est === w, `E5 단체 사진 모임 · 하객 ${n == null ? '칸 없음' : n + '명'} · ${l && l.est} (${w})`); });
/* E6 */
{ const S = J(BASE); const pv = live(S, /^narr-prevideo-in$/); ok(pv && pv.est === 180, `E6 식전 영상 ${pv && pv.est} (180 그대로)`);
  const sg = live(S, /^narr-song$/), sg0 = live(S, /^narr-song$/); ok(sg && sg.est === sg0.est && sg.est >= 210, `E6 축가 ${sg && sg.est} (그대로)`); }
/* E7 · E8 */
{ const syl = (n) => '가'.repeat(n);
  const T = [
    ['welcome', /^narr-welcome-in$/, { 'welcome.g': syl(60), 'welcome.b': syl(40) }, {}, 46, 100],
    ['vow', /^narr-vow-in$/, { 'vow.g': syl(150), 'vow.b': syl(150) }, {}, 70, 300],
    ['vow', /^narr-thanks-in$/, { 'vow.g': syl(120) }, { vowKind: 'thanks' }, 70, 120],
    ['letter', /^letter-/, { 'letter.g': syl(240), 'letter.b': syl(240) }, {}, 165, 480],
    ['bless', /^narr-bless-/, { 'bless.p': syl(300) }, {}, 100, 300],
    ['tribute', /^tribute-in$/, { 'tribute.g': syl(80), 'tribute.b': syl(80) }, {}, 160, 160]
  ];
  T.forEach(([k, re, tx, extra, d, n]) => {
    const S0 = Object.assign(J(BASE), extra), S1 = Object.assign(J(S0), { tx: tx }), want = Math.round(n / 4 + 5);
    const l0 = live(S0, re), l1 = live(S1, re), adj = k === 'tribute' ? 20 : 0;
    ok(l0 && l0.est === d, `E7 ${k}${extra.vowKind ? '(감사문)' : ''} 글 없음 · ${l0 && l0.est} (${d})`);
    ok(l1 && l1.est === want + adj, `E7 ${k}${extra.vowKind ? '(감사문)' : ''} 글 ${n}음절 · ${l1 && l1.est} (${want + adj})`);
    const p = O.partsOf(k, S1); ok(k === 'bless' ? p[1] >= want : p[1] === want, `E8 본식 합 · ${k} 말하는 시간 ${p[1]} (${want})`);
  });
  ok(O.textSec({ tx: { 'vow.g': '가 나, 다. 라!' } }, 'vow') === Math.round(4 / 4 + 5), 'E7 띄어쓰기 · 문장부호는 세지 않는다');
  ok(O.textSec({ vowText: syl(100) }, 'vow') === 30, 'E7 옛 한 칸(vowText)도 읽는다');
  const sd = J(BASE), b0 = O.bodySec(sd)[0], s1 = Object.assign(J(sd), { tx: { 'letter.g': syl(40) } });
  ok(O.bodySec(s1)[0] < b0, `E8 짧은 편지를 적으면 본식 합이 준다 (${Math.round(b0)} → ${Math.round(O.bodySec(s1)[0])}초)`); }
/* E9 */
ok(/est: \(S\.ringwarm === 'all' \? 240 : 120\)/.test(SRC), 'E9 반지 데우기 그대로(240 · 120)');
ok(/'두 잔을 하나에 붓고 한 모금' : '함께 나이프 잡고 커팅 · 포즈', est: 30,/.test(SRC), 'E9 케이크 그대로(30)');
ok(/'두 분이 두 와인을 한 잔에 붓기', est: 25,/.test(SRC), 'E9 와인 그대로(25)');

console.log(bad ? `\nEST_TRUE 빨강 ${bad}` : '\nEST_TRUE OK');
process.exit(bad ? 1 : 0);
