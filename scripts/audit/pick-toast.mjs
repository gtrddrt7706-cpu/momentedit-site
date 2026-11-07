// ★★[PICK_TOAST_1107 덧 9 · 사장님 «체크를 풀고 더하고 할 때 창 아래 작게 안내 문구가 같이 나오면 좋겠어»]
//   ✓ 풀기 · ＋ 담기 · ● 늘 포함을 누를 때마다 아래 알림 한 줄(#lsToast · _noteToast 와 같은 알약) — 실제 브라우저에서 누르고 잰다(390 · 1280)
//   담기 «‹반지 교환›을 담았어요 · 본식 +n분» · 빼기 «‹감사 인사›를 뺐어요 · 본식 −n분»(되돌리기 단추 없음 · UNDO_OFF) · 늘 포함 «‹입장›은 늘 포함돼요»
//   한도 «본식 순간 6개가 다 찼어요» · «긴 순간 3개가 다 찼어요» · «테이블 인사는 긴 순간 2개로 세요» · 택1(엔진이 함께 빼는 것) «‹축가›를 담아서 ‹축사›는 빠졌어요»
//   알림은 하나만 · 3초 뒤 사라짐 · 아래 막대(#nav)와 안 겹침 · 모든 순간 이름으로 만든 글이 20자 안 · «·» 한 번(TOAST_MIN)
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/node-tools/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const vis = (t) => String(t).replace(/[«»‹›「」]/g, '').trim();
const fits = (t) => vis(t).length <= 20 && (vis(t).match(/·/g) || []).length <= 1;
const wait = (ms) => new Promise((x) => setTimeout(x, ms));
let br;
try {
  br = await pw.chromium.launch();
  for (const W of [390, 1280]) {
    const ctx = await br.newContext({ viewport: { width: W, height: W < 1000 ? 844 : 900 }, hasTouch: W < 1000 }); const pg = await ctx.newPage(); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`, { waitUntil: 'load' }); await wait(900);
    const toast = () => pg.evaluate(() => { const u = document.getElementById('lsToast'), nav = document.getElementById('nav'); const vis = [...document.querySelectorAll('.pk-undo')].filter((e) => !e.hidden && e.getClientRects().length); const r = u && !u.hidden ? u.getBoundingClientRect() : null, n = nav && getComputedStyle(nav).display !== 'none' ? nav.getBoundingClientRect() : null;
      return { t: u && !u.hidden ? u.textContent : '', btn: u ? u.querySelectorAll('button').length : 0, n: vis.length, over: !!(r && n && n.height && r.bottom > n.top + 0.5), inView: !!(r && r.top >= 0 && r.bottom <= innerHeight), live: (document.getElementById('lsLive') || {}).textContent || '' }; });
    const tap = async (sel) => { await pg.evaluate(() => { try { _lsToastOff(); } catch (e) {} }); await pg.click(sel); await wait(80); return toast(); };
    const setOn = (on) => pg.evaluate((on) => { RitualOpen.applyExample(S, 'standard'); S.course = 'open'; S.on = on; opSync(); try { opGoStep('pick'); } catch (e) {} render(); document.body.style.opacity = 1; document.querySelectorAll('section,.reveal').forEach((x) => { x.style.opacity = 1; }); }, on);
    const mid = () => pg.evaluate(() => RitualOpen.span(S).midMin);
    /* ── ① 고르기 · 실제 칸 단추 */
    await setOn({ prevideo: 1, candle: 1, welcome: 1, vow: 1 }); await wait(300);
    let m0 = await mid(); let a = await tap('[data-fk="opt:ring"]'); let d = Math.round((await mid()) - m0);
    ok(W + ' ① ＋ 담기 → «‹반지 교환›을 담았어요 · 본식 +' + d + '분»', a.t === '‹반지 교환›을 담았어요' + (d ? ' · 본식 +' + d + '분' : '') && d > 0, JSON.stringify(a));
    ok(W + ' ① 알림 하나 · 아래 막대와 안 겹침 · 화면 안 · 단추 없음', a.n === 1 && !a.over && a.inView && a.btn === 0, JSON.stringify(a));
    ok(W + ' ① 화면 읽기는 긴 글(_pkMsg · 본식 약 …) 한 번 — 알림 글을 따로 읽지 않는다', /담았어요 · 본식 약/.test(a.live), a.live);
    m0 = await mid(); a = await tap('[data-fk="opt:welcome"]'); d = Math.round((await mid()) - m0);
    ok(W + ' ① ✓ 풀기 → «‹감사 인사›를 뺐어요' + (d ? ' · 본식 −' + -d + '분' : '') + '» · 되돌리기 단추 없음(UNDO_OFF)', a.t === '‹감사 인사›를 뺐어요' + (d ? ' · 본식 −' + -d + '분' : '') && a.btn === 0 && !/되돌리기/.test(a.t), JSON.stringify(a));
    await wait(3200); a = await toast(); ok(W + ' 3초 뒤 사라짐', !a.t && a.n === 0, JSON.stringify(a));
    /* 늘 포함 ● (① 칸) */
    a = await tap('.pk-tile.fix .pk-fixmk'); const pv = await pg.evaluate(() => !!(PV && PV.k));
    ok(W + ' ① ● 누름 → «‹…›은/는 늘 포함돼요» · 미리 보기 창은 안 열림', /^‹[^›]+›[은는] 늘 포함돼요$/.test(a.t) && !pv, JSON.stringify(a) + ' pv=' + pv);
    /* 하나만 — 예시 알림 뒤에 담기 · 담기 뒤에 예시 */
    await pg.click('[data-fk="opx:brief"]').catch(() => pg.evaluate(() => opEx('brief'))); await wait(80);
    a = await toast(); ok(W + ' 예시 알림이 뜨면 담기 알림은 걷힌다(하나만)', a.n === 1, JSON.stringify(a));
    await pg.evaluate(() => { try { _lsToastOff(); } catch (e) {} }); await pg.click('[data-fk="opt:candle"]'); await wait(80); a = await toast();
    ok(W + ' 담기 알림이 뜨면 예시 알림은 걷힌다(하나만)', a.n === 1 && /화촉/.test(a.t), JSON.stringify(a));
    /* 한도 */
    await setOn({ prevideo: 1, candle: 1, welcome: 1, vow: 1, ring: 1, declare: 1, song: 1 }); await wait(200);
    a = await tap('[data-fk="opt:letter"]'); const on7 = await pg.evaluate(() => !!S.on.letter);
    ok(W + ' 7번째 → «본식 순간 6개가 다 찼어요» · 담기지 않음 · 창 없음', a.t === '본식 순간 6개가 다 찼어요' && !on7 && !(await pg.$('.ord-ask')), JSON.stringify(a));
    await setOn({ prevideo: 1, candle: 1, bless: 1, song: 1, letter: 1 }); await wait(200);
    a = await tap('[data-fk="opt:tribute"]'); ok(W + ' 긴 넷째 → «긴 순간 3개가 다 찼어요»', a.t === '긴 순간 3개가 다 찼어요', JSON.stringify(a));
    await setOn({ prevideo: 1, candle: 1, bless: 1, song: 1 }); await wait(200);
    a = await tap('[data-fk="opt:table"]'); ok(W + ' 긴 둘 + 테이블 인사 → «테이블 인사는 긴 순간 2개로 세요»', a.t === '테이블 인사는 긴 순간 2개로 세요', JSON.stringify(a));
    /* 택1 — 엔진이 함께 빼는 짝(지금 엔진엔 없다 · 생기면 이 글) — onOf 를 잠깐 바꿔 흉내 */
    await setOn({ prevideo: 1, candle: 1, free: 1 }); await wait(200);
    await pg.evaluate(() => { const R = RitualOpen; R._onOf0 = R.onOf; R.onOf = function (S, k) { if (k === 'free' && S && S.on && S.on.song) return false; return R._onOf0(S, k); }; });
    a = await tap('[data-fk="opt:song"]'); await pg.evaluate(() => { RitualOpen.onOf = RitualOpen._onOf0; });
    ok(W + ' 택1 → «‹축가›를 담아서 ‹축사›는 빠졌어요»', a.t === '‹축가›를 담아서 ‹축사›는 빠졌어요', JSON.stringify(a));
    /* 모든 순간 이름 — 담기 · 빼기 글이 20자 안 · «·» 한 번 · 긴 이름은 «본식»을 뺀다 */
    const all = await pg.evaluate(() => { const R = RitualOpen, out = []; R.CNT_PICK.concat(['prevideo']).forEach((k) => { S.on = { prevideo: 1, candle: 1 }; delete S.on[k]; const b = _pkTgSnap(); S.on[k] = 1; out.push(_pkTgSay(k, true, b).t); const b2 = _pkTgSnap(); delete S.on[k]; out.push(_pkTgSay(k, false, b2).t); });
      R.ORDER.concat(['_close']).forEach((k) => { if (R.ALWAYS[k] || k === '_close') { const nm = R.nameOf(k, S); out.push('‹' + nm + '›' + _josa(nm, '은', '는') + ' 늘 포함돼요'); } });
      ['n', 'long'].forEach((c) => out.push(_pkCapSay(c, S, { on: {} }))); out.push(_pkCapSay('long', { on: {} }, { on: { table: 1 } }));
      return out; });
    const bad = all.filter((t) => !fits(t)); ok(W + ' 모든 순간 글 ' + all.length + '개 — 20자 안 · «·» 한 번(최장 ' + Math.max(...all.map((t) => vis(t).length)) + '자)', !bad.length, bad.join(' | '));
    ok(W + ' 긴 이름 — «‹부모님께 인사›를 담았어요 · +n분»(«본식» 뺌)', all.some((t) => /^‹부모님께 인사›를 담았어요 · \+\d+분$/.test(t)), all.filter((t) => /부모님께 인사/.test(t)).join(' | '));
    await pg.evaluate(() => { RitualOpen.onOf = RitualOpen._onOf0 || RitualOpen.onOf; });
    /* ── ② 예식 흐름(전체 순서) — ✓ · ● */
    await setOn({ prevideo: 1, candle: 1, welcome: 1, vow: 1, ring: 1 }); await pg.evaluate(() => { try { opGoStep('listen'); mkGo('_intro'); } catch (e) {} render(); document.body.style.opacity = 1; }); await wait(400);
    m0 = await mid(); a = await tap('[data-fk="mkflow:candle"]'); d = Math.round((await mid()) - m0);
    ok(W + ' ② ✓ 풀기 → «‹화촉›을 뺐어요' + (d ? ' · 본식 −' + -d + '분' : '') + '»', a.t === '‹화촉›을 뺐어요' + (d ? ' · 본식 −' + -d + '분' : ''), JSON.stringify(a));
    ok(W + ' ② 알림 하나 · 화면 안', a.n === 1 && a.inView && !a.over, JSON.stringify(a));
    a = await tap('[data-fk="mkflow:candle"]'); ok(W + ' ② ＋ 다시 담기 → «‹화촉›을 담았어요…»', /^‹화촉›을 담았어요/.test(a.t), JSON.stringify(a));
    a = await tap('li.cf-r[data-k="entry"] .cf-fixmk'); ok(W + ' ② ● 누름 → «‹입장›은 늘 포함돼요»', a.t === '‹입장›은 늘 포함돼요', JSON.stringify(a));
    ok(W + ' pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
    await ctx.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { if (br) await br.close(); srv.close(); }
console.log(fail ? `\nPICK TOAST FAIL ${fail}` : '\nPICK TOAST OK'); process.exit(fail ? 1 : 0);
