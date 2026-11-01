#!/usr/bin/env node
/* ★★[DETAIL_R5_1101 규칙 1 · DETAIL_R3_1101 ⑦ ⑧ · 보탬 2] 곡 계획 한 곳(BgmPicks.plan) — 브라우저 없이 잰다
   a 고객이 고른 곡이 있으면 이어받기가 그 곡을 건너뛰지 않는다 · 목록 칸만 앞 곡을 이어받는다
   b 파일 없는 곡 → 대체곡을 정한 뒤 하루 중복 0(이어짐 제외 · 목록이 충분히 길 때)
   c 축사 «음악과 함께» 기본곡(Moon River)도 예약 — 하객 맞이 · 테이블 목록에서 빠진다(길면) · 목록이 짧아지면 맨 뒤로
   d 뺀 순간(화촉)의 옛 선택은 중복 · 예약 셈에 넣지 않는다(fill 빼기 · «…에서도 고른 곡» 한 줄)
   e 식순 화면 · 당일 콘솔이 같은 함수를 부른다(bgm-bed planOf · console segPlanAll)
   BP_PICKS = 깨 보기용 다른 판  종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = require(process.env.BP_PICKS || path.join(ROOT, 'assets/bgm-picks.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 600)}`); if (!c) fail++; };
const plan = P.plan || null;
ok('plan 함수가 있다(BgmPicks.plan)', typeof plan === 'function');
if (plan) {
  const all = () => true, long = () => 900, short = () => 240;
  /* a */
  { const S = { bgm: { M5: { k: 'B16' } } }, prev = (sg) => (sg === 'M5' ? 'M2' : sg === 'M8' ? 'M5' : '');
    const S2 = { bgm: { M2: { k: 'B31' }, M5: { k: 'B16' } } };
    const r = plan(S2, { on: all, prev, dur: long }), r0 = plan({ bgm: { M2: { k: 'B31' } } }, { on: all, prev, dur: long });
    ok('a 화촉 B31 → 부모님께 인사: 두 분이 B16 을 골랐으면 B16(이어받지 않음) · 안 골랐으면 B31 을 이어받는다', r.M5.first === 'B16' && !r.M5.carry && r0.M5.first === 'B31' && r0.M5.carry === 'B31', { r: r.M5, r0: r0.M5 });
    ok('a 테이블(목록 칸)은 앞 곡 B16 을 맨 앞에 이어받는다 · 한 번 들은 걸로 친다(앞 칸 예약이어도 빼지 않는다)', r.M8.list[0] === 'B16' && r.M8.carry === 'B16', r.M8);
    void S; }
  /* b */
  { const have = (f) => f !== 'B13', r = plan({ bgm: { S5: { m: 'bed' } } }, { on: all, have, dur: () => 2000 });   /* 곡마다 길어 목록이 모자라지 않을 때 */
    const used = []; Object.keys(r).forEach((sg) => r[sg].list.forEach((f) => used.push(f)));
    const dup = used.filter((f, i) => used.indexOf(f) !== i);
    ok('b 축사 곡 B13 파일이 없다 — 대체곡 B14 · 그 뒤 하루 중복 0(목록 길이 충분) · B13 은 어디에도 없다', r.M4S5.first === 'B14' && !dup.length && used.indexOf('B13') < 0, { first: r.M4S5.first, dup, M1: r.M1.list, M8: r.M8.list }); }
  /* c */
  { const S = { bgm: { S5: { m: 'bed' } } }, rl = plan(S, { on: all, dur: long }), rs = plan(S, { on: all, dur: short });
    ok('c 축사 «음악과 함께» 기본곡 B13 은 예약 — 목록이 길면 하객 맞이 · 테이블에서 빠진다', rl.M4S5.first === 'B13' && rl.M1.list.indexOf('B13') < 0 && rl.M8.list.indexOf('B13') < 0, { M1: rl.M1.list, M8: rl.M8.list });
    const lenM8 = (a) => a.length * 240;
    ok('c 빼서 목록 합이 필요한 길이(30분) 밑이면 빼지 않고 맨 뒤로 — 테이블 목록에서 겹치는 곡이 뒤에 · 앞은 겹치지 않는 곡', rs.M8.list.length >= 5 && rs.M8.list.slice(-3).every((f) => rs.M1.list.indexOf(f) > -1 || f === 'B13') && rs.M1.list.indexOf(rs.M8.list[0]) < 0 && lenM8(rs.M8.list) <= 1800 + 240 * 5, { M1: rs.M1.list, M8: rs.M8.list });
    const r6 = plan({ bgm: {} }, { on: all, dur: short });
    ok('c 닫는 인사 목록 — 앞 목록 곡(B16)은 15분이 넘으면 뺀다', r6.M6.list.indexOf('B16') < 0 && r6.M6.list.length * 240 >= 900, r6.M6.list); }
  /* d */
  { const S = { bgm: { M2: { k: 'B07' }, M5: { k: 'B31' } } };
    const onAll = all, offM2 = (sg) => sg !== 'M2';
    const a = plan(S, { on: onAll, dur: long }), b = plan(S, { on: offM2, dur: long });
    ok('d 화촉에서 고른 B07 은 닫는 인사 fill 에서 빠진다 — 화촉을 빼면 다시 들어간다', a.M6.list.indexOf('B07') < 0 && b.M6.list.indexOf('B07') > -1, { a: a.M6.list, b: b.M6.list });
    const S2 = { bgm: { M2: { k: 'B31' }, M5: { k: 'B31' } } }, c = plan(S2, { on: onAll, dur: long }), d = plan(S2, { on: offM2, dur: long });
    ok('d 같은 곡(B31)을 화촉 · 부모님께 인사에서 골랐다 — 둘 다 담기면 «화촉에서도» · 화촉을 빼면 한 줄 없음', c.M5.dup === 'M2' && !d.M5.dup && P.dupSeg(S2, 'M5', offM2) === '' && P.dupSeg(S2, 'M5', onAll) === 'M2', { c: c.M5, d: d.M5 }); }
  /* e */
  { const bed = fs.readFileSync(path.join(ROOT, 'assets/bgm-bed.js'), 'utf8'), con = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
    ok('e 식순 화면(bgm-bed planOf) · 당일 콘솔(segPlanAll)이 같은 BgmPicks.plan 을 부른다', /P\.plan\(St\(\)/.test(bed) && /BP\.plan\(S,/.test(con), null);
    /* ★[DETAIL_R4_1101 ⑧] «음악과 함께» 곡인가 = 실제로 깔린 구간 — 곡 번호(Moon River 는 테이블 목록에도 있다)로 보지 않는다 */
    ok('f backSeg — M4S5 · M4S6 에서만 본식(M4)으로 · 테이블(M8)에서 같은 곡이 흘러도 그대로', typeof P.backSeg === 'function' && P.backSeg('M4S5') === 'M4' && P.backSeg('M4S6') === 'M4' && P.backSeg('M8') === '' && P.backSeg('') === '', null);
    ok('f 식순 화면 carry · 당일 콘솔 segOfCue(축배 · 닫는 인사 첫 줄)가 같은 backSeg 를 쓴다 · carry 가 곡 번호(effHas M4S5)로 가르지 않는다', /function carry\(f,sg\)[^\n]*P\.backSeg\(sg\)/.test(bed) && !/function carry\(f\)\{ var a=effHas\('M4S5'\)/.test(bed) && (con.match(/BP\.backSeg\(BED\.seg\)/g) || []).length === 2, null); }
}
console.log(fail ? `DETAIL R5 FAIL ${fail}` : 'DETAIL R5 OK');
process.exit(fail ? 1 : 0);
