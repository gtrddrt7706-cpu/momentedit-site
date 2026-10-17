#!/usr/bin/env node
/* ★[NARR_LOOP_1018 2026-10-18 사장님 «나래이션 비어 있는 부분들 · 보강 부분들 · 개선할 부분들 점검하며 찾아보며 저쪽 섹션에 자료 요청하고
   그걸 받아 작업하고 검토하고 이런 작업을 반복해서 자동으로»] 자료 루프의 첫 단계 — 빈 곳을 같은 자로 센다.
     ① 나레이션 멘트 — 순간마다 고를 수 있는 멘트 수(지금 글 + 예시) · 4개가 안 되는 자리
        원천: ritual-open NAR_EX(화촉은 켜는 분마다) · NAR.guestEx · NAR.pvEx · ritual-data ENTRY
     ② 멘트를 고를 수 없는 자리 — 식순 순서(ORDER)에 있는데 예시가 하나도 없는 순간 + 단체 사진 · 온라인 하객 인사(고정 줄)
     ③ 두 분 글 참고 예시(ritual-ref) — 자리마다 예시 수 · 4개가 안 되는 자리
     ④ --docs <momentedit-docs 경로> — 자료집 «찾을 자료»의 열린 줄 · «찾음 · 아직 예시에 안 넣음» 묶음 ·
        공개 요청 파일(docs/handoff/insta-find.md)의 요청 번호와 나란히 — 빈 곳마다 요청이 있는지(없으면 «요청 없음»)
   보고만 한다(종료 코드 0). 원천을 못 읽으면 1.
   node scripts/audit/narr-gaps.mjs [--docs <path>] */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const argv = process.argv.slice(2);
const docsAt = argv.includes('--docs') ? argv[argv.indexOf('--docs') + 1] : '';
const WANT = 4;   // 자리마다 고를 수 있는 멘트 목표(EX_MANY_1017 «4개 정도»)

let O, D, REF;
try {
  O = require(path.join(ROOT, 'assets/ritual-open.js'));
  D = require(path.join(ROOT, 'assets/ritual-data.js'));
  globalThis.window = globalThis.window || {};
  require(path.join(ROOT, 'assets/ritual-ref.js'));
  REF = globalThis.window.RITUAL_REF;
} catch (e) { console.log('FAIL 원천을 못 읽었다 → ' + e.message); process.exit(1); }
if (!O.NAR_EX || !O.ORDER || !O.CARDS || !D.ENTRY || !D.NARR || !REF || !Array.isArray(REF.rows)) {
  console.log('FAIL 원천 모양이 바뀌었다(NAR_EX · ORDER · CARDS · ENTRY · NARR · RITUAL_REF.rows) — 이 도구를 같이 고친다'); process.exit(1);
}

const label = (k) => ({ guest: '하객 맞이', open: '개식', photo: '단체 사진', online: '온라인 하객 인사', speech: (O.CARDS.free || {}).n, close: (O.CARDS._close || {}).n }[k] || (O.CARDS[k] || {}).n || k);
// 자리 → 요청을 찾을 낱말(공개 요청 파일 · 찾을자료.md 와 맞춘다)
const WORD = { candle: '화촉', table: '테이블', toast: '축배', declare: '성혼 선언', letter: '편지', song: '축가', photo: '단체 사진', online: '온라인', welcome: '감사 인사', speech: '축사', free: '축사', vow: '서약', ring: '반지', bless: '덕담', tribute: '부모님께', matjeol: '맞절', open: '개식', close: '닫는', guest: '하객 맞이', prevideo: '식전 영상', entry: '입장' };

// ① 나레이션 멘트
const spots = [];
spots.push({ k: 'guest', n: 1 + (O.NAR.guestEx || []).length, how: '하객 맞이 넷 · 묶음' });
spots.push({ k: 'prevideo', n: 1 + (O.NAR.pvEx || []).length, how: '영상 앞 소개' });
spots.push({ k: 'entry', n: Object.keys(D.ENTRY).length, how: '입장 멘트' });
for (const k of O.narExKeys()) {
  const nm = O.NAR_EX[k].names;
  if (typeof nm === 'function') {
    for (const w of ['mothers', 'fathers', 'parents', 'others']) spots.push({ k, sub: w, n: nm({ candleWho: w }).filter(Boolean).length, how: { mothers: '어머님 두 분', fathers: '아버님 두 분', parents: '부모님', others: '다른 두 분' }[w] });
  } else spots.push({ k, n: nm.filter(Boolean).length, how: Object.keys(O.NAR_EX[k].lines).join(' · ') });
}
const hasPick = new Set(spots.map((s) => ({ speech: 'free', close: '_close' }[s.k] || s.k)));
// ② 고를 수 없는 자리 — 순서에 있는데 예시가 없는 순간(빠진 순간 · RETIRED 는 뺀다) + 고정 줄 자리 둘
const fixed = O.ORDER.filter((k) => !(O.RETIRED || {})[k] && !hasPick.has(k)).map((k) => ({ k, keys: { welcome: ['welcome'], song: ['song', 'songOut'] }[k] || [] }));
fixed.push({ k: 'photo', keys: ['finalWarn', 'finalCall', 'photoSplit', 'photoOut'] }, { k: 'online', keys: ['onlineIn'] });

console.log('NARR GAPS — 빈 곳 점검 [NARR_LOOP_1018] · 목표 자리마다 ' + WANT + '개');
console.log('\n① 나레이션 멘트 (지금 글 + 예시)');
const thin = [];
for (const s of spots) {
  const short = s.n < WANT; if (short) thin.push({ k: s.k, why: `멘트 ${s.n}개` + (s.sub ? `(${s.how})` : '') });
  console.log(`  ${short ? '모자람' : 'ok    '} ${label(s.k)}${s.sub ? ' · ' + s.how : ''} — ${s.n}개`);
}
console.log('\n② 멘트를 고를 수 없는 자리 (지금 글 하나뿐)');
for (const f of fixed) {
  const miss = f.keys.filter((x) => !D.NARR[x]);
  thin.push({ k: f.k, why: '고를 멘트 없음' });
  console.log(`  하나뿐 ${label(f.k)}` + (f.keys.length ? ` — 줄 ${f.keys.join(' · ')}` : '') + (miss.length ? ` · ★글 없음: ${miss.join(' ')}(원천 이름이 바뀌었다 · 이 도구를 같이 고친다)` : ''));
}
console.log('\n③ 두 분 글 참고 예시 (식순 화면 «참고 예시»)');
const by = {};
for (const r of REF.rows) (by[r.key] = by[r.key] || new Set()).add(r.n);
for (const [k, set] of Object.entries(by)) {
  const short = set.size < WANT; const base = k.split(':')[0];
  if (short && base !== 'declare') thin.push({ k: base, why: `참고 예시 ${set.size}개(${k})` });
  console.log(`  ${short ? (base === 'declare' ? '하나   ' : '모자람') : 'ok    '} ${k} — ${set.size}개` + (base === 'declare' && short ? ' (성혼 선언문은 한 글이 기본 · 읽는 분이 읽는다)' : ''));
}

if (docsAt) {
  const findP = path.join(docsAt, 'research/식순_참고자료/찾을자료.md');
  const reqP = path.join(ROOT, 'docs/handoff/insta-find.md');
  let find = '', req = '';
  try { find = fs.readFileSync(findP, 'utf8'); } catch (e) { console.log('\nFAIL 찾을자료.md 를 못 읽었다 → ' + findP); process.exit(1); }
  try { req = fs.readFileSync(reqP, 'utf8'); } catch (e) { console.log('\nFAIL 공개 요청 파일을 못 읽었다 → ' + reqP); process.exit(1); }
  const open = find.split('\n').filter((l) => /^- \[ \]/.test(l));
  const foundSecs = (find.match(/^## 찾음[^\n]*아직 예시에 안 넣음[^\n]*$/gm) || []);
  const foundItems = []; let inSec = false;
  // ★[GAPS_OPEN_ONLY_1018 라운드 10] «찾음» 묶음에서는 열린 줄(- [ ])만 센다 — 닫힌 줄([x]) · 메모 줄까지 낱말로 세면 «찾았는데 안 넣은 줄»이 부풀어 다음 판이 정한 것을 다시 연다
  for (const l of find.split('\n')) { if (/^## /.test(l)) inSec = /^## 찾음[^\n]*아직 예시에 안 넣음/.test(l); else if (inSec && /^- \[ \]/.test(l)) foundItems.push(l); }
  const reqs = req.split('\n').filter((l) => /^- \[R\d+\]/.test(l));
  console.log(`\n④ 자료집 · 요청 (docs ${path.basename(path.resolve(docsAt))})`);
  console.log(`  찾을자료.md 열린 줄 ${open.length} · «찾음 · 아직 예시에 안 넣음» ${foundSecs.length}묶음 ${foundItems.length}줄 · 공개 요청 ${reqs.length}개`);
  for (const r of reqs) console.log('  ' + r.slice(0, 90));
  console.log('\n  빈 곳 ↔ 요청');
  const seen = new Set();
  for (const t of thin) {
    if (seen.has(t.k + t.why)) continue; seen.add(t.k + t.why);
    const w = WORD[t.k] || label(t.k);
    const hit = reqs.filter((r) => r.includes(w)).map((r) => r.match(/\[R\d+\]/)[0]);
    const wait = foundItems.filter((l) => l.includes(w)).length;
    console.log(`  ${hit.length ? '요청 있음' : '요청 없음'} ${label(t.k)} — ${t.why}` + (hit.length ? ' · ' + hit.join(' ') : '') + (wait ? ` · 찾았는데 아직 안 넣은 줄 ${wait}` : ''));
  }
}
/* ★[ROUND_REASON_1018 라운드 10 · SOURCE_FIRST_1016] 라운드 기록 «보고 안 바꾼 것»의 까닭에 SOURCE_FIRST 로 걷힌 자(박수 자리 · 서술어 겹침)를 쓴 줄을 센다.
   라운드 9 가 «박수를 청한다(CLAP_FEW)» · «서술어 겹침(PRED_ECHO)»을 까닭으로 자료 글을 뺐다 — 사장님 10/16 «자료 멘트가 지난 결정보다 앞선다 · 박수 자리 수는 자료 멘트를 막는 근거가 아니다».
   남는 까닭은 ①이름 · 날짜 · 숫자 ②사회자 · 주례 ③우리 식순에 없는 순서 · 동선 ④현장 단정 · 틀린 날 · 같은 자리 둘 · 옛 초안 전용뿐 · 바로잡은 줄은 «바로잡음»을 적으면 세지 않는다 */
if (docsAt) {
  const dir = path.join(docsAt, 'research/식순_참고자료');
  let files = []; try { files = fs.readdirSync(dir).filter((f) => /^줄검토_라운드\d+_\d{4}\.md$/.test(f)).sort(); } catch (e) { /* 폴더 없음 */ }
  const BAD = /CLAP_FEW|박수 자리|박수를 청한|PRED_ECHO|서술어 겹침/;
  const hits = [];
  for (const f of files) { let sec = ''; for (const l of fs.readFileSync(path.join(dir, f), 'utf8').split('\n')) { if (/^## /.test(l)) sec = l; else if (/보고 안 바꾼/.test(sec) && /^\|/.test(l) && !/^\|\s*-/.test(l) && BAD.test(l) && !/바로잡음/.test(l)) hits.push(f + ' · ' + l.slice(0, 110)); } }
  console.log(`\n⑤ 라운드 기록 — «안 바꾼 까닭»에 걷힌 자(박수 자리 · 서술어 겹침)를 쓴 줄 ${hits.length} [ROUND_REASON_1018]` + (files.length ? ` · 기록 ${files.length}개` : ' · 기록 없음'));
  hits.forEach((h) => console.log('  FAIL ' + h));
  if (hits.length) process.exitCode = 1;
}
console.log(`\n빈 곳 ${thin.length}자리 — 다음 판: 찾았는데 안 넣은 것부터 넣고 · 요청 없는 자리는 공개 요청 파일에 더한다 · 개선 후보는 node scripts/audit/narr-words.mjs --engine`);
