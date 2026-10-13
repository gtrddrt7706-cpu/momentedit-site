#!/usr/bin/env node
/* ★★[BGM_FIRST_1013 2026-10-13 사장님 «bgm이 먼저 조금 깔리다가 멘트를 하는 게 좋을 것 같은데»] 입장 «음악과 함께» — 음악이 늘 멘트보다 먼저 들린다
   엔진(assets/entry-scene.js)만 브라우저 없이 잰다 — 식순 화면 미리 듣기와 당일 콘솔이 같은 식을 쓴다.
   1 멘트 앞 4초(lead)에 음악이 들린다 — 1.2초 안에 올라와 멘트 앞에서 하이라이트보다 6dB 아래(intro) · 종전처럼 거의 안 들리는 크기(-21dB 아래)가 아니다
   2 멘트가 시작되면 목소리 밑 크기로 내려가 있다(0.5초 전부터 내려간다) · 마지막 말 끝 + 0.3초에 하이라이트(0dB)
   3 문 열림 자리 고르기(pickHook) — 고른 자리에서 음악이 4초 먼저 깔릴 수 있으면 그대로 · 모자라면 같은 소절이 다시 나오는 뒤 자리 중 처음으로 넉넉한 곳 · 어디도 모자라면 가장 뒤 · 후보가 없으면 그대로
   4 plan — 멘트가 곡 앞부분보다 길어도(A Lover's Concerto 16초 · 멘트 17초) 뒤 자리로 옮겨 음악이 4초 먼저(늦게 들어오지 않는다 · tm 0)
   5 두 분이 올린 곡(후보 없음)은 종전대로 — 고른 자리 그대로 · 앞부분이 모자라면 늦게 들어온다(알림이 «더 뒤 자리를 고르면»)
   6 미리 듣기용 짧은 판(Sg.end) — 장면 끝은 그 판의 끝을 넘지 않는다
   종료 코드 0 통과 · 1 실패.  ES_MOD = 돌연변이 확인용(그 판의 entry-scene.js 로 잰다) */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SRC = fs.readFileSync(process.env.ES_MOD || path.join(ROOT, 'assets', 'entry-scene.js'), 'utf8');
const sb = { window: {} }; vm.createContext(sb); vm.runInContext(SRC, sb);
const ES = sb.window.EntryScene;
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
if (!ES || typeof ES.plan !== 'function') { console.log('FAIL 엔진을 읽지 못했다'); process.exit(1); }
const dB = (g) => (g <= 0 ? -120 : 20 * Math.log10(g));
const voice = (V, n = 3) => { const d = (V - 0.4 * (n - 1)) / n, pieces = [], gaps = []; for (let i = 0; i < n; i++) { pieces.push({ a: i * (d + 0.4), d }); if (i < n - 1) gaps.push(0.4); } return { pieces, gaps }; };   // 조각 n 개 + 쉼 0.4초 = 모두 V 초
const song = (dur, extra) => Object.assign({ dur, gain: 1, buf: null }, extra || {});
// 1 · 2 — 곡 앞부분이 넉넉한 곡(문 열림 40초 · 멘트 17초)
{ const V0 = voice(17), PL = ES.plan(V0, song(150), 40), T = ES.BED_TRIM;
  ok('1 장면 — 음악이 멘트보다 4초 먼저(tv 4 · tm 0)', PL.tv === 4 && PL.tm === 0 && PL.H === 40, PL);
  const g05 = dB(ES.envGain(PL, 0.5)), g13 = dB(ES.envGain(PL, 1.3)), g30 = dB(ES.envGain(PL, 3.0)), gv = dB(ES.envGain(PL, PL.tv + 0.2)), gpk = dB(ES.envGain(PL, PL.th + 1));
  ok(`1 멘트 앞 음악이 들린다 — 1.3초 ${g13.toFixed(1)}dB · 3초 ${g30.toFixed(1)}dB ≥ intro(${(ES.SP.intro + T).toFixed(0)}dB) · 0.5초는 아직 올라오는 중(${g05.toFixed(1)})`,
    Math.abs(g13 - (ES.SP.intro + T)) < 0.6 && Math.abs(g30 - (ES.SP.intro + T)) < 0.6 && g05 < g13 - 3, { g05, g13, g30 });
  ok(`1 종전 곡선이 아니다 — 멘트 앞 3초가 -21dB 보다 크다(종전 -30dB 안팎 · 처음 5초 페이드)`, g30 > -18, { g30 });
  ok(`2 멘트가 시작되면 목소리 밑 크기(${gv.toFixed(1)}dB ≤ ${(ES.SP.under - ES.SP.build + T + 0.5).toFixed(1)}) · 하이라이트 뒤 ${gpk.toFixed(1)}dB`,
    gv <= ES.SP.under - ES.SP.build + T + 0.5 && Math.abs(gpk - T) < 0.6 && Math.abs(PL.th - (PL.tv + PL.V + ES.SP.breath)) < 1e-9, { gv, gpk, th: PL.th });
  const gd = dB(ES.envGain(PL, PL.tv - ES.SP.duck + 0.05)), ge = dB(ES.envGain(PL, PL.tv - 0.02));
  ok(`2 멘트 0.5초 전부터 내려간다 — ${gd.toFixed(1)} → ${ge.toFixed(1)}dB`, gd > ge + 3, { gd, ge }); }
// 3 — 문 열림 자리 고르기
if (typeof ES.pickHook !== 'function') { ok('3 pickHook 이 엔진에 있다', false); console.log('bgm-first: FAIL ' + fail); process.exit(1); }
{ const H = 16.11, hs = [16.11, 49.93, 101.48], need = (V) => V + ES.SP.breath + ES.SP.lead;
  const c = [[10, H], [11.8, H], [17, 49.93], [45.5, 49.93], [46, 101.48], [97, 101.48], [200, 101.48]].map(([V, want]) => [V, ES.pickHook(H, hs, V), want]);
  ok('3 pickHook — 넉넉하면 고른 자리 · 모자라면 처음으로 넉넉한 뒤 자리 · 어디도 모자라면 가장 뒤', c.every(([, got, want]) => got === want), c);
  ok('3 후보가 없거나 고른 자리보다 앞 후보뿐이면 그대로', ES.pickHook(H, null, 30) === H && ES.pickHook(H, [], 30) === H && ES.pickHook(40, [10, 20], 50) === 40, [ES.pickHook(H, null, 30), ES.pickHook(40, [10, 20], 50)]);
  ok('3 기준 = 멘트 + 숨 0.3초 + 앞 4초', need(17) === 21.3); }
// 4 — A Lover's Concerto(16.11초) · 멘트 17초 — 뒤 자리(49.93초)로
{ const V0 = voice(17), PL = ES.plan(V0, song(168.19), 16.11, { hooks: [16.11, 49.93, 101.48] });
  ok(`4 멘트가 앞부분보다 길어도 음악이 4초 먼저 — 문 열림 ${PL.H}초(고른 자리 ${PL.H0}초) · tv ${PL.tv} · tm ${PL.tm}`, PL.H === 49.93 && PL.H0 === 16.11 && PL.tv === 4 && PL.tm === 0 && Math.abs(PL.off - (49.93 - 17 - 0.3 - 4)) < 1e-9, PL);
  const late = PL.tm > ES.LATE_T; ok('4 «늦게 들어와요» 알림이 뜨지 않는다(tm ≤ LATE_T)', !late, { tm: PL.tm }); }
// 5 — 두 분이 올린 곡(후보 없음)
{ const V0 = voice(17), PL = ES.plan(V0, song(168.19), 16.11);
  ok(`5 후보 없는 곡은 고른 자리 그대로 · 앞부분이 모자라면 늦게(tm ${PL.tm.toFixed(2)})`, PL.H === 16.11 && PL.tv === 0 && PL.tm > 0.9, PL); }
// 6 — 짧은 판의 끝
{ const V0 = voice(17), PL = ES.plan(V0, song(280, { end: 62 }), 39.57, { hooks: [39.57, 65.16] });
  ok(`6 짧은 판(끝 62초)이면 장면 끝도 그 안(${PL.tend.toFixed(2)} ≤ ${(PL.tm + 62 - PL.off).toFixed(2)})`, PL.tend <= PL.tm + (62 - PL.off) + 1e-9, PL); }
console.log(fail ? `bgm-first: FAIL ${fail}` : 'bgm-first: ok');
process.exit(fail ? 1 : 0);
