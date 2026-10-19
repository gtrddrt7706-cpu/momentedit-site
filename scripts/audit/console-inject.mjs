// ★[CONSOLE_INJECT_1019 · GUIDE_ON_1019 검토 138-0 · 138-2] 당일 콘솔 · 미리듣기가 식사 · 사진 · 하객 안내 · 온라인 참석을 같은 규칙으로 받는가
//   ① RitualPreviewLink: guide 가 KEYS · INJECT 에 있다 · guideOf(열쇠, 닫힘) · DINE_PH 가 마이페이지 DN_PLACEHOLDER 와 같다
//   ② 관리자 «당일 콘솔» 주소가 meal · photoShare · digital · guide 를 싣는다(RitualPreviewLink 한 곳 규칙)
//   ③ 콘솔에 식사 · 하객 안내 칩 · 엔진이 S.guide 를 읽는다(새 코스 사진 안내 264 · 85)
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let bad = 0; const ok = (m, c, x) => { console.log((c ? 'ok   ' : 'FAIL ') + m + (c || !x ? '' : '\n     ' + x)); if (!c) bad++; };
global.window = global; require(path.join(ROOT, 'assets/ritual-preview-link.js'));
const L = global.RitualPreviewLink;
ok('① guide 가 KEYS · INJECT 에 있다', L.KEYS.indexOf('guide') > -1 && L.INJECT.indexOf('guide') > -1);
ok('① guideOf — 열쇠 있고 안 닫힘만 참', L.guideOf('G123', false) === true && L.guideOf('G123', true) === false && L.guideOf('', false) === false && L.guideOf(null, false) === false);
const mp = rd('mypage.html'), m = mp.match(/var DN_PLACEHOLDER=(\[[^\]]*\])/);
ok('① DINE_PH = 마이페이지 DN_PLACEHOLDER(한 글자도 같게)', !!m && JSON.stringify(eval(m[1])) === JSON.stringify(L.DINE_PH), m && m[1]);
ok('① mealOf — 자리표시는 «안 골랐다» · 식당 이름은 «골랐다» · 안 함(N)은 없음', L.mealOf({ venuePick: '장소 미정' }, L.DINE_PH) === false && L.mealOf({ venuePick: '어느 식당' }, L.DINE_PH) === true && L.mealOf({ dining_on: 'N', venuePick: '어느 식당' }, L.DINE_PH) === false);
ok('① url 이 guide 를 싣는다(유무만)', (() => { const u = L.url({ course: 'open' }, { guide: true, meal: true }); const s = JSON.parse(decodeURIComponent(escape(atob(decodeURIComponent(u.split('S=')[1]))))); return s.guide === true && s.meal === true; })());
ok('① 마이페이지 미리듣기 · 식순 화면이 guide 를 넘긴다', /guide:RitualPreviewLink\.guideOf\(p&&p\.guideToken, _guideLinkClosed\(p&&p\.base\)\)/.test(mp) && /guide:_gOn/.test(mp) && (rd('order-preview.html').match(/guide:!!CUSTGUIDE/g) || []).length === 3);
const ad = rd('admin.html');
ok('② 관리자 당일 콘솔 — ritual-preview-link 를 싣고 네 값을 RitualPreviewLink 로', /assets\/ritual-preview-link\.js/.test(ad) && /_cS\.meal=!!_RPL\.mealOf\(dd,_RPL\.DINE_PH\)/.test(ad) && /_cS\.photoShare=!!_RPL\.photoShareOf\(gi\)/.test(ad) && /_cS\.digital=!!_RPL\.digitalOf\(_cInv\)/.test(ad) && /_cS\.guide=!!_RPL\.guideOf\(_cPr\.guideToken,_cCl\)/.test(ad));
ok('② 네 값은 콘솔 주소를 만들기 전에(같은 try 안 · href 앞)', ad.indexOf('_cS.guide=') > -1 && ad.indexOf('_cS.guide=') < ad.indexOf('href="/console.html?S=\'+encodeURIComponent'));
const co = rd('console.html');
ok('③ 콘솔 칩 — 식사 자리 · 하객 안내 · 사진 올리기', /rMeal:\s*\['meal'/.test(co) && /rGuide:\s*\['guide'/.test(co) && /id="rMeal"/.test(co) && /id="rGuide"/.test(co));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
const sl = (o) => C.build(Object.assign({ course: 'open', on: {} }, o), { mode: 'console' }).cues.map((c) => c.slug);
ok('③ 엔진 — 식사 날 45 · 없는 날 110 · 하객 안내 날 264 · 85', sl({ meal: 1 }).indexOf('end-1a-farewell') > -1 && sl({}).indexOf('end-1c-thanks-nomeal') > -1 && sl({ guide: 1 }).indexOf('narr-photo-upload') > -1 && sl({ guide: 1 }).indexOf('narr-photo-send') > -1 && sl({}).indexOf('narr-photo-send') < 0);
console.log(bad ? '\nCONSOLE INJECT FAIL ' + bad : '\nCONSOLE INJECT OK');
process.exit(bad ? 1 : 0);
