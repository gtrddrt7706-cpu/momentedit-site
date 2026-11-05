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
global.window = global; require(path.join(ROOT, 'assets/dining-data.js')); global.DINE_DB = global.DINE_DB || (function () { const vm = require('node:vm'), c = {}; vm.createContext(c); vm.runInContext(rd('assets/dining-data.js'), c); return c.DINE_DB; })(); require(path.join(ROOT, 'assets/ritual-preview-link.js'));   /* [DINE_DATA_NI16] 목록을 먼저 읽는다(마이페이지 · 관리자와 같은 순서) */
const L = global.RitualPreviewLink;
ok('① guide 가 KEYS · INJECT 에 있다', L.KEYS.indexOf('guide') > -1 && L.INJECT.indexOf('guide') > -1);
ok('① guideOf — 닫히지 않았으면 참(열쇠와 상관없이 · [GUIDE_ALWAYS_202])', L.guideOf('G123', false) === true && L.guideOf('G123', true) === false && L.guideOf('', false) === true && L.guideOf('', true) === false);
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
ok('③ 엔진 — [CLOSING_LINE_1031] 마무리 멘트: 식사 자리 + 예약 시각 + 하객 안내 날 291 · 식사 · 카페만 289/290 · 없는 날 287/288 · 사진 전 안내(265 · 266 · 26) · 감사 인사 45 · 110 · 85 는 새 코스에서 안 튼다 · 하객 안내 날 입장 때 298(사진 올리기 줄 · 검토 191)', sl({ meal: 1, mealFull: 1, resv: 1, guide: 1 }).indexOf('narr-closing-mealr') > -1 && sl({ meal: 1, guide: 0 }).indexOf('narr-closing') > -1 && sl({ guide: 0 }).indexOf('narr-closing') > -1 && sl({}).indexOf('narr-closing') > -1   /* ★[INFO_SPLIT_200] 하객 안내 갈래 없음 · 카페만 = 식사 없는 판 */ && sl({ meal: 1 }).concat(sl({}), sl({ guide: 1 })).every((x) => x !== 'end-1a-farewell' && x !== 'end-1c-thanks-nomeal' && x !== 'narr-photo-send' && x !== 'narr-close' && !/^narr-photo-pre/.test(x || '')) && sl({ guide: 1 }).indexOf('guest-w-arrival-guide') > -1 && sl({ guide: 1 }).indexOf('narr-photo-upload') < 0);   /* ★[GUEST_WELCOME_191 검토 191] 하객 안내 날 사진 올리기는 입장 때 줄(298)이 말한다 · 5분 전 264 는 걷었다 */
/* ★[PHOTO_PRE_PICK_1030 PAUSE_PREF_1030 · 대본 섹션 10/30 14:22] 266 은 «식사는 안내된 예약 시간에»라고 말한다 — 식사 자리 · 예약 시각 · 하객 안내 셋 다일 때만 */
const pp = (o) => sl(Object.assign({ meal: 1, mealFull: 1, resv: 1, guide: 1 }, o)).filter((x) => /^narr-closing/.test(x || ''));
ok('④ 엔진 — [INFO_SPLIT_200] 식사 자리 + 예약 시각 342 · 예약 시각 빔 339 · 카페만 · 애프터 웨딩 안 고름 287(하객 안내와 상관없이)', pp({})[0] === 'narr-closing-mealr' && pp({ mealFull: 0 })[0] === 'narr-closing' && pp({ resv: 0 })[0] === 'narr-closing-mealnr' && pp({ guide: 0 })[0] === 'narr-closing-mealr' && pp({ meal: 0, mealFull: 0, resv: 0 })[0] === 'narr-closing' && pp({ meal: 0, mealFull: 0, resv: 0, guide: 0 })[0] === 'narr-closing', JSON.stringify([pp({}), pp({ mealFull: 0 }), pp({ resv: 0 }), pp({ guide: 0 })]));
const fv = (m) => ({ venuePick: '어느 곳', _favs: [{ n: '어느 곳', m, src: 'kakao' }] });
ok('④ mealFullOf — [DINE_STATUS_NI16] 지도 «음식점 > 카페» 는 식사 아님 · «음식점 > 한식» 은 식사 · 주소의 «카페거리»는 근거 아님 · 담은 곳 설명 · 옛 식사 형태는 근거 아님(확인 필요) · 자리표시는 안 고름',
  L.mealFullOf(fv('음식점 > 카페 > 커피전문점 · 1.2km'), L.DINE_PH) === false && L.mealFullOf(fv('음식점 > 한식 · 1.2km · 카페거리 10'), L.DINE_PH) === true
  && L.diningStatusOf({ venuePick: '어느 곳', _favs: [{ n: '어느 곳', m: '차5분 · 보통 · 한식·코스' }] }, L.DINE_PH) === 'needs-confirmation' && L.diningStatusOf(Object.assign({ venuePick: '너른마당', mealType: '카페' }), L.DINE_PH) === 'meal'
  && L.diningStatusOf({ venuePick: '장소 미정', _favs: [{ n: '장소 미정', m: '음식점 > 한식', src: 'kakao' }] }, L.DINE_PH) === 'undecided' && L.diningStatusOf({ dining_on: 'N', venuePick: '너른마당' }, L.DINE_PH) === 'none');
ok('④ mealFullOf — 목록(assets/dining-data.js DINE_DB)의 카페는 전부 cafe · 음식 종류가 있는 식당은 전부 meal · 음식 종류가 빈 곳은 확인 필요(목록이 바뀌어도 맞는지)', (() => { const db = global.DINE_DB; if (!db || db.length <= 20) return false;
  return db.every((r) => L.diningStatusOf({ venuePick: r.n }, L.DINE_PH) === (r.th === 'cafe' ? 'cafe' : (r.f && r.f.length ? 'meal' : 'needs-confirmation'))); })());
ok('④ 마이페이지 · 관리자가 목록을 미리듣기 규칙보다 먼저 읽는다 [DINE_DATA_NI16]', [mp, ad].every((h) => h.indexOf('/assets/dining-data.js') > -1 && h.indexOf('/assets/dining-data.js') < h.indexOf('/assets/ritual-preview-link.js')) && !/var DINE_DB = \[/.test(mp));
ok('④ resvOf — 다이닝 예약 시각 우선 · 키 없을 때만 하객 안내 옛 저장분 · 빈 값 = 지움', L.resvOf({ reserveTime: '13:30' }, {}) === true && L.resvOf({}, { reserveTime: '13:30' }) === true && L.resvOf({ reserveTime: '' }, { reserveTime: '13:30' }) === false && L.resvOf({}, {}) === false);
ok('④ resvOf — [RESV_PARSE_NI17] 시각 꼴만 예약 · 미정 · 취소 · 24:80 · 오후 13시는 예약 아님 · 지금 «미정»이면 옛 12:00 을 되살리지 않는다', ['13:30', '9:05', '13시', '13시30분', '오후1시30분', '오전12시', '00:00'].every((t) => L.resvTimeOk(t)) && ['미정', '예약 전', '추후 안내', '취소', '24:80', '오후13시', '13:30 취소'].every((t) => !L.resvTimeOk(t)) && L.resvOf({ reserveTime: '미정' }, { reserveTime: '12:00' }) === false && L.resvOf({}, { reserveTime: '12:00' }) === true);
ok('④ mealFull · resv 가 KEYS · INJECT 에 있다', ['mealFull', 'resv'].every((k) => L.KEYS.indexOf(k) > -1 && L.INJECT.indexOf(k) > -1));
const op = rd('order-preview.html'), ro = rd('assets/ritual-open.js');
ok('④ 세 갈래가 같은 값을 넘긴다 — 콘솔(관리자) · 미리 듣기(마이페이지) · 연습하기(식순 화면) · 40분 셈(postSec)',
  /_cS\.mealFull=!!_RPL\.mealFullOf\(dd,_RPL\.DINE_PH\)/.test(ad) && /_cS\.resv=!!_RPL\.resvOf\(dd,gi\)/.test(ad)
  && /mealFull:RitualPreviewLink\.mealFullOf\(p&&p\.diningDraft, DN_PLACEHOLDER\), resv:RitualPreviewLink\.resvOf\(p&&p\.diningDraft, p&&p\.guideinfoDraft\)/.test(mp) && /meal:_meal, mealFull:_mealF, resv:_resv, guide:_gOn/.test(mp)
  && (op.match(/mealFull:!!CUSTMEALF, ?resv:!!CUSTRESV/g) || []).length === 4 && /CUSTMEALF=ev\.data\.mealFull/.test(op)
  && /var m = _postOf\(S, 'meal'\) && _postOf\(S, 'mealFull'\), k = m \? \(_postOf\(S, 'resv'\) \? 'meal' : 'mealNr'\) : 'none'/.test(ro)   /* [INFO_SPLIT_200] 40분 셈도 식사 자리 × 예약 시각 */ && /rMealFull:\['mealFull'/.test(co) && /id="rResv"/.test(co));
/* ★[PHOTO_PRE_GAP_1030] 콘솔 간격 — 디지털 참석 날 온라인 인사 끝 GO 뒤 2초 · 그 밖은 GO 에 바로 · 사진 전 안내 뒤 전체 사진은 GO */
const cq = (o) => C.build(Object.assign({ course: 'open', on: {} }, o), { mode: 'console' }).cues, pre = (o) => cq(o).find((c) => /^narr-closing/.test(c.slug || ''));
ok('④ 콘솔 간격 — 마무리 멘트는 GO(손) · 디지털 날만 2초 쉼 · 끝나면 전체 하객 사진(소리 없음 · 사슬)으로 · 그 뒤 가족 구도는 사람 구간 뒤 GO [CLOSING_LINE_1031]', (() => { const a = pre({}), b = pre({ digital: true }), q = cq({}), ia = q.findIndex((c) => /^narr-closing/.test(c.slug || '')); return a && b && a.fire === 'manual' && b.fire === 'manual' && !a.goLeadMs && b.goLeadMs === 2000 && !a.live && (q[ia + 1] || {}).actId === 'photo-all' && (q[ia + 2] || {}).fire === 'manual' && /Math\.max\(_need \? _dms : 0, c\.goLeadMs \|\| 0\)/.test(co); })());
console.log(bad ? '\nCONSOLE INJECT FAIL ' + bad : '\nCONSOLE INJECT OK');
process.exit(bad ? 1 : 0);
