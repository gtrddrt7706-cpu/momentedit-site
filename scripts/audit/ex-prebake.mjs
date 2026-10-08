// ★[EX_PREBAKE → EX_PRESS_MAKE · EX_BASE · EX_FOCUS_CARD · VP_UNPICKED_ALL] 식순 만들기 — 예시와 목소리 고르기
//   ①[EX_PRESS_MAKE 2026-10-08 사장님 «추천대로»] AI 목소리가 생겨도 예시 글을 미리 만들지 않는다 · 예시를 고르면 글만 바뀐다(소리를 붙이거나 만들지 않는다 · «글을 고쳤어요» 아님)
//     (종전 EX_PREBAKE 2026-10-06 «미리 만들어 두고 고르면 바로»는 걷었다 — 탭 기억뿐 · 한 줄씩 차례 · 실패해도 다시 안 해서 «바로 · 준비 중 · 목소리 만들기»로 갈렸다)
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
      const warm = await pg.evaluate(() => new Promise((res) => { const got = []; const keep = window._vc; window._vc = (op, d) => { if (op === 'make') got.push(d.key); return keep(op, d); };
        mkGo('guest'); setTimeout(() => { window._vc = keep; res({ n: got.length, fns: ['_exWarm', '_exWarmEntry', '_vcWarmAll', '_vcAltWarm', '_vcWarmBoth'].filter((f) => typeof window[f] === 'function') }); }, 2500); }));
      ok(`${w} ① 목소리가 있어도 하객 맞이에 들어오면 예시 글을 미리 만들지 않는다(업체에 묻는 것 0 · 미리 만들기 함수 0) [EX_PRESS_MAKE]`, warm.n === 0 && !warm.fns.length, JSON.stringify(warm));
      await wait(200);
      const sw = await pg.evaluate(() => { GUEST_KEYS.forEach((k) => { S.up[k] = { src: 'ai', id: 'local:' + k, tx: _txSig(_recNeed(k)), by: _vcLineWho(k) }; }); const got = []; const k1 = window._exQuiet, k2 = window._exFirst, k3 = window._vc; window._exQuiet = (k) => got.push('quiet:' + k); window._exFirst = (k) => got.push('first:' + k); window._vc = (op, d) => { if (op === 'make') got.push('make:' + d.key); return k3(op, d); };
        try { mkGuestEx(2); } finally { window._exQuiet = k1; window._exFirst = k2; window._vc = k3; } return { got: got.join(','), edited: GUEST_KEYS.some((k) => _vtEdit(k)), t: _recNeed('g1') === GUEST_EX[2][1][1], need: GUEST_KEYS.every((k) => _aiNeed(k)) }; });
      ok(`${w} ① 예시 3 을 고르면 글만 바뀐다 — 소리를 붙이거나 만들지 않는다 · 넷 다 «목소리 만들기» · «글을 고쳤어요» 아님 [EX_PRESS_MAKE]`, sw.got === '' && !sw.edited && sw.t && sw.need, JSON.stringify(sw));
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
      /* ★[EX_TEXT_1006 2026-10-07 코워크 지시] AI 예시 글을 고쳤다 — 옛 예시 글로 AI 소리를 만든 줄은 옛 글을 두 분 글로 옮긴다 · 소리 없는 줄은 새 글 */
      const mg = await pg.evaluate(() => { const keep = JSON.stringify({ up: S.up, vt: S.vtext, ex: S.gExC, vl: S.vlines }); S.gExC = 1; S.vlines = {}; S.vtext = {}; S.up = { g0: { src: 'ai', id: 'l', tx: _txSig(EX_OLD_1006[1][0][0]), by: 'groom' }, g1: { src: 'ai', id: 'l1', tx: _txSig(EX_OLD_1006[1][1][1]), by: 'groom' } };   /* [EX_TEXT_1007] 최초 글 · 10/6 글 둘 다 */
        _exKeep1006(); const r = { g0: _recNeed('g0') === EX_OLD_1006[1][0][0], g0stale: _txStale('g0'), g1: _recNeed('g1') === EX_OLD_1006[1][1][1] && !_txStale('g1'), g2: _recNeed('g2') === GUEST_EX[1][1][2], g1new: GUEST_EX[1][1][1] !== EX_OLD_1006[1][1][1] };
        _exKeep1006(); r.twice = _recNeed('g0') === EX_OLD_1006[1][0][0]; const k = JSON.parse(keep); S.up = k.up; S.vtext = k.vt; S.gExC = k.ex; S.vlines = k.vl; return r; });
      ok(`${w} [EX_TEXT_1006] 옛 예시 글로 만든 AI 소리는 그 글을 두 분 글로(«글을 고쳤어요» 아님) · 소리 없는 줄은 새 예시 글 · 두 번 불러도 같다`, mg.g0 && !mg.g0stale && mg.g1 && mg.g2 && mg.g1new && mg.twice, JSON.stringify(mg));
      ok(`${w} [EX_TEXT_1006] 식전 영상 소개 AI 예시 넷 = 코워크 확정 글`, await pg.evaluate(() => PV_EX.map((x) => x[1]).join('|') === '저희 두 사람의 영상입니다. 먼저 보여 드릴게요.|여러분께 꼭 보여 드리고 싶었던 장면들이에요.|본편에 앞서, 저희가 예고편을 가져왔어요. 편하게 즐겨 주세요.|이 영상으로 먼저 고맙다는 인사를 드릴게요.'));
      ok(`${w} ①②③ pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
      await pg.close(); }
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX PREBAKE FAIL ${fail}` : '\nEX PREBAKE OK'); process.exit(fail ? 1 : 0);
