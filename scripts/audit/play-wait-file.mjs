// ★[PLAY_WAIT_FILE · PR_AI_READ 2026-10-05 사장님 «준비됨인데 왜 목소리가 안 나오지» · «AI 목소리 등록했으니 입혀서 들어 볼 수도»] 실브라우저(390 · 1280)
//   A. 두 분 소리 파일이 늦게 오는 판(_rfGet 1.5초) — 입장 줄을 틀면 «불러오는 중» → 파일이 오면 그 소리로 틀고 이름표 «두 분 목소리» (예시 글로 넘어가지 않는다)
//   B. 파일이 끝내 안 오면(8초) 종전대로 글만 · 오류 없음
//   C. 연습 방법 고르기(직접 · AI 로 먼저) [PR_MODE] — 직접이면 말하는 차례에 «소리 내어 읽어» 안내 + 남은 시간 막대 [PR_CUE] · AI 면 처음 알림 뒤 그 차례를 AI 연습 소리로
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
    const m0 = await pg.evaluate(() => ({ n: document.querySelectorAll('.pr-mode [role="radio"]').length, on: (document.querySelector('.pr-mode [aria-checked="true"]') || {}).getAttribute ? document.querySelector('.pr-mode [aria-checked="true"]').getAttribute('data-fk') : '' }));
    ok(`${w} C 연습 방법 둘(직접 · AI 로 먼저) · 처음엔 둘 다 비어 있다(고르기 전엔 직접처럼 흐른다) [PR_MODE · PR_MODE_UNPICKED]`, m0.n === 2 && m0.on === '', JSON.stringify(m0));
    // 직접 — 말하는 차례 안내 + 막대 · AI 안 부름
    await pg.evaluate(() => { prFrom('vow'); }); await wait(500);
    const d0 = await pg.evaluate(() => { const j = LP.q.findIndex((x, i) => i >= LP.i && x.talk2); if (j > -1) { LP.i = j; _lShow(); } const f = document.getElementById('lsFull'); const kids = [...f.querySelectorAll('.lf-lab.who, .lf-cue, .lf-txt, .lf-tbar, .lf-ref')].map((e) => e.className.split(' ')[0] + (e.classList.contains('who') ? '.who' : '')); return { cue: (f.querySelector('.lf-cue') || {}).textContent || '', bar: !!f.querySelector('.lf-tbar'), calls: window.__vcCalls.length, order: kids.join('>'), chips: f.querySelectorAll('[data-fk^="lfr:"]').length }; });
    ok(`${w} C «직접» — 말하는 차례에 «…소리 내어 읽어 …» 안내 · 남은 시간 막대 · AI 안 부름 [PR_CUE]`, /소리 내어/.test(d0.cue) && d0.bar && d0.calls === 0, JSON.stringify(d0));
    ok(`${w} C 말하는 차례 순서 = 누구 차례 → 할 일 → 남은 시간(TBAR_UP) → 글 → 글의 출처 · 연습 중 예시 번호 칩 없음 [PR_ORDER]`, /^lf-lab\.who>lf-cue>lf-tbar>lf-txt(>lf-ref)*$/.test(d0.order) && d0.chips === 0, JSON.stringify(d0));
    await pg.evaluate(() => lsStop()); await wait(300);
    // AI 로 먼저 — 처음엔 알림
    const u0 = await pg.evaluate(() => ({ on: document.querySelectorAll('.pr-mode [aria-checked="true"]').length, tab: [...document.querySelectorAll('.pr-mode [role="radio"]')].map((b) => b.tabIndex).join(','), mode: PT.mode }));
    ok(`${w} C 연습 방법은 처음에 둘 다 비어 있다 · 키보드는 첫 칸으로 들어간다 [PR_MODE_UNPICKED]`, u0.on === 0 && u0.tab === '0,-1' && !u0.mode, JSON.stringify(u0));
    await pg.click('[data-fk="prm:ai"]'); await wait(200);
    const a2 = await pg.evaluate(() => ({ ask: !!document.querySelector('[data-fk="prmyes"]'), mode: PT.mode }));
    ok(`${w} C «AI 로 먼저 듣기» 처음엔 알림(글이 업체로 보내져요) · 아직 바꾸지 않음`, a2.ask && a2.mode !== 'ai', JSON.stringify(a2));
    await pg.click('[data-fk="prmyes"]'); await wait(200);
    const a3 = await pg.evaluate(() => ({ mode: PT.mode, on: document.querySelector('.pr-mode [aria-checked="true"]').getAttribute('data-fk'), keep: localStorage.getItem('me_pr_mode') }));
    ok(`${w} C 알림에서 «AI 목소리로 듣기» → AI 로 먼저(이 기기에 기억)`, a3.mode === 'ai' && a3.on === 'prm:ai' && a3.keep === 'ai', JSON.stringify(a3));
    // [PR_ORDER] 라디오는 화살표로 옮긴다
    await pg.focus('[data-fk="prm:ai"]'); await pg.keyboard.press('ArrowLeft'); await wait(200);
    const k1 = await pg.evaluate(() => ({ mode: PT.mode, foc: document.activeElement && document.activeElement.getAttribute('data-fk') }));
    await pg.keyboard.press('ArrowRight'); await wait(200);
    const k2 = await pg.evaluate(() => ({ mode: PT.mode, foc: document.activeElement && document.activeElement.getAttribute('data-fk') }));
    ok(`${w} C 연습 방법은 화살표로 옮긴다 · 포커스도 따라간다 [PR_ORDER]`, k1.mode === 'self' && k1.foc === 'prm:self' && k2.mode === 'ai' && k2.foc === 'prm:ai', JSON.stringify({ k1, k2 }));
    // [PT_PREP] AI 로 먼저 = 틀기 전에 전부 — 준비 중 줄 · 준비 중에 누르면 기다렸다 시작 · 말하는 차례에서 기다림 없음
    await pg.evaluate(() => { PT.prep = null; for (const k in PT.url) delete PT.url[k]; window.__vcCalls = []; window.__vcTune = []; S.vset = { groom: { tempo: '1.2', pause: 600 }, bride: { tempo: '0.9', pause: 350 } }; _vc0 = (op, d) => { window.__vcCalls.push(op + ':' + (d && d.role)); window.__vcTune.push((d && d.role) + '=' + (d && d.tempo) + '/' + (d && d.pause)); return new Promise((ok) => setTimeout(() => ok({ ok: true, mime: 'audio/mpeg', data: btoa('MP3DATA') }), 700)); }; render(); });
    await wait(150);
    const p0 = await pg.evaluate(() => ({ txt: (document.getElementById('prPrep') || {}).textContent || '', n: (PT.prep || {}).n || 0 }));
    ok(`${w} C AI 로 먼저 — ③ 에 들어오면 말하는 차례 소리를 바로 준비(«준비 중 · 0 / n») [PT_PREP]`, /준비 중 · \d+ \/ \d+/.test(p0.txt) && p0.n >= 2, JSON.stringify(p0));
    await pg.evaluate(() => { LP.lead = false; window.__srcs = []; }); await pg.click('[data-fk="prall"]'); await wait(150);
    const p1 = await pg.evaluate(() => ({ big: !!LP.big, hero: (document.querySelector('.pr-hero .pr-hl span') || {}).textContent || '', prep: (document.getElementById('prPrep') || {}).textContent || '', bar: !!document.querySelector('#prPrep .pr-bar.run i') }));
    ok(`${w} C 준비 중에 누르면 준비 칸이 «준비되면 바로 시작해요» · 숫자는 준비 칸 한 곳(시작하기 아래엔 없음) · 진행 막대 · 아직 안 연다 [PT_PREP_SHOW]`, !p1.big && /준비되면 바로 시작해요/.test(p1.prep) && /준비 중 · \d+ \/ \d+/.test(p1.prep) && !/\d+ \/ \d+/.test(p1.hero) && p1.bar, JSON.stringify(p1));
    for (let t = 0; t < 40; t++) { await wait(250); if (await pg.evaluate(() => !!LP.big)) break; }
    const p2 = await pg.evaluate(() => ({ big: !!LP.big, prep: (PT.prep || {}).run, done: (PT.prep || {}).done, n: (PT.prep || {}).n, calls: window.__vcCalls.length }));
    ok(`${w} C 다 되면 바로 시작 · 차례마다 한 번씩만 만들었다`, p2.big && p2.prep === false && p2.done === p2.n && p2.calls === p2.n, JSON.stringify(p2));
    await pg.evaluate(() => { const j = LP.q.findIndex((x, i) => i >= LP.i && x.talk2); if (j > -1) { LP.lead = false; LP.i = j; _lShow(); } }); await wait(150);
    const a5 = await pg.evaluate(() => { const st = LP.q[LP.i] || {}; return { talk2: !!st.talk2, ptts: !!st.ptts, load: LP.loadK, cue: (document.querySelector('#lsFull .lf-cue') || {}).textContent || '', played: (window.__srcs || []).some((x) => /^blob:/.test(x)), badge: /AI 연습 소리/.test(document.getElementById('lsFull').textContent), calls: window.__vcCalls }; });
    const tu = await pg.evaluate(() => window.__vcTune);
    ok(`${w} C 연습 읽기에 그분이 정한 빠르기 · 쉼을 보낸다(신랑 1.2 / 600 · 신부 0.9 / 350) [PT_TUNE]`, tu.length > 0 && tu.every((x) => /^groom=1\.2\/600$|^bride=0\.9\/350$|^(om|of|m|f)=1\/\d+$/.test(x)) && tu.some((x) => /^groom=1\.2\/600$/.test(x)), JSON.stringify(tu));
    ok(`${w} C 말하는 차례에서 기다림 없이 바로 그분 AI 목소리 · «연습용으로만 잠깐» 안내 [PT_PREP · PR_MODE · PT_TEMP]`, a5.talk2 && a5.ptts && !a5.load && /연습용으로만 잠깐 .* 예식 당일엔 직접 말해요/.test(a5.cue) && a5.played && a5.calls.length >= 1 && /^practice:(groom|bride)$/.test(a5.calls[0]), JSON.stringify(a5));
    /* ★[PT_NO_STALL 2026-10-06 사장님 «0 / 10 · 지금 아예 멈춰 있어»] 다듬기가 던져도(오디오 문맥을 못 만드는 기기) · 업체가 실패해도 준비는 끝까지 간다 */
    await pg.evaluate(() => { lsStop(); PT.prep = null; for (const k in PT.url) delete PT.url[k]; for (const k in PT.busy) delete PT.busy[k]; window.__AC0 = window.AudioContext; window.AudioContext = function () { throw new Error('시험 · 오디오 문맥 없음'); }; window.webkitAudioContext = window.AudioContext; render(); });
    for (let t = 0; t < 40; t++) { await wait(250); if (await pg.evaluate(() => PT.prep && !PT.prep.run)) break; }
    const ns = await pg.evaluate(() => ({ run: (PT.prep || {}).run, done: (PT.prep || {}).done, n: (PT.prep || {}).n, txt: (document.getElementById('prPrep') || {}).textContent || '' }));
    ok(`${w} C 다듬기가 던져도 멈추지 않는다 — 받은 소리 그대로 써서 n / n 준비 [PT_NO_STALL]`, ns.run === false && ns.n > 0 && ns.done === ns.n && /준비됐어요/.test(ns.txt), JSON.stringify(ns));
    await pg.evaluate(() => { window.AudioContext = window.__AC0; window.webkitAudioContext = window.__AC0; PT.prep = null; for (const k in PT.url) delete PT.url[k]; _vc0 = () => Promise.reject(new Error('시험 · 연결 끊김')); render(); });
    for (let t = 0; t < 40; t++) { await wait(250); if (await pg.evaluate(() => PT.prep && !PT.prep.run)) break; }
    const nf = await pg.evaluate(() => ({ run: (PT.prep || {}).run, fail: (PT.prep || {}).fail, n: (PT.prep || {}).n, txt: (document.getElementById('prPrep') || {}).textContent || '' }));
    ok(`${w} C 업체 · 연결이 실패해도 멈추지 않는다 — 못 만든 차례로 넘기고 끝낸다 [PT_NO_STALL]`, nf.run === false && nf.n > 0 && nf.fail === nf.n && /만들지 못해/.test(nf.txt), JSON.stringify(nf));
    await pg.evaluate(() => { lsStop(); RitualOpen.FEATURE.practiceTts = false; render(); }); await wait(300);
    ok(`${w} C 연습 읽기 스위치가 꺼지면 고르기 없음(직접뿐)`, await pg.evaluate(() => !document.querySelector('.pr-mode')));
    await pg.evaluate(() => { try { localStorage.removeItem('me_pr_mode'); } catch (e) {} PT.mode = 'self'; });
    // [TURN_BREATH] 말하는 차례 앞 숨(1.6초) — 화면은 먼저 바뀌고 소리 · 시계는 뒤에 · [TBAR_ALWAYS] 멈춤에도 막대 자리
    await pg.evaluate(() => { PT.mode = 'self'; try { localStorage.setItem('me_pr_mode', 'self'); } catch (e) {} lsStop(); prFrom('vow', 1); }); await wait(500);
    const tb = await pg.evaluate(() => { const j = LP.q.findIndex((x, i) => i > 0 && x.talk2 && !LP.q[i - 1].talk2); LP.i = j - 1; LP.paused = false; const t0 = Date.now(); _lNext(); return { j, at: LP.i, k: (LP.q[LP.i] || {}).k, talk2: !!(LP.q[LP.i] || {}).talk2, cue: !!document.querySelector('#lsFull .lf-cue'), tAt: LP.tAt }; });
    await wait(700);
    const tb1 = await pg.evaluate(() => ({ tAt: LP.tAt }));
    await wait(1300);
    const tb2 = await pg.evaluate(() => ({ tAt: LP.tAt, bar: !!document.querySelector('#lsFull .lf-tbar') }));
    ok(`${w} 말하는 차례 앞 1.6초 숨 — 화면은 바로 «신랑 차례 · 할 일» · 시계는 숨 뒤에 [TURN_BREATH]`, tb.talk2 && tb.cue && !tb.tAt && !tb1.tAt && tb2.tAt > 0 && tb2.bar, JSON.stringify({ tb, tb1, tb2 }));
    await pg.evaluate(() => { lsToggle(); }); await wait(300);
    ok(`${w} 멈춰도 말하는 차례엔 막대 자리가 남는다 [TBAR_ALWAYS]`, await pg.evaluate(() => LP.paused && !!document.querySelector('#lsFull .lf-tbar.still')));
    await pg.evaluate(() => lsStop()); await wait(300);
    // [PT_PREP_RETRY] 준비 중 실패 → 한 번 더 → 그래도 실패면 그 차례는 기다리지 않는다
    await pg.evaluate(() => { RitualOpen.FEATURE.practiceTts = true; try { localStorage.setItem('me_ptts_ok', '1'); } catch (e) {} PT.mode = 'ai'; PT.prep = null; PT.failH = {}; for (const k in PT.url) delete PT.url[k]; window.__n = {};
      _vc0 = (op, d) => { const h = d.text; window.__n[h] = (window.__n[h] || 0) + 1; const bad = /하윤아|서준아/.test(h); return new Promise((ok) => setTimeout(() => ok(bad ? { ok: false, down: true, error: 'x' } : { ok: true, mime: 'audio/mpeg', data: btoa('MP3') }), 80)); }; render(); });
    for (let t = 0; t < 40; t++) { await wait(250); if (await pg.evaluate(() => PT.prep && !PT.prep.run)) break; }
    const rp = await pg.evaluate(() => ({ run: PT.prep.run, fail: PT.prep.fail, tries: Object.entries(window.__n).filter(([k]) => /하윤아|서준아/.test(k)).map(([, v]) => v), fh: Object.keys(PT.failH).length, txt: (document.getElementById('prPrep') || {}).textContent || '' }));
    ok(`${w} 준비 중 실패한 차례는 한 번 더 · 그래도 못 만들면 수를 알린다 [PT_PREP_RETRY]`, !rp.run && rp.fail >= 1 && rp.tries.every((n) => n === 2) && rp.fh === rp.fail && /만들지 못해/.test(rp.txt), JSON.stringify(rp));
    await pg.evaluate(() => { prFrom('vow', 1); }); await wait(400);
    const rp2 = await pg.evaluate(() => { const j = LP.q.findIndex((x) => x.talk2 && /하윤아|서준아/.test(x.txt)); if (j > -1) { LP.i = j; LP.paused = false; _lShow(); } return { load: LP.loadK, err: (document.querySelector('#lsFull .lf-state') || {}).textContent || '', found: j }; });
    ok(`${w} 못 만든 차례에 와도 «만드는 중»으로 기다리지 않는다 · 글을 보며 읽기 안내`, rp2.found > -1 && !rp2.load && /만들지 못했어요/.test(rp2.err), JSON.stringify(rp2));
    await pg.evaluate(() => { lsStop(); PT.mode = 'self'; RitualOpen.FEATURE.practiceTts = false; });
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nPLAY WAIT FILE FAIL ${fail}` : '\nPLAY WAIT FILE OK'); process.exit(fail ? 1 : 0);
