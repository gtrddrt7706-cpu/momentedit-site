#!/usr/bin/env node
/* ★[VC_FIX_1030 2026-10-30] 두 분 AI 목소리 버그 셋(화면 쪽) — 식순 화면(order-preview.html)만 열고 함수로 잰다.
   ① [BAKE_FAIL_DROP] 저장 · 나가기 직전 굽기가 실패해도 «새 글 + 옛 글 소리»를 남기지 않는다(글 · 읽는 분이 바뀐 줄만 내려놓음 · 빠르기만 바뀐 줄은 그대로)
   ② [DONE_NOT_GONE] 없다고 확인된 소리(_rfGone)는 파일 정보가 남아도 다 됨으로 세지 않는다
   ③ [DEL_LATE_UP] 올리는 사이 그 분 목소리를 지웠으면 늦게 온 «올라갔어요»를 줄에 붙이지 않는다(지우기 전 차례면 붙인다)
   깨 보기: 각 장면에 «고치기 전 판정»을 함께 재서 검사가 살아 있는지 본다.
   종료 코드 0 통과 · 1 실패 · 2 재지 못함 */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + (typeof d === 'string' ? d : JSON.stringify(d))}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.mp3': 'audio/mpeg' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
let br; try { br = await pw.chromium.launch(); } catch (e) { console.log('못 쟀다 — 브라우저 ' + e.message); srv.close(); process.exit(2); }
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await wait(500);
  const r = await pg.evaluate(() => {
    courseStarted = true; Object.assign(S, { guestVoice: 'couple', entryVoice: 'couple', vfill: { guest: 'ai', entry: 'ai' } });
    RitualOpen.FEATURE.upLive = true; RitualOpen.FEATURE.voiceClone = true;
    VC.st = { ok: true, groom: { consent: true, ready: true, left: 19 }, bride: { consent: true, ready: true, left: 19 } };
    window._vc0 = () => Promise.resolve({ ok: false, error: 'x' });
    const ai = (k, o) => Object.assign({ n: 'AI', id: 'F_' + k + Math.random().toString(36).slice(2, 6), src: 'ai', by: _vcLineWho(k), tx: _txSig(_recNeed(k)), tempo: _tKey(k), pause: _pKey(k), wq: _slKeyOk(k) ? _slWhoSig(k) : undefined }, o || {});
    const out = {};
    /* ① 글이 바뀐 줄(g0)은 내려놓고 · 빠르기만 바뀐 줄(g1)은 그대로 */
    S.up = { g0: ai('g0', { tx: 'OLD_TEXT_SIG' }), g1: ai('g1', { tempo: '1.3' }) };
    out.st0 = [_upStale('g0'), _upStale('g1')];
    out.drop = _vtStaleDrop();
    out.after = [S.up.g0, !!(S.up.g1 && S.up.g1.src === 'ai')];
    out.need0 = _aiNeed('g0');
    /* ② 없다고 확인된 소리 — 마이페이지 안(EMBED)의 «서버에 없음» */
    S.up = { g0: ai('g0') }; const it = _mkItems('guest').filter((q) => q.up === 'g0')[0];
    out.d0 = _mkItemDone(it); RF_ERR[S.up.g0.id] = { gone: 1, at: Date.now(), t: 'x' }; out.d1 = _mkItemDone(it);
    out.dOld = !!(S.up && S.up.g0) && !_upStale('g0');   // 고치기 전 판정(깨 보기)
    delete RF_ERR[S.up.g0.id]; RF_ERR[S.up.g0.id] = { local: 1, at: Date.now() }; out.dLocalPreview = _mkItemDone(it);   // 미리보기(EMBED 아님)의 «이 기기에 없어요»는 없는 것이 아님
    /* ③ 늦게 온 올리기 답 */
    const late = (bump) => { S.up = { g0: 0 }; UP_DG.g0 = _vcDelSnap(); MK_PEND.g0 = { 7: { blob: new Blob(['x']), url: '', src: 'ai', meta: { by: 'groom' }, nm: 'AI' }, last: 7 }; MK_UP.g0 = 1;
      if (bump) { VC.delGen = VC.delGen || {}; VC.delGen.groom = (VC.delGen.groom || 0) + 1; }
      const gone = _upVoiceGone('g0', MK_PEND.g0[7]); _mkUpDone({ key: 'g0', tk: 7, ok: true, id: 'F_LATE', name: 'AI' }); return { gone, up: S.up.g0 && S.up.g0.id || 0, busy: !!MK_UP.g0 }; };
    out.lateDel = late(true); out.lateOk = late(false);
    /* 다른 분(신부) 목소리를 지운 것은 신랑 줄 답을 막지 않는다 */
    S.up = { g0: 0 }; UP_DG.g0 = _vcDelSnap(); VC.delGen.bride = (VC.delGen.bride || 0) + 1; out.otherGone = _upVoiceGone('g0', { src: 'ai', meta: { by: 'groom' } });
    return out; });
  ok('① 깨 보기 — 글을 바꾼 줄은 _upStale · 빠르기만 바꾼 줄은 아님', r.st0[0] === true && r.st0[1] === false, r.st0);
  ok('① [BAKE_FAIL_DROP] 저장 직전 굽기 실패 뒤 — 글이 바뀐 줄의 옛 소리를 내려놓는다(S.up = 0 · 당일 나레이션) · 빠르기만 바뀐 줄은 그대로', r.drop === 1 && r.after[0] === 0 && r.after[1] === true, r);
  ok('① 내려놓은 줄은 «목소리 만들기»(_aiNeed)', r.need0 === true, r);
  ok('② 깨 보기 — 고치기 전 판정은 없는 소리도 다 됨', r.dOld === true && r.d0 === true, r);
  ok('② [DONE_NOT_GONE] 서버에 없는 소리 — 다 됨으로 세지 않는다 · 미리보기의 «이 기기에 없어요»는 그대로 다 됨', r.d1 === false && r.dLocalPreview === true, r);
  ok('③ [DEL_LATE_UP] 지운 뒤 늦게 온 올리기 답은 줄에 안 붙는다 · 올리는 중 표시 풀림', r.lateDel.gone === true && r.lateDel.up === 0 && !r.lateDel.busy, r.lateDel);
  ok('③ 깨 보기 — 지우기 없이 온 같은 답은 붙는다', r.lateOk.gone === false && r.lateOk.up === 'F_LATE', r.lateOk);
  ok('③ 다른 분 목소리를 지운 것은 이 줄 답을 막지 않는다', r.otherGone === false, r);
  const src = fs.readFileSync(path.join(ROOT, 'order-preview.html'), 'utf8');
  ok('① 저장 · 나가기 세 길(DONE_AFTER_BAKE · TEMPO_BAKE 나가기 · SAVE_AFTER_BAKE)이 모두 보내기 전에 _vtStaleDrop', (src.match(/_vtStaleDrop\(\);\s*\/\* \[BAKE_FAIL_DROP\] \*\//g) || []).length === 3);
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외 ' + (e && e.stack || e)); fail++; }
await br.close(); srv.close();
console.log(fail ? `VC FIX 1030 FAIL ${fail}` : 'VC FIX 1030 OK'); process.exit(fail ? 1 : 0);
