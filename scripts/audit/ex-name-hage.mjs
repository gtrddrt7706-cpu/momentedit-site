#!/usr/bin/env node
/* ★★[EX_NAME_HAGE 2026-10-09 사장님 «웃음 뒤에 진심 · 이런 문구는 오글거린다» · «심플하게 담백하게 다정하게 이런 식으로 일관성 있게» · «다른 곳들도»]
   예시 이름표(칩 글)는 모든 자리 «~하게» 한 낱말이다 — «격식 있게»처럼 «~ 있게»까지만 두 낱말.
   보는 자리(정적 · 브라우저 없음):
     ① 하객 맞이 GUEST_EX · ② 식전 영상 소개 PV_EX(AI · 스튜디오 «소개 멘트» 같은 이름) · ③ 입장 ENTRY(원천 assets/ritual-data.js + order-preview 사본 · 둘이 같아야 한다)
     ④ 현장 순간 참고 예시 REF_TITLE(느낌 이름만 · «한 분이 읽어요» 같은 «누가 읽나» 이름은 뺀다)
   한 줄 안에서 이름이 겹치지 않는지도 본다. 마지막에 스스로 깨 보기(옛 이름을 넣으면 빨강이 되는가).
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
const RD = fs.readFileSync(path.join(ROOT, 'assets/ritual-data.js'), 'utf8');
const WHO = new Set(['한 분이 읽기', '양가 부모님 나눠 읽기']);   // «누가 읽나» — 느낌 이름이 아니다
const OK = (n) => /^[가-힣]+게$/.test(n) || /^[가-힣]+ 있게$/.test(n);

function lists(op, rd) {
  const out = {}, miss = [];
  const g = op.match(/var GUEST_EX=\[([\s\S]*?)\n\];/); if (g) out['하객 맞이'] = [...g[1].matchAll(/\n \['([^']+)',/g)].map((m) => m[1]); else miss.push('GUEST_EX');
  const p = op.match(/PV_EX=\[([\s\S]*?)\n\];/); if (p) out['식전 영상 소개'] = [...p[1].matchAll(/\['([^']+)','/g)].map((m) => m[1]); else miss.push('PV_EX');
  const e1 = op.match(/var ENTRY=\{[\s\S]*?\n\};/), e2 = rd.match(/var ENTRY=\{[\s\S]*?\n\};/);
  if (e1) out['입장(화면 사본)'] = [...e1[0].matchAll(/\n [A-F]:\{d:"([^"]+)"/g)].map((m) => m[1]); else miss.push('ENTRY(order-preview)');
  if (e2) out['입장(원천)'] = [...e2[0].matchAll(/\n [A-F]:\{d:"([^"]+)"/g)].map((m) => m[1]); else miss.push('ENTRY(ritual-data)');
  const r = op.match(/var REF_TITLE=\{([^}]*)\}/); if (r) out['현장 순간 참고 예시'] = [...r[1].matchAll(/'([^']+)':'([^']+)'/g)].filter((m) => !WHO.has(m[1])).map((m) => m[2]); else miss.push('REF_TITLE');
  return { out, miss };
}
function judge(op, rd) {
  const { out, miss } = lists(op, rd), bad = [];
  miss.forEach((m) => bad.push('못 찾음 ' + m));
  for (const [k, v] of Object.entries(out)) {
    if (!v.length) bad.push(k + ' — 이름 0개(못 읽음)');
    v.forEach((n) => { if (!OK(n)) bad.push(k + ' — «' + n + '»는 «~하게» 한 낱말이 아니다'); });
    const dup = v.filter((n, i) => v.indexOf(n) !== i); if (dup.length && k !== '현장 순간 참고 예시') bad.push(k + ' — 겹친 이름 ' + dup.join(','));
  }
  const a = (out['입장(화면 사본)'] || []).join('|'), b = (out['입장(원천)'] || []).join('|');
  if (a !== b) bad.push('입장 이름 — 원천(ritual-data)과 화면 사본이 다르다: ' + b + ' ≠ ' + a);
  if ((out['입장(원천)'] || []).length !== 6) bad.push('입장 이름 — 여섯이 아니다(' + (out['입장(원천)'] || []).length + ')');
  return { out, bad };
}

let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const J = judge(OP, RD);
for (const [k, v] of Object.entries(J.out)) console.log('     ' + k + ': ' + v.join(' · '));
ok('[EX_NAME_HAGE] 예시 이름표 — 모든 자리 «~하게» 한 낱말 · 한 줄 안 겹침 없음 · 입장 원천 = 화면 사본', J.bad.length === 0, J.bad.join(' / '));
/* 스스로 깨 보기 — 옛 이름 · 문장 이름 · 원천과 사본 어긋남을 넣으면 빨강이어야 한다(통과만 하는 검사는 죽은 검사다) */
const t1 = judge(OP.replace(/'유머\+진심':'[^']+'/, "'유머+진심':'웃음 뒤에 진심'"), RD).bad.length > 0;
const t2 = judge(OP.replace(/\n \['다정하게',/, "\n ['따뜻한 마음을 담아',"), RD).bad.length > 0;
const t3 = judge(OP, RD.replace(/\n A:\{d:"[^"]+"/, '\n A:{d:"이야기처럼"')).bad.length > 0;
const t4 = judge(OP.replace(/PV_EX=\[/, 'PV_EXX=['), RD).bad.length > 0;
ok('스스로 깨 보기 — 문장 이름(웃음 뒤에 진심) · 긴 이름 · 원천만 옛 이름 · 목록을 못 읽음 → 넷 다 빨강', t1 && t2 && t3 && t4, JSON.stringify({ t1, t2, t3, t4 }));
console.log(fail ? `\nEX NAME HAGE FAIL ${fail}` : '\nEX NAME HAGE OK'); process.exit(fail ? 1 : 0);
