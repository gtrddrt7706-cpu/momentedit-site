#!/usr/bin/env node
/* ★★[ENTRY_SCENE_DAY 2026-10-12 사장님 «일단 전부 올려»] 입장 음악 3단계-나 — 당일 콘솔(console.html)
   디렉터가 입장 큐를 GO 하면 곡(계산한 자리에서 페이드인) · 입장 대사 · 마지막 말 끝 하이라이트가 한 시계로 흐르는가(기획안 «6. 당일 콘솔»).
   1 미리 받기 — 초안 S.mu.fid 로 곡을 받아 «입장 음악 · ✓ ‹곡› · 0:40 하이라이트 · 받아 둠» · 시작하면 입장 대사(나레이션)를 미리 풀어 둔다
   2 입장 큐 GO — 장면이 돈다(곡 · 대사 Web Audio) · 계획 = 식순 화면과 같은 식(entry-scene.js · 앞 4초 · 마지막 말 끝 + 0.3초 = 0:40) · 배경음은 내려 둔다(-90)
     · 큐 이름표 «입장 음악 · ‹곡›»
   3 대사가 끝나면 큐가 넘어간다(뒤처리 · 걸음) — 곡은 계속 크게 · 배경음은 여전히 내려 둔 채(뒤처리의 «음악 크게»도 곡 쪽 일이다)
   4 같은 입장 묶음의 다음 큐(맞절) — 곡은 이어서 그 큐의 덕 값(-12dB)으로 낮게 · 배경음은 그대로 내려 둔 채
   5 다음 묶음 GO — 장면이 끝나고(곡 4초에 걸쳐 잦아듦) 배경음이 그 큐 값으로 돌아온다
   6 곡이 없으면(초안에 곡 id 없음 · 목록에도 없음) «파일 없음 · 배경음으로 나감» · 입장 GO 는 종전 길(나레이션 소리 요소)
   7 곡을 못 받으면 «받지 못함 · 배경음으로 나감 · … (코드 L0)» + «다시 받기» · 입장 GO 는 종전 길 · 쪽 오류 없음
   8 갈래 칩은 줄마다 하나(두 분 목소리 줄 포함) · 입장 줄만 «입장 음악» 칩이 하나 더 ·
     8a 두 분 목소리 자리인데 파일을 못 받으면 대사 조각을 실제로 나가는 나레이션으로 센다
   시험 곡은 여기서 만든다(합성음 · 저장소에 음원을 두지 않는다).  종료 코드 0 통과 · 1 실패 · 2 재지 못함
   EM_CON = 돌연변이 확인용 — 그 판의 console.html 로 잰다 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const CON = process.env.EM_CON || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
const J = (o) => JSON.stringify(o);
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (CON && u === '/console.html') ? CON : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 시험 곡 — 150초 · 0~40초 작게 · 40초부터 크게 · WAV 16bit 22050Hz 모노 */
function wav(sec, hook) { const sr = 22050, n = sr * sec, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) { const t = i / sr, a = t >= hook ? 0.45 * ((t % 0.5) < 0.06 ? 1 : 0.35) : 0.05; const v = a * (Math.sin(2 * Math.PI * 220 * t) * 0.6 + Math.sin(2 * Math.PI * 330 * t) * 0.3 + rnd() * 0.2); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  return b.toString('base64'); }
const SONG = wav(150, 40), FID = 'SONGID0123456789abcd';
const S_OK = { course: 'open', entry: 'A', entryVoice: 'nar', mu: { src: 'up', name: 'song-day', t: '시험 곡', a: '', dur: 150, hook: 40, typed: null, sid: 'x1', fid: FID } };
async function open(S0, mode) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; });
  const gets = [];
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue();
    if (/script\.google\.com/.test(u)) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      const H = { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' };
      if (b.fn === 'adminRitualFiles') return rt.fulfill({ status: 200, headers: H, body: J({ ok: true, sup: {}, files: mode === 'nosong' ? [] : [{ key: 'mu', id: FID, name: '입장 음악 · song-day.wav' }] }) });
      if (b.fn === 'adminRitualFileGet') { const id = (b.args || [])[1]; gets.push(id);
        if (mode === 'getfail') return rt.fulfill({ status: 200, headers: H, body: J({ ok: false, error: '파일을 찾을 수 없어요.' }) });
        return rt.fulfill({ status: 200, headers: H, body: J({ ok: true, id, mime: 'audio/wav', data: SONG }) }); }
      return rt.fulfill({ status: 200, headers: H, body: J({ ok: true }) }); }
    return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/console.html`); await pg.evaluate(() => { localStorage.setItem('me_admin_token', 'T0K'); });
  await pg.goto(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(J(S0)).toString('base64'))}&rf=ME0001`); await pg.waitForTimeout(800);
  return { ctx, pg, errs, gets };
}
const st = (pg) => pg.evaluate(() => Object.assign(window.__esd.s(), { rf: (document.getElementById('rfMu') || {}).textContent || '', again: !!document.getElementById('rfAgain'),
  tags: [...document.querySelectorAll('#nTag .pill')].map((x) => x.textContent), narr: (document.getElementById('aNarr') || {}).getAttribute ? (document.getElementById('aNarr').getAttribute('src') || '') : '' }));
const idxOf = (pg) => pg.evaluate(() => window.__esd.idx());
const fireAt = (pg, i) => pg.evaluate((j) => window.__esd.fire(j), i);
let VP_NAR = null;   // 나레이션 판의 대사 조각 수 — 8 에서 «두 분 자리인데 파일 없음»(같은 나레이션 파일)과 견준다
try {
  // 1 ~ 5
  {
    const { ctx, pg, errs, gets } = await open(S_OK, '');
    await pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 30000 }).catch(() => {});
    const A = await st(pg);
    ok('1a 미리 받기 — 초안의 곡 id 로 받아 «입장 음악 · ✓ ‹시험 곡› · 0:40 하이라이트 · 받아 둠»', A.st === 'ok' && A.sg && gets.includes(FID) && A.rf === '✓ ‹시험 곡› · 0:40 하이라이트 · 받아 둠', { A, gets });
    await pg.click('#go'); await pg.waitForFunction(() => window.__esd.s().v0, null, { timeout: 30000 }).catch(() => {});
    const I = await idxOf(pg), B0 = await st(pg);
    VP_NAR = B0.vp;
    ok('1b 시작하면 입장 대사(나레이션)를 미리 풀어 둔다 · 입장 큐가 있다 · 대사 조각 둘 이상', B0.v0 && I.e >= 0 && B0.vp >= 2, { I, v0: B0.v0, vp: B0.vp });
    await fireAt(pg, I.e); await pg.waitForTimeout(400);
    const B = await st(pg);
    const pl = B.pl || {};
    ok('2 입장 GO — 장면(곡 · 대사 Web Audio) · 계획 = 식순 화면과 같은 식(앞 4초 · 마지막 말 끝 + 0.3초 = 0:40 · 곡은 그만큼 앞에서) · 배경음 -90 · 이름표 «입장 음악 · 시험 곡»',
      B.run && B.ri === I.e && B.phase === 'clip' && pl.tv === 4 && pl.tm === 0 && Math.abs(pl.th - (4 + pl.V + 0.3)) < 0.001 && Math.abs(pl.off - (40 - pl.V - 0.3 - 4)) < 0.001 && pl.H === 40 && B.duck === -90 && B.ac === 'running' && B.tags.includes('입장 음악 · 시험 곡'), B);
    const wait = Math.ceil((pl.tv + pl.V) * 1000) + 1500;
    await pg.waitForTimeout(wait);
    const C = await st(pg);
    ok(`3 대사가 끝나면(약 ${Math.round(pl.tv + pl.V)}초) 큐가 넘어간다(뒤처리 · 걸음) — 곡은 계속 · 배경음은 여전히 -90`, C.run && (C.phase === 'live' || C.phase === 'post') && C.duck === -90, C);
    if (I.bow > 0) {
      await fireAt(pg, I.bow); await pg.waitForTimeout(1200);
      const D = await st(pg);
      ok('4 같은 입장 묶음의 다음 큐(맞절) — 곡은 이어서 그 큐 덕 값(-12dB ≈ 0.25)으로 낮게 · 배경음은 -90', D.run && D.cur === I.bow && Math.abs(D.dk - Math.pow(10, -12 / 20)) < 0.03 && D.duck === -90, D);
    } else ok('4 (이 코스엔 같은 입장 묶음의 다음 큐가 없다 — 건너뜀)', true);
    if (I.next > 0) {
      const want = await pg.evaluate((i) => window.__esd.duckOf(i), I.next);
      await fireAt(pg, I.next); await pg.waitForTimeout(300);
      const E = await st(pg);
      ok('5 다음 묶음 GO — 장면이 끝나고(곡 4초에 걸쳐 잦아듦) 배경음이 그 큐 값으로 돌아온다', !E.run && E.cur === I.next && E.duck === want, { E, want });
    } else ok('5 다음 묶음이 없다', false, I);
    ok('5b 쪽 오류 없음', errs.length === 0, errs);
    await ctx.close();
  }
  // 6
  {
    const S0 = JSON.parse(J(S_OK)); delete S0.mu.fid;
    const { ctx, pg, errs } = await open(S0, 'nosong');
    await pg.waitForTimeout(1500);
    const A = await st(pg);
    await pg.click('#go'); await pg.waitForTimeout(800);
    const I = await idxOf(pg); await fireAt(pg, I.e); await pg.waitForTimeout(700);
    const B = await st(pg);
    ok('6 곡이 없으면 «파일 없음 · 배경음으로 나감» · 입장 GO 는 종전 길(나레이션 소리 요소 · 장면 없음) · 이름표 «입장 음악 없음 · 배경음으로»', A.rf === '파일 없음 · 배경음으로 나감' && !B.run && /05_entry-A\.mp3$/.test(B.narr) && B.tags.includes('입장 음악 없음 · 배경음으로') && errs.length === 0, { A: A.rf, B, errs });
    await ctx.close();
  }
  // 7
  {
    const { ctx, pg, errs } = await open(S_OK, 'getfail');
    await pg.waitForFunction(() => window.__esd.s().st === 'fail', null, { timeout: 30000 }).catch(() => {});
    const A = await st(pg);
    await pg.click('#go'); await pg.waitForTimeout(800);
    const I = await idxOf(pg); await fireAt(pg, I.e); await pg.waitForTimeout(700);
    const B = await st(pg);
    ok('7 곡을 못 받으면 «받지 못함 · 배경음으로 나감 · 파일이 지워졌거나 옮겨졌어요 (코드 L0)» + «다시 받기» · 입장 GO 는 종전 길 · 쪽 오류 없음', A.rf === '받지 못함 · 배경음으로 나감 · 파일이 지워졌거나 옮겨졌어요 (코드 L0)' && A.again && !B.run && /05_entry-A\.mp3$/.test(B.narr) && errs.length === 0, { A: A.rf, again: A.again, B, errs });
    await ctx.close();
  }
  // 8 — 갈래 칩(나레이션 · 두 분 녹음 · 당일 직접)은 줄마다 하나 · 입장 줄만 «입장 음악» 칩이 하나 더.
  //   첫 판은 입장 음악 칩을 갈래 칩 사슬(if · else if · else) 한가운데 끼워, 두 분 목소리 줄(하객 맞이 등)에 «나레이션»이 겹쳐 붙었다.
  //   1~7 의 초안은 두 분 목소리 줄이 없어(entryVoice nar · guestVoice 없음) 못 잡았다 — 그래서 하객 맞이 · 입장을 두 분 목소리로 둔 초안으로 한 줄씩 누른다.
  {
    const S0 = Object.assign(JSON.parse(J(S_OK)), { guestVoice: 'couple', entryVoice: 'couple' });
    const { ctx, pg, errs } = await open(S0, '');
    await pg.waitForFunction(() => window.__esd.s().st === 'ok', null, { timeout: 30000 }).catch(() => {});
    await pg.click('#go'); await pg.waitForFunction(() => window.__esd.s().v0, null, { timeout: 30000 }).catch(() => {});
    const I = await idxOf(pg), seen = [], V8 = await st(pg);
    ok('8a 두 분 목소리 자리인데 파일을 못 받으면(스튜디오 나레이션이 나간다) 대사 조각도 나레이션 판과 같게 — 두 분 글로 세면 «마지막 말 앞 낮추기»가 한 문장 일찍 온다',
      V8.v0 && VP_NAR != null && V8.vp === VP_NAR, { vp: V8.vp, VP_NAR });
    for (let i = 0; I.e > 0 && i <= I.e; i++) { await fireAt(pg, i); await pg.waitForTimeout(150);
      const t = await pg.evaluate(() => { const ps = [...document.querySelectorAll('#nTag .pill')];
        const lines = ps.map((x) => { const r = document.createRange(); r.selectNodeContents(x); return r.getClientRects().length; });   // 알약 안 글의 줄 수(꺾이면 2 이상) — 높이 비교는 «모두 똑같이 꺾인» 판을 못 잡는다
        return { vk: document.querySelectorAll('#nTag .pill.vk').length, mu: document.querySelectorAll('#nTag .pill.mu').length, all: ps.map((x) => x.textContent), wrap: Math.max(0, ...lines) }; });
      if (t.vk) seen.push(Object.assign({ i }, t)); }   // 칩을 안 그리는 단계(«다음 순서로» 대기)는 세지 않는다
    const bad = seen.filter((t) => (t.i < I.e ? (t.vk !== 1 || t.mu !== 0) : (t.vk !== 2 || t.mu !== 1)) || t.wrap > 1);   // [PILL_WRAP] 알약 안 글은 한 줄
    const couple = seen.filter((t) => t.i < I.e && t.all.includes('두 분 목소리 없음 · 나레이션으로')).length;
    ok('8 갈래 칩은 줄마다 하나(두 분 목소리 줄 포함) · 입장 줄만 «입장 음악 · 시험 곡» 칩이 하나 더 · 알약 안 글이 한 줄(PILL_WRAP) · 쪽 오류 없음',
      I.e > 0 && couple >= 1 && seen.some((t) => t.i === I.e && t.all.includes('입장 음악 · 시험 곡')) && !bad.length && errs.length === 0, { e: I.e, couple, bad, last: seen.slice(-2), errs });
    await ctx.close();
  }
} catch (e) { ok('잴 수 없었다 — ' + (e && e.message || e).split('\n')[0], false); }
await br.close(); srv.close();
console.log(fail ? `entry-scene-day: FAIL ${fail}` : 'entry-scene-day: ok');
process.exit(fail ? 1 : 0);
