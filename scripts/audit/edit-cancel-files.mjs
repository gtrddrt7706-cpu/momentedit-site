// [EDIT_CANCEL_FILES 2026-10-03 · R6-01] ④ «변경»으로 들어간 수정에서 줄 파일을 지우고 «취소»하면 —
//   글 · 칩은 스냅샷으로 돌아가지만 파일 상태(S.up)는 지운 그대로 남아야 한다(서버에서 이미 지워졌다).
//   종전엔 S 를 통째로 되돌려 S.up 이 휴지통에 간 옛 파일 id 를 다시 가리켰고, ②·④ 는 완료인데 소리는 없었다.
//
//   [R8-01] 저장 회신 전 «취소»는 막힌다 · [R8-07] 파일이 그대로인 줄의 읽는 사람은 취소로 돌아간다 · [R8-08] 수정 중 저장 뒤 취소는 알린다
//   [R7-01] 읽는 사람(guestWho · guestOne · pvWho)도 파일과 한 몸 — 취소 뒤 칸의 사람과 소리의 사람이 같아야 한다
//   node scripts/audit/edit-cancel-files.mjs      # 390 · 1280
// ★종료 코드 [CANT_LOOK] 0 = 통과 · 1 = 실패 · 2 = 재지 못함(도구 없음)
// ★깨 보기: 같은 길을 종전 취소(S=JSON.parse(_editSnap))로 돌리면 S.up.g0 이 되살아나야 한다 — 이 검사가 살아 있는지 함께 본다.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0;
const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch();
for (const w of [390, 1280]) {
  const ctx = await br.newContext({ viewport: { width: w, height: 900 }, hasTouch: w < 1000 });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(600);
  const next = async () => { if (await pg.isVisible('#next')) await pg.click('#next'); else await pg.click('.pk-go'); await pg.waitForTimeout(450); };
  await next(); await next();
  await pg.click('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  // AI 판 · 하객 맞이 첫 줄(g0)을 AI 로 만들어 둔 상태 → ④
  await pg.evaluate(() => { RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; S.vsChip = 1; S.vsAsked = 1; S.guestVoice = 'couple'; S.vfill = { guest: 'ai' }; S.up = { g0: { n: 'AI', id: 'F_OLD', at: '2026-10-03 10:00', src: 'ai', by: 'groom' } }; S.fAt = S.fAt || {}; S.fAt['up.g0'] = 1000; S.welcome = 'self'; opSync(); goDone(); });
  await pg.waitForTimeout(500);
  await pg.evaluate(() => { window.__ecOrig = _editCancel; });   // 깨 보기가 바꿔 끼운 취소를 다음 경우 앞에서 되돌린다
  const run = async (legacy) => {
    await pg.evaluate(() => { window._editCancel = window.__ecOrig; });
    await pg.evaluate(() => { S.up = { g0: { n: 'AI', id: 'F_OLD', at: '2026-10-03 10:00', src: 'ai', by: 'groom' } }; S.fAt['up.g0'] = 1000; goDone(); });
    await pg.waitForTimeout(300);
    await pg.click('[data-fk="sum:guest"]'); await pg.waitForTimeout(500);
    // 수정 중에 글 칸도 하나 바꾼다(이것은 취소로 되돌아가야 한다)
    await pg.evaluate(() => { S.welcomeText = '취소되어야 할 글'; mkUpDel('g0'); });
    await pg.waitForTimeout(200);
    await pg.click('.ord-ask .oa-yes'); await pg.waitForTimeout(300);
    const mid = await pg.evaluate(() => ({ up: (S.up || {}).g0, er: editReturn }));
    if (legacy) await pg.evaluate(() => { window._editCancel = function () { S = JSON.parse(_editSnap); }; });   // 깨 보기 — 종전 취소
    await pg.click('#prev'); await pg.waitForTimeout(500);
    return Object.assign(mid, await pg.evaluate(() => ({ k: STEPS[idx].k, up: (S.up || {}).g0, at: (S.fAt || {})['up.g0'], txt: S.welcomeText, saved: localStorage.getItem('me_order') || '' })));
  };
  const r = await run(false);
  ok(`${w} ④ «변경» → 줄 지우기 → «취소» — ④ 로 돌아온다`, r.k === 'done' && r.er === true, JSON.stringify(r).slice(0, 200));
  ok(`${w} 취소 뒤에도 지운 파일은 지운 그대로(S.up.g0 === 0 · 시각도 지금 것) [EDIT_CANCEL_FILES]`, r.up === 0 && r.at > 1000, JSON.stringify({ up: r.up, at: r.at }));
  ok(`${w} 고르는 값(글)은 스냅샷으로 되돌아간다`, r.txt !== '취소되어야 할 글', String(r.txt));
  ok(`${w} 기기 저장본도 지운 상태(옛 파일 id 없음)`, !/F_OLD/.test(r.saved), r.saved.slice(0, 120));
  const b = await run(true);
  ok(`${w} 깨 보기 — 종전 취소는 옛 파일을 되살린다(검사가 살아 있음)`, b.up && b.up.id === 'F_OLD', JSON.stringify(b.up));
  /* [R7-01] 읽는 사람 바꾸기 — 바꾸는 순간 앞 사람 소리는 지워지고 새 사람으로 다시 만든다. «취소» 뒤에도 읽는 사람과 소리의 사람이 같아야 한다(하객 맞이 g1 · 식전 영상 pv) */
  const who = async (legacy) => {
    await pg.evaluate(() => { window._editCancel = window.__ecOrig; });
    await pg.evaluate(() => { S.on.prevideo = 1; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', prevideo: 'ai' }; S.pvText = '저희가 함께 걸어온 시간을 짧게 담았어요.';
      S.guestWho = { 0: 'g', 1: 'b', 2: 'g', 3: 'b' }; delete S.guestOne; S.pvWho = 'b';
      S.up = { g1: { n: 'AI', id: 'F_B1', src: 'ai', by: 'bride', tx: _txSig(_recNeed('g1')) }, pv: { n: 'AI', id: 'F_BPV', src: 'ai', by: 'bride', tx: _txSig(_recNeed('pv')) } }; opSync(); goDone(); });
    await pg.waitForTimeout(300);
    await pg.click('[data-fk="sum:guest"]'); await pg.waitForTimeout(500);
    // 바꾸고(앞 소리는 _mkUpDrop) · 새 사람 목소리로 다시 만들어진 셈(_vcMake 가 적는 것과 같은 꼴)
    await pg.evaluate(() => { mkGuestWho(1, 'g'); S.up.g1 = { n: 'AI', id: 'F_G1', src: 'ai', by: 'groom', tx: _txSig(_recNeed('g1')) };
      mkPvWho('g'); S.up.pv = { n: 'AI', id: 'F_GPV', src: 'ai', by: 'groom', tx: _txSig(_recNeed('pv')) }; });
    if (legacy) await pg.evaluate(() => { window._editCancel = function () { var cur = S; S = JSON.parse(_editSnap); ['up', 'upPrev', 'vself', 'vtempo'].forEach(function (q) { if (cur[q] === undefined) delete S[q]; else S[q] = cur[q]; }); }; });   // 깨 보기 — R6-01 판 취소
    await pg.click('#prev'); await pg.waitForTimeout(500);
    await pg.click('[data-fk="sum:guest"]'); await pg.waitForTimeout(500);   // ④ «변경»으로 다시 들어가 본다
    const r = await pg.evaluate(() => ({ k: STEPS[idx].k, g1: _vcLineWho('g1'), g1by: S.up.g1 && S.up.g1.by, pv: _vcLineWho('pv'), pvby: S.up.pv && S.up.pv.by, st: [_whoStale('g1'), _whoStale('pv')], done: _mkItems('guest').filter((q) => q.up === 'g1').map(_mkItemDone)[0] }));
    await pg.click('#prev'); await pg.waitForTimeout(400);
    return r;
  };
  const wr = await who(false);
  ok(`${w} [R7-01] 읽는 사람을 바꾸고 «취소» — 하객 맞이 g1 · 식전 영상 pv 의 읽는 사람 = 소리의 사람`, wr.k === 'listen' && wr.g1 === wr.g1by && wr.pv === wr.pvby && wr.g1 === 'groom' && wr.pv === 'groom' && !wr.st[0] && !wr.st[1] && wr.done === true, JSON.stringify(wr));
  const wb = await who(true);
  ok(`${w} [R7-01] 깨 보기 — R6-01 판 취소는 사람이 어긋나고(신부 칸 · 신랑 소리) _whoStale 이 그것을 잡아 미완료로 센다`, wb.g1 === 'bride' && wb.g1by === 'groom' && wb.st[0] === true && wb.st[1] === true && wb.done === false, JSON.stringify(wb));
  /* [R8-07] 파일이 없는 줄에서 읽는 사람만 바꾸고 «취소» — 바꾼 것이 원래대로 돌아와야 한다(하객 맞이 g2 · 식전 영상 pv) */
  await pg.evaluate(() => { window._editCancel = window.__ecOrig; S.on.prevideo = 1; S.pvVoice = 'couple'; S.vfill = { guest: 'ai', prevideo: 'ai' }; S.pvText = '저희가 함께 걸어온 시간을 짧게 담았어요.';
    S.guestWho = { 0: 'g', 1: 'b', 2: 'g', 3: 'b' }; delete S.guestOne; S.pvWho = 'b'; S.up = {}; opSync(); goDone(); });
  await pg.waitForTimeout(300);
  await pg.click('[data-fk="sum:guest"]'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { mkGuestWho(2, 'b'); mkPvWho('g'); });
  const mid7 = await pg.evaluate(() => ({ g2: RitualOpen.guestReader(S, 2), pv: S.pvWho }));
  await pg.click('#prev'); await pg.waitForTimeout(500);
  const r7 = await pg.evaluate(() => ({ k: STEPS[idx].k, g2: RitualOpen.guestReader(S, 2), g1: RitualOpen.guestReader(S, 1), pv: S.pvWho || 'g' }));
  ok(`${w} [R8-07 WHO_IF_FILE] 파일 없는 줄의 읽는 사람 바꾸기는 «취소»로 원래대로(g2 신랑 · pv 신부)`, mid7.g2 === 'b' && mid7.pv === 'g' && r7.k === 'done' && r7.g2 === 'g' && r7.g1 === 'b' && r7.pv === 'b', JSON.stringify({ mid7, r7 }));
  /* [R8-01] 저장 회신을 기다리는 동안(_autoWait)에는 «취소»가 막힌다 — 늦은 회신이 버려져 서버 합치기가 취소한 글을 되살리던 틈 */
  await pg.evaluate(() => { S.welcomeText = ''; goDone(); });
  await pg.waitForTimeout(300);
  await pg.click('[data-fk="sum:guest"]'); await pg.waitForTimeout(500);
  await pg.evaluate(() => { S.welcomeText = '저장 중에 고친 글'; _autoWait = true; });
  await pg.click('#prev'); await pg.waitForTimeout(400);
  const r1 = await pg.evaluate(() => ({ er: editReturn, txt: S.welcomeText, k: STEPS[idx].k, dlg: (document.querySelector('.ord-ask .oa-t') || {}).textContent || '' }));
  await pg.evaluate(() => { const b = document.querySelector('.ord-ask .oa-yes'); if (b) b.click(); });
  await pg.waitForTimeout(300);
  ok(`${w} [R8-01 CANCEL_WAIT_SAVE] 저장 중 «취소»는 막히고 «저장하는 중이에요»를 알린다(수정 판 그대로)`, r1.er === true && r1.txt === '저장 중에 고친 글' && r1.k === 'listen' && r1.dlg === '저장하는 중이에요', JSON.stringify(r1));
  // 깨 보기 — 막지 않던 종전 취소(같은 순간에 _editCancel)는 글을 옛 판으로 돌려 늦은 회신이 기준을 못 옮긴다
  const b1 = await pg.evaluate(() => { const keep = JSON.stringify(S), snap = _editSnap; _editCancel(); const out = { txt: S.welcomeText }; S = JSON.parse(keep); _editSnap = snap; return out; });
  ok(`${w} [R8-01] 깨 보기 — 막지 않으면 저장 중 고친 글이 옛 판으로 돌아간다(검사가 살아 있음)`, b1.txt !== '저장 중에 고친 글', JSON.stringify(b1));
  /* [R8-08 EDIT_SAVED_MID] 수정 중 저장이 됐으면 «취소» 뒤 «저장해 둔 고침은 남아 있어요»를 알린다 */
  await pg.evaluate(() => { _autoWait = false; _editSavedMid = true; });
  await pg.click('#prev'); await pg.waitForTimeout(500);
  const r8 = await pg.evaluate(() => ({ k: STEPS[idx].k, er: editReturn, dlg: (document.querySelector('.ord-ask .oa-t') || {}).textContent || '', body: (document.querySelector('.ord-ask .oa-d') || {}).textContent || '' }));
  await pg.evaluate(() => { const b = document.querySelector('.ord-ask .oa-yes'); if (b) b.click(); });
  ok(`${w} [R8-08] 수정 중 저장된 뒤 «취소» → ④ 로 돌아오고 «저장해 둔 고침은 남아 있어요»(줄표 · 이모지 없음)`, r8.k === 'done' && r8.er === false && r8.dlg === '저장해 둔 고침은 남아 있어요' && !/\u2014/.test(r8.body), JSON.stringify(r8));
  ok(`${w} pageerror 0`, errs.length === 0, errs.join(' | '));
  await ctx.close();
}
await br.close(); srv.close();
process.exit(fail ? 1 : 0);
