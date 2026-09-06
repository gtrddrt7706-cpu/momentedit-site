#!/usr/bin/env node
/* [INQ_SUBMIT_SIM] 문의 폼의 «제출»이 서버 응답별로 무엇을 하는가 — 라운드 2 0번
 *
 * 왜 이 검사가 먼저인가 (2026-09-06 코워크 합의)
 *   실패 경로·오류 안내·키보드 검사는 전부 «제출이 된다»를 전제한다. 전제가 깨져 있으면
 *   그 아래 검사가 통째로 헛돈다. 문의 폼은 이 사업의 전환 지점이라 «보이는가»보다
 *   «작동하는가»가 먼저다.
 *
 * ★실제 문의는 나가지 않는다. script.google.com 요청을 전부 가로채 가짜 응답을 준다.
 *   나간 요청 수를 세어 «이중 제출»도 함께 본다.
 *
 * 보는 것
 *   성공        {ok:true, code}      → 성공 화면 · 코드가 보이는가
 *   서버 거절   {ok:false, error}    → 그 문구가 그대로 보이는가 · 버튼이 되살아나는가
 *   깨진 응답   JSON 아님            → 일반 문구로 안내되는가 (조용히 죽지 않는가)
 *   네트워크    연결 실패            → 같음
 *   지연 + 연타 3회                  → 요청이 «1건»만 나가는가
 *   무응답      영영 안 옴           → 화면이 무엇을 보여준 채 멈추는가 (탈출구가 있는가)
 *
 * 종료코드: 0 통과 · 1 위반 · 2 못 쟀다(브라우저 없음 · 포트)
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
import { freePort } from './_freeport.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const SHOTS = path.join(ROOT, 'scripts/audit/_shots');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png',
  '.jpg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json' };
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

/* 유효한 값으로 폼을 채운다. 필수만 채우면 «최소 통과 경로»라 실제 제출과 다르지 않다. */
const FILL = `(() => {
  const set = (id, v) => { const e = document.getElementById(id); if (!e) return false;
    e.value = v; e.dispatchEvent(new Event('input', {bubbles:true})); e.dispatchEvent(new Event('change', {bubbles:true})); return true; };
  const pick = (name, i) => { const els = [...document.querySelectorAll('input[name="'+name+'"]')];
    const e = els[i || 0]; if (!e) return false; e.checked = true;
    e.dispatchEvent(new Event('change', {bubbles:true})); e.dispatchEvent(new Event('click', {bubbles:true})); return true; };
  const out = {};
  out.groom = set('groom', '테스트신랑');
  out.bride = set('bride', '테스트신부');
  out.phone = set('phone', '01012345678');
  out.email = set('email', 'test@example.com');
  out.guests = set('guests', '20');
  out.pw = set('pw', 'testpw1234');
  out.pw2 = set('pw2', 'testpw1234');
  out.date_type = pick('date_type', 1);           // 두 번째 = 범위 선택(달력 모달을 안 열어도 되는 쪽)
  out.range = set('dateRange', '2027년 하반기');
  out.weekday = pick('weekday', 0);
  out.wedding_time = pick('wedding_time', 0);
  out.streaming = pick('streaming', 0);
  // ★JS 로만 강제되는 필수 5종 — HTML required 가 아니라 validateForm() 이 막는다.
  //   빠뜨리면 모달까지 못 가고 «말없이 스크롤»만 된다(라운드 2 1번의 관찰 대상이기도 하다).
  out.referral = pick('referral', 0);
  out.attire = pick('attire', 0);
  out.priority = pick('priority', 0);
  out.hesitation = pick('hesitation', 0);
  out.stage = pick('stage', 0);
  const pc = document.getElementById('privacyConsent');
  if (pc) { pc.checked = true; pc.dispatchEvent(new Event('change', {bubbles:true})); out.privacy = true; }
  return out;
})()`;

/* 화면이 지금 무엇을 말하고 있는가 */
const SCREEN = `(() => {
  const vis = (e) => { if (!e) return false; const c = getComputedStyle(e); const b = e.getBoundingClientRect();
    return c.display !== 'none' && c.visibility !== 'hidden' && +c.opacity > 0.05 && b.width > 1 && b.height > 1; };
  const btn = document.querySelector('.submit-btn');
  const err = document.getElementById('submitError') || document.querySelector('.submit-error');
  const txt = (e) => e ? (e.textContent || '').replace(/\\s+/g, ' ').trim() : null;
  /* ★성공은 «성공 화면» 하나로만 판정한다. 페이지 전체에서 문자열을 찾으면
     숨어 있는 성공 화면 텍스트를 품은 조상(폼 래퍼)까지 잡혀 무응답에서도 «성공»이 나온다. */
  const ss = document.getElementById('successScreen');
  const shown = ss && ss.classList.contains('show') && vis(ss);
  const codeEl = shown ? ss.querySelector('#meCodeValue, .code-value, [id*="ode"]') : null;
  return {
    버튼글: btn ? txt(btn.querySelector('.btn-text')) : null,
    버튼잠김: btn ? !!btn.disabled : null,
    로딩표시: btn ? btn.classList.contains('loading') : null,
    오류보임: vis(err),
    오류글: vis(err) ? txt(err) : null,
    폼보임: vis(document.getElementById('inquiryForm')),
    성공화면: !!shown,
    코드: codeEl ? txt(codeEl) : (shown ? txt(ss).slice(0, 70) : null),
  };
})()`;

/** 시나리오 하나를 돌린다. handler 가 script.google.com 요청을 어떻게 처리할지 정한다. */
async function run(name, handler, { clicks = 1, waitAfter = 1200, delayClicks = 0, omit = null } = {}) {
  const { page } = await eng.newPage({ port: PORT, viewport: { width: 390, height: 844 } });
  let hits = 0;
  await page.route('**://script.google.com/**', async (route) => { hits++; await handler(route, hits); });
  await page.goto(`http://localhost:${PORT}/inquiry.html`, { waitUntil: 'load' });
  await page.addStyleTag({ content: 'html{scroll-behavior:auto !important}' });
  await page.waitForTimeout(900);
  const filled = await page.evaluate(omit ? FILL.replace(`out.${omit} = pick('${omit}', 0);`, '') : FILL);
  const missing = Object.entries(filled).filter(([, v]) => !v).map(([k]) => k).filter((k) => k !== omit);
  if (missing.length) { await page.close(); return { name, err: '폼을 못 채웠다: ' + missing.join(',') }; }

  await page.evaluate(() => document.querySelector('.submit-btn').scrollIntoView({ block: 'center' }));
  await page.waitForTimeout(200);
  await page.evaluate(() => document.querySelector('.submit-btn').click());
  /* ★필수 누락은 «반짝이는 동안»을 한 장 남긴다 — meFlashTo 의 애니메이션은 1.5초뿐이라
     그 뒤에 찍으면 화면에 아무 흔적이 없다(첫 판이 그랬다). 사람이 판정할 그림은 이쪽이다. */
  if (omit) { await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(SHOTS, `inq-submit-${SLUG[name] || 'x'}-flash.png`) }); }
  await page.waitForTimeout(700);
  // 이메일 확인 모달의 «맞습니다»를 누른다
  const confirmed = await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /맞습니다/.test(e.textContent || '')
      && getComputedStyle(e).display !== 'none' && e.getBoundingClientRect().width > 1);
    if (!b) return false; b.click(); return true;
  });
  if (!confirmed) {
    if (omit) {   // 예정된 결과다 — 검증이 막았으므로 «무엇이 보이는가»만 기록한다
      const screen = await page.evaluate(SCREEN);
      const near = await page.evaluate((nm) => {
        const el = document.querySelector(`input[name="${nm}"]`); if (!el) return null;
        const box = el.closest('.compact-row, .field-group, label') || el.parentElement;
        const r = box.getBoundingClientRect();
        const t = (x) => (x.textContent || '').replace(/\s+/g, ' ').trim();
        return { 화면안: r.top > -1 && r.bottom < innerHeight + 1, 상단: Math.round(r.top),
                 반짝임: box.className + ' | ' + (box.closest('[class*=flash]') ? 'flash 있음' : 'flash 없음'),
                 문구: t(box).slice(0, 50) };
      }, omit);
      const file = path.join(SHOTS, `inq-submit-${SLUG[name] || 'x'}.png`);
      await page.screenshot({ path: file });
      await page.close();
      return { name, 요청수: hits, ...screen, 누락위치: near, shot: path.relative(ROOT, file) };
    }
    await page.close(); return { name, err: '이메일 확인 모달을 못 찾았다' };
  }

  for (let i = 1; i < clicks; i++) {
    if (delayClicks) await page.waitForTimeout(delayClicks);
    await page.evaluate(() => document.querySelector('.submit-btn').click());
  }
  await page.waitForTimeout(waitAfter);
  const screen = await page.evaluate(SCREEN);
  /* ★파일명은 ASCII 슬러그로. 한글 이름을 [^a-z0-9] 로 치환하면 전부 «--» 가 되어
     여섯 장이 한 파일을 덮어썼다(첫 판에서 실제로 그랬다). */
  const file = path.join(SHOTS, `inq-submit-${SLUG[name] || 'x'}.png`);
  await page.screenshot({ path: file, fullPage: false });
  await page.close();
  return { name, 요청수: hits, ...screen, shot: path.relative(ROOT, file) };
}

const SLUG = { '성공': 'ok', '서버거절': 'server-reject', '깨진응답': 'bad-json',
  '네트워크실패': 'net-fail', '지연연타': 'double-click', '무응답': 'no-reply', '필수누락': 'missing-required' };

const J = (body) => (route) => route.fulfill({ status: 200, contentType: 'application/json',
  headers: { 'Access-Control-Allow-Origin': '*' }, body });

const results = [];
results.push(await run('성공', J('{"ok":true,"code":"ME-TEST01"}')));
results.push(await run('서버거절', J('{"ok":false,"error":"이미 접수된 이메일입니다"}')));
results.push(await run('깨진응답', (route) => route.fulfill({ status: 200, contentType: 'text/html',
  headers: { 'Access-Control-Allow-Origin': '*' }, body: '<html>Moved Temporarily</html>' })));
results.push(await run('네트워크실패', (route) => route.abort('connectionfailed')));
results.push(await run('지연연타', async (route) => { await new Promise((r) => setTimeout(r, 2500));
  await route.fulfill({ status: 200, contentType: 'application/json',
    headers: { 'Access-Control-Allow-Origin': '*' }, body: '{"ok":true,"code":"ME-TEST02"}' }); },
  { clicks: 3, delayClicks: 300, waitAfter: 3500 }));
results.push(await run('무응답', () => new Promise(() => {}), { waitAfter: 6000 }));
/* ★필수 5종(referral·attire·priority·hesitation·stage)은 HTML required 가 아니라
   validateForm() 이 막는다. 빠뜨렸을 때 화면이 «무엇을 말하는가»를 기록한다.
   판정은 하지 않는다 — 화면 판정은 코워크 몫이고, 이 하네스는 그 그림을 만들어 준다. */
results.push(await run('필수누락', J('{"ok":true,"code":"ME-NEVER"}'), { omit: 'stage', waitAfter: 900 }));

let bad = 0;
const fail = (m) => { bad++; console.log('   ✗ ' + m); };
const okline = (m) => console.log('   ✓ ' + m);

for (const r of results) {
  console.log(`\n══ ${r.name} ══`);
  if (r.err) { fail(r.err); continue; }
  console.log(`   요청 ${r.요청수}건 · 버튼「${r.버튼글}」 잠김=${r.버튼잠김} · 오류보임=${r.오류보임}`);
  if (r.오류글) console.log(`   오류글: ${r.오류글}`);
  if (r.성공화면) console.log(`   성공화면 · 코드: ${r.코드}`);
  console.log(`   ${r.shot}`);

  if (r.name === '성공') {
    r.성공화면 ? okline('성공 화면이 떴다') : fail('성공 응답인데 성공 화면이 안 떴다');
    /ME-TEST01/.test(r.코드 || '') ? okline('서버가 준 코드가 화면에 나왔다') : fail('코드가 화면에 없다: ' + r.코드);
    r.요청수 === 1 ? okline('요청 1건') : fail(`요청이 ${r.요청수}건`);
  }
  if (r.name === '서버거절') {
    r.오류보임 ? okline('오류가 보인다') : fail('서버가 거절했는데 화면에 아무 말이 없다');
    /이미 접수된 이메일/.test(r.오류글 || '') ? okline('서버 문구가 그대로 전달됐다')
      : fail('서버가 준 error 문구가 화면에 없다: ' + r.오류글);
    r.버튼잠김 === false ? okline('버튼이 되살아났다') : fail('버튼이 잠긴 채 남았다 — 다시 시도할 수 없다');
  }
  if (r.name === '깨진응답' || r.name === '네트워크실패') {
    r.오류보임 ? okline('오류가 보인다') : fail('조용히 죽었다 — 화면에 아무 말이 없다');
    r.버튼잠김 === false ? okline('버튼이 되살아났다') : fail('버튼이 잠긴 채 남았다');
  }
  if (r.name === '지연연타') {
    r.요청수 === 1 ? okline('연타 3회에도 요청은 1건') : fail(`연타 3회에 요청이 ${r.요청수}건 — 이중 제출`);
  }
  if (r.name === '필수누락') {
    console.log(`   · 판정 없음(기록만) — stage 를 비운 채 제출한 결과다.`);
    console.log(`   · 요청 ${r.요청수}건(0이어야 정상) · 오류문구 보임=${r.오류보임}`);
    if (r.누락위치) console.log(`   · 빠진 항목이 화면 안에 있나: ${r.누락위치.화면안} (top ${r.누락위치.상단}px) · ${r.누락위치.반짝임}`);
    console.log('   · 되돌아오는 신호는 «부드러운 스크롤 + 1.5초 반짝임»뿐이고 문구는 없다(meFlashTo).');
    console.log('   · 반짝이는 순간: ' + path.relative(ROOT, path.join(SHOTS, 'inq-submit-missing-required-flash.png')));
    r.요청수 === 0 ? okline('필수가 비면 서버로 보내지 않는다') : fail(`필수가 비었는데 요청이 ${r.요청수}건 나갔다`);
  }
  if (r.name === '무응답') {
    // 판정하지 않는다 — «무엇이 보이는가»를 기록해 사람이 정한다.
    console.log('   · 판정 없음(기록만) — 6초를 기다린 뒤 상태다.');
    if (r.버튼잠김 && !r.오류보임 && !r.성공화면)
      console.log('   · 화면은 「' + r.버튼글 + '」에 멈춰 있고 버튼이 잠겨 있다. 스스로 빠져나올 길이 없다(타임아웃 없음).');
  }
}

await eng.close(); srv.close();
console.log(bad ? `\n제출 경로 위반 ${bad}건` : '\nINQ SUBMIT OK — 서버가 무엇을 답하든 화면이 말을 한다');
process.exit(bad ? 1 : 0);
