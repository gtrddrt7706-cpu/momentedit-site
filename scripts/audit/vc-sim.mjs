#!/usr/bin/env node
/* ★★[VC_SIM 2026-10-07 사장님 «오류 관련해서 너가 직접 시뮬레이션 직접 보면서 돌려 보고 · 라운드별로 문제 없을 때까지 원인 개선을 반복해서 안정화»]
   진짜 마이페이지(mypage.html · 중계) + 진짜 식순 화면(order-preview.html · iframe) 위에 가짜 서버를 붙여 «두 분 목소리» 전 과정을 돌린다.
   동의 → 확인 문장 → 1분 녹음으로 만들기 → 맞추기 창 예시 → 이 목소리로 쓰기 → 줄 채우기(만들기 · 올리기)
   가짜 서버는 GAS 와 같은 규칙: 만든 소리는 저장(같은 글이면 바로) · 만들기를 마치면 확인 문장을 비운다 · 끊겨도 서버는 끝까지 한다.
   망가뜨리는 방법(장면): 아이폰 60초 끊김 · 서버 죽음(CORS 없는 오류) · 깨진 답 · 업체 바쁨 · 잠깐 오프라인 · 상태 확인 실패 · 올리기 끊김
   장면마다 «고객이 다시 누르지 않고 끝까지 가는가 · 화면에 남은 빨간 글이 없는가 · 줄이 다 AI 로 찼는가»를 잰다.
   시계는 가짜(clock) — 몇 분짜리 장면도 몇 초에 돈다. SHOTS=<폴더> 면 장면 끝 화면을 찍는다 · ONLY=<장면 이름,…>
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port, BASE = `http://127.0.0.1:${port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 — 마이페이지 창 안에서 fetch 를 갈아 끼운다(시계가 가짜라 지연 · 끊김도 가짜 시간으로 흐른다) */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const MP3 = cfg.mp3, CUT = cfg.cut;   // CUT = 아이폰 사파리가 끊는 초(0 이면 PC — 끊지 않음)
  const SV = window.__SV = { st: { groom: {}, bride: {} }, cache: {}, files: {}, log: [], n: {}, faults: cfg.faults || [] };
  const LAT = Object.assign({ status: 1200, consent: 1500, phrase: 1800, enroll: 30000, make: 9000, makeHit: 1500, practice: 7000, practiceHit: 1200, delete: 2000, ritualFile: 4000 }, cfg.lat || {});
  const pub = (p) => ({ consent: !!p.consent, ready: !!p.voiceId, tries: p.tries || 0, left: 3, made: p.made || '' });
  const now = () => Date.now();
  function handle(b) {   // → { lat, res } 서버가 실제로 하는 일(끊겨도 끝까지 한다)
    const op = b.action === 'voiceClone' ? b.op : b.action, st = SV.st, who = b.who;
    if (b.action === 'voiceClone') {
      if (op === 'status') return { lat: LAT.status, res: () => ({ ok: true, on: true, tts: true, groom: pub(st.groom), bride: pub(st.bride), total: 0, left: 99999 }) };
      if (op === 'consent') return { lat: LAT.consent, res: () => { st[who].consent = 1; return { ok: true, who }; } };
      if (op === 'phrase') return { lat: LAT.phrase, res: () => { st[who].phrase = '오늘은 시월 칠일, 파란 우산과 노란 연필.'; return { ok: true, who, phrase: st[who].phrase }; } };
      if (op === 'enroll') return { lat: LAT.enroll, res: () => { const p = st[who]; if (!p.consent) return { ok: false, error: '동의가 먼저예요.' }; if (!p.phrase) return { ok: false, error: '확인 문장을 먼저 받아 주세요.' };
        const prev = p.voiceId; p.tries = (p.tries || 0) + 1; p.voiceId = 'v-' + who + '-' + p.tries; p.made = new Date(now() + 9 * 3600e3).toISOString().replace('T', ' ').slice(0, 16); /* GAS fmtKST 꼴 */ p.phrase = null; return { ok: true, who, tries: p.tries, renewed: !!prev }; } };
      if (op === 'delete') return { lat: LAT.delete, res: () => { (who === 'all' ? ['groom', 'bride'] : [who]).forEach((w) => { st[w].voiceId = ''; }); return { ok: true }; } };
      if (op === 'make' || op === 'practice') {
        const lines = Array.isArray(b.lines) ? b.lines : [[b.one || '', b.text]];
        const keys = lines.map((l) => { let w = l[0] === 'groom' || l[0] === 'bride' ? l[0] : (st.groom.voiceId ? 'groom' : 'bride'); let v = (st[w] || {}).voiceId; if (!v) { const ow = w === 'groom' ? 'bride' : 'groom'; if (st[ow].voiceId) { w = ow; v = st[ow].voiceId; } } if (!v && op === 'practice') v = 'def'; return [w, v || '', op + '|' + v + '|' + b.tempo + '|' + b.pause + '|' + l[1]]; });   // GAS 와 같다 — 한 분만 만들었으면 그 목소리로
        const fresh = keys.filter((k) => !SV.cache[k[2]]).length;
        return { lat: fresh ? LAT[op] : LAT[op + 'Hit'], res: () => { if (op === 'make' && keys.some((k) => !k[1])) return { ok: false, error: '아직 만든 AI 목소리가 없어요.' };
          keys.forEach((k) => { SV.cache[k[2]] = 1; });
          return op === 'make' ? { ok: true, key: b.key, parts: keys.map((k) => ({ who: k[0], mime: 'audio/mpeg', data: MP3 })), total: 1 } : { ok: true, mime: 'audio/mpeg', data: MP3, mine: true }; } };
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
    if (cfg.offline && op === 'make' && !SV.offAt) { SV.offAt = now(); SV.offUntil = now() + cfg.offline; }   // 첫 만들기부터 N초 동안 인터넷이 끊긴다
    const f = (SV.offUntil && now() < SV.offUntil) ? { kind: 'offline' } : SV.faults.find((x) => x.op === op && (x.nth == null || x.nth === nth || (x.nth === '*' )) && !(x.until && now() > x.until) && !(x.text && !String(b.text || '').includes(x.text)) && !x.used) || null;
    if (f && f.once) f.used = 1;   // once = 그 한 번만(다시 물으면 서버 저장본이 바로 온다 · 실제와 같다)
    const h = handle(b), lat = f && f.lat != null ? f.lat : h.lat, t0 = now();
    SV.log.push({ op, nth, t: t0, f: f ? f.kind : '' });
    return new Promise((resolve, reject) => {
      let settled = false; const sig = o && o.signal;
      const fin = (fn) => { if (settled) return; settled = true; fn(); };
      if (sig) { if (sig.aborted) return reject(new DOMException('aborted', 'AbortError')); sig.addEventListener('abort', () => fin(() => reject(new DOMException('aborted', 'AbortError')))); }
      const kind = f ? f.kind : '';
      if (kind === 'offline') { setTimeout(() => fin(() => reject(new TypeError('Load failed'))), 300); return; }   // 보내지도 못함 — 서버는 모른다
      if (kind === 'crash') { setTimeout(() => fin(() => reject(new TypeError('Load failed'))), lat); return; }     // GAS 가 처리하다 죽음(CORS 없는 오류 쪽) — 서버 일 없음
      if (kind === 'html') { setTimeout(() => fin(() => resolve(new Response('<!doctype html><p>서버 오류</p>', { status: 200, headers: { 'Content-Type': 'text/html' } }))), lat); return; }
      if (kind === 'json') { setTimeout(() => fin(() => resolve(new Response(JSON.stringify(f.body), { status: 200 }))), lat); return; }
      if (kind === 'busy') { setTimeout(() => fin(() => resolve(new Response(JSON.stringify({ ok: false, down: true, kind: 'busy', http: 429, ecode: 'V1', error: '요청이 몰렸어요 (코드 V1)' }), { status: 200 }))), lat); return; }
      // 서버는 끝까지 한다 — 결과는 lat 뒤에 확정(끊겨도)
      let res = null; setTimeout(() => { res = h.res(); SV.log.push({ op, nth, done: now() - t0 }); fin(() => resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }))); }, lat);
      const cut = kind === 'cut' ? (f.at || 60000) : CUT;
      if (cut && lat > cut) setTimeout(() => fin(() => reject(new TypeError('Load failed'))), cut);   // 아이폰: 60초 넘으면 연결 끊김으로 끊는다
    });
  };
};

/* 장면 */
const SCENES = [
  { name: '정상 · PC', cut: 0, faults: [] },
  { name: '정상 · 아이폰', cut: 60000, faults: [] },
  { name: '만들기(1분 녹음)가 60초를 넘겨 아이폰이 끊음', cut: 60000, lat: { enroll: 75000 }, faults: [] },
  { name: '맞추기 예시 첫 만들기가 60초를 넘김(새 목소리 · 저장본 없음)', cut: 60000, lat: { make: 70000 }, faults: [] },
  { name: '서버가 처리하다 죽음(만들기 첫 번)', cut: 60000, faults: [{ op: 'make', nth: 1, kind: 'crash', lat: 20000 }] },
  { name: '서버 답이 깨짐(만들기 첫 번)', cut: 60000, faults: [{ op: 'make', nth: 1, kind: 'html', lat: 5000 }] },
  { name: '업체 바쁨(만들기 두 번)', cut: 60000, faults: [{ op: 'make', nth: 1, kind: 'busy', lat: 3000 }, { op: 'make', nth: 2, kind: 'busy', lat: 3000 }] },
  { name: '만들기 중 30초 오프라인', cut: 60000, offline: 30000, faults: [] },
  { name: '동의 · 확인 문장이 한 번씩 끊김', cut: 60000, faults: [{ op: 'consent', nth: 1, kind: 'offline' }, { op: 'phrase', nth: 1, kind: 'offline' }] },
  { name: '상태 확인이 처음 두 번 실패', cut: 60000, faults: [{ op: 'status', nth: 1, kind: 'offline' }, { op: 'status', nth: 2, kind: 'offline' }] },
  { name: '줄 올리기 첫 번이 60초를 넘겨 끊김(서버는 저장)', cut: 60000, faults: [{ op: 'ritualFile', nth: 1, lat: 70000 }] },
  { name: '줄 올리기 두 번 연달아 끊김', cut: 60000, faults: [{ op: 'ritualFile', nth: 1, kind: 'offline' }, { op: 'ritualFile', nth: 2, kind: 'crash', lat: 9000 }] },
  { name: '줄 올리기 첫 번 연결 실패', cut: 60000, faults: [{ op: 'ritualFile', nth: 1, kind: 'offline' }] },
  { name: '만들기(1분 녹음) 서버가 죽음 — 목소리 안 생김', cut: 60000, faults: [{ op: 'enroll', nth: 1, kind: 'crash', lat: 40000 }] },
  { name: '맞추기 창에서 글을 고쳐 들어 보기 — 60초 넘김', cut: 60000, tuneEdit: true, faults: [{ op: 'make', text: '고맙습니다. 편히', lat: 72000, once: 1 }] },
  { name: '다시 녹음(새 목소리) 만들기가 60초 넘겨 끊김', cut: 60000, redo: true, faults: [{ op: 'enroll', nth: 3, lat: 76000 }] },
  { name: '1분 녹음 만들기가 130초 걸림(아이폰)', cut: 60000, lat: { enroll: 130000 }, faults: [] },
  { name: 'PC · 서버가 100초 걸려 화면이 먼저 포기', cut: 0, faults: [{ op: 'make', nth: 1, lat: 100000 }] },
  { name: '목소리 지우기가 60초 넘겨 끊김(서버는 지움)', cut: 60000, del: true, faults: [{ op: 'delete', nth: 1, lat: 65000 }] },
  { name: '목소리 지우기 연결 끊김(서버 모름)', cut: 60000, del: true, faults: [{ op: 'delete', nth: 1, kind: 'crash', lat: 3000 }], delFail: true },
  { name: '로그인 풀림(맞추기 예시 만들기)', cut: 60000, honest: /로그인이 풀렸어요.*코드 V8/, faults: [{ op: 'make', kind: 'json', lat: 1500, body: { ok: false, reason: 'expired', ecode: 'V8', error: '로그인이 만료됐어요. 다시 로그인해 주세요.' } }] },
  { name: '업체가 계속 바쁨', cut: 60000, honest: /코드 V1/, faults: [{ op: 'make', kind: 'busy', lat: 2000 }] },
  { name: '만들기(1분 녹음) 서버 답이 깨짐', cut: 60000, faults: [{ op: 'enroll', nth: 1, kind: 'html', lat: 20000 }] },
];

async function frame(pg) { for (let i = 0; i < 60; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function adv(pg, ms, step = 500) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(4); } }
async function until(pg, f, fn, max = 240000, step = 500) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn).catch(() => false)) return t; await pg.clock.runFor(step); await wait(4); } return -1; }
const seen = (f) => f.evaluate(() => {   // 화면에 보이는 빨간 글 · 알림
  const out = []; document.querySelectorAll('.mk-exw,[role=alert],.mk-toast,#mkToast,.mk-dlg-msg').forEach((e) => { const t = (e.textContent || '').trim(); if (t && e.offsetParent) out.push(t); });
  if (MK.dlgMsg) out.push('창:' + MK.dlgMsg); if (MK.toast) out.push('알림:' + MK.toast); Object.keys(MK.lineErr || {}).forEach((k) => { if (MK.lineErr[k]) out.push(k + ':' + MK.lineErr[k]); });
  return [...new Set(out)]; });

async function run(sc) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3: MP3, cut: sc.cut, lat: sc.lat || {}, faults: sc.faults || [], offline: sc.offline || 0 });
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await adv(pg, 1500);
  const f = await frame(pg); if (!f) { ok(`${sc.name} — 식순 화면을 못 열었다`, false); await ctx.close(); return; }
  await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function', 20000);
  await f.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true;
    S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.pvText = '두 사람의 이야기를 영상으로 준비했습니다.';
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo('_voice'); });
  await adv(pg, 4000);
  const shot = async (nm) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `${sc.name.replace(/[^\w가-힣]+/g, '_')}-${nm}.png`) }); };
  const log = []; let en = { tune: true }, tune = { lab: '' }, labs = [];
  for (const W of sc.redo ? ['groom', 'bride', 'groom'] : ['groom', 'bride']) {
  /* 1) 동의 */
  await f.evaluate((W) => { mkVcConsent(W); VC.agree = true; mkVcAgree(W); }, W);
  let t = await until(pg, f, () => !!(VC.read && VC.read.phrase), 90000); log.push(W + ' 문장 ' + Math.round(t / 1000) + '초');
  if (t < 0) { await shot(W + '-동의'); en = { tune: false, err: 'phrase' }; break; }
  /* 2) 1분 녹음 두 글 → 만들기 */
  await f.evaluate(() => { const R = VC.read, sr = 16000, mk = (s) => { const x = new Float32Array(sr * s); for (let i = 0; i < x.length; i++) x[i] = Math.sin(i / 9) * 0.2; return { wav: _recWav(x, sr), dur: s }; }; R.take[1] = mk(15); R.take[2] = mk(15); R.step = 2; mkVcEnroll(); });
  t = await until(pg, f, () => !!VC.tune || !!(VC.read && VC.read.err), 200000); log.push('만들기 ' + Math.round(t / 1000) + '초');
  en = await f.evaluate(() => ({ tune: !!VC.tune, err: VC.read && VC.read.err }));
  if (!en.tune) { await shot(W + '-만들기'); break; }
  /* 3) 맞추기 창 — 예시가 저절로 만들어져 «예시 들어 보기» */
  if (process.env.V) console.log('   log@', JSON.stringify(await pg.evaluate(() => __SV.log.slice(0, 14).map((x) => x.op + '#' + x.nth + (x.done != null ? ' done+' + Math.round(x.done / 1000) : ' @' + Math.round((x.t - __SV.log[0].t) / 1000)) + (x.f ? '!' + x.f : '')))));
  if (process.env.V) console.log('   pre@', JSON.stringify(await f.evaluate(() => ({ tune: !!VC.tune, who: VC.tune && VC.tune.who, loading: VC.tune && VC.tune.loading, sraw: Object.keys(VC.sraw || {}), rerr: VC.read && VC.read.err, ph: VC.read && VC.read.ph }))));
  t = await until(pg, f, () => VC.tune && !VC.tune.loading && !!VC.sraw[VC.tune.who], 200000); log.push('예시 ' + Math.round(t / 1000) + '초');
  if (process.env.V) console.log('   log2@', JSON.stringify(await pg.evaluate(() => __SV.log.slice(12, 30).map((x) => x.op + '#' + x.nth + (x.done != null ? ' done+' + Math.round(x.done / 1000) : ' @' + Math.round((x.t - __SV.log[0].t) / 1000)) + (x.f ? '!' + x.f : '')))));
  if (process.env.V) console.log('   tune@', JSON.stringify(await f.evaluate(() => ({ who: VC.tune.who, loading: VC.tune.loading, sraw: Object.keys(VC.sraw || {}), txt: VC.sraw[VC.tune.who] && VC.sraw[VC.tune.who].text.slice(0, 20), cur: _tuneText().slice(0, 20), vt: S.vtuneText }))));
  tune = await f.evaluate(() => ({ lab: (document.querySelector('[data-fk="mktuneplay"]') || {}).textContent || '', msg: MK.dlgMsg || '' })); labs.push(tune.lab + (tune.msg ? '/' + tune.msg : ''));
  await shot(W + '-맞추기');
  if (sc.tuneEdit && W === 'groom') { await f.evaluate(() => { S.vtuneText = '오늘 와 주셔서 고맙습니다. 편히 앉아 계세요.'; _tuneGoPaint(); mkTunePlay(); });
    t = await until(pg, f, () => VC.tune && !VC.tune.loading && VC.sraw[VC.tune.who] && VC.sraw[VC.tune.who].text === _tuneText(), 200000); log.push('고친 글 ' + Math.round(t / 1000) + '초');
    const e2 = await f.evaluate(() => ({ lab: (document.querySelector('[data-fk="mktuneplay"]') || {}).textContent || '', msg: MK.dlgMsg || '' })); labs.push('고침:' + e2.lab + (e2.msg ? '/' + e2.msg : '')); await shot('고친글'); }
  await f.evaluate(() => mkTuneUse());
  /* 4) 줄 채우기(만들기 · 올리기) */
  t = await until(pg, f, () => VC.fill && !VC.fill.doing && !Object.keys(MK_UP).length, 400000); log.push('줄 ' + Math.round(t / 1000) + '초'); await adv(pg, 3000);
  await f.evaluate(() => { VC.read = null; render(); });
  }
  let delT = null;
  if (sc.del) { const dd = await f.evaluate(() => { window.ordAsk = () => Promise.resolve(true); try { mkVcDel('groom'); } catch (e) { return 'ERR ' + e.message; } return 'busy=' + JSON.stringify(VC.delBusy || {}); }); if (process.env.V) console.log('   del@', dd); await adv(pg, 1000); if (process.env.V) console.log('   del2@', await f.evaluate(() => JSON.stringify(VC.delBusy || {})), await pg.evaluate(() => __SV.log.filter((x) => x.op === 'delete').length)); const t = await until(pg, f, () => !(VC.delBusy || {}).groom, 200000);
    const tst = await f.evaluate(() => MK.toast || ((document.querySelector('.mk-toast') || {}).textContent || '')); await adv(pg, 2500);
    delT = await f.evaluate((tst) => ({ toast: tst, ready: !!(VC.st && VC.st.groom && VC.st.groom.ready) }), tst); log.push('지우기 ' + Math.round(t / 1000) + '초'); await shot('지우기');
    if (sc.delFail) ok(`${sc.name} — 서버가 못 지웠으면 목소리 그대로 · 까닭과 코드가 보인다`, delT.ready && /코드 V\d/.test(delT.toast), JSON.stringify(delT));
    else ok(`${sc.name} — 서버가 지웠으면 «지웠어요» · 카드도 «아직 만들지 않았어요»`, delT.toast === '지웠어요' && !delT.ready, JSON.stringify(delT)); await ctx.close(); return; }
  const end = await f.evaluate(() => ({ up: ['g0', 'g1', 'g2', 'g3', 'entry', 'pv'].map((k) => { const v = (S.up || {})[k]; return k + ':' + (v && v.src === 'ai' ? (v.local ? 'local' : 'ai') : '-'); }), fill: VC.fill, ready: !!(VC.st && VC.st.groom && VC.st.groom.ready) }));
  const red = await seen(f); const sv = await pg.evaluate(() => ({ calls: __SV.log.filter((x) => !x.done).map((x) => x.op + (x.f ? '!' + x.f : '')).join(' '), tries: (__SV.st.groom.tries || 0) + '/' + (__SV.st.bride.tries || 0), files: __SV.files }));
  await shot('끝');
  const lines = end.up.filter((x) => /:ai$/.test(x)).length;
  if (sc.honest) {   // 정말 못 하는 경우 — 멈춰 있지 않고 · 까닭이 코드와 함께 보이고 · 화면 오류가 없다
    const stuck = await f.evaluate(() => ({ up: Object.keys(MK_UP).length, fill: !!(VC.fill && VC.fill.doing), tl: !!(VC.tune && VC.tune.loading) }));
    const coded = red.some((x) => sc.honest.test(x));
    ok(`${sc.name} — 멈추지 않고 · 까닭(${sc.honest})이 보인다 · 화면 오류 없음`, !stuck.up && !stuck.fill && !stuck.tl && coded && !errs.length, JSON.stringify({ log, stuck, red: red.slice(0, 4), labs, calls: sv.calls.slice(0, 400), errs: errs.slice(0, 2) }));
    await ctx.close(); return; }
  ok(`${sc.name} — 다시 누르지 않고 끝까지(두 분 목소리 · 예시 · 줄 ${lines}/6) · 남은 빨간 글 없음 · 목소리 한 번씩만 만듦`, en.tune && labs.length >= 2 && labs.every((l) => /^(고침:)?(예시 들어 보기|멈추기)$/.test(l)) && lines === 6 && !red.length && sv.tries === (sc.redo ? '2/1' : '1/1') && !errs.length,
    JSON.stringify({ log, enroll: en, tune: labs, up: end.up, red, tries: sv.tries, errs: errs.slice(0, 2), calls: sv.calls.slice(0, 600) }));
  if (process.env.V) console.log('   ', log.join(' · '), '|', sv.calls.slice(0, 300));
  await ctx.close();
}

for (const sc of SCENES) { if (ONLY.length && !ONLY.some((o) => sc.name.includes(o))) continue;
  try { await run(sc); } catch (e) { ok(`${sc.name} — 재다가 멈췄다`, false, String(e && e.message || e).split('\n')[0]); } }
await br.close(); srv.close();
console.log(fail ? `\nVC SIM FAIL ${fail}` : '\nVC SIM OK'); process.exit(fail ? 1 : 0);
