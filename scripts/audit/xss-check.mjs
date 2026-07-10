// XSS 주입 점검 — 고객·서버 문자열 필드 전부에 페이로드를 넣어 mypage 실렌더에서 실행/주입되는지 확인.
//   4개 상태(서명대기·입금·확인중·취소) x 20+ 필드. 실행(window.__xss)·요소 주입(img[src=x]/svg[onload]) 모두 0이어야 통과.
//   사용: node scripts/audit/xss-check.mjs   (playwright 전역 폴백 · puppeteer 불필요)
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
let chromium;
for (const p of ['playwright', '/opt/node22/lib/node_modules/playwright']) { try { chromium = require(p).chromium; break; } catch {} }
if (!chromium) { console.log('playwright 없음 — XSS 점검 건너뜀.'); process.exit(0); }
const { spawn } = require('child_process');
const XSS = '<img src=x onerror="window.__xss=(window.__xss||0)+1">';
const XSS2 = '"><svg onload="window.__xss=(window.__xss||0)+1">';

const FIXTURES = {
  '서명대기_XSS': { ok:true, code:'ME-X1', name:XSS, product:'시그니처', stage:'상담완료', stageIndex:3, waiting:XSS,
    stageList:['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달'],
    contract:{ signed:false, remainingSec:3600, deadlineKst:XSS, effectNotice:XSS2, reviewNote:XSS,
      fill:{ groom:XSS, bride:XSS2, weddingDate:'2027-05-15', weddingTime:'12:20' } } },
  '입금_XSS': { ok:true, code:'ME-X2', name:XSS2, product:'시그니처', stage:'계약완료', stageIndex:4,
    stageList:['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달'],
    contract:{ signed:true, fill:{ groom:XSS, bride:XSS, weddingDate:'2027-05-15', weddingTime:'12:20' } },
    payment:{ status:'대기', account:XSS, holder:XSS2, cashReceipt:{ phone:XSS },
      amounts:{ 납부액:110000, 계약금:210000, 예약금:100000, 잔금:1050000, 잔금시점:XSS } } },
  '확인중_XSS': { ok:true, code:'ME-X3', name:'김', product:'시그니처', stage:'계약완료', stageIndex:4,
    stageList:['신청접수','상담확정','시착','상담완료','계약완료','입금완료','제작중','예식완료','결과물전달'],
    contract:{ signed:true, fill:{ groom:'김', bride:'이', weddingDate:'2027-05-15', weddingTime:'12:20' } },
    payment:{ status:'완료신호', payerName:XSS } },
  '취소_XSS': { ok:true, code:'ME-X4', name:XSS, product:XSS, stage:XSS, stageIndex:-1, isException:true,
    stageList:['신청접수'], refundBank:{ bank:XSS, acct:XSS2, holder:XSS } },
};

(async () => {
  const srv = spawn('python3', ['-m','http.server','8141'], { cwd: new URL('../..', import.meta.url).pathname, stdio:'ignore' });
  await new Promise(r=>setTimeout(r,800));
  const browser = await chromium.launch();
  const failures = [];
  for (const [name, fixture] of Object.entries(FIXTURES)) {
    const ctx = await browser.newContext();
    await ctx.route('**/*', async route => {
      const req = route.request(); const u = req.url();
      if (u.includes('script.google.com')) {
        let body={}; try{ body=JSON.parse(req.postData()||'{}'); }catch{}
        let resp = { ok:true };
        if (body.action==='login') resp = { ok:true, token:'tokX' };
        else if (body.action==='getMyState') resp = fixture;
        else if (body.action==='getSignature') resp = { ok:false };
        return route.fulfill({ status:200, headers:{'Access-Control-Allow-Origin':'*'}, contentType:'application/json', body:JSON.stringify(resp) });
      }
      if (!u.includes('localhost')) return route.abort();
      return route.continue();
    });
    const p = await ctx.newPage();
    const errs=[]; p.on('pageerror',e=>errs.push(e.message));
    await p.goto('http://localhost:8141/mypage.html',{waitUntil:'domcontentloaded'});
    await p.waitForTimeout(400);
    await p.evaluate(()=>{ document.getElementById('li_code').value='ME-X'; document.getElementById('li_pw').value='x'; document.getElementById('loginForm').requestSubmit(); });
    await p.waitForTimeout(1200);
    const r = await p.evaluate(()=>({ xss: window.__xss||0, imgs: document.querySelectorAll('img[src="x"]').length, svgs: document.querySelectorAll('svg[onload]').length, view: getComputedStyle(document.getElementById('mypageView')).display!=='none' }));
    const bad = r.xss>0 || r.imgs>0 || r.svgs>0;
    console.log((bad?'  ✗ ':'  ok ') + name + ' → ' + JSON.stringify(r));
    if (bad) failures.push(name+' XSS 실행/주입: '+JSON.stringify(r));
    if (!r.view) console.log('    (참고: mypageView 미전환 — 렌더 중단 여부 확인 필요) errs=' + errs.join('|').slice(0,120));
    if (errs.length) failures.push(name+' pageerror: '+errs.join(' | ').slice(0,200));
    await ctx.close();
  }
  console.log(failures.length ? '\nFAILURES '+failures.length+'\n'+failures.join('\n') : '\nALL CLEAN');
  await browser.close(); srv.kill();
  process.exit(failures.length?1:0);
})();
