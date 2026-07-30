// 시뮬레이터 자체를 감사한다 — ritual-order-sim.mjs의 '잘라내기 스캐너'가 맞게 자르는지.
//
//   $ node scripts/audit/ritual-order-sim-audit.mjs
//
// 왜 필요한가 (2026-07-27 CC 회신9 §7):
//   "네 시뮬레이터를 감사하지 않았다. 출력이 내 별도 하니스와 일치하는 것만 확인했다.
//    잘라내기 스캐너 자체의 정확성은 안 봤다."
//   두 하니스가 같은 답을 낸다는 것은 둘 다 맞다는 뜻도 되고 둘 다 같은 데서 틀렸다는 뜻도 된다.
//   그래서 출력이 아니라 스캐너를 본다.
//
// ★RITUAL_ORDER_SIM_AUDIT(2026-07-27): 네 갈래로 본다.
//   [1] 커버리지  — 잘라낸 조각이 원문 그대로인가 · 겹치지 않는가 · 빠뜨린 선언이 없는가
//   [2] 경계      — 다르게 작성한 두 번째 토크나이저가 같은 끝 지점을 짚는가
//   [3] 자유변수  — 엔진이 S 말고 바깥 전역을 몰래 빌려 쓰지 않는가 (vm 격리 + 카나리아)
//   [4] 변이 검출 — 엔진을 건드리면 반드시 티가 나는가 · 엔진 밖을 건드리면 반드시 조용한가
//   [4]가 핵심이다. [1~3]이 전부 통과해도 스캐너가 엉뚱한 문자열을 실행 중이면 출력은 그럴듯하게 나온다.
//   변이를 심어 "그 조각이 진짜로 돌고 있는 코드"임을 증명해야 닫힌다.
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { DECLS, loadEngine, enumerate, sliceDecl, grab, same } from './ritual-order-sim.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const TARGET = process.argv[2] ? path.resolve(process.argv[2]) : path.join(REPO, 'order-preview.html');

let fail = 0;
const bad = m => { fail++; console.log('  FAIL ' + m); };
const ok = m => console.log('  ok   ' + m);

const src = fs.readFileSync(TARGET, 'utf8');
console.log('='.repeat(88));
console.log('시뮬레이터 자체 감사 — ' + path.relative(REPO, TARGET));
console.log('='.repeat(88));

// ── [1] 커버리지 ────────────────────────────────────────────────────────────
// 잘라낸 조각이 (a) 원문에 문자 그대로 있고 (b) 서로 겹치지 않고 (c) 잘라낸 뒤 잔여 needle이 0인가.
console.log('\n[1] 커버리지 — 원문 그대로인가 · 겹치지 않는가 · 남는가');
const spans = [];
{
  for (const [needle, opt] of DECLS) {
    const n = src.split(needle).length - 1;
    if (n === 0) { if (!opt) bad(`필수 선언이 없다: ${needle}`); continue; }
    if (n > 1) { bad(`선언이 ${n}번 나온다(어느 쪽이 진짜인지 모른다): ${needle}`); continue; }
    const start = src.indexOf(needle);
    const text = sliceDecl(src, start);
    spans.push({ needle, start, end: start + text.length, text });
  }
  ok(`선언 ${spans.length}종을 유일하게 짚었다`);

  // (a) 손으로 옮겨 적지 않았다는 증명
  const verbatim = spans.every(s => src.slice(s.start, s.end) === s.text);
  verbatim ? ok('모든 조각이 원문의 연속 구간과 문자 단위로 동일하다(재작성 0)')
           : bad('조각이 원문과 다르다 — 어딘가에서 문자열을 가공하고 있다');

  // (b) 겹침
  const sorted = [...spans].sort((a, b) => a.start - b.start);
  const overlap = sorted.filter((s, i) => i > 0 && s.start < sorted[i - 1].end);
  overlap.length ? bad(`조각이 겹친다 ${overlap.length}건 (한 선언을 두 번 실행하게 된다): ${overlap[0].needle}`)
                 : ok('조각끼리 겹치지 않는다(같은 코드를 두 번 실행하지 않는다)');

  // (c) 잘라낸 뒤 잔여 needle
  let rest = src, cut = 0;
  for (const s of sorted.slice().reverse()) { rest = rest.slice(0, s.start) + rest.slice(s.end); cut += s.end - s.start; }
  const leftover = DECLS.filter(([needle]) => rest.indexOf(needle) >= 0).map(([n]) => n);
  leftover.length ? bad(`잘라낸 뒤에도 선언이 남아 있다(일부만 자른 것): ${leftover.join(' · ')}`)
                  : ok(`잘라낸 뒤 남은 선언 0 · 총 ${cut.toLocaleString()}자를 들어냈다`);

  // (d) 각 조각이 스스로 균형 잡힌 코드인가 — 마스킹 후 계수
  const unbal = spans.filter(s => {
    const m = mask(s.text);
    let d = 0; for (const c of m) { if (c === '{') d++; else if (c === '}') d--; if (d < 0) return true; }
    return d !== 0;
  });
  unbal.length ? bad(`괄호가 안 맞는 조각 ${unbal.length}건: ${unbal[0].needle}`)
               : ok('모든 조각이 괄호 균형을 만족한다');

  // (e) loadEngine이 실제로 쓰는 본문과 같은가
  const meta = loadEngine(TARGET);
  const mine = spans.map(s => s.text).join('\n');
  meta.parts.join('\n') === mine ? ok('loadEngine이 실행하는 본문 = 위에서 검증한 조각들(동일)')
                                 : bad('loadEngine이 실행하는 본문이 위 조각과 다르다');
}

// ── [2] 경계 교차검증 ───────────────────────────────────────────────────────
// sliceDecl은 한 번 훑으며 상태를 들고 가는 구현이다. 여기서는 반대로 간다 —
// 문자열·주석을 먼저 통째로 마스킹해 없애 버린 뒤, 남은 뼈대에서 괄호만 센다.
// 같은 답이 나와야 한다. 다르면 둘 중 하나가 문자열 안의 '}'에 걸린 것이다.
function mask(s, { regexAware = false } = {}) {
  const out = new Array(s.length);
  let i = 0, prev = '';
  while (i < s.length) {
    const c = s[i], n = s[i + 1];
    if (c === '/' && n === '/') { const e = s.indexOf('\n', i); const stop = e < 0 ? s.length : e; for (; i < stop; i++) out[i] = ' '; continue; }
    if (c === '/' && n === '*') { const e = s.indexOf('*/', i + 2); const stop = e < 0 ? s.length : e + 2; for (; i < stop; i++) out[i] = ' '; continue; }
    if (c === '"' || c === "'" || c === '`') {
      const q = c; out[i++] = ' ';
      while (i < s.length) { if (s[i] === '\\') { out[i] = ' '; out[i + 1] = ' '; i += 2; continue; } const done = s[i] === q; out[i++] = ' '; if (done) break; }
      prev = 'x'; continue;
    }
    if (regexAware && c === '/' && /[=(,:[!&|?{};+\-*%~^<>]|^$/.test(prev)) {
      out[i++] = ' ';
      while (i < s.length && s[i] !== '\n') {
        if (s[i] === '\\') { out[i] = ' '; out[i + 1] = ' '; i += 2; continue; }
        if (s[i] === '[') { while (i < s.length && s[i] !== ']' && s[i] !== '\n') out[i++] = ' '; }
        const done = s[i] === '/';
        out[i++] = ' ';
        if (done) break;
      }
      prev = 'x'; continue;
    }
    out[i] = c;
    if (!/\s/.test(c)) prev = c;
    i++;
  }
  return out.join('');
}
// 끝은 '닫는 중괄호 + (공백 건너 바로 붙은 세미콜론)'까지만 본다.
// sliceDecl은 그 뒤 공백도 먹지만 그건 의미 없는 꼬리라 비교 전에 양쪽 다 잘라낸다.
function endOfDecl2(masked, start) {
  let i = start, depth = 0, seen = false;
  while (i < masked.length) {
    const c = masked[i];
    if (c === '{') { depth++; seen = true; }
    else if (c === '}') {
      depth--;
      if (seen && depth === 0) {
        i++; let j = i;
        while (j < masked.length && /\s/.test(masked[j])) j++;
        return masked[j] === ';' ? j + 1 : i;
      }
    } else if (c === ';' && !seen && depth === 0) return i + 1;
    i++;
  }
  return -1;
}
console.log('\n[2] 경계 — 다르게 짠 두 번째 토크나이저가 같은 끝을 짚는가');
{
  // ★마스킹은 반드시 선언 시작점부터 건다. 파일 전체를 마스킹하면 안 된다 —
  //   이건 HTML 파일이라 앞쪽 본문의 아포스트로피 하나가 가짜 문자열을 열어 상태가 오염된다.
  //   sliceDecl도 선언 시작점부터만 훑으므로 같은 출발선에서 비교하는 게 맞다.
  const end2 = (s, opt) => { const e = endOfDecl2(mask(src.slice(s.start), opt), 0); return e < 0 ? -1 : s.start + e; };
  spans.forEach(s => { s.core = s.start + s.text.replace(/\s+$/, '').length; });   // 꼬리 공백 제거한 진짜 끝

  const diff = spans.filter(s => end2(s) !== s.core);
  diff.length
    ? bad(`끝 지점이 다른 선언 ${diff.length}건: ${diff.map(s => s.needle + "(" + s.core + "≠" + end2(s) + ")").join(' · ')}`)
    : ok(`${spans.length}종 전부 같은 끝 지점(마스킹-후-계수 방식과 일치)`);

  // 공통 맹점 점검: 두 구현 다 정규식 리터럴을 모른다. 실제로 문제가 되는지만 본다.
  const rdiff = spans.filter(s => end2(s, { regexAware: true }) !== s.core);
  rdiff.length
    ? bad(`정규식 리터럴을 인지시키면 경계가 달라지는 선언 ${rdiff.length}건: ${rdiff.map(s => s.needle).join(' · ')} — 순서 엔진 안에 괄호를 품은 정규식이 들어왔다`)
    : ok('정규식 리터럴 인지 여부와 무관하게 같은 경계(순서 엔진 선언 안에 위험한 정규식 없음)');

  // 문자열 인지가 실제로 일하고 있는지 — 인지 없이 세면 어디선가 무너져야 정상
  const naiveDiff = spans.filter(s => endOfDecl2(src, s.start) !== s.core);
  console.log(`  ―    참고: 문자열·주석을 무시하고 세면 ${naiveDiff.length}/${spans.length}종에서 경계가 어긋난다`
    + (naiveDiff.length ? ` (${naiveDiff[0].needle} 등) — 인지 로직이 실제로 일하는 중` : ' — 이 파일엔 함정 문자가 없어 우연히 같다'));
}

// ── [3] 자유변수 ────────────────────────────────────────────────────────────
// new Function은 Node 전역을 그대로 본다. 엔진이 S 말고 무언가를 조용히 빌려 쓰고 있으면
// 시뮬레이터는 '빌더 화면에서 돌 때와 다른 코드'를 돌리고 있는 셈이다.
// 텅 빈 vm 컨텍스트에서 같은 본문을 돌린다. 자유변수가 있으면 ReferenceError로 터진다.
// 게다가 vm에도 존재하는 이름(navigator·crypto·performance…)은 카나리아로 덮어 접근 자체를 잡는다.
console.log('\n[3] 자유변수 — 엔진이 S 말고 바깥을 빌려 쓰는가');
{
  const touched = new Set();
  const CANARY = ['process', 'console', 'Buffer', 'require', 'module', 'exports', '__dirname', '__filename',
    'navigator', 'performance', 'crypto', 'fetch', 'document', 'window', 'self', 'localStorage',
    'setTimeout', 'setInterval', 'queueMicrotask', 'structuredClone', 'global'];
  const sandbox = {};
  for (const nm of CANARY) {
    try { Object.defineProperty(sandbox, nm, { get() { touched.add(nm); throw new Error('엔진이 바깥 전역을 읽었다: ' + nm); }, configurable: true }); }
    catch { /* 못 덮으면 넘어간다 */ }
  }
  const ctx = vm.createContext(sandbox);
  const meta = loadEngine(TARGET);
  let vmEng = null, err = null;
  try {
    const mk = vm.runInContext('(function(S){' + meta.body + '})', ctx, { filename: 'ritual-engine.js' });
    const S = {};
    vmEng = { S, eng: mk(S) };
  } catch (e) { err = e; }

  if (err) bad('격리 컨텍스트에서 엔진 생성 실패: ' + err.message);
  else {
    ok('텅 빈 vm 컨텍스트에서 엔진이 생성된다(선언 단계 자유변수 0)');

    // 선언만이 아니라 1664조합을 전부 돌려 본다 — 실행 경로에서만 읽는 전역이 있을 수 있다.
    const base = enumerate(TARGET);
    let ref = 0, mismatch = 0;
    for (const [key, want] of base.rows) {
      const [course, plus, minus] = key.split('|');
      const on = plus.slice(1) === '-' ? [] : plus.slice(1).split(',');
      const off = minus.slice(1) === '-' ? [] : minus.slice(1).split(',');
      const S = vmEng.S;
      Object.assign(S, { course, ring: 'on', bless: course === 'family' ? 'on' : 'off', veil: 'mother', valley: 'none', ord: null, extra: {} });
      on.forEach(k => { S.extra[k] = true; if (k === 'bless') S.bless = 'on'; if (k === 'valley') S.valley = 'wine'; });
      off.forEach(k => { if (k === 'ring') S.ring = 'off'; else if (k === 'bless') S.bless = 'off'; else if (k === 'veil') S.veil = 'skip'; else S.valley = 'none'; });
      try {
        const got = vmEng.eng.curSeq().filter(k => k !== 'guest' && (!vmEng.eng.OFFTGL[k] || vmEng.eng.momOn(k)));
        if (!same([...want], [...got])) mismatch++;
      } catch (e) { ref++; if (ref === 1) bad('실행 중 바깥 전역 접근: ' + e.message + ' (조합 ' + key + ')'); }
    }
    if (!ref) ok(`1664조합 전 구간 실행에서도 자유변수 0 (카나리아 ${CANARY.length}종 무발화)`);
    mismatch ? bad(`격리 실행과 일반 실행의 결과가 다른 조합 ${mismatch}개 — 실행 환경에 의존하고 있다`)
             : ok('격리 실행 결과 = 일반 실행 결과(1664/1664 동일)');
    if (touched.size) bad('읽은 바깥 전역: ' + [...touched].join(' · '));
  }
}

// ── [4] 변이 검출 ───────────────────────────────────────────────────────────
// 여기까지는 전부 '스캐너가 자기 규칙대로 잘 잘랐다'는 확인이다.
// 정작 확인해야 할 것은 "잘라낸 그 조각이 진짜로 돌고 있는 코드인가"다.
// 엔진 안을 건드리면 반드시 출력이 흔들려야 하고(양성), 엔진 밖을 건드리면 반드시 조용해야 한다(음성).
console.log('\n[4] 변이 검출 — 엔진을 건드리면 티가 나는가 · 밖을 건드리면 조용한가');
{
  const TMP = fs.mkdtempSync('/tmp/ordsim-audit-');
  const baseRows = enumerate(TARGET).rows;
  const run = (label, mutated, expect) => {   // expect: true=바뀌어야 / false=조용해야
    if (mutated == null) { console.log(`  skip ${label} — 변이 지점을 못 찾았다`); return; }
    const f = path.join(TMP, label.replace(/[^\w]/g, '_') + '.html');
    fs.writeFileSync(f, mutated);
    let rows;
    try { rows = enumerate(f).rows; } catch (e) { bad(`${label} — 변이본에서 스캐너가 죽었다: ${e.message}`); return; }
    let d = 0;
    for (const [k, a] of baseRows) if (!same([...a], [...(rows.get(k) || [])])) d++;
    if (expect) {
      d > 0 ? ok(`${label} → ${d}조합이 달라진다(그 조각이 진짜로 돌고 있다)`)
            : bad(`${label} → 0조합. 잘라낸 조각이 실행되지 않고 있거나 다른 코드를 실행 중이다`);
    } else {
      d === 0 ? ok(`${label} → 0조합(예상대로 조용하다)`)
              : bad(`${label} → ${d}조합. 그럴 리 없는 변경에 반응한다 — 자르는 범위가 넘친다`);
    }
  };
  const patch = (span, from, to) => {
    if (!span || (span.text.split(from).length - 1) !== 1) return null;
    return src.slice(0, span.start) + span.text.replace(from, to) + src.slice(span.end);
  };
  const rankSpan = spans.find(s => s.needle === 'var RANK={');
  const setRank = (key, val) => {
    if (!rankSpan) return null;
    const m = rankSpan.text.match(new RegExp('\\b' + key + '\\s*:\\s*(-?\\d+)'));
    return m ? patch(rankSpan, m[0], key + ':' + val) : null;
  };

  // 양성 — 데이터 조각(RANK)이 진짜로 실행되는가. 반드시 다른 순간의 rank를 '넘어가게' 옮긴다.
  run('RANK toast → 1 (축배를 맨 앞으로)', setRank('toast', 1), true);
  run('RANK letter → 999 (편지를 맨 뒤로)', setRank('letter', 999), true);
  // 양성 — 함수 조각도 실행되는가
  run('ordNow 기본 순서 뒤집기', patch(spans.find(s => s.needle === 'function ordNow('), 'return def;', 'return def.slice().reverse();'), true);
  // 음성 — 순위표는 서수다. 아무도 넘지 않는 값 변경은 조용해야 맞다(반응하면 그게 이상한 것).
  const rk = rankSpan && JSON.parse('{' + rankSpan.text.replace(/^var RANK=\{/, '').replace(/\};?\s*$/, '').replace(/(\w+):/g, '"$1":') + '}');
  if (rk) {
    const sortedV = [...new Set(Object.values(rk))].sort((a, b) => a - b);
    const gap = sortedV.findIndex((v, i) => i > 0 && v - sortedV[i - 1] > 1);
    const key = gap > 0 && Object.keys(rk).find(k => rk[k] === sortedV[gap]);
    if (key) run(`RANK ${key} ${rk[key]}→${rk[key] - 1} (아무도 안 넘는 값)`, setRank(key, rk[key] - 1), false);
  }
  // 음성 — 추출 범위 밖(화면 문구)
  const outside = src.match(/<title>[^<]*<\/title>/);
  run('엔진 밖 <title> 변경', outside ? src.replace(outside[0], '<title>AUDIT-CANARY</title>') : null, false);
  fs.rmSync(TMP, { recursive: true, force: true });
}

// ── [5] inSeq 축2 누수 ──────────────────────────────────────────────────────
// inSeq(k) = curSeq().indexOf(k)>-1 — 축1만 본다. 축2(OFFTGL)로 꺼진 순간도 '있다'고 답한다.
// 이건 이 저장소에서 두 번 사람을 속인 바로 그 함정이다(1차 시뮬레이션 오판 · _blessOpens 한 줄).
// OFFTGL 키를 inSeq로 묻는 자리는 반드시 같은 줄에서 그 키의 값도 함께 봐야 한다.
console.log('\n[5] inSeq 축2 누수 — 꺼진 순간을 켜졌다고 세는 자리가 있는가');
{
  const off = spans.find(s => s.needle === 'var OFFTGL={');
  const keys = off ? [...off.text.matchAll(/(\w+)\s*:/g)].map(m => m[1]).filter(k => k !== 'OFFTGL') : [];
  const lines = src.split('\n');
  let checked = 0;
  lines.forEach((ln, i) => {
    if (ln.trim().startsWith('function inSeq')) return;
    for (const k of keys) {
      if (ln.indexOf(`inSeq('${k}')`) < 0) continue;
      checked++;
      // 같은 줄(또는 바로 뒤 블록)에서 S.<k> 값을 함께 보고 있으면 축2가 닫힌 것으로 본다.
      const scope = ln + (lines[i + 1] || '');
      if (scope.indexOf('S.' + k) < 0) bad(`${i + 1}행 inSeq('${k}')에 S.${k} 값 확인이 없다 — 꺼진 ${k}를 켜진 것으로 센다: ${ln.trim().slice(0, 90)}`);
    }
  });
  if (!keys.length) bad('OFFTGL 키를 못 읽었다');
  else ok(`축2 토글 ${keys.length}종(${keys.join('·')})을 묻는 inSeq 호출 ${checked}곳 전부 같은 자리에서 값도 확인한다`);
}

console.log('\n' + '='.repeat(88));
console.log(fail ? `감사 실패 ${fail}건 — 시뮬레이터 출력을 근거로 쓰지 말 것` : '감사 통과 · 시뮬레이터가 order-preview.html의 순서 엔진을 원문 그대로 실행하고 있다');
console.log('='.repeat(88));
process.exit(fail ? 1 : 0);
