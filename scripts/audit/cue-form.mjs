#!/usr/bin/env node
/* ★★[CUE_FORM 2026-10-06 사장님 «전에 쓰던 폼 그대로 · 텍스트박스에 바로 들어가는 것 · 현장에서 바로 할게요 체크 · 큐 사인을 알기 위해 적는 것 · 원치 않으면 체크하고 끝 신호만»
     + «마지막 한마디나 모션 · 대사로 끝나는 게 아닐 수도 있잖아»]
   두 분이 직접 말하는 순간(첫인사 · 서약 · 편지 + 부모님께 인사)을 실제 화면으로 잰다(390 · 1280)
   ① 예시 카드 → 글이 칸에 바로(신랑 · 신부) · 그 카드가 골라진다 · «예시 글» 표 · 미리보기 글 없음
   ② 고쳐 쓴 글이 있으면 다른 예시로 덮기 전에 묻는다 · «그대로 두기»면 남는다
   ③ «현장에서 바로 할게요» → 그 분 글칸이 접히고 끝 신호 칸(말이나 동작 예시) · 글은 지우지 않는다 · 끝 신호를 적어야 다 됨
   ④ 왜 적는지 한 줄 · 체크 안내 한 줄
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 · SHOTS=<폴더> 면 찍는다 */
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
const SHOTS = process.env.SHOTS || ''; if (SHOTS) fs.mkdirSync(SHOTS, { recursive: true });
const shot = async (pg, nm) => { if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, nm + '.png'), fullPage: true }); };
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
  await pg.evaluate(() => { S.on.welcome = 1; S.on.vow = 1; S.on.letter = 1; opSync(); });
  const cs = (id) => pg.evaluate((id) => (S.tx || {})[id] || '', id);
  for (const k of ['welcome', 'vow', 'letter']) {
    await pg.evaluate((k) => { if (k === 'vow') S.vowHow = 'each'; mkGo(k); try { lsStop(); } catch (e) {} }, k); await pg.waitForTimeout(500);   /* [VOW_FORM] 두 칸 = «각자 차례로» 판(번갈아 줄 칸은 vow-form.mjs) */
    const a0 = await pg.evaluate(() => ({ why: (document.querySelector('.mk-txwhy') || {}).textContent || '', alt: (document.querySelector('.mk-txalt') || {}).textContent || '', on: document.querySelectorAll('.mk-rc[aria-checked="true"]').length, rw: document.querySelectorAll('.mk-rw').length, card: !!document.querySelector('.mk-txc .mk-txr'), ta: document.querySelectorAll('.mk-txc textarea').length }));
    ok(`${W} ${k} 처음 — 왜 적는지 한 줄 · 체크 안내 줄은 편지만(그 밖은 체크칸이 말한다 [TXALT_OFF]) · 두 분 칸 = 한 카드 · 아무 예시도 안 골라짐 · 미리보기 글 없음`, /디렉터/.test(a0.why) && (k === 'letter' ? /끝 신호/.test(a0.alt) : a0.alt === '') && a0.card && a0.ta === 2 && a0.on === 0 && a0.rw === 0, JSON.stringify(a0));
    await pg.click(`[data-fk="mkrc:${k}:0"]`); await pg.waitForTimeout(400);
    const g1 = await cs(k + '.g'), b1 = await cs(k + '.b');
    const a1 = await pg.evaluate((k) => ({ on: (document.querySelector('.mk-rc[aria-checked="true"]') || {}).dataset?.fk || '', ta: (document.getElementById('mkt_' + k + '_g') || {}).value || '', tag: document.querySelectorAll('.mk-txc .mk-extag').length }), k);
    ok(`${W} ${k} 예시 1 → 신랑 · 신부 칸에 바로 · 그 카드가 골라짐 · «예시 글» 표 없음 [EXTAG_OFF]`, g1.length > 10 && b1.length > 10 && a1.ta === g1 && a1.on === `mkrc:${k}:0` && a1.tag === 0, JSON.stringify({ g1: g1.slice(0, 20), b1: b1.slice(0, 20), ...a1 }));
    if (k === 'welcome') await shot(pg, `cue-form-filled-${W}`);
    await pg.fill(`#mkt_${k}_g`, g1 + ' 고맙습니다.'); await pg.waitForTimeout(150);
    await pg.click(`[data-fk="mkrc:${k}:1"]`); await pg.waitForTimeout(300);
    const ask = await pg.evaluate(() => (document.querySelector('.ord-ask') || {}).textContent || '');
    ok(`${W} ${k} 고쳐 쓴 글이 있으면 다른 예시로 덮기 전에 묻는다`, /예시로 바꿀까요/.test(ask), ask.slice(0, 80));
    await pg.click('.ord-ask .oa-no'); await pg.waitForTimeout(300);
    ok(`${W} ${k} «그대로 두기»면 고쳐 쓴 글이 남는다`, (await cs(k + '.g')) === g1 + ' 고맙습니다.');
    await pg.click(`[data-fk="mkchk:${k}.b"]`); await pg.waitForTimeout(400);
    const a2 = await pg.evaluate((k) => ({ ta: !!document.getElementById('mkt_' + k + '_b'), cue: !!document.getElementById('mkcue_' + k + '_b'), ex: [...document.querySelectorAll(`[data-fk^="mkcueex:${k}.b:"]`)].map((e) => e.textContent), keep: (S.tx || {})[k + '.b'] || '', todo: _mkTasks(k).filter((t) => t.id === k + '.b')[0].done }), k);
    if (k === 'vow') {   /* ★[CUE_LAST 2026-10-06] 서약은 끝에 두 분이 함께 읽는 두 문장이 끝 신호 — 체크만으로 다 됨 · 끝 신호 칸 없음 */
      ok(`${W} vow «현장에서 …» 체크 → 글칸이 접히고 끝 신호 칸은 없다 · 글은 지우지 않는다 · 체크만으로 다 됨 [CUE_LAST]`, !a2.ta && !a2.cue && a2.keep === b1 && a2.todo === true, JSON.stringify(a2));
    } else {
    ok(`${W} ${k} «현장에서 …» 체크 → 그 분 글칸이 접히고 끝 신호 칸 · 예시에 말과 동작이 섞여 있다 · 글은 지우지 않는다 · 끝 신호 전엔 미완료`, !a2.ta && a2.cue && a2.ex.some((x) => /감사합니다/.test(x)) && a2.ex.some((x) => /고개 숙여|손을 잡/.test(x)) && a2.keep === b1 && a2.todo === false, JSON.stringify(a2));
    if (k === 'welcome') await shot(pg, `cue-form-site-${W}`);
    await pg.click(`[data-fk="mkcueex:${k}.b:1"]`); await pg.waitForTimeout(300);
    const a3 = await pg.evaluate((k) => ({ cue: (S.cueSig || {})[k + '.b'] || '', todo: _mkTasks(k).filter((t) => t.id === k + '.b')[0].done }), k);
    ok(`${W} ${k} 동작 예시(«고개 숙여 인사»)를 고르면 끝 신호가 되고 다 됨`, /고개 숙여/.test(a3.cue) && a3.todo === true, JSON.stringify(a3));
    }
    await pg.click(`[data-fk="mkchk:${k}.b"]`); await pg.waitForTimeout(300);
    ok(`${W} ${k} 체크를 풀면 글칸과 적어 둔 글이 그대로 돌아온다`, await pg.evaluate((a) => (document.getElementById('mkt_' + a.k + '_b') || {}).value === a.b1, { k, b1 }));
  }
  ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
/* 콘솔 — «현장에서 바로»면 글이 있어도 끝 신호가 먼저 */
{ const con = fs.readFileSync(path.join(ROOT, 'console.html'), 'utf8');
  ok('콘솔 cueEnd — 체크한 분은 끝 신호(cueSig)가 글 마지막 문장보다 먼저 [CUE_FORM]', /if \(mk\[x\[0\]\]\) out\.push\(x\[1\] \+ ' · ' \+ \(cu \|\| \(t \?/.test(con));
  ok('콘솔 cueEnd — 첫인사 · 편지는 마지막 분 하나 · 서약은 두 분 함께 문장 [CUE_LAST]', /c\.k === 'vow' && c\.live\.both/.test(con) && /out\[out\.length - 1\]/.test(con)); }
await br.close(); srv.close();
console.log(fail ? `✗ CUE_FORM 실패 ${fail}건` : '✓ CUE_FORM 통과'); process.exit(fail ? 1 : 0);
