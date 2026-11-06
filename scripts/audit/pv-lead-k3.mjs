#!/usr/bin/env node
/* ★★[PV_LEAD_NOCLAP_1106 · K3_SHORT_1106 2026-11-06] 두 결정을 엔진 · 당일 콘솔 · 식순 화면에서 잰다(깨 보기 포함)
   ① [PV_LEAD_NOCLAP_1106 · J_A A11 · B2-쉼01 · 청취 확인] 박수를 청하지 않는 개식(칩 1 ~ 5)에 사슬로 붙는 식전 영상 소개(narr-prevideo-in)는
      뜸(goLeadMs 3초)을 얹지 않는다 — 당일 콘솔 기다림 = 사슬 3초 + 뜸 3초 ≈ 6초였다 → 3초.
      박수를 청하는 개식(칩 0 · 디렉터 GO) · 고객 미리 듣기 칩 0(사슬 4.5초)은 그대로 뜸 3초 · 그 밖 큐의 뜸은 그대로.
      실브라우저: 당일 콘솔(console.html)에서 개식 클립 끝 → 소개 클립 시작을 잰다(칩 2 · 3 · 4).
   ② [K3_SHORT_1106 결정 K3 · D03] 예상 본식(넉넉 합 가운데)이 10분 미만이면 10분 전 안내 299 · 345 대신 299s · 345s(guest-w-10m-n10-short · -meal) ·
      10분 이상은 종전 판(n10 · n15 · n20 ± meal) · 글은 결정 문안 그대로 · 화면(식순 화면 하객 맞이 10분 전 줄 · 전체 대본)에도 같은 글 · 녹음 대기(새 문장 하나).
   깨 보기: 엔진 사본을 고쳐(뜸 조건 지움 · 박수 판 조건 지움 · 짧은 판 고르기 지움) 각각 빨강이 나는지 본다.
   node scripts/audit/pv-lead-k3.mjs [--fast = 브라우저 없이]   종료 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import os from 'node:os'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const P = (r) => path.join(ROOT, r);
const FAST = process.argv.includes('--fast');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 500)}`); if (!c) fail++; };
const O = require(P('assets/ritual-open.js')); require(P('assets/ritual-data.js'));
const CUE_SRC = fs.readFileSync(P('assets/ritual-cue.js'), 'utf8');
const loadCue = (src) => { if (src == null) return require(P('assets/ritual-cue.js')); const d = fs.mkdtempSync(path.join(os.tmpdir(), 'pvk3-'));   /* 깨 보기 사본 — 옆 파일(ritual-data · ritual-open)도 함께 둔다 */
  ['ritual-data.js', 'ritual-open.js'].forEach((n) => fs.copyFileSync(P('assets/' + n), path.join(d, n))); fs.writeFileSync(path.join(d, 'ritual-cue.js'), src); return require(path.join(d, 'ritual-cue.js')); };

/* ── ① 엔진 — 개식 칩마다 개식 → 다음 큐 */
const TEXT_299S = '십 분 뒤 본식을 시작하겠습니다. 본식을 마친 뒤에는 기념 촬영이 있습니다.';
const TEXT_345S = TEXT_299S + ' 식사는 촬영 뒤에 함께합니다.';
function pvRows(C) {
  const out = [];
  for (const on of [{ prevideo: 1 }, { prevideo: 1, candle: 1 }]) for (const digital of [0, 1]) for (const mode of ['console', 'preview']) for (let n = 0; n < 6; n++) {
    const r = C.build({ course: 'open', on, digital, narEx: { open: n } }, { mode }), i = r.cues.findIndex((c) => c.slug === 'narr-open'), o = r.cues[i] || {}, x = r.cues[i + 1] || {};
    out.push({ tag: `${mode} ${JSON.stringify(on)}${digital ? ' 디지털' : ''} 칩${n}`, mode, n, clap: !!(o.live && o.live.applause), slug: x.slug, fire: x.fire, gap: x.gapMs || 0, lead: x.goLeadMs || 0, duck: x.duck, odk: o.duck });
  }
  return out;
}
/* 당일 콘솔이 기다리는 값(console.html 의 셈과 같다 — 사슬이면 gapMs, GO 면 사람 · 뒤에 뜸 max(내림 필요 ? fadeMs : 0, goLeadMs) · 개식이 −90 이라 내림 필요 없음) */
const waitMs = (x) => (x.fire === 'chain' ? x.gap : 0) + x.lead;
function pvCheck(C, label) {
  const rows = pvRows(C), bad = [];
  rows.forEach((x) => {
    if (x.slug !== 'narr-prevideo-in') { bad.push(x.tag + ' 다음 큐 ' + x.slug); return; }
    if (x.mode === 'console' && x.n === 0) { if (!(x.clap && x.fire === 'manual' && x.lead === 3000)) bad.push(x.tag + ' 박수 GO 판 바뀜 ' + JSON.stringify(x)); return; }
    if (x.mode === 'preview' && x.n === 0) { if (!(x.fire === 'chain' && x.gap === 4500 && x.lead === 3000)) bad.push(x.tag + ' 미리 듣기 박수 판 바뀜 ' + JSON.stringify(x)); return; }
    if (!(x.fire === 'chain' && x.gap === 3000 && x.lead === 0 && x.duck === -90 && x.odk === -90 && waitMs(x) <= 3000)) bad.push(x.tag + ' 기다림 ' + waitMs(x) + 'ms ' + JSON.stringify(x));
  });
  if (label) ok(label, !bad.length, bad.slice(0, 4));
  return bad.length;
}
const C = loadCue();
pvCheck(C, '① [PV_LEAD_NOCLAP_1106] 박수 없는 개식(칩 1 ~ 5) → 식전 영상 소개 기다림 3초(사슬 3 · 뜸 0) · 박수 GO 판(칩 0)과 미리 듣기 칩 0 은 뜸 3초 그대로 · 화촉 · 디지털 날도');
{ /* 그 밖 큐의 뜸은 그대로 — 영상 없는 날 화촉 첫 큐 6초 · 닫는 인사 3초 */
  const r = C.build({ course: 'open', on: { candle: 1 }, narEx: { open: 2 } }, { mode: 'console' }), i = r.cues.findIndex((c) => c.slug === 'narr-open'), cd = r.cues.slice(i + 1).find((c) => c.k === 'candle' && !/^bridge-/.test(c.slug || '')) || {};
  const cb = r.cues.find((c) => c.slug === 'narr-close-bow') || {};
  ok('① 다른 자리 그대로 — 영상 없는 날 화촉 첫 큐 뜸 6초(−8) · 닫는 인사 뜸 3초', cd.goLeadMs >= 6000 && cd.leadDb === -8 && cb.goLeadMs === 3000, { cd: [cd.slug, cd.goLeadMs, cd.leadDb], cb: cb.goLeadMs });
}
/* 콘솔 셈이 이 검사의 모델과 같은가 — 줄이 바뀌면 여기를 다시 맞춘다 */
{ const con = fs.readFileSync(P('console.html'), 'utf8');
  ok('① 콘솔 셈 = 사슬 gapMs 뒤 · 뜸 max(내림 필요 ? fadeMs : 0, goLeadMs)', con.includes('var _lead = Math.max(_need ? _dms : 0, c.goLeadMs || 0);') && con.includes('_gap = nx ? (nx.gapNone ? 0 : (nx.gapMs || PARAM.gapMs)) : 0;') && con.includes('if (_lead) later(_run, _lead); else _run();')); }
/* 깨 보기 — 뜸 조건을 지우면(옛 판) 칩 1 ~ 5 가 빨강 · 박수 글 조건을 지우면 미리 듣기 칩 0 이 빨강 */
{ const m1 = CUE_SRC.replace('if (!_pvNoClap) _pc.goLeadMs', '_pc.goLeadMs');
  const m2 = CUE_SRC.replace("_pc.fire === 'chain' && !(_pp.live && _pp.live.applause) && _pp.duck <= -60;", '_pp.duck <= -60;');
  ok('① 깨 보기 — 뜸 조건을 지운 판(옛 6초)은 빨강', m1 !== CUE_SRC && pvCheck(loadCue(m1)) > 0);
  ok('① 깨 보기 — 박수(GO) 판 조건을 지운 판(칩 0 뜸 빠짐)은 빨강', m2 !== CUE_SRC && pvCheck(loadCue(m2)) > 0); }

/* ── ② K3 — 예상 본식 10분 미만이면 299s · 345s */
const MOM = ['candle', 'welcome', 'vow', 'ring', 'declare', 'free', 'letter', 'song', 'tribute', 'toast', 'table', 'prevideo'];
function combos() { const out = []; for (let m = 0; m < 1 << 7; m++) { const on = {}; MOM.slice(0, 7).forEach((k, j) => { if (m & (1 << j)) on[k] = 1; }); out.push({ course: 'open', on }); out.push({ course: 'open', on: Object.assign({ song: 1, tribute: 1 }, on) }); } O.EXAMPLES.forEach((e) => { const S = O.applyExample({ course: 'open' }, e.k); S.course = 'open'; out.push(S); }); return out; }
function k3Check(C, label) {
  const bad = []; let nS = 0, nL = 0;
  for (const S0 of combos()) for (const meal of [0, 1]) {
    const S = Object.assign({}, S0, meal ? { meal: 1, mealFull: 1 } : {}), b = O.bodySec(S), avg = (b[0] + b[1]) / 2, short = avg < 600;
    const want = short ? 'guest-w-10m-n10-short' + (meal ? '-meal' : '') : 'guest-w-10m-n' + Math.max(10, Math.min(20, Math.round((avg / 60) / 5) * 5)) + (meal ? '-meal' : '');
    const pick = C.guestPick(S, 1), cue = C.build(S, { mode: 'console' }).cues.find((c) => /^guest-w-10m-/.test(c.slug || '')) || {};
    if (short) nS++; else nL++;
    if (pick !== want || cue.slug !== want || cue.text !== C.EXTRA[want]) bad.push({ on: Object.keys(S.on || {}).join(','), meal, avg: Math.round(avg), want, pick, cue: cue.slug });
  }
  if (label) ok(label + ` (짧은 판 ${nS} · 10분 이상 ${nL})`, !bad.length && nS > 0 && nL > 0, bad.slice(0, 3));
  return bad.length + (nS && nL ? 0 : 1);
}
const C2 = C;
ok('② [K3_SHORT_1106] 글 = 결정 문안 그대로(299s · 345s) · 소리 번호 348 · 349 · 녹음 대기(파일 없음)',
  C2.EXTRA['guest-w-10m-n10-short'] === TEXT_299S && C2.EXTRA['guest-w-10m-n10-short-meal'] === TEXT_345S && C2.fileOf('guest-w-10m-n10-short') === '348_guest-w-10m-n10-short' && C2.fileOf('guest-w-10m-n10-short-meal') === '349_guest-w-10m-n10-short-meal'
  && !C2.RETIRED['guest-w-10m-n10-short'] && !/약 /.test(TEXT_299S) && C2.EXTRA['guest-w-10m-n10'] === '십 분 뒤 본식을 시작하겠습니다. 약 십 분간 진행되고, 마친 뒤에는 기념 촬영이 있습니다.',
  [C2.EXTRA['guest-w-10m-n10-short'], C2.EXTRA['guest-w-10m-n10-short-meal']]);
k3Check(C2, '② 10분 전 판 고르기 — 예상 본식 10분 미만 = short(± 식사) · 10분 이상 = 종전 n10 · n15 · n20(± 식사) · 큐 · 화면 글 같음');
{ const bS = O.applyExample({ course: 'open' }, 'brief'); bS.course = 'open'; const pv = C2.build(bS, { mode: 'preview' }).cues.find((c) => /^guest-w-10m-/.test(c.slug || '')) || {};
  ok('② 예시 «간결»(본식 약 9분) — 미리 듣기 큐도 299s 글', pv.slug === 'guest-w-10m-n10-short' && pv.text === TEXT_299S, [pv.slug, pv.text]); }
{ const m3 = CUE_SRC.replace("(guestShort(S) ? 'guest-w-10m-n10-short' : 'guest-w-10m-n' + guestMinOf(S))", "('guest-w-10m-n' + guestMinOf(S))");
  ok('② 깨 보기 — 짧은 판 고르기를 지운 판(옛 299 · 345)은 빨강', m3 !== CUE_SRC && k3Check(loadCue(m3)) > 0); }
{ const red = fs.readFileSync(P('docs/plans/식순연구/타입캐스트/재더빙_리드보강.txt'), 'utf8'), all = fs.readFileSync(P('docs/plans/식순연구/타입캐스트/다시받기/0_전체_화자표기.txt'), 'utf8').split('\n');
  /* 이미 받은 두 문장(«십 분 뒤 …» · «식사는 촬영 뒤에 …»)은 창고에서 빌려 왔다(sent-lib --borrow) — 다시 받는 것은 새 문장 하나 */
  ok('② 녹음 대기 명단에 348 · 349 · 다시받기(전체)에는 진희 새 문장 한 줄만', /\[348\] guest-w-10m-n10-short/.test(red) && /\[349\] guest-w-10m-n10-short-meal/.test(red) && all.filter((l) => l.trim() === '진희: 본식을 마친 뒤에는 기념 촬영이 있습니다.').length === 1 && !all.some((l) => /십 분 뒤 본식을 시작하겠습니다|식사는 촬영 뒤에 함께합니다/.test(l))); }

/* ── 실브라우저 — 당일 콘솔 기다림 · 식순 화면 글 */
if (!FAST) {
  let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
  if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
  const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp4': 'video/mp4' };
  /* 개식 클립(20초 넘는 판도 있다)은 0.6초 시험음으로 — 재는 것은 클립 «뒤» 기다림(사슬 · 뜸)이다 */
  const sr = 16000, nS = Math.round(sr * 0.6), WAV = Buffer.alloc(44 + nS * 2); WAV.write('RIFF', 0); WAV.writeUInt32LE(36 + nS * 2, 4); WAV.write('WAVEfmt ', 8); WAV.writeUInt32LE(16, 16); WAV.writeUInt16LE(1, 20); WAV.writeUInt16LE(1, 22); WAV.writeUInt32LE(sr, 24); WAV.writeUInt32LE(sr * 2, 28); WAV.writeUInt16LE(2, 32); WAV.writeUInt16LE(16, 34); WAV.write('data', 36); WAV.writeUInt32LE(nS * 2, 40);
  for (let i = 0; i < nS; i++) WAV.writeInt16LE(Math.round(6000 * Math.sin(2 * Math.PI * 330 * i / sr)), 44 + i * 2);
  const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]), f = path.join(ROOT, u);
    if (/^\/assets\/audio\/narration\/\d+_narr-open[^/]*\.mp3$/.test(u)) { r.writeHead(200, { 'Content-Type': 'audio/wav' }); r.end(WAV); return; }
    fs.readFile(f, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(f)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
  let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
  const ctx = await br.newContext({ viewport: { width: 1280, height: 900 } });
  const pageOf = async (u) => { const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.addInitScript(() => { window.__ME_PREVIEW_GUARD_TEST_OFF = true; window.__pl = [];
      const pl = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { const el = this, s = String(el.src || el.currentSrc || '');
        if (/\/narration\//.test(s)) { window.__pl.push({ ev: 'play', s, t: performance.now() }); if (!el.__pvk3) { el.__pvk3 = 1; el.addEventListener('ended', () => window.__pl.push({ ev: 'end', s: String(el.currentSrc || el.src || ''), t: performance.now() })); } }
        return pl.apply(this, arguments); }; });
    await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: '{"ok":true}' })));
    await pg.goto(u); await pg.waitForTimeout(1200); return { pg, errs }; };
  try {
    for (const n of [2, 3, 4]) {
      const S = { course: 'open', on: { prevideo: 1 }, narEx: { open: n } };
      const { pg, errs } = await pageOf(`http://127.0.0.1:${port}/console.html?S=${encodeURIComponent(Buffer.from(JSON.stringify(S)).toString('base64'))}`);
      await pg.click('#go').catch(() => {}); await pg.waitForTimeout(700);   /* 설정 화면 «시작» → 큐 목록 */
      const iOpen = await pg.evaluate(() => (window.__bgmR ? window.__bgmR() : []).findIndex((c) => c.slug === 'narr-open'));
      if (iOpen < 0) { ok(`① 콘솔 칩${n} — 개식 큐를 찾는다`, false, errs); await pg.close(); continue; }
      await pg.evaluate((i) => window.__bgmGo.fire(i), iOpen);
      await pg.waitForFunction(() => /narr-open/.test(aNarr.src || '') && !aNarr.paused, null, { timeout: 15000 }).catch(() => {});
      await pg.evaluate(() => { aNarr.addEventListener('ended', () => window.__pl.push({ ev: 'aend', s: String(aNarr.src), t: performance.now() }), { once: true }); });   /* 끝 = 콘솔 재생기(aNarr)의 ended */
      await pg.waitForFunction(() => window.__pl.some((x) => x.ev === 'play' && /narr-prevideo-in/.test(x.s)), null, { timeout: 15000 }).catch(() => {});
      const L = await pg.evaluate(() => window.__pl);
      const end = L.find((x) => x.ev === 'aend' && /narr-open/.test(x.s)), st = L.find((x) => x.ev === 'play' && /narr-prevideo-in/.test(x.s)), ms = end && st ? Math.round(st.t - end.t) : null;
      ok(`① 당일 콘솔 실측 칩${n} — 개식 끝 → 영상 소개 시작 ${ms}ms(목표 약 3초 · 파일 앞뒤 무음을 뺀 사슬 · 옛 판 약 6초)`, ms != null && ms >= 1500 && ms <= 3600, { L: L.map((x) => x.ev + ':' + x.s.split('/').pop()), errs });
      await pg.close();
    }
    /* 식순 화면 — 미리 듣기 쉼(이미 맞다 · 뜸을 읽지 않는다) · 하객 맞이 10분 전 줄 · 전체 대본 */
    const { pg, errs } = await pageOf(`http://127.0.0.1:${port}/order-preview.html`);
    await pg.waitForFunction(() => typeof ENG !== 'undefined' && ENG && ENG.RitualCue, null, { timeout: 20000 }).catch(() => {});
    const pvG = await pg.evaluate(() => [0, 1, 2, 3, 4, 5].map((n) => { S.on = { prevideo: 1 }; S.narEx = { open: n }; const q = _lSteps(ENG, ['guest', 'prevideo']), i = q.findIndex((x) => /^narr-prevideo-in/.test(x.slug || '') && !x.lead);
      return i > 0 && q[i - 1].slug === 'narr-open' ? _lGapOf(q, i, q[i - 1], q[i], true).gap : null; }));
    ok(`① 미리 듣기(식순 화면) 개식 → 소개 쉼 ${pvG.join(' · ')}ms — 3초 이하 · 칩과 상관없이 같다(엔진 뜸 goLeadMs 를 읽지 않는다 · 음악이 있으면 3초 하한)`,
      pvG.every((g) => g != null && g <= 3000 && g === pvG[0]) && !/goLeadMs/.test(fs.readFileSync(P('order-preview.html'), 'utf8')) && !/goLeadMs/.test(fs.readFileSync(P('assets/bgm-bed.js'), 'utf8')), pvG);
    const scr = await pg.evaluate((ex) => { const bS = RitualOpen.applyExample({ course: 'open' }, 'brief'); bS.course = 'open'; Object.keys(S).forEach((k) => { delete S[k]; }); Object.assign(S, bS);
      const f = (typeof _fixSteps === 'function' ? _fixSteps('pre') : [])[1] || {}; let all = ''; try { all = scriptTextOpen(); } catch (e) { all = 'ERR ' + e.message; }
      return { ten: f.tx || '', all: all.indexOf(ex) > -1, old: /약 십 분간/.test(all) }; }, TEXT_299S);
    ok('② 식순 화면 — 하객 맞이 «10분 전» 줄 · 전체 대본 = 299s 글(«약 십 분간» 없음)', scr.ten === TEXT_299S && scr.all && !scr.old, { scr, errs });
    await pg.close();
  } finally { await br.close(); srv.close(); }
}
console.log(fail ? `\nPV_LEAD_K3 실패 ${fail}` : '\nPV_LEAD_K3 OK');
process.exit(fail ? 1 : 0);
