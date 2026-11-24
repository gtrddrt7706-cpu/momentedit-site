// ★[PLAY_WAIT_FILE · PR_AI_READ 2026-10-05 사장님 «준비됨인데 왜 목소리가 안 나오지» · «AI 목소리 등록했으니 입혀서 들어 볼 수도»] 실브라우저(390 · 1280)
//   A. 두 분 소리 파일이 늦게 오는 판(_rfGet 1.5초) — 입장 줄을 틀면 «불러오는 중» → 파일이 오면 그 소리로 틀고 이름표 «두 분 목소리» (예시 글로 넘어가지 않는다)
//   B. 파일이 끝내 안 오면(8초) 종전대로 글만 · 오류 없음
//   C. 연습 방법 = 시작 카드 하나(직접 소리 내어 · [PR_SIMPLE_1124] · 옛 A AI 로 먼저는 은퇴) [PR_MODE] — 직접이면 말하는 차례에 «소리 내어 읽어» 안내 + 남은 시간 막대 [PR_CUE] · AI 면 처음 알림 뒤 그 차례를 AI 연습 소리로
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.addInitScript(() => { const o = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { window.__src = this.getAttribute('src') || this.src || ''; (window.__srcs = window.__srcs || []).push(window.__src); return Promise.resolve(); }; });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
    const setUp = async (delay) => pg.evaluate((d) => { courseStarted = true; S.on = S.on || {}; ['entry', 'vow'].forEach((k) => { S.on[k] = 1; }); S.entryVoice = 'couple'; S.touched = Object.assign({}, S.touched, { entryVoice: 1 });   /* [VP_ASK_FIRST] 고른 판 */ S.up = S.up || {}; S.up.entry = { n: '녹음', id: 'f-entry-1', src: 'rec' };
      for (const k in RF_URL) delete RF_URL[k]; for (const k in RF_LOAD) delete RF_LOAD[k];
      _rfGet = (id) => new Promise((ok) => { if (d < 0) { ok(null); return; } setTimeout(() => ok(new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/wav' })), d); });
      for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'practice') { idx = i; render(); } }, delay);
    // A
    await setUp(1500); await wait(300);
    await pg.evaluate(() => { for (const k in RF_URL) delete RF_URL[k]; for (const k in RF_LOAD) delete RF_LOAD[k]; window.__src = ''; prFrom('entry'); });
    await wait(400);
    const a0 = await pg.evaluate(() => ({ k: (LP.q[LP.i] || {}).k, load: LP.loadK, note: /불러오는 중/.test((document.getElementById('lsFull') || {}).textContent || '') }));
    await wait(2200);
    const a1 = await pg.evaluate(() => { const st = LP.q[LP.i] || {}; return { k: st.k, src: /^blob:/.test(st.src || ''), lab: st.lab, played: /^blob:/.test(window.__src || ''), load: LP.loadK }; });
    ok(`${w} A 파일이 늦게 오는 입장 줄 — «불러오는 중» 뒤 그 소리로 튼다 · 이름표 «두 분 목소리» [PLAY_WAIT_FILE]`, a0.k === 'entry' && a0.load === 'entry' && a0.note && a1.k === 'entry' && a1.src && a1.played && /^두 분 목소리/.test(a1.lab) && !a1.load, JSON.stringify({ a0, a1 }));
    await pg.evaluate(() => lsStop()); await wait(300);
    // B
    await setUp(-1); await wait(300);
    await pg.evaluate(() => { for (const k in RF_URL) delete RF_URL[k]; for (const k in RF_LOAD) delete RF_LOAD[k]; prFrom('entry'); });
    await wait(8800);
    const b1 = await pg.evaluate(() => ({ k: (LP.q[LP.i] || {}).k, load: LP.loadK, src: (LP.q[LP.i] || {}).src || null, paused: LP.paused }));
    ok(`${w} B 파일이 끝내 안 오면 8초 뒤 글만(멈춰 서지 않는다)`, !b1.load && !b1.paused, JSON.stringify(b1));
    await pg.evaluate(() => lsStop()); await wait(300);
    // C — 연습 방법 고르기 [PR_MODE] · 말하는 차례 안내 [PR_CUE]
    await pg.evaluate(() => { RitualOpen.FEATURE.practiceTts = true; try { localStorage.removeItem('me_ptts_ok'); localStorage.removeItem('me_pr_mode'); } catch (e) {} PT.mode = ''; window.__vcCalls = [];   /* [PR_MODE_UNPICKED] 들어올 때 = 고르기 전 */
      _vc0 = (op, d) => { window.__vcCalls.push(op + ':' + (d && d.role)); return new Promise((ok) => setTimeout(() => ok({ ok: true, mime: 'audio/mpeg', data: btoa('MP3DATA') }), 300)); }; render(); });
    await wait(300);
    const m0 = await pg.evaluate(() => ({ mode: !!document.querySelector('.pr-mode, [data-fk^="prm:"]'), n: document.querySelectorAll('.pr-sts .pr-st').length, a: !!document.querySelector('[data-fk="prall"]'), b: ((document.querySelector('[data-fk="prtry"] .pr-hl b') || {}).textContent || '') }));
    ok(`${w} C 연습 시작 카드 하나(«직접 소리 내어 해보기») · AI 카드 · 고르기 칸 없음 [PR_SIMPLE_1124 · 옛 기대 = 카드 둘(PR_CLEAN_1123)]`, !m0.mode && m0.n === 1 && !m0.a && m0.b === '직접 소리 내어 해보기', JSON.stringify(m0));
    // 직접 — 말하는 차례 안내 + 막대 · AI 안 부름
    await pg.evaluate(() => { prFrom('vow'); }); await wait(500);
    const d0 = await pg.evaluate(() => { const j = LP.q.findIndex((x, i) => i >= LP.i && x.talk2); if (j > -1) { LP.i = j; _lShow(); } const f = document.getElementById('lsFull'); const kids = [...f.querySelectorAll('.lf-lab.who, .lf-cue, .lf-txt, .lf-tbar, .lf-ref')].map((e) => e.className.split(' ')[0] + (e.classList.contains('who') ? '.who' : '')); return { cue: (f.querySelector('.lf-cue') || {}).textContent || '', bar: !!f.querySelector('.lf-tbar'), calls: window.__vcCalls.length, order: kids.join('>'), chips: f.querySelectorAll('[data-fk^="lfr:"]').length }; });
    ok(`${w} C «직접» — 말하는 차례에 «…소리 내어 읽어 …» 안내 · 남은 시간 막대 · AI 안 부름 [PR_CUE]`, /소리 내어/.test(d0.cue) && d0.bar && d0.calls === 0, JSON.stringify(d0));
    ok(`${w} C 말하는 차례 순서 = 누구 차례 → 할 일 → 남은 시간(TBAR_UP) → 글 → 글의 출처 · 연습 중 예시 번호 칩 없음 [PR_ORDER]`, /^lf-lab\.who>lf-cue>lf-tbar>lf-txt(>lf-ref)*$/.test(d0.order) && d0.chips === 0, JSON.stringify(d0));
    await pg.evaluate(() => lsStop()); await wait(300);
    /* ★[PR_SIMPLE_1124 2026-11-24 사장님 «ai 목소리 먼저 듣기 이거는 삭제하자»] (옛 [PR_ORDER] 라디오 기대는 PR_CLEAN_1123 에서 이미 은퇴) 연습하기의 «AI 로 먼저»(A 카드 · 업체 알림 · 준비 칸 · PT_PREP · PT_TUNE · PT_NO_STALL) 기대 은퇴 —
       AI 연습 읽기 스위치(practiceTts)가 켜져 있어도 연습하기에서는 AI 로 읽지 않는다(_ptAi false) · 말하는 차례는 «소리 내어 읽어» 안내 */
    const ai0 = await pg.evaluate(() => { PT.mode = 'ai'; const r = { ai: _ptAi(), a: !!document.querySelector('[data-fk="prall"]'), prep: !!document.getElementById('prPrep') }; PT.mode = 'self'; return r; });
    ok(`${w} C 연습하기 AI 로 먼저 은퇴 — 스위치가 켜져 있어도 _ptAi false · A 카드 · 준비 칸 없음 [PR_SIMPLE_1124]`, ai0.ai === false && !ai0.a && !ai0.prep, JSON.stringify(ai0));
    await pg.evaluate(() => { lsStop(); RitualOpen.FEATURE.practiceTts = false; render(); }); await wait(300);
    await pg.evaluate(() => { try { localStorage.removeItem('me_pr_mode'); } catch (e) {} PT.mode = 'self'; });
    // [TURN_BREATH] 말하는 차례 앞 숨(연습은 공통 진행 상수 표 «안내 → 두 분 말» 3.0초에서 파일 뒤 무음을 뺀 값 · [PR_WAY_198 보충 상2]) — 화면은 먼저 바뀌고 소리 · 시계는 뒤에 · [TBAR_ALWAYS] 멈춤에도 막대 자리
    await pg.evaluate(() => { PT.mode = 'self'; try { localStorage.setItem('me_pr_mode', 'self'); } catch (e) {} lsStop(); prFrom('vow', 1); }); await wait(500);
    const tb = await pg.evaluate(() => { const j = LP.q.findIndex((x, i) => i > 0 && x.talk2 && !LP.q[i - 1].talk2); LP.i = j - 1; LP.paused = false; const t0 = Date.now(); _lNext(); return { j, at: LP.i, k: (LP.q[LP.i] || {}).k, talk2: !!(LP.q[LP.i] || {}).talk2, cue: !!document.querySelector('#lsFull .lf-cue'), tAt: LP.tAt, gap: _lGapOf(LP.q, LP.i, LP.q[LP.i - 1], LP.q[LP.i], LP.pace).gap }; });
    await wait(700);
    const tb1 = await pg.evaluate(() => ({ tAt: LP.tAt }));
    await wait(Math.max(1300, tb.gap - 700 + 600));
    const tb2 = await pg.evaluate(() => ({ tAt: LP.tAt, bar: !!document.querySelector('#lsFull .lf-tbar') }));
    ok(`${w} 말하는 차례 앞 숨(상수 표 · 1초 넘게) — 화면은 바로 «신랑 차례 · 할 일» · 시계는 숨 뒤에 [TURN_BREATH]`, tb.talk2 && tb.cue && tb.gap > 1000 && !tb.tAt && !tb1.tAt && tb2.tAt > 0 && tb2.bar, JSON.stringify({ tb, tb1, tb2 }));
    await pg.evaluate(() => { lsToggle(); }); await wait(300);
    ok(`${w} 멈춰도 말하는 차례엔 막대 자리가 남는다 [TBAR_ALWAYS]`, await pg.evaluate(() => LP.paused && !!document.querySelector('#lsFull .lf-tbar.still')));
    await pg.evaluate(() => lsStop()); await wait(300);
    /* ★[PT_PREP_RETRY] 기대 은퇴 — 연습하기 AI 로 먼저가 없다 [PR_SIMPLE_1124] */
    await pg.evaluate(() => { lsStop(); PT.mode = 'self'; RitualOpen.FEATURE.practiceTts = false; });
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nPLAY WAIT FILE FAIL ${fail}` : '\nPLAY WAIT FILE OK'); process.exit(fail ? 1 : 0);
