// ★★[EX_FIRST · EX_LABEL_HONEST · EX_OLD_IS_EX 2026-10-07 사장님 «글을 고쳤어요라고 나오는데 고치지 않고 첫 화면에서 버튼 클릭만 했는데 · 버그야? ·
//   처음 AI 목소리 입히면 다른 곳들도 동시에 입혀지게 셋팅한 약속이 자꾸 흔들린다 · 몇 번째 체크하는 건지 반복이야»]
//   «약속»을 실제 시간 흐름으로 잰다 — 미리 만들기 차례(VC_ALTQ · _vcAltIdle)를 막지 않는다(종전 ex-prebake · ex-race 는 데우기를 멈추거나 끝난 뒤만 봐서 이 구멍을 못 봤다).
//   T1 새로 연 탭(미리 만든 소리 없음)에서 데우기가 끝나기 전에 «다정하게»를 누른다 → 바로 «준비 중»(«글을 고쳤어요» · «목소리 만들기» 없음) → 3초 안에 네 줄 «확정하기» · 앞에서 만든 것 0
//   T2 옛 예시 글(10/6)로 만든 소리를 가진 고객 → 불러오면 칩 «다정하게» 켜짐 · 묻는 창 없이 다른 예시로 · 다시 «다정하게»를 누르면 새 글로 «준비 중» → «확정하기»
//   T3 정말 글을 고친 줄은 그대로 «글을 고쳤어요 · 목소리 만들기»(참 양성 보존) · 뒤에서 만들지 않는다
//   T4 뒤 만들기가 실패하면 «목소리 만들기 · 예시를 바꿨어요»(«글을 고쳤어요» 아님)
//   T5 배포로 예시 글이 바뀐 고객(소리는 옛 글) → 쪽에 들어오자마자 «준비 중» → 누르지 않아도 «확정하기»
//   T6 식전 영상 소개 예시(mkPvEx)도 같은 길
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
    window._vc = (op, a) => { if (op === 'make') { window.__mk.push({ t: Date.now() - window.__t0, bg: !!a.bg, key: a.key, who: a.one || '', tx: String(a.text).slice(0, 12) }); const who = a.one || 'groom';
        return new Promise((res, rej) => setTimeout(() => (failRe && failRe.test(String(a.text)) ? rej(new Error('fail')) : res({ ok: true, parts: [{ who }], left: 5 })), o.makeMs || 400)); }
      if (op === 'status') return Promise.resolve({ ok: true, groom: { ready: true }, bride: { ready: true } }); return Promise.resolve({ ok: true }); };
    window._vcProc = (d, t) => Promise.resolve({ wav: new Blob(['w:' + t], { type: 'audio/wav' }) });
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } }, o);
  return { pg, errs };
}
const aiUp = (pg, mk) => pg.evaluate((mk) => { S.up = S.up || {}; ['g0', 'g1', 'g2', 'g3'].forEach((k, i) => { const t = mk === 'cur' ? _recNeed(k) : mk === 'old' ? [].concat(EX_OLD_1006['1'][String(i)])[0] : ('옛날 글 ' + i); S.up[k] = { src: 'ai', by: _vcLineWho(k), name: 'x', tx: _txSig(t), tempo: _tKey(k), pause: _pKey(k), wq: _slWhoSig(k) }; }); }, mk);
const look = (pg) => pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; const st = document.getElementById('stage').innerText; return { t: Date.now() - window.__t0, mode: ks.map((k) => _aiMode(k)).join(','), fresh: ks.every((k) => S.up[k] && S.up[k].tx === _txSig(_recNeed(k))), edited: (st.match(/글을 고쳤어요/g) || []).length, ex: (st.match(/예시를 바꿨어요/g) || []).length, prep: (st.match(/준비 중/g) || []).length, keep: (st.match(/확정하기/g) || []).length, need: (st.match(/목소리 만들기/g) || []).length, fg: window.__mk.filter((m) => !m.bg).length, mk: window.__mk.length, chip: _guestExCur(), ask: !!document.querySelector('.ord-ask'), up: Object.keys(MK_UP).length }; });
try {
  /* T1 */
  { const { pg, errs } = await open({ makeMs: 400 }); await aiUp(pg, 'cur'); await pg.evaluate(() => mkGo('guest')); await wait(150);
    const tClick = await pg.evaluate(() => { mkGuestEx(1); return Date.now() - window.__t0; }); await wait(120); const a = await look(pg);
    ok('T1 «다정하게»를 누른 직후 — 네 줄 «준비 중» · «글을 고쳤어요» 0 · «목소리 만들기» 0 · 앞에서 만든 것 0 [EX_FIRST · EX_LABEL_HONEST]', a.mode === 'prep,prep,prep,prep' && a.edited === 0 && a.need === 0 && a.prep >= 4 && a.fg === 0 && a.chip === 1, JSON.stringify(a));
    const first = await pg.evaluate(() => window.__mk.slice(0, 3));
    ok('T1 그 줄들의 만들기가 차례를 기다리지 않고 바로(누른 뒤 0.3초 안) · 뒤일(bg)로', first.length === 3 && first.every((m) => m.bg && m.t - tClick < 300), JSON.stringify({ tClick, first }));
    await wait(2800); const b = await look(pg);
    ok('T1 3초 안에 네 줄 «확정하기» · 소리가 새 글과 같다 · «글을 고쳤어요» 0 · 앞에서 만든 것 0', b.mode === 'keep,keep,keep,keep' && b.fresh && b.edited === 0 && b.keep >= 4 && b.need === 0 && b.fg === 0, JSON.stringify(b));
    ok('T1 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T2 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'old'); await pg.evaluate(() => { S.gExC = 1; _exKeep1006(); mkGo('guest'); }); await wait(250); const a = await look(pg);
    const vt = await pg.evaluate(() => ({ vtext: Object.keys(S.vtext || {}).length, exOld: JSON.stringify(S.exOld || {}), isEx: ['g0', 'g1', 'g2', 'g3'].every((k) => _exIs(k)) }));
    ok('T2 옛 예시 글(10/6)로 만든 소리 — 불러오면 칩 «다정하게» 켜짐 · 네 줄 «확정하기» · 손볼 것 없음 [EX_OLD_IS_EX]', a.chip === 1 && a.mode === 'keep,keep,keep,keep' && a.edited === 0 && a.need === 0 && vt.vtext === 4 && vt.isEx, JSON.stringify({ a, vt }));
    await pg.evaluate(() => mkGuestEx(2)); await wait(150); const b = await look(pg);
    ok('T2 다른 예시를 눌러도 «예시로 바꿀까요?»를 묻지 않는다(두 분이 쓴 글이 아니다) · 바로 «준비 중»', !b.ask && b.chip === 2 && b.mode === 'prep,prep,prep,prep' && b.edited === 0, JSON.stringify(b));
    await wait(2200); await pg.evaluate(() => mkGuestEx(1)); await wait(150); const c = await look(pg); await wait(2200); const d = await look(pg);
    const nt = await pg.evaluate(() => ['g0', 'g1', 'g2', 'g3'].every((k, i) => _recNeed(k) === GUEST_EX[1][1][i]) && !Object.keys(S.exOld || {}).length);
    ok('T2 «다정하게»로 돌아오면 새 글(10/7)로 «준비 중» → «확정하기» · 옛 글 표식은 걷힘', c.mode.split(',').every((m) => m === 'prep' || m === 'keep') && c.need === 0 && c.edited === 0 && d.mode === 'keep,keep,keep,keep' && d.fresh && nt, JSON.stringify({ c, d, nt }));
    ok('T2 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T3 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'cur'); await pg.evaluate(() => mkGo('guest')); await wait(1200);
    const n0 = await pg.evaluate(() => window.__mk.length);
    await pg.evaluate(() => { mkSlText('g0', 0, _recNeed('g0') + ' 한 문장 더요.'); render(); }); await wait(300); const a = await look(pg);
    const g0 = await pg.evaluate(() => ({ mode: _aiMode('g0'), isEx: _exIs('g0'), mkAfter: window.__mk.filter((m) => m.key === 'g0' && /한 문장 더요/.test(m.tx)).length }));
    ok('T3 정말 글을 고친 줄 = «글을 고쳤어요 · 목소리 만들기» 그대로(참 양성) · 뒤에서 먼저 만들지 않는다', g0.mode === 'need' && !g0.isEx && a.edited === 1 && a.need >= 1 && g0.mkAfter === 0, JSON.stringify({ a, g0, n0 }));
    ok('T3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T4 */
  { const { pg, errs } = await open({ makeMs: 200, fail: '결혼식에 참석|십 분 뒤에 시작|착석해|시작하겠습니다' }); await aiUp(pg, 'cur'); await pg.evaluate(() => mkGo('guest')); await wait(150);
    await pg.evaluate(() => mkGuestEx(3)); await wait(120); const a = await look(pg); await wait(1500); const b = await look(pg);
    ok('T4 뒤 만들기가 실패하면 «목소리 만들기 · 예시를 바꿨어요»로(«글을 고쳤어요» 아님 · 그때는 고객이 누른다)', a.mode === 'prep,prep,prep,prep' && b.mode === 'need,need,need,need' && b.ex >= 4 && b.edited === 0 && b.need >= 4 && b.fg === 0, JSON.stringify({ a, b }));
    ok('T4 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T5 */
  { const { pg, errs } = await open({ makeMs: 300 }); await aiUp(pg, 'unknown'); await pg.evaluate(() => mkGo('guest')); await wait(120); const a = await look(pg); await wait(2400); const b = await look(pg);
    ok('T5 예시 글은 그대로인데 소리가 옛 글(배포로 글이 바뀐 고객) — 들어오자마자 «준비 중» · 누르지 않아도 «확정하기» · «글을 고쳤어요» 0', a.mode === 'prep,prep,prep,prep' && a.edited === 0 && a.need === 0 && b.mode === 'keep,keep,keep,keep' && b.fresh && b.edited === 0 && b.fg === 0, JSON.stringify({ a, b }));
    ok('T5 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T6 */
  { const { pg, errs } = await open({ makeMs: 300 }); await pg.evaluate(() => { S.up = S.up || {}; S.up.pv = { src: 'ai', by: _vcLineWho('pv'), name: 'x', tx: _txSig(_recNeed('pv')), tempo: _tKey('pv'), pause: _pKey('pv'), wq: _slWhoSig('pv') }; mkGo('prevideo'); }); await wait(150);
    await pg.evaluate(() => mkPvEx(1)); await wait(120);
    const a = await pg.evaluate(() => ({ mode: _aiMode('pv'), st: document.getElementById('stage').innerText })); await wait(1200);
    const b = await pg.evaluate(() => ({ mode: _aiMode('pv'), fresh: S.up.pv.tx === _txSig(_recNeed('pv')), st: document.getElementById('stage').innerText, fg: window.__mk.filter((m) => !m.bg).length }));
    ok('T6 식전 영상 소개 예시도 — «준비 중» → «확정하기» · «글을 고쳤어요» 0', a.mode === 'prep' && !/글을 고쳤어요/.test(a.st) && b.mode === 'keep' && b.fresh && !/글을 고쳤어요/.test(b.st) && b.fg === 0, JSON.stringify({ a: a.mode, b: { mode: b.mode, fresh: b.fresh, fg: b.fg } }));
    ok('T6 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX PROMISE FAIL ${fail}` : '\nEX PROMISE OK'); process.exit(fail ? 1 : 0);
