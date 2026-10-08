#!/usr/bin/env node
/* ★★[VC_R1_LISTEN 2026-10-08 목소리 1라운드 «들어 보기 · 나오는 곳 창 · 연습 AI 읽기» 묶음 #42 ~ #56]
   진짜 마이페이지(mypage.html · 중계) + 진짜 식순 화면(order-preview.html · iframe) + 가짜 서버(GAS 와 같은 답 꼴) + 가짜 시계 — vc-sim.mjs 하네스를 본떴다.
   고친 항목마다 장면 하나 이상 · 단추는 화면에 그려진 진짜 단추를 누른다(그 단추가 부르는 함수를 직접 부르는 곳은 장면 글에 적었다).
   #42 PT_GATE_STAY   연습 «처음부터» 누르고 ② 로 떠나면 준비가 끝나도 크게 보기가 저절로 열리지 않는다
   #43 VU_LATE_MUTE   나오는 곳 창 «준비 중»에 다음 › · 칩 — 누르지 않은 단추는 잠기지 않고 · 앞 글 소리 · 실패 글이 새 자리에 안 나온다
   #44 VU_LATE_MUTE   창을 닫은 뒤 늦게 온 소리는 나지 않는다(기억에만 · 다시 열면 바로)
   #45 NOW_PEND → ★2026-10-08 AI_PLAY_READY  목소리 없이 글을 고친 AI 줄 ▶ 는 «지금 글 듣기»(연습 AI 읽기)를 하지 않는다 — 흐림 · 누르면 그 줄 아래 한 줄 · 요청 · 소리 없음(_playNowText · NOW_PEND 는 err-builder ⑪ 이 직접 잰다)
   #46 VU_ST_UNKNOWN  상태를 불러오는 중 · 못 받음 — 창이 «만들면…»이라 하지 않는다 · 코드 + 다시 불러오기
   #47 PT_PREP_AGAIN  연습 준비가 실패로 끝난 뒤 서버가 돌아오면 «처음부터 시작하기»가 못 만든 차례를 다시 준비한다
   #48 PT_PREP_WORD   준비 결과 문구 — 전부 실패 · 예산 · 로그인 풀림 · 막대 · 차례 문구
   #49 VU_KEY_TUNE    빠르기를 바꾼 뒤 들어 보기는 새로 읽는다 · TTS_NEW_VOICE 목소리를 지우면 들고 있던 소리를 버린다
   #50 PT_TURN_LOAD   연습 재생 중 «만드는 중» 차례에서 › — 다음 차례는 잠기지 않고 · ‹ 로 돌아오면 받아 둔 소리를 쓴다
   #51 VU_ONE_WAIT    한 번 듣기는 50초에 끊지 않는다(PC 55초 · 아이폰 70초 끊김 → 저장본)
   #52 PT_DEADLINE    연습 한 차례는 다시 묻기까지 50초 안
   #53 VU_ENTRY_MIX   입장 인사 들어 보기 = 두 분 목소리(나눠 읽는 줄 · practice 아님)
   #54 VU_STOP        트는 동안 단추는 «■ 멈추기» · 누르면 멈춘다
   #55 VU_WAIT_WHO · VU_LIMIT_INFO   한 분만 만든 예식은 빠진 분 이름 · 예산은 중립 한 줄
   #56 VU_CHIP_EVEN   창 예시 칩이 3+1 · 5+1 로 접히지 않는다(같은 폭 칸)
   ONLY=<번호,…>  SHOTS=<폴더>  VERBOSE=1(통과한 장면도 잰 값)  VC_R1_OP=<order-preview.html 경로>(그 판으로 잰다 — 고치기 전 판 · 돌연변이 확인용)
   2026-10-08 실측: 고치기 전 판(7ca0989b) 33건 빨강 · 고친 줄을 하나씩 되돌린 돌연변이 27개 모두 빨강
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.VC_R1_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0, cnt = 0; const VERB = !!process.env.VERBOSE; const ok = (m, c, d) => { cnt++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${(c && !VERB) || !d ? '' : ' → ' + d}`); if (!c) fail++; };   // VERBOSE=1 이면 통과한 장면도 잰 값을 찍는다
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 — 마이페이지 창 안에서 fetch 를 갈아 끼운다. GAS(80_production.gs) 와 같은 규칙: 같은 글 저장본은 «앞 요청이 끝난 뒤»에 생긴다 · 끊겨도 서버는 끝까지 한다.
   faults(시험 도중에도 __SV.faults 로 바꾼다): { op, nth|'*', kind: busy|json|crash|offline|cut|'', lat, text, once } · json 이면 body 를 그대로 */
const SERVER = (cfg) => {
  if (window.top !== window) return;
  const MP3 = cfg.mp3, CUT = cfg.cut || 0;
  const mkP = (w, on) => (on ? { consent: 1, voiceId: 'v-' + w + '-1', tries: 1, made: '2026-10-07 10:00' } : { consent: 1 });
  const SV = window.__SV = { st: { groom: mkP('groom', cfg.pre.groom), bride: mkP('bride', cfg.pre.bride) }, cache: {}, files: {}, log: [], n: {}, faults: cfg.faults || [], tts: {} };
  const LAT = Object.assign({ status: 1200, make: 9000, makeHit: 1500, practice: 7000, practiceHit: 1200, delete: 2000, ritualFile: 4000 }, cfg.lat || {});
  const pub = (p) => ({ consent: !!p.consent, ready: !!p.voiceId, tries: p.tries || 0, left: 3, made: p.made || '' });
  const now = () => Date.now();
  function handle(b) {
    const op = b.action === 'voiceClone' ? b.op : b.action, st = SV.st, who = b.who;
    if (b.action === 'voiceClone') {
      if (op === 'status') return { lat: LAT.status, res: () => ({ ok: true, on: true, tts: true, groom: pub(st.groom), bride: pub(st.bride), total: 0, left: 99999 }) };
      if (op === 'delete') return { lat: LAT.delete, res: () => { (who === 'all' ? ['groom', 'bride'] : [who]).forEach((w) => { st[w].voiceId = ''; }); return { ok: true }; } };
      if (op === 'make' || op === 'practice') {
        const lines = Array.isArray(b.lines) ? b.lines : [[b.one || b.role || '', b.text]];
        const keys = lines.map((l) => { let w = l[0] === 'groom' || l[0] === 'bride' ? l[0] : (st.groom.voiceId ? 'groom' : 'bride'); let v = (st[w] || {}).voiceId; if (!v) { const ow = w === 'groom' ? 'bride' : 'groom'; if (st[ow].voiceId) { w = ow; v = st[ow].voiceId; } } if (!v && op === 'practice') v = 'def'; return [w, v || '', op + '|' + v + '|' + b.tempo + '|' + b.pause + '|' + l[1]]; });
        const fresh = keys.filter((k) => !SV.cache[k[2]]);   // GAS _vcCacheGet — 요청이 «시작될 때» 저장본을 본다
        return { lat: fresh.length ? LAT[op] : LAT[op + 'Hit'], res: () => { if (op === 'make' && keys.some((k) => !k[1])) return { ok: false, error: '아직 만든 AI 목소리가 없어요.' };
          SV.tts[op] = (SV.tts[op] || 0) + fresh.length; keys.forEach((k) => { SV.cache[k[2]] = 1; });
          return op === 'make' ? { ok: true, key: b.key, parts: keys.map((k) => ({ who: k[0], mime: 'audio/mpeg', data: MP3 })), total: 1 } : { ok: true, mime: 'audio/mpeg', data: MP3, mine: keys[0][1] !== 'def' }; } };
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
    const f = (SV.offUntil && now() < SV.offUntil) ? { kind: 'offline' } : SV.faults.find((x) => x.op === op && (x.nth == null || x.nth === nth || x.nth === '*') && !(x.text && !String(b.text || '').includes(x.text)) && !x.used) || null;
    if (f && f.once) f.used = 1;
    const h = handle(b), lat = f && f.lat != null ? f.lat : h.lat, t0 = now();
    const ent = { op, nth, t: t0, f: f ? f.kind || 'lat' : '', role: b.role || '', text: String(b.text || ''), tempo: b.tempo, pause: b.pause, lines: b.lines || null, one: !!b._one }; SV.log.push(ent);
    return new Promise((resolve, reject) => {
      let settled = false; const sig = o && o.signal;
      const fin = (fn) => { if (settled) return; settled = true; ent.end = now(); fn(); };
      if (sig) { if (sig.aborted) return reject(new DOMException('aborted', 'AbortError')); sig.addEventListener('abort', () => fin(() => reject(new DOMException('aborted', 'AbortError')))); }
      const kind = f ? f.kind : '';
      if (kind === 'offline') { setTimeout(() => fin(() => reject(new TypeError('Load failed'))), 300); return; }
      if (kind === 'crash') { setTimeout(() => fin(() => reject(new TypeError('Load failed'))), lat); return; }
      if (kind === 'json') { setTimeout(() => fin(() => resolve(new Response(JSON.stringify(f.body), { status: 200 }))), lat); return; }
      if (kind === 'busy') { setTimeout(() => fin(() => resolve(new Response(JSON.stringify({ ok: false, down: true, kind: 'busy', http: 429, ecode: 'V1', error: '요청이 몰렸어요 · 잠시 뒤 다시 눌러 주세요 (코드 V1)' }), { status: 200 }))), lat); return; }
      setTimeout(() => { const res = h.res(); ent.done = now(); fin(() => resolve(new Response(JSON.stringify(res), { status: 200, headers: { 'Content-Type': 'application/json' } }))); }, lat);
      const cut = kind === 'cut' ? (f.at || 60000) : CUT;
      if (cut && lat > cut) setTimeout(() => fin(() => reject(new TypeError('Load failed'))), cut);   // 아이폰: 60초 넘으면 연결 끊김(서버는 끝까지 한다)
    });
  };
  window.__goOffline = (ms) => { SV.offUntil = now() + ms; };
};
/* 화면 안 계측 — 소리를 튼 순간(_playLead 를 부른 때)의 창 · 자리 · 칩 */
const INSTR = () => { window.__plays = []; const o = window._playLead; window._playLead = function (a, src) { try { window.__plays.push({ src: String(src).slice(0, 40), use: (typeof MK !== 'undefined' ? MK.use : null), title: (document.getElementById('mkDlgT') || {}).textContent || '', q: ((document.getElementById('mkVuQ') || {}).textContent || ''), step: STEPS[idx] && STEPS[idx].k, t: Date.now() }); } catch (e) {} return o.apply(this, arguments); }; };

async function frame(pg) { for (let i = 0; i < 80; i++) { const f = pg.frames().find((x) => /order-preview\.html/.test(x.url())); if (f) return f; await wait(100); } return null; }
async function adv(pg, ms, step = 250) { for (let t = 0; t < ms; t += step) { await pg.clock.runFor(step); await wait(4); } }
async function until(pg, f, fn, max = 240000, step = 500, arg) { for (let t = 0; t < max; t += step) { if (await f.evaluate(fn, arg).catch(() => false)) return t; await pg.clock.runFor(step); await wait(4); } return -1; }
const PR_ON = ['entry', 'prevideo', 'welcome', 'vow', 'letter', 'tribute', 'bless'];
async function boot(sc) {
  const ctx = await br.newContext({ viewport: { width: sc.w || 390, height: sc.h || 844 }, hasTouch: true });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem("me_token","T-SIM"); localStorage.setItem("me_ptts_ok","1"); }catch(e){}');
  await ctx.addInitScript(SERVER, { mp3: MP3, cut: sc.cut || 0, lat: sc.lat || {}, faults: sc.faults || [], pre: sc.pre || { groom: true, bride: true } });
  await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.clock.install();
  await pg.goto(`${BASE}/mypage.html`); await adv(pg, 2000);
  await pg.evaluate(() => { openRitualBuilder({}, {}); }); await adv(pg, 1500);
  const f = await frame(pg); if (!f) throw new Error('식순 화면을 못 열었다');
  await until(pg, f, () => typeof S === 'object' && typeof mkGo === 'function', 20000);
  await f.evaluate(INSTR);
  await f.evaluate((on) => { courseStarted = true; S.on = S.on || {}; on.forEach((k) => { S.on[k] = 1; });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; RitualOpen.FEATURE.practiceTts = true;
    S.guestVoice = S.entryVoice = S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.pvText = '두 사람의 이야기를 영상으로 준비했습니다.'; }, sc.on || ['entry', 'prevideo']);
  return { ctx, pg, f, errs };
}
async function toVoice(pg, f, noWait) { await f.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo('_voice'); }); await adv(pg, 1500); if (!noWait) await until(pg, f, () => !!(VC.st && !VC.loading), 60000); }
async function toPractice(pg, f) { await f.evaluate(() => opGoStep('listen')); await adv(pg, 2000); await f.evaluate(() => opGoStep('practice')); await adv(pg, 2000); await until(pg, f, () => typeof ENG !== 'undefined' && !!ENG, 30000); await f.evaluate(() => render()); await adv(pg, 500); }
const click = (f, sel) => f.evaluate((sel) => { const b = [...document.querySelectorAll(sel)].find((x) => x.offsetParent) || document.querySelector(sel); if (!b) return 'none'; if (b.disabled) return 'disabled'; b.click(); return 'ok'; }, sel);
async function openUse(pg, f, key) { const r = await click(f, `[data-fk="mkvusen:${key}"],[data-fk="mkvuse:${key}"]`); if (r !== 'ok') await f.evaluate((k) => mkUseOpen(_vcUseRows().findIndex((x) => x[0] === k)), key); await adv(pg, 600); }   // 폰 흐름 줄은 하객 맞이 넷을 한 이름으로 묶는다 — 둘째부터는 창을 바로 연다(vu-ex-listen 과 같은 길)
const dlg = (f) => f.evaluate(() => { const b = document.querySelector('#mkRecDlg [data-fk="mkuseplay"]'), d = document.getElementById('mkRecDlg');
  return { open: !!d, use: MK.use, key: MK.use != null ? (_vcUseRows()[MK.use] || [])[0] : '', title: (document.getElementById('mkDlgT') || {}).textContent || '', q: ((document.getElementById('mkVuQ') || {}).textContent || ''), btn: b ? (b.textContent || '').trim() : '', dis: b ? b.disabled : null, pressed: b ? b.getAttribute('aria-pressed') : null, cls: b ? b.className : '',
    err: [...document.querySelectorAll('#mkRecDlg .mk-exw')].map((e) => e.textContent.trim()).join(' / '), note: [...document.querySelectorAll('#mkRecDlg .mk-vu-wait')].map((e) => e.textContent.trim()).join(' / '), txt: d ? d.textContent : '',
    plays: (window.__plays || []).length, aud: !!MK.aud, audKey: MK.audKey || '', busy: (typeof VU !== 'undefined' && (VU.req ? Object.keys(VU.req).length : (VU.busy ? 1 : 0))) || 0, urlN: Object.keys((typeof VU !== 'undefined' && VU.url) || {}).length }; });
const prac = (pg) => pg.evaluate(() => __SV.log.filter((x) => x.op === 'practice'));
const shot = async (pg, nm) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `vc-r1-${nm}.png`) }); };

const SC = [
  /* ── #42 ── */
  { no: 42, on: PR_ON, async run({ pg, f }) {
    await toPractice(pg, f);
    await click(f, '[data-fk="prm:ai"]'); await adv(pg, 1500);
    await click(f, '[data-fk="prall"]'); await adv(pg, 800);
    const a = await f.evaluate(() => ({ after: !!PT.startAfter, run: !!(PT.prep && PT.prep.run), step: STEPS[idx].k }));
    const r = await click(f, '[data-fk="ops:listen"]'); if (r !== 'ok') await f.evaluate(() => opGoStep('listen'));   // ③ 위 걸음 표시 «하나씩 만들기»
    await adv(pg, 1500); const n0 = await f.evaluate(() => window.__plays.length);
    await until(pg, f, () => PT.prep && !PT.prep.run, 400000); await adv(pg, 4000);
    const b = await f.evaluate(() => ({ step: STEPS[idx].k, big: !!LP.big, after: !!PT.startAfter, plays: window.__plays.length, el: !!(LP.el && !LP.el.paused && LP.el.getAttribute('src')) }));
    await shot(pg, '42-떠난뒤준비끝');
    ok('#42 ③ 준비 중 «처음부터» 누르고 ② 로 떠나면 — 준비가 끝나도 크게 보기가 안 열리고 소리 없음 · 약속도 걷힘 [PT_GATE_STAY]', a.after && a.run && b.step === 'listen' && !b.big && !b.after && b.plays === n0 && !b.el, JSON.stringify({ a, b, n0 }));
  } },
  { no: 42, on: PR_ON, async run({ pg, f }) {   // 떠났다가 준비가 끝나기 전에 ③ 으로 돌아오면 — 떠날 때 걷은 약속이 되살아나 저절로 열리지 않는다(누르면 그때 시작)
    await toPractice(pg, f);
    await click(f, '[data-fk="prm:ai"]'); await adv(pg, 1500);
    await click(f, '[data-fk="prall"]'); await adv(pg, 800);
    const r = await click(f, '[data-fk="ops:listen"]'); if (r !== 'ok') await f.evaluate(() => opGoStep('listen'));
    await adv(pg, 1500); await f.evaluate(() => opGoStep('practice')); await adv(pg, 1500);
    const c = await f.evaluate(() => ({ t: ((document.getElementById('prPrep') || {}).textContent || ''), run: !!(PT.prep && PT.prep.run) }));
    await until(pg, f, () => PT.prep && !PT.prep.run, 400000); await adv(pg, 3000);
    const d = await f.evaluate(() => ({ big: !!LP.big, step: STEPS[idx].k }));
    ok('#42 준비 중에 ③ 로 돌아오면 «준비되면 바로 시작해요»가 묵어 있지 않고 · 준비가 끝나도 저절로 열리지 않는다 [PT_GATE_STAY]', c.run && !/준비되면 바로 시작/.test(c.t) && d.step === 'practice' && !d.big, JSON.stringify({ c, d }));
  } },
  /* ── #43 ── */
  { no: 43, async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0');
    const t0 = await dlg(f); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 1500);
    await click(f, '#mkRecDlg [data-fk="mkusenext"]'); await adv(pg, 400);
    const d1 = await dlg(f); await shot(pg, '43-다음직후');
    ok('#43 «준비 중»에 다음 › — 새 자리 단추는 잠기지 않은 «들어 보기» [VU_LATE_MUTE]', d1.key !== t0.key && d1.btn === '들어 보기' && !d1.dis, JSON.stringify({ t0: t0.key, d1 }));
    await adv(pg, 9000); const d2 = await dlg(f);
    ok('#43 앞 자리 답이 와도 새 자리에서 앞 글 소리가 나지 않는다(기억에만) [VU_LATE_MUTE]', d2.plays === 0 && d2.urlN === 1, JSON.stringify(d2));
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await until(pg, f, () => window.__plays.length > 0, 30000); const d3 = await dlg(f); const P = await prac(pg);
    ok('#43 새 자리에서 누르면 그 자리 글을 읽어 그 창에서 튼다', d3.plays === 1 && P.length === 2 && P[1].text === d3.q && (await f.evaluate(() => window.__plays[0].title)) === d3.title, JSON.stringify({ d3, P: P.map((x) => x.text.slice(0, 12)) }));
    /* 칩 */
    await click(f, '#mkRecDlg [data-fk="mkuseex:2"]'); await adv(pg, 300); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 1500);
    await click(f, '#mkRecDlg [data-fk="mkuseex:3"]'); await adv(pg, 300); const d4 = await dlg(f);
    ok('#43 «준비 중»에 칩을 바꾸면 그 칩 단추는 «들어 보기» [VU_LATE_MUTE]', d4.btn === '들어 보기' && !d4.dis, JSON.stringify(d4));
    await adv(pg, 9000); const d5 = await dlg(f);
    ok('#43 앞 칩 답이 와도 지금 칩 화면에서 앞 칩 글 소리가 나지 않는다 [VU_LATE_MUTE]', d5.plays === 1, JSON.stringify(d5));
  } },
  { no: 43, async run({ pg, f }) {   // 다음 › 뒤 ‹ 이전으로 돌아오면 — 그 자리는 아직 «준비 중»(같은 글을 두 번 묻지 않는다) · 답이 오면 그 자리에서 튼다
    await toVoice(pg, f); await openUse(pg, f, 'g0');
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 1500); await click(f, '#mkRecDlg [data-fk="mkusenext"]'); await adv(pg, 400); await click(f, '#mkRecDlg [data-fk="mkuseprev"]'); await adv(pg, 400);
    const a = await dlg(f); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await f.evaluate(() => mkUsePlay()); await adv(pg, 300);   // 잠긴 단추를 한 번 더(부르는 함수를 직접) — 같은 글 두 번을 막는지
    await until(pg, f, () => window.__plays.length > 0, 30000); const b = await dlg(f); const P = await prac(pg);
    ok('#43 돌아온 자리는 «준비 중…»(잠김) · 같은 글은 한 번만 묻고 · 답이 오면 그 자리에서 튼다 [VU_LATE_MUTE]', a.key === 'g0' && a.btn === '준비 중…' && a.dis && P.length === 1 && b.plays === 1 && b.key === 'g0', JSON.stringify({ a: { key: a.key, btn: a.btn, dis: a.dis }, b: { key: b.key, plays: b.plays }, P: P.length }));
  } },
  { no: 43, faults: [{ op: 'practice', nth: 1, kind: 'busy', lat: 6000 }], async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0');
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 1500); await click(f, '#mkRecDlg [data-fk="mkusenext"]'); await adv(pg, 8000);
    const d = await dlg(f); await shot(pg, '43-실패다른자리');
    ok('#43 앞 자리 요청이 V1 로 실패해도 새 자리에 그 실패 글이 뜨지 않는다 [VU_LATE_MUTE]', !d.err && d.btn === '들어 보기', JSON.stringify(d));
  } },
  /* ── #44 ── */
  { no: 44, async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0');
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 1500); await click(f, '#mkRecDlg [data-fk="mkdlgx"]'); await adv(pg, 400);
    const a = await dlg(f); await adv(pg, 9000); const b = await dlg(f);
    ok('#44 창을 닫은 뒤 늦게 온 소리는 나지 않는다(받은 소리는 기억에만) [VU_LATE_MUTE]', !a.open && !b.open && b.plays === 0 && !b.aud && b.urlN === 1, JSON.stringify({ a, b }));
    await openUse(pg, f, 'g0'); const n = (await prac(pg)).length; await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 500); const c = await dlg(f);
    ok('#44 다시 열어 누르면 기억한 소리를 바로 튼다(새 요청 없음)', c.plays === 1 && (await prac(pg)).length === n, JSON.stringify(c));
  } },
  /* ── #45 ── 두 분 목소리로 하객 맞이 넷을 AI 로 채운 뒤 서버에서 목소리가 사라지고, g2 · g3 글을 고친 판(고객이 실제로 보는 상태 · STALE_NOVOICE) */
  { no: 45, on: ['entry', 'prevideo'], faults: [], async run({ pg, f }) {
    await toVoice(pg, f);
    await f.evaluate(() => { _vcAutoFill('groom'); _vcAutoFill('bride'); }); await until(pg, f, () => ['g0', 'g1', 'g2', 'g3'].every((k) => { const v = (S.up || {})[k]; return v && v.src === 'ai' && v.id && !/^local/.test(v.id); }) && !Object.keys(MK_UP).length, 300000);
    await pg.evaluate(() => { __SV.st.groom.voiceId = ''; __SV.st.bride.voiceId = ''; }); await f.evaluate(() => { VC.st = null; VC.stLast = null; _vcStatus(null, true); }); await until(pg, f, () => !!(VC.st && !VC.loading), 30000);
    await f.evaluate(() => { mkGo('guest'); ['g2', 'g3'].forEach((k) => { mkSlText(k, 0, _slLines(k)[0][1] + ' 고맙습니다.'); }); render(); }); await adv(pg, 800);
    const st0 = await f.evaluate(() => ({ g2: _staleNoVoice('g2'), g3: _staleNoVoice('g3') }));
    if (!st0.g3 || !st0.g2) { ok('#45 상태 만들기 — g2 · g3 가 «목소리 없이 글을 고친 AI 줄»', false, JSON.stringify(st0)); return; }
    /* ★[AI_PLAY_READY 2026-10-08 사장님 «목소리를 먼저 만들지 않으면 플레이 버튼 비활성화 · 누르면 밑에 어디서 만들지»] 종전 #45(NOW_PEND — ▶ 가 연습 AI 읽기로 지금 글을 읽어 줌)는 걷었다.
       이제 ▶ 는 남의 목소리를 틀지 않고 흐리게 · 누르면 그 줄 아래 «… 목소리를 만들면 들을 수 있어요 · 만들러 가기» · 요청 없음 */
    const n0 = (await prac(pg)).length, p0 = await f.evaluate(() => window.__plays.length);
    await f.evaluate(() => { const b = document.querySelector('[data-fk="mkvpl:g3"]'); if (b) b.scrollIntoView({ block: 'center' }); });
    const b0 = await f.evaluate(() => { const b = document.querySelector('[data-fk="mkvpl:g3"]'); return { off: !!(b && b.classList.contains('off')), ad: b && b.getAttribute('aria-disabled'), dis: b && b.disabled, fill: !!(b && /wfill/.test(b.className)) }; });
    await click(f, '[data-fk="mkvpl:g3"]'); await adv(pg, 500); await shot(pg, '45-한줄');
    const HINT = (k) => f.evaluate((k) => { const li = document.querySelector('[data-fk="mkvpl:' + k + '"]').closest('li'); return [...li.querySelectorAll('.mk-ploff')].map((e) => e.textContent).join(''); }, k);
    const h3 = await HINT('g3'); await f.evaluate(() => mkUpPlay('g3')); await adv(pg, 5000);
    ok('#45 목소리 없이 고친 줄 ▶ = 흐림(aria-disabled · 차오름 없음) · 누르면 그 줄 아래 «… 목소리를 만들면 들을 수 있어요 · 만들러 가기» · 연습 읽기 요청 · 소리 없음 [AI_PLAY_READY]',
      b0.off && b0.ad === 'true' && !b0.dis && !b0.fill && /목소리를 만들면 들을 수 있어요 · 만들러 가기$/.test(h3) && (await prac(pg)).length === n0 && (await f.evaluate(() => window.__plays.length)) === p0, JSON.stringify({ b0, h3 }));
    await click(f, '[data-fk="mkvpl:g2"]'); await adv(pg, 500); const h2 = await HINT('g2'), h3b = await HINT('g3');
    ok('#45 다른 줄 ▶ 를 누르면 한 줄은 그 줄로 옮긴다(앞 줄 글은 걷힘)', /목소리를 만들면 들을 수 있어요/.test(h2) && !h3b && (await prac(pg)).length === n0, JSON.stringify({ h2, h3b }));
  } },
  /* ── #46 ── */
  { no: 46, faults: [{ op: 'status', kind: 'crash', lat: 4000 }], async run({ pg, f }) {
    await toVoice(pg, f, true); await adv(pg, 500);
    await openUse(pg, f, 'g0'); const a = await dlg(f); const ld = await f.evaluate(() => !!VC.loading && !VC.st);
    ok('#46 목소리 상태를 불러오는 중 — 창이 «만들면 …»이라 하지 않는다 [VU_ST_UNKNOWN]', ld && !/만들면/.test(a.txt) && /불러오고 있어요/.test(a.note), JSON.stringify({ ld, note: a.note }));
    await until(pg, f, () => !!VC.stErr && !VC.loading, 120000); await adv(pg, 500);
    const b = await dlg(f), hd = await f.evaluate(() => ((document.querySelector('.mk-vredo') || {}).textContent || '').trim());
    await shot(pg, '46-못받음창');
    ok('#46 못 받으면 — 창에 까닭 코드 + 다시 불러오기 · «만들면 …» 없음 [VU_ST_UNKNOWN]', !/만들면/.test(b.txt) && /\(코드\s+V\d/.test(b.err) && await f.evaluate(() => !!document.querySelector('#mkRecDlg [data-fk="mkvcstre4"]')), JSON.stringify({ err: b.err, note: b.note }));
    ok('#46 쪽 머리 줄이 상태를 모를 때 «각자 1분 읽기»(안 만든 분에게 하는 말)로 시작하지 않는다 [VU_ST_UNKNOWN]', !/^각자 1분 읽기/.test(hd) && /아쉬우면 다시 녹음해요/.test(hd), hd);
  } },
  /* ── #47 ── */
  { no: 47, on: PR_ON, async run({ pg, f }) {
    await toPractice(pg, f);
    await pg.evaluate(() => { __SV.faults.push({ op: 'practice', nth: '*', kind: 'busy', lat: 2000, tag: 'down' }); });
    await click(f, '[data-fk="prm:ai"]'); await adv(pg, 1000);
    await until(pg, f, () => PT.prep && !PT.prep.run, 300000); await adv(pg, 500);
    const a = await f.evaluate(() => ({ t: _ptPrepTxt(), n: PT.prep.n }));
    await pg.evaluate(() => { __SV.faults = __SV.faults.filter((x) => x.tag !== 'down'); }); await adv(pg, 30000);
    const n0 = (await prac(pg)).length;
    await click(f, '[data-fk="prall"]'); await adv(pg, 1000);
    const b = await f.evaluate(() => ({ run: !!(PT.prep && PT.prep.run), after: !!PT.startAfter }));
    await until(pg, f, () => PT.prep && !PT.prep.run, 300000); await adv(pg, 1500);
    const c = await f.evaluate(() => ({ t: _ptPrepTxt(), big: !!LP.big, failH: Object.keys(PT.failH).length })); const n1 = (await prac(pg)).length;
    ok('#47 준비가 전부 실패로 끝난 뒤 서버가 돌아오면 «처음부터 시작하기»가 못 만든 차례를 다시 준비하고 · 다 되면 바로 시작 [PT_PREP_AGAIN]', /만들지 못/.test(a.t) && b.run && b.after && n1 > n0 && new RegExp(a.n + '개 준비됐어요').test(c.t) && c.big && !c.failH, JSON.stringify({ a, b, c, n0, n1 }));
  } },
  /* ── #48 ── */
  { no: 48, on: PR_ON, faults: [{ op: 'practice', nth: '*', kind: 'busy', lat: 2000 }], async run({ pg, f }) {
    await toPractice(pg, f); await click(f, '[data-fk="prm:ai"]'); await adv(pg, 1000);
    await until(pg, f, () => PT.prep && !PT.prep.run, 300000); await adv(pg, 500);
    const a = await f.evaluate(() => { const i = document.querySelector('#prPrep .pr-bar i'), h = Object.keys(PT.failH)[0]; return { t: _ptPrepTxt(), w: i ? i.style.width : '', small: [...document.querySelectorAll('#prPrep .pr-ps')].map((e) => e.textContent).join('/'), turn: h ? _ptTurnWhy(h) : '' }; });
    await shot(pg, '48-전부실패');
    ok('#48 전부 실패 — «0개 준비됐어요» 대신 «AI 목소리를 만들지 못했어요 … (코드 V1)» · 막대 0% [PT_PREP_WORD]', /^AI 목소리를 만들지 못했어요/.test(a.t) && /\(코드 V1\)/.test(a.t) && !/0개 준비/.test(a.t) && a.w === '0%', JSON.stringify(a));
    ok('#48 못 만든 차례 문구는 «글을 보며 읽어 주세요»를 겹쳐 말하지 않는다(코드는 그대로) [PT_PREP_WORD]', /^이 차례는 AI 목소리를 만들지 못했어요 \(코드 V1\)$/.test(a.turn), a.turn);
  } },
  { no: 48, on: PR_ON, faults: [{ op: 'practice', nth: '*', kind: 'json', lat: 2000, body: { ok: false, limit: true, ecode: 'V0', error: '이번 예식의 AI 읽기를 다 썼어요. 글을 보며 연습은 계속할 수 있어요' } }], async run({ pg, f }) {
    await toPractice(pg, f); await click(f, '[data-fk="prm:ai"]'); await adv(pg, 1000);
    await until(pg, f, () => PT.prep && !PT.prep.run, 300000); await adv(pg, 500);
    const a = await f.evaluate(() => ({ html: (document.getElementById('prPrep') || {}).textContent || '', t: _ptPrepTxt() })); const n = (await prac(pg)).length;
    ok('#48 예산을 다 쓰면 — 한 줄만(실패 수 문장과 겹치지 않음) · 남은 차례를 더 묻지 않는다 [PT_PREP_WORD]', /다 썼어요/.test(a.t) && !/개는 만들지 못해/.test(a.html) && (a.html.match(/다 썼어요/g) || []).length === 1 && n <= 3, JSON.stringify({ a, n }));
  } },
  { no: 48, on: PR_ON, faults: [{ op: 'practice', nth: '*', kind: 'json', lat: 2000, body: { ok: false, reason: 'expired', ecode: 'V8', error: '로그인이 만료됐어요. 다시 로그인해 주세요' } }], async run({ pg, f }) {
    await toPractice(pg, f); await click(f, '[data-fk="prm:ai"]'); await adv(pg, 1000);
    await until(pg, f, () => PT.prep && !PT.prep.run, 300000); await adv(pg, 500);
    const a = await f.evaluate(() => { const h = Object.keys(PT.failH)[0]; return { t: _ptPrepTxt(), turn: h ? _ptTurnWhy(h) : '' }; }); const n = (await prac(pg)).length;
    ok('#48 로그인이 풀리면 — «마이페이지에서 다시 로그인» 문장(코드 V8) · 차례 문구도 · 남은 차례를 더 묻지 않는다 [PT_PREP_WORD]', /로그인이 풀렸어요/.test(a.t) && /다시 로그인/.test(a.t) && /\(코드 V8\)/.test(a.t) && /다시 로그인/.test(a.turn) && n <= 3, JSON.stringify({ a, n }));
  } },
  /* ── #49 ── */
  { no: 49, async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0');
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await until(pg, f, () => window.__plays.length > 0, 30000); await click(f, '#mkRecDlg [data-fk="mkdlgx"]'); await adv(pg, 400);
    const role = await f.evaluate(() => { const w = _vcLineWho('g0'); const r = w === 'bride' ? 'bride' : 'groom'; S.vset = S.vset || {}; S.vset[r] = Object.assign({}, S.vset[r] || {}, { tempo: '1.3', pause: 900 }); return r; });   // 맞추기 창 «이 목소리로 쓰기»(mkTuneUse)가 적는 자리
    await openUse(pg, f, 'g0'); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await until(pg, f, () => window.__plays.length > 1, 30000); await adv(pg, 300);
    const P = await prac(pg);
    ok('#49 빠르기를 바꾼 뒤 들어 보기는 새로 읽는다(빠르기 1.3 으로) [VU_KEY_TUNE]', P.length === 2 && String(P[1].tempo) === '1.3' && P[1].role === role, JSON.stringify(P.map((x) => ({ r: x.role, t: x.tempo, p: x.pause }))));
    /* 목소리를 지우면 들고 있던 소리를 버린다 */
    await click(f, '#mkRecDlg [data-fk="mkdlgx"]'); await adv(pg, 300);
    const before = await f.evaluate(() => Object.keys(VU.url).length);
    await click(f, `[data-fk="mkvcdel:${role}"]`); await adv(pg, 400); await click(f, '.ord-ask .oa-yes'); await adv(pg, 3000);
    const after = await f.evaluate(() => Object.keys(VU.url).length);
    ok('#49 목소리를 지우면 들어 보기 기억(VU.url)도 비운다 — 옛 목소리를 다시 틀지 않게 [TTS_NEW_VOICE]', before > 0 && after === 0, JSON.stringify({ before, after }));
  } },
  /* ── #50 ── */
  { no: 50, on: ['entry', 'prevideo', 'welcome', 'vow', 'letter', 'bless'], async run({ pg, f }) {
    await toPractice(pg, f);
    const vt = await f.evaluate(() => { const L = _ptList(); const g = L.find((x) => x.k === 'vow' && x.who === '신랑'), b = L.find((x) => x.k === 'vow' && x.who === '신부'); return g && b ? { g: g.txt, b: b.txt, gh: _ptKey(g).h, bh: _ptKey(b).h } : null; });
    if (!vt) { ok('#50 서약 신랑 · 신부 차례가 있다', false); return; }
    await pg.evaluate((t) => { __SV.faults.push({ op: 'practice', text: t, lat: 30000 }); }, vt.g.slice(0, 12));
    await click(f, '[data-fk="prm:self"]'); await adv(pg, 300); await click(f, '[data-fk="prall"]'); await adv(pg, 2000);
    await click(f, '#lsFull [data-fk="lfmin"]'); await adv(pg, 1000); await click(f, '[data-fk="prm:ai"]'); await adv(pg, 500);   // 재생 중에 «AI 목소리로 먼저 듣기»로 바꾼다(준비는 뒤에서)
    await until(pg, f, (h) => !!PT.url[h], 120000, 500, vt.bh);
    await click(f, '#lsMini [data-fk="lmg"]'); await adv(pg, 500);
    for (let k = 0; k < 14; k++) { const s = await f.evaluate(() => (LP.q[LP.i] || {}).k); if (s === 'vow') break; await click(f, '#lsFull [data-fk="lfnext"]'); await adv(pg, 300); }
    for (let k = 0; k < 8; k++) { const s = await f.evaluate(() => ({ k: (LP.q[LP.i] || {}).k, w: (LP.q[LP.i] || {}).who })); if (s.k === 'vow' && s.w === '신랑') break; await click(f, '#lsFull [data-fk="lfnextl"]'); await adv(pg, 300); }
    await adv(pg, 2000);
    const S1 = () => f.evaluate(() => { const st = LP.q[LP.i] || {}, tog = document.querySelector('#lsFull [data-fk="lftog"]'); return { k: st.k, who: st.who, src: !!st.src, ai: !!st.ptts, cue: ((document.querySelector('#lsFull .lf-cue') || {}).textContent || ''), tog: tog ? tog.disabled : null, el: LP.el ? (LP.el.getAttribute('src') || '') === (st.src || '#') : false }; });
    const s1 = await S1();
    if (!(s1.k === 'vow' && s1.who === '신랑' && /만드는 중/.test(s1.cue))) { ok('#50 신랑 서약 차례에서 «만드는 중»', false, JSON.stringify(s1)); return; }
    await click(f, '#lsFull [data-fk="lfnextl"]'); await adv(pg, 600);
    const s2 = await S1(); await shot(pg, '50-신부차례');
    ok('#50 «만드는 중» 신랑 차례에서 › — 신부 차례는 «만드는 중»이 아니라 AI 소리 안내 · ❚❚ 가 잠기지 않는다 [PT_TURN_LOAD]', s2.who === '신부' && s2.ai && /연습용으로만/.test(s2.cue) && s2.tog === false, JSON.stringify(s2));
    await until(pg, f, (h) => !!PT.url[h], 60000, 250, vt.gh); await adv(pg, 500);
    await click(f, '#lsFull [data-fk="lfprevl"]'); await adv(pg, 800);
    const s3 = await S1();
    ok('#50 신랑 소리가 온 뒤 ‹ 로 돌아오면 받아 둔 AI 소리로 튼다 [PT_TURN_LOAD]', s3.who === '신랑' && s3.src && s3.ai, JSON.stringify(s3));
  } },
  /* ── #51 ── */
  { no: 51, faults: [{ op: 'practice', nth: 1, lat: 55000 }], async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0'); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 52000);
    const a = await dlg(f); const t = await until(pg, f, () => window.__plays.length > 0, 30000); const b = await dlg(f); const P = await prac(pg);
    ok('#51 PC · 서버 55초 — 50초에 V5 로 끊지 않고 기다렸다 튼다(다시 누르기 0 · 요청 1) [VU_ONE_WAIT]', !a.err && /준비 중/.test(a.btn) && t >= 0 && !b.err && P.length === 1, JSON.stringify({ a: { err: a.err, btn: a.btn }, t, P: P.length }));
  } },
  { no: 51, cut: 60000, faults: [{ op: 'practice', nth: 1, lat: 70000 }], async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0'); await click(f, '#mkRecDlg [data-fk="mkuseplay"]');
    const t = await until(pg, f, () => window.__plays.length > 0, 130000); const b = await dlg(f); const tts = await pg.evaluate(() => __SV.tts.practice || 0);
    ok('#51 아이폰 · 서버 70초(60초에 끊김) — 저장본을 받아 튼다 · 업체 호출 1번 [VU_ONE_WAIT]', t >= 0 && !b.err && tts === 1, JSON.stringify({ t, err: b.err, tts }));
  } },
  /* ── #52 ── 연습 읽기 한 번(_vc · 마이페이지 중계 그대로) */
  { no: 52, faults: [{ op: 'practice', nth: '*', kind: 'crash', lat: 40000 }], async run({ pg, f }) {
    await adv(pg, 1000);
    await f.evaluate(() => { window.__r = null; window.__t0 = Date.now(); _vc('practice', { role: 'groom', who: 'groom', text: '연습 한 차례', tempo: '1', pause: 900 }).then((d) => { window.__r = { d, ms: Date.now() - window.__t0 }; }); });
    await until(pg, f, () => !!window.__r, 300000); const r = await f.evaluate(() => window.__r); const n = (await prac(pg)).length;
    ok('#52 서버가 매번 40초에 멈춤(V9) — 연습 한 차례는 다시 묻지 않고 50초 안에 «못 만든 차례» [PT_DEADLINE]', !r.d.ok && r.ms <= 50000 && n === 1, JSON.stringify({ ms: r.ms, n, e: r.d.error }));
    await pg.evaluate(() => { __SV.faults = []; __goOffline(5000); });
    await f.evaluate(() => { window.__r = null; window.__t0 = Date.now(); _vc('practice', { role: 'groom', who: 'groom', text: '연습 두 차례', tempo: '1', pause: 900 }).then((d) => { window.__r = { d, ms: Date.now() - window.__t0 }; }); });
    await until(pg, f, () => !!window.__r, 300000); const r2 = await f.evaluate(() => window.__r); const n2 = (await prac(pg)).length - n;
    ok('#52 금방 끊긴 연결(V6)은 마감 안에서 한 번 더 물어 받는다 [PT_DEADLINE]', r2.d.ok && r2.ms <= 50000 && n2 === 2, JSON.stringify({ ms: r2.ms, n2, ok: r2.d.ok }));
  } },
  /* ── #53 ── */
  { no: 53, async run({ pg, f }) {
    await toVoice(pg, f); await adv(pg, 2000); await openUse(pg, f, 'entry');
    await click(f, '#mkRecDlg [data-fk="mkuseex:1"]'); await adv(pg, 300); const a = await dlg(f);
    const n0 = (await pg.evaluate(() => __SV.log.length));
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); const t = await until(pg, f, () => window.__plays.length > 0, 120000);
    const L = await pg.evaluate((n0) => __SV.log.slice(n0).map((x) => ({ op: x.op, role: x.role, lines: x.lines ? x.lines.map((l) => l[0]) : null, text: x.text })), n0);
    const pr = L.filter((x) => x.op === 'practice'), mk = L.filter((x) => x.op === 'make' && x.lines && x.lines.includes('groom') && x.lines.includes('bride'));
    const mix = await f.evaluate(() => Object.keys(VC_MIX.entry || {}).length);
    ok('#53 입장 인사 «두 분 목소리» 들어 보기 — 신랑 혼자 읽는 연습 읽기(practice)가 아니라 두 분이 나눠 읽는 소리 [VU_ENTRY_MIX]', /두 분 목소리/.test(a.title + (await f.evaluate(() => (document.querySelector('.mk-vu-when') || {}).textContent || ''))) && t >= 0 && pr.length === 0 && (mk.length >= 1 || mix > 0), JSON.stringify({ t, pr: pr.length, mk: mk.length, mix }));
  } },
  /* ── #54 ── */
  { no: 54, async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0');
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await until(pg, f, () => window.__plays.length > 0, 30000); await adv(pg, 200);
    const a = await dlg(f); await shot(pg, '54-트는중');
    ok('#54 트는 동안 단추 = «■ 멈추기»(aria-pressed=true) [VU_STOP]', a.btn === '멈추기' && a.pressed === 'true' && a.aud, JSON.stringify(a));
    await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 300); const b = await dlg(f);
    ok('#54 다시 누르면 멈춘다(처음부터 다시 틀지 않는다) · 단추는 «들어 보기»로 [VU_STOP]', !b.aud && b.plays === a.plays && b.btn === '들어 보기' && b.pressed === 'false', JSON.stringify(b));
  } },
  /* ── #55 ── */
  { no: 55, pre: { groom: true, bride: false }, async run({ pg, f }) {
    await toVoice(pg, f);
    const k = await f.evaluate(() => _vcUseRows().map((x) => x[0]).find((x) => _vcLineWho(x) === 'bride'));
    await openUse(pg, f, k); const a = await dlg(f); await click(f, '#mkRecDlg [data-fk="mkdlgx"]'); await adv(pg, 300);
    await openUse(pg, f, 'entry'); const b = await dlg(f);
    await shot(pg, '55-한분만');
    ok('#55 신랑만 만든 예식 — 신부가 읽는 자리 · 두 분 자리 모두 «신부 목소리를 만들면 …» [VU_WAIT_WHO]', a.note === '신부 목소리를 만들면 여기서 들어 볼 수 있어요' && b.note === '신부 목소리를 만들면 여기서 들어 볼 수 있어요', JSON.stringify({ k, a: a.note, b: b.note }));
  } },
  { no: 55, faults: [{ op: 'practice', nth: '*', kind: 'json', lat: 1500, body: { ok: false, limit: true, ecode: 'V0', error: '이번 예식의 AI 읽기를 다 썼어요. 글을 보며 연습은 계속할 수 있어요' } }], async run({ pg, f }) {
    await toVoice(pg, f); await openUse(pg, f, 'g0'); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 3000);
    const a = await dlg(f), lim = await f.evaluate(() => ((document.querySelector('#mkRecDlg [data-fk="mkuselim"]') || {}).textContent || '').trim()); await shot(pg, '55-예산');
    await click(f, '#mkRecDlg [data-fk="mkusenext"]'); await adv(pg, 400); await click(f, '#mkRecDlg [data-fk="mkuseplay"]'); await adv(pg, 3000); const n = (await prac(pg)).length;
    ok('#55 예산을 다 쓰면 — 빨간 경고가 아니라 중립 한 줄 «이번 예식의 AI 읽기를 다 썼어요»(연습 말 없음) · 다시 묻지 않는다 [VU_LIMIT_INFO]', !a.err && lim === '이번 예식의 AI 읽기를 다 썼어요' && !/연습/.test(a.txt) && n === 1, JSON.stringify({ err: a.err, lim, n }));
  } },
  /* ── #56 ── */
  { no: 56, async run({ pg, f }) {
    const lay = () => f.evaluate(() => { const c = document.querySelector('#mkRecDlg .mk-vu-exs'); if (!c) return null; const b = [...c.querySelectorAll('button')]; const rows = {}; b.forEach((x) => { const y = Math.round(x.getBoundingClientRect().top); rows[y] = (rows[y] || 0) + 1; }); const r = Object.values(rows), ws = b.map((x) => Math.round(x.getBoundingClientRect().width)); return { n: b.length, rows: r, ws, even: c.classList.contains('cg-even') }; });
    const good = (L) => L && (L.rows.length === 1 || (L.even && Math.max(...L.ws) - Math.min(...L.ws) <= 1 && Math.max(...L.rows) - Math.min(...L.rows) <= 1));
    const out = [];
    for (const [w, keys] of [[360, ['g0', 'pv']], [390, ['g0', 'pv', 'entry']], [1280, ['g0', 'entry']]]) {
      await pg.setViewportSize({ width: w, height: 900 }); await adv(pg, 300);
      for (const k of keys) { await openUse(pg, f, k); await adv(pg, 300); const L = await lay(); out.push({ w, k, L }); if (w === 390 && k === 'g0') await shot(pg, '56-390-하객맞이'); if (w === 390 && k === 'pv') await shot(pg, '56-390-식전영상'); if (w === 1280 && k === 'entry') await shot(pg, '56-1280-입장'); await click(f, '#mkRecDlg [data-fk="mkdlgx"]'); await adv(pg, 300); }
    }
    ok('#56 창 예시 칩 줄 — 한 줄이거나 같은 폭 칸(3+1 · 5+1 홀로 남지 않음) · 360 · 390 · 1280 [VU_CHIP_EVEN]', out.every((x) => good(x.L)), JSON.stringify(out.filter((x) => !good(x.L))));
  } },
];
SC.forEach((s) => { if (s.no === 56) s.boot = { voice: true }; });

for (const sc of SC) {
  if (ONLY.length && !ONLY.includes(String(sc.no))) continue;
  let B = null;
  try {
    B = await boot(sc); if (sc.no === 56) await toVoice(B.pg, B.f);
    await sc.run(B);
    ok(`#${sc.no} 화면 오류 없음`, !B.errs.length, B.errs.slice(0, 2).join(' | '));
  } catch (e) { console.log(`멈춤 #${sc.no} — ${String(e.message).split('\n')[0]}`); fail++; }
  if (B) await B.ctx.close();
}
await br.close(); srv.close();
if (!cnt) { console.log('못 쟀다 — 장면이 하나도 돌지 않았다'); process.exit(2); }
console.log(fail ? `✗ VC_R1_LISTEN 실패 ${fail}건` : '✓ VC_R1_LISTEN 통과'); process.exit(fail ? 1 : 0);
