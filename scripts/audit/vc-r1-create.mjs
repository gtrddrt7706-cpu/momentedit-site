#!/usr/bin/env node
/* ★★[VC_R1_CREATE 2026-10-08 목소리 1라운드 «만들기 · 다시 녹음» 묶음] 진짜 마이페이지(mypage.html · 중계) + 진짜 식순 화면(order-preview.html · iframe) + 가짜 서버(GAS 80_production 규칙) + 가짜 시계.
   고친 항목마다 장면 하나 — 단추는 Playwright 로 실제로 누른다(녹음 소리만 _recWav 로 넣는다 · 마이크 장면은 크롬 가짜 마이크).
   ① 창을 닫은 뒤 만들기 실패 [VC_EFAIL_KEEP]            ② 다시 녹음 중 창을 닫음 · ⑪ 맞추기 창을 닫음 · 새로고침 [VC_RENEW_KEEP]
   ③ 다른 분 1분 읽기 · 줄 녹음 위로 맞추기 창 [VC_TUNE_NO_COVER]   ⑤ 동의 저장 중 닫기 [CONSENT_LIVE]
   ⑥ 만드는 중 새로고침(옛 서버 · 작업표 서버) [VC_JOB_MARK · VC_RID_FRESH]   ⑦ 마이크 허용 전 닫기 [MIC_GEN]
   ⑧ 짧은 글을 가리키는 큰 단추 [SHORT_WHICH]   ⑨ 동의 창 «직접 눌러 주세요» 한 번 [CONSENT_ONE_ASK]   ⑩ ✓ 와 글 사이 [CHK_GAP]
   ⑰ 늦은 예시 답은 부탁한 창 · 목소리에만 [TUNE_REQ_OWN]
   ONLY=<번호,…>(예: ONLY=1,8) · SHOTS=<폴더> 면 390 폭 화면을 찍는다 · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const b64 = (f) => fs.readFileSync(path.join(ROOT, 'assets/audio/tone', f)).toString('base64');
const MP3S = { 1: b64('n27.mp3'), 2: b64('n0.mp3'), 3: b64('n102.mp3'), def: b64('n1.mp3') };   // 목소리마다 다른 소리 — 받은 예시가 어느 목소리인지 길이로 가른다
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 — GAS 80_production handleVoiceClone 과 같은 규칙: 동의가 먼저 · 확인 문장은 부를 때마다 새로 · 만들기는 동의와 문장이 있어야 ·
   성공하면 tries+1 · 확인 문장을 비움 · renewed = 앞 목소리가 있었나 · 실패하면 문장을 비우지 않는다 · 끊겨도 서버는 끝까지 한다.
   jobs: true = 작업표를 싣는 서버(VC_ENROLL_JOB · status 에 jobs:1 · 분마다 job{jid,end,ok,renewed,age}) · 예시(make)는 «요청을 받은 순간의 목소리»로 */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const MP3S = cfg.mp3s, CUT = cfg.cut, LIM = 20, JOBS = !!cfg.jobs;
  const SV = window.__SV = { st: { groom: {}, bride: {} }, cache: {}, files: {}, log: [], n: {}, faults: cfg.faults || [], phN: 0, makes: [] };
  if (cfg.init) Object.keys(cfg.init).forEach((w) => Object.assign(SV.st[w], cfg.init[w]));
  const LAT = Object.assign({ status: 1200, consent: 1500, phrase: 1800, enroll: 20000, make: 9000, makeHit: 1500, practice: 7000, practiceHit: 1200, delete: 2000, ritualFile: 3000 }, cfg.lat || {});
  const now = () => Date.now();
  const jobPub = (j) => (j && j.jid ? { jid: j.jid, end: !!j.end, ok: !!j.ok, kind: j.kind || '', ecode: j.ecode || '', error: j.end && !j.ok ? (j.error || '') : '', renewed: !!j.renewed, age: Math.max(0, Math.round((now() - j.at) / 1000)) } : null);
  const pub = (p) => Object.assign({ consent: !!p.consent, ready: !!p.voiceId, tries: p.tries || 0, left: Math.max(0, LIM - (p.tries || 0)), made: p.made || '', deleted: p.deleted || '' }, JOBS ? { job: jobPub(p.job) } : {});
  const mp3Of = (v) => { const m = /-(\d+)$/.exec(v || ''); return MP3S[m ? m[1] : 'def'] || MP3S.def; };
  function handle(b) {
    const op = b.action === 'voiceClone' ? b.op : b.action, st = SV.st, who = b.who, WHO = { groom: '신랑', bride: '신부' };
    if (b.action === 'voiceClone') {
      if (op === 'status') return { lat: LAT.status, res: () => Object.assign({ ok: true, on: true, tts: true, groom: pub(st.groom), bride: pub(st.bride), total: 0, left: 99999 }, JOBS ? { jobs: 1 } : {}) };
      if (op === 'delete') return { lat: LAT.delete, res: () => { (who === 'all' ? ['groom', 'bride'] : [who]).forEach((w) => { if (st[w].voiceId) { st[w].voiceId = ''; st[w].deleted = 'x'; } }); return { ok: true }; } };
      if (op === 'consent') return { lat: LAT.consent, res: () => { if (b.agree !== true) return { ok: false, error: '동의가 필요해요.' }; st[who].consent = { v: b.v }; return { ok: true, who }; } };
      if (op === 'phrase') return { lat: LAT.phrase, res: () => { if (!st[who].consent) return { ok: false, error: WHO[who] + ' 동의가 먼저예요.' }; SV.phN++; st[who].phrase = '오늘은 시월 팔일, 문장 ' + SV.phN + '.'; return { ok: true, who, phrase: st[who].phrase }; } };
      if (op === 'enroll') { const p = st[who]; if (JOBS && b.jid) p.job = { jid: b.jid, at: now(), end: false };   // 작업표는 요청을 받은 순간 시작
        return { lat: LAT.enroll, res: () => { const fin = (o) => { if (JOBS && p.job && p.job.jid === b.jid) Object.assign(p.job, { end: true, ok: !!o.ok, renewed: !!o.renewed, error: o.error || '', kind: o.kind || '' }); return o; };
          if (!p.consent) return fin({ ok: false, error: WHO[who] + ' 동의가 먼저예요.' }); if (!p.phrase) return fin({ ok: false, error: '확인 문장을 먼저 받아 주세요.' });
          const prev = p.voiceId; p.tries = (p.tries || 0) + 1; p.voiceId = 'v-' + who + '-' + p.tries; p.made = new Date(now() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16); p.phrase = null; return fin({ ok: true, who, tries: p.tries, renewed: !!prev }); } }; }
      if (op === 'make' || op === 'practice') {
        const lines = Array.isArray(b.lines) ? b.lines : [[b.one || '', b.text]];
        const keys = lines.map((l) => { let w = l[0] === 'groom' || l[0] === 'bride' ? l[0] : (st.groom.voiceId ? 'groom' : 'bride'); let v = (st[w] || {}).voiceId; if (!v) { const ow = w === 'groom' ? 'bride' : 'groom'; if (st[ow].voiceId) { w = ow; v = st[ow].voiceId; } } if (!v && op === 'practice') v = 'def'; return [w, v || '', op + '|' + v + '|' + b.tempo + '|' + b.pause + '|' + l[1]]; });
        const fresh = keys.filter((k) => !SV.cache[k[2]]).length;
        if (op === 'make' && b.key === 'g0' && b.tempo === '1' && b.pause === 150 && !b.bg && !b.lines) SV.makes.push({ t: now(), v: keys[0][1], text: String(b.text || ''), fresh });   // 맞추기 창 예시(_vcSampleLoad 의 모양)
        return { lat: fresh ? LAT[op] : LAT[op + 'Hit'], res: () => { if (op === 'make' && keys.some((k) => !k[1])) return { ok: false, error: '아직 만든 AI 목소리가 없어요.' };
          keys.forEach((k) => { SV.cache[k[2]] = 1; });
          return op === 'make' ? { ok: true, key: b.key, parts: keys.map((k) => ({ who: k[0], vid: k[1], mime: 'audio/mpeg', data: mp3Of(k[1]) })), total: 1 } : { ok: true, mime: 'audio/mpeg', data: mp3Of(keys[0][1]), mine: true }; } };
      }
      return { lat: 500, res: () => ({ ok: false, error: '알 수 없는 요청이에요.' }) };
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
    const f = SV.faults.find((x) => x.op === op && (x.nth == null || x.nth === nth) && !(x.until && now() > x.until) && !(x.text && !String(b.text || '').includes(x.text)) && !x.used) || null;
    if (f && f.once) f.used = 1;
    const h = handle(b), lat = f && f.lat != null ? f.lat : h.lat, t0 = now();
    SV.log.push({ op, who: b.who, nth, t: t0, f: f ? f.kind || 'lat' : '' });
    return new Promise((resolve, reject) => {
      let settled = false; const sig = o && o.signal; const fin = (fn) => { if (settled) return; settled = true; fn(); };
      if (sig) { if (sig.aborted) return reject(new DOMException('aborted', 'AbortError')); sig.addEventListener('abort', () => fin(() => reject(new DOMException('aborted', 'AbortError')))); }
      const kind = f ? f.kind : '';
      const js = (body) => setTimeout(() => fin(() => resolve(new Response(JSON.stringify(body), { status: 200 }))), lat);
      if (kind === 'crash') { setTimeout(() => fin(() => reject(new TypeError('Load failed'))), lat); return; }   // 서버가 처리하다 죽음 — 서버 일 없음
      if (kind === 'busy') { js({ ok: false, down: true, kind: 'busy', http: 429, ecode: 'V1', error: '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 V1)' }); return; }
      if (kind === 'json') { js(f.body); return; }
      setTimeout(() => { const res = h.res(); SV.log.push({ op, who: b.who, nth, done: now() - t0, ok: res && res.ok }); fin(() => resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }))); }, lat);
      if (CUT && lat > CUT) setTimeout(() => fin(() => reject(new TypeError('Load failed'))), CUT);
    });
  };
};
/* 마이크 — 모든 흐름을 적고(__streams) · 'defer' 면 사람이 허용할 때까지 붙잡는다(__pend) */
const GUM = () => { const md = navigator.mediaDevices; if (!md || !md.getUserMedia) return;
  const g = md.getUserMedia.bind(md); window.__streams = []; window.__pend = []; window.__gumMode = 'now';
  md.getUserMedia = (c) => { const p = g(c).then((s) => { window.__streams.push(s); return s; }); if (window.__gumMode !== 'defer') return p; return new Promise((ok, no) => { window.__pend.push(() => p.then(ok, no)); }); }; };
const PREP = (o) => { courseStarted = true; if (o.first) { S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.pvText = '두 사람의 이야기를 영상으로 준비했습니다.'; if (o.S) Object.assign(S, o.S); }
  RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true;
  window.__toasts = []; let _t = MK.toast; Object.defineProperty(MK, 'toast', { configurable: true, get: () => _t, set: (v) => { _t = v; if (v) window.__toasts.push(String(v)); } });   // 알림은 한 번 그리고 지워진다 — 놓치지 않게 적어 둔다
  window.__plays = []; const _pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { if (/^blob:/.test(this.src || '') && this === (typeof TUNE_EL !== 'undefined' ? TUNE_EL : null)) window.__plays.push({ t: Date.now(), d: this.duration }); return _pl.apply(this, arguments); };
  for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo('_voice'); };

async function adv(pg, ms, step = 500) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(4); } }
async function frameOf(pg, notU) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url()) && !x.isDetached() && x.url() !== notU); if (f) return f; await adv(pg, 100, 100); } return null; }
async function until(pg, f, fn, max = 240000, step = 500, arg) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn, arg).catch(() => false)) return t; await pg.clock.runFor(step); await wait(4); } return -1; }
async function boot(o = {}) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3s: MP3S, cut: o.cut || 0, lat: o.lat || {}, faults: o.faults || [], init: o.init, jobs: !!o.jobs });
  await ctx.addInitScript(GUM);
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await adv(pg, 1500);
  const f = await frameOf(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function', 20000);
  await f.evaluate(PREP, { first: true, S: o.S || null }); await adv(pg, 4000);
  const X = { ctx, pg, f, errs };
  X.adv = (ms, st) => adv(pg, ms, st); X.until = (fn, max, step, arg) => until(pg, X.f, fn, max, step, arg); X.ev = (fn, arg) => X.f.evaluate(fn, arg);
  X.click = async (sel) => { await X.f.click(sel, { timeout: 4000 }); await adv(pg, 300, 100); };
  X.sv = () => pg.evaluate(() => ({ st: JSON.parse(JSON.stringify(__SV.st)), n: Object.assign({}, __SV.n), makes: __SV.makes.slice(), log: __SV.log.filter((x) => x.done == null).map((x) => x.op + (x.who ? ':' + x.who : '') + '#' + x.nth + (x.f ? '!' + x.f : '')) }));
  X.fault = (x) => pg.evaluate((x) => { if (x.untilIn) { x.until = Date.now() + x.untilIn; delete x.untilIn; } __SV.faults.push(x); }, x);
  X.clearFaults = () => pg.evaluate(() => { __SV.faults.length = 0; });
  X.shot = async (nm) => { if (!SHOTS) return; await pg.screenshot({ path: path.join(SHOTS, nm.replace(/[^\w가-힣-]+/g, '_') + '.png') }); };
  X.card = () => X.ev(() => [...document.querySelectorAll('.mk-vpc')].map((li) => li.innerText.replace(/\s+/g, ' ').trim()));
  X.dlg = () => X.ev(() => { const d = document.getElementById('mkRecDlg'); return d ? d.innerText.replace(/\s+/g, ' ').trim() : null; });
  X.up = () => X.ev(() => Object.fromEntries(['g0', 'g1', 'g2', 'g3', 'entry', 'pv'].map((k) => { const v = (S.up || {})[k]; return [k, v && v.src === 'ai' ? v.id || 'local' : '-']; })));
  /* 동의 → 글 1 · 글 2(녹음 소리만 넣는다) → «이 녹음으로 목소리 만들기» */
  X.consent = async (W, viaCard = true) => { if (viaCard) await X.click(`[data-fk="${viaCard === 're' ? 'mkvcre' : 'mkvcok'}:${W}"]`); else { await X.ev((W) => mkVcConsent(W), W); await adv(pg, 300); }
    await X.click('#vcSelf'); await X.click('#vcAgree'); return X.until((W) => !!(VC.read && VC.read.who === W && VC.read.phrase), 90000, 500, W); };
  X.takes = (d1, d2) => X.ev(([d1, d2]) => { const R = VC.read, sr = 16000, mk = (s) => { const x = new Float32Array(sr * s); for (let i = 0; i < x.length; i++) x[i] = Math.sin(i / 9) * 0.2; return { wav: _recWav(x, sr), dur: s }; }; R.take[1] = mk(d1); R.take[2] = mk(d2); R.step = 2; render(); }, [d1, d2]);
  X.make = async (W, d1 = 15, d2 = 15, viaCard = true) => { await X.consent(W, viaCard); await X.takes(d1, d2); await X.click('[data-fk="mkvcmake"]'); };
  X.fillDone = () => X.until(() => !!(VC.fill && !VC.fill.doing && !Object.keys(MK_UP).length), 400000);
  X.reload = async () => { const u0 = X.f.url(); await X.ev(() => { window.__old = 1; window._obReload(); }); await adv(pg, 1500);
    let f2 = null; for (let i = 0; i < 80 && !f2; i++) { const c = pg.frames().find((x) => /order-preview\.html/.test(x.url()) && !x.isDetached()); if (c && c.url() !== u0 && !(await c.evaluate(() => !!window.__old).catch(() => true))) f2 = c; else await adv(pg, 250, 250); }
    if (!f2) throw new Error('다시 연 화면 없음'); X.f = f2; await X.until(() => typeof S === 'object' && typeof mkGo === 'function' && typeof STEPS === 'object', 20000); await adv(pg, 800);
    await X.ev(PREP, { first: false }); await adv(pg, 2500); };
  return X;
}
const want = (n) => !ONLY.length || ONLY.includes(String(n));
const scene = async (n, nm, fn) => { if (!want(n)) return; let X = null; try { await fn((x) => (X = x)); } catch (e) { ok(`#${n} ${nm} — 재다가 멈췄다`, false, String(e && e.message || e).split('\n')[0]); } finally { if (X) { if (X.errs.length) ok(`#${n} ${nm} — 화면 오류 없음`, false, X.errs.slice(0, 2)); await X.ctx.close(); } } };

/* ① [VC_EFAIL_KEEP] 만드는 중 ✕ → 업체 바쁨 두 번(ENROLL_SAFE 한 번 더 포함) → 알림(코드) · 카드 «만들지 못했어요 (코드 V1)» · [다시 만들기] → 같은 녹음으로 다시 → 성공. 대조: 요금제(V2)는 남기지 않는다 */
await scene(1, '창을 닫은 뒤 만들기 실패 — 알림 · 카드 · 같은 녹음으로 다시 만들기', async (set) => {
  const X = set(await boot({ lat: { enroll: 8000 }, faults: [{ op: 'enroll', nth: 1, kind: 'busy', lat: 3000 }, { op: 'enroll', nth: 2, kind: 'busy', lat: 3000 }] }));
  await X.make('groom'); await X.adv(1000);
  await X.click('[data-fk="mkdlgx"]');
  const shut = await X.ev(() => ({ read: !!VC.read, enr: !!(VC.enr || {}).groom }));
  const t = await X.until(() => !(VC.enr || {}).groom, 120000);
  const r = await X.ev(() => ({ toasts: window.__toasts.slice(), card: [...document.querySelectorAll('.mk-vpc')].map((li) => li.innerText.replace(/\s+/g, ' ').trim())[0], btn: ((document.querySelector('[data-fk="mkvcok:groom"]') || {}).textContent || '').trim(), how: !!(document.querySelector('.mk-vpc') || document.createElement('i')).querySelector('.mk-vhow') }));   // 신랑 카드(첫 장)만
  await X.shot('r1-01-efail-card');
  ok('#1 닫은 뒤 실패 — 알림에 까닭과 코드 · 카드 «만들지 못했어요 (코드 V1)» · 단추 «다시 만들기» · «1분쯤 읽어요» 안내 없음 [VC_EFAIL_KEEP]',
    !shut.read && shut.enr && t >= 0 && r.toasts.some((x) => /신랑 님 목소리 · .*\(코드 V1\)/.test(x)) && /신랑 만들지 못했어요 \(코드\s?V1\)/.test(r.card) && r.btn === '다시 만들기' && !r.how, { shut, t, r });
  await X.click('[data-fk="mkvcok:groom"]');
  const re = await X.ev(() => ({ panel: !!VC.panel, ph: VC.read && VC.read.ph, step: VC.read && VC.read.step, t1: !!(VC.read && VC.read.take[1]), t2: !!(VC.read && VC.read.take[2]), go: ((document.querySelector('#mkRecDlg .mk-dlg-go') || {}).textContent || '').trim(), err: VC.read && VC.read.err }));
  await X.shot('r1-02-efail-reopen');
  const n0 = (await X.sv()).n;
  await X.clearFaults(); await X.click('[data-fk="mkvcmake"]');
  const t2 = await X.until(() => !!VC.tune, 120000); const s2 = await X.sv();
  ok('#1 카드를 누르면 동의부터가 아니라 읽은 녹음 그대로 «다시 만들기» 창 · 누르면 1분을 다시 읽지 않고 만들어진다(확인 문장 새로 안 받음 · 만들기 한 번 더)',
    !re.panel && re.ph === 'read' && re.step === 2 && re.t1 && re.t2 && re.go === '다시 만들기' && /코드 V1/.test(re.err || '') && t2 >= 0 && s2.n.phrase === n0.phrase && s2.n.enroll === n0.enroll + 1 && s2.st.groom.tries === 1, { re, t2, n0, n: s2.n, tries: s2.st.groom.tries });
  /* 대조 — 다시 해도 안 되는 실패(요금제 V2)는 녹음을 남기지 않는다(같은 녹음으로 다시 보내도 같다) */
  await X.fault({ op: 'enroll', kind: 'json', lat: 3000, body: { ok: false, down: true, kind: 'plan', ecode: 'V2', error: 'AI 목소리가 막혔어요 · 스튜디오에 알렸어요 (코드 V2)' } });
  await X.ev(() => { VC.tune = null; VC.read = null; render(); }); await X.adv(500);
  await X.make('bride'); await X.adv(500); await X.click('[data-fk="mkdlgx"]');
  await X.until(() => !(VC.enr || {}).bride, 60000);
  const d = await X.ev(() => ({ toasts: window.__toasts.slice(-2), card: [...document.querySelectorAll('.mk-vpc')].map((li) => li.innerText.replace(/\s+/g, ' ').trim())[1], ef: !!(VC.efail || {}).bride }));
  ok('#1 대조 — 요금제(V2) 실패는 알림(코드)만 · 카드는 «아직 만들지 않았어요 · 목소리 만들기»', d.toasts.some((x) => /코드 V2/.test(x)) && !d.ef && /아직 만들지 않았어요/.test(d.card) && /목소리 만들기/.test(d.card), d);
});

/* ② · ⑪ [VC_RENEW_KEEP] 다시 녹음으로 새 목소리 — ②만드는 중 ✕ · ⑪맞추기 창 ✕ 뒤 카드 · ⑪새로고침 뒤 카드 — 어느 길이든 확정 안 한 그 분 AI 줄은 새 목소리로 다시 · 확정한 줄은 그대로 */
await scene(2, '다시 녹음 뒤 창을 닫거나 새로 열어도 줄이 새 목소리로', async (set) => {
  const X = set(await boot({ lat: { enroll: 6000 } }));
  await X.make('groom'); let t = await X.until(() => VC.tune && !VC.tune.loading, 120000);
  await X.click('[data-fk="mkvcuse"]'); await X.fillDone(); await X.adv(3000); await X.click('[data-fk="mkvcdone"]');
  await X.ev(() => mkKeep('g0')); await X.adv(500);
  const u1 = await X.up();
  const redo = async (how) => {
    const before = await X.up();
    await X.make('groom', 15, 15, 're');
    if (how === 'busy') { await X.adv(800); await X.click('[data-fk="mkdlgx"]'); }
    t = await X.until(() => VC.tune && !VC.tune.loading, 120000);
    const note = await X.ev(() => ((document.querySelector('#mkRecDlg') || {}).innerText || '').match(/확정한[^\n]*바꿔요/) ? ((document.querySelector('#mkRecDlg') || {}).innerText.match(/확정한[^\n]*바꿔요/) || [''])[0] : '');
    if (how === 'tunex' || how === 'reload') { if (how === 'tunex') await X.click('[data-fk="mkdlgx"]'); else await X.reload();
      await X.until(() => !!document.querySelector('[data-fk="mkvctune:groom"]'), 30000); await X.click('[data-fk="mkvctune:groom"]'); await X.until(() => VC.tune && !VC.tune.loading, 120000); }
    const note2 = await X.ev(() => ((document.querySelector('#mkRecDlg') || {}).innerText.match(/확정한[^\n]*바꿔요/) || [''])[0]);
    await X.click('[data-fk="mkvcuse"]'); await X.adv(1500); await X.fillDone(); await X.adv(3000);
    await X.ev(() => { if (VC.read) mkDlgClose(); }); await X.adv(500);
    const after = await X.up(), sv = await X.sv();
    return { before, after, changed: Object.keys(after).filter((k) => after[k] !== before[k]), note, note2, voice: sv.st.groom.voiceId, need: await X.ev(() => S.vsetNeed || null) };
  };
  const a = await redo('busy');
  ok('#2 다시 녹음 · 만드는 중 ✕ → 저절로 뜬 맞추기 창 «새 목소리로» → 쓰기 → g2 · 입장 · 식전 영상이 새 목소리로 · 확정한 g0 은 그대로 [VC_RENEW_KEEP]',
    u1.g0 !== '-' && a.changed.sort().join() === 'entry,g2,pv' && /새 목소리로/.test(a.note) && !(a.need || {}).groom, a);
  const b = await redo('tunex');
  ok('#11 다시 녹음 → 맞추기 창 ✕ → 카드 «빠르기 · 쉼 맞추기» → 쓰기 → 같은 세 줄이 새 목소리로 · 창 글도 «새 목소리로»', b.changed.sort().join() === 'entry,g2,pv' && /새 목소리로/.test(b.note2), b);
  const c = await redo('reload');
  ok('#11 다시 녹음 → 맞추기 창이 뜬 채 새로고침 → 카드 → 쓰기 → 같은 세 줄이 새 목소리로', c.changed.sort().join() === 'entry,g2,pv' && /새 목소리로/.test(c.note2), c);
});

/* ③ [VC_TUNE_NO_COVER] 신랑 만드는 중 ✕ → 신부 글 1 녹음 중 / 줄 녹음 중 → 신랑 만들기가 끝나도 맞추기 창 · 예시 소리 없음 · 녹음은 그대로 · 카드에 «빠르기 · 쉼 맞추기» */
await scene(3, '만들기가 끝나도 다른 분 녹음 · 줄 녹음 위로 맞추기 창을 열지 않는다', async (set) => {
  const X = set(await boot({ lat: { enroll: 30000 } }));
  await X.make('groom'); await X.adv(800); await X.click('[data-fk="mkdlgx"]');
  await X.consent('bride'); await X.click('[data-fk="mkvcrec:1"]');
  await X.until(() => MK_REC && MK_REC.ph === 'rec', 20000);
  await X.until(() => !(VC.enr || {}).groom, 120000); await X.adv(6000);
  const r = await X.ev(() => ({ tune: !!VC.tune, rec: MK_REC && MK_REC.ph, mr: MK_REC && MK_REC.mr && MK_REC.mr.state, aud: MK.audKey === 'tune' && !!MK.aud && !MK.aud.paused, plays: window.__plays.length, need: (S.vsetNeed || {}).groom, dlg: (document.getElementById('mkDlgT') || {}).textContent, toasts: window.__toasts.slice(-1) }));
  await X.shot('r1-03-bride-rec');
  ok('#3 신부 1분 읽기 녹음 중 신랑 만들기 끝 — 맞추기 창 없음 · 예시 소리 없음 · 녹음 계속 · 카드 need · 창 안 알림 한 줄 [VC_TUNE_NO_COVER]',
    !r.tune && r.rec === 'rec' && r.mr === 'recording' && !r.aud && r.plays === 0 && !!r.need && r.dlg === '신부 님 목소리 만들기' && /신랑 님 목소리가 준비됐어요/.test(r.toasts[0] || ''), r);
  /* 줄 녹음 창(옛 초안의 직접 녹음 · _vcSpent 줄) — 맞추기 창으로 바뀌지 않는다 */
  await X.ev(() => mkRecCancel()); await X.ev(() => { mkDlgClose(); }); await X.adv(500);
  const c0 = await X.ev(() => ({ read: !!VC.read, rec: !!MK_REC }));
  await X.click('[data-fk="mkvcre:groom"]').catch(() => {});
  if (!(await X.ev(() => !!VC.panel))) await X.ev(() => mkVcConsent('groom'));
  await X.click('#vcSelf'); await X.click('#vcAgree'); await X.until(() => !!(VC.read && VC.read.phrase), 60000);
  await X.takes(15, 15); await X.click('[data-fk="mkvcmake"]'); await X.adv(800); await X.click('[data-fk="mkdlgx"]');
  await X.ev(() => { mkRec('g1'); }); await X.adv(300); await X.ev(() => mkRecGo('g1')); await X.until(() => MK_REC && MK_REC.ph === 'rec', 20000);
  await X.until(() => !(VC.enr || {}).groom, 120000); await X.adv(6000);
  const l = await X.ev(() => ({ tune: !!VC.tune, rec: MK_REC && MK_REC.key + ':' + MK_REC.ph, dlg: (document.getElementById('mkDlgT') || {}).textContent, aud: MK.audKey === 'tune' && !!MK.aud && !MK.aud.paused }));
  ok('#3 줄 녹음 중 다시 녹음이 끝남 — 창 제목은 줄 녹음 그대로 · 맞추기 창 · 예시 소리 없음', c0 && !l.tune && l.rec === 'g1:rec' && /녹음/.test(l.dlg || '') && !l.aud, l);
});

/* ⑤ [CONSENT_LIVE] 동의 저장하는 중 «안 할게요» · ✕ — 저장이 끝나도 창을 다시 열지 않는다 · 다른 분 창을 덮지 않는다 · 닫은 뒤 실패 글을 다음 창에 남기지 않는다 */
await scene(5, '동의 저장 중 닫기', async (set) => {
  const X = set(await boot({ lat: { consent: 8000 } }));
  await X.click('[data-fk="mkvcok:groom"]'); await X.click('#vcSelf'); await X.click('#vcAgree');
  const busy = await X.ev(() => ((document.getElementById('vcAgree') || {}).textContent || '').trim());
  await X.click('[data-fk="mkvcno"]'); await X.adv(9000);
  const a = await X.ev(() => ({ dlg: !!document.getElementById('mkRecDlg'), read: !!VC.read, consent: !!((VC.st || {}).groom || {}).consent }));
  ok('#5 «안 할게요»로 닫으면 저장이 끝나도 글 1 창이 다시 열리지 않는다 · 동의는 상태에만 [CONSENT_LIVE]', busy === '저장하는 중…' && !a.dlg && !a.read && a.consent, { busy, a });
  /* 다른 분 창 — 신랑 저장 중 ✕ → 신부 카드 */
  await X.click('[data-fk="mkvcok:groom"]'); await X.click('#vcSelf'); await X.click('#vcAgree'); await X.click('[data-fk="mkdlgx"]');
  await X.click('[data-fk="mkvcok:bride"]');
  const b0 = await X.ev(() => ({ t: ((document.getElementById('vcAgree') || {}).textContent || '').trim() }));
  await X.click('#vcSelf');
  const b1 = await X.ev(() => ({ dis: !!(document.getElementById('vcAgree') || {}).disabled }));
  await X.adv(9000);
  const b2 = await X.ev(() => ({ panel: VC.panel && VC.panel.who, read: !!VC.read, chk: !!(document.getElementById('vcSelf') || {}).checked, title: (document.getElementById('mkDlgT') || {}).textContent }));
  ok('#5 신랑 저장 중 닫고 신부 창 — 신부 단추는 «동의하고 읽으러 가기»(체크하면 눌린다) · 신랑 저장이 끝나도 신부 창 그대로(체크도 그대로)',
    b0.t === '동의하고 읽으러 가기' && !b1.dis && b2.panel === 'bride' && !b2.read && b2.chk && /신부/.test(b2.title || ''), { b0, b1, b2 });
  await X.click('[data-fk="mkdlgx"]'); await X.adv(500);
  /* 닫은 뒤 실패 — 다음 창 맨 위에 그 글이 뜨지 않는다 */
  await X.fault({ op: 'consent', kind: 'crash', lat: 3000 });
  await X.click('[data-fk="mkvcok:groom"]'); await X.click('#vcSelf'); await X.click('#vcAgree'); await X.click('[data-fk="mkdlgx"]');
  await X.adv(40000); await X.clearFaults();
  await X.click('[data-fk="mkvcok:bride"]');
  const c = await X.ev(() => ({ msg: MK.dlgMsg, red: [...document.querySelectorAll('#mkRecDlg .mk-dlg-msg,#mkRecDlg .mk-exw')].map((e) => e.textContent.trim()) }));
  await X.shot('r1-05-bride-consent');
  ok('#5 닫은 뒤 동의 저장 실패 — 다음에 연 신부 동의 창에 신랑 실패 글이 없다', !c.msg && !c.red.length, c);
});

/* ⑥ [VC_JOB_MARK] 만드는 중 새로고침 — ①옛 서버(작업표 없음): 카드 «만드는 중…» → 만들어지면 «빠르기 · 쉼 맞추기» → 쓰기 → 줄이 찬다
   ②작업표 서버 · 새 화면이 상태를 받기 전에 서버가 다 만듦(앱 전환 사이) → 카드 «빠르기 · 쉼 맞추기» */
await scene(6, '만드는 중 새로고침', async (set) => {
  let X = set(await boot({ lat: { enroll: 45000 } }));
  await X.make('groom'); await X.adv(3000); await X.click('[data-fk="mkdlgx"]');
  const rid0 = await X.ev(() => VC.rid);
  await X.reload();
  const rid1 = await X.ev(() => VC.rid);
  ok('#6 새로 연 화면의 요청 번호가 옛 화면 번호와 겹치지 않는다 — 옛 화면이 보낸 만들기 답이 새 화면의 다른 요청을 풀지 않게 [VC_RID_FRESH]', Math.abs(rid1 - rid0) > 1000, { rid0, rid1 });
  const c0 = await X.card();
  const t6 = await X.until(() => !!VC.tune || (!!(((VC.st || {}).groom || {}).ready) && !!document.querySelector('[data-fk="mkvctune:groom"]')), 120000);   // 이어서 본 만들기가 끝나면 맞추기 창이 저절로 뜬다(창을 닫은 뒤 끝난 때와 같다)
  const c1 = await X.card(), need = await X.ev(() => (S.vsetNeed || {}).groom);
  if (t6 < 0) { ok('#6 옛 서버 · 만드는 중 새로고침 — 새 화면이 만들기를 이어서 보지 못했다 [VC_JOB_MARK]', false, { c0: c0[0], c1: c1[0], need }); return; }
  await X.shot('r1-06-reload-need');
  if (!(await X.ev(() => !!VC.tune))) await X.click('[data-fk="mkvctune:groom"]');
  await X.until(() => VC.tune && !VC.tune.loading, 120000);
  await X.click('[data-fk="mkvcuse"]'); await X.adv(1500); await X.fillDone(); await X.adv(3000);
  const u = await X.up(), sv = await X.sv();
  ok('#6 옛 서버 · 만드는 중 새로고침 — 카드 «만드는 중…» → 만들어지면 «빠르기 · 쉼 맞추기» → 쓰기 → 신랑 줄(g0 · g2 · 입장 · 식전 영상)이 찬다 · 만들기 한 번 [VC_JOB_MARK]',
    /신랑 아직 만들지 않았어요 만드는 중…/.test(c0[0]) && /빠르기 · 쉼 맞추기/.test(c1[0]) && !!need && ['g0', 'g2', 'entry', 'pv'].every((k) => u[k] !== '-') && sv.n.enroll === 1, { c0: c0[0], c1: c1[0], need, u, n: sv.n });
  await X.ctx.close();
  X = set(await boot({ jobs: true, lat: { enroll: 20000 } }));
  await X.make('groom'); await X.adv(800); await X.click('[data-fk="mkdlgx"]');
  await X.fault({ op: 'status', lat: 25000, untilIn: 6000 });   // 새 화면의 첫 상태가 만들기가 끝난 뒤에야 온다(앱을 바꾼 사이 탭을 다시 불러옴)
  await X.reload();
  await X.until(() => !!(((VC.st || {}).groom || {}).ready), 120000); await X.adv(1500);
  const j = await X.ev(() => ({ need: (S.vsetNeed || {}).groom, mark: (S.vjob || {}).groom || null, card: [...document.querySelectorAll('.mk-vpc')].map((li) => li.innerText.replace(/\s+/g, ' ').trim())[0], toasts: window.__toasts.slice() }));
  const sv2 = await X.sv();
  ok('#6 작업표 서버 · 새 화면이 상태를 받기 전에 다 만듦 — 카드 «빠르기 · 쉼 맞추기» · 알림 «준비됐어요» · 기록(S.vjob)은 지움', sv2.st.groom.job && sv2.st.groom.job.end && !!j.need && !j.mark && /빠르기 · 쉼 맞추기/.test(j.card) && j.toasts.some((x) => /신랑 님 목소리가 준비됐어요/.test(x)), { j, job: sv2.st.groom.job });
});

/* ⑦ [MIC_GEN] 마이크 허용을 기다리는 사이 창을 닫으면 늦게 온 흐름을 바로 닫는다 · 닫고 곧바로 다른 녹음을 열어도 버려진 흐름이 없다 · 연습 녹음도 */
await scene(7, '마이크 허용 전 닫기', async (set) => {
  const X = set(await boot({}));
  await X.consent('groom'); await X.ev(() => { window.__gumMode = 'defer'; });
  await X.click('[data-fk="mkvcrec:1"]'); await X.adv(300);
  await X.click('[data-fk="mkdlgx"]'); await X.adv(300);
  await X.ev(() => { window.__pend.splice(0).forEach((f) => f()); }); await X.adv(2000);
  const live = () => X.ev(() => window.__streams.filter((s) => s.getTracks().some((t) => t.readyState === 'live')).length);
  const a = { live: await live(), keep: await X.ev(() => !!MIC_KEEP) };
  ok('#7 글 1 «녹음 시작» → 허용 전 ✕ → 허용 — 마이크가 켜진 채 남지 않는다 [MIC_GEN]', a.live === 0 && !a.keep, a);
  /* 닫고 곧바로 줄 녹음 → 두 허용이 다 늦게 → 녹음은 둘째 흐름으로 · 닫으면 다 꺼진다 */
  await X.consent('groom'); await X.click('[data-fk="mkvcrec:1"]'); await X.adv(300); await X.click('[data-fk="mkdlgx"]'); await X.adv(300);
  await X.ev(() => { mkRec('g0'); }); await X.adv(200); await X.ev(() => mkRecGo('g0')); await X.adv(300);
  await X.ev(() => { window.__pend.splice(0).forEach((f) => f()); }); await X.until(() => MK_REC && MK_REC.ph === 'rec', 20000);
  const d0 = { live: await live(), rec: await X.ev(() => MK_REC && MK_REC.key + ':' + MK_REC.ph) };
  await X.ev(() => mkRecCancel()); await X.adv(1000);
  const d1 = { live: await live() };
  ok('#7 닫고 곧바로 다른 줄 녹음 · 두 허용이 늦게 — 쓰는 흐름 하나 · 닫으면 켜진 마이크 0', d0.live === 1 && d0.rec === 'g0:rec' && d1.live === 0, { d0, d1 });
  /* 연습 녹음 — 켜기 → 허용 전 끄기 → 허용 */
  await X.ev(() => { prToggle(true); prToggle(false); }); await X.adv(300);
  await X.ev(() => { window.__pend.splice(0).forEach((f) => f()); }); await X.adv(1500);
  const p = { on: await X.ev(() => PR.on), live: await live() };
  ok('#7 연습 녹음 — 허용 전 끄면 늦게 온 흐름이 다시 켜지 않는다 · 마이크 0 [MIC_GEN · COURSE_WIDE]', !p.on && p.live === 0, p);
  await X.ev(() => { window.__gumMode = 'now'; });
});

/* ⑧ [SHORT_WHICH] · ⑩ [CHK_GAP] 두 글을 합쳐 20초 안 — 큰 단추는 짧은 글을 다시 읽게 · ✓ 와 글 사이는 같은 4px */
await scene(8, '짧은 녹음 — 짧은 글을 가리키는 큰 단추 · ✓ 간격', async (set) => {
  const X = set(await boot({}));
  await X.consent('groom'); await X.takes(3, 15); await X.click('[data-fk="mkvcmake"]'); await X.adv(800);
  const a = await X.ev(() => { const d = document.getElementById('mkRecDlg'), b = d.querySelector('.mk-dlg-go'); return { short: VC.read.short, err: VC.read.err, big: b && b.getAttribute('data-fk') + ' ' + b.textContent.trim(), step1: !!d.querySelector('[data-fk="mkvcstep1"]') }; });
  await X.shot('r1-08-short-glyph1');
  ok('#8 글 1 이 3초 · 글 2 가 15초 — «글 1 을 조금 더 천천히» · 큰 단추 [글 1 다시 읽기] · 위 «글 1 다시 읽기» 링크는 겹치지 않게 숨김 [SHORT_WHICH]',
    a.short === 1 && /글 1 을 조금 더 천천히, 끝까지 읽어 주세요/.test(a.err) && a.big === 'mkvcrec:1 글 1 다시 읽기' && !a.step1, a);
  const gap = () => X.ev(() => [...document.querySelectorAll('#mkRecDlg .mk-dlg-c1, #mkRecDlg .mk-dlg-prev')].filter((p) => p.querySelector('.mk-mk')).map((p) => { const ic = p.querySelector('.mk-mk'), n = ic.nextSibling, rg = document.createRange(); rg.setStart(n, 0); rg.setEnd(n, 1); return { c: p.className, gap: Math.round(rg.getBoundingClientRect().left - ic.getBoundingClientRect().right) }; }));
  const g1 = await gap();
  await X.click('[data-fk="mkvcrec:1"]');
  const r = await X.until(() => MK_REC && MK_REC.key === 'vc:groom:1' && /count|rec/.test(MK_REC.ph), 15000);
  ok('#8 큰 단추를 누르면 바로 글 1 녹음', r >= 0, { r });
  await X.ev(() => mkRecCancel()); await X.adv(300);
  await X.ev(() => { VC.read.take[1] = VC.read.take[2]; const sr = 16000, x = new Float32Array(sr * 3); VC.read.take[2] = { wav: _recWav(x, sr), dur: 3 }; VC.read.take[1].dur = 15; VC.read.step = 2; render(); });
  await X.click('[data-fk="mkvcmake"]'); await X.adv(800);
  const b = await X.ev(() => { const d = document.getElementById('mkRecDlg'), b = d.querySelector('.mk-dlg-go'); return { short: VC.read.short, err: VC.read.err, big: b && b.getAttribute('data-fk') + ' ' + b.textContent.trim(), step1: !!d.querySelector('[data-fk="mkvcstep1"]') }; });
  const g2 = await gap();
  await X.shot('r1-10-short-glyph2-gap');
  ok('#8 대조 — 글 2 가 짧으면 «글 2 를 …» · 큰 단추 [글 2 다시 읽기] · 위 «글 1 다시 읽기» 링크는 그대로', b.short === 2 && /글 2 를 조금 더 천천히/.test(b.err) && b.big === 'mkvcrec:2 글 2 다시 읽기' && b.step1, b);
  const all = g1.concat(g2);
  ok('#10 «✓ 글 n · N초 읽었어요» · «✓ 글 1 · N초» — ✓ 와 글 사이가 모두 3~6px [CHK_GAP]', all.length >= 3 && all.every((x) => x.gap >= 3 && x.gap <= 6) && all.some((x) => /mk-dlg-prev/.test(x.c)) && all.some((x) => /mk-dlg-c1/.test(x.c)), all);
});

/* ⑨ [CONSENT_ONE_ASK] 동의 창 — «직접 눌러 주세요» 한 번 · «다른 분이 대신 동의할 수 없어요» */
await scene(9, '동의 창 «직접 눌러 주세요» 한 번', async (set) => {
  const X = set(await boot({ S: null }));
  await X.click('[data-fk="mkvcok:groom"]');
  const t = await X.dlg();
  await X.shot('r1-09-consent');
  ok('#9 동의 창 — «직접 눌러 주세요» 한 번 · «다른 분이 대신 동의할 수 없어요» [CONSENT_ONE_ASK]', (t.match(/직접 눌러 주세요/g) || []).length === 1 && /신랑 차례예요 · 신랑이 직접 눌러 주세요/.test(t) && /다른 분이 대신 동의할 수 없어요/.test(t) && !/본인이 직접/.test(t), t.slice(0, 160));
});

/* ⑰ [TUNE_REQ_OWN] 맞추기 창 예시 — A 닫았다 바로 열면 만들기 한 번 · 틀기 한 번 / C 다시 녹음 뒤 온 옛 목소리 답(성공 · 실패)은 새 목소리 예시를 덮지 않는다 */
const V1 = { consent: { v: '1003' }, voiceId: 'v-groom-1', tries: 1, made: '2026-10-07 10:00' };
await scene(17, '늦은 예시 답은 부탁한 창 · 목소리에만', async (set) => {
  let X = set(await boot({ init: { groom: Object.assign({}, V1) }, S: { vset: { groom: { tempo: '1', pause: 600 } } } }));
  await X.until(() => !!document.querySelector('[data-fk="mkvctune:groom"]'), 30000);
  const m0 = (await X.sv()).makes.length;
  await X.click('[data-fk="mkvctune:groom"]'); await X.adv(3000); await X.click('[data-fk="mkdlgx"]'); await X.adv(1000);
  await X.click('[data-fk="mkvctune:groom"]'); await X.until(() => VC.tune && !VC.tune.loading && !!VC.sraw.groom, 60000); await X.adv(12000);
  const a = { makes: (await X.sv()).makes.slice(m0).filter((m) => m.v === 'v-groom-1').length, plays: await X.ev(() => window.__plays.length) };
  ok('#17 예시를 만드는 중 닫고 바로 다시 열기 — 업체 만들기 한 번 · 소리 처음부터 다시 틀기 없음(한 번) [TUNE_REQ_OWN]', a.makes === 1 && a.plays === 1, a);
  await X.ctx.close();
  for (const old of ['ok', 'busy']) {
    X = set(await boot({ init: { groom: Object.assign({}, V1) }, S: { vset: { groom: { tempo: '1', pause: 600 } } }, lat: { enroll: 3000 }, faults: [{ op: 'make', text: '고친 글', lat: 85000, once: 1, kind: old === 'busy' ? 'busy' : undefined }] }));   // 옛 목소리로 보낸 첫 요청만 85초(PC · 90초 안)
    await X.until(() => !!document.querySelector('[data-fk="mkvctune:groom"]'), 30000);
    await X.click('[data-fk="mkvctune:groom"]'); await X.until(() => VC.tune && !VC.tune.loading && !!VC.sraw.groom, 60000);
    await X.ev(() => { S.vtuneText = '고친 글 · 와 주셔서 고맙습니다. 편히 앉아 계세요.'; _tuneGoPaint(); }); await X.click('[data-fk="mktuneplay"]'); await X.adv(2000);
    await X.click('[data-fk="mktuneredo"]'); await X.click('#vcSelf'); await X.click('#vcAgree'); await X.until(() => !!(VC.read && VC.read.phrase), 60000);
    await X.takes(15, 15); await X.click('[data-fk="mkvcmake"]');
    await X.until(() => VC.tune && VC.tune.from === 'enroll' && !VC.tune.loading && !!VC.sraw.groom, 120000);
    const n0 = await X.ev(() => { VC.sraw.groom.__new = 1; return VC.sraw.groom.x.length; });
    await X.adv(95000);
    const c = await X.ev(() => ({ mark: !!(VC.sraw.groom && VC.sraw.groom.__new), len: VC.sraw.groom && VC.sraw.groom.x.length, err: VC.tune && VC.tune.err, red: [...document.querySelectorAll('#mkRecDlg .mk-exw')].map((e) => e.textContent.trim()) }));
    const sv = await X.sv();
    ok(`#17 다시 녹음 뒤 옛 목소리 예시 답(${old === 'ok' ? '성공' : '실패 V1'})이 늦게 와도 — 새 목소리 예시 그대로 · 빨간 글 없음`, sv.st.groom.voiceId === 'v-groom-2' && c.mark && c.len === n0 && !c.err && !c.red.length, { c, n0, voice: sv.st.groom.voiceId });
    await X.ctx.close(); X = null; set(null);
  }
});

await br.close(); srv.close();
console.log(fail ? `\nVC R1 CREATE FAIL ${fail}` : '\nVC R1 CREATE OK'); process.exit(fail ? 1 : 0);
