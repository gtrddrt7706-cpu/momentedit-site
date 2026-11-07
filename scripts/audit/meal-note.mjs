// ★[MEAL_NOTE_1107 덧 8 · 사장님 «식당 예약 시 멘트가 달라지잖아 · 고객 입장에서 모를 것 같은데»]
// 식사 경로로 판이 갈리는 줄에만 «식사 장소에 맞춰 바뀌는 안내예요 · 지금: …» — 엔진 mealNoteOf 를 잰다(엔진만 · 브라우저 없음).
//   node scripts/audit/meal-note.mjs
// ① 미정 · 식당 예약 · 카페 세 상태에서 바뀌는 줄 = 판 고르기(guestPick · afterPhotoOf · closingOf)가 식사 값으로 갈리는 줄
// ② 상태 이름이 판 고르기와 같은 조건(엔진이 고른 판 ↔ 이름)
// ③ 안 바뀌는 줄(입장 때 · 1분 전 · 여는 멘트 · 그 밖)에는 없음
import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
require(path.join(ROOT, 'assets/ritual-data.js'));
const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
let bad = 0;
const ok = (name, cond, note = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (note ? '  ' + note : '')); if (!cond) bad++; };
process.on('exit', (code) => { if (bad && code === 0) process.exitCode = 1; });

ok('엔진이 mealNoteOf · mealVaries · mealStateOf 를 내보낸다', typeof C.mealNoteOf === 'function' && typeof C.mealVaries === 'function' && typeof C.mealStateOf === 'function');

const STATES = {
  undecided: { st: { dining: 'undecided' }, name: '식사 장소 미정', open: true },
  resv: { st: { meal: true, mealFull: true, resv: true, dining: 'meal' }, name: '식당 예약', open: false },
  cafe: { st: { meal: true, mealFull: false, resv: false, dining: 'cafe' }, name: '카페 · 다과', open: false }
};
/* 바뀌어야 하는 자리(판 고르기 이름) — 슬러그 꼴로만 적는다(엔진 판 목록을 손으로 옮기지 않는다) */
const VARY = [/^guest-w-10m-/, /^guest-w-5m-/, /^narr-closing/, /^after-photo/];
const STILL = [/^guest-w-arrival/, /^guest-w-1m/, /^narr-open/];
for (const ex of ['standard', 'record']) for (const dig of [0, 1]) for (const [nm, d] of Object.entries(STATES)) {
  const S = Object.assign(O.applyExample({}, ex), { course: 'open', digital: dig }, d.st);
  const cs = C.build(S, { mode: 'console' }).cues;
  const notes = cs.map((c) => [c.slug, C.mealNoteOf(S, c.slug)]);
  const on = notes.filter((x) => x[1]).map((x) => x[0]);
  const tag = `${ex}${dig ? '+온라인' : ''} · ${nm}`;
  ok(`[${tag}] 바뀌는 줄 넷(10분 전 · 5분 전 · 마무리 멘트 · 촬영 후 안내)에 한 줄`, VARY.every((re) => on.some((s) => re.test(s))) && on.length === VARY.length, on.join(','));
  ok(`[${tag}] 안 바뀌는 줄(입장 때 · 1분 전 · 여는 멘트 · 그 밖)엔 없음`, notes.filter((x) => !VARY.some((re) => re.test(x[0] || ''))).every((x) => !x[1]) && cs.filter((c) => STILL.some((re) => re.test(c.slug || ''))).length >= 3);
  ok(`[${tag}] 상태 이름 «${d.name}» · 정하는 곳 안내는 미정만`, notes.filter((x) => x[1]).every((x) => x[1].name === d.name && x[1].open === d.open));
}

/* ② 이름 ↔ 판 고르기 — 식사 값 여덟 조합 전부 · 엔진이 고른 판과 이름의 갈래가 같아야 한다 */
let same = true; const why = [];
for (const meal of [0, 1]) for (const mealFull of [0, 1]) for (const resv of [0, 1]) {
  const S = Object.assign(O.applyExample({}, 'standard'), { course: 'open', meal: !!meal, mealFull: !!mealFull, resv: !!resv });
  const k = C.mealStateOf(S).k, ap = C.afterPhotoOf(S), cl = C.closingOf(S), g10 = C.guestPick(S, 1);
  const want = ap === 'after-photo-meal' ? (/mealr/.test(cl) ? 'resv' : 'meal') : ap === 'after-photo-cafe' ? 'cafe' : 'none';
  const nm = C.mealStateOf(S).name;
  const nmOk = { resv: /예약$/, meal: /예약 시각 미정$/, cafe: /^카페/, none: /^식사 장소 미정$/ }[k].test(nm);
  if (k !== want || /-meal$/.test(g10) !== (k === 'resv' || k === 'meal') || !nmOk) { same = false; why.push(`${meal}${mealFull}${resv}:${k}/${want}/${nm}`); }
}
ok('상태 이름 = 판 고르기와 같은 조건(식사 값 여덟 조합)', same, why.join(' '));
ok('식사 없음 확정 · 확인 필요는 이름만 다르고 «정하면» 안내 없음', (() => { const b = Object.assign(O.applyExample({}, 'standard'), { course: 'open' });
  const a = C.mealStateOf(Object.assign({}, b, { dining: 'none' })), c = C.mealStateOf(Object.assign({}, b, { dining: 'needs-confirmation' })), u = C.mealStateOf(b);
  return a.name === '식사 없음' && !a.open && c.name === '식사 여부 확인 필요' && !c.open && u.name === '식사 장소 미정' && u.open; })());
ok('식당 이름이 오면 «○○ 예약» · 없으면 «식당 예약»', C.mealStateOf({ meal: 1, mealFull: 1, resv: 1, dineName: '소담' }).name === '소담 예약' && C.mealStateOf({ meal: 1, mealFull: 1, resv: 1 }).name === '식당 예약');
ok('슬러그가 없거나 판 고르기 밖이면 없음', !C.mealNoteOf({}, '') && !C.mealNoteOf({ course: 'open' }, 'narr-open') && !C.mealNoteOf({ course: 'open' }, 'guest-w-arrival-guide'));
console.log(bad ? `\nmeal-note: FAIL ${bad}` : '\nmeal-note: ALL OK');
