// ★[EX_RACE 2026-10-06 사장님 «예시 3번 만드는 중 4번을 누르고 다시 3번 → 확정하기가 아니라 목소리 만들기 · 글을 고쳤어요»] (390)
//   ★★[EX_PRESS_MAKE 2026-10-08 사장님 «추천대로»] 예시를 누르면 글만 — 미리 만들기 · 먼저 만들기 · 기억에 든 소리 바로 붙이기를 걷었다(종전 ② ④ ⑤ 는 그 약속을 쟀다)
//   가짜 서버(_vc make 0.8초 · _vcProc 바로)로 실제 차례를 재현한다
//   ⓪ 예시를 고르기만 해서는 업체에 묻지 않는다 — 네 줄 «목소리 만들기»(«준비 중» 아님)
//   ① 3번 «목소리 만들기» → 4번 → 3번(만드는 중에) — 그 일을 이어 네 줄 모두 3번 소리 · 머리 «확정하기» ③ 같은 글은 한 번만
//   ② 다 만든 3번 · 4번이 이 탭 기억에 있어도 3번으로 돌아오면 «목소리 만들기»(바로 붙이지 않는다 · 업체에 묻지 않는다)
//   ④ 입장 인사 — 멘트를 바꾸면 «목소리 만들기» · 미리 섞지 않는다(업체 0)
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
try {
  const w = 390;
  const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: true }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
  await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: true }, bride: { ready: true } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
  await pg.evaluate(() => { window.__mk = []; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; S.guestVoice = 'couple'; S.entryVoice = 'couple';
    window._vc = (op, a) => { if (op === 'make') { window.__mk.push((a.bg ? 'bg:' : '') + a.key + ':' + String(a.text).slice(0, 12)); const who = a.one || 'groom'; const parts = a.lines ? [...new Set(a.lines.map((l) => l[0]))].map((x) => ({ who: x })) : [{ who }];
        return new Promise((ok) => setTimeout(() => ok({ ok: true, parts, left: 5 }), 800)); }
      if (op === 'status') return Promise.resolve({ ok: true, groom: { ready: true }, bride: { ready: true } }); return Promise.resolve({ ok: true }); };
    window._vcProc = (d, t) => Promise.resolve({ wav: new Blob(['w:' + t], { type: 'audio/wav' }) });
    S.up = {}; ['g0', 'g1', 'g2', 'g3'].forEach((k) => { S.up[k] = { src: 'ai', by: _vcLineWho(k), name: 'x', tx: _txSig(_recNeed(k)), tempo: _tKey(k), pause: _pKey(k), wq: _slWhoSig(k) }; });
    mkGo('guest'); });
  await wait(500);
  /* ⓪ [EX_PRESS_MAKE] 예시를 고르기만 해서는 업체에 묻지 않는다 */
  await pg.evaluate(() => { window.__mk.length = 0; });
  await pg.evaluate(() => mkGuestEx(2)); await wait(1500);
  const z = await pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; return { up: ks.map((k) => MK_UP[k] || ''), mode: ks.map((k) => _aiMode(k)), mk: window.__mk.slice() }; });
  ok(`${w} ⓪ 예시를 고르기만 하면 글만 — 업체에 묻는 것 0 · 네 줄 «목소리 만들기»(«준비 중» 아님) [EX_PRESS_MAKE]`, z.up.every((x) => !x) && z.mode.every((m) => m === 'need') && !z.mk.length, JSON.stringify(z));
  /* ① 직접 누른 일의 경합 — 3번에서 «목소리 만들기» → 4번 → 3번: 하던 일을 기억해 끝까지 */
  await pg.evaluate(() => { ['g0', 'g1', 'g2', 'g3'].forEach((k) => mkAiGo(k)); }); await wait(150);
  const mid = await pg.evaluate(() => ['g0', 'g1', 'g2', 'g3'].map((k) => MK_UP[k]).join(','));
  await pg.evaluate(() => mkGuestEx(3)); await wait(150);
  await pg.evaluate(() => mkGuestEx(2)); await wait(3500);
  const a = await pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; return { cur: _guestExCur(), match: ks.map((k) => (S.up[k] || {}).tx === _txSig(_recNeed(k))), up: ks.map((k) => MK_UP[k] || ''), mode: ks.map((k) => _aiMode(k)), stale: ks.map((k) => _upStale(k)), mk: window.__mk.slice() }; });
  ok(`${w} ① 3번 «목소리 만들기» → 4번 → 3번 — 네 줄 모두 3번 글 소리 · 만드는 중 없음 · 머리 «확정하기» [EX_RACE]`, /make/.test(mid) && a.cur === 2 && a.match.every(Boolean) && a.up.every((x) => !x) && a.mode.every((m) => m === 'keep') && !a.stale.some(Boolean), JSON.stringify({ mid, ...a, mk: a.mk.length }));
  ok(`${w} ③ 같은 글은 한 번만 만든다(3번 4줄 = 4번 이하)`, a.mk.filter((x) => !/^bg:/.test(x)).length <= 4, JSON.stringify(a.mk));
  /* ② [EX_PRESS_MAKE] 다 만든 3번 · 4번이 이 탭 기억에 있어도 3번으로 돌아오면 «목소리 만들기» — 바로 붙이지 않는다 */
  await pg.evaluate(() => mkGuestEx(3)); await wait(200);
  await pg.evaluate(() => { ['g0', 'g1', 'g2', 'g3'].forEach((k) => mkAiGo(k)); }); await wait(3500);
  const b4 = await pg.evaluate(() => ['g0', 'g1', 'g2', 'g3'].map((k) => _aiMode(k)));
  await pg.evaluate(() => { window.__mk.length = 0; mkGuestEx(2); }); await wait(1500);
  const b = await pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; return { cur: _guestExCur(), mem: ks.every((k) => !!_exCached(k)), mode: ks.map((k) => _aiMode(k)), up: ks.map((k) => MK_UP[k] || ''), mk: window.__mk.slice() }; });
  ok(`${w} ② 다 만든 예시가 이 탭 기억에 있어도 돌아오면 «목소리 만들기» · 바로 붙이지 않는다 · 업체에 묻지 않는다 [EX_PRESS_MAKE]`, b4.every((m) => m === 'keep') && b.cur === 2 && b.mem && b.mode.every((m) => m === 'need') && b.up.every((x) => !x) && !b.mk.length, JSON.stringify({ b4, ...b }));
  /* ④ 입장 인사 — 멘트를 바꾸면 «목소리 만들기» · 미리 섞지 않는다 */
  const c = await pg.evaluate(async () => { window.__mk.length = 0; S.entry = 'A'; S.up.entry = { src: 'ai', by: ['groom', 'bride'], name: 'x' }; const sn = _vcSnap('entry', {}); Object.assign(S.up.entry, { tx: _txSig(sn.t), tempo: sn.tempo, pause: sn.pause, wq: sn.wq, tq: sn.tq, pf: LINE_EVEN_V });
    mkGo('entry'); await new Promise((r) => setTimeout(r, 1500)); const made = window.__mk.slice(); mkEntryEx(2); await new Promise((r) => setTimeout(r, 1500));
    return { made: made.filter((x) => /entry/.test(x)).length, after: window.__mk.filter((x) => /entry/.test(x)), mode: _aiMode('entry'), up: MK_UP.entry || '' }; });   // 하객 맞이 쪽을 떠날 때 바뀐 줄 굽기(_vtLeave)는 원래 몫 — 입장 인사 줄만 센다
  ok(`${w} ④ 입장 인사 — 들어와도 미리 섞지 않는다 · 멘트를 바꾸면 «목소리 만들기»(업체 0 · 만드는 중 없음) [EX_PRESS_MAKE]`, c.made === 0 && !c.after.length && c.mode === 'need' && !c.up, JSON.stringify(c));
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX RACE FAIL ${fail}` : '\nEX RACE OK'); process.exit(fail ? 1 : 0);
