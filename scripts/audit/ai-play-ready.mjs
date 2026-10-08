#!/usr/bin/env node
/* ★★[AI_PLAY_READY · AI_NO_CAST · PLAY_NO_DUP · LS_MAKE_ALL 2026-10-08 사장님]
   «AI 두 분 목소리에서 목소리를 먼저 만들지 않으면 · 우측 버튼이 목소리 만들기면 좌측 플레이 버튼 비활성화 · 다른 곳 · 이 순간 전체 듣기도 · 누르면 밑에 어디서 만들지 간략히»
   «하객 맞이 담백하게는 목소리를 만들지 않으면 나레이션 음성이 흐른다 · 다른 곳들과 다르지 않게» · «만드는 중 누르면 플레이 버튼도 같이 로딩 표시 · 개선»
   «차라리 이 순간 전체 듣기를 누르면 전체 자동으로 만드는 중 · 잠시만 기다려 주세요 · 전부 만들면 순차적으로 자동 재생»
   진짜 마이페이지(중계) + 진짜 식순 화면 + 가짜 서버(GAS 와 같은 답 꼴 · vc-r1-listen 하네스) + 가짜 시계 · 390 · 단추는 화면의 진짜 단추를 누른다(aria-disabled 도 손가락처럼 누른다).
   1 목소리 없음 — 줄 ▶ · 이 순간 전체 듣기 흐림 · 누르면 그 아래 한 줄(만들러 가기) · 소리 · 요청 없음 · AI 판에 배역 예시 녹음 없음(직접 녹음 판은 그대로) · 입장 인사 · 영상 앞 소개도
   2 한 분만 목소리 — 빠진 분 이름 · 빈 줄 저절로 채우기(FILL_EMPTY) · 준비 중 · 만드는 중 ▶ 는 잠기고 차오르지 않고 알약이 차오른다 · 다 되면 ▶ 풀림
   3 고친 줄 — ▶ 흐림 «오른쪽 목소리 만들기…» · 만들지 않는다 · 알약 «만드는 중»은 알약만 차오름
   4 이 순간 전체 듣기 — 고친 줄을 한꺼번에 만들고 다 되면 처음부터 이어서
   5 한꺼번에 만들다 실패 — 틀지 않고 한 줄 · 그 줄 아래 코드 · 다시 누르면 다시
   6 맞추기가 남은 분 — 그 창부터(만들지 않는다)
   ONLY=<번호,…>  SHOTS=<폴더>  VERBOSE=1  AI_PR_OP=<order-preview.html 경로>(그 판으로 잰다 — 돌연변이 확인용)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.AI_PR_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0, cnt = 0; const VERB = !!process.env.VERBOSE; const ok = (m, c, d) => { cnt++; console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${(c && !VERB) || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const MP3 = fs.readFileSync(path.join(ROOT, 'assets/audio/tone/n27.mp3')).toString('base64');
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

/* 가짜 서버 · 계측 · 하네스 — scripts/audit/vc-r1-listen.mjs 와 같다(GAS 80_production 과 같은 답 꼴) */
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

const SHOT = async (pg, f, nm, sel) => { if (!SHOTS) return; await f.evaluate((q) => { const e = q && document.querySelector(q); if (e) e.scrollIntoView({ block: 'center' }); }, sel || ''); await adv(pg, 300); await pg.screenshot({ path: path.join(SHOTS, `apr-${nm}.png`) }); };
/* 줄 카드 ▶ · 이 순간 전체 듣기 · 머리 알약 — 지금 모습 */
const CARD = (f, k) => f.evaluate((k) => { const b = document.querySelector('[data-fk="mkvpl:' + k + '"]'), li = b && b.closest('li'), pill = li && li.querySelector('.mk-aip');
  const hint = li ? [...li.querySelectorAll('.mk-ploff')].map((e) => e.textContent.trim()).join(' / ') : '';
  return { has: !!b, off: !!(b && b.classList.contains('off')), ad: b ? b.getAttribute('aria-disabled') : null, dis: b ? b.disabled : null, fill: !!(b && /wfill/.test(b.className)), on: !!(b && b.classList.contains('on')),
    pill: pill ? (pill.textContent || '').trim() : '', pillCls: pill ? pill.className : '', pillSty: pill ? pill.getAttribute('style') || '' : '', hint, go: !!(li && li.querySelector('[data-fk^="mkploffgo:"]')), err: li ? [...li.querySelectorAll('.mk-exw')].map((e) => e.textContent.trim()).join(' / ') : '' }; }, k);
const ALL = (f, k) => f.evaluate((k) => { const b = document.querySelector('.mk-hbtn[data-mp="' + k + '"]'), sec = b && b.closest('section');
  return { has: !!b, off: !!(b && b.classList.contains('off')), ad: b ? b.getAttribute('aria-disabled') : null, dis: b ? b.disabled : null, txt: b ? b.textContent.trim() : '', fill: !!(b && /wfill/.test(b.className)),
    hint: sec ? [...sec.querySelectorAll('.mk-ploff')].map((e) => e.textContent.trim()).join(' / ') : '', go: !!(sec && sec.querySelector('[data-fk^="mkploffgo:"]')) }; }, k);
const tap = (f, sel) => f.evaluate((sel) => { const b = document.querySelector(sel); if (!b) return 'none'; if (b.disabled) return 'disabled'; b.click(); return 'ok'; }, sel);   // 손가락은 aria-disabled 단추도 누른다(누르면 한 줄)
const plays = (f) => f.evaluate(() => (window.__plays || []).length);
const ops = (pg, op) => pg.evaluate((op) => __SV.log.filter((x) => x.op === op).length, op);
const mkOps = (pg, mark) => pg.evaluate((m) => __SV.log.filter((x) => x.op === 'make' && (x.text.includes(m) || (x.lines || []).some((l) => String(l[1]).includes(m)))).length, mark);   // 고친 글(표식)을 만든 요청만 — 뒤에서 데우는 예시 요청은 세지 않는다
const toGuest = async (pg, f) => { await f.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } mkGo('guest'); }); await adv(pg, 1200); };
/* 두 분 목소리로 하객 맞이 넷을 채운다(vc-r1-listen #45 와 같은 길) */
const idle = () => !Object.keys(MK_UP).length && !(VC.fill && VC.fill.doing) && !Object.keys(VC_ALTF || {}).length;
const fillAll = async (pg, f) => { await toVoice(pg, f);
  for (const w of ['groom', 'bride']) { await f.evaluate((w) => _vcAutoFill(w), w); if (await until(pg, f, idle, 300000) < 0) return -1; }   // 한 분씩 — 채우는 중(FILL_GOT 다시 만들기)에 글을 고치면 그 줄을 지금 글로 다시 만든다
  await adv(pg, 3000);
  return until(pg, f, () => ['g0', 'g1', 'g2', 'g3'].every((k) => { const v = (S.up || {})[k]; return v && v.src === 'ai' && v.id && !/^local/.test(v.id); }) && !Object.keys(MK_UP).length && !(VC.fill && VC.fill.doing), 60000); };
const MARK = ' 시험 문장 하나.';   // 고친 글 표식 — 사이트 예시 글에 없는 말(뒤에서 데우는 예시 요청과 갈린다)
const edit = (f, ks) => f.evaluate((a) => { mkGo('guest'); a.ks.forEach((k) => { mkSlText(k, 0, _slLines(k)[0][1] + a.m); }); render(); }, { ks, m: MARK });

const SC = [
  /* ── 1 ── 목소리가 하나도 없다 — 줄 ▶ · 이 순간 전체 듣기 흐림 · 누르면 그 아래 한 줄 · 소리 · 요청 없음 · 배역 예시 녹음 없음 */
  { no: 1, pre: { groom: false, bride: false }, async run({ pg, f }) {
    await toVoice(pg, f); await toGuest(pg, f);
    const c = {}; for (const k of ['g0', 'g1', 'g2', 'g3']) c[k] = await CARD(f, k);
    ok('1 목소리 없음 — 하객 맞이 넷 ▶ 흐림(aria-disabled · 누를 수는 있음) · 차오름 없음 [AI_PLAY_READY]', Object.values(c).every((x) => x.has && x.off && x.ad === 'true' && !x.dis && !x.fill), JSON.stringify(c));
    const p0 = await plays(f), m0 = await ops(pg, 'make'), q0 = await ops(pg, 'practice');
    for (const k of ['g0', 'g1']) await tap(f, '[data-fk="mkvpl:' + k + '"]');
    await adv(pg, 1500); const a = await CARD(f, 'g1'), a0 = await CARD(f, 'g0');
    const lp = await f.evaluate(() => ({ q: LP.q.length, aud: !!MK.aud, toast: MK.toast || '' }));
    await SHOT(pg, f, '1-줄', '.mk-ploff');
    ok('1 ▶ 를 누르면 그 줄 아래 «… 목소리를 만들면 들을 수 있어요 · 만들러 가기» · 앞서 누른 줄 글은 걷힘 · 소리 · 만들기 · 연습 읽기 요청 없음 [AI_PLAY_READY]',
      /^(신랑|신부) 목소리를 만들면 들을 수 있어요 · 만들러 가기$/.test(a.hint) && a.go && !a0.hint && (await plays(f)) === p0 && (await ops(pg, 'make')) === m0 && (await ops(pg, 'practice')) === q0 && !lp.q && !lp.aud, JSON.stringify({ a, a0, lp }));
    const l = await ALL(f, 'guest');
    ok('1 이 순간 전체 듣기도 흐림(aria-disabled) [AI_PLAY_READY]', l.has && l.off && l.ad === 'true' && !l.dis, JSON.stringify(l));
    await tap(f, '.mk-hbtn[data-mp="guest"]'); await adv(pg, 1500); const l2 = await ALL(f, 'guest'), c1 = await CARD(f, 'g1');
    await SHOT(pg, f, '1-전체', '.mk-hbtn[data-mp="guest"]');
    ok('1 이 순간 전체 듣기를 누르면 바로 아래 «두 분 목소리를 만들면 이어서 들을 수 있어요 · 만들러 가기» · 줄 글은 걷힘 · 소리 없음', l2.hint === '두 분 목소리를 만들면 이어서 들을 수 있어요 · 만들러 가기' && l2.go && !c1.hint && (await plays(f)) === p0 && !(await f.evaluate(() => LP.q.length)), JSON.stringify({ l2, c1 }));
    const cast = await f.evaluate(() => { const g = _lSteps(ENG, ['guest']).filter((x) => x.own).map((x) => x.src || ''), S0 = JSON.stringify(S.vfill); S.vfill = { entry: 'ai', prevideo: 'ai' }; const self = _lSteps(ENG, ['guest']).filter((x) => x.own).map((x) => x.src || ''); S.vfill = JSON.parse(S0); return { g, self, mode: _vpCur('guest') }; });
    ok('1 AI 판 하객 맞이 줄에는 배역 예시 녹음(cast)을 싣지 않는다 · 직접 녹음 판은 그대로(읽는 법 참고) [AI_NO_CAST]', cast.mode === 'ai' && cast.g.length === 4 && cast.g.every((s) => !/\/cast\//.test(s)) && cast.self.some((s) => /\/cast\/0[2-4]_guest/.test(s)), JSON.stringify(cast));
    await tap(f, '[data-fk="mkploffgo:mp:guest"]'); await adv(pg, 800);
    ok('1 «만들러 가기» → 두 분 목소리 만들기 쪽', await f.evaluate(() => _mkRO().at === '_voice'));
    /* 입장 인사 · 영상 앞 소개도 같은 꼴(COURSE_WIDE) */
    for (const [pgk, key] of [['entry', 'entry'], ['prevideo', 'pv']]) { await f.evaluate((k) => mkGo(k), pgk); await adv(pg, 1000);
      const e0 = await CARD(f, key); await tap(f, '[data-fk="mkvpl:' + key + '"]'); await adv(pg, 1200); const e1 = await CARD(f, key);
      ok(`1 ${pgk} 줄 ▶ 도 흐림 · 누르면 한 줄 · 소리 없음 [AI_PLAY_READY · COURSE_WIDE]`, e0.off && e0.ad === 'true' && /목소리를 만들면 들을 수 있어요 · 만들러 가기$/.test(e1.hint) && (await plays(f)) === p0, JSON.stringify({ e0, e1 })); }
    const ec = await f.evaluate(() => _lSteps(ENG, ['entry']).filter((x) => x.own).map((x) => x.src || ''));
    ok('1 AI 판 입장 인사 줄도 배역 예시 녹음 없음 [AI_NO_CAST]', ec.length >= 1 && ec.every((s) => !/\/cast\//.test(s)), JSON.stringify(ec));
  } },
  /* ── 2 ── 한 분(신랑)만 목소리 — 신부 줄은 «신부 …» · 신랑 빈 줄은 저절로 채운다(FILL_EMPTY) · «만드는 중» · «준비 중»(예시를 바꿈) 동안 ▶ 는 차오르지 않고 알약이 차오른다 */
  { no: 2, pre: { groom: true, bride: false }, lat: { make: 12000 }, async run({ pg, f }) {
    await toVoice(pg, f); await toGuest(pg, f); await adv(pg, 600);
    const g1 = await CARD(f, 'g1'), g0 = await CARD(f, 'g0');
    await tap(f, '[data-fk="mkvpl:g1"]'); await adv(pg, 600); const g1b = await CARD(f, 'g1');
    ok('2 신부 목소리가 없는 줄 — 흐림 · 누르면 «신부 목소리를 만들면 들을 수 있어요 · 만들러 가기»', g1.off && g1b.hint === '신부 목소리를 만들면 들을 수 있어요 · 만들러 가기' && g1b.go, JSON.stringify({ g1, g1b }));
    /* [FILL_EMPTY #1130] 목소리가 있는 분의 빈 줄은 저절로 채운다 — 신랑 줄은 곧 «만드는 중»(누르지 않아도) */
    const st = []; for (let i = 0; i < 8; i++) { st.push(await CARD(f, 'g0')); await adv(pg, 500); }
    await SHOT(pg, f, '2-만드는중', '[data-fk="mkvpl:g0"]');
    const mk = st.filter((x) => /만드는 중/.test(x.pill));   // 아직 소리 파일이 없는 줄(흐름 ▶ 갈래)
    ok('2 신랑 줄 «만드는 중»(빈 줄 저절로 채우기) 동안 ▶ 는 흐리게 잠기고 차오르지 않는다 · 차오름은 알약(--d 시계) [PLAY_NO_DUP]', g0.has && mk.length >= 3 && mk.every((x) => x.dis && !x.fill && /--d:[\d.]+s;--dl:-[\d.]+s/.test(x.pillSty)), JSON.stringify({ g0, st }));
    await tap(f, '[data-fk="mkvpl:g0"]'); await adv(pg, 300); const g0b = await CARD(f, 'g0');
    ok('2 «만드는 중» ▶ 는 눌리지 않는다(PLAY_WAIT_LOCK) · 한 줄도 없다', g0b.dis && !g0b.hint, JSON.stringify(g0b));
    await until(pg, f, () => _aiMode('g0') === 'keep', 120000);
    const g0c = await CARD(f, 'g0'); const p0 = await plays(f); await tap(f, '[data-fk="mkvpl:g0"]'); await adv(pg, 1200);
    ok('2 다 되면(«확정하기») ▶ 가 풀리고 누르면 소리 [AI_PLAY_READY]', !g0c.off && !g0c.dis && /확정하기/.test(g0c.pill) && (await plays(f)) === p0 + 1, JSON.stringify(g0c));
    await f.evaluate(() => _stopMk()); await adv(pg, 300);
    /* 예시를 바꾸면 신랑 줄은 뒤에서 먼저 만든다(EX_FIRST «준비 중») — ▶ 는 차오르지 않고 «준비 중» 알약이 그 일의 시계로 차오른다 */
    await tap(f, '[data-fk="mkex:guest:1"]'); const sp = []; for (let i = 0; i < 6; i++) { await adv(pg, 400); sp.push(await CARD(f, 'g0')); }
    await SHOT(pg, f, '2-준비중', '[data-fk="mkvpl:g0"]');
    const pr = sp.filter((x) => /준비 중/.test(x.pill));
    ok('2 «준비 중» 동안 ▶ 차오름 없음 · 알약 prep 이 차오른다(--d 시계) [PLAY_NO_DUP · PREP_FILL]', pr.length >= 2 && pr.every((x) => !x.fill && (x.dis || x.off) && /\bprep\b/.test(x.pillCls) && /--d:[\d.]+s;--dl:-[\d.]+s/.test(x.pillSty)), JSON.stringify(sp));
    const l = await ALL(f, 'guest');
    ok('2 이 순간 전체 듣기 — 신부 줄을 만들 수 없어 흐림', l.off && l.ad === 'true', JSON.stringify(l));
  } },
  /* ── 3 ── 두 분 목소리 · 글을 고친 두 줄 — 줄 ▶ 는 흐림(«오른쪽 목소리 만들기…») · 머리 알약을 누르면 «만드는 중»은 알약만 차오른다 */
  { no: 3, async run({ pg, f }) {
    if (await fillAll(pg, f) < 0) { ok('3 상태 만들기 — 하객 맞이 넷 AI 로 채우기', false); return; }
    await edit(f, ['g2', 'g3']); await adv(pg, 800);
    const g2 = await CARD(f, 'g2'); await tap(f, '[data-fk="mkvpl:g2"]'); await adv(pg, 600); const g2b = await CARD(f, 'g2');
    const n2 = await mkOps(pg, MARK.trim()), g2m = await f.evaluate(() => ({ mk: !!MK_UP.g2, m: _aiMode('g2') }));
    ok('3 고친 줄(머리 «목소리 만들기») ▶ = 흐림 · 누르면 «오른쪽 목소리 만들기를 누르면 들을 수 있어요» · 만들지 않는다 [AI_PLAY_READY]', g2.off && /목소리 만들기/.test(g2.pill) && /^오른쪽 .*목소리 만들기.*를 누르면 들을 수 있어요$/.test(g2b.hint) && !g2b.go && !n2 && !g2m.mk && g2m.m === 'need', JSON.stringify({ g2, g2b, n2, g2m }));
    await tap(f, '.mk-aip[data-key="g2"]'); await adv(pg, 1500); const g2c = await CARD(f, 'g2');
    await SHOT(pg, f, '3-만드는중', '[data-fk="mkvpl:g2"]');
    ok('3 머리 알약 «만드는 중» — 알약만 차오르고 ▶ 는 흐리게 잠김(차오름 없음) [PLAY_NO_DUP]', /만드는 중/.test(g2c.pill) && /\bmake\b/.test(g2c.pillCls) && g2c.dis && !g2c.fill && !g2c.hint, JSON.stringify(g2c));
    await until(pg, f, () => _aiMode('g2') === 'keep', 60000); const g2d = await CARD(f, 'g2');
    ok('3 다 되면 ▶ 가 풀린다', !g2d.off && !g2d.dis, JSON.stringify(g2d));
  } },
  /* ── 4 ── 두 분 목소리 · 고친 줄 둘 — 이 순간 전체 듣기를 누르면 한꺼번에 만들고 다 되면 처음부터 이어서 */
  { no: 4, async run({ pg, f }) {
    if (await fillAll(pg, f) < 0) { ok('4 상태 만들기 — 하객 맞이 넷 AI 로 채우기', false); return; }
    await edit(f, ['g2', 'g3']); await adv(pg, 800);
    const l0 = await ALL(f, 'guest'), m0 = await ops(pg, 'make'), p0 = await plays(f);
    ok('4 고친 줄이 있어도 이 순간 전체 듣기는 누를 수 있다(만들 수 있는 줄) [LS_MAKE_ALL]', l0.has && !l0.off && !l0.dis, JSON.stringify(l0));
    await tap(f, '.mk-hbtn[data-mp="guest"]'); await adv(pg, 800);
    const l1 = await ALL(f, 'guest'), c2 = await CARD(f, 'g2'), c3 = await CARD(f, 'g3');
    await SHOT(pg, f, '4-한꺼번에', '.mk-hbtn[data-mp="guest"]');
    ok('4 누르면 고친 두 줄이 함께 «만드는 중» · 단추 «만드는 중»(차오름) · 아래 «잠시만 기다려 주세요 · 다 만들면 이어서 들려 드려요» [LS_MAKE_ALL]',
      /만드는 중/.test(l1.txt) && l1.dis && l1.fill && l1.hint === '잠시만 기다려 주세요 · 다 만들면 이어서 들려 드려요' && /만드는 중/.test(c2.pill) && /만드는 중/.test(c3.pill) && !c2.fill && !c3.fill && (await mkOps(pg, MARK.trim())) === 2, JSON.stringify({ l1, c2, c3, n: await mkOps(pg, MARK.trim()) }));
    const t = await until(pg, f, () => LP.q.length > 0 && LP.range && LP.range.ks[0] === 'guest', 120000);
    const a = await f.evaluate(() => ({ q: LP.q.map((x) => x.up || x.lab), i: LP.i, lsMake: !!(MK.lsMake || {}).guest, hint: [...document.querySelectorAll('.mk-ploff')].length, el: !!(LP.el && LP.el.getAttribute('src')) }));
    ok('4 다 만들면 처음부터 이어서 튼다(네 줄 · 안내 걷힘) [LS_MAKE_ALL]', t > -1 && a.q.length === 4 && a.i === 0 && !a.lsMake && !a.hint && a.el, JSON.stringify({ t, a }));
    await f.evaluate(() => lsStop()); await adv(pg, 300);
  } },
  /* ── 5 ── 한꺼번에 만들다 한 줄이 실패 — 틀지 않고 «만들지 못한 줄이 있어요 · 그 줄 아래를 봐 주세요» · 그 줄 아래 코드 · 다시 누르면 다시 */
  { no: 5, async run({ pg, f }) {
    if (await fillAll(pg, f) < 0) { ok('5 상태 만들기 — 하객 맞이 넷 AI 로 채우기', false); return; }
    await edit(f, ['g2']); await f.evaluate(() => { mkSlText('g3', 0, _slLines('g3')[0][1] + ' 꼭 와 주세요.'); render(); }); await adv(pg, 800);
    await pg.evaluate(() => { __SV.faults.push({ op: 'make', nth: '*', kind: 'json', lat: 3000, text: '꼭 와 주세요', body: { ok: false, ecode: 'V0', error: '이 글로는 목소리를 만들지 못했어요 (코드 V0)' } }); });   // 몰림(V1)은 중계가 한 번 더 묻는다 — 늘 거절하는 답으로
    const p0 = await plays(f);
    await tap(f, '.mk-hbtn[data-mp="guest"]'); await until(pg, f, () => !(MK.lsMake || {}).guest, 120000); await adv(pg, 500);
    const l = await ALL(f, 'guest'), c3 = await CARD(f, 'g3'), q = await f.evaluate(() => LP.q.length);
    if (VERB) console.log('     make log', JSON.stringify(await pg.evaluate(() => __SV.log.filter((x) => x.op === 'make').slice(-4).map((x) => ({ f: x.f, t: x.text.slice(-20), lines: x.lines && x.lines.map((l) => String(l[1]).slice(-14)) })))), JSON.stringify(await pg.evaluate(() => __SV.faults)));
    await SHOT(pg, f, '5-실패', '.mk-hbtn[data-mp="guest"]');
    ok('5 한 줄이라도 못 만들면 틀지 않고 «만들지 못한 줄이 있어요 · 그 줄 아래를 봐 주세요» · 그 줄 아래 까닭(코드) [LS_MAKE_ALL]', l.hint === '만들지 못한 줄이 있어요 · 그 줄 아래를 봐 주세요' && /\(코드 V0\)/.test(c3.err) && !q && (await plays(f)) === p0 && !l.off, JSON.stringify({ l, c3, q }));
    await pg.evaluate(() => { __SV.faults.length = 0; }); await tap(f, '.mk-hbtn[data-mp="guest"]'); const t = await until(pg, f, () => LP.q.length > 0, 120000);
    ok('5 다시 누르면 못 만든 줄을 다시 만들고 이어서 튼다', t > -1, String(t));
    await f.evaluate(() => lsStop()); await adv(pg, 300);
  } },
  /* ── 6 ── 맞추기가 남은 분(VOICE_TUNE) — 이 순간 전체 듣기는 머리 알약처럼 그 창부터(만들지 않는다) */
  { no: 6, async run({ pg, f }) {
    if (await fillAll(pg, f) < 0) { ok('6 상태 만들기 — 하객 맞이 넷 AI 로 채우기', false); return; }
    await edit(f, ['g0']); await f.evaluate(() => { S.vsetNeed = { groom: 1 }; render(); }); await adv(pg, 500);
    const who = await f.evaluate(() => _vcLineWho('g0')); if (who !== 'groom') await f.evaluate(() => { S.vsetNeed = { bride: 1 }; render(); });
    await tap(f, '.mk-hbtn[data-mp="guest"]'); await adv(pg, 1200);
    const a = await f.evaluate(() => ({ tune: VC.tune ? VC.tune.who : '', lsMake: !!(MK.lsMake || {}).guest, mk: !!MK_UP.g0 }));
    ok('6 맞추기가 남은 분의 줄이 있으면 그 창부터 · 만들기 요청 없음 [LS_MAKE_ALL · VOICE_TUNE]', !!a.tune && !a.lsMake && !a.mk && !(await mkOps(pg, MARK.trim())), JSON.stringify(a));
  } },
];

for (const sc of SC) {
  if (ONLY.length && !ONLY.includes(String(sc.no))) continue;
  let B = null;
  try {
    B = await boot(sc);
    await sc.run(B);
    ok(`${sc.no} 화면 오류 없음`, !B.errs.length, B.errs.slice(0, 2).join(' | '));
  } catch (e) { console.log(`멈춤 ${sc.no} — ${String(e.message).split('\n')[0]}`); fail++; }
  if (B) await B.ctx.close();
}
await br.close(); srv.close();
if (!cnt) { console.log('못 쟀다 — 장면이 하나도 돌지 않았다'); process.exit(2); }
console.log(fail ? `✗ AI_PLAY_READY 실패 ${fail}건` : '✓ AI_PLAY_READY 통과'); process.exit(fail ? 1 : 0);
