// [NAV_SEQ][STATE_SEQ] 응답 순서 역전 감사 — 느린 응답이 나중에 도착해 «지금 화면»을 덮는지, 끊김·멈춤에 화면이 갇히는지.
//   점검 라운드4(2026-09-05)가 잡은 네 가지를 영구 검사로: ①상세 A 가 느릴 때 뒤로가기 뒤 A 가 홈을 덮음 ②A→B 열기에서 늦은 A 가 B 를 덮음
//   ③늦은 검색 결과가 홈을 덮음 ④마이페이지 느린 로드 중 로그아웃 뒤 늦은 상태가 로그인 화면을 덮음(앞사람 화면 노출).
//   방식: script.google.com 응답을 요청별로 지연·끊김·멈춤시켜 순서를 뒤집는다. 서버는 진짜 GAS 함수(_gasworld).
//   사용: node scripts/audit/nav-race.mjs   (브라우저 필요 · 약 40초 · 실패 0이어야 한다)
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = 8136; const { G, world } = openWorld();
const REC = JSON.stringify({ 가예약:{eventId:'EV123',date:'2026-10-26',status:'승인',expires:'2026-12-01'}, 시착:'2026-07-01', 계약:'2026-07-02', 영수증기준일:{ 예약금: kstAgo(1) } });
const mk = (code, g, b, extra) => Object.assign({ 개인코드: code, 신랑이름: g, 신부이름: b, 연락처:'010-1234-5678', 이메일:'t@example.com', 현재단계:'제작중', 계약상태:'서명완료', 계약총액:'2500000', 예식일:'2026-10-26', 입금상태:'확인', 입금자명:g, 입금완료신호:'2026-07-01 10:00', 중도금상태:'확인', 중도금확인일시:kstAgo(2), 잔금상태:'확인', 잔금확인일시:kstAgo(2), 시착동의상태:'동의완료', 시착동의일시:'2026-07-01 10:00', 계약서발송일시:'2026-07-01 12:00', 계약서명일시:'2026-07-02 08:00', 동의기록:REC }, extra||{});
const SEEDS = { 'ME-A': mk('ME-A','가나다','라마바'), 'ME-B': mk('ME-B','사아자','차카타'), 'ME-P': mk('ME-P','김희준','이미쿠', { 현재단계:'계약완료', 입금상태:'대기', 입금완료신호:kstAgo(1), 중도금상태:'', 중도금확인일시:'', 잔금상태:'', 잔금확인일시:'' }) };
const bk = (code, g, b) => ({ 상태:'확정', 캘린더이벤트ID:'BK1', 개인코드:code, '성함(신랑)':g, '성함(신부)':b, 연락처:'010-1234-5678', 이메일:'t@example.com', 예식일자:'2026-10-26', 하객:'30', 상담일시:'2026-06-20 14:00' });
const HOME = { ok:true, name:'점검', counts:{ total:1, urgent:0 }, queue:{ urgent:[], normal:[ {kind:'입금확인', code:'ME-P', names:'김희준 · 이미쿠', sub:'계약금 250,000원'} ] }, results:[], pipeline:{}, survey:[], blocks:[], stageFlow:{}, stageEx:[] };
const DELAY = {}; const FAIL = new Set(); const HOLD = new Set(); let held = [];
function serverCall(p) { try { if (p.action !== 'adminCall') return { ok:true }; const fn = String(p.fn||''); if (fn === 'adminHome') return HOME; if (fn === 'adminSearch') return { ok:true, results:[{ code:'ME-B', names:'사아자 · 차카타', product:'시그니처', stage:'제작중', wedding:'2026-10-26' }] }; const code = String((p.args||[])[0]||'ME-A'); const seed = SEEDS[code] || SEEDS['ME-A']; world(Object.assign({}, seed), bk(code, seed.신랑이름, seed.신부이름)); if (typeof G[fn] !== 'function') return { ok:false, error:'없는 함수: '+fn }; const r = G[fn].apply(null, p.args||[]); return r === undefined ? { ok:true } : r; } catch (e) { return { ok:false, error:String(e&&e.message||e) }; } }
const server = spawn('python3', ['-m','http.server',String(PORT),'--directory',SITE], { stdio:'ignore' }); process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1500));
const eng = await launchBrowser(); if (!eng) { console.log('브라우저 없음'); process.exit(0); }
let fail = 0; const found = []; const ok = (c, m, d) => { console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+String(d).slice(0,180)}`); if (!c) { fail++; found.push(m + (d ? ' (' + String(d).slice(0,80) + ')' : '')); } };
const keyOf = (p) => { const fn = String(p.fn||''); if (fn === 'adminDetail') return 'D:' + String((p.args||[])[0]||''); if (fn === 'adminHome') return 'home'; if (fn === 'adminSearch') return 'search'; return fn; };
const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:1440, height:1000 } });
await page.route('**script.google.com**', async route => { let p={}; try { p=JSON.parse(route.request().postData()||'{}'); } catch {} const k = keyOf(p); if (FAIL.has(k)) return route.abort(); if (HOLD.has(k)) { await new Promise(r => held.push(r)); } const d = DELAY[k] || 0; const body = JSON.stringify(serverCall(p)); if (d) await new Promise(r => setTimeout(r, d)); await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body }); });
await page.addInitScript(() => { localStorage.setItem('me_admin_token','SHOT-TOKEN'); });
const reset = () => { for (const k in DELAY) delete DELAY[k]; FAIL.clear(); HOLD.clear(); held.forEach(r => r()); held = []; };
const state = () => page.evaluate(() => ({ view: window._view, nm: (document.querySelector('.dsticky .nm')||{}).textContent||'', queue: (document.getElementById('queueWrap').innerText||'').slice(0,40), loading: document.getElementById('loading').style.display, skel: document.querySelectorAll('#loading .skel').length, toast: (document.getElementById('toast')||{}).textContent||'', login: document.getElementById('loginView').style.display, lgErr: (document.getElementById('lgErr')||{}).textContent||'' }));
try {
  await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(800);
  console.log('\n[T1a] 상세 A 가 느릴 때(1.5s) 뒤로가기로 홈에 갔는데, 늦게 온 A 가 홈을 덮는가');
  reset(); DELAY['D:ME-A'] = 1500;
  await page.evaluate(() => window.openDetail('ME-A','home')); await page.waitForTimeout(300);
  await page.evaluate(() => history.back()); await page.waitForTimeout(600);
  const s1 = await state(); ok(s1.view === 'home', '뒤로가기 직후 홈이다(전제)', JSON.stringify(s1));
  await page.waitForTimeout(1800); const s1b = await state();
  ok(s1b.view === 'home', '늦게 온 A 응답이 홈을 덮지 않는다', `view=${s1b.view} nm=${s1b.nm}`);

  console.log('\n[T1b] A(1.5s) 를 열다 B(0.1s) 를 열면 마지막에 보이는 것은 B 여야 한다');
  reset(); DELAY['D:ME-A'] = 1500; DELAY['D:ME-B'] = 100;
  await page.evaluate(() => window.loadHome()); await page.waitForTimeout(500);
  await page.evaluate(() => window.openDetail('ME-A','home')); await page.waitForTimeout(200);
  await page.evaluate(() => window.openDetail('ME-B','home')); await page.waitForTimeout(600);
  const s2 = await state(); ok(/사아자/.test(s2.nm), 'B 응답 뒤 B 가 보인다(전제)', s2.nm);
  await page.waitForTimeout(1500); const s2b = await state();
  ok(/사아자/.test(s2b.nm), '늦게 온 A 가 B 를 덮지 않는다', `보이는 이름=${s2b.nm}`);

  console.log('\n[T1c] 검색(1.5s) 도중 빈 검색으로 홈에 갔는데, 늦게 온 검색 결과가 홈을 덮는가');
  reset(); DELAY['search'] = 1500;
  await page.evaluate(() => window.loadHome()); await page.waitForTimeout(500);
  await page.evaluate(() => { document.getElementById('q').value = '사아자'; window.doSearch(); }); await page.waitForTimeout(300);
  await page.evaluate(() => { document.getElementById('q').value = ''; window.doSearch(); }); await page.waitForTimeout(600);
  const s3 = await state(); ok(/처리할 일/.test(s3.queue), '빈 검색 직후 홈(처리할 일)이다(전제)', s3.queue);
  await page.waitForTimeout(1500); const s3b = await state();
  ok(/처리할 일/.test(s3b.queue) && !/검색 결과/.test(s3b.queue), '늦게 온 검색 결과가 홈을 덮지 않는다', s3b.queue);

  console.log('\n[T2] 느린 실행(1.2s) 중 확인 버튼이 즉시 잠기고 «처리 중…»을 보인다');
  reset(); DELAY['adminConfirmPayment'] = 1200;
  await page.evaluate(() => window.openDetail('ME-P','home')); await page.waitForTimeout(700);
  await page.evaluate(() => { const b = document.querySelector('[data-da="confirmPay"], [data-da^="confirmPay"], [data-act^="confirmPay"]') || [...document.querySelectorAll('#detailBody .btn')].find(x => /입금 확인$/.test((x.textContent||'').trim())); if (b) b.click(); }); await page.waitForTimeout(400);
  const m0 = await page.evaluate(() => document.getElementById('confirmModal').classList.contains('show')); ok(m0, '입금 확인 모달이 떴다(전제)');
  await page.evaluate(() => document.getElementById('cm_yes').click()); await page.waitForTimeout(80);
  const y = await page.evaluate(() => ({ dis: document.getElementById('cm_yes').disabled, t: document.getElementById('cm_yes').textContent, busy: document.getElementById('topBusy') ? document.getElementById('topBusy').classList.contains('on') : null }));
  ok(y.dis && /처리 중/.test(y.t), '누른 지 80ms 안에 확인 버튼이 잠기고 «처리 중…»', JSON.stringify(y));
  ok(y.busy !== false, '상단 진행 표시가 켜진다', JSON.stringify(y));
  await page.waitForTimeout(1800); const m1 = await page.evaluate(() => document.getElementById('confirmModal').classList.contains('show'));
  ok(!m1, '응답 뒤 모달이 닫힌다');

  console.log('\n[T3] 끊김 — 홈·상세 요청이 실패해도 해골 화면에 갇히지 않는다');
  reset(); FAIL.add('home');
  await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(1500);
  const s4 = await state(); ok(s4.loading === 'none' || s4.skel === 0, '홈 실패 → 해골 화면이 아니다', JSON.stringify(s4));
  ok(/연결|다시|불안정/.test(s4.lgErr + s4.toast), '무슨 일인지 한 줄 안내가 있다', (s4.lgErr + ' / ' + s4.toast).slice(0,120));
  reset(); FAIL.add('D:ME-A');
  await page.evaluate(() => window.loadHome()); await page.waitForTimeout(500);
  await page.evaluate(() => window.openDetail('ME-A','home')); await page.waitForTimeout(1500);
  const s5 = await state(); ok(s5.view === 'home' && s5.loading === 'none', '상세 실패 → 홈으로 돌아온다', JSON.stringify(s5));
  ok(/오류|실패|연결/.test(s5.toast), '실패 토스트가 보였다', s5.toast);

  console.log('\n[T7] 상세를 불러오는 중(1.5s) 조용한 갱신(폴링)이 먼저 오면 해골이 홈으로 바뀌지 않는다(깜빡임 금지)');
  reset(); DELAY['D:ME-A'] = 1500;
  await page.evaluate(() => window.loadHome()); await page.waitForTimeout(500);
  await page.evaluate(() => window.openDetail('ME-A','home')); await page.waitForTimeout(200);
  await page.evaluate(() => window.loadHome(true)); await page.waitForTimeout(500);
  const s7 = await state(); ok(s7.loading === 'block', '조용한 갱신이 도착해도 해골이 유지된다', JSON.stringify(s7));
  await page.waitForTimeout(1500); const s7b = await state();
  ok(s7b.view === 'detail' && /가나다/.test(s7b.nm), '상세는 정상 도착', JSON.stringify(s7b));

  console.log('\n[T4] 멈춤 — 홈 응답이 영영 안 올 때 6초 뒤 화면(정보용)');
  reset(); HOLD.add('home');
  await page.evaluate(() => window.loadHome()); await page.waitForTimeout(6000);
  const s6 = await state(); console.log(`  · 6초 뒤: view=${s6.view} loading=${s6.loading} skel=${s6.skel} toast=${s6.toast.slice(0,40)}`);
  console.log('  ' + (s6.skel > 0 && !s6.toast ? '💡 관리자 api() 에는 시간제한이 없다 — 응답이 영영 안 오면 해골이 계속 남는다(마이페이지는 12초 제한)' : '· 안내가 있다'));
  reset();
} catch (e) { fail++; console.log('실행 오류: ' + (e && e.stack || e).toString().slice(0,300)); }
const realErr = errors.filter(e => !/ERR_FAILED/.test(e)); console.log(`\n[관리자] pageerror ${realErr.length}(의도적 끊김 제외)` + (realErr.length ? ' → ' + realErr.slice(0,3).join(' | ') : ''));
if (realErr.length) fail++;
await page.close();

// ── 마이페이지
const MP = 8137; const mpServer = spawn('python3', ['-m','http.server',String(MP),'--directory',SITE], { stdio:'ignore' }); process.on('exit', () => { try { mpServer.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1200));
const SIG = ['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달','후기'];
const STATE = { ok:true, name:'김희준 · 이미쿠', product:'시그니처', code:'ME-SHOT', stage:'제작중', stageIndex:SIG.indexOf('제작중'), stageList:SIG.slice(), nextAction:'다음 할 일을 안내해 드릴게요.', contract:{ signed:true }, payment:{ confirmed:true }, result:null, production:null, isException:false, weddingDate:'2026-10-26' };
const MD = {}; const MHOLD = new Set(); let mheld = [];
const mp = await eng.newPage({ port:MP, viewport:{ width:390, height:844 } });
await mp.page.route('**script.google.com**', async route => { let p={}; try { p=JSON.parse(route.request().postData()||'{}'); } catch {} const a = String(p.action||''); if (MHOLD.has(a)) await new Promise(r => mheld.push(r)); if (MD[a]) await new Promise(r => setTimeout(r, MD[a])); await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(a === 'getMyState' ? STATE : { ok:true }) }); });
await mp.page.addInitScript(() => { localStorage.setItem('me_token','TOK'); });
const mst = () => mp.page.evaluate(() => ({ login: document.getElementById('loginView').classList.contains('show'), my: document.getElementById('mypageView').classList.contains('show'), loading: document.getElementById('loading').style.display, retry: !!document.getElementById('mp_retryLoad'), tok: localStorage.getItem('me_token') || '' }));
try {
  console.log('\n[T5] 마이페이지 — 느린 로드(1.5s) 중 로그아웃했는데, 늦게 온 상태가 로그인 화면을 덮는가');
  MD.getMyState = 1500;
  await mp.page.goto(`http://localhost:${MP}/mypage.html`, { waitUntil:'load' }); await mp.page.waitForTimeout(300);
  await mp.page.evaluate(() => document.getElementById('mp_logout').click()); await mp.page.waitForTimeout(200);
  const a = await mst(); ok(a.login && !a.my && a.tok === '', '로그아웃 직후 로그인 화면·토큰 없음(전제)', JSON.stringify(a));
  await mp.page.waitForTimeout(2000); const b = await mst();
  ok(b.login && !b.my, '늦게 온 상태가 로그아웃 뒤 화면을 덮지 않는다', JSON.stringify(b));
  console.log('\n[T6] 마이페이지 — 응답이 영영 안 오면 12초 뒤 «연결이 느려요 · 다시 시도»');
  delete MD.getMyState; MHOLD.add('getMyState');
  await mp.page.evaluate(() => { localStorage.setItem('me_token','TOK'); try { localStorage.removeItem('me_state'); } catch(e){} loadMyState(); }); await mp.page.waitForTimeout(13500);
  const c = await mst(); ok(c.retry, '12초 뒤 다시 시도 버튼이 나온다', JSON.stringify(c));
  mheld.forEach(r => r()); mheld = []; MHOLD.clear();
} catch (e) { fail++; console.log('마이페이지 실행 오류: ' + (e && e.stack || e).toString().slice(0,300)); }
console.log(`\n[마이페이지] pageerror ${mp.errors.length}` + (mp.errors.length ? ' → ' + mp.errors.slice(0,3).join(' | ') : ''));
console.log(`\n타이밍 검사 종료 · 실패 ${fail}건` + (found.length ? '\n' + found.map(s => '★ ' + s).join('\n') : ''));
await eng.close?.(); process.exit(fail ? 1 : 0);
