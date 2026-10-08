#!/usr/bin/env node
/* ★★[NOTE_TOAST · CG_TITLE 2026-10-08 사장님 «두 분 목소리 대신 나레이터가 읽어요 이런 멘트 요약해서 아래 안내 문구로 · 어떻게 준비할지 먼저 골라 주세요처럼»
     · «안내 멘트 제목 부분도 똑같이» · «다른 이벤트 섹션도 동일하게» · «제목 폰트랑 하단 안내 멘트 팝업은 PC 도 적용 전부»]
   ① 모든 순간 쪽 칩 줄 제목 = 14px · 600 · 먹색 · 한 줄(폰 390 · PC 1280) · PC 이름표 칸 120px · 폰은 제목 위 여백이 아래의 2배 넘게
   ② 칩 줄 · 참고 예시 카드 줄 아래 덧말 없음 — 남는 것은 누르기 전에 읽혀야 하는 줄(«아직 고르지 않았어요 · …» · 큰절 팁)뿐
   ③ 누르면 아래 알림 한 줄 — 목소리(나레이션 · AI) · 가족 낭독 · 참고 예시 카드(칸 채움 · 부모님 · 선언문) · AI 예시 · 종전 칩 알림(서는 분)
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 없음'); srv.close(); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const KEEP = [/^아직 고르지 않았어요 · /, /^신랑분은 원하시면 큰절을 올리셔도 돼요$/];   // 누르기 전에 읽혀야 하는 줄
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window._vc = (op) => Promise.resolve(op === 'status' ? { ok: true, on: true, groom: {}, bride: {}, per: {} } : { ok: false }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1;
    ['candle', 'vow', 'declare', 'tribute', 'letter', 'bless', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.tipSeen = Object.assign({}, S.tipSeen, { keep: 1 }); opSync(); });
  /* ①② 모든 순간 쪽 */
  const ks = await pg.evaluate(() => _mkPages().filter((k) => k[0] !== '_')); const bad = [], extra = [], rhythm = []; let rows = 0;
  for (const k of ks) {
    await pg.evaluate((k) => { mkGo(k); try { lsStop(); } catch (e) {} }, k); await pg.waitForTimeout(250);
    const m = await pg.evaluate(() => { const rs = [...document.querySelectorAll('#stage .ls-cg')].filter((r) => r.offsetParent);   /* 고르기 묶음 · 참고 예시 카드 줄 모두 */
      return rs.map((r, i) => { const gl = r.querySelector('.gl'), cs = getComputedStyle(gl), g = gl.getBoundingClientRect(), ch = [...r.querySelectorAll('.cg-c > button')].map((b) => b.getBoundingClientRect()), prev = i && rs[i - 1].parentElement === r.parentElement ? rs[i - 1].getBoundingClientRect() : null;   /* 같은 묶음 안 바로 위 줄 */
        return { l: gl.textContent, fs: cs.fontSize, fw: cs.fontWeight, col: cs.color, lines: Math.round((g.height - parseFloat(cs.paddingTop)) / parseFloat(cs.lineHeight)), col1: Math.round(parseFloat(getComputedStyle(r).gridTemplateColumns)), below: ch.length ? Math.round(Math.min(...ch.map((c) => c.top)) - g.bottom) : null, above: prev ? Math.round(g.top - prev.bottom) : null,
          notes: [...r.querySelectorAll('.ls-gnote')].map((n) => n.textContent) }; }); });
    m.forEach((r) => { rows++; if (!(r.fs === '14px' && r.fw === '600' && r.col === 'rgb(58, 45, 34)' && r.lines === 1 && (W < 461 || r.col1 === 120))) bad.push(k + ':' + JSON.stringify(r));
      r.notes.filter((t) => !KEEP.some((re) => re.test(t))).forEach((t) => extra.push(k + ':' + r.l + ':' + t));
      if (W < 461 && r.above != null && r.below != null && !(r.above >= 2 * r.below)) rhythm.push(k + ':' + r.l + ' above ' + r.above + ' below ' + r.below); });
  }
  ok(`${W} [CG_TITLE] 모든 순간 쪽 칩 줄 제목 ${rows}줄 = 14px · 600 · 먹색 · 한 줄${W >= 461 ? ' · 이름표 칸 120px' : ''}`, rows >= 14 && !bad.length, bad.slice(0, 3).join(' | '));
  if (W < 461) ok(`${W} [CG_TITLE] 폰 — 제목 위 여백이 아래(제 칩까지)의 2배 이상(위 칩 줄이 아니라 제 칩과 한 묶음)`, !rhythm.length, rhythm.slice(0, 3).join(' | '));
  ok(`${W} [NOTE_TOAST] 칩 줄 · 참고 예시 카드 줄 아래 덧말 없음 — 남는 것은 «아직 고르지 않았어요 · …» · 큰절 팁뿐`, !extra.length, extra.slice(0, 4).join(' | '));
  /* ③ 누르면 아래 알림 */
  const press = async (k, fk) => pg.evaluate(async ([k, fk]) => { mkGo(k); try { lsStop(); } catch (e) {} await new Promise((r) => setTimeout(r, 200)); const u0 = document.getElementById('lsToast'); if (u0) { u0.hidden = true; u0.innerHTML = ''; }
    const b = document.querySelector('#stage [data-fk="' + fk + '"]'); if (!b) return { none: fk }; b.click(); await new Promise((r) => setTimeout(r, 300)); try { lsStop(); } catch (e) {}
    const u = document.getElementById('lsToast'), row = b.closest('.ls-cg'); return { toast: u && !u.hidden ? u.textContent : '', h: u && !u.hidden ? Math.round(u.getBoundingClientRect().height) : 0, note: row ? [...row.querySelectorAll('.ls-gnote')].map((n) => n.textContent).join('|') : '' }; }, [k, fk]);
  const want = [['guest', 'lsc:guestVoice:nar', '나레이터가 두 분 대신 읽어요'], ['guest', 'lsc:guestVoice:ai', 'AI가 두 분 목소리로 읽어요'], ['prevideo', 'lsc:pvVoice:nar', '나레이터가 두 분 대신 읽어요'], ['entry', 'lsc:entryVoice:nar', '나레이터가 두 분 대신 읽어요'],
    ['declare', 'lsc:declare:family', '선언문은 인쇄해 당일 디렉터가 건네 드려요'], ['vow', 'mkrc:vow:1', '아래 칸에 넣었어요 · 고쳐 써도 돼요'], ['bless', 'mkrc:bless:1', '부모님 이야기로 바꿔도 돼요'], ['candle', 'lsc:candleWho:fathers', '‹양가 아버님›으로 바꿨어요']];
  for (const [k, fk, t] of want) { const r = await press(k, fk); ok(`${W} [NOTE_TOAST] ${k} ${fk} → 아래 알림 «${t}» 한 줄 · 칩 아래 덧말 없음`, r.toast === t && r.h > 0 && r.h <= 52 && !/나레이터가|선언문은|아래 칸에|이야기로 바꿔도/.test(r.note || ''), JSON.stringify(r)); }
  { await pg.evaluate(() => { S.pvVoice = 'couple'; S.vfill = Object.assign({}, S.vfill, { prevideo: 'ai' }); S.touched = Object.assign({}, S.touched, { pvVoice: 1 }); buildSteps(); }); const r = await press('prevideo', 'mkex:pv:2');
    ok(`${W} [NOTE_TOAST] 식전 영상 AI 예시 → 아래 알림 «아래 글을 바꿨어요 · 고쳐 써도 돼요» · 칩 줄 아래 «고르면 아래 글이 바뀌어요» 없음`, r.toast === '아래 글을 바꿨어요 · 고쳐 써도 돼요' && !/고르면 아래 글이/.test(r.note || ''), JSON.stringify(r)); }
  { const r = await pg.evaluate(async () => { S.tipSeen = {}; mkGo('entry'); await new Promise((r) => setTimeout(r, 200)); const u0 = document.getElementById('lsToast'); if (u0) { u0.hidden = true; u0.innerHTML = ''; }
      const b = document.querySelector('#stage [data-fk="lsc:entryVoice:ai"]'); if (b && b.getAttribute('aria-checked') === 'true') { document.querySelector('#stage [data-fk="lsc:entryVoice:nar"]').click(); await new Promise((r) => setTimeout(r, 200)); if (u0) { u0.hidden = true; u0.innerHTML = ''; } }
      document.querySelector('#stage [data-fk="lsc:entryVoice:ai"]').click(); await new Promise((r) => setTimeout(r, 300)); const u = document.getElementById('lsToast'), d = document.getElementById('mkRecDlg'); const out = { dlg: !!d, toast: u && !u.hidden ? u.textContent : '' }; try { mkDlgClose(); } catch (e) {} return out; });
    ok(`${W} [NOTE_TOAST] 처음 AI 를 누를 때 «확정하면 이렇게 돼요» 창이 열리면 아래 알림은 띄우지 않는다(창이 말한다)`, r.dlg && !r.toast, JSON.stringify(r)); }
  ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `✗ NOTE_TOAST 실패 ${fail}건` : '✓ NOTE_TOAST 통과'); process.exit(fail ? 1 : 0);
