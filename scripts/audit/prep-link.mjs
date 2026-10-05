// ★[PREP_LINK 2026-10-05 사장님 «미리듣기랑 준비할 것 · 클릭하면 볼 수 있게» → «추천대로»] mypage 식순 줄 실렌더 점검(390 · 1280)
//   보는 것: ①줄 아래 «준비할 것 N가지 · 도와주실 분 N» 요약 줄은 없다(PREP_FOLD_OFF) ②오른쪽 «미리듣기 · 준비할 것» 나란히
//     ③«준비할 것»을 누르면 줄 아래 목록이 열리고(aria-expanded) 다시 누르면 접힌다 ④폰에서 줄이 넘치지 않는다 ⑤목록이 없으면 단추도 없다
//   종료 코드 0 = 통과 · 1 = 실패 · 2 = 재지 못함
import path from 'node:path'; import { spawn } from 'node:child_process'; import { fileURLToPath } from 'node:url';
import { launchBrowser } from './_browser.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url)), SITE = path.resolve(HERE, '../..'), PORT = 8131;
let fail = 0; const ok = (c, m, d) => { console.log(`  ${c ? '✅' : '❌'} ${m}${c || !d ? '' : ' → ' + d}`); if (!c) fail++; };
const server = spawn('python3', ['-m', 'http.server', String(PORT), '--directory', SITE], { stdio: 'ignore' });
await new Promise((r) => setTimeout(r, 800));
const eng = await launchBrowser(); if (!eng) { console.log('못 쟀다 — 브라우저 없음'); server.kill(); process.exit(2); }
const SIG = ['신청접수', '상담확정', '시착', '상담완료', '계약완료', '입금완료', '제작중', '예식완료', '결과물전달', '후기'];
const seed = (summary) => ({ name: '김희준 · 이미쿠', product: '시그니처', code: 'ME-PRV', stage: '제작중', stageIndex: SIG.indexOf('제작중'), stageList: SIG.slice(), nextAction: '다음 할 일을 안내해 드릴게요.',
  contract: { signed: true }, payment: { confirmed: true }, weddingDate: '2026-10-26', result: null, isException: false,
  production: { base: { weddingDate: '2026-10-26' }, tracks: { ritual: '완료' }, ritualDraft: { _v: 3, S: { course: 'family' }, summary } } });
const SUM = { open: true, prep: [{ what: '반지', who: 'couple', due: 3 }, { what: '서약문 원고', who: 'couple', due: 7 }, { what: '덕담 한마디', who: 'parents', due: 7 }], helpers: [['반지 전달', '예식 당일'], ['편지 낭독 도우미', '예식 당일']] };
try {
  for (const V of [{ n: 'm390', viewport: { width: 390, height: 844 } }, { n: 'd1280', viewport: { width: 1280, height: 900 } }]) {
    console.log(`\n[${V.n}]`);
    const { page, errors } = await eng.newPage({ port: PORT, viewport: V.viewport });
    await page.goto(`http://localhost:${PORT}/mypage.html`, { waitUntil: 'load' }); await new Promise((r) => setTimeout(r, 900));
    await page.evaluate((st) => { show('mypageView'); renderMyPage(st); }, seed(SUM)); await new Promise((r) => setTimeout(r, 300));
    const a = await page.evaluate(() => { const b = document.getElementById('mp_ritualPrep'), pv = document.getElementById('mp_ritualPreview'), bx = document.getElementById('mp_ritPrepBox'), tr = b && b.closest('.trk');
      return { btn: !!b, lab: b && b.textContent.trim(), exp: b && b.getAttribute('aria-expanded'), pv: !!pv, same: !!(b && pv && b.parentNode === pv.parentNode && pv.nextElementSibling === b), hidden: bx ? bx.hidden : null,
        oldSum: [...document.querySelectorAll('.rit-prep>summary')].length, over: tr ? tr.scrollWidth - tr.clientWidth : -1, rowH: tr ? Math.round(tr.getBoundingClientRect().height) : 0 }; });
    ok(a.oldSum === 0, '줄 아래 «준비할 것 N가지 · 도와주실 분 N» 요약 줄이 없다 [PREP_FOLD_OFF]', JSON.stringify(a));
    ok(a.btn && a.lab === '준비할 것' && a.pv && a.same, '오른쪽 «미리듣기 · 준비할 것» 나란히 [PREP_LINK]', JSON.stringify(a));
    ok(a.hidden === true && a.exp === 'false', '처음엔 접혀 있다', JSON.stringify(a));
    ok(a.over <= 1, '식순 줄이 넘치지 않는다', JSON.stringify(a));
    const ln = await page.evaluate(() => { const pv = document.getElementById('mp_ritualPreview').getBoundingClientRect(), b = document.getElementById('mp_ritualPrep').getBoundingClientRect(), nm = document.getElementById('mp_ritualStart').closest('.trk').querySelector('.trk-nm').getBoundingClientRect(); return { oneLine: Math.abs(pv.top - b.top) < 2, pvL: Math.round(pv.left), nmL: Math.round(nm.left) }; });
    ok(ln.oneLine, '«미리듣기 · 준비할 것»이 한 줄(쪼개지지 않는다)', JSON.stringify(ln));
    await page.click('#mp_ritualPrep'); await new Promise((r) => setTimeout(r, 200));
    const b = await page.evaluate(() => { const bx = document.getElementById('mp_ritPrepBox'); return { hidden: bx.hidden, exp: document.getElementById('mp_ritualPrep').getAttribute('aria-expanded'), t: bx.innerText }; });
    ok(!b.hidden && b.exp === 'true' && /두 분이 준비할 것/.test(b.t) && /도와주실 분/.test(b.t) && /준비할 것 3가지 · 도와주실 분 2/.test(b.t), '누르면 줄 아래 목록이 열린다(숫자는 안 첫 줄)', JSON.stringify(b).slice(0, 300));
    if (process.env.SHOT) { const el = await page.$('#mp_ritualStart'); const tr = await el.evaluateHandle((e) => e.closest('.trk').parentNode); await tr.asElement().screenshot({ path: process.env.SHOT + '-' + V.n + '.png' }).catch(() => {}); }
    await page.click('#mp_ritualPrep'); await new Promise((r) => setTimeout(r, 200));
    ok(await page.evaluate(() => document.getElementById('mp_ritPrepBox').hidden && document.getElementById('mp_ritualPrep').getAttribute('aria-expanded') === 'false'), '다시 누르면 접힌다');
    await page.evaluate((st) => renderMyPage(st), seed({ open: true }));
    ok(await page.evaluate(() => !document.getElementById('mp_ritualPrep') && !!document.getElementById('mp_ritualStart')), '목록이 없으면 «준비할 것» 단추도 없다');
    ok(errors.length === 0, 'JS 오류 0', errors.join(' | ').slice(0, 200));
    await page.close();
  }
} finally { await eng.close(); server.kill(); }
console.log(fail ? `\nPREP_LINK FAIL ${fail}` : '\nPREP_LINK OK'); process.exit(fail ? 1 : 0);
