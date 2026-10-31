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
ok('③ 엔진 — [CLOSING_LINE_1031] 마무리 멘트: 식사 자리 + 예약 시각 + 하객 안내 날 291 · 식사 · 카페만 289/290 · 없는 날 287/288 · 사진 전 안내(265 · 266 · 26) · 감사 인사 45 · 110 · 85 는 새 코스에서 안 튼다 · 하객 안내 날 264(5분 전)', sl({ meal: 1, mealFull: 1, resv: 1, guide: 1 }).indexOf('narr-closing-meal') > -1 && sl({ meal: 1 }).indexOf('narr-closing-soft') > -1 && sl({}).indexOf('narr-closing') > -1 && sl({ meal: 1 }).concat(sl({}), sl({ guide: 1 })).every((x) => x !== 'end-1a-farewell' && x !== 'end-1c-thanks-nomeal' && x !== 'narr-photo-send' && x !== 'narr-close' && !/^narr-photo-pre/.test(x || '')) && sl({ guide: 1 }).indexOf('narr-photo-upload') > -1);
/* ★[PHOTO_PRE_PICK_1030 PAUSE_PREF_1030 · 대본 섹션 10/30 14:22] 266 은 «식사는 안내된 예약 시간에»라고 말한다 — 식사 자리 · 예약 시각 · 하객 안내 셋 다일 때만 */
const pp = (o) => sl(Object.assign({ meal: 1, mealFull: 1, resv: 1, guide: 1 }, o)).filter((x) => /^narr-closing/.test(x || ''));
ok('④ 엔진 — 셋 다 291 · 카페만 290 · 예약 시각 빔 290 · 하객 안내 없음 289 · 애프터 웨딩 안 고름 288(하객 안내) · 287', pp({})[0] === 'narr-closing-meal' && pp({ mealFull: 0 })[0] === 'narr-closing-soft-guide' && pp({ resv: 0 })[0] === 'narr-closing-soft-guide' && pp({ guide: 0 })[0] === 'narr-closing-soft' && pp({ meal: 0, mealFull: 0, resv: 0 })[0] === 'narr-closing-guide' && pp({ meal: 0, mealFull: 0, resv: 0, guide: 0 })[0] === 'narr-closing', JSON.stringify([pp({}), pp({ mealFull: 0 }), pp({ resv: 0 }), pp({ guide: 0 })]));
const fv = (m) => ({ venuePick: '어느 곳', _favs: [{ n: '어느 곳', m }] });
ok('④ mealFullOf — 목록 «카페» · 지도 «음식점 > 카페» 는 식사 아님 · 식당은 식사 · 담은 곳에 없으면 모름(식사 아님) · 옛 식사 형태 «다과»는 식사 아님',
  L.mealFullOf(fv('차12분 · 보통 · 카페'), L.DINE_PH) === false && L.mealFullOf(fv('음식점 > 카페 > 커피전문점 · 1.2km'), L.DINE_PH) === false && L.mealFullOf(fv('차5분 · 보통 · 한식·코스'), L.DINE_PH) === true
  && L.mealFullOf({ venuePick: '어느 곳' }, L.DINE_PH) === false && L.mealFullOf(Object.assign(fv('한식'), { mealType: '다과' }), L.DINE_PH) === false && L.mealFullOf({ venuePick: '장소 미정', _favs: [{ n: '장소 미정', m: '한식' }] }, L.DINE_PH) === false);
ok('④ mealFullOf — 마이페이지 목록(DINE_DB)의 카페는 전부 식사 아님 · 식당은 전부 식사(목록이 바뀌어도 맞는지)', (() => { const mm = mp.match(/var DINE_DB = \[([\s\S]*?)\n\];/); if (!mm) return false; const db = eval('[' + mm[1] + ']'); const PR = { low: '', mid: '', high: '' };
  return db.length > 20 && db.every((r) => L.mealFullOf(fv('차' + r.d + '분 · ' + (PR[r.p] || '') + (r.f && r.f.length ? ' · ' + r.f.join('·') : '')), L.DINE_PH) === (r.th !== 'cafe')); })());
ok('④ resvOf — 다이닝 예약 시각 우선 · 키 없을 때만 하객 안내 옛 저장분 · 빈 값 = 지움', L.resvOf({ reserveTime: '13:30' }, {}) === true && L.resvOf({}, { reserveTime: '13:30' }) === true && L.resvOf({ reserveTime: '' }, { reserveTime: '13:30' }) === false && L.resvOf({}, {}) === false);
ok('④ mealFull · resv 가 KEYS · INJECT 에 있다', ['mealFull', 'resv'].every((k) => L.KEYS.indexOf(k) > -1 && L.INJECT.indexOf(k) > -1));
const op = rd('order-preview.html'), ro = rd('assets/ritual-open.js');
ok('④ 세 갈래가 같은 값을 넘긴다 — 콘솔(관리자) · 미리 듣기(마이페이지) · 연습하기(식순 화면) · 40분 셈(postSec)',
  /_cS\.mealFull=!!_RPL\.mealFullOf\(dd,_RPL\.DINE_PH\)/.test(ad) && /_cS\.resv=!!_RPL\.resvOf\(dd,gi\)/.test(ad)
  && /mealFull:RitualPreviewLink\.mealFullOf\(p&&p\.diningDraft, DN_PLACEHOLDER\), resv:RitualPreviewLink\.resvOf\(p&&p\.diningDraft, p&&p\.guideinfoDraft\)/.test(mp) && /meal:_meal, mealFull:_mealF, resv:_resv, guide:_gOn/.test(mp)
  && (op.match(/mealFull:!!CUSTMEALF, ?resv:!!CUSTRESV/g) || []).length === 4 && /CUSTMEALF=ev\.data\.mealFull/.test(op)
  && /_postOf\(S, 'mealFull'\) && _postOf\(S, 'resv'\) && g /.test(ro) && /g = _postOf\(S, 'guide'\)/.test(ro) && /rMealFull:\['mealFull'/.test(co) && /id="rResv"/.test(co));
/* ★[PHOTO_PRE_GAP_1030] 콘솔 간격 — 디지털 참석 날 온라인 인사 끝 GO 뒤 2초 · 그 밖은 GO 에 바로 · 사진 전 안내 뒤 전체 사진은 GO */
const cq = (o) => C.build(Object.assign({ course: 'open', on: {} }, o), { mode: 'console' }).cues, pre = (o) => cq(o).find((c) => /^narr-closing/.test(c.slug || ''));
ok('④ 콘솔 간격 — 마무리 멘트는 GO(손) · 디지털 날만 2초 쉼 · 끝나면 전체 하객 사진(소리 없음 · 사슬)으로 · 그 뒤 가족 구도는 사람 구간 뒤 GO [CLOSING_LINE_1031]', (() => { const a = pre({}), b = pre({ digital: true }), q = cq({}), ia = q.findIndex((c) => /^narr-closing/.test(c.slug || '')); return a && b && a.fire === 'manual' && b.fire === 'manual' && !a.goLeadMs && b.goLeadMs === 2000 && !a.live && (q[ia + 1] || {}).actId === 'photo-all' && (q[ia + 2] || {}).fire === 'manual' && /Math\.max\(_need \? _dms : 0, c\.goLeadMs \|\| 0\)/.test(co); })());
console.log(bad ? '\nCONSOLE INJECT FAIL ' + bad : '\nCONSOLE INJECT OK');
process.exit(bad ? 1 : 0);
