/* 사이트 전환 실측 — 청첩장·가족·라이브가 «본 GAS»로 부르고, 하객 편지가 action:'guestLetter' 를 달고 가는가  [LETTER_SWITCH_E2E]
 *   node scripts/audit/letter-switch.mjs      (브라우저가 없으면 종료 2 — 통과가 아니라 안 본 것)
 *
 * ★왜 — 2026-09-25 옛 Letter System 웹훅을 본 GAS(87_letter)로 합치며 사이트 주소를 바꿨다.
 *   본 GAS doPost 는 action 이 없는 POST 를 «상담 신청»으로 받는다 — 편지에서 이름표가 빠지면 편지가 상담 신청이 된다.
 *   문자열 검사(merge-guard)만으로는 «실제로 그 주소로, 그 모양으로 나가는지»를 모른다. 그래서 브라우저로 연다.
 *   GAS 응답은 letter-golden.json(= 새 코드 응답 · letter-sim 이 136항목 대조)으로 채운다. 깨 보고 믿었다 —
 *   live.html 에서 action 줄을 지우면 이 검사가 빨강이 된다.
 */
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
import { fileURLToPath } from 'node:url';
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
let pw = null;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('· 못 봄(브라우저 없음) — letter-switch 는 재지 않았다'); process.exit(2); }
const MAIN = 'AKfycbyR3n9MrPJNQfBDPDocq4VeUd8y78TtyrMTZ3a3g_eOmYwOIc6im5yXo3z1pJv7QgSBEQ';
const G = JSON.parse(fs.readFileSync(path.join(ROOT, 'scripts/audit/letter-golden.json'), 'utf8'));
// letter-sim 의 getCouple 경우 목록과 같은 순서로 기준값을 찾는다(새 코드 응답 = 기준값 · 136항목 대조로 확인됨)
const CASES = [];
for (const id of ['aa-bb-1024', 'cc-dd-0612-x7k2mq', 'ee-ff-0101', 'test-couple', 'zz-zz-0000', '', 'INVALID ID!', 'ab', 'pg-old-1201'])
  for (const view of ['', 'online', 'family', 'live', 'LIVE']) for (const fresh of ['', '1']) CASES.push({ id, view, fresh });
const answer = (id, view, fresh) => G.couple[CASES.findIndex((c) => c.id === id && c.view === view && c.fresh === fresh)];
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => {
  const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0]));
  if (!(f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile())) { r.statusCode = 404; return r.end('nf'); }
  r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(fs.readFileSync(f));
});
await new Promise((r) => srv.listen(0, '127.0.0.1', r));
const PORT = srv.address().port;
let browser = null;
try { browser = await pw.chromium.launch(); } catch (e) { console.log('· 못 봄(브라우저 실행 실패) — ' + e.message.split('\n')[0]); srv.close(); process.exit(2); }
let bad = 0; const say = (ok, m) => { if (!ok) bad++; console.log((ok ? 'OK  ' : '✖   ') + m); };

async function open(url, extra) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 } });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  const page = await ctx.newPage();
  const gas = [];
  await page.route('https://script.google.com/**', async (route) => {
    const req = route.request(); const u = new URL(req.url());
    gas.push({ method: req.method(), url: req.url(), body: req.postData() });
    if (req.method() === 'GET' && u.searchParams.get('action') === 'getCouple') {
      const a = answer(u.searchParams.get('eventId'), u.searchParams.get('view') || '', u.searchParams.get('fresh') || '');
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(a || { ok: false, error: 'COUPLE_NOT_FOUND' }) });
    }
    if (req.method() === 'POST') {
      let b = {}; try { b = JSON.parse(req.postData() || '{}'); } catch {}
      if (b.action === 'guestLetter') return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true, delivered: true }) });
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ ok: true }) });   // guideView 등 다른 호출
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{"ok":false}' });
  });
  await page.route(/(fonts\.googleapis|fonts\.gstatic|vimeo|kakao|googletagmanager|google-analytics)/, (r) => r.abort());
  await page.goto(`http://127.0.0.1:${PORT}${url}`, { waitUntil: 'load' });
  await page.waitForTimeout(1500);
  if (extra) await extra(page, gas);
  const text = await page.evaluate(() => document.body.innerText);
  await ctx.close();
  return { gas, text };
}

for (const [pg, view] of [['/i/cover-05.html?e=aa-bb-1024', 'online'], ['/i-family/family-01.html?e=aa-bb-1024', 'family']]) {
  const { gas, text } = await open(pg);
  const g = gas.find((x) => /action=getCouple/.test(x.url));
  say(!!g && g.url.includes(MAIN) && g.url.includes('eventId=aa-bb-1024') && g.url.includes('view=' + view), `${pg} → 본 GAS 로 getCouple(view=${view}) ${g ? '' : '— 호출 없음'}`);
  say(!gas.some((x) => x.url.includes('AKfycbwW')), `${pg} → 옛 웹훅 호출 0건`);
  say(/가나/.test(text) && /다라/.test(text), `${pg} → 응답의 신랑·신부 이름이 화면에 그려짐`);
}
{
  const { gas, text } = await open('/live.html?e=aa-bb-1024', async (page, gas) => {
    await page.evaluate(() => { const f = document.getElementById('letterForm'); if (f) f.scrollIntoView(); });
    await page.fill('#lfGuestName', '시험 하객');
    await page.fill('#lfMessage', '축하드려요. 전환 시험 편지입니다.');
    await page.click('#lfSubmit');
    await page.waitForTimeout(1500);
  });
  const g = gas.find((x) => /action=getCouple/.test(x.url));
  say(!!g && g.url.includes(MAIN) && g.url.includes('view=live'), 'live.html → 본 GAS 로 getCouple(view=live)');
  const post = gas.find((x) => x.method === 'POST' && x.url.includes(MAIN) && /guestLetter/.test(x.body || ''));
  let body = {}; try { body = JSON.parse(post ? post.body : '{}'); } catch {}
  say(!!post && body.action === 'guestLetter' && body.eventId === 'aa-bb-1024' && body.guestName === '시험 하객', "live.html 편지 → 본 GAS 로 POST · action:'guestLetter' · eventId·이름 그대로");
  say(!gas.some((x) => x.url.includes('AKfycbwW')), 'live.html → 옛 웹훅 호출 0건');
  say(/시험 하객/.test(text), 'live.html → 서버가 ok 를 말하자 «전해졌다» 화면에 하객 이름');
}
await browser.close(); srv.close();
console.log(bad ? `[LETTER_SWITCH_E2E] ✖ ${bad}건` : '[LETTER_SWITCH_E2E] ✅ 청첩장·가족·라이브가 본 GAS 로 부르고, 편지가 이름표를 달고 간다');
process.exit(bad ? 1 : 0);
