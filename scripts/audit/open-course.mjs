// [OPEN_COURSE 2026-09-25] 「우리 예식 짓기」(순간 먼저) — 설계 명세 1 의 받아들일 기준을 기계로 잰다.
//
//   node scripts/audit/open-course.mjs          # 정적(게이트가 매번 · 브라우저 없음)
//   node scripts/audit/open-course.mjs --live   # 실브라우저(390 · 1280) — 고르기 화면을 실제로 누른다
//
// ★숫자는 명세 원문(docs/handoff/설계명세1_식순고르기_0925.md 5장 · 9장)을 **그대로** 적는다 —
//   원천(ritual-open.js)에서 다시 계산해 비교하면 «원천이 틀려도 초록»이 된다. 명세가 기준이다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = (f) => path.join(ROOT, f);
const O = require(P('assets/ritual-open.js'));
const D = require(P('assets/ritual-data.js'));
const C = require(P('assets/ritual-cue.js'));
let bad = 0;
const ok = (name, cond, note = '') => { console.log((cond ? 'ok   ' : 'FAIL ') + name + (note ? '  ' + note : '')); if (!cond) bad++; };
process.on('exit', (code) => { if (bad && code === 0) process.exitCode = 1; });

/* ── 1. 순서 · 코스 ── */
ok('COURSES.open.seq = ritual-open.js ORDER (v4 · guest 포함)', JSON.stringify(D.COURSES.open.seq) === JSON.stringify(O.ORDER), D.COURSES.open.seq.join(','));
ok('v4 순서(명세 0장)', O.ORDER.filter((k) => k !== 'guest').join(',') === 'prevideo,candle,entry,welcome,bless,vow,ring,declare,tribute,free,letter,toast');
ok('옛 코스 여섯은 지우지 않고 숨긴다(Q1 ①)', ['damback', 'gamdong', 'family', 'minimal', 'festive', 'record'].every((k) => D.COURSES[k] && D.COURSES[k].hidden));
ok('새 코스도 옛 카드 목록엔 없다(hidden)', D.COURSES.open.hidden === true && D.COURSES.open.open === true);

/* ── 2. 시간 — [DAY_60 · RANGE_40 · EX_BRIEF 2026-09-26] 스냅 60 · 합 40 · 넷째 예시 «간결» · «약속» 인사 말 없이(코워크 회신 9/26 2-3 · 2-6 표) ── */
/* ★[CLOSE_BOW 2026-09-26 코워크 회신5 4-2] 닫는 인사(108 · 목례 · 박수)가 들어가 본식이 +16~19초 · 사진과 인사가 그만큼 준다(합 50 그대로) */
const WANT = { record: ['약 12~17분', '약 23~28분'], promise: ['약 14~20분', '약 20~26분'], family: ['약 17~24분', '약 16~23분'], brief: ['약 8~12분', '약 28~32분'] };
for (const k in WANT) { const s = O.span(O.applyExample({}, k)); ok(`예시 ‹${O.exampleOf(k).nm}› 본식 ${WANT[k][0]} · 사진과 인사 ${WANT[k][1]}`, s.body === WANT[k][0] && s.photo === WANT[k][1], `${s.body} / ${s.photo}`); }
// 4-9 초 단위 — 기록 11:49~16:49 · 약속 14:25~20:39 · 전부 17:47~24:59 (CLOSE_BOW 뒤 · 옛 11:33~16:31 · 14:09~20:21 · 17:31~24:41)
const mmss = (x) => Math.floor(x / 60) + ':' + String(Math.round(x % 60)).padStart(2, '0');
const SEC = { record: '11:49~16:49', promise: '13:55~20:00', brief: '8:24~12:25' };
for (const k in SEC) { const b = O.bodySec(O.applyExample({}, k)); ok(`예시 ‹${O.exampleOf(k).nm}› ${SEC[k]}`, mmss(b[0]) + '~' + mmss(b[1]) === SEC[k], mmss(b[0]) + '~' + mmss(b[1])); }
ok('예시 넷에는 준비한 순서가 없다 · 알림 없음', O.EXAMPLES.every((e) => e.on.indexOf('free') < 0 && !O.noticeOf(O.applyExample({}, e.k))));
ok('인사 한마디씩 + 편지 부모님께 → 인사 판 이름 «서로의 부모님께 한마디씩»', (() => { const S = O.applyExample({}, 'family'); S.on.letter = 1; O.setChip(S, 'tribute', 'one'); O.setChip(S, 'letter', 'parent'); return O.chipLabel('tribute', S) === '서로의 부모님께 한마디씩'; })());
ok('[EX_BRIEF] 넷째 예시는 «간결»(서약 · 반지 · 선언 · 축배) · «전부»(all)는 거뒀다 · 약속의 인사는 말 없이', O.EXAMPLES.map((e) => e.k).join(',') === 'record,promise,family,brief' && !O.exampleOf('all') && O.exampleOf('brief').on.join(',') === 'vow,ring,declare,toast' && O.exampleOf('promise').set.tribute === 'none' && O.originOf({ on: { vow: 1 }, pickFrom: 'all' }) === '직접 고르셨어요.');
const E = O.span({ on: {} });
ok('빈 채 시작: 본식 약 2~3분 · 단체 사진 약 37~38분', E.body === '약 2~3분' && E.photo === '약 37~38분', `${E.body} / ${E.photo}`);
ok('빈 채 시작: 알림 없음', O.noticeOf({ on: {} }) === '');
// 전 조합 — 넉넉 합(준비한 순서 3분 판까지)
let mx = 0; const V = { declare: ['solemn', 'warm', 'clap', 'family'], tribute: ['one', 'long', 'none'], letter: ['each', 'parent'], toast: ['both', 'toast', 'cake'], wine: ['mix', 'family', 'none'], free: ['video', 'speech'] };
for (let m = 0; m < (1 << O.PICKABLE.length); m++) {
  const on = {}; O.PICKABLE.forEach((k, i) => { if (m >> i & 1) on[k] = 1; });
  for (const d of V.declare) for (const t of V.tribute) for (const l of V.letter) for (const w of V.toast) for (const wi of V.wine) for (const f of V.free) {
    const S = { on, entry: 'A' }; O.setChip(S, 'declare', d); O.setChip(S, 'tribute', t); O.setChip(S, 'letter', l); O.setChip(S, 'toast', w); O.setChip(S, 'wine', wi); O.setChip(S, 'free', f);
    const b = O.bodySec(S)[1]; if (b > mx) mx = b;
  }
}
ok('전 조합 넉넉 합 ≤ 35분(가장 무거운 판 + 준비한 순서 3분)', mx / 60 <= 35, (mx / 60).toFixed(1) + '분');
ok('고객 범위(RANGE) 합 = 40 · 예시 넷이 그 안', O.RANGE.body[0] + O.RANGE.photo[1] === O.DAYMIN && O.RANGE.body[1] + O.RANGE.photo[0] === O.DAYMIN
  && Object.keys(WANT).every((k) => { const s = O.bodySec(O.applyExample({}, k)); return s[0] / 60 >= O.RANGE.body[0] - 4 && s[1] / 60 <= O.RANGE.body[1]; }));
ok('40 = DAY(140 − 준비 − 스냅 − 배웅) · 스냅 60 [DAY_60]', O.DAYMIN === 40 && O.DAYMIN === D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell && D.DAY.snap === 60);

ok('모든 순간에 칸 글이 있다(tileOf 빈 값 0) [TILE_SWALLOW]', Object.keys(O.CARDS).every((k) => O.tileOf(k, {}).length > 0), Object.keys(O.CARDS).filter((k) => !O.tileOf(k, {})).join(','));
/* ── 3. 알림 넷 — 조건 그대로(명세 3-6 · 둘째 판 4-1 · 4-7) ── */
ok('① 앞쪽 사슬(덕담 · 서약 · 인사) → 알림 ①', O.noticeOf({ on: { bless: 1, vow: 1, toast: 1 }, tributeSay: 'one' }) === '' && O.noticeOf({ on: { bless: 1, vow: 1, tribute: 1, toast: 1 } }) === O.NOTICE.heavy);
ok('① 뒤쪽 사슬(인사 · 축사 · 편지) → 뒤쪽 문구', O.noticeOf({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, freeWhat: 'speech', freeLen: '1' }) === O.NOTICE.heavyBack);
ok('① 인사 «말 없이»면 앉아 듣는 순간이 아니다', O.noticeOf({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, tributeSay: 'none', freeWhat: 'speech', freeLen: '1' }) !== O.NOTICE.heavyBack);
ok('① 준비한 순서가 영상이면 사슬이 끊긴다', O.noticeOf({ on: { declare: 1, tribute: 1, free: 1, letter: 1, toast: 1 }, freeWhat: 'video', freeLen: '1' }) === '');
ok('② 인사 400자 + 편지 부모님께 → 알림 ②', O.noticeOf({ on: { tribute: 1, declare: 1, letter: 1, ring: 1, toast: 1 }, tributeSay: 'long', letter: 'parent' }) === O.NOTICE.twice);
/* [DETAIL_0925 A2] 알림 ③ 은 고른 순간이 넷 이상일 때만 — 셋 이하면 «끝이 조용하다»를 말하지 않는다 */
ok('③ 축배 없음 + 끝이 선언 → 알림 ③(고른 순간 넷 이상일 때만)', O.noticeOf({ on: { declare: 1 } }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, vow: 1, declare: 1 } }) === O.NOTICE.toast
  && O.noticeOf({ on: { bless: 1, ring: 1, vow: 1, toast: 1 }, toast: 'cake' }) === O.NOTICE.toast
  && O.noticeOf({ on: { bless: 1, ring: 1, record: 1, declare: 1 } }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, declare: 1, toast: 1 }, toast: 'cake' }) === ''
  && O.noticeOf({ on: { bless: 1, ring: 1, declare: 1, toast: 1 } }) === '');
/* [DETAIL_0925 A2] ④ 의 N 은 띠의 «사진과 인사» 아래 값(span.pa)과 같은 수 — 알림과 띠가 다른 숫자를 말하지 않는다 */
ok('④ 가족 + 준비한 순서 3분 → 알림 ④(단체 사진 < 16분 · 띠와 같은 값) [RANGE_40]', (() => { const S = O.applyExample({}, 'family'); S.on.free = 1; const pa = O.span(S).pa; return O.noticeOf(S) === O.NOTICE.short(pa) && pa < 16 && O.SHORT_MIN === 16 && /단체 사진이 약/.test(O.NOTICE.short(pa)) && !/테이블/.test(O.NOTICE.short(pa)); })());
ok('준비한 순서 칩이 시간 · 준비 목록에 곧장', (() => { const S = { on: { free: 1 } }; const a = O.bodySec(S)[0]; O.setChip(S, 'freeLen', '1'); const b = O.bodySec(S)[0]; O.setChip(S, 'free', 'speech'); O.setChip(S, 'freeLen', '2'); const c = O.bodySec(S);
  return a - b === 120 && Math.round(O.partsOf('free', S).reduce((x, y) => x + y) - 10) === 126 - 0 && /축사하실 분/.test(O.prepOf('free', S)[0][1]); })());
ok('축사 2분 = 대본 126초 · 넉넉 161초', (() => { const S = { on: { free: 1 }, freeWhat: 'speech', freeLen: '2' }; const p = O.partsOf('free', S); return p[0] + p[1] + p[2] === 126 && Math.round(p[0] + 1.25 * p[1] + p[2] + p[3]) === 161; })());
ok('준비한 순서 자리 = 부모님께 인사 뒤 · 편지 앞', (() => { const q = O.bodySeq({ on: { declare: 1, tribute: 1, free: 1, letter: 1 } }); return q.indexOf('tribute') + 1 === q.indexOf('free') && q.indexOf('free') + 1 === q.indexOf('letter'); })());
ok('식전 영상은 늘 있다(누를 수 없음)', !!O.ALWAYS.prevideo && O.PICKABLE.indexOf('prevideo') < 0 && O.seqOf({ on: {} }).indexOf('prevideo') > -1);
ok('«축하의 말» 칸은 거뒀다(축사는 준비한 순서의 한 판)', O.ORDER.indexOf('speech') < 0 && !O.CARDS.speech && O.CHIPS.free.some((c) => c[0] === 'speech'));

/* ── 4. 고객 문구 — 금지어 · 전각 줄표 ── */
const TXT = JSON.stringify([O.CARDS, O.CHIPS, O.SECTIONS, O.EXAMPLES, O.NOTICE, O.NAR, O.CANDLE_WHO, O.NOTICE.short(20), O.helpersOf({ on: { free: 1, ring: 1 }, freeWhat: 'gift' }, { mealGuide: 1 })]);
['추천', '인기', '베스트', '축가', '추가 비용', '—'].forEach((w) => ok(`고객 문구에 «${w}» 없음`, TXT.indexOf(w) < 0));

/* ── 5. 엔진 — 고른 값이 콘솔 큐로 그대로 간다 ── */
const slugs = (S) => C.build(S, { mode: 'console' }).cues.map((c) => c.slug);
ok('빈 채: 하객 맞이 넷 + 식전 영상 + 입장 + 닫는 인사(04 는 원래 판)', (() => { const r = C.build({ course: 'open', on: {} }, { mode: 'console' }); return r.seq.join(',') === 'guest,prevideo,entry' && slugs({ course: 'open', on: {} }).indexOf('guest-4-1min') > -1; })());
ok('식전 영상은 03 과 04 사이(본식 시작 4분 전 · 시각고정)', (() => { const r = C.build({ course: 'open', on: {} }, { mode: 'console' }); const s = r.cues.map((c) => c.slug); const pv = r.cues[s.indexOf('narr-prevideo-in')];
  return s.indexOf('guest-3-5min') < s.indexOf('narr-prevideo-in') && s.indexOf('narr-prevideo-in') < s.indexOf('guest-4-1min') && pv.fire === 'clock' && pv.atMin === -4; })());
ok('화촉이 뒤에 오면 04 → 89(guest-4-1min-pre)', (() => { const s = slugs({ course: 'open', on: { candle: 1 } }); return s.indexOf('guest-4-1min-pre') > -1 && s.indexOf('guest-4-1min') < 0; })());
ok('두 분 목소리면 04 는 그대로(첫 줄이 이미 맞다)', slugs({ course: 'open', on: { candle: 1 }, guestVoice: 'couple' }).indexOf('guest-4-1min') > -1);
ok('화촉 서는 분 → 여는 말 판', ['mothers', 'parents', 'fathers', 'others'].every((w) => slugs({ course: 'open', on: { candle: 1 }, candleWho: w }).indexOf('narr-candle-in-' + w) > -1));
ok('선언 박수 판 → 96 · 97', (() => { const s = slugs({ course: 'open', on: { declare: 1 }, declare: 'clap' }); return s.indexOf('declare-clap-a') > -1 && s.indexOf('declare-clap-b') > s.indexOf('declare-clap-a'); })());
ok('와인 두 병 → 98 · 케이크 뒤 · 선창은 107(P2)', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'both', wine: 'mix' }); return s.indexOf('toast-pour-mix') > s.indexOf('toast-both') && s.indexOf('toast-pour-mix') < s.indexOf('toast-both-pour-b') && s.indexOf('toast-both-b') < 0; })());
ok('붓지 않는 날은 선창 81 그대로', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'both', wine: 'none' }); return s.indexOf('toast-both-b') > -1 && s.indexOf('toast-both-pour-b') < 0; })());
ok('양가 → 99 · 축배만이면 선창 앞', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'toast', wine: 'family' }); return s.indexOf('toast-pour-family') > -1 && s.indexOf('toast-pour-family') < s.indexOf('toast-toast'); })());
ok('케이크만이면 붓기 없음', slugs({ course: 'open', on: { toast: 1 }, toast: 'cake', wine: 'mix' }).every((x) => x.indexOf('toast-pour') < 0));
/* ★[CLAP_FEW 2026-09-26 사장님] 104(맺는 말 «따뜻한 박수 부탁드립니다»)는 흐름에서 뺐다 · 클립은 FILES 에 둔다 */
ok('준비한 순서 판별 넷 → 여는 말 100~103 · 맺는 말 104 는 안 나온다(CLAP_FEW)', ['video', 'dance', 'gift', 'speech'].every((w) => { const s = slugs({ course: 'open', on: { free: 1 }, freeWhat: w }); const kind = O.FREE_KIND[w]; return s.indexOf('narr-free-in-' + kind) > -1 && s.indexOf('narr-free-out-clap') < 0 && s.indexOf('narr-free-in') < 0; }));
ok('영상 · 무대 판만 «재생 안 됨»(105)을 든다', (() => { const f = (w) => C.build({ course: 'open', on: { free: 1 }, freeWhat: w }, { mode: 'console' }).cues.filter((c) => c.k === 'free')[0].rescue; return f('video').slug === 'narr-free-fail' && f('show').slug === 'narr-free-fail' && !f('gift') && !f('speech'); })());
ok('신랑 큰절 → 106 · 사람 구간이 그 줄 뒤로', (() => { const r = C.build({ course: 'open', on: { tribute: 1 }, tribute: 'bowGroom' }, { mode: 'console' }).cues.filter((c) => c.k === 'tribute'); return r.map((c) => c.slug).join(',') === 'tribute-in,tribute-bow-groom,tribute-out' && !r[0].live && !!r[1].live; })());
ok('옛 코스에선 신랑 큰절이 꽃으로 돌아간다', slugs({ course: 'family', tribute: 'bowGroom' }).indexOf('tribute-bow-groom') < 0);
ok('[ENTRY_SCENE] 첫 모습은 소리가 같다(맞절이어도 큐 목록이 바라보기와 같다)', JSON.stringify(slugs({ course: 'open', on: {}, entryScene: 'bow' })) === JSON.stringify(slugs({ course: 'open', on: {}, entryScene: 'look' })));
ok('새 코스에 옛 경고 셋이 안 뜬다', C.build({ course: 'open', on: {} }, {}).meta.warn.length === 0);
ok('예시 넷 · 콘솔 큐가 선다', O.EXAMPLES.every((e) => C.build(O.applyExample({ course: 'open' }, e.k), { mode: 'console' }).cues.length > 8));

/* ── 6. 옛 코스는 소리가 한 줄도 안 바뀐다(Q1 ② · 초안을 옮기지 않는다) ── */
const NEW = ['guest-4-1min-pre', 'narr-prevideo-in', 'narr-candle-in-mothers', 'narr-candle-in-parents', 'narr-candle-in-fathers', 'narr-candle-in-others', 'narr-candle-out', 'declare-clap-a', 'declare-clap-b', 'toast-pour-mix', 'toast-pour-family',
  'narr-free-in-video', 'narr-free-in-stage', 'narr-free-in-gift', 'narr-free-in-speech', 'narr-free-out-clap', 'narr-free-fail', 'tribute-bow-groom', 'toast-both-pour-b',
  'narr-close-bow',   // ★[CLOSE_BOW 2026-09-26] 108 · 본식 끝 두 분 인사
  'fx-free'];   // ★[GROUP_PHOTO 2026-09-26] 109 · 골라 트는 판 «자유 사진»
ok('FILES 맨 끝 89~109 이 새 줄 21개', JSON.stringify(C.FILES.slice(88)) === JSON.stringify(NEW));
/* ★[CLOSE_BOW 2026-09-26] 108 은 옛 코스에도 나온다 — 26(narr-close) 글이 «본식을 마칩니다»를 108 로 넘겨서, 108 을 빼면 옛 코스가 끝맺음 없이 사진으로 간다.
   (사장님 결정 3-1 CLAP_FEW 도 옛 코스 줄(16 · 20 · 24)을 바꿨다 — Q1 ② «옛 코스 소리 그대로»는 사장님 결정 둘에 한해 물러난다) */
ok('옛 코스 여섯 · 전 판 — 새 줄이 안 나온다(108 닫는 인사만 예외)', ['damback', 'gamdong', 'family', 'minimal', 'festive', 'record'].every((c) =>
  ['toast', 'cake', 'both'].every((t) => { const s = slugs({ course: c, toast: t, extra: { toast: 1, free: 1 }, wine: 'mix', declare: 'clap', tribute: 'bowGroom', freeWhat: 'speech' }); return s.every((x) => x === 'narr-close-bow' || NEW.indexOf(x) < 0) && s.indexOf('narr-close-bow') === s.indexOf('narr-close') - 1; })));

/* ── 7. 빌더 배선 ── */
const B = fs.readFileSync(P('order-preview.html'), 'utf8');
ok('빌더가 ritual-open.js 를 본문 스크립트보다 먼저 읽는다', B.indexOf('<script src="/assets/ritual-open.js">') > -1 && B.indexOf('<script src="/assets/ritual-open.js">') < B.indexOf('var S={course:'));
ok('빌더 엔진 로더도 ritual-open.js 를 엔진 앞에', /'\/assets\/ritual-open\.js','\/assets\/ritual-cue\.js'/.test(B));
ok('새 방문자 기본 코스 = open', /var S=\{course:'open'/.test(B));
ok('새 코스에선 ↑↓ 가 막힌다', /if\(isOpen\(\)\) return;   \/\/ \[OPEN_COURSE\]/.test(B));
const K = fs.readFileSync(P('assets/ritual-preview-link.js'), 'utf8');
ok('미리듣기 주소가 on · wine · tributeSay · candleWho · freeWhat · freeLen 을 싣는다', ['on', 'wine', 'tributeSay', 'candleWho', 'freeWhat', 'freeLen'].every((k) => K.indexOf(`'${k}'`) > -1));

/* ── 8. 실브라우저(--live) ── */
if (process.argv.includes('--live')) {
  let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
  if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
  const srv = http.createServer((q, r) => { const f = decodeURIComponent(q.url.split('?')[0]); const p = P(f); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': p.endsWith('.html') ? 'text/html; charset=utf-8' : 'application/javascript' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  const br = await pw.chromium.launch();
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 } });
    const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
    await pg.click('#next'); await pg.waitForTimeout(600); await pg.click('#next'); await pg.waitForTimeout(600);
    /* [PICK_V2 2026-09-26] 띠(op-band)는 거뒀다 — 시간 둘은 아래 막대(#opCta) · 늘 있는 칸은 «늘 있어요»(.pk-fix) */
    const g = () => pg.evaluate(() => ({ band: ((document.getElementById('opCta') || {}).textContent || '').replace(/\u00a0/g, ' '), empty: (document.querySelector('.pk-fp-empty') || {}).textContent || '', note: (document.querySelector('.op-note .op-note-t') || {}).textContent || '', ow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      moves: document.querySelectorAll('.mvb').length, locks: document.querySelectorAll('.pk-fix').length, text: (document.getElementById('stage') || document.body).textContent }));   // ★body 는 인라인 스크립트 글까지 센다
    let s = await g();
    ok(`${w} 빈 채 — 아래 막대 «예시로 시작하거나 …» · 흐름 판 빈 글(숫자 비움)`, /예시로 시작하거나/.test(s.band) && /아직 담은 순간이 없어요/.test(s.empty), s.band + ' | ' + s.empty);
    ok(`${w} 빈 채 알림 없음 · 늘 있어요 셋(식전 영상 · 입장 · 닫는 인사) · ↑↓ 없음 · 가로 넘침 0`, !s.note && s.locks === 3 && s.moves === 0 && s.ow <= 0, JSON.stringify({ note: s.note, locks: s.locks, moves: s.moves, ow: s.ow }));
    ok(`${w} 새 화면에 금지어 없음`, !['추천', '인기', '베스트', '축가', '추가 비용'].some((x) => s.text.indexOf(x) > -1));
    await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400); s = await g();
    ok(`${w} ‹가족› 예시 → 본식 약 17~24분`, /약 17~24분/.test(s.band), s.band);
    // [ACTS_FOUR] 준비한 순서는 «마음의 순간»의 «있을 때만» 칸 — 담기 원을 누르면 담긴다(옛 [FREE_OWN] 맨 아래 묶음 · ② 더하기 단추는 거뒀다)
    const addBtn = await pg.$('[data-fk="opt:free"]');
    ok(`${w} 준비한 순서 칸에 담기 원이 있다(«있을 때만»)`, !!addBtn && await pg.evaluate(() => /있을 때만/.test(document.querySelector('[data-fk="pto:free"]').textContent)));
    if (addBtn) { await addBtn.click(); await pg.waitForTimeout(500); }
    const fOn = await pg.evaluate(() => !!(S.on && S.on.free) && document.querySelector('[data-fk="opt:free"]').getAttribute('aria-pressed') === 'true');
    ok(`${w} 누르면 준비한 순서가 담기고 원이 ✓ 로 바뀐다`, fOn);
    /* [LISTEN_PAGE] 판 칩은 ② 로 옮겼다 — ① 에서는 값을 바로 넣어 띠가 따라오는지만 본다(칩 자체는 listen-page.mjs 가 ② 에서 누른다) */
    const b3 = (await g()).band; await pg.evaluate(() => { S.freeLen = '1'; render(); }); await pg.waitForTimeout(400); const b1 = (await g()).band;
    ok(`${w} 길이(3분 → 1분)가 띠에 곧장`, b3 !== b1, b3 + ' → ' + b1);
    await pg.click('[data-fk="opt:free"]'); await pg.waitForTimeout(400);
    await pg.click('[data-fk="opt:letter"]'); await pg.waitForTimeout(300); await pg.evaluate(() => { S.letter = 'parent'; render(); }); await pg.waitForTimeout(300); s = await g();
    ok(`${w} 인사 400자 + 편지 부모님께 → 알림 ②`, s.note === O.NOTICE.twice, s.note);
    const steps = await pg.evaluate(() => (window.STEPS || []).map((x) => x.k).join(','));
    ok(`${w} 네 걸음 = 고르기 · 보고 듣기 · 글 적기 · 완성 [LISTEN_PAGE]`, steps === 'intro,intro2,pick,listen,write,done', steps);
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
  await br.close(); srv.close();
}
