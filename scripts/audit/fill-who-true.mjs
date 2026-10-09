// ★[FILL_WHO_TRUE 2026-10-09 고객 여정 A~Z 점검 1라운드 E-3] 한 분이 읽는 줄에는 그 분 목소리 소리만 붙는다.
//   사고(시뮬 재현): 두 분 목소리로 빈 줄을 채우는 중에 신부 «지우기»를 누르면, 서버가 지운 신부 대신 신랑 목소리로 만들어 온 소리를
//   신부 줄에 붙이고 «확정하기»로 보여 줬다(당일 신랑 목소리가 신부 줄을 읽는다). 종전 화면은 ①채우기가 시작할 때 한 번만 목소리를 봤고
//   ②서버가 부탁한 분(one)과 다른 분 소리를 돌려줘도 붙였고 ③그런 옛 소리를 «다시 만들어 주세요»로 세지 않았다.
//   A 다른 분 목소리 답 — 붙이지 않는다 · 두 분이 누른 «목소리 만들기»면 까닭 한 줄
//   B 채우는 중 «지우기» — 그 분 줄은 더 묻지 않고 · 신부 줄에 신랑 소리가 붙지 않는다
//   C 한 분이 읽는 줄인데 다른 분 목소리 소리(옛 저장) — «다시 만들어 주세요»(_whoStale)
//   D 묻는 사이 그 분 목소리를 새로 만들거나 지웠으면(차례 VC.vgen) — 그 소리는 줄에도 기억에도 두지 않는다
//   E [DEL_NOT_MID] 다시 녹음(만드는 중)에는 «지우기»를 잠근다(E-4 · 지운 뒤 새 목소리가 되살아났다)
//   FWT_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.FWT_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 한 판 열기 — 두 분 목소리 준비 · 가짜 서버: 부탁한 분 목소리가 서버에서 지워졌으면 다른 분 목소리로 만든다(진짜 서버의 지금 동작 · 80_production) */
async function open(o) {
  o = o || {}; const pg = await br.newPage({ viewport: { width: 390, height: 900 }, hasTouch: true }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(600);
  await pg.evaluate((o) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { ok: true, groom: { ready: true }, bride: { ready: true } }; VC.stLast = JSON.parse(JSON.stringify(VC.st));
    window.__gone = {}; window.__mk = []; window.__t0 = Date.now();
    const other = (w) => (w === 'bride' ? 'groom' : 'bride'), say = (w) => (window.__gone[w] ? other(w) : w);
    window._vc = (op, a) => { if (op === 'make') { window.__mk.push({ t: Date.now() - window.__t0, key: a.key, one: a.one || '', bg: !!a.bg });
        const parts = a.lines ? [...new Set(a.lines.map((l) => say(l[0])))].map((x) => ({ who: x })) : [{ who: say(a.one || 'groom') }];
        return new Promise((res) => setTimeout(() => res({ ok: true, parts, left: 5 }), o.makeMs || 400)); }
      if (op === 'status') return new Promise((res) => setTimeout(() => res({ ok: true, groom: { ready: !window.__gone.groom }, bride: { ready: !window.__gone.bride } }), 200));
      if (op === 'delete') { (window.__dels = window.__dels || []).push(a.who); return new Promise((res) => setTimeout(() => { window.__gone[a.who] = 1; res({ ok: true }); }, o.delMs || 300)); }
      return Promise.resolve({ ok: true }); };
    window._vcProc = (d, t) => Promise.resolve({ wav: new Blob(['w:' + t], { type: 'audio/wav' }) });
    const _pm = window.postMessage.bind(window); window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-09 10:00' }), 30); return; } return _pm(m, t); };
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } }, o);
  return { pg, errs };
}
const brideKeys = (pg) => pg.evaluate(() => ['g0', 'g1', 'g2', 'g3'].filter((k) => _vcLineWho(k) === 'bride'));
const groomKeys = (pg) => pg.evaluate(() => ['g0', 'g1', 'g2', 'g3'].filter((k) => _vcLineWho(k) === 'groom'));
const line = (pg, k) => pg.evaluate((k) => { const u = (S.up || {})[k]; return { by: u && typeof u === 'object' ? String(u.by) : '', src: (u && u.src) || '', err: ((MK.lineErr || {})[k]) || '', up: !!MK_UP[k], alt: Object.keys((VC_ALT[k] || {})).join(',') }; }, k);
try {
  /* A — 부탁한 분(신부)이 서버에서 지워져 신랑 목소리로 온 답 */
  { const { pg, errs } = await open({ makeMs: 300 }); const bk = (await brideKeys(pg))[0];
    if (!bk) ok('A 신부가 읽는 하객 맞이 줄을 못 찾았다(기본 읽는 분이 바뀌었으면 이 검사도 손본다)', false);
    else { await pg.evaluate((k) => { window.__gone.bride = 1; _vcMake(k, {}).catch(() => {}); }, bk); await wait(1500); const a = await line(pg, bk);
      ok('A 서버가 부탁한 분 대신 다른 분 목소리로 만들어 오면 — 그 줄에 붙이지 않는다 · «목소리 만들기»를 누른 줄엔 까닭 한 줄(신부 님 AI 목소리를 아직 만들지 않았어요)', a.src !== 'ai' && !a.up && /신부 님 AI 목소리를 아직 만들지 않았어요/.test(a.err), JSON.stringify(a)); }
    ok('A pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* B — 두 분 목소리로 빈 줄을 채우는 중 신부 «지우기» */
  { const { pg, errs } = await open({ makeMs: 900, delMs: 300 }); const bk = await brideKeys(pg);
    await pg.evaluate(() => { _vcAutoFill(['groom', 'bride'], false, { keep: true, aiOnly: true }); }); await wait(250);
    await pg.evaluate(() => mkVcDel('bride')); await wait(150); await pg.evaluate(() => { const b = document.querySelector('.oa-yes'); if (b) b.click(); }); const tDel = await pg.evaluate(() => Date.now() - window.__t0);
    for (let i = 0; i < 80; i++) { await wait(250); if (await pg.evaluate(() => !(VC.fill && VC.fill.doing) && !(VC.delBusy || {}).bride && !Object.keys(MK_UP).length)) break; }
    await wait(600);
    const end = []; for (const k of bk) end.push(Object.assign({ k }, await line(pg, k)));
    const asked = await pg.evaluate((tDel) => window.__mk.filter((m) => m.one === 'bride' && m.t > tDel + 50).length, tDel);
    ok('B 채우는 중 신부 «지우기» — 신부 줄에 신랑 목소리 소리가 붙지 않는다 [FILL_WHO_TRUE]', end.length > 0 && end.every((x) => !(x.src === 'ai' && /groom/.test(x.by))), JSON.stringify(end));
    ok('B 지우기를 누른 뒤로는 신부 줄을 업체에 더 묻지 않는다(채우기가 줄마다 다시 본다)', asked === 0, 'asked=' + asked);
    ok('B pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* C — 옛 저장: 신부가 읽는 줄인데 신랑 목소리 소리 */
  { const { pg, errs } = await open({}); const bk = (await brideKeys(pg))[0], gk = (await groomKeys(pg))[0];
    const r = await pg.evaluate(([bk, gk]) => { const mk = (k, by) => ({ src: 'ai', by, name: 'x', tx: _txSig(_recNeed(k)), tempo: _tKey(k), pause: _pKey(k), wq: _slWhoSig(k) }); S.up = S.up || {}; S.up[bk] = mk(bk, 'groom'); S.up[gk] = mk(gk, 'groom'); VC.st.bride = { ready: false }; render();   /* 신부 목소리가 없는 때(지운 뒤) — 둘 다 있으면 종전 _whoMiss 도 잡았다 */ return { bad: _whoStale(bk), good: _whoStale(gk), mode: _aiMode(bk) }; }, [bk, gk]);
    ok('C 신부 목소리가 없는데 신부가 읽는 줄에 신랑 목소리 소리(옛 저장)면 «다시 만들어 주세요»(_whoStale) · 신랑 줄의 신랑 소리는 그대로', r.bad === true && r.good === false && r.mode !== 'keep', JSON.stringify(r));
    ok('C pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* D — 묻는 사이 신랑 목소리를 새로 만들었다(차례가 바뀜) */
  { const { pg, errs } = await open({ makeMs: 900 }); const gk = (await groomKeys(pg))[0];
    await pg.evaluate((k) => { _vcMake(k, {}).catch(() => {}); }, gk); await wait(300); await pg.evaluate(() => { VC.vgen = VC.vgen || {}; VC.vgen.groom = (VC.vgen.groom || 0) + 1; }); await wait(1500);
    const d = await line(pg, gk);
    ok('D 묻는 사이 그 분 목소리가 바뀌면(새로 만듦 · 지움) 그 소리는 줄에도 기억에도 두지 않는다 · «만드는 중»도 풀린다', d.src !== 'ai' && !d.up && !/groom/.test(d.alt), JSON.stringify(d));
    ok('D pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* E — [DEL_NOT_MID] 다시 녹음(만드는 중)에는 «지우기»를 잠근다 — 서버는 옛 목소리만 지우고 만들기가 끝나며 새 목소리를 저장해 «지웠어요» 뒤에 되살아났다 */
  { const { pg, errs } = await open({}); await pg.evaluate(() => { mkGo('_voice'); }); await wait(500);
    const c = await pg.evaluate(() => { VC.st.groom = { ready: true, left: 2 }; VC.enr = VC.enr || {}; VC.enr.groom = { w: 'groom', R: { who: 'groom', take: {}, ph: 'busy' }, t0: Date.now(), jid: 'x' }; render(); const b = document.querySelector('[data-fk="mkvcdel:groom"]'); return { has: !!b, dis: b ? b.getAttribute('aria-disabled') : null }; });
    await pg.evaluate(() => mkVcDel('groom')); await wait(300); await pg.evaluate(() => { const b = document.querySelector('.oa-yes'); if (b) b.click(); }); await wait(800);
    const r = await pg.evaluate(() => ({ dels: (window.__dels || []).length, ask: !!document.querySelector('.ord-ask'), toast: ((document.getElementById('lsToast') || {}).textContent || '').trim() }));
    ok('E 다시 녹음(만드는 중)에는 «지우기»가 흐리고(aria-disabled) · 눌러도 묻는 창 · 지우기 요청 0 · 아래 알림 «다 만든 뒤에 지울 수 있어요» [DEL_NOT_MID]', c.has && c.dis === 'true' && r.dels === 0 && !r.ask && /다 만든 뒤에 지울 수 있어요/.test(r.toast), JSON.stringify({ c, r }));
    ok('E pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nFILL WHO TRUE FAIL ${fail}` : '\nFILL WHO TRUE OK'); process.exit(fail ? 1 : 0);
