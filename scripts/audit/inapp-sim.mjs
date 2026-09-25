#!/usr/bin/env node
/* [INAPP_SIM 2026-09-25] 카카오톡 안 브라우저를 흉내 내 ② 보고 듣기를 걸어 본다.
   ★실기기가 아니다. 이 환경엔 WebKit 이 없어 Chromium 위에 «아이폰 규칙»을 얹는다:
     - 오디오는 «손가락 탭의 호출 스택 안에서» 처음 재생된 요소만 뒤에도 재생된다(WebKit 요소별 잠금)
     - navigator.wakeLock · mediaSession · MediaMetadata 없음(카톡 WKWebView)
   안드로이드 쪽은 Chromium WebView 와 같은 엔진이라 --autoplay-policy=user-gesture-required 로 본다.
   종료 0 통과 · 1 실패 · 2 못 잼(playwright 없음). */
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let bad = 0; const ok = (n, c, d) => { console.log((c ? 'ok   ' : 'FAIL ') + n + (c || !d ? '' : ' → ' + String(d).slice(0, 220))); if (!c) bad++; };
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.mp3': 'audio/mpeg', '.css': 'text/css', '.svg': 'image/svg+xml' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = path.join(ROOT, u); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': TYPES[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;

/* 아이폰 규칙 — 요소별 잠금. 탭(touchend/click) 처리 중인 동기 호출 스택에서 play() 가 불린 요소만 풀린다. */
const IOS_RULES = () => {
  let inGesture = false; window.__playLog = [];
  const on = () => { inGesture = true; setTimeout(() => { inGesture = false; }, 0); };
  ['touchend', 'click', 'keydown'].forEach((t) => window.addEventListener(t, on, true));
  const orig = HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play = function () {
    const src = this.currentSrc || this.src || '';
    if (!this.__unlocked && !inGesture && !this.muted) { window.__playLog.push({ ok: false, src: src.slice(-40) }); const e = new DOMException('blocked', 'NotAllowedError'); return Promise.reject(e); }
    if (inGesture) this.__unlocked = true;
    window.__playLog.push({ ok: true, src: src.slice(-40) });
    return orig.call(this);
  };
  try { delete Navigator.prototype.wakeLock; } catch (e) {} try { Object.defineProperty(navigator, 'wakeLock', { value: undefined }); } catch (e) {}
  try { delete Navigator.prototype.mediaSession; } catch (e) {} try { delete window.MediaMetadata; } catch (e) {}
};
const AND_RULES = () => { window.__playLog = []; const orig = HTMLMediaElement.prototype.play; HTMLMediaElement.prototype.play = function () { const src = this.currentSrc || this.src || ''; const p = orig.call(this); window.__playLog.push({ ok: true, src: src.slice(-40) }); if (p && p.catch) p.catch((e) => { if (e && e.name === 'NotAllowedError') window.__playLog.push({ ok: false, src: src.slice(-40) }); }); return p; }; };

const PROFILES = [
  { name: '아이폰 카톡', args: ['--autoplay-policy=user-gesture-required'], vp: { width: 390, height: 844 }, ua: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148 KAKAOTALK 10.8.0', init: IOS_RULES },
  { name: '안드로이드 카톡', args: ['--autoplay-policy=user-gesture-required'], vp: { width: 360, height: 740 }, ua: 'Mozilla/5.0 (Linux; Android 14; SM-S918N Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/128.0.6613.146 Mobile Safari/537.36 KAKAOTALK/10.8.0 (INAPP)', init: AND_RULES },
];

for (const P of PROFILES) {
  const br = await pw.chromium.launch({ args: P.args });
  const ctx = await br.newContext({ viewport: P.vp, userAgent: P.ua, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const pg = await ctx.newPage(); const errs = [];
  pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.addInitScript(P.init);
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html`, { waitUntil: 'load' }); await pg.waitForTimeout(700);
  const W = P.name;
  await pg.tap('#next'); await pg.waitForTimeout(400); await pg.tap('#next'); await pg.waitForTimeout(500);
  await pg.tap('[data-fk="opx:family"]'); await pg.waitForTimeout(400);
  const picked0 = await pg.evaluate(() => RitualOpen.picked(S).join(','));
  await pg.tap('#next'); await pg.waitForTimeout(1500);
  ok(`${W} ② 들어감 · 엔진 · 녹음표 준비됨(첫 탭 전에)`, await pg.evaluate(() => STEPS[idx].k === 'listen' && !!ENG && !!LREC));

  // ① 첫 줄이 «녹음 전»(글만)이고 뒤에 소리 줄이 있는 순간 — 요소가 탭 안에서 한 번도 안 풀린 채 다음 소리로 가는 자리
  /* [TEXT_AUDIO_MATCH] 지금은 옛 녹음이라 소리 나는 줄이 없다 — 첫 줄은 글로 두고 뒤 줄들만 «재녹음된 것»처럼(LREC = 지금 글) 만든다 */
  const k = await pg.evaluate(() => { for (const k of _lRows()) { const q = _lSteps(ENG, [k]); if (q.length > 1 && q[0].file && q.slice(1).some((s) => s.file)) { q.slice(1).forEach((s) => { if (s.file) LREC[s.file] = { text: s.txt }; }); delete LREC[q[0].file]; return k; } } return ''; });
  ok(`${W} 시험할 순간이 있다(첫 줄 글 → 뒤에 소리)`, !!k, k);
  if (k) {
    await pg.evaluate(() => { window.__playLog = []; });
    await pg.tap(`#lsr_${k} .ls-play`); 
    const ms = await pg.evaluate(() => (LP.q[0] || {}).ms || 0);
    await pg.waitForTimeout(ms + 1500);
    const r = await pg.evaluate(() => ({ log: window.__playLog, paused: LP.paused, i: LP.i, st: LP.q[LP.i] ? !!LP.q[LP.i].src : null, el: LP.el ? { p: LP.el.paused, t: LP.el.currentTime } : null }));
    const real = r.log.filter((x) => /\.mp3$/.test(x.src));
    ok(`${W} «${k}» 글 줄 뒤 소리 줄이 막히지 않고 실제로 흐른다(currentTime > 0)`, real.length > 0 && real.every((x) => x.ok) && !r.paused && r.el && r.el.t > 0, JSON.stringify(r));
    await pg.evaluate(() => lsStop());
  }
  // ② 처음부터 보고 듣기 → 크게 보기 → 몇 줄 넘겨도 멈추지 않는다
  await pg.evaluate(() => { window.__playLog = []; });
  await pg.tap('.ls-hero'); await pg.waitForTimeout(900);
  ok(`${W} 크게 보기 열림 · 화면 꺼짐 방지 없어도 오류 없음`, await pg.evaluate(() => !document.getElementById('lsFull').hidden));
  for (let n = 0; n < 3; n++) { const b = await pg.$('#lsFull [data-fk="lfnext"], #lsFull [onclick*="lsJump(1)"]'); if (b) { await b.tap(); await pg.waitForTimeout(250); } }
  await pg.waitForTimeout(800);
  const r2 = await pg.evaluate(() => ({ log: window.__playLog, paused: LP.paused, q: LP.q.length }));
  ok(`${W} 크게 보기에서 빠르게 넘겨도 멈춘 채로 남지 않는다`, !r2.paused && r2.q > 0 && !r2.log.some((x) => !x.ok), JSON.stringify(r2).slice(0, 300));
  // ③ 뒤로 셋(안드로이드 뒤로 단추 · 카톡 아이폰 ‹ = history.back)
  await pg.goBack(); await pg.waitForTimeout(500);
  ok(`${W} 뒤로 1 → 크게 보기만 닫힌다`, await pg.evaluate(() => document.getElementById('lsFull').hidden && STEPS[idx].k === 'listen'));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok(`${W} 뒤로 2 → ① 고르기`, await pg.evaluate(() => STEPS[idx].k === 'pick'));
  await pg.goBack(); await pg.waitForTimeout(500);
  ok(`${W} 뒤로 3 → 안내(페이지를 떠나지 않는다)`, await pg.evaluate(() => /intro/.test(STEPS[idx].k)));
  await pg.reload({ waitUntil: 'load' }); await pg.waitForTimeout(800);
  ok(`${W} 새로고침 뒤 고른 것 유지`, (await pg.evaluate(() => RitualOpen.picked(S).join(','))) === picked0);
  ok(`${W} 가로 넘침 0`, await pg.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  ok(`${W} pageerror 0`, errs.length === 0, errs.join(' | '));
  await br.close();
}
srv.close();
console.log(bad ? `결과 — 실패 ${bad}` : '결과 — 전부 통과');
process.exit(bad ? 1 : 0);
