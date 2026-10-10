// ★[R7_PUBLIC · ON_AIR_WINDOW · CAN_KAKAO_WAY · CAN_ACCT_ONE · SAMPLE_DATE_2027 2026-10-09 고객 여정 A~Z 점검 2라운드 D2-10 ~ D2-12] 공개 화면 셋.
//   ① 라이브(live.html) «● ON AIR»는 영상이 붙어 있고 본식 시각(KST) 30분 전 ~ 3시간 뒤일 때만 — 사흘 전 · 두 달 뒤 다시보기 · 날짜 모름 · 영상 없음은 끈다
//   ② 예약 취소(cancel.html) — 못 찾음은 제목 · 할 일 · (코드 B0) · 카카오톡(다시 불러오기 없음) · 계좌 안내는 칸 아래 한 곳 · 기한 거절의 «카카오톡»은 링크
//   ③ SEO 청첩장 견본 8장(i/invitations/invitation-01 ~ 08) — 날짜는 2027-10-23(토) · 시각은 13:40(그 장의 표기) · 옛 2026-03-05 · 14:00 · 오후 2시 없음 · 달력 표시 칸은 23
//   R7P_ROOT=<다른 폴더> 로 돌리면 그 판을 잰다. 종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import fs from 'node:fs'; import path from 'node:path'; import http from 'node:http'; import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ROOT = process.env.R7P_ROOT || path.join(path.dirname(new URL(import.meta.url).pathname), '..', '..');
let fail = 0; const ok = (m, c, d) => { console.log(`${c ? 'ok  ' : 'FAIL'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };

// ③ 견본 날짜(브라우저 없이)
{ const dir = path.join(ROOT, 'i', 'invitations');
  const files = fs.existsSync(dir) ? fs.readdirSync(dir).filter((x) => /^invitation-0[1-8]-.*\.html$/.test(x)).sort() : [];
  ok('③ 견본이 8장이다(셀 수 있어야 아래 검사가 뜻이 있다)', files.length === 8, files.join(','));
  for (const f of files) {
    const raw = fs.readFileSync(path.join(dir, f), 'utf8');
    const t = raw.replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<!--[\s\S]*?-->/g, ' ').replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ').replace(/&middot;/g, '·').replace(/&amp;/g, '&').replace(/\s+/g, ' ');
    const hasDate = /2027\s*[.·\-\/]\s*10\s*[.·\-\/]\s*23|10월\s*23일/.test(t);
    const hasTime = /13:40|오후\s*1:40|1:40\s*PM|오후\s*(1|한)\s*시\s*40\s*분/i.test(t);
    const bad = (t.match(/2026\s*[.·\-\/]\s*0?3\s*[.·\-\/]\s*0?5|3월\s*5일|\b14:00\b|오후\s*2:00|\b2:00\s*PM|오후\s*(2|두)\s*시(?!\s*\d)|\bMarch\b|Thursday|목요일/gi) || []).concat(/2026-03-05/.test(raw) ? ['2026-03-05(소스)'] : []);
    const marks = [...raw.matchAll(/class="[^"]*\bmarked\b[^"]*"[^>]*>\s*(?:<span>)?\s*(\d{1,2})/g)].map((m) => m[1]);
    ok(`③ ${f} — 2027-10-23 · 13:40 · 옛 날짜 · 시각 없음 · 달력 표시 23 [SAMPLE_DATE_2027]`, hasDate && hasTime && !bad.length && marks.every((n) => n === '23'),
      JSON.stringify({ hasDate, hasTime, bad: [...new Set(bad)].slice(0, 4), marks }));
  }
}

let pw = null; for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { pw = require(p); break; } catch {} }
if (!pw) { console.log('못 쟀다 — playwright 없음 (① ② 건너뜀)'); console.log(fail ? `\nR7 PUBLIC FAIL ${fail}` : '\nR7 PUBLIC 건너뜀'); process.exit(fail ? 1 : 2); }
const T = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.json': 'application/json', '.woff2': 'font/woff2' };
const srv = http.createServer((q, r) => { const p = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); if (!p.startsWith(ROOT)) { r.writeHead(404); return r.end(); }
  fs.readFile(p, (e, b) => { if (e) { r.writeHead(404); r.end(); return; } r.writeHead(200, { 'Content-Type': T[path.extname(p)] || 'application/octet-stream' }); r.end(b); }); });
await new Promise((r) => srv.listen(0, '127.0.0.1', r)); const BASE = 'http://127.0.0.1:' + srv.address().port;
const br = await pw.chromium.launch(); const wait = (ms) => new Promise((r) => setTimeout(r, ms));
async function open(url, gas, w = 390) {
  const ctx = await br.newContext({ viewport: { width: w, height: 844 } });
  await ctx.addInitScript('window.__ME_PREVIEW_GUARD_TEST_OFF = true;');
  const calls = [];
  await ctx.route('**/*', async (rt) => { const u = rt.request().url();
    if (u.includes('script.google.com') || u.includes('script.googleusercontent.com')) { let b = {}; try { b = JSON.parse(rt.request().postData() || '{}'); } catch {}
      calls.push(b.action || new URL(u).searchParams.get('action') || u);
      return rt.fulfill({ status: 200, headers: { 'Access-Control-Allow-Origin': '*', 'Content-Type': 'application/json' }, body: JSON.stringify(gas(b.action || '', u)) }); }
    if (u.startsWith(BASE)) return rt.continue();
    return rt.fulfill({ status: 200, body: '' }); });
  const page = await ctx.newPage(); const errs = []; page.on('pageerror', (e) => errs.push(e.message));
  await page.goto(BASE + url, { waitUntil: 'load' });
  return { ctx, page, errs, calls };
}
const pad = (n) => (n < 10 ? '0' : '') + n;
const kst = (ms) => { const k = new Date(ms + 9 * 3600 * 1000); return { date: k.getUTCFullYear() + '-' + pad(k.getUTCMonth() + 1) + '-' + pad(k.getUTCDate()), time: pad(k.getUTCHours()) + ':' + pad(k.getUTCMinutes()) }; };
const dayOff = (k) => kst(Date.now() + k * 86400000).date;
try {
  // ① 라이브 ON AIR
  const mk = (date, time, vid) => ({ groomName: '김도현', brideName: '정하윤', groomNameEn: 'Kim Do Hyun', brideNameEn: 'Jeong Ha Yoon', weddingDate: date, weddingTime: time, vimeoId: vid, vimeoHash: '', accountLive: 'N' });
  const SLOT_KEYS = ['09:00', '12:20', '15:40', '10:00', '13:20', '16:40'];   // live.html SLOT_CLOCK 열쇠 — 이 시각은 실제 본식 시각으로 바뀐다(예: 12:20 → 13:40)
  let soon = kst(Date.now() + 10 * 60000); if (SLOT_KEYS.includes(soon.time)) soon = kst(Date.now() + 12 * 60000);
  const mid = kst(Date.now() - 2 * 3600000);   // 슬롯 열쇠에 걸려도 본식이 20 ~ 80분 뒤로 갈 뿐이라 «3시간 안»은 그대로다
  const cases = [
    ['10분 뒤 본식 · 영상 있음', mk(soon.date, soon.time, '123456789'), true],
    ['2시간 전 시작 · 영상 있음', mk(mid.date, mid.time, '123456789'), true],
    ['사흘 뒤 본식 · 영상 있음', mk(dayOff(3), '12:20', '123456789'), false],
    ['두 달 전 본식 · 다시보기', mk(dayOff(-60), '12:20', '123456789'), false],
    ['날짜 모름 · 영상 있음', mk('', '', '123456789'), false],
    ['10분 뒤 본식 · 영상 없음', mk(soon.date, soon.time, ''), false],
  ];
  for (const [name, c, want] of cases) {
    const o = await open('/live.html?e=kim-jeong-0417', (a, u) => (/getCouple/.test(u) ? { ok: true, couple: c } : { ok: true }));
    // 영상이 있으면 붙을 때까지 · 없으면 예식 정보가 들어올 때까지(옛 판은 __liveAt 이 없어 끝까지 기다린 뒤 잰다) — 부하가 큰 CI 에서도 같은 판정
    await o.page.waitForFunction((v) => (v ? !!document.querySelector('#playerFrame iframe') : window.__liveAt !== undefined), c.vimeoId, { timeout: 8000 }).catch(() => {});
    await wait(400);
    const r = await o.page.evaluate(() => { const els = [...document.querySelectorAll('.on-air')]; return { n: els.length, live: els.filter((e) => e.classList.contains('is-live')).length, player: !!document.querySelector('#playerFrame iframe') }; });
    ok(`① 라이브 «${name}» → ON AIR ${want ? '켬' : '끔'} [ON_AIR_WINDOW]`, r.n > 0 && (want ? r.live === r.n : r.live === 0), JSON.stringify(r));
    if (o.errs.length) ok(`pageerror 0 (① ${name})`, false, o.errs[0].slice(0, 140));
    await o.ctx.close();
  }
  // ② 예약 취소
  const info = { ok: true, state: 'ok', names: '김민수 · 정하윤', date: '2026년 10월 14일 (수)', time: '14:00', deadlineLabel: '24시간', kakao: 'https://pf.kakao.com/_x' };
  { const o = await open('/cancel.html?token=abc&sig=def', (a) => (a === 'emailCancelInfo' ? { ok: false, error: '예약 정보를 찾을 수 없어요.' } : { ok: true }));
    await o.page.waitForSelector('#card .title', { timeout: 8000 }).catch(() => {}); await wait(200);
    const r = await o.page.evaluate(() => ({ title: (document.querySelector('#card .title') || {}).textContent || '', text: document.getElementById('card').textContent, kakao: !!document.querySelector('#card a.kakao[href*="kakao"]'), again: !!document.getElementById('again') }));
    ok('② 취소 «예약을 못 찾음» → «예약을 찾을 수 없어요» · 할 일 + (코드 B0) · 카카오톡 링크 · 다시 불러오기 없음 [CAN_KAKAO_WAY]', r.title === '예약을 찾을 수 없어요' && /마이페이지에서 예약을 확인해\s*주세요 \(코드 B0\)/.test(r.text) && r.kakao && !r.again, JSON.stringify(r));
    if (o.errs.length) ok('pageerror 0 (② 못 찾음)', false, o.errs[0].slice(0, 140)); await o.ctx.close(); }
  { const o = await open('/cancel.html?token=abc&sig=def', (a) => (a === 'emailCancelInfo' ? info : a === 'emailCancel' ? { ok: false, error: '온라인 취소 기한(상담 24시간 전)이 지났어요. 카카오톡으로 문의해 주세요.' } : { ok: true }));
    await o.page.waitForSelector('#go', { timeout: 8000 }).catch(() => {}); await wait(200);
    const r = await o.page.evaluate(() => ({ acct: [...document.querySelectorAll('#card .note')].filter((n) => /계좌/.test(n.textContent)).length, when: /영업일 기준 수일/.test(document.getElementById('card').textContent) }));
    ok('② 취소 화면 — 환불 계좌 안내는 칸 아래 한 곳(환불 시기 포함) [CAN_ACCT_ONE]', r.acct === 1 && r.when, JSON.stringify(r));
    await o.page.click('#go');
    await o.page.waitForFunction(() => !document.getElementById('go'), null, { timeout: 8000 }).catch(() => {}); await wait(200);
    const r2 = await o.page.evaluate(() => { const a = document.querySelector('#card .desc a.kakao'); return { title: (document.querySelector('#card .title') || {}).textContent || '', link: a ? a.textContent : '', n: (document.getElementById('card').textContent.match(/카카오톡/g) || []).length }; });
    ok('② 기한이 지나 거절 → 글 속 «카카오톡»이 링크 · 같은 말을 두 번 하지 않는다 [CAN_KAKAO_WAY]', r2.title === '취소를 완료하지 못했어요' && r2.link === '카카오톡' && r2.n === 1, JSON.stringify(r2));
    if (o.errs.length) ok('pageerror 0 (② 취소 화면)', false, o.errs[0].slice(0, 140)); await o.ctx.close(); }
} catch (e) { console.log('FAIL 예외', e && e.message); fail++; }
finally { await br.close(); srv.close(); }
console.log(fail ? `\nR7 PUBLIC FAIL ${fail}` : '\nR7 PUBLIC OK'); process.exit(fail ? 1 : 0);
