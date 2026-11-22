// ★[PROD_FS_INERT 2026-11-19 R3X #14] 청첩장 · 좌석 · 음료 · 예식 후 식사 전체화면(#mp_production.mp-fs)이 떠 있는 동안 Tab 이 가려진 뒤 페이지로 안 나간다.
//   종전: 이 셋만 [C2_LAYER_INERT] 에서 빠져 PC Tab 13 ~ 19번이 뒤 페이지(새로고침 · 계좌번호 복사 · «입금했어요» · 로그아웃)로 나갔다.
//   잰다: ① 정적 — _prodFsSync 가 켤 때 _layerInertOn(box) · 끌 때 _layerInertOff(box) ② 브라우저 — 세 화면 × Tab 25번이 뒤 본문(.mp-main 밖 · 레일 제외)으로 안 나간다 ·
//         «나가기» 확인 판은 눌린다 · 닫으면 막음이 풀린다. 종료 코드 0 통과 · 1 실패 · 2 브라우저 없음(정적은 그래도 잰다)
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
import { openWorld, kstAhead, kstAgo } from './_gasworld.mjs';
const require = createRequire(import.meta.url);
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const my = fs.readFileSync(path.join(ROOT, 'mypage.html'), 'utf8');
const fn = (() => { const i = my.indexOf('function _prodFsSync('); if (i < 0) return ''; let d = 0; for (let k = my.indexOf('{', i); k < my.length; k++) { if (my[k] === '{') d++; else if (my[k] === '}') { d--; if (!d) return my.slice(i, k + 1); } } return ''; })();
ok('① _prodFsSync 가 켜져 있으면 _layerInertOn(box) 를 건다', /if\(on\) _layerInertOn\(box\)/.test(fn));
ok('① 끌 때 _layerInertOff(box) 로 푼다', /!on && has\)\{ _layerInertOff\(box\)/.test(fn));
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright', '/opt/npm-tools/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
let br = null; if (pw) { for (const o of [{}, { executablePath: '/usr/bin/google-chrome' }]) { try { br = await pw.chromium.launch(o); break; } catch {} } }
if (!br) { console.log(fail ? '\nPROD_FS_INERT FAIL (정적)' : '\n못 쟀다 — 브라우저 없음(정적은 통과)'); process.exit(fail ? 1 : 2); }
const { G, world } = openWorld(); const WED = kstAhead(60);
world({ 신랑이름: '김희준', 신부이름: '이미쿠', 상품타입: '시그니처', 개인코드: 'ME-TEST', 이메일: 't@example.com', 연락처: '01012345678', 현재단계: '제작중', 계약상태: '서명완료', 계약서명일시: kstAgo(1), 계약총액: 3300000, 입금상태: '확인', 입금자명: '김희준', 시착동의상태: '동의완료', 시착동의일시: kstAgo(200), 예식일: WED,
  동의기록: JSON.stringify({ 계약정보: { weddingDate: WED, weddingTime: '12:20', requestedAt: kstAgo(30) } }) }, { 상태: '확정', 입금확인: '확인', 선택날짜: kstAhead(-40), 선택시간: '14:50', 토큰: 'BKTOK' });
const ref = G.findCustomerByCode('ME-TEST'); G.resolveSession = () => ({ ok: true, row: ref });
const ST = JSON.parse(JSON.stringify(G.handleGetMyState({ token: 't' })));
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const u = decodeURIComponent(q.url.split('?')[0]); const p = path.join(ROOT, u); if (!p.startsWith(ROOT)) { r.writeHead(403); r.end(); return; } fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
for (const row of ['청첩장', '좌석 · 음료', '예식 후 식사']) {
  const ctx = await br.newContext({ viewport: { width: 1280, height: 800 }, locale: 'ko-KR', timezoneId: 'Asia/Seoul' });
  await ctx.addInitScript("window.__ME_PREVIEW_GUARD_TEST_OFF = true; try{ localStorage.setItem('me_token','TOK'); localStorage.setItem('me_ledtip_v1','o'); }catch(e){}");
  await ctx.route('**/*', async (rt) => { const u = rt.request().url();
    if (u.includes('script.google.com') || u.includes('script.googleusercontent.com')) { let p = {}; try { p = JSON.parse(rt.request().postData() || '{}'); } catch {} const j = p.action === 'getMyState' ? ST : { ok: true }; return rt.fulfill({ status: 200, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(j) }).catch(() => {}); }
    if (u.startsWith(BASE)) return rt.continue(); return rt.fulfill({ status: 200, body: '' }).catch(() => {}); });
  const pg = await ctx.newPage();
  await pg.goto(BASE + '/mypage.html', { waitUntil: 'domcontentloaded' });
  await pg.waitForFunction(() => { const v = document.getElementById('mypageView'); return v && v.classList.contains('show'); }, null, { timeout: 20000 }); await wait(1000);
  await pg.evaluate((row) => { const lab = [...document.querySelectorAll('*')].find((e) => e.children.length === 0 && (e.innerText || '').trim() === row && e.getBoundingClientRect().width > 0); let p = lab; for (let i = 0; i < 5 && p; i++) { const b = p.querySelector && p.querySelector('button'); if (b) { b.click(); return; } p = p.parentElement; } }, row);
  await wait(1400);
  const fsOn = await pg.evaluate(() => !!document.querySelector('#mp_production.mp-fs'));
  let leak = 0; for (let i = 0; i < 25; i++) { await pg.keyboard.press('Tab'); await wait(40); leak += await pg.evaluate(() => { const a = document.activeElement, box = document.getElementById('mp_production'); if (!a || a === document.body || box.contains(a)) return 0; let e = a; while (e && e !== document.body) { if (getComputedStyle(e).position === 'fixed') return 0; e = e.parentElement; } return 1; }); }
  ok(`② ${row} — 전체화면이 떴고(${fsOn}) Tab 25번 중 뒤 본문으로 나간 횟수 0 (지금 ${leak})`, fsOn && leak === 0);
  await pg.locator('#mp_production button:has-text("나가기")').first().click({ timeout: 3000 }).catch(() => {}); await wait(900);
  const m = await pg.evaluate(() => { const m = document.getElementById('mpModal'); return !!(m && m.classList.contains('open')); });
  if (m) { await pg.locator('#mpModal button', { hasText: '그냥 나가기' }).first().click({ timeout: 3000 }).catch(() => {}); await wait(900); }
  const left = await pg.evaluate(() => ({ fs: !!document.querySelector('#mp_production.mp-fs'), main: !![...document.querySelectorAll('#mypageView [inert], #mypageView')].find((e) => e.inert && !e.classList.contains('meseq-ov')) }));
  ok(`② ${row} — «나가기»로 닫으면 전체화면이 내려가고 본문 막음이 풀린다`, !left.fs && !left.main);
  await ctx.close();
}
await br.close(); srv.close();
console.log(fail ? `\nPROD_FS_INERT FAIL ${fail}` : '\nPROD_FS_INERT OK'); process.exit(fail ? 1 : 0);
