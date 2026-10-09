#!/usr/bin/env node
/* ★★[VC_R1_MIX 2026-10-08 목소리 1라운드 «mix · 입장 인사 섞임 · 줄 카드 글» 묶음] 진짜 마이페이지(mypage.html · 중계) + 진짜 식순 화면(order-preview.html · iframe) + 가짜 서버(GAS 80_production 규칙) · 가짜 시계.
   고친 항목마다 장면 하나 — 되돌리면 그 장면이 빨강이어야 한다. ★돌연변이 확인(2026-10-08) — 아래 25줄을 하나씩 되돌려 각각 빨강을 봤다:
     _whoStale 의 _whoMiss · 머리 글 차례(_whoLab 먼저) · _exAudio 의 wq · 흐름 eu · _pvFill 동기 · _recNeed 의 pv · _mkItemDone 빈 줄 · _ordPayload 내려놓기 · _vtLeave 내려놓기 ·
     _vtNeed 빈 줄 · _vc 그물 · _vcMake0 빈 글 · 카드 aiF · 흐름 나레이션 · mkUpPlay 빈 줄 · _vcWhoAudio 빈 줄 · _vcAutoFill 빈 줄 · _slPut 자르기 · mkSlText 한도 · maxlength ·
     mkSlWho 같은 분 · _whoRetryRun · mkSlWho 바쁜 동안(_whoPend) · mkSlDel 의 _exAudio · _taChange 의 _exAudio
   #12 · #22 [WHO_MISS]   한 분 목소리만 있을 때 만든 입장 인사(서버가 다른 분 줄도 그 목소리로) — 다른 분이 목소리를 만들면 그분 차례를 그분 목소리로 다시 · 확정한 줄은 그대로(KEEP_LINE)
   #28      [WHO_LAB]    읽는 차례만 바뀐 소리 — «멘트를 바꿨어요»가 아니라 «읽는 분이 바뀌었어요» · «처음 글로» 뒤 이 기기에 있는 그 차례 소리를 바로 붙인다 · 흐름은 옛 차례 소리를 «두 분 목소리»로 세우지 않는다
   #23 · #24 [PV_SYNC · LINE_BLANK] 식전 영상 소개글을 비우면 — 다 됨(스튜디오 나레이션) · 옛 파일은 저장할 때 내려놓는다 · 다시 열어도 빈칸 그대로(예시 1 로 채우지 않는다)
   #25      [SL_CAP]     소개글 200자 — 글칸에서 더 못 적는다 · 보이는 글 = AI 가 읽는 글
   #27      [LINE_BLANK] 빈 줄은 업체 · 서버에 묻지 않는다(▶ · 읽는 분 바꾸기 · 쪽 떠나기) · «비워 두면 이 줄은 스튜디오 나레이션으로 나와요»
   #30      [SL_WHO_SAME] 목소리 상태를 못 받은 채 읽는 분을 바꾼 줄 — 같은 분을 다시 누르면 다시 묻고 · 상태가 돌아오면 저절로 맞추고 빨간 글을 걷는다
   #31      [WHO_BUSY]   만드는 중 · 올리는 중에 누른 다른 분 — 버리지 않고 끝나면 그분으로(칸은 바로 그분으로 켜 보인다)
   #33      [EX_BACK → EX_PRESS_MAKE]    줄을 빼거나 글을 예시로 되돌려도 글만 — «목소리 만들기» · 서버에 묻지 않음(10-08 약속)
   ONLY=12,28,… 로 장면만 · PAR=<n> 장면을 n 개씩 함께(기본 4) · SHOTS=<폴더> 면 390 폭 화면을 찍는다 · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c && !process.env.V ? '' : d ? ' → ' + d : ''}`); if (!c) fail++; return c; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 — GAS 80_production handleVoiceClone(make: 그 줄 분 목소리가 없으면 다른 분 목소리로 · 빈 글은 «읽을 글이 없어요.») · ritualFile · ritualFileGet · ritualFileDel */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const MP3 = cfg.mp3;
  const SV = window.__SV = { st: { groom: {}, bride: {} }, cache: {}, files: {}, blobs: {}, log: [], n: {}, faults: cfg.faults || [], mk: [], del: [] };
  ['groom', 'bride'].forEach((w) => { if ((cfg.seed || {})[w]) SV.st[w] = { consent: 1, voiceId: 'v-' + w + '-1', tries: 1, made: '2026-10-07 10:00' }; });
  const LAT = Object.assign({ status: 1200, consent: 1500, phrase: 1800, enroll: 30000, make: 9000, makeHit: 1500, practice: 7000, practiceHit: 1200, delete: 2000, ritualFile: 4000, ritualFileGet: 2500, ritualFileDel: 1500 }, cfg.lat || {});
  const pub = (p) => ({ consent: !!p.consent, ready: !!p.voiceId, tries: p.tries || 0, left: 3, made: p.made || '' });
  let fid = 0;
  function handle(b) {
    const op = b.action === 'voiceClone' ? b.op : b.action, st = SV.st, who = b.who;
    if (b.action === 'voiceClone') {
      if (op === 'status') return { lat: LAT.status, res: () => ({ ok: true, on: true, tts: true, groom: pub(st.groom), bride: pub(st.bride), total: 0, left: 99999 }) };
      if (op === 'consent') return { lat: LAT.consent, res: () => { st[who].consent = 1; return { ok: true, who }; } };
      if (op === 'phrase') return { lat: LAT.phrase, res: () => { st[who].phrase = '오늘은 시월 칠일, 파란 우산과 노란 연필.'; return { ok: true, who, phrase: st[who].phrase }; } };
      if (op === 'enroll') return { lat: LAT.enroll, res: () => { const p = st[who]; if (!p.consent || !p.phrase) return { ok: false, error: '확인 문장을 먼저 받아 주세요.' }; const prev = p.voiceId; p.tries = (p.tries || 0) + 1; p.voiceId = 'v-' + who + '-' + p.tries; p.made = '2026-10-08 10:00'; p.phrase = null; return { ok: true, who, tries: p.tries, renewed: !!prev }; } };
      if (op === 'make' || op === 'practice') {
        if (op === 'make' && !String(b.text || '').trim()) return { lat: 300, res: () => ({ ok: false, ecode: 'V0', error: '읽을 글이 없어요.' }) };
        const lines = Array.isArray(b.lines) ? b.lines : [[b.one || '', b.text]];
        const keys = lines.map((l) => { let w = l[0] === 'groom' || l[0] === 'bride' ? l[0] : (st.groom.voiceId ? 'groom' : 'bride'); let v = (st[w] || {}).voiceId; if (!v) { const ow = w === 'groom' ? 'bride' : 'groom'; if (st[ow].voiceId) { w = ow; v = st[ow].voiceId; } } if (!v && op === 'practice') v = 'def'; return [w, v || '', op + '|' + v + '|' + b.tempo + '|' + b.pause + '|' + l[1]]; });   // GAS 1534~1535 «한 분만 만들었으면 그 목소리로»
        const fresh = keys.filter((k) => !SV.cache[k[2]]).length;
        return { lat: fresh ? LAT[op] : LAT[op + 'Hit'], res: () => { if (op === 'make' && keys.some((k) => !k[1])) return { ok: false, error: '아직 만든 AI 목소리가 없어요.' };
          keys.forEach((k) => { SV.cache[k[2]] = 1; });
          return op === 'make' ? { ok: true, key: b.key, parts: keys.map((k) => ({ who: k[0], mime: 'audio/mpeg', data: MP3 })), total: 1 } : { ok: true, mime: 'audio/mpeg', data: MP3, mine: true }; } };
      }
      return { lat: 500, res: () => ({ ok: false, error: '알 수 없는 요청이에요.' }) };
    }
    if (b.action === 'ritualFile') return { lat: LAT.ritualFile, res: () => { SV.files[b.key] = (SV.files[b.key] || 0) + 1; const id = 'f' + b.key + 'x' + (++fid) + 'abcdefghij'; SV.blobs[id] = { key: b.key, data: String(b.data || '').replace(/^data:[^,]*,/, ''), mime: b.mime }; return { ok: true, key: b.key, name: String(b.name || '').slice(0, 80), id, at: '방금' }; } };
    if (b.action === 'ritualFileGet') return { lat: LAT.ritualFileGet, res: () => { const f = SV.blobs[b.id]; if (!f || f.gone) return { ok: false, error: '파일을 찾을 수 없어요.' }; return { ok: true, key: b.key, id: b.id, mime: f.mime || 'audio/wav', data: f.data }; } };
    if (b.action === 'ritualFileDel') return { lat: LAT.ritualFileDel, res: () => { SV.del.push(b.id); const f = SV.blobs[b.id]; if (f) f.gone = 1; return { ok: true, key: b.key, id: b.id }; } };
    if (b.action === 'getMyState') return { lat: 300, res: () => ({ ok: false, reason: 'none' }) };
    if (b.action === 'saveProductionTrack') return { lat: 400, res: () => { SV.saved = b.draft; return { ok: true }; } };
    return { lat: 300, res: () => ({ ok: true }) };
  }
  const real = window.fetch.bind(window);
  window.fetch = function (url, o) {
    if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    const op = b.action === 'voiceClone' ? b.op : b.action; SV.n[op] = (SV.n[op] || 0) + 1; const nth = SV.n[op];
    const f = SV.faults.find((x) => x.op === op && (x.nth == null || x.nth === nth)) || null;
    const mkr = op === 'make' ? { key: b.key, bg: !!b.bg, text: String(b.text || ''), req: (Array.isArray(b.lines) ? b.lines.map((l) => (l[0] || '-').slice(0, 1)).join('') : (b.one || '-').slice(0, 1)), off: !!f } : null; if (mkr) SV.mk.push(mkr);
    const h = handle(b), lat = f && f.lat != null ? f.lat : h.lat;
    SV.log.push({ op, nth, key: b.key, bg: !!b.bg, f: f ? f.kind : '' });
    return new Promise((resolve, reject) => {
      if (f && f.kind === 'offline') { setTimeout(() => reject(new TypeError('Load failed')), 300); return; }
      setTimeout(() => { const res = h.res(); if (mkr && res.ok) mkr.got = res.parts.map((p) => p.who.slice(0, 1)).join(''); resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } })); }, lat);
    });
  };
};

async function frame(pg) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function adv(pg, ms, step = 500) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(4); } }
async function until(pg, f, fn, max = 240000, step = 500, arg) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn, arg).catch(() => false)) return t; await pg.clock.runFor(step); await wait(4); } return -1; }
async function open(o = {}) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, deviceScaleFactor: 1 });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3: MP3, lat: o.lat || {}, faults: o.faults || [], seed: o.seed || { groom: 1, bride: 1 } });
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install(); await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  const r = { ctx, pg, errs }; await reopen(r, o.draft || null, o); return r;
}
async function reopen(r, draft, o = {}) {
  const pg = r.pg;
  await pg.evaluate((d) => { openRitualBuilder(d ? { ritualDraft: { _v: 3, S: d } } : {}, {}); }, draft); await adv(pg, 1500);
  const f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function' && typeof RitualOpen === 'object', 20000); await adv(pg, 1500);
  await f.evaluate((o) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true;
    S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; if (!o.noPv && !String(S.pvText || '').trim() && !(S.vlines || {}).pv) S.pvText = PV_EX[0][1];
    S.vset = S.vset || {}; ['groom', 'bride'].forEach((w) => { S.vset[w] = S.vset[w] || { tempo: '1', pause: 900 }; }); if (S.vsetNeed) S.vsetNeed = {};
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo(o.page || 'guest'); }, o);
  if (!o.noWait) await until(pg, f, () => !!(VC.st && VC.st.groom) && !!ENG, 60000);
  await adv(pg, 1000); r.f = f; return f;
}
const done = (r, k) => until(r.pg, r.f, (k) => { const u = (S.up || {})[k]; return u && typeof u === 'object' && u.src === 'ai' && !MK_UP[k] && !VC_MKP[k]; }, 300000, 500, k);
const line = (f, k) => f.evaluate((k) => { const u = (S.up || {})[k]; const b = document.querySelector('[data-fk="mkvpl:' + k + '"]'), card = (document.querySelector('[data-fk^="mksl:' + k + ':"]') || b || document.body).closest('li.mk-vc');
  const pill = card ? card.querySelector('.mk-aip') : null;
  return { by: u && typeof u === 'object' ? [].concat(u.by || []).join('+') : String(u || '-'), wq: u && u.wq, id: u && u.id ? String(u.id).slice(0, 10) : '', stale: _upStale(k), mode: _aiMode(k), up: MK_UP[k] == null ? '' : String(MK_UP[k]).slice(0, 6), who: _vcLineWho(k),
    err: (MK.lineErr || {})[k] || '', pill: pill && !pill.hasAttribute('aria-hidden') ? pill.textContent.trim() : '', st: card ? Array.from(card.querySelectorAll('.mk-vst')).map((e) => e.textContent.trim()).filter(Boolean).join('|') : '',
    note: card ? Array.from(card.querySelectorAll('.mk-vaiw')).map((e) => e.textContent.trim()).join('|') : '', aiPlay: !!(b && !b.dataset.ml), txt: _recNeed(k) }; }, k);
const mkN = (pg, k, o = {}) => pg.evaluate(([k, o]) => __SV.mk.filter((m) => m.key === k && (o.fg ? !m.bg : true) && (o.empty ? !m.text.trim() : true)).length, [k, o]);
async function shot(r, nm, key) { if (!SHOTS) return; if (key) { await r.f.evaluate((k) => { const b = document.querySelector('[data-fk^="mksl:' + k + ':"]') || document.querySelector('[data-fk="mkvpl:' + k + '"]'); const c = b ? b.closest('li.mk-vc') : null; if (c) c.scrollIntoView({ block: 'center' }); }, key); await r.pg.clock.runFor(200); await wait(40); } await r.pg.screenshot({ path: path.join(SHOTS, nm + '.png'), fullPage: !!process.env.FULL }); }
async function enroll(r, W) {   // 고객이 실제로 누르는 차례 — 동의 → 확인 문장 → 1분 녹음 → 맞추기 → «이 목소리로 쓰기»
  const { pg, f } = r;
  await f.evaluate((W) => { mkGo('_voice'); mkVcConsent(W); VC.agree = true; mkVcAgree(W); }, W);
  if (await until(pg, f, () => !!(VC.read && VC.read.phrase), 90000) < 0) return false;
  await f.evaluate(() => { const R = VC.read, sr = 16000, mk = (s) => { const x = new Float32Array(sr * s); for (let i = 0; i < x.length; i++) x[i] = Math.sin(i / 9) * 0.2; return { wav: _recWav(x, sr), dur: s }; }; R.take[1] = mk(15); R.take[2] = mk(15); R.step = 2; mkVcEnroll(); });
  if (await until(pg, f, () => VC.tune && !VC.tune.loading && !!VC.sraw[VC.tune.who], 200000) < 0) return false;
  await f.evaluate(() => mkTuneUse());
  await until(pg, f, () => VC.fill && !VC.fill.doing && !Object.keys(MK_UP).length && !Object.keys(VC_MKP).length, 400000); await adv(pg, 3000);
  await f.evaluate(() => { VC.read = null; render(); }); return true;
}

const SCENES = {
  /* #12 · #22 — 신랑 목소리만 있을 때 입장 인사를 만들고(서버가 신부 줄도 신랑 목소리로) · 신부가 목소리를 만든다 */
  async '12'() {
    const r = await open({ seed: { groom: 1 }, page: 'entry' }); const { pg, f } = r;
    await f.evaluate(() => mkAiGo('entry')); await done(r, 'entry'); await adv(pg, 2000);
    const a = await line(f, 'entry');
    ok('#12 · #22 처음(신랑 목소리만) — 입장 인사는 신랑 목소리 하나로 만들어진다(재료 확인)', a.by === 'groom' && a.wq === 'gbg' && a.mode === 'keep', JSON.stringify(a));
    const bk = await f.evaluate(() => { const k = GUEST_KEYS.filter((x) => _vcLineWho(x) === 'bride')[0]; if (k) mkSlText(k, 0, ''); window.__emk = 0; const o = _vc; _vc = function (op, d) { if (op === 'make' && !String((d && d.text) || '').trim()) window.__emk++; return o.apply(this, arguments); }; return k || ''; });   // 신부가 읽는 하객 맞이 줄 하나는 비워 둔 판 — 채우기가 빈 줄로 만들러 가지 않는지
    const okE = await enroll(r, 'bride'); await f.evaluate(() => mkGo('entry')); await adv(pg, 2000);
    const emk = await f.evaluate(() => window.__emk);
    ok('#27 [LINE_BLANK] 목소리를 만들어 줄을 채울 때 비워 둔 줄은 건너뛴다(빈 글로 만들러 가지 않음)', !!bk && emk === 0, JSON.stringify({ bk, emk }));
    const b = await line(f, 'entry'), mk = await pg.evaluate(() => __SV.mk.filter((m) => m.key === 'entry' && !m.bg).map((m) => m.req + '>' + (m.got || '?')));
    await shot(r, '12-entry-after-bride', 'entry');
    ok('#12 · #22 [WHO_MISS] 신부가 목소리를 만들면 입장 인사의 신부 줄이 신부 목소리로 다시 만들어진다(누르지 않고 · 다 됨 · 한 번만 다시)', okE && /groom/.test(b.by) && /bride/.test(b.by) && !b.stale && b.mode === 'keep' && !b.err && mk.length <= 2 && !r.errs.length, JSON.stringify({ okE, b, mk, errs: r.errs.slice(0, 2) }));
    /* 확정한 줄은 다시 녹음해도 그대로(KEEP_LINE) — 새 판정이 확정한 줄을 «목소리 만들기»로 되돌리지 않는다 */
    const k = await f.evaluate(() => { const u0 = S.up.entry; S.up.entry = Object.assign({}, u0, { by: 'groom' }); S.vkeep = S.vkeep || {}; S.vkeep.entry = 1; render(); const kept = { stale: _upStale('entry'), mode: _aiMode('entry') };
      delete S.vkeep.entry; render(); const card = document.querySelector('[data-fk="mkvpl:entry"]').closest('li.mk-vc'); const lab = Array.from(card.querySelectorAll('.mk-vst')).map((e) => e.textContent.trim()).join('|'), pill = (card.querySelector('.mk-aip') || {}).textContent || '';
      const res = { kept, mode: _aiMode('entry'), lab, pill: pill.trim() }; S.up.entry = u0; render(); return res; });
    ok('#12 [WHO_MISS] 확정한 줄은 그대로(확정됨) · 확정 안 한 옛 판은 «신부 목소리가 생겼어요 · 목소리 만들기»(읽는 분은 안 바뀌었다)', !k.kept.stale && k.kept.mode === 'kept' && k.mode === 'need' && /신부 목소리가 생겼어요/.test(k.lab) && !/읽는 분이 바뀌었어요|멘트를 바꿨어요/.test(k.lab) && /목소리 만들기/.test(k.pill), JSON.stringify(k));
    await r.ctx.close();
  },
  /* #28 — 입장 인사를 두 분 목소리로 만든 뒤 둘째 줄을 신랑으로(차례만 바뀜) · «처음 글로» */
  async '28'() {
    const r = await open({ page: 'entry' }); const { pg, f } = r;
    await f.evaluate(() => mkAiGo('entry')); await done(r, 'entry'); await adv(pg, 1500);
    await f.evaluate(() => mkSlWho('entry', 1, 'g')); await until(pg, f, () => { const u = S.up.entry; return u && u.wq === 'ggg' && !MK_UP.entry && !VC_MKP.entry; }, 120000); await adv(pg, 1500);
    const lab = await f.evaluate(() => { const u0 = S.up.entry; const L = _slCopy('entry'); L[1].w = 'g'; _slPut('entry', L); render(); const card = document.querySelector('[data-fk="mkvpl:entry"]').closest('li.mk-vc');
      const st = Array.from(card.querySelectorAll('.mk-vst')).map((e) => e.textContent.trim()).join('|'); L[1].w = 'b'; _slPut('entry', L); render();   // 소리 ggg · 줄 gbg — 읽는 차례만 다르다
      const st2 = Array.from(document.querySelector('[data-fk="mkvpl:entry"]').closest('li.mk-vc').querySelectorAll('.mk-vst')).map((e) => e.textContent.trim()).join('|');
      const fl = _lSteps(ENG, ['entry']).filter((x) => x.own && x.up === 'entry').map((x) => ({ couple: x.couple, lab: x.lab })); return { st, st2, fl, wq: u0.wq, sig: _slWhoSig('entry'), txStale: _txStale('entry'), mode2: _aiMode('entry') }; });
    await shot(r, '28-entry-who-only', 'entry');
    ok('#28 [WHO_LAB · STALE_QUIET 2026-10-09] 읽는 차례만 바뀐 입장 인사 — «목소리 만들기»(단추 옆 «읽는 분이 바뀌었어요 · 멘트를 바꿨어요» 없음) · 흐름은 옛 차례 소리를 «두 분 목소리»로 세우지 않는다', lab.mode2 === 'need' && !/읽는 분이 바뀌었어요|멘트를 바꿨어요/.test(lab.st2) && lab.fl.length === 1 && lab.fl[0].couple === false, JSON.stringify(lab));
    await until(pg, f, () => !(VC.fill && VC.fill.doing), 400000); await adv(pg, 500);   // [FILL_EX] 처음 채우기가 도는 동안이면 그 순간 줄은 지금 글로 끝까지 채운다(설계) — 그 뒤의 약속을 잰다
    const n0 = await mkN(pg, 'entry'); await f.evaluate(() => mkVtReset('entry')); await adv(pg, 600);
    const m1 = await f.evaluate(() => _aiMode('entry')); await adv(pg, 3000); const e0 = await line(f, 'entry'), n1 = await mkN(pg, 'entry');
    ok('#28 [WHO_LAB · EX_PRESS_MAKE 2026-10-08] «처음 글로»(줄 나눔이 기본 gbg 로) — 기억에 든 gbg 소리를 바로 붙이지 않는다 · «목소리 만들기» · 서버에 묻지 않음', m1 === 'need' && e0.mode === 'need' && /목소리 만들기/.test(e0.pill) && n1 === n0, JSON.stringify({ m1, e0, n0, n1 }));
    await f.evaluate(() => mkAiGo('entry')); await until(pg, f, () => { const u = S.up.entry; return u && u.wq === 'gbg' && !MK_UP.entry && !VC_MKP.entry; }, 60000); await adv(pg, 500);
    const e = await line(f, 'entry'), n2 = await mkN(pg, 'entry');
    ok('#28 [EX_PRESS_MAKE] 누르면 그 글(gbg)로 한 번 만들어 «확정하기»', e.wq === 'gbg' && !e.stale && e.mode === 'keep' && n2 === n0 + 1 && !r.errs.length, JSON.stringify({ e, n0, n2, errs: r.errs.slice(0, 2) }));
    await r.ctx.close();
  },
  /* #23 · #24 — 식전 영상 소개글을 만든 뒤 다 지우고 · 저장하고 · (빈 줄에서 ▶ · 읽는 분 바꾸기) · 다시 연다 */
  async '23'() {
    const r = await open({ page: 'prevideo' }); const { pg, f } = r;
    await f.evaluate(() => mkAiGo('pv')); await done(r, 'pv'); await adv(pg, 1500);
    const id0 = await f.evaluate(() => S.up.pv.id);
    await f.locator('[data-fk="mksl:pv:0"]').fill(''); await f.evaluate(() => { document.activeElement && document.activeElement.blur(); }); await adv(pg, 1500);
    const a = await line(f, 'pv'), d = await f.evaluate(() => ({ done: _mkItemDone({ up: 'pv', k: 'prevideo' }), msg: _mkLeaveMsg('prevideo'), cnt: (document.getElementById('mkPvN') || {}).textContent }));
    await shot(r, '24-pv-emptied', 'pv');
    ok('#24 [LINE_BLANK] 소개글을 비우면 — «글을 고쳤어요» 없이 «비워 두면 스튜디오 나레이션» 한 줄 · AI ▶ 없음 · 다 됨(«다음»에서 «AI 목소리 1줄» 묻지 않음)', !a.st && /비워 두면 스튜디오 나레이션/.test(a.note) && !a.aiPlay && d.done && !/AI 목소리/.test(d.msg || '') && d.cnt === '0 / 200자', JSON.stringify({ a, d }));
    const draft = await f.evaluate(() => { _ordPayload(); return JSON.parse(JSON.stringify(S)); }); await adv(pg, 3000);   // 머리 «저장» · 나가기 · 완성이 짓는 꾸러미
    const del = await pg.evaluate((id) => __SV.del.includes(id), id0);
    ok('#24 [LINE_BLANK] 저장하면 비운 소개글의 옛 AI 파일을 내려놓는다(초안에서 빼고 서버 휴지통 · 당일 콘솔이 지운 글을 틀지 않게)', !draft.up.pv && del, JSON.stringify({ up: draft.up.pv, del }));
    await f.evaluate(() => { window.__emk = 0; const o = _vc; _vc = function (op, d) { if (op === 'make' && !String((d && d.text) || '').trim()) window.__emk++; return o.apply(this, arguments); }; MK.toast = ''; mkUpPlay('pv'); });   // 빈 글로 만들러 간 횟수(마지막 그물 앞에서 센다)
    const p1 = await f.evaluate(() => ({ toast: MK.toast || '', aud: MK.audKey || '' })); await f.evaluate(() => mkSlWho('pv', 0, 'b')); await adv(pg, 3000); await f.evaluate(() => mkSlWho('pv', 0, 'g')); await adv(pg, 3000);
    const b = await line(f, 'pv'), emk = await f.evaluate(() => window.__emk), em = await mkN(pg, 'pv', { empty: true });
    ok('#24 [LINE_BLANK] 빈 소개글에서 ▶ · 읽는 분 바꾸기 — 빈 글로 만들러 가지 않고 · «불러오는 중» · 빨간 글 없음', emk === 0 && em === 0 && !b.err && !p1.toast && !p1.aud, JSON.stringify({ emk, em, err: b.err, p1 }));
    await reopen(r, draft, { page: 'prevideo', noPv: true }); const f2 = r.f; await adv(pg, 2000);
    const c = await f2.evaluate(() => { const ta = document.querySelector('[data-fk="mksl:pv:0"]'); return { ta: ta ? ta.value : null, pvText: S.pvText, rn: _recNeed('pv'), cnt: (document.getElementById('mkPvN') || {}).textContent, own: _lSteps(ENG, ['prevideo']).some((x) => x.own && x.up === 'pv') }; }), c2 = await line(f2, 'pv');
    await shot(r, '23-pv-reopen', 'pv');
    ok('#23 [PV_SYNC] 비운 판을 다시 열어도 빈칸 그대로 — 읽을 글 · 글자 수 · 흐름이 같은 것을 본다(예시 1 로 채우지 않음 · «읽는 분이 바뀌었어요» 없음)', c.ta === '' && c.pvText === '' && c.rn === '' && c.cnt === '0 / 200자' && !c.own && /비워 두면 스튜디오 나레이션/.test(c2.note) && !/읽는 분이 바뀌었어요/.test(c2.st) && !r.errs.length, JSON.stringify({ c, c2, errs: r.errs.slice(0, 2) }));
    await r.ctx.close();
  },
  /* #25 — 소개글 200자: 한 줄에 217자 · 두 줄(121 + 95) · 옛 초안(줄은 217자 · 읽을 글은 200에서 잘린 판) */
  async '25'() {
    const r = await open({ page: 'prevideo' }); const { pg, f } = r;
    const A1 = '오늘 이 자리에 와 주신 모든 분께 진심으로 감사드립니다. 저희 두 사람이 처음 만난 날부터 오늘까지의 이야기를 짧은 영상에 담아 보았습니다. 서로 다른 길을 걸어오던 두 사람이 ', L1 = (A1 + A1).slice(0, 121);   // 121자
    const A2 = '그 사이에 있었던 작은 순간들을 함께 봐 주세요. 영상이 끝나면 저희가 곧 들어가겠습니다. 끝까지 함께해 주셔서 고맙습니다. ', L2 = (A2 + A2).slice(0, 95);   // 95자
    const long = (L1 + L2).trim();
    await f.locator('[data-fk="mksl:pv:0"]').fill(long); await f.evaluate(() => document.activeElement && document.activeElement.blur()); await adv(pg, 1500);
    const a = await f.evaluate(() => { const ta = document.querySelector('[data-fk="mksl:pv:0"]'); return { len: ta.value.length, shown: ta.value.trim(), rn: _recNeed('pv'), pv: S.pvText, cnt: (document.getElementById('mkPvN') || {}).textContent }; });
    await f.evaluate(() => mkAiGo('pv')); await done(r, 'pv'); await adv(pg, 1000);
    const sent = await pg.evaluate(() => { const m = __SV.mk.filter((x) => x.key === 'pv' && !x.bg); return m.length ? m[m.length - 1].text : ''; });
    await shot(r, '25-pv-one-line', 'pv');
    ok('#25 [SL_CAP] 한 줄에 217자 — 글칸이 200자에서 더 받지 않는다 · 보이는 글 = 읽을 글 = AI 가 받은 글', long.length > 200 && a.len <= 200 && a.shown === a.rn && a.pv === a.rn && sent === a.rn && a.cnt === a.rn.length + ' / 200자', JSON.stringify({ long: long.length, a: { len: a.len, rn: a.rn.length, pv: a.pv.length, cnt: a.cnt }, sent: sent.length }));
    const k = await f.evaluate((t) => { mkSlText('pv', 0, t); const ta = document.querySelector('[data-fk="mksl:pv:0"]'); return { pv: S.pvText.length, ta: ta.value.length }; }, long + long);   // 글칸 막음이 낡았거나 없어도(붙여 넣기 · 다른 기기) 글은 한도 안에
    ok('#25 [SL_CAP] 글자 수 한도를 넘는 글이 들어와도 한도에서 자르고 글칸도 같은 글로 맞춘다(보이는 글 = 읽을 글)', k.pv === 200 && k.ta === 200, JSON.stringify(k));
    /* 두 줄 — 121자 + «＋ 줄 더하기» 95자 */
    await f.locator('[data-fk="mksl:pv:0"]').fill(L1.trim()); await f.evaluate(() => document.activeElement && document.activeElement.blur()); await adv(pg, 1200);
    await f.locator('[data-fk="mksladd:pv"]').click(); await adv(pg, 800);
    const ml = await f.evaluate(() => (document.querySelector('[data-fk="mksl:pv:1"]') || {}).maxLength);
    await f.locator('[data-fk="mksl:pv:1"]').fill(L2); await f.evaluate(() => document.activeElement && document.activeElement.blur()); await adv(pg, 1500);
    const b = await f.evaluate(() => { const v = Array.from(document.querySelectorAll('[data-fk^="mksl:pv:"]')).map((t) => t.value.trim()).filter(Boolean).join(' '); return { shown: v, rn: _recNeed('pv'), pv: S.pvText, cnt: (document.getElementById('mkPvN') || {}).textContent }; });
    await f.evaluate(() => mkAiGo('pv')); await done(r, 'pv'); await adv(pg, 1000);
    const sent2 = await pg.evaluate(() => { const m = __SV.mk.filter((x) => x.key === 'pv' && !x.bg); return m.length ? m[m.length - 1].text : ''; });
    await shot(r, '25-pv-two-lines', 'pv');
    ok('#25 [SL_CAP] 두 줄 합 — 새 줄 칸은 남은 글자만 받고(200 − 121 − 띄어쓰기) · 보이는 두 줄 = 읽을 글 = AI 가 받은 글 · 글자 수 줄도 같은 값', ml === 200 - L1.trim().length - 1 && b.shown.length <= 200 && b.shown === b.rn && b.pv === b.rn && sent2 === b.rn && b.cnt === b.rn.length + ' / 200자', JSON.stringify({ ml, b: { shown: b.shown.length, rn: b.rn.length, pv: b.pv.length, cnt: b.cnt }, sent2: sent2.length }));
    /* 옛 초안 — 고치기 전에 저장된 판(줄 217자 · S.pvText 는 200 에서 잘림 · 소리는 잘린 글) */
    const draft = await f.evaluate((t) => { const D = JSON.parse(JSON.stringify(S)); D.vlines = D.vlines || {}; D.vlines.pv = [{ w: 'g', t }]; D.pvText = t.slice(0, 200); D.up = D.up || {}; D.up.pv = Object.assign({}, S.up.pv, { tx: _txSig(t.slice(0, 200)), wq: 'g', by: 'groom' }); return D; }, long);
    await reopen(r, draft, { page: 'prevideo', noPv: true }); const f2 = r.f; await adv(pg, 1500);
    await f2.evaluate(() => { mkSlAdd('pv'); mkSlDel('pv', 1); }); await adv(pg, 500);   // 줄을 더했다 빼도(_slPut) 읽을 글 · 글자 수가 잘리지 않는다
    const c = await f2.evaluate(() => { const ta = document.querySelector('[data-fk="mksl:pv:0"]'); return { ta: ta.value.length, rn: _recNeed('pv').length, pv: S.pvText.length, cnt: (document.getElementById('mkPvN') || {}).textContent }; }), c2 = await line(f2, 'pv');
    ok('#25 [SL_CAP · PV_SYNC] 옛 초안(줄 217자 · 소리는 200자에서 잘린 글) — 다시 열면 보이는 글 그대로 읽을 글 · 글자 수(217 / 200자)도 같은 값 · 소리는 다시 만들어야 하는 줄(«목소리 만들기» · 단추 옆 글 없음 · STALE_QUIET)', c.ta === long.length && c.rn === long.length && c.pv === long.length && c.cnt === long.length + ' / 200자' && c2.mode === 'need' && !/글을 고쳤어요|예시를 바꿨어요/.test(c2.st) && !r.errs.length, JSON.stringify({ c, st: c2.st, errs: r.errs.slice(0, 2) }));
    await r.ctx.close();
  },
  /* #27 — 하객 맞이 g0 · g1 · 입장 인사를 만든 뒤 줄을 다 비운다 */
  async '27'() {
    const r = await open({ page: 'guest' }); const { pg, f } = r;
    await f.evaluate(() => mkAiGo('g0')); await done(r, 'g0'); await adv(pg, 1500);
    const id0 = await f.evaluate(() => S.up.g0.id);
    await f.locator('[data-fk="mksl:g0:0"]').fill(''); await f.evaluate(() => document.activeElement && document.activeElement.blur()); await adv(pg, 1500);
    const a = await line(f, 'g0'), d = await f.evaluate(() => ({ done: _mkItemDone({ up: 'g0', k: 'guest' }), own: _lSteps(ENG, ['guest']).some((x) => x.own && x.up === 'g0') }));
    await shot(r, '27-g0-emptied', 'g0');
    ok('#27 [LINE_BLANK] 비운 하객 맞이 줄 — «비워 두면 이 줄은 스튜디오 나레이션으로 나와요» · AI ▶ 없음 · 다 됨 · 흐름도 나레이션', !a.st && /비워 두면 이 줄은 스튜디오 나레이션으로 나와요/.test(a.note) && !a.aiPlay && d.done && !d.own, JSON.stringify({ a, d }));
    await f.evaluate(() => { window.__emk = 0; const o = _vc; _vc = function (op, d) { if (op === 'make' && !String((d && d.text) || '').trim()) window.__emk++; return o.apply(this, arguments); }; _vtBakeAll(); }); await adv(pg, 3000);   // 머리 «저장» = 남은 줄 굽기
    const e0 = await f.evaluate(() => window.__emk);
    await f.evaluate(() => mkGo('entry')); await adv(pg, 3000);   // 쪽을 떠난다
    const del = await pg.evaluate((id) => __SV.del.includes(id), id0), b = await f.evaluate(() => ({ up: S.up.g0, err: (MK.lineErr || {}).g0 || '' }));
    ok('#27 [LINE_BLANK] 빈 줄은 «저장»(굽기)에서 빈 글로 만들러 가지 않고 · 옛 AI 파일은 쪽을 떠날 때 내려놓는다(서버 휴지통)', e0 === 0 && !b.err && !b.up && del, JSON.stringify({ e0, b, del }));
    /* 마지막 그물 — 빈 글 만들기는 어느 길로 와도 서버에 가지 않는다(_vc · 줄 아래 빨간 글 없음) */
    const L0 = await pg.evaluate(() => __SV.log.length); const n0 = await pg.evaluate(() => (__SV.n.make || 0)); const g = await f.evaluate(() => _vc('make', { key: 'g1', text: '  ', lines: [['groom', ''], ['bride', ' ']] }).then((d) => ({ ok: d.ok, empty: !!d.empty, err: d.error || '' }))); await adv(pg, 1000);
    const n1 = await pg.evaluate((L0) => (__SV.n.make || 0) - __SV.log.slice(L0).filter((x) => x.op === 'make' && !/^g[12]$/.test(x.key || '')).length, L0);   // 뒤에서 미리 만드는 다른 줄([FILL_EMPTY] · 다른 분 목소리 데우기)은 빼고 이 두 줄만
    const g2 = await f.evaluate(() => { mkSlText('g2', 0, ''); return _vcMake('g2', {}).then(() => 'made', () => 'no').then((x) => ({ x, err: (MK.lineErr || {}).g2 || '', up: MK_UP.g2 || '' })); }); await adv(pg, 500);
    ok('#27 [LINE_BLANK] 빈 글 만들기 요청은 업체 · 서버에 보내지 않는다(마지막 그물 · 거절 글 · 그 줄 빨간 글 없음)', g.empty && !g.ok && !g.err && n1 === n0 && g2.x === 'no' && !g2.err && !g2.up, JSON.stringify({ g, n0, n1, g2 }));
    /* g1 — 만든 뒤 비우고 그 자리에서 ▶ · 읽는 분 바꾸기 */
    await f.evaluate(() => { mkGo('guest'); mkAiGo('g1'); }); await done(r, 'g1'); await adv(pg, 1500);
    await f.locator('[data-fk="mksl:g1:0"]').fill(''); await adv(pg, 300);
    const w1 = await f.evaluate(() => { window.__emk = 0; mkUpPlay('g1'); return { aud: MK.audKey || '', toast: MK.toast || '' }; }); await adv(pg, 1500);
    const ow = await f.evaluate(() => (_slRaw('g1')[0] || {}).w === 'b' ? 'g' : 'b'); await f.evaluate((w) => mkSlWho('g1', 0, w), ow); await adv(pg, 4000);
    const e1 = await f.evaluate(() => ({ emk: window.__emk, err: (MK.lineErr || {}).g1 || '' })), em = await mkN(pg, 'g1', { empty: true });
    ok('#27 [LINE_BLANK] 빈 줄 ▶ — 옛 소리를 틀지 않는다 · 읽는 분 바꾸기 — 빈 글로 만들러 가지 않는다(빨간 «읽을 글이 없어요.» 없음)', !w1.aud && !w1.toast && e1.emk === 0 && em === 0 && !e1.err, JSON.stringify({ w1, e1, em }));
    /* 입장 인사 — 세 줄을 다 비우고 ▶ */
    await f.evaluate(() => { mkGo('entry'); mkAiGo('entry'); }); await done(r, 'entry'); await adv(pg, 1500);
    await f.evaluate(() => { window.__emk = 0; const n = _slRaw('entry').length; for (let i = 0; i < n; i++) mkSlText('entry', i, ''); render(); mkUpPlay('entry'); }); await adv(pg, 3000);
    const e = await line(f, 'entry'), em2 = await mkN(pg, 'entry', { empty: true }), dn = await f.evaluate(() => ({ done: _mkItemDone({ up: 'entry', k: 'entry' }), emk: window.__emk, aud: MK.audKey || '' }));
    await shot(r, '27-entry-emptied', 'entry');
    ok('#27 [LINE_BLANK] 입장 인사 줄을 다 비우고 ▶ — 빈 글(lines [])로 묻지 않음 · 옛 소리도 안 튼다 · 빨간 글 없음 · 다 됨', em2 === 0 && dn.emk === 0 && !dn.aud && !e.err && dn.done && /비워 두면 이 줄은 스튜디오 나레이션으로 나와요/.test(e.note) && !r.errs.length, JSON.stringify({ e, em2, dn, errs: r.errs.slice(0, 2) }));
    await r.ctx.close();
  },
  /* #30 — 신랑 AI 로 채운 g0 를 다시 열 때 목소리 상태를 못 받는다 → «신부» (A 같은 분 다시 · B 상태가 돌아옴 · C 원래 분으로 되돌림) */
  async '30'() {
    let r = await open({ page: 'guest' }); await r.f.evaluate(() => mkAiGo('g0')); await done(r, 'g0'); await adv(r.pg, 2000);
    const saved = await r.f.evaluate(() => JSON.parse(JSON.stringify(S))); await r.ctx.close();
    const off = async () => { const x = await open({ page: 'guest', draft: saved, noWait: true, faults: [{ op: 'status', kind: 'offline' }] }); await until(x.pg, x.f, () => !!VC.stErr, 40000); await adv(x.pg, 500); return x; };
    const press = async (x, w) => { await x.f.evaluate((w) => document.querySelector('[data-fk="mkslw:g0:0:' + w + '"]').click(), w); await until(x.pg, x.f, () => /목소리 정보가 안 왔어요/.test((MK.lineErr || {}).g0 || '') && !VC.loading, 60000); await adv(x.pg, 500); };
    const back = async (x) => { await x.pg.evaluate(() => { __SV.faults.length = 0; }); await until(x.pg, x.f, () => !VC.stErr && !!VC.st && !VC.loading, 90000); await adv(x.pg, 25000); };
    /* A — 끊긴 채 같은 «신부»를 다시 누르면 다시 묻는다 */
    r = await off(); await press(r, 'b'); const n1 = await r.pg.evaluate(() => __SV.n.status || 0);
    await r.f.evaluate(() => document.querySelector('[data-fk="mkslw:g0:0:b"]').click()); await adv(r.pg, 1500); const n2 = await r.pg.evaluate(() => __SV.n.status || 0);
    await shot(r, '30-g0-statusfail', 'g0');
    ok('#30 [SL_WHO_SAME] 상태를 못 받은 줄 — «다시 눌러 주세요»대로 같은 «신부»를 다시 누르면 다시 묻는다', n2 > n1 && !r.errs.length, JSON.stringify({ n1, n2, errs: r.errs.slice(0, 2) })); await r.ctx.close();
    /* B — 다시 누르지 않아도 상태가 돌아오면 맞춘다 */
    r = await off(); await press(r, 'b'); await back(r); const b = await line(r.f, 'g0');
    ok('#30 [SL_WHO_SAME] 상태가 돌아오면(10초 다시 묻기) 누르지 않아도 신부 소리로 맞추고 «목소리 정보가 안 왔어요»를 걷는다', b.by === 'bride' && !b.stale && !b.err && !r.errs.length, JSON.stringify({ b, errs: r.errs.slice(0, 2) })); await r.ctx.close();
    /* C — 끊긴 동안 원래 분(신랑)으로 되돌리면, 상태가 돌아온 뒤 소리는 그대로(만들지 않음) · 빨간 글은 걷힌다 */
    r = await off(); await press(r, 'b'); await press(r, 'g'); const m0 = await mkN(r.pg, 'g0', { fg: true }); await back(r); const c = await line(r.f, 'g0'), m1 = await mkN(r.pg, 'g0', { fg: true });   // 그 줄을 앞에서 만든 횟수(뒤에서 미리 만들기는 빼고)
    ok('#30 [SL_WHO_SAME] 끊긴 동안 원래 분으로 되돌린 줄 — 상태가 돌아오면 빨간 글만 걷고 소리는 그대로(다시 만들지 않음)', c.by === 'groom' && c.who === 'groom' && !c.stale && !c.err && m1 === m0 && !r.errs.length, JSON.stringify({ c, m0, m1, errs: r.errs.slice(0, 2) })); await r.ctx.close();
  },
  /* #31 — g0(신랑)을 신부로 바꿔 «만드는 중»인 동안 신랑을 다시 누른다 */
  async '31'() {
    const r = await open({ page: 'guest' }); const { pg, f } = r;
    await f.evaluate(() => { const L = _slCopy('g0'); L[0].t = '오늘 와 주셔서 고맙습니다. 편히 앉아 계세요.'; _slPut('g0', L); render(); mkAiGo('g0'); }); await done(r, 'g0'); await adv(pg, 1000);
    await f.evaluate(() => document.querySelector('[data-fk="mkslw:g0:0:b"]').click()); await adv(pg, 1000);
    const busy = await f.evaluate(() => MK_UP.g0 || '');
    await f.evaluate(() => document.querySelector('[data-fk="mkslw:g0:0:g"]').click()); await adv(pg, 300);
    const shown = await f.evaluate(() => (document.querySelector('[data-fk="mkslw:g0:0:g"]') || {}).getAttribute('aria-checked'));
    await shot(r, '31-g0-busy-press', 'g0');
    await until(pg, f, () => !MK_UP.g0 && !VC_MKP.g0 && !(VC.whoPend || {}).g0 && S.up.g0 && S.up.g0.by === 'groom' && _vcLineWho('g0') === 'groom', 120000); await adv(pg, 2000);
    const a = await line(f, 'g0');
    ok('#31 [WHO_BUSY] 만드는 중에 누른 «신랑» — 칸은 바로 신랑으로 켜 보이고 · 끝나면 신랑 소리로(다시 누르지 않음)', !!busy && shown === 'true' && a.who === 'groom' && a.by === 'groom' && !a.stale && a.mode === 'keep' && !a.err && !r.errs.length, JSON.stringify({ busy, shown, a, errs: r.errs.slice(0, 2) }));
    await r.ctx.close();
  },
  /* #33 — g0 에 줄을 더해 두 분이 나눠 읽게 만든 뒤 · 더한 줄을 뺀다 / 글을 고쳤다가 예시 글로 되돌린다 */
  async '33'() {
    const r = await open({ page: 'guest' }); const { pg, f } = r;
    await until(pg, f, () => !(VC.fill && VC.fill.doing) && !!(S.up.g0 && S.up.g0.src === 'ai') && !MK_UP.g0, 400000); await adv(pg, 1000);   // 처음 채우기(예시 글)가 끝난 판 — 채우는 중이면 FILL_EX 가 지금 글로 끝까지 채운다(설계)
    await f.evaluate(() => { mkSlAdd('g0'); mkSlText('g0', 1, '신부가 읽는 둘째 줄입니다.'); render(); mkAiGo('g0'); }); await done(r, 'g0'); await adv(pg, 1500);
    const n0 = await mkN(pg, 'g0'); await f.evaluate(() => mkSlDel('g0', 1)); await adv(pg, 300);
    const m1 = await f.evaluate(() => _aiMode('g0')); await shot(r, '33-g0-line-removed', 'g0');
    await adv(pg, 3000); const a = await line(f, 'g0'), n1 = await mkN(pg, 'g0');
    ok('#33 [EX_BACK → EX_PRESS_MAKE 2026-10-08] 더한 줄을 빼 예시 글로 돌아오면 — 기억에 든 소리를 바로 붙이지 않는다 · «목소리 만들기» · 서버에 묻지 않음', m1 === 'need' && a.mode === 'need' && /목소리 만들기/.test(a.pill) && n1 === n0, JSON.stringify({ m1, a, n0, n1 }));
    const ex = await f.evaluate(() => _recNeed('g0'));
    await f.locator('[data-fk="mksl:g0:0"]').fill('잠깐 고쳐 본 글입니다.'); await f.evaluate(() => document.activeElement && document.activeElement.blur()); await adv(pg, 1200);
    await f.evaluate(() => mkAiGo('g0')); await done(r, 'g0'); await adv(pg, 1500);   // 고친 글로 소리를 만든 판(소리 = 고친 글 · 이 기기 기억엔 예시 글 소리)
    const n1b = await mkN(pg, 'g0');
    await f.locator('[data-fk="mksl:g0:0"]').fill(ex); await f.evaluate(() => document.activeElement && document.activeElement.blur()); await adv(pg, 400);
    const m2 = await f.evaluate(() => _aiMode('g0'));
    await adv(pg, 3000); const b = await line(f, 'g0'), n2 = await mkN(pg, 'g0');
    ok('#33 [EX_PRESS_MAKE] 고친 글로 만든 줄을 예시 글로 다시 적고 칸을 나오면 — 글만 · «목소리 만들기» · 서버에 묻지 않음', m2 === 'need' && b.mode === 'need' && /목소리 만들기/.test(b.pill) && n2 === n1b && !r.errs.length, JSON.stringify({ m2, b, n1b, n2, errs: r.errs.slice(0, 2) }));
    await r.ctx.close();
  },
};

const PAR = Math.max(1, Number(process.env.PAR || 4));   // 장면은 서로 다른 창(context · 가짜 시계)이라 함께 돌려도 된다 — 야간 러너 시간 한도(300초) 안에
const todo = Object.entries(SCENES).filter(([nm]) => !ONLY.length || ONLY.includes(nm)); let qi = 0;
await Promise.all(Array.from({ length: Math.min(PAR, todo.length) }, async () => { while (qi < todo.length) { const [nm, fn] = todo[qi++];
  try { await fn(); } catch (e) { ok(`#${nm} — 재다가 멈췄다`, false, String(e && e.stack || e).split('\n').slice(0, 3).join(' | ')); } } }));
await br.close(); srv.close();
console.log(fail ? `\nVC R1 MIX FAIL ${fail}` : '\nVC R1 MIX OK'); process.exit(fail ? 1 : 0);
