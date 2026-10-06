// ★[EX_PREBAKE · EX_BASE · EX_FOCUS_CARD · VP_UNPICKED_ALL 2026-10-06 사장님] 식순 만들기 — 예시와 목소리 고르기
//   ①AI 목소리가 생기면 하객 맞이 · 식전 영상 소개의 예시 글을 미리 만들어 둔다 · 예시를 고르면 그 소리로 바로 바뀐다(«글을 고쳤어요» 아님)
//   ②«처음 글로» = 지금 고른 예시의 글(예시 1 로 돌아가지 않는다)
//   ③예시 카드를 눌러도 포커스는 카드에 남는다(글칸 아래 금색 줄이 안 생긴다)
//   ④«목소리 만들기 시작» · «나중에 할게요»가 세 순간을 미리 고르지 않는다
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
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(w) {
  const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; buildSteps(); for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } });
  await wait(500); return { pg, errs };
}
try {
  for (const w of [390, 1280]) {
    /* ④ 목소리 쪽이 세 순간을 미리 고르지 않는다 */
    { const { pg, errs } = await open(w);
      const before = await pg.evaluate(() => [S.guestVoice, S.pvVoice, S.entryVoice].join(',') + '|' + JSON.stringify(S.vfill || {}) + '|' + JSON.stringify(S.touched || {}));
      await pg.evaluate(() => { VC.st = { ok: true, groom: {}, bride: {} }; mkVoiceGo('groom', 'consent'); }); await wait(300);
      await pg.evaluate(() => { try { mkDlgClose(); } catch (e) {} mkVoiceLater(); }); await wait(400);
      const after = await pg.evaluate(() => [S.guestVoice, S.pvVoice, S.entryVoice].join(',') + '|' + JSON.stringify(S.vfill || {}) + '|' + JSON.stringify(S.touched || {}));
      ok(`${w} ④ «목소리 만들기 시작» · «나중에 할게요» 뒤에도 세 순간 고르기는 처음 그대로 [VP_UNPICKED_ALL]`, before === after && !/Voice/.test(after.split('|')[2]), before + ' → ' + after);
      const un = [];
      for (const k of ['guest', 'prevideo', 'entry']) { await pg.evaluate((k) => mkGo(k), k); await wait(400);
        un.push(await pg.evaluate(() => { const g = [...document.querySelectorAll('.ls-cg')].find((e) => /AI 두 분 목소리/.test(e.textContent)); return g ? [...g.querySelectorAll('[aria-checked="true"],[aria-pressed="true"]')].length : -1; })); }
      ok(`${w} ④ 하객 맞이 · 식전 영상 · 입장 — 목소리 칩 눌린 것 0`, un.join(',') === '0,0,0', un.join(','));
      ok(`${w} ④ pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
      await pg.close(); }
    /* ①②③ 예시 */
    { const { pg, errs } = await open(w);
      await pg.evaluate(() => { _lSet('guestVoice', 'ai'); _lSet('pvVoice', 'ai'); VC.st = { ok: true, groom: { ready: true }, bride: { ready: true } }; buildSteps(); render(); });
      const warm = await pg.evaluate(() => { const got = []; const keep = window._vcAltWarm; window._vcAltWarm = (k, who, t) => got.push(k + ':' + who + ':' + t); try { _exWarm('groom'); _exWarm('bride'); } finally { window._vcAltWarm = keep; }
        const want = []; GUEST_KEYS.forEach((k, i) => GUEST_EX.forEach((X) => { if (X[1][i] !== _recNeed(k)) want.push(k); })); PV_EX.forEach((e) => { if (e[1] !== _recNeed('pv')) want.push('pv'); });
        return { n: got.length, want: want.length, keys: [...new Set(got.map((x) => x.split(':')[0]))].sort().join(',') }; });
      ok(`${w} ① 목소리가 생기면 하객 맞이 넷 · 식전 영상 소개의 다른 예시 글을 전부 미리 만든다 [EX_PREBAKE]`, warm.n === warm.want && warm.n > 0 && warm.keys === 'g0,g1,g2,g3,pv', JSON.stringify(warm));
      await pg.evaluate(() => mkGo('guest')); await wait(500);
      const sw = await pg.evaluate(() => { GUEST_KEYS.forEach((k) => { S.up[k] = { src: 'ai', id: 'local:' + k, tx: _txSig(_recNeed(k)), by: _vcLineWho(k) }; }); const got = []; const keep = window._vcSwap; window._vcSwap = (k) => got.push(k);
        try { mkGuestEx(2); } finally { window._vcSwap = keep; } return { got: got.join(','), edited: GUEST_KEYS.some((k) => _vtEdit(k)), t: _recNeed('g1') === GUEST_EX[2][1][1] }; });
      ok(`${w} ① 예시 3 을 고르면 넷 다 그 글 소리로 바로 바꾼다 · «글을 고쳤어요» 아님 [EX_PREBAKE]`, sw.got === 'g0,g1,g2,g3' && !sw.edited && sw.t, JSON.stringify(sw));
      await wait(300);
      const foc = await pg.evaluate(() => { const a = document.activeElement; return a ? (a.getAttribute('data-fk') || a.tagName) : ''; });
      ok(`${w} ③ 예시 카드를 누르면 포커스는 그 카드 [EX_FOCUS_CARD]`, foc === 'mkex:guest:2', foc);
      await pg.fill('[data-fk="mksl:g1:0"]', '저희가 직접 고친 글이에요.'); await pg.evaluate(() => render()); await wait(200);
      await pg.click('[data-fk="mkvtreset:g1"]'); await wait(300);
      const rs = await pg.evaluate(() => ({ t: _recNeed('g1'), want: GUEST_EX[2][1][1], ed: !!_vtEdit('g1') }));
      ok(`${w} ② «처음 글로» = 고른 예시(예시 3)의 글 · 예시 1 로 가지 않는다 [EX_BASE]`, rs.t === rs.want && !rs.ed, JSON.stringify(rs));
      await pg.evaluate(() => mkGo('prevideo')); await wait(500);
      await pg.click('[data-fk="mkex:pv:2"]'); await wait(400);
      const pf = await pg.evaluate(() => { const a = document.activeElement; return { fk: a ? (a.getAttribute('data-fk') || a.tagName) : '', t: S.pvText === PV_EX[2][1] }; });
      ok(`${w} ③ 식전 영상 예시를 눌러도 포커스는 카드(글칸 금색 줄 없음) [EX_FOCUS_CARD]`, pf.fk === 'mkex:pv:2' && pf.t, JSON.stringify(pf));
      ok(`${w} ①②③ pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
      await pg.close(); }
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX PREBAKE FAIL ${fail}` : '\nEX PREBAKE OK'); process.exit(fail ? 1 : 0);
