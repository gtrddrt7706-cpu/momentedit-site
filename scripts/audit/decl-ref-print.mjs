#!/usr/bin/env node
// ★★[DECL_REF_PRINT 2026-10-23 검토 151-1 1)] 성혼 선언 낭독 카드 = 두 분이 ② 참고 예시에서 고른 선언문
//
//   node scripts/audit/decl-ref-print.mjs              # 0 = 통과 · 1 = 실패
//   node scripts/audit/decl-ref-print.mjs --selftest   # 일부러 깨 보고 빨강이 되는지
//
// 왜 — 카드에 인쇄되던 선언문(«신랑 신부는 양가 친지와 내빈 앞에서 새 출발을 합니다 …»)이 ② 참고 예시 셋(표 514) 어느 것과도 달랐다.
//   예시를 누르면 «선언문은 저희가 인쇄해 드려요»가 뜨는데 인쇄되는 글은 다른 글이었다. 이제 고른 예시(S.declRef = 표 번호)가 카드 · ④ 대본 글이다.
//
// 보는 것
//   ① 원천 DECLBY.nar · alt 가 참고 예시 표(assets/ritual-ref.js · declare 1 · 2 · 3)의 이름 뺀 꼴과 글자 하나 다르지 않다
//   ② 식순 화면(order-preview) — 안 고르면 예시 1 · 2 · 3 을 고르면 그 글 · 이름이 다 있으면 «신랑 ○○○ 군과 신부 ○○○ 양은» · 없으면 이름 없이
//      · 예시를 누르면 표 번호가 S.declRef 에 남는다(1 이면 지운다) · 분위기 정렬로 화면 차례가 바뀌어도 «지금 고른 것»이 같은 글
//   ③ 관리 화면(admin) 낭독 카드 — rd.S.declRef 를 읽어 같은 글 · 같은 이름 꼴
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const fnSrc = (src, name) => {   // «function name(» 부터 짝 맞는 닫는 괄호까지
  const i = src.indexOf('function ' + name + '('); if (i < 0) return '';
  let d = 0, j = src.indexOf('{', i);
  for (; j < src.length; j++) { const ch = src[j]; if (ch === '{') d++; else if (ch === '}') { d--; if (!d) return src.slice(i, j + 1); } }
  return '';
};

function judge(X) {
  const bad = [];
  // ①
  const ref = {}; new Function('window', X.ref)(ref);
  const rows = ((ref.RITUAL_REF || {}).rows || []).filter((r) => r.key === 'declare').sort((a, b) => a.n - b.n);
  const plain = (t) => String(t).replace(/신랑 이서준 군과 신부 정하윤 양은 /, '신랑 신부는 ');
  const want = rows.map((r) => plain(r.text));
  const have = [X.D.DECLBY.nar].concat(X.D.DECLBY.alt || []);
  if (rows.length !== 3) bad.push(`① 참고 예시 표 성혼 선언 줄이 ${rows.length}개(셋이어야)`);
  want.forEach((w, i) => { if (have[i] !== w) bad.push(`① 원천 선언문 ${i + 1} ≠ 참고 예시 ${i + 1}: «${String(have[i]).slice(0, 30)}…» / «${w.slice(0, 30)}…»`); });
  // ②
  const H = X.html;
  const need = ['_exNmOk', '_declTxt', '_declNar', '_refCur', '_declRefSave'];
  const code = need.map((n) => fnSrc(H, n)).join('\n');
  need.forEach((n) => { if (!fnSrc(H, n)) bad.push(`② 식순 화면에 ${n} 가 없다`); });
  const dm = /var DECLBY=\{[\s\S]*?\n\};/.exec(H);
  if (!dm) bad.push('② 식순 화면에 DECLBY 사본이 없다');
  if (!bad.length) {
    const sets = rows.map((r) => [{ n: r.n }]);
    const run = (S, CUST, setsOrder) => { const cx = { S, CUST, LS: {}, _persist() {}, _lRefSets: () => setsOrder || sets }; vm.createContext(cx); vm.runInContext(dm[0] + '\n' + code, cx); return cx; };
    const N = { groom: '김민준', bride: '이서연' };
    let c = run({}, N);
    if (c._declNar() !== want[0].replace(/^이제 신랑 신부는 /, '이제 신랑 김민준 군과 신부 이서연 양은 ')) bad.push(`② 안 고른 날 ④ 글이 예시 1(이름 넣은 꼴)이 아니다: ${c._declNar().slice(0, 40)}`);
    c = run({ declRef: 2 }, N);
    if (c._declNar() !== want[1].replace(/^신랑 신부는 /, '신랑 김민준 군과 신부 이서연 양은 ')) bad.push(`② 예시 2 를 고른 날 ④ 글이 예시 2 가 아니다: ${c._declNar().slice(0, 40)}`);
    c = run({ declRef: 3 }, N);
    if (c._declNar() !== want[2]) bad.push('② 예시 3 을 고른 날 ④ 글이 예시 3 이 아니다');
    c = run({}, { groom: '', bride: '이서연' });
    if (c._declNar() !== want[0]) bad.push('② 이름이 한 칸만 있는 날 이름 없이 쓰지 않는다');
    c = run({}, N); c._declRefSave('declare', 1);
    if (c.S.declRef !== 2) bad.push(`② 예시 2 를 누르면 S.declRef = 2 가 남아야 한다(지금 ${c.S.declRef})`);
    c._declRefSave('declare', 0);
    if ('declRef' in c.S) bad.push('② 예시 1 로 돌아오면 S.declRef 를 지워야 한다(옛 초안과 같은 꼴)');
    c._declRefSave('vow', 1);
    if ('declRef' in c.S) bad.push('② 다른 자리 예시를 누르면 S.declRef 가 바뀌면 안 된다');
    const mood = [sets[2], sets[0], sets[1]];   // 분위기 정렬로 화면 차례가 3 · 1 · 2
    c = run({ declRef: 2 }, N, mood);
    if (c._refCur('declare', mood) !== 2) bad.push(`② 화면 차례가 바뀌어도 «지금 고른 것»은 표 번호 2(화면 칸 3) — 지금 ${c._refCur('declare', mood)}`);
    c = run({}, N, mood);
    if (c._refCur('declare', mood) !== 1) bad.push('② 안 고른 날 «지금 고른 것»은 표 번호 1(화면 칸 2)');
    if (!/mkRefPick=function\(k,n,re\)\{.{0,120}_declRefSave\(k,n\)/.test(H)) bad.push('② 참고 예시 카드를 눌러도 S.declRef 를 남기지 않는다(mkRefPick)');
    if (!/lsRef=function\(k,n\)\{.{0,160}_declRefSave\(k,n\)/.test(H)) bad.push('② 듣기 화면 예시 번호를 바꿔도 S.declRef 를 남기지 않는다(lsRef)');
  }
  // ③
  const A = X.admin, card = fnSrc(A, '_declareCardDoc');
  if (!card) bad.push('③ 관리 화면에 _declareCardDoc 가 없다');
  else {
    const cx = { DECLBY: X.D.DECLBY, esc: (s) => String(s), _printNames: () => ({ ok: true, groom: '김민준', bride: '이서연' }) };
    vm.createContext(cx); vm.runInContext(card, cx); for (const f of ['_declWhoLabel', '_declWhoOf']) { const w = fnSrc(A, f); if (w) vm.runInContext(w, cx); }   /* [DECL_TITLE_1031] 카드 작은 줄이 읽는 분 호칭을 부른다 */
    const txt = (declRef) => cx._declareCardDoc({ code: 'T', mirror: { production: { ritualDraft: { S: declRef ? { declRef } : {} } } } }).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const nb = (s) => s.replace(/\s+/g, ' ');
    if (txt(0).indexOf(nb('이제 신랑 김민준 군과 신부 이서연 양은 오늘 함께해 주신 모든 분을')) < 0) bad.push('③ 낭독 카드(안 고름)가 예시 1 · 이름 꼴이 아니다');
    if (txt(2).indexOf('신랑 김민준 군과 신부 이서연 양은 이 자리에 모신') < 0) bad.push('③ 낭독 카드가 고른 예시 2 를 따르지 않는다');
    if (txt(3).indexOf('두 사람의 아름다운 약속에') < 0) bad.push('③ 낭독 카드가 고른 예시 3 을 따르지 않는다');
  }
  return bad;
}

const X = { D: require(path.join(ROOT, 'assets/ritual-data.js')), ref: read('assets/ritual-ref.js'), html: read('order-preview.html'), admin: read('admin.html') };

if (process.argv.includes('--selftest')) {
  const brk = [
    ['원천 예시 2 글을 한 글자 바꿈', (x) => ({ ...x, D: { ...x.D, DECLBY: { ...x.D.DECLBY, alt: [x.D.DECLBY.alt[0].replace('굳게', '굳건히'), x.D.DECLBY.alt[1]] } } })],
    ['관리 화면이 고른 예시를 안 읽음', (x) => ({ ...x, admin: x.admin.replace(/_dn=\+\(\(\(rd&&rd\.S\)\|\|\{\}\)\.declRef\)\|\|1/, '_dn=1') })],
    ['카드를 눌러도 저장 안 함', (x) => ({ ...x, html: x.html.replace('LS.ref[k]=n; _declRefSave(k,n); if(re&&', 'LS.ref[k]=n; if(re&&') })],
    ['이름 꼴을 옛 «두 사람은,»으로', (x) => ({ ...x, html: x.html.replace("'$1신랑 '+g+' 군과 신부 '+b+' 양은 '", "'$1신랑 '+g+', 신부 '+b+' 두 사람은, '") })],
  ];
  let miss = 0;
  for (const [nm, f] of brk) { const n = judge(f(X)).length; console.log(`${n ? 'ok  ' : 'FAIL'} 깨 보기 · ${nm} → 빨강 ${n}건`); if (!n) miss++; }
  const base = judge(X); console.log(`${base.length ? 'FAIL' : 'ok  '} 지금 원천은 초록(${base.length}건)${base.length ? ' · ' + base.join(' | ') : ''}`);
  process.exit(miss || base.length ? 1 : 0);
}
const bad = judge(X);
ok('성혼 선언 낭독 카드 = 고른 참고 예시(원천 · 식순 화면 · 관리 화면) [DECL_REF_PRINT]', !bad.length, bad.join(' | '));
process.exit(fail ? 1 : 0);
