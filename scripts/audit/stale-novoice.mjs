// ★[STALE_NOVOICE · EX_MINE 2026-10-06 사장님] (390 · 1280)
//   STALE_NOVOICE ①입장 인사 · 하객 맞이: AI 로 만든 줄의 글이 바뀌었는데 목소리가 없으면 머리에 «멘트를 바꿨어요/글을 고쳤어요» + «목소리 만들기»(→ 두 분 목소리 쪽)
//     ②▶ 는 옛 파일을 틀지 않는다 — ★2026-10-08 [AI_PLAY_READY] 남의 목소리(스튜디오 나레이션 · 연습 AI 읽기)도 틀지 않고 흐림 · 누르면 그 줄 아래 «… 목소리를 만들면 들을 수 있어요»
//   EX_MINE ③참고 예시 속 이서준 · 정하윤 · 서준 · 하윤 → 두 분 이름(토씨까지) ④이름이 한글이 아니면 그대로 ⑤표 전체에 가상 신랑 · 신부 이름이 남지 않는다
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
const SHOT = process.env.SNV_SHOT || '';
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: false }, bride: { ready: false } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await pg.evaluate(() => { S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'nar' }; S.entry = 'B'; S.up = S.up || {}; S.up.entry = { src: 'ai', by: 'groom', name: 'x.mp3', tx: 'old-sig' }; S.up.g0 = { src: 'ai', by: 'groom', name: 'y.mp3', tx: 'old-sig' }; });
    await wait(300); await pg.evaluate(() => mkGo('entry')); await wait(600);
    const a = await pg.evaluate(() => { const li = document.querySelector('[data-fk="mkvpl:entry"]')?.closest('li'); if (!li) return {}; return { side: (li.querySelector('.mk-vst-side') || {}).textContent, go: !!li.querySelector('[data-fk="mkvgo:entry"]'), stale: _staleNoVoice('entry') }; });
    ok(`${w} ① 입장 인사 — 목소리 없이 바뀐 줄: 까닭 + «목소리 만들기»`, a.stale && /바꿨어요|고쳤어요/.test(a.side || '') && a.go, JSON.stringify(a));
    const b = await pg.evaluate(() => { let got = null; const P = window._playLead; window._playLead = (au, u) => { got = u; }; const bt = document.querySelector('[data-fk="mkvpl:entry"]'); const off = !!(bt && bt.classList.contains('off') && bt.getAttribute('aria-disabled') === 'true'); mkUpPlay('entry'); window._playLead = P;
      const li = document.querySelector('[data-fk="mkvpl:entry"]').closest('li'); return { got, off, hint: [...li.querySelectorAll('.mk-ploff')].map((e) => e.textContent).join(''), go: !!li.querySelector('[data-fk="mkploffgo:entry"]') }; });
    ok(`${w} ② ▶ = 옛 AI 파일도 남의 목소리도 틀지 않는다 · 흐림 · 누르면 «… 목소리를 만들면 들을 수 있어요 · 만들러 가기» [AI_PLAY_READY]`, !b.got && b.off && /목소리를 만들면 들을 수 있어요 · 만들러 가기$/.test(b.hint) && b.go, JSON.stringify(b));
    if (SHOT) { await pg.evaluate(() => document.querySelector('[data-fk="mkvgo:entry"]').scrollIntoView({ block: 'center' })); await pg.screenshot({ path: `${SHOT}-entry-${w}.png` }); }
    await pg.click('[data-fk="mkvgo:entry"]'); await wait(500);
    ok(`${w} ① «목소리 만들기» → 두 분 목소리 쪽`, await pg.evaluate(() => !!document.querySelector('.mk-vpage')));
    await pg.evaluate(() => mkGo('guest')); await wait(500);
    ok(`${w} ① 하객 맞이도 같은 길(목소리 만들기)`, await pg.evaluate(() => !!document.querySelector('[data-fk="mkvgo:g0"]')));
    /* EX_MINE */
    const c = await pg.evaluate(() => { CUST = { groom: '김민수', bride: '최지아' }; const all = (RITUAL_REF.rows || []).map((r) => _exMine(r.text)).join('\n');
      const one = _exMine('나 이서준은 정하윤을 아내로 · 서준아 · 하윤이가 · 하윤으로'); const left = (all.match(/이서준|정하윤|서준|하윤/g) || []).length;
      CUST = { groom: '테스트 A', bride: '' }; const keep = _exMine('신랑 이서준입니다 · 하윤아'); CUST = null; return { one, left, keep }; });
    ok(`${w} ③ 예시 이름 → 두 분 이름 · 토씨까지`, c.one === '나 김민수는 최지아를 아내로 · 민수야 · 지아가 · 지아로', c.one);
    ok(`${w} ⑤ 표 전체에 가상 신랑 · 신부 이름이 남지 않는다`, c.left === 0, String(c.left));
    ok(`${w} ④ 이름이 한글이 아니면 그대로`, c.keep === '신랑 이서준입니다 · 하윤아', c.keep);
    /* [EX_MINE_OLD] 전에 채워 둔 예시(고치지 않은 원문)는 두 분 이름 판으로 · 고친 글은 그대로 */
    const d = await pg.evaluate(() => { S.on = S.on || {}; S.on.welcome = 1; S.welcome = 'self'; const raw = RITUAL_REF.rows.filter((x) => x.key === 'welcome' && x.n === 3);
      S.tx = { 'welcome.g': raw.find((x) => x.who === '신랑').text, 'welcome.b': raw.find((x) => x.who === '신부').text + ' 고친 끝' }; CUST = { groom: '김민수', bride: '최지아' }; mkGo('welcome');
      const r = { g: S.tx['welcome.g'], b: S.tx['welcome.b'] }; CUST = null; return r; });
    ok(`${w} ⑥ 전에 채워 둔 예시(고치지 않은 원문)는 두 분 이름으로 · 고친 글은 그대로 [EX_MINE_OLD]`, /신랑 김민수입니다/.test(d.g) && /정하윤/.test(d.b), JSON.stringify(d).slice(0, 200));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSTALE NOVOICE FAIL ${fail}` : '\nSTALE NOVOICE OK'); process.exit(fail ? 1 : 0);
