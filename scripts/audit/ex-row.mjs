// ★[EX_ROW 2026-10-06 사장님 «스튜디오 나레이션 윗쪽 버튼 그대로 써서 예시 글이 나오게 · 다른 곳도 전부 이 형태 · 예시 표시는 한 곳에»] (390 · 1280)
//   ① AI 하객 맞이 = 위쪽 고르기 묶음에 «참고 예시» 칩 줄(어떻게 준비할까요 바로 아래) · 느낌 이름 넷 · 처음엔 안 눌린 모양 + «지금 글은 … 예시예요» · 옛 카드 없음
//   ② 칩을 누르면 그 칩이 눌리고 아래 글이 바뀐다 · 안내는 칩 줄 아래가 아니라 아래 알림 «아래 글을 바꿨어요 · 고쳐 써도 돼요»(NOTE_TOAST)
//   ③ 스튜디오 입장 = «어떻게 준비할까요»가 먼저 · «입장 멘트»가 아래 / 스튜디오 하객 맞이 = «안내 멘트» 줄(예시라는 말 · 덧말 없음)
//   ④ 서약 = «두 분이 할 말» 바로 위 «참고 예시» 칩 줄 · 처음엔 안 눌림 · 누르면 칸에 들어가고 눌린 모양
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
const rows = () => [...document.querySelectorAll('.mk-pick .ls-cg')].map((r) => ({ l: r.getAttribute('aria-label'), c: [...r.querySelectorAll('.op-chip')].map((b) => b.textContent.trim()), on: [...r.querySelectorAll('.op-chip[aria-checked="true"]')].map((b) => b.textContent.trim()), n: (r.querySelector('.ls-gnote') || {}).textContent || '' }));
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo', 'vow'].forEach((k) => { S.on[k] = 1; }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; window._vc = () => new Promise(() => {}); VC.st = { groom: { ready: true }, bride: { ready: true } }; VC.loading = false; S.touched = { guestVoice: 1, entryVoice: 1, pvVoice: 1 }; S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; buildSteps(); for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(300); await pg.evaluate(() => mkGo('guest')); await wait(500);
    const a = await pg.evaluate(rows); const ex = a.find((r) => r.l === '참고 예시'), vi = a.findIndex((r) => r.l === '어떻게 준비할까요');
    const want = await pg.evaluate(() => GUEST_EX.map((x) => x[0]));
    ok(`${w} ① 하객 맞이(AI) — «어떻게 준비할까요» 바로 아래 «참고 예시» 칩 줄 · 느낌 이름 넷 · 안 눌림 · «지금 글은 … 예시예요» · 옛 카드 없음`, ex && a.indexOf(ex) === vi + 1 && ex.c.join('|') === want.join('|') && !ex.on.length && /아직 고르지 않았어요 · 지금 글은/.test(ex.n) && !(await pg.evaluate(() => !!document.querySelector('.mk-rc,.mk-exs'))), JSON.stringify(a));
    await pg.click('[data-fk="mkex:guest:1"]'); await wait(400);
    const b = await pg.evaluate(() => ({ r: [...document.querySelectorAll('.mk-pick .ls-cg')].map((r) => ({ l: r.getAttribute('aria-label'), on: [...r.querySelectorAll('.op-chip[aria-checked="true"]')].map((x) => x.textContent.trim()), n: (r.querySelector('.ls-gnote') || {}).textContent || '' })).find((r) => r.l === '참고 예시'), t: _recNeed('g0'), want: GUEST_EX[1][1][0], toast: ((u) => (u && !u.hidden ? u.textContent : ''))(document.getElementById('lsToast')) }));
    ok(`${w} ② 칩 «다정하게» → 눌린 모양 · 아래 글이 그 예시로 · 칩 줄 아래 덧말 없이 아래 알림 «아래 글을 바꿨어요 · 고쳐 써도 돼요» [NOTE_TOAST]`, b.r && b.r.on.join() === '다정하게' && b.t === b.want && b.r.n === '' && b.toast === '아래 글을 바꿨어요 · 고쳐 써도 돼요', JSON.stringify(b));
    await pg.evaluate(() => { S.vfill = {}; S.entryVoice = 'nar'; S.guestVoice = 'nar'; buildSteps(); mkGo('entry'); }); await wait(400);
    const c = await pg.evaluate(rows);
    ok(`${w} ③ 스튜디오 입장 — «어떻게 준비할까요»가 먼저 · «입장 멘트»가 아래`, c.findIndex((r) => r.l === '어떻게 준비할까요') === 0 && c.findIndex((r) => r.l === '입장 멘트') === 1, JSON.stringify(c));
    await pg.evaluate(() => mkGo('guest')); await wait(400);
    const d = await pg.evaluate(rows); const nar = d.find((r) => r.l === '안내 멘트');
    ok(`${w} ③ 스튜디오 하객 맞이 — «안내 멘트» 칩 줄 · «참고 예시» 없음 · 덧말 없음(입장 멘트와 같게)`, nar && nar.c.length === 4 && !d.some((r) => r.l === '참고 예시') && !/아직 고르지 않았어요/.test(nar.n), JSON.stringify(d));
    await pg.evaluate(() => { S.tx = {}; mkGo('vow'); }); await wait(400);
    const e = await pg.evaluate(() => { const g = document.querySelector('.mk-ref [role=radiogroup][aria-label="참고 예시"]'), say = [...document.querySelectorAll('.mk-sec h4')].find((h) => h.textContent === '두 분이 할 말'); return { has: !!g, chips: g ? g.querySelectorAll('.op-chip').length : 0, on: g ? g.querySelectorAll('.op-chip[aria-checked="true"]').length : -1, below: !!(g && say && (g.compareDocumentPosition(say) & 4)) }; });
    ok(`${w} ④ 서약 — «두 분이 할 말» 위 «참고 예시» 칩 줄 넷 · 처음엔 안 눌림`, e.has && e.chips === 4 && e.on === 0 && e.below, JSON.stringify(e));
    await pg.click('[data-fk="mkrc:vow:1"]'); await wait(400);
    const f = await pg.evaluate(() => ({ on: (document.querySelector('.mk-ref .op-chip[aria-checked="true"]') || {}).dataset?.fk || '', g: String((S.tx || {})['vow.g'] || '').length }));
    ok(`${w} ④ 서약 칩 → 칸에 들어가고 그 칩이 눌린 모양`, f.on === 'mkrc:vow:1' && f.g > 10, JSON.stringify(f));
    const hs = await pg.evaluate(() => document.documentElement.scrollWidth > innerWidth);
    ok(`${w} 가로 넘침 없음 · 화면 오류 없음`, !hs && !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX ROW FAIL ${fail}` : '\nEX ROW OK'); process.exit(fail ? 1 : 0);
