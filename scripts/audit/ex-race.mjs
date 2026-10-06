// ★[EX_RACE · EX_PREBAKE_ENTRY 2026-10-06 사장님 «예시 3번 만드는 중 4번을 누르고 다시 3번 → 확정하기가 아니라 목소리 만들기 · 글을 고쳤어요» · «예시 다른 걸 눌러도 기다릴 필요 없이»] (390)
//   가짜 서버(_vc make 0.8초 · _vcProc 바로)로 실제 차례를 재현한다
//   ①하객 맞이: 3번 → (만드는 중) 4번 → 3번 — 끝나면 네 줄 모두 지금 글(3번) 소리 · 만드는 중 없음 · 머리 «확정하기»
//   ②그 사이 만든 4번 소리도 기억 — 4번을 누르면 업체에 다시 묻지 않고 바로 붙는다 ③같은 글은 한 번만 만든다
//   ④입장 인사: 미리 만들기(_exWarmEntry)가 멘트마다 두 분 섞은 소리를 기억 — 멘트를 바꾸면 바로 붙고 «확정하기»
//   ★«done» = 붙인 직후 잠깐 나오는 완료 표시(MK.aiDone) — 그 뒤 «확정하기». 둘 다 «기다림 없음»이다
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
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
    window._vcAltIdle = () => Promise.resolve();
    S.up = {}; ['g0', 'g1', 'g2', 'g3'].forEach((k) => { S.up[k] = { src: 'ai', by: _vcLineWho(k), name: 'x', tx: _txSig(_recNeed(k)), tempo: _tKey(k), pause: _pKey(k), wq: _slWhoSig(k) }; });
    mkGo('guest'); });
  await wait(500);
  await pg.evaluate(() => mkGuestEx(2)); await wait(150);
  const mid = await pg.evaluate(() => ['g0', 'g1', 'g2', 'g3'].map((k) => MK_UP[k]).join(','));
  await pg.evaluate(() => mkGuestEx(3)); await wait(150);
  await pg.evaluate(() => mkGuestEx(2)); await wait(3500);
  const a = await pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; return { cur: _guestExCur(), match: ks.map((k) => (S.up[k] || {}).tx === _txSig(_recNeed(k))), up: ks.map((k) => MK_UP[k] || ''), mode: ks.map((k) => _aiMode(k)), stale: ks.map((k) => _upStale(k)), mk: window.__mk.slice() }; });
  ok(`${w} ① 3 → 4 → 3 — 네 줄 모두 3번 글 소리 · 만드는 중 없음 · 머리 «확정하기»`, a.cur === 2 && a.match.every(Boolean) && a.up.every((x) => !x) && a.mode.every((m) => m === 'keep') && !a.stale.some(Boolean), JSON.stringify({ mid, ...a, mk: a.mk.length }));
  const ex3 = a.mk.filter((x) => !/^bg:/.test(x)).length;
  await pg.evaluate(() => { window.__mk.length = 0; mkGuestEx(3); }); await wait(250);
  const b = await pg.evaluate(() => { const ks = ['g0', 'g1', 'g2', 'g3']; return { cur: _guestExCur(), match: ks.map((k) => (S.up[k] || {}).tx === _txSig(_recNeed(k))), mode: ks.map((k) => _aiMode(k)), mk: window.__mk.slice() }; });
  ok(`${w} ② 그 사이 만든 4번 소리는 기억 — 4번을 누르면 다시 묻지 않고 바로 붙는다 · «확정하기»`, b.cur === 3 && b.match.every(Boolean) && b.mode.every((m) => m === 'keep' || m === 'done') && !b.mk.some((x) => /^g\d:/.test(x)), JSON.stringify(b));
  ok(`${w} ③ 같은 글은 한 번만 만든다(3번 4줄 + 4번 4줄 = 8번 이하)`, ex3 <= 8, JSON.stringify(a.mk));
  /* ④ 입장 인사 미리 만들기 */
  const c = await pg.evaluate(async () => { window.__mk.length = 0; S.entry = 'A'; S.up.entry = { src: 'ai', by: ['groom', 'bride'], name: 'x' }; const sn = _vcSnap('entry', {}); Object.assign(S.up.entry, { tx: _txSig(sn.t), tempo: sn.tempo, pause: sn.pause, wq: sn.wq, tq: sn.tq, pf: LINE_EVEN_V });
    _exWarmEntry(); await new Promise((r) => setTimeout(r, 6500)); const made = window.__mk.slice(); window.__mk.length = 0;
    mkGo('entry'); await new Promise((r) => setTimeout(r, 300)); mkEntryEx(2); await new Promise((r) => setTimeout(r, 300));
    return { made, after: window.__mk.slice(), match: S.up.entry.tx === _txSig(_recNeed('entry')), mode: _aiMode('entry'), up: MK_UP.entry || '' }; });
  ok(`${w} ④ 입장 인사 — 멘트마다 미리 만들어 기억 · 멘트를 바꾸면 바로 붙고 «확정하기»(다시 묻지 않음)`, c.made.filter((x) => /^bg:entry:/.test(x)).length >= 4 && !c.after.some((x) => /entry:/.test(x)) && c.match && (c.mode === 'keep' || c.mode === 'done') && !c.up, JSON.stringify(c));
  ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX RACE FAIL ${fail}` : '\nEX RACE OK'); process.exit(fail ? 1 : 0);
