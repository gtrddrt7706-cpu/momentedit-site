// ★[PV_FILL · UP_RACE · VLIST_ONE_LINE · UP_BTN_OFF 2026-10-06 사장님 «식전 영상 소개 플레이 누르면 나레이션이 흐르는데 혼선» · «파일 올렸어요 이건 뭐지 · 버그» · «가로줄 2줄» · «밑에 들어 보기 지우기 왜 있어 · 위 플레이로 통일»]
//   ①AI 를 고르면 식전 영상 소개 글이 예시 1 로 들어 있다 · 흐름에 나레이션 줄이 따로 안 남는다(카드 하나)
//   ②같은 줄을 연달아 보내도(예시 빨리 바꾸기) «파일 올렸어요»로 적히지 않는다 — 마지막에 보낸 것이 이긴다 · 답이 거꾸로 와도
//   ③두 분 목소리 칸 위에 가로선이 한 줄
//   ④녹음 · 파일 올린 줄 아래 «들어 보기 · 지우기» 단추 줄 없음 · 지우기는 상태 줄 끝
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
try {
  for (const w of [390, 1280]) {
    const pg = await br.newPage({ viewport: { width: w, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
    await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
    await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(700);
    await pg.evaluate(() => { courseStarted = true; S.on.prevideo = 1; S.pvText = ''; RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true; VC.st = { ok: true, groom: { ready: true }, bride: {} }; buildSteps(); for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'listen') { idx = i; render(); break; } mkGo('prevideo'); });
    await wait(400);
    await pg.evaluate(() => { _lSet('pvVoice', 'ai'); buildSteps(); render(); }); await wait(400);
    const a = await pg.evaluate(() => ({ t: S.pvText, flow: !!document.querySelector('.mk-pg .mk-flowsec'), narRow: /두 분이 준비한 영상을 함께 보시겠습니다/.test((document.querySelector('.mk-pg .mk-flowsec') || {}).textContent || '') }));
    ok(`${w} ① AI 를 고르면 소개글 = 예시 1 · 흐름에 나레이션 줄 없음 [PV_FILL]`, a.t === await pg.evaluate(() => PV_EX[0][1]) && !a.narRow, JSON.stringify(a));
    await pg.evaluate(() => { S.pvText = ''; render(); }); await wait(200);
    const a2 = await pg.evaluate(() => ({ narRow: /두 분이 준비한 영상을 함께 보시겠습니다/.test((document.querySelector('.mk-pg .mk-flowsec') || {}).textContent || ''), note: ((document.querySelector('.mk-voice .mk-vaiw') || {}).textContent || '') }));
    ok(`${w} ① 소개글을 비우면 흐름 줄 대신 카드 안내 «비워 두면 스튜디오 나레이션이 소개해요» [PV_FILL]`, !a2.narRow && /비워 두면 스튜디오 나레이션이 소개해요/.test(a2.note), JSON.stringify(a2));
    await pg.evaluate(() => { S.pvText = PV_EX[0][1]; render(); }); await wait(200);
    /* ② 답이 거꾸로 와도 · 번호 없는 옛 마이페이지여도 */
    const r = await pg.evaluate(() => { const out = {}; const mk = (n) => { const tk = (MK_SEQ = MK_SEQ + 1); MK_PEND.pv = MK_PEND.pv || {}; MK_PEND.pv[tk] = { blob: new Blob(['x' + n]), url: 'blob:x' + n, src: 'ai', meta: { tx: 'T' + n, by: 'groom' } }; MK_PEND.pv.last = tk; return tk; };
      const t1 = mk(1), t2 = mk(2); _mkUpDone({ key: 'pv', ok: true, id: 'id2', tk: t2, name: 'b' }); _mkUpDone({ key: 'pv', ok: true, id: 'id1', tk: t1, name: 'a' }); out.rev = S.up.pv.src + ':' + S.up.pv.id + ':' + S.up.pv.tx;
      const t3 = mk(3), t4 = mk(4); _mkUpDone({ key: 'pv', ok: true, id: 'id3', name: 'c' }); _mkUpDone({ key: 'pv', ok: true, id: 'id4', name: 'd' }); out.fifo = S.up.pv.src + ':' + S.up.pv.id + ':' + S.up.pv.tx;
      out.st = _mkUpState('pv').t; return out; });
    ok(`${w} ② 같은 줄을 연달아 보내도 «파일 올렸어요»가 아니다 — 마지막에 보낸 것이 남는다(답이 거꾸로 · 번호 없는 답) [UP_RACE]`, r.rev === 'ai:id2:T2' && r.fifo === 'ai:id4:T4' && r.st === 'AI로 만들었어요', JSON.stringify(r));
    /* ③ 가로선 한 줄 */
    await pg.evaluate(() => { S.up.pv = { src: 'ai', id: 'local:1', tx: _txSig(PV_EX[0][1]), by: 'groom' }; render(); }); await wait(200);
    const l = await pg.evaluate(() => { const v = document.querySelector('.mk-pg .mk-voice'), u = v && v.querySelector('.mk-vlist'); if (!v || !u) return null; return { secTop: parseFloat(getComputedStyle(v).borderTopWidth), ulTop: parseFloat(getComputedStyle(u).borderTopWidth), gap: Math.round(u.getBoundingClientRect().top - v.getBoundingClientRect().top) }; });
    ok(`${w} ③ 두 분 목소리 칸 위 가로선 한 줄(칸 윗선 · 목록 윗선이 겹쳐 두 줄이 되지 않게) [VLIST_ONE_LINE]`, !!l && !(l.secTop > 0 && l.ulTop > 0 && l.gap < 40), JSON.stringify(l));
    /* ④ 녹음 · 파일 줄 */
    await pg.evaluate(() => { S.up.pv = { src: 'rec', id: 'local:2', n: 'r' }; render(); }); await wait(200);
    const b = await pg.evaluate(() => ({ playBtn: !!document.querySelector('[data-fk="mkupplay:pv"]'), del: !!document.querySelector('.mk-vst [data-fk="mkupdel:pv"]'), bottomDel: !!document.querySelector('.mk-vbs [data-fk="mkupdel:pv"]'), head: !!document.querySelector('[data-fk="mkvpl:pv"]') }));
    ok(`${w} ④ 녹음 줄 — 아래 «들어 보기 · 지우기» 없음 · 머리 ▶ · 지우기는 상태 줄 끝 [UP_BTN_OFF]`, !b.playBtn && !b.bottomDel && b.del && b.head, JSON.stringify(b));
    ok(`${w} pageerror 0`, !errs.length, errs.slice(0, 2).join(' | '));
    await pg.close();
  }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nPV FILL FAIL ${fail}` : '\nPV FILL OK'); process.exit(fail ? 1 : 0);
