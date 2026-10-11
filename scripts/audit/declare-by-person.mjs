// ★★[DECLARE_BY_PERSON 2026-10-12 사장님 «성혼 선언은 나레이션이 하지 않을 거야 · 아버지나 친구 지인분이 하게만 할 거야 · 그게 싫다면 서약으로» → «관련있는거 전부 반영»]
//   선언문은 사람만 읽는다 — 신랑 아버님 · 신부 아버님 · 친구 · 지인 한 분. 나레이션은 여는 말(누가 선언하는지) · 맺는 말(축하 박수)만.
//   읽어 줄 분이 없으면 성혼 선언을 빼고 서약으로 마무리한다(① 에서 순간 빼기 · 화면이 한 줄로 알린다).
//
//   A(브라우저 없이 · 늘 돈다) — 엔진 · 원천 · AI 지식 · 빌더 사본
//     ① 어떤 저장값(옛 narr · family · ask · chorus · clap 포함)으로도 나레이션 선언 클립(30 · 31 · 32 · 96 · 97 · 21)이 큐에 안 선다
//     ② 선언 큐 = 여는 말(고른 분 134 · 135 · 안 고름 · 친구 136) → 사람 낭독(live.self) → 맺는 말 57 · 나레이션 글에 «부부입니다» 수행문 없음
//     ③ 칩 = DECLWHO 셋 · 예시 넷은 읽을 분을 박지 않는다 · 옛 값은 «안 고름»
//     ④ AI 지식 — 읽는 분 셋 · «나레이션은 선언문을 읽지 않는다» · «없으면 서약으로» · 옛 «낭독 주체 2종 · 엄숙하게» 없음
//     ⑤ 빌더 — 나레이션 선언 사본(DECLARE) 없음 · 칩 이름 «누가 읽나요» · 안 고른 한 줄 · 설명 «아버님이나 친구 · 지인»
//   B(브라우저가 있을 때 · 390 · 1280) — ② 하나씩 만들기 성혼 선언 화면
//     칩 셋 · 처음엔 안 눌림 · 안 고른 한 줄 / 고르면 «선언문은 저희가 인쇄해 드려요» · 흐름 «시작할 때 · ○○ 차례 · 끝나면» · 참고 예시에 고른 분 이름
//   --selftest — A 의 판정을 일부러 깨 보고 빨강이 되는지 본다([DECISION_GUARD] 깨 보고 믿는다)
//   종료 코드 0 = 통과 · 1 = 실패 · (B 를 못 재면 A 만 보고 그 사실을 한 줄로)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const GONE = ['declare-1-solemn', 'declare-2-warm', 'declare-family', 'declare-clap-a', 'declare-clap-b', 'narr-declare-family-intro', 'declare-ask-a', 'declare-ask-b', 'declare-ask-c'];
const OLD_WHO = ['', 'gdad', 'bdad', 'friend', 'narr', 'family', 'ask', 'chorus', 'clap', 'solemn', 'zz'];
const INTRO = { gdad: 'narr-declare-in-gdad', bdad: 'narr-declare-in-bdad' };

/* ── A. 판정은 한 곳 — 원천을 받아 위반 목록을 돌려준다(본문과 깨 보기가 같은 함수를 쓴다) ── */
function judgeA(X) {
  const bad = [];
  const { D, C, O, KB, html } = X;
  // ①② 엔진
  const courses = Object.keys(D.COURSES);
  for (const c of courses) for (const w of OLD_WHO) for (const dec of ['1', '2', 'clap', undefined]) {
    const S = { course: c, declareWho: w, declare: dec };
    if (D.COURSES[c].open) S.on = { declare: 1, vow: 1, ring: 1 };
    let r; try { r = C.build(S, { mode: 'console' }); } catch (e) { bad.push(`① ${c}/${w}: 엔진이 멈췄다 ${e.message}`); continue; }
    const cs = r.cues.filter((x) => x.k === 'declare');
    const gone = r.cues.filter((x) => GONE.includes(x.slug));
    if (gone.length) bad.push(`① ${c}/${w}/${dec}: 걷은 선언 클립이 섰다 ${gone.map((x) => x.slug).join(',')}`);
    if (!cs.length) continue;   // 선언을 뺀 코스(있으면)
    const want = [INTRO[w] || 'narr-declare-in-friend', 'narr-declare-family-out'];
    if (cs.map((x) => x.slug).join() !== want.join()) bad.push(`② ${c}/${w}: 선언 큐 ${cs.map((x) => x.slug).join(',')} ≠ ${want.join(',')}`);
    if (!(cs[0].live && cs[0].live.self)) bad.push(`② ${c}/${w}: 여는 말 뒤 사람 낭독(live.self)이 없다`);
    if (cs.some((x) => /부부입니다|부부가 되었습니다/.test(x.text || ''))) bad.push(`② ${c}/${w}: 나레이션 글에 수행문(부부입니다)이 있다 — 선언은 읽는 분이 한다`);
  }
  // ③ 칩 · 예시
  const keys = Object.keys(D.DECLWHO);
  if (keys.join() !== 'gdad,bdad,friend') bad.push(`③ DECLWHO 가 셋(gdad · bdad · friend)이 아니다: ${keys.join()}`);
  if ((O.CHIPS.declare || []).map((x) => x[0]).join() !== keys.join()) bad.push(`③ 칩이 DECLWHO 와 다르다: ${(O.CHIPS.declare || []).map((x) => x[0]).join()}`);
  if ((O.CHIPS.declare || []).some((x) => /나레이션|가족|박수/.test(x[1]))) bad.push('③ 칩에 나레이션 · 가족 · 박수 판이 있다');
  for (const ex of O.EXAMPLES) { const s = O.applyExample({}, ex.k); if (s.declareWho) bad.push(`③ 예시 «${ex.nm}»이 읽을 분을 박았다(${s.declareWho})`); }
  for (const w of ['narr', 'family', 'ask', 'chorus', 'clap']) if (O.chipOf('declare', { declareWho: w }) !== '') bad.push(`③ 옛 값 ${w} 이 «안 고름»이 아니다`);
  // ④ AI 지식
  const full = KB.full || '';
  const i = full.indexOf('[성혼 선언]'), sec = i < 0 ? '' : full.slice(i, full.indexOf('\n\n', i));
  if (!sec) bad.push('④ AI 지식에 [성혼 선언] 절이 없다');
  else {
    if (!keys.every((k) => sec.includes(D.DECLWHO[k].d))) bad.push('④ AI 지식이 읽는 분 셋을 다 말하지 않는다');
    if (!/나레이션은 선언문을 읽지 않는다/.test(sec)) bad.push('④ AI 지식에 «나레이션은 선언문을 읽지 않는다»가 없다');
    if (!/서약으로 마무리/.test(sec)) bad.push('④ AI 지식에 «없으면 서약으로»가 없다');
    if (/낭독 주체 2종|엄숙하게:|따뜻하게:|가족 낭독:|나레이션이나 가족/.test(sec)) bad.push('④ AI 지식에 옛 갈래(나레이션 선언 · 가족 낭독)가 남았다');
  }
  // ⑤ 빌더
  for (const k of Object.keys(D.DECLARE || {})) if (D.DECLARE[k].nar && html.includes(D.DECLARE[k].nar)) bad.push(`⑤ 빌더에 나레이션 선언 글(DECLARE.${k})이 남았다`);
  if (!/L\('declare','누가 읽나요'/.test(html)) bad.push('⑤ 빌더 칩 이름이 «누가 읽나요»가 아니다');
  if (!/읽어 주실 분이 없으면 선언을 빼고 서약으로 마무리해요/.test(html)) bad.push('⑤ 빌더에 «없으면 선언을 빼고 서약으로» 한 줄이 없다');
  /* 설명은 «값»으로 잰다 — 이 저장소는 걷은 글을 ★ 주석으로 남기는 관례라 글자 검사가 제 주석을 잡는다([DECLWHO_LIVE] 교훈) */
  const pvDecl = (html.match(/\n  declare:'([^']+)'/) || [])[1] || '';
  if (!/아버님이나 친구 · 지인/.test(pvDecl) || /나레이션|가족이/.test(pvDecl)) bad.push('⑤ 빌더 ① 설명(PV_DESC.declare)이 «아버님이나 친구 · 지인»이 아니다: ' + pvDecl.slice(0, 60));
  if (!/서약으로 마무리/.test(pvDecl)) bad.push('⑤ 빌더 ① 설명에 «없으면 서약으로»가 없다');
  if (/나레이션|가족/.test(X.O.CARDS.declare.one + ' ' + X.O.CARDS.declare.who)) bad.push('⑤ ② 순간 설명(CARDS.declare)에 나레이션 · 가족이 남았다');
  if (/declareWho:'narr'|declareWho:'family'/.test(html)) bad.push('⑤ 빌더 기본값(S · COURSE_DEF)이 옛 갈래를 쥐고 있다');
  return bad;
}

const X = { D: require(path.join(ROOT, 'assets/ritual-data.js')), C: require(path.join(ROOT, 'assets/ritual-cue.js')),
  O: require(path.join(ROOT, 'assets/ritual-open.js')), KB: require(path.join(ROOT, 'api/_ritual-kb.js')), html: read('order-preview.html') };

if (process.argv.includes('--selftest')) {
  /* 깨 보기 — 하나씩 망가뜨려 판정이 빨강이 되는지 본다. 망가뜨린 사본만 쓰고 원천은 건드리지 않는다 */
  const brk = [
    ['빌더 칩 이름을 옛 «누가 · 말투»로', (x) => ({ ...x, html: x.html.replace("L('declare','누가 읽나요'", "L('declare','누가 · 말투'") })],
    ['① 설명을 옛 «나레이션이나 가족»으로', (x) => ({ ...x, html: x.html.replace(/(\n  declare:')[^']+'/, "$1하객 앞에서 성혼 선언문을 읽으면 두 분이 부부가 돼요. 선언문은 두 분 대신 나레이션이나 가족이 읽어요.'") })],
    ['빌더에 나레이션 선언 글을 되살림', (x) => ({ ...x, html: x.html + X.D.DECLARE['1'].nar })],
    ['AI 지식에 «낭독 주체 2종»을 되살림', (x) => ({ ...x, KB: { full: x.KB.full.replace('[성혼 선언]\n', '[성혼 선언]\n- 낭독 주체 2종(택1): 나레이션 / 가족 낭독.\n') } })],
    ['칩에 «나레이션» 갈래를 더함', (x) => ({ ...x, O: { ...x.O, CHIPS: { ...x.O.CHIPS, declare: [['narr', '나레이션']].concat(x.O.CHIPS.declare) } } })],
    ['엔진이 30(나레이션 선언)을 세움', (x) => ({ ...x, C: { build: (S, o) => { const r = x.C.build(S, o); return { ...r, cues: r.cues.concat([{ k: 'declare', slug: 'declare-1-solemn', text: '이제 두 사람은 부부입니다.' }]) }; } } })],
    ['예시가 신랑 아버님을 박음', (x) => ({ ...x, O: { ...x.O, applyExample: (s, k) => Object.assign(x.O.applyExample(s, k), { declareWho: 'gdad' }) } })],
  ];
  let miss = 0;
  for (const [nm, f] of brk) { const n = judgeA(f(X)).length; console.log(`${n ? 'ok  ' : 'FAIL'} 깨 보기 · ${nm} → 빨강 ${n}건`); if (!n) miss++; }
  const base = judgeA(X).length; console.log(`${base ? 'FAIL' : 'ok  '} 지금 원천은 초록(${base}건)`);
  process.exit(miss || base ? 1 : 0);
}

const badA = judgeA(X);
ok('A 엔진 · 원천 · AI 지식 · 빌더 사본 — 선언문은 사람만 · 나레이션은 여는 말 · 맺는 말만 · 칩 셋 · 예시는 박지 않음 · 없으면 서약으로 [DECLARE_BY_PERSON]', !badA.length, badA.slice(0, 6).join(' | '));

/* ── B. 화면(브라우저가 있을 때만) ── */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('B 못 쟀다 — playwright 없음(A 만 봤다)'); console.log(fail ? `\nDECLARE BY PERSON FAIL ${fail}` : '\nDECLARE BY PERSON OK (A)'); process.exit(fail ? 1 : 0); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOT = process.env.DECL_SHOT || '';
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; S.on.declare = 1; S.on.vow = 1; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(400); await pg.evaluate(() => mkGo('declare')); await wait(700);
    const look = () => pg.evaluate(() => {
      const rg = [...document.querySelectorAll('[role=radiogroup]')].filter((r) => /누가 읽나요/.test(r.getAttribute('aria-label')));
      const st = _lSteps(ENG, ['declare']);
      return { n: rg.length, chips: rg[0] ? [...rg[0].querySelectorAll('[role=radio]')].map((x) => x.textContent.trim()) : [], pressed: rg[0] ? rg[0].querySelectorAll('[aria-checked=true]').length : -1,
        note: rg[0] ? ((rg[0].querySelector('.mk-vpask1') || {}).textContent || '') : '',
        labs: st.filter((x) => !x.quiet).map((x) => x.talk ? 'T' : x.lab), turn: [...document.querySelectorAll('.mk-flow li.t b, li.t b')].map((b) => b.textContent.trim()),
        ref: [...document.querySelectorAll('.mk-ref .mk-rw')].map((p) => p.textContent.trim()), who: S.declareWho };
    });
    const a = await look();
    ok(`${w} ① 칩 «누가 읽나요» 셋(신랑 아버님 · 신부 아버님 · 친구 · 지인) · 처음엔 안 눌림 · 안 고른 한 줄 «없으면 선언을 빼고 서약으로»`,
      a.n === 1 && a.chips.join('|') === '신랑 아버님|신부 아버님|친구 · 지인' && a.pressed === 0 && /읽어 주실 분이 없으면 선언을 빼고 서약으로 마무리해요/.test(a.note), JSON.stringify(a));
    ok(`${w} ① 흐름 «시작할 때 → 읽으실 차례 → 끝나면» · 나레이션 선언 줄 없음`, a.labs.join('|') === '시작할 때|T|끝나면' && a.turn.some((t) => /읽으실 차례/.test(t)), JSON.stringify({ labs: a.labs, turn: a.turn }));
    if (SHOT) await pg.screenshot({ path: `${SHOT}/declare-${w}-unpicked.png`, fullPage: false });
    await pg.click('[data-fk="lsc:declare:bdad"]'); await wait(700);
    const toast = await pg.evaluate(() => { const t = document.getElementById('lsToast'); return t && !t.hidden ? t.textContent.trim() : ''; });
    const b = await look();
    ok(`${w} ② «신부 아버님» → 눌림 하나 · 한 줄 사라짐 · 알림 «선언문은 저희가 인쇄해 드려요» · 차례 «신부 아버님 차례» · 참고 예시에 «신부 아버님»`,
      b.who === 'bdad' && b.pressed === 1 && !b.note && /선언문은 저희가 인쇄해 드려요/.test(toast) && b.turn.some((t) => t === '신부 아버님 차례') && b.ref.some((t) => /^신부 아버님/.test(t)),
      JSON.stringify({ who: b.who, pressed: b.pressed, note: b.note, toast, turn: b.turn, ref: b.ref.map((t) => t.slice(0, 20)) }));
    const eng = await pg.evaluate(() => ENG.RitualCue.build(S, { mode: 'preview' }).cues.filter((x) => x.k === 'declare').map((x) => x.file));
    ok(`${w} ② 엔진 큐 = 135 여는 말 · 57 맺는 말`, eng.join() === '135_narr-declare-in-bdad,57_narr-declare-family-out', eng.join());
    if (SHOT) await pg.screenshot({ path: `${SHOT}/declare-${w}-bdad.png`, fullPage: false });
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nDECLARE BY PERSON FAIL ${fail}` : '\nDECLARE BY PERSON OK'); process.exit(fail ? 1 : 0);
