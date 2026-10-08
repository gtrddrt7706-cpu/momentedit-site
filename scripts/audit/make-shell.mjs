#!/usr/bin/env node
/* ★★ 2026-10-03 사장님 묶음 — ② 하나씩 만들기의 겉틀 · 목소리 · 소리 규칙을 실제 화면으로 잰다(390 · 1280)
   [STEP_NONUM_OP]  걸음 이름에 ①②③④ 없음(화면 · 원문 글자 둘 다) · 마이페이지 청첩장 «1단계에서» 없음
   [STEP_COMPACT]   ② 순간 쪽 = 윗선 네 칸만(글자 없음 · 같은 색) · 예식 흐름 · ① · ③ · ④ = 이름 있는 표시 · 접힌 줄 머리 «하나씩 만들기 ·» · 펼친 첫 줄 = 걸음 이동(지나온 걸음만 단추)
   [VS_LINK_IN_ROW] 순간 쪽에 «안내 목소리 · … · 나레이션 자세히» 한 줄 없음 · «나레이션 자세히»는 목소리 준비 칩 줄 안(하객 맞이 · 식전 영상 · 입장) · 누르면 같은 창
   [MK_NO_DROP_LINK] 순간 쪽 «이 순간 빼기» 없음 · 옛 초안의 뺀 쪽(«다시 넣기»)은 그대로
   [CHIP_NO_AUTOPLAY] 어느 칩도 소리를 틀지 않는다(순간 쪽 · 연습 «이 순간 바꾸기») · 흐르던 소리는 멈춘다 · «이 순간 들어 보기»는 새로 고른 대로
   [VOICE_ONCE]     예식 흐름 다음 «두 분 목소리 만들기»(AI 를 쓸 수 있을 때만) · 순간 셈에서 빠진다 · 진행 «신랑 ✓ · 신부 남음» · «나중에 할게요» · 순간 쪽 한 줄 · 처음 창 없음
   [TEMPO_STEP]     말 빠르기 [−] 0 [＋] · ±0.3 · 0.1 걸음 · 끝에서 꺼짐 · 마지막 누름 0.8초 뒤 한 번만 다시 만듦 · 옛 0.9 → −0.1
   [NOTE_OFF_1003]  칩 아래 AI 설명 · 입장 «멘트를 바꾸면 …» 없음
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · SHOTS=<폴더> 면 장면마다 찍는다 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (pg, nm) => { if (!SHOTS) return; await pg.evaluate(() => { const n = document.getElementById('nav'); if (n) n.style.display = 'none'; }); await pg.screenshot({ path: path.join(SHOTS, nm + '.png'), fullPage: true }); await pg.evaluate(() => { const n = document.getElementById('nav'); if (n) n.style.display = ''; }); };

/* ── 원문 글자 검사(브라우저 없이) — 문자열 안의 ①②③④(주석 제외) ── */
function literals(src) { const out = []; let i = 0, line = 1; const n = src.length;
  while (i < n) { const c = src[i];
    if (c === '\n') { line++; i++; continue; }
    if (src.startsWith('<!--', i)) { const j = src.indexOf('-->', i); const e = j < 0 ? n : j + 3; line += (src.slice(i, e).match(/\n/g) || []).length; i = e; continue; }
    if (src.startsWith('/*', i)) { const j = src.indexOf('*/', i + 2); const e = j < 0 ? n : j + 2; line += (src.slice(i, e).match(/\n/g) || []).length; i = e; continue; }
    if (src.startsWith('//', i) && (i === 0 || !/[:\\]/.test(src[i - 1]))) { const j = src.indexOf('\n', i); i = j < 0 ? n : j; continue; }
    if (c === "'" || c === '"' || c === '`') { let j = i + 1; const st = line; while (j < n && src[j] !== c) { if (src[j] === '\\') { j += 2; continue; } if (src[j] === '\n' && c !== '`') break; j++; } out.push([st, src.slice(i, j + 1)]); line += (src.slice(i, j + 1).match(/\n/g) || []).length; i = j + 1; continue; }
    i++; }
  return out; }
{ const bad = [];
  for (const f of ['order-preview.html', 'assets/ritual-open.js']) literals(fs.readFileSync(path.join(ROOT, f), 'utf8')).forEach(([l, t]) => { if (/[①②③④]/.test(t)) bad.push(`${f}:${l} ${t.slice(0, 50)}`); });
  ok('[STEP_NONUM_OP] 식순 화면 글자(order-preview · ritual-open 문자열)에 ①②③④ 없음 — 걸음은 이름으로 가리킨다', !bad.length, bad.join(' | '));
  const my = []; literals(fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8')).forEach(([l, t]) => { if (/\d\s?단계에서/.test(t)) my.push(`mypage.html:${l} ${t.slice(0, 50)}`); });
  ok('[STEP_NONUM_OP] 마이페이지 입력 화면 글자에 «n단계에서» 없음(진행 표시에 번호가 없다 · WZ_STEP_NONUM)', !my.length, my.join(' | ')); }

async function open(w, o) {
  o = o || {};
  const ctx = await br.newContext({ viewport: { width: w, height: w < 1000 ? 844 : 900 }, hasTouch: w < 1000 }); const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.addInitScript(() => { window.__aplays = []; window.__calls = []; const P = HTMLMediaElement.prototype.play;
    HTMLMediaElement.prototype.play = function () { const s = String(this.getAttribute('src') || this.src || '');   /* currentSrc 는 src 를 바꾼 직후엔 앞 파일이다 */ if (this.tagName === 'AUDIO' && s && !/^data:/.test(s)) window.__aplays.push(s); return Promise.resolve(); }; });
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300);
  await pg.evaluate((o) => {
    window.__st = o.st || { ok: true, on: true, groom: {}, bride: {}, per: {} };
    window._vc = function (op, d) { window.__calls.push({ op, key: d && d.key, tempo: d && d.tempo, retempo: d && d.retempo, bg: d && d.bg }); if (op === 'status') return Promise.resolve(JSON.parse(JSON.stringify(window.__st))); return Promise.resolve({ ok: false, error: '시험' }); };
    if (o.ai) { RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.on.prevideo = 1; S.vsChip = 1; }
    opSync(); }, o);
  return { ctx, pg, errs, nx };
}

for (const w of [390, 1280]) {
  /* ── ① · ② 예식 흐름 · ② 순간 쪽 — 걸음 표시 [STEP_NONUM_OP · STEP_COMPACT] ── */
  { const { ctx, pg, errs, nx } = await open(w, { ai: true });
    const at1 = await pg.evaluate(() => ({ t: [...document.querySelectorAll('.op-steps li')].map((l) => l.textContent).join(' | '), c: !!document.querySelector('.op-steps-c') }));
    ok(`${w} [STEP_NONUM_OP] ① 걸음 표시 = «고르기 | 하나씩 만들기 | 연습하기 | 완성»(번호 없음) · 접은 표시 아님`, at1.t === '고르기 | 하나씩 만들기 | 연습하기 | 완성' && !at1.c, JSON.stringify(at1));
    await nx(); await pg.waitForTimeout(1200);
    const intro = await pg.evaluate(() => { const o = document.querySelector('.op-steps'), cs = (el) => getComputedStyle(el), lis = o ? [...o.querySelectorAll('li')] : [];
      const outer = (el) => { const r = el.getBoundingClientRect(), s = cs(el); return r.height + parseFloat(s.marginTop) + parseFloat(s.marginBottom); };
      return { at: _mkRO().at || '_intro', full: !!o, c: !!document.querySelector('.op-steps-c'), cols: lis.map((l) => cs(l).borderTopColor), h: o ? outer(o) : 0, head: document.getElementById('mkHead') ? 0 : 1, dlg: !!document.getElementById('mkRecDlg') }; });
    ok(`${w} [STEP_COMPACT] ② 예식 흐름 = 이름 있는 표시 그대로(접지 않음)`, intro.full && !intro.c, JSON.stringify(intro));
    await shot(pg, `intro-${w}`);
    ok(`${w} [VOICE_ONCE] ② 에 처음 들어와도 «안내 목소리 정하기» 창이 저절로 뜨지 않는다(다음 쪽이 그 일을 한다)`, !intro.dlg);
    const lab0 = await pg.evaluate(() => document.getElementById('next').textContent.trim());
    ok(`${w} [VOICE_ONCE] 예식 흐름의 다음 단추 = «이 흐름으로 시작하기 · 두 분 목소리 만들기»`, lab0 === '이 흐름으로 시작하기 · 두 분 목소리 만들기', lab0);
    const pages = await pg.evaluate(() => _mkPages());
    ok(`${w} [VOICE_ONCE] 쪽 차례 = 예식 흐름 → 두 분 목소리 만들기 → 하객 맞이 …`, pages[0] === '_intro' && pages[1] === '_voice' && pages[2] === 'guest', pages.join(','));
    await pg.evaluate(() => mkGo('candle')); await pg.waitForTimeout(500);
    const mo = await pg.evaluate(() => { const c = document.querySelector('.op-steps-c'), cs = (el) => getComputedStyle(el), sp = c ? [...c.children] : [];
      const outer = (el) => { const r = el.getBoundingClientRect(), s = cs(el); return r.height + parseFloat(s.marginTop) + parseFloat(s.marginBottom); };
      const pos = document.querySelector('#mkStrip .mk-pos'), ps = pos && pos.querySelector('.mk-pstep');
      return { c: !!c, full: !!document.querySelector('.op-steps'), n: sp.length, cls: sp.map((s) => s.className).join(','), cols: sp.map((s) => cs(s).backgroundColor), h2: sp[0] ? Math.round(sp[0].getBoundingClientRect().height) : 0, al: c && c.getAttribute('aria-label'), role: c && c.getAttribute('role'), txt: c ? c.textContent : '', btn: c ? c.querySelectorAll('button').length : -1, h: c ? outer(c) : 0,
        pos: pos ? pos.textContent : '', pstep: ps ? !ps.hidden : null, pcut: pos ? pos.scrollWidth > pos.clientWidth + 1 : null }; });
    ok(`${w} [STEP_COMPACT · STEP_LAB_TOP] 순간 쪽 = 접은 표시(윗선 네 칸 · 2px · 글자 없음 · 단추 없음 · role=img «4단계 중 2단계 · 하나씩 만들기») · 이름 있는 표시 없음`, mo.c && !mo.full && mo.n === 4 && mo.cls === 'done,on,,' && mo.h2 === 2 && !mo.txt && !mo.btn && mo.role === 'img' && mo.al === '4단계 중 2단계 · 하나씩 만들기', JSON.stringify(mo));
    ok(`${w} [STEP_COMPACT] 접은 표시의 색 = 이름 있는 표시 윗선 색(지나온 · 지금 · 남은)`, JSON.stringify(mo.cols.slice(0, 3)) === JSON.stringify(intro.cols.slice(0, 3)), JSON.stringify({ c: mo.cols, f: intro.cols }));
    ok(`${w} [STEP_COMPACT] 접힌 줄 = «하나씩 만들기 · 본식 n / N …»(잘리면 걸음 이름부터 뺀다 · 자리는 남는다) · 잘림 없음`, /본식\s*1\s*\/\s*\d+/.test(mo.pos) && mo.pcut === false && (mo.pstep ? /^하나씩 만들기 · /.test(mo.pos) : true) && (w < 1000 || mo.pstep === true), JSON.stringify(mo));
    console.log(`   · ${w} 세로로 아낀 높이 = ${Math.round(intro.h - mo.h)}px (이름 있는 표시 ${Math.round(intro.h)} → 접은 표시 ${Math.round(mo.h)})`);
    if (w === 390) ok(`390 [STEP_COMPACT] 위를 덜 차지한다(이름 있는 표시보다 25px 이상 낮다)`, intro.h - mo.h >= 25, `${intro.h} → ${mo.h}`);
    /* [STEP_LAB_TOP] 펼친 첫 줄에 걸음 줄이 없다 */
    await pg.click('[data-fk="mkfold"]'); await pg.waitForTimeout(250);
    const sp = await pg.evaluate(() => ({ stp: !!document.getElementById('mkStp'), ctl: document.querySelector('[data-fk="mkfold"]').getAttribute('aria-controls') }));
    ok(`${w} [STEP_LAB_TOP] «모든 순간 보기» 펼침에 걸음 줄 없음(순간 줄만)`, !sp.stp && sp.ctl === 'mkScP', JSON.stringify(sp));
    if (w === 390) await shot(pg, 'compact-open-390');
    for (const st of ['practice', 'done']) { await pg.evaluate((st) => opGoStep(st), st); await pg.waitForTimeout(700);
      const r = await pg.evaluate(() => ({ full: !!document.querySelector('.op-steps'), c: !!document.querySelector('.op-steps-c'), t: [...document.querySelectorAll('.op-steps li')].map((l) => l.textContent).join('|') }));
      ok(`${w} [STEP_COMPACT · STEP_NONUM_OP] ${st === 'practice' ? '③ 연습하기' : '④ 완성'} = 이름 있는 표시(번호 없음)`, r.full && !r.c && !/[①②③④]/.test(r.t), JSON.stringify(r)); }
    ok(`${w} 화면 오류 0`, !errs.length, errs.join(' | '));
    await ctx.close(); }

  /* ── 순간 쪽 — 목소리 줄 · 빼기 · 설명 [VS_LINK_IN_ROW · MK_NO_DROP_LINK · NOTE_OFF_1003] ── */
  { const { ctx, pg, errs, nx } = await open(w, { ai: true, st: { ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: {}, per: {} } });
    await nx(); await pg.waitForTimeout(1200);
    await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; render(); });
    const rows = {};
    for (const k of await pg.evaluate(() => _mkPages().filter((k) => k !== '_intro' && k !== '_sum' && k !== '_voice'))) {
      await pg.evaluate((k) => mkGo(k), k); await pg.waitForTimeout(350);
      rows[k] = await pg.evaluate(() => { const pg = document.querySelector('.mk-pg'), lk = [...document.querySelectorAll('[data-fk="mkvsopen"]')];
        return { bar: !!document.querySelector('.mk-vsbar'), link: lk.length, inVp: lk.every((b) => !!b.closest('.ls-cg.cg-vp')), drop: !!document.querySelector('[data-fk="mkdrop"]') || /이 순간 빼기/.test(pg ? pg.textContent : ''),
          aiNote: /각자 1분쯤 소리 내어 읽으면|각자 1분 읽으면|말투는 실제 목소리와 조금 다를 수|멘트를 바꾸면 두 분 목소리 입장 인사도/.test(pg ? pg.textContent : ''), vcSec: !!document.querySelector('.mk-aisec'), right: lk[0] ? Math.round(innerWidth - lk[0].getBoundingClientRect().right) : null, h: lk[0] ? Math.round(lk[0].getBoundingClientRect().height) : 0,
          top: (() => { const b = lk[0], cg = b && b.closest('.ls-cg.cg-vp'), gl = cg && cg.querySelector('.gl'), ch = cg && cg.querySelector('.op-chip'); if (!gl || !ch) return null;   /* [VS_LINK_TOP] 글자 아래 선 · 글씨 · 칩보다 위인가 */
            const tb = (el) => { const r = document.createRange(); r.selectNodeContents(el); const q = r.getClientRects()[0]; return q ? q.bottom : NaN; }, br = b.getBoundingClientRect(), cr = ch.getBoundingClientRect();
            return { dB: +(tb(b) - tb(gl)).toFixed(1), fs: getComputedStyle(b).fontSize === '12.5px' && getComputedStyle(gl).fontSize === '14px', above: tb(b) <= cr.top, sameRow: Math.abs(br.top - cr.top) < 4 }; })() }; }); }   /* [VP_ROW_A · CG_TITLE 2026-10-08] 제목 14px · 링크 12.5px(제목보다 한 단 아래) · 글자 아래 선 맞춤은 그대로 */
    const ks = Object.keys(rows), vp = ks.filter((k) => ['guest', 'prevideo', 'entry'].includes(k));
    ok(`${w} [VS_LINK_IN_ROW] 순간 쪽 어디에도 «안내 목소리 · … · 나레이션 자세히» 한 줄 없음`, ks.every((k) => !rows[k].bar), ks.filter((k) => rows[k].bar).join(','));
    ok(`${w} [VS_LINK_IN_ROW] «나레이션 자세히» = 하객 맞이 · 식전 영상 · 입장의 목소리 준비 칩 줄 안 한 개(누를 곳 44) · 그 밖 순간엔 없음`, vp.length === 3 && vp.every((k) => rows[k].link === 1 && rows[k].inVp && rows[k].h >= 44) && ks.filter((k) => !vp.includes(k)).every((k) => rows[k].link === 0), JSON.stringify(rows));
    if (w < 1000) ok(`${w} [VS_LINK_IN_ROW] 폰에서도 끝까지 쓴다 — 레일 자리를 비키지 않는다 [RAIL_IGNORE_FULL 2026-10-04 사장님]`, vp.every((k) => rows[k].right < 36), vp.map((k) => k + ':' + rows[k].right).join(','));
    /* ★[VS_LINK_TOP 2026-10-07 사장님 «3번으로 하는데 우측으로 붙이고 글씨도 같은 사이즈로 하고 위아래 정렬잡고»] 폰(≤460)은 질문 줄 오른쪽 · PC 는 칩 줄 오른쪽 그대로 */
    if (w <= 460) ok(`${w} [VS_LINK_TOP] 폰 — «나레이션 자세히»는 질문 줄(어떻게 준비할까요) 오른쪽 · 글씨 12.5px(질문 14px · VP_ROW_A) · 글자 아래 선 맞춤 · 칩보다 위`, vp.every((k) => rows[k].top && rows[k].top.fs && Math.abs(rows[k].top.dB) <= 1 && rows[k].top.above), vp.map((k) => k + ':' + JSON.stringify(rows[k].top)).join(' '));
    else ok(`${w} [VS_LINK_TOP] PC — 종전대로 칩 줄 오른쪽 끝`, vp.every((k) => rows[k].top && rows[k].top.sameRow), vp.map((k) => k + ':' + JSON.stringify(rows[k].top)).join(' '));
    ok(`${w} [MK_NO_DROP_LINK] 순간 쪽에 «이 순간 빼기» 없음(빼기는 예식 흐름 ✓/＋)`, ks.every((k) => !rows[k].drop), ks.filter((k) => rows[k].drop).join(','));
    ok(`${w} [NOTE_OFF_1003] 칩 아래 AI 설명(«각자 1분쯤 …» · «말투는 …») · 입장 «멘트를 바꾸면 …» 없음`, ks.every((k) => !rows[k].aiNote), ks.filter((k) => rows[k].aiNote).join(','));
    ok(`${w} [VOICE_ONCE] 순간 쪽에 «AI 두 분 목소리 만들기» 칸(사람 카드) 없음`, ks.every((k) => !rows[k].vcSec), ks.filter((k) => rows[k].vcSec).join(','));
    await pg.evaluate(() => mkGo('entry')); await pg.waitForTimeout(350); if (w === 390) await shot(pg, 'moment-entry-ai-390'); if (w === 1280) await shot(pg, 'moment-entry-ai-1280');
    await pg.click('[data-fk="mkvsopen"]'); await pg.waitForTimeout(400);
    ok(`${w} [VS_LINK_IN_ROW · VS_INFO] 칩 줄의 «나레이션 자세히» → 설명 창(«안내 목소리, 무엇이 다른가요»)`, await pg.evaluate(() => ((document.querySelector('#mkRecDlg .mk-dlg-t') || {}).textContent || '') === '안내 목소리, 무엇이 다른가요'));
    await pg.evaluate(() => mkDlgClose()); await pg.waitForTimeout(250);
    /* 옛 초안의 뺀 쪽 */
    await pg.evaluate(() => { mkGo('bless'); }); await pg.waitForTimeout(300); await pg.evaluate(() => mkDrop('bless')); await pg.waitForTimeout(350);
    const off = await pg.evaluate(() => ({ off: !!document.querySelector('.mk-pg.off'), un: !!document.querySelector('[data-fk="mkundrop"]'), pos: (document.querySelector('#mkStrip .mk-pos') || {}).textContent }));
    await pg.click('[data-fk="mkundrop"]'); await pg.waitForTimeout(400);
    const back = await pg.evaluate(() => ({ on: RitualOpen.onOf(S, 'bless'), f: document.activeElement && document.activeElement.id }));
    ok(`${w} [MK_NO_DROP_LINK] 옛 초안의 뺀 쪽은 그대로(흐리게 · «다시 넣기» → 다시 담기 · 초점은 쪽 제목)`, off.off && off.un && /뺀 순간/.test(off.pos) && back.on && back.f === 'mkHead', JSON.stringify({ off, back }));
    ok(`${w} 화면 오류 0(순간 쪽)`, !errs.length, errs.join(' | '));
    await ctx.close(); }

  /* ── 소리 — 칩은 고르기만 [CHIP_NO_AUTOPLAY] ── */
  { const { ctx, pg, errs, nx } = await open(w, { ai: false });
    await pg.evaluate(() => { const R = RitualOpen; ['ring', 'declare', 'tribute', 'cake', 'toast', 'letter', 'free'].forEach((k) => { S.on[k] = 1; }); opSync(); });
    await nx(); await pg.waitForTimeout(1200); await pg.evaluate(() => engine()); await pg.waitForTimeout(800);
    const res = [];
    for (const k of await pg.evaluate(() => _mkPages().filter((k) => k !== '_intro' && k !== '_sum' && k !== '_voice'))) {
      await pg.evaluate((k) => { try { lsStop(); } catch (e) {} mkGo(k); }, k); await pg.waitForTimeout(350);
      const chips = await pg.evaluate(() => [...document.querySelectorAll('.mk-pg [data-fk^="lsc:"][aria-checked="false"], .mk-pg [data-fk^="lsr"]')].map((b) => b.getAttribute('data-fk')));
      for (const fk of chips) { const n0 = await pg.evaluate(() => window.__aplays.length); const el = await pg.$(`[data-fk="${fk}"]`); if (!el) continue; await el.click().catch(() => {}); await pg.waitForTimeout(250);
        const n1 = await pg.evaluate(() => ({ n: window.__aplays.length, q: LP.q.length, pz: LP.paused })); res.push({ k, fk, d: n1.n - n0, q: n1.q }); } }
    const loud = res.filter((r) => r.d > 0);
    ok(`${w} [CHIP_NO_AUTOPLAY] 모든 순간 쪽 칩 ${res.length}번 눌러 소리 0(새 play() 없음)`, res.length >= 10 && !loud.length, loud.map((r) => r.k + ':' + r.fk).join(' | ') + ` (눌린 수 ${res.length})`);
    /* 흐르던 소리는 칩에서 멈춘다 · 들어 보기는 새로 고른 대로 */
    await pg.evaluate(() => mkGo('candle')); await pg.waitForTimeout(350);
    await pg.click('[data-fk="mkplay"]'); await pg.waitForTimeout(400);
    const p0 = await pg.evaluate(() => ({ n: window.__aplays.length, q: LP.q.length }));
    const other = await pg.evaluate(() => { const b = document.querySelector('.mk-pg [data-fk^="lsc:candleWho:"][aria-checked="false"]'); return b && b.getAttribute('data-fk'); });
    await pg.click(`[data-fk="${other}"]`); await pg.waitForTimeout(300);
    const p1 = await pg.evaluate(() => ({ n: window.__aplays.length, q: LP.q.length, paused: !LP.el || LP.el.paused }));
    ok(`${w} [CHIP_NO_AUTOPLAY] 듣는 중에 칩 → 소리가 멈춘다(줄 비움 · 새 play 없음)`, p0.q > 0 && p1.q === 0 && p1.n === p0.n, JSON.stringify({ p0, p1 }));
    await pg.click('[data-fk="mkplay"]'); await pg.waitForTimeout(400);   /* [PLAY_LEAD] 처음 1초는 빈소리 — 이 시험은 play() 를 막아 두어 «끝남»이 저절로 안 온다 · 빈소리가 끝난 것으로 친다 */
    await pg.evaluate(() => { if (LP.el && LP.el._lead) LP.el.dispatchEvent(new Event('ended')); }); await pg.waitForTimeout(300);
    const p2 = await pg.evaluate((fk) => { const want = fk.split(':')[2]; const st = _lSteps(ENG, ['candle']).filter((x) => x.src)[0]; const real = window.__aplays.filter((u) => !/^blob:/.test(String(u))); return { n: window.__aplays.length, cur: S.candleWho, want, first: real[real.length - 1], exp: st && st.src }; }, other);
    ok(`${w} [CHIP_NO_AUTOPLAY] «이 순간 들어 보기» = 새로 고른 대로(고른 값 ${p2.want} · 처음 튼 파일 = 지금 판의 첫 소리)`, p2.n > p1.n && p2.cur === p2.want && !!p2.exp && String(p2.first).endsWith(p2.exp.replace(/^\.?\//, '')), JSON.stringify(p2));
    await shot(pg, `moment-candle-${w}`);
    /* ★[PRACTICE_NO_CHOOSE 2026-10-05 사장님 «연습 공간에서 이 부분은 삭제»] 연습 «이 순간 바꾸기» 단추를 걷었다 — 연습은 듣기만 · 칩은 어느 순간에도 없다 */
    await pg.evaluate(() => { lsStop(); opGoStep('practice'); }); await pg.waitForTimeout(800);
    await pg.click('[data-fk="prall"]'); await pg.waitForTimeout(500);
    let prSeen = 0, prBad = 0; for (let i = 0; i < 12; i++) { const r = await pg.evaluate(() => ({ btn: !!document.querySelector('#lsFull [data-fk="lfchoose"]'), chips: document.querySelectorAll('#lsFull [data-fk^="lfc:"]').length })); prSeen++; if (r.btn || r.chips) prBad++; await pg.evaluate(() => { try { lsJump(1); } catch (e) {} }); await pg.waitForTimeout(250); }
    ok(`${w} [PRACTICE_NO_CHOOSE] 연습 중 어느 순간에도 «이 순간 바꾸기» · 칩이 없다`, prSeen > 0 && prBad === 0, JSON.stringify({ prSeen, prBad }));
    await shot(pg, `practice-${w}`);
    ok(`${w} 화면 오류 0(소리)`, !errs.length, errs.join(' | '));
    await ctx.close(); }

  /* ── 두 분 목소리 만들기 쪽 [VOICE_ONCE] — 안 만듦 · 한 분 · 두 분 ── */
  for (const [lab, st] of [['none', { groom: {}, bride: {} }], ['one', { groom: { consent: true, ready: true, left: 2, made: '2026-10-03' }, bride: {} }], ['both', { groom: { consent: true, ready: true, left: 2 }, bride: { consent: true, ready: true, left: 2 } }]]) {
    const { ctx, pg, errs, nx } = await open(w, { ai: true, st: Object.assign({ ok: true, on: true, per: {} }, st) });
    await nx(); await pg.waitForTimeout(900); await pg.evaluate(() => mkGo('_voice')); await pg.waitForTimeout(600);
    const v = await pg.evaluate(() => ({ h: (document.getElementById('mkHead') || {}).textContent, one: (document.querySelector('.mk-vpage .mk-one') || {}).textContent, prog: (document.querySelector('[data-fk="mkvprog"]') || {}).textContent, later: !!document.querySelector('[data-fk="mkvlater"]'),
      cards: document.querySelectorAll('.mk-vpage .mk-vr').length, next: document.getElementById('next').textContent.trim(), pos: (document.querySelector('#mkStrip .mk-pos') || {}).textContent, c: !!document.querySelector('.op-steps-c'),
      inStrip: !!document.querySelector('#mkStrip [data-fk="mkg:_voice"]'), lines: [...document.querySelectorAll('.mk-vpage p')].length }));
    if (SHOTS) await shot(pg, `voice-${lab}-${w}`);
    const want = undefined;   /* [VPROG_OFF 2026-10-04 사장님] «신랑 남음 · 신부 남음» 진행 줄은 걷었다 — 없어야 한다 */
    ok(`${w} [VOICE_ONCE] «두 분 목소리 만들기» 쪽(${lab}) — 제목 · 진행 줄 없음 [VPROG_OFF] · 사람 카드 둘 · 다음 «다음 · 하객 맞이 안내» · 진행 줄 순간 칸 아님 · 접은 표시`, v.h === '두 분 목소리 만들기' && v.prog === want && v.cards === 2 && v.next === '다음 · 하객 맞이 안내' && !v.inStrip && v.c && /두 분 목소리/.test(v.pos), JSON.stringify(v));
    if (lab === 'both') ok(`${w} [VOICE_ONCE] 두 분 다 만들었으면 조용한 «준비됐어요 · 아쉬우면 다시 녹음해요» · «나중에 할게요» 없음`, /^준비됐어요 · 아쉬우면 다시 녹음해요 자세히 보기$/.test(v.one) && !v.later, JSON.stringify(v));
    else ok(`${w} [VOICE_ONCE] 아직이면 설명 한 줄(«각자 1분쯤 …» · «말투는 … 다를 수 있어요») + «나중에 할게요»`, /^각자 1분 읽기 · 아쉬우면 다시 녹음해요 자세히 보기$/.test(v.one) /* [VS_ONE_LINE → VOICE_INTRO_ONE → VOICE_INTRO_LINE 2026-10-07] 한 줄 */ && v.later, JSON.stringify(v));
    if (lab === 'none') {
      await pg.evaluate(() => mkGo('guest')); await pg.waitForTimeout(400);
      const ng = await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; render(); const l = document.querySelector('[data-fk="mkvnone"]'); return { t: l && l.textContent, pos: (document.querySelector('#mkStrip .mk-pos') || {}).textContent }; });
      ok(`${w} [VOICE_ONCE] AI 인데 목소리가 없으면 순간 쪽에 한 줄 «두 분 목소리를 아직 만들지 않았어요 · 만들기» · 식전 1 / 2(목소리 쪽은 순간 셈에 안 든다)`, ng.t === '두 분 목소리를 아직 만들지 않았어요 · 만들기' && /식전\s*1\s*\/\s*2/.test(ng.pos), JSON.stringify(ng));
      await pg.click('[data-fk="mkvoicego"]'); await pg.waitForTimeout(400);
      ok(`${w} [VOICE_ONCE] «만들기» → «두 분 목소리 만들기» 쪽`, await pg.evaluate(() => _mkRO().at === '_voice'));
      await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'nar')); VS.inPick = false; render(); }); await pg.waitForTimeout(200);
      await pg.click('[data-fk="mkvcok:groom"]'); await pg.waitForTimeout(400);
      const go = await pg.evaluate(() => ({ cur: _vsCur(), t: ((document.querySelector('#mkRecDlg .mk-dlg-t') || {}).textContent || '') }));
      ok(`${w} [VOICE_ONCE · VP_UNPICKED_ALL] 이 쪽에서 «목소리 만들기 시작» → 동의 창 · 세 순간 고른 값은 그대로(미리 AI 로 고르지 않는다)`, go.cur === 'nar' && /님 목소리 만들기/.test(go.t), JSON.stringify(go));
      await pg.evaluate(() => mkDlgClose()); await pg.waitForTimeout(250);
      await pg.click('[data-fk="mkvlater"]'); await pg.waitForTimeout(500);
      const lt = await pg.evaluate(() => ({ at: _mkRO().at, v: [S.guestVoice, S.entryVoice, S.pvVoice].join(','), vf: JSON.stringify(S.vfill || {}) }));
      ok(`${w} [VOICE_ONCE · VP_UNPICKED_ALL] «나중에 할게요» → 하객 맞이로(막지 않는다) · 세 순간 고른 값은 그대로`, lt.at === 'guest' && lt.v === 'nar,nar,nar' && lt.vf === '{}', JSON.stringify(lt));
      await pg.evaluate(() => { opGoStep('done'); }); await pg.waitForTimeout(600); await pg.evaluate(() => _editOpen('entry')); await pg.waitForTimeout(600);
      ok(`${w} [VOICE_ONCE] ④ «변경»은 그 순간으로 바로(목소리 쪽을 거치지 않는다)`, await pg.evaluate(() => _mkRO().at === 'entry' && STEPS[idx].k === 'listen'));
    }
    ok(`${w} 화면 오류 0(목소리 쪽 ${lab})`, !errs.length, errs.join(' | '));
    await ctx.close(); }
  /* AI 를 못 쓰는 예식엔 그 쪽이 없다 */
  { const { ctx, pg, nx } = await open(w, { ai: false }); await nx(); await pg.waitForTimeout(900);
    const r = await pg.evaluate(() => ({ ps: _mkPages().slice(0, 3).join(','), next: document.getElementById('next').textContent.trim() }));
    ok(`${w} [VOICE_ONCE] AI 를 못 쓰는 예식 = 목소리 쪽 없음 · «이 흐름으로 시작하기 · 하객 맞이 안내»`, r.ps === '_intro,guest,prevideo' || (r.ps.indexOf('_voice') < 0 && r.next === '이 흐름으로 시작하기 · 하객 맞이 안내'), JSON.stringify(r));
    await ctx.close(); }

  /* ── 말 빠르기 · 문장 사이 쉼 = 사람별 [VOICE_TUNE 2026-10-04 사장님] (종전 순간 쪽 [TEMPO_STEP] 줄은 걷었다) ── */
  { const { ctx, pg, errs, nx } = await open(w, { ai: true, st: { ok: true, on: true, groom: { consent: true, ready: true, left: 2 }, bride: {}, per: {} } });
    await nx(); await pg.waitForTimeout(900);
    await pg.evaluate(() => { VS.inPick = true; VS_KEYS.forEach((k) => _lSet(k, 'ai')); VS.inPick = false; S.up = S.up || {}; ['g0', 'g2'].forEach((q) => { S.up[q] = { src: 'ai', id: 'local:' + q, tempo: '1', pause: 350, tx: _txSig(_recNeed(q)), by: 'groom' }; }); S.guestWho = { 0: 'g', 1: 'b', 2: 'g', 3: 'b' }; mkGo('guest'); }); await pg.waitForTimeout(500);
    ok(`${w} [VOICE_TUNE] 순간 쪽에 «말 빠르기 · 문장 사이 쉼» 줄이 없다`, await pg.evaluate(() => !document.querySelector('.mk-pg .mk-tp') && !document.querySelector('[data-fk="mkvtone"]')));
    await pg.evaluate(() => mkVcTune('groom')); await pg.waitForTimeout(500);
    const st0 = await pg.evaluate(() => { const d = document.getElementById('mkRecDlg'), g = d && d.querySelectorAll('.mk-dots'); if (!g || g.length !== 2) return null; const b = d.querySelector('[data-fk="mktune:t:3"]').getBoundingClientRect();
      return { n: g.length, tv: g[0].querySelector('.mk-dots-v').textContent, pv: g[1].querySelector('.mk-dots-v').textContent, tdots: g[0].querySelectorAll('[role="radio"]').length, pdots: g[1].querySelectorAll('[role="radio"]').length, chk: d.querySelector('[data-fk="mktune:t:3"]').getAttribute('aria-checked'), lab: d.querySelector('[data-fk="mktune:t:4"]').getAttribute('aria-label'), bw: Math.round(b.width), bh: Math.round(b.height), sw: document.documentElement.scrollWidth <= innerWidth, use: !!d.querySelector('[data-fk="mkvcuse"]'), redo: !!d.querySelector('[data-fk="mktuneredo"]') }; });
    ok(`${w} [TUNE_DOTS] «○○ 님 목소리 맞추기» — 점 줄 둘(빠르기 7 · 쉼 5) · 지금 «보통» · 라디오 · «말 빠르기 조금 빠르게» · 점마다 44×44 · 가로 넘침 없음 · [이 목소리로 쓰기] · 다시 녹음`, st0 && st0.tdots === 7 && st0.pdots === 5 && st0.tv === '보통' && st0.pv === '보통' && st0.chk === 'true' && st0.lab === '말 빠르기 조금 빠르게' && st0.bw >= 44 && st0.bh >= 44 && st0.sw && st0.use && st0.redo, JSON.stringify(st0));
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `tune-${w}.png`) });
    await pg.evaluate(() => { window.__calls.length = 0; });
    await pg.click('[data-fk="mktune:t:4"]'); await pg.click('[data-fk="mktune:p:3"]'); await pg.waitForTimeout(500);
    const mid = await pg.evaluate(() => ({ v: document.querySelectorAll('#mkRecDlg .mk-dots-v')[0].textContent, p: document.querySelectorAll('#mkRecDlg .mk-dots-v')[1].textContent, makes: window.__calls.filter((c) => c.op === 'make' && !c.bg).length /* [EX_PREBAKE] 예시 미리 만들기(bg)는 뒤에서 돈다 · 누른 것만 센다 */, f: document.activeElement && document.activeElement.getAttribute('data-fk'), saved: !!(S.vset && S.vset.groom) }));
    ok(`${w} [TUNE_DOTS] 점 누르기 → «조금 빠르게» · 쉼 «길게» · 누를 때는 만들지 않는다(돈 0) · 아직 저장 안 함 · 초점은 누른 점`, mid.v === '조금 빠르게' && mid.p === '길게' && mid.makes === 0 && !mid.saved && mid.f === 'mktune:p:3', JSON.stringify(mid));
    await pg.focus('[data-fk="mktune:t:4"]'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(200);
    const ky = await pg.evaluate(() => ({ t: VC.tune.tempo, f: document.activeElement && document.activeElement.getAttribute('data-fk') }));
    ok(`${w} [TUNE_DOTS] → 키로 한 칸(1.3 · 초점 따라감 · [TUNE_RECENTER] 가운데 1.1)`, ky.t === '1.3' && ky.f === 'mktune:t:5', JSON.stringify(ky));
    await pg.click('[data-fk="mktune:t:4"]'); await pg.waitForTimeout(200);
    await pg.click('[data-fk="mkvcuse"]'); await pg.waitForTimeout(500);
    const aft = await pg.evaluate(() => ({ vs: S.vset.groom, mk: window.__calls.filter((c) => c.op === 'make' && !c.bg) /* [EX_PREBAKE] */, rate: _upRate('g0'), tk: _tKey('g0') }));
    ok(`${w} [VOICE_TUNE] [이 목소리로 쓰기] → 신랑 값(1.2 · 1200 · [TUNE_RECENTER]) · 신랑이 읽는 AI 줄마다 한 번 retempo 1.2 · 창 닫힘`, aft.vs.tempo === '1.2' && aft.vs.pause === 1200 && aft.tk === '1.2' && aft.mk.length >= 1 && aft.mk.every((c) => String(c.tempo) === '1.2' && (c.key === 'g0' || c.key === 'g2')) && await pg.evaluate(() => !VC.tune), JSON.stringify(aft));
    const bt = await pg.evaluate(() => { S.vtempo = { guest: '0.9' }; return { g1: _tKey('g1'), g0: _tKey('g0') }; });
    ok(`${w} [VOICE_TUNE] 신부 값이 없으면 옛 순간 값(0.9) · 신랑 줄은 신랑 값(1.2)`, bt.g1 === '0.9' && bt.g0 === '1.2', JSON.stringify(bt));
    ok(`${w} 화면 오류 0(사람별 빠르기)`, !errs.length, errs.join(' | '));
    await ctx.close(); }
}
await br.close(); srv.close();
console.log(fail ? `\n결과 — 실패 ${fail}건` : '\n결과 — 전부 통과'); process.exit(fail ? 1 : 0);
