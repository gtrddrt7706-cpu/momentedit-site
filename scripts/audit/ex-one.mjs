// ★[EX_ONE 2026-10-05 사장님 «예시라고 한번 짚어 주는 게 어때 · 예시 부분 형태가 일관되지 않다 · 이벤트마다 통일»] 실브라우저(390 · 1280)
//   ①입장(AI 판) = «참고 예시» 카드 4(예시 N · 느낌 · [REF_ROW4] 늘 넷) · 위쪽 «입장 멘트» 칩 줄 없음 · 스튜디오 나레이션 판은 칩 줄 그대로
//   ②식전 영상 소개 = «참고 예시» 카드 4 · 옛 이름표 없는 칩(.ex-chip) 없음 ③예시 그대로인 줄 카드에 «예시 글 · 고쳐 써도 돼요» · 고치면 사라짐
//   ④입장 줄을 고쳐 둔 뒤 다른 예시를 누르면 묻고(«예시로 바꿀까요?») · 바꾸면 그 예시 글로
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
/* CI 는 느리다 — 정해진 시간 대신 «될 때까지»(최대 6초) 기다린다 */
const until = async (pg, fn, ms = 6000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await pg.evaluate(fn)) return true; await wait(150); } return false; };
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on = S.on || {}; ['entry', 'prevideo'].forEach((k) => { S.on[k] = 1; }); S.guestVoice = 'couple'; S.entryVoice = 'couple'; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', entry: 'ai', prevideo: 'ai' }; S.entry = 'A'; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { groom: { ready: true }, bride: { ready: true } }; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); } });
    await until(pg, () => typeof ENG !== 'undefined' && !!ENG); await pg.evaluate(() => mkGo('entry')); await until(pg, () => !!document.querySelector('[data-fk^="mkex:entry:"]'));
    const a = await pg.evaluate(() => ({ cards: document.querySelectorAll('[data-fk^="mkex:entry:"]').length, b1: (document.querySelector('[data-fk="mkex:entry:0"] .cg-t') || {}).textContent, chips: document.querySelectorAll('[data-fk^="lsc:entry:"]').length, tag: !!document.querySelector('.mk-extag'), h: [...document.querySelectorAll('.mk-pick [role=radiogroup][aria-label="참고 예시"] .gl')].map((x) => x.textContent), cls: !!document.querySelector('.mk-rc,.mk-exs') }));   /* [EX_ROW 2026-10-06] 카드 → 위쪽 칩 줄 · 버튼 글 = 느낌 이름 */
    ok(`${w} ① 입장(AI) = 위쪽 «참고 예시» 칩 줄 6(스튜디오 입장 멘트와 같은 여섯 · [EX_SAME_COUNT] · [EX_ROW]) · 첫 칩 «담백하게»([EX_NAME_HAGE] 종전 «이야기처럼») · 옛 카드 없음 · 입장 멘트 칩 줄 없음 · [EXTAG_OFF] «예시 글» 표 없음`, a.cards === 6 && a.b1 === '담백하게' && a.chips === 0 && !a.tag && a.h[0] === '참고 예시' && !a.cls, JSON.stringify(a));
    // ④ 고친 뒤 다른 예시 → 묻는다
    await pg.evaluate(() => { _slPut('entry', [{ w: 'g', t: '저희가 직접 쓴 입장 인사입니다.' }]); render(); }); await wait(300);
    ok(`${w} ③ 고친 줄엔 «예시 글» 표가 없다`, await pg.evaluate(() => !document.querySelector('.mk-extag')));
    await pg.click('[data-fk="mkex:entry:1"]');
    const asked = await until(pg, () => /예시로 바꿀까요/.test(document.body.textContent) && [...document.querySelectorAll('button')].some((x) => x.textContent.trim() === '예시로 바꾸기'));
    ok(`${w} ④ 고친 뒤 다른 예시 → «예시로 바꿀까요?»`, asked);
    await pg.evaluate(() => { const b = [...document.querySelectorAll('button')].find((x) => x.textContent.trim() === '예시로 바꾸기'); if (b) b.click(); }); await until(pg, () => S.entry === 'B');
    const c = await pg.evaluate(() => ({ entry: S.entry, txt: _recNeed('entry'), self: ENTRY.B.self, tag: !!document.querySelector('.mk-extag') }));
    ok(`${w} ④ 바꾸면 예시 2 글로 · 표는 없음 [EXTAG_OFF]`, c.entry === 'B' && c.txt.replace(/\s/g, '') === c.self.replace(/\s/g, '') && !c.tag, JSON.stringify(c));
    // 스튜디오 판은 칩 줄
    await pg.evaluate(() => { S.vfill.entry = 'nar'; S.entryVoice = 'nar'; render(); }); await wait(300);
    ok(`${w} ① 스튜디오 나레이션 판은 «입장 멘트» 칩 줄 그대로 · 예시 카드 없음`, await pg.evaluate(() => document.querySelectorAll('[data-fk^="lsc:entry:"]').length === 6 && !document.querySelector('[data-fk^="mkex:entry:"]')));
    // ② 식전 영상 소개
    await pg.evaluate(() => { S.pvText = ''; mkGo('prevideo'); }); await until(pg, () => !!document.querySelector('[data-fk^="mkex:pv:"]'));
    const d = await pg.evaluate(() => ({ cards: document.querySelectorAll('[data-fk^="mkex:pv:"]').length, old: document.querySelectorAll('.mk-pvex,.ex-chip').length }));
    ok(`${w} ② 식전 영상 소개 = «참고 예시» 카드 4 · 옛 칩 없음`, d.cards === 4 && d.old === 0, JSON.stringify(d));
    await pg.click('[data-fk="mkex:pv:1"]'); await until(pg, () => S.pvText === PV_EX[1][1]);
    ok(`${w} ② 예시를 누르면 글이 채워지고 «예시 글» 표는 없음 [EXTAG_OFF]`, await pg.evaluate(() => S.pvText === PV_EX[1][1] && !document.querySelector('.mk-extag')));
    ok(`${w} pageerror 0`, errs.length === 0, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nEX ONE FAIL ${fail}` : '\nEX ONE OK'); process.exit(fail ? 1 : 0);
