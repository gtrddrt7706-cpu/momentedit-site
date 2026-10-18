#!/usr/bin/env node
/* ★[MOOD_1018 · SCRIPT_VIEW_1018 · MOOD_REF_1018 인스타 섹션 검토 7판 67 · 73 · 74] 화면 — 폰 390 · PC 1280
   ① ① 고르기 코스 카드 아래 · 감동 흐름 위에 «나레이션 분위기» 칩 여섯(처음엔 눌린 칩 없음 · 안 고른 줄 한 줄)
   ② 누르면 표대로 입장 · 순간 멘트가 들어가고 아래 알림 한 줄 · 순간 칩을 바꾸면 «바꾼 곳 있음» · 되돌리면 사라진다
   ③ «지금 그대로»를 누르면 예시 1 · 코스 입장으로 · 코스를 바꾸면 분위기 값을 다시 입힌다 · 서는 분을 바꾸면 화촉 칸이 그 서는 분 표로
   ④ 분위기를 고른 날 참고 예시 맨 위가 그 결 · ③ 연습하기 «글로 한눈에 보기» = ④ 대본 글(scriptTextOpen)을 읽기 전용 창으로
   SHOT=폴더 를 주면 스크린샷을 남긴다 · 종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SHOT = process.env.SHOT || '';
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:standard"]'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { document.body.style.opacity = 1; document.querySelectorAll('.reveal,section').forEach((e) => { e.style.opacity = 1; e.style.contentVisibility = 'visible'; }); });
  const lay = await pg.evaluate(() => { const ex = document.querySelector('.pk-exs'), md = document.querySelector('.pk-mood'), fl = document.getElementById('pkFlow');
    if (!md) return { none: 1 }; const b = [...md.querySelectorAll('button[data-fk^="opmood:"]')];
    return { order: !!(ex && fl && ex.compareDocumentPosition(md) & 4 && md.compareDocumentPosition(fl) & 4), n: b.length, on: b.filter((x) => x.getAttribute('aria-checked') === 'true').length,
      names: b.map((x) => x.textContent).join('·'), note: [...md.querySelectorAll('.ls-gnote')].map((x) => x.textContent).join('|'), over: document.documentElement.scrollWidth > innerWidth + 1,
      h: Math.max(...b.map((x) => x.getBoundingClientRect().height)) }; });
  ok(`${W} ① 코스 카드 아래 · 감동 흐름 위 «나레이션 분위기» 칩 여섯 · 눌린 칩 없음 · 안 고른 줄`, lay.order && lay.n === 6 && lay.on === 0 && lay.names === '지금 그대로·담백하게·격식 있게·다정하게·뭉클하게·밝고 힘차게' && /^아직 고르지 않았어요 · /.test(lay.note) && !lay.over && lay.h >= 36, JSON.stringify(lay));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/mood-${W}-0.png`, fullPage: false, clip: await pg.evaluate(() => { const r = document.querySelector('.pk-mood').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 260), width: innerWidth, height: 520 }; }) });
  const r1 = await pg.evaluate(async () => { const u0 = document.getElementById('lsToast'); if (u0) { u0.hidden = true; u0.innerHTML = ''; }
    document.querySelector('[data-fk="opmood:1"]').click(); await new Promise((r) => setTimeout(r, 400)); const u = document.getElementById('lsToast');
    return { mood: S.mood, entry: S.entry, open: (S.narEx || {}).open, mat: (S.narEx || {}).matjeol, toast: u && !u.hidden ? u.textContent : '', on: document.querySelector('[data-fk="opmood:1"]').getAttribute('aria-checked'),
      note: [...document.querySelectorAll('.pk-mood .ls-gnote')].map((x) => x.textContent).join('|') }; });
  ok(`${W} ② «담백하게» → 표대로(입장 A · 개식 예시 3 · 맞절 예시 5) · 눌린 모양 · 아래 알림 «‹담백하게›로 맞췄어요»`, r1.mood === 'plain' && r1.entry === 'A' && r1.open === 2 && r1.mat === 4 && r1.on === 'true' && r1.toast === '‹담백하게›로 맞췄어요' && !r1.note, JSON.stringify(r1));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/mood-${W}-1.png`, clip: await pg.evaluate(() => { const r = document.querySelector('.pk-mood').getBoundingClientRect(); return { x: 0, y: Math.max(0, r.top + scrollY - 120), width: innerWidth, height: 360 }; }) });
  const r2 = await pg.evaluate(async () => { mkNarEx('vow', 2); await new Promise((r) => setTimeout(r, 200)); const d1 = _moodDirty(); mkNarEx('vow', 0); await new Promise((r) => setTimeout(r, 200)); return { d1, d2: _moodDirty() }; });
  ok(`${W} ② 순간 칩을 바꾸면 «바꾼 곳 있음» · 되돌리면 사라진다`, r2.d1 === true && r2.d2 === false, JSON.stringify(r2));
  const r3 = await pg.evaluate(async () => { S.candleWho = 'fathers'; _persist(); const c1 = (S.narEx || {}).candle; opEx('family'); await new Promise((r) => setTimeout(r, 500)); const a = { c1, mood: S.mood, entry: S.entry, mat: (S.narEx || {}).matjeol, pick: S.pickFrom };
    document.querySelector('[data-fk="opmood:0"]') ? document.querySelector('[data-fk="opmood:0"]').click() : 0; await new Promise((r) => setTimeout(r, 400)); a.keep = S.mood; a.nar = JSON.stringify(S.narEx || {}); a.entry2 = S.entry; a.fe = RitualOpen.exampleOf('family').set.entry || 'A'; return a; });
  ok(`${W} ③ 서는 분 → 화촉 칸이 그 표로 · 코스를 바꾸면 분위기 다시 · «지금 그대로» → 예시 1 · 코스 입장`, r3.c1 === 1 && r3.mood === 'plain' && r3.entry === 'A' && r3.mat === 4 && r3.pick === 'family' && r3.keep === 'keep' && r3.nar === '{}' && r3.entry2 === r3.fe, JSON.stringify(r3));
  const r4 = await pg.evaluate(async () => { document.querySelector('[data-fk="opmood:4"]').click(); await new Promise((r) => setTimeout(r, 300)); const ks = ['vow', 'welcome', 'letter']; const out = {};
    ks.forEach((k) => { try { const s = _lRefSets(k); out[k] = s.length ? s[0][0].kyeol : ''; } catch (e) { out[k] = 'ERR'; } }); return out; });
  ok(`${W} ④ «뭉클하게» → 참고 예시 맨 위가 «장면 하나 · 그리움 · 다정» 결`, Object.values(r4).every((v) => ['장면 하나', '그리움', '다정', ''].includes(v)), JSON.stringify(r4));
  const r5 = await pg.evaluate(async () => { opToListen(); await new Promise((r) => setTimeout(r, 400)); const ps = _mkPages(); mkGo(ps[ps.length - 1]); await new Promise((r) => setTimeout(r, 300));
    return { ok: 1 }; });
  await pg.evaluate(async () => { const i = STEPS.findIndex((x) => x.k === 'practice'); if (i > -1) { idx = i; render(); } await new Promise((r) => setTimeout(r, 600)); });
  await pg.waitForTimeout(500);
  const r6 = await pg.evaluate(async () => { const b = document.querySelector('[data-fk="prsv"]'); if (!b) return { none: 1 }; b.click(); await new Promise((r) => setTimeout(r, 600));
    const d = document.getElementById('mkRecDlg'); if (!d) return { dlg: 0 }; const txt = d.textContent, inputs = d.querySelectorAll('input,textarea,select').length, hs = d.querySelectorAll('.sv-h').length, q = d.querySelectorAll('.sv-q').length;
    const same = scriptTextOpen().split('\n').filter((l) => l.trim() && !/^우리 예식 대본/.test(l)).slice(0, 6).every((l) => txt.replace(/\s/g, '').indexOf(l.replace(/^[^:.!?]{1,40}:\s?/, '').replace(/\s/g, '').slice(0, 20)) > -1);
    return { dlg: 1, inputs, hs, q, same, t: d.querySelector('.mk-dlg-t').textContent }; });
  ok(`${W} ④ ③ «글로 한눈에 보기» → 창(제목 · 순간마다 덩어리 · 사람 구간 회색 · 입력칸 없음 · ④ 대본과 같은 글)`, r6.dlg && r6.t === '글로 한눈에 보기' && r6.inputs === 0 && r6.hs >= 5 && r6.q >= 1 && r6.same, JSON.stringify(r6));
  if (SHOT) await pg.screenshot({ path: `${SHOT}/sv-${W}.png` });
  await pg.evaluate(() => mkDlgClose()); await pg.waitForTimeout(200);
  ok(`${W} 닫으면 창이 사라진다`, await pg.evaluate(() => !document.getElementById('mkRecDlg')));
  ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `MOOD SCREEN FAIL ${fail}` : 'MOOD SCREEN OK'); process.exit(fail ? 1 : 0);
