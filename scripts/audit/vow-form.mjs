// ★[VOW_FIRST · VOW_FORM · VOW_BOTH_ROWS · VOW_UNPICK · CUE_LAST 2026-10-06 사장님 «한 줄씩 번갈아 · 각자 차례로 구분할 수 있는 텍스트 박스 · 먼저 할 사람 순서 · 마지막 사람만 큐사인» → «추천대로»] (390 · 1280)
//   ①칩 둘(읽는 방식 · 먼저 읽는 분) 처음엔 안 눌림 + «고르지 않으면 한 줄씩 번갈아 · 신랑부터 진행돼요» 한 줄
//   ②번갈아 = 줄 칸 · 이름표가 먼저 분부터 번갈아 · 예시 카드 → 문장이 번갈아 들어감 · ＋ 줄 더하기 · 맨 아래 «두 분 함께» 두 줄
//   ③신부부터 → 첫 줄 신부 · 흐름 줄 «두 분 번갈아 · 신부부터» · 엔진 여는 말 127(신랑부터 없는 판)
//   ④각자 차례로 = 두 칸 · 먼저 분 칸이 위 ⑤서약 현장 체크 = 끝 신호 칸 없음 · 다 됨 ⑥첫인사 = 끝 신호는 신부만
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const SHOT = process.env.VOW_SHOT || '';
const shot = async (pg, sel, nm) => { if (!SHOT) return; await pg.evaluate((s) => { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'start' }); window.scrollBy(0, -80); }, sel); await pg.screenshot({ path: `${SHOT}-${nm}.png` }); };
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.vow = 'ok'; S.on = S.on || {}; S.on.vow = 1; S.on.welcome = 1; S.welcome = 'self'; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await wait(400); await pg.evaluate(() => mkGo('vow')); await wait(600);
    const a = await pg.evaluate(() => { const rg = [...document.querySelectorAll('[role=radiogroup]')].filter((r) => /읽는 방식|먼저 읽는 분/.test(r.getAttribute('aria-label')));
      return { n: rg.length, pressed: rg.map((r) => r.querySelectorAll('[aria-checked=true]').length), note: (document.querySelector('.mk-vpask1') || {}).textContent }; });
    ok(`${w} ① 칩 둘 · 처음엔 안 눌림 · 안 고른 한 줄`, a.n === 2 && a.pressed.join() === '0,0' && /한 줄씩 번갈아 · 신랑부터 진행돼요/.test(a.note || ''), JSON.stringify(a));
    await shot(pg, '.mk-say', `alt-empty-${w}`);
    await pg.click('[data-fk^="mkrc:vow:0"]').catch(() => {}); await wait(400);
    const b = await pg.evaluate(() => { const rows = [...document.querySelectorAll('.mk-vwl .mk-vwr')].map((r) => r.querySelector('.mk-vwn').textContent); const both = [...document.querySelectorAll('.mk-vwboth .mk-vwfix')].map((r) => r.textContent); const bl = (document.querySelector('.mk-vwboth .mk-vwn') || {}).textContent;
      return { rows, both, bl, add: !!document.querySelector('[data-fk="mkvwadd"]'), cue: document.querySelectorAll('.mk-say .mk-cue').length, hint: !!document.querySelector('.mk-say>.prep-hint'), alt: !!document.querySelector('.mk-txalt') }; });
    ok(`${w} ② 번갈아 · 예시 → 신랑 · 신부 번갈아 · ＋ 줄 더하기 · 맨 아래 두 분 함께 둘 · 위 안내 줄 · 아래 안내 줄 없음`, b.rows.length >= 4 && b.rows[0] === '신랑' && b.rows[1] === '신부' && b.rows[2] === '신랑' && b.both.length === 2 && b.bl === '두 분 함께' && /꼭 지키겠습니다/.test(b.both[0]) && b.add && !b.hint && !b.alt, JSON.stringify(b));
    await shot(pg, '.mk-say', `alt-${w}`);
    await pg.click('[data-fk="lsc:vowFirst:b"]'); await wait(600);
    const c = await pg.evaluate(() => { const rows = [...document.querySelectorAll('.mk-vwl .mk-vwr')].map((r) => r.querySelector('.mk-vwn').textContent); const flow = [...document.querySelectorAll('.mk-flowsec li.t b')].map((x) => x.textContent);
      const cue = ENG ? ENG.RitualCue.build(S, { mode: 'preview' }).cues.filter((x) => x.k === 'vow')[0] : null; return { rows, flow, file: cue && cue.file, text: cue && cue.text, tv: cue && cue.live && cue.live.tv }; });
    ok(`${w} ③ 신부부터 → 첫 줄 신부 · 흐름 «신부부터» · 여는 말 127 · 신랑부터 없음`, c.rows[0] === '신부' && c.rows[1] === '신랑' && c.flow.some((x) => /신부부터/.test(x)) && c.file === '127_narr-vow-in-b' && !/신랑부터/.test(c.text || ''), JSON.stringify(c));
    await pg.evaluate(() => { const t = document.querySelector('[data-fk="mkvw:b:0"]'); t.value = '고친 첫 줄입니다.'; t.dispatchEvent(new Event('input', { bubbles: true })); });
    ok(`${w} ② 줄을 고치면 그 분 글에 줄로 담긴다`, await pg.evaluate(() => String(S.tx['vow.b']).split('\n')[0] === '고친 첫 줄입니다.' && S.txLn['vow.b'] === 1));
    await pg.click('[data-fk="lsc:vowHow:each"]'); await wait(500);
    const d = await pg.evaluate(() => [...document.querySelectorAll('.mk-vwc .mk-txr .mk-who')].map((x) => x.textContent));
    ok(`${w} ④ 각자 차례로 = 두 칸 · 먼저 분(신부) 칸이 위`, d.length === 2 && /^신부/.test(d[0]) && /^신랑/.test(d[1]), JSON.stringify(d));
    await shot(pg, '.mk-say', `each-${w}`);
    await pg.click('[data-fk="mkchk:vow.b"]'); await wait(400);
    const e = await pg.evaluate(() => ({ cue: document.querySelectorAll('.mk-say .mk-cue').length, done: _txSiteDone('vow', _mkChk(), 'vow.b') }));
    ok(`${w} ⑤ 서약 현장 체크 = 끝 신호 칸 없음 · 다 됨`, e.cue === 0 && e.done, JSON.stringify(e));
    await pg.evaluate(() => { S.vowHow = 'alt'; S.mkc = {}; render(); }); await wait(300);
    await pg.click('[data-fk="mkvwsite"]'); await wait(300);
    ok(`${w} ⑤ 번갈아 현장 체크 하나 = 두 분 모두`, await pg.evaluate(() => S.mkc['vow.g'] === 1 && S.mkc['vow.b'] === 1 && !document.querySelector('.mk-vwl') && !!document.querySelector('.mk-vwboth')));
    await pg.evaluate(() => mkGo('welcome')); await wait(500);
    await pg.click('[data-fk="mkchk:welcome.g"]').catch(() => {}); await wait(300); await pg.click('[data-fk="mkchk:welcome.b"]').catch(() => {}); await wait(300);
    const f = await pg.evaluate(() => ({ cueIds: [...document.querySelectorAll('.mk-say .mk-cue-in')].map((x) => x.id), gDone: _txSiteDone('welcome', _mkChk(), 'welcome.g'), bDone: _txSiteDone('welcome', _mkChk(), 'welcome.b') }));
    ok(`${w} ⑥ 첫인사 = 끝 신호는 신부만 · 신랑은 체크만으로 다 됨`, f.cueIds.length === 1 && /welcome_b/.test(f.cueIds[0]) && f.gDone && !f.bDone, JSON.stringify(f));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVOW FORM FAIL ${fail}` : '\nVOW FORM OK'); process.exit(fail ? 1 : 0);
