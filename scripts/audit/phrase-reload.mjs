#!/usr/bin/env node
/* ★[PHRASE_NO_DEAD · REFRESH_BTN 2026-10-05 사장님 «여기서 진행이 안 돼 · 전에도 그랬는데» · «새로고침 버튼 · 모바일은 당기면»] 실브라우저 시험(가짜 서버 · 390 · 1280).
   보는 것: ①확인 문장을 못 받아도 막다른 길이 없다 — 창 위 빨간 글 없음 · 글 2 로 가면 저절로 다시 묻는다 · 그래도 못 받으면 잠긴 «녹음 시작» 대신 «확인 문장 다시 받기» · 누르면 받고 녹음이 켜진다
     ②1280 머리 줄 «⋯ · 새로고침 · 저장 · 나가기» · 누르면 지금 판(S)을 마이페이지에 넘긴다(orderReload) · 답이 없으면 한 줄로 알린다
     ③390(손가락) 은 알약이 숨고 맨 위에서 당기면 같은 길 ④새로고침 뒤 orderFill(reload) 은 이 기기 판을 덮지 않는다
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
    window.__phr = 0; window.__phrOk = false; window.__sent = [];
    const st = { groom: { consent: true, ready: false, left: 3 }, bride: { consent: true, ready: false, left: 3 } };
    window._vc = function (op, d) {
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: st.groom, bride: st.bride, per: {} });
      if (op === 'phrase') { window.__phr++; return Promise.resolve(window.__phrOk ? { ok: true, phrase: '오늘은 시월 오일, 파란 우산과 노란 연필.' } : { ok: false, down: true, error: '지금은 AI 목소리를 만들 수 없어요 · 잠시 뒤 다시 눌러 주세요. 그동안 이 줄은 스튜디오 나레이션으로 나와요' }); }
      return Promise.resolve({ ok: false });
    };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:orderReload') { window.__sent.push(m); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.guestVoice = 'couple'; VC.st = { groom: st.groom, bride: st.bride };
  });
  // ① 확인 문장
  await pg.evaluate(() => { VC.pre = {}; mkVcRead('groom'); }); await pg.waitForTimeout(300);
  const d1 = await pg.evaluate(() => ({ t: (document.getElementById('mkRecDlg') || {}).innerText || '', msg: MK.dlgMsg || '', phErr: VC.read.phErr }));
  ok(W + ' 글 1 — 확인 문장을 못 받아도 창 위 «AI 목소리를 만들 수 없어요» 빨간 글이 없다', !/만들 수 없어요/.test(d1.t) && !d1.msg && d1.phErr === true, JSON.stringify(d1).slice(0, 240));
  const n0 = await pg.evaluate(() => __phr);
  await pg.evaluate(() => { VC.read.take[1] = { wav: new Blob(), dur: 16 }; mkVcStep(2); }); await pg.waitForTimeout(300);
  const d2 = await pg.evaluate(() => ({ n: __phr, t: (document.getElementById('mkRecDlg') || {}).innerText || '', again: !!document.querySelector('[data-fk="mkvcphrase"]'), lock: !!document.querySelector('[data-fk="mkvcrec:2"][disabled]') }));
  if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + '-' + W + '.png' }).catch(() => {});
  ok(W + ' 글 2 로 가면 저절로 다시 묻는다', d2.n === n0 + 1, n0 + '→' + d2.n);
  ok(W + ' 그래도 못 받으면 잠긴 «녹음 시작» 대신 «확인 문장 다시 받기»(누를 수 있다)', d2.again && !d2.lock && /아직 못 받았어요/.test(d2.t), JSON.stringify(d2).slice(0, 260));
  await pg.evaluate(() => { __phrOk = true; }); await pg.click('[data-fk="mkvcphrase"]'); await pg.waitForTimeout(300);
  const d3 = await pg.evaluate(() => { const b = document.querySelector('[data-fk="mkvcrec:2"]'); return { has: !!b, dis: b ? b.disabled : null, t: (document.getElementById('mkRecDlg') || {}).innerText || '' }; });
  ok(W + ' 다시 받으면 문장이 붙고 «녹음 시작»이 켜진다', d3.has && d3.dis === false && /시월 오일/.test(d3.t) && !/받는 중|못 받았어요/.test(d3.t), JSON.stringify(d3).slice(0, 260));
  await pg.evaluate(() => { VC.read = null; MK.dlgMsg = ''; render(); }); await pg.waitForTimeout(300);
  // ② · ③ 새로고침
  const head = await pg.evaluate(() => { const s = document.getElementById('obExitSlot'), b = document.getElementById('obReload'); return { order: [...s.children].filter((e) => getComputedStyle(e).display !== 'none').map((e) => e.id || e.className).join(','), vis: !!b && getComputedStyle(b).display !== 'none', lab: b && b.getAttribute('aria-label') }; });
  if (!mob) {
    ok('1280 머리 줄 «⋯ · 새로고침 · 저장 · 나가기» [REFRESH_BTN]', head.vis && head.lab === '새로고침' && /obMoreWrap,obReload,obSave,obExit|obReload,obSave,obExit/.test(head.order), JSON.stringify(head));
    if (process.env.SHOT) await pg.screenshot({ path: process.env.SHOT + '-head.png', clip: { x: 0, y: 0, width: 1280, height: 120 } }).catch(() => {});
    await pg.click('#obReload'); await pg.waitForTimeout(200);
  } else {
    ok('390 손가락 기기 — 알약은 숨는다(당겨서 새로고침) [REFRESH_BTN]', !head.vis, JSON.stringify(head));
    await pg.evaluate(() => window.scrollTo(0, 0));
    const c = await ctx.newCDPSession(pg);
    const tp = (y) => [{ x: 200, y }];
    await c.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: tp(200) });
    for (let y = 205; y <= 330; y += 15) { await c.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: tp(y) }); await pg.waitForTimeout(16); }
    const bar = await pg.evaluate(() => { const b = document.querySelector('.ob-pull'); return b ? b.classList.contains('on') + ':' + b.textContent : ''; });
    ok('390 당기면 «놓으면 새로고침돼요» 띠', /^true:놓으면 새로고침돼요/.test(bar), bar);
    await c.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); await pg.waitForTimeout(200);
  }
  const sent = await pg.evaluate(() => __sent.map((m) => ({ S: !!(m.data && m.data.S) })));
  ok(W + ' 새로고침 = 지금 판(S)을 마이페이지에 넘긴다(orderReload) [ORDER_RELOAD]', sent.length === 1 && sent[0].S, JSON.stringify(sent));
  await pg.waitForTimeout(4300);
  ok(W + ' 마이페이지가 답이 없으면 한 줄로 알린다(몰래 옛 초안으로 새로고침하지 않는다)', await pg.evaluate(() => /새로고침하지 못했어요/.test(document.body.innerText)));
  // ④ reload 뒤 orderFill 은 이 기기 판을 덮지 않는다
  const kept = await pg.evaluate(() => new Promise((res) => { _restored = true; const before = JSON.stringify(S); window.postMessage({ type: 'momentedit:orderFill', reload: true, done: false, draft: { S: { course: 'open', on: {}, zzOld: 1 } } }, location.origin); setTimeout(() => res(JSON.stringify(S) === before && !S.zzOld), 300); }));
  ok(W + ' 새로고침 뒤 orderFill(reload) 은 이 기기 판을 그대로 둔다 [ORDER_RELOAD]', kept);
  ok(W + ' pageerror 0', errs.length === 0, errs.join(' | ').slice(0, 300));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? '\nPHRASE_RELOAD FAIL ' + fail : '\nPHRASE_RELOAD OK'); process.exit(fail ? 1 : 0);
