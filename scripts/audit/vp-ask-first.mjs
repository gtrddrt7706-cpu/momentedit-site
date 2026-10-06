#!/usr/bin/env node
/* ★★[VP_ASK_FIRST 2026-10-06 사장님 «첫 화면인데 어떻게 준비할까요 아무것도 클릭 안 했는데 밑에는 이미 스튜디오 나레이션으로 기본 셋팅이 되어 있어»]
   하객 맞이 · 입장 · 식전 영상 소개 — 안내 목소리를 아직 안 골랐으면(CHIP_UNPICKED) 아래에 나레이션 흐름 · «나레이터가 읽어요» 덧말을 그리지 않고 «먼저 골라 주세요» 한 칸만.
   고르면 그 칸이 걷히고 그 판의 흐름이 열린다 · 칩은 여전히 비어 있다(기본을 눌린 것처럼 보이지 않는다)
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
for (const W of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`); await pg.waitForTimeout(700);
  const nx = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(500); };
  await nx(); await nx(); await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(300); await nx(); await pg.waitForTimeout(800);
  await pg.evaluate(() => { window._vc = (op) => Promise.resolve(op === 'status' ? { ok: true, on: true, groom: {}, bride: {}, per: {} } : { ok: false }); RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.on.prevideo = 1; opSync(); });
  for (const [k, vk] of [['guest', 'guestVoice'], ['entry', 'entryVoice'], ['prevideo', 'pvVoice']]) {
    await pg.evaluate((k) => { mkGo(k); try { lsStop(); } catch (e) {} window.scrollTo(0, 0); }, k); await pg.waitForTimeout(400);
    const look = (vk) => pg.evaluate((vk) => ({ ask: (document.querySelector('.mk-vpask') || {}).textContent || '', flow: !!document.querySelector('.mk-flow'), cards: document.querySelectorAll('.mk-vc').length,
      note: [...document.querySelectorAll('.ls-gnote')].map((e) => e.textContent).join('|'), on: [...document.querySelectorAll('[data-fk^="lsc:' + vk + ':"]')].filter((e) => e.getAttribute('aria-checked') === 'true' || e.classList.contains('on')).length }), vk);
    const a = await look(vk);
    if (SHOTS) await pg.screenshot({ path: path.join(SHOTS, `vp-ask-${k}-${W}.png`), fullPage: true });
    ok(`${W} ${k} 안 고름 — «먼저 골라 주세요» 칸(두 갈래 · 안 고르면 스튜디오 나레이션) · 흐름 · 줄 카드 · «나레이터가 읽어요» 없음 · 칩 비어 있음`,
      /먼저 골라 주세요/.test(a.ask) && /AI 두 분 목소리/.test(a.ask) && /스튜디오 나레이션으로 진행돼요/.test(a.ask) && !a.flow && a.cards === 0 && !/나레이터가 읽어요/.test(a.note) && a.on === 0, JSON.stringify(a));
    await pg.click(`[data-fk="lsc:${vk}:nar"]`); await pg.waitForTimeout(400);
    const b = await look(vk);
    ok(`${W} ${k} 스튜디오 나레이션 고름 — 칸이 걷히고 흐름 · 덧말이 열린다`, !b.ask && b.flow && /나레이터가 읽어요/.test(b.note) && b.on === 1, JSON.stringify(b));
  }
  /* ★[CHIP_W_FIX 2026-10-06 사장님 «버튼 클릭하는 거에 따라 2줄이 되고 1줄이 되고 · 1줄로 고정»] 어느 칩을 눌러도 칩 폭 · 줄 수가 그대로 */
  await pg.evaluate(() => { mkGo('entry'); try { lsStop(); } catch (e) {} });
  await pg.waitForTimeout(300);
  const fks = await pg.evaluate(() => [...document.querySelectorAll('[data-fk^="lsc:entry:"]')].map((e) => e.dataset.fk)); const seen = new Set();
  for (const fk of fks) { await pg.click(`[data-fk="${fk}"]`); await pg.waitForTimeout(200); await pg.evaluate(() => { try { lsStop(); } catch (e) {} });
    seen.add(await pg.evaluate(() => { const cs = [...document.querySelectorAll('[data-fk^="lsc:entry:"]')]; return new Set(cs.map((e) => Math.round(e.getBoundingClientRect().top))).size + ':' + cs.map((e) => Math.round(e.getBoundingClientRect().width)).join(','); })); }
  /* 이 환경의 대체 글꼴은 굵기가 같아 폭이 안 갈린다 — 그래서 «굵은 폭을 잡아 두는 장치» 자체도 본다(칩마다 숨은 굵은 사본) */
  const res = await pg.evaluate(() => [...document.querySelectorAll('.ls-cg .op-chip, .op-chips .op-chip')].every((b) => { const t = b.querySelector('.cg-t'), a = t && getComputedStyle(t, '::after'); return !!a && a.fontWeight === '600' && a.content === JSON.stringify(t.textContent) && a.visibility === 'hidden'; }));
  ok(`${W} [CHIP_W_FIX] 칩마다 굵은 폭 사본(.cg-t::after · 600 · 숨김)이 있다`, res);
  ok(`${W} [CHIP_W_FIX] 입장 멘트 칩 ${fks.length}개를 하나씩 눌러도 칩 폭 · 줄 수가 같다`, fks.length >= 4 && seen.size === 1, [...seen].join(' / '));
  ok(`${W} 화면 오류 없음`, !errs.length, errs.slice(0, 2).join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `✗ VP_ASK_FIRST 실패 ${fail}건` : '✓ VP_ASK_FIRST 통과'); process.exit(fail ? 1 : 0);
