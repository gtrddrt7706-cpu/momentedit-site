#!/usr/bin/env node
/* ★★[TONE_FOLD_1023 2026-10-23 코워크 명세 · 묶음 B «먼저 듣고, 바꾸고 싶은 것만»]
   말투 줄(안내 멘트 · 예식 시작 안내 · 소개 멘트 · 입장 멘트 · ○○ 멘트)은 접힌 채로 보인다 —
   지금 고른 말투 이름 + 대본 첫 문장 · «듣기» · «말투 바꾸기» 한 줄. 누른 줄만 칩을 편다.
   진짜 식순 화면(order-preview.html)을 390 · 1280 · 붙인 화면(?embed=1)에서 잰다.
   1 접힘 — 말투 줄은 칩 0 · 이름(굵게) · 첫 문장 · 단추 둘 44px 이상 · aria-expanded=false
   2 첫 순간 화면에만 한 줄 «지금 보이는 안내로 진행해요. 들어 보고 바꿀 수 있어요.» · 다음 순간엔 없음
   3 «말투 바꾸기» → 그 줄만 칩이 펴지고 단추는 «접기» · 고른 칩이 눌린 모양(EX_CHIP_ON) · 다른 말투 줄은 그대로 접힘
   4 칩을 고르면 첫 문장이 바뀐다 · 줄은 펼친 채
   5 «듣기» → 흐름의 그 줄 ▶ 하나가 켜진다(같은 소리 · 같은 멈춤)
   6 칩 줄 아래 «고르지 않으시면 …» 같은 한 줄은 접어도 그대로
   7 가로 넘침 없음 · 페이지 오류 없음 · 붙인 화면 = 따로 연 화면(첫 문장 줄 같음)
   TF_OP=<order-preview.html 경로>(그 판으로 잰다 — 돌연변이 확인용)  VERBOSE=1
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const OP = process.env.TF_OP || '';
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const VERB = !!process.env.VERBOSE;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${(c && !VERB) || d === undefined ? '' : ' → ' + JSON.stringify(d)}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.mp3': 'audio/mpeg', '.mp4': 'video/mp4', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = (OP && u === '/order-preview.html') ? OP : path.join(ROOT, u);
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = `http://127.0.0.1:${srv.address().port}`;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const FIRST = '지금 보이는 안내로 진행해요. 들어 보고 바꿀 수 있어요.';
const ALL = ['candle', 'prevideo', 'welcome', 'vow', 'ring', 'declare', 'bless', 'free', 'letter', 'tribute', 'toast', 'table', 'song'];

const look = (pg) => pg.evaluate(() => ({
  rows: [...document.querySelectorAll('.mk-pick .ls-cg')].map((r) => {
    const ch = r.querySelector('.tn-ch'), hr = r.querySelector('.tn-hear'), q = r.querySelector('.tn-q');
    return { gl: ((r.querySelector('.gl') || {}).textContent || '').trim(), tone: !!q, folded: r.classList.contains('cg-tone'),
      chips: r.querySelectorAll('.op-chip').length, on: [...r.querySelectorAll('.op-chip[aria-checked="true"]')].map((b) => b.textContent.trim()),
      name: ((q && q.querySelector('b')) || {}).textContent || '', q: (q || {}).textContent || '',
      ch: ch ? { t: ch.textContent.trim(), h: Math.round(ch.getBoundingClientRect().height), ex: ch.getAttribute('aria-expanded'), fk: ch.getAttribute('data-fk') } : null,
      hr: hr ? { h: Math.round(hr.getBoundingClientRect().height), fk: hr.getAttribute('data-fk') } : null,
      note: [...r.querySelectorAll('.ls-gnote')].map((n) => n.textContent.trim()).join(' | ') };
  }),
  first: [...document.querySelectorAll('.tn-first')].map((n) => n.textContent.trim()),
  hz: document.documentElement.scrollWidth > innerWidth + 1 }));

async function open(W, emb) {
  const ctx = await br.newContext({ viewport: { width: W, height: 900 }, hasTouch: W < 1000 });
  const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(BASE + '/order-preview.html' + (emb ? '?embed=1' : ''), { waitUntil: 'load' }); await wait(700);
  const next = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else if (await pg.isVisible('.pk-go')) await pg.click('.pk-go'); await wait(500); };
  await next(); await next();
  await pg.evaluate((ks) => { ks.forEach((k) => S.on[k] = 1); try { opSync(); } catch (e) {} try { buildSteps(); } catch (e) {} _persist(); render(); }, ALL);
  await next(); await wait(500);
  return { ctx, pg, errs };
}
const studio = async (pg) => { await pg.evaluate(() => { const b = document.querySelector('[data-fk="lsc:guestVoice:nar"]') || [...document.querySelectorAll('.mk-pick .op-chip')].find((x) => /스튜디오/.test(x.textContent)); if (b) b.click(); }); await wait(600); };

const firstLines = {};
for (const [W, emb] of [[390, 0], [1280, 0], [390, 1]]) {
  const tag = `${W}${emb ? ' embed' : ''}`;
  const { ctx, pg, errs } = await open(W, emb);
  await pg.evaluate(() => mkGo('guest')); await wait(500); await studio(pg);
  const a = await look(pg); const tones = a.rows.filter((r) => r.tone);
  firstLines[tag] = tones.map((r) => r.q);
  ok(`${tag} 1 하객 맞이 — 말투 줄 둘 이상이 접혀 보인다(칩 0 · 이름 · 첫 문장)`, tones.length >= 2 && tones.every((r) => r.folded && r.chips === 0 && r.name.trim() && r.q.replace(r.name, '').replace(/^\s*·\s*/, '').trim().length > 4), tones);
  ok(`${tag} 1 단추 둘(듣기 · 말투 바꾸기) 44px 이상 · aria-expanded=false`, tones.every((r) => r.ch && r.hr && r.ch.h >= 44 && r.hr.h >= 44 && r.ch.t === '말투 바꾸기' && r.ch.ex === 'false'), tones.map((r) => [r.ch, r.hr]));
  ok(`${tag} 2 첫 순간 화면에 한 줄 «${FIRST}» 하나`, a.first.length === 1 && a.first[0] === FIRST, a.first);
  /* 3 · 4 — 예식 시작 안내를 편다 */
  const tgt = tones.find((r) => r.ch && /narEx:open/.test(r.ch.fk)) || tones[tones.length - 1];
  if (!tgt || !tgt.ch || !tgt.hr) { ok(`${tag} 3 «말투 바꾸기» 단추가 있다`, false, a.rows.map((r) => r.gl)); await ctx.close(); continue; }
  await pg.click(`[data-fk="${tgt.ch.fk}"]`); await wait(500);
  const b = await look(pg); const ob = b.rows.find((r) => r.ch && r.ch.fk === tgt.ch.fk); const others = b.rows.filter((r) => r.tone && r.ch.fk !== tgt.ch.fk);
  ok(`${tag} 3 «말투 바꾸기» → 그 줄만 칩이 펴지고 «접기» · 눌린 칩 하나(EX_CHIP_ON)`, ob && !ob.folded && ob.chips >= 2 && ob.ch.t === '접기' && ob.ch.ex === 'true' && ob.on.length === 1 && others.every((r) => r.folded && r.chips === 0), { ob, others: others.length });
  ok(`${tag} 6 칩 줄 아래 한 줄은 접어도 그대로`, b.rows.every((r) => !r.tone || r.ch.fk === tgt.ch.fk || r.note === (tones.find((t) => t.ch.fk === r.ch.fk) || {}).note) && (!tgt.note || ob.note.includes(tgt.note)), { before: tgt.note, after: ob && ob.note });
  const pick = await pg.evaluate((fk) => { const row = document.querySelector(`[data-fk="${fk}"]`).closest('.ls-cg'); const cs = [...row.querySelectorAll('.op-chip')]; const c = cs.find((x) => x.getAttribute('aria-checked') !== 'true'); if (!c) return ''; c.click(); return c.textContent.trim(); }, tgt.ch.fk); await wait(600);
  const c = await look(pg); const oc = c.rows.find((r) => r.ch && r.ch.fk === tgt.ch.fk);
  ok(`${tag} 4 칩을 고르면 이름 · 첫 문장이 바뀐다 · 펼친 채`, pick && oc && !oc.folded && oc.name.trim() === pick && oc.q !== ob.q, { pick, before: ob && ob.q, after: oc && oc.q });
  /* 5 듣기 */
  const hear = await pg.evaluate((fk) => { const b = document.querySelector(`[data-fk="${fk}"]`); if (!b) return -1; b.click(); return new Promise((r) => setTimeout(() => r(document.querySelectorAll('.mk-flow .mk-pl.on').length), 400)); }, tgt.hr.fk);
  ok(`${tag} 5 «듣기» → 흐름의 그 줄 ▶ 하나가 켜진다`, hear === 1, hear);
  await pg.evaluate(() => { try { if (window._mlStop) _mlStop(); } catch (e) {} });
  /* 2 다음 순간엔 그 한 줄 없음 · 화촉 · 입장도 접힘 */
  await pg.evaluate(() => mkGo('candle')); await wait(500); const d = await look(pg);
  ok(`${tag} 2 다음 순간(화촉)엔 그 한 줄 없음 · 화촉 멘트는 접힘`, d.first.length === 0 && d.rows.some((r) => r.tone && r.folded && /화촉/.test(r.gl)), d);
  ok(`${tag} 6 화촉 «서는 분» 칩 줄은 그대로(말투 줄 아님) · «고르지 않으시면» 한 줄`, d.rows.some((r) => !r.tone && r.chips >= 2 && /고르지 않으시면/.test(r.note)), d.rows.map((r) => [r.gl, r.tone, r.note]));
  await pg.evaluate(() => mkGo('entry')); await wait(500); await studio(pg); const e = await look(pg);
  ok(`${tag} 1 입장 — 입장 멘트는 접히고 입장 음악 칩은 그대로`, e.rows.some((r) => r.tone && r.folded && /입장 멘트/.test(r.gl)) && e.rows.some((r) => !r.tone && /입장 음악/.test(r.gl) && r.chips >= 2), e.rows.map((r) => [r.gl, r.tone, r.chips]));
  ok(`${tag} 7 가로 넘침 없음 · 페이지 오류 없음`, !a.hz && !b.hz && !c.hz && !d.hz && !e.hz && errs.length === 0, errs);
  await ctx.close();
}
ok('7 붙인 화면 = 따로 연 화면(390 · 하객 맞이 첫 문장 줄 같음)', JSON.stringify(firstLines['390']) === JSON.stringify(firstLines['390 embed']), firstLines);
await br.close(); srv.close();
console.log(fail ? `TONE FOLD FAIL ${fail}` : 'TONE FOLD OK');
process.exit(fail ? 1 : 0);
