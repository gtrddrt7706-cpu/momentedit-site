#!/usr/bin/env node
/**
 * check-source-drift.mjs — 원천 값이 손으로 적혀 있는 자리를 찾는다 [SOURCE_DRIFT]
 *
 * ★왜 만들었나 (2026-08-08)
 *   코스를 셋으로 줄이고 이름을 바꾸는 동안 같은 사고가 **네 번** 나왔다.
 *     ①AI 상담사가 "다섯 코스" 라고 안내 ②숨긴 코스를 상담사가 그대로 나열
 *     ③검사가 '담백 25분' 을 박아 둬서 개명하자마자 실패 ④시간표가 옛 분을 표시
 *   전부 같은 병이다 — **원천에 있는 값을 어딘가에 손으로 또 적었다.**
 *   인스턴스를 계속 잡는 대신 **클래스를 잡는다.**
 *
 * 무엇을 보나
 *   1) 숨긴 코스 이름이 **고객·상담사에게 닿는 파일**에 있는가 → 있으면 실패
 *      (고를 수 없는 코스를 권하게 된다. 이번에 실제로 그랬다)
 *   2) 폐지한 순서 이름이 고객에게 닿는 파일에 있는가 → 있으면 실패
 *   3) 코스 개수를 한글 수사로 적은 자리가 있는가 → 있으면 실패
 *      ("다섯 코스" 처럼 · 개수는 늘 데이터에서 세야 한다)
 *
 * ★주석·마커·되살리기 금지문은 세지 않는다. 그건 "적어 두는 것이 목적"인 글이다.
 *   판별은 줄 단위로 한다 — RETIRED/폐지/되살리지/금지/HIDDEN 같은 말이 같은 줄에 있으면 건너뛴다.
 */
import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
const require = createRequire(import.meta.url);
const root = path.join(path.dirname(new URL(import.meta.url).pathname), '..');
const D = require(path.join(root, 'assets/ritual-data.js'));

let fail = 0;
const ok = (m) => console.log('ok  drift: ' + m);
const no = (m) => { console.log('DRIFT? ' + m); fail = 1; };

// 고객·상담사에게 닿는 파일만 본다. 문서·임시 점검 화면은 제외(설명이 목적이다).
/* 고객·상담사·운영자에게 닿는 파일. 문서와 임시 점검 화면은 뺀다(설명이 목적이다).
   ★admin.html 도 넣는다 — 운영자가 폐지된 순서를 화면에서 보면 "아직 되나 보다" 하고 안내한다.
     실제로 여기서 '베일 다운' 행이 살아 있는 것을 이 검사가 잡았다. */
const FACING = ['index.html', 'mypage.html', 'order-preview.html', 'guide.html', 'seat.html',
  'console.html', 'live.html', 'admin.html', 'api/_ritual-kb.js', 'assets/advisor-kb.js'];
/* ★면제 — "적어 두는 것이 목적"인 줄. 여기 낱말을 늘릴 때는 조심할 것:
   면제가 늘수록 검사가 눈을 감는다. 늘리기 전에 "정말 적어 둬야 하는 글인가"를 먼저 물 것.
   ★`"nm":` 는 원천에서 뽑은 **사본 데이터**다(숨긴 코스도 데이터에는 있어야 한다 —
     저장된 초안이 그 키를 쥐고 있으면 이름 없이 키만 뜬다). 화면에 뜨는지는 hidden 이 정한다. */
const EXEMPT = /RETIRED|HIDDEN|폐지|되살리|금지|주석|옛 |COURSE_NAME|TONE_LABELS|LEGACY_LABEL|"nm":|COURSES\[k\]\.nm/;

/* ★맨눈 문자열로 훑으면 못 쓴다 — 「감동」·「축하」는 평범한 낱말이기도 하다.
   첫 판에서 "함께 축하해요" · "감동은 도입부로" 같은 산문이 34건 잡혔다.
   그래서 **값으로 쓰인 자리**만 본다: 따옴표로 감싼 정확한 낱말, 또는 "○○ 코스".
   ★이 좁힘이 검사의 생명이다. 오탐이 많으면 다음 사람이 검사를 무시한다. */
function scan(needle) {
  const pats = [new RegExp("['\"]" + needle + "['\"]"), new RegExp(needle + "\\s*코스")];
  const hits = [];
  for (const f of FACING) {
    const p = path.join(root, f);
    if (!fs.existsSync(p)) continue;
    fs.readFileSync(p, 'utf8').split('\n').forEach((line, i) => {
      if (EXEMPT.test(line)) return;
      if (pats.some((re) => re.test(line))) hits.push(`${f}:${i + 1}`);
    });
  }
  return hits;
}

/* 1) 숨긴 코스 이름 */
{
  const hidden = Object.keys(D.COURSES).filter((k) => D.COURSES[k].hidden).map((k) => D.COURSES[k].nm);
  const bad = hidden.flatMap((n) => scan(n).map((h) => `${n} @ ${h}`));
  if (bad.length) no(`숨긴 코스 이름이 고객에게 닿는 곳에 있다 — 고를 수 없는 코스를 권하게 된다\n    ${bad.join('\n    ')}`);
  else ok(`숨긴 코스 ${hidden.length}종이 고객 쪽에 안 샘 (${hidden.join('·')})`);
}

/* 2) 폐지한 순서 */
{
  const RETIRED_WORDS = ['링 워밍', '링워밍', '베일 다운'];
  const bad = RETIRED_WORDS.flatMap((n) => scan(n).map((h) => `${n} @ ${h}`));
  if (bad.length) no(`폐지한 순서가 고객에게 닿는 곳에 있다\n    ${bad.join('\n    ')}`);
  else ok(`폐지한 순서 ${RETIRED_WORDS.length}종이 고객 쪽에 안 샘`);
}

/* 3) 코스 개수를 손으로 적은 자리 */
{
  const WORDS = ['다섯 코스', '네 코스', '세 코스', '여섯 코스', '코스 5종', '코스 4종', '코스 3종', '코스 6종', '5개 코스', '3개 코스'];
  const bad = WORDS.flatMap((n) => scan(n).map((h) => `"${n}" @ ${h}`));
  if (bad.length) no(`코스 개수가 손으로 적혀 있다 — 늘 데이터에서 셀 것\n    ${bad.join('\n    ')}`);
  else ok('코스 개수를 손으로 적은 자리 없음');
}

/* 4) ★녹음 대본이 모든 클립을 아는가
   2026-08-08 실측: 대본 생성기가 **51개만** 알고 있었는데 실제 클립은 75개였다.
   대본을 읽는 사람은 51개가 전부인 줄 알고, 나머지 24개는 아무도 녹음하지 않는다.
   ★폐지한 슬러그(RETIRED)는 뺀다 — 자리는 남기되 녹음하지 않는 것이다. */
{
  const Cue = require(path.join(root, 'assets/ritual-cue.js'));
  const scriptPath = path.join(root, 'docs/plans/식순연구/더빙_녹음_대본_최종.txt');
  if (!fs.existsSync(scriptPath)) no('녹음 대본이 없다 — node scripts/build-dubbing-script.mjs');
  else {
    const t = fs.readFileSync(scriptPath, 'utf8');
    const live = Cue.FILES.filter((f) => !(Cue.RETIRED || {})[f]);
    const miss = live.filter((f) => !t.includes(f));
    if (miss.length) no(`녹음 대본이 모르는 클립 ${miss.length}개 — build-dubbing-script.mjs 에 추가할 것\n    ${miss.join(', ')}`);
    else ok(`녹음 대본이 클립 ${live.length}개를 전부 안다`);
  }
}

/* 5) ★140분 시간표가 여러 곳에 손으로 적혀 있다 — 옛 숫자가 남으면 고객이 다른 시간을 본다.
   2026-08-08 1차: 옛 낱말 6개를 목록으로 두고 찾았다. 그날 저녁에 바로 뚫렸다 —
   FAQ 블록이 `30m | The Ceremony` 형식이라 `'본식 30분'` 목록에 하나도 안 걸렸다.
   같은 표가 실제로는 **아홉 군데**였다(index 셋 · sequence-modal · order-preview ·
   advisor-kb · _kb.js · 계약서 3조 · 스마트스토어 원본).
   ★그래서 낱말을 찾지 않는다. **숫자를 데이터에서 계산해 놓고, 다른 숫자가 붙어 있으면 실패**한다.
     'Ceremony'·'Group Record' 옆에 붙은 가장 가까운 시간 표기를 읽어, 계산값과 다르면 잡는다.
     새 형식으로 적어도(30m·(30분)·30<small>min) 걸린다. */
{
  // 보이는 코스에서 본식 범위를 계산한다 — 손으로 적지 않는다.
  const mins = Object.keys(D.COURSES).filter((k) => !D.COURSES[k].hidden).map((k) => D.MIN.base[k]);
  const CE = [Math.min(...mins), Math.max(...mins)];       // 본식 16~24
  /* ★합계도 손으로 적지 않는다 — D.DAY 에서 계산한다. [DAY_PLAN 2026-08-09]
     2026-08-08 에는 합이 60분이었고 하루 뒤 55분이 됐다. 그때 이 줄이 60 으로 박혀 있었으면
     열 벌을 다 고쳐 놓고도 검사만 옛 숫자를 들고 빨개졌을 것이다. */
  const SUM = D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell;
  const GR = [SUM - CE[1], SUM - CE[0]];                   // 다 함께 31~39 (합 55분 고정)
  const okRange = (lo, hi, want) => lo >= want[0] && hi <= want[1];

  // 지나간 것을 보존하는 자리는 본다고 달라지지 않는다.
  const FROZEN = /(^|\/)(contract\/archive|docs\/국가지원금|docs\/plans|node_modules|_deploy-patch|\.git)\//;
  const EXT = /\.(html|js|mjs|gs|md|json)$/;
  const files = [];
  (function walk(dir) {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const rel = path.relative(root, path.join(dir, e.name));
      if (/^(node_modules|\.git|_deploy-patch)$/.test(e.name)) continue;
      if (e.isDirectory()) walk(path.join(dir, e.name));
      else if (EXT.test(e.name) && !FROZEN.test(rel + '/')) files.push(rel);
    }
  })(root);

  /* ★붙어 있는 것만 본다. 시간표 한 줄은 숫자와 이름 사이에 서식(태그·구분자)밖에 없다:
       `30m | The Ceremony` · `The Ceremony (30분)` · `- 30분 The Ceremony:` ·
       `30<small>min</small>…<div class="n">Group Record`
     사이에 **말(글자)이 끼면 시간표 줄이 아니다** — "모먼트에디트의 140분은 …" 같은 총합 문장이
     그렇게 걸러진다. 1차 시도는 '가장 가까운 숫자'를 봤다가 총합 140분·합 60분까지 28건을 잡았다. */
  /* ★이름과 숫자를 짝지으려 하지 않는다 — 세 번 시도했고 세 번 다 틀렸다.
       ①'가장 가까운 숫자'는 총합 140분·합 60분을 잡았다(28건 오탐).
       ②'사이에 글자가 없으면 한 줄'은 이웃 항목끼리 엇갈려 짝지었다(`…정갈한 본식 36~44m | Group Record`).
       ③'표를 통째로 순서대로'는 설명글 속 분("하객 입장 20분이 여기 겹쳐요")에 밀려 어긋났다.
     ★네 번째가 맞았다 — **순서만 본다(부분 수열)**.
       `Getting Ready`~`Farewell` 구간의 시간 표기를 순서대로 뽑고,
       [20 · 40 · 본식 · 인사와사진 · 20] 이 그 안에 **순서대로 들어 있는지**만 확인한다.
       설명글·제목의 군더더기 숫자는 사이에 끼어도 통과하고, 행 숫자가 낡으면 순서가 끊겨 잡힌다.
       이름을 안 보므로 `30m | The Ceremony` 든 `The Ceremony (30분)` 든 `30<small>min` 이든 다 걸린다. */
  const want = [String(D.DAY.ready), String(D.DAY.snap), `${CE[0]}~${CE[1]}`, `${GR[0]}~${GR[1]}`, String(D.DAY.farewell)];
  /* ★숫자와 단위 사이에 태그가 낀다 — `20<span>min</span>` · `30<small>min</small>`.
     이걸 빼먹어서 index.html 의 **보이는** 시간표 한 벌을 통째로 못 읽고 있었다(THIN).
     '읽은 벌 수'를 함께 세지 않았다면 초록으로 통과했을 것이다. */
  const DUR = /(\d{1,3})(?:\s*[~–-]\s*(\d{1,3}))?(?:\s|<[^>]{0,40}>)*(?:분|m\b|min)/g;
  const bad = [];
  let tables = 0;
  for (const f of files) {
    if (f === 'scripts/check-source-drift.mjs') continue;   // 이 규칙 자체가 예시로 옛 형식을 적는다
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    /* 표의 처음·끝을 알리는 말. 영어 시퀀스명이 없는 표도 있다(sequence-modal.js 는 한글 진행표라
       'Getting Ready' 가 한 글자도 없다 — 그래서 아홉 벌만 읽히고 한 벌이 조용히 빠져 있었다). */
    const ANCHOR = [['Getting Ready', 'Farewell'], ['신랑·신부 도착', '마무리·배웅']];
    for (const [head, tail] of ANCHOR) {
    const gre = new RegExp(head, 'g');
    let g;
    while ((g = gre.exec(src))) {
      const end = src.indexOf(tail, g.index);
      if (end < 0 || end - g.index > 3000) continue;        // 표가 아니다(스쳐 가는 언급)
      /* ★주석을 지우고 읽는다. 안 지웠더니 index.html 의 보이는 표를 30분으로 망가뜨려도
         바로 위 주석("본식 30 → 16~24분")이 16~24 를 대신 내주어 검사가 통과했다.
         돌연변이 시험(행을 일부러 낡게 바꿔 보기)이 아니었으면 못 찾았을 구멍이다. */
      const region = src.slice(Math.max(0, g.index - 90), end + 90)
        .replace(/<!--[\s\S]*?-->|\/\*[\s\S]*?\*\//g, ' ')
        .replace(/(^|[^:])\/\/[^\n]*/g, '$1 ');
      const got = [];
      DUR.lastIndex = 0;
      let d;
      while ((d = DUR.exec(region))) got.push(d[2] ? `${+d[1]}~${+d[2]}` : String(+d[1]));
      if (got.length < 5) continue;                          // 시간을 안 적은 표(화살표 나열 등)
      tables++;
      let k = 0;
      for (const t of got) if (t === want[k]) k++;
      if (k < want.length) {
        bad.push(`${f}:${src.slice(0, g.index).split('\n').length} — [${want[k]}]분이 제자리에 없다. `
          + `읽은 값 [${got.join(' · ')}] / 있어야 할 순서 [${want.join(' · ')}]`);
      }
    }
    }
  }
  /* 5b) 표 밖의 산문에 적힌 길이 — "본식 16~24분의 식순과 대본이 만들어져요" 같은 문장.
     표 검사는 `Getting Ready`~`Farewell` 안만 보므로 이런 줄을 통째로 지나친다(실측으로 뚫렸다).
     ★띄어쓰기 두 칸까지만 붙은 것을 본다. `본식<br>36~44m | Group Record` 처럼 태그·구분자가
       끼면 그건 이웃 항목이지 이 항목의 길이가 아니다 — 그 구분이 오탐을 막는 전부다. */
  {
    const N = '(\\d{1,3})(?:\\s*[~–-]\\s*(\\d{1,3}))?\\s*(?:분|m\\b|min)';
    const pairs = [['(?:본식|The Ceremony)', CE, '본식'], ['(?:다 함께|인사와 사진|Group Record)', GR, '다 함께']];
    for (const f of files) {
      if (f === 'scripts/check-source-drift.mjs') continue;
      const src = fs.readFileSync(path.join(root, f), 'utf8');
      for (const [nm, wantR, label] of pairs) {
        for (const re of [new RegExp(nm + ' {0,2}' + N, 'g'), new RegExp(N + ' {0,2}' + nm, 'g')]) {
          let m;
          while ((m = re.exec(src))) {
            /* ★줄 전체로 면제하지 않는다. order-preview 의 고객 문구 뒤에 붙은
               `// … 옛 '30분 안팎'은 …` 주석 하나가 그 줄을 통째로 눈감게 했다(실측). */
            if (EXEMPT.test(src.slice(Math.max(0, m.index - 40), m.index + m[0].length + 40))) continue;
            const g = m.slice(1).filter((x) => x !== undefined);
            const lo = +g[0], hi = +(g[1] || g[0]);
            if (okRange(lo, hi, wantR)) continue;
            bad.push(`${label} 산문 "${m[0].trim()}" (계산값 ${wantR[0]}~${wantR[1]}분) `
              + `@ ${f}:${src.slice(0, m.index).split('\n').length}`);
          }
        }
      }
    }
  }

  /* ★한 벌이라도 '읽히지 않게' 바뀌면 검사가 조용히 눈을 감는다. 그래서 벌 수도 센다.
     복사본을 정당히 지웠다면 이 숫자를 같은 커밋에서 내릴 것. */
  const FLOOR = 10;
  if (tables < FLOOR) bad.push(`시간표를 ${tables}벌밖에 못 읽었다(최소 ${FLOOR}) — 형식이 바뀌어 검사가 눈감고 있다`);
  if (bad.length) no(`140분 시간표가 어긋난다 — 열 벌을 함께 고칠 것\n    ${[...new Set(bad)].join('\n    ')}`);
  else ok(`140분 시간표 ${tables}벌 일치 (본식 ${CE[0]}~${CE[1]}분 · 다 함께 ${GR[0]}~${GR[1]}분 · 합 ${SUM}분)`);
}

/* 6) ★절대 시각형 시간표 3벌 — 위 (5)가 **못 보던 자리**다. [CLOCK_TABLE 2026-08-09]
   (5)는 '분·m·min' 단위가 붙은 **길이** 표기만 읽는다. 그런데 inquiry·schedule·mypage 에는
   길이가 아니라 **시계 숫자**로 적힌 표가 한 벌씩 있다(신랑·신부 도착 / 내빈 입장 시작 / 본예식 / 종료).
   실사고 2026-08-09 — DAY_PLAN 으로 단독 스냅이 40→45분이 되자 본예식이 10:00 → 10:05 로 밀렸는데,
   길이 표기 열 벌은 전부 고쳐졌고 **이 세 벌만 10:00 인 채 남았다**. 검사도 전부 초록이었다.
   고객이 문의 화면에서 '본예식 10:00'을 보고 청첩장에 그렇게 적으면 5분이 어긋난 채 하루가 돈다.
   ★그래서 여기서도 손으로 적지 않는다 — 도착 시각만 표에서 읽고 나머지 셋은 D.DAY 로 계산한다. */
{
  const hhmm = (t) => String(Math.floor(t / 60)).padStart(2, '0') + ':' + String(t % 60).padStart(2, '0');
  const toMin = (s) => +s.slice(0, 2) * 60 + +s.slice(3, 5);
  // 하객이 몇 분 전에 들어오는지 — sequence-modal 의 '하객 입장' 블록 길이가 원천이다(현재 20분).
  const modal = fs.readFileSync(path.join(root, 'assets/sequence-modal.js'), 'utf8');
  const leadM = modal.match(/\['하객 입장',\s*'(\d+)분'/);
  const bad6 = [];
  if (!leadM) bad6.push("assets/sequence-modal.js 에서 '하객 입장' 블록 길이를 못 읽었다 — 형식이 바뀌었다");
  const LEAD = leadM ? +leadM[1] : 0;
  const CLOCK = ['inquiry.html', 'schedule.html', 'mypage.html'];
  let slots = 0;
  for (const f of CLOCK) {
    const src = fs.readFileSync(path.join(root, f), 'utf8');
    const times = [...src.matchAll(/ref-time[^>]*>(\d{2}:\d{2})</g)].map((m) => m[1]);
    if (times.length % 4 !== 0 || times.length === 0) {
      bad6.push(`${f}: ref-time 을 ${times.length}개 읽었다(4의 배수여야 한다) — 표 형식이 바뀌어 검사가 눈감는다`);
      continue;
    }
    for (let i = 0; i < times.length; i += 4) {
      const [arrive, enter, cere, end] = times.slice(i, i + 4);
      const a = toMin(arrive);
      const want = [arrive, hhmm(a + D.DAY.ready + D.DAY.snap - LEAD), hhmm(a + D.DAY.ready + D.DAY.snap), hhmm(a + D.DAY.total)];
      const got = [arrive, enter, cere, end];
      slots++;
      if (want.join() !== got.join()) {
        bad6.push(`${f} ${arrive} 시간대: 표 ${got.join(' · ')} ≠ 계산 ${want.join(' · ')}`
          + ` (도착+준비${D.DAY.ready}+스냅${D.DAY.snap}=본예식 · 그 ${LEAD}분 전 입장 · 도착+${D.DAY.total}=종료)`);
      }
    }
  }
  const SLOT_FLOOR = 9;   // 3파일 × 오전·오후·늦은오후
  if (slots < SLOT_FLOOR) bad6.push(`시각표를 ${slots}칸밖에 못 읽었다(최소 ${SLOT_FLOOR}) — 형식이 바뀌어 검사가 눈감고 있다`);
  if (bad6.length) no(`절대 시각 시간표가 어긋난다 — 길이 표기와 함께 고칠 것\n    ${[...new Set(bad6)].join('\n    ')}`);
  else ok(`절대 시각 시간표 ${slots}칸 일치 (본예식 = 도착+${D.DAY.ready + D.DAY.snap}분 · 입장 그 ${LEAD}분 전 · 종료 도착+${D.DAY.total}분)`);
}

console.log(fail ? '\n── 원천과 갈린 자리가 있다. 손으로 적지 말고 데이터에서 뽑을 것.' : 'SOURCE DRIFT OK');
process.exit(fail);
