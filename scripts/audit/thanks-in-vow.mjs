// ★★[THANKS_IN_VOW 2026-10-11 사장님 «감사문 — 서약 카드 안에서 고르기»(추천대로)] 서약 카드 «무엇을 읽나요 · 서약 / 감사문» (390 · 1280)
//   ①칩 «무엇을 읽나요» 처음엔 안 눌림 · 안 고른 한 줄에 «서약 · 한 줄씩 번갈아 · 신랑부터 진행돼요»
//   ②감사문 → 이름 «감사문» · 머리 설명 · 참고 예시 넷(감사문 예시) · 맨 아래 «두 분 함께» = THANKSBOTH · 흐름 «하객께 감사문» · 엔진 여는 말 133
//   ③예시 카드 → 글칸에 감사문 예시 · 대본 내보내기 «감사문» · 미리듣기 주소에 판 이름
//   ④서약으로 돌아가면 적은 글은 그대로 · 이름 «혼인 서약» · VOWBOTH · 서약 예시
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOT = process.env.THANKS_SHOT || '';
const shot = async (pg, sel, nm) => { if (!SHOT) return; await pg.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }, sel); await pg.screenshot({ path: `${SHOT}-${nm}.png` }); };
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.vow = 'ok'; S.on = S.on || {}; S.on.vow = 1; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(400); await pg.evaluate(() => mkGo('vow')); await wait(600);
    const a = await pg.evaluate(() => { const rg = [...document.querySelectorAll('[role=radiogroup]')].filter((r) => /무엇을 읽나요/.test(r.getAttribute('aria-label')));
      return { n: rg.length, chips: rg[0] ? [...rg[0].querySelectorAll('[role=radio]')].map((x) => x.textContent.trim()) : [], pressed: rg[0] ? rg[0].querySelectorAll('[aria-checked=true]').length : -1,
        note: (document.querySelector('.mk-vpask1') || {}).textContent || '', head: (document.getElementById('mkHead') || {}).textContent || '' }; });
    ok(`${w} ① «무엇을 읽나요» 칩 둘(서약 · 감사문) · 처음엔 안 눌림 · 안 고른 한 줄 «서약 · 한 줄씩 번갈아 · 신랑부터»`, a.n === 1 && a.chips.join() === '서약,감사문' && a.pressed === 0 && /고르지 않으시면 서약 · 한 줄씩 번갈아 · 신랑부터 진행돼요/.test(a.note) && /혼인 서약/.test(a.head), JSON.stringify(a));
    await shot(pg, '.mk-one', `vow-${w}`);
    await pg.click('[data-fk="lsc:vowKind:thanks"]'); await wait(600);
    const b = await pg.evaluate(() => { const both = [...document.querySelectorAll('.mk-vwboth .mk-vwfix')].map((r) => r.textContent);
      const refs = [...document.querySelectorAll('[data-fk^="mkrc:vow:"]')].length;
      const steps = _lSteps(ENG, ['vow']).map((x) => x.txt); const cue = ENG.RitualCue.build(S, { mode: 'preview' }).cues.filter((x) => x.k === 'vow');
      return { kind: S.vowKind, head: (document.getElementById('mkHead') || {}).textContent || '', one: (document.querySelector('.mk-pg .mk-one') || {}).textContent || '', both, refs, steps, files: cue.map((x) => x.file),
        note: (document.querySelector('.mk-vpask1') || {}).textContent || '', lab: (document.querySelector('.mk-vwl') || {}).getAttribute ? document.querySelector('.mk-vwl').getAttribute('aria-label') : '' }; });
    ok(`${w} ② 감사문 → 이름 «감사문» · 머리 설명 · 참고 예시 넷 · 맨 아래 «두 분 함께» = THANKSBOTH · 줄 칸 이름 «감사문»`, b.kind === 'thanks' && /감사문/.test(b.head) && !/혼인 서약/.test(b.head) && /감사문을 직접 읽어요/.test(b.one)
      && b.refs === 4 && JSON.stringify(b.both) === JSON.stringify(D.THANKSBOTH) && /번갈아 읽을 감사문/.test(b.lab), JSON.stringify(b));
    ok(`${w} ② 흐름 «하객께 감사문» · «마지막 한 문장은 두 분이 함께» · 엔진 여는 말 133 하나(맺는 말 없음) · 안 고른 한 줄에 «서약» 없음`, b.steps.some((t) => /하객께 감사문을 읽어요/.test(t)) && b.steps.some((t) => t === '마지막 한 문장은 두 분이 함께 읽어요')
      && !b.steps.some((t) => /돌아서서/.test(t)) && b.files.filter((f) => !/_bridge-/.test(f)).join() === '133_narr-thanks-in' && b.files.every((f) => !/_bridge-/.test(f) || f === '244_bridge-b8-face-guests') && !/서약/.test(b.note)   /* ★[REVIEW26_1023 검토 150-2] 맞절 → 감사문 사이 B8(244 «하객 여러분을 향해 서시겠습니다»)은 들어온다 · 이음말 밖의 엔진 줄은 133 하나 */, JSON.stringify(b.steps) + ' ' + b.files.join() + ' ' + b.note);
    await shot(pg, '.mk-one', `thanks-${w}`);
    await pg.click('[data-fk^="mkrc:vow:0"]').catch(() => {}); await wait(500);
    const c = await pg.evaluate(() => { let link = ''; try { link = RitualPreviewLink.pick(S).vowKind; } catch (e) { link = 'ERR ' + e.message; }
      return { g: String((S.tx || {})['vow.g'] || ''), b: String((S.tx || {})['vow.b'] || ''), script: scriptTextOpen(), link }; });
    /* [SOURCE_FIRST_1016] 감사문 예시는 자료 글 그대로(띄어쓰기 «와주신» 포함) — 띄어쓰기는 자료를 따른다 */
    ok(`${w} ③ 예시 카드 → 두 분 글칸에 감사문 예시 · 대본 내보내기 «감사문» · 미리듣기 주소 vowKind=thanks`, /와 ?주신/.test(c.g + c.b) && /부모님/.test(c.g + c.b) && /\n\d+\. 감사문/.test(c.script) && /감사문/.test(c.script) && c.link === 'thanks',
      JSON.stringify({ g: c.g.slice(0, 40), b: c.b.slice(0, 40), link: c.link, s: (c.script.match(/.*감사문.*/g) || []).slice(0, 3) }));
    await shot(pg, '.mk-say', `thanks-filled-${w}`);
    const kept = await pg.evaluate(() => String((S.tx || {})['vow.g'] || ''));
    await pg.click('[data-fk="lsc:vowKind:vow"]'); await wait(600);
    const d = await pg.evaluate(() => ({ kind: S.vowKind, g: String((S.tx || {})['vow.g'] || ''), head: (document.getElementById('mkHead') || {}).textContent || '',
      both: [...document.querySelectorAll('.mk-vwboth .mk-vwfix')].map((r) => r.textContent), files: ENG.RitualCue.build(S, { mode: 'preview' }).cues.filter((x) => x.k === 'vow').map((x) => x.file) }));
    ok(`${w} ④ 서약으로 돌아가면 적은 글 그대로 · 이름 «혼인 서약» · VOWBOTH · 여는 말 13 · 맺는 말 14`, d.kind === 'vow' && d.g === kept && kept.length > 0 && /혼인 서약/.test(d.head)
      && JSON.stringify(d.both) === JSON.stringify(D.VOWBOTH) && d.files.filter((f) => !/_bridge-/.test(f)).join() === '13_narr-vow-in,14_narr-vow-out', JSON.stringify(d));   /* ★[REVIEW26_1023 검토 150-1 5)] 서약이 마지막 순간이면 닫는 인사 앞 B8(244)이 붙는다(CLOSE_SEAM) · 이음말 밖은 13 · 14 */
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nTHANKS IN VOW FAIL ${fail}` : '\nTHANKS IN VOW OK'); process.exit(fail ? 1 : 0);
