#!/usr/bin/env node
/* ★★[VC_R1_UPLOAD 2026-10-08 목소리 1라운드 «올리기 · 파일 · 로그인 문구» 묶음]
   진짜 마이페이지(mypage.html · 중계) + 진짜 식순 화면(order-preview.html · iframe) + 가짜 서버(GAS 80_production.gs 와 같은 답 꼴) + 가짜 시계 — vc-sim.mjs 하네스를 본떴다.
   가짜 서버의 ritualFile 은 부를 때마다 새 파일(GAS createFile 그대로) · ritualFileDel 은 GAS 원본 함수(handleRitualFileDel)를 node vm 으로 따로 잰다.
   #26 UP_AGAIN_GEN    끊겨 다시 보내기를 기다리는 사이 새 소리를 보내면 늦은 옛 소리가 덮지 않는다
   #29 · #38 UP_AGAIN_KEEP  올리는 동안 누른 «확정하기»는 다시 보내기 뒤에도 남는다
   #57 RF_DEL_ALL      줄 «지우기»는 그 자리 두 분 파일을 모두(화면 → 중계 → GAS) · 스튜디오 파일은 둔다 · 다시 묻기는 그 파일만
   #59 MINI_OC_KEEP    녹음 줄 ▶ 는 듣고 나도 같은 단추(mkLine)
   #60 UP_EXIT_WAIT    보내는 중 나가기 → 먼저 묻고 · «끝나면 나가기»면 저장된 뒤 나간다
   #61 REC_ERR_WAY     파일 오류 창 = «다른 파일 고르기»(파일 고르는 창이 열린다) · 마이크 오류 창 = «녹음해 둔 파일 올리기»
   #62 EC_ONE_WORD     세 번 다 60초를 넘긴 올리기 = «확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)»
   #32 · #66 · #73 EC_ONE_WORD  로그인 풀림은 자리마다 한 말 «로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요 (코드 X8)»
   #63 UP_TOAST_OWN    다른 줄 녹음 창이 떠 있으면 앞 줄 «보냈어요»가 그 창에 안 뜬다
   #64 UP_FAIL_KEEP    창을 닫은 뒤 끝내 못 보낸 녹음 → 그 줄 아래 «다시 보내기» 한 번에
   #65 UP_PICK_LINE    소리 아닌 파일을 고르면 그 줄 아래
   #67 REC_CLOSE_ASK   녹음 중 × 는 한 번 묻는다
   #74 RF_GONE_REMAKE  서버에 없는 AI 줄 소리 → 머리 «목소리 만들기» · 확정 숨김
   ONLY=<번호,…>  SHOTS=<폴더>  VERBOSE=1  VC_R1_OP=<order-preview.html 경로>(그 판으로 잰다 — 고치기 전 판 확인용)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import vm from 'node:vm'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.VC_R1_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const VERB = !!process.env.VERBOSE; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${(c && !VERB) || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 — 마이페이지 창의 fetch 만 갈아 끼운다. faults: { op, nth|'*', kind: offline|json|'', lat, body } (__SV.faults 로 도중에 바꾼다) */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const SV = window.__SV = { files: {}, log: [], n: {}, faults: cfg.faults || [], get: cfg.get || {} };
  const LAT = Object.assign({ status: 800, make: 3000, ritualFile: 4000, ritualFileGet: 1500, ritualFileDel: 800 }, cfg.lat || {});
  const vp = (w) => ({ consent: true, ready: true, tries: 1, left: 3, made: '2026-10-07 10:00' });
  function handle(b, op) {
    if (op === 'status') return () => ({ ok: true, on: true, tts: true, groom: vp('groom'), bride: vp('bride'), total: 0, left: 99999 });
    if (op === 'make') return () => ({ ok: true, key: b.key, parts: (Array.isArray(b.lines) ? b.lines : [[b.one || 'groom', b.text]]).map((l) => ({ who: l[0] === 'bride' ? 'bride' : 'groom', mime: 'audio/mpeg', data: cfg.mp3 })), total: 1 });
    if (op === 'ritualFile') return () => { const n = (SV.n.saved = (SV.n.saved || 0) + 1), id = 'F' + b.key + 'x' + String(n).padStart(8, '0'); SV.files[id] = { key: b.key, name: b.name }; return { ok: true, key: b.key, id, name: b.name, at: '방금' }; };
    if (op === 'ritualFileGet') return () => { const x = SV.get[b.id]; return x ? { ok: true, key: b.key, id: b.id, mime: 'audio/mpeg', data: cfg.mp3 } : { ok: false, ecode: 'L0', error: '파일을 찾을 수 없어요.' }; };
    if (op === 'ritualFileDel') return () => ({ ok: true, key: b.key, id: b.id });
    if (op === 'getMyState') return () => ({ ok: false, reason: 'none' });
    return () => ({ ok: true });
  }
  const real = window.fetch.bind(window);
  window.fetch = function (url, o) {
    if (!/script\.google\.com/.test(String(url))) return real(url, o);
    let b = {}; try { b = JSON.parse((o && o.body) || '{}'); } catch (e) {}
    const op = b.action === 'voiceClone' ? b.op : b.action; SV.n[op] = (SV.n[op] || 0) + 1; const nth = SV.n[op];
    const f = SV.faults.find((x) => x.op === op && (x.nth == null || x.nth === nth || x.nth === '*')) || null;
    const lat = f && f.lat != null ? f.lat : (LAT[op] || 300), ent = { op, nth, t: Date.now(), f: f ? (f.kind || 'lat') : '', key: b.key || '', id: b.id || '', all: b.all, name: b.name || '' }; SV.log.push(ent);
    const run = handle(b, op);
    return new Promise((resolve, reject) => {
      let settled = false; const sig = o && o.signal;
      const fin = (fn) => { if (settled) return; settled = true; ent.end = Date.now(); fn(); };
      if (sig) { if (sig.aborted) return reject(new DOMException('aborted', 'AbortError')); sig.addEventListener('abort', () => fin(() => reject(new DOMException('aborted', 'AbortError')))); }
      if (f && f.kind === 'offline') { setTimeout(() => fin(() => reject(new TypeError('Load failed'))), 300); return; }   // 보내지도 못함 — 서버는 모른다
      if (f && f.kind === 'json') { setTimeout(() => fin(() => resolve(new Response(JSON.stringify(f.body), { status: 200 }))), lat); return; }
      setTimeout(() => { const res = run(); ent.done = Date.now(); fin(() => resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }))); }, lat);   // 서버는 끝까지 한다(끊겨도 저장)
    });
  };
};

async function frame(pg) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function adv(pg, ms, step = 250) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(4); } }
async function until(pg, f, fn, max = 240000, step = 500, arg) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn, arg).catch(() => false)) return t; await pg.clock.runFor(step); await wait(4); } return -1; }
async function boot(sc) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3: MP3, lat: sc.lat || {}, faults: sc.faults || [], get: sc.get || {} });
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await adv(pg, 1500);
  const f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function', 20000);
  await f.evaluate((ai) => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = !!ai; RitualOpen.FEATURE.practiceTts = !!ai;
    S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = ai ? { guest: 'ai', entry: 'ai', prevideo: 'ai' } : {}; S.pvText = '두 사람의 이야기를 영상으로 준비했습니다.';
    window.__posts = []; const P = parent.postMessage.bind(parent); parent.postMessage = function (m, t) { try { window.__posts.push({ type: m && m.type, at: Date.now() }); } catch (e) {} return P(m, t); };
    for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo('guest'); }, !!sc.ai);
  await adv(pg, 2500);
  if (sc.ai) await until(pg, f, () => !!(VC.st && !VC.loading), 30000);
  return { ctx, pg, f, errs };
}
const blob = (f, key, nm, src, meta) => f.evaluate(([key, nm, src, meta]) => { const b = _recWav(new Float32Array(16000).map((_, i) => Math.sin(i / 9) * 0.2), 16000); _mkSendWav(key, b, URL.createObjectURL(b), src || 'rec', nm, meta || {}); }, [key, nm, src, meta]);
const sv = (pg) => pg.evaluate(() => ({ log: __SV.log.map((x) => x.op + '#' + x.nth + (x.f ? '!' + x.f : '') + (x.all ? '(all)' : '')), files: __SV.files }));
const shot = async (pg, nm) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `vc-r1-up-${nm}.png`) }); };

const SC = [
  /* ── #26 ── */
  { no: 26, faults: [{ op: 'ritualFile', nth: 1, kind: 'offline' }], async run({ pg, f }) {
    await blob(f, 'g0', '다정하게'); await adv(pg, 2000);   // 첫 보내기 끊김 → 8초 뒤 다시 보내기 기다리는 중
    await blob(f, 'g0', '유쾌하게'); await adv(pg, 40000);   // 그 사이 다른 예시를 누름
    const s = await sv(pg), u = await f.evaluate(() => ({ n: ((S.up || {}).g0 || {}).n || '', up: Object.keys(MK_UP).length }));
    ok('#26 다시 보내기를 기다리는 사이 새 소리를 보내면 옛 소리를 다시 보내지 않는다 · 마지막에 고른 소리가 남는다 [UP_AGAIN_GEN]', /유쾌하게/.test(u.n) && s.log.filter((x) => /^ritualFile#/.test(x)).length === 2 && !u.up, JSON.stringify({ u, s }));
  } },
  { no: 26, faults: [{ op: 'ritualFile', nth: 1, kind: 'offline' }], async run({ pg, f }) {   // 대조 — 새 보내기가 없으면 다시 보내기는 그대로 한다
    await blob(f, 'g0', '다정하게'); await adv(pg, 30000);
    const s = await sv(pg), u = await f.evaluate(() => ((S.up || {}).g0 || {}).n || '');
    ok('#26 대조 — 새 소리가 없으면 8초 뒤 다시 보내 올라간다 [UP_AGAIN]', /다정하게/.test(u) && s.log.filter((x) => /^ritualFile#/.test(x)).length === 2, JSON.stringify({ u, s }));
  } },
  /* ── #29 · #38 ── */
  { no: 29, ai: true, faults: [{ op: 'ritualFile', nth: 1, kind: 'offline' }], async run({ pg, f }) {
    await f.evaluate(() => { S.vkeep = {}; }); await blob(f, 'g1', 'AI', 'ai', { by: 'groom' }); await adv(pg, 1000);
    await f.evaluate(() => { S.vkeep.g1 = 1; });   // 올리는 동안 «확정하기»를 누름
    await adv(pg, 30000);
    const r = await f.evaluate(() => ({ keep: !!(S.vkeep || {}).g1, id: ((S.up || {}).g1 || {}).id || '', mode: _aiMode('g1') }));
    ok('#29 · #38 올리는 동안 누른 «확정하기»가 다시 보내기 뒤에도 남는다 [UP_AGAIN_KEEP]', r.keep && /^Fg1x/.test(r.id), JSON.stringify(r));
  } },
  /* ── #57 ── */
  { no: 57, async run({ pg, f }) {
    await blob(f, 'g0', '녹음'); await adv(pg, 8000);
    await f.evaluate(() => { window.ordAsk = () => Promise.resolve(true); mkUpDel('g0'); }); await adv(pg, 3000);
    const s = await pg.evaluate(() => __SV.log.filter((x) => x.op === 'ritualFileDel').map((x) => ({ id: x.id, all: x.all })));
    ok('#57 줄 «지우기»는 서버에 «그 자리 모두»(all)를 싣는다 — 화면 → 마이페이지 중계 [RF_DEL_ALL]', s.length === 1 && s[0].all === 1 && /^Fg0x/.test(s[0].id), JSON.stringify(s));
    await f.evaluate(() => { const id = 'Fg0xRETRY01'; RF_DELQ[id] = { key: 'g0', v: null, n: 1 }; _rfDelSend('g0', id, null); }); await adv(pg, 2000);   // 다시 묻기(3초 뒤)는 그 파일만
    const s2 = await pg.evaluate(() => __SV.log.filter((x) => x.op === 'ritualFileDel').map((x) => x.all));
    ok('#57 다시 묻기는 그 파일만(all 없음) — 그 사이 새로 올린 것을 지우지 않게 [RF_DEL_ALL]', s2.length === 2 && !s2[1], JSON.stringify(s2));
  } },
  /* ── #59 ── */
  { no: 59, faults: [{ op: 'ritualFileGet', kind: 'offline', nth: '*' }], async run({ pg, f }) {
    await f.evaluate(() => { S.up = Object.assign({}, S.up || {}, { g1: { n: '녹음.wav', id: 'Fg1xRECORDED1', at: '2026-10-06 10:00', src: 'rec' } }); render(); }); await adv(pg, 1500);
    const sel = '[data-fk="mkvpl:g1"]', b0 = await f.evaluate((s) => (document.querySelector(s) || {}).getAttribute && document.querySelector(s).getAttribute('onclick'), sel);
    await f.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); await f.click(sel); await adv(pg, 12000);
    const r = await f.evaluate((s) => ({ oc: document.querySelector(s).getAttribute('onclick'), err: (MK.lineErr || {}).g1 || '' }), sel);
    ok('#59 녹음 줄 ▶ 는 못 받은 뒤에도 같은 단추(mkLine) · 까닭(코드)은 그 줄 아래 [MINI_OC_KEEP]', /^mkLine/.test(b0 || '') && r.oc === b0 && /\(코드 L6\)/.test(r.err), JSON.stringify({ b0, r }));
  } },
  /* ── #60 ── */
  { no: 60, lat: { ritualFile: 9000 }, async run({ pg, f }) {
    await f.evaluate(() => { _autoLast = ''; }); await blob(f, 'g0', '녹음'); await adv(pg, 1000);
    await f.evaluate(() => window._obExit()); await adv(pg, 600);
    const a = await f.evaluate(() => ({ ask: ((document.querySelector('.ord-ask .oa-t') || {}).textContent || ''), posts: window.__posts.map((x) => x.type).filter((t) => /order(Exit|Close)/.test(t || '')) }));
    await shot(pg, '60-묻기');
    await f.evaluate(() => document.querySelector('.ord-ask .oa-yes').click()); await adv(pg, 12000);
    const b = await f.evaluate(() => { const ex = window.__posts.find((x) => /order(Exit|Close)/.test(x.type || '')); return { id: ((S.up || {}).g0 || {}).id || '', exited: !!ex }; }).catch(() => ({ gone: true }));
    const done = await pg.evaluate(() => (__SV.log.find((x) => x.op === 'ritualFile') || {}).done || 0);
    ok('#60 보내는 중 나가기 → «아직 보내는 중이에요»를 먼저 묻고 · «끝나면 나가기»면 저장된 뒤 나간다 [UP_EXIT_WAIT]', a.ask === '아직 보내는 중이에요' && !a.posts.length && done > 0 && (b.gone || (b.exited && /^Fg0x/.test(b.id))), JSON.stringify({ a, b, done }));
  } },
  /* ── #61 ── */
  { no: 61, async run({ pg, f }) {
    await f.evaluate(() => { const u = new Uint8Array(4000); for (let i = 0; i < u.length; i++) u[i] = (i * 37) & 255; _recFromBlob('g0', new Blob([u], { type: 'audio/mp4' }), 'file', 'broken'); }); await adv(pg, 3000);
    const a = await f.evaluate(() => ({ ph: MK_REC && MK_REC.ph, btns: [...document.querySelectorAll('#mkRecDlg button')].map((b) => (b.textContent || '').trim() + '=' + (b.getAttribute('onclick') || '')) }));
    await shot(pg, '61-파일오류');
    let chooser = false; const w = pg.waitForEvent('filechooser', { timeout: 3000 }).then(() => { chooser = true; }, () => {});
    await f.evaluate(() => { const b = [...document.querySelectorAll('#mkRecDlg button')].find((x) => /다른 파일 고르기/.test(x.textContent)); if (b) b.click(); }); await w;
    ok('#61 파일 오류 창 = «다른 파일 고르기»(누르면 파일 고르는 창) · 마이크를 켜는 «다시 해 볼게요» 없음 [REC_ERR_WAY]', a.ph === 'err' && a.btns.some((x) => /^다른 파일 고르기=mkUp\('g0'\)/.test(x)) && !a.btns.some((x) => /mkRecAgain/.test(x)) && chooser, JSON.stringify({ a, chooser }));
    await f.evaluate(() => { MK_REC = { key: 'g1', ph: 'err', mic: 1, msg: _micWhy({ name: 'NotAllowedError' }, 'g1') }; render(); }); await adv(pg, 500);
    const m = await f.evaluate(() => [...document.querySelectorAll('#mkRecDlg button')].map((b) => (b.textContent || '').trim() + '=' + (b.getAttribute('onclick') || '')));
    ok('#61 마이크 오류 창 = «다시 해 볼게요» + 글이 권하는 «녹음해 둔 파일 올리기» [REC_ERR_WAY]', m.some((x) => /^다시 해 볼게요=mkRecAgain/.test(x)) && m.some((x) => /^녹음해 둔 파일 올리기=mkUp\('g1'\)/.test(x)), JSON.stringify(m));
  } },
  /* ── #62 ── */
  { no: 62, lat: { ritualFile: 100000 }, async run({ pg, f }) {
    await blob(f, 'g2', '녹음'); await until(pg, f, () => !MK_UP.g2, 400000, 1000);
    const r = await f.evaluate(() => (MK.lineErr || {}).g2 || ''), n = await pg.evaluate(() => __SV.log.filter((x) => x.op === 'ritualFile').length);
    ok('#62 세 번 다 60초를 넘긴 올리기 = «확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)» — «다시 눌러 주세요»가 아니다 [EC_ONE_WORD]', r === '확인이 늦어요 · 올라갔을 수 있어요 (코드 U5)' && n === 3, JSON.stringify({ r, n }));
  } },
  /* ── #32 · #66 · #73 ── */
  { no: 32, faults: [{ op: 'ritualFile', kind: 'json', lat: 800, body: { ok: false, reason: 'expired', ecode: 'U8', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요. (코드 U8)' } },
    { op: 'ritualFileGet', kind: 'json', lat: 800, body: { ok: false, reason: 'expired', ecode: 'L8', error: '오래 머무르셔서 보안을 위해 로그아웃됐어요. 다시 로그인해 주세요. (코드 L8)' } }], async run({ pg, f }) {
    await blob(f, 'g0', '녹음'); await adv(pg, 3000);
    await f.evaluate(() => { S.up.g1 = { n: '녹음.wav', id: 'Fg1xRECORDED1', at: '', src: 'rec' }; mkUpPlay('g1'); }); await adv(pg, 3000);
    const r = await f.evaluate(() => ({ u: (MK.lineErr || {}).g0 || '', l: (MK.lineErr || {}).g1 || '', v: _ecLine('V', { error: '오래 머무르셔서 보안을 위해 로그아웃됐어요 · 다시 로그인해 주세요 (코드 V8)' }), five: _ecLine('V', { error: '기다리다 멈췄어요 (코드 V5 · 61초)' }) }));
    const W = '로그인이 풀렸어요 · 마이페이지에서 다시 로그인해 주세요';
    ok('#32 · #66 · #73 로그인 풀림은 자리마다 한 말(U8 · L8 · V8) — 서버 글을 그대로 쓰지 않는다 · 꼬리 붙은 코드는 그대로 [EC_ONE_WORD]', r.u === W + ' (코드 U8)' && r.l === W + ' (코드 L8)' && r.v === W + ' (코드 V8)' && r.five === '기다리다 멈췄어요 (코드 V5 · 61초)', JSON.stringify(r));
  } },
  /* ── #63 ── */
  { no: 63, lat: { ritualFile: 6000 }, async run({ pg, f }) {
    await blob(f, 'g0', '녹음'); await adv(pg, 500);
    await f.evaluate(() => { MK_REC = { key: 'g1', ph: 'ready' }; render(); }); await adv(pg, 9000);
    const r = await f.evaluate(() => ({ toast: MK.toast || '', info: ((document.getElementById('mkRecDlg') || {}).textContent || '').includes('보냈어요'), id: ((S.up || {}).g0 || {}).id || '' }));
    ok('#63 다른 줄 녹음 창이 떠 있으면 앞 줄 «보냈어요»가 그 창에 안 뜬다(앞 줄은 올라갔다) [UP_TOAST_OWN]', !r.toast && !r.info && /^Fg0x/.test(r.id), JSON.stringify(r));
  } },
  /* ── #64 ── */
  { no: 64, faults: [{ op: 'ritualFile', nth: 1, kind: 'offline' }, { op: 'ritualFile', nth: 2, kind: 'offline' }, { op: 'ritualFile', nth: 3, kind: 'offline' }], async run({ pg, f }) {
    await blob(f, 'g2', '녹음'); await adv(pg, 40000);
    const a = await f.evaluate(() => ({ err: (MK.lineErr || {}).g2 || '', btn: !!document.querySelector('[data-fk="mkupretry:g2"]') }));
    await shot(pg, '64-다시보내기');
    await f.evaluate(() => document.querySelector('[data-fk="mkupretry:g2"]').click()); await adv(pg, 8000);
    const b = await f.evaluate(() => ({ id: ((S.up || {}).g2 || {}).id || '', err: (MK.lineErr || {}).g2 || '', btn: !!document.querySelector('[data-fk="mkupretry:g2"]') }));
    ok('#64 창을 닫은 뒤 끝내 못 보낸 녹음 → 그 줄 아래 «다시 보내기» · 누르면 다시 녹음 없이 올라간다 [UP_FAIL_KEEP]', /코드 U6/.test(a.err) && a.btn && /^Fg2x/.test(b.id) && !b.err && !b.btn, JSON.stringify({ a, b }));
  } },
  /* ── #65 ── */
  { no: 65, async run({ pg, f }) {
    const sel = '[data-fk="mkup:g2"]'; const has = await f.evaluate((s) => !!document.querySelector(s), sel);
    if (has) { await f.evaluate((s) => document.querySelector(s).scrollIntoView({ block: 'center' }), sel); const w = pg.waitForEvent('filechooser', { timeout: 4000 }); await f.click(sel); const fc = await w; await fc.setFiles({ name: 'pic.png', mimeType: 'image/png', buffer: Buffer.from([137, 80, 78, 71]) }); }
    else await f.evaluate(() => { _upFail('g2', '녹음 파일(소리)만 보낼 수 있어요 · 휴대폰 음성 메모 파일을 골라 주세요'); });
    await adv(pg, 800);
    const r = await f.evaluate(() => ({ line: (MK.lineErr || {}).g2 || '', toast: MK.toast || '' }));
    ok('#65 소리 아닌 파일을 고르면 그 줄 아래(맨 위 알림 아님) [UP_PICK_LINE]', has && /소리\)만 보낼 수 있어요/.test(r.line) && !r.toast, JSON.stringify({ has, r }));
  } },
  /* ── #67 ── */
  { no: 67, async run({ pg, f }) {
    await f.evaluate(() => { MK_REC = { key: 'g0', ph: 'rec', el: 3 }; render(); }); await adv(pg, 300);
    await f.evaluate(() => mkDlgClose()); await adv(pg, 400);
    const r = await f.evaluate(() => ({ ask: ((document.querySelector('.ord-ask .oa-t') || {}).textContent || ''), rec: !!MK_REC }));
    await f.evaluate(() => { const b = document.querySelector('.ord-ask .oa-no'); if (b) b.click(); }); await adv(pg, 400);
    const r2 = await f.evaluate(() => !!(MK_REC && MK_REC.ph === 'rec'));
    ok('#67 녹음 중 × 는 한 번 묻는다 · «계속 녹음»이면 그대로 [REC_CLOSE_ASK]', r.ask === '녹음을 멈추고 닫을까요?' && r.rec && r2, JSON.stringify({ r, r2 }));
  } },
  /* ── #74 ── */
  { no: 74, ai: true, async run({ pg, f }) {
    await f.evaluate(() => { _vcMake('g3', {}); }); await until(pg, f, () => !!((S.up || {}).g3 && S.up.g3.id && !MK_UP.g3), 60000);
    const id = await f.evaluate(() => { const id = S.up.g3.id; delete RF_URL.g3; delete RF_URL['g3#']; _rfDel(id); MK.aiDone = {}; render(); return id; }); await adv(pg, 800);   // 다른 기기 — 이 기기엔 없음 · 서버에서도 사라짐
    const m0 = await f.evaluate(() => _aiMode('g3'));
    await f.evaluate(() => mkUpPlay('g3')); await adv(pg, 4000);
    const r = await f.evaluate(() => ({ mode: _aiMode('g3'), err: (MK.lineErr || {}).g3 || '' }));
    await shot(pg, '74-없는소리');
    ok('#74 서버에 없는 AI 줄 소리 → 머리 «목소리 만들기»(확정 숨김) · 할 일을 글로 [RF_GONE_REMAKE]', m0 === 'keep' && r.mode === 'need' && /목소리 만들기/.test(r.err), JSON.stringify({ id, m0, r }));
  } },
];

/* #57 GAS 쪽 — 80_production.gs 의 handleRitualFileDel 을 node vm 에 올려 드라이브만 흉내 낸다 */
function gasDel() {
  const src = fs.readFileSync(path.join(ROOT, 'automation/platform/80_production.gs'), 'utf8');
  const mk = (id, name, trashed) => ({ id, name, trashed: !!trashed, getId() { return this.id; }, getName() { return this.name; }, isTrashed() { return this.trashed; }, setTrashed(v) { this.trashed = v; } });
  const run = (body, files) => {
    const ctx = vm.createContext({ console, Utilities: {}, PropertiesService: {}, DriveApp: {}, CacheService: {} });
    vm.runInContext(src, ctx);
    const folder = { getId: () => 'FOLDER', getFiles() { let i = 0; return { hasNext: () => i < files.length, next: () => files[i++] }; } };
    ctx.resolveSession = () => ({ ok: true, row: { get: () => 'C1' } }); ctx._rfFolderFor = () => folder;
    ctx._rfFileIn = (code, id) => files.find((x) => x.id === id && !x.trashed) || null;
    return ctx.handleRitualFileDel(body);
  };
  const L = (k) => ({ g0: '하객 입장 때', g1: '시작 10분 전' })[k];
  const F = () => [mk('A', L('g0') + ' · 하객 입장 때 · 녹음.wav'), mk('B', L('g0') + ' · 하객 입장 때 · 녹음.wav'), mk('S', L('g0') + ' · 스튜디오 · 대신.wav'), mk('G1', L('g1') + ' · 시작 10분 전 · 녹음.wav')];
  let fs1 = F(), r1 = run({ token: 't', key: 'g0', id: 'B', all: 1 }, fs1);
  ok('#57 GAS — all 이면 그 자리 두 분 파일 모두 휴지통 · 스튜디오 파일 · 다른 자리는 둔다 [RF_DEL_ALL]', r1.ok && fs1.map((x) => x.id + (x.trashed ? '-' : '+')).join(' ') === 'A- B- S+ G1+', JSON.stringify({ r1, f: fs1.map((x) => x.id + (x.trashed ? '-' : '+')) }));
  let fs2 = F(), r2 = run({ token: 't', key: 'g0', id: 'B' }, fs2);
  ok('#57 GAS — all 이 없으면 그 파일만(다시 묻기 · 옛 화면) [RF_DEL_ALL]', r2.ok && fs2.map((x) => x.id + (x.trashed ? '-' : '+')).join(' ') === 'A+ B- S+ G1+', JSON.stringify(fs2.map((x) => x.id + (x.trashed ? '-' : '+'))));
}

if (!ONLY.length || ONLY.includes('57')) { try { gasDel(); } catch (e) { ok('#57 GAS — 재다가 멈췄다', false, String(e && e.message || e).split('\n')[0]); } }
for (const sc of SC) { if (ONLY.length && !ONLY.includes(String(sc.no))) continue;
  let b = null; try { b = await boot(sc); await sc.run(b); if (b.errs.length) ok(`#${sc.no} 화면 오류 없음`, false, b.errs.slice(0, 2).join(' | ')); }
  catch (e) { ok(`#${sc.no} — 재다가 멈췄다`, false, String(e && e.message || e).split('\n')[0]); }
  finally { if (b) await b.ctx.close().catch(() => {}); } }
await br.close(); srv.close();
console.log(fail ? `\nVC R1 UPLOAD FAIL ${fail}` : '\nVC R1 UPLOAD OK'); process.exit(fail ? 1 : 0);
