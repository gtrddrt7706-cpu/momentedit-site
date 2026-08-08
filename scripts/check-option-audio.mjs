// [OPT_KEY 2026-08-04] 옵션 카드의 「들어보기」가 전부 소리를 내는지 전수 확인
//
// 왜 생겼나 — 사용자 제보: *"1번 이부분 없다고 하는데?"* (성혼 선언 · 하객이 함께 답하기)
//   카드의 들어보기는 `oc(키,값)`의 **옵션 키**로 큐를 걸렀는데, 성혼 선언만 옵션 키가
//   `declareWho`이고 큐 키는 `declare`였다. 걸리는 큐가 0개 → 소리 없음.
//   mp3(33~35_declare-ask-*)는 멀쩡히 있었다. 화면만 조용히 비어 있었다.
//
// ★검사가 화면의 진짜 코드를 쓴다 — `_srcs`를 여기 옮겨 적지 않는다.
//   order-preview.html 에서 `var OPT_CUE` ~ `function _srcs` 원문을 그대로 떼어 내
//   new Function 으로 살려 부른다. 옮겨 적으면 규칙이 바뀌는 날 검사만 낡은 규칙을 지킨다.
//
// ★검사할 목록도 손으로 타이핑하지 않는다 (전에 이걸로 한 번 놓쳤다 —
//   커버리지 스크립트에 declareWho 값을 'narr/father/mother/both'로 **틀리게** 적어 두고
//   "전수 검사 통과"라고 보고했다. 실제 값은 narr/chorus/ask/family 였고, 사고 난 자리가 바로 거기다.)
//   그래서 ①옵션 키·값은 `oc(...)` 호출을 파싱해 얻고 ②변수로 도는 자리는 그 값을 돌리는
//   `[…].forEach` 목록을 코드에서 읽어 편다. 선택지가 늘면 검사 대상도 저절로 는다.
//
// ※다루는 범위 = `oc()` 로 그린 옵션 카드. 입장(entry) 느낌 6종은 카드가 아니라 칩이고
//   들어보기가 값 하나를 지정하지 않아(고른 값을 그대로 튼다) 여기 안 든다 —
//   그쪽은 check-text-audio.mjs · check-cast-audio.mjs 가 6종 전부를 따로 본다.
//
// ★들어보기 버튼이 **없는** 카드는 검사하지 않는다 — 화면 규칙과 같은 규칙을 쓴다.
//   oc() 안: `if(nar){ h+=narBox(nar,end)+playBtn(key,v); }` → 다섯째 인자 nar 이 빈 문자열/null 이면
//   버튼 자체가 안 그려진다(반지 '빼기' · 사이 순서 '없음' · 덕담 '빼기'). 소리가 없는 게 맞다.
//
// ★소리가 없어도 되는 자리는 명단에 이유와 함께 적는다. 그리고 명단은 스스로 낡음을 신고한다 —
//   명단에 있는데 소리가 나면(=클립이 생겼는데 명단이 안 지워졌으면) 실패시킨다.

import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';

const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..');

// [REDUB_PENDING] 아직 소리가 없어도 되는 클립 — 「재더빙 대기 명단」에서 읽는다(손으로 적지 않는다)
const REDUB_TXT = path.join(ROOT, 'docs/plans/식순연구/타입캐스트/재더빙_리드보강.txt');
const PENDING = new Set(fs.existsSync(REDUB_TXT)
  ? [...fs.readFileSync(REDUB_TXT, 'utf8').matchAll(/^\[\d+\]\s+(\S+)/gm)].map((m) => m[1]) : []);
const pending = [];
const req = createRequire(path.join(ROOT, 'package.json'));
const D = req(path.join(ROOT, 'assets/ritual-data.js'));
const RitualCue = req(path.join(ROOT, 'assets/ritual-cue.js'));
const RitualStory = req(path.join(ROOT, 'assets/ritual-story.js'));

const html = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');

// ── 들어보기 버튼이 있는데도 소리가 없어도 되는 자리 [NO_PLAY]
//   ★명단을 여기 손으로 적지 않는다 — 화면의 `var NO_PLAY={...}` 를 그대로 읽는다.
//     화면은 그 표를 보고 버튼을 숨기고, 검사는 같은 표를 보고 조용해도 된다고 판단한다.
//     한 곳만 고치면 둘이 같이 움직인다. 두 군데 적으면 한쪽만 고치는 날이 온다.
const npLine = html.match(/var NO_PLAY=\{([^}]*)\};/);
if (!npLine) { console.error('FAIL 화면에서 var NO_PLAY={...} 를 못 찾았습니다 [NO_PLAY]'); process.exit(1); }
const OK_SILENT = Object.fromEntries(
  [...npLine[1].matchAll(/'([^']+)'\s*:\s*'([^']*)'/g)].map((m) => [m[1], m[2]]),
);

// ── 화면에서 _srcs 원문을 떼어 낸다
function slice(from, to) {
  const a = html.indexOf(from);
  if (a < 0) { console.error(`FAIL 화면에서 '${from}' 을 못 찾았습니다 — 이름이 바뀌었으면 이 검사도 같이 고치세요`); process.exit(1); }
  const b = html.indexOf(to, a);
  if (b < 0) { console.error(`FAIL '${from}' 뒤에서 '${to}' 를 못 찾았습니다`); process.exit(1); }
  return html.slice(a, b);
}
const srcText = slice('var EXTRA_ON=', '\nfunction momSrcs(');
const makeSrcs = new Function('S', 'g', `${srcText}\nreturn _srcs;`);

// ── oc( … ) 호출 하나를 통째로 떼어 내고 최상위 콤마로 인자를 자른다
//    (문자열 안의 콤마·괄호에 속지 않게. 대사에 쉼표가 많다 — "신랑 신부, 입장!")
function argsOf(text, at) {
  let i = at, depth = 0, q = null, esc = false, cur = '', out = [];
  for (; i < text.length; i++) {
    const ch = text[i];
    if (q) {
      cur += ch;
      if (esc) esc = false;
      else if (ch === '\\') esc = true;
      else if (ch === q) q = null;
      continue;
    }
    if (ch === '\'' || ch === '"') { q = ch; cur += ch; continue; }
    if (ch === '(' || ch === '[' || ch === '{') { depth++; if (depth === 1 && ch === '(') { cur = ''; continue; } cur += ch; continue; }
    if (ch === ')' || ch === ']' || ch === '}') { depth--; if (depth === 0) { out.push(cur.trim()); return out; } cur += ch; continue; }
    if (ch === ',' && depth === 1) { out.push(cur.trim()); cur = ''; continue; }
    cur += ch;
  }
  return null;
}
const lit = (s) => (/^'([^']*)'$/.test(s) ? s.slice(1, -1) : /^"([^"]*)"$/.test(s) ? s.slice(1, -1) : null);
const isEmptyNar = (s) => s === undefined || s === '' || s === 'null' || s === 'undefined' || s === "''" || s === '""';

// ── 값이 변수로 도는 자리(`oc('tribute', v, …)`)의 값 목록을 **코드에서** 얻는다
//    손으로 타이핑하지 않는다 — 위 머리말의 사고가 정확히 그것 때문이었다.
//    ①`[…].forEach(function(v)` 처럼 바로 위 문장이 목록이면 그 안의 문자열을 전부 쓴다
//    ②`lopts.forEach(function(v)` 처럼 이름으로 돌면 그 이름을 만든 `var lopts=` 줄의 문자열을 쓴다
//      (코스에 따라 갈라지는 삼항이라도 양쪽 값을 다 검사하게 된다 — 넓게 잡는 쪽이 안전하다)
function loopVals(text, ocAt, ident) {
  if (!/^[a-zA-Z_$][\w$]*$/.test(ident)) return [];
  const head = text.slice(Math.max(0, ocAt - 1200), ocAt);
  const hits = [...head.matchAll(new RegExp(`([^\\n;{]*)\\.forEach\\(\\s*function\\s*\\(\\s*${ident}\\b`, 'g'))];
  if (!hits.length) return [];
  const src = hits[hits.length - 1][1].trim();
  // ★대괄호가 있으면 **대괄호 안**의 문자열만 쓴다 — 조건식에 섞인 값(`S.course==='gamdong'`)을
  //   선택지로 잘못 주워 담지 않게. 넓게 잡히면 없는 선택지를 '통과'시키며 진짜 구멍을 가린다.
  const grab = (t) => {
    const arr = [...t.matchAll(/\[([^\]]*)\]/g)].map((x) => x[1]);
    const from = arr.length ? arr.join(',') : t;
    return [...new Set([...from.matchAll(/'([a-zA-Z0-9_-]*)'/g)].map((x) => x[1]).filter(Boolean))];
  };
  if (src.includes('[')) return grab(src);
  const nm = src.match(/([a-zA-Z_$][\w$]*)$/);
  if (!nm) return [];
  const dv = text.slice(0, ocAt).match(new RegExp(`\\bvar\\s+${nm[1]}\\s*=([^\\n;]*)`, 'g'));
  return dv ? grab(dv[dv.length - 1]) : [];
}

const pairs = [];               // [키, 값]
const noBtn = [];               // 들어보기 버튼이 아예 없는 카드
const seenPair = new Set();
let parseFail = 0;
for (const m of html.matchAll(/\boc\(/g)) {
  const a = argsOf(html, m.index + 2);
  if (!a) { parseFail++; continue; }
  const key = lit(a[0]);
  if (!key) continue;           // 키가 변수인 자리는 없다 — 있으면 그때 여기를 고친다
  // 값: 문자열이면 그것 하나, 변수면 이 호출이 참조하는 데이터 맵의 키를 전부 편다
  let vals = [];
  const v0 = lit(a[1]);
  if (v0 !== null) vals = [v0];
  else {
    vals = loopVals(html, m.index, a[1]);
    if (!vals.length) { console.error(`FAIL oc('${key}', ${a[1]} …) 의 값 목록을 찾지 못했습니다 — 값을 도는 방식이 바뀌었으면 이 검사도 같이 고치세요 [OPT_KEY]`); parseFail++; continue; }
  }
  for (const v of vals) {
    const tag = key + '=' + v;
    if (seenPair.has(tag)) continue;
    seenPair.add(tag);
    if (isEmptyNar(a[4])) { noBtn.push(tag); continue; }   // 화면과 같은 규칙 — nar 이 비면 버튼이 없다
    pairs.push([key, v]);
  }
}
if (parseFail) { console.error(`\n★oc() 파싱 ${parseFail}건 실패`); process.exit(1); }

// ── 옵션 키가 큐 키이거나 OPT_CUE 표에 있는지
const cueKeys = new Set();
for (const m of fs.readFileSync(path.join(ROOT, 'assets/ritual-cue.js'), 'utf8').matchAll(/k: '([a-zA-Z_]+)'/g)) cueKeys.add(m[1]);
const optCue = JSON.parse(('{' + (srcText.match(/var OPT_CUE=\{([^}]*)\}/) || [, ''])[1] + '}').replace(/([a-zA-Z_]+):/g, '"$1":').replace(/'/g, '"'));

let fail = 0;
for (const k of new Set(pairs.map((p) => p[0]))) {
  const target = optCue[k] || k;
  if (!cueKeys.has(target)) {
    console.error(`FAIL 옵션 키 '${k}' → 큐 키 '${target}' 가 없습니다. assets/ritual-cue.js 의 k 값이거나 order-preview.html 의 OPT_CUE 에 적혀 있어야 합니다 [OPT_KEY]`);
    fail++;
  }
}
for (const t of Object.entries(optCue)) if (!cueKeys.has(t[1])) { console.error(`FAIL OPT_CUE['${t[0]}'] = '${t[1]}' 은 큐 키가 아닙니다 [OPT_KEY]`); fail++; }

// ── 선택지마다 실제로 소리가 나는지
const base = {
  course: 'damback', entry: 'A', welcome: 'self', vow: 'ok', ring: 'on', declare: '1', valley: 'none',
  letter: 'parent', bless: 'off', ringwarm: 'family', tribute: 'flower', toast: 'toast', song: 'family',
  flash: false, welcomeText: '', vowText: '', letterText: '', mPeak: '', mClose: '',
  guestVoice: 'nar', entryVoice: 'nar', declareWho: 'narr', growth: 'off', growthLink: '',
  blessProxy: false, tune: { entry: true }, extra: {}, up: {},
};
const g = { RitualCue, RitualStory, RitualData: D };
let ok = 0;
const silent = [];
for (const [k, v] of pairs.slice().sort()) {
  const S = JSON.parse(JSON.stringify(base));
  const _srcs = makeSrcs(S, g);
  let out = [];
  try { out = _srcs(g, k, v) || []; } catch (e) { out = []; }
  const tag = `${k}=${v}`;
  const missing = out.filter((o) => !fs.existsSync(path.join(ROOT, String(o.src).replace(/^\.?\//, ''))));
  if (!out.length) {
    if (OK_SILENT[tag]) silent.push(tag);
    else { console.error(`FAIL 「${tag}」 들어보기에 소리가 없습니다 — 옵션 키와 큐 키가 어긋났거나 클립이 안 붙었습니다 [OPT_KEY]`); fail++; }
  } else if (OK_SILENT[tag]) {
    console.error(`FAIL 명단이 낡았습니다 — 「${tag}」 는 '소리 없어도 됨'으로 적혀 있는데 실제로는 ${out.length}개가 납니다. order-preview.html 의 NO_PLAY 에서 지우세요 [NO_PLAY]`);
    fail++;
  } else if (missing.length) {
    // ★[REDUB_PENDING 2026-08-07] 문안을 새로 쓰면 소리는 **당분간** 없다. 그 창을 빨갛게만 두면
    //   재더빙이 끝날 때까지 검사 전체가 빨개서 사람이 검사를 안 보게 된다.
    //   ★그렇다고 조용히 넘기지 않는다 — 「재더빙_리드보강.txt」(사용자가 실제로 붙여넣는 파일)에
    //     이름이 있는 것만 봐준다. 그 파일은 scripts/check-text-audio.mjs 가 양방향으로 지킨다.
    //     명단을 여기 또 적지 않는다 — 두 군데 적으면 한쪽만 낡는다.
    const pendOnly = missing.filter((m) => !PENDING.has(String(m.src).replace(/^.*\/\d+_/, '').replace(/\.mp3$/, '')));
    if (!pendOnly.length) { pending.push(tag); }
    else {
      console.error(`FAIL 「${tag}」 가 부르는 파일이 없습니다: ${pendOnly.map((m) => m.src).join(' · ')} [OPT_KEY]`);
      fail++;
    }
  } else ok++;
}
for (const t of Object.keys(OK_SILENT)) if (!seenPair.has(t)) { console.error(`FAIL NO_PLAY 의 '${t}' 는 화면에 없는 선택지입니다 — order-preview.html 에서 지우세요 [NO_PLAY]`); fail++; }

if (fail) { console.error(`\n★옵션 들어보기 ${fail}건 실패`); process.exit(1); }
if (pending.length) console.log(`⏳ 재더빙 대기라 아직 소리가 없는 자리 ${pending.length}개 — ${[...new Set(pending)].join(' · ')} (재더빙_리드보강.txt)`);
console.log(`ok 옵션 들어보기 ${ok}개 전부 소리 남 · 버튼 없는 카드 ${noBtn.length}개 · 소리 없어도 되는 자리 ${silent.length}개(${silent.join(' · ') || '없음'})`);
