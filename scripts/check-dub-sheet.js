#!/usr/bin/env node
/**
 * check-dub-sheet.js — 더빙 대본 시트가 자동 생성 대본과 어긋나지 않게 고정  [DUB_SHEET_GUARD]
 *
 * 왜 필요한가 (2026-08-01 실사고):
 *   `더빙_대본_시트.md`는 손으로 관리하는데 `더빙_녹음_대본_최종.md`는 원천에서 자동 생성된다.
 *   둘 다 "클립 목록 + 문안"을 들고 있었고, 조용히 8건이 갈라졌다:
 *     · 축배 파일명이 시트만 `toast-cheer` (엔진은 `toast-toast`) → 그대로 녹음하면 축배만 안 나간다
 *     · N0 문안이 폐기된 구 버전('자리를 옮기실 때') → 바로 앞 폐식이 '자리에서 그대로'라 정반대 안내
 *     · G1-4에서 AI 고지 두 문장이 통째로 빠짐 · blessMid 구 문안 · blessEndLong 누락
 *   원인은 하나다. **같은 사실을 두 곳이 각자 적고 있었다.**
 *
 * 그래서 규칙을 바꿨다:
 *   문안과 파일명의 단일 원천은 `더빙_녹음_대본_최종.md`(자동 생성) 하나다.
 *   시트는 그 대본에 없는 것 — 연출 노트·톤·무음 설계·리테이크 우선순위 — 만 들고 있는다.
 *   이 검사가 그 경계를 지킨다. 시트에 문안이 다시 기어들어오면 여기서 걸린다.
 *
 * 실행: node scripts/check-dub-sheet.js
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const SHEET = path.join(ROOT, 'docs/plans/식순연구/더빙_대본_시트.md');
const GEN = path.join(ROOT, 'docs/plans/식순연구/더빙_녹음_대본_최종.md');

let bad = 0;
const ok = m => console.log('ok  ' + m);
const fail = m => { console.log('FAIL ' + m); bad = 1; };

const sheet = fs.readFileSync(SHEET, 'utf8');
const gen = fs.readFileSync(GEN, 'utf8');

// ── 1. 자동 생성 대본에서 클립 목록을 읽는다 (`NN_slug.mp3`) ──────────────
// ★슬러그에 대문자가 섞인다(entry-A~F 6종). [a-z]로만 잡으면 입장 멘트 6개가 통째로 조용히 빠진다.
const genSlugs = [...gen.matchAll(/`(\d+)_([A-Za-z0-9-]+)\.mp3`/g)].map(m => ({ no: m[1], slug: m[2] }));
const boxes = (gen.match(/^- \[ \]/gm) || []).length;
if (genSlugs.length !== boxes) fail(`생성 대본 파싱 누락 — 체크박스 ${boxes}개인데 파일명은 ${genSlugs.length}개만 읽혔다`);
else ok(`생성 대본 클립 ${genSlugs.length}개 파싱 (체크박스 수와 일치)`);

const genSet = new Set(genSlugs.map(s => s.slug));

// ── 2. 시트가 언급하는 슬러그가 전부 생성 대본에 있나 ────────────────────
// 시트는 파일명을 백틱 코드로 적는다. 보류 클립만 예외로 둔다(폐기가 아니라 보류라 문서에는 남는다).
const HOLD = new Set(['declare-chorus']);   // G5-3 하객 합송 · 2026-07-26 보류
const sheetSlugs = new Set(
  [...sheet.matchAll(/`(?:assets\/audio\/)?(?:\d+_)?([A-Za-z0-9-]+)\.mp3`/g)].map(m => m[1])
);
const ghost = [...sheetSlugs].filter(s => !genSet.has(s) && !HOLD.has(s));
if (ghost.length) fail(`시트에만 있는 파일명 ${ghost.length}개 — 오타이거나 이름이 바뀐 것이다: ${ghost.join(', ')}`);
else ok('시트의 파일명이 전부 생성 대본에 존재 (보류 클립 제외)');

// ── 3. 시트가 대본의 문장을 다시 들고 있지 않나 ──────────────────────────
// ★문안만이 아니라 **연출 노트도** 대상이다. 생성 대본은 그룹별 note까지 함께 뽑아내므로,
//   시트가 톤·무음·리테이크를 다시 적으면 그것도 두 곳이 된다(2026-08-01 드리프트 8건 중 다수가 노트였다).
// ★verbatim 비교로는 부족하다. 실제로 갈라진 문장 하나는 `·`를 `—`로 바꿔 적은 것뿐이라 통과해 버렸다.
//   구두점·공백·강조기호를 다 걷어낸 뒤 비교한다.
const norm = s => s.replace(/[\s`*_"'·—–\-…,.!?()[\]{}~★]/g, '');
const normSheet = norm(sheet);
const genLines = gen.split(/\r?\n/)
  .filter(l => l.startsWith('> '))
  .map(l => l.slice(2).trim())
  .filter(l => norm(l).length > 24);       // 짧은 줄은 우연히 겹칠 수 있다
const dup = genLines.filter(q => normSheet.includes(norm(q)));
if (dup.length) {
  fail(`시트가 대본의 문장 ${dup.length}건을 다시 들고 있다 — 갈라지는 건 시간 문제다.`);
  dup.slice(0, 5).forEach(q => console.log('     · ' + q.slice(0, 70) + '…'));
  console.log('     고칠 방법: 그 문장을 시트에서 지운다. 남겨야 하는 내용이면');
  console.log('     scripts/build-dubbing-script.mjs의 해당 그룹 note로 옮기고 대본을 다시 뽑는다.');
} else ok('시트가 대본 문장을 중복해 들고 있지 않음 (단일 원천 유지)');

// ── 4. 총량 서술이 생성 대본과 같나 ──────────────────────────────────────
const gm = gen.match(/\*\*(\d+)클립 · ([\d,]+)음절 ≒ ([\d.]+)분\*\*/);
if (!gm) fail('생성 대본에서 총량 줄을 못 읽었다');
else {
  const [, clips, syl, min] = gm;
  ok(`생성 대본 총량: ${clips}클립 · ${syl}음절 ≒ ${min}분`);
  // 시트가 클립 수를 적는다면 같은 수여야 한다.
  const nums = [...sheet.matchAll(/(\d+)\s*클립|클립\s*\*\*(\d+)개/g)]
    .map(m => m[1] || m[2]).filter(n => +n > 30);   // 그룹별 소계(한 자리)는 제외
  const wrong = [...new Set(nums)].filter(n => n !== clips);
  if (wrong.length) fail(`시트의 총 클립 수가 다르다 — 시트 ${wrong.join('/')} vs 생성 ${clips}`);
  else ok('시트의 총 클립 수 서술이 생성 대본과 일치');
}

// ── 5. 시트가 생성 대본을 단일 원천으로 지목하고 있나 ────────────────────
if (!/더빙_녹음_대본_최종\.md/.test(sheet)) fail('시트가 자동 생성 대본을 가리키지 않는다 — 읽는 사람이 어디를 봐야 할지 모른다');
else ok('시트가 자동 생성 대본을 단일 원천으로 지목');

console.log(bad ? 'DUB SHEET DRIFT' : 'DUB SHEET OK');
process.exit(bad);
