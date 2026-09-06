// [DLG_GRACE] 실제 마우스 더블클릭 감사 — 버튼을 더블클릭해도 확인 판이 «열린 채» 남고(두 번째 클릭이 배경=취소나 판 위 버튼에 떨어지지 않게) 서버 호출은 0인가.
//   점검 라운드7(2026-09-05) 실측: 수정 전엔 세 경우 모두 판이 번쩍 사라졌다(첫 클릭이 판을 열고 120ms 뒤 두 번째가 배경에 떨어짐).
//   방식: page.mouse.click 두 번(히트테스트를 거치는 진짜 좌표 클릭). 프로그램 click() 은 detail 0 이라 이 검사를 대신하지 못한다.
//   사용: node scripts/audit/dialog-dblclick.mjs   (브라우저 필요 · 약 20초 · 실패 0이어야 한다)
import { spawn } from 'node:child_process';
import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SITE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const { openWorld, kstAgo } = await import('./_gasworld.mjs');
const { launchBrowser } = await import('./_browser.mjs');
const PORT = 8142; const { G, world } = openWorld();
const REC = JSON.stringify({ 시착:'2026-07-01', 계약:'2026-07-02', 영수증기준일:{ 예약금: kstAgo(1) } });
const P = { 신랑이름:'김희준', 신부이름:'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 현재단계:'계약완료', 계약상태:'서명완료', 계약총액:'2500000', 예식일:'2026-10-26', 입금상태:'대기', 입금자명:'김희준', 입금완료신호:kstAgo(1), 시착동의상태:'동의완료', 시착동의일시:'2026-07-01 10:00', 계약서발송일시:'2026-07-01 12:00', 계약서명일시:'2026-07-02 08:00', 동의기록:REC };
const BOOKING = { 상태:'확정', 캘린더이벤트ID:'BK1', 개인코드:'ME-TEST', '성함(신랑)':'김희준', '성함(신부)':'이미쿠', 연락처:'010-1234-5678', 이메일:'t@example.com', 예식일자:'2026-10-26', 하객:'30', 상담일시:'2026-06-20 14:00' };
const HOME = { ok:true, name:'점검', counts:{ total:1, urgent:1 }, queue:{ urgent:[ {kind:'입금확인', code:'ME-TEST', names:'김희준 · 이미쿠', sub:'계약금 250,000원'} ], normal:[] }, results:[], pipeline:{}, survey:[], blocks:[], stageFlow:{}, stageEx:[] };
const calls = {};
function serverCall(p) { try { if (p.action !== 'adminCall') return { ok:true }; const fn = String(p.fn||''); calls[fn] = (calls[fn]||0) + 1; if (fn === 'adminHome') return HOME; if (/^ai/.test(fn)) return { ok:true, facts:[], list:[], rows:[] }; world(Object.assign({}, P), Object.assign({}, BOOKING)); if (typeof G[fn] !== 'function') return { ok:false, error:'없는 함수: '+fn }; const r = G[fn].apply(null, p.args||[]); return r === undefined ? { ok:true } : r; } catch (e) { return { ok:false, error:String(e&&e.message||e) }; } }
const server = spawn('python3', ['-m','http.server',String(PORT),'--directory',SITE], { stdio:'ignore' }); process.on('exit', () => { try { server.kill(); } catch {} });
await new Promise(r => setTimeout(r, 1500));
const eng = await launchBrowser(); if (!eng) { console.log('브라우저 없음'); process.exit(0); }
const { page, errors } = await eng.newPage({ port:PORT, viewport:{ width:1440, height:1000 } });
await page.route('**script.google.com**', async route => { let p={}; try { p=JSON.parse(route.request().postData()||'{}'); } catch {} await new Promise(r => setTimeout(r, 200)); await route.fulfill({ status:200, contentType:'application/json', headers:{'Access-Control-Allow-Origin':'*'}, body: JSON.stringify(serverCall(p)) }); });
await page.addInitScript(() => { localStorage.setItem('me_admin_token','SHOT-TOKEN'); });
let fail = 0;
const st = () => page.evaluate(() => ({ cm: document.getElementById('confirmModal').classList.contains('show'), dl: document.getElementById('admDlgOv').classList.contains('show'), yesDis: document.getElementById('cm_yes').disabled }));
async function dbl(label, locate) {
  for (const k in calls) delete calls[k];
  await page.evaluate(() => { document.documentElement.style.scrollBehavior = 'auto'; }); let box = await page.evaluate(locate); if (!box) { console.log(`  · ${label}: 버튼 못 찾음`); return; } await page.waitForTimeout(250); box = await page.evaluate(locate);
  const x = box.x + box.w/2, y = box.y + box.h/2;
  await page.mouse.click(x, y); await page.waitForTimeout(120); await page.mouse.click(x, y);   // 물리 더블클릭 흉내(두 번째 클릭은 히트테스트를 거친다)
  await page.waitForTimeout(500);
  const s = await st(); const hit = await page.evaluate(([x,y]) => { const el = document.elementFromPoint(x,y); return el ? (el.id || el.className || el.tagName) + ':' + (el.textContent||'').trim().slice(0,12) : '없음'; }, [x,y]);
  const open = s.cm || s.dl; const wrote = Object.keys(calls).some(k => !/Home|Detail|List|Facts/.test(k));
  console.log(`  ${open && !wrote ? '✅' : '❌'} ${label} → 판 열림 cm=${s.cm} dlg=${s.dl} · 호출 ${JSON.stringify(calls)}` + (open ? '' : '  ← 판이 사라졌다(두 번째 클릭 자리=' + hit + ')'));
  if (!open || wrote) fail++;
  await page.evaluate(() => { try { closeModal(); } catch(e){} try { _admDlgEnd(false); } catch(e){} });
}
await page.goto(`http://localhost:${PORT}/admin.html`, { waitUntil:'domcontentloaded' }); await page.waitForTimeout(800);
console.log('\n[실제 더블클릭] 판이 열린 직후 두 번째 클릭');
await dbl('홈 큐 «입금 확인»(openModal)', () => { const b = document.querySelector('#queueWrap .qbtn[data-act]'); if (!b) return null; const r = b.getBoundingClientRect(); return { x:r.left, y:r.top, w:r.width, h:r.height }; });
await page.evaluate(() => window.openDetail('ME-TEST','home')); await page.waitForTimeout(900);
await dbl('상세 «입금 확인»(openModal)', () => { const b = [...document.querySelectorAll('#detailBody .btn')].find(x => /입금 확인$/.test((x.textContent||'').trim())); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return { x:r.left, y:r.top, w:r.width, h:r.height }; });
await page.evaluate(() => window.openAiTeam()); await page.waitForTimeout(500);
await page.evaluate(() => { const b = [...document.querySelectorAll('button')].find(x => (x.textContent||'').trim() === '핵심정보'); if (b) b.click(); }); await page.waitForTimeout(1200);
await page.evaluate(() => { const k = document.getElementById('fKey'), v = document.getElementById('fVal'); if (k) k.value = '테스트키'; if (v) v.value = '테스트값'; });
await dbl('핵심정보 «저장»(admConfirm)', () => { const b = document.getElementById('fAdd'); if (!b) return null; b.scrollIntoView({block:'center'}); const r = b.getBoundingClientRect(); return { x:r.left, y:r.top, w:r.width, h:r.height }; });
// 판이 화면 어디에 그려지는지(버튼 자리와 겹칠 수 있는가)
await page.evaluate(() => { const b = document.getElementById('fAdd'); if (b) b.click(); }); await page.waitForTimeout(300);
const geo = await page.evaluate(() => { const box = document.querySelector('#admDlgOv .modal'); const yes = document.getElementById('admDlgYes'); const no = document.getElementById('admDlgNo'); const r = (e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; }; return { box: box ? r(box) : null, yes: yes ? r(yes) : null, no: no ? r(no) : null, vw: innerWidth, vh: innerHeight }; });
console.log('  · admDlg 판 위치(뷰포트 ' + geo.vw + 'x' + geo.vh + '): box=' + JSON.stringify(geo.box) + ' 확인=' + JSON.stringify(geo.yes) + ' 취소=' + JSON.stringify(geo.no));
await page.evaluate(() => { try { _admDlgEnd(false); } catch(e){} });
await page.evaluate(() => window.openDetail('ME-TEST','home')); await page.waitForTimeout(900);
await page.evaluate(() => { const b = [...document.querySelectorAll('#detailBody .btn')].find(x => /입금 확인$/.test((x.textContent||'').trim())); if (b) b.click(); }); await page.waitForTimeout(300);
const geo2 = await page.evaluate(() => { const box = document.getElementById('modalBox'); const yes = document.getElementById('cm_yes'); const no = document.getElementById('cm_no'); const r = (e) => { const q = e.getBoundingClientRect(); return [Math.round(q.left), Math.round(q.top), Math.round(q.width), Math.round(q.height)]; }; return { box: box ? r(box) : null, yes: yes ? r(yes) : null, no: no ? r(no) : null }; });
console.log('  · confirmModal 판 위치: box=' + JSON.stringify(geo2.box) + ' 확인=' + JSON.stringify(geo2.yes) + ' 취소=' + JSON.stringify(geo2.no));
console.log(`pageerror ${errors.length} · 결과 — 실패 ${fail}건`); if (errors.length) fail++; await eng.close?.(); process.exit(fail ? 1 : 0);
