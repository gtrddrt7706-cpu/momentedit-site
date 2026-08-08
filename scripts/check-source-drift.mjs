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

console.log(fail ? '\n── 원천과 갈린 자리가 있다. 손으로 적지 말고 데이터에서 뽑을 것.' : 'SOURCE DRIFT OK');
process.exit(fail);
