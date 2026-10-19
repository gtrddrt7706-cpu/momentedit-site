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
     ★[NARR_REREAD_1013 2026-10-13 사장님 «우리 대사 한 줄씩 검토해 보고 개선할 것은 없는지»] 2판에서 더한 둘 — 1판이 자를 다 통과했는데도 한 줄씩 읽으니 걸린 것
     W13 한 줄 안에 같은 말 두 번(세 글자 이상 · 끝말 · 구호 «위하여»는 빼고) — 1판 «부모님께 … 부모님께» · «남기겠습니다 … 남기겠습니다» · «반지를 … 반지를»
     W14 축가 여는 말은 누가 불러도 참 — «두 사람을 위해»는 두 분이 직접 부르는 날 틀린 말([SONG_OPEN_ANYONE_1013] · 10/11 SONG_SELF_1011 «두 분이 직접 불러도 돼요» 뒤로 1판이 놓쳤다)
     ★★[SOURCE_FIRST_1016 2026-10-16 사장님 «정해 놨던 것들은 전부 무시하고 자료집에 있는 멘트들을 최우선시해»] 자료 그대로 넣은 문장(docs/plans/식순연구/자료그대로_1016.json)에는
       문체 자를 대지 않는다 — 이름(W9) · 현장 단정(W6) · 전각 줄표(W11)만 잰다. 한 줄에 우리 문장과 자료 문장이 섞이면 우리 문장만 문체 자로 잰다.
   쓰는 법
     node scripts/audit/narr-words.mjs            원고 나레이션 줄(2 · 3장 표의 «3단계 글» · «대안» 칸) — 하나라도 걸리면 빨강(merge-guard)
     node scripts/audit/narr-words.mjs --engine   지금 엔진이 새 코스에서 내는 줄 전부를 같은 자로 — ★10/14 부터 merge-guard 가 막는다(NARR_ENGINE_GATE_1014 · 녹음 대기 줄만 봐준다)
     node scripts/audit/narr-words.mjs --flow     예시 코스 넷을 처음부터 끝까지 엔진 글로 이어 찍는다(FLOW_NOW_1014 · 원고 칸이 다르면 한 줄 덧붙임)(보고용 · 늘 0) — 붙어 나오는 줄끼리 겹치는 말은 한 줄 자로는 안 보인다(1판 «준비하셨습니다 → 준비한 노래» · «인사드립니다 → 인사를 드리러»)
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
// [SOURCE_FIRST_1016] 자료 그대로 문장 — 문체 자(W1 ~ W5 · W7 · W8 · W10 · W12 ~ W14)를 대지 않는다 · 이름 · 현장 단정 · 줄표(ALWAYS)는 늘 잰다
const SRC_FILE = path.join(ROOT, 'docs/plans/식순연구/자료그대로_1016.json');
const srcNorm = (t) => String(t).replace(/[\s.,!?·«»"'“”‘’~…]/g, '');
const SRC = new Set((() => { try { return (JSON.parse(fs.readFileSync(SRC_FILE, 'utf8')).sents || []).map((x) => srcNorm(x.text)).filter(Boolean); } catch (e) { return []; } })());
const ALWAYS = new Set(['W6', 'W9', 'W11']);
function ownPart(text) { const ss = String(text).match(/[^.!?]+[.!?]*/g) || [String(text)]; return ss.filter((x) => !SRC.has(srcNorm(x))).join(' ').trim(); }
const CLAP_ASK = /박수(를|로)?\s*(부탁|보내|주시|축복해|맞이해|맞아|반겨|열어|답해|청)/;
// [NARR_REREAD_1013] W13 — 끝말(주세요 · 있습니다 …)과 구호(위하여) · 부르는 말(여러분 · 사람이 …)은 두 번 나와도 겹침이 아니다
const TWICE_OK = /^(위하여|주세요|주십시오|주시면|있습니다|드립니다|됩니다|좋습니다|하겠습니다|바랍니다|감사드립니다|감사하겠습니다|여러분|여러분께|사람이|사람의|사람을|사람과|사람에게)$/;   // [JUNCTION_MIXED_1018] «주시면»(…주시면 됩니다 · 감사하겠습니다)도 끝말
function twice(text) {
  const seen = new Set(), out = new Set();
  for (const t of text.replace(/[.,!?«»·()]/g, ' ').split(/\s+/)) { if ([...t].length < 3 || TWICE_OK.test(t)) continue; if (seen.has(t)) out.add(t); seen.add(t); }
  return [...out];
}
const SONG_OPEN = /^narr-song$/, SONG_FOR = /(사람|분)(을|를)?\s*위해|바치/;   // [SONG_OPEN_ANYONE_1013] W14
function judge(slug, text) {
  const hit = [], mine = ownPart(text);   // [SOURCE_FIRST_1016] 자료 그대로 문장은 문체 자 밖
  for (const [id, re] of RULES) if (re.test(ALWAYS.has(id) ? text : mine)) hit.push(id);
  if (CLAP_ASK.test(mine) && !CLAP_OK.test(slug)) hit.push('W7');
  if ((mine.match(/잠시 (후|뒤)|잠시만|잠시,|곧 /g) || []).length > 1) hit.push('W10');   // «휴대폰은 잠시 진동»의 «잠시»는 시간을 재는 말이 아니다
  if (twice(mine).length) hit.push('W13');
  if (SONG_OPEN.test(slug) && SONG_FOR.test(mine)) hit.push('W14');
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

// ── 새 코스(open) 조합을 돌려 콘솔 큐 목록마다 fn 을 부른다(엔진 줄 모으기 · 사슬 이음 재기가 같은 조합을 본다) ──
function forCombos(fn) {
  const O = require(path.join(ROOT, 'assets/ritual-open.js'));
  const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
  const PICK = ['prevideo', 'candle', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'song', 'letter', 'tribute', 'cake', 'toast', 'table'];
  const dims = { entry: ['A', 'B', 'C', 'D', 'E', 'F'], candleWho: ['mothers', 'fathers', 'others'], letter: ['each', 'parent'], tributeSay: ['long', 'none'],
    freeWhat: ['speech', 'video', 'gift', 'etc'], vowFirst: ['g', 'b'], vowKind: ['vow', 'thanks'], guestEx: [0, 1, 2, 3], pvEx: [0, 1, 2, 3], photoShare: [0, 1, 'up', 'link'], digital: [0, 1], meal: [0, 1] };
  const run = (S) => { const r = C.build(C.norm ? C.norm(S) : S, { mode: 'console' }); fn(Array.isArray(r) ? r : (r.cues || [])); };
  const base = (on) => { const S = O.sampleS(); if (on) { S.on = {}; on.forEach((k) => { S.on[k] = 1; }); } return S; };
  for (const [k, vals] of Object.entries(dims)) for (const v of vals) { const S = base(); S[k] = v; run(S); }
  for (const k of PICK) { const S = base(); delete S.on[k]; run(S); run(base([k])); }
  O.EXAMPLES.forEach((ex) => run(O.applyExample(base(), ex.k)));
  /* ★[EX_MANY_1017] 나레이션 멘트 예시 — 순간마다 예시 2 ~ 4 를 하나씩 골라 엔진 글을 모은다(서는 분 · 신부부터 · 서약 끈 날까지) · 예시 글도 같은 자로 잰다 */
  if (O.narExKeys) O.narExKeys().forEach((k) => Array.from({ length: (Array.isArray(O.NAR_EX[k].names) ? Math.max(3, O.NAR_EX[k].names.length - 1) : 3) }, (_, i) => i + 1).forEach((n) => [{}, { candleWho: 'fathers' }, { candleWho: 'others' }, { vowFirst: 'b' }, { noVow: 1 }].forEach((ex) => {
    const S = base(); Object.keys(ex).forEach((x) => { if (x !== 'noVow') S[x] = ex[x]; }); if (ex.noVow) delete S.on.vow; S.narEx = { [k]: n }; run(S); })));
  let seed = 7; const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
  for (let i = 0; i < 1500; i++) { const S = base(PICK.filter(() => rnd() < 0.5)); for (const [k, vals] of Object.entries(dims)) if (rnd() < 0.5) S[k] = vals[Math.floor(rnd() * vals.length)]; run(S); }
}
// ── 엔진 줄 모으기 — slug 별 글 ──
function engineLines() {
  const seen = new Map();
  forCombos((cues) => cues.forEach((c) => { [[c.text, ''], [c.alt && c.alt.text, '길었을 때']].forEach(([t, tag]) => { if (!t) return; const k = (c.slug || c.k) + '|' + t; if (!seen.has(k)) seen.set(k, { slug: c.slug || c.k, no: c.no || '', tag, text: t }); }); }));
  return [...seen.values()].sort((a, b) => (+a.no || 999) - (+b.no || 999));
}
/* ★[CHAIN_ECHO_1015 라운드 4] 사슬 이음 — 사람 구간이 없는 앞 줄 바로 뒤에 사슬(chain)로 붙는 줄은 한 호흡으로 들린다.
   이음매(앞 줄 끝 두 문장 + 뒤 줄 첫 두 문장 · 10초 안팎)에서 같은 말(W13)이 나오면 빨강 — 한 줄 자로는 안 보인다(10/14 라운드 4: 개식 137 «오늘은» → 3초 뒤 화촉 «… 오늘은 먼저 앞에 서십니다»).
   이음매 밖의 되풀이(예: 사진 보내기 85 → 감사 인사 45 의 다섯째 문장 «받으신 안내 페이지»)는 기능 이름을 같게 부르는 것이라 재지 않는다 */
const sents = (t) => (String(t).match(/[^.!?]+[.!?]+/g) || [String(t)]).map((x) => x.trim()).filter(Boolean);
const head2 = (t) => sents(t).slice(0, 2).join(' '), tail2 = (t) => sents(t).slice(-2).join(' ');
/* ★[JUNCTION_MIXED_1018 라운드 10] 이음매는 실제 끝 두 문장 · 첫 두 문장으로 잰다 — 자료 글끼리 겹치면 봐주고(SOURCE_FIRST_1016 · 고칠 수 없는 글) · 우리 글이 한쪽이라도 끼면 잰다(고칠 쪽은 우리 글).
   옛 판은 자료 글을 양쪽에서 통째로 빼 «자료 글 → 우리 글» 이음매를 못 봤다(10/18 라운드 10 · 56 축배 맺는 말(AA 41) → 131 테이블 인사(우리 글) «주시면 … 주시면» · 끝말이라 TWICE_OK) */
const jWords = (arr) => { const m = new Map(); arr.forEach((x) => { const own = !SRC.has(srcNorm(x)); x.replace(/[.,!?«»·()]/g, ' ').split(/\s+/).forEach((t) => { if ([...t].length < 3 || TWICE_OK.test(t)) return; const o = m.get(t) || { n: 0, own: false }; o.n++; o.own = o.own || own; m.set(t, o); }); }); return m; };
function junction(a, b) { const mA = jWords(sents(a).slice(-2)), mB = jWords(sents(b).slice(0, 2)), out = []; for (const [w, oa] of mA) { const ob = mB.get(w); if (ob && oa.n === 1 && ob.n === 1 && (oa.own || ob.own)) out.push(w); } return out; }
function chainEchoes() {
  const out = new Map();
  forCombos((cues) => { for (let i = 1; i < cues.length; i++) { const a = cues[i - 1], b = cues[i]; if (b.fire !== 'chain' || a.live || !a.text || !b.text) continue;
    const hit = junction(a.text, b.text); if (!hit.length) continue; const k = a.slug + '>' + b.slug + '|' + hit.join(','); if (!out.has(k)) out.set(k, { a: (a.no || '') + ' ' + a.slug, b: (b.no || '') + ' ' + b.slug, hit, at: tail2(a.text), bt: head2(b.text) }); } });
  return [...out.values()];
}

/* ★[BRIDGE_NO_ECHO_1014 라운드 3] 미리 듣기 이음말(order-preview TALK_BRIDGE)은 바로 앞 여는 말에 이어 들린다 — 둘을 한 줄로 이어 W13(같은 말 두 번)을 잰다.
   10/14 라운드 3 에 여덟이 여는 말의 낱말(서로에게 · 분께서 · 덕담을 · 축가를 · 부모님께 · 인사를)을 되풀이하고 있었다 · 이음말을 못 읽으면 빨강(통과가 아니다) */
function bridgePairs() {
  const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js'));
  const m = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8').match(/var TALK_BRIDGE=(\{[\s\S]*?\});/);
  if (!m) return null;
  const TB = Function('return ' + m[1])();
  /* ★[BRIDGE_NEXT_1015 라운드 4] 이음말 바로 뒤 줄(같은 순간의 다음 큐 · 첫 두 문장)과도 잰다 — 라운드 4: 부모님께 인사 이음말 «… 부모님께 직접 마음을 전하는 …» 뒤 145 «그 마음을 담아, … 양가 부모님께 인사!» ·
     판마다(식전 영상 소개 넷 · 준비한 순서 영상 · 선물 · 기타 · 말로 인사 둘) — 라운드 3 정리에서 식전 영상 이음말이 빠진 까닭이 이 목록이었다 */
  const V = [['welcome', {}], ['vow', {}], ['vow.thanks', { vowKind: 'thanks' }], ['declare', {}], ['bless', {}], ['free.speech', { freeWhat: 'speech' }], ['free', { freeWhat: 'video' }], ['free', { freeWhat: 'gift' }], ['free', { freeWhat: 'etc' }],
    ['song', {}], ['letter', { letter: 'each' }], ['letter.parent', { letter: 'parent' }], ['toast', {}], ['tribute', { tributeSay: 'long' }], ['tribute', { tributeSay: 'short' }],
    ['prevideo', { pvEx: 0 }], ['prevideo', { pvEx: 1 }], ['prevideo', { pvEx: 2 }], ['prevideo', { pvEx: 3 }]];
  const out = [];
  for (const [key, ex] of V) { const k = key.split('.')[0], br = TB[key]; if (!br) continue;
    const S = O.sampleS(); S.on = Object.assign({}, S.on, { [k]: 1 }); Object.assign(S, ex);
    const cs = C.build(S, { mode: 'preview' }).cues.filter((c) => c.k === k), li = cs.findIndex((c) => c.live), lv = cs[li], nx = li > -1 ? cs[li + 1] : null;
    if (lv) out.push({ key: key + (Object.keys(ex).length ? ' ' + JSON.stringify(ex) : ''), nar: lv.text, br, nx: nx ? head2(nx.text) : '', hit: [...new Set([...twice(ownPart(lv.text) + ' ' + br), ...(nx ? junction(br, nx.text) : [])])] }); }   /* [SOURCE_FIRST_1016] */
  return out;
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
    ['W13', 'letter-parent', '두 사람이 부모님께 쓴 편지가 있습니다. 두 분, 부모님께 전해 주세요.'], ['W14', 'narr-song', '두 사람을 위해 준비한 노래가 있습니다.'],
  ];
  const miss = bad.filter(([id, slug, t]) => !judge(slug, t).includes(id)).map(([id]) => id);
  ok('[NARR_WORDS_1013] 깨 보기 — 규칙 열넷이 각자 걸려야 할 줄을 잡는다', miss.length === 0, '못 잡음 ' + miss.join(','));
  ok('[NARR_WORDS_1013] 깨 보기 — 박수 자리(입장 · 선언 맺음 · 닫는 인사)는 W7 이 아니다', !judge('entry-B', '큰 박수 부탁드립니다. 신랑 신부, 입장!').includes('W7') && !judge('narr-close-bow', '마지막 박수를 부탁드립니다.').includes('W7'));
  ok('[NARR_REREAD_1013] 깨 보기 — 구호 «위하여» · 끝말 · 두 글자 말은 W13 이 아니다', !judge('toast-toast', '두 분이 위하여, 하시면 함께 위하여, 하고 답해 주세요.').includes('W13') && !judge('end-1c-thanks-nomeal', '가족분들께서는, 잠시 남아 주십시오. 다른 분들도, 함께 남아 주십시오.').includes('W13'));
  ok('[SONG_OPEN_ANYONE_1013] 깨 보기 — W14 는 축가 여는 말에만(다른 자리의 «위해»는 걸지 않는다)', !judge('narr-free-in-gift', '오늘을 위해 마음을 담아 준비한 선물이 있습니다.').includes('W14'));
  ok('[CHAIN_ECHO_1015] 깨 보기 — 옛 개식 «오늘은 …» 3초 뒤 화촉 «늘 … 오늘은 …»은 이음매에서 잡힌다', junction('신랑 신부와 양가를 대신해, 와 주신 여러분께 감사드립니다. 오늘은 이 자리에 계신 모든 분이, 두 사람의 약속을 지켜보는 증인입니다. 지금부터, 예식을 시작하겠습니다.', '늘 두 사람의 뒤에 계셨던 분들이, 오늘은 먼저 앞에 서십니다. 양가 어머님께서, 두 사람이 걸어갈 길을 밝혀 주시겠습니다.').includes('오늘은'));
  ok('[CHAIN_ECHO_1015] 깨 보기 — 이음매 밖(앞 줄 첫 문장)의 같은 말은 재지 않는다', junction('신랑 신부와 양가를 대신해, 와 주신 여러분께 감사드립니다. 이 자리에 계신 모든 분이, 두 사람의 약속을 지켜보는 증인입니다. 지금부터, 예식을 시작하겠습니다.', '양가를 대표하는 두 분께서, 두 사람이 걸어갈 길을 밝혀 주시겠습니다.').length === 0);
  { const a = '하객 한 분 한 분이 결혼식의 증인입니다.', b = '오늘 결혼식의 주인공은 두 사람입니다.', hadA = SRC.has(srcNorm(a)), hadB = SRC.has(srcNorm(b)); SRC.add(srcNorm(a));
    ok('[JUNCTION_MIXED_1018] 깨 보기 — 앞 줄이 자료 글이어도 뒤 우리 글과 겹치면 이음매에서 잡힌다(«결혼식의»)', junction(a, b).includes('결혼식의'));
    SRC.add(srcNorm(b)); ok('[JUNCTION_MIXED_1018] 깨 보기 — 양쪽 다 자료 글이면 봐준다(고칠 수 없는 글)', junction(a, b).length === 0);
    if (!hadA) SRC.delete(srcNorm(a)); if (!hadB) SRC.delete(srcNorm(b));
    ok('[JUNCTION_MIXED_1018] 깨 보기 — 끝말 «주시면»은 이음매 겹침이 아니다(56 → 131)', junction('즐겨 주시면 되겠습니다.', '두 사람이 여러분께 직접 인사를 드리러 갑니다. 자리에서 편히 맞아 주시면 됩니다.').length === 0); }
  ok('[BRIDGE_NEXT_1015] 깨 보기 — 옛 부모님께 인사 이음말은 뒤 줄 145 와 이어 W13', junction('두 분이 부모님께 직접 마음을 전하는 시간입니다.', '그 마음을 담아, 신랑 신부, 양가 부모님께 인사!').length > 0);
  ok('[BRIDGE_NO_ECHO_1014] 깨 보기 — 옛 감사 인사 이음말은 여는 말과 이어 W13(«인사를»)', twice('신랑 신부가 하객 여러분께, 감사 인사를 직접 드리겠습니다. 두 분이 하객께 직접 감사 인사를 드리는 시간입니다.').includes('인사를'));
  { const t = '하객 여러분께서는 자리에 착석해 주시길 바랍니다.', had = SRC.has(srcNorm(t)); SRC.add(srcNorm(t));
    ok('[SOURCE_FIRST_1016] 깨 보기 — 자료 그대로 문장은 문체 자(W2 통제어)에 걸리지 않는다', !judge('guest-1-arrival', t).includes('W2'));
    ok('[SOURCE_FIRST_1016] 깨 보기 — 같은 줄에 붙은 우리 문장은 그대로 잰다', judge('guest-1-arrival', t + ' 기다리시는 동안, 편안히 머물러 주십시오.').includes('W8'));
    const n = '신랑 이서준 군과 신부 정하윤 양의 결혼식을 시작하겠습니다.'; SRC.add(srcNorm(n));
    ok('[SOURCE_FIRST_1016] 깨 보기 — 자료 그대로여도 이름(W9)은 늘 잰다', judge('narr-open', n).includes('W9'));
    if (!had) SRC.delete(srcNorm(t)); SRC.delete(srcNorm(n)); }
  const doc = '## 2. 나레이션\n| 번호 · 자리 | 지금 | 3단계 글 | 근거 | 녹음 |\n|---|---|---|---|---|\n| 01 guest-1-arrival | x | 기다리시는 동안, 편안히 머물러 주십시오. | x | x |\n';
  ok('[NARR_WORDS_1013] 깨 보기 — 원고 표에 걸리는 줄을 넣으면 읽어서 잡는다', readDoc(doc).some((r) => judge(r.slug, r.text).includes('W8')));
  ok('[NARR_WORDS_1013] 깨 보기 — 표를 못 읽으면(0줄) 통과가 아니다', readDoc('## 2. 나레이션\n아무 표도 없음\n').length === 0);
  console.log(fail ? `\nNARR WORDS SELFTEST FAIL ${fail}` : '\nNARR WORDS SELFTEST OK'); process.exit(fail ? 1 : 0);
}

if (arg === '--engine') {
  /* ★★[NARR_ENGINE_GATE_1014] 3단계 원고를 엔진에 옮겼다(PR B) — 이제 엔진 줄도 자로 막는다(merge-guard).
     봐주는 것은 하나 — «녹음 대기»: 원고에 고친 글이 있고(그 글은 자를 통과) 엔진 글에 없는 그 문장이 전부 녹음 목록(docs/plans/식순연구/타입캐스트_<n>판_*.txt)에 맡겨진 줄.
     녹음이 오면 엔진에 들어가 이 목록에서 사라진다 · 목록에도 원고에도 없는 걸린 줄은 빨강(새로 쓴 엔진 줄이 자를 건너뛰지 못하게) */
  const L = engineLines(); const bad = L.map((x) => ({ ...x, hit: judge(x.slug, x.text) })).filter((x) => x.hit.length);
  const PLAN = path.dirname(DOC), nm = (t) => String(t).replace(/[\s.,!?·«»~_]/g, '');
  const wait = new Set(); if (fs.existsSync(PLAN)) for (const f of fs.readdirSync(PLAN).filter((x) => /^타입캐스트_\d+판_.+\.txt$/.test(x))) for (const l of fs.readFileSync(path.join(PLAN, f), 'utf8').split('\n')) { const m = l.match(/^[^:]+:\s*(.+)$/); if (m) wait.add(nm(m[1])); }
  // 이미 받은 낱개 소리(창고 · 3단계 녹음) — 기다리는 문장과 함께 들어갈 줄의 나머지 문장
  const have = new Set(); for (const f of ['assets/audio/_src/_index.json', 'assets/audio/narration-draft/rev1013/src/_index.json']) { try { const j = JSON.parse(fs.readFileSync(path.join(ROOT, f), 'utf8')); Object.values(j.slots || j).forEach((v) => { if (v && v.text) have.add(nm(v.text)); }); } catch {} }
  const doc = fs.existsSync(DOC) ? readDoc(fs.readFileSync(DOC, 'utf8')) : [];
  const sents = (t) => (String(t).match(/[^.!?]+[.!?]/g) || []).map((x) => x.trim());
  const pend = (x) => doc.some((r) => { if (r.slug !== x.slug || r.tag || judge(r.slug, r.text).length) return false;
    const miss = sents(r.text).filter((s) => !nm(x.text).includes(nm(s)));
    return miss.some((s) => wait.has(nm(s))) && miss.every((s) => wait.has(nm(s)) || have.has(nm(s))); });
  const waitL = bad.filter(pend), red = bad.filter((x) => !pend(x));
  red.forEach((x) => console.log(`  [${x.no}] ${x.slug}${x.tag ? ' (' + x.tag + ')' : ''} — ${x.hit.join(' · ')}\n       «${x.text}»`));
  waitL.forEach((x) => console.log(`  … 녹음 대기 [${x.no}] ${x.slug} — ${x.hit.join(' · ')} (원고 글은 자 통과 · 새 문장은 녹음 목록에 있다)`));
  const bp = bridgePairs(), bpRed = (bp || []).filter((x) => x.hit.length);
  bpRed.forEach((x) => console.log(`  [이음말 ${x.key}] W13 ${x.hit.join(' · ')}\n       «${x.nar}» → «${x.br}»${x.nx ? ' → «' + x.nx + '»' : ''}`));
  const ce = chainEchoes();
  ce.forEach((x) => console.log(`  [사슬 이음 ${x.a} → ${x.b}] W13 ${x.hit.join(' · ')}\n       «${x.at}» → «${x.bt}»`));
  console.log(`\n엔진(새 코스) 나레이션 ${L.length}줄 중 자에 걸린 줄 ${red.length}${waitL.length ? ' · 녹음 대기 ' + waitL.length : ''} · 이음말 ${bp ? bp.length : '못 읽음'}개 중 앞뒤 줄과 겹침 ${bpRed.length} [BRIDGE_NO_ECHO_1014 · BRIDGE_NEXT_1015] · 사슬 이음 겹침 ${ce.length} [CHAIN_ECHO_1015]`);
  process.exit(red.length || !bp || !bp.length || bpRed.length || ce.length ? 1 : 0);
}

if (arg === '--flow') {
  // [NARR_REREAD_1013] 예시 넷을 원고 글로 이어 찍는다 — 엔진 글 대신 원고의 «3단계 글»(길었을 때 · 대안 칸 빼고) · 원고에 없는 줄은 엔진 글 그대로(«엔진»)
  if (!fs.existsSync(DOC)) { console.log('원고 파일이 없다 ' + DOC); process.exit(1); }
  const O = require(path.join(ROOT, 'assets/ritual-open.js'));
  const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
  const by = new Map();
  readDoc(fs.readFileSync(DOC, 'utf8')).forEach((r) => { if (!r.tag && !/길었을 때/.test(r.where) && !by.has(r.slug)) by.set(r.slug, r.text); });
  O.EXAMPLES.forEach((ex) => {
    const S = O.applyExample(O.sampleS(), ex.k); const r = C.build(C.norm ? C.norm(S) : S, { mode: 'console' }); const cues = Array.isArray(r) ? r : (r.cues || []);
    console.log(`\n── ${ex.nm || ex.k} (${ex.k}) · ${cues.length}줄`);
    /* ★[FLOW_NOW_1014 라운드 3] 엔진 글(실제 나가는 글)을 이어 찍는다 — 원고가 엔진에 다 들어간 뒤(PR B · B2)로 «3단계 글» 칸은 플레이 03 녹음 조각과 짝인 옛 글이라,
       그 칸을 찍으면 실제 소리 차례와 다른 글이 이어졌다(라운드 3 G1 · G2 · G5) · 원고 칸이 다르면 아래에 한 줄로 */
    /* ★[FLOW_LIVE_1018 라운드 9] 사람 구간(낭독 · 상영 · 자유 사진 …)을 그 줄 아래에 한 줄로 — 줄만 이어 찍으면 붙어 들리는 줄처럼 보인다.
       라운드 9 에 65 «오늘 함께해 주신 …» → 47 «오늘의 시작을 함께해 주신 …»을 겹침으로 읽었는데 사이에 자유 사진(약 2분)이 있었다 ·
       CHAIN_ECHO 도 사람 구간 뒤 이음매는 재지 않는다 · 검토 판(narr-now)을 읽는 인스타 섹션도 같은 판을 본다 */
    const liveLine = (c) => { if (!c.live || !c.live.t) return ''; const sec = +c.live.est || 0; return `\n       [사람 구간${sec >= 60 ? ' · 약 ' + Math.round(sec / 60) + '분' : sec > 0 ? ' · ' + sec + '초' : ''}] ${c.live.t}`; };
    cues.forEach((c) => { const s = c.slug || c.k || ''; const t = by.get(s); console.log(`  [${c.no || '-'}] ${s}\n       ${c.text || '(소리 없음)'}${t && c.text && t !== c.text ? '\n       (원고 3단계 글 · 플레이 03: ' + t + ')' : ''}${liveLine(c)}`); });
  });
  process.exit(0);
}

if (!fs.existsSync(DOC)) { ok('[NARR_WORDS_1013] 원고 파일이 있다', false, DOC); process.exit(1); }
const rows = readDoc(fs.readFileSync(DOC, 'utf8'));
ok(`[NARR_WORDS_1013] 원고 나레이션 줄을 읽었다(${rows.length}줄)`, rows.length >= 60, '표를 못 읽었다 — «3단계 글» 머리 칸 · 2 · 3장 제목을 확인');
const bad = rows.map((r) => ({ ...r, hit: judge(r.slug, r.text) })).filter((r) => r.hit.length);
ok('[NARR_WORDS_1013] 원고 나레이션 줄이 자연스러움 자(W1 ~ W14)를 모두 통과', bad.length === 0, bad.map((r) => `${r.where}${r.tag ? ' (' + r.tag + ')' : ''} — ${r.hit.join(' · ')} «${r.text}»`).join('\n     '));
console.log(fail ? `\nNARR WORDS FAIL ${fail}` : '\nNARR WORDS OK'); process.exit(fail ? 1 : 0);
