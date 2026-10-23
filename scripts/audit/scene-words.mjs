#!/usr/bin/env node
/* ★[SCENE_WORDS_1023 · PLAY_MID_1023 2026-10-23 사장님]
   A [SCENE_WORDS_1023] «본식 5분 전부터 문 앞에서 기다려요 · 문이 열리고 걸어 들어와요 · 도착 — 이 글자 빼던가 요약해서 단어로 적절한 위치에 · 디자이너 시선으로»
     입장 «음악과 함께» 그래프 아래 장면 줄 = 낱말 셋 «대기 · 입장 · 도착» 한 줄(11px) — 대기 = 왼쪽 끝 · 입장 = 문 열림 시점(th / tend) · 도착 = 오른쪽 끝 · 서로 겹치지 않는다 ·
     옛 장면 문장이 화면에 없다(그래프를 읽어 주는 aria-label 은 문장 그대로) · 누르고 멈추고 이어 들어도 낱말 자리는 그대로.
   B [PLAY_MID_1023] «이거 다시 취소 · 가운데 쪽으로 다시 하고 이어 듣기 · 멈춤 이걸로 바꾸자»(옛 [PLAY_ICON_FIXED_1023] 왼쪽 고정은 취소)
     듣기 알약은 동그라미 + 글 한 덩어리가 가운데(1px 안) · 동그라미를 왼쪽에 못 박지 않는다(position static) · 트는 동안 «멈춤».
     입장 알약 «이 순간 전체 듣기 · 음악과 함께» → «멈춤» → «이어 듣기» — «멈춤 ↔ 이어 듣기»는 동그라미 자리 그대로(글 칸 폭 = «이어 듣기»).
     다른 순간 «이 순간 전체 듣기 · n줄 이어서» 알약 · 목소리 창 단추(다듬기 «예시 들어 보기» · 두 분 목소리 «들어 보기 ↔ 멈춤» 동그라미 그대로)도 가운데(B2 · B3).
   390 · 1280. 종료 코드 0 통과 · 1 실패 · 2 재지 못함. SW_OP · SW_MOD = 돌연변이 확인용 — 그 판의 order-preview · entry-music.js 로 잰다 */
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.SW_OP || '', MOD = process.env.SW_MOD || '', SHOT = process.env.SHOT || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('skip scene-words: 브라우저가 없어 재지 못함'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || d === undefined ? '' : ' → ' + JSON.stringify(d).slice(0, 900)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : (MOD && u === '/assets/entry-music.js') ? MOD : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] }); } catch (e) { console.log('skip scene-words: 브라우저 ' + e.message); srv.close(); process.exit(2); }
/* 시험 곡 — entry-music.mjs 와 같은 합성음(150초 · 40초부터 크게) · 저장소에 음원을 두지 않는다 */
function testSong() { const sr = 22050, n = sr * 150, b = Buffer.alloc(44 + n * 2); b.write('RIFF', 0); b.writeUInt32LE(36 + n * 2, 4); b.write('WAVEfmt ', 8); b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22); b.writeUInt32LE(sr, 24); b.writeUInt32LE(sr * 2, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34); b.write('data', 36); b.writeUInt32LE(n * 2, 40);
  let s = 7; const rnd = () => { s = (s * 16807) % 2147483647; return s / 2147483647 - 0.5; };
  for (let i = 0; i < n; i++) { const t = i / sr, a = t >= 40 ? 0.45 * ((t % 0.5) < 0.06 ? 1 : 0.35) : 0.05; const v = a * (Math.sin(2 * Math.PI * 220 * t) * 0.6 + Math.sin(2 * Math.PI * 330 * t) * 0.3 + rnd() * 0.2); b.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(v * 32767))), 44 + i * 2); }
  const f = path.join(os.tmpdir(), 'scene-words-test-song.wav'); fs.writeFileSync(f, b); return f; }
const SONG = testSong();
const clickNext = async (p) => { if (await p.isVisible('#next')) await p.click('#next'); else await p.click('.pk-go'); };
/* 장면 줄 · 알약을 잰다 */
const words = (pg) => pg.evaluate(() => { const sc = document.querySelector('.em-scene .lg-scene'), plot = document.querySelector('.em-scene .lg-plot'), s = EntryMusic._t.scene(), P = s.plan || {};
  if (!sc) return null; const r0 = sc.getBoundingClientRect(), sp = [...sc.children].map((e) => { const r = e.getBoundingClientRect(); return { c: e.className, t: e.textContent, vis: !e.hidden && r.width > 0, l: +(r.left - r0.left).toFixed(1), r: +(r.right - r0.left).toFixed(1), top: +(r.top - r0.top).toFixed(1), h: +r.height.toFixed(1), fs: getComputedStyle(e).fontSize }; });
  const all = document.querySelector('.em-scene').textContent, lbl = (document.querySelector('.em-scene .em-graph') || { getAttribute: () => '' }).getAttribute('aria-label') || '';
  return { sp, w: +r0.width.toFixed(1), h: +r0.height.toFixed(1), pw: plot ? +plot.getBoundingClientRect().width.toFixed(1) : null, f: P.tend ? P.th / P.tend : null, old: /기다려요|걸어 들어와요|5분 전부터/.test(all), lbl, at: sc.getAttribute('data-at') || '' }; });
const pill = (pg, sel) => pg.evaluate((sel) => { const b = document.querySelector(sel); if (!b) return null; const v = b.querySelector('svg'), r = b.getBoundingClientRect(), q = v ? v.getBoundingClientRect() : null, rg = document.createRange(); rg.selectNodeContents(b); const g = rg.getBoundingClientRect(), cs = getComputedStyle(b);
  return { t: b.textContent.replace(/\s+/g, ' ').trim(), bw: +r.width.toFixed(1), bh: +r.height.toFixed(1), sx: q ? +(q.left - r.left).toFixed(1) : null, sy: q ? +(q.top - r.top).toFixed(1) : null, sw: q ? +q.width.toFixed(1) : null, pos: v ? getComputedStyle(v).position : '',
    dx: +((g.left + g.right) / 2 - (r.left + parseFloat(cs.paddingLeft) + r.right - parseFloat(cs.paddingRight)) / 2).toFixed(1) }; }, sel);   /* dx = 동그라미 + 글 덩어리 가운데 − 알약 안쪽 가운데 */
const same = (a, f) => a.every((x) => x && a[0] && Math.abs(x[f] - a[0][f]) < 0.6);
try {
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = [];
    pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }); });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
    await clickNext(pg); await pg.waitForTimeout(400); await clickNext(pg); await pg.waitForTimeout(500); await clickNext(pg); await pg.waitForTimeout(1500);
    /* B-2 먼저 — 다른 순간 «이 순간 전체 듣기 · n줄 이어서» 알약(입장 장면이 서기 전 · 빌더 알약이 보이는 순간) */
    const mpK = await pg.evaluate(() => { for (const k of ['guest', 'vow', 'thanks', 'ring', 'bless', 'candle', 'entry']) { try { mkGo(k); } catch (e) { continue; } const b = [...document.querySelectorAll('.mk-hbtn[data-mp]')].find((x) => x.offsetParent && x.querySelector('svg')); if (b) return k; } return ''; });
    await pg.waitForTimeout(500);
    const mpS = [];
    if (mpK) for (const lab of [null, '멈춤', '만드는 중', '이 순간 전체 듣기']) {
      if (lab) await pg.evaluate((lab) => { const b = [...document.querySelectorAll('.mk-hbtn[data-mp]')].find((x) => x.offsetParent); const v = b.querySelector('svg'); b.innerHTML = ''; b.appendChild(v); b.appendChild(document.createTextNode(' ' + lab)); }, lab);   /* _mpBtn · _mpPaint 와 같은 꼴(▶ · ■ + 글) */
      mpS.push(await pill(pg, '.mk-hbtn[data-mp]:not([hidden])'));
    }
    ok(`${W} B2 [PLAY_MID_1023] «${mpK || '?'}» 순간 «이 순간 전체 듣기» 알약 — 글이 «멈춤» · «만드는 중»이어도 동그라미 + 글이 가운데(${mpS.map((x) => x && x.dx).join(' · ')}) · 동그라미 왼쪽 고정 없음 · 알약 크기 그대로`,
      !!mpK && mpS.length === 4 && mpS.every(Boolean) && mpS.every((x) => Math.abs(x.dx) <= 1 && x.pos === 'static') && same(mpS, 'bw') && same(mpS, 'bh') && mpS[0].sw === 30, { mpK, mpS });
    if (SHOT) await pg.locator('.mk-hbtn[data-mp]:not([hidden])').first().screenshot({ path: path.join(SHOT, `mp-pill-${W}.png`) }).catch(() => {});
    /* 입장 장면 세우기(entry-music.mjs 와 같은 길) */
    await pg.evaluate(() => { try { render(); } catch (e) {} mkGo('entry'); }); await pg.waitForTimeout(800);
    if (await pg.evaluate(() => !!document.querySelector('[data-fk="lsc:entryVoice:nar"]'))) { await pg.click('[data-fk="lsc:entryVoice:nar"]'); await pg.waitForTimeout(600); }
    const pickE = await pg.evaluate(() => { const has = (e) => { S.entry = e; try { opSync(); } catch (x) {} const st = _lSteps(ENG, ['entry']).filter((x) => /^entry-/.test(x.slug || ''))[0]; return !!(st && st.src); }; const e0 = S.entry; if (has(e0)) return e0; for (const e of ['A', 'B', 'C', 'D', 'E', 'F']) if (has(e)) { render(); return e; } S.entry = e0; return ''; });
    if (!pickE) await pg.evaluate(() => { const L0 = window._lSteps; window._lSteps = function (e, ks) { const a = L0.apply(this, arguments); if (ks && ks.length === 1 && ks[0] === 'entry') a.forEach((x) => { if (/^entry-[A-F]$/.test(x.slug || '') && !x.src) { x.src = '/assets/audio/narration/05_entry-A.mp3'; x.pending = false; } }); return a; }; try { render(); } catch (e) {} });
    await pg.click('[data-fk="musrc:up"]'); await pg.waitForTimeout(500);
    if (await pg.evaluate(() => !!document.getElementById('mkRecDlg'))) { await pg.click('#mkRecDlg .mk-dlg-go'); await pg.waitForTimeout(400); }
    await pg.setInputFiles('#muUpFile', SONG);
    await pg.waitForFunction(() => { const u = EntryMusic._t.ups(); return u && u.Sg && !u.busy; }, null, { timeout: 60000 }).catch(() => {});
    await pg.waitForFunction(() => EntryMusic._t.scene().plan && document.querySelector('.em-scene .em-graph'), null, { timeout: 20000 }).catch(() => {}); await pg.waitForTimeout(500);
    await pg.evaluate(() => { const e = document.querySelector('.em-scene'); if (e) e.scrollIntoView({ block: 'center' }); }); await pg.waitForTimeout(300);
    /* A 장면 줄 */
    const A0 = await words(pg);
    const vis = A0 ? A0.sp.filter((x) => x.vis) : [], gS = A0 && A0.sp.find((x) => /lgs-greet/.test(x.c)), wS = A0 && A0.sp.find((x) => /lgs-walk/.test(x.c)), eS = A0 && A0.sp.find((x) => /lgs-end/.test(x.c));
    const want = A0 && A0.f != null ? Math.max(0, Math.min(A0.w - (wS ? wS.r - wS.l : 0), Math.round(A0.f * A0.w))) : null;
    const noOverlap = vis.every((x, i) => i === 0 || x.l >= vis[i - 1].r + 7.5);
    ok(`${W} A1 [SCENE_WORDS_1023] 장면 줄 = «대기 · 입장 · 도착» 한 줄 11px(높이 ${A0 && A0.h}) · 옛 장면 문장 없음 · 그래프 aria-label 은 문장 그대로`,
      !!A0 && A0.sp.map((x) => x.t).join('|') === '대기|입장|도착' && A0.sp.every((x) => x.fs === '11px') && A0.h <= 17 && vis.every((x) => x.top === vis[0].top && x.h <= 17) && !A0.old && /«입장!»이 끝나면|마지막 말이 끝나면/.test(A0.lbl), A0);
    ok(`${W} A2 낱말 자리 — 대기 왼쪽 끝 · 입장 = 문 열림 시점(th/tend ${A0 && A0.f != null ? A0.f.toFixed(3) : '?'} → ${want}px · 지금 ${wS && wS.l}px) · 도착 오른쪽 끝 · 겹침 없음 · 줄 폭 = 그래프 폭`,
      !!A0 && !!wS && wS.vis && Math.abs(wS.l - want) <= 1 && (!gS.vis || gS.l === 0) && (!eS.vis || Math.abs(eS.r - A0.w) <= 0.6) && gS.vis && eS.vis && noOverlap && Math.abs(A0.w - A0.pw) <= 0.6, { A0, want });
    if (SHOT) await pg.locator('.em-scene').screenshot({ path: path.join(SHOT, `scene-${W}-0.png`) }).catch(() => {});
    /* B-1 입장 장면 알약 — 누르고 · 멈추고 · 이어 듣기 */
    const P0 = await pill(pg, '.em-scene [data-fk="emscene"]');
    await pg.click('.em-scene [data-fk="emscene"]'); await pg.waitForFunction(() => EntryMusic._t.scene().run, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(1200);
    const P1 = await pill(pg, '.em-scene [data-fk="emscene"]'), A1 = await words(pg);
    if (SHOT) await pg.locator('.em-scene').screenshot({ path: path.join(SHOT, `scene-${W}-1.png`) }).catch(() => {});
    await pg.click('.em-scene [data-fk="emscene"]'); await pg.waitForTimeout(400);
    const P2 = await pill(pg, '.em-scene [data-fk="emscene"]'), A2 = await words(pg);
    if (SHOT) await pg.locator('.em-scene').screenshot({ path: path.join(SHOT, `scene-${W}-2.png`) }).catch(() => {});
    const ps = [P0, P1, P2];
    ok(`${W} B1 [PLAY_MID_1023] 입장 알약 «${P0 && P0.t}» → «${P1 && P1.t}» → «${P2 && P2.t}» — 셋 다 가운데(${ps.map((x) => x && x.dx).join(' · ')}) · «멈춤 ↔ 이어 듣기» 동그라미 자리 그대로(${P1 && P1.sx} · ${P2 && P2.sx}) · 알약 크기 그대로 · 첫 판 한 줄(높이 ${P0 && P0.bh})`,
      ps.every(Boolean) && P0.t === '이 순간 전체 듣기 · 음악과 함께' && P1.t === '멈춤' && P2.t === '이어 듣기' && ps.every((x) => Math.abs(x.dx) <= 1 && x.pos === 'static') && Math.abs(P1.sx - P2.sx) < 0.6 && Math.abs(P1.sy - P2.sy) < 0.6 && same(ps, 'bw') && same(ps, 'bh') && P0.bh <= 53, { ps });
    ok(`${W} A3 누르고 멈춰도 낱말 자리 그대로 · 듣는 동안 지금 칸 낱말만 진하게(data-at ${A1 && A1.at})`,
      !!A1 && !!A2 && JSON.stringify(A1.sp.map((x) => [x.l, x.vis])) === JSON.stringify(A0.sp.map((x) => [x.l, x.vis])) && JSON.stringify(A2.sp.map((x) => [x.l, x.vis])) === JSON.stringify(A0.sp.map((x) => [x.l, x.vis])) && A1.at === 'greet', { A1, A2 });
    ok(`${W} 가로 넘침 없음 · 페이지 오류 없음`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && errs.length === 0, { errs });
    await ctx.close();
  }
  /* A4 겹침 처리(입장이 이긴다) — 문 열림이 맨 앞 · 맨 끝이면 대기 · 도착을 숨기고 입장은 줄 안 */
  { const ctx = await br.newContext({ viewport: { width: 390, height: 900 } }); const pg = await ctx.newPage();
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(500);
    const R = await pg.evaluate(() => { const g = document.createElement('div'); g.className = 'em-graph'; g.style.width = '300px'; g.innerHTML = '<div class="lg-plot"></div><div class="lg-scene"><span class="lgs-greet">대기</span><span class="lgs-walk">입장</span><span class="lgs-end">도착</span></div>'; document.body.appendChild(g);
      const sc = g.querySelector('.lg-scene'), out = {}; for (const f of [0, 0.02, 0.5, 0.97, 1]) { EntryMusic._t.placeWords(sc, f); const r0 = sc.getBoundingClientRect(); out[f] = [...sc.children].map((e) => e.hidden ? '-' : Math.round(e.getBoundingClientRect().left - r0.left) + ':' + Math.round(e.getBoundingClientRect().right - r0.left)).join(' '); } g.remove(); return out; }).catch((e) => ({ err: e.message }));
    const parse = (s) => (s || '').split(' ').map((x) => x === '-' ? null : x.split(':').map(Number));
    const okf = (s, hideG, hideE) => { const [g, w, e] = parse(s); return !!w && w[0] >= 0 && w[1] <= 300 && (hideG ? g === null : !!g) && (hideE ? e === null : !!e); };
    ok('A4 겹치면 입장이 이긴다 — 0 · 0.02 → 대기 숨김 · 0.5 → 셋 다 · 0.97 · 1 → 도착 숨김 · 입장은 늘 줄 안', !R.err && okf(R[0], true, false) && okf(R[0.02], true, false) && okf(R[0.5], false, false) && okf(R[0.97], false, true) && okf(R[1], false, true), R);
    /* B3 [PLAY_MID_1023] 목소리 창 단추 둘 — 다듬기 «예시 들어 보기 ↔ 멈춤»(가운데) · 두 분 목소리 «들어 보기 ↔ 멈춤»(가운데 · 동그라미 그대로). 창 폭(320)에 실제 CSS 와 화면 코드와 같은 꼴로 세워 잰다 */
    const B3 = await pg.evaluate(() => { const box = document.createElement('div'); box.style.cssText = 'width:320px;position:relative'; document.body.appendChild(box); const out = {};
      const mk = { 'mk-tune-go': (t) => '<span>' + t + '</span>', 'mk-dlg-go mk-vu-play': (t) => ' <span class="em-lab-tg" data-w="들어 보기"><span>' + t + '</span></span>' };
      for (const [cls, labs] of [['mk-tune-go', ['예시 들어 보기', '멈춤']], ['mk-dlg-go mk-vu-play', ['들어 보기', '멈춤']]]) {
        out[cls] = labs.map((t) => { box.innerHTML = '<button type="button" class="' + cls + '">' + (t === '멈춤' ? ICO_STOP : ICO_PLAY) + mk[cls](t) + '</button>'; const b = box.firstChild, v = b.querySelector('svg'), r = b.getBoundingClientRect(), q = v.getBoundingClientRect(), rg = document.createRange(); rg.selectNodeContents(b); const g = rg.getBoundingClientRect(), cs = getComputedStyle(b);
          return { t, sx: +(q.left - r.left).toFixed(1), dx: +((g.left + g.right) / 2 - (r.left + parseFloat(cs.paddingLeft) + r.right - parseFloat(cs.paddingRight)) / 2).toFixed(1), pos: getComputedStyle(v).position, bh: +r.height.toFixed(1) }; }); }
      box.remove(); return out; }).catch((e) => ({ err: e.message }));
    ok('B3 [PLAY_MID_1023] 목소리 창 «예시 들어 보기 ↔ 멈춤» · «들어 보기 ↔ 멈춤» — 동그라미 + 글 가운데 · 왼쪽 고정 없음 · 두 분 목소리 단추는 동그라미 자리 그대로',
      !B3.err && ['mk-tune-go', 'mk-dlg-go mk-vu-play'].every((k) => B3[k].every((x) => Math.abs(x.dx) <= 1 && x.pos === 'static')) && Math.abs(B3['mk-dlg-go mk-vu-play'][0].sx - B3['mk-dlg-go mk-vu-play'][1].sx) < 0.6, B3);
    await ctx.close(); }
} finally { await br.close(); srv.close(); }
console.log(fail ? `scene-words: FAIL ${fail}` : 'scene-words: ok');
process.exit(fail ? 1 : 0);
