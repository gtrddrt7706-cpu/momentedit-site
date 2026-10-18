// ★★[DECLARE_BY_PERSON 2026-10-12 사장님 «성혼 선언은 나레이션이 하지 않을 거야 · 아버지나 친구 지인분이 하게만 할 거야 · 그게 싫다면 서약으로» → «관련있는거 전부 반영»]
// ★★[DECLARE_ANYONE 2026-10-12 사장님 «예를 들어 아버지 지인 친구 뭐 이렇게 얘기한 거지 특정한 인물을 넣어 놓지는 말자» ·
//     «선언 낭독자는 지정해야 하는 건 맞아 · 나레이션이 안 하기 때문에» · «일반적으로 누가 하는 게 좋은지는 작성하는 곳에 예시로»]
//   선언문은 사람만 읽는다 — 누구인지는 두 분이 «읽어 주실 분» 칸에 직접 적는다(S.declareWho = 적은 글 · 칩 · 목록 없음).
//   예시(«예) 아버님 · 친구 · 지인»)는 그 칸에만 보인다. 나레이션은 여는 말(136 · 누가 읽든 하나) · 맺는 말(57 · 축하 박수)만.
//   읽어 줄 분이 없으면 성혼 선언을 빼고 서약으로 마무리한다(① 에서 순간 빼기 · 칸이 비면 화면이 한 줄로 알린다).
//
//   A(브라우저 없이 · 늘 돈다) — 엔진 · 원천 · AI 지식 · 빌더 사본 · 미리 듣기 주소 · 관리자
//     ① 어떤 저장값(옛 칩 값 · 옛 갈래 · 적은 글)으로도 걷은 선언 클립(21 · 30 · 31 · 32 · 96 · 97 · 134 · 135)이 큐에 안 선다
//     ② 선언 큐 = 여는 말 136 → 사람 낭독(live.self · 콘솔에 적은 분) → 맺는 말 57 · 나레이션 글에 «부부입니다» 수행문 없음
//     ③ 칩 없음(CHIPS.declare) · 옛 값 규칙(gdad · bdad = 그 이름 · 그 밖 = 빈칸) · 예시 넷은 읽을 분을 박지 않는다 · 설명에 특정한 분 없음
//     ④ AI 지식 — «읽어 주실 분» 칸 · 고르는 목록이 아니다 · «나레이션은 선언문을 읽지 않는다» · «없으면 서약으로» · 옛 «N종(택1)» 없음
//     ⑤ 빌더 — 칸(data-fk="declwho") · 예시는 칸 안 · 칩 줄 없음 · 칸이 비면 한 줄 · 설명에 특정한 분 없음 · 여는 말 사본이 원천과 같다
//     ⑥ 미리 듣기 주소에 읽는 분 글을 싣지 않는다(공개 주소 · 사람 이름일 수 있다)
//   B(브라우저가 있을 때 · 390 · 1280) — ② 하나씩 만들기 성혼 선언 화면
//     칸 하나 · 예시 글 · 비었을 때 한 줄 · 흐름 «시작할 때 · 읽으실 차례 · 끝나면» → «신부 아버님» 적으면 «신부 아버님 차례» · 참고 예시에 그 이름 · 엔진 136 → 57
//   --selftest — A 의 판정을 일부러 깨 보고 빨강이 되는지 본다([DECISION_GUARD] 깨 보고 믿는다)
//   종료 코드 0 = 통과 · 1 = 실패 · (B 를 못 재면 A 만 보고 그 사실을 한 줄로)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (f) => fs.readFileSync(path.join(ROOT, f), 'utf8');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

const GONE = ['declare-1-solemn', 'declare-2-warm', 'declare-family', 'declare-clap-a', 'declare-clap-b', 'narr-declare-family-intro', 'declare-ask-a', 'declare-ask-b', 'declare-ask-c',
  'narr-declare-in-gdad', 'narr-declare-in-bdad'];   // [DECLARE_ANYONE] 사람을 부르는 여는 말 134 · 135 도 걷었다
const OLD_WHO = ['', 'gdad', 'bdad', 'friend', 'narr', 'family', 'ask', 'chorus', 'clap', 'solemn', '신부 아버님', '  신랑의 오랜 친구  김지훈 '];
const OLD_MAP = { gdad: '신랑 아버님', bdad: '신부 아버님', friend: '', narr: '', family: '', ask: '', chorus: '', clap: '' };
const PERSONS = /신랑 아버님|신부 아버님|아버님이나 친구|친구 · 지인 한 분/;   // 설명 · 글에 박히면 안 되는 «특정한 분» 꼴(예시 칸 글은 따로 본다)

/* ── A. 판정은 한 곳 — 원천을 받아 위반 목록을 돌려준다(본문과 깨 보기가 같은 함수를 쓴다) ── */
function judgeA(X) {
  const bad = [];
  const { D, C, O, KB, html, PK } = X;
  // ①② 엔진
  for (const c of Object.keys(D.COURSES)) for (const w of OLD_WHO) for (const dec of ['1', '2', 'clap', undefined]) {
    const S = { course: c, declareWho: w, declare: dec };
    if (D.COURSES[c].open) S.on = { declare: 1, vow: 1, ring: 1 };
    let r; try { r = C.build(S, { mode: 'console' }); } catch (e) { bad.push(`① ${c}/${w}: 엔진이 멈췄다 ${e.message}`); continue; }
    const cs = r.cues.filter((x) => x.k === 'declare' && !/^bridge-/.test(x.slug));   // [CLOSE_SEAM_1018] 선언이 마지막인 날 B9(이음말)도 선언 몫에 선다 — 선언 대사만 센다
    const gone = r.cues.filter((x) => GONE.includes(x.slug));
    if (gone.length) bad.push(`① ${c}/${w}/${dec}: 걷은 선언 클립이 섰다 ${gone.map((x) => x.slug).join(',')}`);
    if (!cs.length) continue;
    const want = ['narr-declare-in-friend', 'narr-declare-family-out'];
    if (cs.map((x) => x.slug).join() !== want.join()) bad.push(`② ${c}/${w}: 선언 큐 ${cs.map((x) => x.slug).join(',')} ≠ ${want.join(',')}`);
    const lv = cs[0].live || {};
    if (!lv.self) bad.push(`② ${c}/${w}: 여는 말 뒤 사람 낭독(live.self)이 없다`);
    const who = O.declBy({ declareWho: w }) || '선언하실 분';
    if (lv.who !== who) bad.push(`② ${c}/${w}: 콘솔 «읽는 분»이 «${lv.who}» — 두 분이 적은 «${who}»가 아니다`);
    if (cs.some((x) => /부부입니다|부부가 되었습니다/.test(x.text || ''))) bad.push(`② ${c}/${w}: 나레이션 글에 수행문(부부입니다)이 있다 — 선언은 읽는 분이 한다`);
    if (cs.some((x) => PERSONS.test(x.text || ''))) bad.push(`② ${c}/${w}: 나레이션 여는 말이 특정한 분을 부른다`);
  }
  // ③ 원천 · 칩 · 예시
  if (D.DECLWHO) bad.push('③ 원천에 읽는 분 목록(DECLWHO)이 남았다');
  /* [SOURCE_FIRST_1016] 선언문은 자료 I 공통 구조 3 · 4(«양가 친지와 내빈 앞에서 새 출발 … 엄숙히 선언합니다») 그대로 — 옛 «성혼을 선언합니다»만 보던 자를 넓혔다 */
  if (!D.DECLBY || !/(성혼을|부부가 되었음을 엄숙히) 선언합니다/.test(D.DECLBY.nar || '')) bad.push('③ 원천 선언문(DECLBY.nar)이 없다');
  if (D.NARR.declareInGdad || D.NARR.declareInBdad) bad.push('③ 사람을 부르는 여는 말(NARR.declareInGdad · Bdad)이 남았다');
  if (!D.NARR.declareIn || PERSONS.test(D.NARR.declareIn)) bad.push('③ 여는 말(NARR.declareIn)이 없거나 특정한 분을 부른다');
  if (O.CHIPS.declare) bad.push('③ 성혼 선언 칩(CHIPS.declare)이 되살아났다');
  for (const [k, v] of Object.entries(OLD_MAP)) if (O.declBy({ declareWho: k }) !== v) bad.push(`③ 옛 값 ${k} → «${O.declBy({ declareWho: k })}»(기대 «${v}»)`);
  if (O.declBy({ declareWho: ' 신부\n 아버님 ' }) !== '신부 아버님' || O.declBy({ declareWho: 'ㄱ'.repeat(50) }).length !== O.DECL_MAX) bad.push('③ 적은 글 다듬기(빈칸 · 줄바꿈 · 30자)가 틀렸다');
  if (!/아버님/.test(O.DECL_HINT) || !/친구/.test(O.DECL_HINT) || !/지인/.test(O.DECL_HINT) || !/^예\)/.test(O.DECL_HINT)) bad.push(`③ 칸의 예시(DECL_HINT)가 «예) 아버님 · 친구 · 지인»이 아니다: ${O.DECL_HINT}`);
  for (const ex of O.EXAMPLES) { const s = O.applyExample({}, ex.k); if (s.declareWho) bad.push(`③ 예시 «${ex.nm}»이 읽을 분을 박았다(${s.declareWho})`); }
  if (PERSONS.test(O.CARDS.declare.one + ' ' + O.CARDS.declare.who) || /나레이션|가족/.test(O.CARDS.declare.one + ' ' + O.CARDS.declare.who)) bad.push('③ ② 순간 설명(CARDS.declare)에 특정한 분 · 나레이션 · 가족이 있다');
  if (O.CHOOSE_AT_LISTEN.declare !== '읽어 주실 분') bad.push(`③ 미리 보기 창 «고를 것»이 «${O.CHOOSE_AT_LISTEN.declare}» — 칸 이름 «읽어 주실 분»과 다르다`);
  // ④ AI 지식
  const full = KB.full || '';
  const i = full.indexOf('[성혼 선언]'), sec = i < 0 ? '' : full.slice(i, full.indexOf('\n\n', i));
  if (!sec) bad.push('④ AI 지식에 [성혼 선언] 절이 없다');
  else {
    if (!/«읽어 주실 분» 칸/.test(sec) || !/고르는 목록이 아니다/.test(sec)) bad.push('④ AI 지식이 «읽어 주실 분 칸 · 목록 아님»을 말하지 않는다');
    if (/\d종\(택1\)|신랑 아버님 \/ 신부 아버님/.test(sec)) bad.push('④ AI 지식이 읽는 분을 «N종(택1)» 목록으로 말한다');
    if (!/나레이션은 선언문을 읽지 않는다/.test(sec)) bad.push('④ AI 지식에 «나레이션은 선언문을 읽지 않는다»가 없다');
    if (!/서약으로 마무리/.test(sec)) bad.push('④ AI 지식에 «없으면 서약으로»가 없다');
    if (/낭독 주체 2종|엄숙하게:|따뜻하게:|가족 낭독:|나레이션이나 가족/.test(sec)) bad.push('④ AI 지식에 옛 갈래(나레이션 선언 · 가족 낭독)가 남았다');
  }
  // ⑤ 빌더
  for (const k of Object.keys(D.DECLARE || {})) if (D.DECLARE[k].nar && html.includes(D.DECLARE[k].nar)) bad.push(`⑤ 빌더에 나레이션 선언 글(DECLARE.${k})이 남았다`);
  if (/L\('declare','누가 읽나요'|Object\.keys\(DECLWHO\)|oc\('declareWho'/.test(html)) bad.push('⑤ 빌더에 읽는 분 칩 · 목록이 남았다');
  if (!/key:'declareWho',l:'읽어 주실 분'/.test(html) || !/data-fk=\\"declwho\\"|data-fk="declwho"|data-fk=\\\\"declwho\\\\"/.test(html) || !/placeholder=\\?"'\+esc\(R\.DECL_HINT\)/.test(html)) bad.push('⑤ 빌더에 «읽어 주실 분» 칸(예시는 칸 안)이 없다');
  if (!/아직 적지 않았어요 · 읽어 주실 분이 없으면 선언을 빼고 서약으로 마무리해요/.test(html)) bad.push('⑤ 빌더에 칸이 비었을 때 한 줄이 없다');
  /* 설명은 «값»으로 잰다 — 이 저장소는 걷은 글을 ★ 주석으로 남기는 관례라 글자 검사가 제 주석을 잡는다([DECLWHO_LIVE] 교훈) */
  const pvDecl = (html.match(/\n  declare:'([^']+)'/) || [])[1] || '';
  if (!/두 분이 정하신 한 분이 읽/.test(pvDecl) || PERSONS.test(pvDecl) || /나레이션|가족이/.test(pvDecl)) bad.push('⑤ 빌더 ① 설명(PV_DESC.declare)이 «두 분이 정하신 한 분»이 아니다: ' + pvDecl.slice(0, 60));
  if (!/서약으로 마무리/.test(pvDecl)) bad.push('⑤ 빌더 ① 설명에 «없으면 서약으로»가 없다');
  const din = (html.match(/var DECL_IN="([^"]+)";/) || [])[1];
  if (din !== D.NARR.declareIn) bad.push(`⑤ 빌더 여는 말 사본(DECL_IN)이 원천과 다르다: ${din}`);
  if (/declareWho:'narr'|declareWho:'family'|declareWho:'gdad'/.test(html)) bad.push('⑤ 빌더 기본값(S · COURSE_DEF)이 읽는 분을 쥐고 있다');
  // ⑥ 미리 듣기 주소
  if ((PK || []).indexOf('declareWho') > -1) bad.push('⑥ 미리 듣기 주소(KEYS)에 읽는 분 글(declareWho)이 실린다 — 공개 주소에 이름이 남는다');
  return bad;
}

const linkPK = (src) => { const w = {}; new Function('window', src)(w); return (w.RitualPreviewLink || {}).KEYS || []; };
const X = { D: require(path.join(ROOT, 'assets/ritual-data.js')), C: require(path.join(ROOT, 'assets/ritual-cue.js')),
  O: require(path.join(ROOT, 'assets/ritual-open.js')), KB: require(path.join(ROOT, 'api/_ritual-kb.js')), html: read('order-preview.html'),
  PK: linkPK(read('assets/ritual-preview-link.js')) };

if (process.argv.includes('--selftest')) {
  /* 깨 보기 — 하나씩 망가뜨려 판정이 빨강이 되는지 본다. 망가뜨린 사본만 쓰고 원천은 건드리지 않는다 */
  const brk = [
    ['빌더에 칩 줄 «누가 읽나요»를 되살림', (x) => ({ ...x, html: x.html + "\n  if(k==='declare') L('declare','누가 읽나요',R.CHIPS.declare,R.chipOf('declare',S));" })],
    ['① 설명을 «아버님이나 친구 · 지인 한 분»으로', (x) => ({ ...x, html: x.html.replace(/(\n  declare:')[^']+'/, "$1하객 앞에서 성혼 선언문을 읽으면 두 분이 부부가 돼요. 선언문은 두 분 대신 아버님이나 친구 · 지인 한 분이 읽어요. 읽어 주실 분이 없으면 선언을 빼고 서약으로 마무리해요.'") })],
    ['빌더에 나레이션 선언 글을 되살림', (x) => ({ ...x, html: x.html + X.D.DECLARE['1'].nar })],
    ['AI 지식이 «읽는 분 3종(택1)»으로', (x) => ({ ...x, KB: { full: x.KB.full.replace('[성혼 선언]\n', '[성혼 선언]\n- 읽는 분 3종(택1): 신랑 아버님 / 신부 아버님 / 친구 · 지인.\n') } })],
    ['칩(CHIPS.declare)을 되살림', (x) => ({ ...x, O: { ...x.O, CHIPS: { ...x.O.CHIPS, declare: [['gdad', '신랑 아버님'], ['bdad', '신부 아버님']] } } })],
    ['엔진이 신랑 아버님 여는 말(134)을 세움', (x) => ({ ...x, C: { build: (S, o) => { const r = x.C.build(S, o); return { ...r, cues: r.cues.map((c) => c.slug === 'narr-declare-in-friend' ? { ...c, slug: 'narr-declare-in-gdad' } : c) }; } } })],
    ['예시가 신부 아버님을 박음', (x) => ({ ...x, O: { ...x.O, applyExample: (s, k) => Object.assign(x.O.applyExample(s, k), { declareWho: '신부 아버님' }) } })],
    ['미리 듣기 주소에 읽는 분 글을 실음', (x) => ({ ...x, PK: x.PK.concat(['declareWho']) })],
  ];
  let miss = 0;
  for (const [nm, f] of brk) { const n = judgeA(f(X)).length; console.log(`${n ? 'ok  ' : 'FAIL'} 깨 보기 · ${nm} → 빨강 ${n}건`); if (!n) miss++; }
  const base = judgeA(X).length; console.log(`${base ? 'FAIL' : 'ok  '} 지금 원천은 초록(${base}건)`);
  process.exit(miss || base ? 1 : 0);
}

const badA = judgeA(X);
ok('A 엔진 · 원천 · AI 지식 · 빌더 사본 · 주소 — 선언문은 사람만 · 읽는 분은 두 분이 칸에 적는다 · 여는 말 하나 · 예시는 칸 안에만 · 없으면 서약으로 [DECLARE_BY_PERSON · DECLARE_ANYONE]', !badA.length, badA.slice(0, 6).join(' | '));

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
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; S.on.declare = 1; S.on.vow = 1; S.declareWho = ''; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(400); await pg.evaluate(() => mkGo('declare')); await wait(700);
    const look = () => pg.evaluate(() => {
      const inp = document.querySelector('[data-fk="declwho"]');
      const row = inp && inp.closest('.ls-cg');
      const st = _lSteps(ENG, ['declare']);
      const r = inp ? inp.getBoundingClientRect() : null;
      return { n: document.querySelectorAll('[data-fk="declwho"]').length, ph: inp ? inp.placeholder : '', val: inp ? inp.value : '', lab: row ? ((row.querySelector('.gl') || {}).textContent || '') : '',
        note: row ? ((row.querySelector('.ls-gnote') || {}).textContent || '') : '', chips: [...document.querySelectorAll('[role=radiogroup]')].filter((g) => /누가 읽나요/.test(g.getAttribute('aria-label') || '')).length,
        fit: r ? (r.right <= innerWidth && r.width >= 200) : false, phFits: inp ? inp.scrollWidth <= inp.clientWidth + 1 : false,
        labs: st.filter((x) => !x.quiet).map((x) => x.talk ? 'T' : x.lab), turn: [...document.querySelectorAll('.mk-flow li.t b, li.t b')].map((b) => b.textContent.trim()),
        ref: [...document.querySelectorAll('.mk-ref .mk-rw')].map((p) => p.textContent.trim()), who: S.declareWho };
    });
    const a = await look();
    ok(`${w} ① 칸 «읽어 주실 분» 하나 · 칩 없음 · 예시 «예) 아버님 · 친구 · 지인»(칸 안 · 잘리지 않음) · 비었을 때 한 줄 «없으면 선언을 빼고 서약으로»`,
      a.n === 1 && a.chips === 0 && a.lab === '읽어 주실 분' && a.ph === '예) 아버님 · 친구 · 지인' && a.val === '' && a.fit && /아직 적지 않았어요 · 읽어 주실 분이 없으면 선언을 빼고 서약으로 마무리해요/.test(a.note), JSON.stringify(a));
    ok(`${w} ① 흐름 «시작할 때 → 읽으실 차례 → 끝나면» · 나레이션 선언 줄 없음`, a.labs.filter((l) => l !== '다음 순서로 넘어가며').join('|') === '시작할 때|T|끝나면' && a.turn.some((t) => /읽으실 차례/.test(t)), JSON.stringify({ labs: a.labs, turn: a.turn }));
    if (SHOT) await pg.screenshot({ path: `${SHOT}/declare-${w}-empty.png`, fullPage: false });
    await pg.fill('[data-fk="declwho"]', '신부  아버님 '); await pg.press('[data-fk="declwho"]', 'Tab'); await wait(700);
    const b = await look();
    ok(`${w} ② «신부 아버님» 적음 → 다듬어 저장 · 한 줄 사라짐 · 차례 «신부 아버님 차례» · 참고 예시에 «신부 아버님»`,
      b.who === '신부 아버님' && b.val === '신부 아버님' && !b.note && b.turn.some((t) => t === '신부 아버님 차례') && b.ref.some((t) => /^신부 아버님/.test(t)),
      JSON.stringify({ who: b.who, val: b.val, note: b.note, turn: b.turn, ref: b.ref.map((t) => t.slice(0, 20)) }));
    const eng = await pg.evaluate(() => { const cs = ENG.RitualCue.build(S, { mode: 'console' }).cues.filter((x) => x.k === 'declare' && !/^bridge-/.test(x.slug)); return { f: cs.map((x) => x.file).join(), who: (cs[0].live || {}).who }; });
    ok(`${w} ② 엔진 큐 = 136 여는 말 · 57 맺는 말 · 콘솔 읽는 분 «신부 아버님»`, eng.f === '136_narr-declare-in-friend,57_narr-declare-family-out' && eng.who === '신부 아버님', JSON.stringify(eng));
    if (SHOT) await pg.screenshot({ path: `${SHOT}/declare-${w}-filled.png`, fullPage: false });
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nDECLARE BY PERSON FAIL ${fail}` : '\nDECLARE BY PERSON OK'); process.exit(fail ? 1 : 0);
