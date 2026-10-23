#!/usr/bin/env node
/* ★[ENTRY_OPEN_1023 · PLAY_MID_1023 2026-10-23 사장님]
   A [ENTRY_OPEN_1023] «밑에 글씨들은 전부 삭제» · «문 열림을 그래프에 세로선으로» · «대문자 OPEN 은 식당 같다 → 소문자로» · «선 옆 번짐 효과 삭제» · Welcome «뒤로 2초»
     (종전 [SCENE_WORDS_1023] 장면 줄 «대기 · 입장 · 도착»은 걷었다 — 줄 자리도 없다)
     입장 «음악과 함께» 그래프 안 «open» 세로선 — 선 1px · #8A724C · 0.85 · 그림자 · 번짐 없음 · 그래프 위 2px 에서 목소리 줄까지(칸 높이 − 10px) ·
     글자 «open» Cormorant Garamond 기울임 500 18/22 · #6B5639 · 선 머리 위 4 ~ 6px · 곡선(그래프 칸) 위 · 카드 안 · 칸 안(양 끝이면 밀기) ·
     자리 = 장면 시각 open / tend(올린 곡 · open 없는 곡 = th) · 누르고 멈추고 이어 들어도 그대로 · 옛 장면 문장 · 장면 줄 없음(aria-label 은 문장 그대로) ·
     Welcome(r6) 목록 값 덮기 — 52.18 → 50.18 · hooks [50.18, 112.0] · 엔진 plan: 짧은 멘트 H 50.18 · open = th + 4.78 · 긴 멘트 H 112.0 · open = th + 4.77 · 다른 곡(r1)은 목록 그대로 · open = th
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
/* open 선 · 알약을 잰다 */
const openLook = (pg) => pg.evaluate(() => { const g = document.querySelector('.em-scene .em-graph'), plot = g && g.querySelector('.lg-plot'), o = plot && plot.querySelector('.lg-open'), l = o && o.querySelector('.lgo-l'), t = o && o.querySelector('.lgo-t'), s = EntryMusic._t.scene(), P = s.plan || {};
  if (!g || !plot) return null; const R = (e) => { const r = e.getBoundingClientRect(); return { l: +r.left.toFixed(1), r: +r.right.toFixed(1), t: +r.top.toFixed(1), b: +r.bottom.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1) }; };
  const cs = t ? getComputedStyle(t) : null, ls = l ? getComputedStyle(l) : null, all = document.querySelector('.em-scene').textContent, lbl = g.getAttribute('aria-label') || '';
  return { pr: R(plot), gr: R(g), lr: l ? R(l) : null, tr: t ? R(t) : null, hidden: !o || o.hidden, txt: t ? t.textContent : '', scene: !!document.querySelector('.lg-scene, .lgs-walk'),
    font: cs ? [cs.fontFamily.split(',')[0].replace(/["']/g, ''), cs.fontStyle, cs.fontWeight, cs.fontSize, cs.lineHeight, cs.color].join('|') : '', ls: cs ? cs.letterSpacing : '',
    line: ls ? [ls.width, ls.backgroundColor, ls.opacity, ls.boxShadow, ls.filter].join('|') : '', open: P.open, th: P.th, tend: P.tend, old: /기다려요|걸어 들어와요|5분 전부터|대기입장도착/.test(all), lbl }; });
const openOk = (A) => { if (!A || A.hidden || !A.lr || !A.tr) return false; const want = A.pr.l + Math.min(A.pr.w - 1, Math.round(Math.max(0, Math.min(A.tend, A.open)) / A.tend * A.pr.w * 2) / 2), gap = A.lr.t - A.tr.b;
  return Math.abs(A.lr.l - want) <= 1 && Math.abs(A.lr.t - (A.pr.t + 2)) <= 0.6 && Math.abs(A.lr.h - (A.pr.h - 10)) <= 0.6 && gap >= 4 && gap <= 6 && A.tr.b <= A.pr.t && A.tr.t >= A.gr.t && A.tr.l >= A.pr.l - 0.5 && A.tr.r <= A.pr.r + 0.5; };
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
    /* A open 선 */
    const A0 = await openLook(pg);
    ok(`${W} A1 [ENTRY_OPEN_1023] 장면 줄(대기 · 입장 · 도착) 없음 · 옛 장면 문장 없음 · 그래프 aria-label 은 문장 그대로 · «open» 소문자 Cormorant Garamond 기울임 500 18/22 #6B5639 · 선 1px #8A724C 0.85 그림자 · 번짐 없음`,
      !!A0 && !A0.scene && !A0.old && /«입장!»이 끝나면|마지막 말이 끝나면/.test(A0.lbl) && A0.txt === 'open' && A0.font === 'Cormorant Garamond|italic|500|18px|22px|rgb(107, 86, 57)' && /^(normal|0px)$/.test(A0.ls)
      && A0.line === '1px|rgb(138, 114, 76)|0.85|none|none', A0);
    ok(`${W} A2 open 자리 — 올린 곡은 th(${A0 && A0.th != null ? A0.th.toFixed(2) : '?'} = open ${A0 && A0.open != null ? A0.open.toFixed(2) : '?'}) · 선 x = open/tend · 그래프 위 2px 에서 칸 높이 − 10px · 글자는 선 머리 위 4 ~ 6px · 곡선 위 · 카드 안 · 칸 안`,
      !!A0 && Math.abs(A0.open - A0.th) < 0.005 && openOk(A0), A0);
    if (SHOT) await pg.locator('.em-scene').screenshot({ path: path.join(SHOT, `scene-${W}-0.png`) }).catch(() => {});
    /* B-1 입장 장면 알약 — 누르고 · 멈추고 · 이어 듣기 */
    const P0 = await pill(pg, '.em-scene [data-fk="emscene"]');
    await pg.click('.em-scene [data-fk="emscene"]'); await pg.waitForFunction(() => EntryMusic._t.scene().run, null, { timeout: 15000 }).catch(() => {}); await pg.waitForTimeout(1200);
    const P1 = await pill(pg, '.em-scene [data-fk="emscene"]'), A1 = await openLook(pg);
    if (SHOT) await pg.locator('.em-scene').screenshot({ path: path.join(SHOT, `scene-${W}-1.png`) }).catch(() => {});
    await pg.click('.em-scene [data-fk="emscene"]'); await pg.waitForTimeout(400);
    const P2 = await pill(pg, '.em-scene [data-fk="emscene"]'), A2 = await openLook(pg);
    if (SHOT) await pg.locator('.em-scene').screenshot({ path: path.join(SHOT, `scene-${W}-2.png`) }).catch(() => {});
    const ps = [P0, P1, P2];
    ok(`${W} B1 [PLAY_MID_1023] 입장 알약 «${P0 && P0.t}» → «${P1 && P1.t}» → «${P2 && P2.t}» — 셋 다 가운데(${ps.map((x) => x && x.dx).join(' · ')}) · «멈춤 ↔ 이어 듣기» 동그라미 자리 그대로(${P1 && P1.sx} · ${P2 && P2.sx}) · 알약 크기 그대로 · 첫 판 한 줄(높이 ${P0 && P0.bh})`,
      ps.every(Boolean) && P0.t === '이 순간 전체 듣기 · 음악과 함께' && P1.t === '멈춤' && P2.t === '이어 듣기' && ps.every((x) => Math.abs(x.dx) <= 1 && x.pos === 'static') && Math.abs(P1.sx - P2.sx) < 0.6 && Math.abs(P1.sy - P2.sy) < 0.6 && same(ps, 'bw') && same(ps, 'bh') && P0.bh <= 53, { ps });
    ok(`${W} A3 누르고 멈춰도 open 선 · 글자 자리 · 색 그대로(채움만 진행)`,
      !!A1 && !!A2 && [A1, A2].every((x) => JSON.stringify([x.lr, x.tr, x.font, x.line]) === JSON.stringify([A0.lr, A0.tr, A0.font, A0.line])), { A1, A2 });
    ok(`${W} 가로 넘침 없음 · 페이지 오류 없음`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) && errs.length === 0, { errs });
    await ctx.close();
  }
  /* A4 [ENTRY_OPEN_1023] 양 끝 — open 이 맨 앞 · 맨 끝이어도 글자는 칸 안(잘림 없음) · 선은 칸 안 · A5 Welcome 숫자(엔진 plan) */
  { const ctx = await br.newContext({ viewport: { width: 390, height: 900 } }); const pg = await ctx.newPage();
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(500);
    const R = await pg.evaluate(() => { const g = document.createElement('div'); g.className = 'em-graph'; g.style.width = '300px'; g.innerHTML = '<div class="lg-names"></div><div class="lg-plot"><canvas></canvas><span class="lg-open" hidden><i class="lgo-l"></i><em class="lgo-t">open</em></span></div>'; document.body.appendChild(g);
      const plot = g.querySelector('.lg-plot'), out = {}; for (const f of [0, 0.5, 1]) { EntryMusic._t.openMark(g, { th: f * 100, tend: 100, H: 0 }); const p = plot.getBoundingClientRect(), l = g.querySelector('.lgo-l').getBoundingClientRect(), t = g.querySelector('.lgo-t').getBoundingClientRect();
        out[f] = { l: +(l.left - p.left).toFixed(1), tl: +(t.left - p.left).toFixed(1), tr: +(t.right - p.left).toFixed(1), pw: +p.width.toFixed(1) }; } g.remove(); return out; }).catch((e) => ({ err: e.message }));
    ok('A4 [ENTRY_OPEN_1023] 양 끝 — open 이 맨 앞(0) · 가운데 · 맨 끝이어도 글자는 칸 안(잘림 없음) · 선은 칸 안', !R.err && [0, 0.5, 1].every((f) => R[f].tl >= -0.5 && R[f].tr <= R[f].pw + 0.5 && R[f].l >= 0 && R[f].l <= R[f].pw - 1) && R[0].tl === 0 && Math.abs(R[1].tr - R[1].pw) <= 0.5, R);
    const W5 = await pg.evaluate(() => { const ES = window.EntryScene, T = EntryMusic._t;
      const r6 = T.recClean({ k: 'r6', t: 'Welcome to the Show', hook: 52.18, hook0: 52.18, hooks: [52.18, 114], len: 217.07 }), r1 = T.recClean({ k: 'r1', t: 'Popcorn', hook: 38.05, hook0: 38.1, hooks: [38.1, 87.14], len: 181.32 });
      const V = (sec) => ({ pieces: [{ d: sec / 2 }, { d: sec / 2 }], gaps: [0] }), pl = (m, sec) => ES.plan(V(sec), { dur: m.len, gain: 1 }, m.hook0, { hooks: m.hooks });
      const a = pl(r6, 17), b = pl(r6, 45), c = pl(r1, 17);
      return { r6: [r6.hook, r6.hook0, r6.hooks, r6.open], r1: [r1.hook, r1.hook0, r1.hooks, r1.open], aH: a.H, aD: +(T.openAt(a, r6) - a.th).toFixed(2), bH: b.H, bD: +(T.openAt(b, r6) - b.th).toFixed(2), cH: c.H, cD: +(T.openAt(c, r1) - c.th).toFixed(2) }; }).catch((e) => ({ err: e.message }));
    ok(`A5 [ENTRY_OPEN_1023] Welcome(r6) — 목록 52.18 · 114 → 50.18 · [50.18, 112] · 짧은 멘트 H ${W5.aH} · open = th + ${W5.aD} · 긴 멘트 H ${W5.bH} · open = th + ${W5.bD} · 다른 곡(r1) 목록 그대로 · H ${W5.cH} · open = th`,
      !W5.err && JSON.stringify(W5.r6) === '[50.18,50.18,[50.18,112],[54.96,116.77]]' && JSON.stringify(W5.r1) === '[38.05,38.1,[38.1,87.14],[]]' && W5.aH === 50.18 && W5.aD === 4.78 && W5.bH === 112 && W5.bD === 4.77 && W5.cH === 38.1 && W5.cD === 0, W5);
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
