// ★[SAVED_FRESH 2026-10-09 고객 여정 A~Z 점검 1라운드 E-2] 마이페이지가 보낸 서버 초안은 «통째로» 얹는다.
//   사고(시뮬 재현): 이 기기 옛 판(예시 고름 gExC=2 · 영상 소개 읽는 분 pvWho=b · 고른 예시 guestEx=3) 위에 서버 판을 덮어써서,
//   다른 기기에서 지운 그 칸들이 이 기기 값으로 살아났다(쪽을 떠나면 그 옛 값을 굽고 저장해 다른 기기의 선택을 서버에서 되돌렸다).
//   1 서버 판에 없는 칸은 이 기기 옛 값으로 남지 않는다 · 서버 판 값은 그대로 들어온다
//   2 이 기기 몫(SAVED_LOCAL — 보낸 목소리 만들기 표 vjob · «봤다» 표시 tipSeen)은 서버 판에 없으면 지킨다
//   3 서버 판이 올바르지 않으면(코스 없음) 아무것도 비우지 않는다(이 기기 판 그대로)
//   4 [REOPEN_SAME_STEP 1라운드 A-1] 다시 열어도 나갔던 자리 그대로
//   5 [LOCAL_AHEAD 1라운드 A-2] 저장 안 한 고침 — 서버 판이 그 바탕 그대로면 이 기기 판 · 그사이 다른 기기가 저장했으면 서버 판 + 한 줄
//   SF_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(돌연변이 검사용). 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.SF_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음'); process.exit(2); }
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const T = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const port = srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
/* 마이페이지 안(embed=1)에서 연 빌더 — 이 기기 옛 판을 만든 뒤 마이페이지가 보내는 orderFill(서버 판)을 같은 출처 메시지로 흉내 낸다 */
async function open() {
  const pg = await br.newPage({ viewport: { width: 390, height: 900 } }); const errs = []; pg.on('pageerror', (e) => errs.push(e.message));
  await pg.route('**/*', (rt) => rt.request().url().startsWith('http://127.0.0.1:' + port) ? rt.continue() : rt.fulfill({ status: 200, body: '' }));
  await pg.goto(`http://127.0.0.1:${port}/order-preview.html?embed=1`, { waitUntil: 'load' }); await wait(600);
  await pg.evaluate(() => { if (!COURSES[S.course]) S.course = Object.keys(COURSES)[0]; courseStarted = true; _restored = true; _who = 'ME0001';
    S.gExC = 2; S.pvWho = 'b'; S.guestEx = 3; S.vjob = { groom: { jid: 'j-local', t: Date.now(), snap: {} } }; S.tipSeen = { keep: 1 }; _persist(); });
  return { pg, errs };
}
const fill = (pg, srvS) => pg.evaluate((srvS) => { window.postMessage({ type: 'momentedit:orderFill', cust: { code: 'ME0001' }, draft: { S: srvS }, done: false }, window.location.origin); }, srvS);
const look = (pg) => pg.evaluate(() => ({ gExC: S.gExC, pvWho: S.pvWho, guestEx: S.guestEx, entry: S.entry, vjob: S.vjob && S.vjob.groom && S.vjob.groom.jid, tip: S.tipSeen && S.tipSeen.keep, saved: (() => { try { const v = JSON.parse(localStorage.getItem('me_order')); return { gExC: v.S.gExC, vjob: v.S.vjob && v.S.vjob.groom && v.S.vjob.groom.jid }; } catch (e) { return null; } })() }));
try {
  /* 1 · 2 */
  { const { pg, errs } = await open();
    const srvS = await pg.evaluate(() => { const o = JSON.parse(JSON.stringify(S)); delete o.gExC; delete o.pvWho; delete o.guestEx; delete o.vjob; delete o.tipSeen; o.entry = o.entry === 'C' ? 'D' : 'C'; return o; });   // 다른 기기(B)가 바꿔 저장한 판 — 그 칸들이 «없음» · 입장 인사는 다른 멘트
    await fill(pg, srvS); await wait(700); const a = await look(pg);
    ok('1 서버 판에 없는 칸(예시 고름 · 영상 소개 읽는 분 · 고른 예시)은 이 기기 옛 값으로 남지 않는다 · 서버 판 값(입장 인사 멘트)은 그대로 들어온다 · 이 기기 저장도 같은 판 [SAVED_FRESH]', a.gExC === undefined && a.pvWho === undefined && a.guestEx === undefined && a.entry === srvS.entry && a.saved && a.saved.gExC === undefined, JSON.stringify(a));
    ok('2 이 기기 몫(보낸 목소리 만들기 표 · «봤다» 표시)은 서버 판에 없으면 지킨다 [SAVED_LOCAL]', a.vjob === 'j-local' && a.tip === 1 && a.saved && a.saved.vjob === 'j-local', JSON.stringify(a));
    ok('1 · 2 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* 3 */
  { const { pg, errs } = await open();
    await fill(pg, { entry: 'C' }); await wait(700); const b = await look(pg);
    ok('3 서버 판이 올바르지 않으면(코스 없음) 이 기기 판을 비우지 않는다', b.gExC === 2 && b.pvWho === 'b' && b.guestEx === 3 && b.vjob === 'j-local', JSON.stringify(b));
    ok('3 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* 4 [REOPEN_SAME_STEP] 서버 초안으로 다시 열어도 나갔던 자리 그대로(판 번호 v:2 · 종전엔 한 칸씩 밀렸다) */
  { const { pg, errs } = await open();
    const r = await pg.evaluate(() => { let k = -1; for (let i = 0; i < STEPS.length; i++) if (STEPS[i].k === 'pick') { k = i; break; } if (k < 0) k = Math.min(2, STEPS.length - 1); idx = k; _persist(); return { k, srvS: JSON.parse(JSON.stringify(S)) }; });
    await fill(pg, r.srvS); await wait(700); const at = await pg.evaluate(() => idx);
    ok('4 다시 열어도 나갔던 자리 그대로(한 칸 밀리지 않는다) [REOPEN_SAME_STEP]', at === r.k, JSON.stringify({ want: r.k, got: at }));
    ok('4 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
  /* 5 [LOCAL_AHEAD] 저장 안 한 고침이 있는 이 기기 판 — 서버 판이 그 바탕 그대로면 이 기기 판을 이어서(«저장» 켜짐) · 그사이 바뀌었으면 서버 판 + 한 줄 */
  for (const other of [false, true]) {
    const { pg, errs } = await open();
    const srvS = await pg.evaluate(() => { const b = JSON.parse(JSON.stringify(S)); _srvBase = _canonS(b); _autoLast = _autoKeyOf(b); S.tx = Object.assign({}, S.tx, { 'welcome.g': '이 기기에서 더 쓴 글' }); _persist(); return b; });
    const sent = other ? Object.assign({}, srvS, { tx: { 'welcome.g': '다른 기기에서 저장한 글' } }) : srvS;
    await fill(pg, sent); await wait(800);
    const c = await pg.evaluate(() => ({ tx: (S.tx || {})['welcome.g'] || '', toast: ((document.getElementById('_toast') || {}).textContent || '').trim(), dirty: _autoKey() !== _autoLast }));
    if (!other) ok('5 서버 판이 이 기기 고침의 바탕 그대로면 이 기기 판을 이어서 연다 · 저장 안 한 상태 그대로 · «저장 전 고침을 이어서 열었어요» [LOCAL_AHEAD]', c.tx === '이 기기에서 더 쓴 글' && c.dirty && /저장 전 고침을 이어서 열었어요/.test(c.toast), JSON.stringify(c));
    else ok('5 그사이 다른 기기에서 저장했으면 서버 판으로 열고 «저장한 판으로 열었어요» [LOCAL_AHEAD]', c.tx === '다른 기기에서 저장한 글' && !c.dirty && /저장한 판으로 열었어요/.test(c.toast), JSON.stringify(c));
    ok('5 pageerror 0', !errs.length, errs.slice(0, 2).join(' | ')); await pg.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSAVED FRESH FAIL ${fail}` : '\nSAVED FRESH OK'); process.exit(fail ? 1 : 0);
