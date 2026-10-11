#!/usr/bin/env node
/* ★★[SOURCE_BASIS 2026-10-11 사장님 «우리가 작업하는 것들은 모두 내가 준 소스를 기반으로 · 수시로 자체 검열»
       · «평균을 구해서 사람들이 검증한 자료를 기반으로 실패 없는 코스» · «우리 웨딩 컨셉은 그들과 조금 다르니 정답지라곤 볼 수 없어»]
   순간(이벤트) 개편은 «실전 자료 평균 → 우리 컨셉으로 거르기» 두 단계로만 정한다.
   원천 = docs/plans/식순연구/순간개편_자료표.json · 결과 = 순간개편_근거장부.md(이 스크립트가 만든다 · 손으로 고치지 않는다)

   지키는 것
   1. 숫자는 사람이 세지 않는다 — 포함률 · 실제 예식 수 · 시간(중앙값)은 자료표에서 계산한다([NOT_THE_SOURCE]).
   2. 자료에서 온 순간은 자료 16개를 하나도 빠짐없이 판정한다(빈칸 = 빨강).
   3. 모든 줄에 «우리 컨셉» 거르기와 결론이 있다 · 자료에 없는 «우리 고유»는 가장 가까운 자료(near)를 댄다.
   4. 장부(.md)는 자료표에서 다시 만든 것과 한 글자도 다르지 않다 — 손으로 숫자를 고치면 빨강.
   쓰는 법: node scripts/audit/source-basis.mjs            (검사)
           node scripts/audit/source-basis.mjs --write    (장부 다시 만들기)
           node scripts/audit/source-basis.mjs --selftest (깨 보기 — 빨강이 나와야 초록) */
import fs from 'node:fs';

const J = 'docs/plans/식순연구/순간개편_자료표.json';
const MD = 'docs/plans/식순연구/순간개편_근거장부.md';
const VERDICT = ['유지', '추가', '수정', '기본에서 내림', '해당 없음', '우리 고유'];
const MARK = { 1: '●', 0.5: '◐', s: '○', 0: '·' };

function validate(d) {
  const bad = [];
  const keys = Object.keys(d.sources || {});
  if (keys.length < 10) bad.push('자료가 10개 미만이다');
  (d.moments || []).forEach((m) => {
    const at = '«' + m.name + '»';
    if (!VERDICT.includes(m.verdict)) bad.push(at + ' 결론이 정해진 말이 아니다: ' + m.verdict);
    if (!String(m.concept || '').trim()) bad.push(at + ' 우리 컨셉 거르기가 비었다');
    if (!String(m.proposal || '').trim()) bad.push(at + ' 제안이 비었다');
    if (!String(m.ours || '').trim()) bad.push(at + ' «우리 지금»이 비었다');
    if (m.data) {
      keys.forEach((k) => { if (!(k in m.data)) bad.push(at + ' 자료 ' + k + ' 판정이 빠졌다'); });
      Object.entries(m.data).forEach(([k, v]) => {
        if (!keys.includes(k)) bad.push(at + ' 모르는 자료 ' + k);
        if (!Array.isArray(v) || ![1, 0.5, 's', 0].includes(v[0]) || !(v[1] === null || typeof v[1] === 'number')) bad.push(at + ' ' + k + ' 값 모양이 틀렸다');
      });
      if (m.verdict === '우리 고유') bad.push(at + ' 자료에 있는 순간을 «우리 고유»라 했다');
    } else if (!String(m.near || '').trim()) bad.push(at + ' 자료에 없는 순간인데 가장 가까운 자료(near)가 없다');
  });
  return bad;
}

function stat(d, m) {
  const keys = Object.keys(d.sources);
  const real = keys.filter((k) => d.sources[k].real);
  let base = 0, opt = 0, rb = 0;
  const mins = [];
  keys.forEach((k) => {
    const [p, min] = m.data[k];
    if (p === 1 || p === 0.5) { base += p; if (d.sources[k].real) rb += p; }
    else if (p === 's') opt += 1;
    if (typeof min === 'number') mins.push(min);
  });
  mins.sort((a, b) => a - b);
  const med = !mins.length ? null : mins.length % 2 ? mins[(mins.length - 1) / 2] : (mins[mins.length / 2 - 1] + mins[mins.length / 2]) / 2;
  return { n: keys.length, base, opt, real: real.length, rb, med, mn: mins.length };
}
const fmt = (x) => (Number.isInteger(x) ? String(x) : x.toFixed(1));

function render(d) {
  const keys = Object.keys(d.sources);
  const L = [];
  L.push('# 순간(이벤트) 개편 — 근거 장부');
  L.push('');
  L.push('> ★이 파일은 손으로 고치지 않는다 — `docs/plans/식순연구/순간개편_자료표.json` 을 고치고 `node scripts/audit/source-basis.mjs --write` 로 다시 만든다([SOURCE_BASIS]).');
  L.push('> 순서: ① 실전 자료 평균(포함률 · 시간은 도구가 계산) → ② 우리 컨셉으로 거르기(자료는 정답지가 아니다) → ③ 결론.');
  L.push('> 기본 = 그 자료의 기본 식순에 있음(«덕담 또는 축사» 같은 택1은 0.5) · 선택 = 생략 가능 · 끼워 넣기로만 언급 · 시간 = 분이 적힌 자료의 중앙값.');
  L.push('');
  L.push('## 1. 자료에서 온 순간');
  L.push('');
  L.push('| 순간 | 기본 | 선택 | 실제 예식 | 시간 | 우리 지금 | 우리 컨셉으로 거르기 | 결론 | 제안 |');
  L.push('|---|---:|---:|---:|---:|---|---|---|---|');
  d.moments.filter((m) => m.data).forEach((m) => {
    const s = stat(d, m);
    const pct = Math.round((s.base / s.n) * 100);
    L.push('| ' + [m.name, fmt(s.base) + '/' + s.n + ' (' + pct + '%)', String(s.opt), fmt(s.rb) + '/' + s.real,
      s.med === null ? '—' : fmt(s.med) + '분(' + s.mn + '곳)', m.ours, m.concept, '**' + m.verdict + '**', m.proposal].join(' | ') + ' |');
  });
  L.push('');
  L.push('## 2. 자료에 없는 우리 순간(우리 고유) · 자료에서 다른 결로 나오는 것');
  L.push('');
  L.push('| 순간 | 가장 가까운 자료 | 우리 지금 | 우리 컨셉으로 거르기 | 결론 | 제안 |');
  L.push('|---|---|---|---|---|---|');
  d.moments.filter((m) => !m.data).forEach((m) => {
    L.push('| ' + [m.name, m.near, m.ours, m.concept, '**' + m.verdict + '**', m.proposal].join(' | ') + ' |');
  });
  const cf = d.moments.filter((m) => m.conflict);
  if (cf.length) {
    L.push('');
    L.push('## 3. 예전 결정과 부딪히는 것 — 사장님께 하나씩 여쭌다');
    L.push('');
    cf.forEach((m) => L.push('- **' + m.name + '** · 제안 «' + m.proposal + '» ↔ ' + m.conflict));
  }
  L.push('');
  L.push('## 4. 판정 칸 (● 기본 · ◐ 택1 · ○ 선택 · · 없음)');
  L.push('');
  L.push('| 순간 | ' + keys.join(' | ') + ' |');
  L.push('|---|' + keys.map(() => ':-:').join('|') + '|');
  d.moments.filter((m) => m.data).forEach((m) => {
    L.push('| ' + m.name + ' | ' + keys.map((k) => MARK[m.data[k][0]] + (m.data[k][1] !== null ? ' ' + fmt(m.data[k][1]) : '')).join(' | ') + ' |');
  });
  L.push('');
  L.push('## 5. 자료 ' + keys.length + '개 (실제 예식 ' + keys.filter((k) => d.sources[k].real).length + '곳)');
  L.push('');
  keys.forEach((k) => L.push('- **' + k + '** ' + d.sources[k].name + (d.sources[k].real ? ' · 실제 예식' : '') + ' — momentedit-docs `research/식순_참고자료/' + d.sources[k].doc + '`'));
  L.push('');
  return L.join('\n');
}

const d = JSON.parse(fs.readFileSync(J, 'utf8'));
const arg = process.argv[2] || '';

if (arg === '--selftest') {
  const t1 = JSON.parse(JSON.stringify(d)); delete t1.moments[0].data.A;           // 자료 하나 판정 빠짐
  const t2 = JSON.parse(JSON.stringify(d)); t2.moments[1].verdict = '아마도';        // 정해지지 않은 결론
  const t3 = JSON.parse(JSON.stringify(d)); t3.moments[2].concept = ' ';            // 컨셉 거르기 비움
  const t4 = JSON.parse(JSON.stringify(d)); const o = t4.moments.find((m) => !m.data); if (o) o.near = '';   // 우리 고유인데 근거 없음
  const fails = [t1, t2, t3, t4].map((t) => validate(t).length > 0);
  const md = render(d).replace(/\| \*\*유지\*\* \|/, '| **추가** |');            // 손으로 고친 장부
  const mdFail = md !== render(d);
  if (fails.every(Boolean) && mdFail) { console.log('ok   [SOURCE_BASIS] 깨 보기 5종 모두 빨강'); process.exit(0); }
  console.log('FAIL [SOURCE_BASIS] 깨 보기 중 빨강이 안 난 것이 있다', fails, mdFail); process.exit(1);
}

const bad = validate(d);
if (bad.length) { bad.forEach((b) => console.log('FAIL [SOURCE_BASIS] ' + b)); process.exit(1); }
const out = render(d);
if (arg === '--write') { fs.writeFileSync(MD, out); console.log('ok   [SOURCE_BASIS] 장부를 다시 만들었다 → ' + MD); process.exit(0); }
const cur = fs.existsSync(MD) ? fs.readFileSync(MD, 'utf8') : '';
if (cur !== out) { console.log('FAIL [SOURCE_BASIS] 장부가 자료표와 다르다 — node scripts/audit/source-basis.mjs --write 로 다시 만든다(손으로 고치지 않는다)'); process.exit(1); }
console.log('ok   [SOURCE_BASIS] 순간 ' + d.moments.length + '개 · 자료 ' + Object.keys(d.sources).length + '개 · 모든 줄에 근거 · 장부 = 자료표');
