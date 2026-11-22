// ★★[THANKS_SWAP_1122 2026-11-22 사장님 «추천대로»] 감사 인사 ↔ 감사문 둘 중 하나 · 서약 카드는 서약 고정 (390 · 1280)
//   옛 [THANKS_IN_VOW 10-11] 서약 카드 «무엇을 읽나요» 화면 검사(thanks-in-vow.mjs)와 겹침 알림 검사(thanks-dup-toast.mjs)를 이 하나로 바꿨다(검사 은퇴 길).
//   ① 고르기 — 감사 인사 · 감사문 한 카드(축사 · 축가 카드와 같은 꼴): 감사문을 누르면 감사 인사가 빠지고(개수 그대로) · 되누르면 돌아온다 · 둘 다 빠진 카드의 ＋ = 창(감사 인사 담기 · 감사문 담기)
//   ② 하나씩 만들기 — 감사문 판: 이름 «감사문» · 신랑 칸 위 · 신부 칸 아래 · 맨 아래 «두 분 함께» = THANKSBOTH · 참고 예시는 감사문 예시 · 감사문 멘트 칩 · 엔진 133 · 판을 바꿔도 글은 보관
//   ③ 서약 카드에 «무엇을 읽나요» 칩이 없다 · 옛 vowKind 는 읽지 않는다 · 대본 내보내기 «감사문»
//   THANKS_SHOT=<폴더> 면 폰 · PC 화면(고르기 카드 · 감사문 쪽)을 그 폴더에 남긴다 · 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
const D = require(path.join(ROOT, 'assets/ritual-data.js'));
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOT = process.env.THANKS_SHOT || '';
if (SHOT) fs.mkdirSync(SHOT, { recursive: true });
const shot = async (pg, sel, nm) => { if (!SHOT) return; await pg.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -90); }, sel); await wait(250); await pg.screenshot({ path: path.join(SHOT, nm + '.png') }); };
const LIVE_EACH = '하객 쪽을 보고 신랑 먼저, 신부 다음으로 감사문 낭독 · 마지막 한 문장은 함께';
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => { const u = rt.request().url(); if (u.startsWith('http://127.0.0.1:' + port)) return rt.continue(); if (/script\.google\.com/.test(u)) return rt.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":true}' }); return rt.fulfill({ status: 200, body: '' }); });
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
    /* ① 고르기 — 감사 인사 담긴 새 코스 */
    await pg.evaluate(() => { courseStarted = true; S.course = 'open'; S.on = { vow: 1, welcome: 1, ring: 1, declare: 1 }; delete S.welcomeKind; delete S.vowKind; S.tx = { 'welcome.g': '인사 신랑 글', 'welcome.b': '인사 신부 글' };
      try { opSync(); } catch (e) {} for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'pick') { idx = i; render(); } });
    await wait(500);
    const a = await pg.evaluate(() => { const g = document.querySelector('[data-fk="wpair:greet"]'), t = document.querySelector('[data-fk="wpair:thanks"]'), rg = g && g.closest('[role=radiogroup]');
      return { g: !!g, t: !!t, gOn: g && g.getAttribute('aria-checked'), tOn: t && t.getAttribute('aria-checked'), rg: rg ? rg.getAttribute('aria-label') : '', n: RitualOpen.bodySeq(S).length }; });
    ok(`${w} ① 감사 인사 · 감사문 한 카드 — 칩 둘(감사 인사 눌림 · 감사문 안 눌림) · «둘 중 하나»`, a.g && a.t && a.gOn === 'true' && a.tOn === 'false' && /둘 중 하나/.test(a.rg), JSON.stringify(a));
    await shot(pg, '[data-fk="wpair:greet"]', `pick-greet-${w}`);
    await pg.click('[data-fk="wpair:thanks"]'); await wait(500);
    const b = await pg.evaluate(() => { const t = document.querySelector('[data-fk="wpair:thanks"]'), g = document.querySelector('[data-fk="wpair:greet"]'), tile = t && t.closest('.pk-tile');
      return { kind: S.welcomeKind, on: S.on.welcome, n: RitualOpen.bodySeq(S).length, tOn: t && t.getAttribute('aria-checked'), gOn: g && g.getAttribute('aria-checked'), line: tile ? (tile.querySelector('.pk-s') || {}).textContent : '',
        msg: ((document.getElementById('pkUndo') || {}).textContent || '') + ' ' + String(_pkMsg || ''), g1: String((S.tx || {})['welcome.g'] || ''), alt: String((S.tx || {})['welcomeAlt.g'] || ''), name: _lName('welcome') }; });
    ok(`${w} ① 감사문을 누르면 감사 인사가 빠진다(개수 ${a.n} 그대로) · 칩 감사문 눌림 · 칸 글 «감사문» · 알림 «감사 인사 대신 감사문을 담았어요» · 감사 인사 글은 보관 칸에`, b.kind === 'thanks' && b.on === 1 && b.n === a.n && b.tOn === 'true' && b.gOn === 'false'
      && /감사문/.test(b.line) && /감사 인사 대신 감사문을 담았어요/.test(b.msg) && b.g1 === '' && b.alt === '인사 신랑 글' && b.name === '감사문', JSON.stringify(b));
    await shot(pg, '[data-fk="wpair:thanks"]', `pick-thanks-${w}`);
    await pg.click('[data-fk="wpair:greet"]'); await wait(400);
    const c = await pg.evaluate(() => ({ kind: S.welcomeKind || '', g1: String((S.tx || {})['welcome.g'] || ''), msg: ((document.getElementById('pkUndo') || {}).textContent || '') + ' ' + String(_pkMsg || '') }));
    ok(`${w} ① 감사 인사를 다시 누르면 감사문이 빠지고 적은 글이 돌아온다`, c.kind === '' && c.g1 === '인사 신랑 글' && /감사문 대신 감사 인사를 담았어요/.test(c.msg), JSON.stringify(c));
    /* 둘 다 빠진 카드 — ＋ = 창 · 창에서 감사문 담기 */
    await pg.evaluate(() => { opTgl('welcome', 1); }); await wait(300);
    const d0 = await pg.evaluate(() => ({ on: RitualOpen.onOf(S, 'welcome'), g: document.querySelector('[data-fk="wpair:greet"]').getAttribute('aria-checked'), t: document.querySelector('[data-fk="wpair:thanks"]').getAttribute('aria-checked') }));
    await pg.click('[data-fk="opt:welcome"]'); await wait(500);
    const d1 = await pg.evaluate(() => { const el = document.getElementById('pvSheet'); return { open: !!(el && !el.hidden), btn: [...document.querySelectorAll('#pvAct [data-fk^="pvwp:"]')].map((x) => x.textContent), on: RitualOpen.onOf(S, 'welcome'), title: (document.getElementById('pvT') || {}).textContent }; });
    ok(`${w} ① 둘 다 빠진 카드 — 칩 둘 다 안 눌림 · ＋ = 창(담지 않는다) · 창 단추 «감사 인사 담기 · 감사문 담기»`, !d0.on && d0.g === 'false' && d0.t === 'false' && d1.open && !d1.on && d1.btn.join() === '감사 인사 담기,감사문 담기', JSON.stringify([d0, d1]));
    await pg.click('[data-fk="pvsw:thanks"]'); await wait(400);
    const d2 = await pg.evaluate(() => ({ title: (document.getElementById('pvT') || {}).textContent, q: (document.getElementById('pvQ') || {}).textContent, on: RitualOpen.onOf(S, 'welcome') }));
    ok(`${w} ① 창 «감사문 보기» — 제목 «감사문» · 설명 감사문 · 아직 담지 않음`, d2.title === '감사문' && /감사문/.test(d2.q) && !d2.on, JSON.stringify(d2));
    if (SHOT) await pg.screenshot({ path: path.join(SHOT, `pick-window-${w}.png`) });
    await pg.click('#pvAct [data-fk="pvwp:thanks"]'); await wait(500);
    const d3 = await pg.evaluate(() => ({ on: RitualOpen.onOf(S, 'welcome'), kind: S.welcomeKind, acts: (document.getElementById('pvAct') || {}).textContent, cue: ENG ? ENG.RitualCue.build(S, { mode: 'console' }).cues.filter((x) => x.k === 'welcome' && !/^bridge-/.test(x.slug)).map((x) => x.file + '|' + x.blockN + '|' + (x.live && x.live.t)) : ['ENG 없음'] }));
    ok(`${w} ① 창에서 감사문 담기 → 감사문 담김 · 엔진 감사 인사 자리 = 133 «감사문» · 신랑 먼저(장면 열쇠)`, d3.on && d3.kind === 'thanks' && /감사문 담겨 있어요/.test(d3.acts) && d3.cue.join() === '133_narr-thanks-in|감사문|' + LIVE_EACH, JSON.stringify(d3));
    await pg.evaluate(() => { try { opPvClose(); } catch (e) {} }); await wait(300);
    /* ② 하나씩 만들기 — 감사문 쪽 */
    await pg.evaluate(() => { for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } }); await wait(400);
    await pg.evaluate(() => mkGo('welcome')); await wait(700);
    const e = await pg.evaluate(() => { const g = document.getElementById('mkt_welcome_g'), b = document.getElementById('mkt_welcome_b');
      return { head: (document.getElementById('mkHead') || {}).textContent || '', one: (document.querySelector('.mk-pg .mk-one') || {}).textContent || '', g: !!g, b: !!b, order: !!(g && b && (g.compareDocumentPosition(b) & 4)),
        ph: g ? g.getAttribute('placeholder') : '', both: [...document.querySelectorAll('.mk-vwboth .mk-vwfix')].map((r) => r.textContent), refs: document.querySelectorAll('[data-fk^="mkrc:welcome:"]').length,
        exT: document.querySelectorAll('[data-fk^="mkex:narex:thanks:"]').length, exW: document.querySelectorAll('[data-fk^="mkex:narex:welcome:"]').length, why: (document.querySelector('.mk-txwhy') || {}).textContent || '',
        steps: _lSteps(ENG, ['welcome']).map((x) => x.txt) }; });
    ok(`${w} ② 감사문 쪽 — 이름 «감사문» · 머리 설명 · 신랑 칸 위 · 신부 칸 아래 · 맨 아래 «두 분 함께» = THANKSBOTH · 한 분 300자쯤`, /감사문/.test(e.head) && !/감사 인사/.test(e.head) && /감사문/.test(e.one) && e.g && e.b && e.order && /신랑의 감사문/.test(e.ph)
      && JSON.stringify(e.both) === JSON.stringify(D.THANKSBOTH) && /300자/.test(e.why), JSON.stringify(e));
    ok(`${w} ② 참고 예시 = 감사문 예시(${e.refs}벌) · 감사문 멘트 칩(감사 인사 멘트 칩 없음) · 흐름 «하객께 감사문» · «마지막 한 문장은 두 분이 함께»`, e.refs >= 1 && e.exT >= 2 && e.exW === 0
      && e.steps.some((t) => /하객께 감사문을 읽어요/.test(t)) && e.steps.some((t) => t === '마지막 한 문장은 두 분이 함께 읽어요'), JSON.stringify({ refs: e.refs, exT: e.exT, exW: e.exW, steps: e.steps }));
    await shot(pg, '#mkHead', `mk-thanks-${w}`);
    await shot(pg, '.mk-flow li.mk-sayli', `mk-thanks-form-${w}`);   // [SAY_INLINE_1123] 글칸은 흐름 차례 줄 아래
    await pg.click('[data-fk^="mkrc:welcome:0"]').catch(() => {}); await wait(500);
    const f = await pg.evaluate(() => ({ g: String((S.tx || {})['welcome.g'] || ''), b: String((S.tx || {})['welcome.b'] || ''), script: scriptTextOpen(), link: (function () { try { return RitualPreviewLink.pick(S).welcomeKind; } catch (e) { return 'ERR ' + e.message; } })(), text: S.welcomeText || '' }));
    ok(`${w} ② 예시 카드 → 두 분 글칸에 감사문 예시 · 대본 내보내기 «감사문» · 미리듣기 주소 welcomeKind=thanks · 옛 한 칸(welcomeText)도 감사문 글`, /부모님|와 ?주신|감사/.test(f.g + f.b) && /감사문/.test(f.script) && f.link === 'thanks' && f.text.length > 0,
      JSON.stringify({ g: f.g.slice(0, 30), link: f.link, s: (f.script.match(/.*감사문.*/g) || []).slice(0, 3) }));
    /* ③ 서약 카드는 서약 고정 */
    await pg.evaluate(() => { mkGo('vow'); }); await wait(600);
    const g = await pg.evaluate(() => ({ rg: [...document.querySelectorAll('[role=radiogroup]')].filter((r) => /무엇을 읽나요/.test(r.getAttribute('aria-label') || '')).length, chip: document.querySelectorAll('[data-fk^="lsc:vowKind"]').length,
      head: (document.getElementById('mkHead') || {}).textContent || '', both: [...document.querySelectorAll('.mk-vwboth .mk-vwfix')].map((r) => r.textContent), files: ENG.RitualCue.build(S, { mode: 'preview' }).cues.filter((x) => x.k === 'vow' && !/^bridge-/.test(x.slug)).map((x) => x.file) }));
    ok(`${w} ③ 서약 카드 — «무엇을 읽나요» 칩 없음 · 이름 «혼인 서약» · VOWBOTH · 엔진 서약 13 · 14(옛 vowKind 는 엔진 검사 open-course 가 잰다)`, g.rg === 0 && g.chip === 0 && /혼인 서약/.test(g.head) && JSON.stringify(g.both) === JSON.stringify(D.VOWBOTH) && g.files.join() === '13_narr-vow-in,14_narr-vow-out', JSON.stringify(g));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nTHANKS SWAP FAIL ${fail}` : '\nTHANKS SWAP OK'); process.exit(fail ? 1 : 0);
