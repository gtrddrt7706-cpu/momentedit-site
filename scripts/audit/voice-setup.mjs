#!/usr/bin/env node
/* ★[VOICE_SETUP 2026-10-02 사장님 «② 머리글 나레이션 자세히 → 창 · AI/스튜디오 고르기부터» · «② 들어갈 때 창으로 먼저 · 한 번 셋팅 → 하객 맞이 · 입장 · 식전 영상 한꺼번에» · «각 순간에서 비교해 듣기» · «휴대폰 녹음 가이드 · 모션»]
   화면 흐름 시험(가짜 서버 · 390 · 1280). 보는 것: ② 처음 들어오면 창이 먼저(AI 를 쓸 수 있는 예식만) · 고르는 판 둘 · AI → 세 자리 칩이 한꺼번에 AI ·
     사람 줄(1분 읽기) · 녹음 길잡이(휴대폰 그림 · 움직임 줄이기면 멈춤) · 이미 만든 목소리로 빈 줄을 바로 채운다 · [다 됐어요]로 닫힘 · 두 번째부터는 저절로 안 뜬다 ·
     ② 진행 줄 아래 «나레이션 자세히» → 고르기부터 · 스튜디오 → 세 자리 나레이션 · 닫힘 · AI 줄 카드에 «스튜디오 나레이션과 비교해 듣기» → 나레이션 파일
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
const SHOT = process.env.VS_SHOT || '';
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch, reducedMotion: 'no-preference' }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate(() => {
    window.__calls = []; window.__aud = [];
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window._vc = function (op, d) { window.__calls.push(op + (d && d.key ? ':' + d.key : ''));
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: false, ready: false, left: 3 }, per: {} });
      if (op === 'make') return b64(tone(1)).then((x) => ({ ok: true, key: d.key, left: 4, parts: (d.lines || [[d.one || 'groom']]).map((l) => ({ who: l[0], mime: 'audio/mpeg', data: x })) }));
      return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; window.__calls.push('upload:' + k); setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-02 10:00' }), 50); return; } return o(m, t); };
    const A = window.Audio; window.Audio = function (u) { window.__aud.push(String(u)); const a = new A(); a.play = () => Promise.resolve(); return a; };
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.on.prevideo = 1; opSync();
  });
  await nx(); await pg.waitForTimeout(1400);
  const d0 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { open: !!d, t: d ? d.querySelector('.mk-dlg-t').textContent : '', opts: d ? [...d.querySelectorAll('[data-fk^="mkvs:"]')].map((b) => b.querySelector('b').textContent).join('|') : '', asked: S.vsAsked }; });
  ok(W + ' ② 처음 들어오면 창이 먼저 — «안내 목소리 정하기» · [AI 두 분 목소리 | 스튜디오 나레이션]', d0.open && d0.t === '안내 목소리 정하기' && d0.opts === 'AI 두 분 목소리|스튜디오 나레이션' && d0.asked === 1, JSON.stringify(d0));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/vs-pick-${W}.png` });
  await pg.click('[data-fk="mkvs:ai"]'); await pg.waitForTimeout(2500);
  const d1 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { t: d ? d.querySelector('.mk-dlg-t').textContent : '', gv: S.guestVoice, ev: S.entryVoice, pv: S.pvVoice, vf: JSON.stringify(S.vfill), rows: d ? d.querySelectorAll('.mk-vsp li').length : 0, read: d ? d.querySelectorAll('[data-fk="mkvsread:bride"]').length + '/' + d.querySelectorAll('[data-fk="mkvsread:groom"]').length : '', svg: !!(d && d.querySelector('.mk-vsg svg .wv')), anim: d && d.querySelector('.mk-vsg .wv') ? getComputedStyle(d.querySelector('.mk-vsg .wv')).animationName : '', made: __calls.filter((c) => /^make:/.test(c)).length }; });
  ok(W + ' AI → 세 자리가 한꺼번에 AI · 사람 줄 둘(만든 분은 ✓ · 안 만든 분만 [1분 읽기 시작]) · 녹음 길잡이 그림이 움직인다 · 만든 목소리로 빈 줄을 바로 채운다', d1.t === 'AI 두 분 목소리 만들기' && d1.gv === 'couple' && d1.ev === 'couple' && d1.pv === 'couple' && d1.vf === '{"guest":"ai","entry":"ai","prevideo":"ai"}' && d1.rows === 2 && d1.read === '1/0' && d1.svg && d1.anim === 'mkVsWave' && d1.made > 0, JSON.stringify(d1));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/vs-ai-${W}.png` });
  await pg.click('[data-fk="mkvsread:bride"]'); await pg.waitForTimeout(300);
  const d2 = await pg.evaluate(() => (document.querySelector('#mkRecDlg .mk-dlg-t') || {}).textContent || '');
  await pg.click('[data-fk="mkdlgx"]'); await pg.waitForTimeout(300);
  const d3 = await pg.evaluate(() => (document.querySelector('#mkRecDlg .mk-dlg-t') || {}).textContent || '');
  ok(W + ' [1분 읽기 시작] → 동의 창 · 닫으면 이 창으로 돌아온다', /님 목소리로 AI 목소리를 만들어요/.test(d2) && d3 === 'AI 두 분 목소리 만들기', JSON.stringify({ d2, d3 }));
  await pg.click('[data-fk="mkvsdone"]'); await pg.waitForTimeout(400);
  ok(W + ' [다 됐어요] → 창이 닫힌다', await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  await pg.evaluate(() => { VS.seen = false; mkGo('entry'); }); await pg.waitForTimeout(400);
  ok(W + ' 두 번째부터는 저절로 안 뜬다(S.vsAsked)', await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  const pill = await pg.evaluate(() => { const v = document.querySelector('.mk-vsbar'); return v ? { t: v.textContent, h: Math.round(v.querySelector('[data-fk="mkvsopen"]').getBoundingClientRect().height), pills: !!document.getElementById('obVoice') } : null; });
  ok(W + ' ② 진행 줄 아래 «안내 목소리 · AI 두 분 목소리 · 나레이션 자세히»(누를 곳 44 · 머리 알약 줄에는 없음)', pill && /안내 목소리 · AI 두 분 목소리/.test(pill.t) && /나레이션 자세히/.test(pill.t) && pill.h >= 44 && !pill.pills, JSON.stringify(pill));
  await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(1800);
  if (SHOT) { await pg.evaluate(() => { try { lsStop(); } catch (e) {} window.scrollTo(0, 0); }); await pg.waitForTimeout(300); await pg.screenshot({ path: `${SHOT}/vs-guest-${W}.png` }); }
  const cmp = await pg.evaluate(() => { const b = document.querySelector('[data-fk^="mknar:"]'); if (!b) return { b: false }; b.click(); return { b: true, k: b.getAttribute('data-fk'), a: __aud[__aud.length - 1] || '' }; });
  ok(W + ' AI 줄 카드 «스튜디오 나레이션과 비교해 듣기» → 그 자리의 나레이션 파일', cmp.b && /\/narration\/.*\.mp3$/.test(cmp.a), JSON.stringify(cmp));
  await pg.click('[data-fk="mkvsopen"]'); await pg.waitForTimeout(400);
  const d4 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'); return { t: d ? d.querySelector('.mk-dlg-t').textContent : '', ai: d ? d.querySelector('[data-fk="mkvs:ai"]').getAttribute('aria-pressed') : '' }; });
  ok(W + ' «나레이션 자세히»를 누르면 고르기부터 · 지금 값(AI)이 눌린 모양', d4.t === '안내 목소리 정하기' && d4.ai === 'true', JSON.stringify(d4));
  await pg.click('[data-fk="mkvs:nar"]'); await pg.waitForTimeout(400);
  const d5 = await pg.evaluate(() => ({ dlg: !!document.getElementById('mkRecDlg'), v: [S.guestVoice, S.entryVoice, S.pvVoice].join(','), vf: JSON.stringify(S.vfill || {}) }));
  ok(W + ' 스튜디오 → 세 자리 나레이션 · 창 닫힘', !d5.dlg && d5.v === 'nar,nar,nar' && d5.vf === '{}', JSON.stringify(d5));
  await pg.evaluate(() => { RitualOpen.FEATURE.voiceClone = false; render(); });
  ok(W + ' AI 를 못 쓰는 예식엔 그 줄이 없다', await pg.evaluate(() => !document.querySelector('.mk-vsbar')));
  ok(W + ' 화면 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? `\n✗ VOICE_SETUP ${fail}건 실패` : '\n✓ VOICE_SETUP 통과');
process.exit(fail ? 1 : 0);
