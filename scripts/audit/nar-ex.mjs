#!/usr/bin/env node
/* ★★[EX_MANY_1017 2026-10-17 사장님 «우리 시스템에 예시가 하나밖에 없으면 늘려서 더 좋은 예시를 고를 수 있게 하자 · 4개 정도 · 자료집에서 좋은 멘트들 붙여서 · 저 섹션 말고도 예시가 없는 곳 찾아보고 개선»]
   나레이션 멘트 예시(ritual-open NAR_EX · 14 순간 · 소리 57줄 148 ~ 206(쉬는 소리 201 · 190 둘 · RETIRED · [R11_SRC_1018]) · 191 ~ 196 = 자료 T3 [T3_OK_1017] · 197 ~ 200 = 자료 루프 첫 판 [NARR_LOOP_1018] · 201 ~ 203 = 라운드 9 [NARR_R9_1018] · 204 ~ 206 = 라운드 10 [R10_SRC_1018])를 잰다 — 엔진 · 번호 · 자료 · 화면 · 녹음 대본.
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
  if (mut === 'text') { const L = O.NAR_EX.ring.lines['narr-ring-in']; L[0] = L[0].replace('다음은', '오늘 우리는 정말 행복한 날입니다. 다음은'); }
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
  T(`① 예시 소리 ${clips.length}줄이 모두 FILES 에 · 147(narr-candle-bow-others) 뒤에 붙었다`, clips.length >= 40 && clips.every((x) => FILES.indexOf(x.slug) > first && first === 146), clips.filter((x) => FILES.indexOf(x.slug) <= first).map((x) => x.slug).join(' '));
  const LIVE_EX = (f) => /-ex\d$/.test(f) && !/^guest-ex|^narr-prevideo-in-ex/.test(f) && !(C.RETIRED && C.RETIRED[f]);   // ★[R11_SRC_1018 라운드 11] 쉬는 소리(RETIRED · 번호 보존 · 기본 글과 같은 글이 된 예시)는 원천에 글이 없어도 된다
  T('① FILES 의 «-exN» 예시 소리(하객 맞이 · 식전 영상 소개 · 쉬는 소리 밖)는 모두 원천(NAR_EX)에 글이 있다', FILES.filter(LIVE_EX).every((f) => clips.some((x) => x.slug === f)), FILES.filter((f) => LIVE_EX(f) && !clips.some((x) => x.slug === f)).join(' '));
  T('① 쉬는 예시 소리는 원천(NAR_EX)에서도 안 나간다 [R11_SRC_1018]', FILES.filter((f) => /-ex\d$/.test(f) && C.RETIRED && C.RETIRED[f]).every((f) => !clips.some((x) => x.slug === f)), FILES.filter((f) => /-ex\d$/.test(f) && C.RETIRED && C.RETIRED[f] && clips.some((x) => x.slug === f)).join(' '));
  T('① EXTRA 글 = 원천 글(손으로 옮겨 적지 않는다)', clips.every((x) => C.EXTRA[x.slug] === x.text), clips.filter((x) => C.EXTRA[x.slug] !== x.text).map((x) => x.slug).join(' '));
  T('① 같은 글은 한 소리 — 편지 맺는 말 예시 2 · 3 은 하나(narr-letter-end-ex2)', !clips.some((x) => x.slug === 'narr-letter-end-ex3') && O.narExCue({ letter: 'each', narEx: { letter: 2 }, on: {} }, 'narr-letter-end') === 'narr-letter-end-ex2');
  // ② 이름표
  const bad = [];
  O.narExKeys().forEach((k) => { const sets = typeof O.NAR_EX[k].names === 'function' ? ['mothers', 'fathers', 'parents', 'others'].map((w) => O.NAR_EX[k].names({ candleWho: w })) : [O.NAR_EX[k].names];
    sets.forEach((nm) => { const v = nm.filter(Boolean); if (new Set(v).size !== v.length || v.some((x) => !/^([가-힣]+게|격식 있게)$/.test(x)) || !nm[0]) bad.push(k + ':' + nm.join('/')); }); });
  T('② 이름표 «~하게» 한 낱말 · 순간 안에서 겹치지 않음 · 예시 1 이름 있음 [EX_NAME_HAGE]', !bad.length, bad.join(' | '));
  // ③ 엔진
  const SS = (k, n, x) => { const S = O.sampleS(); Object.assign(S, x || {}); S.narEx = { [k]: n }; return S; };
  const VAR = { candle: [{ candleWho: 'mothers' }, { candleWho: 'fathers' }, { candleWho: 'parents' }, { candleWho: 'others' }], vow: [{}, { vowFirst: 'b' }], letter: [{ letter: 'each' }, { letter: 'each', _noVow: 1 }], speech: [{ freeWhat: 'speech' }], tribute: [{ tributeSay: 'none' }, { tributeSay: 'long' }] };
  const miss = [], wrong = [];
  O.narExKeys().forEach((k) => (VAR[k] || [{}]).forEach((x) => [1, 2, 3].forEach((n) => {
    const S = SS(k, n, x); if (x._noVow) { delete S._noVow; S.on = Object.assign({}, S.on); delete S.on.vow; }
    const S2 = C.norm(S); if (!O.narExOk(S2, k, n)) return;
    const cues = C.build(S2, { mode: 'console' }).cues; const want = Object.keys(O.NAR_EX[k].lines).filter((sl) => cues.some((q) => q.slug === sl)).map((sl) => O.narExCue(S2, sl)).filter(Boolean);   // 그날 나가는 줄만(화촉은 서는 분 한 줄)
    want.forEach((w) => { const c = cues.find((q) => q.ex === w); if (!c) miss.push(`${k}#${n + 1}${JSON.stringify(x)} ${w}`); else if (c.text !== C.EXTRA[w] || c.file !== C.fileOf(w) || c.slug !== w.replace(/-ex\d$/, '')) wrong.push(w); });
    if (!want.length) miss.push(`${k}#${n + 1} 고른 예시에 소리가 없다`); })));
  T('③ 고르면 그 줄 소리 · 번호 · 글이 예시로 · 줄 slug 는 그대로(화면 · 콘솔 slug 판정)', !miss.length && !wrong.length, miss.concat(wrong).slice(0, 6).join(' | '));
  const plain = C.build(C.norm(O.sampleS()), { mode: 'console' }).cues.filter((c) => c.ex || /-ex\d+$/.test(c.file || '') && !/^\d+_(guest-ex|narr-prevideo-in-ex)/.test(c.file || ''));
  T('③ 안 고르면 예시 소리가 한 줄도 없다(예시 1 = 지금 녹음)', !plain.length, plain.map((c) => c.file).join(' '));
  // ④ 맞는 날
  const S0 = O.sampleS(), noVow = Object.assign({}, S0, { on: Object.assign({}, S0.on) }); delete noVow.on.vow;
  const ids = (S, k) => O.narExList(S, k).map((x) => x[0]).join(',');
  T('④ 편지 «약속을 대신»(예시 3)은 서약 없는 날만 · 부모님께 편지 날엔 예시 없음', !/2/.test(ids(Object.assign({}, S0, { letter: 'each' }), 'letter')) && /2/.test(ids(Object.assign({}, noVow, { letter: 'each' }), 'letter')) && ids(Object.assign({}, S0, { letter: 'parent' }), 'letter') === '0', [ids(Object.assign({}, S0, { letter: 'each' }), 'letter'), ids(Object.assign({}, noVow, { letter: 'each' }), 'letter')].join(' / '));
  const pairS = Object.assign({}, S0, { on: { declare: 1, tribute: 1 } });
  T('④ 인사 예시 4(«처음 인사»)는 성혼 선언 바로 뒤 날엔 없다(짝 줄과 겹침)', !/3/.test(ids(pairS, 'tribute')) && /3/.test(ids(S0, 'tribute')), ids(pairS, 'tribute'));
  T('④ 서약 예시는 감사문 날 없음 · 축사 예시는 축사 날만 · 덕담 예시는 옛 가족 코스 없음', ids(Object.assign({}, S0, { vowKind: 'thanks' }), 'vow') === '0' && ids(Object.assign({}, S0, { freeWhat: 'video' }), 'speech') === '0' && ids(Object.assign({}, S0, { freeWhat: 'speech' }), 'speech') !== '0' && ids(Object.assign({}, S0, { course: 'family' }), 'bless') === '0');
  // ⑤ 저장 값
  const nv = C.norm(Object.assign(O.sampleS(), { narEx: { open: 5, foo: 1, candle: 2, vow: '3', letter: 0 } })).narEx || {};
  T('⑤ norm — 범위 밖(5 · 0) · 모르는 순간 값만 지운다 · 고른 값은 «맞는 날»이 아니어도 남는다', JSON.stringify(nv) === JSON.stringify({ candle: 2, vow: 3 }) && (C.norm(Object.assign(O.sampleS(), { vowKind: 'thanks', narEx: { vow: 2 } })).narEx || {}).vow === 2, JSON.stringify(nv));
  // ⑥ 자료 그대로
  const nz = (t) => String(t).replace(/[\s.,!?·«»"'“”‘’~…]/g, '');
  const SRC = new Set(JSON.parse(fs.readFileSync(path.join(ROOT, 'docs/plans/식순연구/자료그대로_1016.json'), 'utf8')).sents.map((x) => nz(x.text)));
  const BASE = { 'narr-vow-in': D.NARR.vow.nar, 'narr-vow-in-b': D.NARR.vow.narB, 'narr-ring-in': D.NARR.ring.nar, 'narr-entry-bow': D.NARR.entryBow, 'narr-declare-family-out': D.NARR.declareFamilyOut, 'narr-bless-mid': D.NARR.blessMid, 'narr-bless-end': D.NARR.blessEnd, 'letter-each': D.LETTER.each.nar, 'narr-letter-end': D.NARR.letterEnd, 'tribute-in': D.TRIBUTE.nar, 'tribute-out': D.TRIBUTE.end, 'narr-close-bow': D.NARR.closeBow, 'toast-toast': D.TOAST.toast.nar, 'narr-table-in': D.NARR.tableIn };
  const sents = (t) => (String(t).match(/[^.!?]+[.!?]*/g) || [String(t)]).map((s) => s.trim()).filter(Boolean);
  const CALL = /^(양가 (어머님|아버님|부모님)|양가를 대표하는 두 분), 단상 위로 올라와 주십시오\.$/;
  const made = [];
  clips.forEach((x) => { const own = new Set(sents(BASE[x.base] || C.EXTRA[x.base] || '').map(nz));
    sents(x.text).forEach((s) => { if (!SRC.has(nz(s)) && !own.has(nz(s)) && !CALL.test(s)) made.push(x.slug + ' «' + s + '»'); }); });
  T('⑥ 예시 문장마다 자료(자료그대로_1016.json · 출처) · 아니면 지금 글 문장 · 서는 분 부르는 한 마디 — 지어낸 문장 0 [SOURCE_FIRST_1016]', !made.length, made.slice(0, 4).join(' | '));
  // ⑦ 화면
  const H = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  T('⑦ 식순 화면 — «○○ 멘트» 줄은 _exRows(안내 멘트와 같은 줄) · mkNarEx 가 저장(_persist) · 옛 길 L(\'narEx:\') 없음', /out\.push\(\{key:'narEx:'\+ek,l:e\.lab,list:el,cur:R\.narExOf\(S,ek\),picked:true,fn:/.test(H) && /window\.mkNarEx=function\(ek,n\)\{[^\n]*_persist\(\); render\(\); \};/.test(H) && !/L\('narEx:'/.test(H));
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
