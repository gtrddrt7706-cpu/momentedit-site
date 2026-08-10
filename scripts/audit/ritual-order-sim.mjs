// 식순 순서 엔진 전수 시뮬레이터 — order-preview.html의 '순서 엔진'을 원문 그대로 떼어 내 1664조합을 돌린다.
//
//   $ node scripts/audit/ritual-order-sim.mjs                      # HEAD의 order-preview.html 자기검사
//   $ node scripts/audit/ritual-order-sim.mjs a.html b.html        # 두 변형 비교(RANK 조정안 검증 등)
//
// 왜 필요한가 (2026-07-27 코워크):
//   defaultOrd()의 rank 삽입은 손으로 따라가면 틀린다. 실제로 이 저장소에서 두 번 틀렸다.
//   ① 손계산으로 "담백 기본 상태가 바뀐다"는 거짓 결론 — 축2(momOn)를 빼먹어서.
//   ② RANK 이완 하향안의 영향 범위를 손 검산으로 추정 — 전수로 재니 4배 넓었다.
//   그래서 순서 엔진 선언을 '손으로 옮겨 적지 않고' 원문을 잘라 실행한다.
//
// ★식순은 2축 구조다. 하나만 보면 반드시 틀린다.
//   축1  COURSES[c].seq + opt(제자리 삽입) + S.extra(팔레트)   → curSeq()
//   축2  OFFTGL={ring,bless,valley} + momOn()                  → BLOCK[k]()가 null 반환
//   실제 진행 순서 = fullBlocks() = 축1을 돌면서 축2로 걸러낸 결과
//   curSeq()는 순서 축만 필터하므로 '꺼진 순간'이 배열에 그대로 남아 있다.
//   담백의 valley·bless는 seq 붙박이(isOptK=false)라 curSeq에서 절대 안 걸러지고 축2에서만 걸러진다.
//
// ★RITUAL_ORDER_SIM(2026-07-27): 순서 엔진의 심볼 이름이 바뀌면 이 스크립트는 조용히 통과하지 않고 예외로 죽는다.
//   grab()이 '없음'·'두 번 나옴'을 둘 다 에러로 본다. 엔진을 리팩터링하면 여기 목록도 같은 커밋에서 갱신할 것.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const DEFAULT_TARGET = path.join(REPO, 'order-preview.html');

// ── 1. 원문 추출 ────────────────────────────────────────────────────────────
// 문자열·라인주석·블록주석을 인지하는 중괄호 균형 스캐너.
// 정규식으로 자르면 문자열 안의 '}' 하나에 무너진다.
/* ★[PAREN_DEPTH 2026-08-10 점검] 괄호도 함께 센다 — **중괄호만 세면 한 꼴에서만 맞다.**
   실측: `var OFFTGL=new Proxy({},{ get:… });` 에서 첫 `{}` 가 닫히자마자 깊이가 0이 되어
   `var OFFTGL=new Proxy({}` 까지만 잘렸고, 샌드박스가 「missing ) after argument list」로 죽었다.
   needle 을 이름만 잡게 고친 뒤에야 이 두 번째 층이 드러났다 — 한 겹 벗기면 다음 겹이 나온다.
   ★끝나는 조건은 「중괄호 0 **그리고** 괄호 0」이다. 기존 꼴도 그대로 통한다:
     var X={…};  → 마지막 } 에서 둘 다 0 · function f(a){…} → ( ) 가 { 앞에서 이미 닫힌다. */
export function sliceDecl(src, startIdx) {
  let i = startIdx, depth = 0, seen = false, pdepth = 0;
  let inS = null, inLine = false, inBlock = false;
  while (i < src.length) {
    const c = src[i], n = src[i + 1];
    if (inLine) { if (c === '\n') inLine = false; i++; continue; }
    if (inBlock) { if (c === '*' && n === '/') { inBlock = false; i += 2; continue; } i++; continue; }
    if (inS) {
      if (c === '\\') { i += 2; continue; }
      if (c === inS) inS = null;
      i++; continue;
    }
    if (c === '/' && n === '/') { inLine = true; i += 2; continue; }
    if (c === '/' && n === '*') { inBlock = true; i += 2; continue; }
    if (c === '"' || c === "'" || c === '`') { inS = c; i++; continue; }
    if (c === '(') { pdepth++; i++; continue; }
    if (c === ')') { pdepth--; i++; continue; }
    if (c === '{') { depth++; seen = true; i++; continue; }
    if (c === '}') {
      depth--; i++;
      if (seen && depth === 0 && pdepth === 0) {
        // 선언 끝 — 뒤따르는 세미콜론까지 먹는다
        while (i < src.length && /[\s;]/.test(src[i])) { if (src[i] === ';') { i++; break; } i++; }
        return src.slice(startIdx, i);
      }
      continue;
    }
    /* `!seen` 을 뺐다 — Proxy 처럼 중괄호를 지나고도 괄호 안에 있다가 `;` 로 끝나는 꼴이 있다.
       대신 **둘 다 0** 일 때만 끝낸다. */
    if (c === ';' && depth === 0 && pdepth === 0) return src.slice(startIdx, i + 1);
    i++;
  }
  throw new Error('unbalanced from ' + startIdx);
}

export function grab(src, needle, optional = false) {
  const idx = src.indexOf(needle);
  if (idx < 0) { if (optional) return ''; throw new Error('순서 엔진 선언을 못 찾았다: ' + needle); }
  if (src.indexOf(needle, idx + 1) >= 0) throw new Error('선언이 두 번 나온다(어느 쪽이 진짜인지 알 수 없다): ' + needle);
  return sliceDecl(src, idx);
}

export const DECLS = [
  ['var COURSES={', false], ['var GADD={', false], ['var RANK={', false],
  ['var RANK_OV={', true], ['function rankOf(', true],
  ['function isGAdd(', false], ['function isOptK(', false],
  ['function defaultOrd(', false], ['function ordNow(', false], ['function curSeq(', false],
  /* ★[DECL_SHAPE 2026-08-10 점검] `var OFFTGL={` 로 **선언 꼴을 박아 뒀던 것**을 푼다.
     2026-08-03 리팩터(c792fb8 ORD_ROWCTL)에서 객체 리터럴 → `new Proxy({},{…})` 로 바뀌었다.
     심볼도 뜻도 그대로인데 needle 이 리터럴 중괄호를 요구해 못 찾았고,
     그 뒤 **7일간 ritual-order-sim 과 ritual-guard-scan 이 둘 다 죽어 있었다**
     (guard-scan 이 이 grab 을 쓴다 — 하나가 막히면 둘이 멎는다). 아무도 못 본 이유는 게이트가 없어서다.
     ★grab 은 needle 뒤를 `;` 까지 균형 있게 잘라내므로 `=` 까지만 잡으면 어느 꼴이든 통한다.
       선언의 **모양**이 아니라 **이름**을 잡는다 — 모양은 리팩터마다 바뀐다. */
  /* ★같은 리팩터가 데려온 의존 셋 — OFFTGL 의 Proxy 가 offable() 을, 그것이 NEVEROFF 를 부른다.
     OFFKEY 는 옛 3키(ring·bless·valley)를 남겨 둔 표라 함께 실어야 엔진이 선다.
     ★한 겹을 벗기면 다음 겹이 나왔다: needle 꼴 → 괄호 깊이 → 빠진 심볼 셋. 세 번 다 재서 찾았다. */
  ['var OFFKEY={', false], ['var NEVEROFF={', false], ['function offable(', false],
  ['var OFFTGL=', false], ['function momOn(', false],
];

export function loadEngine(file) {
  const src = fs.readFileSync(file, 'utf8');
  const found = [];
  const parts = DECLS.map(([needle, opt]) => {
    const s = grab(src, needle, opt);
    if (s) found.push(needle.replace(/^(var|function) /, '').replace(/[={(].*$/, ''));
    return s;
  }).filter(Boolean);

  const body = parts.join('\n') + `
    return { COURSES, GADD, RANK, defaultOrd, ordNow, curSeq, isGAdd, isOptK, OFFTGL, momOn,
             RANK_OV: (typeof RANK_OV!=='undefined'?RANK_OV:null) };
  `;
  // S는 바깥에서 주입 — 빌더 원본과 같은 전역 참조 구조를 만든다
  const factory = new Function('S', body);
  // body·parts를 함께 돌려준다 — ritual-order-sim-audit.mjs가 이 원문을 다시 검증한다.
  return { factory, found, parts, body, sourceChars: body.length };
}

// ── 2. 조합 열거 ────────────────────────────────────────────────────────────
export const COURSE_KEYS = ['damback', 'gamdong', 'family', 'minimal', 'festive'];
export const NM = { damback: '담백', gamdong: '감동', family: '가족', minimal: '미니멀', festive: '축하' };
export const LB = {
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  guest: '식전', entry: '입장', welcome: '첫인사', bless: '덕담', vow: '서약',
  ringwarm: '링워밍', ring: '반지', declare: '★선언', letter: '◆편지', tribute: '헌정',
  valley: '밸리', song: '축가', toast: '축배',
};
export const show = a => (a && a.length ? a.map(k => LB[k] || k).join(' ') : '(없음)');
export const same = (x, y) => (x ? x.join('>') : '∅') === (y ? y.join('>') : '∅');

// applyCourse() 실측 (order-preview.html:1471~1473) — 코스 기본값의 단일 출처
// ★toast는 2026-07-28에 더했다. 구판은 S.toast를 아예 안 넣어서 전 조합이 undefined였고,
//   그래서 _cakeDup()의 두 조건이 각각 독립적으로 0이 됐다.
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
const courseDefaults = c => ({ ring: 'on', bless: c === 'family' ? 'on' : 'off', valley: 'none', toast: 'toast' });
// extraTgl() 실측(1119행) — 팔레트를 켜면 축2 토글도 함께 켜진다
const applyExtraTgl = (S, k) => { if (k === 'bless') S.bless = 'on'; if (k === 'valley') S.valley = 'wine'; };

// ★★축2는 '끄기 축'이 아니라 '상태 축'이다 (2026-07-28에 고침).
//   구판(2026-07-27)은 축2를 끄는 방향으로만 훑었다. 기본값이 valley:'none'이고 off 분기도 'none'이라
//   켜는 경로가 팔레트뿐이었고 거기선 항상 'wine'이었다 → 1664조합 중 S.valley==='cake'가 0개,
//   담백처럼 valley가 seq 붙박이인 코스는 '밸리를 켠 조합'이 아예 0개였다.
//   실증: order-preview.html이 주석으로 명시 금지한 담백 seq 역전(밸리를 편지 뒤로)을 넣었더니
//         구판 시뮬레이터·감사·chk 마커가 전부 초록이었다. 상태 축으로 바꾸면 잡힌다.
//   값 목록은 전부 실측이다 — momOn()(1087) · 검증 분기(1724) · quickOff()(1096~1097) · pick 카드(1350~1352·1380).
//   order:false = 순서 엔진이 안 읽는 키. toast는 OFFTGL에 없어 필터를 안 타고 _cakeDup()만 읽는다.
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
export const STATES = {
  ring:   { order: true,  off: 'off',  v: ['on', 'off'] },
  bless:  { order: true,  off: 'off',  v: ['on', 'off'] },
  valley: { order: true,  off: 'none', v: ['none', 'wine', 'cake'] },
  toast:  { order: false, off: null,   v: ['toast', 'cake', 'both'] },
};
export const STATE_KEYS = Object.keys(STATES);

function subsets(arr) {
  const out = [];
  for (let m = 0; m < (1 << arr.length); m++) {
    const s = []; arr.forEach((k, i) => { if (m & (1 << i)) s.push(k); });
    out.push(s);
  }
  return out;
}
function product(keys) {
  let out = [{}];
  for (const k of keys) {
    const next = [];
    for (const base of out) for (const v of STATES[k].v) next.push({ ...base, [k]: v });
    out = next;
  }
  return out;
}
const stTag = st => { const ks = Object.keys(st).sort(); return ks.length ? ks.map(k => k + '=' + st[k]).join(',') : '-'; };

// enumerate(file)                  → 상태 축 전수(기본)
// enumerate(file,{legacy:true})    → 2026-07-27판 1664조합 재현. 확장이 '덮어쓰기가 아니라 추가'임을 대조하는 데만 쓴다.
export function enumerate(file, { legacy = false } = {}) {
  const S = {};
  const meta = loadEngine(file);
  const eng = meta.factory(S);
  const rows = new Map(), states = new Map(), base = new Map();
  for (const course of COURSE_KEYS) {
    S.course = course; S.extra = {}; S.ord = null;
    const seq = eng.COURSES[course].seq;
    const axis1 = [...new Set([
      ...(eng.COURSES[course].opt || []).map(o => o.k),
      ...Object.keys(eng.GADD).filter(k => eng.isGAdd(k)),
    ])].sort();
    const axis2 = Object.keys(eng.OFFTGL).filter(k => seq.indexOf(k) > -1).sort();
    const setup = (on) => {
      Object.assign(S, courseDefaults(course));
      S.course = course; S.ord = null; S.extra = {};
      on.forEach(k => { S.extra[k] = true; applyExtraTgl(S, k); });
    };
    for (const on of subsets(axis1)) {
      // 축1은 상태와 무관하게 정해진다 — curSeq()는 S.extra만 읽고 S.ring/valley/…는 안 읽는다.
      setup(on);
      const cur0 = eng.curSeq();
      // ★없는 순간의 상태는 안 훑는다 — 어차피 결과가 같은 행이 복제될 뿐이고, 그 복제가 지표를 부풀린다.
      const vary = STATE_KEYS.filter(k => cur0.indexOf(k) > -1);
      const plans = legacy ? subsets(axis2) : product(vary);
      for (const plan of plans) {
        setup(on);
        if (legacy) plan.forEach(k => { S[k] = STATES[k].off; });
        else Object.assign(S, plan);              // ★팔레트 기본값보다 상태 축이 우선(quickOff·pick 실측)
        const cur = eng.curSeq();
        // 구판 키는 course|+on|-off · 확장 키는 course|+on|~k=v,… — 어느 쪽이든 split('|')[0]이 코스다.
        const key = course + '|+' + (on.join(',') || '-')
                  + (legacy ? '|-' + (plan.join(',') || '-') : '|~' + stTag(plan));
        const st = {}; vary.forEach(k => { st[k] = S[k]; });     // 구판도 '실제로 만든 상태값'을 남긴다
        // ★fullBlocks() 등가 — 축1(curSeq)을 돌면서 축2(momOn)로 거른다.
        //   guest는 식전 안내 트랙이라 BLOCK.guest가 무조건 null이다(본식 대본 미포함).
        rows.set(key, cur.filter(k => k !== 'guest' && (!eng.OFFTGL[k] || eng.momOn(k))));
        states.set(key, { course, on: on.slice(), st, cur });
        if (!on.length && STATE_KEYS.every(k => !(k in st) || st[k] === courseDefaults(course)[k])) base.set(course, key);
      }
    }
  }
  return { eng, rows, states, base, meta };
}

// ★확장이 구판을 덮어쓰지 않았음을 실측으로 보인다.
//   구판 1664행 각각에 대해, 같은 상태값을 갖는 확장판 행을 찾아 순서가 같은지 본다.
//   같으면 "구판 지표는 확장판 안에 그대로 살아 있고, 확장은 추가일 뿐"이 성립한다.
export function embedCheck(file) {
  const L = enumerate(file, { legacy: true });
  const X = enumerate(file);
  let missing = 0, differ = 0, sample = null;
  const covered = new Set();
  for (const [lk, lm] of L.states) {
    const xk = lm.course + '|+' + (lm.on.join(',') || '-') + '|~' + stTag(lm.st);
    if (!X.rows.has(xk)) { missing++; if (!sample) sample = lk + ' → ' + xk; continue; }
    covered.add(xk);
    if (!same([...L.rows.get(lk)], [...X.rows.get(xk)])) { differ++; if (!sample) sample = lk; }
  }
  return { legacyTotal: L.rows.size, expandedTotal: X.rows.size, missing, differ, covered: covered.size, sample, L, X };
}

// ── 3. 지표 ────────────────────────────────────────────────────────────────
// §4-4 "이완(밸리·축가)은 정점(편지)보다 앞" — 축하 코스의 축가는 의도된 예외(정점→이완→여운→밝은 착지)
const RELAX = ['valley', 'song'];
export function violations(rows, { festiveSongException = true } = {}) {
  let n = 0; const by = {};
  for (const [k, s] of rows) {
    const li = s.indexOf('letter'); if (li < 0) continue;
    for (const rel of RELAX) {
      const ri = s.indexOf(rel); if (ri <= li) continue;
      if (festiveSongException && k.startsWith('festive|') && rel === 'song') continue;
      n++; const t = k.split('|')[0] + '·' + LB[rel]; by[t] = (by[t] || 0) + 1;
    }
  }
  return { n, by };
}
// ★2026-07-28: 이름이 틀려서 고쳤다. 구 cakeAdjacent()는 S.valley도 S.toast도 안 보고
//   '밸리와 축배가 순서상 붙는 형태'만 셌다. 케이크 실물과는 무관한 순서 지표다.
//   구판이 센 160·16조합은 전부 S.valley==='wine'이었고, _cakeDup()이 실제로 발화하는 조합은 0개였다.
//   회신9 §2·회신11 §2·회신12에 인용된 "케이크 인접"은 전부 이 지표를 가리킨다(= 밸리·축배 인접).
export function valleyToastAdjacent(rows) {         // 순서 지표
  const hit = [];
  for (const [k, s] of rows) {
    const a = s.indexOf('valley'), b = s.indexOf('toast');
    if (a > -1 && b > -1 && Math.abs(a - b) === 1) hit.push(k);
  }
  return hit;
}
// 내용 지표 — _cakeDup()(order-preview.html:1570) 등가.
// inSeq()는 curSeq()를 보므로(축1만) 걸러진 결과 배열이 아니라 states.cur를 봐야 한다.
export function cakeDup(states) {
  const hit = [];
  for (const [k, m] of states) {
    if (m.cur.indexOf('valley') > -1 && m.st.valley === 'cake'
     && m.cur.indexOf('toast') > -1 && (m.st.toast === 'cake' || m.st.toast === 'both')) hit.push(k);
  }
  return hit;
}
// 밸리·축배가 붙으면서 실물까지 겹치는 조합 — 경고를 만들지 않기로 한 판단(회신10 §2)의 대상 집합
export function adjacentAndDup(rows, states) {
  const dup = new Set(cakeDup(states));
  return valleyToastAdjacent(rows).filter(k => dup.has(k));
}
function countBy(keys) {
  const by = {}; keys.forEach(k => { const c = k.split('|')[0]; by[NM[c] || c] = (by[NM[c] || c] || 0) + 1; });
  return by;
}

// ── 4. 자기검사 모드 ────────────────────────────────────────────────────────
function selfCheck(file, opt = {}) {
  const { eng, rows, states, base, meta } = enumerate(file, opt);
  let fail = 0;
  const bad = (m) => { fail++; console.log('  FAIL ' + m); };
  const ok = (m) => console.log('  ok   ' + m);

  console.log('='.repeat(88));
  console.log('식순 순서 엔진 자기검사 — ' + path.relative(REPO, file));
  console.log('='.repeat(88));
  console.log('  추출 선언 ' + meta.found.length + '종: ' + meta.found.join(' · '));
  console.log('  본문 ' + meta.sourceChars.toLocaleString() + '자 · 조합 ' + rows.size + '개\n');

  console.log('[1] 구조 무결성');
  {
    const dup = [...rows].filter(([, s]) => new Set(s).size !== s.length);
    dup.length ? bad(`같은 순간이 두 번 들어간 조합 ${dup.length}개 (예: ${dup[0][0]})`) : ok('한 조합에 같은 순간이 두 번 들어가지 않는다');

    const empty = [...rows].filter(([, s]) => !s.length);
    empty.length ? bad(`순간이 하나도 없는 조합 ${empty.length}개`) : ok('빈 순서가 나오는 조합이 없다');

    // 축2가 실제로 작동하는가 — 꺼진 순간이 결과에 남아 있으면 fullBlocks()와 어긋난다
    // ★키 문자열을 파싱하지 않고 states에 남긴 실제 상태값을 본다(키 형식이 바뀌어도 안 깨진다).
    const leak = [...rows].filter(([k, s]) => {
      const st = states.get(k).st;
      return STATE_KEYS.some(x => STATES[x].order && st[x] === STATES[x].off && s.indexOf(x) > -1);
    });
    leak.length ? bad(`끈 순간이 결과에 남은 조합 ${leak.length}개 — 축2 필터가 안 먹는다`) : ok('축2(OFFTGL·momOn)로 끈 순간은 결과에서 사라진다');

    // RANK가 모든 순간 키를 덮는가 — 안 덮이면 defaultOrd의 기본값 분기로 새는 순간이 있다
    const seen = new Set(); for (const [, s] of rows) s.forEach(k => seen.add(k));
    const uncovered = [...seen].filter(k => !(k in eng.RANK));
    uncovered.length
      ? bad(`RANK에 없는 순간 키 ${uncovered.length}개: ${uncovered.join(', ')} — 팔레트 삽입 위치가 기본값으로 뭉개진다`)
      : ok(`RANK가 등장 순간 ${seen.size}종을 전부 덮는다`);
  }

  console.log('\n[2] 5코스 기본 상태 (부부가 코스만 고르고 아무것도 안 건드린 화면)');
  for (const c of COURSE_KEYS) console.log(`  ${NM[c].padEnd(4)} ${show(rows.get(base.get(c)))}`);

  console.log('\n[3] RANK 표');
  console.log('  ' + Object.entries(eng.RANK).map(([k, v]) => `${LB[k] || k}:${v}`).join(' '));
  console.log('  RANK_OV ' + (eng.RANK_OV ? JSON.stringify(eng.RANK_OV) : '(없음)'));

  console.log('\n[4] §4-4 이완(밸리·축가)이 정점(◆편지)보다 뒤로 간 쌍');
  {
    const v = violations(rows);
    const all = violations(rows, { festiveSongException: false });
    console.log(`  축하·축가 예외 적용 ${v.n}쌍 ${JSON.stringify(v.by)}`);
    console.log(`  예외 없이 전부 세면 ${all.n}쌍`);
    console.log('  (경고성 지표다 — 0이 아니라고 실패로 보지 않는다. 안끼리 비교할 때 쓴다.)');
  }

  console.log('\n[5] 밸리·축배 인접 (순서 지표) — 두 동작 세리머니가 바로 붙는 조합');
  {
    const hit = valleyToastAdjacent(rows);
    console.log(`  ${hit.length}조합 ${JSON.stringify(countBy(hit))}`);
    if (hit.length) console.log(`  예) ${hit[0]}  →  ${show(rows.get(hit[0]))}`);
    const kind = {}; hit.forEach(k => { const v = states.get(k).st.valley; kind[v] = (kind[v] || 0) + 1; });
    console.log(`  밸리 종류별 ${JSON.stringify(kind)}`);
    console.log('  (순서만 본다. 케이크 실물 중복은 아래 [5b]다 — 이 둘을 한 지표로 부르던 게 구판의 오류였다.)');
  }

  console.log('\n[5b] 케이크 중복 (내용 지표) — _cakeDup() 경고가 실제로 뜨는 조합');
  {
    const hit = cakeDup(states);
    console.log(`  ${hit.length}조합 ${JSON.stringify(countBy(hit))}`);
    if (hit.length) console.log(`  예) ${hit[0]}  →  ${show(rows.get(hit[0]))}`);
    const both = adjacentAndDup(rows, states);
    console.log(`  그중 순서까지 붙는 조합 ${both.length}개`);
    console.log('  (경고만 하고 막지는 않는다. 와인+축배는 실물이 안 겹쳐 경고를 만들지 않기로 했다 — 회신10 §2.)');
  }

  console.log('\n[6] 덕담이 서약보다 앞에 오는 조합 — 4안 공통 잔여 문제(별건)');
  {
    const hit = [...rows].filter(([, s]) => {
      const b = s.indexOf('bless'), v = s.indexOf('vow');
      return b > -1 && v > -1 && b < v;
    }).map(([k]) => k);
    console.log(`  ${hit.length}조합 ${JSON.stringify(countBy(hit))}`);
    if (hit.length) console.log(`  예) ${show(rows.get(hit[0]))}`);
  }

  console.log('\n[7] 정점(◆편지)이 마지막 3순간 안에 들어오는 비율');
  {
    let tot = 0, late = 0;
    for (const [, s] of rows) { const li = s.indexOf('letter'); if (li < 0) continue; tot++; if (li >= s.length - 3) late++; }
    console.log(`  편지 등장 ${tot}조합 중 ${late}조합 (${(late / tot * 100).toFixed(1)}%)`);
  }

  console.log('\n[8] 구판(2026-07-27 · 1664조합) 포함 관계 — 확장이 덮어쓰기가 아니라 추가인가');
  {
    const e = embedCheck(file);
    console.log(`  구판 ${e.legacyTotal}조합 → 확장 ${e.expandedTotal}조합 (${(e.expandedTotal / e.legacyTotal).toFixed(2)}배)`);
    if (e.missing) bad(`구판 행 중 확장판에 대응이 없는 것 ${e.missing}개 (예: ${e.sample})`);
    else if (e.differ) bad(`대응은 되지만 순서가 다른 행 ${e.differ}개 (예: ${e.sample})`);
    else ok(`구판 ${e.legacyTotal}행이 전부 확장판 안에 순서 그대로 들어 있다(서로 다른 ${e.covered}행에 대응)`);
    console.log('  → 구판 지표(1112·896·160·77.8% …)는 폐기가 아니라 부분집합 위의 수다. 확장은 그 위에 내용 축을 얹었다.');
  }

  console.log('\n' + '='.repeat(88));
  console.log(fail ? `구조 검사 실패 ${fail}건` : '구조 검사 통과');
  console.log('='.repeat(88));
  return fail;
}

// ── 5. 비교 모드 ────────────────────────────────────────────────────────────
function compare(fileA, fileB, opt = {}) {
  const A = enumerate(fileA, opt), B = enumerate(fileB, opt);
  const nameA = path.basename(fileA), nameB = path.basename(fileB);
  const keys = new Set([...A.rows.keys(), ...B.rows.keys()]);

  console.log('='.repeat(88));
  console.log(`비교  ${nameA}  →  ${nameB}   (${keys.size}조합)`);
  console.log('='.repeat(88));

  const changed = [...keys].filter(k => !same(A.rows.get(k), B.rows.get(k)));
  console.log(`\n[1] 달라지는 조합 ${changed.length}/${keys.size}  ${JSON.stringify(countBy(changed))}`);

  console.log('\n[2] 5코스 기본 상태 — 대다수 고객이 보는 화면');
  for (const c of COURSE_KEYS) {
    const k = B.base.get(c) || A.base.get(c);
    const eq = same(A.rows.get(k), B.rows.get(k));
    console.log(`  ${NM[c].padEnd(4)} ${eq ? '= 같음 ' : '★다름 '} ${show(B.rows.get(k))}`);
    if (!eq) console.log(`       ${nameA}: ${show(A.rows.get(k))}`);
  }

  console.log('\n[3] 지표 대조');
  const row = (label, x) => {
    const v = violations(x.rows), all = violations(x.rows, { festiveSongException: false });
    console.log(`  ${label.padEnd(24)} §4-4위반 ${String(v.n).padStart(5)}쌍(전체 ${String(all.n).padStart(5)})`
      + `  밸리·축배인접 ${String(valleyToastAdjacent(x.rows).length).padStart(4)}`
      + `  케이크중복 ${String(cakeDup(x.states).length).padStart(4)}`);
  };
  row(nameA, A); row(nameB, B);

  console.log('\n[4] 불변식 — 바뀐 게 "이완(밸리·축가) 자리 이동"만으로 설명되는가');
  {
    const skip = new Set(RELAX);
    const broken = [...keys].filter(k => {
      const a = A.rows.get(k), b = B.rows.get(k); if (!a || !b) return false;
      return a.filter(x => !skip.has(x)).join('>') !== b.filter(x => !skip.has(x)).join('>');
    });
    if (!broken.length) console.log('  설명 안 되는 조합 0개 → 이완 이동 외의 부작용이 없다');
    else {
      console.log(`  설명 안 되는 조합 ${broken.length}개  ${JSON.stringify(countBy(broken))}`);
      const pat = new Map();
      for (const k of broken) {
        const p = show(A.rows.get(k)) + '  ⇒  ' + show(B.rows.get(k));
        pat.set(p, (pat.get(p) || 0) + 1);
      }
      let i = 0;
      for (const [p, n] of pat) { if (i++ >= 6) { console.log(`  … 외 ${pat.size - 6}종`); break; } console.log(`  (${String(n).padStart(3)}) ${p}`); }
    }
  }

  console.log('\n[5] 코스별 변화 패턴 (각 상위 3종)');
  for (const c of COURSE_KEYS) {
    const ks = changed.filter(k => k.startsWith(c + '|'));
    const tot = [...keys].filter(k => k.startsWith(c + '|')).length;
    console.log(`\n  ■ ${NM[c]}  ${ks.length}/${tot}조합`);
    if (!ks.length) { console.log('    변화 없음'); continue; }
    const pat = new Map();
    for (const k of ks) {
      const p = show(A.rows.get(k)) + '  ⇒  ' + show(B.rows.get(k));
      pat.set(p, (pat.get(p) || 0) + 1);
    }
    let i = 0;
    for (const [p, n] of pat) { if (i++ >= 3) { console.log(`    … 외 ${pat.size - 3}종`); break; } console.log(`    (${String(n).padStart(3)}) ${p}`); }
  }
  console.log('\n' + '='.repeat(88));
  return 0;
}

// ── 6. 진입점 ──────────────────────────────────────────────────────────────
// ★직접 실행할 때만 돈다. import하면 안 돈다 — 감사 스크립트(ritual-order-sim-audit.mjs)가
//   loadEngine·enumerate를 가져다 쓰는데, 무조건 실행하면 import만으로 process.exit이 터진다.
const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // --legacy: 2026-07-27판 1664조합으로 돌린다. 그때 인용한 수를 다시 뽑아 대조할 때만 쓴다.
  const argv = process.argv.slice(2).filter(a => a !== '--legacy');
  const opt = { legacy: process.argv.includes('--legacy') };
  if (opt.legacy) console.log('※ --legacy: 2026-07-27판 축(끄기 축)으로 돌린다 — 대조 전용이다.\n');
  let code = 0;
  try {
    if (argv.length === 0) code = selfCheck(DEFAULT_TARGET, opt);
    else if (argv.length === 1) code = selfCheck(path.resolve(argv[0]), opt);
    else if (argv.length === 2) code = compare(path.resolve(argv[0]), path.resolve(argv[1]), opt);
    else { console.log('사용: node scripts/audit/ritual-order-sim.mjs [--legacy] [파일] | [파일A 파일B]'); code = 2; }
  } catch (e) {
    console.log('\n실패: ' + e.message);
    console.log('순서 엔진 심볼이 바뀌었을 수 있다. 이 스크립트 상단 DECLS 목록을 같은 커밋에서 갱신할 것.');
    code = 1;
  }
  process.exit(code);
}
