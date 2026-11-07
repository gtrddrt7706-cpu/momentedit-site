#!/usr/bin/env node
// ★★[RA5_RULES 2026-11-07 규칙 감사 · 식순 엔진 몸(기술 수정만) · 재검증 재수정]
//   ① [RA5_PREVIEW_FADE] 미리 듣기는 정적(wait)만 1.2초로 줄이고 음악 페이드(post 의 ms)는 4초까지 실제 값 그대로 · 콘솔은 그대로
//   ② [RA5_TABLE_EACH] 콘솔 지문 «테이블마다 …» = tableSecOf 와 같은 원천(줄었으면 «약 45초») · 장면 열쇠(live.t)는 그대로
//   ③ [RA5_TABLE_NOTE] 식순 화면에서 글을 길게 써서 테이블 인사가 줄면 아래 알림 한 번(20자 안 · 같은 값이면 다시 안 뜸 · 다시 늘면 말없이)
//   기준(무엇을 몇 초로 줄이나 · 본식 상한)은 바꾸지 않는다 — 알림 · 표시 · 미리 듣기 재현만 잰다.
//   --selftest = 옛 동작(페이드 1.2초 · 지문 고정 · 알림 없음)을 흉내 내 빨강으로 읽는지 본다
//   종료 코드 0 통과 · 1 실패 · 2 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const SELF = process.argv.includes('--selftest');
const O = require(path.join(ROOT, 'assets/ritual-open.js')), C = require(path.join(ROOT, 'assets/ritual-cue.js')), ST = require(path.join(ROOT, 'assets/ritual-story.js'));

/* ── 엔진 판정(옛 동작을 넣어 깨 볼 수 있게 함수로) */
const exS = (k, add) => { const S = O.applyExample({ course: 'open' }, k); S.course = 'open'; return Object.assign(S, add || {}); };
const COURSES = [['damback', { course: 'damback', bless: 'on' }], ['festive', { course: 'festive' }], ['open:standard', exS('standard')],
  ['open:full', (() => { const S = exS('standard'); S.on = Object.assign({}, S.on, { letter: 1, declare: 1, table: 1, toast: 1 }); return S; })()]];
const cp = (x) => JSON.parse(JSON.stringify(x));
function engineFails(P, eachTxt) {
  const F = [];
  if (P.previewWaitMs !== 1200) F.push('정적 상한 1200 아님 ' + P.previewWaitMs);
  if (P.previewFadeMs !== 4000) F.push('페이드 상한 4000 아님 ' + P.previewFadeMs);
  const rows = {};
  for (const [nm, S] of COURSES) {
    const pv = C.build(cp(S), { mode: 'preview' }).cues, co = C.build(cp(S), { mode: 'console' }).cues;
    let before = 0, after = 0;
    pv.forEach((c) => (c.post || []).forEach((st) => {
      if (st.wait) { const want = Math.min(st.fullWait || st.wait, P.previewWaitMs); if (st.wait !== want) F.push(`${nm} ${c.slug} 정적 ${st.wait} ≠ ${want}`); before += Math.min(st.fullWait || st.wait, 1200); after += st.wait; }
      if (st.ms) { const want = Math.min(st.fullMs || st.ms, P.previewFadeMs); if (st.ms !== want) F.push(`${nm} ${c.slug} 페이드 ${st.ms} ≠ ${want}(실제 ${st.fullMs || st.ms})`); before += Math.min(st.fullMs || st.ms, 1200); after += st.ms; }
    }));
    rows[nm] = [before, after];
    /* 콘솔은 그대로 — 표시가 없고 실제 값이 PARAM 그대로 */
    if (co.some((c) => (c.post || []).some((s) => s.fullWait || s.fullMs))) F.push(nm + ' 콘솔까지 줄였다');
    const ro = co.find((c) => c.slug === 'narr-ring-out'), le = co.find((c) => c.slug === 'narr-letter-end');
    if (ro && !(ro.post || []).some((s) => s.ms === C.PARAM.declare.preFadeMs)) F.push(nm + ' 콘솔 선언 앞 내리기 ≠ ' + C.PARAM.declare.preFadeMs);
    if (le && !(le.post || []).some((s) => s.music === 'next' && s.ms === C.PARAM.letter.musicUpMs)) F.push(nm + ' 콘솔 편지 뒤 오르기 ≠ ' + C.PARAM.letter.musicUpMs);
    const pro = pv.find((c) => c.slug === 'narr-ring-out'), ple = pv.find((c) => c.slug === 'narr-letter-end');
    if (pro && !(pro.post || []).some((s) => s.music && s.ms === Math.min(C.PARAM.declare.preFadeMs, P.previewFadeMs))) F.push(nm + ' 미리 듣기 선언 앞 내리기가 실제(4초)와 다르다');
    if (ple && !(ple.post || []).some((s) => s.music === 'next' && s.ms === Math.min(C.PARAM.letter.musicUpMs, P.previewFadeMs))) F.push(nm + ' 미리 듣기 편지 뒤 오르기가 실제(4초)와 다르다');
  }
  /* 콘솔 지문 — 줄인 날 실제 초 · 안 줄인 날 종전 글 · 장면 열쇠 그대로 */
  const t = cp(exS('standard')); t.on = { prevideo: 1, candle: 1, welcome: 1, vow: 1, ring: 1, free: 1, table: 1 }; t.tx = { 'vow.g': '가'.repeat(600), 'vow.b': '나'.repeat(600) };
  const u = cp(exS('standard')); u.on = { prevideo: 1, vow: 1, table: 1 };
  const tbOf = (S) => C.build(C.norm(cp(S))).cues.find((x) => x.live && /테이블을 돌며/.test(x.live.t || ''));
  const a = tbOf(t), b = tbOf(u), per = O.tableSecOf(C.norm(cp(t))) / O.tableN(t);
  const tx = eachTxt(a, t), m = /테이블마다 약 (?:(\d+)분 ?)?(?:(\d+)초)?/.exec(tx || ''), sec = m ? (+(m[1] || 0)) * 60 + (+(m[2] || 0)) : -1;
  if (!(O.tableCut(t) > 0)) F.push('시험 판이 테이블 인사를 줄이지 않는다(판을 다시 고를 것)');
  if (Math.abs(sec - per) > 2.5) F.push(`콘솔 지문 «${tx}» ≠ tableSecOf ÷ 테이블 수 ${per}초`);
  if (a && a.live.est !== O.tableSecOf(C.norm(cp(t)))) F.push('콘솔 테이블 인사 시간 ≠ tableSecOf');
  if (!a || !ST.liveOf || !ST.liveOf(a)) F.push('장면 열쇠(live.t)가 끊겼다');
  if (b && (eachTxt(b, u) || '').indexOf('테이블마다 1분 30초쯤') < 0) F.push('안 줄인 날 지문이 종전 글이 아니다');
  return { F, rows, tx, per };
}
const eachNow = (c) => c && c.live ? (c.live.tv || c.live.t) : '';
const eachOld = (c) => c && c.live ? c.live.t : '';   // 옛 동작 — 늘 «1분 30초쯤»

let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

if (SELF) {
  /* 옛 동작 ① — 페이드를 정적 상한(1.2초)으로 자른 판을 흉내 */
  const realBuild = C.build;
  C.build = (S, o) => { const r = realBuild(S, o); if (o && o.mode === 'preview') r.cues.forEach((c) => (c.post || []).forEach((st) => { if (st.ms) st.ms = Math.min(st.fullMs || st.ms, 1200); })); return r; };
  const e1 = engineFails(C.PARAM, eachNow); C.build = realBuild;
  ok('selftest 옛 페이드(1.2초)를 빨강으로 읽는다', e1.F.some((x) => /페이드|실제\(4초\)/.test(x)), e1.F.join(' | '));
  const e2 = engineFails(C.PARAM, eachOld);
  ok('selftest 옛 지문(«1분 30초쯤» 고정)을 빨강으로 읽는다', e2.F.some((x) => /콘솔 지문/.test(x)), e2.F.join(' | '));
  const e3 = engineFails(C.PARAM, eachNow);
  ok('selftest 지금 판은 초록', !e3.F.length, e3.F.join(' | '));
} else {
  const e = engineFails(C.PARAM, eachNow);
  ok('[RA5_PREVIEW_FADE] 미리 듣기 정적만 1.2초 · 페이드 4초까지 실제 값 · 콘솔 그대로', !e.F.filter((x) => !/지문|열쇠|테이블/.test(x)).length, e.F.join(' | '));
  console.log('     미리 듣기 뒤처리 합(옛 1.2초 자름 → 지금): ' + Object.entries(e.rows).map(([k, [b, a]]) => `${k} ${(b / 1000).toFixed(1)} → ${(a / 1000).toFixed(1)}초`).join(' · '));
  ok(`[RA5_TABLE_EACH] 콘솔 지문 «${e.tx.replace(/^.*?(테이블마다[^·]*).*$/, '$1').trim()}» = tableSecOf ÷ 테이블 수(${e.per}초) · 장면 열쇠 그대로 · 안 줄인 날 종전 글`, !e.F.filter((x) => /지문|열쇠|테이블/.test(x)).length, e.F.join(' | '));
}

/* ── 화면(390) — 서약 글을 길게 쓰면 알림 한 번 */
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음(엔진만 쟀다)'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (er, b) => { if (er) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
const PORT = +(process.env.RA5_PORT || 8765);
await new Promise((res, rej) => { srv.once('error', () => srv.listen(0, '127.0.0.1', res)); srv.listen(PORT, '127.0.0.1', res); }); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const vis = (t) => String(t || '').replace(/[«»‹›「」]/g, '').trim().length;
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; pg.on('pageerror', (er) => errs.push(er.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(900);
  const setup = await pg.evaluate(async (self) => { const R = RitualOpen, w = (ms) => new Promise((x) => setTimeout(x, ms));
    window.__T = []; const o = window._lsToast; window._lsToast = function (m) { window.__T.push(String(m)); return o.apply(this, arguments); };
    if (self) { window._tblWatch = function () {}; }   // 옛 동작 — 글로 줄어도 말이 없다
    R.applyExample(S, 'standard'); S.on = { prevideo: 1, candle: 1, vow: 1, ring: 1, table: 1 }; S.vowHow = 'each'; S.tx = S.tx || {}; S.tx['vow.g'] = ''; S.tx['vow.b'] = ''; opSync();
    try { opGoStep('listen'); } catch (e) {} await w(300); try { mkGo('vow'); } catch (e) {} await w(500);
    return { cut: R.tableCut(S), ta: !!document.getElementById('mkt_vow_g') }; }, SELF);
  const T0 = async () => pg.evaluate(() => window.__T.filter((m) => /테이블 인사/.test(m)));
  const fill = async (n) => { await pg.fill('#mkt_vow_g', '가나다라마바사아자차'.repeat(n)); };
  if (!setup.ta) throw new Error('서약 글칸(#mkt_vow_g)을 못 찾았다 ' + JSON.stringify(setup));
  await fill(300); await wait(300); const mid = await T0();      // 입력 도중(멈춘 지 0.3초) — 아직 안 뜬다
  await wait(1100); const t1 = await T0();                      // 멈춘 뒤 한 번
  const cut1 = await pg.evaluate(() => RitualOpen.tableCut(S));
  await pg.fill('#mkt_vow_g', '나가다라마바사아자차'.repeat(300)); await wait(1300); const t2 = await T0();   // 같은 길이 · 같은 값 → 다시 안 뜸
  await pg.evaluate(() => document.activeElement && document.activeElement.blur()); await wait(300); const t3 = await T0();
  await fill(0); await pg.fill('#mkt_vow_g', '짧은 글'); await wait(1300); const t4 = await T0(); const cut4 = await pg.evaluate(() => RitualOpen.tableCut(S));   // 다시 늘면 말없이
  await pg.click('#mkt_vow_g'); await fill(300); await pg.evaluate(() => document.activeElement && document.activeElement.blur()); await wait(200); const t5 = await T0();   // 칸을 떠나면 바로
  if (SELF) {
    ok('selftest 옛 동작(글로 줄어도 말 없음)을 빨강으로 읽는다', !(t1.length === 1 && cut1 > 0), JSON.stringify({ t1, cut1 }));
  } else {
    ok(`[RA5_TABLE_NOTE] 390 서약 글을 길게 쓰면 멈춘 뒤 한 번 «${t1[0] || ''}»(${vis(t1[0])}자 · 20자 안)`, setup.cut === 0 && cut1 > 0 && !mid.length && t1.length === 1 && /^테이블 인사를 약 \d+분으로 맞췄어요$/.test(t1[0]) && vis(t1[0]) <= 20, JSON.stringify({ setup, mid, t1, cut1 }));
    ok('[RA5_TABLE_NOTE] 같은 값 다시 쓰기 · 칸 떠나기 → 다시 안 뜸', t2.length === 1 && t3.length === 1, JSON.stringify({ t2, t3 }));
    ok('[RA5_TABLE_NOTE] 다시 늘면 말없이 · 다시 줄면 칸을 떠날 때 다시 한 번', cut4 === 0 && t4.length === 1 && t5.length === 2, JSON.stringify({ t4, cut4, t5 }));
    ok('390 pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  }
  await pg.close();
} catch (er) { console.log('FAIL 예외', er && er.message); fail++; }
finally { await br.close(); srv.close(); }
if (SELF) { console.log(fail ? `\nRA5 SELFTEST FAIL ${fail}` : '\nRA5 SELFTEST OK'); process.exit(fail ? 1 : 0); }
console.log(fail ? `\nRA5 RULES FAIL ${fail}` : '\nRA5 RULES OK'); process.exit(fail ? 1 : 0);
