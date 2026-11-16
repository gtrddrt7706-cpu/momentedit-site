#!/usr/bin/env node
/* ★★[EX_MANY_1017 2026-10-17 사장님 «우리 시스템에 예시가 하나밖에 없으면 늘려서 더 좋은 예시를 고를 수 있게 하자 · 4개 정도 · 자료집에서 좋은 멘트들 붙여서 · 저 섹션 말고도 예시가 없는 곳 찾아보고 개선»]
   나레이션 멘트 예시(ritual-open NAR_EX · 15 순간 · 소리 59줄 148 ~ 208(쉬는 소리 201 · 190 둘 · RETIRED · [R11_SRC_1018]) · 191 ~ 196 = 자료 T3 [T3_OK_1017] · 197 ~ 200 = 자료 루프 첫 판 [NARR_LOOP_1018] · 201 ~ 203 = 라운드 9 [NARR_R9_1018] · 204 ~ 206 = 라운드 10 [R10_SRC_1018] · 207 · 208 = 인스타 섹션 검토 [REVIEW1_1018])를 잰다 — 엔진 · 번호 · 자료 · 화면 · 녹음 대본.
     ① 소리 번호 — 예시 소리마다 FILES 에 있고 147 뒤(맨 끝에 붙였다 · 앞 번호를 밀지 않는다) · EXTRA 글 = 원천 글 · 같은 글은 한 소리
     ② 이름표 — «~하게» 한 낱말(격식 있게 포함 · EX_NAME_HAGE) · 한 순간 안에서 겹치지 않는다
     ③ 엔진 — 고르면 그 줄 소리 · 번호 · 글이 예시로(줄 slug 는 그대로 · c.ex) · 안 고르면 예시 소리가 한 줄도 없다
     ④ 맞는 날(when) — 편지 «약속을 대신»은 서약 없는 날만 · 인사 4 는 선언 바로 뒤가 아닌 날만 · 서약 예시는 감사문 날 없음 · 축사 예시는 축사 날만 · 덕담은 옛 가족 코스 없음
     ⑤ 저장 값 — norm 이 범위 밖 · 모르는 순간만 지운다(맞는 날이 아니어도 고른 값은 남는다)
     ⑥ 자료 그대로 — 예시 문장마다 자료그대로_1016.json(출처) · 아니면 예시 1(지금 글)의 문장 · 서는 분 부르는 한 마디뿐(지어낸 문장 0)
     ⑦ 화면 — 순간 쪽 «○○ 멘트» 줄(_exRows · 안내 멘트와 같은 줄) · mkNarEx 가 저장한다 · 옛 길(_lGroups L('narEx:'))은 없다
     ⑧ 녹음 대본 — 타입캐스트 manifest 에 예시 소리마다 같은 글 · 7_예시_멘트 파트
   node scripts/audit/nar-ex.mjs [--selftest]   (--selftest = 깨 보기 셋이 빨강인지) */
import fs from 'node:fs'; import path from 'node:path'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.NX_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

function run(mut) {
  for (const k of Object.keys(require.cache)) if (k.startsWith(ROOT)) delete require.cache[k];
  const O = require(path.join(ROOT, 'assets/ritual-open.js'));
  if (mut === 'text') { const L = O.NAR_EX.ring.lines['narr-ring-in']; L[0] = '오늘 우리는 정말 행복한 날입니다. ' + L[0]; }   // [REVIEW29_1023] 글 첫머리에 붙인다(169 가 «먼저 신랑님께서 …»로 바뀌어 «다음은»이 없다 · 바꿀 낱말에 기대지 않는다)
  if (mut === 'cue') O.narExCue = () => '';
  const C = require(path.join(ROOT, 'assets/ritual-cue.js'));
  if (mut === 'files') C.FILES.splice(C.FILES.indexOf('narr-table-in-ex3'), 1);   // [R11_SRC_1018] 190(narr-table-in-ex2)은 쉬는 소리라 203 을 뺀다
  const D = require(path.join(ROOT, 'assets/ritual-data.js'));
  let f0 = fail; const R = [];
  const T = (m, c, d) => { R.push([m, c, d]); };
  if (!O.NAR_EX || !O.narExClips) { T('[EX_MANY_1017] ritual-open 에 NAR_EX · narExClips 가 있다', false, '없다'); return R; }
  const clips = O.narExClips(), FILES = C.FILES;
  // ① 번호
  const first = FILES.indexOf('narr-candle-bow-others');
  const BASE_SWAP = { 'narr-candle-in-mothers-ex2': 91, 'narr-entry-bow-ex2': 132 };
  T(`① 예시 소리 ${clips.length}줄이 모두 FILES 에 · 147(narr-candle-bow-others) 뒤에 붙었다`, clips.length >= 40 && clips.every((x) => FILES.indexOf(x.slug) > first || BASE_SWAP[x.slug] === FILES.indexOf(x.slug) + 1) && first === 146, clips.filter((x) => FILES.indexOf(x.slug) <= first && BASE_SWAP[x.slug] !== FILES.indexOf(x.slug) + 1).map((x) => x.slug).join(' '));   /* ★[BASE_SWAP_1023 검토 156] 기본과 자리를 맞바꾼 예시 2 둘은 옛 기본 번호(91 · 132)를 글과 함께 쓴다 */
  const LIVE_EX = (f) => /-ex\d$/.test(f) && !/^guest-ex|^narr-prevideo-in-ex/.test(f) && !(C.RETIRED && C.RETIRED[f]);   // ★[R11_SRC_1018 라운드 11] 쉬는 소리(RETIRED · 번호 보존 · 기본 글과 같은 글이 된 예시)는 원천에 글이 없어도 된다
  T('① FILES 의 «-exN» 예시 소리(하객 맞이 · 식전 영상 소개 · 쉬는 소리 밖)는 모두 원천(NAR_EX)에 글이 있다', FILES.filter(LIVE_EX).every((f) => clips.some((x) => x.slug === f)), FILES.filter((f) => LIVE_EX(f) && !clips.some((x) => x.slug === f)).join(' '));
  T('① 쉬는 예시 소리는 원천(NAR_EX)에서도 안 나간다 [R11_SRC_1018]', FILES.filter((f) => /-ex\d$/.test(f) && C.RETIRED && C.RETIRED[f]).every((f) => !clips.some((x) => x.slug === f)), FILES.filter((f) => /-ex\d$/.test(f) && C.RETIRED && C.RETIRED[f] && clips.some((x) => x.slug === f)).join(' '));
  T('① EXTRA 글 = 원천 글(손으로 옮겨 적지 않는다)', clips.every((x) => C.EXTRA[x.slug] === x.text), clips.filter((x) => C.EXTRA[x.slug] !== x.text).map((x) => x.slug).join(' '));
  T('① 같은 글은 한 소리 — 편지 맺는 말 예시 2 · 3 은 하나(narr-letter-end-ex2)', !clips.some((x) => x.slug === 'narr-letter-end-ex3') && O.narExCue({ letter: 'each', narEx: { letter: 2 }, on: {} }, 'narr-letter-end') === 'narr-letter-end-ex2');
  // ② 이름표
  const bad = [];
  O.narExKeys().forEach((k) => { const sets = typeof O.NAR_EX[k].names === 'function' ? ['mothers', 'fathers', 'others'].map((w) => O.NAR_EX[k].names({ candleWho: w })) : [O.NAR_EX[k].names];
    sets.forEach((nm) => { const v = nm.filter(Boolean); if (new Set(v).size !== v.length || v.some((x) => !/^([가-힣]+게|격식 있게)$/.test(x)) || !nm[0]) bad.push(k + ':' + nm.join('/')); }); });
  T('② 이름표 «~하게» 한 낱말 · 순간 안에서 겹치지 않음 · 예시 1 이름 있음 [EX_NAME_HAGE]', !bad.length, bad.join(' | '));
  // ③ 엔진
  const SS = (k, n, x) => { const S = O.sampleS(); Object.assign(S, x || {}); S.narEx = { [k]: n }; return S; };
  const VAR = { candle: [{ candleWho: 'mothers' }, { candleWho: 'fathers' }, { candleWho: 'others' }], vow: [{}, { vowFirst: 'b' }], letter: [{ letter: 'each' }, { letter: 'each', _noVow: 1 }], speech: [{ freeWhat: 'speech', _pair: 'free' }] /* ★[SPEECH_SONG_1115] 축사 · 축가는 둘 중 하나 — sampleS 는 둘 다 켜 엔진(midMigrate)이 축사를 걷으니 축사 쪽으로 잰다 */, tribute: [{ tributeSay: 'none' }, { tributeSay: 'long' }] };
  const miss = [], wrong = [];
  O.narExKeys().forEach((k) => (VAR[k] || [{}]).forEach((x) => Array.from({ length: (Array.isArray(O.NAR_EX[k].names) ? Math.max(3, O.NAR_EX[k].names.length - 1) : 3) }, (_, i) => i + 1).forEach((n) => {   // ★[EX_MAX_BY_NAMES_1018] 예시 수만큼(축가는 5 · 서는 분마다 바뀌는 names 는 종전 3) — 종전 [1, 2, 3] 고정은 예시 5를 재지 않았다
    const S = SS(k, n, x); if (x._noVow) { delete S._noVow; S.on = Object.assign({}, S.on); delete S.on.vow; } if (x._pair) { delete S._pair; S.on = Object.assign({}, S.on); O.pairSet(S, x._pair); }
    const S2 = C.norm(S); if (!O.narExOk(S2, k, n)) return;
    const cues = C.build(S2, { mode: 'console' }).cues; const want = Object.keys(O.NAR_EX[k].lines).filter((sl) => cues.some((q) => q.slug === sl)).map((sl) => O.narExCue(S2, sl)).filter(Boolean);   // 그날 나가는 줄만(화촉은 서는 분 한 줄)
    want.forEach((w) => { const c = cues.find((q) => q.ex === w); if (!c) miss.push(`${k}#${n + 1}${JSON.stringify(x)} ${w}`); else if (c.text !== C.EXTRA[w] || c.file !== C.fileOf(w) || c.slug !== w.replace(/-ex\d$/, '')) wrong.push(w); });
    if (!want.length) miss.push(`${k}#${n + 1} 고른 예시에 소리가 없다`); })));
  T('③ 고르면 그 줄 소리 · 번호 · 글이 예시로 · 줄 slug 는 그대로(화면 · 콘솔 slug 판정)', !miss.length && !wrong.length, miss.concat(wrong).slice(0, 6).join(' | '));
  const plain = C.build(C.norm(O.sampleS()), { mode: 'console' }).cues.filter((c) => c.ex || /-ex\d+$/.test(c.file || '') && !/^\d+_(guest-ex|narr-prevideo-in-ex)/.test(c.file || '')).filter((c) => c.ex !== 'narr-welcome-in-face');   // [SEAM_WORD_1107 J06] 350 = 감사 인사 앞 «하객을 향해 서» 이음 판(예시 아님)
  T('③ 안 고르면 예시 소리가 한 줄도 없다(예시 1 = 지금 녹음)', !plain.length, plain.map((c) => c.file).join(' '));
  // ④ 맞는 날
  const S0 = O.sampleS(), noVow = Object.assign({}, S0, { on: Object.assign({}, S0.on) }); delete noVow.on.vow;
  const ids = (S, k) => O.narExList(S, k).map((x) => x[0]).join(',');
  T('④ 편지 «약속을 대신»(예시 3)은 서약 없는 날만 · 부모님께 편지 날엔 예시 없음', !/2/.test(ids(Object.assign({}, S0, { letter: 'each' }), 'letter')) && /2/.test(ids(Object.assign({}, noVow, { letter: 'each' }), 'letter')) && ids(Object.assign({}, S0, { letter: 'parent' }), 'letter') === '0', [ids(Object.assign({}, S0, { letter: 'each' }), 'letter'), ids(Object.assign({}, noVow, { letter: 'each' }), 'letter')].join(' / '));
  const pairS = Object.assign({}, S0, { on: { declare: 1, tribute: 1 } });
  T('④ 인사 예시 4(«처음 인사»)는 성혼 선언 바로 뒤 날엔 없다(짝 줄과 겹침)', !/3/.test(ids(pairS, 'tribute')) && /3/.test(ids(S0, 'tribute')), ids(pairS, 'tribute'));
  T('④ 서약 예시는 감사문 날 없음 · 축사 예시는 축사 날만 · 덕담 예시는 옛 가족 코스 없음', ids(Object.assign({}, S0, { vowKind: 'thanks' }), 'vow') === '0' && ids(Object.assign({}, S0, { freeWhat: 'video' }), 'speech') === '0' && ids(Object.assign({}, S0, { freeWhat: 'speech' }), 'speech') !== '0' && ids(Object.assign({}, S0, { course: 'family' }), 'bless') === '0');
  // ⑤ 저장 값
  const nv = C.norm(Object.assign(O.sampleS(), { narEx: { open: 6, foo: 1, candle: 2, vow: '3', letter: 0 }   /* [REVIEW24_1019] 개식이 여섯이 되어 범위 밖은 6 */ })).narEx || {};
  T('⑤ norm — 범위 밖(6 · 0) · 모르는 순간 값만 지운다 · 고른 값은 «맞는 날»이 아니어도 남는다', JSON.stringify(nv) === JSON.stringify({ candle: 2, vow: 3 }) && (C.norm(Object.assign(O.sampleS(), { vowKind: 'thanks', narEx: { vow: 2 } })).narEx || {}).vow === 2, JSON.stringify(nv));
  T('⑤-b norm — 상한은 그 순간 예시 수(names) · 축가 예시 5(값 4)도 남는다 [EX_MAX_BY_NAMES_1018]', ((C.norm(Object.assign(O.sampleS(), { narEx: { song: 4 } })).narEx || {}).song === 4) && !((C.norm(Object.assign(O.sampleS(), { narEx: { song: (O.NAR_EX.song.names || []).length } })).narEx || {}).song), JSON.stringify((C.norm(Object.assign(O.sampleS(), { narEx: { song: 4 } })).narEx || {})));
  // ⑥ 자료 그대로
  const nz = (t) => String(t).replace(/[\s.,!?·«»"'“”‘’~…]/g, '');
  const sents = (t) => (String(t).match(/[^.!?]+[.!?]*/g) || [String(t)]).map((s) => s.trim()).filter(Boolean);
  /* ★[EX_BANG_SPLIT_1018] 자료 문장 안의 «!»(«'위하여!'라고» · 인스타 SS 46)에서 예시가 갈려도 그 조각은 자료 글이다 — 장부 문장도 같은 자로 나눠 함께 넣는다(통째 · 조각 둘 다) */
  const SRC = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/자료그대로_1016.json'), 'utf8')).sents.flatMap((x) => [x.text].concat(sents(x.text))).map(nz));
  const BASE = { 'narr-vow-in': D.NARR.vow.nar, 'narr-vow-in-b': D.NARR.vow.narB, 'narr-ring-in': D.NARR.ring.nar, 'narr-entry-bow': D.NARR.entryBow, 'narr-declare-family-out': D.NARR.declareFamilyOut, 'narr-bless-mid': D.NARR.blessMid, 'narr-bless-end': D.NARR.blessEnd, 'letter-each': D.LETTER.each.nar, 'narr-letter-end': D.NARR.letterEnd, 'tribute-in': D.TRIBUTE.nar, 'tribute-out': D.TRIBUTE.end, 'narr-close-bow': D.NARR.closeBow, 'toast-toast': D.TOAST.toast.nar, 'narr-table-in': D.NARR.tableIn, 'narr-close': D.NARR.close };   /* [REVIEW4_1018] 단체 사진 안내 예시의 뒤 문장은 지금 글 */
  const CALL = /^(양가 (어머님|아버님|부모님)|양가를 대표하는 두 분), 단상 위로 올라와 주십시오\.$/;
  /* ★[FINAL_APPLY_1115 대표님 11/14 FINAL2 확정 · 새 녹음] 대표님이 듣고 고른 새 글 — 자료 글(SOURCE_FIRST_1016)보다 늦은 결정 · 여기 적힌 문장만 «지어낸 문장»에서 뺀다(지금 글 그대로여야 한다) */
  const OWNER = new Set(['오늘은 주례사 대신 부모님의 덕담을 듣겠습니다.' /* 194 */, '그동안 서로에게 전하고 싶었던 마음을 담아, 직접 쓴 편지로 약속을 대신한다고 합니다.' /* 177 «가득» 뺌 */,
    /* ★[FINAL_APPLY_1115 묶음 2] 대표님 FINAL1 다시 녹음에서 고른 새 글(rerecord62 final_selection · 대표님 «ok») */
    '두 사람이 처음 마주했던 날의 설렘이 오늘 이 자리까지 이어졌고, 이제 두 사람은 여러분의 축복 속에서 같은 길을 걸어가려 합니다.' /* 150 */,
    '주례가 없는 것이 아니라, 이 자리에 계신 가족과 친지, 그리고 함께해 주시는 모든 분들이, 오늘의 주례 선생님이자 사랑의 증인이 되어 주시는 것입니다.' /* 257 */,
    '오늘은 그 멈춰 있던 시간이 어머님들을 위해 다시 흐르길 바라며, 하객분들의 따뜻한 박수와 함께 두 분을 모시겠습니다.' /* 153 */,
    '화면으로 함께해 주시는 분들께도 두 사람이 인사드리겠습니다.' /* 62 */,
    '오늘 예식은 하객 여러분께서 증인이 되어 주시는, 주례 없는 결혼식으로 진행됩니다.' /* 137 */,
    '자, 그럼, 이 축복의 여정의 막을 열어 보겠습니다.' /* 06 */,
    '두 사람은 이제 평생이라는 영화의 멋진 이야기를 함께 써 내려갈 텐데요!' /* 10 */,
    '두 사람이 나란히 섰습니다.' /* 52 */,
    '신랑 신부… 맞절.' /* 161 */,
    '이어서 두 사람이 하객 여러분께 감사의 인사를 드리겠습니다.' /* 215 */,
    '양가 부모님, 하객분들께 인사!' /* 139 */,
    '양가 아버님. 맞절.' /* 146 */,
    '하객 여러분께서도 두 사람이 서약한 대로 행복하게 살 수 있도록 지켜봐 주시고 응원해 주시길 바랍니다.' /* 226 */,
    '여러분, 나란히 선 두 사람, 참 잘 어울리죠?' /* 209 */,
    '두 사람을 위해 다시 한 번 큰 박수 부탁드리겠습니다.' /* 210 */,
    '말보다 더 솔직한 마음으로, 다짐보다 더 깊은 사랑으로 전하는 두 사람의 이야기에, 하객 여러분도 따뜻한 마음으로 함께해 주시기 바랍니다.' /* 199 */,
    '지금 이 자리에서 두 사람은, 서로를 향한 진심 어린 마음과 약속을 편지로 나누었습니다.' /* 200 */,
    '이제 두 분께서는 중앙으로 오셔서, 하객 여러분을 향해 서 주시기 바랍니다.' /* 39 */,
    '자, 그럼 이제 부부로서 첫걸음을 내딛기 전, 지금까지 키워 주신 양가 부모님께, 감사의 인사를 올리겠습니다.' /* 180 */,
    '오늘이 있기까지 낳아 주시고 길러 주신 은혜에 감사드리며, 앞으로 잘 살겠다는 마음을 담아 인사드리겠습니다.' /* 239 */,
    '이제 이 감사의 마음을 담아, 두 사람이 인사드리겠습니다.' /* 241 */,
    '이번에는 부모님의 은혜에 평생 보답하겠다는 마음을 담아, 양가 부모님께 감사의 인사를 드리겠습니다.' /* 254 */,
    '부모님께서는 두 사람을 따뜻하게 안아 주시기 바랍니다.' /* 256 */,
    '신랑 신부가, 오늘 참석해 주신 하객 여러분의 테이블마다 찾아뵙고, 감사의 인사를 드리겠습니다.' /* 131 */,
    '두 사람을 가장 잘 아시는 분들이, 바로 여기 계신 여러분이니까요.' /* 87 */,
    '이제 안내에 따라 사진 촬영을 진행하겠습니다.' /* 44 */,
    '다음은 두 사람을 위한 축사 순서입니다.' /* 174 */,
    '두 사람이 앞으로 행복하게 잘 사는 모습도, 계속 지켜봐 주시고, 응원 많이 해 주시기 바랍니다.' /* 186 */].map(nz));
  const made = [];
  clips.forEach((x) => { const own = new Set(sents(BASE[x.base] || C.EXTRA[x.base] || '').map(nz));
    sents(x.text).forEach((s) => { if (!SRC.has(nz(s)) && !own.has(nz(s)) && !OWNER.has(nz(s)) && !CALL.test(s)) made.push(x.slug + ' «' + s + '»'); }); });
  T('⑥ 예시 문장마다 자료(자료그대로_1016.json · 출처) · 아니면 지금 글 문장 · 서는 분 부르는 한 마디 — 지어낸 문장 0 [SOURCE_FIRST_1016]', !made.length, made.slice(0, 4).join(' | '));
  // ⑦ 화면
  const H = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  T('⑦ 식순 화면 — «○○ 멘트» 줄은 _exRows(안내 멘트와 같은 줄) · mkNarEx 가 저장(_persist) · 옛 길 L(\'narEx:\') 없음', /out\.push\(\{key:'narEx:'\+ek,l:e\.lab,list:el,cur:R\.narExOf\(S,ek\),picked:true,fn:/.test(H) && /window\.mkNarEx=function\(ek,n\)\{[^\n]*_persist\(\); render\(\);[^\n]*\};/.test(H) && !/L\('narEx:'/.test(H));
  // ⑧ 녹음 대본
  let man = null; try { man = JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/manifest.json'), 'utf8')); } catch (e) {}
  const mc = man ? (man.clips || man) : [];
  const mt = (sl) => { const c = (Array.isArray(mc) ? mc : Object.values(mc)).find((q) => q && (q.slug === sl || q.file === sl || String(q.file || '').endsWith('_' + sl))); return c; };
  const mbad = clips.filter((x) => !mt(x.slug));
  T('⑧ 타입캐스트 manifest 에 예시 소리마다 줄이 있다(7_예시_멘트 · 진행)', !!man && !mbad.length && fs.existsSync(path.join(ROOT, 'docs/plans/식순연구/타입캐스트/7_예시_멘트.txt')), mbad.map((x) => x.slug).slice(0, 5).join(' '));
  return R;
}

const arg = process.argv[2];
if (arg === '--selftest') {
  const red = (mut, re) => run(mut).some(([m, c]) => !c && re.test(m));
  ok('깨 보기 ① 지어낸 문장 한 줄 → ⑥ 빨강', red('text', /^⑥/));
  ok('깨 보기 ② FILES 에서 예시 소리 하나 빼기 → ① 빨강', red('files', /^①/));
  ok('깨 보기 ③ 엔진이 예시를 안 잇게 → ③ 빨강', red('cue', /^③/));
  console.log(fail ? `\nNAR EX SELFTEST FAIL ${fail}` : '\nNAR EX SELFTEST OK'); process.exit(fail ? 1 : 0);
}
run().forEach(([m, c, d]) => ok(m, c, d));
console.log(fail ? `\nNAR EX FAIL ${fail}` : '\nNAR EX OK'); process.exit(fail ? 1 : 0);
