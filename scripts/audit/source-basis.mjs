#!/usr/bin/env node
/* ★★[SOURCE_BASIS 2026-10-11 사장님 «우리가 작업하는 것들은 모두 내가 준 소스를 기반으로 · 수시로 자체 검열»
       · «평균을 구해서 사람들이 검증한 자료를 기반으로 실패 없는 코스» · «우리 웨딩 컨셉은 그들과 조금 다르니 정답지라곤 볼 수 없어»]
   순간(이벤트) 개편은 «실전 자료 평균 → 우리 컨셉으로 거르기» 두 단계로만 정한다.
   원천 = docs/plans/식순연구/순간개편_자료표.json · 결과 = 순간개편_근거장부.md(이 스크립트가 만든다 · 손으로 고치지 않는다)

   지키는 것
   1. 숫자는 사람이 세지 않는다 — 포함률 · 실제 예식 수 · 시간(중앙값)은 자료표에서 계산한다([NOT_THE_SOURCE]).
   2. 자료에서 온 순간은 자료표 sources 의 자료를 하나도 빠짐없이 판정한다(빈칸 = 빨강 · 새 자료를 더하면 모든 줄에 판정을 붙인다).
   3. 모든 줄에 «우리 컨셉» 거르기와 결론이 있다 · 자료에 없는 «우리 고유»는 가장 가까운 자료(near)를 댄다.
   4. 장부(.md)는 자료표에서 다시 만든 것과 한 글자도 다르지 않다 — 손으로 숫자를 고치면 빨강.
   5. ★[PRIOR_SEEN 2026-10-11] 바꾸는 줄(추가 · 수정 · 기본에서 내림 · 해당 없음)은 찾을 말(kw)과 읽은 예전 결정(prior)을 단다.
      코드에서 그 말과 결정 낱말(사장님 · 사용자 지시 · 금지 · 되살리지 · 폐지 · RETIRED)이 한 줄에 있는 표식을
      하나라도 prior 에 안 적으면 장부를 다시 만들 수 없다(--write 빨강).
      까닭: 첫 판이 축가를 «추가»로 냈다 — 9/25 «라이브 노래 · 연주는 받지 않는다»([FREE_WHAT]) · 8/09 [SONG_RETIRED] ·
      8/07 [TRIM_EVENTS] 를 읽지 않았다. 표식은 코드에 다 있었다. 읽었다는 표시를 요구하면 못 지나간다.
      평소 검사(merge-guard)는 새로 생긴 표식을 «참고»로만 알린다 — 다른 작업의 PR 을 막지 않는다. 장부를 고칠 때(--write) 막는다.
   쓰는 법: node scripts/audit/source-basis.mjs            (검사)
           node scripts/audit/source-basis.mjs --write    (장부 다시 만들기)
           node scripts/audit/source-basis.mjs --selftest (깨 보기 — 빨강이 나와야 초록)
           node scripts/audit/source-basis.mjs --closed   (1단계가 닫혔나 — «진행» 줄이 하나라도 있으면 빨강)
   6. ★[STAGE1_CLOSE 2026-10-11 사장님 «1단계에서 더 이상 추가 · 빼기 · 수정할 게 없는지 확실하게 마무리하고 2단계로»]
      모든 줄에 상태(state)를 단다 — 끝(main 반영) · 2단계(기본 코스에서) · 3단계(나레이션 문안에서) · 다른 섹션 · 그대로 · 진행.
      부딪혔던 줄(conflict)은 사장님 결정(decided)을 함께 적는다 · 결정이 없으면 «진행»이 아니라 빨강이다(묻지 않고 넘어가지 않는다).
   7. ★[EX_STD_1012 2026-10-12 사장님 «정석 · 기록 · 가족 · 간결 (추천)»] 2단계(예시 코스) — 자료표 courses 에 예시마다 «왜»를 적고,
      담는 순간 · 자료 포함률 · 본식 · 테이블 인사 · 단체 사진 · 알림은 엔진(EXAMPLES · span · noticeList)이 재서 장부 8장에 쓴다.
      예시를 바꾸면 장부가 달라져 빨강 → --write 로 다시 만든다 · 예시마다 «왜»가 없거나 부딪힌 결정에 사장님 결정이 없으면 빨강.
      --stage2 = 2단계가 닫혔나(«2단계» 줄이 하나라도 남으면 빨강). */
import fs from 'node:fs';
import { createRequire } from 'node:module';
/* ★[EX_STD_1012 2026-10-12] 2단계 예시 코스 — 담는 순간 · 시간 · 알림은 엔진이 잰다(장부 8장 · 사람이 적지 않는다) */
const O = createRequire(import.meta.url)('../../assets/ritual-open.js');

const J = 'docs/plans/식순연구/순간개편_자료표.json';
const MD = 'docs/plans/식순연구/순간개편_근거장부.md';
const VERDICT = ['유지', '추가', '수정', '기본에서 내림', '해당 없음', '우리 고유'];
const MARK = { 1: '●', 0.5: '◐', s: '○', 0: '·' };
const STATE = ['끝', '2단계', '3단계', '다른 섹션', '그대로', '진행'];   // [STAGE1_CLOSE]
// [PRIOR_SEEN] 바꾸는 줄 · 훑는 파일(고객 화면 · 엔진 · AI 상담) · 결정 낱말 · 표식
const CHECKED = ['추가', '수정', '기본에서 내림', '해당 없음'];
const SCAN = ['assets/ritual-data.js', 'assets/ritual-cue.js', 'assets/ritual-open.js', 'assets/ritual-story.js', 'assets/advisor-kb.js',
  'order-preview.html', 'mypage.html', 'index.html', 'admin.html', 'console.html', 'api/_ritual-kb.js', 'api/_kb.js'];
const DEC = /사장님|사용자 지시|사용자 결정|금지|되살리지|폐지|RETIRED/;
const MK = /\[([A-Z][A-Z0-9_]{2,})(?=[\s\]·])/g;
let LINES = null;
function codeLines() {
  if (!LINES) { LINES = []; SCAN.forEach((f) => { if (fs.existsSync(f)) fs.readFileSync(f, 'utf8').split('\n').forEach((l, i) => LINES.push([f, i + 1, l])); }); }
  return LINES;
}
function priorFound(kw) {
  const out = {};
  codeLines().forEach(([f, n, l]) => {
    if (!kw.some((k) => l.includes(k)) || !DEC.test(l)) return;
    for (const m of l.matchAll(MK)) (out[m[1]] = out[m[1]] || []).push(f + ':' + n);
  });
  return out;
}
// strict = 장부를 다시 만들 때 · 깨 보기 — 못 읽은 표식이 있으면 빨강 / 아니면 «참고»
function priorCheck(d, strict) {
  const bad = [], note = [];
  (d.moments || []).filter((m) => CHECKED.includes(m.verdict)).forEach((m) => {
    const at = '«' + m.name + '»';
    if (!Array.isArray(m.kw) || !m.kw.length || m.kw.some((k) => !String(k).trim())) { bad.push(at + ' 찾을 말(kw)이 없다 [PRIOR_SEEN]'); return; }
    if (!m.prior || typeof m.prior !== 'object' || Array.isArray(m.prior)) { bad.push(at + ' 읽은 예전 결정(prior)이 없다 — 없으면 {} [PRIOR_SEEN]'); return; }
    Object.entries(m.prior).forEach(([k, v]) => {
      if (!String(v || '').trim()) bad.push(at + ' [' + k + '] 읽은 뜻이 비었다 [PRIOR_SEEN]');
      if (!codeLines().some(([, , l]) => new RegExp('\\b' + k + '\\b').test(l))) (strict ? bad : note).push(at + ' [' + k + '] 는 코드에 없는 표식이다 [PRIOR_SEEN]');
    });
    const found = priorFound(m.kw);
    Object.keys(found).filter((k) => !(k in m.prior)).forEach((k) => (strict ? bad : note).push(at + ' 예전 결정 [' + k + '] 를 읽은 표시가 없다(' + found[k].slice(0, 2).join(' · ') + ') [PRIOR_SEEN]'));
  });
  return { bad, note };
}

/* ★[COUNT_STALE_1013 2026-10-13] 자료를 더하면 손으로 적은 «총수»도 바뀐다 — 장부를 다시 만들 때(--write) 자료 수가 바뀌었으면
   옛 총수를 «전체»로 적은 줄(«/18» · «자료 18곳» · «18개 중»)과 옛 실제 예식 수(«실제 예식 n/7» · «실제 예식 7곳»)를 찾아 하나라도 남으면 장부를 쓰지 않는다.
   까닭: S(18번째)를 넣을 때 자료표 문장 둘(2부 «자료 1곳만» · 신부 측 먼저 목록)을 놓쳤고, T · U(23개)를 넣을 때 «/18 · 18곳 · 자료 18개»가
   자료표 7줄 · 코드 · 주석 · AI 상담 지식 11줄에 남아 있었다(손으로 grep 해 찾음 · 이 검사를 그 판에 돌려 18줄 모두 잡는 것을 확인). 결정 기록(prior · decided · conflict · was)은 그날의 근거라 그대로 둔다.
   ★«목록» 문장(어느 자료가 그렇다)은 이 검사가 못 잡는다 — 새 자료가 ● 인 줄의 근거 목록은 사람이 다시 읽는다(3단계 대본 검토 11장). */
const COUNT_SCAN = SCAN.concat(['automation/tests/merge-guard.sh']);
function prevTotals() {
  if (!fs.existsSync(MD)) return null;
  const m = fs.readFileSync(MD, 'utf8').match(/## 5\. 자료 (\d+)개 \(실제 예식 (\d+)곳\)/);
  return m ? { n: +m[1], real: +m[2] } : null;
}
function staleCounts(d, prev, lines) {
  const ks = Object.keys(d.sources || {}), n = ks.length, real = ks.filter((k) => d.sources[k].real).length, out = [], pats = [];
  if (!prev) return out;
  if (prev.n !== n) pats.push(new RegExp('/' + prev.n + '(?![\\d.])'), new RegExp('자료 ' + prev.n + '(?:곳|개)'), new RegExp('(?<![\\d.])' + prev.n + '(?:곳|개) 중'));
  if (prev.real !== real) pats.push(new RegExp('실제 예식 [\\d.]+/' + prev.real + '(?![\\d.])'), new RegExp('실제 예식 ' + prev.real + '(?:곳|개)'));
  if (!pats.length) return out;
  const hit = (t) => pats.some((p) => p.test(t)), HIST = { prior: 1, decided: 1, conflict: 1, was: 1, data: 1, sources: 1 };
  (function walk(o, at) {
    if (typeof o === 'string') { if (hit(o)) out.push('자료표 ' + at + ' «' + o.slice(0, 60) + '…»'); return; }
    if (Array.isArray(o)) { o.forEach((x, i) => walk(x, at + '[' + i + ']')); return; }
    if (o && typeof o === 'object') Object.keys(o).forEach((k) => { if (!HIST[k]) walk(o[k], at + (o.name ? '«' + o.name + '»' : '') + '.' + k); });
  })(d, '');
  (lines || COUNT_SCAN.filter((f) => fs.existsSync(f)).reduce((a, f) => a.concat(fs.readFileSync(f, 'utf8').split('\n').map((l, i) => [f, i + 1, l])), []))
    .forEach(([f, i, l]) => { if (/자료|실제 예식|장부/.test(l) && hit(l)) out.push(f + ':' + i); });   // «장부» — 이어지는 줄(«편지(0/18 …(장부 …)») · 10/13 깨 보기에서 놓친 한 줄
  return out;
}

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
    if (!STATE.includes(m.state)) bad.push(at + ' 상태가 정해진 말이 아니다: ' + m.state + ' [STAGE1_CLOSE]');
    if (m.conflict && m.state !== '진행' && !String(m.decided || '').trim()) bad.push(at + ' 부딪힌 줄인데 사장님 결정(decided)이 없다 [STAGE1_CLOSE]');
    if (m.data) {
      keys.forEach((k) => { if (!(k in m.data)) bad.push(at + ' 자료 ' + k + ' 판정이 빠졌다'); });
      Object.entries(m.data).forEach(([k, v]) => {
        if (!keys.includes(k)) bad.push(at + ' 모르는 자료 ' + k);
        if (!Array.isArray(v) || ![1, 0.5, 's', 0].includes(v[0]) || !(v[1] === null || typeof v[1] === 'number')) bad.push(at + ' ' + k + ' 값 모양이 틀렸다');
      });
      if (m.verdict === '우리 고유') bad.push(at + ' 자료에 있는 순간을 «우리 고유»라 했다');
    } else if (!String(m.near || '').trim()) bad.push(at + ' 자료에 없는 순간인데 가장 가까운 자료(near)가 없다');
  });
  /* [EX_STD_1012] 2단계 — 예시마다 «왜» · 엔진의 예시와 한 줄씩 맞물린다 · 담는 순간은 모두 장부 줄로 이어진다 */
  const C = d.courses || {}, list = Array.isArray(C.list) ? C.list : [], names = new Set((d.moments || []).map((m) => m.name));
  if (list.map((c) => c.k).join(',') !== O.EXAMPLES.map((e) => e.k).join(',')) bad.push('예시 코스(courses.list)가 엔진의 예시와 다르다 — 엔진 ' + O.EXAMPLES.map((e) => e.k).join(',') + ' · 자료표 ' + list.map((c) => c.k).join(',') + ' [EX_STD_1012]');
  list.forEach((c) => { if (!String(c.why || '').trim()) bad.push('예시 «' + c.k + '»에 «왜»가 없다 [EX_STD_1012]'); });
  O.EXAMPLES.forEach((e) => e.on.forEach((k) => { if (!names.has((d.keyOf || {})[k])) bad.push('예시 «' + e.nm + '»의 순간 ' + k + ' 가 장부 줄로 이어지지 않는다(keyOf) [EX_STD_1012]'); }));
  (C.conflict || []).forEach((c) => { if (!String(c.decided || '').trim()) bad.push('예시 코스가 부딪힌 결정 «' + c.what + '»에 사장님 결정(decided)이 없다 [EX_STD_1012]'); });
  if (!String(C.spine || '').trim() || !String(C.out || '').trim()) bad.push('예시 코스의 뼈대(spine) · 넣지 않는 것(out)이 비었다 [EX_STD_1012]');
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
  L.push('| 순간 | 기본 | 선택 | 실제 예식 | 시간 | 우리 지금 | 우리 컨셉으로 거르기 | 결론 | 제안 | 상태 |');
  L.push('|---|---:|---:|---:|---:|---|---|---|---|---|');
  d.moments.filter((m) => m.data).forEach((m) => {
    const s = stat(d, m);
    const pct = Math.round((s.base / s.n) * 100);
    L.push('| ' + [m.name, fmt(s.base) + '/' + s.n + ' (' + pct + '%)', String(s.opt), fmt(s.rb) + '/' + s.real,
      s.med === null ? '—' : fmt(s.med) + '분(' + s.mn + '곳)', m.ours, m.concept, '**' + m.verdict + '**', m.proposal, m.state].join(' | ') + ' |');
  });
  L.push('');
  L.push('## 2. 자료에 없는 우리 순간(우리 고유) · 자료에서 다른 결로 나오는 것');
  L.push('');
  L.push('| 순간 | 가장 가까운 자료 | 우리 지금 | 우리 컨셉으로 거르기 | 결론 | 제안 | 상태 |');
  L.push('|---|---|---|---|---|---|---|');
  d.moments.filter((m) => !m.data).forEach((m) => {
    L.push('| ' + [m.name, m.near, m.ours, m.concept, '**' + m.verdict + '**', m.proposal, m.state].join(' | ') + ' |');
  });
  const cf = d.moments.filter((m) => m.conflict);
  if (cf.length) {
    L.push('');
    L.push('## 3. 예전 결정과 부딪히는 것 — 사장님께 하나씩 여쭌다');
    L.push('');
    cf.forEach((m) => L.push('- **' + m.name + '** · 제안 «' + m.proposal + '» ↔ ' + m.conflict + (m.decided ? ' → **' + m.decided + '**' : ' → 여쭐 것')));
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
  /* [STAGE1_CLOSE] 상태 한눈에 — 1단계가 닫혔나 */
  L.push('## 6. 상태 한눈에 ([STAGE1_CLOSE])');
  L.push('');
  STATE.forEach((st) => { const ns = d.moments.filter((m) => m.state === st).map((m) => m.name); if (ns.length) L.push('- **' + st + '** ' + ns.length + ' — ' + ns.join(' · ')); });
  L.push('');
  L.push('## 7. 바꾸는 줄이 읽은 예전 결정 ([PRIOR_SEEN])');
  L.push('');
  L.push('> 코드(고객 화면 · 엔진 · AI 상담)에서 그 순간의 말과 결정 낱말이 한 줄에 있는 표식은 전부 여기 적혀야 장부를 다시 만들 수 있다.');
  L.push('');
  d.moments.filter((m) => CHECKED.includes(m.verdict)).forEach((m) => {
    const ks = Object.keys(m.prior || {});
    L.push('- **' + m.name + '** (' + m.verdict + ' · 찾은 말 ' + (m.kw || []).join(' · ') + ')' + (ks.length ? '' : ' · 걸린 예전 결정 없음'));
    ks.forEach((k) => L.push('  - [' + k + '] ' + m.prior[k]));
  });
  L.push('');
  /* ★[EX_STD_1012] 2단계 — 예시 코스(엔진이 잰 값) */
  const C = d.courses || {}, why = {}, row = {};
  (C.list || []).forEach((c) => { why[c.k] = c.why; });
  d.moments.forEach((m) => { row[m.name] = m; });
  const pctOf = (k) => { const m = row[(d.keyOf || {})[k]]; if (!m) return '?'; if (!m.data) return '우리'; const s = stat(d, m); return Math.round((s.base / s.n) * 100) + '%'; };
  L.push('## 8. 예시 코스 — 2단계 ([EX_STD_1012])');
  L.push('');
  L.push('> 담는 순간 · 자료 포함률 · 시간 · 알림은 엔진(`assets/ritual-open.js` EXAMPLES)이 잰 값이다 — 예시를 바꾸면 이 장이 달라져 검사가 붉어진다. 시간은 6테이블(하객 30명) 기준.');
  L.push('');
  L.push('- **뼈대** ' + C.spine);
  L.push('- **넣지 않는 것** ' + C.out);
  L.push('');
  L.push('| 예시 | 담는 순간(자료 기본 포함률) | 본식 | 테이블 인사 | 단체 사진 | 알림 | 왜 |');
  L.push('|---|---|---|---|---|---:|---|');
  O.EXAMPLES.forEach((e) => {
    const T = O.applyExample({}, e.k), p = O.span(T);
    const on = O.ORDER.filter((k) => !O.ALWAYS[k] && T.on[k]).map((k) => O.CARDS[k].sn + ' ' + pctOf(k)).join(' · ');
    L.push('| ' + ['**' + e.nm + '** · ' + e.feel, on, p.body, p.table || '—', p.photo, String(O.noticeList(T).length), why[e.k] || '—'].join(' | ') + ' |');
  });
  if ((C.conflict || []).length) { L.push(''); L.push('예전 결정과 부딪힌 것'); L.push(''); C.conflict.forEach((c) => L.push('- **' + c.what + '** ↔ ' + c.was + ' → **' + c.decided + '**')); }
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
  // [PRIOR_SEEN] 깨 보기 — 첫 판의 실수(축가가 9/25 결정을 못 읽음)를 그대로 다시 만들어 본다
  const pick = (t) => t.moments.find((m) => m.name === '축가');
  const t5 = JSON.parse(JSON.stringify(d)); delete pick(t5).prior.SONG_RETIRED; delete pick(t5).prior.FREE_WHAT;   // 예전 결정을 안 읽었다
  const t6 = JSON.parse(JSON.stringify(d)); pick(t6).prior.NO_SUCH_MARK_1011 = '지어낸 표식';                       // 코드에 없는 표식
  const t7 = JSON.parse(JSON.stringify(d)); pick(t7).prior.TRIM_EVENTS = ' ';                                          // 읽은 뜻이 비었다
  const t8 = JSON.parse(JSON.stringify(d)); delete pick(t8).kw;                                                         // 찾을 말이 없다
  const t9 = JSON.parse(JSON.stringify(d)); delete t9.moments[0].state;                                                 // [STAGE1_CLOSE] 상태 없음
  const t10 = JSON.parse(JSON.stringify(d)); const cfm = t10.moments.find((m) => m.conflict); if (cfm) { delete cfm.decided; cfm.state = '그대로'; }   // 부딪힌 줄을 결정 없이 닫음
  const t11 = JSON.parse(JSON.stringify(d)); t11.courses.list.pop();                                                // [EX_STD_1012] 예시 하나의 «왜»가 빠짐(엔진과 어긋남)
  const t12 = JSON.parse(JSON.stringify(d)); delete t12.courses.conflict[0].decided;                                 // [EX_STD_1012] 부딪힌 결정에 사장님 결정이 없음
  /* [COUNT_STALE_1013] 자료가 하나 늘었는데 옛 총수(«n/옛 총수»)가 남은 자료표 · 코드 줄 — 빨강이어야 한다 · 자료 수가 그대로면 검사하지 않는다 */
  const N = Object.keys(d.sources).length, R = Object.keys(d.sources).filter((k) => d.sources[k].real).length;
  const t13 = JSON.parse(JSON.stringify(d)); t13.moments[0].concept += ' · 기본 3/' + (N - 1);
  const staleOk = staleCounts(t13, { n: N - 1, real: R }, []).length > 0 && staleCounts(d, { n: N, real: R }, [['x.js', 1, '자료 ' + (N - 1) + '곳 중 3곳']]).length === 0
    && staleCounts(d, { n: N - 1, real: R - 1 }, [['x.js', 1, '실제 예식 5/' + (R - 1)]]).length > 0;
  const fails = [t1, t2, t3, t4, t9, t10, t11, t12].map((t) => validate(t).length > 0).concat([t5, t6, t7, t8].map((t) => priorCheck(t, true).bad.length > 0));
  const md = render(d).replace(/\| \*\*유지\*\* \|/, '| **추가** |');            // 손으로 고친 장부
  const mdFail = md !== render(d);
  /* 지금 자료표는 «모양»만 본다(strict 아님) — 코드에 새 결정 표식이 생겼다고 다른 작업의 PR 이 깨 보기에서 막히면 안 된다.
     ★첫 판의 깨 보기가 여기서 strict 로 돌아, 같은 PR 에서 AI 지식 줄에 표식을 단 것만으로 빨강이 났다(2026-10-11). 엄격한 검사는 --write 몫이다. */
  const realOk = priorCheck(d, false).bad.length === 0;
  if (fails.every(Boolean) && mdFail && realOk && staleOk) { console.log('ok   [SOURCE_BASIS] 깨 보기 14종 모두 빨강 · 지금 자료표는 초록 [PRIOR_SEEN] [STAGE1_CLOSE] [EX_STD_1012] [COUNT_STALE_1013]'); process.exit(0); }
  console.log('FAIL [SOURCE_BASIS] 깨 보기 중 빨강이 안 난 것이 있다', fails, mdFail, realOk, staleOk); process.exit(1);
}

if (arg === '--closed') {   // [STAGE1_CLOSE] 1단계가 닫혔나
  const open = d.moments.filter((m) => m.state === '진행').map((m) => m.name);
  if (open.length) { console.log('FAIL [STAGE1_CLOSE] 1단계에 아직 «진행» 줄이 있다 — ' + open.join(' · ')); process.exit(1); }
  console.log('ok   [STAGE1_CLOSE] 1단계 닫힘 — 순간 ' + d.moments.length + '줄 모두 끝 · 2단계 · 3단계 · 다른 섹션 · 그대로'); process.exit(0);
}
if (arg === '--stage2') {   // [EX_STD_1012] 2단계(예시 코스)가 닫혔나
  const open = d.moments.filter((m) => m.state === '2단계').map((m) => m.name), vb = validate(d).filter((b) => /EX_STD_1012/.test(b));
  if (open.length || vb.length) { console.log('FAIL [EX_STD_1012] 2단계가 덜 닫혔다 — ' + open.concat(vb).join(' · ')); process.exit(1); }
  console.log('ok   [EX_STD_1012] 2단계 닫힘 — «2단계» 줄 없음 · 예시 ' + O.EXAMPLES.map((e) => e.nm).join(' · ') + ' 모두 «왜»가 있다'); process.exit(0);
}
const pc = priorCheck(d, arg === '--write');
const bad = validate(d).concat(pc.bad);
if (bad.length) { bad.forEach((b) => console.log('FAIL [SOURCE_BASIS] ' + b)); process.exit(1); }
pc.note.forEach((n) => console.log('참고 [SOURCE_BASIS] ' + n + ' — 다음에 자료표를 고칠 때 읽는다'));
const out = render(d);
if (arg === '--write') {
  const pv = prevTotals(), st = staleCounts(d, pv);   // [COUNT_STALE_1013]
  if (st.length) { st.forEach((x) => console.log('FAIL [COUNT_STALE_1013] 옛 총수가 남은 줄 — ' + x)); console.log('FAIL [COUNT_STALE_1013] 자료 ' + pv.n + '개(실제 예식 ' + pv.real + '곳) → ' + Object.keys(d.sources).length + '개로 바뀌었다 · 위 줄의 숫자를 고친 뒤 다시 --write'); process.exit(1); }
  fs.writeFileSync(MD, out); console.log('ok   [SOURCE_BASIS] 장부를 다시 만들었다 → ' + MD + ' · 바꾸는 줄의 예전 결정 다 읽음 [PRIOR_SEEN]'); process.exit(0); }
const cur = fs.existsSync(MD) ? fs.readFileSync(MD, 'utf8') : '';
if (cur !== out) { console.log('FAIL [SOURCE_BASIS] 장부가 자료표와 다르다 — node scripts/audit/source-basis.mjs --write 로 다시 만든다(손으로 고치지 않는다)'); process.exit(1); }
console.log('ok   [SOURCE_BASIS] 순간 ' + d.moments.length + '개 · 자료 ' + Object.keys(d.sources).length + '개 · 모든 줄에 근거 · 장부 = 자료표');
