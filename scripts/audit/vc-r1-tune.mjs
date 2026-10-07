#!/usr/bin/env node
/* ★★[VC_R1_TUNE 2026-10-08 목소리 1라운드 · 맞추기 창 묶음] 진짜 마이페이지(mypage.html · 중계) + 진짜 식순 화면(order-preview.html · iframe) + 가짜 서버(vc-sim 과 같은 규칙) · 가짜 시계.
   고친 것마다 장면 하나 — 고객 눈으로(390 폭 · 단추를 실제로 누른다) 본다. 종료 코드 0 통과 · 1 실패 · 2 재지 못함. ONLY=<장면 이름,…> · SHOTS=<폴더> 면 390 화면을 찍는다
   13 [DLG_TA_GROW]       맞추기 창 예시 글칸이 폰에서 잘리지 않고 · 점을 눌러 다시 그려도 창 높이가 그대로
   14 [UNREAD_OWN_TEXT]   하객 맞이 1 을 두 줄로 나눈 고객도 맞추기 예시는 예시 글만 검사(멀쩡하면 서버로 · 낱자면 화면에서 «이 글»로) · 그 줄 자신을 만들 때는 «2번째 줄 «ㅋㅋㅋ»»
   15 [FILL_GOT]          줄을 채우는 중 카드에서 빠르기를 바꿔 써도 만들던 줄이 새 빠르기로 채워지고 · «채웠어요»는 붙은 줄만 센다
   16 [REBAKE_FAIL_NEED]  새 빠르기로 다시 굽다 실패한 줄 = 머리 «목소리 만들기»(다시 누를 곳) · 누른 곳에 코드와 함께 한 줄 · 누르면 새 빠르기로
      [KEEP_HEARD]        빠르기만 다른 줄의 «확정하기» = 고른 빠르기로 먼저 만들고 확정(옛 빠르기로 굳지 않는다) · 확정하면 그 줄 옛 실패 글을 걷는다
   18 [TUNE_PRESS_ONLY]   고친 글을 만드는 중에 더 고쳐도 누르지 않은 글은 만들지 · 틀지 않는다(단추가 «이 글로 들어 보기»로)
   19 [TUNE_ERR_STALE]    고친 글이 실패한 뒤 «처음 예시로» · 들고 있는 소리의 글로 돌아오면 빨간 실패 글이 걷힌다(같은 글을 다시 누르면 다시 보인다)
   21 [TUNE_EMPTY_ONE]    글칸을 비우면 «예시 들어 보기»가 어느 길로 그려도 잠기고 · 점을 눌러도 빈 칸에 처음 예시를 틀지 않는다 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 — vc-sim.mjs 의 SERVER 와 같은 규칙(만든 소리는 저장 · 같은 글이면 바로 · 끊겨도 서버는 끝까지).
   더한 것: 목소리를 미리 만든 상태(cfg.st) · 만들기 요청 기록(SV.bodies) · 장애를 글 · 빠르기 · 뒤일 여부로 고르기 · 장애 목록은 실행 중에 바꿀 수 있다(window.__SV.faults) */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const MP3 = cfg.mp3;
  const SV = window.__SV = { st: cfg.st || { groom: {}, bride: {} }, cache: {}, files: {}, log: [], n: {}, faults: cfg.faults || [], bodies: [] };
  const LAT = Object.assign({ status: 400, consent: 400, phrase: 400, enroll: 3000, make: 3000, makeHit: 600, practice: 3000, practiceHit: 600, delete: 800, ritualFile: 800 }, cfg.lat || {});
  const pub = (p) => ({ consent: !!p.consent, ready: !!p.voiceId, tries: p.tries || 0, left: 3, made: p.made || '' });
  const now = () => Date.now();
  function handle(b) {
    const op = b.action === 'voiceClone' ? b.op : b.action, st = SV.st, who = b.who;
    if (b.action === 'voiceClone') {
      if (op === 'status') return { lat: LAT.status, res: () => ({ ok: true, on: true, tts: true, groom: pub(st.groom), bride: pub(st.bride), total: 0, left: 99999 }) };
      if (op === 'consent') return { lat: LAT.consent, res: () => { st[who].consent = 1; return { ok: true, who }; } };
      if (op === 'phrase') return { lat: LAT.phrase, res: () => { st[who].phrase = '오늘은 시월 칠일, 파란 우산과 노란 연필.'; return { ok: true, who, phrase: st[who].phrase }; } };
      if (op === 'enroll') return { lat: LAT.enroll, res: () => { const p = st[who]; if (!p.consent) return { ok: false, error: '동의가 먼저예요.' }; if (!p.phrase) return { ok: false, error: '확인 문장을 먼저 받아 주세요.' };
        const prev = p.voiceId; p.tries = (p.tries || 0) + 1; p.voiceId = 'v-' + who + '-' + p.tries; p.made = '2026-10-08 10:00'; p.phrase = null; return { ok: true, who, tries: p.tries, renewed: !!prev }; } };
      if (op === 'make' || op === 'practice') {
        const lines = Array.isArray(b.lines) ? b.lines : [[b.one || '', b.text]];
        const keys = lines.map((l) => { let w = l[0] === 'groom' || l[0] === 'bride' ? l[0] : (st.groom.voiceId ? 'groom' : 'bride'); let v = (st[w] || {}).voiceId; if (!v) { const ow = w === 'groom' ? 'bride' : 'groom'; if (st[ow].voiceId) { w = ow; v = st[ow].voiceId; } } if (!v && op === 'practice') v = 'def'; return [w, v || '', op + '|' + v + '|' + b.tempo + '|' + b.pause + '|' + l[1]]; });
        const fresh = keys.filter((k) => !SV.cache[k[2]]).length;
        return { lat: fresh ? LAT[op] : LAT[op + 'Hit'], res: () => { if (op === 'make' && keys.some((k) => !k[1])) return { ok: false, error: '아직 만든 AI 목소리가 없어요.' };
          keys.forEach((k) => { SV.cache[k[2]] = 1; });
          return op === 'make' ? { ok: true, key: b.key, parts: keys.map((k) => ({ who: k[0], mime: 'audio/mpeg', data: MP3 })), total: 1 } : { ok: true, mime: 'audio/mpeg', data: MP3, mine: true }; } };
      }
      return { lat: 300, res: () => ({ ok: false, error: '알 수 없는 요청이에요.' }) };
    }
    if (b.action === 'ritualFile') return { lat: LAT.ritualFile, res: () => { SV.files[b.key] = (SV.files[b.key] || 0) + 1; return { ok: true, name: b.name, id: 'f-' + b.key + '-' + SV.files[b.key], at: '방금' }; } };
    if (b.action === 'getMyState') return { lat: 300, res: () => ({ ok: false, reason: 'none' }) };
    return { lat: 300, res: () => ({ ok: true }) };
  }
  const real = window.fetch.bind(window);
  window.fetch = function (url, o) {
    if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    const op = b.action === 'voiceClone' ? b.op : b.action; SV.n[op] = (SV.n[op] || 0) + 1; const nth = SV.n[op];
    if (op === 'make') SV.bodies.push({ key: b.key, text: String(b.text || ''), tempo: String(b.tempo), pause: b.pause, bg: !!b.bg, one: b.one || '', lines: b.lines ? b.lines.length : 0 });
    const f = SV.faults.find((x) => x.op === op && !(x.text && !String(b.text || '').includes(x.text)) && !(x.tempo && String(b.tempo) !== x.tempo) && !(x.notbg && b.bg)) || null;
    const h = handle(b), lat = f && f.lat != null ? f.lat : h.lat;
    SV.log.push({ op, nth, f: f ? f.kind : '' });
    return new Promise((resolve, reject) => {
      const kind = f ? f.kind : '';
      if (kind === 'busy') { setTimeout(() => resolve(new Response(JSON.stringify({ ok: false, down: true, kind: 'busy', http: 429, ecode: 'V1', error: '요청이 몰렸어요 (코드 V1)' }), { status: 200 })), lat); return; }
      setTimeout(() => resolve(new Response(JSON.stringify(h.res()), { status: 200, headers: { 'Content-Type': 'application/json' } })), lat);
    });
  };
};

async function frame(pg) { for (let i = 0; i < 60; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function adv(pg, ms, step = 250) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(4); } }
async function until(pg, f, fn, max = 120000, step = 250) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn).catch(() => false)) return t; await pg.clock.runFor(step); await wait(4); } return -1; }
const READY = { groom: { consent: 1, voiceId: 'v-groom-1', tries: 1, made: '2026-10-08 10:00' }, bride: {} };

async function open(o = {}) {
  const ctx = await br.newContext({ viewport: { width: o.w || 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3: MP3, st: o.ready ? JSON.parse(JSON.stringify(READY)) : null, faults: o.faults || [] });
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await adv(pg, 1500);
  const f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  if (await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function', 20000) < 0) throw new Error('식순 화면이 준비되지 않았다');
  await f.evaluate((setup) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true;
    S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.pvText = '두 사람의 이야기를 영상으로 준비했습니다.';
    if (setup) (new Function(setup))();
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo('_voice'); }, o.setup || '');
  await adv(pg, 3000);
  return { ctx, pg, f, errs };
}
/* 실제로 누른다 — 화면에 보이게 굴린 뒤 클릭(안 되면 그 단추의 click) */
async function tap(f, sel) { const n = await f.evaluate((s) => { const b = document.querySelector(s); if (!b) return false; b.scrollIntoView({ block: 'center' }); return true; }, sel); if (!n) return false;
  await f.locator(sel).first().click({ timeout: 4000 }).catch(async () => { await f.evaluate((s) => document.querySelector(s).click(), sel); }); return true; }
async function cardTune(o) { await until(o.pg, o.f, () => !!document.querySelector('[data-fk="mkvctune:groom"]'), 20000); if (!(await tap(o.f, '[data-fk="mkvctune:groom"]'))) await o.f.evaluate(() => mkVcTune('groom'));
  return until(o.pg, o.f, () => VC.tune && !VC.tune.loading && !!VC.sraw.groom, 60000); }
async function stopTune(o) { await o.f.evaluate(() => { if (MK.audKey === 'tune') { _stopMk(); render(); } }); await adv(o.pg, 300); }
/* 한 분 목소리 만들기(동의 → 문장 → 1분 녹음 두 글 → 만들기) → 맞추기 창 예시까지 */
async function enroll(o) { const { pg, f } = o;
  await f.evaluate(() => { mkVcConsent('groom'); VC.agree = true; mkVcAgree('groom'); });
  if (await until(pg, f, () => !!(VC.read && VC.read.phrase), 30000) < 0) return false;
  await f.evaluate(() => { const R = VC.read, sr = 16000, mk = (s) => { const x = new Float32Array(sr * s); for (let i = 0; i < x.length; i++) x[i] = Math.sin(i / 9) * 0.2; return { wav: _recWav(x, sr), dur: s }; }; R.take[1] = mk(15); R.take[2] = mk(15); R.step = 2; mkVcEnroll(); });
  return (await until(pg, f, () => VC.tune && !VC.tune.loading && !!VC.sraw.groom, 90000)) >= 0; }
const settled = () => !(VC.fill && VC.fill.doing) && !Object.keys(MK_UP).length && !Object.keys(VC_MKP).length && !Object.keys(VT_BAKING).length;
const UPS = (f) => f.evaluate(() => ['g0', 'g2', 'entry', 'pv'].map((k) => { const v = (S.up || {})[k]; return k + ':' + (v && typeof v === 'object' && v.src === 'ai' ? 'ai/' + _tNorm(v.tempo) : '-'); }).join(' '));
const shot = async (o, nm) => { if (SHOTS) await o.pg.screenshot({ path: path.join(SHOTS, nm + '.png') }); };

const SCENES = {
  /* 13 [DLG_TA_GROW] */
  async T13_예시글칸() { const o = await open({ ready: true });
    const t = await cardTune(o); await stopTune(o);
    const m = () => o.f.evaluate(() => { const ta = document.querySelector('[data-fk="mktunetext"]'), d = document.querySelector('#mkRecDlg .mk-dlg-c'); return { sh: ta.scrollHeight, ch: ta.clientHeight, h: ta.style.height, dlg: d ? Math.round(d.getBoundingClientRect().height) : 0 }; });
    const a = await m(); await shot(o, 'T13-tune-390');
    await o.f.locator('[data-fk="mktunetext"]').click(); await o.f.locator('[data-fk="mktunetext"]').press('End'); await o.f.locator('[data-fk="mktunetext"]').type(' 함께해 주셔서 고맙습니다.'); await adv(o.pg, 300);
    const b = await m(); await tap(o.f, '[data-fk="mktune:t:4"]'); await adv(o.pg, 600); await stopTune(o); const c = await m();
    ok('13 [DLG_TA_GROW] 폰(390) 맞추기 창 예시 글이 잘리지 않는다 · 쳐서 키운 칸이 점을 눌러 다시 그려도 그대로(창 높이도)', t >= 0 && a.sh <= a.ch + 1 && !!a.h && c.sh <= c.ch + 1 && c.dlg === b.dlg && !o.errs.length, JSON.stringify({ t, a, b, c, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 14 [UNREAD_OWN_TEXT] */
  async T14_낱자검사() { const o = await open({ ready: true, setup: "S.vlines={g0:[{w:'g',t:'오늘 와 주셔서 감사합니다.'},{w:'b',t:'편히 앉아 계세요 ㅎㅎ'}]};" });
    const t = await cardTune(o); await stopTune(o);
    const r1 = await o.pg.evaluate(() => ({ sent: __SV.bodies.filter((b) => !b.bg && b.key === 'g0' && b.tempo === '1').map((b) => b.text.slice(0, 12)) }));
    const e1 = await o.f.evaluate(() => VC.tune && VC.tune.err);
    await o.f.evaluate(() => { S.vlines.g0 = [{ w: 'g', t: '오늘 와 주셔서 감사합니다.' }, { w: 'b', t: '편히 앉아 계세요.' }]; });
    await o.f.locator('[data-fk="mktunetext"]').fill('ㄴㅇㅁㄴㅇㅁ'); await adv(o.pg, 300); await tap(o.f, '[data-fk="mktuneplay"]'); await adv(o.pg, 1500);
    const r2 = await o.pg.evaluate(() => __SV.bodies.filter((b) => /ㄴㅇㅁ/.test(b.text)).length); const e2 = await o.f.evaluate(() => VC.tune && VC.tune.err); await shot(o, 'T14-jamo-390');
    await o.f.evaluate(() => { mkDlgClose(); S.vlines.g0 = [{ w: 'g', t: '오늘 와 주셔서 감사합니다.' }, { w: 'g', t: 'ㅋㅋㅋ 반가워요' }]; delete (S.up || {}).g0; _persist(); render(); mkAi('g0'); }); await adv(o.pg, 1500);
    const e3 = await o.f.evaluate(() => (MK.lineErr || {}).g0 || ''); const r3 = await o.pg.evaluate(() => __SV.bodies.filter((b) => /ㅋㅋㅋ/.test(b.text) && !b.bg).length);
    ok('14 [UNREAD_OWN_TEXT] 하객 맞이 1 의 다른 줄에 낱자가 있어도 멀쩡한 예시는 서버로 가 들린다', t >= 0 && r1.sent.length >= 1 && !e1, JSON.stringify({ t, r1, e1 }));
    ok('14 [UNREAD_OWN_TEXT] 하객 맞이 1 이 멀쩡한 두 줄이어도 낱자 예시는 화면에서 걸러 «이 글»로 말한다(줄 번호 없이)', r2 === 0 && /«ㄴㅇㅁㄴㅇㅁ»/.test(e2 || '') && !/번째 줄/.test(e2 || ''), JSON.stringify({ r2, e2 }));
    ok('14 [UNREAD_OWN_TEXT] 그 줄 자신을 만들 때는 그대로 «2번째 줄 «ㅋㅋㅋ»…»(낱자가 있는 낱말을 인용) · 업체에 안 묻는다', /^2번째 줄 «ㅋㅋㅋ»처럼 자음 · 모음만/.test(e3) && r3 === 0 && !o.errs.length, JSON.stringify({ e3, r3, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 15 [FILL_GOT] */
  async T15_채우는중빠르기() { const o = await open({});
    if (!(await enroll(o))) { ok('15 [FILL_GOT] 목소리 만들기까지 가지 못했다', false); await o.ctx.close(); return; }
    await stopTune(o); await tap(o.f, '[data-fk="mkvcuse"]'); await adv(o.pg, 1500);
    const mid = await o.f.evaluate(() => ({ doing: !!(VC.fill && VC.fill.doing), mk: Object.keys(VC_MKP) }));
    await tap(o.f, '[data-fk="mkvcdone"]'); await adv(o.pg, 400);
    await cardTune(o); await stopTune(o); await tap(o.f, '[data-fk="mktune:t:5"]'); await adv(o.pg, 500); await stopTune(o); await tap(o.f, '[data-fk="mkvcuse"]'); await adv(o.pg, 500);
    const st = await until(o.pg, o.f, settled, 200000); await adv(o.pg, 1500);
    const ups = await UPS(o.f), fill = await o.f.evaluate(() => VC.fill);
    ok('15 [FILL_GOT] 줄을 채우는 중 카드에서 빠르기를 «빠르게»로 바꿔 써도 만들던 줄까지 새 빠르기로 찬다 · «채웠어요» 수 = 실제로 붙은 줄', mid.doing && mid.mk.length && st >= 0 && ups === 'g0:ai/1.3 g2:ai/1.3 entry:ai/1.3 pv:ai/1.3' && fill && fill.ok === 4 && fill.n === 4 && !o.errs.length, JSON.stringify({ mid, st, ups, fill, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 16 [REBAKE_FAIL_NEED] */
  async T16_다시굽기실패() { const o = await open({});
    if (!(await enroll(o))) { ok('16 [REBAKE_FAIL_NEED] 목소리 만들기까지 가지 못했다', false); await o.ctx.close(); return; }
    await stopTune(o); await tap(o.f, '[data-fk="mkvcuse"]'); await until(o.pg, o.f, settled, 200000); await adv(o.pg, 1000);
    await o.f.evaluate(() => { mkDlgClose(); }); await adv(o.pg, 400);
    await o.pg.evaluate(() => { __SV.faults.push({ op: 'make', tempo: '1.3', notbg: 1, kind: 'busy', lat: 500 }); });
    await cardTune(o); await stopTune(o); await tap(o.f, '[data-fk="mktune:t:5"]'); await adv(o.pg, 500); await stopTune(o); await tap(o.f, '[data-fk="mkvcuse"]');
    await until(o.pg, o.f, settled, 200000); await adv(o.pg, 300);
    const voice = await o.f.evaluate(() => [...document.querySelectorAll('.mk-toast,[role=alert]')].filter((e) => e.offsetParent).map((e) => e.textContent.trim()).filter(Boolean));
    await shot(o, 'T16-voice-390');
    await o.f.evaluate(() => mkGo('guest')); await adv(o.pg, 1500);
    const pill = () => o.f.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="g0"]'); return { lab: b ? b.textContent.trim() : '', fk: b ? b.getAttribute('data-fk') : '', mode: _aiMode('g0'), err: (MK.lineErr || {}).g0 || '', t: _tNorm(((S.up || {}).g0 || {}).tempo || '') }; });
    const a = await pill(); await o.f.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="g0"]'); if (b) b.scrollIntoView({ block: 'center' }); }); await adv(o.pg, 200); await shot(o, 'T16-guest-g0-390');
    await o.pg.evaluate(() => { __SV.faults.length = 0; });
    await tap(o.f, '.mk-aip[data-key="g0"]'); await adv(o.pg, 300); await until(o.pg, o.f, () => !MK_UP.g0 && !VC_MKP.g0, 60000); await adv(o.pg, 800);
    const b = await pill();
    ok('16 [REBAKE_FAIL_NEED] 새 빠르기로 다시 굽다 실패하면 누른 곳(두 분 목소리)에 코드와 함께 한 줄', voice.some((x) => /새 빠르기 · 쉼으로 \d줄을 만들지 못했어요/.test(x) && /\(코드 V1\)/.test(x)), JSON.stringify(voice));
    ok('16 [REBAKE_FAIL_NEED] 실패한 줄 머리 = «목소리 만들기»(«다시 눌러 주세요»와 짝) · «확정하기» 아님', a.mode === 'need' && /목소리 만들기/.test(a.lab) && a.fk === 'mkai:g0' && /코드 V1/.test(a.err) && a.t === '1.1', JSON.stringify(a));
    ok('16 [REBAKE_FAIL_NEED] 업체가 풀린 뒤 누르면 고른 빠르기(1.3)로 만들어지고 실패 글이 걷힌다 · 머리는 «확정하기»', b.t === '1.3' && !b.err && b.mode === 'keep' && !o.errs.length, JSON.stringify({ b, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 16 [KEEP_HEARD] */
  async T16_확정은들리는소리() { const o = await open({});
    if (!(await enroll(o))) { ok('16 [KEEP_HEARD] 목소리 만들기까지 가지 못했다', false); await o.ctx.close(); return; }
    await stopTune(o); await tap(o.f, '[data-fk="mkvcuse"]'); await until(o.pg, o.f, settled, 200000); await adv(o.pg, 1000);
    await o.f.evaluate(() => { mkDlgClose(); MK.lineErr = MK.lineErr || {}; MK.lineErr.g2 = '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 V1)'; mkGo('guest'); }); await adv(o.pg, 1500);
    await tap(o.f, '.mk-aip[data-key="g2"]'); await adv(o.pg, 500);
    const k2 = await o.f.evaluate(() => ({ kept: !!(S.vkeep || {}).g2, err: (MK.lineErr || {}).g2 || '' }));
    /* 빠르기만 다른 줄(다시 굽기를 기다리는 줄) — 재생 속도로 흉내 내 들리는 상태에서 «확정하기» */
    await o.f.evaluate(() => { S.vset.groom = { tempo: '1.3', pause: S.vset.groom.pause }; _persist(); render(); }); await adv(o.pg, 300);
    const a = await o.f.evaluate(() => ({ mode: _aiMode('g0'), rate: Math.round(_upRate('g0') * 100) / 100, t: _tNorm(S.up.g0.tempo) }));
    await tap(o.f, '.mk-aip[data-key="g0"]'); await adv(o.pg, 300);
    const mid = await o.f.evaluate(() => ({ mode: _aiMode('g0'), kept: !!(S.vkeep || {}).g0 }));
    await until(o.pg, o.f, () => !MK_UP.g0 && !VC_MKP.g0 && !VT_BAKING.g0, 60000); await adv(o.pg, 1000);
    const b = await o.f.evaluate(() => ({ mode: _aiMode('g0'), kept: !!(S.vkeep || {}).g0, t: _tNorm(S.up.g0.tempo), rate: _upRate('g0') }));
    ok('16 [KEEP_HEARD] 확정하면 그 줄의 옛 실패 글(«다시 눌러 주세요»)을 걷는다', k2.kept && !k2.err, JSON.stringify(k2));
    ok('16 [KEEP_HEARD] 빠르기만 다른 줄의 «확정하기» = 고른 빠르기(1.3)로 먼저 만들고(만드는 중) 확정 — 옛 빠르기(1.1)로 굳지 않는다', a.mode === 'keep' && a.rate !== 1 && a.t === '1.1' && mid.mode === 'make' && !mid.kept && b.kept && b.t === '1.3' && b.rate === 1 && b.mode === 'kept' && !o.errs.length, JSON.stringify({ a, mid, b, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 18 [TUNE_PRESS_ONLY] */
  async T18_누른글만() { const o = await open({ ready: true });
    await cardTune(o); await stopTune(o); const A = '오늘 와 주셔서 고맙습니다.', ta = o.f.locator('[data-fk="mktunetext"]');
    await ta.fill(A); await adv(o.pg, 300); await tap(o.f, '[data-fk="mktuneplay"]'); await adv(o.pg, 800);
    await ta.click(); await ta.press('End'); await ta.type(' 편'); await adv(o.pg, 300);
    await until(o.pg, o.f, () => VC.tune && !VC.tune.loading && VC.sraw.groom && VC.sraw.groom.text === '오늘 와 주셔서 고맙습니다.', 30000); await adv(o.pg, 6000);
    const r = await o.f.evaluate(() => ({ lab: (document.querySelector('[data-fk="mktuneplay"]') || {}).textContent || '', dis: (document.querySelector('[data-fk="mktuneplay"]') || {}).disabled, loading: !!VC.tune.loading, held: VC.sraw.groom.text }));
    const sent = await o.pg.evaluate(() => __SV.bodies.filter((b) => !b.bg && b.tempo === '1' && b.pause === 150).map((b) => b.text.slice(0, 20)));
    ok('18 [TUNE_PRESS_ONLY] 만드는 중에 글을 더 고치면 누르지 않은 글은 만들지 · 틀지 않는다 · 단추가 «이 글로 들어 보기»로 풀린다', sent.length === 2 && sent[1] === A && r.lab === '이 글로 들어 보기' && !r.dis && !r.loading && r.held === A && !o.errs.length, JSON.stringify({ sent, r, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 19 [TUNE_ERR_STALE] */
  async T19_처음예시로() { const o = await open({ ready: true, faults: [{ op: 'make', text: '파란 하늘', kind: 'busy', lat: 500 }] });
    await cardTune(o); await stopTune(o); const B = '오늘 파란 하늘 아래 모여 주셔서 감사합니다.', ta = o.f.locator('[data-fk="mktunetext"]');
    const red = () => o.f.evaluate(() => ({ err: VC.tune.err, shown: [...document.querySelectorAll('#mkRecDlg .mk-exw')].filter((e) => e.offsetParent && !e.hidden).map((e) => e.textContent.trim()) }));
    const fail1 = async () => { await ta.fill(B); await adv(o.pg, 300); await tap(o.f, '[data-fk="mktuneplay"]'); await until(o.pg, o.f, () => VC.tune && !VC.tune.loading, 20000); await adv(o.pg, 300); return red(); };
    const a = await fail1(); await tap(o.f, '[data-fk="mktunereset"]'); await adv(o.pg, 400); const b = await red(); await shot(o, 'T19-reset-390');
    const c0 = await fail1(); await ta.fill(await o.f.evaluate(() => VC_SAMPLE)); await adv(o.pg, 300); const c = await red();
    const d = await fail1();
    /* 손으로 누른 예시가 막혀(M7 · 아이폰) 실패 글이 뜬 뒤 점을 눌러 같은 예시가 잘 나오면 그 실패 글도 걷힌다 */
    await tap(o.f, '[data-fk="mktunereset"]'); await adv(o.pg, 400);
    await o.f.evaluate(() => { const P = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (!/^blob:/.test(String(this.src))) return P.call(this); HTMLMediaElement.prototype.play = P; return Promise.reject(new DOMException('blocked', 'NotAllowedError')); }; });
    await tap(o.f, '[data-fk="mktuneplay"]'); await adv(o.pg, 400); const e = await red();
    await tap(o.f, '[data-fk="mktune:t:4"]'); await adv(o.pg, 900); const g = await red(); const gp = await o.f.evaluate(() => MK.audKey === 'tune' && !!MK.aud);
    ok('19 [TUNE_ERR_STALE] 고친 글이 실패(V1)한 뒤 «처음 예시로» → 빨간 실패 글이 걷힌다', /코드 V1/.test(a.err) && a.shown.length === 1 && !b.err && !b.shown.length, JSON.stringify({ a, b }));
    ok('19 [TUNE_ERR_STALE] 글칸에 처음 예시를 다시 쳐도(들고 있는 소리의 글) 걷힌다 · 같은 고친 글을 다시 누르면 실패가 다시 보인다(정직)', /코드 V1/.test(c0.err) && !c.err && !c.shown.length && /코드 V1/.test(d.err) && d.shown.length === 1, JSON.stringify({ c0, c, d }));
    ok('19 [TUNE_ERR_STALE] 재생이 막혀(M7) 실패 글이 뜬 뒤 점을 눌러 예시가 나오면 그 글도 걷힌다', /코드 M7/.test(e.err) && !g.err && !g.shown.length && gp && !o.errs.length, JSON.stringify({ e, g, gp, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },

  /* 21 [TUNE_EMPTY_ONE] */
  async T21_빈글칸() { const o = await open({ ready: true });
    await cardTune(o); await stopTune(o); const ta = o.f.locator('[data-fk="mktunetext"]');
    const st = () => o.f.evaluate(() => { const b = document.querySelector('[data-fk="mktuneplay"]'); return { dis: b ? b.disabled : null, playing: MK.audKey === 'tune' && !!MK.aud, ta: (document.querySelector('[data-fk="mktunetext"]') || {}).value }; });
    await ta.fill(''); await adv(o.pg, 300); const a = await st();
    await o.f.locator('#mkDlgT').click(); await adv(o.pg, 1200); const b = await st();
    await tap(o.f, '[data-fk="mktune:t:4"]'); await adv(o.pg, 900); const c = await st();
    await tap(o.f, '[data-fk="mktuneplay"]'); await adv(o.pg, 900); const c2 = await st();
    await o.f.evaluate(() => mkDlgClose()); await adv(o.pg, 400); await tap(o.f, '[data-fk="mkvctune:groom"]'); await until(o.pg, o.f, () => VC.tune && !VC.tune.loading, 30000); await adv(o.pg, 900); const d = await st();
    await shot(o, 'T21-empty-390');
    ok('21 [TUNE_EMPTY_ONE] 글칸을 비우면 «예시 들어 보기»가 잠기고 · 글칸 밖을 눌러 다시 그려도 · 점을 눌러도 · 다시 열어도 잠긴 채 · 빈 칸에 처음 예시를 틀지 않는다', a.ta === '' && a.dis === true && b.dis === true && c.dis === true && !c.playing && !c2.playing && d.dis === true && !d.playing && d.ta === '' && !o.errs.length, JSON.stringify({ a, b, c, c2, d, errs: o.errs.slice(0, 2) }));
    await o.ctx.close(); },
};

for (const [nm, fn] of Object.entries(SCENES)) { if (ONLY.length && !ONLY.some((x) => nm.includes(x))) continue;
  try { await fn(); } catch (e) { ok(`${nm} — 재다가 멈췄다`, false, String(e && e.message || e).split('\n')[0]); } }
await br.close(); srv.close();
console.log(fail ? `\nVC R1 TUNE FAIL ${fail}` : '\nVC R1 TUNE OK'); process.exit(fail ? 1 : 0);
