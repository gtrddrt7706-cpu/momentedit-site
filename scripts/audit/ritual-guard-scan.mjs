// 식순 빌더 '내용 가드' 지역 열거 — order-preview.html
//
//   ★왜 순서 시뮬레이터(ritual-order-sim.mjs)와 따로 도는가
//   순서 열거기의 축은 '순서를 바꾸는 것'만 담는다(OFFTGL·seq). 그런데 고객에게 보이는 값을 바꾸는
//   필드는 그보다 넓다 — S.ringwarm·S.letter·S.declareWho·S.song… 은 순서를 전혀 안 바꾸면서
//   화면의 '약 N분'과 준비 목록을 바꾼다. 이걸 순서 축에 곱하면
//     13,632 × (ringwarm2·letter3·declareWho4·song2·growth2·entryVoice2·guestVoice2) = 13,632 × 384 ≒ 523만
//   이 되는데, 그 523만 행의 '순서 배열'은 여전히 13,632종뿐이다. 384배가 전부 복제고 지표만 부풀린다.
//   그래서 순서 축과 곱하지 않고, 가드가 읽는 필드만 그 가드에 대해서만 곱한다.
//
//   ★왜 함수가 아니라 '필드'로 색인하는가 (2026-07-31 클로드 코드 회신17 지적)
//   같은 필드를 같은 방향으로 읽는 자리가 함수 경계를 넘어 둘 이상 있다. estMin()과, 카드 칩을 그리는
//   지역 클로저 _mm()이 letter·ringwarm·toast를 똑같이 읽는다. 함수 단위로 잡으면 둘을 별개로 세고
//   '둘이 어긋났는가'라는 진짜 질문을 못 던진다. 그래서 표는 필드 기준이고, 가드는 그 필드를 참조만 한다.
//
//   ★이 스캐너가 존재하는 이유(실사고)
//   순서 시뮬레이터는 courseDefaults로 ring·bless·valley·toast 네 개만 세팅한다. 그래서
//   S.ringwarm·S.letter는 13,632조합 전부에서 undefined였고, estMin의 아래 두 줄은 한 번도 안 밟혔다.
//     if(inSeq('ringwarm') && S.ringwarm==='all') m+=2;
//     if(inSeq('letter')   && S.letter==='both')  m+=2;
//   그 상태로 시뮬레이터·감사·merge-guard가 전부 초록이었다. 축이 '잘못'되면 지표가 잡지만
//   축이 '빠지면' 아무도 못 잡는다. [A] 도달 검사가 그 구멍을 겨냥한다.
//
//   사용: node scripts/audit/ritual-guard-scan.mjs [파일]

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DECLS, grab, COURSE_KEYS, NM } from './ritual-order-sim.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const REPO = path.resolve(HERE, '../..');
const DEFAULT_TARGET = path.join(REPO, 'order-preview.html');

// ── 1. 가드 선언 적재 ────────────────────────────────────────────────────────
// 순서 엔진 선언(DECLS)에 내용 가드를 얹어 같은 S를 공유하는 하나의 스코프로 만든다.
// _mm·MMIN은 renderStep('tune') 안의 지역이지만 선언 자체는 독립이라 그대로 떼어 쓴다
// (미러를 새로 쓰지 않는다 — 미러는 원본과 갈리는 순간 거짓말을 시작한다).
export const GUARD_DECLS = [
  ['function inSeq(', false],
  /* [CAKE_DUP_GONE 2026-08-16] _cakeDup 삭제 — WINE_RETIRED 로 사이 순서가 사라져 닿을 조합이 0이었다.
     ★심볼이 없어지면 여기서도 빼야 한다. 안 빼면 grab 이 못 찾고 스캐너가 통째로 죽는다(실측). */
  ['function estMin(', false],
  ['function prep(', false],
  ['var MMIN={', false],
  ['var _mm=function(', false],
];

export function loadGuards(file) {
  const src = fs.readFileSync(file, 'utf8');
  const orderParts = DECLS.map(([n, o]) => grab(src, n, o)).filter(Boolean);
  const guardParts = GUARD_DECLS.map(([n, o]) => grab(src, n, o)).filter(Boolean);
  const body = orderParts.join('\n') + '\n' + guardParts.join('\n') + `
    return { COURSES, GADD, isGAdd, isOptK, ordNow, curSeq, OFFTGL, momOn,
             inSeq, estMin, prep, _mm, MMIN };
  `;
  const S = {};
  return { S, eng: new Function('S', body)(S), guardParts };
}

// ── 2. 필드 표 ──────────────────────────────────────────────────────────────
// 값 도메인은 order-preview.html 실측(복원 새니타이저 1724행 · pick 카드 · assets/ritual-data.js).
//   가드는 값 비교라 도메인을 줄이면 '줄인 만큼'을 못 본다 — 이 파일의 예산은 그걸 아낄 이유가 없다.
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
export const FIELDS = {
  ring:        ['on', 'off'],
  bless:       ['on', 'off'],
  valley:      ['none', 'wine', 'cake'],
  toast:       ['toast', 'cake', 'both'],
  ringwarm:    ['family', 'all'],
  letter:      ['parent', 'each', 'both'],
  declareWho:  ['narr', 'chorus', 'ask', 'family'],
  song:        ['family', 'live'],
  growth:      ['off', 'on'],
  growthLink:  ['', 'https://example.invalid/v'],
  entryVoice:  ['nar', 'couple'],
  guestVoice:  ['nar', 'couple'],
  welcome:     ['self'],                       // ★도메인 1(죽은 분기) — 지우지 말 것. 나중에 옵션 자리
  vowText:     ['', '있음'],
  letterText:  ['', '있음'],
  welcomeText: ['', '있음'],
};

// 가드별로 '읽는 필드'만 선언한다. 이 목록이 곧 지역 곱집합의 축이다.
// [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
export const GUARDS = {
  estMin:    ['ring', 'valley', 'bless', 'ringwarm', 'toast', 'letter'],
  _mm:       ['letter', 'ringwarm', 'toast'],
  prep:      ['bless', 'letter', 'welcome', 'declareWho', 'song',
              'growth', 'growthLink', 'entryVoice', 'guestVoice', 'ring'],
  /* [CAKE_DUP_GONE 2026-08-16] _cakeDup 은 사라졌다 — WINE_RETIRED 로 사이 순서가 없어져 닿을 조합이 0이다. */
  blocker:   ['vowText', 'letterText', 'welcomeText', 'welcome'],
};

const product = keys => keys.reduce(
  (acc, k) => acc.flatMap(o => FIELDS[k].map(v => ({ ...o, [k]: v }))), [{}]);

// seq 프로파일 2종 — 기본 코스 seq와 '넣을 수 있는 걸 전부 넣은' seq.
// inSeq()가 가드 분기의 앞조건이라, 순서에 없는 순간의 분기는 애초에 못 밟는다.
// 두 프로파일이면 '순서에 있을 때'와 '없을 때' 양쪽을 다 지난다.
function seqProfiles(eng) {
  return { base: () => ({}), full: (course) => {
    const on = {};
    (eng.COURSES[course].opt || []).forEach(o => { on[o.k] = true; });
    Object.keys(eng.GADD).filter(k => eng.isGAdd(k)).forEach(k => { on[k] = true; });
    return on;
  } };
}

const minOf = s => parseInt(String(s).replace(/[^0-9]/g, ''), 10);
const prepTag = p => p.map(r => r.join('|')).join(' / ');

// 카드에 실제로 찍히는 '약 N분' 칩의 합. renderStep('tune') 1155행 등가 —
// 옵션인데 안 넣은 것(d.off)과 OFFTGL인데 꺼진 것은 칩이 안 나온다.
function chipSum(eng, S) {
  let sum = 0;
  for (const x of eng.ordNow()) {
    const off = (eng.isOptK(x) && !S.extra[x]) || (eng.OFFTGL[x] && !eng.momOn(x));
    if (!off) sum += eng._mm(x) || 0;
  }
  return sum;
}

// ── 3. 스캔 ─────────────────────────────────────────────────────────────────
export function guardScan(file = DEFAULT_TARGET) {
  const { S, eng } = loadGuards(file);
  const prof = seqProfiles(eng);
  const out = { total: 0, perGuard: {}, unreached: [], deltaMismatch: [], oddMin: [], prepDup: [], cakeDup: 0 };

  const setup = (course, profileKey) => {
    for (const k of Object.keys(S)) delete S[k];
    S.course = course; S.ord = null;
    S.extra = prof[profileKey](course);
    Object.keys(FIELDS).forEach(k => { S[k] = FIELDS[k][0]; });
    if (course === 'family') S.bless = 'on';
  };

  for (const name of Object.keys(GUARDS)) {
    const axis = GUARDS[name];
    const combos = product(axis);
    // 값별 출력 집합 — [A] 도달 검사용. seen[field][value] = Set(출력 문자열)
    const seen = {}; axis.forEach(f => { seen[f] = {}; FIELDS[f].forEach(v => { seen[f][v] = new Set(); }); });
    let n = 0;

    for (const course of COURSE_KEYS) {
      for (const profileKey of ['base', 'full']) {
        for (const combo of combos) {
          setup(course, profileKey);
          Object.assign(S, combo);
          n++;

          let outp;
          if (name === 'estMin')        outp = eng.estMin();
          else if (name === '_mm')      outp = String(chipSum(eng, S));
          else if (name === 'prep')     outp = prepTag(eng.prep());
          else {                        // 작성 블로커 1490~1492 등가
            const b = [];
            if (eng.inSeq('vow') && !S.vowText) b.push('서약문');
            if (eng.inSeq('letter') && !S.letterText) b.push('편지');
            if (eng.inSeq('welcome') && S.welcome === 'self' && !S.welcomeText) b.push('인사말');
            outp = b.join(',');
          }
          // 같은 코스·프로파일 안에서 그 필드 값이 만든 출력만 모은다(코스 기본분 차이가 섞이지 않게)
          const scope = course + '/' + profileKey + '::';
          axis.forEach(f => seen[f][combo[f]].add(scope + outp));

          if (name === 'estMin') {
            const m = minOf(outp);
            if (!(m >= 10 && m <= 90)) out.oddMin.push({ course, profileKey, combo: { ...combo }, m });
          }
          if (name === 'prep') {
            const rows = eng.prep().map(r => r.join('|'));
            if (new Set(rows).size !== rows.length) out.prepDup.push({ course, profileKey, combo: { ...combo } });
          }
        }
      }
    }
    out.perGuard[name] = n; out.total += n;

    // [A] 이 필드의 어떤 값도 출력을 안 바꾸면 = 분기가 죽었거나 스캐너가 못 밟는다
    for (const f of axis) {
      const sets = FIELDS[f].map(v => seen[f][v]);
      const union = new Set(sets.flatMap(s => [...s]));
      const allSame = sets.every(s => s.size === union.size && [...union].every(x => s.has(x)));
      if (FIELDS[f].length > 1 && allSame) out.unreached.push({ guard: name, field: f });
    }
  }

  // [B] 칩 합과 총 시간의 '델타'가 일치하는가
  //   order-preview.html 1141행 주석이 명시한 불변식 — "estMin 델타와 일치(칩과 총 시간이 어긋나지 않게)".
  //   절대값은 다르다(estMin은 코스 기본분에서 출발). 같아야 하는 건 필드를 흔들었을 때의 변화량뿐이다.
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  const shared = ['letter', 'ringwarm', 'toast'];
  for (const course of COURSE_KEYS) {
    for (const profileKey of ['base', 'full']) {
      for (const f of shared) {
        setup(course, profileKey);
        const m0 = minOf(eng.estMin()), c0 = chipSum(eng, S);
        for (const v of FIELDS[f].slice(1)) {
          setup(course, profileKey); S[f] = v;
          const dm = minOf(eng.estMin()) - m0, dc = chipSum(eng, S) - c0;
          if (dm !== dc) out.deltaMismatch.push({ course, profileKey, field: f, value: v, estMin: dm, chip: dc });
        }
      }
    }
  }
  // [F] 축 누락 자동 탐지 — 이 스캐너가 존재하는 진짜 이유
  //   "축이 잘못되면 지표가 잡지만, 축이 빠지면 아무도 못 잡는다"를 자동화할 수 있는 유일한 지점.
  //   파일이 실제로 읽는 S.* 이름을 전부 긁어, 순서 축(ritual-order-sim)에도 없고 위 FIELDS에도 없는
  //   이름을 남긴다. 여기 뜬 이름은 '버그'가 아니라 '아무 열거기도 안 흔드는 필드'라는 뜻이다.
  const src = fs.readFileSync(file, 'utf8');
  // [VEIL_RETIRED 2026-08-03] 베일 다운 폐지 — 전 예식 동시입장이라 실행 불가. 되살리지 말 것.
  const ORDER_AXIS = ['course', 'extra', 'ord', 'ring', 'bless', 'valley', 'toast'];
  const known = new Set([...ORDER_AXIS, ...Object.keys(FIELDS)]);
  const hits = new Map();
  for (const m of src.matchAll(/\bS\.([A-Za-z_$][\w$]*)\s*(=[^=]|)/g)) {
    const e = hits.get(m[1]) || { r: 0, w: 0 };
    if (m[2]) e.w++; else e.r++;
    hits.set(m[1], e);
  }
  out.uncovered = [...hits.keys()].filter(n => !known.has(n) && hits.get(n).r > 0).sort();
  // 쓰기만 하고 아무도 안 읽는 필드 — 지워도 되는지는 사람이 정하지만, 있는 줄은 알아야 한다
  out.writeOnly = [...hits.keys()].filter(n => hits.get(n).r === 0).sort();
  return out;
}

// ── 4. 리포트 ───────────────────────────────────────────────────────────────
if (import.meta.url === `file://${process.argv[1]}`) {
  const file = process.argv[2] || DEFAULT_TARGET;
  const r = guardScan(file);
  let fail = 0;

  console.log('내용 가드 지역 열거 — ' + path.relative(REPO, file));
  console.log('  가드별 조합: ' + Object.entries(r.perGuard).map(([k, v]) => k + ' ' + v).join(' · '));
  console.log('  합 ' + r.total + '조합 (순서 축 13,632과 곱하지 않는다)\n');

  console.log('[A] 출력을 한 번도 안 바꾼 필드 (죽은 분기 또는 스캐너 사각지대)');
  if (!r.unreached.length) console.log('  ✅ 없음 — 모든 필드가 적어도 한 조합에서 출력을 바꾼다');
  else { r.unreached.forEach(u => console.log('  ⚠️  ' + u.guard + ' ← ' + u.field)); }

  console.log('\n[B] 카드 칩 합 vs 총 시간 델타 일치 (1141행 주석이 선언한 불변식)');
  if (!r.deltaMismatch.length) console.log('  ✅ 전 조합 일치');
  else {
    fail++;
    r.deltaMismatch.forEach(d => console.log('  ❌ ' + NM[d.course] + '/' + d.profileKey + ' ' + d.field
      + '=' + d.value + ' → estMin ' + d.estMin + '분 / 칩 합 ' + d.chip + '분'));
  }

  console.log('\n[C] estMin 값이 10~90분 밖');
  if (!r.oddMin.length) console.log('  ✅ 없음');
  else { fail++; r.oddMin.slice(0, 10).forEach(o => console.log('  ❌ ' + NM[o.course] + '/' + o.profileKey + ' ' + o.m + '분 ' + JSON.stringify(o.combo))); }

  console.log('\n[D] prep 항목 중복');
  if (!r.prepDup.length) console.log('  ✅ 없음');
  else { fail++; console.log('  ❌ ' + r.prepDup.length + '조합'); }

  /* [CAKE_DUP_GONE 2026-08-16] [E] 이중 커팅 가드 판정 삭제 — 가드 자체가 없어졌다.
     ★남겨 두면 «0조합이라 실패»로 영영 붉는다. 검사가 지키던 것이 사라지면 검사도 같이 걷는다.
       (초록으로 만들려고 문턱을 낮추는 것과는 다르다 — 지킬 대상이 없어진 것이다.) */

  console.log('\n[F] 어떤 열거기도 안 흔드는 S.* 필드 (순서 축 + 이 파일 FIELDS 양쪽에 없는 것)');
  if (!r.uncovered.length) console.log('  ✅ 없음 — 파일이 읽는 모든 상태 필드가 어느 한쪽 축에는 들어 있다');
  else console.log('  ⚠️  ' + r.uncovered.join(' · ') + '\n      → 순서를 바꾸면 ritual-order-sim.mjs STATES에, 보이는 값을 바꾸면 이 파일 FIELDS·GUARDS에 넣는다');
  if (r.writeOnly.length) console.log('  ⚠️  쓰기만 하고 아무도 안 읽는 필드: ' + r.writeOnly.join(' · '));

  console.log('\n' + (fail ? '❌ ' + fail + '건' : '✅ 통과')
    + (r.unreached.length ? '  (※ [A] ' + r.unreached.length + '건은 실패가 아니라 보고 — 아래 판단 필요)' : ''));
  process.exit(fail ? 1 : 0);
}
