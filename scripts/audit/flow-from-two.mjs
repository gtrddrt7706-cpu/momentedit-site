#!/usr/bin/env node
/* ★★[FLOW_FROM_TWO_1017 2026-10-17 사장님 «케익이벤트는 완전히 뺀거지?»] 새 코스의 «순서 흐름»은 ② 줄과 같은 이름 · 같은 차례인가.
   저장 요약(summary.flow)은 하객 식순지(관리자 인쇄) · 마이페이지 사진 연결 · 관리자 «순서 흐름»이 읽고, AI 상담 맥락(«구성»)은 상담 답에 들어간다.
   종전엔 둘 다 옛 표(fullBlocks · TUNE) 이름이라 케이크가 없는 날도 «축배 · 케이크»가 찍혔고, 맞절 · 반지 교환 · 테이블 인사가 빠지고, 축배가 닫는 인사 앞에 섰다.
   진짜 식순 화면(order-preview.html)을 띄워 예시 넷 + 모두 담은 판 + 옛 초안(케이크를 담아 둔 판 · 옛 코스 «둘 다 · 케이크만»)으로 잰다.
   1 summary.flow = ② 줄(하객 맞이 안내 뺌) · count = ④ 머리 «담은 순간»(관리자 «n개 순간»이 같은 수를 말한다)
   2 케이크를 안 담은 판 — 흐름 · 장면 · AI 맥락 · 대본 받기 · 옛 표 이름 · AI 질문 칩 어디에도 «케이크»가 없다
   3 ★[CAKE_OLD_OFF_1017 2026-10-17 사장님 «옛식순케이크빼»] 옛 초안(10/13 전 케이크를 담아 둔 판 · 옛 코스 «둘 다 · 케이크만 · 사이 순서 케이크»)도 케이크 없음
     (종전 «옛 초안은 케이크 커팅이 제자리에 남는다»는 10/17 걷음) · 엔진 · 저장 흐름은 cake-old-off.mjs 가 브라우저 없이 잰다
   4 마이페이지 — 잔 연동은 «축배» 하나 · 옛 이름 «축배 · 케이크»는 _flowFix 가 «축배»로 옮겨 «있음» · 두 자리(연동 줄 · 확인서)가 같은 자(_flowHas)
   5 관리자 — 새 코스 축배 행은 담았을 때만(S.toast 를 읽지 않는다)
   FT_OP=<order-preview.html 경로>(그 판으로 잰다 — 돌연변이 확인용)  VERBOSE=1
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.FT_OP || '';
let fail = 0; const VERB = !!process.env.VERBOSE;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${(c && !VERB) || d === undefined ? '' : ' → ' + JSON.stringify(d)}`); if (!c) fail++; };

// 4 · 5 — 정적(브라우저 없이도 잰다)
const mp = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const lk = mp.match(/\{n:'잔 부딪히기'[^\n]*\n\s*link:\{when:'([^']+)',\s*(\w+):/);
ok('4 마이페이지 «잔 부딪히기» 연동 = when «축배» 하나(old 없음 · 옛 이름은 _flowFix 가 옮긴다) [CAKE_OLD_OFF_1017]', !!lk && lk[1] === '축배' && lk[2] === 'on', lk && lk.slice(1));
const fh = mp.match(/function _flowHas\(flow,lk\)\{[^\n]*\}/), ff = mp.match(/function _flowFix\(flow,S\)\{[^\n]*\n[^\n]*\}/);
let fhOk = false;
if (fh && ff) { try { const f = new Function(fh[0] + '; return _flowHas;')(), fx = new Function(ff[0] + '; return _flowFix;')(); const L = { when: '축배' };
  fhOk = f(['닫는 인사', '축배'], L) && f(fx(['폐식·단체촬영', '축배 · 케이크'], { course: 'damback', toast: 'both' }), L) && !f(fx(['폐식·단체촬영', '축배 · 케이크'], { course: 'damback', toast: 'cake' }), L)
    && !f(['닫는 인사', '테이블 인사'], L) && !f(null, L) && !f(['축배'], null); } catch (e) { fhOk = false; } }
ok('4 _flowHas(_flowFix(…)) — 지금 이름 · 옛 이름 «둘 다» «있음» · 옛 «케이크만» · 없는 흐름 «없음»', fhOk);
const uses = (mp.match(/_flowHas\(_flow,c\.link\)|!_flowHas\(_rf,c\.link\)/g) || []).length;
ok('4 연동 줄 · 확인서 대조가 같은 자(_flowHas) — 이름 하나만 보던 indexOf(c.link.when) 없음', uses === 2 && !/indexOf\(c\.link\.when\)/.test(mp), { uses });
const ad = fs.readFileSync(path.join(ROOT, 'admin.html'), 'utf8');
ok('5 관리자 — 새 코스 축배 행은 담았을 때만(s3d.on.toast)', /s3d\.course==='open'\?row\('축배', \(s3d\.on&&s3d\.on\.toast\)\?/.test(ad));

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

async function measure(mode) {
  const ctx = await br.newContext({ viewport: { width: 390, height: 844 } }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(BASE + '/order-preview.html', { waitUntil: 'load' }); await wait(600);
  await pg.evaluate(() => Promise.all([engine(), _lrec()])).catch(() => {});
  const r = await pg.evaluate((mode) => {
    const R = RitualOpen, ex = (R.EXAMPLES || []).map((e) => e.k);
    const old = /^OLD/.test(mode);
    if (old) {   /* [CAKE_OLD_OFF_1017] 옛 코스 저장본(축배가 든 코스 · «둘 다» / «케이크만» · 사이 순서 케이크)을 복원 길(_applySaved)로 연다 */
      const ck = Object.keys(COURSES).filter((k) => !COURSES[k].open && (COURSES[k].seq || []).indexOf('toast') > -1)[0];
      const S1 = Object.assign(JSON.parse(JSON.stringify(S)), { course: ck, toast: mode === 'OLDCAKE' ? 'cake' : 'both', valley: 'cake', off: {}, extra: { valley: 1 } });
      if (!_applySaved({ S: S1, cs: 1, idx: 0, v: 2 }, false)) return { err: '옛 코스 복원 실패 ' + ck };
    }
    else if (mode === 'ALL' || mode === 'CAKE') { opEx(ex[0]); (mode === 'ALL' ? (R.OFFER || R.PICKABLE) : R.ORDER).forEach((k) => { S.on[k] = 1; }); }
    else opEx(mode);
    if (!old) { courseStarted = true; buildSteps(); }
    const rows = old ? [] : _lRows(); const two = rows.filter((k) => k !== 'guest').map((k) => _lName(k));
    const sm = _ordPayload(false).summary;
    let ai = [], aiTxt = '', script = '', fb = [];
    try { ai = ritualAiStateData().flow || []; } catch (e) { ai = ['ERR ' + e.message]; }
    try { aiTxt = ritualAiState(); } catch (e) { aiTxt = 'ERR ' + e.message; }
    try { script = scriptText(); } catch (e) { script = 'ERR ' + e.message; }
    try { fb = fullBlocks().map((b) => b.n); } catch (e) { fb = ['ERR ' + e.message]; }
    const chipKeys = rows.concat(STEPS.map((s) => s.k), ['_def']);
    const chips = []; chipKeys.forEach((k) => { (RITUAL_CHIPS[k] || []).forEach((q) => chips.push(k + ':' + q)); });
    return { old, course: S.course, toast: S.toast, cake: !!R.onOf(S, 'cake'), two, mom: old ? 0 : _opMoments(), flow: sm.flow || [], count: sm.count, scenes: (sm.scenes || []).map((x) => x.n + ' ' + x.s), ai, aiTxt, script, fb, chips };
  }, mode);
  r.errs = errs; await ctx.close(); return r;
}

const MODES = ['standard', 'record', 'family', 'brief', 'ALL', 'CAKE', 'OLDBOTH', 'OLDCAKE'];
for (const mode of MODES) {
  let r; try { r = await measure(mode); } catch (e) { ok(`${mode} 재기`, false, e.message); continue; }
  if (r.err) { ok(`${mode} 재기`, false, r.err); continue; }
  if (!r.old) {
    ok(`${mode} 1 summary.flow = ② 줄(하객 맞이 안내 뺌) · count = ④ «담은 순간» ${r.mom}`, JSON.stringify(r.flow) === JSON.stringify(r.two) && r.count === r.mom && r.mom > 0, { flow: r.flow, two: r.two, count: r.count, mom: r.mom });
    const toastAt = r.flow.indexOf('축배'), closeAt = r.flow.indexOf('닫는 인사');
    if (toastAt > -1) ok(`${mode} 1 축배는 닫는 인사 바로 앞(테이블 인사 뒤) · 이름 «축배» [END_FLOW_1030 · 옛 TOAST_LAST_1013]`, closeAt > -1 && toastAt === closeAt - 1, r.flow);
  } else {
    ok(`${mode} 3 옛 코스 복원 — 축배 칸이 «축배»(둘 다 → 축배 · 케이크만 → 축배 칸을 뺀다) [CAKE_OLD_OFF_1017]`, r.toast === 'toast' && (mode === 'OLDBOTH' ? r.flow.indexOf('축배') > -1 : r.flow.indexOf('축배') < 0), { course: r.course, toast: r.toast, flow: r.flow });
  }
  const hay = { flow: r.flow, scenes: r.scenes, ai: r.ai, aiTxt: [r.aiTxt], script: [r.script], fb: r.fb, chips: r.chips };
  const hits = []; Object.keys(hay).forEach((k) => hay[k].forEach((t) => { if (/케이크|케익|나이프/.test(String(t))) hits.push(k + ' | ' + String(t).match(/.{0,24}(케이크|케익|나이프).{0,24}/)[0]); }));
  ok(`${mode} 2 흐름 · 장면 · AI 맥락 · 대본 · 옛 표 · AI 질문 칩에 «케이크» 없음 [CAKE_OFF_1013 · CAKE_OLD_OFF_1017]`, !r.cake && !hits.length, hits);
  ok(`${mode} 페이지 오류 없음`, !r.errs.length, r.errs);
}
await br.close(); srv.close();
console.log(fail ? `FAIL ${fail}건 — 새 코스 순서 흐름(식순지 · AI 맥락)이 ② 와 어긋났거나 케이크가 남았다 [FLOW_FROM_TWO_1017]` : '순서 흐름 = ② 줄 · 케이크 없음 [FLOW_FROM_TWO_1017]');
process.exit(fail ? 1 : 0);
