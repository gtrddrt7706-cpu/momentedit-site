#!/usr/bin/env node
/* ★★[VC_R1_EX 2026-10-08 목소리 1라운드 «ex · 참고 예시 칩»] 진짜 마이페이지(mypage.html) + 진짜 식순 화면(order-preview.html · iframe) + 가짜 GAS + 가짜 시계.
   ex-promise.mjs 는 마이페이지 없이(올리기 · 채우기 없이) 돌아 아래 구멍을 못 봤다 — 이 검사는 «올리는 중 · 만드는 중»까지 실제 길로 잰다.
   장면(고친 항목마다 하나 · 번호는 1라운드 목록):
     upload  34 [EX_BUSY_LINE] «다정하게» 소리를 조용히 올리는 중에 «유쾌하게» → 바로 «준비 중» · «목소리 만들기» 없이 · 끝은 네 줄 «확정하기»(새 글) · 올리기 5초 · 15초(새 글 소리가 먼저 다 됨) 둘 다
     fill    34 [EX_BUSY_LINE] «AI 두 분 목소리»로 빈 줄을 채우는 중에 «유쾌하게» → 채우던 줄도 «준비 중» → «확정하기» · 1초 뒤 채우던 글로 되돌아와도 그 일을 잇는다
     fillEP  34 [EX_BUSY_LINE] 입장 인사 · 식전 영상 소개를 채우는 중에 멘트 · 소개 칩 → 둘 다 «확정하기»
     deleted 34 대조 [EX_PREBAKE] 고객이 지운 빈 줄은 칩을 눌러도 빈 줄 그대로
     dup     35 [EX_ONE_ASK] 새 탭 · 데우기가 묻는 중에 «다정하게» / 입장 멘트 칩 → 같은 열쇠(목소리 · 빠르기 · 쉼 · 글)를 서버에 겹쳐 묻는 수 0
     tap     36 [PREP_NO_TAP] «준비 중» 알약을 좌표로 탭 → «만드는 중»이 되지 않고 앞에서 따로 묻지 않는다
     ask     37 [EX_ASK_ONE] 확정만 한 줄 — 하객 맞이 · 식전 영상 · 입장 인사가 같은 말(«확정한 소리…»)로 묻는다 · «그대로 두기»면 확정 그대로 · 글이 그대로인 칩은 묻지 않고 확정도 안 푼다
     old     39 [VU_OLD_EX] 옛 예시 글(10/6) 고객 — 식전 영상 칩이 켜지고 · «나오는 곳» 창에 «두 분 글» 없음 · «예시 글이에요» 줄
     fillbar 40 [PREP_FILL] «준비 중» ▶ 차오름 = 그 일의 시계(어림 · 누른 때) · 붙여 올릴 때 같은 시계 · 같은 탭 두 번째 예시도 0 부터 · 이름 «준비 중»
     side    41 [SIDE_TWO_LINE] 옆글 — 폰(360 · 390)은 모든 카드 두 줄(낱말 단위) · 제목과 안 겹침 · 320 은 단추 아래 한 줄 · 1280 은 한 줄
   ONLY=<장면,…> · SHOTS=<폴더> 면 화면을 찍는다 · R1_OP=<order-preview.html 경로> 면 그 판을 잰다(돌연변이 검사)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os'; import { createRequire } from 'node:module'; import { execFile } from 'node:child_process'; import crypto from 'node:crypto';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.R1_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = OP && u === '/order-preview.html' ? OP : path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 진짜 글꼴(Noto Sans KR) — 바깥 요청을 빈 답으로 막으면 더 넓은 대체 글꼴로 그려 옆글 폭이 6px 쯤 틀린다(1라운드 41 검증). curl(프록시)로 받아 이 기기 임시 폴더에 둔다 · 못 받으면 대체 글꼴로 재고 그렇다고 적는다 */
const FC = path.join(os.tmpdir(), 'me-fontcache'); fs.mkdirSync(FC, { recursive: true }); let FONT_OK = 0, FONT_ERR = 0;
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';
async function fontGet(u) { const fp = path.join(FC, crypto.createHash('sha1').update(u).digest('hex')); if (fs.existsSync(fp) && fs.statSync(fp).size > 0) return fs.readFileSync(fp);
  await new Promise((res, rej) => execFile('curl', ['-sS', '--fail', '--max-time', '20', '-A', UA, '-o', fp, u], (e) => (e ? rej(e) : res()))); return fs.readFileSync(fp); }

/* 가짜 GAS — vc-sim 과 같은 규칙: 저장본 열쇠 = 목소리 | 빠르기 | 쉼 | 글 · 저장본이 있으면 빨리 · 없으면 업체(느리게) · 잠금 없음(진짜 서버도 없다).
   «같은 열쇠가 서버에서 아직 도는 중에 또 도착» = 진짜 서버도 업체를 두 번 부른다 → dup 으로 센다(1라운드 35) */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const SV = window.__SV = { st: { groom: { consent: 1, voiceId: 'v-groom-1', tries: 1 }, bride: { consent: 1, voiceId: 'v-bride-1', tries: 1 } }, cache: {}, infl: {}, files: {}, mk: [], dup: [] };
  const LAT = Object.assign({ status: 1200, make: 9000, makeHit: 1500, ritualFile: 4000 }, cfg.lat || {});
  const pub = (p) => ({ consent: !!p.consent, ready: !!p.voiceId, tries: p.tries || 0, left: 3, made: '2026-10-07 10:00' });
  const tN = (v) => { let x = parseFloat(v); if (!isFinite(x)) x = 1; x = Math.min(1.5, Math.max(0.5, x)); return Math.round(x * 20) / 20; };
  const pN = (v) => { const x = parseInt(v, 10); return [150, 350, 600, 900].indexOf(x) > -1 ? x : 150; };
  SV.keyOf = (b) => { const lines = Array.isArray(b.lines) ? b.lines : [[b.one || '', b.text]];
    return lines.map((l) => { const w = l[0] === 'bride' ? 'bride' : 'groom', t = String(l[1] || '').trim(); return { who: w, text: t, k: SV.st[w].voiceId + '|' + tN(b.tempo) + '|' + pN(b.pause) + '|' + t }; }).filter((x) => x.text); };
  const js = (x, ms) => new Promise((res) => setTimeout(() => res(new Response(JSON.stringify(x()), { status: 200, headers: { 'Content-Type': 'application/json' } })), ms));
  const real = window.fetch.bind(window);
  window.fetch = function (url, o) {
    if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    const op = b.action === 'voiceClone' ? b.op : b.action;
    if (op === 'status') return js(() => ({ ok: true, on: true, tts: true, groom: pub(SV.st.groom), bride: pub(SV.st.bride), total: 0, left: 99999 }), LAT.status);
    if (op === 'make') { const ks = SV.keyOf(b), fresh = ks.filter((x) => !SV.cache[x.k]);
      fresh.forEach((x) => { if (SV.infl[x.k] > 0) SV.dup.push(b.key + ':' + x.who + ':' + x.text.slice(0, 10)); SV.infl[x.k] = (SV.infl[x.k] || 0) + 1; });
      const rec = { t: Date.now(), key: b.key, bg: !!b.bg, tx: ks.map((x) => x.text.slice(0, 10)).join('/'), fresh: fresh.length, end: 0 }; SV.mk.push(rec);
      if (cfg.busy) return js(() => { rec.end = Date.now(); fresh.forEach((x) => { SV.infl[x.k]--; }); return { ok: false, down: true, kind: 'busy', http: 429, ecode: 'V1', error: '요청이 몰렸어요 (코드 V1)' }; }, 600);
      return js(() => { rec.end = Date.now(); fresh.forEach((x) => { SV.cache[x.k] = 1; SV.infl[x.k]--; }); return { ok: true, key: b.key, parts: ks.map((x) => ({ who: x.who, mime: 'audio/mpeg', data: cfg.mp3 })), total: 1, left: 99999 }; }, fresh.length ? LAT.make : LAT.makeHit); }
    if (op === 'ritualFile') return js(() => { SV.files[b.key] = (SV.files[b.key] || 0) + 1; return { ok: true, name: b.name, id: 'f-' + b.key + '-' + SV.files[b.key], at: '방금' }; }, LAT.ritualFile);
    if (op === 'ritualFileDel') return js(() => ({ ok: true }), 800);
    if (op === 'getMyState') return js(() => ({ ok: false, reason: 'none' }), 300);
    return js(() => ({ ok: true }), 300);
  };
};

async function frame(pg) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function adv(pg, ms, step = 250) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(3); } }
async function until(pg, f, fn, max = 240000, step = 250, arg) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn, arg).catch(() => false)) return t; await pg.clock.runFor(step); await wait(3); } return -1; }

/* 한 판 열기 — o.mode 'ai' = 세 순간 AI · «담백하게»(지금 글) 소리를 이미 들고 있다(서버에도 저장본) / 'nar' = 스튜디오 나레이션(빈 줄) · o.fresh = 서버 저장본 없음(새 탭 · dup 장면) */
async function open(o) {
  o = o || {}; const W = o.w || 390;
  const ctx = await br.newContext({ viewport: { width: W, height: 844 }, hasTouch: W < 1000, deviceScaleFactor: o.dpr || 1 });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3: MP3, lat: o.lat || {}, busy: !!o.busy });
  await ctx.route('**/*', async (rt) => { const u = rt.request().url(); if (u.startsWith(BASE)) return rt.continue();
    if (o.font && /^https:\/\/fonts\.(googleapis|gstatic)\.com\//.test(u)) { try { const b = await fontGet(u); FONT_OK++; return rt.fulfill({ status: 200, body: b, headers: { 'Content-Type': /googleapis/.test(u) ? 'text/css' : 'font/woff2', 'Access-Control-Allow-Origin': '*' } }); } catch (e) { FONT_ERR++; } }
    return rt.fulfill({ status: 200, body: '' }); });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await adv(pg, 1500);
  const f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  if (await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function' && typeof _exFirst === 'function', 20000) < 0) throw new Error('식순 화면이 준비되지 않았다');
  const keys = await f.evaluate((o) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true;
    S.up = {}; const out = [];
    if (o.mode === 'nar') { S.guestVoice = S.entryVoice = S.pvVoice = 'nar'; S.vfill = {}; }
    else { S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.pvText = PV_EX[0][1];
      VC.st = { ok: true, groom: { ready: true }, bride: { ready: true } };   // 열쇠 계산용 · 아래에서 비운다(서버에서 받는다)
      ['g0', 'g1', 'g2', 'g3', 'pv', 'entry'].forEach((k) => { const sn = _vcSnap(k, {}), w = _vcLineWho(k);
        S.up[k] = { n: 'AI', id: 'f-' + k + '-0', at: '', src: 'ai', by: sn.mx ? ['groom', 'bride'] : w, tempo: sn.tempo, pause: sn.pause, tx: _txSig(sn.t), wq: sn.wq, tq: sn.tq, pf: sn.mx ? LINE_EVEN_V : undefined };
        out.push({ text: sn.t, tempo: sn.tempo, pause: sn.pause, one: sn.mx ? '' : w, lines: sn.lines }); });
      VC.st = null; }
    try { _persist(); } catch (e) {}
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; }
    return out; }, o);
  if (!o.fresh) await pg.evaluate((keys) => { keys.forEach((b) => __SV.keyOf(b).forEach((x) => { __SV.cache[x.k] = 1; })); }, keys);
  await f.evaluate(() => { _vcStatus(null, true); }); await adv(pg, 2500);
  return { ctx, pg, f, errs };
}
const G = ['g0', 'g1', 'g2', 'g3'];
const MODES = (f, ks) => f.evaluate((ks) => ks.map((k) => _aiMode(k)), ks);
const FRESH = (f, ks) => f.evaluate((ks) => ks.every((k) => { const u = (S.up || {})[k]; return !!(u && typeof u === 'object' && u.src === 'ai' && u.tx === _txSig(_recNeed(k))); }), ks);
const chip = async (f, sel) => { await f.evaluate((sel) => { const b = document.querySelector(sel); if (b) b.scrollIntoView({ block: 'center' }); }, sel); await f.click(sel); };
/* 시간 흐름 동안 줄마다 모드를 모은다 — «목소리 만들기»(need)가 한 번이라도 떴나 */
async function trace(pg, f, ks, ms, step = 500) { const seen = {}; ks.forEach((k) => { seen[k] = []; });
  for (let t = 0; t <= ms; t += step) { const m = await MODES(f, ks); ks.forEach((k, i) => { const a = seen[k]; if (a[a.length - 1] !== m[i]) a.push(m[i]); }); if (t < ms) { await pg.clock.runFor(step); await wait(3); } }
  return seen; }
const shot = async (pg, f, nm) => { if (!SHOTS) return; await f.evaluate(() => { const e = document.querySelector('.mk-vcards'); if (e) e.scrollIntoView({ block: 'start' }); }); await pg.clock.runFor(50); await pg.screenshot({ path: path.join(SHOTS, nm + '.png') }); };

const SC = {
  /* 34 — 올리는 중 다른 예시 · 올리기가 느리면(15초) 새 글 소리가 먼저 다 되어 «올리기가 끝난 자리»(_mkUpDone → _exAgain)에서 붙어야 한다 */
  async upload() { await SC._upload({ ritualFile: 5000 }, ''); await SC._upload({ ritualFile: 15000 }, ' · 올리기 15초'); },
  async _upload(lat, tag) {   // 장면이 아니라 upload 의 몸통(밑줄 이름은 장면 목록에서 빠진다)
    const { ctx, pg, f, errs } = await open({ mode: 'ai', lat });
    await f.evaluate(() => mkGo('guest')); await adv(pg, 600);
    await chip(f, '[data-fk="mkex:guest:1"]'); await adv(pg, 250);
    const t0 = await until(pg, f, () => !!MK_UPQ.g1 && !!MK_UP.g1, 60000);   // 신부 줄(g1)이 «다정하게» 소리를 올리기 시작한 순간
    await chip(f, '[data-fk="mkex:guest:2"]'); await adv(pg, 300);
    const a = await MODES(f, G); await shot(pg, f, 'upload-1-누른직후');
    const tr = await trace(pg, f, G, 90000); const b = await MODES(f, G), fr = await FRESH(f, G); await shot(pg, f, 'upload-2-끝' + tag.replace(/\W+/g, ''));
    const need = G.filter((k) => tr[k].includes('need')), early = G.filter((k) => tr[k].indexOf('keep') > -1 && tr[k].indexOf('keep') !== tr[k].length - 1);   // early = 새 글 소리가 붙기 전에 «확정하기»(옛 소리)가 떴다 사라짐
    ok('34 upload' + tag + ' — «다정하게» 소리를 올리는 중에 «유쾌하게» → 바로 «준비 중»(옛 소리 «확정하기»가 아니라) [EX_BUSY_LINE]', t0 >= 0 && a.every((m) => m === 'prep' || m === 'keep') && a.filter((m) => m === 'prep').length >= 3, JSON.stringify({ t0, a }));
    ok('34 upload' + tag + ' — 90초 동안 «목소리 만들기» 0 · «확정하기»는 새 글 소리가 붙을 때 한 번 · 끝은 네 줄 «확정하기» · 소리 = 새 글 · 화면 오류 0', !need.length && !early.length && b.every((m) => m === 'keep') && fr && !errs.length, JSON.stringify({ need, early, tr, b, fr, errs: errs.slice(0, 2) }));
    await ctx.close(); },
  /* 34 — 빈 줄을 채우는 중에 예시 */
  async fill() { await SC._fill(false); await SC._fill(true); },   // back = «유쾌하게» 뒤 1초 만에 채우던 글(«담백하게»)로 되돌아온다(사장님이 칩을 빠르게 오가는 사례 · EX_RACE)
  async _fill(back) { const { ctx, pg, f, errs } = await open({ mode: 'nar' }), tag = back ? ' · 되돌아옴' : '';
    await f.evaluate(() => mkGo('guest')); await adv(pg, 600);
    await f.evaluate(() => { mkVsOpen(); }); await adv(pg, 300);
    if (await f.evaluate(() => !!document.querySelector('[data-fk="mkvs:ai"]'))) await f.click('[data-fk="mkvs:ai"]'); else await f.evaluate(() => mkVsPick('ai'));
    await adv(pg, 400); await f.evaluate(() => { if (typeof mkVsClose === 'function') mkVsClose(); }); await adv(pg, 300);
    const t0 = await until(pg, f, () => MK_UP.g0 === 'make', 60000);
    await chip(f, '[data-fk="mkex:guest:2"]'); await adv(pg, 300);
    if (back) { await adv(pg, 1000); await chip(f, '[data-fk="mkex:guest:0"]'); await adv(pg, 300); }
    const a = await MODES(f, ['g0', 'g1']); await shot(pg, f, 'fill-1-누른직후' + (back ? '-되돌아옴' : ''));
    const tr = await trace(pg, f, G, 120000); const b = await MODES(f, G), fr = await FRESH(f, G); await shot(pg, f, 'fill-2-끝' + (back ? '-되돌아옴' : ''));
    const need01 = ['g0', 'g1'].filter((k) => tr[k].includes('need'));
    ok('34 fill' + tag + ' — 채우던 빈 줄(만드는 중)에서 예시를 누르면 «준비 중» · 채우던 글로 돌아오면 그 일을 잇는다(«만드는 중») [EX_BUSY_LINE]', t0 >= 0 && a[0] === (back ? 'make' : 'prep'), JSON.stringify({ t0, a }));
    ok('34 fill' + tag + ' — 채우던 줄에 «목소리 만들기» 0 · 2분 안에 네 줄 «확정하기» · 소리 = 새 글 · 화면 오류 0', !need01.length && b.every((m) => m === 'keep') && fr && !errs.length, JSON.stringify({ need01, tr, b, fr, errs: errs.slice(0, 2) }));
    await ctx.close(); },
  /* 34 — 입장 인사 · 식전 영상 소개를 채우는 중에 칩 */
  async fillEP() { const { ctx, pg, f, errs } = await open({ mode: 'nar' });
    await f.evaluate(() => mkGo('entry')); await adv(pg, 600);
    await f.evaluate(() => { mkVsOpen(); mkVsPick('ai'); mkVsClose(); }); await adv(pg, 300);
    const te = await until(pg, f, () => MK_UP.entry === 'make', 120000);
    await chip(f, '[data-fk="mkex:entry:2"]'); await adv(pg, 300); const a = await MODES(f, ['entry']);
    const tp = await until(pg, f, () => MK_UP.pv === 'make', 120000);
    await f.evaluate(() => mkGo('prevideo')); await adv(pg, 300);
    await chip(f, '[data-fk="mkex:pv:2"]'); await adv(pg, 300); const a2 = await MODES(f, ['pv']);
    const tr = await trace(pg, f, ['entry', 'pv'], 120000); const b = await MODES(f, ['entry', 'pv']), fr = await FRESH(f, ['entry', 'pv']); await shot(pg, f, 'fillEP-끝');
    ok('34 fillEP — 채우는 중 입장 멘트 · 소개 칩 → «준비 중» → 둘 다 «확정하기» · 소리 = 새 글 [EX_BUSY_LINE]', te >= 0 && tp >= 0 && a[0] === 'prep' && a2[0] === 'prep' && b.every((m) => m === 'keep') && fr && !tr.pv.slice(1).includes('need') && !errs.length, JSON.stringify({ te, tp, a, a2, tr, b, fr, errs: errs.slice(0, 2) }));
    await ctx.close(); },
  /* 34 대조 — 고객이 지운 빈 줄 */
  async deleted() { const { ctx, pg, f, errs } = await open({ mode: 'ai' });
    await f.evaluate(() => { S.up.g1 = 0; _persist(); mkGo('guest'); });   // 지우기 단추와 같은 모양(_mkUpDrop · S.up[k]=0) await adv(pg, 600);
    await chip(f, '[data-fk="mkex:guest:2"]'); await adv(pg, 60000);
    const r = await f.evaluate(() => ({ g1: (S.up || {}).g1 || null, m: ['g0', 'g1', 'g2', 'g3'].map((k) => _aiMode(k)) }));
    const fr = await FRESH(f, ['g0', 'g2', 'g3']);
    ok('34 deleted — 고객이 지운 빈 줄은 칩을 눌러도 빈 줄 그대로 · 나머지 셋은 «확정하기» [EX_PREBAKE]', !r.g1 && r.m[1] === 'need' && [0, 2, 3].every((i) => r.m[i] === 'keep') && fr && !errs.length, JSON.stringify({ r, fr }));
    await ctx.close(); },
  /* 35 — 같은 글을 두 번 묻지 않는다 */
  async dup() { { const { ctx, pg, f, errs } = await open({ mode: 'ai', fresh: true });
      await f.evaluate(() => mkGo('guest')); await adv(pg, 4000);
      await chip(f, '[data-fk="mkex:guest:1"]'); await adv(pg, 300);
      const t = await until(pg, f, () => ['g0', 'g1', 'g2', 'g3'].every((k) => _aiMode(k) === 'keep' && !MK_UP[k]), 120000);
      await adv(pg, 240000, 1000); const d = await pg.evaluate(() => ({ dup: __SV.dup.slice(), n: __SV.mk.length }));
      ok('35 dup — 새 탭 · 데우기가 묻는 중에 «다정하게» → 네 줄 «확정하기» · 같은 열쇠를 서버에 겹쳐 묻는 수 0 [EX_ONE_ASK]', t >= 0 && !d.dup.length && !errs.length, JSON.stringify({ t, d }));
      await ctx.close(); }
    { const { ctx, pg, f, errs } = await open({ mode: 'ai', fresh: true });
      await f.evaluate(() => mkGo('entry')); let tx = null, n = -1;   // 데우기 차례가 «지금 멘트가 아닌» 멘트를 업체에 묻고 있는 순간을 찾는다
      const nOf = (tx) => f.evaluate((tx) => { const e0 = S.entry; let hit = -1; ENTRY_KEYS.forEach((v, i) => { if (!ENTRY[v] || hit > -1 || v === e0) return; S.entry = v; const sn = _vcSnap('entry', {}); S.entry = e0; if (sn.lines && sn.lines.map((l) => String(l[1]).trim().slice(0, 10)).join('/') === tx) hit = i; }); return hit; }, tx);
      for (let i = 0; i < 600 && n < 0; i++) { await pg.clock.runFor(500); await wait(3); tx = await pg.evaluate(() => { const m = __SV.mk.filter((x) => x.key === 'entry' && x.fresh > 0 && x.bg && !x.end).pop(); return m ? m.tx : null; }); if (tx) n = await nOf(tx); }
      if (n >= 0) await chip(f, `[data-fk="mkex:entry:${n}"]`); await adv(pg, 300); const a = await MODES(f, ['entry']);
      const t = await until(pg, f, () => _aiMode('entry') === 'keep' && !MK_UP.entry, 120000); await adv(pg, 120000, 1000);
      const d = await pg.evaluate(() => __SV.dup.slice());
      ok('35 dup — 입장 인사 · 데우는 중인 멘트 칩 → «준비 중» → «확정하기» · 겹쳐 묻는 수 0 [EX_ONE_ASK]', n >= 0 && a[0] === 'prep' && t >= 0 && !d.length && !errs.length, JSON.stringify({ tx, n, a, t, d }));
      await ctx.close(); } },
  /* 36 — «준비 중» 알약 탭 */
  async tap() { const { ctx, pg, f, errs } = await open({ mode: 'ai', fresh: true });
    await f.evaluate(() => mkGo('guest')); await adv(pg, 800);
    await f.evaluate(() => mkGuestEx(1)); await adv(pg, 500);
    await f.evaluate(() => { const b = document.querySelector('.mk-aip[data-key="g0"]'); b.scrollIntoView({ block: 'center' }); }); await adv(pg, 200);
    const pre = await f.evaluate(() => ({ m: _aiMode('g0'), dis: (document.querySelector('.mk-aip[data-key="g0"]') || {}).getAttribute('aria-disabled') }));
    const n0 = await pg.evaluate(() => __SV.mk.filter((m) => m.key === 'g0' && !m.bg).length);
    const bb = await (await f.$('.mk-aip[data-key="g0"]')).boundingBox(); await pg.touchscreen.tap(bb.x + bb.width / 2, bb.y + bb.height / 2); await adv(pg, 300);
    await pg.mouse.click(bb.x + bb.width / 2, bb.y + bb.height / 2); await adv(pg, 300);
    const post = await f.evaluate(() => ({ m: _aiMode('g0'), up: MK_UP.g0 || '' }));
    const t = await until(pg, f, () => ['g0', 'g1', 'g2', 'g3'].every((k) => _aiMode(k) === 'keep' && !MK_UP[k]), 120000);
    const fg = await pg.evaluate(() => __SV.mk.filter((m) => m.key === 'g0' && !m.bg).length) - n0;
    ok('36 tap — «준비 중»(aria-disabled) 알약을 좌표로 탭 · 클릭해도 «만드는 중»이 되지 않고 · 앞에서 따로 묻지 않는다 · 끝은 «확정하기» [PREP_NO_TAP]', pre.m === 'prep' && pre.dis === 'true' && post.m === 'prep' && post.up !== 'make' && fg === 0 && t >= 0 && !errs.length, JSON.stringify({ pre, post, fg, t }));
    await ctx.close(); },
  /* 37 — 확정만 한 줄의 묻기 */
  async ask() { const { ctx, pg, f, errs } = await open({ mode: 'ai' });
    const ASK = () => { const o = document.querySelector('.ord-ask'); return o ? ((o.querySelector('.oa-t') || {}).textContent || '') + ' / ' + ((o.querySelector('.oa-d') || {}).textContent || '') : ''; };
    const no = async () => { await f.evaluate(() => { const b = document.querySelector('.ord-ask .oa-no'); if (b) b.click(); }); await adv(pg, 600); };
    const r = {};
    await f.evaluate(() => mkGo('guest')); await adv(pg, 600); await f.evaluate(() => mkKeep('g0')); await adv(pg, 200);
    await chip(f, '[data-fk="mkex:guest:2"]'); await adv(pg, 400); r.guest = await f.evaluate(ASK); if (SHOTS) { await wait(600); await pg.screenshot({ path: path.join(SHOTS, 'ask-하객.png') }); } await no(); r.guestKeep = await f.evaluate(() => !!(S.vkeep || {}).g0 && !S.gExC);
    await f.evaluate(() => mkGo('prevideo')); await adv(pg, 600); await f.evaluate(() => mkKeep('pv')); await adv(pg, 200);
    await chip(f, '[data-fk="mkex:pv:0"]'); await adv(pg, 400); r.pvSame = await f.evaluate(ASK); r.pvSameKeep = await f.evaluate(() => !!(S.vkeep || {}).pv);   // 지금 글과 같은 칩 — 묻지 않고 확정도 그대로
    await chip(f, '[data-fk="mkex:pv:2"]'); await adv(pg, 400); r.pv = await f.evaluate(ASK); await no(); r.pvKeep = await f.evaluate(() => !!(S.vkeep || {}).pv && S.pvText === PV_EX[0][1]);
    await f.evaluate(() => mkGo('entry')); await adv(pg, 600); await f.evaluate(() => mkKeep('entry')); await adv(pg, 200);
    await chip(f, '[data-fk="mkex:entry:2"]'); await adv(pg, 400); r.entry = await f.evaluate(ASK); if (SHOTS) { await wait(600); await pg.screenshot({ path: path.join(SHOTS, 'ask-입장.png') }); } await no(); r.entryKeep = await f.evaluate(() => !!(S.vkeep || {}).entry);
    await chip(f, '[data-fk="mkex:entry:2"]'); await adv(pg, 400); await f.evaluate(() => { const b = document.querySelector('.ord-ask .oa-yes'); if (b) b.click(); }); await adv(pg, 600); r.entryYes = await f.evaluate(() => !(S.vkeep || {}).entry && S.entry === ENTRY_KEYS[2]);
    const keepAsk = (s) => /^확정한 소리(예요|가 있어요) \/ 예시를 바꾸면 (이 줄을|확정한 줄도) 새로 만들어요$/.test(s) && !/적어 둔/.test(s);
    ok('37 ask — 확정만 한 줄 · 하객 맞이 · 식전 영상 · 입장 인사가 같은 말(«확정한 소리…»)로 묻는다 · «적어 둔 글» 아님 [EX_ASK_ONE]', keepAsk(r.guest) && keepAsk(r.pv) && keepAsk(r.entry), JSON.stringify(r));
    ok('37 ask — «그대로 두기»면 확정 · 글 그대로 · «예시로 바꾸기»면 확정이 풀리고 새 예시 · 글이 그대로인 칩은 묻지 않고 확정도 안 푼다 · 화면 오류 0', r.guestKeep && r.pvKeep && r.entryKeep && r.entryYes && !r.pvSame && r.pvSameKeep && !errs.length, JSON.stringify(r));
    await ctx.close(); },
  /* 39 — 옛 예시 글 고객 */
  async old() { const { ctx, pg, f, errs } = await open({ mode: 'ai' });
    await f.evaluate(() => { VC.st = VC.st || { ok: true, groom: { ready: true }, bride: { ready: true } }; S.gExC = 1; delete S.vtext; delete S.exOld; delete S.vlines; S.pvText = PV_OLD['1'][0];
      ['g0', 'g1', 'g2', 'g3', 'pv'].forEach((k, gi) => { const t = k === 'pv' ? S.pvText : [].concat(EX_OLD_1006['1'][String(gi)])[0]; S.up[k] = Object.assign({}, S.up[k], { tx: _txSig(t) }); });
      _exKeep1006(); _persist(); mkGo('prevideo'); }); await adv(pg, 1000);
    const pv = await f.evaluate(() => [...document.querySelectorAll('[data-fk^="mkex:pv:"]')].map((b) => b.getAttribute('aria-checked') || b.getAttribute('aria-pressed')).join(','));
    await f.evaluate(() => mkGo('_voice')); await adv(pg, 2000); const rows = await f.evaluate(() => _vcUseRows().map((x) => x[0])); const vu = {};
    for (const key of ['g0', 'pv']) { const i = rows.indexOf(key); if (i < 0) { vu[key] = null; continue; } await f.evaluate((i) => mkUseOpen(i), i); await adv(pg, 800);
      vu[key] = await f.evaluate(() => ({ chips: [...document.querySelectorAll('.mk-vu-ex')].map((b) => b.textContent.trim() + (b.getAttribute('aria-checked') === 'true' ? '*' : '')).join('|'), note: !!document.querySelector('.mk-vu-exn') }));
      if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, 'old-창-' + key + '.png') }); await f.evaluate(() => { MK.use = null; render(); }); await adv(pg, 300); }
    const good = (v) => v && !/두 분 글/.test(v.chips) && /다정하게\*/.test(v.chips) && v.note;
    ok('39 old — 옛 예시 글(10/6) 고객 · 식전 영상 칩 «다정하게» 켜짐 · «나오는 곳» 창에 «두 분 글» 없이 «다정하게» 골라짐 · «예시 글이에요» 줄 [VU_OLD_EX]', pv === 'false,true,false,false' && good(vu.g0) && good(vu.pv) && !errs.length, JSON.stringify({ pv, vu }));
    await ctx.close(); },
  /* 40 — «준비 중» ▶ 차오름 시계 */
  async fillbar() { const { ctx, pg, f, errs } = await open({ mode: 'ai', fresh: true, lat: { make: 8000, ritualFile: 1500 } });
    await f.evaluate(() => mkGo('guest')); await adv(pg, 800);
    const RD = () => ['g0', 'g1', 'g2', 'g3'].map((k) => { const b = document.querySelector('[data-fk="mkvpl:' + k + '"]'), s = (b && b.getAttribute('style')) || '', m = /--d:([\d.]+)s;--dl:(-[\d.]+)s/.exec(s), j = VC_ALTF[k];
      return { k, mode: _aiMode(k), d: m ? +m[1] : null, dl: m ? +m[2] : null, jd: j && j.d ? +j.d.toFixed(1) : null, at: (WF['up:' + k] || {}).at || null, jat: j ? j.at : null, aria: b ? b.getAttribute('aria-label') : '' }; });
    await f.evaluate(() => mkGuestEx(1)); await adv(pg, 250); const a = await f.evaluate(RD);
    const at0 = a.map((x) => x.at), brk = []; let seenUp = 0;
    for (let i = 0; i < 160; i++) { await pg.clock.runFor(250); await wait(3); const c = await f.evaluate(RD); c.forEach((x, j) => { if ((x.mode === 'keep' || x.mode === 'prep') && x.at && at0[j] && x.at !== at0[j] && brk.length < 4) brk.push(x.k + ':' + x.mode + ':' + (x.at - at0[j])); }); if (c.some((x) => x.mode === 'keep' && x.d != null)) seenUp++; if (c.every((x) => x.mode === 'keep' && x.d == null)) break; }
    const cont = !brk.length;
    await adv(pg, 25000, 1000); await f.evaluate(() => mkGuestEx(2)); await adv(pg, 250); const b = await f.evaluate(RD);
    const pa = a.filter((x) => x.mode === 'prep'), pb = b.filter((x) => x.mode === 'prep');
    const own = (x) => x.d != null && x.at === x.jat && Math.abs(x.d - x.jd) < 0.11 && x.d > 3.05 && x.dl > -3 && /준비 중/.test(x.aria);   // 데우기를 기다리는 줄은 그 일이 묻기 시작한 때부터(조금 앞) — 그래도 지난 올리기(20초 넘게 전)는 아니다
    ok('40 fillbar — «준비 중» ▶ = 그 일의 시계(길이 = 어림 · 누른 때부터 · «올리기 3초» 아님) · 이름 «준비 중» [PREP_FILL]', pa.length >= 3 && pa.every(own), JSON.stringify(a));
    ok('40 fillbar — 붙여 올릴 때 같은 시계(0 으로 떨어지지 않음) · 같은 탭 두 번째 예시도 0 부터(지난 올리기 시각을 쓰지 않음)', cont && seenUp > 0 && pb.length >= 1 && pb.every(own) && !errs.length, JSON.stringify({ cont, brk, seenUp, b: pb }));
    await ctx.close(); },
  /* 41 — 옆글 줄 수 · 겹침 */
  async side() { const MEAS = () => [...document.querySelectorAll('.mk-vcards > li')].map((li) => { const s = li.querySelector('.mk-vch > .mk-vst-side'); if (!s) return null;
      const t = li.querySelector('.mk-vhd .mk-vn'), pill = li.querySelector('.mk-vch > .mk-aip.on'), h = li.querySelector('.mk-vch'), r = document.createRange(); r.selectNodeContents(s); const rs = [...r.getClientRects()];
      const tops = [...new Set(rs.map((x) => Math.round(x.top)))], rt = document.createRange(); rt.selectNodeContents(t);
      const tn = s.firstChild, tx = s.textContent; let mid = false; if (tn && tn.nodeType === 3) { let pt = null; for (let i = 0; i < tx.length; i++) { const q = document.createRange(); q.setStart(tn, i); q.setEnd(tn, i + 1); const qq = q.getClientRects()[0]; if (!qq) continue; const tp = Math.round(qq.top); if (pt != null && tp > pt + 2 && tx[i - 1] !== ' ' && tx[i] !== ' ') mid = true; pt = tp; } }
      const pr = pill ? pill.getBoundingClientRect() : null, sr = s.getBoundingClientRect();
      return { title: t.textContent.trim(), side: tx.trim(), lines: tops.length, mid, gap: +(Math.min(...rs.map((x) => x.left)) - rt.getBoundingClientRect().right).toFixed(1), below: pr ? sr.top >= pr.bottom - 1 : false, over: h.scrollWidth - h.clientWidth }; }).filter(Boolean);
    const out = {};
    for (const W of [320, 360, 390, 1280]) { const { ctx, pg, f, errs } = await open({ mode: 'ai', busy: true, w: W, font: true, dpr: 2 });
      await f.evaluate(() => mkGo('guest')); await adv(pg, 800); await chip(f, '[data-fk="mkex:guest:1"]'); await adv(pg, 15000);
      await f.evaluate(() => document.fonts.ready.then(() => 0)).catch(() => {}); for (let i = 0; i < 10; i++) { await wait(100); await pg.clock.runFor(50); }
      const m = await f.evaluate(MEAS), fam = await f.evaluate(() => [...document.fonts].some((x) => x.status === 'loaded' && /Noto Sans KR/.test(x.family)));
      if (SHOTS) { await f.evaluate(() => { const e = document.querySelector('.mk-vst-side'); if (e) e.closest('li').scrollIntoView({ block: 'center' }); }); await pg.clock.runFor(50); await pg.screenshot({ path: path.join(SHOTS, 'side-' + W + '.png') }); }
      out[W] = { m, fam, errs: errs.length }; await ctx.close(); }
    const all = (W, fn) => out[W].m.length >= 4 && out[W].m.every(fn) && !out[W].errs;
    console.log('     글꼴: ' + (Object.values(out).every((x) => x.fam) ? 'Noto Sans KR(진짜)' : '대체 글꼴 — 진짜 글꼴을 못 받았다(폭 ±6px)'));
    ok('41 side — 폰(360 · 390) 옆글은 모든 카드 두 줄 · 낱말 가운데서 안 끊김 · 제목과 안 겹침 · 머리 넘침 0 [SIDE_TWO_LINE]', [360, 390].every((W) => all(W, (x) => x.lines === 2 && !x.mid && x.gap >= 4 && x.over <= 0)), JSON.stringify({ 360: out[360].m, 390: out[390].m }));
    ok('41 side — 320 은 단추 아래 한 줄(제목과 안 겹침) · 1280 은 한 줄', all(320, (x) => x.lines === 1 && x.below && x.over <= 0) && all(1280, (x) => x.lines === 1 && x.gap > 0), JSON.stringify({ 320: out[320].m, 1280: out[1280].m.map((x) => x.lines) })); },
};
try { for (const k of Object.keys(SC)) { if (k[0] === '_' || (ONLY.length && !ONLY.includes(k))) continue; try { await SC[k](); } catch (e) { ok(`${k} — 재다가 멈췄다`, false, String(e && e.message || e).split('\n')[0]); } } }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC R1 EX FAIL ${fail}` : '\nVC R1 EX OK'); process.exit(fail ? 1 : 0);
