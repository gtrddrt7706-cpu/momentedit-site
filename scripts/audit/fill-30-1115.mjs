#!/usr/bin/env node
/* ★★[SONGS_5_1115 2026-11-15 대표님 구매 · BGM 결정 카드 ⑤] 하객 맞이(M1) · 테이블 인사(M8) — 실제 완성 파일 길이(초)로 하루 모의(BgmPicks.plan · 들어설 때 들린 기록으로 다시 짜기 · 본식은 첫 곡 150초만 들림 · 겹침 6초 뺌)
   ① 하객 맞이 = 고른 곡 3 + fill 로 30분(20분 · 30분 늦게 시작한 날 둘 다) · 빌림 0 · 되풀이 0 — 부모님께 인사에 B16 을 고른 날 포함(종전 17.2분에 첫 곡이 다시 나왔다)
   ② 테이블 인사 = 30분 · 되풀이 0 · 제 곡 25분 이상(남는 몇 분은 하객 맞이에서 안 들린 곡 · 본식 피아노에서 빌린다 — 곡 하나를 더 사면 0)
   BP_PICKS=<bgm-picks.js>(깨 보기) · 종료 코드 0 통과 · 1 실패 */
import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..'), P = require(process.env.BP_PICKS ? path.resolve(process.env.BP_PICKS) : path.join(ROOT, 'assets/bgm-picks.js'));
const O = require(path.join(ROOT, 'assets/ritual-open.js')); const DUR = { B01: 267.9, B02: 193.1, B03: 265.1, B04: 175.5, B05: 215.4, B06: 397.6, B07: 148.1, B09: 356.6, B10: 494.7, B11: 535.6, B12: 510.6, B13: 479.7, B14: 663.1, B15: 402.8, B16: 479.7, B17: 241.4, B18: 161.1, B19: 324.4, B20: 179.9, B21: 109.9, B22: 167.9, B23: 330.7, B24: 283.7, B25: 161.4, B26: 200.5, B27: 291.1, B28: 230.6, B29: 192.5, B30: 241.8, B31: 484.4, B32: 463.8, B33: 539.7, B34: 502.4, B35: 291.2, B36: 214.9, B37: 294.4, B38: 380.4, B39: 250.0 }; let M1MIN = 0;
const dur = (f) => P.lenOf(f, DUR[f] || 240), SPAN = { M2: 130, M3: 300, M5: 300, M7: 90, M8L: 1020 };
const segOnOf = (S) => { const on = Object.keys(S.on || {}).filter((k) => S.on[k]); return (sg) => { const d = P.seg(sg); if (!d) return false; if (d.parent) return true; return d.ks.some((k) => on.includes(k) || k === 'guest' || k === '_close'); }; };
const need = (sg) => sg === 'M1' && M1MIN ? M1MIN * 60 : sg === 'M8L' ? SPAN.M8L : (P.NEED[sg] || 0);
const COMBO = { 고르지않음: {}, 'M5=B16': { M5: 'B16' }, 'M5=B16·M4=B11·M2=B31': { M5: 'B16', M4: 'B11', M2: 'B31' }, 'M5=B15·M6=B34·M7=B22': { M5: 'B15', M6: 'B34', M7: 'B22', M4: 'B10', M2: 'B07' }, 'M1=B13': { M1: 'B13' }, 'M8=B16': { M8: 'B16' }, 'M8=B24·M1=B24': { M8: 'B24', M1: 'B24' } };
const run = () => { const out = [];
for (const ex of O.EXAMPLES.map((e) => e.k)) for (const [cn, pk] of Object.entries(COMBO)) {
  const S = O.applyExample({ course: 'open' }, ex); S.bgm = {}; Object.entries(pk).forEach(([sg, k]) => { S.bgm[sg] = { k }; }); const on = segOnOf(S);
  const R0 = P.plan(S, { on, dur }); const H = {}; let t = 0; const row = { tag: ex + '·' + cn };
  P.CORDER.filter(on).forEach((sg) => { if (!P.loopy(sg)) { const f = R0[sg] && R0[sg].first; if (f) { H[f] = H[f] || { t0: t, seg: sg }; H[f].last = t; H[f].lseg = sg; } t += SPAN[sg] || 0; if (sg === 'M2') t += SPAN.M3; return; }
    const R = P.REPLAN[sg] ? P.plan(S, { on, dur, heard: H, now: t, seg: sg }) : R0, L = (R[sg] || {}).list || [], span = need(sg), audible = sg === 'M4' ? 150 : span;
    if (sg === 'M1' || sg === 'M8') { const own = P.order(S, sg, '', () => false), xf = 6; const cover = L.reduce((a, f) => a + dur(f), 0) - L.length * xf; const borrow = L.filter((f) => own.indexOf(f) < 0);
      let u = 0, i = 0; const seen = {}, rep = []; while (L.length && u < span) { const f = L[i % L.length]; if (seen[f]) rep.push(f + '@' + Math.round(u / 60) + '분'); seen[f] = 1; u += dur(f) - xf; i++; }
      const ownCov = L.filter((f) => own.indexOf(f) > -1).reduce((a, f) => a + dur(f) - xf, 0); row[sg] = { list: L.join(' '), 분: Math.round(cover / 6) / 10, own: Math.round(ownCov / 6) / 10, borrow, rep, heardB: borrow.filter((f) => H[f]) }; }
    let u = 0, i = 0; while (L.length && u < Math.min(span, audible)) { const f = L[i % L.length], d = dur(f); if (!H[f]) H[f] = { t0: t + u, seg: sg }; H[f].last = t + u + Math.min(d, Math.min(span, audible) - u); H[f].lseg = sg; u += d; i++; }
    t += span; });
  out.push(row); }
return out; };
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 700)}`); if (!c) fail++; };
for (const mm of [0, 30]) { M1MIN = mm; const out = run(), lab = mm ? '30분(늦게 시작한 날)' : '20분(DAY.guestIn)';
  out.forEach((r) => console.log(`  ${lab} ${r.tag.padEnd(28)} | M1 ${r.M1 ? r.M1.분 + '분 ' + r.M1.list : '-'} | M8 ${r.M8 ? r.M8.분 + '분(제 곡 ' + r.M8.own + '분) 빌림[' + r.M8.borrow + '] ' + r.M8.list : '-'}`));
  const m1 = out.filter((r) => r.M1), m8 = out.filter((r) => r.M8);
  ok(`하객 맞이 ${lab} — 4코스 × 고른 곡 7조합 모두 제 곡(고른 곡 3 + fill)으로 30분 · 빌림 0 · 되풀이 0 [SONGS_5_1115]`, m1.length === 28 && m1.every((r) => r.M1.분 >= 30 && !r.M1.borrow.length && !r.M1.rep.length), m1.filter((r) => !(r.M1.분 >= 30 && !r.M1.borrow.length && !r.M1.rep.length)).map((r) => r.tag + ' ' + r.M1.분 + '분 ' + r.M1.borrow + ' ' + r.M1.rep));
  ok(`테이블 인사 ${lab} — 기록 코스 7조합 30분 · 되풀이 0 · 제 곡(고른 곡 3 + fill) 25분 이상 [SONGS_5_1115]`, m8.length === 7 && m8.every((r) => r.M8.분 >= 30 && !r.M8.rep.length && r.M8.own >= 25), m8.map((r) => r.tag + ' ' + r.M8.분 + '/' + r.M8.own + ' ' + r.M8.rep)); }
console.log(fail ? `fill-30-1115: FAIL ${fail}` : 'fill-30-1115: ok'); process.exit(fail ? 1 : 0);
