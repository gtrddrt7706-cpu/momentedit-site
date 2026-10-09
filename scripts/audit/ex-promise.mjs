// ★★[EX_PRESS_MAKE 2026-10-08 사장님 «예시 어떤 건 만들기로 · 어떤 건 바로 들을 수 있고 · 통일이 안 돼 · 그럴 바엔 안 하는 것으로 일치» → «추천대로»]
//   예시 소리 «약속»이 바뀌었다 — 예시를 누르면 글만 바뀐다. 미리 만들기 · 누르자마자 먼저 만들기(종전 EX_PREBAKE · EX_FIRST «준비 중» → «확정하기»)는 걷었다.
//   (종전 약속은 미리 만든 소리가 탭 기억뿐 · 한 줄씩 차례 · 실패해도 다시 안 해서, 같은 예시가 «바로 확정하기 · 준비 중 · 목소리 만들기»로 갈렸다)
//   T1 «다정하게»를 누르면 네 줄 «목소리 만들기»(단추 옆 «예시를 바꿨어요»는 없다 · PRESET_QUIET 10/08) · 3초 지켜봐도 업체에 묻는 것 0 · 한 줄을 누르면 그 줄만 «만드는 중» → «확정하기»
//   T2 옛 예시 글(10/6)로 만든 소리 — 칩 켜짐 · «확정하기» 그대로 · 다른 예시를 누르면 묻지 않고 «목소리 만들기»(옆 글 없음) · 만들기 0
//   T3 정말 글을 고친 줄은 «목소리 만들기»(단추 옆 «글을 고쳤어요» 없음 · STALE_QUIET 10/09) · 만들기 0 (EX_LABEL_HONEST)
//   T4 그 줄 소리의 글로 돌아오면 다시 «확정하기» · 만들기 0
//   T5 · T5b 배포로 예시 글이 바뀐 고객(소리는 옛 글 · 고객이 한 일이 아니다) — 들어오자마자 «준비 중» → 누르지 않아도 «확정하기»(이 길만 EX_FIRST 로 남겼다)
//   T6 식전 영상 소개 예시 · T7 입장 인사 멘트 칩도 — 글만 · «목소리 만들기» · 만들기 0
//   EXP_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.EXP_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const W = 390;
/* 한 판 열기 — 목소리 둘 준비 · 서버는 makeMs 뒤에 답한다(실제 데우기 차례는 그대로 돈다) · failRe 에 맞는 글은 실패 */
async function open(o) {
  o = o || {}; const pg = await br.newPage({ viewport: { width: W, height: 900 }, hasTouch: true }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(600);
  await pg.evaluate((o) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { ok: true, groom: { ready: true }, bride: { ready: true } };
    window.__mk = []; window.__t0 = Date.now(); const failRe = o.fail ? new RegExp(o.fail) : null;
    window._vc = (op, a) => { if (op === 'make') { window.__mk.push({ t: Date.now() - window.__t0, bg: !!a.bg, key: a.key, who: a.one || '', tx: String(a.text).slice(0, 12) }); const who = a.one || 'groom', parts = a.lines ? [...new Set(a.lines.map((l) => l[0]))].map((x) => ({ who: x })) : [{ who }];   /* 입장 인사는 줄마다 읽는 분 — 서버가 분마다 한 조각씩 돌려준다(ex-race 와 같은 모의) */
        return new Promise((res, rej) => setTimeout(() => (failRe && failRe.test(String(a.text)) ? rej(new Error('fail')) : res({ ok: true, parts, left: 5 })), o.makeMs || 400)); }
      if (op === 'status') return Promise.resolve({ ok: true, groom: { ready: true }, bride: { ready: true } }); return Promise.resolve({ ok: true }); };
    window._vcProc = (d, t) => Promise.resolve({ wav: new Blob(['w:' + t], { type: 'audio/wav' }) });
    const _pm = window.postMessage.bind(window); window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-08 10:00' }), 30); return; } return _pm(m, t); };   /* 올리기는 마이페이지 몫 — 바로 «올렸어요»로 답한다(alt-ready 와 같은 모의) */
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } }, o);
  return { pg, errs };
}
const aiUp = (pg, mk) => pg.evaluate((mk) => { S.up = S.up || {}; ['g0', 'g1', 'g2', 'g3'].forEach((k, i) => { const t = mk === 'cur' ? _recNeed(k) : mk === 'old' ? [].concat(EX_OLD_1006['1'][String(i)])[0] : ('옛날 글 ' + i); S.up[k] = { src: 'ai', by: _vcLineWho(k), name: 'x', tx: _txSig(t), tempo: _tKey(k), pause: _pKey(k), wq: _slWhoSig(k) }; }); }, mk);
const look = (pg) => pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; const st = document.getElementById('stage').innerText; return { t: Date.now() - window.__t0, mode: ks.map((k) => _aiMode(k)).join(','), fresh: ks.every((k) => S.up[k] && S.up[k].tx === _txSig(_recNeed(k))), edited: (st.match(/글을 고쳤어요/g) || []).length, ex: (st.match(/예시를 바꿨어요/g) || []).length, prep: (st.match(/준비 중/g) || []).length, keep: (st.match(/확정하기/g) || []).length, need: (st.match(/목소리 만들기/g) || []).length, fg: window.__mk.filter((m) => !m.bg).length, mk: window.__mk.length, chip: _guestExCur(), ask: !!document.querySelector('.ord-ask'), up: Object.keys(MK_UP).length }; });
try {
  /* T1 */
  { const { pg, errs } = await open({ makeMs: 400 }); await aiUp(pg, 'cur'); await pg.evaluate(() => mkGo('guest')); await wait(150);
    const n0 = await pg.evaluate(() => window.__mk.length);
    await pg.evaluate(() => mkGuestEx(1)); await wait(150); const a = await look(pg);
    ok('T1 «다정하게»를 누른 직후 — 네 줄 «목소리 만들기» · 단추 옆 «예시를 바꿨어요» 0(PRESET_QUIET) · «글을 고쳤어요» 0 · «준비 중» 0 [EX_PRESS_MAKE · EX_LABEL_HONEST]', a.mode === 'need,need,need,need' && a.ex === 0 && a.need >= 4 && a.edited === 0 && a.prep === 0 && a.chip === 1, JSON.stringify(a));
    await wait(3000); const b = await look(pg);
    ok('T1 3초 지켜봐도 업체에 묻는 것 0(미리 만들기 · 먼저 만들기 없음) · 네 줄 그대로', b.mk === n0 && n0 === 0 && b.mode === 'need,need,need,need', JSON.stringify({ n0, b }));
    await pg.evaluate(() => mkAiGo('g0')); await wait(120); const c = await pg.evaluate(() => ({ m0: _aiMode('g0'), rest: ['g1', 'g2', 'g3'].map((k) => _aiMode(k)).join(',') }));
    await wait(1500); const d = await look(pg);
    ok('T1 한 줄 «목소리 만들기»를 누르면 그 줄만 «만드는 중» → «확정하기» · 나머지는 그대로', c.m0 === 'make' && c.rest === 'need,need,need' && d.mode === 'keep,need,need,need' && d.mk === 1, JSON.stringify({ c, d }));
    ok('T1 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T2 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'old'); await pg.evaluate(() => { S.gExC = 1; _exKeep1006(); mkGo('guest'); }); await wait(250); const a = await look(pg);
    const vt = await pg.evaluate(() => ({ vtext: Object.keys(S.vtext || {}).length, exOld: JSON.stringify(S.exOld || {}), isEx: ['g0', 'g1', 'g2', 'g3'].every((k) => _exIs(k)) }));
    ok('T2 옛 예시 글(10/6)로 만든 소리 — 불러오면 칩 «다정하게» 켜짐 · 네 줄 «확정하기» · 손볼 것 없음 [EX_OLD_IS_EX]', a.chip === 1 && a.mode === 'keep,keep,keep,keep' && a.edited === 0 && a.need === 0 && vt.vtext === 4 && vt.isEx, JSON.stringify({ a, vt }));
    await pg.evaluate(() => mkGuestEx(2)); await wait(150); const b = await look(pg); await wait(1500); const c = await look(pg);
    ok('T2 다른 예시를 눌러도 «예시로 바꿀까요?»를 묻지 않는다(두 분이 쓴 글이 아니다) · «목소리 만들기»(옆 «예시를 바꿨어요» 없음) · 만들기 0', !b.ask && b.chip === 2 && b.mode === 'need,need,need,need' && b.ex === 0 && b.need >= 4 && b.edited === 0 && c.mk === 0, JSON.stringify({ b, c }));
    ok('T2 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T3 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'cur'); await pg.evaluate(() => mkGo('guest')); await wait(1200);
    const n0 = await pg.evaluate(() => window.__mk.length);
    await pg.evaluate(() => { mkSlText('g0', 0, _recNeed('g0') + ' 한 문장 더요.'); render(); }); await wait(300); const a = await look(pg);
    const g0 = await pg.evaluate(() => ({ mode: _aiMode('g0'), isEx: _exIs('g0'), mkAfter: window.__mk.filter((m) => m.key === 'g0' && /한 문장 더요/.test(m.tx)).length }));
    ok('T3 정말 글을 고친 줄 = «목소리 만들기»(참 양성 · 단추 옆 «글을 고쳤어요»는 없다 · STALE_QUIET) · 뒤에서 먼저 만들지 않는다', g0.mode === 'need' && !g0.isEx && a.edited === 0 && a.need >= 1 && g0.mkAfter === 0, JSON.stringify({ a, g0, n0 }));
    ok('T3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T4 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'cur'); await pg.evaluate(() => mkGo('guest')); await wait(150); const c0 = await pg.evaluate(() => _guestExCur());
    await pg.evaluate(() => mkGuestEx(2)); await wait(150); const a = await look(pg);
    await pg.evaluate((c0) => mkGuestEx(c0), c0); await wait(150); const b = await look(pg);
    ok('T4 다른 예시 → «목소리 만들기» · 원래 예시로 돌아오면 다시 «확정하기»(그 줄 소리가 그 글) · 만들기 0', c0 >= 0 && a.mode === 'need,need,need,need' && b.mode === 'keep,keep,keep,keep' && b.mk === 0 && b.edited === 0, JSON.stringify({ c0, a, b }));
    ok('T4 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T5 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'unknown'); await pg.evaluate(() => mkGo('guest')); await wait(120); const a = await look(pg); await wait(2400); const b = await look(pg);
    ok('T5 예시 글은 그대로인데 소리가 옛 글(배포로 글이 바뀐 고객) — 들어오자마자 «준비 중» · 누르지 않아도 «확정하기» · «글을 고쳤어요» 0', a.mode === 'prep,prep,prep,prep' && a.edited === 0 && a.need === 0 && b.mode === 'keep,keep,keep,keep' && b.fresh && b.edited === 0 && b.fg === 0, JSON.stringify({ a, b }));
    ok('T5 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T5b 식전 영상 소개 — 첫 화면(사장님 캡처 2026-10-07): «다정하게» 글인데 소리는 다른 글 · 아무것도 안 눌러도 «준비 중» → «확정하기» */
  { const { pg, errs } = await open({ makeMs: 300 }); await pg.evaluate(() => { S.pvText = PV_EX[1][1]; S.up = S.up || {}; S.up.pv = { src: 'ai', by: _vcLineWho('pv'), name: 'x', tx: _txSig('옛날 소개글'), tempo: _tKey('pv'), pause: _pKey('pv'), wq: _slWhoSig('pv') }; mkGo('prevideo'); }); await wait(120);
    const a = await pg.evaluate(() => ({ mode: _aiMode('pv'), st: document.getElementById('stage').innerText })); await wait(1500);
    const b = await pg.evaluate(() => ({ mode: _aiMode('pv'), fresh: S.up.pv.tx === _txSig(_recNeed('pv')), st: document.getElementById('stage').innerText, fg: window.__mk.filter((m) => !m.bg).length }));
    ok('T5b 식전 영상 소개 첫 화면 — 들어오자마자 «준비 중» · 누르지 않아도 «확정하기» · «글을 고쳤어요 · 목소리 만들기» 없음', a.mode === 'prep' && !/글을 고쳤어요|목소리 만들기/.test(a.st) && b.mode === 'keep' && b.fresh && !/글을 고쳤어요|목소리 만들기/.test(b.st) && b.fg === 0, JSON.stringify({ a: { mode: a.mode }, b: { mode: b.mode, fresh: b.fresh, fg: b.fg } }));
    ok('T5b pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T6 */
  { const { pg, errs } = await open({ makeMs: 300 }); await pg.evaluate(() => { S.up = S.up || {}; S.up.pv = { src: 'ai', by: _vcLineWho('pv'), name: 'x', tx: _txSig(_recNeed('pv')), tempo: _tKey('pv'), pause: _pKey('pv'), wq: _slWhoSig('pv') }; mkGo('prevideo'); }); await wait(150);
    await pg.evaluate(() => mkPvEx(1)); await wait(150);
    const a = await pg.evaluate(() => ({ mode: _aiMode('pv'), st: document.getElementById('stage').innerText })); await wait(1500);
    const b = await pg.evaluate(() => ({ mode: _aiMode('pv'), mk: window.__mk.length }));
    ok('T6 식전 영상 소개 예시 — 글만 · «목소리 만들기»(옆 «예시를 바꿨어요» 없음 · PRESET_QUIET) · «글을 고쳤어요» 0 · 만들기 0', a.mode === 'need' && !/예시를 바꿨어요/.test(a.st) && /목소리 만들기/.test(a.st) && !/글을 고쳤어요/.test(a.st) && b.mode === 'need' && b.mk === 0, JSON.stringify({ a: a.mode, b }));
    ok('T6 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T7 입장 인사(두 분이 나눠 읽는 줄) */
  { const { pg, errs } = await open({ makeMs: 300 }); await pg.evaluate(() => { S.up = S.up || {}; S.up.entry = { src: 'ai', by: _vcLineWho('entry'), name: 'x', tx: _txSig(_recNeed('entry')), tempo: _tKey('entry'), pause: _pKey('entry'), wq: _slWhoSig('entry') }; mkGo('entry'); }); await wait(150);
    await pg.evaluate(() => mkEntryEx(2)); await wait(150);
    const a = await pg.evaluate(() => ({ mode: _aiMode('entry'), st: document.getElementById('stage').innerText })); await wait(1500);
    const b = await pg.evaluate(() => ({ mode: _aiMode('entry'), mk: window.__mk.length }));
    ok('T7 입장 인사 멘트 칩 — 글만 · «목소리 만들기»(옆 «멘트를 바꿨어요» 없음 · PRESET_QUIET) · 만들기 0', a.mode === 'need' && !/멘트를 바꿨어요/.test(a.st) && /목소리 만들기/.test(a.st) && !/글을 고쳤어요/.test(a.st) && b.mode === 'need' && b.mk === 0, JSON.stringify({ a: a.mode, b }));
    ok('T7 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX PROMISE FAIL ${fail}` : '\nEX PROMISE OK'); process.exit(fail ? 1 : 0);
