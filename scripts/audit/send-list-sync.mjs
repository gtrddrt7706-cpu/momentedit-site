#!/usr/bin/env node
/* ★★[SEND_LIST_SYNC 2026-11-23 · PREP_HUB_1123] assets/send-list.js(마이페이지 «준비할 것»)가 옮겨 둔 최소 규칙이 원천 assets/ritual-open.js 와 같은가.
   마이페이지는 ritual-open.js 를 싣지 않는다 — 그래서 «무엇이 해당하나»를 send-list.js 가 따로 가른다. 두 곳이 갈라지면 여기서 빨강.
   잰다(식순 초안 여러 판 × 순간 조합):
     ① onOf · freeKind · ALWAYS · RETIRED · 축사 칩 값이 원천과 같다
     ② ① 보낼 것(축가 반주 · 준비한 순서 · 덕담 · 축사 원고 · 두 분 목소리)이 원천 prepList 의 그 줄과 하나씩 맞고 마감(며칠 전)도 같다 — 넘치지도 빠지지도 않는다
     ③ ② 두 분이 준비할 것 = 원천의 «부탁드릴 것 · 챙길 것»(덕담 · 축사 원고 빼고) · 체크 열쇠 p:<순간>:<j> 의 j 가 원천 prepOf 의 그 줄 순번이다(빌더 체크와 같은 칸)
     ④ 두 분 목소리 줄 열쇠(g0 · g1 · g3)가 order-preview.html GUEST_KEYS 와 같다 · 서버 열쇠(RF_PREP)와 화면 열쇠(PREP_KEYS)가 같다
   --selftest : 일부러 어긋난 판(축가 마감 3 → 7)을 넣어 이 검사가 빨강이 되는지 본다. 종료 코드 0 통과 · 1 실패 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
const SRC = fs.readFileSync(path.join(ROOT, 'assets/send-list.js'), 'utf8');
function load(src) { const box = { window: {} }; vm.runInNewContext(src, box); return box.window.SendList; }

function run(SL, quiet) {
  let fail = 0; const ok = (m, c, d) => { if (!quiet || !c) console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 400)}`); if (!c) fail++; };
  ok('① ALWAYS · RETIRED 가 원천과 같다', JSON.stringify(Object.keys(O.ALWAYS).sort()) === JSON.stringify(['entry', 'guest', 'matjeol']) && JSON.stringify(Object.keys(O.RETIRED)) === JSON.stringify(['cake']));
  ok('① 축사 칩 값이 원천 CHIPS.free 와 같다', JSON.stringify((O.CHIPS.free || []).map((c) => c[0])) === JSON.stringify(['speech']), (O.CHIPS.free || []).map((c) => c[0]));
  const KS = ['song', 'bless', 'free', 'ring', 'declare', 'candle', 'tribute', 'toast', 'letter', 'vow', 'welcome', 'midvid', 'cake', 'prevideo'];
  const variants = [];
  const frees = [undefined, 'speech', 'etc', 'video', 'stage', 'gift', 'hand', 'dance'];
  let n = 0;
  for (let mask = 0; mask < 64; mask++) for (const fw of frees) {
    const on = {}; ['song', 'bless', 'free', 'ring', 'declare', 'candle'].forEach((k, i) => { if (mask & (1 << i)) on[k] = 1; });
    if (n % 3 === 0) { on.tribute = 1; on.toast = 1; on.cake = 1; }
    const S = { on, freeWhat: fw, songBy: (n % 4 === 1) ? 'self' : '', songWho: (n % 5 === 2) ? 'gfr' : '', guestVoice: (n % 2) ? 'couple' : 'narr', entryVoice: (n % 3 === 1) ? 'couple' : '', declareWho: (n % 6 === 0) ? '신랑 아버님' : '' };
    if (n % 7 === 3) S.mkc = { 'p:bless:0': 'site' }; if (n % 7 === 5) S.mkc = { 'p:free:0': 'site', 'p:ring:0': 1 };
    if (n % 9 === 4) S.mu = { src: 'up', fid: 'F1' };
    variants.push(S); n++;
  }
  let onBad = 0, fkBad = 0, sendBad = [], twoBad = [], nameBad = [];
  for (const S of variants) {
    for (const k of KS) if (SL.onOf(S, k) !== O.onOf(S, k)) onBad++;
    if (SL.freeKind(S) !== O.FREE_KIND[O.chipOf('free', S)]) fkBad++;
    const pl = O.prepList(S);
    const L = SL.build({ S, summary: { prep: pl }, wed: '2027-05-01', today: '2027-04-01', voice: { sup: {} } });
    /* ② 보낼 것 ↔ 원천 줄 */
    const want = [];
    pl.forEach((q) => {
      if (q.k === 'song' && q.cat === 'send') want.push(['mr', q.due]);
      if (q.k === 'free' && q.cat === 'send' && /^준비한 순서/.test(q.what)) want.push(['fx', q.due]);
      if (q.k === 'bless' && q.cat === 'ask') want.push(['bl', q.due]);
      if (q.k === 'free' && q.cat === 'ask' && /^축사 원고/.test(q.what)) want.push(['sp', q.due]);
      if (q.k === 'guest' && q.cat === 'send') want.push(['vg', q.due]);
      if (q.k === 'entry' && q.cat === 'send') want.push(['ve', q.due]);
    });
    const have = L.send.filter((r) => ['mr', 'fx', 'bl', 'sp', 'vg', 've'].includes(r.id)).map((r) => [r.id, r.dueDays]);
    const a = JSON.stringify(want.sort()), b = JSON.stringify(have.sort());
    if (a !== b) sendBad.push({ S, want, have });
    /* ③ 두 분이 준비할 것 ↔ 원천 «부탁 · 챙길 것» · 체크 열쇠 순번 */
    const w2 = [];
    O.ORDER.filter((k) => O.onOf(S, k)).forEach((k) => O.prepOf(k, S).forEach((q, j) => { const c = q[2] || 'send'; if ((c === 'ask' || c === 'bring') && !((k === 'bless' || k === 'free') && c === 'ask')) w2.push('p:' + k + ':' + j + '|' + q[1]); }));
    const h2 = L.two.map((r) => r.mk + '|' + r.what);
    if (JSON.stringify(w2.sort()) !== JSON.stringify(h2.sort())) twoBad.push({ w2, h2 });
    if (L.send.some((r) => r.id === 'sp') && O.nameOf('free', S) !== SL.NAME.free) nameBad.push('free');
  }
  ok(`① onOf 가 원천과 같다(초안 ${variants.length}판 × 순간 ${KS.length})`, !onBad, onBad);
  ok('① freeKind 가 원천 FREE_KIND[chipOf(free)] 와 같다', !fkBad, fkBad);
  ok('② 보낼 것(축가 반주 · 준비한 순서 · 덕담 · 축사 원고 · 두 분 목소리) = 원천 prepList 의 그 줄 · 마감 같음', !sendBad.length, sendBad[0]);
  ok('③ 두 분이 준비할 것 = 원천 «부탁 · 챙길 것» · 체크 열쇠 순번이 prepOf 와 같다', !twoBad.length, twoBad[0]);
  for (const k of ['song', 'bless', 'candle', 'declare', 'ring', 'tribute', 'toast', 'letter']) { const S = { on: { [k]: 1 } }; if (O.nameOf(k, S) !== SL.NAME[k]) nameBad.push(k + ':' + O.nameOf(k, S) + '≠' + SL.NAME[k]); }
  ok('① 순간 이름(NAME)이 원천 nameOf 와 같다', !nameBad.length, nameBad);
  /* ④ 열쇠 */
  const op = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8'), gm = op.match(/var GUEST_KEYS=(\[[^\]]*\])/);
  const slg = SRC.match(/var GUEST_KEYS = (\[[^\]]*\])/);
  ok('④ 두 분 목소리 줄 열쇠 = order-preview GUEST_KEYS', !!gm && !!slg && gm[1].replace(/\s/g, '').replace(/"/g, "'") === slg[1].replace(/\s/g, '').replace(/"/g, "'"), [gm && gm[1], slg && slg[1]]);
  const gs = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8'), rm = gs.match(/var RF_PREP = (\{[^}]*\})/);
  let srvKeys = null; try { srvKeys = rm ? Function('return ' + rm[1])() : null; } catch (e) {}
  ok('④ 서버 RF_PREP = 화면 PREP_KEYS(열쇠 · 이름)', !!srvKeys && JSON.stringify(srvKeys) === JSON.stringify(SL.PREP_KEYS), [srvKeys, SL.PREP_KEYS]);
  return fail;
}

if (process.argv.includes('--selftest')) {
  const bad = SRC.replace('song: 3,', 'song: 7,');
  if (bad === SRC) { console.log('FAIL selftest — 바꿀 자리를 못 찾았다'); process.exit(1); }
  const f = run(load(bad), true);
  console.log(f ? `ok   selftest — 어긋난 판(축가 마감 7)은 빨강(${f}건)` : 'FAIL selftest — 어긋난 판인데 통과했다(죽은 검사)');
  process.exit(f ? 0 : 1);
}
const fail = run(load(SRC), false);
console.log(fail ? `\nSEND_LIST_SYNC FAIL ${fail}` : '\nSEND_LIST_SYNC OK'); process.exit(fail ? 1 : 0);
