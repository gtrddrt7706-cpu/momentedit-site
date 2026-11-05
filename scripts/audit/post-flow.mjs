/* ★★[POST_FLOW_200 검토 200 · 200 보충 2 F · 사장님 «식후 블록 순서 표시 일치 검사를 merge-guard 에»]
 * 식후 = 전체 단체 사진(한 장) → 촬영 후 안내(그 직후 · 가족 사진 전) → 가족 사진 · 추가 촬영(원하시는 분들과) — ★[END_FLOW_200 최종 · AFTER_BEFORE_FAMILY_200].
 * 원천은 assets/ritual-open.js POST_FLOW 하나 — 이 검사가 화면 · 엔진 · 마이페이지 · 콘솔 · 브리프가 같은 이름 · 같은 차례인지 잰다.
 *   E  엔진(새 코스 예시 넷) — 전체 하객 → 촬영 후 안내 → 가족 구도 → 추가 촬영 큐 차례 · 추가 촬영 이름 = POST_FLOW
 *   B  식순 화면(order-preview) — 식후 줄이 POST_KS 하나로 그려진다(고르기 칸 · 예식 흐름 · 완성 · 오늘 흐름 칩 · 골라서 연습하기) · 옛 이름 없음
 *   M  마이페이지 사진 단계 — 전체 → 촬영 후 안내 → 가족 구도 → 추가 촬영 · 브리프 같은 차례
 *   N  화면 이름 금지어(«사진 촬영(» · «남은 분들과 자유롭게» · «친구들과 자유롭게 ·») — 나레이션 문장은 따로
 * 쓰기: node scripts/audit/post-flow.mjs  (종료 0 통과 · 1 실패 · 스스로 깨 보기가 어긋나도 1) */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const require = createRequire(import.meta.url);
const rd = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
const WANT = ['전체 단체 사진', '촬영 후 안내', '가족 사진 · 추가 촬영'];

function code(s) { return s.split('\n').map((l) => l.replace(/\/\*.*?\*\//g, '').replace(/^\s*\/\/.*$/, '').replace(/\s\/\/ .*$/, '')).join('\n'); }

function check(src) {
  const bad = [];
  /* 원천 */
  const names = src.O.POST_FLOW.map((x) => x.n);
  if (names.join('|') !== WANT.join('|')) bad.push(`원천 POST_FLOW 이름 · 차례가 «${WANT.join(' → ')}»가 아니다(${names.join(' → ')})`);
  if (src.O.POST_FLOW.map((x) => x.k).join(',') !== '_photo,_after,_extra') bad.push('원천 POST_FLOW 열쇠가 _photo,_after,_extra 가 아니다');
  /* E 엔진 */
  for (const ex of src.O.EXAMPLES) {
    let S = src.O.applyExample({ course: 'open' }, ex.k); S.course = 'open';
    const cs = src.C.build(S, { mode: 'live' }).cues;
    const iP = cs.findIndex((c) => c.actId === 'photo-all'), iF = cs.findIndex((c) => c.actId === 'photo-family'), iA = cs.findIndex((c) => /^after-photo/.test(c.slug || '')), iX = cs.findIndex((c) => c.actId === 'photo-free');
    if (iP < 0 || iF < 0 || iA < 0 || iX < 0) { bad.push(`E ${ex.k}: 전체 하객 · 가족 구도 · 촬영 후 안내 · 추가 촬영 큐 중 없는 것(${iP},${iF},${iA},${iX})`); continue; }
    if (!(iP + 1 === iA && iA + 1 === iF && iF < iX)) bad.push(`E ${ex.k}: 큐 차례가 전체 하객 → 촬영 후 안내 → 가족 구도 → 추가 촬영이 아니다(${iP},${iA},${iF},${iX})`);
    if (cs[iX].name !== '추가 촬영' || WANT[2].indexOf(cs[iX].name) < 0) bad.push(`E ${ex.k}: 추가 촬영 큐 이름 «${cs[iX].name}»(화면 «${WANT[2]}» 안의 이름)`);   /* [AFTER_BEFORE_FAMILY_200] 콘솔은 가족 구도 · 추가 촬영 두 큐 */
    if (cs[iA].name !== WANT[1]) bad.push(`E ${ex.k}: 촬영 후 안내 큐 이름 «${cs[iA].name}»`);
    if (!(cs[iX].live && cs[iX].live.est >= 10)) bad.push(`E ${ex.k}: 추가 촬영 남는 시간(est)이 비었다`);
  }
  /* B 식순 화면 */
  const op = code(src.op);
  const need = [
    ['POST_KS 원천', "var POST_KS=RitualOpen.POST_FLOW.map(function(x){ return x.k; });"],
    ['① 진행 줄(늘 포함 · FIX_FLOW_204 A)', "if(_afterOn()) h+=_fxFlow('post');"],
    ['진행 줄 · 예식 흐름 원천(_fixSteps)', "return [{t:'',n:_post('_photo').n,"],
    ['예식 흐름 사진 · 정리(FIX_FLOW_204 B)', "_fixSteps('post').map(fxRow).join('')"],
    ['완성 식후 세 줄', "if(_afterOn()) POST_KS.forEach(function(k){ var x=_post(k), d=_postDur(k);"],
    ['오늘 흐름 칩', "if(_afterOn()) POST_KS.forEach(function(k){ g.push({p:k,ks:[]}); });"],
    ['골라서 연습하기', "+(_afterOn()?POST_KS.map(function(k){"],
    ['한눈에 보기', "POST_KS.map(function(k){ return _post(k).n; }).join(' → ')"],
    ['② 닫는 인사 끝', "_qRow('다음 · '+_post('_photo').n)"],
    ['② 촬영 후 안내 첫 줄', "(k==='_after'?_qRow(_postLine('_photo')):'')"],
    ['② 촬영 후 안내 끝 줄', "k==='_after'?_qRow(_postLine('_extra')):''"],
    ['다음 단추', "return '다음 · 본식 뒤 '+_post('_photo').n+' · '+_post('_after').n;"],   // [STAGE_SHOW_NI11 · d-14]
    ['드롭다운 구분 줄', "if(k==='_after') h+=_sep('_photo');"],
    ['연습 단체 사진', "txt:_post('_photo').n+' · 한 장 · 연습에서는 넘겨요'"],
    ['연습 추가 촬영', "txt:_post('_extra').n+' · 연습 끝'"],
    ['끝 화면 시간', "' · 단체 사진(전체 · 가족) · 추가 촬영 '+p.photo"],
  ];
  for (const [nm, t] of need) if (!op.includes(t)) bad.push(`B ${nm}: 식후 줄이 POST_FLOW 로 그려지지 않는다`);
  for (const t of ["row('_photo')+row('_after')", "['_photo','_after']", "사진 촬영(전체", "x.p==='photo'?'사진'", "_afterOn())?POST_KS:[])"]) if (op.includes(t)) bad.push(`B 옛 식후 줄이 남았다 «${t}»`);
  /* M 마이페이지 · 브리프 · 콘솔 · 관리 */
  /* [B2_MA_66 2026-11-06] 마이페이지 차례 제목 «전체 단체 사진» · «가족 사진» */ const mp = code(src.mp), iMP = mp.indexOf("_stepHd('전체 단체 사진'"), iMA = mp.indexOf("_stepHd('촬영 후 안내'"), iMX = mp.indexOf("_stepHd('추가 촬영'"), iMF = mp.indexOf("_stepHd('가족 사진'");
  if (iMP < 0 || iMA < 0 || iMX < 0 || iMF < 0 || !(iMP < iMA && iMA < iMF && iMF < iMX)) bad.push(`M 마이페이지 사진 단계 차례가 전체 → 촬영 후 안내 → 가족 구도 → 추가 촬영이 아니다(${iMP},${iMA},${iMF},${iMX})`);
  const br = code(src.br), iBA = br.indexOf('<b>촬영 후 안내</b>'), iBF = br.indexOf('<b>가족 구도</b>'), iBX = br.indexOf('<b>추가 촬영</b>');
  if (iBA < 0 || iBF < 0 || iBX < 0 || !(iBA < iBF && iBF < iBX)) bad.push('M 브리프 차례가 촬영 후 안내 → 가족 구도 → 추가 촬영이 아니다');
  /* N 화면 이름 금지어 */
  for (const [f, s] of [['mypage', mp], ['brief', br], ['console', code(src.co)], ['admin', code(src.ad)], ['order-preview', op]]) {
    for (const t of ["'남은 분들과 자유롭게'", '<b>남은 분들과 자유롭게</b>', "'친구들과 자유롭게 · '", "row('친구들과 자유롭게'", '사진 촬영(전체 · 가족 · 추가)']) if (s.includes(t)) bad.push(`N ${f}: 화면 이름 «${t}»`);
  }
  return bad;
}

const src = {
  O: require(path.join(ROOT, 'assets/ritual-open.js')),
  op: rd('order-preview.html'), mp: rd('mypage.html'), br: rd('brief.html'), co: rd('console.html'), ad: rd('admin.html'),
};
require(path.join(ROOT, 'assets/ritual-data.js'));
src.C = require(path.join(ROOT, 'assets/ritual-cue.js'));

const bad = check(src);
/* 스스로 깨 보기 — 되돌리면 빨강인가 */
const brk = [
  ['마이페이지 차례 뒤집기', { ...src, mp: src.mp.replace("_stepHd('촬영 후 안내'", '_X_').replace("_stepHd('가족 사진'", "_stepHd('촬영 후 안내'").replace('_X_', "_stepHd('가족 사진'") }],
  ['예식 흐름 옛 줄', { ...src, op: src.op.replace("_fixSteps('post').map(fxRow).join('')", "row('_photo')+row('_after')") }],
  ['원천 이름 바꾸기', { ...src, O: { ...src.O, POST_FLOW: [src.O.POST_FLOW[0], src.O.POST_FLOW[2], src.O.POST_FLOW[1]] } }],
];
let selfBad = 0;
for (const [nm, s] of brk) { if (!check(s).length) { console.log(`FAIL post-flow 깨 보기 «${nm}» 가 초록 — 검사가 죽었다`); selfBad++; } }
if (bad.length || selfBad) { for (const b of bad) console.log('FAIL post-flow ' + b); console.log(`✗ [POST_FLOW_200] 식후 순서 표시 ${bad.length}건`); process.exit(1); }
console.log(`ok post-flow — 식후 «${WANT.join(' → ')}» · 엔진 예시 ${src.O.EXAMPLES.length} · 식순 화면 15곳 · 마이페이지 · 브리프 · 콘솔 · 관리 · 깨 보기 ${brk.length}개 맞음`);
