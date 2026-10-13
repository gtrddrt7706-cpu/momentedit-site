#!/usr/bin/env node
/* ★★[NARR_WORDS_1013 2026-10-13 사장님 «대본 대사 전부 자료집 참고해서 최선으로 셋팅한 거야? 자연스럽게? · 예시도»]
   나레이션 «자연스러움»을 사람 눈이 아니라 자로 잰다 — 3단계 원고(docs/plans/식순연구/3단계_원고_1013.md)의 나레이션 줄은 이 자를 통과해야 한다.
   ★왜 만들었나 — 10/10 사장님이 짚은 줄(«편안히 머물러 주십시오» · 다과 · 착석)이 사흘 뒤에도 엔진에 그대로였고,
     «자연스럽게 셋팅했나»를 물으셨을 때 «몇 줄이 어디서 걸리는지» 숫자로 답할 길이 없었다. 규칙은 문서(G1 ~ G4 자문 · 지적 장부 · CLAP_FEW · NO_FOOD_TALK)에만 있었다.
   자(규칙) — 줄마다 걸린 규칙 이름을 찍는다
     W1 평가 · 감정 형용사(따뜻한 · 특별한 · 아름다운 …) — 나레이터가 하객의 감정을 대신 정하지 않는다(G1 · G2 · 10/10)
     W2 하객 통제어(귀를 기울여 · 조용히 함께 · 자리에 앉아 · 착석 · 모두 앞으로 나와 · 자리로 와 주) — 검토 8-2 · G1
     W3 자세 이야기(일어서 · 앉으셔도 · 서 계셔도 · 앉아 계시면) — 지적 3-2 «그걸 얘기 안 해도 된다»
     W4 음식 이야기(다과 · 디저트 · 핑거 · 간식) — NO_FOOD_TALK(10/10 사장님)
     W5 짐작(떨고 있 · 기다리고 있습니다 · 아마 · ~줄 것입니다 · 쑥스러워 · 못 한 말이 있습니다 · 오래 지켜본) — G4 · 검토 8-3 · 어떤 조합에서도 참
     W6 실시간인 척(지금 보니 · 저도 처음 · 보시다시피) — AI_VOICE_TENSE
     W7 박수를 청하는 말은 세 자리만(입장 · 성혼 선언 맺음 · 닫는 인사) — CLAP_FEW(9/26 사장님)
     W8 번역투(편안히 머물러) — 지적 1
     W9 이름(나레이션은 이름을 부르지 않는다) — 이서준 · 정하윤 · ○○
     W10 시간을 재는 말(잠시 후 · 잠시만 · 곧)은 한 줄에 한 번 — NARV ④ («잠시 진동 모드로»처럼 «동안»의 뜻은 세지 않는다)
     W11 전각 줄표 · 이모지 — 문구 규칙
     W12 부정형 허락(~실 것 없습니다 · ~필요는 없습니다) — 허용형으로(구글 자문 · 3-2 와 같은 꼴)
   쓰는 법
     node scripts/audit/narr-words.mjs            원고 나레이션 줄(2 · 3장 표의 «3단계 글» · «대안» 칸) — 하나라도 걸리면 빨강(merge-guard)
     node scripts/audit/narr-words.mjs --engine   지금 엔진이 새 코스에서 내는 줄 전부를 같은 자로 — 3단계를 엔진에 적용하기 전까지는 보고용(빨강이 정상)
     node scripts/audit/narr-words.mjs --selftest 깨 보기 — 규칙마다 걸려야 할 줄을 넣어 빨강이 되는지
   종료 코드 0 = 통과 · 1 = 실패 */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const DOC = process.env.NARR_DOC || path.join(ROOT, 'docs/plans/식순연구/3단계_원고_1013.md');   // NARR_DOC 로 다른 원고(시험용)를 잴 수 있다
const require = createRequire(import.meta.url);

const CLAP_OK = /^(entry-[A-F]|narr-declare-family-out|narr-close-bow)/;   // W7 박수를 청해도 되는 자리
const RULES = [
  ['W1', /따뜻한|따뜻하게|특별한|특별해|아름다운|아름답|감동적|소중한|훌륭|멋진|행복한 순간/],
  ['W2', /귀를 기울여|조용히 함께|조용히 해|자리에 앉아|자리를 잡아|착석|모두 앞으로 나와|자리로 와 주/],
  ['W3', /일어서|일어나 주|앉으셔도|서 계셔도|앉아 계시면|서서 보셔도/],
  ['W4', /다과|디저트|핑거|간식/],
  ['W5', /떨고 있|설레고 있|기다리고 있습니다|아마 |줄 것입니다|남을 것입니다|쑥스러워|못 한 말이 있습니다|오래 지켜본/],
  ['W6', /지금 보니|저도 (지금 )?처음|보시다시피|방금 보신/],
  ['W8', /편안히 머물러/],
  ['W9', /이서준|정하윤|○○/],
  ['W11', /—|[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u],
  ['W12', /(실|하실|서두르실) 것 없습니다|필요는 없습니다/],
];
const CLAP_ASK = /박수(를|로)?\s*(부탁|보내|주시|축복해|맞이해|맞아|반겨|열어|답해|청)/;
function judge(slug, text) {
  const hit = [];
  for (const [id, re] of RULES) if (re.test(text)) hit.push(id);
  if (CLAP_ASK.test(text) && !CLAP_OK.test(slug)) hit.push('W7');
  if ((text.match(/잠시 (후|뒤)|잠시만|잠시,|곧 /g) || []).length > 1) hit.push('W10');   // «휴대폰은 잠시 진동»의 «잠시»는 시간을 재는 말이 아니다
  return hit;
}

// ── 원고 읽기 — 2장(나레이션) · 3장(나레이션 예시) 표의 «3단계 글» · «대안» 칸 ──
function readDoc(src) {
  const rows = []; let h2 = '', cols = null;
  for (const line of src.split('\n')) {
    if (/^## /.test(line)) { h2 = line; cols = null; continue; }
    if (!/^## [23]\./.test(h2)) continue;
    if (!/^\|/.test(line)) { cols = null; continue; }
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (!cols) { cols = cells; continue; }
    if (cells.every((c) => /^:?-+:?$/.test(c))) continue;
    const ti = cols.indexOf('3단계 글'), ai = cols.indexOf('대안');
    if (ti < 0) continue;
    const slug = (cells[0].match(/[a-z][a-zA-Z0-9-]+/) || [''])[0];   // entry-A 처럼 끝이 대문자인 이름도
    for (const [i, tag] of [[ti, ''], [ai, '대안']]) {
      if (i < 0) continue;
      const t = (cells[i] || '').replace(/<br>/g, ' ').trim();
      if (!t || t === '—' || t === '-' || /^\(/.test(t)) continue;   // 빈칸 · 괄호로 시작하는 설명(«(없음)») 은 줄이 아니다
      rows.push({ slug, tag, text: t, where: cells[0] });
    }
  }
  return rows;
}

// ── 엔진 줄 모으기 — 새 코스(open) 조합을 돌려 slug 별 글을 모은다 ──
function engineLines() {
  const O = require(path.join(ROOT, 'assets/ritual-open.js'));
  const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
  const PICK = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'cake', 'toast', 'table'];
  const dims = { entry: ['A', 'B', 'C', 'D', 'E', 'F'], candleWho: ['mothers', 'fathers', 'parents', 'others'], letter: ['each', 'parent'], tributeSay: ['long', 'none'],
    freeWhat: ['speech', 'video', 'gift', 'etc'], vowFirst: ['g', 'b'], vowKind: ['vow', 'thanks'], guestEx: [0, 1, 2, 3], pvEx: [0, 1, 2, 3], photoShare: [0, 1, 'up', 'link'], digital: [0, 1], meal: [0, 1] };
  const seen = new Map();
  const run = (S) => { const r = C.build(C.norm ? C.norm(S) : S, { mode: 'console' }); const cues = Array.isArray(r) ? r : (r.cues || []);
    cues.forEach((c) => { [[c.text, ''], [c.alt && c.alt.text, '길었을 때']].forEach(([t, tag]) => { if (!t) return; const k = (c.slug || c.k) + '|' + t; if (!seen.has(k)) seen.set(k, { slug: c.slug || c.k, no: c.no || '', tag, text: t }); }); }); };
  const base = (on) => { const S = O.sampleS(); if (on) { S.on = {}; on.forEach((k) => { S.on[k] = 1; }); } return S; };
  for (const [k, vals] of Object.entries(dims)) for (const v of vals) { const S = base(); S[k] = v; run(S); }
  for (const k of PICK) { const S = base(); delete S.on[k]; run(S); run(base([k])); }
  O.EXAMPLES.forEach((ex) => run(O.applyExample(base(), ex.k)));
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 1500; i++) { const S = base(PICK.filter(() => rnd() < 0.5)); for (const [k, vals] of Object.entries(dims)) if (rnd() < 0.5) S[k] = vals[Math.floor(rnd() * vals.length)]; run(S); }
  return [...seen.values()].sort((a, b) => (+a.no || 999) - (+b.no || 999));
}

const arg = process.argv[2] || '';
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : '\n     ' + d}`); if (!c) fail++; };

if (arg === '--selftest') {
  const bad = [
    ['W1', 'bridge-b3-clap-thanks', '따뜻한 박수, 고맙습니다.'], ['W2', 'narr-song', '잠시, 음악에 귀를 기울여 주시기 바랍니다.'],
    ['W3', 'guest-4-1min-pre', '입장 때 따로 일어서실 것 없습니다.'], ['W4', 'guest-2-10min', '한쪽에 간단한 다과와 음료를 준비해 두었습니다.'],
    ['W5', 'guest-ex3-3-5min', '두 사람은 지금 문 뒤에서 조금 떨고 있답니다.'], ['W6', 'narr-free-in', '저도 지금 처음 봅니다.'],
    ['W7', 'narr-song-out', '노래로 전한 축하였습니다. 박수 부탁드립니다.'], ['W8', 'guest-1-arrival', '기다리시는 동안, 편안히 머물러 주십시오.'],
    ['W9', 'narr-welcome-in', '신랑 이서준이 인사드리겠습니다.'], ['W10', 'narr-x', '곧 시작합니다. 잠시 후 모시겠습니다.'],
    ['W11', 'narr-x', '두 사람 — 입장'], ['W12', 'toast-cake', '서두르실 것 없습니다.'],
  ];
  const miss = bad.filter(([id, slug, t]) => !judge(slug, t).includes(id)).map(([id]) => id);
  ok('[NARR_WORDS_1013] 깨 보기 — 규칙 열둘이 각자 걸려야 할 줄을 잡는다', miss.length === 0, '못 잡음 ' + miss.join(','));
  ok('[NARR_WORDS_1013] 깨 보기 — 박수 자리(입장 · 선언 맺음 · 닫는 인사)는 W7 이 아니다', !judge('entry-B', '큰 박수 부탁드립니다. 신랑 신부, 입장!').includes('W7') && !judge('narr-close-bow', '마지막 박수를 부탁드립니다.').includes('W7'));
  const doc = '## 2. 나레이션\n| 번호 · 자리 | 지금 | 3단계 글 | 근거 | 녹음 |\n|---|---|---|---|---|\n| 01 guest-1-arrival | x | 기다리시는 동안, 편안히 머물러 주십시오. | x | x |\n';
  ok('[NARR_WORDS_1013] 깨 보기 — 원고 표에 걸리는 줄을 넣으면 읽어서 잡는다', readDoc(doc).some((r) => judge(r.slug, r.text).includes('W8')));
  ok('[NARR_WORDS_1013] 깨 보기 — 표를 못 읽으면(0줄) 통과가 아니다', readDoc('## 2. 나레이션\n아무 표도 없음\n').length === 0);
  console.log(fail ? `\nNARR WORDS SELFTEST FAIL ${fail}` : '\nNARR WORDS SELFTEST OK'); process.exit(fail ? 1 : 0);
}

if (arg === '--engine') {
  const L = engineLines(); const bad = L.map((x) => ({ ...x, hit: judge(x.slug, x.text) })).filter((x) => x.hit.length);
  bad.forEach((x) => console.log(`  [${x.no}] ${x.slug}${x.tag ? ' (' + x.tag + ')' : ''} — ${x.hit.join(' · ')}\n       «${x.text}»`));
  console.log(`\n엔진(새 코스) 나레이션 ${L.length}줄 중 자에 걸린 줄 ${bad.length}`);
  process.exit(bad.length ? 1 : 0);
}

if (!fs.existsSync(DOC)) { ok('[NARR_WORDS_1013] 원고 파일이 있다', false, DOC); process.exit(1); }
const rows = readDoc(fs.readFileSync(DOC, 'utf8'));
ok(`[NARR_WORDS_1013] 원고 나레이션 줄을 읽었다(${rows.length}줄)`, rows.length >= 60, '표를 못 읽었다 — «3단계 글» 머리 칸 · 2 · 3장 제목을 확인');
const bad = rows.map((r) => ({ ...r, hit: judge(r.slug, r.text) })).filter((r) => r.hit.length);
ok('[NARR_WORDS_1013] 원고 나레이션 줄이 자연스러움 자(W1 ~ W12)를 모두 통과', bad.length === 0, bad.map((r) => `${r.where}${r.tag ? ' (' + r.tag + ')' : ''} — ${r.hit.join(' · ')} «${r.text}»`).join('\n     '));
console.log(fail ? `\nNARR WORDS FAIL ${fail}` : '\nNARR WORDS OK'); process.exit(fail ? 1 : 0);
