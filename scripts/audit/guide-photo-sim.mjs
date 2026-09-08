#!/usr/bin/env node
/* [GP_SIM] 하객 사진 올리기가 «서버가 무엇을 답하든» 무엇을 말하는가 — 라운드 3 0번
 *
 * 왜 이 검사인가 (2026-09-06 코워크 합의)
 *   하객이 실제로 파일을 올리는 유일한 자리이고, 여는 곳이 예식장이라 회선이 가장 나쁘다.
 *   ★그리고 여기서 위험한 건 «완전 실패»가 아니라 «부분 성공»이다 —
 *     완전히 실패하면 다시 하지만, 부분 성공은 성공으로 보이고 끝난다.
 *     실제로 그 사고가 있었다([GP_OVER_PICK] 2026-08-22: 35장을 골랐는데 30장만 가고
 *     「30장 전해졌어요」로 끝났다). 그 처리가 지금도 도는지가 이 검사의 핵심이다.
 *
 * ★실제 업로드는 나가지 않는다. script.google.com 을 전부 가로채 시나리오별 응답을 준다.
 *   보낸 요청 수를 세어 «몇 장이 실제로 시도됐는지»도 함께 본다.
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음 · 포트 · 표본 파일 없음)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = path.join(ROOT, 'scripts/audit/_shots');
const TMP = path.join(ROOT, 'scripts/audit/_shots/_gp');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.json': 'application/json' };

/* 표본 사진 — 저장소에 안 남긴다(매번 만들고 지운다). 8×8 PNG 라 74바이트다. */
function makePng(p, tint) {
  const w = 8, h = 8;
  const raw = Buffer.concat(Array.from({ length: h }, () =>
    Buffer.concat([Buffer.from([0]), Buffer.concat(Array.from({ length: w }, () => Buffer.from([tint, 180, 150])))])));
  const chunk = (t, d) => { const c = Buffer.concat([Buffer.from(t), d]);
    const len = Buffer.alloc(4); len.writeUInt32BE(d.length);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(zlib.crc32 ? zlib.crc32(c) >>> 0 : crc32(c));
    return Buffer.concat([len, c, crc]); };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8; ihdr[9] = 2;
  fs.writeFileSync(p, Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]));
}
function crc32(buf) { let c, crc = 0xffffffff;
  for (let n = 0; n < buf.length; n++) { c = (crc ^ buf[n]) & 0xff;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crc = (crc >>> 8) ^ c; } return (crc ^ 0xffffffff) >>> 0; }

fs.mkdirSync(TMP, { recursive: true });
const FILES = [];
for (let i = 1; i <= 35; i++) { const p = path.join(TMP, `p${String(i).padStart(2, '0')}.png`); makePng(p, 200 - i * 3); FILES.push(p); }

const PORT = await freePort();
const srv = http.createServer((req, res) => {
  const f = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
  if (f.startsWith(ROOT) && fs.existsSync(f) && fs.statSync(f).isFile()) {
    res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream');
    res.end(fs.readFileSync(f));
  } else { res.statusCode = 404; res.end('nf'); }
});
await new Promise((r, j) => { srv.on('error', j); srv.listen(PORT, '127.0.0.1', r); })
  .catch((e) => { console.log('· 못 봄(포트 · ' + String(e && e.code || e) + ')'); process.exit(2); });

const eng = await launchBrowser();
if (!eng) { console.log('· 못 봄(브라우저 없음) — 이 자리에선 재지 않는다.'); srv.close(); process.exit(2); }
fs.mkdirSync(SHOTS, { recursive: true });

const OK = '{"ok":true}';
const SCREEN = `(() => {
  const vis = (e) => { if (!e) return false; const c = getComputedStyle(e); const b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 1 && b.height > 1; };
  /* innerText 로 읽는다 — textContent 는 <br> 을 무시해 「전해졌어요남은 5장」처럼 붙어 보인다.
     화면엔 줄이 나뉘어 있는데 로그만 붙어 보이면, 없는 문구 결함을 쫓게 된다. */
  const t = (e) => e ? ((e.innerText != null ? e.innerText : e.textContent) || '').replace(/\\s+/g, ' ').trim() : null;
  const st = document.getElementById('gpStat');
  const pick = document.getElementById('gpPick');
  /* ★시트는 #dtipOv 다(sheetEnsure 가 만든다). .k=꼬리표 · .h=본문 · .d=부제.
     첫 판에서 .sheet 로 찾다가 «성공 시트가 안 떴다»는 오탐을 냈다 — 이름을 코드에서 확인해야 한다. */
  const wrap = document.getElementById('dtipOv');
  const main = wrap ? wrap.querySelector('.h') : null;
  const sub = wrap ? wrap.querySelector('.d') : null;
  const px = (e) => e ? parseFloat(getComputedStyle(e).fontSize) : null;
  return {
    줄:  vis(st) ? t(st) : null,
    줄색: vis(st) ? getComputedStyle(st).color : null,
    줄크기: vis(st) ? px(st) : null,
    다시시도: !!document.getElementById('gpRetry'),
    이어보내기: !!document.getElementById('gpRest'),
    버튼: pick ? t(pick) : null,
    버튼잠김: pick ? pick.classList.contains('ps-btn-off') : null,
    시트: wrap && vis(wrap) ? { 본문: t(main), 본문크기: px(main), 부제: t(sub), 부제크기: px(sub) } : null,
  };
})()`;

/* ★[GP_SIM_NOT_DEMO] ?g=demo 로는 못 잰다 — 표본 화면은 «업로더를 배선하지 않는다».
   guide.html 에 그렇게 적혀 있다: if(!DEMO) bindGuestUpload();
   첫 판에서 이걸 모르고 demo 로 재서 «요청 0건 · 위반 11건»이 나왔다. 제품이 아니라 하네스가 틀렸다.
   그래서 진짜 토큰 경로(?g=<아무 토큰>)로 열고, boot 의 guideView 응답을 우리가 심는다.
   그러면 DEMO=false 라 업로더가 배선되고, 그 뒤 guestPhoto 요청을 시나리오별로 받는다. */
const GUIDE = JSON.stringify({ ok: true, guide: {
  groom: '이서준', bride: '정하윤', date: '2027-12-17',
  seatToken: 'x', seatFull: false,
  dining: { on: true, pick: '라 트라토리아', rtime: '12:30', rname: '이서준', restos: [], spots: [] },
  photoShare: ''          // 비우면 «우리 업로드» 화면이 뜬다(지금의 기본값)
} });

/* 결과 줄(gpStat)은 버튼 «아래»에 붙어, 고정 clip 으로 찍으면 정작 볼 것이 잘려 나간다.
   사람이 보라고 남기는 그림이니 그 구역을 화면 가운데로 옮기고 찍는다. */
const center = async (page) => {
  await page.evaluate(() => { const p = document.getElementById('gpPick'); if (p) p.scrollIntoView({ block: 'center' }); });
  await page.waitForTimeout(250);
};

async function run(name, { count, handler, midShot = 0, clickRest = false }) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  let hits = 0;
  await page.route('**://script.google.com/**', async (route) => {
    let body = '';
    try { body = route.request().postData() || ''; } catch (_e) {}
    if (body.includes('guideView')) {      // 화면을 그리는 요청 — 늘 같은 값을 준다
      return route.fulfill({ status: 200, contentType: 'application/json',
        headers: { 'Access-Control-Allow-Origin': '*' }, body: GUIDE });
    }
    hits++; await handler(route, hits);    // guestPhoto 요청만 시나리오가 받는다
  });
  await page.goto(`http://localhost:${PORT}/guide.html?g=t_sim`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(1200);
  const ok = await page.evaluate(() => { const p = document.getElementById('gpPick');
    if (!p) return false; p.scrollIntoView({ block: 'center' }); return true; });
  if (!ok) { await page.close(); return { name, err: '사진 올리기 버튼을 못 찾았다(demo 에 이 구역이 없다)' }; }
  await page.setInputFiles('#gpFile', FILES.slice(0, count));
  let mid = null;
  if (midShot) { await page.waitForTimeout(midShot);
    mid = await page.evaluate(SCREEN);
    await center(page);
    await page.screenshot({ path: path.join(SHOTS, `gp-${name}-mid.png`) }); }
  await page.waitForFunction(() => !window.__gpBusy, null, { timeout: 40000 }).catch(() => {});
  await page.waitForTimeout(700);
  const after = await page.evaluate(SCREEN);
  await center(page);
  await page.screenshot({ path: path.join(SHOTS, `gp-${name}.png`) });

  /* [GP_OVER_KEEP] 넘친 사진을 «다시 고르지 않고» 이어 보낼 수 있는가 —
     버튼을 «실제로 눌러» 요청이 더 나가는지까지 본다. 있다고만 보면 죽은 버튼도 통과한다.
     ★파일을 다시 고르지 않는다는 것이 요점이다. setInputFiles 를 다시 부르지 않는다. */
  const 첫판 = hits;        // ★캡 검사는 여기까지다 — 아래 이어보내기를 더하면 30이 35로 보인다
  let 이어 = null;
  if (clickRest && after.이어보내기) {
    const before = hits;
    await page.click('#gpRest');
    await page.waitForFunction(() => !window.__gpBusy, null, { timeout: 40000 }).catch(() => {});
    await page.waitForTimeout(700);
    이어 = { 더보낸수: hits - before, ...(await page.evaluate(SCREEN)) };
    await center(page);
    await page.screenshot({ path: path.join(SHOTS, `gp-${name}-이어.png`) });
  }
  await page.close();
  return { name, 요청수: 첫판, 총요청: hits, mid, 이어, ...after };
}

const J = (body, delay = 0) => async (route) => {
  if (delay) await new Promise((r) => setTimeout(r, delay));
  await route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' }, body });
};

const results = [];
results.push(await run('성공', { count: 3, handler: J(OK) }));
results.push(await run('부분실패', { count: 4, handler: async (route, n) =>
  (n % 2 === 0 ? route.abort('connectionfailed') : J(OK)(route)) }));
results.push(await run('완전실패', { count: 3, handler: (route) => route.abort('connectionfailed') }));
results.push(await run('장수초과', { count: 35, handler: J(OK, 40), midShot: 900, clickRest: true }));
results.push(await run('느린회선', { count: 3, handler: J(OK, 1500), midShot: 1200 }));
results.push(await run('토큰만료', { count: 3, handler: J('{"ok":false,"expired":true,"error":"이 링크는 만료됐어요."}') }));

let bad = 0;
const fail = (m) => { bad++; console.log('   ✗ ' + m); };
const good = (m) => console.log('   ✓ ' + m);

for (const r of results) {
  console.log(`\n══ ${r.name} ══`);
  if (r.err) { fail(r.err); continue; }
  console.log(`   요청 ${r.요청수}건 · 버튼「${r.버튼}」 잠김=${r.버튼잠김}`);
  if (r.줄) console.log(`   인라인: ${r.줄}  (${r.줄크기}px · ${r.줄색})`);
  if (r.시트) console.log(`   시트 본문: ${r.시트.본문} (${r.시트.본문크기}px) · 부제: ${r.시트.부제} (${r.시트.부제크기}px)`);
  if (r.mid) console.log(`   [올리는 중] ${r.mid.줄} · 버튼「${r.mid.버튼}」 잠김=${r.mid.버튼잠김}`);

  if (r.name === '성공') {
    r.요청수 === 3 ? good('3장 전부 시도됐다') : fail(`요청이 ${r.요청수}건`);
    r.시트 ? good('성공은 시트로 알린다') : fail('성공 시트가 안 떴다');
    r.버튼잠김 === false ? good('버튼이 되살아났다') : fail('버튼이 잠긴 채 남았다');
  }
  if (r.name === '부분실패') {
    r.다시시도 ? good('다시 시도 버튼이 있다') : fail('부분 실패인데 다시 시도할 길이 없다');
    /\d+장이 전해지지 않았어요/.test(r.줄 || '') ? good('안 간 장수를 숫자로 말한다')
      : fail('안 간 장수가 숫자로 안 나온다: ' + r.줄);
  }
  if (r.name === '완전실패') {
    r.다시시도 ? good('다시 시도 버튼이 있다') : fail('다시 시도할 길이 없다');
    r.버튼잠김 === false ? good('버튼이 되살아났다') : fail('버튼이 잠긴 채 남았다');
  }
  if (r.name === '장수초과') {
    r.요청수 === 30 ? good('30장까지만 보낸다(캡이 동작한다)') : fail(`캡 30인데 요청이 ${r.요청수}건`);
    /남은 5장/.test((r.시트 && r.시트.부제) || r.줄 || '')
      ? good('남은 5장을 «숫자로» 말한다 — [GP_OVER_PICK] 처리가 살아 있다')
      : fail('잘린 5장을 말하지 않는다 — 조용한 절삭이 되살아났다');
    // [GP_OVER_AHEAD] 끝나고서가 아니라 «올리는 동안»부터 남은 장수를 말하는가
    /남은 5장/.test((r.mid && r.mid.줄) || '')
      ? good('올리는 동안에도 남은 5장을 말한다 — 창을 닫기 전에 안다')
      : fail('올리는 동안엔 남은 장수를 말하지 않는다: ' + (r.mid && r.mid.줄));
    // [GP_OVER_WEIGHT] 끝난 게 아니면 «끝났다는 시트»를 띄우지 않는다
    !r.시트 ? good('넘쳤을 땐 성공 시트를 안 띄운다 — 큰 글씨가 «끝났다»고 말하지 않는다')
      : fail(`넘쳤는데 성공 시트가 떴다: 「${r.시트.본문}」(${r.시트.본문크기}px)`);
    // [GP_OVER_KEEP] 실패와 같은 대접인가 — 다시 고르지 않고 이어 보낼 수 있는가
    r.이어보내기 ? good('「남은 5장 보내기」 버튼이 있다') : fail('넘친 5장을 이어 보낼 길이 없다 — 다시 골라야 한다');
    if (r.이어) {
      console.log(`   [이어보내기] 더 보낸 요청 ${r.이어.더보낸수}건 · 시트「${r.이어.시트 && r.이어.시트.본문}」`);
      r.이어.더보낸수 === 5 ? good('누르니 남은 5장이 «다시 고르지 않고» 나갔다')
        : fail(`이어보내기를 눌렀는데 요청이 ${r.이어.더보낸수}건`);
      r.이어.시트 ? good('이어 보낸 뒤엔 성공 시트가 뜬다 — 이제 진짜로 끝났다')
        : fail('이어 보냈는데 끝났다는 말이 없다');
      !r.이어.이어보내기 ? good('남은 게 없어지면 버튼도 사라진다') : fail('보낼 게 없는데 버튼이 남아 있다');
    }
  }
  if (r.name === '느린회선') {
    r.mid && /\d+ \/ \d+/.test(r.mid.줄 || '') ? good('올리는 동안 «N / 전체»를 보여준다')
      : fail('진행 표시가 없다: ' + (r.mid && r.mid.줄));
    r.mid && r.mid.버튼잠김 ? good('올리는 동안 버튼이 잠긴다(이중 실행 방지)') : fail('올리는 동안 버튼이 안 잠긴다');
  }
  if (r.name === '토큰만료') {
    r.요청수 === 1 ? good('만료면 «첫 장»에서 멈춘다 — 나머지를 헛되이 안 보낸다')
      : fail(`만료인데 ${r.요청수}장을 보냈다`);
    /만료/.test(r.줄 || '') ? good('만료 사유를 화면이 말한다') : fail('만료를 안 알린다: ' + r.줄);
  }
}

fs.rmSync(TMP, { recursive: true, force: true });
await eng.close(); srv.close();
console.log(bad ? `\n사진 올리기 위반 ${bad}건` : '\nGP SIM OK — 서버가 무엇을 답하든 화면이 말을 한다');
process.exit(bad ? 1 : 0);
