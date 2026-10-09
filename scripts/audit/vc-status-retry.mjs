// ★★[VC_STATUS_RETRY 2026-10-07 사장님 «목소리를 만들었는데도 새로고침이나 나갔다 들어오면 가끔 목소리 만들기 화면이 나온다 · 다시 새로고침하면 나올 때도 있고 · 원인 찾아서 개선»]
//   원인: 목소리 상태(status) 한 번이 안 오면 «아직 만들지 않았어요 · 목소리 만들기»로 그렸다(«못 받음» = «없음» 모양) · 다시 묻지 않았다.
//   T1 status 가 두 번 실패한 뒤 세 번째에 오면 — 그동안 «불러오고 있어요»(사람 카드 없음) → 받은 뒤 두 카드 «목소리 생성»
//   T2 status 가 계속 실패하면 — «불러오지 못했어요 · 지금 다시 불러오기»(«아직 만들지 않았어요» · «목소리 만들기» 0) · 그리기를 반복해도 또 묻지 않는다 · «다시 불러오기»를 누르면 한 번 더
//   T3 한 번 받은 뒤 다시 실패하면 — 마지막으로 받은 상태를 그대로(카드 «목소리 생성» 유지)
//   T4 [VC_ST_NOW 2026-10-09 A~Z 점검 1라운드 B-7] status 가 답을 붙잡으면 20초에 «지금 다시 불러오기»(자리는 처음부터 · 높이 그대로) · 누르면 새로 묻고 늦게 온 옛 답은 버린다
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
/* 서버 흉내 — status 가 failN 번 실패(down)한 뒤 ok · 요청 사이 지연은 _vc 의 3초 · 8초를 100 · 200ms 로 줄여 잰다 */
async function open(failN) {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 }, hasTouch: true }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(600);
  await pg.evaluate((failN) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; window.__st = 0; window.__fail = failN;
    const _st = window.setTimeout; window.setTimeout = (f, ms, ...a) => _st(f, ms === 3000 ? 100 : ms === 8000 ? 200 : ms, ...a);   /* _vc 안의 3초 · 8초만 빠르게 — 10초 타이머는 그대로(돌면 T2 의 «또 묻지 않는다»를 못 잰다 · 실측) */
    window._vc0 = (op, a) => { if (op === 'status') { window.__st++; if (window.__st <= window.__fail) return Promise.resolve({ ok: false, down: true, error: 'x' }); return Promise.resolve({ ok: true, groom: { consent: true, ready: true, left: 2, made: '2026-10-04 10:00' }, bride: { consent: true, ready: true, left: 2, made: '2026-10-04 10:00' }, per: {} }); }
      return Promise.resolve({ ok: true, parts: [{ who: a.one || 'groom' }], left: 5 }); };
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } }, failN);
  await wait(200); await pg.evaluate(() => mkGo('_voice')); await wait(150);
  return { pg, errs };
}
const look = (pg) => pg.evaluate(() => { const st = document.getElementById('stage').innerText; return { st: window.__st, cards: document.querySelectorAll('.mk-vpc').length, notMade: (st.match(/아직 만들지 않았어요/g) || []).length, makeBtn: document.querySelectorAll('[data-fk^="mkvcok:"],[data-fk^="mkvcread:"]').length,   /* 사람 카드의 만들기 단추 — 글로 세면 쪽 제목 «두 분 목소리 만들기»가 잡힌다(실측) */ gen: (st.match(/목소리 생성/g) || []).length, loading: /불러오고 있어요/.test(st), errBox: /불러오지 못했어요/.test(st), retryBtn: !!document.querySelector('[data-fk="mkvcretry"]'), stErr: !!VC.stErr, hasSt: !!VC.st }; });
try {
  /* T1 두 번 실패 뒤 성공 */
  { const { pg, errs } = await open(2); const a = await look(pg);
    ok('T1 첫 답이 안 와도 «아직 만들지 않았어요 · 목소리 만들기»를 그리지 않는다 — «불러오고 있어요»', a.notMade === 0 && a.makeBtn === 0 && a.cards === 0, JSON.stringify(a));
    await wait(700); const b = await look(pg);
    ok('T1 세 번째 답(3초 · 8초 뒤 다시 물음)이 오면 두 카드 «목소리 생성»', b.st === 3 && b.cards === 2 && b.gen === 2 && b.notMade === 0 && !b.stErr, JSON.stringify(b));
    ok('T1 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T2 계속 실패 */
  { const { pg, errs } = await open(99); await wait(700); const a = await look(pg);
    ok('T2 세 번 다 안 오면 «불러오지 못했어요 · 지금 다시 불러오기» — 사람 카드 · «목소리 만들기» 0', a.st === 3 && a.errBox && a.retryBtn && a.cards === 0 && a.notMade === 0 && a.makeBtn === 0 && a.stErr && !a.hasSt, JSON.stringify(a));
    await pg.evaluate(() => { for (let i = 0; i < 5; i++) render(); }); await wait(50); const b = await look(pg);
    ok('T2 다시 그려도 또 묻지 않는다(그리기 5번 · 요청 수 그대로) · 10초 타이머는 걸려 있다', b.st === 3 && b.errBox && b.retryBtn, JSON.stringify(b));
    ok('T2 10초 뒤 저절로 다시 묻는 타이머(stRetryT) · 실패 횟수 1', await pg.evaluate(() => !!VC.stRetryT && VC.stFail === 1));
    await pg.evaluate(() => window.dispatchEvent(new Event('online'))); await wait(700); const b2 = await look(pg);
    ok('T2 망이 돌아오면(online) 한 번 더 묻는다(3번) · 아직 안 오면 그대로 «불러오지 못했어요»', b2.st === 6 && b2.errBox && b2.retryBtn && b2.cards === 0, JSON.stringify(b2));
    await pg.evaluate(() => { window.__fail = 0; }); await pg.click('[data-fk="mkvcretry"]'); await wait(300); const c = await look(pg);
    ok('T2 «지금 다시 불러오기» → 받으면 두 카드 «목소리 생성» · 타이머 해제', c.st === 7 && c.cards === 2 && c.gen === 2 && !c.stErr && await pg.evaluate(() => !VC.stRetryT), JSON.stringify(c));
    ok('T2 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T3 받은 뒤 다시 실패 → 마지막 상태 유지 */
  { const { pg, errs } = await open(0); await wait(200); const a = await look(pg);
    await pg.evaluate(() => { window.__fail = 99; VC.stErr = false; VC.st = null; _vcStatus(null, true); }); await wait(700); const b = await look(pg);
    ok('T3 한 번 받은 뒤 다시 못 받으면 마지막 상태 그대로(카드 «목소리 생성» 유지 · «아직 만들지 않았어요» 0)', a.gen === 2 && b.cards === 2 && b.gen === 2 && b.notMade === 0, JSON.stringify({ a, b }));
    ok('T3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* T4 [VC_ST_NOW] 답을 붙잡는 status — 20초(여기선 0.3초로 줄여 잰다) 전엔 자리만 · 뒤엔 단추 · 누르면 새로 묻고 늦은 옛 답은 버린다 */
  { const { pg, errs } = await open(0); await wait(200);
    await pg.evaluate(() => { VC_ST_NOW = 300; VC.st = null; VC.stLast = null; VC.stErr = false; window.__pend = [];
      const ok0 = window._vc0; window._vc0 = (op, a) => op === 'status' ? new Promise((r) => { window.__st++; window.__pend.push(r); }) : ok0(op, a);
      _vcStatus(null, true); render(); });
    const box = () => pg.evaluate(() => { const b = document.querySelector('[data-fk="mkvcstnow"]'), w = document.querySelector('.mk-vpage .mk-wait'), s = w && w.parentElement; return { btn: !!b, vis: b ? getComputedStyle(b.closest('p')).visibility : '', h: s ? Math.round(s.getBoundingClientRect().height) : 0, pend: window.__pend.length }; });
    await wait(100); const a = await box(); await wait(500); const b = await box();
    ok('T4 답을 붙잡는 동안 — 처음엔 «지금 다시 불러오기» 자리만(안 보임) · 시간이 지나면 보인다 · 상자 높이 그대로 [VC_ST_NOW]', a.btn && a.vis === 'hidden' && b.btn && b.vis === 'visible' && a.h > 0 && a.h === b.h && b.pend === 1, JSON.stringify({ a, b }));
    await pg.click('[data-fk="mkvcstnow"]'); await wait(100); const n2 = await pg.evaluate(() => window.__pend.length);
    await pg.evaluate(() => { window.__pend[1]({ ok: true, groom: { consent: true, ready: true, left: 2, made: '2026-10-04 10:00' }, bride: { consent: true, ready: true, left: 2, made: '2026-10-04 10:00' } }); }); await wait(200); const c = await look(pg);
    await pg.evaluate(() => { window.__pend[0]({ ok: false, down: true, error: 'x' }); }); await wait(300); const d = await look(pg);
    ok('T4 누르면 새로 묻고(물음 2) 그 답으로 두 카드 «목소리 생성» · 늦게 온 옛 답(실패)은 버린다(카드 그대로 · 못 받음 상자 없음) [VC_ST_NOW]', n2 === 2 && c.cards === 2 && c.gen === 2 && d.cards === 2 && d.gen === 2 && !d.errBox && !d.stErr, JSON.stringify({ n2, c, d }));
    ok('T4 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC STATUS RETRY FAIL ${fail}` : '\nVC STATUS RETRY OK'); process.exit(fail ? 1 : 0);
