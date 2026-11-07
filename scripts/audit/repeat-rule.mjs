#!/usr/bin/env node
/* ★★[REPEAT_RULE_1107 2026-11-07 BGM 섹션 → 입장 세션 묶음 H · 대본 판정] 곡 반복 규칙 — BgmPicks.plan 한 곳
   예시 4코스(정석 · 기록 · 가족 · 간결) × 고른 곡 3조합 × 곡 길이 2가지(모두 240초 · 곡마다 다른 길이)로 하루를 모의로 돈다
   (한 곡 칸은 그 칸 길이 동안 한 곡 · 목록 칸은 계획 목록을 차례로 돌다 끝나면 처음으로 = 콘솔 · 미리 듣기 엔진과 같은 걸음).
   1 같은 칸 안 반복 0 — 그 칸에 쓸 수 있는 곡(제 곡 + 앞 배경 칸에서 나온 곡 · 의미 곡 뺌)이 칸 길이를 채울 수 있으면(30분 테이블 인사 포함)
   2 의미 곡 · 고른 곡 두 번 0 — 한 곡 칸의 곡 · 두 분이 고른 곡(본식 · 닫는 인사 포함) · 마지막 곡 첫 곡은 제 칸에서만(ⓐ 부모님께 인사 B16 · ⓑ 본식 B11 → 마지막 곡 목록)
   3 마지막 곡 칸(추가 촬영 약 17분) 반복 0 — 다 돌면 앞 배경 칸 곡을 빌려 온다(ⓒ)
   4 40분 안 같은 곡 — 바로 앞 칸이 아닌 곡으로 채울 수 있으면 0(가능한 범위 · 남는 것은 줄 수로 알린다)
   5 대조 — 곡이 충분하고 뺄 곡이 없는 칸은 종전 차례 그대로(main 의 plan 과 같은 목록)
   BP_PICKS=<bgm-picks.js 경로>(깨 보기) · 종료 코드 0 통과 · 1 실패 */
import path from 'node:path'; import fs from 'node:fs'; import os from 'node:os'; import { createRequire } from 'node:module'; import { execSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = require(process.env.BP_PICKS ? path.resolve(process.env.BP_PICKS) : path.join(ROOT, 'assets/bgm-picks.js'));
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
let OLD = null; try { const t = path.join(os.tmpdir(), 'rr-old-picks-' + process.pid + '.js'); fs.writeFileSync(t, execSync('git show origin/main:assets/bgm-picks.js', { cwd: ROOT, stdio: ['ignore', 'pipe', 'ignore'] })); fs.copyFileSync(path.join(ROOT, 'assets/ritual-data.js'), path.join(os.tmpdir(), 'ritual-data.js')); OLD = require(t); } catch (e) { OLD = null; }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
const SPAN = { M2: 130, M3: 300, M5: 300, M7: 90, M8L: 1020 }, GAP = 2400;
const segOnOf = (S) => { const on = Object.keys(S.on || {}).filter((k) => S.on[k]); return (sg) => { const d = P.seg(sg); if (!d) return false; if (d.parent) return true; return d.ks.some((k) => on.includes(k) || k === 'guest' || k === '_close'); }; };
const hash = (s) => [...s].reduce((a, c) => (a * 31 + c.charCodeAt(0)) >>> 0, 7);
const DUR0 = { L240: () => 240, VAR: (f) => 150 + (hash(f) % 181) };   /* 곡마다 150 ~ 330초(고정) */
const DUR = Object.fromEntries(Object.entries(DUR0).map(([k, fn]) => [k, (f) => (P.lenOf ? P.lenOf(f, fn(f)) : fn(f))]));   /* [REPEAT_FIX_1107 ③] 곡 끝 = min(파일, 원곡 len) — 엔진과 같다 */
const COMBO = { C0: {}, C1: { M5: 'B16', M4: 'B11', M2: 'B31' }, C2: { M5: 'B15', M6: 'B34', M7: 'B22', M4: 'B10', M2: 'B07' } };
const need = (sg) => sg === 'M8L' ? SPAN.M8L : (P.NEED[sg] || 0);
function day(S, on, dur, R) {   /* 계획 R 를 엔진처럼 돈다 — [{seg, f, t}] */
  const ev = []; let t = 0;
  P.CORDER.filter(on).forEach((sg) => { const r = R[sg]; if (!r) return;
    if (!P.loopy(sg)) { if (r.first) ev.push({ seg: sg, f: r.first, t }); t += SPAN[sg] || 0; if (sg === 'M2') t += SPAN.M3; return; }
    const L = r.list || []; let u = 0, i = 0; while (L.length && u < need(sg)) { const f = L[i % L.length]; ev.push({ seg: sg, f, t: t + u }); u += dur(f); i++; } t += need(sg); });
  return ev; }
const R0 = {};
for (const ex of O.EXAMPLES.map((e) => e.k)) for (const [cn, pk] of Object.entries(COMBO)) for (const [dn, dur] of Object.entries(DUR)) {
  const S = O.applyExample({ course: 'open' }, ex); S.bgm = {}; Object.entries(pk).forEach(([sg, k]) => { S.bgm[sg] = { k }; }); const on = segOnOf(S), tag = `${ex}·${cn}·${dn}`;
  const R = P.plan(S, { on, dur }), ev = day(S, on, dur, R);
  /* 의미 곡 · 고른 곡(검사 쪽에서 따로 센다) */
  const once = {}; P.CORDER.filter(on).forEach((sg) => { if (!P.loopy(sg) && R[sg] && R[sg].first) once[R[sg].first] = once[R[sg].first] || sg; const k = P.custK(S, sg); if (k) once[k] = once[k] || sg; });
  if (on('M8L') && R.M8L && R.M8L.first) once[R.M8L.first] = once[R.M8L.first] || 'M8L';
  const segsOf = (f) => [...new Set(ev.filter((x) => x.f === f).map((x) => x.seg))];
  const twice = Object.keys(once).filter((f) => segsOf(f).some((s) => s !== once[f] && !(P.carryOf(S, s, R[once[f]] && R[once[f]].first) === f)));
  /* 같은 칸 안 반복 — 그 칸에 쓸 수 있는 곡이 칸을 채울 수 있을 때만 센다 */
  const rep = [], played = new Set();
  P.CORDER.filter(on).forEach((sg) => { const es = ev.filter((x) => x.seg === sg); if (P.loopy(sg)) { const pool = new Set((P.order(S, sg, '', () => false)).concat([...played].filter((f) => !(P.BORROW_ONLY && P.BORROW_ONLY[sg]) || P.BORROW_ONLY[sg][f])).filter((f) => !(once[f] && once[f] !== sg)));   /* [REPEAT_FIX_1107 안 1] 본식은 피아노 곡만 빌린다 */
      const cap = [...pool].reduce((a, f) => a + dur(f), 0), seen = {}; es.forEach((x) => { if (seen[x.f] && cap >= need(sg)) rep.push(`${sg}:${x.f}@${Math.round(x.t / 60)}분`); seen[x.f] = 1; }); }
    es.forEach((x) => { if (P.loopy(sg)) played.add(x.f); }); });
  /* 40분 안 같은 곡(다른 칸) */
  const near = []; const last = {}; ev.forEach((x) => { const p = last[x.f]; if (p && p.seg !== x.seg && x.t - p.t < GAP) near.push(`${x.f} ${p.seg}→${x.seg} ${Math.round((x.t - p.t) / 60)}분`); last[x.f] = x; });
  R0[tag] = { rep, twice, near, R, S, on, dur };
}
const all = Object.entries(R0), bad = (k) => all.filter(([, v]) => v[k].length).map(([t, v]) => t + ' ' + v[k].slice(0, 3).join(' · '));
ok(`1 같은 칸 안 반복 0 — 칸을 채울 곡이 있으면(${all.length}판 · 30분 테이블 인사 포함)`, !bad('rep').length, bad('rep').slice(0, 6));
ok('2 의미 곡 · 고른 곡 두 번 0 (ⓐ 부모님께 인사 곡이 하객 맞이 목록에 · ⓑ 본식에 고른 곡이 마지막 곡 목록에)', !bad('twice').length, bad('twice').slice(0, 6));
const a1 = R0['standard·C1·L240'], b1 = R0['record·C1·VAR'];
ok('2a ⓐ 부모님께 인사 B16 → 하객 맞이 · 테이블 목록에 없다', !a1.R.M1.list.includes('B16') && !(b1.R.M8 && b1.R.M8.list.includes('B16')), { M1: a1.R.M1.list, M8: b1.R.M8 && b1.R.M8.list });
ok('2b ⓑ 본식에 고른 B11 → 마지막 곡 목록에 없다', !a1.R.M8L.list.includes('B11') && !b1.R.M8L.list.includes('B11'), { M8L: a1.R.M8L.list });
const m8l = all.filter(([t]) => /·L240$/.test(t)).map(([t, v]) => [t, v.rep.filter((x) => /^M8L/.test(x))]).filter(([, r]) => r.length);
ok('3 ⓒ 마지막 곡 칸(추가 촬영 약 17분) 반복 0 — 앞 배경 칸 곡을 빌려 온다', !m8l.length && a1.R.M8L.list.length > 3, { m8l: m8l.slice(0, 3), M8L: a1.R.M8L.list });
const t8 = R0['record·C0·L240'];
ok('1a 테이블 인사 30분 — 제 곡을 다 돈 뒤 앞 배경 칸의 가장 오래전 곡 · 바로 앞 칸(본식) 곡은 뒤로', t8.R.M8.list.length * 240 >= 1800 && t8.rep.filter((x) => /^M8/.test(x)).length === 0 && (() => { const L = t8.R.M8.list, m4 = new Set(t8.R.M4.list), i4 = L.findIndex((f) => m4.has(f)); return i4 < 0 || L.slice(i4).every((f) => m4.has(f)); })(), { M8: t8.R.M8.list, M4: t8.R.M4.list });
const nn = bad('near');
ok(`4 40분 안 같은 곡 — ${nn.length ? nn.length + '판에 남음(가능한 범위 · 아래 줄)' : '0'}`, true); if (nn.length) console.log('   ' + nn.slice(0, 6).join('\n   '));
if (OLD) { const S = O.applyExample({ course: 'open' }, 'standard'); S.bgm = {}; const on = segOnOf(S), a = P.plan(S, { on }), b = OLD.plan(S, { on });
  ok('5 대조 — 뺄 곡이 없는 칸(정석 · 고른 곡 없음 · 닫는 인사)은 종전 차례 그대로(원곡 len 으로 모자라면 그 뒤에 빌려 온 곡만 붙는다)', JSON.stringify(a.M6.list.slice(0, b.M6.list.length)) === JSON.stringify(b.M6.list) && a.M2.first === b.M2.first && a.M5.first === b.M5.first, { now: a.M6.list, main: b.M6.list }); }
else console.log('   5 대조 — origin/main 을 못 읽어 건너뜀');
/* ★[REPEAT_RULE_1107 덧 ①~⑤ · 12:1x] */
{ const S = O.applyExample({ course: 'open' }, 'standard'); S.bgm = {}; const on = segOnOf(S), R = P.plan(S, { on }), m1 = new Set(R.M1.list);
  ok('6 ① 본식 피아노(M4)에 배경 곡(B12 · B14) — 240초 기준 18분을 제 곡으로 채워 하객 맞이 곡을 빌리지 않는다 · 고객이 보는 3곡은 그대로', (P.FILL.M4 || []).includes('B12') && R.M4.list.includes('B12') && !R.M4.list.some((f) => m1.has(f)) && JSON.stringify(P.PICKS.M4) === JSON.stringify(['B09', 'B10', 'B11']), { M4: R.M4.list, FILL: P.FILL.M4 });
  ok('6 ① 마지막 곡(M8L)에 배경 곡(B26) · 고객이 보는 3곡 그대로', (P.FILL.M8L || []).includes('B26') && R.M8L.list.includes('B26') && JSON.stringify(P.PICKS.M8L) === JSON.stringify(['B32', 'B11', 'B27']), { M8L: R.M8L.list.slice(0, 6) });
  const noB12 = P.plan(S, { on, have: (f) => f !== 'B12' && f !== 'B26' });
  ok('6 ① 드라이브에 파일이 없으면(have) 배경 곡은 건너뛴다', !noB12.M4.list.includes('B12') && !noB12.M8L.list.includes('B26'), { M4: noB12.M4.list });
  ok('7 ③ 같은 곡을 다시 이을 자리 — 강조 자리가 없으면 곡 길이 40% (200초 곡 → 80초) · 있으면 그 초', P.hookAt && P.hookAt('B01', 200) === 80 && (() => { const o = P.SONGS.B01.start; P.SONGS.B01.start = 33; const r = P.hookAt('B01', 200); if (o == null) delete P.SONGS.B01.start; else P.SONGS.B01.start = o; return r === 33; })(), P.hookAt ? P.hookAt('B01', 200) : 'hookAt 없음');
  const C1 = O.applyExample({ course: 'open' }, 'record'); C1.bgm = { M2: { k: 'B31' } }; const R1 = P.plan(C1, { on: segOnOf(C1) });
  ok('8 ④ 한 곡 칸(화촉 · 부모님께 인사 · 축배)마다 «같은 칸 다음 곡»(alt) — 다른 칸 의미 곡 · 목록 칸 곡 · 다른 칸 alt 와 겹치지 않는다', ['M2', 'M5', 'M7'].every((sg) => Array.isArray(R1[sg].alt)) && !R1.M5.alt.includes('B31') && R1.M5.alt.every((f) => !R1.M2.alt.includes(f)) && R1.M7.alt.length > 0, { M2: R1.M2, M5: R1.M5, M7: R1.M7 });
  ok('9 ⑤ 곡 사이 겹침 — 하객 맞이 · 테이블 인사 · 닫는 인사 6초 · 본식 8초 · 그 밖 3초', P.xfOf('M1') === 6 && P.xfOf('M8') === 6 && P.xfOf('M6') === 6 && P.xfOf('M4') === 8 && P.xfOf('M8L') === 3, { M1: P.xfOf('M1'), M8: P.xfOf('M8'), M6: P.xfOf('M6') }); }
/* 엔진 두 곳이 같은 규칙을 쓰는가(코드 자리) — 미리 듣기 bgm-bed · 당일 콘솔 */
{ const BEDS = fs.readFileSync(process.env.BP_BED ? path.resolve(process.env.BP_BED) : path.join(ROOT, 'assets/bgm-bed.js'), 'utf8'), CON = fs.readFileSync(process.env.BP_CON ? path.resolve(process.env.BP_CON) : path.join(ROOT, 'console.html'), 'utf8');
  ok('10 ③ 미리 듣기 — 말하는 동안 · 무음 60초 앞 · 다음 곡 없음 셋 다 같은 곡을 reHook(강조 자리 · 없으면 40%)부터', (BEDS.match(/swapSrc\(v,s\.buffer,reHook\(v\.f,s\.buffer\),v\.f,X\)/g) || []).length === 3 && !/swapSrc\(v,s\.buffer,hookOf\(v\.f\)/.test(BEDS));
  ok('10 ③ 콘솔 — 말하는 동안 · 무음 60초 앞(hushSoonC · HUSH_NEAR 60) · 다음 곡 없음 · 선언 뒤 새 곡이 reHookC', /bedPlay\(BED\.id, _X, reHookC\(BED\.id\)\); return; \} if \(BED\.seg === 'M4' && BED\.list\.length > 1 && hushSoonC\(HUSH_NEAR\)\)/.test(CON) && /var HUSH_NEAR = 60;/.test(CON) && /bedPlay\(cur, segXfFor\(cur\), reHookC\(cur\)\)/.test(CON) && /bedPlay\(_sid, 0\.6, reHookC\(_sid\)\)/.test(CON));
  ok('11 ④ 한 곡 칸 다음 곡 — 콘솔 segPlan 이 alt 를 잇고 · 미리 듣기 listArm 이 altNext 로 넘긴다', /_pa\[id\]\.alt/.test(CON) && /altNext\(sa,v\.f\)/.test(BEDS)); }
/* ★★[REPEAT_FIX_1107 묶음 I · 11/07 BGM 섹션 전 → 후 모의 실행의 남은 넷] */
{ const LEN = { B06: 197.3, B09: 117.9, B10: 245.9, B11: 266.3, B12: 253.8, B13: 238.3, B14: 330.1, B15: 199.9, B16: 238.3, B17: 119.2, B30: 119.4, B31: 320.9, B32: 230.4, B33: 268.3, B34: 166.5 };
  const ST = { B28: 24.0, B29: 38.5, B22: 31.0, B09: 50.0, B10: 120.0, B11: 62.5, B12: 27.5, B14: 77.5 };
  ok('12 ③ 파일 안 되풀이 — 원곡 len 15곡 · 곡 끝 = min(파일, len)(lenOf)', P.lenOf && Object.entries(LEN).every(([f, l]) => P.SONGS[f].len === l && P.lenOf(f, 999) === l && P.lenOf(f, 60) === 60) && !P.SONGS.B28.len, Object.entries(LEN).filter(([f, l]) => P.SONGS[f].len !== l));
  ok('13 ④ 강조 자리(SONGS.start) — 축배 3곡 · 본식 5곡(완성 파일 초)', Object.entries(ST).every(([f, x]) => P.SONGS[f].start === x), Object.entries(ST).filter(([f, x]) => P.SONGS[f].start !== x));
  /* 실제 시계 모의 — 본식은 첫 곡 150초만 들리고(말 · 무음 사이) 나머지는 안 들린다 · 빌려 오기 칸(M8 · M6 · M8L)은 들어설 때 들린 기록(heard · now)으로 다시 짠다(엔진과 같다) */
  const SR = [];
  for (const ex of O.EXAMPLES.map((e) => e.k)) for (const [cn, pk] of Object.entries(COMBO)) for (const [dn, dur] of Object.entries(DUR)) {
    const S = O.applyExample({ course: 'open' }, ex); S.bgm = {}; Object.entries(pk).forEach(([sg, k]) => { S.bgm[sg] = { k }; }); const on = segOnOf(S), tag = `${ex}·${cn}·${dn}`;
    const H = {}, ev = []; let t = 0; const R0 = P.plan(S, { on, dur });
    P.CORDER.filter(on).forEach((sg) => { if (!P.loopy(sg)) { const f = R0[sg] && R0[sg].first; if (f) ev.push({ seg: sg, f, t }); t += SPAN[sg] || 0; if (sg === 'M2') t += SPAN.M3; return; }
      const R = (P.REPLAN && P.REPLAN[sg]) ? P.plan(S, { on, dur, heard: H, now: t, seg: sg }) : R0, L = (R[sg] || {}).list || [], span = need(sg), audible = sg === 'M4' ? 150 : span; let u = 0, i = 0;
      const cov = L.reduce((a, f) => a + dur(f), 0) >= span; while (L.length && u < Math.min(span, audible)) { const f = L[i % L.length], d = dur(f); ev.push({ seg: sg, f, t: t + u, cov }); if (!H[f]) H[f] = { t0: t + u, seg: sg }; H[f].last = t + u + Math.min(d, Math.min(span, audible) - u); H[f].lseg = sg; u += d; i++; }
      t += span; });
    const once = {}; P.CORDER.filter(on).forEach((sg) => { if (!P.loopy(sg) && R0[sg] && R0[sg].first) once[R0[sg].first] = once[R0[sg].first] || sg; const k = P.custK(S, sg); if (k) once[k] = once[k] || sg; });
    const bgs = P.CORDER.filter(on).filter((x) => P.loopy(x)), prevBg = (sg) => bgs[bgs.indexOf(sg) - 1] || '';
    const near = [], nearPrev = [], last = {}; ev.forEach((x) => { const p = last[x.f]; if (p && p.seg !== x.seg && x.t - p.t < GAP) (p.seg === prevBg(x.seg) ? nearPrev : near).push(`${x.f} ${p.seg}→${x.seg} ${Math.round((x.t - p.t) / 60)}분`); last[x.f] = x; });   /* 바로 앞 칸 곡은 규칙상 «맨 뒤» — 다른 곡이 다 떨어진 뒤에만 쓰인다(같은 칸 반복보다 낫다 · 알림만) */
    const twice = Object.keys(once).filter((f) => [...new Set(ev.filter((x) => x.f === f).map((x) => x.seg))].some((s) => s !== once[f] && P.carryOf(S, s, once[f] && R0[once[f]] && R0[once[f]].first) !== f));
    const rep2 = []; P.CORDER.filter(on).filter((sg) => sg !== 'M1' && sg !== 'M4' && P.loopy(sg)).forEach((sg) => { const seen = {}; ev.filter((x) => x.seg === sg).forEach((x) => { if (seen[x.f] && x.cov) rep2.push(sg + ':' + x.f); seen[x.f] = 1; }); });   /* 쓸 곡이 칸을 못 채우면(의미 곡 · 고른 곡을 빼서) 반복은 어쩔 수 없다 */
    const m4bad = ((R0.M4 || {}).list || []).filter((f) => !(P.PIANO || {})[f]);
    SR.push({ tag, near, nearPrev, twice, rep2, m4bad }); }
  const B = (k) => SR.filter((x) => x[k].length).map((x) => x.tag + ' ' + x[k].slice(0, 3).join(' · '));
  ok(`14 ① 실제 시계 40분 안 하루 두 번 0 — 빌려 오기 칸이 들린 기록으로 다시 짠다(${SR.length}판 · 본식은 첫 곡 150초만 들림 · 바로 앞 칸 곡 마지막 수단 ${B('nearPrev').length}판은 알림)`, !B('near').length, B('near').slice(0, 6)); if (B('nearPrev').length) console.log('   알림 · 바로 앞 칸 곡(다른 곡이 다 떨어진 뒤) ' + B('nearPrev').slice(0, 4).join(' / '));
  ok('14 ① 실제 시계 — 의미 곡 두 번 0 · 빌려 오기 칸(테이블 · 닫는 인사 · 마지막 곡) 반복 0', !B('twice').length && !B('rep2').length, { twice: B('twice').slice(0, 3), rep: B('rep2').slice(0, 3) });
  ok('15 안 1 본식(M4) 목록은 피아노 곡만(빌려 온 곡 포함)', !B('m4bad').length, B('m4bad').slice(0, 3));
  { const S = O.applyExample({ course: 'open' }, 'standard'); S.bgm = {}; const on = segOnOf(S), R = P.plan(S, { on, have: (f) => f !== 'B12' && f !== 'B14' }), m1 = new Set(R.M1.list), L = R.M4.list;
    ok('15 대본 ② B12 · B14 가 드라이브에 없을 때 — 본식은 다른 피아노 곡으로 채우고(18분) 하객 맞이 곡은 빌리지 않는다 · 의미 곡 없음', L.every((f) => (P.PIANO || {})[f]) && !L.some((f) => m1.has(f)) && !L.includes('B12') && !L.includes('B14') && L.length * 240 >= 1080 && !L.some((f) => f === R.M2.first || f === R.M5.first || (R.M8L && f === R.M8L.first)), { M4: L, M1: R.M1.list }); }
  { const S = O.applyExample({ course: 'open' }, 'record'); S.bgm = {}; const on = segOnOf(S), H = { B01: { t0: 0, seg: 'M1' }, B24: { t0: 300, seg: 'M1' }, B09: { t0: 2200, seg: 'M4' } }, R = P.plan(S, { on, heard: H, now: 2400, seg: 'M8' }), L = R.M8.list, i10 = L.indexOf('B10'), i01 = L.indexOf('B01');
    ok('16 ① 들어설 때 다시 짠 테이블 목록 — 제 곡 → 안 들린 본식 배경 곡(B10 · B11 · B12 …) → 들린 곡(가장 오래전 · 바로 앞 칸 뒤로) · 들린 B09 는 맨 뒤 쪽', R.M8.heard && L[0] === 'B23' && i10 > 0 && (i01 < 0 || i10 < i01) && (L.indexOf('B09') < 0 || L.indexOf('B09') > i10), L); } }
{ const BEDS = fs.readFileSync(process.env.BP_BED ? path.resolve(process.env.BP_BED) : path.join(ROOT, 'assets/bgm-bed.js'), 'utf8'), CON = fs.readFileSync(process.env.BP_CON ? path.resolve(process.env.BP_CON) : path.join(ROOT, 'console.html'), 'utf8');
  ok('17 ② 미룬 넘김(LIST_HOLD)도 60초 무음 검사 — 콘솔 lfWant 가지 · 미리 듣기 LPB.lfw 가지', /BED\.lfWant = 0; BED\.lfGo = 0; if \(BED\.seg === 'M4' && hushNowC\(\)\) return; listGo\(1\)/.test(CON) && /_w\.sg==='M4'&&\(lvOf\(st,BED\.cur\.f\)<=-60\|\|hushSoon\(BED\.cur\.f,HUSH_NEAR\)\)/.test(BEDS));
  ok('17 ③ 엔진 곡 끝 = lenOf — 콘솔 끝 타이머 · 겹침 · 미리 듣기 listArm', /end = \(BP && BP\.lenOf\) \? BP\.lenOf\(BED\.id/.test(CON) && /function segXfFor\(sid\)\{ var X = segXf\(\), m = SEGST\.meta\[sid\] \|\| \{\}, d = \(BP && BP\.lenOf\)/.test(CON) && /d=P\.lenOf\?P\.lenOf\(v\.f,s\.buffer\.duration\)/.test(BEDS));
  ok('17 ① 다시 짤 때 이 칸에서 이미 들린 곡은 들린 차례대로 맨 앞(지금 곡이 남아 다음 곡이 이어진다 · 0번 곡 건너뛰기 0 · 검토 I)', (() => { const S = O.applyExample({ course: 'open' }, 'record'); S.bgm = {}; const on = segOnOf(S), R1 = P.plan(S, { on, heard: { B23: { t0: 3700, seg: 'M8' }, B14: { t0: 3950, seg: 'M8' }, B01: { t0: 0, seg: 'M1' } }, now: 4300, seg: 'M8' }); const L = R1.M8.list; return L[0] === 'B23' && L[1] === 'B14' && new Set(L).size === L.length; })());
  ok('17 ① 엔진 들린 기록 → 빌려 오기 칸 다시 짜기 — 콘솔 segPlanFor(heard · now) · 미리 듣기 playOrd', /function segPlanFor\(id, cur\)/.test(CON) && /heard: heardMap\(\), now: nowS\(\), seg: id/.test(CON) && /function playOrd\(sg\)/.test(BEDS) && /heard:heardMap\(\), now:nowS\(\), seg:sg/.test(BEDS)); }
console.log(fail ? `REPEAT RULE FAIL ${fail}` : 'REPEAT RULE OK'); process.exit(fail ? 1 : 0);
