// ★★[CAST_TEXT_ONLY 2026-09-27 사장님 «실제로 식장에서 나오는 멘트만 녹음으로 · 나머지 대역은 대사 예시로만»]
//   두 분 · 가족이 직접 말하는 자리의 대역 목소리(06~14 · 24~26)는 미리듣기 · 연습 어디에서도 안 튼다.
//   남는 소리 = 나레이션 + 두 분이 녹음해 보내는 자리의 예시(01~04 하객 맞이 · 18~23 입장 인사).
//   이 검사: ①막는 목록이 정확히 열둘 ②예시 넷 × 두 분 목소리 켬/끔 전 큐에서 재생 목록(castLivePlayOf)에 막힌 클립 0
//            ③두 분 목소리를 켜면 01~04 · 18~23 은 여전히 나온다(castMainOf) ④재생하는 화면이 castLiveOf 를 직접 부르지 않는다
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url); const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
globalThis.window = globalThis; globalThis.self = globalThis;
for (const f of ['assets/ritual-data.js', 'assets/ritual-cue.js', 'assets/ritual-open.js']) { try { const m = require(path.join(ROOT, f)); } catch (e) {} }
const RC = require(path.join(ROOT, 'assets/ritual-cue.js')); const ST = require(path.join(ROOT, 'assets/ritual-story.js'));
let RO = null; try { RO = require(path.join(ROOT, 'assets/ritual-open.js')); } catch (e) {}
let bad = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d == null ? '' : ' → ' + d}`); if (!c) bad++; };
const WANT = ['06_welcome-groom', '07_welcome-bride', '08_vow-groom', '09_vow-bride', '24_vow-both-1', '25_vow-both-2', '26_vow-both', '10_letter-parent', '11_letter-each', '12_bless-father', '13_bless-mother', '14_tribute'];
ok('막는 목록 = 정확히 열둘(06~14 · 24~26)', JSON.stringify(Object.keys(ST.CAST_MUTE).sort()) === JSON.stringify(WANT.slice().sort()), Object.keys(ST.CAST_MUTE).join(','));
const R = RO && (RO.RitualOpen || RO); const exs = (R && R.EXAMPLES) || [];
let played = new Set(), own = new Set(), live = new Set(), n = 0;
const combos = [];
for (const ex of exs.length ? exs : [{ k: 'none' }]) for (const cv of ['narr', 'couple']) for (const letter of ['parent', 'each', 'both']) {
  let S = {}; try { S = R.fromExample ? R.fromExample(ex.k) : (R.applyExample ? R.applyExample({}, ex.k) : {}); } catch (e) { S = {}; }
  S = Object.assign({}, S, { guestVoice: cv, entryVoice: cv, letter }); combos.push(S);
}
for (const S of combos) {
  let r; try { r = RC.build(S, { mode: 'preview' }); } catch (e) { continue; }
  for (const c of r.cues) { n++; ST.castLivePlayOf(c).forEach((x) => played.add(x.id)); ST.castLiveOf(c).forEach((x) => live.add(x.id)); ST.castMainOf(c).forEach((x) => own.add(x.id)); }
}
ok(`재생 목록에 막힌 클립 0 (${combos.length}조합 · ${n}큐)`, n > 0 && [...played].every((id) => !ST.CAST_MUTE[id]), [...played].join(','));
ok('표에는 사람 구간 예시가 그대로 있다(커버리지 원천 · 지우지 않음)', [...live].some((id) => ST.CAST_MUTE[id]), [...live].join(','));
ok('두 분 목소리를 켜면 하객 맞이 · 입장 예시(01~04 · 18~23)는 나온다', ['01_guest-1', '02_guest-2', '03_guest-3', '04_guest-4'].every((id) => own.has(id)) && [...own].some((id) => /^(18|19|20|21|22|23)_entry/.test(id)), [...own].join(','));
for (const f of ['console.html', 'order-preview.html']) {
  const src = fs.readFileSync(path.join(ROOT, f), 'utf8');
  ok(`${f} 가 재생에 castLiveOf 를 직접 부르지 않는다`, !/\.castLiveOf\(/.test(src), (src.match(/.{40}\.castLiveOf\(.{20}/g) || []).join(' | '));
}
process.exit(bad ? 1 : 0);
