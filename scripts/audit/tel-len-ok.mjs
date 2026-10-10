// ★[TEL_LEN_OK · TEL_INTL_KEEP · INPUT_CLEAN · NUM_BAD_FIRST 2026-10-09 고객 여정 A~Z 점검 2라운드 D2-4 · D2-5] 문의서(inquiry.html) 입력 칸.
//   ① 화면 판정 meTelOk(shared/tel-kr.js) — 숫자 «개수»로: 010 = 11 · 011 · 016 ~ 019 = 10 ~ 11 · 02 = 9 ~ 10 · 그 밖 지역번호 10 ~ 11 · +82 는 0 으로 바꾼 뒤 같은 기준 ·
//      그 밖 «+» 국제 번호는 숫자 8 ~ 15(서버 받침과 같다) · 0 으로도 «+» 로도 시작하지 않으면 거절. 종전엔 «010-1234-5»(8자리)가 통과했다
//   ② 칸 포맷터 — «+» 국제 번호(+82 아닌 것)는 하이픈을 넣지 않고 «+» 를 지킨다 · 덜 쓴 «+82 …»는 남의 번호(821-0…)로 바뀌지 않는다 · 칸에 온전한지를 건다
//   ③ 실렌더 — 8자리 번호는 그 칸에서 «연락처를 끝까지 적어 주세요» · 빈칸만 적은 이름은 그 칸에서 «신랑 이름을 적어 주세요» · 폭 0 글자(붙여넣기)는 지워진다 ·
//      인원 칸 «2-3»은 «숫자 하나로 적어 주세요» · «+1 415 555 0100»은 «+» 째로 보낸다
//   ★이름 칸 최대 글자 수(D2-5 ③)는 화면 다듬기라 넣지 않았다(2026-10-10 사장님 «화면 디자인까지 바꿀 필요는 없어 · 버그 오류만»)
//   TLO_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다(되돌리면 빨강 확인용). 종료 코드 0 = 통과 · 1 = 실패(판정 함수가 없어도 실패) · 2 = 재지 못함(파일 없음)
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.TLO_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
const read = (r) => { try { return fs.readFileSync(path.join(ROOT, r), 'utf8'); } catch (e) { return null; } };
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const telSrc = read('shared/tel-kr.js'), inq = read('inquiry.html');
if (!telSrc || !inq) { console.log('못 쟀다 — shared/tel-kr.js · inquiry.html 이 없습니다'); process.exit(2); }
const w = {}; vm.runInNewContext(telSrc, { window: w });

// ── ① 판정 함수
const OK = w.meTelOk;
ok('① window.meTelOk 가 있다(shared/tel-kr.js) [TEL_LEN_OK]', typeof OK === 'function');
if (typeof OK === 'function') {
  const V = [
    ['01012345', false], ['010-1234-5', false], ['010123456', false], ['0101234567', false], ['01012345678', true], ['010-1234-5678', true], ['010123456789', false],
    ['0111234567', true], ['01112345678', true], ['011123456', false], ['0161234567', true], ['01912345678', true],
    ['021234567', true], ['0212345678', true], ['02123456', false], ['02123456789', false],
    ['0311234567', true], ['03112345678', true], ['031123456', false], ['07012345678', true],
    ['15881234', false], ['1588-1234', false],
    ['+82 10-1234-5678', true], ['+82 10-1234-567', false], ['+821012345678', true], ['0082 10 1234 5678', true], ['82-10-1234-5678', true], ['+82 2-123-4567', true],
    ['+1 415 555 0100', true], ['+44 20 7946 0958', true], ['+1 4155', false], ['+123456789012345678', false], ['', false],
  ];
  const bad = V.filter(([v, want]) => OK(v) !== want).map(([v, want]) => `«${v}» → ${OK(v)} · 기대 ${want}`);
  ok(`① 표본 ${V.length}개 — 010 = 11 · 011 · 016 ~ 019 = 10 ~ 11 · 02 = 9 ~ 10 · 그 밖 10 ~ 11 · +82 → 0 · 그 밖 «+» 8 ~ 15`, !bad.length, bad.slice(0, 4).join(' | '));
}

// ── ② 칸 포맷터(본문을 그대로 돌린다 · tel-autofill 과 같은 수)
const body = (inq.match(/phoneInput\.addEventListener\('input', \(e\) => \{([\s\S]*?)\n\}\);/) || [])[1];
if (!body) { ok('② 문의서 연락처 포맷터를 찾았다', false, '구조가 바뀌었으면 이 점검을 고칠 것'); }
else {
  const run = (val, field) => { const f = field || { value: val }; f.value = val; new Function('e', 'window', 'meTelDigits', body)({ target: f }, { meTelDigits: w.meTelDigits, meTelOk: w.meTelOk }, w.meTelDigits); return f; };
  const typed = (s) => { let f = { value: '', cv: null, setCustomValidity(m) { this.cv = m; } }; for (const ch of s) { f = run(f.value + ch, f); } return f; };
  const a = typed('+1 415 555 0100'), b = typed('+44 20 7946 0958'), c = run('+1 (415) 555-0100'), d = typed('+82 10-7349-7706'), e = typed('+82 10-7349-770');
  ok('② «+1 415 555 0100»을 한 자씩 쳐도 «+» 째 그대로 · 하이픈을 넣지 않는다 [TEL_INTL_KEEP]', a.value === '+1 415 555 0100' && b.value === '+44 20 7946 0958', JSON.stringify([a.value, b.value]));
  ok('② 국제 번호에 붙은 괄호 · 글자만 걷는다(«+1 (415) 555-0100» → «+1 415 555-0100»)', c.value === '+1 415 555-0100', c.value);
  ok('② «+82 10-7349-7706»은 끝까지 치면 010-7349-7706 · 덜 쓴 «+82 10-7349-770»은 남의 번호(821-0…)로 바뀌지 않는다', d.value === '010-7349-7706' && e.value === '+82 10-7349-770', JSON.stringify([d.value, e.value]));
  const f8 = typed('01012345'), f11 = typed('01012345678');
  ok('② 칠 때 칸에 온전한지를 건다 — «010-1234-5» → «연락처를 끝까지 적어 주세요» · 11자리 → 비움 [TEL_LEN_OK]', f8.value === '010-1234-5' && f8.cv === '연락처를 끝까지 적어 주세요' && f11.value === '010-1234-5678' && f11.cv === '', JSON.stringify([f8.value, f8.cv, f11.value, f11.cv]));
}

// ── ③ 실렌더
let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('skip ③ 실렌더 — playwright 없음'); }
else {
  const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.json': 'application/json' };
  const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT)) { r.writeHead(404); return r.end(); }
    fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
  await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
  const br = await pw.chromium.launch();
  try {
    const ctx = await br.newContext({ viewport: { width: 390, height: 844 } });
    await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
    await ctx.route('**/*', (rt) => (rt.request().url().startsWith(BASE) ? rt.continue() : rt.fulfill({ status: 200, body: '' })));
    const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
    await page.goto(BASE + '/inquiry.html', { waitUntil: 'load' }); await page.waitForTimeout(400);
    const why = async (id) => page.evaluate((id) => { validateForm(); const m = document.getElementById('gerr_' + id); return m ? m.textContent : ''; }, id).then(async (t) => { await page.waitForTimeout(80); return page.evaluate((id) => { const m = document.getElementById('gerr_' + id); return m ? m.textContent : ''; }, id); });
    // 앞 칸을 바르게 채워 두고 한 칸씩 잰다
    const base = async () => { await page.fill('#groom', '김민수'); await page.fill('#bride', '정하윤'); await page.fill('#email', 'a@gmail.com'); await page.fill('#phone', ''); await page.type('#phone', '01012345678'); };
    await base(); await page.fill('#phone', ''); await page.type('#phone', '01012345');
    const w8 = await why('phone'), v8 = await page.evaluate(() => document.getElementById('phone').checkValidity());
    ok('③ 연락처 8자리 «010-1234-5» → 칸이 막히고 그 칸에서 «연락처를 끝까지 적어 주세요» [TEL_LEN_OK]', v8 === false && w8 === '연락처를 끝까지 적어 주세요', JSON.stringify([v8, w8]));
    await page.fill('#phone', ''); await page.type('#phone', '01012345678');
    const v11 = await page.evaluate(() => document.getElementById('phone').checkValidity());
    ok('③ 11자리 010 은 지난다', v11 === true);
    await page.fill('#phone', ''); await page.type('#phone', '+1 415 555 0100');
    const intl = await page.evaluate(() => ({ v: document.getElementById('phone').value, ok: document.getElementById('phone').checkValidity(), p: (typeof buildPayload === 'function') ? buildPayload().phone : null }));
    ok('③ «+1 415 555 0100»은 «+» 째 칸에 남고 · 지나고 · 보낼 때도 그대로 [TEL_INTL_KEEP]', intl.v === '+1 415 555 0100' && intl.ok && intl.p === '+1 415 555 0100', JSON.stringify(intl));
    await base(); await page.fill('#groom', '   ');
    const wg = await why('groom'), gv = await page.inputValue('#groom');
    ok('③ 빈칸만 적은 신랑 이름 → 그 칸에서 «신랑 이름을 적어 주세요» [INPUT_CLEAN]', wg === '신랑 이름을 적어 주세요' && gv === '', JSON.stringify([wg, gv]));
    await base(); await page.fill('#groom', ''); await page.focus('#groom');
    const cdp = await ctx.newCDPSession(page); await cdp.send('Input.insertText', { text: '김​민수' }); await page.waitForTimeout(60);
    await page.fill('#email', ''); await page.focus('#email'); await cdp.send('Input.insertText', { text: '​abc@gmail.com' }); await page.waitForTimeout(60);
    const zw = await page.evaluate(() => { const r = { g: document.getElementById('groom').value, e: document.getElementById('email').value }; validateForm(); r.eOk = document.getElementById('email').checkValidity(); r.gerrE = (document.getElementById('gerr_email') || {}).textContent || ''; r.pay = (typeof buildPayload === 'function') ? [buildPayload().groom, buildPayload().email] : null; return r; });
    ok('③ 붙여넣은 폭 0 글자는 지운다 — «김​민수» → «김민수» · «​abc@gmail.com»이 «다시 확인해 주세요» 없이 지난다 [INPUT_CLEAN]', zw.g === '김민수' && zw.e === 'abc@gmail.com' && zw.eOk && !zw.gerrE && zw.pay && zw.pay[0] === '김민수' && zw.pay[1] === 'abc@gmail.com', JSON.stringify(zw));
    await page.fill('#guests', ''); await page.focus('#guests'); await page.keyboard.type('2-3');
    const gw = await page.evaluate(() => (typeof _fieldWhy === 'function') ? _fieldWhy(document.getElementById('guests')) : '');
    ok('③ 인원 칸 «2-3» → «숫자 하나로 적어 주세요»(적었는데 «적어 주세요»라 하지 않는다) [NUM_BAD_FIRST]', gw === '숫자 하나로 적어 주세요', gw);
    ok('pageerror 0 (inquiry)', !errs.length, (errs[0] || '').slice(0, 140));
    await ctx.close();
  } catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
  finally { await br.close(); srv.close(); }
}
console.log(fail ? `\nTEL LEN FAIL ${fail}` : '\nTEL LEN OK'); process.exit(fail ? 1 : 0);
