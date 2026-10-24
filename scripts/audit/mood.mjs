#!/usr/bin/env node
/* ★★[MOOD_1018 · MOOD_FIT_1018 · BRIDGE_SKIP_1018 · TOAST_PUTDOWN_1018 인스타 섹션 검토 7판 67 ~ 71 · 사장님 10/18 «A만 반영하자»]
   나레이션 분위기(ritual-open MOOD) · 겹침 넘기기(ritual-cue moodFit) · 이음말 빼는 조건 · 축배 뒤 잔 내려놓기를 대본 전부로 잰다.
   코스 4 × 분위기 5(+ 지금 그대로) × 화촉 서는 분 4 × 축가 부르는 분 2 × 서약/감사문 2 × 편지 3 × 더하기 6 = 6,912편.
     ① 표 — 순간 키 · 예시 번호(그 순간 칩 이름이 있는 번호) · 화촉은 서는 분마다 · 입장 · 안내 멘트 번호
     ② 분위기를 고른 대본(5,760)은 겹침 0 — 같은 첫 낱말로 여는 두 줄 · 박수 잇달음(moodClash)
     ③ 모든 대본(6,912) — B11 «산뜻한» 없음 · B9 → 덕담 없음 · B8 뒤 «이제» · 같은 지시 없음 · B12 뒤 이음말 없음 · B10 뒤 박수 청 없음 ·
        축배 맺는 말 → 사진 안내 사이 사람 구간 · «분위기» 한 대본에 한 번까지
     ④ «지금 그대로»는 아무것도 안 바꾼다 · 분위기 값은 norm 을 지난다(저장해도 남는다)
   ★[MOOD_ROW_OFF_1019 2026-10-19 사장님] 고르기 화면의 분위기 칩 줄은 걷었다 — 이 검사는 «두 분이 순간마다 고를 수 있는 예시 조합»을 지킨다.
     분위기 표(MOOD)는 사람이 실제로 고를 만한 조합 묶음으로만 남는다(손으로 같은 예시를 골라도 130 의 겹침 ⑥ 이 다시 날 수 있다)
   node scripts/audit/mood.mjs [--selftest]   (--selftest = moodFit 을 끄면 ②가 빨강인지) */
import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
function run(mut) {
  for (const k of Object.keys(require.cache)) if (k.startsWith(ROOT)) delete require.cache[k];
  const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js')), D = require(path.join(ROOT, 'assets/ritual-data.js'));
  if (mut === 'fit') C.moodFit = (S) => S;
  const R = []; const T = (m, c, d) => R.push([m, !!c, d || '']);
  if (!O.MOOD || !C.moodFit) { T('[MOOD_1018] MOOD · moodFit 이 있다', false, '없다'); return R; }
  // ①
  const badT = [], whos = ['mothers', 'fathers', 'others'];
  for (const [mk, m] of Object.entries(O.MOOD)) {
    if (!D.ENTRY[m.entry]) badT.push(mk + ' entry ' + m.entry);
    if (!(m.guestEx >= 0 && m.guestEx <= 3)) badT.push(mk + ' guestEx'); if (m.pvEx !== 0) badT.push(mk + ' pvEx');
    for (const [k, v] of Object.entries(m.narEx)) { if (!O.NAR_EX[k]) { badT.push(mk + ' ' + k); continue; }
      const vs = (v && typeof v === 'object') ? whos.map((w) => [w, v[w]]) : [['', v]];
      vs.forEach(([w, n]) => { const nm = O.narExNames(w ? { candleWho: w } : {}, k); if (!(n >= 0) || (n > 0 && !nm[n])) badT.push(mk + ' ' + k + (w ? ':' + w : '') + '=' + n); }); }
    if (Object.keys(m.narEx).length !== O.narExKeys().length) badT.push(mk + ' 순간 수 ' + Object.keys(m.narEx).length + '/' + O.narExKeys().length);
  }
  T('① 분위기 표 — 다섯 분위기 × 순간 ' + O.narExKeys().length + ' · 칩 이름이 있는 번호 · 화촉은 서는 분마다', !badT.length, badT.slice(0, 6).join(' · '));
  // ②③
  const extras = [[], ['ring'], ['toast'], ['table'], ['bless'], ['free']], moods = O.MOOD_KEYS;
  const BO = /^(다음은|다음으로|자 그럼 이제|이제|먼저|이어서|이번에는|그럼)(\s|,|$)/, CL = /박수[^.!?]*(부탁|바랍니다|주시면|주십시오|주세요|맞아)/;
  let n = 0, nm = 0; const bad = {}; const add = (k, ex) => { bad[k] = bad[k] || { n: 0, ex }; bad[k].n++; };
  for (const ex of O.EXAMPLES) for (const mood of moods) for (const who of whos) for (const songBy of ['friend', 'self']) for (const vk of ['vow', 'thanks']) for (const letter of ['none', 'each', 'parent']) for (const a2 of extras) {
    const S = { course: 'open' }; O.applyExample(S, ex.k); S.candleWho = who; S.songBy = songBy; S.vowKind = vk;
    if (letter === 'none') delete S.on.letter; else { S.on.letter = 1; S.letter = letter; }
    a2.forEach((k) => { S.on[k] = 1; if (k === 'free') S.freeWhat = 'speech'; });
    const before = JSON.stringify(S);
    O.moodApply(S, mood); C.moodFit(S); n++;
    const tag = `${ex.k}/${mood}/${who}/${songBy}/${vk}/${letter}/${a2.join('') || '-'}`;
    if (mood === 'keep') { const s2 = JSON.parse(JSON.stringify(S)); delete s2.mood; if (JSON.stringify(s2) !== before) add('④ «지금 그대로»가 값을 바꿨다', tag); }
    else { nm++; const c = C.moodClash(S); if (c) add('② 겹침(같은 첫 낱말 · 박수 잇달음)', tag + ' ' + c.k);
      const nz = C.norm(JSON.parse(JSON.stringify(S))); if (JSON.stringify(nz.narEx || {}) !== JSON.stringify(S.narEx || {})) add('④ norm 이 분위기 값을 지웠다', tag); }
    const cs = C.build(S, { mode: 'console' }).cues, all = cs.map((c) => c.text).join(' ');
    if (/산뜻한/.test(all) || cs.some((c) => c.slug === 'bridge-b11-song-light')) add('③ B11(축가 앞 이음말 247)이 나간다', tag);
    if (((all.match(/분위기/g)) || []).length > 1) add('③ «분위기» 두 번', tag);
    for (let i = 0; i < cs.length - 1; i++) { const a = cs[i], b = cs[i + 1];
      if (a.slug === 'bridge-b9-declare-seat' && b.k === 'bless') add('③ B9 → 덕담', tag);
      if (a.slug === 'bridge-b8-face-guests' && (/^이제/.test(b.text) || /하객을 향해 서/.test(b.text))) add('③ B8 뒤 «이제» · 같은 지시', tag);
      if (a.slug === 'bridge-b12-tribute-calm' && BO.test(b.text)) add('③ B12 뒤 이음말', tag);
      if (a.slug === 'bridge-b10-speech-clap' && CL.test(b.text)) add('③ B10 뒤 박수 청', tag);
      if (a.slug === 'narr-toast-out' && b.slug === 'narr-close' && !a.live) add('③ 축배 맺는 말 → 사진 안내(잔 내려놓기 없음)', tag);
      if (/^bridge-/.test(a.slug) && /^bridge-/.test(b.slug) && a.slug !== 'bridge-b3-clap-thanks') add('③ 이음말 뒤 이음말', tag); }
    /* ★[REVIEW22_1018 검토 130] 멀리 떨어진 되풀이 — 다정 · 뭉클에 «위해(위한) … 준비» 두 줄 이상(덕담 받는 말 · 축사 · 축가 여는 말) ·
       선언 박수 → «박수, 고맙습니다» → «선언해 주신 분께서는, …» → 다시 박수 청(14초) */
    if ((mood === 'warm' || mood === 'moving') && cs.filter((c) => /위(해|한)[^.]*준비/.test(c.text || '')).length > 1) add('⑥ «위해 … 준비» 되풀이', tag);
    for (let i = 0; i + 3 < cs.length; i++) if (CL.test(cs[i].text || '') && cs[i + 1].slug === 'bridge-b3-clap-thanks' && /^bridge-b9-declare-seat/.test(cs[i + 2].slug) && CL.test(cs[i + 3].text || '')) { add('⑥ 박수 청 → 고맙습니다 → 자리 → 박수 청', tag); break; }
  }
  T(`② 분위기를 고른 대본 ${nm}편 — 겹침 0`, !Object.keys(bad).some((k) => k[0] === '②'), JSON.stringify(Object.entries(bad).filter(([k]) => k[0] === '②')));
  T(`③ 대본 ${n}편 — 이음말 빼는 조건 · 잔 내려놓기 · «분위기» 한 번`, !Object.keys(bad).some((k) => k[0] === '③'), JSON.stringify(Object.entries(bad).filter(([k]) => k[0] === '③')).slice(0, 400));
  T('④ «지금 그대로»는 값을 안 바꾼다 · 분위기 값은 저장(norm)을 지난다', !Object.keys(bad).some((k) => k[0] === '④'), JSON.stringify(Object.entries(bad).filter(([k]) => k[0] === '④')).slice(0, 300));
  T('⑥ 멀리 떨어진 되풀이 0 — 다정 · 뭉클 «위해 … 준비» · 선언 뒤 박수 두 번 [REVIEW22_1018]', !Object.keys(bad).some((k) => k[0] === '⑥'), JSON.stringify(Object.entries(bad).filter(([k]) => k[0] === '⑥')).slice(0, 300));
  T('⑤ 반지 맺는 말 예시 4 는 쉬는 소리(201) 대신 새 이름 [EX_SLUG_MOVED_1018]', O.narExCue({ narEx: { ring: 3 } }, 'narr-ring-out') === 'narr-ring-out-ex9' && C.FILES.indexOf('narr-ring-out-ex9') > -1);
  return R;
}
const self = process.argv.includes('--selftest');
if (self) { const R = run('fit'); const red = R.some(([m, c]) => m[0] === '②' && !c); console.log((red ? 'ok   ' : 'FAIL ') + '깨 보기 — moodFit 을 끄면 ② 가 빨강'); process.exit(red ? 0 : 1); }
const R = run(); let f = 0; R.forEach(([m, c, d]) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || !d ? '' : ' → ' + d)); if (!c) f++; });
console.log(f ? `MOOD FAIL ${f}` : 'MOOD OK'); process.exit(f ? 1 : 0);
