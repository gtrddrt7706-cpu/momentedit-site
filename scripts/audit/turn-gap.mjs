#!/usr/bin/env node
/* ★[TURN_GAP 2026-10-05 사장님 «사이에 턴 시간 · 바로 말이 나와야 하는 경우도 · 5단계로 사이에 · 더 나은 안으로 적용»] 실브라우저 시험(가짜 서버 · 390 · 1280).
   보는 것: ①신랑 ↔ 신부가 바뀌는 줄 사이에만 «쉼 보통 ›» 한 줄(같은 분이 이으면 없음) ②누르면 5단계 점 줄 · 고르면 그 자리만 재생 · 줄에 p 로 남는다(보통은 안 남긴다)
     ③소리 길이 — 바로 < 보통(종전 그대로) < 아주 길게 ④고르고 나면 그 줄 파일도 새 쉼으로(tq) · 보통으로 돌리면 종전과 같은 표식('')
   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함(브라우저 없음) */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const { chromium } = pw;
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await chromium.launch(); } catch { try { br = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium' }); } catch { console.log('못 쟀다 — 브라우저 없음'); process.exit(2); } }
const log = []; let fail = 0; const ok = (m, c, d) => { log.push((c ? 'ok   ' : 'FAIL ') + m + (c ? '' : ' → ' + (d || ''))); if (!c) fail++; };
for (const [W, mob] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: mob, isMobile: mob }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(1400);
  await pg.evaluate(() => {
    window.__makes = 0;
    // 말 1.2초 앞뒤로 0.5초 빈소리 — «바로»가 빈소리까지 걷는지 본다
    const tone = (sec, pad) => { const sr = 24000, P = Math.round(sr * pad), n = Math.round(sr * sec) + 2 * P, x = new Float32Array(n); for (let i = P; i < n - P; i++) { const t = i / sr; x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * t) * (0.6 + 0.4 * Math.sin(2 * Math.PI * 2 * t)); } return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window.__fakeD = () => Promise.all([b64(tone(1.2, 0.5)), b64(tone(1.2, 0.5))]).then((a) => ({ ok: true, parts: a.map((x, i) => ({ who: i ? 'bride' : 'groom', mime: 'audio/wav', data: x })) }));
    window._vc = function (op, d) {
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true }, bride: { consent: true, ready: true }, per: {} });
      if (op === 'make') { window.__makes++; const n = d.lines ? d.lines.length : 1; return Promise.all(Array.from({ length: n }, () => b64(tone(1.2, 0.5)))).then((a) => ({ ok: true, key: d.key, left: 4, parts: a.map((x, i) => ({ who: d.lines ? d.lines[i][0] : (d.one || 'groom'), mime: 'audio/wav', data: x })) })); }
      return Promise.resolve({ ok: false });
    };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-05 10:00' }), 30); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.guestVoice = 'couple'; S.vfill = Object.assign({}, S.vfill, { guest: 'ai' });
    VC.st = { groom: { consent: true, ready: true }, bride: { consent: true, ready: true } };
    _slPut('g0', [{ w: 'g', t: '오늘 와 주셔서 감사합니다.' }, { w: 'b', t: '편히 쉬다 가세요.' }]); mkGo('guest');
  });
  await pg.waitForTimeout(500);
  const c1 = await pg.evaluate(() => ({ n: document.querySelectorAll('[data-fk^="mksltn:g0:"]').length, t: (document.querySelector('[data-fk="mksltn:g0:1"]') || {}).textContent || '' }));
  ok(W + ' 신랑 → 신부 줄 사이에 «쉼 보통 ›» 한 줄 [TURN_GAP]', c1.n === 1 && /쉼 보통/.test(c1.t), JSON.stringify(c1));
  const same = await pg.evaluate(() => { _slPut('g0', [{ w: 'g', t: '오늘 와 주셔서 감사합니다.' }, { w: 'g', t: '편히 쉬다 가세요.' }]); render(); const n = document.querySelectorAll('[data-fk^="mksltn:g0:"]').length; _slPut('g0', [{ w: 'g', t: '오늘 와 주셔서 감사합니다.' }, { w: 'b', t: '편히 쉬다 가세요.' }]); render(); return n; });
  ok(W + ' 같은 분이 이어 읽으면 줄 사이 쉼 칸이 없다', same === 0, String(same));
  // 만들기
  await pg.evaluate(() => _vcMake('g0', {}).catch(() => {})); await pg.waitForTimeout(1500);
  const m1 = await pg.evaluate(() => ({ src: (S.up.g0 || {}).src, tq: (S.up.g0 || {}).tq, raw: !!VC_RAW.g0, need: _vtNeed('g0') }));
  ok(W + ' 만든 소리 — 표식 tq 는 «보통» = 빈 값 · 이 기기에 조각을 든다 · 다시 구울 것 없음', m1.src === 'ai' && (m1.tq || '') === '' && m1.raw && !m1.need, JSON.stringify(m1));
  await pg.click('[data-fk="mksltn:g0:1"]'); await pg.waitForTimeout(300);
  const o1 = await pg.evaluate(() => ({ dots: document.querySelectorAll('[data-fk^="mksltd:g0:1:"]').length, on: (document.querySelector('[data-fk="mksltd:g0:1:2"]') || {}).getAttribute && document.querySelector('[data-fk="mksltd:g0:1:2"]').getAttribute('aria-checked'), play: !!document.querySelector('[data-fk="mksltp:g0:1"]'), exp: document.querySelector('[data-fk="mksltn:g0:1"]').getAttribute('aria-expanded') }));
  ok(W + ' 누르면 5단계 점 줄(보통에 점) · «이 자리 들어 보기»', o1.dots === 5 && o1.on === 'true' && o1.play && o1.exp === 'true', JSON.stringify(o1));
  if (process.env.SHOT) await pg.locator('.mk-sl').first().screenshot({ path: process.env.SHOT + '-' + W + '.png' }).catch(() => {});
  const rail = await pg.evaluate(() => { const f = document.querySelector('.me-fab-stack,#meFabStack,.adv-fab,[class*="fab"]'); const t = document.querySelector('.mk-sltn.open .mk-dots-t'); if (!t) return { ok: false }; const r = t.getBoundingClientRect(); return { ok: true, right: Math.round(r.right), w: window.innerWidth }; });
  ok(W + ' 펼친 점 줄은 오른쪽 끝(아이콘 레일 자리)을 비운다', rail.ok && rail.right <= rail.w - 40, JSON.stringify(rail));
  await pg.click('[data-fk="mksltd:g0:1:0"]'); await pg.waitForTimeout(400);
  const s1 = await pg.evaluate(() => ({ p: S.vlines[_slVk('g0')][1].p, sig: _slTurnSig('g0'), aud: MK.audKey, auto: _vtNeed('g0'), pill: _aiMode('g0'), lab: (document.querySelector('[data-fk="mksltn:g0:1"]') || {}).textContent || '' }));
  ok(W + ' «바로»를 고르면 줄에 남고(p 0) · 그 자리만 이 기기 소리로 재생 · 머리 단추가 «목소리 만들기»(need) · 저절로 굽지 않는다 [TURN_NO_AUTOMAKE]', s1.p === 0 && s1.sig === '0:0' && s1.aud === 'turn:g0:1' && !s1.auto && s1.pill === 'need' && /쉼 바로/.test(s1.lab), JSON.stringify(s1));
  // 길이
  const dur = await pg.evaluate(async () => { const d = await __fakeD(); const len = async (tn) => { const p = await _vcProc(d, '오늘 와 주셔서 감사합니다. 편히 쉬다 가세요.', 900, { turns: tn }); const ab = await p.wav.arrayBuffer(); const v = new DataView(ab); return (ab.byteLength - 44) / 2 / v.getUint32(24, true); };
    return { now: await len(null), fast: await len([0]), mid: await len([1]), long: await len([4]) }; });
  ok(W + ' 길이 — 바로 < 짧게 < 보통(종전 그대로) < 아주 길게 · 바로는 빈소리까지 걷어 1초 넘게 짧다', dur.fast < dur.mid && dur.mid < dur.now && dur.now < dur.long && dur.now - dur.fast > 1.0, JSON.stringify(dur));
  const mk0 = await pg.evaluate(() => __makes); await pg.waitForTimeout(3500);
  const b0 = await pg.evaluate(() => ({ makes: __makes, tq: (S.up.g0 || {}).tq || '' }));
  ok(W + ' 고르고 기다려도 만들지 않는다(업체에 묻지 않음 · 파일 그대로) [TURN_NO_AUTOMAKE]', b0.makes === mk0 && b0.tq === '', JSON.stringify({ mk0, b0 }));
  await pg.evaluate(() => { _vtBakeAll(); _vtLeave('guest'); }); await pg.waitForTimeout(800);
  ok(W + ' 저장 · 쪽 떠나기도 쉼만 바뀐 줄은 굽지 않는다', await pg.evaluate((m) => __makes === m, mk0));
  await pg.evaluate(() => mkAiGo('g0')); await pg.waitForTimeout(1500);
  const b1 = await pg.evaluate(() => ({ tq: (S.up.g0 || {}).tq, pill: _aiMode('g0') }));
  ok(W + ' «목소리 만들기»를 눌러야 새 쉼으로 만든다(tq 0:0) — 당일 콘솔 · 미리 듣기가 같은 소리', b1.tq === '0:0' && b1.pill !== 'need', JSON.stringify(b1));
  const nr = await pg.evaluate(async () => { delete VC_RAW.g0; const m0 = __makes; mkSlTurnSet('g0', 1, 3); await new Promise((r) => setTimeout(r, 1200)); return { makes: __makes - m0, note: /«?목소리 만들기»?를 누르면 이 자리를 들어 볼 수 있어요/.test((document.querySelector('.mk-sltn.open') || {}).textContent || ''), play: !!document.querySelector('[data-fk="mksltp:g0:1"]') }; });
  ok(W + ' 이 기기에 받은 소리가 없을 때(새로 연 창) 골라도 만들지 않고 «목소리 만들기를 누르면 …» 한 줄 [TURN_NO_AUTOMAKE]', nr.makes === 0 && nr.note && !nr.play, JSON.stringify(nr));
  await pg.click('[data-fk="mksltd:g0:1:2"]'); await pg.waitForTimeout(300);
  const r1 = await pg.evaluate(() => ({ p: S.vlines[_slVk('g0')][1].p, sig: _slTurnSig('g0') }));
  ok(W + ' 보통으로 돌리면 남기지 않는다(종전과 같은 표식)', r1.p === undefined && r1.sig === '', JSON.stringify(r1));
  await pg.evaluate(() => { _stopMk(); });
  await pg.click('[data-fk="mksltn:g0:1"]'); await pg.waitForTimeout(200);
  ok(W + ' 다시 누르면 접힌다', await pg.evaluate(() => !document.querySelector('[data-fk^="mksltd:g0:1:"]') && document.querySelector('[data-fk="mksltn:g0:1"]').getAttribute('aria-expanded') === 'false'));
  const ga = await pg.evaluate(() => new Promise((res) => { const lab = _mpLab('guest'); _lStart(['guest'], false); setTimeout(() => { const q = LP.q.map((x) => x.bridge ? 'B:' + x.txt : (x.up || x.k)); lsStop(); const pq = _lSteps(ENG, ['prevideo']).map((x) => x.up || x.k); res({ lab, q, pv: RitualOpen.onOf(S, 'prevideo'), pq }); }, 400); }));
  ok(W + ' 하객 맞이 «전체 듣기»는 카드 넷 다 — … 5분 전 → «식전 영상이 흐른 뒤» → 1분 전 · «4줄 이어서» [GUEST_ALL_G3]', ga.pv && /4줄 이어서/.test(ga.lab) && ga.q.slice(-3).join('|') === 'g2|B:식전 영상이 흐른 뒤|g3' && ga.pq.indexOf('g3') > -1, JSON.stringify(ga));
  ok(W + ' 가로 넘침 없음', await pg.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  ok(W + ' pageerror 0', errs.length === 0, errs.join(' | ').slice(0, 300));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? '\nTURN_GAP FAIL ' + fail : '\nTURN_GAP OK'); process.exit(fail ? 1 : 0);
