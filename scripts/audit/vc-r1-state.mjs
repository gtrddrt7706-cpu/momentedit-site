#!/usr/bin/env node
/* ★★[VC_R1_STATE 2026-10-08 목소리 1라운드 «상태» 묶음] 식순 화면(order-preview.html)만 열고 서버 답(_vc0)을 흉내 내 잰다 — 장면마다 하나.
   ① [DEL_AFTER_OK] 지우기 실패(서버 멈춤 V9 · 로그인 풀림 V8)면 그 분 AI 줄 · 카드가 그대로 · 까닭(코드)이 카드 안에 남는다 / 성공하면 그때 줄을 비운다
   ② [VC_ST_MINE] 지운 직후 상태를 못 받아도 지운 분이 «목소리 생성»으로 되돌아가지 않는다
   ③ [FILL_EMPTY] 목소리를 먼저 만들고 순간 칩을 «AI 두 분 목소리»로 바꾸면 빈 줄을 그 목소리로 채운다(줄마다 «목소리 만들기» 아님)
   ④ [FILL_EMPTY · VC_BUSY_ASK] 줄을 채우다 나간 초안을 다시 열면 이어서 채운다 · 채우는 중 «나가기»는 한 번 묻는다
   ⑤ [VC_ERRBOX_TRUE] 못 받음 상자 — 새 고객에게 «만든 목소리» 단정 0 · 다시 묻기가 끝나면 «저절로» 0 · 순간 쪽은 «두 분 목소리 정보를 못 받았어요 (코드)»
   ONLY=<번호,…> · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean); const on = (n) => !ONLY.length || ONLY.includes(String(n));
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n1.mp3')).toString('base64');
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 가짜 서버 — window.__SV: 두 분 목소리 · status 를 막을지(stDown) · delete 답(del: 'ok' | 'v9' | 'v8') · make 는 mp3 를 돌려준다 */
async function open(cfg) {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 }, hasTouch: true }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(500);
  await pg.evaluate(({ cfg, MP3 }) => {
    courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    Object.assign(S, cfg.S || {}); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true;
    const _st = window.setTimeout; window.setTimeout = (f, ms, ...a) => _st(f, ms === 3000 ? 60 : ms === 8000 ? 120 : ms === 5000 ? 60 : ms, ...a);   // _vc 안의 다시 묻기만 빠르게
    const SV = window.__SV = { st: cfg.st || { groom: { consent: true, ready: true, tries: 1, left: 19, made: '2026-10-07 10:00' }, bride: { consent: true, ready: true, tries: 1, left: 19, made: '2026-10-07 10:00' } }, stDown: !!cfg.stDown, del: cfg.del || 'ok', n: {}, makes: [] };
    window._vc0 = (op, a) => { SV.n[op] = (SV.n[op] || 0) + 1;
      if (op === 'status') return Promise.resolve(SV.stDown ? { ok: false, down: true, net: true, error: '연결이 끊겼어요 · 다시 눌러 주세요 (코드 V6 · 1초)' } : { ok: true, groom: Object.assign({}, SV.st.groom), bride: Object.assign({}, SV.st.bride), per: {} });
      if (op === 'delete') { if (SV.del === 'v9') return Promise.resolve({ ok: false, down: true, net: true, sec: 4, error: '서버에서 멈췄어요 · 다시 눌러 주세요 (코드 V9 · 4초)' });
        if (SV.del === 'v8') return Promise.resolve({ ok: false, sess: true, error: '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 V8)' });
        SV.st[a.who] = Object.assign({}, SV.st[a.who], { ready: false, deleted: 'x' }); return Promise.resolve({ ok: true }); }
      if (op === 'make') { SV.makes.push(a.key); return new Promise((r) => _st(() => r({ ok: true, key: a.key, parts: (a.lines || [[a.one || 'groom', a.text]]).map((l) => { let w = l[0] === 'bride' ? 'bride' : 'groom'; if (!SV.st[w].ready) w = w === 'groom' ? 'bride' : 'groom'; return { who: w, vid: 'v', mime: 'audio/mpeg', data: MP3 }; }), total: 1 }), 150)); }
      return Promise.resolve({ ok: true }); };
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; }
  }, { cfg, MP3 });
  await wait(150); return { pg, errs };
}
const AI = (by) => ({ src: 'ai', by, id: 'local:' + Math.random().toString(36).slice(2), name: 'a.mp3', at: '방금' });
const upOf = (pg) => pg.evaluate(() => { const o = {}; ['g0', 'g1', 'g2', 'g3', 'entry', 'pv'].forEach((k) => { const v = (S.up || {})[k]; o[k] = v && typeof v === 'object' ? v.src + '/' + (v.by || '') : 0; }); return o; });
const card = (pg, w) => pg.evaluate((w) => { const b = document.querySelector('[data-fk="mkvcdel:' + w + '"]') || document.querySelector('[data-fk="mkvcok:' + w + '"]'); const li = b && b.closest('li'); return li ? li.innerText.replace(/\s+/g, ' ') : ''; }, w);
async function del(pg, w) { await pg.evaluate(() => mkGo('_voice')); await wait(200); await pg.click('[data-fk="mkvcdel:' + w + '"]'); await wait(150); await pg.click('.ord-ask .oa-yes'); await wait(700); }
try {
  /* ① 지우기 실패면 아무것도 바꾸지 않는다 · 성공하면 그때 줄을 비운다 */
  if (on(1)) for (const kind of ['v9', 'v8']) {
    const { pg, errs } = await open({ del: kind, S: { guestVoice: 'couple', entryVoice: 'couple', vfill: { guest: 'ai', entry: 'ai' }, vset: { groom: { tempo: '1', pause: 150 } } } });
    await pg.evaluate((s) => { S.up = { g0: s.g, g1: s.b, entry: s.g }; }, { g: AI('groom'), b: AI('bride') });
    const u0 = await upOf(pg); await del(pg, 'groom'); await pg.evaluate(() => { render(); render(); }); await wait(100);
    const u1 = await upOf(pg), c1 = await card(pg, 'groom');
    ok(`① ${kind} 지우기 실패 — 그 분 AI 줄 그대로(g0 · entry) [DEL_AFTER_OK]`, JSON.stringify(u0) === JSON.stringify(u1) && u1.g0 === 'ai/groom' && u1.entry === 'ai/groom', { u0, u1 });
    ok(`① ${kind} 카드 «목소리 생성» 그대로 + 까닭(코드 ${kind.toUpperCase()})이 카드 안에 남는다(다시 그려도)`, /목소리 생성/.test(c1) && new RegExp('코드 ' + kind.toUpperCase()).test(c1), c1);
    if (kind === 'v9') { await pg.evaluate(() => { window.__SV.del = 'ok'; }); await pg.click('[data-fk="mkvcdel:groom"]'); await wait(150); await pg.click('.ord-ask .oa-yes'); await wait(800);
      const u2 = await upOf(pg), c2 = await card(pg, 'groom');
      ok('① 다시 눌러 성공하면 그때 신랑 줄만 비운다(g0 · 입장의 신랑 소리 · g1 신부 그대로) · 까닭 걷힘 · 카드 «아직 만들지 않았어요»', u2.g0 === 0 && !/groom/.test(String(u2.entry)) && u2.g1 === 'ai/bride' && !/코드 V9/.test(c2) && /아직 만들지 않았어요/.test(c2), { u2, c2 }); }
    ok(`① ${kind} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* ② 지운 직후 상태를 못 받아도 «목소리 생성»으로 되돌아가지 않는다 */
  if (on(2)) { const { pg, errs } = await open({});
    await pg.evaluate(() => mkGo('_voice')); await wait(300); await pg.evaluate(() => { const _d = window._vc0; window._vc0 = (op, a) => { const p = _d(op, a); if (op === 'delete') window.__SV.stDown = true; return p; }; });
    await pg.click('[data-fk="mkvcdel:groom"]'); await wait(150); await pg.click('.ord-ask .oa-yes'); await wait(1200); await pg.evaluate(() => render()); await wait(100);
    const c = await card(pg, 'groom'), st = await pg.evaluate(() => ({ err: !!VC.stErr, g: !!(VC.st && VC.st.groom && VC.st.groom.ready) }));
    ok('② 지운 뒤 status 가 계속 실패해도 신랑 카드 «목소리 생성» 0 · «아직 만들지 않았어요» [VC_ST_MINE]', st.err && !st.g && !/목소리 생성/.test(c) && /아직 만들지 않았어요/.test(c), { c, st });
    ok('② pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* ③ 목소리 먼저 → 칩 «AI 두 분 목소리» → 빈 줄을 채운다 */
  if (on(3)) { const { pg, errs } = await open({ S: { guestVoice: 'nar', entryVoice: 'nar', pvVoice: 'nar', vfill: {}, vset: { groom: { tempo: '1', pause: 150 }, bride: { tempo: '1', pause: 150 } } } });
    await pg.evaluate(() => mkGo('_voice')); await wait(2300);   // 첫 상태 → FILL_EMPTY(아무 순간도 AI 가 아니라 할 일 없음)
    const m0 = await pg.evaluate(() => window.__SV.makes.filter((k) => /^(g\d|entry)$/.test(k)).length);
    await pg.evaluate(() => { lsChip('guestVoice', 'ai'); lsChip('entryVoice', 'ai'); }); await wait(4500);
    const u = await upOf(pg), mk = await pg.evaluate(() => window.__SV.makes.slice());
    ok('③ 칩 전에는 빈 줄을 만들지 않는다(나레이션 순간)', m0 === 0, { m0 });
    ok('③ 칩 «AI 두 분 목소리» → 하객 맞이 넷 · 입장 줄이 AI 로 채워진다 [FILL_EMPTY]', ['g0', 'g1', 'g2', 'g3', 'entry'].every((k) => /^ai\//.test(String(u[k]))), { u, mk });
    ok('③ pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* ④ 채우는 중 나가기는 묻는다 · 다시 연 초안은 이어서 채운다 */
  if (on(4)) { const { pg, errs } = await open({ S: { guestVoice: 'couple', entryVoice: 'couple', vfill: { guest: 'ai', entry: 'ai' }, vset: { groom: { tempo: '1', pause: 150 }, bride: { tempo: '1', pause: 150 } } } });
    await pg.evaluate((g) => { S.up = { g0: g }; }, AI('groom'));
    await pg.evaluate(() => { VC.fill = { doing: true, n: 3, ok: 0, codes: [] }; window._obReload(); });   // _obExit 은 마이페이지 안에서만 있다 — 같은 _vcBusyNow 를 본다(merge-guard chk)
    await wait(300); const ask = await pg.evaluate(() => { const t = document.querySelector('.ord-ask .oa-t'); return t ? t.textContent : ''; });
    ok('④ 줄 채우는 중 새로고침 → «아직 목소리 줄을 만드는 중이에요» 한 번 묻는다 [VC_BUSY_ASK]', /만드는 중이에요/.test(ask), ask);
    await pg.click('.ord-ask .oa-no').catch(() => {}); await pg.evaluate(() => { VC.fill = null; }); await pg.close();
    const r = await open({ S: { guestVoice: 'couple', entryVoice: 'couple', vfill: { guest: 'ai', entry: 'ai' }, vset: { groom: { tempo: '1', pause: 150 }, bride: { tempo: '1', pause: 150 } } } });
    await r.pg.evaluate((g) => { S.up = { g0: g }; }, AI('groom')); await r.pg.evaluate(() => mkGo('_voice')); await wait(5000);
    const u = await upOf(r.pg);
    ok('④ 다시 연 초안 — 남은 빈 줄(g1~g3 · entry)을 저절로 이어서 채운다 · 이미 찬 g0 은 그대로 [FILL_EMPTY]', ['g1', 'g2', 'g3', 'entry'].every((k) => /^ai\//.test(String(u[k]))) && u.g0 === 'ai/groom', u);
    ok('④ pageerror 0', !errs.length && !r.errs.length, errs.concat(r.errs).slice(0, 2).join(' | ')); await r.pg.close(); }
  /* ⑤ 못 받음 상자 문구 */
  if (on(5)) { const { pg, errs } = await open({ stDown: true, S: { vset: {}, vsetNeed: {}, up: {} } });
    await pg.evaluate(() => mkGo('_voice')); await wait(900); const a = await pg.evaluate(() => document.getElementById('stage').innerText);
    ok('⑤ 목소리 흔적 없는 새 고객 — «만든 목소리는 그대로» 0 · «저절로 다시» 있음 [VC_ERRBOX_TRUE]', /불러오지 못했어요/.test(a) && !/만든 목소리는 그대로/.test(a) && /저절로/.test(a), a.slice(0, 300));
    await pg.evaluate(() => { VC.stFail = 13; clearTimeout(VC.stRetryT); VC.stRetryT = null; render(); }); await wait(100);
    const b = await pg.evaluate(() => ({ t: document.getElementById('stage').innerText, bar: !!document.querySelector('#stage .mk-wait .mk-wait-bar, #stage .mk-wait [class*="bar"]') }));
    ok('⑤ 다시 묻기가 끝나면 «저절로» 0 · 움직이는 막대 0 · «지금 다시 불러오기»는 남는다', !/저절로/.test(b.t) && !b.bar && /지금 다시 불러오기/.test(b.t), b);
    const c = await pg.evaluate(() => _vcStFail('x'));
    ok('⑤ 순간 쪽 한 줄 «두 분 목소리 정보를 못 받았어요 (코드 V6 · 1초)» — «다시 눌러 주세요» 0', /두 분 목소리 정보를 못 받았어요 \(코드 V6 · 1초\)/.test(c) && !/다시 눌러 주세요/.test(c), c);
    ok('⑤ pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC R1 STATE FAIL ${fail}` : '\nVC R1 STATE OK'); process.exit(fail ? 1 : 0);
