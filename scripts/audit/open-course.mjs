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

/* ── 2. 시간 — 명세 5장 · 9장 원문 값 ── */
const WANT = { record: ['약 11~15분', '약 40~44분'], promise: ['약 13~18분', '약 37~42분'], family: ['약 16~23분', '약 32~39분'], all: ['약 21~28분', '약 27~34분'] };
for (const k in WANT) { const s = O.span(O.applyExample({}, k)); ok(`예시 ‹${O.exampleOf(k).nm}› 본식 ${WANT[k][0]} · 사진과 인사 ${WANT[k][1]}`, s.body === WANT[k][0] && s.photo === WANT[k][1], `${s.body} / ${s.photo}`); }
const E = O.span({ on: {} });
ok('빈 채 시작: 본식 약 2~3분 · 사진과 인사 약 53분', E.body === '약 2~3분' && E.photo === '약 53분', `${E.body} / ${E.photo}`);
ok('빈 채 시작: 알림 없음', O.noticeOf({ on: {} }) === '');
// 전 조합 — 넉넉 합 31분 안(명세 6장 · 막는 말을 두지 않는 근거)
let mx = 0; const V = { declare: ['solemn', 'warm', 'clap', 'family'], tribute: ['one', 'long', 'none'], letter: ['each', 'parent'], toast: ['both', 'toast', 'cake'], wine: ['mix', 'family', 'none'] };
for (let m = 0; m < (1 << O.PICKABLE.length); m++) {
  const on = {}; O.PICKABLE.forEach((k, i) => { if (m >> i & 1) on[k] = 1; });
  for (const d of V.declare) for (const t of V.tribute) for (const l of V.letter) for (const w of V.toast) for (const wi of V.wine) {
    const S = { on, entry: 'A' }; O.setChip(S, 'declare', d); O.setChip(S, 'tribute', t); O.setChip(S, 'letter', l); O.setChip(S, 'toast', w); O.setChip(S, 'wine', wi);
    const b = O.bodySec(S)[1]; if (b > mx) mx = b;
  }
}
ok('전 조합 넉넉 합 ≤ 31분', mx / 60 <= 31, (mx / 60).toFixed(1) + '분');
ok('고객 범위(RANGE) 합 = 55 · 예시 넷이 그 안', O.RANGE.body[0] + O.RANGE.photo[1] === O.DAYMIN && O.RANGE.body[1] + O.RANGE.photo[0] === O.DAYMIN
  && Object.keys(WANT).every((k) => { const s = O.bodySec(O.applyExample({}, k)); return s[0] / 60 >= O.RANGE.body[0] && s[1] / 60 <= O.RANGE.body[1]; }));
ok('55 = DAY(140 − 준비 − 스냅 − 배웅)', O.DAYMIN === D.DAY.total - D.DAY.ready - D.DAY.snap - D.DAY.farewell);

/* ── 3. 알림 셋 — 조건 그대로(명세 3-6) ── */
ok('① 앉아 듣는 순간 셋 → 알림 ①', O.noticeOf({ on: { bless: 1, vow: 1, toast: 1 }, tributeSay: 'one' }) === '' && O.noticeOf({ on: { bless: 1, vow: 1, tribute: 1, toast: 1 } }) === O.NOTICE.heavy);
ok('② 인사 400자 + 편지 부모님께 → 알림 ②', O.noticeOf({ on: { tribute: 1, declare: 1, letter: 1, ring: 1, toast: 1 }, tributeSay: 'long', letter: 'parent' }) === O.NOTICE.twice);
/* ③ 은 «축배가 없다»와 «닫는 인사 바로 앞이 앉아 듣는 순간·선언이거나 선언이 없다»가 **함께** 서야 뜬다.
   케이크만이면 닫는 인사 바로 앞이 케이크 자신이라, 선언이 있으면 안 뜨고 없으면 뜬다(명세 원문 그대로). */
ok('③ 축배 없음 + 끝이 선언 → 알림 ③', O.noticeOf({ on: { declare: 1 } }) === O.NOTICE.toast
  && O.noticeOf({ on: { toast: 1 }, toast: 'cake' }) === O.NOTICE.toast
  && O.noticeOf({ on: { declare: 1, toast: 1 }, toast: 'cake' }) === ''
  && O.noticeOf({ on: { declare: 1, toast: 1 } }) === '');

/* ── 4. 고객 문구 — 금지어 · 전각 줄표 ── */
const TXT = JSON.stringify([O.CARDS, O.CHIPS, O.SECTIONS, O.EXAMPLES, O.NOTICE, O.NAR, O.CANDLE_WHO]);
['추천', '인기', '베스트', '축가', '추가 비용', '—'].forEach((w) => ok(`고객 문구에 «${w}» 없음`, TXT.indexOf(w) < 0));

/* ── 5. 엔진 — 고른 값이 콘솔 큐로 그대로 간다 ── */
const slugs = (S) => C.build(S, { mode: 'console' }).cues.map((c) => c.slug);
ok('빈 채: 하객 맞이 넷 + 입장 + 닫는 인사만(04 는 원래 판)', (() => { const r = C.build({ course: 'open', on: {} }, { mode: 'console' }); return r.seq.join(',') === 'guest,entry' && slugs({ course: 'open', on: {} }).indexOf('guest-4-1min') > -1; })());
ok('화촉·식전 영상이 먼저면 04 → 89(guest-4-1min-pre)', (() => { const s = slugs({ course: 'open', on: { candle: 1 } }); return s.indexOf('guest-4-1min-pre') > -1 && s.indexOf('guest-4-1min') < 0; })());
ok('두 분 목소리면 04 는 그대로(첫 줄이 이미 맞다)', slugs({ course: 'open', on: { candle: 1 }, guestVoice: 'couple' }).indexOf('guest-4-1min') > -1);
ok('화촉 서는 분 → 여는 말 판', ['mothers', 'parents', 'fathers', 'others'].every((w) => slugs({ course: 'open', on: { candle: 1 }, candleWho: w }).indexOf('narr-candle-in-' + w) > -1));
ok('식전 영상 → 90 · 입장 앞', (() => { const s = slugs({ course: 'open', on: { prevideo: 1 } }); return s.indexOf('narr-prevideo-in') > -1 && s.indexOf('narr-prevideo-in') < s.indexOf('entry-A'); })());
ok('선언 박수 판 → 96 · 97', (() => { const s = slugs({ course: 'open', on: { declare: 1 }, declare: 'clap' }); return s.indexOf('declare-clap-a') > -1 && s.indexOf('declare-clap-b') > s.indexOf('declare-clap-a'); })());
ok('와인 두 병 → 98 · 케이크 뒤 선창 앞', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'both', wine: 'mix' }); return s.indexOf('toast-pour-mix') > s.indexOf('toast-both') && s.indexOf('toast-pour-mix') < s.indexOf('toast-both-b'); })());
ok('양가 → 99 · 축배만이면 선창 앞', (() => { const s = slugs({ course: 'open', on: { toast: 1 }, toast: 'toast', wine: 'family' }); return s.indexOf('toast-pour-family') > -1 && s.indexOf('toast-pour-family') < s.indexOf('toast-toast'); })());
ok('케이크만이면 붓기 없음', slugs({ course: 'open', on: { toast: 1 }, toast: 'cake', wine: 'mix' }).every((x) => x.indexOf('toast-pour') < 0));
ok('새 코스에 옛 경고 셋이 안 뜬다', C.build({ course: 'open', on: {} }, {}).meta.warn.length === 0);
ok('예시 넷 · 콘솔 큐가 선다', O.EXAMPLES.every((e) => C.build(O.applyExample({ course: 'open' }, e.k), { mode: 'console' }).cues.length > 8));

/* ── 6. 옛 코스는 소리가 한 줄도 안 바뀐다(Q1 ② · 초안을 옮기지 않는다) ── */
const NEW = ['guest-4-1min-pre', 'narr-prevideo-in', 'narr-candle-in-mothers', 'narr-candle-in-parents', 'narr-candle-in-fathers', 'narr-candle-in-others', 'narr-candle-out', 'declare-clap-a', 'declare-clap-b', 'toast-pour-mix', 'toast-pour-family'];
ok('FILES 맨 끝 89~99 가 새 줄 11개', JSON.stringify(C.FILES.slice(88)) === JSON.stringify(NEW));
ok('옛 코스 여섯 · 전 판 — 새 줄이 안 나온다', ['damback', 'gamdong', 'family', 'minimal', 'festive', 'record'].every((c) =>
  ['toast', 'cake', 'both'].every((t) => slugs({ course: c, toast: t, extra: { toast: 1 }, wine: 'mix', declare: 'clap' }).every((x) => NEW.indexOf(x) < 0))));

/* ── 7. 빌더 배선 ── */
const B = fs.readFileSync(P('order-preview.html'), 'utf8');
ok('빌더가 ritual-open.js 를 본문 스크립트보다 먼저 읽는다', B.indexOf('<script src="/assets/ritual-open.js">') > -1 && B.indexOf('<script src="/assets/ritual-open.js">') < B.indexOf('var S={course:'));
ok('빌더 엔진 로더도 ritual-open.js 를 엔진 앞에', /'\/assets\/ritual-open\.js','\/assets\/ritual-cue\.js'/.test(B));
ok('새 방문자 기본 코스 = open', /var S=\{course:'open'/.test(B));
ok('새 코스에선 ↑↓ 가 막힌다', /if\(isOpen\(\)\) return;   \/\/ \[OPEN_COURSE\]/.test(B));
const K = fs.readFileSync(P('assets/ritual-preview-link.js'), 'utf8');
ok('미리듣기 주소가 on · wine · tributeSay · candleWho 를 싣는다', ['on', 'wine', 'tributeSay', 'candleWho'].every((k) => K.indexOf(`'${k}'`) > -1));

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
    const g = () => pg.evaluate(() => ({ band: (document.querySelector('.op-band .t1') || {}).textContent || '', note: (document.querySelector('.op-note') || {}).textContent || '', ow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
      moves: document.querySelectorAll('.mvb').length, locks: [...document.querySelectorAll('.op-tg:disabled')].length, text: (document.getElementById('stage') || document.body).textContent }));   // ★body 는 인라인 스크립트 글까지 센다
    let s = await g();
    ok(`${w} 빈 채 띠 «본식 약 2~3분 · 사진과 인사 약 53분»`, /본식 약 2~3분/.test(s.band) && /약 53분/.test(s.band), s.band);
    ok(`${w} 빈 채 알림 없음 · 늘 있어요 둘 · ↑↓ 없음 · 가로 넘침 0`, !s.note && s.locks === 2 && s.moves === 0 && s.ow <= 0, JSON.stringify({ note: s.note, locks: s.locks, moves: s.moves, ow: s.ow }));
    ok(`${w} 새 화면에 금지어 없음`, !['추천', '인기', '베스트', '축가', '추가 비용'].some((x) => s.text.indexOf(x) > -1));
    await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400); s = await g();
    ok(`${w} ‹가족› 예시 → 본식 약 16~23분`, /약 16~23분/.test(s.band), s.band);
    await pg.click('[data-fk="opt:letter"]'); await pg.waitForTimeout(300); await pg.click('[data-fk="op:letter:parent"]'); await pg.waitForTimeout(300); s = await g();
    ok(`${w} 인사 400자 + 편지 부모님께 → 알림 ②`, s.note === O.NOTICE.twice, s.note);
    const steps = await pg.evaluate(() => (window.STEPS || []).map((x) => x.k).join(','));
    ok(`${w} 연출 단계 = 담은 순간만(v4 순서)`, steps === 'intro,intro2,pick,guest,candle,entry,welcome,bless,vow,ring,declare,tribute,letter,toast,write,done', steps);
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
  await br.close(); srv.close();
}
