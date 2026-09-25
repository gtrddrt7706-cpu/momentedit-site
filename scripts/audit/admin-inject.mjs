// [SAFE_HREF] 관리자·마이페이지 실렌더 주입/권한 감사 — 토큰 없음·무효 → 로그인 화면, 큐·검색·최근·상세·토스트·마이페이지 문구의 태그 주입이
//   글자로만 남는가(실행 0 · img[src=x]/svg[onload] 0 · javascript: 링크 0). xss-check.mjs(마이페이지 필드 전수)와 짝 — 이쪽은 관리자 표면 + 저장값 링크.
//   점검 라운드5(2026-09-05)가 잡은 것: 원본·보정본·영상·양식 링크가 저장값을 그대로 href 로 써 javascript: 값이 링크가 됐다 → _safeHref.
//   사용: node scripts/audit/admin-inject.mjs   (브라우저 필요 · 약 30초 · 실패 0이어야 한다)
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = 8139; const { G, world } = openWorld();
const XSS = '<img src=x onerror="window.__xss=1">'; const XSS2 = '"><svg onload="window.__xss=2">'; const JSU = 'javascript:window.__xss=3';
const REC = JSON.stringify({ 시착:'2026-07-01', 계약:'2026-07-02' });
/* [SV_RESP_VIEW 2026-09-25] 설문 원문 — 관리자 화면이 고객이 쓴 글을 그대로 그린다(기타 의견·한마디·문항 원문).
   종전 픽스처는 홈 설문을 옛 모양(배열)으로 흉내 내 설문 영역이 «빈 상태»로만 그려졌다 — 검사한다고 적혀 있었지만 실제로는 안 봤다. */
const SVX = JSON.stringify({ product:'시그니처', answers:{ overall:'very', recommend:'definitely', source:'etc' },
  notes:{ overall: XSS, source: XSS2 }, snap:[ { k:'source', q: XSS2, req:0, v:'etc', o:[ ['etc', XSS], ['sns', '인스타그램'] ] } ],
  review: XSS, reviewPublic:'Y' });
const A = { 개인코드:'ME-A', 신랑이름: XSS, 신부이름: XSS2, 연락처:'010-1234-5678', 이메일:'t@example.com', 현재단계:'제작중', 계약상태:'서명완료', 계약총액:'2500000', 예식일:'2026-10-26', 입금상태:'확인', 입금자명: XSS, 입금완료신호:'2026-07-01 10:00', 시착동의상태:'동의완료', 관리자메모: XSS, 원본링크: JSU, 동의기록:REC, 설문상태:'완료', 설문응답: SVX, 설문일시:'2026-09-24 15:20' };
const HOME = { ok:true, name: XSS, counts:{ total:2, urgent:1 }, queue:{ urgent:[ {kind:'입금확인', code:'ME-A', names: XSS, sub: XSS2, badge:{ level:'red', text: XSS }} ], normal:[ {kind:'상담완료', code:'ME-A', names:'정상 · 이름', sub:'부제 ' + XSS, badge:{ level:'yellow', text:'벌수 미기록' }} ] }, results:[ { code:'ME-A', names: XSS, stage:'결과물전달', sub: XSS2 } ], pipeline:{ '제작중':[{ code:'ME-A', names: XSS }] }, survey:{ n:2, unseen:1, byProduct:{ '시그니처':2 }, q:{ overall:{ very:2 }, recommend:{ definitely:2 } }, recent:[ { code:'ME-A', names: XSS, product: XSS2, overall:'very', recommend:'definitely', gap:'some', review: XSS, reviewPublic:'Y', date: XSS2, notesN:2, seen:'', full: JSON.parse(SVX) }, { code:'ME-A', names: XSS2, product: XSS2, overall:'very', recommend:'definitely', gap:'', review: XSS2, reviewPublic:'', date: XSS, notesN:2, seen:'2026-09-25 10:00' } ] }, blocks:[], stageFlow:{}, stageEx:[] };
let MODE = 'ok';
function serverCall(p) { try { if (p.action !== 'adminCall') return { ok:true }; const fn = String(p.fn||''); if (MODE === 'badtoken') return { ok:false, error:'로그인이 필요해요 · 세션 만료' }; if (fn === 'adminHome') return HOME; if (fn === 'adminSearch') return { ok:true, results:[{ code:'ME-A', names: XSS, product: XSS2, stage: XSS, wedding: XSS2 }] }; world(Object.assign({}, A), { 개인코드:'ME-A', 상태:'확정', '성함(신랑)': XSS, '성함(신부)': XSS2 }); if (typeof G[fn] !== 'function') return { ok:false, error:'없는 함수: '+fn }; const r = G[fn].apply(null, p.args||[]); return r === undefined ? { ok:true } : r; } catch (e) { return { ok:false, error:String(e&&e.message||e) }; } }
const server = spawn('python3', ['-m','http.server',String(PORT),'--directory',SITE], { stdio:'ignore' }); process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1500));
const eng = await launchBrowser(); if (!eng) { console.log('브라우저 없음'); process.exit(0); }
let fail = 0; const found = []; const ok = (c, m, d) => { console.log(`  ${c?'✅':'❌'} ${m}${c||!d?'':' → '+String(d).slice(0,180)}`); if (!c) { fail++; found.push(m); } };
const probe = (page, root) => page.evaluate((root) => { const r = document.querySelector(root) || document.body; return { xss: window.__xss, img: r.querySelectorAll('img[src="x"], svg[onload]').length, js: [...document.querySelectorAll('a[href]')].filter(a => /^javascript:/i.test(a.getAttribute('href')||'')).length, literal: (r.innerText||'').indexOf('<img') !== -1 || (r.innerText||'').indexOf('onerror') !== -1 }; }, root);
// ── 관리자
{
  const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:1440, height:1000 } });
  await page.route('**script.google.com**', async route => { let p={}; try { p=JSON.parse(route.request().postData()||'{}'); } catch {} await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(serverCall(p)) }); });
  console.log('\n[S1] 토큰 없이 들어오면 로그인 화면 · 서버를 부르지 않는다');
  let calls = 0; page.on('request', r => { if (/script\.google\.com/.test(r.url())) calls++; });
  await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(800);
  const s1 = await page.evaluate(() => ({ login: document.getElementById('loginView').style.display, home: document.getElementById('homeView').style.display }));
  ok(s1.login === 'block' && s1.home === 'none', '로그인 화면만 보인다', JSON.stringify(s1)); ok(calls === 0, '토큰 없이는 서버를 부르지 않는다', 'calls=' + calls);
  console.log('\n[S2] 무효 토큰(서버 거절) → 로그인 화면 + 안내 · 토큰 삭제');
  MODE = 'badtoken'; await page.evaluate(() => localStorage.setItem('me_admin_token','BAD')); await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(900);
  const s2 = await page.evaluate(() => ({ login: document.getElementById('loginView').style.display, err: (document.getElementById('lgErr')||{}).textContent||'', tok: localStorage.getItem('me_admin_token') }));
  ok(s2.login === 'block', '로그인 화면', JSON.stringify(s2)); ok(!!s2.err, '왜 튕겼는지 안내가 있다', s2.err); ok(!s2.tok, '무효 토큰이 지워졌다', String(s2.tok));
  console.log('\n[S3] 홈(큐·결과·파이프·후기)·검색·최근·상세·토스트에 넣은 태그가 실행되지 않고 글자로만 남는다');
  MODE = 'ok'; await page.evaluate(() => localStorage.setItem('me_admin_token','SHOT-TOKEN')); await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(900);
  const h = await probe(page, '#homeView'); ok(h.xss === undefined && h.img === 0, '홈: 주입 태그 미실행(img/svg 0)', JSON.stringify(h)); ok(h.literal, '홈: 주입 문자열이 글자로 보인다(이스케이프)', JSON.stringify(h));
  /* [SV_UNSEEN] 홈엔 이제 퍼센트가 없고 «새 후기 알림 + 후기 화면 입구»만 있다. 후기 화면에서 원문이 그려진다. */
  { const a0 = await page.evaluate(() => { const b = document.getElementById('rvAlarmWrap'); return { shown: !!b && b.style.display !== 'none' && /새 후기 1건/.test(b.textContent), pct: document.querySelectorAll('#surveyWrap .sv-pill, #surveyWrap .sv-bar').length, entry: !!document.querySelector('#surveyWrap [data-rv-open]') }; });
    ok(a0.shown && a0.entry && a0.pct === 0, '홈: 새 후기 알림 한 줄 + 후기 입구 · 퍼센트 집계 없음', JSON.stringify(a0));
    const a1 = await probe(page, '#rvAlarmWrap'); ok(a1.xss === undefined && a1.img === 0, '홈 알림: 이름에 넣은 태그 미실행', JSON.stringify(a1));
    await page.evaluate(() => { const b = document.querySelector('#rvAlarmWrap [data-rv-open]'); if (b) b.click(); }); await page.waitForTimeout(500);
    const v1 = await page.evaluate(() => { const v = document.getElementById('reviewView'); const nw = v && v.querySelector('.rv-row.is-new'); return { shown: !!v && v.style.display === 'block', rows: v ? v.querySelectorAll('.rv-row').length : 0, newNotes: nw ? nw.querySelectorAll('.svr-note').length : 0, newOpts: nw ? nw.querySelectorAll('.svr-o').length : 0, txt: nw ? nw.textContent.indexOf('<img') !== -1 : false }; });
    ok(v1.shown && v1.rows === 2 && v1.newNotes === 2 && v1.newOpts >= 2 && v1.txt, '후기 화면: 새 후기는 원문(보기·기타 의견)을 펼친 채 글자로 보인다', JSON.stringify(v1));
    await page.evaluate(() => { const b = document.querySelector('#reviewView .rv-row:not(.is-new) [data-sv-open]'); if (b) b.click(); }); await page.waitForTimeout(800);
    const v2 = await page.evaluate(() => { const f = document.querySelector('#reviewView .rv-row:not(.is-new) .sv-full'); return { open: !!f && !f.hidden, notes: f ? f.querySelectorAll('.svr-note').length : 0, txt: f ? f.textContent.indexOf('<img') !== -1 : false }; });
    ok(v2.open && v2.notes === 2 && v2.txt, '후기 화면: 확인한 후기는 눌러서 펼친다(상세를 불러와 원문을 글자로)', JSON.stringify(v2));
    const v3 = await probe(page, '#reviewView'); ok(v3.xss === undefined && v3.img === 0, '후기 화면: 주입 태그 미실행(이름·기타 의견·문항·보기·한마디)', JSON.stringify(v3));
    await page.evaluate(() => { const b = document.querySelector('#reviewView [data-rv-ok]'); if (b) b.click(); }); await page.waitForTimeout(700);
    const v4 = await page.evaluate(() => ({ nw: document.querySelectorAll('#reviewView .rv-row.is-new').length, alarm: (document.getElementById('rvAlarmWrap') || {}).style ? document.getElementById('rvAlarmWrap').style.display : '?' }));
    ok(v4.nw === 0 && v4.alarm === 'none', '후기 화면: 「확인」 → 새 후기 0 · 홈 알림이 내려간다', JSON.stringify(v4));
    await page.evaluate(() => { const b = document.getElementById('btnRvBack'); if (b) b.click(); }); await page.waitForTimeout(700); }
  await page.evaluate(() => { document.getElementById('q').value = 'x'; window.doSearch(); }); await page.waitForTimeout(700);
  const sr = await probe(page, '#queueWrap'); ok(sr.xss === undefined && sr.img === 0, '검색 결과: 미실행', JSON.stringify(sr));
  await page.evaluate(() => window.openDetail('ME-A','home')); await page.waitForTimeout(900);
  const d = await probe(page, '#detailView'); ok(d.xss === undefined && d.img === 0, '상세: 미실행(이름·입금자명·메모)', JSON.stringify(d)); ok(d.js === 0, '상세: javascript: 링크 없음', 'js=' + d.js);
  { const dv = await page.evaluate(() => { const v = document.querySelector('#detailView'); const svr = v && v.querySelector('.svr'); return { svr: !!svr, notes: svr ? svr.querySelectorAll('.svr-note').length : 0, opts: svr ? svr.querySelectorAll('.svr-o').length : 0, txt: svr ? svr.textContent.indexOf('<img') !== -1 : false }; });
    ok(dv.svr && dv.notes === 2 && dv.opts >= 2 && dv.txt, '상세 설문: 고객 화면 그대로(보기·기타 의견)가 글자로 보인다', JSON.stringify(dv)); }
  const memo = await page.evaluate(() => { const t = document.querySelector('#detailBody textarea'); return t ? t.value : ''; }); ok(memo.indexOf('<img') !== -1 || memo === '', '메모 입력칸엔 원문 그대로(값), 실행은 없음', memo.slice(0,60));
  await page.evaluate(() => window.loadHome()); await page.waitForTimeout(700);
  const rc = await probe(page, '#recentWrap'); ok(rc.xss === undefined && rc.img === 0, '최근 본 고객 칩: 미실행', JSON.stringify(rc));
  await page.evaluate(() => { try { toast('<img src=x onerror="window.__xss=9">'); } catch(e){} }); await page.waitForTimeout(300);
  const tt = await page.evaluate(() => ({ xss: window.__xss, img: document.querySelectorAll('#toast img').length })); ok(tt.xss === undefined && tt.img === 0, '토스트: 미실행', JSON.stringify(tt));
  const realErr = errors.filter(e => !/ERR_FAILED/.test(e)); ok(realErr.length === 0, '관리자 pageerror 없음', realErr.slice(0,2).join(' | '));
  await page.close();
}
// ── 마이페이지
{
  const MP = 8140; const mpServer = spawn('python3', ['-m','http.server',String(MP),'--directory',SITE], { stdio:'ignore' }); process.on('exit', () => { try { mpServer.kill(); } catch {} });
  await new Promise(r => setTimeout(r, 1200));
  const SIG = ['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달','후기'];
  const ST = { ok:true, name: XSS, product:'시그니처', code:'ME-SHOT', stage:'결과물전달', stageIndex:SIG.indexOf('결과물전달'), stageList:SIG.slice(), nextAction: XSS2, contract:{ signed:true }, payment:{ confirmed:true }, isException:false, weddingDate:'2026-10-26',
    result:{ stage:'결과물전달', status:'전달완료', delivered:true, survey:{ status:'' }, extra:{}, isSnap:false, 원본: JSU, 보정본: JSU, 선택수:10, 포함컷:10 },
    production:{ entered:true, base:{ groomKo: XSS, brideKo: XSS2, weddingDate:'2026-10-26', weddingTime:'13:20' }, tracks:{ invitation:'완료', dining:'완료', ritual:'완료', final:'완료', seat:'완료' }, ritualDraft:{ _v:3, summary:{ course: XSS, count:7, min:'약 19분', flow:[] }, S:{} }, diningDraft:{ dining_on:'Y', venue: XSS }, finalDraft:{ headcount:'6', standing:0, extraFee:0, drink: XSS2 }, seatDraft:{ tables:[{ name: XSS, seats:[XSS, '나'], drinks:['C','N'] }] }, guideinfoDraft:{ seatMode:'all' }, guideToken:'tok', confirm:null, confirmStale:false, rev:'r', trackRevs:{} } };
  let mode = 'ok';
  const mp = await eng.newPage({ port:MP, viewport:{ width:390, height:844 } });
  await mp.page.route('**script.google.com**', async route => { let p={}; try { p=JSON.parse(route.request().postData()||'{}'); } catch {} const a = String(p.action||''); const body = (a === 'getMyState') ? (mode === 'notok' ? { ok:false, error:'로그인이 필요해요' } : ST) : { ok:true }; await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(body) }); });
  console.log('\n[S4] 마이페이지 — 토큰 없음/무효 → 로그인 화면');
  await mp.page.goto(`http://localhost:${MP}/mypage.html`, { waitUntil:'load' }); await mp.page.waitForTimeout(900);
  const m1 = await mp.page.evaluate(() => ({ login: document.getElementById('loginView').classList.contains('show'), my: document.getElementById('mypageView').classList.contains('show') })); ok(m1.login && !m1.my, '토큰 없음 → 로그인 화면', JSON.stringify(m1));
  mode = 'notok'; await mp.page.evaluate(() => { localStorage.setItem('me_token','BAD'); loadMyState(); }); await mp.page.waitForTimeout(900);
  const m2 = await mp.page.evaluate(() => ({ login: document.getElementById('loginView').classList.contains('show'), tok: localStorage.getItem('me_token') })); ok(m2.login && !m2.tok, '무효 토큰 → 로그인 화면 + 토큰 삭제', JSON.stringify(m2));
  console.log('\n[S5] 마이페이지 — 이름·안내·제작 초안·결과물 링크에 넣은 태그/자바스크립트 링크가 실행되지 않는다');
  mode = 'ok'; await mp.page.evaluate(() => { localStorage.setItem('me_token','TOK'); loadMyState(); }); await mp.page.waitForTimeout(1200);
  const m3 = await probe(mp.page, '#mypageView'); ok(m3.xss === undefined && m3.img === 0, '주입 태그 미실행(img/svg 0)', JSON.stringify(m3)); ok(m3.js === 0, 'javascript: 링크 없음', 'js=' + m3.js);
  ok(mp.errors.length === 0, '마이페이지 pageerror 없음', mp.errors.slice(0,2).join(' | '));
  await mp.page.close();
}
console.log(`\n보안·권한 검사 종료 · 실패 ${fail}건` + (found.length ? '\n' + found.map(s => '★ ' + s).join('\n') : ''));
await eng.close?.(); process.exit(fail ? 1 : 0);
