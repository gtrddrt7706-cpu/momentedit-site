#!/usr/bin/env node
/* ★[PV_INTRO 2026-10-02 사장님 «식전 영상 · 두 분이 소개글을 적어서 AI 목소리로도 할 수 있고 · 적절한 예시도»] 화면 흐름 시험(가짜 서버 · 390 · 1280).
   보는 것: AI 가 꺼지면 고르는 칸 · 글칸 없음(스튜디오 한 줄) · 켜지면 [AI 두 분 목소리 | 스튜디오 나레이션]([R4-12]) → 글칸 · 예시 넷 · 빈 글이면 만들기 단추 없음 ·
     예시 → [AI로 만들기] → make(pv · 읽는 분 · 그 글) → 그 자리 파일(src ai · 글 지문) · 글을 고치면 «새 글로 다시 만들기» · 읽는 분을 바꾸면 만든 소리를 버린다 ·
     적어 둔 글을 예시로 덮기 전에 묻는다 · 엔진: pvVoice=couple 이면 식전 영상 큐가 두 분 목소리 자리(own) · 콘솔 pv → narr-prevideo-in · 들어 보기 줄 [PLAY_ROW]
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
// 엔진 · 콘솔(정적)
{ const C = require(path.join(ROOT, 'assets/ritual-cue.js')), O = require(path.join(ROOT, 'assets/ritual-open.js'));
  const on = {}; O.PICKABLE.forEach((k) => { on[k] = 1; });
  const base = { course: 'open', on, entry: 'A', entryVoice: 'nar', declare: '1', declareWho: 'narr', tributeSay: 'one', letter: 'each', toast: 'both', wine: 'none', freeWhat: 'video', freeLen: '3', candleWho: 'mothers' };
  const pv = (S) => C.build(S).cues.find((c) => c.k === 'prevideo');
  const a = pv(Object.assign({}, base)), b = pv(Object.assign({}, base, { pvVoice: 'couple' }));
  ok('엔진 — 기본은 스튜디오 한 줄 · pvVoice=couple 이면 같은 슬러그의 두 분 목소리 자리(own)', !a.own && b.own && a.slug === 'narr-prevideo-in' && b.slug === 'narr-prevideo-in' && a.text === b.text, JSON.stringify({ a: a.own, b: b.own }));
  const con = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
  ok('콘솔 — pv 자리는 narr-prevideo-in 에 물린다 · pvVoice=couple 이면 받는다', /pv: 'narr-prevideo-in'/.test(con) && /S\.pvVoice === 'couple'\) ks\.push\('pv'\)/.test(con));
  const lk = fs.readFileSync(path.join(ROOT, 'assets/ritual-preview-link.js'), 'utf8');
  ok('미리듣기 주소 — pvVoice 는 싣고 소개글(pvText)은 싣지 않는다', /'pvVoice',/.test(lk) && !/'pvText'/.test(lk)); }
for (const [W, touch] of [[390, true], [1280, false]]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: touch }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(1400);
  await pg.evaluate(() => {
    window.__calls = [];
    const tone = (sec) => { const sr = 24000, n = Math.round(sr * sec), x = new Float32Array(n); for (let i = 0; i < n; i++) x[i] = 0.25 * Math.sin(2 * Math.PI * 180 * i / sr); return _recWav(x, sr); };
    const b64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(String(r.result).split(',')[1]); r.readAsDataURL(blob); });
    window._vc = function (op, d) { window.__calls.push(op + (d && d.key ? ':' + d.key : '') + (d && d.one ? ':' + d.one : '')); window.__last = d;
      if (op === 'status') return Promise.resolve({ ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: false, left: 3 }, per: {} });
      if (op === 'make') return b64(tone(1.2)).then((x) => ({ ok: true, key: d.key, left: 4, parts: [{ who: d.one || 'groom', mime: 'audio/mpeg', data: x }] }));
      return Promise.resolve({ ok: false }); };
    const o = window.postMessage.bind(window);
    window.postMessage = function (m, t) { if (m && m.type === 'momentedit:ritualFile') { const k = m.data.key; window.__calls.push('upload:' + k); setTimeout(() => _mkUpDone({ key: k, ok: true, id: 'F' + k + Date.now(), name: m.data.name, at: '2026-10-02 10:00' }), 50); return; } return o(m, t); };
    RitualOpen.FEATURE.upLive = true; S.vsChip = 1;   /* [VS_CHIP_ONCE] 칩 첫 창은 voice-setup 이 잰다 */  RitualOpen.FEATURE.voiceClone = false; S.on.prevideo = 1; opSync();
    VC.st = { groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: false, left: 3 } };
    mkGo('prevideo'); try { lsStop(); } catch (e) {}
  });
  await pg.waitForTimeout(500);
  const off = await pg.evaluate(() => ({ chips: document.querySelectorAll('[data-fk^="lsc:pvVoice"]').length, ta: !!document.getElementById('mkPvTa'), row: !!document.querySelector('.mk-sech-r [data-fk="mkplay"]'), lab: [...document.querySelectorAll('.mk-flow .mk-lab')].map((e) => e.textContent).join('|') }));
  ok(W + ' AI 꺼짐 — 고르는 칸 · 글칸 없음 · 스튜디오 한 줄(이름 «식전 영상 소개») · 들어 보기 줄 [PLAY_ROW]', off.chips === 0 && !off.ta && off.row && /식전 영상 소개/.test(off.lab) && !/소개글/.test(off.lab), JSON.stringify(off));
  await pg.evaluate(() => { S.vsAsked = 1; RitualOpen.FEATURE.voiceClone = true; render(); });   /* [R2-15] ② 첫 진입 창은 voice-setup 이 잰다 */
  await pg.waitForTimeout(300);
  const ch = await pg.evaluate(() => [...document.querySelectorAll('[data-fk^="lsc:pvVoice"]')].map((e) => e.textContent).join('|'));
  ok(W + ' AI 켜짐 — [AI 두 분 목소리 | 스튜디오 나레이션](R4-12)', ch === 'AI 두 분 목소리|스튜디오 나레이션', ch);
  await pg.click('[data-fk="lsc:pvVoice:ai"]'); await pg.waitForTimeout(400);
  const e0 = await pg.evaluate(() => ({ pv: S.pvVoice, vf: (S.vfill || {}).prevideo, ta: !!document.getElementById('mkPvTa'), ex: document.querySelectorAll('[data-fk^="mkpvex:"]').length, ai: !!document.querySelector('[data-fk="mkai:pv"]'), note: /소개글을 적으면 신랑 AI 목소리로/.test(document.querySelector('.mk-pg').textContent), card: document.querySelectorAll('[data-fk="mkupplay:pv"],[data-fk^="mkwho:pv:"]').length }));
  ok(W + ' AI 고름 — 글칸 · 예시 넷 · 빈 글이면 [AI로 만들기] 없이 한 줄 안내 · 읽는 분 [신랑 | 신부]', e0.pv === 'couple' && e0.vf === 'ai' && e0.ta && e0.ex === 4 && !e0.ai && e0.note && e0.card === 2, JSON.stringify(e0));
  await pg.click('[data-fk="mkpvex:0"]'); await pg.waitForTimeout(300);
  const t0 = await pg.evaluate(() => ({ t: S.pvText, ta: document.getElementById('mkPvTa').value, ai: !!document.querySelector('[data-fk="mkai:pv"]'), on: (document.querySelector('[data-fk="mkpvex:0"]') || {}).getAttribute('aria-pressed') }));
  ok(W + ' 예시 «담백하게» → 글칸에 들어가고 [AI로 만들기]가 생긴다', /^저희 두 사람이 함께 지나온 시간을/.test(t0.t) && t0.ta === t0.t && t0.ai && t0.on === 'true', JSON.stringify(t0));
  await pg.click('[data-fk="mkai:pv"]'); await pg.waitForTimeout(1500);
  const m = await pg.evaluate(() => ({ calls: __calls.join(','), text: (__last && __last.text) || '', up: S.up && S.up.pv, play: !!document.querySelector('[data-fk="mkvpl:pv"][onclick^="mkUpPlay"]') }));   /* [AI_CARD_TIDY] AI 파일은 머리 ▶ 가 튼다 */
  ok(W + ' [AI로 만들기] → make(pv · 신랑 · 그 글) → 그 자리 파일(src ai · 글 지문)', /make:pv:groom/.test(m.calls) && /upload:pv/.test(m.calls) && m.text === t0.t && m.up && m.up.src === 'ai' && !!m.up.tx && m.play, JSON.stringify(m).slice(0, 300));
  await pg.fill('#mkPvTa', t0.t + ' 고맙습니다.'); await pg.evaluate(() => render()); await pg.waitForTimeout(300);
  const st = await pg.evaluate(() => ({ btn: (document.querySelector('[data-fk="mkai:pv"]') || {}).textContent || '', s: (document.querySelector('[data-fk="mkwho:pv:g"]').closest('.mk-vc') || {}).textContent || '' }));
  ok(W + ' 글을 고치면 «글을 고쳤어요 · 다시 만들어 주세요» · [새 글로 다시 만들기]', st.btn === '새 글로 다시 만들기' && /글을 고쳤어요/.test(st.s), JSON.stringify(st).slice(0, 300));
  await pg.click('[data-fk="mkpvex:1"]'); await pg.waitForTimeout(300);
  const ask = await pg.evaluate(() => { const d = document.querySelector('.ord-ask'); return d ? d.textContent : ''; });
  ok(W + ' 적어 둔 글을 예시로 덮기 전에 묻는다', /예시로 바꿀까요/.test(ask), ask.slice(0, 120));
  await pg.click('.ord-ask .oa-no'); await pg.waitForTimeout(300);
  ok(W + ' «그대로 두기»면 적어 둔 글이 남는다', await pg.evaluate(() => / 고맙습니다\.$/.test(S.pvText)));
  await pg.click('[data-fk="mkwho:pv:b"]'); await pg.waitForTimeout(400);
  const wb = await pg.evaluate(() => ({ who: S.pvWho, up: !!(S.up && S.up.pv), mk: __calls.filter((c) => /make:pv:bride/.test(c)).length }));
  ok(W + ' 읽는 분을 신부로 — 신랑 목소리로 만든 소리는 버린다 · 신부 목소리가 없으면 만들지 않는다', wb.who === 'b' && !wb.up && wb.mk === 0, JSON.stringify(wb));
  ok(W + ' 화면 오류 없음', errs.length === 0, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(log.join('\n')); console.log(fail ? `\n✗ PV_INTRO ${fail}건 실패` : '\n✓ PV_INTRO 통과');
process.exit(fail ? 1 : 0);
