#!/usr/bin/env node
/* [GD_OLDTAIL_1119 2026-11-19 NIGHT20 #14] 하객 안내(guide.html pickKind)와 식순(ritual-preview-link.js diningStatusOf)이 «지금 고른 곳»을 같은 근거로 가르는지 잰다.
   ① 옛 끝 토막 낱말 목록(GD_MAP_MEAL_RE ↔ MAP_MEAL_RE)이 글자까지 같다 ② 표본 다섯 판의 판정이 기대와 같다(옛 «한식 · 1.2km» = 식사 · «스타벅스» = 모름 · 목록에 있는 곳은 목록 f 만).
   근거 결정: [B2_MA_64] 같은 근거 · [B2_FIX_NI16] 옛 끝 토막 · [GD_OLDTAIL_1119] */
import fs from 'fs';
const g = fs.readFileSync('guide.html', 'utf8'), r = fs.readFileSync('assets/ritual-preview-link.js', 'utf8');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const gx = /var GD_MAP_MEAL_RE = (\/.*?\/);/.exec(g), rx = /var MAP_MEAL_RE = (\/.*?\/);/.exec(r);
ok(!!gx && !!rx && gx[1] === rx[1], '① 옛 끝 토막 낱말 목록이 두 파일에서 같다');
const grab = (src, re) => { const m = re.exec(src); return m ? m[0] : ''; };
const code = ['var GD_CAFE_RE', 'function _gdKind', 'var GD_MAP_MEAL_RE', 'function _gdOldTail'].map((h) => grab(g, new RegExp(h.replace(/[$()*+.?[\\\]^{|}]/g, '\\$&') + '[^\\n]*'))).join('\n');
const pk = /function pickKind\(dn\)\{[\s\S]*?\n\}/.exec(g);
ok(!!pk && code.split('\n').every(Boolean), '② pickKind · 보조 함수를 찾았다');
const window = { DINE_DB: [{ n: '소반', f: ['한정식'] }, { n: '목록카페', f: ['카페'] }] };
const pickKind = new Function('window', code + '\n' + (pk ? pk[0] : '') + '\nreturn pickKind;')(window);
const R = (pick, m) => ({ pick, restos: [{ n: pick, m }] });
const cases = [
  [R('라 트라토리아', '양식 > 이탈리안 · 1.2km'), 'meal', '«분류 > 분류» 식사'],
  [R('카페 모먼트', '카페 > 디저트카페 · 300m'), 'cafe', '«분류 > 분류» 카페'],
  [R('한우마을', '한식 · 1.2km · 경기 고양시'), 'meal', '옛 끝 토막 «한식» = 식사(식순과 같게)'],
  [R('스타벅스 향동점', '스타벅스 · 300m'), '', '상호만 = 모름(짐작 안 함)'],
  [R('어딘가', '경기 고양시 덕양구 1'), '', '숫자 든 토막 = 모름'],
  [R('소반', '카페 · 예상 2만'), 'meal', '목록에 있는 곳은 목록 f 만(설명의 «카페»를 안 본다)'],
];
for (const [dn, want, m] of cases) { const got = pickKind(dn); ok(got === want, `③ ${m} → ${JSON.stringify(got)}`); }
process.exit(bad ? 1 : 0);
