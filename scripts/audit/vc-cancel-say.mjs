// ★[VC_CANCEL_SAY 2026-10-09 고객 여정 A~Z 점검 1라운드] 만드는 사이 지우기가 이겨 서버가 작업표를 «취소»(kind cancel)로 닫았을 때.
//   사고(서버 VC_DEL_STOP 의 짝): 다른 탭 · 기기에서 지우기를 누른 동안 만들던 탭이 상태로 끝을 보면 «지금은 안 돼요 · 잠시 뒤 다시 눌러 주세요 (코드 V0)»가 떴다.
//   1 작업표 «취소»는 «지우기를 눌러 만들던 목소리도 지웠어요» · 저절로 다시 보내지 않는다
//   2 창을 닫은 뒤 취소면 카드에 «다시 만들기» 표(VC_EFAIL_KEEP)를 남기지 않는다 · 알림은 그 말로
//   3 창이 떠 있으면 큰 단추는 «닫기»만(VC_NO_RETRY 와 같은 모양)
//   VCS_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.VCS_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const WORD = '지우기를 눌러 만들던 목소리도 지웠어요';
try {
  const pg = await br.newPage({ viewport: { width: 390, height: 844 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
  await pg.goto(`${BASE}/order-preview.html`, { waitUntil: 'load' }); await wait(800);
  const a = await pg.evaluate(() => { const d = _vcEnrJobD({ jid: 'j1', end: true, ok: false, kind: 'cancel', ecode: 'V0', error: '서버 글' }); return { err: d.error, again: _vcEnrAgain(d), msg: _vcEnrMsg(d).msg }; });
  ok('1 작업표 «취소»는 «지우기를 눌러 만들던 목소리도 지웠어요» · 저절로 다시 보내지 않는다 [VC_CANCEL_SAY]', a.err === WORD && a.msg === WORD && !a.again, JSON.stringify(a));
  const b = await pg.evaluate(() => { courseStarted = true; VC.st = { ok: true, groom: { ready: false }, bride: {} }; VC.read = null; VC.efail = {}; MK.toast = '';
    const R = { who: 'groom', take: { 1: { wav: 'x', dur: 15 }, 2: { wav: 'y', dur: 15 } }, phrase: '', step: 2, ph: 'busy', err: '' }, E = { w: 'groom', R, snap: {}, t0: Date.now(), jid: 'j1' };
    VC.enr = { groom: E }; _vcEnrCtl(E).fail(_vcEnrMsg(_vcEnrJobD({ kind: 'cancel', end: true, ok: false })).msg);
    return { kept: !!(VC.efail || {}).groom, toast: MK.toast || '' }; });
  ok('2 창을 닫은 뒤 취소면 카드에 «다시 만들기» 표를 남기지 않는다 · 알림은 그 말로 [VC_CANCEL_SAY]', !b.kept && b.toast.indexOf(WORD) > -1 && !/코드 V0/.test(b.toast), JSON.stringify(b));
  const c = await pg.evaluate((WORD) => { const R = { who: 'groom', take: { 1: { wav: 'x', dur: 15 }, 2: { wav: 'y', dur: 15 } }, phrase: '오늘은 맑음', step: 2, ph: 'read', err: WORD };
    VC.enr = {}; VC.read = R; render(); const d = document.getElementById('mkRecDlg'); const btns = d ? [...d.querySelectorAll('button')].filter((x) => x.offsetParent).map((x) => x.textContent.trim()) : null; VC.read = null; render(); return btns; }, WORD);
  ok('3 창이 떠 있으면 큰 단추는 «닫기»만(다시 만들기 · 글 1 다시 읽기 없음) [VC_CANCEL_SAY · VC_NO_RETRY]', !!c && c.indexOf('닫기') > -1 && c.indexOf('다시 만들기') < 0 && c.indexOf('글 1 다시 읽기') < 0, JSON.stringify(c));
  ok('pageerror 0', !errs.length, errs.slice(0, 2).join(' | '));
  await pg.close();
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nVC CANCEL SAY FAIL ${fail}` : '\nVC CANCEL SAY OK'); process.exit(fail ? 1 : 0);
