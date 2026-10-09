// ★[SAVED_FRESH 2026-10-09 고객 여정 A~Z 점검 1라운드 E-2] 마이페이지가 보낸 서버 초안은 «통째로» 얹는다.
//   사고(시뮬 재현): 이 기기 옛 판(예시 고름 gExC=2 · 영상 소개 읽는 분 pvWho=b · 고른 예시 guestEx=3) 위에 서버 판을 덮어써서,
//   다른 기기에서 지운 그 칸들이 이 기기 값으로 살아났다(쪽을 떠나면 그 옛 값을 굽고 저장해 다른 기기의 선택을 서버에서 되돌렸다).
//   1 서버 판에 없는 칸은 이 기기 옛 값으로 남지 않는다 · 서버 판 값은 그대로 들어온다
//   2 이 기기 몫(SAVED_LOCAL — 보낸 목소리 만들기 표 vjob · «봤다» 표시 tipSeen)은 서버 판에 없으면 지킨다
//   3 서버 판이 올바르지 않으면(코스 없음) 아무것도 비우지 않는다(이 기기 판 그대로)
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
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nSAVED FRESH FAIL ${fail}` : '\nSAVED FRESH OK'); process.exit(fail ? 1 : 0);
