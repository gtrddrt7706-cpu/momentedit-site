// [MOMENT_SCRIPT 2026-09-27 사장님 «각각 이벤트 영상 · 손동작 · 시나리오 대본처럼 · 스텝바이스텝으로 하나하나 점검»]
// docs/plans/식순연구/순간영상_장면대본_0927.md 를 기계로 잰다.
//
//   node scripts/audit/moment-script-check.mjs
//
// ① 편 목록 = 엔진이 부르는 장면 이름(ritual-open videoKeys · 모든 순간 · 케이크와 축배) — 빠진 편 · 남는 편 0
// ② 편마다 «답하는 물음 · 실제 진행 · 남는 장면 · 표지 · 장면 대본 · 손동작 · 반복 이음 · 영문» 여덟 칸이 다 있다
//    ★[MOMENT_COVER 2026-09-28] 표지 = 첫 프레임 · ① 칸(약 170×96)에는 이 한 장만 뜬다 — 편마다 적어 둔다
// ③ 초 단위 대본이 0 에서 시작해 빈틈 · 겹침 없이 이어지고, 끝 초 = 제목의 길이 · 6~10초 안
//    ★[VIDEO_V8_0928] 작업자 기획서 v7 반영 — 종전 5~8초. 사이트는 영상 길이에 매이지 않는다(소리 없이 반복 · 보고 듣기는 소리 끝에 넘어감)
// ④ 영문 줄에 F02 금지 낱말(ceremony · altar · aisle · officiant · church)과 빼는 말(no · without · not)이 없다
// ⑤ 파일 칸 이름 = 제목의 이름
// ★종료 코드 0 = 통과 · 1 = 실패
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DOC = process.env.DOC || path.join(ROOT, 'docs/plans/식순연구/순간영상_장면대본_0927.md');   // DOC=사본 — 깨 보기용
const O = require(path.join(ROOT, 'assets/ritual-open.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const src = fs.readFileSync(DOC, 'utf8');
const parts = src.split(/\n(?=### \d+\. )/).slice(1).map((s) => s.split(/\n---\n|\n## /)[0]);
const want = new Set(); ['guest', 'prevideo'].concat(O.ORDER || []).concat(['_close']).forEach((k) => {
  (O.videoKeys(k, { toast: 'both', course: 'open' }) || []).forEach((v) => want.add(v)); });
const got = [];
parts.forEach((p) => {
  const h = p.match(/^### \d+\. ([a-z-]+) · (.+?) · (\d+)초/);
  if (!h) { ok('제목 모양 «### N. 이름 · 순간 · N초»', false, p.slice(0, 60)); return; }
  const [, key, , secS] = h, sec = +secS; got.push(key);
  const f = p.match(/- 파일: `([^`]+)\.mp4`/);
  ok(`${key} 파일 칸 = ${key}.mp4`, f && f[1] === key, f && f[1]);
  const need = ['답하는 물음', '실제 진행', '남는 장면', '표지', '장면 대본', '손동작', '반복 이음', '영문'];
  const miss = need.filter((n) => !new RegExp('- ' + n + '[:\\s]').test(p));
  ok(`${key} 여덟 칸(${need.join(' · ')})`, !miss.length, '빠짐: ' + miss.join(','));
  const rows = [...p.matchAll(/^\| (\d+(?:\.\d+)?)–(\d+(?:\.\d+)?) \|/gm)].map((m) => [+m[1], +m[2]]);
  let cont = rows.length > 0 && rows[0][0] === 0; for (let i = 1; i < rows.length; i++) if (rows[i][0] !== rows[i - 1][1]) cont = false;
  const end = rows.length ? rows[rows.length - 1][1] : -1;
  ok(`${key} 초 대본 — 0 에서 빈틈 · 겹침 없이 ${end}초 = 제목 ${sec}초 · 6~10초`, cont && end === sec && sec >= 6 && sec <= 10 && rows.every(([a, b]) => b > a), JSON.stringify(rows));
  const en = (p.match(/- 영문: `([^`]+)`/) || [])[1] || '';
  const bad = en.match(/\b(ceremony|altar|aisle|officiant|church)\b/i), neg = en.match(/\b(no|without|not|never)\b|n't\b/i);
  ok(`${key} 영문 한 줄 — F02 금지 낱말 · 빼는 말 없음`, en.length > 40 && !bad && !neg, (bad || neg || ['(영문 없음)'])[0]);
});
const miss = [...want].filter((k) => !got.includes(k)), extra = got.filter((k) => !want.has(k)), dup = got.filter((k, i) => got.indexOf(k) !== i);
ok(`편 목록 = 엔진 장면 이름 ${want.size}편 (빠짐 ${miss.length} · 남음 ${extra.length} · 겹침 ${dup.length})`, !miss.length && !extra.length && !dup.length, JSON.stringify({ miss, extra, dup }));
console.log(fail ? `\n★ 실패 ${fail}건` : `\nMOMENT SCRIPT OK — ${got.length}편`); process.exit(fail ? 1 : 0);
